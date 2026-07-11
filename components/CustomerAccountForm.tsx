"use client";

import { useMemo, useState } from "react";

import type { ContractStatus, TaxStatus } from "@/lib/customerAccount";
import { ui } from "@/lib/ui";

type FieldErrors = Record<string, string>;

type ContactRow = {
  id: string;
  contactPerson: string;
  designation: string;
  phone: string;
  email: string;
};

const EMPTY_COMPANY = {
  companyName: "",
  taxStatus: "non_filer" as TaxStatus,
  ntn: "",
  strn: "",
  contractStatus: "non_contract" as ContractStatus,
  contractDescription: "",
  address: "",
  city: "",
  notes: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function newContactRow(): ContactRow {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    contactPerson: "",
    designation: "",
    phone: "",
    email: "",
  };
}

export function CustomerAccountForm({ onSaved }: { onSaved?: (companyName: string) => void }) {
  const [form, setForm] = useState({ ...EMPTY_COMPANY });
  const [contacts, setContacts] = useState<ContactRow[]>([newContactRow()]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const isFiler = form.taxStatus === "filer";
  const isContract = form.contractStatus === "contract";

  function set<K extends keyof typeof EMPTY_COMPANY>(key: K, value: (typeof EMPTY_COMPANY)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  function updateContact(id: string, patch: Partial<Omit<ContactRow, "id">>) {
    setContacts((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (key.startsWith("contacts.")) delete next[key];
      }
      if (next.contacts) delete next.contacts;
      return next;
    });
  }

  function addContact() {
    setContacts((prev) => [...prev, newContactRow()]);
  }

  function removeContact(id: string) {
    setContacts((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.id !== id)));
  }

  const clientErrors = useMemo<FieldErrors>(() => {
    const e: FieldErrors = {};
    if (!form.companyName.trim()) e.companyName = "Company name is required.";
    if (isFiler) {
      if (!form.ntn.trim()) e.ntn = "NTN is required for a filer.";
      if (!form.strn.trim()) e.strn = "STRN is required for a filer.";
    }
    if (isContract && !form.contractDescription.trim()) {
      e.contractDescription = "Describe the contract.";
    }
    if (!form.address.trim()) e.address = "Address is required.";

    let hasContact = false;
    contacts.forEach((row, index) => {
      const hasAny =
        row.contactPerson.trim() ||
        row.designation.trim() ||
        row.phone.trim() ||
        row.email.trim();
      if (!hasAny) return;
      hasContact = true;
      if (!row.contactPerson.trim()) {
        e[`contacts.${index}.contactPerson`] = "Contact person is required.";
      }
      if (!row.phone.trim()) {
        e[`contacts.${index}.phone`] = "Phone number is required.";
      }
      if (row.email.trim() && !EMAIL_RE.test(row.email.trim())) {
        e[`contacts.${index}.email`] = "Enter a valid email.";
      }
    });
    if (!hasContact) e.contacts = "Add at least one contact person.";

    return e;
  }, [contacts, form, isFiler, isContract]);

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError("");
    setSuccess("");

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setError("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        contacts: contacts
          .map(({ contactPerson, designation, phone, email }) => ({
            contactPerson: contactPerson.trim(),
            designation: designation.trim(),
            phone: phone.trim(),
            email: email.trim(),
          }))
          .filter(
            (row) => row.contactPerson || row.designation || row.phone || row.email,
          ),
      };

      const res = await fetch("/api/customer-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fields?: FieldErrors;
        account?: { companyName?: string };
        message?: string;
      };
      if (!res.ok) {
        if (data.fields) setFieldErrors(data.fields);
        setError(data.error ?? "Failed to save the account.");
        return;
      }
      const savedName = data.account?.companyName ?? form.companyName;
      setSuccess(
        data.message ??
          `Account for “${savedName}” saved and added to the customer directory.`,
      );
      setForm({ ...EMPTY_COMPANY });
      setContacts([newContactRow()]);
      setFieldErrors({});
      onSaved?.(savedName);
    } catch {
      setError("Network error while saving the account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? <div className={ui.alertDanger}>{error}</div> : null}
      {success ? <div className={ui.alertSuccess}>{success}</div> : null}

      <section className={ui.cardPadded}>
        <h2 className="mb-4 text-base font-semibold text-slate-800">Company</h2>
        <div className="space-y-4">
          <Field label="Company name" error={fieldErrors.companyName} required>
            <input
              className={ui.input}
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              placeholder="Registered / trading name"
            />
          </Field>

          <div>
            <span className={ui.label}>Tax status</span>
            <div className="mt-1 flex flex-wrap gap-4">
              <Radio
                name="taxStatus"
                checked={form.taxStatus === "filer"}
                onChange={() => set("taxStatus", "filer")}
                label="Filer"
              />
              <Radio
                name="taxStatus"
                checked={form.taxStatus === "non_filer"}
                onChange={() => set("taxStatus", "non_filer")}
                label="Non-filer"
              />
            </div>
          </div>

          {isFiler ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="NTN" error={fieldErrors.ntn} required>
                <input
                  className={ui.input}
                  value={form.ntn}
                  onChange={(e) => set("ntn", e.target.value)}
                />
              </Field>
              <Field label="STRN" error={fieldErrors.strn} required>
                <input
                  className={ui.input}
                  value={form.strn}
                  onChange={(e) => set("strn", e.target.value)}
                />
              </Field>
            </div>
          ) : null}

          <div>
            <span className={ui.label}>Contract</span>
            <div className="mt-1 flex flex-wrap gap-4">
              <Radio
                name="contractStatus"
                checked={form.contractStatus === "contract"}
                onChange={() => set("contractStatus", "contract")}
                label="On contract"
              />
              <Radio
                name="contractStatus"
                checked={form.contractStatus === "non_contract"}
                onChange={() => set("contractStatus", "non_contract")}
                label="No contract"
              />
            </div>
          </div>

          {isContract ? (
            <Field label="Contract description" error={fieldErrors.contractDescription} required>
              <textarea
                className={ui.input}
                rows={3}
                value={form.contractDescription}
                onChange={(e) => set("contractDescription", e.target.value)}
                placeholder="What does the contract cover?"
              />
            </Field>
          ) : null}
        </div>
      </section>

      <section className={ui.cardPadded}>
        <h2 className="mb-4 text-base font-semibold text-slate-800">Address &amp; contact</h2>
        <div className="space-y-4">
          <Field label="Address" error={fieldErrors.address} required>
            <textarea
              className={ui.input}
              rows={2}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>
          <Field label="City" error={fieldErrors.city}>
            <input
              className={ui.input}
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </Field>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium text-slate-800">Contact people</h3>
                <p className="text-xs text-slate-500">
                  Add everyone you deal with at this company — different names, designations, and
                  phone numbers.
                </p>
              </div>
              <button type="button" onClick={addContact} className={ui.btnSecondarySm}>
                + Add contact
              </button>
            </div>
            {fieldErrors.contacts ? (
              <p className="text-xs font-medium text-rose-600">{fieldErrors.contacts}</p>
            ) : null}

            {contacts.map((row, index) => (
              <div
                key={row.id}
                className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Contact {index + 1}
                  </span>
                  {contacts.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeContact(row.id)}
                      className={ui.btnGhost}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Contact person"
                    error={fieldErrors[`contacts.${index}.contactPerson`]}
                    required
                  >
                    <input
                      className={ui.input}
                      value={row.contactPerson}
                      onChange={(e) => updateContact(row.id, { contactPerson: e.target.value })}
                    />
                  </Field>
                  <Field label="Designation" error={fieldErrors[`contacts.${index}.designation`]}>
                    <input
                      className={ui.input}
                      value={row.designation}
                      onChange={(e) => updateContact(row.id, { designation: e.target.value })}
                      placeholder="e.g. Purchase manager"
                    />
                  </Field>
                  <Field
                    label="Phone number"
                    error={fieldErrors[`contacts.${index}.phone`]}
                    required
                  >
                    <input
                      className={ui.input}
                      value={row.phone}
                      onChange={(e) => updateContact(row.id, { phone: e.target.value })}
                    />
                  </Field>
                  <Field label="Email" error={fieldErrors[`contacts.${index}.email`]}>
                    <input
                      className={ui.input}
                      type="email"
                      value={row.email}
                      onChange={(e) => updateContact(row.id, { email: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>

          <Field label="Notes" error={fieldErrors.notes}>
            <textarea
              className={ui.input}
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" className={ui.btnPrimary} disabled={saving}>
          {saving ? "Saving…" : "Save customer account"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={ui.label}>
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </span>
      <div className="mt-1">{children}</div>
      {error ? <p className="mt-1 text-xs font-medium text-rose-600">{error}</p> : null}
    </label>
  );
}

function Radio({
  name,
  checked,
  onChange,
  label,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}
