"use client";

import { useState } from "react";

import { ChemicalIntakeForm, ChemicalIntakeHistory } from "@/components/ChemicalIntakeForm";

export function ChemicalIntakePanel() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <>
      <ChemicalIntakeForm onSaved={() => setRefreshKey((k) => k + 1)} />
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">Recent intakes</h2>
        <ChemicalIntakeHistory key={refreshKey} />
      </div>
    </>
  );
}
