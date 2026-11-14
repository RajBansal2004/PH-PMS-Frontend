"use client";

import { useEffect, useMemo, useState } from "react";
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
import { milestones as getMilestones, tasks as getTasks } from "@/lib/api";
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

const statusClass: Record<Status, string> = {
  Completed: "completed",
  "In Progress": "progress",
  "Not Started": "not-started",
  Overdue: "overdue",
};

const ruleItems = [
  {
    icon: <Settings />,
    tone: "blue",
    title: "1. Automatic Roll-up",
    text: "Milestone progress is calculated from the completion of Sprints. Sprint progress is calculated from the completion of Requirements. Requirement progress is calculated from the completion of Tasks.",
  },
  {
    icon: <LockKeyhole />,
    tone: "purple",
    title: "2. No Manual Edits",
    text: "Milestone Progress field is locked for editing. It can only be changed through automatic calculation or authorized override.",
  },
  {
    icon: <ShieldCheck />,
    tone: "green",
    title: "3. Authorized Override",
    text: "Only Project Manager, Tech Lead and QA Lead have permission to override progress with mandatory reason and audit logging.",
  },
  {
    icon: <Ban />,
    tone: "red",
    title: "4. Status Auto-Transitions",
    text: "Milestone status automatically updates based on progress thresholds and planned dates.",
  },
];

function Badge({ status }: { status: Status }) {
  return (
    <span className={`mpr-badge ${statusClass[status] || "progress"}`}>
      {status}
    </span>
  );
}

function Bar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="mpr-bar-track">
      <div
        className="mpr-bar-fill"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: color,
        }}
      />
    </div>
  );
}

