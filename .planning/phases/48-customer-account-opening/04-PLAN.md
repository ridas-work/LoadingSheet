---
wave: 2
depends_on: ["02-PLAN.md"]
gap_closure: false
files_modified:
  - "app/(app)/new-order/page.tsx"
  - "components/FieldVisitDetailForm.tsx"
autonomous: true
---

<phase_goal>
New customers from account opening **automatically appear** in customer pickers when PO reps and field reps create orders/visits.
</phase_goal>

<must_haves>
- [ ] New order page loads `/api/customer-directory` on mount.
- [ ] Customer name field uses datalist/combobox (type or pick existing company).
- [ ] Selecting a customer fills `customerName` and `city` when account has city on file.
- [ ] Field visit customer name field uses same directory datalist (optional city prefill).
</must_haves>

<tasks>
  <task id="T1" title="New order customer picker">
    <step>Fetch directory; add datalist to customer name input (reuse ComboField pattern from DispatchTripForm or inline datalist).</step>
    <step>On select/change, if match by name, set city from directory entry.</step>
  </task>

  <task id="T2" title="Field visit picker">
    <step>Load directory in FieldVisitDetailForm; datalist on customerName input.</step>
  </task>
</tasks>

<verification>
- Open account as account opener → log in as Nouman → new PO customer dropdown lists new company.
- City prefills when picking from directory.
</verification>
