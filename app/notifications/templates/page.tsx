"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import {
  notificationsApi,
  NotificationTemplateItem,
  formatDateTime,
} from "@/lib/notifications/api";
import "@/components/notifications/notifications.css";

const SAMPLE_VARS: Record<string, string> = {
  "{{entity_name}}": "Enterprise Portal BRD",
  "{{entity_id}}": "BRD-2026-001",
  "{{entity_type}}": "BRD",
  "{{requester_name}}": "Business Analyst",
  "{{approver_name}}": "Project Manager",
  "{{submission_date}}": new Date().toLocaleDateString("en-GB"),
  "{{action_url}}": "https://pms.local/approvals",
};

function renderPreview(text = "") {
  let out = text;
  Object.entries(SAMPLE_VARS).forEach(([k, v]) => {
    out = out.split(k).join(v);
  });
  return out;
}

export default function NotificationTemplatesPage() {
  const [templates, setTemplates] = useState<NotificationTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Editor state
  const [editing, setEditing] = useState<Partial<NotificationTemplateItem> | null>(null);
  const [channelTab, setChannelTab] = useState<"inApp" | "email" | "whatsapp" | "sms">("email");
  const [saving, setSaving] = useState(false);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3500);
  };

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await notificationsApi.listTemplates();
      setTemplates(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load notification templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const openCreate = () => {
    setEditing({
      name: "",
      module: "Approval",
      category: "Workflow",
      description: "",
      channels: ["IN_APP", "EMAIL"],
      language: "English",
      status: "ACTIVE",
      inAppTitle: "{{entity_name}} Updated",
      inAppMessage: "{{requester_name}} triggered an update on {{entity_id}}.",
      inAppDeepLink: "/approvals",
      inAppPriority: "MEDIUM",
      emailSubject: "Update - {{entity_name}} ({{entity_id}})",
      emailBody: "Hello {{approver_name}},\n\n{{entity_name}} ({{entity_id}}) has been updated by {{requester_name}}.\nReview: {{action_url}}",
      whatsappHeader: "PMS Alert",
      whatsappBody: "{{entity_name}} ({{entity_id}}) updated. View: {{action_url}}",
      smsBody: "{{entity_id}} updated by {{requester_name}}.",
      variables: Object.keys(SAMPLE_VARS),
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.name?.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editing._id) {
        await notificationsApi.updateTemplate(editing._id, editing);
        flash(`Updated template ${editing.templateCode || editing.name}.`);
      } else {
        await notificationsApi.createTemplate(editing);
        flash(`Created template "${editing.name}".`);
      }
      setEditing(null);
      await loadTemplates();
    } catch (err: any) {
      setError(err?.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tpl: NotificationTemplateItem) => {
    if (!window.confirm(`Delete template ${tpl.templateCode} (${tpl.name})?`)) return;
    try {
      await notificationsApi.deleteTemplate(tpl._id);
      setTemplates((prev) => prev.filter((x) => x._id !== tpl._id));
      flash(`Deleted ${tpl.templateCode}.`);
    } catch (err: any) {
      setError(err?.message || "Delete failed");
    }
  };

  return (
    <div className="not-page">
      <div>
        <div className="not-breadcrumb">
          <Link href="/notifications">Notification Center</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Template Administration</span>
        </div>
        <div className="not-header">
          <div>
            <h1 className="not-title">Notification Template Administration</h1>
            <p className="not-subtitle">
              Manage multi-channel templates (In-App, Email, WhatsApp, SMS) with dynamic variables and live preview.
            </p>
          </div>
          <div className="not-actions">
            <button type="button" className="not-btn" onClick={loadTemplates} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" className="not-btn not-btn-primary" onClick={openCreate}>
              <Plus size={12} /> Create Template
            </button>
          </div>
        </div>
      </div>

      {/* Subnav */}
      <div className="not-subnav">
        <Link href="/notifications" className="not-subnav-link">Notification Center</Link>
        <Link href="/notifications/preferences" className="not-subnav-link">Preference Center</Link>
        <Link href="/notifications/templates" className="not-subnav-link active">Template Administration</Link>
      </div>

      {error && <div className="not-alert not-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="not-alert not-alert-ok"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      {/* Editor + Live Preview */}
      {editing && (
        <div className="not-grid-2">
          <form onSubmit={handleSave} className="not-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="not-card-head">
              <h3 className="not-card-title">{editing._id ? `Edit ${editing.templateCode}` : "Create Multi-Channel Template"}</h3>
              <button type="button" className="not-btn not-btn-sm" onClick={() => setEditing(null)}>Close</button>
            </div>
            <div className="not-grid-3">
              <div className="not-field">
                <label>Template Name *</label>
                <input className="not-input" value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
              </div>
              <div className="not-field">
                <label>Module</label>
                <input className="not-input" value={editing.module || ""} onChange={(e) => setEditing({ ...editing, module: e.target.value })} />
              </div>
              <div className="not-field">
                <label>Status</label>
                <select className="not-select" value={editing.status || "ACTIVE"} onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}>
                  <option value="ACTIVE">Active</option>
                  <option value="DRAFT">Draft</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div className="not-seg">
              {(["email", "inApp", "whatsapp", "sms"] as const).map((ct) => (
                <button key={ct} type="button" className={`not-seg-btn ${channelTab === ct ? "active" : ""}`} onClick={() => setChannelTab(ct)}>
                  {ct === "email" ? "Email" : ct === "inApp" ? "In-App" : ct === "whatsapp" ? "WhatsApp" : "SMS"}
                </button>
              ))}
            </div>

            {channelTab === "email" && (
              <>
                <div className="not-field">
                  <label>Email Subject</label>
                  <input className="not-input" value={editing.emailSubject || ""} onChange={(e) => setEditing({ ...editing, emailSubject: e.target.value })} />
                </div>
                <div className="not-field">
                  <label>Email Body</label>
                  <textarea className="not-textarea" rows={5} value={editing.emailBody || ""} onChange={(e) => setEditing({ ...editing, emailBody: e.target.value })} />
                </div>
              </>
            )}

            {channelTab === "inApp" && (
              <>
                <div className="not-field">
                  <label>In-App Title</label>
                  <input className="not-input" value={editing.inAppTitle || ""} onChange={(e) => setEditing({ ...editing, inAppTitle: e.target.value })} />
                </div>
                <div className="not-field">
                  <label>In-App Message</label>
                  <textarea className="not-textarea" rows={3} value={editing.inAppMessage || ""} onChange={(e) => setEditing({ ...editing, inAppMessage: e.target.value })} />
                </div>
              </>
            )}

            {channelTab === "whatsapp" && (
              <>
                <div className="not-field">
                  <label>WhatsApp Header</label>
                  <input className="not-input" value={editing.whatsappHeader || ""} onChange={(e) => setEditing({ ...editing, whatsappHeader: e.target.value })} />
                </div>
                <div className="not-field">
                  <label>WhatsApp Body</label>
                  <textarea className="not-textarea" rows={3} value={editing.whatsappBody || ""} onChange={(e) => setEditing({ ...editing, whatsappBody: e.target.value })} />
                </div>
              </>
            )}

            {channelTab === "sms" && (
              <div className="not-field">
                <label>SMS Message (160 chars recommended)</label>
                <textarea className="not-textarea" rows={3} value={editing.smsBody || ""} onChange={(e) => setEditing({ ...editing, smsBody: e.target.value })} />
              </div>
            )}

            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {Object.keys(SAMPLE_VARS).map((v) => (
                <span key={v} className="not-badge not-badge-blue" style={{ fontFamily: "ui-monospace, monospace" }}>{v}</span>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 7 }}>
              <button type="button" className="not-btn" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="not-btn not-btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save Template"}
              </button>
            </div>
          </form>

          {/* Live Rendered Preview (NOT-004 Panel 3) */}
          <div className="not-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h3 className="not-card-title">Live Multi-Channel Rendered Preview</h3>
            <div style={{ padding: 11, background: "#f8fafd", border: "1px solid #e3eaf4", borderRadius: 7 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#0755e9", marginBottom: 3 }}>EMAIL PREVIEW</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{renderPreview(editing.emailSubject)}</div>
              <div style={{ whiteSpace: "pre-wrap", fontSize: 11, color: "#334155" }}>{renderPreview(editing.emailBody)}</div>
            </div>
            <div style={{ padding: 11, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 7 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#1e40af", marginBottom: 3 }}>IN-APP NOTIFICATION</div>
              <div style={{ fontWeight: 700 }}>{renderPreview(editing.inAppTitle)}</div>
              <div style={{ fontSize: 11, color: "#334155" }}>{renderPreview(editing.inAppMessage)}</div>
            </div>
            <div style={{ padding: 11, background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 7 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#047857", marginBottom: 3 }}>WHATSAPP / SMS</div>
              <div style={{ fontWeight: 700 }}>{editing.whatsappHeader || "PMS Alert"}</div>
              <div style={{ fontSize: 11, color: "#065f46" }}>{renderPreview(editing.whatsappBody || editing.smsBody)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Template Library Table (NOT-004 Panel 1) */}
      <div className="not-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="not-table-wrap">
          <table className="not-table">
            <thead>
              <tr><th>Code</th><th>Template Name</th><th>Module</th><th>Channels</th><th>Status</th><th>Updated</th><th style={{ textAlign: "right" }}>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="not-empty">Loading templates...</td></tr>
              ) : templates.length === 0 ? (
                <tr><td colSpan={7} className="not-empty">No templates found.</td></tr>
              ) : (
                templates.map((tpl) => (
                  <tr key={tpl._id}>
                    <td style={{ fontWeight: 700, color: "#0755e9" }}>{tpl.templateCode}</td>
                    <td>
                      <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}><FileText size={12} color="#64748b" /> {tpl.name}</div>
                      {tpl.description && <div style={{ fontSize: 10, color: "#64748b" }}>{tpl.description}</div>}
                    </td>
                    <td><span className="not-badge not-badge-purple">{tpl.module}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                        {(tpl.channels || []).map((c) => <span key={c} className="not-badge not-badge-slate">{c}</span>)}
                      </div>
                    </td>
                    <td><span className={tpl.status === "ACTIVE" ? "not-badge not-badge-green" : "not-badge not-badge-amber"}>{tpl.status}</span></td>
                    <td style={{ color: "#64748b", whiteSpace: "nowrap" }}>{formatDateTime(tpl.updatedAt)}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <button type="button" className="not-btn not-btn-sm" onClick={() => setEditing(tpl)}><Edit3 size={11} /> Edit</button>
                        <button type="button" className="not-btn not-btn-danger not-btn-sm" onClick={() => handleDelete(tpl)}><Trash2 size={11} /></button>
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
