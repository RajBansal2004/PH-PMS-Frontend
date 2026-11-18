"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  CheckSquare,
  PlayCircle,
  AlertTriangle,
  Bug,
  Gauge,
  RefreshCw,
  Award,
  Zap,
  Clock3,
} from "lucide-react";
import { Shell } from "@/components/Shell";
import {
  dashboardWorkbenchApi,
  formatShortDate,
  type TeamLeadDashboardData,
} from "@/lib/dashboard/workbenchApi";
import {
  DashboardRoleTabs,
  DonutBreakdown,
  WeeklyHoursChart,
  priorityBadgeClass,
} from "@/components/dashboard/WorkbenchShared";
import "@/components/dashboard/workbench.css";

export default function TeamLeadDashboardPage() {
  const [data, setData] = useState<TeamLeadDashboardData | null>(null);
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardWorkbenchApi.getTeamLead(projectId || undefined);
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load Team Lead Dashboard");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const k = data?.kpis;

  return (
    <Shell>
      <div className="wb-page">
        <div className="wb-header">
          <div className="wb-title-wrap">
            <div className="wb-breadcrumb">Dashboard / Team Lead Workbench (DASH-003)</div>
            <h1 className="wb-title">
              <Users size={18} color="#0755e9" />
              Team Lead Dashboard
            </h1>
            <div className="wb-subtitle">
              Squad sprint execution, individual workload balance, defect triage &amp; top performers
            </div>
          </div>

          <div className="wb-header-actions">
            <DashboardRoleTabs active="tl" />
            <select
              className="wb-select"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              aria-label="Filter by Project"
            >
              <option value="">All Projects</option>
              {(data?.projectOptions || []).map((p) => (
                <option key={p._id} value={p._id}>
                  {p.code ? `${p.code} — ${p.name}` : p.name}
                </option>
              ))}
            </select>
            <button type="button" className="wb-btn" onClick={() => void load()} disabled={loading}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>

        {error && <div className="wb-error">{error}</div>}

        <div className="wb-kpi-grid">
          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">Team Members</span>
              <span className="wb-kpi-icon"><Users size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k?.teamMembers ?? "—"}</div>
            <div className="wb-kpi-sub">Active squad roster</div>
          </div>

          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">Tasks Assigned</span>
              <span className="wb-kpi-icon"><CheckSquare size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k?.tasksAssigned ?? "—"}</div>
            <div className="wb-kpi-sub">{k?.tasksCompleted ?? 0} completed</div>
          </div>

          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">In Progress</span>
              <span className="wb-kpi-icon purple"><PlayCircle size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k?.tasksInProgress ?? "—"}</div>
            <div className="wb-kpi-sub">Active WIP items</div>
          </div>

          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">Overdue Tasks</span>
              <span className="wb-kpi-icon red"><AlertTriangle size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k?.overdueTasks ?? "—"}</div>
            <div className="wb-kpi-sub">Needs unblocking</div>
          </div>

          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">Open Bugs</span>
              <span className="wb-kpi-icon amber"><Bug size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k?.openBugs ?? "—"}</div>
            <div className="wb-kpi-sub">Assigned to squad</div>
          </div>

          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">Team Utilization</span>
              <span className="wb-kpi-icon green"><Gauge size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k ? `${k.teamUtilization}%` : "—"}</div>
            <div className="wb-kpi-sub">Target band: 75%–90%</div>
          </div>
        </div>

        <div className="wb-grid-3">
          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">Tasks by Status</span>
              <Link href="/tasks/board" className="wb-card-link">Kanban</Link>
            </div>
            <DonutBreakdown
              slices={data?.tasksByStatus || []}
              centerLabel="Tasks"
              centerValue={k?.tasksAssigned ?? 0}
            />
          </div>

          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">
                <Zap size={13} color="#0755e9" /> Active Sprints &amp; Story Points
              </span>
              <Link href="/sprints" className="wb-card-link">All Sprints</Link>
            </div>
            {data?.activeSprints?.length ? (
              <div className="wb-bar-list">
                {data.activeSprints.map((sp) => (
                  <div key={sp._id} className="wb-bar-row">
                    <div className="wb-bar-meta">
                      <strong>{sp.name}</strong>
                      <span>{sp.completedPoints}/{sp.plannedPoints} SP</span>
                    </div>
                    <div className="wb-bar-track">
                      <div className="wb-bar-fill" style={{ width: `${sp.progressPct}%` }} />
                    </div>
                    <div style={{ fontSize: 10, color: "#64748b", display: "flex", justifyContent: "space-between" }}>
                      <span>{sp.projectName}</span>
                      <span>{sp.progressPct}% complete</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="wb-empty">No active sprints found.</div>
            )}
          </div>

          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">
                <Bug size={13} color="#dc2626" /> Bugs by Severity
              </span>
              <Link href="/qa/bugs" className="wb-card-link">Triage</Link>
            </div>
            <DonutBreakdown
              slices={data?.bugsBySeverity || []}
              centerLabel="Open"
              centerValue={k?.openBugs ?? 0}
            />
          </div>
        </div>

        <div className="wb-grid-2">
          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">My Team Workload Distribution</span>
              <Link href="/capacity/heatmap" className="wb-card-link">Heatmap</Link>
            </div>
            {data?.teamWorkload?.length ? (
              <div className="wb-bar-list">
                {data.teamWorkload.map((m) => {
                  const color =
                    m.utilization > 100 ? "#dc2626" : m.utilization >= 80 ? "#d97706" : "#079b62";
                  return (
                    <div key={m.employeeId} className="wb-bar-row">
                      <div className="wb-bar-meta">
                        <span>
                          <strong>{m.name}</strong> · <span style={{ color: "#64748b" }}>{m.role}</span>
                        </span>
                        <span>
                          {m.completedTasks}/{m.assignedTasks} done · <strong style={{ color }}>{m.utilization}%</strong>
                        </span>
                      </div>
                      <div className="wb-bar-track">
                        <div
                          className="wb-bar-fill"
                          style={{ width: `${Math.min(100, m.utilization)}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="wb-empty">No squad workload data yet.</div>
            )}
          </div>

          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">
                <Clock3 size={13} color="#0755e9" /> Squad Time Logged (Last 7 Days)
              </span>
              <span className="wb-badge wb-badge-blue">{data?.weeklyHoursTotal ?? 0}h</span>
            </div>
            <WeeklyHoursChart slots={data?.weeklyHours || []} />
          </div>
        </div>

        <div className="wb-grid-12">
          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">
                <AlertTriangle size={13} color="#dc2626" /> Overdue Squad Tasks
              </span>
              <Link href="/tasks" className="wb-card-link">Tasks</Link>
            </div>
            {data?.overdueTasks?.length ? (
              <div className="wb-table-wrap">
                <table className="wb-table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Assignee</th>
                      <th>Priority</th>
                      <th>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.overdueTasks.map((t) => (
                      <tr key={t._id}>
                        <td><strong>{t.title}</strong></td>
                        <td>{t.assigneeName || "Unassigned"}</td>
                        <td><span className={priorityBadgeClass(t.priority)}>{t.priority}</span></td>
                        <td><span className="wb-badge wb-badge-red">{t.daysOverdue}d overdue</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="wb-empty">No overdue tasks in your squad!</div>
            )}
          </div>

          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">
                <Award size={13} color="#079b62" /> Top Performers
              </span>
              <Link href="/resources" className="wb-card-link">Resources</Link>
            </div>
            {data?.topPerformers?.length ? (
              <div className="wb-table-wrap">
                <table className="wb-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Done</th>
                      <th>Hours</th>
                      <th>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topPerformers.map((p) => (
                      <tr key={p.employeeId}>
                        <td>
                          <strong>{p.name}</strong>
                          <div style={{ fontSize: 10, color: "#64748b" }}>{p.role}</div>
                        </td>
                        <td>{p.completedTasks}/{p.assignedTasks}</td>
                        <td>{p.loggedHours ?? 0}h</td>
                        <td><span className="wb-badge wb-badge-green">{p.completionRate ?? 0}%</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="wb-empty">No performance records yet.</div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
