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

export const TEST_TYPES = [
  "Functional",
  "UI",
  "Regression",
  "Integration",
  "Performance",
  "Security",
  "API",
  "Smoke",
  "Other",
] as const;

export const BUG_TYPES = [
  "Functional",
  "UI",
  "Performance",
  "Security",
  "API",
  "Database",
  "Integration",
  "Compatibility",
  "Other",
] as const;

export const BUG_LIFECYCLE_STATUSES = [
  "NEW",
  "TRIAGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "FIXED",
  "READY_FOR_RETEST",
  "RETEST",
  "CLOSED",
  "REOPENED",
] as const;

export const EXTRA_BUG_STATUSES = [
  "BLOCKED",
  "DUPLICATE",
  "NOT_A_BUG",
  "CANNOT_REPRODUCE",
  "DEFERRED",
  "WONT_FIX",
] as const;

export const RESOLUTION_CODES = [
  "Fixed",
  "Duplicate",
  "Not a Bug",
  "Cannot Reproduce",
  "Deferred",
  "Configuration Issue",
  "Environment Issue",
  "Third-Party Issue",
  "Won't Fix",
] as const;

export interface TestStep {
  stepNumber: number;
  description: string;
  testData: string;
  expectedResult: string;
  actualResult?: string;
}

export interface TestCaseItem {
  _id: string;
  testCaseCode: string;
  projectId: any;
  projectName: string;
  requirementId?: any;
  requirementTitle?: string;
  module: string;
  title: string;
  description: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  testType: string;
  status: "DRAFT" | "REVIEW" | "APPROVED" | "DEPRECATED";
  preconditions: string;
  postconditions: string;
  steps: TestStep[];
  tags: string[];
  authorName: string;
  version: string;
  attachments?: { name: string; url: string; uploadedAt?: string }[];
  activityLog?: { action: string; byName: string; comments?: string; timestamp: string }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TestRunResultItem {
  _id: string;
  testCaseId?: string | null;
  testCaseCode: string;
  testCaseTitle: string;
  module: string;
  priority: string;
  status: "NOT_RUN" | "PASS" | "FAIL" | "BLOCKED";
  assignedToName: string;
  actualResult: string;
  comments: string;
  evidenceUrl?: string;
  bugId?: string | null;
  bugCode?: string;
  executedAt?: string | null;
}

export interface TestRunItem {
  _id: string;
  runCode: string;
  title: string;
  projectId: any;
  projectName: string;
  releaseVersion: string;
  environment: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD" | "ABORTED";
  totalTests: number;
  executedCount: number;
  passed: number;
  failed: number;
  blocked: number;
  executedBy: string;
  executedAt?: string;
  notes?: string;
  results: TestRunResultItem[];
  activityLog?: { action: string; byName: string; comments?: string; timestamp: string }[];
  createdAt?: string;
}

export interface BugItem {
  _id: string;
  bugId: string;
  projectId: any;
  projectName: string;
  module: string;
  subModule?: string;
  title: string;
  description: string;
  requirementId?: any;
  milestoneId?: any;
  sprintId?: any;
  taskId?: any;
  testCaseId?: any;
  testRunId?: any;
  bugType: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  tags: string[];
  status: string;
  statusReason?: string;
  environment: string;
  foundInVersion?: string;
  buildVersion?: string;
  browser?: string;
  os?: string;
  device?: string;
  apiService?: string;
  assigneeId?: any;
  assigneeName?: string;
  reporterName?: string;
  qaOwnerName?: string;
  targetFixDate?: string | null;
  fixedOn?: string | null;
  retestDueDate?: string | null;
  closedOn?: string | null;
  preconditions?: string;
  testData?: string;
  stepsToReproduce?: string;
  expectedResult?: string;
  actualResult?: string;
  attachments?: { name: string; type: string; url: string; uploadedAt?: string }[];
  rootCause?: string;
  resolution?: string;
  resolutionCode?: string;
  fixedVersion?: string;
  commitPrUrl?: string;
  retestBuildVersion?: string;
  retestResult?: "" | "PASSED" | "FAILED";
  reopenCount?: number;
  reopenReason?: string;
  comments?: { _id?: string; text: string; byName: string; createdAt: string }[];
  activityLog?: { _id?: string; action: string; byName: string; fromStatus?: string; toStatus?: string; comments?: string; timestamp: string }[];
  createdAt?: string;
  updatedAt?: string;
}

export const qaDashboardApi = {
  async get(params?: { projectId?: string }): Promise<any> {
    return apiFetch("/qa/dashboard", { method: "GET" }, params);
  },
};

export const testCaseApi = {
  async list(params?: Record<string, any>): Promise<TestCaseItem[]> {
    const data = await apiFetch<any>("/test-cases", { method: "GET" }, { limit: 100, ...params });
    return Array.isArray(data) ? data : data?.items || [];
  },
  async get(id: string): Promise<TestCaseItem> {
    return apiFetch(`/test-cases/${id}`, { method: "GET" });
  },
  async create(payload: Record<string, any>): Promise<TestCaseItem> {
    const orgId = getOrganizationId();
    return apiFetch("/test-cases", {
      method: "POST",
      body: JSON.stringify({ ...payload, ...(orgId && isValidObjectId(orgId) ? { organizationId: orgId } : {}) }),
    });
  },
  async update(id: string, payload: Record<string, any>): Promise<TestCaseItem> {
    return apiFetch(`/test-cases/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  async clone(id: string): Promise<TestCaseItem> {
    return apiFetch(`/test-cases/${id}/clone`, { method: "POST" });
  },
  async remove(id: string): Promise<void> {
    await apiFetch(`/test-cases/${id}`, { method: "DELETE" });
  },
};

export const testRunApi = {
  async list(params?: Record<string, any>): Promise<TestRunItem[]> {
    const data = await apiFetch<any>("/test-runs", { method: "GET" }, { limit: 100, ...params });
    return Array.isArray(data) ? data : data?.items || [];
  },
  async get(id: string): Promise<TestRunItem> {
    return apiFetch(`/test-runs/${id}`, { method: "GET" });
  },
  async create(payload: Record<string, any>): Promise<TestRunItem> {
    const orgId = getOrganizationId();
    return apiFetch("/test-runs", {
      method: "POST",
      body: JSON.stringify({ ...payload, ...(orgId && isValidObjectId(orgId) ? { organizationId: orgId } : {}) }),
    });
  },
  async update(id: string, payload: Record<string, any>): Promise<TestRunItem> {
    return apiFetch(`/test-runs/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  async updateResult(
    runId: string,
    resultId: string,
    payload: { status: string; actualResult?: string; comments?: string; logBug?: boolean; bugTitle?: string; bugSeverity?: string }
  ): Promise<{ testRun: TestRunItem; createdBug?: BugItem | null }> {
    return apiFetch(`/test-runs/${runId}/results/${resultId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  async remove(id: string): Promise<void> {
    await apiFetch(`/test-runs/${id}`, { method: "DELETE" });
  },
};

export const bugApi = {
  async list(params?: Record<string, any>): Promise<BugItem[]> {
    const data = await apiFetch<any>("/bugs", { method: "GET" }, { limit: 100, ...params });
    return Array.isArray(data) ? data : data?.items || [];
  },
  async get(id: string): Promise<BugItem> {
    return apiFetch(`/bugs/${id}`, { method: "GET" });
  },
  async create(payload: Record<string, any>): Promise<BugItem> {
    const orgId = getOrganizationId();
    return apiFetch("/bugs", {
      method: "POST",
      body: JSON.stringify({ ...payload, ...(orgId && isValidObjectId(orgId) ? { organizationId: orgId } : {}) }),
    });
  },
  async update(id: string, payload: Record<string, any>): Promise<BugItem> {
    return apiFetch(`/bugs/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  async transitionStatus(id: string, payload: Record<string, any>): Promise<BugItem> {
    return apiFetch(`/bugs/${id}/status`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  async addComment(id: string, text: string): Promise<BugItem> {
    return apiFetch(`/bugs/${id}/comments`, { method: "POST", body: JSON.stringify({ text }) });
  },
  async clone(id: string): Promise<BugItem> {
    return apiFetch(`/bugs/${id}/clone`, { method: "POST" });
  },
  async remove(id: string): Promise<void> {
    await apiFetch(`/bugs/${id}`, { method: "DELETE" });
  },
};

export const qaLookupApi = {
  async projects(): Promise<{ _id: string; projectCode: string; projectName: string }[]> {
    const data = await apiFetch<any>("/projects", { method: "GET" }, { limit: 100 });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map((p: any) => ({
      _id: String(p._id || p.id),
      projectCode: p.projectCode || p.code || "",
      projectName: p.projectName || p.name || "Project",
    }));
  },
  async requirements(projectId?: string): Promise<{ _id: string; code: string; title: string }[]> {
    const data = await apiFetch<any>("/requirements", { method: "GET" }, { limit: 100, projectId });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map((r: any) => ({
      _id: String(r._id || r.id),
      code: r.requirementCode || r.code || "",
      title: r.title || r.name || "Requirement",
    }));
  },
  async sprints(projectId?: string): Promise<{ _id: string; name: string }[]> {
    const data = await apiFetch<any>("/sprints", { method: "GET" }, { limit: 100, projectId });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map((s: any) => ({
      _id: String(s._id || s.id),
      name: s.name || s.sprintName || s.sprintCode || "Sprint",
    }));
  },
  async tasks(projectId?: string): Promise<{ _id: string; code: string; title: string }[]> {
    const data = await apiFetch<any>("/tasks", { method: "GET" }, { limit: 100, projectId });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map((t: any) => ({
      _id: String(t._id || t.id),
      code: t.taskCode || "",
      title: t.title || "Task",
    }));
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

export function formatShortDate(d?: string | Date | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatBugStatus(s?: string): string {
  if (!s) return "New";
  return s
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function severityBadgeClass(sev?: string): string {
  switch (String(sev || "").toUpperCase()) {
    case "CRITICAL":
    case "URGENT":
      return "qa-badge qa-badge-red";
    case "HIGH":
      return "qa-badge qa-badge-orange";
    case "MEDIUM":
      return "qa-badge qa-badge-amber";
    default:
      return "qa-badge qa-badge-slate";
  }
}

export function statusBadgeClass(st?: string): string {
  const s = String(st || "").toUpperCase();
  if (["APPROVED", "PASS", "PASSED", "COMPLETED", "FIXED", "CLOSED"].includes(s)) return "qa-badge qa-badge-green";
  if (["FAIL", "FAILED", "REOPENED", "ABORTED", "BLOCKED"].includes(s)) return "qa-badge qa-badge-red";
  if (["IN_PROGRESS", "FIX_IN_PROGRESS", "RETEST", "READY_FOR_RETEST", "REVIEW", "ASSIGNED", "TRIAGED", "TRIAGE"].includes(s))
    return "qa-badge qa-badge-blue";
  if (["ON_HOLD", "DRAFT", "DEFERRED"].includes(s)) return "qa-badge qa-badge-amber";
  return "qa-badge qa-badge-slate";
}
