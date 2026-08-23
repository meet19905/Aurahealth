import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';

const router = Router();

// Create a new doctor (Admin only)
router.post('/doctors', async (req, res) => {
  const { name, email, password, specialization, workingHours, slotDuration } = req.body;
  
  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the User and DoctorProfile in a single transaction
    const newDoctor = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'DOCTOR',
        doctorProfile: {
          create: {
            specialization,
            workingHours: workingHours || JSON.stringify({ start: '09:00', end: '17:00' }),
            slotDuration: slotDuration ? parseInt(slotDuration) : 30
          }
        }
      },
      include: {
        doctorProfile: true
      }
    });

    res.json({ message: 'Doctor created successfully', doctor: newDoctor });
  } catch (error: any) {
    console.error('Error creating doctor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get summary statistics
router.get('/stats', async (req, res) => {
  try {
    const [patientCount, doctorCount, appointmentCount] = await Promise.all([
      prisma.user.count({ where: { role: 'PATIENT' } }),
      prisma.user.count({ where: { role: 'DOCTOR' } }),
      prisma.appointment.count()
    ]);
    res.json({ patientCount, doctorCount, appointmentCount });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get all pending leave requests
router.get('/leaves/pending', async (req, res) => {
  try {
    const leaves = await prisma.leave.findMany({
      where: { status: 'PENDING' },
      include: {
        doctor: {
          include: { user: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(leaves);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Approve a leave request
router.post('/leaves/:id/approve', async (req, res) => {
  try {
    const leaveId = req.params.id;
    
    const leave = await prisma.leave.findUnique({
      where: { id: leaveId }
    });

    if (!leave) return res.status(404).json({ error: 'Leave not found' });

    // Update status
    const updatedLeave = await prisma.leave.update({
      where: { id: leaveId },
      data: { status: 'APPROVED' }
    });

    // Find overlapping CONFIRMED or PENDING appointments
    const affectedAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: leave.doctorId,
        date: leave.date,
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
            text: `Your appointment on ${leave.date.toDateString()} has been cancelled because the doctor is on leave. Please reschedule.`
          })
        }
      });
    }

    res.json({ message: 'Leave approved and affected appointments cancelled.', leave: updatedLeave, affectedCount: affectedAppointments.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Reject a leave request
router.post('/leaves/:id/reject', async (req, res) => {
  try {
    const leaveId = req.params.id;
    
    const updatedLeave = await prisma.leave.update({
      where: { id: leaveId },
      data: { status: 'REJECTED' }
    });

    res.json({ message: 'Leave rejected.', leave: updatedLeave });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get all pending doctor registration requests
router.get('/doctor-requests/pending', async (req, res) => {
  try {
    const requests = await prisma.doctorRegistrationRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Approve a doctor registration request
router.post('/doctor-requests/:id/approve', async (req, res) => {
  try {
    const requestId = req.params.id;
    const request = await prisma.doctorRegistrationRequest.findUnique({ where: { id: requestId } });
    
    if (!request || request.status !== 'PENDING') {
      return res.status(404).json({ error: 'Request not found or already processed' });
    }

    // Create the User and DoctorProfile
    const newDoctor = await prisma.user.create({
      data: {
        name: request.name,
        email: request.email,
        password: request.password,
        role: 'DOCTOR',
        doctorProfile: {
          create: {
            specialization: request.specialization,
            workingHours: JSON.stringify({ start: '09:00', end: '17:00' }),
            slotDuration: 30
          }
        }
      }
    });

    // Update request status
    await prisma.doctorRegistrationRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED' }
    });

    // Queue confirmation email
    await prisma.notificationOutbox.create({
      data: {
        type: 'EMAIL',
        payload: JSON.stringify({
          to: request.email,
          subject: 'Registration Approved',
          text: `Hello Dr. ${request.name}, your registration has been approved. You can now log in to the Doctor Portal.`
        })
      }
    });

    res.json({ message: 'Doctor registration approved', doctor: newDoctor });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Reject a doctor registration request
router.post('/doctor-requests/:id/reject', async (req, res) => {
  try {
    const requestId = req.params.id;
    await prisma.doctorRegistrationRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' }
    });
    res.json({ message: 'Request rejected.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
