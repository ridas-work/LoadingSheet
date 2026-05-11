---
wave: 1
depends_on: []
files_modified:
  - "app/(auth)/login/page.tsx"
  - "app/(app)/new-order/page.tsx"
  - "app/(app)/layout.tsx"
  - "app/api/auth/[...nextauth]/route.ts"
  - "app/api/orders/route.ts"
  - "lib/auth.ts"
  - "lib/db.ts"
  - "lib/models/Order.ts"
  - "lib/models/User.ts"
  - "scripts/seed-users.ts"
  - ".env.example"
  - "README.md"
autonomous: true
---

<phase_goal>
Authorized PO entry is live: 4 users can log in and create an order (PO number, customer, product, bottles). Each saved record includes who created it and when, stored in MongoDB.
</phase_goal>

<assumptions>
- We will implement as a single Next.js app (UI + API routes).
- Authentication is username/password with hashed passwords stored in MongoDB.
- Initial 4 users are created via a seed script (no admin UI in Phase 1).
</assumptions>

<must_haves>
- [ ] Login required to access the PO entry page.
- [ ] Only authorized users can create orders.
- [ ] Order form captures: PO number, customer name, product name, number of bottles.
- [ ] Validation: all required; bottles is integer >= 1.
- [ ] MongoDB persists orders with createdBy (user id + display name) and createdAt timestamp.
- [ ] Friendly UI: one-screen form, clear errors, success confirmation, “create another” flow.
</must_haves>

<tasks>
  <task id="T1" title="Scaffold Next.js app with env + MongoDB connection">
    <steps>
      <step>Create a Next.js (App Router) project structure if none exists.</step>
      <step>Add MongoDB connection helper (`lib/db.ts`) using `MONGODB_URI`.</step>
      <step>Add `.env.example` containing `MONGODB_URI`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`.</step>
      <step>Add minimal `README.md` with local run instructions.</step>
    </steps>
    <verification>
      <check>`npm run dev` starts successfully.</check>
      <check>App loads at `/` (even if placeholder).</check>
    </verification>
  </task>

  <task id="T2" title="Implement users + seed the 4 authorized PO creators">
    <steps>
      <step>Create `User` model (name, username, passwordHash, role, active, createdAt).</step>
      <step>Add `scripts/seed-users.ts` to create/update exactly 4 users from env variables (or a simple inline array for now).</step>
      <step>Use bcrypt (or argon2) to hash passwords.</step>
    </steps>
    <verification>
      <check>Running the seed script creates 4 active users in MongoDB.</check>
      <check>Passwords are stored hashed (not plaintext).</check>
    </verification>
  </task>

  <task id="T3" title="Add authentication (username/password) + protected app area">
    <steps>
      <step>Configure Auth.js/NextAuth credentials provider backed by MongoDB users.</step>
      <step>Create login page at `/(auth)/login` with friendly error states.</step>
      <step>Protect PO entry route so unauthenticated users are redirected to login.</step>
      <step>Show current user name in app header + logout button.</step>
    </steps>
    <verification>
      <check>Invalid credentials are rejected with clear message.</check>
      <check>Valid user can log in and reach PO entry page.</check>
      <check>Directly opening PO entry URL while logged out redirects to login.</check>
    </verification>
  </task>

  <task id="T4" title="Create order model + API route to create orders with attribution">
    <steps>
      <step>Create `Order` model with fields: poNumber, customerName, productName, bottles, createdByUserId, createdByName, createdAt.</step>
      <step>Create `POST /api/orders` that requires session auth.</step>
      <step>Validate server-side (required fields, bottles integer >= 1).</step>
      <step>Persist to MongoDB and return created order id.</step>
    </steps>
    <verification>
      <check>POST while unauthenticated returns 401.</check>
      <check>POST with bad payload returns 400 with field errors.</check>
      <check>POST with valid payload stores an order including createdBy + createdAt.</check>
    </verification>
  </task>

  <task id="T5" title="Build the user-friendly PO entry screen">
    <steps>
      <step>Create a simple “New Order” page with 4 inputs + primary submit button.</step>
      <step>Inline validation + clear field-level errors.</step>
      <step>On success, show confirmation and a “Create another” button that resets the form.</step>
      <step>Optional: auto-focus next field on Enter to speed up data entry.</step>
    </steps>
    <verification>
      <check>Logged-in user can create an order from UI.</check>
      <check>Errors are readable and don’t require refreshing.</check>
    </verification>
  </task>
</tasks>

<definition_of_done>
- Phase 1 app can be deployed and used via a URL.
- Only the 4 seeded users can log in.
- Orders created are stored in MongoDB with creator attribution and timestamps.
</definition_of_done>

