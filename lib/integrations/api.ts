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

export interface IntegrationAdapterItem {
  id?: string;
  key: string;
  name: string;
  category: string;
  description: string;
  connectionName: string;
  environment: "PRODUCTION" | "STAGING" | "SANDBOX";
  authType: string;
  enabled: boolean;
  status: "CONNECTED" | "DEGRADED" | "NOT_CONNECTED" | "ERROR";
  publicConfig: Record<string, any>;
  syncSettings: {
    autoSync: boolean;
    frequency: string;
    direction: "ONE_WAY_IN" | "ONE_WAY_OUT" | "TWO_WAY";
    entities: string[];
    webhookUrl: string;
  };
  fieldMappings: { _id?: string; externalField: string; pmsField: string }[];
  projectMappings: { _id?: string; externalRef: string; projectId?: string; projectName?: string }[];
  hasSecrets: boolean;
  uptimePct: number;
  avgResponseMs: number;
  lastSyncAt?: string | null;
  lastCheckedAt?: string | null;
  lastErrorCode?: string | null;
  secretRotatedAt?: string | null;
  configFields: { key: string; label: string; placeholder?: string }[];
  secretFields: { key: string; label: string }[];
  updatedByName?: string;
  updatedAt?: string | null;
}

export const integrationsApi = {
  async overview(): Promise<any> {
    return apiFetch("/integrations/overview", { method: "GET" });
  },
  async list(params?: Record<string, any>): Promise<IntegrationAdapterItem[]> {
    const data = await apiFetch<any>("/integrations", { method: "GET" }, params);
    return Array.isArray(data) ? data : [];
  },
  async detail(key: string): Promise<{ integration: IntegrationAdapterItem; syncRuns: any[]; logs: any[] }> {
    return apiFetch(`/integrations/${key}`, { method: "GET" });
  },
  async save(key: string, payload: Record<string, any>): Promise<IntegrationAdapterItem> {
    return apiFetch(`/integrations/${key}`, { method: "PUT", body: JSON.stringify(payload) });
  },
  async check(key: string): Promise<any> {
    return apiFetch(`/integrations/${key}/check`, { method: "POST" });
  },
  async syncNow(key: string, payload?: Record<string, any>): Promise<any> {
    return apiFetch(`/integrations/${key}/sync`, { method: "POST", body: JSON.stringify(payload || {}) });
  },
  async disconnect(key: string): Promise<IntegrationAdapterItem> {
    return apiFetch(`/integrations/${key}/disconnect`, { method: "POST" });
  },
  async syncHistory(params?: Record<string, any>): Promise<any[]> {
    const data = await apiFetch<any>("/integrations/sync-history", { method: "GET" }, params);
    return Array.isArray(data) ? data : [];
  },
  async retrySync(syncId: string): Promise<any> {
    return apiFetch(`/integrations/sync-history/${syncId}/retry`, { method: "POST" });
  },
  async logs(params?: Record<string, any>): Promise<any[]> {
    const data = await apiFetch<any>("/integrations/logs", { method: "GET" }, params);
    return Array.isArray(data) ? data : [];
  },
};

export const intLookupApi = {
  async projects(): Promise<{ _id: string; projectName: string }[]> {
    const data = await apiFetch<any>("/projects", { method: "GET" }, { limit: 100 });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map((p: any) => ({ _id: String(p._id || p.id), projectName: p.projectName || p.name || "Project" }));
  },
};

export function formatDateTime(d?: string | Date | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function intStatusBadgeClass(st?: string): string {
  switch (String(st || "").toUpperCase()) {
    case "CONNECTED":
    case "SUCCESS":
    case "HEALTHY":
      return "int-badge int-badge-green";
    case "DEGRADED":
    case "PARTIAL":
    case "WARN":
      return "int-badge int-badge-amber";
    case "ERROR":
    case "FAILED":
    case "DOWN":
      return "int-badge int-badge-red";
    default:
      return "int-badge int-badge-slate";
  }
}

export function downloadCsv(fileName: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
