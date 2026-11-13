
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  Flag,
  Heart,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Upload,
  UserRound,
  Users,
  X,
  Zap,
  BarChart3,
  ListTodo,
} from "lucide-react";
import "./active-sprint.css";

type Task = {
  id: string;
  title: string;
  label: string;
  assignee: string;
  initials: string;
  points: number;
  progress: number;
};

type Issue = {
  id: string;
  title: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Progress";
  assignee: string;
};

const initialColumns: { id: string; title: string; color: string; tasks: Task[] }[] = [
  {
    id: "todo",
    title: "To Do",
    color: "gray",
    tasks: [
      { id: "TASK-246", title: "Profile Image Upload UI", label: "UI/UX", assignee: "Rahul Verma", initials: "RV", points: 0, progress: 0 },
      { id: "TASK-250", title: "Profile Visibility Settings", label: "Feature", assignee: "Pooja Singh", initials: "PS", points: 0, progress: 0 },
      { id: "TASK-251", title: "Profile Activity Log", label: "Feature", assignee: "Vikram Singh", initials: "VS", points: 0, progress: 0 },
    ],
  },
  {
    id: "progress",
    title: "In Progress",
    color: "blue",
    tasks: [
      { id: "TASK-242", title: "Edit Profile API", label: "Backend", assignee: "Amit Kumar", initials: "AK", points: 5, progress: 60 },
      { id: "TASK-243", title: "Profile Search & Filter", label: "Backend", assignee: "Vikram Singh", initials: "VS", points: 3, progress: 55 },
      { id: "TASK-244", title: "Unit Tests for Profile API", label: "Testing", assignee: "Pooja Singh", initials: "PS", points: 2, progress: 40 },
    ],
  },
  {
    id: "review",
    title: "In Review",
    color: "orange",
    tasks: [
      { id: "TASK-238", title: "Medical History Section", label: "Feature", assignee: "Neha Patel", initials: "NP", points: 8, progress: 85 },
      { id: "TASK-239", title: "Allergy Information Module", label: "Feature", assignee: "Rahul Verma", initials: "RV", points: 0, progress: 100 },
    ],
  },
  {
    id: "testing",
    title: "Testing",
    color: "purple",
    tasks: [
      { id: "TASK-240", title: "Profile Data Validation", label: "Testing", assignee: "Pooja Singh", initials: "PS", points: 2, progress: 75 },
      { id: "TASK-241", title: "Cross Browser Testing", label: "Testing", assignee: "Vikram Singh", initials: "VS", points: 3, progress: 65 },
    ],
  },
  {
    id: "done",
    title: "Done",
    color: "green",
    tasks: [
      { id: "TASK-232", title: "Profile Basic Information", label: "Feature", assignee: "Neha Patel", initials: "NP", points: 5, progress: 100 },
      { id: "TASK-233", title: "Contact Information", label: "Feature", assignee: "Amit Kumar", initials: "AK", points: 3, progress: 100 },
      { id: "TASK-254", title: "Profile UI Layout", label: "UI/UX", assignee: "Rahul Verma", initials: "RV", points: 2, progress: 100 },
    ],
  },
];

const teamMembers = [
  { name: "Neha Patel", role: "Tech Lead", utilization: 96, initials: "NP" },
  { name: "Amit Kumar", role: "Developer", utilization: 90, initials: "AK" },
  { name: "Rahul Verma", role: "Developer", utilization: 95, initials: "RV" },
  { name: "Pooja Singh", role: "QA Engineer", utilization: 85, initials: "PS" },
  { name: "Vikram Singh", role: "UI/UX Designer", utilization: 95, initials: "VS" },
];

const initialIssues: Issue[] = [
  { id: "ISS-014", title: "Image upload failing on Safari", priority: "High", status: "Open", assignee: "Rahul Verma" },
  { id: "ISS-013", title: "Search filter not working", priority: "High", status: "In Progress", assignee: "Vikram Singh" },
  { id: "ISS-012", title: "Data validation error", priority: "Medium", status: "Open", assignee: "Pooja Singh" },
  { id: "ISS-011", title: "API timeout on large data", priority: "Medium", status: "Open", assignee: "Amit Kumar" },
  { id: "ISS-010", title: "UI alignment issue in mobile", priority: "Low", status: "In Progress", assignee: "Rahul Verma" },
];

