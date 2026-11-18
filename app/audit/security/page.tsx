"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Activity,
  RefreshCw,
  ChevronRight,
  Plus,
  Eye,
} from "lucide-react";
import {
  auditApi,
  AuditEventItem,
  SecurityAlertItem,
  actorDisplay,
  formatDateTime,
  severityBadgeClass,
  outcomeBadgeClass,
} from "@/lib/audit/api";
import "@/components/audit/audit.css";

export default function SecurityActivityPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Create Alert Form
  const [showNewAlert, setShowNewAlert] = useState(false);
  const [alertType, setAlertType] = useState("Multiple Failed Logins");
  const [alertUser, setAlertUser] = useState("");
  const [alertIp, setAlertIp] = useState("");
  const [alertReason, setAlertReason] = useState("");
  const [alertSev, setAlertSev] = useState<"HIGH" | "CRITICAL" | "MEDIUM">("HIGH");

  // Active Alert Remediation
  const [activeAlert, setActiveAlert] = useState<SecurityAlertItem | null>(null);
  const [remStatus, setRemStatus] = useState("INVESTIGATING");
  const [remAction, setRemAction] = useState("");
  const [remNotes, setRemNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await auditApi.security({ days: 30 });
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load security activity");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await auditApi.createAlert({
        alertType,
        userName: alertUser.trim() || "Unknown",
        ipAddress: alertIp.trim(),
        reason: alertReason.trim() || alertType,
        severity: alertSev,
        riskScore: alertSev === "CRITICAL" ? 90 : alertSev === "HIGH" ? 75 : 55,
      });
      setShowNewAlert(false);
      setAlertUser("");
      setAlertIp("");
      setAlertReason("");
      flash("Security incident alert created.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to create alert");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAlert) return;
    setSaving(true);
    try {
      await auditApi.updateAlert(activeAlert._id, {
        status: remStatus,
        remediationAction: remAction,
        notes: remNotes,
      });
      setActiveAlert(null);
      flash("Security alert remediation saved & audited.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to update alert");
    } finally {
      setSaving(false);
    }
  };

  const kpis = data?.kpis || {
    totalSecurityEvents: 0,
    failedLogins: 0,
    privilegeChanges: 0,
    highRiskEvents: 0,
    openAlerts: 0,
    investigatingAlerts: 0,
    resolvedAlerts: 0,
  };
  const alerts: SecurityAlertItem[] = data?.alerts || [];
  const events: AuditEventItem[] = data?.events || [];
  const topRiskUsers: any[] = data?.topRiskUsers || [];
  const topIps: any[] = data?.topIps || [];

  return (
    <div className="aud-page">
      <div>
        <div className="aud-breadcrumb">
          <Link href="/audit">Audit &amp; Compliance</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Security Activity &amp; Alerts</span>
        </div>
        <div className="aud-header">
          <div>
            <h1 className="aud-title">Security Activity &amp; Anomaly Center</h1>
            <p className="aud-subtitle">
              Monitor failed logins, privilege changes, risk scores, and manage incident remediation workflows.
            </p>
          </div>
          <div className="aud-actions">
            <button type="button" className="aud-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" className="aud-btn aud-btn-primary" onClick={() => setShowNewAlert((v) => !v)}>
              <Plus size={12} /> Create Security Alert
            </button>
          </div>
        </div>
      </div>

      {/* Subnav */}
      <div className="aud-subnav">
        <Link href="/audit" className="aud-subnav-link">Audit Explorer</Link>
        <Link href="/audit/security" className="aud-subnav-link active">Security Activity &amp; Alerts</Link>
        <Link href="/audit/compliance" className="aud-subnav-link">Compliance &amp; Retention</Link>
      </div>

      {error && <div className="aud-alert aud-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="aud-alert aud-alert-ok"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      {/* KPIs (AUD-003 Panel 1) */}
      <div className="aud-kpi-grid">
        <div className="aud-kpi"><div className="aud-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><Activity size={16} /></div><div><span className="aud-kpi-label">Security Events (30d)</span><span className="aud-kpi-val">{kpis.totalSecurityEvents}</span></div></div>
        <div className="aud-kpi"><div className="aud-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><Lock size={16} /></div><div><span className="aud-kpi-label">Failed Logins</span><span className="aud-kpi-val" style={{ color: "#dc2626" }}>{kpis.failedLogins}</span></div></div>
        <div className="aud-kpi"><div className="aud-kpi-icon" style={{ background: "#fffbeb", color: "#b45309" }}><ShieldAlert size={16} /></div><div><span className="aud-kpi-label">Privilege Changes</span><span className="aud-kpi-val">{kpis.privilegeChanges}</span></div></div>
        <div className="aud-kpi"><div className="aud-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><AlertTriangle size={16} /></div><div><span className="aud-kpi-label">Open / Investigating</span><span className="aud-kpi-val">{kpis.openAlerts} / {kpis.investigatingAlerts}</span></div></div>
        <div className="aud-kpi"><div className="aud-kpi-icon" style={{ background: "#ecfdf5", color: "#047857" }}><CheckCircle2 size={16} /></div><div><span className="aud-kpi-label">Resolved Alerts</span><span className="aud-kpi-val" style={{ color: "#047857" }}>{kpis.resolvedAlerts}</span></div></div>
      </div>

      {/* Inline Create Security Alert */}
      {showNewAlert && (
        <form onSubmit={handleCreateAlert} className="aud-card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8, alignItems: "end", background: "#f8fbff" }}>
          <div className="aud-field">
            <label>Alert Type *</label>
            <input className="aud-input" value={alertType} onChange={(e) => setAlertType(e.target.value)} required />
          </div>
          <div className="aud-field">
            <label>User / Subject</label>
            <input className="aud-input" placeholder="Name or email" value={alertUser} onChange={(e) => setAlertUser(e.target.value)} />
          </div>
          <div className="aud-field">
            <label>IP Address</label>
            <input className="aud-input" placeholder="e.g. 192.168.1.50" value={alertIp} onChange={(e) => setAlertIp(e.target.value)} />
          </div>
          <div className="aud-field">
            <label>Severity</label>
            <select className="aud-select" value={alertSev} onChange={(e) => setAlertSev(e.target.value as any)}>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
            </select>
          </div>
          <div className="aud-field">
            <label>Reason / Context</label>
            <input className="aud-input" placeholder="Details..." value={alertReason} onChange={(e) => setAlertReason(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="submit" className="aud-btn aud-btn-primary" disabled={saving}>Create</button>
            <button type="button" className="aud-btn" onClick={() => setShowNewAlert(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Remediation Drawer for Selected Alert (AUD-003 Panel 9) */}
      {activeAlert && (
        <form onSubmit={handleUpdateAlert} className="aud-card" style={{ background: "#fffbeb", borderColor: "#fde68a", display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ fontWeight: 700 }}>
            Remediate Alert {activeAlert.alertCode}: {activeAlert.alertType} ({activeAlert.userName})
          </div>
          <div className="aud-grid-2">
            <div className="aud-field">
              <label>Alert Status</label>
              <select className="aud-select" value={remStatus} onChange={(e) => setRemStatus(e.target.value)}>
                <option value="OPEN">Open</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </select>
            </div>
            <div className="aud-field">
              <label>Remediation Action</label>
              <select className="aud-select" value={remAction} onChange={(e) => setRemAction(e.target.value)}>
                <option value="">None / Monitoring Only</option>
                <option value="BLOCK_IP">Block Suspicious IP Address</option>
                <option value="LOCK_ACCOUNT">Temporarily Lock User Account</option>
                <option value="ADD_WATCHLIST">Add User/IP to Watchlist</option>
                <option value="FORCE_PASSWORD_RESET">Force Password / MFA Reset</option>
              </select>
            </div>
          </div>
          <div className="aud-field">
            <label>Investigation Notes</label>
            <textarea className="aud-textarea" rows={2} value={remNotes} onChange={(e) => setRemNotes(e.target.value)} placeholder="Record findings and actions taken..." />
          </div>
          <div style={{ display: "flex", gap: 7, justifyContent: "flex-end" }}>
            <button type="button" className="aud-btn" onClick={() => setActiveAlert(null)}>Cancel</button>
            <button type="submit" className="aud-btn aud-btn-primary" disabled={saving}>Save Remediation</button>
          </div>
        </form>
      )}

      {/* Suspicious Activity Alerts Table (AUD-003 Panel 6) */}
      <div className="aud-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4", fontWeight: 700 }}>
          Security Alerts &amp; Investigations ({alerts.length})
        </div>
        <div className="aud-table-wrap">
          <table className="aud-table">
            <thead>
              <tr><th>Code</th><th>Date</th><th>User</th><th>Alert Type &amp; Reason</th><th>IP</th><th>Risk</th><th>Severity</th><th>Status</th><th style={{ textAlign: "right" }}>Action</th></tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr><td colSpan={9} className="aud-empty">No security alerts recorded. System posture is clean.</td></tr>
              ) : (
                alerts.map((a) => (
                  <tr key={a._id}>
                    <td style={{ fontWeight: 700, color: "#dc2626" }}>{a.alertCode}</td>
                    <td style={{ whiteSpace: "nowrap", color: "#64748b" }}>{formatDateTime(a.createdAt)}</td>
                    <td style={{ fontWeight: 600 }}>{a.userName}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{a.alertType}</div>
                      {a.reason && <div style={{ fontSize: 10, color: "#64748b" }}>{a.reason}</div>}
                    </td>
                    <td style={{ fontFamily: "ui-monospace, monospace", fontSize: 10.5 }}>{a.ipAddress || "—"}</td>
                    <td><strong>{a.riskScore}/100</strong></td>
                    <td><span className={severityBadgeClass(a.severity)}>{a.severity}</span></td>
                    <td><span className={a.status === "RESOLVED" ? "aud-badge aud-badge-green" : a.status === "OPEN" ? "aud-badge aud-badge-red" : "aud-badge aud-badge-amber"}>{a.status}</span></td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="aud-btn aud-btn-sm"
                        onClick={() => {
                          setActiveAlert(a);
                          setRemStatus(a.status);
                          setRemAction(a.remediationAction || "");
                          setRemNotes(a.notes || "");
                        }}
                      >
                        Remediate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Risk Users & Top IPs (AUD-003 Panel 8) */}
      <div className="aud-grid-2">
        <div className="aud-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4", fontWeight: 700 }}>Top Risk Users</div>
          <div className="aud-table-wrap">
            <table className="aud-table">
              <thead><tr><th>User</th><th>Events</th><th>Failures</th><th>Risk Score</th></tr></thead>
              <tbody>
                {topRiskUsers.length === 0 ? (
                  <tr><td colSpan={4} className="aud-empty">No user risk events.</td></tr>
                ) : (
                  topRiskUsers.map((u) => (
                    <tr key={u.user}>
                      <td style={{ fontWeight: 600 }}>{u.user}</td>
                      <td>{u.events}</td>
                      <td style={{ color: u.failures > 0 ? "#dc2626" : "#64748b" }}>{u.failures}</td>
                      <td><span className={u.riskScore >= 60 ? "aud-badge aud-badge-red" : "aud-badge aud-badge-blue"}>{u.riskScore}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="aud-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4", fontWeight: 700 }}>Active Source IP Addresses</div>
          <div className="aud-table-wrap">
            <table className="aud-table">
              <thead><tr><th>IP Address</th><th>Events</th><th>Failures</th><th>Last Seen</th></tr></thead>
              <tbody>
                {topIps.length === 0 ? (
                  <tr><td colSpan={4} className="aud-empty">No IP telemetry recorded.</td></tr>
                ) : (
                  topIps.map((ip) => (
                    <tr key={ip.ip}>
                      <td style={{ fontFamily: "ui-monospace, monospace", fontWeight: 600 }}>{ip.ip}</td>
                      <td>{ip.events}</td>
                      <td style={{ color: ip.failures > 0 ? "#dc2626" : "#64748b" }}>{ip.failures}</td>
                      <td style={{ color: "#64748b" }}>{formatDateTime(ip.lastAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Security Events */}
      <div className="aud-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4", fontWeight: 700 }}>Recent Security Log ({events.length})</div>
        <div className="aud-table-wrap">
          <table className="aud-table">
            <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Severity</th><th>Outcome</th><th></th></tr></thead>
            <tbody>
              {events.slice(0, 15).map((ev) => (
                <tr key={ev._id}>
                  <td style={{ color: "#64748b", whiteSpace: "nowrap" }}>{formatDateTime(ev.createdAt)}</td>
                  <td style={{ fontWeight: 600 }}>{actorDisplay(ev)}</td>
                  <td><span className="aud-badge aud-badge-blue">{ev.action}</span></td>
                  <td><span className={severityBadgeClass(ev.severity)}>{ev.severity || "INFO"}</span></td>
                  <td><span className={outcomeBadgeClass(ev.outcome)}>{ev.outcome}</span></td>
                  <td style={{ textAlign: "right" }}>
                    <Link href={`/audit/${ev._id}`} className="aud-btn aud-btn-sm"><Eye size={11} /> View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
