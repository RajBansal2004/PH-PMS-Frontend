import type { Milestone } from "./types";
import { getAccessToken, getOrganizationId } from "../auth";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
).replace(/\/+$/, "");

export function normalizeMilestoneRecord(raw: any): Milestone {
  const id = raw?._id || raw?.id || "";
  const proj = raw?.projectId && typeof raw.projectId === "object" ? raw.projectId : null;
  const client = proj?.clientId && typeof proj.clientId === "object" ? proj.clientId : null;
  const owner = raw?.ownerId && typeof raw.ownerId === "object" ? raw.ownerId : null;

  const code = raw?.milestoneCode || raw?.code || `MLS-${String(id).slice(-5).toUpperCase()}`;
  const title = raw?.name || raw?.title || "Milestone";
  const projectName =
    (typeof proj?.projectName === "string" ? proj.projectName : null) ||
    (typeof proj?.name === "string" ? proj.name : null) ||
    (typeof raw?.projectName === "string" ? raw.projectName : null) ||
    "Enterprise Project";

  const clientName =
    (typeof client?.displayName === "string" ? client.displayName : null) ||
    (typeof client?.companyName === "string" ? client.companyName : null) ||
    (typeof client?.legalName === "string" ? client.legalName : null) ||
    (typeof raw?.clientName === "string" ? raw.clientName : null) ||
    "Direct Client";

  const ownerName =
    raw?.ownerName ||
    owner?.displayName ||
    owner?.name ||
    (typeof raw?.owner === "string" ? raw.owner : raw?.owner?.name) ||
    "Project Lead";

  const getInitials = (str: string) => {
    return str
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "PL";
  };

  const rawStatus = String(raw?.status || "Upcoming");
  const status =
    rawStatus.toUpperCase() === "COMPLETED"
      ? "Completed"
      : rawStatus.toUpperCase() === "IN_PROGRESS" || rawStatus.toUpperCase() === "IN PROGRESS"
      ? "In Progress"
      : rawStatus.toUpperCase() === "AT_RISK" || rawStatus.toUpperCase() === "AT RISK"
      ? "At Risk"
      : rawStatus.toUpperCase() === "OVERDUE"
      ? "Overdue"
      : rawStatus.toUpperCase() === "ON_HOLD" || rawStatus.toUpperCase() === "ON HOLD"
      ? "On Hold"
      : rawStatus.toUpperCase() === "CANCELLED"
      ? "Cancelled"
      : "Upcoming";

  const rawPriority = String(raw?.priority || "Medium");
  const priority =
    rawPriority.toUpperCase() === "CRITICAL"
      ? "Critical"
      : rawPriority.toUpperCase() === "HIGH"
      ? "High"
      : rawPriority.toUpperCase() === "LOW"
      ? "Low"
      : "Medium";

  const rawType = String(raw?.type || "Phase");
  const type =
    rawType.toUpperCase() === "PROJECT"
      ? "Project"
      : rawType.toUpperCase() === "SPRINT"
      ? "Sprint"
      : rawType.toUpperCase() === "RELEASE"
      ? "Release"
      : rawType.toUpperCase() === "OPERATIONAL"
      ? "Operational"
      : "Phase";

  const startDate = raw?.startDate || raw?.plannedStart || "2026-04-01";
  const dueDate = raw?.dueDate || raw?.plannedEnd || "2026-06-30";
  const plannedStart = typeof startDate === "string" ? startDate.slice(0, 10) : new Date(startDate).toISOString().slice(0, 10);
  const plannedEnd = typeof dueDate === "string" ? dueDate.slice(0, 10) : new Date(dueDate).toISOString().slice(0, 10);
  const actualEnd = raw?.completedAt ? new Date(raw.completedAt).toISOString().slice(0, 10) : undefined;

  return {
    id: id || code,
    _id: id,
    milestoneCode: code,
    title,
    name: title,
    projectId: proj?._id || raw?.projectId || "",
    projectCode: proj?.projectCode || raw?.projectCode || "",
    projectName,
    clientName,
    type,
    plannedStart,
    plannedEnd,
    actualEnd,
    status,
    progress: Number(raw?.progress) || 0,
    priority,
    weight: Number(raw?.weight) || 10,
    budget: Number(raw?.budget) || 0,
    owner: {
      id: owner?._id || raw?.ownerId || "owner-1",
      name: ownerName,
      initials: getInitials(ownerName),
    },
    description: raw?.description || "",
    businessObjective: raw?.businessObjective || "",
    acceptanceCriteria: raw?.acceptanceCriteria || "",
    businessRules: raw?.businessRules || "",
    dependencies: raw?.dependencies || "",
  };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  const token = getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const orgId = getOrganizationId();
  if (orgId && !headers.has("x-organization-id")) {
    headers.set("x-organization-id", orgId);
  }

  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") || "";
  const body: any = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    const msg = body?.message || `Request failed with status ${response.status}`;
    throw new Error(msg);
  }

  return body as T;
}

