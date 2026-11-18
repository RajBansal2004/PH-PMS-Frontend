"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Layers,
  Check,
  RefreshCw,
  X,
} from "lucide-react";
import { changeRequests, createChangeRequest, updateChangeRequest, projects as getProjectsApi } from "../../lib/api";

type ChangeRequest = {
  _id: string;
  crId?: string;
  title: string;
  projectId?: any;
  originalScopeReference?: string;
  reason: string;
  businessImpact?: string;
  technicalImpact?: string;
  estimatedHours: number;
  estimatedCost: number;
  timelineImpactDays: number;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  paymentRequired: boolean;
  status:
    | "DRAFT"
    | "SUBMITTED"
    | "UNDER_EVALUATION"
    | "COMMERCIAL_APPROVAL_PENDING"
    | "APPROVED"
    | "REJECTED"
    | "IMPLEMENTED";
  requestedBy?: string;
  createdAt: string;
};

export default function ChangeRequestManagement() {
  const [list, setList] = useState<ChangeRequest[]>([]);
  const [projectList, setProjectList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [selectedCr, setSelectedCr] = useState<ChangeRequest | null>(null);

  // New CR Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    projectId: "",
    title: "",
    reason: "",
    originalScopeReference: "Baseline V1",
    estimatedHours: 40,
    estimatedCost: 35000,
    timelineImpactDays: 5,
    priority: "MEDIUM" as const,
    paymentRequired: true,
    businessImpact: "",
    technicalImpact: "",
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [crsRes, projsRes] = await Promise.allSettled([
        changeRequests(),
        getProjectsApi(),
      ]);

      if (crsRes.status === "fulfilled") {
        const raw = crsRes.value;
        const items = Array.isArray(raw) ? raw : raw?.data || raw?.items || [];
        setList(items);
        if (items.length > 0 && !selectedCr) {
          setSelectedCr(items[0]);
        }
      }

      if (projsRes.status === "fulfilled") {
        const rawP = projsRes.value;
        const pList = Array.isArray(rawP) ? rawP : (rawP as any)?.data || (rawP as any)?.items || [];
        setProjectList(pList);
        if (pList.length > 0 && !formData.projectId) {
          setFormData((prev) => ({ ...prev, projectId: pList[0]._id || pList[0].id }));
        }
      }
    } catch (err) {
      console.warn("Failed to load change requests:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateChangeRequest(id, { status });
      await loadData();
      if (selectedCr && selectedCr._id === id) {
        setSelectedCr((prev: any) => ({ ...prev, status }));
      }
    } catch (err: any) {
      alert(`Status update failed: ${err?.message || "Unknown error"}`);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId) {
      setFormError("Please select a target Project.");
      return;
    }
    if (!formData.title.trim() || !formData.reason.trim()) {
      setFormError("Title and Reason are required.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");
      await createChangeRequest({
        ...formData,
        estimatedHours: Number(formData.estimatedHours) || 0,
        estimatedCost: Number(formData.estimatedCost) || 0,
        timelineImpactDays: Number(formData.timelineImpactDays) || 0,
      });
      setShowCreateModal(false);
      setFormData({
        projectId: projectList[0]?._id || "",
        title: "",
        reason: "",
        originalScopeReference: "Baseline V1",
        estimatedHours: 40,
        estimatedCost: 35000,
        timelineImpactDays: 5,
        priority: "MEDIUM",
        paymentRequired: true,
        businessImpact: "",
        technicalImpact: "",
      });
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || "Failed to create Change Request.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = list.filter((item) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      (item.crId || "").toLowerCase().includes(q) ||
      item.reason.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    const matchesPriority = priorityFilter === "ALL" || item.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Calculate Metrics
  const totalCrs = list.length;
  const approvedCrs = list.filter((c) => c.status === "APPROVED" || c.status === "IMPLEMENTED").length;
  const pendingCrs = list.filter((c) => c.status === "SUBMITTED" || c.status === "UNDER_EVALUATION" || c.status === "COMMERCIAL_APPROVAL_PENDING").length;
  const totalCostImpact = list.reduce((sum, c) => sum + (Number(c.estimatedCost) || 0), 0);
  const totalHoursImpact = list.reduce((sum, c) => sum + (Number(c.estimatedHours) || 0), 0);

  const getStatusBadge = (st: string) => {
    const badges: Record<string, { label: string; bg: string; text: string; border: string }> = {
      APPROVED: { label: "Approved", bg: "#ecfdf3", text: "#027a48", border: "#a6f4c5" },
      IMPLEMENTED: { label: "Implemented", bg: "#ecfdf3", text: "#027a48", border: "#a6f4c5" },
      SUBMITTED: { label: "Submitted", bg: "#eff8ff", text: "#175cd3", border: "#b2ddff" },
      UNDER_EVALUATION: { label: "Under Evaluation", bg: "#fef0c7", text: "#b54708", border: "#fedf89" },
      COMMERCIAL_APPROVAL_PENDING: { label: "Commercial Review", bg: "#fffaeb", text: "#b54708", border: "#fedf89" },
      DRAFT: { label: "Draft", bg: "#f2f4f7", text: "#344054", border: "#eaecf0" },
      REJECTED: { label: "Rejected", bg: "#fef3f2", text: "#b42318", border: "#fecdca" },
    };
    const b = badges[st] || { label: st, bg: "#f2f4f7", text: "#344054", border: "#eaecf0" };
    return (
      <span style={{ fontSize: "12px", fontWeight: 600, padding: "2px 8px", borderRadius: "6px", background: b.bg, color: b.text, border: `1px solid ${b.border}` }}>
        {b.label}
      </span>
    );
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Breadcrumb & Header */}
      <nav style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#667085", marginBottom: "16px" }}>
        <Link href="/brd-requirements/brd-registry" style={{ color: "#475467", textDecoration: "none" }}>BRD & Requirements</Link>
        <ChevronRight size={14} />
        <span style={{ color: "#1d2939", fontWeight: 600 }}>Change Request Management (REQ-007)</span>
      </nav>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#101828", margin: 0 }}>
            Change Request Management
          </h1>
          <p style={{ margin: "4px 0 0", color: "#475467", fontSize: "14px" }}>
            Audit, evaluate, and approve project scope changes, commercial impacts, and timeline adjustments.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            onClick={loadData}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 12px", background: "#fff", border: "1px solid #d0d5dd", borderRadius: "8px", fontSize: "13px", fontWeight: 600, color: "#344054", cursor: "pointer" }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "#155eef", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
          >
            <Plus size={16} /> Raise Change Request
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "#fff", padding: "18px 20px", borderRadius: "10px", border: "1px solid #eaecf0", boxShadow: "0 1px 2px rgba(16,24,40,0.04)" }}>
          <span style={{ fontSize: "13px", color: "#667085", fontWeight: 500 }}>Total Change Requests</span>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "#101828", marginTop: "4px" }}>{totalCrs}</div>
          <small style={{ color: "#027a48", fontSize: "12px" }}>Across active projects</small>
        </div>
        <div style={{ background: "#fff", padding: "18px 20px", borderRadius: "10px", border: "1px solid #eaecf0", boxShadow: "0 1px 2px rgba(16,24,40,0.04)" }}>
          <span style={{ fontSize: "13px", color: "#667085", fontWeight: 500 }}>Pending Review</span>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "#b54708", marginTop: "4px" }}>{pendingCrs}</div>
          <small style={{ color: "#667085", fontSize: "12px" }}>Awaiting hierarchy sign-off</small>
        </div>
        <div style={{ background: "#fff", padding: "18px 20px", borderRadius: "10px", border: "1px solid #eaecf0", boxShadow: "0 1px 2px rgba(16,24,40,0.04)" }}>
          <span style={{ fontSize: "13px", color: "#667085", fontWeight: 500 }}>Approved / Implemented</span>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "#079455", marginTop: "4px" }}>{approvedCrs}</div>
          <small style={{ color: "#027a48", fontSize: "12px" }}>Integrated into milestones</small>
        </div>
        <div style={{ background: "#fff", padding: "18px 20px", borderRadius: "10px", border: "1px solid #eaecf0", boxShadow: "0 1px 2px rgba(16,24,40,0.04)" }}>
          <span style={{ fontSize: "13px", color: "#667085", fontWeight: 500 }}>Total Financial Impact</span>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "#155eef", marginTop: "4px" }}>₹ {totalCostImpact.toLocaleString()}</div>
          <small style={{ color: "#475467", fontSize: "12px" }}>{totalHoursImpact} billable hours</small>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", background: "#fff", border: "1px solid #d0d5dd", borderRadius: "8px", padding: "6px 12px", minWidth: "260px", flex: 1 }}>
          <Search size={16} color="#667085" style={{ marginRight: "8px" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search change requests..."
            style={{ border: "none", outline: "none", fontSize: "14px", width: "100%" }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", background: "#fff", fontSize: "13px", color: "#344054" }}
        >
          <option value="ALL">All Statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_EVALUATION">Under Evaluation</option>
          <option value="COMMERCIAL_APPROVAL_PENDING">Commercial Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", background: "#fff", fontSize: "13px", color: "#344054" }}
        >
          <option value="ALL">All Priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Main Table */}
      <div style={{ background: "#fff", border: "1px solid #eaecf0", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(16,24,40,0.05)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#f8f9fc", borderBottom: "1px solid #eaecf0", color: "#475467", fontWeight: 600 }}>
              <th style={{ padding: "12px 16px" }}>CR Code</th>
              <th style={{ padding: "12px 16px" }}>Title & Reason</th>
              <th style={{ padding: "12px 16px" }}>Scope Ref</th>
              <th style={{ padding: "12px 16px" }}>Effort & Cost</th>
              <th style={{ padding: "12px 16px" }}>Timeline</th>
              <th style={{ padding: "12px 16px" }}>Priority</th>
              <th style={{ padding: "12px 16px" }}>Status</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "#667085" }}>
                  Loading change requests...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "#667085" }}>
                  No change requests found matching filters.
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => {
                const code = item.crId || `CR-${String(item._id || idx).slice(-6).toUpperCase()}`;
                const isSelected = selectedCr?._id === item._id;

                return (
                  <tr
                    key={item._id || `cr-${idx}`}
                    onClick={() => setSelectedCr(item)}
                    style={{
                      borderBottom: "1px solid #eaecf0",
                      background: isSelected ? "#f9fafb" : "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "#155eef" }}>
                      {code}
                    </td>
                    <td style={{ padding: "12px 16px", maxWidth: "260px" }}>
                      <div style={{ fontWeight: 600, color: "#101828", marginBottom: "2px" }}>{item.title}</div>
                      <div style={{ color: "#667085", fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.reason}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#344054" }}>
                      {item.originalScopeReference || "Baseline V1"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, color: "#101828" }}>₹ {(Number(item.estimatedCost) || 0).toLocaleString()}</div>
                      <div style={{ color: "#667085", fontSize: "12px" }}>{item.estimatedHours || 0} hrs</div>
                    </td>
                    <td style={{ padding: "12px 16px", color: item.timelineImpactDays > 0 ? "#b54708" : "#344054" }}>
                      {item.timelineImpactDays > 0 ? `+${item.timelineImpactDays} days` : "No impact"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background: item.priority === "CRITICAL" ? "#fee4e2" : item.priority === "HIGH" ? "#fffaeb" : "#f2f4f7",
                        color: item.priority === "CRITICAL" ? "#d92d20" : item.priority === "HIGH" ? "#b54708" : "#344054",
                      }}>
                        {item.priority}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {getStatusBadge(item.status)}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                        {item.status !== "APPROVED" && (
                          <button
                            type="button"
                            title="Approve Change Request"
                            onClick={() => handleStatusUpdate(item._id, "APPROVED")}
                            style={{ padding: "4px 8px", background: "#ecfdf3", border: "1px solid #a6f4c5", borderRadius: "6px", color: "#027a48", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                          >
                            Approve
                          </button>
                        )}
                        {item.status !== "REJECTED" && (
                          <button
                            type="button"
                            title="Reject Change Request"
                            onClick={() => handleStatusUpdate(item._id, "REJECTED")}
                            style={{ padding: "4px 8px", background: "#fef3f2", border: "1px solid #fecdca", borderRadius: "6px", color: "#b42318", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Selected CR Detail Drawer / Footer View */}
      {selectedCr && (
        <div style={{ marginTop: "24px", background: "#fff", border: "1px solid #eaecf0", borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#155eef", marginRight: "8px" }}>
                {selectedCr.crId || "CR SPEC"}
              </span>
              <strong style={{ fontSize: "16px", color: "#101828" }}>{selectedCr.title}</strong>
            </div>
            <div>
              {getStatusBadge(selectedCr.status)}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", fontSize: "13.5px" }}>
            <div>
              <h4 style={{ margin: "0 0 6px", color: "#667085", fontSize: "12px", textTransform: "uppercase" }}>Justification & Reason</h4>
              <p style={{ margin: 0, color: "#344054", lineHeight: 1.5 }}>{selectedCr.reason}</p>
            </div>
            <div>
              <h4 style={{ margin: "0 0 6px", color: "#667085", fontSize: "12px", textTransform: "uppercase" }}>Original Scope Reference</h4>
              <p style={{ margin: 0, color: "#344054" }}>{selectedCr.originalScopeReference || "Baseline V1"}</p>
            </div>
            <div>
              <h4 style={{ margin: "0 0 6px", color: "#667085", fontSize: "12px", textTransform: "uppercase" }}>Commercial Terms</h4>
              <p style={{ margin: 0, color: "#344054" }}>
                Cost: <strong>₹ {selectedCr.estimatedCost?.toLocaleString()}</strong> · Hours: <strong>{selectedCr.estimatedHours} hrs</strong> · Schedule: <strong>+{selectedCr.timelineImpactDays} days</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "#fff", borderRadius: "12px", maxWidth: "600px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "24px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#101828" }}>Raise Change Request (REQ-007)</h2>
              <button type="button" onClick={() => setShowCreateModal(false)} style={{ border: "none", background: "none", cursor: "pointer", color: "#667085" }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: "10px 14px", background: "#fef3f2", border: "1px solid #fecdca", color: "#b42318", borderRadius: "6px", fontSize: "13px", marginBottom: "16px" }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#344054", marginBottom: "4px" }}>
                  Target Project *
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d0d5dd", fontSize: "14px" }}
                >
                  {projectList.map((p, idx) => (
                    <option key={p._id || p.id || `proj-${idx}`} value={p._id || p.id}>
                      {p.projectCode ? `${p.projectCode} — ${p.projectName}` : p.projectName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#344054", marginBottom: "4px" }}>
                  Change Request Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Add Multi-party Video Consultation Support"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d0d5dd", fontSize: "14px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#344054", marginBottom: "4px" }}>
                  Reason / Business Justification *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this change is necessary and client requirements..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d0d5dd", fontSize: "14px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#344054", marginBottom: "4px" }}>
                    Original Scope Reference
                  </label>
                  <input
                    type="text"
                    value={formData.originalScopeReference}
                    onChange={(e) => setFormData({ ...formData, originalScopeReference: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d0d5dd", fontSize: "14px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#344054", marginBottom: "4px" }}>
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d0d5dd", fontSize: "14px" }}
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#344054", marginBottom: "4px" }}>
                    Effort (Hours)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: Number(e.target.value) })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d0d5dd", fontSize: "14px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#344054", marginBottom: "4px" }}>
                    Estimated Cost (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData({ ...formData, estimatedCost: Number(e.target.value) })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d0d5dd", fontSize: "14px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#344054", marginBottom: "4px" }}>
                    Timeline Impact (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.timelineImpactDays}
                    onChange={(e) => setFormData({ ...formData, timelineImpactDays: Number(e.target.value) })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d0d5dd", fontSize: "14px" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #d0d5dd", background: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", color: "#344054" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#155eef", fontSize: "13px", fontWeight: 600, cursor: "pointer", color: "#fff" }}
                >
                  {submitting ? "Submitting..." : "Submit Change Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
