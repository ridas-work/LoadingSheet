---
phase: "03"
plan: "01"
completed: "2026-05-12"
---

# Phase 03 Plan 01 — Order portal auth

## Shipped

- **Seed users:** Nouman, Javeria, Aslam, Ibtisam with planned usernames/passwords (`scripts/seed-users.ts`).
- **SessionProvider** in root layout for `next-auth/react` (`signIn` / `signOut`).
- **Protected `(app)` layout:** `auth()` + redirect to `/login`; header shows name + **Log out**.
- **Home:** `/` → `/new-order` if session else `/login`.
- **Login:** credentials form at `/login` (no signup messaging).
- **`POST /api/orders`:** requires session; sets `createdByUserId` + `createdByName`.
- **`GET /api/orders/[id]`:** requires session.
- **New Order:** `credentials: "same-origin"`; **401** → redirect to `/login`.

## Ops

```bash
npm run seed:users
```

Ensure `.env.local` has `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `MONGODB_URI`.

## Verification

- `npm run build` passes.
