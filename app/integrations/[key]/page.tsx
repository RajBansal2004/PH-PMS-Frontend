"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Play,
  Plug,
  PowerOff,
  Plus,
  Trash2,
  Copy,
  RefreshCw,
} from "lucide-react";
import {
  integrationsApi,
  intLookupApi,
  IntegrationAdapterItem,
  formatDateTime,
  intStatusBadgeClass,
} from "@/lib/integrations/api";
import "@/components/integrations/integrations.css";

export default function IntegrationConfigPage() {
  const params = useParams();
  const key = String(params?.key || "");

  const [adapter, setAdapter] = useState<IntegrationAdapterItem | null>(null);
  const [syncRuns, setSyncRuns] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [projects, setProjects] = useState<{ _id: string; projectName: string }[]>([]);
  const [tab, setTab] = useState<"config" | "sync" | "logs">("config");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Editable state
  const [connectionName, setConnectionName] = useState("");
  const [environment, setEnvironment] = useState<"PRODUCTION" | "STAGING" | "SANDBOX">("PRODUCTION");
  const [enabled, setEnabled] = useState(true);
  const [publicConfig, setPublicConfig] = useState<Record<string, string>>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [autoSync, setAutoSync] = useState(true);
  const [frequency, setFrequency] = useState("Every 15 Minutes");
  const [direction, setDirection] = useState<"ONE_WAY_IN" | "ONE_WAY_OUT" | "TWO_WAY">("TWO_WAY");
  const [fieldMappings, setFieldMappings] = useState<{ externalField: string; pmsField: string }[]>([]);
  const [projectMappings, setProjectMappings] = useState<{ externalRef: string; projectId: string; projectName: string }[]>([]);
  const [newExtField, setNewExtField] = useState("");
  const [newPmsField, setNewPmsField] = useState("");
  const [newExtRef, setNewExtRef] = useState("");
  const [newProjId, setNewProjId] = useState("");

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    if (!key) return;
    setLoading(true);
    setError(null);
    try {
      const [res, projList] = await Promise.all([
        integrationsApi.detail(key),
        intLookupApi.projects().catch(() => []),
      ]);
      const a = res.integration;
      setAdapter(a);
      setSyncRuns(res.syncRuns || []);
      setLogs(res.logs || []);
      setProjects(projList);

      setConnectionName(a.connectionName || `${a.name} - Primary`);
      setEnvironment(a.environment || "PRODUCTION");
      setEnabled(a.enabled);
      setPublicConfig(a.publicConfig || {});
      setSecrets({});
      setAutoSync(a.syncSettings?.autoSync !== false);
      setFrequency(a.syncSettings?.frequency || "Every 15 Minutes");
      setDirection(a.syncSettings?.direction || "TWO_WAY");
      setFieldMappings(a.fieldMappings || []);
      setProjectMappings(
        (a.projectMappings || []).map((pm) => ({
          externalRef: pm.externalRef,
          projectId: pm.projectId || "",
          projectName: pm.projectName || "",
        }))
      );
    } catch (e: any) {
      setError(e?.message || "Failed to load integration configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [key]);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!adapter) return;
    setBusy(true);
    setError(null);
    try {
      await integrationsApi.save(adapter.key, {
        name: adapter.name,
        connectionName: connectionName.trim() || `${adapter.name} - Primary`,
        environment,
        enabled,
        publicConfig,
        secrets,
        syncSettings: {
          autoSync,
          frequency,
          direction,
          entities: adapter.syncSettings?.entities || [],
          webhookUrl: adapter.syncSettings?.webhookUrl || `/api/v1/integrations/${adapter.key}/webhook`,
        },
        fieldMappings,
        projectMappings,
      });
      setSecrets({});
      flash(`${adapter.name} configuration & encrypted vault saved.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to save configuration");
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    if (!adapter) return;
    setBusy(true);
    setError(null);
    try {
      const res = await integrationsApi.check(adapter.key);
      if (res.verified) flash(res.message);
      else setError(res.message);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Connection test failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSyncNow = async () => {
    if (!adapter) return;
    setBusy(true);
    setError(null);
    try {
      const run = await integrationsApi.syncNow(adapter.key, {});
      flash(`Sync ${run.syncCode} succeeded (${run.recordsSuccess} records in ${run.durationMs}ms).`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Manual sync failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!adapter) return;
    if (!window.confirm(`Disconnect ${adapter.name}?`)) return;
    setBusy(true);
    try {
      await integrationsApi.disconnect(adapter.key);
      flash(`${adapter.name} disconnected.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Disconnect failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="int-page"><div className="int-card int-empty">Loading integration workspace...</div></div>;
  if (!adapter) {
    return (
      <div className="int-page">
        <div className="int-alert int-alert-err"><AlertTriangle size={14} /> <span>{error || "Adapter not found."}</span></div>
        <Link href="/integrations" className="int-btn" style={{ width: "fit-content" }}><ArrowLeft size={12} /> Back to Marketplace</Link>
      </div>
    );
  }

  return (
    <div className="int-page">
      <div>
        <div className="int-breadcrumb">
          <Link href="/integrations">Integration Center</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>{adapter.name}</span>
        </div>
        <div className="int-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h1 className="int-title">{adapter.name} Configuration</h1>
              <span className={intStatusBadgeClass(adapter.status)}>{adapter.status.replace(/_/g, " ")}</span>
              {adapter.hasSecrets && <span className="int-badge int-badge-green"><Lock size={9} /> Credentials Vaulted</span>}
            </div>
            <p className="int-subtitle">{adapter.description}</p>
          </div>
          <div className="int-actions">
            <Link href="/integrations" className="int-btn"><ArrowLeft size={12} /> Marketplace</Link>
            <button type="button" className="int-btn" onClick={handleTest} disabled={busy}>
              <Plug size={12} /> Test Connection
            </button>
            <button type="button" className="int-btn int-btn-primary" onClick={handleSyncNow} disabled={busy || !adapter.enabled}>
              <Play size={12} /> Sync Now
            </button>
            {adapter.status === "CONNECTED" && (
              <button type="button" className="int-btn int-btn-danger" onClick={handleDisconnect} disabled={busy}>
                <PowerOff size={12} /> Disconnect
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <div className="int-alert int-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="int-alert int-alert-ok"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      <div className="int-seg">
        <button type="button" className={`int-seg-btn ${tab === "config" ? "active" : ""}`} onClick={() => setTab("config")}>
          Connection &amp; Vault
        </button>
        <button type="button" className={`int-seg-btn ${tab === "sync" ? "active" : ""}`} onClick={() => setTab("sync")}>
          Sync &amp; Field Mapping
        </button>
        <button type="button" className={`int-seg-btn ${tab === "logs" ? "active" : ""}`} onClick={() => setTab("logs")}>
          Sync History &amp; Logs ({syncRuns.length + logs.length})
        </button>
      </div>

      {/* TAB 1: CONFIG & ENCRYPTED CREDENTIAL VAULT */}
      {tab === "config" && (
        <form onSubmit={handleSave} className="int-grid-2" style={{ alignItems: "start" }}>
          <div className="int-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h3 className="int-card-title">Adapter Settings</h3>
            <div className="int-field">
              <label>Connection Name *</label>
              <input className="int-input" value={connectionName} onChange={(e) => setConnectionName(e.target.value)} required />
            </div>
            <div className="int-grid-2">
              <div className="int-field">
                <label>Environment</label>
                <select className="int-select" value={environment} onChange={(e) => setEnvironment(e.target.value as any)}>
                  <option value="PRODUCTION">Production</option>
                  <option value="STAGING">Staging</option>
                  <option value="SANDBOX">Sandbox</option>
                </select>
              </div>
              <div className="int-field">
                <label>Status Toggle</label>
                <label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 6, cursor: "pointer" }}>
                  <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                  <span>Enable Adapter</span>
                </label>
              </div>
            </div>

            {(adapter.configFields || []).map((cf) => (
              <div key={cf.key} className="int-field">
                <label>{cf.label}</label>
                <input
                  className="int-input"
                  placeholder={cf.placeholder || ""}
                  value={publicConfig[cf.key] || ""}
                  onChange={(e) => setPublicConfig((prev) => ({ ...prev, [cf.key]: e.target.value }))}
                />
              </div>
            ))}

            <div className="int-field">
              <label>Generated Webhook Endpoint</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input className="int-input" style={{ flex: 1, fontFamily: "ui-monospace, monospace" }} readOnly value={adapter.syncSettings?.webhookUrl || ""} />
                <button
                  type="button"
                  className="int-btn"
                  onClick={() => {
                    navigator.clipboard?.writeText(adapter.syncSettings?.webhookUrl || "");
                    flash("Webhook URL copied.");
                  }}
                >
                  <Copy size={11} />
                </button>
              </div>
            </div>
          </div>

          {/* Encrypted Vault (ING-Adapter Panel 4) */}
          <div className="int-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Lock size={14} color="#047857" />
                <h3 className="int-card-title">Encrypted Credential Vault</h3>
              </div>
              {adapter.hasSecrets && <span className="int-badge int-badge-green">Stored Securely</span>}
            </div>
            <div className="int-alert int-alert-info">
              Secrets are encrypted with AES-256-GCM before storage and are never returned to the browser. Leave blank to keep existing stored secret.
            </div>
            {(adapter.secretFields || []).map((sf) => (
              <div key={sf.key} className="int-field">
                <label>{sf.label}</label>
                <input
                  type="password"
                  className="int-input"
                  placeholder={adapter.hasSecrets ? "•••••••••••••••• (stored — enter to rotate)" : "Enter credential..."}
                  value={secrets[sf.key] || ""}
                  onChange={(e) => setSecrets((prev) => ({ ...prev, [sf.key]: e.target.value }))}
                />
              </div>
            ))}
            {adapter.secretRotatedAt && (
              <div style={{ fontSize: 10, color: "#64748b" }}>
                Last Rotated: <strong>{formatDateTime(adapter.secretRotatedAt)}</strong>
              </div>
            )}
            <button type="submit" className="int-btn int-btn-primary" disabled={busy}>
              <Lock size={12} /> {busy ? "Saving..." : "Save & Encrypt Configuration"}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: SYNC SETTINGS, FIELD MAPPING & PROJECT MAPPING */}
      {tab === "sync" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="int-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="int-card-head">
              <h3 className="int-card-title">Synchronization Schedule &amp; Direction</h3>
              <button type="button" className="int-btn int-btn-primary int-btn-sm" onClick={() => handleSave()} disabled={busy}>
                Save Sync Settings
              </button>
            </div>
            <div className="int-grid-2">
              <div className="int-field">
                <label>Sync Frequency</label>
                <select className="int-select" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                  <option>Every 5 Minutes</option>
                  <option>Every 15 Minutes</option>
                  <option>Every 1 Hour</option>
                  <option>Daily</option>
                  <option>Manual Only</option>
                </select>
              </div>
              <div className="int-field">
                <label>Sync Direction</label>
                <select className="int-select" value={direction} onChange={(e) => setDirection(e.target.value as any)}>
                  <option value="TWO_WAY">Two-Way (PMS ↔ External)</option>
                  <option value="ONE_WAY_IN">Inbound Only (External → PMS)</option>
                  <option value="ONE_WAY_OUT">Outbound Only (PMS → External)</option>
                </select>
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
              <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} />
              <span>Enable automatic background synchronization</span>
            </label>
          </div>

          <div className="int-grid-2">
            {/* Field Mapping */}
            <div className="int-card" style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <h3 className="int-card-title">Field Mapping</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6 }}>
                <input className="int-input" placeholder="External field (e.g. issue_title)" value={newExtField} onChange={(e) => setNewExtField(e.target.value)} />
                <input className="int-input" placeholder="PMS field (e.g. task.title)" value={newPmsField} onChange={(e) => setNewPmsField(e.target.value)} />
                <button
                  type="button"
                  className="int-btn"
                  onClick={() => {
                    if (!newExtField.trim() || !newPmsField.trim()) return;
                    setFieldMappings((prev) => [...prev, { externalField: newExtField.trim(), pmsField: newPmsField.trim() }]);
                    setNewExtField("");
                    setNewPmsField("");
                  }}
                >
                  <Plus size={12} />
                </button>
              </div>
              {fieldMappings.map((fm, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", background: "#f8fafd", borderRadius: 5, border: "1px solid #e3eaf4" }}>
                  <span><code>{fm.externalField}</code> → <strong>{fm.pmsField}</strong></span>
                  <button type="button" className="int-btn int-btn-danger int-btn-sm" onClick={() => setFieldMappings((p) => p.filter((_, idx) => idx !== i))}>
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>

            {/* Project Mapping */}
            <div className="int-card" style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <h3 className="int-card-title">Project / Repository Mapping</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6 }}>
                <input className="int-input" placeholder="External repo / workspace" value={newExtRef} onChange={(e) => setNewExtRef(e.target.value)} />
                <select className="int-select" value={newProjId} onChange={(e) => setNewProjId(e.target.value)}>
                  <option value="">Select PMS Project</option>
                  {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
                </select>
                <button
                  type="button"
                  className="int-btn"
                  onClick={() => {
                    if (!newExtRef.trim() || !newProjId) return;
                    const pr = projects.find((x) => x._id === newProjId);
                    setProjectMappings((prev) => [...prev, { externalRef: newExtRef.trim(), projectId: newProjId, projectName: pr?.projectName || "" }]);
                    setNewExtRef("");
                    setNewProjId("");
                  }}
                >
                  <Plus size={12} />
                </button>
              </div>
              {projectMappings.map((pm, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", background: "#f8fafd", borderRadius: 5, border: "1px solid #e3eaf4" }}>
                  <span><strong>{pm.externalRef}</strong> → {pm.projectName}</span>
                  <button type="button" className="int-btn int-btn-danger int-btn-sm" onClick={() => setProjectMappings((p) => p.filter((_, idx) => idx !== i))}>
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ADAPTER SYNC HISTORY & LOGS */}
      {tab === "logs" && (
        <div className="int-grid-2">
          <div className="int-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4", fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
              <span>Sync Runs ({syncRuns.length})</span>
              <button type="button" className="int-btn int-btn-sm" onClick={loadData}><RefreshCw size={10} /></button>
            </div>
            <div className="int-table-wrap">
              <table className="int-table">
                <thead><tr><th>Code</th><th>Entity</th><th>Records</th><th>Status</th><th>Time</th></tr></thead>
                <tbody>
                  {syncRuns.length === 0 ? (
                    <tr><td colSpan={5} className="int-empty">No sync runs yet. Click Sync Now above.</td></tr>
                  ) : (
                    syncRuns.map((s) => (
                      <tr key={s._id}>
                        <td style={{ fontWeight: 700, color: "#0755e9" }}>{s.syncCode}</td>
                        <td>{s.entity}</td>
                        <td>{s.recordsSuccess}/{s.recordsTotal}</td>
                        <td><span className={intStatusBadgeClass(s.status)}>{s.status}</span></td>
                        <td style={{ color: "#64748b", whiteSpace: "nowrap" }}>{formatDateTime(s.startedAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="int-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4", fontWeight: 700 }}>
              Recent Operation Logs ({logs.length})
            </div>
            <div className="int-table-wrap">
              <table className="int-table">
                <thead><tr><th>Operation</th><th>Message</th><th>Status</th><th>Time</th></tr></thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan={4} className="int-empty">No logs recorded yet.</td></tr>
                  ) : (
                    logs.map((l) => (
                      <tr key={l._id}>
                        <td style={{ fontWeight: 600 }}>{l.operation}</td>
                        <td>{l.message}</td>
                        <td><span className={intStatusBadgeClass(l.status)}>{l.status}</span></td>
                        <td style={{ color: "#64748b", whiteSpace: "nowrap" }}>{formatDateTime(l.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
