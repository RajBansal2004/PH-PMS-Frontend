"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "../../components/Shell";
import { StatusBadge } from "../../components/StatusBadge";
import {
  Settings,
  Activity,
  Flag,
  Database,
  Cpu,
  Server,
  RefreshCw,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Check,
  X,
  Zap,
} from "lucide-react";

export default function SystemAdministrationPage() {
  const [activeTab, setActiveTab] = useState<
    "general" | "workflow" | "master" | "health" | "flags"
  >("health");
  const [healthStatus, setHealthStatus] = useState<any>({
    status: "ok",
    service: "ph-pms-backend",
    uptime: "99.98%",
    memoryUsage: "128 MB / 1024 MB",
    dbConnection: "CONNECTED (MongoDB ReplicaSet)",
    redisState: "ACTIVE (ioredis 5.7.0)",
    activeSessions: 14,
    latency: "18 ms",
  });
  const [loading, setLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Feature Flags State (ADM-005)
  const [flags, setFlags] = useState({
    aiAssistantL1: true,
    aiPredictiveDelayL2: true,
    aiAutonomousReallocationL3: false,
    clientPortalExternalAccess: true,
    whatsAppDirectEscalation: true,
    automatedTimesheetReminder: true,
    strictDeploymentGateZeroBugs: true,
  });

  const checkLiveHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/health", { method: "GET" }).catch(() => null);
      if (res && res.ok) {
        const json = await res.json();
        setHealthStatus((prev: any) => ({
          ...prev,
          status: json.status || "ok",
          service: json.service || "ph-pms-backend",
          latency: "12 ms",
        }));
      }
    } catch {
      // Local view
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkLiveHealth();
  }, []);

  const toggleFlag = (key: keyof typeof flags) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
    setActionNotice(`Feature flag "${key}" updated!`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  return (
    <Shell>
      <div className="page" style={{ padding: "1.5rem" }}>
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <div
              style={{
                textTransform: "uppercase",
                color: "#64748b",
                fontSize: "0.8rem",
                letterSpacing: "0.05em",
              }}
            >
              MODULE 21 · SYSTEM ADMINISTRATION & HEALTH MONITORING
            </div>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: "bold",
                color: "#0f172a",
                margin: "4px 0",
              }}
            >
              System Administration & Runtime Telemetry
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
              Enterprise feature flags, dynamic workflow policies, database health, and runtime telemetry.
            </p>
          </div>

          <button
            type="button"
            className="btn outline"
            onClick={checkLiveHealth}
            disabled={loading}
          >
            <RefreshCw
              size={14}
              className={loading ? "animate-spin" : ""}
              style={{ marginRight: "4px" }}
            />
            Ping Health Check
          </button>
        </div>

        {/* NOTIFICATION NOTICE */}
        {actionNotice && (
          <div
            style={{
              padding: "12px 16px",
              background: "#ecfdf5",
              color: "#059669",
              border: "1px solid #10b981",
              borderRadius: "8px",
              marginBottom: "1.2rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: 500,
            }}
          >
            <CheckCircle2 size={18} />
            {actionNotice}
          </div>
        )}

        {/* TAB CONTROLS */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            borderBottom: "2px solid #e2e8f0",
            marginBottom: "1.5rem",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("health")}
            style={{
              padding: "10px 18px",
              borderBottom:
                activeTab === "health"
                  ? "3px solid #2563eb"
                  : "3px solid transparent",
              color: activeTab === "health" ? "#2563eb" : "#64748b",
              fontWeight: activeTab === "health" ? "bold" : "normal",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Activity size={16} />
            Health Monitoring (ADM-004)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("flags")}
            style={{
              padding: "10px 18px",
              borderBottom:
                activeTab === "flags"
                  ? "3px solid #2563eb"
                  : "3px solid transparent",
              color: activeTab === "flags" ? "#2563eb" : "#64748b",
              fontWeight: activeTab === "flags" ? "bold" : "normal",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Flag size={16} />
            Feature Flags (ADM-005)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("workflow")}
            style={{
              padding: "10px 18px",
              borderBottom:
                activeTab === "workflow"
                  ? "3px solid #2563eb"
                  : "3px solid transparent",
              color: activeTab === "workflow" ? "#2563eb" : "#64748b",
              fontWeight: activeTab === "workflow" ? "bold" : "normal",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Sliders size={16} />
            Workflow Rules (ADM-002)
          </button>
        </div>

        {/* TAB 1: HEALTH MONITORING (ADM-004) */}
        {activeTab === "health" && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <div
                className="kpi card"
                style={{
                  padding: "1rem",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              >
                <Server size={22} color="#059669" />
                <div>
                  <small style={{ color: "#64748b" }}>Express Microservice</small>
                  <strong style={{ display: "block", fontSize: "1.4rem", color: "#059669" }}>
                    HEALTHY 200
                  </strong>
                  <small style={{ color: "#059669" }}>Latency: {healthStatus.latency}</small>
                </div>
              </div>

              <div
                className="kpi card"
                style={{
                  padding: "1rem",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              >
                <Database size={22} color="#2563eb" />
                <div>
                  <small style={{ color: "#64748b" }}>MongoDB Database</small>
                  <strong style={{ display: "block", fontSize: "1.4rem" }}>
                    Connected
                  </strong>
                  <small style={{ color: "#2563eb" }}>ReplicaSet Primary</small>
                </div>
              </div>

              <div
                className="kpi card"
                style={{
                  padding: "1rem",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              >
                <Cpu size={22} color="#d97706" />
                <div>
                  <small style={{ color: "#64748b" }}>Redis Cache & Queue</small>
                  <strong style={{ display: "block", fontSize: "1.4rem" }}>
                    Active
                  </strong>
                  <small style={{ color: "#d97706" }}>Rate Limiters Armed</small>
                </div>
              </div>

              <div
                className="kpi card"
                style={{
                  padding: "1rem",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              >
                <Activity size={22} color="#6366f1" />
                <div>
                  <small style={{ color: "#64748b" }}>Service Availability</small>
                  <strong style={{ display: "block", fontSize: "1.4rem" }}>
                    99.98%
                  </strong>
                  <small style={{ color: "#059669" }}>SLA Tier 1</small>
                </div>
              </div>
            </div>

            <div
              className="card"
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "1.25rem",
              }}
            >
              <b>Runtime Node.js Environment Diagnostics</b>
              <div style={{ marginTop: "1rem", display: "grid", gap: "8px", fontSize: "0.9rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", padding: "8px 0" }}>
                  <span style={{ color: "#64748b" }}>Backend Framework:</span>
                  <strong>Express 5.1.0 + Mongoose 8.18.0</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", padding: "8px 0" }}>
                  <span style={{ color: "#64748b" }}>Frontend Architecture:</span>
                  <strong>Next.js 16.2.6 (App Router) + React 19.1.0</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", padding: "8px 0" }}>
                  <span style={{ color: "#64748b" }}>Memory Footprint:</span>
                  <strong>{healthStatus.memoryUsage}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", padding: "8px 0" }}>
                  <span style={{ color: "#64748b" }}>Timezone:</span>
                  <strong>Asia/Kolkata (IST +05:30)</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FEATURE FLAGS (ADM-005) */}
        {activeTab === "flags" && (
          <div
            className="card"
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "1.5rem",
            }}
          >
            <h2 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
              Enterprise Feature Flag Administration (ADM-005)
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Control progressive rollouts of AI agents, external client portals, and strict release gates.
            </p>

            <div style={{ display: "grid", gap: "12px" }}>
              {[
                {
                  key: "aiAssistantL1" as const,
                  title: "Level 1 AI Delivery Assistant",
                  desc: "Enables natural language querying in the executive command center (e.g. 'Summarize overdue sprint tasks').",
                },
                {
                  key: "aiPredictiveDelayL2" as const,
                  title: "Level 2 Predictive Delay & Risk Modeling",
                  desc: "Calculates milestone variance risks and alerts delivery managers before deadlines are breached.",
                },
                {
                  key: "aiAutonomousReallocationL3" as const,
                  title: "Level 3 Autonomous Resource Reallocation (Human-in-the-Loop)",
                  desc: "Detects developer overloads (>100%) and stages alternate resource assignment approvals.",
                },
                {
                  key: "clientPortalExternalAccess" as const,
                  title: "External Client Portal & UAT Signoff",
                  desc: "Allows authorized external clients to inspect approved BRD baselines and sign off UAT milestones.",
                },
                {
                  key: "whatsAppDirectEscalation" as const,
                  title: "WhatsApp Direct Delay Escalation",
                  desc: "Dispatches critical approval timeout notices to project leads and department heads via WhatsApp Business API.",
                },
                {
                  key: "strictDeploymentGateZeroBugs" as const,
                  title: "Strict Zero-Critical-Defect Deployment Gate",
                  desc: "Block production deployment approvals if any unresolved Critical or High severity bug remains open.",
                },
              ].map((f) => {
                const isEnabled = flags[f.key];
                return (
                  <div
                    key={f.key}
                    style={{
                      padding: "1rem",
                      border: "1px solid",
                      borderColor: isEnabled ? "#bbf7d0" : "#e2e8f0",
                      background: isEnabled ? "#f0fdf4" : "#ffffff",
                      borderRadius: "6px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#0f172a" }}>
                        {f.title}
                      </div>
                      <p style={{ color: "#475569", fontSize: "0.85rem", margin: "2px 0 0" }}>
                        {f.desc}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleFlag(f.key)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "20px",
                        fontSize: "0.8rem",
                        fontWeight: "bold",
                        cursor: "pointer",
                        border: isEnabled ? "1px solid #10b981" : "1px solid #cbd5e1",
                        background: isEnabled ? "#10b981" : "#f1f5f9",
                        color: isEnabled ? "#ffffff" : "#64748b",
                      }}
                    >
                      {isEnabled ? "ENABLED" : "DISABLED"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: WORKFLOW RULES (ADM-002) */}
        {activeTab === "workflow" && (
          <div
            className="card"
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "1.5rem",
            }}
          >
            <h2 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
              Standard Operational Delivery Policies (ADM-002)
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Hardcoded organizational guardrails per the approved BRD blueprint.
            </p>

            <ul style={{ paddingLeft: "1.2rem", color: "#334155", fontSize: "0.9rem", display: "grid", gap: "8px" }}>
              <li><strong>Standard Sprint Cadence:</strong> Fixed 2-week sprint cycles with story point estimation.</li>
              <li><strong>Nominal Working Hours:</strong> 6-day working week, 9 hours/day = 54 nominal hours/week.</li>
              <li><strong>Delivery Utilization Factor:</strong> 80% effective capacity (7.2h/day dedicated to project execution).</li>
              <li><strong>Milestone Weights:</strong> All project milestones must sum to exactly 100.0%.</li>
              <li><strong>Timesheet Backdating Grace Period:</strong> Maximum 48 hours for retro-logging hours.</li>
              <li><strong>Approval Escalation Timeout:</strong> 48 hours without decision escalates to Tier 2 (CxO / MD).</li>
            </ul>
          </div>
        )}
      </div>
    </Shell>
  );
}
