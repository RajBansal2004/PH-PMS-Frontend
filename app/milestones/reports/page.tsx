"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  DollarSign,
  ChevronRight,
  Download,
  ShieldCheck,
  RefreshCw,
  FolderKanban,
} from "lucide-react";
import { milestoneApi } from "@/lib/milestones/api";
import type { Milestone } from "@/lib/milestones/types";

export default function MilestoneReportsPage() {
  const [data, setData] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await milestoneApi.list();
        setData(res?.items || []);
      } catch (err) {
        console.warn("Failed to load milestones for reports:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const total = data.length;
  const completed = data.filter((m) => m.status === "Completed").length;
  const inProgress = data.filter((m) => m.status === "In Progress").length;
  const upcoming = data.filter((m) => m.status === "Upcoming").length;

  const totalWeight = useMemo(() => {
    return data.reduce((acc, m) => acc + (m.weight || 10), 0);
  }, [data]);

  const completedWeight = useMemo(() => {
    return data
      .filter((m) => m.status === "Completed")
      .reduce((acc, m) => acc + (m.weight || 10), 0);
  }, [data]);

  const avgProgress = useMemo(() => {
    if (total === 0) return 0;
    const sum = data.reduce((acc, m) => acc + (m.progress || 0), 0);
    return Math.round(sum / total);
  }, [data, total]);

  const totalBudget = useMemo(() => {
    return data.reduce((acc, m) => acc + (m.budget || 0), 0);
  }, [data]);

  const exportReportCsv = () => {
    const csv = [
      ["Milestone ID", "Title", "Project", "Lead / Owner", "Weight (%)", "Status", "Progress (%)", "Budget (INR)", "Planned Start", "Planned End"],
      ...data.map((m) => [
        m.milestoneCode || m.id,
        `"${m.title.replace(/"/g, '""')}"`,
        `"${m.projectName || "Direct"}"`,
        `"${m.owner?.name || "Unassigned"}"`,
        m.weight || 10,
        m.status,
        m.progress || 0,
        m.budget || 0,
        m.plannedStart || "",
        m.plannedEnd || "",
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `milestone-governance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: "1350px", margin: "0 auto" }}>
      <nav style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#667085", marginBottom: "16px" }}>
        <Link href="/milestones" style={{ color: "#475467", textDecoration: "none" }}>Milestones</Link>
        <ChevronRight size={14} />
        <span style={{ color: "#1d2939", fontWeight: 600 }}>Milestone Reports</span>
      </nav>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#101828", margin: 0 }}>
            Milestone Governance & Completion Reports
          </h1>
          <p style={{ margin: "4px 0 0", color: "#475467", fontSize: "14px" }}>
            Comprehensive analytics on milestone weight attainment, governance variance, and real-time execution.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            type="button"
            onClick={exportReportCsv}
            disabled={data.length === 0}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "#fff", border: "1px solid #d0d5dd", borderRadius: "8px", fontSize: "13px", fontWeight: 600, color: "#344054", cursor: data.length ? "pointer" : "not-allowed" }}
          >
            <Download size={14} /> Export Governance CSV
          </button>
          <Link
            href="/milestones/new"
            style={{ display: "inline-flex", alignItems: "center", padding: "8px 16px", background: "#155eef", color: "#fff", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 600 }}
          >
            + Create Milestone
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eaecf0", padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: "0 auto 12px", color: "#3b82f6" }} />
          <p style={{ margin: 0, fontSize: "14px" }}>Compiling live milestone governance metrics...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div style={{ background: "#fff", padding: "18px 20px", borderRadius: "10px", border: "1px solid #eaecf0", boxShadow: "0 1px 3px rgba(16,24,40,0.05)" }}>
              <span style={{ fontSize: "13px", color: "#667085", fontWeight: 500 }}>Completion Ratio</span>
              <div style={{ fontSize: "26px", fontWeight: 700, color: "#079455", marginTop: "4px" }}>
                {total > 0 ? Math.round((completed / total) * 100) : 0}%
              </div>
              <small style={{ color: "#027a48", fontSize: "12px" }}>
                {completed} of {total} milestones signed off
              </small>
            </div>

            <div style={{ background: "#fff", padding: "18px 20px", borderRadius: "10px", border: "1px solid #eaecf0", boxShadow: "0 1px 3px rgba(16,24,40,0.05)" }}>
              <span style={{ fontSize: "13px", color: "#667085", fontWeight: 500 }}>Average Execution Progress</span>
              <div style={{ fontSize: "26px", fontWeight: 700, color: "#155eef", marginTop: "4px" }}>
                {avgProgress}%
              </div>
              <small style={{ color: "#475467", fontSize: "12px" }}>
                {inProgress} currently in flight
              </small>
            </div>

            <div style={{ background: "#fff", padding: "18px 20px", borderRadius: "10px", border: "1px solid #eaecf0", boxShadow: "0 1px 3px rgba(16,24,40,0.05)" }}>
              <span style={{ fontSize: "13px", color: "#667085", fontWeight: 500 }}>Weight Realization</span>
              <div style={{ fontSize: "26px", fontWeight: 700, color: "#7f56d9", marginTop: "4px" }}>
                {completedWeight}% / {totalWeight}%
              </div>
              <small style={{ color: "#667085", fontSize: "12px" }}>
                Cumulative milestone weight locked
              </small>
            </div>

            <div style={{ background: "#fff", padding: "18px 20px", borderRadius: "10px", border: "1px solid #eaecf0", boxShadow: "0 1px 3px rgba(16,24,40,0.05)" }}>
              <span style={{ fontSize: "13px", color: "#667085", fontWeight: 500 }}>Total Budget Commitment</span>
              <div style={{ fontSize: "26px", fontWeight: 700, color: "#b54708", marginTop: "4px" }}>
                ₹ {totalBudget.toLocaleString("en-IN")}
              </div>
              <small style={{ color: "#b54708", fontSize: "12px" }}>
                {upcoming} upcoming pipeline milestones
              </small>
            </div>
          </div>

          {/* Progress Breakdown Table */}
          <div style={{ background: "#fff", border: "1px solid #eaecf0", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(16,24,40,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#101828", margin: 0 }}>
                Active Project Milestone Breakdown
              </h3>
              <span style={{ fontSize: "13px", color: "#667085" }}>
                Showing <strong>{data.length}</strong> milestones
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f8f9fc", borderBottom: "1px solid #eaecf0", color: "#475467", textAlign: "left" }}>
                    <th style={{ padding: "10px 14px" }}>Milestone Code &amp; Title</th>
                    <th style={{ padding: "10px 14px" }}>Project</th>
                    <th style={{ padding: "10px 14px" }}>Lead / Owner</th>
                    <th style={{ padding: "10px 14px" }}>Weight (%)</th>
                    <th style={{ padding: "10px 14px" }}>Status</th>
                    <th style={{ padding: "10px 14px" }}>Calculated Progress</th>
                    <th style={{ padding: "10px 14px" }}>Budget / Effort</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length > 0 ? (
                    data.map((m) => {
                      const isComplete = m.status === "Completed";
                      const isInProgress = m.status === "In Progress";
                      const bg = isComplete ? "#ecfdf3" : isInProgress ? "#eff8ff" : "#fef0c7";
                      const text = isComplete ? "#027a48" : isInProgress ? "#175cd3" : "#b54708";

                      return (
                        <tr key={m.id} style={{ borderBottom: "1px solid #eaecf0" }}>
                          <td style={{ padding: "12px 14px", fontWeight: 600, color: "#101828" }}>
                            <Link href={`/milestones/${encodeURIComponent(m._id || m.id)}`} style={{ color: "#155eef", textDecoration: "none" }}>
                              {m.milestoneCode || m.id}
                            </Link>
                            <span style={{ color: "#475467", fontWeight: 500, marginLeft: "6px" }}>
                              — {m.title}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px", color: "#344054" }}>
                            {m.projectCode ? `${m.projectCode} · ` : ""}{m.projectName || "General"}
                          </td>
                          <td style={{ padding: "12px 14px", color: "#344054" }}>
                            {m.owner?.name || "Unassigned"}
                          </td>
                          <td style={{ padding: "12px 14px", fontWeight: 600 }}>
                            {m.weight || 10}%
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{ padding: "2px 8px", background: bg, color: text, borderRadius: "4px", fontSize: "12px", fontWeight: 600 }}>
                              {m.status}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontWeight: 600, minWidth: "32px" }}>{m.progress || 0}%</span>
                              <div style={{ flex: 1, maxWidth: "100px", height: "6px", background: "#eaecf0", borderRadius: "999px", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${Math.min(100, m.progress || 0)}%`, background: isComplete ? "#12b76a" : "#155eef", borderRadius: "999px" }} />
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px", color: m.budget ? "#027a48" : "#667085", fontWeight: 600 }}>
                            {m.budget ? `₹ ${m.budget.toLocaleString("en-IN")}` : "—"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                        No milestones recorded in the database yet. Click &quot;Create Milestone&quot; to begin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
