# Phase 28 — Plan 02 Summary

## Done

- `CustomCartonBuilder`: required **Outer box size** select per custom carton; payload includes `customBoxCode`.
- `/new-order`: client validation + scroll-to-error for `customBoxCode`.
- `AdminOrderEditForm`: loads/saves `customBoxCode`; amber banner when legacy cartons missing box size.
- `draftsFromSavedCartons` restores code; suggests size from largest product in carton when missing.
- README workflow updated.

## Ops

Run `npm run seed:packaging` (or your packaging seed command) once so Haider sees the five CUSTOM BOX rows in inventory.
