"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Download,
  FileText,
  Flag,
  Info,
  ListChecks,
  LockKeyhole,
  Settings,
  ShieldCheck,
  ShieldPlus,
} from "lucide-react";
import "./milestone-progress-rules.css";

type Status = "Completed" | "In Progress" | "Not Started" | "Overdue";

type Milestone = {
  id: string;
  title: string;
  dates: string;
  status: Status;
  progress: number;
  sprint: [number, number, number, number];
  requirement: number;
  task: number;
};

const milestones: Milestone[] = [
  { id: "MLS-001", title: "Project Kickoff", dates: "01 May – 05 May 2025", status: "Completed", progress: 100, sprint: [1, 1, 0, 0], requirement: 100, task: 100 },
  { id: "MLS-002", title: "Requirements Sign-off", dates: "06 May – 15 May 2025", status: "Completed", progress: 100, sprint: [3, 3, 0, 0], requirement: 100, task: 100 },
  { id: "MLS-003", title: "Design Completion", dates: "16 May – 30 May 2025", status: "In Progress", progress: 72, sprint: [4, 2, 1, 1], requirement: 70, task: 65 },
  { id: "MLS-004", title: "Module Development", dates: "01 Jun – 30 Jul 2025", status: "In Progress", progress: 48, sprint: [6, 2, 2, 2], requirement: 45, task: 38 },
  { id: "MLS-005", title: "Internal QA", dates: "01 Aug – 20 Aug 2025", status: "Not Started", progress: 0, sprint: [2, 0, 0, 2], requirement: 0, task: 0 },
  { id: "MLS-006", title: "UAT Completion", dates: "21 Aug – 05 Sep 2025", status: "Not Started", progress: 0, sprint: [2, 0, 0, 2], requirement: 0, task: 0 },
  { id: "MLS-007", title: "Production Release", dates: "06 Sep – 10 Sep 2025", status: "Not Started", progress: 0, sprint: [1, 0, 0, 1], requirement: 0, task: 0 },
  { id: "MLS-008", title: "Post Release Support", dates: "11 Sep – 25 Sep 2025", status: "Not Started", progress: 0, sprint: [1, 0, 0, 1], requirement: 0, task: 0 },
];

const statusClass: Record<Status, string> = {
  Completed: "completed",
  "In Progress": "progress",
  "Not Started": "not-started",
  Overdue: "overdue",
};

const chartData = [
  { title: "Project Progress", value: 61, parts: [38, 23, 31, 8], labels: ["38%", "23%", "31%", "8%"] },
  { title: "Milestones Progress (6)", value: 61, parts: [33, 33, 17, 17], labels: ["2 (33%)", "2 (33%)", "1 (17%)", "1 (17%)"] },
  { title: "Sprints Progress (18)", value: 59, parts: [33, 33, 22, 11], labels: ["6 (33%)", "6 (33%)", "4 (22%)", "2 (11%)"] },
  { title: "Requirements Progress (142)", value: 58, parts: [56, 25, 13, 6], labels: ["80 (56%)", "36 (25%)", "18 (13%)", "8 (6%)"] },
  { title: "Tasks Progress (620)", value: 55, parts: [55, 24, 14, 8], labels: ["341 (55%)", "146 (24%)", "86 (14%)", "47 (8%)"] },
];

const ruleItems = [
  {
    icon: <Settings />,
    tone: "blue",
    title: "1. Automatic Roll-up",
    text: "Milestone progress is calculated from the completion of Sprints. Sprint progress is calculated from the completion of Requirements. Requirement progress is calculated from the completion of Tasks.",
  },
  {
    icon: <Ban />,
    tone: "red",
    title: "2. No Manual Manipulation",
    text: "Progress cannot be manually set or overridden. Only system-calculated values are displayed.",
  },
  {
    icon: <ShieldCheck />,
    tone: "green",
    title: "3. Authorized Changes Only",
    text: "Changes that affect progress (e.g., task status, requirement status) can only be made by authorized roles.",
  },
  {
    icon: <Activity />,
    tone: "blue",
    title: "4. Real-time Calculation",
    text: "Progress is recalculated in real-time when underlying deliverables change status.",
  },
  {
    icon: <FileText />,
    tone: "blue",
    title: "5. Historical Accuracy",
    text: "All progress changes are logged for audit & compliance.",
  },
];

function Badge({ status }: { status: Status }) {
  return <span className={`mpr-badge ${statusClass[status]}`}>{status}</span>;
}

function Bar({ value }: { value: number }) {
  return (
    <span className="mpr-bar">
      <i style={{ width: `${value}%` }} />
    </span>
  );
}

