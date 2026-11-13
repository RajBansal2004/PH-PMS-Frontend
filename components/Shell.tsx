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
  children?: NavigationItem[];
};

/* =========================================================
   NAVIGATION CONFIGURATION
========================================================= */

const navigation: NavigationGroup[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
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
      href: "/sprints/SPR-003/planning",
      icon: ClipboardList,
    },
    {
      label: "Active Sprint",
      href: "/sprints/SPR-004/active",
      icon: Activity,
    },
    {
      label: "Sprint Review",
      href: "/sprints/review/SPR-005",
      icon: ClipboardCheck,
    },
    {
      label: "Sprint Retrospective",
      href: "/sprints/retrospective/SPR-006",
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
      label: "Kanban Board",
      href: "/tasks/kanban",
      icon: LayoutGrid,
    },
  ],
},
  {
    label: "QA & Bugs",
    href: "/qa",
    icon: Bug,
  },
  {
    label: "Approval Center",
    href: "/approvals",
    icon: ShieldCheck,
  },
  {
    label: "Resources",
    href: "/resources",
    icon: Users,
  },
  {
    label: "Timesheets",
    href: "/timesheets",
    icon: CalendarDays,
  },
  {
    label: "Finance",
    href: "/finance",
    icon: WalletCards,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: Gauge,
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
  },
  {
    label: "Integrations",
    href: "/integrations",
    icon: HardDrive,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
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
  if (href === "/milestones") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function isGroupActive(
  pathname: string,
  item: NavigationGroup,
): boolean {
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

/* =========================================================
   SHELL
========================================================= */

export function Shell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  const searchInputRef = useRef<HTMLInputElement>(null);

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
      navigation.flatMap((item) =>
        item.children
          ? [item, ...item.children]
          : [item],
      ),
    [],
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
          {navigation.map((item) => {
            const Icon = item.icon;
            const hasChildren = Boolean(item.children?.length);
            const groupActive = isGroupActive(pathname, item);
            const isExpanded = expandedGroups.includes(item.label);

            return (
              <div
                key={item.href}
                className="nav-group"
              >
                <div className="nav-main-row">
                  <Link
                    href={item.href}
                    className={[
                      "nav-item",
                      groupActive ? "active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    title={collapsed ? item.label : undefined}
                    aria-current={
                      !hasChildren && groupActive
                        ? "page"
                        : undefined
                    }
                    onClick={closeMobileNavigation}
                  >
                    <Icon size={16} aria-hidden="true" />

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
                        <ChevronDown size={13} />
                      ) : (
                        <ChevronRight size={13} />
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
                              size={14}
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

          {/* PROJECT CONTEXT */}

          <div className="topbar-left">
            <Link
              href="/projects"
              className="project-context"
              aria-label="Go to project registry"
            >
              <span aria-hidden="true">▣</span>
              PRJ-00075
              <ChevronDown size={12} />
            </Link>
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
                placeholder="Search navigation..."
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

            {/* NEW PROJECT */}

            <Link
              className="btn primary"
              href="/projects/new"
            >
              + New Project
            </Link>

            {/* NOTIFICATIONS */}

            <button
              className="icon-btn"
              type="button"
              aria-label="Notifications"
            >
              <Bell size={17} />
              <i aria-hidden="true">3</i>
            </button>

            {/* MESSAGES */}

            <button
              className="icon-btn"
              type="button"
              aria-label="Messages"
            >
              <MessageSquare size={17} />
              <i aria-hidden="true">2</i>
            </button>

            {/* HELP */}

            <button
              className="icon-btn"
              type="button"
              aria-label="Help"
            >
              <CircleHelp size={17} />
            </button>

            {/* USER */}

            <div className="user-menu">
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

              <button
                onClick={handleSignOut}
                title="Sign out"
                type="button"
                aria-label="Sign out"
                disabled={signingOut}
              >
                <LogOut size={14} />
              </button>
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