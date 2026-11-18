"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Download,
  RefreshCw,
  MessageSquare,
  Paperclip,
  Clock3,
  PlusCircle,
  UserCheck,
  X,
  ArrowRight,
} from "lucide-react";
import { getOrganizationAudit } from "../../lib/api";
import { taskApi, getInitials, type NormalizedTask } from "../../lib/tasks/api";
import "./task-activity.css";

type ActivityItem = {
  id: string;
  action: string;
  label: string;
  typeLabel: string;
  tone: "status" | "comment" | "time" | "attach" | "create" | "assign";
  taskId: string;
  taskTitle: string;
  projectName: string;
  sprintName: string;
  performedBy: string;
  initials: string;
  previousState: string;
  newState: string;
  details: string;
  timestamp: string;
  ts: number;
};

function classifyEvent(action: string): { label: string; typeLabel: string; tone: ActivityItem["tone"] } {
  const a = String(action || "").toUpperCase();
  if (a.includes("TIME")) return { label: "Time logged", typeLabel: "Time Log", tone: "time" };
  if (a.includes("COMMENT")) return { label: "Comment added", typeLabel: "Comment", tone: "comment" };
  if (a.includes("ATTACH")) return { label: "Attachment added", typeLabel: "Attachment", tone: "attach" };
  if (a.includes("REASSIGN") || a.includes("ASSIGN")) return { label: "Task reassigned", typeLabel: "Reassignment", tone: "assign" };
  if (a.includes("CREAT")) return { label: "Task created", typeLabel: "Task Created", tone: "create" };
  return { label: "Status changed", typeLabel: "Status Change", tone: "status" };
}

function EventIcon({ tone }: { tone: ActivityItem["tone"] }) {
  if (tone === "time") return <Clock3 size={11} />;
  if (tone === "comment") return <MessageSquare size={11} />;
  if (tone === "attach") return <Paperclip size={11} />;
  if (tone === "assign") return <UserCheck size={11} />;
  if (tone === "create") return <PlusCircle size={11} />;
  return <RefreshCw size={11} />;
}

