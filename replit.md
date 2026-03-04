# Chrono - Sistema de Control de Asistencia

## Overview
A geofenced attendance management system for tracking employee work hours based on physical location. Features role-based access control (Admin/Employee) and GPS-based check-in/check-out.

## Tech Stack
- **Frontend**: React + TypeScript, Vite, Tailwind CSS, Shadcn UI, Wouter (routing), TanStack Query
- **Backend**: Node.js + Express, Passport.js (auth), bcrypt (password hashing)
- **Database**: PostgreSQL + Drizzle ORM
- **Charts**: Recharts

## Project Structure
```
client/src/
  pages/
    auth-page.tsx          - Login page
    admin/
      dashboard.tsx        - Admin dashboard with stats and charts
      users.tsx            - User management (CRUD)
      locations.tsx        - Location/work center management
      departments.tsx      - Department management
      attendance-records.tsx - View all attendance records
      holidays.tsx         - Holiday management
      messages.tsx         - Admin messaging
      settings.tsx         - System settings
      user-attendance.tsx  - Individual user attendance view
      user-schedules.tsx   - User schedule management
    employee/
      check-in.tsx         - GPS-based check-in/out
      attendance.tsx       - Personal attendance history
      messages.tsx         - Employee messaging
      settings.tsx         - Employee settings
  hooks/
    use-auth.tsx           - Auth context and mutations
    use-theme.tsx          - Theme/appearance context
    use-toast.ts           - Toast notifications
  components/
    layout/
      admin-layout.tsx     - Admin sidebar + navbar layout
      employee-layout.tsx  - Employee sidebar + navbar layout
    ui/                    - Shadcn UI components
  lib/
    queryClient.ts         - TanStack Query setup with API helpers

server/
  index.ts                 - Server entry point
  routes.ts                - All API routes
  auth.ts                  - Passport auth setup + login/register/logout
  vite.ts                  - Vite dev server setup (DO NOT MODIFY)

db/
  schema.ts                - Drizzle schema (users, locations, attendance, userSettings, departments, messages)
  index.ts                 - Database connection
```

## Database Schema
- **users**: id, username, password, role, fullName, email, phone, avatar, employeeType, department, medusaUser, emergencyContact, emergencyPhone
- **locations**: id, name, address, latitude, longitude, radius
- **attendance**: id, userId, locationId, checkInTime, checkOutTime, isManualEntry
- **userSettings**: id, userId, theme, appearance, animationsEnabled, animationSpeed, sidebarCollapsed, autoCheckIn, autoCheckOut, singleCheckInPerDay
- **departments**: id, name
- **messages**: id, fromUserId, toUserId, content, sentAt, read

## API Routes
### Auth
- POST /api/login, POST /api/register, POST /api/logout, GET /api/user

### Users (Admin)
- GET /api/users, GET /api/users/recent, POST /api/users, PATCH /api/users/:id

### Locations
- GET /api/locations, POST /api/locations (admin), PATCH /api/locations/:id (admin), DELETE /api/locations/:id (admin)

### Attendance
- GET /api/attendance, GET /api/attendance/history, POST /api/attendance/check-in, POST /api/attendance/check-out
- GET /api/attendance/recent (admin), GET /api/attendance/stats (admin)

### Settings
- GET /api/user/settings, PATCH /api/user/settings, PATCH /api/user/profile

### Departments
- GET /api/departments, POST /api/departments (admin)

### Messages
- GET /api/messages, POST /api/messages, PATCH /api/messages/:id/read

## Running
- `npm run dev` starts Express backend + Vite frontend on port 5000
- `npm run db:push` pushes schema changes to database

## Production Deployment (Ubuntu Server)
- `install.sh` - Unattended auto-installer for Ubuntu 22.04/24.04
- Supports both fresh install and updates (preserves credentials)
- Uses systemd (not PM2) for process management
- Config stored in `/etc/chrono/env` (outside repo)
- Cookie security controlled via `SECURE_COOKIES` env var
- Optional Cloudflare Tunnel support for HTTPS
- DB driver auto-detects Neon (dev) vs standard PostgreSQL (prod) via `db/index.ts`

## Environment Variables (Production)
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `REPL_ID` - Used as session secret fallback
- `PORT` - Server port (default 5000)
- `NODE_ENV` - "production" in prod
- `SECURE_COOKIES` - "true"/"false" (false if no HTTPS)
