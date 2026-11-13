"use client";

import { useState } from "react";
import Link from "next/link";
import { Shell } from "../../components/Shell";
import { StatusBadge } from "../../components/StatusBadge";
import {
  CheckCircle2,
  AlertTriangle,
  Bug as BugIcon,
  Search,
  Filter,
  Plus,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

type BugItem = {
  id: string;
  code: string;
  title: string;
  project: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: "REPORTED" | "TRIAGE" | "ASSIGNED" | "FIX_IN_PROGRESS" | "FIXED" | "READY_FOR_RETEST" | "CLOSED" | "REOPENED";
  assignee: string;
  environment: string;
  reopenCount: number;
  date: string;
};

const initialBugs: BugItem[] = [
  {
    id: "BUG-1",
    code: "PHT-2026-AICMS-001-BUG-0014",
    title: "HL7 Message ingestion buffer overflow on concurrent patient feeds",
    project: "AI-CMS Implementation",
    severity: "CRITICAL",
    status: "FIX_IN_PROGRESS",
    assignee: "Amit Kumar",
    environment: "QA / Staging",
    reopenCount: 1,
    date: "13 Nov 2026",
  },
  {
    id: "BUG-2",
    code: "PHT-2026-AICMS-001-BUG-0015",
    title: "Session token expiry not redirecting cleanly to MFA challenge",
    project: "AI-CMS Implementation",
    severity: "HIGH",
    status: "READY_FOR_RETEST",
    assignee: "Neha Patel",
    environment: "QA",
    reopenCount: 0,
    date: "12 Nov 2026",
  },
  {
    id: "BUG-3",
    code: "PHT-2026-WEB-002-BUG-0008",
    title: "Patient video call preview shows black screen in Safari iOS 18",
    project: "Telehealth Portal",
    severity: "MEDIUM",
    status: "ASSIGNED",
    assignee: "Rahul Verma",
    environment: "Production Replica",
    reopenCount: 0,
    date: "11 Nov 2026",
  },
  {
    id: "BUG-4",
    code: "PHT-2026-WEB-002-BUG-0009",
    title: "Prescription PDF download fails when doctor notes contain special characters",
    project: "Telehealth Portal",
    severity: "LOW",
    status: "CLOSED",
    assignee: "Neha Patel",
    environment: "Staging",
    reopenCount: 0,
    date: "10 Nov 2026",
  },
];

export default function QaPage() {
  const [bugs, setBugs] = useState<BugItem[]>(initialBugs);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  const filtered = bugs.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.code.toLowerCase().includes(search.toLowerCase()) ||
      b.assignee.toLowerCase().includes(search.toLowerCase());
    const matchesSev = severityFilter === "ALL" || b.severity === severityFilter;
    return matchesSearch && matchesSev;
  });

  const criticalOpen = bugs.filter(
    (b) => b.severity === "CRITICAL" && b.status !== "CLOSED"
  ).length;

  return (
    <Shell>
      <div>
        <div className="page-head">
          <div>
            <div className="eyebrow">QUALITY ASSURANCE & DEFECT ENGINE</div>
            <h1>QA & Bug Management Center</h1>
            <p>Track test executions, defect lifecycles, and deployment quality sign-off gates (Pending Critical Bugs = 0 required).</p>
          </div>
          <div>
            <button
              type="button"
              className="btn primary"
              onClick={() => alert("Open Defect Logging Modal")}
            >
              + Report New Defect
            </button>
          </div>
        </div>

        {/* METRICS */}
        <div className="kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <div className="kpi card">
            <BugIcon size={24} color="#dc2626" />
            <div>
              <small>Critical Open Bugs</small>
              <strong style={{ color: criticalOpen > 0 ? "#dc2626" : "#059669" }}>
                {criticalOpen}
              </strong>
              <small style={{ color: criticalOpen > 0 ? "#dc2626" : "#059669" }}>
                {criticalOpen > 0 ? "Deployment Gate Blocked" : "Ready for Sign-off"}
              </small>
            </div>
          </div>
          <div className="kpi card">
            <CheckCircle2 size={24} color="#059669" />
            <div>
              <small>Test Execution Pass Rate</small>
              <strong>96.4%</strong>
              <small style={{ color: "#059669" }}>182 / 189 test cases passed</small>
            </div>
          </div>
          <div className="kpi card">
            <RotateCcw size={24} color="#d97706" />
            <div>
              <small>Defect Reopen Rate</small>
              <strong>4.2%</strong>
              <small style={{ color: "#059669" }}>Healthy industry standard (&lt; 8%)</small>
            </div>
          </div>
          <div className="kpi card">
            <ShieldCheck size={24} color="#2563eb" />
            <div>
              <small>Release Candidate Gate</small>
              <strong>v1.3.0 Staging</strong>
              <small style={{ color: "#2563eb" }}>QA Lead sign-off in progress</small>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTERS */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "1rem" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "12px", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search bugs by ID (e.g. PHT-2026-BUG-0014), title, assignee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "10px 10px 10px 38px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
          </div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* BUG TABLE */}
        <div className="card">
          <div className="data-table">
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase" }}>
                  <th style={{ padding: "12px" }}>Bug Code & Title</th>
                  <th style={{ padding: "12px" }}>Project</th>
                  <th style={{ padding: "12px" }}>Severity</th>
                  <th style={{ padding: "12px" }}>Status</th>
                  <th style={{ padding: "12px" }}>Assignee</th>
                  <th style={{ padding: "12px" }}>Environment</th>
                  <th style={{ padding: "12px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((bug) => (
                  <tr key={bug.id} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "0.88rem" }}>
                    <td style={{ padding: "12px", maxWidth: "340px" }}>
                      <span style={{ fontSize: "0.75rem", color: "#2563eb", fontWeight: "bold" }}>{bug.code}</span>
                      <div style={{ fontWeight: "600", color: "#0f172a", marginTop: "2px" }}>{bug.title}</div>
                      {bug.reopenCount > 0 && (
                        <small style={{ color: "#dc2626", fontWeight: "bold" }}>Reopened {bug.reopenCount} time(s)</small>
                      )}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: "500" }}>{bug.project}</div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background:
                            bug.severity === "CRITICAL"
                              ? "#fee2e2"
                              : bug.severity === "HIGH"
                              ? "#ffedd5"
                              : bug.severity === "MEDIUM"
                              ? "#fef9c3"
                              : "#f1f5f9",
                          color:
                            bug.severity === "CRITICAL"
                              ? "#991b1b"
                              : bug.severity === "HIGH"
                              ? "#9a3412"
                              : bug.severity === "MEDIUM"
                              ? "#854d0e"
                              : "#475569",
                        }}
                      >
                        {bug.severity}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <StatusBadge tone={bug.status === "CLOSED" ? "green" : bug.status === "FIX_IN_PROGRESS" ? "amber" : "blue"}>
                        {bug.status.replace(/_/g, " ")}
                      </StatusBadge>
                    </td>
                    <td style={{ padding: "12px" }}>{bug.assignee}</td>
                    <td style={{ padding: "12px" }}>
                      <small style={{ background: "#f8fafc", padding: "2px 6px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                        {bug.environment}
                      </small>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <button
                        type="button"
                        className="btn outline small"
                        onClick={() => alert(`Opening bug triage drawer for ${bug.code}`)}
                      >
                        Inspect
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
