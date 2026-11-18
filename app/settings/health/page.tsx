"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  Database,
  Cpu,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Clock,
} from "lucide-react";
import { settingsApi, formatDateTime, formatUptime } from "@/lib/settings/api";
import "@/components/settings/settings.css";

export default function SystemHealthPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await settingsApi.health();
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Failed to retrieve live system health");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const services: any[] = data?.services || [];
  const checks: any[] = data?.checks || [];

  return (
    <div className="sys-page">
      <div>
        <div className="sys-breadcrumb">
          <Link href="/settings">System Administration</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>System Health</span>
        </div>
        <div className="sys-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h1 className="sys-title">System Health &amp; Diagnostics</h1>
              <span className={data?.overallStatus === "OPERATIONAL" ? "sys-badge sys-badge-green" : "sys-badge sys-badge-amber"}>
                {data?.overallStatus || "CHECKING..."}
              </span>
            </div>
            <p className="sys-subtitle">
              Real-time Node.js runtime telemetry, MongoDB ping latency, memory footprint, and diagnostic health checks.
            </p>
          </div>
          <button type="button" className="sys-btn sys-btn-primary" onClick={loadHealth} disabled={loading}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Run All Checks
          </button>
        </div>
      </div>

      {/* Subnav */}
      <div className="sys-subnav">
        <Link href="/settings" className="sys-subnav-link">General Settings</Link>
        <Link href="/settings/workflows" className="sys-subnav-link">Workflow Settings</Link>
        <Link href="/settings/master-data" className="sys-subnav-link">Master Data</Link>
        <Link href="/settings/health" className="sys-subnav-link active">System Health</Link>
        <Link href="/settings/feature-flags" className="sys-subnav-link">Feature Flags</Link>
      </div>

      {error && <div className="sys-alert sys-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* Live Telemetry KPIs */}
      <div className="sys-kpi-grid">
        <div className="sys-kpi"><div className="sys-kpi-icon" style={{ background: "#ecfdf5", color: "#047857" }}><Clock size={16} /></div><div><span className="sys-kpi-label">API Process Uptime</span><span className="sys-kpi-val">{formatUptime(data?.uptimeSeconds)}</span></div></div>
        <div className="sys-kpi"><div className="sys-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><Database size={16} /></div><div><span className="sys-kpi-label">MongoDB Ping</span><span className="sys-kpi-val">{data?.dbPingMs ?? 0} ms</span></div></div>
        <div className="sys-kpi"><div className="sys-kpi-icon" style={{ background: "#f5f3ff", color: "#6d28d9" }}><Cpu size={16} /></div><div><span className="sys-kpi-label">Node Heap / RSS</span><span className="sys-kpi-val">{data?.memory?.heapUsedMb ?? 0} / {data?.memory?.rssMb ?? 0} MB</span></div></div>
        <div className="sys-kpi"><div className="sys-kpi-icon" style={{ background: "#fffbeb", color: "#b45309" }}><HardDrive size={16} /></div><div><span className="sys-kpi-label">DB Objects / Size</span><span className="sys-kpi-val">{data?.database?.documents ?? 0} ({data?.database?.dataSizeKb ?? 0} KB)</span></div></div>
        <div className="sys-kpi"><div className="sys-kpi-icon" style={{ background: "#f0f9ff", color: "#0284c7" }}><Activity size={16} /></div><div><span className="sys-kpi-label">Host / Cores</span><span className="sys-kpi-val">{data?.host?.cpuCount ?? 0} CPUs</span></div></div>
      </div>

      {/* Services + Diagnostics */}
      <div className="sys-grid-2">
        <div className="sys-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4", fontWeight: 700 }}>
            Platform Service Status ({services.length})
          </div>
          <div className="sys-table-wrap">
            <table className="sys-table">
              <thead><tr><th>Service</th><th>Type</th><th>Latency</th><th>Status</th></tr></thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.name}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>{s.detail}</div>
                    </td>
                    <td>{s.type}</td>
                    <td>{s.latencyMs} ms</td>
                    <td><span className={s.status === "HEALTHY" ? "sys-badge sys-badge-green" : "sys-badge sys-badge-amber"}>{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="sys-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4", fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
            <span>Diagnostic Health Checks</span>
            <span style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}>{formatDateTime(data?.checkedAt)}</span>
          </div>
          <div className="sys-table-wrap">
            <table className="sys-table">
              <thead><tr><th>Check</th><th>Details</th><th>Result</th></tr></thead>
              <tbody>
                {checks.map((c) => (
                  <tr key={c.name}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td style={{ color: "#64748b" }}>{c.detail}</td>
                    <td>
                      <span className={c.status === "PASS" ? "sys-badge sys-badge-green" : c.status === "WARN" ? "sys-badge sys-badge-amber" : "sys-badge sys-badge-red"}>
                        <CheckCircle2 size={10} /> {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
