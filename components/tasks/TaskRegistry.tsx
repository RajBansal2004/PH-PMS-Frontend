
"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { createTask as createTaskApi, employees as getEmployeesApi, tasks as getTasksApi } from "../../lib/api";
import {
  Search, Plus, Bell, CircleHelp, ChevronDown, ChevronLeft,
  ChevronRight, Download, Upload, Filter, Settings, MoreVertical,
  X, FileText, Clock3, CheckCircle2, ListTodo, GitPullRequest,
  ClipboardList, FlaskConical, CircleAlert, CirclePlus, Pencil,
  Trash2, Eye, Paperclip, UserRound, CalendarDays, Save,
  SlidersHorizontal, Check, ArrowUpDown,
} from "lucide-react";
import "./task-registry.css";
import { useRouter } from "next/navigation";

type TaskStatus = "To Do" | "In Progress" | "In Review" | "Testing" | "Done";
type Priority = "High" | "Medium" | "Low";

type Task = {
  id: string;
  title: string;
  type: string;
  status: TaskStatus;
  priority: Priority;
  assignee: string;
  initials: string;
  parent: string;
  estimated: number;
  spent: number;
  dueDate: string;
  description: string;
  project: string;
  sprint: string;
  reporter: string;
  reporterInitials: string;
  labels: string[];
  attachments: { name: string; size: string; type: "fig" | "pdf" }[];
  activity: string;
};

const statuses: TaskStatus[] = ["To Do", "In Progress", "In Review", "Testing", "Done"];
const priorities: Priority[] = ["High", "Medium", "Low"];

function StatusBadge({ status }: { status: TaskStatus }) {
  const className: Record<TaskStatus, string> = {
    "To Do": "todo",
    "In Progress": "progress",
    "In Review": "review",
    Testing: "testing",
    Done: "done",
  };
  return <span className={`tr-status ${className[status]}`}>{status}</span>;
}

function MetricCard({
  icon, title, value, percent, tone, subtitle,
}: {
  icon: ReactNode; title: string; value: number; percent?: string;
  tone: string; subtitle?: string;
}) {
  return (
    <div className="tr-metric">
      <div className={`tr-metric-icon ${tone}`}>{icon}</div>
      <div className="tr-metric-content">
        <span>{title}</span>
        <div className="tr-metric-number">
          <strong>{value}</strong>
          {percent && <b>{percent}</b>}
        </div>
        {subtitle && <small>{subtitle}</small>}
      </div>
    </div>
  );
}

