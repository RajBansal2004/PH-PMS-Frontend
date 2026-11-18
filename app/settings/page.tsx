"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Settings,
  Globe,
  ShieldCheck,
  Palette,
  Layers,
  HardDrive,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { settingsApi, formatDateTime } from "@/lib/settings/api";
import "@/components/settings/settings.css";

type GenTab = "localization" | "preferences" | "security" | "branding" | "modules" | "backup" | "audit";

export default function GeneralSettingsPage() {
  const [tab, setTab] = useState<GenTab>("localization");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await settingsApi.getGeneral();
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load general settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateField = (section: string, key: string, value: any) => {
    setData((prev: any) => ({
      ...prev,
      [section]: { ...(prev?.[section] || {}), [key]: value },
    }));
  };

  const handleSave = async (section?: string) => {
    if (!data) return;
    setSaving(true);
    setError(null);
    try {
      const payload = section ? { [section]: data[section] } : {
        localization: data.localization,
        preferences: data.preferences,
        security: data.security,
        branding: data.branding,
        modules: data.modules,
        backup: data.backup,
        maintenance: data.maintenance,
      };
      const updated = await settingsApi.updateGeneral(payload);
      setData(updated);
      flash("System settings saved and logged to audit trail.");
    } catch (e: any) {
      setError(e?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleRunBackup = async () => {
    setSaving(true);
    try {
      const updated = await settingsApi.runBackup();
      setData(updated);
      flash("Manual backup completed successfully.");
    } catch (e: any) {
      setError(e?.message || "Backup failed");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Reset all General Settings to factory defaults? Your project & operational data will NOT be deleted.")) return;
    setSaving(true);
    try {
      const updated = await settingsApi.resetGeneral();
      setData(updated);
      flash("Settings restored to factory defaults.");
    } catch (e: any) {
      setError(e?.message || "Reset failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sys-page">
      <div>
        <div className="sys-breadcrumb">
          <span>System Administration</span>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>General Settings</span>
        </div>
        <div className="sys-header">
          <div>
            <h1 className="sys-title">General Settings</h1>
            <p className="sys-subtitle">
              Configure localization, security policies, appearance branding, enabled modules, backups, and maintenance mode.
            </p>
          </div>
          <div className="sys-actions">
            <button type="button" className="sys-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" className="sys-btn sys-btn-danger" onClick={handleReset} disabled={saving}>
              <RotateCcw size={12} /> Reset Defaults
            </button>
            <button type="button" className="sys-btn sys-btn-primary" onClick={() => handleSave()} disabled={saving || loading}>
              {saving ? "Saving..." : "Save All Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Subnav */}
      <div className="sys-subnav">
        <Link href="/settings" className="sys-subnav-link active">General Settings</Link>
        <Link href="/settings/workflows" className="sys-subnav-link">Workflow Settings</Link>
        <Link href="/settings/master-data" className="sys-subnav-link">Master Data</Link>
        <Link href="/settings/health" className="sys-subnav-link">System Health</Link>
        <Link href="/settings/feature-flags" className="sys-subnav-link">Feature Flags</Link>
      </div>

      {error && <div className="sys-alert sys-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="sys-alert sys-alert-ok"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      <div className="sys-seg">
        {(
          [
            ["localization", "Localization"],
            ["preferences", "System Preferences"],
            ["security", "Security Policies"],
            ["branding", "Appearance & Branding"],
            ["modules", "Module Config"],
            ["backup", "Backup & Maintenance"],
            ["audit", `Change Log (${data?.auditTrail?.length || 0})`],
          ] as [GenTab, string][]
        ).map(([k, lbl]) => (
          <button key={k} type="button" className={`sys-seg-btn ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>
            {lbl}
          </button>
        ))}
      </div>

      {loading || !data ? (
        <div className="sys-card sys-empty">Loading system configuration...</div>
      ) : (
        <>
          {tab === "localization" && (
            <div className="sys-card" style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Globe size={15} color="#0755e9" />
                <h3 className="sys-card-title">Localization &amp; Regional Settings</h3>
              </div>
              <div className="sys-grid-3">
                <div className="sys-field">
                  <label>Default Language</label>
                  <select className="sys-select" value={data.localization?.language || "English (India)"} onChange={(e) => updateField("localization", "language", e.target.value)}>
                    <option>English (India)</option>
                    <option>English (US)</option>
                    <option>English (UK)</option>
                  </select>
                </div>
                <div className="sys-field">
                  <label>Default Timezone</label>
                  <select className="sys-select" value={data.localization?.timezone || "Asia/Kolkata"} onChange={(e) => updateField("localization", "timezone", e.target.value)}>
                    <option value="Asia/Kolkata">(GMT+05:30) Asia/Kolkata</option>
                    <option value="UTC">(GMT+00:00) UTC</option>
                    <option value="America/New_York">(GMT-05:00) America/New_York</option>
                    <option value="Europe/London">(GMT+00:00) Europe/London</option>
                  </select>
                </div>
                <div className="sys-field">
                  <label>Currency</label>
                  <select className="sys-select" value={data.localization?.currency || "INR"} onChange={(e) => updateField("localization", "currency", e.target.value)}>
                    <option value="INR">INR — Indian Rupee (₹)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                  </select>
                </div>
                <div className="sys-field">
                  <label>Date Format</label>
                  <select className="sys-select" value={data.localization?.dateFormat || "DD MMM YYYY"} onChange={(e) => updateField("localization", "dateFormat", e.target.value)}>
                    <option>DD MMM YYYY</option>
                    <option>DD/MM/YYYY</option>
                    <option>YYYY-MM-DD</option>
                    <option>MM/DD/YYYY</option>
                  </select>
                </div>
                <div className="sys-field">
                  <label>Time Format</label>
                  <select className="sys-select" value={data.localization?.timeFormat || "24 Hour"} onChange={(e) => updateField("localization", "timeFormat", e.target.value)}>
                    <option>24 Hour</option>
                    <option>12 Hour (AM/PM)</option>
                  </select>
                </div>
                <div className="sys-field">
                  <label>First Day of Week</label>
                  <select className="sys-select" value={data.localization?.firstDayOfWeek || "Monday"} onChange={(e) => updateField("localization", "firstDayOfWeek", e.target.value)}>
                    <option>Monday</option>
                    <option>Sunday</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="button" className="sys-btn sys-btn-primary" onClick={() => handleSave("localization")} disabled={saving}>Save Localization</button>
              </div>
            </div>
          )}

          {tab === "preferences" && (
            <div className="sys-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Settings size={15} color="#0755e9" />
                <h3 className="sys-card-title">Application Behavior &amp; Defaults</h3>
              </div>
              <div className="sys-grid-3">
                <div className="sys-field">
                  <label>Default Landing Page</label>
                  <select className="sys-select" value={data.preferences?.defaultLandingPage || "/dashboard"} onChange={(e) => updateField("preferences", "defaultLandingPage", e.target.value)}>
                    <option value="/dashboard">Dashboard</option>
                    <option value="/projects">Projects</option>
                    <option value="/tasks/my">My Tasks</option>
                    <option value="/timesheets">Timesheets</option>
                  </select>
                </div>
                <div className="sys-field">
                  <label>Auto Logout Inactivity (Minutes)</label>
                  <input type="number" min={5} max={480} className="sys-input" value={data.preferences?.autoLogoutMinutes ?? 30} onChange={(e) => updateField("preferences", "autoLogoutMinutes", Number(e.target.value))} />
                </div>
                <div className="sys-field">
                  <label>Default Table Rows Per Page</label>
                  <select className="sys-select" value={data.preferences?.itemsPerPage ?? 25} onChange={(e) => updateField("preferences", "itemsPerPage", Number(e.target.value))}>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              {[
                ["enableNotifications", "Enable real-time In-App & Email notifications globally"],
                ["enableActivityFeed", "Show recent workspace activity feed on dashboard"],
                ["enableInlineEditing", "Allow inline editing in registries & planners"],
                ["showHelpTips", "Display contextual workflow guidance tips"],
              ].map(([k, lbl]) => (
                <label key={k} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                  <input type="checkbox" checked={Boolean(data.preferences?.[k])} onChange={(e) => updateField("preferences", k, e.target.checked)} />
                  <span>{lbl}</span>
                </label>
              ))}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="button" className="sys-btn sys-btn-primary" onClick={() => handleSave("preferences")} disabled={saving}>Save Preferences</button>
              </div>
            </div>
          )}

          {tab === "security" && (
            <div className="sys-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <ShieldCheck size={15} color="#0755e9" />
                <h3 className="sys-card-title">Password, MFA &amp; Session Policies</h3>
              </div>
              <div className="sys-grid-3">
                <div className="sys-field">
                  <label>Minimum Password Length</label>
                  <input type="number" min={6} max={32} className="sys-input" value={data.security?.minPasswordLength ?? 8} onChange={(e) => updateField("security", "minPasswordLength", Number(e.target.value))} />
                </div>
                <div className="sys-field">
                  <label>Password Expiry (Days)</label>
                  <input type="number" min={0} max={365} className="sys-input" value={data.security?.passwordExpiryDays ?? 90} onChange={(e) => updateField("security", "passwordExpiryDays", Number(e.target.value))} />
                </div>
                <div className="sys-field">
                  <label>Prevent Reuse of Last N Passwords</label>
                  <input type="number" min={0} max={20} className="sys-input" value={data.security?.preventPasswordReuse ?? 5} onChange={(e) => updateField("security", "preventPasswordReuse", Number(e.target.value))} />
                </div>
              </div>
              <div className="sys-grid-2">
                {[
                  ["requireUppercase", "Require Uppercase Letter (A-Z)"],
                  ["requireLowercase", "Require Lowercase Letter (a-z)"],
                  ["requireNumber", "Require Numeric Digit (0-9)"],
                  ["requireSpecial", "Require Special Character (!@#$)"],
                  ["enforceMfaForAdmins", "Enforce Multi-Factor Authentication (MFA) for Admins"],
                ].map(([k, lbl]) => (
                  <label key={k} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                    <input type="checkbox" checked={Boolean(data.security?.[k])} onChange={(e) => updateField("security", k, e.target.checked)} />
                    <span>{lbl}</span>
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="button" className="sys-btn sys-btn-primary" onClick={() => handleSave("security")} disabled={saving}>Save Security Policy</button>
              </div>
            </div>
          )}

          {tab === "branding" && (
            <div className="sys-card" style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Palette size={15} color="#0755e9" />
                <h3 className="sys-card-title">Appearance &amp; White-Label Branding</h3>
              </div>
              <div className="sys-grid-2">
                <div className="sys-field">
                  <label>Application Title</label>
                  <input className="sys-input" value={data.branding?.appTitle || ""} onChange={(e) => updateField("branding", "appTitle", e.target.value)} />
                </div>
                <div className="sys-field">
                  <label>Browser Tab Title</label>
                  <input className="sys-input" value={data.branding?.browserTabTitle || ""} onChange={(e) => updateField("branding", "browserTabTitle", e.target.value)} />
                </div>
              </div>
              <div className="sys-grid-3">
                <div className="sys-field">
                  <label>Primary Brand Color</label>
                  <input type="color" className="sys-input" style={{ padding: 2 }} value={data.branding?.primaryColor || "#0755e9"} onChange={(e) => updateField("branding", "primaryColor", e.target.value)} />
                </div>
                <div className="sys-field">
                  <label>Secondary Color</label>
                  <input type="color" className="sys-input" style={{ padding: 2 }} value={data.branding?.secondaryColor || "#079b62"} onChange={(e) => updateField("branding", "secondaryColor", e.target.value)} />
                </div>
                <div className="sys-field">
                  <label>Accent Color</label>
                  <input type="color" className="sys-input" style={{ padding: 2 }} value={data.branding?.accentColor || "#f59e0b"} onChange={(e) => updateField("branding", "accentColor", e.target.value)} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="button" className="sys-btn sys-btn-primary" onClick={() => handleSave("branding")} disabled={saving}>Save Branding</button>
              </div>
            </div>
          )}

          {tab === "modules" && (
            <div className="sys-card" style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Layers size={15} color="#0755e9" />
                  <h3 className="sys-card-title">Module Enablement</h3>
                </div>
                <button type="button" className="sys-btn sys-btn-primary sys-btn-sm" onClick={() => handleSave("modules")} disabled={saving}>Save Modules</button>
              </div>
              {[
                ["projects", "Project Management", "Projects, BRDs, requirements, milestones, sprints & tasks"],
                ["resources", "Resource & Capacity", "Resource directory, allocations, planner & capacity heatmap"],
                ["timesheets", "Timesheets & Time Tracking", "Weekly timesheets, approvals & productivity analytics"],
                ["qa", "QA & Bug Management", "Test cases, test runs, 1-click bug logging & defect lifecycle"],
                ["documents", "Document Repository", "Folders, versioning, permissions & approval governance"],
                ["reports", "Reports & Analytics", "Cross-module BI reports, saved views & scheduled exports"],
                ["audit", "Audit & Compliance Center", "Immutable WORM audit logs, security alerts & retention"],
                ["integrations", "Integration Center", "External adapters, encrypted vault & sync telemetry"],
                ["finance", "Finance & Invoicing", "Budgets, billing & client invoices"],
              ].map(([k, title, desc]) => (
                <label key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 11px", border: "1px solid #e3eaf4", borderRadius: 6, cursor: "pointer" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{title}</div>
                    <div style={{ fontSize: 10.5, color: "#64748b" }}>{desc}</div>
                  </div>
                  <input type="checkbox" checked={Boolean(data.modules?.[k])} onChange={(e) => updateField("modules", k, e.target.checked)} />
                </label>
              ))}
            </div>
          )}

          {tab === "backup" && (
            <div className="sys-grid-2">
              <div className="sys-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <HardDrive size={15} color="#0755e9" />
                  <h3 className="sys-card-title">Data Backup &amp; Retention</h3>
                </div>
                <div className="sys-grid-2">
                  <div className="sys-field">
                    <label>Backup Frequency</label>
                    <select className="sys-select" value={data.backup?.frequency || "Daily"} onChange={(e) => updateField("backup", "frequency", e.target.value)}>
                      <option>Hourly</option>
                      <option>Daily</option>
                      <option>Weekly</option>
                    </select>
                  </div>
                  <div className="sys-field">
                    <label>Retention (Days)</label>
                    <input type="number" className="sys-input" value={data.backup?.retentionDays ?? 180} onChange={(e) => updateField("backup", "retentionDays", Number(e.target.value))} />
                  </div>
                </div>
                <div style={{ fontSize: 10.5, color: "#64748b" }}>
                  Last Backup: <strong>{formatDateTime(data.backup?.lastBackupAt)}</strong>
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  <button type="button" className="sys-btn" onClick={handleRunBackup} disabled={saving}>Run Backup Now</button>
                  <button type="button" className="sys-btn sys-btn-primary" onClick={() => handleSave("backup")} disabled={saving}>Save Backup Policy</button>
                </div>
              </div>

              <div className="sys-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h3 className="sys-card-title">Maintenance Mode</h3>
                <label style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 600, cursor: "pointer" }}>
                  <input type="checkbox" checked={Boolean(data.maintenance?.enabled)} onChange={(e) => updateField("maintenance", "enabled", e.target.checked)} />
                  Put portal into Maintenance Mode
                </label>
                <div className="sys-field">
                  <label>Maintenance Banner Message</label>
                  <textarea className="sys-textarea" rows={3} value={data.maintenance?.message || ""} onChange={(e) => updateField("maintenance", "message", e.target.value)} />
                </div>
                <button type="button" className="sys-btn sys-btn-primary" style={{ width: "fit-content" }} onClick={() => handleSave("maintenance")} disabled={saving}>
                  Update Maintenance Settings
                </button>
              </div>
            </div>
          )}

          {tab === "audit" && (
            <div className="sys-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="sys-table-wrap">
                <table className="sys-table">
                  <thead><tr><th>Date &amp; Time</th><th>User</th><th>Section</th><th>Action</th><th>Details</th></tr></thead>
                  <tbody>
                    {(data.auditTrail || []).length === 0 ? (
                      <tr><td colSpan={5} className="sys-empty">No settings changes recorded yet.</td></tr>
                    ) : (
                      [...(data.auditTrail || [])].reverse().map((a: any, i: number) => (
                        <tr key={a._id || i}>
                          <td style={{ color: "#64748b", whiteSpace: "nowrap" }}>{formatDateTime(a.timestamp)}</td>
                          <td style={{ fontWeight: 600 }}>{a.byName}</td>
                          <td><span className="sys-badge sys-badge-blue">{a.section}</span></td>
                          <td><span className="sys-badge sys-badge-slate">{a.action}</span></td>
                          <td>{a.details}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
