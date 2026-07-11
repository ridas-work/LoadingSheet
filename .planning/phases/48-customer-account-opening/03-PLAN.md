---
wave: 2
depends_on: ["01-PLAN.md", "02-PLAN.md"]
gap_closure: false
files_modified:
  - "app/(app)/accounts/open/page.tsx"
  - "app/(app)/accounts/page.tsx"
  - "components/CustomerAccountForm.tsx"
  - "app/(app)/layout.tsx"
autonomous: true
---

<phase_goal>
**Account opener** UI: full form with filer/non-filer and contract/non-contract conditional fields, plus account list.
</phase_goal>

<must_haves>
- [ ] `/accounts/open` — form: company name, tax radios (NTN/STRN if filer), contract radios (description if contract), address, city, contact person, designation, email, phone, notes.
- [ ] Submit → POST customer-accounts; success message + link to open another.
- [ ] `/accounts` — table of opened accounts (company, city, contact, filer/contract badges, date).
- [ ] Nav: account opener sees **Open account** + **Accounts**; admin sees **Customer accounts**.
</must_haves>

<tasks>
  <task id="T1" title="CustomerAccountForm component">
    <step>Client form with conditional field visibility (filer → NTN+STRN; contract → description).</step>
    <step>Client-side validation mirrors server rules; show field errors inline.</step>
  </task>

  <task id="T2" title="Pages + nav">
    <step>`accounts/open/page.tsx` — role guard, render form.</step>
    <step>`accounts/page.tsx` — fetch list API, simple table.</step>
    <step>Update `layout.tsx` nav links for account_opener and admin.</step>
  </task>
</tasks>

<verification>
- Account opener login lands on form; save succeeds.
- Admin can view all accounts list.
</verification>
