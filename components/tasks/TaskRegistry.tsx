"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, ChevronDown, ChevronLeft,
  ChevronRight, Download, Filter, Settings, MoreVertical,
  X, FileText, Clock3, CheckCircle2, ListTodo, GitPullRequest,
  ClipboardList, FlaskConical, Pencil, Trash2, Eye, Save,
  SlidersHorizontal, Check, LayoutGrid,
} from "lucide-react";
import { projects as getProjectsApi } from "../../lib/api";
import { sprintApi, type Sprint } from "../../lib/sprints/api";
import { getStoredUser } from "../../lib/auth";
import {
  taskApi,
  isValidObjectId,
  toBackendPriority,
  toBackendStatus,
  type NormalizedTask,
  type UiTaskPriority,
  type UiTaskStatus,
} from "../../lib/tasks/api";
import "./task-registry.css";

const statuses: UiTaskStatus[] = ["To Do", "In Progress", "In Review", "Testing", "Done"];
const priorities: UiTaskPriority[] = ["Critical", "High", "Medium", "Low"];
const taskTypes = ["Development", "Design", "QA", "Documentation", "Bug", "Task"];

function StatusBadge({ status }: { status: UiTaskStatus }) {
  const className: Record<UiTaskStatus, string> = {
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
  const router = useRouter();
  const [tasks, setTasks] = useState<NormalizedTask[]>([]);
  const [personnel, setPersonnel] = useState<{ id: string; employeeId?: string; name: string; email?: string; role?: string }[]>([]);
  const [projectList, setProjectList] = useState<any[]>([]);
  const [sprintList, setSprintList] = useState<Sprint[]>([]);
  const [currentUserName, setCurrentUserName] = useState("");
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("All");
  const [sprintFilter, setSprintFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);

  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [modal, setModal] = useState<"edit" | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [newLabelInput, setNewLabelInput] = useState("");
  const [addingLabel, setAddingLabel] = useState(false);

  const [form, setForm] = useState({
    title: "",
    type: "Development",
    status: "To Do" as UiTaskStatus,
    priority: "Medium" as UiTaskPriority,
    assignee: "",
    dueDate: "",
    estimated: "8",
    actual: "0",
    description: "",
  });

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const user = getStoredUser();
      if (user?.name) setCurrentUserName(user.name);

      const [tRes, pRes, sRes, peopleRes] = await Promise.allSettled([
        taskApi.list({ limit: 100 }),
        getProjectsApi({ limit: 100 }).catch(() => []),
        sprintApi.list({ limit: 100 }).catch(() => ({ items: [], total: 0 })),
        taskApi.getPersonnel(),
      ]);

      if (pRes.status === "fulfilled") {
        const rawP: any = pRes.value;
        const pList = Array.isArray(rawP) ? rawP : rawP?.data || rawP?.items || [];
        setProjectList(pList);
      }

      if (sRes.status === "fulfilled") {
        setSprintList(sRes.value.items || []);
      }

      if (peopleRes.status === "fulfilled") {
        setPersonnel(peopleRes.value || []);
      }

      if (tRes.status === "fulfilled") {
        const list = tRes.value.items || [];
        setTasks(list);
        if (list.length > 0) {
          setSelectedId((prev) => (prev && list.some((t) => t._id === prev) ? prev : list[0]._id));
        } else {
          setSelectedId("");
        }
      }
    } catch (err: any) {
      notify(`Failed to load tasks: ${err?.message || "Server error"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const selectedTask = tasks.find((task) => task._id === selectedId) || null;

  const filteredTasks = useMemo(() => {
    const term = search.toLowerCase().trim();
    return tasks.filter((task) => {
      const matchesSearch =
        !term ||
        [task.taskId, task.title, task.assignee, task.parent, task.projectName, task.sprintName].some((v) =>
          (v || "").toLowerCase().includes(term)
        );
      const matchesProject = projectFilter === "All" || task.projectId === projectFilter;
      const matchesSprint = sprintFilter === "All" || task.sprintId === sprintFilter;
      const matchesStatus = statusFilter === "All" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "All" || task.priority === priorityFilter;
      const matchesAssignee = assigneeFilter === "All" || task.assignee === assigneeFilter;
      const matchesType = typeFilter === "All" || task.type.toLowerCase() === typeFilter.toLowerCase();
      const matchesOverdue = !onlyOverdue || task.isOverdue;
      const matchesMine =
        !onlyMine ||
        !currentUserName ||
        task.assignee.toLowerCase() === currentUserName.toLowerCase();

      return (
        matchesSearch &&
        matchesProject &&
        matchesSprint &&
        matchesStatus &&
        matchesPriority &&
        matchesAssignee &&
        matchesType &&
        matchesOverdue &&
        matchesMine
      );
    });
  }, [
    tasks,
    search,
    projectFilter,
    sprintFilter,
    statusFilter,
    priorityFilter,
    assigneeFilter,
    typeFilter,
    onlyOverdue,
    onlyMine,
    currentUserName,
  ]);

  const total = tasks.length;
  const countByStatus = (status: UiTaskStatus) => tasks.filter((t) => t.status === status).length;
  const pct = (n: number) => (total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "0%");
  const overdueCount = tasks.filter((t) => t.isOverdue).length;

  const pageCount = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleTasks = filteredTasks.slice((safePage - 1) * pageSize, safePage * pageSize);

  const uniqueAssignees = useMemo(() => {
    const set = new Set<string>();
    personnel.forEach((p) => set.add(p.name));
    tasks.forEach((t) => {
      if (t.assignee && t.assignee !== "Unassigned") set.add(t.assignee);
    });
    return Array.from(set);
  }, [personnel, tasks]);

  function clearFilters() {
    setSearch("");
    setProjectFilter("All");
    setSprintFilter("All");
    setStatusFilter("All");
    setPriorityFilter("All");
    setAssigneeFilter("All");
    setTypeFilter("All");
    setOnlyOverdue(false);
    setOnlyMine(false);
    setPage(1);
  }

  function toggleSelected(id: string) {
    setSelectedIds((old) => (old.includes(id) ? old.filter((x) => x !== id) : [...old, id]));
  }

  function toggleAll() {
    const ids = visibleTasks.map((task) => task._id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    setSelectedIds((old) =>
      allSelected ? old.filter((id) => !ids.includes(id)) : Array.from(new Set([...old, ...ids]))
    );
  }

  function openEdit(task: NormalizedTask) {
    setSelectedId(task._id);
    setForm({
      title: task.title,
      type: task.type || "Development",
      status: task.status,
      priority: task.priority,
      assignee: task.assignee === "Unassigned" ? "" : task.assignee,
      dueDate: task.dueDate || "",
      estimated: String(task.estimatedHours || 0),
      actual: String(task.actualHours || 0),
      description: task.description || "",
    });
    setModal("edit");
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !selectedTask) return;

    try {
      const matchedPerson = personnel.find((p) => p.name === form.assignee);
      const payload: Record<string, any> = {
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        status: toBackendStatus(form.status),
        priority: toBackendPriority(form.priority),
        assigneeName: form.assignee || "Unassigned",
        estimatedHours: Number(form.estimated) || 0,
        actualHours: Number(form.actual) || 0,
        dueDate: form.dueDate ? new Date(`${form.dueDate}T00:00:00`).toISOString() : null,
      };
      if (matchedPerson?.employeeId && isValidObjectId(matchedPerson.employeeId)) {
        payload.assigneeId = matchedPerson.employeeId;
      }

      const updated = await taskApi.update(selectedTask._id, payload);
      setTasks((prev) => prev.map((t) => (t._id === selectedTask._id ? updated : t)));
      setModal(null);
      notify(`Task ${selectedTask.taskId} updated successfully.`);
    } catch (err: any) {
      notify(`Failed to update task: ${err?.message || "API error"}`);
    }
  }

  async function duplicateTask(task: NormalizedTask) {
    try {
      const { nextCode } = await taskApi.getNextCode();
      const payload: Record<string, any> = {
        taskId: nextCode,
        projectId: task.projectId,
        title: `${task.title} (Copy)`,
        description: task.description,
        type: task.type,
        priority: task.rawPriority,
        status: "BACKLOG",
        assigneeName: task.assignee,
        estimatedHours: task.estimatedHours,
        storyPoints: task.storyPoints,
        tags: task.tags,
      };
      if (isValidObjectId(task.milestoneId)) payload.milestoneId = task.milestoneId;
      if (isValidObjectId(task.sprintId)) payload.sprintId = task.sprintId;
      if (isValidObjectId(task.assigneeId)) payload.assigneeId = task.assigneeId;

      await taskApi.create(payload);
      await loadTasks();
      notify(`Duplicated as ${nextCode}.`);
    } catch (err: any) {
      notify(`Could not duplicate task: ${err?.message || "API error"}`);
    }
  }

  async function addLabelToSelected() {
    const clean = newLabelInput.trim();
    if (!clean || !selectedTask) return;
    if (selectedTask.tags.includes(clean)) {
      setNewLabelInput("");
      setAddingLabel(false);
      return;
    }
    try {
      const nextTags = [...selectedTask.tags, clean];
      const updated = await taskApi.update(selectedTask._id, { tags: nextTags });
      setTasks((prev) => prev.map((t) => (t._id === selectedTask._id ? updated : t)));
      setNewLabelInput("");
      setAddingLabel(false);
      notify(`Label "${clean}" added.`);
    } catch (err: any) {
      notify(`Could not add label: ${err?.message || "API error"}`);
    }
  }

  async function deleteTask(task: NormalizedTask) {
    if (!window.confirm(`Delete ${task.taskId} — "${task.title}"?`)) return;
    setMenuId(null);
    try {
      await taskApi.remove(task._id);
      setTasks((old) => old.filter((t) => t._id !== task._id));
      if (selectedId === task._id) setSelectedId("");
      notify(`Task ${task.taskId} deleted.`);
    } catch (err: any) {
      notify(`Failed to delete task: ${err?.message || "API error"}`);
    }
  }

  function exportCsv() {
    const headers = [
      "Task ID", "Task Title", "Project", "Sprint", "Type", "Status",
      "Priority", "Assignee", "Parent", "Estimated Hours", "Spent Hours", "Due Date",
    ];
    const rows = filteredTasks.map((t) => [
      t.taskId, t.title, t.projectName, t.sprintName, t.type, t.status,
      t.priority, t.assignee, t.parent, t.estimatedHours, t.actualHours, t.dueDateLabel,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "task-registry.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    notify("Task registry exported.");
  }

  const activeProjectName =
    projectFilter !== "All"
      ? projectList.find((p) => (p._id || p.id) === projectFilter)?.projectName || "Project"
      : "All Projects";

  return (
    <main className="tr-page">
      <div className="tr-breadcrumb">
        <span>Tasks / Kanban</span><ChevronRight size={12} />
        <span>{activeProjectName}</span><ChevronRight size={12} />
        <b>Task Registry</b>
        <div className="tr-breadcrumb-actions">
          <button onClick={() => router.push("/tasks/kanban")}><LayoutGrid size={13} /> Kanban Board</button>
          <button onClick={exportCsv}><Download size={13} /> Export CSV</button>
          <button className="tr-create-btn" onClick={() => router.push("/tasks/new")}><Plus size={15} /> Create Task</button>
        </div>
      </div>

      <section className="tr-metrics">
        <MetricCard icon={<ClipboardList size={19} />} title="Total Tasks" value={total} tone="neutral" subtitle="All Tasks" />
        <MetricCard icon={<ListTodo size={19} />} title="To Do" value={countByStatus("To Do")} percent={pct(countByStatus("To Do"))} tone="blue" />
        <MetricCard icon={<GitPullRequest size={19} />} title="In Progress" value={countByStatus("In Progress")} percent={pct(countByStatus("In Progress"))} tone="orange" />
        <MetricCard icon={<Pencil size={19} />} title="In Review" value={countByStatus("In Review")} percent={pct(countByStatus("In Review"))} tone="purple" />
        <MetricCard icon={<FlaskConical size={19} />} title="Testing" value={countByStatus("Testing")} percent={pct(countByStatus("Testing"))} tone="teal" />
        <MetricCard icon={<CheckCircle2 size={19} />} title="Done" value={countByStatus("Done")} percent={pct(countByStatus("Done"))} tone="green" />
        <MetricCard icon={<Clock3 size={19} />} title="Overdue" value={overdueCount} percent={pct(overdueCount)} tone="red" />
      </section>

      <div className={`tr-content ${showDetails && selectedTask ? "has-details" : ""}`}>
        <section className="tr-registry">
          <div className="tr-filterbar">
            <label className="tr-search">
              <Search size={14} />
              <input
                id="task-search"
                value={search}
                placeholder="Search tasks by ID, title, assignee, or project..."
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </label>
            <select value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }}>
              <option value="All">All Projects</option>
              {projectList.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.projectName || p.name}
                </option>
              ))}
            </select>
            <select value={sprintFilter} onChange={(e) => { setSprintFilter(e.target.value); setPage(1); }}>
              <option value="All">All Sprints</option>
              {sprintList.map((s) => (
                <option key={s._id || s.id} value={s._id || s.id}>
                  {s.sprintCode} — {s.name}
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="All">Status (All)</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}>
              <option value="All">Priority (All)</option>
              {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={assigneeFilter} onChange={(e) => { setAssigneeFilter(e.target.value); setPage(1); }}>
              <option value="All">Assignee (All)</option>
              {uniqueAssignees.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
              <option value="All">Type (All)</option>
              {taskTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button
              className={`tr-filter-button ${showMoreFilters ? "active" : ""}`}
              onClick={() => setShowMoreFilters(!showMoreFilters)}
            >
              <Filter size={13} /> More Filters
            </button>
            <button className="tr-settings" title="Table settings" onClick={() => setShowSettings(!showSettings)}>
              <Settings size={16} />
            </button>
          </div>

          {showMoreFilters && (
            <div className="tr-extra-filters">
              <span><SlidersHorizontal size={14} /> Advanced filters</span>
              <label>
                <input type="checkbox" checked={onlyOverdue} onChange={(e) => { setOnlyOverdue(e.target.checked); setPage(1); }} />
                Only overdue tasks
              </label>
              <label>
                <input type="checkbox" checked={onlyMine} onChange={(e) => { setOnlyMine(e.target.checked); setPage(1); }} />
                Assigned to me ({currentUserName || "Current User"})
              </label>
              <button onClick={clearFilters}>Clear all filters</button>
            </div>
          )}

          {showSettings && (
            <div className="tr-settings-panel">
              <b><Settings size={14} /> Table preferences</b>
              <span>Columns: ID · Title · Type · Status · Priority · Assignee · Parent · Est. Hrs · Spent Hrs · Due Date</span>
              <button onClick={() => setShowSettings(false)}>Done</button>
            </div>
          )}

          <div className="tr-table-wrap">
            <table className="tr-table">
              <thead>
                <tr>
                  <th className="tr-check-col">
                    <input
                      type="checkbox"
                      checked={visibleTasks.length > 0 && visibleTasks.every((t) => selectedIds.includes(t._id))}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>Task ID</th><th>Task Title</th><th>Type</th><th>Status</th>
                  <th>Priority</th><th>Assignee</th><th>Parent / Story</th>
                  <th>Est. Hrs</th><th>Spent Hrs</th><th>Due Date</th><th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={12} className="tr-empty">Loading tasks from database...</td></tr>
                ) : visibleTasks.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="tr-empty">
                      No tasks found. Click &quot;Create Task&quot; to add your first task.
                    </td>
                  </tr>
                ) : (
                  visibleTasks.map((task) => (
                    <tr
                      key={task._id}
                      className={selectedId === task._id ? "selected" : ""}
                      onClick={() => { setSelectedId(task._id); setShowDetails(true); }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(task._id)}
                          onChange={() => toggleSelected(task._id)}
                        />
                      </td>
                      <td>
                        <button
                          className="tr-task-id"
                          onClick={(e) => { e.stopPropagation(); setSelectedId(task._id); setShowDetails(true); }}
                        >
                          {task.taskId}
                        </button>
                      </td>
                      <td className="tr-task-title">{task.title}</td>
                      <td>{task.type}</td>
                      <td><StatusBadge status={task.status} /></td>
                      <td><span className={`tr-priority ${task.priority.toLowerCase()}`}>{task.priority}</span></td>
                      <td>{task.assignee}</td>
                      <td>{task.parent}</td>
                      <td>{task.estimatedHours}h</td>
                      <td>{task.actualHours}h</td>
                      <td className={task.isOverdue ? "tr-overdue-date" : ""}>{task.dueDateLabel}</td>
                      <td className="tr-row-action" onClick={(e) => e.stopPropagation()}>
                        <button
                          aria-label={`Actions for ${task.taskId}`}
                          onClick={() => setMenuId(menuId === task._id ? null : task._id)}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {menuId === task._id && (
                          <div className="tr-row-menu">
                            <button onClick={() => { setSelectedId(task._id); setShowDetails(true); setMenuId(null); }}>
                              <Eye size={12} /> View details
                            </button>
                            <button onClick={() => { openEdit(task); setMenuId(null); }}>
                              <Pencil size={12} /> Edit task
                            </button>
                            <button onClick={() => deleteTask(task)}>
                              <Trash2 size={12} /> Delete task
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

          <div className="tr-pagination">
            <span>
              Showing {filteredTasks.length ? (safePage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(safePage * pageSize, filteredTasks.length)} of {filteredTasks.length} tasks
            </span>
            <div className="tr-page-controls">
              <button disabled={safePage === 1} onClick={() => setPage(1)}>«</button>
              <button disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={14} /></button>
              {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => i + 1).map((p) => (
                <button key={p} className={safePage === p ? "active" : ""} onClick={() => setPage(p)}>{p}</button>
              ))}
              {pageCount > 5 && <span>…</span>}
              <button disabled={safePage === pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}><ChevronRight size={14} /></button>
              <button disabled={safePage === pageCount} onClick={() => setPage(pageCount)}>»</button>
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
              <span>{selectedTask.taskId}</span>
              <StatusBadge status={selectedTask.status} />
            </div>
            <h3>{selectedTask.title}</h3>
            {selectedTask.description && <p className="tr-description">{selectedTask.description}</p>}

            <div className="tr-detail-list">
              <div><span>Project</span><b>{selectedTask.projectName}</b></div>
              <div><span>Sprint</span><b>{selectedTask.sprintCode ? `${selectedTask.sprintCode} — ${selectedTask.sprintName}` : selectedTask.sprintName}</b></div>
              <div><span>Parent / Story</span><b>{selectedTask.parent}</b></div>
              <div><span>Task Type</span><b>{selectedTask.type}</b></div>
              <div><span>Priority</span><b><i className={`tr-priority-dot ${selectedTask.priority.toLowerCase()}`} />{selectedTask.priority}</b></div>
              <div><span>Assignee</span><b><i className="tr-person-avatar">{selectedTask.initials}</i>{selectedTask.assignee}</b></div>
              <div><span>Reporter</span><b><i className="tr-person-avatar reporter">{selectedTask.reporterInitials}</i>{selectedTask.reporter}</b></div>
              <div><span>Est. Hours</span><b>{selectedTask.estimatedHours}h</b></div>
              <div><span>Spent Hours</span><b>{selectedTask.actualHours}h</b></div>
              <div><span>Remaining</span><b>{Math.max(0, selectedTask.estimatedHours - selectedTask.actualHours)}h</b></div>
              <div><span>Due Date</span><b>{selectedTask.dueDateLabel}</b></div>
            </div>

            <div className="tr-detail-section">
              <h4>Labels</h4>
              <div className="tr-labels">
                {selectedTask.tags.map((label) => <span key={label}>{label}</span>)}
                {addingLabel ? (
                  <input
                    autoFocus
                    value={newLabelInput}
                    onChange={(e) => setNewLabelInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addLabelToSelected(); }
                      if (e.key === "Escape") { setAddingLabel(false); setNewLabelInput(""); }
                    }}
                    onBlur={addLabelToSelected}
                    placeholder="Tag..."
                    style={{ width: "80px", padding: "2px 6px", fontSize: "11px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                  />
                ) : (
                  <button title="Add label" onClick={() => setAddingLabel(true)}><Plus size={14} /></button>
                )}
              </div>
            </div>

            <div className="tr-detail-section">
              <h4>Attachments ({selectedTask.attachments.length})</h4>
              {selectedTask.attachments.length ? (
                selectedTask.attachments.map((file: any, idx: number) => (
                  <div className="tr-attachment" key={`${file.name || idx}`}>
                    <span className="tr-file-icon pdf"><FileText size={15} /></span>
                    <div><b>{file.name || "Attachment"}</b><small>{file.size || ""}</small></div>
                  </div>
                ))
              ) : (
                <p className="tr-no-attachment">No attachments added.</p>
              )}
            </div>

            <div className="tr-detail-section">
              <div className="tr-activity-heading">
                <h4>Recent Activity</h4>
                <button onClick={() => router.push("/tasks/audit")}>View all</button>
              </div>
              {selectedTask.activityLog.length > 0 ? (
                selectedTask.activityLog.slice(-2).reverse().map((ev: any, idx: number) => (
                  <div className="tr-activity-item" key={ev.id || idx}>
                    <i className="tr-person-avatar">{selectedTask.initials}</i>
                    <div>
                      <b>{ev.details || `${ev.action}: ${ev.newState}`}</b>
                      <small>{ev.timestamp ? new Date(ev.timestamp).toLocaleString("en-IN") : "Recent"}</small>
                    </div>
                  </div>
                ))
              ) : (
                <div className="tr-activity-item">
                  <i className="tr-person-avatar">{selectedTask.reporterInitials}</i>
                  <div>
                    <b>Last updated</b>
                    <small>
                      {selectedTask.updatedAt
                        ? new Date(selectedTask.updatedAt).toLocaleString("en-IN")
                        : "Recently created"}
                    </small>
                  </div>
                </div>
              )}
            </div>

            <div className="tr-detail-actions">
              <button onClick={() => openEdit(selectedTask)}>Edit Task</button>
              <div className="tr-more-wrap">
                <button onClick={() => setMenuId(menuId === "details" ? null : "details")}>
                  More Actions <ChevronDown size={13} />
                </button>
                {menuId === "details" && (
                  <div className="tr-more-menu">
                    <button onClick={() => { duplicateTask(selectedTask); setMenuId(null); }}>Duplicate task</button>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(window.location.href);
                        notify("Task link copied.");
                        setMenuId(null);
                      }}
                    >
                      Copy task link
                    </button>
                    <button onClick={() => { deleteTask(selectedTask); setMenuId(null); }}>Delete task</button>
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {modal === "edit" && selectedTask && (
        <div className="tr-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <form className="tr-modal" onSubmit={saveTask}>
            <div className="tr-modal-header">
              <h2>Edit Task — {selectedTask.taskId}</h2>
              <button type="button" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <label>Task Title *
              <input autoFocus required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Enter task title" />
            </label>
            <div className="tr-modal-grid">
              <label>Task Type
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {taskTypes.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              <label>Status
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as UiTaskStatus })}>
                  {statuses.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              <label>Priority
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as UiTaskPriority })}>
                  {priorities.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              <label>Assignee
                <select value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })}>
                  <option value="">Unassigned</option>
                  {uniqueAssignees.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              <label>Estimated Hours
                <input type="number" min="0" value={form.estimated} onChange={(e) => setForm({ ...form, estimated: e.target.value })} />
              </label>
              <label>Spent Hours
                <input type="number" min="0" value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} />
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
              <button className="tr-create-btn" type="submit"><Save size={14} /> Save Changes</button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="tr-toast">
          <Check size={15} />{toast}
          <button onClick={() => setToast("")}><X size={13} /></button>
        </div>
      )}
    </main>
  );
}
