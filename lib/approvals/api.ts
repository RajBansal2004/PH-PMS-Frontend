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

export const APPROVAL_ENTITY_TYPES = [
  "BRD",
  "PROJECT",
  "RESOURCE",
  "TIMESHEET",
  "CHANGE_REQUEST",
  "DOCUMENT",
  "DEPLOYMENT",
  "INVOICE",
  "EXPENSE",
  "LEAVE",
  "PROCUREMENT",
] as const;

export const APPROVAL_ROLES = [
  "PROJECT_MANAGER",
  "TEAM_LEAD",
  "VP",
  "MD",
  "CXO",
  "ACCOUNTS",
  "BDA",
  "HIERARCHY",
] as const;

export const approvalsApi = {
  summary: () => apiFetch("/approvals/summary"),
  list: async (params?: Record<string, any>): Promise<any[]> => {
    const data = await apiFetch<any>("/approvals", { method: "GET" }, { limit: 100, ...params });
    return Array.isArray(data) ? data : data?.items || [];
  },
  get: (id: string) => apiFetch(`/approvals/${id}`),
  create: (payload: Record<string, any>) =>
    apiFetch("/approvals", { method: "POST", body: JSON.stringify(payload) }),
  decide: (id: string, payload: { decision: string; comments?: string; delegatedToId?: string; delegatedToName?: string }) =>
    apiFetch(`/approvals/${id}/decide`, { method: "POST", body: JSON.stringify(payload) }),
  addComment: (id: string, text: string) =>
    apiFetch(`/approvals/${id}/comments`, { method: "POST", body: JSON.stringify({ text }) }),

  // Rules
  listRules: () => apiFetch<any[]>("/approvals/rules"),
  createRule: (payload: Record<string, any>) =>
    apiFetch("/approvals/rules", { method: "POST", body: JSON.stringify(payload) }),
  updateRule: (ruleId: string, payload: Record<string, any>) =>
    apiFetch(`/approvals/rules/${ruleId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteRule: (ruleId: string) => apiFetch(`/approvals/rules/${ruleId}`, { method: "DELETE" }),

  // Delegations & Escalations
  listDelegations: (params?: Record<string, any>) =>
    apiFetch<any[]>("/approvals/delegations", { method: "GET" }, params),
  createDelegation: (payload: Record<string, any>) =>
    apiFetch("/approvals/delegations", { method: "POST", body: JSON.stringify(payload) }),
  updateDelegation: (delId: string, payload: Record<string, any>) =>
    apiFetch(`/approvals/delegations/${delId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteDelegation: (delId: string) => apiFetch(`/approvals/delegations/${delId}`, { method: "DELETE" }),
};

export const approvalLookupApi = {
  async projects(): Promise<{ _id: string; projectName: string }[]> {
    const data = await apiFetch<any>("/projects", { method: "GET" }, { limit: 100 });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map((p: any) => ({ _id: String(p._id || p.id), projectName: p.projectName || p.name || "Project" }));
  },
  async employees(): Promise<{ _id: string; name: string; email?: string }[]> {
    const data = await apiFetch<any>("/employees", { method: "GET" }, { limit: 100 });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map((e: any) => ({
      _id: String(e._id || e.id),
      name: e.displayName || e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.email || "Member",
      email: e.email || "",
    }));
  },
};

export function requesterName(item: any): string {
  return item?.requestedBy?.name || item?.requestedByName || item?.requestedBy?.email || "Requester";
}

export function deciderName(item: any): string {
  return item?.decisionBy?.name || item?.decisionByName || item?.decisionBy?.email || "—";
}

export function projectNameOf(item: any): string {
  return (typeof item?.projectId === "object" && item?.projectId?.projectName) || "Organization";
}

export function formatDateTime(d?: string | Date | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function approvalBadgeClass(st?: string): string {
  switch (String(st || "").toUpperCase()) {
    case "APPROVED":
    case "ACTIVE":
      return "apr-badge apr-badge-green";
    case "REJECTED":
    case "REVOKED":
    case "EXPIRED":
      return "apr-badge apr-badge-red";
    case "PENDING":
    case "ESCALATED":
    case "CHANGES_REQUESTED":
      return "apr-badge apr-badge-amber";
    case "DELEGATED":
    case "SCHEDULED":
      return "apr-badge apr-badge-purple";
    default:
      return "apr-badge apr-badge-slate";
  }
}

export function exportApprovalsCsv(items: any[], fileName = "approvals") {
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const headers = ["Code", "Title", "Type", "Project", "Submitted By", "Priority", "Status", "Decided By", "Date"];
  const rows = items.map((a) => [
    a.entityCode || a._id,
    a.title,
    a.entityType,
    projectNameOf(a),
    requesterName(a),
    a.priority || "MEDIUM",
    a.status,
    deciderName(a),
    formatDateTime(a.decisionAt || a.createdAt),
  ]);
  const csv = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
