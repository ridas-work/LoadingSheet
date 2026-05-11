---
phase: "01"
plan: "01"
subsystem: "auth-orders"
tags:
  - nextjs
  - nextauth
  - mongodb
  - mongoose
  - credentials
  - po-entry
requires: []
provides:
  - "Credentials login for 4 seeded users"
  - "Role-gated order creation stored in MongoDB"
affects:
  - "Phase 02: production updates will attach to orders"
tech-stack:
  added:
    - "next-auth"
    - "mongoose"
    - "bcryptjs"
    - "dotenv"
  patterns:
    - "App Router route groups for auth/app areas"
    - "Credentials provider backed by MongoDB users"
key-files:
  created:
    - "lib/db.ts"
    - "lib/auth.ts"
    - "lib/models/User.ts"
    - "lib/models/Order.ts"
    - "scripts/seed-users.ts"
    - "app/(auth)/login/page.tsx"
    - "app/(app)/layout.tsx"
    - "app/(app)/new-order/page.tsx"
    - "app/api/auth/[...nextauth]/route.ts"
    - "app/api/orders/route.ts"
  modified:
    - "app/page.tsx"
    - "README.md"
decisions: []
metrics:
  completed: "2026-05-11"
---

# Phase 01 Plan 01: Authorized PO Entry Summary

Credentials-based login (4 seeded users) with a protected “New Order” form that creates MongoDB `Order` records attributed to the logged-in user.

## What shipped

- Next.js App Router app scaffolded and runnable locally
- MongoDB connection helper via Mongoose
- `User` model + seed script to upsert exactly 4 users (passwords hashed)
- NextAuth credentials provider backed by MongoDB `User` records (role-gated)
- Protected app area with header (current user + logout)
- Authenticated `POST /api/orders` that validates payload and stores attribution fields
- One-screen “New Order” UI with inline errors + success / create-another flow

## Verification notes

- `npm run dev` starts and routes exist: `/login`, `/new-order`
- `npm run seed:users` upserts users when `MONGODB_URI` is set
- `POST /api/orders` returns:
  - 401 when logged out
  - 400 with field errors for invalid payload
  - 200 with `{ id }` for valid payload (and stores createdBy + timestamps)

## Commits

- `f684e9e`: feat(01-01): scaffold Next.js app and MongoDB helper
- `d47e47a`: feat(01-01): add user model and seed script
- `2663845`: feat(01-01): add credentials auth and protected app area
- `6df2b02`: feat(01-01): create orders API with attribution
- `79524e8`: feat(01-01): add new order entry UI

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 3 - Blocking] Worked around `create-next-app` naming restriction**
   - **Issue:** The workspace folder name contains capitals; `create-next-app .` rejected it.
   - **Fix:** Generated the app in a lowercase subfolder and moved it into repo root.

2. **[Rule 3 - Blocking] Deferred `MONGODB_URI` validation to connection time**
   - **Issue:** Throwing on import broke dev server startup before env was configured.
   - **Fix:** Validate `MONGODB_URI` inside `connectToDatabase()` instead of module load.

## Authentication Gates

None.

## Next Phase Readiness

- Ready for Phase 02 once the team confirms desired order schema evolution (e.g., adding line items for batches/weights).