const deadlines = [
  { id: "TASK-242", title: "Edit Profile API", date: "02 Jun 2025", owner: "Amit Kumar" },
  { id: "TASK-243", title: "Profile Search & Filter", date: "03 Jun 2025", owner: "Vikram Singh" },
  { id: "TASK-244", title: "Unit Tests for Profile API", date: "03 Jun 2025", owner: "Pooja Singh" },
  { id: "TASK-246", title: "Profile Image Upload UI", date: "04 Jun 2025", owner: "Rahul Verma" },
  { id: "TASK-250", title: "Profile Visibility Settings", date: "05 Jun 2025", owner: "Pooja Singh" },
];

const activityItems = [
  { color: "blue", date: "31 May 2025, 11:20 AM", text: "TASK-242 marked In Progress by Amit Kumar" },
  { color: "green", date: "31 May 2025, 10:45 AM", text: "8 SP completed by Neha Patel" },
  { color: "orange", date: "31 May 2025, 09:30 AM", text: "New issue ISS-014 created by Pooja Singh" },
  { color: "purple", date: "30 May 2025, 06:15 PM", text: "TASK-238 moved to In Review by Neha Patel" },
  { color: "blue", date: "30 May 2025, 04:20 PM", text: "Sprint progress recalculated" },
];

const tabs = ["Overview", "Backlog (10)", "Kanban Board", "Burndown Chart", "Task List", "Issues (5)", "Files", "Logs"];

function Panel({
  title,
  children,
  action,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`as-panel ${className}`}>
      <div className="as-panel-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`as-badge as-${tone.toLowerCase().replaceAll(" ", "-")}`}>{children}</span>;
}

function Donut({
  value,
  total,
  color,
  restColor = "#aeb8cc",
}: {
  value: number;
  total: number;
  color: string;
  restColor?: string;
}) {
  const percent = total ? (value / total) * 100 : 0;
  return (
    <div className="as-donut" style={{ background: `conic-gradient(${color} 0 ${percent}%, ${restColor} ${percent}% 100%)` }}>
      <div>
        <strong>{value}</strong>
        <span>{total === 38 ? "Total SP" : "Total"}</span>
      </div>
    </div>
  );
}

function BurndownChart() {
  const actual = [39, 35, 31, 27, 24, 22, 19, 16, 15, 15, 12];
  const ideal = [40, 36, 32, 28, 24, 20, 16, 12, 8, 4, 0];
  const width = 430;
  const height = 160;
  const x = (index: number) => 25 + (index / 10) * 380;
  const y = (value: number) => 12 + ((40 - value) / 40) * 128;
  const actualPoints = actual.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  const idealPoints = ideal.map((value, index) => `${x(index)},${y(value)}`).join(" ");

  return (
    <div className="as-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="as-burndown-svg" role="img" aria-label="Sprint burndown chart">
        {[0, 10, 20, 30, 40].map((tick) => (
          <g key={tick}>
            <line x1="25" y1={y(tick)} x2="405" y2={y(tick)} stroke="#e9eef6" strokeWidth="1" />
            <text x="14" y={y(tick) + 3} fontSize="8" textAnchor="end" fill="#33466e">{tick}</text>
          </g>
        ))}
        <polyline points={idealPoints} fill="none" stroke="#0754f9" strokeWidth="1.7" strokeDasharray="4 4" />
        <polyline points={actualPoints} fill="none" stroke="#078b53" strokeWidth="2" />
        {actual.map((value, index) => (
          <circle key={index} cx={x(index)} cy={y(value)} r="2.5" fill="#078b53" />
        ))}
        <line x1={x(6)} y1="5" x2={x(6)} y2="145" stroke="#9bb9ff" strokeDasharray="3 3" />
        <rect x={x(6) + 5} y="9" width="76" height="12" rx="2" fill="#edf3ff" />
        <text x={x(6) + 10} y="17" fontSize="7" fill="#0754f9">Today</text>
        {["26 May", "28 May", "30 May", "01 Jun", "03 Jun", "05 Jun", "07 Jun", "08 Jun"].map((label, index) => (
          <text key={label} x={25 + index * (380 / 7)} y="155" fontSize="7" textAnchor="middle" fill="#33466e">{label}</text>
        ))}
      </svg>
      <div className="as-chart-tooltip">
        <strong>31 May (Day 6)</strong>
        <span>Ideal: 21 SP</span>
        <span>Actual: 28 SP</span>
        <span>Remaining: 7 SP</span>
      </div>
    </div>
  );
}

