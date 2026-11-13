
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Bell, CircleHelp, ChevronDown, ChevronRight,
  Filter, Settings, MoreVertical, CalendarDays, Clock3,
  MessageSquare, Paperclip, Flag, CircleAlert, CheckCircle2,
  Circle, BarChart3, SlidersHorizontal, LayoutGrid, List,
  UserRound, X, Check, GripVertical, Activity, Timer,
  Target, Zap, CalendarClock, ChartNoAxesCombined,
} from "lucide-react";
import "./kanban-board.css";

type Status = "To Do" | "In Progress" | "In Review" | "Testing" | "Done";
type Priority = "High" | "Medium" | "Low";

type Task = {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  assignee: string;
  initials: string;
  dueDate: string;
  hours: number;
  points: number;
  label: string;
  labelColor: string;
  comments: number;
  attachments: number;
  progress?: number;
  blocked?: boolean;
};

const initialTasks: Task[] = [
  {
    id: "TSK-101", title: "Design user profile UI", status: "To Do",
    priority: "High", assignee: "Priya Verma", initials: "PV",
    dueDate: "31 May 2025", hours: 5, points: 3,
    label: "UI", labelColor: "purple", comments: 2, attachments: 1,
  },
  {
    id: "TSK-102", title: "API: Get user details", status: "To Do",
    priority: "Medium", assignee: "Amit Kumar", initials: "AK",
    dueDate: "31 May 2025", hours: 8, points: 5,
    label: "Backend", labelColor: "teal", comments: 1, attachments: 0,
  },
  {
    id: "TSK-103", title: "Write unit tests", status: "To Do",
    priority: "Medium", assignee: "Neha Gupta", initials: "NG",
    dueDate: "01 Jun 2025", hours: 5, points: 3,
    label: "QA", labelColor: "green", comments: 0, attachments: 0,
  },
  {
    id: "TSK-104", title: "Update documentation", status: "To Do",
    priority: "Low", assignee: "Rahul Sharma", initials: "RS",
    dueDate: "02 Jun 2025", hours: 4, points: 2,
    label: "Docs", labelColor: "purple", comments: 0, attachments: 0,
  },
  {
    id: "TSK-045", title: "Implement login validation", status: "In Progress",
    priority: "High", assignee: "Vikas Singh", initials: "VS",
    dueDate: "28 May 2025", hours: 8, points: 5,
    label: "Backend", labelColor: "teal", comments: 2, attachments: 1,
  },
  {
    id: "TSK-046", title: "Create dashboard widgets", status: "In Progress",
    priority: "High", assignee: "Priya Verma", initials: "PV",
    dueDate: "29 May 2025", hours: 12, points: 8,
    label: "UI", labelColor: "purple", comments: 3, attachments: 2,
  },
  {
    id: "TSK-047", title: "Integrate auth module", status: "In Progress",
    priority: "Medium", assignee: "Amit Kumar", initials: "AK",
    dueDate: "29 May 2025", hours: 6, points: 3,
    label: "Backend", labelColor: "teal", comments: 0, attachments: 0,
  },
  {
    id: "TSK-048", title: "Optimize API response", status: "In Progress",
    priority: "Medium", assignee: "Vikas Singh", initials: "VS",
    dueDate: "30 May 2025", hours: 6, points: 3,
    label: "Backend", labelColor: "teal", comments: 0, attachments: 0,
  },
  {
    id: "TSK-021", title: "Validate user login", status: "In Review",
    priority: "Medium", assignee: "Sneha Patel", initials: "SP",
    dueDate: "28 May 2025", hours: 4, points: 3,
    label: "QA", labelColor: "green", comments: 3, attachments: 2,
  },
  {
    id: "TSK-022", title: "Review dashboard layout", status: "In Review",
    priority: "Medium", assignee: "Mayank Swaroop", initials: "MS",
    dueDate: "29 May 2025", hours: 6, points: 3,
    label: "QA", labelColor: "green", comments: 2, attachments: 1,
  },
  {
    id: "TSK-023", title: "Code review: Auth API", status: "In Review",
    priority: "Low", assignee: "Rahul Sharma", initials: "RS",
    dueDate: "29 May 2025", hours: 3, points: 2,
    label: "QA", labelColor: "green", comments: 1, attachments: 0,
  },
  {
    id: "TSK-024", title: "Review error handling", status: "In Review",
    priority: "Low", assignee: "Sneha Patel", initials: "SP",
    dueDate: "30 May 2025", hours: 3, points: 2,
    label: "QA", labelColor: "green", comments: 0, attachments: 0,
  },
  {
    id: "TSK-031", title: "Test login functionality", status: "Testing",
    priority: "Medium", assignee: "Neha Gupta", initials: "NG",
    dueDate: "30 May 2025", hours: 5, points: 3,
    label: "QA", labelColor: "green", comments: 2, attachments: 3,
    progress: 66,
  },
  {
    id: "TSK-032", title: "Test dashboard widgets", status: "Testing",
    priority: "Medium", assignee: "Neha Gupta", initials: "NG",
    dueDate: "31 May 2025", hours: 6, points: 3,
    label: "QA", labelColor: "green", comments: 2, attachments: 1,
    progress: 25,
  },
  {
    id: "TSK-033", title: "Cross browser testing", status: "Testing",
    priority: "Low", assignee: "Priya Verma", initials: "PV",
    dueDate: "02 Jun 2025", hours: 5, points: 3,
    label: "QA", labelColor: "green", comments: 0, attachments: 0,
    progress: 0,
  },
  {
    id: "TSK-034", title: "Security vulnerability test", status: "Testing",
    priority: "High", assignee: "Amit Kumar", initials: "AK",
    dueDate: "02 Jun 2025", hours: 8, points: 5,
    label: "QA", labelColor: "green", comments: 1, attachments: 0,
    progress: 0,
  },
  {
    id: "TSK-001", title: "Setup project repository", status: "Done",
    priority: "Low", assignee: "Rohit Das", initials: "RD",
    dueDate: "26 May 2025", hours: 3, points: 2,
    label: "DevOps", labelColor: "purple", comments: 0, attachments: 0,
  },
  {
    id: "TSK-002", title: "Configure CI/CD pipeline", status: "Done",
    priority: "Low", assignee: "Rohit Das", initials: "RD",
    dueDate: "26 May 2025", hours: 4, points: 2,
    label: "DevOps", labelColor: "purple", comments: 0, attachments: 0,
  },
  {
    id: "TSK-003", title: "Create database schema", status: "Done",
    priority: "Low", assignee: "Vikas Singh", initials: "VS",
    dueDate: "27 May 2025", hours: 5, points: 3,
    label: "Backend", labelColor: "teal", comments: 0, attachments: 0,
  },
  {
    id: "TSK-004", title: "Design system architecture", status: "Done",
    priority: "Low", assignee: "Rahul Sharma", initials: "RS",
    dueDate: "27 May 2025", hours: 4, points: 2,
    label: "Documentation", labelColor: "purple", comments: 0, attachments: 0,
  },
];

