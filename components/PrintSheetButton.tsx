"use client";

type Props = {
  onBeforePrint?: () => void;
};

export function PrintSheetButton({ onBeforePrint }: Props) {
  return (
    <button
      type="button"
      onClick={() => {
        onBeforePrint?.();
        window.print();
      }}
      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white print:hidden"
    >
      Print loading sheet
    </button>
  );
}
