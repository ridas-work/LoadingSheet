Authorized PO Entry (Phase 1)

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: latest LTS)
- MongoDB (Atlas recommended)

### Setup

1. Copy `.env.example` to `.env.local`
2. Fill in `MONGODB_URI`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`

### Run the dev server

```bash
npm run dev
```

Open `http://localhost:3000`.

### Authorized users (login)

Sign in at `/login`. Accounts are created only via seed (no signup).

**Session security:** Opening `http://localhost:3000` always shows the login screen and clears any previous session, so you must enter username and password each time. Use **Log out** when leaving a shared PC. Optional: set `SESSION_MAX_AGE_SECONDS` in `.env.local` to cap how long a login lasts while the browser stays open (default 8 hours).

| Person  | Username  | Initial password    |
|---------|-----------|---------------------|
| Nouman  | `nouman`  | `Nouman-Order-01`   |
| Javeria | `javeria` | `Javeria-Order-02`  |
| Aslam   | `aslam`   | `Aslam-Order-03`    |
| Ibtisam | `ibtisam` | `Ibtisam-Order-04`  |
| Nimra   | `nimra`   | `Nimra-Batch-01`    | Production — batch numbers only |
| Rashid  | `rashid`  | `Rashid-Dispatch-01`| Dispatch — vehicle, driver, DC, signatures |
| Waleed Intisar | `waleed` | `Waleed-Admin-01` | Admin — oversight (read-only): summary, orders, batches, dispatch |

### Workflow

1. **PO team** creates orders at `/new-order`. The page lists **every catalog product**; type **carton counts** for a normal order, or choose **Mixed sample box** to ship several products in **one physical carton** (enter **bottles per product** + how many identical mixed boxes). Leave unused products blank. Toggle **Sample / custom** on standard orders for non-default bottles per carton. Include **city** and **deadline** for the management report.
2. **Nimra** registers **prepared batches** at `/production/batches` with **batch number, product, date, pH, solids, appearance, provider, HCL, quantity** (stored for audit). **Viscosity** is optional for **Rhino, Brighten, Power Wash, and Hand Sanitizer** batches. **Add product** (planned Phase 20) will let Nimra register new catalog SKUs from the portal. One batch per **family** covers related packings: **Brighten** (bottle + pouch), **Fabrito** (bottle + pouch), **Power Wash** (bottle + pouch), **Rhino** (all sizes), **Hand Sanitizer**, **Titan**, **Degrease Spray**, and each **Washout** scent separately (Floral / Lemon / Ocean). **Combo bundles** (e.g. Power Wash + Degrease) use **two batch picks per carton** on the loading sheet — one from each component family. **Total liters** sets the dispatch pool size.
3. **Rashid** lands on **`/dispatch/trips`**: create a **vehicle trip** with one or more POs, enter vehicle/driver/footer once (synced to every linked sheet). Per PO, use **Assign batches** on the trip page or **Edit dispatch** on the loading sheet for batch rows only when the order is on a trip. **`/dispatch/inventory`** — record on-hand **packaging** (empty bottles, caps, stickers, labels); enter Purchased Qty, Rejected/Damage, and UIP; balance is auto-calculated. **`/dispatch/filling`** — daily filling log: enter **Filled today**, **Ready to deliver**, and **Physical remaining** for each active batch; **Variance / waste** = Nimra system remaining − Rashid physical (positive = possible wastage, negative = unlogged fill or sheet not updated yet).
4. **Anyone** can **View loading sheet** and print.
5. **Waleed Intisar** signs in at `/admin` for the **pending orders** grid. He can browse **Orders** and use **Edit order** to correct PO details or product quantities when a customer changes an order or material has an issue — only the boss can edit; PO team creates orders but cannot change them after submit. Other oversight (**Production batches**, **Dispatch trips**, **Packaging inventory**, **Daily filling**) is read-only.

### Batch volume (liters)

Bottle stickers may show **kg**; the app tracks **liters** everywhere. Nimra enters **total liters per batch**; **Weight** per row is auto-calculated (`bottles × liters per bottle` from the product catalog). Saves are rejected if a batch is over-allocated.

Re-seed products after catalog updates: `npm run seed:products`.

```bash
npm run seed:users
```

Set `NEXTAUTH_SECRET` and `NEXTAUTH_URL` (e.g. `http://localhost:3000`) in `.env.local`, then restart the dev server.

### Seed product packings (bottles per carton)

Catalog lives in `data/product-packings.json` (array of `{ "code", "name", "bottlesPerCarton" }`). Override with env `SEED_PRODUCTS_JSON` if needed.

```bash
npm run seed:products
npm run seed:packaging
```

