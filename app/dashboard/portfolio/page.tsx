"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  FolderKanban,
  TrendingUp,
  AlertOctagon,
  WalletCards,
  Users,
  RefreshCw,
  Flag,
  Bug,
} from "lucide-react";
import { Shell } from "@/components/Shell";
import {
  dashboardWorkbenchApi,
  formatInrCompact,
  formatShortDate,
  type PortfolioDashboardData,
} from "@/lib/dashboard/workbenchApi";
import {
  DashboardRoleTabs,
  DonutBreakdown,
  healthBadgeClass,
} from "@/components/dashboard/WorkbenchShared";
import "@/components/dashboard/workbench.css";

export default function ManagementPortfolioDashboardPage() {
  const [data, setData] = useState<PortfolioDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardWorkbenchApi.getPortfolio();
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load Portfolio Dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const k = data?.kpis;
  const maxStatusCount = Math.max(
    1,
    ...(data?.projectStatusBreakdown || []).map((x) => x.count)
  );

  return (
    <Shell>
      <div className="wb-page">
        <div className="wb-header">
          <div className="wb-title-wrap">
            <div className="wb-breadcrumb">Dashboard / Management Portfolio (DASH-005)</div>
            <h1 className="wb-title">
              <Briefcase size={18} color="#0755e9" />
              Management Portfolio Dashboard
            </h1>
            <div className="wb-subtitle">
              Executive oversight of portfolio health, budget burn vs contract value, risk exposure &amp; milestones
            </div>
          </div>

          <div className="wb-header-actions">
            <DashboardRoleTabs active="portfolio" />
            <button type="button" className="wb-btn" onClick={() => void load()} disabled={loading}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>

        {error && <div className="wb-error">{error}</div>}

        <div className="wb-kpi-grid">
          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">Total Projects</span>
              <span className="wb-kpi-icon"><FolderKanban size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k?.totalProjects ?? "—"}</div>
            <div className="wb-kpi-sub">{k?.activeProjects ?? 0} currently active</div>
          </div>

          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">Overall Progress</span>
              <span className="wb-kpi-icon green"><TrendingUp size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k ? `${k.overallProgress}%` : "—"}</div>
            <div className="wb-kpi-sub">Task completion: {k?.taskCompletionPct ?? 0}%</div>
          </div>

          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">Total Portfolio Value</span>
              <span className="wb-kpi-icon"><WalletCards size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k ? formatInrCompact(k.totalBudget) : "—"}</div>
            <div className="wb-kpi-sub">Approved contract / budget</div>
          </div>

          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">Actual Spend</span>
              <span className="wb-kpi-icon purple"><WalletCards size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k ? formatInrCompact(k.actualSpend) : "—"}</div>
            <div className="wb-kpi-sub">{k?.budgetUtilizationPct ?? 0}% budget utilized</div>
          </div>

          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">Risks &amp; Open Bugs</span>
              <span className="wb-kpi-icon red"><AlertOctagon size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k?.openRisksAndBugs ?? "—"}</div>
            <div className="wb-kpi-sub">At-risk projects + open QA bugs</div>
          </div>

          <div className="wb-kpi-card">
            <div className="wb-kpi-top">
              <span className="wb-kpi-label">Active Workforce</span>
              <span className="wb-kpi-icon green"><Users size={14} /></span>
            </div>
            <div className="wb-kpi-value">{k?.headcount ?? "—"}</div>
            <div className="wb-kpi-sub">Active employees across org</div>
          </div>
        </div>

        {/* Row 2: Portfolio Health + Budget Utilization + Project Status Distribution */}
        <div className="wb-grid-3">
          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">Portfolio Health (RAG)</span>
              <Link href="/projects/health" className="wb-card-link">Health Matrix</Link>
            </div>
            <DonutBreakdown
              slices={data?.portfolioHealth || []}
              centerLabel="Projects"
              centerValue={k?.totalProjects ?? 0}
            />
          </div>

          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">Budget Utilization Overview</span>
              <Link href="/projects/financials" className="wb-card-link">Financials</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 11.5, color: "#64748b", fontWeight: 600 }}>Burn Rate</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: (k?.budgetUtilizationPct ?? 0) > 95 ? "#dc2626" : "#0755e9" }}>
                  {k?.budgetUtilizationPct ?? 0}%
                </span>
              </div>
              <div className="wb-bar-track" style={{ height: 11 }}>
                <div
                  className="wb-bar-fill"
                  style={{
                    width: `${Math.min(100, k?.budgetUtilizationPct ?? 0)}%`,
                    background: (k?.budgetUtilizationPct ?? 0) > 95 ? "#dc2626" : "#0755e9",
                  }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                <div style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>TOTAL BUDGET</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>{formatInrCompact(k?.totalBudget ?? 0)}</div>
                </div>
                <div style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>ACTUAL SPEND</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>{formatInrCompact(k?.actualSpend ?? 0)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">Projects by Lifecycle Status</span>
              <Link href="/reports/projects" className="wb-card-link">Report</Link>
            </div>
            {data?.projectStatusBreakdown?.length ? (
              <div className="wb-bar-list">
                {data.projectStatusBreakdown.map((s) => (
                  <div key={s.status} className="wb-bar-row">
                    <div className="wb-bar-meta">
                      <span>{s.label}</span>
                      <strong>{s.count}</strong>
                    </div>
                    <div className="wb-bar-track">
                      <div
                        className="wb-bar-fill"
                        style={{ width: `${Math.round((s.count / maxStatusCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="wb-empty">No project statuses recorded yet.</div>
            )}
          </div>
        </div>

        {/* Row 3: Top Projects Table + Risks/Bugs + Upcoming Milestones */}
        <div className="wb-grid-12">
          <div className="wb-card">
            <div className="wb-card-head">
              <span className="wb-card-title">Portfolio Projects by Progress &amp; Value</span>
              <Link href="/projects" className="wb-card-link">Project Registry</Link>
            </div>
            {data?.topProjects?.length ? (
              <div className="wb-table-wrap">
                <table className="wb-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Health</th>
                      <th>Progress</th>
                      <th>Budget</th>
                      <th>Target End</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProjects.map((p) => (
                      <tr key={p._id}>
                        <td>
                          <strong>{p.name}</strong>
                          {p.code ? <div style={{ fontSize: 10, color: "#64748b" }}>{p.code}</div> : null}
                        </td>
                        <td><span className={healthBadgeClass(p.health)}>{p.health.replace(/_/g, " ")}</span></td>
                        <td style={{ minWidth: 110 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div className="wb-bar-track" style={{ flex: 1 }}>
                              <div className="wb-bar-fill" style={{ width: `${p.progress}%`, background: "#079b62" }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700 }}>{p.progress}%</span>
                          </div>
                        </td>
                        <td>{formatInrCompact(p.budget)}</td>
                        <td>{formatShortDate(p.targetCompletion)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="wb-empty">No projects found in portfolio.</div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="wb-card">
              <div className="wb-card-head">
                <span className="wb-card-title">
                  <Bug size={13} color="#dc2626" /> Quality Risk Exposure (Open Bugs)
                </span>
                <Link href="/reports/qa" className="wb-card-link">QA Report</Link>
              </div>
              <DonutBreakdown slices={data?.bugsBySeverity || []} centerLabel="Bugs" />
            </div>

            <div className="wb-card">
              <div className="wb-card-head">
                <span className="wb-card-title">
                  <Flag size={13} color="#0755e9" /> Key Executive Milestones
                </span>
                <Link href="/milestones" className="wb-card-link">All Milestones</Link>
              </div>
              {data?.upcomingMilestones?.length ? (
                <div className="wb-bar-list">
                  {data.upcomingMilestones.slice(0, 4).map((m) => (
                    <div key={m._id} className="wb-bar-row">
                      <div className="wb-bar-meta">
                        <strong>{m.title}</strong>
                        <span>{formatShortDate(m.targetDate)}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#64748b", display: "flex", justifyContent: "space-between" }}>
                        <span>{m.projectName}</span>
                        <span>{m.progress}% · {m.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="wb-empty">No milestones scheduled.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
