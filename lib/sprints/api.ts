import { getAccessToken, getOrganizationId } from "../auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

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

export type Sprint = {
  id: string;
  _id?: string;
  sprintCode: string;
  name: string;
  projectId: any;
  projectCode?: string;
  projectName?: string;
  milestoneId?: any;
  milestoneName?: string;
  ownerId?: any;
  ownerName?: string;
  status: "Completed" | "In Progress" | "Upcoming" | "Overdue";
  rawStatus: string;
  startDate?: string;
  endDate?: string;
  start?: string;
  end?: string;
  durationDays: number;
  progress: number;
  capacity: number;
  plannedStoryPoints: number;
  completedStoryPoints: number;
  velocity: number;
  priority: "Critical" | "High" | "Medium" | "Low";
  type?: string;
  category?: string;
  businessValue?: string;
  goal?: string;
  description?: string;
  outcomes?: string;
  definitionOfDone?: string;
  tags?: string[];
  sprintColor?: string;
  retrospective?: any;
  review?: any;
  planning?: any;
  updatedAt?: string;
  createdAt?: string;
};

function normalizeSprint(raw: any): Sprint {
  const proj = typeof raw?.projectId === "object" ? raw.projectId : null;
  const ms = typeof raw?.milestoneId === "object" ? raw.milestoneId : null;
  const owner = typeof raw?.ownerId === "object" ? raw.ownerId : null;

  const rawSt = String(raw?.status || "PLANNED").toUpperCase();
  let status: Sprint["status"] = "Upcoming";
  if (rawSt === "COMPLETED" || rawSt === "DONE" || rawSt === "CLOSED") status = "Completed";
  else if (rawSt === "ACTIVE" || rawSt === "IN_PROGRESS" || rawSt === "IN PROGRESS") status = "In Progress";
  else if (rawSt === "OVERDUE" || rawSt === "BLOCKED") status = "Overdue";
  else status = "Upcoming";

  const sDate = raw?.startDate ? new Date(raw.startDate).toISOString().slice(0, 10) : "";
  const eDate = raw?.endDate ? new Date(raw.endDate).toISOString().slice(0, 10) : "";

  return {
    id: raw?._id || raw?.id || raw?.sprintCode,
    _id: raw?._id || raw?.id,
    sprintCode: raw?.sprintCode || raw?.code || "SPR-0001",
    name: raw?.name || "Sprint",
    projectId: raw?.projectId,
    projectCode: proj?.projectCode || (typeof raw?.projectId === "string" ? raw.projectId : "PRJ"),
    projectName: proj?.projectName || "General Project",
    milestoneId: raw?.milestoneId,
    milestoneName: ms?.name || ms?.title || "Not Linked",
    ownerId: raw?.ownerId,
    ownerName: owner?.displayName || owner?.name || raw?.ownerName || "Unassigned",
    status,
    rawStatus: rawSt,
    startDate: sDate,
    endDate: eDate,
    start: sDate ? new Date(`${sDate}T00:00:00`).toLocaleDateString("en-IN") : "—",
    end: eDate ? new Date(`${eDate}T00:00:00`).toLocaleDateString("en-IN") : "—",
    durationDays: Number(raw?.durationDays) || 14,
    progress: Number(raw?.progress) || (status === "Completed" ? 100 : 0),
    capacity: Number(raw?.capacity) || 40,
    plannedStoryPoints: Number(raw?.plannedStoryPoints) || 0,
    completedStoryPoints: Number(raw?.completedStoryPoints) || 0,
    velocity: Number(raw?.velocity) || 0,
    priority: (raw?.priority || "Medium") as any,
    type: raw?.type || "Development",
    category: raw?.category || "Feature Development",
    businessValue: raw?.businessValue || "High",
    goal: raw?.goal || "",
    description: raw?.description || "",
    outcomes: raw?.outcomes || "",
    definitionOfDone: raw?.definitionOfDone || "",
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    sprintColor: raw?.sprintColor || "#2563EB",
    retrospective: raw?.retrospective || {},
    review: raw?.review || {},
    planning: raw?.planning || {},
    updatedAt: raw?.updatedAt,
    createdAt: raw?.createdAt,
  };
}

