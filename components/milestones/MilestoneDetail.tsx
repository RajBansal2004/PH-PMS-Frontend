"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Download,
  Edit3,
  FileText,
  History,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";

import {
  milestones as getMilestones,
  tasks as getTasks,
  createTask as apiCreateTask,
} from "@/lib/api";
import "./milestone-detail.css";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Status({ value }: { value: string }) {
  const className = (value || "in-progress").toLowerCase().replaceAll(" ", "-");
  return <span className={`md-status ${className}`}>{value}</span>;
}

export default function MilestoneDetail({
  milestoneId,
}: {
  milestoneId: string;
}) {
  const [milestone, setMilestone] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("Overview");
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<{ name: string; text: string }[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [mlsRes, tskRes] = await Promise.allSettled([
          getMilestones(),
          getTasks({ limit: 100 }),
        ]);

        if (mlsRes.status === "fulfilled" && mlsRes.value) {
          const list = Array.isArray(mlsRes.value)
            ? mlsRes.value
            : (mlsRes.value as any)?.items || [];
          const found = list.find(
            (m: any) =>
              m._id === milestoneId ||
              m.id === milestoneId ||
              m.code === milestoneId
          );
          if (found) {
            setMilestone(found);
          } else if (list.length > 0) {
            setMilestone(list[0]);
          }
        }

        if (tskRes.status === "fulfilled" && tskRes.value) {
          const rawTasks = Array.isArray(tskRes.value)
            ? tskRes.value
            : (tskRes.value as any)?.items || [];
          setTasksList(rawTasks);
        }
      } catch (err) {
        console.warn("Failed to load milestone detail:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [milestoneId]);

  const progress = milestone?.progress ?? milestone?.weight ?? 0;
  const title = milestone?.name ?? milestone?.title ?? "Milestone Details";
  const owner = milestone?.owner?.name ?? "Admin";
  const projectId = milestone?.projectId?.code ?? milestone?.projectId ?? "PRJ";
  const type = milestone?.type ?? "Phase";
  const status = milestone?.status ?? "In Progress";
  const priority = milestone?.priority ?? "Medium";
  const start = milestone?.startDate ? milestone.startDate.slice(0, 10) : "—";
  const end = milestone?.endDate ? milestone.endDate.slice(0, 10) : "—";

  const duration = useMemo(() => {
    if (!start || !end || start === "—" || end === "—") return 15;
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    const days =
      Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
    return Number.isFinite(days) && days > 0 ? days : 15;
  }, [start, end]);

  const addComment = () => {
    if (!comment.trim()) return;
    setComments((previous) => [
      ...previous,
      { name: "You", text: comment.trim() },
    ]);
    setComment("");
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      const created = await apiCreateTask({
        title: newTaskTitle.trim(),
        milestoneId: milestone?._id || milestoneId,
      });
      setTasksList((prev) => [
        {
          _id: created?._id || `TSK-${prev.length + 1}`,
          title: newTaskTitle.trim(),
          status: "TODO",
          progress: 0,
        },
        ...prev,
      ]);
      setNewTaskTitle("");
      setShowAddTask(false);
    } catch (err) {
      console.warn("Create task error:", err);
    }
  };

  if (loading) {
    return (
      <section className="md-not-found">
        <FileText size={34} />
        <h1>Loading Milestone...</h1>
        <p>Fetching milestone details from the database.</p>
      </section>
    );
  }

  if (!milestone) {
    return (
      <section className="md-not-found">
        <FileText size={34} />
        <h1>Milestone not found</h1>
        <p>No milestone records match this ID in the database.</p>
        <Link href="/milestones">Back to Milestone Registry</Link>
      </section>
    );
  }

  const tabs = [
    "Overview",
    "Schedule & Progress",
    "Deliverables",
    "Dependencies",
    `Tasks (${tasksList.length})`,
    "Resources",
    "Documents",
    "Approvals",
    `Comments (${comments.length})`,
    "History",
  ];

  const renderOverview = () => (
    <>
      <div className="md-overview-grid">
        <section className="md-card md-description-card">
          <h2>Description</h2>
          <p>
            {milestone.description ||
              "This milestone represents a key project checkpoint and its associated deliverables."}
          </p>
          <div className="md-two-content">
            <div>
              <h3>Business Objective</h3>
              <p>
                Ensure project requirements and progress criteria meet target
                milestone parameters.
              </p>
            </div>
            <div>
              <h3>Acceptance Criteria</h3>
              <ul className="md-check-list">
                <li>
                  <CheckCircle2 /> Project deliverables are validated.
                </li>
                <li>
                  <CheckCircle2 /> Acceptance testing is verified.
                </li>
                <li>
                  <CheckCircle2 /> Dependencies are resolved.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="md-card">
          <div className="md-card-heading">
            <h2>Linked Tasks</h2>
            <button
              type="button"
              onClick={() => setActiveTab(`Tasks (${tasksList.length})`)}
            >
              View All <ArrowUpRight size={13} />
            </button>
          </div>
          <div className="md-table-scroll">
            <table className="md-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {tasksList.length > 0 ? (
                  tasksList.slice(0, 5).map((t: any) => (
                    <tr key={t._id || t.id}>
                      <td>{t.title || t.name}</td>
                      <td>
                        <Status value={t.status || "To Do"} />
                      </td>
                      <td>{t.progress || 0}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ textAlign: "center", padding: "16px" }}>
                      No tasks linked to this milestone yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="md-card md-schedule-card">
        <div className="md-card-heading">
          <h2>
            <CalendarDays size={15} /> Schedule &amp; Timeline
          </h2>
          <button
            type="button"
            onClick={() => setActiveTab("Schedule & Progress")}
          >
            View Full Timeline <ArrowUpRight size={13} />
          </button>
        </div>
        <div className="md-timeline-layout">
          <div className="md-date-list">
            <p>
              <span>Planned Start</span>
              <strong>{start}</strong>
            </p>
            <p>
              <span>Planned End</span>
              <strong>{end}</strong>
            </p>
            <p>
              <span>Baseline Duration</span>
              <strong>{duration} Days</strong>
            </p>
          </div>
          <div className="md-gantt">
            <div className="md-gantt-months">
              <span>Timeline Progress</span>
            </div>
            <div className="md-gantt-line actual">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </section>
    </>
  );

  const renderSchedule = () => (
    <section className="md-card">
      <h2>Schedule &amp; Progress</h2>
      <div className="md-progress-large">
        <div>
          <span>Overall Milestone Progress</span>
          <strong>{progress}%</strong>
        </div>
        <div className="md-progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="md-detail-facts">
        <div>
          <span>Planned Start</span>
          <strong>{start}</strong>
        </div>
        <div>
          <span>Planned End</span>
          <strong>{end}</strong>
        </div>
        <div>
          <span>Baseline Duration</span>
          <strong>{duration} days</strong>
        </div>
        <div>
          <span>Current Status</span>
          <strong>
            <Status value={status} />
          </strong>
        </div>
      </div>
    </section>
  );

  const renderDeliverables = () => (
    <section className="md-card">
      <div className="md-card-heading">
        <h2>Deliverables &amp; Acceptance</h2>
      </div>
      <div className="md-table-scroll">
        <table className="md-table">
          <thead>
            <tr>
              <th>Deliverable</th>
              <th>Status</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={3} style={{ textAlign: "center", padding: "24px" }}>
                No deliverables recorded for this milestone.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderDependencies = () => (
    <section className="md-card">
      <div className="md-card-heading">
        <h2>Milestone Dependencies</h2>
      </div>
      <div className="md-table-scroll">
        <table className="md-table">
          <thead>
            <tr>
              <th>Dependency</th>
              <th>Impact</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={3} style={{ textAlign: "center", padding: "24px" }}>
                No active milestone dependencies recorded.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderTasks = () => (
    <section className="md-card">
      <div className="md-card-heading">
        <h2>Linked Tasks ({tasksList.length})</h2>
        <button type="button" onClick={() => setShowAddTask((v) => !v)}>
          <Plus size={14} /> Add Task
        </button>
      </div>
      {showAddTask && (
        <div style={{ display: "flex", gap: "8px", margin: "12px 0" }}>
          <input
            style={{
              flex: 1,
              padding: "6px 10px",
              border: "1px solid #d0d5dd",
              borderRadius: "6px",
            }}
            placeholder="Task title..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
          <button
            type="button"
            className="md-button"
            onClick={handleCreateTask}
          >
            Create
          </button>
        </div>
      )}
      <div className="md-table-scroll">
        <table className="md-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Status</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {tasksList.length > 0 ? (
              tasksList.map((t: any) => (
                <tr key={t._id || t.id}>
                  <td>{t.title || t.name}</td>
                  <td>
                    <Status value={t.status || "To Do"} />
                  </td>
                  <td>{t.progress || 0}%</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", padding: "24px" }}>
                  No tasks linked to this milestone yet. Click &apos;Add Task&apos; to link one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderResources = () => (
    <section className="md-card">
      <div className="md-card-heading">
        <h2>Resources &amp; Allocation</h2>
      </div>
      <div className="md-detail-facts">
        <div>
          <span>Milestone Owner</span>
          <strong>{owner}</strong>
        </div>
      </div>
    </section>
  );

  const renderDocuments = () => (
    <section className="md-card">
      <div className="md-card-heading">
        <h2>Documents &amp; Attachments</h2>
      </div>
      <p style={{ padding: "16px", color: "#667085" }}>
        No documents attached to this milestone.
      </p>
    </section>
  );

  const renderApprovals = () => (
    <section className="md-card">
      <h2>Approval Workflow</h2>
      <p style={{ padding: "16px", color: "#667085" }}>
        Milestone sign-off criteria is currently pending stakeholder review.
      </p>
    </section>
  );

  const renderComments = () => (
    <section className="md-card">
      <h2>Comments &amp; Discussion</h2>
      <div className="md-comment-compose">
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Write a comment..."
          rows={3}
        />
        <button
          type="button"
          onClick={addComment}
          disabled={!comment.trim()}
        >
          Add Comment
        </button>
      </div>
      {comments.length > 0 ? (
        comments.map((item, index) => (
          <div className="md-comment" key={`${item.name}-${index}`}>
            <div className="md-avatar">{initials(item.name)}</div>
            <div>
              <strong>{item.name}</strong>
              <p>{item.text}</p>
              <small>Just now</small>
            </div>
          </div>
        ))
      ) : (
        <p style={{ padding: "12px", color: "#667085" }}>
          No comments yet. Post the first comment above.
        </p>
      )}
    </section>
  );

  const renderHistory = () => (
    <section className="md-card">
      <h2>Milestone History</h2>
      <div className="md-history-row">
        <History size={15} />
        <div>
          <strong>Milestone created</strong>
          <small>{milestone.createdAt ? milestone.createdAt.slice(0, 10) : start}</small>
        </div>
      </div>
    </section>
  );

  const tabContent = () => {
    if (activeTab === "Overview") return renderOverview();
    if (activeTab === "Schedule & Progress") return renderSchedule();
    if (activeTab === "Deliverables") return renderDeliverables();
    if (activeTab === "Dependencies") return renderDependencies();
    if (activeTab.startsWith("Tasks")) return renderTasks();
    if (activeTab.startsWith("Resources")) return renderResources();
    if (activeTab.startsWith("Documents")) return renderDocuments();
    if (activeTab.startsWith("Approvals")) return renderApprovals();
    if (activeTab.startsWith("Comments")) return renderComments();
    return renderHistory();
  };

  return (
    <section className="milestone-detail-page">
      <div className="md-header-actions">
        <div>
          <div className="md-breadcrumb">
            Milestone Management <span>›</span>{" "}
            <Link href="/milestones">Milestone Registry</Link> <span>›</span>{" "}
            {milestone._id || milestone.id} — Milestone Detail
          </div>
          <h1>
            {milestone.name || title}
          </h1>
          <p>
            Project: <strong>{projectId}</strong>
          </p>
        </div>
        <div className="md-header-buttons">
          <Link
            href={`/milestones/${encodeURIComponent(milestone._id || milestone.id)}/edit`}
            className="md-button"
          >
            <Edit3 size={14} /> Edit Milestone
          </Link>
        </div>
      </div>

      <section className="md-hero">
        <div className="md-hero-facts">
          <div>
            <span>Milestone Type</span>
            <strong>{type}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>
              <Status value={status} />
            </strong>
          </div>
          <div>
            <span>Priority</span>
            <strong>
              <Status value={priority} />
            </strong>
          </div>
          <div>
            <span>Planned Start</span>
            <strong>{start}</strong>
          </div>
          <div>
            <span>Planned End</span>
            <strong>{end}</strong>
          </div>
          <div>
            <span>Owner</span>
            <strong>{owner}</strong>
          </div>
        </div>
        <div className="md-hero-progress">
          <div>
            <span>Progress</span>
            <strong>{progress}%</strong>
          </div>
          <div className="md-progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      </section>

      <div className="md-detail-layout">
        <main className="md-detail-main">
          <nav className="md-tabs" aria-label="Milestone detail sections">
            {tabs.map((tab) => (
              <button
                type="button"
                key={tab}
                className={activeTab === tab ? "active" : ""}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </nav>
          {tabContent()}
        </main>
      </div>
    </section>
  );
}
