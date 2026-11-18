"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import "./shell-enhancements.css";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "./AuthProvider";
import { canAccessPath } from "../lib/rbac";

import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  FileText,
  FolderKanban,
  Gauge,
  Grid2X2,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
  X,
  Flag,
  CalendarRange,
  GitBranch,
  GitPullRequest,
  BarChart3,
  Calculator,
  KanbanSquare,
  Clock3,

  type LucideIcon,
  Activity,
  ClipboardCheck,
  MessageSquareText,
  LayoutGrid,
  HandCoins,
  UserPlus,
  Bug,
  Plus,
  Layers,
  CheckSquare,
  MapPin,
  ShieldAlert,
  Rocket,
  Server,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type NavigationGroup = NavigationItem & {
  section?: string;
  children?: NavigationItem[];
};

const NAV_SECTION_BY_HREF: Record<string, string> = {
  "/dashboard": "Overview",
  "/projects": "Delivery",
  "/brd-requirements/brd-registry": "Delivery",
  "/milestones": "Delivery",
  "/sprints": "Delivery",
  "/tasks": "Delivery",
  "/qa": "Delivery",
  "/deployments": "Delivery",
  "/risks": "Delivery",
  "/resources": "People & Time",
  "/capacity": "People & Time",
  "/timesheets": "People & Time",
  "/approvals": "People & Time",
  "/clients": "Commercial",
  "/finance": "Commercial",
  "/reports": "Commercial",
  "/documents": "Commercial",
  "/organization": "Administration",
  "/teams": "Administration",
  "/users": "Administration",
  "/roles-permissions": "Administration",
  "/integrations": "Administration",
  "/audit": "Administration",
  "/settings": "Administration",
};

const NAV_SECTION_ORDER = [
  "Overview",
  "Delivery",
  "People & Time",
  "Commercial",
  "Administration",
];

/* =========================================================
   NAVIGATION CONFIGURATION
========================================================= */

