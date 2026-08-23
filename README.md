# Healthcare Appointment & Follow-up Manager

A comprehensive platform for booking and managing healthcare appointments, powered by AI.

## Setup Guide

### 1. Prerequisites
- Node.js (v18+)
- SQLite (built-in, no installation required)

### 2. Backend Setup
1. `cd backend`
2. `npm install`
3. Copy `.env.example` to `.env` and fill in the values (especially `GEMINI_API_KEY`).
4. Run `npx prisma generate` and `npx prisma db push` to initialize the SQLite database.
5. `npm run dev` to start the backend server on `http://localhost:5000`.

### 3. Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev` to start the Vite frontend.

## API Documentation
- `POST /api/auth/register` - Register a new user (PATIENT, DOCTOR, ADMIN).
- `POST /api/auth/login` - Login and get JWT token.
- `GET /api/doctors` - List all doctors.
- `POST /api/doctors/:id/leave` - (Admin) Mark a leave for a doctor and auto-cancel overlapping appointments.
- `POST /api/appointments/hold` - Hold a slot for 5 minutes.
- `POST /api/appointments/:id/confirm` - Confirm a slot and generate AI pre-visit summary.
- `POST /api/appointments/:id/post-visit` - Doctor submits notes to generate AI post-visit summary.

## Database Schema
The database uses SQLite via Prisma. Key models include:
- **User**: Stores credentials and role.
- **DoctorProfile**: Stores specialization and working hours.
- **Appointment**: Stores the booking details, AI summaries, and status (PENDING, CONFIRMED, etc.).
- **Leave**: Stores doctor leave dates.
- **NotificationOutbox**: Stores pending email/calendar jobs.

## LLM Prompts
**Pre-visit Summary:**
> Analyse these symptoms and return a JSON object with: urgencyLevel: "Low" | "Medium" | "High", chiefComplaint: string, suggestedQuestions: string[] (three suggested questions for the doctor). Symptoms: <symptoms>

**Post-visit Summary:**
> Convert these clinical notes into a patient-friendly summary. Return a JSON object with: patientFriendlySummary: string, medicationSchedule: string[], followUpSteps: string[]. Clinical Notes: <notes>

## Google Calendar Setup
1. Go to Google Cloud Console.
2. Create a new project and enable the "Google Calendar API".
3. Configure the OAuth Consent Screen.
4. Create Credentials -> OAuth Client ID (Web Application).
5. Set Redirect URI to your backend route.
6. Copy the Client ID, Client Secret, and generate a Refresh Token. Put them in the `.env` file.
