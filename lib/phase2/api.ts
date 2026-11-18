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
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (isValidObjectId(orgId)) headers["x-organization-id"] = String(orgId);

  const res = await fetch(url.toString(), { ...options, headers, cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `Request failed (${res.status})`);
  return (json?.data ?? json) as T;
}

/* ================= FORMATTERS ================= */
export function formatInr(amount?: number | null): string {
  return `₹ ${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatInrCompact(amount?: number | null): string {
  const n = Number(amount || 0);
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 10000000) return `${sign}₹ ${(abs / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000) return `${sign}₹ ${(abs / 100000).toFixed(2)} L`;
  if (abs >= 1000) return `${sign}₹ ${(abs / 1000).toFixed(1)} K`;
  return `${sign}₹ ${abs.toLocaleString("en-IN")}`;
}

export function formatDate(d?: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d).slice(0, 10);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ================= TYPES ================= */
export interface ProjectRef {
  _id: string;
  projectCode?: string;
  projectName?: string;
  contractValue?: number;
  status?: string;
}

export interface FinanceOverviewData {
  summary: {
    totalContractValue: number;
    totalApprovedCr: number;
    totalDiscounts: number;
    totalNetRevenue: number;
    totalDirectCost: number;
    totalSharedOverheads: number;
    totalContributionMargin: number;
    overallMarginPercent: number;
    totalFullyLoadedProfit: number;
    totalInvoiced: number;
    totalReceived: number;
    totalOutstanding: number;
    totalOverdue: number;
    invoiceCount: number;
    pendingExpenseApprovals: number;
  };
  receivablesAging: {
    current: number;
    days1_30: number;
    days31_60: number;
    days60Plus: number;
  };
  costByCategory: Array<{ category: string; label: string; amount: number }>;
  projectRegister: Array<{
    projectId: string;
    budgetId: string | null;
    code: string;
    name: string;
    client: string;
    status: string;
    progress: number;
    costingMode: string;
    billingModel: string;
    contractValue: number;
    approvedCrValue: number;
    discounts: number;
    netRevenue: number;
    allocatedBudget: number;
    directCost: number;
    sharedOverheads: number;
    contributionMargin: number;
    marginPercent: number;
    fullyLoadedProfit: number;
    invoiced: number;
    received: number;
    outstanding: number;
    invoiceCount: number;
    expenseCount: number;
  }>;
}

export interface ProjectBudgetItem {
  _id: string;
  projectId: ProjectRef | string;
  costingMode: "MODE_A_FULL" | "MODE_B_DIRECT" | "MODE_C_INTERNAL";
  billingModel: "FIXED_PRICE" | "T_AND_M" | "RETAINER" | "MILESTONE" | "INTERNAL";
  currency: string;
  contractValue: number;
  approvedCrValue: number;
  discounts: number;
  taxPercent: number;
  allocatedBudget: number;
  laborBudget: number;
  cloudInfraBudget: number;
  thirdPartyApiBudget: number;
  otherDirectBudget: number;
  sharedOverheadAllocation: number;
  status: string;
  notes?: string;
  actualSpend: number;
  netRevenue: number;
  burnPct: number;
}

export interface FinanceInvoiceItem {
  _id: string;
  invoiceNumber: string;
  projectId: ProjectRef | string;
  clientId?: { _id: string; displayName?: string; legalName?: string } | string | null;
  clientName: string;
  billingType: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  lineItems: Array<{ _id?: string; description: string; quantity: number; rate: number; amount: number }>;
  subtotal: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  effectiveStatus: string;
  payments: Array<{ _id?: string; date: string; amount: number; mode: string; referenceNo: string; recordedBy: string }>;
  notes?: string;
}

export interface ProjectExpenseItem {
  _id: string;
  expenseCode: string;
  projectId: ProjectRef | string;
  category: string;
  vendorName: string;
  description: string;
  expenseDate: string;
  amount: number;
  currency: string;
  billableToClient: boolean;
  invoiceRef: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED" | "REIMBURSED";
  submittedByName: string;
  approvedByName: string;
  notes?: string;
}

export interface RiskItem {
  _id: string;
  riskCode: string;
  projectId?: ProjectRef | string | null;
  projectName: string;
  title: string;
  description: string;
  category: string;
  probability: number;
  impact: number;
  score: number;
  severityLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  responseStrategy: "MITIGATE" | "AVOID" | "TRANSFER" | "ACCEPT";
  responsePlan: string;
  contingencyPlan: string;
  ownerName: string;
  targetReviewDate?: string | null;
  status: "IDENTIFIED" | "ASSESSING" | "MITIGATING" | "MONITORING" | "REALIZED" | "CLOSED";
  escalatedToIssueId?: string | null;
}

export interface IssueItem {
  _id: string;
  issueCode: string;
  projectId?: ProjectRef | string | null;
  projectName: string;
  linkedRiskId?: { _id: string; riskCode: string; title: string } | string | null;
  title: string;
  description: string;
  category: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: "OPEN" | "IN_PROGRESS" | "ESCALATED" | "RESOLVED" | "CLOSED";
  ownerName: string;
  reportedByName: string;
  dueDate?: string | null;
  resolvedAt?: string | null;
  rootCause: string;
  resolution: string;
  isOverdue?: boolean;
}

export interface EnvironmentItem {
  _id: string;
  envKey: "DEV" | "QA" | "UAT" | "STAGING" | "PRODUCTION";
  name: string;
  url: string;
  currentVersion: string;
  lastReleaseCode: string;
  lastDeployedAt?: string | null;
  lastDeployedBy: string;
  health: "HEALTHY" | "DEGRADED" | "MAINTENANCE" | "DOWN";
  uptimePct: number;
  autoDeployEnabled: boolean;
  notes: string;
}

export interface ReleaseDeploymentItem {
  _id: string;
  releaseCode: string;
  version: string;
  title: string;
  projectId: ProjectRef | string;
  projectName: string;
  sprintId?: { _id: string; name: string } | string | null;
  sprintName: string;
  environment: "DEV" | "QA" | "UAT" | "STAGING" | "PRODUCTION";
  deploymentType: "MAJOR" | "MINOR" | "PATCH" | "HOTFIX" | "ROLLBACK";
  status: string;
  branchName: string;
  commitSha: string;
  buildNumber: string;
  plannedDate: string;
  deployedAt?: string | null;
  releaseManagerName: string;
  approvedByName: string;
  downtimeMinutes: number;
  changeSummary: string;
  rollbackPlan: string;
  healthCheckStatus: string;
  checklist: Array<{ _id?: string; item: string; completed: boolean; completedBy?: string }>;
}

/* ================= API CLIENTS ================= */
export const financeApi = {
  getOverview: () => apiFetch<FinanceOverviewData>("/finance/overview"),
  listBudgets: () =>
    apiFetch<{ items: ProjectBudgetItem[]; projects: ProjectRef[]; summary: any }>("/finance/budgets"),
  upsertBudget: (payload: Record<string, any>) =>
    apiFetch<ProjectBudgetItem>("/finance/budgets", { method: "POST", body: JSON.stringify(payload) }),
  deleteBudget: (id: string) => apiFetch(`/finance/budgets/${id}`, { method: "DELETE" }),

  listInvoices: (params?: Record<string, string | undefined>) =>
    apiFetch<{ items: FinanceInvoiceItem[]; projects: ProjectRef[]; clients: any[]; summary: any }>(
      "/finance/invoices",
      { method: "GET" },
      params
    ),
  createInvoice: (payload: Record<string, any>) =>
    apiFetch<FinanceInvoiceItem>("/finance/invoices", { method: "POST", body: JSON.stringify(payload) }),
  updateInvoice: (id: string, payload: Record<string, any>) =>
    apiFetch<FinanceInvoiceItem>(`/finance/invoices/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  recordPayment: (id: string, payload: Record<string, any>) =>
    apiFetch<FinanceInvoiceItem>(`/finance/invoices/${id}/payments`, { method: "POST", body: JSON.stringify(payload) }),
  deleteInvoice: (id: string) => apiFetch(`/finance/invoices/${id}`, { method: "DELETE" }),

  listExpenses: (params?: Record<string, string | undefined>) =>
    apiFetch<{ items: ProjectExpenseItem[]; projects: ProjectRef[]; summary: any }>(
      "/finance/expenses",
      { method: "GET" },
      params
    ),
  createExpense: (payload: Record<string, any>) =>
    apiFetch<ProjectExpenseItem>("/finance/expenses", { method: "POST", body: JSON.stringify(payload) }),
  decideExpense: (id: string, decision: "APPROVE" | "REJECT" | "REIMBURSE", notes?: string) =>
    apiFetch<ProjectExpenseItem>(`/finance/expenses/${id}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, notes }),
    }),
  deleteExpense: (id: string) => apiFetch(`/finance/expenses/${id}`, { method: "DELETE" }),
};

