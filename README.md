# PH-PMS Frontend – Production UI Baseline

PehalHealthcare Technologies Project Management System frontend built with Next.js App Router, React and TypeScript.

## Included high-fidelity screen groups
- AUTH-001 Login
- AUTH-002 MFA Verification
- AUTH-003 Forgot Password
- AUTH-004 Reset Password
- AUTH-005 Password Expired
- AUTH-006 Session / Device Management
- AUTH-007 Access Denied / Security Challenge
- Dashboard / Executive Workbench
- PRJ-001 Project Registry
- PRJ-002 Create Project – 8-step workflow
- PRJ-003 Project Overview
- Project Team
- Project Timeline / Gantt
- Project Financials
- Project Health
- Project Settings
- Project workspace routes for Tasks, Milestones, Documents, Changes, Activity and Reports

## Run
```bash
npm install
npm run dev
```

## Environment
Copy `.env.example` to `.env.local` and set:
`NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1`

The registry attempts to load live project data from the backend and falls back to polished reference data when the API is unavailable, so the UI remains reviewable during frontend development.

## Production build
```bash
npm run build
npm run start
```

## Main routes
- `/login`
- `/auth/mfa`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/auth/password-expired`
- `/auth/sessions`
- `/auth/access-denied`
- `/dashboard`
- `/projects`
- `/projects/new?step=1` through `?step=8`
- `/projects/1`
- `/projects/1/team`
- `/projects/1/timeline`
- `/projects/1/financials`
- `/projects/1/health`
- `/projects/1/settings`

## Authentication Production Foundation

The authentication layer is now centralized in `components/AuthProvider.tsx` and `lib/auth.ts`.

- Access/refresh token storage supports Remember Me via localStorage/sessionStorage.
- JWT expiry is checked before profile calls; refresh is deduplicated so concurrent requests do not create multiple refresh requests.
- 401 responses refresh once and retry the original protected request.
- Invalid refresh/session clears local credentials.
- `/auth/me` is used to hydrate the current user after reload.
- Protected application routes redirect to `/login?next=...` when there is no authenticated session.
- Bootstrap users without `organizationId` are routed to `/organization/setup` rather than sending a fake organization ID.
- Logout clears local credentials even if the backend logout request fails.

### Current backend auth contract

The frontend expects:

- `POST /api/v1/auth/login` — returns `user`, `accessToken`, `refreshToken`.
- `POST /api/v1/auth/refresh` — accepts `{ refreshToken }` and returns refreshed tokens.
- `GET /api/v1/auth/me` — authenticated current-user profile.
- `POST /api/v1/auth/logout` — optional server-side session/revocation endpoint; frontend still clears local state if unavailable.

MFA, password recovery, SSO, device management and CAPTCHA require their corresponding backend endpoints/security providers before those UI actions are enabled in production. The frontend does not fake successful verification.
