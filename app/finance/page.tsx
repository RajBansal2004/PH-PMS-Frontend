"use client";

import { useState } from "react";
import Link from "next/link";
import { Shell } from "../../components/Shell";
import { StatusBadge } from "../../components/StatusBadge";
import {
  WalletCards,
  CircleDollarSign,
  TrendingUp,
  AlertTriangle,
  Receipt,
  FileCheck,
  Building,
} from "lucide-react";

type ProjectFinancialSummary = {
  id: string;
  code: string;
  name: string;
  client: string;
  contractValue: number;
  crValue: number;
  netRevenue: number;
  directCost: number;
  contributionMargin: number;
  marginPercent: number;
  invoiced: number;
  received: number;
  outstanding: number;
  costingMode: "Mode A (Full)" | "Mode B (Direct)" | "Mode C (Internal)";
};

const financialData: ProjectFinancialSummary[] = [
  {
    id: "FIN-1",
    code: "PHT-2026-AICMS-001",
    name: "AI-CMS Implementation",
    client: "Apollo Hospitals",
    contractValue: 4800000,
    crValue: 450000,
    netRevenue: 5250000,
    directCost: 3420000,
    contributionMargin: 1830000,
    marginPercent: 34.8,
    invoiced: 2850000,
    received: 2200000,
    outstanding: 650000,
    costingMode: "Mode A (Full)",
  },
  {
    id: "FIN-2",
    code: "PHT-2026-WEB-002",
    name: "Pehal Patient Telehealth Portal",
    client: "Healthcare Global Network",
    contractValue: 2400000,
    crValue: 0,
    netRevenue: 2400000,
    directCost: 1680000,
    contributionMargin: 720000,
    marginPercent: 30.0,
    invoiced: 1600000,
    received: 1200000,
    outstanding: 400000,
    costingMode: "Mode A (Full)",
  },
  {
    id: "FIN-3",
    code: "PHT-2026-RND-004",
    name: "Internal AI Diagnostics POC",
    client: "PehalHealthcare Internal",
    contractValue: 0,
    crValue: 0,
    netRevenue: 0,
    directCost: 850000,
    contributionMargin: -850000,
    marginPercent: 0,
    invoiced: 0,
    received: 0,
    outstanding: 0,
    costingMode: "Mode C (Internal)",
  },
];

function formatINR(val: number) {
  return "₹ " + val.toLocaleString("en-IN");
}

