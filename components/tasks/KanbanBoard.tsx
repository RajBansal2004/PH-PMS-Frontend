"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, ChevronDown, ChevronRight,
  Filter, Settings, MoreVertical, CalendarDays, Clock3,
  MessageSquare, Paperclip, Flag, CircleAlert, CheckCircle2,
  SlidersHorizontal, LayoutGrid, List,
  X, Check, Activity, Timer,
  Target, CalendarClock,
} from "lucide-react";
import { getOrganizationAudit, projects as getProjectsApi } from "../../lib/api";
import { sprintApi, type Sprint } from "../../lib/sprints/api";
import {
  taskApi,
  getInitials,
  toBackendStatus,
  type NormalizedTask,
  type UiTaskPriority,
  type UiTaskStatus,
} from "../../lib/tasks/api";
import "./kanban-board.css";

const columns: UiTaskStatus[] = [
  "To Do", "In Progress", "In Review", "Testing", "Done",
];

function Avatar({ initials }: { initials: string }) {
  return <span className="kb-avatar">{initials}</span>;
}

function PriorityText({ priority }: { priority: UiTaskPriority }) {
  return <span className={`kb-priority ${priority.toLowerCase()}`}>{priority}</span>;
}

function Donut({
  percentage,
  color = "#0862f7",
  label,
}: {
  percentage: number;
  color?: string;
  label: string;
}) {
  const safe = Math.max(0, Math.min(100, percentage));
  return (
    <div
      className="kb-donut"
      style={{
        background: `conic-gradient(${color} ${safe * 3.6}deg, #e9edf5 0deg)`,
      }}
    >
      <div className="kb-donut-inner">
        <strong>{safe}%</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}

function MiniBurndown({
  totalPoints,
  completedPoints,
  startDate,
  endDate,
}: {
  totalPoints: number;
  completedPoints: number;
  startDate?: string;
  endDate?: string;
}) {
  const maxVal = Math.max(10, totalPoints);
  const steps = 5;
  const x = (i: number) => 28 + (i / (steps - 1)) * 218;
  const y = (v: number) => 126 - (Math.max(0, v) / maxVal) * 104;

  const ideal = Array.from({ length: steps }, (_, i) =>
    totalPoints - (i * totalPoints) / (steps - 1)
  );
  const actual = Array.from({ length: steps }, (_, i) =>
    Math.round(totalPoints - (i / (steps - 1)) * completedPoints)
  );

  const pts = (arr: number[]) => arr.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const ticks = [0, Math.round(maxVal / 2), maxVal];

  const labels = (() => {
    if (!startDate || !endDate) return ["Start", "", "Mid", "", "End"];
    const s = new Date(`${startDate}T00:00:00`).getTime();
    const e = new Date(`${endDate}T00:00:00`).getTime();
    if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return ["Start", "", "Mid", "", "End"];
    return Array.from({ length: steps }, (_, i) => {
      const d = new Date(s + ((e - s) * i) / (steps - 1));
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    });
  })();

  return (
    <svg viewBox="0 0 260 145" className="kb-burndown-svg" role="img" aria-label="Sprint burndown chart">
      <g stroke="#edf0f5" strokeWidth="1">
        {ticks.map((t) => (
          <line key={t} x1="28" y1={y(t)} x2="250" y2={y(t)} />
        ))}
      </g>
      <g fill="#64748b" fontSize="8.5">
        {ticks.map((t) => (
          <text key={t} x="2" y={y(t) + 3}>{t}</text>
        ))}
        {labels.map((lbl, idx) =>
          lbl ? (
            <text key={`${lbl}-${idx}`} x={x(idx)} y="142" textAnchor="middle">
              {lbl}
            </text>
          ) : null
        )}
      </g>
      <polyline points={pts(ideal)} fill="none" stroke="#0870ff" strokeWidth="1.6" strokeDasharray="4 3" />
      <polyline points={pts(actual)} fill="none" stroke="#079b5c" strokeWidth="2" />
      {actual.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="2.4" fill="#079b5c" />
      ))}
    </svg>
  );
}

