import type { AuthUser } from "./auth";

export type CanonicalRoleCode =
  | "SUPER_ADMIN"
  | "CXO"
  | "PM"
  | "TL"
  | "DEV"
  | "QA"
  | "DEVOPS"
  | "FINANCE"
  | "HR"
  | "SALES"
  | "CLIENT"
  | "AUDITOR";

export interface RoleProfile {
  code: CanonicalRoleCode;
  label: string;
  shortLabel: string;
  defaultRoute: string;
  dataScope: "ALL" | "ORGANIZATION" | "PROJECT" | "TEAM" | "SELF" | "CLIENT";
  readOnly: boolean;
  canViewFinance: boolean;
  canEditFinance: boolean;
  canViewBaseSalary: boolean;
  allowedModules: string[];
  allowedDashboardPaths: string[];
}

export const PREVIEW_ROLE_STORAGE_KEY = "ph_pms_preview_role";

export const ROLE_PROFILES: Record<CanonicalRoleCode, RoleProfile> = {
  SUPER_ADMIN: {
    code: "SUPER_ADMIN",
    label: "Super Admin",
    shortLabel: "Super Admin",
    defaultRoute: "/dashboard",
    dataScope: "ALL",
    readOnly: false,
    canViewFinance: true,
    canEditFinance: true,
    canViewBaseSalary: true,
    allowedModules: [
      "dashboard",
      "projects",
      "brd",
      "milestones",
      "sprints",
      "tasks",
      "qa",
      "resources",
      "capacity",
      "timesheets",
      "finance",
      "risks",
      "deployments",
      "clients",
      "documents",
      "reports",
      "approvals",
      "notifications",
      "organization",
      "teams",
      "users",
      "rbac",
      "integrations",
      "audit",
      "settings",
    ],
    allowedDashboardPaths: ["/dashboard", "/dashboard/pm", "/dashboard/tl", "/dashboard/my-work", "/dashboard/portfolio"],
  },
  CXO: {
    code: "CXO",
    label: "CxO / Management",
    shortLabel: "CxO",
    defaultRoute: "/dashboard/portfolio",
    dataScope: "ORGANIZATION",
    readOnly: false,
    canViewFinance: true,
    canEditFinance: true,
    canViewBaseSalary: true,
    allowedModules: [
      "dashboard",
      "projects",
      "brd",
      "milestones",
      "resources",
      "capacity",
      "finance",
      "risks",
      "deployments",
      "clients",
      "documents",
      "reports",
      "approvals",
      "notifications",
      "audit",
    ],
    allowedDashboardPaths: ["/dashboard", "/dashboard/portfolio", "/dashboard/pm"],
  },
  PM: {
    code: "PM",
    label: "Project Manager",
    shortLabel: "PM",
    defaultRoute: "/dashboard/pm",
    dataScope: "PROJECT",
    readOnly: false,
    canViewFinance: true,
    canEditFinance: false,
    canViewBaseSalary: false,
    allowedModules: [
      "dashboard",
      "projects",
      "brd",
      "milestones",
      "sprints",
      "tasks",
      "qa",
      "resources",
      "capacity",
      "timesheets",
      "finance",
      "risks",
      "deployments",
      "clients",
      "documents",
      "reports",
      "approvals",
      "notifications",
      "teams",
    ],
    allowedDashboardPaths: ["/dashboard/pm", "/dashboard/my-work"],
  },
  TL: {
    code: "TL",
    label: "Team Lead",
    shortLabel: "Team Lead",
    defaultRoute: "/dashboard/tl",
    dataScope: "TEAM",
    readOnly: false,
    canViewFinance: false,
    canEditFinance: false,
    canViewBaseSalary: false,
    allowedModules: [
      "dashboard",
      "projects",
      "brd",
      "milestones",
      "sprints",
      "tasks",
      "qa",
      "capacity",
      "timesheets",
      "risks",
      "deployments",
      "documents",
      "reports",
      "approvals",
      "notifications",
      "teams",
    ],
    allowedDashboardPaths: ["/dashboard/tl", "/dashboard/my-work"],
  },
  DEV: {
    code: "DEV",
    label: "Developer / Employee",
    shortLabel: "Developer",
    defaultRoute: "/dashboard/my-work",
    dataScope: "SELF",
    readOnly: false,
    canViewFinance: false,
    canEditFinance: false,
    canViewBaseSalary: false,
    allowedModules: [
      "dashboard",
      "projects",
      "sprints",
      "tasks",
      "qa",
      "timesheets",
      "documents",
      "notifications",
    ],
    allowedDashboardPaths: ["/dashboard/my-work"],
  },
  QA: {
    code: "QA",
    label: "QA Engineer",
    shortLabel: "QA Engineer",
    defaultRoute: "/qa",
    dataScope: "PROJECT",
    readOnly: false,
    canViewFinance: false,
    canEditFinance: false,
    canViewBaseSalary: false,
    allowedModules: [
      "dashboard",
      "projects",
      "brd",
      "sprints",
      "tasks",
      "qa",
      "timesheets",
      "deployments",
      "documents",
      "reports",
      "notifications",
    ],
    allowedDashboardPaths: ["/dashboard/my-work"],
  },
  DEVOPS: {
    code: "DEVOPS",
    label: "DevOps Engineer",
    shortLabel: "DevOps",
    defaultRoute: "/deployments",
    dataScope: "PROJECT",
    readOnly: false,
    canViewFinance: false,
    canEditFinance: false,
    canViewBaseSalary: false,
    allowedModules: [
      "dashboard",
      "projects",
      "tasks",
      "qa",
      "deployments",
      "risks",
      "timesheets",
      "documents",
      "integrations",
      "notifications",
    ],
    allowedDashboardPaths: ["/dashboard/my-work"],
  },
  FINANCE: {
    code: "FINANCE",
    label: "Finance Manager",
    shortLabel: "Finance",
    defaultRoute: "/finance",
    dataScope: "ORGANIZATION",
    readOnly: false,
    canViewFinance: true,
    canEditFinance: true,
    canViewBaseSalary: true,
    allowedModules: [
      "dashboard",
      "finance",
      "clients",
      "projects",
      "timesheets",
      "documents",
      "reports",
      "approvals",
      "notifications",
    ],
    allowedDashboardPaths: ["/dashboard/portfolio", "/dashboard/my-work"],
  },
  HR: {
    code: "HR",
    label: "HR & Resource Manager",
    shortLabel: "HR Manager",
    defaultRoute: "/resources",
    dataScope: "ORGANIZATION",
    readOnly: false,
    canViewFinance: false,
    canEditFinance: false,
    canViewBaseSalary: true,
    allowedModules: [
      "dashboard",
      "resources",
      "capacity",
      "timesheets",
      "organization",
      "teams",
      "users",
      "documents",
      "reports",
      "approvals",
      "notifications",
    ],
    allowedDashboardPaths: ["/dashboard/my-work"],
  },
  SALES: {
    code: "SALES",
    label: "Sales / BDA",
    shortLabel: "Sales / BDA",
    defaultRoute: "/clients",
    dataScope: "CLIENT",
    readOnly: false,
    canViewFinance: true,
    canEditFinance: false,
    canViewBaseSalary: false,
    allowedModules: [
      "dashboard",
      "clients",
      "projects",
      "brd",
      "milestones",
      "finance",
      "documents",
      "notifications",
    ],
    allowedDashboardPaths: ["/dashboard/my-work"],
  },
  CLIENT: {
    code: "CLIENT",
    label: "Client Viewer",
    shortLabel: "Client",
    defaultRoute: "/projects",
    dataScope: "CLIENT",
    readOnly: false,
    canViewFinance: true,
    canEditFinance: false,
    canViewBaseSalary: false,
    allowedModules: [
      "dashboard",
      "projects",
      "brd",
      "milestones",
      "qa",
      "finance",
      "documents",
      "notifications",
    ],
    allowedDashboardPaths: ["/dashboard/my-work"],
  },
  AUDITOR: {
    code: "AUDITOR",
    label: "Auditor (Read-Only)",
    shortLabel: "Auditor",
    defaultRoute: "/audit",
    dataScope: "ORGANIZATION",
    readOnly: true,
    canViewFinance: true,
    canEditFinance: false,
    canViewBaseSalary: false,
    allowedModules: [
      "dashboard",
      "audit",
      "reports",
      "projects",
      "finance",
      "approvals",
      "documents",
      "notifications",
    ],
    allowedDashboardPaths: ["/dashboard", "/dashboard/portfolio"],
  },
};

