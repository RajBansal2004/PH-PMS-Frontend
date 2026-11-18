"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  Plus,
  Mail,
  Phone,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  capacityApi,
  leaveApi,
  lookupApi,
  DepartmentLite,
  currentMonthKey,
  formatMonthLabel,
  shiftMonthKey,
  getInitials,
  formatShortDate,
} from "@/lib/resources/api";
import "@/components/resources/resource-capacity.css";

function IndividualCapacityInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmpId = searchParams.get("employeeId") || "";

  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [departments, setDepartments] = useState<DepartmentLite[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState(initialEmpId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Adjustment inline form (CAP-002 Panel 8)
  const [adjType, setAdjType] = useState<"ADD_CAPACITY" | "REDUCE_CAPACITY" | "ONE_TIME">("ADD_CAPACITY");
  const [adjHours, setAdjHours] = useState(8);
  const [adjStart, setAdjStart] = useState(new Date().toISOString().slice(0, 10));
  const [adjEnd, setAdjEnd] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [adjReason, setAdjReason] = useState("");
  const [savingAdj, setSavingAdj] = useState(false);

  // Apply Leave Modal (CAP-002 Panel 4)
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "Casual Leave",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    reason: "",
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, deptList] = await Promise.all([
        capacityApi.getIndividual({
          month: monthKey,
          departmentId: deptFilter !== "ALL" ? deptFilter : undefined,
        }),
        lookupApi.departments().catch(() => []),
      ]);
      setMembers(list);
      setDepartments(deptList);
      if (list.length > 0) {
        const exists = list.some((m) => String(m.id) === String(selectedId));
        if (!selectedId || !exists) {
          setSelectedId(String(list[0].id));
        }
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load individual capacity");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [monthKey, deptFilter]);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => `${m.name} ${m.code} ${m.designation} ${m.department}`.toLowerCase().includes(q));
  }, [members, search]);

  const current = useMemo(
    () => members.find((m) => String(m.id) === String(selectedId)) || filteredMembers[0] || null,
    [members, filteredMembers, selectedId]
  );

  const handleSaveAdjustment = async () => {
    if (!current) return;
    setSavingAdj(true);
    setError(null);
    try {
      await capacityApi.createAdjustment({
        employeeId: current.id,
        adjustmentType: adjType,
        adjustmentHours: Number(adjHours || 0),
        startDate: adjStart,
        endDate: adjEnd,
        reason: adjReason.trim() || "Individual capacity adjustment",
        period: "MONTHLY",
        approvalStatus: "APPROVED",
      });
      setAdjReason("");
      flash("Capacity adjustment saved.");
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Failed to save adjustment");
    } finally {
      setSavingAdj(false);
    }
  };

  const handleApplyLeave = async () => {
    if (!current) return;
    setSavingAdj(true);
    try {
      const s = new Date(leaveForm.startDate);
      const e = new Date(leaveForm.endDate);
      const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
      await leaveApi.create({
        employeeId: current.id,
        leaveType: leaveForm.leaveType,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        days,
        reason: leaveForm.reason || leaveForm.leaveType,
        status: "APPROVED",
      });
      setShowLeaveModal(false);
      flash("Leave recorded and deducted from capacity.");
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Failed to log leave");
    } finally {
      setSavingAdj(false);
    }
  };

  // Donut calculations
  const totalCap = current?.netEffectiveCapacityHours || 0;
  const committed = current?.committedDeliveryHours || 0;
  const available = current?.remainingAvailableHours || 0;
  const leaveHrs = current?.leaveHours || 0;
  const utilPct = totalCap > 0 ? Math.round((committed / totalCap) * 1000) / 10 : current?.allocationPercent || 0;
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const allocArc = (Math.min(100, utilPct) / 100) * circ;

  return (
    <div className="rc-page">
      {/* Header */}
      <div>
        <div className="rc-breadcrumb">
          <span>Capacity Management</span>
          <ChevronRight size={12} />
          <span style={{ color: "#0f172a", fontWeight: 600 }}>Individual Capacity</span>
        </div>
        <div className="rc-header">
          <div>
            <h1 className="rc-title">Individual Capacity</h1>
            <p className="rc-subtitle">Inspect individual resource capacity, project allocations, leaves, weekly trend, and capacity adjustments.</p>
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
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
            {current && (
              <button
                type="button"
                className="rc-btn rc-btn-primary"
                onClick={() => router.push(`/resources/allocate?resourceId=${current.resourceId || current.id}`)}
              >
                <Plus size={14} /> Allocate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="rc-subnav">
        <Link href="/capacity" className="rc-subnav-link">Team Capacity</Link>
        <Link href="/capacity/individual" className="rc-subnav-link active">Individual Capacity</Link>
        <Link href="/capacity/forecast" className="rc-subnav-link">Capacity Forecast</Link>
        <Link href="/capacity/heatmap" className="rc-subnav-link">Utilization Heatmap</Link>
      </div>

      {notice && <div className="rc-alert rc-alert-healthy"><CheckCircle2 size={14} /> <span>{notice}</span></div>}
      {error && <div className="rc-alert rc-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* Member Search & Selector Bar */}
      <div className="rc-filter-bar">
        <div className="rc-search-wrap" style={{ maxWidth: 280 }}>
          <Search size={13} className="rc-search-icon" />
          <input className="rc-input rc-search-input" placeholder="Search member..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="rc-select" style={{ minWidth: 240 }} value={current?.id || ""} onChange={(e) => setSelectedId(e.target.value)}>
          {filteredMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {m.designation} ({m.allocationPercent}%)
            </option>
          ))}
        </select>
      </div>

      {loading && !current ? (
        <div className="rc-card rc-empty">Loading individual capacity profiles...</div>
      ) : !current ? (
        <div className="rc-card rc-empty">No resources found. Add a resource first to inspect individual capacity.</div>
      ) : (
        <>
          {/* Individual Overview Card (CAP-002 Panel 1) */}
          <div className="rc-card">
            <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) 2fr", gap: 16, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div className="rc-avatar rc-avatar-lg">{getInitials(current.name)}</div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <strong style={{ fontSize: 15 }}>{current.name}</strong>
                    <span className={`rc-badge ${current.status === "RED" ? "rc-badge-red" : current.status === "AMBER" ? "rc-badge-amber" : current.status === "BENCH" ? "rc-badge-blue" : "rc-badge-green"}`}>
                      {current.status === "RED" ? "Overallocated" : current.status === "BENCH" ? "On Bench" : "Active"}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#475569" }}>{current.designation} · {current.department}</div>
                  <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                    {current.location && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={11} /> {current.location}</span>}
                    {current.email && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Mail size={11} /> {current.email}</span>}
                    {current.phone && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Phone size={11} /> {current.phone}</span>}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  <div style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 10, color: "#64748b" }}>Total Capacity</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{totalCap} hrs</div>
                  </div>
                  <div style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 10, color: "#64748b" }}>Allocated</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: utilPct > 100 ? "#dc2626" : "#2563eb" }}>{committed} hrs</div>
                  </div>
                  <div style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 10, color: "#64748b" }}>Available</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#16a34a" }}>{available} hrs</div>
                  </div>
                  <div style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 10, color: "#64748b" }}>On Leave</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#d97706" }}>{leaveHrs} hrs</div>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>Monthly Utilization</span>
                    <strong style={{ color: utilPct > 100 ? "#dc2626" : "#0f172a" }}>{utilPct}%</strong>
                  </div>
                  <div className="rc-bar-track" style={{ height: 8 }}>
                    <div
                      className="rc-bar-fill"
                      style={{
                        width: `${Math.min(100, utilPct)}%`,
                        background: utilPct > 100 ? "#dc2626" : utilPct > 80 ? "#f59e0b" : "#2563eb",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main 2-column Panels */}
          <div className="rc-grid-2">
            {/* Left Column: Project Allocations + Weekly Trend + Leaves */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Project Allocations (CAP-002 Panel 5) */}
              <div className="rc-card">
                <div className="rc-card-header">
                  <h3 className="rc-card-title">Project Allocations ({formatMonthLabel(monthKey)})</h3>
                  <Link href={`/resources/allocate?resourceId=${current.resourceId || current.id}`} className="rc-btn rc-btn-outline rc-btn-sm">+ Allocate</Link>
                </div>
                {current.allocations?.length === 0 ? (
                  <div className="rc-empty" style={{ padding: "18px 8px" }}>No active allocations in {formatMonthLabel(monthKey)}.</div>
                ) : (
                  <div className="rc-table-wrap">
                    <table className="rc-table">
                      <thead>
                        <tr>
                          <th>Project</th>
                          <th>Role</th>
                          <th>Hours</th>
                          <th>Util %</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {current.allocations.map((a: any) => (
                          <tr key={a.id}>
                            <td><strong>{a.project}</strong></td>
                            <td>{a.role}</td>
                            <td>{a.hours}h</td>
                            <td><strong>{a.percent}%</strong></td>
                            <td><span className="rc-badge rc-badge-green">{a.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Weekly Utilization Trend W1-W5 (CAP-002 Panel 7) */}
              <div className="rc-card">
                <div className="rc-card-header">
                  <h3 className="rc-card-title">Weekly Utilization Trend ({formatMonthLabel(monthKey)})</h3>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 150, paddingTop: 12 }}>
                  {(current.weeklyTrend || []).map((w: any) => {
                    const capH = 100;
                    const allocH = Math.min(120, Math.max(6, Math.round((w.utilizationPercent / 100) * 100)));
                    return (
                      <div key={w.week} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: w.utilizationPercent > 100 ? "#dc2626" : "#0f172a" }}>{w.utilizationPercent}%</span>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 110 }}>
                          <div style={{ width: 14, height: capH * 0.85, background: "#dbeafe", borderRadius: "3px 3px 0 0" }} title={`Capacity: ${w.capacityHours}h`} />
                          <div style={{ width: 14, height: allocH * 0.85, background: w.utilizationPercent > 100 ? "#dc2626" : "#16a34a", borderRadius: "3px 3px 0 0" }} title={`Allocated: ${w.allocatedHours}h`} />
                        </div>
                        <div style={{ fontSize: 10.5, fontWeight: 600 }}>{w.week}</div>
                        <div style={{ fontSize: 9.5, color: "#64748b" }}>{w.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leave Summary (CAP-002 Panel 4) */}
              <div className="rc-card">
                <div className="rc-card-header">
                  <h3 className="rc-card-title">Leaves &amp; Time Off</h3>
                  <button type="button" className="rc-btn rc-btn-outline rc-btn-sm" onClick={() => setShowLeaveModal(true)}>+ Apply Leave</button>
                </div>
                {current.leaves?.length === 0 ? (
                  <div className="rc-empty" style={{ padding: "14px 8px" }}>No leaves recorded for {current.name}.</div>
                ) : (
                  <div className="rc-table-wrap">
                    <table className="rc-table">
                      <thead>
                        <tr><th>Type</th><th>Dates</th><th>Days</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {current.leaves.slice(0, 5).map((lv: any) => (
                          <tr key={lv.id}>
                            <td><strong>{lv.leaveType}</strong></td>
                            <td>{formatShortDate(lv.startDate)} – {formatShortDate(lv.endDate)}</td>
                            <td>{lv.days}d</td>
                            <td><span className="rc-badge rc-badge-amber">{lv.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Capacity Breakdown Donut + Settings + Capacity Adjustment + History */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Capacity Breakdown Donut (CAP-002 Panel 6) */}
              <div className="rc-card">
                <div className="rc-card-header"><h3 className="rc-card-title">Capacity Breakdown</h3></div>
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="11" />
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="none"
                      stroke={utilPct > 100 ? "#dc2626" : "#2563eb"}
                      strokeWidth="11"
                      strokeDasharray={`${allocArc} ${circ}`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                    />
                    <text x="50" y="48" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0f172a">{totalCap}h</text>
                    <text x="50" y="61" textAnchor="middle" fontSize="9" fill="#64748b">Capacity</text>
                  </svg>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>● Project Allocation</span><strong>{committed} hrs ({utilPct}%)</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>● Approved Leave</span><strong>{leaveHrs} hrs</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>● Available Capacity</span><strong style={{ color: "#16a34a" }}>{available} hrs</strong>
                    </div>
                  </div>
                </div>

                <div className="rc-grid-2" style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #f1f5f9", fontSize: 11 }}>
                  <div><span style={{ color: "#64748b" }}>Standard Hours:</span> <strong>{current.workingHoursPerDay} hrs/day</strong></div>
                  <div><span style={{ color: "#64748b" }}>Working Days:</span> <strong>{current.workingDaysPerWeek} days/wk</strong></div>
                  <div><span style={{ color: "#64748b" }}>Employment:</span> <strong>{String(current.employmentType).replace("_", " ")}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Time Zone:</span> <strong>{current.timeZone}</strong></div>
                </div>
              </div>

              {/* Capacity Adjustment Form (CAP-002 Panel 8) */}
              <div className="rc-card">
                <div className="rc-card-header"><h3 className="rc-card-title">Capacity Adjustment</h3></div>
                <div className="rc-seg" style={{ marginBottom: 10 }}>
                  <button type="button" className={`rc-seg-btn ${adjType === "ADD_CAPACITY" ? "active" : ""}`} onClick={() => setAdjType("ADD_CAPACITY")}>Add Capacity</button>
                  <button type="button" className={`rc-seg-btn ${adjType === "REDUCE_CAPACITY" ? "active" : ""}`} onClick={() => setAdjType("REDUCE_CAPACITY")}>Reduce Capacity</button>
                  <button type="button" className={`rc-seg-btn ${adjType === "ONE_TIME" ? "active" : ""}`} onClick={() => setAdjType("ONE_TIME")}>One-time</button>
                </div>
                <div className="rc-grid-2">
                  <div className="rc-field">
                    <label>Hours</label>
                    <input className="rc-input" type="number" min={1} value={adjHours} onChange={(e) => setAdjHours(Number(e.target.value || 0))} />
                  </div>
                  <div className="rc-field">
                    <label>Start Date</label>
                    <input className="rc-input" type="date" value={adjStart} onChange={(e) => setAdjStart(e.target.value)} />
                  </div>
                  <div className="rc-field">
                    <label>End Date</label>
                    <input className="rc-input" type="date" value={adjEnd} onChange={(e) => setAdjEnd(e.target.value)} />
                  </div>
                  <div className="rc-field">
                    <label>Reason</label>
                    <input className="rc-input" value={adjReason} onChange={(e) => setAdjReason(e.target.value)} placeholder="e.g. Critical release" />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <button type="button" className="rc-btn rc-btn-primary rc-btn-sm" disabled={savingAdj} onClick={handleSaveAdjustment}>
                    {savingAdj ? "Saving..." : "Save Adjustment"}
                  </button>
                </div>
              </div>

              {/* Adjustment History (CAP-002 Panel 10) */}
              <div className="rc-card">
                <div className="rc-card-header"><h3 className="rc-card-title">Adjustment History</h3></div>
                {(current.adjustments || []).length === 0 ? (
                  <div className="rc-empty" style={{ padding: "12px 6px" }}>No capacity adjustments recorded yet.</div>
                ) : (
                  <table className="rc-table">
                    <thead><tr><th>Date</th><th>Action</th><th>Hours</th><th>Status</th></tr></thead>
                    <tbody>
                      {current.adjustments.map((adj: any) => (
                        <tr key={adj._id}>
                          <td>{formatShortDate(adj.createdAt)}</td>
                          <td>{adj.reason || adj.adjustmentType}</td>
                          <td><strong>{adj.adjustmentType === "REDUCE_CAPACITY" ? `-${adj.adjustmentHours}h` : `+${adj.adjustmentHours}h`}</strong></td>
                          <td><span className="rc-badge rc-badge-green">{adj.approvalStatus || "Approved"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Apply Leave Modal */}
      {showLeaveModal && (
        <div className="rc-modal-backdrop" onClick={() => setShowLeaveModal(false)}>
          <div className="rc-modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="rc-modal-header">
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Apply Leave — {current?.name}</h2>
              <button type="button" className="rc-btn rc-btn-ghost rc-btn-sm" onClick={() => setShowLeaveModal(false)}><X size={15} /></button>
            </div>
            <div className="rc-modal-body">
              <div className="rc-field">
                <label>Leave Type</label>
                <select className="rc-select" value={leaveForm.leaveType} onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}>
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Earned Leave">Earned Leave</option>
                  <option value="Work From Home">Work From Home</option>
                </select>
              </div>
              <div className="rc-grid-2">
                <div className="rc-field">
                  <label>Start Date</label>
                  <input className="rc-input" type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} />
                </div>
                <div className="rc-field">
                  <label>End Date</label>
                  <input className="rc-input" type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} />
                </div>
              </div>
              <div className="rc-field">
                <label>Reason</label>
                <textarea className="rc-textarea" rows={2} value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
              </div>
            </div>
            <div className="rc-modal-footer">
              <button type="button" className="rc-btn rc-btn-outline" onClick={() => setShowLeaveModal(false)}>Cancel</button>
              <button type="button" className="rc-btn rc-btn-primary" disabled={savingAdj} onClick={handleApplyLeave}>
                {savingAdj ? "Saving..." : "Submit Leave"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IndividualCapacity() {
  return (
    <Suspense fallback={<div className="rc-page"><div className="rc-card rc-empty">Loading Individual Capacity...</div></div>}>
      <IndividualCapacityInner />
    </Suspense>
  );
}
