"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Users,
  Clock,
  Download,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import {
  approvalsApi,
  approvalLookupApi,
  APPROVAL_ENTITY_TYPES,
  requesterName,
  deciderName,
  projectNameOf,
  formatDateTime,
  approvalBadgeClass,
  exportApprovalsCsv,
} from "@/lib/approvals/api";
import "@/components/approvals/approvals.css";

export default function ApprovalHistoryPage() {
  const [summary, setSummary] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [projects, setProjects] = useState<{ _id: string; projectName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sum, list, projs] = await Promise.all([
        approvalsApi.summary(),
        approvalsApi.list({
          entityType: typeFilter,
          status: statusFilter,
          projectId: projectFilter,
          search: search.trim() || undefined,
        }),
        approvalLookupApi.projects().catch(() => []),
      ]);
      setSummary(sum);
      setItems(list);
      setProjects(projs);
    } catch (e: any) {
      setError(e?.message || "Failed to load approval history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [typeFilter, statusFilter, projectFilter]);

  const byType: Record<string, number> = summary?.byType || {};
  const total = Math.max(1, summary?.total || 0);

  return (
    <div className="apr-page">
      <div>
        <div className="apr-breadcrumb">
          <Link href="/approvals">Approval Engine</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Approval History</span>
        </div>
        <div className="apr-header">
          <div>
            <h1 className="apr-title">Approval History &amp; Analytics</h1>
            <p className="apr-subtitle">
              Full audit history of all approval requests, decisions, turnaround compliance, and category distribution.
            </p>
          </div>
          <div className="apr-actions">
            <button type="button" className="apr-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" className="apr-btn apr-btn-primary" onClick={() => exportApprovalsCsv(items, "approval-history")} disabled={items.length === 0}>
              <Download size={12} /> Export History CSV
            </button>
          </div>
        </div>
      </div>

      {/* Subnav */}
      <div className="apr-subnav">
        <Link href="/approvals" className="apr-subnav-link">My Approvals</Link>
        <Link href="/approvals/history" className="apr-subnav-link active">Approval History</Link>
        <Link href="/approvals/rules" className="apr-subnav-link">Approval Rules</Link>
        <Link href="/approvals/delegations" className="apr-subnav-link">Delegation &amp; Escalation</Link>
      </div>

      {error && <div className="apr-alert apr-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* KPIs */}
      <div className="apr-kpi-grid">
        <div className="apr-kpi"><div className="apr-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><ShieldCheck size={15} /></div><div><span className="apr-kpi-label">Total Requests</span><span className="apr-kpi-val">{summary?.total ?? 0}</span></div></div>
        <div className="apr-kpi"><div className="apr-kpi-icon" style={{ background: "#ecfdf5", color: "#047857" }}><CheckCircle2 size={15} /></div><div><span className="apr-kpi-label">Approved</span><span className="apr-kpi-val" style={{ color: "#047857" }}>{summary?.approved ?? 0}</span></div></div>
        <div className="apr-kpi"><div className="apr-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><XCircle size={15} /></div><div><span className="apr-kpi-label">Rejected</span><span className="apr-kpi-val" style={{ color: "#dc2626" }}>{summary?.rejected ?? 0}</span></div></div>
        <div className="apr-kpi"><div className="apr-kpi-icon" style={{ background: "#f5f3ff", color: "#6d28d9" }}><Users size={15} /></div><div><span className="apr-kpi-label">Delegated</span><span className="apr-kpi-val">{summary?.delegated ?? 0}</span></div></div>
        <div className="apr-kpi"><div className="apr-kpi-icon" style={{ background: "#fffbeb", color: "#b45309" }}><Clock size={15} /></div><div><span className="apr-kpi-label">Pending</span><span className="apr-kpi-val">{summary?.pending ?? 0}</span></div></div>
      </div>

      {/* Distribution by Type */}
      {Object.keys(byType).length > 0 && (
        <div className="apr-card">
          <h3 className="apr-card-title" style={{ marginBottom: 9 }}>Requests by Category</h3>
          <div className="apr-grid-3">
            {Object.entries(byType).map(([k, count]) => {
              const pct = Math.round((count / total) * 100);
              return (
                <div key={k}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <strong>{k}</strong>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div className="apr-bar-track"><div className="apr-bar-fill" style={{ width: `${pct}%`, background: "#0755e9" }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <form onSubmit={(e) => { e.preventDefault(); loadData(); }} className="apr-filter-bar">
        <input className="apr-input" style={{ flex: 1, minWidth: 190 }} placeholder="Search history..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="apr-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="ALL">All Types</option>
          {APPROVAL_ENTITY_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
        <select className="apr-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="ALL">All Projects</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
        </select>
        <select className="apr-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All Statuses</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="DELEGATED">Delegated</option>
          <option value="PENDING">Pending</option>
        </select>
        <button type="submit" className="apr-btn apr-btn-primary apr-btn-sm">Apply</button>
      </form>

      {/* History Table */}
      <div className="apr-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="apr-table-wrap">
          <table className="apr-table">
            <thead>
              <tr><th>Code</th><th>Title</th><th>Type</th><th>Project</th><th>Submitted By</th><th>Decided By</th><th>Decision</th><th>Date</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="apr-empty">Loading approval history...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="apr-empty">No approval records found.</td></tr>
              ) : (
                items.map((a) => (
                  <tr key={a._id}>
                    <td style={{ fontWeight: 700, color: "#0755e9" }}>{a.entityCode || a._id.slice(-6)}</td>
                    <td style={{ fontWeight: 600 }}>{a.title}</td>
                    <td><span className="apr-badge apr-badge-blue">{a.entityType}</span></td>
                    <td>{projectNameOf(a)}</td>
                    <td>{requesterName(a)}</td>
                    <td>{deciderName(a)}</td>
                    <td><span className={approvalBadgeClass(a.status)}>{a.status}</span></td>
                    <td style={{ color: "#64748b", whiteSpace: "nowrap" }}>{formatDateTime(a.decisionAt || a.createdAt)}</td>
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
