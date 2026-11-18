"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Folder,
  FolderPlus,
  Upload,
  Search,
  RefreshCw,
  LayoutGrid,
  List,
  ChevronRight,
  Download,
  Eye,
  Copy,
  Trash2,
  Edit3,
  FolderInput,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  ShieldCheck,
  Clock,
  History,
  Lock,
} from "lucide-react";
import {
  documentApi,
  docLookupApi,
  DocumentItem,
  DocumentFolderItem,
  PMS_DOCUMENT_CATEGORIES,
  formatBytes,
  formatShortDate,
  formatDocStatus,
  docStatusBadgeClass,
  confBadgeClass,
} from "@/lib/documents/api";
import "@/components/documents/documents.css";

function fileExtStyle(ext?: string): { bg: string; color: string } {
  const e = String(ext || "").toUpperCase();
  if (e === "PDF") return { bg: "#fef2f2", color: "#dc2626" };
  if (["DOC", "DOCX"].includes(e)) return { bg: "#eff6ff", color: "#0755e9" };
  if (["XLS", "XLSX", "CSV"].includes(e)) return { bg: "#ecfdf5", color: "#047857" };
  if (["PPT", "PPTX"].includes(e)) return { bg: "#fff7ed", color: "#c2410c" };
  if (["PNG", "JPG", "JPEG", "WEBP", "SVG"].includes(e)) return { bg: "#f5f3ff", color: "#7c3aed" };
  return { bg: "#f1f5f9", color: "#475569" };
}

