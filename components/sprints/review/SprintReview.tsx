"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2, ChevronDown, Circle, ClipboardCheck, Clock3,
  Download, FileText, Heart,
  Share2, Target, X,
} from "lucide-react";
import { sprintApi, isValidObjectId, type Sprint } from "@/lib/sprints/api";
import {
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
  const safeVal = Math.max(0, Math.min(100, value));
  return (
    <div
      className="sr-donut"
      style={{
        background: `conic-gradient(${color} 0 ${safeVal}%, #e8edf5 ${safeVal}% 100%)`,
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

export default function SprintReview({ sprintId }: { sprintId: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [allSprints, setAllSprints] = useState<Sprint[]>([]);
  const [tasksList, setTasksList] = useState<Item[]>([]);
  const [issuesList, setIssuesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [approved, setApproved] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [comment, setComment] = useState("");
  const [toast, setToast] = useState("");
  const [nextSteps, setNextSteps] = useState([true, false, false, false]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const { sprint: targetSprint, allSprints: sprintOptions } = await sprintApi.resolve(
          sprintId,
          ["ACTIVE", "COMPLETED", "PLANNED"]
        );

        if (!active) return;
        setAllSprints(sprintOptions);
        setSprint(targetSprint);

        if (!targetSprint) {
          setTasksList([]);
          setIssuesList([]);
          return;
        }

        const isDone =
          targetSprint.rawStatus === "COMPLETED" ||
          targetSprint.status === "Completed" ||
          Boolean(targetSprint.review?.approvedAt);
        setApproved(isDone);
        setComment(targetSprint.review?.comment || "");

        const projectKey =
          typeof targetSprint.projectId === "object"
            ? targetSprint.projectId?._id
            : targetSprint.projectId;

        const [tRes, bRes] = await Promise.allSettled([
          getTasks({ sprintId: targetSprint._id, limit: 100 }),
          getBugs(projectKey && isValidObjectId(projectKey) ? { projectId: projectKey, limit: 100 } : { limit: 100 }).catch(() => ({ items: [] })),
        ]);

        if (!active) return;

        if (tRes.status === "fulfilled") {
          const rawTasks = Array.isArray(tRes.value) ? tRes.value : (tRes.value as any)?.data || (tRes.value as any)?.items || [];
          const mapped: Item[] = rawTasks.map((t: any) => ({
            id: t.taskId || t.code || `TSK-${String(t._id || t.id).slice(-4).toUpperCase()}`,
            title: t.title || "Task",
            type: t.type || "Task",
            points: Number(t.storyPoints || (t.estimatedHours ? Math.max(1, Math.round(t.estimatedHours / 4)) : 3)),
            assignee: t.assigneeId?.name || t.assignee?.name || t.assigneeName || "Unassigned",
            status: t.status || "TO_DO",
            progress:
              ["completed", "done"].includes(String(t.status || "").toLowerCase())
                ? 100
                : t.progress || 0,
          }));
          setTasksList(mapped);
        }

        if (bRes.status === "fulfilled") {
          const rawBugs: any = bRes.value;
          const rawBugsList = Array.isArray(rawBugs) ? rawBugs : rawBugs?.items || rawBugs?.data || [];
          setIssuesList(rawBugsList);
        }
      } catch (err: any) {
        notify(`Failed to fetch sprint review data: ${err?.message || "Server error"}`);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [sprintId]);

  const sprintCode = sprint?.sprintCode || sprintId.toUpperCase();

  const completedItems = useMemo(
    () => tasksList.filter((item) => ["completed", "done"].includes((item.status || "").toLowerCase())),
    [tasksList]
  );

  const inProgressItems = useMemo(
    () =>
      tasksList.filter((item) =>
        ["in progress", "in_progress", "progress", "testing", "in review", "in_review", "code_review", "review", "qa", "uat"].includes(
          (item.status || "").toLowerCase()
        )
      ),
    [tasksList]
  );

  const notCompletedItems = useMemo(
    () =>
      tasksList.filter((item) => {
        const st = (item.status || "").toLowerCase();
        return (
          !["completed", "done"].includes(st) &&
          !["in progress", "in_progress", "progress", "testing", "in review", "in_review", "code_review", "review", "qa", "uat"].includes(st)
        );
      }),
    [tasksList]
  );

  const totalPoints = useMemo(() => {
    const sum = tasksList.reduce((acc, item) => acc + item.points, 0);
    return sum > 0 ? sum : sprint?.plannedStoryPoints || 0;
  }, [tasksList, sprint]);

  const completedPoints = useMemo(() => {
    const sum = completedItems.reduce((acc, item) => acc + item.points, 0);
    return sum > 0 ? sum : sprint?.completedStoryPoints || 0;
  }, [completedItems, sprint]);

  const inProgressPoints = useMemo(() => inProgressItems.reduce((sum, item) => sum + item.points, 0), [inProgressItems]);
  const notCompletedPoints = Math.max(0, totalPoints - completedPoints - inProgressPoints);

  const completionPercent = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : sprint?.progress || 0;

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
        await sprintApi.update(sprint._id, {
          status: "COMPLETED",
          progress: 100,
          completedStoryPoints: completedPoints,
          review: {
            approved: true,
            approvedAt: new Date().toISOString(),
            approvedBy: sprint.ownerName || "Sprint Lead",
            comment: comment.trim(),
          },
        });
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
        await sprintApi.update(sprint._id, {
          status: "ACTIVE",
          review: {
            approved: false,
            reopenedAt: new Date().toISOString(),
          },
        });
      }
      setApproved(false);
      notify("Sprint re-opened.");
    } catch (err: any) {
      notify(`Failed to re-open sprint: ${err?.message || "API error"}`);
    }
  };

  const sprintName = sprint?.name || `Sprint ${sprintCode}`;
  const milestoneName = sprint?.milestoneName || "Not Linked";
  const projectLabel = sprint?.projectName ? `${sprint.projectCode || "PRJ"} - ${sprint.projectName}` : "Not Linked";
  const sprintOwner = sprint?.ownerName || "Sprint Lead";

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
          {allSprints.length > 0 && (
            <select
              aria-label="Switch Sprint"
              value={sprint?._id || sprint?.id || ""}
              onChange={(e) => {
                if (e.target.value) router.push(`/sprints/review/${encodeURIComponent(e.target.value)}`);
              }}
              style={{
                height: "30px",
                padding: "0 10px",
                border: "1px solid #d5dfef",
                borderRadius: "5px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#10204a",
                background: "#ffffff",
                cursor: "pointer",
              }}
            >
              {allSprints.map((s) => (
                <option key={s._id || s.id} value={s._id || s.id}>
                  {s.sprintCode} — {s.name}
                </option>
              ))}
            </select>
          )}
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
          <p>
            {loading
              ? "Loading sprint review metrics..."
              : `Review deliverables, task completions, and verify quality criteria for ${sprintName}.`}
          </p>
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
          ["Project", projectLabel],
          ["Milestone", milestoneName],
          ["Sprint", `${sprintCode} - ${sprintName}`],
          ["Duration", `${sprint?.start || "—"} - ${sprint?.end || "—"} (${sprint?.durationDays || 14} Days)`],
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
          <p>{sprint?.goal || "No sprint goal defined for this sprint."}</p>
          <strong className="sr-achieved">
            <CheckCircle2 size={13} /> {completionPercent >= 80 ? "Goal Achieved" : `${completionPercent}% Progress`}
          </strong>
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
              No completed tasks linked to this sprint yet. Complete tasks on the Kanban board to reflect here.
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
              <div style={{ padding: "20px", textAlign: "center", color: "#6b7280" }}>No tasks currently in progress.</div>
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
              <div style={{ padding: "20px", textAlign: "center", color: "#6b7280" }}>All sprint tasks have been started or completed.</div>
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
            <div>
              <b>Sprint Achievements</b>
              <ul>
                <li>Completed {completedItems.length} tasks totaling {completedPoints} Story Points</li>
                {sprint && sprint.retrospective?.ideas?.good?.length > 0 ? (
                  sprint.retrospective.ideas.good.slice(0, 3).map((item: any, idx: number) => (
                    <li key={idx}>{item.title} ({item.owner})</li>
                  ))
                ) : (
                  <li>Delivered sprint milestones and features according to definition of done</li>
                )}
              </ul>
            </div>
            <div>
              <b>Continuous Improvement</b>
              <ul>
                {sprint && sprint.retrospective?.ideas?.improve?.length > 0 ? (
                  sprint.retrospective.ideas.improve.slice(0, 3).map((item: any, idx: number) => (
                    <li key={idx}>{item.title}</li>
                  ))
                ) : (
                  <>
                    <li>Track dependencies and capacity proactively in next sprint planning</li>
                    <li>Refine testing coverage before final sprint demo</li>
                  </>
                )}
              </ul>
            </div>
          </div>
          <div style={{ marginTop: "12px", textAlign: "right" }}>
            <Link href={`/sprints/retrospective/${sprint?._id || sprintCode}`} style={{ fontSize: "12px", color: "#0066cc", fontWeight: 600 }}>
              Open Full Retrospective Board →
            </Link>
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
