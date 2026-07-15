import dotenv from "dotenv";
import path from "node:path";

import {
  CHEMICAL_ACCESSORIES,
  LEGACY_CHEMICAL_ACCESSORY_CODES,
} from "@/lib/chemicalMaterials";
import { resolveOrCreateMaterial } from "@/lib/chemicalStock";
import { connectToDatabase } from "@/lib/db";
import { ChemicalRawMaterial } from "@/lib/models/ChemicalRawMaterial";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false });
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false });

async function main() {
  await connectToDatabase();

  let sortOrder = 100;
  for (const item of CHEMICAL_ACCESSORIES) {
    const { material, created } = await resolveOrCreateMaterial({
      materialCode: item.code,
      materialName: item.name,
      kind: "accessory",
      unit: item.unit,
    });
    await ChemicalRawMaterial.updateOne(
      { code: item.code },
      {
        $set: {
          kind: "accessory",
          unit: item.unit,
          name: item.name,
          active: true,
          sortOrder,
        },
      },
    );
    sortOrder += 1;
    console.log(`${created ? "Created" : "Updated"} ${item.name} (${item.code})`);
  }

  const legacy = await ChemicalRawMaterial.updateMany(
    { code: { $in: [...LEGACY_CHEMICAL_ACCESSORY_CODES] } },
    { $set: { active: false } },
  );
  if (legacy.modifiedCount > 0) {
    console.log(`Deactivated ${legacy.modifiedCount} legacy generic accessory row(s).`);
  }

  await ChemicalRawMaterial.db.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
