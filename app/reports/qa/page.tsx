"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bug,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  reportsApi,
  reportLookupApi,
  downloadCsvAndAudit,
  downloadJsonAndAudit,
} from "@/lib/reports/api";
import { ReportToolbar } from "@/components/reports/ReportToolbar";
import "@/components/reports/reports.css";

export default function QaDefectAnalyticsReportPage() {
  const [data, setData] = useState<any>(null);
  const [projects, setProjects] = useState<{ _id: string; projectName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [projectId, setProjectId] = useState("ALL");
  const [severity, setSeverity] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const appliedFilters = {
    projectId: projectId !== "ALL" ? projectId : undefined,
    severity: severity !== "ALL" ? severity : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rpt, prList] = await Promise.all([
        reportsApi.qaDefects(appliedFilters),
        reportLookupApi.projects().catch(() => []),
      ]);
      setData(rpt);
      setProjects(prList);
    } catch (e: any) {
      setError(e?.message || "Failed to load QA & defect analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId, severity, fromDate, toDate]);

  const kpis = data?.kpis || {
    totalBugs: 0,
    openBugs: 0,
    inProgressBugs: 0,
    closedBugs: 0,
    reopenedBugs: 0,
    resolutionRate: 0,
    avgResolutionDays: 0,
    totalTestCases: 0,
    testPassRate: 0,
  };
  const bySev = data?.bySeverity || { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  const aging = data?.agingBuckets || { "1-7d": 0, "8-15d": 0, "16-30d": 0, ">30d": 0 };
  const projectSummary: any[] = data?.projectSummary || [];
  const moduleSummary: any[] = data?.moduleSummary || [];
  const assigneeSummary: any[] = data?.assigneeSummary || [];

  const handleExportCsv = () => {
    downloadCsvAndAudit({
      fileName: "qa-defect-analytics",
      reportType: "QA_DEFECTS",
      reportName: "QA & Defect Analytics Report",
      headers: ["Project", "Total Bugs", "Open", "In Progress", "Closed", "Reopened", "Critical", "High", "Medium", "Low"],
      rows: projectSummary.map((p) => [
        p.projectName,
        p.total,
        p.open,
        p.inProgress,
        p.closed,
        p.reopened,
        p.critical,
        p.high,
        p.medium,
        p.low,
      ]),
      appliedFilters,
    });
  };

  const handleExportJson = () => {
    downloadJsonAndAudit({
      fileName: "qa-defect-analytics",
      reportType: "QA_DEFECTS",
      reportName: "QA & Defect Analytics Report",
      data,
      rowCount: projectSummary.length,
      appliedFilters,
    });
  };

  return (
    <div className="rpt-page">
      <div>
        <div className="rpt-breadcrumb">
          <Link href="/reports">Reports &amp; Analytics</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>QA &amp; Defect Analytics</span>
        </div>
        <div className="rpt-header">
          <div>
            <h1 className="rpt-title">QA &amp; Defect Analytics</h1>
            <p className="rpt-subtitle">
              Defect severity breakdown, aging buckets, module quality heatmap, assignee resolution velocity, and test pass rate.
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
        <Link href="/reports/projects" className="rpt-subnav-link">Project Performance</Link>
        <Link href="/reports/resources" className="rpt-subnav-link">Resource Utilization</Link>
        <Link href="/reports/timesheets" className="rpt-subnav-link">Timesheet &amp; Productivity</Link>
        <Link href="/reports/qa" className="rpt-subnav-link active">QA &amp; Defect Analytics</Link>
        <Link href="/reports/saved" className="rpt-subnav-link">Saved, Schedules &amp; Exports</Link>
      </div>

      <ReportToolbar
        reportType="QA_DEFECTS"
        reportName="QA & Defect Analytics Report"
        category="QA & Bug Reports"
        appliedFilters={appliedFilters}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        rowCount={projectSummary.length}
      />

      {error && <div className="rpt-alert rpt-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* Filters */}
      <div className="rpt-filter-bar">
        <select className="rpt-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="ALL">All Projects</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
        </select>
        <select className="rpt-select" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <input type="date" className="rpt-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" className="rpt-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <button type="button" className="rpt-btn rpt-btn-sm" onClick={() => { setProjectId("ALL"); setSeverity("ALL"); setFromDate(""); setToDate(""); }}>Reset</button>
      </div>

      {/* KPIs */}
      <div className="rpt-kpi-grid">
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><Bug size={16} /></div><div><span className="rpt-kpi-label">Total Bugs</span><span className="rpt-kpi-val">{kpis.totalBugs}</span></div></div>
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#fff7ed", color: "#c2410c" }}><AlertTriangle size={16} /></div><div><span className="rpt-kpi-label">Open / Reopened</span><span className="rpt-kpi-val">{kpis.openBugs} / {kpis.reopenedBugs}</span></div></div>
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#ecfdf5", color: "#047857" }}><CheckCircle2 size={16} /></div><div><span className="rpt-kpi-label">Closed ({kpis.resolutionRate}%)</span><span className="rpt-kpi-val" style={{ color: "#047857" }}>{kpis.closedBugs}</span></div></div>
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><Clock size={16} /></div><div><span className="rpt-kpi-label">Avg Resolution</span><span className="rpt-kpi-val">{kpis.avgResolutionDays}d</span></div></div>
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#f5f3ff", color: "#6d28d9" }}><Activity size={16} /></div><div><span className="rpt-kpi-label">Test Pass Rate</span><span className="rpt-kpi-val">{kpis.testPassRate}%</span></div></div>
      </div>

      {/* Severity + Aging Analysis */}
      <div className="rpt-grid-2">
        <div className="rpt-card">
          <h3 className="rpt-card-title" style={{ marginBottom: 10 }}>Defects by Severity</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(
              [
                ["CRITICAL", "#dc2626"],
                ["HIGH", "#ea580c"],
                ["MEDIUM", "#d97706"],
                ["LOW", "#64748b"],
              ] as const
            ).map(([k, col]) => {
              const count = bySev[k] || 0;
              const pct = kpis.totalBugs > 0 ? Math.round((count / kpis.totalBugs) * 100) : 0;
              return (
                <div key={k}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <strong>{k}</strong>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div className="rpt-bar-track">
                    <div className="rpt-bar-fill" style={{ width: `${pct}%`, background: col }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rpt-card">
          <h3 className="rpt-card-title" style={{ marginBottom: 10 }}>Open Defect Aging Buckets</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(
              [
                [">30d", "Over 30 Days", "#dc2626"],
                ["16-30d", "16 – 30 Days", "#ea580c"],
                ["8-15d", "8 – 15 Days", "#d97706"],
                ["1-7d", "1 – 7 Days", "#0755e9"],
              ] as const
            ).map(([k, lbl, col]) => {
              const count = aging[k] || 0;
              const openTot = Math.max(1, kpis.openBugs + kpis.inProgressBugs);
              const pct = Math.min(100, Math.round((count / openTot) * 100));
              return (
                <div key={k}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <strong>{lbl}</strong>
                    <span>{count} bug(s)</span>
                  </div>
                  <div className="rpt-bar-track">
                    <div className="rpt-bar-fill" style={{ width: `${pct}%`, background: col }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Project-Wise Defect Table */}
      <div className="rpt-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4", fontWeight: 700 }}>
          Project-Wise Defect Summary ({projectSummary.length})
        </div>
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead>
              <tr><th>Project</th><th>Total</th><th>Open</th><th>In Progress</th><th>Closed</th><th>Reopened</th><th>Critical</th><th>High</th><th>Medium</th><th>Low</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="rpt-empty">Loading QA analytics...</td></tr>
              ) : projectSummary.length === 0 ? (
                <tr><td colSpan={10} className="rpt-empty">No bugs logged for the selected filters.</td></tr>
              ) : (
                projectSummary.map((p) => (
                  <tr key={p.projectName}>
                    <td style={{ fontWeight: 700 }}>{p.projectName}</td>
                    <td style={{ fontWeight: 700 }}>{p.total}</td>
                    <td style={{ color: "#dc2626" }}>{p.open}</td>
                    <td style={{ color: "#0755e9" }}>{p.inProgress}</td>
                    <td style={{ color: "#047857" }}>{p.closed}</td>
                    <td>{p.reopened}</td>
                    <td><span className="rpt-badge rpt-badge-red">{p.critical}</span></td>
                    <td><span className="rpt-badge rpt-badge-amber">{p.high}</span></td>
                    <td>{p.medium}</td>
                    <td>{p.low}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Module Heatmap + Assignee Performance */}
      <div className="rpt-grid-2">
        <div className="rpt-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4", fontWeight: 700 }}>
            Module Quality Matrix ({moduleSummary.length})
          </div>
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead><tr><th>Module</th><th>Total</th><th>Open</th><th>Critical</th><th>High</th></tr></thead>
              <tbody>
                {moduleSummary.length === 0 ? (
                  <tr><td colSpan={5} className="rpt-empty">No module defect data.</td></tr>
                ) : (
                  moduleSummary.map((m) => (
                    <tr key={m.module}>
                      <td style={{ fontWeight: 600 }}>{m.module}</td>
                      <td>{m.total}</td>
                      <td>{m.open}</td>
                      <td><span className="rpt-badge rpt-badge-red">{m.critical}</span></td>
                      <td><span className="rpt-badge rpt-badge-amber">{m.high}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rpt-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4", fontWeight: 700 }}>
            Assignee Resolution Performance ({assigneeSummary.length})
          </div>
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead><tr><th>Assignee</th><th>Assigned</th><th>Resolved</th><th>Open</th><th>Reopened</th></tr></thead>
              <tbody>
                {assigneeSummary.length === 0 ? (
                  <tr><td colSpan={5} className="rpt-empty">No assignee data.</td></tr>
                ) : (
                  assigneeSummary.map((a) => (
                    <tr key={a.assignee}>
                      <td style={{ fontWeight: 600 }}>{a.assignee}</td>
                      <td>{a.assigned}</td>
                      <td style={{ color: "#047857", fontWeight: 600 }}>{a.resolved}</td>
                      <td>{a.open}</td>
                      <td>{a.reopened}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
