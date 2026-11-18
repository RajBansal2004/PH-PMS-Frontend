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

export type UiTaskStatus = "To Do" | "In Progress" | "In Review" | "Testing" | "Done";
export type UiTaskPriority = "Critical" | "High" | "Medium" | "Low";

export type NormalizedTask = {
  _id: string;
  id: string;
  taskId: string;
  title: string;
  description: string;
  type: string;
  status: UiTaskStatus;
  rawStatus: string;
  priority: UiTaskPriority;
  rawPriority: string;
  assigneeId: string;
  assignee: string;
  initials: string;
  reporter: string;
  reporterInitials: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  milestoneId: string;
  milestoneName: string;
  sprintId: string;
  sprintCode: string;
  sprintName: string;
  requirementId: string;
  parent: string;
  estimatedHours: number;
  actualHours: number;
  storyPoints: number;
  progress: number;
  startDate: string;
  dueDate: string;
  dueDateLabel: string;
  isOverdue: boolean;
  tags: string[];
  dependencies: string[];
  blockedBy: string[];
  category: string;
  risk: string;
  acceptanceCriteria: string;
  definitionOfDone: string;
  designLink: string;
  apiLink: string;
  comments: any[];
  timeLogs: any[];
  attachments: any[];
  activityLog: any[];
  createdAt?: string;
  updatedAt?: string;
};

export function isValidObjectId(val: unknown): val is string {
  return typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val);
}

export function getInitials(name: string): string {
  const safe = (name || "").trim();
  if (!safe || safe.toLowerCase() === "unassigned") return "NA";
  return (
    safe
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "NA"
  );
}

export function toUiStatus(raw: string): UiTaskStatus {
  const st = String(raw || "TO_DO").toUpperCase().trim();
  if (st === "DONE" || st === "COMPLETED") return "Done";
  if (st === "QA" || st === "UAT" || st === "TESTING") return "Testing";
  if (st === "CODE_REVIEW" || st === "IN_REVIEW" || st === "IN REVIEW" || st === "REVIEW") {
    return "In Review";
  }
  if (st === "IN_PROGRESS" || st === "IN PROGRESS" || st === "PROGRESS") return "In Progress";
  return "To Do";
}

export function toBackendStatus(ui: string): string {
  const key = String(ui || "").toLowerCase().trim();
  if (key === "done" || key === "completed") return "DONE";
  if (key === "testing" || key === "qa") return "QA";
  if (key === "uat") return "UAT";
  if (key === "in review" || key === "code_review" || key === "in_review") return "CODE_REVIEW";
  if (key === "in progress" || key === "in_progress") return "IN_PROGRESS";
  if (key === "backlog") return "BACKLOG";
  if (key === "selected") return "SELECTED";
  if (key === "blocked") return "BLOCKED";
  return "TO_DO";
}

export function toUiPriority(raw: string): UiTaskPriority {
  const p = String(raw || "MEDIUM").toUpperCase().trim();
  if (p === "CRITICAL" || p === "URGENT") return "Critical";
  if (p === "HIGH") return "High";
  if (p === "LOW") return "Low";
  return "Medium";
}

export function toBackendPriority(ui: string): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  const p = String(ui || "MEDIUM").toUpperCase().trim();
  if (p === "CRITICAL" || p === "URGENT") return "CRITICAL";
  if (p === "HIGH") return "HIGH";
  if (p === "LOW") return "LOW";
  return "MEDIUM";
}

