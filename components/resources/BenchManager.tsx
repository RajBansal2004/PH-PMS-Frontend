"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  Layers,
  Clock,
  Sparkles,
  Search,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  Plus,
  X,
} from "lucide-react";
import {
  resourceApi,
  allocationApi,
  lookupApi,
  ResourceItem,
  AllocationItem,
  ProjectLite,
  formatShortDate,
  getInitials,
} from "@/lib/resources/api";
import "@/components/resources/resource-capacity.css";

function daysSince(d?: string | null): number {
  if (!d) return 0;
  const diff = Date.now() - new Date(d).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

export default function BenchManager() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [projects, setProjects] = useState<ProjectLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"overview" | "analytics">("overview");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [availabilityFilter, setAvailabilityFilter] = useState<"ALL" | "BENCH" | "PARTIAL">("ALL");

  // Quick Allocate Modal (RES-006 Panel 6)
  const [allocTarget, setAllocTarget] = useState<ResourceItem | null>(null);
  const [allocForm, setAllocForm] = useState({
    projectId: "",
    role: "",
    allocationType: "FULL_TIME" as AllocationItem["allocationType"],
    allocationPercent: 100,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    notes: "",
  });

  // Update Bench / Availability Modal (RES-006 Panel 5)
  const [statusTarget, setStatusTarget] = useState<ResourceItem | null>(null);
  const [statusForm, setStatusForm] = useState({
    status: "BENCH" as ResourceItem["status"],
    availableFrom: "",
    expectedAllocationDate: "",
    benchReason: "",
    availabilityNotes: "",
  });
  const [saving, setSaving] = useState(false);

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
      setError(e?.message || "Failed to load bench resources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const liveAllocMap = useMemo(() => {
    const map = new Map<string, { total: number; nearestEnd?: string }>();
    allocations
      .filter((a) => !["CANCELLED", "RELEASED", "COMPLETED"].includes(a.status))
      .forEach((a) => {
        const prev = map.get(a.employeeId) || { total: 0 };
        prev.total += a.allocationPercent;
        if (a.endDate && (!prev.nearestEnd || new Date(a.endDate) < new Date(prev.nearestEnd))) {
          prev.nearestEnd = a.endDate;
        }
        map.set(a.employeeId, prev);
      });
    return map;
  }, [allocations]);

  const enriched = useMemo(() => {
    return resources.map((r) => {
      const live = liveAllocMap.get(r.employeeId);
      const allocPct = live ? live.total : r.currentAllocationPercent;
      const availPct = Math.max(0, 100 - allocPct);
      const bucket: "BENCH" | "PARTIAL" | "ALLOCATED" =
        allocPct === 0 ? "BENCH" : allocPct < 80 ? "PARTIAL" : "ALLOCATED";
      return {
        ...r,
        currentAllocationPercent: allocPct,
        availabilityPercent: availPct,
        bucket,
        benchDays: bucket === "BENCH" ? daysSince(r.benchSince || r.createdAt) : 0,
        nearestEnd: live?.nearestEnd || null,
      };
    });
  }, [resources, liveAllocMap]);

  const benchAndPartial = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((r) => {
      if (availabilityFilter === "BENCH" && r.bucket !== "BENCH") return false;
      if (availabilityFilter === "PARTIAL" && r.bucket !== "PARTIAL") return false;
      if (availabilityFilter === "ALL" && r.bucket === "ALLOCATED") return false;
      if (roleFilter !== "ALL" && r.designationName !== roleFilter) return false;
      if (q && !`${r.name} ${r.designationName} ${r.primarySkill} ${r.secondarySkills.join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [enriched, search, roleFilter, availabilityFilter]);

  const roleOptions = useMemo(() => {
    const s = new Set<string>();
    enriched.forEach((r) => r.designationName && s.add(r.designationName));
    return Array.from(s).sort();
  }, [enriched]);

  const kpis = useMemo(() => {
    const total = enriched.length;
    const allocated = enriched.filter((r) => r.bucket === "ALLOCATED").length;
    const onBench = enriched.filter((r) => r.bucket === "BENCH").length;
    const partial = enriched.filter((r) => r.bucket === "PARTIAL").length;
    const avgBenchDays =
      onBench > 0
        ? Math.round(enriched.filter((r) => r.bucket === "BENCH").reduce((s, r) => s + r.benchDays, 0) / onBench)
        : 0;
    return {
      total,
      allocated,
      allocatedPct: total > 0 ? Math.round((allocated / total) * 100) : 0,
      onBench,
      benchPct: total > 0 ? Math.round((onBench / total) * 100) : 0,
      partial,
      avgBenchDays,
    };
  }, [enriched]);

  // Analytics rollups (RES-006 Panel 7)
  const benchByRole = useMemo(() => {
    const counts = new Map<string, number>();
    enriched
      .filter((r) => r.bucket === "BENCH")
      .forEach((r) => counts.set(r.designationName, (counts.get(r.designationName) || 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [enriched]);

  const benchDurations = useMemo(() => {
    const benchOnly = enriched.filter((r) => r.bucket === "BENCH");
    return [
      { label: "< 7 days", count: benchOnly.filter((r) => r.benchDays < 7).length, color: "#16a34a" },
      { label: "8 – 15 days", count: benchOnly.filter((r) => r.benchDays >= 7 && r.benchDays <= 15).length, color: "#2563eb" },
      { label: "16 – 30 days", count: benchOnly.filter((r) => r.benchDays > 15 && r.benchDays <= 30).length, color: "#f59e0b" },
      { label: "> 30 days", count: benchOnly.filter((r) => r.benchDays > 30).length, color: "#dc2626" },
    ];
  }, [enriched]);

  const openQuickAllocate = (r: ResourceItem) => {
    setAllocTarget(r);
    setAllocForm({
      projectId: projects[0]?._id || "",
      role: r.designationName || "Developer",
      allocationType: "FULL_TIME",
      allocationPercent: Math.max(20, r.availabilityPercent || 100),
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      notes: "",
    });
  };

  const handleQuickAllocate = async () => {
    if (!allocTarget || !allocForm.projectId) {
      setError("Please select a project.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await allocationApi.create({
        projectId: allocForm.projectId,
        employeeId: allocTarget.employeeId,
        role: allocForm.role || allocTarget.designationName,
        allocationType: allocForm.allocationType,
        allocationPercent: Number(allocForm.allocationPercent),
        startDate: allocForm.startDate,
        endDate: allocForm.endDate,
        status: "ACTIVE",
        notes: allocForm.notes,
      });
      setAllocTarget(null);
      await loadData();
      flash(`Allocated ${allocTarget.name} from bench.`);
    } catch (e: any) {
      setError(e?.message || "Failed to allocate resource");
    } finally {
      setSaving(false);
    }
  };

  const openStatusModal = (r: ResourceItem) => {
    setStatusTarget(r);
    setStatusForm({
      status: r.status,
      availableFrom: r.availableFrom ? r.availableFrom.slice(0, 10) : new Date().toISOString().slice(0, 10),
      expectedAllocationDate: r.expectedAllocationDate ? r.expectedAllocationDate.slice(0, 10) : "",
      benchReason: r.benchReason || "",
      availabilityNotes: r.availabilityNotes || "",
    });
  };

  const handleUpdateBenchStatus = async () => {
    if (!statusTarget) return;
    setSaving(true);
    setError(null);
    try {
      await resourceApi.update(statusTarget.id, {
        status: statusForm.status,
        availableFrom: statusForm.availableFrom || null,
        expectedAllocationDate: statusForm.expectedAllocationDate || null,
        benchReason: statusForm.benchReason,
        availabilityNotes: statusForm.availabilityNotes,
      });
      setStatusTarget(null);
      await loadData();
      flash(`Updated bench status for ${statusTarget.name}.`);
    } catch (e: any) {
      setError(e?.message || "Failed to update bench status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rc-page">
      {/* Header */}
      <div>
        <div className="rc-breadcrumb">
          <span>Resource Management</span>
          <ChevronRight size={12} />
          <span style={{ color: "#0f172a", fontWeight: 600 }}>Resource Bench / Availability</span>
        </div>
        <div className="rc-header">
          <div>
            <h1 className="rc-title">Resource Bench / Availability</h1>
            <p className="rc-subtitle">View bench resources, monitor available capacity, and quickly allocate ready talent to projects.</p>
          </div>
          <div className="rc-header-actions">
            <div className="rc-seg">
              <button type="button" className={`rc-seg-btn ${viewMode === "overview" ? "active" : ""}`} onClick={() => setViewMode("overview")}>Bench Roster</button>
              <button type="button" className={`rc-seg-btn ${viewMode === "analytics" ? "active" : ""}`} onClick={() => setViewMode("analytics")}>Bench Analytics</button>
            </div>
            <button type="button" className="rc-btn rc-btn-outline" onClick={loadData} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <Link href="/resources/allocate" className="rc-btn rc-btn-primary">
              <Plus size={14} /> Allocate from Bench
            </Link>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="rc-subnav">
        <Link href="/resources" className="rc-subnav-link">Resource Directory</Link>
        <Link href="/resources/new" className="rc-subnav-link">Add New Resource</Link>
        <Link href="/resources/allocate" className="rc-subnav-link">Project Allocation</Link>
        <Link href="/resources/planner" className="rc-subnav-link">Allocation Planner</Link>
        <Link href="/resources/calendar" className="rc-subnav-link">Resource Calendar</Link>
        <Link href="/resources/bench" className="rc-subnav-link active">Bench &amp; Availability</Link>
      </div>

      {notice && <div className="rc-alert rc-alert-healthy"><CheckCircle2 size={14} /> <span>{notice}</span></div>}
      {error && <div className="rc-alert rc-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* 5-KPI Strip matching RES-006 */}
      <div className="rc-kpi-grid">
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#eff6ff", color: "#2563eb" }}><Users size={16} /></div>
          <div><span className="rc-kpi-label">Total Resources</span><span className="rc-kpi-value">{kpis.total}</span></div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#ecfdf5", color: "#16a34a" }}><CheckCircle2 size={16} /></div>
          <div><span className="rc-kpi-label">Allocated</span><span className="rc-kpi-value">{kpis.allocated}<span className="rc-kpi-sub">({kpis.allocatedPct}%)</span></span></div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#fffbeb", color: "#d97706" }}><Layers size={16} /></div>
          <div><span className="rc-kpi-label">On Bench</span><span className="rc-kpi-value">{kpis.onBench}<span className="rc-kpi-sub">({kpis.benchPct}%)</span></span></div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}><Sparkles size={16} /></div>
          <div><span className="rc-kpi-label">Partial Capacity</span><span className="rc-kpi-value">{kpis.partial}</span></div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#eff6ff", color: "#0284c7" }}><Clock size={16} /></div>
          <div><span className="rc-kpi-label">Avg. Bench Duration</span><span className="rc-kpi-value">{kpis.avgBenchDays}<span className="rc-kpi-sub">days</span></span></div>
        </div>
      </div>

      {viewMode === "overview" ? (
        <>
          <div className="rc-filter-bar">
            <div className="rc-search-wrap">
              <Search size={13} className="rc-search-icon" />
              <input className="rc-input rc-search-input" placeholder="Search by name, skill, role..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="rc-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="ALL">Role (All)</option>
              {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
            <div className="rc-seg">
              <button type="button" className={`rc-seg-btn ${availabilityFilter === "ALL" ? "active" : ""}`} onClick={() => setAvailabilityFilter("ALL")}>Bench + Partial</button>
              <button type="button" className={`rc-seg-btn ${availabilityFilter === "BENCH" ? "active" : ""}`} onClick={() => setAvailabilityFilter("BENCH")}>On Bench (0%)</button>
              <button type="button" className={`rc-seg-btn ${availabilityFilter === "PARTIAL" ? "active" : ""}`} onClick={() => setAvailabilityFilter("PARTIAL")}>Partial (&lt;80%)</button>
            </div>
          </div>

          <div className="rc-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="rc-table-wrap">
              <table className="rc-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Primary Skills</th>
                    <th>Allocation</th>
                    <th>Availability</th>
                    <th>Bench Since</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && enriched.length === 0 ? (
                    <tr><td colSpan={8} className="rc-empty">Loading bench pool...</td></tr>
                  ) : benchAndPartial.length === 0 ? (
                    <tr><td colSpan={8} className="rc-empty">All filtered resources are currently allocated (&ge;80%).</td></tr>
                  ) : (
                    benchAndPartial.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="rc-avatar">{getInitials(r.name)}</span>
                            <div>
                              <Link href={`/resources/${r.id}`} style={{ fontWeight: 600, color: "#0f172a", textDecoration: "none" }}>{r.name}</Link>
                              <div style={{ fontSize: 10, color: "#64748b" }}>{r.departmentName}</div>
                            </div>
                          </div>
                        </td>
                        <td>{r.designationName}</td>
                        <td>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {r.primarySkill && <span className="rc-skill-chip" style={{ background: "#eff6ff", color: "#1d4ed8" }}>{r.primarySkill}</span>}
                            {r.secondarySkills.slice(0, 2).map((sk) => <span key={sk} className="rc-skill-chip">{sk}</span>)}
                            {!r.primarySkill && r.secondarySkills.length === 0 && <span style={{ color: "#94a3b8" }}>—</span>}
                          </div>
                        </td>
                        <td style={{ minWidth: 110 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div className="rc-bar-track" style={{ flex: 1 }}>
                              <div className="rc-bar-fill" style={{ width: `${Math.min(100, r.currentAllocationPercent)}%`, background: "#2563eb" }} />
                            </div>
                            <strong>{r.currentAllocationPercent}%</strong>
                          </div>
                        </td>
                        <td>
                          <span className={`rc-badge ${r.bucket === "BENCH" ? "rc-badge-green" : "rc-badge-amber"}`}>
                            {r.bucket === "BENCH" ? "Available Now" : `${r.availabilityPercent}% Free`}
                          </span>
                        </td>
                        <td>{r.bucket === "BENCH" ? `${formatShortDate(r.benchSince || r.createdAt)} (${r.benchDays}d)` : "—"}</td>
                        <td>
                          <span className={`rc-badge ${r.bucket === "BENCH" ? "rc-badge-blue" : "rc-badge-purple"}`}>
                            {r.bucket === "BENCH" ? "On Bench" : "Partial"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: 5 }}>
                            <button type="button" className="rc-btn rc-btn-outline rc-btn-sm" onClick={() => openStatusModal(r)}>Update Status</button>
                            <button type="button" className="rc-btn rc-btn-success rc-btn-sm" onClick={() => openQuickAllocate(r)}>Allocate</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="rc-grid-2">
          <div className="rc-card">
            <div className="rc-card-header"><h3 className="rc-card-title">Bench by Role</h3></div>
            {benchByRole.length === 0 ? (
              <div className="rc-empty">No resources currently on bench.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {benchByRole.map(([role, count]) => (
                  <div key={role}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}>
                      <span style={{ fontWeight: 600 }}>{role}</span>
                      <strong>{count}</strong>
                    </div>
                    <div className="rc-bar-track">
                      <div className="rc-bar-fill" style={{ width: `${Math.min(100, (count / Math.max(1, kpis.onBench)) * 100)}%`, background: "#2563eb" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rc-card">
            <div className="rc-card-header"><h3 className="rc-card-title">Bench Duration Distribution</h3></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {benchDurations.map((d) => (
                <div key={d.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: "#f8fafc", borderRadius: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: d.color }} />
                    <span style={{ fontWeight: 600 }}>{d.label}</span>
                  </div>
                  <strong>{d.count} resource(s)</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Allocate from Bench Modal (RES-006 Panel 6) */}
      {allocTarget && (
        <div className="rc-modal-backdrop" onClick={() => setAllocTarget(null)}>
          <div className="rc-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="rc-modal-header">
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Quick Allocate from Bench</h2>
              <button type="button" className="rc-btn rc-btn-ghost rc-btn-sm" onClick={() => setAllocTarget(null)}><X size={15} /></button>
            </div>
            <div className="rc-modal-body">
              <div className="rc-card" style={{ padding: 10, background: "#f8fafc", display: "flex", alignItems: "center", gap: 10 }}>
                <span className="rc-avatar">{getInitials(allocTarget.name)}</span>
                <div>
                  <strong>{allocTarget.name}</strong>
                  <div style={{ fontSize: 10.5, color: "#64748b" }}>{allocTarget.designationName} · Available: {allocTarget.availabilityPercent}%</div>
                </div>
              </div>
              <div className="rc-field">
                <label>Select Project *</label>
                <select className="rc-select" value={allocForm.projectId} onChange={(e) => setAllocForm({ ...allocForm, projectId: e.target.value })}>
                  <option value="">Select Project</option>
                  {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
                </select>
              </div>
              <div className="rc-grid-2">
                <div className="rc-field">
                  <label>Role in Project</label>
                  <input className="rc-input" value={allocForm.role} onChange={(e) => setAllocForm({ ...allocForm, role: e.target.value })} />
                </div>
                <div className="rc-field">
                  <label>Allocation Type</label>
                  <select className="rc-select" value={allocForm.allocationType} onChange={(e) => setAllocForm({ ...allocForm, allocationType: e.target.value as any })}>
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="HOURLY">Hourly</option>
                    <option value="CONTRACT">Contract</option>
                  </select>
                </div>
                <div className="rc-field">
                  <label>Start Date</label>
                  <input className="rc-input" type="date" value={allocForm.startDate} onChange={(e) => setAllocForm({ ...allocForm, startDate: e.target.value })} />
                </div>
                <div className="rc-field">
                  <label>Expected End Date</label>
                  <input className="rc-input" type="date" value={allocForm.endDate} onChange={(e) => setAllocForm({ ...allocForm, endDate: e.target.value })} />
                </div>
              </div>
              <div className="rc-field">
                <label>Allocation %: <strong>{allocForm.allocationPercent}%</strong></label>
                <input type="range" min={10} max={100} step={5} value={allocForm.allocationPercent} onChange={(e) => setAllocForm({ ...allocForm, allocationPercent: Number(e.target.value) })} />
              </div>
              <div className="rc-field">
                <label>Notes</label>
                <textarea className="rc-textarea" rows={2} value={allocForm.notes} onChange={(e) => setAllocForm({ ...allocForm, notes: e.target.value })} />
              </div>
            </div>
            <div className="rc-modal-footer">
              <button type="button" className="rc-btn rc-btn-outline" onClick={() => setAllocTarget(null)}>Cancel</button>
              <button type="button" className="rc-btn rc-btn-success" disabled={saving} onClick={handleQuickAllocate}>
                {saving ? "Allocating..." : "Confirm Allocation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Bench Status Modal (RES-006 Panel 5) */}
      {statusTarget && (
        <div className="rc-modal-backdrop" onClick={() => setStatusTarget(null)}>
          <div className="rc-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="rc-modal-header">
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Update Availability / Bench Status</h2>
              <button type="button" className="rc-btn rc-btn-ghost rc-btn-sm" onClick={() => setStatusTarget(null)}><X size={15} /></button>
            </div>
            <div className="rc-modal-body">
              <div className="rc-grid-2">
                <div className="rc-field">
                  <label>Availability Status</label>
                  <select className="rc-select" value={statusForm.status} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value as any })}>
                    <option value="BENCH">On Bench</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div className="rc-field">
                  <label>Available From</label>
                  <input className="rc-input" type="date" value={statusForm.availableFrom} onChange={(e) => setStatusForm({ ...statusForm, availableFrom: e.target.value })} />
                </div>
                <div className="rc-field">
                  <label>Expected Allocation Date</label>
                  <input className="rc-input" type="date" value={statusForm.expectedAllocationDate} onChange={(e) => setStatusForm({ ...statusForm, expectedAllocationDate: e.target.value })} />
                </div>
                <div className="rc-field">
                  <label>Bench Reason</label>
                  <input className="rc-input" value={statusForm.benchReason} onChange={(e) => setStatusForm({ ...statusForm, benchReason: e.target.value })} placeholder="e.g. Project completed" />
                </div>
              </div>
              <div className="rc-field">
                <label>Notes</label>
                <textarea className="rc-textarea" rows={3} value={statusForm.availabilityNotes} onChange={(e) => setStatusForm({ ...statusForm, availabilityNotes: e.target.value })} />
              </div>
            </div>
            <div className="rc-modal-footer">
              <button type="button" className="rc-btn rc-btn-outline" onClick={() => setStatusTarget(null)}>Cancel</button>
              <button type="button" className="rc-btn rc-btn-primary" disabled={saving} onClick={handleUpdateBenchStatus}>
                {saving ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