export default function TaskActivityAudit() {
  const router = useRouter();
  const [view, setView] = useState<"feed" | "summary">("feed");
  const [tasks, setTasks] = useState<NormalizedTask[]>([]);
  const [events, setEvents] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [userFilter, setUserFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedEvent, setSelectedEvent] = useState<ActivityItem | null>(null);

  useEffect(() => {
    Promise.allSettled([
      taskApi.list({ limit: 100 }),
      getOrganizationAudit({ limit: 50 }).catch(() => ({ items: [] })),
    ])
      .then(([tRes, aRes]) => {
        const loadedTasks = tRes.status === "fulfilled" ? tRes.value.items || [] : [];
        setTasks(loadedTasks);

        const merged: ActivityItem[] = [];
        const fmt = (iso: string) =>
          new Date(iso).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });

        loadedTasks.forEach((task) => {
          if (task.activityLog && task.activityLog.length > 0) {
            task.activityLog.forEach((ev: any, idx: number) => {
              const meta = classifyEvent(ev.action || "STATUS_TRANSITION");
              const actor = ev.performedBy || task.assignee || task.reporter || "Team Member";
              const ts = ev.timestamp ? new Date(ev.timestamp).getTime() : 0;
              merged.push({
                id: ev.id || `ACT-${task.taskId}-${idx + 1}`,
                action: ev.action || "STATUS_TRANSITION",
                ...meta,
                taskId: task.taskId,
                taskTitle: task.title,
                projectName: task.projectName,
                sprintName: task.sprintName,
                performedBy: actor,
                initials: getInitials(actor),
                previousState: ev.previousState || "—",
                newState: ev.newState || task.status,
                details:
                  ev.previousState && ev.newState && ev.previousState !== "None"
                    ? `${ev.previousState} → ${ev.newState}`
                    : ev.details || `Updated ${task.taskId}`,
                timestamp: ev.timestamp ? fmt(ev.timestamp) : "Recent",
                ts,
              });
            });
          } else if (task.createdAt) {
            const meta = classifyEvent("TASK_CREATED");
            const actor = task.reporter || "System";
            merged.push({
              id: `ACT-${task.taskId}-CRT`,
              action: "TASK_CREATED",
              ...meta,
              taskId: task.taskId,
              taskTitle: task.title,
              projectName: task.projectName,
              sprintName: task.sprintName,
              performedBy: actor,
              initials: getInitials(actor),
              previousState: "None",
              newState: task.status,
              details: `Created in ${task.projectName}`,
              timestamp: fmt(task.createdAt),
              ts: new Date(task.createdAt).getTime(),
            });
          }
        });

        if (aRes.status === "fulfilled") {
          const raw: any = aRes.value;
          const list = Array.isArray(raw) ? raw : raw?.items || raw?.data || [];
          list
            .filter((item: any) =>
              String(item.resourceType || item.entityType || "").toLowerCase().includes("task")
            )
            .forEach((item: any, idx: number) => {
              const ts = item.createdAt ? new Date(item.createdAt).getTime() : 0;
              const taskCode = String(item.metadata?.field || item.entityName || item.resourceId || "Task");
              const dup = merged.some(
                (m) => m.taskId === taskCode && m.action === item.action && Math.abs(m.ts - ts) < 3000
              );
              if (!dup) {
                const meta = classifyEvent(item.action);
                const actor = item.performedByName || item.userName || "User";
                merged.push({
                  id: item._id || item.id || `AUD-${idx + 1}`,
                  action: item.action || "STATUS_TRANSITION",
                  ...meta,
                  taskId: taskCode,
                  taskTitle: item.entityName || "Task Record",
                  projectName: "Workspace",
                  sprintName: "—",
                  performedBy: actor,
                  initials: getInitials(actor),
                  previousState: item.previousState || "—",
                  newState: item.metadata?.status || "Updated",
                  details: item.actionDescription || `${meta.label} (${item.metadata?.status || taskCode})`,
                  timestamp: item.createdAt ? fmt(item.createdAt) : "Recent",
                  ts,
                });
              }
            });
        }

        merged.sort((a, b) => b.ts - a.ts);
        setEvents(merged);
      })
      .finally(() => setLoading(false));
  }, []);

  // KPIs computed live
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = now - 7 * 86400000;

  const todayCount = events.filter((e) => e.ts >= startOfToday.getTime()).length;
  const weekCount = events.filter((e) => e.ts >= weekAgo).length;
  const commentsCount = tasks.reduce((sum, t) => sum + t.comments.length, 0);
  const attachmentsCount = tasks.reduce((sum, t) => sum + t.attachments.length, 0);
  const statusChangesCount = events.filter((e) => e.tone === "status").length;
  const totalLoggedHours = tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);

  const uniqueUsers = useMemo(
    () => Array.from(new Set(events.map((e) => e.performedBy).filter(Boolean))),
    [events]
  );

  const filteredEvents = useMemo(() => {
    const term = search.toLowerCase().trim();
    return events.filter((ev) => {
      if (taskFilter !== "ALL" && ev.taskId !== taskFilter) return false;
      if (typeFilter !== "ALL" && ev.typeLabel !== typeFilter) return false;
      if (userFilter !== "ALL" && ev.performedBy !== userFilter) return false;
      if (!term) return true;
      return (
        ev.taskId.toLowerCase().includes(term) ||
        ev.taskTitle.toLowerCase().includes(term) ||
        ev.performedBy.toLowerCase().includes(term) ||
        ev.details.toLowerCase().includes(term)
      );
    });
  }, [events, taskFilter, typeFilter, userFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleEvents = filteredEvents.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Analytics Breakdown & Top Contributors (for Summary view matching TSK-008 Panels 2 & 4)
  const breakdown = useMemo(() => {
    const counts = {
      status: events.filter((e) => e.tone === "status").length,
      create: events.filter((e) => e.tone === "create").length,
      time: events.filter((e) => e.tone === "time").length,
      assign: events.filter((e) => e.tone === "assign").length,
      other: events.filter((e) => e.tone === "comment" || e.tone === "attach").length,
    };
    const total = Math.max(1, events.length);
    return { counts, total };
  }, [events]);

  const contributors = useMemo(() => {
    const map = new Map<string, number>();
    events.forEach((e) => map.set(e.performedBy, (map.get(e.performedBy) || 0) + 1));
    const total = Math.max(1, events.length);
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [events]);

  const exportCsv = () => {
    const headers = ["Activity ID", "Activity", "Task", "Type", "By", "Details", "Date & Time"];
    const lines = [
      headers,
      ...filteredEvents.map((e) => [
        e.id, e.label, `${e.taskId} - ${e.taskTitle}`, e.typeLabel, e.performedBy, e.details, e.timestamp,
      ]),
    ].map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","));
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "task-activity-log.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="ta-page">
      <div className="ta-breadcrumb">
        <span onClick={() => router.push("/projects")}>Projects</span>
        <ChevronRight size={12} />
        <span onClick={() => router.push("/tasks")}>Tasks / Kanban</span>
        <ChevronRight size={12} />
        <b>Task Activity</b>
      </div>

      <header className="ta-header">
        <h1>Task Activity</h1>
        <div className="ta-header-actions">
          <button className="ta-btn" onClick={exportCsv}>
            <Download size={13} /> Export CSV
          </button>
          <button className="ta-btn ta-btn-primary" onClick={() => router.push("/tasks/kanban")}>
            Kanban Board
          </button>
        </div>
      </header>

      {/* 7-KPI Strip (Exact TSK-008 Panel 1) */}
      <section className="ta-kpi-strip">
        <div className="ta-kpi">
          <span>Total Activities</span>
          <strong>{events.length}</strong>
          <small>All time</small>
        </div>
        <div className="ta-kpi">
          <span>Today</span>
          <strong>{todayCount}</strong>
        </div>
        <div className="ta-kpi">
          <span>This Week</span>
          <strong>{weekCount}</strong>
        </div>
        <div className="ta-kpi">
          <span>Comments</span>
          <strong>{commentsCount}</strong>
        </div>
        <div className="ta-kpi">
          <span>Attachments</span>
          <strong>{attachmentsCount}</strong>
        </div>
        <div className="ta-kpi">
          <span>Status Changes</span>
          <strong>{statusChangesCount}</strong>
        </div>
        <div className="ta-kpi">
          <span>Time Logs</span>
          <strong>{totalLoggedHours}h</strong>
        </div>
      </section>

      <nav className="ta-tabs">
        <button className={view === "feed" ? "active" : ""} onClick={() => setView("feed")}>
          Activity Feed
        </button>
        <button className={view === "summary" ? "active" : ""} onClick={() => setView("summary")}>
          Summary by Task &amp; Breakdown
        </button>
      </nav>

      {/* VIEW 1: ACTIVITY FEED TABLE (Exact TSK-008 Panel 1) */}
      {view === "feed" && (
        <section className="ta-card">
          <div className="ta-filterbar">
            <label className="ta-search">
              <Search size={13} />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by task title, ID, user..."
              />
            </label>
            <select value={taskFilter} onChange={(e) => { setTaskFilter(e.target.value); setPage(1); }}>
              <option value="ALL">Task (All)</option>
              {tasks.map((t) => (
                <option key={t._id} value={t.taskId}>{t.taskId} — {t.title}</option>
              ))}
            </select>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
              <option value="ALL">Activity Type (All)</option>
              <option value="Status Change">Status Change</option>
              <option value="Task Created">Task Created</option>
              <option value="Time Log">Time Log</option>
              <option value="Reassignment">Reassignment</option>
              <option value="Comment">Comment</option>
              <option value="Attachment">Attachment</option>
            </select>
            <select value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}>
              <option value="ALL">User (All)</option>
              {uniqueUsers.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <button
              className="ta-btn"
              style={{ height: "30px" }}
              onClick={() => { setSearch(""); setTaskFilter("ALL"); setTypeFilter("ALL"); setUserFilter("ALL"); }}
            >
              Reset
            </button>
          </div>

          <div className="ta-table-wrap">
            <table className="ta-table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Task</th>
                  <th>Activity Type</th>
                  <th>By</th>
                  <th>Details</th>
                  <th>Date &amp; Time</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: "28px", color: "#64748b" }}>Loading activity log...</td></tr>
                ) : visibleEvents.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: "28px", color: "#64748b" }}>No task activity found yet. Create or move a task to log live events.</td></tr>
                ) : (
                  visibleEvents.map((ev) => (
                    <tr key={ev.id} onClick={() => setSelectedEvent(ev)}>
                      <td>
                        <span className="ta-act-cell">
                          <span className={`ta-act-icon ${ev.tone}`}><EventIcon tone={ev.tone} /></span>
                          {ev.label}
                        </span>
                      </td>
                      <td>
                        <span className="ta-task-link">{ev.taskId}</span> — {ev.taskTitle}
                      </td>
                      <td>
                        <span className={`ta-type-pill ${ev.tone}`}>{ev.typeLabel}</span>
                      </td>
                      <td>
                        <span className="ta-person">
                          <span className="ta-avatar">{ev.initials}</span>
                          {ev.performedBy}
                        </span>
                      </td>
                      <td style={{ color: "#475569", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ev.details}
                      </td>
                      <td style={{ color: "#64748b", whiteSpace: "nowrap" }}>{ev.timestamp}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="ta-pagination">
            <span>
              Showing {filteredEvents.length ? (safePage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(safePage * pageSize, filteredEvents.length)} of {filteredEvents.length} activities
            </span>
            <div className="ta-page-btns">
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
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </section>
      )}

      {/* VIEW 2: SUMMARY BY TASK + BREAKDOWN + CONTRIBUTORS (Exact TSK-008 Panels 2 & 4) */}
      {view === "summary" && (
        <div className="ta-analytics-grid">
          <div className="ta-card">
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #eef2f8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 700 }}>Activity Summary by Task</h3>
              <button className="ta-btn" style={{ height: "26px", fontSize: "10.5px" }} onClick={() => router.push("/tasks")}>
                View All Tasks
              </button>
            </div>
            <div className="ta-table-wrap">
              <table className="ta-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Total Activities</th>
                    <th>Comments</th>
                    <th>Attachments</th>
                    <th>Time Logged</th>
                    <th>Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>No tasks found.</td></tr>
                  ) : (
                    tasks.map((t) => {
                      const taskEvCount = events.filter((e) => e.taskId === t.taskId).length;
                      return (
                        <tr key={t._id} onClick={() => { setTaskFilter(t.taskId); setView("feed"); }}>
                          <td><span className="ta-task-link">{t.taskId}</span> — {t.title}</td>
                          <td><b>{taskEvCount}</b></td>
                          <td>{t.comments.length}</td>
                          <td>{t.attachments.length}</td>
                          <td>{t.actualHours}h</td>
                          <td style={{ color: "#64748b" }}>
                            {t.updatedAt
                              ? new Date(t.updatedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                              : "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="ta-panel">
              <h3>Activity Breakdown</h3>
              <div className="ta-donut-row">
                {(() => {
                  const p1 = (breakdown.counts.status / breakdown.total) * 100;
                  const p2 = p1 + (breakdown.counts.create / breakdown.total) * 100;
                  const p3 = p2 + (breakdown.counts.time / breakdown.total) * 100;
                  const bg = `conic-gradient(#7c3aed 0 ${p1}%, #2563eb ${p1}% ${p2}%, #ea580c ${p2}% ${p3}%, #10b981 ${p3}% 100%)`;
                  return (
                    <div className="ta-donut" style={{ background: bg }}>
                      <div className="ta-donut-inner">
                        <strong>{events.length}</strong>
                        <small>Total</small>
                      </div>
                    </div>
                  );
                })()}
                <div className="ta-legend">
                  <div><span>● Status Changes</span><b>{breakdown.counts.status}</b></div>
                  <div><span>● Task Creations</span><b>{breakdown.counts.create}</b></div>
                  <div><span>● Time Logs</span><b>{breakdown.counts.time}</b></div>
                  <div><span>● Reassignments</span><b>{breakdown.counts.assign}</b></div>
                  <div><span>● Comments &amp; Files</span><b>{breakdown.counts.other}</b></div>
                </div>
              </div>
            </div>

            <div className="ta-panel">
              <h3>Top Contributors</h3>
              {contributors.length === 0 ? (
                <p style={{ margin: 0, color: "#64748b", fontSize: "11.5px" }}>No contributor activity yet.</p>
              ) : (
                contributors.map((c) => (
                  <div className="ta-contrib-row" key={c.name}>
                    <div className="ta-contrib-head">
                      <span className="ta-person">
                        <span className="ta-avatar">{getInitials(c.name)}</span>
                        <b>{c.name}</b>
                      </span>
                      <span>{c.count} ({c.pct}%)</span>
                    </div>
                    <div className="ta-contrib-bar">
                      <span style={{ width: `${c.pct}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Slide-Over Activity Detail Drawer (Exact TSK-008 Panel 5) */}
      {selectedEvent && (
        <div className="ta-drawer-backdrop" onClick={() => setSelectedEvent(null)}>
          <aside className="ta-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="ta-drawer-head">
              <h2>Activity Detail</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{ border: 0, background: "transparent", cursor: "pointer", color: "#64748b" }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="ta-drawer-body">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className={`ta-type-pill ${selectedEvent.tone}`}>{selectedEvent.typeLabel}</span>
                <small style={{ color: "#64748b", fontSize: "11px" }}>{selectedEvent.timestamp}</small>
              </div>

              <div className="ta-drawer-meta">
                <div><span>Task</span><b className="ta-task-link">{selectedEvent.taskId} — {selectedEvent.taskTitle}</b></div>
                <div>
                  <span>By</span>
                  <b className="ta-person">
                    <span className="ta-avatar">{selectedEvent.initials}</span>
                    {selectedEvent.performedBy}
                  </b>
                </div>
                <div><span>Sprint</span><b>{selectedEvent.sprintName}</b></div>
                <div><span>Project</span><b>{selectedEvent.projectName}</b></div>
                <div>
                  <span>Transition</span>
                  <b style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    {selectedEvent.previousState} <ArrowRight size={11} /> {selectedEvent.newState}
                  </b>
                </div>
              </div>

              <div>
                <strong style={{ display: "block", fontSize: "11.5px", marginBottom: "6px" }}>Details</strong>
                <div className="ta-detail-box">{selectedEvent.details}</div>
              </div>

              <div className="ta-drawer-meta" style={{ borderTop: "1px solid #eef2f8", paddingTop: "12px" }}>
                <div><span>Activity ID</span><b style={{ fontFamily: "monospace" }}>{selectedEvent.id}</b></div>
                <div><span>Event Action</span><b style={{ fontFamily: "monospace" }}>{selectedEvent.action}</b></div>
              </div>
            </div>
            <div className="ta-drawer-foot">
              <button className="ta-btn" onClick={() => setSelectedEvent(null)}>Close</button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
