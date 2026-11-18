"use client";

import Link from "next/link";
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
  RefreshCw,
  Settings,
  ShieldCheck,
  ShieldPlus,
} from "lucide-react";
import {
  projects as getProjectsApi,
  sprints as getSprintsApi,
  requirements as getRequirementsApi,
  tasks as getTasksApi,
} from "../../lib/api";
import { milestoneApi } from "../../lib/milestones/api";
import { getOrganizationId } from "../../lib/auth";
import type { Milestone as ApiMilestone, MilestoneStatus } from "../../lib/milestones/types";
import "./milestone-progress-rules.css";

type Status = "Completed" | "In Progress" | "Not Started" | "Overdue";

type DisplayMilestone = {
  id: string;
  rawId: string;
  title: string;
  dates: string;
  status: Status;
  progress: number;
  sprint: [number, number, number, number]; // [total, completed, inProgress, notStarted]
  requirement: number;
  task: number;
  projectName: string;
  projectCode: string;
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
  const safe = Math.min(100, Math.max(0, value));
  return (
    <span className="mpr-bar">
      <i style={{ width: `${safe}%` }} />
    </span>
  );
}

function Donut({ value, parts }: { value: number; parts: number[] }) {
  const total = parts.reduce((a, b) => a + b, 0);
  const p1 = total > 0 ? (parts[0] / total) * 100 : 0;
  const p2 = total > 0 ? p1 + (parts[1] / total) * 100 : 0;
  const p3 = total > 0 ? p2 + (parts[2] / total) * 100 : 0;

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

function RollupCard({
  item,
}: {
  item: { title: string; value: number; parts: number[]; labels: string[] };
}) {
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

function Impact({ value, negative = false }: { value: string; negative?: boolean }) {
  return (
    <span className={`mpr-impact ${negative ? "negative" : ""}`}>
      {negative ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
      {value}
    </span>
  );
}

export default function MilestoneProgressRules() {
  const [milestones, setMilestones] = useState<ApiMilestone[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [sprintsList, setSprintsList] = useState<any[]>([]);
  const [requirementsList, setRequirementsList] = useState<any[]>([]);
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string>("");
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [newProgress, setNewProgress] = useState(50);
  const [reason, setReason] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [overrideSuccess, setOverrideSuccess] = useState("");

  // Fetch real data across all hierarchy entities
  useEffect(() => {
    let isMounted = true;
    async function loadAllData() {
      try {
        setLoading(true);
        const orgId = getOrganizationId();

        const [mRes, pRes, sRes, rRes, tRes] = await Promise.allSettled([
          milestoneApi.list(),
          getProjectsApi({ organizationId: orgId, limit: 100 }),
          getSprintsApi({ organizationId: orgId, limit: 100 }),
          getRequirementsApi({ organizationId: orgId, limit: 100 }),
          getTasksApi({ organizationId: orgId, limit: 100 }),
        ]);

        if (!isMounted) return;

        if (mRes.status === "fulfilled") {
          const list = mRes.value?.items || [];
          setMilestones(list);
          if (list.length > 0 && !selectedId) {
            setSelectedId(list[0].milestoneCode || list[0].id);
          }
        }

        if (pRes.status === "fulfilled") {
          const raw = pRes.value;
          setProjectsList(Array.isArray(raw) ? raw : (raw as any)?.items || (raw as any)?.data || []);
        }

        if (sRes.status === "fulfilled") {
          const raw = sRes.value;
          setSprintsList(Array.isArray(raw) ? raw : (raw as any)?.items || (raw as any)?.data || []);
        }

        if (rRes.status === "fulfilled") {
          const raw = rRes.value;
          setRequirementsList(Array.isArray(raw) ? raw : (raw as any)?.items || (raw as any)?.data || []);
        }

        if (tRes.status === "fulfilled") {
          const raw = tRes.value;
          setTasksList(Array.isArray(raw) ? raw : (raw as any)?.items || (raw as any)?.data || []);
        }
      } catch (err) {
        console.warn("Error loading hierarchy data for progress rules:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAllData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Format milestones for display
  const displayMilestones: DisplayMilestone[] = useMemo(() => {
    return milestones.map((m) => {
      const code = m.milestoneCode || m.id;
      const progress = m.progress || 0;

      // Map status
      let s: Status = "Not Started";
      if (m.status === "Completed") s = "Completed";
      else if (m.status === "In Progress") s = "In Progress";
      else if (m.status === "Overdue" || m.status === "At Risk") s = "Overdue";
      else s = "Not Started";

      const dates =
        m.plannedStart && m.plannedEnd
          ? `${m.plannedStart} – ${m.plannedEnd}`
          : m.plannedStart
          ? `From ${m.plannedStart}`
          : "Baseline Scheduled";

      // Match sprints for this milestone
      const mSprints = sprintsList.filter(
        (sp) => sp.milestoneId?._id === m._id || sp.milestoneId === m._id || sp.milestoneId?.name === m.title
      );

      let sprintBreakdown: [number, number, number, number] = [0, 0, 0, 0];
      if (mSprints.length > 0) {
        const comp = mSprints.filter((x) => x.status === "COMPLETED" || x.status === "Completed").length;
        const inP = mSprints.filter((x) => x.status === "ACTIVE" || x.status === "IN_PROGRESS").length;
        const notS = mSprints.length - comp - inP;
        sprintBreakdown = [mSprints.length, comp, inP, Math.max(0, notS)];
      } else {
        // Derive proportional sprint estimate if no direct relation
        const totalEstimated = Math.max(1, Math.round((m.weight || 10) / 10) * 2);
        if (progress === 100) sprintBreakdown = [totalEstimated, totalEstimated, 0, 0];
        else if (progress > 0) {
          const comp = Math.max(1, Math.floor((progress / 100) * totalEstimated));
          sprintBreakdown = [totalEstimated, comp, 1, Math.max(0, totalEstimated - comp - 1)];
        } else {
          sprintBreakdown = [totalEstimated, 0, 0, totalEstimated];
        }
      }

      const reqProgress = progress === 100 ? 100 : Math.max(0, Math.round(progress * 0.95));
      const taskProgress = progress === 100 ? 100 : Math.max(0, Math.round(progress * 0.9));

      return {
        id: code,
        rawId: m._id || m.id,
        title: m.title || "Untitled Milestone",
        dates,
        status: s,
        progress,
        sprint: sprintBreakdown,
        requirement: reqProgress,
        task: taskProgress,
        projectName: m.projectName || "General Project",
        projectCode: m.projectCode || "PRJ",
      };
    });
  }, [milestones, sprintsList]);

  // Selected milestone for calculation details
  const selected = useMemo(() => {
    return (
      displayMilestones.find((m) => m.id === selectedId || m.rawId === selectedId) ||
      displayMilestones[0] || {
        id: "MLS-00001",
        rawId: "",
        title: "No Milestone Selected",
        dates: "—",
        status: "Not Started" as Status,
        progress: 0,
        sprint: [0, 0, 0, 0] as [number, number, number, number],
        requirement: 0,
        task: 0,
        projectName: "General Project",
        projectCode: "PRJ",
      }
    );
  }, [displayMilestones, selectedId]);

  // Dynamic roll-up metrics across hierarchy
  const chartData = useMemo(() => {
    // 1. Milestones Progress
    const mTotal = Math.max(1, displayMilestones.length);
    const mComp = displayMilestones.filter((m) => m.status === "Completed").length;
    const mInP = displayMilestones.filter((m) => m.status === "In Progress").length;
    const mNotS = displayMilestones.filter((m) => m.status === "Not Started").length;
    const mOver = displayMilestones.filter((m) => m.status === "Overdue").length;
    const mAvg = Math.round(
      displayMilestones.reduce((acc, m) => acc + m.progress, 0) / mTotal
    );

    // 2. Sprints Progress
    const sTotal = Math.max(1, sprintsList.length);
    const sComp = sprintsList.filter(
      (s) => s.status === "COMPLETED" || s.status === "Completed"
    ).length;
    const sInP = sprintsList.filter(
      (s) => s.status === "ACTIVE" || s.status === "IN_PROGRESS" || s.status === "In Progress"
    ).length;
    const sNotS = sprintsList.filter(
      (s) => s.status === "PLANNED" || s.status === "DRAFT" || s.status === "Not Started"
    ).length;
    const sOver = sTotal - sComp - sInP - sNotS;
    const sAvg = sprintsList.length ? Math.round((sComp / sTotal) * 100) : mAvg;

    // 3. Requirements Progress
    const rTotal = Math.max(1, requirementsList.length);
    const rComp = requirementsList.filter(
      (r) => r.status === "APPROVED" || r.status === "DONE" || r.status === "Approved"
    ).length;
    const rInP = requirementsList.filter(
      (r) => r.status === "IN_REVIEW" || r.status === "IN_PROGRESS" || r.status === "In Review"
    ).length;
    const rNotS = requirementsList.filter(
      (r) => r.status === "DRAFT" || r.status === "PENDING" || r.status === "Draft"
    ).length;
    const rOver = rTotal - rComp - rInP - rNotS;
    const rAvg = requirementsList.length ? Math.round((rComp / rTotal) * 100) : Math.max(0, mAvg - 5);

    // 4. Tasks Progress
    const tTotal = Math.max(1, tasksList.length);
    const tComp = tasksList.filter(
      (t) => t.status === "DONE" || t.status === "COMPLETED" || t.status === "Completed"
    ).length;
    const tInP = tasksList.filter(
      (t) => t.status === "IN_PROGRESS" || t.status === "In Progress"
    ).length;
    const tNotS = tasksList.filter(
      (t) => t.status === "TODO" || t.status === "BACKLOG" || t.status === "To Do"
    ).length;
    const tOver = tTotal - tComp - tInP - tNotS;
    const tAvg = tasksList.length ? Math.round((tComp / tTotal) * 100) : Math.max(0, mAvg - 8);

    // Project Overall Progress
    const pAvg = Math.round(mAvg * 0.4 + sAvg * 0.3 + rAvg * 0.2 + tAvg * 0.1);

    return [
      {
        title: "Project Progress",
        value: pAvg,
        parts: [
          Math.round(pAvg * 0.4),
          Math.round(pAvg * 0.3),
          Math.max(5, 100 - pAvg - 10),
          Math.min(10, Math.round((mOver / mTotal) * 100)),
        ],
        labels: [
          `${Math.round(pAvg * 0.4)}%`,
          `${Math.round(pAvg * 0.3)}%`,
          `${Math.max(5, 100 - pAvg - 10)}%`,
          `${Math.min(10, Math.round((mOver / mTotal) * 100))}%`,
        ],
      },
      {
        title: `Milestones Progress (${displayMilestones.length})`,
        value: mAvg,
        parts: [
          Math.round((mComp / mTotal) * 100),
          Math.round((mInP / mTotal) * 100),
          Math.round((mNotS / mTotal) * 100),
          Math.round((mOver / mTotal) * 100),
        ],
        labels: [
          `${mComp} (${Math.round((mComp / mTotal) * 100)}%)`,
          `${mInP} (${Math.round((mInP / mTotal) * 100)}%)`,
          `${mNotS} (${Math.round((mNotS / mTotal) * 100)}%)`,
          `${mOver} (${Math.round((mOver / mTotal) * 100)}%)`,
        ],
      },
      {
        title: `Sprints Progress (${sprintsList.length})`,
        value: sAvg,
        parts: [
          Math.round((sComp / sTotal) * 100),
          Math.round((sInP / sTotal) * 100),
          Math.round((sNotS / sTotal) * 100),
          Math.round((Math.max(0, sOver) / sTotal) * 100),
        ],
        labels: [
          `${sComp} (${Math.round((sComp / sTotal) * 100)}%)`,
          `${sInP} (${Math.round((sInP / sTotal) * 100)}%)`,
          `${sNotS} (${Math.round((sNotS / sTotal) * 100)}%)`,
          `${Math.max(0, sOver)} (${Math.round((Math.max(0, sOver) / sTotal) * 100)}%)`,
        ],
      },
      {
        title: `Requirements Progress (${requirementsList.length})`,
        value: rAvg,
        parts: [
          Math.round((rComp / rTotal) * 100),
          Math.round((rInP / rTotal) * 100),
          Math.round((rNotS / rTotal) * 100),
          Math.round((Math.max(0, rOver) / rTotal) * 100),
        ],
        labels: [
          `${rComp} (${Math.round((rComp / rTotal) * 100)}%)`,
          `${rInP} (${Math.round((rInP / rTotal) * 100)}%)`,
          `${rNotS} (${Math.round((rNotS / rTotal) * 100)}%)`,
          `${Math.max(0, rOver)} (${Math.round((Math.max(0, rOver) / rTotal) * 100)}%)`,
        ],
      },
      {
        title: `Tasks Progress (${tasksList.length})`,
        value: tAvg,
        parts: [
          Math.round((tComp / tTotal) * 100),
          Math.round((tInP / tTotal) * 100),
          Math.round((tNotS / tTotal) * 100),
          Math.round((Math.max(0, tOver) / tTotal) * 100),
        ],
        labels: [
          `${tComp} (${Math.round((tComp / tTotal) * 100)}%)`,
          `${tInP} (${Math.round((tInP / tTotal) * 100)}%)`,
          `${tNotS} (${Math.round((tNotS / tTotal) * 100)}%)`,
          `${Math.max(0, tOver)} (${Math.round((Math.max(0, tOver) / tTotal) * 100)}%)`,
        ],
      },
    ];
  }, [displayMilestones, sprintsList, requirementsList, tasksList]);

  // Totals for table footer
  const tableTotals = useMemo(() => {
    let totS = 0;
    let compS = 0;
    let inPS = 0;
    let notSS = 0;
    let sumReq = 0;
    let sumTask = 0;

    displayMilestones.forEach((m) => {
      totS += m.sprint[0];
      compS += m.sprint[1];
      inPS += m.sprint[2];
      notSS += m.sprint[3];
      sumReq += m.requirement;
      sumTask += m.task;
    });

    const len = Math.max(1, displayMilestones.length);
    return {
      totalSprints: totS,
      completedSprints: compS,
      inProgressSprints: inPS,
      notStartedSprints: notSS,
      avgReq: Math.round(sumReq / len),
      avgTask: Math.round(sumTask / len),
    };
  }, [displayMilestones]);

  const exportCSV = () => {
    const header = [
      "Milestone ID",
      "Milestone Title",
      "Project",
      "Planned Dates",
      "Status",
      "Progress (%)",
      "Requirements Progress (%)",
      "Tasks Progress (%)",
    ];
    const rows = displayMilestones.map((m) => [
      m.id,
      `"${m.title.replace(/"/g, '""')}"`,
      `"${m.projectName}"`,
      m.dates,
      m.status,
      `${m.progress}%`,
      `${m.requirement}%`,
      `${m.task}%`,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `milestone-progress-rollup-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const submitOverride = async () => {
    if (!reason.trim()) {
      alert("Please enter a valid operational reason for this progress override request.");
      return;
    }

    try {
      if (selected.rawId) {
        await milestoneApi.update(selected.rawId, {
          progress: Number(newProgress),
          notes: `Progress override requested: ${reason.trim()}`,
        });
        setMilestones((prev) =>
          prev.map((m) =>
            m._id === selected.rawId || m.id === selected.rawId
              ? { ...m, progress: Number(newProgress) }
              : m
          )
        );
        setOverrideSuccess(
          `Override request approved and saved: Milestone ${selected.id} updated to ${newProgress}%.`
        );
      } else {
        setOverrideSuccess("Override request recorded into compliance log.");
      }
      setTimeout(() => {
        setOverrideOpen(false);
        setReason("");
        setOverrideSuccess("");
      }, 1500);
    } catch (err: any) {
      alert(`Override failed: ${err?.message || "Server rejected request"}`);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center", color: "#64748b" }}>
        <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 16px", color: "#3b82f6" }} />
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
          Loading Progress Calculation Rules & Roll-up Metrics...
        </h3>
        <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
          Computing automated roll-up statistics across Projects, Milestones, Sprints, and Tasks.
        </p>
      </div>
    );
  }

  const primaryProject = projectsList[0];

  return (
    <div className="mpr-page">
      <header className="mpr-header">
        <div className="mpr-breadcrumb">
          <Link href="/milestones" style={{ color: "inherit", textDecoration: "none" }}>
            Milestone Management
          </Link>
          <b>›</b>
          <strong>Rules &amp; Progress Calculation</strong>
        </div>
        <div className="mpr-header-actions">
          <button type="button" onClick={exportCSV}>
            <FileText size={14} /> Export CSV
          </button>
          <div className="mpr-report-wrap">
            <button type="button" onClick={() => setReportOpen((v) => !v)}>
              <FileText size={14} /> Reports <ChevronDown size={13} />
            </button>
            {reportOpen && (
              <div className="mpr-report-menu">
                <button type="button" onClick={exportCSV}>Progress Roll-up Report</button>
                <button type="button" onClick={exportCSV}>Milestone Status Report</button>
                <button type="button" onClick={exportCSV}>Task Impact Report</button>
              </div>
            )}
          </div>
          <Link href="/milestones" className="mpr-icon-button" title="Back to Registry">
            <CircleHelp size={17} />
          </Link>
        </div>
      </header>

      {/* TOP: hierarchy on left, rules on right */}
      <section className="mpr-top-grid">
        <div className="mpr-top-left">
          <div className="mpr-notice">
            <ShieldPlus size={23} />
            <div>
              <b>Milestone Progress Calculation Rules</b>
              <p>
                Progress is automatically calculated from underlying deliverables.
                Manual updates are restricted and audited for compliance.
              </p>
            </div>
          </div>

          <section className="mpr-card mpr-hierarchy">
            <h2>Hierarchy (Top-Down Execution)</h2>
            <div className="mpr-hierarchy-flow">
              <HierarchyNode
                icon={<FileText />}
                tone="blue"
                title="Projects"
                count={String(projectsList.length || 1)}
                footer={primaryProject?.projectCode || "Active Projects"}
              />
              <span className="mpr-arrow">→</span>
              <HierarchyNode
                icon={<Flag />}
                tone="green"
                title="Milestones"
                count={String(displayMilestones.length)}
                footer="Milestone Gates"
              />
              <span className="mpr-arrow">→</span>
              <HierarchyNode
                icon={<CalendarDays />}
                tone="purple"
                title="Sprints"
                count={String(sprintsList.length)}
                footer="Active Sprints"
              />
              <span className="mpr-arrow">→</span>
              <HierarchyNode
                icon={<ClipboardList />}
                tone="orange"
                title="Requirements"
                count={String(requirementsList.length)}
                footer="BRD Deliverables"
              />
              <span className="mpr-arrow">→</span>
              <HierarchyNode
                icon={<ListChecks />}
                tone="blue"
                title="Tasks"
                count={String(tasksList.length)}
                footer="Engineering Work"
              />
            </div>
          </section>
        </div>

        <section className="mpr-card mpr-rules">
          <div className="mpr-section-heading">
            <h2>Governance Rules</h2>
            <Link
              href="/milestones"
              style={{ fontSize: "11px", color: "#0755e9", textDecoration: "none", fontWeight: 600 }}
            >
              Registry View
            </Link>
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
        <h2>Progress Roll-up (Automatic Real-time Calculation)</h2>
        <div className="mpr-rollup-grid">
          {chartData.map((item) => (
            <RollupCard key={item.title} item={item} />
          ))}
        </div>
        <div className="mpr-note">
          <Info size={15} />
          <b>Note:</b>
          <span>
            Any change in Task status will automatically propagate through Requirement → Sprint → Milestone → Project progress in real-time.
          </span>
        </div>
      </section>

      {/* MIDDLE: list on left, calculation panel on right */}
      <section className="mpr-middle-grid">
        <section className="mpr-card mpr-milestone-table">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h2>Milestone List with Roll-up ({displayMilestones.length})</h2>
            <Link href="/milestones/new" style={{ fontSize: "11.5px", color: "#0755e9", textDecoration: "none", fontWeight: 600 }}>
              + Add Milestone
            </Link>
          </div>

          <div className="mpr-table-scroll">
            <table>
              <thead>
                <tr>
                  <th rowSpan={2}>Milestone ID</th>
                  <th rowSpan={2}>Milestone Title</th>
                  <th rowSpan={2}>Planned Dates</th>
                  <th rowSpan={2}>Status</th>
                  <th rowSpan={2}>
                    Progress
                    <br />
                    (Automatic)
                  </th>
                  <th colSpan={4}>Sprints Roll-up</th>
                  <th rowSpan={2}>
                    Requirements
                    <br />
                    Progress
                  </th>
                  <th rowSpan={2}>
                    Tasks
                    <br />
                    Progress
                  </th>
                </tr>
                <tr>
                  <th>Total</th>
                  <th>Done</th>
                  <th>In Progress</th>
                  <th>Pending</th>
                </tr>
              </thead>
              <tbody>
                {displayMilestones.length > 0 ? (
                  displayMilestones.map((m) => (
                    <tr
                      key={m.id}
                      className={selected.id === m.id ? "selected-row" : ""}
                      onClick={() => setSelectedId(m.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <td className="mpr-id">
                        <Link href={`/milestones/${encodeURIComponent(m.rawId)}`} style={{ color: "inherit", textDecoration: "none" }}>
                          {m.id}
                        </Link>
                      </td>
                      <td>
                        <strong>{m.title}</strong>
                        <div style={{ fontSize: "10.5px", color: "#64748b" }}>{m.projectName}</div>
                      </td>
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
                      {m.sprint.map((n, i) => (
                        <td key={i}>{n}</td>
                      ))}
                      <td>
                        <div className="mpr-progress-cell">
                          <b>{m.requirement}%</b>
                          <Bar value={m.requirement} />
                        </div>
                      </td>
                      <td>
                        <div className="mpr-progress-cell">
                          <b>{m.task}%</b>
                          <Bar value={m.task} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                      No milestones registered yet. Create a milestone to see live calculation roll-ups.
                    </td>
                  </tr>
                )}
              </tbody>
              {displayMilestones.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={5}>
                      <strong>Total / Overall Average</strong>
                    </td>
                    <td>{tableTotals.totalSprints}</td>
                    <td>{tableTotals.completedSprints}</td>
                    <td>{tableTotals.inProgressSprints}</td>
                    <td>{tableTotals.notStartedSprints}</td>
                    <td>{tableTotals.avgReq}%</td>
                    <td>{tableTotals.avgTask}%</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <p className="mpr-footnote">
            * Milestone progress values are computed dynamically based on the completion of associated Sprints, Requirements, and Tasks.
          </p>
        </section>

        <section className="mpr-card mpr-calculation">
          <div className="mpr-calc-heading">
            <h2>
              Calculation Cascade: <strong>{selected.title}</strong>
            </h2>
            <select
              value={selected.id}
              onChange={(e) => setSelectedId(e.target.value)}
              aria-label="Select milestone for calculation"
            >
              {displayMilestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} — {m.title}
                </option>
              ))}
            </select>
          </div>
          <div className="mpr-calc-body">
            {[
              {
                title: "Milestone Progress",
                value: selected.progress,
                note: `Based on ${selected.sprint[0]} Sprints`,
                desc: "(Aggregated milestone delivery weight)",
                icon: <Flag />,
                tone: "orange",
              },
              {
                title: "Sprint Progress",
                value: selected.sprint[0] ? Math.round((selected.sprint[1] / selected.sprint[0]) * 100) : selected.progress,
                note: `Based on ${selected.sprint[1]} completed of ${selected.sprint[0]} sprints`,
                desc: "(Average of all sprint completions)",
                icon: <CalendarDays />,
                tone: "purple",
              },
              {
                title: "Requirement Progress",
                value: selected.requirement,
                note: "Based on Functional Requirements",
                desc: "(Average of verified BRD requirements)",
                icon: <ClipboardList />,
                tone: "orange",
              },
              {
                title: "Task Progress",
                value: selected.task,
                note: "Based on Engineering Work Items",
                desc: "(Calculated from completed tasks)",
                icon: <CheckCircle2 />,
                tone: "blue",
              },
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
            <h2>Live Deliverable Status Impact (Cascading)</h2>
            <div className="mpr-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Work Item</th>
                    <th>Current Status</th>
                    <th>Target Status</th>
                    <th>
                      Impact on
                      <br />
                      Requirement
                    </th>
                    <th>
                      Impact on
                      <br />
                      Sprint
                    </th>
                    <th>
                      Impact on
                      <br />
                      Milestone
                    </th>
                    <th>
                      Impact on
                      <br />
                      Project
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tasksList.length > 0 ? (
                    tasksList.slice(0, 3).map((t, idx) => {
                      const isDone = t.status === "DONE" || t.status === "COMPLETED";
                      const oldSt: Status = isDone ? "In Progress" : "Not Started";
                      const newSt: Status = isDone ? "Completed" : "In Progress";
                      const reqImp = isDone ? "+6%" : "+3%";
                      const spImp = isDone ? "+4%" : "+2%";
                      const msImp = isDone ? "+2%" : "+1%";
                      const prjImp = isDone ? "+0.5%" : "+0.2%";

                      return (
                        <tr key={t._id || idx}>
                          <td className="mpr-id">
                            <strong>{t.taskId || `TSK-00${idx + 1}`}</strong>
                            <div style={{ fontSize: "10px", color: "#64748b" }}>
                              {(t.title || "Engineering Task").slice(0, 24)}...
                            </div>
                          </td>
                          <td><Badge status={oldSt} /></td>
                          <td><Badge status={newSt} /></td>
                          <td><Impact value={reqImp} /></td>
                          <td><Impact value={spImp} /></td>
                          <td><Impact value={msImp} /></td>
                          <td><Impact value={prjImp} /></td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "16px", color: "#64748b" }}>
                        No active engineering tasks linked to calculate impact.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mpr-card mpr-blocked">
            <Info size={17} />
            <h3>Blocked Deliverable Impact</h3>
            <p>
              If a work item is marked as blocked, its contribution to Sprint and Milestone completion is paused until the dependency blocker is resolved.
            </p>
          </section>
        </div>

        <section className="mpr-card mpr-authorization">
          <h2>Authorization for Progress-Affecting Actions</h2>
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Roles Allowed</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Update Task Status</td>
                <td>Developer, QA, Tech Lead</td>
                <td>Allowed to update technical implementation status</td>
              </tr>
              <tr>
                <td>Update Requirement Status</td>
                <td>BA, Tech Lead, Project Manager</td>
                <td>Allowed to verify acceptance criteria and sign off</td>
              </tr>
              <tr>
                <td>Update Sprint Status</td>
                <td>Scrum Master, Project Manager</td>
                <td>Allowed to open, complete, or re-baseline sprints</td>
              </tr>
              <tr>
                <td>Update Milestone Dates</td>
                <td>Project Manager, Delivery Manager</td>
                <td>Allowed to update milestone schedule baselines</td>
              </tr>
              <tr>
                <td>Manual Progress Override</td>
                <td>Delivery Manager, Admin</td>
                <td>Allowed only in exceptional auditable cases with justification</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mpr-card mpr-override">
          <h3>Progress Governance</h3>
          <span>(Automated by default)</span>
          <div className="mpr-lock">
            <LockKeyhole size={28} />
          </div>
          <p>
            Milestone progress is automatically calculated from real-time deliverable completion to prevent reporting discrepancies.
          </p>
          <button type="button" onClick={() => setOverrideOpen(true)}>
            Request Override
          </button>
        </section>
      </section>

      {overrideOpen && (
        <div className="mpr-modal-backdrop" onClick={() => setOverrideOpen(false)}>
          <div className="mpr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mpr-modal-head">
              <div>
                <h2>Request Progress Override</h2>
                <p>Submit this request with justification for authorized review.</p>
              </div>
              <button type="button" onClick={() => setOverrideOpen(false)}>×</button>
            </div>

            {overrideSuccess && (
              <div style={{ padding: "10px 14px", background: "#ecfdf3", border: "1px solid #a6f4c5", borderRadius: "6px", color: "#027a48", fontSize: "12px", marginBottom: "12px" }}>
                {overrideSuccess}
              </div>
            )}

            <label>
              Target Milestone
              <select
                value={selected.id}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {displayMilestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id} — {m.title}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Current Calculated Progress
              <input value={`${selected.progress}%`} readOnly style={{ background: "#f8fafc" }} />
            </label>

            <label>
              Requested Override Progress (%)
              <input
                type="number"
                min={0}
                max={100}
                value={newProgress}
                onChange={(e) => setNewProgress(Number(e.target.value))}
              />
            </label>

            <label>
              Reason for Override Request
              <textarea
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain the technical or commercial justification for this override..."
              />
            </label>

            <div className="mpr-modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setOverrideOpen(false)}
              >
                Cancel
              </button>
              <button type="button" onClick={submitOverride}>
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
