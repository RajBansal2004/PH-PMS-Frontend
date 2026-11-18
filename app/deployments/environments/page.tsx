"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Server, RefreshCw, Edit3, X } from "lucide-react";
import { deploymentApi, formatDate, type EnvironmentItem } from "@/lib/phase2/api";
import "@/components/phase2/phase2.css";

function healthBadge(h: string) {
  if (h === "HEALTHY") return "p2-badge p2-badge-green";
  if (h === "DEGRADED" || h === "MAINTENANCE") return "p2-badge p2-badge-amber";
  return "p2-badge p2-badge-red";
}

export default function DeploymentEnvironmentsPage() {
  const [envs, setEnvs] = useState<EnvironmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [editing, setEditing] = useState<EnvironmentItem | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await deploymentApi.list();
      setEnvs(res.environments || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load environments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (env: EnvironmentItem) => {
    setEditing(env);
    setForm({
      name: env.name,
      url: env.url,
      currentVersion: env.currentVersion,
      health: env.health,
      uptimePct: env.uptimePct,
      autoDeployEnabled: env.autoDeployEnabled,
      notes: env.notes || "",
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await deploymentApi.updateEnvironment(editing._id, form);
      setNotice(`Environment ${editing.envKey} updated.`);
      setEditing(null);
      await load();
    } catch (err: any) {
      setError(err?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p2-page">
      <div className="p2-header">
        <div>
          <div className="p2-breadcrumb">Delivery Operations / Environments Matrix (DEP-002)</div>
          <h1 className="p2-title">
            <Server size={18} color="#0755e9" />
            Environment Registry &amp; Readiness
          </h1>
          <div className="p2-subtitle">
            Manage DEV, QA, UAT, Staging &amp; Production URLs, active build versions, uptime SLAs &amp; maintenance flags
          </div>
        </div>
        <div className="p2-actions">
          <div className="p2-tabs">
            <Link href="/deployments" className="p2-tab">Release Pipeline</Link>
            <Link href="/deployments/environments" className="p2-tab active">Environments</Link>
          </div>
          <button type="button" className="p2-btn" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="p2-banner-err">{error}</div>}
      {notice && <div className="p2-banner-ok">{notice}</div>}

      <div className="p2-card">
        <div className="p2-table-wrap">
          <table className="p2-table">
            <thead>
              <tr>
                <th>Env Key</th>
                <th>Name &amp; Endpoint URL</th>
                <th>Live Version</th>
                <th>Health</th>
                <th>Uptime</th>
                <th>Auto-Deploy</th>
                <th>Last Deployment</th>
                <th style={{ textAlign: "right" }}>Configure</th>
              </tr>
            </thead>
            <tbody>
              {envs.map((env) => (
                <tr key={env._id}>
                  <td><strong>{env.envKey}</strong></td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{env.name}</div>
                    <div style={{ fontSize: 10.5, color: "#0755e9" }}>{env.url || "—"}</div>
                  </td>
                  <td><span className="p2-badge p2-badge-purple">{env.currentVersion}</span></td>
                  <td><span className={healthBadge(env.health)}>{env.health}</span></td>
                  <td><strong>{env.uptimePct}%</strong></td>
                  <td>
                    <span className={`p2-badge ${env.autoDeployEnabled ? "p2-badge-green" : "p2-badge-slate"}`}>
                      {env.autoDeployEnabled ? "ENABLED" : "MANUAL GATE"}
                    </span>
                  </td>
                  <td>
                    <div>{formatDate(env.lastDeployedAt)}</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>{env.lastDeployedBy || "System"}</div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" className="p2-btn" style={{ height: 26 }} onClick={() => openEdit(env)}>
                      <Edit3 size={12} /> Configure
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="p2-modal-backdrop" role="dialog" aria-modal="true">
          <form className="p2-modal" style={{ maxWidth: 500 }} onSubmit={save}>
            <div className="p2-modal-head">
              <strong>Configure Environment — {editing.envKey}</strong>
              <button type="button" className="p2-btn" style={{ height: 26, padding: "0 6px" }} onClick={() => setEditing(null)}>
                <X size={14} />
              </button>
            </div>
            <div className="p2-modal-body">
              <div className="p2-form-grid">
                <div className="p2-field">
                  <label>Display Name</label>
                  <input className="p2-input" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="p2-field">
                  <label>Current Version</label>
                  <input className="p2-input" value={form.currentVersion || ""} onChange={(e) => setForm({ ...form, currentVersion: e.target.value })} />
                </div>
                <div className="p2-field full">
                  <label>Environment URL</label>
                  <input className="p2-input" value={form.url || ""} onChange={(e) => setForm({ ...form, url: e.target.value })} />
                </div>
                <div className="p2-field">
                  <label>Health Status</label>
                  <select className="p2-select" value={form.health || "HEALTHY"} onChange={(e) => setForm({ ...form, health: e.target.value })}>
                    <option value="HEALTHY">Healthy</option>
                    <option value="DEGRADED">Degraded</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="DOWN">Down</option>
                  </select>
                </div>
                <div className="p2-field">
                  <label>Uptime SLA (%)</label>
                  <input className="p2-input" type="number" step="0.01" min={0} max={100} value={form.uptimePct ?? 99.9} onChange={(e) => setForm({ ...form, uptimePct: Number(e.target.value) })} />
                </div>
                <div className="p2-field full">
                  <label>Operational Notes</label>
                  <textarea className="p2-textarea" rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                <input type="checkbox" checked={Boolean(form.autoDeployEnabled)} onChange={(e) => setForm({ ...form, autoDeployEnabled: e.target.checked })} />
                Enable CI/CD Auto-Deploy on Merge
              </label>
            </div>
            <div className="p2-modal-foot">
              <button type="button" className="p2-btn" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="p2-btn p2-btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save Environment"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