export default function FinancePage() {
  const [data] = useState<ProjectFinancialSummary[]>(financialData);

  const totalContract = data.reduce((sum, d) => sum + d.contractValue, 0);
  const totalNetRevenue = data.reduce((sum, d) => sum + d.netRevenue, 0);
  const totalDirectCost = data.reduce((sum, d) => sum + d.directCost, 0);
  const totalContributionMargin = totalNetRevenue - totalDirectCost;
  const overallMarginPercent = totalNetRevenue > 0 ? ((totalContributionMargin / totalNetRevenue) * 100).toFixed(1) : "0";
  const totalReceivables = data.reduce((sum, d) => sum + d.outstanding, 0);

  return (
    <Shell>
      <div>
        <div className="page-head">
          <div>
            <div className="eyebrow">COMMERCIAL & COSTING CONTROL</div>
            <h1>Financial Architecture & Contribution Margin</h1>
            <p>Delivery cost accounting, contractual revenues, approved CR value, contribution margin, and receivables management.</p>
          </div>
        </div>

        {/* FINANCIAL KPIS */}
        <div className="kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <div className="kpi card">
            <CircleDollarSign size={24} color="#2563eb" />
            <div>
              <small>Total Contracted Revenue</small>
              <strong>{formatINR(totalContract)}</strong>
              <small style={{ color: "#059669" }}>+ ₹ 4.5L Approved CRs</small>
            </div>
          </div>
          <div className="kpi card">
            <TrendingUp size={24} color="#059669" />
            <div>
              <small>Portfolio Contribution Margin</small>
              <strong>{overallMarginPercent}%</strong>
              <small style={{ color: "#059669" }}>{formatINR(totalContributionMargin)}</small>
            </div>
          </div>
          <div className="kpi card">
            <WalletCards size={24} color="#d97706" />
            <div>
              <small>Direct Delivery Cost</small>
              <strong>{formatINR(totalDirectCost)}</strong>
              <small style={{ color: "#64748b" }}>Labor + Cloud + APIs</small>
            </div>
          </div>
          <div className="kpi card">
            <AlertTriangle size={24} color="#dc2626" />
            <div>
              <small>Outstanding Receivables</small>
              <strong>{formatINR(totalReceivables)}</strong>
              <small style={{ color: "#dc2626" }}>Overdue: ₹ 2.5L</small>
            </div>
          </div>
        </div>

        {/* FORMULA CALLOUT (BRD SECTION 44) */}
        <div className="card" style={{ padding: "14px 20px", marginBottom: "1.5rem", background: "#f8fafc", borderLeft: "4px solid #2563eb" }}>
          <div style={{ fontSize: "0.85rem", lineHeight: "1.5" }}>
            <b style={{ color: "#1e293b" }}>PehalHealthcare Standard Profitability Formulas (BRD Section 44):</b>
            <div style={{ marginTop: "4px", color: "#475569" }}>
              • <b>Net Revenue</b> = Contract Value + Approved CR Value − Discounts − Taxes<br />
              • <b>Direct Delivery Cost</b> = Employee Cost + Freelancer Cost + Cloud/Infra + Third-Party APIs + Direct Expenses<br />
              • <b>Contribution Margin</b> = Net Project Revenue − Direct Delivery Cost (Measures Delivery Efficiency)<br />
              • <b>Fully Loaded Profit</b> = Contribution Margin − Allocated Shared Overheads (Measures Net Company Profit)
            </div>
          </div>
        </div>

        {/* PORTFOLIO COMMERCIAL TABLE */}
        <div className="card">
          <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b>Project Commercial Register</b>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Costing modes: Mode A (Full Costing) · Mode B (Direct) · Mode C (Internal)</span>
          </div>

          <div className="data-table" style={{ marginTop: "1rem", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase" }}>
                  <th style={{ padding: "12px" }}>Project & Client</th>
                  <th style={{ padding: "12px" }}>Costing Mode</th>
                  <th style={{ padding: "12px" }}>Net Revenue</th>
                  <th style={{ padding: "12px" }}>Direct Cost</th>
                  <th style={{ padding: "12px" }}>Contribution Margin</th>
                  <th style={{ padding: "12px" }}>Invoiced / Received</th>
                  <th style={{ padding: "12px" }}>Receivable</th>
                  <th style={{ padding: "12px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map((proj) => (
                  <tr key={proj.id} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "0.88rem" }}>
                    <td style={{ padding: "12px" }}>
                      <span style={{ fontSize: "0.75rem", color: "#2563eb", fontWeight: "bold" }}>{proj.code}</span>
                      <div style={{ fontWeight: "600", color: "#0f172a" }}>{proj.name}</div>
                      <small style={{ color: "#64748b" }}>{proj.client}</small>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ fontSize: "0.75rem", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                        {proj.costingMode}
                      </span>
                    </td>
                    <td style={{ padding: "12px", fontWeight: "bold" }}>
                      {proj.netRevenue > 0 ? formatINR(proj.netRevenue) : "Internal N/A"}
                    </td>
                    <td style={{ padding: "12px", color: "#475569" }}>
                      {formatINR(proj.directCost)}
                    </td>
                    <td style={{ padding: "12px" }}>
                      {proj.netRevenue > 0 ? (
                        <div>
                          <b style={{ color: proj.marginPercent >= 30 ? "#059669" : "#d97706" }}>
                            {formatINR(proj.contributionMargin)}
                          </b>
                          <small style={{ display: "block", color: "#64748b" }}>({proj.marginPercent}%)</small>
                        </div>
                      ) : (
                        <small style={{ color: "#64748b" }}>R&D Effort Only</small>
                      )}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div>{formatINR(proj.invoiced)}</div>
                      <small style={{ color: "#059669" }}>Rec: {formatINR(proj.received)}</small>
                    </td>
                    <td style={{ padding: "12px", fontWeight: "bold", color: proj.outstanding > 0 ? "#dc2626" : "#64748b" }}>
                      {proj.outstanding > 0 ? formatINR(proj.outstanding) : "Nil"}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <button type="button" className="btn outline small" onClick={() => alert(`View Cost Breakdown for ${proj.code}`)}>
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  );
}
