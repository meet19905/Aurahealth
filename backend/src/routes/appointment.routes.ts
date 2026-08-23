import { Router } from 'express';
import prisma from '../utils/prisma';
import { generatePreVisitSummary, generatePostVisitSummary } from '../services/llm.service';

const router = Router();

// Get all appointments for a specific doctor by their userId
router.get('/doctor/user/:userId', async (req, res) => {
  try {
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: req.params.userId }
    });
    
    if (!doctorProfile) return res.status(404).json({ error: 'Doctor profile not found' });

    const appointments = await prisma.appointment.findMany({
      where: { doctorId: doctorProfile.id },
      include: { patient: true },
      orderBy: [ { date: 'asc' }, { startTime: 'asc' } ]
    });
    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all appointments for a specific patient by their userId
router.get('/patient/user/:userId', async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { patientId: req.params.userId },
      include: { doctor: { include: { user: true } } },
      orderBy: [ { date: 'desc' }, { startTime: 'desc' } ]
    });
    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Hold a slot (creates PENDING appointment with 5 min expiration)
router.post('/hold', async (req, res) => {
  const { doctorId, patientId, date, startTime, endTime } = req.body;
  
  try {
    const appointmentDate = new Date(date);
    
    // Check if slot is available using a transaction to prevent double booking
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.appointment.findFirst({
        where: {
          doctorId,
          date: appointmentDate,
          startTime,
          OR: [
            { status: 'CONFIRMED' },
            { 
              status: 'PENDING',
              holdExpiresAt: { gt: new Date() } // Still valid hold
            }
          ]
        }
      });

      if (existing) {
        throw new Error('Slot not available');
      }

      // Check if doctor is on leave
      const leave = await tx.leave.findFirst({
        where: { doctorId, date: appointmentDate }
      });
      if (leave) {
        throw new Error('Doctor is on leave on this date');
      }

      // Create pending hold
      const expiresAt = new Date(Date.now() + 5 * 60000); // 5 mins hold
      const appointment = await tx.appointment.create({
        data: {
          patientId,
          doctorId,
          date: appointmentDate,
          startTime,
          endTime,
          status: 'PENDING',
          holdExpiresAt: expiresAt
        }
      });

      return appointment;
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Confirm booking with symptoms
router.post('/:id/confirm', async (req, res) => {
  const { symptoms } = req.body;
  const appointmentId = req.params.id;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, doctor: { include: { user: true } } }
    });

    if (!appointment || appointment.status !== 'PENDING') {
      return res.status(400).json({ error: 'Invalid appointment' });
    }

    if (appointment.holdExpiresAt && new Date() > appointment.holdExpiresAt) {
      return res.status(400).json({ error: 'Slot hold expired. Please try again.' });
    }

    // Generate AI Summary
    const preVisitSummary = await generatePreVisitSummary(symptoms);

    // Confirm booking
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CONFIRMED',
        symptoms,
        aiPreVisitSummary: JSON.stringify(preVisitSummary),
        holdExpiresAt: null
      }
    });

    // Queue Email to Patient
    await prisma.notificationOutbox.create({
      data: {
        type: 'EMAIL',
        payload: JSON.stringify({
          to: appointment.patient.email,
          subject: 'Appointment Confirmed',
          text: `Your appointment with Dr. ${appointment.doctor.user.name} on ${appointment.date.toDateString()} at ${appointment.startTime} is confirmed.`
        })
      }
    });

    // Queue Email to Doctor
    await prisma.notificationOutbox.create({
      data: {
        type: 'EMAIL',
        payload: JSON.stringify({
          to: appointment.doctor.user.email,
          subject: 'New Appointment',
          text: `You have a new appointment on ${appointment.date.toDateString()} at ${appointment.startTime}.`
        })
      }
    });

    // Queue Google Calendar event
    await prisma.notificationOutbox.create({
      data: {
        type: 'CALENDAR',
        payload: JSON.stringify({
          action: 'CREATE',
          event: {
            summary: `Appointment with ${appointment.patient.name}`,
            description: `Symptoms: ${symptoms}`,
            start: { dateTime: new Date(`${appointment.date.toISOString().split('T')[0]}T${appointment.startTime}:00`).toISOString() },
            end: { dateTime: new Date(`${appointment.date.toISOString().split('T')[0]}T${appointment.startTime}:00`).toISOString() }
          }
        })
      }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Doctor: Submit post-visit notes
router.post('/:id/post-visit', async (req, res) => {
  const { notes, prescription } = req.body;
  const appointmentId = req.params.id;

  try {
    const postVisitSummary = await generatePostVisitSummary(notes + "\nPrescription: " + prescription);

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'COMPLETED',
        doctorNotes: notes,
        prescription,
        aiPostVisitSummary: JSON.stringify(postVisitSummary)
      },
      include: { patient: true }
    });

    // Schedule medication reminders
    if (postVisitSummary.medicationSchedule && Array.isArray(postVisitSummary.medicationSchedule)) {
      for (const med of postVisitSummary.medicationSchedule) {
        // Schedule for 8 AM the next day
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(8, 0, 0, 0);

        await prisma.notificationOutbox.create({
          data: {
            type: 'MEDICATION_REMINDER',
            payload: JSON.stringify({
              to: updated.patient.email,
              patientName: updated.patient.name,
              medication: med
            }),
            nextRetryAt: tomorrow
          }
        });
      }
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
