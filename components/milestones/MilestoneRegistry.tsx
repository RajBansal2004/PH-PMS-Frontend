
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  Eye,
  FilePlus2,
  Flag,
  ListFilter,
  MoreVertical,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { milestones as getMilestonesApi } from "../../lib/api";
import type {
  Milestone,
  MilestonePriority,
  MilestoneStatus,
} from "../../lib/milestones/types";

import "./milestones.css";

const STATUS_OPTIONS = [
  "Completed",
  "In Progress",
  "Upcoming",
  "At Risk",
  "Overdue",
  "On Hold",
  "Cancelled",
];

const PRIORITY_OPTIONS = ["Critical", "High", "Medium", "Low"];

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

function StatusBadge({ status }: { status: MilestoneStatus }) {
  return (
    <span className={`ml-status ml-status-${status.toLowerCase().replaceAll(" ", "-")}`}>
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: MilestonePriority }) {
  return (
    <span className={`ml-priority ml-priority-${priority.toLowerCase()}`}>
      <span />
      {priority}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div className="ml-progress">
      <span>{safeValue}%</span>
      <div className="ml-progress-track">
        <div
          className={`ml-progress-fill ${
            safeValue === 100 ? "is-complete" : ""
          }`}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  tone,
  icon,
}: {
  title: string;
  value: number;
  subtitle: string;
  tone: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="ml-metric-card">
      <div className={`ml-metric-icon ${tone}`}>{icon}</div>
      <div className="ml-metric-content">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{subtitle}</small>
      </div>
    </article>
  );
}

