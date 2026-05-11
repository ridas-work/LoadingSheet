# Requirements

## Phase 01 (Authorized PO Entry)

### Users & Access
- Exactly **4 authorized people** can create PO entries.
- Each authorized user logs in using **name + password**.
- System must record **who created** each PO (user identity + timestamp).

### Data to capture (per order)
- **PO number**
- **Customer name**
- **Product name**
- **No. of bottles**

### UX
- Very simple, form-first UI (fast entry, minimal clicks).
- Basic validations (required fields, bottles must be positive integer).

### Storage
- Persist to **MongoDB** (Atlas-ready).

### Admin/Operations (Phase 01)
- Seed/define the 4 users (initially via environment/seed script, not a UI).

