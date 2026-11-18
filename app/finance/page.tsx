"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  WalletCards,
  CircleDollarSign,
  TrendingUp,
  AlertTriangle,
  Receipt,
  RefreshCw,
  Download,
  Eye,
  X,
} from "lucide-react";
import {
  financeApi,
  formatInr,
  formatInrCompact,
  downloadCsv,
  type FinanceOverviewData,
} from "@/lib/phase2/api";
import "@/components/phase2/phase2.css";

const COSTING_LABEL: Record<string, string> = {
  MODE_A_FULL: "Mode A (Full)",
  MODE_B_DIRECT: "Mode B (Direct)",
  MODE_C_INTERNAL: "Mode C (Internal)",
};

export default function FinanceOverviewPage() {
  const [data, setData] = useState<FinanceOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<FinanceOverviewData["projectRegister"][number] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await financeApi.getOverview();
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load financial overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const s = data?.summary;
  const aging = data?.receivablesAging;
  const maxAging = Math.max(
    1,
    aging?.current || 0,
    aging?.days1_30 || 0,
    aging?.days31_60 || 0,
    aging?.days60Plus || 0
  );

  const exportCsv = () => {
    if (!data?.projectRegister?.length) return;
    downloadCsv(
      "finance-commercial-register.csv",
      ["Code", "Project", "Client", "Costing Mode", "Contract", "Approved CR", "Net Revenue", "Direct Cost", "Margin", "Margin %", "Invoiced", "Received", "Outstanding"],
      data.projectRegister.map((r) => [
        r.code,
        r.name,
        r.client,
        COSTING_LABEL[r.costingMode] || r.costingMode,
        r.contractValue,
        r.approvedCrValue,
        r.netRevenue,
        r.directCost,
        r.contributionMargin,
        r.marginPercent,
        r.invoiced,
        r.received,
        r.outstanding,
      ])
    );
  };

  return (
    <div className="p2-page">
      <div className="p2-header">
        <div>
          <div className="p2-breadcrumb">Finance &amp; Commercial Control / Overview (FIN-001)</div>
          <h1 className="p2-title">
            <WalletCards size={18} color="#0755e9" />
            Financial Architecture &amp; Contribution Margin
          </h1>
          <div className="p2-subtitle">
            Live contract revenues, approved CRs, direct delivery costs, contribution margins &amp; receivables aging
          </div>
        </div>
        <div className="p2-actions">
          <div className="p2-tabs">
            <Link href="/finance" className="p2-tab active">Overview</Link>
            <Link href="/finance/budgets" className="p2-tab">Budgets</Link>
            <Link href="/finance/invoices" className="p2-tab">Invoices</Link>
            <Link href="/finance/expenses" className="p2-tab">Expenses</Link>
          </div>
          <button type="button" className="p2-btn" onClick={exportCsv} disabled={!data?.projectRegister?.length}>
            <Download size={13} /> CSV
          </button>
          <button type="button" className="p2-btn" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="p2-banner-err">{error}</div>}

      {/* KPIs */}
      <div className="p2-kpi-grid">
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Net Contracted Revenue <CircleDollarSign size={14} color="#0755e9" /></div>
          <div className="p2-kpi-value">{s ? formatInrCompact(s.totalNetRevenue) : "—"}</div>
          <div className="p2-kpi-sub">
            Contract {formatInrCompact(s?.totalContractValue)} + CRs {formatInrCompact(s?.totalApprovedCr)}
          </div>
        </div>

        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Contribution Margin <TrendingUp size={14} color="#079b62" /></div>
          <div className="p2-kpi-value">{s ? `${s.overallMarginPercent}%` : "—"}</div>
          <div className="p2-kpi-sub">
            {formatInrCompact(s?.totalContributionMargin)} · Net Profit {formatInrCompact(s?.totalFullyLoadedProfit)}
          </div>
        </div>

        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Direct Delivery Cost <WalletCards size={14} color="#d97706" /></div>
          <div className="p2-kpi-value">{s ? formatInrCompact(s.totalDirectCost) : "—"}</div>
          <div className="p2-kpi-sub">
            Overheads: {formatInrCompact(s?.totalSharedOverheads)} · {s?.pendingExpenseApprovals ?? 0} pending
          </div>
        </div>

        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Invoiced / Collected <Receipt size={14} color="#0755e9" /></div>
          <div className="p2-kpi-value">{s ? formatInrCompact(s.totalInvoiced) : "—"}</div>
          <div className="p2-kpi-sub">
            Collected: {formatInrCompact(s?.totalReceived)} ({s?.invoiceCount ?? 0} invoices)
          </div>
        </div>

        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Outstanding Receivables <AlertTriangle size={14} color="#dc2626" /></div>
          <div className="p2-kpi-value">{s ? formatInrCompact(s.totalOutstanding) : "—"}</div>
          <div className="p2-kpi-sub" style={{ color: (s?.totalOverdue || 0) > 0 ? "#dc2626" : "#64748b" }}>
            Overdue: {formatInrCompact(s?.totalOverdue)}
          </div>
        </div>
      </div>

      {/* Formula + Aging + Category Spend */}
      <div className="p2-grid-2">
        <div className="p2-card">
          <div className="p2-card-head">
            <span className="p2-card-title">Receivables Aging Schedule</span>
            <Link href="/finance/invoices" style={{ fontSize: 11, color: "#0755e9", fontWeight: 600 }}>Manage Invoices →</Link>
          </div>
          {[
            { label: "Current (Not Yet Due)", val: aging?.current || 0, color: "#079b62" },
            { label: "1–30 Days Overdue", val: aging?.days1_30 || 0, color: "#d97706" },
            { label: "31–60 Days Overdue", val: aging?.days31_60 || 0, color: "#ea580c" },
            { label: "60+ Days Overdue", val: aging?.days60Plus || 0, color: "#dc2626" },
          ].map((b) => (
            <div key={b.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                <span>{b.label}</span>
                <strong>{formatInr(b.val)}</strong>
              </div>
              <div className="p2-bar-track">
                <div className="p2-bar-fill" style={{ width: `${Math.round((b.val / maxAging) * 100)}%`, background: b.color }} />
              </div>
            </div>
          ))}
        </div>

        <div className="p2-card">
          <div className="p2-card-head">
            <span className="p2-card-title">Direct Cost Breakdown by Category</span>
            <Link href="/finance/expenses" style={{ fontSize: 11, color: "#0755e9", fontWeight: 600 }}>Expense Ledger →</Link>
          </div>
          {data?.costByCategory?.length ? (
            data.costByCategory.map((c) => {
              const maxCat = Math.max(1, ...data.costByCategory.map((x) => x.amount));
              return (
                <div key={c.category} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                    <span>{c.label}</span>
                    <strong>{formatInr(c.amount)}</strong>
                  </div>
                  <div className="p2-bar-track">
                    <div className="p2-bar-fill" style={{ width: `${Math.round((c.amount / maxCat) * 100)}%` }} />
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: 18, textAlign: "center", fontSize: 11.5, color: "#64748b", background: "#f8fafc", borderRadius: 8 }}>
              No project expenses logged yet. Log expenses in the Expense Ledger to populate category burn.
            </div>
          )}
        </div>
      </div>

      {/* Commercial Register Table */}
      <div className="p2-card">
        <div className="p2-card-head">
          <span className="p2-card-title">Project Commercial &amp; Margin Register ({data?.projectRegister?.length ?? 0})</span>
          <Link href="/finance/budgets" className="p2-btn p2-btn-primary" style={{ height: 27, fontSize: 11 }}>
            Configure Budgets
          </Link>
        </div>
        <div className="p2-table-wrap">
          <table className="p2-table">
            <thead>
              <tr>
                <th>Project &amp; Client</th>
                <th>Costing Mode</th>
                <th>Net Revenue</th>
                <th>Direct Cost</th>
                <th>Contribution Margin</th>
                <th>Invoiced / Received</th>
                <th>Receivable</th>
                <th style={{ textAlign: "right" }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {(data?.projectRegister || []).map((row) => (
                <tr key={row.projectId}>
                  <td>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "#0755e9" }}>{row.code}</div>
                    <div style={{ fontWeight: 700 }}>{row.name}</div>
                    <div style={{ fontSize: 10.5, color: "#64748b" }}>{row.client}</div>
                  </td>
                  <td><span className="p2-badge p2-badge-slate">{COSTING_LABEL[row.costingMode] || row.costingMode}</span></td>
                  <td><strong>{row.netRevenue > 0 ? formatInr(row.netRevenue) : "Internal"}</strong></td>
                  <td>{formatInr(row.directCost)}</td>
                  <td>
                    {row.netRevenue > 0 ? (
                      <>
                        <strong style={{ color: row.marginPercent >= 30 ? "#079b62" : row.marginPercent >= 15 ? "#d97706" : "#dc2626" }}>
                          {formatInr(row.contributionMargin)}
                        </strong>
                        <div style={{ fontSize: 10, color: "#64748b" }}>{row.marginPercent}% margin</div>
                      </>
                    ) : (
                      <span style={{ color: "#64748b" }}>Internal R&amp;D</span>
                    )}
                  </td>
                  <td>
                    <div>{formatInr(row.invoiced)}</div>
                    <div style={{ fontSize: 10, color: "#079b62" }}>Rec: {formatInr(row.received)}</div>
                  </td>
                  <td style={{ fontWeight: 700, color: row.outstanding > 0 ? "#dc2626" : "#64748b" }}>
                    {row.outstanding > 0 ? formatInr(row.outstanding) : "Nil"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" className="p2-btn" style={{ height: 26 }} onClick={() => setDetailRow(row)}>
                      <Eye size={12} /> Breakdown
                    </button>
                  </td>
                </tr>
              ))}
              {!data?.projectRegister?.length && !loading && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 24, color: "#64748b" }}>
                    No active projects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Cost Breakdown Modal (replaces old placeholder alert!) */}
      {detailRow && (
        <div className="p2-modal-backdrop" role="dialog" aria-modal="true">
          <div className="p2-modal" style={{ maxWidth: 540 }}>
            <div className="p2-modal-head">
              <strong>P&amp;L Cost Breakdown — {detailRow.code} ({detailRow.name})</strong>
              <button type="button" className="p2-btn" style={{ height: 26, padding: "0 6px" }} onClick={() => setDetailRow(null)}>
                <X size={14} />
              </button>
            </div>
            <div className="p2-modal-body">
              <div className="p2-form-grid">
                <div className="p2-kpi-card">
                  <span className="p2-kpi-label">Contract Value</span>
                  <strong>{formatInr(detailRow.contractValue)}</strong>
                </div>
                <div className="p2-kpi-card">
                  <span className="p2-kpi-label">Approved CR Value</span>
                  <strong>{formatInr(detailRow.approvedCrValue)}</strong>
                </div>
                <div className="p2-kpi-card">
                  <span className="p2-kpi-label">Discounts</span>
                  <strong>{formatInr(detailRow.discounts)}</strong>
                </div>
                <div className="p2-kpi-card">
                  <span className="p2-kpi-label">Net Project Revenue</span>
                  <strong style={{ color: "#0755e9" }}>{formatInr(detailRow.netRevenue)}</strong>
                </div>
                <div className="p2-kpi-card">
                  <span className="p2-kpi-label">Direct Delivery Cost ({detailRow.expenseCount} items)</span>
                  <strong>{formatInr(detailRow.directCost)}</strong>
                </div>
                <div className="p2-kpi-card">
                  <span className="p2-kpi-label">Shared Overheads</span>
                  <strong>{formatInr(detailRow.sharedOverheads)}</strong>
                </div>
                <div className="p2-kpi-card">
                  <span className="p2-kpi-label">Contribution Margin</span>
                  <strong style={{ color: "#079b62" }}>
                    {formatInr(detailRow.contributionMargin)} ({detailRow.marginPercent}%)
                  </strong>
                </div>
                <div className="p2-kpi-card">
                  <span className="p2-kpi-label">Fully Loaded Profit</span>
                  <strong style={{ color: detailRow.fullyLoadedProfit >= 0 ? "#079b62" : "#dc2626" }}>
                    {formatInr(detailRow.fullyLoadedProfit)}
                  </strong>
                </div>
              </div>
            </div>
            <div className="p2-modal-foot">
              <Link href="/finance/budgets" className="p2-btn">Edit Budget</Link>
              <Link href="/finance/invoices" className="p2-btn p2-btn-primary">View Invoices</Link>
              <button type="button" className="p2-btn" onClick={() => setDetailRow(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
