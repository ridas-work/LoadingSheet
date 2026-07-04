---
wave: 1
depends_on: []
gap_closure: false
files_modified:
  - "components/PrintSheetButton.tsx"
  - "components/LoadingSheetBatchEditor.tsx"
autonomous: true
---

<phase_goal>
Show the **real print day and time** on every printed loading sheet, using the actual moment the user clicks **Print loading sheet**.
</phase_goal>

<must_haves>
- [ ] Printed loading sheet includes a visible label such as **Printed:** with day, date, and time.
- [ ] Timestamp updates each time `Print loading sheet` is clicked, not only when the page loads.
- [ ] Timestamp is visible in print output and unobtrusive on screen.
- [ ] Existing order date (`Date:` / `createdDate`) remains unchanged.
- [ ] Browser/native print shortcuts still show a reasonable timestamp if possible.
</must_haves>

<tasks>
  <task id="T1" title="Add print timestamp state">
    <step>In `LoadingSheetBatchEditor`, add local state for `printedAt` initialized to `null` or current time.</step>
    <step>Create a formatter that outputs weekday + date + time in a simple factory-friendly format.</step>
    <step>Render a print-friendly row near the header or bottom of the sheet: `Printed: Friday, 4 July 2026, 10:45 PM`.</step>
    <step>Make sure this does not replace the PO/order `Date:` field at the header.</step>
  </task>

  <task id="T2" title="Set timestamp before printing">
    <step>Change `PrintSheetButton` to accept an optional `onBeforePrint` callback.</step>
    <step>Call `onBeforePrint()` immediately before `window.print()`.</step>
    <step>Pass `onBeforePrint={() => setPrintedAt(new Date())}` from `LoadingSheetBatchEditor`.</step>
  </task>

  <task id="T3" title="Handle browser print shortcut">
    <step>Add a `beforeprint` listener in `LoadingSheetBatchEditor` that sets `printedAt` to `new Date()`.</step>
    <step>Clean up the listener on unmount.</step>
    <step>Do not add server persistence; this is print metadata, not order data.</step>
  </task>
</tasks>

<verification>
- Open any loading sheet and click **Print loading sheet**; print preview shows current day/date/time.
- Close print preview, wait one minute, print again; timestamp updates.
- Existing order date still shows the original created/dispatch date.
- `npm run build` passes.
</verification>
