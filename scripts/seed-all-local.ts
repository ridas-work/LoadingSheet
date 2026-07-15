/**
 * Full local Mongo seed for testing.
 * Usage: npx tsx scripts/seed-all-local.ts
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const steps = [
  "scripts/seed-users.ts",
  "scripts/seed-product-packings.ts",
  "scripts/seed-packaging-items.ts",
  "scripts/seed-cpl-cpm-packaging.ts",
  "scripts/seed-custom-carton-boxes.ts",
  "scripts/seed-custom-carton-products.ts",
  "scripts/seed-washout-labels.ts",
  "scripts/seed-glim-stickers.ts",
  "scripts/seed-packaging-items-for-screenshot-products.ts",
  "scripts/seed-chemical-materials.ts",
  "scripts/seed-chemical-accessories.ts",
  "scripts/seed-demo-local.ts",
];

function run(script: string) {
  console.log(`\n=== ${script} ===`);
  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["tsx", script],
    {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    },
  );
  if (result.status !== 0) {
    throw new Error(`${script} failed with exit ${result.status}`);
  }
}

async function main() {
  for (const step of steps) {
    run(path.normalize(step));
  }
  console.log("\nAll local seed steps completed.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
