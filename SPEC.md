# UPF Language Center Management Platform - Technical Specification

## 1. Project Overview
A modular, bilingual (French / English) educational management web application for the Language Center at the Private University of Fez (UPF). The platform manages university-wide language instruction across two subjects (**English** and **French**), organizing departments, semesters, parent modules, semi-modules, professor assignments, student rosters, and attendance/absence tracking in one centralized dashboard.

### Core Design Principles
- **Modular Administration:** Admins can add, rename, color-code, or archive departments, semesters, modules, and semi-modules from the UI without modifying code.
- **Role-Based Simplicity:** Professors and Department Heads only see the views and actions relevant to their assigned classes or departments.
- **Data Integrity on Swaps:** Reassigning professors or transferring students between groups or departments preserves all historical attendance records and logs every swap.
- **Bilingual First:** Every interface label, status badge, notification, and exported report supports instant switching between **English (EN)** and **French (FR)**.

---

## 2. Tech Stack & Conventions
- **Framework:** Next.js 16 (App Router) with TypeScript (strict mode)
- **Styling:** Tailwind CSS + `lucide-react` icons
- **Backend & Auth:** Supabase (PostgreSQL + Auth + Row Level Security) via `@supabase/ssr` and `@supabase/supabase-js`
  - **Strict Rule:** Do NOT use deprecated `@supabase/auth-helpers-nextjs`. Always use `@supabase/ssr` with separate browser (`src/lib/supabase/client.ts`) and server (`src/lib/supabase/server.ts`) clients plus request session refresh in `src/proxy.ts` (or `src/middleware.ts` matching the installed Next.js template).
- **Internationalization (i18n):** `next-intl` configured with a cookie-based locale (`NEXT_LOCALE` = `en` | `fr`, no forced URL prefix) synced to `profiles.preferred_locale`. Translation dictionaries live in `messages/en.json` and `messages/fr.json`.
- **Spreadsheet Import / Export:** `xlsx` (SheetJS) for reading uploaded `.xlsx`/`.csv` rosters and generating `.xlsx` exports.
- **PDF Export:** `jspdf` + `jspdf-autotable` for printable attendance sheets and department reports.
- **Validation:** `zod` for form inputs, server actions, and spreadsheet row validation.
- **Hosting:** Vercel (connected via GitHub).

---

## 3. User Roles & Permissions Matrix

| Capability | Admin (Center Lead / Coordinator) | Department Head | Professor | Pending (New Signup) |
| :--- | :---: | :---: | :---: | :---: |
| View holding screen awaiting approval | No | No | No | Yes |
| Switch active semester & FR/EN language | Yes | Yes | Yes | Yes (Language only) |
| View all Department Cards | Yes | Assigned Dept(s) only | Assigned classes only | No |
| Add / Rename / Archive Departments | Yes | No | No | No |
| Create / Switch Active Semester | Yes | No | No | No |
| Manage User Roles & Dept Head Scopes | Yes | No | No | No |
| Create Modules & Semi-Modules (EN / FR) | Yes | Read-only | Read-only (own) | No |
| Assign or Swap Professors | Yes | No | No | No |
| Transfer / Swap Students between groups | Yes | No | No | No |
| Bulk Import Excel / CSV Student Rosters | Yes | No | No | No |
| Create Attendance Sessions & Mark Absences | Yes | Read-only | Own Semi-Modules only | No |
| Export Rosters & Absence Reports (XLSX/PDF) | All | Assigned Dept(s) | Own Semi-Modules | No |

---

## 4. Academic Hierarchy & Modularity
1. **Departments** (Pre-seeded with `ESMAB`, `FSI`, `FBS`, `HEALTH`, plus full Admin CRUD to add or rename departments at any time).
2. **Semesters** (e.g., `2026-2027 S1`, `2026-2027 S2`). Selecting a semester in the global header dynamically updates all cards, rosters, and counters across the app.
3. **Modules** (Belong to a Department + Semester, representing a cohort or program track, e.g., `DAI2 - Language & Communication`).
4. **Semi-Modules** (Belong to a Module; strictly typed as `english` or `french`, with a `group_name` like `G1`/`G2`, an assigned `professor_id`, schedule note, and configurable `max_absences_allowed`).
5. **Students & Enrollments** (A student exists once in `students` identified by unique `student_code`, and links to semi-modules via `enrollments`. Moving a student marks the old enrollment `transferred` and creates or activates the new enrollment so past absences are never lost).
6. **Attendance Sessions & Records** (Each class meeting is an `attendance_session` with a date and optional topic; each enrolled student gets a status: `present`, `absent`, `justified`, or `late`).

---

## 5. Page & Route Architecture
- `/login`: Email/password sign-in and account registration form with FR/EN toggle.
- `/pending`: Shown automatically to authenticated users whose role is `pending`, instructing them to wait for Admin role assignment.
- `/dashboard`:
  - **Global Top Bar:** Semester selector dropdown, FR/EN toggle button, role badge, user menu.
  - **Admin & Dept Head View:** Interactive grid of **Department Cards** (ESMAB, FSI, FBS, Health, plus custom departments). Each card displays department name, code, assigned professor count, active student count, French/English semi-module counts, and students exceeding the absence limit. Clicking a card navigates to `/departments/[id]`.
  - **Professor View:** Direct grid of their assigned **Semi-Module Cards** for the selected semester, showing department badge, subject (`EN` / `FR`), group name, student count, and a quick button to take attendance.
