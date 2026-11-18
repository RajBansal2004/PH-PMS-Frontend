"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Gauge,
  UserCheck,
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

export default function ResourceUtilizationReportPage() {
  const [data, setData] = useState<any>(null);
  const [projects, setProjects] = useState<{ _id: string; projectName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [projectId, setProjectId] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const appliedFilters = {
    projectId: projectId !== "ALL" ? projectId : undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rpt, prList] = await Promise.all([
        reportsApi.resourceUtilization(appliedFilters),
        reportLookupApi.projects().catch(() => []),
      ]);
      setData(rpt);
      setProjects(prList);
    } catch (e: any) {
      setError(e?.message || "Failed to load resource utilization report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId, statusFilter]);

  const kpis = data?.kpis || {
    totalResources: 0,
    activeResources: 0,
    avgUtilization: 0,
    optimal: 0,
    underUtilized: 0,
    overUtilized: 0,
    bench: 0,
  };
  const deptSummary: any[] = data?.departmentSummary || [];
  const projSummary: any[] = data?.projectSummary || [];
  const resourceRows: any[] = (data?.resourceRows || []).filter(
    (r: any) =>
      !search.trim() ||
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.department?.toLowerCase().includes(search.toLowerCase()) ||
      r.role?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCsv = () => {
    downloadCsvAndAudit({
      fileName: "resource-utilization-report",
      reportType: "RESOURCE_UTILIZATION",
      reportName: "Resource Utilization Report",
      headers: ["Resource", "Role", "Department", "Allocation %", "Total Hours", "Billable Hours", "Billable %", "Status"],
      rows: resourceRows.map((r) => [
        r.name,
        r.role,
        r.department,
        r.allocationPct,
        r.totalHours,
        r.billableHours,
        r.billablePct,
        r.status,
      ]),
      appliedFilters,
    });
  };

  const handleExportJson = () => {
    downloadJsonAndAudit({
      fileName: "resource-utilization-report",
      reportType: "RESOURCE_UTILIZATION",
      reportName: "Resource Utilization Report",
      data,
      rowCount: resourceRows.length,
      appliedFilters,
    });
  };

  return (
    <div className="rpt-page">
      <div>
        <div className="rpt-breadcrumb">
          <Link href="/reports">Reports &amp; Analytics</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Resource Utilization</span>
        </div>
        <div className="rpt-header">
          <div>
            <h1 className="rpt-title">Resource Utilization Report</h1>
            <p className="rpt-subtitle">
              Analyze team allocation percentages, department workload, bench capacity, and billable efficiency.
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
        <Link href="/reports/resources" className="rpt-subnav-link active">Resource Utilization</Link>
        <Link href="/reports/timesheets" className="rpt-subnav-link">Timesheet &amp; Productivity</Link>
        <Link href="/reports/qa" className="rpt-subnav-link">QA &amp; Defect Analytics</Link>
        <Link href="/reports/saved" className="rpt-subnav-link">Saved, Schedules &amp; Exports</Link>
      </div>

      <ReportToolbar
        reportType="RESOURCE_UTILIZATION"
        reportName="Resource Utilization Report"
        category="Resource Reports"
        appliedFilters={appliedFilters}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        rowCount={resourceRows.length}
      />

      {error && <div className="rpt-alert rpt-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* Filters */}
      <div className="rpt-filter-bar">
        <input className="rpt-input" style={{ flex: 1, minWidth: 180 }} placeholder="Search by resource, role, or department..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="rpt-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="ALL">All Projects</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
        </select>
        <select className="rpt-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All Utilization Bands</option>
          <option value="OPTIMAL">Optimal (70–100%)</option>
          <option value="OVER_UTILIZED">Over-Utilized (&gt;100%)</option>
          <option value="UNDER_UTILIZED">Under-Utilized (&lt;70%)</option>
          <option value="BENCH">On Bench (0%)</option>
        </select>
      </div>

      {/* KPIs */}
      <div className="rpt-kpi-grid">
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><Users size={16} /></div><div><span className="rpt-kpi-label">Total Resources</span><span className="rpt-kpi-val">{kpis.totalResources}</span></div></div>
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#ecfdf5", color: "#047857" }}><Gauge size={16} /></div><div><span className="rpt-kpi-label">Avg Utilization</span><span className="rpt-kpi-val">{kpis.avgUtilization}%</span></div></div>
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#ecfdf5", color: "#079b62" }}><CheckCircle2 size={16} /></div><div><span className="rpt-kpi-label">Optimal (70–100%)</span><span className="rpt-kpi-val">{kpis.optimal}</span></div></div>
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#fffbeb", color: "#b45309" }}><UserCheck size={16} /></div><div><span className="rpt-kpi-label">Bench / Under</span><span className="rpt-kpi-val">{kpis.bench} / {kpis.underUtilized}</span></div></div>
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><AlertTriangle size={16} /></div><div><span className="rpt-kpi-label">Over-Utilized</span><span className="rpt-kpi-val" style={{ color: "#dc2626" }}>{kpis.overUtilized}</span></div></div>
      </div>

      {/* Department & Project Breakdown */}
      <div className="rpt-grid-2">
        <div className="rpt-card">
          <h3 className="rpt-card-title" style={{ marginBottom: 10 }}>Department-Wise Utilization</h3>
          {deptSummary.length === 0 ? (
            <div className="rpt-empty">No department data available.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {deptSummary.map((d) => (
                <div key={d.department}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <strong>{d.department} ({d.resources})</strong>
                    <span style={{ fontWeight: 700 }}>{d.avgUtilization}%</span>
                  </div>
                  <div className="rpt-bar-track">
                    <div className="rpt-bar-fill" style={{ width: `${Math.min(100, d.avgUtilization)}%`, background: d.avgUtilization > 100 ? "#dc2626" : d.avgUtilization >= 70 ? "#079b62" : "#0755e9" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rpt-card">
          <h3 className="rpt-card-title" style={{ marginBottom: 10 }}>Project-Wise Allocation</h3>
          {projSummary.length === 0 ? (
            <div className="rpt-empty">No active project allocations found.</div>
          ) : (
            <div className="rpt-table-wrap">
              <table className="rpt-table">
                <thead><tr><th>Project</th><th>Allocated Headcount</th><th>Avg Allocation</th></tr></thead>
                <tbody>
                  {projSummary.map((p) => (
                    <tr key={p.projectId}>
                      <td style={{ fontWeight: 600 }}>{p.projectName}</td>
                      <td>{p.resources}</td>
                      <td><span className="rpt-badge rpt-badge-blue">{p.avgAllocation}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Individual Resource Table */}
      <div className="rpt-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4", fontWeight: 700 }}>
          Individual Resource Utilization ({resourceRows.length})
        </div>
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead>
              <tr>
                <th>Resource</th>
                <th>Role</th>
                <th>Department</th>
                <th>Allocation %</th>
                <th>Logged Hours</th>
                <th>Billable %</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="rpt-empty">Loading resource metrics...</td></tr>
              ) : resourceRows.length === 0 ? (
                <tr><td colSpan={7} className="rpt-empty">No resources match the selected criteria.</td></tr>
              ) : (
                resourceRows.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{r.name}</div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>{r.email}</div>
                    </td>
                    <td>{r.role}</td>
                    <td>{r.department}</td>
                    <td style={{ minWidth: 110 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div className="rpt-bar-track" style={{ flex: 1 }}>
                          <div className="rpt-bar-fill" style={{ width: `${Math.min(100, r.allocationPct)}%`, background: r.allocationPct > 100 ? "#dc2626" : r.allocationPct >= 70 ? "#079b62" : "#d97706" }} />
                        </div>
                        <span style={{ fontWeight: 700 }}>{r.allocationPct}%</span>
                      </div>
                    </td>
                    <td>{r.totalHours}h ({r.billableHours}h billable)</td>
                    <td>{r.billablePct}%</td>
                    <td>
                      <span className={r.status === "OPTIMAL" ? "rpt-badge rpt-badge-green" : r.status === "OVER_UTILIZED" ? "rpt-badge rpt-badge-red" : "rpt-badge rpt-badge-amber"}>
                        {r.status.replace("_", " ")}
                      </span>
                    </td>
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
