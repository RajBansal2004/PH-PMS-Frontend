"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  CheckCircle2,
  UserCheck,
  AlertTriangle,
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  resourceApi,
  allocationApi,
  lookupApi,
  ResourceItem,
  AllocationItem,
  ProjectLite,
  currentMonthKey,
  formatMonthLabel,
  shiftMonthKey,
  getInitials,
  formatShortDate,
} from "@/lib/resources/api";
import "@/components/resources/resource-capacity.css";

const PROJECT_PALETTE = [
  { bg: "#dbeafe", text: "#1e40af", dot: "#2563eb" },
  { bg: "#dcfce7", text: "#166534", dot: "#16a34a" },
  { bg: "#ede9fe", text: "#5b21b6", dot: "#7c3aed" },
  { bg: "#ffedd5", text: "#9a3412", dot: "#ea580c" },
  { bg: "#fce7f3", text: "#9d174d", dot: "#db2777" },
  { bg: "#cffafe", text: "#155e75", dot: "#0891b2" },
];

function getMonthWeeks(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const shortM = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" });
  const bounds: [number, number][] = [
    [1, 7],
    [8, 14],
    [15, 21],
    [22, 28],
    [29, daysInMonth],
  ];
  return bounds
    .filter(([s]) => s <= daysInMonth)
    .map(([s, e], i) => {
      const endDay = Math.min(e, daysInMonth);
      return {
        key: `W${i + 1}`,
        label: `${s}-${endDay} ${shortM}`,
        start: new Date(y, m - 1, s, 0, 0, 0).getTime(),
        end: new Date(y, m - 1, endDay, 23, 59, 59).getTime(),
      };
    });
}

function overlaps(aStart: string | null, aEnd: string | null, wStart: number, wEnd: number) {
  const s = aStart ? new Date(aStart).getTime() : 0;
  const e = aEnd ? new Date(aEnd).getTime() : Number.MAX_SAFE_INTEGER;
  return s <= wEnd && e >= wStart;
}

function heatClass(pct: number) {
  if (pct === 0) return "rc-heat-0";
  if (pct <= 50) return "rc-heat-low";
  if (pct <= 75) return "rc-heat-opt";
  if (pct <= 100) return "rc-heat-high";
  if (pct <= 125) return "rc-heat-over";
  return "rc-heat-crit";
}