const columns: Status[] = [
  "To Do", "In Progress", "In Review", "Testing", "Done",
];

const people = [
  "Priya Verma", "Amit Kumar", "Sneha Patel", "Vikas Singh",
  "Rahul Sharma", "Neha Gupta", "Rohit Das", "Mayank Swaroop",
];

function Avatar({ initials }: { initials: string }) {
  return <span className="kb-avatar">{initials}</span>;
}

function PriorityText({ priority }: { priority: Priority }) {
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
  return (
    <div
      className="kb-donut"
      style={{
        background: `conic-gradient(${color} ${percentage * 3.6}deg, #e9edf5 0deg)`,
      }}
    >
      <div className="kb-donut-inner">
        <strong>{percentage}%</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}

function MiniBurndown() {
  return (
    <svg viewBox="0 0 260 145" className="kb-burndown-svg" role="img" aria-label="Sprint burndown chart">
      <g stroke="#edf0f5" strokeWidth="1">
        {[20, 48, 76, 104, 132].map((y) => (
          <line key={y} x1="28" y1={y} x2="250" y2={y} />
        ))}
      </g>
      <g fill="#64748b" fontSize="9">
        <text x="2" y="23">60</text>
        <text x="2" y="51">40</text>
        <text x="2" y="79">20</text>
        <text x="8" y="135">0</text>
        <text x="25" y="144">26 May</text>
        <text x="90" y="144">29 May</text>
        <text x="150" y="144">01 Jun</text>
        <text x="205" y="144">04 Jun</text>
        <text x="235" y="144">08 Jun</text>
      </g>
      <polyline
        points="28,22 58,35 88,48 118,61 148,75 178,89 208,103 245,119"
        fill="none" stroke="#0870ff" strokeWidth="1.8" strokeDasharray="5 4"
      />
      <polyline
        points="28,22 45,28 61,31 78,37 94,40 110,49 128,54 145,64 163,69 181,82 200,91 218,101"
        fill="none" stroke="#079b5c" strokeWidth="2"
      />
      <g fill="#079b5c">
        {[
          [28, 22], [45, 28], [61, 31], [78, 37], [94, 40],
          [110, 49], [128, 54], [145, 64], [163, 69],
          [181, 82], [200, 91], [218, 101],
        ].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.2" />)}
      </g>
    </svg>
  );
}

export default function KanbanBoard() {
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showView, setShowView] = useState(false);
  const [groupBy, setGroupBy] = useState("Status");
  const [showMenu, setShowMenu] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const filteredTasks = useMemo(() => {
    const query = search.toLowerCase().trim();

    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.id.toLowerCase().includes(query) ||
        task.title.toLowerCase().includes(query) ||
        task.assignee.toLowerCase().includes(query);

      return (
        matchesSearch &&
        (priorityFilter === "All" || task.priority === priorityFilter) &&
        (assigneeFilter === "All" || task.assignee === assigneeFilter)
      );
    });
  }, [tasks, search, priorityFilter, assigneeFilter]);

  const statusCount = (status: Status) =>
    tasks.filter((task) => task.status === status).length;

  const total = tasks.length;
  const completed = statusCount("Done");
  const inProgress = statusCount("In Progress");
  const remaining = total - completed;

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  }

  function moveTask(taskId: string, status: Status) {
    setTasks((old) =>
      old.map((task) =>
        task.id === taskId
          ? { ...task, status }
          : task
      )
    );
    setDraggedId(null);
    notify(`${taskId} moved to ${status}`);
  }

  function clearFilters() {
    setSearch("");
    setPriorityFilter("All");
    setAssigneeFilter("All");
    setShowFilters(false);
  }

  function addTask(status: Status) {
    router.push(`/tasks/new?status=${encodeURIComponent(status)}`);
  }

  function renderTask(task: Task) {
    return (
      <article
        key={task.id}
        className={`kb-task-card ${draggedId === task.id ? "dragging" : ""}`}
        draggable
        onDragStart={() => setDraggedId(task.id)}
        onDragEnd={() => setDraggedId(null)}
        onClick={() => setSelectedTask(task)}
      >
        <div className="kb-card-top">
          <span className="kb-task-id">{task.id}</span>
          <span className={`kb-label ${task.labelColor}`}>{task.label}</span>
        </div>

        <h4>{task.title}</h4>

        <div className="kb-assignee">
          <Avatar initials={task.initials} />
          <span>{task.assignee}</span>
          {task.status === "In Progress" && task.id === "TSK-045" && (
            <span className="kb-time-chip"><Clock3 size={11} /> 2h 15m</span>
          )}
        </div>

        <div className="kb-card-meta">
          <span className={task.status === "Done" || task.dueDate === "30 May 2025" ? "date-green" : task.dueDate === "31 May 2025" ? "date-red" : ""}>
            {task.dueDate}
          </span>
          <div>
            <span>{task.hours}h</span>
            <span>SP&nbsp; {task.points}</span>
          </div>
        </div>

        {typeof task.progress === "number" && (
          <div className="kb-task-progress">
            <div><span style={{ width: `${task.progress}%` }} /></div>
            <small>{task.progress}%</small>
          </div>
        )}

        <div className="kb-card-footer">
          <div>
            <span><MessageSquare size={12} /> {task.comments}</span>
            <span><Paperclip size={12} /> {task.attachments}</span>
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
      {/* Page heading */}
      <header className="kb-header">
        <div>
          <h1>Kanban Board</h1>
          <p>Visualize and manage tasks across the workflow</p>
        </div>
      </header>

      {/* Breadcrumb and toolbar */}
      <div className="kb-breadcrumb">
        <div className="kb-crumbs">
          <span>Projects</span><ChevronRight size={13} />
          <span>AI-CMS Redesign</span><ChevronRight size={13} />
          <span>Sprint 12</span><ChevronRight size={13} />
          <span>Tasks / Kanban</span><ChevronRight size={13} />
          <b>Kanban Board</b>
        </div>

        <div className="kb-toolbar">
          <div className="kb-control-wrap">
            <button className={showFilters ? "selected" : ""} onClick={() => setShowFilters(!showFilters)}>
              <Filter size={14} /> Filters
            </button>
            {showFilters && (
              <div className="kb-dropdown kb-filter-dropdown">
                <label>Priority
                  <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                    <option>All</option><option>High</option><option>Medium</option><option>Low</option>
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

          <label className="kb-group-control">
            Group by:
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
              <option>Status</option><option>Priority</option><option>Assignee</option>
            </select>
          </label>

          <div className="kb-control-wrap">
            <button onClick={() => setShowCustomize(!showCustomize)}>
              <Settings size={14} /> Customize
            </button>
            {showCustomize && (
              <div className="kb-dropdown">
                <b>Board settings</b>
                <label><input type="checkbox" defaultChecked /> Show assignee</label>
                <label><input type="checkbox" defaultChecked /> Show due date</label>
                <label><input type="checkbox" defaultChecked /> Show story points</label>
                <label><input type="checkbox" defaultChecked /> Show attachments</label>
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
                <button onClick={() => notify("Board settings opened")}>Board settings</button>
                <button onClick={() => notify("Export started")}>Export board</button>
                <button onClick={() => notify("Board link copied")}>Copy board link</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <section className="kb-summary">
        <div className="kb-sprint-info">
          <div className="kb-sprint-heading">
            <b>Sprint 12</b><span>Active</span>
          </div>
          <strong>26 May – 08 Jun 2025</strong>
          <small>14 Days Remaining</small>
        </div>

        <div className="kb-total">
          <span>Total Tasks</span>
          <strong>{total + 122}</strong>
          <small>All Tasks</small>
        </div>

        {[
          { status: "To Do" as Status, value: 42, pct: "29.6%", color: "blue", icon: <List size={19} /> },
          { status: "In Progress" as Status, value: 38, pct: "26.8%", color: "orange", icon: <Activity size={19} /> },
          { status: "In Review" as Status, value: 18, pct: "12.7%", color: "purple", icon: <CheckCircle2 size={19} /> },
          { status: "Testing" as Status, value: 20, pct: "14.1%", color: "teal", icon: <ClipboardIcon /> },
          { status: "Done" as Status, value: 24, pct: "16.9%", color: "green", icon: <CheckCircle2 size={19} /> },
        ].map((item) => (
          <div className="kb-summary-stat" key={item.status}>
            <div className={`kb-summary-icon ${item.color}`}>{item.icon}</div>
            <div>
              <span>{item.status}</span>
              <strong>{item.value}</strong>
              <small className={item.color}>{item.pct}</small>
            </div>
          </div>
        ))}
      </section>

      {/* Main board */}
      <div className="kb-main-layout">
        <section className="kb-board-area">
          <div className={`kb-board-columns ${groupBy !== "Status" ? "alternate-group" : ""}`}>
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
                      <span className="kb-column-count">{statusCount(status) === 0 ? columnTasks.length : statusCount(status)}</span>
                    </div>
                    <div>
                      <button title="Add task" onClick={() => addTask(status)}><Plus size={16} /></button>
                      <button title="Column actions" onClick={() => notify(`${status} column options`)}><MoreVertical size={16} /></button>
                    </div>
                  </div>

                  <div className="kb-column-cards">
                    {columnTasks.map(renderTask)}
                    {columnTasks.length === 0 && (
                      <div className="kb-empty-column">Drop a task here</div>
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
            <span><Flag className="high-icon" size={14} /> High Priority</span>
            <span><Flag className="medium-icon" size={14} /> Medium Priority</span>
            <span><Flag className="low-icon" size={14} /> Low Priority</span>
            <span><CircleAlert className="blocked-icon" size={14} /> Blocked</span>
            <span><CalendarDays size={14} /> Due Today</span>
            <span><CalendarClock className="overdue-icon" size={14} /> Overdue</span>
            <span><MessageSquare size={14} /> Has Comments</span>
            <span><Paperclip size={14} /> Has Attachments</span>
            <span><SlidersHorizontal size={14} /> Subtasks</span>
            <span><Timer size={14} /> Tracked Time</span>
          </div>
        </section>

        {/* Right sidebar */}
        <aside className="kb-right-sidebar">
          <section className="kb-side-card kb-progress-card">
            <h3>Sprint Progress</h3>
            <div className="kb-progress-content">
              <Donut percentage={64} label="Complete" />
              <div className="kb-progress-labels">
                <p><span className="dot blue-dot" />Completed <b>{completed || 24}</b></p>
                <p><span className="dot green-dot" />In Progress <b>{inProgress || 38}</b></p>
                <p><span className="dot gray-dot" />Remaining <b>{remaining + 60}</b></p>
              </div>
            </div>
          </section>

          <section className="kb-side-card kb-velocity">
            <h3>Velocity</h3>
            <div className="kb-velocity-number">
              <strong>32</strong>
              <span>Target: 50 SP <Target size={12} /></span>
            </div>
            <div className="kb-velocity-bottom">
              <small>Average</small>
              <div><span /></div>
            </div>
          </section>

          <section className="kb-side-card kb-chart-card">
            <div className="kb-side-title">
              <h3>Burndown Chart</h3>
              <div><span className="chart-blue" /> Ideal <span className="chart-green" /> Actual</div>
            </div>
            <MiniBurndown />
            <button onClick={() => notify("Full burndown chart view")}>View Full Chart</button>
          </section>

          <section className="kb-side-card kb-blocked-card">
            <div className="kb-side-title">
              <h3>Blocked Tasks <span>3</span></h3>
              <button onClick={() => notify("Showing all blocked tasks")}>View all</button>
            </div>
            {[
              { id: "TSK-017", title: "Payment gateway integration", priority: "High" },
              { id: "TSK-029", title: "Data export issue", priority: "Medium" },
              { id: "TSK-038", title: "Third party API not responding", priority: "High" },
            ].map((item) => (
              <div className="kb-blocked-item" key={item.id}>
                <Flag size={14} className={item.priority === "High" ? "high-icon" : "medium-icon"} />
                <div><b>{item.id}</b><p>{item.title}</p></div>
                <PriorityText priority={item.priority as Priority} />
              </div>
            ))}
          </section>

          <section className="kb-side-card kb-activity-card">
            <div className="kb-side-title">
              <h3>Recent Activity</h3>
              <button onClick={() => notify("Showing all recent activity")}>View all</button>
            </div>
            {[
              { initials: "PV", name: "Priya Verma", text: <>moved <b>TSK-045</b> to In Progress</>, time: "30 May 2025, 03:20 PM" },
              { initials: "MS", name: "Mayank Swaroop", text: <>completed <b>TSK-001</b></>, time: "30 May 2025, 02:45 PM" },
              { initials: "SP", name: "Sneha Patel", text: <>added a comment on <b>TSK-022</b></>, time: "30 May 2025, 01:15 PM" },
            ].map((item, index) => (
              <div className="kb-activity-item" key={index}>
                <Avatar initials={item.initials} />
                <div><p><b>{item.name}</b> {item.text}</p><small>{item.time}</small></div>
              </div>
            ))}
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
            <span className="kb-task-id">{selectedTask.id}</span>
            <h2>{selectedTask.title}</h2>
            <div className="kb-drawer-status">{selectedTask.status}</div>
            <div className="kb-drawer-row"><span>Assignee</span><b>{selectedTask.assignee}</b></div>
            <div className="kb-drawer-row"><span>Priority</span><PriorityText priority={selectedTask.priority} /></div>
            <div className="kb-drawer-row"><span>Due Date</span><b>{selectedTask.dueDate}</b></div>
            <div className="kb-drawer-row"><span>Estimated Hours</span><b>{selectedTask.hours}h</b></div>
            <div className="kb-drawer-row"><span>Story Points</span><b>{selectedTask.points} SP</b></div>
            <button className="kb-drawer-edit" onClick={() => router.push(`/tasks/${selectedTask.id}/edit`)}>
              Edit Task
            </button>
          </aside>
        </div>
      )}

      {toast && (
        <div className="kb-toast"><Check size={15} /> {toast} <button onClick={() => setToast("")}><X size={13} /></button></div>
      )}
    </main>
  );
}

function ClipboardIcon() {
  return <CalendarDays size={19} />;
}
