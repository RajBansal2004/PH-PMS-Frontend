"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertOctagon, Plus, RefreshCw, Download, CheckCircle2, Edit3, Trash2, X } from "lucide-react";
import {
  riskIssueApi,
  formatDate,
  downloadCsv,
  type IssueItem,
  type ProjectRef,
} from "@/lib/phase2/api";
import "@/components/phase2/phase2.css";

function priBadge(p: string) {
  if (p === "CRITICAL") return "p2-badge p2-badge-red";
  if (p === "HIGH") return "p2-badge p2-badge-amber";
  if (p === "MEDIUM") return "p2-badge p2-badge-blue";
  return "p2-badge p2-badge-slate";
}

function stBadge(s: string) {
  if (s === "RESOLVED" || s === "CLOSED") return "p2-badge p2-badge-green";
  if (s === "ESCALATED") return "p2-badge p2-badge-red";
  if (s === "IN_PROGRESS") return "p2-badge p2-badge-blue";
  return "p2-badge p2-badge-amber";
}

const EMPTY_FORM = {
  projectId: "",
  title: "",
  description: "",
  category: "DELIVERY",
  priority: "HIGH",
  severity: "HIGH",
  status: "OPEN",
  ownerName: "",
  dueDate: "",
};

export default function IssueTrackerPage() {
  const [items, setItems] = useState<IssueItem[]>([]);
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priFilter, setPriFilter] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IssueItem | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);

  const [resolveTarget, setResolveTarget] = useState<IssueItem | null>(null);
  const [resolveForm, setResolveForm] = useState({ rootCause: "", resolution: "", closeImmediately: false });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await riskIssueApi.listIssues({
        search: search || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        priority: priFilter !== "ALL" ? priFilter : undefined,
      });
      setItems(res.items || []);
      setProjects(res.projects || []);
      setSummary(res.summary || null);
    } catch (e: any) {
      setError(e?.message || "Failed to load issues");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, projectId: projects[0]?._id || "" });
    setModalOpen(true);
  };

  const openEdit = (it: IssueItem) => {
    setEditing(it);
    setForm({
      projectId: typeof it.projectId === "object" && it.projectId ? it.projectId._id : (it.projectId as string) || "",
      title: it.title,
      description: it.description || "",
      category: it.category || "DELIVERY",
      priority: it.priority || "MEDIUM",
      severity: it.severity || "MEDIUM",
      status: it.status || "OPEN",
      ownerName: it.ownerName || "",
      dueDate: it.dueDate ? String(it.dueDate).slice(0, 10) : "",
    });
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await riskIssueApi.updateIssue(editing._id, form);
        setNotice(`Issue "${form.title}" updated.`);
      } else {
        await riskIssueApi.createIssue(form);
        setNotice(`Issue "${form.title}" logged.`);
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to save issue");
    } finally {
      setSaving(false);
    }
  };

  const submitResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveTarget) return;
    setSaving(true);
    try {
      await riskIssueApi.resolveIssue(resolveTarget._id, resolveForm);
      setNotice(`Issue ${resolveTarget.issueCode} resolved.`);
      setResolveTarget(null);
      await load();
    } catch (err: any) {
      setError(err?.message || "Resolve failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (it: IssueItem) => {
    if (!window.confirm(`Delete issue "${it.title}"?`)) return;
    try {
      await riskIssueApi.deleteIssue(it._id);
      setNotice("Issue deleted.");
      await load();
    } catch (err: any) {
      setError(err?.message || "Delete failed");
    }
  };

  return (
    <div className="p2-page">
      <div className="p2-header">
        <div>
          <div className="p2-breadcrumb">Governance / Issue &amp; Escalation Tracker (RSK-002)</div>
          <h1 className="p2-title">
            <AlertOctagon size={18} color="#ea580c" />
            Issue &amp; Escalation Log
          </h1>
          <div className="p2-subtitle">
            Track delivery blockers, client escalations, linked realized risks, SLA due dates &amp; root-cause resolutions
          </div>
        </div>
        <div className="p2-actions">
          <div className="p2-tabs">
            <Link href="/risks" className="p2-tab">Risk Register</Link>
            <Link href="/risks/issues" className="p2-tab active">Issue Tracker</Link>
          </div>
          <button
            type="button"
            className="p2-btn"
            disabled={!items.length}
            onClick={() =>
              downloadCsv(
                "issue-log.csv",
                ["Code", "Project", "Title", "Category", "Priority", "Status", "Owner", "Due Date", "Resolution"],
                items.map((i) => [
                  i.issueCode,
                  i.projectName,
                  i.title,
                  i.category,
                  i.priority,
                  i.status,
                  i.ownerName,
                  i.dueDate ? String(i.dueDate).slice(0, 10) : "",
                  i.resolution,
                ])
              )
            }
          >
            <Download size={13} /> CSV
          </button>
          <button type="button" className="p2-btn" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button type="button" className="p2-btn p2-btn-primary" onClick={openCreate}>
            <Plus size={14} /> Log Issue
          </button>
        </div>
      </div>

      {error && <div className="p2-banner-err">{error}</div>}
      {notice && <div className="p2-banner-ok">{notice}</div>}

      <div className="p2-kpi-grid">
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Open Issues</div>
          <div className="p2-kpi-value">{summary?.open ?? 0}</div>
        </div>
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Critical</div>
          <div className="p2-kpi-value" style={{ color: "#dc2626" }}>{summary?.critical ?? 0}</div>
        </div>
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Escalated</div>
          <div className="p2-kpi-value" style={{ color: "#ea580c" }}>{summary?.escalated ?? 0}</div>
        </div>
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">SLA Overdue</div>
          <div className="p2-kpi-value" style={{ color: "#dc2626" }}>{summary?.overdue ?? 0}</div>
        </div>
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Resolved / Closed</div>
          <div className="p2-kpi-value" style={{ color: "#079b62" }}>{summary?.resolved ?? 0}</div>
        </div>
      </div>

      <div className="p2-toolbar">
        <div className="p2-filters">
          <input className="p2-input" style={{ width: 220 }} placeholder="Search issue code, title, owner..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="p2-select" value={priFilter} onChange={(e) => setPriFilter(e.target.value)}>
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select className="p2-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ESCALATED">Escalated</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      <div className="p2-card">
        <div className="p2-table-wrap">
          <table className="p2-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Issue &amp; Project</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Owner</th>
                <th>Due Date</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it._id}>
                  <td><strong>{it.issueCode || "ISS"}</strong></td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{it.title}</div>
                    <div style={{ fontSize: 10.5, color: "#64748b" }}>
                      {typeof it.projectId === "object" && it.projectId ? it.projectId.projectName : it.projectName || "Org-wide"}
                      {typeof it.linkedRiskId === "object" && it.linkedRiskId ? ` · From ${it.linkedRiskId.riskCode}` : ""}
                    </div>
                  </td>
                  <td><span className="p2-badge p2-badge-slate">{it.category}</span></td>
                  <td><span className={priBadge(it.priority)}>{it.priority}</span></td>
                  <td>{it.ownerName || "Unassigned"}</td>
                  <td>
                    <span className={it.isOverdue ? "p2-badge p2-badge-red" : ""}>
                      {formatDate(it.dueDate)}
                    </span>
                  </td>
                  <td><span className={stBadge(it.status)}>{it.status.replace(/_/g, " ")}</span></td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 4 }}>
                      {!["RESOLVED", "CLOSED"].includes(it.status) && (
                        <button
                          type="button"
                          className="p2-btn p2-btn-green"
                          style={{ height: 25, fontSize: 10.5 }}
                          onClick={() => {
                            setResolveTarget(it);
                            setResolveForm({ rootCause: it.rootCause || "", resolution: it.resolution || "", closeImmediately: false });
                          }}
                        >
                          <CheckCircle2 size={12} /> Resolve
                        </button>
                      )}
                      <button type="button" className="p2-btn" style={{ height: 25, padding: "0 7px" }} onClick={() => openEdit(it)}>
                        <Edit3 size={12} />
                      </button>
                      <button type="button" className="p2-btn p2-btn-danger" style={{ height: 25, padding: "0 7px" }} onClick={() => void remove(it)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && !loading && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 24, color: "#64748b" }}>
                    No issues logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Issue Modal */}
      {modalOpen && (
        <div className="p2-modal-backdrop" role="dialog" aria-modal="true">
          <form className="p2-modal" style={{ maxWidth: 560 }} onSubmit={save}>
            <div className="p2-modal-head">
              <strong>{editing ? `Edit Issue — ${editing.issueCode}` : "Log Project Issue"}</strong>
              <button type="button" className="p2-btn" style={{ height: 26, padding: "0 6px" }} onClick={() => setModalOpen(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="p2-modal-body">
              <div className="p2-form-grid">
                <div className="p2-field full">
                  <label>Issue Title *</label>
                  <input className="p2-input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="p2-field">
                  <label>Project</label>
                  <select className="p2-select" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                    <option value="">Org-wide</option>
                    {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
                  </select>
                </div>
                <div className="p2-field">
                  <label>Category</label>
                  <select className="p2-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {["BLOCKER", "DELIVERY", "TECHNICAL", "CLIENT", "RESOURCE", "INFRASTRUCTURE", "COMPLIANCE"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="p2-field">
                  <label>Priority</label>
                  <select className="p2-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value, severity: e.target.value })}>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div className="p2-field">
                  <label>Status</label>
                  <select className="p2-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="ESCALATED">Escalated</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
                <div className="p2-field">
                  <label>Owner</label>
                  <input className="p2-input" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
                </div>
                <div className="p2-field">
                  <label>Target Resolution Date</label>
                  <input className="p2-input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
                <div className="p2-field full">
                  <label>Description</label>
                  <textarea className="p2-textarea" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="p2-modal-foot">
              <button type="button" className="p2-btn" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="p2-btn p2-btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save Issue"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resolve Issue Modal */}
      {resolveTarget && (
        <div className="p2-modal-backdrop" role="dialog" aria-modal="true">
          <form className="p2-modal" style={{ maxWidth: 480 }} onSubmit={submitResolve}>
            <div className="p2-modal-head">
              <strong>Resolve Issue — {resolveTarget.issueCode}</strong>
              <button type="button" className="p2-btn" style={{ height: 26, padding: "0 6px" }} onClick={() => setResolveTarget(null)}>
                <X size={14} />
              </button>
            </div>
            <div className="p2-modal-body">
              <div className="p2-field">
                <label>Root Cause Analysis</label>
                <textarea className="p2-textarea" rows={2} value={resolveForm.rootCause} onChange={(e) => setResolveForm({ ...resolveForm, rootCause: e.target.value })} />
              </div>
              <div className="p2-field">
                <label>Resolution Summary *</label>
                <textarea className="p2-textarea" rows={3} required value={resolveForm.resolution} onChange={(e) => setResolveForm({ ...resolveForm, resolution: e.target.value })} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                <input type="checkbox" checked={resolveForm.closeImmediately} onChange={(e) => setResolveForm({ ...resolveForm, closeImmediately: e.target.checked })} />
                Mark directly as CLOSED
              </label>
            </div>
            <div className="p2-modal-foot">
              <button type="button" className="p2-btn" onClick={() => setResolveTarget(null)}>Cancel</button>
              <button type="submit" className="p2-btn p2-btn-green" disabled={saving}>
                {saving ? "Saving..." : "Mark Resolved"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
