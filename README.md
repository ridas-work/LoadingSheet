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
| Haider  | `haider`  | `Haider-Packaging-01` | Packaging inventory — stock counts and packaging materials |
| Zaman   | `zaman`   | `Zaman-Guard-01`    | Gate — mark orders out for delivery, delivered, or pending redelivery |
| Waleed Intisar | `waleed` | `Waleed-Admin-01` | Admin — oversight (read-only): summary, orders, batches, dispatch |

### Workflow

1. **Nouman & Javeria** (field reps) use **`/field-visits`** to track customer visits: **request sample** → **deliver sample** (date + first reaction) → **2-week follow-up reminder** (record customer comments) → **conclude visit** → create **PO** (+10 points) or **mark lost** (−5 points). Aslam and Ibtisam use `/new-order` only.
2. **PO team** creates orders at `/new-order`. Enter **bottle counts** per product; **cartons are calculated** automatically (e.g. 30 bottles Rhino 500ml = 1 carton). Use **Add custom carton** when the count is not a full carton or for several products in one box — pick **outer box size** (5L jar, 1L, 500ml, 250ml, or 100ml custom box; Haider tracks these separately from standard product cartons). Include **city** and **deadline** for the management report.
3. **Nimra** registers **prepared batches** at `/production/batches` with **batch number, product, date, pH, solids, appearance, provider, HCL, quantity** (stored for audit). **Viscosity** is optional for **Rhino, Brighten, Power Wash, and Hand Sanitizer** batches. Use **Add product** on the same page to register a **new catalog packing** (code, name, bottles per carton, optional batch family and liters per bottle); PO team then sees it when they open or refresh **New order**. One batch per **family** covers related packings: **Brighten** (bottle + pouch), **Fabrito** (bottle + pouch), **Power Wash** (bottle + pouch), **Rhino** (all sizes), **Hand Sanitizer**, **Titan**, **Degrease Spray**, and each **Washout** scent separately (Floral / Lemon / Ocean). **Combo bundles** (e.g. Power Wash + Degrease) use **two batch picks per carton** on the loading sheet — one from each component family. **Total liters** sets the dispatch pool size.
4. **Rashid** lands on **`/dispatch/trips`**: create a **vehicle trip** with one or more POs, enter vehicle/driver/footer once (synced to every linked sheet). Per PO, use **Assign batches** on the trip page or **Edit dispatch** on the loading sheet for batch rows only when the order is on a trip. Before the truck leaves, Rashid **weighs each carton** and enters **Carton wt (kg)** on the loading sheet — must match the factory standard list within **±8%** or save is blocked. On **`/orders`**, only **active factory** POs appear — once Zaman marks **Out for delivery** or **Delivered**, the PO drops off Rashid’s list (open **Dispatch trips** for history). **`/dispatch/filling`** — daily filling log plus **ready bottle stock**: add **pre-filled** stock by **batch label + product + bottles** (batch **does not** need to be in Nimra — use for old batches when liquid is gone; shows **Legacy** vs **In Nimra**). For **active Nimra batches**, use **Ready to deliver** on the daily grid instead of dummy 0-liter Nimra batches. **Physical remaining** stays in liters. Movements: **`/dispatch/ready-stock/movements`**.
5. **Haider** lands on **`/dispatch/inventory`** and maintains the packaging ledger: **Purchased** qty and **Rejected/Damage** per SKU. **Balance = Purchased − Rejected − UIP** (Used in Production). UIP is system-managed — **Rashid** adds bottles/caps when he logs filled bottles; **Zaman** adds order packaging (bottles, stickers, cartons) when he marks a PO **Delivered**. See **Recent stock movements** on the inventory page.
6. **Zaman** at **`/gate/orders`**: only orders that are **ready to go** appear — on a **dispatch trip** with **vehicle, driver, and DC** filled by Rashid, and **carton weights verified** (±8% vs standard list). Zaman marks **Out for delivery** when the vehicle leaves the gate; **Delivered** when the customer has received the goods — this deducts **ready bottle stock** (finished product on the production floor) and **packaging UIP** together; **Pending redelivery** restores ready bottles if the load returns. Loading sheets show ready stock vs PO needs before delivery.
7. **Anyone** can **View loading sheet** and print.
8. **Waleed Intisar** signs in at `/admin` for the **pending orders** grid. He can browse **Orders** and use **Edit order** to correct PO details or product quantities when a customer changes an order or material has an issue — only the boss can edit; PO team creates orders but cannot change them after submit. Other oversight (**Production batches**, **Dispatch trips**, **Packaging inventory**, **Daily filling**, **Field visits** rep scores) is read-only.

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

