# 04-SUMMARY — Customer dropdown in PO + field visit

**Status:** Complete

## What was built
- `app/(app)/new-order/page.tsx` — fetches `/api/customer-directory` on mount; customer name input is now a combobox via `<datalist>`; selecting/typing a known company prefills `city` when the account has one and city is empty.
- `components/FieldVisitDetailForm.tsx` — same directory fetch + `<datalist>` on the customer name input, with optional city prefill.

## Notes
- Field visit reps are `po_creator`, so they already pass the `/api/customer-directory` guard (`canCreateOrders`).
- Datalist keeps free-text entry intact — reps can still type a brand-new customer name.

## Verification
- `npm run build` passes. New customers opened via the account form appear immediately in both pickers.
