"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Lock,
  ArrowLeft,
} from "lucide-react";
import {
  timesheetApi,
  TimesheetDoc,
  getMondayOfWeek,
  shiftWeekMonday,
  formatWeekRange,
  formatShortDate,
  formatStatusLabel,
  statusBadgeClass,
  getInitials,
} from "@/lib/timesheets/api";
import "@/components/timesheets/timesheets.css";

function empNameFromSheet(ts: TimesheetDoc): string {
  const emp = ts.employeeId && typeof ts.employeeId === "object" ? ts.employeeId : null;
  if (emp) {
    return emp.displayName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email || "Team Member";
  }
  return ts.submittedByName || "Team Member";
}

export default function TimesheetApprovalsPage() {
  const [weekMonday, setWeekMonday] = useState("");
  const [statusTab, setStatusTab] = useState<"PENDING" | "APPROVED" | "CHANGES" | "REJECTED" | "ALL">("PENDING");
  const [sheets, setSheets] = useState<TimesheetDoc[]>([]);
  const [selected, setSelected] = useState<TimesheetDoc | null>(null);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT" | "REQUEST_CHANGES" | "LOCK">("APPROVE");
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await timesheetApi.list({ weekKey: weekMonday || undefined });
      setSheets(list);
      if (selected?._id) {
        const refreshed = list.find((s) => s._id === selected._id) || null;
        setSelected(refreshed);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load timesheet approvals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [weekMonday]);

  const counts = useMemo(() => {
    const pending = sheets.filter((s) => s.status === "SUBMITTED" || s.status === "UNDER_REVIEW").length;
    const approved = sheets.filter((s) => s.status === "APPROVED" || s.status === "LOCKED").length;
    const changes = sheets.filter((s) => s.status === "CHANGES_REQUESTED").length;
    const rejected = sheets.filter((s) => s.status === "REJECTED").length;
    return { total: sheets.length, pending, approved, changes, rejected };
  }, [sheets]);

  const filtered = useMemo(() => {
    return sheets.filter((s) => {
      if (statusTab === "PENDING") return s.status === "SUBMITTED" || s.status === "UNDER_REVIEW";
      if (statusTab === "APPROVED") return s.status === "APPROVED" || s.status === "LOCKED";
      if (statusTab === "CHANGES") return s.status === "CHANGES_REQUESTED";
      if (statusTab === "REJECTED") return s.status === "REJECTED";
      return true;
    });
  }, [sheets, statusTab]);

  const handleSubmitDecision = async () => {
    if (!selected?._id) return;
    if ((decision === "REJECT" || decision === "REQUEST_CHANGES") && !comments.trim()) {
      setError("Comments are required when rejecting or requesting changes.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await timesheetApi.decide(selected._id, { decision, comments: comments.trim() });
      setSelected(updated);
      setComments("");
      setNotice(`Timesheet marked as ${formatStatusLabel(updated.status)}.`);
      setTimeout(() => setNotice(null), 3500);
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Failed to submit approval decision");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ts-page">
      {/* Header */}
      <div>
        <div className="ts-breadcrumb">
          <Link href="/timesheets">Timesheets</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Timesheet Approvals</span>
        </div>
        <div className="ts-header">
          <div>
            <h1 className="ts-title">Timesheet Approvals</h1>
            <p className="ts-subtitle">Review submitted employee timesheets, verify daily entries, and approve, request changes, reject, or lock.</p>
          </div>
          <div className="ts-actions">
            <div className="ts-week-nav">
              <button
                type="button"
                className="ts-btn ts-btn-ghost ts-btn-sm"
                onClick={() => setWeekMonday(shiftWeekMonday(weekMonday || getMondayOfWeek(), -1))}
              >
                <ChevronLeft size={13} />
              </button>
              <span className="ts-week-label">{weekMonday ? formatWeekRange(weekMonday) : "All Weeks"}</span>
              <button
                type="button"
                className="ts-btn ts-btn-ghost ts-btn-sm"
                onClick={() => setWeekMonday(shiftWeekMonday(weekMonday || getMondayOfWeek(), 1))}
              >
                <ChevronRight size={13} />
              </button>
            </div>
            {weekMonday && (
              <button type="button" className="ts-btn ts-btn-sm" onClick={() => setWeekMonday("")}>Show All Weeks</button>
            )}
            <button type="button" className="ts-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="ts-subnav">
        <Link href="/timesheets" className="ts-subnav-link">My Timesheet</Link>
        <Link href="/timesheets/new" className="ts-subnav-link">Add Time Entry</Link>
        <Link href="/timesheets/weekly" className="ts-subnav-link">Weekly Timesheet</Link>
        <Link href="/timesheets/team" className="ts-subnav-link">Team Timesheets</Link>
        <Link href="/timesheets/approvals" className="ts-subnav-link active">Timesheet Approvals</Link>
        <Link href="/timesheets/analytics" className="ts-subnav-link">Timesheet Analytics</Link>
      </div>

      {notice && <div className="ts-alert ts-alert-healthy"><CheckCircle2 size={14} /> <span>{notice}</span></div>}
      {error && <div className="ts-alert ts-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* 4 KPI Strip (TIME-005 Panel 1) */}
      <div className="ts-kpi-grid">
        <div className="ts-kpi"><div className="ts-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><ClipboardCheck size={16} /></div><div><span className="ts-kpi-label">Total Timesheets</span><span className="ts-kpi-val">{counts.total}</span></div></div>
        <div className="ts-kpi"><div className="ts-kpi-icon" style={{ background: "#fffbeb", color: "#d97706" }}><Clock size={16} /></div><div><span className="ts-kpi-label">Pending Approval</span><span className="ts-kpi-val" style={{ color: "#d97706" }}>{counts.pending}</span></div></div>
        <div className="ts-kpi"><div className="ts-kpi-icon" style={{ background: "#ecfdf5", color: "#079b62" }}><CheckCircle2 size={16} /></div><div><span className="ts-kpi-label">Approved / Locked</span><span className="ts-kpi-val" style={{ color: "#079b62" }}>{counts.approved}</span></div></div>
        <div className="ts-kpi"><div className="ts-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><XCircle size={16} /></div><div><span className="ts-kpi-label">Rejected / Changes</span><span className="ts-kpi-val" style={{ color: "#dc2626" }}>{counts.rejected + counts.changes}</span></div></div>
      </div>

      {/* Review Mode vs List Mode */}
      {selected ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button type="button" className="ts-btn" onClick={() => setSelected(null)}>
              <ArrowLeft size={13} /> Back to Approval Queue
            </button>
            <span className={statusBadgeClass(selected.status)}>{formatStatusLabel(selected.status)}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(290px, 1fr)", gap: 12, alignItems: "start" }}>
            {/* Left: Employee Timesheet Entries (TIME-005 Panel 2) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="ts-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="ts-avatar" style={{ width: 36, height: 36, fontSize: 12 }}>
                      {selected.employeeId?.avatarUrl ? (
                        <img src={selected.employeeId.avatarUrl} alt={empNameFromSheet(selected)} />
                      ) : (
                        getInitials(empNameFromSheet(selected))
                      )}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{empNameFromSheet(selected)}</div>
                      <div style={{ fontSize: 10.5, color: "#64748b" }}>
                        Week: <strong>{formatWeekRange(selected.weekKey)}</strong>
                        {selected.submittedAt ? ` · Submitted ${formatShortDate(selected.submittedAt)}` : ""}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 14, fontSize: 11.5 }}>
                    <div><span style={{ color: "#64748b" }}>Total:</span> <strong>{selected.totalHours}h</strong></div>
                    <div><span style={{ color: "#64748b" }}>Billable:</span> <strong style={{ color: "#079b62" }}>{selected.billableHours}h</strong></div>
                    <div><span style={{ color: "#64748b" }}>Non-Billable:</span> <strong>{selected.nonBillableHours}h</strong></div>
                  </div>
                </div>
                {selected.submissionComments && (
                  <div className="ts-alert ts-alert-info" style={{ marginTop: 10 }}>
                    <strong>Employee Note:</strong> {selected.submissionComments}
                  </div>
                )}
              </div>

              <div className="ts-card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "9px 14px", borderBottom: "1px solid #e3eaf4" }}>
                  <h3 className="ts-card-title">Daily Entries ({selected.dailyEntries?.length || 0})</h3>
                </div>
                <div className="ts-table-wrap">
                  <table className="ts-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Project</th>
                        <th>Task / Work Type</th>
                        <th>Hours</th>
                        <th>Billable</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selected.dailyEntries || []).length === 0 ? (
                        <tr><td colSpan={6} className="ts-empty">No entries in this timesheet.</td></tr>
                      ) : (
                        selected.dailyEntries.map((en, i) => (
                          <tr key={en._id || i}>
                            <td style={{ whiteSpace: "nowrap" }}>{formatShortDate(en.date)}</td>
                            <td><strong>{en.projectName}</strong></td>
                            <td>
                              <div>{en.taskTitle || en.workType}</div>
                              <div style={{ fontSize: 9.5, color: "#64748b" }}>{en.workType}{en.sprintName ? ` · ${en.sprintName}` : ""}</div>
                            </td>
                            <td><strong>{en.hours}h</strong></td>
                            <td><span className={`ts-badge ${en.billable ? "ts-badge-green" : "ts-badge-amber"}`}>{en.billable ? "Billable" : "Non-Billable"}</span></td>
                            <td style={{ color: "#475569" }}>{en.description || "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right: Approval Decision Card + Audit Log (TIME-005 Panels 3 & 9) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="ts-card">
                <h3 className="ts-card-title" style={{ marginBottom: 10 }}>Approval Decision</h3>
                {selected.status === "LOCKED" ? (
                  <div className="ts-alert ts-alert-info">
                    <Lock size={14} /> <span>This timesheet is locked (final record) and cannot be altered.</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { v: "APPROVE", label: "Approve", desc: "Mark timesheet as approved", bg: "#ecfdf5", border: "#a7f3d0" },
                      { v: "REQUEST_CHANGES", label: "Request Changes", desc: "Send back to employee with comments", bg: "#fffbeb", border: "#fde68a" },
                      { v: "REJECT", label: "Reject", desc: "Reject timesheet for corrections", bg: "#fef2f2", border: "#fecaca" },
                      { v: "LOCK", label: "Lock (Final Record)", desc: "Permanently lock approved record", bg: "#f5f3ff", border: "#ddd6fe" },
                    ].map((opt) => (
                      <label
                        key={opt.v}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          padding: "8px 10px",
                          borderRadius: 6,
                          border: `1px solid ${decision === opt.v ? opt.border : "#e3eaf4"}`,
                          background: decision === opt.v ? opt.bg : "#ffffff",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name="tsDecision"
                          checked={decision === opt.v}
                          onChange={() => setDecision(opt.v as any)}
                          style={{ marginTop: 2 }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 11.5 }}>{opt.label}</div>
                          <div style={{ fontSize: 10, color: "#64748b" }}>{opt.desc}</div>
                        </div>
                      </label>
                    ))}

                    <div className="ts-field" style={{ marginTop: 4 }}>
                      <label>
                        Comments {decision === "REJECT" || decision === "REQUEST_CHANGES" ? "*" : "(Optional)"}
                      </label>
                      <textarea
                        className="ts-textarea"
                        rows={3}
                        placeholder="Add review notes or required corrections..."
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                      />
                    </div>

                    <button
                      type="button"
                      className={`ts-btn ${decision === "REJECT" ? "ts-btn-danger" : decision === "APPROVE" ? "ts-btn-success" : "ts-btn-primary"}`}
                      style={{ width: "100%", marginTop: 4 }}
                      disabled={submitting}
                      onClick={handleSubmitDecision}
                    >
                      {submitting ? "Processing..." : `Submit Decision (${decision.replace("_", " ")})`}
                    </button>
                  </div>
                )}
              </div>

              <div className="ts-card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "9px 12px", borderBottom: "1px solid #e3eaf4" }}>
                  <h3 className="ts-card-title">Audit Log</h3>
                </div>
                <div className="ts-table-wrap">
                  <table className="ts-table">
                    <thead><tr><th>Action</th><th>By</th><th>Date</th></tr></thead>
                    <tbody>
                      {(selected.auditLog || []).length === 0 ? (
                        <tr><td colSpan={3} className="ts-empty">No audit records.</td></tr>
                      ) : (
                        [...selected.auditLog].reverse().map((al, i) => (
                          <tr key={al._id || i}>
                            <td>
                              <span className="ts-badge ts-badge-slate">{al.action}</span>
                              {al.comments && <div style={{ fontSize: 9.5, color: "#64748b", marginTop: 2 }}>{al.comments}</div>}
                            </td>
                            <td>{al.byName}</td>
                            <td style={{ whiteSpace: "nowrap", fontSize: 10 }}>{formatShortDate(al.timestamp)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="ts-seg" style={{ width: "fit-content" }}>
            <button type="button" className={`ts-seg-btn ${statusTab === "PENDING" ? "active" : ""}`} onClick={() => setStatusTab("PENDING")}>Pending ({counts.pending})</button>
            <button type="button" className={`ts-seg-btn ${statusTab === "APPROVED" ? "active" : ""}`} onClick={() => setStatusTab("APPROVED")}>Approved ({counts.approved})</button>
            <button type="button" className={`ts-seg-btn ${statusTab === "CHANGES" ? "active" : ""}`} onClick={() => setStatusTab("CHANGES")}>Changes Requested ({counts.changes})</button>
            <button type="button" className={`ts-seg-btn ${statusTab === "REJECTED" ? "active" : ""}`} onClick={() => setStatusTab("REJECTED")}>Rejected ({counts.rejected})</button>
            <button type="button" className={`ts-seg-btn ${statusTab === "ALL" ? "active" : ""}`} onClick={() => setStatusTab("ALL")}>All ({counts.total})</button>
          </div>

          <div className="ts-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="ts-table-wrap">
              <table className="ts-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Employee</th>
                    <th>Week</th>
                    <th>Total Hours</th>
                    <th>Billable</th>
                    <th>Non-Billable</th>
                    <th>Status</th>
                    <th>Submitted On</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && sheets.length === 0 ? (
                    <tr><td colSpan={9} className="ts-empty">Loading approval queue...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={9} className="ts-empty">No timesheets in this category.</td></tr>
                  ) : (
                    filtered.map((s, idx) => (
                      <tr key={s._id || idx}>
                        <td>{idx + 1}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="ts-avatar">
                              {s.employeeId?.avatarUrl ? <img src={s.employeeId.avatarUrl} alt={empNameFromSheet(s)} /> : getInitials(empNameFromSheet(s))}
                            </span>
                            <strong>{empNameFromSheet(s)}</strong>
                          </div>
                        </td>
                        <td>{formatWeekRange(s.weekKey)}</td>
                        <td><strong>{Number(s.totalHours || 0).toFixed(1)}h</strong></td>
                        <td style={{ color: "#079b62", fontWeight: 600 }}>{Number(s.billableHours || 0).toFixed(1)}h</td>
                        <td>{Number(s.nonBillableHours || 0).toFixed(1)}h</td>
                        <td><span className={statusBadgeClass(s.status)}>{formatStatusLabel(s.status)}</span></td>
                        <td>{formatShortDate(s.submittedAt)}</td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="ts-btn ts-btn-primary ts-btn-sm"
                            onClick={() => {
                              setSelected(s);
                              setDecision(s.status === "APPROVED" ? "LOCK" : "APPROVE");
                              setComments("");
                            }}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
