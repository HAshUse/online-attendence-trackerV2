# 📋 Online Attendance Tracker — Feature Documentation

An end-to-end web application designed for educators to schedule classes, generate Google Meet sessions, track student check-ins, and export formatted attendance registers to Google Sheets and Excel.

---

## 🔐 1. Authentication & Integration
- **Teacher Account Management**: Secure registration and login with JWT session tokens and password hashing (`bcrypt`).
- **Google OAuth 2.0 Integration**: One-click Google account connection allowing automated creation of official Google Meet links.

---

## 🏫 2. Branch & Batch Management
- **Cohort Organization**: Create and manage separate branches (e.g., *React Masterclass*, *Python Essentials*, *Data Analytics*).
- **Branch Dashboard**: Real-time overview of active classes, total enrolled students, overall attendance rates, and quick action shortcuts.
- **Analytics & History**: Track attendance trends across historical classes within each branch.

---

## ⏰ 3. Class Creation & Smart Scheduling
- **Intelligent Time Rounding**: Start times automatically align to clean 5-minute intervals.
- **Synchronized Duration Presets**: Quick selection for `45m`, `1h`, `1.5h`, and `2h` class durations.
- **Auto-Synced Start & End Times**: Changing start times dynamically recalculates end times while preserving chosen duration.
- **Quick Date Shortcuts**: Instant date selection for "Today" and "Tomorrow".
- **Google Meet Automation**: Auto-generate Google Meet links or attach custom external meeting URLs.
- **6-Digit Class Codes**: Unique class codes and shareable student join links (`/join/:classCode`).

---

## 📱 4. Student Check-In & Join Experience (`/join/:classCode`)
- **Auto-Fill Profile**: Auto-populates student details (*Full Name*, *Email*, *Group*, *College*) from local browser memory.
- **Live Status Countdown**: Real-time IST countdown timer displaying status:
  - ⏳ `Starts in XXm XXs` (Upcoming)
  - 🟢 `Live • XXm XXs left` (In progress)
  - 🔴 `Session Expired` (Completed)
- **Direct Redirection**: Instant attendance registration with immediate button redirect to the Google Meet room.

---

## 📊 5. Matrix Register Export (Google Sheets & Excel)
- **Single-Tab Attendance Register**: Exports complete branch attendance into a structured matrix layout.
- **Grid Layout Structure**:
  - `S.No` | `Full Name` | `Group` | `College` | `<Date> (<Class Name>)` ... | `Total Present` | `Total Absent` | `Attendance %`
- **Visual Status Coding**:
  - 🟢 **P (Present)** formatted with soft green fill (`#D9EAD3`).
  - 🔴 **A (Absent)** formatted with soft red fill (`#F4CCCC`).
- **Multi-Format Support**:
  - **Google Sheets API**: Direct export to linked Google Sheets with automated batch formatting.
  - **Excel (.xlsx)**: One-click local spreadsheet download.

---

## 🏢 6. College & Student Mapping
- **College Directory**: Centralized list of participating colleges (e.g., *Begumpet College*, *Nizam College*).
- **Group Categorization**: Degree/Group mapping (`BSC`, `BCA`, `B.Tech`, `B.Com`) for accurate student segmentation in exported reports.

---

## 🎨 7. User Experience & Interface
- **Modern Aesthetic**: Dark/Light mode support, glassmorphism UI cards, vibrant badges, and responsive layouts for mobile and desktop screens.
- **Fast Search & Filter**: Search student logs by name, email, group, or college.