export default function ActiveSprint({ sprintId }: { sprintId: string }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [columns, setColumns] = useState(initialColumns);
  const [issues, setIssues] = useState(initialIssues);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [showAllDeadlines, setShowAllDeadlines] = useState(false);
  const [showAllTeam, setShowAllTeam] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("Amit Kumar");
  const [taskColumn, setTaskColumn] = useState("todo");
  const [taskPoints, setTaskPoints] = useState("3");
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueAssignee, setIssueAssignee] = useState("Rahul Verma");
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [goal, setGoal] = useState("Deliver the Patient Profile management module that allows patients to view and update their profile information, medical history, allergies and preferences.");
  const [toast, setToast] = useState("");
  const [showMoreActions, setShowMoreActions] = useState(false);

  const allTasks = useMemo(() => columns.flatMap((column) => column.tasks), [columns]);
  const doneCount = columns.find((column) => column.id === "done")?.tasks.length ?? 0;
  const totalTasks = allTasks.length + 8;
  const openIssueCount = issues.length;
  const completedPoints = 28;
  const totalPoints = 38;

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const addTask = () => {
    if (!taskTitle.trim()) {
      notify("Please enter a task title.");
      return;
    }
    const member = teamMembers.find((person) => person.name === taskAssignee);
    const newTask: Task = {
      id: `TASK-${Math.floor(260 + Math.random() * 700)}`,
      title: taskTitle.trim(),
      label: "Feature",
      assignee: taskAssignee,
      initials: member?.initials ?? "TM",
      points: Number(taskPoints) || 0,
      progress: 0,
    };
    setColumns((current) => current.map((column) => column.id === taskColumn ? { ...column, tasks: [...column.tasks, newTask] } : column));
    setTaskTitle("");
    setShowTaskForm(false);
    notify("Task added to the selected Kanban column.");
  };

  const addIssue = () => {
    if (!issueTitle.trim()) {
      notify("Please enter an issue title.");
      return;
    }
    setIssues((current) => [
      ...current,
      {
        id: `ISS-${String(15 + current.length).padStart(3, "0")}`,
        title: issueTitle.trim(),
        priority: "Medium",
        status: "Open",
        assignee: issueAssignee,
      },
    ]);
    setIssueTitle("");
    setShowIssueForm(false);
    notify("Issue created.");
  };

  const moveTask = (taskId: string, direction: "next" | "previous") => {
    const order = ["todo", "progress", "review", "testing", "done"];
    setColumns((current) => {
      const sourceIndex = current.findIndex((column) => column.tasks.some((task) => task.id === taskId));
      if (sourceIndex < 0) return current;
      const destinationIndex = sourceIndex + (direction === "next" ? 1 : -1);
      if (destinationIndex < 0 || destinationIndex >= order.length) return current;
      const source = current[sourceIndex];
      const destination = current[destinationIndex];
      const task = source.tasks.find((item) => item.id === taskId);
      if (!task) return current;
      return current.map((column, index) => {
        if (index === sourceIndex) return { ...column, tasks: column.tasks.filter((item) => item.id !== taskId) };
        if (index === destinationIndex) return { ...column, tasks: [...column.tasks, task] };
        return column;
      });
    });
    notify(`Task ${taskId} moved.`);
  };

  const completeSprint = () => notify("Sprint completion requires confirmation and a backend API connection.");
  const endSprint = () => {
    if (window.confirm("Are you sure you want to end this sprint?")) {
      notify("End Sprint action is ready for backend integration.");
    }
  };

  const renderKanban = () => (
    <div className="as-kanban">
      {columns.map((column) => (
        <div className={`as-kanban-column as-column-${column.color}`} key={column.id}>
          <div className="as-kanban-head">
            <strong>{column.title} ({column.tasks.length})</strong>
            <button onClick={() => { setTaskColumn(column.id); setShowTaskForm(true); }} aria-label={`Add task to ${column.title}`}><MoreHorizontal size={14} /></button>
          </div>
          <div className="as-kanban-cards">
            {column.tasks.map((task) => (
              <article className="as-task-card" key={task.id}>
                <div className="as-task-card-top">
                  <span>{task.id}</span>
                  {column.id === "done" && <CheckCircle2 size={12} className="as-done-icon" />}
                </div>
                <strong>{task.title}</strong>
                <div className="as-task-card-meta">
                  <Badge tone="purple">{task.label}</Badge>
                  {task.points > 0 && <span>{task.points} SP</span>}
                </div>
                {task.progress > 0 && (
                  <div className="as-task-progress-row">
                    <span className="as-progress-track"><span style={{ width: `${task.progress}%` }} /></span>
                    <small>{task.progress === 100 ? "100%" : ""}</small>
                  </div>
                )}
                <div className="as-task-card-bottom">
                  <span><UserRound size={10} /> {task.assignee}</span>
                  <span className="as-avatar">{task.initials}</span>
                </div>
                <div className="as-task-move">
                  {column.id !== "todo" && <button onClick={() => moveTask(task.id, "previous")}>← Move back</button>}
                  {column.id !== "done" && <button onClick={() => moveTask(task.id, "next")}>Move next →</button>}
                </div>
              </article>
            ))}
          </div>
          <button className="as-add-task" onClick={() => { setTaskColumn(column.id); setShowTaskForm(true); }}><Plus size={12} /> Add Task</button>
        </div>
      ))}
    </div>
  );

  const renderIssues = () => (
    <Panel title="Sprint Issues" action={<button className="as-outline-button" onClick={() => setShowIssueForm(true)}><Plus size={12} /> Create Issue</button>}>
      <div className="as-table-wrap">
        <table className="as-table">
          <thead><tr><th>ID</th><th>Title</th><th>Priority</th><th>Status</th><th>Assignee</th></tr></thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.id}>
                <td className="as-link">{issue.id}</td>
                <td>{issue.title}</td>
                <td><Badge tone={issue.priority}>{issue.priority}</Badge></td>
                <td><Badge tone={issue.status}>{issue.status}</Badge></td>
                <td>{issue.assignee}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );

  const renderTaskList = () => (
    <Panel title="Sprint Task List" action={<button className="as-outline-button" onClick={() => setShowTaskForm(true)}><Plus size={12} /> Add Task</button>}>
      <div className="as-table-wrap">
        <table className="as-table">
          <thead><tr><th>Task ID</th><th>Task Title</th><th>Column</th><th>Assignee</th><th>Story Points</th><th>Progress</th></tr></thead>
          <tbody>
            {columns.flatMap((column) => column.tasks.map((task) => (
              <tr key={task.id}>
                <td className="as-link">{task.id}</td>
                <td>{task.title}</td>
                <td>{column.title}</td>
                <td>{task.assignee}</td>
                <td>{task.points} SP</td>
                <td>{task.progress}%</td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </Panel>
  );

  const renderBacklog = () => (
    <Panel title="Sprint Backlog">
      <div className="as-table-wrap">
        <table className="as-table">
          <thead><tr><th>Task ID</th><th>Task Title</th><th>Status</th><th>Assignee</th><th>Story Points</th></tr></thead>
          <tbody>{columns.flatMap((column) => column.tasks.map((task) => (
            <tr key={task.id}><td className="as-link">{task.id}</td><td>{task.title}</td><td><Badge tone={column.color}>{column.title}</Badge></td><td>{task.assignee}</td><td>{task.points} SP</td></tr>
          )))}</tbody>
        </table>
      </div>
    </Panel>
  );

  const renderFiles = () => (
    <Panel title="Sprint Files" action={<button className="as-outline-button" onClick={() => notify("Connect your file upload API to upload sprint documents.")}><Upload size={12} /> Upload File</button>}>
      <div className="as-empty-state"><FileText size={30} /><strong>No files uploaded yet</strong><span>Upload sprint documents, designs, and supporting files here.</span></div>
    </Panel>
  );

  const renderLogs = () => (
    <Panel title="Sprint Activity Logs">
      <div className="as-activity-list">
        {activityItems.map((item, index) => (
          <div className="as-activity-item" key={index}>
            <i className={`as-activity-dot ${item.color}`} />
            <div><strong>{item.date}</strong><span>{item.text}</span></div>
          </div>
        ))}
      </div>
    </Panel>
  );

  return (
    <main className="active-sprint-page">
      <div className="as-toolbar">
        <nav className="as-breadcrumb">
          <Link href="/sprints">Sprint Management</Link>
          <ChevronRight size={13} />
          <Link href="/sprints">Sprint Registry</Link>
          <ChevronRight size={13} />
          <strong>Active Sprint ({sprintId.toUpperCase()})</strong>
        </nav>
        <div className="as-actions">
          <button onClick={completeSprint}><CheckCircle2 size={12} /> Complete Sprint</button>
          <button className="as-end-button" onClick={endSprint}><AlertCircle size={12} /> End Sprint</button>
          <button className="as-primary-button" onClick={() => setShowTaskForm(true)}><Plus size={12} /> Create Task</button>
          <div className="as-more-wrap">
            <button onClick={() => setShowMoreActions((value) => !value)}>More Actions <ChevronDown size={12} /></button>
            {showMoreActions && (
              <div className="as-more-menu">
                <button onClick={() => { setActiveTab("Logs"); setShowMoreActions(false); }}>View Activity Logs</button>
                <button onClick={() => { setActiveTab("Files"); setShowMoreActions(false); }}>Manage Files</button>
                <button onClick={() => { notify("Sprint report export requires report API integration."); setShowMoreActions(false); }}>Export Sprint Report</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="as-title">
        <FileText size={25} />
        <div>
          <h1>Active Sprint ({sprintId.toUpperCase()}) <Badge tone="success">In Progress</Badge></h1>
          <strong>Patient Profile Sprint</strong>
          <p><CalendarDays size={12} /> 26 May 2025 – 08 Jun 2025 (14 Days) <Badge tone="blue">Day 6 of 14</Badge></p>
        </div>
      </div>

      <div className="as-layout">
        <div className="as-main">
          <section className="as-metrics">
            <div className="as-metric as-progress-metric">
              <div className="as-metric-donut"><Donut value={42} total={100} color="#078b53" /></div>
              <div><label>Sprint Progress</label><strong>6 / 14 Days</strong><span>26 May – 08 Jun 2025</span><div className="as-meter"><i style={{ width: "42%" }} /></div><small>Time Elapsed</small></div>
            </div>
            <div className="as-metric">
              <label>Story Points</label><strong>28 / 38 SP</strong><span>Completed / Total</span><div className="as-meter"><i style={{ width: "74%" }} /></div>
            </div>
            <div className="as-metric">
              <label>Tasks</label><strong>16 / 24</strong><span>Completed / Total</span><div className="as-meter"><i style={{ width: "67%" }} /></div>
            </div>
            <div className="as-metric">
              <label className="orange-text">Open Issues</label><strong>{openIssueCount}</strong><span><b className="red-text">3 High</b> | <b className="orange-text">2 Medium</b></span>
            </div>
            <div className="as-metric">
              <label>Team Capacity</label><strong>92%</strong><span>Utilization</span><div className="as-meter blue-meter"><i style={{ width: "92%" }} /></div>
            </div>
            <div className="as-metric as-health">
              <label className="green-text">Sprint Health</label>
              <div className="as-health-value"><Heart size={19} /><strong>Good</strong></div>
              <span>On Track</span>
            </div>
          </section>

          <nav className="as-tabs">
            {tabs.map((tab) => (
              <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>
            ))}
          </nav>

          {activeTab === "Overview" && (
            <>
              <section className="as-chart-grid">
                <Panel title="Burndown Chart" action={<select aria-label="Chart metric"><option>Story Points</option><option>Tasks</option></select>}>
                  <BurndownChart />
                  <div className="as-chart-legend"><span><i className="green" /> Actual</span><span><i className="blue dashed" /> Ideal</span></div>
                </Panel>
                <Panel title="Sprint Progress Distribution">
                  <div className="as-distribution">
                    <Donut value={38} total={38} color="#078b53" />
                    <div className="as-legend-list">
                      <div><i className="green" /><span>Completed</span><strong>28 SP (73.68%)</strong></div>
                      <div><i className="blue" /><span>In Progress</span><strong>6 SP (15.79%)</strong></div>
                      <div><i className="gray" /><span>To Do</span><strong>4 SP (10.53%)</strong></div>
                    </div>
                  </div>
                </Panel>
                <Panel title="Tasks by Status">
                  <div className="as-distribution">
                    <Donut value={24} total={24} color="#078b53" />
                    <div className="as-legend-list">
                      <div><i className="green" /><span>Done</span><strong>16 (66.67%)</strong></div>
                      <div><i className="blue" /><span>In Progress</span><strong>5 (20.83%)</strong></div>
                      <div><i className="gray" /><span>To Do</span><strong>3 (12.50%)</strong></div>
                    </div>
                  </div>
                </Panel>
              </section>

              <Panel title="Kanban Board" className="as-kanban-panel">
                {renderKanban()}
              </Panel>

              <section className="as-bottom-grid">
                <Panel title="Top Open Issues" action={<button className="as-text-button" onClick={() => setActiveTab("Issues (5)")}>View All</button>}>
                  <div className="as-table-wrap">
                    <table className="as-table">
                      <thead><tr><th>ID</th><th>Title</th><th>Priority</th><th>Status</th><th>Assignee</th></tr></thead>
                      <tbody>{issues.slice(0, 5).map((issue) => (
                        <tr key={issue.id}><td className="as-link">{issue.id}</td><td>{issue.title}</td><td><Badge tone={issue.priority}>{issue.priority}</Badge></td><td><Badge tone={issue.status}>{issue.status}</Badge></td><td>{issue.assignee}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                </Panel>
                <Panel title="Upcoming Deadlines" action={<button className="as-text-button" onClick={() => setShowAllDeadlines((value) => !value)}>{showAllDeadlines ? "Show Less" : "View All"}</button>}>
                  <div className="as-table-wrap">
                    <table className="as-table">
                      <thead><tr><th>Task ID</th><th>Title</th><th>Due Date</th><th>Assignee</th></tr></thead>
                      <tbody>{(showAllDeadlines ? deadlines : deadlines.slice(0, 5)).map((item) => (
                        <tr key={item.id}><td className="as-link">{item.id}</td><td>{item.title}</td><td>{item.date}</td><td>{item.owner}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                </Panel>
                <Panel title="Sprint Goal" action={<button className="as-text-button" onClick={() => setShowGoalEdit((value) => !value)}>{showGoalEdit ? "Close" : "Edit"}</button>}>
                  {showGoalEdit ? (
                    <div className="as-goal-editor">
                      <textarea value={goal} onChange={(event) => setGoal(event.target.value)} />
                      <button className="as-primary-button" onClick={() => { setShowGoalEdit(false); notify("Sprint goal updated locally."); }}>Save Goal</button>
                    </div>
                  ) : <p className="as-goal-text">{goal}</p>}
                  <strong className="as-definition-title">Definition of Done</strong>
                  <ul className="as-done-list">
                    <li><CheckCircle2 /> Code complete & reviewed</li>
                    <li><CheckCircle2 /> Unit tests written & passed</li>
                    <li><CheckCircle2 /> QA testing passed</li>
                    <li><CheckCircle2 /> Documentation updated</li>
                    <li><CheckCircle2 /> Product Owner approval</li>
                  </ul>
                </Panel>
              </section>
            </>
          )}

          {activeTab === "Kanban Board" && <Panel title="Sprint Kanban Board">{renderKanban()}</Panel>}
          {activeTab === "Backlog (10)" && renderBacklog()}
          {activeTab === "Task List" && renderTaskList()}
          {activeTab === "Issues (5)" && renderIssues()}
          {activeTab === "Burndown Chart" && <Panel title="Sprint Burndown Chart"><BurndownChart /></Panel>}
          {activeTab === "Files" && renderFiles()}
          {activeTab === "Logs" && renderLogs()}
        </div>

        <aside className="as-sidebar">
          <Panel title="Sprint Details" action={<button className="as-icon-button" onClick={() => notify("Connect sprint details edit form/API here.")}><Pencil size={13} /></button>}>
            <div className="as-detail-list">
              <div><span>Sprint Code</span><strong>{sprintId.toUpperCase()}</strong></div>
              <div><span>Sprint Name</span><strong>Patient Profile Sprint</strong></div>
              <div><span>Milestone</span><strong>MLS-002 - Module Development</strong></div>
              <div><span>Sprint Type</span><strong>Development</strong></div>
              <div><span>Priority</span><strong><i className="as-priority-dot" /> High</strong></div>
              <div><span>Sprint Owner</span><strong><span className="as-avatar">NP</span> Neha Patel</strong></div>
              <div><span>Working Days</span><strong>10 Days</strong></div>
              <div><span>Total Story Points</span><strong>38 SP</strong></div>
              <div><span>Committed</span><strong>35 SP (92.10%)</strong></div>
              <div><span>Start Date</span><strong>26 May 2025</strong></div>
              <div><span>End Date</span><strong>08 Jun 2025</strong></div>
              <div><span>Status</span><strong><Badge tone="success">In Progress</Badge></strong></div>
            </div>
          </Panel>

          <Panel title={`Team Members (${teamMembers.length})`} action={<button className="as-text-button" onClick={() => setShowAllTeam((value) => !value)}>{showAllTeam ? "Show Less" : "View All"}</button>}>
            <div className="as-table-wrap">
              <table className="as-table as-team-table">
                <thead><tr><th>Member</th><th>Role</th><th>Capacity</th><th>Utilization</th></tr></thead>
                <tbody>{(showAllTeam ? teamMembers : teamMembers.slice(0, 5)).map((member) => (
                  <tr key={member.name}>
                    <td><span className="as-person"><span className="as-avatar">{member.initials}</span>{member.name}</span></td>
                    <td>{member.role}</td>
                    <td>100%</td>
                    <td><span className="as-util"><i><b style={{ width: `${member.utilization}%` }} /></i>{member.utilization}%</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="as-average"><span>Average Utilization</span><strong>92%</strong></div>
          </Panel>

          <Panel title="Recent Activity" action={<button className="as-text-button" onClick={() => setShowAllActivity((value) => !value)}>{showAllActivity ? "Show Less" : "View All"}</button>}>
            <div className="as-activity-list">
              {(showAllActivity ? activityItems : activityItems.slice(0, 4)).map((item, index) => (
                <div className="as-activity-item" key={index}>
                  <i className={`as-activity-dot ${item.color}`} />
                  <div><strong>{item.date}</strong><span>{item.text}</span></div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Quick Actions">
            <div className="as-quick-actions">
              <button onClick={() => notify("Daily Standup action: connect your standup module.")}><CalendarDays />Daily Standup</button>
              <button onClick={() => setShowTaskForm(true)}><Plus />Add Task</button>
              <button onClick={() => notify("Log Time action: connect your timesheet module.")}><Clock3 />Log Time</button>
              <button onClick={() => setShowIssueForm(true)}><AlertCircle />Create Issue</button>
              <button onClick={() => setActiveTab("Files")}><Upload />Upload File</button>
              <button onClick={() => notify("Sprint report generation requires report API integration.")}><BarChart3 />Sprint Report</button>
            </div>
          </Panel>
        </aside>
      </div>

      {showTaskForm && (
        <div className="as-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowTaskForm(false); }}>
          <div className="as-modal">
            <div className="as-modal-head"><h3>Create Sprint Task</h3><button onClick={() => setShowTaskForm(false)}><X size={17} /></button></div>
            <label>Task Title<input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Enter task title" autoFocus /></label>
            <label>Assignee<select value={taskAssignee} onChange={(event) => setTaskAssignee(event.target.value)}>{teamMembers.map((member) => <option key={member.name}>{member.name}</option>)}</select></label>
            <label>Kanban Status<select value={taskColumn} onChange={(event) => setTaskColumn(event.target.value)}>{columns.map((column) => <option key={column.id} value={column.id}>{column.title}</option>)}</select></label>
            <label>Story Points<input type="number" min="0" max="100" value={taskPoints} onChange={(event) => setTaskPoints(event.target.value)} /></label>
            <div className="as-modal-actions"><button onClick={() => setShowTaskForm(false)}>Cancel</button><button className="as-primary-button" onClick={addTask}>Create Task</button></div>
          </div>
        </div>
      )}

      {showIssueForm && (
        <div className="as-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowIssueForm(false); }}>
          <div className="as-modal">
            <div className="as-modal-head"><h3>Create Sprint Issue</h3><button onClick={() => setShowIssueForm(false)}><X size={17} /></button></div>
            <label>Issue Title<input value={issueTitle} onChange={(event) => setIssueTitle(event.target.value)} placeholder="Describe the issue" autoFocus /></label>
            <label>Assignee<select value={issueAssignee} onChange={(event) => setIssueAssignee(event.target.value)}>{teamMembers.map((member) => <option key={member.name}>{member.name}</option>)}</select></label>
            <div className="as-modal-actions"><button onClick={() => setShowIssueForm(false)}>Cancel</button><button className="as-primary-button" onClick={addIssue}>Create Issue</button></div>
          </div>
        </div>
      )}

      {toast && <div className="as-toast"><CheckCircle2 size={15} />{toast}<button onClick={() => setToast("")}><X size={13} /></button></div>}
    </main>
  );
}
