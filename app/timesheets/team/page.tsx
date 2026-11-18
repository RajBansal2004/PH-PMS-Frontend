"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  CheckCircle2,
  FileClock,
  Send,
  AlertTriangle,
  Search,
  RefreshCw,
  Download,
  Eye,
  X,
} from "lucide-react";
import {
  timesheetApi,
  tsLookupApi,
  getMondayOfWeek,
  shiftWeekMonday,
  getWeekDates,
  formatWeekRange,
  formatShortDate,
  formatStatusLabel,
  statusBadgeClass,
  getInitials,
} from "@/lib/timesheets/api";
import "@/components/timesheets/timesheets.css";

export default function TeamTimesheetsPage() {
  const [weekMonday, setWeekMonday] = useState(() => getMondayOfWeek());
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [departments, setDepartments] = useState<{ _id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ _id: string; projectName: string }[]>([]);
  const [data, setData] = useState<any>(null);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const weekDays = useMemo(() => getWeekDates(weekMonday), [weekMonday]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamRes, depts, projs] = await Promise.all([
        timesheetApi.getTeam({
          weekStart: weekMonday,
          departmentId: deptFilter !== "ALL" ? deptFilter : undefined,
          projectId: projectFilter !== "ALL" ? projectFilter : undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
        }),
        tsLookupApi.departments().catch(() => []),
        tsLookupApi.projects().catch(() => []),
      ]);
      setData(teamRes);
      setDepartments(depts);
      setProjects(projs);
    } catch (e: any) {
      setError(e?.message || "Failed to load team timesheets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [weekMonday, deptFilter, projectFilter, statusFilter]);

  const summary = data?.summary || {
    teamMembers: 0,
    totalHours: 0,
    billableHours: 0,
    nonBillableHours: 0,
    billablePercent: 0,
    submittedCount: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
  };
  const members: any[] = data?.members || [];
  const projectWise: any[] = data?.projectWise || [];
  const auditLog: any[] = data?.auditLog || [];

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => `${m.name} ${m.role} ${m.department}`.toLowerCase().includes(q));
  }, [members, search]);

  const handleQuickApprove = async (timesheetId: string) => {
    try {
      await timesheetApi.decide(timesheetId, { decision: "APPROVE", comments: "Approved from Team Timesheets" });
      setNotice("Timesheet approved.");
      setTimeout(() => setNotice(null), 3000);
      setSelectedMember(null);
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Failed to approve timesheet");
    }
  };

  const handleExportCsv = () => {
    const headers = ["Member", "Role", "Department", ...weekDays.map((d) => `${d.dayShort} ${d.dayNum}`), "Total", "Billable %", "Status"];
    const rows = filteredMembers.map((m) => [
      m.name,
      m.role,
      m.department,
      ...weekDays.map((d) => m.hoursByDay?.[d.iso] ?? 0),
      m.totalHours,
      `${m.billablePercent}%`,
      formatStatusLabel(m.status),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v ?? "")}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `team-timesheets-${weekMonday}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ts-page">
      {/* Header */}
      <div>
        <div className="ts-breadcrumb">
          <Link href="/timesheets">Timesheets</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Team Timesheets</span>
        </div>
        <div className="ts-header">
          <div>
            <h1 className="ts-title">Team Timesheets</h1>
            <p className="ts-subtitle">Monitor weekly team time logs, track compliance, inspect member entries, and approve submissions.</p>
          </div>
          <div className="ts-actions">
            <div className="ts-week-nav">
              <button type="button" className="ts-btn ts-btn-ghost ts-btn-sm" onClick={() => setWeekMonday(shiftWeekMonday(weekMonday, -1))}><ChevronLeft size={13} /></button>
              <span className="ts-week-label">{formatWeekRange(weekMonday)}</span>
              <button type="button" className="ts-btn ts-btn-ghost ts-btn-sm" onClick={() => setWeekMonday(shiftWeekMonday(weekMonday, 1))}><ChevronRight size={13} /></button>
            </div>
            <button type="button" className="ts-btn" onClick={handleExportCsv}><Download size={12} /> Export CSV</button>
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
        <Link href="/timesheets/weekly" className="ts-subnav-link">Weekly Timesheet</Link>
        <Link href="/timesheets/team" className="ts-subnav-link active">Team Timesheets</Link>
        <Link href="/timesheets/approvals" className="ts-subnav-link">Timesheet Approvals</Link>
        <Link href="/timesheets/analytics" className="ts-subnav-link">Timesheet Analytics</Link>
      </div>

      {notice && <div className="ts-alert ts-alert-healthy"><CheckCircle2 size={14} /> <span>{notice}</span></div>}
      {error && <div className="ts-alert ts-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* 8 Compact KPI Strip matching TIME-004 Panel 1 */}
      <div className="ts-kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(125px, 1fr))" }}>
        <div className="ts-kpi"><div className="ts-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><Users size={15} /></div><div><span className="ts-kpi-label">Team Members</span><span className="ts-kpi-val">{summary.teamMembers}</span></div></div>
        <div className="ts-kpi"><div className="ts-kpi-icon" style={{ background: "#ecfdf5", color: "#079b62" }}><Clock size={15} /></div><div><span className="ts-kpi-label">Total Hours</span><span className="ts-kpi-val">{summary.totalHours}h</span></div></div>
        <div className="ts-kpi"><div className="ts-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><CheckCircle2 size={15} /></div><div><span className="ts-kpi-label">Billable</span><span className="ts-kpi-val">{summary.billableHours}h</span><span className="ts-kpi-sub">{summary.billablePercent}%</span></div></div>
        <div className="ts-kpi"><div className="ts-kpi-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}><FileClock size={15} /></div><div><span className="ts-kpi-label">Non-Billable</span><span className="ts-kpi-val">{summary.nonBillableHours}h</span></div></div>
        <div className="ts-kpi"><div className="ts-kpi-icon" style={{ background: "#eff6ff", color: "#0284c7" }}><Send size={15} /></div><div><span className="ts-kpi-label">Submitted</span><span className="ts-kpi-val">{summary.submittedCount}</span></div></div>
        <div className="ts-kpi"><div className="ts-kpi-icon" style={{ background: "#fffbeb", color: "#d97706" }}><Clock size={15} /></div><div><span className="ts-kpi-label">Pending</span><span className="ts-kpi-val">{summary.pendingCount}</span></div></div>
        <div className="ts-kpi"><div className="ts-kpi-icon" style={{ background: "#ecfdf5", color: "#079b62" }}><CheckCircle2 size={15} /></div><div><span className="ts-kpi-label">Approved</span><span className="ts-kpi-val">{summary.approvedCount}</span></div></div>
        <div className="ts-kpi"><div className="ts-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><AlertTriangle size={15} /></div><div><span className="ts-kpi-label">Rejected</span><span className="ts-kpi-val">{summary.rejectedCount}</span></div></div>
      </div>

      {/* Filters */}
      <div className="ts-filter-bar">
        <div className="ts-search-wrap">
          <Search size={13} className="ts-search-icon" />
          <input className="ts-input" placeholder="Search team member, role, department..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="ts-select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="ALL">All Departments</option>
          {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
        <select className="ts-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="ALL">All Projects</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
        </select>
        <select className="ts-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All Statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="LOCKED">Locked</option>
          <option value="DRAFT">Draft</option>
          <option value="REJECTED">Rejected</option>
          <option value="NOT_SUBMITTED">Not Submitted</option>
        </select>
      </div>

      {/* Team Weekly Matrix Table */}
      <div className="ts-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="ts-table-wrap">
          <table className="ts-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Team Member</th>
                <th>Role</th>
                {weekDays.map((d) => (
                  <th key={d.iso} style={{ textAlign: "center" }}>
                    <div>{d.dayShort}</div>
                    <div style={{ fontSize: 9.5, fontWeight: 500, color: "#94a3b8" }}>{d.dayNum}</div>
                  </th>
                ))}
                <th style={{ textAlign: "center" }}>Total</th>
                <th style={{ textAlign: "center" }}>Billable %</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && filteredMembers.length === 0 ? (
                <tr><td colSpan={14} className="ts-empty">Loading team timesheets...</td></tr>
              ) : filteredMembers.length === 0 ? (
                <tr><td colSpan={14} className="ts-empty">No team members found.</td></tr>
              ) : (
                filteredMembers.map((m, idx) => (
                  <tr key={m.employeeId}>
                    <td>{idx + 1}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="ts-avatar">
                          {m.avatarUrl ? <img src={m.avatarUrl} alt={m.name} /> : getInitials(m.name)}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700 }}>{m.name}</div>
                          <div style={{ fontSize: 9.5, color: "#64748b" }}>{m.department}</div>
                        </div>
                      </div>
                    </td>
                    <td>{m.role}</td>
                    {weekDays.map((d) => (
                      <td key={d.iso} style={{ textAlign: "center", color: (m.hoursByDay?.[d.iso] || 0) > 0 ? "#10204a" : "#cbd5e1", fontWeight: (m.hoursByDay?.[d.iso] || 0) > 0 ? 600 : 400 }}>
                        {m.hoursByDay?.[d.iso] ? Number(m.hoursByDay[d.iso]).toFixed(1) : "0"}
                      </td>
                    ))}
                    <td style={{ textAlign: "center", fontWeight: 700, color: "#0755e9" }}>{Number(m.totalHours || 0).toFixed(1)}</td>
                    <td style={{ textAlign: "center", fontWeight: 600, color: "#079b62" }}>{m.billablePercent}%</td>
                    <td><span className={statusBadgeClass(m.status)}>{formatStatusLabel(m.status)}</span></td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 5 }}>
                        <button type="button" className="ts-btn ts-btn-sm" onClick={() => setSelectedMember(m)}>
                          <Eye size={11} /> View
                        </button>
                        {m.timesheetId && (m.status === "SUBMITTED" || m.status === "UNDER_REVIEW") && (
                          <button type="button" className="ts-btn ts-btn-success ts-btn-sm" onClick={() => handleQuickApprove(m.timesheetId)}>
                            Approve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inline Selected Member Detail Panel (TIME-004 Panel 4) */}
      {selectedMember && (
        <div className="ts-card" style={{ borderColor: "#93c5fd" }}>
          <div className="ts-card-head">
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span className="ts-avatar">
                {selectedMember.avatarUrl ? <img src={selectedMember.avatarUrl} alt={selectedMember.name} /> : getInitials(selectedMember.name)}
              </span>
              <div>
                <h3 className="ts-card-title">{selectedMember.name} — {formatWeekRange(weekMonday)}</h3>
                <span style={{ fontSize: 10, color: "#64748b" }}>{selectedMember.role} · {selectedMember.department} · Total: {selectedMember.totalHours}h ({selectedMember.billablePercent}% billable)</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {selectedMember.timesheetId && selectedMember.status === "SUBMITTED" && (
                <button type="button" className="ts-btn ts-btn-success ts-btn-sm" onClick={() => handleQuickApprove(selectedMember.timesheetId)}>Approve</button>
              )}
              <button type="button" className="ts-btn ts-btn-ghost ts-btn-sm" onClick={() => setSelectedMember(null)}><X size={14} /></button>
            </div>
          </div>
          {(selectedMember.entries || []).length === 0 ? (
            <div className="ts-empty" style={{ padding: 14 }}>No entries logged by {selectedMember.name} for this week.</div>
          ) : (
            <div className="ts-table-wrap">
              <table className="ts-table">
                <thead><tr><th>Date</th><th>Project</th><th>Task</th><th>Work Type</th><th>Hours</th><th>Billable</th><th>Notes</th></tr></thead>
                <tbody>
                  {selectedMember.entries.map((en: any, i: number) => (
                    <tr key={en._id || i}>
                      <td>{formatShortDate(en.date)}</td>
                      <td><strong>{en.projectName}</strong></td>
                      <td>{en.taskTitle || "—"}</td>
                      <td>{en.workType}</td>
                      <td><strong>{en.hours}h</strong></td>
                      <td><span className={`ts-badge ${en.billable ? "ts-badge-green" : "ts-badge-amber"}`}>{en.billable ? "Billable" : "Non-Billable"}</span></td>
                      <td>{en.description || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Bottom Row: Project-Wise Rollup + Audit Log (TIME-004 Panels 7 & 9) */}
      <div className="ts-grid-2">
        <div className="ts-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4" }}>
            <h3 className="ts-card-title">Team Timesheets — Project Wise</h3>
          </div>
          <div className="ts-table-wrap">
            <table className="ts-table">
              <thead><tr><th>Project</th><th>Total</th><th>Billable</th><th>Non-Billable</th><th>Members</th></tr></thead>
              <tbody>
                {projectWise.length === 0 ? (
                  <tr><td colSpan={5} className="ts-empty">No project hours logged this week.</td></tr>
                ) : (
                  projectWise.map((p) => (
                    <tr key={p.projectName}>
                      <td><strong>{p.projectName}</strong></td>
                      <td><strong>{p.totalHours}h</strong></td>
                      <td style={{ color: "#079b62" }}>{p.billableHours}h</td>
                      <td>{p.nonBillableHours}h</td>
                      <td>{p.memberCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ts-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4" }}>
            <h3 className="ts-card-title">Recent Audit Log</h3>
          </div>
          <div className="ts-table-wrap">
            <table className="ts-table">
              <thead><tr><th>Date</th><th>Action</th><th>Member</th><th>Details</th></tr></thead>
              <tbody>
                {auditLog.length === 0 ? (
                  <tr><td colSpan={4} className="ts-empty">No audit events this week.</td></tr>
                ) : (
                  auditLog.slice(0, 8).map((al, i) => (
                    <tr key={al._id || i}>
                      <td style={{ whiteSpace: "nowrap" }}>{formatShortDate(al.timestamp)}</td>
                      <td><span className="ts-badge ts-badge-blue">{al.action}</span></td>
                      <td>{al.memberName || al.byName}</td>
                      <td style={{ color: "#475569" }}>{al.comments || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
