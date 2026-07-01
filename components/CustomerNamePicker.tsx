"use client";

import { useEffect, useMemo, useState } from "react";

type CustomerEntry = { code: string; name: string };

type Props = {
  id?: string;
  value: string;
  onChange: (name: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  error?: string;
  disabled?: boolean;
  className?: string;
};

export function CustomerNamePicker({
  id = "customerName",
  value,
  onChange,
  onKeyDown,
  inputRef,
  error,
  disabled = false,
  className = "",
}: Props) {
  const [customers, setCustomers] = useState<CustomerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pick, setPick] = useState("");
  const [typedName, setTypedName] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/customers", { credentials: "same-origin" });
        const data = (await res.json()) as { customers?: CustomerEntry[] };
        if (!cancelled) {
          setCustomers(Array.isArray(data.customers) ? data.customers : []);
        }
      } catch {
        if (!cancelled) setCustomers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const nameByCode = useMemo(() => new Map(customers.map((c) => [c.code, c.name])), [customers]);

  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      setPick("");
      setTypedName("");
      return;
    }
    const match = customers.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (match) {
      setPick(match.code);
      setTypedName("");
    } else {
      setPick("__other__");
      setTypedName(trimmed);
    }
  }, [value, customers]);

  async function saveNewCustomer(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const exists = customers.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) return;

    const res = await fetch("/api/customers", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!res.ok) return;

    const data = (await res.json()) as { customer?: CustomerEntry };
    if (!data.customer) return;

    setCustomers((prev) => {
      const existsCode = prev.some((c) => c.code === data.customer!.code);
      if (existsCode) return prev;
      return [...prev, data.customer!].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  function selectCustomer(code: string) {
    setPick(code);
    if (code === "__other__") {
      setTypedName(value.trim());
      return;
    }
    if (code === "") {
      onChange("");
      setTypedName("");
      return;
    }
    const name = nameByCode.get(code) ?? "";
    onChange(name);
    setTypedName("");
  }

  async function applyTypedName() {
    const trimmed = typedName.trim();
    if (!trimmed) {
      onChange("");
      return;
    }
    await saveNewCustomer(trimmed);
    onChange(trimmed);
    const match = customers.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (match) setPick(match.code);
  }

  const showOtherInput = pick === "__other__";

  return (
    <div className={className}>
      <select
        id={`${id}-pick`}
        disabled={disabled || loading}
        value={pick}
        onChange={(e) => selectCustomer(e.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
      >
        <option value="">{loading ? "Loading customers…" : "Select customer…"}</option>
        {customers.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
        <option value="__other__">Other — type new customer name…</option>
      </select>

      {showOtherInput ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            id={id}
            ref={inputRef}
            value={typedName}
            disabled={disabled}
            onChange={(e) => {
              setTypedName(e.target.value);
              onChange(e.target.value);
            }}
            onBlur={() => {
              void applyTypedName();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void applyTypedName();
                onKeyDown?.(e);
                return;
              }
              onKeyDown?.(e);
            }}
            placeholder="Type new customer name"
            className="min-w-[12rem] flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
          <button
            type="button"
            disabled={disabled || !typedName.trim()}
            onClick={() => void applyTypedName()}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
      ) : null}

      {error ? <div className="mt-1 text-sm text-red-700">{error}</div> : null}
    </div>
  );
}
