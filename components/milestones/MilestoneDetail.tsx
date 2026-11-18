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
  Building2,
  FolderKanban,
  Check,
  RefreshCw,
} from "lucide-react";

import { milestoneApi } from "../../lib/milestones/api";
import type { Milestone } from "../../lib/milestones/types";
import "./milestone-detail.css";

const tabs = [
  "Overview",
  "Schedule & Progress",
  "Deliverables",
  "Dependencies",
  "Tasks (8)",
  "Resources (4)",
  "Documents (3)",
  "Approvals (2)",
  "Comments (3)",
  "History",
];

const defaultDeliverables = [
  { name: "BRD - Architecture & Requirements", type: "Document", status: "Approved", version: "v1.0" },
  { name: "Functional Specification", type: "Document", status: "Approved", version: "v1.1" },
  { name: "System Architecture", type: "Document", status: "Approved", version: "v1.0" },
  { name: "Data Flow Diagrams", type: "Document", status: "Approved", version: "v1.0" },
  { name: "UI/UX Wireframes", type: "Document", status: "In Review", version: "v1.2" },
  { name: "API Specification", type: "Document", status: "Pending", version: "—" },
];

const defaultTasks = [
  { id: "TSK-045", title: "Create System Architecture", status: "Completed", progress: 100 },
  { id: "TSK-046", title: "Design Data Flow Diagrams", status: "Completed", progress: 100 },
  { id: "TSK-047", title: "Prepare UI/UX Wireframes", status: "In Progress", progress: 70 },
  { id: "TSK-048", title: "Review BRD Documents", status: "In Progress", progress: 50 },
  { id: "TSK-049", title: "API Design", status: "To Do", progress: 0 },
];

const defaultDependencies = [
  { id: "DEP-001", title: "BRD Finalization", type: "Finish to Start (FS)", dependsOn: "MLS-001 - Project Kickoff", impact: "High", status: "Completed" },
  { id: "DEP-002", title: "Infrastructure Setup", type: "Start to Start (SS)", dependsOn: "INF-001 - Server Provisioning", impact: "Medium", status: "Completed" },
  { id: "DEP-003", title: "UI Standards Approval", type: "Finish to Finish (FF)", dependsOn: "DSN-001 - Design System", impact: "Medium", status: "In Progress" },
];



function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Status({ value }: { value: string }) {
  const className = value.toLowerCase().replaceAll(" ", "-");
  return <span className={`md-status ${className}`}>{value}</span>;
}

