
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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

import { demoMilestones } from "../../lib/milestones/demo-data";
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

const deliverables = [
  { name: "BRD - Requirements Management", type: "Document", status: "Approved", version: "v1.0" },
  { name: "Functional Specification", type: "Document", status: "Approved", version: "v1.1" },
  { name: "System Architecture", type: "Document", status: "Approved", version: "v1.0" },
  { name: "Data Flow Diagrams", type: "Document", status: "Approved", version: "v1.0" },
  { name: "UI/UX Wireframes", type: "Document", status: "In Review", version: "v1.2" },
  { name: "API Specification", type: "Document", status: "Pending", version: "—" },
];

const tasks = [
  { id: "TSK-045", title: "Create System Architecture", status: "Completed", progress: 100 },
  { id: "TSK-046", title: "Design Data Flow Diagrams", status: "Completed", progress: 100 },
  { id: "TSK-047", title: "Prepare UI/UX Wireframes", status: "In Progress", progress: 70 },
  { id: "TSK-048", title: "Review BRD Documents", status: "In Progress", progress: 50 },
  { id: "TSK-049", title: "API Design", status: "To Do", progress: 0 },
];

const dependencies = [
  { id: "DEP-001", title: "BRD Finalization", type: "Finish to Start (FS)", dependsOn: "MLS-001 - Project Kickoff", impact: "High", status: "Completed" },
  { id: "DEP-002", title: "Infrastructure Setup", type: "Start to Start (SS)", dependsOn: "INF-001 - Server Provisioning", impact: "Medium", status: "Completed" },
  { id: "DEP-003", title: "UI Standards Approval", type: "Finish to Finish (FF)", dependsOn: "DSN-001 - Design System", impact: "Medium", status: "In Progress" },
];

const stakeholders = [
  { name: "Amit Kumar", role: "Project Manager", status: "Approved", initials: "AK" },
  { name: "Rahul Verma", role: "Tech Lead", status: "In Review", initials: "RV" },
  { name: "Pooja Singh", role: "Product Owner", status: "Approved", initials: "PS" },
  { name: "Vikram Singh", role: "QA Lead", status: "Pending", initials: "VS" },
];

