"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  RefreshCw,
  GitPullRequest,
  Check,
  ChevronRight,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Calendar,
  Building2,
  FolderKanban,
  CheckCheck,
  X,
  Layers,
  ArrowRight,
} from "lucide-react";
import { brdApi } from "../../lib/brd/api";
import { changeRequests, updateChangeRequest } from "../../lib/api";

type TabType = "ALL" | "BRD" | "CR" | "APPROVED";

export default function ApprovalCenter() {
  const [brds, setBrds] = useState<any[]>([]);
  const [crs, setCrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Modal / Confirm state for reject
  const [rejectModalItem, setRejectModalItem] = useState<{ id: string; type: "BRD" | "CR"; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadApprovals = useCallback(async () => {
    try {
      setLoading(true);
      const [brdRes, crRes] = await Promise.allSettled([
        brdApi.list({ pageSize: 100 }),
        changeRequests(),
      ]);

      if (brdRes.status === "fulfilled") {
        setBrds(brdRes.value?.items || []);
      }
      if (crRes.status === "fulfilled") {
        const raw = crRes.value;
        const list = Array.isArray(raw) ? raw : raw?.data || raw?.items || [];
        setCrs(list);
      }
    } catch (err: any) {
      console.warn("Failed to load approvals:", err);
      setNotice({
        type: "error",
        message: "Failed to fetch approvals data. Please check connection.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  // BRD Approve action
  const handleApproveBrd = async (id: string, title?: string) => {
    setActionLoadingId(id);
    try {
      await brdApi.update(id, {
        status: "Approved",
        approvalStatus: "Approved",
      } as any);
      setNotice({
        type: "success",
        message: `BRD "${title || id}" approved successfully. Baseline is now signed off.`,
      });
      await loadApprovals();
    } catch (err: any) {
      setNotice({
        type: "error",
        message: `Approval failed: ${err?.message || "Internal server error."}`,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // BRD Reject action
  const handleRejectBrd = async (id: string, reason?: string) => {
    setActionLoadingId(id);
    try {
      await brdApi.update(id, {
        status: "Rejected",
        approvalStatus: "Rejected",
      } as any);
      setNotice({
        type: "info",
        message: `BRD has been rejected / returned for revision.`,
      });
      setRejectModalItem(null);
      setRejectReason("");
      await loadApprovals();
    } catch (err: any) {
      setNotice({
        type: "error",
        message: `Rejection failed: ${err?.message || "Internal server error."}`,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // CR Approve action
  const handleApproveCr = async (id: string, title?: string) => {
    setActionLoadingId(id);
    try {
      await updateChangeRequest(id, { status: "APPROVED" });
      setNotice({
        type: "success",
        message: `Change request "${title || id}" approved. Commercial scope committed.`,
      });
      await loadApprovals();
    } catch (err: any) {
      setNotice({
        type: "error",
        message: `CR approval failed: ${err?.message || "Internal server error."}`,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // CR Reject action
  const handleRejectCr = async (id: string, reason?: string) => {
    setActionLoadingId(id);
    try {
      await updateChangeRequest(id, { status: "REJECTED" });
      setNotice({
        type: "info",
        message: `Change request rejected.`,
      });
      setRejectModalItem(null);
      setRejectReason("");
      await loadApprovals();
    } catch (err: any) {
      setNotice({
        type: "error",
        message: `CR rejection failed: ${err?.message || "Internal server error."}`,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const confirmRejection = async () => {
    if (!rejectModalItem) return;
    if (rejectModalItem.type === "BRD") {
      await handleRejectBrd(rejectModalItem.id, rejectReason);
    } else {
      await handleRejectCr(rejectModalItem.id, rejectReason);
    }
  };

  // Segmenting approvals
  const pendingBrds = useMemo(() => {
    return brds.filter(
      (b) =>
        b.status === "Draft" ||
        b.status === "In Review" ||
        b.status === "Client Review" ||
        b.status === "Pending Approval"
    );
  }, [brds]);

  const approvedBrds = useMemo(() => {
    return brds.filter((b) => b.status === "Approved");
  }, [brds]);

  const pendingCrs = useMemo(() => {
    return crs.filter(
      (c) =>
        c.status === "SUBMITTED" ||
        c.status === "UNDER_EVALUATION" ||
        c.status === "COMMERCIAL_APPROVAL_PENDING"
    );
  }, [crs]);

  const approvedCrs = useMemo(() => {
    return crs.filter(
      (c) => c.status === "APPROVED" || c.status === "IMPLEMENTED"
    );
  }, [crs]);

  // Filtered lists based on search & priority
  const filterItem = (item: any) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.title?.toLowerCase().includes(q) ||
      item.brdCode?.toLowerCase().includes(q) ||
      item.code?.toLowerCase().includes(q) ||
      item.crId?.toLowerCase().includes(q) ||
      item.projectName?.toLowerCase().includes(q) ||
      item.clientName?.toLowerCase().includes(q) ||
      item.projectCode?.toLowerCase().includes(q);

    const matchesPriority =
      priorityFilter === "ALL" ||
      String(item.priority || "").toUpperCase() === priorityFilter;

    return matchesSearch && matchesPriority;
  };

  const displayPendingBrds = useMemo(() => pendingBrds.filter(filterItem), [pendingBrds, searchQuery, priorityFilter]);
  const displayPendingCrs = useMemo(() => pendingCrs.filter(filterItem), [pendingCrs, searchQuery, priorityFilter]);
  const displayApprovedBrds = useMemo(() => approvedBrds.filter(filterItem), [approvedBrds, searchQuery, priorityFilter]);
  const displayApprovedCrs = useMemo(() => approvedCrs.filter(filterItem), [approvedCrs, searchQuery, priorityFilter]);

  const totalPending = pendingBrds.length + pendingCrs.length;
  const totalApproved = approvedBrds.length + approvedCrs.length;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "28px 36px" }}>
      {/* Top Breadcrumb */}
      <nav style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
        <Link href="/brd-requirements/brd-registry" style={{ color: "#475569", textDecoration: "none", fontWeight: 500 }}>
          BRD & Requirements
        </Link>
        <ChevronRight size={14} />
        <span style={{ color: "#0f172a", fontWeight: 600 }}>Approval Center</span>
      </nav>

      {/* Header Banner */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "24px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
              color: "#1d4ed8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #bfdbfe",
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.01em" }}>
                Approval Center
              </h1>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "20px",
                  background: totalPending > 0 ? "#fef3f2" : "#ecfdf5",
                  color: totalPending > 0 ? "#b42318" : "#027a48",
                  border: totalPending > 0 ? "1px solid #fee4e2" : "1px solid #a7f3d0",
                }}
              >
                {totalPending > 0 ? `${totalPending} Action Required` : "All Clear"}
              </span>
            </div>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13.5px" }}>
              Review, audit, and sign off project specification baselines and commercial scope change requests.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={loadApprovals}
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "9px 16px",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#334155",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              transition: "all 0.15s ease",
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <Link
            href="/brd-requirements/brd-registry/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 18px",
              background: "#1d4ed8",
              color: "#ffffff",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 1px 2px rgba(29, 78, 216, 0.2)",
            }}
          >
            Create BRD
          </Link>
        </div>
      </div>

      {/* Alert Notice Banner */}
      {notice && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 18px",
            borderRadius: "10px",
            fontSize: "13.5px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background:
              notice.type === "success"
                ? "#ecfdf5"
                : notice.type === "error"
                ? "#fef2f2"
                : "#eff6ff",
            border:
              notice.type === "success"
                ? "1px solid #a7f3d0"
                : notice.type === "error"
                ? "1px solid #fecaca"
                : "1px solid #bfdbfe",
            color:
              notice.type === "success"
                ? "#065f46"
                : notice.type === "error"
                ? "#991b1b"
                : "#1e40af",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {notice.type === "success" ? (
              <CheckCircle2 size={18} />
            ) : notice.type === "error" ? (
              <AlertCircle size={18} />
            ) : (
              <Clock size={18} />
            )}
            <span>{notice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", padding: "4px" }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Stats Summary Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {/* Card 1: Pending Queue */}
        <div
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            borderLeft: "4px solid #f59e0b",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>Active Approval Queue</span>
            <span style={{ padding: "4px 8px", background: "#fef3c7", color: "#92400e", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>
              Action Req.
            </span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", marginTop: "8px", letterSpacing: "-0.02em" }}>
            {totalPending}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
            {pendingBrds.length} BRDs · {pendingCrs.length} Change Requests
          </div>
        </div>

        {/* Card 2: Pending BRDs */}
        <div
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            borderLeft: "4px solid #3b82f6",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>BRD Baselines Pending</span>
            <FileText size={16} color="#3b82f6" />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#1d4ed8", marginTop: "8px", letterSpacing: "-0.02em" }}>
            {pendingBrds.length}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
            Awaiting client or architect sign-off
          </div>
        </div>

        {/* Card 3: Pending Scope CRs */}
        <div
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            borderLeft: "4px solid #8b5cf6",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>Scope Change Requests</span>
            <GitPullRequest size={16} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#6d28d9", marginTop: "8px", letterSpacing: "-0.02em" }}>
            {pendingCrs.length}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
            Commercial & timeline impact reviews
          </div>
        </div>

        {/* Card 4: Approved Baselines */}
        <div
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            borderLeft: "4px solid #10b981",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>Approved Documents</span>
            <CheckCheck size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#047857", marginTop: "8px", letterSpacing: "-0.02em" }}>
            {totalApproved}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
            {approvedBrds.length} Signed BRDs · {approvedCrs.length} Scope Additions
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
          overflow: "hidden",
        }}
      >
        {/* Navigation Tabs & Search Toolbar */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            background: "#ffffff",
          }}
        >
          {/* Tabs */}
          <div style={{ display: "flex", gap: "6px", background: "#f1f5f9", padding: "4px", borderRadius: "10px" }}>
            {[
              { key: "ALL", label: "All Pending", count: totalPending },
              { key: "BRD", label: "BRD Baselines", count: pendingBrds.length },
              { key: "CR", label: "Change Requests", count: pendingCrs.length },
              { key: "APPROVED", label: "Approved Archive", count: totalApproved },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as TabType)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "7px",
                    border: "none",
                    background: isActive ? "#ffffff" : "transparent",
                    color: isActive ? "#0f172a" : "#64748b",
                    fontWeight: isActive ? 700 : 500,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.label}
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "1px 7px",
                      borderRadius: "12px",
                      background: isActive ? "#eff6ff" : "#e2e8f0",
                      color: isActive ? "#1d4ed8" : "#475569",
                      fontWeight: 600,
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <Search
                size={15}
                color="#94a3b8"
                style={{ position: "absolute", left: "10px", pointerEvents: "none" }}
              />
              <input
                type="text"
                placeholder="Search by code, title, project, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "7px 12px 7px 32px",
                  fontSize: "13px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  color: "#0f172a",
                  width: "280px",
                  outline: "none",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "8px",
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{
                padding: "7px 12px",
                fontSize: "13px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                color: "#334155",
                outline: "none",
                fontWeight: 500,
              }}
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Content Section */}
        <div style={{ padding: "24px" }}>
          {loading ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: "0 auto 12px", color: "#3b82f6" }} />
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>Loading Approval Items...</div>
              <p style={{ fontSize: "13px", color: "#94a3b8", margin: "4px 0 0" }}>Fetching pending BRDs and change requests</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Active Tab: BRDs */}
              {(activeTab === "ALL" || activeTab === "BRD") &&
                displayPendingBrds.map((brd) => {
                  const isProcessing = actionLoadingId === brd.id;
                  return (
                    <div
                      key={`brd-${brd.id || brd.brdCode}`}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        padding: "20px 24px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                        transition: "all 0.2s ease",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: "20px",
                        borderLeft: "4px solid #3b82f6",
                      }}
                    >
                      <div style={{ flex: "1 1 500px", minWidth: 0 }}>
                        {/* Meta Tags Row */}
                        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              letterSpacing: "0.03em",
                            }}
                          >
                            BRD BASELINE
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: "#fef3c7",
                              color: "#92400e",
                            }}
                          >
                            {brd.status || "Draft"}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background:
                                String(brd.priority).toUpperCase() === "HIGH" || String(brd.priority).toUpperCase() === "CRITICAL"
                                  ? "#fef2f2"
                                  : "#f8fafc",
                              color:
                                String(brd.priority).toUpperCase() === "HIGH" || String(brd.priority).toUpperCase() === "CRITICAL"
                                  ? "#b91c1c"
                                  : "#475569",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            {brd.priority || "Normal"} Priority
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: "#f1f5f9",
                              color: "#475569",
                            }}
                          >
                            {brd.version || "v1.0"}
                          </span>
                          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
                            {brd.brdCode || brd.code || "BRD SPEC"}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
                          <Link
                            href={`/brd-requirements/brd-registry/${brd.id}`}
                            style={{ color: "#0f172a", textDecoration: "none", transition: "color 0.15s" }}
                          >
                            {brd.title}
                          </Link>
                        </h3>

                        {/* Project & Client */}
                        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "16px", fontSize: "13px", color: "#475569", marginBottom: "8px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                            <FolderKanban size={14} color="#64748b" />
                            <strong>{brd.projectName || "Project"}</strong>
                            {brd.projectCode && <span style={{ color: "#94a3b8" }}>({brd.projectCode})</span>}
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                            <Building2 size={14} color="#64748b" />
                            Client: <strong>{brd.clientName || "Direct"}</strong>
                          </span>
                        </div>

                        {/* Description / Summary */}
                        {brd.description && (
                          <p style={{ fontSize: "13.5px", color: "#64748b", margin: "0 0 10px", lineHeight: 1.5, maxHeight: "42px", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {brd.description}
                          </p>
                        )}

                        {/* Footnote details */}
                        <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "12px", color: "#94a3b8" }}>
                          <span>Target Release: <strong style={{ color: "#475569" }}>{brd.targetReleaseDate || "Q2 2026"}</strong></span>
                          <span>•</span>
                          <span>Est. Effort: <strong style={{ color: "#475569" }}>{brd.estimatedEffortHours || 160} hrs</strong></span>
                          <span>•</span>
                          <span>Classification: <strong style={{ color: "#475569" }}>{brd.confidentiality || "Confidential"}</strong></span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, marginTop: "4px" }}>
                        <Link
                          href={`/brd-requirements/brd-registry/${brd.id}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "8px 14px",
                            background: "#f1f5f9",
                            color: "#334155",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 600,
                            textDecoration: "none",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          <Eye size={14} /> Inspect
                        </Link>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleApproveBrd(brd.id, brd.title)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "8px 16px",
                            background: "#059669",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: isProcessing ? "not-allowed" : "pointer",
                            boxShadow: "0 1px 2px rgba(5, 150, 105, 0.2)",
                            opacity: isProcessing ? 0.7 : 1,
                          }}
                        >
                          {isProcessing ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          Approve Baseline
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => setRejectModalItem({ id: brd.id, type: "BRD", title: brd.title })}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "8px 13px",
                            background: "#fef2f2",
                            color: "#b91c1c",
                            border: "1px solid #fecaca",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: isProcessing ? "not-allowed" : "pointer",
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}

              {/* Active Tab: CRs */}
              {(activeTab === "ALL" || activeTab === "CR") &&
                displayPendingCrs.map((cr) => {
                  const crId = cr._id || cr.id;
                  const isProcessing = actionLoadingId === crId;
                  return (
                    <div
                      key={`cr-${crId}`}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        padding: "20px 24px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                        transition: "all 0.2s ease",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: "20px",
                        borderLeft: "4px solid #8b5cf6",
                      }}
                    >
                      <div style={{ flex: "1 1 500px", minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: "#f5f3ff",
                              color: "#6d28d9",
                              letterSpacing: "0.03em",
                            }}
                          >
                            CHANGE REQUEST
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: "#fef3c7",
                              color: "#92400e",
                            }}
                          >
                            {cr.status}
                          </span>
                          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
                            {cr.crId || "CR-SPEC"} · Baseline Ref: {cr.originalScopeReference || "Baseline v1.0"}
                          </span>
                        </div>

                        <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
                          {cr.title}
                        </h3>

                        {cr.reason && (
                          <p style={{ fontSize: "13.5px", color: "#64748b", margin: "0 0 10px", lineHeight: 1.5 }}>
                            <strong>Reason:</strong> {cr.reason}
                          </p>
                        )}

                        {/* Commercial & Impact Highlights */}
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "16px",
                            background: "#f8fafc",
                            padding: "8px 14px",
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            fontSize: "12.5px",
                          }}
                        >
                          <span style={{ color: "#334155" }}>
                            Effort: <strong>{cr.estimatedHours || 0} hrs</strong>
                          </span>
                          <span style={{ color: "#94a3b8" }}>|</span>
                          <span style={{ color: "#059669", fontWeight: 700 }}>
                            Commercial Impact: ₹ {(Number(cr.estimatedCost) || 0).toLocaleString()}
                          </span>
                          <span style={{ color: "#94a3b8" }}>|</span>
                          <span style={{ color: "#2563eb" }}>
                            Schedule Impact: <strong>+{cr.timelineImpactDays || 0} days</strong>
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, marginTop: "4px" }}>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleApproveCr(crId, cr.title)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "8px 16px",
                            background: "#059669",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: isProcessing ? "not-allowed" : "pointer",
                            boxShadow: "0 1px 2px rgba(5, 150, 105, 0.2)",
                            opacity: isProcessing ? 0.7 : 1,
                          }}
                        >
                          {isProcessing ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          Approve Scope & Cost
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => setRejectModalItem({ id: crId, type: "CR", title: cr.title })}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "8px 13px",
                            background: "#fef2f2",
                            color: "#b91c1c",
                            border: "1px solid #fecaca",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: isProcessing ? "not-allowed" : "pointer",
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}

              {/* Active Tab: Approved Archive */}
              {activeTab === "APPROVED" && (
                <>
                  {displayApprovedBrds.map((brd) => (
                    <div
                      key={`app-brd-${brd.id}`}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        padding: "18px 22px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "16px",
                        borderLeft: "4px solid #10b981",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 7px", borderRadius: "4px", background: "#ecfdf5", color: "#065f46" }}>
                            SIGNED BASELINE
                          </span>
                          <span style={{ fontSize: "12px", color: "#64748b" }}>
                            {brd.brdCode} · Version {brd.version}
                          </span>
                        </div>
                        <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>
                          <Link href={`/brd-requirements/brd-registry/${brd.id}`} style={{ color: "#0f172a", textDecoration: "none" }}>
                            {brd.title}
                          </Link>
                        </h4>
                        <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                          Project: {brd.projectName} · Client: {brd.clientName}
                        </span>
                      </div>
                      <Link
                        href={`/brd-requirements/brd-registry/${brd.id}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 14px",
                          background: "#f1f5f9",
                          borderRadius: "6px",
                          color: "#334155",
                          fontSize: "12.5px",
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        <Eye size={13} /> View Specification
                      </Link>
                    </div>
                  ))}

                  {displayApprovedCrs.map((cr) => (
                    <div
                      key={`app-cr-${cr._id || cr.id}`}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        padding: "18px 22px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "16px",
                        borderLeft: "4px solid #10b981",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 7px", borderRadius: "4px", background: "#ecfdf5", color: "#065f46" }}>
                            APPROVED CR
                          </span>
                          <span style={{ fontSize: "12px", color: "#64748b" }}>
                            {cr.crId} · ₹ {(Number(cr.estimatedCost) || 0).toLocaleString()}
                          </span>
                        </div>
                        <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>
                          {cr.title}
                        </h4>
                        <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                          Effort: {cr.estimatedHours} hrs · Timeline: +{cr.timelineImpactDays || 0} days
                        </span>
                      </div>
                      <span style={{ fontSize: "12px", color: "#059669", fontWeight: 700 }}>
                        Committed to Deliverables
                      </span>
                    </div>
                  ))}
                </>
              )}

              {/* Empty States */}
              {((activeTab === "ALL" && displayPendingBrds.length === 0 && displayPendingCrs.length === 0) ||
                (activeTab === "BRD" && displayPendingBrds.length === 0) ||
                (activeTab === "CR" && displayPendingCrs.length === 0) ||
                (activeTab === "APPROVED" && displayApprovedBrds.length === 0 && displayApprovedCrs.length === 0)) && (
                <div
                  style={{
                    padding: "56px 24px",
                    textAlign: "center",
                    background: "#f8fafc",
                    borderRadius: "12px",
                    border: "1px dashed #cbd5e1",
                  }}
                >
                  <CheckCircle2 size={44} color="#059669" style={{ margin: "0 auto 14px" }} />
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    {searchQuery ? "No Matching Approval Records" : "All Approvals are Up to Date"}
                  </h3>
                  <p style={{ color: "#64748b", fontSize: "13.5px", margin: "6px auto 16px", maxWidth: "420px" }}>
                    {searchQuery
                      ? `No pending specifications or change requests matched "${searchQuery}".`
                      : "There are currently no BRD baselines or scope change requests awaiting your sign-off."}
                  </p>
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      style={{
                        padding: "7px 16px",
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Clear Search
                    </button>
                  ) : (
                    <Link
                      href="/brd-requirements/brd-registry"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 16px",
                        background: "#1d4ed8",
                        color: "#ffffff",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      Go to BRD Registry <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rejection / Revision Confirmation Modal */}
      {rejectModalItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              padding: "24px",
              maxWidth: "460px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#fef2f2",
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <XCircle size={20} />
              </div>
              <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                Reject & Request Revision
              </h3>
            </div>

            <p style={{ fontSize: "13.5px", color: "#475569", margin: "0 0 16px", lineHeight: 1.5 }}>
              Are you sure you want to reject <strong>{rejectModalItem.title}</strong>? This will return the specification to the author for revisions.
            </p>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Rejection Note / Feedback (Optional):
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Specify the reason or missing criteria..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "13px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  outline: "none",
                  resize: "none",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                style={{
                  padding: "8px 16px",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRejection}
                style={{
                  padding: "8px 18px",
                  background: "#dc2626",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
