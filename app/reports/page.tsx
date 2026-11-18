"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  Users,
  Clock,
  Bug,
  FileText,
  Briefcase,
  Wallet,
  ClipboardCheck,
  ChevronRight,
  RefreshCw,
  Star,
  CalendarClock,
  Download,
  AlertTriangle,
  Play,
} from "lucide-react";
import { reportsApi, formatShortDate, reportRouteForType } from "@/lib/reports/api";
import "@/components/reports/reports.css";

export default function ReportCenterPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportsApi.overview();
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load Report Center");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const counts = data?.counts || {};
  const savedViews: any[] = data?.savedViews || [];
  const schedules: any[] = data?.schedules || [];
  const recentExports: any[] = data?.recentExports || [];

  const categories = [
    {
      title: "Project Reports",
      desc: "Project progress, milestone delivery, task completion & health",
      href: "/reports/projects",
      metric: `${counts.projects ?? 0} Projects · ${counts.milestones ?? 0} Milestones`,
      icon: BarChart3,
      accent: "#0755e9",
      bg: "#eff6ff",
    },
    {
      title: "Resource Reports",
      desc: "Resource utilization, allocation vs capacity & bench availability",
      href: "/reports/resources",
      metric: `${counts.resources ?? 0} Team Resources`,
      icon: Users,
      accent: "#0284c7",
      bg: "#f0f9ff",
    },
    {
      title: "Timesheet Reports",
      desc: "Logged hours, billable vs non-billable & submission compliance",
      href: "/reports/timesheets",
      metric: `${counts.timesheets ?? 0} Timesheet Sheets`,
      icon: Clock,
      accent: "#7c3aed",
      bg: "#f5f3ff",
    },
    {
      title: "QA & Defect Analytics",
      desc: "Bug status, severity, aging, resolution speed & test pass rate",
      href: "/reports/qa",
      metric: `${counts.bugs ?? 0} Bugs · ${counts.testCases ?? 0} Test Cases`,
      icon: Bug,
      accent: "#dc2626",
      bg: "#fef2f2",
    },
    {
      title: "Task & Delivery Reports",
      desc: "Task status distribution across projects and milestones",
      href: "/reports/projects",
      metric: `${counts.tasks ?? 0} Total Tasks`,
      icon: ClipboardCheck,
      accent: "#ea580c",
      bg: "#fff7ed",
    },
    {
      title: "Financial & Budget",
      desc: "Budget vs actual cost tracking across active projects",
      href: "/reports/projects",
      metric: `${counts.projects ?? 0} Project Budgets`,
      icon: Wallet,
      accent: "#059669",
      bg: "#ecfdf5",
    },
    {
      title: "Client Delivery Reports",
      desc: "Client-wise project status, milestones & delivery summary",
      href: "/reports/projects",
      metric: `${counts.clients ?? 0} Active Clients`,
      icon: Briefcase,
      accent: "#db2777",
      bg: "#fdf2f8",
    },
    {
      title: "Document Governance",
      desc: "Repository inventory, categories, approvals & versions",
      href: "/documents/categories",
      metric: `${counts.documents ?? 0} Managed Documents`,
      icon: FileText,
      accent: "#475569",
      bg: "#f1f5f9",
    },
  ].filter(
    (c) =>
      !search.trim() ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rpt-page">
      <div>
        <div className="rpt-breadcrumb">
          <span>Reports &amp; Analytics</span>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Report Center</span>
        </div>
        <div className="rpt-header">
          <div>
            <h1 className="rpt-title">Report Center</h1>
            <p className="rpt-subtitle">
              Real-time analytics across projects, resources, timesheets, QA quality, and documents with live exports &amp; schedules.
            </p>
          </div>
          <div className="rpt-actions">
            <input
              className="rpt-input"
              placeholder="Search report categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="button" className="rpt-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <Link href="/reports/saved" className="rpt-btn rpt-btn-primary">
              <CalendarClock size={12} /> Saved &amp; Schedules
            </Link>
          </div>
        </div>
      </div>

      {/* Subnav */}
      <div className="rpt-subnav">
        <Link href="/reports" className="rpt-subnav-link active">Report Center</Link>
        <Link href="/reports/projects" className="rpt-subnav-link">Project Performance</Link>
        <Link href="/reports/resources" className="rpt-subnav-link">Resource Utilization</Link>
        <Link href="/reports/timesheets" className="rpt-subnav-link">Timesheet &amp; Productivity</Link>
        <Link href="/reports/qa" className="rpt-subnav-link">QA &amp; Defect Analytics</Link>
        <Link href="/reports/saved" className="rpt-subnav-link">Saved, Schedules &amp; Exports</Link>
      </div>

      {error && <div className="rpt-alert rpt-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* Executive KPI Strip */}
      <div className="rpt-kpi-grid">
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><BarChart3 size={16} /></div><div><span className="rpt-kpi-label">Projects</span><span className="rpt-kpi-val">{counts.projects ?? 0}</span></div></div>
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#f0f9ff", color: "#0284c7" }}><Users size={16} /></div><div><span className="rpt-kpi-label">Resources</span><span className="rpt-kpi-val">{counts.resources ?? 0}</span></div></div>
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><Bug size={16} /></div><div><span className="rpt-kpi-label">Tracked Bugs</span><span className="rpt-kpi-val">{counts.bugs ?? 0}</span></div></div>
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#fffbeb", color: "#d97706" }}><Star size={16} /></div><div><span className="rpt-kpi-label">Saved Views</span><span className="rpt-kpi-val">{counts.savedViews ?? 0}</span></div></div>
        <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: "#ecfdf5", color: "#047857" }}><CalendarClock size={16} /></div><div><span className="rpt-kpi-label">Active Schedules</span><span className="rpt-kpi-val">{counts.activeSchedules ?? 0}</span></div></div>
      </div>

      {/* 8 Report Category Cards (RPT-001 Panel 1) */}
      <div className="rpt-grid-4">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.title} className="rpt-card" style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="rpt-kpi-icon" style={{ background: cat.bg, color: cat.accent }}>
                  <Icon size={16} />
                </div>
                <span className="rpt-badge rpt-badge-slate">{cat.metric}</span>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12.5 }}>{cat.title}</div>
                <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 2 }}>{cat.desc}</div>
              </div>
              <Link href={cat.href} className="rpt-btn rpt-btn-primary rpt-btn-sm" style={{ marginTop: "auto", width: "fit-content" }}>
                <Play size={11} /> Run Report
              </Link>
            </div>
          );
        })}
      </div>

      {/* Saved Views & Recent Exports Snapshot */}
      <div className="rpt-grid-2">
        <div className="rpt-card">
          <div className="rpt-card-head">
            <h3 className="rpt-card-title">Saved Report Views ({savedViews.length})</h3>
            <Link href="/reports/saved" style={{ fontSize: 11, color: "#0755e9", fontWeight: 600, textDecoration: "none" }}>
              Manage All →
            </Link>
          </div>
          {savedViews.length === 0 ? (
            <div className="rpt-empty">No saved views yet. Open any report and click <strong>Save View</strong>.</div>
          ) : (
            <div className="rpt-table-wrap">
              <table className="rpt-table">
                <thead>
                  <tr><th>View Name</th><th>Category</th><th>Created</th><th></th></tr>
                </thead>
                <tbody>
                  {savedViews.slice(0, 5).map((v) => (
                    <tr key={v._id}>
                      <td style={{ fontWeight: 600 }}>
                        {v.isFavorite && <Star size={11} color="#f59e0b" fill="#f59e0b" style={{ display: "inline", marginRight: 4 }} />}
                        {v.name}
                      </td>
                      <td><span className="rpt-badge rpt-badge-blue">{v.category}</span></td>
                      <td style={{ color: "#64748b" }}>{formatShortDate(v.createdAt)}</td>
                      <td style={{ textAlign: "right" }}>
                        <Link href={reportRouteForType(v.reportType)} className="rpt-btn rpt-btn-sm">Run</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rpt-card">
          <div className="rpt-card-head">
            <h3 className="rpt-card-title">Recent Export Audit Log ({recentExports.length})</h3>
            <Link href="/reports/saved" style={{ fontSize: 11, color: "#0755e9", fontWeight: 600, textDecoration: "none" }}>
              Full Audit Log →
            </Link>
          </div>
          {recentExports.length === 0 ? (
            <div className="rpt-empty">No exports recorded yet. Export any report as CSV, JSON, or PDF.</div>
          ) : (
            <div className="rpt-table-wrap">
              <table className="rpt-table">
                <thead>
                  <tr><th>Report</th><th>Format</th><th>Rows</th><th>By</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {recentExports.slice(0, 5).map((ex) => (
                    <tr key={ex._id}>
                      <td style={{ fontWeight: 600 }}>{ex.reportName}</td>
                      <td><span className="rpt-badge rpt-badge-purple"><Download size={9} /> {ex.format}</span></td>
                      <td>{ex.rowCount}</td>
                      <td>{ex.exportedByName}</td>
                      <td style={{ color: "#64748b", whiteSpace: "nowrap" }}>{formatShortDate(ex.exportedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Active Schedules Preview */}
      {schedules.length > 0 && (
        <div className="rpt-card">
          <div className="rpt-card-head">
            <h3 className="rpt-card-title">Active Scheduled Deliveries ({schedules.filter((s) => s.enabled).length})</h3>
            <Link href="/reports/saved" style={{ fontSize: 11, color: "#0755e9", fontWeight: 600, textDecoration: "none" }}>
              Configure →
            </Link>
          </div>
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead>
                <tr><th>Schedule Name</th><th>Frequency</th><th>Format</th><th>Recipients</th><th>Status</th></tr>
              </thead>
              <tbody>
                {schedules.slice(0, 4).map((sc) => (
                  <tr key={sc._id}>
                    <td style={{ fontWeight: 600 }}>{sc.name}</td>
                    <td>{sc.frequency} · {sc.dayOfWeek} {sc.timeOfDay}</td>
                    <td><span className="rpt-badge rpt-badge-blue">{sc.format}</span></td>
                    <td>{(sc.recipients || []).join(", ") || "—"}</td>
                    <td><span className={sc.enabled ? "rpt-badge rpt-badge-green" : "rpt-badge rpt-badge-slate"}>{sc.enabled ? "Enabled" : "Paused"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
