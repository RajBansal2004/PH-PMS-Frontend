"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Receipt, Plus, RefreshCw, Download, CreditCard, Trash2, X } from "lucide-react";
import {
  financeApi,
  formatInr,
  formatInrCompact,
  formatDate,
  downloadCsv,
  type FinanceInvoiceItem,
  type ProjectRef,
} from "@/lib/phase2/api";
import "@/components/phase2/phase2.css";

function invBadge(status: string) {
  if (status === "PAID") return "p2-badge p2-badge-green";
  if (status === "OVERDUE") return "p2-badge p2-badge-red";
  if (status === "PARTIALLY_PAID") return "p2-badge p2-badge-amber";
  if (status === "SENT") return "p2-badge p2-badge-blue";
  return "p2-badge p2-badge-slate";
}

export default function FinanceInvoicesPage() {
  const [items, setItems] = useState<FinanceInvoiceItem[]>([]);
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Create Invoice Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [invForm, setInvForm] = useState({
    projectId: "",
    clientName: "",
    billingType: "MILESTONE",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    taxPercent: 18,
    discountAmount: 0,
    status: "SENT",
    notes: "",
    lineItems: [{ description: "Milestone Deliverable", quantity: 1, rate: 50000 }],
  });

  // Record Payment Modal
  const [payTarget, setPayTarget] = useState<FinanceInvoiceItem | null>(null);
  const [payForm, setPayForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: 0,
    mode: "NEFT",
    referenceNo: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await financeApi.listInvoices({
        search: search || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      });
      setItems(res.items || []);
      setProjects(res.projects || []);
      setSummary(res.summary || null);
    } catch (e: any) {
      setError(e?.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const addLineItem = () => {
    setInvForm((f) => ({
      ...f,
      lineItems: [...f.lineItems, { description: "", quantity: 1, rate: 0 }],
    }));
  };

  const updateLine = (idx: number, key: string, val: any) => {
    setInvForm((f) => ({
      ...f,
      lineItems: f.lineItems.map((it, i) => (i === idx ? { ...it, [key]: val } : it)),
    }));
  };

  const subtotalPreview = invForm.lineItems.reduce(
    (s, it) => s + Number(it.quantity || 0) * Number(it.rate || 0),
    0
  );
  const taxablePreview = Math.max(0, subtotalPreview - Number(invForm.discountAmount || 0));
  const totalPreview = taxablePreview + (taxablePreview * Number(invForm.taxPercent || 0)) / 100;

  const submitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invForm.projectId) {
      setError("Select a project");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await financeApi.createInvoice(invForm);
      setNotice("Invoice generated successfully.");
      setCreateOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget) return;
    setSaving(true);
    setError(null);
    try {
      await financeApi.recordPayment(payTarget._id, payForm);
      setNotice(`Payment recorded for ${payTarget.invoiceNumber}.`);
      setPayTarget(null);
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  const removeInvoice = async (inv: FinanceInvoiceItem) => {
    if (!window.confirm(`Delete invoice ${inv.invoiceNumber}?`)) return;
    try {
      await financeApi.deleteInvoice(inv._id);
      setNotice(`Invoice ${inv.invoiceNumber} deleted.`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Delete failed");
    }
  };

  return (
    <div className="p2-page">
      <div className="p2-header">
        <div>
          <div className="p2-breadcrumb">Finance / Client Invoices &amp; Receivables (FIN-003)</div>
          <h1 className="p2-title">
            <Receipt size={18} color="#0755e9" />
            Client Invoices &amp; Payment Receipts
          </h1>
          <div className="p2-subtitle">
            Generate GST-ready project invoices, track partial/full collections &amp; monitor overdue receivables
          </div>
        </div>
        <div className="p2-actions">
          <div className="p2-tabs">
            <Link href="/finance" className="p2-tab">Overview</Link>
            <Link href="/finance/budgets" className="p2-tab">Budgets</Link>
            <Link href="/finance/invoices" className="p2-tab active">Invoices</Link>
            <Link href="/finance/expenses" className="p2-tab">Expenses</Link>
          </div>
          <button
            type="button"
            className="p2-btn"
            disabled={!items.length}
            onClick={() =>
              downloadCsv(
                "client-invoices.csv",
                ["Invoice #", "Client", "Issue Date", "Due Date", "Total", "Paid", "Balance", "Status"],
                items.map((i) => [
                  i.invoiceNumber,
                  i.clientName,
                  i.issueDate,
                  i.dueDate,
                  i.totalAmount,
                  i.paidAmount,
                  i.balanceAmount,
                  i.effectiveStatus,
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
              setInvForm((f) => ({ ...f, projectId: f.projectId || projects[0]?._id || "" }));
              setCreateOpen(true);
            }}
          >
            <Plus size={14} /> Create Invoice
          </button>
        </div>
      </div>

      {error && <div className="p2-banner-err">{error}</div>}
      {notice && <div className="p2-banner-ok">{notice}</div>}

      <div className="p2-kpi-grid">
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Total Invoiced ({summary?.totalInvoices ?? 0})</div>
          <div className="p2-kpi-value">{formatInrCompact(summary?.totalInvoiced)}</div>
        </div>
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Total Collected</div>
          <div className="p2-kpi-value" style={{ color: "#079b62" }}>{formatInrCompact(summary?.totalCollected)}</div>
        </div>
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Outstanding Balance</div>
          <div className="p2-kpi-value">{formatInrCompact(summary?.totalOutstanding)}</div>
        </div>
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Overdue ({summary?.overdueCount ?? 0})</div>
          <div className="p2-kpi-value" style={{ color: "#dc2626" }}>{formatInrCompact(summary?.overdueAmount)}</div>
        </div>
      </div>

      <div className="p2-toolbar">
        <div className="p2-filters">
          <input
            className="p2-input"
            style={{ width: 220 }}
            placeholder="Search invoice # or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="p2-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="p2-card">
        <div className="p2-table-wrap">
          <table className="p2-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Project / Client</th>
                <th>Issue / Due</th>
                <th>Total (incl. GST)</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((inv) => {
                const proj = typeof inv.projectId === "object" ? inv.projectId : null;
                return (
                  <tr key={inv._id}>
                    <td>
                      <strong>{inv.invoiceNumber}</strong>
                      <div style={{ fontSize: 10, color: "#64748b" }}>{inv.billingType}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{proj?.projectName || "Project"}</div>
                      <div style={{ fontSize: 10.5, color: "#64748b" }}>{inv.clientName}</div>
                    </td>
                    <td>
                      <div>{formatDate(inv.issueDate)}</div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>Due {formatDate(inv.dueDate)}</div>
                    </td>
                    <td><strong>{formatInr(inv.totalAmount)}</strong></td>
                    <td style={{ color: "#079b62", fontWeight: 600 }}>{formatInr(inv.paidAmount)}</td>
                    <td style={{ fontWeight: 700, color: inv.balanceAmount > 0 ? "#dc2626" : "#64748b" }}>
                      {formatInr(inv.balanceAmount)}
                    </td>
                    <td><span className={invBadge(inv.effectiveStatus)}>{inv.effectiveStatus.replace(/_/g, " ")}</span></td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 5 }}>
                        {inv.balanceAmount > 0 && inv.status !== "CANCELLED" && (
                          <button
                            type="button"
                            className="p2-btn p2-btn-green"
                            style={{ height: 26 }}
                            onClick={() => {
                              setPayTarget(inv);
                              setPayForm({
                                date: new Date().toISOString().slice(0, 10),
                                amount: inv.balanceAmount,
                                mode: "NEFT",
                                referenceNo: "",
                                notes: "",
                              });
                            }}
                          >
                            <CreditCard size={12} /> Pay
                          </button>
                        )}
                        <button type="button" className="p2-btn p2-btn-danger" style={{ height: 26, padding: "0 7px" }} onClick={() => void removeInvoice(inv)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!items.length && !loading && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 24, color: "#64748b" }}>
                    No invoices created yet. Click &quot;Create Invoice&quot; to generate your first client invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {createOpen && (
        <div className="p2-modal-backdrop" role="dialog" aria-modal="true">
          <form className="p2-modal" onSubmit={submitInvoice}>
            <div className="p2-modal-head">
              <strong>Create Client Tax Invoice</strong>
              <button type="button" className="p2-btn" style={{ height: 26, padding: "0 6px" }} onClick={() => setCreateOpen(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="p2-modal-body">
              <div className="p2-form-grid">
                <div className="p2-field">
                  <label>Project *</label>
                  <select className="p2-select" required value={invForm.projectId} onChange={(e) => setInvForm({ ...invForm, projectId: e.target.value })}>
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>{p.projectName}</option>
                    ))}
                  </select>
                </div>
                <div className="p2-field">
                  <label>Client Name (optional override)</label>
                  <input className="p2-input" placeholder="Auto-filled from project client" value={invForm.clientName} onChange={(e) => setInvForm({ ...invForm, clientName: e.target.value })} />
                </div>
                <div className="p2-field">
                  <label>Issue Date</label>
                  <input className="p2-input" type="date" value={invForm.issueDate} onChange={(e) => setInvForm({ ...invForm, issueDate: e.target.value })} />
                </div>
                <div className="p2-field">
                  <label>Due Date</label>
                  <input className="p2-input" type="date" value={invForm.dueDate} onChange={(e) => setInvForm({ ...invForm, dueDate: e.target.value })} />
                </div>
                <div className="p2-field">
                  <label>Billing Type</label>
                  <select className="p2-select" value={invForm.billingType} onChange={(e) => setInvForm({ ...invForm, billingType: e.target.value })}>
                    <option value="MILESTONE">Milestone</option>
                    <option value="TIME_AND_MATERIAL">Time &amp; Material</option>
                    <option value="RETAINER">Retainer</option>
                    <option value="CHANGE_REQUEST">Change Request</option>
                    <option value="ADVANCE">Advance</option>
                  </select>
                </div>
                <div className="p2-field">
                  <label>GST / Tax (%)</label>
                  <input className="p2-input" type="number" min={0} max={100} value={invForm.taxPercent} onChange={(e) => setInvForm({ ...invForm, taxPercent: Number(e.target.value) })} />
                </div>
              </div>

              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <strong style={{ fontSize: 12 }}>Line Items</strong>
                  <button type="button" className="p2-btn" style={{ height: 24, fontSize: 11 }} onClick={addLineItem}>+ Add Line</button>
                </div>
                {invForm.lineItems.map((it, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 70px 110px", gap: 6, marginBottom: 6 }}>
                    <input className="p2-input" placeholder="Description" value={it.description} onChange={(e) => updateLine(idx, "description", e.target.value)} required />
                    <input className="p2-input" type="number" min={1} value={it.quantity} onChange={(e) => updateLine(idx, "quantity", Number(e.target.value))} />
                    <input className="p2-input" type="number" min={0} value={it.rate} onChange={(e) => updateLine(idx, "rate", Number(e.target.value))} />
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, fontSize: 12, marginTop: 8, paddingTop: 6, borderTop: "1px dashed #e2e8f0" }}>
                  <span>Subtotal: <strong>{formatInr(subtotalPreview)}</strong></span>
                  <span>Total (incl. {invForm.taxPercent}% GST): <strong style={{ color: "#0755e9" }}>{formatInr(totalPreview)}</strong></span>
                </div>
              </div>
            </div>
            <div className="p2-modal-foot">
              <button type="button" className="p2-btn" onClick={() => setCreateOpen(false)}>Cancel</button>
              <button type="submit" className="p2-btn p2-btn-primary" disabled={saving}>
                {saving ? "Generating..." : "Create Invoice"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Record Payment Modal */}
      {payTarget && (
        <div className="p2-modal-backdrop" role="dialog" aria-modal="true">
          <form className="p2-modal" style={{ maxWidth: 440 }} onSubmit={submitPayment}>
            <div className="p2-modal-head">
              <strong>Record Payment — {payTarget.invoiceNumber}</strong>
              <button type="button" className="p2-btn" style={{ height: 26, padding: "0 6px" }} onClick={() => setPayTarget(null)}>
                <X size={14} />
              </button>
            </div>
            <div className="p2-modal-body">
              <div style={{ fontSize: 11.5, color: "#475569" }}>
                Pending Balance: <strong>{formatInr(payTarget.balanceAmount)}</strong>
              </div>
              <div className="p2-form-grid">
                <div className="p2-field">
                  <label>Payment Date</label>
                  <input className="p2-input" type="date" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} required />
                </div>
                <div className="p2-field">
                  <label>Amount Received (₹) *</label>
                  <input className="p2-input" type="number" min={1} step="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })} required />
                </div>
                <div className="p2-field">
                  <label>Payment Mode</label>
                  <select className="p2-select" value={payForm.mode} onChange={(e) => setPayForm({ ...payForm, mode: e.target.value })}>
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="UPI">UPI</option>
                    <option value="WIRE">International Wire</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div className="p2-field">
                  <label>UTR / Reference No.</label>
                  <input className="p2-input" placeholder="UTR / Txn ID" value={payForm.referenceNo} onChange={(e) => setPayForm({ ...payForm, referenceNo: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="p2-modal-foot">
              <button type="button" className="p2-btn" onClick={() => setPayTarget(null)}>Cancel</button>
              <button type="submit" className="p2-btn p2-btn-green" disabled={saving}>
                {saving ? "Recording..." : "Record Receipt"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
