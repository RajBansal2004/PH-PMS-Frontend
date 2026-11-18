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

  const res = await fetch(url.toString(), { ...options, headers, cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || json?.error || `Request failed (${res.status})`);
  return (json?.data !== undefined ? json.data : json) as T;
}

export const MASTER_DATA_CATEGORIES = [
  { code: "PROJECT_STATUS", label: "Project Statuses" },
  { code: "PRIORITY", label: "Priorities" },
  { code: "TASK_TYPE", label: "Task Types" },
  { code: "REQUIREMENT_TYPE", label: "Requirement Types" },
  { code: "WORK_TYPE", label: "Work Types" },
  { code: "BUG_SEVERITY", label: "Bug Severities" },
  { code: "BUG_PRIORITY", label: "Bug Priorities" },
  { code: "TECHNOLOGY", label: "Technologies" },
  { code: "LEAVE_TYPE", label: "Leave Types" },
  { code: "BILLING_TYPE", label: "Billing Types" },
  { code: "LOCATION", label: "Locations" },
  { code: "CURRENCY", label: "Currencies" },
] as const;

export const settingsApi = {
  // ADM-001
  getGeneral: () => apiFetch("/settings/general"),
  updateGeneral: (payload: Record<string, any>) =>
    apiFetch("/settings/general", { method: "PATCH", body: JSON.stringify(payload) }),
  runBackup: () => apiFetch("/settings/general/backup", { method: "POST" }),
  resetGeneral: () => apiFetch("/settings/general/reset", { method: "POST" }),

  // ADM-002
  listWorkflows: (params?: Record<string, any>) => apiFetch<any[]>("/settings/workflows", { method: "GET" }, params),
  createWorkflow: (payload: Record<string, any>) =>
    apiFetch("/settings/workflows", { method: "POST", body: JSON.stringify(payload) }),
  updateWorkflow: (id: string, payload: Record<string, any>) =>
    apiFetch(`/settings/workflows/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteWorkflow: (id: string) => apiFetch(`/settings/workflows/${id}`, { method: "DELETE" }),

  // ADM-003
  listMasterData: (params?: Record<string, any>) => apiFetch<any[]>("/settings/master-data", { method: "GET" }, params),
  createMasterData: (payload: Record<string, any>) =>
    apiFetch("/settings/master-data", { method: "POST", body: JSON.stringify(payload) }),
  updateMasterData: (id: string, payload: Record<string, any>) =>
    apiFetch(`/settings/master-data/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteMasterData: (id: string) => apiFetch(`/settings/master-data/${id}`, { method: "DELETE" }),

  // ADM-004
  health: () => apiFetch("/settings/health"),

  // ADM-005
  listFlags: (params?: Record<string, any>) => apiFetch<any[]>("/settings/feature-flags", { method: "GET" }, params),
  createFlag: (payload: Record<string, any>) =>
    apiFetch("/settings/feature-flags", { method: "POST", body: JSON.stringify(payload) }),
  updateFlag: (id: string, payload: Record<string, any>) =>
    apiFetch(`/settings/feature-flags/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteFlag: (id: string) => apiFetch(`/settings/feature-flags/${id}`, { method: "DELETE" }),
};

export function formatDateTime(d?: string | Date | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatUptime(sec?: number): string {
  const s = Number(sec) || 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m ${s % 60}s`;
}
