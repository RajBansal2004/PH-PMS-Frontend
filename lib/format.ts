export function money(value: number | string | null | undefined, currency = "INR") {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹ ${n.toLocaleString("en-IN")}`;
  }
}

export function titleCase(value?: string | null) {
  if (!value) return "—";
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export function date(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function employeeName(value: any) {
  if (!value) return "—";
  return typeof value === "string" ? value : value.displayName || value.name || value.email || "—";
}

export function clientName(value: any) {
  if (!value) return "—";
  return typeof value === "string" ? value : value.displayName || value.legalName || "—";
}

export function daysBetween(a?: string, b?: string) {
  if (!a || !b) return null;
  const x = new Date(a).getTime(), y = new Date(b).getTime();
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return Math.ceil((y - x) / 86400000);
}
