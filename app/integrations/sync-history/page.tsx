"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Clock,
  Activity,
} from "lucide-react";
import {
  integrationsApi,
  formatDateTime,
  intStatusBadgeClass,
  downloadCsv,
} from "@/lib/integrations/api";
import "@/components/integrations/integrations.css";

export default function IntegrationSyncHistoryPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [retrying, setRetrying] = useState(false);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await integrationsApi.syncHistory({
        status: statusFilter,
        search: search.trim() || undefined,
      });
      setRuns(list);
      if (!selected && list.length > 0) setSelected(list[0]);
    } catch (e: any) {
      setError(e?.message || "Failed to load sync history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const stats = useMemo(() => {
    const total = runs.length;
    const success = runs.filter((r) => r.status === "SUCCESS").length;
    const failed = runs.filter((r) => r.status === "FAILED").length;
    const partial = runs.filter((r) => r.status === "PARTIAL").length;
    return { total, success, failed, partial };
  }, [runs]);

  const handleRetry = async (syncId: string) => {
    setRetrying(true);
    setError(null);
    try {
      const res = await integrationsApi.retrySync(syncId);
      flash(`Retry sync ${res.syncCode} completed successfully.`);
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Retry failed");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="int-page">
      <div>
        <div className="int-breadcrumb">
          <Link href="/integrations">Integration Center</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Sync History</span>
        </div>
        <div className="int-header">
          <div>
            <h1 className="int-title">Synchronization History</h1>
            <p className="int-subtitle">
              Track every synchronization run, inspect record metrics, and retry failed syncs in one click.
            </p>
          </div>
          <div className="int-actions">
            <button type="button" className="int-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              type="button"
              className="int-btn int-btn-primary"
              disabled={runs.length === 0}
              onClick={() =>
                downloadCsv(
                  "integration-sync-history",
                  ["Sync Code", "Integration", "Event Type", "Entity", "Total", "Success", "Failed", "Duration (ms)", "Status", "Triggered By", "Started At"],
                  runs.map((r) => [r.syncCode, r.integrationName, r.eventType, r.entity, r.recordsTotal, r.recordsSuccess, r.recordsFailed, r.durationMs, r.status, r.triggeredBy, formatDateTime(r.startedAt)])
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
        <Link href="/integrations/sync-history" className="int-subnav-link active">Sync History</Link>
        <Link href="/integrations/logs" className="int-subnav-link">Integration Logs</Link>
      </div>

      {error && <div className="int-alert int-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="int-alert int-alert-ok"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      {/* KPIs */}
      <div className="int-kpi-grid">
        <div className="int-kpi"><div className="int-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><Activity size={16} /></div><div><span className="int-kpi-label">Total Syncs</span><span className="int-kpi-val">{stats.total}</span></div></div>
        <div className="int-kpi"><div className="int-kpi-icon" style={{ background: "#ecfdf5", color: "#047857" }}><CheckCircle2 size={16} /></div><div><span className="int-kpi-label">Successful</span><span className="int-kpi-val" style={{ color: "#047857" }}>{stats.success}</span></div></div>
        <div className="int-kpi"><div className="int-kpi-icon" style={{ background: "#fffbeb", color: "#b45309" }}><Clock size={16} /></div><div><span className="int-kpi-label">Partial</span><span className="int-kpi-val">{stats.partial}</span></div></div>
        <div className="int-kpi"><div className="int-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><AlertTriangle size={16} /></div><div><span className="int-kpi-label">Failed</span><span className="int-kpi-val" style={{ color: "#dc2626" }}>{stats.failed}</span></div></div>
      </div>

      {/* Filter Bar */}
      <form onSubmit={(e) => { e.preventDefault(); loadData(); }} className="int-filter-bar">
        <input className="int-input" style={{ flex: 1, minWidth: 200 }} placeholder="Search by sync code, integration, entity..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="int-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="PARTIAL">Partial</option>
          <option value="FAILED">Failed</option>
        </select>
        <button type="submit" className="int-btn int-btn-primary int-btn-sm">Filter</button>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(290px, 1fr)", gap: 12, alignItems: "start" }}>
        <div className="int-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="int-table-wrap">
            <table className="int-table">
              <thead>
                <tr><th>Sync ID</th><th>Integration</th><th>Entity</th><th>Records</th><th>Duration</th><th>Status</th><th>Time</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="int-empty">Loading sync history...</td></tr>
                ) : runs.length === 0 ? (
                  <tr><td colSpan={7} className="int-empty">No sync runs recorded yet. Connect an integration and click Sync Now.</td></tr>
                ) : (
                  runs.map((r) => (
                    <tr
                      key={r._id}
                      onClick={() => setSelected(r)}
                      style={{ cursor: "pointer", background: selected?._id === r._id ? "#eff6ff" : undefined }}
                    >
                      <td style={{ fontWeight: 700, color: "#0755e9" }}>{r.syncCode}</td>
                      <td style={{ fontWeight: 600 }}>{r.integrationName}</td>
                      <td>{r.entity}</td>
                      <td>{r.recordsSuccess}/{r.recordsTotal}</td>
                      <td>{r.durationMs} ms</td>
                      <td><span className={intStatusBadgeClass(r.status)}>{r.status}</span></td>
                      <td style={{ color: "#64748b", whiteSpace: "nowrap" }}>{formatDateTime(r.startedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="int-card" style={{ position: "sticky", top: 14 }}>
          {!selected ? (
            <div className="int-empty">Select a sync run to inspect details.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="int-badge int-badge-blue">{selected.syncCode}</span>
                <span className={intStatusBadgeClass(selected.status)}>{selected.status}</span>
              </div>
              <h3 className="int-card-title">{selected.integrationName} — {selected.eventType}</h3>
              <p style={{ margin: 0, color: "#475569" }}>{selected.message}</p>
              <div className="int-grid-2" style={{ background: "#f8fafd", padding: 9, borderRadius: 6, border: "1px solid #e3eaf4" }}>
                <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Total</span><strong>{selected.recordsTotal}</strong></div>
                <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Succeeded</span><strong style={{ color: "#047857" }}>{selected.recordsSuccess}</strong></div>
                <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Failed</span><strong style={{ color: "#dc2626" }}>{selected.recordsFailed}</strong></div>
                <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Duration</span><strong>{selected.durationMs} ms</strong></div>
              </div>
              <div style={{ fontSize: 10.5, color: "#64748b" }}>
                Triggered by <strong>{selected.triggeredBy}</strong> · {formatDateTime(selected.startedAt)}
              </div>
              <button type="button" className="int-btn int-btn-primary" onClick={() => handleRetry(selected._id)} disabled={retrying}>
                <RotateCcw size={12} /> {retrying ? "Retrying..." : "Re-run / Retry Sync"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
