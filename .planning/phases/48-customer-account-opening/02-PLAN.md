---
wave: 1
depends_on: []
gap_closure: false
files_modified:
  - "app/api/customer-accounts/route.ts"
  - "app/api/customer-directory/route.ts"
  - "lib/customerDirectoryStore.ts"
autonomous: true
---

<phase_goal>
API to **create/list customer accounts** and expose **customer directory** for PO dropdowns. Saving an account **upserts** the directory entry automatically.
</phase_goal>

<must_haves>
- [ ] `POST /api/customer-accounts` — account opener (or admin) creates account; calls `upsertCustomerDirectory(companyName)`; stores `directoryCode`.
- [ ] `GET /api/customer-accounts` — list for opener (own) / admin (all), sorted newest first.
- [ ] `GET /api/customer-directory` — any role that can create orders or open accounts; returns `{ customers: [{ code, name, city? }] }`.
- [ ] Extend `listCustomerDirectory` or join with latest `CustomerAccount` per code for optional city in picker.
</must_haves>

<tasks>
  <task id="T1" title="customer-accounts API">
    <step>POST: auth `canOpenCustomerAccounts`, validate, upsert directory, create CustomerAccount.</step>
    <step>GET: paginated list with companyName, taxStatus, contactPerson, city, createdAt.</step>
  </task>

  <task id="T2" title="customer-directory API">
    <step>GET `/api/customer-directory` for PO creators + account opener + admin.</step>
    <step>Return active directory names; enrich with city from linked CustomerAccount when present.</step>
  </task>
</tasks>

<verification>
- POST valid account → CustomerDirectory row exists with same company name.
- GET directory returns new customer immediately after create.
</verification>
