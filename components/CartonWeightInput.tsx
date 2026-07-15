"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  placeholder?: string;
  error?: string | null;
  className?: string;
  onValueChange: (value: string) => void;
};

/**
 * Keeps keystrokes local so parent sheet re-renders (and batch dropdown rebuilds)
 * only flush after blur or a short debounce — avoids freezing large Rashid sheets.
 */
export function CartonWeightInput({
  value,
  placeholder,
  error,
  className,
  onValueChange,
}: Props) {
  const [draft, setDraft] = useState(value);
  const draftRef = useRef(draft);
  const valueRef = useRef(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value !== valueRef.current) {
      valueRef.current = value;
      draftRef.current = value;
      setDraft(value);
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const flush = (next: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (next === valueRef.current) return;
    valueRef.current = next;
    onValueChange(next);
  };

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
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => flush(next), 200);
        }}
        onBlur={() => flush(draftRef.current)}
        className={className}
      />
      {error ? <p className="text-[10px] text-red-700 print:hidden">{error}</p> : null}
    </div>
  );
}
