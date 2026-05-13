---
wave: 1
depends_on: ["01-PLAN.md"]
gap_closure: false
files_modified:
  - "app/(app)/orders/page.tsx"
  - "app/(app)/orders/[id]/loading-sheet/page.tsx"
  - "app/(app)/production/batches/page.tsx"
  - "app/(app)/layout.tsx"
  - "app/(app)/new-order/page.tsx"
  - "app/api/orders/route.ts"
  - "lib/roles.ts"
  - "components/LoadingSheetBatchEditor.tsx"
  - "README.md"
  - ".planning/REQUIREMENTS.md"
autonomous: true
---

<phase_goal>
Everyone with a login can **find any order** and **open the loading sheet** (view + print). Nimra can **view the same sheet** and **enter batch numbers** without losing the print layout — via an **edit mode on the loading sheet** (batch column only), not a separate mystery URL.
</phase_goal>

<design_decision>
## View vs edit — recommended approach (hybrid)

| Approach | Pros | Cons |
|----------|------|------|
| **A. Batch entry only on `/production/orders/[id]`** (today) | Simple form, mobile-friendly | Nimra never sees the real sheet; PO team can’t find old sheets |
| **B. Batch entry directly on print layout** | WYSIWYG, one screen | Inputs clash with print CSS; awkward on phone; save/print buttons fight `@media print` |
| **C. Hybrid (recommended)** | One URL for the sheet; print stays clean; Nimra sees paper layout while editing | Slightly more UI code |

**Ship C:**

1. **`/orders`** — shared order list for **all roles** (PO + Nimra): PO, customer, date, batch progress, actions.
2. **`/orders/[id]/loading-sheet`** — **everyone**: read-only print view + Print button.
3. **Nimra only** on that same page: toolbar **“Edit batches”** toggles edit mode:
   - Table stays the loading-sheet layout.
   - Only **Batch No** cells become inputs (`print:hidden` toolbar + inputs; printed output shows saved values).
   - **Save** calls existing `PATCH /api/orders/[id]/batches`.
4. Keep **`/production/batches`** as Nimra’s home (redirect target unchanged) but each row gets **View sheet** + **Edit batches** (latter opens loading sheet with `?edit=1` or hash).
5. Deprecate duplicate UX: `/production/orders/[id]` can redirect to loading sheet edit mode OR remain as thin redirect — prefer **redirect** to one canonical screen.

**Do not** put PO creation or weight/dispatch editing on this page.
</design_decision>

<how_access_works>
| Role | `/orders` list | Loading sheet view | Edit batches on sheet |
|------|----------------|--------------------|------------------------|
| `po_creator` | ✓ | ✓ view/print | ✗ |
| `batch_editor` | ✓ | ✓ view/print | ✓ edit mode |

- Header nav: PO users → link **Orders** + **New order**; Nimra → **Orders** (label “Batch entry” ok on home `/production/batches` or unify to `/orders`).
- Loading sheet back link: role-aware (`/new-order` vs `/orders` or `/production/batches`).
</how_access_works>

<must_haves>
- [ ] **`GET /api/orders`** allowed for **both** `po_creator` and `batch_editor` (remove batch_editor-only restriction).
- [ ] **`/orders`** page lists orders with **View loading sheet** for every user.
- [ ] **`/orders/[id]/loading-sheet`** accessible to both roles (already under `(app)` auth).
- [ ] Nimra: **Edit batches** on loading sheet updates `sheetLines[].batchNo` via existing PATCH API.
- [ ] Print view: batch inputs hidden when printing; saved batch values appear in printed cells.
- [ ] PO users can reopen loading sheet for **any past order** without knowing MongoDB id manually.
- [ ] Nimra order list rows include **View loading sheet** link.
</must_haves>

<tasks>
  <task id="1" name="api-orders-list-all-roles">
    <step>Update `GET /api/orders` in `app/api/orders/route.ts`: allow any authenticated user with `po_creator` or `batch_editor`; keep POST `po_creator` only.</step>
    <step>Return same shape: `id`, `poNumber`, `customerName`, `createdAt`, `batchProgress`.</step>
  </task>

  <task id="2" name="orders-list-page">
    <step>Add `app/(app)/orders/page.tsx` (server or client): fetch list (DB server-side like production batches page, or client `GET /api/orders`).</step>
    <step>Each row: PO, customer, date, `filled/total` batches, primary action **View loading sheet** → `/orders/[id]/loading-sheet`.</step>
    <step>For `batch_editor` session: secondary **Edit batches** → `/orders/[id]/loading-sheet?edit=1`.</step>
    <step>Empty state copy for no orders.</step>
  </task>

  <task id="3" name="loading-sheet-edit-mode">
    <step>Create `components/LoadingSheetBatchEditor.tsx` (client): props `orderId`, `sheetLines`, `poNumber`, `customerName`; local state for batch fields; Save → PATCH `/api/orders/[id]/batches`.</step>
    <step>Refactor `loading-sheet/page.tsx`: server loads order; pass data to client wrapper that renders print layout + conditionally mounts editor when `searchParams.edit === "1"` and session role is `batch_editor`.</step>
    <step>Toolbar (print:hidden): Print | Edit batches (Nimra) | Save (edit mode) | Back to orders.</step>
    <step>Read-only cells: box, product, bottles, weight, PO, customer. Editable: batch column only in edit mode.</step>
    <step>CSS: inputs use `print:hidden`; display saved `batchNo` text in `print:block hidden` sibling or print stylesheet so print shows values not empty inputs.</step>
  </task>

  <task id="4" name="nav-and-links">
    <step>`app/(app)/layout.tsx`: show **Orders** link for all roles; keep home logo → role home.</step>
    <step>`new-order` success screen: add link **All orders** → `/orders` beside existing View loading sheet.</step>
    <step>`production/batches/page.tsx`: add **View loading sheet** per row; change primary edit link to loading sheet `?edit=1` (optional: redirect `/production/orders/[id]` → loading sheet edit).</step>
    <step>Fix loading-sheet back link: `homePathForRole` or `/orders` instead of hardcoded `/new-order` for Nimra.</step>
  </task>

  <task id="5" name="docs">
    <step>README: workflow section — create order → Nimra batches → anyone opens **Orders** → **View loading sheet**.</step>
    <step>REQUIREMENTS.md: Phase 04 follow-up marked planned with this plan reference.</step>
  </task>
</tasks>

<verification>
- Log in as **nouman**: `/orders` shows list; open sheet for an order; print works; no edit UI.
- Log in as **nimra**: `/orders` or `/production/batches` → **View sheet** read-only; **Edit batches** → inputs in batch column only; Save → reload shows values; Print shows batch numbers.
- `npm run build` passes.
</verification>
