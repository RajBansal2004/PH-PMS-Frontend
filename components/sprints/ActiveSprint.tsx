"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import {
  tasks as getTasks,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  employees as getEmployees,
  sprints as getSprints,
  updateSprint as apiUpdateSprint,
  getBugs,
  getOrganizationAudit,
} from "@/lib/api";
import "./active-sprint.css";

type Task = {
  id: string;
  backendId?: string;
  title: string;
  label: string;
  assignee: string;
  assigneeId?: string;
  initials: string;
  points: number;
  progress: number;
  status: string;
};

type Issue = {
  id: string;
  title: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Resolved";
  assignee: string;
};

type TeamMember = {
  id: string;
  name: string;
  role: string;
  initials: string;
  tasksCount: number;
  utilization: number;
};

const columnDefs = [
  { id: "todo", title: "To Do", color: "gray", matchStatuses: ["TODO", "To Do", "Open", "Draft"] },
  { id: "progress", title: "In Progress", color: "blue", matchStatuses: ["IN_PROGRESS", "In Progress", "Progress"] },
  { id: "review", title: "In Review", color: "orange", matchStatuses: ["IN_REVIEW", "In Review", "Review"] },
  { id: "testing", title: "Testing", color: "purple", matchStatuses: ["TESTING", "Testing", "QA"] },
  { id: "done", title: "Done", color: "green", matchStatuses: ["DONE", "Done", "Completed", "COMPLETED"] },
];

const tabs = ["Overview", "Backlog", "Kanban Board", "Burndown Chart", "Task List", "Issues", "Files", "Logs"];

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
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="as-donut" style={{ background: `conic-gradient(${color} 0 ${percent}%, ${restColor} ${percent}% 100%)` }}>
      <div>
        <strong>{value}</strong>
        <span>{total > 0 ? `of ${total}` : "Total"}</span>
      </div>
    </div>
  );
}

function BurndownChart({ totalPoints, completedPoints }: { totalPoints: number; completedPoints: number }) {
  if (totalPoints === 0) {
    return (
      <div className="as-chart-wrap" style={{ textAlign: "center", padding: "40px 10px", color: "#6b7280" }}>
        <BarChart3 size={32} style={{ margin: "0 auto 8px auto", opacity: 0.5 }} />
        <p>No story points recorded yet for this sprint.</p>
        <small>Add tasks with story points to view real burndown progression.</small>
      </div>
    );
  }

  const width = 430;
  const height = 160;
  const remaining = Math.max(0, totalPoints - completedPoints);
  const x = (index: number) => 25 + (index / 4) * 380;
  const y = (val: number) => 12 + ((totalPoints - Math.min(totalPoints, Math.max(0, val))) / (totalPoints || 1)) * 128;

  const idealPoints = [0, 1, 2, 3, 4].map((i) => `${x(i)},${y(totalPoints - (totalPoints / 4) * i)}`).join(" ");
  const actualPoints = `${x(0)},${y(totalPoints)} ${x(2)},${y(remaining)}`;

  return (
    <div className="as-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="as-burndown-svg" role="img" aria-label="Sprint burndown chart">
        {[0, Math.round(totalPoints / 2), totalPoints].map((tick) => (
          <g key={tick}>
            <line x1="25" y1={y(tick)} x2="405" y2={y(tick)} stroke="#e9eef6" strokeWidth="1" />
            <text x="14" y={y(tick) + 3} fontSize="8" textAnchor="end" fill="#33466e">{tick} SP</text>
          </g>
        ))}
        <polyline points={idealPoints} fill="none" stroke="#0754f9" strokeWidth="1.7" strokeDasharray="4 4" />
        <polyline points={actualPoints} fill="none" stroke="#078b53" strokeWidth="2" />
        <circle cx={x(0)} cy={y(totalPoints)} r="3" fill="#078b53" />
        <circle cx={x(2)} cy={y(remaining)} r="3" fill="#078b53" />
      </svg>
      <div className="as-chart-tooltip">
        <strong>Sprint Burndown</strong>
        <span>Total: {totalPoints} SP</span>
        <span>Completed: {completedPoints} SP</span>
        <span>Remaining: {remaining} SP</span>
      </div>
    </div>
  );
}

