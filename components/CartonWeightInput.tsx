"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { validateCartonWeight } from "@/lib/standardCartonWeight";

type Props = {
  value: string;
  placeholder?: string;
  /** When set, validate draft locally without involving the parent sheet. */
  standardKg?: number | null;
  className?: string;
  errorClassName?: string;
  onValueChange: (value: string) => void;
};

/**
 * Weight typing stays fully local. Parent (and the large batch table) only updates on blur,
 * so backspace/typing never freezes Rashid's multi-PO trip sheet.
 */
export function CartonWeightInput({
  value,
  placeholder,
  standardKg = null,
  className,
  errorClassName,
  onValueChange,
}: Props) {
  const [draft, setDraft] = useState(value);
  const draftRef = useRef(draft);
  const valueRef = useRef(value);

  useEffect(() => {
    if (value !== valueRef.current) {
      valueRef.current = value;
      draftRef.current = value;
      setDraft(value);
    }
  }, [value]);

  const error = useMemo(() => {
    const trimmed = draft.trim();
    if (!trimmed) return null;
    const num = Number(trimmed);
    if (!Number.isFinite(num) || num <= 0) return "Enter a valid weight in kg.";
    if (standardKg == null) return null;
    const check = validateCartonWeight(num, standardKg);
    return check.ok ? null : check.error;
  }, [draft, standardKg]);

  return (
    <div className="space-y-0.5">
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value;
          draftRef.current = next;
          setDraft(next);
        }}
        onBlur={() => {
          const next = draftRef.current;
          if (next === valueRef.current) return;
          valueRef.current = next;
          onValueChange(next);
        }}
        className={error && errorClassName ? errorClassName : className}
      />
      {error ? <p className="text-[10px] text-red-700 print:hidden">{error}</p> : null}
    </div>
  );
}
