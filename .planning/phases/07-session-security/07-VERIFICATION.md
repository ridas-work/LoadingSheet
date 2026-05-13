# Phase 07 Verification — Session security

**Status:** passed  
**Date:** 2026-05-13

| # | Must-have | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Global middleware protects routes | ✓ | `middleware.ts` |
| 2 | Session cookie browser-session only | ✓ | `lib/auth.ts` cookies.sessionToken.options (no maxAge) |
| 3 | JWT maxAge 8h default | ✓ | `SESSION_MAX_AGE_SECONDS` default 28800 |
| 4 | APIs require session | ✓ | middleware + existing 401 handlers |
| 5 | Logout → `/login` | ✓ | `logout-button.tsx` unchanged |
| 6 | No public data pages | ✓ | middleware matcher |
| 7 | README documents behavior | ✓ | README session security section |

`npm run build` — success.

**Manual check recommended:** close browser completely → reopen site → should require login.
