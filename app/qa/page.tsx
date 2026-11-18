"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  CheckCircle2,
  Bug,
  Activity,
  Plus,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  qaDashboardApi,
  qaLookupApi,
  formatShortDate,
  formatBugStatus,
  statusBadgeClass,
} from "@/lib/qa/api";
import "@/components/qa/qa.css";

export default function QaDashboardPage() {
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [projects, setProjects] = useState<{ _id: string; projectName: string }[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, projList] = await Promise.all([
        qaDashboardApi.get({ projectId: projectFilter !== "ALL" ? projectFilter : undefined }),
        qaLookupApi.projects().catch(() => []),
      ]);
      setData(dash);
      setProjects(projList);
    } catch (e: any) {
      setError(e?.message || "Failed to load QA dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectFilter]);

  const kpis = data?.kpis || {
    totalTestCases: 0,
    totalTestRuns: 0,
    executed: 0,
    passRate: 0,
    totalBugs: 0,
    openBugs: 0,
    criticalBugs: 0,
    avgResolutionDays: 0,
  };
  const exec = data?.executionBreakdown || { passed: 0, failed: 0, blocked: 0, notRun: 0 };
  const sev = data?.bugBySeverity || { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  const bugSt = data?.bugByStatus || { open: 0, inProgress: 0, resolved: 0, closed: 0 };
  const projectSummary: any[] = data?.projectSummary || [];
  const moduleSummary: any[] = data?.moduleSummary || [];
  const recentActivity: any[] = data?.recentActivity || [];

  const r = 38;
  const circ = 2 * Math.PI * r;
  const passArc = (Math.min(100, kpis.passRate) / 100) * circ;
  const openRatio = kpis.totalBugs > 0 ? Math.round((bugSt.open / kpis.totalBugs) * 100) : 0;
  const openArc = (openRatio / 100) * circ;

  return (
    <div className="qa-page">
      {/* Header */}
      <div>
        <div className="qa-breadcrumb">
          <span>QA &amp; Bug Management</span>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>QA Dashboard</span>
        </div>
        <div className="qa-header">
          <div>
            <h1 className="qa-title">QA Dashboard</h1>
            <p className="qa-subtitle">Track test case coverage, execution pass rates, bug severity trends, and release quality across projects.</p>
          </div>
          <div className="qa-actions">
            <select className="qa-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="ALL">All Projects</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
            </select>
            <button type="button" className="qa-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <Link href="/qa/test-cases/new" className="qa-btn">
              <Plus size={13} /> Test Case
            </Link>
            <Link href="/qa/bugs/new" className="qa-btn qa-btn-primary">
              <Plus size={13} /> Report Bug
            </Link>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="qa-subnav">
        <Link href="/qa" className="qa-subnav-link active">QA Dashboard</Link>
        <Link href="/qa/test-cases" className="qa-subnav-link">Test Cases</Link>
        <Link href="/qa/test-cases/new" className="qa-subnav-link">Create Test Case</Link>
        <Link href="/qa/test-runs" className="qa-subnav-link">Test Runs</Link>
        <Link href="/qa/bugs" className="qa-subnav-link">Bug Registry</Link>
        <Link href="/qa/bugs/new" className="qa-subnav-link">Report Bug</Link>
      </div>

      {error && <div className="qa-alert qa-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* KPI Strip matching QA-007 Panel 1 */}
      <div className="qa-kpi-grid">
        <div className="qa-kpi">
          <div className="qa-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><ClipboardCheck size={16} /></div>
          <div><span className="qa-kpi-label">Total Test Cases</span><span className="qa-kpi-val">{kpis.totalTestCases}</span></div>
        </div>
        <div className="qa-kpi">
          <div className="qa-kpi-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}><Activity size={16} /></div>
          <div><span className="qa-kpi-label">Executed ({kpis.totalTestRuns} Runs)</span><span className="qa-kpi-val">{kpis.executed}</span></div>
        </div>
        <div className="qa-kpi">
          <div className="qa-kpi-icon" style={{ background: "#ecfdf5", color: "#079b62" }}><CheckCircle2 size={16} /></div>
          <div><span className="qa-kpi-label">Pass Rate</span><span className="qa-kpi-val" style={{ color: "#079b62" }}>{kpis.passRate}%</span></div>
        </div>
        <div className="qa-kpi">
          <div className="qa-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><Bug size={16} /></div>
          <div><span className="qa-kpi-label">Total Bugs ({kpis.openBugs} Open)</span><span className="qa-kpi-val">{kpis.totalBugs}</span></div>
        </div>
        <div className="qa-kpi">
          <div className="qa-kpi-icon" style={{ background: "#fffbeb", color: "#d97706" }}><Clock size={16} /></div>
          <div><span className="qa-kpi-label">Avg Resolution</span><span className="qa-kpi-val">{kpis.avgResolutionDays}d</span></div>
        </div>
      </div>

      {/* Row 1 Visuals: Test Execution Donut + Bug Status Donut + Bug Severity Bars */}
      <div className="qa-grid-3">
        <div className="qa-card">
          <div className="qa-card-head"><h3 className="qa-card-title">Test Execution Status</h3></div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r={r} fill="none" stroke="#e2e8f0" strokeWidth="11" />
              <circle cx="48" cy="48" r={r} fill="none" stroke="#079b62" strokeWidth="11" strokeDasharray={`${passArc} ${circ}`} strokeLinecap="round" transform="rotate(-90 48 48)" />
              <text x="48" y="47" textAnchor="middle" fontSize="13" fontWeight="700" fill="#10204a">{kpis.executed}</text>
              <text x="48" y="59" textAnchor="middle" fontSize="8.5" fill="#64748b">Executed</text>
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
              <div><strong style={{ color: "#079b62" }}>● Passed:</strong> {exec.passed}</div>
              <div><strong style={{ color: "#dc2626" }}>● Failed:</strong> {exec.failed}</div>
              <div><strong style={{ color: "#d97706" }}>● Blocked:</strong> {exec.blocked}</div>
              <div><strong style={{ color: "#64748b" }}>● Not Run:</strong> {exec.notRun}</div>
            </div>
          </div>
        </div>

        <div className="qa-card">
          <div className="qa-card-head"><h3 className="qa-card-title">Bug Status</h3></div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r={r} fill="none" stroke="#079b62" strokeWidth="11" />
              <circle cx="48" cy="48" r={r} fill="none" stroke="#dc2626" strokeWidth="11" strokeDasharray={`${openArc} ${circ}`} transform="rotate(-90 48 48)" />
              <text x="48" y="47" textAnchor="middle" fontSize="13" fontWeight="700" fill="#10204a">{kpis.totalBugs}</text>
              <text x="48" y="59" textAnchor="middle" fontSize="8.5" fill="#64748b">Bugs</text>
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
              <div><strong style={{ color: "#dc2626" }}>● Open:</strong> {bugSt.open}</div>
              <div><strong style={{ color: "#0755e9" }}>● In Progress / Retest:</strong> {bugSt.inProgress}</div>
              <div><strong style={{ color: "#079b62" }}>● Fixed:</strong> {bugSt.resolved}</div>
              <div><strong style={{ color: "#64748b" }}>● Closed:</strong> {bugSt.closed}</div>
            </div>
          </div>
        </div>

        <div className="qa-card">
          <div className="qa-card-head"><h3 className="qa-card-title">Bugs by Severity</h3></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "Critical", val: sev.CRITICAL, color: "#dc2626" },
              { label: "High", val: sev.HIGH, color: "#ea580c" },
              { label: "Medium", val: sev.MEDIUM, color: "#f59e0b" },
              { label: "Low", val: sev.LOW, color: "#64748b" },
            ].map((row) => (
              <div key={row.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginBottom: 2 }}>
                  <span style={{ fontWeight: 600 }}>{row.label}</span>
                  <strong>{row.val}</strong>
                </div>
                <div className="qa-bar-track">
                  <div className="qa-bar-fill" style={{ width: `${kpis.totalBugs > 0 ? Math.round((row.val / kpis.totalBugs) * 100) : 0}%`, background: row.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Project-Wise QA Summary + Module-Wise QA Status */}
      <div className="qa-grid-2">
        <div className="qa-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4" }}>
            <h3 className="qa-card-title">Project-Wise QA Summary</h3>
          </div>
          <div className="qa-table-wrap">
            <table className="qa-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Test Cases</th>
                  <th>Pass %</th>
                  <th>Open Bugs</th>
                  <th>Closed</th>
                </tr>
              </thead>
              <tbody>
                {projectSummary.length === 0 ? (
                  <tr><td colSpan={5} className="qa-empty">No project QA data yet.</td></tr>
                ) : (
                  projectSummary.map((p) => (
                    <tr key={p.projectId}>
                      <td><strong>{p.projectName}</strong></td>
                      <td>{p.totalTestCases}</td>
                      <td><span className="qa-badge qa-badge-green">{p.passRate}%</span></td>
                      <td style={{ color: p.openBugs > 0 ? "#dc2626" : "#64748b", fontWeight: 700 }}>{p.openBugs}</td>
                      <td>{p.closedBugs}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="qa-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4" }}>
            <h3 className="qa-card-title">Module-Wise QA Status</h3>
          </div>
          <div className="qa-table-wrap">
            <table className="qa-table">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Test Cases</th>
                  <th>Approved</th>
                  <th>Open Bugs</th>
                  <th>Total Bugs</th>
                </tr>
              </thead>
              <tbody>
                {moduleSummary.length === 0 ? (
                  <tr><td colSpan={5} className="qa-empty">Create test cases or report bugs to see module breakdown.</td></tr>
                ) : (
                  moduleSummary.map((m) => (
                    <tr key={m.module}>
                      <td><strong>{m.module}</strong></td>
                      <td>{m.totalTestCases}</td>
                      <td>{m.approvedTestCases}</td>
                      <td style={{ color: m.openBugs > 0 ? "#dc2626" : "#64748b", fontWeight: 700 }}>{m.openBugs}</td>
                      <td>{m.totalBugs}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="qa-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="qa-card-title">Recent QA Activity</h3>
          <div style={{ display: "flex", gap: 6 }}>
            <Link href="/qa/test-runs" className="qa-btn qa-btn-sm">Test Runs</Link>
            <Link href="/qa/bugs" className="qa-btn qa-btn-sm">All Bugs</Link>
          </div>
        </div>
        <div className="qa-table-wrap">
          <table className="qa-table">
            <thead><tr><th>Type</th><th>Item</th><th>Status</th><th>By</th><th>Updated</th></tr></thead>
            <tbody>
              {recentActivity.length === 0 ? (
                <tr><td colSpan={5} className="qa-empty">No recent QA activity recorded yet.</td></tr>
              ) : (
                recentActivity.map((act, i) => (
                  <tr key={i}>
                    <td><span className="qa-badge qa-badge-slate">{act.type}</span></td>
                    <td><Link href={act.href} style={{ fontWeight: 600, color: "#0755e9", textDecoration: "none" }}>{act.title}</Link></td>
                    <td><span className={statusBadgeClass(act.status)}>{formatBugStatus(act.status)}</span></td>
                    <td>{act.by}</td>
                    <td style={{ color: "#64748b" }}>{formatShortDate(act.timestamp)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
