"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronRight,
  ArrowLeft,
  Edit3,
  Copy,
  Trash2,
  Send,
  CheckCircle2,
  AlertTriangle,
  Bug,
  GitBranch,
  ExternalLink,
  MessageSquare,
  Paperclip,
  RefreshCw,
} from "lucide-react";
import {
  bugApi,
  qaLookupApi,
  BugItem,
  BUG_LIFECYCLE_STATUSES,
  EXTRA_BUG_STATUSES,
  RESOLUTION_CODES,
  formatShortDate,
  formatBugStatus,
  severityBadgeClass,
  statusBadgeClass,
} from "@/lib/qa/api";
import "@/components/qa/qa.css";

const PIPELINE_STEPS = [
  "NEW",
  "TRIAGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "FIXED",
  "READY_FOR_RETEST",
  "RETEST",
  "CLOSED",
] as const;

type DetailTab =
  | "overview"
  | "reproduction"
  | "traceability"
  | "environment"
  | "dev_retest"
  | "attachments"
  | "activity";

export default function BugDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");

  const [bug, setBug] = useState<BugItem | null>(null);
  const [employees, setEmployees] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  // Lifecycle Transition Panel State
  const [nextStatus, setNextStatus] = useState<string>("TRIAGED");
  const [nextAssigneeId, setNextAssigneeId] = useState<string>("");
  const [statusReason, setStatusReason] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [resolutionCode, setResolutionCode] = useState("");
  const [resolution, setResolution] = useState("");
  const [fixedVersion, setFixedVersion] = useState("");
  const [commitPrUrl, setCommitPrUrl] = useState("");
  const [retestBuildVersion, setRetestBuildVersion] = useState("");
  const [retestResult, setRetestResult] = useState<"" | "PASSED" | "FAILED">("");
  const [reopenReason, setReopenReason] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Comments
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const loadBug = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [item, empList] = await Promise.all([
        bugApi.get(id),
        qaLookupApi.employees().catch(() => []),
      ]);
      setBug(item);
      setEmployees(empList);
      setNextStatus(item.status || "NEW");
      setNextAssigneeId(typeof item.assigneeId === "object" ? item.assigneeId?._id || "" : item.assigneeId || "");
      setRootCause(item.rootCause || "");
      setResolutionCode(item.resolutionCode || "");
      setResolution(item.resolution || "");
      setFixedVersion(item.fixedVersion || "");
      setCommitPrUrl(item.commitPrUrl || "");
      setRetestBuildVersion(item.retestBuildVersion || "");
      setRetestResult(item.retestResult || "");
    } catch (e: any) {
      setError(e?.message || "Failed to load bug details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBug();
  }, [id]);

  const handleTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bug) return;
    setUpdatingStatus(true);
    setError(null);
    try {
      const updated = await bugApi.transitionStatus(bug._id, {
        status: nextStatus,
        assigneeId: nextAssigneeId || undefined,
        statusReason: statusReason.trim() || undefined,
        rootCause: rootCause.trim() || undefined,
        resolutionCode: resolutionCode || undefined,
        resolution: resolution.trim() || undefined,
        fixedVersion: fixedVersion.trim() || undefined,
        commitPrUrl: commitPrUrl.trim() || undefined,
        retestBuildVersion: retestBuildVersion.trim() || undefined,
        retestResult: retestResult || undefined,
        reopenReason: nextStatus === "REOPENED" ? reopenReason.trim() || "Failed verification" : undefined,
      });
      setBug(updated);
      setStatusReason("");
      setReopenReason("");
      showToast(`Status updated to ${formatBugStatus(updated.status)}.`);
    } catch (err: any) {
      setError(err?.message || "Failed to update bug status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bug || !commentText.trim()) return;
    setPostingComment(true);
    setError(null);
    try {
      const updated = await bugApi.addComment(bug._id, commentText.trim());
      setBug(updated);
      setCommentText("");
      showToast("Comment added.");
    } catch (err: any) {
      setError(err?.message || "Failed to add comment");
    } finally {
      setPostingComment(false);
    }
  };

  const handleClone = async () => {
    if (!bug) return;
    try {
      const cloned = await bugApi.clone(bug._id);
      router.push(`/qa/bugs/${cloned._id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to clone bug");
    }
  };

  const handleDelete = async () => {
    if (!bug) return;
    if (!window.confirm(`Permanently delete ${bug.bugId}: ${bug.title}?`)) return;
    try {
      await bugApi.remove(bug._id);
      router.push("/qa/bugs");
    } catch (err: any) {
      setError(err?.message || "Failed to delete bug");
    }
  };

  if (loading) {
    return (
      <div className="qa-page">
        <div className="qa-card qa-empty">Loading bug details...</div>
      </div>
    );
  }

  if (!bug) {
    return (
      <div className="qa-page">
        <div className="qa-alert qa-alert-critical">
          <AlertTriangle size={14} /> <span>{error || "Bug not found."}</span>
        </div>
        <Link href="/qa/bugs" className="qa-btn" style={{ width: "fit-content" }}>
          <ArrowLeft size={12} /> Back to Bug Registry
        </Link>
      </div>
    );
  }

  const pipelineIndex = PIPELINE_STEPS.indexOf(bug.status as any);
  const projName =
    typeof bug.projectId === "object" ? bug.projectId?.projectName || bug.projectName : bug.projectName;

  return (
    <div className="qa-page">
      {/* Header */}
      <div>
        <div className="qa-breadcrumb">
          <Link href="/qa">QA &amp; Bug Management</Link>
          <ChevronRight size={12} />
          <Link href="/qa/bugs">Bug Registry</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>{bug.bugId}</span>
        </div>
        <div className="qa-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              <span className="qa-badge qa-badge-blue" style={{ fontSize: 11 }}>{bug.bugId}</span>
              <span className={severityBadgeClass(bug.severity)}>{bug.severity}</span>
              <span className={severityBadgeClass(bug.priority)}>{bug.priority}</span>
              <span className={statusBadgeClass(bug.status)}>{formatBugStatus(bug.status)}</span>
              {Number(bug.reopenCount || 0) > 0 && (
                <span className="qa-badge qa-badge-red">Reopened ×{bug.reopenCount}</span>
              )}
            </div>
            <h1 className="qa-title" style={{ marginTop: 4 }}>{bug.title}</h1>
            <p className="qa-subtitle">
              Project: <strong>{projName || "—"}</strong> · Module: <strong>{bug.module || "General"}</strong>
              {bug.subModule ? ` / ${bug.subModule}` : ""} · Reported by{" "}
              <strong>{bug.reporterName || "QA"}</strong> on {formatShortDate(bug.createdAt)}
            </p>
          </div>
          <div className="qa-actions">
            <Link href="/qa/bugs" className="qa-btn">
              <ArrowLeft size={12} /> Registry
            </Link>
            <button type="button" className="qa-btn" onClick={loadBug}>
              <RefreshCw size={12} />
            </button>
            <Link href={`/qa/bugs/new?edit=${bug._id}`} className="qa-btn">
              <Edit3 size={12} /> Edit
            </Link>
            <button type="button" className="qa-btn" onClick={handleClone}>
              <Copy size={12} /> Clone
            </button>
            <button type="button" className="qa-btn qa-btn-danger" onClick={handleDelete}>
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      </div>

      {error && <div className="qa-alert qa-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="qa-alert qa-alert-healthy"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      {/* 9-State Visual Bug Lifecycle Pipeline (QA-Bug Lifecycle.png) */}
      <div className="qa-card" style={{ padding: "11px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#10204a" }}>Bug Lifecycle Pipeline</span>
          {bug.status === "REOPENED" && (
            <span className="qa-badge qa-badge-red">
              Reopened Loop Active {bug.reopenReason ? `— ${bug.reopenReason}` : ""}
            </span>
          )}
          {(EXTRA_BUG_STATUSES as readonly string[]).includes(bug.status) && (
            <span className="qa-badge qa-badge-amber">
              Terminal / Additional State: {formatBugStatus(bug.status)}
            </span>
          )}
        </div>
        <div className="qa-stepper" style={{ margin: 0 }}>
          {PIPELINE_STEPS.map((st, idx) => {
            const isCurrent = bug.status === st;
            const isDone = pipelineIndex > idx;
            return (
              <button
                key={st}
                type="button"
                className={`qa-step ${isCurrent ? "active" : ""} ${isDone ? "done" : ""}`}
                onClick={() => setNextStatus(st)}
                title={`Prepare transition to ${formatBugStatus(st)}`}
              >
                <span>{idx + 1}</span>
                <b>{formatBugStatus(st)}</b>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content + Right Lifecycle Transition Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 310px", gap: 14, alignItems: "start" }}>
        {/* Left: Detail Tabs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <div className="qa-seg">
            {(
              [
                ["overview", "Overview"],
                ["reproduction", "Reproduction"],
                ["traceability", "Traceability"],
                ["environment", "Environment"],
                ["dev_retest", "Dev & Retest"],
                ["attachments", `Attachments (${bug.attachments?.length || 0})`],
                ["activity", `Activity & Comments (${(bug.comments?.length || 0) + (bug.activityLog?.length || 0)})`],
              ] as [DetailTab, string][]
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                className={`qa-seg-btn ${activeTab === k ? "active" : ""}`}
                onClick={() => setActiveTab(k)}
              >
                {lbl}
              </button>
            ))}
          </div>

          <div className="qa-card">
            {activeTab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <h3 className="qa-card-title" style={{ marginBottom: 6 }}>Description</h3>
                  <p style={{ whiteSpace: "pre-wrap", margin: 0, color: "#334155" }}>
                    {bug.description || "No description provided."}
                  </p>
                </div>

                <div className="qa-grid-3" style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                  <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Bug Type</span><strong>{bug.bugType || "Functional"}</strong></div>
                  <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Assigned Developer</span><strong>{bug.assigneeName || "Unassigned"}</strong></div>
                  <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>QA Owner</span><strong>{bug.qaOwnerName || "—"}</strong></div>
                  <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Target Fix Date</span><strong>{formatShortDate(bug.targetFixDate)}</strong></div>
                  <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Fixed On</span><strong>{formatShortDate(bug.fixedOn)}</strong></div>
                  <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Closed On</span><strong>{formatShortDate(bug.closedOn)}</strong></div>
                </div>

                {(bug.tags || []).length > 0 && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {bug.tags.map((t) => (
                      <span key={t} className="qa-tag-chip">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "reproduction" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                <div>
                  <h3 className="qa-card-title" style={{ marginBottom: 4 }}>Preconditions</h3>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "#334155" }}>{bug.preconditions || "—"}</p>
                </div>
                <div>
                  <h3 className="qa-card-title" style={{ marginBottom: 4 }}>Test Data</h3>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "#334155" }}>{bug.testData || "—"}</p>
                </div>
                <div>
                  <h3 className="qa-card-title" style={{ marginBottom: 4 }}>Steps to Reproduce</h3>
                  <div style={{ background: "#f8fafd", border: "1px solid #e3eaf4", borderRadius: 6, padding: 10, whiteSpace: "pre-wrap" }}>
                    {bug.stepsToReproduce || "No steps documented."}
                  </div>
                </div>
                <div className="qa-grid-2">
                  <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 6, padding: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#047857", marginBottom: 4 }}>EXPECTED RESULT</div>
                    <div style={{ whiteSpace: "pre-wrap", color: "#065f46" }}>{bug.expectedResult || "—"}</div>
                  </div>
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", marginBottom: 4 }}>ACTUAL RESULT</div>
                    <div style={{ whiteSpace: "pre-wrap", color: "#991b1b" }}>{bug.actualResult || "—"}</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "traceability" && (
              <div className="qa-grid-2">
                <div style={{ padding: 10, background: "#f8fafd", borderRadius: 6, border: "1px solid #e3eaf4" }}>
                  <span style={{ fontSize: 10, color: "#64748b", display: "block" }}>Linked Requirement</span>
                  <strong>
                    {typeof bug.requirementId === "object" && bug.requirementId
                      ? `${bug.requirementId.requirementCode || ""} ${bug.requirementId.title || ""}`.trim()
                      : "None"}
                  </strong>
                </div>
                <div style={{ padding: 10, background: "#f8fafd", borderRadius: 6, border: "1px solid #e3eaf4" }}>
                  <span style={{ fontSize: 10, color: "#64748b", display: "block" }}>Linked Sprint</span>
                  <strong>
                    {typeof bug.sprintId === "object" && bug.sprintId
                      ? bug.sprintId.name || bug.sprintId.sprintName
                      : "None"}
                  </strong>
                </div>
                <div style={{ padding: 10, background: "#f8fafd", borderRadius: 6, border: "1px solid #e3eaf4" }}>
                  <span style={{ fontSize: 10, color: "#64748b", display: "block" }}>Linked Task</span>
                  <strong>
                    {typeof bug.taskId === "object" && bug.taskId
                      ? `${bug.taskId.taskCode || ""} ${bug.taskId.title || ""}`.trim()
                      : "None"}
                  </strong>
                </div>
                <div style={{ padding: 10, background: "#f8fafd", borderRadius: 6, border: "1px solid #e3eaf4" }}>
                  <span style={{ fontSize: 10, color: "#64748b", display: "block" }}>Linked Test Case</span>
                  <strong>
                    {typeof bug.testCaseId === "object" && bug.testCaseId
                      ? `${bug.testCaseId.testCaseCode || ""} — ${bug.testCaseId.title || ""}`
                      : "None"}
                  </strong>
                </div>
                <div style={{ padding: 10, background: "#f8fafd", borderRadius: 6, border: "1px solid #e3eaf4" }}>
                  <span style={{ fontSize: 10, color: "#64748b", display: "block" }}>Originating Test Run</span>
                  <strong>
                    {typeof bug.testRunId === "object" && bug.testRunId
                      ? `${bug.testRunId.runCode || ""} — ${bug.testRunId.title || ""}`
                      : "Reported Directly"}
                  </strong>
                </div>
              </div>
            )}

            {activeTab === "environment" && (
              <div className="qa-grid-3">
                <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Environment</span><strong>{bug.environment || "—"}</strong></div>
                <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Found In Version</span><strong>{bug.foundInVersion || "—"}</strong></div>
                <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Build Number</span><strong>{bug.buildVersion || "—"}</strong></div>
                <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Browser / Client</span><strong>{bug.browser || "—"}</strong></div>
                <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Operating System</span><strong>{bug.os || "—"}</strong></div>
                <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Device</span><strong>{bug.device || "—"}</strong></div>
                <div style={{ gridColumn: "1 / -1" }}><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>API / Microservice</span><strong>{bug.apiService || "—"}</strong></div>
              </div>
            )}

            {activeTab === "dev_retest" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="qa-grid-2">
                  <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Resolution Code</span><strong>{bug.resolutionCode || "—"}</strong></div>
                  <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Fixed In Version</span><strong>{bug.fixedVersion || "—"}</strong></div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Commit / PR Link</span>
                    {bug.commitPrUrl ? (
                      <a href={bug.commitPrUrl} target="_blank" rel="noreferrer" style={{ color: "#0755e9", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <GitBranch size={12} /> {bug.commitPrUrl} <ExternalLink size={10} />
                      </a>
                    ) : (
                      <strong>—</strong>
                    )}
                  </div>
                  <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Retest Build &amp; Result</span><strong>{bug.retestBuildVersion || "—"} {bug.retestResult ? `(${bug.retestResult})` : ""}</strong></div>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Root Cause Analysis</span>
                  <p style={{ margin: "3px 0 0", whiteSpace: "pre-wrap" }}>{bug.rootCause || "Not documented yet."}</p>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Resolution Notes</span>
                  <p style={{ margin: "3px 0 0", whiteSpace: "pre-wrap" }}>{bug.resolution || "Not documented yet."}</p>
                </div>
              </div>
            )}

            {activeTab === "attachments" && (
              <div>
                {(bug.attachments || []).length === 0 ? (
                  <div className="qa-empty">No attachments added. Click Edit to attach screenshots or log URLs.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {(bug.attachments || []).map((att, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "#f8fafd", borderRadius: 6, border: "1px solid #e3eaf4" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <Paperclip size={13} color="#0755e9" />
                          <strong>{att.name}</strong>
                        </div>
                        <a href={att.url} target="_blank" rel="noreferrer" className="qa-btn qa-btn-sm">
                          Open <ExternalLink size={11} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <label style={{ fontWeight: 700, fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>
                    <MessageSquare size={12} /> Add Discussion Comment
                  </label>
                  <textarea
                    className="qa-textarea"
                    rows={2}
                    placeholder="Share triage notes, fix verification details, or questions..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button type="submit" className="qa-btn qa-btn-primary qa-btn-sm" disabled={postingComment || !commentText.trim()}>
                      <Send size={11} /> {postingComment ? "Posting..." : "Post Comment"}
                    </button>
                  </div>
                </form>

                {/* Comments List */}
                {(bug.comments || []).length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Comments</div>
                    {[...(bug.comments || [])].reverse().map((c, idx) => (
                      <div key={c._id || idx} style={{ padding: "8px 11px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <strong style={{ color: "#1e3a8a" }}>{c.byName}</strong>
                          <span style={{ fontSize: 10, color: "#64748b" }}>{formatShortDate(c.createdAt)}</span>
                        </div>
                        <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Activity Log */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Audit History</div>
                  {[...(bug.activityLog || [])].reverse().map((a, idx) => (
                    <div key={a._id || idx} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "7px 10px", background: "#f8fafd", border: "1px solid #e3eaf4", borderRadius: 6 }}>
                      <div>
                        <span className="qa-badge qa-badge-slate" style={{ marginRight: 6 }}>{a.action}</span>
                        <strong>{a.byName}</strong>
                        {a.fromStatus && a.toStatus && a.fromStatus !== a.toStatus && (
                          <span> changed status <b>{formatBugStatus(a.fromStatus)}</b> → <b>{formatBugStatus(a.toStatus)}</b></span>
                        )}
                        {a.comments && <div style={{ color: "#475569", marginTop: 2 }}>{a.comments}</div>}
                      </div>
                      <span style={{ fontSize: 10, color: "#64748b", whiteSpace: "nowrap" }}>
                        {formatShortDate(a.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sticky Panel: Update Status & Lifecycle Transition */}
        <form onSubmit={handleTransition} className="qa-card" style={{ position: "sticky", top: 14, display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Bug size={14} color="#0755e9" />
            <h3 className="qa-card-title">Update Lifecycle Status</h3>
          </div>

          <div className="qa-field">
            <label>Next Status *</label>
            <select className="qa-select" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
              <optgroup label="Primary Lifecycle">
                {BUG_LIFECYCLE_STATUSES.map((st) => (
                  <option key={st} value={st}>{formatBugStatus(st)}</option>
                ))}
              </optgroup>
              <optgroup label="Additional / Terminal States">
                {EXTRA_BUG_STATUSES.map((st) => (
                  <option key={st} value={st}>{formatBugStatus(st)}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="qa-field">
            <label>Assignee</label>
            <select className="qa-select" value={nextAssigneeId} onChange={(e) => setNextAssigneeId(e.target.value)}>
              <option value="">Unassigned</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>{emp.name}</option>
              ))}
            </select>
          </div>

          {["FIXED", "READY_FOR_RETEST", "CLOSED", ...EXTRA_BUG_STATUSES].includes(nextStatus) && (
            <>
              <div className="qa-field">
                <label>Resolution Code</label>
                <select className="qa-select" value={resolutionCode} onChange={(e) => setResolutionCode(e.target.value)}>
                  <option value="">Select Resolution</option>
                  {RESOLUTION_CODES.map((rc) => (
                    <option key={rc} value={rc}>{rc}</option>
                  ))}
                </select>
              </div>
              <div className="qa-field">
                <label>Fixed In Version</label>
                <input
                  className="qa-input"
                  placeholder="e.g. v2.4.1"
                  value={fixedVersion}
                  onChange={(e) => setFixedVersion(e.target.value)}
                />
              </div>
              <div className="qa-field">
                <label>Commit / PR URL</label>
                <input
                  className="qa-input"
                  placeholder="https://github.com/..."
                  value={commitPrUrl}
                  onChange={(e) => setCommitPrUrl(e.target.value)}
                />
              </div>
              <div className="qa-field">
                <label>Root Cause</label>
                <textarea
                  className="qa-textarea"
                  rows={2}
                  placeholder="Brief root cause..."
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                />
              </div>
            </>
          )}

          {["RETEST", "CLOSED", "REOPENED"].includes(nextStatus) && (
            <>
              <div className="qa-field">
                <label>Retest Build Version</label>
                <input
                  className="qa-input"
                  placeholder="e.g. v2.4.1-rc2"
                  value={retestBuildVersion}
                  onChange={(e) => setRetestBuildVersion(e.target.value)}
                />
              </div>
              <div className="qa-field">
                <label>Retest Outcome</label>
                <select className="qa-select" value={retestResult} onChange={(e) => setRetestResult(e.target.value as any)}>
                  <option value="">—</option>
                  <option value="PASSED">Passed</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
            </>
          )}

          {nextStatus === "REOPENED" && (
            <div className="qa-field">
              <label>Reopen Reason *</label>
              <textarea
                className="qa-textarea"
                rows={2}
                placeholder="Why is this bug being reopened?"
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
              />
            </div>
          )}

          <div className="qa-field">
            <label>Transition Note</label>
            <textarea
              className="qa-textarea"
              rows={2}
              placeholder="Optional note logged in audit trail..."
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
            />
          </div>

          <button type="submit" className="qa-btn qa-btn-primary" style={{ width: "100%", height: 33 }} disabled={updatingStatus}>
            <CheckCircle2 size={13} /> {updatingStatus ? "Updating..." : `Apply: ${formatBugStatus(nextStatus)}`}
          </button>
        </form>
      </div>
    </div>
  );
}
