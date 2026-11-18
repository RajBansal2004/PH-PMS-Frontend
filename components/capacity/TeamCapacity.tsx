"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  X,
} from "lucide-react";
import {
  capacityApi,
  lookupApi,
  DepartmentLite,
  currentMonthKey,
  formatMonthLabel,
  shiftMonthKey,
  getInitials,
  formatShortDate,
} from "@/lib/resources/api";
import "@/components/resources/resource-capacity.css";

const DEPT_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#0891b2", "#db2777"];

export default function TeamCapacity() {
  const router = useRouter();
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [departments, setDepartments] = useState<DepartmentLite[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Plan Adjustment Modal
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [savingAdj, setSavingAdj] = useState(false);
  const [adjForm, setAdjForm] = useState({
    employeeId: "",
    departmentId: "",
    adjustmentType: "ADD_CAPACITY" as "ADD_CAPACITY" | "REDUCE_CAPACITY" | "ONE_TIME",
    adjustmentHours: 16,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    reason: "",
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamRes, deptList] = await Promise.all([
        capacityApi.getTeam({
          month: monthKey,
          departmentId: deptFilter !== "ALL" ? deptFilter : undefined,
        }),
        lookupApi.departments().catch(() => []),
      ]);
      setData(teamRes);
      setDepartments(deptList);
    } catch (e: any) {
      setError(e?.message || "Failed to load team capacity");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [monthKey, deptFilter]);

  const summary = data?.summary || {
    totalMembers: 0,
    totalCapacityHours: 0,
    totalAllocatedHours: 0,
    totalAvailableHours: 0,
    utilizationRate: 0,
    overallocatedCount: 0,
    availableMembersCount: 0,
  };

  const teamMembers: any[] = data?.teamMembers || [];
  const deptBreakdown: any[] = data?.departmentBreakdown || [];
  const alerts: any[] = data?.alerts || [];
  const adjustments: any[] = data?.adjustments || [];

  const maxDeptHours = useMemo(
    () => Math.max(1, ...deptBreakdown.map((d) => Math.max(d.capacityHours || 0, d.allocatedHours || 0))),
    [deptBreakdown]
  );

  const handleSaveAdjustment = async () => {
    setSavingAdj(true);
    setError(null);
    try {
      await capacityApi.createAdjustment({
        employeeId: adjForm.employeeId || undefined,
        departmentId: adjForm.departmentId || undefined,
        adjustmentType: adjForm.adjustmentType,
        adjustmentHours: Number(adjForm.adjustmentHours || 0),
        startDate: adjForm.startDate,
        endDate: adjForm.endDate,
        reason: adjForm.reason.trim() || "Capacity plan adjustment",
        period: "MONTHLY",
        approvalStatus: "APPROVED",
      });
      setShowAdjModal(false);
      setAdjForm({
        employeeId: "",
        departmentId: "",
        adjustmentType: "ADD_CAPACITY",
        adjustmentHours: 16,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        reason: "",
      });
      setNotice("Capacity adjustment saved and applied.");
      setTimeout(() => setNotice(null), 3000);
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Failed to save adjustment");
    } finally {
      setSavingAdj(false);
    }
  };

  return (
    <div className="rc-page">
      {/* Header */}
      <div>
        <div className="rc-breadcrumb">
          <span>Capacity Management</span>
          <ChevronRight size={12} />
          <span style={{ color: "#0f172a", fontWeight: 600 }}>Team Capacity</span>
        </div>
        <div className="rc-header">
          <div>
            <h1 className="rc-title">Team Capacity</h1>
            <p className="rc-subtitle">Monitor team availability, workload distribution, department utilization, and capacity adjustments.</p>
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
            <button type="button" className="rc-btn rc-btn-outline" onClick={loadData} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" className="rc-btn rc-btn-primary" onClick={() => setShowAdjModal(true)}>
              <Plus size={14} /> Plan Adjustment
            </button>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="rc-subnav">
        <Link href="/capacity" className="rc-subnav-link active">Team Capacity</Link>
        <Link href="/capacity/individual" className="rc-subnav-link">Individual Capacity</Link>
        <Link href="/capacity/forecast" className="rc-subnav-link">Capacity Forecast</Link>
        <Link href="/capacity/heatmap" className="rc-subnav-link">Utilization Heatmap</Link>
      </div>

      {notice && <div className="rc-alert rc-alert-healthy"><CheckCircle2 size={14} /> <span>{notice}</span></div>}
      {error && <div className="rc-alert rc-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* 5-KPI Strip matching CAP-001 */}
      <div className="rc-kpi-grid">
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#eff6ff", color: "#2563eb" }}><Clock size={16} /></div>
          <div>
            <span className="rc-kpi-label">Total Capacity</span>
            <span className="rc-kpi-value">{summary.totalCapacityHours.toLocaleString()}<span className="rc-kpi-sub">hrs</span></span>
          </div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#ecfdf5", color: "#16a34a" }}><CheckCircle2 size={16} /></div>
          <div>
            <span className="rc-kpi-label">Allocated</span>
            <span className="rc-kpi-value">{summary.totalAllocatedHours.toLocaleString()} hrs<span className="rc-kpi-sub">({summary.utilizationRate}%)</span></span>
          </div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#fffbeb", color: "#d97706" }}><TrendingUp size={16} /></div>
          <div>
            <span className="rc-kpi-label">Available</span>
            <span className="rc-kpi-value">{summary.totalAvailableHours.toLocaleString()} hrs<span className="rc-kpi-sub">({Math.max(0, 100 - summary.utilizationRate)}%)</span></span>
          </div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><AlertTriangle size={16} /></div>
          <div>
            <span className="rc-kpi-label">Overallocated</span>
            <span className="rc-kpi-value" style={{ color: summary.overallocatedCount > 0 ? "#dc2626" : "#0f172a" }}>{summary.overallocatedCount}<span className="rc-kpi-sub">members</span></span>
          </div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}><Users size={16} /></div>
          <div>
            <span className="rc-kpi-label">Active Headcount</span>
            <span className="rc-kpi-value">{summary.totalMembers}<span className="rc-kpi-sub">({summary.availableMembersCount} open)</span></span>
          </div>
        </div>
      </div>

      {/* Charts Row matching CAP-001 */}
      <div className="rc-grid-2">
        {/* Capacity vs Allocation Grouped Bar Chart */}
        <div className="rc-card">
          <div className="rc-card-header">
            <h3 className="rc-card-title">Team Capacity vs Allocation</h3>
            <div style={{ display: "flex", gap: 10, fontSize: 10.5, color: "#64748b" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "#2563eb" }} /> Capacity
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "#16a34a" }} /> Allocated
              </span>
            </div>
          </div>
          {deptBreakdown.length === 0 ? (
            <div className="rc-empty">No department capacity data for this period.</div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 170, paddingTop: 12, overflowX: "auto" }}>
              {deptBreakdown.map((d) => {
                const capH = Math.max(8, Math.round(((d.capacityHours || 0) / maxDeptHours) * 130));
                const allocH = Math.max(4, Math.round(((d.allocatedHours || 0) / maxDeptHours) * 130));
                return (
                  <div key={d.departmentName} style={{ flex: 1, minWidth: 68, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 135 }}>
                      <div
                        style={{ width: 18, height: capH, background: "#2563eb", borderRadius: "4px 4px 0 0" }}
                        title={`Capacity: ${d.capacityHours}h`}
                      />
                      <div
                        style={{ width: 18, height: allocH, background: d.utilizationRate > 100 ? "#dc2626" : "#16a34a", borderRadius: "4px 4px 0 0" }}
                        title={`Allocated: ${d.allocatedHours}h (${d.utilizationRate}%)`}
                      />
                    </div>
                    <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, textAlign: "center", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.departmentName}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Utilization by Department */}
        <div className="rc-card">
          <div className="rc-card-header">
            <h3 className="rc-card-title">Utilization by Department</h3>
            <span className="rc-badge rc-badge-blue">Overall {summary.utilizationRate}%</span>
          </div>
          {deptBreakdown.length === 0 ? (
            <div className="rc-empty">No departments found.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {deptBreakdown.map((d, idx) => (
                <div key={d.departmentName}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: DEPT_COLORS[idx % DEPT_COLORS.length] }} />
                      {d.departmentName} <span style={{ color: "#64748b", fontWeight: 400 }}>({d.headcount})</span>
                    </span>
                    <span style={{ fontWeight: 700, color: d.utilizationRate > 100 ? "#dc2626" : d.utilizationRate > 80 ? "#d97706" : "#16a34a" }}>
                      {d.utilizationRate}% · {d.allocatedHours}/{d.capacityHours}h
                    </span>
                  </div>
                  <div className="rc-bar-track">
                    <div
                      className="rc-bar-fill"
                      style={{
                        width: `${Math.min(100, d.utilizationRate)}%`,
                        background: d.utilizationRate > 100 ? "#dc2626" : DEPT_COLORS[idx % DEPT_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Team Capacity Detailed Table matching CAP-001 Panel 4 */}
      <div className="rc-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid #e2e8f0" }}>
          <h3 className="rc-card-title">Team Capacity Breakdown ({teamMembers.length} members)</h3>
          <Link href="/resources/allocate" className="rc-btn rc-btn-outline rc-btn-sm">Manage Allocations</Link>
        </div>
        <div className="rc-table-wrap">
          <table className="rc-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role &amp; Department</th>
                <th>Capacity</th>
                <th>Allocated</th>
                <th>Available</th>
                <th>Utilization</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && teamMembers.length === 0 ? (
                <tr><td colSpan={8} className="rc-empty">Calculating live team capacity...</td></tr>
              ) : teamMembers.length === 0 ? (
                <tr><td colSpan={8} className="rc-empty">No active employees found. Add resources to calculate capacity.</td></tr>
              ) : (
                teamMembers.map((m) => (
                  <tr key={m.employeeId}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="rc-avatar">{getInitials(m.name)}</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{m.name}</div>
                          <div style={{ fontSize: 10, color: "#64748b" }}>{m.code || m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{m.role}</div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>{m.department}</div>
                    </td>
                    <td><strong>{m.capacityHours}h</strong></td>
                    <td>{m.allocatedHours}h</td>
                    <td style={{ color: m.availableHours > 0 ? "#16a34a" : "#64748b", fontWeight: 600 }}>{m.availableHours}h</td>
                    <td style={{ minWidth: 130 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div className="rc-bar-track" style={{ flex: 1 }}>
                          <div
                            className="rc-bar-fill"
                            style={{
                              width: `${Math.min(100, m.utilizationPercent)}%`,
                              background: m.utilizationPercent > 100 ? "#dc2626" : m.utilizationPercent > 80 ? "#f59e0b" : "#16a34a",
                            }}
                          />
                        </div>
                        <strong>{m.utilizationPercent}%</strong>
                      </div>
                    </td>
                    <td>
                      <span className={`rc-badge ${m.status === "OVERALLOCATED" ? "rc-badge-red" : m.status === "HIGH" ? "rc-badge-amber" : m.status === "BENCH" ? "rc-badge-blue" : "rc-badge-green"}`}>
                        {m.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="rc-btn rc-btn-outline rc-btn-sm"
                        onClick={() => router.push(`/capacity/individual?employeeId=${m.employeeId}`)}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Row: Capacity Alerts & Recent Plan Adjustments (CAP-001 Panels 7 & 8) */}
      <div className="rc-grid-2">
        <div className="rc-card">
          <div className="rc-card-header">
            <h3 className="rc-card-title">Capacity Alerts</h3>
            <span className="rc-badge rc-badge-slate">{alerts.length}</span>
          </div>
          {alerts.length === 0 ? (
            <div className="rc-alert rc-alert-healthy">
              <CheckCircle2 size={14} /> <span>All team members are operating within healthy capacity limits.</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {alerts.map((al, i) => (
                <div key={i} className={`rc-alert ${al.severity === "CRITICAL" ? "rc-alert-critical" : al.severity === "WARNING" ? "rc-alert-warning" : "rc-alert-info"}`}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>{al.title}</div>
                    <div style={{ fontSize: 11 }}>{al.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rc-card">
          <div className="rc-card-header">
            <h3 className="rc-card-title">Plan Adjustments Log</h3>
            <button type="button" className="rc-btn rc-btn-outline rc-btn-sm" onClick={() => setShowAdjModal(true)}>+ Add Adjustment</button>
          </div>
          {adjustments.length === 0 ? (
            <div className="rc-empty" style={{ padding: "20px 8px" }}>No manual capacity adjustments recorded yet.</div>
          ) : (
            <div className="rc-table-wrap">
              <table className="rc-table">
                <thead>
                  <tr>
                    <th>Target</th>
                    <th>Type</th>
                    <th>Hours</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.slice(0, 6).map((adj) => (
                    <tr key={adj._id}>
                      <td>
                        <strong>{adj.employeeId?.displayName || adj.departmentId?.name || "Team-wide"}</strong>
                        {adj.reason && <div style={{ fontSize: 10, color: "#64748b" }}>{adj.reason}</div>}
                      </td>
                      <td><span className={`rc-badge ${adj.adjustmentType === "REDUCE_CAPACITY" ? "rc-badge-amber" : "rc-badge-green"}`}>{adj.adjustmentType?.replace("_", " ")}</span></td>
                      <td><strong>{adj.adjustmentType === "REDUCE_CAPACITY" ? `-${adj.adjustmentHours}h` : `+${adj.adjustmentHours}h`}</strong></td>
                      <td style={{ fontSize: 10.5, color: "#64748b" }}>{formatShortDate(adj.startDate || adj.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Capacity Plan Adjustment Modal */}
      {showAdjModal && (
        <div className="rc-modal-backdrop" onClick={() => setShowAdjModal(false)}>
          <div className="rc-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="rc-modal-header">
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Plan Capacity Adjustment</h2>
              <button type="button" className="rc-btn rc-btn-ghost rc-btn-sm" onClick={() => setShowAdjModal(false)}><X size={15} /></button>
            </div>
            <div className="rc-modal-body">
              <div className="rc-grid-2">
                <div className="rc-field">
                  <label>Member (Optional)</label>
                  <select className="rc-select" value={adjForm.employeeId} onChange={(e) => setAdjForm({ ...adjForm, employeeId: e.target.value })}>
                    <option value="">All / Department-level</option>
                    {teamMembers.map((m) => <option key={m.employeeId} value={m.employeeId}>{m.name}</option>)}
                  </select>
                </div>
                <div className="rc-field">
                  <label>Department (Optional)</label>
                  <select className="rc-select" value={adjForm.departmentId} onChange={(e) => setAdjForm({ ...adjForm, departmentId: e.target.value })}>
                    <option value="">Any Department</option>
                    {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="rc-field">
                  <label>Adjustment Type</label>
                  <select className="rc-select" value={adjForm.adjustmentType} onChange={(e) => setAdjForm({ ...adjForm, adjustmentType: e.target.value as any })}>
                    <option value="ADD_CAPACITY">Add Capacity</option>
                    <option value="REDUCE_CAPACITY">Reduce Capacity</option>
                    <option value="ONE_TIME">One-Time Adjustment</option>
                  </select>
                </div>
                <div className="rc-field">
                  <label>Hours</label>
                  <input className="rc-input" type="number" min={1} value={adjForm.adjustmentHours} onChange={(e) => setAdjForm({ ...adjForm, adjustmentHours: Number(e.target.value || 0) })} />
                </div>
                <div className="rc-field">
                  <label>Start Date</label>
                  <input className="rc-input" type="date" value={adjForm.startDate} onChange={(e) => setAdjForm({ ...adjForm, startDate: e.target.value })} />
                </div>
                <div className="rc-field">
                  <label>End Date</label>
                  <input className="rc-input" type="date" value={adjForm.endDate} onChange={(e) => setAdjForm({ ...adjForm, endDate: e.target.value })} />
                </div>
              </div>
              <div className="rc-field">
                <label>Reason</label>
                <textarea className="rc-textarea" rows={2} value={adjForm.reason} onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })} placeholder="e.g. Supporting critical release or training sprint..." />
              </div>
            </div>
            <div className="rc-modal-footer">
              <button type="button" className="rc-btn rc-btn-outline" onClick={() => setShowAdjModal(false)}>Cancel</button>
              <button type="button" className="rc-btn rc-btn-primary" disabled={savingAdj} onClick={handleSaveAdjustment}>
                {savingAdj ? "Saving..." : "Save Adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
