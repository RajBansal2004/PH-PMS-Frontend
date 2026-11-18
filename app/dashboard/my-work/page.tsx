"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  UserCheck,
  CheckSquare,
  Clock3,
  AlertTriangle,
  CalendarDays,
  Bell,
  ClipboardCheck,
  RefreshCw,
  Plus,
  FileText,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Shell } from "@/components/Shell";
import {
  dashboardWorkbenchApi,
  formatShortDate,
  type MyWorkDashboardData,
} from "@/lib/dashboard/workbenchApi";
import {
  DashboardRoleTabs,
  DonutBreakdown,
  WeeklyHoursChart,
  priorityBadgeClass,
} from "@/components/dashboard/WorkbenchShared";
import "@/components/dashboard/workbench.css";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_KEYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function MyWorkDashboardPage() {
  const [data, setData] = useState<MyWorkDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardWorkbenchApi.getMyWork();
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load My Work Dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const holidayMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const h of data?.holidays || []) {
      m.set(String(h.date).slice(0, 10), h.name);
    }
    return m;
  }, [data?.holidays]);

  const workingSet = useMemo(
    () => new Set((data?.workingDays || ["MON", "TUE", "WED", "THU", "FRI"]).map((d) => d.toUpperCase())),
    [data?.workingDays]
  );

  const calendarCells = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayIso = new Date().toISOString().slice(0, 10);

    const cells: Array<{
      key: string;
      day: number | null;
      iso: string;
      isToday: boolean;
      holidayName?: string;
      isWeekend: boolean;
    }> = [];

    for (let i = 0; i < firstDow; i++) {
      cells.push({ key: `pad-${i}`, day: null, iso: "", isToday: false, isWeekend: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dowKey = DAY_KEYS[dt.getDay()];
      cells.push({
        key: iso,
        day: d,
        iso,
        isToday: iso === todayIso,
        holidayName: holidayMap.get(iso),
        isWeekend: !workingSet.has(dowKey),
      });
    }
    return cells;
  }, [calMonth, holidayMap, workingSet]);

  const k = data?.kpis;

  return (
    <Shell>
      <div className="wb-page">
        <div className="wb-header">
          <div className="wb-title-wrap">
            <div className="wb-breadcrumb">Dashboard / Employee My Work (DASH-004)</div>
            <h1 className="wb-title">
              <UserCheck size={18} color="#0755e9" />
              My Work Dashboard{data?.userName ? ` — ${data.userName}` : ""}
            </h1>
            <div className="wb-subtitle">
              {data?.scopeMode === "PERSONAL"
                ? "Your assigned tasks, monthly logged time, approvals & organization holiday calendar"
                : "Personal & workspace delivery tasks, time summary, notifications & quick actions"}
            </div>
          </div>

          <div className="wb-header-actions">
            <DashboardRoleTabs active="my-work" />
            <button type="button" className="wb-btn" onClick={() => void load()} disabled={loading}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>

        {error && <div className="wb-error">{error}</div>}

        <div className="wb-kpi-grid">
          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">My Tasks</span>
              <span className="wb-kpi-icon"><CheckSquare size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k?.myTasks ?? "—"}</div>
            <div className="wb-kpi-sub">{data?.progressPct ?? 0}% completion rate</div>
          </div>

          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">In Progress</span>
              <span className="wb-kpi-icon purple"><Zap size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k?.inProgress ?? "—"}</div>
            <div className="wb-kpi-sub">Active tasks</div>
          </div>

          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">Due Today</span>
              <span className="wb-kpi-icon amber"><CalendarDays size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k?.dueToday ?? "—"}</div>
            <div className="wb-kpi-sub">Today&apos;s deadlines</div>
          </div>

          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">Overdue</span>
              <span className="wb-kpi-icon red"><AlertTriangle size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k?.overdue ?? "—"}</div>
            <div className="wb-kpi-sub">Needs immediate attention</div>
          </div>

          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">Completed</span>
              <span className="wb-kpi-icon green"><CheckSquare size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k?.completed ?? "—"}</div>
            <div className="wb-kpi-sub">Finished items</div>
          </div>

          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">Logged Hours (MTD)</span>
              <span className="wb-kpi-icon"><Clock3 size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k ? `${k.loggedHoursMtd}h` : "—"}</div>
            <div className="wb-kpi-sub">
              {data?.timeSummary.billableHours ?? 0}h billable · {data?.timeSummary.nonBillableHours ?? 0}h non-billable
            </div>
          </div>
        </div>

        {/* Row 2: Task Status + Time Summary + Quick Actions & Sprint */}
        <div className="wb-grid-3">
          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">My Task Status</span>
              <Link href="/tasks" className="wb-card-link">Open Tasks</Link>
            </div>
            <DonutBreakdown
              slices={data?.taskStatus || []}
              centerLabel="Done %"
              centerValue={`${data?.progressPct ?? 0}%`}
            />
          </div>

          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">
                <Clock3 size={13} color="#0755e9" /> My Weekly Time Log
              </span>
              <Link href="/timesheets" className="wb-card-link">Timesheet</Link>
            </div>
            <WeeklyHoursChart slots={data?.timeSummary?.weeklyHours || []} />
          </div>

          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">Quick Actions &amp; Active Sprint</span>
            </div>
            <div className="wb-quick-grid">
              <Link href="/timesheets/new" className="wb-quick-tile">
                <Clock3 size={14} color="#0755e9" /> Log Time
              </Link>
              <Link href="/tasks" className="wb-quick-tile">
                <Plus size={14} color="#079b62" /> My Tasks
              </Link>
              <Link href="/timesheets/weekly" className="wb-quick-tile">
                <CalendarDays size={14} color="#7c3aed" /> Weekly Sheet
              </Link>
              <Link href="/documents" className="wb-quick-tile">
                <FileText size={14} color="#d97706" /> Documents
              </Link>
            </div>

            {data?.activeSprint ? (
              <div style={{ marginTop: 6, padding: "9px 10px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700 }}>
                  <span>{data.activeSprint.name}</span>
                  <span style={{ color: "#0755e9" }}>{data.activeSprint.progressPct}%</span>
                </div>
                <div className="wb-bar-track" style={{ margin: "6px 0" }}>
                  <div className="wb-bar-fill" style={{ width: `${data.activeSprint.progressPct}%` }} />
                </div>
                <div style={{ fontSize: 10.5, color: "#64748b", display: "flex", justifyContent: "space-between" }}>
                  <span>{data.activeSprint.projectName}</span>
                  <span>Ends {formatShortDate(data.activeSprint.endDate)}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Row 3: Upcoming Tasks + Monthly Calendar (synced with ORG-005 Holidays) */}
        <div className="wb-grid-12">
          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">My Active &amp; Upcoming Tasks</span>
              <Link href="/tasks/board" className="wb-card-link">Kanban Board</Link>
            </div>
            {data?.upcomingTasks?.length ? (
              <div className="wb-table-wrap">
                <table className="wb-table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Project</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.upcomingTasks.map((t) => (
                      <tr key={t._id}>
                        <td><strong>{t.title}</strong></td>
                        <td>{t.projectName}</td>
                        <td><span className="wb-badge wb-badge-slate">{t.status}</span></td>
                        <td><span className={priorityBadgeClass(t.priority)}>{t.priority}</span></td>
                        <td>
                          <span className={t.isOverdue ? "wb-badge wb-badge-red" : t.isDueToday ? "wb-badge wb-badge-amber" : ""}>
                            {formatShortDate(t.dueDate)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="wb-empty">All caught up! Zero pending tasks right now.</div>
            )}
          </div>

          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">
                <CalendarDays size={13} color="#0755e9" />{" "}
                {calMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  className="wb-btn"
                  style={{ height: 24, padding: "0 6px" }}
                  onClick={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                  aria-label="Previous Month"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  type="button"
                  className="wb-btn"
                  style={{ height: 24, padding: "0 6px" }}
                  onClick={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                  aria-label="Next Month"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

            <div className="wb-cal-grid">
              {DOW_LABELS.map((d) => (
                <div key={d} className="wb-cal-dow">{d}</div>
              ))}
              {calendarCells.map((c) => (
                <div
                  key={c.key}
                  title={c.holidayName || c.iso}
                  className={`wb-cal-day ${
                    c.day === null
                      ? "muted"
                      : c.isToday
                      ? "today"
                      : c.holidayName
                      ? "holiday"
                      : c.isWeekend
                      ? "weekend"
                      : ""
                  }`}
                >
                  {c.day ?? ""}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10.5, color: "#64748b", marginTop: 4 }}>
              <span>Amber = Org Holiday · Grey = Weekend</span>
              <Link href="/organization/calendars" className="wb-card-link">Holiday Calendar →</Link>
            </div>
          </div>
        </div>

        {/* Row 4: Pending Approvals & Unread Notifications */}
        <div className="wb-grid-2">
          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">
                <ClipboardCheck size={13} color="#d97706" /> Pending Approvals For You
              </span>
              <Link href="/approvals" className="wb-card-link">Approval Center</Link>
            </div>
            {data?.pendingApprovals?.length ? (
              <div className="wb-table-wrap">
                <table className="wb-table">
                  <thead>
                    <tr>
                      <th>Request</th>
                      <th>Type</th>
                      <th>Requested By</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pendingApprovals.map((a) => (
                      <tr key={a._id}>
                        <td><strong>{a.title}</strong></td>
                        <td><span className="wb-badge wb-badge-blue">{a.type}</span></td>
                        <td>{a.requestedBy}</td>
                        <td>{formatShortDate(a.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="wb-empty">No pending approvals waiting for you.</div>
            )}
          </div>

          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">
                <Bell size={13} color="#0755e9" /> Unread Notifications
              </span>
              <Link href="/notifications" className="wb-card-link">Notification Inbox</Link>
            </div>
            {data?.unreadNotifications?.length ? (
              <div className="wb-bar-list">
                {data.unreadNotifications.map((n) => (
                  <Link
                    key={n._id}
                    href={n.deepLink || "/notifications"}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 7,
                      border: "1px solid #f1f5f9",
                      background: "#f8fafc",
                      textDecoration: "none",
                      color: "#0f172a",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 700 }}>{n.title}</div>
                      {n.message ? (
                        <div style={{ fontSize: 10.5, color: "#64748b" }}>{n.message.slice(0, 90)}</div>
                      ) : null}
                    </div>
                    <span className={priorityBadgeClass(n.priority)}>{n.type}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="wb-empty">Inbox zero — no unread notifications!</div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
