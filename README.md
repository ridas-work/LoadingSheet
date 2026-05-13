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

| Person  | Username  | Initial password    |
|---------|-----------|---------------------|
| Nouman  | `nouman`  | `Nouman-Order-01`   |
| Javeria | `javeria` | `Javeria-Order-02`  |
| Aslam   | `aslam`   | `Aslam-Order-03`    |
| Ibtisam | `ibtisam` | `Ibtisam-Order-04`  |
| Nimra   | `nimra`   | `Nimra-Batch-01`    | Production — batch numbers only |

### Workflow

1. **PO team** creates orders at `/new-order`.
2. **Nimra** opens `/production/batches` or `/orders`, then **Edit batches** on the loading sheet.
3. **Anyone** opens **Orders** (`/orders`) → **View loading sheet** to print the sheet (with batches once saved).

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