export function isValidObjectId(val: unknown): val is string {
  return typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val);
}

export const sprintApi = {
  async resolve(
    sprintId: string,
    preferredRawStatuses: string[] = ["ACTIVE", "PLANNED", "COMPLETED"]
  ): Promise<{ sprint: Sprint | null; allSprints: Sprint[] }> {
    const { items } = await this.list({ limit: 100 });
    if (!items.length) {
      return { sprint: null, allSprints: [] };
    }

    const normalizedKey = (sprintId || "").trim().toLowerCase();
    if (normalizedKey && normalizedKey !== "current" && normalizedKey !== "latest") {
      const exact = items.find(
        (s) =>
          (s._id && s._id.toLowerCase() === normalizedKey) ||
          (s.id && s.id.toLowerCase() === normalizedKey) ||
          (s.sprintCode && s.sprintCode.toLowerCase() === normalizedKey)
      );
      if (exact) {
        return { sprint: exact, allSprints: items };
      }
    }

    for (const st of preferredRawStatuses) {
      const match = items.find((s) => s.rawStatus === st.toUpperCase());
      if (match) {
        return { sprint: match, allSprints: items };
      }
    }

    return { sprint: items[0], allSprints: items };
  },

  async getNextCode(): Promise<{ nextCode: string; totalSprints: number; sequence: number }> {
    const orgId = getOrganizationId();
    const query = orgId ? `?organizationId=${encodeURIComponent(orgId)}` : "";
    try {
      const res: any = await request<any>(`/sprints/next-code${query}`);
      return res?.data || res || { nextCode: "SPR-0001", totalSprints: 0, sequence: 1 };
    } catch {
      return { nextCode: "SPR-0001", totalSprints: 0, sequence: 1 };
    }
  },

  async list(params: Record<string, any> = {}): Promise<{ items: Sprint[]; total: number }> {
    const orgId = getOrganizationId();
    const search = new URLSearchParams();
    if (orgId) search.set("organizationId", orgId);
    search.set("limit", "100");

    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && v !== "all" && v !== "All Projects") {
        search.set(k, String(v));
      }
    });

    const res: any = await request<any>(`/sprints?${search.toString()}`);
    const rawItems = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.items)
      ? res.items
      : Array.isArray(res)
      ? res
      : [];

    const items = rawItems.map(normalizeSprint);
    return {
      items,
      total: res?.pagination?.total ?? items.length,
    };
  },

  async get(id: string): Promise<Sprint> {
    const orgId = getOrganizationId();
    const query = orgId ? `?organizationId=${encodeURIComponent(orgId)}` : "";
    const res: any = await request<any>(`/sprints/${encodeURIComponent(id)}${query}`);
    const data = res?.data ?? res;
    return normalizeSprint(data);
  },

  async create(input: any): Promise<Sprint> {
    const orgId = getOrganizationId();
    const payload = {
      ...(orgId ? { organizationId: orgId } : {}),
      ...input,
    };
    const res: any = await request<any>("/sprints", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const created = res?.data ?? res;
    return normalizeSprint(created);
  },

  async update(id: string, input: any): Promise<Sprint> {
    const orgId = getOrganizationId();
    const payload = {
      ...(orgId ? { organizationId: orgId } : {}),
      ...input,
    };
    const res: any = await request<any>(`/sprints/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const updated = res?.data ?? res;
    return normalizeSprint(updated);
  },

  async updateStatus(id: string, status: string): Promise<any> {
    const orgId = getOrganizationId();
    const payload = {
      ...(orgId ? { organizationId: orgId } : {}),
      status,
    };
    return request<any>(`/sprints/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async remove(id: string): Promise<void> {
    const orgId = getOrganizationId();
    const query = orgId ? `?organizationId=${encodeURIComponent(orgId)}` : "";
    await request<void>(`/sprints/${encodeURIComponent(id)}${query}`, {
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
