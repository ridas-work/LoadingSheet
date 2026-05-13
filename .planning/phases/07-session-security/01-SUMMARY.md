# Plan 01 Summary — Session security & mandatory login

**Status:** Complete  
**Wave:** 1

## Delivered

- **`middleware.ts`** — global auth via `withAuth`; unauthenticated users redirected to `/login`; `/api/auth` and `/login` public; logged-in users on `/login` redirected to `/`.
- **`lib/auth.ts`** — `SESSION_MAX_AGE_SECONDS` (default 8h JWT cap); session token cookie without `maxAge` (browser-session cookie).
- **Login form** — `autoComplete="off"` on form.
- **README** — session security behavior documented.

## Verification

- `npm run build` — passed.
