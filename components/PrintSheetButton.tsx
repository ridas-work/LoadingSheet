"use client";

export function PrintSheetButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white print:hidden"
    >
      Print loading sheet
    </button>
  );
}
