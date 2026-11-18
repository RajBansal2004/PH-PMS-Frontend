"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  MailOpen,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCheck,
  RefreshCw,
  Plus,
  Send,
  Trash2,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
  Search,
  Sliders,
} from "lucide-react";
import {
  notificationsApi,
  notifLookupApi,
  NotificationItem,
  NOTIFICATION_TYPES,
  formatDateTime,
  priorityBadgeClass,
} from "@/lib/notifications/api";
import "@/components/notifications/notifications.css";

const TABS = [
  { key: "ALL", label: "All" },
  { key: "UNREAD", label: "Unread" },
  { key: "ACTION_REQUIRED", label: "Action Required" },
  { key: "APPROVAL", label: "Approvals" },
  { key: "TASK", label: "Tasks" },
  { key: "MENTION", label: "Mentions" },
  { key: "PROJECT", label: "Projects" },
  { key: "SYSTEM", label: "System" },
] as const;

export default function NotificationCenterPage() {
  const [summary, setSummary] = useState<any>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [projects, setProjects] = useState<{ _id: string; projectName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Filters
  const [tab, setTab] = useState<string>("ALL");
  const [priority, setPriority] = useState("ALL");
  const [projectId, setProjectId] = useState("ALL");
  const [search, setSearch] = useState("");

  // Selected detail pane (NOT-001 Panel 2 / NOT-002)
  const [selected, setSelected] = useState<NotificationItem | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "comments" | "delivery" | "activity">("overview");
  const [commentText, setCommentText] = useState("");
  const [actionComment, setActionComment] = useState("");
  const [busyAction, setBusyAction] = useState(false);

  // Inline Compose Notification
  const [showCompose, setShowCompose] = useState(false);
  const [compTitle, setCompTitle] = useState("");
  const [compMessage, setCompMessage] = useState("");
  const [compType, setCompType] = useState("APPROVAL");
  const [compPriority, setCompPriority] = useState<"URGENT" | "HIGH" | "MEDIUM" | "LOW">("HIGH");
  const [compProjectId, setCompProjectId] = useState("");
  const [compActionReq, setCompActionReq] = useState(true);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sum, list, projs] = await Promise.all([
        notificationsApi.summary(),
        notificationsApi.list({
          tab,
          priority,
          projectId,
          search: search.trim() || undefined,
        }),
        notifLookupApi.projects().catch(() => []),
      ]);
      setSummary(sum);
      setItems(list);
      setProjects(projs);
      if (selected) {
        const refreshed = list.find((x) => x._id === selected._id) || null;
        setSelected(refreshed);
      } else if (list.length > 0) {
        setSelected(list[0]);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tab, priority, projectId]);

  const handleSelectItem = async (item: NotificationItem) => {
    setSelected(item);
    setDetailTab("overview");
    if (!item.readAt) {
      try {
        const upd = await notificationsApi.markRead(item._id, true);
        setSelected(upd);
        setItems((prev) => prev.map((x) => (x._id === upd._id ? upd : x)));
        setSummary((s: any) => (s ? { ...s, unread: Math.max(0, (s.unread || 1) - 1) } : s));
      } catch {
        // non-blocking
      }
    }
  };

  const handleToggleRead = async (item: NotificationItem) => {
    try {
      const upd = await notificationsApi.markRead(item._id, !item.readAt);
      setSelected(upd);
      setItems((prev) => prev.map((x) => (x._id === upd._id ? upd : x)));
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Failed to update read status");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await notificationsApi.markAllRead();
      flash(`Marked ${res.modifiedCount} notification(s) as read.`);
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Failed to mark all as read");
    }
  };

  const handlePerformAction = async (action: string) => {
    if (!selected) return;
    setBusyAction(true);
    try {
      const upd = await notificationsApi.performAction(selected._id, action, actionComment.trim());
      setSelected(upd);
      setActionComment("");
      setItems((prev) => prev.map((x) => (x._id === upd._id ? upd : x)));
      flash(`Action recorded: ${action.replace("_", " ")}.`);
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Action failed");
    } finally {
      setBusyAction(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !commentText.trim()) return;
    setBusyAction(true);
    try {
      const upd = await notificationsApi.addComment(selected._id, commentText.trim());
      setSelected(upd);
      setCommentText("");
      setItems((prev) => prev.map((x) => (x._id === upd._id ? upd : x)));
      flash("Reply posted.");
    } catch (e: any) {
      setError(e?.message || "Failed to post reply");
    } finally {
      setBusyAction(false);
    }
  };

  const handleCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compTitle.trim()) return;
    setBusyAction(true);
    try {
      const created = await notificationsApi.create({
        title: compTitle.trim(),
        message: compMessage.trim(),
        type: compType,
        priority: compPriority,
        projectId: compProjectId || undefined,
        actionRequired: compActionReq,
      });
      setShowCompose(false);
      setCompTitle("");
      setCompMessage("");
      flash(`Dispatched notification ${created.notifCode || ""}.`);
      await loadData();
      setSelected(created);
    } catch (e: any) {
      setError(e?.message || "Failed to dispatch notification");
    } finally {
      setBusyAction(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Archive this notification?")) return;
    try {
      await notificationsApi.remove(id);
      if (selected?._id === id) setSelected(null);
      flash("Notification archived.");
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    }
  };

  return (
    <div className="not-page">
      <div>
        <div className="not-breadcrumb">
          <span>Notification System</span>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Notification Center</span>
        </div>
        <div className="not-header">
          <div>
            <h1 className="not-title">Notification Center</h1>
            <p className="not-subtitle">
              Real-time alerts, approvals, mentions, multi-channel delivery tracking, and instant action responses.
            </p>
          </div>
          <div className="not-actions">
            <button type="button" className="not-btn" onClick={handleMarkAllRead}>
              <CheckCheck size={12} /> Mark All Read
            </button>
            <button type="button" className="not-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <Link href="/notifications/preferences" className="not-btn">
              <Sliders size={12} /> Preferences
            </Link>
            <button type="button" className="not-btn not-btn-primary" onClick={() => setShowCompose((v) => !v)}>
              <Plus size={12} /> New Notification
            </button>
          </div>
        </div>
      </div>

      {/* Subnav */}
      <div className="not-subnav">
        <Link href="/notifications" className="not-subnav-link active">Notification Center</Link>
        <Link href="/notifications/preferences" className="not-subnav-link">Preference Center</Link>
        <Link href="/notifications/templates" className="not-subnav-link">Template Administration</Link>
      </div>

      {error && <div className="not-alert not-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="not-alert not-alert-ok"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      {/* 6-KPI Strip (NOT-001 Panel 1) */}
      <div className="not-kpi-grid">
        <div className="not-kpi"><div className="not-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><Bell size={15} /></div><div><span className="not-kpi-label">Total</span><span className="not-kpi-val">{summary?.total ?? 0}</span></div></div>
        <div className="not-kpi"><div className="not-kpi-icon" style={{ background: "#ecfdf5", color: "#047857" }}><MailOpen size={15} /></div><div><span className="not-kpi-label">Unread</span><span className="not-kpi-val">{summary?.unread ?? 0}</span></div></div>
        <div className="not-kpi"><div className="not-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><AlertTriangle size={15} /></div><div><span className="not-kpi-label">High / Urgent</span><span className="not-kpi-val" style={{ color: "#dc2626" }}>{summary?.highPriority ?? 0}</span></div></div>
        <div className="not-kpi"><div className="not-kpi-icon" style={{ background: "#fffbeb", color: "#b45309" }}><Clock size={15} /></div><div><span className="not-kpi-label">Action Required</span><span className="not-kpi-val">{summary?.actionRequired ?? 0}</span></div></div>
        <div className="not-kpi"><div className="not-kpi-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}><Calendar size={15} /></div><div><span className="not-kpi-label">Today</span><span className="not-kpi-val">{summary?.todayCount ?? 0}</span></div></div>
      </div>

      {/* Inline Compose Broadcast */}
      {showCompose && (
        <form onSubmit={handleCompose} className="not-card" style={{ background: "#f8fbff", display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ fontWeight: 700 }}>Dispatch New Notification</div>
          <div className="not-grid-3">
            <div className="not-field">
              <label>Title *</label>
              <input className="not-input" placeholder="e.g. BRD Sign-off Pending" value={compTitle} onChange={(e) => setCompTitle(e.target.value)} required />
            </div>
            <div className="not-field">
              <label>Type</label>
              <select className="not-select" value={compType} onChange={(e) => setCompType(e.target.value)}>
                {NOTIFICATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="not-field">
              <label>Priority</label>
              <select className="not-select" value={compPriority} onChange={(e) => setCompPriority(e.target.value as any)}>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
          <div className="not-grid-2">
            <div className="not-field">
              <label>Message *</label>
              <textarea className="not-textarea" rows={2} placeholder="Detailed message body..." value={compMessage} onChange={(e) => setCompMessage(e.target.value)} required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="not-field">
                <label>Related Project</label>
                <select className="not-select" value={compProjectId} onChange={(e) => setCompProjectId(e.target.value)}>
                  <option value="">Organization-Wide</option>
                  {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
                </select>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 600 }}>
                <input type="checkbox" checked={compActionReq} onChange={(e) => setCompActionReq(e.target.checked)} />
                Require Approval / Action Response
              </label>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 7 }}>
            <button type="button" className="not-btn" onClick={() => setShowCompose(false)}>Cancel</button>
            <button type="submit" className="not-btn not-btn-primary" disabled={busyAction}><Send size={12} /> Send Notification</button>
          </div>
        </form>
      )}

      {/* Category Tabs */}
      <div className="not-seg">
        {TABS.map((t) => (
          <button key={t.key} type="button" className={`not-seg-btn ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <form
        onSubmit={(e) => { e.preventDefault(); loadData(); }}
        className="not-filter-bar"
      >
        <div style={{ position: "relative", flex: 1, minWidth: 190 }}>
          <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input className="not-input" style={{ width: "100%", paddingLeft: 28 }} placeholder="Search notifications..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="not-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="ALL">All Projects</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
        </select>
        <select className="not-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="ALL">All Priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <button type="submit" className="not-btn not-btn-primary not-btn-sm">Filter</button>
      </form>

      {/* Split Workspace: List + Interactive Detail Pane (NOT-001 Panel 1-2 & NOT-002) */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(320px, 1fr)", gap: 12, alignItems: "start" }}>
        {/* Left: List */}
        <div className="not-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="not-table-wrap">
            <table className="not-table">
              <thead>
                <tr><th>Type</th><th>Notification</th><th>Project</th><th>Priority</th><th>Time</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="not-empty">Loading notifications...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={5} className="not-empty">No notifications found. Click <strong>New Notification</strong> or send a test from Preferences.</td></tr>
                ) : (
                  items.map((n) => {
                    const isSel = selected?._id === n._id;
                    const isUnread = !n.readAt;
                    return (
                      <tr
                        key={n._id}
                        onClick={() => handleSelectItem(n)}
                        style={{
                          cursor: "pointer",
                          background: isSel ? "#eff6ff" : isUnread ? "#fcfdff" : undefined,
                        }}
                      >
                        <td><span className="not-badge not-badge-purple">{n.type}</span></td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            {isUnread && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#0755e9", flexShrink: 0 }} />}
                            <strong style={{ fontWeight: isUnread ? 700 : 600 }}>{n.title}</strong>
                          </div>
                          <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                            {n.message?.slice(0, 85)}{n.message?.length > 85 ? "…" : ""}
                          </div>
                        </td>
                        <td>{n.projectName || "—"}</td>
                        <td><span className={priorityBadgeClass(n.priority)}>{n.priority}</span></td>
                        <td style={{ whiteSpace: "nowrap", color: "#64748b", fontSize: 10 }}>{formatDateTime(n.createdAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Detail Panel */}
        <div className="not-card" style={{ position: "sticky", top: 14 }}>
          {!selected ? (
            <div className="not-empty">Select a notification to inspect details, take action, or reply.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  <span className="not-badge not-badge-blue">{selected.notifCode || "NOTIF"}</span>
                  <span className={priorityBadgeClass(selected.priority)}>{selected.priority}</span>
                  {selected.actionStatus && selected.actionStatus !== "NONE" && (
                    <span className={selected.actionStatus === "APPROVED" || selected.actionStatus === "COMPLETED" ? "not-badge not-badge-green" : selected.actionStatus === "REJECTED" ? "not-badge not-badge-red" : "not-badge not-badge-amber"}>
                      {selected.actionStatus.replace("_", " ")}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button type="button" className="not-btn not-btn-sm" onClick={() => handleToggleRead(selected)}>
                    {selected.readAt ? "Mark Unread" : "Mark Read"}
                  </button>
                  <button type="button" className="not-btn not-btn-danger not-btn-sm" onClick={() => handleDelete(selected._id)}>
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 13.5, fontWeight: 700, margin: "0 0 3px" }}>{selected.title}</h3>
                <div style={{ fontSize: 10.5, color: "#64748b" }}>
                  From <strong>{selected.senderName || "PMS System"}</strong> · {formatDateTime(selected.createdAt)}
                </div>
              </div>

              <div className="not-seg">
                {(["overview", "comments", "delivery", "activity"] as const).map((t) => (
                  <button key={t} type="button" className={`not-seg-btn ${detailTab === t ? "active" : ""}`} onClick={() => setDetailTab(t)}>
                    {t === "overview" ? "Message" : t === "comments" ? `Replies (${selected.comments?.length || 0})` : t === "delivery" ? "Channels" : "Log"}
                  </button>
                ))}
              </div>

              {detailTab === "overview" && (
                <>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap", background: "#f8fafd", padding: 10, borderRadius: 6, border: "1px solid #e3eaf4" }}>
                    {selected.message || "No additional details."}
                  </p>

                  {selected.deepLink && (
                    <Link href={selected.deepLink} className="not-btn not-btn-sm" style={{ width: "fit-content" }}>
                      Open Linked Item <ExternalLink size={11} />
                    </Link>
                  )}

                  {selected.actionRequired && selected.actionStatus === "PENDING" && (
                    <div style={{ borderTop: "1px solid #e3eaf4", paddingTop: 10, display: "flex", flexDirection: "column", gap: 7 }}>
                      <input
                        className="not-input"
                        placeholder="Optional decision comment..."
                        value={actionComment}
                        onChange={(e) => setActionComment(e.target.value)}
                      />
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button type="button" className="not-btn not-btn-success not-btn-sm" onClick={() => handlePerformAction("APPROVE")} disabled={busyAction}>
                          Approve
                        </button>
                        <button type="button" className="not-btn not-btn-sm" onClick={() => handlePerformAction("REQUEST_CHANGES")} disabled={busyAction}>
                          Request Changes
                        </button>
                        <button type="button" className="not-btn not-btn-danger not-btn-sm" onClick={() => handlePerformAction("REJECT")} disabled={busyAction}>
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {detailTab === "comments" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <form onSubmit={handleAddComment} style={{ display: "flex", gap: 6 }}>
                    <input className="not-input" style={{ flex: 1 }} placeholder="Write a reply..." value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                    <button type="submit" className="not-btn not-btn-primary not-btn-sm" disabled={busyAction || !commentText.trim()}>
                      <Send size={11} />
                    </button>
                  </form>
                  {(selected.comments || []).length === 0 ? (
                    <div className="not-empty" style={{ padding: 14 }}>No replies yet.</div>
                  ) : (
                    [...(selected.comments || [])].reverse().map((c, idx) => (
                      <div key={c._id || idx} style={{ padding: "7px 9px", background: "#eff6ff", borderRadius: 6, border: "1px solid #bfdbfe" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                          <strong>{c.byName}</strong>
                          <span style={{ color: "#64748b" }}>{formatDateTime(c.createdAt)}</span>
                        </div>
                        <div style={{ marginTop: 2 }}>{c.text}</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {detailTab === "delivery" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(selected.deliveryAudit || []).map((d, i) => (
                    <div key={d._id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 9px", background: "#f8fafd", borderRadius: 6, border: "1px solid #e3eaf4" }}>
                      <div>
                        <strong>{d.channel}</strong>
                        <div style={{ fontSize: 10, color: "#64748b" }}>{d.provider || "PMS"}</div>
                      </div>
                      <span className={d.status === "DELIVERED" ? "not-badge not-badge-green" : d.status === "FAILED" ? "not-badge not-badge-red" : "not-badge not-badge-slate"}>
                        {d.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {detailTab === "activity" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[...(selected.activityLog || [])].reverse().map((a, i) => (
                    <div key={a._id || i} style={{ padding: "6px 9px", background: "#f8fafd", borderRadius: 6, border: "1px solid #e3eaf4", fontSize: 10.5 }}>
                      <span className="not-badge not-badge-slate" style={{ marginRight: 5 }}>{a.action}</span>
                      <strong>{a.byName}</strong> {a.details && `— ${a.details}`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
