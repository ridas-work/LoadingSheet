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

### Workflow

1. **PO team** creates orders at `/new-order`.
2. **Nimra** registers **prepared batches** at `/production/batches` with **batch number, product, date, pH, solids, appearance, provider, drum, quantity** (stored for audit). One **Power Wash** batch covers both Power Wash and Power Wash (pouch) packings. **Total liters** sets the dispatch pool size.
3. **Rashid** lands on **`/dispatch/trips`**: create a **vehicle trip** with one or more POs, enter vehicle/driver/footer once (synced to every linked sheet). Per PO, use **Assign batches** on the trip page or **Edit dispatch** on the loading sheet for batch rows only when the order is on a trip.
4. **Anyone** can **View loading sheet** and print.

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
```

