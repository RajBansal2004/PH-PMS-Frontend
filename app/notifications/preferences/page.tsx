"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  Mail,
  MessageCircle,
  Smartphone,
  Hash,
  Send,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Moon,
} from "lucide-react";
import { notificationsApi, NOTIFICATION_TYPES } from "@/lib/notifications/api";
import "@/components/notifications/notifications.css";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function NotificationPreferencesPage() {
  const [tab, setTab] = useState<"channels" | "matrix" | "quiet" | "delivery" | "test">("channels");
  const [channels, setChannels] = useState({ inApp: true, email: true, whatsapp: false, slack: false, sms: false, push: true });
  const [eventMatrix, setEventMatrix] = useState<Record<string, { inApp: boolean; email: boolean; whatsapp: boolean; sms: boolean }>>({});
  const [quietHours, setQuietHours] = useState({ enabled: false, startTime: "22:00", endTime: "07:00", days: ["Saturday", "Sunday"] });
  const [delivery, setDelivery] = useState({
    digest: "INSTANT",
    groupSimilar: true,
    desktopAlerts: true,
    playSound: false,
    badgeCount: true,
    dailySummary: true,
    notifyEscalations: true,
    includeComments: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testType, setTestType] = useState("APPROVAL");
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    notificationsApi
      .getPreferences()
      .then((pref) => {
        if (pref.channels) setChannels((c) => ({ ...c, ...pref.channels }));
        if (pref.eventMatrix) setEventMatrix(pref.eventMatrix);
        if (pref.quietHours) setQuietHours((q) => ({ ...q, ...pref.quietHours }));
        if (pref.delivery) setDelivery((d) => ({ ...d, ...pref.delivery }));
      })
      .catch((e: any) => setError(e?.message || "Failed to load preferences"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await notificationsApi.updatePreferences({ channels, eventMatrix, quietHours, delivery });
      flash("Notification preferences saved.");
    } catch (e: any) {
      setError(e?.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await notificationsApi.sendTest({ type: testType });
      setTestResult(res);
      flash("Live test notification dispatched to your enabled channels!");
    } catch (e: any) {
      setError(e?.message || "Test notification failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleMatrixCell = (evType: string, ch: "inApp" | "email" | "whatsapp" | "sms") => {
    setEventMatrix((prev) => {
      const row = prev[evType] || { inApp: true, email: true, whatsapp: false, sms: false };
      return { ...prev, [evType]: { ...row, [ch]: !row[ch] } };
    });
  };

  const toggleQuietDay = (day: string) => {
    setQuietHours((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
    }));
  };

  return (
    <div className="not-page">
      <div>
        <div className="not-breadcrumb">
          <Link href="/notifications">Notification Center</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Preference Center</span>
        </div>
        <div className="not-header">
          <div>
            <h1 className="not-title">Notification Preference Center</h1>
            <p className="not-subtitle">
              Control which channels, events, quiet hours, and digest modes you receive notifications through.
            </p>
          </div>
          <button type="button" className="not-btn not-btn-primary" onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save All Preferences"}
          </button>
        </div>
      </div>

      {/* Subnav */}
      <div className="not-subnav">
        <Link href="/notifications" className="not-subnav-link">Notification Center</Link>
        <Link href="/notifications/preferences" className="not-subnav-link active">Preference Center</Link>
        <Link href="/notifications/templates" className="not-subnav-link">Template Administration</Link>
      </div>

      {error && <div className="not-alert not-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="not-alert not-alert-ok"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      <div className="not-seg">
        {(
          [
            ["channels", "Channels"],
            ["matrix", "Notification Types"],
            ["quiet", "Quiet Hours"],
            ["delivery", "Delivery & Digest"],
            ["test", "Test & Preview"],
          ] as const
        ).map(([k, lbl]) => (
          <button key={k} type="button" className={`not-seg-btn ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>
            {lbl}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="not-card not-empty">Loading preferences...</div>
      ) : (
        <>
          {tab === "channels" && (
            <div className="not-card" style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <h3 className="not-card-title">Enabled Notification Channels</h3>
              {[
                { key: "inApp", label: "In-App Notifications", desc: "Real-time alerts inside the PH-PMS web app.", icon: Bell },
                { key: "email", label: "Email Notifications", desc: "Detailed notifications & approval summaries via email.", icon: Mail },
                { key: "whatsapp", label: "WhatsApp Notifications", desc: "Instant alerts for approvals and critical issues on WhatsApp.", icon: MessageCircle },
                { key: "push", label: "Mobile & Desktop Push", desc: "Browser and mobile push notifications.", icon: Smartphone },
                { key: "slack", label: "Slack Notifications", desc: "Forward workspace alerts to your Slack channel.", icon: Hash },
                { key: "sms", label: "SMS Critical Alerts", desc: "Receive urgent security & escalation alerts via SMS.", icon: Smartphone },
              ].map((ch) => {
                const Icon = ch.icon;
                const val = (channels as any)[ch.key];
                return (
                  <label
                    key={ch.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "9px 12px",
                      border: "1px solid #e3eaf4",
                      borderRadius: 7,
                      cursor: "pointer",
                      background: val ? "#f8fbff" : "#ffffff",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="not-kpi-icon" style={{ background: val ? "#eff6ff" : "#f1f5f9", color: val ? "#0755e9" : "#64748b" }}>
                        <Icon size={15} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700 }}>{ch.label}</div>
                        <div style={{ fontSize: 10.5, color: "#64748b" }}>{ch.desc}</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(val)}
                      onChange={(e) => setChannels((prev) => ({ ...prev, [ch.key]: e.target.checked }))}
                    />
                  </label>
                );
              })}
            </div>
          )}

          {tab === "matrix" && (
            <div className="not-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="not-table-wrap">
                <table className="not-table">
                  <thead>
                    <tr><th>Event Category</th><th>In-App</th><th>Email</th><th>WhatsApp</th><th>SMS</th></tr>
                  </thead>
                  <tbody>
                    {NOTIFICATION_TYPES.map((ev) => {
                      const row = eventMatrix[ev] || { inApp: true, email: true, whatsapp: false, sms: false };
                      return (
                        <tr key={ev}>
                          <td style={{ fontWeight: 700 }}>{ev}</td>
                          {(["inApp", "email", "whatsapp", "sms"] as const).map((ch) => (
                            <td key={ch}>
                              <input type="checkbox" checked={Boolean(row[ch])} onChange={() => toggleMatrixCell(ev, ch)} />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "quiet" && (
            <div className="not-card" style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Moon size={15} color="#0755e9" />
                <h3 className="not-card-title">Quiet Hours (Do Not Disturb)</h3>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 600, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={quietHours.enabled}
                  onChange={(e) => setQuietHours((q) => ({ ...q, enabled: e.target.checked }))}
                />
                Enable Quiet Hours for non-critical notifications
              </label>
              <div className="not-grid-2">
                <div className="not-field">
                  <label>Start Time</label>
                  <input type="time" className="not-input" value={quietHours.startTime} onChange={(e) => setQuietHours((q) => ({ ...q, startTime: e.target.value }))} />
                </div>
                <div className="not-field">
                  <label>End Time</label>
                  <input type="time" className="not-input" value={quietHours.endTime} onChange={(e) => setQuietHours((q) => ({ ...q, endTime: e.target.value }))} />
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 10.5, marginBottom: 6 }}>Quiet Days</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {DAYS.map((d) => (
                    <label key={d} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 5, border: "1px solid #dce5f2", cursor: "pointer" }}>
                      <input type="checkbox" checked={quietHours.days.includes(d)} onChange={() => toggleQuietDay(d)} />
                      <span>{d}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="not-alert not-alert-info">
                Critical security alerts and urgent SLA escalations bypass Quiet Hours automatically.
              </div>
            </div>
          )}

          {tab === "delivery" && (
            <div className="not-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h3 className="not-card-title">Delivery &amp; Digest Preferences</h3>
              <div className="not-field" style={{ maxWidth: 280 }}>
                <label>Notification Digest Frequency</label>
                <select className="not-select" value={delivery.digest} onChange={(e) => setDelivery((d) => ({ ...d, digest: e.target.value }))}>
                  <option value="INSTANT">Instant (Real-Time)</option>
                  <option value="HOURLY">Hourly Digest</option>
                  <option value="DAILY">Daily Digest</option>
                  <option value="WEEKLY">Weekly Summary</option>
                </select>
              </div>
              {[
                ["groupSimilar", "Group similar notifications together to reduce clutter"],
                ["desktopAlerts", "Show browser desktop alerts for incoming events"],
                ["playSound", "Play subtle chime sound on urgent alerts"],
                ["badgeCount", "Display unread badge count in sidebar & topbar"],
                ["dailySummary", "Send daily morning summary of pending actions"],
                ["notifyEscalations", "Always notify immediately on workflow escalations"],
                ["includeComments", "Include full comment text inside email notifications"],
              ].map(([key, label]) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={Boolean((delivery as any)[key])}
                    onChange={(e) => setDelivery((d) => ({ ...d, [key]: e.target.checked }))}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          )}

          {tab === "test" && (
            <div className="not-grid-2">
              <div className="not-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h3 className="not-card-title">Send Live Test Notification</h3>
                <div className="not-field">
                  <label>Notification Event Type</label>
                  <select className="not-select" value={testType} onChange={(e) => setTestType(e.target.value)}>
                    {NOTIFICATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <button type="button" className="not-btn not-btn-primary" onClick={handleSendTest} disabled={saving}>
                  <Send size={12} /> {saving ? "Dispatching..." : "Dispatch Test Notification"}
                </button>

                {testResult?.deliveryAudit && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 11 }}>Delivery Audit Result:</div>
                    {testResult.deliveryAudit.map((d: any, idx: number) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "6px 9px", background: "#f8fafd", borderRadius: 5, border: "1px solid #e3eaf4" }}>
                        <strong>{d.channel}</strong>
                        <span className={d.status === "DELIVERED" ? "not-badge not-badge-green" : "not-badge not-badge-slate"}>{d.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="not-card" style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <h3 className="not-card-title">Multi-Channel Preview</h3>
                <div style={{ padding: 10, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 7 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#0755e9" }}>IN-APP CARD</div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>Test {testType} Notification</div>
                  <div style={{ fontSize: 10.5, color: "#334155" }}>Dispatched via PH-PMS Notification Engine · Just now</div>
                </div>
                <div style={{ padding: 10, background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 7 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#047857" }}>WHATSAPP MESSAGE</div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>PH-PMS Bot — {testType}</div>
                  <div style={{ fontSize: 10.5, color: "#065f46" }}>Action required on your workspace item. Tap link to review.</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
