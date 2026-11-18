"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Filter,
  PlusCircle,
  Search,
  Settings,
  Upload,
  X,
  MoreVertical,
  FolderKanban,
  RefreshCw,
} from "lucide-react";
import { sprintApi, type Sprint } from "../../lib/sprints/api";
import { projects as getProjectsApi, milestones as getMilestonesApi } from "../../lib/api";
import "./sprint-registry.css";

type SprintStatus = "Completed" | "In Progress" | "Upcoming" | "Overdue";
type Priority = "High" | "Medium" | "Low" | "Critical";

const statusNames: SprintStatus[] = ["Completed", "In Progress", "Upcoming", "Overdue"];

function StatusBadge({ status }: { status: SprintStatus }) {
  return <span className={`sr-status ${status.toLowerCase().replace(" ", "-")}`}>{status}</span>;
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`sr-priority ${priority.toLowerCase()}`}>{priority}</span>;
}

function Progress({ value }: { value: number }) {
  const safe = Math.min(100, Math.max(0, value));
  return (
    <div className="sr-progress">
      <span className={safe === 100 ? "done" : ""} style={{ width: `${safe}%` }} />
      <b>{safe}%</b>
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

function DonutChart({ total, completed, inProgress, upcoming, overdue }: { total: number; completed: number; inProgress: number; upcoming: number; overdue: number }) {
  const t = Math.max(1, total);
  const p1 = (completed / t) * 100;
  const p2 = p1 + (inProgress / t) * 100;
  const p3 = p2 + (upcoming / t) * 100;

  return (
    <div className="sr-donut-wrap">
      <div
        className="sr-donut"
        style={{
          background: `conic-gradient(
            #078d5b 0% ${p1}%,
            #1762f5 ${p1}% ${p2}%,
            #f59e0b ${p2}% ${p3}%,
            #e63838 ${p3}% 100%
          )`,
        }}
      >
        <div>
          <b>{total}</b>
          <span>Total</span>
        </div>
      </div>
    </div>
  );
}

export default function SprintRegistry() {
  const router = useRouter();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [ownersList, setOwnersList] = useState<Array<{ id: string; name: string }>>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [milestonesList, setMilestonesList] = useState<any[]>([]);
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

  // Quick create fields
  const [newSprintName, setNewSprintName] = useState("");
  const [newSprintOwner, setNewSprintOwner] = useState("");
  const [newSprintProject, setNewSprintProject] = useState("");
  const [newSprintMilestone, setNewSprintMilestone] = useState("");
  const [newSprintStart, setNewSprintStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [newSprintEnd, setNewSprintEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });

  const loadAll = async () => {
    try {
      setLoading(true);
      const [sRes, pRes, mRes, personnel] = await Promise.allSettled([
        sprintApi.list(),
        getProjectsApi({ limit: 100 }),
        getMilestonesApi(),
        sprintApi.getPersonnel(),
      ]);

      if (sRes.status === "fulfilled") {
        setSprints(sRes.value.items);
      }

      if (pRes.status === "fulfilled") {
        const raw = pRes.value;
        const pList = Array.isArray(raw) ? raw : (raw as any)?.items || (raw as any)?.data || [];
        setProjectsList(pList);
        if (pList.length > 0 && !newSprintProject) {
          setNewSprintProject(pList[0]._id || pList[0].id);
        }
      }

      if (mRes.status === "fulfilled") {
        const raw = mRes.value;
        const mList = Array.isArray(raw) ? raw : (raw as any)?.items || (raw as any)?.data || [];
        setMilestonesList(mList);
        if (mList.length > 0 && !newSprintMilestone) {
          setNewSprintMilestone(mList[0]._id || mList[0].id);
        }
      }

      if (personnel.status === "fulfilled") {
        setOwnersList(personnel.value);
        if (personnel.value.length > 0 && !newSprintOwner) {
          setNewSprintOwner(personnel.value[0].name);
        }
      }
    } catch (err) {
      console.warn("Failed to load sprint registry data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const projectOptions = useMemo(() => {
    const set = new Set<string>();
    sprints.forEach((s) => {
      if (s.projectCode) set.add(s.projectCode);
      if (s.projectName && s.projectName !== "General Project") set.add(s.projectName);
    });
    projectsList.forEach((p) => {
      if (p.projectCode) set.add(p.projectCode);
      if (p.projectName) set.add(p.projectName);
    });
    return ["All Projects", ...Array.from(set)];
  }, [sprints, projectsList]);

  const milestoneOptions = useMemo(() => {
    const set = new Set<string>();
    sprints.forEach((s) => {
      if (s.milestoneName) set.add(s.milestoneName);
    });
    milestonesList.forEach((m) => {
      if (m.title || m.name) set.add(m.title || m.name);
    });
    return ["All Milestones", ...Array.from(set)];
  }, [sprints, milestonesList]);

  const ownerOptions = useMemo(() => {
    const set = new Set<string>();
    sprints.forEach((s) => {
      if (s.ownerName && s.ownerName !== "Unassigned") set.add(s.ownerName);
    });
    ownersList.forEach((o) => {
      if (o.name) set.add(o.name);
    });
    return ["All Owners", ...Array.from(set)];
  }, [sprints, ownersList]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return sprints.filter((s) => {
      const matchesSearch =
        !q ||
        [s.id, s.sprintCode, s.name, s.projectName, s.projectCode, s.milestoneName, s.ownerName].some((v) =>
          String(v || "").toLowerCase().includes(q)
        );

      const matchesProject =
        project === "All Projects" ||
        s.projectCode === project ||
        s.projectName === project;

      const matchesMilestone =
        milestone === "All Milestones" || s.milestoneName === milestone;

      const matchesStatus = status === "All Status" || s.status === status;

      const matchesOwner = owner === "All Owners" || s.ownerName === owner;

      const matchesDuration =
        duration === "All" ||
        (duration === "7 Days" && s.durationDays <= 7) ||
        (duration === "14 Days" && s.durationDays === 14) ||
        (duration === "More than 14 Days" && s.durationDays > 14);

      const matchesPriority =
        priorityFilter === "All Priorities" || s.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesProject &&
        matchesMilestone &&
        matchesStatus &&
        matchesOwner &&
        matchesDuration &&
        matchesPriority
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

  // Dynamic Priority Distribution
  const priorityCounts = useMemo(() => {
    const high = sprints.filter((s) => s.priority === "High" || s.priority === "Critical").length;
    const med = sprints.filter((s) => s.priority === "Medium").length;
    const low = sprints.filter((s) => s.priority === "Low").length;
    const maxVal = Math.max(1, high, med, low);
    return [
      { name: "High", count: high, tone: "red", maxVal },
      { name: "Medium", count: med, tone: "orange", maxVal },
      { name: "Low", count: low, tone: "green", maxVal },
    ];
  }, [sprints]);

  // Dynamic Progress Distribution
  const progressDist = useMemo(() => {
    const t = Math.max(1, sprints.length);
    const q1 = sprints.filter((s) => s.progress >= 0 && s.progress <= 25).length;
    const q2 = sprints.filter((s) => s.progress > 25 && s.progress <= 50).length;
    const q3 = sprints.filter((s) => s.progress > 50 && s.progress <= 75).length;
    const q4 = sprints.filter((s) => s.progress > 75 && s.progress <= 100).length;
    return {
      total: sprints.length,
      q1: { count: q1, pct: ((q1 / t) * 100).toFixed(1) },
      q2: { count: q2, pct: ((q2 / t) * 100).toFixed(1) },
      q3: { count: q3, pct: ((q3 / t) * 100).toFixed(1) },
      q4: { count: q4, pct: ((q4 / t) * 100).toFixed(1) },
    };
  }, [sprints]);

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
    const header = [
      "Sprint ID",
      "Sprint Name",
      "Project",
      "Milestone",
      "Sprint Owner",
      "Status",
      "Start Date",
      "End Date",
      "Duration",
      "Progress (%)",
      "Priority",
    ];
    const rows = filtered.map((s) => [
      s.sprintCode || s.id,
      s.name,
      s.projectName || s.projectCode || "Project",
      s.milestoneName || "Milestone",
      s.ownerName || "Unassigned",
      s.status,
      s.start || s.startDate || "—",
      s.end || s.endDate || "—",
      `${s.durationDays} Days`,
      `${s.progress}%`,
      s.priority,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `sprint-registry-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const createSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSprintName.trim()) return;

    try {
      const selectedOwner = ownersList.find((o) => o.name === newSprintOwner);
      const targetProj =
        projectsList.find(
          (p: any) =>
            p._id === newSprintProject ||
            p.id === newSprintProject ||
            p.projectCode === newSprintProject
        ) || projectsList[0];

      await sprintApi.create({
        name: newSprintName.trim(),
        projectId: targetProj?._id || targetProj?.id,
        milestoneId: newSprintMilestone || undefined,
        ownerId: selectedOwner?.id,
        ownerName: newSprintOwner,
        startDate: newSprintStart,
        endDate: newSprintEnd,
        goal: newSprintName.trim(),
      });
      loadAll();
      setShowCreate(false);
      setNewSprintName("");
      setPage(1);
    } catch (err: any) {
      alert(`Sprint creation failed: ${err?.message || "Server error"}`);
    }
  };

  const updateSprintStatus = async (id: string, nextStatus: SprintStatus) => {
    setSprints((prev) =>
      prev.map((s) => (s.id === id || s._id === id ? { ...s, status: nextStatus } : s))
    );
    setActiveMenu(null);
    try {
      const backendStatus =
        nextStatus === "Completed"
          ? "COMPLETED"
          : nextStatus === "In Progress"
          ? "ACTIVE"
          : "PLANNED";
      await sprintApi.updateStatus(id, backendStatus);
    } catch (err) {
      console.warn("Failed to update sprint status:", err);
    }
  };

  const clearMenu = () => setActiveMenu(null);

  if (loading) {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center", color: "#64748b" }}>
        <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 16px", color: "#3b82f6" }} />
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
          Loading Sprint Registry...
        </h3>
        <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
          Fetching active sprints, burndown progression, and project dependencies.
        </p>
      </div>
    );
  }

  return (
    <div className="sr-page" onClick={clearMenu}>
      <header className="sr-header">
        <div className="sr-breadcrumb">
          <span>Sprint Management</span>
          <b>›</b>
          <strong>Sprint Registry ({counts.total} Sprints)</strong>
        </div>

        <div className="sr-header-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="sr-primary"
            onClick={() => router.push("/sprints/new")}
            type="button"
          >
            <PlusCircle size={14} /> Create Sprint
          </button>
          <button type="button" onClick={() => setShowImport(true)}>
            <Download size={14} /> Import
          </button>
          <button type="button" onClick={exportCSV}>
            <FileText size={14} /> Export CSV <ChevronDown size={12} />
          </button>
          <div className="sr-menu-wrap">
            <button type="button" onClick={() => setShowMoreActions((v) => !v)}>
              More Actions <ChevronDown size={12} />
            </button>
            {showMoreActions && (
              <div className="sr-menu">
                <button type="button" onClick={exportCSV}>Export filtered sprints</button>
                <button type="button" onClick={() => setShowImport(true)}>Import sprint data</button>
                <button type="button" onClick={resetFilters}>Reset all filters</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="sr-title-row">
        <div className="sr-title-icon"><FileText size={22} /></div>
        <div>
          <h1>Sprint Registry</h1>
          <p>Central repository of all project sprints, burndowns, and delivery cadences</p>
        </div>
      </div>

      <section className="sr-summary-grid">
        <SummaryCard
          title="Total Sprints"
          value={counts.total}
          subtitle="Across all projects"
          tone="blue"
          icon={<FileText />}
        />
        <SummaryCard
          title="Completed"
          value={counts.completed}
          subtitle={`${((counts.completed / Math.max(1, counts.total)) * 100).toFixed(1)}% of total`}
          tone="green"
          icon={<CheckCircle2 />}
        />
        <SummaryCard
          title="In Progress"
          value={counts.progress}
          subtitle={`${((counts.progress / Math.max(1, counts.total)) * 100).toFixed(1)}% of total`}
          tone="blue"
          icon={<Clock3 />}
        />
        <SummaryCard
          title="Upcoming"
          value={counts.upcoming}
          subtitle={`${((counts.upcoming / Math.max(1, counts.total)) * 100).toFixed(1)}% of total`}
          tone="orange"
          icon={<CalendarDays />}
        />
        <SummaryCard
          title="Overdue"
          value={counts.overdue}
          subtitle={`${((counts.overdue / Math.max(1, counts.total)) * 100).toFixed(1)}% of total`}
          tone="red"
          icon={<AlertTriangle />}
        />
      </section>

      <section className="sr-filter-panel">
        <label className="sr-search">
          <Search size={14} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by Sprint ID, Name, Project, Milestone..."
          />
        </label>

        <FilterSelect
          label="Project"
          value={project}
          onChange={(v) => { setProject(v); setPage(1); }}
          options={projectOptions}
        />
        <FilterSelect
          label="Milestone"
          value={milestone}
          onChange={(v) => { setMilestone(v); setPage(1); }}
          options={milestoneOptions}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={["All Status", ...statusNames]}
        />
        <FilterSelect
          label="Sprint Owner"
          value={owner}
          onChange={(v) => { setOwner(v); setPage(1); }}
          options={ownerOptions}
        />
        <FilterSelect
          label="Duration"
          value={duration}
          onChange={(v) => { setDuration(v); setPage(1); }}
          options={["All", "7 Days", "14 Days", "More than 14 Days"]}
        />

        <div className="sr-more-filter-wrap">
          <button
            type="button"
            className={`sr-more-filter ${moreFilters ? "active" : ""}`}
            onClick={() => setMoreFilters((v) => !v)}
          >
            <Filter size={14} /> More Filters
          </button>
          {moreFilters && (
            <div className="sr-extra-filter">
              <label>
                Priority
                <select
                  value={priorityFilter}
                  onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
                >
                  {["All Priorities", "Critical", "High", "Medium", "Low"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>

        <button type="button" className="sr-clear" onClick={resetFilters}>
          Clear
        </button>
      </section>

      <section className="sr-main-grid">
        <div className="sr-main-column">
          <section className="sr-card sr-registry-card">
            <h2>Sprint List ({filtered.length})</h2>
            <div className="sr-table-scroll">
              <table className="sr-sprint-table">
                <thead>
                  <tr>
                    <th>Sprint ID</th>
                    <th>Sprint Name</th>
                    <th>Project</th>
                    <th>Milestone</th>
                    <th>Sprint Owner</th>
                    <th>Status</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Duration</th>
                    <th>Progress</th>
                    <th>Priority</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length > 0 ? (
                    visible.map((s) => (
                      <tr key={s.id || s.sprintCode}>
                        <td className="sr-id">
                          <Link href={`/sprints/${encodeURIComponent(s._id || s.id)}/active`} style={{ color: "#155eef", textDecoration: "none", fontWeight: 650 }}>
                            {s.sprintCode || s.id}
                          </Link>
                        </td>
                        <td className="sr-name">
                          <strong>{s.name}</strong>
                        </td>
                        <td className="sr-id">{s.projectName || s.projectCode || "Project"}</td>
                        <td className="sr-id">{s.milestoneName || "Milestone"}</td>
                        <td>{s.ownerName || "Unassigned"}</td>
                        <td><StatusBadge status={s.status} /></td>
                        <td>{s.start || s.startDate || "—"}</td>
                        <td>{s.end || s.endDate || "—"}</td>
                        <td>{s.durationDays} Days</td>
                        <td><Progress value={s.progress} /></td>
                        <td><PriorityBadge priority={s.priority} /></td>
                        <td>
                          <div className="sr-row-menu" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="sr-row-menu-trigger"
                              onClick={() => setActiveMenu(activeMenu === s.id ? null : s.id)}
                              aria-label="Sprint actions"
                            >
                              <MoreVertical size={15} />
                            </button>
                            {activeMenu === s.id && (
                              <div className="sr-row-menu-content">
                                <button type="button" onClick={() => router.push(`/sprints/${encodeURIComponent(s._id || s.id)}/active`)}>
                                  Active Board
                                </button>
                                <button type="button" onClick={() => router.push(`/sprints/${encodeURIComponent(s._id || s.id)}/planning`)}>
                                  Sprint Planning
                                </button>
                                <button type="button" onClick={() => router.push(`/sprints/review/${encodeURIComponent(s._id || s.id)}`)}>
                                  Sprint Review
                                </button>
                                <button type="button" onClick={() => router.push(`/sprints/retrospective/${encodeURIComponent(s._id || s.id)}`)}>
                                  Sprint Retrospective
                                </button>
                                <button type="button" onClick={() => updateSprintStatus(s._id || s.id, "Completed")}>
                                  Mark Completed
                                </button>
                                <button type="button" onClick={() => updateSprintStatus(s._id || s.id, "In Progress")}>
                                  Mark In Progress
                                </button>
                                <button type="button" onClick={() => updateSprintStatus(s._id || s.id, "Overdue")}>
                                  Mark Overdue
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={12} className="sr-empty">
                        No sprints found in the database. Click &quot;Create Sprint&quot; to begin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="sr-pagination">
              <span>
                Showing {filtered.length ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
                {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} sprints
              </span>
              <div className="sr-page-buttons">
                <button type="button" onClick={() => setPage(1)} disabled={currentPage === 1}>
                  <ChevronFirst size={14} />
                </button>
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(4, totalPages) }, (_, i) => {
                  const n = Math.min(Math.max(1, currentPage - 1) + i, totalPages);
                  return (
                    <button
                      type="button"
                      key={n}
                      className={currentPage === n ? "active" : ""}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </button>
                  );
                })}
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight size={14} />
                </button>
                <button type="button" onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}>
                  <ChevronLast size={14} />
                </button>
              </div>
              <label className="sr-page-size">
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                >
                  <option value={10}>10 / page</option>
                  <option value={15}>15 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
                <ChevronDown size={12} />
              </label>
            </div>
          </section>

          <div className="sr-analytics-grid">
            <section className="sr-card sr-chart-card">
              <h2>Sprints by Priority</h2>
              <div className="sr-priority-chart">
                <div className="sr-priority-plot">
                  {priorityCounts.map((v) => (
                    <div className="sr-priority-column" key={v.name}>
                      <b>{v.count}</b>
                      <i className={v.tone} style={{ height: `${Math.max(8, (v.count / v.maxVal) * 100)}%` }} />
                      <span>{v.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="sr-card sr-chart-card">
              <h2>Sprint Progress Distribution</h2>
              <div className="sr-distribution">
                <div className="sr-distribution-donut">
                  <div><b>{progressDist.total}</b><span>Total</span></div>
                </div>
                <div className="sr-distribution-legend">
                  <span><i className="c1" />0% - 25% <b>{progressDist.q1.count} ({progressDist.q1.pct}%)</b></span>
                  <span><i className="c2" />26% - 50% <b>{progressDist.q2.count} ({progressDist.q2.pct}%)</b></span>
                  <span><i className="c3" />51% - 75% <b>{progressDist.q3.count} ({progressDist.q3.pct}%)</b></span>
                  <span><i className="c4" />76% - 100% <b>{progressDist.q4.count} ({progressDist.q4.pct}%)</b></span>
                </div>
              </div>
            </section>

            <section className="sr-card sr-chart-card">
              <h2>Sprints by Owner</h2>
              <div className="sr-owner-chart">
                {ownersList.slice(0, 5).map((o, i) => {
                  const val = sprints.filter((s) => s.ownerName === o.name).length;
                  const maxCount = Math.max(1, ...ownersList.map((x) => sprints.filter((s) => s.ownerName === x.name).length));
                  return (
                    <div className="sr-owner-column" key={o.name}>
                      <b>{val}</b>
                      <i style={{ height: `${Math.max(10, (val / maxCount) * 100)}%` }} className={`owner-${i % 5}`} />
                      <div className="sr-avatar">{o.name.split(" ").map((x: string) => x[0]).join("")}</div>
                      <span>{o.name.split(" ")[0]}</span>
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
                  <tr>
                    <th>Sprint ID</th>
                    <th>Sprint Name</th>
                    <th>Project</th>
                    <th>Status</th>
                    <th>Owner</th>
                    <th>Timeline</th>
                    <th>Execution</th>
                  </tr>
                </thead>
                <tbody>
                  {sprints.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "1.5rem", color: "#64748b" }}>
                        No sprint activity recorded yet.
                      </td>
                    </tr>
                  ) : (
                    sprints.slice(0, 5).map((s) => (
                      <tr key={s.id}>
                        <td className="sr-id">
                          <Link href={`/sprints/${encodeURIComponent(s._id || s.id)}/active`}>
                            {s.sprintCode || s.id}
                          </Link>
                        </td>
                        <td><strong>{s.name}</strong></td>
                        <td className="sr-id">{s.projectName || s.projectCode || "Project"}</td>
                        <td><StatusBadge status={s.status} /></td>
                        <td>{s.ownerName || "Unassigned"}</td>
                        <td>{s.start || s.startDate || "Scheduled"}</td>
                        <td>{s.progress}% Completed</td>
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
              <DonutChart
                total={counts.total}
                completed={counts.completed}
                inProgress={counts.progress}
                upcoming={counts.upcoming}
                overdue={counts.overdue}
              />
              <div className="sr-status-legend">
                <span><i className="green" />Completed <b>{counts.completed} ({counts.total ? ((counts.completed / counts.total) * 100).toFixed(1) : "0.0"}%)</b></span>
                <span><i className="blue" />In Progress <b>{counts.progress} ({counts.total ? ((counts.progress / counts.total) * 100).toFixed(1) : "0.0"}%)</b></span>
                <span><i className="orange" />Upcoming <b>{counts.upcoming} ({counts.total ? ((counts.upcoming / counts.total) * 100).toFixed(1) : "0.0"}%)</b></span>
                <span><i className="red" />Overdue <b>{counts.overdue} ({counts.total ? ((counts.overdue / counts.total) * 100).toFixed(1) : "0.0"}%)</b></span>
              </div>
            </div>
          </section>

          <section className="sr-card sr-milestone-chart">
            <h2>Sprints by Milestone</h2>
            {sprints.length === 0 ? (
              <p style={{ textAlign: "center", padding: "1rem", color: "#667085", fontSize: "0.85rem" }}>
                No milestone sprint data available.
              </p>
            ) : (
              Array.from(new Set(sprints.map((s) => s.milestoneName || "General Scope"))).slice(0, 4).map((label, i) => {
                const count = sprints.filter((s) => (s.milestoneName || "General Scope") === label).length;
                return (
                  <div className="sr-horizontal-bar" key={label}>
                    <span>{label}</span>
                    <div>
                      <i className={`milestone-${i}`} style={{ width: `${Math.min(100, (count / (sprints.length || 1)) * 100)}%` }} />
                    </div>
                    <b>{count}</b>
                  </div>
                );
              })
            )}
            <div className="sr-chart-scale">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </section>

          <section className="sr-card sr-mini-list">
            <div className="sr-card-heading">
              <h2>Overdue Sprints</h2>
              <button type="button" onClick={() => { setStatus("Overdue"); setPage(1); }}>View All</button>
            </div>
            {sprints.filter((s) => s.status === "Overdue").length > 0 ? (
              sprints
                .filter((s) => s.status === "Overdue")
                .slice(0, 3)
                .map((s) => (
                  <div className="sr-mini-row" key={s.id}>
                    <b>{s.sprintCode || s.id}</b>
                    <span>{s.name}</span>
                    <small>{s.end || s.endDate || "Past due"}</small>
                    <em className="critical">{s.priority}</em>
                  </div>
                ))
            ) : (
              <p style={{ margin: "12px 0", fontSize: "12.5px", color: "#64748b" }}>
                No overdue sprints in project backlog.
              </p>
            )}
          </section>

          <section className="sr-card sr-mini-list">
            <div className="sr-card-heading">
              <h2>Upcoming Sprints</h2>
              <button type="button" onClick={() => { setStatus("Upcoming"); setPage(1); }}>View All</button>
            </div>
            {sprints.filter((s) => s.status === "Upcoming").length > 0 ? (
              sprints
                .filter((s) => s.status === "Upcoming")
                .slice(0, 3)
                .map((s) => (
                  <div className="sr-mini-row" key={s.id}>
                    <b>{s.sprintCode || s.id}</b>
                    <span>{s.name}</span>
                    <small>{s.start || s.startDate || "Scheduled"}</small>
                  </div>
                ))
            ) : (
              <p style={{ margin: "12px 0", fontSize: "12.5px", color: "#64748b" }}>
                No upcoming sprints queued.
              </p>
            )}
          </section>

          <section className="sr-card sr-quick-actions">
            <h2>Quick Actions</h2>
            <div>
              <button type="button" onClick={() => router.push("/sprints/new")}>
                <PlusCircle />
                <span>Create Sprint</span>
              </button>
              <button type="button" onClick={() => router.push("/milestones/calendar")}>
                <CalendarDays />
                <span>Sprint Calendar</span>
              </button>
              <button type="button" onClick={() => router.push("/milestones/timeline")}>
                <Activity />
                <span>Sprint Timeline</span>
              </button>
              <button type="button" onClick={exportCSV}>
                <FileText />
                <span>Sprint Report</span>
              </button>
              <button type="button" onClick={() => router.push("/milestones/progress-rules")}>
                <FolderKanban />
                <span>Progress Rules</span>
              </button>
              <button type="button" onClick={() => router.push("/milestones")}>
                <Settings />
                <span>Milestone Registry</span>
              </button>
            </div>
          </section>
        </aside>
      </section>

      {showCreate && (
        <div className="sr-modal-backdrop" onClick={() => setShowCreate(false)}>
          <form className="sr-modal" onSubmit={createSprint} onClick={(e) => e.stopPropagation()}>
            <div className="sr-modal-heading">
              <div>
                <h2>Create Sprint</h2>
                <p>Add a sprint to the project registry.</p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <label>
              Sprint Name
              <input
                required
                value={newSprintName}
                onChange={(e) => setNewSprintName(e.target.value)}
                placeholder="e.g. Telehealth Engine Sprint 1"
              />
            </label>
            <div className="sr-form-grid">
              <label>
                Project
                <select value={newSprintProject} onChange={(e) => setNewSprintProject(e.target.value)}>
                  {projectsList.map((p: any) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.projectCode ? `${p.projectCode} - ` : ""}{p.projectName || "Project"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Milestone
                <select value={newSprintMilestone} onChange={(e) => setNewSprintMilestone(e.target.value)}>
                  <option value="">General Scope (No Milestone)</option>
                  {milestonesList.map((m: any) => (
                    <option key={m._id || m.id} value={m._id || m.id}>
                      {m.milestoneCode ? `${m.milestoneCode} - ` : ""}{m.title || m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sprint Owner
                <select value={newSprintOwner} onChange={(e) => setNewSprintOwner(e.target.value)}>
                  {ownersList.map((o) => (
                    <option key={o.id} value={o.name}>{o.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Start Date
                <input
                  type="date"
                  required
                  value={newSprintStart}
                  onChange={(e) => setNewSprintStart(e.target.value)}
                />
              </label>
              <label>
                End Date
                <input
                  type="date"
                  required
                  min={newSprintStart}
                  value={newSprintEnd}
                  onChange={(e) => setNewSprintEnd(e.target.value)}
                />
              </label>
            </div>
            <div className="sr-modal-actions">
              <button type="button" className="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button type="submit" className="sr-primary">
                Create Sprint
              </button>
            </div>
          </form>
        </div>
      )}

      {showImport && (
        <div className="sr-modal-backdrop" onClick={() => setShowImport(false)}>
          <div className="sr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sr-modal-heading">
              <div>
                <h2>Import Sprints</h2>
                <p>Choose a CSV file to import sprint definitions.</p>
              </div>
              <button type="button" onClick={() => setShowImport(false)}><X size={18} /></button>
            </div>
            <div className="sr-upload-box">
              <Upload size={25} />
              <b>Choose CSV file</b>
              <span>Upload formatted sprint CSV backlog</span>
              <input type="file" accept=".csv" />
            </div>
            <div className="sr-modal-actions">
              <button type="button" className="secondary" onClick={() => setShowImport(false)}>
                Cancel
              </button>
              <button type="button" className="sr-primary" onClick={() => setShowImport(false)}>
                Close
              </button>
            </div>
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
      <div>
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <ChevronDown size={12} />
      </div>
    </label>
  );
}
