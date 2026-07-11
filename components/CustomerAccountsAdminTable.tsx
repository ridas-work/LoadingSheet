"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { SerializedCustomerAccount } from "@/lib/customerAccount";
import { formatDisplayDate } from "@/lib/dateOnly";
import { ui } from "@/lib/ui";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return formatDisplayDate(iso);
}

function contactLines(account: SerializedCustomerAccount) {
  return account.contacts.length > 0
    ? account.contacts
    : [
        {
          contactPerson: account.contactPerson,
          designation: account.designation,
          phone: account.phone,
          email: account.email,
        },
      ];
}

function statusBadge(status: SerializedCustomerAccount["approvalStatus"]) {
  switch (status) {
    case "pending":
      return <span className={ui.badgeWarning}>Pending approval</span>;
    case "blocked":
      return <span className={ui.badgeDanger}>Blocked</span>;
    default:
      return <span className={ui.badgeSuccess}>Approved</span>;
  }
}

export function CustomerAccountsAdminTable({
  initialAccounts,
}: {
  initialAccounts: SerializedCustomerAccount[];
}) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function act(id: string, action: "approve" | "block") {
    setActing(id);
    setError("");
    try {
      const res = await fetch(`/api/customer-accounts/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { error?: string; account?: SerializedCustomerAccount };
      if (!res.ok || !data.account) {
        throw new Error(data.error ?? "Action failed");
      }
      setAccounts((prev) => prev.map((row) => (row.id === id ? data.account! : row)));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className={ui.cardVisible}>
        <table className={ui.dataTable}>
          <thead>
            <tr>
              <th>Company</th>
              <th>City</th>
              <th>Contact</th>
              <th>Tax</th>
              <th>Contract</th>
              <th>Status</th>
              <th>Opened by</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td className="font-medium text-slate-800">{a.companyName}</td>
                <td>{a.city || "—"}</td>
                <td>
                  <div className="space-y-2">
                    {contactLines(a).map((contact, index) => (
                      <div key={`${a.id}-${index}`}>
                        <div className="font-medium text-slate-800">
                          {contact.contactPerson || "—"}
                        </div>
                        {contact.designation ? (
                          <div className="text-xs text-slate-500">{contact.designation}</div>
                        ) : null}
                        {contact.phone ? (
                          <div className="text-xs text-slate-500">{contact.phone}</div>
                        ) : null}
                        {contact.email ? (
                          <div className="text-xs text-slate-500">{contact.email}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </td>
                <td>
                  <span className={a.taxStatus === "filer" ? ui.badgeSuccess : ui.badgeNeutral}>
                    {a.taxStatus === "filer" ? "Filer" : "Non-filer"}
                  </span>
                </td>
                <td>
                  <span className={a.contractStatus === "contract" ? ui.badgeBrand : ui.badgeNeutral}>
                    {a.contractStatus === "contract" ? "Contract" : "No contract"}
                  </span>
                </td>
                <td>{statusBadge(a.approvalStatus)}</td>
                <td>{a.createdByName || "—"}</td>
                <td>{fmtDate(a.createdAt)}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {a.approvalStatus === "pending" ? (
                      <button
                        type="button"
                        disabled={acting === a.id}
                        onClick={() => act(a.id, "approve")}
                        className={ui.btnPrimaryXs}
                      >
                        Approve
                      </button>
                    ) : a.approvalStatus === "approved" ? (
                      <button
                        type="button"
                        disabled={acting === a.id}
                        onClick={() => act(a.id, "block")}
                        className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-800 ring-1 ring-red-200 disabled:opacity-50"
                      >
                        Block
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={acting === a.id}
                        onClick={() => act(a.id, "approve")}
                        className={ui.btnSecondarySm}
                      >
                        Unblock
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