export default function AllocationPlanner() {
  const router = useRouter();
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [projects, setProjects] = useState<ProjectLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resList, allocList, projList] = await Promise.all([
        resourceApi.list(),
        allocationApi.list(),
        lookupApi.projects(),
      ]);
      setResources(resList);
      setAllocations(allocList);
      setProjects(projList);
    } catch (e: any) {
      setError(e?.message || "Failed to load allocation planner");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const weeks = useMemo(() => getMonthWeeks(monthKey), [monthKey]);

  const projectColorMap = useMemo(() => {
    const map = new Map<string, (typeof PROJECT_PALETTE)[number]>();
    projects.forEach((p, idx) => {
      map.set(p._id, PROJECT_PALETTE[idx % PROJECT_PALETTE.length]);
    });
    return map;
  }, [projects]);

  const activeAllocs = useMemo(() => {
    return allocations.filter((a) => {
      if (["CANCELLED", "RELEASED"].includes(a.status)) return false;
      if (projectFilter !== "ALL" && a.projectId !== projectFilter) return false;
      return true;
    });
  }, [allocations, projectFilter]);

  const plannerRows = useMemo(() => {
    return resources.map((r) => {
      const empAllocs = activeAllocs.filter((a) => a.employeeId === r.employeeId);
      const weekData = weeks.map((w) => {
        const overlapping = empAllocs.filter((a) => overlaps(a.startDate, a.endDate, w.start, w.end));
        const pct = overlapping.reduce((s, a) => s + a.allocationPercent, 0);
        return { week: w, allocations: overlapping, pct };
      });
      const avgPct = weekData.length ? Math.round(weekData.reduce((s, w) => s + w.pct, 0) / weekData.length) : 0;
      const peakPct = weekData.reduce((max, w) => Math.max(max, w.pct), 0);
      return { resource: r, weekData, avgPct, peakPct, empAllocs };
    });
  }, [resources, activeAllocs, weeks]);

  const kpis = useMemo(() => {
    const total = plannerRows.length;
    const allocated = plannerRows.filter((r) => r.avgPct > 0).length;
    const available = total - allocated;
    const overallocated = plannerRows.filter((r) => r.peakPct > 100).length;
    const activeCount = activeAllocs.length;
    return { total, allocated, available, overallocated, activeCount };
  }, [plannerRows, activeAllocs]);

  // Conflicts & Alerts (RES-004 Panel 9)
  const alerts = useMemo(() => {
    const list: { severity: "critical" | "warning" | "info"; title: string; detail: string; date?: string }[] = [];
    plannerRows.forEach((row) => {
      if (row.peakPct > 100) {
        list.push({
          severity: "critical",
          title: `${row.resource.name} is overallocated (${row.peakPct}%)`,
          detail: row.empAllocs.map((a) => `${a.projectName} (${a.allocationPercent}%)`).join(" + "),
        });
      }
    });
    const nowMs = Date.now();
    const in14Days = nowMs + 14 * 86400000;
    activeAllocs
      .filter((a) => a.endDate && new Date(a.endDate).getTime() >= nowMs && new Date(a.endDate).getTime() <= in14Days)
      .slice(0, 4)
      .forEach((a) => {
        list.push({
          severity: "info",
          title: `${a.employeeName} allocation ending soon`,
          detail: `${a.projectName} ends on ${formatShortDate(a.endDate)}`,
          date: formatShortDate(a.endDate),
        });
      });
    return list;
  }, [plannerRows, activeAllocs]);

  return (
    <div className="rc-page">
      {/* Header */}
      <div>
        <div className="rc-breadcrumb">
          <span>Resource Management</span>
          <ChevronRight size={12} />
          <span style={{ color: "#0f172a", fontWeight: 600 }}>Allocation Planner</span>
        </div>
        <div className="rc-header">
          <div>
            <h1 className="rc-title">Allocation Planner</h1>
            <p className="rc-subtitle">Plan, allocate, and optimize weekly team workload across projects.</p>
          </div>
          <div className="rc-header-actions">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 7, padding: "2px 6px" }}>
              <button type="button" className="rc-btn rc-btn-ghost rc-btn-sm" onClick={() => setMonthKey(shiftMonthKey(monthKey, -1))}><ChevronLeft size={13} /></button>
              <span style={{ fontSize: 11.5, fontWeight: 700, minWidth: 105, textAlign: "center" }}>{formatMonthLabel(monthKey)}</span>
              <button type="button" className="rc-btn rc-btn-ghost rc-btn-sm" onClick={() => setMonthKey(shiftMonthKey(monthKey, 1))}><ChevronRight size={13} /></button>
            </div>
            <button type="button" className="rc-btn rc-btn-outline" onClick={loadData} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" className="rc-btn rc-btn-primary" onClick={() => router.push("/resources/allocate")}>
              <Plus size={14} /> New Allocation
            </button>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="rc-subnav">
        <Link href="/resources" className="rc-subnav-link">Resource Directory</Link>
        <Link href="/resources/new" className="rc-subnav-link">Add New Resource</Link>
        <Link href="/resources/allocate" className="rc-subnav-link">Project Allocation</Link>
        <Link href="/resources/planner" className="rc-subnav-link active">Allocation Planner</Link>
        <Link href="/resources/calendar" className="rc-subnav-link">Resource Calendar</Link>
        <Link href="/resources/bench" className="rc-subnav-link">Bench &amp; Availability</Link>
      </div>

      {error && <div className="rc-alert rc-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* 5-KPI Strip matching RES-004 */}
      <div className="rc-kpi-grid">
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#eff6ff", color: "#2563eb" }}><Users size={16} /></div>
          <div><span className="rc-kpi-label">Total Resources</span><span className="rc-kpi-value">{kpis.total}</span></div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#ecfdf5", color: "#16a34a" }}><CheckCircle2 size={16} /></div>
          <div><span className="rc-kpi-label">Allocated</span><span className="rc-kpi-value">{kpis.allocated}</span></div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#fffbeb", color: "#d97706" }}><UserCheck size={16} /></div>
          <div><span className="rc-kpi-label">Available</span><span className="rc-kpi-value">{kpis.available}</span></div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><AlertTriangle size={16} /></div>
          <div><span className="rc-kpi-label">Overallocated</span><span className="rc-kpi-value" style={{ color: kpis.overallocated > 0 ? "#dc2626" : "#0f172a" }}>{kpis.overallocated}</span></div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}><Calendar size={16} /></div>
          <div><span className="rc-kpi-label">Active Assignments</span><span className="rc-kpi-value">{kpis.activeCount}</span></div>
        </div>
      </div>

      {/* Main Planner Matrix + Project Legend Sidebar matching RES-004 Panel 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 12, alignItems: "start" }}>
        <div className="rc-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 170 }}>Resource</th>
                  <th>Monthly Hrs</th>
                  <th>Utilization</th>
                  {weeks.map((w) => (
                    <th key={w.key} style={{ textAlign: "center", minWidth: 115 }}>
                      <div>{w.key}</div>
                      <div style={{ fontSize: 9.5, fontWeight: 500, color: "#94a3b8" }}>{w.label}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && plannerRows.length === 0 ? (
                  <tr><td colSpan={3 + weeks.length} className="rc-empty">Loading weekly planner...</td></tr>
                ) : plannerRows.length === 0 ? (
                  <tr><td colSpan={3 + weeks.length} className="rc-empty">No resources available to plan.</td></tr>
                ) : (
                  plannerRows.map(({ resource, weekData, avgPct }) => (
                    <tr key={resource.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="rc-avatar">{getInitials(resource.name)}</span>
                          <div>
                            <Link href={`/resources/${resource.id}`} style={{ fontWeight: 600, color: "#0f172a", textDecoration: "none" }}>
                              {resource.name}
                            </Link>
                            <div style={{ fontSize: 10, color: "#64748b" }}>{resource.designationName}</div>
                          </div>
                        </div>
                      </td>
                      <td>{resource.monthlyCapacityHours}h</td>
                      <td>
                        <span className={`rc-badge ${avgPct > 100 ? "rc-badge-red" : avgPct > 80 ? "rc-badge-amber" : avgPct > 0 ? "rc-badge-green" : "rc-badge-slate"}`}>
                          {avgPct}%
                        </span>
                      </td>
                      {weekData.map((cell) => (
                        <td key={cell.week.key} style={{ padding: "6px 5px", verticalAlign: "top" }}>
                          {cell.allocations.length === 0 ? (
                            <div style={{ textAlign: "center", color: "#cbd5e1", fontSize: 10, padding: "6px 0" }}>—</div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              {cell.allocations.map((a) => {
                                const pal = projectColorMap.get(a.projectId) || PROJECT_PALETTE[0];
                                return (
                                  <div
                                    key={a.id}
                                    style={{
                                      background: pal.bg,
                                      color: pal.text,
                                      borderRadius: 5,
                                      padding: "3px 6px",
                                      fontSize: 10,
                                      fontWeight: 600,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      maxWidth: 120,
                                    }}
                                    title={`${a.projectName} · ${a.allocationPercent}% (${a.role})`}
                                  >
                                    {a.projectName} ({a.allocationPercent}%)
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Project Filter & Legend */}
        <div className="rc-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h3 className="rc-card-title">Projects</h3>
          <select className="rc-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="ALL">All Projects</option>
            {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
          </select>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
            {projects.map((p, idx) => {
              const pal = PROJECT_PALETTE[idx % PROJECT_PALETTE.length];
              return (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => setProjectFilter(projectFilter === p._id ? "ALL" : p._id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "5px 7px",
                    borderRadius: 6,
                    border: "1px solid transparent",
                    background: projectFilter === p._id ? "#eff6ff" : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#1e293b",
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: pal.dot, flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.projectName}</span>
                </button>
              );
            })}
          </div>
          <Link href="/resources/calendar" className="rc-btn rc-btn-outline rc-btn-sm" style={{ width: "100%" }}>
            View Full Calendar
          </Link>
        </div>
      </div>

      {/* Bottom Row: Weekly Utilization Heatmap + Allocation Conflicts & Alerts (RES-004 Panels 7 & 9) */}
      <div className="rc-grid-2">
        <div className="rc-card">
          <div className="rc-card-header">
            <h3 className="rc-card-title">Resource Utilization Heatmap ({formatMonthLabel(monthKey)})</h3>
            <Link href="/capacity/heatmap" className="rc-btn rc-btn-ghost rc-btn-sm">Full Heatmap</Link>
          </div>
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  {weeks.map((w) => <th key={w.key} style={{ textAlign: "center" }}>{w.key}</th>)}
                  <th style={{ textAlign: "center" }}>Avg</th>
                </tr>
              </thead>
              <tbody>
                {plannerRows.slice(0, 8).map(({ resource, weekData, avgPct }) => (
                  <tr key={resource.id}>
                    <td style={{ fontWeight: 600 }}>{resource.name}</td>
                    {weekData.map((cell) => (
                      <td key={cell.week.key} style={{ padding: 4 }}>
                        <div className={`rc-heat-cell ${heatClass(cell.pct)}`}>{cell.pct}%</div>
                      </td>
                    ))}
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{avgPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rc-card">
          <div className="rc-card-header">
            <h3 className="rc-card-title">Allocation Conflicts &amp; Alerts</h3>
            <span className="rc-badge rc-badge-slate">{alerts.length} Active</span>
          </div>
          {alerts.length === 0 ? (
            <div className="rc-alert rc-alert-healthy">
              <CheckCircle2 size={14} />
              <span>No over-allocation conflicts detected for {formatMonthLabel(monthKey)}.</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {alerts.map((al, i) => (
                <div key={i} className={`rc-alert ${al.severity === "critical" ? "rc-alert-critical" : al.severity === "warning" ? "rc-alert-warning" : "rc-alert-info"}`}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>{al.title}</div>
                    <div style={{ fontSize: 11, opacity: 0.9 }}>{al.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
