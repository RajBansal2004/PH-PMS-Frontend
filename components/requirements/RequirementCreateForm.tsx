"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FolderGit2,
  FileCheck2,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import {
  createRequirement,
  getNextRequirementCode,
  projects as getProjectsApi,
} from "../../lib/api";
import { brdApi } from "../../lib/brd/api";

export default function RequirementCreateForm() {
  const router = useRouter();

  const [loadingCode, setLoadingCode] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [projectList, setProjectList] = useState<any[]>([]);
  const [brdList, setBrdList] = useState<any[]>([]);

  const [form, setForm] = useState({
    requirementId: "REQ-00004",
    projectId: "",
    projectCode: "",
    projectName: "",
    brdId: "",
    title: "",
    type: "Functional",
    module: "General",
    priority: "HIGH",
    description: "",
    businessRule: "Standard compliance, data security, and validation rules apply.",
    acceptanceCriteria: [
      "Must validate input data format and reject invalid payloads with 400 Bad Request.",
      "Must generate structured audit trail upon state transition.",
    ],
  });

  const [newCriteria, setNewCriteria] = useState("");

  // Load next requirement code and project list
  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      try {
        setLoadingCode(true);
        const [codeRes, projsRes, brdsRes] = await Promise.allSettled([
          getNextRequirementCode(),
          getProjectsApi({ limit: 100 }),
          brdApi.list({ pageSize: 100 }),
        ]);

        if (!isMounted) return;

        if (codeRes.status === "fulfilled" && codeRes.value?.nextCode) {
          setForm((prev) => ({ ...prev, requirementId: codeRes.value.nextCode }));
        }

        let pList: any[] = [];
        if (projsRes.status === "fulfilled") {
          const raw = projsRes.value;
          pList = Array.isArray(raw) ? raw : (raw as any)?.data || (raw as any)?.items || [];
          setProjectList(pList);
        }

        let bList: any[] = [];
        if (brdsRes.status === "fulfilled") {
          bList = brdsRes.value?.items || [];
          setBrdList(bList);
        }

        if (pList.length > 0) {
          const firstProj = pList[0];
          const matchedBrd = bList.find(
            (b) => String(b.projectId) === String(firstProj._id || firstProj.id)
          ) || bList[0];

          setForm((prev) => ({
            ...prev,
            projectId: firstProj._id || firstProj.id,
            projectCode: firstProj.projectCode || "PRJ-001",
            projectName: firstProj.name || firstProj.projectName || "Enterprise Solution",
            brdId: matchedBrd?.id || matchedBrd?._id || "",
          }));
        }
      } catch (err: any) {
        console.warn("Initial requirement data load warning:", err);
      } finally {
        if (isMounted) setLoadingCode(false);
      }
    }

    loadInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleProjectSelect = (projId: string) => {
    const selected = projectList.find(
      (p) => String(p._id || p.id) === String(projId)
    );

    const relevantBrds = brdList.filter(
      (b) => String(b.projectId) === String(projId)
    );
    const chosenBrd = relevantBrds.length > 0 ? relevantBrds[0] : brdList[0];

    setForm((prev) => ({
      ...prev,
      projectId: projId,
      projectCode: selected?.projectCode || "",
      projectName: selected?.name || selected?.projectName || "",
      brdId: chosenBrd?.id || chosenBrd?._id || prev.brdId,
    }));
  };

  const handleAddCriteria = () => {
    if (!newCriteria.trim()) return;
    setForm((prev) => ({
      ...prev,
      acceptanceCriteria: [...prev.acceptanceCriteria, newCriteria.trim()],
    }));
    setNewCriteria("");
  };

  const handleRemoveCriteria = (index: number) => {
    setForm((prev) => ({
      ...prev,
      acceptanceCriteria: prev.acceptanceCriteria.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.projectId) {
      setErrorMessage("Please select a target project.");
      return;
    }
    if (!form.brdId) {
      setErrorMessage("Please select an associated BRD.");
      return;
    }
    if (!form.title.trim()) {
      setErrorMessage("Please enter a requirement title.");
      return;
    }
    if (!form.description.trim()) {
      setErrorMessage("Please enter a detailed description for this requirement.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        projectId: form.projectId,
        brdId: form.brdId,
        requirementId: form.requirementId,
        title: form.title.trim(),
        type: form.type,
        module: form.module.trim() || "General",
        priority: form.priority,
        description: form.description.trim(),
        businessRule: form.businessRule.trim(),
        acceptanceCriteria: form.acceptanceCriteria,
      };

      const result = await createRequirement(payload);
      setSuccessMessage(`Requirement ${form.requirementId} created successfully! Redirecting...`);

      setTimeout(() => {
        router.push("/brd-requirements/requirements");
      }, 1200);
    } catch (err: any) {
      console.error("Create requirement error:", err);
      setErrorMessage(err?.message || "Failed to create requirement. Please check your inputs.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "28px 32px 64px" }}>
      {/* Breadcrumb */}
      <nav style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#667085", marginBottom: "18px" }}>
        <Link href="/brd-requirements/requirements" style={{ color: "#475467", textDecoration: "none" }}>
          BRD & Requirements
        </Link>
        <ChevronRight size={14} />
        <Link href="/brd-requirements/requirements" style={{ color: "#475467", textDecoration: "none" }}>
          Requirements Registry
        </Link>
        <ChevronRight size={14} />
        <span style={{ color: "#1d2939", fontWeight: 600 }}>Create New Requirement</span>
      </nav>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#101828", margin: 0 }}>
              Create New Requirement
            </h1>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", background: "#f0f9ff", color: "#026aa2", border: "1px solid #b9e6fe", borderRadius: "12px", fontSize: "12px", fontWeight: 600 }}>
              <Sparkles size={12} /> {loadingCode ? "Generating..." : form.requirementId}
            </span>
          </div>
          <p style={{ margin: 0, color: "#475467", fontSize: "14px" }}>
            Define an atomic functional or non-functional requirement linked to your project specifications and BRD baseline.
          </p>
        </div>

        <Link
          href="/brd-requirements/requirements"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "#fff", border: "1px solid #d0d5dd", borderRadius: "8px", fontSize: "13px", fontWeight: 600, color: "#344054", textDecoration: "none" }}
        >
          <ArrowLeft size={14} /> Back to Registry
        </Link>
      </div>

      {/* Feedback alerts */}
      {errorMessage && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", background: "#fef3f2", border: "1px solid #fecdca", borderRadius: "8px", color: "#b42318", fontSize: "14px", marginBottom: "20px" }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", background: "#ecfdf3", border: "1px solid #a6f4c5", borderRadius: "8px", color: "#027a48", fontSize: "14px", marginBottom: "20px" }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Section 1: Association */}
        <section style={{ background: "#fff", border: "1px solid #eaecf0", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
            <FolderGit2 size={18} color="#155eef" />
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#101828", margin: 0 }}>
              1. Project & BRD Association
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#344054", marginBottom: "6px" }}>
                Requirement ID (Auto-Generated)
              </label>
              <input
                type="text"
                value={form.requirementId}
                readOnly
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", background: "#f8f9fc", color: "#475467", fontSize: "14px", fontWeight: 600 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#344054", marginBottom: "6px" }}>
                Target Project *
              </label>
              <select
                value={form.projectId}
                onChange={(e) => handleProjectSelect(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", background: "#fff", fontSize: "14px", color: "#101828" }}
              >
                <option value="">Select Target Project</option>
                {projectList.map((p, idx) => (
                  <option key={p._id || p.id || `p-${idx}`} value={p._id || p.id}>
                    {p.projectCode ? `${p.projectCode} — ${p.name || p.projectName}` : (p.name || p.projectName)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#344054", marginBottom: "6px" }}>
                Associated BRD Document *
              </label>
              <select
                value={form.brdId}
                onChange={(e) => setForm({ ...form, brdId: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", background: "#fff", fontSize: "14px", color: "#101828" }}
              >
                <option value="">Select Associated BRD</option>
                {brdList.map((b, idx) => (
                  <option key={b.id || b._id || `b-${idx}`} value={b.id || b._id}>
                    {b.brdCode || b.code || "BRD"} — {b.title || "Business Requirement Document"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#344054", marginBottom: "6px" }}>
                Functional Module / Area
              </label>
              <input
                type="text"
                value={form.module}
                onChange={(e) => setForm({ ...form, module: e.target.value })}
                placeholder="e.g. Video Consultation, Auth, Billing"
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", background: "#fff", fontSize: "14px" }}
              />
            </div>
          </div>
        </section>

        {/* Section 2: Requirement Details */}
        <section style={{ background: "#fff", border: "1px solid #eaecf0", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
            <FileText size={18} color="#7f56d9" />
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#101828", margin: 0 }}>
              2. Requirement Specification
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#344054", marginBottom: "6px" }}>
                Requirement Title *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. End-to-End Encrypted WebRTC Consultation Room"
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", background: "#fff", fontSize: "14px", fontWeight: 500 }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#344054", marginBottom: "6px" }}>
                  Requirement Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", background: "#fff", fontSize: "14px" }}
                >
                  <option value="Functional">Functional Requirement</option>
                  <option value="Non-Functional">Non-Functional Requirement</option>
                  <option value="Security">Security & Compliance</option>
                  <option value="Integration">Integration & Interface</option>
                  <option value="Business">Business Rule / Policy</option>
                  <option value="Constraint">Constraint & Mandate</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#344054", marginBottom: "6px" }}>
                  Priority Level
                </label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", background: "#fff", fontSize: "14px" }}
                >
                  <option value="CRITICAL">Critical (P0 - Blocker)</option>
                  <option value="HIGH">High (P1 - Core MVP)</option>
                  <option value="MEDIUM">Medium (P2 - Standard)</option>
                  <option value="LOW">Low (P3 - Nice to have)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#344054", marginBottom: "6px" }}>
                Detailed Description *
              </label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the functional requirement in detail, user persona involved, preconditions and expected behavior..."
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", background: "#fff", fontSize: "14px", resize: "vertical" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#344054", marginBottom: "6px" }}>
                Business Rule / Validation Logic
              </label>
              <textarea
                rows={3}
                value={form.businessRule}
                onChange={(e) => setForm({ ...form, businessRule: e.target.value })}
                placeholder="Business constraints, regulatory standards, or calculation formulas..."
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", background: "#fff", fontSize: "14px", resize: "vertical" }}
              />
            </div>
          </div>
        </section>

        {/* Section 3: Acceptance Criteria */}
        <section style={{ background: "#fff", border: "1px solid #eaecf0", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <FileCheck2 size={18} color="#079455" />
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#101828", margin: 0 }}>
              3. Acceptance Criteria
            </h2>
          </div>
          <p style={{ margin: "0 0 16px", fontSize: "13.5px", color: "#667085" }}>
            Provide verifiable scenarios used by QA and Product Owners to sign off on this requirement.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
            {form.acceptanceCriteria.map((item, index) => (
              <div
                key={index}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "10px 14px", background: "#f8f9fc", borderRadius: "8px", border: "1px solid #eaecf0" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", flex: 1 }}>
                  <CheckCircle2 size={16} color="#079455" style={{ marginTop: "2px", flexShrink: 0 }} />
                  <span style={{ fontSize: "13.5px", color: "#344054" }}>{item}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveCriteria(index)}
                  style={{ background: "none", border: "none", color: "#98a2b3", cursor: "pointer", padding: "4px", borderRadius: "4px" }}
                  title="Remove criterion"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={newCriteria}
              onChange={(e) => setNewCriteria(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCriteria();
                }
              }}
              placeholder="e.g. Given authenticated doctor, When session starts, Then audio and video latches within 3s."
              style={{ flex: 1, padding: "9px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", fontSize: "14px" }}
            />
            <button
              type="button"
              onClick={handleAddCriteria}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "#f0f9ff", border: "1px solid #b9e6fe", color: "#026aa2", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </section>

        {/* Submit Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "12px", marginTop: "8px" }}>
          <Link
            href="/brd-requirements/requirements"
            style={{ padding: "10px 18px", background: "#fff", border: "1px solid #d0d5dd", borderRadius: "8px", fontSize: "14px", fontWeight: 600, color: "#344054", textDecoration: "none" }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 22px", background: "#155eef", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, color: "#fff", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? "Creating Requirement..." : "Create Requirement"}
          </button>
        </div>
      </form>
    </div>
  );
}
