# 📋 Google Meet Exit Tracking, Auto-Recording & Guest Invitations — Implementation Plan

This document outlines the end-to-end architectural and technical plan for:
1. **Student Departure Tracking**: Capturing when students exit Google Meet sessions, calculating total active call duration, and identifying early departures.
2. **Pro Account Auto-Recording**: Programmatically configuring Google Meet spaces to automatically record class sessions for Google Workspace Pro accounts, and surfacing the recorded video link after class.
3. **Guest Invitations & Co-Hosts**: Allowing teachers to invite other people (students, co-teachers, guest lecturers) directly when scheduling a class—sending official Google Calendar email invites with RSVP buttons and meeting access, exactly like the Google Calendar app.

---

## 🎯 1. Objectives

### Part A: Exit & Duration Tracking
Currently, the Attendance Tracker records **check-in time** when a student clicks *"Mark Attendance & Join Class"*. Once the student is inside Google Meet, the system does not track how long they stayed or when they disconnected.

**Goal:**
- **Left At**: Exact timestamp when the student exited the Google Meet session.
- **Duration (Mins)**: Total active time spent in the call.
- **Exit Status**: Visual badge indicating whether the student attended the full class or left prematurely (e.g., *Left 30 mins early*).
- **Multi-Session Drops & Reconnects**: Capture students who lost connection and rejoined multiple times.
- **Reporting & Exports**: Include departure times and total call duration in Excel and Google Sheets registers.

### Part B: Pro Account Auto-Recording
Educators frequently forget to hit the "Record" button in Google Meet or want class sessions recorded automatically without manual intervention.

**Goal:**
- **Auto-Record on Launch**: When a class is scheduled, configure the Google Meet space to automatically start recording as soon as the meeting begins.
- **Recorded Video Link**: After the meeting concludes, automatically retrieve the MP4 recording URL from Google Drive and display a *"🎥 Watch Class Recording"* link on the teacher and student dashboards.
- **Graceful Tier Handling**: Detect if the teacher's Google account is an eligible Google Workspace Pro account or a free account, displaying helpful feedback.

### Part C: Inviting Other People (Calendar & Meet Sync)
Similar to the Google Calendar app, educators often need to invite guest speakers, substitute teachers, or specific student cohorts directly to the meeting calendar invite.

**Goal:**
- **Add Guest Emails**: In the class creation/edit form, allow teachers to add guest email addresses (e.g. `guest.speaker@univ.edu`, `student@gmail.com`).
- **Official Calendar Invitations**: Google Calendar automatically sends the native email invitation with Meet link and RSVP buttons (`Yes` / `Maybe` / `No`) via `sendUpdates="all"`.
- **Calendar Event Sync**: The class automatically appears on the invited guests' personal Google Calendars.
- **Co-Host Assignment**: Option to designate specific guests as `COHOST` via the Google Meet API v2 `spaces.members` endpoint.

---

## 🔬 2. Technical Feasibility & Live Verification

### 2.1 Departure Telemetry Verification
Live tests against Google Meet REST API v2 using the connected account (`bhaskar.barabari@gmail.com`) confirmed:
- **API Endpoint**: `meet.googleapis.com/v2/conferenceRecords`
- **Required Scope**: `https://www.googleapis.com/auth/meetings.space.created` *(Already active)*
- **Data Captured by Google**:
  ```json
  {
    "displayName": "Bhaskar",
    "earliestStartTime": "2026-11-21T05:30:53.652Z",
    "latestEndTime": "2026-11-21T05:34:12.732Z",
    "participantSessions": [
      {
        "startTime": "2026-11-21T05:30:53.652Z",
        "endTime": "2026-11-21T05:34:12.732Z"
      }
    ]
  }
  ```

