"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wallet,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  reportsApi,
  reportLookupApi,
  downloadCsvAndAudit,
  downloadJsonAndAudit,
  formatShortDate,
  formatCurrencyInr,
} from "@/lib/reports/api";
import { ReportToolbar } from "@/components/reports/ReportToolbar";
import "@/components/reports/reports.css";

export default function ProjectPerformanceReportPage() {
  const [data, setData] = useState<any>(null);
  const [clients, setClients] = useState<{ _id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ _id: string; projectName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [clientId, setClientId] = useState("ALL");
  const [projectId, setProjectId] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const appliedFilters = {
    clientId: clientId !== "ALL" ? clientId : undefined,
    projectId: projectId !== "ALL" ? projectId : undefined,
    status: status !== "ALL" ? status : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rpt, clList, prList] = await Promise.all([
        reportsApi.projectPerformance(appliedFilters),
        reportLookupApi.clients().catch(() => []),
        reportLookupApi.projects().catch(() => []),
      ]);
      setData(rpt);
      setClients(clList);
      setProjects(prList);
    } catch (e: any) {
      setError(e?.message || "Failed to load project performance report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientId, projectId, status, fromDate, toDate]);

  const kpis = data?.kpis || {
    totalProjects: 0,
    onTrack: 0,
    atRisk: 0,
    delayed: 0,
    avgProgress: 0,
    milestonesOnTimePct: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalBudget: 0,
    totalActualCost: 0,
    budgetUtilizationPct: 0,
  };
  const projectRows: any[] = data?.projectRows || [];
  const milestoneRows: any[] = data?.milestoneRows || [];
  const taskCounts = data?.taskStatusCounts || { completed: 0, inProgress: 0, pending: 0 };
  const insights: string[] = data?.insights || [];

  const r = 36;
  const circ = 2 * Math.PI * r;
  const onTrackPct = kpis.totalProjects > 0 ? Math.round((kpis.onTrack / kpis.totalProjects) * 100) : 0;
  const onTrackArc = (onTrackPct / 100) * circ;
  const progArc = (Math.min(100, kpis.avgProgress) / 100) * circ;

  const handleExportCsv = () => {
    downloadCsvAndAudit({
      fileName: "project-performance-report",
      reportType: "PROJECT_PERFORMANCE",
      reportName: "Project Performance Report",
      headers: ["Code", "Project Name", "Client", "Status", "Health", "Progress %", "Tasks Done", "Total Tasks", "Milestones Done", "Budget", "Actual Cost"],
      rows: projectRows.map((p) => [
        p.projectCode,
        p.projectName,
        p.clientName,
        p.status,
        p.health,
        p.progress,
        p.doneTasks,
        p.totalTasks,
        p.doneMilestones,
        p.budget,
        p.actualCost,
      ]),
      appliedFilters,
    });
  };

  const handleExportJson = () => {
    downloadJsonAndAudit({
      fileName: "project-performance-report",
      reportType: "PROJECT_PERFORMANCE",
      reportName: "Project Performance Report",
      data,
      rowCount: projectRows.length,
      appliedFilters,
    });
  };

  return (
    <div className="rpt-page">
      <div>
        <div className="rpt-breadcrumb">
          <Link href="/reports">Reports &amp; Analytics</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Project Performance</span>
        </div>
        <div className="rpt-header">
          <div>
            <h1 className="rpt-title">Project Performance Report</h1>
            <p className="rpt-subtitle">
              Track project health, task &amp; milestone completion, delivery status, and budget utilization.
            </p>
          </div>
          <button type="button" className="rpt-btn" onClick={loadData} disabled={loading}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Subnav */}
      <div className="rpt-subnav">
        <Link href="/reports" className="rpt-subnav-link">Report Center</Link>
        <Link href="/reports/projects" className="rpt-subnav-link active">Project Performance</Link>
        <Link href="/reports/resources" className="rpt-subnav-link">Resource Utilization</Link>
        <Link href="/reports/timesheets" className="rpt-subnav-link">Timesheet &amp; Productivity</Link>
        <Link href="/reports/qa" className="rpt-subnav-link">QA &amp; Defect Analytics</Link>
        <Link href="/reports/saved" className="rpt-subnav-link">Saved, Schedules &amp; Exports</Link>
      </div>

      <ReportToolbar
        reportType="PROJECT_PERFORMANCE"
        reportName="Project Performance Report"
        category="Project Reports"
        appliedFilters={appliedFilters}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        rowCount={projectRows.length}
      />

      {error && <div className="rpt-alert rpt-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* Cascading Filter Bar */}
      <div className="rpt-filter-bar">
        <select className="rpt-select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="ALL">All Clients</option>
          {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select className="rpt-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="ALL">All Projects</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
        </select>
        <select className="rpt-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="PLANNING">Planning</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <input type="date" className="rpt-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} title="From Date" />
        <input type="date" className="rpt-input" value={toDate} onChange={(e) => setToDate(e.target.value)} title="To Date" />
        <button
          type="button"
          className="rpt-btn rpt-btn-sm"
          onClick={() => { setClientId("ALL"); setProjectId("ALL"); setStatus("ALL"); setFromDate(""); setToDate(""); }}
        >
          Reset
        </button>
      </div>

      {/* KPI Strip */}
      <div className="rpt-kpi-grid">
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><BarChart3 size={16} /></div><div><span className="rpt-kpi-label">Total Projects</span><span className="rpt-kpi-val">{kpis.totalProjects}</span></div></div>
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#ecfdf5", color: "#047857" }}><CheckCircle2 size={16} /></div><div><span className="rpt-kpi-label">On Track</span><span className="rpt-kpi-val" style={{ color: "#047857" }}>{kpis.onTrack}</span></div></div>
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#fffbeb", color: "#b45309" }}><AlertTriangle size={16} /></div><div><span className="rpt-kpi-label">At Risk</span><span className="rpt-kpi-val" style={{ color: "#b45309" }}>{kpis.atRisk}</span></div></div>
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><Clock size={16} /></div><div><span className="rpt-kpi-label">Delayed</span><span className="rpt-kpi-val" style={{ color: "#dc2626" }}>{kpis.delayed}</span></div></div>
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#f5f3ff", color: "#6d28d9" }}><Wallet size={16} /></div><div><span className="rpt-kpi-label">Total Budget</span><span className="rpt-kpi-val">{formatCurrencyInr(kpis.totalBudget)}</span></div></div>
      </div>

      {/* Charts + Insights */}
      <div className="rpt-grid-2">
        <div className="rpt-card" style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <svg width={94} height={94} viewBox="0 0 94 94">
            <circle cx={47} cy={47} r={r} fill="none" stroke="#e5ecf5" strokeWidth={11} />
            <circle cx={47} cy={47} r={r} fill="none" stroke="#079b62" strokeWidth={11} strokeDasharray={`${onTrackArc} ${circ}`} transform="rotate(-90 47 47)" />
            <text x="47" y="51" textAnchor="middle" fontSize="14" fontWeight="700" fill="#10204a">{onTrackPct}%</text>
          </svg>
          <div>
            <h3 className="rpt-card-title" style={{ marginBottom: 6 }}>Project Health Distribution</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
              <span><strong style={{ color: "#047857" }}>● On Track:</strong> {kpis.onTrack}</span>
              <span><strong style={{ color: "#b45309" }}>● At Risk:</strong> {kpis.atRisk}</span>
              <span><strong style={{ color: "#dc2626" }}>● Delayed:</strong> {kpis.delayed}</span>
            </div>
          </div>
        </div>

        <div className="rpt-card" style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <svg width={94} height={94} viewBox="0 0 94 94">
            <circle cx={47} cy={47} r={r} fill="none" stroke="#e5ecf5" strokeWidth={11} />
            <circle cx={47} cy={47} r={r} fill="none" stroke="#0755e9" strokeWidth={11} strokeDasharray={`${progArc} ${circ}`} transform="rotate(-90 47 47)" />
            <text x="47" y="51" textAnchor="middle" fontSize="14" fontWeight="700" fill="#10204a">{kpis.avgProgress}%</text>
          </svg>
          <div>
            <h3 className="rpt-card-title" style={{ marginBottom: 6 }}>Delivery &amp; Task Progress</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
              <span><strong>Tasks Completed:</strong> {taskCounts.completed} / {kpis.totalTasks}</span>
              <span><strong>Tasks In Progress:</strong> {taskCounts.inProgress} · Pending: {taskCounts.pending}</span>
              <span><strong>Milestones Completed:</strong> {kpis.milestonesOnTimePct}% · <strong>Budget Util:</strong> {kpis.budgetUtilizationPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {insights.length > 0 && (
        <div className="rpt-alert rpt-alert-info" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
          <strong style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Sparkles size={13} /> Executive Insights</strong>
          {insights.map((ins, i) => <div key={i}>• {ins}</div>)}
        </div>
      )}

      {/* Project Performance Table */}
      <div className="rpt-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4", fontWeight: 700 }}>
          Project Portfolio Performance ({projectRows.length})
        </div>
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Client</th>
                <th>Timeline</th>
                <th>Tasks</th>
                <th>Milestones</th>
                <th>Progress</th>
                <th>Budget / Actual</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="rpt-empty">Generating project report...</td></tr>
              ) : projectRows.length === 0 ? (
                <tr><td colSpan={8} className="rpt-empty">No projects match the selected filters.</td></tr>
              ) : (
                projectRows.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <Link href={`/projects/${p._id}`} style={{ fontWeight: 700, color: "#0755e9", textDecoration: "none" }}>
                        {p.projectName}
                      </Link>
                      {p.projectCode && <div style={{ fontSize: 10, color: "#64748b" }}>{p.projectCode}</div>}
                    </td>
                    <td>{p.clientName}</td>
                    <td style={{ whiteSpace: "nowrap", color: "#64748b" }}>
                      {formatShortDate(p.startDate)} → {formatShortDate(p.endDate)}
                    </td>
                    <td>{p.doneTasks} / {p.totalTasks}</td>
                    <td>{p.doneMilestones} / {p.totalMilestones}</td>
                    <td style={{ minWidth: 115 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div className="rpt-bar-track" style={{ flex: 1 }}>
                          <div className="rpt-bar-fill" style={{ width: `${p.progress}%`, background: p.health === "DELAYED" ? "#dc2626" : p.health === "AT_RISK" ? "#d97706" : "#079b62" }} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 10.5 }}>{p.progress}%</span>
                      </div>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {formatCurrencyInr(p.budget)} / <span style={{ color: "#64748b" }}>{formatCurrencyInr(p.actualCost)}</span>
                    </td>
                    <td>
                      <span className={p.health === "ON_TRACK" ? "rpt-badge rpt-badge-green" : p.health === "AT_RISK" ? "rpt-badge rpt-badge-amber" : "rpt-badge rpt-badge-red"}>
                        {p.health.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Milestone Performance Table */}
      <div className="rpt-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4", fontWeight: 700 }}>
          Milestone Delivery Summary ({milestoneRows.length})
        </div>
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead>
              <tr><th>Milestone</th><th>Project</th><th>Due Date</th><th>Progress</th><th>Status</th></tr>
            </thead>
            <tbody>
              {milestoneRows.length === 0 ? (
                <tr><td colSpan={5} className="rpt-empty">No milestones found for selected projects.</td></tr>
              ) : (
                milestoneRows.map((m) => (
                  <tr key={m._id}>
                    <td style={{ fontWeight: 600 }}>{m.title}</td>
                    <td>{m.projectName}</td>
                    <td style={{ color: m.isOverdue ? "#dc2626" : "#64748b", fontWeight: m.isOverdue ? 700 : 400 }}>
                      {formatShortDate(m.dueDate)} {m.isOverdue ? "(Overdue)" : ""}
                    </td>
                    <td>{m.progress}%</td>
                    <td><span className="rpt-badge rpt-badge-blue">{m.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