export const milestoneApi = {
  async getNextCode(): Promise<{ nextCode: string; totalMilestones: number; sequence: number }> {
    const orgId = getOrganizationId();
    const query = orgId ? `?organizationId=${encodeURIComponent(orgId)}` : "";
    try {
      const res: any = await request<any>(`/milestones/next-code${query}`);
      return res?.data || res || { nextCode: "MLS-00001", totalMilestones: 0, sequence: 1 };
    } catch {
      return { nextCode: "MLS-00001", totalMilestones: 0, sequence: 1 };
    }
  },

  async list(params: Record<string, any> = {}): Promise<{ items: Milestone[]; total: number }> {
    const orgId = getOrganizationId();
    const search = new URLSearchParams();
    if (orgId) search.set("organizationId", orgId);
    search.set("limit", "100");

    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && v !== "all") {
        search.set(k, String(v));
      }
    });

    const res: any = await request<any>(`/milestones?${search.toString()}`);
    const rawItems = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.items)
      ? res.items
      : Array.isArray(res)
      ? res
      : [];

    const items = rawItems.map(normalizeMilestoneRecord);
    return {
      items,
      total: res?.pagination?.total ?? items.length,
    };
  },

  async get(id: string): Promise<Milestone> {
    const orgId = getOrganizationId();
    const query = orgId ? `?organizationId=${encodeURIComponent(orgId)}` : "";
    const res: any = await request<any>(`/milestones/${encodeURIComponent(id)}${query}`);
    const data = res?.data ?? res;
    return normalizeMilestoneRecord(data);
  },

  async create(input: any): Promise<Milestone> {
    const orgId = getOrganizationId();
    const payload = {
      ...(orgId ? { organizationId: orgId } : {}),
      ...input,
    };
    const res: any = await request<any>("/milestones", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const created = res?.data ?? res;
    return normalizeMilestoneRecord(created);
  },

  async update(id: string, input: any): Promise<Milestone> {
    const orgId = getOrganizationId();
    const payload = {
      ...(orgId ? { organizationId: orgId } : {}),
      ...input,
    };
    const res: any = await request<any>(`/milestones/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const updated = res?.data ?? res;
    return normalizeMilestoneRecord(updated);
  },

  async remove(id: string): Promise<void> {
    const orgId = getOrganizationId();
    const query = orgId ? `?organizationId=${encodeURIComponent(orgId)}` : "";
    await request<void>(`/milestones/${encodeURIComponent(id)}${query}`, {
      method: "DELETE",
    });
  },

  async getPersonnel(): Promise<{ id: string; name: string; email?: string }[]> {
    try {
      const orgId = getOrganizationId();
      const [empRes, userRes] = await Promise.allSettled([
        request<any>(`/employees?organizationId=${encodeURIComponent(orgId || "")}&limit=100`),
        request<any>(`/users?organizationId=${encodeURIComponent(orgId || "")}&limit=100`),
      ]);

      const map = new Map<string, { id: string; name: string; email?: string }>();

      if (userRes.status === "fulfilled") {
        const raw = userRes.value?.data || userRes.value?.items || userRes.value || [];
        const list = Array.isArray(raw) ? raw : [];
        list.forEach((u: any) => {
          const name = u.displayName || u.name;
          if (name) {
            map.set(name, { id: u.id || u._id, name, email: u.email });
          }
        });
      }

      if (empRes.status === "fulfilled") {
        const raw = empRes.value?.data || empRes.value?.items || empRes.value || [];
        const list = Array.isArray(raw) ? raw : [];
        list.forEach((e: any) => {
          const name = e.displayName || `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.name;
          if (name && !map.has(name)) {
            map.set(name, { id: e.userId || e._id || e.id, name, email: e.email });
          }
        });
      }

      const result = Array.from(map.values());
      if (result.length > 0) return result;
      return [{ id: "user-admin", name: "PH PMS Admin", email: "admin@pehalhealthcare.com" }];
    } catch {
      return [{ id: "user-admin", name: "PH PMS Admin", email: "admin@pehalhealthcare.com" }];
    }
  },
};
