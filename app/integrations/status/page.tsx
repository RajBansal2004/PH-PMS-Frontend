"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  Activity,
  Plug,
  RefreshCw,
  ChevronRight,
  Play,
  Settings,
} from "lucide-react";
import {
  integrationsApi,
  IntegrationAdapterItem,
  formatDateTime,
  intStatusBadgeClass,
} from "@/lib/integrations/api";
import "@/components/integrations/integrations.css";

export default function IntegrationStatusPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await integrationsApi.overview();
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load connection health");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const kpis = data?.kpis || {
    totalAdapters: 0,
    connected: 0,
    degraded: 0,
    down: 0,
    notConfigured: 0,
    syncSuccessRate: 100,
    avgResponseMs: 0,
  };
  const adapters: IntegrationAdapterItem[] = data?.adapters || [];

  const handleTest = async (key: string) => {
    try {
      const res = await integrationsApi.check(key);
      flash(res.message);
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Health check failed");
    }
  };

  return (
    <div className="int-page">
      <div>
        <div className="int-breadcrumb">
          <Link href="/integrations">Integration Center</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Connection Status</span>
        </div>
        <div className="int-header">
          <div>
            <h1 className="int-title">Integration Connection Health</h1>
            <p className="int-subtitle">
              Real-time health, uptime, response latency, and diagnostics for every configured adapter.
            </p>
          </div>
          <button type="button" className="int-btn" onClick={loadData} disabled={loading}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Subnav */}
      <div className="int-subnav">
        <Link href="/integrations" className="int-subnav-link">Marketplace</Link>
        <Link href="/integrations/status" className="int-subnav-link active">Connection Status</Link>
        <Link href="/integrations/sync-history" className="int-subnav-link">Sync History</Link>
        <Link href="/integrations/logs" className="int-subnav-link">Integration Logs</Link>
      </div>

      {error && <div className="int-alert int-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="int-alert int-alert-ok"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      {/* Health KPIs (INT-003 Panel 1) */}
      <div className="int-kpi-grid">
        <div className="int-kpi"><div className="int-kpi-icon" style={{ background: "#ecfdf5", color: "#047857" }}><CheckCircle2 size={16} /></div><div><span className="int-kpi-label">Healthy / Connected</span><span className="int-kpi-val" style={{ color: "#047857" }}>{kpis.connected}</span></div></div>
        <div className="int-kpi"><div className="int-kpi-icon" style={{ background: "#fffbeb", color: "#b45309" }}><AlertTriangle size={16} /></div><div><span className="int-kpi-label">Degraded</span><span className="int-kpi-val">{kpis.degraded}</span></div></div>
        <div className="int-kpi"><div className="int-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><AlertTriangle size={16} /></div><div><span className="int-kpi-label">Down / Error</span><span className="int-kpi-val" style={{ color: "#dc2626" }}>{kpis.down}</span></div></div>
        <div className="int-kpi"><div className="int-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><Activity size={16} /></div><div><span className="int-kpi-label">Sync Success Rate</span><span className="int-kpi-val">{kpis.syncSuccessRate}%</span></div></div>
        <div className="int-kpi"><div className="int-kpi-icon" style={{ background: "#f5f3ff", color: "#6d28d9" }}><Plug size={16} /></div><div><span className="int-kpi-label">Avg Latency</span><span className="int-kpi-val">{kpis.avgResponseMs} ms</span></div></div>
      </div>

      {/* Status Table */}
      <div className="int-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="int-table-wrap">
          <table className="int-table">
            <thead>
              <tr><th>Adapter</th><th>Category</th><th>Status</th><th>Last Sync</th><th>Avg Latency</th><th>Uptime</th><th style={{ textAlign: "right" }}>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="int-empty">Loading connection health...</td></tr>
              ) : (
                adapters.map((a) => (
                  <tr key={a.key}>
                    <td>
                      <Link href={`/integrations/${a.key}`} style={{ fontWeight: 700, color: "#0755e9", textDecoration: "none" }}>
                        {a.name}
                      </Link>
                    </td>
                    <td>{a.category}</td>
                    <td><span className={intStatusBadgeClass(a.status)}>{a.status.replace(/_/g, " ")}</span></td>
                    <td style={{ color: "#64748b", whiteSpace: "nowrap" }}>{formatDateTime(a.lastSyncAt || a.lastCheckedAt)}</td>
                    <td>{a.avgResponseMs ? `${a.avgResponseMs} ms` : "—"}</td>
                    <td>{a.uptimePct}%</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <button type="button" className="int-btn int-btn-sm" onClick={() => handleTest(a.key)}><Play size={10} /> Check</button>
                        <Link href={`/integrations/${a.key}`} className="int-btn int-btn-sm"><Settings size={10} /> Manage</Link>
                      </div>
                    </td>
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