export default function KanbanBoard() {
  const router = useRouter();

  const [tasks, setTasks] = useState<NormalizedTask[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [people, setPeople] = useState<string[]>([]);
  const [auditEvents, setAuditEvents] = useState<{ initials: string; name: string; text: string; time: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [projectFilter, setProjectFilter] = useState("All");
  const [sprintFilter, setSprintFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showAssignee, setShowAssignee] = useState(true);
  const [showDueDate, setShowDueDate] = useState(true);
  const [showStoryPoints, setShowStoryPoints] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [selectedTask, setSelectedTask] = useState<NormalizedTask | null>(null);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const loadBoard = async () => {
    try {
      setLoading(true);
      const [tRes, pRes, sRes, peopleRes, aRes] = await Promise.allSettled([
        taskApi.list({ limit: 100 }),
        getProjectsApi({ limit: 100 }).catch(() => []),
        sprintApi.list({ limit: 100 }).catch(() => ({ items: [], total: 0 })),
        taskApi.getPersonnel(),
        getOrganizationAudit({ limit: 15 }).catch(() => ({ items: [] })),
      ]);

      let loadedTasks: NormalizedTask[] = [];
      if (tRes.status === "fulfilled") {
        loadedTasks = tRes.value.items || [];
        setTasks(loadedTasks);
      }

      if (pRes.status === "fulfilled") {
        const raw: any = pRes.value;
        setProjects(Array.isArray(raw) ? raw : raw?.data || raw?.items || []);
      }

      if (sRes.status === "fulfilled") {
        setSprints(sRes.value.items || []);
      }

      if (peopleRes.status === "fulfilled") {
        setPeople((peopleRes.value || []).map((p) => p.name));
      }

      // Build real recent activity from task activityLogs + org audit logs
      const taskActivities: { initials: string; name: string; text: string; time: string; ts: number }[] = [];
      loadedTasks.forEach((t) => {
        (t.activityLog || []).forEach((ev: any) => {
          const actor = ev.performedBy || t.assignee || "Team Member";
          taskActivities.push({
            initials: getInitials(actor),
            name: actor,
            text: ev.details || `${ev.action} on ${t.taskId}`,
            time: ev.timestamp ? new Date(ev.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Recent",
            ts: ev.timestamp ? new Date(ev.timestamp).getTime() : 0,
          });
        });
      });

      if (aRes.status === "fulfilled") {
        const rawA: any = aRes.value;
        const aList = Array.isArray(rawA) ? rawA : rawA?.items || rawA?.data || [];
        aList
          .filter((item: any) => String(item.resourceType || item.entityType || "").toLowerCase().includes("task"))
          .forEach((item: any) => {
            const actor = item.performedByName || item.userName || "User";
            taskActivities.push({
              initials: getInitials(actor),
              name: actor,
              text: `${item.action || "updated"} ${item.metadata?.field || item.entityName || "Task"}`,
              time: item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Recent",
              ts: item.createdAt ? new Date(item.createdAt).getTime() : 0,
            });
          });
      }

      taskActivities.sort((a, b) => b.ts - a.ts);
      setAuditEvents(taskActivities.slice(0, 6));
    } catch (err: any) {
      notify(`Failed to load kanban board: ${err?.message || "Server error"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoard();
  }, []);

  const filteredTasks = useMemo(() => {
    const query = search.toLowerCase().trim();
    return tasks.filter((task) => {
      const matchesProject = projectFilter === "All" || task.projectId === projectFilter;
      const matchesSprint = sprintFilter === "All" || task.sprintId === sprintFilter;
      const matchesSearch =
        !query ||
        task.taskId.toLowerCase().includes(query) ||
        task.title.toLowerCase().includes(query) ||
        task.assignee.toLowerCase().includes(query);
      const matchesPriority = priorityFilter === "All" || task.priority === priorityFilter;
      const matchesAssignee = assigneeFilter === "All" || task.assignee === assigneeFilter;
      return matchesProject && matchesSprint && matchesSearch && matchesPriority && matchesAssignee;
    });
  }, [tasks, projectFilter, sprintFilter, search, priorityFilter, assigneeFilter]);

  const activeSprint = useMemo(() => {
    if (sprintFilter !== "All") {
      return sprints.find((s) => (s._id || s.id) === sprintFilter) || null;
    }
    return sprints.find((s) => s.rawStatus === "ACTIVE") || sprints[0] || null;
  }, [sprints, sprintFilter]);

  const daysRemaining = useMemo(() => {
    if (!activeSprint?.endDate) return null;
    const end = new Date(`${activeSprint.endDate}T23:59:59`).getTime();
    const diff = Math.ceil((end - Date.now()) / 86400000);
    return diff;
  }, [activeSprint]);

  const statusCount = (status: UiTaskStatus) =>
    filteredTasks.filter((task) => task.status === status).length;

  const total = filteredTasks.length;
  const completed = statusCount("Done");
  const inProgress = statusCount("In Progress");
  const remaining = Math.max(0, total - completed);
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const totalPoints = useMemo(
    () => filteredTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0),
    [filteredTasks]
  );
  const completedPoints = useMemo(
    () => filteredTasks.filter((t) => t.status === "Done").reduce((sum, t) => sum + (t.storyPoints || 0), 0),
    [filteredTasks]
  );

  const blockedTasks = useMemo(
    () => filteredTasks.filter((t) => t.rawStatus === "BLOCKED" || t.blockedBy.length > 0),
    [filteredTasks]
  );

  const pctLabel = (n: number) => (total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "0%");

  async function moveTask(taskMongoId: string, nextStatus: UiTaskStatus) {
    const target = tasks.find((t) => t._id === taskMongoId);
    if (!target || target.status === nextStatus) {
      setDraggedId(null);
      return;
    }

    const backendStatus = toBackendStatus(nextStatus);
    setTasks((old) =>
      old.map((t) =>
        t._id === taskMongoId
          ? { ...t, status: nextStatus, rawStatus: backendStatus, progress: nextStatus === "Done" ? 100 : t.progress }
          : t
      )
    );
    if (selectedTask?._id === taskMongoId) {
      setSelectedTask((prev) => (prev ? { ...prev, status: nextStatus, rawStatus: backendStatus } : null));
    }
    setDraggedId(null);

    try {
      const updated = await taskApi.updateStatus(taskMongoId, backendStatus);
      setTasks((old) => old.map((t) => (t._id === taskMongoId ? updated : t)));
      notify(`${target.taskId} moved to ${nextStatus}`);
    } catch (err: any) {
      notify(`Failed to save status: ${err?.message || "API error"}`);
      loadBoard();
    }
  }

  async function logHourOnSelected() {
    if (!selectedTask) return;
    const nextHours = (selectedTask.actualHours || 0) + 1;
    try {
      const updated = await taskApi.update(selectedTask._id, { actualHours: nextHours });
      setTasks((prev) => prev.map((t) => (t._id === selectedTask._id ? updated : t)));
      setSelectedTask(updated);
      notify(`Logged +1h on ${selectedTask.taskId} (Total: ${nextHours}h)`);
    } catch (err: any) {
      notify(`Could not log time: ${err?.message || "API error"}`);
    }
  }

  function clearFilters() {
    setProjectFilter("All");
    setSprintFilter("All");
    setSearch("");
    setPriorityFilter("All");
    setAssigneeFilter("All");
    setShowFilters(false);
  }

  function addTask(status: UiTaskStatus) {
    router.push(`/tasks/new?status=${encodeURIComponent(status)}`);
  }

  function renderTask(task: NormalizedTask) {
    const labelColor =
      task.type === "Design"
        ? "purple"
        : task.type === "QA" || task.type === "Bug"
        ? "green"
        : "teal";

    return (
      <article
        key={task._id}
        className={`kb-task-card ${draggedId === task._id ? "dragging" : ""}`}
        draggable
        onDragStart={() => setDraggedId(task._id)}
        onDragEnd={() => setDraggedId(null)}
        onClick={() => setSelectedTask(task)}
      >
        <div className="kb-card-top">
          <span className="kb-task-id">{task.taskId}</span>
          <span className={`kb-label ${labelColor}`}>{task.type}</span>
        </div>

        <h4>{task.title}</h4>

        {showAssignee && (
          <div className="kb-assignee">
            <Avatar initials={task.initials} />
            <span>{task.assignee}</span>
            {task.actualHours > 0 && (
              <span className="kb-time-chip"><Clock3 size={11} /> {task.actualHours}h</span>
            )}
          </div>
        )}

        <div className="kb-card-meta">
          {showDueDate ? (
            <span className={task.status === "Done" ? "date-green" : task.isOverdue ? "date-red" : ""}>
              {task.dueDateLabel}
            </span>
          ) : (
            <span />
          )}
          <div>
            <span>{task.estimatedHours}h</span>
            {showStoryPoints && <span>SP&nbsp;{task.storyPoints}</span>}
          </div>
        </div>

        {task.progress > 0 && (
          <div className="kb-task-progress">
            <div><span style={{ width: `${task.progress}%` }} /></div>
            <small>{task.progress}%</small>
          </div>
        )}

        <div className="kb-card-footer">
          <div>
            <span><MessageSquare size={12} /> {task.comments.length}</span>
            <span><Paperclip size={12} /> {task.attachments.length}</span>
          </div>
          {task.status === "Done" ? (
            <b className="kb-done-text">Done</b>
          ) : (
            <PriorityText priority={task.priority} />
          )}
        </div>
      </article>
    );
  }

  return (
    <main className="kb-page">
      {/* Breadcrumb and toolbar */}
      <div className="kb-breadcrumb">
        <div className="kb-crumbs">
          <span>Tasks / Kanban</span><ChevronRight size={13} />
          <span>{activeSprint ? activeSprint.projectName : "All Projects"}</span><ChevronRight size={13} />
          <b>Kanban Board</b>
        </div>

        <div className="kb-toolbar">
          <select
            aria-label="Filter by Project"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            style={{ height: "32px", padding: "0 8px", border: "1px solid #d5dfef", borderRadius: "6px", fontSize: "12px", background: "#fff" }}
          >
            <option value="All">All Projects</option>
            {projects.map((p) => (
              <option key={p._id || p.id} value={p._id || p.id}>
                {p.projectName || p.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Sprint"
            value={sprintFilter}
            onChange={(e) => setSprintFilter(e.target.value)}
            style={{ height: "32px", padding: "0 8px", border: "1px solid #d5dfef", borderRadius: "6px", fontSize: "12px", background: "#fff" }}
          >
            <option value="All">All Sprints</option>
            {sprints.map((s) => (
              <option key={s._id || s.id} value={s._id || s.id}>
                {s.sprintCode} — {s.name}
              </option>
            ))}
          </select>

          <div className="kb-control-wrap">
            <button className={showFilters ? "selected" : ""} onClick={() => setShowFilters(!showFilters)}>
              <Filter size={14} /> Filters
            </button>
            {showFilters && (
              <div className="kb-dropdown kb-filter-dropdown">
                <label>Search
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Task ID or title..."
                    style={{ padding: "5px 8px", border: "1px solid #d5dfef", borderRadius: "4px", fontSize: "12px" }}
                  />
                </label>
                <label>Priority
                  <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                    <option>All</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
                  </select>
                </label>
                <label>Assignee
                  <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
                    <option>All</option>
                    {people.map((person) => <option key={person}>{person}</option>)}
                  </select>
                </label>
                <button className="kb-clear-button" onClick={clearFilters}>Clear filters</button>
              </div>
            )}
          </div>

          <div className="kb-control-wrap">
            <button onClick={() => setShowCustomize(!showCustomize)}>
              <Settings size={14} /> Customize
            </button>
            {showCustomize && (
              <div className="kb-dropdown">
                <b>Card Display</b>
                <label><input type="checkbox" checked={showAssignee} onChange={(e) => setShowAssignee(e.target.checked)} /> Show assignee</label>
                <label><input type="checkbox" checked={showDueDate} onChange={(e) => setShowDueDate(e.target.checked)} /> Show due date</label>
                <label><input type="checkbox" checked={showStoryPoints} onChange={(e) => setShowStoryPoints(e.target.checked)} /> Show story points</label>
              </div>
            )}
          </div>

          <div className="kb-control-wrap">
            <button onClick={() => setShowView(!showView)}>
              View: Board <ChevronDown size={13} />
            </button>
            {showView && (
              <div className="kb-dropdown">
                <button onClick={() => setShowView(false)}><LayoutGrid size={14} /> Board view</button>
                <button onClick={() => router.push("/tasks")}><List size={14} /> List view</button>
              </div>
            )}
          </div>

          <button className="kb-create-button" onClick={() => router.push("/tasks/new")}>
            <Plus size={15} /> Create Task
          </button>

          <div className="kb-control-wrap">
            <button className="kb-more-button" onClick={() => setShowMenu(!showMenu)}>
              <MoreVertical size={17} />
            </button>
            {showMenu && (
              <div className="kb-dropdown kb-more-dropdown">
                <button onClick={() => { router.push("/tasks/backlog"); setShowMenu(false); }}>Backlog Manager</button>
                <button onClick={() => { router.push("/tasks/dependency-graph"); setShowMenu(false); }}>Dependency Graph</button>
                <button onClick={() => { navigator.clipboard?.writeText(window.location.href); notify("Board link copied"); setShowMenu(false); }}>Copy board link</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Summary Strip */}
      <section className="kb-summary">
        <div className="kb-sprint-info">
          <div className="kb-sprint-heading">
            <b>{activeSprint ? activeSprint.sprintCode : "All Sprints"}</b>
            <span>{activeSprint ? activeSprint.status : "Live"}</span>
          </div>
          <strong>{activeSprint ? `${activeSprint.start} – ${activeSprint.end}` : "Live Workspace"}</strong>
          <small>
            {daysRemaining !== null
              ? daysRemaining >= 0
                ? `${daysRemaining} Days Remaining`
                : `${Math.abs(daysRemaining)} Days Overdue`
              : `${sprints.length} Sprints in DB`}
          </small>
        </div>

        <div className="kb-total">
          <span>Total Tasks</span>
          <strong>{total}</strong>
          <small>{loading ? "Loading..." : "Filtered View"}</small>
        </div>

        {[
          { status: "To Do" as UiTaskStatus, color: "blue", icon: <List size={19} /> },
          { status: "In Progress" as UiTaskStatus, color: "orange", icon: <Activity size={19} /> },
          { status: "In Review" as UiTaskStatus, color: "purple", icon: <CheckCircle2 size={19} /> },
          { status: "Testing" as UiTaskStatus, color: "teal", icon: <CalendarDays size={19} /> },
          { status: "Done" as UiTaskStatus, color: "green", icon: <CheckCircle2 size={19} /> },
        ].map((item) => {
          const val = statusCount(item.status);
          return (
            <div className="kb-summary-stat" key={item.status}>
              <div className={`kb-summary-icon ${item.color}`}>{item.icon}</div>
              <div>
                <span>{item.status}</span>
                <strong>{val}</strong>
                <small className={item.color}>{pctLabel(val)}</small>
              </div>
            </div>
          );
        })}
      </section>

      {/* Main board */}
      <div className="kb-main-layout">
        <section className="kb-board-area">
          <div className="kb-board-columns">
            {columns.map((status) => {
              const columnTasks = filteredTasks.filter((task) => task.status === status);

              return (
                <div
                  className={`kb-column ${status.toLowerCase().replaceAll(" ", "-")}`}
                  key={status}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => draggedId && moveTask(draggedId, status)}
                >
                  <div className="kb-column-header">
                    <div>
                      <span className="kb-column-title">{status}</span>
                      <span className="kb-column-count">{columnTasks.length}</span>
                    </div>
                    <div>
                      <button title={`Add task to ${status}`} onClick={() => addTask(status)}><Plus size={16} /></button>
                    </div>
                  </div>

                  <div className="kb-column-cards">
                    {columnTasks.map(renderTask)}
                    {columnTasks.length === 0 && (
                      <div className="kb-empty-column">
                        {loading ? "Loading..." : "Drop a task here"}
                      </div>
                    )}
                  </div>

                  <button className="kb-add-task" onClick={() => addTask(status)}>
                    <Plus size={13} /> Add Task
                  </button>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="kb-legend">
            <span><Flag className="high-icon" size={14} /> High / Critical</span>
            <span><Flag className="medium-icon" size={14} /> Medium</span>
            <span><Flag className="low-icon" size={14} /> Low</span>
            <span><CircleAlert className="blocked-icon" size={14} /> Blocked</span>
            <span><CalendarClock className="overdue-icon" size={14} /> Overdue</span>
            <span><MessageSquare size={14} /> Comments</span>
            <span><Paperclip size={14} /> Attachments</span>
            <span><Timer size={14} /> Tracked Time</span>
          </div>
        </section>

        {/* Right live sidebar */}
        <aside className="kb-right-sidebar">
          <section className="kb-side-card kb-progress-card">
            <h3>Sprint Progress</h3>
            <div className="kb-progress-content">
              <Donut percentage={completionPct} label="Complete" />
              <div className="kb-progress-labels">
                <p><span className="dot blue-dot" />Completed <b>{completed}</b></p>
                <p><span className="dot green-dot" />In Progress <b>{inProgress}</b></p>
                <p><span className="dot gray-dot" />Remaining <b>{remaining}</b></p>
              </div>
            </div>
          </section>

          <section className="kb-side-card kb-velocity">
            <h3>Velocity</h3>
            <div className="kb-velocity-number">
              <strong>{completedPoints}</strong>
              <span>Target: {totalPoints || activeSprint?.capacity || 40} SP <Target size={12} /></span>
            </div>
            <div className="kb-velocity-bottom">
              <small>{totalPoints > 0 ? `${Math.round((completedPoints / totalPoints) * 100)}%` : "0%"} Delivered</small>
              <div>
                <span style={{ width: `${totalPoints > 0 ? Math.min(100, Math.round((completedPoints / totalPoints) * 100)) : 0}%` }} />
              </div>
            </div>
          </section>

          <section className="kb-side-card kb-chart-card">
            <div className="kb-side-title">
              <h3>Burndown Chart</h3>
              <div><span className="chart-blue" /> Ideal <span className="chart-green" /> Actual</div>
            </div>
            <MiniBurndown
              totalPoints={totalPoints}
              completedPoints={completedPoints}
              startDate={activeSprint?.startDate}
              endDate={activeSprint?.endDate}
            />
            {activeSprint && (
              <button onClick={() => router.push(`/sprints/${encodeURIComponent(activeSprint._id || activeSprint.id)}/active`)}>
                Open Active Sprint
              </button>
            )}
          </section>

          <section className="kb-side-card kb-blocked-card">
            <div className="kb-side-title">
              <h3>Blocked Tasks <span>{blockedTasks.length}</span></h3>
              <button onClick={() => router.push("/tasks/dependency-graph")}>Graph</button>
            </div>
            {blockedTasks.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#64748b", margin: "8px 0" }}>
                No blocked tasks right now.
              </p>
            ) : (
              blockedTasks.slice(0, 4).map((item) => (
                <div className="kb-blocked-item" key={item._id} onClick={() => setSelectedTask(item)} style={{ cursor: "pointer" }}>
                  <Flag size={14} className={item.priority === "High" || item.priority === "Critical" ? "high-icon" : "medium-icon"} />
                  <div><b>{item.taskId}</b><p>{item.title}</p></div>
                  <PriorityText priority={item.priority} />
                </div>
              ))
            )}
          </section>

          <section className="kb-side-card kb-activity-card">
            <div className="kb-side-title">
              <h3>Recent Activity</h3>
              <button onClick={() => router.push("/tasks/audit")}>View all</button>
            </div>
            {auditEvents.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#64748b", margin: "8px 0" }}>
                No recent task activity recorded yet.
              </p>
            ) : (
              auditEvents.slice(0, 4).map((item, index) => (
                <div className="kb-activity-item" key={index}>
                  <Avatar initials={item.initials} />
                  <div>
                    <p><b>{item.name}</b> {item.text}</p>
                    <small>{item.time}</small>
                  </div>
                </div>
              ))
            )}
          </section>
        </aside>
      </div>

      {/* Task detail drawer */}
      {selectedTask && (
        <div className="kb-drawer-backdrop" onClick={() => setSelectedTask(null)}>
          <aside className="kb-task-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="kb-drawer-head">
              <h3>Task Details</h3>
              <button onClick={() => setSelectedTask(null)}><X size={17} /></button>
            </div>
            <span className="kb-task-id">{selectedTask.taskId}</span>
            <h2>{selectedTask.title}</h2>
            {selectedTask.description && (
              <p style={{ fontSize: "12.5px", color: "#475569", margin: "6px 0 12px", lineHeight: 1.5 }}>
                {selectedTask.description}
              </p>
            )}
            <div className="kb-drawer-row">
              <span>Status</span>
              <select
                value={selectedTask.status}
                onChange={(e) => moveTask(selectedTask._id, e.target.value as UiTaskStatus)}
                style={{ padding: "4px 8px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", fontWeight: 600 }}
              >
                {columns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="kb-drawer-row"><span>Project</span><b>{selectedTask.projectName}</b></div>
            <div className="kb-drawer-row"><span>Sprint</span><b>{selectedTask.sprintName}</b></div>
            <div className="kb-drawer-row"><span>Assignee</span><b>{selectedTask.assignee}</b></div>
            <div className="kb-drawer-row"><span>Priority</span><PriorityText priority={selectedTask.priority} /></div>
            <div className="kb-drawer-row"><span>Due Date</span><b>{selectedTask.dueDateLabel}</b></div>
            <div className="kb-drawer-row"><span>Estimated / Spent</span><b>{selectedTask.estimatedHours}h / {selectedTask.actualHours}h</b></div>
            <div className="kb-drawer-row"><span>Story Points</span><b>{selectedTask.storyPoints} SP</b></div>

            <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
              <button
                type="button"
                className="kb-drawer-edit"
                style={{ background: "#0f172a" }}
                onClick={logHourOnSelected}
              >
                +1h Log Time
              </button>
              <button
                type="button"
                className="kb-drawer-edit"
                onClick={() => router.push("/tasks")}
              >
                Open in Registry
              </button>
            </div>
          </aside>
        </div>
      )}

      {toast && (
        <div className="kb-toast">
          <Check size={15} /> {toast}
          <button onClick={() => setToast("")}><X size={13} /></button>
        </div>
      )}
    </main>
  );
}