### 2.2 Auto-Recording Verification
Live tests against Google Meet REST API v2 `spaces.create` confirmed:
- **Configuration Endpoint**: `POST https://meet.googleapis.com/v2/spaces`
- **Configuration Field**: `config.artifactConfig.recordingConfig.autoRecordingGeneration = "ON"`
- **Account Tier Requirements**: Google Workspace Pro (Business Standard, Plus, Enterprise, Education Plus, or Workspace Individual).
- **Recording Retrieval Endpoint**:
  `GET https://meet.googleapis.com/v2/conferenceRecords/{conferenceRecord}/recordings`
  Returns Google Drive `fileId` and direct playback link for the finished MP4 video.

### 2.3 Guest Invitations Verification
Live test verified via `calendar.events.insert`:
- **API Parameter**: `sendUpdates: "all"`
- **Resource Block**: `attendees: [{ email: "guest@example.com", displayName: "Guest Name" }]`
- **Result**: Successfully created the Calendar event with attendees attached, dispatched native invitation emails, and synced to attendees' calendars.
- **Co-Host Role (Meet API)**:
  `POST https://meet.googleapis.com/v2/spaces/{space}/members`
  Body: `{ "email": "co-teacher@example.com", "role": "COHOST" }`

---

## 🏗️ 3. Architecture & Data Flow

```
1. CLASS CREATION & GUEST INVITATIONS
   Teacher schedules class in /create-class:
   ├── Enters Class Name, Timings, Subject
   ├── [x] Auto-Record Meeting (Optional)
   └── Adds Guest Emails: ["speaker@univ.edu", "assistant@school.edu"]
   └── Backend Execution (googleCalendar.js):
       ├── 1. Creates Google Meet Space via Meet API v2 (with autoRecording if Pro)
       ├── 2. Designates co-hosts via spaces.members.create (if requested)
       └── 3. Inserts Google Calendar Event with:
              ├── conferenceData: attached to the Meet space
              ├── attendees: [{ email: "speaker@univ.edu" }, ...]
              └── sendUpdates: "all" (Triggers Google Calendar email invitations)

2. NOTIFICATIONS & PRE-JOIN
   └── Invited guests receive Google Calendar email with "Join with Google Meet" button & RSVP
   └── Event appears automatically on guests' Google Calendars

3. STUDENT CHECK-IN & CALL ACTIVITY
   Student visits /join/:classCode ──> Marks attendance ──> Redirects to Meet
   └── Google Meet automatically records the video session (if Pro account)
   └── Google Meet servers log join/leave events under conferenceRecords

4. POST-MEETING AUTOMATED SYNC
   Trigger A: Class end time is reached (Background Cron Job)
   Trigger B: Teacher opens /class/:classId Attendance page
   └── Backend calls Google Meet API v2:
       ├── 1. Fetch conferenceRecords for space.meeting_code
       ├── 2. Fetch participantSessions (Join time, Leave time, Duration)
       ├── 3. Fetch recordings (Drive File ID / URL for recorded video)
       └── 4. Update Database:
              ├── Attendance records: leftAt, durationMins, exitStatus
              └── Class record: recordingUrl

5. PRESENTATION & EXPORTS
   └── Class Attendance View displays "Left At", "Duration", "Exit Status", and "Watch Recording"
   └── Excel & Google Sheet matrix register exports include departure timestamps & duration
```

---

## 🗄️ 4. Database Schema Changes

### 4.1 `attendance-tracker-backend/models/Attendance.js`

```javascript
// New fields for exit tracking
leftAt: {
  type: Date,
  default: null,
},
durationMins: {
  type: Number,
  default: 0,
},
exitStatus: {
  type: String,
  enum: ["active", "completed", "left_early", "unknown"],
  default: "unknown",
},
meetSessions: [
  {
    joinedAt: Date,
    leftAt: Date,
    durationSeconds: Number,
  },
],
lastSyncedAt: {
  type: Date,
  default: null,
}
```

### 4.2 `attendance-tracker-backend/models/Class.js`

