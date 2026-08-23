# Healthcare Appointment & Follow-up Manager
## System Design Document

This document outlines the architectural decisions and technical implementations for the core complexities of the Healthcare Manager platform. 

---

## 1. Concurrency & Slot Hold Mechanism

### The Problem
In a busy clinic, multiple patients might attempt to book the same doctor's timeslot simultaneously, leading to double-booking. Additionally, patients need time to fill out the pre-visit symptom form before confirming the appointment, but if they abandon the form, the slot should be released.

### The Solution: 2-Phase Booking with Database Transactions
The booking flow is split into two phases: **Hold** and **Confirm**.

1. **Hold Phase (`POST /api/appointments/hold`)**:
   When a patient selects a time, a request is sent to the backend. We use a **Prisma Database Transaction** (`prisma.$transaction`) to atomically check for existing bookings and create a temporary hold. 
   - The query explicitly looks for any appointment with the same `doctorId`, `date`, and `startTime` that is either `CONFIRMED` or `PENDING` with a `holdExpiresAt` in the future.
   - If clear, an appointment is created with `status = PENDING` and `holdExpiresAt = now() + 5 minutes`.
   - Because of the ACID properties of the transaction, even if two requests arrive at the exact same millisecond, the database serializes them, ensuring only one succeeds.

2. **Confirm Phase (`POST /api/appointments/:id/confirm`)**:
   Once the patient submits the symptom form, the system verifies `status === 'PENDING'` and `holdExpiresAt > now()`. If valid, it updates the status to `CONFIRMED`, attaches the symptoms, and clears the expiration timer. 
   - If the patient abandons the page, the `PENDING` appointment naturally expires after 5 minutes and will be ignored by future hold requests, effectively freeing the slot.

---

## 2. Doctor Leave Conflict Handling

### The Problem
Doctors need to request time off (vacations, sick days), but they may already have upcoming appointments booked on those dates. The system must not only prevent future bookings on those days but also cleanly handle the existing conflicts.

### The Solution: Automated Cascading Cancellations
Doctor leave is a two-step process to ensure clinic oversight:
1. **Request**: The doctor requests a date via the Doctor Portal. A `Leave` record is created with `status = PENDING`.
2. **Approval & Cascade (`POST /api/admin/leaves/:id/approve`)**: When an admin approves the leave, the backend executes a cascade operation:
   - It queries all `Appointment` records for that doctor on the specified date that are `CONFIRMED` or `PENDING`.
   - It updates all affected appointments to `CANCELLED_BY_CLINIC`.
   - It iterates through the affected patients and queues a cancellation email to the `NotificationOutbox`, explaining the situation and asking them to reschedule.
   - Any new booking attempts (`hold` endpoint) explicitly query the `Leave` table and will reject requests if an approved leave exists for that date.

---

## 3. Notification Reliability & Failure Handling

### The Problem
Synchronously sending emails or calling external APIs (like Google Calendar) during a web request is dangerous. If the SMTP server is slow or the Google API fails, the user's booking request will hang or fail entirely, even if the database operation was successful. Furthermore, transient network errors shouldn't result in permanently lost emails.

### The Solution: Outbox Pattern with Cron Jobs
We implemented the **Transactional Outbox Pattern**:
- **Queueing**: Whenever an action requires an email or calendar event (e.g., booking confirmed, leave approved, doctor registered), the web route simply inserts a record into the `NotificationOutbox` table. This happens in the same transaction context as the business logic, making it atomic.
- **Processing (`cron.service.ts`)**: A background cron job runs every minute, pulling the oldest 10 `PENDING` records whose `nextRetryAt` is in the past.
- **Idempotency & Retries**: The job attempts to process the payload (send email or hit Calendar API). 
  - On **success**, it marks the record `SUCCESS`.
  - On **failure**, it increments the `retries` counter and sets `nextRetryAt` to 5 minutes in the future. 
  - If `retries` hits the maximum (3), the record is marked `FAILED` for manual admin review, but it crucially **never crashes the main application**.

This pattern is also used to schedule **Medication Reminders**. When a doctor submits a post-visit note, the system schedules outbox records with `nextRetryAt` set to 8:00 AM the following morning for each medication.

---

## 4. LLM Integration & Graceful Degradation

### The Prompting Strategy
We use the `@google/genai` SDK with `gemini-2.5-flash` for fast, structured extraction.
- **Pre-visit**: Extracts an urgency level, a chief complaint, and 3 suggested questions from unstructured patient symptoms.
- **Post-visit**: Translates clinical jargon into a patient-friendly summary, extracting specific follow-up steps and a medication schedule array.
- Both use `responseSchema` to guarantee a strictly typed JSON output that the frontend can reliably parse.

### Failure Handling
If the LLM API is rate-limited or throws an error:
- The backend catches the exception in the service layer.
- Instead of bubbling the error and aborting the booking/post-visit submission, it returns a **graceful fallback JSON object**.
- Example Fallback: `{ "urgencyLevel": "Medium", "chiefComplaint": "Unable to process symptoms at this time.", "suggestedQuestions": ["Please ask the doctor for details."] }`.
- The database update proceeds successfully, and the patient/doctor flows continue uninterrupted, displaying the fallback text instead of breaking the UI.
