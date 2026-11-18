"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Download,
  Plus,
  ChevronRight,
  ChevronLeft,
  ClipboardList,
  ListTodo,
  Clock3,
  CheckCircle2,
  FlaskConical,
  AlertCircle,
  MoreVertical,
  CalendarDays,
  X,
  RefreshCw,
  Timer,
  Eye,
  Pencil,
} from "lucide-react";
import { projects as getProjectsApi } from "../../lib/api";
import { sprintApi, type Sprint } from "../../lib/sprints/api";
import { getStoredUser } from "../../lib/auth";
import {
  taskApi,
  getInitials,
  toBackendStatus,
  type NormalizedTask,
  type UiTaskStatus,
} from "../../lib/tasks/api";
import "./my-tasks.css";

const statuses: UiTaskStatus[] = ["To Do", "In Progress", "In Review", "Testing", "Done"];

function statusTone(status: string) {
  const key = status.toLowerCase().replace(/\s+/g, "-");
  if (key === "done") return "done";
  if (key === "in-progress") return "in-progress";
  if (key === "in-review") return "in-review";
  if (key === "testing") return "testing";
  return "to-do";
}

export default function MyTasksView() {
  const router = useRouter();
  const [tasks, setTasks] = useState<NormalizedTask[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [currentUserName, setCurrentUserName] = useState("");
  const [loading, setLoading] = useState(true);

  const [scope, setScope] = useState<"ALL" | "MINE">("ALL");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All");
  const [sprintFilter, setSprintFilter] = useState("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals (Panels 4, 5, 6 of TSK-006.png)
  const [detailTask, setDetailTask] = useState<NormalizedTask | null>(null);
  const [statusModalTask, setStatusModalTask] = useState<NormalizedTask | null>(null);
  const [nextStatusVal, setNextStatusVal] = useState<UiTaskStatus>("In Progress");
  const [nextProgressVal, setNextProgressVal] = useState(50);
  const [statusComment, setStatusComment] = useState("");

  const [timeModalTask, setTimeModalTask] = useState<NormalizedTask | null>(null);
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [logHours, setLogHours] = useState("1");
  const [logWorkType, setLogWorkType] = useState("Development");
  const [logBillable, setLogBillable] = useState("Billable");
  const [logDesc, setLogDesc] = useState("");

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const user = getStoredUser();
      if (user?.name) setCurrentUserName(user.name);

      const [tRes, pRes, sRes] = await Promise.allSettled([
        taskApi.list({ limit: 100 }),
        getProjectsApi({ limit: 100 }).catch(() => []),
        sprintApi.list({ limit: 100 }).catch(() => ({ items: [], total: 0 })),
      ]);

      if (tRes.status === "fulfilled") setTasks(tRes.value.items || []);
      if (pRes.status === "fulfilled") {
        const raw: any = pRes.value;
        setProjects(Array.isArray(raw) ? raw : raw?.data || raw?.items || []);
      }
      if (sRes.status === "fulfilled") setSprints(sRes.value.items || []);
    } catch (err: any) {
      notify(`Failed to load tasks: ${err?.message || "Server error"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const scopedTasks = useMemo(() => {
    if (scope === "MINE" && currentUserName) {
      return tasks.filter((t) => t.assignee.toLowerCase() === currentUserName.toLowerCase());
    }
    return tasks;
  }, [tasks, scope, currentUserName]);

  const filteredTasks = useMemo(() => {
    const term = search.toLowerCase().trim();
    return scopedTasks.filter((t) => {
      const matchesSearch =
        !term ||
        t.taskId.toLowerCase().includes(term) ||
        t.title.toLowerCase().includes(term) ||
        t.projectName.toLowerCase().includes(term);
      return (
        matchesSearch &&
        (statusFilter === "All" || t.status === statusFilter) &&
        (priorityFilter === "All" || t.priority === priorityFilter) &&
        (projectFilter === "All" || t.projectId === projectFilter) &&
        (sprintFilter === "All" || t.sprintId === sprintFilter)
      );
    });
  }, [scopedTasks, search, statusFilter, priorityFilter, projectFilter, sprintFilter]);

  const total = scopedTasks.length;
  const countStatus = (s: UiTaskStatus) => scopedTasks.filter((t) => t.status === s).length;
  const overdueCount = scopedTasks.filter((t) => t.isOverdue).length;
  const pct = (n: number) => (total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "0%");

  const pageCount = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleTasks = filteredTasks.slice((safePage - 1) * pageSize, safePage * pageSize);

  const upcomingTasks = useMemo(
    () =>
      scopedTasks
        .filter((t) => t.status !== "Done")
        .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"))
        .slice(0, 4),
    [scopedTasks]
  );

  const recentActivities = useMemo(() => {
    const list: { initials: string; text: string; time: string; ts: number }[] = [];
    scopedTasks.forEach((t) => {
      (t.activityLog || []).forEach((ev: any) => {
        const actor = ev.performedBy || t.assignee || "Team";
        list.push({
          initials: getInitials(actor),
          text: ev.details || `${t.taskId} updated to ${t.status}`,
          time: ev.timestamp
            ? new Date(ev.timestamp).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
            : "Recent",
          ts: ev.timestamp ? new Date(ev.timestamp).getTime() : 0,
        });
      });
    });
    return list.sort((a, b) => b.ts - a.ts).slice(0, 4);
  }, [scopedTasks]);

  const openStatusModal = (t: NormalizedTask) => {
    setStatusModalTask(t);
    setNextStatusVal(t.status);
    setNextProgressVal(t.progress);
    setStatusComment("");
    setMenuId(null);
  };

  const openTimeModal = (t: NormalizedTask) => {
    setTimeModalTask(t);
    setLogDate(new Date().toISOString().slice(0, 10));
    setLogHours("1");
    setLogWorkType(t.type || "Development");
    setLogBillable("Billable");
    setLogDesc("");
    setMenuId(null);
  };

  const handleSaveStatus = async () => {
    if (!statusModalTask || saving) return;
    try {
      setSaving(true);
      const backendStatus = toBackendStatus(nextStatusVal);
      const nextComments = statusComment.trim()
        ? [
            ...(statusModalTask.comments || []),
            {
              author: currentUserName || "Team Member",
              text: statusComment.trim(),
              createdAt: new Date().toISOString(),
            },
          ]
        : statusModalTask.comments;

      const updated = await taskApi.update(statusModalTask._id, {
        status: backendStatus,
        progress: nextStatusVal === "Done" ? 100 : nextProgressVal,
        comments: nextComments,
      });
      setTasks((prev) => prev.map((t) => (t._id === statusModalTask._id ? updated : t)));
      if (detailTask?._id === statusModalTask._id) setDetailTask(updated);
      setStatusModalTask(null);
      notify(`${statusModalTask.taskId} updated to ${nextStatusVal} (${nextStatusVal === "Done" ? 100 : nextProgressVal}%).`);
    } catch (err: any) {
      notify(`Failed to update status: ${err?.message || "API error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTime = async () => {
    if (!timeModalTask || saving) return;
    const hrs = Number(logHours) || 0;
    if (hrs <= 0) {
      notify("Enter duration greater than 0 hours.");
      return;
    }
    try {
      setSaving(true);
      const nextActual = Number((timeModalTask.actualHours + hrs).toFixed(2));
      const nextLogs = [
        ...(timeModalTask.timeLogs || []),
        {
          date: logDate,
          hours: hrs,
          workType: logWorkType,
          billable: logBillable === "Billable",
          description: logDesc.trim(),
          loggedBy: currentUserName || "Team Member",
          loggedAt: new Date().toISOString(),
        },
      ];
      const updated = await taskApi.update(timeModalTask._id, {
        actualHours: nextActual,
        timeLogs: nextLogs,
      });
      setTasks((prev) => prev.map((t) => (t._id === timeModalTask._id ? updated : t)));
      if (detailTask?._id === timeModalTask._id) setDetailTask(updated);
      setTimeModalTask(null);
      notify(`Logged ${hrs}h on ${timeModalTask.taskId} (Total: ${nextActual}h).`);
    } catch (err: any) {
      notify(`Failed to log time: ${err?.message || "API error"}`);
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const headers = ["ID", "Task Title", "Project", "Sprint", "Status", "Priority", "Due Date", "Est. Hrs", "Logged Hrs", "Progress"];
    const rows = filteredTasks.map((t) => [
      t.taskId, t.title, t.projectName, t.sprintName, t.status, t.priority, t.dueDateLabel, `${t.estimatedHours}h`, `${t.actualHours}h`, `${t.progress}%`,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-tasks.csv";
    a.click();
    URL.revokeObjectURL(url);
    notify("Tasks exported as CSV.");
  };

  // Multi-segment donut gradient for Right Sidebar
  const donutGradient = (() => {
    if (total === 0) return "#e2e8f0";
    const sTodo = (countStatus("To Do") / total) * 100;
    const sProg = sTodo + (countStatus("In Progress") / total) * 100;
    const sRev = sProg + (countStatus("In Review") / total) * 100;
    const sTest = sRev + (countStatus("Testing") / total) * 100;
    return `conic-gradient(#2563eb 0 ${sTodo}%, #f59e0b ${sTodo}% ${sProg}%, #7c3aed ${sProg}% ${sRev}%, #14b8a6 ${sRev}% ${sTest}%, #10b981 ${sTest}% 100%)`;
  })();

  return (
    <main className="mt-page">
      {/* Top Bar (Exact TSK-006 layout) */}
      <header className="mt-topbar">
        <div className="mt-title">
          <div className="mt-breadcrumb">
            <span onClick={() => router.push("/dashboard")}>Dashboard</span>
            <ChevronRight size={12} />
            <b>My Tasks</b>
          </div>
          <h1>My Tasks</h1>
          <p>Tasks assigned across projects and sprints</p>
        </div>

        <div className="mt-top-actions">
          <div className="mt-scope-toggle">
            <button className={scope === "ALL" ? "active" : ""} onClick={() => setScope("ALL")}>
              All Team ({tasks.length})
            </button>
            <button className={scope === "MINE" ? "active" : ""} onClick={() => setScope("MINE")}>
              Assigned to Me
            </button>
          </div>
          <button className="mt-btn" onClick={exportCsv}>
            <Download size={13} /> Export
          </button>
          <button className="mt-btn mt-btn-primary" onClick={() => router.push("/tasks/new")}>
            <Plus size={13} /> Create Task
          </button>
        </div>
      </header>

      {/* Main 2-Column Layout */}
      <div className="mt-layout">
        <div className="mt-main">
          {/* 6-KPI Strip (Exact TSK-006 Panel 1) */}
          <section className="mt-kpi-strip">
            <div className="mt-kpi">
              <div className="mt-kpi-icon slate"><ClipboardList size={15} /></div>
              <div className="mt-kpi-body">
                <span>Total Tasks</span>
                <div className="mt-kpi-val"><strong>{total}</strong></div>
              </div>
            </div>
            <div className="mt-kpi">
              <div className="mt-kpi-icon blue"><ListTodo size={15} /></div>
              <div className="mt-kpi-body">
                <span>To Do</span>
                <div className="mt-kpi-val">
                  <strong>{countStatus("To Do")}</strong>
                  <small className="blue">{pct(countStatus("To Do"))}</small>
                </div>
              </div>
            </div>
            <div className="mt-kpi">
              <div className="mt-kpi-icon amber"><Clock3 size={15} /></div>
              <div className="mt-kpi-body">
                <span>In Progress</span>
                <div className="mt-kpi-val">
                  <strong>{countStatus("In Progress")}</strong>
                  <small className="amber">{pct(countStatus("In Progress"))}</small>
                </div>
              </div>
            </div>
            <div className="mt-kpi">
              <div className="mt-kpi-icon purple"><Pencil size={15} /></div>
              <div className="mt-kpi-body">
                <span>In Review</span>
                <div className="mt-kpi-val">
                  <strong>{countStatus("In Review")}</strong>
                  <small className="purple">{pct(countStatus("In Review"))}</small>
                </div>
              </div>
            </div>
            <div className="mt-kpi">
              <div className="mt-kpi-icon teal"><FlaskConical size={15} /></div>
              <div className="mt-kpi-body">
                <span>Testing</span>
                <div className="mt-kpi-val">
                  <strong>{countStatus("Testing")}</strong>
                  <small className="teal">{pct(countStatus("Testing"))}</small>
                </div>
              </div>
            </div>
            <div className="mt-kpi">
              <div className="mt-kpi-icon red"><AlertCircle size={15} /></div>
              <div className="mt-kpi-body">
                <span>Overdue</span>
                <div className="mt-kpi-val">
                  <strong>{overdueCount}</strong>
                  <small className="red">{pct(overdueCount)}</small>
                </div>
              </div>
            </div>
          </section>

          {/* Filter Bar + Table Card (Exact TSK-006 Panel 3) */}
          <section className="mt-card">
            <div className="mt-filterbar">
              <label className="mt-search">
                <Search size={13} />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search tasks..."
                />
              </label>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="All">Status (All)</option>
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}>
                <option value="All">Priority (All)</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <select value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }}>
                <option value="All">Project (All)</option>
                {projects.map((p) => (
                  <option key={p._id || p.id} value={p._id || p.id}>{p.projectName || p.name}</option>
                ))}
              </select>
              <select value={sprintFilter} onChange={(e) => { setSprintFilter(e.target.value); setPage(1); }}>
                <option value="All">Sprint (All)</option>
                {sprints.map((s) => (
                  <option key={s._id || s.id} value={s._id || s.id}>{s.sprintCode} — {s.name}</option>
                ))}
              </select>
            </div>

            <div className="mt-table-wrap">
              <table className="mt-table">
                <thead>
                  <tr>
                    <th style={{ width: "30px" }}>
                      <input
                        type="checkbox"
                        checked={visibleTasks.length > 0 && visibleTasks.every((t) => selectedIds.includes(t._id))}
                        onChange={(e) => setSelectedIds(e.target.checked ? visibleTasks.map((t) => t._id) : [])}
                      />
                    </th>
                    <th>ID</th>
                    <th>Task Title</th>
                    <th>Project</th>
                    <th>Sprint</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Due Date</th>
                    <th>Est. Hrs</th>
                    <th>Logged Hrs</th>
                    <th>Progress</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={12} style={{ textAlign: "center", padding: "28px", color: "#64748b" }}>Loading tasks...</td></tr>
                  ) : visibleTasks.length === 0 ? (
                    <tr><td colSpan={12} style={{ textAlign: "center", padding: "28px", color: "#64748b" }}>No tasks found in this view.</td></tr>
                  ) : (
                    visibleTasks.map((t) => (
                      <tr key={t._id} onClick={() => setDetailTask(t)}>
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(t._id)}
                            onChange={() =>
                              setSelectedIds((prev) =>
                                prev.includes(t._id) ? prev.filter((x) => x !== t._id) : [...prev, t._id]
                              )
                            }
                          />
                        </td>
                        <td><span className="mt-id-link">{t.taskId}</span></td>
                        <td className="mt-title-cell" title={t.title}>{t.title}</td>
                        <td>{t.projectName}</td>
                        <td>{t.sprintCode || t.sprintName}</td>
                        <td><span className={`mt-pill ${statusTone(t.status)}`}>{t.status}</span></td>
                        <td><span className={`mt-priority ${t.priority.toLowerCase()}`}>{t.priority}</span></td>
                        <td style={t.isOverdue ? { color: "#dc2626", fontWeight: 600 } : undefined}>{t.dueDateLabel}</td>
                        <td>{t.estimatedHours}h</td>
                        <td>{t.actualHours}h</td>
                        <td>
                          <span className="mt-progress-cell">
                            <b>{t.progress}%</b>
                            <span className="mt-progress-track">
                              <span style={{ width: `${t.progress}%` }} />
                            </span>
                          </span>
                        </td>
                        <td className="mt-row-action" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setMenuId(menuId === t._id ? null : t._id)}
                            style={{ border: 0, background: "transparent", cursor: "pointer", color: "#64748b" }}
                            aria-label={`Actions for ${t.taskId}`}
                          >
                            <MoreVertical size={14} />
                          </button>
                          {menuId === t._id && (
                            <div className="mt-row-menu">
                              <button onClick={() => { setDetailTask(t); setMenuId(null); }}>
                                <Eye size={12} /> Task Detail
                              </button>
                              <button onClick={() => openStatusModal(t)}>
                                <RefreshCw size={12} /> Update Status
                              </button>
                              <button onClick={() => openTimeModal(t)}>
                                <Timer size={12} /> Log Time
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-pagination">
              <span>
                Showing {filteredTasks.length ? (safePage - 1) * pageSize + 1 : 0} to{" "}
                {Math.min(safePage * pageSize, filteredTasks.length)} of {filteredTasks.length} tasks
              </span>
              <div className="mt-page-btns">
                <button disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft size={12} />
                </button>
                {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => i + 1).map((n) => (
                  <button key={n} className={safePage === n ? "active" : ""} onClick={() => setPage(n)}>
                    {n}
                  </button>
                ))}
                <button disabled={safePage === pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
                  <ChevronRight size={12} />
                </button>
              </div>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                style={{ height: "26px", border: "1px solid #dce5f2", borderRadius: "5px", fontSize: "11px", padding: "0 6px" }}
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </section>
        </div>

        {/* Right Sidebar (3 Stacked Cards Exact Match to TSK-006) */}
        <aside className="mt-sidebar">
          <section className="mt-side-card">
            <div className="mt-side-head">
              <h3>My Task Summary</h3>
            </div>
            <div className="mt-summary-chart">
              <div className="mt-donut" style={{ background: donutGradient }}>
                <div className="mt-donut-inner">
                  <strong>{total}</strong>
                  <small>Total</small>
                </div>
              </div>
              <div className="mt-legend">
                {[
                  { label: "To Do", count: countStatus("To Do"), color: "#2563eb" },
                  { label: "In Progress", count: countStatus("In Progress"), color: "#f59e0b" },
                  { label: "In Review", count: countStatus("In Review"), color: "#7c3aed" },
                  { label: "Testing", count: countStatus("Testing"), color: "#14b8a6" },
                  { label: "Done", count: countStatus("Done"), color: "#10b981" },
                  { label: "Overdue", count: overdueCount, color: "#ef4444" },
                ].map((row) => (
                  <div className="mt-legend-row" key={row.label}>
                    <span><i className="mt-dot" style={{ background: row.color }} />{row.label}</span>
                    <b>{row.count} <small style={{ color: "#94a3b8", fontWeight: 500 }}>({pct(row.count)})</small></b>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-side-card">
            <div className="mt-side-head">
              <h3><CalendarDays size={13} color="#0755e9" /> Upcoming Focus</h3>
              <small>{new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</small>
            </div>
            <div className="mt-agenda-list">
              {upcomingTasks.length === 0 ? (
                <p style={{ margin: 0, color: "#64748b", fontSize: "11px" }}>All tasks completed!</p>
              ) : (
                upcomingTasks.map((t) => (
                  <div className="mt-agenda-item" key={t._id} onClick={() => setDetailTask(t)}>
                    <span className="mt-agenda-time">{t.dueDateLabel}</span>
                    <div>
                      <strong>{t.title}</strong>
                      <small>{t.taskId} • {t.projectName}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="mt-side-card">
            <div className="mt-side-head">
              <h3>Recent Activity</h3>
              <button onClick={() => router.push("/tasks/audit")}>View all</button>
            </div>
            <div className="mt-activity-list">
              {recentActivities.length === 0 ? (
                <p style={{ margin: 0, color: "#64748b", fontSize: "11px" }}>No recent activity logged yet.</p>
              ) : (
                recentActivities.map((act, idx) => (
                  <div className="mt-activity-item" key={idx}>
                    <span className="mt-avatar">{act.initials}</span>
                    <div>
                      <p>{act.text}</p>
                      <small>{act.time}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>

      {/* PANEL 4: TASK DETAIL MODAL */}
      {detailTask && (
        <div className="mt-modal-backdrop" onClick={() => setDetailTask(null)}>
          <div className="mt-modal wide" onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="mt-id-link">{detailTask.taskId}</span>
                <span className={`mt-pill ${statusTone(detailTask.status)}`}>{detailTask.status}</span>
              </div>
              <button onClick={() => setDetailTask(null)} style={{ border: 0, background: "transparent", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>
            <div className="mt-modal-body">
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>{detailTask.title}</h3>
              <div className="mt-detail-grid">
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <strong style={{ display: "block", fontSize: "11.5px", marginBottom: "4px" }}>Description</strong>
                    <p style={{ margin: 0, fontSize: "11.5px", color: "#475569", lineHeight: 1.55 }}>
                      {detailTask.description || "No description provided."}
                    </p>
                  </div>
                  <div>
                    <strong style={{ display: "block", fontSize: "11.5px", marginBottom: "4px" }}>Acceptance Criteria</strong>
                    <p style={{ margin: 0, fontSize: "11.5px", color: "#475569", whiteSpace: "pre-line" }}>
                      {detailTask.acceptanceCriteria || "—"}
                    </p>
                  </div>
                  <div>
                    <strong style={{ display: "block", fontSize: "11.5px", marginBottom: "4px" }}>Definition of Done</strong>
                    <p style={{ margin: 0, fontSize: "11.5px", color: "#475569", whiteSpace: "pre-line" }}>
                      {detailTask.definitionOfDone || "—"}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "11.5px", background: "#f8fafd", padding: "12px", borderRadius: "8px", border: "1px solid #eef2f8" }}>
                  <div><span style={{ color: "#64748b" }}>Project:</span> <b>{detailTask.projectName}</b></div>
                  <div><span style={{ color: "#64748b" }}>Sprint:</span> <b>{detailTask.sprintName}</b></div>
                  <div><span style={{ color: "#64748b" }}>Assignee:</span> <b>{detailTask.assignee}</b></div>
                  <div><span style={{ color: "#64748b" }}>Reporter:</span> <b>{detailTask.reporter}</b></div>
                  <div><span style={{ color: "#64748b" }}>Est. Hours:</span> <b>{detailTask.estimatedHours}h</b></div>
                  <div><span style={{ color: "#64748b" }}>Logged Hours:</span> <b>{detailTask.actualHours}h</b></div>
                  <div><span style={{ color: "#64748b" }}>Remaining:</span> <b>{Math.max(0, detailTask.estimatedHours - detailTask.actualHours)}h</b></div>
                  <div><span style={{ color: "#64748b" }}>Due Date:</span> <b>{detailTask.dueDateLabel}</b></div>
                  <div><span style={{ color: "#64748b" }}>Progress:</span> <b>{detailTask.progress}%</b></div>
                </div>
              </div>
            </div>
            <div className="mt-modal-foot">
              <button className="mt-btn" onClick={() => { openTimeModal(detailTask); }}>
                <Timer size={13} /> Log Time
              </button>
              <button className="mt-btn mt-btn-primary" onClick={() => { openStatusModal(detailTask); }}>
                <RefreshCw size={13} /> Update Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANEL 5: UPDATE TASK STATUS MODAL (Exact TSK-006 Panel 5) */}
      {statusModalTask && (
        <div className="mt-modal-backdrop" onClick={() => setStatusModalTask(null)}>
          <div className="mt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-head">
              <h2>Update Status — {statusModalTask.taskId}</h2>
              <button onClick={() => setStatusModalTask(null)} style={{ border: 0, background: "transparent", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>
            <div className="mt-modal-body">
              <div className="mt-status-tiles">
                {statuses.map((st) => (
                  <button
                    type="button"
                    key={st}
                    className={`mt-status-tile ${nextStatusVal === st ? "selected" : ""}`}
                    onClick={() => {
                      setNextStatusVal(st);
                      if (st === "Done") setNextProgressVal(100);
                      else if (st === "To Do") setNextProgressVal(0);
                    }}
                  >
                    {st === "Done" ? <CheckCircle2 size={16} /> : st === "Testing" ? <FlaskConical size={16} /> : st === "In Progress" ? <Clock3 size={16} /> : <ListTodo size={16} />}
                    <span>{st}</span>
                  </button>
                ))}
              </div>

              <label className="mt-field">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Progress %</span>
                  <strong>{nextProgressVal}%</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={nextProgressVal}
                  onChange={(e) => setNextProgressVal(Number(e.target.value))}
                  style={{ accentColor: "#0755e9", padding: 0, border: 0 }}
                />
              </label>

              <label className="mt-field">
                <span>Comment (Optional)</span>
                <textarea
                  rows={3}
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  placeholder="Share an update or note about this status change..."
                />
              </label>
            </div>
            <div className="mt-modal-foot">
              <button className="mt-btn" onClick={() => setStatusModalTask(null)}>Cancel</button>
              <button className="mt-btn mt-btn-primary" disabled={saving} onClick={handleSaveStatus}>
                {saving ? "Saving..." : "Update Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANEL 6: LOG TIME MODAL (Exact TSK-006 Panel 6) */}
      {timeModalTask && (
        <div className="mt-modal-backdrop" onClick={() => setTimeModalTask(null)}>
          <div className="mt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-head">
              <h2>Log Time — {timeModalTask.taskId}</h2>
              <button onClick={() => setTimeModalTask(null)} style={{ border: 0, background: "transparent", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>
            <div className="mt-modal-body">
              <div className="mt-form-grid">
                <label className="mt-field">
                  <span>Date</span>
                  <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
                </label>
                <label className="mt-field">
                  <span>Duration (Hours)</span>
                  <input type="number" step="0.5" min="0.5" max="24" value={logHours} onChange={(e) => setLogHours(e.target.value)} />
                </label>
                <label className="mt-field">
                  <span>Work Type</span>
                  <select value={logWorkType} onChange={(e) => setLogWorkType(e.target.value)}>
                    <option>Development</option>
                    <option>Design</option>
                    <option>Code Review</option>
                    <option>Testing / QA</option>
                    <option>Documentation</option>
                  </select>
                </label>
                <label className="mt-field">
                  <span>Billable</span>
                  <select value={logBillable} onChange={(e) => setLogBillable(e.target.value)}>
                    <option>Billable</option>
                    <option>Non-Billable</option>
                  </select>
                </label>
              </div>
              <label className="mt-field">
                <span>Description</span>
                <textarea
                  rows={3}
                  value={logDesc}
                  onChange={(e) => setLogDesc(e.target.value)}
                  placeholder="Describe the work completed..."
                />
              </label>
            </div>
            <div className="mt-modal-foot">
              <button className="mt-btn" onClick={() => setTimeModalTask(null)}>Cancel</button>
              <button className="mt-btn mt-btn-primary" disabled={saving} onClick={handleSaveTime}>
                {saving ? "Saving..." : "Save Time"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="mt-toast">
          <CheckCircle2 size={14} color="#34d399" />
          <span>{toast}</span>
        </div>
      )}
    </main>
  );
}