function Donut({ value, parts }: { value: number; parts: number[] }) {
  const total = parts.reduce((a, b) => a + b, 0);
  const p1 = (parts[0] / total) * 100;
  const p2 = p1 + (parts[1] / total) * 100;
  const p3 = p2 + (parts[2] / total) * 100;

  return (
    <div
      className="mpr-donut"
      style={{
        background: `conic-gradient(
          #078d5b 0 ${p1}%,
          #1762f5 ${p1}% ${p2}%,
          #c8ccd5 ${p2}% ${p3}%,
          #e63838 ${p3}% 100%
        )`,
      }}
    >
      <div>
        <b>{value}%</b>
        <span>Overall</span>
      </div>
    </div>
  );
}

function RollupCard({ item }: { item: (typeof chartData)[number] }) {
  const names = ["Completed", "In Progress", "Not Started", "Overdue"];
  const colors = ["green", "blue", "gray", "red"];

  return (
    <section className="mpr-rollup-card">
      <h3>{item.title}</h3>
      <div className="mpr-rollup-content">
        <Donut value={item.value} parts={item.parts} />
        <div className="mpr-donut-legend">
          {names.map((name, i) => (
            <div key={name}>
              <i className={colors[i]} />
              <span>{name}</span>
              <b>{item.labels[i]}</b>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HierarchyNode({
  icon,
  tone,
  title,
  count,
  footer,
}: {
  icon: React.ReactNode;
  tone: string;
  title: string;
  count: string;
  footer: string;
}) {
  return (
    <div className="mpr-h-node">
      <div className="mpr-h-title">
        <i className={tone}>{icon}</i>
        <b>{title}</b>
      </div>
      <strong>{count}</strong>
      <small>{footer}</small>
    </div>
  );
}

export default function MilestoneProgressRules() {
  const [selectedId, setSelectedId] = useState("MLS-004");
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  const selected = useMemo(
    () => milestones.find((m) => m.id === selectedId) ?? milestones[3],
    [selectedId]
  );

  const exportCSV = () => {
    const header = ["Milestone ID", "Title", "Planned Dates", "Status", "Progress", "Requirement Progress", "Task Progress"];
    const rows = milestones.map((m) => [
      m.id, m.title, m.dates, m.status, `${m.progress}%`, `${m.requirement}%`, `${m.task}%`,
    ]);
    const csv = [header, ...rows].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "milestone-progress-rollup.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const submitOverride = () => {
    if (!reason.trim()) {
      alert("Please enter a reason.");
      return;
    }
    alert("Demo only: connect the authorization API to submit this request.");
    setOverrideOpen(false);
    setReason("");
  };

  return (
    <div className="mpr-page">
      <header className="mpr-header">
        <div className="mpr-breadcrumb">
          <span>Milestone Management</span>
          <b>›</b>
          <strong>Rules &amp; Progress Calculation</strong>
        </div>
        <div className="mpr-header-actions">
          <button onClick={exportCSV}><FileText size={14} /> Export <ChevronDown size={13} /></button>
          <div className="mpr-report-wrap">
            <button onClick={() => setReportOpen((v) => !v)}><FileText size={14} /> Reports <ChevronDown size={13} /></button>
            {reportOpen && (
              <div className="mpr-report-menu">
                <button onClick={exportCSV}>Progress Roll-up Report</button>
                <button onClick={exportCSV}>Milestone Status Report</button>
                <button onClick={exportCSV}>Task Impact Report</button>
              </div>
            )}
          </div>
          <button className="mpr-icon-button" title="Help"><CircleHelp size={17} /></button>
        </div>
      </header>

      {/* TOP: hierarchy on left, rules on right */}
      <section className="mpr-top-grid">
        <div className="mpr-top-left">
          <div className="mpr-notice">
            <ShieldPlus size={23} />
            <div>
              <b>Milestone Progress Calculation Rules</b>
              <p>Progress is automatically calculated from underlying deliverables. Manual updates are not allowed except by authorized roles.</p>
            </div>
          </div>

          <section className="mpr-card mpr-hierarchy">
            <h2>Hierarchy (Top-Down)</h2>
            <div className="mpr-hierarchy-flow">
              <HierarchyNode icon={<FileText />} tone="blue" title="Project" count="1" footer="PRJ-001" />
              <span className="mpr-arrow">→</span>
              <HierarchyNode icon={<Flag />} tone="green" title="Milestones" count="6" footer="Total Milestones" />
              <span className="mpr-arrow">→</span>
              <HierarchyNode icon={<CalendarDays />} tone="purple" title="Sprints" count="18" footer="Total Sprints" />
              <span className="mpr-arrow">→</span>
              <HierarchyNode icon={<ClipboardList />} tone="orange" title="Requirements" count="142" footer="Total Requirements" />
              <span className="mpr-arrow">→</span>
              <HierarchyNode icon={<ListChecks />} tone="blue" title="Tasks / Deliverable" count="620" footer="Total Tasks" />
            </div>
          </section>
        </div>

        <section className="mpr-card mpr-rules">
          <div className="mpr-section-heading">
            <h2>Rules</h2>
            <button onClick={() => alert("These rules govern automatic progress roll-up.")}>Learn More</button>
          </div>
          {ruleItems.map((rule) => (
            <div className="mpr-rule" key={rule.title}>
              <i className={rule.tone}>{rule.icon}</i>
              <b>{rule.title}</b>
              <p>{rule.text}</p>
            </div>
          ))}
        </section>
      </section>

      {/* FULL WIDTH: roll-up charts */}
      <section className="mpr-rollup-section">
        <h2>Progress Roll-up (Automatic)</h2>
        <div className="mpr-rollup-grid">
          {chartData.map((item) => <RollupCard key={item.title} item={item} />)}
        </div>
        <div className="mpr-note">
          <Info size={15} />
          <b>Note:</b>
          <span>Any change in Task status will automatically update Requirement → Sprint → Milestone → Project progress in real-time.</span>
        </div>
      </section>

      {/* MIDDLE: list on left, calculation panel on right */}
      <section className="mpr-middle-grid">
        <section className="mpr-card mpr-milestone-table">
          <h2>Milestone List with Roll-up</h2>
          <div className="mpr-table-scroll">
            <table>
              <thead>
                <tr>
                  <th rowSpan={2}>Milestone ID</th>
                  <th rowSpan={2}>Milestone Title</th>
                  <th rowSpan={2}>Planned Dates</th>
                  <th rowSpan={2}>Status</th>
                  <th rowSpan={2}>Progress<br />(Automatic)</th>
                  <th colSpan={4}>Sprints</th>
                  <th rowSpan={2}>Requirements<br />Progress</th>
                  <th rowSpan={2}>Tasks<br />Progress</th>
                </tr>
                <tr><th>Total</th><th>Completed</th><th>In Progress</th><th>Not Started</th></tr>
              </thead>
              <tbody>
                {milestones.map((m) => (
                  <tr key={m.id} className={selectedId === m.id ? "selected-row" : ""} onClick={() => setSelectedId(m.id)}>
                    <td className="mpr-id">{m.id}</td>
                    <td>{m.title}</td>
                    <td>{m.dates}</td>
                    <td><Badge status={m.status} /></td>
                    <td><div className="mpr-progress-cell"><b>{m.progress}%</b><Bar value={m.progress} /></div></td>
                    {m.sprint.map((n, i) => <td key={i}>{n}</td>)}
                    <td><div className="mpr-progress-cell"><b>{m.requirement}%</b><Bar value={m.requirement} /></div></td>
                    <td><div className="mpr-progress-cell"><b>{m.task}%</b><Bar value={m.task} /></div></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={5}>Total</td><td>20</td><td>8</td><td>3</td><td>9</td><td>58%</td><td>55%</td></tr>
              </tfoot>
            </table>
          </div>
          <p className="mpr-footnote">* Progress values are system calculated based on underlying deliverables.</p>
        </section>

        <section className="mpr-card mpr-calculation">
          <div className="mpr-calc-heading">
            <h2>How Progress is Calculated (Example: Module Development)</h2>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {milestones.map((m) => <option key={m.id} value={m.id}>Milestone: {m.id}</option>)}
            </select>
          </div>
          <div className="mpr-calc-body">
            {[
              { title: "Milestone Progress", value: selected.progress, note: "Based on 6 Sprints", desc: "(Average of all Sprint progress)", icon: <Flag />, tone: "orange" },
              { title: "Sprint Progress", value: 50, note: "Based on Requirements", desc: "(Average of all Requirement progress)", icon: <CalendarDays />, tone: "purple" },
              { title: "Requirement Progress", value: selected.requirement, note: "Based on Tasks", desc: "(Average of all Task completion %)", icon: <ClipboardList />, tone: "orange" },
              { title: "Task Progress", value: selected.task, note: "Based on Task Status", desc: "", icon: <CheckCircle2 />, tone: "blue" },
            ].map((item) => (
              <div className="mpr-calc-row" key={item.title}>
                <i className={item.tone}>{item.icon}</i>
                <b>{item.title}</b>
                <strong>{item.value}%</strong>
                <div className="mpr-calc-meter">
                  <small>{item.note}</small>
                  <Bar value={item.value} />
                  {item.desc && <span>{item.desc}</span>}
                </div>
              </div>
            ))}
            <div className="mpr-calc-legend">
              <span><i className="green" /> Completed</span>
              <span><i className="orange" /> In Progress</span>
              <span><i className="gray" /> Not Started</span>
              <span><i className="red" /> Overdue</span>
            </div>
          </div>
        </section>
      </section>

      {/* BOTTOM: impact, authorization and override */}
      <section className="mpr-bottom-grid">
        <div className="mpr-impact-area">
          <section className="mpr-card mpr-task-impact">
            <h2>Task Status Impact (Real-time)</h2>
            <div className="mpr-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Task</th><th>Old Status</th><th>New Status</th>
                    <th>Impact on<br />Requirement</th><th>Impact on<br />Sprint</th>
                    <th>Impact on<br />Milestone</th><th>Impact on<br />Project</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="mpr-id">TASK-245</td><td><Badge status="In Progress" /></td><td><Badge status="Completed" /></td><td><Impact value="+6%" /></td><td><Impact value="+2%" /></td><td><Impact value="+1%" /></td><td><Impact value="+0.2%" /></td></tr>
                  <tr><td className="mpr-id">TASK-246</td><td><Badge status="Not Started" /></td><td><Badge status="In Progress" /></td><td><Impact value="+3%" /></td><td><Impact value="+1%" /></td><td><Impact value="+0.5%" /></td><td><Impact value="+0.1%" /></td></tr>
                  <tr><td className="mpr-id">TASK-247</td><td><Badge status="Not Started" /></td><td><Badge status="Overdue" /></td><td><Impact value="0%" negative /></td><td><Impact value="0%" negative /></td><td><Impact value="-0.3%" negative /></td><td><Impact value="-0.05%" negative /></td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mpr-card mpr-blocked">
            <Info size={17} />
            <h3>Blocked Task Impact</h3>
            <p>If a task is blocked, it does not add to progress until it is moved to In Progress or Completed.</p>
          </section>
        </div>

        <section className="mpr-card mpr-authorization">
          <h2>Authorization for Progress Affecting Actions</h2>
          <table>
            <thead><tr><th>Action</th><th>Roles Allowed</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td>Update Task Status</td><td>Developer, QA, Tech Lead</td><td>Allowed to update task status</td></tr>
              <tr><td>Update Requirement Status</td><td>BA, Tech Lead, Project Manager</td><td>Allowed to update requirement status</td></tr>
              <tr><td>Update Sprint Status</td><td>Scrum Master, Project Manager</td><td>Allowed to update sprint status</td></tr>
              <tr><td>Update Milestone Dates</td><td>Project Manager, Delivery Manager</td><td>Allowed to update milestone schedule</td></tr>
              <tr><td>Manual Progress Override</td><td>Delivery Manager, Admin</td><td>Allowed in exceptional cases with reason</td></tr>
            </tbody>
          </table>
        </section>

        <section className="mpr-card mpr-override">
          <h3>No Manual Override</h3>
          <span>(by default)</span>
          <div className="mpr-lock"><LockKeyhole size={28} /></div>
          <p>Milestone progress is automatically calculated and cannot be manually edited without authorization.</p>
          <button onClick={() => setOverrideOpen(true)}>Request Override</button>
        </section>
      </section>

      {overrideOpen && (
        <div className="mpr-modal-backdrop" onClick={() => setOverrideOpen(false)}>
          <div className="mpr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mpr-modal-head">
              <div><h2>Request Progress Override</h2><p>Submit this request for authorized review.</p></div>
              <button onClick={() => setOverrideOpen(false)}>×</button>
            </div>
            <label>
              Milestone
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {milestones.map((m) => <option key={m.id} value={m.id}>{m.id} — {m.title}</option>)}
              </select>
            </label>
            <label>Current calculated progress<input value={`${selected.progress}%`} readOnly /></label>
            <label>Reason for override request<textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why an override is required..." /></label>
            <div className="mpr-modal-actions">
              <button className="secondary" onClick={() => setOverrideOpen(false)}>Cancel</button>
              <button onClick={submitOverride}>Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Impact({ value, negative = false }: { value: string; negative?: boolean }) {
  return (
    <span className={`mpr-impact ${negative ? "negative" : ""}`}>
      {negative ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
      {value}
    </span>
  );
}