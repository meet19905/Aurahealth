import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Note: In a real scenario you would have the user go through OAuth flow.
// For this assignment, we assume a refresh token is provided in env.
if (process.env.GOOGLE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
}

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

export const createCalendarEvent = async (eventDetails: any) => {
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    console.log('Mocking calendar event creation:', eventDetails);
    return 'mock_event_id';
  }

  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: eventDetails,
  });

  return res.data.id;
};

export const deleteCalendarEvent = async (eventId: string) => {
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    console.log('Mocking calendar event deletion:', eventId);
    return;
  }

  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
  });
};
