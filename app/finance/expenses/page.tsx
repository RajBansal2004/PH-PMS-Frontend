"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { HandCoins, Plus, RefreshCw, Download, Check, XCircle, Trash2, X } from "lucide-react";
import {
  financeApi,
  formatInr,
  formatInrCompact,
  formatDate,
  downloadCsv,
  type ProjectExpenseItem,
  type ProjectRef,
} from "@/lib/phase2/api";
import "@/components/phase2/phase2.css";

const CATEGORIES = [
  "EMPLOYEE_LABOR",
  "FREELANCER",
  "CLOUD_INFRA",
  "THIRD_PARTY_API",
  "SOFTWARE_LICENSE",
  "TRAVEL",
  "SHARED_OVERHEAD",
  "OTHER",
];

function expBadge(status: string) {
  if (status === "APPROVED" || status === "REIMBURSED") return "p2-badge p2-badge-green";
  if (status === "REJECTED") return "p2-badge p2-badge-red";
  return "p2-badge p2-badge-amber";
}

export default function FinanceExpensesPage() {
  const [items, setItems] = useState<ProjectExpenseItem[]>([]);
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    projectId: "",
    category: "CLOUD_INFRA",
    vendorName: "",
    description: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    amount: 0,
    billableToClient: false,
    invoiceRef: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await financeApi.listExpenses({
        search: search || undefined,
        category: catFilter !== "ALL" ? catFilter : undefined,
        approvalStatus: statusFilter !== "ALL" ? statusFilter : undefined,
      });
      setItems(res.items || []);
      setProjects(res.projects || []);
      setSummary(res.summary || null);
    } catch (e: any) {
      setError(e?.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [search, catFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.projectId || !form.description.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await financeApi.createExpense(form);
      setNotice("Project expense logged.");
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to log expense");
    } finally {
      setSaving(false);
    }
  };

  const decide = async (exp: ProjectExpenseItem, decision: "APPROVE" | "REJECT" | "REIMBURSE") => {
    try {
      await financeApi.decideExpense(exp._id, decision);
      setNotice(`Expense ${exp.expenseCode} marked ${decision}.`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Action failed");
    }
  };

  const remove = async (exp: ProjectExpenseItem) => {
    if (!window.confirm(`Delete expense ${exp.expenseCode}?`)) return;
    try {
      await financeApi.deleteExpense(exp._id);
      setNotice("Expense removed.");
      await load();
    } catch (err: any) {
      setError(err?.message || "Delete failed");
    }
  };

  return (
    <div className="p2-page">
      <div className="p2-header">
        <div>
          <div className="p2-breadcrumb">Finance / Direct Delivery Costs &amp; Expenses (FIN-004)</div>
          <h1 className="p2-title">
            <HandCoins size={18} color="#0755e9" />
            Direct Costs &amp; Expense Ledger
          </h1>
          <div className="p2-subtitle">
            Track cloud infra, third-party APIs, freelancer payouts &amp; shared overheads feeding project margins
          </div>
        </div>
        <div className="p2-actions">
          <div className="p2-tabs">
            <Link href="/finance" className="p2-tab">Overview</Link>
            <Link href="/finance/budgets" className="p2-tab">Budgets</Link>
            <Link href="/finance/invoices" className="p2-tab">Invoices</Link>
            <Link href="/finance/expenses" className="p2-tab active">Expenses</Link>
          </div>
          <button
            type="button"
            className="p2-btn"
            disabled={!items.length}
            onClick={() =>
              downloadCsv(
                "project-expenses.csv",
                ["Code", "Date", "Category", "Vendor", "Description", "Amount", "Billable", "Status"],
                items.map((e) => [
                  e.expenseCode,
                  e.expenseDate,
                  e.category,
                  e.vendorName,
                  e.description,
                  e.amount,
                  e.billableToClient ? "Yes" : "No",
                  e.approvalStatus,
                ])
              )
            }
          >
            <Download size={13} /> CSV
          </button>
          <button type="button" className="p2-btn" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            type="button"
            className="p2-btn p2-btn-primary"
            onClick={() => {
              setForm((f) => ({ ...f, projectId: f.projectId || projects[0]?._id || "" }));
              setModalOpen(true);
            }}
          >
            <Plus size={14} /> Log Expense
          </button>
        </div>
      </div>

      {error && <div className="p2-banner-err">{error}</div>}
      {notice && <div className="p2-banner-ok">{notice}</div>}

      <div className="p2-kpi-grid">
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Total Logged Spend</div>
          <div className="p2-kpi-value">{formatInrCompact(summary?.totalSpend)}</div>
        </div>
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Approved / Reimbursed</div>
          <div className="p2-kpi-value" style={{ color: "#079b62" }}>{formatInrCompact(summary?.approvedSpend)}</div>
        </div>
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Pending Approval</div>
          <div className="p2-kpi-value" style={{ color: "#d97706" }}>{summary?.pendingCount ?? 0}</div>
        </div>
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Client Billable Pass-Through</div>
          <div className="p2-kpi-value">{formatInrCompact(summary?.billableSpend)}</div>
        </div>
      </div>

      <div className="p2-toolbar">
        <div className="p2-filters">
          <input className="p2-input" style={{ width: 220 }} placeholder="Search vendor, description, code..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="p2-select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
          </select>
          <select className="p2-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REIMBURSED">Reimbursed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      <div className="p2-card">
        <div className="p2-table-wrap">
          <table className="p2-table">
            <thead>
              <tr>
                <th>Code / Date</th>
                <th>Project</th>
                <th>Category / Vendor</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((exp) => {
                const proj = typeof exp.projectId === "object" ? exp.projectId : null;
                return (
                  <tr key={exp._id}>
                    <td>
                      <strong>{exp.expenseCode}</strong>
                      <div style={{ fontSize: 10, color: "#64748b" }}>{formatDate(exp.expenseDate)}</div>
                    </td>
                    <td>{proj?.projectName || "Project"}</td>
                    <td>
                      <span className="p2-badge p2-badge-blue">{exp.category.replace(/_/g, " ")}</span>
                      {exp.vendorName ? <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 2 }}>{exp.vendorName}</div> : null}
                    </td>
                    <td>
                      <div>{exp.description}</div>
                      {exp.billableToClient && <span className="p2-badge p2-badge-purple">Billable</span>}
                    </td>
                    <td><strong>{formatInr(exp.amount)}</strong></td>
                    <td><span className={expBadge(exp.approvalStatus)}>{exp.approvalStatus}</span></td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        {exp.approvalStatus === "PENDING" && (
                          <>
                            <button type="button" className="p2-btn p2-btn-green" style={{ height: 25, padding: "0 7px" }} onClick={() => void decide(exp, "APPROVE")} title="Approve">
                              <Check size={12} />
                            </button>
                            <button type="button" className="p2-btn p2-btn-danger" style={{ height: 25, padding: "0 7px" }} onClick={() => void decide(exp, "REJECT")} title="Reject">
                              <XCircle size={12} />
                            </button>
                          </>
                        )}
                        <button type="button" className="p2-btn p2-btn-danger" style={{ height: 25, padding: "0 7px" }} onClick={() => void remove(exp)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!items.length && !loading && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "#64748b" }}>
                    No direct costs logged yet. Click &quot;Log Expense&quot; to record project costs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="p2-modal-backdrop" role="dialog" aria-modal="true">
          <form className="p2-modal" style={{ maxWidth: 540 }} onSubmit={submit}>
            <div className="p2-modal-head">
              <strong>Log Direct Project Cost / Expense</strong>
              <button type="button" className="p2-btn" style={{ height: 26, padding: "0 6px" }} onClick={() => setModalOpen(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="p2-modal-body">
              <div className="p2-form-grid">
                <div className="p2-field">
                  <label>Project *</label>
                  <select className="p2-select" required value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                    <option value="">Select Project</option>
                    {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
                  </select>
                </div>
                <div className="p2-field">
                  <label>Cost Category</label>
                  <select className="p2-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div className="p2-field">
                  <label>Expense Date</label>
                  <input className="p2-input" type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} required />
                </div>
                <div className="p2-field">
                  <label>Amount (₹) *</label>
                  <input className="p2-input" type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} required />
                </div>
                <div className="p2-field">
                  <label>Vendor / Provider</label>
                  <input className="p2-input" placeholder="e.g. AWS, OpenAI, Contractor" value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} />
                </div>
                <div className="p2-field">
                  <label>Bill / Invoice Ref</label>
                  <input className="p2-input" value={form.invoiceRef} onChange={(e) => setForm({ ...form, invoiceRef: e.target.value })} />
                </div>
                <div className="p2-field full">
                  <label>Description *</label>
                  <input className="p2-input" required placeholder="e.g. Monthly AWS EKS & MongoDB Atlas cluster hosting" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                <input type="checkbox" checked={form.billableToClient} onChange={(e) => setForm({ ...form, billableToClient: e.target.checked })} />
                Rebillable to Client (Pass-through cost)
              </label>
            </div>
            <div className="p2-modal-foot">
              <button type="button" className="p2-btn" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="p2-btn p2-btn-primary" disabled={saving}>
                {saving ? "Logging..." : "Save Expense"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
