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
  return json as T;
}

export interface AuditEventItem {
  _id: string;
  eventCode?: string;
  actorId?: { _id?: string; name?: string; email?: string; role?: string } | null;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  module?: string;
  resourceType: string;
  resourceId?: string | null;
  outcome: "SUCCESS" | "FAILURE" | "WARNING" | "BLOCKED";
  severity?: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category?: string;
  source?: string;
  description?: string;
  previousValue?: any;
  newValue?: any;
  requestId?: string | null;
  correlationId?: string | null;
  sessionId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  recordHash?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface SecurityAlertItem {
  _id: string;
  alertCode: string;
  eventId?: string | null;
  userName: string;
  ipAddress?: string;
  alertType: string;
  reason?: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskScore: number;
  status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "DISMISSED";
  remediationAction?: string;
  notes?: string;
  createdByName?: string;
  updatedByName?: string;
  createdAt: string;
}

export const auditApi = {
  async summary(days = 30): Promise<any> {
    const res = await apiFetch<any>("/audit/summary", { method: "GET" }, { days });
    return res?.data ?? res;
  },

  async list(params?: Record<string, any>): Promise<{ items: AuditEventItem[]; pagination: any }> {
    const res = await apiFetch<any>("/audit", { method: "GET" }, { limit: 25, ...params });
    const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    const pagination = res?.meta || res?.pagination || { page: 1, limit: 25, total: items.length, pages: 1 };
    return { items, pagination };
  },

  async detail(id: string): Promise<{ event: AuditEventItem; related: any; navigation: any }> {
    const res = await apiFetch<any>(`/audit/${id}`, { method: "GET" });
    return res?.data ?? res;
  },

  async security(params?: Record<string, any>): Promise<any> {
    const res = await apiFetch<any>("/audit/security", { method: "GET" }, params);
    return res?.data ?? res;
  },

  async createAlert(payload: Record<string, any>): Promise<SecurityAlertItem> {
    const res = await apiFetch<any>("/audit/security/alerts", { method: "POST", body: JSON.stringify(payload) });
    return res?.data ?? res;
  },

  async updateAlert(alertId: string, payload: Record<string, any>): Promise<SecurityAlertItem> {
    const res = await apiFetch<any>(`/audit/security/alerts/${alertId}`, { method: "PATCH", body: JSON.stringify(payload) });
    return res?.data ?? res;
  },

  async getPolicy(): Promise<{ policy: any; totalImmutableRecords: number }> {
    const res = await apiFetch<any>("/audit/policy", { method: "GET" });
    return res?.data ?? res;
  },

  async updatePolicy(payload: Record<string, any>): Promise<any> {
    const res = await apiFetch<any>("/audit/policy", { method: "PATCH", body: JSON.stringify(payload) });
    return res?.data ?? res;
  },

  async recordExport(format: string, rowCount: number): Promise<void> {
    await apiFetch("/audit/record-export", {
      method: "POST",
      body: JSON.stringify({ format, rowCount }),
    }).catch(() => {});
  },
};

export function actorDisplay(ev: AuditEventItem): string {
  return ev.actorId?.name || ev.actorName || ev.actorId?.email || ev.actorEmail || "System";
}

export function formatDateTime(d?: string | Date | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function severityBadgeClass(sev?: string): string {
  switch (String(sev || "").toUpperCase()) {
    case "CRITICAL":
    case "HIGH":
      return "aud-badge aud-badge-red";
    case "MEDIUM":
      return "aud-badge aud-badge-amber";
    case "LOW":
      return "aud-badge aud-badge-blue";
    default:
      return "aud-badge aud-badge-slate";
  }
}

export function outcomeBadgeClass(out?: string): string {
  switch (String(out || "").toUpperCase()) {
    case "SUCCESS":
      return "aud-badge aud-badge-green";
    case "FAILURE":
    case "BLOCKED":
      return "aud-badge aud-badge-red";
    case "WARNING":
      return "aud-badge aud-badge-amber";
    default:
      return "aud-badge aud-badge-slate";
  }
}

export function exportAuditCsv(events: AuditEventItem[], fileName = "audit-logs") {
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const headers = ["Event Code", "Date & Time", "Actor", "Action", "Module", "Resource", "Outcome", "Severity", "IP Address", "Description", "SHA256 Hash"];
  const rows = events.map((ev) => [
    ev.eventCode || ev._id,
    formatDateTime(ev.createdAt),
    actorDisplay(ev),
    ev.action,
    ev.module || ev.resourceType,
    `${ev.resourceType}${ev.resourceId ? `:${ev.resourceId}` : ""}`,
    ev.outcome,
    ev.severity || "INFO",
    ev.ipAddress || "",
    ev.description || "",
    ev.recordHash || "",
  ]);
  const csv = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  auditApi.recordExport("CSV", rows.length);
}

export function exportAuditJson(events: AuditEventItem[], fileName = "audit-logs") {
  const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  auditApi.recordExport("JSON", events.length);
}
