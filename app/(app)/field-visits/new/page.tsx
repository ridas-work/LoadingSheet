"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CatalogProduct = { name: string; code: string };

export default function NewFieldVisitPage() {
  const router = useRouter();
  const [placeName, setPlaceName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [city, setCity] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Record<string, boolean>>({});
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/products", { credentials: "same-origin" });
        const data = (await res.json()) as { products?: CatalogProduct[] } | CatalogProduct[];
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.products)
            ? data.products
            : [];
        setCatalog(list);
      } catch {
        setCatalog([]);
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      const sampleProducts = catalog
        .filter((p) => selectedProducts[p.code])
        .map((p) => ({ productName: p.name, notes: "" }));

      const res = await fetch("/api/field-visits", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          placeName,
          customerName,
          city,
          contactPhone,
          contactPerson,
          notes,
          sampleProducts,
        }),
      });
      const data = (await res.json()) as {
        ticket?: { id: string };
        errors?: Record<string, string>;
      };
      if (!res.ok) {
        setErrors(data.errors ?? { form: "Could not create visit." });
        return;
      }
      if (data.ticket?.id) {
        router.push(`/field-visits/${data.ticket.id}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-zinc-900">Request sample</h1>
      <p className="mt-1 text-sm text-zinc-600">Starts a new field visit ticket.</p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium text-zinc-800">Place / shop name *</label>
          <input
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          {errors.placeName ? <p className="mt-1 text-sm text-red-700">{errors.placeName}</p> : null}
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-800">Customer name *</label>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          {errors.customerName ? (
            <p className="mt-1 text-sm text-red-700">{errors.customerName}</p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-800">City</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">Contact phone</label>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-800">Contact person</label>
          <input
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-800">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        {catalog.length > 0 ? (
          <div>
            <div className="text-sm font-medium text-zinc-800">Products to sample</div>
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-zinc-100 p-2">
              {catalog.map((p) => (
                <label key={p.code} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!selectedProducts[p.code]}
                    onChange={(e) =>
                      setSelectedProducts((prev) => ({ ...prev, [p.code]: e.target.checked }))
                    }
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
        ) : null}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create ticket"}
          </button>
          <Link
            href="/field-visits"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
