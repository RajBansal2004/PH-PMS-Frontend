"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Terminal,
  Clock,
} from "lucide-react";
import {
  integrationsApi,
  formatDateTime,
  intStatusBadgeClass,
  downloadCsv,
} from "@/lib/integrations/api";
import "@/components/integrations/integrations.css";

export default function IntegrationLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [levelFilter, setLevelFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await integrationsApi.logs({
        logLevel: levelFilter,
        status: statusFilter,
        search: search.trim() || undefined,
      });
      setLogs(list);
      if (!selected && list.length > 0) setSelected(list[0]);
    } catch (e: any) {
      setError(e?.message || "Failed to load integration logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [levelFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = logs.length;
    const success = logs.filter((l) => l.status === "SUCCESS").length;
    const failed = logs.filter((l) => l.status === "FAILED").length;
    const warnings = logs.filter((l) => l.logLevel === "WARN").length;
    const avgMs = total > 0 ? Math.round(logs.reduce((s, l) => s + (l.responseTimeMs || 0), 0) / total) : 0;
    return { total, success, failed, warnings, avgMs };
  }, [logs]);

  return (
    <div className="int-page">
      <div>
        <div className="int-breadcrumb">
          <Link href="/integrations">Integration Center</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Integration Logs</span>
        </div>
        <div className="int-header">
          <div>
            <h1 className="int-title">Integration Logs &amp; Telemetry</h1>
            <p className="int-subtitle">
              Inspect API calls, webhook deliveries, latency metrics, and structured request/response payloads.
            </p>
          </div>
          <div className="int-actions">
            <button type="button" className="int-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              type="button"
              className="int-btn int-btn-primary"
              disabled={logs.length === 0}
              onClick={() =>
                downloadCsv(
                  "integration-logs",
                  ["Request ID", "Timestamp", "Integration", "Operation", "Level", "Status", "Response (ms)", "Message"],
                  logs.map((l) => [l.requestId, formatDateTime(l.createdAt), l.integrationName, l.operation, l.logLevel, l.status, l.responseTimeMs, l.message])
                )
              }
            >
              <Download size={12} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Subnav */}
      <div className="int-subnav">
        <Link href="/integrations" className="int-subnav-link">Marketplace</Link>
        <Link href="/integrations/status" className="int-subnav-link">Connection Status</Link>
        <Link href="/integrations/sync-history" className="int-subnav-link">Sync History</Link>
        <Link href="/integrations/logs" className="int-subnav-link active">Integration Logs</Link>
      </div>

      {error && <div className="int-alert int-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* KPIs (INT-005 Panel 1) */}
      <div className="int-kpi-grid">
        <div className="int-kpi"><div className="int-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><Terminal size={16} /></div><div><span className="int-kpi-label">Total Logs</span><span className="int-kpi-val">{stats.total}</span></div></div>
        <div className="int-kpi"><div className="int-kpi-icon" style={{ background: "#ecfdf5", color: "#047857" }}><CheckCircle2 size={16} /></div><div><span className="int-kpi-label">Successful</span><span className="int-kpi-val" style={{ color: "#047857" }}>{stats.success}</span></div></div>
        <div className="int-kpi"><div className="int-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><AlertTriangle size={16} /></div><div><span className="int-kpi-label">Failed</span><span className="int-kpi-val" style={{ color: "#dc2626" }}>{stats.failed}</span></div></div>
        <div className="int-kpi"><div className="int-kpi-icon" style={{ background: "#fffbeb", color: "#b45309" }}><AlertTriangle size={16} /></div><div><span className="int-kpi-label">Warnings</span><span className="int-kpi-val">{stats.warnings}</span></div></div>
        <div className="int-kpi"><div className="int-kpi-icon" style={{ background: "#f5f3ff", color: "#6d28d9" }}><Clock size={16} /></div><div><span className="int-kpi-label">Avg Latency</span><span className="int-kpi-val">{stats.avgMs} ms</span></div></div>
      </div>

      {/* Filters */}
      <form onSubmit={(e) => { e.preventDefault(); loadData(); }} className="int-filter-bar">
        <input className="int-input" style={{ flex: 1, minWidth: 200 }} placeholder="Search by request ID, integration, operation, message..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="int-select" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
          <option value="ALL">All Levels</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="ERROR">ERROR</option>
        </select>
        <select className="int-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="PARTIAL">Partial</option>
          <option value="FAILED">Failed</option>
        </select>
        <button type="submit" className="int-btn int-btn-primary int-btn-sm">Filter</button>
      </form>

      {/* Split Table + Payload Inspector */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(300px, 1fr)", gap: 12, alignItems: "start" }}>
        <div className="int-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="int-table-wrap">
            <table className="int-table">
              <thead>
                <tr><th>Timestamp</th><th>Integration</th><th>Operation</th><th>Level</th><th>Status</th><th>Latency</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="int-empty">Loading logs...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={6} className="int-empty">No integration logs recorded yet.</td></tr>
                ) : (
                  logs.map((l) => (
                    <tr
                      key={l._id}
                      onClick={() => setSelected(l)}
                      style={{ cursor: "pointer", background: selected?._id === l._id ? "#eff6ff" : undefined }}
                    >
                      <td style={{ color: "#64748b", whiteSpace: "nowrap" }}>{formatDateTime(l.createdAt)}</td>
                      <td style={{ fontWeight: 700 }}>{l.integrationName}</td>
                      <td>{l.operation}</td>
                      <td><span className={l.logLevel === "ERROR" ? "int-badge int-badge-red" : l.logLevel === "WARN" ? "int-badge int-badge-amber" : "int-badge int-badge-blue"}>{l.logLevel}</span></td>
                      <td><span className={intStatusBadgeClass(l.status)}>{l.status}</span></td>
                      <td>{l.responseTimeMs} ms</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="int-card" style={{ position: "sticky", top: 14 }}>
          {!selected ? (
            <div className="int-empty">Select a log entry to inspect request &amp; response payloads.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="int-badge int-badge-blue">{selected.requestId || selected._id.slice(-8)}</span>
                <span className={intStatusBadgeClass(selected.status)}>{selected.status}</span>
              </div>
              <h3 className="int-card-title">{selected.integrationName} · {selected.operation}</h3>
              <p style={{ margin: 0, color: "#475569" }}>{selected.message}</p>
              <div style={{ fontSize: 10.5, color: "#64748b" }}>
                Triggered by <strong>{selected.triggeredBy}</strong> · Latency: <strong>{selected.responseTimeMs} ms</strong>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>PAYLOAD / TELEMETRY</div>
                <pre className="int-code">
                  {JSON.stringify(
                    {
                      request: selected.requestPayload ?? {},
                      response: selected.responsePayload ?? {},
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