export const ALL_ROLE_LIST: RoleProfile[] = Object.values(ROLE_PROFILES);

const ALIAS_MAP: Record<string, CanonicalRoleCode> = {
  SUPER_ADMIN: "SUPER_ADMIN",
  SUPERADMIN: "SUPER_ADMIN",
  ADMIN: "SUPER_ADMIN",
  MD: "SUPER_ADMIN",
  MANAGING_DIRECTOR: "SUPER_ADMIN",
  CXO: "CXO",
  COO: "CXO",
  CTO: "CXO",
  CFO: "CXO",
  DIRECTOR: "CXO",
  VP: "CXO",
  PM: "PM",
  PROJECT_MANAGER: "PM",
  TL: "TL",
  TEAM_LEAD: "TL",
  TECH_LEAD: "TL",
  SITE_ENGINEER: "TL",
  ARCHITECT: "TL",
  DEV: "DEV",
  DEVELOPER: "DEV",
  ENGINEER: "DEV",
  DESIGNER: "DEV",
  EMPLOYEE: "DEV",
  RESOURCE: "DEV",
  CONTRACTOR: "DEV",
  QA: "QA",
  QA_ENGINEER: "QA",
  DEVOPS: "DEVOPS",
  RELEASE_MANAGER: "DEVOPS",
  FINANCE: "FINANCE",
  FINANCE_MANAGER: "FINANCE",
  ACCOUNTS: "FINANCE",
  QUANTITY_SURVEYOR: "FINANCE",
  HR: "HR",
  HR_MANAGER: "HR",
  SALES: "SALES",
  BDA: "SALES",
  CLIENT: "CLIENT",
  CLIENT_VIEWER: "CLIENT",
  AUDITOR: "AUDITOR",
  READ_ONLY: "AUDITOR",
};

