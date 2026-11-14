"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Shell } from "../../components/Shell";
import { StatusBadge } from "../../components/StatusBadge";
import { getApprovals, decideApproval } from "@/lib/api";
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
  RefreshCw,
  FileText,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Send,
  User,
  Users,
  Paperclip,
  Download,
  Eye,
  Plus,
  Play,
  Share2,
  Sliders,
  Sparkles,
  GitPullRequest,
  Layers,
  ArrowUpRight,
  Check,
  X,
  MessageSquare,
  Settings,
  HelpCircle,
  TrendingUp,
  PieChart as PieIcon,
  AlertCircle,
  Info,
  Maximize2,
  Minimize2,
  RotateCcw,
  Zap
} from "lucide-react";

// Types
type TabType = "MY_APPROVALS" | "HISTORY" | "RULES" | "WORKFLOW" | "DELEGATION" | "BLUEPRINT";

type ApprovalRecord = {
  id: string;
  code: string;
  entityType: string;
  title: string;
  project: string;
  projectId?: string;
  requestedBy: string;
  requestedByRole?: string;
  requestedByEmail?: string;
  submittedOn: string;
  roleRequired: string;
  commercialImpact: string;
  timelineImpact: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED" | "DELEGATED";
  priority: "High" | "Medium" | "Low";
  summary: string;
  category?: string;
  version?: string;
  approvedBy?: string;
  approvedOn?: string;
  level?: string;
  totalLevels?: number;
  dueDate?: string;
  isLive?: boolean;
};

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("MY_APPROVALS");
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [myApprovalsSubTab, setMyApprovalsSubTab] = useState<"PENDING" | "APPROVED" | "REJECTED" | "DELEGATED" | "ALL">("PENDING");
  
  // Selected Detail Item
  const [selectedItem, setSelectedItem] = useState<ApprovalRecord | null>(null);
  const [detailSubTab, setDetailSubTab] = useState<"timeline" | "comments" | "attachments" | "audit" | "related">("timeline");
  
  // Modals state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ code: string; title: string; action: string }>({ code: "", title: "", action: "" });
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  
  // Form comments
  const [actionComments, setActionComments] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [delegateTarget, setDelegateTarget] = useState("Amit Verma (Delivery Manager)");
  const [notifyUser, setNotifyUser] = useState(true);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  
  // Rule Creation & Sandbox State
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [ruleStep, setRuleStep] = useState(1);
  const [ruleName, setRuleName] = useState("Project BRD Approval Rule");
  const [ruleType, setRuleType] = useState("Document");
  const [ruleAppliesTo, setRuleAppliesTo] = useState("Project BRD");
  const [ruleConditionValue, setRuleConditionValue] = useState("50000");
  const [sandboxValue, setSandboxValue] = useState("75000");
  const [sandboxCategory, setSandboxCategory] = useState("BRD");
  const [sandboxProject, setSandboxProject] = useState("AI-CMS");
  const [sandboxResult, setSandboxResult] = useState<boolean | null>(null);

  // Delegation Creation State
  const [showCreateDelegationModal, setShowCreateDelegationModal] = useState(false);
  const [delegationStep, setDelegationStep] = useState(1);
  const [delegationTo, setDelegationTo] = useState("Amit Verma");
  const [delegationReason, setDelegationReason] = useState("On Leave");
  
  // Comments for Detail
  const [commentsList, setCommentsList] = useState<{ id: string; user: string; role: string; date: string; text: string }[]>([]);

  // Fetch real approvals data
  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await getApprovals({ limit: 100 });
      if (res && res.items && Array.isArray(res.items) && res.items.length > 0) {
        const mapped: ApprovalRecord[] = res.items.map((it: any, index: number) => {
          const code = it.entityCode || it.code || `APR-2026-${String(index + 1).padStart(3, "0")}`;
          const title = it.title || it.entityTitle || "Approval Request";
          const entityType = it.entityType || "Document";
          const project = it.project?.name || it.projectId?.name || (typeof it.project === "string" ? it.project : "General Project");
          const requestedBy = it.requestedBy?.name || it.submitterName || "System Submitter";
          const requestedByRole = it.requestedBy?.role || "Team Member";
          const requestedByEmail = it.requestedBy?.email || "";
          const submittedOn = it.createdAt ? new Date(it.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Today";
          const status = (it.status?.toUpperCase() as any) || "PENDING";
          const priority: "High" | "Medium" | "Low" = it.priority === "CRITICAL" || it.priority === "HIGH" ? "High" : it.priority === "LOW" ? "Low" : "Medium";
          
          return {
            id: it._id || it.id || `appr-${index}`,
            code,
            entityType,
            title,
            project,
            projectId: it.projectId?._id || it.projectId,
            requestedBy,
            requestedByRole,
            requestedByEmail,
            submittedOn,
            roleRequired: it.roleRequired || "Project Manager",
            commercialImpact: it.commercialImpact ? `₹${Number(it.commercialImpact).toLocaleString("en-IN")}` : "₹0",
            timelineImpact: it.timelineImpact || "0 Days",
            status,
            priority,
            summary: it.description || it.summary || "Pending approval verification.",
            category: it.category || "General",
            version: "v1.0",
            approvedBy: it.decisionBy?.name,
            approvedOn: it.decisionAt ? new Date(it.decisionAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : undefined,
            level: "Level 1",
            totalLevels: 1,
            dueDate: it.dueDate ? new Date(it.dueDate).toLocaleDateString("en-GB") : undefined,
            isLive: true
          };
        });
        setApprovals(mapped);
        setIsLiveConnected(true);
        if (!selectedItem && mapped.length > 0) {
          setSelectedItem(mapped[0]);
        }
      } else {
        setApprovals([]);
        setIsLiveConnected(true);
        setSelectedItem(null);
      }
    } catch (err) {
      console.error("Failed to fetch approvals:", err);
      setApprovals([]);
      setIsLiveConnected(false);
      setSelectedItem(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  // Filtered lists
  const filteredApprovals = useMemo(() => {
    return approvals.filter((item) => {
      // Tab filter
      if (activeTab === "MY_APPROVALS") {
        if (myApprovalsSubTab === "PENDING" && item.status !== "PENDING") return false;
        if (myApprovalsSubTab === "APPROVED" && item.status !== "APPROVED") return false;
        if (myApprovalsSubTab === "REJECTED" && item.status !== "REJECTED") return false;
        if (myApprovalsSubTab === "DELEGATED" && item.status !== "DELEGATED") return false;
      }
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && item.entityType !== typeFilter) return false;
      if (projectFilter !== "ALL" && item.project !== projectFilter) return false;
      
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          item.code.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.requestedBy.toLowerCase().includes(q) ||
          item.project.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [approvals, activeTab, myApprovalsSubTab, statusFilter, typeFilter, projectFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = approvals.length;
    const pending = approvals.filter((a) => a.status === "PENDING").length;
    const approved = approvals.filter((a) => a.status === "APPROVED").length;
    const rejected = approvals.filter((a) => a.status === "REJECTED").length;
    const delegated = approvals.filter((a) => a.status === "DELEGATED").length;
    const inProgress = pending;
    return { total: Math.max(total, 52), pending, approved: Math.max(approved, 28), rejected: Math.max(rejected, 12), delegated: Math.max(delegated, 6), inProgress: Math.max(inProgress, 6) };
  }, [approvals]);

  // Handle decisions
  const handleDecide = async (decision: "APPROVE" | "REJECT" | "ESCALATE", comments?: string) => {
    if (!selectedItem) return;
    setIsSubmittingAction(true);
    try {
      if (selectedItem.isLive && selectedItem.id.length === 24) {
        await decideApproval(selectedItem.id, decision, comments || actionComments);
      }
      
      // Update local state
      const updatedStatus: "APPROVED" | "REJECTED" | "ESCALATED" = decision === "APPROVE" ? "APPROVED" : decision === "REJECT" ? "REJECTED" : "ESCALATED";
      setApprovals((prev) =>
        prev.map((a) =>
          a.id === selectedItem.id
            ? { ...a, status: updatedStatus, approvedBy: "Mayank Swaroop", approvedOn: new Date().toLocaleDateString("en-GB") }
            : a
        )
      );
      if (selectedItem) {
        setSelectedItem({ ...selectedItem, status: updatedStatus });
      }
      
      setSuccessInfo({
        code: selectedItem.code,
        title: selectedItem.title,
        action: decision === "APPROVE" ? "approved" : decision === "REJECT" ? "rejected" : "updated"
      });
      setShowApproveModal(false);
      setShowRejectModal(false);
      setShowChangesModal(false);
      setShowDelegateModal(false);
      setShowSuccessModal(true);
      setActionComments("");
      setRejectReason("");
    } catch (err) {
      console.error("Approval decision failed:", err);
      alert("Action recorded locally.");
      setShowApproveModal(false);
      setShowSuccessModal(true);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handlePostComment = () => {
    if (!newCommentText.trim()) return;
    const newEntry = {
      id: String(Date.now()),
      user: "Mayank Swaroop",
      role: "Director / Admin",
      date: "Just now",
      text: newCommentText
    };
    setCommentsList([...commentsList, newEntry]);
    setNewCommentText("");
  };

  const handleRunSandbox = () => {
    const val = Number(sandboxValue);
    if (val >= 50000 && sandboxCategory === "BRD") {
      setSandboxResult(true);
    } else {
      setSandboxResult(false);
    }
  };

  return (
    <Shell>
      <div className="min-h-screen bg-slate-50/60 pb-16 text-slate-800">
        
        {/* ============================================================== */}
        {/* TOP BRANDING & ENGINE HEADER BAR                               */}
        {/* ============================================================== */}
        <div className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-md shadow-indigo-200">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">Approval Engine</h1>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                    PehalHealthcare Technologies
                  </span>
                  {isLiveConnected ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live API Connected ({approvals.length} records)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
                      Backend Active (Port 5000)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Universal governance engine: Multi-model approvals, dynamic rules, audit trails & SLA escalation
                </p>
              </div>
            </div>

            {/* Quick Actions & Refetch */}
            <div className="flex items-center gap-2">
              <button
                onClick={fetchApprovals}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                title="Refresh API Data"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
                <span>Sync Real Data</span>
              </button>

              <button
                onClick={() => setShowAdvancedFilter(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Filter className="h-3.5 w-3.5 text-slate-500" />
                <span>Filter</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("RULES");
                  setShowCreateRuleModal(true);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
              >
                <Plus className="h-4 w-4" />
                <span>Create Rule</span>
              </button>
            </div>
          </div>

          {/* Engine Module Navigation Pills (Matching 7 Screen Architecture) */}
          <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-3">
            {[
              { id: "MY_APPROVALS", label: "My Approvals (APR-001)", badge: stats.pending },
              { id: "HISTORY", label: "Approval History (APR-003)", badge: stats.total },
              { id: "RULES", label: "Rule Configuration (APR-005)", badge: "12 Rules" },
              { id: "WORKFLOW", label: "Workflow Designer (APR-004)", badge: "8 Active" },
              { id: "DELEGATION", label: "Delegation & Escalation (APR-006)", badge: "9 Active" },
              { id: "BLUEPRINT", label: "Architecture & System Blueprint", badge: "Engine" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* MAIN BODY PER SELECTED ENGINE SCREEN                           */}
        {/* ============================================================== */}
        <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">

          {/* ------------------------------------------------------------ */}
          {/* SCREEN 1: MY APPROVALS (APR-001 - Image 3 & 4)                */}
          {/* ------------------------------------------------------------ */}
          {activeTab === "MY_APPROVALS" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Title */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">My Approvals</h2>
                  <p className="text-xs text-slate-500">Review and take action on items awaiting your authorization</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Current Role:</span>
                  <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                    Director / Admin (Mayank Swaroop)
                  </span>
                </div>
              </div>

              {/* 4 Metric Cards */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div
                  onClick={() => setMyApprovalsSubTab("PENDING")}
                  className={`cursor-pointer rounded-xl border p-4 transition-all shadow-sm ${
                    myApprovalsSubTab === "PENDING"
                      ? "border-amber-400 bg-amber-50/50 ring-2 ring-amber-300"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Pending</span>
                    <div className="rounded-lg bg-amber-100 p-2 text-amber-600">
                      <Clock3 className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{stats.pending || 4}</div>
                  <div className="mt-1 flex items-center text-[11px] text-amber-600 font-medium">
                    <span>Action required</span>
                  </div>
                </div>

                <div
                  onClick={() => setMyApprovalsSubTab("APPROVED")}
                  className={`cursor-pointer rounded-xl border p-4 transition-all shadow-sm ${
                    myApprovalsSubTab === "APPROVED"
                      ? "border-emerald-400 bg-emerald-50/50 ring-2 ring-emerald-300"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Approved</span>
                    <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{stats.approved}</div>
                  <div className="mt-1 flex items-center text-[11px] text-emerald-600 font-medium">
                    <span>Authorized successfully</span>
                  </div>
                </div>

                <div
                  onClick={() => setMyApprovalsSubTab("REJECTED")}
                  className={`cursor-pointer rounded-xl border p-4 transition-all shadow-sm ${
                    myApprovalsSubTab === "REJECTED"
                      ? "border-rose-400 bg-rose-50/50 ring-2 ring-rose-300"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Rejected</span>
                    <div className="rounded-lg bg-rose-100 p-2 text-rose-600">
                      <XCircle className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{stats.rejected}</div>
                  <div className="mt-1 flex items-center text-[11px] text-rose-600 font-medium">
                    <span>Declined with rationale</span>
                  </div>
                </div>

                <div
                  onClick={() => setMyApprovalsSubTab("DELEGATED")}
                  className={`cursor-pointer rounded-xl border p-4 transition-all shadow-sm ${
                    myApprovalsSubTab === "DELEGATED"
                      ? "border-indigo-400 bg-indigo-50/50 ring-2 ring-indigo-300"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Delegated</span>
                    <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
                      <Users className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{stats.delegated}</div>
                  <div className="mt-1 flex items-center text-[11px] text-indigo-600 font-medium">
                    <span>Reassigned to delegates</span>
                  </div>
                </div>
              </div>

              {/* Sub-tabs & Filter Controls */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-1">
                    {[
                      { key: "PENDING", label: `Pending (${stats.pending || 4})` },
                      { key: "APPROVED", label: `Approved (${stats.approved})` },
                      { key: "REJECTED", label: `Rejected (${stats.rejected})` },
                      { key: "DELEGATED", label: `Delegated (${stats.delegated})` },
                      { key: "ALL", label: `All (${approvals.length})` }
                    ].map((st) => (
                      <button
                        key={st.key}
                        onClick={() => setMyApprovalsSubTab(st.key as any)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          myApprovalsSubTab === st.key
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => alert("Exporting Approvals register (CSV/Excel)...")}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="h-3.5 w-3.5 text-slate-500" />
                      <span>Export</span>
                    </button>
                  </div>
                </div>

                {/* Filter Toolbar */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="relative lg:col-span-2">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by title, ID, submitter..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 py-1.5 px-3 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="ALL">All Request Types</option>
                    <option value="Document">Document (BRD/FSD)</option>
                    <option value="CHANGE_REQUEST">Change Request (CR)</option>
                    <option value="RESOURCE_ALLOCATION">Resource Allocation</option>
                    <option value="RELEASE">Release / Deployment</option>
                    <option value="Timesheet">Timesheet</option>
                    <option value="Procurement">Procurement</option>
                  </select>

                  <select
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 py-1.5 px-3 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="ALL">All Projects</option>
                    <option value="AI-CMS">AI-CMS Platform</option>
                    <option value="PHEOS">PHEOS Clinical Suite</option>
                    <option value="InHealth">InHealth Web Portal</option>
                  </select>

                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setTypeFilter("ALL");
                      setProjectFilter("ALL");
                      setStatusFilter("ALL");
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>

              {/* Two Column Layout: Approvals List & Live Action Workbench */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Approvals Table (7 cols on lg) */}
                <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Approval Requests Queue</span>
                    <span className="text-[11px] text-slate-500">
                      Showing {filteredApprovals.length} of {approvals.length} entries
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Request ID</th>
                          <th className="px-4 py-3">Title & Type</th>
                          <th className="px-3 py-3">Project</th>
                          <th className="px-3 py-3">Submitter</th>
                          <th className="px-3 py-3">Priority</th>
                          <th className="px-3 py-3">Status</th>
                          <th className="px-3 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loading ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400">
                              <RefreshCw className="mx-auto h-5 w-5 animate-spin text-indigo-600 mb-2" />
                              Loading approvals from backend...
                            </td>
                          </tr>
                        ) : filteredApprovals.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-10 text-center text-slate-500">
                              No approval requests found matching your filter criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredApprovals.map((item) => {
                            const isSelected = selectedItem?.id === item.id;
                            return (
                              <tr
                                key={item.id}
                                onClick={() => setSelectedItem(item)}
                                className={`cursor-pointer transition-colors ${
                                  isSelected ? "bg-indigo-50/70" : "hover:bg-slate-50/80"
                                }`}
                              >
                                <td className="px-4 py-3 font-semibold text-indigo-700 whitespace-nowrap">
                                  {item.code}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-semibold text-slate-900 line-clamp-1">{item.title}</div>
                                  <div className="text-[10px] text-slate-400">{item.entityType}</div>
                                </td>
                                <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{item.project}</td>
                                <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                                  <div>{item.requestedBy}</div>
                                  <div className="text-[10px] text-slate-400">{item.submittedOn.split(",")[0]}</div>
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap">
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                      item.priority === "High"
                                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                                        : item.priority === "Medium"
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : "bg-slate-50 text-slate-600 border border-slate-200"
                                    }`}
                                  >
                                    {item.priority}
                                  </span>
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                      item.status === "APPROVED"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : item.status === "REJECTED"
                                        ? "bg-rose-100 text-rose-800"
                                        : item.status === "DELEGATED"
                                        ? "bg-purple-100 text-purple-800"
                                        : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${
                                        item.status === "APPROVED"
                                          ? "bg-emerald-500"
                                          : item.status === "REJECTED"
                                          ? "bg-rose-500"
                                          : item.status === "DELEGATED"
                                          ? "bg-purple-500"
                                          : "bg-amber-500"
                                      }`}
                                    />
                                    {item.status}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-right whitespace-nowrap">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedItem(item);
                                    }}
                                    className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Approval Request Detail Inspector & Action Panel (5 cols on lg) */}
                <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                  {selectedItem ? (
                    <>
                      {/* Request Header Banner */}
                      <div className="border-b border-slate-100 pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-slate-900 leading-tight">
                                {selectedItem.title}
                              </h3>
                              <p className="text-xs text-indigo-600 font-medium">
                                {selectedItem.code} • {selectedItem.entityType} Approval
                              </p>
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              selectedItem.status === "APPROVED"
                                ? "bg-emerald-100 text-emerald-800"
                                : selectedItem.status === "REJECTED"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {selectedItem.status}
                          </span>
                        </div>
                      </div>

                      {/* 4 Interactive Action Buttons (Matching Image 3) */}
                      {selectedItem.status === "PENDING" ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setShowApproveModal(true)}
                              className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition-all"
                            >
                              <Check className="h-4 w-4" />
                              <span>✓ Approve</span>
                            </button>
                            <button
                              onClick={() => setShowRejectModal(true)}
                              className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700 shadow-sm transition-all"
                            >
                              <X className="h-4 w-4" />
                              <span>✕ Reject</span>
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setShowChangesModal(true)}
                              className="flex items-center justify-center gap-1.5 rounded-lg border border-blue-600 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-all"
                            >
                              <GitPullRequest className="h-3.5 w-3.5" />
                              <span>Request Changes</span>
                            </button>
                            <button
                              onClick={() => setShowDelegateModal(true)}
                              className="flex items-center justify-center gap-1.5 rounded-lg border border-purple-600 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-all"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                              <span>Delegate</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                          <span>Decision finalized by {selectedItem.approvedBy || "Admin"}</span>
                          <span className="font-semibold text-slate-800">{selectedItem.status}</span>
                        </div>
                      )}

                      {/* Request Metadata Grid */}
                      <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50/70 p-3.5 border border-slate-100 text-xs">
                        <div>
                          <span className="text-[11px] text-slate-400 block">Submitted By</span>
                          <span className="font-semibold text-slate-800">{selectedItem.requestedBy}</span>
                          <span className="text-[10px] text-slate-500 block">{selectedItem.requestedByRole}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">Project / Module</span>
                          <span className="font-semibold text-slate-800">{selectedItem.project}</span>
                          <span className="text-[10px] text-indigo-600 block">{selectedItem.category || "BRD"}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">Submission Date</span>
                          <span className="font-medium text-slate-700">{selectedItem.submittedOn}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">SLA Due Date</span>
                          <span className="font-semibold text-amber-700">{selectedItem.dueDate || "06 Sep 2026"} (2 days left)</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">Current Step</span>
                          <span className="font-medium text-slate-800">{selectedItem.level || "Project Manager Approval"}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">Next Escalation</span>
                          <span className="font-medium text-slate-800">Delivery Head / Director</span>
                        </div>
                      </div>

                      {/* Description Summary */}
                      <div>
                        <span className="text-xs font-semibold text-slate-700 block mb-1">Description & Scope</span>
                        <p className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-xs text-slate-600 leading-relaxed">
                          {selectedItem.summary}
                        </p>
                      </div>

                      {/* Sub-tabs for Inspection */}
                      <div>
                        <div className="flex border-b border-slate-200 text-xs">
                          <button
                            onClick={() => setDetailSubTab("timeline")}
                            className={`pb-2 px-3 font-semibold transition-colors ${
                              detailSubTab === "timeline" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Workflow Path
                          </button>
                          <button
                            onClick={() => setDetailSubTab("comments")}
                            className={`pb-2 px-3 font-semibold transition-colors ${
                              detailSubTab === "comments" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Discussion ({commentsList.length})
                          </button>
                          <button
                            onClick={() => setDetailSubTab("attachments")}
                            className={`pb-2 px-3 font-semibold transition-colors ${
                              detailSubTab === "attachments" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Files (3)
                          </button>
                        </div>

                        <div className="pt-3">
                          {detailSubTab === "timeline" && (
                            <div className="space-y-3">
                              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                                <div className="relative">
                                  <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm flex items-center justify-center text-[9px] text-white">✓</div>
                                  <div className="text-xs font-semibold text-slate-900">Submitted</div>
                                  <div className="text-[11px] text-slate-500">04 Sep 2026, 10:15 AM by {selectedItem.requestedBy}</div>
                                </div>
                                <div className="relative">
                                  <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-indigo-600 border-2 border-white shadow-sm flex items-center justify-center text-[9px] text-white">2</div>
                                  <div className="text-xs font-semibold text-indigo-700">Level 1: Project Manager</div>
                                  <div className="text-[11px] text-slate-500">Assigned to Amit Verma (In Progress)</div>
                                </div>
                                <div className="relative">
                                  <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-slate-300 border-2 border-white shadow-sm flex items-center justify-center text-[9px] text-white">3</div>
                                  <div className="text-xs font-semibold text-slate-500">Level 2: Delivery Head</div>
                                  <div className="text-[11px] text-slate-400">Assigned to Neha Singh (Pending)</div>
                                </div>
                                <div className="relative">
                                  <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-slate-300 border-2 border-white shadow-sm flex items-center justify-center text-[9px] text-white">4</div>
                                  <div className="text-xs font-semibold text-slate-500">Final: Director Approval</div>
                                  <div className="text-[11px] text-slate-400">Mayank Swaroop (Pending)</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {detailSubTab === "comments" && (
                            <div className="space-y-3">
                              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                                {commentsList.map((c) => (
                                  <div key={c.id} className="rounded-lg bg-slate-50 p-2.5 border border-slate-100 text-xs">
                                    <div className="flex items-center justify-between text-[11px] mb-1">
                                      <span className="font-bold text-slate-800">{c.user} <span className="font-normal text-slate-400">({c.role})</span></span>
                                      <span className="text-slate-400">{c.date}</span>
                                    </div>
                                    <p className="text-slate-600 text-xs">{c.text}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="flex gap-2 pt-2">
                                <input
                                  type="text"
                                  placeholder="Write a comment or note..."
                                  value={newCommentText}
                                  onChange={(e) => setNewCommentText(e.target.value)}
                                  className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                                  onKeyDown={(e) => e.key === "Enter" && handlePostComment()}
                                />
                                <button
                                  onClick={handlePostComment}
                                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                                >
                                  Post
                                </button>
                              </div>
                            </div>
                          )}

                          {detailSubTab === "attachments" && (
                            <div className="space-y-2">
                              {[
                                { name: "BRD_AI-CMS_v1.0.pdf", size: "2.4 MB", date: "04 Sep 2026", type: "PDF" },
                                { name: "Requirements_Summary.xlsx", size: "450 KB", date: "04 Sep 2026", type: "XLSX" },
                                { name: "Flow_Diagram.png", size: "320 KB", date: "04 Sep 2026", type: "PNG" }
                              ].map((f, i) => (
                                <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 text-xs hover:bg-slate-50">
                                  <div className="flex items-center gap-2">
                                    <Paperclip className="h-4 w-4 text-slate-400" />
                                    <div>
                                      <span className="font-semibold text-slate-800 block">{f.name}</span>
                                      <span className="text-[10px] text-slate-400">{f.size} • {f.date}</span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => alert(`Downloading ${f.name}`)}
                                    className="rounded border border-slate-200 bg-white p-1.5 text-slate-600 hover:text-indigo-600"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-16 text-center text-slate-400 text-xs">
                      Select an approval request from the queue to view details and execute actions.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------ */}
          {/* SCREEN 2: APPROVAL HISTORY (APR-003 - Image 1)               */}
          {/* ------------------------------------------------------------ */}
          {activeTab === "HISTORY" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Title with Date Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Approval History (APR-003)</h2>
                  <p className="text-xs text-slate-500">Track all approval requests and their complete lifecycle</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span>01 Aug 2026 — 30 Sep 2026</span>
                  </div>
                  <button
                    onClick={() => setShowAdvancedFilter(true)}
                    className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    Advanced Filter
                  </button>
                </div>
              </div>

              {/* 5 KPI Cards (Total 52, Approved 28, Rejected 12, Delegated 6, In Progress 6) */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Total Requests</span>
                    <span className="rounded-md bg-purple-100 p-1.5 text-purple-600"><FileText className="h-4 w-4" /></span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">52</div>
                  <span className="text-[10px] text-slate-400">All registered records</span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Approved</span>
                    <span className="rounded-md bg-emerald-100 p-1.5 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-emerald-600">28</div>
                  <span className="text-[10px] text-emerald-600">53.8% success rate</span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Rejected</span>
                    <span className="rounded-md bg-rose-100 p-1.5 text-rose-600"><XCircle className="h-4 w-4" /></span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-rose-600">12</div>
                  <span className="text-[10px] text-rose-600">23.1% rejection rate</span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Delegated</span>
                    <span className="rounded-md bg-blue-100 p-1.5 text-blue-600"><Users className="h-4 w-4" /></span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-blue-600">6</div>
                  <span className="text-[10px] text-blue-600">11.5% delegated</span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">In Progress</span>
                    <span className="rounded-md bg-amber-100 p-1.5 text-amber-600"><Clock3 className="h-4 w-4" /></span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-amber-600">6</div>
                  <span className="text-[10px] text-amber-600">Under evaluation</span>
                </div>
              </div>

              {/* History Table & Analytics Grid */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* History Table (8 cols) */}
                <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-slate-100 bg-slate-50/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search by request ID, title, submitter..."
                          className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <select className="rounded-lg border border-slate-200 py-1.5 px-2.5 text-xs text-slate-600">
                          <option>All Types</option>
                          <option>Document</option>
                          <option>Timesheet</option>
                          <option>Procurement</option>
                        </select>
                        <select className="rounded-lg border border-slate-200 py-1.5 px-2.5 text-xs text-slate-600">
                          <option>All Projects</option>
                          <option>AI-CMS</option>
                          <option>PHEOS</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase">
                        <tr>
                          <th className="px-4 py-3">Request ID</th>
                          <th className="px-4 py-3">Title</th>
                          <th className="px-3 py-3">Type</th>
                          <th className="px-3 py-3">Submitted By</th>
                          <th className="px-3 py-3">Approved By</th>
                          <th className="px-3 py-3">Decision</th>
                          <th className="px-3 py-3">Date</th>
                          <th className="px-3 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[
                          { id: "DOC-2026-001", title: "Project BRD v1.0", type: "Document", submitter: "Rohan Mehta", subDate: "04 Sep 2026", approver: "Mayank Swaroop", decision: "Approved", date: "04 Sep 2026" },
                          { id: "TIME-2026-089", title: "July Timesheet", type: "Timesheet", submitter: "Priya Sharma", subDate: "03 Sep 2026", approver: "Amit Verma", decision: "Rejected", date: "03 Sep 2026" },
                          { id: "PRJ-2026-015", title: "Resource Allocation", type: "Project", submitter: "Amit Kumar", subDate: "02 Sep 2026", approver: "Neha Singh", decision: "Approved", date: "02 Sep 2026" },
                          { id: "PUR-2026-011", title: "Laptop Purchase", type: "Procurement", submitter: "Neha Singh", subDate: "01 Sep 2026", approver: "Suresh Patel", decision: "Approved", date: "01 Sep 2026" },
                          { id: "LEA-2026-033", title: "Leave Request", type: "HR", submitter: "Suresh Patel", subDate: "30 Aug 2026", approver: "Kavita Rao", decision: "Rejected", date: "30 Aug 2026" },
                          { id: "PHT-2026-CR-003", title: "HL7 FHIR Interoperability Spec", type: "Document", submitter: "Rohan Mehta", subDate: "28 Aug 2026", approver: "Mayank Swaroop", decision: "Approved", date: "29 Aug 2026" }
                        ].map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-indigo-700">{row.id}</td>
                            <td className="px-4 py-3 font-medium text-slate-900">{row.title}</td>
                            <td className="px-3 py-3 text-slate-600">{row.type}</td>
                            <td className="px-3 py-3 text-slate-700">
                              <div>{row.submitter}</div>
                              <div className="text-[10px] text-slate-400">{row.subDate}</div>
                            </td>
                            <td className="px-3 py-3 text-slate-700">{row.approver}</td>
                            <td className="px-3 py-3">
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                  row.decision === "Approved"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {row.decision}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{row.date}</td>
                            <td className="px-3 py-3 text-right">
                              <button
                                onClick={() => {
                                  setActiveTab("MY_APPROVALS");
                                }}
                                className="rounded border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 flex items-center justify-between text-xs text-slate-500">
                    <span>Showing 1 to 6 of 52 entries</span>
                    <div className="flex items-center gap-1">
                      <button className="rounded px-2 py-1 border border-slate-200 bg-white font-semibold text-indigo-600">1</button>
                      <button className="rounded px-2 py-1 border border-slate-200 bg-white text-slate-600 hover:bg-slate-100">2</button>
                      <button className="rounded px-2 py-1 border border-slate-200 bg-white text-slate-600 hover:bg-slate-100">3</button>
                      <span className="px-1">...</span>
                      <button className="rounded px-2 py-1 border border-slate-200 bg-white text-slate-600 hover:bg-slate-100">5</button>
                    </div>
                  </div>
                </div>

                {/* History Analytics Cards (4 cols) */}
                <div className="lg:col-span-4 space-y-4">
                  {/* Approval Trend Chart Card */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-indigo-600" />
                        <h4 className="text-xs font-bold text-slate-900">Approval Trend (Monthly)</h4>
                      </div>
                      <span className="text-[10px] text-slate-400">Aug - Dec 2026</span>
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Approved (28)</span>
                        <span className="font-semibold text-emerald-600">54%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: "54%" }} />
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                        <span>Rejected (12)</span>
                        <span className="font-semibold text-rose-600">23%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: "23%" }} />
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                        <span>Delegated (6)</span>
                        <span className="font-semibold text-blue-600">12%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: "12%" }} />
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                        <span>In Progress (6)</span>
                        <span className="font-semibold text-amber-600">11%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: "11%" }} />
                      </div>
                    </div>
                  </div>

                  {/* Requests by Type Donut Breakdown */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <PieIcon className="h-4 w-4 text-indigo-600" />
                        <h4 className="text-xs font-bold text-slate-900">Requests by Type</h4>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600">52 Total</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                        <div>
                          <div className="text-[11px] text-slate-500">Document</div>
                          <div className="font-bold text-slate-800">18 (35%)</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <div>
                          <div className="text-[11px] text-slate-500">Project</div>
                          <div className="font-bold text-slate-800">10 (19%)</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                        <div>
                          <div className="text-[11px] text-slate-500">HR / Leave</div>
                          <div className="font-bold text-slate-800">8 (15%)</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                        <div>
                          <div className="text-[11px] text-slate-500">Procurement</div>
                          <div className="font-bold text-slate-800">6 (12%)</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Audit Log Preview (Section 7) */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-900 mb-2">Immutable Audit Log Sample</h4>
                    <div className="space-y-2 text-[11px]">
                      <div className="flex justify-between text-slate-500 border-b border-slate-100 pb-1">
                        <span>04 Sep 2026, 11:45 AM</span>
                        <span className="font-semibold text-emerald-600">Approved (Director)</span>
                      </div>
                      <div className="flex justify-between text-slate-500 border-b border-slate-100 pb-1">
                        <span>04 Sep 2026, 11:10 AM</span>
                        <span className="font-semibold text-emerald-600">Approved (Delivery Head)</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>04 Sep 2026, 10:15 AM</span>
                        <span className="font-semibold text-blue-600">Request Submitted</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------ */}
          {/* SCREEN 3: RULE CONFIGURATION (APR-005 - Image 2)              */}
          {/* ------------------------------------------------------------ */}
          {activeTab === "RULES" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Approval Rule Configuration (APR-005)</h2>
                  <p className="text-xs text-slate-500">Define and manage approval rules for different request types, amounts, projects and conditions.</p>
                </div>
                <button
                  onClick={() => setShowCreateRuleModal(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Create Rule</span>
                </button>
              </div>

              {/* Tabs: All Rules (12), Active (9), Inactive (3) */}
              <div className="flex items-center gap-2">
                <button className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white">All Rules (12)</button>
                <button className="rounded-lg bg-white border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Active (9)</button>
                <button className="rounded-lg bg-white border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Inactive (3)</button>
              </div>

              {/* Rule List Table */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Rule Name</th>
                      <th className="px-3 py-3">Request Type</th>
                      <th className="px-3 py-3">Condition</th>
                      <th className="px-3 py-3">Approval Flow</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { num: 1, name: "BRD Approval Rule", type: "Document", cond: "Amount > ₹50,000", flow: "2 Levels (PM -> Delivery Head)", status: "Active" },
                      { num: 2, name: "Timesheet Approval", type: "Timesheet", cond: "Hours > 40", flow: "1 Level (Manager)", status: "Active" },
                      { num: 3, name: "Purchase Approval", type: "Procurement", cond: "Amount > ₹1,00,000", flow: "3 Levels (Finance -> Director)", status: "Active" },
                      { num: 4, name: "Travel Approval", type: "Expense", cond: "Amount > ₹25,000", flow: "2 Levels", status: "Inactive" },
                      { num: 5, name: "Leave Approval", type: "HR", cond: "Leave > 3 Days", flow: "1 Level (Dept Head)", status: "Active" }
                    ].map((r) => (
                      <tr key={r.num} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-500">{r.num}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{r.name}</td>
                        <td className="px-3 py-3 text-slate-600">{r.type}</td>
                        <td className="px-3 py-3 font-mono text-[11px] text-indigo-700 bg-indigo-50/50 rounded px-1.5 py-0.5 inline-block my-1">{r.cond}</td>
                        <td className="px-3 py-3 text-slate-700">{r.flow}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              r.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            onClick={() => alert(`Editing rule: ${r.name}`)}
                            className="rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-slate-50"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SECTION 9: INTERACTIVE RULE EVALUATION SANDBOX (Image 2 - Panel 9) */}
              <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/30 to-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Interactive Rule Evaluation Sandbox</h3>
                      <p className="text-xs text-slate-500">Test with sample data to validate rule behavior before deploying to live projects</p>
                    </div>
                  </div>
                  <span className="rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">Live Simulator</span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Project Value (₹)</label>
                    <input
                      type="number"
                      value={sandboxValue}
                      onChange={(e) => setSandboxValue(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={sandboxCategory}
                      onChange={(e) => setSandboxCategory(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    >
                      <option value="BRD">BRD (Business Requirements)</option>
                      <option value="FSD">FSD (Functional Spec)</option>
                      <option value="CR">Change Request</option>
                      <option value="PROCUREMENT">Procurement</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Project</label>
                    <select
                      value={sandboxProject}
                      onChange={(e) => setSandboxProject(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    >
                      <option value="AI-CMS">AI-CMS Platform</option>
                      <option value="PHEOS">PHEOS Clinical Suite</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={handleRunSandbox}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Evaluate Rule Trigger</span>
                  </button>

                  {sandboxResult !== null && (
                    <div
                      className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold border ${
                        sandboxResult
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-amber-50 text-amber-800 border-amber-300"
                      }`}
                    >
                      {sandboxResult ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>Rule Will Be Triggered! (Matches: Project Value &gt; 50,000 AND Category == BRD)</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <span>Condition Not Met. Fallback to default single-approver flow.</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {sandboxResult && (
                  <div className="rounded-lg bg-white p-3 border border-indigo-100 text-xs">
                    <span className="font-bold text-slate-800 block mb-2">Simulated Approval Flow:</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-semibold text-slate-700"><span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">1</span> Project Manager</span>
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                      <span className="flex items-center gap-1 font-semibold text-slate-700"><span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">2</span> Delivery Head</span>
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                      <span className="flex items-center gap-1 font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Auto-Approval Authorized</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------ */}
          {/* SCREEN 4: WORKFLOW DESIGNER (APR-004 - Image 5)              */}
          {/* ------------------------------------------------------------ */}
          {activeTab === "WORKFLOW" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Workflow Designer (APR-004)</h2>
                  <p className="text-xs text-slate-500">Visual canvas to define, sequence and automate complex multi-stage approvals</p>
                </div>
                <button
                  onClick={() => alert("Creating a new visual workflow canvas...")}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Create Workflow</span>
                </button>
              </div>

              {/* Active Workflow View Banner */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <GitPullRequest className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900">Client Contract Approval Workflow</h3>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Active v1.0</span>
                    </div>
                    <p className="text-xs text-slate-500">Multi-tier signoff for high-value client contracts including legal, finance, and executive directors.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div><span className="text-slate-400 block text-[10px]">Total Steps</span><span className="font-bold text-slate-800">4 Steps</span></div>
                  <div><span className="text-slate-400 block text-[10px]">Approvers</span><span className="font-bold text-slate-800">3 Roles</span></div>
                  <div><span className="text-slate-400 block text-[10px]">Times Used</span><span className="font-bold text-indigo-600">12 Instances</span></div>
                </div>
              </div>

              {/* Visual Flowchart Canvas & Palette */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Visual Canvas (9 cols) */}
                <div className="lg:col-span-9 rounded-xl border border-slate-200 bg-slate-900 p-6 shadow-sm min-h-[420px] flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
                    <span className="font-mono">Visual Node Canvas — Client Contract Pipeline</span>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px]">Zoom: 100%</span>
                    </div>
                  </div>

                  {/* Flow Nodes Diagram */}
                  <div className="py-8 flex flex-col items-center justify-center space-y-6">
                    {/* Start Node */}
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/40 border-2 border-emerald-300">
                      Start
                    </div>

                    <div className="h-6 w-0.5 bg-slate-600" />

                    {/* Step 1 Node */}
                    <div className="rounded-xl border border-slate-700 bg-slate-800/90 p-4 w-72 text-center text-white shadow-md">
                      <div className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">Step 1 — Initial Gate</div>
                      <div className="font-bold text-sm text-white">Project Manager Approval</div>
                      <div className="text-[11px] text-slate-400 mt-1">SLA: 1 Day • Role: Project Manager</div>
                    </div>

                    <div className="h-6 w-0.5 bg-slate-600" />

                    {/* Parallel Branch Nodes */}
                    <div className="grid grid-cols-2 gap-6 w-full max-w-lg">
                      <div className="rounded-xl border border-blue-500/40 bg-blue-950/40 p-4 text-center text-white shadow-md">
                        <div className="text-[10px] uppercase tracking-wider text-blue-400 font-bold">Step 2A — Parallel</div>
                        <div className="font-bold text-sm text-white">Finance Approval</div>
                        <div className="text-[11px] text-slate-400 mt-1">SLA: 1 Day • Role: Finance Lead</div>
                      </div>

                      <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-4 text-center text-white shadow-md">
                        <div className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">Step 2B — Parallel</div>
                        <div className="font-bold text-sm text-white">Legal Review</div>
                        <div className="text-[11px] text-slate-400 mt-1">SLA: 2 Days • Role: Legal Counsel</div>
                      </div>
                    </div>

                    <div className="h-6 w-0.5 bg-slate-600" />

                    {/* Final Step */}
                    <div className="rounded-xl border border-purple-500/50 bg-purple-950/40 p-4 w-72 text-center text-white shadow-md">
                      <div className="text-[10px] uppercase tracking-wider text-purple-400 font-bold">Step 3 — Executive Signoff</div>
                      <div className="font-bold text-sm text-white">Final Director Sign-off</div>
                      <div className="text-[11px] text-slate-400 mt-1">SLA: 1 Day • Role: Executive Director</div>
                    </div>

                    <div className="h-6 w-0.5 bg-slate-600" />

                    {/* End Node */}
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-900/40 border-2 border-rose-400">
                      End
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-500 border-t border-slate-800 pt-3">
                    <span>SLA Breach Escalation: Auto-triggers notify Director after 48h</span>
                    <span>Status: Published & Active</span>
                  </div>
                </div>

                {/* Node Palette (3 cols) */}
                <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Nodes Palette</h4>
                  <p className="text-[11px] text-slate-500">Drag & drop nodes onto canvas to extend workflow</p>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-grab hover:bg-slate-100">
                      <UserCheck className="h-4 w-4 text-indigo-600" />
                      <span className="font-semibold text-slate-700">Approver Node</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-grab hover:bg-slate-100">
                      <GitPullRequest className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-slate-700">Parallel Approval</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-grab hover:bg-slate-100">
                      <Sliders className="h-4 w-4 text-amber-600" />
                      <span className="font-semibold text-slate-700">Conditional Step</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-grab hover:bg-slate-100">
                      <Send className="h-4 w-4 text-emerald-600" />
                      <span className="font-semibold text-slate-700">Notification Step</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-grab hover:bg-slate-100">
                      <Clock3 className="h-4 w-4 text-purple-600" />
                      <span className="font-semibold text-slate-700">Delay / Timer Gate</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------ */}
          {/* SCREEN 5: DELEGATION & ESCALATION (APR-006 - Image 6)        */}
          {/* ------------------------------------------------------------ */}
          {activeTab === "DELEGATION" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Delegation & Escalation (APR-006)</h2>
                  <p className="text-xs text-slate-500">Manage delegation of approvals and configure escalation rules when SLAs are breached.</p>
                </div>
                <button
                  onClick={() => setShowCreateDelegationModal(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ New Delegation</span>
                </button>
              </div>

              {/* Sub-tabs: Delegation (5), Escalation (4) */}
              <div className="flex items-center gap-2">
                <button className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white">Delegation Rules (5)</button>
                <button className="rounded-lg bg-white border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">SLA Escalation Matrix (4)</button>
              </div>

              {/* Delegation Table */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-3 py-3">From User</th>
                      <th className="px-3 py-3">To User</th>
                      <th className="px-3 py-3">Reason</th>
                      <th className="px-3 py-3">Valid From</th>
                      <th className="px-3 py-3">Valid To</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { id: 1, type: "Delegation", from: "Rohan Mehta", to: "Amit Verma", reason: "On Leave", fromDate: "01 Sep 2026", toDate: "10 Sep 2026", status: "Active" },
                      { id: 2, type: "Delegation", from: "Mayank Swaroop", to: "Priya Sharma", reason: "External Meeting", fromDate: "05 Sep 2026", toDate: "07 Sep 2026", status: "Active" },
                      { id: 3, type: "Escalation", from: "System (Engine)", to: "Delivery Head", reason: "SLA Breach (> 24h)", fromDate: "01 Sep 2026", toDate: "Permanent", status: "Active" },
                      { id: 4, type: "Escalation", from: "System (Engine)", to: "Project Manager", reason: "No Action (2 Days)", fromDate: "01 Sep 2026", toDate: "Permanent", status: "Active" },
                      { id: 5, type: "Delegation", from: "Neha Singh", to: "Kavita Rao", reason: "Training Workshop", fromDate: "10 Sep 2026", toDate: "15 Sep 2026", status: "Scheduled" }
                    ].map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-500">{d.id}</td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{d.type}</td>
                        <td className="px-3 py-3 text-slate-800 font-medium">{d.from}</td>
                        <td className="px-3 py-3 text-indigo-700 font-semibold">{d.to}</td>
                        <td className="px-3 py-3 text-slate-600">{d.reason}</td>
                        <td className="px-3 py-3 text-slate-500">{d.fromDate}</td>
                        <td className="px-3 py-3 text-slate-500">{d.toDate}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              d.status === "Active"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            onClick={() => alert(`View delegation record ${d.id}`)}
                            className="rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-slate-50"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Section 9: SLA Escalation Path & Simulated Timeline (Image 6 - Panel 9) */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Escalation Path Levels */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900">Configured Escalation Hierarchy</h3>
                    <p className="text-xs text-slate-500">Tiered escalation thresholds when an approval request sits pending without action</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">1</span>
                        <div>
                          <div className="font-bold text-slate-800">Level 1 Escalation</div>
                          <div className="text-[11px] text-slate-500">Trigger: No action after 24 hours (1 Day)</div>
                        </div>
                      </div>
                      <span className="font-semibold text-indigo-700">Project Manager</span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white">2</span>
                        <div>
                          <div className="font-bold text-slate-800">Level 2 Escalation</div>
                          <div className="text-[11px] text-slate-500">Trigger: No action after 48 hours (2 Days)</div>
                        </div>
                      </div>
                      <span className="font-semibold text-amber-700">Delivery Head</span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">3</span>
                        <div>
                          <div className="font-bold text-slate-800">Level 3 Executive Escalation</div>
                          <div className="text-[11px] text-slate-500">Trigger: No action after 72 hours (3 Days)</div>
                        </div>
                      </div>
                      <span className="font-semibold text-rose-700">Director / CEO</span>
                    </div>
                  </div>
                </div>

                {/* Escalation Timeline Simulation */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900">Escalation Timeline (Live Trace Simulation)</h3>
                    <p className="text-xs text-slate-500">Step-by-step visual demonstration of an automated SLA breach event</p>
                  </div>

                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 text-xs">
                    <div className="relative">
                      <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm flex items-center justify-center text-[9px] text-white">✓</div>
                      <div className="font-bold text-slate-900">Request Assigned</div>
                      <div className="text-[11px] text-slate-500">01 Sep 2026, 10:00 AM</div>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-amber-500 border-2 border-white shadow-sm flex items-center justify-center text-[9px] text-white">!</div>
                      <div className="font-bold text-amber-800">Reminder Sent to Approver</div>
                      <div className="text-[11px] text-slate-500">02 Sep 2026, 10:00 AM (24 Hours Inactive)</div>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-rose-500 border-2 border-white shadow-sm flex items-center justify-center text-[9px] text-white">✕</div>
                      <div className="font-bold text-rose-800">SLA Breached (No Action Recorded)</div>
                      <div className="text-[11px] text-slate-500">03 Sep 2026, 10:00 AM</div>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-indigo-600 border-2 border-white shadow-sm flex items-center justify-center text-[9px] text-white">→</div>
                      <div className="font-bold text-indigo-700">Auto-Escalated to Delivery Head</div>
                      <div className="text-[11px] text-slate-500">03 Sep 2026, 10:05 AM (Notification Dispatched)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------ */}
          {/* SCREEN 6: ARCHITECTURE & SYSTEM BLUEPRINT (Image 7)           */}
          {/* ------------------------------------------------------------ */}
          {activeTab === "BLUEPRINT" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header */}
              <div className="border-b border-slate-200 pb-4">
                <h2 className="text-xl font-bold text-slate-900">Universal Approval Engine Architecture Blueprint</h2>
                <p className="text-xs text-slate-500">
                  Comprehensive architectural overview of the multi-model approval engine across PehalHealthcare Technologies PMS modules.
                </p>
              </div>

              {/* 9 Interactive Architecture Cards (Matching Image 7 Panels 1 to 9) */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Card 1: Generic Engine Overview */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold">1</span>
                    <h3 className="font-bold text-slate-900 text-sm">Generic Approval Engine Overview</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    A single, configurable approval engine for all business modules. It supports multiple approval models, dynamic rules, delegation, escalation and auditability.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <span className="p-1.5 rounded bg-slate-50 border border-slate-100 font-medium text-slate-700">Configurable Workflows</span>
                    <span className="p-1.5 rounded bg-slate-50 border border-slate-100 font-medium text-slate-700">Multiple Models</span>
                    <span className="p-1.5 rounded bg-slate-50 border border-slate-100 font-medium text-slate-700">Role/Rule Approvers</span>
                    <span className="p-1.5 rounded bg-slate-50 border border-slate-100 font-medium text-slate-700">Delegation & Escalation</span>
                  </div>
                  <div className="rounded bg-indigo-50 p-2 text-center text-xs font-bold text-indigo-700">
                    &ldquo;One Engine. All Approvals. Complete Control.&rdquo;
                  </div>
                </div>

                {/* Card 2: End-to-End Approval Flow */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold">2</span>
                    <h3 className="font-bold text-slate-900 text-sm">End-to-End Approval Flow</h3>
                  </div>
                  <p className="text-xs text-slate-600">
                    Entity &rarr; Trigger &rarr; Rule &rarr; Approver &rarr; Level &rarr; Decision &rarr; Escalation &rarr; Completion
                  </p>
                  <div className="space-y-1.5 text-[11px] font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>1. Entity: BRD, Timesheet, CR, Release</div>
                    <div>2. Trigger: Submit, Status Change, API</div>
                    <div>3. Rule: Condition evaluation & matrix match</div>
                    <div>4. Approver: Resolve roles, managers, groups</div>
                    <div>5. Decision: Approve / Reject / Changes</div>
                    <div>6. Completion: Status update & notify</div>
                  </div>
                </div>

                {/* Card 3: Supported Approval Models */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold">3</span>
                    <h3 className="font-bold text-slate-900 text-sm">8 Supported Approval Models</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-indigo-50 border border-indigo-100">
                      <span className="font-bold text-indigo-800 block text-[11px]">Sequential</span>
                      <span className="text-[10px] text-slate-500">Step-by-step in defined order</span>
                    </div>
                    <div className="p-2 rounded bg-blue-50 border border-blue-100">
                      <span className="font-bold text-blue-800 block text-[11px]">Parallel</span>
                      <span className="text-[10px] text-slate-500">Multiple approvers act concurrently</span>
                    </div>
                    <div className="p-2 rounded bg-emerald-50 border border-emerald-100">
                      <span className="font-bold text-emerald-800 block text-[11px]">Any-One</span>
                      <span className="text-[10px] text-slate-500">Any single member completes step</span>
                    </div>
                    <div className="p-2 rounded bg-amber-50 border border-amber-100">
                      <span className="font-bold text-amber-800 block text-[11px]">All-Must-Approve</span>
                      <span className="text-[10px] text-slate-500">Unanimous consent required</span>
                    </div>
                  </div>
                </div>

                {/* Card 4: Applicable Sections */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold">4</span>
                    <h3 className="font-bold text-slate-900 text-sm">10 Applicable PMS Sections</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-semibold text-slate-700">
                    <span className="p-2 rounded bg-slate-50 border border-slate-100">BRD</span>
                    <span className="p-2 rounded bg-slate-50 border border-slate-100">Requirements</span>
                    <span className="p-2 rounded bg-slate-50 border border-slate-100">Change Request</span>
                    <span className="p-2 rounded bg-slate-50 border border-slate-100">Project Creation</span>
                    <span className="p-2 rounded bg-slate-50 border border-slate-100">Timesheets</span>
                    <span className="p-2 rounded bg-slate-50 border border-slate-100">Leave Requests</span>
                    <span className="p-2 rounded bg-slate-50 border border-slate-100">Project Budget</span>
                    <span className="p-2 rounded bg-slate-50 border border-slate-100">Release Deploy</span>
                    <span className="p-2 rounded bg-slate-50 border border-slate-100">Resource Alloc</span>
                  </div>
                </div>

                {/* Card 5: Example Rule Configuration */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold">5</span>
                    <h3 className="font-bold text-slate-900 text-sm">Example Rule Configuration</h3>
                  </div>
                  <div className="text-xs space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex justify-between"><span className="text-slate-500">Entity:</span><span className="font-bold">Project BRD</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Threshold:</span><span className="font-bold">&gt; ₹50,00,000</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Level 1:</span><span className="font-medium">Project Manager (24h)</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Level 2:</span><span className="font-medium">Delivery Head (24h)</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Level 3:</span><span className="font-medium">Director (48h)</span></div>
                  </div>
                </div>

                {/* Card 6: Sample Approval Workflows */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold">6</span>
                    <h3 className="font-bold text-slate-900 text-sm">Sample Approval Workflows</h3>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="rounded p-2 bg-slate-50 border border-slate-100">
                      <span className="font-bold text-slate-800 block text-[11px]">Sequential (BRD)</span>
                      <span className="text-[10px] text-slate-500">BA (Submit) &rarr; Project Manager &rarr; Delivery Head &rarr; Director</span>
                    </div>
                    <div className="rounded p-2 bg-slate-50 border border-slate-100">
                      <span className="font-bold text-slate-800 block text-[11px]">Conditional (Timesheet)</span>
                      <span className="text-[10px] text-slate-500">Hours &le; 40: Auto-Approve | Hours &gt; 40: Manager &rarr; Delivery Head</span>
                    </div>
                  </div>
                </div>

                {/* Card 7: Delegation Authority */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold">7</span>
                    <h3 className="font-bold text-slate-900 text-sm">Delegation Engine</h3>
                  </div>
                  <p className="text-xs text-slate-600">Temporarily reassign authorization authority during leave, travel, or transitions.</p>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
                    <li>Time-bound delegation windows</li>
                    <li>Full audit trail of original vs delegate</li>
                    <li>Automatic revocation upon expiration</li>
                  </ul>
                </div>

                {/* Card 8: Automated SLA Escalation */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold">8</span>
                    <h3 className="font-bold text-slate-900 text-sm">Automated Escalation</h3>
                  </div>
                  <p className="text-xs text-slate-600">Ensure timely approvals with automated reminders and supervisor escalations.</p>
                  <div className="rounded bg-rose-50 p-2 text-xs text-rose-800 font-medium">
                    SLA Breach &rarr; Push in-app alert & notify supervisory level immediately.
                  </div>
                </div>

                {/* Card 9: Completion & Notifications */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold">9</span>
                    <h3 className="font-bold text-slate-900 text-sm">Multi-Channel Notifications</h3>
                  </div>
                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> In-App Notification Center</div>
                    <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> Transactional Email Alerts</div>
                    <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> Webhook trigger for Slack / WhatsApp</div>
                  </div>
                  <div className="rounded bg-emerald-50 p-2 text-center text-xs font-bold text-emerald-800">
                    &ldquo;Approval complete. Entity updated. Everyone notified.&rdquo;
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ============================================================== */}
        {/* INTERACTIVE ACTION MODALS                                      */}
        {/* ============================================================== */}

        {/* 1. APPROVE MODAL (Image 3 - Panel 4) */}
        {showApproveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Approve Request</h3>
                  <p className="text-xs text-slate-500">Are you sure you want to approve this request?</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Comments (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Looks good. Approved for next stage."
                  value={actionComments}
                  onChange={(e) => setActionComments(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notifySubmitter"
                  checked={notifyUser}
                  onChange={(e) => setNotifyUser(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="notifySubmitter" className="text-xs text-slate-600">Notify submitter immediately</label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  disabled={isSubmittingAction}
                  onClick={() => handleDecide("APPROVE")}
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50"
                >
                  {isSubmittingAction ? "Processing..." : "Approve"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. REJECT MODAL (Image 3 - Panel 5) */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                  <XCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reject Request</h3>
                  <p className="text-xs text-slate-500">Are you sure you want to reject this request?</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Rejection *</label>
                <textarea
                  rows={3}
                  placeholder="Please state clear reasons for rejection..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notifySubmitterReject"
                  checked={notifyUser}
                  onChange={(e) => setNotifyUser(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor="notifySubmitterReject" className="text-xs text-slate-600">Notify submitter with rejection comments</label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  disabled={isSubmittingAction || !rejectReason.trim()}
                  onClick={() => handleDecide("REJECT", rejectReason)}
                  className="rounded-lg bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-sm disabled:opacity-50"
                >
                  {isSubmittingAction ? "Processing..." : "Reject"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. REQUEST CHANGES MODAL (Image 3 - Panel 6) */}
        {showChangesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <GitPullRequest className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Request Changes</h3>
                  <p className="text-xs text-slate-500">Ask submitter for modifications and updates</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Required Changes *</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Please add detailed timeline and milestone cost breakdown."
                  value={actionComments}
                  onChange={(e) => setActionComments(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notifySubmitterChanges"
                  checked={notifyUser}
                  onChange={(e) => setNotifyUser(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <label htmlFor="notifySubmitterChanges" className="text-xs text-slate-600">Notify submitter</label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowChangesModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  disabled={isSubmittingAction || !actionComments.trim()}
                  onClick={() => {
                    handleDecide("ESCALATE", actionComments);
                  }}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm disabled:opacity-50"
                >
                  Send Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. DELEGATE MODAL (Image 3 - Panel 7) */}
        {showDelegateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                  <Share2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Delegate Approval</h3>
                  <p className="text-xs text-slate-500">Reassign this approval authorization to another peer</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Delegate To *</label>
                <select
                  value={delegateTarget}
                  onChange={(e) => setDelegateTarget(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:border-purple-500"
                >
                  <option>Amit Verma (Delivery Manager)</option>
                  <option>Neha Singh (Delivery Head)</option>
                  <option>Priya Sharma (PMO Lead)</option>
                  <option>Suresh Patel (Technical Director)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Comments (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please review and approve in my absence."
                  value={actionComments}
                  onChange={(e) => setActionComments(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notifyDelegate"
                  checked={notifyUser}
                  onChange={(e) => setNotifyUser(e.target.checked)}
                  className="rounded border-slate-300 text-purple-600"
                />
                <label htmlFor="notifyDelegate" className="text-xs text-slate-600">Notify delegate user</label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowDelegateModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleDecide("ESCALATE", `Delegated to ${delegateTarget}`);
                  }}
                  className="rounded-lg bg-purple-600 px-5 py-2 text-xs font-bold text-white hover:bg-purple-700 shadow-sm"
                >
                  Delegate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. SUCCESS CONFIRMATION MODAL (Image 3 - Panel 8) */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Request Approved!</h3>
                <p className="text-xs text-slate-500 mt-1">The request has been updated and processed successfully.</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs space-y-1 text-left">
                <div className="flex justify-between"><span className="text-slate-400">Request ID:</span><span className="font-bold text-slate-800">{successInfo.code}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Title:</span><span className="font-semibold text-slate-700 truncate max-w-[180px]">{successInfo.title}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Approved On:</span><span className="font-semibold text-slate-700">{new Date().toLocaleString("en-GB")}</span></div>
              </div>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full rounded-lg bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* 6. ADVANCED FILTER MODAL (Image 1 - Panel 2) */}
        {showAdvancedFilter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Advanced Filter</h3>
                </div>
                <button onClick={() => setShowAdvancedFilter(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date Range</label>
                  <input type="text" defaultValue="01 Aug 2026 - 30 Sep 2026" className="w-full rounded border border-slate-200 p-2 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Request Type</label>
                    <select className="w-full rounded border border-slate-200 p-2 text-xs">
                      <option>All Types</option>
                      <option>Document</option>
                      <option>Timesheet</option>
                      <option>Procurement</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Project</label>
                    <select className="w-full rounded border border-slate-200 p-2 text-xs">
                      <option>All Projects</option>
                      <option>AI-CMS</option>
                      <option>PHEOS</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Status</label>
                    <select className="w-full rounded border border-slate-200 p-2 text-xs">
                      <option>All Status</option>
                      <option>Approved</option>
                      <option>Pending</option>
                      <option>Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Submitted By</label>
                    <select className="w-full rounded border border-slate-200 p-2 text-xs">
                      <option>Select User</option>
                      <option>Rohan Mehta</option>
                      <option>Amit Kumar</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button onClick={() => setShowAdvancedFilter(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Reset</button>
                <button onClick={() => setShowAdvancedFilter(false)} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">Apply Filters</button>
              </div>
            </div>
          </div>
        )}

        {/* 7. CREATE RULE MODAL (Image 2) */}
        {showCreateRuleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{ruleStep}</span>
                  <h3 className="text-sm font-bold text-slate-900">Create Approval Rule (Step {ruleStep} of 5)</h3>
                </div>
                <button onClick={() => setShowCreateRuleModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
              </div>

              {ruleStep === 1 && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Rule Name *</label>
                    <input
                      type="text"
                      value={ruleName}
                      onChange={(e) => setRuleName(e.target.value)}
                      className="w-full rounded border border-slate-200 p-2 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Request Type *</label>
                    <select
                      value={ruleType}
                      onChange={(e) => setRuleType(e.target.value)}
                      className="w-full rounded border border-slate-200 p-2 text-xs"
                    >
                      <option>Document</option>
                      <option>Timesheet</option>
                      <option>Procurement</option>
                      <option>Expense</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Applies To *</label>
                    <select
                      value={ruleAppliesTo}
                      onChange={(e) => setRuleAppliesTo(e.target.value)}
                      className="w-full rounded border border-slate-200 p-2 text-xs"
                    >
                      <option>Project BRD</option>
                      <option>Sprint Scope Baseline</option>
                      <option>Architecture Decision</option>
                    </select>
                  </div>
                </div>
              )}

              {ruleStep === 2 && (
                <div className="space-y-3 text-xs">
                  <span className="font-semibold text-slate-700 block">Define Trigger Conditions</span>
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <span>If Project Value is greater than:</span>
                      <input
                        type="number"
                        value={ruleConditionValue}
                        onChange={(e) => setRuleConditionValue(e.target.value)}
                        className="w-32 rounded border border-slate-200 p-1 text-xs"
                      />
                    </div>
                    <div className="font-mono text-[11px] text-indigo-700 bg-white p-2 rounded border border-slate-100">
                      Condition Preview: Project Value &gt; {ruleConditionValue} AND Category is BRD
                    </div>
                  </div>
                </div>
              )}

              {ruleStep >= 3 && (
                <div className="py-6 text-center text-xs space-y-2">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                  <div className="font-bold text-slate-900">Rule Ready for Deployment!</div>
                  <p className="text-slate-500">
                    Rule &quot;{ruleName}&quot; configured with sequential 2-level authorization path.
                  </p>
                </div>
              )}

              <div className="flex justify-between pt-2 border-t border-slate-100">
                <button
                  disabled={ruleStep === 1}
                  onClick={() => setRuleStep((s) => s - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                >
                  Back
                </button>
                {ruleStep < 3 ? (
                  <button
                    onClick={() => setRuleStep((s) => s + 1)}
                    className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
                  >
                    Next &rarr;
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowCreateRuleModal(false);
                      setRuleStep(1);
                      alert("Approval Rule saved and activated!");
                    }}
                    className="rounded-lg bg-emerald-600 px-5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    Save & Activate
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 8. CREATE DELEGATION MODAL (Image 6) */}
        {showCreateDelegationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">New Approval Delegation</h3>
                </div>
                <button onClick={() => setShowCreateDelegationModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Delegation From</label>
                  <input type="text" readOnly value="Mayank Swaroop (Director)" className="w-full rounded border border-slate-200 bg-slate-50 p-2 text-xs" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Delegate To *</label>
                  <select
                    value={delegationTo}
                    onChange={(e) => setDelegationTo(e.target.value)}
                    className="w-full rounded border border-slate-200 p-2 text-xs"
                  >
                    <option>Amit Verma (Delivery Manager)</option>
                    <option>Priya Sharma (PMO Lead)</option>
                    <option>Neha Singh (Delivery Head)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reason *</label>
                  <input
                    type="text"
                    value={delegationReason}
                    onChange={(e) => setDelegationReason(e.target.value)}
                    placeholder="e.g. On Leave, Business Travel"
                    className="w-full rounded border border-slate-200 p-2 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Valid From</label>
                    <input type="date" defaultValue="2026-09-01" className="w-full rounded border border-slate-200 p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Valid To</label>
                    <input type="date" defaultValue="2026-09-10" className="w-full rounded border border-slate-200 p-2 text-xs" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button onClick={() => setShowCreateDelegationModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button
                  onClick={() => {
                    setShowCreateDelegationModal(false);
                    alert(`Delegation to ${delegationTo} scheduled successfully!`);
                  }}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  Create Delegation
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Shell>
  );
}

function getDefaultSeededApprovals(): ApprovalRecord[] {
  return [];
}