export default function TaskRegistry() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [peopleList, setPeopleList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({
    title: "", type: "Development", status: "To Do" as TaskStatus,
    priority: "Medium" as Priority, assignee: "Unassigned",
    dueDate: new Date().toISOString().slice(0, 10), estimated: "8", description: "",
  });

  const loadTasks = async () => {
    try {
      setLoading(true);
      const [tRes, eRes] = await Promise.allSettled([
        getTasksApi(),
        getEmployeesApi().catch(() => []),
      ]);

      if (tRes.status === "fulfilled") {
        const raw = tRes.value;
        const list = Array.isArray(raw) ? raw : raw?.data || raw?.items || [];
        if (Array.isArray(list)) {
          const mapped: Task[] = list.map((t: any) => {
            const assigneeName = t.assignedTo?.name || t.assignedToName || "Unassigned";
            const reporterName = t.createdBy?.name || "System";
            const init = assigneeName.split(" ").map((v: string) => v[0]).join("").slice(0, 2).toUpperCase() || "NA";
            const repInit = reporterName.split(" ").map((v: string) => v[0]).join("").slice(0, 2).toUpperCase() || "SY";
            return {
              id: t.taskCode || t.code || t._id || t.id,
              title: t.title || "Untitled Task",
              type: t.type || "Task",
              status: (t.status === "COMPLETED" ? "Done" : t.status === "IN_PROGRESS" ? "In Progress" : t.status === "BLOCKED" ? "Blocked" : t.status === "IN_REVIEW" ? "In Review" : "To Do") as TaskStatus,
              priority: (t.priority || "Medium") as Priority,
              assignee: assigneeName,
              initials: init,
              parent: t.parentTaskId?.title || t.userStoryId?.title || "Story",
              estimated: t.estimatedHours || 0,
              spent: t.loggedHours || 0,
              dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-IN") : "—",
              description: t.description || "",
              project: t.projectId?.projectName || "General Project",
              sprint: t.sprintId?.name || "Sprint",
              reporter: reporterName,
              reporterInitials: repInit,
              labels: t.tags || [],
              attachments: [],
              activity: t.updatedAt ? new Date(t.updatedAt).toLocaleDateString("en-IN") : "Recent",
            };
          });
          setTasks(mapped);
          if (mapped.length > 0) {
            setSelectedId(mapped[0].id);
          }
        } else {
          setTasks([]);
        }
      } else {
        setTasks([]);
      }

      if (eRes.status === "fulfilled" && Array.isArray(eRes.value)) {
        const names = eRes.value.map((e: any) => e.name || e.email || "Employee");
        setPeopleList(names);
        if (names.length > 0 && form.assignee === "Unassigned") {
          setForm((f) => ({ ...f, assignee: names[0] }));
        }
      }
    } catch (err) {
      console.warn("Failed to load tasks:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const selectedTask = tasks.find((task) => task.id === selectedId);

  const filteredTasks = useMemo(() => {
    const term = search.toLowerCase().trim();
    return tasks.filter((task) => {
      const matchesSearch = !term ||
        [task.id, task.title, task.assignee, task.parent].some((v) =>
          v.toLowerCase().includes(term)
        );
      return matchesSearch &&
        (statusFilter === "All" || task.status === statusFilter) &&
        (priorityFilter === "All" || task.priority === priorityFilter) &&
        (assigneeFilter === "All" || task.assignee === assigneeFilter) &&
        (typeFilter === "All" || task.type === typeFilter);
    });
  }, [tasks, search, statusFilter, priorityFilter, assigneeFilter, typeFilter]);

  const total = tasks.length;
  const count = (status: string) => tasks.filter((t) => t.status === status).length;
  const overdue = tasks.filter((t) =>
    t.status !== "Done" && new Date(t.dueDate) < new Date("2025-06-01")
  ).length;
  const pageCount = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const visibleTasks = filteredTasks.slice((page - 1) * pageSize, page * pageSize);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setAssigneeFilter("All");
    setTypeFilter("All");
    setPage(1);
  }

  function toggleSelected(id: string) {
    setSelectedIds((old) => old.includes(id) ? old.filter((x) => x !== id) : [...old, id]);
  }

  function toggleAll() {
    const ids = visibleTasks.map((task) => task.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    setSelectedIds((old) => allSelected
      ? old.filter((id) => !ids.includes(id))
      : [...new Set([...old, ...ids])]
    );
  }

 function openCreate() {
  router.push("/tasks/new");
}

  function openEdit(task: Task) {
    setForm({
      title: task.title, type: task.type, status: task.status,
      priority: task.priority, assignee: task.assignee,
      dueDate: "2025-06-10", estimated: String(task.estimated),
      description: task.description,
    });
    setModal("edit");
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) return;

    if (modal === "edit" && selectedTask) {
      setTasks((old) => old.map((task) => task.id === selectedTask.id
        ? {
            ...task, title: form.title, type: form.type,
            status: form.status, priority: form.priority,
            assignee: form.assignee,
            initials: form.assignee.split(" ").map((v) => v[0]).join("").slice(0, 2).toUpperCase(),
            estimated: Number(form.estimated) || 0,
            description: form.description,
          }
        : task
      ));
      notify("Task updated successfully");
    } else {
      try {
        await createTaskApi({
          title: form.title.trim(),
          type: form.type,
          status: form.status,
          priority: form.priority,
          estimatedHours: Number(form.estimated) || 0,
          description: form.description.trim(),
        });
        await loadTasks();
        notify("Task created successfully (synced to API)");
      } catch (err) {
        console.warn("Failed to create task via API:", err);
      }
    }
    setModal(null);
  }

  function deleteTask(task: Task) {
    if (!window.confirm(`Delete ${task.id}?`)) return;
    setTasks((old) => old.filter((t) => t.id !== task.id));
    if (selectedId === task.id) setSelectedId("");
    setMenuId(null);
    notify("Task deleted");
  }

  function exportCsv() {
    const headers = ["Task ID", "Task Title", "Type", "Status", "Priority", "Assignee", "Parent", "Estimated Hours", "Spent Hours", "Due Date"];
    const rows = filteredTasks.map((t) => [
      t.id, t.title, t.type, t.status, t.priority, t.assignee,
      t.parent, t.estimated, t.spent, t.dueDate,
    ]);
    const csv = [headers, ...rows].map((row) =>
      row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")
    ).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "task-registry.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    notify("Task registry exported");
  }

  return (
    <main className="tr-page">
      <header className="tr-header">
        <div className="tr-title-block">
          <h1>Task Registry</h1>
          <p>Centralized registry of all tasks across projects</p>
        </div>
        <div className="tr-header-actions">
          <button className="tr-icon-search" onClick={() => document.getElementById("task-search")?.focus()}>
            <Search size={14} /> Search (Ctrl + K)
          </button>
          <button className="tr-round-add" title="Create task" onClick={openCreate}><Plus size={19} /></button>
          <button className="tr-bell" title="Notifications"><Bell size={19} /><i>12</i></button>
          <button className="tr-help" title="Help"><CircleHelp size={19} /></button>
          <div className="tr-user">
            <div className="tr-avatar">MS</div>
            <div><b>Mayank</b><small>Project Manager</small></div>
            <ChevronDown size={13} />
          </div>
        </div>
      </header>

      <div className="tr-breadcrumb">
        <span>Projects</span><ChevronRight size={12} />
        <span>AI-CMS Redesign</span><ChevronRight size={12} />
        <span>Sprint 12</span><ChevronRight size={12} />
        <b>Task Registry</b>
        <div className="tr-breadcrumb-actions">
          <button onClick={exportCsv}><Download size={13} /> Export</button>
          <button onClick={() => notify("Import screen can be connected to your import workflow")}><Upload size={13} /> Import</button>
          <button className="tr-create-btn" onClick={openCreate}><Plus size={15} /> Create Task</button>
        </div>
      </div>

      <section className="tr-metrics">
        <MetricCard icon={<ClipboardList size={19} />} title="Total Tasks" value={142} tone="neutral" subtitle="All Tasks" />
        <MetricCard icon={<ListTodo size={19} />} title="To Do" value={42} percent="29.6%" tone="blue" />
        <MetricCard icon={<GitPullRequest size={19} />} title="In Progress" value={38} percent="26.8%" tone="orange" />
        <MetricCard icon={<Pencil size={19} />} title="In Review" value={18} percent="12.7%" tone="purple" />
        <MetricCard icon={<FlaskConical size={19} />} title="Testing" value={20} percent="14.1%" tone="teal" />
        <MetricCard icon={<CheckCircle2 size={19} />} title="Done" value={24} percent="16.9%" tone="green" />
        <MetricCard icon={<Clock3 size={19} />} title="Overdue" value={7} percent="4.9%" tone="red" />
      </section>

      <div className={`tr-content ${showDetails && selectedTask ? "has-details" : ""}`}>
        <section className="tr-registry">
          <div className="tr-filterbar">
            <label className="tr-search">
              <Search size={14} />
              <input id="task-search" value={search} placeholder="Search tasks by ID, title, or keyword..." onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="All">Status (All)</option>
              {statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}>
              <option value="All">Priority (All)</option>
              {priorities.map((p) => <option key={p}>{p}</option>)}
            </select>
            <select value={assigneeFilter} onChange={(e) => { setAssigneeFilter(e.target.value); setPage(1); }}>
              <option value="All">Assignee (All)</option>
              {peopleList.map((p) => <option key={p}>{p}</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
              <option value="All">Task Type (All)</option>
              {["Design", "Development", "QA", "Documentation"].map((p) => <option key={p}>{p}</option>)}
            </select>
            <button className={`tr-filter-button ${showMoreFilters ? "active" : ""}`} onClick={() => setShowMoreFilters(!showMoreFilters)}>
              <Filter size={13} /> More Filters
            </button>
            <button className="tr-settings" title="Table settings" onClick={() => setShowSettings(!showSettings)}><Settings size={16} /></button>
          </div>

          {showMoreFilters && (
            <div className="tr-extra-filters">
              <span><SlidersHorizontal size={14} /> Advanced filters</span>
              <label><input type="checkbox" /> Only overdue tasks</label>
              <label><input type="checkbox" /> My tasks</label>
              <label><input type="checkbox" /> Tasks with attachments</label>
              <button onClick={clearFilters}>Clear all filters</button>
            </div>
          )}
          {showSettings && (
            <div className="tr-settings-panel">
              <b><Settings size={14} /> Table preferences</b>
              <span>Visible columns: ID · Title · Type · Status · Priority · Assignee · Story / Parent · Est. Hrs · Spent Hrs · Due Date</span>
              <button onClick={() => setShowSettings(false)}>Done</button>
            </div>
          )}

          <div className="tr-table-wrap">
            <table className="tr-table">
              <thead>
                <tr>
                  <th className="tr-check-col"><input type="checkbox" checked={visibleTasks.length > 0 && visibleTasks.every((t) => selectedIds.includes(t.id))} onChange={toggleAll} /></th>
                  <th>Task ID</th><th>Task Title</th><th>Type</th><th>Status</th>
                  <th>Priority</th><th>Assignee</th><th>Story / Parent</th>
                  <th>Est. Hrs</th><th>Spent Hrs</th><th>Due Date</th><th></th>
                </tr>
              </thead>
              <tbody>
                {visibleTasks.map((task) => (
                  <tr key={task.id} className={selectedId === task.id ? "selected" : ""} onClick={() => { setSelectedId(task.id); setShowDetails(true); }}>
                    <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(task.id)} onChange={() => toggleSelected(task.id)} /></td>
                    <td><button className="tr-task-id" onClick={(e) => { e.stopPropagation(); setSelectedId(task.id); setShowDetails(true); }}>{task.id}</button></td>
                    <td className="tr-task-title">{task.title}</td>
                    <td>{task.type}</td>
                    <td><StatusBadge status={task.status} /></td>
                    <td><span className={`tr-priority ${task.priority.toLowerCase()}`}>{task.priority}</span></td>
                    <td>{task.assignee}</td>
                    <td>{task.parent}</td>
                    <td>{task.estimated}h</td>
                    <td>{task.spent}h</td>
                    <td className={task.status !== "Done" && task.id === "TSK-009" ? "tr-overdue-date" : ""}>{task.dueDate}</td>
                    <td className="tr-row-action" onClick={(e) => e.stopPropagation()}>
                      <button aria-label={`Actions for ${task.id}`} onClick={() => setMenuId(menuId === task.id ? null : task.id)}><MoreVertical size={16} /></button>
                      {menuId === task.id && (
                        <div className="tr-row-menu">
                          <button onClick={() => { setSelectedId(task.id); setShowDetails(true); setMenuId(null); }}><Eye size={12} /> View details</button>
                          <button onClick={() => { setSelectedId(task.id); openEdit(task); setMenuId(null); }}><Pencil size={12} /> Edit task</button>
                          <button onClick={() => deleteTask(task)}><Trash2 size={12} /> Delete task</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {visibleTasks.length === 0 && <tr><td colSpan={12} className="tr-empty">No tasks found. Try changing your filters.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="tr-pagination">
            <span>Showing {filteredTasks.length ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, filteredTasks.length)} of {filteredTasks.length === tasks.length ? 142 : filteredTasks.length} tasks</span>
            <div className="tr-page-controls">
              <button disabled={page === 1} onClick={() => setPage(1)}>«</button>
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /></button>
              {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => i + 1).map((p) => (
                <button key={p} className={page === p ? "active" : ""} onClick={() => setPage(p)}>{p}</button>
              ))}
              {pageCount > 5 && <span>…</span>}
              <button disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}><ChevronRight size={14} /></button>
              <button disabled={page === pageCount} onClick={() => setPage(pageCount)}>»</button>
            </div>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
              <option value={15}>15 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </section>

        {showDetails && selectedTask && (
          <aside className="tr-details">
            <div className="tr-details-head">
              <h2>Task Details</h2>
              <button title="Close details" onClick={() => setShowDetails(false)}><X size={16} /></button>
            </div>
            <div className="tr-detail-id">
              <span>{selectedTask.id}</span><StatusBadge status={selectedTask.status} />
            </div>
            <h3>{selectedTask.title}</h3>
            <p className="tr-description">{selectedTask.description}</p>

            <div className="tr-detail-list">
              <div><span>Project</span><b>{selectedTask.project}</b></div>
              <div><span>Sprint</span><b>{selectedTask.sprint}</b></div>
              <div><span>Story / Parent</span><b><a href="#parent">{selectedTask.parent}</a> - Doctor dashboard redesign</b></div>
              <div><span>Task Type</span><b>{selectedTask.type}</b></div>
              <div><span>Priority</span><b><i className={`tr-priority-dot ${selectedTask.priority.toLowerCase()}`} />{selectedTask.priority}</b></div>
              <div><span>Assignee</span><b><i className="tr-person-avatar">{selectedTask.initials}</i>{selectedTask.assignee}<small>{selectedTask.type === "Design" ? "UI/UX Designer" : selectedTask.type}</small></b></div>
              <div><span>Reporter</span><b><i className="tr-person-avatar reporter">{selectedTask.reporterInitials}</i>{selectedTask.reporter}<small>Project Manager</small></b></div>
              <div><span>Est. Hours</span><b>{selectedTask.estimated}h</b></div>
              <div><span>Spent Hours</span><b>{selectedTask.spent}h {selectedTask.spent ? "15m" : ""}</b></div>
              <div><span>Remaining</span><b>{Math.max(0, selectedTask.estimated - selectedTask.spent)}h</b></div>
              <div><span>Due Date</span><b>{selectedTask.dueDate}</b></div>
            </div>

            <div className="tr-detail-section">
              <h4>Labels</h4>
              <div className="tr-labels">
                {selectedTask.labels.map((label) => <span key={label}>{label}</span>)}
                <button title="Add label" onClick={() => notify("Label editor can be connected to your label API")}><Plus size={14} /></button>
              </div>
            </div>

            <div className="tr-detail-section">
              <h4>Description</h4>
              <p>{selectedTask.description}</p>
            </div>

            <div className="tr-detail-section">
              <h4>Attachments ({selectedTask.attachments.length})</h4>
              {selectedTask.attachments.length ? selectedTask.attachments.map((file) => (
                <div className="tr-attachment" key={file.name}>
                  <span className={`tr-file-icon ${file.type}`}><FileText size={15} /></span>
                  <div><b>{file.name}</b><small>{file.size}</small></div>
                  <button title="Download attachment" onClick={() => notify("Connect this attachment to your file download API")}><Download size={14} /></button>
                </div>
              )) : <p className="tr-no-attachment">No attachments added.</p>}
            </div>

            <div className="tr-detail-section">
              <div className="tr-activity-heading"><h4>Activity</h4><button onClick={() => notify("Showing all task activity")}>View all</button></div>
              <div className="tr-activity-item">
                <i className="tr-person-avatar">{selectedTask.initials}</i>
                <div><b>{selectedTask.activity}</b><small>26 May 2025, 10:15 AM</small></div>
              </div>
            </div>

            <div className="tr-detail-actions">
              <button onClick={() => openEdit(selectedTask)}>Edit Task</button>
              <div className="tr-more-wrap">
                <button onClick={() => setMenuId(menuId === "details" ? null : "details")}>More Actions <ChevronDown size={13} /></button>
                {menuId === "details" && (
                  <div className="tr-more-menu">
                    <button onClick={() => { notify("Task duplicated"); setMenuId(null); }}>Duplicate task</button>
                    <button onClick={() => { notify("Task link copied"); setMenuId(null); }}>Copy task link</button>
                    <button onClick={() => { deleteTask(selectedTask); setMenuId(null); }}>Delete task</button>
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {modal && (
        <div className="tr-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <form className="tr-modal" onSubmit={saveTask}>
            <div className="tr-modal-header">
              <h2>{modal === "create" ? "Create Task" : `Edit Task — ${selectedTask?.id}`}</h2>
              <button type="button" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <label>Task Title *
              <input autoFocus required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Enter task title" />
            </label>
            <div className="tr-modal-grid">
              <label>Task Type
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {["Design", "Development", "QA", "Documentation"].map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>
              <label>Status
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}>
                  {statuses.map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>
              <label>Priority
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
                  {priorities.map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>
              <label>Assignee
                <select value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })}>
                  {peopleList.map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>
              <label>Estimated Hours
                <input type="number" min="0" value={form.estimated} onChange={(e) => setForm({ ...form, estimated: e.target.value })} />
              </label>
              <label>Due Date
                <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </label>
            </div>
            <label>Description
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the task..." />
            </label>
            <div className="tr-modal-actions">
              <button type="button" onClick={() => setModal(null)}>Cancel</button>
              <button className="tr-create-btn" type="submit"><Save size={14} /> {modal === "create" ? "Create Task" : "Save Changes"}</button>
            </div>
          </form>
        </div>
      )}

      {toast && <div className="tr-toast"><Check size={15} />{toast}<button onClick={() => setToast("")}><X size={13} /></button></div>}
    </main>
  );
}