export default function ActiveSprint({ sprintId }: { sprintId: string }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [sprint, setSprint] = useState<any>(null);
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activityItems, setActivityItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [showAllDeadlines, setShowAllDeadlines] = useState(false);
  const [showAllTeam, setShowAllTeam] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskColumn, setTaskColumn] = useState("todo");
  const [taskPoints, setTaskPoints] = useState("3");
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueAssignee, setIssueAssignee] = useState("");
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [goal, setGoal] = useState("");
  const [toast, setToast] = useState("");
  const [showMoreActions, setShowMoreActions] = useState(false);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  };

  const getInitials = (name: string) => {
    if (!name) return "TM";
    return name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const loadSprintData = async () => {
    try {
      setLoading(true);
      const [sRes, tRes, eRes, bRes, aRes] = await Promise.allSettled([
        getSprints(),
        getTasks(),
        getEmployees(),
        getBugs().catch(() => ({ data: [] })),
        getOrganizationAudit({ limit: 15 }).catch(() => ({ data: [] })),
      ]);

      let targetSprint: any = null;
      if (sRes.status === "fulfilled") {
        const rawList = Array.isArray(sRes.value) ? sRes.value : sRes.value?.data || sRes.value?.items || [];
        targetSprint = rawList.find(
          (s: any) =>
            s._id === sprintId ||
            s.id === sprintId ||
            (s.sprintCode && s.sprintCode.toLowerCase() === sprintId.toLowerCase()) ||
            (s.code && s.code.toLowerCase() === sprintId.toLowerCase())
        ) || rawList[0] || null;

        if (targetSprint) {
          setSprint(targetSprint);
          setGoal(targetSprint.goal || targetSprint.description || "");
        }
      }

      // Employees
      let members: TeamMember[] = [];
      if (eRes.status === "fulfilled") {
        const rawEmployees = Array.isArray(eRes.value) ? eRes.value : eRes.value?.data || eRes.value?.items || [];
        members = rawEmployees.map((emp: any) => {
          const empName = emp.name || emp.fullName || [emp.firstName, emp.lastName].filter(Boolean).join(" ") || "Employee";
          return {
            id: emp._id || emp.id,
            name: empName,
            role: emp.designation?.name || emp.designation || emp.role || "Team Member",
            initials: getInitials(empName),
            tasksCount: 0,
            utilization: 0,
          };
        });
        setTeamMembers(members);
        if (members.length > 0 && !taskAssignee) {
          setTaskAssignee(members[0].name);
          setIssueAssignee(members[0].name);
        }
      }

      // Tasks
      if (tRes.status === "fulfilled") {
        const rawTasks = Array.isArray(tRes.value) ? tRes.value : tRes.value?.data || tRes.value?.items || [];
        const sprintKey = targetSprint?._id || sprintId;
        const filteredTasks = rawTasks.filter((t: any) => {
          if (!targetSprint) return true;
          return t.sprintId === sprintKey || t.sprintId?._id === sprintKey || t.sprint === sprintKey;
        });

        const mapped: Task[] = (filteredTasks.length > 0 ? filteredTasks : rawTasks.slice(0, 15)).map((t: any) => {
          const assigneeName = t.assigneeId?.name || t.assignee?.name || t.assigneeName || "Unassigned";
          return {
            id: t.taskId || t.code || `TSK-${String(t._id || t.id).slice(-4).toUpperCase()}`,
            backendId: t._id || t.id,
            title: t.title || "Untitled Task",
            label: t.type || "Feature",
            assignee: assigneeName,
            assigneeId: t.assigneeId?._id || t.assigneeId,
            initials: getInitials(assigneeName),
            points: Number(t.estimatedHours ? Math.round(t.estimatedHours / 4) : t.storyPoints || 3),
            progress: t.status === "Completed" || t.status === "Done" || t.status === "COMPLETED" ? 100 : t.progress || 0,
            status: t.status || "Open",
          };
        });
        setTasksList(mapped);
      }

      // Bugs / Issues
      if (bRes.status === "fulfilled") {
        const rawBugs: any = bRes.value;
        const rawBugsList = Array.isArray(rawBugs) ? rawBugs : rawBugs?.data || rawBugs?.items || [];
        const mappedIssues: Issue[] = rawBugsList.map((b: any) => ({
          id: b.bugId || b.code || `ISS-${String(b._id || b.id).slice(-3).toUpperCase()}`,
          title: b.title || "Issue",
          priority: (b.priority === "High" || b.priority === "Critical" ? "High" : b.priority === "Low" ? "Low" : "Medium") as "High" | "Medium" | "Low",
          status: (b.status === "Resolved" || b.status === "Closed" ? "Resolved" : b.status === "In Progress" ? "In Progress" : "Open") as "Open" | "In Progress" | "Resolved",
          assignee: b.assigneeId?.name || b.assignee?.name || "Unassigned",
        }));
        setIssues(mappedIssues);
      }

      // Audit logs
      if (aRes.status === "fulfilled") {
        const rawAudit: any = aRes.value;
        const mappedAudit = (Array.isArray(rawAudit) ? rawAudit : rawAudit?.data || rawAudit?.items || []).map((item: any) => ({
          date: item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "Today",
          text: `${item.performedByName || item.userName || "System"} ${item.action || "performed action"} on ${item.entityName || item.entityType || "Sprint"}`,
          color: item.action?.toLowerCase().includes("delete") ? "red" : "blue",
        }));
        setActivityItems(mappedAudit);
      }
    } catch (err: any) {
      notify(`Failed to fetch sprint details: ${err?.message || "Server error"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSprintData();
  }, [sprintId]);

  // Derived columns
  const columns = useMemo(() => {
    return columnDefs.map((def) => {
      const colTasks = tasksList.filter((t) => def.matchStatuses.some((st) => st.toLowerCase() === (t.status || "").toLowerCase()));
      return {
        id: def.id,
        title: def.title,
        color: def.color,
        tasks: colTasks,
      };
    });
  }, [tasksList]);

  const doneCount = columns.find((c) => c.id === "done")?.tasks.length ?? 0;
  const totalTasks = tasksList.length;
  const openIssueCount = issues.filter((i) => i.status !== "Resolved").length;
  const totalPoints = useMemo(() => tasksList.reduce((acc, t) => acc + (t.points || 0), 0), [tasksList]);
  const completedPoints = useMemo(() => {
    const doneCol = columns.find((c) => c.id === "done");
    return doneCol ? doneCol.tasks.reduce((acc, t) => acc + (t.points || 0), 0) : 0;
  }, [columns]);

  const addTask = async () => {
    if (!taskTitle.trim()) {
      notify("Please enter a task title.");
      return;
    }
    const member = teamMembers.find((p) => p.name === taskAssignee);
    const targetStatus = taskColumn === "done" ? "Completed" : taskColumn === "progress" ? "In Progress" : taskColumn === "review" ? "In Review" : "Open";

    try {
      const payload = {
        title: taskTitle.trim(),
        description: taskTitle.trim(),
        priority: "Medium",
        status: targetStatus,
        projectId: sprint?.projectId?._id || sprint?.projectId,
        milestoneId: sprint?.milestoneId?._id || sprint?.milestoneId,
        sprintId: sprint?._id || sprintId,
        assigneeId: member?.id,
        estimatedHours: (Number(taskPoints) || 3) * 4,
      };
      const created = await apiCreateTask(payload);
      const newTask: Task = {
        id: created?.taskId || `TSK-${Math.floor(100 + Math.random() * 900)}`,
        backendId: created?._id || created?.id,
        title: taskTitle.trim(),
        label: "Feature",
        assignee: taskAssignee || "Unassigned",
        initials: getInitials(taskAssignee),
        points: Number(taskPoints) || 3,
        progress: targetStatus === "Completed" ? 100 : 0,
        status: targetStatus,
      };
      setTasksList((prev) => [...prev, newTask]);
      setTaskTitle("");
      setShowTaskForm(false);
      notify("Task created and saved to sprint.");
    } catch (err: any) {
      notify(`Error creating task: ${err?.message || "Check fields and try again."}`);
    }
  };

  const addIssue = () => {
    if (!issueTitle.trim()) {
      notify("Please enter an issue title.");
      return;
    }
    setIssues((current) => [
      ...current,
      {
        id: `ISS-${String(10 + current.length + 1).padStart(3, "0")}`,
        title: issueTitle.trim(),
        priority: "Medium",
        status: "Open",
        assignee: issueAssignee || "Unassigned",
      },
    ]);
    setIssueTitle("");
    setShowIssueForm(false);
    notify("Issue recorded.");
  };

  const moveTask = async (taskId: string, direction: "next" | "previous") => {
    const colOrder = ["todo", "progress", "review", "testing", "done"];
    const statusMap: Record<string, string> = {
      todo: "Open",
      progress: "In Progress",
      review: "In Review",
      testing: "Testing",
      done: "Completed",
    };

    const task = tasksList.find((t) => t.id === taskId);
    if (!task) return;

    const currentColIndex = columns.findIndex((c) => c.tasks.some((t) => t.id === taskId));
    if (currentColIndex < 0) return;

    const nextColIndex = currentColIndex + (direction === "next" ? 1 : -1);
    if (nextColIndex < 0 || nextColIndex >= colOrder.length) return;

    const nextColId = colOrder[nextColIndex];
    const newStatus = statusMap[nextColId];

    try {
      if (task.backendId) {
        await apiUpdateTask(task.backendId, { status: newStatus });
      }
      setTasksList((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, progress: newStatus === "Completed" ? 100 : t.progress } : t))
      );
      notify(`Task ${taskId} moved to ${newStatus}.`);
    } catch (err: any) {
      notify(`Failed to update task: ${err?.message || "Server error"}`);
    }
  };

  const completeSprint = async () => {
    if (!window.confirm("Complete this sprint? All completed work will be finalized.")) return;
    try {
      if (sprint?._id) {
        await apiUpdateSprint(sprint._id, { status: "COMPLETED" });
      }
      notify("Sprint marked as Completed successfully.");
      loadSprintData();
    } catch (err: any) {
      notify(`Could not complete sprint: ${err?.message || "API error"}`);
    }
  };

  const endSprint = async () => {
    if (!window.confirm("Are you sure you want to end this sprint early?")) return;
    try {
      if (sprint?._id) {
        await apiUpdateSprint(sprint._id, { status: "CLOSED" });
      }
      notify("Sprint closed.");
      loadSprintData();
    } catch (err: any) {
      notify(`Could not close sprint: ${err?.message || "API error"}`);
    }
  };

  const saveSprintGoal = async () => {
    try {
      if (sprint?._id) {
        await apiUpdateSprint(sprint._id, { goal });
      }
      setShowGoalEdit(false);
      notify("Sprint goal updated successfully.");
    } catch (err: any) {
      notify(`Failed to update goal: ${err?.message || "API error"}`);
    }
  };

  const sprintName = sprint?.name || `Sprint ${sprintId}`;
  const sprintCode = sprint?.sprintCode || sprint?.code || sprintId.toUpperCase();
  const startDateStr = sprint?.startDate ? new Date(sprint.startDate).toLocaleDateString("en-IN") : "Not set";
  const endDateStr = sprint?.endDate ? new Date(sprint.endDate).toLocaleDateString("en-IN") : "Not set";
  const sprintStatus = sprint?.status || "In Progress";

  const renderKanban = () => (
    <div className="as-kanban">
      {columns.map((column) => (
        <div className={`as-kanban-column as-column-${column.color}`} key={column.id}>
          <div className="as-kanban-head">
            <strong>{column.title} ({column.tasks.length})</strong>
            <button onClick={() => { setTaskColumn(column.id); setShowTaskForm(true); }} aria-label={`Add task to ${column.title}`}><MoreHorizontal size={14} /></button>
          </div>
          <div className="as-kanban-cards">
            {column.tasks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 8px", color: "#9ca3af", fontSize: "12px" }}>
                No tasks
              </div>
            ) : (
              column.tasks.map((task) => (
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
                      <small>{task.progress}%</small>
                    </div>
                  )}
                  <div className="as-task-card-bottom">
                    <span><UserRound size={10} /> {task.assignee}</span>
                    <span className="as-avatar">{task.initials}</span>
                  </div>
                  <div className="as-task-move">
                    {column.id !== "todo" && <button onClick={() => moveTask(task.id, "previous")}>← Move</button>}
                    {column.id !== "done" && <button onClick={() => moveTask(task.id, "next")}>Move →</button>}
                  </div>
                </article>
              ))
            )}
          </div>
          <button className="as-add-task" onClick={() => { setTaskColumn(column.id); setShowTaskForm(true); }}><Plus size={12} /> Add Task</button>
        </div>
      ))}
    </div>
  );

  const renderIssues = () => (
    <Panel title="Sprint Issues" action={<button className="as-outline-button" onClick={() => setShowIssueForm(true)}><Plus size={12} /> Create Issue</button>}>
      {issues.length === 0 ? (
        <div className="as-empty-state"><AlertCircle size={30} /><strong>No issues logged</strong><span>All clear. No bugs or defects recorded for this sprint.</span></div>
      ) : (
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
      )}
    </Panel>
  );

  const renderTaskList = () => (
    <Panel title="Sprint Task List" action={<button className="as-outline-button" onClick={() => setShowTaskForm(true)}><Plus size={12} /> Add Task</button>}>
      {tasksList.length === 0 ? (
        <div className="as-empty-state"><ListTodo size={30} /><strong>No tasks in sprint</strong><span>Click Add Task to add your first sprint task.</span></div>
      ) : (
        <div className="as-table-wrap">
          <table className="as-table">
            <thead><tr><th>Task ID</th><th>Task Title</th><th>Status</th><th>Assignee</th><th>Story Points</th><th>Progress</th></tr></thead>
            <tbody>
              {tasksList.map((task) => (
                <tr key={task.id}>
                  <td className="as-link">{task.id}</td>
                  <td>{task.title}</td>
                  <td><Badge tone={task.status === "Completed" ? "success" : "blue"}>{task.status}</Badge></td>
                  <td>{task.assignee}</td>
                  <td>{task.points} SP</td>
                  <td>{task.progress}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );

  const renderBacklog = () => (
    <Panel title="Sprint Backlog">
      {tasksList.length === 0 ? (
        <div className="as-empty-state"><FileText size={30} /><strong>Backlog is empty</strong><span>Add tasks or requirements to this sprint to see backlog items.</span></div>
      ) : (
        <div className="as-table-wrap">
          <table className="as-table">
            <thead><tr><th>Task ID</th><th>Task Title</th><th>Status</th><th>Assignee</th><th>Story Points</th></tr></thead>
            <tbody>
              {tasksList.map((task) => (
                <tr key={task.id}>
                  <td className="as-link">{task.id}</td>
                  <td>{task.title}</td>
                  <td><Badge tone="blue">{task.status}</Badge></td>
                  <td>{task.assignee}</td>
                  <td>{task.points} SP</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );

  const renderFiles = () => (
    <Panel title="Sprint Files" action={<button className="as-outline-button" onClick={() => notify("File upload API ready for attachment storage.")}><Upload size={12} /> Upload File</button>}>
      <div className="as-empty-state"><FileText size={30} /><strong>No files uploaded yet</strong><span>Upload sprint documents, designs, and supporting attachments here.</span></div>
    </Panel>
  );

  const renderLogs = () => (
    <Panel title="Sprint Activity Logs">
      {activityItems.length === 0 ? (
        <div className="as-empty-state"><Activity size={30} /><strong>No recent activity</strong><span>Actions taken in this sprint will appear in the audit trail.</span></div>
      ) : (
        <div className="as-activity-list">
          {activityItems.map((item, index) => (
            <div className="as-activity-item" key={index}>
              <i className={`as-activity-dot ${item.color}`} />
              <div><strong>{item.date}</strong><span>{item.text}</span></div>
            </div>
          ))}
        </div>
      )}
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
          <strong>Active Sprint ({sprintCode})</strong>
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
                <button onClick={() => { notify("Sprint export summary ready."); setShowMoreActions(false); }}>Export Sprint Summary</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="as-title">
        <FileText size={25} />
        <div>
          <h1>Active Sprint ({sprintCode}) <Badge tone="success">{sprintStatus}</Badge></h1>
          <strong>{sprintName}</strong>
          <p><CalendarDays size={12} /> {startDateStr} – {endDateStr}</p>
        </div>
      </div>

      <div className="as-layout">
        <div className="as-main">
          <section className="as-metrics">
            <div className="as-metric as-progress-metric">
              <div className="as-metric-donut"><Donut value={totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0} total={100} color="#078b53" /></div>
              <div><label>Sprint Completion</label><strong>{doneCount} / {totalTasks} Tasks</strong><span>Done / Total</span><div className="as-meter"><i style={{ width: `${totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0}%` }} /></div><small>Progress</small></div>
            </div>
            <div className="as-metric">
              <label>Story Points</label><strong>{completedPoints} / {totalPoints} SP</strong><span>Completed / Total</span><div className="as-meter"><i style={{ width: `${totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0}%` }} /></div>
            </div>
            <div className="as-metric">
              <label>Tasks</label><strong>{doneCount} / {totalTasks}</strong><span>Completed / Total</span><div className="as-meter"><i style={{ width: `${totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0}%` }} /></div>
            </div>
            <div className="as-metric">
              <label className="orange-text">Open Issues</label><strong>{openIssueCount}</strong><span>Active Bugs</span>
            </div>
            <div className="as-metric">
              <label>Team Members</label><strong>{teamMembers.length}</strong><span>Assigned</span>
            </div>
            <div className="as-metric as-health">
              <label className="green-text">Sprint Health</label>
              <div className="as-health-value"><Heart size={19} /><strong>{openIssueCount > 5 ? "At Risk" : "Good"}</strong></div>
              <span>{openIssueCount > 5 ? "Needs Attention" : "On Track"}</span>
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
                <Panel title="Burndown Chart">
                  <BurndownChart totalPoints={totalPoints} completedPoints={completedPoints} />
                  <div className="as-chart-legend"><span><i className="green" /> Actual Completed</span><span><i className="blue dashed" /> Ideal Burndown</span></div>
                </Panel>
                <Panel title="Sprint Progress Distribution">
                  <div className="as-distribution">
                    <Donut value={completedPoints} total={totalPoints} color="#078b53" />
                    <div className="as-legend-list">
                      <div><i className="green" /><span>Completed</span><strong>{completedPoints} SP ({totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0}%)</strong></div>
                      <div><i className="gray" /><span>Remaining</span><strong>{Math.max(0, totalPoints - completedPoints)} SP ({totalPoints > 0 ? Math.round(((totalPoints - completedPoints) / totalPoints) * 100) : 0}%)</strong></div>
                    </div>
                  </div>
                </Panel>
                <Panel title="Tasks by Status">
                  <div className="as-distribution">
                    <Donut value={doneCount} total={totalTasks} color="#078b53" />
                    <div className="as-legend-list">
                      <div><i className="green" /><span>Done</span><strong>{doneCount} ({totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0}%)</strong></div>
                      <div><i className="blue" /><span>In Progress</span><strong>{columns.find((c) => c.id === "progress")?.tasks.length ?? 0}</strong></div>
                      <div><i className="gray" /><span>To Do</span><strong>{columns.find((c) => c.id === "todo")?.tasks.length ?? 0}</strong></div>
                    </div>
                  </div>
                </Panel>
              </section>

              <Panel title="Kanban Board" className="as-kanban-panel">
                {renderKanban()}
              </Panel>

              <section className="as-bottom-grid">
                <Panel title="Top Open Issues" action={<button className="as-text-button" onClick={() => setActiveTab("Issues")}>View All</button>}>
                  {issues.length === 0 ? (
                    <div style={{ padding: "20px", color: "#6b7280", textAlign: "center" }}>No open issues for this sprint.</div>
                  ) : (
                    <div className="as-table-wrap">
                      <table className="as-table">
                        <thead><tr><th>ID</th><th>Title</th><th>Priority</th><th>Status</th><th>Assignee</th></tr></thead>
                        <tbody>{issues.slice(0, 5).map((issue) => (
                          <tr key={issue.id}><td className="as-link">{issue.id}</td><td>{issue.title}</td><td><Badge tone={issue.priority}>{issue.priority}</Badge></td><td><Badge tone={issue.status}>{issue.status}</Badge></td><td>{issue.assignee}</td></tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                </Panel>
                <Panel title="Sprint Goal" action={<button className="as-text-button" onClick={() => setShowGoalEdit((value) => !value)}>{showGoalEdit ? "Close" : "Edit"}</button>}>
                  {showGoalEdit ? (
                    <div className="as-goal-editor">
                      <textarea value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Define the primary objective and deliverables for this sprint..." />
                      <button className="as-primary-button" onClick={saveSprintGoal}>Save Goal</button>
                    </div>
                  ) : <p className="as-goal-text">{goal || "No sprint goal defined. Click Edit to establish the sprint objective."}</p>}
                  <strong className="as-definition-title">Definition of Done</strong>
                  <ul className="as-done-list">
                    <li><CheckCircle2 size={13} /> Code complete & reviewed</li>
                    <li><CheckCircle2 size={13} /> Unit tests written & passed</li>
                    <li><CheckCircle2 size={13} /> QA verification passed</li>
                    <li><CheckCircle2 size={13} /> Documentation updated</li>
                    <li><CheckCircle2 size={13} /> Product Owner approval</li>
                  </ul>
                </Panel>
              </section>
            </>
          )}

          {activeTab === "Kanban Board" && <Panel title="Sprint Kanban Board">{renderKanban()}</Panel>}
          {activeTab === "Backlog" && renderBacklog()}
          {activeTab === "Task List" && renderTaskList()}
          {activeTab === "Issues" && renderIssues()}
          {activeTab === "Burndown Chart" && <Panel title="Sprint Burndown Chart"><BurndownChart totalPoints={totalPoints} completedPoints={completedPoints} /></Panel>}
          {activeTab === "Files" && renderFiles()}
          {activeTab === "Logs" && renderLogs()}
        </div>

        <aside className="as-sidebar">
          <Panel title="Sprint Details">
            <div className="as-detail-list">
              <div><span>Sprint Code</span><strong>{sprintCode}</strong></div>
              <div><span>Sprint Name</span><strong>{sprintName}</strong></div>
              <div><span>Project</span><strong>{sprint?.projectId?.name || sprint?.projectId?.projectName || "Linked Project"}</strong></div>
              <div><span>Milestone</span><strong>{sprint?.milestoneId?.name || "Sprint Milestone"}</strong></div>
              <div><span>Total Tasks</span><strong>{totalTasks}</strong></div>
              <div><span>Story Points</span><strong>{totalPoints} SP</strong></div>
              <div><span>Start Date</span><strong>{startDateStr}</strong></div>
              <div><span>End Date</span><strong>{endDateStr}</strong></div>
              <div><span>Status</span><strong><Badge tone={sprintStatus === "COMPLETED" ? "success" : "blue"}>{sprintStatus}</Badge></strong></div>
            </div>
          </Panel>

          <Panel title={`Team Members (${teamMembers.length})`}>
            {teamMembers.length === 0 ? (
              <div style={{ padding: "16px", color: "#6b7280", textAlign: "center", fontSize: "12px" }}>No team members assigned.</div>
            ) : (
              <div className="as-table-wrap">
                <table className="as-table as-team-table">
                  <thead><tr><th>Member</th><th>Role</th></tr></thead>
                  <tbody>{(showAllTeam ? teamMembers : teamMembers.slice(0, 5)).map((member) => (
                    <tr key={member.id || member.name}>
                      <td><span className="as-person"><span className="as-avatar">{member.initials}</span>{member.name}</span></td>
                      <td>{member.role}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Recent Activity">
            {activityItems.length === 0 ? (
              <div style={{ padding: "16px", color: "#6b7280", textAlign: "center", fontSize: "12px" }}>No recent audit activity.</div>
            ) : (
              <div className="as-activity-list">
                {(showAllActivity ? activityItems : activityItems.slice(0, 4)).map((item, index) => (
                  <div className="as-activity-item" key={index}>
                    <i className={`as-activity-dot ${item.color}`} />
                    <div><strong>{item.date}</strong><span>{item.text}</span></div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Quick Actions">
            <div className="as-quick-actions">
              <button onClick={() => setShowTaskForm(true)}><Plus size={14} /> Add Task</button>
              <button onClick={() => setShowIssueForm(true)}><AlertCircle size={14} /> Create Issue</button>
              <button onClick={() => setActiveTab("Files")}><Upload size={14} /> Upload File</button>
              <button onClick={() => setActiveTab("Burndown Chart")}><BarChart3 size={14} /> Burndown Chart</button>
            </div>
          </Panel>
        </aside>
      </div>

      {showTaskForm && (
        <div className="as-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowTaskForm(false); }}>
          <div className="as-modal">
            <div className="as-modal-head"><h3>Create Sprint Task</h3><button onClick={() => setShowTaskForm(false)}><X size={17} /></button></div>
            <label>Task Title<input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Enter task title" autoFocus /></label>
            <label>Assignee<select value={taskAssignee} onChange={(event) => setTaskAssignee(event.target.value)}>{teamMembers.map((member) => <option key={member.name} value={member.name}>{member.name}</option>)}</select></label>
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
            <label>Assignee<select value={issueAssignee} onChange={(event) => setIssueAssignee(event.target.value)}>{teamMembers.map((member) => <option key={member.name} value={member.name}>{member.name}</option>)}</select></label>
            <div className="as-modal-actions"><button onClick={() => setShowIssueForm(false)}>Cancel</button><button className="as-primary-button" onClick={addIssue}>Create Issue</button></div>
          </div>
        </div>
      )}

      {toast && <div className="as-toast"><CheckCircle2 size={15} />{toast}<button onClick={() => setToast("")}><X size={13} /></button></div>}
    </main>
  );
}
