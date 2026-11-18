"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Clock,
  CheckCircle2,
  FileClock,
  Users,
  Briefcase,
  Gauge,
  RefreshCw,
  Download,
  AlertTriangle,
} from "lucide-react";
import {
  timesheetApi,
  tsLookupApi,
  getInitials,
} from "@/lib/timesheets/api";
import "@/components/timesheets/timesheets.css";

const WORK_TYPE_COLORS = ["#0755e9", "#079b62", "#f59e0b", "#7c3aed", "#0891b2", "#ec4899", "#64748b"];

export default function TimesheetAnalyticsPage() {
  const now = new Date();
  const [startDate, setStartDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10));
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");

  const [projects, setProjects] = useState<{ _id: string; projectName: string }[]>([]);
  const [departments, setDepartments] = useState<{ _id: string; name: string }[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, projs, depts] = await Promise.all([
        timesheetApi.getAnalytics({
          startDate,
          endDate,
          projectId: projectFilter !== "ALL" ? projectFilter : undefined,
          departmentId: deptFilter !== "ALL" ? deptFilter : undefined,
        }),
        tsLookupApi.projects().catch(() => []),
        tsLookupApi.departments().catch(() => []),
      ]);
      setData(res);
      setProjects(projs);
      setDepartments(depts);
    } catch (e: any) {
      setError(e?.message || "Failed to load timesheet analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [startDate, endDate, projectFilter, deptFilter]);

  const summary = data?.summary || {
    totalHours: 0,
    billableHours: 0,
    nonBillableHours: 0,
    billablePercent: 0,
    nonBillablePercent: 0,
    activeTeamMembers: 0,
    projectsCount: 0,
    avgUtilization: 0,
  };
  const dailyTrend: any[] = data?.dailyTrend || [];
  const hoursByProject: any[] = data?.hoursByProject || [];
  const hoursByMember: any[] = data?.hoursByMember || [];
  const hoursByWorkType: any[] = data?.hoursByWorkType || [];
  const departmentHours: any[] = data?.departmentHours || [];
  const insights: any[] = data?.insights || [];

  const maxDaily = useMemo(() => Math.max(1, ...dailyTrend.map((d) => d.total || 0)), [dailyTrend]);
  const maxMember = useMemo(() => Math.max(1, ...hoursByMember.map((m) => m.totalHours || 0)), [hoursByMember]);

  // Donut math
  const r = 38;
  const circ = 2 * Math.PI * r;
  const billArc = (Math.min(100, summary.billablePercent) / 100) * circ;
  const utilArc = (Math.min(100, summary.avgUtilization) / 100) * circ;

  const handleExportCsv = () => {
    const headers = ["Project", "Total Hours", "Billable Hours", "Non-Billable Hours", "Team Members", "Billable %"];
    const rows = hoursByProject.map((p) => [
      p.projectName,
      p.totalHours,
      p.billableHours,
      p.nonBillableHours,
      p.teamMembers,
      `${p.billablePercent}%`,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${String(v ?? "")}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheet-analytics-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ts-page">
      {/* Header */}
      <div>
        <div className="ts-breadcrumb">
          <Link href="/timesheets">Timesheets</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Timesheet Analytics</span>
        </div>
        <div className="ts-header">
          <div>
            <h1 className="ts-title">Timesheet Analytics</h1>
            <p className="ts-subtitle">Live insights into billable ratio, logged effort by project, work type, department, and team utilization.</p>
          </div>
          <div className="ts-actions">
            <input className="ts-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <span style={{ color: "#64748b" }}>to</span>
            <input className="ts-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <select className="ts-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="ALL">All Projects</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
            </select>
            <select className="ts-select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="ALL">All Departments</option>
              {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
            <button type="button" className="ts-btn" onClick={handleExportCsv}><Download size={12} /> Export</button>
            <button type="button" className="ts-btn ts-btn-primary" onClick={loadAnalytics} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Apply
            </button>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="ts-subnav">
        <Link href="/timesheets" className="ts-subnav-link">My Timesheet</Link>
        <Link href="/timesheets/new" className="ts-subnav-link">Add Time Entry</Link>
        <Link href="/timesheets/weekly" className="ts-subnav-link">Weekly Timesheet</Link>
        <Link href="/timesheets/team" className="ts-subnav-link">Team Timesheets</Link>
        <Link href="/timesheets/approvals" className="ts-subnav-link">Timesheet Approvals</Link>
        <Link href="/timesheets/analytics" className="ts-subnav-link active">Timesheet Analytics</Link>
      </div>

      {error && <div className="ts-alert ts-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* 6-KPI Strip matching TIME-006 */}
      <div className="ts-kpi-grid">
        <div className="ts-kpi"><div className="ts-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><Clock size={16} /></div><div><span className="ts-kpi-label">Total Hours</span><span className="ts-kpi-val">{summary.totalHours}h</span></div></div>
        <div className="ts-kpi"><div className="ts-kpi-icon" style={{ background: "#ecfdf5", color: "#079b62" }}><CheckCircle2 size={16} /></div><div><span className="ts-kpi-label">Billable Hours</span><span className="ts-kpi-val">{summary.billableHours}h</span><span className="ts-kpi-sub" style={{ color: "#079b62" }}>{summary.billablePercent}% of total</span></div></div>
        <div className="ts-kpi"><div className="ts-kpi-icon" style={{ background: "#fffbeb", color: "#d97706" }}><FileClock size={16} /></div><div><span className="ts-kpi-label">Non-Billable Hours</span><span className="ts-kpi-val">{summary.nonBillableHours}h</span><span className="ts-kpi-sub">{summary.nonBillablePercent}% of total</span></div></div>
        <div className="ts-kpi"><div className="ts-kpi-icon" style={{ background: "#eff6ff", color: "#0284c7" }}><Users size={16} /></div><div><span className="ts-kpi-label">Active Members</span><span className="ts-kpi-val">{summary.activeTeamMembers}</span></div></div>
        <div className="ts-kpi"><div className="ts-kpi-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}><Briefcase size={16} /></div><div><span className="ts-kpi-label">Projects Logged</span><span className="ts-kpi-val">{summary.projectsCount}</span></div></div>
        <div className="ts-kpi"><div className="ts-kpi-icon" style={{ background: "#ecfdf5", color: "#079b62" }}><Gauge size={16} /></div><div><span className="ts-kpi-label">Avg. Utilization</span><span className="ts-kpi-val">{summary.avgUtilization}%</span></div></div>
      </div>

      {/* Row 1 Charts: Daily Trend + Billable Donut + Utilization Ring */}
      <div className="ts-grid-3">
        <div className="ts-card">
          <div className="ts-card-head"><h3 className="ts-card-title">Daily Hours Trend</h3></div>
          {dailyTrend.length === 0 ? (
            <div className="ts-empty" style={{ padding: 18 }}>No logged days in selected range.</div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 145, overflowX: "auto", paddingTop: 10 }}>
              {dailyTrend.slice(-14).map((d) => {
                const h = Math.max(8, Math.round((d.total / maxDaily) * 110));
                const billH = d.total > 0 ? Math.round((d.billable / d.total) * h) : 0;
                return (
                  <div key={d.date} style={{ flex: 1, minWidth: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 9, fontWeight: 700 }}>{d.total}</span>
                    <div style={{ width: 14, height: h, background: "#f59e0b", borderRadius: "3px 3px 0 0", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden" }} title={`${d.date}: ${d.total}h (${d.billable}h billable)`}>
                      <div style={{ width: "100%", height: billH, background: "#0755e9" }} />
                    </div>
                    <span style={{ fontSize: 9, color: "#64748b" }}>{d.date.slice(8)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="ts-card">
          <div className="ts-card-head"><h3 className="ts-card-title">Billable vs Non-Billable</h3></div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r={r} fill="none" stroke="#f59e0b" strokeWidth="11" />
              <circle cx="48" cy="48" r={r} fill="none" stroke="#079b62" strokeWidth="11" strokeDasharray={`${billArc} ${circ}`} transform="rotate(-90 48 48)" />
              <text x="48" y="47" textAnchor="middle" fontSize="12" fontWeight="700" fill="#10204a">{summary.totalHours}h</text>
              <text x="48" y="59" textAnchor="middle" fontSize="8.5" fill="#64748b">Total</text>
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11 }}>
              <div><strong style={{ color: "#079b62" }}>● Billable:</strong> {summary.billableHours}h ({summary.billablePercent}%)</div>
              <div><strong style={{ color: "#d97706" }}>● Non-Billable:</strong> {summary.nonBillableHours}h ({summary.nonBillablePercent}%)</div>
            </div>
          </div>
        </div>

        <div className="ts-card">
          <div className="ts-card-head"><h3 className="ts-card-title">Utilization Rate</h3></div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r={r} fill="none" stroke="#e2e8f0" strokeWidth="11" />
              <circle cx="48" cy="48" r={r} fill="none" stroke="#0755e9" strokeWidth="11" strokeDasharray={`${utilArc} ${circ}`} strokeLinecap="round" transform="rotate(-90 48 48)" />
              <text x="48" y="48" textAnchor="middle" fontSize="13" fontWeight="700" fill="#10204a">{summary.avgUtilization}%</text>
              <text x="48" y="60" textAnchor="middle" fontSize="8.5" fill="#64748b">Utilized</text>
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 10.5 }}>
              {insights.slice(0, 2).map((ins, i) => (
                <div key={i}>
                  <div style={{ fontWeight: 700 }}>{ins.title}</div>
                  <div style={{ color: "#64748b", fontSize: 10 }}>{ins.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 Charts: Work Type + Department Hours + Team Member Bars */}
      <div className="ts-grid-3">
        <div className="ts-card">
          <div className="ts-card-head"><h3 className="ts-card-title">Hours by Work Type</h3></div>
          {hoursByWorkType.length === 0 ? (
            <div className="ts-empty" style={{ padding: 16 }}>No data.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {hoursByWorkType.map((wt, i) => (
                <div key={wt.workType}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600 }}>{wt.workType}</span>
                    <strong>{wt.hours}h ({wt.percent}%)</strong>
                  </div>
                  <div className="ts-bar-track">
                    <div className="ts-bar-fill" style={{ width: `${wt.percent}%`, background: WORK_TYPE_COLORS[i % WORK_TYPE_COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ts-card">
          <div className="ts-card-head"><h3 className="ts-card-title">Department-wise Hours</h3></div>
          {departmentHours.length === 0 ? (
            <div className="ts-empty" style={{ padding: 16 }}>No data.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {departmentHours.map((d) => (
                <div key={d.department}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600 }}>{d.department}</span>
                    <strong>{d.total}h</strong>
                  </div>
                  <div className="ts-bar-track">
                    <div className="ts-bar-fill" style={{ width: `${Math.min(100, (d.total / Math.max(1, summary.totalHours)) * 100)}%`, background: "#0755e9" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ts-card">
          <div className="ts-card-head"><h3 className="ts-card-title">Hours by Team Member</h3></div>
          {hoursByMember.length === 0 ? (
            <div className="ts-empty" style={{ padding: 16 }}>No data.</div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 140, overflowX: "auto", paddingTop: 10 }}>
              {hoursByMember.slice(0, 8).map((m) => {
                const h = Math.max(10, Math.round((m.totalHours / maxMember) * 100));
                const billH = m.totalHours > 0 ? Math.round((m.billableHours / m.totalHours) * h) : 0;
                return (
                  <div key={m.employeeId} style={{ flex: 1, minWidth: 42, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700 }}>{m.totalHours}h</span>
                    <div style={{ width: 18, height: h, background: "#f59e0b", borderRadius: "3px 3px 0 0", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden" }}>
                      <div style={{ width: "100%", height: billH, background: "#0755e9" }} />
                    </div>
                    <span style={{ fontSize: 9.5, color: "#475569", maxWidth: 48, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name.split(" ")[0]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Drill-down Tables (TIME-006 Bottom Panels 1 & 2) */}
      <div className="ts-grid-2">
        <div className="ts-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4" }}>
            <h3 className="ts-card-title">Drill Down — Project Wise</h3>
          </div>
          <div className="ts-table-wrap">
            <table className="ts-table">
              <thead><tr><th>Project</th><th>Total</th><th>Billable</th><th>Non-Billable</th><th>Members</th><th>Billable %</th></tr></thead>
              <tbody>
                {hoursByProject.length === 0 ? (
                  <tr><td colSpan={6} className="ts-empty">No project hours in this date range.</td></tr>
                ) : (
                  hoursByProject.map((p) => (
                    <tr key={p.projectName}>
                      <td><strong>{p.projectName}</strong></td>
                      <td><strong>{p.totalHours}h</strong></td>
                      <td style={{ color: "#079b62" }}>{p.billableHours}h</td>
                      <td>{p.nonBillableHours}h</td>
                      <td>{p.teamMembers}</td>
                      <td><span className="ts-badge ts-badge-blue">{p.billablePercent}%</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ts-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4" }}>
            <h3 className="ts-card-title">Drill Down — Team Member Performance</h3>
          </div>
          <div className="ts-table-wrap">
            <table className="ts-table">
              <thead><tr><th>Member</th><th>Total</th><th>Billable</th><th>Non-Billable</th><th>Utilization</th></tr></thead>
              <tbody>
                {hoursByMember.length === 0 ? (
                  <tr><td colSpan={5} className="ts-empty">No member hours in this date range.</td></tr>
                ) : (
                  hoursByMember.map((m) => (
                    <tr key={m.employeeId}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span className="ts-avatar">{m.avatarUrl ? <img src={m.avatarUrl} alt={m.name} /> : getInitials(m.name)}</span>
                          <strong>{m.name}</strong>
                        </div>
                      </td>
                      <td><strong>{m.totalHours}h</strong></td>
                      <td style={{ color: "#079b62" }}>{m.billableHours}h</td>
                      <td>{m.nonBillableHours}h</td>
                      <td><span className={`ts-badge ${m.utilization >= 75 ? "ts-badge-green" : m.utilization >= 50 ? "ts-badge-amber" : "ts-badge-red"}`}>{m.utilization}%</span></td>
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
