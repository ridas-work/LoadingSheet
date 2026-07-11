/** Calendar date helpers — store/display deadline dates without timezone drift. */

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Display format used across the app: DD/MM/YYYY */
export function formatDisplayDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

/** Date + time: DD/MM/YYYY HH:MM (24h) */
export function formatDisplayDateTime(value: Date | string | null | undefined): string {
  if (!value) return "";
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return `${formatDisplayDate(dt)} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
}

/** Parse `YYYY-MM-DD` as UTC midnight (date-only, no timezone shift). */
export function parseDateOnlyToUtc(value: string): Date | null {
  const m = value.trim().match(DATE_ONLY_RE);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isInteger(y) || !Number.isInteger(mo) || !Number.isInteger(d)) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return dt;
}

export function formatDateOnlyDisplay(value: Date | string | null | undefined): string {
  if (!value) return "";
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return `${pad2(dt.getUTCDate())}/${pad2(dt.getUTCMonth() + 1)}/${dt.getUTCFullYear()}`;
}

/** Value for `<input type="date" />`. */
export function dateOnlyInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDeadlineFromBody(bodyValue: unknown): Date | null {
  if (typeof bodyValue !== "string" || !bodyValue.trim()) return null;
  return parseDateOnlyToUtc(bodyValue.trim());
}
