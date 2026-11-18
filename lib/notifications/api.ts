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

export interface NotificationItem {
  _id: string;
  notifCode?: string;
  type: string;
  source?: string;
  senderName?: string;
  projectId?: any;
  projectName?: string;
  title: string;
  message: string;
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  actionRequired?: boolean;
  actionStatus?: string;
  relatedEntityType?: string;
  relatedEntityCode?: string;
  deepLink?: string;
  channelsDelivered?: string[];
  deliveryAudit?: { _id?: string; channel: string; status: string; attempts?: number; provider?: string; sentAt?: string; error?: string }[];
  comments?: { _id?: string; text: string; byName: string; createdAt: string }[];
  activityLog?: { _id?: string; action: string; byName: string; details?: string; timestamp: string }[];
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationTemplateItem {
  _id: string;
  templateCode: string;
  name: string;
  module: string;
  category: string;
  description?: string;
  channels: string[];
  language: string;
  status: "ACTIVE" | "DRAFT" | "INACTIVE";
  inAppTitle: string;
  inAppMessage: string;
  inAppDeepLink?: string;
  inAppPriority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  emailSubject: string;
  emailBody: string;
  whatsappHeader?: string;
  whatsappBody?: string;
  smsBody?: string;
  variables: string[];
  version?: string;
  updatedByName?: string;
  updatedAt?: string;
}

export const NOTIFICATION_TYPES = [
  "APPROVAL",
  "TASK",
  "MENTION",
  "DOCUMENT",
  "TIMESHEET",
  "PROJECT",
  "QA",
  "SYSTEM",
] as const;

export const notificationsApi = {
  async summary(): Promise<any> {
    return apiFetch("/notifications/summary", { method: "GET" });
  },
  async list(params?: Record<string, any>): Promise<NotificationItem[]> {
    const data = await apiFetch<any>("/notifications", { method: "GET" }, { limit: 100, ...params });
    return Array.isArray(data) ? data : data?.items || [];
  },
  async get(id: string): Promise<NotificationItem> {
    return apiFetch(`/notifications/${id}`, { method: "GET" });
  },
  async create(payload: Record<string, any>): Promise<NotificationItem> {
    return apiFetch("/notifications", { method: "POST", body: JSON.stringify(payload) });
  },
  async markRead(id: string, read = true): Promise<NotificationItem> {
    return apiFetch(`/notifications/${id}/read`, { method: "PATCH", body: JSON.stringify({ read }) });
  },
  async markAllRead(): Promise<{ modifiedCount: number }> {
    return apiFetch("/notifications/mark-all-read", { method: "POST" });
  },
  async performAction(id: string, action: string, comments?: string): Promise<NotificationItem> {
    return apiFetch(`/notifications/${id}/action`, { method: "POST", body: JSON.stringify({ action, comments }) });
  },
  async addComment(id: string, text: string): Promise<NotificationItem> {
    return apiFetch(`/notifications/${id}/comments`, { method: "POST", body: JSON.stringify({ text }) });
  },
  async remove(id: string): Promise<void> {
    await apiFetch(`/notifications/${id}`, { method: "DELETE" });
  },

  // Preferences
  async getPreferences(): Promise<any> {
    return apiFetch("/notifications/preferences", { method: "GET" });
  },
  async updatePreferences(payload: Record<string, any>): Promise<any> {
    return apiFetch("/notifications/preferences", { method: "PATCH", body: JSON.stringify(payload) });
  },
  async sendTest(payload?: Record<string, any>): Promise<any> {
    return apiFetch("/notifications/test", { method: "POST", body: JSON.stringify(payload || {}) });
  },

  // Templates
  async listTemplates(params?: Record<string, any>): Promise<NotificationTemplateItem[]> {
    const data = await apiFetch<any>("/notifications/templates", { method: "GET" }, params);
    return Array.isArray(data) ? data : [];
  },
  async createTemplate(payload: Record<string, any>): Promise<NotificationTemplateItem> {
    return apiFetch("/notifications/templates", { method: "POST", body: JSON.stringify(payload) });
  },
  async updateTemplate(id: string, payload: Record<string, any>): Promise<NotificationTemplateItem> {
    return apiFetch(`/notifications/templates/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  async deleteTemplate(id: string): Promise<void> {
    await apiFetch(`/notifications/templates/${id}`, { method: "DELETE" });
  },
};

export const notifLookupApi = {
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

export function priorityBadgeClass(p?: string): string {
  switch (String(p || "").toUpperCase()) {
    case "URGENT":
    case "HIGH":
      return "not-badge not-badge-red";
    case "MEDIUM":
      return "not-badge not-badge-amber";
    default:
      return "not-badge not-badge-slate";
  }
}
