import cron from 'node-cron';
import prisma from '../utils/prisma';
import { sendEmail } from './email.service';
import { createCalendarEvent, deleteCalendarEvent } from './calendar.service';

export const setupCronJobs = () => {
  // Run every minute to process outbox
  cron.schedule('* * * * *', async () => {
    console.log('Running notification outbox processor...');
    
    try {
      const pendingNotifications = await prisma.notificationOutbox.findMany({
        where: {
          status: 'PENDING',
          nextRetryAt: {
            lte: new Date()
          },
          retries: {
            lt: 3 // Max 3 retries
          }
        },
        take: 10
      });

      for (const notification of pendingNotifications) {
        try {
          let payload: any;
          try {
            payload = typeof notification.payload === 'string' ? JSON.parse(notification.payload) : notification.payload;
          } catch (e) {
            payload = notification.payload;
          }

          if (notification.type === 'EMAIL') {
            await sendEmail(payload.to, payload.subject, payload.text);
          } else if (notification.type === 'CALENDAR') {
            if (payload.action === 'CREATE') {
              await createCalendarEvent(payload.event);
            } else if (payload.action === 'DELETE') {
              await deleteCalendarEvent(payload.eventId);
            }
          } else if (notification.type === 'MEDICATION_REMINDER') {
            const emailText = `Hello ${payload.patientName},\n\nThis is a friendly reminder to take your medication:\n\n${payload.medication}\n\nStay healthy!`;
            await sendEmail(payload.to, 'Medication Reminder', emailText);
          }

          // Mark as success
          await prisma.notificationOutbox.update({
            where: { id: notification.id },
            data: { status: 'SUCCESS' }
          });
        } catch (err: any) {
          console.error(`Failed to process notification ${notification.id}:`, err);
          
          const newRetries = notification.retries + 1;
          const nextRetryAt = new Date(Date.now() + 5 * 60000); // retry after 5 mins

          await prisma.notificationOutbox.update({
            where: { id: notification.id },
            data: { 
              retries: newRetries,
              status: newRetries >= 3 ? 'FAILED' : 'PENDING',
              nextRetryAt,
              error: err.message
            }
          });
        }
      }
    } catch (error) {
      console.error('Error in outbox processor cron:', error);
    }
  });

};
