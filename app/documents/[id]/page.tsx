"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  ArrowLeft,
  Download,
  Printer,
  Share2,
  Trash2,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Upload,
  History,
  Lock,
  ShieldCheck,
  ExternalLink,
  Copy,
  RotateCcw,
  Plus,
  Eye,
  GitCompare,
} from "lucide-react";
import {
  documentApi,
  docLookupApi,
  DocumentItem,
  DocumentPermissionItem,
  PMS_DOCUMENT_CATEGORIES,
  CONFIDENTIALITY_LEVELS,
  PERMISSION_ROLES,
  formatBytes,
  formatShortDate,
  formatDocStatus,
  docStatusBadgeClass,
  confBadgeClass,
} from "@/lib/documents/api";
import "@/components/documents/documents.css";

type DocTab = "preview" | "details" | "versions" | "permissions" | "activity";

const APPROVAL_STAGES = [
  { key: "DRAFT", label: "Draft" },
  { key: "TECHNICAL_REVIEW", label: "Technical Review" },
  { key: "PROJECT_REVIEW", label: "Project Review" },
  { key: "CLIENT_APPROVAL", label: "Client Approval" },
  { key: "PUBLISHED", label: "Published" },
] as const;

const GROUPS = ["Project Managers", "Development Team", "QA Team", "Leadership Team", "Clients (Read Only)"];

function DocumentDetailInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = String(params?.id || "");
  const initialTab = (searchParams.get("tab") as DocTab) || "preview";

  const verFileRef = useRef<HTMLInputElement | null>(null);

  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [employees, setEmployees] = useState<{ _id: string; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [tab, setTab] = useState<DocTab>(initialTab);

  // Preview state (DOC-003)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewContentType, setPreviewContentType] = useState<string>("");
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  // Edit Details state
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState("BRD");
  const [editConf, setEditConf] = useState("INTERNAL");
  const [savingMeta, setSavingMeta] = useState(false);

  // Approval state
  const [approvalComment, setApprovalComment] = useState("");
  const [approvalBusy, setApprovalBusy] = useState(false);

  // Version Upload & Compare & Restore state (DOC-004)
  const [newVerFile, setNewVerFile] = useState<File | null>(null);
  const [newVerNumber, setNewVerNumber] = useState("");
  const [newVerNotes, setNewVerNotes] = useState("");
  const [newVerText, setNewVerText] = useState("");
  const [uploadingVer, setUploadingVer] = useState(false);
  const [compareLeftId, setCompareLeftId] = useState("");
  const [compareRightId, setCompareRightId] = useState("");
  const [restoreTargetId, setRestoreTargetId] = useState<string | null>(null);
  const [restoreReason, setRestoreReason] = useState("");
  const [restoring, setRestoring] = useState(false);

  // Permissions state (DOC-005)
  const [perms, setPerms] = useState<DocumentPermissionItem[]>([]);
  const [inhMode, setInhMode] = useState<"INHERIT" | "BREAK" | "INHERIT_AND_ADD">("INHERIT");
  const [allowExtShare, setAllowExtShare] = useState(false);
  const [addType, setAddType] = useState<"USER" | "GROUP">("USER");
  const [addUserId, setAddUserId] = useState("");
  const [addGroup, setAddGroup] = useState(GROUPS[0]);
  const [addRole, setAddRole] = useState<"OWNER" | "EDITOR" | "COMMENTER" | "VIEWER">("VIEWER");
  const [viewAsRole, setViewAsRole] = useState<string>("VIEWER");
  const [savingPerms, setSavingPerms] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const hydrate = (d: DocumentItem) => {
    setDoc(d);
    setEditTitle(d.title || "");
    setEditDesc(d.description || "");
    setEditCategory(d.category || "BRD");
    setEditConf(d.confidentiality || "INTERNAL");
    setPerms(d.permissions || []);
    setInhMode(d.inheritanceMode || "INHERIT");
    setAllowExtShare(Boolean(d.allowExternalShare));
    if (d.versions && d.versions.length >= 2) {
      setCompareLeftId(d.versions[d.versions.length - 2]._id);
      setCompareRightId(d.versions[d.versions.length - 1]._id);
    } else if (d.versions && d.versions.length === 1) {
      setCompareLeftId(d.versions[0]._id);
      setCompareRightId(d.versions[0]._id);
    }
  };

  const loadDoc = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [item, emps] = await Promise.all([
        documentApi.get(id),
        docLookupApi.employees().catch(() => []),
      ]);
      hydrate(item);
      setEmployees(emps);

      // Load real inline blob preview if local file exists
      if (item.localFilePath) {
        try {
          const { blob, contentType } = await documentApi.fetchFileBlob(item._id, { inline: true });
          const objUrl = URL.createObjectURL(blob);
          setPreviewUrl((old) => {
            if (old) URL.revokeObjectURL(old);
            return objUrl;
          });
          setPreviewContentType(contentType);
        } catch {
          setPreviewUrl(null);
        }
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoc();
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [id]);

  const handleDownload = async (versionId?: string, fileName?: string) => {
    if (!doc) return;
    try {
      if (doc.fileUrl && !doc.localFilePath) {
        window.open(doc.fileUrl, "_blank", "noopener,noreferrer");
        return;
      }
      const { blob } = await documentApi.fetchFileBlob(doc._id, { inline: false, versionId });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || doc.fileName || `${doc.docCode}.bin`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || "Download failed");
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc) return;
    setSavingMeta(true);
    setError(null);
    try {
      const updated = await documentApi.update(doc._id, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        category: editCategory,
        confidentiality: editConf,
      });
      hydrate(updated);
      showToast("Document metadata updated.");
    } catch (err: any) {
      setError(err?.message || "Failed to update metadata");
    } finally {
      setSavingMeta(false);
    }
  };

  const handleApproval = async (action: string) => {
    if (!doc) return;
    setApprovalBusy(true);
    setError(null);
    try {
      const updated = await documentApi.transitionApproval(doc._id, action, approvalComment.trim());
      hydrate(updated);
      setApprovalComment("");
      showToast(`Approval updated: ${formatDocStatus(updated.status)}`);
    } catch (err: any) {
      setError(err?.message || "Failed to update approval");
    } finally {
      setApprovalBusy(false);
    }
  };

  const handleUploadVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc) return;
    setUploadingVer(true);
    setError(null);
    try {
      const fd = new FormData();
      if (newVerFile) fd.append("file", newVerFile);
      if (newVerNumber.trim()) fd.append("version", newVerNumber.trim());
      fd.append("notes", newVerNotes.trim() || "Uploaded new version");
      if (newVerText.trim()) fd.append("textContent", newVerText);

      const updated = await documentApi.uploadVersion(doc._id, fd);
      hydrate(updated);
      setNewVerFile(null);
      setNewVerNumber("");
      setNewVerNotes("");
      setNewVerText("");
      showToast(`Uploaded ${updated.currentVersion}.`);
      await loadDoc();
    } catch (err: any) {
      setError(err?.message || "Failed to upload new version");
    } finally {
      setUploadingVer(false);
    }
  };

  const handleRestoreVersion = async () => {
    if (!doc || !restoreTargetId || !restoreReason.trim()) {
      setError("Please provide a reason for restoring this version.");
      return;
    }
    setRestoring(true);
    setError(null);
    try {
      const updated = await documentApi.restoreVersion(doc._id, restoreTargetId, restoreReason.trim());
      hydrate(updated);
      setRestoreTargetId(null);
      setRestoreReason("");
      showToast(`Restored version as ${updated.currentVersion}.`);
      await loadDoc();
    } catch (err: any) {
      setError(err?.message || "Failed to restore version");
    } finally {
      setRestoring(false);
    }
  };

  const handleAddPerm = () => {
    if (addType === "USER") {
      const emp = employees.find((e) => e._id === addUserId);
      if (!emp) return;
      if (perms.some((p) => p.principalId === emp._id)) return;
      setPerms((prev) => [
        ...prev,
        {
          principalType: "USER",
          principalId: emp._id,
          name: emp.name,
          email: emp.email,
          role: addRole,
          source: "DIRECT",
          allowDownload: true,
          allowPrint: true,
          allowCopy: true,
          allowShare: addRole === "OWNER" || addRole === "EDITOR",
        },
      ]);
      setAddUserId("");
    } else {
      if (perms.some((p) => p.principalType === "GROUP" && p.name === addGroup)) return;
      setPerms((prev) => [
        ...prev,
        {
          principalType: "GROUP",
          principalId: addGroup,
          name: addGroup,
          role: addRole,
          source: "DIRECT",
          allowDownload: true,
          allowPrint: true,
          allowCopy: true,
          allowShare: false,
        },
      ]);
    }
  };

  const handleSavePermissions = async () => {
    if (!doc) return;
    setSavingPerms(true);
    setError(null);
    try {
      const updated = await documentApi.updatePermissions(doc._id, {
        inheritanceMode: inhMode,
        allowExternalShare: allowExtShare,
        permissions: perms,
      });
      hydrate(updated);
      showToast("Permissions updated successfully.");
    } catch (err: any) {
      setError(err?.message || "Failed to save permissions");
    } finally {
      setSavingPerms(false);
    }
  };

  const handleDelete = async () => {
    if (!doc) return;
    if (!window.confirm(`Archive / delete ${doc.docCode} (${doc.title})?`)) return;
    try {
      await documentApi.remove(doc._id);
      router.push("/documents");
    } catch (err: any) {
      setError(err?.message || "Delete failed");
    }
  };

  if (loading) {
    return <div className="doc-page"><div className="doc-card doc-empty">Loading document workspace...</div></div>;
  }

  if (!doc) {
    return (
      <div className="doc-page">
        <div className="doc-alert doc-alert-err"><AlertTriangle size={14} /> <span>{error || "Document not found."}</span></div>
        <Link href="/documents" className="doc-btn" style={{ width: "fit-content" }}><ArrowLeft size={12} /> Back to Repository</Link>
      </div>
    );
  }

  const isPdf = previewContentType.includes("pdf") || doc.fileExtension === "PDF";
  const isImage = previewContentType.startsWith("image/") || ["PNG", "JPG", "JPEG", "WEBP", "SVG"].includes(doc.fileExtension || "");
  const stageIdx = APPROVAL_STAGES.findIndex((s) => s.key === doc.approvalStage);

  const leftVer = (doc.versions || []).find((v) => v._id === compareLeftId);
  const rightVer = (doc.versions || []).find((v) => v._id === compareRightId);

  const roleSummary = {
    users: perms.filter((p) => p.principalType === "USER").length,
    groups: perms.filter((p) => p.principalType === "GROUP").length,
    owners: perms.filter((p) => p.role === "OWNER").length,
    editors: perms.filter((p) => p.role === "EDITOR").length,
    viewers: perms.filter((p) => p.role === "VIEWER").length,
  };

  const viewAsCapabilities: Record<string, { label: string; ok: boolean }[]> = {
    OWNER: [
      { label: "View & Preview Document", ok: true },
      { label: "Download & Print", ok: true },
      { label: "Edit & Upload New Versions", ok: true },
      { label: "Manage Permissions & Share", ok: true },
      { label: "Delete / Archive Document", ok: true },
    ],
    EDITOR: [
      { label: "View & Preview Document", ok: true },
      { label: "Download & Print", ok: true },
      { label: "Edit & Upload New Versions", ok: true },
      { label: "Manage Permissions & Share", ok: false },
      { label: "Delete / Archive Document", ok: false },
    ],
    COMMENTER: [
      { label: "View & Preview Document", ok: true },
      { label: "Download & Print", ok: true },
      { label: "Edit & Upload New Versions", ok: false },
      { label: "Manage Permissions & Share", ok: false },
      { label: "Delete / Archive Document", ok: false },
    ],
    VIEWER: [
      { label: "View & Preview Document", ok: true },
      { label: "Download & Print", ok: true },
      { label: "Edit & Upload New Versions", ok: false },
      { label: "Manage Permissions & Share", ok: false },
      { label: "Delete / Archive Document", ok: false },
    ],
  };

  return (
    <div className="doc-page">
      {/* Header */}
      <div>
        <div className="doc-breadcrumb">
          <Link href="/documents">Documents</Link>
          <ChevronRight size={12} />
          <span>{doc.folderPath || "/"}</span>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>{doc.docCode}</span>
        </div>
        <div className="doc-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              <span className="doc-badge doc-badge-blue">{doc.docCode}</span>
              <span className="doc-badge doc-badge-purple">{doc.category}</span>
              <span className="doc-badge doc-badge-slate">{doc.currentVersion}</span>
              <span className={docStatusBadgeClass(doc.status)}>{formatDocStatus(doc.status)}</span>
              <span className={confBadgeClass(doc.confidentiality)}>{doc.confidentiality}</span>
            </div>
            <h1 className="doc-title" style={{ marginTop: 4 }}>{doc.title}</h1>
            <p className="doc-subtitle">
              {doc.fileName} ({formatBytes(doc.sizeBytes)}) · Project: <strong>{doc.projectName || "Organization"}</strong> · Uploaded by <strong>{doc.uploadedByName || "User"}</strong> on {formatShortDate(doc.createdAt)}
            </p>
          </div>
          <div className="doc-actions">
            <Link href="/documents" className="doc-btn"><ArrowLeft size={12} /> Repository</Link>
            <button type="button" className="doc-btn" onClick={() => handleDownload()}><Download size={12} /> Download</button>
            <button type="button" className="doc-btn" onClick={() => window.print()}><Printer size={12} /> Print</button>
            <button type="button" className="doc-btn" onClick={() => setTab("permissions")}><Share2 size={12} /> Share</button>
            <button type="button" className="doc-btn" onClick={loadDoc}><RefreshCw size={12} /></button>
            <button type="button" className="doc-btn doc-btn-danger" onClick={handleDelete}><Trash2 size={12} /></button>
          </div>
        </div>
      </div>

      {error && <div className="doc-alert doc-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="doc-alert doc-alert-ok"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      {/* Workspace Tabs */}
      <div className="doc-seg">
        {(
          [
            ["preview", "Document Viewer"],
            ["details", "Details & Approval"],
            ["versions", `Version History (${doc.versions?.length || 1})`],
            ["permissions", `Permissions (${doc.permissions?.length || 0})`],
            ["activity", `Activity Log (${doc.activityLog?.length || 0})`],
          ] as [DocTab, string][]
        ).map(([k, lbl]) => (
          <button key={k} type="button" className={`doc-seg-btn ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>
            {lbl}
          </button>
        ))}
      </div>

      {/* TAB 1: INTEGRATED DOCUMENT VIEWER (DOC-003) */}
      {tab === "preview" && (
        <div className="doc-card">
          <div className="doc-card-head">
            <span style={{ fontWeight: 700 }}>{doc.fileName} — {doc.currentVersion}</span>
            <div className="doc-actions">
              {isImage && (
                <>
                  <button type="button" className="doc-btn doc-btn-sm" onClick={() => setZoom((z) => Math.max(40, z - 20))}><ZoomOut size={12} /></button>
                  <span style={{ fontSize: 10.5, fontWeight: 700 }}>{zoom}%</span>
                  <button type="button" className="doc-btn doc-btn-sm" onClick={() => setZoom((z) => Math.min(200, z + 20))}><ZoomIn size={12} /></button>
                  <button type="button" className="doc-btn doc-btn-sm" onClick={() => setRotation((r) => (r + 90) % 360)}><RotateCw size={12} /></button>
                </>
              )}
              {doc.fileUrl && (
                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="doc-btn doc-btn-primary doc-btn-sm">
                  Open External File <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>

          {previewUrl && isPdf ? (
            <iframe
              src={previewUrl}
              title={doc.title}
              style={{ width: "100%", height: 560, border: "1px solid #e3eaf4", borderRadius: 6 }}
            />
          ) : previewUrl && isImage ? (
            <div style={{ display: "grid", placeItems: "center", minHeight: 380, overflow: "auto", background: "#f8fafd", borderRadius: 6, border: "1px solid #e3eaf4", padding: 16 }}>
              <img
                src={previewUrl}
                alt={doc.title}
                style={{
                  maxWidth: `${zoom}%`,
                  transform: `rotate(${rotation}deg)`,
                  transition: "transform 0.2s",
                  borderRadius: 4,
                }}
              />
            </div>
          ) : doc.textContent ? (
            <pre style={{ background: "#f8fafd", border: "1px solid #e3eaf4", borderRadius: 6, padding: 14, whiteSpace: "pre-wrap", fontFamily: "ui-monospace, monospace", fontSize: 11.5, maxHeight: 460, overflow: "auto", margin: 0 }}>
              {doc.textContent}
            </pre>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px", background: "#f8fafd", border: "1px solid #e3eaf4", borderRadius: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{doc.fileName}</div>
              <p style={{ color: "#64748b", margin: "0 0 14px" }}>
                {doc.fileUrl
                  ? `Hosted externally via ${doc.storageProvider}. Click below to open or download.`
                  : `Format: ${doc.fileExtension || doc.mimeType} (${formatBytes(doc.sizeBytes)}). Download to inspect locally.`}
              </p>
              <button type="button" className="doc-btn doc-btn-primary" onClick={() => handleDownload()}>
                <Download size={13} /> Download {doc.fileName}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: METADATA & 4-STAGE APPROVAL WORKFLOW */}
      {tab === "details" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(300px, 1fr)", gap: 14, alignItems: "start" }}>
          <form onSubmit={handleSaveDetails} className="doc-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h3 className="doc-card-title">Document Properties &amp; Governance</h3>
            <div className="doc-field">
              <label>Title</label>
              <input className="doc-input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="doc-field">
              <label>Description</label>
              <textarea className="doc-textarea" rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
            <div className="doc-grid-2">
              <div className="doc-field">
                <label>Category</label>
                <select className="doc-select" value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                  {PMS_DOCUMENT_CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
                </select>
              </div>
              <div className="doc-field">
                <label>Confidentiality</label>
                <select className="doc-select" value={editConf} onChange={(e) => setEditConf(e.target.value)}>
                  {CONFIDENTIALITY_LEVELS.map((cl) => <option key={cl} value={cl}>{cl}</option>)}
                </select>
              </div>
            </div>
            <div className="doc-grid-3" style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
              <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Folder Path</span><strong>{doc.folderPath || "/"}</strong></div>
              <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Retention</span><strong>{doc.retentionPeriod || "—"}</strong></div>
              <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Storage</span><strong>{doc.storageProvider}</strong></div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="doc-btn doc-btn-primary" disabled={savingMeta}>
                {savingMeta ? "Saving..." : "Save Metadata"}
              </button>
            </div>
          </form>

          {/* Approval Workflow Card */}
          <div className="doc-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={15} color="#0755e9" />
              <h3 className="doc-card-title">Approval Workflow</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {APPROVAL_STAGES.map((st, idx) => {
                const isCur = doc.approvalStage === st.key;
                const isDone = stageIdx > idx || doc.status === "PUBLISHED";
                return (
                  <div
                    key={st.key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 9px",
                      borderRadius: 6,
                      background: isDone ? "#ecfdf5" : isCur ? "#eff6ff" : "#f8fafd",
                      border: `1px solid ${isDone ? "#a7f3d0" : isCur ? "#bfdbfe" : "#e3eaf4"}`,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{idx + 1}. {st.label}</span>
                    <span className={isDone ? "doc-badge doc-badge-green" : isCur ? "doc-badge doc-badge-blue" : "doc-badge doc-badge-slate"}>
                      {isDone ? "Completed" : isCur ? "Active" : "Pending"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="doc-field">
              <label>Review Comment</label>
              <textarea
                className="doc-textarea"
                rows={2}
                placeholder="Optional reviewer note..."
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["DRAFT", "CHANGES_REQUESTED", "REJECTED"].includes(doc.status) && (
                <button type="button" className="doc-btn doc-btn-primary" onClick={() => handleApproval("SUBMIT")} disabled={approvalBusy}>
                  Submit for Review
                </button>
              )}
              {doc.status === "IN_REVIEW" && (
                <>
                  <button type="button" className="doc-btn doc-btn-success" onClick={() => handleApproval("APPROVE")} disabled={approvalBusy}>
                    Approve Stage
                  </button>
                  <button type="button" className="doc-btn" onClick={() => handleApproval("REQUEST_CHANGES")} disabled={approvalBusy}>
                    Request Changes
                  </button>
                  <button type="button" className="doc-btn doc-btn-danger" onClick={() => handleApproval("REJECT")} disabled={approvalBusy}>
                    Reject
                  </button>
                </>
              )}
              {doc.status !== "PUBLISHED" && (
                <button type="button" className="doc-btn doc-btn-success" onClick={() => handleApproval("PUBLISH")} disabled={approvalBusy}>
                  Publish Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VERSION HISTORY + UPLOAD NEW + COMPARE + RESTORE (DOC-004) */}
      {tab === "versions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Upload New Version */}
          <form onSubmit={handleUploadVersion} className="doc-card" style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Upload size={14} color="#0755e9" />
              <h3 className="doc-card-title">Upload New Version (Current: {doc.currentVersion})</h3>
            </div>
            <div className="doc-grid-3">
              <div className="doc-field">
                <label>Version Number (auto-bumps if blank)</label>
                <input className="doc-input" placeholder="e.g. v1.1 or v2.0" value={newVerNumber} onChange={(e) => setNewVerNumber(e.target.value)} />
              </div>
              <div className="doc-field">
                <label>Version Notes *</label>
                <input className="doc-input" placeholder="What changed in this revision?" value={newVerNotes} onChange={(e) => setNewVerNotes(e.target.value)} required />
              </div>
              <div className="doc-field">
                <label>Replacement File (Optional)</label>
                <input ref={verFileRef} type="file" className="doc-input" style={{ paddingTop: 4 }} onChange={(e) => setNewVerFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <div className="doc-field">
              <label>Updated Text Snapshot (Optional — for Side-by-Side Compare)</label>
              <textarea className="doc-textarea" rows={2} placeholder="Paste updated text/summary if comparing text revisions..." value={newVerText} onChange={(e) => setNewVerText(e.target.value)} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="doc-btn doc-btn-primary" disabled={uploadingVer}>
                <History size={12} /> {uploadingVer ? "Uploading..." : "Upload New Version"}
              </button>
            </div>
          </form>

          {/* Restore Reason Box */}
          {restoreTargetId && (
            <div className="doc-alert doc-alert-info" style={{ flexDirection: "column", gap: 8 }}>
              <div style={{ fontWeight: 700 }}>
                Restore Version {(doc.versions || []).find((v) => v._id === restoreTargetId)?.version}
              </div>
              <div style={{ display: "flex", gap: 8, width: "100%", flexWrap: "wrap" }}>
                <input
                  className="doc-input"
                  style={{ flex: 1, minWidth: 240 }}
                  placeholder="Mandatory reason for restore (logged in audit trail)..."
                  value={restoreReason}
                  onChange={(e) => setRestoreReason(e.target.value)}
                />
                <button type="button" className="doc-btn doc-btn-primary" onClick={handleRestoreVersion} disabled={restoring}>
                  <RotateCcw size={12} /> {restoring ? "Restoring..." : "Confirm Restore"}
                </button>
                <button type="button" className="doc-btn" onClick={() => { setRestoreTargetId(null); setRestoreReason(""); }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Versions Table */}
          <div className="doc-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="doc-table-wrap">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>File Name</th>
                    <th>Size</th>
                    <th>Uploaded By</th>
                    <th>Uploaded On</th>
                    <th>Release Notes</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...(doc.versions || [])].reverse().map((v) => {
                    const isCurrent = v.version === doc.currentVersion;
                    return (
                      <tr key={v._id}>
                        <td>
                          <span className={isCurrent ? "doc-badge doc-badge-green" : "doc-badge doc-badge-blue"}>
                            {v.version} {isCurrent ? "(Current)" : ""}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{v.fileName}</td>
                        <td>{formatBytes(v.sizeBytes)}</td>
                        <td>{v.uploadedByName || "—"}</td>
                        <td style={{ color: "#64748b", whiteSpace: "nowrap" }}>{formatShortDate(v.uploadedAt)}</td>
                        <td>{v.notes || "—"}</td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: 5 }}>
                            <button type="button" className="doc-btn doc-btn-sm" onClick={() => handleDownload(v._id, v.fileName)}>
                              <Download size={11} /> Download
                            </button>
                            {!isCurrent && (
                              <button type="button" className="doc-btn doc-btn-sm" onClick={() => setRestoreTargetId(v._id)}>
                                <RotateCcw size={11} /> Restore
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side-by-Side Compare Versions (DOC-004 Panel 6) */}
          {(doc.versions || []).length >= 2 && (
            <div className="doc-card">
              <div className="doc-card-head">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <GitCompare size={14} color="#0755e9" />
                  <h3 className="doc-card-title">Compare Versions Side-by-Side</h3>
                </div>
                <div className="doc-actions">
                  <select className="doc-select" value={compareLeftId} onChange={(e) => setCompareLeftId(e.target.value)}>
                    {(doc.versions || []).map((v) => <option key={v._id} value={v._id}>{v.version}</option>)}
                  </select>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>vs</span>
                  <select className="doc-select" value={compareRightId} onChange={(e) => setCompareRightId(e.target.value)}>
                    {(doc.versions || []).map((v) => <option key={v._id} value={v._id}>{v.version}</option>)}
                  </select>
                </div>
              </div>
              <div className="doc-grid-2">
                {[leftVer, rightVer].map((v, i) => (
                  <div key={i} style={{ background: "#f8fafd", border: "1px solid #e3eaf4", borderRadius: 6, padding: 10 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{v?.version || "—"} · {v?.fileName}</div>
                    <div style={{ fontSize: 10.5, color: "#64748b", marginBottom: 6 }}>
                      {formatBytes(v?.sizeBytes)} · By {v?.uploadedByName} · {formatShortDate(v?.uploadedAt)}
                    </div>
                    <div style={{ marginBottom: 6 }}><strong>Notes:</strong> {v?.notes || "—"}</div>
                    {v?.textSnapshot && (
                      <pre style={{ background: "#ffffff", border: "1px solid #e3eaf4", padding: 8, borderRadius: 4, fontSize: 10.5, whiteSpace: "pre-wrap", margin: 0 }}>
                        {v.textSnapshot}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PERMISSIONS & SHARING (DOC-005) */}
      {tab === "permissions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Access Summary KPIs (DOC-005 Panel 9) */}
          <div className="doc-kpi-grid">
            <div className="doc-kpi"><div className="doc-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><Lock size={15} /></div><div><span className="doc-kpi-label">Users</span><span className="doc-kpi-val">{roleSummary.users}</span></div></div>
            <div className="doc-kpi"><div className="doc-kpi-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}><Lock size={15} /></div><div><span className="doc-kpi-label">Groups</span><span className="doc-kpi-val">{roleSummary.groups}</span></div></div>
            <div className="doc-kpi"><div className="doc-kpi-icon" style={{ background: "#fffbeb", color: "#d97706" }}><ShieldCheck size={15} /></div><div><span className="doc-kpi-label">Owners</span><span className="doc-kpi-val">{roleSummary.owners}</span></div></div>
            <div className="doc-kpi"><div className="doc-kpi-icon" style={{ background: "#ecfdf5", color: "#047857" }}><ShieldCheck size={15} /></div><div><span className="doc-kpi-label">Editors</span><span className="doc-kpi-val">{roleSummary.editors}</span></div></div>
            <div className="doc-kpi"><div className="doc-kpi-icon" style={{ background: "#f1f5f9", color: "#475569" }}><Eye size={15} /></div><div><span className="doc-kpi-label">Viewers</span><span className="doc-kpi-val">{roleSummary.viewers}</span></div></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) 290px", gap: 12, alignItems: "start" }}>
            <div className="doc-card" style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <div className="doc-card-head">
                <h3 className="doc-card-title">Users &amp; Groups Access Control</h3>
                <button type="button" className="doc-btn doc-btn-primary doc-btn-sm" onClick={handleSavePermissions} disabled={savingPerms}>
                  {savingPerms ? "Saving..." : "Save Permissions"}
                </button>
              </div>

              {/* Add Principal */}
              <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 120px auto", gap: 6 }}>
                <select className="doc-select" value={addType} onChange={(e) => setAddType(e.target.value as any)}>
                  <option value="USER">User</option>
                  <option value="GROUP">Group</option>
                </select>
                {addType === "USER" ? (
                  <select className="doc-select" value={addUserId} onChange={(e) => setAddUserId(e.target.value)}>
                    <option value="">Select Member</option>
                    {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
                  </select>
                ) : (
                  <select className="doc-select" value={addGroup} onChange={(e) => setAddGroup(e.target.value)}>
                    {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                )}
                <select className="doc-select" value={addRole} onChange={(e) => setAddRole(e.target.value as any)}>
                  {PERMISSION_ROLES.filter((r) => r !== "NO_ACCESS").map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <button type="button" className="doc-btn" onClick={handleAddPerm}><Plus size={12} /> Add</button>
              </div>

              {/* Permissions Table */}
              <div className="doc-table-wrap">
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>Principal</th>
                      <th>Type</th>
                      <th>Access Level</th>
                      <th>Download / Print</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {perms.map((p, idx) => (
                      <tr key={idx}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          {p.email && <div style={{ fontSize: 10, color: "#64748b" }}>{p.email}</div>}
                        </td>
                        <td><span className="doc-badge doc-badge-slate">{p.principalType}</span></td>
                        <td>
                          <select
                            className="doc-select"
                            style={{ height: 25, fontSize: 10.5 }}
                            value={p.role}
                            onChange={(e) =>
                              setPerms((prev) =>
                                prev.map((x, i) => (i === idx ? { ...x, role: e.target.value as any } : x))
                              )
                            }
                          >
                            {PERMISSION_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td>
                          <label style={{ marginRight: 8, fontSize: 10.5 }}>
                            <input
                              type="checkbox"
                              checked={p.allowDownload}
                              onChange={(e) =>
                                setPerms((prev) =>
                                  prev.map((x, i) => (i === idx ? { ...x, allowDownload: e.target.checked } : x))
                                )
                              }
                            />{" "}
                            DL
                          </label>
                          <label style={{ fontSize: 10.5 }}>
                            <input
                              type="checkbox"
                              checked={p.allowPrint}
                              onChange={(e) =>
                                setPerms((prev) =>
                                  prev.map((x, i) => (i === idx ? { ...x, allowPrint: e.target.checked } : x))
                                )
                              }
                            />{" "}
                            Print
                          </label>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="doc-btn doc-btn-danger doc-btn-sm"
                            onClick={() => setPerms((prev) => prev.filter((_, i) => i !== idx))}
                          >
                            <Trash2 size={11} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Inheritance & External Share */}
              <div className="doc-grid-2" style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                <div className="doc-field">
                  <label>Inheritance Policy</label>
                  <select className="doc-select" value={inhMode} onChange={(e) => setInhMode(e.target.value as any)}>
                    <option value="INHERIT">Inherit from parent folder</option>
                    <option value="INHERIT_AND_ADD">Inherit and add specific</option>
                    <option value="BREAK">Break inheritance (Custom only)</option>
                  </select>
                </div>
                <div className="doc-field">
                  <label>External Link Sharing</label>
                  <label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={allowExtShare} onChange={(e) => setAllowExtShare(e.target.checked)} />
                    <span>Enable share link</span>
                  </label>
                  {allowExtShare && (
                    <button
                      type="button"
                      className="doc-btn doc-btn-sm"
                      style={{ marginTop: 5, width: "fit-content" }}
                      onClick={() => {
                        navigator.clipboard?.writeText(window.location.href);
                        showToast("Document link copied to clipboard.");
                      }}
                    >
                      <Copy size={11} /> Copy Share Link
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* View As Role Preview (DOC-005 Panel 12) */}
            <div className="doc-card" style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <h3 className="doc-card-title">View As Role Preview</h3>
              <select className="doc-select" value={viewAsRole} onChange={(e) => setViewAsRole(e.target.value)}>
                <option value="OWNER">Owner</option>
                <option value="EDITOR">Editor</option>
                <option value="COMMENTER">Commenter</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {(viewAsCapabilities[viewAsRole] || []).map((c) => (
                  <div key={c.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "5px 8px", borderRadius: 5, background: c.ok ? "#ecfdf5" : "#fef2f2", color: c.ok ? "#065f46" : "#991b1b" }}>
                    <span>{c.label}</span>
                    <strong>{c.ok ? "✓" : "✕"}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ACTIVITY LOG */}
      {tab === "activity" && (
        <div className="doc-card">
          <h3 className="doc-card-title" style={{ marginBottom: 10 }}>Document Audit Trail</h3>
          {(doc.activityLog || []).length === 0 ? (
            <div className="doc-empty">No activity recorded yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {[...(doc.activityLog || [])].reverse().map((act, idx) => (
                <div key={act._id || idx} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 10px", background: "#f8fafd", borderRadius: 6, border: "1px solid #e3eaf4" }}>
                  <div>
                    <span className="doc-badge doc-badge-blue" style={{ marginRight: 6 }}>{act.action}</span>
                    <strong>{act.byName}</strong>
                    {act.details && <span style={{ color: "#475569" }}> — {act.details}</span>}
                  </div>
                  <span style={{ color: "#64748b", fontSize: 10, whiteSpace: "nowrap" }}>
                    {formatShortDate(act.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DocumentDetailPage() {
  return (
    <Suspense fallback={<div className="doc-page"><div className="doc-card doc-empty">Loading document...</div></div>}>
      <DocumentDetailInner />
    </Suspense>
  );
}
