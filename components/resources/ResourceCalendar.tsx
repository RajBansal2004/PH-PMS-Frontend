"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  resourceApi,
  allocationApi,
  leaveApi,
  lookupApi,
  ResourceItem,
  AllocationItem,
  LeaveItem,
  ProjectLite,
  DepartmentLite,
  formatShortDate,
  getInitials,
} from "@/lib/resources/api";
import "@/components/resources/resource-capacity.css";

function getWeekDays(anchor: Date) {
  const d = new Date(anchor);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // start on Mon
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    return {
      date: dt,
      iso: dt.toISOString().slice(0, 10),
      dayName: dt.toLocaleDateString("en-US", { weekday: "short" }),
      dayNum: dt.getDate(),
      monthShort: dt.toLocaleDateString("en-US", { month: "short" }),
      startMs: new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0).getTime(),
      endMs: new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 23, 59, 59).getTime(),
      isWeekend: dt.getDay() === 0 || dt.getDay() === 6,
    };
  });
}

function dayOverlaps(startStr: string | null, endStr: string | null, dayStart: number, dayEnd: number) {
  if (!startStr && !endStr) return false;
  const s = startStr ? new Date(startStr).getTime() : 0;
  const e = endStr ? new Date(endStr).getTime() : s + 86400000;
  return s <= dayEnd && e >= dayStart;
}

const EVENT_COLORS: Record<string, { bg: string; text: string }> = {
  ALLOCATION: { bg: "#dbeafe", text: "#1e40af" },
  LEAVE: { bg: "#fee2e2", text: "#991b1b" },
  MEETING: { bg: "#fef9c3", text: "#854d0e" },
  TRAINING: { bg: "#ede9fe", text: "#5b21b6" },
  OTHER: { bg: "#dcfce7", text: "#166534" },
};

