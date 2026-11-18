
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  Download,
  MoreHorizontal,
  Search,
  Star,
  FolderKanban,
  Play,
  CheckCircle2,
  PauseCircle,
  AlertTriangle,
  CalendarDays,
  IndianRupee,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";

import { projects as apiProjects } from "../lib/api";
import { StatusBadge } from "./StatusBadge";

type Project = {
  _id: string;
  projectCode?: string;
  projectName?: string;

  clientId?: {
    _id?: string;
    displayName?: string;
    legalName?: string;
  } | string | null;

  projectManagerId?: {
    _id?: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
  } | string | null;

  status?: string;
  priority?: string;
  projectCategory?: string;
  projectHealth?: string;

  startDate?: string | null;
  targetCompletion?: string | null;
  actualCompletion?: string | null;

  contractValue?: number | null;
  budget?: number | null;
  currency?: string;

  // These are optional because the current Project model
  // does not guarantee project progress fields.
  progress?: number;
  progressPercentage?: number;
  projectProgress?: number;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ApiResult = {
  items: Project[];
  pagination: Pagination;
};

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { label: "All Status", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending Approval", value: "PENDING_APPROVAL" },
  { label: "Active", value: "ACTIVE" },
  { label: "On Hold", value: "ON_HOLD" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Closed", value: "CLOSED" },
  { label: "Archived", value: "ARCHIVED" },
];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

const HEALTH_LABELS: Record<string, string> = {
  GREEN: "Good",
  AMBER: "At Risk",
  RED: "Critical",
};

const getStatusLabel = (value?: string) => {
  if (!value) return "—";

  return STATUS_LABELS[value.toUpperCase()] || value;
};

const getPriorityLabel = (value?: string) => {
  if (!value) return "—";

  return PRIORITY_LABELS[value.toUpperCase()] || value;
};

const getHealthLabel = (value?: string) => {
  if (!value) return "—";

  return HEALTH_LABELS[value.toUpperCase()] || value;
};

const getTone = (value?: string) => {
  const normalized = String(value || "").toUpperCase();

  if (
    normalized === "COMPLETED" ||
    normalized === "CLOSED" ||
    normalized === "GREEN" ||
    normalized === "GOOD"
  ) {
    return "green";
  }

  if (
    normalized === "RED" ||
    normalized === "CRITICAL" ||
    normalized === "HIGH" ||
    normalized === "AT RISK"
  ) {
    return "red";
  }

  if (
    normalized === "ON_HOLD" ||
    normalized === "AMBER" ||
    normalized === "MEDIUM" ||
    normalized === "PENDING_APPROVAL"
  ) {
    return "amber";
  }

  if (
    normalized === "DRAFT" ||
    normalized === "ARCHIVED"
  ) {
    return "purple";
  }

  return "blue";
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (
  amount?: number | null,
  currency = "INR"
) => {
  if (amount === null || amount === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getClientName = (client: Project["clientId"]) => {
  if (!client || typeof client === "string") {
    return "—";
  }

  return client.displayName || client.legalName || "—";
};

const getManagerName = (
  manager: Project["projectManagerId"]
) => {
  if (!manager || typeof manager === "string") {
    return "—";
  }

  if (manager.displayName) {
    return manager.displayName;
  }

  const name = [
    manager.firstName,
    manager.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return name || "—";
};

const getProjectProgress = (project: Project) => {
  const value =
    project.progressPercentage ??
    project.projectProgress ??
    project.progress;

  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  return Math.min(100, Math.max(0, value));
};

/**
 * Supports:
 * 1. Direct backend response
 * 2. Axios response
 * 3. API wrapper returning response.data
 */
const normalizeApiResponse = (response: any): ApiResult => {
  const root = response?.data ?? response;

  const payload =
    root?.data && !Array.isArray(root.data)
      ? root.data
      : root;

  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.results)
        ? payload.results
        : Array.isArray(root)
          ? root
          : [];

  const pagination =
    root?.pagination ||
    payload?.pagination ||
    root?.meta ||
    payload?.meta ||
    {};

  return {
    items,
    pagination: {
      page: Number(pagination.page) || 1,
      limit: Number(pagination.limit) || PAGE_SIZE,
      total: Number(pagination.total) || items.length,
      totalPages:
        Number(
          pagination.totalPages ??
          pagination.pages
        ) || 1,
    },
  };
};

export function ProjectRegistry() {
  const [rows, setRows] = useState<Project[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      try {
        setLoading(true);
        setError("");

        /**
         * The existing API function is reused.
         * Extra query arguments allow pagination/filtering
         * if the API helper supports them.
         */
        const fetchProjects = apiProjects as unknown as (
          params?: Record<string, unknown>
        ) => Promise<any>;

        const response = await fetchProjects({
          page: currentPage,
          limit: PAGE_SIZE,
          search: q.trim() || undefined,
          status: status || undefined,
        });

        const result = normalizeApiResponse(response);

        if (cancelled) return;

        setRows(result.items);
        setPagination(result.pagination);
      } catch (err: any) {
        if (cancelled) return;

        setRows([]);
        setPagination({
          page: 1,
          limit: PAGE_SIZE,
          total: 0,
          totalPages: 1,
        });

        setError(
          err?.response?.data?.message ||
          err?.message ||
          "Unable to load projects. Please try again."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, [currentPage, q, status]);

  const filtered = useMemo(() => {
    return rows.filter((project) => {
      const searchText = [
        project.projectCode,
        project.projectName,
        getClientName(project.clientId),
        getManagerName(project.projectManagerId),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchText.includes(
        q.toLowerCase().trim()
      );

      const matchesStatus =
        !status ||
        project.status?.toUpperCase() === status;

      return matchesSearch && matchesStatus;
    });
  }, [rows, q, status]);

  /**
   * KPI calculations use actual records returned by API.
   * Counts are for the currently loaded page.
   */
  const kpis = useMemo(() => {
    const active = rows.filter(
      (p) => p.status === "ACTIVE"
    ).length;

    const completed = rows.filter(
      (p) =>
        p.status === "COMPLETED" ||
        p.status === "CLOSED"
    ).length;

    const onHold = rows.filter(
      (p) => p.status === "ON_HOLD"
    ).length;

    const atRisk = rows.filter(
      (p) =>
        p.projectHealth === "RED" ||
        p.projectHealth === "AMBER"
    ).length;

    const planned = rows.filter(
      (p) =>
        p.status === "DRAFT" ||
        p.status === "PENDING_APPROVAL"
    ).length;

    const projectValue = rows.reduce(
      (total, project) => {
        const value =
          project.contractValue ??
          project.budget ??
          0;

        return total + Number(value || 0);
      },
      0
    );

    return {
      total: pagination.total,
      active,
      completed,
      onHold,
      atRisk,
      planned,
      projectValue,
    };
  }, [rows, pagination.total]);

  const statusAnalytics = useMemo(() => {
    const counts = [
      {
        label: "In Progress",
        count: rows.filter((p) => p.status === "ACTIVE").length,
        color: "#3b82f6",
      },
      {
        label: "Completed",
        count: rows.filter(
          (p) =>
            p.status === "COMPLETED" ||
            p.status === "CLOSED"
        ).length,
        color: "#22c55e",
      },
      {
        label: "On Hold",
        count: rows.filter((p) => p.status === "ON_HOLD").length,
        color: "#f59e0b",
      },
      {
        label: "At Risk",
        count: rows.filter(
          (p) =>
            p.projectHealth === "RED" ||
            p.projectHealth === "AMBER"
        ).length,
        color: "#ef4444",
      },
      {
        label: "Planned",
        count: rows.filter(
          (p) =>
            p.status === "DRAFT" ||
            p.status === "PENDING_APPROVAL"
        ).length,
        color: "#8b5cf6",
      },
    ];

    const total = counts.reduce(
      (sum, item) => sum + item.count,
      0
    );

    let current = 0;

    const gradient = counts
      .filter((item) => item.count > 0)
      .map((item) => {
        const start = current;
        const percentage =
          total > 0 ? (item.count / total) * 100 : 0;

        current += percentage;

        return `${item.color} ${start}% ${current}%`;
      });

    return {
      counts,
      total,
      background:
        total > 0
          ? `conic-gradient(${gradient.join(", ")})`
          : "conic-gradient(#e5e7eb 0% 100%)",
    };
  }, [rows]);

  const clientAnalytics = useMemo(() => {
    const map = new Map<string, number>();

    rows.forEach((project) => {
      const clientName = getClientName(project.clientId);

      map.set(
        clientName,
        (map.get(clientName) || 0) + 1
      );
    });

    const items = Array.from(map.entries())
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const total = items.reduce(
      (sum, item) => sum + item.count,
      0
    );

    const colors = [
      "#3b82f6",
      "#22c55e",
      "#f59e0b",
      "#8b5cf6",
      "#ec4899",
    ];

    let current = 0;

    const gradient = items
      .filter((item) => item.count > 0)
      .map((item, index) => {
        const start = current;
        const percentage =
          total > 0 ? (item.count / total) * 100 : 0;

        current += percentage;

        return `${colors[index]} ${start}% ${current}%`;
      });

    return {
      items,
      total,
      background:
        total > 0
          ? `conic-gradient(${gradient.join(", ")})`
          : "conic-gradient(#e5e7eb 0% 100%)",
    };
  }, [rows]);

  const projectValueAnalytics = useMemo(() => {
    return [...rows]
      .map((project) => ({
        name: project.projectName || project.projectCode || "Project",
        value: Number(
          project.contractValue ??
          project.budget ??
          0
        ),
      }))
      .filter((project) => project.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [rows]);

  const maxProjectValue = Math.max(
    ...projectValueAnalytics.map((p) => p.value),
    1
  );

  const handleReset = () => {
    setQ("");
    setStatus("");
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    if (
      page < 1 ||
      page > pagination.totalPages ||
      page === currentPage
    ) {
      return;
    }

    setCurrentPage(page);
  };

  const startEntry =
    pagination.total === 0
      ? 0
      : (currentPage - 1) * pagination.limit + 1;

  const endEntry = Math.min(
    currentPage * pagination.limit,
    pagination.total
  );

  const pageNumbers = Array.from(
    {
      length: Math.min(pagination.totalPages, 5),
    },
    (_, index) => index + 1
  );

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-head">
        <div>
          <div className="eyebrow">
            PROJECTS / REGISTRY
          </div>

          <h1>Project Registry</h1>

          <p>
            Centralized registry of all projects across
            clients and organization.
          </p>
        </div>

        <Link
          href="/projects/new"
          className="btn primary"
        >
          + New Project
        </Link>
      </div>

      {/* KPI CARDS */}
      <div className="kpi-grid">
        {[
          {
            label: "Total Projects",
            value: kpis.total,
            description: "All organization projects",
            icon: FolderKanban,
            tone: "blue",
          },
          {
            label: "In Progress",
            value: kpis.active,
            description: "On current page",
            icon: Play,
            tone: "green",
          },
          {
            label: "Completed",
            value: kpis.completed,
            description: "On current page",
            icon: CheckCircle2,
            tone: "green",
          },
          {
            label: "On Hold",
            value: kpis.onHold,
            description: "On current page",
            icon: PauseCircle,
            tone: "amber",
          },
          {
            label: "At Risk",
            value: kpis.atRisk,
            description: "Amber / Red health",
            icon: AlertTriangle,
            tone: "red",
          },
          {
            label: "Planned",
            value: kpis.planned,
            description: "Draft / Pending approval",
            icon: CalendarDays,
            tone: "purple",
          },
          {
            label: "Project Value",
            value: formatCurrency(kpis.projectValue),
            description: "Loaded projects only",
            icon: IndianRupee,
            tone: "green",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              className="kpi card"
              key={item.label}
            >
              <span className={`kpi-icon ${item.tone}`}>
                <Icon size={20} />
              </span>

              <div>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
                <em>{item.description}</em>
              </div>
            </div>
          );
        })}
      </div>

      {/* REGISTRY AND FILTERS */}
      <div className="registry-layout">
        <section className="card registry-card">
          <div className="tabs registry-tabs">
            <b>All Projects</b>
            <span>Active Projects</span>
            <span>My Projects</span>
            <span>Starred</span>
            <span>Archived</span>
          </div>

          {/* TOOLBAR */}
          <div className="toolbar">
            <div className="search-box">
              <Search size={15} />

              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by project name, code, client, manager..."
              />
            </div>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>

            <button className="btn outline" type="button">
              All Types <ChevronDown size={13} />
            </button>

            <button className="btn outline" type="button">
              <SlidersHorizontal size={14} />
              More Filters
            </button>

            <button
              className="btn outline"
              type="button"
              onClick={handleReset}
            >
              Reset
            </button>

            <button
              className="btn outline"
              type="button"
              onClick={() => {
                window.print();
              }}
            >
              <Download size={14} />
              Export / Print
            </button>
          </div>

          {/* TABLE */}
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Project Code</th>
                  <th>Project Name</th>
                  <th>Client</th>
                  <th>Manager</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Progress</th>
                  <th>Type</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Project Value</th>
                  <th>Health</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {!loading &&
                  filtered.map((project) => {
                    const progress =
                      getProjectProgress(project);

                    const statusLabel =
                      getStatusLabel(project.status);

                    const priorityLabel =
                      getPriorityLabel(project.priority);

                    const healthLabel =
                      getHealthLabel(project.projectHealth);

                    const value =
                      project.contractValue ??
                      project.budget;

                    return (
                      <tr key={project._id}>
                        <td>
                          <Star size={14} className="muted" />
                        </td>

                        <td>
                          <Link
                            href={`/projects/${project._id}`}
                            className="link"
                          >
                            {project.projectCode || "—"}
                          </Link>
                        </td>

                        <td>
                          <Link
                            href={`/projects/${project._id}`}
                            className="link strong"
                          >
                            {project.projectName || "Untitled Project"}
                          </Link>
                        </td>

                        <td>
                          {getClientName(project.clientId)}
                        </td>

                        <td>
                          {getManagerName(
                            project.projectManagerId
                          )}
                        </td>

                        <td>
                          <StatusBadge
                            tone={getTone(project.status)}
                          >
                            {statusLabel}
                          </StatusBadge>
                        </td>

                        <td>
                          <StatusBadge
                            tone={getTone(project.priority)}
                          >
                            {priorityLabel}
                          </StatusBadge>
                        </td>

                        <td>
                          <div className="progress-row">
                            <div>
                              <i
                                style={{
                                  width:
                                    progress === null
                                      ? "0%"
                                      : `${progress}%`,
                                }}
                              />
                            </div>

                            <span>
                              {progress === null
                                ? "—"
                                : `${progress}%`}
                            </span>
                          </div>
                        </td>

                        <td>
                          {project.projectCategory || "—"}
                        </td>

                        <td>
                          {formatDate(project.startDate)}
                        </td>

                        <td>
                          {formatDate(project.targetCompletion)}
                        </td>

                        <td>
                          {formatCurrency(
                            value,
                            project.currency || "INR"
                          )}
                        </td>

                        <td>
                          <StatusBadge
                            tone={getTone(project.projectHealth)}
                          >
                            {healthLabel}
                          </StatusBadge>
                        </td>

                        <td>
                          <Link
                            href={`/projects/${project._id}`}
                            className="icon-btn small"
                            aria-label="Open project"
                          >
                            <MoreHorizontal size={15} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={14}>
                      <div className="empty-state">
                        {error
                          ? "Projects could not be loaded."
                          : "No projects found."}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {loading && (
              <div className="loading-strip">
                Loading live project data…
              </div>
            )}

            {error && !loading && (
              <div className="loading-strip error-text">
                {error}
                <button
                  type="button"
                  className="btn outline"
                  onClick={() => setCurrentPage((p) => p)}
                >
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* PAGINATION */}
          <div className="table-footer">
            <span>
              Showing {startEntry} to {endEntry} of{" "}
              {pagination.total} entries
            </span>

            <div className="pagination">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => goToPage(currentPage - 1)}
              >
                ‹
              </button>

              {pageNumbers.map((page) => (
                <button
                  type="button"
                  key={page}
                  className={
                    currentPage === page ? "active" : ""
                  }
                  onClick={() => goToPage(page)}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                disabled={
                  currentPage >= pagination.totalPages
                }
                onClick={() => goToPage(currentPage + 1)}
              >
                ›
              </button>
            </div>

            <select
              value={PAGE_SIZE}
              disabled
              aria-label="Rows per page"
            >
              <option value={PAGE_SIZE}>
                {PAGE_SIZE} / page
              </option>
            </select>
          </div>
        </section>

        {/* FILTER SIDEBAR */}
        <aside className="filter-card card">
          <div className="filter-title">
            <b>Filters</b>
            <a>Hide</a>
          </div>

          <h4>Quick Filters</h4>

          <div className="quick-grid">
            <button type="button">
              ⚠ High Priority
              <b>
                {
                  rows.filter(
                    (p) =>
                      p.priority === "HIGH" ||
                      p.priority === "CRITICAL"
                  ).length
                }
              </b>
            </button>

            <button type="button">
              ♙ My Projects
              <b>—</b>
            </button>

            <button type="button">
              ◫ Due This Month
              <b>
                {
                  rows.filter((p) => {
                    if (!p.targetCompletion) return false;

                    const date = new Date(p.targetCompletion);
                    const now = new Date();

                    return (
                      date.getMonth() === now.getMonth() &&
                      date.getFullYear() === now.getFullYear()
                    );
                  }).length
                }
              </b>
            </button>

            <button type="button">
              ⚠ Overdue
              <b>
                {
                  rows.filter((p) => {
                    if (
                      !p.targetCompletion ||
                      ["COMPLETED", "CLOSED", "CANCELLED"].includes(
                        p.status || ""
                      )
                    ) {
                      return false;
                    }

                    return (
                      new Date(p.targetCompletion).getTime() <
                      Date.now()
                    );
                  }).length
                }
              </b>
            </button>
          </div>

          <h4>Advanced Filters</h4>

          {[
            "Date Range",
            "Clients",
            "Project Manager",
            "Project Type",
            "Status",
            "Priority",
            "Health",
          ].map((label) => (
            <label key={label}>
              {label}

              <div className="fake-select">
                {label === "Date Range"
                  ? "Select date range"
                  : `All ${label.replace("Project ", "")}`}

                <ChevronDown size={13} />
              </div>
            </label>
          ))}

          <div className="range">
            <input placeholder="Min" />
            <span>to</span>
            <input placeholder="Max" />
          </div>

          <label className="check">
            <input type="checkbox" />
            Show Archived Projects
          </label>

          <button
            className="btn primary wide"
            type="button"
            onClick={() => {
              setStatus("ARCHIVED");
              setCurrentPage(1);
            }}
          >
            Apply Filters
          </button>

          <button
            className="btn outline wide"
            type="button"
            onClick={handleReset}
          >
            Clear Filters
          </button>
        </aside>
      </div>

      {/* ANALYTICS */}
      <div className="analytics-grid">
        <AnalyticsCard
          title="Projects by Status"
          type="donut"
          statusAnalytics={statusAnalytics}
        />

        <AnalyticsCard
          title="Projects by Client"
          type="donut2"
          clientAnalytics={clientAnalytics}
        />

        <AnalyticsCard
          title="Upcoming Milestones"
          type="milestones"
        />

        <AnalyticsCard
          title="Project Value Overview"
          type="bars"
          projectValueAnalytics={projectValueAnalytics}
          maxProjectValue={maxProjectValue}
        />
      </div>
    </div>
  );
}

function AnalyticsCard({
  title,
  type,
  statusAnalytics,
  clientAnalytics,
  projectValueAnalytics = [],
  maxProjectValue = 1,
}: {
  title: string;
  type: string;
  statusAnalytics?: {
    counts: {
      label: string;
      count: number;
      color: string;
    }[];
    total: number;
    background: string;
  };
  clientAnalytics?: {
    items: {
      name: string;
      count: number;
    }[];
    total: number;
    background: string;
  };
  projectValueAnalytics?: {
    name: string;
    value: number;
  }[];
  maxProjectValue?: number;
}) {
  return (
    <div className="card analytic">
      <div className="section-head">
        <b>{title}</b>
      </div>

      {type === "donut" && statusAnalytics && (
        <div className="donut-wrap">
          <div
            className="donut"
            style={{
              background: statusAnalytics.background,
            }}
          />

          <div className="legend">
            {statusAnalytics.counts.map((item) => (
              <span key={item.label}>
                <i
                  style={{
                    background: item.color,
                  }}
                />

                {item.label}

                <b>
                  {item.count}
                  {statusAnalytics.total > 0
                    ? ` (${(
                        (item.count / statusAnalytics.total) *
                        100
                      ).toFixed(1)}%)`
                    : ""}
                </b>
              </span>
            ))}

            {statusAnalytics.total === 0 && (
              <small>No project data available.</small>
            )}
          </div>
        </div>
      )}

      {type === "donut2" && clientAnalytics && (
        <div className="donut-wrap">
          <div
            className="donut donut2"
            style={{
              background: clientAnalytics.background,
            }}
          />

          <div className="legend">
            {clientAnalytics.items.map((item, index) => (
              <span key={item.name}>
                <i
                  style={{
                    background: [
                      "#3b82f6",
                      "#22c55e",
                      "#f59e0b",
                      "#8b5cf6",
                      "#ec4899",
                    ][index],
                  }}
                />

                {item.name}

                <b>{item.count}</b>
              </span>
            ))}

            {clientAnalytics.items.length === 0 && (
              <small>No client project data available.</small>
            )}
          </div>
        </div>
      )}

      {type === "milestones" && (
        <div className="milestone-list">
          <div className="empty-state">
            Upcoming milestone data is not available from the
            project registry API yet.
          </div>
        </div>
      )}

      {type === "bars" && (
        <div className="bars">
          {projectValueAnalytics.length > 0 ? (
            projectValueAnalytics.map((item) => (
              <span
                key={item.name}
                title={`${item.name}: ${formatCurrency(item.value)}`}
                style={{
                  height: `${Math.max(
                    5,
                    (item.value / maxProjectValue) * 100
                  )}%`,
                }}
              >
                <i />
              </span>
            ))
          ) : (
            <div className="empty-state">
              No contract value or budget data available.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