```javascript
// New fields for recording and guest management
autoRecord: {
  type: Boolean,
  default: false,
},
recordingUrl: {
  type: String,
  default: "",
},
recordingFileId: {
  type: String,
  default: "",
},
invitedGuests: [
  {
    email: { type: String, trim: true, lowercase: true },
    displayName: { type: String, default: "" },
    role: { type: String, enum: ["GUEST", "COHOST"], default: "GUEST" },
    responseStatus: { type: String, default: "needsAction" }, // accepted, declined, tentative, needsAction
  },
]
```

---

## ⚙️ 5. Backend Implementation Plan

### Step 5.1: Update Class Creation Service for Invites & Auto-Record
**File:** `attendance-tracker-backend/services/googleCalendar.js`

```javascript
export const createMeetLink = async (
  teacher,
  title,
  startTime,
  endTime,
  description = "",
  accessType = "open",
  options = {} // { autoRecord: boolean, guests: Array<{ email, role }> }
) => {
  // 1. Create Meet space via Meet API v2
  const spaceConfig = { accessType: "OPEN", entryPointAccess: "ALL" };
  if (options.autoRecord) {
    spaceConfig.artifactConfig = {
      recordingConfig: { autoRecordingGeneration: "ON" },
    };
  }

  // 2. Provision Co-Hosts via spaces.members.create
  // (for guests with role === 'COHOST')

  // 3. Insert Calendar Event with Attendees
  const attendees = (options.guests || []).map((g) => ({
    email: g.email.trim(),
    displayName: g.displayName || "",
  }));

  const calEvent = {
    summary: title,
    description: description,
    location: meetLink,
    start: { dateTime: startIso },
    end: { dateTime: endIso },
    conferenceData: { ... },
    attendees: attendees.length > 0 ? attendees : undefined,
  };

  const response = await calendar.events.insert({
    calendarId: "primary",
    resource: calEvent,
    conferenceDataVersion: 1,
    sendUpdates: attendees.length > 0 ? "all" : "none", // Triggers email invites!
  });

  return { meetLink, eventId: response.data.id };
};
```

### Step 5.2: Create Google Meet Telemetry Service
**File:** `attendance-tracker-backend/services/googleMeetTelemetry.js`

- **`fetchConferenceRecord(teacher, meetingCode)`**:
  Queries `meetApi.conferenceRecords.list({ filter: `space.meeting_code = "${meetingCode}"` })`.
- **`fetchParticipantSessions(teacher, conferenceRecordName)`**:
  Lists all participants and calls `participantSessions.list()` for each participant.
- **`fetchMeetingRecordings(teacher, conferenceRecordName)`**:
  Calls `meetApi.conferenceRecords.recordings.list({ parent: conferenceRecordName })`.
  Returns Drive file details and direct playback links.
- **`matchParticipants(attendanceList, meetParticipants)`**:
  Fuzzy matches Meet display names and emails against student records in the database.

### Step 5.3: Sync Controller Method
**File:** `attendance-tracker-backend/controllers/attendanceController.js`

- **`syncClassMeetTelemetry(req, res)`**:
  1. Validates teacher ownership of class.
  2. Extracts `meetingCode` from `classDoc.meetLink`.
  3. Calls `googleMeetTelemetry.js` to retrieve real-time Meet logs and recording URLs.
  4. Updates matching `Attendance` records in MongoDB (`leftAt`, `durationMins`, `exitStatus`).
  5. If recordings exist, updates `Class.recordingUrl` with the Google Drive link.
  6. Returns updated attendance array and recording details.

### Step 5.4: Automated Background Sync
**File:** `attendance-tracker-backend/services/cronService.js` (or existing `node-cron`)

- Every 15 minutes, query classes that recently passed their `expiresAt` time in the last 2 hours and haven't had their exit telemetry synced.
- Automatically trigger `syncClassMeetTelemetry` in the background so data is ready before the teacher even opens the page.