export default function ResourceCalendar() {
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "availability">("calendar");
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [projects, setProjects] = useState<ProjectLite[]>([]);
  const [departments, setDepartments] = useState<DepartmentLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [showAllocations, setShowAllocations] = useState(true);
  const [showLeaves, setShowLeaves] = useState(true);
  const [showTraining, setShowTraining] = useState(true);
  const [showMeetings, setShowMeetings] = useState(true);

  // Selected event modal (RES-005 Panel 3)
  const [selectedEvent, setSelectedEvent] = useState<{ kind: "alloc" | "leave"; item: any; resourceName: string } | null>(null);

  // Add event modal (RES-005 Panel 2)
  const [showAddModal, setShowAddModal] = useState(false);
  const [eventTab, setEventTab] = useState<"ALLOCATION" | "LEAVE" | "MEETING" | "TRAINING">("ALLOCATION");
  const [saving, setSaving] = useState(false);
  const [eventForm, setEventForm] = useState({
    employeeId: "",
    projectId: "",
    taskActivity: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    allocationPercent: 50,
    leaveType: "Casual Leave",
    notes: "",
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resList, allocList, leaveList, projList, deptList] = await Promise.all([
        resourceApi.list(),
        allocationApi.list(),
        leaveApi.list().catch(() => []),
        lookupApi.projects().catch(() => []),
        lookupApi.departments().catch(() => []),
      ]);
      setResources(resList);
      setAllocations(allocList);
      setLeaves(leaveList);
      setProjects(projList);
      setDepartments(deptList);
    } catch (e: any) {
      setError(e?.message || "Failed to load resource calendar");
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

  const days = useMemo(() => getWeekDays(anchorDate), [anchorDate]);
  const weekRangeLabel = `${days[0].dayNum} ${days[0].monthShort} – ${days[6].dayNum} ${days[6].monthShort} ${days[6].date.getFullYear()}`;

  const shiftWeek = (delta: number) => {
    setAnchorDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + delta * 7));
  };

  const filteredResources = useMemo(() => {
    const q = search.trim().toLowerCase();
    return resources.filter((r) => {
      if (deptFilter !== "ALL" && r.departmentId !== deptFilter) return false;
      if (q && !`${r.name} ${r.designationName} ${r.departmentName} ${r.primarySkill}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [resources, deptFilter, search]);

  const handleSaveEvent = async () => {
    if (!eventForm.employeeId) {
      setError("Please select a resource.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (eventTab === "LEAVE") {
        const s = new Date(eventForm.startDate);
        const e = new Date(eventForm.endDate);
        const diffDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
        await leaveApi.create({
          employeeId: eventForm.employeeId,
          leaveType: eventForm.leaveType,
          startDate: eventForm.startDate,
          endDate: eventForm.endDate,
          days: diffDays,
          reason: eventForm.notes || eventForm.leaveType,
          status: "APPROVED",
        });
        flash("Leave logged on resource calendar.");
      } else {
        const projId = eventForm.projectId || projects[0]?._id;
        if (!projId) {
          setError("Please select a project.");
          setSaving(false);
          return;
        }
        await allocationApi.create({
          employeeId: eventForm.employeeId,
          projectId: projId,
          role: eventForm.taskActivity || (eventTab === "TRAINING" ? "Training" : eventTab === "MEETING" ? "Meeting" : "Developer"),
          activityType: eventTab,
          taskActivity: eventForm.taskActivity,
          startDate: eventForm.startDate,
          endDate: eventForm.endDate,
          allocationPercent: Number(eventForm.allocationPercent || 50),
          status: "ACTIVE",
          notes: eventForm.notes,
        });
        flash("Event added to resource calendar.");
      }
      setShowAddModal(false);
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Failed to save calendar event");
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
          <span style={{ color: "#0f172a", fontWeight: 600 }}>Resource Calendar</span>
        </div>
        <div className="rc-header">
          <div>
            <h1 className="rc-title">Resource Calendar</h1>
            <p className="rc-subtitle">View and manage resource availability, project allocations, meetings, and leaves across the team.</p>
          </div>
          <div className="rc-header-actions">
            <button type="button" className="rc-btn rc-btn-outline rc-btn-sm" onClick={() => setAnchorDate(new Date())}>Today</button>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 7, padding: "2px 6px" }}>
              <button type="button" className="rc-btn rc-btn-ghost rc-btn-sm" onClick={() => shiftWeek(-1)}><ChevronLeft size={13} /></button>
              <span style={{ fontSize: 11.5, fontWeight: 700, minWidth: 140, textAlign: "center" }}>{weekRangeLabel}</span>
              <button type="button" className="rc-btn rc-btn-ghost rc-btn-sm" onClick={() => shiftWeek(1)}><ChevronRight size={13} /></button>
            </div>
            <div className="rc-seg">
              <button type="button" className={`rc-seg-btn ${viewMode === "calendar" ? "active" : ""}`} onClick={() => setViewMode("calendar")}>Schedule</button>
              <button type="button" className={`rc-seg-btn ${viewMode === "availability" ? "active" : ""}`} onClick={() => setViewMode("availability")}>Availability %</button>
            </div>
            <button type="button" className="rc-btn rc-btn-outline" onClick={loadData} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
            <button type="button" className="rc-btn rc-btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={14} /> New Allocation / Event
            </button>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="rc-subnav">
        <Link href="/resources" className="rc-subnav-link">Resource Directory</Link>
        <Link href="/resources/new" className="rc-subnav-link">Add New Resource</Link>
        <Link href="/resources/allocate" className="rc-subnav-link">Project Allocation</Link>
        <Link href="/resources/planner" className="rc-subnav-link">Allocation Planner</Link>
        <Link href="/resources/calendar" className="rc-subnav-link active">Resource Calendar</Link>
        <Link href="/resources/bench" className="rc-subnav-link">Bench &amp; Availability</Link>
      </div>

      {notice && <div className="rc-alert rc-alert-healthy"><CheckCircle2 size={14} /> <span>{notice}</span></div>}
      {error && <div className="rc-alert rc-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* Filter Bar */}
      <div className="rc-filter-bar">
        <div className="rc-search-wrap">
          <Search size={13} className="rc-search-icon" />
          <input className="rc-input rc-search-input" placeholder="Search resource..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="rc-select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="ALL">All Departments</option>
          {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
        <select className="rc-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="ALL">All Projects</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
        </select>
      </div>

      {/* Main Calendar + Right Quick Filters Sidebar matching RES-005 Panel 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 12, alignItems: "start" }}>
        <div className="rc-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 165 }}>Resource</th>
                  {days.map((d) => (
                    <th key={d.iso} style={{ textAlign: "center", minWidth: 105, background: d.isWeekend ? "#f1f5f9" : undefined }}>
                      <div>{d.dayName}</div>
                      <div style={{ fontSize: 10, fontWeight: 500, color: "#64748b" }}>{d.dayNum} {d.monthShort}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && filteredResources.length === 0 ? (
                  <tr><td colSpan={8} className="rc-empty">Loading calendar schedule...</td></tr>
                ) : filteredResources.length === 0 ? (
                  <tr><td colSpan={8} className="rc-empty">No resources found.</td></tr>
                ) : (
                  filteredResources.map((r) => {
                    const empAllocs = allocations.filter(
                      (a) =>
                        a.employeeId === r.employeeId &&
                        !["CANCELLED", "RELEASED"].includes(a.status) &&
                        (projectFilter === "ALL" || a.projectId === projectFilter)
                    );
                    const empLeaves = leaves.filter((l) => String(l.employeeId) === r.employeeId);

                    return (
                      <tr key={r.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="rc-avatar">{getInitials(r.name)}</span>
                            <div>
                              <Link href={`/resources/${r.id}`} style={{ fontWeight: 600, color: "#0f172a", textDecoration: "none" }}>{r.name}</Link>
                              <div style={{ fontSize: 10, color: "#64748b" }}>{r.designationName}</div>
                            </div>
                          </div>
                        </td>
                        {days.map((d) => {
                          const dayAllocs = empAllocs.filter((a) => {
                            if (!dayOverlaps(a.startDate, a.endDate, d.startMs, d.endMs)) return false;
                            if (a.activityType === "TRAINING" && !showTraining) return false;
                            if (a.activityType === "MEETING" && !showMeetings) return false;
                            if ((a.activityType === "ALLOCATION" || !a.activityType) && !showAllocations) return false;
                            return true;
                          });
                          const dayLeaves = showLeaves
                            ? empLeaves.filter((l) => dayOverlaps(l.startDate, l.endDate || l.startDate, d.startMs, d.endMs))
                            : [];

                          if (viewMode === "availability") {
                            const pct = d.isWeekend ? 0 : dayAllocs.reduce((s, a) => s + a.allocationPercent, 0);
                            const cls =
                              d.isWeekend || pct === 0
                                ? "rc-heat-0"
                                : pct <= 50
                                ? "rc-heat-low"
                                : pct <= 75
                                ? "rc-heat-opt"
                                : pct <= 100
                                ? "rc-heat-high"
                                : "rc-heat-over";
                            return (
                              <td key={d.iso} style={{ padding: 4, background: d.isWeekend ? "#f8fafc" : undefined }}>
                                <div className={`rc-heat-cell ${dayLeaves.length ? "rc-heat-over" : cls}`}>
                                  {dayLeaves.length ? "Leave" : `${pct}%`}
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={d.iso} style={{ padding: "5px 4px", verticalAlign: "top", background: d.isWeekend ? "#f8fafc" : undefined }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                {dayLeaves.map((lv) => (
                                  <button
                                    key={lv._id}
                                    type="button"
                                    onClick={() => setSelectedEvent({ kind: "leave", item: lv, resourceName: r.name })}
                                    style={{
                                      border: "none",
                                      borderRadius: 5,
                                      padding: "3px 6px",
                                      background: EVENT_COLORS.LEAVE.bg,
                                      color: EVENT_COLORS.LEAVE.text,
                                      fontSize: 10,
                                      fontWeight: 600,
                                      textAlign: "left",
                                      cursor: "pointer",
                                    }}
                                  >
                                    {lv.leaveType || "Leave"}
                                  </button>
                                ))}
                                {!d.isWeekend &&
                                  dayAllocs.map((a) => {
                                    const tone = EVENT_COLORS[a.activityType || "ALLOCATION"] || EVENT_COLORS.ALLOCATION;
                                    return (
                                      <button
                                        key={a.id}
                                        type="button"
                                        onClick={() => setSelectedEvent({ kind: "alloc", item: a, resourceName: r.name })}
                                        style={{
                                          border: "none",
                                          borderRadius: 5,
                                          padding: "3px 6px",
                                          background: tone.bg,
                                          color: tone.text,
                                          fontSize: 10,
                                          fontWeight: 600,
                                          textAlign: "left",
                                          cursor: "pointer",
                                          whiteSpace: "nowrap",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          maxWidth: 112,
                                        }}
                                        title={`${a.projectName} (${a.allocationPercent}%)`}
                                      >
                                        {a.taskActivity || a.projectName}
                                      </button>
                                    );
                                  })}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar: Quick Filters & Legend */}
        <div className="rc-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <h3 className="rc-card-title" style={{ marginBottom: 8 }}>Quick Filters</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                <input type="checkbox" checked={showAllocations} onChange={(e) => setShowAllocations(e.target.checked)} />
                Show Allocations
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                <input type="checkbox" checked={showLeaves} onChange={(e) => setShowLeaves(e.target.checked)} />
                Show Leaves
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                <input type="checkbox" checked={showTraining} onChange={(e) => setShowTraining(e.target.checked)} />
                Show Training
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                <input type="checkbox" checked={showMeetings} onChange={(e) => setShowMeetings(e.target.checked)} />
                Show Meetings
              </label>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
            <h3 className="rc-card-title" style={{ marginBottom: 8 }}>Legend</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
              {[
                { label: "Project Allocation", color: "#2563eb" },
                { label: "Meeting", color: "#eab308" },
                { label: "Training", color: "#7c3aed" },
                { label: "Leave", color: "#dc2626" },
              ].map((lg) => (
                <div key={lg.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: lg.color }} />
                  <span>{lg.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Event Detail Modal (RES-005 Panel 3) */}
      {selectedEvent && (
        <div className="rc-modal-backdrop" onClick={() => setSelectedEvent(null)}>
          <div className="rc-modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="rc-modal-header">
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
                {selectedEvent.kind === "leave" ? selectedEvent.item.leaveType || "Leave Details" : selectedEvent.item.projectName}
              </h2>
              <button type="button" className="rc-btn rc-btn-ghost rc-btn-sm" onClick={() => setSelectedEvent(null)}><X size={15} /></button>
            </div>
            <div className="rc-modal-body" style={{ fontSize: 12 }}>
              <div><span style={{ color: "#64748b" }}>Resource:</span> <strong>{selectedEvent.resourceName}</strong></div>
              {selectedEvent.kind === "alloc" ? (
                <>
                  <div><span style={{ color: "#64748b" }}>Project:</span> <strong>{selectedEvent.item.projectName}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Role / Activity:</span> <strong>{selectedEvent.item.taskActivity || selectedEvent.item.role}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Allocation:</span> <strong>{selectedEvent.item.allocationPercent}% ({selectedEvent.item.allocatedHours}h)</strong></div>
                  <div><span style={{ color: "#64748b" }}>Duration:</span> <strong>{formatShortDate(selectedEvent.item.startDate)} – {formatShortDate(selectedEvent.item.endDate)}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Status:</span> <span className="rc-badge rc-badge-green">{selectedEvent.item.status}</span></div>
                  {selectedEvent.item.notes && <div><span style={{ color: "#64748b" }}>Notes:</span> {selectedEvent.item.notes}</div>}
                </>
              ) : (
                <>
                  <div><span style={{ color: "#64748b" }}>Leave Type:</span> <strong>{selectedEvent.item.leaveType}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Dates:</span> <strong>{formatShortDate(selectedEvent.item.startDate)} – {formatShortDate(selectedEvent.item.endDate)}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Days:</span> <strong>{selectedEvent.item.days || 1}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Status:</span> <span className="rc-badge rc-badge-amber">{selectedEvent.item.status}</span></div>
                  {selectedEvent.item.reason && <div><span style={{ color: "#64748b" }}>Reason:</span> {selectedEvent.item.reason}</div>}
                </>
              )}
            </div>
            <div className="rc-modal-footer">
              <button type="button" className="rc-btn rc-btn-outline" onClick={() => setSelectedEvent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Event / Allocation Modal (RES-005 Panel 2) */}
      {showAddModal && (
        <div className="rc-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="rc-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="rc-modal-header">
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Add Event / Allocation</h2>
              <button type="button" className="rc-btn rc-btn-ghost rc-btn-sm" onClick={() => setShowAddModal(false)}><X size={15} /></button>
            </div>
            <div className="rc-modal-body">
              <div className="rc-seg" style={{ width: "fit-content" }}>
                {(["ALLOCATION", "LEAVE", "MEETING", "TRAINING"] as const).map((t) => (
                  <button key={t} type="button" className={`rc-seg-btn ${eventTab === t ? "active" : ""}`} onClick={() => setEventTab(t)}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              <div className="rc-field">
                <label>Resource *</label>
                <select className="rc-select" value={eventForm.employeeId} onChange={(e) => setEventForm({ ...eventForm, employeeId: e.target.value })}>
                  <option value="">Select Resource</option>
                  {resources.map((r) => <option key={r.id} value={r.employeeId}>{r.name} ({r.designationName})</option>)}
                </select>
              </div>

              {eventTab !== "LEAVE" ? (
                <>
                  <div className="rc-field">
                    <label>Project *</label>
                    <select className="rc-select" value={eventForm.projectId} onChange={(e) => setEventForm({ ...eventForm, projectId: e.target.value })}>
                      <option value="">Select Project</option>
                      {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
                    </select>
                  </div>
                  <div className="rc-grid-2">
                    <div className="rc-field">
                      <label>Task / Activity</label>
                      <input className="rc-input" value={eventForm.taskActivity} onChange={(e) => setEventForm({ ...eventForm, taskActivity: e.target.value })} placeholder="e.g. Sprint Planning, API Dev" />
                    </div>
                    <div className="rc-field">
                      <label>Allocation %</label>
                      <input className="rc-input" type="number" min={10} max={100} value={eventForm.allocationPercent} onChange={(e) => setEventForm({ ...eventForm, allocationPercent: Number(e.target.value || 50) })} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="rc-field">
                  <label>Leave Type</label>
                  <select className="rc-select" value={eventForm.leaveType} onChange={(e) => setEventForm({ ...eventForm, leaveType: e.target.value })}>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Earned Leave">Earned Leave</option>
                    <option value="Work From Home">Work From Home</option>
                  </select>
                </div>
              )}

              <div className="rc-grid-2">
                <div className="rc-field">
                  <label>Start Date *</label>
                  <input className="rc-input" type="date" value={eventForm.startDate} onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })} />
                </div>
                <div className="rc-field">
                  <label>End Date *</label>
                  <input className="rc-input" type="date" value={eventForm.endDate} onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })} />
                </div>
              </div>

              <div className="rc-field">
                <label>Notes</label>
                <textarea className="rc-textarea" rows={2} value={eventForm.notes} onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })} />
              </div>
            </div>
            <div className="rc-modal-footer">
              <button type="button" className="rc-btn rc-btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="button" className="rc-btn rc-btn-primary" disabled={saving} onClick={handleSaveEvent}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
