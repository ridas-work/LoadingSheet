# Project State

Phase: **07 complete** — Session security
Status: Milestone v1.0 + security ready for audit

## Context
- Full workflow: PO → batches → dispatch → print.
- Sessions require login per browser session; no 30-day persistent cookie.

## Decisions Made
- **Browser-session cookie** — closing browser clears login.
- **8h max** JWT while browser stays open (`SESSION_MAX_AGE_SECONDS`).
- **Global middleware** on all routes except `/login` and auth API.

## UAT (paused)
- Phase 06 UAT: test 1 passed, tests 2–9 pending (`.planning/phases/06-dispatch-assignment/06-UAT.md`).

## Next
- **Resume Phase 06 UAT:** `/gsd-verify-work 6`
- **Audit milestone:** `/gsd-audit-milestone`
