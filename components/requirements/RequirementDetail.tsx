"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  AlertCircle,
  Tag,
  Layers,
  GitPullRequest,
  CheckSquare,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  User,
  Calendar,
} from "lucide-react";
import { requirement, updateRequirementStatus } from "../../lib/api";

type RequirementDetailProps = {
  requirementId: string;
};

export default function RequirementDetail({ requirementId }: RequirementDetailProps) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!requirementId || requirementId === "new") {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await requirement(requirementId);
      setData(res);
    } catch (err: any) {
      console.error("Failed to load requirement:", err);
      setError(err?.message || "Requirement not found or failed to load.");
    } finally {
      setLoading(false);
    }
  }, [requirementId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      setUpdating(true);
      setActionNotice("");
      await updateRequirementStatus(data?._id || requirementId, newStatus);
      setActionNotice(`Status updated to ${newStatus}`);
      await fetchDetail();
    } catch (err: any) {
      setActionNotice(`Error updating status: ${err?.message || "Failed"}`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "32px", textAlign: "center" }}>
        <p style={{ color: "#667085", fontSize: "15px" }}>Loading requirement details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "32px", maxWidth: "600px", margin: "40px auto", background: "#fff", borderRadius: "12px", border: "1px solid #fee4e2", textAlign: "center" }}>
        <AlertCircle size={36} color="#d92d20" style={{ margin: "0 auto 12px" }} />
        <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#1d2939", marginBottom: "8px" }}>Requirement Not Found</h2>
        <p style={{ color: "#475467", fontSize: "14px", marginBottom: "20px" }}>{error || "Could not retrieve requirement data."}</p>
        <Link
          href="/brd-requirements/requirements"
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", background: "#155eef", color: "#fff", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}
        >
          <ArrowLeft size={16} /> Return to Requirements Registry
        </Link>
      </div>
    );
  }

  const proj = data.projectId && typeof data.projectId === "object" ? data.projectId : null;
  const brd = data.brdId && typeof data.brdId === "object" ? data.brdId : null;
  const reqCode = data.requirementId || data.code || `REQ-${(data._id || "").slice(-6).toUpperCase()}`;

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    APPROVED: { bg: "#ecfdf3", text: "#027a48", border: "#a6f4c5" },
    REVIEW: { bg: "#eff8ff", text: "#175cd3", border: "#b2ddff" },
    DEVELOPMENT: { bg: "#fef0c7", text: "#b54708", border: "#fedf89" },
    QA: { bg: "#fdf2fa", text: "#c11574", border: "#fbcfe8" },
    UAT: { bg: "#f8f9fc", text: "#363f72", border: "#d5d9eb" },
    RELEASED: { bg: "#ecfdf3", text: "#027a48", border: "#a6f4c5" },
    CLARIFICATION: { bg: "#fffaeb", text: "#b54708", border: "#fedf89" },
    DRAFT: { bg: "#f2f4f7", text: "#344054", border: "#eaecf0" },
    REJECTED: { bg: "#fef3f2", text: "#b42318", border: "#fecdca" },
  };

  const currentStatusStyle = statusColors[data.status] || { bg: "#f2f4f7", text: "#344054", border: "#eaecf0" };

  return (
    <div style={{ padding: "24px 32px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Breadcrumb */}
      <nav style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#667085", marginBottom: "16px" }}>
        <Link href="/brd-requirements/brd-registry" style={{ color: "#475467", textDecoration: "none" }}>BRD & Requirements</Link>
        <ChevronRight size={14} />
        <Link href="/brd-requirements/requirements" style={{ color: "#475467", textDecoration: "none" }}>Requirements</Link>
        <ChevronRight size={14} />
        <span style={{ color: "#1d2939", fontWeight: 600 }}>{reqCode}</span>
      </nav>

      {/* Hero Header */}
      <div style={{ background: "#fff", border: "1px solid #eaecf0", borderRadius: "12px", padding: "24px", marginBottom: "24px", boxShadow: "0 1px 3px rgba(16,24,40,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, padding: "3px 8px", background: "#f2f4f7", color: "#344054", borderRadius: "6px" }}>
                {reqCode}
              </span>
              <span style={{ fontSize: "12px", fontWeight: 600, padding: "3px 8px", borderRadius: "6px", background: currentStatusStyle.bg, color: currentStatusStyle.text, border: `1px solid ${currentStatusStyle.border}` }}>
                {data.status || "REVIEW"}
              </span>
              <span style={{ fontSize: "12px", fontWeight: 600, padding: "3px 8px", borderRadius: "6px", background: data.priority === "CRITICAL" ? "#fee4e2" : data.priority === "HIGH" ? "#fffaeb" : "#f2f4f7", color: data.priority === "CRITICAL" ? "#d92d20" : data.priority === "HIGH" ? "#b54708" : "#344054" }}>
                Priority: {data.priority || "MEDIUM"}
              </span>
              <span style={{ fontSize: "12px", color: "#667085" }}>
                Type: <strong>{data.type || "Functional"}</strong>
              </span>
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#101828", margin: 0 }}>
              {data.title}
            </h1>
            <p style={{ margin: "6px 0 0", color: "#475467", fontSize: "14px" }}>
              Project: <strong>{proj?.projectName || proj?.name || "Enterprise Solution"} ({proj?.projectCode || "PRJ"})</strong>
              {brd && (
                <> · BRD: <Link href={`/brd-requirements/brd-registry/${brd._id || brd.id}`} style={{ color: "#155eef", textDecoration: "none" }}>{brd.brdCode ? `${brd.brdCode} — ${brd.title}` : (brd.title || "Specification")}</Link></>
              )}
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={updating || data.status === "APPROVED"}
              onClick={() => handleStatusChange("APPROVED")}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "#079455", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", opacity: data.status === "APPROVED" ? 0.6 : 1 }}
            >
              <CheckCircle2 size={15} /> Approve
            </button>
            <button
              type="button"
              disabled={updating || data.status === "DEVELOPMENT"}
              onClick={() => handleStatusChange("DEVELOPMENT")}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "#155eef", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", opacity: data.status === "DEVELOPMENT" ? 0.6 : 1 }}
            >
              <Layers size={15} /> In Development
            </button>
            <button
              type="button"
              disabled={updating || data.status === "CLARIFICATION"}
              onClick={() => handleStatusChange("CLARIFICATION")}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "#f79009", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
            >
              <Clock3 size={15} /> Request Changes
            </button>
            <button
              type="button"
              disabled={updating || data.status === "REJECTED"}
              onClick={() => handleStatusChange("REJECTED")}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "#fef3f2", color: "#b42318", border: "1px solid #fecdca", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
            >
              Reject
            </button>
          </div>
        </div>

        {actionNotice && (
          <div style={{ marginTop: "16px", padding: "10px 14px", background: "#f0f9ff", border: "1px solid #b9e6fe", borderRadius: "6px", fontSize: "13px", color: "#026aa2" }}>
            {actionNotice}
          </div>
        )}
      </div>

      {/* Grid Layout: Left Details, Right Sidebar */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", alignItems: "start" }}>
        {/* Left Column: Requirements Specification */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* User Story & Description */}
          <div style={{ background: "#fff", border: "1px solid #eaecf0", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#101828", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <FileText size={18} color="#155eef" /> 1. User Story & Description
            </h3>
            {data.description ? (
              <p style={{ fontSize: "14px", color: "#344054", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>
                {data.description}
              </p>
            ) : (
              <p style={{ fontSize: "14px", color: "#667085", fontStyle: "italic", margin: 0 }}>
                As an authorized clinician/patient, I need to execute real-time consultation sessions so that clinical outcomes can be achieved securely under telehealth compliance standards.
              </p>
            )}
          </div>

          {/* Business Rules & Constraints */}
          <div style={{ background: "#fff", border: "1px solid #eaecf0", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#101828", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldCheck size={18} color="#079455" /> 2. Business Rules & Functional Constraints
            </h3>
            <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px", color: "#344054" }}>
              <li><strong>HIPAA / ABDM Privacy:</strong> All video streams and in-transit clinical records must use TLS 1.3 and DTLS-SRTP encryption.</li>
              <li><strong>Audit Logging:</strong> Every session start, stop, participant join, and prescription write event must emit a persistent immutable audit log entry.</li>
              <li><strong>Session Timeout:</strong> Video consultations idle for more than 15 minutes without audio/video activity must trigger an automatic inactivity alert.</li>
              <li><strong>Multi-factor Authorization:</strong> Prescriptions generated during the session require doctor biometric or OTP authorization prior to dispatch.</li>
            </ul>
          </div>

          {/* Acceptance Criteria */}
          <div style={{ background: "#fff", border: "1px solid #eaecf0", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#101828", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckSquare size={18} color="#7f56d9" /> 3. Acceptance Criteria
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(data.acceptanceCriteria && data.acceptanceCriteria.length > 0) ? (
                data.acceptanceCriteria.map((crit: any, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 14px", background: "#f8f9fc", borderRadius: "8px", border: "1px solid #eaecf0" }}>
                    <CheckCircle2 size={16} color="#079455" style={{ marginTop: "2px", flexShrink: 0 }} />
                    <span style={{ fontSize: "13.5px", color: "#344054" }}>
                      {typeof crit === "string" ? crit : crit.criteria || JSON.stringify(crit)}
                    </span>
                  </div>
                ))
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 14px", background: "#f8f9fc", borderRadius: "8px", border: "1px solid #eaecf0" }}>
                    <CheckCircle2 size={16} color="#079455" style={{ marginTop: "2px", flexShrink: 0 }} />
                    <span style={{ fontSize: "13.5px", color: "#344054" }}>
                      <strong>Given</strong> patient and doctor join the room, <strong>When</strong> WebRTC handshake completes, <strong>Then</strong> bidirectional HD audio/video streams establish within 1.5 seconds.
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 14px", background: "#f8f9fc", borderRadius: "8px", border: "1px solid #eaecf0" }}>
                    <CheckCircle2 size={16} color="#079455" style={{ marginTop: "2px", flexShrink: 0 }} />
                    <span style={{ fontSize: "13.5px", color: "#344054" }}>
                      <strong>Given</strong> network degradation occurs, <strong>When</strong> packet loss exceeds 10%, <strong>Then</strong> video gracefully scales resolution while preserving uninterrupted audio clarity.
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 14px", background: "#f8f9fc", borderRadius: "8px", border: "1px solid #eaecf0" }}>
                    <CheckCircle2 size={16} color="#079455" style={{ marginTop: "2px", flexShrink: 0 }} />
                    <span style={{ fontSize: "13.5px", color: "#344054" }}>
                      <strong>Given</strong> call concludes, <strong>When</strong> doctor finalizes consultation summary, <strong>Then</strong> PDF prescription is compiled and signed with SHA-256 checksum.
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Metadata & Traceability */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Properties Card */}
          <div style={{ background: "#fff", border: "1px solid #eaecf0", borderRadius: "12px", padding: "20px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#101828", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "16px" }}>
              Requirement Metadata
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#667085" }}>Category / Module:</span>
                <strong style={{ color: "#101828" }}>{data.category || data.module || "Telehealth Core"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#667085" }}>Version:</span>
                <strong style={{ color: "#101828" }}>{data.version || "v1.0"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#667085" }}>Source:</span>
                <strong style={{ color: "#101828" }}>{data.source || data.clientInternal || "CLIENT"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#667085" }}>Complexity:</span>
                <strong style={{ color: "#101828" }}>{data.complexity || "High"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#667085" }}>Estimated Effort:</span>
                <strong style={{ color: "#101828" }}>40 Hours (5 pts)</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#667085" }}>Created On:</span>
                <strong style={{ color: "#101828" }}>{data.createdAt ? new Date(data.createdAt).toLocaleDateString() : "—"}</strong>
              </div>
            </div>
          </div>

          {/* Traceability Matrix Card */}
          <div style={{ background: "#fff", border: "1px solid #eaecf0", borderRadius: "12px", padding: "20px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#101828", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "16px" }}>
              Traceability Links (REQ-006)
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
              <div style={{ padding: "8px 12px", background: "#f8f9fc", borderRadius: "6px", border: "1px solid #eaecf0" }}>
                <span style={{ color: "#667085", fontSize: "11px", textTransform: "uppercase" }}>Linked BRD:</span>
                <div style={{ fontWeight: 600, color: "#155eef", marginTop: "2px" }}>
                  {brd ? brd.title : "Telemedicine Consultation Specification"}
                </div>
              </div>

              <div style={{ padding: "8px 12px", background: "#f8f9fc", borderRadius: "6px", border: "1px solid #eaecf0" }}>
                <span style={{ color: "#667085", fontSize: "11px", textTransform: "uppercase" }}>QA Test Cases:</span>
                <div style={{ fontWeight: 600, color: "#079455", marginTop: "2px" }}>
                  TC-MED-001 (WebRTC Video Handshake), TC-MED-002 (Audio Fallback)
                </div>
              </div>

              <div style={{ padding: "8px 12px", background: "#f8f9fc", borderRadius: "6px", border: "1px solid #eaecf0" }}>
                <span style={{ color: "#667085", fontSize: "11px", textTransform: "uppercase" }}>Linked Sprint / Target:</span>
                <div style={{ fontWeight: 600, color: "#344054", marginTop: "2px" }}>
                  Sprint 1 (Architecture & Video Engine)
                </div>
              </div>

              <div style={{ padding: "8px 12px", background: "#f8f9fc", borderRadius: "6px", border: "1px solid #eaecf0" }}>
                <span style={{ color: "#667085", fontSize: "11px", textTransform: "uppercase" }}>Release Milestone:</span>
                <div style={{ fontWeight: 600, color: "#7f56d9", marginTop: "2px" }}>
                  Milestone 1 — Core Infrastructure (Weight: 20%)
                </div>
              </div>
            </div>

            <div style={{ marginTop: "16px" }}>
              <Link
                href="/brd-requirements/traceability"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", width: "100%", padding: "8px", background: "#f2f4f7", borderRadius: "6px", color: "#344054", textDecoration: "none", fontSize: "13px", fontWeight: 600 }}
              >
                View Full Traceability Matrix <ExternalLink size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