const activities = [
  { date: "18 May 2025, 11:20 AM", text: "Rahul Verma marked milestone as In Review", initials: "RV" },
  { date: "17 May 2025, 04:45 PM", text: "Neha Patel updated milestone details", initials: "NP" },
  { date: "16 May 2025, 10:30 AM", text: "Pooja Singh submitted milestone for review", initials: "PS" },
  { date: "15 May 2025, 09:30 AM", text: "Milestone created by Mayank Swaroop", initials: "MS" },
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
  const milestone = demoMilestones.find((item) => item.id === milestoneId);
  const [activeTab, setActiveTab] = useState("Overview");
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([
    { name: "Rahul Verma", text: "Architecture review is completed. UI wireframes are in progress." },
    { name: "Pooja Singh", text: "Please ensure all acceptance criteria are covered before approval." },
    { name: "Neha Patel", text: "Updated the design documents for review." },
  ]);

  const progress = milestone?.progress ?? 65;
  const title = milestone?.title ?? "Design Completion";
  const owner = milestone?.owner?.name ?? "Neha Patel";
  const projectId = milestone?.projectId ?? "PRJ-001";
  const type = milestone?.type ?? "Phase";
  const status = milestone?.status ?? "In Progress";
  const priority = milestone?.priority ?? "High";
  const start = milestone?.plannedStart ?? "2025-05-16";
  const end = milestone?.plannedEnd ?? "2025-05-30";

  const duration = useMemo(() => {
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
    return Number.isFinite(days) && days > 0 ? days : 15;
  }, [start, end]);

  if (!milestone) {
    return (
      <section className="md-not-found">
        <FileText size={34} />
        <h1>Milestone not found</h1>
        <p>The requested milestone could not be found in the current registry data.</p>
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
          <h2>Description</h2>
          <p>
            {milestone.description ||
              "This milestone represents the completion of system design and all design deliverables required for the project phase."}
          </p>
          <div className="md-two-content">
            <div>
              <h3>Business Objective</h3>
              <p>Ensure all design artifacts are complete, reviewed and approved by stakeholders before moving to the development phase.</p>
            </div>
            <div>
              <h3>Acceptance Criteria</h3>
              <ul className="md-check-list">
                <li><CheckCircle2 /> All BRD documents are approved.</li>
                <li><CheckCircle2 /> Functional specifications are finalized.</li>
                <li><CheckCircle2 /> System design and architecture are reviewed.</li>
                <li><CheckCircle2 /> UI/UX wireframes are approved.</li>
                <li><CheckCircle2 /> Dependencies are identified and documented.</li>
              </ul>
            </div>
          </div>
          <div className="md-business-rules">
            <h3>Business Rules</h3>
            <ul>
              <li>Design documents must follow the organization template.</li>
              <li>All changes must be version controlled.</li>
              <li>Stakeholder sign-off is mandatory.</li>
            </ul>
          </div>
        </section>

        <section className="md-card">
          <div className="md-card-heading">
            <h2>Deliverables</h2>
            <button type="button" onClick={() => setActiveTab("Deliverables")}>View All <ArrowUpRight size={13} /></button>
          </div>
          <div className="md-table-scroll">
            <table className="md-table">
              <thead><tr><th>Deliverable</th><th>Type</th><th>Status</th><th>Version</th></tr></thead>
              <tbody>
                {deliverables.slice(0, 5).map((item) => (
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
          <h2><CalendarDays size={15} /> Schedule & Timeline</h2>
          <button type="button" onClick={() => setActiveTab("Schedule & Progress")}>View Full Timeline <ArrowUpRight size={13} /></button>
        </div>
        <div className="md-timeline-layout">
          <div className="md-date-list">
            <p><span>Planned Start</span><strong>{start}</strong></p>
            <p><span>Actual Start</span><strong>17 May 2025</strong></p>
            <p><span>Planned End</span><strong>{end}</strong></p>
            <p><span>Baseline Duration</span><strong>{duration} Days</strong></p>
            <p><span>Elapsed Duration</span><strong>2 Days</strong></p>
            <p><span>Remaining Duration</span><strong>14 Days</strong></p>
          </div>
          <div className="md-gantt">
            <div className="md-gantt-months"><span>May 2025</span><span>Jun 2025</span></div>
            <div className="md-gantt-days">
              {Array.from({ length: 14 }, (_, index) => <span key={index}>{index + 12}</span>)}
            </div>
            <div className="md-gantt-line planned"><span /></div>
            <div className="md-gantt-line actual"><span style={{ width: `${progress}%` }} /></div>
            <div className="md-gantt-line remaining"><span /></div>
            <div className="md-today-line"><span>Today</span></div>
            <div className="md-gantt-legend">
              <span><i className="planned-dot" /> Planned</span>
              <span><i className="actual-dot" /> Actual</span>
              <span><i className="remaining-dot" /> Remaining</span>
              <span><i className="today-dot" /> Today</span>
            </div>
          </div>
        </div>
      </section>

      <div className="md-overview-grid">
        <section className="md-card">
          <div className="md-card-heading">
            <h2>Dependencies</h2>
            <button type="button" onClick={() => setActiveTab("Dependencies")}>View All</button>
          </div>
          <div className="md-table-scroll">
            <table className="md-table">
              <thead><tr><th>ID</th><th>Dependency</th><th>Type</th><th>Impact</th><th>Status</th></tr></thead>
              <tbody>
                {dependencies.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td><td>{item.title}</td><td>{item.type}</td>
                    <td><Status value={item.impact} /></td><td><Status value={item.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="md-card">
          <div className="md-card-heading">
            <h2>Linked Tasks</h2>
            <button type="button" onClick={() => setActiveTab("Tasks (8)")}>View All</button>
          </div>
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
                {tasks.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td><td>{item.title}</td><td><Status value={item.status} /></td>
                    <td>{item.progress}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );

  const renderSchedule = () => (
    <section className="md-card">
      <h2>Schedule & Progress</h2>
      <div className="md-progress-large">
        <div><span>Overall Milestone Progress</span><strong>{progress}%</strong></div>
        <div className="md-progress-track"><span style={{ width: `${progress}%` }} /></div>
      </div>
      <div className="md-detail-facts">
        <div><span>Planned Start</span><strong>{start}</strong></div>
        <div><span>Planned End</span><strong>{end}</strong></div>
        <div><span>Baseline Duration</span><strong>{duration} days</strong></div>
        <div><span>Completion Type</span><strong>Manual</strong></div>
        <div><span>Current Status</span><strong><Status value={status} /></strong></div>
        <div><span>Forecast End</span><strong>{end}</strong></div>
      </div>
      <div className="md-schedule-visual">
        <h3>Milestone Schedule</h3>
        <div className="md-schedule-track">
          <div className="md-schedule-baseline" />
          <div className="md-schedule-actual" style={{ width: `${progress}%` }} />
        </div>
        <div className="md-schedule-labels"><span>Planned</span><span>Actual progress</span></div>
      </div>
    </section>
  );

  const renderDeliverables = () => (
    <section className="md-card">
      <div className="md-card-heading">
        <h2>Deliverables & Acceptance</h2>
        <button type="button" onClick={() => alert("Connect deliverables API to add a deliverable.")}><Plus size={14} /> Add Deliverable</button>
      </div>
      <div className="md-table-scroll">
        <table className="md-table">
          <thead><tr><th>Deliverable</th><th>Type</th><th>Status</th><th>Version</th><th>Owner</th></tr></thead>
          <tbody>{deliverables.map((item) => <tr key={item.name}><td>{item.name}</td><td>{item.type}</td><td><Status value={item.status} /></td><td>{item.version}</td><td>{owner}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );

  const renderDependencies = () => (
    <section className="md-card">
      <div className="md-card-heading">
        <h2>Milestone Dependencies</h2>
        <button type="button" onClick={() => alert("Connect dependency API to add dependencies.")}><Plus size={14} /> Add Dependency</button>
      </div>
      <div className="md-table-scroll">
        <table className="md-table">
          <thead><tr><th>Dependency ID</th><th>Dependency</th><th>Relationship</th><th>Depends On</th><th>Impact</th><th>Status</th></tr></thead>
          <tbody>{dependencies.map((item) => <tr key={item.id}><td>{item.id}</td><td>{item.title}</td><td>{item.type}</td><td>{item.dependsOn}</td><td><Status value={item.impact} /></td><td><Status value={item.status} /></td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );

  const renderTasks = () => (
    <section className="md-card">
      <div className="md-card-heading">
        <h2>Linked Tasks</h2>
        <button type="button" onClick={() => alert("Connect task API to link a task.")}><Plus size={14} /> Link Task</button>
      </div>
      <div className="md-table-scroll">
        <table className="md-table">
          <thead><tr><th>Task ID</th><th>Task Title</th><th>Status</th><th>Progress</th><th>Owner</th></tr></thead>
          <tbody>{tasks.map((item) => <tr key={item.id}><td>{item.id}</td><td>{item.title}</td><td><Status value={item.status} /></td><td>{item.progress}%</td><td>{owner}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );

  const renderResources = () => (
    <section className="md-card">
      <div className="md-card-heading"><h2>Resources & Allocation</h2><button type="button" onClick={() => alert("Connect resource API to assign resources.")}><Plus size={14} /> Assign Resource</button></div>
      <div className="md-detail-facts">
        {stakeholders.map((person) => <div key={person.name}><span>{person.role}</span><strong>{person.name}</strong></div>)}
      </div>
    </section>
  );

  const renderDocuments = () => (
    <section className="md-card">
      <div className="md-card-heading"><h2>Documents & Attachments</h2><button type="button"><Paperclip size={14} /> Attach Document</button></div>
      <div className="md-table-scroll">
        <table className="md-table">
          <thead><tr><th>Document Name</th><th>Type</th><th>Version</th><th>Uploaded By</th><th>Uploaded On</th><th>Action</th></tr></thead>
          <tbody>{deliverables.slice(0, 3).map((item, index) => <tr key={item.name}><td>{item.name}</td><td>{item.type}</td><td>{item.version}</td><td>{owner}</td><td>16 May 2025</td><td><button className="md-table-action" type="button" aria-label={`Download ${item.name}`}><Download size={14} /></button></td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );

  const renderApprovals = () => (
    <section className="md-card">
      <h2>Approval Workflow</h2>
      <div className="md-approval-list">
        {stakeholders.map((person, index) => (
          <div className="md-approval-row" key={person.name}>
            <div className="md-avatar">{person.initials}</div>
            <div><strong>{person.name}</strong><small>{person.role}</small></div>
            <Status value={person.status} />
            <span>Step {index + 1}</span>
          </div>
        ))}
      </div>
    </section>
  );

  const renderComments = () => (
    <section className="md-card">
      <h2>Comments & Discussion</h2>
      <div className="md-comment-compose">
        <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write a comment..." rows={3} />
        <button type="button" onClick={addComment} disabled={!comment.trim()}>Add Comment</button>
      </div>
      {comments.map((item, index) => (
        <div className="md-comment" key={`${item.name}-${index}`}>
          <div className="md-avatar">{initials(item.name)}</div>
          <div><strong>{item.name}</strong><p>{item.text}</p><small>Recent comment</small></div>
        </div>
      ))}
    </section>
  );

  const renderHistory = () => (
    <section className="md-card">
      <h2>Milestone History</h2>
      {activities.map((item) => (
        <div className="md-history-row" key={item.date}>
          <History size={15} />
          <div><strong>{item.text}</strong><small>{item.date}</small></div>
        </div>
      ))}
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
          <div className="md-breadcrumb">Milestone Management <span>›</span> <Link href="/milestones">Milestone Registry</Link> <span>›</span> {milestone.id} — Milestone Detail</div>
          <h1>{milestone.id} — {title}</h1>
          <p>Project: <strong>{projectId} - AI-CMS Platform</strong><span>Module: <strong>Requirements Management</strong></span></p>
        </div>
        <div className="md-header-buttons">
          <Link href={`/milestones/${encodeURIComponent(milestone.id)}/edit`} className="md-button"><Edit3 size={14} /> Edit Milestone</Link>
          <button className="md-button" type="button"><MoreHorizontal size={15} /> More Actions <ArrowDown size={12} /></button>
          <button className="md-button" type="button"><Download size={14} /> Export</button>
        </div>
      </div>

      <section className="md-hero">
        <div className="md-hero-facts">
          <div><span>Milestone ID</span><strong>{milestone.id}</strong></div>
          <div><span>Milestone Type</span><strong>{type}</strong></div>
          <div><span>Status</span><strong><Status value={status} /></strong></div>
          <div><span>Priority</span><strong><Status value={priority} /></strong></div>
          <div><span>Planned Start</span><strong>{start}</strong></div>
          <div><span>Planned End</span><strong>{end}</strong></div>
          <div><span>Owner</span><strong>{owner}</strong></div>
          <div><span>Approval Status</span><strong><Status value="In Review" /></strong></div>
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
            <p className="md-summary-description">This milestone represents the completion of the required project deliverables and stakeholder approvals.</p>
            <dl className="md-summary-list">
              <div><dt>Project</dt><dd>{projectId} - AI-CMS Platform</dd></div>
              <div><dt>Module</dt><dd>Requirements Management</dd></div>
              <div><dt>Milestone Type</dt><dd>{type} Milestone</dd></div>
              <div><dt>Priority</dt><dd><Status value={priority} /></dd></div>
              <div><dt>Status</dt><dd><Status value={status} /></dd></div>
              <div><dt>Progress</dt><dd>{progress}%</dd></div>
              <div><dt>Planned Start</dt><dd>{start}</dd></div>
              <div><dt>Planned End</dt><dd>{end}</dd></div>
              <div><dt>Owner</dt><dd>{owner}</dd></div>
              <div><dt>Approval Status</dt><dd><Status value="In Review" /></dd></div>
            </dl>
          </section>

          <section className="md-card">
            <h2>Approval Workflow</h2>
            <div className="md-workflow">
              {[
                ["Submitted", "18 May 2025, 10:15 AM by Pooja Singh", "done"],
                ["In Review", "Currently with stakeholders for review", "active"],
                ["Approved", "Pending final approval", ""],
                ["Released", "To be marked as released", ""],
              ].map(([name, detail, state]) => (
                <div className={`md-workflow-step ${state}`} key={name}>
                  <span>{state === "done" ? <CheckCircle2 size={15} /> : <Circle size={15} />}</span>
                  <div><strong>{name}</strong><small>{detail}</small></div>
                </div>
              ))}
            </div>
          </section>

          <section className="md-card">
            <div className="md-card-heading"><h2>Stakeholders</h2><button type="button" onClick={() => setActiveTab("Resources (4)")}>View All</button></div>
            {stakeholders.map((person) => (
              <div className="md-person-row" key={person.name}>
                <div className="md-avatar">{person.initials}</div>
                <div><strong>{person.name}</strong><small>{person.role}</small></div>
                <Status value={person.status} />
              </div>
            ))}
            <strong className="md-total-stakeholders">Total Stakeholders: 4</strong>
          </section>

          <section className="md-card">
            <div className="md-card-heading"><h2>Milestone Activity</h2><button type="button" onClick={() => setShowAllActivity((value) => !value)}>{showAllActivity ? "Show Less" : "View All"}</button></div>
            {activities.slice(0, showAllActivity ? activities.length : 3).map((item) => (
              <div className="md-activity-row" key={item.date}>
                <div className="md-activity-dot" />
                <div><strong>{item.date}</strong><p>{item.text}</p></div>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </section>
  );
}
