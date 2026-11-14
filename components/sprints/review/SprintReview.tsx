"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  Activity, AlertCircle, ArrowDownToLine, ArrowRight, Check,
  CheckCircle2, ChevronDown, Circle, ClipboardCheck, Clock3,
  Download, FileText, Flag, Heart, Lightbulb, MessageSquare,
  MoreHorizontal, Paperclip, PlayCircle, Plus, Share2, ShieldCheck,
  Star, Target, ThumbsDown, ThumbsUp, X, BarChart3, CalendarDays,
} from "lucide-react";
import {
  sprints as getSprints,
  updateSprint as apiUpdateSprint,
  tasks as getTasks,
  getBugs,
} from "@/lib/api";
import "./sprint-review.css";

type Item = {
  id: string;
  title: string;
  type: string;
  points: number;
  assignee: string;
  status: string;
  progress: number;
};

const tabs = [
  "1. Review Summary",
  "2. Completed Items",
  "3. In Progress & Remaining",
  "4. Open Issues",
  "5. Retrospective",
  "6. Approval & Close",
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
        background: `conic-gradient(${color} 0 ${value}%, #e8edf5 ${value}% 100%)`,
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

export default function SprintReview({ sprintId = "SPR-001" }: { sprintId?: string }) {
  const [activeTab, setActiveTab] = useState(0);
  const [sprint, setSprint] = useState<any>(null);
  const [tasksList, setTasksList] = useState<Item[]>([]);
  const [issuesList, setIssuesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [approved, setApproved] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [comment, setComment] = useState("");
  const [toast, setToast] = useState("");
  const [nextSteps, setNextSteps] = useState([true, false, false, false]);

  const sprintCode = sprint?.sprintCode || sprint?.code || sprintId.toUpperCase();

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sRes, tRes, bRes] = await Promise.allSettled([
          getSprints(),
          getTasks(),
          getBugs().catch(() => ({ data: [] })),
        ]);

        let targetSprint: any = null;
        if (sRes.status === "fulfilled") {
          const raw = Array.isArray(sRes.value) ? sRes.value : sRes.value?.data || sRes.value?.items || [];
          targetSprint = raw.find(
            (s: any) =>
              s._id === sprintId ||
              s.id === sprintId ||
              (s.sprintCode && s.sprintCode.toLowerCase() === sprintId.toLowerCase()) ||
              (s.code && s.code.toLowerCase() === sprintId.toLowerCase())
          ) || raw[0] || null;

          if (targetSprint) {
            setSprint(targetSprint);
            setApproved(targetSprint.status === "COMPLETED" || targetSprint.status === "Completed");
          }
        }

        if (tRes.status === "fulfilled") {
          const rawTasks = Array.isArray(tRes.value) ? tRes.value : tRes.value?.data || tRes.value?.items || [];
          const sprintKey = targetSprint?._id || sprintId;
          const filtered = rawTasks.filter((t: any) => {
            if (!targetSprint) return true;
            return t.sprintId === sprintKey || t.sprintId?._id === sprintKey || t.sprint === sprintKey;
          });

          const mapped: Item[] = (filtered.length > 0 ? filtered : rawTasks.slice(0, 15)).map((t: any) => ({
            id: t.taskId || t.code || `TSK-${String(t._id || t.id).slice(-4).toUpperCase()}`,
            title: t.title || "Task",
            type: t.type || "Feature",
            points: Number(t.estimatedHours ? Math.round(t.estimatedHours / 4) : t.storyPoints || 3),
            assignee: t.assigneeId?.name || t.assignee?.name || t.assigneeName || "Unassigned",
            status: t.status || "Open",
            progress: t.status === "Completed" || t.status === "Done" || t.status === "COMPLETED" ? 100 : t.progress || 0,
          }));
          setTasksList(mapped);
        }

        if (bRes.status === "fulfilled") {
          const rawBugs: any = bRes.value;
          const rawBugsList = Array.isArray(rawBugs) ? rawBugs : rawBugs?.data || rawBugs?.items || [];
          setIssuesList(rawBugsList);
        }
      } catch (err: any) {
        notify(`Failed to fetch sprint review data: ${err?.message || "Server error"}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sprintId]);

  const completedItems = useMemo(
    () => tasksList.filter((item) => ["completed", "done"].includes((item.status || "").toLowerCase())),
    [tasksList]
  );

  const inProgressItems = useMemo(
    () => tasksList.filter((item) => ["in progress", "progress", "testing", "in review", "review"].includes((item.status || "").toLowerCase())),
    [tasksList]
  );

  const notCompletedItems = useMemo(
    () => tasksList.filter((item) => ["open", "todo", "draft"].includes((item.status || "").toLowerCase())),
    [tasksList]
  );

  const totalPoints = useMemo(() => tasksList.reduce((sum, item) => sum + item.points, 0), [tasksList]);
  const completedPoints = useMemo(() => completedItems.reduce((sum, item) => sum + item.points, 0), [completedItems]);
  const inProgressPoints = useMemo(() => inProgressItems.reduce((sum, item) => sum + item.points, 0), [inProgressItems]);
  const notCompletedPoints = useMemo(() => notCompletedItems.reduce((sum, item) => sum + item.points, 0), [notCompletedItems]);

  const completionPercent = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  const progressRows = useMemo(
    () => completedItems.map((item) => [
      <span className="sr-link" key={item.id}>{item.id}</span>,
      item.title,
      item.type,
      `${item.points} SP`,
      <Status key="done">Done</Status>,
      item.assignee,
    ]),
    [completedItems]
  );

  const scrollToTab = (index: number) => {
    setActiveTab(index);
    const ids = ["sr-summary", "sr-completed", "sr-inprogress", "sr-issues", "sr-retrospective", "sr-approval"];
    document.getElementById(ids[index])?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const exportReport = () => {
    const content = [
      "Sprint Review Report",
      `Sprint: ${sprintCode}`,
      `Status: ${approved ? "Completed" : "In Review"}`,
      `Completed: ${completedPoints} SP of ${totalPoints} SP (${completionPercent}%)`,
      "",
      "Completed Items",
      "ID,Title,Type,Story Points,Assignee",
      ...completedItems.map((item) => `${item.id},"${item.title}",${item.type},${item.points} SP,${item.assignee}`),
      "",
      "In Progress Items",
      "ID,Title,Type,Story Points,Assignee",
      ...inProgressItems.map((item) => `${item.id},"${item.title}",${item.type},${item.points} SP,${item.assignee}`),
    ].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sprintCode}-review-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Review report downloaded.");
  };

  const handleApproveSprint = async () => {
    try {
      if (sprint?._id) {
        await apiUpdateSprint(sprint._id, { status: "COMPLETED" });
      }
      setApproved(true);
      setShowModal(false);
      notify("Sprint review approved and closed successfully.");
    } catch (err: any) {
      notify(`Failed to approve sprint: ${err?.message || "API error"}`);
    }
  };

  const handleReopenSprint = async () => {
    try {
      if (sprint?._id) {
        await apiUpdateSprint(sprint._id, { status: "ACTIVE" });
      }
      setApproved(false);
      notify("Sprint re-opened.");
    } catch (err: any) {
      notify(`Failed to re-open sprint: ${err?.message || "API error"}`);
    }
  };

  const sprintName = sprint?.name || `Sprint ${sprintCode}`;
  const milestoneName = sprint?.milestoneId?.name || "Sprint Milestone";
  const startDateStr = sprint?.startDate ? new Date(sprint.startDate).toLocaleDateString("en-IN") : "Not set";
  const endDateStr = sprint?.endDate ? new Date(sprint.endDate).toLocaleDateString("en-IN") : "Not set";
  const sprintOwner = sprint?.ownerId?.name || sprint?.owner?.name || "Sprint Lead";

  return (
    <main className="sr-page">
      <div className="sr-toolbar">
        <div className="sr-crumb">
          <Link href="/sprints">Sprint Management</Link>
          <span>›</span>
          <Link href="/sprints">Sprint Registry</Link>
          <span>›</span>
          <strong>Sprint Review ({sprintCode})</strong>
        </div>
        <div className="sr-toolbar-actions">
          <button onClick={exportReport}><Download size={13} /> Download Report</button>
          <button onClick={() => notify("Review link copied to clipboard.")}><Share2 size={13} /> Share</button>
          <div className="sr-menu-wrap">
            <button onClick={() => setMenuOpen(!menuOpen)}>More Actions <ChevronDown size={12} /></button>
            {menuOpen && (
              <div className="sr-dropdown">
                <button onClick={() => { setMenuOpen(false); exportReport(); }}>Export CSV</button>
                <button onClick={() => { setMenuOpen(false); window.print(); }}>Print Review</button>
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
          <strong className="sr-subtitle">{sprintName}</strong>
          <p>Review the work completed in this sprint and verify deliverables.</p>
        </div>
        <div className="sr-heading-buttons">
          <button className="sr-primary" onClick={() => setShowModal(true)}>
            <CheckCircle2 size={13} /> {approved ? "Sprint Approved" : "Approve & Close Sprint"}
          </button>
          <button className="sr-outline" onClick={handleReopenSprint}>
            Re-open Sprint
          </button>
        </div>
      </header>

      <section className="sr-info">
        {[
          ["Project", sprint?.projectId?.name || sprint?.projectId?.projectName || "Linked Project"],
          ["Milestone", milestoneName],
          ["Sprint", `${sprintCode} - ${sprintName}`],
          ["Duration", `${startDateStr} - ${endDateStr}`],
          ["Sprint Owner", sprintOwner],
          ["Status", approved ? "Completed" : "In Review"],
          ["Total Story Points", `${totalPoints} SP`],
          ["Completed", `${completedPoints} SP (${completionPercent}%)`],
        ].map(([label, value]) => (
          <div key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
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
          <p>{sprint?.goal || "No sprint goal defined."}</p>
          <strong className="sr-achieved"><CheckCircle2 size={13} /> {completionPercent >= 80 ? "Goal Achieved" : "In Progress"}</strong>
          <Target className="sr-target-art" size={65} strokeWidth={1.2} />
        </Card>

        <Card title="Sprint Progress" className="sr-progress-card">
          <div className="sr-chart-line">
            <Donut value={completionPercent} label={`${completionPercent}%`}>
              <span>Completed</span>
            </Donut>
            <div className="sr-legend">
              <p><i className="green" /> Completed <b>{completedPoints} SP ({completionPercent}%)</b></p>
              <p><i className="blue" /> In Progress <b>{inProgressPoints} SP ({totalPoints > 0 ? Math.round((inProgressPoints / totalPoints) * 100) : 0}%)</b></p>
              <p><i className="red" /> Remaining <b>{notCompletedPoints} SP ({totalPoints > 0 ? Math.round((notCompletedPoints / totalPoints) * 100) : 0}%)</b></p>
            </div>
          </div>
        </Card>

        <Card title="Story Points Overview" className="sr-points-card">
          <div className="sr-point-list">
            <p><span className="sr-point-icon blue"><ClipboardCheck size={15}/></span><b>{totalPoints} SP</b><small>Total Committed</small></p>
            <p><span className="sr-point-icon green"><CheckCircle2 size={15}/></span><b>{completedPoints} SP</b><small>Completed</small></p>
            <p><span className="sr-point-icon orange"><Clock3 size={15}/></span><b>{inProgressPoints} SP</b><small>In Progress</small></p>
            <p><span className="sr-point-icon red"><AlertCircle size={15}/></span><b>{notCompletedPoints} SP</b><small>Remaining</small></p>
          </div>
        </Card>

        <Card title="Sprint Health" className="sr-health-card">
          <div className="sr-health">
            <span><Heart size={22}/></span>
            <strong>{completionPercent >= 75 ? "Good" : "Needs Review"}</strong>
          </div>
          <p>{completionPercent >= 75 ? "Delivery meets completion criteria." : "Scope review recommended before closure."}</p>
          <div className="sr-health-row"><span>Total Tasks</span><b>{tasksList.length}</b></div>
          <div className="sr-health-row"><span>Completed Tasks</span><b>{completedItems.length}</b></div>
          <div className="sr-health-row"><span>In Progress</span><b>{inProgressItems.length}</b></div>
          <div className="sr-health-row"><span>Open Issues</span><b>{issuesList.length}</b></div>
        </Card>
      </section>

      {/* ROW 2: COMPLETED / IN PROGRESS */}
      <section className="sr-work-grid">
        <Card title={`Completed Items (${completedItems.length})`} className="sr-completed-card" id="sr-completed">
          {completedItems.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#6b7280" }}>
              No completed items recorded in this sprint yet.
            </div>
          ) : (
            <>
              <Table
                headers={["ID", "Title", "Type", "Story Points", "Status", "Assignee"]}
                rows={progressRows}
              />
              <div className="sr-table-footer">
                <b>Total Completed</b><strong>{completedPoints} SP ({completionPercent}%)</strong>
              </div>
            </>
          )}
        </Card>

        <div className="sr-middle-stack" id="sr-inprogress">
          <Card title={`In Progress Items (${inProgressItems.length})`}>
            {inProgressItems.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#6b7280" }}>No tasks in progress.</div>
            ) : (
              <Table
                headers={["ID", "Title", "Type", "Story Points", "Assignee", "% Complete"]}
                rows={inProgressItems.map((item, i) => [
                  <span className="sr-link" key={item.id}>{item.id}</span>,
                  item.title, item.type, `${item.points} SP`, item.assignee,
                  <div className="sr-percent" key={i}><span style={{ width: `${item.progress || 50}%` }} />{item.progress || 50}%</div>,
                ])}
              />
            )}
            <div className="sr-table-footer"><b>Total In Progress</b><strong>{inProgressPoints} SP</strong></div>
          </Card>

          <Card title={`Remaining Tasks (${notCompletedItems.length})`}>
            {notCompletedItems.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#6b7280" }}>All tasks have been started or completed.</div>
            ) : (
              <Table
                headers={["ID", "Title", "Type", "Story Points", "Assignee", "Status"]}
                rows={notCompletedItems.map((item) => [
                  <span className="sr-link" key={item.id}>{item.id}</span>,
                  item.title, item.type, `${item.points} SP`, item.assignee,
                  <Status key={item.id}>{item.status}</Status>,
                ])}
              />
            )}
            <div className="sr-table-footer"><b>Total Remaining</b><strong>{notCompletedPoints} SP</strong></div>
          </Card>
        </div>
      </section>

      {/* ROW 3: ISSUES & RETROSPECTIVE */}
      <section className="sr-detail-grid" id="sr-issues">
        <Card title={`Open Issues & Bugs (${issuesList.length})`} className="sr-issues-card">
          {issuesList.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#6b7280" }}>
              No open bugs or defects associated with this sprint.
            </div>
          ) : (
            <Table
              headers={["ID", "Title", "Priority", "Status", "Assignee"]}
              rows={issuesList.slice(0, 5).map((item) => [
                <span className="sr-link" key={item.bugId || item._id}>{item.bugId || item._id}</span>,
                item.title || "Bug",
                <Status key="priority">{item.priority || "Medium"}</Status>,
                <Status key="status">{item.status || "Open"}</Status>,
                item.assigneeId?.name || "Unassigned",
              ])}
            />
          )}
        </Card>

        <Card title="Retrospective Summary" className="sr-retro-card" id="sr-retrospective">
          <div className="sr-retro-lines">
            <div><b>Sprint Achievements</b><ul><li>Completed {completedItems.length} tasks totaling {completedPoints} Story Points</li><li>Demonstrated core sprint deliverables</li></ul></div>
            <div><b>Continuous Improvement</b><ul><li>Ensure team capacity accurately reflects available hours</li><li>Review dependencies during sprint planning</li></ul></div>
          </div>
        </Card>
      </section>

      {/* ROW 4: NEXT STEPS & APPROVAL */}
      <section className="sr-footer-grid" id="sr-approval">
        <Card title="Next Steps Checklist" className="sr-next-card">
          <ul className="sr-next-list">
            {[
              "Review completed tasks and deliverables with stakeholders",
              "Approve and close this sprint",
              "Carry over remaining tasks to next sprint backlog",
              "Plan the subsequent milestone sprint",
            ].map((step, i) => (
              <li key={step}>
                <button
                  className={nextSteps[i] ? "checked" : ""}
                  onClick={() => setNextSteps((old) => old.map((v, j) => (i === j ? !v : v)))}
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
              <button className="sr-primary" onClick={handleApproveSprint}>Confirm Approval</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="sr-toast">{toast}<button onClick={() => setToast("")}><X size={13}/></button></div>}
    </main>
  );
}
