"use client";

import { useEffect, useMemo, useState } from "react";
import { createSprint as createSprintApi, employees as getEmployeesApi, sprints as getSprintsApi } from "../../lib/api";
import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  FileText,
  Filter,
  Flag,
  MoreVertical,
  PlusCircle,
  Search,
  Settings,
  Upload,
  X,
} from "lucide-react";
import "./sprint-registry.css";
import { useRouter } from "next/navigation";

type SprintStatus = "Completed" | "In Progress" | "Upcoming" | "Overdue";
type Priority = "High" | "Medium" | "Low" | "Critical";

type Sprint = {
  id: string;
  name: string;
  project: string;
  milestone: string;
  owner: string;
  status: SprintStatus;
  start: string;
  end: string;
  duration: number;
  progress: number;
  priority: Priority;
};

const statusNames: SprintStatus[] = ["Completed", "In Progress", "Upcoming", "Overdue"];

function StatusBadge({ status }: { status: SprintStatus }) {
  return <span className={`sr-status ${status.toLowerCase().replace(" ", "-")}`}>{status}</span>;
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`sr-priority ${priority.toLowerCase()}`}>{priority}</span>;
}

function Progress({ value }: { value: number }) {
  return (
    <div className="sr-progress">
      <span className={value === 100 ? "done" : ""} style={{ width: `${value}%` }} />
      <b>{value}%</b>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="sr-summary-card">
      <i className={tone}>{icon}</i>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{subtitle}</small>
      </div>
    </div>
  );
}

function DonutChart({ total }: { total: number }) {
  return (
    <div className="sr-donut-wrap">
      <div className="sr-donut">
        <div><b>{total}</b><span>Total</span></div>
      </div>
    </div>
  );
}