export const riskIssueApi = {
  listRisks: (params?: Record<string, string | undefined>) =>
    apiFetch<{ items: RiskItem[]; projects: ProjectRef[]; matrix: Record<string, number>; summary: any }>(
      "/risks",
      { method: "GET" },
      params
    ),
  createRisk: (payload: Record<string, any>) =>
    apiFetch<RiskItem>("/risks", { method: "POST", body: JSON.stringify(payload) }),
  updateRisk: (id: string, payload: Record<string, any>) =>
    apiFetch<RiskItem>(`/risks/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  escalateRisk: (id: string) =>
    apiFetch<{ risk: RiskItem; issue: IssueItem }>(`/risks/${id}/escalate`, { method: "POST" }),
  deleteRisk: (id: string) => apiFetch(`/risks/${id}`, { method: "DELETE" }),

  listIssues: (params?: Record<string, string | undefined>) =>
    apiFetch<{ items: IssueItem[]; projects: ProjectRef[]; summary: any }>(
      "/issues",
      { method: "GET" },
      params
    ),
  createIssue: (payload: Record<string, any>) =>
    apiFetch<IssueItem>("/issues", { method: "POST", body: JSON.stringify(payload) }),
  updateIssue: (id: string, payload: Record<string, any>) =>
    apiFetch<IssueItem>(`/issues/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  resolveIssue: (id: string, payload: { rootCause: string; resolution: string; closeImmediately?: boolean }) =>
    apiFetch<IssueItem>(`/issues/${id}/resolve`, { method: "POST", body: JSON.stringify(payload) }),
  deleteIssue: (id: string) => apiFetch(`/issues/${id}`, { method: "DELETE" }),
};

export const deploymentApi = {
  list: (params?: Record<string, string | undefined>) =>
    apiFetch<{
      items: ReleaseDeploymentItem[];
      environments: EnvironmentItem[];
      projects: ProjectRef[];
      sprints: Array<{ _id: string; name: string; projectId: string }>;
      summary: any;
    }>("/deployments", { method: "GET" }, params),
  create: (payload: Record<string, any>) =>
    apiFetch<ReleaseDeploymentItem>("/deployments", { method: "POST", body: JSON.stringify(payload) }),
  update: (id: string, payload: Record<string, any>) =>
    apiFetch<ReleaseDeploymentItem>(`/deployments/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  transition: (id: string, action: string, notes?: string) =>
    apiFetch<ReleaseDeploymentItem>(`/deployments/${id}/transition`, {
      method: "POST",
      body: JSON.stringify({ action, notes }),
    }),
  updateEnvironment: (envId: string, payload: Record<string, any>) =>
    apiFetch<EnvironmentItem>(`/deployments/environments/${envId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  remove: (id: string) => apiFetch(`/deployments/${id}`, { method: "DELETE" }),
};