const navigation: NavigationGroup[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    children: [
      { label: "Executive Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "PM Workbench", href: "/dashboard/pm", icon: FolderKanban },
      { label: "Team Lead Dashboard", href: "/dashboard/tl", icon: Users },
      { label: "My Work", href: "/dashboard/my-work", icon: CheckSquare },
      { label: "Portfolio Overview", href: "/dashboard/portfolio", icon: BriefcaseBusiness },
    ],
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
    children: [
      { label: "Project Registry", href: "/projects", icon: FolderKanban },
      { label: "My Projects", href: "/projects/my", icon: Users },
      {
        label: "Project Templates",
        href: "/projects/templates",
        icon: FileText,
      },
      {
        label: "Project Calendar",
        href: "/projects/calendar",
        icon: CalendarDays,
      },
      {
        label: "Project Timeline",
        href: "/projects/timeline",
        icon: CalendarDays,
      },
      {
        label: "Project Financials",
        href: "/projects/financials",
        icon: WalletCards,
      },
      {
        label: "Project Health",
        href: "/projects/health",
        icon: Gauge,
      },
    ],
  },
  {
    label: "BRD & Requirements",
    href: "/brd-requirements/brd-registry",
    icon: FileText,
    children: [
      {
        label: "BRD Registry",
        href: "/brd-requirements/brd-registry",
        icon: FileText,
      },
      {
        label: "Requirements",
        href: "/brd-requirements/requirements",
        icon: ClipboardList,
      },
      {
        label: "Requirement Traceability",
        href: "/brd-requirements/traceability",
        icon: Network,
      },
      {
        label: "Approval Center",
        href: "/brd-requirements/approval-center",
        icon: ShieldCheck,
      },
      {
        label: "Change Requests",
        href: "/brd-requirements/change-requests",
        icon: GitPullRequest,
      },
    ],
  },
  {
    label: "Milestone Management",
    href: "/milestones",
    icon: Flag,
    children: [
      {
        label: "Milestone Registry",
        href: "/milestones",
        icon: Flag,
      },
      {
        label: "Milestone Calendar",
        href: "/milestones/calendar",
        icon: CalendarRange,
      },
      {
        label: "Milestone Timeline",
        href: "/milestones/timeline",
        icon: GitBranch,
      },
      {
        label: "Milestone Reports",
        href: "/milestones/reports",
        icon: BarChart3,
      },
      {
        label: "Progress Rules & Calculation",
        href: "/milestones/progress-rules",
        icon: Calculator,
      },
    ],
  },
  

{
  label: "Sprint Management",
  href: "/sprints",
  icon: KanbanSquare,
  children: [
    {
      label: "Sprint Registry",
      href: "/sprints",
      icon: ClipboardList,
    },
    {
      label: "Sprint Calendar",
      href: "/sprints/calendar",
      icon: CalendarDays,
    },
    {
      label: "Sprint Timeline",
      href: "/sprints/timeline",
      icon: Clock3,
    },
    {
      label: "Sprint Planning",
      href: "/sprints/current/planning",
      icon: ClipboardList,
    },
    {
      label: "Active Sprint",
      href: "/sprints/current/active",
      icon: Activity,
    },
    {
      label: "Sprint Review",
      href: "/sprints/review/current",
      icon: ClipboardCheck,
    },
    {
      label: "Sprint Retrospective",
      href: "/sprints/retrospective/current",
      icon: MessageSquareText,
    },
    {
      label: "Sprint Backlog",
      href: "/sprints/backlog",
      icon: ClipboardList,
    },
    {
      label: "Daily Standup",
      href: "/sprints/standup",
      icon: Users,
    },
    {
      label: "Sprint Reports",
      href: "/sprints/reports",
      icon: BarChart3,
    },
  ],
},

 {
  label: "Tasks / Kanban",
  href: "/tasks",
  icon: ClipboardList,
  children: [
    {
      label: "Task Registry",
      href: "/tasks",
      icon: ClipboardList,
    },
    {
      label: "Create Task",
      href: "/tasks/new",
      icon: Plus,
    },
    {
      label: "Kanban Board",
      href: "/tasks/kanban",
      icon: LayoutGrid,
    },
    {
      label: "Backlog Manager",
      href: "/tasks/backlog",
      icon: Layers,
    },
    {
      label: "My Tasks",
      href: "/tasks/my",
      icon: CheckSquare,
    },
    {
      label: "Dependency Graph",
      href: "/tasks/dependency-graph",
      icon: GitBranch,
    },
    {
      label: "Activity Audit",
      href: "/tasks/audit",
      icon: Activity,
    },
  ],
},
  {
    label: "QA & Bugs",
    href: "/qa",
    icon: Bug,
    children: [
      {
        label: "QA Dashboard",
        href: "/qa",
        icon: BarChart3,
      },
      {
        label: "Test Cases",
        href: "/qa/test-cases",
        icon: ClipboardCheck,
      },
      {
        label: "Create Test Case",
        href: "/qa/test-cases/new",
        icon: Plus,
      },
      {
        label: "Test Runs",
        href: "/qa/test-runs",
        icon: Activity,
      },
      {
        label: "Bug Registry",
        href: "/qa/bugs",
        icon: Bug,
      },
      {
        label: "Report Bug",
        href: "/qa/bugs/new",
        icon: Plus,
      },
    ],
  },
  {
    label: "Approval Center",
    href: "/approvals",
    icon: ShieldCheck,
    children: [
      {
        label: "My Approvals",
        href: "/approvals",
        icon: ShieldCheck,
      },
      {
        label: "Approval History",
        href: "/approvals/history",
        icon: Clock3,
      },
      {
        label: "Approval Rules",
        href: "/approvals/rules",
        icon: ClipboardCheck,
      },
      {
        label: "Delegation & Escalation",
        href: "/approvals/delegations",
        icon: Users,
      },
    ],
  },
  {
    label: "Resources",
    href: "/resources",
    icon: Users,
    children: [
      {
        label: "Resource Directory",
        href: "/resources",
        icon: Users,
      },
      {
        label: "Add New Resource",
        href: "/resources/new",
        icon: Plus,
      },
      {
        label: "Project Allocation",
        href: "/resources/allocate",
        icon: UserPlus,
      },
      {
        label: "Allocation Planner",
        href: "/resources/planner",
        icon: CalendarRange,
      },
      {
        label: "Resource Calendar",
        href: "/resources/calendar",
        icon: CalendarDays,
      },
      {
        label: "Bench & Availability",
        href: "/resources/bench",
        icon: Layers,
      },
    ],
  },
  {
    label: "Capacity & Workload",
    href: "/capacity",
    icon: BarChart3,
    children: [
      {
        label: "Team Capacity",
        href: "/capacity",
        icon: BarChart3,
      },
      {
        label: "Individual Capacity",
        href: "/capacity/individual",
        icon: Users,
      },
      {
        label: "Capacity Forecast",
        href: "/capacity/forecast",
        icon: Gauge,
      },
      {
        label: "Utilization Heatmap",
        href: "/capacity/heatmap",
        icon: LayoutGrid,
      },
    ],
  },
  {
    label: "Timesheets",
    href: "/timesheets",
    icon: CalendarDays,
    children: [
      {
        label: "My Timesheet",
        href: "/timesheets",
        icon: Clock3,
      },
      {
        label: "Add Time Entry",
        href: "/timesheets/new",
        icon: Plus,
      },
      {
        label: "Weekly Timesheet",
        href: "/timesheets/weekly",
        icon: CalendarRange,
      },
      {
        label: "Team Timesheets",
        href: "/timesheets/team",
        icon: Users,
      },
      {
        label: "Timesheet Approvals",
        href: "/timesheets/approvals",
        icon: ClipboardCheck,
      },
      {
        label: "Timesheet Analytics",
        href: "/timesheets/analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    label: "Finance",
    href: "/finance",
    icon: WalletCards,
    children: [
      { label: "Financial Overview", href: "/finance", icon: WalletCards },
      { label: "Project Budgets", href: "/finance/budgets", icon: Calculator },
      { label: "Invoices & Receipts", href: "/finance/invoices", icon: FileText },
      { label: "Expenses & Costs", href: "/finance/expenses", icon: HandCoins },
    ],
  },
  {
    label: "Risks & Issues",
    href: "/risks",
    icon: ShieldAlert,
    children: [
      { label: "Risk Register", href: "/risks", icon: ShieldAlert },
      { label: "Issue & Escalation Log", href: "/risks/issues", icon: Activity },
    ],
  },
  {
    label: "Deployments",
    href: "/deployments",
    icon: Rocket,
    children: [
      { label: "Release Pipeline", href: "/deployments", icon: Rocket },
      { label: "Environments Matrix", href: "/deployments/environments", icon: Server },
    ],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: Gauge,
    children: [
      {
        label: "Report Center",
        href: "/reports",
        icon: Gauge,
      },
      {
        label: "Project Performance",
        href: "/reports/projects",
        icon: BarChart3,
      },
      {
        label: "Resource Utilization",
        href: "/reports/resources",
        icon: Users,
      },
      {
        label: "Timesheet & Productivity",
        href: "/reports/timesheets",
        icon: Clock3,
      },
      {
        label: "QA & Defect Analytics",
        href: "/reports/qa",
        icon: Bug,
      },
      {
        label: "Saved, Schedules & Exports",
        href: "/reports/saved",
        icon: ClipboardList,
      },
    ],
  },
  {
    label: "Organization",
    href: "/organization",
    icon: Network,
    children: [
      {
        label: "Organization Profile",
        href: "/organization",
        icon: Network,
      },
      {
        label: "Departments",
        href: "/organization/departments",
        icon: Users,
      },
      {
        label: "Designations",
        href: "/organization/designations",
        icon: BriefcaseBusiness,
      },
      {
        label: "Locations & Branches",
        href: "/organization/locations",
        icon: MapPin,
      },
      {
        label: "Holiday & Working Calendars",
        href: "/organization/calendars",
        icon: CalendarDays,
      },
    ],
  },
 {
  label: "Client Management",
  href: "/clients",
  icon: Users,
  children: [
    {
      label: "Client Registry",
      href: "/clients",
      icon: Users,
    },
    {
      label: "Contacts",
      href: "/clients/contacts",
      icon: UserPlus,
    },
    {
      label: "Contracts",
      href: "/clients/contracts",
      icon: FileText,
    },
    {
      label: "Billing & Invoices",
      href: "/clients/billing",
      icon: HandCoins,
    },
  ],
},
  {
    label: "Teams",
    href: "/teams",
    icon: Users,
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
  },
  {
    label: "Roles & Permissions",
    href: "/roles-permissions",
    icon: ShieldCheck,
  },
  {
    label: "Documents",
    href: "/documents",
    icon: FileText,
    children: [
      {
        label: "Document Repository",
        href: "/documents",
        icon: FileText,
      },
      {
        label: "Upload Document",
        href: "/documents/upload",
        icon: Plus,
      },
      {
        label: "Categories & Governance",
        href: "/documents/categories",
        icon: Layers,
      },
    ],
  },
  {
    label: "Integrations",
    href: "/integrations",
    icon: HardDrive,
    children: [
      {
        label: "Marketplace",
        href: "/integrations",
        icon: LayoutGrid,
      },
      {
        label: "Connection Status",
        href: "/integrations/status",
        icon: Activity,
      },
      {
        label: "Sync History",
        href: "/integrations/sync-history",
        icon: Clock3,
      },
      {
        label: "Integration Logs",
        href: "/integrations/logs",
        icon: ClipboardList,
      },
    ],
  },
  {
    label: "Audit & Compliance",
    href: "/audit",
    icon: ShieldCheck,
    children: [
      {
        label: "Audit Explorer",
        href: "/audit",
        icon: ShieldCheck,
      },
      {
        label: "Security Activity",
        href: "/audit/security",
        icon: Activity,
      },
      {
        label: "Compliance & Retention",
        href: "/audit/compliance",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    children: [
      {
        label: "General Settings",
        href: "/settings",
        icon: Settings,
      },
      {
        label: "Workflow Settings",
        href: "/settings/workflows",
        icon: GitBranch,
      },
      {
        label: "Master Data",
        href: "/settings/master-data",
        icon: Layers,
      },
      {
        label: "System Health",
        href: "/settings/health",
        icon: Activity,
      },
      {
        label: "Feature Flags",
        href: "/settings/feature-flags",
        icon: Flag,
      },
    ],
  },
];

/* =========================================================
   ROUTE HELPERS
========================================================= */

function isRouteActive(pathname: string, href: string): boolean {
  // Registry and organization root routes should not
  // incorrectly match every child route.
  if (href === "/projects" || href === "/organization") {
    return pathname === href;
  }

  if (href === "/brd-requirements/brd-registry") {
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }
  if (href === "/dashboard" || href === "/finance" || href === "/risks" || href === "/deployments" || href === "/milestones" || href === "/timesheets" || href === "/qa" || href === "/documents" || href === "/reports" || href === "/audit" || href === "/integrations" || href === "/settings" || href === "/approvals") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function isGroupActive(
  pathname: string,
  item: NavigationGroup,
): boolean {
  if (item.label === "Finance") {
    return pathname === "/finance" || pathname.startsWith("/finance/");
  }
  if (item.label === "Risks & Issues") {
    return pathname === "/risks" || pathname.startsWith("/risks/");
  }
  if (item.label === "Deployments") {
    return pathname === "/deployments" || pathname.startsWith("/deployments/");
  }
  if (item.label === "Dashboard") {
    return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  }
  if (item.label === "Approval Center") {
    return pathname === "/approvals" || pathname.startsWith("/approvals/");
  }
  if (item.label === "Settings") {
    return pathname === "/settings" || pathname.startsWith("/settings/");
  }
  if (item.label === "Integrations") {
    return pathname === "/integrations" || pathname.startsWith("/integrations/");
  }
  if (item.label === "Audit & Compliance") {
    return pathname === "/audit" || pathname.startsWith("/audit/");
  }
  if (item.label === "Reports") {
    return pathname === "/reports" || pathname.startsWith("/reports/");
  }
  if (item.label === "Documents") {
    return pathname === "/documents" || pathname.startsWith("/documents/");
  }
  if (item.label === "QA & Bugs") {
    return pathname === "/qa" || pathname.startsWith("/qa/");
  }
  if (item.label === "Timesheets") {
    return pathname === "/timesheets" || pathname.startsWith("/timesheets/");
  }
  if (item.label === "Projects") {
    return pathname === "/projects" ||
      pathname.startsWith("/projects/");
  }

  if (item.label === "Organization") {
    return pathname === "/organization" ||
      pathname.startsWith("/organization/");
  }

  if (item.label === "BRD & Requirements") {
    return pathname === "/brd-requirements" ||
      pathname.startsWith("/brd-requirements/");
  }
  if (item.label === "Milestone Management") {
    return (
      pathname === "/milestones" ||
      pathname.startsWith("/milestones/")
    );
  }

  return isRouteActive(pathname, item.href);
}

function getBreadcrumbContext(pathname: string) {
  if (pathname.startsWith("/teams")) {
    return { group: "Organization", page: "Teams Management" };
  }
  if (pathname.startsWith("/users/roles") || pathname.startsWith("/roles-permissions")) {
    return { group: "Users & RBAC", page: "Roles, Permissions & Security Matrix" };
  }
  if (pathname.startsWith("/qa")) {
    if (pathname === "/qa") return { group: "QA & Bug Management", page: "QA Dashboard" };
    if (pathname === "/qa/test-cases") return { group: "QA & Bug Management", page: "Test Case Registry" };
    if (pathname === "/qa/test-cases/new") return { group: "QA & Bug Management", page: "Create Test Case" };
    if (pathname === "/qa/test-runs") return { group: "QA & Bug Management", page: "Test Runs & Execution" };
    if (pathname === "/qa/bugs") return { group: "QA & Bug Management", page: "Bug Registry" };
    if (pathname === "/qa/bugs/new") return { group: "QA & Bug Management", page: "Report Bug" };
    if (pathname.startsWith("/qa/bugs/")) return { group: "QA & Bug Management", page: "Bug Details" };
    return { group: "QA & Bug Management", page: "QA" };
  }
  if (pathname.startsWith("/timesheets")) {
    if (pathname === "/timesheets") return { group: "Timesheets", page: "My Timesheet" };
    if (pathname === "/timesheets/new") return { group: "Timesheets", page: "Add Time Entry" };
    if (pathname === "/timesheets/weekly") return { group: "Timesheets", page: "Weekly Timesheet" };
    if (pathname === "/timesheets/team") return { group: "Timesheets", page: "Team Timesheets" };
    if (pathname === "/timesheets/approvals") return { group: "Timesheets", page: "Timesheet Approvals" };
    if (pathname === "/timesheets/analytics") return { group: "Timesheets", page: "Timesheet Analytics" };
    return { group: "Timesheets", page: "Timesheet" };
  }
  if (pathname.startsWith("/clients")) {
    if (pathname === "/clients") return { group: "Client Management", page: "Client Registry" };
    if (pathname === "/clients/new") return { group: "Client Management", page: "Create Client Wizard" };
    if (pathname === "/clients/contacts") return { group: "Client Management", page: "Client Contacts" };
    if (pathname === "/clients/contacts/new") return { group: "Client Management", page: "New Contact" };
    if (pathname === "/clients/projects") return { group: "Client Management", page: "Client Projects" };
    if (pathname === "/clients/activity") return { group: "Client Management", page: "Activity & Communication" };
    if (pathname.includes("/edit")) return { group: "Client Management", page: "Edit Client" };
    return { group: "Client Management", page: "Client Overview" };
  }
  if (pathname.startsWith("/projects")) {
    if (pathname === "/projects") return { group: "Projects", page: "Project Registry" };
    if (pathname === "/projects/new") return { group: "Projects", page: "Create Project Wizard" };
    if (pathname === "/projects/my") return { group: "Projects", page: "My Projects" };
    if (pathname === "/projects/templates") return { group: "Projects", page: "Templates" };
    if (pathname === "/projects/calendar") return { group: "Projects", page: "Calendar" };
    if (pathname === "/projects/timeline") return { group: "Projects", page: "Timeline" };
    if (pathname === "/projects/financials") return { group: "Projects", page: "Financials" };
    if (pathname === "/projects/health") return { group: "Projects", page: "Health" };
    return { group: "Projects", page: "Project Details" };
  }
  if (pathname.startsWith("/brd-requirements")) {
    if (pathname.includes("change-requests")) return { group: "BRD & Requirements", page: "Change Requests" };
    if (pathname.includes("requirements")) return { group: "BRD & Requirements", page: "Requirements Registry" };
    if (pathname.includes("traceability")) return { group: "BRD & Requirements", page: "Traceability Matrix" };
    if (pathname.includes("approval")) return { group: "BRD & Requirements", page: "Approval Center" };
    return { group: "BRD & Requirements", page: "BRD Registry" };
  }
  if (pathname.startsWith("/milestones")) {
    if (pathname.includes("calendar")) return { group: "Milestones", page: "Milestone Calendar" };
    if (pathname.includes("timeline")) return { group: "Milestones", page: "Milestone Timeline" };
    if (pathname.includes("reports")) return { group: "Milestones", page: "Milestone Reports" };
    return { group: "Milestones", page: "Milestone Registry" };
  }
  if (pathname.startsWith("/sprints")) {
    if (pathname.includes("/new")) return { group: "Sprint Management", page: "Create Sprint" };
    if (pathname.includes("planning")) return { group: "Sprint Management", page: "Sprint Planning" };
    if (pathname.includes("active")) return { group: "Sprint Management", page: "Active Sprint" };
    if (pathname.includes("review")) return { group: "Sprint Management", page: "Sprint Review" };
    if (pathname.includes("retrospective")) return { group: "Sprint Management", page: "Sprint Retrospective" };
    if (pathname.includes("backlog")) return { group: "Sprint Management", page: "Sprint Backlog" };
    if (pathname.includes("standup")) return { group: "Sprint Management", page: "Daily Standup" };
    return { group: "Sprint Management", page: "Sprint Registry" };
  }
  if (pathname.startsWith("/tasks")) {
    if (pathname.includes("/new")) return { group: "Tasks / Kanban", page: "Create Task" };
    if (pathname.includes("kanban")) return { group: "Tasks / Kanban", page: "Kanban Board" };
    if (pathname.includes("backlog")) return { group: "Tasks / Kanban", page: "Backlog Manager" };
    if (pathname.includes("/my")) return { group: "Tasks / Kanban", page: "My Tasks" };
    if (pathname.includes("dependency-graph")) return { group: "Tasks / Kanban", page: "Dependency Graph" };
    if (pathname.includes("audit")) return { group: "Tasks / Kanban", page: "Activity Audit" };
    return { group: "Tasks / Kanban", page: "Task Registry" };
  }
  if (pathname.startsWith("/organization")) {
    if (pathname.includes("departments")) return { group: "Organization", page: "Departments" };
    if (pathname.includes("designations")) return { group: "Organization", page: "Designations" };
    return { group: "Organization", page: "Profile" };
  }
  if (pathname === "/dashboard") return { group: "PMS", page: "Dashboard" };
  if (pathname.startsWith("/users")) return { group: "Administration", page: "Users" };
  if (pathname.startsWith("/roles-permissions")) return { group: "Administration", page: "Roles & Permissions" };
  if (pathname.startsWith("/settings")) return { group: "Administration", page: "Settings" };
  if (pathname.startsWith("/timesheets")) return { group: "Work & Time", page: "Timesheets" };
  if (pathname.startsWith("/qa")) return { group: "Quality Assurance", page: "QA & Bugs" };
  if (pathname.startsWith("/approvals")) return { group: "Approval Engine", page: "Approvals" };
  if (pathname.startsWith("/finance")) return { group: "Finance", page: "Financial Overview" };
  if (pathname.startsWith("/reports")) return { group: "Analytics", page: "Reports" };

  const seg = pathname.replace(/^\//, "").split("/")[0];
  const formatted = seg ? seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ") : "Overview";
  return { group: "PMS", page: formatted };
}

function getTopbarCta(pathname: string) {
  if (pathname.startsWith("/clients")) {
    return { label: "+ Add New Client", href: "/clients/new" };
  }
  if (pathname.startsWith("/projects")) {
    return { label: "+ New Project", href: "/projects/new" };
  }
  if (pathname.startsWith("/tasks")) {
    return { label: "+ New Task", href: "/tasks/new" };
  }
  if (pathname.startsWith("/sprints")) {
    return { label: "+ New Sprint", href: "/sprints/new" };
  }
  return { label: "+ New Project", href: "/projects/new" };
}

/* =========================================================
   SHELL
========================================================= */

export function Shell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const {
    user,
    signOut,
    effectiveRoleCode,
    roleProfile,
  } = useAuth();

  const filteredNavigation = useMemo<NavigationGroup[]>(() => {
    const out: NavigationGroup[] = [];
    for (const group of navigation) {
      if (group.children?.length) {
        const visibleChildren = group.children.filter((c) =>
          canAccessPath(effectiveRoleCode, c.href)
        );
        if (!visibleChildren.length) continue;
        const mainAllowed = canAccessPath(effectiveRoleCode, group.href);
        out.push({
          ...group,
          href: mainAllowed ? group.href : visibleChildren[0].href,
          children: visibleChildren,
        });
      } else if (canAccessPath(effectiveRoleCode, group.href)) {
        out.push(group);
      }
    }
    return out;
  }, [effectiveRoleCode]);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  /* Close dropdown when clicking outside */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* =======================================================
     KEEP CURRENT SECTION EXPANDED
  ======================================================= */

  useEffect(() => {
    const activeGroups = navigation
      .filter(
        (item) =>
          item.children && isGroupActive(pathname, item),
      )
      .map((item) => item.label);

    setExpandedGroups((previous) =>
      Array.from(new Set([...previous, ...activeGroups])),
    );
  }, [pathname]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const allNavigationItems = useMemo(
    () =>
      filteredNavigation.flatMap((item) =>
        item.children
          ? [item, ...item.children]
          : [item],
      ),
    [filteredNavigation],
  );

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return [];

    return allNavigationItems
      .filter((item) => item.label.toLowerCase().includes(query))
      .slice(0, 8);
  }, [allNavigationItems, searchQuery]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      const isShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k";

      if (isShortcut) {
        event.preventDefault();
        setSearchOpen(true);

        requestAnimationFrame(() => {
          searchInputRef.current?.focus();
        });
      }

      if (event.key === "Escape") {
        closeSearch();
        setMobileOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyboard);

    return () => {
      window.removeEventListener("keydown", handleKeyboard);
    };
  }, [closeSearch]);

  /* =======================================================
     NAVIGATION ACTIONS
  ======================================================= */

  function toggleGroup(label: string) {
    setExpandedGroups((previous) =>
      previous.includes(label)
        ? previous.filter((item) => item !== label)
        : [...previous, label],
    );
  }

  function closeMobileNavigation() {
    setMobileOpen(false);
  }

  /* =======================================================
     SIGN OUT
  ======================================================= */

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);
    setSignOutError("");

    try {
      await signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
      setSignOutError(
        "Unable to sign out. Please try again.",
      );
    } finally {
      setSigningOut(false);
    }
  }

  /* =======================================================
     USER DETAILS
  ======================================================= */

  const userName = user?.name?.trim() || "User";

  const userInitials =
    userName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "US";

  const userRole = (() => {
    const roles = user?.roles;

    if (!Array.isArray(roles) || !roles.length) {
      return "User";
    }

    const firstRole = roles[0];

    if (typeof firstRole === "string") {
      return firstRole;
    }

    if (typeof firstRole === "object" && firstRole !== null) {
      const role = firstRole as {
        name?: string;
        code?: string;
      };

      return role.name || role.code || "User";
    }

    return "User";
  })();

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className={[
        "app-shell",
        collapsed ? "is-collapsed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* SIDEBAR */}

      <aside
        id="primary-navigation"
        className={[
          "sidebar",
          mobileOpen ? "mobile-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Main navigation"
      >
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <Grid2X2 size={18} />
          </div>

          {!collapsed && (
            <div>
              <strong>PehalHealthcare</strong>
              <span>Technologies</span>
            </div>
          )}

          <button
            className="mobile-close"
            onClick={closeMobileNavigation}
            type="button"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* NAVIGATION */}

        <nav className="nav-list">
          {NAV_SECTION_ORDER.map((sectionName) => {
            const sectionItems = filteredNavigation.filter(
              (item) => (NAV_SECTION_BY_HREF[item.href] || "Overview") === sectionName
            );
            if (sectionItems.length === 0) return null;

            return (
              <div key={sectionName} className="nav-section">
                {!collapsed && (
                  <div className="nav-section-label">{sectionName}</div>
                )}

                {sectionItems.map((item) => {
                  const Icon = item.icon;
                  const hasChildren = Boolean(item.children?.length);
                  const groupActive = isGroupActive(pathname, item);
                  const isExpanded = expandedGroups.includes(item.label);

                  return (
                    <div
                      key={item.href}
                      className="nav-group"
                    >
                      <div
                        className={[
                          "nav-main-row",
                          groupActive ? "is-active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <Link
                          href={item.href}
                          className={[
                            "nav-item",
                            groupActive ? "active" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          title={item.label}
                          aria-current={
                            !hasChildren && groupActive
                              ? "page"
                              : undefined
                          }
                          onClick={closeMobileNavigation}
                        >
                          <Icon size={14} className="nav-icon" aria-hidden="true" />

                          {!collapsed && (
                            <span>{item.label}</span>
                          )}
                        </Link>

                        {hasChildren && !collapsed && (
                          <button
                            className="nav-expand-button"
                            type="button"
                            aria-label={`${isExpanded ? "Collapse" : "Expand"
                              } ${item.label}`}
                            aria-expanded={isExpanded}
                            onClick={() => toggleGroup(item.label)}
                          >
                            {isExpanded ? (
                              <ChevronDown size={12} />
                            ) : (
                              <ChevronRight size={12} />
                            )}
                          </button>
                        )}
                      </div>

                      {hasChildren &&
                        isExpanded &&
                        !collapsed && (
                          <div className="subnav">
                            {item.children!.map((child) => {
                              const ChildIcon = child.icon;
                              const childActive =
                                isRouteActive(pathname, child.href);

                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  title={child.label}
                                  className={[
                                    childActive ? "active" : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                  aria-current={
                                    childActive ? "page" : undefined
                                  }
                                  onClick={closeMobileNavigation}
                                >
                                  <ChildIcon
                                    size={12}
                                    className="nav-icon"
                                    aria-hidden="true"
                                  />
                                  <span>{child.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* COLLAPSE */}

        <button
          className="collapse-btn"
          onClick={() => setCollapsed((value) => !value)}
          type="button"
          aria-label={
            collapsed ? "Expand menu" : "Collapse menu"
          }
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} />
          ) : (
            <PanelLeftClose size={16} />
          )}

          {!collapsed && "Collapse Menu"}
        </button>
      </aside>

      {/* MOBILE BACKDROP */}

      {mobileOpen && (
        <button
          className="backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={closeMobileNavigation}
        />
      )}

      {/* MAIN AREA */}

      <main className="main-area">
        <header className="topbar">
          {/* MOBILE MENU */}
          <button
            className="mobile-menu"
            onClick={() => setMobileOpen(true)}
            type="button"
            aria-label="Open navigation"
            aria-controls="primary-navigation"
            aria-expanded={mobileOpen}
          >
            <Menu size={20} />
          </button>

          {/* DYNAMIC BREADCRUMB CONTEXT */}
          <div className="topbar-left">
            <div className="topbar-breadcrumb">
              <span className="crumb-root">PMS</span>
              <ChevronRight size={12} className="crumb-sep" />
              <span className="crumb-group">{getBreadcrumbContext(pathname).group}</span>
              <ChevronRight size={12} className="crumb-sep" />
              <span className="crumb-active">{getBreadcrumbContext(pathname).page}</span>
            </div>
          </div>

          {/* TOPBAR ACTIONS */}
          <div className="topbar-actions">
            {/* SEARCH */}
            <div
              className={[
                "global-search",
                searchOpen ? "search-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <Search size={15} aria-hidden="true" />

              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    closeSearch();
                  }

                  if (
                    event.key === "Enter" &&
                    searchResults.length === 1
                  ) {
                    window.location.assign(
                      searchResults[0].href,
                    );
                    closeSearch();
                  }
                }}
                placeholder="Search navigation... (Ctrl + K)"
                aria-label="Search navigation"
                aria-expanded={
                  searchOpen && searchQuery.trim().length > 0
                }
                aria-controls="shell-search-results"
              />

              <kbd>Ctrl K</kbd>

              {searchOpen && searchQuery.trim() && (
                <div
                  id="shell-search-results"
                  className="shell-search-results"
                  role="listbox"
                  aria-label="Navigation search results"
                >
                  {searchResults.length ? (
                    searchResults.map((result) => {
                      const ResultIcon = result.icon;

                      return (
                        <Link
                          key={`${result.label}-${result.href}`}
                          href={result.href}
                          role="option"
                          aria-selected={false}
                          onClick={closeSearch}
                        >
                          <ResultIcon size={15} />
                          <span>{result.label}</span>
                        </Link>
                      );
                    })
                  ) : (
                    <p>No matching navigation items.</p>
                  )}
                </div>
              )}
            </div>

            {/* READ-ONLY INDICATOR FOR AUDITOR */}
            {roleProfile.readOnly && (
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: "#fffbeb",
                  color: "#b45309",
                  border: "1px solid #fde68a",
                  whiteSpace: "nowrap",
                }}
              >
                Read-Only
              </span>
            )}

            {/* DYNAMIC PRIMARY CTA (Hidden for Read-Only / Restricted CTA routes) */}
            {!roleProfile.readOnly && canAccessPath(effectiveRoleCode, getTopbarCta(pathname).href) && (
              <Link
                className="btn primary"
                href={getTopbarCta(pathname).href}
              >
                {getTopbarCta(pathname).label}
              </Link>
            )}

            {/* NOTIFICATIONS */}
            <button
              className="icon-btn"
              type="button"
              aria-label="Notifications"
            >
              <Bell size={17} />
            </button>

            {/* MESSAGES */}
            <button
              className="icon-btn"
              type="button"
              aria-label="Messages"
            >
              <MessageSquare size={17} />
            </button>

            {/* HELP */}
            <button
              className="icon-btn"
              type="button"
              aria-label="Help"
            >
              <CircleHelp size={17} />
            </button>

            {/* DYNAMIC USER MENU WITH DROPDOWN */}
            <div className="user-menu-wrapper" ref={userMenuRef}>
              <button
                className="user-menu-btn"
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                aria-expanded={userDropdownOpen}
                aria-label="User menu"
              >
                <div
                  className="avatar"
                  aria-label={`User ${userName}`}
                >
                  {userInitials}
                </div>

                <div className="user-details">
                  <strong>{userName}</strong>
                  <span>{userRole}</span>
                </div>

                <ChevronDown size={13} aria-hidden="true" />
              </button>

              {userDropdownOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-header">
                    <div className="user-dropdown-name">{userName}</div>
                    <div className="user-dropdown-email">{user?.email || "admin@pehalhealthcare.com"}</div>
                    <span className="user-dropdown-role">{userRole}</span>
                  </div>
                  <div className="user-dropdown-items">
                    {canAccessPath(effectiveRoleCode, "/organization") && (
                      <Link
                        href="/organization"
                        className="user-dropdown-item"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <BriefcaseBusiness size={14} /> Organization Settings
                      </Link>
                    )}
                    {canAccessPath(effectiveRoleCode, "/settings") && (
                      <Link
                        href="/settings"
                        className="user-dropdown-item"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <Settings size={14} /> System Preferences
                      </Link>
                    )}
                    <button
                      className="user-dropdown-item danger"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleSignOut();
                      }}
                      disabled={signingOut}
                      type="button"
                    >
                      <LogOut size={14} />
                      <span>{signingOut ? "Signing out..." : "Sign Out"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {signOutError && (
          <div
            className="shell-error"
            role="alert"
          >
            {signOutError}
          </div>
        )}

        <div className="page-wrap">
          {children}
        </div>
      </main>
    </div>
  );
}