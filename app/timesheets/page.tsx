"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileClock,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Copy,
  Play,
  Pause,
  Square,
  Trash2,
  Send,
  Lock,
  Edit3,
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

const PROJECT_BAR_COLORS = ["#0755e9", "#7c3aed", "#079b62", "#f59e0b", "#0891b2", "#db2777"];

export default function MyTimesheetPage() {
  const [weekMonday, setWeekMonday] = useState(() => getMondayOfWeek());
  const [activeTab, setActiveTab] = useState<"entries" | "timer" | "history">("entries");
  const [timesheet, setTimesheet] = useState<TimesheetDoc | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [projects, setProjects] = useState<{ _id: string; projectName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitComment, setSubmitComment] = useState("");
  const [showSubmitBox, setShowSubmitBox] = useState(false);

  // Live Timer state (TIME-001 Panel 7)
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerProjectId, setTimerProjectId] = useState("");
  const [timerWorkType, setTimerWorkType] = useState<WorkType>("Development");
  const [timerBillable, setTimerBillable] = useState(true);
  const [timerNotes, setTimerNotes] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [myRes, projList] = await Promise.all([
        timesheetApi.getMy({ weekStart: weekMonday }),
        tsLookupApi.projects().catch(() => []),
      ]);
      setTimesheet(myRes.timesheet);
      setHistory(myRes.history || []);
      setProjects(projList);
      if (!timerProjectId && projList[0]) {
        setTimerProjectId(projList[0]._id);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load timesheet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [weekMonday]);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((s) => s + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const weekDays = useMemo(() => getWeekDates(weekMonday), [weekMonday]);
  const todayIso = new Date().toISOString().slice(0, 10);
  const entries = timesheet?.dailyEntries || [];
  const isLocked = timesheet?.status === "LOCKED" || timesheet?.status === "APPROVED";

  // Hours per day Mon-Sun
  const hoursByDay = useMemo(() => {
    const map: Record<string, number> = {};
    weekDays.forEach((d) => (map[d.iso] = 0));
    entries.forEach((e) => {
      if (e.date in map) {
        map[e.date] = Math.round((map[e.date] + Number(e.hours || 0)) * 100) / 100;
      }
    });
    return map;
  }, [entries, weekDays]);

  // Hours by Project
  const hoursByProject = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => {
      const key = e.projectName || "General / Internal";
      map.set(key, Math.round(((map.get(key) || 0) + Number(e.hours || 0)) * 100) / 100);
    });
    return Array.from(map.entries())
      .map(([projectName, hours]) => ({ projectName, hours }))
      .sort((a, b) => b.hours - a.hours);
  }, [entries]);

  const totalHours = timesheet?.totalHours || 0;
  const billableHours = timesheet?.billableHours || 0;
  const nonBillableHours = timesheet?.nonBillableHours || 0;
  const expectedHours = timesheet?.expectedHours || 40;
  const loggedPct = expectedHours > 0 ? Math.round((totalHours / expectedHours) * 100) : 0;
  const billablePct = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;

  const formatTimer = (sec: number) => {
    const h = String(Math.floor(sec / 3600)).padStart(2, "0");
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const handleStopAndLogTimer = async () => {
    setTimerRunning(false);
    const hrs = Math.max(0.25, Math.round((timerSeconds / 3600) * 4) / 4);
    const proj = projects.find((p) => p._id === timerProjectId);
    setBusy(true);
    setError(null);
    try {
      await timesheetApi.addEntry({
        date: todayIso,
        projectId: timerProjectId || null,
        projectName: proj?.projectName || "General / Internal",
        workType: timerWorkType,
        taskTitle: timerWorkType,
        hours: hrs,
        billable: timerBillable,
        description: timerNotes.trim() || `Tracked via live timer (${formatTimer(timerSeconds)})`,
        source: "TIMER",
      });
      setTimerSeconds(0);
      setTimerNotes("");
      await loadData();
      flash(`Logged ${hrs}h from live timer.`);
      setActiveTab("entries");
    } catch (e: any) {
      setError(e?.message || "Failed to save timer entry");
    } finally {
      setBusy(false);
    }
  };

  const handleCopyPreviousDay = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await timesheetApi.copyPreviousDay(todayIso);
      await loadData();
      flash(`Copied ${res.copiedCount} entry(s) from ${formatShortDate(res.fromDate)}.`);
    } catch (e: any) {
      setError(e?.message || "No previous day entries found to copy");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteEntry = async (entryId?: string) => {
    if (!timesheet?._id || !entryId) return;
    setBusy(true);
    setError(null);
    try {
      await timesheetApi.deleteEntry(timesheet._id, entryId);
      await loadData();
      flash("Time entry removed.");
    } catch (e: any) {
      setError(e?.message || "Failed to remove entry");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitWeek = async () => {
    if (!timesheet?._id) {
      setError("Add at least one time entry before submitting.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await timesheetApi.submit(timesheet._id, submitComment);
      setShowSubmitBox(false);
      setSubmitComment("");
      await loadData();
      flash("Weekly timesheet submitted for manager approval.");
    } catch (e: any) {
      setError(e?.message || "Failed to submit timesheet");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ts-page">
      {/* Header */}
      <div>
        <div className="ts-breadcrumb">
          <span>Timesheets</span>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>My Timesheet</span>
        </div>
        <div className="ts-header">
          <div>
            <h1 className="ts-title">My Timesheet</h1>
            <p className="ts-subtitle">Track daily hours by project &amp; task, run the live timer, and submit weekly timesheets for approval.</p>
          </div>
          <div className="ts-actions">
            <div className="ts-week-nav">
              <button type="button" className="ts-btn ts-btn-ghost ts-btn-sm" onClick={() => setWeekMonday(shiftWeekMonday(weekMonday, -1))}>
                <ChevronLeft size={13} />
              </button>
              <span className="ts-week-label">{formatWeekRange(weekMonday)}</span>
              <button type="button" className="ts-btn ts-btn-ghost ts-btn-sm" onClick={() => setWeekMonday(shiftWeekMonday(weekMonday, 1))}>
                <ChevronRight size={13} />
              </button>
            </div>
            <button type="button" className="ts-btn" onClick={() => setWeekMonday(getMondayOfWeek())}>
              This Week
            </button>
            <button type="button" className="ts-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            </button>
            {!isLocked && (
              <Link href={`/timesheets/new?date=${todayIso}`} className="ts-btn ts-btn-primary">
                <Plus size={13} /> Add Time Entry
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="ts-subnav">
        <Link href="/timesheets" className="ts-subnav-link active">My Timesheet</Link>
        <Link href="/timesheets/new" className="ts-subnav-link">Add Time Entry</Link>
        <Link href="/timesheets/weekly" className="ts-subnav-link">Weekly Timesheet</Link>
        <Link href="/timesheets/team" className="ts-subnav-link">Team Timesheets</Link>
        <Link href="/timesheets/approvals" className="ts-subnav-link">Timesheet Approvals</Link>
        <Link href="/timesheets/analytics" className="ts-subnav-link">Timesheet Analytics</Link>
      </div>

      {notice && <div className="ts-alert ts-alert-healthy"><CheckCircle2 size={14} /> <span>{notice}</span></div>}
      {error && <div className="ts-alert ts-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {timesheet?.status === "REJECTED" || timesheet?.status === "CHANGES_REQUESTED" ? (
        <div className="ts-alert ts-alert-warning">
          <AlertTriangle size={14} />
          <div>
            <strong>{formatStatusLabel(timesheet.status)}:</strong>{" "}
            {timesheet.rejectionReason || "Manager requested updates. Edit your entries and resubmit."}
          </div>
        </div>
      ) : null}

      {/* 4 KPI Strip (TIME-001 Panel 1) */}
      <div className="ts-kpi-grid">
        <div className="ts-kpi">
          <div className="ts-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><Clock size={16} /></div>
          <div>
            <span className="ts-kpi-label">Logged Hours</span>
            <span className="ts-kpi-val">{totalHours.toFixed(1)} / {expectedHours.toFixed(1)}</span>
            <span className="ts-kpi-sub" style={{ color: "#0755e9" }}>{loggedPct}% of target</span>
          </div>
        </div>
        <div className="ts-kpi">
          <div className="ts-kpi-icon" style={{ background: "#ecfdf5", color: "#079b62" }}><CheckCircle2 size={16} /></div>
          <div>
            <span className="ts-kpi-label">Billable Hours</span>
            <span className="ts-kpi-val">{billableHours.toFixed(1)}h</span>
            <span className="ts-kpi-sub" style={{ color: "#079b62" }}>{billablePct}% of logged</span>
          </div>
        </div>
        <div className="ts-kpi">
          <div className="ts-kpi-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}><FileClock size={16} /></div>
          <div>
            <span className="ts-kpi-label">Non-Billable Hours</span>
            <span className="ts-kpi-val">{nonBillableHours.toFixed(1)}h</span>
            <span className="ts-kpi-sub">{totalHours > 0 ? 100 - billablePct : 0}% of logged</span>
          </div>
        </div>
        <div className="ts-kpi">
          <div className="ts-kpi-icon" style={{ background: "#fffbeb", color: "#d97706" }}>
            {timesheet?.status === "LOCKED" ? <Lock size={16} /> : <Send size={16} />}
          </div>
          <div>
            <span className="ts-kpi-label">Approval Status</span>
            <div style={{ marginTop: 2 }}>
              <span className={statusBadgeClass(timesheet?.status)}>
                {formatStatusLabel(timesheet?.status)}
              </span>
            </div>
            <span className="ts-kpi-sub">
              {timesheet?.submittedAt ? `Submitted ${formatShortDate(timesheet.submittedAt)}` : `Week ends ${formatShortDate(weekDays[6].iso)}`}
            </span>
          </div>
        </div>
      </div>

      {/* Middle Row: Hours by Project + Weekly Calendar Strip (TIME-001 Panel 1) */}
      <div className="ts-grid-2">
        <div className="ts-card">
          <div className="ts-card-head">
            <h3 className="ts-card-title">Hours by Project</h3>
            <span style={{ fontSize: 10.5, color: "#64748b" }}>{hoursByProject.length} active</span>
          </div>
          {hoursByProject.length === 0 ? (
            <div className="ts-empty" style={{ padding: "16px 8px" }}>No hours logged for this week yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {hoursByProject.map((p, idx) => (
                <div key={p.projectName}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ fontWeight: 600 }}>{p.projectName}</span>
                    <strong>{p.hours.toFixed(1)} hrs</strong>
                  </div>
                  <div className="ts-bar-track">
                    <div
                      className="ts-bar-fill"
                      style={{
                        width: `${Math.min(100, (p.hours / Math.max(1, totalHours)) * 100)}%`,
                        background: PROJECT_BAR_COLORS[idx % PROJECT_BAR_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ts-card">
          <div className="ts-card-head">
            <h3 className="ts-card-title">Weekly Calendar Strip</h3>
            <div style={{ display: "flex", gap: 6 }}>
              {!isLocked && (
                <button type="button" className="ts-btn ts-btn-sm" disabled={busy} onClick={handleCopyPreviousDay}>
                  <Copy size={11} /> Copy Previous Day
                </button>
              )}
              <Link href="/timesheets/weekly" className="ts-btn ts-btn-sm">Weekly Grid</Link>
            </div>
          </div>
          <div className="ts-week-strip">
            {weekDays.map((d) => {
              const h = hoursByDay[d.iso] || 0;
              return (
                <Link
                  key={d.iso}
                  href={`/timesheets/new?date=${d.iso}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                  className={`ts-day-tile ${h > 0 ? "logged" : ""} ${d.iso === todayIso ? "today" : ""}`}
                >
                  <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>{d.dayShort}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, margin: "2px 0" }}>{d.dayNum}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: h > 0 ? "#047857" : "#94a3b8" }}>
                    {h > 0 ? `${h}h` : "—"}
                  </div>
                </Link>
              );
            })}
          </div>

          {!isLocked && entries.length > 0 && timesheet?.status !== "SUBMITTED" && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10.5, color: "#64748b" }}>
                Ready to submit <strong>{totalHours.toFixed(1)} hrs</strong> ({billableHours.toFixed(1)}h billable)?
              </span>
              <button type="button" className="ts-btn ts-btn-success ts-btn-sm" onClick={() => setShowSubmitBox((v) => !v)}>
                <Send size={11} /> Submit for Approval
              </button>
            </div>
          )}

          {showSubmitBox && (
            <div style={{ marginTop: 10, padding: 10, background: "#f8fafd", borderRadius: 6, border: "1px solid #dce5f2", display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea
                className="ts-textarea"
                rows={2}
                placeholder="Optional submission comments for your manager..."
                value={submitComment}
                onChange={(e) => setSubmitComment(e.target.value)}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                <button type="button" className="ts-btn ts-btn-sm" onClick={() => setShowSubmitBox(false)}>Cancel</button>
                <button type="button" className="ts-btn ts-btn-primary ts-btn-sm" disabled={busy} onClick={handleSubmitWeek}>
                  {busy ? "Submitting..." : "Confirm Submit"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Switcher: Daily Entries | Live Timer | History */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div className="ts-seg">
          <button type="button" className={`ts-seg-btn ${activeTab === "entries" ? "active" : ""}`} onClick={() => setActiveTab("entries")}>
            Time Entries ({entries.length})
          </button>
          <button type="button" className={`ts-seg-btn ${activeTab === "timer" ? "active" : ""}`} onClick={() => setActiveTab("timer")}>
            Live Timer {timerRunning ? `(${formatTimer(timerSeconds)})` : ""}
          </button>
          <button type="button" className={`ts-seg-btn ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
            History &amp; Status ({history.length})
          </button>
        </div>
      </div>

      {/* TAB 1: DAILY ENTRIES TABLE */}
      {activeTab === "entries" && (
        <div className="ts-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="ts-table-wrap">
            <table className="ts-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Sprint / Task</th>
                  <th>Work Type</th>
                  <th>Time</th>
                  <th>Hours</th>
                  <th>Billable</th>
                  <th>Notes</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && entries.length === 0 ? (
                  <tr><td colSpan={9} className="ts-empty">Loading timesheet entries...</td></tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="ts-empty">
                      No time entries logged for {formatWeekRange(weekMonday)}. Click <strong>Add Time Entry</strong> or start the <strong>Live Timer</strong>.
                    </td>
                  </tr>
                ) : (
                  [...entries]
                    .sort((a, b) => (a.date < b.date ? 1 : -1))
                    .map((en, idx) => (
                      <tr key={en._id || idx}>
                        <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{formatShortDate(en.date)}</td>
                        <td><strong style={{ color: "#0755e9" }}>{en.projectName}</strong></td>
                        <td>
                          <div>{en.taskTitle || "—"}</div>
                          {en.sprintName && <div style={{ fontSize: 9.5, color: "#64748b" }}>{en.sprintName}</div>}
                        </td>
                        <td><span className="ts-badge ts-badge-slate">{en.workType}</span></td>
                        <td style={{ fontSize: 10.5, color: "#64748b", whiteSpace: "nowrap" }}>
                          {en.startTime && en.endTime ? `${en.startTime} – ${en.endTime}` : "—"}
                        </td>
                        <td><strong>{Number(en.hours).toFixed(2)}h</strong></td>
                        <td>
                          <span className={`ts-badge ${en.billable ? "ts-badge-green" : "ts-badge-amber"}`}>
                            {en.billable ? "Billable" : "Non-Billable"}
                          </span>
                        </td>
                        <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#475569" }} title={en.description}>
                          {en.description || "—"}
                        </td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          {!isLocked && en._id && timesheet?._id ? (
                            <div style={{ display: "inline-flex", gap: 5 }}>
                              <Link
                                href={`/timesheets/new?timesheetId=${timesheet._id}&entryId=${en._id}`}
                                className="ts-btn ts-btn-sm"
                                title="Edit entry"
                              >
                                <Edit3 size={11} />
                              </Link>
                              <button
                                type="button"
                                className="ts-btn ts-btn-danger ts-btn-sm"
                                disabled={busy}
                                onClick={() => handleDeleteEntry(en._id)}
                                title="Delete entry"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: 10 }}>Locked</span>
                          )}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE TIMER (TIME-001 Panel 7) */}
      {activeTab === "timer" && (
        <div className="ts-card" style={{ maxWidth: 680 }}>
          <div className="ts-card-head">
            <h3 className="ts-card-title">Live Work Timer</h3>
            <span className="ts-badge ts-badge-blue">Auto-logs to today ({formatShortDate(todayIso)})</span>
          </div>
          <div className="ts-grid-2" style={{ marginBottom: 12 }}>
            <div className="ts-field">
              <label>Project</label>
              <select className="ts-select" value={timerProjectId} onChange={(e) => setTimerProjectId(e.target.value)}>
                <option value="">General / Internal</option>
                {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
              </select>
            </div>
            <div className="ts-field">
              <label>Work Type</label>
              <select className="ts-select" value={timerWorkType} onChange={(e) => setTimerWorkType(e.target.value as WorkType)}>
                {WORK_TYPES.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#f8fafd", borderRadius: 8, border: "1px solid #e3eaf4", marginBottom: 12 }}>
            <div>
              <div className="ts-timer-clock">{formatTimer(timerSeconds)}</div>
              <div style={{ fontSize: 10.5, color: "#64748b" }}>
                {timerRunning ? "Tracking time live..." : timerSeconds > 0 ? "Paused — click Stop & Save to log entry" : "Click Start to begin tracking"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {!timerRunning ? (
                <button type="button" className="ts-btn ts-btn-primary" onClick={() => setTimerRunning(true)}>
                  <Play size={13} /> {timerSeconds > 0 ? "Resume" : "Start"}
                </button>
              ) : (
                <button type="button" className="ts-btn ts-btn-amber" onClick={() => setTimerRunning(false)}>
                  <Pause size={13} /> Pause
                </button>
              )}
              {timerSeconds > 0 && (
                <button type="button" className="ts-btn ts-btn-success" disabled={busy} onClick={handleStopAndLogTimer}>
                  <Square size={12} /> Stop &amp; Log
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="ts-field">
              <label>Work Description</label>
              <input
                className="ts-input"
                placeholder="What are you working on?"
                value={timerNotes}
                onChange={(e) => setTimerNotes(e.target.value)}
              />
            </div>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, cursor: "pointer" }}>
              <input type="checkbox" checked={timerBillable} onChange={(e) => setTimerBillable(e.target.checked)} />
              Billable Work
            </label>
          </div>
        </div>
      )}

      {/* TAB 3: HISTORY & APPROVAL TRACKER (TIME-001 Panels 10 & 11) */}
      {activeTab === "history" && (
        <div className="ts-grid-2">
          <div className="ts-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4" }}>
              <h3 className="ts-card-title">My Timesheet History</h3>
            </div>
            <div className="ts-table-wrap">
              <table className="ts-table">
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>Total</th>
                    <th>Billable</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr><td colSpan={5} className="ts-empty">No past timesheets found.</td></tr>
                  ) : (
                    history.map((h) => (
                      <tr key={h._id}>
                        <td style={{ fontWeight: 600 }}>{formatWeekRange(h.weekKey)}</td>
                        <td><strong>{Number(h.totalHours || 0).toFixed(1)}h</strong></td>
                        <td>{Number(h.billableHours || 0).toFixed(1)}h</td>
                        <td><span className={statusBadgeClass(h.status)}>{formatStatusLabel(h.status)}</span></td>
                        <td style={{ textAlign: "right" }}>
                          <button type="button" className="ts-btn ts-btn-sm" onClick={() => { setWeekMonday(h.weekKey); setActiveTab("entries"); }}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ts-card">
            <div className="ts-card-head">
              <h3 className="ts-card-title">Submission &amp; Approval Tracking</h3>
              <span className={statusBadgeClass(timesheet?.status)}>{formatStatusLabel(timesheet?.status)}</span>
            </div>
            <div className="ts-timeline">
              {[
                { label: "Draft & Time Logging", done: entries.length > 0, active: timesheet?.status === "DRAFT" },
                {
                  label: "Submitted for Review",
                  done: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "LOCKED"].includes(timesheet?.status || ""),
                  active: timesheet?.status === "SUBMITTED" || timesheet?.status === "UNDER_REVIEW",
                  meta: timesheet?.submittedAt ? formatShortDate(timesheet.submittedAt) : "Not submitted yet",
                },
                {
                  label: timesheet?.status === "REJECTED" ? "Rejected by Manager" : "Manager Approved",
                  done: ["APPROVED", "LOCKED"].includes(timesheet?.status || ""),
                  rejected: timesheet?.status === "REJECTED" || timesheet?.status === "CHANGES_REQUESTED",
                  meta: timesheet?.approvedAt ? `Approved ${formatShortDate(timesheet.approvedAt)}` : timesheet?.rejectionReason || "Pending manager review",
                },
                {
                  label: "Locked (Final Record)",
                  done: timesheet?.status === "LOCKED",
                  meta: timesheet?.lockedAt ? formatShortDate(timesheet.lockedAt) : "Locks after final approval",
                },
              ].map((st, i) => (
                <div key={st.label} className="ts-tl-step">
                  <span className={`ts-tl-dot ${st.rejected ? "rejected" : st.done ? "done" : st.active ? "active" : ""}`}>
                    {i + 1}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 11.5 }}>{st.label}</div>
                    {st.meta && <div style={{ fontSize: 10, color: "#64748b" }}>{st.meta}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
