"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Plug,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Settings,
  Search,
  ChevronRight,
  Lock,
  Activity,
  Play,
} from "lucide-react";
import {
  integrationsApi,
  IntegrationAdapterItem,
  formatDateTime,
  intStatusBadgeClass,
} from "@/lib/integrations/api";
import "@/components/integrations/integrations.css";

const CATEGORIES = ["ALL", "Development", "Communication", "Productivity", "Cloud & Infra", "HR & Finance"] as const;

export default function IntegrationMarketplacePage() {
  const [adapters, setAdapters] = useState<IntegrationAdapterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [syncingKey, setSyncingKey] = useState<string | null>(null);

  const [category, setCategory] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await integrationsApi.list({});
      setAdapters(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load integration marketplace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return adapters.filter((a) => {
      if (category !== "ALL" && a.category !== category) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    });
  }, [adapters, category, search]);

  const stats = useMemo(() => {
    const total = adapters.length;
    const connected = adapters.filter((a) => a.status === "CONNECTED").length;
    const errors = adapters.filter((a) => a.status === "ERROR" || a.status === "DEGRADED").length;
    const vaulted = adapters.filter((a) => a.hasSecrets).length;
    return { total, connected, errors, vaulted };
  }, [adapters]);

  const handleQuickSync = async (adapter: IntegrationAdapterItem) => {
    setSyncingKey(adapter.key);
    setError(null);
    try {
      const run = await integrationsApi.syncNow(adapter.key, {});
      flash(`${adapter.name} sync completed (${run.syncCode}: ${run.recordsSuccess} records).`);
      await loadData();
    } catch (e: any) {
      setError(e?.message || `Sync failed for ${adapter.name}`);
    } finally {
      setSyncingKey(null);
    }
  };

  return (
    <div className="int-page">
      <div>
        <div className="int-breadcrumb">
          <span>Integration Center</span>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Integration Marketplace</span>
        </div>
        <div className="int-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h1 className="int-title">Integration Marketplace</h1>
              <span className="int-badge int-badge-green"><Lock size={10} /> AES-256-GCM Credential Vault</span>
            </div>
            <p className="int-subtitle">
              Connect developer tools, messaging channels, cloud storage, HRMS, and accounting adapters with encrypted secrets.
            </p>
          </div>
          <div className="int-actions">
            <button type="button" className="int-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <Link href="/integrations/status" className="int-btn int-btn-primary">
              <Activity size={12} /> Connection Health
            </Link>
          </div>
        </div>
      </div>

      {/* Subnav */}
      <div className="int-subnav">
        <Link href="/integrations" className="int-subnav-link active">Marketplace</Link>
        <Link href="/integrations/status" className="int-subnav-link">Connection Status</Link>
        <Link href="/integrations/sync-history" className="int-subnav-link">Sync History</Link>
        <Link href="/integrations/logs" className="int-subnav-link">Integration Logs</Link>
      </div>

      {error && <div className="int-alert int-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="int-alert int-alert-ok"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      {/* KPIs */}
      <div className="int-kpi-grid">
        <div className="int-kpi"><div className="int-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><Plug size={16} /></div><div><span className="int-kpi-label">Available Adapters</span><span className="int-kpi-val">{stats.total}</span></div></div>
        <div className="int-kpi"><div className="int-kpi-icon" style={{ background: "#ecfdf5", color: "#047857" }}><CheckCircle2 size={16} /></div><div><span className="int-kpi-label">Connected</span><span className="int-kpi-val" style={{ color: "#047857" }}>{stats.connected}</span></div></div>
        <div className="int-kpi"><div className="int-kpi-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}><Lock size={16} /></div><div><span className="int-kpi-label">Vaulted Credentials</span><span className="int-kpi-val">{stats.vaulted}</span></div></div>
        <div className="int-kpi"><div className="int-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><AlertTriangle size={16} /></div><div><span className="int-kpi-label">Errors / Degraded</span><span className="int-kpi-val" style={{ color: stats.errors > 0 ? "#dc2626" : "#10204a" }}>{stats.errors}</span></div></div>
      </div>

      {/* Category Tabs + Search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="int-seg">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" className={`int-seg-btn ${category === c ? "active" : ""}`} onClick={() => setCategory(c)}>
              {c === "ALL" ? `All (${adapters.length})` : c}
            </button>
          ))}
        </div>
        <div style={{ position: "relative", minWidth: 220 }}>
          <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input className="int-input" style={{ width: "100%", paddingLeft: 28 }} placeholder="Search integrations..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Adapter Grid (INT-001 Panel 1) */}
      {loading ? (
        <div className="int-card int-empty">Loading integration catalog...</div>
      ) : (
        <div className="int-grid-3">
          {filtered.map((adapter) => {
            const isConnected = adapter.status === "CONNECTED";
            return (
              <div key={adapter.key} className="int-card" style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{adapter.name}</div>
                    <span className="int-badge int-badge-slate" style={{ marginTop: 3 }}>{adapter.category}</span>
                  </div>
                  <span className={intStatusBadgeClass(adapter.status)}>
                    {adapter.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p style={{ margin: 0, color: "#64748b", fontSize: 11 }}>{adapter.description}</p>
                {adapter.lastSyncAt && (
                  <div style={{ fontSize: 10, color: "#64748b" }}>
                    Last Sync: <strong>{formatDateTime(adapter.lastSyncAt)}</strong>
                  </div>
                )}
                <div style={{ display: "flex", gap: 6, marginTop: "auto", paddingTop: 6, borderTop: "1px solid #f1f5f9" }}>
                  <Link href={`/integrations/${adapter.key}`} className={`int-btn int-btn-sm ${isConnected ? "" : "int-btn-primary"}`} style={{ flex: 1 }}>
                    <Settings size={11} /> {isConnected ? "Manage" : "Connect"}
                  </Link>
                  {isConnected && (
                    <button
                      type="button"
                      className="int-btn int-btn-primary int-btn-sm"
                      onClick={() => handleQuickSync(adapter)}
                      disabled={syncingKey === adapter.key}
                    >
                      <Play size={11} /> {syncingKey === adapter.key ? "Syncing..." : "Sync"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
