/**
 * Generates docs/LoadingSheet-User-Manual.docx
 * Run: npx tsx scripts/generate-user-manual-docx.ts
 */
import * as fs from "fs";
import * as path from "path";

import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

function h1(text: string) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 120 } });
}

function h2(text: string) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 100 } });
}

function h3(text: string) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 80 } });
}

function p(text: string) {
  return new Paragraph({
    children: [new TextRun({ text })],
    spacing: { after: 120 },
  });
}

function bullet(text: string) {
  return new Paragraph({
    text,
    bullet: { level: 0 },
    spacing: { after: 60 },
  });
}

function numbered(text: string) {
  return new Paragraph({
    text,
    numbering: { reference: "numbered-list", level: 0 },
    spacing: { after: 60 },
  });
}

function table(headers: string[], rows: string[][]) {
  const headerRow = new TableRow({
    children: headers.map(
      (h) =>
        new TableCell({
          width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
        }),
    ),
  });
  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: cell })],
            }),
        ),
      }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "numbered-list",
        levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START }],
      },
    ],
  },
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "Loading Sheet", bold: true, size: 48 }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({ text: "User Manual", size: 32 }),
          ],
        }),
        p(
          "Factory application for purchase orders, production QC, dispatch, and gate delivery. Each staff member logs in with their own username and password and sees only the screens for their role.",
        ),
        p("Document version: 1.0  |  Adjust this file to match your site URL, passwords, and local procedures."),

        h1("1. Logging in"),
        numbered("Open the app in your web browser (your IT team will provide the URL)."),
        numbered("Enter your username and password."),
        numbered("You are taken to your home screen for your role."),
        numbered("Use Log out when you finish on a shared computer."),
        p("There is no public sign-up. Accounts are created by your administrator only."),

        h1("2. Order lifecycle (overview)"),
        p("A typical order flows through these stages:"),
        bullet("PO team creates the customer order (PO)."),
        bullet("QC registers prepared liquid batches with audit details."),
        bullet("Rashid (dispatch) puts POs on a vehicle trip, assigns batches, and enters carton weights."),
        bullet("Zaman (gate) marks the truck out for delivery and later delivered."),
        bullet("The system deducts ready bottle stock and packaging when goods are delivered."),
        p(
          "The loading sheet is the printable document for each PO: products per box, batch numbers, liquid weight (L), carton weight (kg), and vehicle/driver details. Anyone logged in can view and print loading sheets.",
        ),

        h1("3. Roles and responsibilities"),

        h2("3.1 PO team (order entry)"),
        p("Users: Aslam, Ibtisam (and field reps when creating a PO from a won visit)."),
        p("Home screen: New order"),
        bullet("Enter customer name, city, deadline, and bottle counts per product."),
        bullet("Cartons are calculated automatically (e.g. 30 bottles Rhino 500ml = 1 carton)."),
        bullet(
          "Use Add custom carton for partial cartons or several products in one box. Choose outer box size: 5L jar, 1L, 500ml, 250ml, or 100ml.",
        ),
        bullet("Submit the order. PO creators cannot edit an order after submit (boss can)."),
        bullet("Open Orders → View loading sheet to print."),

        h2("3.2 Field representatives"),
        p("Users: Nouman, Javeria."),
        p("Home screen: Field visits (also access to New order)."),
        bullet("Request sample for a customer visit."),
        bullet("Deliver sample — record date and first customer reaction."),
        bullet("After about two weeks — follow-up and customer comments."),
        bullet("Close visit — Create PO (won) or Mark lost."),
        bullet("A won visit can link to a new purchase order."),

        h2("3.3 QC — production batches"),
        p("User: QC production staff."),
        p("Home screen: Production batches"),
        bullet(
          "Add batch: batch number, product, date, total liters, pH, solids, appearance, provider, HCL, quantity (stored for audit).",
        ),
        bullet("Viscosity is optional for Rhino, Brighten, Power Wash, and Hand Sanitizer."),
        bullet("Add product registers a new SKU in the catalog (PO team refreshes New order to see it)."),
        bullet(
          "One batch family can cover related packings (e.g. one Rhino batch for all Rhino bottle sizes).",
        ),
        bullet("Combo bundles need two batch picks per carton on the loading sheet."),
        bullet("Batches in use or empty cannot be edited (audit protection)."),

        h2("3.4 Dispatch — Rashid"),
        p("Home screen: Dispatch trips"),
        h3("Dispatch trips"),
        bullet("Create a vehicle trip with one or more POs."),
        bullet("Enter vehicle, driver, DC number, and footer fields once (synced to all sheets on the trip)."),
        bullet("Assign QC batches per carton from the production pool, or use ready shelf stock where shown."),
        bullet("Use Edit dispatch on the loading sheet when the order is on a trip."),
        h3("Carton weights"),
        bullet("Weigh each carton on a scale before the truck leaves."),
        bullet("Enter Carton wt (kg) on the loading sheet."),
        bullet("Weight must be within ±8% of the factory standard. Wrong weight shows an error — fix before saving."),
        h3("Orders list"),
        bullet("Shows active factory POs only. After gate marks Out for delivery or Delivered, the PO leaves this list."),
        bullet("Use Dispatch trips for history."),
        h3("Daily filling"),
        bullet("Record bottles filled today, ready to deliver, and liquid remaining per batch."),
        bullet("Ready bottle stock: add finished bottles on the floor (batch label + product + bottle count)."),
        bullet("Legacy = batch not in QC system; In QC = linked to a registered production batch."),
        bullet("View movements under ready stock movements."),

        h2("3.5 Packaging inventory — Esha"),
        p("Home screen: Packaging inventory"),
        bullet("Update Purchased and Rejected/Damage quantities per SKU."),
        bullet("Balance = Purchased − Rejected − UIP (Used in Production)."),
        bullet("UIP is updated automatically when Rashid logs filling and when Zaman marks Delivered."),
        bullet("Review Recent stock movements on the inventory page."),

        h2("3.6 Gate — Zaman"),
        p("Home screen: Gate orders"),
        p("Only orders that are ready appear:"),
        bullet("On a dispatch trip with vehicle, driver, and DC filled."),
        bullet("Carton weights verified (±8% vs standard list)."),
        p("Actions:"),
        table(
          ["Action", "When to use"],
          [
            ["Out for delivery", "Truck leaves the factory gate"],
            ["Delivered", "Customer has received the goods — deducts stock"],
            ["Pending redelivery", "Load returns — restores ready bottles"],
          ],
        ),
        new Paragraph({ spacing: { after: 200 } }),

        h2("3.7 Admin / boss — Waleed"),
        p("Home screen: Admin summary"),
        bullet("Summary dashboard of pending orders."),
        bullet("Orders — view all; Edit order to correct customer or line quantities (boss only)."),
        bullet("Delivered orders cannot be edited."),
        bullet("Read-only access: production batches, dispatch trips, packaging, daily filling, field visit scores."),

        h1("4. Key terms"),
        table(
          ["Term", "Meaning"],
          [
            ["Weight (L)", "Liquid liters per carton row — auto-calculated; used for batch pool math"],
            ["Carton wt (kg)", "Physical scale weight entered by dispatch; checked vs standard ±8%"],
            ["Ready shelf", "Finished bottles on the production floor"],
            ["UIP", "Packaging Used in Production — system-managed"],
            ["Loading sheet", "Official printable document for loading the truck"],
          ],
        ),
        new Paragraph({ spacing: { after: 200 } }),

        h1("5. Who can change what"),
        table(
          ["Action", "Who"],
          [
            ["Create PO", "PO team"],
            ["Edit PO after submit", "Boss (admin) only"],
            ["Register QC batches", "QC"],
            ["Assign batches & carton weights", "Dispatch (Rashid)"],
            ["Gate out / delivered", "Gate (Zaman)"],
            ["Packaging purchased / rejected", "Production (Esha)"],
            ["View & print loading sheet", "All logged-in users"],
          ],
        ),
        new Paragraph({ spacing: { after: 200 } }),

        h1("6. Tips"),
        bullet("Refresh New order after QC adds a new product to the catalog."),
        bullet("Complete batch assignment and carton weights before the gate can release the truck."),
        bullet("Delivered orders are locked — no further edits."),
        bullet("Combo and mixed cartons may need more than one batch per box."),
        bullet("Custom cartons use generic outer boxes tracked separately from standard product cartons."),
        bullet("Bottle stickers may show kg; the app tracks liters for batch capacity."),

        h1("7. Login reference (initial passwords — change before production)"),
        p("Replace this table with your own credentials policy. Initial seed passwords:"),
        table(
          ["Person", "Username", "Role", "Initial password"],
          [
            ["Nouman", "nouman", "PO + field visits", "Nouman-Order-01"],
            ["Javeria", "javeria", "PO + field visits", "Javeria-Order-02"],
            ["Aslam", "aslam", "PO team", "Aslam-Order-03"],
            ["Ibtisam", "ibtisam", "PO team", "Ibtisam-Order-04"],
            ["Esha", "esha", "Production + packaging", "Nimra-Batch-01"],
            ["Rashid", "rashid", "Dispatch", "Rashid-Dispatch-01"],
            ["Ramazan", "ramazan", "Chemical materials", "Ramazan-Chemicals-01"],
            ["Zaman", "zaman", "Gate", "Zaman-Guard-01"],
            ["Waleed", "waleed", "Admin", "Waleed-Admin-01"],
          ],
        ),
        new Paragraph({ spacing: { before: 400 } }),
        p("— End of manual —"),
      ],
    },
  ],
});

async function main() {
  const outDir = path.join(process.cwd(), "docs");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "LoadingSheet-User-Manual.docx");
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buffer);
  console.log(`Written: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
