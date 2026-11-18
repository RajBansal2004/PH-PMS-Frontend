import { getAccessToken, getOrganizationId } from "@/lib/auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api/v1";

function isValidObjectId(val: unknown): boolean {
  return typeof val === "string" && /^[a-f\d]{24}$/i.test(val.trim());
}

async function apiGet<T = any>(
  path: string,
  params?: Record<string, string | number | undefined | null>
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== "" && String(v) !== "ALL") {
        url.searchParams.set(k, String(v));
      }
    });
  }
  const token = getAccessToken();
  const orgId = getOrganizationId();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (isValidObjectId(orgId)) headers["x-organization-id"] = String(orgId);

  const res = await fetch(url.toString(), { headers, cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `Request failed (${res.status})`);
  return (json?.data ?? json) as T;
}

export interface CountSlice {
  key?: string;
  severity?: string;
  status?: string;
  label: string;
  count: number;
  color?: string;
}

export interface SprintSummaryItem {
  _id: string;
  name: string;
  code: string;
  projectName: string;
  status: string;
  startDate: string;
  endDate: string;
  plannedPoints: number;
  completedPoints: number;
  progressPct: number;
}

export interface WorkloadMember {
  employeeId: string;
  name: string;
  role: string;
  utilization: number;
  assignedTasks: number;
  completedTasks: number;
  overdueTasks: number;
  loggedHours?: number;
  completionRate?: number;
}

export interface MilestoneItem {
  _id: string;
  title: string;
  projectName: string;
  status: string;
  targetDate: string;
  progress: number;
}

export interface TaskLite {
  _id: string;
  code: string;
  title: string;
  priority: string;
  status: string;
  dueDate?: string;
  projectName: string;
  assigneeName?: string;
  daysOverdue?: number;
  isOverdue?: boolean;
  isDueToday?: boolean;
}

export interface WeeklyHourSlot {
  date: string;
  label: string;
  billable: number;
  nonBillable: number;
  total: number;
}

export interface ActivityItem {
  _id: string;
  action: string;
  module: string;
  actorName: string;
  outcome: string;
  createdAt: string;
}

export interface ProjectOption {
  _id: string;
  code: string;
  name: string;
}

export interface PmDashboardData {
  kpis: {
    totalProjects: number;
    overallProgress: number;
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    openBugs: number;
    teamUtilization: number;
    pendingApprovals: number;
  };
  projectsSummary: CountSlice[];
  tasksByStatus: CountSlice[];
  activeSprints: SprintSummaryItem[];
  teamWorkload: WorkloadMember[];
  upcomingMilestones: MilestoneItem[];
  overdueTasks: TaskLite[];
  upcomingTasks: TaskLite[];
  bugsBySeverity: CountSlice[];
  weeklyHours: WeeklyHourSlot[];
  weeklyHoursTotal: number;
  recentActivity: ActivityItem[];
  projectOptions: ProjectOption[];
}

export interface TeamLeadDashboardData {
  kpis: {
    teamMembers: number;
    tasksAssigned: number;
    tasksCompleted: number;
    tasksInProgress: number;
    overdueTasks: number;
    openBugs: number;
    teamUtilization: number;
  };
  tasksByStatus: CountSlice[];
  activeSprints: SprintSummaryItem[];
  teamWorkload: WorkloadMember[];
  bugsBySeverity: CountSlice[];
  weeklyHours: WeeklyHourSlot[];
  weeklyHoursTotal: number;
  overdueTasks: TaskLite[];
  topPerformers: WorkloadMember[];
  recentActivity: ActivityItem[];
  projectOptions: ProjectOption[];
}

export interface MyWorkDashboardData {
  scopeMode: "PERSONAL" | "WORKSPACE";
  userName: string;
  kpis: {
    myTasks: number;
    inProgress: number;
    dueToday: number;
    overdue: number;
    completed: number;
    loggedHoursMtd: number;
  };
  taskStatus: CountSlice[];
  progressPct: number;
  timeSummary: {
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    weeklyTargetHours: number;
    weeklyHours: WeeklyHourSlot[];
  };
  upcomingTasks: TaskLite[];
  activeSprint: SprintSummaryItem | null;
  pendingApprovals: Array<{
    _id: string;
    title: string;
    type: string;
    priority: string;
    requestedBy: string;
    createdAt: string;
  }>;
  unreadNotifications: Array<{
    _id: string;
    title: string;
    message: string;
    type: string;
    priority: string;
    deepLink: string;
    createdAt: string;
  }>;
  holidays: Array<{ date: string; name: string; type: string }>;
  workingDays: string[];
}

export interface PortfolioDashboardData {
  kpis: {
    totalProjects: number;
    activeProjects: number;
    overallProgress: number;
    openRisksAndBugs: number;
    totalBudget: number;
    actualSpend: number;
    budgetUtilizationPct: number;
    headcount: number;
    taskCompletionPct: number;
  };
  portfolioHealth: CountSlice[];
  projectStatusBreakdown: Array<{ status: string; label: string; count: number }>;
  topProjects: Array<{
    _id: string;
    code: string;
    name: string;
    status: string;
    health: string;
    progress: number;
    budget: number;
    targetCompletion?: string;
  }>;
  bugsBySeverity: CountSlice[];
  upcomingMilestones: MilestoneItem[];
}

export const dashboardWorkbenchApi = {
  getPm: (projectId?: string) =>
    apiGet<PmDashboardData>("/dashboard/pm", projectId ? { projectId } : undefined),
  getTeamLead: (projectId?: string) =>
    apiGet<TeamLeadDashboardData>("/dashboard/tl", projectId ? { projectId } : undefined),
  getMyWork: () => apiGet<MyWorkDashboardData>("/dashboard/my-work"),
  getPortfolio: () => apiGet<PortfolioDashboardData>("/dashboard/portfolio"),
};

export function formatInrCompact(value: number): string {
  const n = Number(value || 0);
  if (n >= 10000000) return `₹ ${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹ ${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹ ${(n / 1000).toFixed(1)} K`;
  return `₹ ${n.toLocaleString("en-IN")}`;
}

export function formatShortDate(d?: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d).slice(0, 10);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
