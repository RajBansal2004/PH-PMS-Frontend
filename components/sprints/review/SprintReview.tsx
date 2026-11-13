
"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  Activity, AlertCircle, ArrowDownToLine, ArrowRight, Check,
  CheckCircle2, ChevronDown, Circle, ClipboardCheck, Clock3,
  Download, FileText, Flag, Heart, Lightbulb, MessageSquare,
  MoreHorizontal, Paperclip, PlayCircle, Plus, Share2, ShieldCheck,
  Star, Target, ThumbsDown, ThumbsUp, X, BarChart3, CalendarDays,
} from "lucide-react";
import "./sprint-review.css";

type Item = {
  id: string;
  title: string;
  type: string;
  points: number;
  assignee: string;
};

const completedItems: Item[] = [
  { id: "REQ-045", title: "Report Dashboard", type: "Requirement", points: 8, assignee: "Neha Patel" },
  { id: "REQ-046", title: "Advanced Filters", type: "Requirement", points: 5, assignee: "Amit Kumar" },
  { id: "REQ-047", title: "Data Export (CSV/Excel)", type: "Requirement", points: 5, assignee: "Rahul Verma" },
  { id: "TASK-212", title: "API - Reports Data Service", type: "Task", points: 5, assignee: "Vikram Singh" },
  { id: "TASK-213", title: "Charts & Graphs Component", type: "Task", points: 5, assignee: "Pooja Singh" },
  { id: "TASK-214", title: "Export Functionality", type: "Task", points: 3, assignee: "Neha Patel" },
  { id: "TASK-215", title: "Role Based Access for Reports", type: "Task", points: 3, assignee: "Amit Kumar" },
  { id: "TASK-216", title: "Unit Testing", type: "Task", points: 2, assignee: "Rahul Verma" },
  { id: "TASK-217", title: "Documentation", type: "Task", points: 2, assignee: "Vikram Singh" },
];

const inProgressItems: Item[] = [
  { id: "TASK-218", title: "Email Reports", type: "Task", points: 1, assignee: "Pooja Singh" },
  { id: "TASK-219", title: "Mobile View for Reports", type: "Task", points: 1, assignee: "Amit Kumar" },
];

const notCompletedItems = [
  { id: "TASK-220", title: "Scheduled Reports", type: "Task", points: 1, assignee: "Rahul Verma", reason: "Dependencies" },
];

const deliverables = [
  ["Reports Dashboard", "Interactive dashboard with KPIs", "Demoed", "Neha Patel"],
  ["Advanced Filters", "Multi-level filters for reports", "Demoed", "Amit Kumar"],
  ["Export Functionality", "Export reports to CSV/Excel/PDF", "Demoed", "Rahul Verma"],
  ["Role Based Access", "Access control for report visibility", "Demoed", "Neha Patel"],
];

const issues = [
  ["ISS-021", "Export fails for large datasets", "High", "Open", "Vikram Singh"],
  ["ISS-022", "Chart misalignment in mobile", "Medium", "Open", "Amit Kumar"],
];

const actions = [
  ["Improve unit test coverage", "Rahul Verma", "10 Jun 2025", "Open"],
  ["Automate report test cases", "Amit Kumar", "10 Jun 2025", "Open"],
  ["Optimize export performance", "Vikram Singh", "11 Jun 2025", "Open"],
];

const feedback = [
  ["Neha Patel", "Product Owner", "Positive", 5, "Good progress and great demo. Reports dashboard looks excellent!", "06 Jun 2025, 11:30 AM"],
  ["Amit Kumar", "Project Manager", "Positive", 4, "Export feature works well. Please fix performance issue for large data.", "06 Jun 2025, 11:45 AM"],
  ["Rahul Verma", "QA Lead", "Neutral", 3, "Overall good, but need better test coverage and edge case scenarios.", "06 Jun 2025, 12:00 PM"],
  ["Vikram Singh", "Delivery Manager", "Positive", 5, "Happy with the progress and team effort. Keep it up!", "06 Jun 2025, 12:15 PM"],
];