export default function SprintRegistry() {
  const router = useRouter();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [ownersList, setOwnersList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [project, setProject] = useState("All Projects");
  const [milestone, setMilestone] = useState("All Milestones");
  const [status, setStatus] = useState("All Status");
  const [owner, setOwner] = useState("All Owners");
  const [duration, setDuration] = useState("All");
  const [moreFilters, setMoreFilters] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState("All Priorities");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [newSprintName, setNewSprintName] = useState("");
  const [newSprintOwner, setNewSprintOwner] = useState("");
  const [newSprintProject, setNewSprintProject] = useState("PRJ-001");
  const [newSprintMilestone, setNewSprintMilestone] = useState("MLS-002");
  const [newSprintStart, setNewSprintStart] = useState("2026-11-09");
  const [newSprintEnd, setNewSprintEnd] = useState("2026-11-22");

  const loadSprints = async () => {
    try {
      setLoading(true);
      const [sRes, eRes] = await Promise.allSettled([
        getSprintsApi(),
        getEmployeesApi().catch(() => []),
      ]);

      if (sRes.status === "fulfilled") {
        const raw = sRes.value;
        const list = Array.isArray(raw) ? raw : raw?.data || raw?.items || [];
        if (Array.isArray(list)) {
          const mapped: Sprint[] = list.map((s: any) => ({
            id: s.sprintCode || s.code || s._id || s.id,
            name: s.name || "Sprint",
            project: s.projectId?.projectName || s.projectCode || "Project",
            milestone: s.milestoneId?.name || "Milestone",
            owner: s.ownerId?.name || "Unassigned",
            status: (s.status === "COMPLETED" ? "Completed" : s.status === "ACTIVE" ? "In Progress" : s.status === "OVERDUE" ? "Overdue" : "Upcoming") as SprintStatus,
            start: s.startDate ? new Date(s.startDate).toLocaleDateString("en-IN") : "—",
            end: s.endDate ? new Date(s.endDate).toLocaleDateString("en-IN") : "—",
            duration: s.durationDays || 14,
            progress: s.progress || 0,
            priority: (s.priority || "Medium") as Priority,
          }));
          setSprints(mapped);
        } else {
          setSprints([]);
        }
      } else {
        setSprints([]);
      }

      if (eRes.status === "fulfilled" && Array.isArray(eRes.value)) {
        const names = eRes.value.map((e: any) => e.name || e.email || "Employee");
        setOwnersList(names);
        if (names.length > 0 && !newSprintOwner) {
          setNewSprintOwner(names[0]);
        }
      }
    } catch (err) {
      console.warn("Failed to load sprints:", err);
      setSprints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSprints();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return sprints.filter((s) => {
      const matchesSearch =
        !q ||
        [s.id, s.name, s.project, s.milestone, s.owner].some((v) =>
          v.toLowerCase().includes(q)
        );

      return (
        matchesSearch &&
        (project === "All Projects" || s.project === project) &&
        (milestone === "All Milestones" || s.milestone === milestone) &&
        (status === "All Status" || s.status === status) &&
        (owner === "All Owners" || s.owner === owner) &&
        (duration === "All" ||
          (duration === "7 Days" && s.duration <= 7) ||
          (duration === "14 Days" && s.duration === 14) ||
          (duration === "More than 14 Days" && s.duration > 14)) &&
        (priorityFilter === "All Priorities" || s.priority === priorityFilter)
      );
    });
  }, [sprints, search, project, milestone, status, owner, duration, priorityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const counts = useMemo(
    () => ({
      total: sprints.length,
      completed: sprints.filter((s) => s.status === "Completed").length,
      progress: sprints.filter((s) => s.status === "In Progress").length,
      upcoming: sprints.filter((s) => s.status === "Upcoming").length,
      overdue: sprints.filter((s) => s.status === "Overdue").length,
    }),
    [sprints]
  );

  const resetFilters = () => {
    setSearch("");
    setProject("All Projects");
    setMilestone("All Milestones");
    setStatus("All Status");
    setOwner("All Owners");
    setDuration("All");
    setPriorityFilter("All Priorities");
    setPage(1);
  };

  const exportCSV = () => {
    const header = ["Sprint ID", "Sprint Name", "Project", "Milestone", "Sprint Owner", "Status", "Start Date", "End Date", "Duration", "Progress", "Priority"];
    const rows = filtered.map((s) => [
      s.id, s.name, s.project, s.milestone, s.owner, s.status, s.start, s.end, `${s.duration} Days`, `${s.progress}%`, s.priority,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "sprint-registry.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const createSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSprintName.trim()) return;

    try {
      await createSprintApi({
        name: newSprintName.trim(),
        startDate: newSprintStart,
        endDate: newSprintEnd,
      });
      loadSprints();
    } catch (err) {
      console.warn("Failed to create sprint:", err);
    }

    setPage(1);
    setShowCreate(false);
    setNewSprintName("");
  };

  const updateSprintStatus = (id: string, nextStatus: SprintStatus) => {
    setSprints((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: nextStatus } : s))
    );
    setActiveMenu(null);
  };

  const clearMenu = () => setActiveMenu(null);

  return (
    <div className="sr-page" onClick={clearMenu}>
      <header className="sr-header">
        <div className="sr-breadcrumb">
          <span>Sprint Management</span>
          <b>›</b>
          <strong>Sprint Registry (SPR-001)</strong>
        </div>

        <div className="sr-header-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="sr-primary"
            onClick={() => router.push("/sprints/new")}
          >
            <PlusCircle size={14} /> Create Sprint
          </button>
          <button onClick={() => setShowImport(true)}><Download size={14} /> Import</button>
          <button onClick={exportCSV}><FileText size={14} /> Export <ChevronDown size={12} /></button>
          <div className="sr-menu-wrap">
            <button onClick={() => setShowMoreActions((v) => !v)}>More Actions <ChevronDown size={12} /></button>
            {showMoreActions && (
              <div className="sr-menu">
                <button onClick={exportCSV}>Export filtered sprints</button>
                <button onClick={() => setShowImport(true)}>Import sprint data</button>
                <button onClick={resetFilters}>Reset all filters</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="sr-title-row">
        <div className="sr-title-icon"><FileText size={22} /></div>
        <div>
          <h1>Sprint Registry <span>☆</span></h1>
          <p>Central repository of all project sprints and their progress</p>
        </div>
      </div>

      <section className="sr-summary-grid">
        <SummaryCard title="Total Sprints" value={counts.total} subtitle="Across all projects" tone="blue" icon={<FileText />} />
        <SummaryCard title="Completed" value={counts.completed} subtitle={`${((counts.completed / counts.total) * 100 || 0).toFixed(2)}% of total`} tone="green" icon={<CheckCircle2 />} />
        <SummaryCard title="In Progress" value={counts.progress} subtitle={`${((counts.progress / counts.total) * 100 || 0).toFixed(2)}% of total`} tone="blue" icon={<Clock3 />} />
        <SummaryCard title="Upcoming" value={counts.upcoming} subtitle={`${((counts.upcoming / counts.total) * 100 || 0).toFixed(2)}% of total`} tone="orange" icon={<CalendarDays />} />
        <SummaryCard title="Overdue" value={counts.overdue} subtitle={`${((counts.overdue / counts.total) * 100 || 0).toFixed(2)}% of total`} tone="red" icon={<AlertTriangle />} />
      </section>

      <section className="sr-filter-panel">
        <label className="sr-search">
          <Search size={14} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by Sprint ID, Name, Project, Milestone..."
          />
          <Search size={13} />
        </label>

        <FilterSelect label="Project" value={project} onChange={(v) => { setProject(v); setPage(1); }} options={["All Projects", "PRJ-001", "PRJ-002", "PRJ-003"]} />
        <FilterSelect label="Milestone" value={milestone} onChange={(v) => { setMilestone(v); setPage(1); }} options={["All Milestones", "MLS-001", "MLS-002", "MLS-003", "MLS-004", "MLS-005", "MLS-006", "MLS-007", "MLS-008"]} />
        <FilterSelect label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={["All Status", ...statusNames]} />
        <FilterSelect label="Sprint Owner" value={owner} onChange={(v) => { setOwner(v); setPage(1); }} options={["All Owners", ...ownersList]} />
        <FilterSelect label="Duration" value={duration} onChange={(v) => { setDuration(v); setPage(1); }} options={["All", "7 Days", "14 Days", "More than 14 Days"]} />

        <div className="sr-more-filter-wrap">
          <button className={`sr-more-filter ${moreFilters ? "active" : ""}`} onClick={() => setMoreFilters((v) => !v)}>
            <Filter size={14} /> More Filters
          </button>
          {moreFilters && (
            <div className="sr-extra-filter">
              <label>Priority
                <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}>
                  {["All Priorities", "Critical", "High", "Medium", "Low"].map((v) => <option key={v}>{v}</option>)}
                </select>
              </label>
            </div>
          )}
        </div>

        <button className="sr-clear" onClick={resetFilters}>Clear</button>
      </section>

      <section className="sr-main-grid">
        <div className="sr-main-column">
          <section className="sr-card sr-registry-card">
            <h2>Sprint List ({filtered.length})</h2>
            <div className="sr-table-scroll">
              <table className="sr-sprint-table">
                <thead>
                  <tr>
                    <th>Sprint ID</th><th>Sprint Name</th><th>Project</th><th>Milestone</th>
                    <th>Sprint Owner</th><th>Status</th><th>Start Date</th><th>End Date</th>
                    <th>Duration</th><th>Progress</th><th>Priority</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((s) => (
                    <tr key={s.id}>
                      <td className="sr-id">{s.id}</td>
                      <td className="sr-name">{s.name}</td>
                      <td className="sr-id">{s.project}</td>
                      <td className="sr-id">{s.milestone}</td>
                      <td>{s.owner}</td>
                      <td><StatusBadge status={s.status} /></td>
                      <td>{s.start}</td>
                      <td>{s.end}</td>
                      <td>{s.duration} Days</td>
                      <td><Progress value={s.progress} /></td>
                      <td><PriorityBadge priority={s.priority} /></td>
                      <td>
                        <div className="sr-row-menu" onClick={(e) => e.stopPropagation()}>
                          <button className="sr-row-menu-trigger" onClick={() => setActiveMenu(activeMenu === s.id ? null : s.id)}>
                            <MoreVertical size={15} />
                          </button>
                          {activeMenu === s.id && (
                            <div className="sr-row-menu-content">
                              <button onClick={() => router.push(`/sprints/${s.id}/active`)}>View Sprint</button>
                              <button onClick={() => router.push(`/sprints/${s.id}/planning`)}>Edit Sprint</button>
                              <button onClick={() => updateSprintStatus(s.id, "Completed")}>Mark Completed</button>
                              <button onClick={() => updateSprintStatus(s.id, "In Progress")}>Mark In Progress</button>
                              <button onClick={() => updateSprintStatus(s.id, "Overdue")}>Mark Overdue</button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visible.length === 0 && (
                    <tr><td colSpan={12} className="sr-empty">No sprints found. Try changing your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="sr-pagination">
              <span>Showing {filtered.length ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} sprints</span>
              <div className="sr-page-buttons">
                <button onClick={() => setPage(1)} disabled={currentPage === 1}><ChevronFirst size={14} /></button>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft size={14} /></button>
                {Array.from({ length: Math.min(4, totalPages) }, (_, i) => {
                  const n = Math.min(Math.max(1, currentPage - 1) + i, totalPages);
                  return <button key={n} className={currentPage === n ? "active" : ""} onClick={() => setPage(n)}>{n}</button>;
                })}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight size={14} /></button>
                <button onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}><ChevronLast size={14} /></button>
              </div>
              <label className="sr-page-size">
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  <option value={10}>10 / page</option>
                  <option value={15}>15 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={28}>All / page</option>
                </select>
                <ChevronDown size={12} />
              </label>
            </div>
          </section>

          <div className="sr-analytics-grid">
            <section className="sr-card sr-chart-card">
              <h2>Sprints by Priority</h2>
              <div className="sr-priority-chart">
                <div className="sr-y-axis"><span>20</span><span>15</span><span>10</span><span>5</span><span>0</span></div>
                <div className="sr-priority-plot">
                  {[{ name: "High", count: 14, tone: "red" }, { name: "Medium", count: 10, tone: "orange" }, { name: "Low", count: 4, tone: "green" }].map((v) => (
                    <div className="sr-priority-column" key={v.name}>
                      <b>{v.count}</b><i className={v.tone} style={{ height: `${(v.count / 20) * 100}%` }} /><span>{v.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="sr-card sr-chart-card">
              <h2>Sprint Progress Distribution</h2>
              <div className="sr-distribution">
                <div className="sr-distribution-donut"><div><b>28</b><span>Total</span></div></div>
                <div className="sr-distribution-legend">
                  <span><i className="c1" />0% - 25% <b>6 (21.43%)</b></span>
                  <span><i className="c2" />26% - 50% <b>8 (28.57%)</b></span>
                  <span><i className="c3" />51% - 75% <b>7 (25.00%)</b></span>
                  <span><i className="c4" />76% - 100% <b>7 (25.00%)</b></span>
                </div>
              </div>
            </section>

            <section className="sr-card sr-chart-card">
              <h2>Sprints by Owner</h2>
              <div className="sr-owner-chart">
                {ownersList.map((name: string, i: number) => {
                  const values = [7, 6, 5, 5, 5];
                  const val = values[i] || 1;
                  return (
                    <div className="sr-owner-column" key={name}>
                      <b>{val}</b>
                      <i style={{ height: `${(val / 10) * 100}%` }} className={`owner-${i % 5}`} />
                      <div className="sr-avatar">{name.split(" ").map((x: string) => x[0]).join("")}</div>
                      <span>{name.split(" ")[0]}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <section className="sr-card sr-activity-card">
            <div className="sr-card-heading">
              <h2>Recent Sprint Activity</h2>
            </div>
            <div className="sr-table-scroll">
              <table>
                <thead>
                  <tr><th>Sprint ID</th><th>Sprint Name</th><th>Project</th><th>Status Change</th><th>Changed By</th><th>Changed On</th><th>Comments</th></tr>
                </thead>
                <tbody>
                  {sprints.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: "1.5rem" }}>No sprint audit logs recorded yet.</td></tr>
                  ) : (
                    sprints.slice(0, 5).map((s) => (
                      <tr key={s.id}>
                        <td className="sr-id">{s.id}</td>
                        <td>{s.name}</td>
                        <td className="sr-id">{s.project}</td>
                        <td>{s.status}</td>
                        <td>{s.owner}</td>
                        <td>{s.start}</td>
                        <td>Active</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="sr-sidebar">
          <section className="sr-card sr-status-card">
            <h2>Sprint Status Summary</h2>
            <div className="sr-status-summary">
              <DonutChart total={counts.total} />
              <div className="sr-status-legend">
                <span><i className="green" />Completed <b>{counts.completed} ({counts.total ? (counts.completed / counts.total * 100).toFixed(1) : "0.0"}%)</b></span>
                <span><i className="blue" />In Progress <b>{counts.progress} ({counts.total ? (counts.progress / counts.total * 100).toFixed(1) : "0.0"}%)</b></span>
                <span><i className="orange" />Upcoming <b>{counts.upcoming} ({counts.total ? (counts.upcoming / counts.total * 100).toFixed(1) : "0.0"}%)</b></span>
                <span><i className="red" />Overdue <b>{counts.overdue} ({counts.total ? (counts.overdue / counts.total * 100).toFixed(1) : "0.0"}%)</b></span>
              </div>
            </div>
          </section>

          <section className="sr-card sr-milestone-chart">
            <h2>Sprints by Milestone</h2>
            {sprints.length === 0 ? (
              <p style={{ textAlign: "center", padding: "1rem", color: "#667085", fontSize: "0.85rem" }}>No milestone sprint data available.</p>
            ) : (
              Array.from(new Set(sprints.map((s) => s.milestone))).slice(0, 4).map((label, i) => {
                const count = sprints.filter((s) => s.milestone === label).length;
                return (
                  <div className="sr-horizontal-bar" key={label}>
                    <span>{label}</span>
                    <div><i className={`milestone-${i}`} style={{ width: `${Math.min(100, (count / (sprints.length || 1)) * 100)}%` }} /></div>
                    <b>{count}</b>
                  </div>
                );
              })
            )}
            <div className="sr-chart-scale"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
          </section>

          <section className="sr-card sr-mini-list">
            <div className="sr-card-heading"><h2>Overdue Sprints</h2><button onClick={() => { setStatus("Overdue"); setPage(1); }}>View All</button></div>
            <div className="sr-mini-row"><b>SPR-008</b><span>Lab Integration Sprint</span><small>25 May 2025</small><em>High</em></div>
            <div className="sr-mini-row"><b>SPR-015</b><span>API Gateway Sprint</span><small>18 May 2025</small><em className="critical">Critical</em></div>
          </section>

          <section className="sr-card sr-mini-list">
            <div className="sr-card-heading"><h2>Upcoming Sprints</h2><button onClick={() => { setStatus("Upcoming"); setPage(1); }}>View All</button></div>
            <div className="sr-mini-row"><b>SPR-004</b><span>Billing Module Sprint</span><small>09 Jun 2025</small></div>
            <div className="sr-mini-row"><b>SPR-005</b><span>Reports &amp; Analytics Sprint</span><small>23 Jun 2025</small></div>
            <div className="sr-mini-row"><b>SPR-010</b><span>Mobile App Sprint</span><small>02 Jun 2025</small></div>
          </section>

          <section className="sr-card sr-quick-actions">
            <h2>Quick Actions</h2>
            <div>
              <button onClick={() => router.push("/sprints/new")}>
                <PlusCircle />
                <span>Create Sprint</span>
              </button>
              <button onClick={() => alert("Connect Sprint Calendar route")}><CalendarDays /><span>Sprint Calendar</span></button>
              <button onClick={() => alert("Connect Sprint Timeline route")}><Activity /><span>Sprint Timeline</span></button>
              <button onClick={exportCSV}><FileText /><span>Sprint Report</span></button>
              <button onClick={() => setShowImport(true)}><Upload /><span>Import Sprints</span></button>
              <button onClick={() => alert("Connect Sprint Settings route")}><Settings /><span>Sprint Settings</span></button>
            </div>
          </section>
        </aside>
      </section>

      {showCreate && (
        <div className="sr-modal-backdrop" onClick={() => setShowCreate(false)}>
          <form className="sr-modal" onSubmit={createSprint} onClick={(e) => e.stopPropagation()}>
            <div className="sr-modal-heading">
              <div><h2>Create Sprint</h2><p>Add a sprint to the project registry.</p></div>
              <button type="button" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <label>Sprint Name<input required value={newSprintName} onChange={(e) => setNewSprintName(e.target.value)} placeholder="e.g. Authentication Sprint" /></label>
            <div className="sr-form-grid">
              <label>Project<select value={newSprintProject} onChange={(e) => setNewSprintProject(e.target.value)}><option>PRJ-001</option><option>PRJ-002</option><option>PRJ-003</option></select></label>
              <label>Milestone<select value={newSprintMilestone} onChange={(e) => setNewSprintMilestone(e.target.value)}>{["MLS-001", "MLS-002", "MLS-003", "MLS-004", "MLS-005", "MLS-006", "MLS-007", "MLS-008"].map((v) => <option key={v}>{v}</option>)}</select></label>
              <label>Sprint Owner<select value={newSprintOwner} onChange={(e) => setNewSprintOwner(e.target.value)}>{ownersList.map((v: string) => <option key={v}>{v}</option>)}</select></label>
              <label>Start Date<input type="date" required value={newSprintStart} onChange={(e) => setNewSprintStart(e.target.value)} /></label>
              <label>End Date<input type="date" required min={newSprintStart} value={newSprintEnd} onChange={(e) => setNewSprintEnd(e.target.value)} /></label>
            </div>
            <div className="sr-modal-actions"><button type="button" className="secondary" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="sr-primary">Create Sprint</button></div>
          </form>
        </div>
      )}

      {showImport && (
        <div className="sr-modal-backdrop" onClick={() => setShowImport(false)}>
          <div className="sr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sr-modal-heading"><div><h2>Import Sprints</h2><p>Choose a CSV file to prepare sprint import.</p></div><button onClick={() => setShowImport(false)}><X size={18} /></button></div>
            <div className="sr-upload-box"><Upload size={25} /><b>Choose CSV file</b><span>CSV import UI preview. Backend import is not connected yet.</span><input type="file" accept=".csv" /></div>
            <div className="sr-modal-actions"><button className="secondary" onClick={() => setShowImport(false)}>Cancel</button><button className="sr-primary" onClick={() => { setShowImport(false); }}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="sr-filter-select">
      <span>{label}</span>
      <div><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((v) => <option key={v}>{v}</option>)}</select><ChevronDown size={12} /></div>
    </label>
  );
}