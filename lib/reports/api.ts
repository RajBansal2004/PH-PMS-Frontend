import { getAccessToken, getOrganizationId } from "@/lib/auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api/v1";

function isValidObjectId(val: unknown): boolean {
  return typeof val === "string" && /^[a-f\d]{24}$/i.test(val.trim());
}

async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  params?: Record<string, string | number | boolean | undefined | null>
): Promise<T> {
  const token = getAccessToken();
  const orgId = getOrganizationId();

  const url = new URL(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && v !== "ALL") {
        url.searchParams.set(k, String(v));
      }
    });
  }
  if (orgId && isValidObjectId(orgId) && !url.searchParams.has("organizationId")) {
    url.searchParams.set("organizationId", orgId);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url.toString(), {
    ...options,
    headers,
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || json?.error || `Request failed (${res.status})`);
  }
  return (json?.data !== undefined ? json.data : json) as T;
}

export const reportsApi = {
  async overview(): Promise<any> {
    return apiFetch("/reports/overview", { method: "GET" });
  },
  async projectPerformance(params?: Record<string, any>): Promise<any> {
    return apiFetch("/reports/projects", { method: "GET" }, params);
  },
  async resourceUtilization(params?: Record<string, any>): Promise<any> {
    return apiFetch("/reports/resources", { method: "GET" }, params);
  },
  async timesheetProductivity(params?: Record<string, any>): Promise<any> {
    return apiFetch("/reports/timesheets", { method: "GET" }, params);
  },
  async qaDefects(params?: Record<string, any>): Promise<any> {
    return apiFetch("/reports/qa", { method: "GET" }, params);
  },

  // Saved views
  async listSavedViews(): Promise<any[]> {
    const data = await apiFetch<any>("/reports/saved-views", { method: "GET" });
    return Array.isArray(data) ? data : [];
  },
  async createSavedView(payload: Record<string, any>): Promise<any> {
    return apiFetch("/reports/saved-views", { method: "POST", body: JSON.stringify(payload) });
  },
  async toggleFavoriteView(id: string): Promise<any> {
    return apiFetch(`/reports/saved-views/${id}/favorite`, { method: "PATCH" });
  },
  async deleteSavedView(id: string): Promise<void> {
    await apiFetch(`/reports/saved-views/${id}`, { method: "DELETE" });
  },

  // Schedules
  async listSchedules(): Promise<any[]> {
    const data = await apiFetch<any>("/reports/schedules", { method: "GET" });
    return Array.isArray(data) ? data : [];
  },
  async createSchedule(payload: Record<string, any>): Promise<any> {
    return apiFetch("/reports/schedules", { method: "POST", body: JSON.stringify(payload) });
  },
  async toggleSchedule(id: string): Promise<any> {
    return apiFetch(`/reports/schedules/${id}/toggle`, { method: "PATCH" });
  },
  async deleteSchedule(id: string): Promise<void> {
    await apiFetch(`/reports/schedules/${id}`, { method: "DELETE" });
  },

  // Export audit log
  async listExports(): Promise<any[]> {
    const data = await apiFetch<any>("/reports/exports", { method: "GET" });
    return Array.isArray(data) ? data : [];
  },
  async recordExport(payload: {
    reportType: string;
    reportName: string;
    format: "PDF" | "CSV" | "XLSX" | "JSON";
    rowCount: number;
    appliedFilters?: Record<string, any>;
  }): Promise<any> {
    return apiFetch("/reports/exports", { method: "POST", body: JSON.stringify(payload) });
  },
};

export const reportLookupApi = {
  async projects(): Promise<{ _id: string; projectName: string }[]> {
    const data = await apiFetch<any>("/projects", { method: "GET" }, { limit: 100 });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map((p: any) => ({ _id: String(p._id || p.id), projectName: p.projectName || p.name || "Project" }));
  },
  async clients(): Promise<{ _id: string; name: string }[]> {
    const data = await apiFetch<any>("/clients", { method: "GET" }, { limit: 100 });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map((c: any) => ({ _id: String(c._id || c.id), name: c.companyName || c.clientName || c.name || "Client" }));
  },
  async employees(): Promise<{ _id: string; name: string }[]> {
    const data = await apiFetch<any>("/employees", { method: "GET" }, { limit: 100 });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map((e: any) => ({
      _id: String(e._id || e.id),
      name: e.displayName || e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.email || "Member",
    }));
  },
};

export function downloadCsvAndAudit(opts: {
  fileName: string;
  reportType: string;
  reportName: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
  appliedFilters?: Record<string, any>;
}) {
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [opts.headers.map(esc).join(","), ...opts.rows.map((r) => r.map(esc).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${opts.fileName}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  reportsApi
    .recordExport({
      reportType: opts.reportType,
      reportName: opts.reportName,
      format: "CSV",
      rowCount: opts.rows.length,
      appliedFilters: opts.appliedFilters || {},
    })
    .catch(() => {});
}

export function downloadJsonAndAudit(opts: {
  fileName: string;
  reportType: string;
  reportName: string;
  data: any;
  rowCount: number;
  appliedFilters?: Record<string, any>;
}) {
  const blob = new Blob([JSON.stringify(opts.data, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${opts.fileName}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);

  reportsApi
    .recordExport({
      reportType: opts.reportType,
      reportName: opts.reportName,
      format: "JSON",
      rowCount: opts.rowCount,
      appliedFilters: opts.appliedFilters || {},
    })
    .catch(() => {});
}

export function formatShortDate(d?: string | Date | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatCurrencyInr(n?: number): string {
  const v = Number(n) || 0;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

export function reportRouteForType(type?: string): string {
  switch (type) {
    case "RESOURCE_UTILIZATION":
      return "/reports/resources";
    case "TIMESHEET_PRODUCTIVITY":
      return "/reports/timesheets";
    case "QA_DEFECTS":
      return "/reports/qa";
    default:
      return "/reports/projects";
  }
}