export function normalizeTask(raw: any): NormalizedTask {
  const proj = typeof raw?.projectId === "object" ? raw.projectId : null;
  const ms = typeof raw?.milestoneId === "object" ? raw.milestoneId : null;
  const sp = typeof raw?.sprintId === "object" ? raw.sprintId : null;
  const req = typeof raw?.requirementId === "object" ? raw.requirementId : null;
  const story = typeof raw?.storyId === "object" ? raw.storyId : null;
  const emp = typeof raw?.assigneeId === "object" ? raw.assigneeId : null;
  const creator = typeof raw?.createdBy === "object" ? raw.createdBy : null;

  const empFullName = emp
    ? emp.displayName || [emp.firstName, emp.lastName].filter(Boolean).join(" ").trim() || emp.name
    : "";
  const assignee = raw?.assigneeName || empFullName || "Unassigned";
  const reporter = raw?.reporterName || creator?.name || "System";

  const rawStatus = String(raw?.status || "BACKLOG").toUpperCase();
  const status = toUiStatus(rawStatus);
  const rawPriority = String(raw?.priority || "MEDIUM").toUpperCase();
  const priority = toUiPriority(rawPriority);

  const dueDateIso = raw?.dueDate ? new Date(raw.dueDate).toISOString().slice(0, 10) : "";
  const startDateIso = raw?.startDate ? new Date(raw.startDate).toISOString().slice(0, 10) : "";
  const dueDateLabel = dueDateIso
    ? new Date(`${dueDateIso}T00:00:00`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  const todayIso = new Date().toISOString().slice(0, 10);
  const isOverdue = Boolean(dueDateIso && status !== "Done" && dueDateIso < todayIso);

  const estimatedHours = Number(raw?.estimatedHours) || 0;
  const actualHours = Number(raw?.actualHours) || 0;
  const storyPoints =
    Number(raw?.storyPoints) || (estimatedHours > 0 ? Math.max(1, Math.round(estimatedHours / 4)) : 0);

  const taskCode = raw?.taskId || raw?.code || `TSK-${String(raw?._id || "").slice(-4).toUpperCase()}`;

  const parent =
    story?.title ||
    (req?.requirementId ? `${req.requirementId} - ${req.title}` : req?.title) ||
    ms?.title ||
    ms?.name ||
    "—";

  return {
    _id: raw?._id || raw?.id || taskCode,
    id: taskCode,
    taskId: taskCode,
    title: raw?.title || "Untitled Task",
    description: raw?.description || "",
    type: raw?.type || "Development",
    status,
    rawStatus,
    priority,
    rawPriority,
    assigneeId: emp?._id || (typeof raw?.assigneeId === "string" ? raw.assigneeId : ""),
    assignee,
    initials: getInitials(assignee),
    reporter,
    reporterInitials: getInitials(reporter),
    projectId: proj?._id || (typeof raw?.projectId === "string" ? raw.projectId : ""),
    projectCode: proj?.projectCode || "",
    projectName: proj?.projectName || "Unassigned Project",
    milestoneId: ms?._id || (typeof raw?.milestoneId === "string" ? raw.milestoneId : ""),
    milestoneName: ms?.title || ms?.name || "—",
    sprintId: sp?._id || (typeof raw?.sprintId === "string" ? raw.sprintId : ""),
    sprintCode: sp?.sprintCode || "",
    sprintName: sp?.name || "Product Backlog",
    requirementId: req?._id || (typeof raw?.requirementId === "string" ? raw.requirementId : ""),
    parent,
    estimatedHours,
    actualHours,
    storyPoints,
    progress: status === "Done" ? 100 : Number(raw?.progress) || (estimatedHours > 0 ? Math.min(95, Math.round((actualHours / estimatedHours) * 100)) : 0),
    startDate: startDateIso,
    dueDate: dueDateIso,
    dueDateLabel,
    isOverdue,
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    dependencies: Array.isArray(raw?.dependencies) ? raw.dependencies : [],
    blockedBy: Array.isArray(raw?.blockedBy) ? raw.blockedBy : [],
    category: raw?.category || "Feature",
    risk: raw?.risk || "Low",
    acceptanceCriteria: raw?.acceptanceCriteria || "",
    definitionOfDone: raw?.definitionOfDone || "",
    designLink: raw?.designLink || "",
    apiLink: raw?.apiLink || "",
    comments: Array.isArray(raw?.comments) ? raw.comments : [],
    timeLogs: Array.isArray(raw?.timeLogs) ? raw.timeLogs : [],
    attachments: Array.isArray(raw?.attachments) ? raw.attachments : [],
    activityLog: Array.isArray(raw?.activityLog) ? raw.activityLog : [],
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
  };
}

export const taskApi = {
  async getNextCode(): Promise<{ nextCode: string; totalTasks: number; sequence: number }> {
    const orgId = getOrganizationId();
    const query = orgId ? `?organizationId=${encodeURIComponent(orgId)}` : "";
    try {
      const res: any = await request<any>(`/tasks/next-code${query}`);
      return res?.data || res || { nextCode: "TSK-0001", totalTasks: 0, sequence: 1 };
    } catch {
      return { nextCode: "TSK-0001", totalTasks: 0, sequence: 1 };
    }
  },

  async list(params: Record<string, any> = {}): Promise<{ items: NormalizedTask[]; total: number }> {
    const orgId = getOrganizationId();
    const search = new URLSearchParams();
    if (orgId) search.set("organizationId", orgId);
    search.set("limit", String(params.limit ?? 100));

    Object.entries(params).forEach(([k, v]) => {
      if (k === "limit") return;
      if (v !== undefined && v !== null && v !== "" && v !== "All" && v !== "ALL") {
        search.set(k, String(v));
      }
    });

    const res: any = await request<any>(`/tasks?${search.toString()}`);
    const rawItems = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.items)
      ? res.items
      : Array.isArray(res)
      ? res
      : [];

    const items = rawItems.map(normalizeTask);
    return {
      items,
      total: res?.pagination?.total ?? items.length,
    };
  },

  async get(id: string): Promise<NormalizedTask> {
    const orgId = getOrganizationId();
    const query = orgId ? `?organizationId=${encodeURIComponent(orgId)}` : "";
    const res: any = await request<any>(`/tasks/${encodeURIComponent(id)}${query}`);
    return normalizeTask(res?.data ?? res);
  },

  async create(input: Record<string, any>): Promise<NormalizedTask> {
    const orgId = getOrganizationId();
    const payload = {
      ...(orgId ? { organizationId: orgId } : {}),
      ...input,
    };
    const res: any = await request<any>("/tasks", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return normalizeTask(res?.data ?? res);
  },

  async update(id: string, input: Record<string, any>): Promise<NormalizedTask> {
    const orgId = getOrganizationId();
    const payload = {
      ...(orgId ? { organizationId: orgId } : {}),
      ...input,
    };
    const res: any = await request<any>(`/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return normalizeTask(res?.data ?? res);
  },

  async updateStatus(id: string, backendStatus: string): Promise<NormalizedTask> {
    const orgId = getOrganizationId();
    const res: any = await request<any>(`/tasks/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        ...(orgId ? { organizationId: orgId } : {}),
        status: backendStatus,
      }),
    });
    return normalizeTask(res?.data ?? res);
  },

  async remove(id: string): Promise<void> {
    const orgId = getOrganizationId();
    const query = orgId ? `?organizationId=${encodeURIComponent(orgId)}` : "";
    await request<void>(`/tasks/${encodeURIComponent(id)}${query}`, {
      method: "DELETE",
    });
  },

  async getPersonnel(): Promise<{ id: string; employeeId?: string; name: string; email?: string; role?: string }[]> {
    try {
      const orgId = getOrganizationId();
      const [empRes, userRes] = await Promise.allSettled([
        request<any>(`/employees?organizationId=${encodeURIComponent(orgId || "")}&limit=100`),
        request<any>(`/users?organizationId=${encodeURIComponent(orgId || "")}&limit=100`),
      ]);

      const map = new Map<string, { id: string; employeeId?: string; name: string; email?: string; role?: string }>();

      if (empRes.status === "fulfilled") {
        const raw = empRes.value?.data || empRes.value?.items || empRes.value || [];
        const list = Array.isArray(raw) ? raw : [];
        list.forEach((e: any) => {
          const name = e.displayName || `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.name;
          if (name) {
            map.set(name.toLowerCase(), {
              id: e._id || e.id,
              employeeId: e._id || e.id,
              name,
              email: e.email,
              role: e.designation?.name || e.designation || e.role || "Team Member",
            });
          }
        });
      }

      if (userRes.status === "fulfilled") {
        const raw = userRes.value?.data || userRes.value?.items || userRes.value || [];
        const list = Array.isArray(raw) ? raw : [];
        list.forEach((u: any) => {
          const name = u.displayName || u.name;
          if (name && !map.has(name.toLowerCase())) {
            map.set(name.toLowerCase(), {
              id: u._id || u.id,
              name,
              email: u.email,
              role: u.role || "User",
            });
          }
        });
      }

      return Array.from(map.values());
    } catch {
      return [];
    }
  },
};