export default function MilestoneRegistry() {
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMilestones() {
      try {
        setLoading(true);
        const res = await getMilestonesApi();
        if (Array.isArray(res)) {
          const mapped: Milestone[] = res.map((m: any) => ({
            id: m.milestoneCode || m.code || m._id || m.id,
            title: m.name || "Milestone",
            projectId: m.projectId?._id || m.projectId || "PRJ",
            projectName: m.projectId?.projectName || "Project",
            type: m.billingType || "Delivery",
            status: (m.status === "COMPLETED" ? "Completed" : m.status === "IN_PROGRESS" ? "In Progress" : m.status === "AT_RISK" ? "At Risk" : "Upcoming") as MilestoneStatus,
            plannedStart: m.startDate ? m.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
            plannedEnd: m.dueDate ? m.dueDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
            actualEnd: m.completedAt ? m.completedAt.slice(0, 10) : undefined,
            progress: m.progress || 0,
            tasksTotal: m.taskCount || 0,
            tasksCompleted: m.completedTaskCount || 0,
            deliverablesTotal: 0,
            deliverablesCompleted: 0,
            billingPercentage: m.weight || 0,
            owner: {
              id: m.ownerId || "owner",
              name: m.ownerName || "Unassigned",
              initials: (m.ownerName || "UN").slice(0, 2).toUpperCase(),
            },
            priority: (m.priority || "Medium") as MilestonePriority,
          }));
          setMilestones(mapped);
        } else {
          setMilestones([]);
        }
      } catch (err) {
        console.warn("Failed to load milestones:", err);
        setMilestones([]);
      } finally {
        setLoading(false);
      }
    }
    loadMilestones();
  }, []);

  const projects = useMemo(
    () => Array.from(new Map(
      milestones.map((item) => [item.projectId, item.projectName]),
    ).entries()),
    [milestones],
  );

  const owners = useMemo(
    () => Array.from(new Map(
      milestones.map((item) => [item.owner.id, item.owner.name]),
    ).entries()),
    [milestones],
  );

  const filteredMilestones = useMemo(() => {
    const query = search.trim().toLowerCase();

    return milestones
      .filter((item) => {
        const matchesSearch =
          !query ||
          [
            item.id,
            item.title,
            item.projectId,
            item.projectName,
            item.owner.name,
            item.type,
          ].some((value) => value.toLowerCase().includes(query));

        return (
          matchesSearch &&
          (projectFilter === "all" || item.projectId === projectFilter) &&
          (statusFilter === "all" || item.status === statusFilter) &&
          (typeFilter === "all" || item.type === typeFilter) &&
          (ownerFilter === "all" || item.owner.id === ownerFilter) &&
          (priorityFilter === "all" || item.priority === priorityFilter)
        );
      })
      .sort((a, b) =>
        sortOrder === "asc"
          ? a.plannedStart.localeCompare(b.plannedStart)
          : b.plannedStart.localeCompare(a.plannedStart),
      );
  }, [
    milestones,
    search,
    projectFilter,
    statusFilter,
    typeFilter,
    ownerFilter,
    priorityFilter,
    sortOrder,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredMilestones.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedMilestones = filteredMilestones.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const count = (status: MilestoneStatus) =>
    milestones.filter((item) => item.status === status).length;

  const total = milestones.length;
  const completed = count("Completed");
  const inProgress = count("In Progress");
  const upcoming = count("Upcoming");
  const atRisk = count("At Risk");
  const overdue = count("Overdue");

  const clearFilters = () => {
    setSearch("");
    setProjectFilter("all");
    setStatusFilter("all");
    setTypeFilter("all");
    setOwnerFilter("all");
    setPriorityFilter("all");
    setPage(1);
  };

  const updateFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const exportCsv = () => {
    const headers = [
      "Milestone ID",
      "Title",
      "Project",
      "Type",
      "Planned Start",
      "Planned End",
      "Status",
      "Progress",
      "Priority",
      "Owner",
    ];

    const rows = filteredMilestones.map((item) => [
      item.id,
      item.title,
      item.projectName,
      item.type,
      item.plannedStart,
      item.plannedEnd,
      item.status,
      `${item.progress}%`,
      item.priority,
      item.owner.name,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "milestone-registry.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="milestone-registry">
      <div className="ml-page-heading">
        <div className="ml-heading-title">
          <div className="ml-heading-icon">
            <Flag size={21} />
          </div>
          <div>
            <h1>Milestone Registry</h1>
            <p>Central repository of all project milestones and their progress</p>
          </div>
        </div>

        <div className="ml-heading-actions">
          <Link href="/milestones/new" className="ml-btn ml-btn-primary">
            <Plus size={15} />
            Create Milestone
          </Link>
          <button type="button" className="ml-btn" onClick={() => window.alert("Import workflow will be connected with the backend.")}>
            <Upload size={15} />
            Import
          </button>
          <button type="button" className="ml-btn" onClick={exportCsv}>
            <Download size={15} />
            Export
            <ChevronDown size={13} />
          </button>
          <button
            type="button"
            className="ml-btn"
            onClick={() => window.print()}
          >
            More Actions
            <ChevronDown size={13} />
          </button>
        </div>
      </div>

      <div className="ml-metrics-grid">
        <MetricCard title="Total Milestones" value={total} subtitle="Across all projects" tone="blue" icon={<Flag size={19} />} />
        <MetricCard title="Completed" value={completed} subtitle={`${total ? ((completed / total) * 100).toFixed(2) : 0}% of total`} tone="green" icon={<CheckCircle2 size={19} />} />
        <MetricCard title="In Progress" value={inProgress} subtitle={`${total ? ((inProgress / total) * 100).toFixed(2) : 0}% of total`} tone="orange" icon={<Clock3 size={19} />} />
        <MetricCard title="Upcoming" value={upcoming} subtitle={`${total ? ((upcoming / total) * 100).toFixed(2) : 0}% of total`} tone="blue" icon={<CalendarDays size={19} />} />
        <MetricCard title="At Risk" value={atRisk} subtitle={`${total ? ((atRisk / total) * 100).toFixed(2) : 0}% of total`} tone="red" icon={<AlertTriangle size={19} />} />
        <MetricCard title="Overdue" value={overdue} subtitle={`${total ? ((overdue / total) * 100).toFixed(2) : 0}% of total`} tone="red" icon={<CircleAlert size={19} />} />
      </div>

      <div className="ml-filter-panel">
        <label className="ml-search">
          <Search size={15} />
          <input
            value={search}
            onChange={(event) => updateFilter(setSearch, event.target.value)}
            placeholder="Search by Milestone ID, Title, Description..."
          />
        </label>

        <label className="ml-filter-field">
          <span>Project</span>
          <select value={projectFilter} onChange={(event) => updateFilter(setProjectFilter, event.target.value)}>
            <option value="all">All Projects</option>
            {projects.map(([id, name]) => (
              <option key={id} value={id}>{id} - {name}</option>
            ))}
          </select>
        </label>

        <label className="ml-filter-field">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => updateFilter(setStatusFilter, event.target.value)}>
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>

        <label className="ml-filter-field">
          <span>Milestone Type</span>
          <select value={typeFilter} onChange={(event) => updateFilter(setTypeFilter, event.target.value)}>
            <option value="all">All Types</option>
            {["Project", "Phase", "Sprint", "Release", "Operational"].map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>

        <label className="ml-filter-field">
          <span>Owner</span>
          <select value={ownerFilter} onChange={(event) => updateFilter(setOwnerFilter, event.target.value)}>
            <option value="all">All Owners</option>
            {owners.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>

        <label className="ml-filter-field">
          <span>Priority</span>
          <select value={priorityFilter} onChange={(event) => updateFilter(setPriorityFilter, event.target.value)}>
            <option value="all">All Priorities</option>
            {PRIORITY_OPTIONS.map((priority) => <option key={priority}>{priority}</option>)}
          </select>
        </label>

        <button
          type="button"
          className="ml-btn ml-filter-more"
          onClick={() => setShowMoreFilters((value) => !value)}
          aria-expanded={showMoreFilters}
        >
          <ListFilter size={14} />
          More Filters
        </button>

        <button type="button" className="ml-clear-btn" onClick={clearFilters}>
          Clear
        </button>

        {showMoreFilters && (
          <div className="ml-extra-filters">
            <span>Advanced filters</span>
            <p>Additional date range and dependency filters will be enabled when the milestone API is connected.</p>
          </div>
        )}
      </div>

      <div className="ml-main-grid">
        <div className="ml-left-column">
          <section className="ml-panel ml-table-panel">
            <div className="ml-panel-heading">
              <h2>Milestone List ({filteredMilestones.length})</h2>
              <button
                type="button"
                className="ml-icon-button"
                aria-label="Toggle planned start sorting"
                onClick={() => setSortOrder((value) => value === "asc" ? "desc" : "asc")}
                title="Sort by planned start"
              >
                {sortOrder === "asc" ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
              </button>
            </div>

            <div className="ml-table-scroll">
              <table className="ml-table">
                <thead>
                  <tr>
                    <th>Milestone ID</th>
                    <th>Milestone Title</th>
                    <th>Project</th>
                    <th>Type</th>
                    <th>Planned Start</th>
                    <th>Planned End</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Priority</th>
                    <th>Owner</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMilestones.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link className="ml-id-link" href={`/milestones/${item.id}`}>
                          {item.id}
                        </Link>
                      </td>
                      <td className="ml-title-cell">{item.title}</td>
                      <td>
                        <span className="ml-project-code">{item.projectId}</span>
                      </td>
                      <td>{item.type}</td>
                      <td>{formatDate(item.plannedStart)}</td>
                      <td>{formatDate(item.plannedEnd)}</td>
                      <td><StatusBadge status={item.status} /></td>
                      <td><ProgressBar value={item.progress} /></td>
                      <td><PriorityBadge priority={item.priority} /></td>
                      <td>
                        <div className="ml-owner">
                          <span className="ml-avatar">{item.owner.initials}</span>
                          <span>{item.owner.name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="ml-row-actions">
                          <Link href={`/milestones/${item.id}`} aria-label={`View ${item.id}`} title="View milestone">
                            <Eye size={15} />
                          </Link>
                          <button type="button" aria-label={`More actions for ${item.id}`} title="More actions" onClick={() => window.alert(`Actions for ${item.id} will be connected with the backend.`)}>
                            <MoreVertical size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!paginatedMilestones.length && (
                    <tr>
                      <td colSpan={11} className="ml-empty-state">
                        No milestones found. Try changing your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="ml-pagination">
              <span>
                Showing {filteredMilestones.length ? (currentPage - 1) * pageSize + 1 : 0}
                {" "}to{" "}
                {Math.min(currentPage * pageSize, filteredMilestones.length)}
                {" "}of {filteredMilestones.length} milestones
              </span>

              <div className="ml-pagination-controls">
                <button type="button" disabled={currentPage === 1} onClick={() => setPage(1)}>«</button>
                <button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                  <ChevronLeft size={14} />
                </button>
                <span className="ml-current-page">{currentPage}</span>
                <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                  <ChevronRight size={14} />
                </button>
                <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)}>»</button>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  aria-label="Rows per page"
                >
                  <option value={5}>5 / page</option>
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
            </div>
          </section>

          <div className="ml-bottom-grid">
            <section className="ml-panel ml-chart-panel">
              <h2>Milestones by Project</h2>
              <div className="ml-project-breakdown">
                {projects.map(([id, name]) => {
                  const projectCount = milestones.filter((item) => item.projectId === id).length;
                  const percent = total ? (projectCount / total) * 100 : 0;

                  return (
                    <div className="ml-breakdown-row" key={id}>
                      <span>{id} - {name}</span>
                      <div className="ml-mini-track">
                        <span style={{ width: `${percent}%` }} />
                      </div>
                      <strong>{projectCount}</strong>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="ml-panel ml-chart-panel">
              <h2>Milestones by Priority</h2>
              <div className="ml-priority-chart">
                {PRIORITY_OPTIONS.map((priority) => {
                  const value = milestones.filter((item) => item.priority === priority).length;
                  const height = Math.max(4, (value / Math.max(1, total)) * 100);

                  return (
                    <div className="ml-priority-column" key={priority}>
                      <strong>{value}</strong>
                      <span className={`ml-bar ml-bar-${priority.toLowerCase()}`} style={{ height: `${height}%` }} />
                      <small>{priority}</small>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="ml-panel ml-chart-panel">
              <h2>Overdue & At Risk</h2>
              <div className="ml-risk-summary">
                <div className="ml-risk-number">
                  <strong>{atRisk + overdue}</strong>
                  <span>Total</span>
                </div>
                <div>
                  <p><i className="ml-dot red" /> At Risk <strong>{atRisk}</strong></p>
                  <p><i className="ml-dot dark-red" /> Overdue <strong>{overdue}</strong></p>
                </div>
              </div>
            </section>
          </div>

          <section className="ml-panel ml-activity-table">
            <div className="ml-panel-heading">
              <h2>Recent Milestone Activity</h2>
              <Link href="/milestones/reports">View All Activity →</Link>
            </div>
            <div className="ml-table-scroll">
              <table className="ml-table">
                <thead>
                  <tr>
                    <th>Milestone ID</th>
                    <th>Milestone Title</th>
                    <th>Project</th>
                    <th>Status Change</th>
                    <th>Changed By</th>
                    <th>Changed On</th>
                    <th>Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.length === 0 ? (
                    <tr><td colSpan={7} className="ml-empty" style={{ textAlign: "center", padding: "1.5rem" }}>No milestone activity recorded yet.</td></tr>
                  ) : (
                    milestones.slice(0, 5).map((m) => (
                      <tr key={m.id}>
                        <td><Link className="ml-id-link" href={`/milestones/${m.id}`}>{m.id}</Link></td>
                        <td>{m.title}</td>
                        <td>{m.projectName}</td>
                        <td className="ml-activity-change">{m.status}</td>
                        <td>{m.owner.name}</td>
                        <td>{m.plannedStart}</td>
                        <td>—</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="ml-right-column">
          <section className="ml-panel ml-summary-panel">
            <h2>Milestone Summary</h2>
            <div className="ml-summary-content">
              <div
                className="ml-donut"
                style={{
                  background: `conic-gradient(
                    #079669 0% ${(completed / Math.max(total, 1)) * 100}%,
                    #f59e0b ${(completed / Math.max(total, 1)) * 100}% ${((completed + inProgress) / Math.max(total, 1)) * 100}%,
                    #2463eb ${((completed + inProgress) / Math.max(total, 1)) * 100}% ${((completed + inProgress + upcoming) / Math.max(total, 1)) * 100}%,
                    #ef4444 ${((completed + inProgress + upcoming) / Math.max(total, 1)) * 100}% 100%
                  )`,
                }}
              >
                <div>
                  <strong>{total}</strong>
                  <span>Total</span>
                </div>
              </div>
              <div className="ml-legend">
                <p><i className="ml-dot green" /> Completed <strong>{completed}</strong></p>
                <p><i className="ml-dot orange" /> In Progress <strong>{inProgress}</strong></p>
                <p><i className="ml-dot blue" /> Upcoming <strong>{upcoming}</strong></p>
                <p><i className="ml-dot red" /> At Risk <strong>{atRisk}</strong></p>
                <p><i className="ml-dot dark-red" /> Overdue <strong>{overdue}</strong></p>
              </div>
            </div>
          </section>

          <section className="ml-panel ml-status-chart">
            <h2>Milestones by Status</h2>
            <div className="ml-status-bars">
              {[
                { name: "Completed", value: completed, color: "green" },
                { name: "In Progress", value: inProgress, color: "orange" },
                { name: "Upcoming", value: upcoming, color: "blue" },
                { name: "At Risk", value: atRisk, color: "red" },
                { name: "Overdue", value: overdue, color: "dark-red" },
              ].map((item) => (
                <div className="ml-status-bar-column" key={item.name}>
                  <strong>{item.value}</strong>
                  <span className={`ml-status-bar ${item.color}`} style={{ height: `${Math.max(3, (item.value / Math.max(1, total)) * 100)}%` }} />
                  <small>{item.name}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="ml-panel ml-upcoming-panel">
            <div className="ml-panel-heading">
              <h2>Upcoming Milestones</h2>
              <Link href="/milestones/calendar">View All</Link>
            </div>
            {milestones.filter((item) => item.status === "Upcoming").slice(0, 5).map((item) => (
              <Link href={`/milestones/${item.id}`} className="ml-upcoming-row" key={item.id}>
                <CalendarDays size={15} />
                <span>
                  <strong>{item.id}</strong>
                  <small>{item.title}</small>
                </span>
                <time>{formatDate(item.plannedStart)}</time>
              </Link>
            ))}
          </section>

          <section className="ml-panel ml-quick-actions">
            <h2>Quick Actions</h2>
            <div className="ml-quick-grid">
              <Link href="/milestones/new"><FilePlus2 size={19} /><span>Create Milestone</span></Link>
              <Link href="/milestones/calendar"><CalendarDays size={19} /><span>Milestone Calendar</span></Link>
              <Link href="/milestones/timeline"><Activity size={19} /><span>Milestone Timeline</span></Link>
              <Link href="/milestones/reports"><Download size={19} /><span>Milestone Report</span></Link>
              <button type="button" onClick={exportCsv}><Download size={19} /><span>Export Milestones</span></button>
              <Link href="/milestones/progress-rules"><ListFilter size={19} /><span>Progress Rules</span></Link>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
