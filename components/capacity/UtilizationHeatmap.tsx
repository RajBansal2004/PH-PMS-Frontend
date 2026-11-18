"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  capacityApi,
  lookupApi,
  DepartmentLite,
  ProjectLite,
  currentMonthKey,
  formatMonthLabel,
  shiftMonthKey,
  getInitials,
} from "@/lib/resources/api";
import "@/components/resources/resource-capacity.css";

function heatClass(pct: number) {
  if (pct === 0) return "rc-heat-0";
  if (pct < 50) return "rc-heat-low";
  if (pct <= 75) return "rc-heat-opt";
  if (pct <= 100) return "rc-heat-high";
  if (pct <= 125) return "rc-heat-over";
  return "rc-heat-crit";
}

export default function UtilizationHeatmap() {
  const router = useRouter();
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState<"team" | "projects" | "departments" | "leaves">("team");
  const [departments, setDepartments] = useState<DepartmentLite[]>([]);
  const [projects, setProjects] = useState<ProjectLite[]>([]);
  const [data, setData] = useState<any>(null);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHeatmap = async () => {
    setLoading(true);
    setError(null);
    try {
      const [hm, depts, projs] = await Promise.all([
        capacityApi.getHeatmap({
          month: monthKey,
          departmentId: deptFilter !== "ALL" ? deptFilter : undefined,
          projectId: projectFilter !== "ALL" ? projectFilter : undefined,
        }),
        lookupApi.departments().catch(() => []),
        lookupApi.projects().catch(() => []),
      ]);
      setData(hm);
      setDepartments(depts);
      setProjects(projs);
    } catch (e: any) {
      setError(e?.message || "Failed to load utilization heatmap");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHeatmap();
  }, [monthKey, deptFilter, projectFilter]);

  const weeks: { key: string; label: string }[] = data?.weeks || [];
  const memberHeatmap: any[] = data?.memberHeatmap || [];
  const projectHeatmap: any[] = data?.projectHeatmap || [];
  const departmentHeatmap: any[] = data?.departmentHeatmap || [];
  const capacityVsDemand: any[] = data?.capacityVsDemand || [];
  const insights: any[] = data?.insights || [];

  const handleExportCsv = () => {
    const headers = ["Member", "Department", "Role", ...weeks.map((w) => `${w.key} (${w.label})`), "Average"];
    const rows = memberHeatmap.map((m) => [
      m.name,
      m.department,
      m.role,
      ...m.weeks.map((w: any) => `${w.utilization}%`),
      `${m.averageUtilization}%`,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v ?? "")}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `utilization-heatmap-${monthKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rc-page">
      {/* Header */}
      <div>
        <div className="rc-breadcrumb">
          <span>Capacity Management</span>
          <ChevronRight size={12} />
          <span style={{ color: "#0f172a", fontWeight: 600 }}>Utilization Heatmap</span>
        </div>
        <div className="rc-header">
          <div>
            <h1 className="rc-title">Utilization Heatmap</h1>
            <p className="rc-subtitle">Visualize weekly resource utilization across teams, projects, and departments to spot over- and under-utilization at a glance.</p>
          </div>
          <div className="rc-header-actions">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 7, padding: "2px 6px" }}>
              <button type="button" className="rc-btn rc-btn-ghost rc-btn-sm" onClick={() => setMonthKey(shiftMonthKey(monthKey, -1))}><ChevronLeft size={13} /></button>
              <span style={{ fontSize: 11.5, fontWeight: 700, minWidth: 105, textAlign: "center" }}>{formatMonthLabel(monthKey)}</span>
              <button type="button" className="rc-btn rc-btn-ghost rc-btn-sm" onClick={() => setMonthKey(shiftMonthKey(monthKey, 1))}><ChevronRight size={13} /></button>
            </div>
            <select className="rc-select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="ALL">All Departments</option>
              {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
            <select className="rc-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="ALL">All Projects</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
            </select>
            <button type="button" className="rc-btn rc-btn-outline" onClick={loadHeatmap} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
            <button type="button" className="rc-btn rc-btn-primary" onClick={handleExportCsv}>
              <Download size={13} /> Export
            </button>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="rc-subnav">
        <Link href="/capacity" className="rc-subnav-link">Team Capacity</Link>
        <Link href="/capacity/individual" className="rc-subnav-link">Individual Capacity</Link>
        <Link href="/capacity/forecast" className="rc-subnav-link">Capacity Forecast</Link>
        <Link href="/capacity/heatmap" className="rc-subnav-link active">Utilization Heatmap</Link>
      </div>

      {error && <div className="rc-alert rc-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* Legend Bar matching CAP-004 */}
      <div className="rc-card" style={{ padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div className="rc-seg">
          <button type="button" className={`rc-seg-btn ${activeTab === "team" ? "active" : ""}`} onClick={() => setActiveTab("team")}>Team Heatmap</button>
          <button type="button" className={`rc-seg-btn ${activeTab === "projects" ? "active" : ""}`} onClick={() => setActiveTab("projects")}>Project Heatmap</button>
          <button type="button" className={`rc-seg-btn ${activeTab === "departments" ? "active" : ""}`} onClick={() => setActiveTab("departments")}>Department Heatmap</button>
          <button type="button" className={`rc-seg-btn ${activeTab === "leaves" ? "active" : ""}`} onClick={() => setActiveTab("leaves")}>Leave Overlay</button>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 10.5, color: "#475569" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span className="rc-heat-low" style={{ width: 10, height: 10, borderRadius: 2 }} /> &lt;50% Under</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span className="rc-heat-opt" style={{ width: 10, height: 10, borderRadius: 2 }} /> 50–75% Optimal</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span className="rc-heat-high" style={{ width: 10, height: 10, borderRadius: 2 }} /> 76–100% High</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span className="rc-heat-over" style={{ width: 10, height: 10, borderRadius: 2 }} /> 101–125% Over</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span className="rc-heat-crit" style={{ width: 10, height: 10, borderRadius: 2 }} /> &gt;125% Critical</span>
        </div>
      </div>

      {/* Main Heatmap Panel */}
      <div className="rc-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="rc-table-wrap">
          {activeTab === "team" && (
            <table className="rc-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 190 }}>Team Member (Click to Drill-down)</th>
                  <th>Department</th>
                  {weeks.map((w) => (
                    <th key={w.key} style={{ textAlign: "center" }}>
                      <div>{w.key}</div>
                      <div style={{ fontSize: 9.5, fontWeight: 500, color: "#94a3b8" }}>{w.label}</div>
                    </th>
                  ))}
                  <th style={{ textAlign: "center" }}>Avg</th>
                </tr>
              </thead>
              <tbody>
                {loading && memberHeatmap.length === 0 ? (
                  <tr><td colSpan={3 + weeks.length} className="rc-empty">Generating live utilization heatmap...</td></tr>
                ) : memberHeatmap.length === 0 ? (
                  <tr><td colSpan={3 + weeks.length} className="rc-empty">No team members found for selected filters.</td></tr>
                ) : (
                  memberHeatmap.map((m) => (
                    <tr key={m.employeeId} onClick={() => setSelectedMember(m)} style={{ cursor: "pointer" }}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="rc-avatar">{getInitials(m.name)}</span>
                          <div>
                            <div style={{ fontWeight: 600 }}>{m.name}</div>
                            <div style={{ fontSize: 10, color: "#64748b" }}>{m.role}</div>
                          </div>
                        </div>
                      </td>
                      <td>{m.department}</td>
                      {m.weeks.map((cell: any) => (
                        <td key={cell.week} style={{ padding: 4 }}>
                          <div className={`rc-heat-cell ${heatClass(cell.utilization)}`}>
                            {cell.utilization}%{cell.hasLeave ? " · L" : ""}
                          </div>
                        </td>
                      ))}
                      <td style={{ textAlign: "center", fontWeight: 700, color: m.averageUtilization > 100 ? "#dc2626" : "#0f172a" }}>
                        {m.averageUtilization}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === "projects" && (
            <table className="rc-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 190 }}>Project</th>
                  {weeks.map((w) => (
                    <th key={w.key} style={{ textAlign: "center" }}>
                      <div>{w.key}</div>
                      <div style={{ fontSize: 9.5, fontWeight: 500, color: "#94a3b8" }}>{w.label}</div>
                    </th>
                  ))}
                  <th style={{ textAlign: "center" }}>Avg</th>
                </tr>
              </thead>
              <tbody>
                {projectHeatmap.length === 0 ? (
                  <tr><td colSpan={2 + weeks.length} className="rc-empty">No project utilization data found.</td></tr>
                ) : (
                  projectHeatmap.map((p) => (
                    <tr key={p.projectId}>
                      <td>
                        <strong>{p.projectName}</strong>
                        <div style={{ fontSize: 10, color: "#64748b" }}>{p.projectCode}</div>
                      </td>
                      {p.weeks.map((cell: any) => (
                        <td key={cell.week} style={{ padding: 4 }}>
                          <div className={`rc-heat-cell ${heatClass(cell.utilization)}`} title={`${cell.resourceCount} resource(s)`}>
                            {cell.utilization}%
                          </div>
                        </td>
                      ))}
                      <td style={{ textAlign: "center", fontWeight: 700 }}>{p.averageUtilization}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === "departments" && (
            <table className="rc-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 190 }}>Department</th>
                  <th>Headcount</th>
                  {weeks.map((w) => (
                    <th key={w.key} style={{ textAlign: "center" }}>
                      <div>{w.key}</div>
                      <div style={{ fontSize: 9.5, fontWeight: 500, color: "#94a3b8" }}>{w.label}</div>
                    </th>
                  ))}
                  <th style={{ textAlign: "center" }}>Avg</th>
                </tr>
              </thead>
              <tbody>
                {departmentHeatmap.length === 0 ? (
                  <tr><td colSpan={3 + weeks.length} className="rc-empty">No departments configured.</td></tr>
                ) : (
                  departmentHeatmap.map((d) => (
                    <tr key={d.departmentId}>
                      <td><strong>{d.departmentName}</strong></td>
                      <td>{d.headcount}</td>
                      {d.weeklyDistribution.map((cell: any) => (
                        <td key={cell.week} style={{ padding: 4 }}>
                          <div className={`rc-heat-cell ${heatClass(cell.utilization)}`}>{cell.utilization}%</div>
                        </td>
                      ))}
                      <td style={{ textAlign: "center", fontWeight: 700 }}>{d.averageUtilization}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === "leaves" && (
            <table className="rc-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 190 }}>Resource</th>
                  {weeks.map((w) => (
                    <th key={w.key} style={{ textAlign: "center" }}>
                      <div>{w.key}</div>
                      <div style={{ fontSize: 9.5, fontWeight: 500, color: "#94a3b8" }}>{w.label}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {memberHeatmap.map((m) => (
                  <tr key={m.employeeId}>
                    <td><strong>{m.name}</strong></td>
                    {m.weeks.map((cell: any) => (
                      <td key={cell.week} style={{ padding: 4 }}>
                        <div className={`rc-heat-cell ${cell.hasLeave ? "rc-heat-over" : "rc-heat-0"}`}>
                          {cell.hasLeave ? "L (Leave)" : "—"}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Bottom Row: Capacity vs Demand Weekly + Insights (CAP-004 Panels 6 & 9) */}
      <div className="rc-grid-2">
        <div className="rc-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e2e8f0" }}>
            <h3 className="rc-card-title">Capacity vs Demand ({formatMonthLabel(monthKey)})</h3>
          </div>
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  {capacityVsDemand.map((w) => <th key={w.week} style={{ textAlign: "center" }}>{w.week}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Demand (hrs)</strong></td>
                  {capacityVsDemand.map((w) => <td key={w.week} style={{ textAlign: "center" }}>{w.demandHours}</td>)}
                </tr>
                <tr>
                  <td><strong>Capacity (hrs)</strong></td>
                  {capacityVsDemand.map((w) => <td key={w.week} style={{ textAlign: "center" }}>{w.capacityHours}</td>)}
                </tr>
                <tr>
                  <td><strong>Gap (hrs)</strong></td>
                  {capacityVsDemand.map((w) => (
                    <td key={w.week} style={{ textAlign: "center", fontWeight: 600, color: w.gapHours < 0 ? "#dc2626" : "#16a34a" }}>
                      {w.gapHours >= 0 ? `+${w.gapHours}` : w.gapHours}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td><strong>Utilization</strong></td>
                  {capacityVsDemand.map((w) => (
                    <td key={w.week} style={{ padding: 4 }}>
                      <div className={`rc-heat-cell ${heatClass(w.utilization)}`}>{w.utilization}%</div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="rc-card">
          <div className="rc-card-header">
            <h3 className="rc-card-title">Insights &amp; Recommendations</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {insights.length === 0 ? (
              <div className="rc-empty">No insights generated.</div>
            ) : (
              insights.map((ins, i) => (
                <div
                  key={i}
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

      {/* Individual Utilization Drill-down Modal (CAP-004 Panel 4) */}
      {selectedMember && (
        <div className="rc-modal-backdrop" onClick={() => setSelectedMember(null)}>
          <div className="rc-modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="rc-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="rc-avatar">{getInitials(selectedMember.name)}</span>
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{selectedMember.name}</h2>
                  <span style={{ fontSize: 11, color: "#64748b" }}>{selectedMember.role} · {selectedMember.department}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="rc-btn rc-btn-primary rc-btn-sm"
                  onClick={() => router.push(`/capacity/individual?employeeId=${selectedMember.employeeId}`)}
                >
                  Open Full Profile
                </button>
                <button type="button" className="rc-btn rc-btn-ghost rc-btn-sm" onClick={() => setSelectedMember(null)}><X size={15} /></button>
              </div>
            </div>
            <div className="rc-modal-body">
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${selectedMember.weeks.length}, 1fr)`, gap: 6 }}>
                {selectedMember.weeks.map((w: any) => (
                  <div key={w.week} className={`rc-heat-cell ${heatClass(w.utilization)}`}>
                    <div style={{ fontSize: 10 }}>{w.week}</div>
                    <div style={{ fontSize: 13 }}>{w.utilization}%</div>
                  </div>
                ))}
              </div>
              <div className="rc-card-title" style={{ marginTop: 6 }}>Weekly Allocation Breakdown</div>
              {selectedMember.weeks.every((w: any) => !w.allocations?.length) ? (
                <div className="rc-empty" style={{ padding: "14px 6px" }}>No active allocations in {formatMonthLabel(monthKey)}.</div>
              ) : (
                <table className="rc-table">
                  <thead><tr><th>Week</th><th>Project</th><th>Alloc %</th><th>Hours</th></tr></thead>
                  <tbody>
                    {selectedMember.weeks.flatMap((w: any) =>
                      (w.allocations || []).map((a: any, idx: number) => (
                        <tr key={`${w.week}-${idx}`}>
                          <td><strong>{w.week}</strong></td>
                          <td>{a.projectName}</td>
                          <td><strong>{a.percent}%</strong></td>
                          <td>{a.hours}h</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
