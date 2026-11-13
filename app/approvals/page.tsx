"use client";

import { useState } from "react";
import Link from "next/link";
import { Shell } from "../../components/Shell";
import { StatusBadge } from "../../components/StatusBadge";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock3,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

type ApprovalItem = {
  id: string;
  code: string;
  entityType: string;
  title: string;
  project: string;
  requestedBy: string;
  roleRequired: string;
  commercialImpact: string;
  timelineImpact: string;
  date: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED";
  summary: string;
};

const initialApprovals: ApprovalItem[] = [
  {
    id: "APR-001",
    code: "PHT-2026-AICMS-001-CR-003",
    entityType: "Change Request (CR)",
    title: "Integration of Third-Party Laboratory Information System (LIS) API",
    project: "AI-CMS Implementation - Apollo Hospitals",
    requestedBy: "Amit Kumar (Technical Lead)",
    roleRequired: "CxO / MD Approval",
    commercialImpact: "+ ₹ 4,50,000",
    timelineImpact: "+ 12 Days",
    date: "13 Nov 2026, 11:20 AM",
    status: "PENDING",
    summary: "Client requested bidirectional sync with laboratory analyzer hardware not included in Baseline V1.",
  },
  {
    id: "APR-002",
    code: "PHT-2026-WEB-002-DEP-1.3",
    entityType: "Production Deployment",
    title: "Patient Teleconsultation Portal v1.3.0 Go-Live",
    project: "Pehal Patient Telehealth Portal",
    requestedBy: "Rahul Verma (Project Manager)",
    roleRequired: "Project Manager + Team Lead",
    commercialImpact: "₹ 0 (Contract Milestone)",
    timelineImpact: "On Schedule",
    date: "13 Nov 2026, 09:45 AM",
    status: "PENDING",
    summary: "QA Sign-off achieved with 0 critical/high bugs. Rollback scripts and DB backups verified.",
  },
  {
    id: "APR-003",
    code: "PHT-2026-AICMS-001-RES-009",
    entityType: "Resource Allocation Override",
    title: "MERN Developer Allocation Increase to 125%",
    project: "AI-CMS Implementation",
    requestedBy: "Neha Patel (Scrum Master)",
    roleRequired: "General Manager / Delivery Head",
    commercialImpact: "Internal Rebalance",
    timelineImpact: "Mitigates 6-day sprint delay",
    date: "12 Nov 2026, 04:15 PM",
    status: "PENDING",
    summary: "Temporary 2-week allocation surge for senior backend developer to complete HL7 FHIR integration.",
  },
  {
    id: "APR-004",
    code: "PHT-2026-RND-004-BRD-1.0",
    entityType: "BRD Scope Approval",
    title: "AI Symptom Triage Engine Functional Specification Baseline V1",
    project: "Internal AI Diagnostics POC",
    requestedBy: "Pooja Singh (Business Analyst)",
    roleRequired: "CTO / CxO",
    commercialImpact: "R&D CapEx",
    timelineImpact: "Milestone 1 Gate",
    date: "11 Nov 2026, 02:30 PM",
    status: "PENDING",
    summary: "Complete requirement decomposition into 24 features and 68 user stories ready for Sprint 1.",
  },
];

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>(initialApprovals);
  const [selectedTab, setSelectedTab] = useState<"PENDING" | "RESOLVED">("PENDING");
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(initialApprovals[0]);
  const [actionComment, setActionComment] = useState("");

  const handleDecision = (id: string, decision: "APPROVED" | "REJECTED" | "ESCALATED") => {
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: decision } : item))
    );
    alert(`Request ${id} has been ${decision.toLowerCase()}. Notification dispatched to stakeholders.`);
    setActionComment("");
  };

  const filtered = approvals.filter((item) =>
    selectedTab === "PENDING" ? item.status === "PENDING" : item.status !== "PENDING"
  );

  return (
    <Shell>
      <div>
        <div className="page-head">
          <div>
            <div className="eyebrow">GOVERNANCE & APPROVAL ENGINE</div>
            <h1>Approval Center</h1>
            <p>Review and decide on hierarchical approval gates: Projects, BRDs, Change Requests, Deployments, and Resource Overrides.</p>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <div className="kpi card">
            <Clock3 size={24} color="#d97706" />
            <div>
              <small>Pending Decision</small>
              <strong>{approvals.filter((a) => a.status === "PENDING").length}</strong>
              <small style={{ color: "#d97706" }}>Awaiting your tier</small>
            </div>
          </div>
          <div className="kpi card">
            <CheckCircle2 size={24} color="#059669" />
            <div>
              <small>Approved This Month</small>
              <strong>14</strong>
              <small style={{ color: "#059669" }}>SLA compliance: 98%</small>
            </div>
          </div>
          <div className="kpi card">
            <XCircle size={24} color="#dc2626" />
            <div>
              <small>Rejected / Rework</small>
              <strong>2</strong>
              <small style={{ color: "#64748b" }}>Returned to initiator</small>
            </div>
          </div>
          <div className="kpi card">
            <ShieldCheck size={24} color="#2563eb" />
            <div>
              <small>Dual Gate Approvals</small>
              <strong>4</strong>
              <small style={{ color: "#2563eb" }}>PM + TL verified</small>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
          <button
            type="button"
            className={`btn ${selectedTab === "PENDING" ? "primary" : "outline"}`}
            onClick={() => setSelectedTab("PENDING")}
          >
            Pending Actions ({approvals.filter((a) => a.status === "PENDING").length})
          </button>
          <button
            type="button"
            className={`btn ${selectedTab === "RESOLVED" ? "primary" : "outline"}`}
            onClick={() => setSelectedTab("RESOLVED")}
          >
            Approval History / Resolved
          </button>
        </div>

        {/* MAIN WORKSPACE GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "1.5rem" }}>
          {/* QUEUE */}
          <section className="card">
            <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b>Approval Requests Queue</b>
              <small style={{ color: "#64748b" }}>Ranked by hierarchical urgency</small>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "1rem" }}>
              {filtered.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
                  <CheckCircle2 size={36} color="#059669" style={{ margin: "0 auto 8px" }} />
                  <p>All approval requests in this category have been resolved.</p>
                </div>
              ) : (
                filtered.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    style={{
                      padding: "14px",
                      borderRadius: "8px",
                      border: selectedItem?.id === item.id ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      background: selectedItem?.id === item.id ? "#eff6ff" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                      <div>
                        <span style={{ fontSize: "0.75rem", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", color: "#475569", fontWeight: "bold" }}>
                          {item.entityType}
                        </span>
                        <strong style={{ display: "block", fontSize: "0.95rem", marginTop: "4px", color: "#0f172a" }}>
                          {item.title}
                        </strong>
                      </div>
                      <StatusBadge tone={item.status === "APPROVED" ? "green" : item.status === "REJECTED" ? "red" : "amber"}>
                        {item.status}
                      </StatusBadge>
                    </div>

                    <div style={{ fontSize: "0.82rem", color: "#64748b", margin: "4px 0" }}>
                      Project: <b style={{ color: "#334155" }}>{item.project}</b>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#475569", marginTop: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "6px" }}>
                      <span>Impact: <b style={{ color: "#059669" }}>{item.commercialImpact}</b></span>
                      <span>Timeline: <b>{item.timelineImpact}</b></span>
                      <small style={{ color: "#94a3b8" }}>{item.date}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* DETAIL & ACTION PANEL */}
          <section className="card">
            {selectedItem ? (
              <div>
                <div className="section-head" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "14px" }}>
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "#2563eb", fontWeight: "bold" }}>{selectedItem.code}</span>
                    <h2 style={{ fontSize: "1.15rem", margin: "4px 0" }}>{selectedItem.title}</h2>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.85rem" }}>
                  <div>
                    <small style={{ color: "#64748b", display: "block" }}>Business Justification / Scope</small>
                    <p style={{ margin: "4px 0", lineHeight: "1.4", color: "#1e293b" }}>{selectedItem.summary}</p>
                  </div>

                  <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "6px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div>
                        <small style={{ color: "#64748b" }}>Initiated By</small>
                        <div style={{ fontWeight: "bold" }}>{selectedItem.requestedBy}</div>
                      </div>
                      <div>
                        <small style={{ color: "#64748b" }}>Governance Tier</small>
                        <div style={{ fontWeight: "bold", color: "#2563eb" }}>{selectedItem.roleRequired}</div>
                      </div>
                      <div>
                        <small style={{ color: "#64748b" }}>Commercial Value</small>
                        <div style={{ fontWeight: "bold", color: "#059669" }}>{selectedItem.commercialImpact}</div>
                      </div>
                      <div>
                        <small style={{ color: "#64748b" }}>Schedule Variance</small>
                        <div style={{ fontWeight: "bold" }}>{selectedItem.timelineImpact}</div>
                      </div>
                    </div>
                  </div>

                  {selectedItem.status === "PENDING" && (
                    <div style={{ marginTop: "1rem", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "0.85rem" }}>
                        Decision Comment & Audit Note:
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Provide rationale or conditions for approval/rejection..."
                        value={actionComment}
                        onChange={(e) => setActionComment(e.target.value)}
                        style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", marginBottom: "1rem" }}
                      />

                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          type="button"
                          className="btn primary"
                          style={{ flex: 1, background: "#059669", borderColor: "#059669" }}
                          onClick={() => handleDecision(selectedItem.id, "APPROVED")}
                        >
                          ✓ Approve Request
                        </button>
                        <button
                          type="button"
                          className="btn outline"
                          style={{ color: "#dc2626", borderColor: "#fca5a5" }}
                          onClick={() => handleDecision(selectedItem.id, "REJECTED")}
                        >
                          ✕ Reject
                        </button>
                        <button
                          type="button"
                          className="btn outline"
                          onClick={() => handleDecision(selectedItem.id, "ESCALATED")}
                        >
                          Escalate to CxO
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedItem.status !== "PENDING" && (
                    <div style={{ marginTop: "1rem", padding: "12px", background: selectedItem.status === "APPROVED" ? "#ecfdf5" : "#fef2f2", borderRadius: "6px" }}>
                      <b style={{ color: selectedItem.status === "APPROVED" ? "#059669" : "#dc2626" }}>
                        Status: {selectedItem.status}
                      </b>
                      <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#475569" }}>
                        Decision recorded in audit event log. Next automated workflow triggered.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p style={{ color: "#64748b" }}>Select an approval item from the list to view full specifications.</p>
            )}
          </section>
        </div>
      </div>
    </Shell>
  );
}
