"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Flag,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { settingsApi, formatDateTime } from "@/lib/settings/api";
import "@/components/settings/settings.css";

const ENVS = ["DEV", "QA", "STAGING", "PROD"] as const;

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [editing, setEditing] = useState<any | null>(null);
  const [historyFlag, setHistoryFlag] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await settingsApi.listFlags();
      setFlags(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load feature flags");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const total = flags.length;
    const enabled = flags.filter((f) => f.enabled).length;
    const disabled = total - enabled;
    const rollout = flags.filter((f) => f.enabled && f.rolloutPercentage < 100).length;
    return { total, enabled, disabled, rollout };
  }, [flags]);

  const handleQuickToggle = async (flag: any) => {
    try {
      const updated = await settingsApi.updateFlag(flag._id, {
        enabled: !flag.enabled,
        reason: `Quick toggled ${!flag.enabled ? "ON" : "OFF"}`,
      });
      setFlags((prev) => prev.map((x) => (x._id === flag._id ? updated : x)));
      flash(`Flag "${flag.flagKey}" ${updated.enabled ? "enabled" : "disabled"}.`);
    } catch (e: any) {
      setError(e?.message || "Toggle failed");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.flagKey?.trim() || !editing?.name?.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editing._id) {
        await settingsApi.updateFlag(editing._id, editing);
        flash(`Updated flag "${editing.flagKey}".`);
      } else {
        await settingsApi.createFlag(editing);
        flash(`Created flag "${editing.flagKey}".`);
      }
      setEditing(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to save flag");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (flag: any) => {
    if (!window.confirm(`Delete feature flag "${flag.flagKey}"?`)) return;
    try {
      await settingsApi.deleteFlag(flag._id);
      flash(`Deleted "${flag.flagKey}".`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Delete failed");
    }
  };

  const toggleEnv = (env: string) => {
    setEditing((prev: any) => {
      const cur: string[] = prev.environments || [];
      return {
        ...prev,
        environments: cur.includes(env) ? cur.filter((x) => x !== env) : [...cur, env],
      };
    });
  };

  return (
    <div className="sys-page">
      <div>
        <div className="sys-breadcrumb">
          <Link href="/settings">System Administration</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Feature Flags</span>
        </div>
        <div className="sys-header">
          <div>
            <h1 className="sys-title">Feature Flags &amp; Rollout Console</h1>
            <p className="sys-subtitle">
              Safely control feature releases, kill switches, environment targeting, and gradual rollouts with audit history.
            </p>
          </div>
          <div className="sys-actions">
            <button type="button" className="sys-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              type="button"
              className="sys-btn sys-btn-primary"
              onClick={() =>
                setEditing({
                  flagKey: "",
                  name: "",
                  description: "",
                  module: "Core",
                  featureType: "RELEASE",
                  enabled: false,
                  environments: ["DEV", "QA"],
                  rolloutPercentage: 100,
                })
              }
            >
              <Plus size={12} /> Create Feature Flag
            </button>
          </div>
        </div>
      </div>

      {/* Subnav */}
      <div className="sys-subnav">
        <Link href="/settings" className="sys-subnav-link">General Settings</Link>
        <Link href="/settings/workflows" className="sys-subnav-link">Workflow Settings</Link>
        <Link href="/settings/master-data" className="sys-subnav-link">Master Data</Link>
        <Link href="/settings/health" className="sys-subnav-link">System Health</Link>
        <Link href="/settings/feature-flags" className="sys-subnav-link active">Feature Flags</Link>
      </div>

      {error && <div className="sys-alert sys-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="sys-alert sys-alert-ok"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      {/* KPIs */}
      <div className="sys-kpi-grid">
        <div className="sys-kpi"><div className="sys-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><Flag size={16} /></div><div><span className="sys-kpi-label">Total Flags</span><span className="sys-kpi-val">{stats.total}</span></div></div>
        <div className="sys-kpi"><div className="sys-kpi-icon" style={{ background: "#ecfdf5", color: "#047857" }}><CheckCircle2 size={16} /></div><div><span className="sys-kpi-label">Enabled</span><span className="sys-kpi-val" style={{ color: "#047857" }}>{stats.enabled}</span></div></div>
        <div className="sys-kpi"><div className="sys-kpi-icon" style={{ background: "#f1f5f9", color: "#475569" }}><Flag size={16} /></div><div><span className="sys-kpi-label">Disabled</span><span className="sys-kpi-val">{stats.disabled}</span></div></div>
        <div className="sys-kpi"><div className="sys-kpi-icon" style={{ background: "#fffbeb", color: "#b45309" }}><Flag size={16} /></div><div><span className="sys-kpi-label">Gradual Rollout</span><span className="sys-kpi-val">{stats.rollout}</span></div></div>
      </div>

      {/* Create / Edit Flag */}
      {editing && (
        <form onSubmit={handleSave} className="sys-card" style={{ background: "#f8fbff", display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="sys-card-head">
            <h3 className="sys-card-title">{editing._id ? `Edit Flag: ${editing.flagKey}` : "Create Feature Flag"}</h3>
            <button type="button" className="sys-btn sys-btn-sm" onClick={() => setEditing(null)}>Close</button>
          </div>
          <div className="sys-grid-3">
            <div className="sys-field">
              <label>Flag Key *</label>
              <input className="sys-input" placeholder="e.g. ai_chat_assistant" value={editing.flagKey || ""} onChange={(e) => setEditing({ ...editing, flagKey: e.target.value })} disabled={Boolean(editing._id)} required />
            </div>
            <div className="sys-field">
              <label>Display Name *</label>
              <input className="sys-input" value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
            </div>
            <div className="sys-field">
              <label>Module</label>
              <input className="sys-input" value={editing.module || ""} onChange={(e) => setEditing({ ...editing, module: e.target.value })} />
            </div>
          </div>
          <div className="sys-grid-3">
            <div className="sys-field">
              <label>Feature Type</label>
              <select className="sys-select" value={editing.featureType || "RELEASE"} onChange={(e) => setEditing({ ...editing, featureType: e.target.value })}>
                <option value="RELEASE">Release</option>
                <option value="EXPERIMENT">Experiment</option>
                <option value="KILL_SWITCH">Kill Switch</option>
                <option value="OPERATIONAL">Operational</option>
              </select>
            </div>
            <div className="sys-field">
              <label>Rollout Percentage ({editing.rolloutPercentage ?? 100}%)</label>
              <input type="range" min={0} max={100} value={editing.rolloutPercentage ?? 100} onChange={(e) => setEditing({ ...editing, rolloutPercentage: Number(e.target.value) })} />
            </div>
            <div className="sys-field">
              <label>Environments</label>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {ENVS.map((env) => (
                  <label key={env} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5 }}>
                    <input type="checkbox" checked={(editing.environments || []).includes(env)} onChange={() => toggleEnv(env)} />
                    {env}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="sys-field">
            <label>Description</label>
            <input className="sys-input" value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 7 }}>
            <button type="button" className="sys-btn" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="sys-btn sys-btn-primary" disabled={saving}>Save Flag</button>
          </div>
        </form>
      )}

      {/* History Drawer */}
      {historyFlag && (
        <div className="sys-card" style={{ background: "#f8fafd" }}>
          <div className="sys-card-head">
            <h3 className="sys-card-title">Flag Change History — {historyFlag.flagKey}</h3>
            <button type="button" className="sys-btn sys-btn-sm" onClick={() => setHistoryFlag(null)}>Close</button>
          </div>
          <div className="sys-table-wrap">
            <table className="sys-table">
              <thead><tr><th>Time</th><th>Action</th><th>Before</th><th>After</th><th>Changed By</th><th>Reason</th></tr></thead>
              <tbody>
                {[...(historyFlag.history || [])].reverse().map((h: any, i: number) => (
                  <tr key={i}>
                    <td style={{ color: "#64748b", whiteSpace: "nowrap" }}>{formatDateTime(h.timestamp)}</td>
                    <td><span className="sys-badge sys-badge-blue">{h.action}</span></td>
                    <td>{h.previousValue}</td>
                    <td style={{ fontWeight: 600 }}>{h.newValue}</td>
                    <td>{h.byName}</td>
                    <td>{h.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Flags Table */}
      <div className="sys-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="sys-table-wrap">
          <table className="sys-table">
            <thead><tr><th>Flag Key</th><th>Name</th><th>Module</th><th>Environments</th><th>Rollout</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="sys-empty">Loading feature flags...</td></tr>
              ) : (
                flags.map((f) => (
                  <tr key={f._id}>
                    <td style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "#0755e9" }}>{f.flagKey}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{f.name}</div>
                      {f.description && <div style={{ fontSize: 10, color: "#64748b" }}>{f.description}</div>}
                    </td>
                    <td><span className="sys-badge sys-badge-purple">{f.module}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                        {(f.environments || []).map((e: string) => <span key={e} className="sys-badge sys-badge-slate">{e}</span>)}
                      </div>
                    </td>
                    <td><strong>{f.rolloutPercentage}%</strong></td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleQuickToggle(f)}
                        className={f.enabled ? "sys-badge sys-badge-green" : "sys-badge sys-badge-slate"}
                        style={{ cursor: "pointer" }}
                      >
                        {f.enabled ? "Enabled" : "Disabled"}
                      </button>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <button type="button" className="sys-btn sys-btn-sm" onClick={() => setHistoryFlag(f)}>History</button>
                        <button type="button" className="sys-btn sys-btn-sm" onClick={() => setEditing(f)}><Edit3 size={11} /></button>
                        <button type="button" className="sys-btn sys-btn-danger sys-btn-sm" onClick={() => handleDelete(f)}><Trash2 size={11} /></button>
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