export default function MilestoneDetail({
  milestoneId,
}: {
  milestoneId: string;
}) {
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<Array<{ name: string; text: string }>>([]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    milestoneApi
      .get(milestoneId)
      .then((m) => {
        if (isMounted && m) {
          setMilestone(m);
        }
      })
      .catch((err) => {
        console.warn("Failed to load milestone from API:", err);
        if (isMounted) setMilestone(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [milestoneId]);

  const handleQuickStatusChange = async (newStatus: any) => {
    if (!milestone) return;
    try {
      setUpdatingStatus(true);
      const targetId = milestone._id || milestone.id;
      const updated = await milestoneApi.update(targetId, { status: newStatus });
      setMilestone(updated);
    } catch (err: any) {
      alert(`Status update failed: ${err?.message || "Server error"}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const progress = milestone?.progress ?? 0;
  const title = milestone?.title ?? "Milestone Details";
  const code = milestone?.milestoneCode || milestone?.id || "MLS";
  const owner = milestone?.owner?.name ?? "Project Lead";
  const projectName = milestone?.projectName ?? "Enterprise Project";
  const projectCode = milestone?.projectCode || milestone?.projectId || "PRJ";
  const clientName = milestone?.clientName ?? "Direct Client";
  const type = milestone?.type ?? "Phase";
  const status = milestone?.status ?? "Upcoming";
  const priority = milestone?.priority ?? "Medium";
  const start = milestone?.plannedStart ?? "2026-04-01";
  const end = milestone?.plannedEnd ?? "2026-06-30";

  const duration = useMemo(() => {
    if (!start || !end) return 15;
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
    return Number.isFinite(days) && days > 0 ? days : 15;
  }, [start, end]);

  const realStakeholders = useMemo(() => {
    if (!milestone) return [];
    const list = [
      { name: milestone.owner?.name || "Milestone Lead", role: "Milestone Lead / Owner", status: "Active" },
    ];
    if ((milestone as any).requestedBy && (milestone as any).requestedBy !== milestone.owner?.name) {
      list.push({
        name: (milestone as any).requestedBy,
        role: "Requested By / Stakeholder",
        status: "Active",
      });
    }
    return list;
  }, [milestone]);

  if (loading) {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center", color: "#64748b" }}>
        <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 16px", color: "#3b82f6" }} />
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
          Loading Milestone Specification...
        </h3>
        <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
          Fetching baseline milestones and project dependencies from database.
        </p>
      </div>
    );
  }

  if (!milestone) {
    return (
      <section className="md-not-found">
        <FileText size={34} />
        <h1>Milestone Not Found</h1>
        <p>The requested milestone could not be found in the current organization registry.</p>
        <Link href="/milestones">Back to Milestone Registry</Link>
      </section>
    );
  }

  const addComment = () => {
    if (!comment.trim()) return;
    setComments((previous) => [
      ...previous,
      { name: "You", text: comment.trim() },
    ]);
    setComment("");
  };

  const renderOverview = () => (
    <>
      <div className="md-overview-grid">
        <section className="md-card md-description-card">
          <h2>Milestone Scope & Objectives</h2>
          <p>
            {milestone.description ||
              "This milestone defines critical functional capabilities, architecture deliverables, and acceptance criteria required for project baseline release."}
          </p>
          <div className="md-two-content">
            <div>
              <h3>Business Objective</h3>
              <p>
                {milestone.businessObjective ||
                  "Ensure all design artifacts and functional components are complete, reviewed, and approved before moving to client deployment."}
              </p>
            </div>
            <div>
              <h3>Acceptance Criteria</h3>
              {milestone.acceptanceCriteria ? (
                <p style={{ whiteSpace: "pre-line", fontSize: "13px", color: "#475569" }}>
                  {milestone.acceptanceCriteria}
                </p>
              ) : (
                <ul className="md-check-list">
                  <li><CheckCircle2 size={14} /> System requirements verified and aligned with BRD.</li>
                  <li><CheckCircle2 size={14} /> Technical architecture and API contracts signed off.</li>
                  <li><CheckCircle2 size={14} /> Quality assurance test coverage exceeds standard thresholds.</li>
                  <li><CheckCircle2 size={14} /> Security and regulatory compliance checklist approved.</li>
                </ul>
              )}
            </div>
          </div>
          {milestone.businessRules && (
            <div className="md-business-rules">
              <h3>Business Rules & Constraints</h3>
              <p style={{ fontSize: "13px", color: "#475569", margin: "6px 0 0" }}>
                {milestone.businessRules}
              </p>
            </div>
          )}
        </section>

        <section className="md-card">
          <div className="md-card-heading">
            <h2>Linked Deliverables</h2>
            <button type="button" onClick={() => setActiveTab("Deliverables")}>
              View All <ArrowUpRight size={13} />
            </button>
          </div>
          <div className="md-table-scroll">
            <table className="md-table">
              <thead>
                <tr>
                  <th>Deliverable</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Version</th>
                </tr>
              </thead>
              <tbody>
                {defaultDeliverables.slice(0, 5).map((item) => (
                  <tr key={item.name}>
                    <td>{item.name}</td>
                    <td>{item.type}</td>
                    <td><Status value={item.status} /></td>
                    <td>{item.version}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="md-card md-schedule-card">
        <div className="md-card-heading">
          <h2><CalendarDays size={15} /> Schedule & Timeline Gantt</h2>
          <button type="button" onClick={() => setActiveTab("Schedule & Progress")}>
            View Full Timeline <ArrowUpRight size={13} />
          </button>
        </div>
        <div className="md-timeline-layout">
          <div className="md-date-list">
            <p><span>Planned Start</span><strong>{start}</strong></p>
            <p><span>Planned Due Date</span><strong>{end}</strong></p>
            <p><span>Actual Finish</span><strong>{milestone.actualEnd || "In Progress"}</strong></p>
            <p><span>Baseline Duration</span><strong>{duration} Days</strong></p>
            <p><span>Allocation Weight</span><strong>{milestone.weight || 10}%</strong></p>
            <p><span>Budget / Effort</span><strong>₹{(milestone.budget || 0).toLocaleString("en-IN")}</strong></p>
          </div>
          <div className="md-gantt">
            <div className="md-gantt-months"><span>Start Period</span><span>Target Deadline</span></div>
            <div className="md-gantt-days">
              {Array.from({ length: 14 }, (_, index) => <span key={index}>{index + 1}</span>)}
            </div>
            <div className="md-gantt-line planned"><span /></div>
            <div className="md-gantt-line actual"><span style={{ width: `${progress}%` }} /></div>
            <div className="md-gantt-line remaining"><span /></div>
            <div className="md-today-line"><span>Today</span></div>
            <div className="md-gantt-legend">
              <span><i className="planned-dot" /> Planned</span>
              <span><i className="actual-dot" /> Actual ({progress}%)</span>
              <span><i className="remaining-dot" /> Remaining</span>
              <span><i className="today-dot" /> Current Date</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );

  const renderSchedule = () => (
    <section className="md-card">
      <h2>Schedule & Progress Breakdown</h2>
      <div className="md-progress-large">
        <div><span>Overall Milestone Progress</span><strong>{progress}%</strong></div>
        <div className="md-progress-track"><span style={{ width: `${progress}%` }} /></div>
      </div>
      <div className="md-detail-facts">
        <div><span>Planned Start</span><strong>{start}</strong></div>
        <div><span>Planned End</span><strong>{end}</strong></div>
        <div><span>Baseline Duration</span><strong>{duration} days</strong></div>
        <div><span>Weight Allocation</span><strong>{milestone.weight || 10}%</strong></div>
        <div><span>Current Status</span><strong><Status value={status} /></strong></div>
        <div><span>Lead / Owner</span><strong>{owner}</strong></div>
      </div>
    </section>
  );

  const renderDeliverables = () => (
    <section className="md-card">
      <div className="md-card-heading">
        <h2>Milestone Deliverables ({defaultDeliverables.length})</h2>
      </div>
      <div className="md-table-scroll">
        <table className="md-table">
          <thead><tr><th>Deliverable</th><th>Type</th><th>Status</th><th>Version</th></tr></thead>
          <tbody>
            {defaultDeliverables.map((item) => (
              <tr key={item.name}>
                <td>{item.name}</td>
                <td>{item.type}</td>
                <td><Status value={item.status} /></td>
                <td>{item.version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderDependencies = () => (
    <section className="md-card">
      <h2>Dependencies & Linkages</h2>
      {milestone?.dependencies ? (
        <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <strong>Milestone Dependencies:</strong>
          <p style={{ margin: "8px 0 0", fontSize: "13.5px", color: "#334155", whiteSpace: "pre-line" }}>
            {milestone.dependencies}
          </p>
        </div>
      ) : (
        <p style={{ margin: "16px 0", fontSize: "13px", color: "#64748b" }}>
          No predecessor or technical dependencies configured for this milestone.
        </p>
      )}
    </section>
  );

  const renderTasks = () => (
    <section className="md-card">
      <h2>Linked Engineering Tasks</h2>
      <div className="md-task-stats">
        <div><strong>8</strong><span>Total</span></div>
        <div><strong>3</strong><span>Completed</span></div>
        <div><strong>4</strong><span>In Progress</span></div>
        <div><strong>1</strong><span>To Do</span></div>
      </div>
      <div className="md-table-scroll">
        <table className="md-table">
          <thead><tr><th>Task ID</th><th>Task Title</th><th>Status</th><th>Progress</th></tr></thead>
          <tbody>
            {defaultTasks.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td><td>{item.title}</td><td><Status value={item.status} /></td>
                <td>{item.progress}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderResources = () => (
    <section className="md-card">
      <h2>Team Resources & Stakeholders</h2>
      <div className="md-table-scroll">
        <table className="md-table">
          <thead><tr><th>Name</th><th>Role</th><th>Status</th></tr></thead>
          <tbody>
            {realStakeholders.map((person) => (
              <tr key={person.name}>
                <td><strong>{person.name}</strong></td>
                <td>{person.role}</td>
                <td><Status value={person.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderDocuments = () => (
    <section className="md-card">
      <h2>Documents & Artifacts</h2>
      <p style={{ fontSize: "13px", color: "#64748b" }}>Project baseline documentation and specifications attached to this milestone.</p>
      <div className="md-two-content" style={{ marginTop: "12px" }}>
        <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <strong>BRD Specification Baseline</strong>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>Version 1.0 signed off</p>
        </div>
        <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <strong>Architecture Design Document</strong>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>Technical diagram & data flows</p>
        </div>
      </div>
    </section>
  );

  const renderApprovals = () => (
    <section className="md-card">
      <h2>Approval Workflow</h2>
      <div className="md-workflow" style={{ marginTop: "14px" }}>
        {[
          ["Submitted", "Milestone created and entered workflow", "done"],
          ["In Review", "Currently under milestone execution and review", status === "In Progress" ? "active" : status === "Completed" ? "done" : "active"],
          ["Sign-off / Approved", "Final verification and acceptance", status === "Completed" ? "done" : ""],
        ].map(([name, detail, state]) => (
          <div className={`md-workflow-step ${state}`} key={name}>
            <span>{state === "done" ? <CheckCircle2 size={15} /> : <Circle size={15} />}</span>
            <div><strong>{name}</strong><small>{detail}</small></div>
          </div>
        ))}
      </div>
    </section>
  );

  const renderComments = () => (
    <section className="md-card">
      <h2>Comments & Discussions</h2>
      <div className="md-comment-box">
        <textarea
          rows={3}
          placeholder="Leave a comment or observation..."
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
        <button type="button" onClick={addComment}>
          <MessageSquare size={14} /> Post Comment
        </button>
      </div>
      {comments.length > 0 ? (
        comments.map((item, index) => (
          <div className="md-comment" key={`${item.name}-${index}`}>
            <div className="md-avatar">{initials(item.name)}</div>
            <div><strong>{item.name}</strong><p>{item.text}</p><small>Recent update</small></div>
          </div>
        ))
      ) : (
        <p style={{ margin: "16px 0", fontSize: "13px", color: "#64748b" }}>
          No discussions recorded yet. Enter a note above to log a comment.
        </p>
      )}
    </section>
  );

  const renderHistory = () => (
    <section className="md-card">
      <h2>Milestone Audit History</h2>
      <div className="md-history-row">
        <History size={15} />
        <div>
          <strong>Milestone registered in PMS database</strong>
          <small>{milestone?.plannedStart ? `Planned start: ${milestone.plannedStart}` : "Baseline recorded"}</small>
        </div>
      </div>
      <div className="md-history-row">
        <History size={15} />
        <div>
          <strong>Workflow State: {milestone?.status} ({milestone?.progress}% progress)</strong>
          <small>Owner: {milestone?.owner?.name}</small>
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
            Milestone Management <span>›</span> <Link href="/milestones">Milestone Registry</Link> <span>›</span> {code} — Milestone Detail
          </div>
          <h1>{code} — {title}</h1>
          <p>
            Project: <strong>{projectCode} - {projectName}</strong>
            <span style={{ marginLeft: "12px" }}>Client: <strong>{clientName}</strong></span>
          </p>
        </div>
        <div className="md-header-buttons">
          <Link href={`/milestones/${encodeURIComponent(milestone._id || milestone.id)}/edit`} className="md-button">
            <Edit3 size={14} /> Edit Milestone
          </Link>
          <div style={{ display: "flex", gap: "6px" }}>
            {status !== "Completed" && (
              <button
                className="md-button"
                type="button"
                disabled={updatingStatus}
                onClick={() => handleQuickStatusChange("Completed")}
                style={{ background: "#059669", color: "#fff", borderColor: "#059669" }}
              >
                <Check size={14} /> Mark Completed
              </button>
            )}
            {status === "Upcoming" && (
              <button
                className="md-button"
                type="button"
                disabled={updatingStatus}
                onClick={() => handleQuickStatusChange("In Progress")}
              >
                Start Milestone
              </button>
            )}
          </div>
        </div>
      </div>

      <section className="md-hero">
        <div className="md-hero-facts">
          <div><span>Milestone ID</span><strong>{code}</strong></div>
          <div><span>Milestone Type</span><strong>{type}</strong></div>
          <div><span>Status</span><strong><Status value={status} /></strong></div>
          <div><span>Priority</span><strong><Status value={priority} /></strong></div>
          <div><span>Planned Start</span><strong>{start}</strong></div>
          <div><span>Planned End</span><strong>{end}</strong></div>
          <div><span>Owner</span><strong>{owner}</strong></div>
          <div><span>Weight</span><strong>{milestone.weight || 10}%</strong></div>
        </div>
        <div className="md-hero-progress">
          <div><span>Progress</span><strong>{progress}%</strong></div>
          <div className="md-progress-track"><span style={{ width: `${progress}%` }} /></div>
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

        <aside className="md-sidebar">
          <section className="md-card">
            <h2>Milestone Summary</h2>
            <p className="md-summary-description">
              {milestone.description || "Core milestone defined for project baseline deliverables and timeline."}
            </p>
            <dl className="md-summary-list">
              <div><dt>Project</dt><dd>{projectCode} - {projectName}</dd></div>
              <div><dt>Client</dt><dd>{clientName}</dd></div>
              <div><dt>Milestone Type</dt><dd>{type} Milestone</dd></div>
              <div><dt>Priority</dt><dd><Status value={priority} /></dd></div>
              <div><dt>Status</dt><dd><Status value={status} /></dd></div>
              <div><dt>Progress</dt><dd>{progress}%</dd></div>
              <div><dt>Planned Start</dt><dd>{start}</dd></div>
              <div><dt>Planned End</dt><dd>{end}</dd></div>
              <div><dt>Owner</dt><dd>{owner}</dd></div>
              <div><dt>Weight Allocation</dt><dd>{milestone.weight || 10}%</dd></div>
            </dl>
          </section>

          <section className="md-card">
            <h2>Approval Workflow</h2>
            <div className="md-workflow">
              {[
                ["Submitted", `Registered into PMS database`, "done"],
                ["In Review", "Milestone deliverables in progress", status === "Completed" ? "done" : "active"],
                ["Approved", "Stakeholder sign-off and milestone delivery", status === "Completed" ? "done" : ""],
              ].map(([name, detail, state]) => (
                <div className={`md-workflow-step ${state}`} key={name}>
                  <span>{state === "done" ? <CheckCircle2 size={15} /> : <Circle size={15} />}</span>
                  <div><strong>{name}</strong><small>{detail}</small></div>
                </div>
              ))}
            </div>
          </section>

          <section className="md-card">
            <div className="md-card-heading">
              <h2>Project Context</h2>
            </div>
            <div style={{ fontSize: "13px", color: "#475569", lineHeight: 1.6 }}>
              <div>Project: <strong>{projectName}</strong></div>
              <div>Code: <strong>{projectCode}</strong></div>
              <div>Client: <strong>{clientName}</strong></div>
            </div>
            <div style={{ marginTop: "12px" }}>
              <Link
                href="/milestones"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12.5px",
                  color: "#1d4ed8",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <FolderKanban size={14} /> View All Milestones
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
