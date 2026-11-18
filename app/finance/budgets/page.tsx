"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Calculator, Plus, RefreshCw, Edit3, Trash2, X } from "lucide-react";
import {
  financeApi,
  formatInr,
  formatInrCompact,
  type ProjectBudgetItem,
  type ProjectRef,
} from "@/lib/phase2/api";
import "@/components/phase2/phase2.css";

const EMPTY_FORM = {
  projectId: "",
  costingMode: "MODE_A_FULL",
  billingModel: "FIXED_PRICE",
  contractValue: 0,
  approvedCrValue: 0,
  discounts: 0,
  taxPercent: 18,
  laborBudget: 0,
  cloudInfraBudget: 0,
  thirdPartyApiBudget: 0,
  otherDirectBudget: 0,
  sharedOverheadAllocation: 0,
  status: "ACTIVE",
  notes: "",
};

export default function FinanceBudgetsPage() {
  const [items, setItems] = useState<ProjectBudgetItem[]>([]);
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await financeApi.listBudgets();
      setItems(res.items || []);
      setProjects(res.projects || []);
      setSummary(res.summary || null);
    } catch (e: any) {
      setError(e?.message || "Failed to load budgets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, projectId: projects[0]?._id || "" });
    setModalOpen(true);
  };

  const openEdit = (b: ProjectBudgetItem) => {
    const pid = typeof b.projectId === "object" ? b.projectId._id : b.projectId;
    setForm({
      projectId: pid,
      costingMode: b.costingMode,
      billingModel: b.billingModel,
      contractValue: b.contractValue,
      approvedCrValue: b.approvedCrValue,
      discounts: b.discounts,
      taxPercent: b.taxPercent,
      laborBudget: b.laborBudget,
      cloudInfraBudget: b.cloudInfraBudget,
      thirdPartyApiBudget: b.thirdPartyApiBudget,
      otherDirectBudget: b.otherDirectBudget,
      sharedOverheadAllocation: b.sharedOverheadAllocation,
      status: b.status,
      notes: b.notes || "",
    });
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.projectId) {
      setError("Please select a project");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await financeApi.upsertBudget(form);
      setNotice("Project budget configuration saved.");
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to save budget");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b: ProjectBudgetItem) => {
    if (!window.confirm("Remove this project budget configuration?")) return;
    try {
      await financeApi.deleteBudget(b._id);
      setNotice("Budget removed.");
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to delete budget");
    }
  };

  return (
    <div className="p2-page">
      <div className="p2-header">
        <div>
          <div className="p2-breadcrumb">Finance / Project Budgets &amp; Costing Control (FIN-002)</div>
          <h1 className="p2-title">
            <Calculator size={18} color="#0755e9" />
            Project Budgets &amp; Costing Control
          </h1>
          <div className="p2-subtitle">
            Define contract values, approved CRs, labor/cloud/API caps, and shared overhead allocations per project
          </div>
        </div>
        <div className="p2-actions">
          <div className="p2-tabs">
            <Link href="/finance" className="p2-tab">Overview</Link>
            <Link href="/finance/budgets" className="p2-tab active">Budgets</Link>
            <Link href="/finance/invoices" className="p2-tab">Invoices</Link>
            <Link href="/finance/expenses" className="p2-tab">Expenses</Link>
          </div>
          <button type="button" className="p2-btn" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button type="button" className="p2-btn p2-btn-primary" onClick={openCreate}>
            <Plus size={14} /> Set Project Budget
          </button>
        </div>
      </div>

      {error && <div className="p2-banner-err">{error}</div>}
      {notice && <div className="p2-banner-ok">{notice}</div>}

      <div className="p2-kpi-grid">
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Configured Projects</div>
          <div className="p2-kpi-value">{summary?.configuredCount ?? 0}</div>
        </div>
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Total Contract Value</div>
          <div className="p2-kpi-value">{formatInrCompact(summary?.totalContract)}</div>
        </div>
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Allocated Cost Budget</div>
          <div className="p2-kpi-value">{formatInrCompact(summary?.totalAllocated)}</div>
        </div>
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Actual Spend Logged</div>
          <div className="p2-kpi-value">{formatInrCompact(summary?.totalActualSpend)}</div>
        </div>
      </div>

      <div className="p2-card">
        <div className="p2-table-wrap">
          <table className="p2-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Mode / Billing</th>
                <th>Contract + CR</th>
                <th>Allocated Budget</th>
                <th>Actual Spend</th>
                <th>Budget Burn</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => {
                const proj = typeof b.projectId === "object" ? b.projectId : null;
                const burnColor = b.burnPct > 95 ? "#dc2626" : b.burnPct >= 75 ? "#d97706" : "#079b62";
                return (
                  <tr key={b._id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{proj?.projectName || "Project"}</div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>{proj?.projectCode || ""}</div>
                    </td>
                    <td>
                      <span className="p2-badge p2-badge-blue">{b.costingMode.replace(/_/g, " ")}</span>
                      <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{b.billingModel.replace(/_/g, " ")}</div>
                    </td>
                    <td>
                      <strong>{formatInr(b.netRevenue)}</strong>
                      <div style={{ fontSize: 10, color: "#64748b" }}>
                        Base {formatInrCompact(b.contractValue)} + CR {formatInrCompact(b.approvedCrValue)}
                      </div>
                    </td>
                    <td>{formatInr(b.allocatedBudget)}</td>
                    <td>{formatInr(b.actualSpend)}</td>
                    <td style={{ minWidth: 120 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div className="p2-bar-track" style={{ flex: 1 }}>
                          <div className="p2-bar-fill" style={{ width: `${Math.min(100, b.burnPct)}%`, background: burnColor }} />
                        </div>
                        <strong style={{ fontSize: 11, color: burnColor }}>{b.burnPct}%</strong>
                      </div>
                    </td>
                    <td><span className="p2-badge p2-badge-green">{b.status}</span></td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 5 }}>
                        <button type="button" className="p2-btn" style={{ height: 26 }} onClick={() => openEdit(b)}>
                          <Edit3 size={12} /> Edit
                        </button>
                        <button type="button" className="p2-btn p2-btn-danger" style={{ height: 26, padding: "0 7px" }} onClick={() => void remove(b)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!items.length && !loading && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 26, color: "#64748b" }}>
                    No project budgets configured yet. Click &quot;Set Project Budget&quot; to create your first commercial plan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="p2-modal-backdrop" role="dialog" aria-modal="true">
          <form className="p2-modal" onSubmit={save}>
            <div className="p2-modal-head">
              <strong>Configure Project Budget &amp; Costing</strong>
              <button type="button" className="p2-btn" style={{ height: 26, padding: "0 6px" }} onClick={() => setModalOpen(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="p2-modal-body">
              <div className="p2-form-grid">
                <div className="p2-field full">
                  <label>Project *</label>
                  <select className="p2-select" required value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.projectCode ? `${p.projectCode} — ${p.projectName}` : p.projectName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="p2-field">
                  <label>Costing Mode</label>
                  <select className="p2-select" value={form.costingMode} onChange={(e) => setForm({ ...form, costingMode: e.target.value })}>
                    <option value="MODE_A_FULL">Mode A — Full Costing</option>
                    <option value="MODE_B_DIRECT">Mode B — Direct Cost Only</option>
                    <option value="MODE_C_INTERNAL">Mode C — Internal R&amp;D</option>
                  </select>
                </div>
                <div className="p2-field">
                  <label>Billing Model</label>
                  <select className="p2-select" value={form.billingModel} onChange={(e) => setForm({ ...form, billingModel: e.target.value })}>
                    <option value="FIXED_PRICE">Fixed Price</option>
                    <option value="T_AND_M">Time &amp; Material</option>
                    <option value="MILESTONE">Milestone Based</option>
                    <option value="RETAINER">Monthly Retainer</option>
                    <option value="INTERNAL">Internal</option>
                  </select>
                </div>
                <div className="p2-field">
                  <label>Contract Value (₹)</label>
                  <input className="p2-input" type="number" min={0} value={form.contractValue} onChange={(e) => setForm({ ...form, contractValue: Number(e.target.value) })} />
                </div>
                <div className="p2-field">
                  <label>Approved CR Value (₹)</label>
                  <input className="p2-input" type="number" min={0} value={form.approvedCrValue} onChange={(e) => setForm({ ...form, approvedCrValue: Number(e.target.value) })} />
                </div>
                <div className="p2-field">
                  <label>Discounts (₹)</label>
                  <input className="p2-input" type="number" min={0} value={form.discounts} onChange={(e) => setForm({ ...form, discounts: Number(e.target.value) })} />
                </div>
                <div className="p2-field">
                  <label>GST / Tax (%)</label>
                  <input className="p2-input" type="number" min={0} max={100} value={form.taxPercent} onChange={(e) => setForm({ ...form, taxPercent: Number(e.target.value) })} />
                </div>
                <div className="p2-field">
                  <label>Labor Budget Cap (₹)</label>
                  <input className="p2-input" type="number" min={0} value={form.laborBudget} onChange={(e) => setForm({ ...form, laborBudget: Number(e.target.value) })} />
                </div>
                <div className="p2-field">
                  <label>Cloud / Infra Budget (₹)</label>
                  <input className="p2-input" type="number" min={0} value={form.cloudInfraBudget} onChange={(e) => setForm({ ...form, cloudInfraBudget: Number(e.target.value) })} />
                </div>
                <div className="p2-field">
                  <label>3rd-Party API / Licenses (₹)</label>
                  <input className="p2-input" type="number" min={0} value={form.thirdPartyApiBudget} onChange={(e) => setForm({ ...form, thirdPartyApiBudget: Number(e.target.value) })} />
                </div>
                <div className="p2-field">
                  <label>Shared Overhead Allocation (₹)</label>
                  <input className="p2-input" type="number" min={0} value={form.sharedOverheadAllocation} onChange={(e) => setForm({ ...form, sharedOverheadAllocation: Number(e.target.value) })} />
                </div>
                <div className="p2-field full">
                  <label>Commercial Notes</label>
                  <textarea className="p2-textarea" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="p2-modal-foot">
              <button type="button" className="p2-btn" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="p2-btn p2-btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save Budget"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