function RollupCard({
  item,
}: {
  item: {
    title: string;
    value: number;
    parts: number[];
    labels: string[];
  };
}) {
  return (
    <section className="mpr-card mpr-rollup-card">
      <div className="mpr-card-header">
        <h3>{item.title}</h3>
        <b>{item.value}%</b>
      </div>
      <div className="mpr-stacked-track">
        <i className="done" style={{ width: `${item.parts[0]}%` }} />
        <i className="progress" style={{ width: `${item.parts[1]}%` }} />
        <i className="not-started" style={{ width: `${item.parts[2]}%` }} />
        <i className="overdue" style={{ width: `${item.parts[3]}%` }} />
      </div>
      <div className="mpr-legend">
        <div className="mpr-legend-row">
          <span>
            <i className="legend-dot done" /> Completed
          </span>
          <b>{item.labels[0]}</b>
        </div>
        <div className="mpr-legend-row">
          <span>
            <i className="legend-dot progress" /> In Progress
          </span>
          <b>{item.labels[1]}</b>
        </div>
        <div className="mpr-legend-row">
          <span>
            <i className="legend-dot not-started" /> Not Started
          </span>
          <b>{item.labels[2]}</b>
        </div>
        <div className="mpr-legend-row">
          <span>
            <i className="legend-dot overdue" /> Overdue
          </span>
          <b>{item.labels[3]}</b>
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
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [totalTasksCount, setTotalTasksCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [mlsRes, tskRes] = await Promise.allSettled([
          getMilestones(),
          getTasks({ limit: 100 }),
        ]);

        if (tskRes.status === "fulfilled" && tskRes.value) {
          const tList = Array.isArray(tskRes.value)
            ? tskRes.value
            : (tskRes.value as any)?.items || [];
          setTotalTasksCount(tList.length);
        }

        if (mlsRes.status === "fulfilled" && mlsRes.value) {
          const list = Array.isArray(mlsRes.value)
            ? mlsRes.value
            : (mlsRes.value as any)?.items || [];
          const mapped: Milestone[] = list.map((m: any, idx: number) => {
            let st: Status = "In Progress";
            const rawSt = String(m.status || "").toUpperCase();
            if (rawSt === "COMPLETED") st = "Completed";
            else if (
              rawSt === "NOT STARTED" ||
              rawSt === "PLANNED" ||
              rawSt === "UPCOMING"
            )
              st = "Not Started";
            else if (rawSt === "OVERDUE") st = "Overdue";

            const progress = m.weight || m.progress || 0;
            const start = m.startDate ? m.startDate.slice(0, 10) : "—";
            const end = m.endDate ? m.endDate.slice(0, 10) : "—";

            return {
              id: m.code || `MLS-${String(idx + 1).padStart(3, "0")}`,
              title: m.name || m.title || "Milestone",
              dates: `${start} – ${end}`,
              status: st,
              progress,
              sprint: [1, st === "Completed" ? 1 : 0, st === "In Progress" ? 1 : 0, 0],
              requirement: progress,
              task: progress,
            };
          });
          setMilestones(mapped);
          if (mapped.length > 0) {
            setSelectedId(mapped[0].id);
          }
        }
      } catch (err) {
        console.warn("Failed to load milestone progress rules:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const selected = useMemo(
    () => milestones.find((m) => m.id === selectedId) ?? milestones[0],
    [milestones, selectedId]
  );

  const avgProgress = useMemo(() => {
    if (!milestones.length) return 0;
    return Math.round(
      milestones.reduce((acc, m) => acc + m.progress, 0) / milestones.length
    );
  }, [milestones]);

  const completedCount = milestones.filter(
    (m) => m.status === "Completed"
  ).length;
  const inProgressCount = milestones.filter(
    (m) => m.status === "In Progress"
  ).length;
  const notStartedCount = milestones.filter(
    (m) => m.status === "Not Started"
  ).length;
  const overdueCount = milestones.filter((m) => m.status === "Overdue").length;

  const chartData = [
    {
      title: "Project Progress",
      value: avgProgress,
      parts: milestones.length
        ? [
            Math.round((completedCount / milestones.length) * 100),
            Math.round((inProgressCount / milestones.length) * 100),
            Math.round((notStartedCount / milestones.length) * 100),
            Math.round((overdueCount / milestones.length) * 100),
          ]
        : [0, 0, 0, 0],
      labels: [
        `${completedCount} Completed`,
        `${inProgressCount} In Progress`,
        `${notStartedCount} Not Started`,
        `${overdueCount} Overdue`,
      ],
    },
    {
      title: `Milestones Progress (${milestones.length})`,
      value: avgProgress,
      parts: milestones.length
        ? [
            Math.round((completedCount / milestones.length) * 100),
            Math.round((inProgressCount / milestones.length) * 100),
            Math.round((notStartedCount / milestones.length) * 100),
            Math.round((overdueCount / milestones.length) * 100),
          ]
        : [0, 0, 0, 0],
      labels: [
        `${completedCount} Completed`,
        `${inProgressCount} In Progress`,
        `${notStartedCount} Not Started`,
        `${overdueCount} Overdue`,
      ],
    },
  ];

  const exportCSV = () => {
    const header = [
      "Milestone ID",
      "Title",
      "Planned Dates",
      "Status",
      "Progress",
      "Requirement Progress",
      "Task Progress",
    ];
    const rows = milestones.map((m) => [
      m.id,
      m.title,
      m.dates,
      m.status,
      `${m.progress}%`,
      `${m.requirement}%`,
      `${m.task}%`,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${v}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );
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
    setOverrideOpen(false);
    setReason("");
    alert("Override request submitted for approval.");
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
          <button onClick={exportCSV}>
            <FileText size={14} /> Export <ChevronDown size={13} />
          </button>
          <div className="mpr-report-wrap">
            <button onClick={() => setReportOpen((v) => !v)}>
              <FileText size={14} /> Reports <ChevronDown size={13} />
            </button>
            {reportOpen && (
              <div className="mpr-report-menu">
                <button onClick={exportCSV}>Progress Roll-up Report</button>
                <button onClick={exportCSV}>Milestone Status Report</button>
                <button onClick={exportCSV}>Task Impact Report</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="mpr-top-grid">
        <div className="mpr-top-left">
          <div className="mpr-notice">
            <ShieldPlus size={23} />
            <div>
              <b>Milestone Progress Calculation Rules</b>
              <p>
                Progress is automatically calculated from underlying
                deliverables. Manual updates are not allowed except by
                authorized roles.
              </p>
            </div>
          </div>

          <section className="mpr-card mpr-hierarchy">
            <h2>Hierarchy (Top-Down)</h2>
            <div className="mpr-hierarchy-flow">
              <HierarchyNode
                icon={<FileText />}
                tone="blue"
                title="Project"
                count="1"
                footer="PRJ"
              />
              <span className="mpr-arrow">→</span>
              <HierarchyNode
                icon={<Flag />}
                tone="green"
                title="Milestones"
                count={String(milestones.length)}
                footer="Total Milestones"
              />
              <span className="mpr-arrow">→</span>
              <HierarchyNode
                icon={<ListChecks />}
                tone="blue"
                title="Tasks"
                count={String(totalTasksCount)}
                footer="Total Tasks"
              />
            </div>
          </section>
        </div>

        <section className="mpr-card mpr-rules">
          <div className="mpr-section-heading">
            <h2>Rules</h2>
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

      <section className="mpr-rollup-section">
        <h2>Progress Roll-up (Automatic)</h2>
        <div className="mpr-rollup-grid">
          {chartData.map((item) => (
            <RollupCard key={item.title} item={item} />
          ))}
        </div>
        <div className="mpr-note">
          <Info size={15} />
          <b>Note:</b>
          <span>
            Any change in Task status will automatically update Milestone and
            Project progress in real-time.
          </span>
        </div>
      </section>

      <section className="mpr-middle-grid">
        <section className="mpr-card mpr-milestone-table">
          <h2>Milestone List with Roll-up</h2>
          <div className="mpr-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Milestone ID</th>
                  <th>Milestone Title</th>
                  <th>Planned Dates</th>
                  <th>Status</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {milestones.length > 0 ? (
                  milestones.map((m) => (
                    <tr
                      key={m.id}
                      className={selectedId === m.id ? "selected-row" : ""}
                      onClick={() => setSelectedId(m.id)}
                    >
                      <td className="mpr-id">{m.id}</td>
                      <td>{m.title}</td>
                      <td>{m.dates}</td>
                      <td>
                        <Badge status={m.status} />
                      </td>
                      <td>
                        <div className="mpr-progress-cell">
                          <b>{m.progress}%</b>
                          <Bar value={m.progress} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        textAlign: "center",
                        padding: "32px",
                        color: "#667085",
                      }}
                    >
                      No milestones found in database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selected && (
          <section className="mpr-card mpr-calculation">
            <div className="mpr-calc-heading">
              <h2>How Progress is Calculated: {selected.title}</h2>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    Milestone: {m.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="mpr-calc-body">
              <div className="mpr-calc-row">
                <i className="orange">
                  <Flag />
                </i>
                <b>Milestone Progress</b>
                <strong>{selected.progress}%</strong>
                <div className="mpr-calc-meter">
                  <small>Weight-based completion</small>
                  <Bar value={selected.progress} />
                </div>
              </div>
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
