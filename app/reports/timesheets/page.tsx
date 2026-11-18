"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  DollarSign,
  FileCheck,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  reportsApi,
  reportLookupApi,
  downloadCsvAndAudit,
  downloadJsonAndAudit,
  formatShortDate,
} from "@/lib/reports/api";
import { ReportToolbar } from "@/components/reports/ReportToolbar";
import "@/components/reports/reports.css";

export default function TimesheetProductivityReportPage() {
  const [data, setData] = useState<any>(null);
  const [projects, setProjects] = useState<{ _id: string; projectName: string }[]>([]);
  const [employees, setEmployees] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [projectId, setProjectId] = useState("ALL");
  const [employeeId, setEmployeeId] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const appliedFilters = {
    projectId: projectId !== "ALL" ? projectId : undefined,
    employeeId: employeeId !== "ALL" ? employeeId : undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rpt, prList, empList] = await Promise.all([
        reportsApi.timesheetProductivity(appliedFilters),
        reportLookupApi.projects().catch(() => []),
        reportLookupApi.employees().catch(() => []),
      ]);
      setData(rpt);
      setProjects(prList);
      setEmployees(empList);
    } catch (e: any) {
      setError(e?.message || "Failed to load timesheet analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId, employeeId, statusFilter, fromDate, toDate]);

  const kpis = data?.kpis || {
    totalHours: 0,
    billableHours: 0,
    nonBillableHours: 0,
    billablePct: 0,
    submissionCompliancePct: 0,
    totalTimesheets: 0,
    approvedCount: 0,
    pendingCount: 0,
    draftCount: 0,
  };
  const projectSummary: any[] = data?.projectSummary || [];
  const teamSummary: any[] = data?.teamSummary || [];
  const entries: any[] = data?.entries || [];

  const r = 36;
  const circ = 2 * Math.PI * r;
  const billArc = (Math.min(100, kpis.billablePct) / 100) * circ;

  const handleExportCsv = () => {
    downloadCsvAndAudit({
      fileName: "timesheet-productivity-report",
      reportType: "TIMESHEET_PRODUCTIVITY",
      reportName: "Timesheet & Productivity Report",
      headers: ["Date", "Employee", "Project", "Task", "Work Type", "Hours", "Billable", "Status"],
      rows: entries.map((e) => [
        formatShortDate(e.date),
        e.employeeName,
        e.projectName,
        e.taskTitle,
        e.workType,
        e.hours,
        e.billable ? "Yes" : "No",
        e.status,
      ]),
      appliedFilters,
    });
  };

  const handleExportJson = () => {
    downloadJsonAndAudit({
      fileName: "timesheet-productivity-report",
      reportType: "TIMESHEET_PRODUCTIVITY",
      reportName: "Timesheet & Productivity Report",
      data,
      rowCount: entries.length,
      appliedFilters,
    });
  };

  return (
    <div className="rpt-page">
      <div>
        <div className="rpt-breadcrumb">
          <Link href="/reports">Reports &amp; Analytics</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Timesheet &amp; Productivity</span>
        </div>
        <div className="rpt-header">
          <div>
            <h1 className="rpt-title">Timesheet &amp; Productivity Report</h1>
            <p className="rpt-subtitle">
              Track logged hours, billable vs non-billable split, submission compliance, and team productivity.
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
        <Link href="/reports/timesheets" className="rpt-subnav-link active">Timesheet &amp; Productivity</Link>
        <Link href="/reports/qa" className="rpt-subnav-link">QA &amp; Defect Analytics</Link>
        <Link href="/reports/saved" className="rpt-subnav-link">Saved, Schedules &amp; Exports</Link>
      </div>

      <ReportToolbar
        reportType="TIMESHEET_PRODUCTIVITY"
        reportName="Timesheet & Productivity Report"
        category="Timesheet Reports"
        appliedFilters={appliedFilters}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        rowCount={entries.length}
      />

      {error && <div className="rpt-alert rpt-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* Filters */}
      <div className="rpt-filter-bar">
        <select className="rpt-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="ALL">All Projects</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
        </select>
        <select className="rpt-select" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="ALL">All Employees</option>
          {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
        </select>
        <select className="rpt-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="LOCKED">Locked</option>
        </select>
        <input type="date" className="rpt-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" className="rpt-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <button type="button" className="rpt-btn rpt-btn-sm" onClick={() => { setProjectId("ALL"); setEmployeeId("ALL"); setStatusFilter("ALL"); setFromDate(""); setToDate(""); }}>Reset</button>
      </div>

      {/* KPIs */}
      <div className="rpt-kpi-grid">
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><Clock size={16} /></div><div><span className="rpt-kpi-label">Total Hours</span><span className="rpt-kpi-val">{kpis.totalHours}h</span></div></div>
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#ecfdf5", color: "#047857" }}><DollarSign size={16} /></div><div><span className="rpt-kpi-label">Billable ({kpis.billablePct}%)</span><span className="rpt-kpi-val" style={{ color: "#047857" }}>{kpis.billableHours}h</span></div></div>
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#fffbeb", color: "#b45309" }}><Clock size={16} /></div><div><span className="rpt-kpi-label">Non-Billable</span><span className="rpt-kpi-val">{kpis.nonBillableHours}h</span></div></div>
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#f5f3ff", color: "#6d28d9" }}><FileCheck size={16} /></div><div><span className="rpt-kpi-label">Compliance</span><span className="rpt-kpi-val">{kpis.submissionCompliancePct}%</span></div></div>
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#ecfdf5", color: "#079b62" }}><CheckCircle2 size={16} /></div><div><span className="rpt-kpi-label">Approved / Pending</span><span className="rpt-kpi-val">{kpis.approvedCount} / {kpis.pendingCount}</span></div></div>
      </div>

      {/* Billable Donut + Project Breakdown */}
      <div className="rpt-grid-2">
        <div className="rpt-card" style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <svg width={94} height={94} viewBox="0 0 94 94">
            <circle cx={47} cy={47} r={r} fill="none" stroke="#e5ecf5" strokeWidth={11} />
            <circle cx={47} cy={47} r={r} fill="none" stroke="#0755e9" strokeWidth={11} strokeDasharray={`${billArc} ${circ}`} transform="rotate(-90 47 47)" />
            <text x="47" y="51" textAnchor="middle" fontSize="14" fontWeight="700" fill="#10204a">{kpis.billablePct}%</text>
          </svg>
          <div>
            <h3 className="rpt-card-title" style={{ marginBottom: 6 }}>Billable vs Non-Billable</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
              <span><strong style={{ color: "#0755e9" }}>● Billable:</strong> {kpis.billableHours}h ({kpis.billablePct}%)</span>
              <span><strong style={{ color: "#64748b" }}>● Non-Billable:</strong> {kpis.nonBillableHours}h</span>
              <span><strong>Timesheets:</strong> {kpis.totalTimesheets} total · {kpis.draftCount} draft</span>
            </div>
          </div>
        </div>

        <div className="rpt-card">
          <h3 className="rpt-card-title" style={{ marginBottom: 9 }}>Project-Wise Hours</h3>
          {projectSummary.length === 0 ? (
            <div className="rpt-empty">No timesheet hours recorded yet.</div>
          ) : (
            <div className="rpt-table-wrap">
              <table className="rpt-table">
                <thead><tr><th>Project</th><th>Total</th><th>Billable</th><th>Non-Billable</th><th>Bill %</th></tr></thead>
                <tbody>
                  {projectSummary.map((p) => (
                    <tr key={p.projectName}>
                      <td style={{ fontWeight: 600 }}>{p.projectName}</td>
                      <td>{p.totalHours}h</td>
                      <td style={{ color: "#047857", fontWeight: 600 }}>{p.billableHours}h</td>
                      <td>{p.nonBillableHours}h</td>
                      <td><span className="rpt-badge rpt-badge-blue">{p.billablePct}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Team Productivity Comparison */}
      <div className="rpt-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4", fontWeight: 700 }}>
          Team Productivity Comparison ({teamSummary.length})
        </div>
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead><tr><th>Team Member</th><th>Entries</th><th>Total Hours</th><th>Billable Hours</th><th>Non-Billable</th><th>Billable %</th></tr></thead>
            <tbody>
              {teamSummary.length === 0 ? (
                <tr><td colSpan={6} className="rpt-empty">No team productivity data found.</td></tr>
              ) : (
                teamSummary.map((m) => (
                  <tr key={m.employeeName}>
                    <td style={{ fontWeight: 700 }}>{m.employeeName}</td>
                    <td>{m.entries}</td>
                    <td>{m.totalHours}h</td>
                    <td style={{ color: "#047857", fontWeight: 600 }}>{m.billableHours}h</td>
                    <td>{m.nonBillableHours}h</td>
                    <td><span className="rpt-badge rpt-badge-green">{m.billablePct}%</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Entries */}
      <div className="rpt-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4", fontWeight: 700 }}>
          Detailed Timesheet Entries ({entries.length})
        </div>
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead><tr><th>Date</th><th>Member</th><th>Project</th><th>Task / Work</th><th>Hours</th><th>Billable</th><th>Status</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="rpt-empty">Loading entries...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={7} className="rpt-empty">No timesheet entries match your filters.</td></tr>
              ) : (
                entries.map((e, i) => (
                  <tr key={e._id || i}>
                    <td style={{ whiteSpace: "nowrap", color: "#64748b" }}>{formatShortDate(e.date)}</td>
                    <td style={{ fontWeight: 600 }}>{e.employeeName}</td>
                    <td>{e.projectName}</td>
                    <td>{e.taskTitle}</td>
                    <td style={{ fontWeight: 700 }}>{e.hours}h</td>
                    <td><span className={e.billable ? "rpt-badge rpt-badge-green" : "rpt-badge rpt-badge-slate"}>{e.billable ? "Billable" : "Non-Billable"}</span></td>
                    <td><span className="rpt-badge rpt-badge-blue">{e.status}</span></td>
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