function DocumentRepositoryInner() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "ALL";

  const [summary, setSummary] = useState<any>(null);
  const [folders, setFolders] = useState<DocumentFolderItem[]>([]);
  const [allFolders, setAllFolders] = useState<DocumentFolderItem[]>([]);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [projects, setProjects] = useState<{ _id: string; projectName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Navigation & View
  const [folderStack, setFolderStack] = useState<{ _id: string; name: string }[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Filters
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [searchAllFolders, setSearchAllFolders] = useState(false);

  // Inline New Folder panel
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderProjectId, setNewFolderProjectId] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Inline Move Document bar
  const [movingDoc, setMovingDoc] = useState<DocumentItem | null>(null);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string>("");

  const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1]._id : "ROOT";

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const globalMode = searchAllFolders || Boolean(search.trim()) || categoryFilter !== "ALL" || statusFilter !== "ALL";
      const [sumData, curFolders, flatFolders, docList, projList] = await Promise.all([
        documentApi.summary({ projectId: projectFilter !== "ALL" ? projectFilter : undefined }).catch(() => null),
        documentApi.listFolders({
          parentId: currentFolderId,
          projectId: projectFilter !== "ALL" ? projectFilter : undefined,
        }),
        documentApi.listFolders({}),
        documentApi.list({
          folderId: globalMode ? undefined : currentFolderId,
          allFolders: globalMode ? "true" : undefined,
          projectId: projectFilter !== "ALL" ? projectFilter : undefined,
          category: categoryFilter !== "ALL" ? categoryFilter : undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          search: search.trim() || undefined,
        }),
        docLookupApi.projects().catch(() => []),
      ]);
      setSummary(sumData);
      setFolders(globalMode ? [] : curFolders);
      setAllFolders(flatFolders);
      setDocs(docList);
      setProjects(projList);
    } catch (e: any) {
      setError(e?.message || "Failed to load document repository");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentFolderId, projectFilter, categoryFilter, statusFilter, searchAllFolders]);

  const displayedDocs = useMemo(() => {
    if (!search.trim()) return docs;
    const q = search.trim().toLowerCase();
    return docs.filter(
      (d) =>
        d.title?.toLowerCase().includes(q) ||
        d.fileName?.toLowerCase().includes(q) ||
        d.docCode?.toLowerCase().includes(q) ||
        d.category?.toLowerCase().includes(q) ||
        d.projectName?.toLowerCase().includes(q)
    );
  }, [docs, search]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    setError(null);
    try {
      await documentApi.createFolder({
        name: newFolderName.trim(),
        parentId: currentFolderId === "ROOT" ? null : currentFolderId,
        projectId: newFolderProjectId || (projectFilter !== "ALL" ? projectFilter : undefined),
      });
      setNewFolderName("");
      setShowNewFolder(false);
      showToast("Folder created.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async (folder: DocumentFolderItem) => {
    if (!window.confirm(`Delete folder "${folder.name}"? Documents inside will move to Root.`)) return;
    try {
      await documentApi.deleteFolder(folder._id);
      showToast(`Deleted folder "${folder.name}".`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to delete folder");
    }
  };

  const handleRenameDoc = async (doc: DocumentItem) => {
    const next = window.prompt("Enter new document title:", doc.title);
    if (!next || next.trim() === doc.title) return;
    try {
      await documentApi.update(doc._id, { title: next.trim() });
      showToast(`Renamed ${doc.docCode}.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to rename document");
    }
  };

  const handleMoveDoc = async () => {
    if (!movingDoc) return;
    try {
      await documentApi.update(movingDoc._id, {
        folderId: moveTargetFolderId || null,
      });
      showToast(`Moved "${movingDoc.title}".`);
      setMovingDoc(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to move document");
    }
  };

  const handleCopyDoc = async (doc: DocumentItem) => {
    try {
      const copied = await documentApi.copy(doc._id, {});
      showToast(`Copied ${doc.docCode} → ${copied.docCode}.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to copy document");
    }
  };

  const handleDownload = async (doc: DocumentItem) => {
    try {
      if (doc.fileUrl && !doc.localFilePath) {
        window.open(doc.fileUrl, "_blank", "noopener,noreferrer");
        return;
      }
      const { blob } = await documentApi.fetchFileBlob(doc._id, { inline: false });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName || `${doc.docCode}.bin`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || "Download failed");
    }
  };

  const handleDeleteDoc = async (doc: DocumentItem) => {
    if (!window.confirm(`Archive / delete ${doc.docCode} (${doc.title})?`)) return;
    try {
      await documentApi.remove(doc._id);
      setDocs((prev) => prev.filter((d) => d._id !== doc._id));
      showToast(`Archived ${doc.docCode}.`);
    } catch (err: any) {
      setError(err?.message || "Failed to delete document");
    }
  };

  return (
    <div className="doc-page">
      {/* Header */}
      <div>
        <div className="doc-breadcrumb">
          <button type="button" onClick={() => setFolderStack([])}>
            All Documents
          </button>
          {folderStack.map((f, idx) => (
            <span key={f._id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ChevronRight size={12} />
              <button
                type="button"
                onClick={() => setFolderStack((prev) => prev.slice(0, idx + 1))}
                style={{
                  color: idx === folderStack.length - 1 ? "#10204a" : "#0755e9",
                }}
              >
                {f.name}
              </button>
            </span>
          ))}
        </div>

        <div className="doc-header">
          <div>
            <h1 className="doc-title">Document Repository</h1>
            <p className="doc-subtitle">
              Store, organize, version, govern, and share all project documents securely in one repository.
            </p>
          </div>
          <div className="doc-actions">
            <button type="button" className="doc-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" className="doc-btn" onClick={() => setShowNewFolder((v) => !v)}>
              <FolderPlus size={13} /> New Folder
            </button>
            <Link
              href={
                currentFolderId !== "ROOT"
                  ? `/documents/upload?folderId=${currentFolderId}`
                  : "/documents/upload"
              }
              className="doc-btn doc-btn-primary"
            >
              <Upload size={13} /> Upload Document
            </Link>
          </div>
        </div>
      </div>

      {/* Subnav */}
      <div className="doc-subnav">
        <Link href="/documents" className="doc-subnav-link active">Document Repository</Link>
        <Link href="/documents/upload" className="doc-subnav-link">Upload Document</Link>
        <Link href="/documents/categories" className="doc-subnav-link">Categories &amp; Governance</Link>
      </div>

      {error && <div className="doc-alert doc-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="doc-alert doc-alert-ok"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      {/* KPI Strip */}
      <div className="doc-kpi-grid">
        <div className="doc-kpi">
          <div className="doc-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><FileText size={16} /></div>
          <div><span className="doc-kpi-label">Total Documents</span><span className="doc-kpi-val">{summary?.totalDocuments ?? docs.length}</span></div>
        </div>
        <div className="doc-kpi">
          <div className="doc-kpi-icon" style={{ background: "#fffbeb", color: "#d97706" }}><Folder size={16} /></div>
          <div><span className="doc-kpi-label">Folders</span><span className="doc-kpi-val">{summary?.totalFolders ?? allFolders.length}</span></div>
        </div>
        <div className="doc-kpi">
          <div className="doc-kpi-icon" style={{ background: "#ecfdf5", color: "#047857" }}><ShieldCheck size={16} /></div>
          <div><span className="doc-kpi-label">Published</span><span className="doc-kpi-val">{summary?.publishedCount ?? 0}</span></div>
        </div>
        <div className="doc-kpi">
          <div className="doc-kpi-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}><Clock size={16} /></div>
          <div><span className="doc-kpi-label">In Review</span><span className="doc-kpi-val">{summary?.inReviewCount ?? 0}</span></div>
        </div>
        <div className="doc-kpi">
          <div className="doc-kpi-icon" style={{ background: "#f1f5f9", color: "#334155" }}><HardDrive size={16} /></div>
          <div><span className="doc-kpi-label">Storage Used</span><span className="doc-kpi-val">{formatBytes(summary?.totalSizeBytes || 0)}</span></div>
        </div>
      </div>

      {/* Inline New Folder Creator */}
      {showNewFolder && (
        <form onSubmit={handleCreateFolder} className="doc-card" style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", background: "#f8fbff" }}>
          <div className="doc-field" style={{ flex: 1, minWidth: 200 }}>
            <label>New Folder Name *</label>
            <input
              className="doc-input"
              placeholder="e.g. 01_Requirements, 02_Designs, 03_QA"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              required
            />
          </div>
          <div className="doc-field" style={{ minWidth: 180 }}>
            <label>Project (Optional)</label>
            <select className="doc-select" value={newFolderProjectId} onChange={(e) => setNewFolderProjectId(e.target.value)}>
              <option value="">Organization-Wide</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.projectName}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="doc-btn doc-btn-primary" disabled={creatingFolder}>
            {creatingFolder ? "Creating..." : "Create Folder"}
          </button>
          <button type="button" className="doc-btn" onClick={() => setShowNewFolder(false)}>
            Cancel
          </button>
        </form>
      )}

      {/* Inline Move Document Bar */}
      {movingDoc && (
        <div className="doc-alert doc-alert-info" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <span>
            Move <strong>{movingDoc.docCode} — {movingDoc.title}</strong> to folder:
          </span>
          <div className="doc-actions">
            <select className="doc-select" value={moveTargetFolderId} onChange={(e) => setMoveTargetFolderId(e.target.value)}>
              <option value="">/ (Root)</option>
              {allFolders.map((f) => (
                <option key={f._id} value={f._id}>{f.name}</option>
              ))}
            </select>
            <button type="button" className="doc-btn doc-btn-primary doc-btn-sm" onClick={handleMoveDoc}>
              Move Here
            </button>
            <button type="button" className="doc-btn doc-btn-sm" onClick={() => setMovingDoc(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="doc-filter-bar">
        <div className="doc-search-wrap">
          <Search size={13} className="doc-search-icon" />
          <input
            className="doc-input"
            placeholder="Search files, codes, titles, or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="doc-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="ALL">All Projects</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>{p.projectName}</option>
          ))}
        </select>
        <select className="doc-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="ALL">All Categories</option>
          {PMS_DOCUMENT_CATEGORIES.map((c) => (
            <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
          ))}
        </select>
        <select className="doc-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="CHANGES_REQUESTED">Changes Requested</option>
          <option value="APPROVED">Approved</option>
          <option value="PUBLISHED">Published</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 600, color: "#475569", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={searchAllFolders}
            onChange={(e) => setSearchAllFolders(e.target.checked)}
          />
          All Folders
        </label>
        <div className="doc-seg">
          <button type="button" className={`doc-seg-btn ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")} title="List View">
            <List size={13} />
          </button>
          <button type="button" className={`doc-seg-btn ${viewMode === "grid" ? "active" : ""}`} onClick={() => setViewMode("grid")} title="Grid View">
            <LayoutGrid size={13} />
          </button>
        </div>
      </div>

      {/* LIST VIEW */}
      {viewMode === "list" ? (
        <div className="doc-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="doc-table-wrap">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Name / Code</th>
                  <th>Category</th>
                  <th>Project</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Size</th>
                  <th>Modified</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="doc-empty">Loading repository...</td></tr>
                ) : folders.length === 0 && displayedDocs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="doc-empty">
                      This folder is empty. Click <strong>New Folder</strong> or{" "}
                      <Link href="/documents/upload" style={{ color: "#0755e9", fontWeight: 600 }}>
                        Upload Document
                      </Link>
                      .
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* Folders first */}
                    {folders.map((folder) => (
                      <tr key={`f-${folder._id}`} style={{ background: "#fcfdff" }}>
                        <td>
                          <button
                            type="button"
                            onClick={() => setFolderStack((prev) => [...prev, { _id: folder._id, name: folder.name }])}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              border: 0,
                              background: "transparent",
                              cursor: "pointer",
                              padding: 0,
                              fontWeight: 700,
                              color: "#10204a",
                              fontSize: 11.5,
                            }}
                          >
                            <Folder size={16} color={folder.color || "#f59e0b"} fill={folder.color || "#f59e0b"} fillOpacity={0.2} />
                            <span>{folder.name}</span>
                          </button>
                        </td>
                        <td><span className="doc-badge doc-badge-slate">Folder</span></td>
                        <td>{folder.projectName || "—"}</td>
                        <td>—</td>
                        <td>
                          <span style={{ fontSize: 10.5, color: "#64748b" }}>
                            {folder.documentCount || 0} file(s)
                            {folder.subfolderCount ? ` · ${folder.subfolderCount} sub` : ""}
                          </span>
                        </td>
                        <td>—</td>
                        <td style={{ color: "#64748b", whiteSpace: "nowrap" }}>{formatShortDate(folder.updatedAt)}</td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="doc-btn doc-btn-danger doc-btn-sm"
                            onClick={() => handleDeleteFolder(folder)}
                            title="Delete Folder"
                          >
                            <Trash2 size={11} />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Documents */}
                    {displayedDocs.map((doc) => {
                      const st = fileExtStyle(doc.fileExtension);
                      return (
                        <tr key={doc._id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div className="doc-file-pill" style={{ background: st.bg, color: st.color }}>
                                {(doc.fileExtension || "DOC").slice(0, 4)}
                              </div>
                              <div>
                                <Link
                                  href={`/documents/${doc._id}`}
                                  style={{ fontWeight: 700, color: "#10204a", textDecoration: "none", display: "block" }}
                                >
                                  {doc.title}
                                </Link>
                                <span style={{ fontSize: 10, color: "#64748b" }}>
                                  <strong style={{ color: "#0755e9" }}>{doc.docCode}</strong> · {doc.fileName}
                                  {doc.folderPath && doc.folderPath !== "/" ? ` · ${doc.folderPath}` : ""}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="doc-badge doc-badge-purple">{doc.category}</span>
                            <div style={{ marginTop: 2 }}>
                              <span className={confBadgeClass(doc.confidentiality)} style={{ fontSize: 9 }}>
                                {doc.confidentiality}
                              </span>
                            </div>
                          </td>
                          <td>{doc.projectName || "—"}</td>
                          <td><span className="doc-badge doc-badge-blue">{doc.currentVersion || "v1.0"}</span></td>
                          <td><span className={docStatusBadgeClass(doc.status)}>{formatDocStatus(doc.status)}</span></td>
                          <td style={{ whiteSpace: "nowrap" }}>{formatBytes(doc.sizeBytes)}</td>
                          <td style={{ color: "#64748b", whiteSpace: "nowrap" }}>
                            <div>{formatShortDate(doc.updatedAt || doc.createdAt)}</div>
                            <div style={{ fontSize: 10 }}>{doc.uploadedByName || "—"}</div>
                          </td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            <div style={{ display: "inline-flex", gap: 4 }}>
                              <Link href={`/documents/${doc._id}`} className="doc-btn doc-btn-sm" title="Preview & Details">
                                <Eye size={11} />
                              </Link>
                              <button type="button" className="doc-btn doc-btn-sm" onClick={() => handleDownload(doc)} title="Download">
                                <Download size={11} />
                              </button>
                              <Link href={`/documents/${doc._id}?tab=versions`} className="doc-btn doc-btn-sm" title="Version History">
                                <History size={11} />
                              </Link>
                              <Link href={`/documents/${doc._id}?tab=permissions`} className="doc-btn doc-btn-sm" title="Permissions">
                                <Lock size={11} />
                              </Link>
                              <button type="button" className="doc-btn doc-btn-sm" onClick={() => handleRenameDoc(doc)} title="Rename">
                                <Edit3 size={11} />
                              </button>
                              <button
                                type="button"
                                className="doc-btn doc-btn-sm"
                                onClick={() => {
                                  setMovingDoc(doc);
                                  setMoveTargetFolderId(typeof doc.folderId === "object" ? doc.folderId?._id || "" : doc.folderId || "");
                                }}
                                title="Move To Folder"
                              >
                                <FolderInput size={11} />
                              </button>
                              <button type="button" className="doc-btn doc-btn-sm" onClick={() => handleCopyDoc(doc)} title="Copy">
                                <Copy size={11} />
                              </button>
                              <button type="button" className="doc-btn doc-btn-danger doc-btn-sm" onClick={() => handleDeleteDoc(doc)} title="Delete">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="doc-grid-4">
          {folders.map((folder) => (
            <div
              key={`gf-${folder._id}`}
              className="doc-card"
              onClick={() => setFolderStack((prev) => [...prev, { _id: folder._id, name: folder.name }])}
              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
            >
              <Folder size={26} color={folder.color || "#f59e0b"} fill={folder.color || "#f59e0b"} fillOpacity={0.2} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.name}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>{folder.documentCount || 0} document(s)</div>
              </div>
            </div>
          ))}
          {displayedDocs.map((doc) => {
            const st = fileExtStyle(doc.fileExtension);
            return (
              <div key={`gd-${doc._id}`} className="doc-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="doc-file-pill" style={{ background: st.bg, color: st.color }}>
                    {(doc.fileExtension || "DOC").slice(0, 4)}
                  </div>
                  <span className="doc-badge doc-badge-blue">{doc.currentVersion}</span>
                </div>
                <div>
                  <Link href={`/documents/${doc._id}`} style={{ fontWeight: 700, color: "#10204a", textDecoration: "none", display: "block" }}>
                    {doc.title}
                  </Link>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{doc.docCode} · {formatBytes(doc.sizeBytes)}</div>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  <span className="doc-badge doc-badge-purple">{doc.category}</span>
                  <span className={docStatusBadgeClass(doc.status)}>{formatDocStatus(doc.status)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: 7, marginTop: "auto" }}>
                  <span style={{ fontSize: 10, color: "#64748b" }}>{formatShortDate(doc.updatedAt)}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Link href={`/documents/${doc._id}`} className="doc-btn doc-btn-sm"><Eye size={11} /></Link>
                    <button type="button" className="doc-btn doc-btn-sm" onClick={() => handleDownload(doc)}><Download size={11} /></button>
                  </div>
                </div>
              </div>
            );
          })}
          {!loading && folders.length === 0 && displayedDocs.length === 0 && (
            <div className="doc-card doc-empty" style={{ gridColumn: "1 / -1" }}>No documents found.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DocumentsRepositoryPage() {
  return (
    <Suspense fallback={<div className="doc-page"><div className="doc-card doc-empty">Loading document repository...</div></div>}>
      <DocumentRepositoryInner />
    </Suspense>
  );
}
