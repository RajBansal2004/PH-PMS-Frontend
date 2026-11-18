"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Plus,
  RefreshCw,
  Download,
  Send,
  AlertTriangle,
  ChevronRight,
  Search,
} from "lucide-react";
import {
  approvalsApi,
  approvalLookupApi,
  APPROVAL_ENTITY_TYPES,
  APPROVAL_ROLES,
  requesterName,
  deciderName,
  projectNameOf,
  formatDateTime,
  approvalBadgeClass,
  exportApprovalsCsv,
} from "@/lib/approvals/api";
import "@/components/approvals/approvals.css";

const STATUS_TABS = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "DELEGATED", label: "Delegated" },
  { key: "ALL", label: "All Requests" },
] as const;

export default function ApprovalCenterPage() {
  const [summary, setSummary] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [projects, setProjects] = useState<{ _id: string; projectName: string }[]>([]);
  const [employees, setEmployees] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Filters
  const [statusTab, setStatusTab] = useState<string>("PENDING");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Selected request detail pane
  const [selected, setSelected] = useState<any | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "comments" | "history">("overview");
  const [decisionNote, setDecisionNote] = useState("");
  const [delegateToId, setDelegateToId] = useState("");
  const [commentText, setCommentText] = useState("");
  const [busy, setBusy] = useState(false);

  // Inline New Request
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("BRD");
  const [newProjectId, setNewProjectId] = useState("");
  const [newRole, setNewRole] = useState("PROJECT_MANAGER");
  const [newPriority, setNewPriority] = useState("HIGH");
  const [newDesc, setNewDesc] = useState("");

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sum, list, projs, emps] = await Promise.all([
        approvalsApi.summary(),
        approvalsApi.list({
          status: statusTab,
          entityType: typeFilter,
          projectId: projectFilter,
          search: search.trim() || undefined,
        }),
        approvalLookupApi.projects().catch(() => []),
        approvalLookupApi.employees().catch(() => []),
      ]);
      setSummary(sum);
      setItems(list);
      setProjects(projs);
      setEmployees(emps);
      if (selected) {
        const refreshed = list.find((x) => x._id === selected._id) || list[0] || null;
        setSelected(refreshed);
      } else if (list.length > 0) {
        setSelected(list[0]);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load approval requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusTab, typeFilter, projectFilter]);

  const handleDecision = async (decision: "APPROVE" | "REJECT" | "REQUEST_CHANGES" | "DELEGATE") => {
    if (!selected) return;
    if ((decision === "REJECT" || decision === "REQUEST_CHANGES") && !decisionNote.trim()) {
      setError("Please enter a reason / comment before rejecting or requesting changes.");
      return;
    }
    if (decision === "DELEGATE" && !delegateToId) {
      setError("Please select a team member to delegate this approval to.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const emp = employees.find((e) => e._id === delegateToId);
      const updated = await approvalsApi.decide(selected._id, {
        decision,
        comments: decisionNote.trim(),
        delegatedToId: decision === "DELEGATE" ? delegateToId : undefined,
        delegatedToName: decision === "DELEGATE" ? emp?.name : undefined,
      });
      setSelected(updated);
      setDecisionNote("");
      setDelegateToId("");
      flash(`Request ${updated.entityCode || ""} marked as ${updated.status}.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Decision failed");
    } finally {
      setBusy(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !commentText.trim()) return;
    setBusy(true);
    try {
      const updated = await approvalsApi.addComment(selected._id, commentText.trim());
      setSelected(updated);
      setCommentText("");
      flash("Comment added.");
    } catch (err: any) {
      setError(err?.message || "Failed to post comment");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const created = await approvalsApi.create({
        title: newTitle.trim(),
        entityType: newType,
        projectId: newProjectId || undefined,
        requiredRole: newRole,
        priority: newPriority,
        description: newDesc.trim(),
      });
      setShowNew(false);
      setNewTitle("");
      setNewDesc("");
      setStatusTab("PENDING");
      flash(`Submitted approval request ${created.entityCode || ""}.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to submit approval request");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="apr-page">
      <div>
        <div className="apr-breadcrumb">
          <span>Approval Engine</span>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>My Approvals</span>
        </div>
        <div className="apr-header">
          <div>
            <h1 className="apr-title">Approval Center</h1>
            <p className="apr-subtitle">
              Review, approve, reject, request changes, or delegate pending items across BRDs, Resources, Timesheets, and Documents.
            </p>
          </div>
          <div className="apr-actions">
            <button type="button" className="apr-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" className="apr-btn" onClick={() => exportApprovalsCsv(items)} disabled={items.length === 0}>
              <Download size={12} /> Export CSV
            </button>
            <button type="button" className="apr-btn apr-btn-primary" onClick={() => setShowNew((v) => !v)}>
              <Plus size={12} /> New Approval Request
            </button>
          </div>
        </div>
      </div>

      {/* Subnav */}
      <div className="apr-subnav">
        <Link href="/approvals" className="apr-subnav-link active">My Approvals</Link>
        <Link href="/approvals/history" className="apr-subnav-link">Approval History</Link>
        <Link href="/approvals/rules" className="apr-subnav-link">Approval Rules</Link>
        <Link href="/approvals/delegations" className="apr-subnav-link">Delegation &amp; Escalation</Link>
      </div>

      {error && <div className="apr-alert apr-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="apr-alert apr-alert-ok"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      {/* KPI Strip (APR-001 Panel 1) */}
      <div className="apr-kpi-grid">
        <div className="apr-kpi"><div className="apr-kpi-icon" style={{ background: "#fffbeb", color: "#b45309" }}><Clock size={15} /></div><div><span className="apr-kpi-label">Pending</span><span className="apr-kpi-val">{summary?.pending ?? 0}</span></div></div>
        <div className="apr-kpi"><div className="apr-kpi-icon" style={{ background: "#ecfdf5", color: "#047857" }}><CheckCircle2 size={15} /></div><div><span className="apr-kpi-label">Approved</span><span className="apr-kpi-val" style={{ color: "#047857" }}>{summary?.approved ?? 0}</span></div></div>
        <div className="apr-kpi"><div className="apr-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><XCircle size={15} /></div><div><span className="apr-kpi-label">Rejected</span><span className="apr-kpi-val" style={{ color: "#dc2626" }}>{summary?.rejected ?? 0}</span></div></div>
        <div className="apr-kpi"><div className="apr-kpi-icon" style={{ background: "#f5f3ff", color: "#6d28d9" }}><Users size={15} /></div><div><span className="apr-kpi-label">Delegated</span><span className="apr-kpi-val">{summary?.delegated ?? 0}</span></div></div>
        <div className="apr-kpi"><div className="apr-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><ShieldCheck size={15} /></div><div><span className="apr-kpi-label">Total Requests</span><span className="apr-kpi-val">{summary?.total ?? 0}</span></div></div>
      </div>

      {/* Inline New Approval Request */}
      {showNew && (
        <form onSubmit={handleCreateRequest} className="apr-card" style={{ background: "#f8fbff", display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ fontWeight: 700 }}>Submit New Approval Request</div>
          <div className="apr-grid-3">
            <div className="apr-field">
              <label>Request Title *</label>
              <input className="apr-input" placeholder="e.g. BRD v1.0 Sign-off" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
            </div>
            <div className="apr-field">
              <label>Request Type</label>
              <select className="apr-select" value={newType} onChange={(e) => setNewType(e.target.value)}>
                {APPROVAL_ENTITY_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div className="apr-field">
              <label>Project</label>
              <select className="apr-select" value={newProjectId} onChange={(e) => setNewProjectId(e.target.value)}>
                <option value="">Organization-Wide</option>
                {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
              </select>
            </div>
          </div>
          <div className="apr-grid-3">
            <div className="apr-field">
              <label>Required Approver Role</label>
              <select className="apr-select" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                {APPROVAL_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div className="apr-field">
              <label>Priority</label>
              <select className="apr-select" value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div className="apr-field">
              <label>Summary / Context</label>
              <input className="apr-input" placeholder="Business justification or notes..." value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 7 }}>
            <button type="button" className="apr-btn" onClick={() => setShowNew(false)}>Cancel</button>
            <button type="submit" className="apr-btn apr-btn-primary" disabled={busy}>Submit Request</button>
          </div>
        </form>
      )}

      {/* Status Tabs */}
      <div className="apr-seg">
        {STATUS_TABS.map((t) => (
          <button key={t.key} type="button" className={`apr-seg-btn ${statusTab === t.key ? "active" : ""}`} onClick={() => setStatusTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <form onSubmit={(e) => { e.preventDefault(); loadData(); }} className="apr-filter-bar">
        <div style={{ position: "relative", flex: 1, minWidth: 190 }}>
          <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input className="apr-input" style={{ width: "100%", paddingLeft: 28 }} placeholder="Search by code, title, or requester..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="apr-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="ALL">All Types</option>
          {APPROVAL_ENTITY_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
        <select className="apr-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="ALL">All Projects</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
        </select>
        <button type="submit" className="apr-btn apr-btn-primary apr-btn-sm">Filter</button>
      </form>

      {/* Split Workspace: Approvals Queue + Detail & Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(320px, 1fr)", gap: 12, alignItems: "start" }}>
        <div className="apr-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="apr-table-wrap">
            <table className="apr-table">
              <thead>
                <tr><th>Request</th><th>Type</th><th>Project</th><th>Submitted By</th><th>Status</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="apr-empty">Loading approvals...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={5} className="apr-empty">No approval requests in this queue.</td></tr>
                ) : (
                  items.map((a) => (
                    <tr
                      key={a._id}
                      onClick={() => { setSelected(a); setDetailTab("overview"); }}
                      style={{ cursor: "pointer", background: selected?._id === a._id ? "#eff6ff" : undefined }}
                    >
                      <td>
                        <div style={{ fontWeight: 700 }}>{a.title}</div>
                        <div style={{ fontSize: 10, color: "#64748b" }}>
                          <strong style={{ color: "#0755e9" }}>{a.entityCode || a._id.slice(-6)}</strong> · {formatDateTime(a.createdAt)}
                        </div>
                      </td>
                      <td><span className="apr-badge apr-badge-blue">{a.entityType}</span></td>
                      <td>{projectNameOf(a)}</td>
                      <td>{requesterName(a)}</td>
                      <td><span className={approvalBadgeClass(a.status)}>{a.status}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Detail & Decision Panel (APR-001 Panel 3-7 & APR-002) */}
        <div className="apr-card" style={{ position: "sticky", top: 14 }}>
          {!selected ? (
            <div className="apr-empty">Select an approval request to inspect details and take action.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span className="apr-badge apr-badge-blue">{selected.entityCode || "REQUEST"}</span>
                <span className={approvalBadgeClass(selected.status)}>{selected.status}</span>
              </div>

              <div>
                <h3 style={{ fontSize: 13.5, fontWeight: 700, margin: "0 0 3px" }}>{selected.title}</h3>
                <div style={{ fontSize: 10.5, color: "#64748b" }}>
                  Type: <strong>{selected.entityType}</strong> · Role: <strong>{selected.requiredRole}</strong> · Project: <strong>{projectNameOf(selected)}</strong>
                </div>
              </div>

              <div className="apr-seg">
                {(["overview", "comments", "history"] as const).map((t) => (
                  <button key={t} type="button" className={`apr-seg-btn ${detailTab === t ? "active" : ""}`} onClick={() => setDetailTab(t)}>
                    {t === "overview" ? "Details & Decision" : t === "comments" ? `Comments (${selected.discussionComments?.length || 0})` : "Audit Trail"}
                  </button>
                ))}
              </div>

              {detailTab === "overview" && (
                <>
                  <div style={{ background: "#f8fafd", padding: 10, borderRadius: 6, border: "1px solid #e3eaf4" }}>
                    <div style={{ fontSize: 10.5, color: "#64748b", marginBottom: 4 }}>
                      Submitted by <strong>{requesterName(selected)}</strong> on {formatDateTime(selected.createdAt)}
                    </div>
                    <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{selected.description || "No additional description provided."}</p>
                    {selected.delegatedToName && (
                      <div style={{ marginTop: 6, fontSize: 10.5, color: "#6d28d9" }}>
                        Delegated to: <strong>{selected.delegatedToName}</strong>
                      </div>
                    )}
                    {selected.decisionAt && (
                      <div style={{ marginTop: 6, fontSize: 10.5, color: "#475569" }}>
                        Decided by <strong>{deciderName(selected)}</strong> on {formatDateTime(selected.decisionAt)}
                        {selected.comments ? ` — "${selected.comments}"` : ""}
                      </div>
                    )}
                  </div>

                  {["PENDING", "ESCALATED", "DELEGATED", "CHANGES_REQUESTED"].includes(selected.status) && (
                    <div style={{ borderTop: "1px solid #e3eaf4", paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div className="apr-field">
                        <label>Decision Comments / Reason</label>
                        <textarea className="apr-textarea" rows={2} placeholder="Add approval notes or mandatory rejection reason..." value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} />
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button type="button" className="apr-btn apr-btn-success apr-btn-sm" onClick={() => handleDecision("APPROVE")} disabled={busy}>
                          Approve
                        </button>
                        <button type="button" className="apr-btn apr-btn-danger apr-btn-sm" onClick={() => handleDecision("REJECT")} disabled={busy}>
                          Reject
                        </button>
                        <button type="button" className="apr-btn apr-btn-sm" onClick={() => handleDecision("REQUEST_CHANGES")} disabled={busy}>
                          Request Changes
                        </button>
                      </div>

                      {/* Delegate */}
                      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                        <select className="apr-select" style={{ flex: 1 }} value={delegateToId} onChange={(e) => setDelegateToId(e.target.value)}>
                          <option value="">Delegate to team member...</option>
                          {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
                        </select>
                        <button type="button" className="apr-btn apr-btn-sm" onClick={() => handleDecision("DELEGATE")} disabled={busy || !delegateToId}>
                          Delegate
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {detailTab === "comments" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <form onSubmit={handlePostComment} style={{ display: "flex", gap: 6 }}>
                    <input className="apr-input" style={{ flex: 1 }} placeholder="Write discussion comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                    <button type="submit" className="apr-btn apr-btn-primary apr-btn-sm" disabled={busy || !commentText.trim()}>
                      <Send size={11} />
                    </button>
                  </form>
                  {(selected.discussionComments || []).length === 0 ? (
                    <div className="apr-empty" style={{ padding: 14 }}>No discussion comments yet.</div>
                  ) : (
                    [...(selected.discussionComments || [])].reverse().map((c: any, idx: number) => (
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

              {detailTab === "history" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(selected.activityLog || []).length === 0 ? (
                    <div className="apr-empty" style={{ padding: 14 }}>No activity history logged yet.</div>
                  ) : (
                    [...(selected.activityLog || [])].reverse().map((a: any, i: number) => (
                      <div key={a._id || i} style={{ padding: "6px 9px", background: "#f8fafd", borderRadius: 6, border: "1px solid #e3eaf4", fontSize: 10.5 }}>
                        <span className="apr-badge apr-badge-slate" style={{ marginRight: 5 }}>{a.action}</span>
                        <strong>{a.byName}</strong> {a.details && `— ${a.details}`}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
