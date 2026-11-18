"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Download,
  Gauge,
} from "lucide-react";
import {
  capacityApi,
  lookupApi,
  DepartmentLite,
  ProjectLite,
  formatShortDate,
} from "@/lib/resources/api";
import "@/components/resources/resource-capacity.css";

export default function CapacityForecast() {
  const [months, setMonths] = useState(6);
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [departments, setDepartments] = useState<DepartmentLite[]>([]);
  const [projects, setProjects] = useState<ProjectLite[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fc, depts, projs] = await Promise.all([
        capacityApi.getForecast({
          months,
          departmentId: deptFilter !== "ALL" ? deptFilter : undefined,
          projectId: projectFilter !== "ALL" ? projectFilter : undefined,
        }),
        lookupApi.departments().catch(() => []),
        lookupApi.projects().catch(() => []),
      ]);
      setData(fc);
      setDepartments(depts);
      setProjects(projs);
    } catch (e: any) {
      setError(e?.message || "Failed to load capacity forecast");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForecast();
  }, [months, deptFilter, projectFilter]);

  const summary = data?.summary || { totalDemand: 0, totalCapacity: 0, gap: 0, utilization: 0 };
  const monthly: any[] = data?.forecast || [];
  const deptForecast: any[] = data?.departmentForecast || [];
  const roleForecast: any[] = data?.roleForecast || [];
  const projectForecast: any[] = data?.projectForecast || [];
  const scenarios: any[] = data?.scenarios || [];
  const insights: any[] = data?.insights || [];

  const maxBarHours = useMemo(
    () => Math.max(1, ...monthly.map((m) => Math.max(m.availableCapacityHours || 0, m.committedMilestoneHours || 0))),
    [monthly]
  );

  const handleExportCsv = () => {
    const headers = ["Period", "Headcount", "Capacity (hrs)", "Demand (hrs)", "Gap (hrs)", "Utilization %", "Risk"];
    const rows = monthly.map((m) => [
      m.period,
      m.headcount,
      m.availableCapacityHours,
      m.committedMilestoneHours,
      m.gapHours ?? m.committedMilestoneHours - m.availableCapacityHours,
      `${m.projectedUtilizationRate}%`,
      m.riskLevel,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v ?? "")}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `capacity-forecast-${months}m.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (status: string) => {
    if (status === "OVERUSED" || status === "AT_RISK" || status === "CRITICAL") return <span className="rc-badge rc-badge-red">{status.replace("_", " ")}</span>;
    if (status === "HIGH") return <span className="rc-badge rc-badge-amber">High</span>;
    if (status === "IDLE") return <span className="rc-badge rc-badge-slate">Idle</span>;
    return <span className="rc-badge rc-badge-green">{status.replace("_", " ")}</span>;
  };

  return (
    <div className="rc-page">
      {/* Header */}
      <div>
        <div className="rc-breadcrumb">
          <span>Capacity Management</span>
          <ChevronRight size={12} />
          <span style={{ color: "#0f172a", fontWeight: 600 }}>Capacity Forecast</span>
        </div>
        <div className="rc-header">
          <div>
            <h1 className="rc-title">Capacity Forecast</h1>
            <p className="rc-subtitle">Plan ahead by comparing multi-month engineering capacity against real project allocations and milestone commitments.</p>
          </div>
          <div className="rc-header-actions">
            <select className="rc-select" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
              <option value={3}>Next 3 Months</option>
              <option value={6}>Next 6 Months</option>
              <option value={12}>Next 12 Months</option>
            </select>
            <select className="rc-select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="ALL">All Departments</option>
              {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
            <select className="rc-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="ALL">All Projects</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
            </select>
            <button type="button" className="rc-btn rc-btn-outline" onClick={handleExportCsv}>
              <Download size={13} /> Export
            </button>
            <button type="button" className="rc-btn rc-btn-primary" onClick={loadForecast} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh Forecast
            </button>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="rc-subnav">
        <Link href="/capacity" className="rc-subnav-link">Team Capacity</Link>
        <Link href="/capacity/individual" className="rc-subnav-link">Individual Capacity</Link>
        <Link href="/capacity/forecast" className="rc-subnav-link active">Capacity Forecast</Link>
        <Link href="/capacity/heatmap" className="rc-subnav-link">Utilization Heatmap</Link>
      </div>

      {error && <div className="rc-alert rc-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* 4-KPI Summary Strip matching CAP-003 Panel 1 */}
      <div className="rc-kpi-grid">
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#eff6ff", color: "#2563eb" }}><TrendingUp size={16} /></div>
          <div>
            <span className="rc-kpi-label">Total Demand ({months}m)</span>
            <span className="rc-kpi-value">{summary.totalDemand.toLocaleString()}<span className="rc-kpi-sub">hrs</span></span>
          </div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#ecfdf5", color: "#16a34a" }}><Clock size={16} /></div>
          <div>
            <span className="rc-kpi-label">Total Capacity ({months}m)</span>
            <span className="rc-kpi-value">{summary.totalCapacity.toLocaleString()}<span className="rc-kpi-sub">hrs</span></span>
          </div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: summary.gap > 0 ? "#fef2f2" : "#ecfdf5", color: summary.gap > 0 ? "#dc2626" : "#16a34a" }}>
            <AlertTriangle size={16} />
          </div>
          <div>
            <span className="rc-kpi-label">{summary.gap > 0 ? "Capacity Deficit" : "Available Surplus"}</span>
            <span className="rc-kpi-value" style={{ color: summary.gap > 0 ? "#dc2626" : "#16a34a" }}>
              {Math.abs(summary.gap).toLocaleString()}<span className="rc-kpi-sub">hrs</span>
            </span>
          </div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#fffbeb", color: "#d97706" }}><Gauge size={16} /></div>
          <div>
            <span className="rc-kpi-label">Forecast Utilization</span>
            <span className="rc-kpi-value" style={{ color: summary.utilization > 100 ? "#dc2626" : "#0f172a" }}>{summary.utilization}%</span>
          </div>
        </div>
      </div>

      {/* Demand vs Capacity Chart + Insights */}
      <div className="rc-grid-2">
        <div className="rc-card">
          <div className="rc-card-header">
            <h3 className="rc-card-title">Demand vs Capacity Forecast (Next {months} Months)</h3>
            <div style={{ display: "flex", gap: 10, fontSize: 10.5, color: "#64748b" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "#2563eb" }} /> Capacity
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "#16a34a" }} /> Demand
              </span>
            </div>
          </div>
          {loading && monthly.length === 0 ? (
            <div className="rc-empty">Calculating forecast...</div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 180, paddingTop: 12, overflowX: "auto" }}>
              {monthly.map((m) => {
                const capH = Math.max(8, Math.round(((m.availableCapacityHours || 0) / maxBarHours) * 130));
                const demH = Math.max(4, Math.round(((m.committedMilestoneHours || 0) / maxBarHours) * 130));
                return (
                  <div key={m.period} style={{ flex: 1, minWidth: 58, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: m.projectedUtilizationRate > 100 ? "#dc2626" : "#ea580c" }}>
                      {m.projectedUtilizationRate}%
                    </span>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 135 }}>
                      <div style={{ width: 15, height: capH, background: "#2563eb", borderRadius: "3px 3px 0 0" }} title={`Capacity: ${m.availableCapacityHours}h`} />
                      <div style={{ width: 15, height: demH, background: m.projectedUtilizationRate > 100 ? "#dc2626" : "#16a34a", borderRadius: "3px 3px 0 0" }} title={`Demand: ${m.committedMilestoneHours}h`} />
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>{m.shortPeriod || m.period.slice(0, 3)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Insights & Recommendations (CAP-003 Panel 9) */}
        <div className="rc-card">
          <div className="rc-card-header">
            <h3 className="rc-card-title">Insights &amp; Recommendations</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {insights.length === 0 ? (
              <div className="rc-empty">No forecast insights available yet.</div>
            ) : (
              insights.map((ins, idx) => (
                <div
                  key={idx}
                  className={`rc-alert ${
                    ins.severity === "CRITICAL"
                      ? "rc-alert-critical"
                      : ins.severity === "WARNING"
                      ? "rc-alert-warning"
                      : "rc-alert-healthy"
                  }`}
                >
                  {ins.severity === "HEALTHY" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  <div>
                    <div style={{ fontWeight: 700 }}>{ins.title}</div>
                    <div style={{ fontSize: 11 }}>{ins.detail}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Department-wise & Role-wise Forecast Tables (CAP-003 Panels 3 & 4) */}
      <div className="rc-grid-2">
        <div className="rc-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e2e8f0" }}>
            <h3 className="rc-card-title">Department-wise Forecast</h3>
          </div>
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Capacity</th>
                  <th>Demand</th>
                  <th>Gap</th>
                  <th>Util %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {deptForecast.length === 0 ? (
                  <tr><td colSpan={6} className="rc-empty">No department forecast data.</td></tr>
                ) : (
                  deptForecast.map((d) => (
                    <tr key={d.department}>
                      <td><strong>{d.department}</strong></td>
                      <td>{d.capacityHours.toLocaleString()}h</td>
                      <td>{d.demandHours.toLocaleString()}h</td>
                      <td style={{ color: d.gapHours > 0 ? "#dc2626" : "#16a34a", fontWeight: 600 }}>
                        {d.gapHours > 0 ? `+${d.gapHours}` : d.gapHours}h
                      </td>
                      <td><strong>{d.utilization}%</strong></td>
                      <td>{statusBadge(d.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rc-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e2e8f0" }}>
            <h3 className="rc-card-title">Role-wise Forecast</h3>
          </div>
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Capacity</th>
                  <th>Demand</th>
                  <th>Gap</th>
                  <th>Util %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {roleForecast.length === 0 ? (
                  <tr><td colSpan={6} className="rc-empty">No role forecast data.</td></tr>
                ) : (
                  roleForecast.map((r) => (
                    <tr key={r.role}>
                      <td><strong>{r.role}</strong> <span style={{ color: "#64748b" }}>({r.headcount})</span></td>
                      <td>{r.capacityHours.toLocaleString()}h</td>
                      <td>{r.demandHours.toLocaleString()}h</td>
                      <td style={{ color: r.gapHours > 0 ? "#dc2626" : "#16a34a", fontWeight: 600 }}>
                        {r.gapHours > 0 ? `+${r.gapHours}` : r.gapHours}h
                      </td>
                      <td><strong>{r.utilization}%</strong></td>
                      <td>{statusBadge(r.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Project-wise Forecast & Scenario Comparison (CAP-003 Panels 5 & 8) */}
      <div className="rc-grid-2">
        <div className="rc-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e2e8f0" }}>
            <h3 className="rc-card-title">Project-wise Forecast</h3>
          </div>
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Demand</th>
                  <th>Allocated</th>
                  <th>Additional Need</th>
                  <th>Timeline</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {projectForecast.length === 0 ? (
                  <tr><td colSpan={6} className="rc-empty">No projects found.</td></tr>
                ) : (
                  projectForecast.map((p) => (
                    <tr key={p.projectId}>
                      <td><strong>{p.projectName}</strong></td>
                      <td>{p.demandHours}h</td>
                      <td>{p.allocatedHours}h</td>
                      <td style={{ color: p.additionalNeedHours > 0 ? "#dc2626" : "#16a34a", fontWeight: 600 }}>{p.additionalNeedHours}h</td>
                      <td style={{ fontSize: 10.5, color: "#64748b" }}>{formatShortDate(p.startDate)} – {formatShortDate(p.endDate)}</td>
                      <td>{statusBadge(p.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rc-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e2e8f0" }}>
            <h3 className="rc-card-title">Scenario Comparison</h3>
          </div>
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Capacity</th>
                  <th>Demand</th>
                  <th>Gap</th>
                  <th>Utilization</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((sc) => (
                  <tr key={sc.name}>
                    <td><strong>{sc.name}</strong></td>
                    <td>{sc.capacityHours.toLocaleString()}h</td>
                    <td>{sc.demandHours.toLocaleString()}h</td>
                    <td style={{ color: sc.gapHours > 0 ? "#dc2626" : "#16a34a", fontWeight: 600 }}>
                      {sc.gapHours > 0 ? `+${sc.gapHours}` : sc.gapHours}h
                    </td>
                    <td>
                      <span className={`rc-badge ${sc.utilization > 100 ? "rc-badge-red" : sc.utilization > 80 ? "rc-badge-amber" : "rc-badge-green"}`}>
                        {sc.utilization}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
