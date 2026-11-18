"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Users,
  AlertTriangle,
  Activity,
  Download,
  FileJson,
  RefreshCw,
  ChevronRight,
  Eye,
  Lock,
  Search,
} from "lucide-react";
import {
  auditApi,
  AuditEventItem,
  actorDisplay,
  formatDateTime,
  severityBadgeClass,
  outcomeBadgeClass,
  exportAuditCsv,
  exportAuditJson,
} from "@/lib/audit/api";
import "@/components/audit/audit.css";

export default function AuditExplorerPage() {
  const [summary, setSummary] = useState<any>(null);
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("ALL");
  const [outcome, setOutcome] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sum, listRes] = await Promise.all([
        auditApi.summary(days),
        auditApi.list({
          page,
          limit: 25,
          search: search.trim() || undefined,
          severity,
          outcome,
          category,
          from: fromDate || undefined,
          to: toDate || undefined,
        }),
      ]);
      setSummary(sum);
      setEvents(listRes.items);
      setPagination(listRes.pagination);
    } catch (e: any) {
      setError(e?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [days, severity, outcome, category, fromDate, toDate, page]);

  const kpis = summary?.kpis || {
    totalEvents: 0,
    usersInvolved: 0,
    criticalEvents: 0,
    dataChanges: 0,
    failedEvents: 0,
    openAlerts: 0,
  };
  const modules: { module: string; count: number; pct: number }[] = summary?.moduleBreakdown || [];
  const trend: { date: string; count: number }[] = summary?.dailyTrend || [];
  const maxTrend = Math.max(1, ...trend.map((t) => t.count));

  return (
    <div className="aud-page">
      <div>
        <div className="aud-breadcrumb">
          <span>Audit &amp; Compliance</span>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Audit Explorer</span>
        </div>
        <div className="aud-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h1 className="aud-title">Audit Explorer</h1>
              <span className="aud-badge aud-badge-green"><Lock size={10} /> Immutable Append-Only</span>
            </div>
            <p className="aud-subtitle">
              Track, search, and analyze tamper-evident system activities across all PH-PMS modules.
            </p>
          </div>
          <div className="aud-actions">
            <select className="aud-select" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
            </select>
            <button type="button" className="aud-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" className="aud-btn" onClick={() => exportAuditJson(events)} disabled={events.length === 0}>
              <FileJson size={12} /> JSON
            </button>
            <button type="button" className="aud-btn aud-btn-primary" onClick={() => exportAuditCsv(events)} disabled={events.length === 0}>
              <Download size={12} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Subnav */}
      <div className="aud-subnav">
        <Link href="/audit" className="aud-subnav-link active">Audit Explorer</Link>
        <Link href="/audit/security" className="aud-subnav-link">Security Activity &amp; Alerts</Link>
        <Link href="/audit/compliance" className="aud-subnav-link">Compliance &amp; Retention</Link>
      </div>

      {error && <div className="aud-alert aud-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* KPI Strip (AUD-001 Panel 1) */}
      <div className="aud-kpi-grid">
        <div className="aud-kpi"><div className="aud-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><ShieldCheck size={16} /></div><div><span className="aud-kpi-label">Total Events ({days}d)</span><span className="aud-kpi-val">{kpis.totalEvents}</span></div></div>
        <div className="aud-kpi"><div className="aud-kpi-icon" style={{ background: "#f0f9ff", color: "#0284c7" }}><Users size={16} /></div><div><span className="aud-kpi-label">Users Involved</span><span className="aud-kpi-val">{kpis.usersInvolved}</span></div></div>
        <div className="aud-kpi"><div className="aud-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><AlertTriangle size={16} /></div><div><span className="aud-kpi-label">High / Critical</span><span className="aud-kpi-val" style={{ color: "#dc2626" }}>{kpis.criticalEvents}</span></div></div>
        <div className="aud-kpi"><div className="aud-kpi-icon" style={{ background: "#ecfdf5", color: "#047857" }}><Activity size={16} /></div><div><span className="aud-kpi-label">Data Changes</span><span className="aud-kpi-val">{kpis.dataChanges}</span></div></div>
        <div className="aud-kpi"><div className="aud-kpi-icon" style={{ background: "#fffbeb", color: "#b45309" }}><Lock size={16} /></div><div><span className="aud-kpi-label">Open Security Alerts</span><span className="aud-kpi-val">{kpis.openAlerts}</span></div></div>
      </div>

      {/* Activity Trend + Module Summary */}
      <div className="aud-grid-2">
        <div className="aud-card">
          <h3 className="aud-card-title" style={{ marginBottom: 10 }}>14-Day Activity Trend</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 105, paddingTop: 10 }}>
            {trend.map((t) => {
              const h = Math.max(4, Math.round((t.count / maxTrend) * 84));
              return (
                <div key={t.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }} title={`${t.date}: ${t.count} events`}>
                  <div style={{ width: "100%", height: h, background: t.count > 0 ? "#0755e9" : "#e5ecf5", borderRadius: "4px 4px 0 0" }} />
                  <span style={{ fontSize: 8.5, color: "#64748b" }}>{t.date.slice(8)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="aud-card">
          <h3 className="aud-card-title" style={{ marginBottom: 10 }}>Top Modules by Audit Volume</h3>
          {modules.length === 0 ? (
            <div className="aud-empty">No module events recorded in this period.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {modules.map((m) => (
                <div key={m.module}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                    <strong>{m.module}</strong>
                    <span>{m.count} ({m.pct}%)</span>
                  </div>
                  <div className="aud-bar-track">
                    <div className="aud-bar-fill" style={{ width: `${m.pct}%`, background: "#0755e9" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Multi-Filter Bar (AUD-001 Panel 3) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          loadData();
        }}
        className="aud-filter-bar"
      >
        <div style={{ position: "relative", flex: 1, minWidth: 190 }}>
          <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            className="aud-input"
            style={{ width: "100%", paddingLeft: 28 }}
            placeholder="Search by event ID, user, action, resource, IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="aud-select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="ALL">All Categories</option>
          <option value="SECURITY">Security</option>
          <option value="ACCESS_CONTROL">Access Control</option>
          <option value="DATA_CHANGE">Data Change</option>
          <option value="APPROVAL">Approval</option>
          <option value="EXPORT">Export</option>
          <option value="SYSTEM">System</option>
        </select>
        <select className="aud-select" value={severity} onChange={(e) => { setSeverity(e.target.value); setPage(1); }}>
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
          <option value="INFO">Info</option>
        </select>
        <select className="aud-select" value={outcome} onChange={(e) => { setOutcome(e.target.value); setPage(1); }}>
          <option value="ALL">All Outcomes</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILURE">Failure</option>
          <option value="WARNING">Warning</option>
          <option value="BLOCKED">Blocked</option>
        </select>
        <input type="date" className="aud-input" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
        <input type="date" className="aud-input" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
        <button type="submit" className="aud-btn aud-btn-primary aud-btn-sm">Search</button>
        <button
          type="button"
          className="aud-btn aud-btn-sm"
          onClick={() => { setSearch(""); setCategory("ALL"); setSeverity("ALL"); setOutcome("ALL"); setFromDate(""); setToDate(""); setPage(1); }}
        >
          Reset
        </button>
      </form>

      {/* Audit Log Table */}
      <div className="aud-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="aud-table-wrap">
          <table className="aud-table">
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Module / Resource</th>
                <th>Details</th>
                <th>IP Address</th>
                <th>Severity</th>
                <th>Outcome</th>
                <th style={{ textAlign: "right" }}>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="aud-empty">Loading immutable audit log...</td></tr>
              ) : events.length === 0 ? (
                <tr><td colSpan={9} className="aud-empty">No audit events match your filters.</td></tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev._id}>
                    <td style={{ whiteSpace: "nowrap", color: "#64748b" }}>{formatDateTime(ev.createdAt)}</td>
                    <td style={{ fontWeight: 600 }}>{actorDisplay(ev)}</td>
                    <td><span className="aud-badge aud-badge-blue">{ev.action}</span></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ev.module || ev.resourceType}</div>
                      {ev.resourceId && <div style={{ fontSize: 10, color: "#64748b" }}>{ev.resourceId}</div>}
                    </td>
                    <td style={{ maxWidth: 250 }}>{ev.description || ev.resourceType}</td>
                    <td style={{ fontFamily: "ui-monospace, monospace", fontSize: 10.5 }}>{ev.ipAddress || "—"}</td>
                    <td><span className={severityBadgeClass(ev.severity)}>{ev.severity || "INFO"}</span></td>
                    <td><span className={outcomeBadgeClass(ev.outcome)}>{ev.outcome}</span></td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/audit/${ev._id}`} className="aud-btn aud-btn-sm">
                        <Eye size={11} /> View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 13px", borderTop: "1px solid #e3eaf4", background: "#f8fafd", fontSize: 11 }}>
          <span style={{ color: "#64748b" }}>
            Showing page <strong>{pagination.page}</strong> of <strong>{Math.max(1, pagination.pages)}</strong> ({pagination.total} total records)
          </span>
          <div className="aud-actions">
            <button type="button" className="aud-btn aud-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </button>
            <button type="button" className="aud-btn aud-btn-sm" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
