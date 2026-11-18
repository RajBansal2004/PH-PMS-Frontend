"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  TrendingUp,
  CheckSquare,
  AlertTriangle,
  Bug,
  Users,
  ClipboardCheck,
  RefreshCw,
  Clock3,
  Flag,
  Activity,
  Zap,
} from "lucide-react";
import { Shell } from "@/components/Shell";
import {
  dashboardWorkbenchApi,
  formatShortDate,
  type PmDashboardData,
} from "@/lib/dashboard/workbenchApi";
import {
  DashboardRoleTabs,
  DonutBreakdown,
  WeeklyHoursChart,
  priorityBadgeClass,
} from "@/components/dashboard/WorkbenchShared";
import "@/components/dashboard/workbench.css";

export default function ProjectManagerDashboardPage() {
  const [data, setData] = useState<PmDashboardData | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardWorkbenchApi.getPm(projectId || undefined);
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load PM Dashboard");
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
            <div className="wb-breadcrumb">Dashboard / Project Manager Workbench (DASH-002)</div>
            <h1 className="wb-title">
              <FolderKanban size={18} color="#0755e9" />
              Project Manager Dashboard
            </h1>
            <div className="wb-subtitle">
              Live delivery tracking across projects, sprints, milestones, workload, defects &amp; approvals
            </div>
          </div>

          <div className="wb-header-actions">
            <DashboardRoleTabs active="pm" />
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

        {/* KPI Row */}
        <div className="wb-kpi-grid">
          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">Active Projects</span>
              <span className="wb-kpi-icon"><FolderKanban size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k?.totalProjects ?? "—"}</div>
            <div className="wb-kpi-sub">Tracked in delivery scope</div>
          </div>

          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">Overall Progress</span>
              <span className="wb-kpi-icon green"><TrendingUp size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k ? `${k.overallProgress}%` : "—"}</div>
            <div className="wb-kpi-sub">Weighted across projects</div>
          </div>

          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">Tasks Completed</span>
              <span className="wb-kpi-icon"><CheckSquare size={14} /></span>
            </div>
            <div className="wb-kpi-value">
              {k ? `${k.completedTasks}/${k.totalTasks}` : "—"}
            </div>
            <div className="wb-kpi-sub">Total delivery backlog</div>
          </div>

          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">Overdue Tasks</span>
              <span className="wb-kpi-icon red"><AlertTriangle size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k?.overdueTasks ?? "—"}</div>
            <div className="wb-kpi-sub">Past target due date</div>
          </div>

          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">Open Bugs</span>
              <span className="wb-kpi-icon amber"><Bug size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k?.openBugs ?? "—"}</div>
            <div className="wb-kpi-sub">Active QA defects</div>
          </div>

          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">Team Utilization</span>
              <span className="wb-kpi-icon purple"><Users size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k ? `${k.teamUtilization}%` : "—"}</div>
            <div className="wb-kpi-sub">Average resource load</div>
          </div>

          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">Pending Approvals</span>
              <span className="wb-kpi-icon amber"><ClipboardCheck size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k?.pendingApprovals ?? "—"}</div>
            <div className="wb-kpi-sub">
              <Link href="/approvals" className="wb-card-link">Review queue →</Link>
            </div>
          </div>
        </div>

        {/* Row 2: Donuts + Active Sprints */}
        <div className="wb-grid-3">
          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">Projects Health Summary</span>
              <Link href="/projects" className="wb-card-link">All Projects</Link>
            </div>
            <DonutBreakdown
              slices={data?.projectsSummary || []}
              centerLabel="Projects"
              centerValue={k?.totalProjects ?? 0}
            />
          </div>

          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">Tasks by Status</span>
              <Link href="/tasks" className="wb-card-link">Task Board</Link>
            </div>
            <DonutBreakdown
              slices={data?.tasksByStatus || []}
              centerLabel="Tasks"
              centerValue={k?.totalTasks ?? 0}
            />
          </div>

          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">
                <Zap size={13} color="#0755e9" /> Active Sprints
              </span>
              <Link href="/sprints" className="wb-card-link">Sprints</Link>
            </div>
            {data?.activeSprints?.length ? (
              <div className="wb-bar-list">
                {data.activeSprints.map((sp) => (
                  <div key={sp._id} className="wb-bar-row">
                    <div className="wb-bar-meta">
                      <strong>{sp.name}</strong>
                      <span>{sp.completedPoints}/{sp.plannedPoints} pts ({sp.progressPct}%)</span>
                    </div>
                    <div className="wb-bar-track">
                      <div className="wb-bar-fill" style={{ width: `${sp.progressPct}%` }} />
                    </div>
                    <div style={{ fontSize: 10, color: "#64748b", display: "flex", justifyContent: "space-between" }}>
                      <span>{sp.projectName}</span>
                      <span>Ends {formatShortDate(sp.endDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="wb-empty">No active sprints found for the selected scope.</div>
            )}
          </div>
        </div>

        {/* Row 3: Team Workload + Weekly Hours + Bugs by Severity */}
        <div className="wb-grid-3">
          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">
                <Users size={13} color="#0755e9" /> Team Workload
              </span>
              <Link href="/capacity" className="wb-card-link">Capacity</Link>
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
                          <strong>{m.name}</strong>{" "}
                          <span style={{ color: "#64748b" }}>({m.assignedTasks} tasks)</span>
                        </span>
                        <strong style={{ color }}>{m.utilization}%</strong>
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
              <div className="wb-empty">No team members assigned yet.</div>
            )}
          </div>

          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">
                <Clock3 size={13} color="#0755e9" /> Time Logged (Last 7 Days)
              </span>
              <span className="wb-badge wb-badge-blue">{data?.weeklyHoursTotal ?? 0}h</span>
            </div>
            <WeeklyHoursChart slots={data?.weeklyHours || []} />
          </div>

          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">
                <Bug size={13} color="#dc2626" /> Open Bugs by Severity
              </span>
              <Link href="/qa/bugs" className="wb-card-link">Bug Tracker</Link>
            </div>
            <DonutBreakdown
              slices={data?.bugsBySeverity || []}
              centerLabel="Open"
              centerValue={k?.openBugs ?? 0}
            />
          </div>
        </div>

        {/* Row 4: Overdue Tasks + Upcoming Milestones + Activity Feed */}
        <div className="wb-grid-12">
          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">
                <AlertTriangle size={13} color="#dc2626" /> Overdue Tasks
              </span>
              <Link href="/tasks" className="wb-card-link">View All Tasks</Link>
            </div>
            {data?.overdueTasks?.length ? (
              <div className="wb-table-wrap">
                <table className="wb-table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Project</th>
                      <th>Assignee</th>
                      <th>Priority</th>
                      <th>Delay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.overdueTasks.map((t) => (
                      <tr key={t._id}>
                        <td>
                          <strong>{t.title}</strong>
                          {t.code ? <div style={{ fontSize: 10, color: "#64748b" }}>{t.code}</div> : null}
                        </td>
                        <td>{t.projectName}</td>
                        <td>{t.assigneeName || "Unassigned"}</td>
                        <td><span className={priorityBadgeClass(t.priority)}>{t.priority}</span></td>
                        <td><span className="wb-badge wb-badge-red">{t.daysOverdue}d late</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="wb-empty">Zero overdue tasks — delivery schedule is on track!</div>
            )}
          </div>

          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">
                <Flag size={13} color="#0755e9" /> Upcoming Milestones
              </span>
              <Link href="/milestones" className="wb-card-link">Milestones</Link>
            </div>
            {data?.upcomingMilestones?.length ? (
              <div className="wb-bar-list">
                {data.upcomingMilestones.map((m) => (
                  <div key={m._id} className="wb-bar-row">
                    <div className="wb-bar-meta">
                      <strong>{m.title}</strong>
                      <span>{formatShortDate(m.targetDate)}</span>
                    </div>
                    <div className="wb-bar-track">
                      <div className="wb-bar-fill" style={{ width: `${m.progress}%`, background: "#079b62" }} />
                    </div>
                    <div style={{ fontSize: 10, color: "#64748b", display: "flex", justifyContent: "space-between" }}>
                      <span>{m.projectName}</span>
                      <span>{m.progress}% · {m.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="wb-empty">No upcoming milestones scheduled.</div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="wb-card">
          <div className="wb-card-head">
            <span className="wb-card-title">
              <Activity size={13} color="#0755e9" /> Recent Delivery &amp; Governance Activity
            </span>
            <Link href="/audit" className="wb-card-link">Audit Trail</Link>
          </div>
          {data?.recentActivity?.length ? (
            <div className="wb-table-wrap">
              <table className="wb-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Module</th>
                    <th>Actor</th>
                    <th>Outcome</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentActivity.map((a) => (
                    <tr key={a._id}>
                      <td><strong>{a.action}</strong></td>
                      <td>{a.module}</td>
                      <td>{a.actorName}</td>
                      <td>
                        <span className={a.outcome === "SUCCESS" ? "wb-badge wb-badge-green" : "wb-badge wb-badge-amber"}>
                          {a.outcome}
                        </span>
                      </td>
                      <td>{formatShortDate(a.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="wb-empty">No recent activity logged yet.</div>
          )}
        </div>
      </div>
    </Shell>
  );
}