function norm(v: unknown): string {
  return String(v || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function resolveRoleCode(user: AuthUser | null | undefined): CanonicalRoleCode {
  if (!user) return "DEV";
  const u = user as any;
  if (u.isSuperAdmin === true) return "SUPER_ADMIN";
  if (u.primaryRoleCode && ROLE_PROFILES[u.primaryRoleCode as CanonicalRoleCode]) {
    return u.primaryRoleCode as CanonicalRoleCode;
  }

  const candidates: string[] = [];
  if (Array.isArray(u.roleCodes)) candidates.push(...u.roleCodes);
  if (Array.isArray(u.roles)) {
    for (const r of u.roles) {
      if (typeof r === "string") candidates.push(r);
      else if (r && typeof r === "object") {
        if (r.code) candidates.push(r.code);
        if (r.name) candidates.push(r.name);
      }
    }
  }
  if (u.primaryRole) candidates.push(u.primaryRole);
  if (u.role) candidates.push(u.role);

  const priority: CanonicalRoleCode[] = [
    "SUPER_ADMIN",
    "CXO",
    "FINANCE",
    "HR",
    "PM",
    "DEVOPS",
    "TL",
    "QA",
    "SALES",
    "AUDITOR",
    "DEV",
    "CLIENT",
  ];

  const matched = new Set<CanonicalRoleCode>();
  for (const c of candidates) {
    const k = norm(c);
    if (ALIAS_MAP[k]) matched.add(ALIAS_MAP[k]);
    else if (k.includes("SUPER") || k.includes("MANAGING_DIRECTOR")) matched.add("SUPER_ADMIN");
    else if (k.includes("PROJECT_MANAGER")) matched.add("PM");
    else if (k.includes("TEAM_LEAD") || k.includes("TECH_LEAD")) matched.add("TL");
    else if (k.includes("FINANCE") || k.includes("ACCOUNT")) matched.add("FINANCE");
    else if (k.includes("HR")) matched.add("HR");
    else if (k.includes("QA")) matched.add("QA");
    else if (k.includes("DEVOPS") || k.includes("RELEASE")) matched.add("DEVOPS");
    else if (k.includes("CLIENT")) matched.add("CLIENT");
    else if (k.includes("AUDIT") || k.includes("READ_ONLY")) matched.add("AUDITOR");
    else if (k.includes("SALES") || k.includes("BDA")) matched.add("SALES");
  }

  for (const p of priority) {
    if (matched.has(p)) return p;
  }
  return "DEV";
}

export function getRoleProfile(code: CanonicalRoleCode): RoleProfile {
  return ROLE_PROFILES[code] || ROLE_PROFILES.DEV;
}

export function getModuleForPath(pathname: string): string | null {
  if (!pathname || pathname === "/") return "dashboard";
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return "dashboard";
  if (pathname.startsWith("/projects")) return "projects";
  if (pathname.startsWith("/brd-requirements")) return "brd";
  if (pathname.startsWith("/milestones")) return "milestones";
  if (pathname.startsWith("/sprints")) return "sprints";
  if (pathname.startsWith("/tasks")) return "tasks";
  if (pathname.startsWith("/qa")) return "qa";
  if (pathname.startsWith("/resources")) return "resources";
  if (pathname.startsWith("/capacity")) return "capacity";
  if (pathname.startsWith("/timesheets")) return "timesheets";
  if (pathname.startsWith("/finance")) return "finance";
  if (pathname.startsWith("/risks")) return "risks";
  if (pathname.startsWith("/deployments")) return "deployments";
  if (pathname.startsWith("/clients")) return "clients";
  if (pathname.startsWith("/documents")) return "documents";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/approvals")) return "approvals";
  if (pathname.startsWith("/notifications")) return "notifications";
  if (pathname.startsWith("/organization")) return "organization";
  if (pathname.startsWith("/teams")) return "teams";
  if (pathname.startsWith("/users")) return "users";
  if (pathname.startsWith("/roles-permissions")) return "rbac";
  if (pathname.startsWith("/integrations")) return "integrations";
  if (pathname.startsWith("/audit")) return "audit";
  if (pathname.startsWith("/settings")) return "settings";
  return null;
}

export function canAccessPath(roleCode: CanonicalRoleCode, pathname: string): boolean {
  if (roleCode === "SUPER_ADMIN") return true;
  const profile = getRoleProfile(roleCode);
  const mod = getModuleForPath(pathname);
  if (!mod) return true;
  if (!profile.allowedModules.includes(mod)) return false;

  // Fine-grained sub-route scoping per role (BRD §4.1 & RBAC-005)
  if (mod === "dashboard") {
    return profile.allowedDashboardPaths.includes(pathname);
  }
  if (mod === "timesheets" && ["DEV", "QA", "DEVOPS"].includes(roleCode)) {
    if (pathname.startsWith("/timesheets/team") || pathname.startsWith("/timesheets/approvals") || pathname.startsWith("/timesheets/analytics")) {
      return false;
    }
  }
  if (mod === "finance" && ["CLIENT", "SALES"].includes(roleCode)) {
    // Client & Sales can only view Invoices (not internal Budgets or Direct Cost Expenses)
    if (pathname === "/finance/budgets" || pathname === "/finance/expenses") {
      return false;
    }
  }
  if (mod === "projects" && ["DEV", "QA", "DEVOPS", "CLIENT"].includes(roleCode)) {
    if (pathname === "/projects/financials" || pathname === "/projects/new") {
      return false;
    }
  }
  if (mod === "notifications" && !["SUPER_ADMIN", "CXO"].includes(roleCode)) {
    if (pathname === "/notifications/templates") return false;
  }
  if (mod === "documents" && ["DEV", "CLIENT", "AUDITOR"].includes(roleCode)) {
    if (pathname === "/documents/categories") return false;
  }
  return true;
}

export function getDefaultRouteForRole(roleCode: CanonicalRoleCode): string {
  return getRoleProfile(roleCode).defaultRoute;
}
