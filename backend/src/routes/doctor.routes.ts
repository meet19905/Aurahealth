import { Router } from 'express';
import prisma from '../utils/prisma';
import { generatePostVisitSummary } from '../services/llm.service';

const router = Router();

// Get all doctors (for patient search)
router.get('/', async (req, res) => {
  try {
    const doctors = await prisma.doctorProfile.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });
    res.json(doctors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Doctor: Get all leaves for a doctor
router.get('/user/:userId/leaves', async (req, res) => {
  const userId = req.params.userId;
  try {
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId }
    });
    if (!doctorProfile) return res.status(404).json({ error: 'Doctor profile not found' });

    const leaves = await prisma.leave.findMany({
      where: { doctorId: doctorProfile.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(leaves);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Doctor: Request leave
router.post('/user/:userId/leave-request', async (req, res) => {
  const { date, reason } = req.body;
  const userId = req.params.userId;

  try {
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId }
    });
    
    if (!doctorProfile) return res.status(404).json({ error: 'Doctor profile not found' });

    const leaveDate = new Date(date);
    
    // Create leave with PENDING status
    const leave = await prisma.leave.create({
      data: {
        doctorId: doctorProfile.id,
        date: leaveDate,
        reason,
        status: 'PENDING'
      }
    });

    res.json({ message: 'Leave request submitted successfully.', leave });
  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Leave request already exists for this date.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Mark leave for a doctor
router.post('/:id/leave', async (req, res) => {
  const { date, reason } = req.body;
  const doctorId = req.params.id;

  try {
    const leaveDate = new Date(date);
    
    // Create leave
    const leave = await prisma.leave.create({
      data: {
        doctorId,
        date: leaveDate,
        reason
      }
    });

    // Find overlapping CONFIRMED or PENDING appointments
    const affectedAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        date: leaveDate,
        status: { in: ['CONFIRMED', 'PENDING'] }
      },
      include: { patient: true }
    });

    // Cancel them and queue notifications
    for (const appt of affectedAppointments) {
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { status: 'CANCELLED_BY_CLINIC' }
      });

      // Queue email
      await prisma.notificationOutbox.create({
        data: {
          type: 'EMAIL',
          payload: JSON.stringify({
            to: appt.patient.email,
            subject: 'Appointment Cancelled',
            text: `Your appointment on ${date} has been cancelled because the doctor is on leave. Please reschedule.`
          })
        }
      });
      // (Optionally queue Calendar deletion)
    }

    res.json({ message: 'Leave marked and affected patients notified.', leave, affectedCount: affectedAppointments.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
