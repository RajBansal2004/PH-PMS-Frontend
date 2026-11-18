"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  FileClock,
  Layers,
  Plus,
  Save,
  Send,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  timesheetApi,
  tsLookupApi,
  TimesheetDoc,
  WORK_TYPES,
  WorkType,
  getMondayOfWeek,
  shiftWeekMonday,
  getWeekDates,
  formatWeekRange,
  formatShortDate,
  formatStatusLabel,
  statusBadgeClass,
} from "@/lib/timesheets/api";
import "@/components/timesheets/timesheets.css";

type GridRow = {
  key: string;
  projectId: string;
  projectName: string;
  taskTitle: string;
  workType: WorkType;
  billable: boolean;
  hoursByDate: Record<string, number>;
};

export default function WeeklyTimesheetPage() {
  const [weekMonday, setWeekMonday] = useState(() => getMondayOfWeek());
  const [viewMode, setViewMode] = useState<"grid" | "calendar" | "status">("grid");
  const [timesheet, setTimesheet] = useState<TimesheetDoc | null>(null);
  const [projects, setProjects] = useState<{ _id: string; projectName: string }[]>([]);
  const [rows, setRows] = useState<GridRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [comments, setComments] = useState("");

  const weekDays = useMemo(() => getWeekDates(weekMonday), [weekMonday]);

  const hydrateRows = (ts: TimesheetDoc | null, days: { iso: string }[]) => {
    const entries = ts?.dailyEntries || [];
    const grouped = new Map<string, GridRow>();

    entries.forEach((e) => {
      const k = `${e.projectId || e.projectName}__${e.taskTitle || e.workType}__${e.billable ? "1" : "0"}`;
      if (!grouped.has(k)) {
        const hoursByDate: Record<string, number> = {};
        days.forEach((d) => (hoursByDate[d.iso] = 0));
        grouped.set(k, {
          key: k,
          projectId: e.projectId ? String(e.projectId) : "",
          projectName: e.projectName || "General / Internal",
          taskTitle: e.taskTitle || e.workType || "Work",
          workType: (e.workType || "Development") as WorkType,
          billable: e.billable !== false,
          hoursByDate,
        });
      }
      const row = grouped.get(k)!;
      if (e.date in row.hoursByDate) {
        row.hoursByDate[e.date] = Math.round((row.hoursByDate[e.date] + Number(e.hours || 0)) * 100) / 100;
      }
    });

    setRows(Array.from(grouped.values()));
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [myRes, projList] = await Promise.all([
        timesheetApi.getMy({ weekStart: weekMonday }),
        tsLookupApi.projects().catch(() => []),
      ]);
      setTimesheet(myRes.timesheet);
      setProjects(projList);
      hydrateRows(myRes.timesheet, getWeekDates(weekMonday));
    } catch (e: any) {
      setError(e?.message || "Failed to load weekly timesheet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [weekMonday]);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const isLocked = timesheet?.status === "LOCKED" || timesheet?.status === "APPROVED";

  const addRow = () => {
    const firstProj = projects[0];
    const hoursByDate: Record<string, number> = {};
    weekDays.forEach((d) => (hoursByDate[d.iso] = 0));
    setRows((prev) => [
      ...prev,
      {
        key: `row-${Date.now()}-${Math.random()}`,
        projectId: firstProj?._id || "",
        projectName: firstProj?.projectName || "General / Internal",
        taskTitle: "Development",
        workType: "Development",
        billable: true,
        hoursByDate,
      },
    ]);
  };

  const updateRowField = (idx: number, patch: Partial<GridRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const updateCell = (idx: number, dateIso: string, val: string) => {
    const num = Math.max(0, Math.min(24, Number(val || 0)));
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, hoursByDate: { ...r.hoursByDate, [dateIso]: Number.isNaN(num) ? 0 : num } } : r))
    );
  };

  const totals = useMemo(() => {
    const byDay: Record<string, number> = {};
    weekDays.forEach((d) => (byDay[d.iso] = 0));
    let total = 0;
    let billable = 0;
    let entryCount = 0;

    rows.forEach((r) => {
      weekDays.forEach((d) => {
        const h = Number(r.hoursByDate[d.iso] || 0);
        if (h > 0) {
          byDay[d.iso] = Math.round((byDay[d.iso] + h) * 100) / 100;
          total += h;
          if (r.billable) billable += h;
          entryCount += 1;
        }
      });
    });

    return {
      byDay,
      total: Math.round(total * 100) / 100,
      billable: Math.round(billable * 100) / 100,
      nonBillable: Math.round(Math.max(0, total - billable) * 100) / 100,
      entryCount,
    };
  }, [rows, weekDays]);

  const handleSaveGrid = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await timesheetApi.saveWeeklyGrid({
        weekStart: weekMonday,
        rows,
      });
      setTimesheet(saved);
      hydrateRows(saved, weekDays);
      flash("Weekly timesheet saved.");
      return saved;
    } catch (e: any) {
      setError(e?.message || "Failed to save weekly timesheet");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndSubmit = async () => {
    const saved = await handleSaveGrid();
    if (!saved?._id) return;
    setSaving(true);
    setError(null);
    try {
      const submitted = await timesheetApi.submit(saved._id, comments);
      setTimesheet(submitted);
      setComments("");
      flash("Weekly timesheet submitted for manager approval.");
    } catch (e: any) {
      setError(e?.message || "Failed to submit timesheet");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ts-page">
      {/* Header */}
      <div>
        <div className="ts-breadcrumb">
          <Link href="/timesheets">Timesheets</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Weekly Timesheet</span>
        </div>
        <div className="ts-header">
          <div>
            <h1 className="ts-title">Weekly Timesheet</h1>
            <p className="ts-subtitle">Enter and update hours across Monday–Sunday in a single editable matrix and submit for review.</p>
          </div>
          <div className="ts-actions">
            <div className="ts-week-nav">
              <button type="button" className="ts-btn ts-btn-ghost ts-btn-sm" onClick={() => setWeekMonday(shiftWeekMonday(weekMonday, -1))}><ChevronLeft size={13} /></button>
              <span className="ts-week-label">{formatWeekRange(weekMonday)}</span>
              <button type="button" className="ts-btn ts-btn-ghost ts-btn-sm" onClick={() => setWeekMonday(shiftWeekMonday(weekMonday, 1))}><ChevronRight size={13} /></button>
            </div>
            <div className="ts-seg">
              <button type="button" className={`ts-seg-btn ${viewMode === "grid" ? "active" : ""}`} onClick={() => setViewMode("grid")}>Weekly Grid</button>
              <button type="button" className={`ts-seg-btn ${viewMode === "calendar" ? "active" : ""}`} onClick={() => setViewMode("calendar")}>Calendar View</button>
              <button type="button" className={`ts-seg-btn ${viewMode === "status" ? "active" : ""}`} onClick={() => setViewMode("status")}>Approval Status</button>
            </div>
            <button type="button" className="ts-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="ts-subnav">
        <Link href="/timesheets" className="ts-subnav-link">My Timesheet</Link>
        <Link href="/timesheets/new" className="ts-subnav-link">Add Time Entry</Link>
        <Link href="/timesheets/weekly" className="ts-subnav-link active">Weekly Timesheet</Link>
        <Link href="/timesheets/team" className="ts-subnav-link">Team Timesheets</Link>
        <Link href="/timesheets/approvals" className="ts-subnav-link">Timesheet Approvals</Link>
        <Link href="/timesheets/analytics" className="ts-subnav-link">Timesheet Analytics</Link>
      </div>

      {notice && <div className="ts-alert ts-alert-healthy"><CheckCircle2 size={14} /> <span>{notice}</span></div>}
      {error && <div className="ts-alert ts-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* 5-KPI Strip (TIME-003 Panel 1) */}
      <div className="ts-kpi-grid">
        <div className="ts-kpi">
          <div className="ts-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><Clock size={15} /></div>
          <div><span className="ts-kpi-label">Total Hours</span><span className="ts-kpi-val">{totals.total.toFixed(1)} / 40.0</span></div>
        </div>
        <div className="ts-kpi">
          <div className="ts-kpi-icon" style={{ background: "#ecfdf5", color: "#079b62" }}><CheckCircle2 size={15} /></div>
          <div><span className="ts-kpi-label">Billable Hours</span><span className="ts-kpi-val">{totals.billable.toFixed(1)}h</span></div>
        </div>
        <div className="ts-kpi">
          <div className="ts-kpi-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}><FileClock size={15} /></div>
          <div><span className="ts-kpi-label">Non-Billable</span><span className="ts-kpi-val">{totals.nonBillable.toFixed(1)}h</span></div>
        </div>
        <div className="ts-kpi">
          <div className="ts-kpi-icon" style={{ background: "#fffbeb", color: "#d97706" }}><Layers size={15} /></div>
          <div><span className="ts-kpi-label">Daily Entries</span><span className="ts-kpi-val">{totals.entryCount}</span></div>
        </div>
        <div className="ts-kpi">
          <div>
            <span className="ts-kpi-label">Status</span>
            <div style={{ marginTop: 3 }}>
              <span className={statusBadgeClass(timesheet?.status)}>{formatStatusLabel(timesheet?.status)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW 1: EDITABLE WEEKLY GRID */}
      {viewMode === "grid" && (
        <div className="ts-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid #e3eaf4", flexWrap: "wrap", gap: 8 }}>
            <h3 className="ts-card-title">Editable Weekly Matrix ({formatWeekRange(weekMonday)})</h3>
            {!isLocked && (
              <div style={{ display: "flex", gap: 7 }}>
                <button type="button" className="ts-btn ts-btn-sm" onClick={addRow}><Plus size={12} /> Add Row</button>
                <button type="button" className="ts-btn ts-btn-primary ts-btn-sm" disabled={saving} onClick={handleSaveGrid}>
                  <Save size={12} /> {saving ? "Saving..." : "Save Draft"}
                </button>
              </div>
            )}
          </div>

          <div className="ts-table-wrap">
            <table className="ts-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 165 }}>Project</th>
                  <th style={{ minWidth: 145 }}>Task / Activity</th>
                  <th>Billable</th>
                  {weekDays.map((d) => (
                    <th key={d.iso} style={{ textAlign: "center" }}>
                      <div>{d.dayShort}</div>
                      <div style={{ fontSize: 9.5, fontWeight: 500, color: "#94a3b8" }}>{d.dayNum} {d.monthShort}</div>
                    </th>
                  ))}
                  <th style={{ textAlign: "center" }}>Total</th>
                  {!isLocked && <th></th>}
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  <tr><td colSpan={12} className="ts-empty">Loading weekly matrix...</td></tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="ts-empty">
                      No rows for this week yet. Click <strong>+ Add Row</strong> to enter weekly hours.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => {
                    const rowSum = weekDays.reduce((s, d) => s + Number(r.hoursByDate[d.iso] || 0), 0);
                    return (
                      <tr key={r.key}>
                        <td>
                          <select
                            className="ts-select"
                            style={{ width: "100%" }}
                            disabled={isLocked}
                            value={r.projectId}
                            onChange={(e) => {
                              const p = projects.find((x) => x._id === e.target.value);
                              updateRowField(idx, {
                                projectId: e.target.value,
                                projectName: p?.projectName || "General / Internal",
                              });
                            }}
                          >
                            <option value="">General / Internal</option>
                            {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
                          </select>
                        </td>
                        <td>
                          <input
                            className="ts-input"
                            style={{ width: "100%" }}
                            disabled={isLocked}
                            value={r.taskTitle}
                            onChange={(e) => updateRowField(idx, { taskTitle: e.target.value })}
                            placeholder="Task or activity"
                          />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            disabled={isLocked}
                            checked={r.billable}
                            onChange={(e) => updateRowField(idx, { billable: e.target.checked })}
                          />
                        </td>
                        {weekDays.map((d) => (
                          <td key={d.iso} style={{ textAlign: "center", padding: "6px 4px" }}>
                            <input
                              className="ts-hour-input"
                              type="number"
                              step={0.5}
                              min={0}
                              max={24}
                              disabled={isLocked}
                              value={r.hoursByDate[d.iso] || ""}
                              placeholder="0"
                              onChange={(e) => updateCell(idx, d.iso, e.target.value)}
                            />
                          </td>
                        ))}
                        <td style={{ textAlign: "center", fontWeight: 700, color: "#0755e9" }}>{rowSum.toFixed(1)}h</td>
                        {!isLocked && (
                          <td>
                            <button
                              type="button"
                              className="ts-btn ts-btn-danger ts-btn-sm"
                              onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              <Trash2 size={11} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr style={{ background: "#f8fafd", fontWeight: 700 }}>
                    <td colSpan={3} style={{ padding: "9px 10px" }}>Total Hours</td>
                    {weekDays.map((d) => (
                      <td key={d.iso} style={{ textAlign: "center", padding: "9px 4px" }}>
                        {(totals.byDay[d.iso] || 0).toFixed(1)}
                      </td>
                    ))}
                    <td style={{ textAlign: "center", color: "#0755e9" }}>{totals.total.toFixed(1)}h</td>
                    {!isLocked && <td />}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {!isLocked && rows.length > 0 && (
            <div style={{ padding: "12px 14px", borderTop: "1px solid #e3eaf4", background: "#fafcff", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <input
                className="ts-input"
                style={{ flex: 1, minWidth: 220 }}
                placeholder="Optional comments for manager before submitting..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="ts-btn" disabled={saving} onClick={handleSaveGrid}>
                  <Save size={12} /> Save Draft
                </button>
                <button type="button" className="ts-btn ts-btn-success" disabled={saving || totals.total === 0} onClick={handleSaveAndSubmit}>
                  <Send size={12} /> Save &amp; Submit for Approval
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: WEEKLY CALENDAR VIEW (TIME-003 Panel 3) */}
      {viewMode === "calendar" && (
        <div className="ts-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(125px, 1fr))", overflowX: "auto" }}>
            {weekDays.map((d) => {
              const dayEntries = (timesheet?.dailyEntries || []).filter((e) => e.date === d.iso);
              return (
                <div key={d.iso} style={{ borderRight: "1px solid #e3eaf4", minHeight: 240, display: "flex", flexDirection: "column" }}>
                  <div style={{ padding: "8px 10px", background: "#f8fafd", borderBottom: "1px solid #e3eaf4", textAlign: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 11 }}>{d.dayShort}</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>{d.dayNum} {d.monthShort}</div>
                  </div>
                  <div style={{ padding: 7, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                    {dayEntries.length === 0 ? (
                      <div style={{ fontSize: 10, color: "#cbd5e1", textAlign: "center", marginTop: 20 }}>No entries</div>
                    ) : (
                      dayEntries.map((en, i) => (
                        <div
                          key={en._id || i}
                          style={{
                            padding: "6px 7px",
                            borderRadius: 6,
                            background: en.billable ? "#eef5ff" : "#fffbeb",
                            border: `1px solid ${en.billable ? "#bfdbfe" : "#fde68a"}`,
                            fontSize: 10,
                          }}
                        >
                          <div style={{ fontWeight: 700, color: "#10204a" }}>{en.projectName}</div>
                          <div style={{ color: "#475569" }}>{en.taskTitle || en.workType}</div>
                          <div style={{ fontWeight: 700, color: en.billable ? "#0755e9" : "#b45309", marginTop: 2 }}>{en.hours}h</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: APPROVAL STATUS & AUDIT LOG (TIME-003 Panel 6) */}
      {viewMode === "status" && (
        <div className="ts-grid-2">
          <div className="ts-card">
            <div className="ts-card-head">
              <h3 className="ts-card-title">Approval Workflow Status</h3>
              <span className={statusBadgeClass(timesheet?.status)}>{formatStatusLabel(timesheet?.status)}</span>
            </div>
            <div className="ts-timeline">
              {[
                { label: "Submitted", done: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "LOCKED"].includes(timesheet?.status || ""), meta: timesheet?.submittedAt ? formatShortDate(timesheet.submittedAt) : "Not submitted" },
                { label: "Under Manager Review", active: timesheet?.status === "SUBMITTED" || timesheet?.status === "UNDER_REVIEW", done: ["APPROVED", "LOCKED"].includes(timesheet?.status || ""), meta: "PM / Team Lead review" },
                { label: "Approved", done: ["APPROVED", "LOCKED"].includes(timesheet?.status || ""), rejected: timesheet?.status === "REJECTED" || timesheet?.status === "CHANGES_REQUESTED", meta: timesheet?.approvedAt ? `By ${timesheet.approvedByName || "Manager"} on ${formatShortDate(timesheet.approvedAt)}` : timesheet?.rejectionReason || "Pending" },
                { label: "Locked (Final)", done: timesheet?.status === "LOCKED", meta: timesheet?.lockedAt ? formatShortDate(timesheet.lockedAt) : "Unlocked" },
              ].map((st, idx) => (
                <div key={st.label} className="ts-tl-step">
                  <span className={`ts-tl-dot ${st.rejected ? "rejected" : st.done ? "done" : st.active ? "active" : ""}`}>{idx + 1}</span>
                  <div>
                    <div style={{ fontWeight: 700 }}>{st.label}</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>{st.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ts-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4" }}>
              <h3 className="ts-card-title">Audit Trail</h3>
            </div>
            <div className="ts-table-wrap">
              <table className="ts-table">
                <thead><tr><th>Date</th><th>Action</th><th>By</th><th>Details</th></tr></thead>
                <tbody>
                  {(timesheet?.auditLog || []).length === 0 ? (
                    <tr><td colSpan={4} className="ts-empty">No activity recorded yet.</td></tr>
                  ) : (
                    [...(timesheet?.auditLog || [])].reverse().map((al, i) => (
                      <tr key={al._id || i}>
                        <td style={{ whiteSpace: "nowrap" }}>{formatShortDate(al.timestamp)}</td>
                        <td><span className="ts-badge ts-badge-slate">{al.action}</span></td>
                        <td>{al.byName}</td>
                        <td style={{ color: "#475569" }}>{al.comments || `${al.fromStatus || "—"} → ${al.toStatus || "—"}`}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
