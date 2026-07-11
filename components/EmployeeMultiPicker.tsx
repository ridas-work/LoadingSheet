"use client";

import { useEffect, useId, useRef, useState } from "react";

type Employee = { id: string; name: string };

type Props = {
  employees: Employee[];
  value: string[];
  onChange: (ids: string[]) => void;
  onEmployeeAdded?: (employee: Employee) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  allowAddNew?: boolean;
};

export function EmployeeMultiPicker({
  employees,
  value,
  onChange,
  onEmployeeAdded,
  label,
  placeholder = "Select people…",
  disabled = false,
  error,
  allowAddNew = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const inputId = useId();

  const selectedNames = employees
    .filter((e) => value.includes(e.id))
    .map((e) => e.name);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
    } else {
      onChange([...value, id]);
    }
  }

  async function addNewPerson() {
    const trimmed = newName.trim();
    if (trimmed.length < 2) {
      setAddError("Enter at least 2 characters.");
      return;
    }

    const existing = employees.find((emp) => emp.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (!value.includes(existing.id)) onChange([...value, existing.id]);
      setNewName("");
      setAddError("");
      return;
    }

    setAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/admin/production-employees", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = (await res.json()) as { employee?: Employee; error?: string };
      if (!res.ok || !data.employee) {
        setAddError(data.error ?? "Could not add name.");
        return;
      }
      onEmployeeAdded?.(data.employee);
      if (!value.includes(data.employee.id)) {
        onChange([...value, data.employee.id]);
      }
      setNewName("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      {label ? (
        <span className="mb-1 block text-sm font-medium text-zinc-800">{label}</span>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selectedNames.length ? "text-zinc-900" : "text-zinc-500"}>
          {selectedNames.length ? selectedNames.join(", ") : placeholder}
        </span>
        <span className="text-xs text-zinc-400" aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
        >
          {employees.length === 0 ? (
            <p className="px-3 py-2 text-sm text-zinc-500">No names in list yet.</p>
          ) : (
            employees.map((emp) => {
              const checked = value.includes(emp.id);
              return (
                <label
                  key={emp.id}
                  className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(emp.id)}
                    className="rounded border-zinc-300"
                  />
                  <span className="text-zinc-900">{emp.name}</span>
                </label>
              );
            })
          )}
          {allowAddNew ? (
            <div className="sticky bottom-0 border-t border-zinc-200 bg-white p-2">
              <label htmlFor={inputId} className="sr-only">
                Add new person
              </label>
              <div className="flex gap-2">
                <input
                  id={inputId}
                  type="text"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    setAddError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      void addNewPerson();
                    }
                  }}
                  placeholder="New person name"
                  className="min-w-0 flex-1 rounded border border-zinc-200 px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  disabled={adding}
                  onClick={() => void addNewPerson()}
                  className="shrink-0 rounded bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {adding ? "…" : "Add"}
                </button>
              </div>
              {addError ? <p className="mt-1 text-xs text-red-700">{addError}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="mt-1 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
