import { getAccessToken, getOrganizationId } from "@/lib/auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api/v1";

export function isValidObjectId(val: unknown): boolean {
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

export type WorkType =
  | "Development"
  | "Code Review"
  | "Testing"
  | "Bug Fixing"
  | "Meeting"
  | "Documentation"
  | "Support"
  | "Training"
  | "Design"
  | "Other";

export const WORK_TYPES: WorkType[] = [
  "Development",
  "Code Review",
  "Testing",
  "Bug Fixing",
  "Meeting",
  "Documentation",
  "Support",
  "Training",
  "Design",
  "Other",
];

export interface DailyEntry {
  _id?: string;
  date: string; // YYYY-MM-DD
  projectId: string | null;
  projectName: string;
  sprintId?: string | null;
  sprintName?: string;
  taskId?: string | null;
  taskTitle: string;
  workType: WorkType;
  startTime?: string;
  endTime?: string;
  hours: number;
  billable: boolean;
  description: string;
  attachmentName?: string;
  attachmentUrl?: string;
  source?: "MANUAL" | "TIMER" | "WEEKLY_GRID" | "COPY";
}

export interface AuditEntry {
  _id?: string;
  action: string;
  byName: string;
  fromStatus?: string;
  toStatus?: string;
  comments?: string;
  timestamp: string;
  memberName?: string;
}

export type TimesheetStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "LOCKED"
  | "NOT_SUBMITTED";

export interface TimesheetDoc {
  _id: string | null;
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  weekNumber?: number;
  year?: number;
  status: TimesheetStatus;
  expectedHours: number;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  submittedAt?: string | null;
  submittedByName?: string;
  submissionComments?: string;
  approvedAt?: string | null;
  approvedByName?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  lockedAt?: string | null;
  employeeId?: any;
  dailyEntries: DailyEntry[];
  auditLog: AuditEntry[];
}

export interface WeekMeta {
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  year: number;
  days: string[];
}

export const timesheetApi = {
  async getMy(params?: { weekStart?: string; employeeId?: string }): Promise<{
    week: WeekMeta;
    employee: { id: string; name: string; code: string; email: string; department: string; designation: string; avatarUrl?: string };
    timesheet: TimesheetDoc;
    history: any[];
  }> {
    return apiFetch("/timesheets/my", { method: "GET" }, params);
  },

  async addEntry(payload: Partial<DailyEntry> & { date: string; hours: number; employeeId?: string }): Promise<TimesheetDoc> {
    const orgId = getOrganizationId();
    return apiFetch("/timesheets/entries", {
      method: "POST",
      body: JSON.stringify({ ...payload, ...(orgId && isValidObjectId(orgId) ? { organizationId: orgId } : {}) }),
    });
  },

  async updateEntry(timesheetId: string, entryId: string, payload: Partial<DailyEntry>): Promise<TimesheetDoc> {
    return apiFetch(`/timesheets/${timesheetId}/entries/${entryId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteEntry(timesheetId: string, entryId: string): Promise<TimesheetDoc> {
    return apiFetch(`/timesheets/${timesheetId}/entries/${entryId}`, {
      method: "DELETE",
    });
  },

  async saveWeeklyGrid(payload: { weekStart: string; rows: any[]; employeeId?: string }): Promise<TimesheetDoc> {
    const orgId = getOrganizationId();
    return apiFetch("/timesheets/weekly-grid", {
      method: "POST",
      body: JSON.stringify({ ...payload, ...(orgId && isValidObjectId(orgId) ? { organizationId: orgId } : {}) }),
    });
  },

  async copyPreviousDay(targetDate: string): Promise<{ copiedCount: number; fromDate: string; timesheet: TimesheetDoc }> {
    const orgId = getOrganizationId();
    return apiFetch("/timesheets/copy-previous-day", {
      method: "POST",
      body: JSON.stringify({ targetDate, ...(orgId && isValidObjectId(orgId) ? { organizationId: orgId } : {}) }),
    });
  },

  async submit(timesheetId: string, comments?: string): Promise<TimesheetDoc> {
    return apiFetch(`/timesheets/${timesheetId}/submit`, {
      method: "POST",
      body: JSON.stringify({ comments: comments || "" }),
    });
  },

  async decide(
    timesheetId: string,
    payload: { decision: "APPROVE" | "REJECT" | "REQUEST_CHANGES" | "LOCK"; comments?: string }
  ): Promise<TimesheetDoc> {
    return apiFetch(`/timesheets/${timesheetId}/decision`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async getTeam(params?: { weekStart?: string; departmentId?: string; projectId?: string; status?: string }): Promise<any> {
    return apiFetch("/timesheets/team", { method: "GET" }, params);
  },

  async getAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    projectId?: string;
    departmentId?: string;
    employeeId?: string;
  }): Promise<any> {
    return apiFetch("/timesheets/analytics", { method: "GET" }, params);
  },

  async list(params?: { weekKey?: string; status?: string; search?: string }): Promise<TimesheetDoc[]> {
    const data = await apiFetch<any>("/timesheets", { method: "GET" }, { limit: 100, ...params });
    return Array.isArray(data) ? data : data?.items || [];
  },

  async get(id: string): Promise<TimesheetDoc> {
    return apiFetch(`/timesheets/${id}`, { method: "GET" });
  },
};

export const tsLookupApi = {
  async projects(): Promise<{ _id: string; projectCode: string; projectName: string; clientName?: string }[]> {
    const data = await apiFetch<any>("/projects", { method: "GET" }, { limit: 100 });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map((p: any) => ({
      _id: String(p._id || p.id),
      projectCode: p.projectCode || p.code || "",
      projectName: p.projectName || p.name || "Project",
      clientName: p.clientId?.companyName || p.clientName || "Internal",
    }));
  },

  async sprints(projectId?: string): Promise<{ _id: string; name: string; projectId: string; status?: string }[]> {
    const data = await apiFetch<any>("/sprints", { method: "GET" }, { limit: 100, projectId });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map((s: any) => ({
      _id: String(s._id || s.id),
      name: s.name || s.sprintName || s.sprintCode || "Sprint",
      projectId: String(s.projectId?._id || s.projectId || ""),
      status: s.status || "",
    }));
  },

  async tasks(projectId?: string): Promise<{ _id: string; taskCode: string; title: string; projectId: string; sprintId?: string }[]> {
    const data = await apiFetch<any>("/tasks", { method: "GET" }, { limit: 100, projectId });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map((t: any) => ({
      _id: String(t._id || t.id),
      taskCode: t.taskCode || "",
      title: t.title || "Task",
      projectId: String(t.projectId?._id || t.projectId || ""),
      sprintId: String(t.sprintId?._id || t.sprintId || ""),
    }));
  },

  async departments(): Promise<{ _id: string; name: string }[]> {
    const data = await apiFetch<any>("/departments", { method: "GET" }, { limit: 100 });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map((d: any) => ({ _id: String(d._id || d.id), name: d.name || "Department" }));
  },
};

export function getMondayOfWeek(dateInput?: Date | string): string {
  const base = dateInput
    ? new Date(typeof dateInput === "string" && dateInput.length === 10 ? `${dateInput}T12:00:00Z` : dateInput)
    : new Date();
  const d = Number.isNaN(base.getTime()) ? new Date() : base;
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
  return mon.toISOString().slice(0, 10);
}

export function shiftWeekMonday(mondayIso: string, deltaWeeks: number): string {
  const d = new Date(`${mondayIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaWeeks * 7);
  return d.toISOString().slice(0, 10);
}

export function getWeekDates(mondayIso: string): { iso: string; dayShort: string; dayNum: number; monthShort: string }[] {
  const mon = new Date(`${mondayIso}T12:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(mon.getTime() + i * 86400000);
    return {
      iso: dt.toISOString().slice(0, 10),
      dayShort: dt.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      dayNum: dt.getUTCDate(),
      monthShort: dt.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
    };
  });
}

export function formatWeekRange(mondayIso: string): string {
  const days = getWeekDates(mondayIso);
  const first = days[0];
  const last = days[6];
  const yr = new Date(`${last.iso}T12:00:00Z`).getUTCFullYear();
  return `${String(first.dayNum).padStart(2, "0")} ${first.monthShort} – ${String(last.dayNum).padStart(2, "0")} ${last.monthShort} ${yr}`;
}

export function formatShortDate(d?: string | Date | null): string {
  if (!d) return "—";
  const dt = new Date(typeof d === "string" && d.length === 10 ? `${d}T12:00:00Z` : d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function computeHoursBetween(startHHMM: string, endHHMM: string): number {
  if (!startHHMM || !endHHMM) return 0;
  const [sh, sm] = startHHMM.split(":").map(Number);
  const [eh, em] = endHHMM.split(":").map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return 0;
  const diffMins = eh * 60 + em - (sh * 60 + sm);
  if (diffMins <= 0) return 0;
  return Math.round((diffMins / 60) * 100) / 100;
}

export function getInitials(name: string): string {
  return (name || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

export function formatStatusLabel(status?: string): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "SUBMITTED":
      return "Submitted";
    case "UNDER_REVIEW":
      return "Under Review";
    case "CHANGES_REQUESTED":
      return "Changes Requested";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "LOCKED":
      return "Locked";
    default:
      return "Not Submitted";
  }
}

export function statusBadgeClass(status?: string): string {
  switch (status) {
    case "APPROVED":
      return "ts-badge ts-badge-green";
    case "LOCKED":
      return "ts-badge ts-badge-purple";
    case "SUBMITTED":
    case "UNDER_REVIEW":
      return "ts-badge ts-badge-blue";
    case "CHANGES_REQUESTED":
      return "ts-badge ts-badge-amber";
    case "REJECTED":
      return "ts-badge ts-badge-red";
    default:
      return "ts-badge ts-badge-slate";
  }
}