### Step 5.5: Export Enhancements
Update `exportClassAttendanceToSheet` and `exportAttendance` (Excel):
- Add column: **"Left Call At"** (formatted in IST, e.g. `11:45 AM`).
- Add column: **"Duration"** (e.g. `45 mins`).
- Add column: **"Status"** (e.g. `Full Class`, `Left 15m Early`).

---

## 🎨 6. Frontend Implementation Plan

### Step 6.1: Class Creation & Edit Form
**Files:** `CreateClass.jsx` & `EditClass.jsx`

1. **Guest Invitation Email Input**:
   - An intuitive email tag chip input where teachers can type or paste email addresses.
   - Shows guest chips with a badge: `Guest` or `Co-Host`.
   - Helper subtext: *"Invited guests will receive a Google Calendar invitation with one-click Meet join links."*
2. **Auto-Record Toggle**:
   - A checkbox: *"🎥 Automatically record this meeting (Google Workspace Pro required)"*.

### Step 6.2: Class Attendance Page Updates
**File:** `attendance-tracker-frontend/src/pages/ClassAttendance.jsx`

1. **Auto-Sync on Load**:
   When the page mounts, automatically ping `/api/attendance/sync-meet/:classId` in the background to update exit times and fetch recordings.
2. **Manual Sync Button**:
   Add a sleek `🔄 Refresh Meet Data` button in the action header for on-demand re-syncing while a class is still running.
3. **Recording Banner**:
   If `classDoc.recordingUrl` exists, render a prominent banner:
   > 🎥 **Class Recording Available**: [Watch Recording on Google Drive ↗]
4. **New Table Columns**:
   - **Check-in**: e.g., `10:02 AM`
   - **Exit Time**: e.g., `10:55 AM` (or `Still in call` if active)
   - **Duration**: e.g., `53 mins`
   - **Status Badge**:
     - 🟢 **Full Session** (Attended > 80% of class time)
     - 🟡 **Partial / Left Early** (e.g., `Left 25m early`)
     - ⚪ **In Call** (Meeting currently active)

---

## 🛡️ 7. Edge Cases & Handling

| Edge Case | Solution |
| :--- | :--- |
| **Student disconnects and rejoins (Wi-Fi drop)** | `participantSessions` tracks every sub-session. Total duration sums all active intervals; `leftAt` records final disconnect. |
| **Student joins with a personal account / nickname** | Match by normalized full name if Google email is hidden or differs from registration email. |
| **Meeting still ongoing** | Google returns `endTime: null` for active sessions. The UI displays *"Active in call"* until they disconnect. |
| **Teacher account is free / ineligible for recording** | Backend detects `FEATURE_UNAVAILABLE_TO_USER` and falls back gracefully to standard open space without breaking class creation. UI displays a toast: *"Auto-recording requires an eligible Google Workspace tier."* |
| **Invalid Guest Email entered** | Frontend validates email syntax before adding chip; Google Calendar API silently skips invalid formats without failing the event creation. |
| **Google Token Expired** | Uses existing automatic error handler (`handleGoogleApiError`) to notify teacher to reconnect with zero crashes. |

---

## 📅 8. Execution Stages

```
Phase 1: Database Model Updates & Guest Invites + Auto-Record Support
  ├── Extend Attendance.js and Class.js schemas
  └── Update googleCalendar.js to support attendees, sendUpdates="all", and autoRecord

Phase 2: Backend Telemetry & Recording Service
  ├── Implement googleMeetTelemetry.js (conferenceRecords, participantSessions, recordings)
  ├── Add GET /api/attendance/sync-meet/:classId
  └── Write student <-> Google participant matching algorithm

Phase 3: Frontend UI Integration
  ├── Add Guest Invite input & Auto-Record toggle in CreateClass.jsx & EditClass.jsx
  ├── Update ClassAttendance.jsx with exit times, duration badges, and recording player button
  └── Add Auto-sync on page view + manual refresh trigger

Phase 4: Excel & Google Sheets Export Updates
  └── Include departure timestamps and duration in register exports
```