- `/departments/[id]`:
  - Department summary header with semester filter and Export button (Excel/PDF).
  - Toggle tabs: **Modules & Semi-Modules** | **Assigned Professors** | **Enrolled Students**.
  - Admins see inline buttons to create modules/semi-modules, **Swap Professor**, or **Transfer Student**.
- `/semi-modules/[id]`:
  - Roster and Attendance workspace for a single French or English semi-module.
  - Quick session creator ("New Attendance Session" with date + topic).
  - Attendance matrix showing each student, their session statuses, automatic unexcused absence total, justified count, and a red warning badge when absences reach `max_absences_allowed`.
  - One-click **Export Excel (.xlsx)** and **Export PDF (.pdf)** buttons.
  - Admin controls: Reassign/Swap Professor, Add Student, Transfer Student to another group/department.
- `/admin/departments`: Modular department manager (Create, Rename EN/FR, Change Code/Color, Archive/Restore).
- `/admin/semesters`: Create academic years/semesters and set the default active semester.
- `/admin/users`: View all registered accounts, assign roles (`admin`, `dept_head`, `professor`, `pending`), assign Department Heads to one or more departments, and toggle account active status.
- `/admin/import`: Guided Excel/CSV importer:
  1. Downloadable sample template (`.xlsx`).
  2. File dropzone reading `.xlsx` or `.csv` client-side via SheetJS.
  3. Column mapper matching file headers to: `student_code`, `first_name`, `last_name`, `email`, `department_code`, `cohort_level`, `module_code`, `subject` (`english`|`french`), `group_name`.
  4. Validation preview table highlighting missing fields or unknown department codes before committing.
  5. Batch upsert server action creating/updating students and enrollments cleanly.

---

## 6. Key Interactive Workflows

### 6.1 Professor Swap Modal (Admin)
- Triggered from any Semi-Module card or Department view.
- Offers two modes:
  1. **Reassign:** Replace the current professor on Semi-Module A with another professor (or leave unassigned).
  2. **Two-Way Swap:** Select Semi-Module B (same semester) to atomically exchange Professor A and Professor B.
- Writes an entry to `transfer_logs` with `entity_type = 'professor'`.

### 6.2 Student Transfer / Swap Modal (Admin)
- Triggered from a student row in `/departments/[id]` or `/semi-modules/[id]` (supports single or bulk multi-select).
- Admin selects target Department, Module, and Semi-Module (French or English group).
- Marks the previous `enrollment` row as `status = 'transferred'`, inserts/reactivates the target `enrollment` with `transferred_from_semi_module_id`, and logs the action in `transfer_logs`.

### 6.3 Excel & PDF Exports
- **Semi-Module Attendance Report:** Columns for Student ID, Full Name, Session Dates (P/A/J/L), Total Absences, Justified Absences, Status (`OK` / `Limit Reached`).
- **Department Summary Report:** Breakdown by Module and Semi-Module showing Subject, Group, Assigned Professor, Enrolled Count, Total Absences, and Flagged Students.
- Export filenames follow: `UPF_[DeptCode]_[SemesterCode]_[Type]_[YYYY-MM-DD].[xlsx|pdf]`.

---

## 7. Phased Sprint Plan (Build Order for OpenCode)

### Sprint 1: Foundation, Auth, Bilingual Shell & Modular Department Cards
- Install dependencies (`@supabase/supabase-js`, `@supabase/ssr`, `next-intl`, `lucide-react`, `zod`).
- Configure Supabase clients, auth middleware, `/login`, `/pending`, and sign-out flow.
- Implement FR/EN switcher (`messages/en.json`, `messages/fr.json`).
- Build the global layout with Semester Selector and Role-aware Dashboard.
- Build `/admin/departments` (add, rename, color, archive) and `/admin/users` (role assignment and department head mapping).
- **Done when:** Admin can log in, toggle FR/EN, add or rename a department, assign a user role, and see live Department Cards update.

### Sprint 2: Semesters, Modules, Semi-Modules & Swapping
- Build `/admin/semesters` (create and set current semester).
- Build `/departments/[id]` with tabs for Modules/Semi-Modules, Professors, and Students.
- Build forms to create Modules and French/English Semi-Modules.
- Build the **Professor Swap Modal** and **Student Transfer Modal** with `transfer_logs` recording.
- **Done when:** Admin can switch semesters, assign/swap professors between French/English groups, and move students across groups without losing records.

### Sprint 3: Spreadsheet Bulk Import & Manual Student Management
- Install `xlsx`.
- Build `/admin/import` with downloadable `.xlsx` template, drag-and-drop parser, column mapping UI, Zod validation preview, and batch upsert server action.
- Add manual student create/edit modal inside `/departments/[id]` and `/semi-modules/[id]`.
- **Done when:** Admin can upload an Excel file of 200+ students and see them enrolled into their departments and French/English semi-modules with zero duplicates.

### Sprint 4: Attendance Grid, Absence Alerts & Excel/PDF Exports
- Install `jspdf` and `jspdf-autotable`.
- Build `/semi-modules/[id]` attendance session manager and interactive attendance grid.
- Wire live absence counters from `enrollment_attendance_summary` and visual threshold alerts.
- Implement `.xlsx` and `.pdf` export utilities for Professors, Department Heads, and Admins respecting role boundaries.
- **Done when:** A Professor can mark attendance for their assigned group, see absence counts update immediately, and download clean FR/EN Excel and PDF sheets.