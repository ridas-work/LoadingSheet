"use client";

import { useRouter } from "next/navigation";

type Props = {
  value: string;
  max: string;
};

export function DatePickerForm({ value, max }: Props) {
  const router = useRouter();
  return (
    <input
      type="date"
      defaultValue={value}
      max={max}
      onChange={(e) => {
        const next = e.target.value;
        if (next) router.push(`?date=${next}`);
      }}
      className="rounded-lg border border-zinc-200 px-2 py-1 text-sm text-zinc-800"
    />
  );
}