const tabs = [
  "1. Review Summary",
  "2. Completed Items",
  "3. Demo & Deliverables",
  "4. Feedback & Comments",
  "5. Retrospective",
  "6. Action Items",
  "7. Approval & Close",
];

function Donut({
  value,
  label,
  color = "#008B52",
  children,
}: {
  value: number;
  label: string;
  color?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="sr-donut"
      style={{
        background: `conic-gradient(${color} 0 ${value}%, #0754f9 ${value}% 92%, #aab5cd 92% 97%, #e8edf5 97% 100%)`,
      }}
    >
      <div className="sr-donut-center">
        <strong>{label}</strong>
        {children}
      </div>
    </div>
  );
}

function Card({
  title,
  children,
  className = "",
  action,
  id,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  id?: string;
}) {
  return (
    <section className={`sr-card ${className}`} id={id}>
      <div className="sr-card-head">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}


type StatusProps = {
  children: ReactNode;
};

function Status({ children }: StatusProps) {
  const label = String(children ?? "");
  const statusClass = label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");

  return (
    <span className={`sr-status ${statusClass}`}>
      {children}
    </span>
  );
}

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number | React.ReactNode)[][];
}) {
  return (
    <div className="sr-table-wrap">
      <table className="sr-table">
        <thead>
          <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => <td key={j}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BurndownChart() {
  return (
    <div className="sr-burndown-wrap">
      <svg viewBox="0 0 520 205" className="sr-burndown" role="img" aria-label="Sprint burndown chart">
        {[35, 75, 115, 155].map((y) => (
          <line key={y} x1="38" y1={y} x2="500" y2={y} stroke="#edf1f7" strokeWidth="1" />
        ))}
        {[40, 30, 20, 10, 0].map((n, i) => (
          <text key={n} x="22" y={39 + i * 40} textAnchor="end" fill="#34466d" fontSize="9">{n}</text>
        ))}
        <polyline
          points="40,35 90,45 140,55 190,65 240,75 290,85 340,95 390,105 440,115 490,125"
          fill="none" stroke="#0754f9" strokeWidth="2" strokeDasharray="5 4"
        />
        <polyline
          points="40,35 75,52 110,68 145,80 180,91 215,102 250,113 285,123 320,132 355,143 390,154 425,165 460,177 490,187"
          fill="none" stroke="#008B52" strokeWidth="2.5"
        />
        {[
          [40,35],[75,52],[110,68],[145,80],[180,91],[215,102],
          [250,113],[285,123],[320,132],[355,143],[390,154],[425,165],[460,177],[490,187],
        ].map(([x,y],i) => <circle key={i} cx={x} cy={y} r="2.7" fill="#008B52" />)}
        {["23 May","25 May","27 May","29 May","31 May","02 Jun","04 Jun","06 Jun"].map((d,i) => (
          <text key={d} x={40 + i * 64} y="202" textAnchor="middle" fill="#34466d" fontSize="8">{d}</text>
        ))}
        <line x1="450" y1="20" x2="465" y2="20" stroke="#0754f9" strokeWidth="2" strokeDasharray="4 3" />
        <text x="470" y="23" fill="#34466d" fontSize="9">Ideal</text>
        <line x1="450" y1="34" x2="465" y2="34" stroke="#008B52" strokeWidth="2.5" />
        <text x="470" y="37" fill="#34466d" fontSize="9">Actual</text>
      </svg>
    </div>
  );
}

export default function SprintReview({ sprintId = "SPR-005" }: { sprintId?: string }) {
  const [activeTab, setActiveTab] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [approved, setApproved] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [comment, setComment] = useState("");
  const [toast, setToast] = useState("");
  const [nextSteps, setNextSteps] = useState([true, false, false, false]);

  const sprintCode = sprintId.toUpperCase();
  const progressRows = useMemo(
    () => completedItems.map((item) => [
      <span className="sr-link" key={item.id}>{item.id}</span>,
      item.title,
      item.type,
      `${item.points} SP`,
      <Status key="done">Done</Status>,
      item.assignee,
    ]),
    []
  );

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const scrollToTab = (index: number) => {
    setActiveTab(index);
    const ids = [
      "sr-summary", "sr-completed", "sr-deliverables",
      "sr-feedback", "sr-retrospective", "sr-actions", "sr-approval",
    ];
    document.getElementById(ids[index])?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const exportReport = () => {
    const content = [
      "Sprint Review Report",
      `Sprint: ${sprintCode}`,
      "Project: PRJ-001 - AI-CMS Platform",
      "Milestone: MLS-002 - Module Development",
      "Completed: 29 SP of 32 SP",
      "",
      "Completed Items",
      ...completedItems.map((item) => `${item.id},${item.title},${item.points} SP,${item.assignee}`),
    ].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sprintCode}-review-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Report exported.");
  };

  return (
    <main className="sr-page">
      <div className="sr-toolbar">
        <div className="sr-crumb">
          <a href="/sprints">Sprint Management</a>
          <span>›</span>
          <a href="/sprints">Sprint Registry</a>
          <span>›</span>
          <strong>Sprint Review ({sprintCode})</strong>
        </div>
        <div className="sr-toolbar-actions">
          <button onClick={exportReport}><Download size={13} /> Download Report</button>
          <button onClick={() => notify("Share link copied.")}><Share2 size={13} /> Share</button>
          <div className="sr-menu-wrap">
            <button onClick={() => setMenuOpen(!menuOpen)}>More Actions <ChevronDown size={12} /></button>
            {menuOpen && (
              <div className="sr-dropdown">
                <button onClick={() => { setMenuOpen(false); notify("Review saved as template."); }}>Save as Template</button>
                <button onClick={() => { setMenuOpen(false); exportReport(); }}>Export CSV</button>
                <button onClick={() => { setMenuOpen(false); notify("Print dialog is ready."); window.print(); }}>Print Review</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <header className="sr-heading">
        <div>
          <div className="sr-heading-title">
            <FileText size={23} className="sr-heading-icon" />
            <h1>Sprint Review ({sprintCode})</h1>
            <Status>{approved ? "Completed" : "In Review"}</Status>
          </div>
          <strong className="sr-subtitle">Reports & Analytics Sprint</strong>
          <p>Review the work completed in this sprint and collect feedback from stakeholders.</p>
        </div>
        <div className="sr-heading-buttons">
          <button className="sr-primary" onClick={() => setShowModal(true)}>
            <CheckCircle2 size={13} /> {approved ? "Sprint Approved" : "Approve & Close Sprint"}
          </button>
          <button className="sr-outline" onClick={() => { setApproved(false); notify("Sprint reopened."); }}>
            Re-open Sprint
          </button>
        </div>
      </header>

      <section className="sr-info">
        {[
          ["Project", "PRJ-001 - AI-CMS Platform"],
          ["Milestone", "MLS-002 - Module Development"],
          ["Sprint", `${sprintCode} - Reports & Analytics Sprint`],
          ["Duration", "23 May 2025 - 06 Jun 2025 (14 Days)"],
          ["Sprint Owner", "Pooja Singh", "Scrum Master"],
          ["Status", approved ? "Completed" : "In Review"],
          ["Total Story Points", "32 SP"],
          ["Completed", "29 SP (90.63%)"],
        ].map(([label, value, sub]) => (
          <div key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
            {sub && <span>{sub}</span>}
          </div>
        ))}
      </section>

      <nav className="sr-tabs">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            className={activeTab === i ? "active" : ""}
            onClick={() => scrollToTab(i)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* ROW 1: REVIEW SUMMARY */}
      <section className="sr-summary" id="sr-summary">
        <Card title="Sprint Goal" className="sr-goal-card">
          <p>Deliver reports and analytics module with dashboards, exports, and insights.</p>
          <strong className="sr-achieved"><CheckCircle2 size={13} /> Goal Achieved</strong>
          <Target className="sr-target-art" size={65} strokeWidth={1.2} />
        </Card>

        <Card title="Sprint Progress" className="sr-progress-card">
          <div className="sr-chart-line">
            <Donut value={90.63} label="90.63%">
              <span>Completed</span>
            </Donut>
            <div className="sr-legend">
              <p><i className="green" /> Completed <b>29 SP (90.63%)</b></p>
              <p><i className="blue" /> In Progress <b>2 SP (6.25%)</b></p>
              <p><i className="red" /> Not Completed <b>1 SP (3.12%)</b></p>
            </div>
          </div>
        </Card>

        <Card title="Story Points Overview" className="sr-points-card">
          <div className="sr-point-list">
            <p><span className="sr-point-icon blue"><ClipboardCheck size={15}/></span><b>32 SP</b><small>Committed</small></p>
            <p><span className="sr-point-icon orange"><FileText size={15}/></span><b>29 SP</b><small>Completed</small></p>
            <p><span className="sr-point-icon red">2</span><b>2 SP</b><small>In Progress</small></p>
            <p><span className="sr-point-icon pale">1</span><b>1 SP</b><small>Not Completed</small></p>
          </div>
        </Card>

        <Card title="Burndown Chart" className="sr-burndown-card">
          <BurndownChart />
        </Card>

        <Card title="Sprint Health" className="sr-health-card">
          <div className="sr-health">
            <span><Heart size={22}/></span>
            <strong>Good</strong>
          </div>
          <p>Everything is on track.</p>
          <div className="sr-health-row"><span>Scope Change</span><b>0</b></div>
          <div className="sr-health-row"><span>Blockers</span><b>0</b></div>
          <div className="sr-health-row"><span>Risks</span><b>1</b></div>
          <div className="sr-health-row"><span>Open Issues</span><b>2</b></div>
        </Card>
      </section>

      {/* ROW 2: COMPLETED / IN PROGRESS / FEEDBACK */}
      <section className="sr-work-grid">
        <Card title="Completed Items (9)" className="sr-completed-card" id="sr-completed">
          <Table
            headers={["ID", "Title", "Type", "Story Points", "Status", "Assignee"]}
            rows={progressRows}
          />
          <div className="sr-table-footer">
            <b>Total Completed</b><strong>29 SP (90.63%)</strong>
            <button onClick={() => notify("Showing all completed items.")}>View All</button>
          </div>
        </Card>

        <div className="sr-middle-stack">
          <Card title="In Progress Items (2)">
            <Table
              headers={["ID", "Title", "Type", "Story Points", "Assignee", "% Complete"]}
              rows={inProgressItems.map((item, i) => [
                <span className="sr-link" key={item.id}>{item.id}</span>,
                item.title, item.type, `${item.points} SP`, item.assignee,
                <div className="sr-percent" key={i}><span style={{ width: `${i === 0 ? 60 : 40}%` }} />{i === 0 ? "60%" : "40%"}</div>,
              ])}
            />
            <div className="sr-table-footer"><b>Total In Progress</b><strong>2 SP (6.25%)</strong><button onClick={() => notify("Showing all in-progress items.")}>View All</button></div>
          </Card>
          <Card title="Not Completed Items (1)">
            <Table
              headers={["ID", "Title", "Type", "Story Points", "Assignee", "Reason"]}
              rows={notCompletedItems.map((item) => [
                <span className="sr-link" key={item.id}>{item.id}</span>,
                item.title, item.type, `${item.points} SP`, item.assignee,
                <Status key="reason">Dependencies</Status>,
              ])}
            />
            <div className="sr-table-footer"><b>Total Not Completed</b><strong>1 SP</strong><button onClick={() => notify("Showing all incomplete items.")}>View All</button></div>
          </Card>
        </div>

        <Card title="Stakeholder Feedback Summary" className="sr-feedback-summary">
          <div className="sr-chart-line">
            <Donut value={75} label="4"><span>Total</span></Donut>
            <div className="sr-legend">
              <p><i className="green" /> Positive <b>3 (75%)</b></p>
              <p><i className="orange" /> Neutral <b>1 (25%)</b></p>
              <p><i className="red" /> Negative <b>0 (0%)</b></p>
            </div>
          </div>
          <div className="sr-overall-feedback">
            <b>Overall Feedback</b><Status>Positive</Status>
          </div>
          <p>Stakeholders are satisfied with the progress and quality.</p>
        </Card>
      </section>

      {/* ROW 3: DELIVERABLES / ISSUES / RETROSPECTIVE / ACTIONS */}
      <section className="sr-detail-grid">
        <Card title="Demo & Deliverables" className="sr-deliverables-card" id="sr-deliverables">
          <Table
            headers={["Deliverable", "Description", "Demo Status", "Owner"]}
            rows={deliverables.map((d) => [
              d[0], d[1], <Status key={d[0]}>{d[2]}</Status>, d[3],
            ])}
          />
          <button className="sr-text-action" onClick={() => notify("Demo recording preview is not connected yet.")}>
            View Demo Recording <PlayCircle size={12}/>
          </button>
        </Card>

        <Card title="Open Issues (2)" className="sr-issues-card">
          <Table
            headers={["ID", "Title", "Priority", "Status", "Assignee"]}
            rows={issues.map((item) => [
              <span className="sr-link" key={item[0]}>{item[0]}</span>,
              item[1],
              <Status key="priority">{item[2]}</Status>,
              <Status key="status">{item[3]}</Status>,
              item[4],
            ])}
          />
          <button className="sr-text-action" onClick={() => notify("Showing all sprint issues.")}>View All Issues</button>
        </Card>

        <Card title="Retrospective Summary" className="sr-retro-card" id="sr-retrospective">
          <div className="sr-retro-lines">
            <div><b>What Went Well</b><ul><li>Good collaboration and communication</li><li>Stories were well estimated</li></ul></div>
            <div><b>What Can Improve</b><ul><li>Better unit test coverage</li><li>Early discovery of dependencies</li></ul></div>
            <div><b>Action for Next Sprint</b><ul><li>Improve test automation</li><li>Identify dependencies early</li></ul></div>
          </div>
        </Card>

        <Card title="Action Items (3)" className="sr-actions-card" id="sr-actions">
          <Table
            headers={["Action", "Owner", "Due Date", "Status"]}
            rows={actions.map((item) => [
              item[0], item[1], item[2], <Status key={item[0]}>{item[3]}</Status>,
            ])}
          />
          <button className="sr-text-action" onClick={() => notify("Showing all action items.")}>View All Actions</button>
        </Card>
      </section>

      {/* ROW 4: STAKEHOLDER FEEDBACK + NEXT STEPS */}
      <section className="sr-footer-grid">
        <Card title="Stakeholder Feedback" className="sr-stakeholder-card" id="sr-feedback">
          <Table
            headers={["Stakeholder", "Role", "Feedback", "Rating", "Comments", "Submitted On"]}
            rows={feedback.map((item) => [
              item[0], item[1],
              <Status key={item[0]}>{item[2]}</Status>,
              <span className="sr-stars" key="stars">{"★".repeat(Number(item[3]))}<span>{"★".repeat(5 - Number(item[3]))}</span></span>,
              item[4], item[5],
            ])}
          />
        </Card>

        <Card title="Next Steps" className="sr-next-card" id="sr-approval">
          <ul className="sr-next-list">
            {[
              "Collect all feedback and finalize action items",
              "Approve sprint and close it",
              "Update backlog based on review",
              "Plan next sprint",
            ].map((step, i) => (
              <li key={step}>
                <button
                  className={nextSteps[i] ? "checked" : ""}
                  onClick={() => setNextSteps((old) => old.map((v, j) => i === j ? !v : v))}
                >
                  {nextSteps[i] ? <CheckCircle2 size={13}/> : <Circle size={13}/>}
                </button>
                <span className={nextSteps[i] ? "done" : ""}>{step}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {showModal && (
        <div className="sr-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="sr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sr-modal-head">
              <h3>Approve & Close Sprint</h3>
              <button onClick={() => setShowModal(false)}><X size={16}/></button>
            </div>
            <p>Are you sure you want to approve and close sprint {sprintCode}?</p>
            <label>Approval comment (optional)</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add your approval comment..." />
            <div className="sr-modal-actions">
              <button className="sr-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="sr-primary" onClick={() => { setApproved(true); setShowModal(false); notify("Sprint review approved. Connect backend to persist this action."); }}>Confirm Approval</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="sr-toast">{toast}<button onClick={() => setToast("")}><X size={13}/></button></div>}
    </main>
  );
}
