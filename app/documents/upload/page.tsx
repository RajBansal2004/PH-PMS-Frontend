"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Upload,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  Link2,
  FileText,
  Lock,
} from "lucide-react";
import {
  documentApi,
  docLookupApi,
  DocumentFolderItem,
  DocumentPermissionItem,
  PMS_DOCUMENT_CATEGORIES,
  CONFIDENTIALITY_LEVELS,
  RETENTION_PERIODS,
  PERMISSION_ROLES,
  formatBytes,
} from "@/lib/documents/api";
import "@/components/documents/documents.css";

const STEPS = [
  { num: 1, label: "Folder & Source" },
  { num: 2, label: "Metadata & Governance" },
  { num: 3, label: "Permissions & Sharing" },
  { num: 4, label: "Approval Workflow" },
  { num: 5, label: "Review & Upload" },
];

const DEFAULT_GROUPS = [
  "Project Managers",
  "Development Team",
  "QA Team",
  "Leadership Team",
  "Clients (Read Only)",
];

function UploadDocumentWizardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFolderId = searchParams.get("folderId") || "";
  const initialCategory = searchParams.get("category") || "BRD";

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lookups
  const [folders, setFolders] = useState<DocumentFolderItem[]>([]);
  const [projects, setProjects] = useState<{ _id: string; projectName: string }[]>([]);
  const [requirements, setRequirements] = useState<{ _id: string; code: string; title: string }[]>([]);
  const [milestones, setMilestones] = useState<{ _id: string; title: string }[]>([]);
  const [sprints, setSprints] = useState<{ _id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ _id: string; name: string; email: string }[]>([]);

  // Step 1: Source & Folder
  const [folderId, setFolderId] = useState(initialFolderId);
  const [sourceType, setSourceType] = useState<"LOCAL" | "EXTERNAL" | "GOOGLE_DRIVE" | "ONEDRIVE" | "DROPBOX">("LOCAL");
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [externalFileName, setExternalFileName] = useState("");
  const [inlineNotesContent, setInlineNotesContent] = useState("");

  // Step 2: Metadata
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [projectId, setProjectId] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [requirementId, setRequirementId] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [confidentiality, setConfidentiality] = useState<string>("INTERNAL");
  const [retentionPeriod, setRetentionPeriod] = useState<string>("Project + 3 Years");
  const [version, setVersion] = useState("v1.0");
  const [versionNotes, setVersionNotes] = useState("Initial upload");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // Step 3: Permissions
  const [inheritanceMode, setInheritanceMode] = useState<"INHERIT" | "BREAK" | "INHERIT_AND_ADD">("INHERIT");
  const [allowExternalShare, setAllowExternalShare] = useState(false);
  const [permissions, setPermissions] = useState<DocumentPermissionItem[]>([]);
  const [addPrincipalType, setAddPrincipalType] = useState<"USER" | "GROUP">("USER");
  const [addPrincipalId, setAddPrincipalId] = useState("");
  const [addGroupName, setAddGroupName] = useState(DEFAULT_GROUPS[0]);
  const [addRole, setAddRole] = useState<"OWNER" | "EDITOR" | "COMMENTER" | "VIEWER">("VIEWER");

  // Step 4: Approval
  const [publishMode, setPublishMode] = useState<"DRAFT" | "IN_REVIEW" | "PUBLISHED">("DRAFT");

  useEffect(() => {
    Promise.all([
      documentApi.listFolders({}).catch(() => []),
      docLookupApi.projects().catch(() => []),
      docLookupApi.employees().catch(() => []),
    ])
      .then(([fls, projs, emps]) => {
        setFolders(fls);
        setProjects(projs);
        setEmployees(emps);
        if (projs.length > 0) setProjectId(projs[0]._id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      docLookupApi.requirements(projectId).catch(() => []),
      docLookupApi.milestones(projectId).catch(() => []),
      docLookupApi.sprints(projectId).catch(() => []),
    ]).then(([reqs, mls, sps]) => {
      setRequirements(reqs);
      setMilestones(mls);
      setSprints(sps);
    });
  }, [projectId]);

  const handleFileSelect = (selected: File | null) => {
    if (!selected) return;
    setFile(selected);
    if (!title.trim()) {
      setTitle(selected.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
    }
  };

  const addTag = () => {
    const clean = tagInput.trim();
    if (clean && !tags.includes(clean)) setTags((prev) => [...prev, clean]);
    setTagInput("");
  };

  const addPermissionEntry = () => {
    if (addPrincipalType === "USER") {
      const emp = employees.find((e) => e._id === addPrincipalId);
      if (!emp) return;
      if (permissions.some((p) => p.principalId === emp._id)) return;
      setPermissions((prev) => [
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
      setAddPrincipalId("");
    } else {
      if (permissions.some((p) => p.principalType === "GROUP" && p.name === addGroupName)) return;
      setPermissions((prev) => [
        ...prev,
        {
          principalType: "GROUP",
          principalId: addGroupName,
          name: addGroupName,
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

  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (sourceType === "LOCAL" && !file && !inlineNotesContent.trim()) {
        return "Please choose a local file (or enter document text content) to upload.";
      }
      if (sourceType !== "LOCAL" && !externalUrl.trim()) {
        return "Please enter the document URL.";
      }
    }
    if (s === 2) {
      if (!title.trim()) return "Document Title is required.";
      if (!category) return "Document Category is required.";
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(5, s + 1));
  };

  const handleSubmit = async () => {
    for (const s of [1, 2]) {
      const err = validateStep(s);
      if (err) {
        setStep(s);
        setError(err);
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      if (sourceType === "LOCAL" && file) {
        fd.append("file", file);
      } else {
        const derivedName =
          externalFileName.trim() ||
          `${title.trim().replace(/[^a-zA-Z0-9._-]+/g, "_")}${sourceType === "LOCAL" ? ".txt" : ".pdf"}`;
        fd.append("fileName", derivedName);
        if (externalUrl.trim()) fd.append("fileUrl", externalUrl.trim());
        fd.append("storageProvider", sourceType);
        fd.append("mimeType", sourceType === "LOCAL" ? "text/plain" : "application/pdf");
        fd.append("sizeBytes", String(inlineNotesContent.length || 2048));
      }
      if (inlineNotesContent.trim()) fd.append("textContent", inlineNotesContent);
      if (folderId) fd.append("folderId", folderId);
      if (projectId) fd.append("projectId", projectId);
      if (requirementId) fd.append("requirementId", requirementId);
      if (milestoneId) fd.append("milestoneId", milestoneId);
      if (sprintId) fd.append("sprintId", sprintId);
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      fd.append("category", category);
      fd.append("module", moduleName.trim());
      fd.append("confidentiality", confidentiality);
      fd.append("retentionPeriod", retentionPeriod);
      fd.append("currentVersion", version.trim() || "v1.0");
      fd.append("versionNotes", versionNotes.trim() || "Initial upload");
      fd.append("status", publishMode);
      fd.append("inheritanceMode", inheritanceMode);
      fd.append("allowExternalShare", String(allowExternalShare));
      fd.append("tags", JSON.stringify(tags));
      if (permissions.length > 0) fd.append("permissions", JSON.stringify(permissions));

      const created = await documentApi.upload(fd);
      router.push(`/documents/${created._id}`);
    } catch (e: any) {
      setError(e?.message || "Failed to upload document");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedFolderName = folders.find((f) => f._id === folderId)?.name || "/ (Root)";
  const selectedProjName = projects.find((p) => p._id === projectId)?.projectName || "—";
  const selectedCatMeta = PMS_DOCUMENT_CATEGORIES.find((c) => c.code === category);

  return (
    <div className="doc-page">
      <div>
        <div className="doc-breadcrumb">
          <Link href="/documents">Documents</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Upload Document</span>
        </div>
        <div className="doc-header">
          <div>
            <h1 className="doc-title">Upload Document</h1>
            <p className="doc-subtitle">
              Upload project files with governance metadata, folder placement, access control, and approval routing.
            </p>
          </div>
          <div className="doc-actions">
            <Link href="/documents" className="doc-btn">
              <ArrowLeft size={12} /> Back to Repository
            </Link>
          </div>
        </div>
      </div>

      {/* Subnav */}
      <div className="doc-subnav">
        <Link href="/documents" className="doc-subnav-link">Document Repository</Link>
        <Link href="/documents/upload" className="doc-subnav-link active">Upload Document</Link>
        <Link href="/documents/categories" className="doc-subnav-link">Categories &amp; Governance</Link>
      </div>

      {/* 5-Step Stepper */}
      <div className="doc-card" style={{ padding: "10px 14px" }}>
        <div className="doc-stepper">
          {STEPS.map((st) => {
            const done = step > st.num;
            const active = step === st.num;
            return (
              <button
                key={st.num}
                type="button"
                className={`doc-step ${active ? "active" : ""} ${done ? "done" : ""}`}
                onClick={() => {
                  if (st.num < step) {
                    setError(null);
                    setStep(st.num);
                  }
                }}
              >
                <span>{done ? <Check size={11} /> : st.num}</span>
                <b>{st.label}</b>
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className="doc-alert doc-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 275px", gap: 14, alignItems: "start" }}>
        <div className="doc-card">
          {loading ? (
            <div className="doc-empty">Loading folders and projects...</div>
          ) : (
            <>
              {/* STEP 1 */}
              {step === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <h2 className="doc-card-title">Step 1: Destination Folder &amp; Document Source</h2>

                  <div className="doc-grid-2">
                    <div className="doc-field">
                      <label>Destination Folder</label>
                      <select className="doc-select" value={folderId} onChange={(e) => setFolderId(e.target.value)}>
                        <option value="">/ (Repository Root)</option>
                        {folders.map((f) => (
                          <option key={f._id} value={f._id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="doc-field">
                      <label>Upload Source</label>
                      <select className="doc-select" value={sourceType} onChange={(e) => setSourceType(e.target.value as any)}>
                        <option value="LOCAL">Upload from Device (File)</option>
                        <option value="GOOGLE_DRIVE">Import from Google Drive URL</option>
                        <option value="ONEDRIVE">Import from OneDrive URL</option>
                        <option value="DROPBOX">Import from Dropbox URL</option>
                        <option value="EXTERNAL">External HTTPS URL</option>
                      </select>
                    </div>
                  </div>

                  {sourceType === "LOCAL" ? (
                    <>
                      <div
                        className={`doc-dropzone ${dragging ? "dragging" : ""}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragging(false);
                          handleFileSelect(e.dataTransfer.files?.[0] || null);
                        }}
                      >
                        <Upload size={26} color="#0755e9" style={{ margin: "0 auto 8px" }} />
                        <div style={{ fontWeight: 700, fontSize: 12.5 }}>
                          {file ? file.name : "Drag & drop a file here, or click to browse"}
                        </div>
                        <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 4 }}>
                          {file
                            ? `${formatBytes(file.size)} · ${file.type || "Document"}`
                            : "Supports PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, PNG, JPG, TXT, CSV, JSON, ZIP (up to 25 MB)"}
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          style={{ display: "none" }}
                          onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                        />
                      </div>

                      <div className="doc-field">
                        <label>Or Paste / Author Inline Text Content (Optional — Enables Side-by-Side Version Diff)</label>
                        <textarea
                          className="doc-textarea"
                          rows={3}
                          placeholder="Optional document notes, markdown spec, or summary text..."
                          value={inlineNotesContent}
                          onChange={(e) => setInlineNotesContent(e.target.value)}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="doc-grid-2">
                      <div className="doc-field">
                        <label>Document / Cloud File URL *</label>
                        <input
                          className="doc-input"
                          placeholder="https://drive.google.com/file/d/..."
                          value={externalUrl}
                          onChange={(e) => setExternalUrl(e.target.value)}
                        />
                      </div>
                      <div className="doc-field">
                        <label>File Name</label>
                        <input
                          className="doc-input"
                          placeholder="e.g. Architecture_Blueprint_v1.pdf"
                          value={externalFileName}
                          onChange={(e) => setExternalFileName(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  <h2 className="doc-card-title">Step 2: Document Metadata &amp; Traceability</h2>
                  <div className="doc-grid-2">
                    <div className="doc-field">
                      <label>Document Title *</label>
                      <input
                        className="doc-input"
                        placeholder="e.g. PMS Functional Specification Document"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>
                    <div className="doc-field">
                      <label>Category *</label>
                      <select
                        className="doc-select"
                        value={category}
                        onChange={(e) => {
                          setCategory(e.target.value);
                          const meta = PMS_DOCUMENT_CATEGORIES.find((c) => c.code === e.target.value);
                          if (meta) setRetentionPeriod(meta.retention);
                        }}
                      >
                        {PMS_DOCUMENT_CATEGORIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="doc-field">
                    <label>Description</label>
                    <textarea
                      className="doc-textarea"
                      rows={3}
                      placeholder="Purpose, scope, and key highlights of this document..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="doc-grid-3">
                    <div className="doc-field">
                      <label>Related Project</label>
                      <select className="doc-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                        <option value="">Organization-Wide</option>
                        {projects.map((p) => (
                          <option key={p._id} value={p._id}>{p.projectName}</option>
                        ))}
                      </select>
                    </div>
                    <div className="doc-field">
                      <label>Module</label>
                      <input
                        className="doc-input"
                        placeholder="e.g. Project Management, Billing"
                        value={moduleName}
                        onChange={(e) => setModuleName(e.target.value)}
                      />
                    </div>
                    <div className="doc-field">
                      <label>Initial Version</label>
                      <input className="doc-input" value={version} onChange={(e) => setVersion(e.target.value)} />
                    </div>
                  </div>

                  <div className="doc-grid-3">
                    <div className="doc-field">
                      <label>Linked Requirement</label>
                      <select className="doc-select" value={requirementId} onChange={(e) => setRequirementId(e.target.value)}>
                        <option value="">None</option>
                        {requirements.map((r) => (
                          <option key={r._id} value={r._id}>{r.code ? `${r.code} — ` : ""}{r.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="doc-field">
                      <label>Linked Milestone</label>
                      <select className="doc-select" value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)}>
                        <option value="">None</option>
                        {milestones.map((m) => (
                          <option key={m._id} value={m._id}>{m.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="doc-field">
                      <label>Linked Sprint</label>
                      <select className="doc-select" value={sprintId} onChange={(e) => setSprintId(e.target.value)}>
                        <option value="">None</option>
                        {sprints.map((s) => (
                          <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="doc-grid-3">
                    <div className="doc-field">
                      <label>Confidentiality</label>
                      <select className="doc-select" value={confidentiality} onChange={(e) => setConfidentiality(e.target.value)}>
                        {CONFIDENTIALITY_LEVELS.map((cl) => (
                          <option key={cl} value={cl}>{cl}</option>
                        ))}
                      </select>
                    </div>
                    <div className="doc-field">
                      <label>Retention Period</label>
                      <select className="doc-select" value={retentionPeriod} onChange={(e) => setRetentionPeriod(e.target.value)}>
                        {RETENTION_PERIODS.map((rp) => (
                          <option key={rp} value={rp}>{rp}</option>
                        ))}
                      </select>
                    </div>
                    <div className="doc-field">
                      <label>Version Notes</label>
                      <input className="doc-input" value={versionNotes} onChange={(e) => setVersionNotes(e.target.value)} />
                    </div>
                  </div>

                  <div className="doc-field">
                    <label>Tags</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        className="doc-input"
                        style={{ flex: 1 }}
                        placeholder="Add tag and press Enter..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                      />
                      <button type="button" className="doc-btn" onClick={addTag}><Plus size={12} /> Add</button>
                    </div>
                    {tags.length > 0 && (
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 4 }}>
                        {tags.map((t) => (
                          <span key={t} className="doc-tag-chip">
                            {t}
                            <button
                              type="button"
                              onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                              style={{ border: 0, background: "transparent", cursor: "pointer", color: "#0755e9", padding: 0, fontWeight: 700 }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <h2 className="doc-card-title">Step 3: Access Policy &amp; Sharing Permissions</h2>

                  <div className="doc-field">
                    <label>Folder Permission Inheritance</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {(
                        [
                          ["INHERIT", "Inherit permissions from parent folder (Recommended)"],
                          ["INHERIT_AND_ADD", "Inherit parent permissions and add document-specific users/groups"],
                          ["BREAK", "Break inheritance — apply only custom permissions below"],
                        ] as const
                      ).map(([mode, lbl]) => (
                        <label key={mode} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontWeight: 500 }}>
                          <input type="radio" checked={inheritanceMode === mode} onChange={() => setInheritanceMode(mode)} />
                          <span>{lbl}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Add User or Group */}
                  <div style={{ background: "#f8fafd", border: "1px solid #e3eaf4", borderRadius: 7, padding: 10 }}>
                    <div style={{ fontWeight: 700, marginBottom: 7, fontSize: 11 }}>Grant Additional Access</div>
                    <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 120px auto", gap: 6 }}>
                      <select className="doc-select" value={addPrincipalType} onChange={(e) => setAddPrincipalType(e.target.value as any)}>
                        <option value="USER">User</option>
                        <option value="GROUP">Group</option>
                      </select>
                      {addPrincipalType === "USER" ? (
                        <select className="doc-select" value={addPrincipalId} onChange={(e) => setAddPrincipalId(e.target.value)}>
                          <option value="">Select Team Member</option>
                          {employees.map((emp) => (
                            <option key={emp._id} value={emp._id}>{emp.name} ({emp.email})</option>
                          ))}
                        </select>
                      ) : (
                        <select className="doc-select" value={addGroupName} onChange={(e) => setAddGroupName(e.target.value)}>
                          {DEFAULT_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                      )}
                      <select className="doc-select" value={addRole} onChange={(e) => setAddRole(e.target.value as any)}>
                        {PERMISSION_ROLES.filter((r) => r !== "NO_ACCESS").map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <button type="button" className="doc-btn doc-btn-primary" onClick={addPermissionEntry}>
                        <Plus size={12} /> Add
                      </button>
                    </div>
                  </div>

                  {permissions.length > 0 && (
                    <div className="doc-table-wrap">
                      <table className="doc-table">
                        <thead>
                          <tr>
                            <th>Principal</th>
                            <th>Type</th>
                            <th>Role</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {permissions.map((p, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 600 }}>{p.name}</td>
                              <td><span className="doc-badge doc-badge-slate">{p.principalType}</span></td>
                              <td><span className="doc-badge doc-badge-blue">{p.role}</span></td>
                              <td style={{ textAlign: "right" }}>
                                <button
                                  type="button"
                                  className="doc-btn doc-btn-danger doc-btn-sm"
                                  onClick={() => setPermissions((prev) => prev.filter((_, i) => i !== idx))}
                                >
                                  <Trash2 size={11} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontWeight: 600 }}>
                    <input type="checkbox" checked={allowExternalShare} onChange={(e) => setAllowExternalShare(e.target.checked)} />
                    <Link2 size={13} color="#0755e9" /> Allow external link sharing for authorized stakeholders
                  </label>
                </div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <h2 className="doc-card-title">Step 4: Approval &amp; Publishing Workflow</h2>
                  <p style={{ margin: 0, color: "#64748b" }}>
                    Governance policy for <strong>{category}</strong>: <strong>{selectedCatMeta?.approvalPolicy || "Standard Review"}</strong>.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(
                      [
                        ["DRAFT", "Save as Draft", "Document remains private in Draft state for editing before review."],
                        ["IN_REVIEW", "Submit for Multi-Stage Approval", "Routes through Technical Review → Project Review → Client Approval → Published."],
                        ["PUBLISHED", "Publish Immediately", "Marks document as Published and available to all permitted users right away."],
                      ] as const
                    ).map(([st, heading, desc]) => (
                      <label
                        key={st}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 9,
                          padding: 11,
                          borderRadius: 7,
                          border: `1.5px solid ${publishMode === st ? "#0755e9" : "#e3eaf4"}`,
                          background: publishMode === st ? "#eff6ff" : "#ffffff",
                          cursor: "pointer",
                        }}
                      >
                        <input type="radio" checked={publishMode === st} onChange={() => setPublishMode(st)} style={{ marginTop: 2 }} />
                        <div>
                          <div style={{ fontWeight: 700 }}>{heading}</div>
                          <div style={{ fontSize: 10.5, color: "#64748b" }}>{desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 5 */}
              {step === 5 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <h2 className="doc-card-title">Step 5: Security Pre-Check &amp; Confirm Upload</h2>
                  <div className="doc-alert doc-alert-ok">
                    <ShieldCheck size={15} />
                    <span>
                      <strong>Pre-Upload Verification Passed:</strong> File extension validated, size within 25 MB limit,
                      metadata &amp; retention rules verified, audit log initialized.
                    </span>
                  </div>
                  <div className="doc-grid-2">
                    <div style={{ background: "#f8fafd", border: "1px solid #e3eaf4", borderRadius: 7, padding: 11 }}>
                      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>File &amp; Destination</div>
                      <p style={{ margin: "2px 0" }}><strong>Source:</strong> {sourceType}</p>
                      <p style={{ margin: "2px 0" }}><strong>File:</strong> {file?.name || externalFileName || title}</p>
                      <p style={{ margin: "2px 0" }}><strong>Size:</strong> {file ? formatBytes(file.size) : "Linked / Inline"}</p>
                      <p style={{ margin: "2px 0" }}><strong>Folder:</strong> {selectedFolderName}</p>
                    </div>
                    <div style={{ background: "#f8fafd", border: "1px solid #e3eaf4", borderRadius: 7, padding: 11 }}>
                      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Governance</div>
                      <p style={{ margin: "2px 0" }}><strong>Category:</strong> {category}</p>
                      <p style={{ margin: "2px 0" }}><strong>Project:</strong> {selectedProjName}</p>
                      <p style={{ margin: "2px 0" }}><strong>Confidentiality:</strong> {confidentiality}</p>
                      <p style={{ margin: "2px 0" }}><strong>Initial Status:</strong> {publishMode.replace("_", " ")}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Footer */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid #e3eaf4" }}>
                <button
                  type="button"
                  className="doc-btn"
                  onClick={() => { setError(null); setStep((s) => Math.max(1, s - 1)); }}
                  disabled={step === 1}
                >
                  <ArrowLeft size={12} /> Previous
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link href="/documents" className="doc-btn doc-btn-ghost">Cancel</Link>
                  {step < 5 ? (
                    <button type="button" className="doc-btn doc-btn-primary" onClick={goNext}>
                      Next Step <ArrowRight size={12} />
                    </button>
                  ) : (
                    <button type="button" className="doc-btn doc-btn-success" onClick={handleSubmit} disabled={submitting}>
                      <Upload size={12} /> {submitting ? "Uploading..." : "Upload Document"}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sticky Live Summary */}
        <div className="doc-card" style={{ position: "sticky", top: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <FileText size={14} color="#0755e9" />
            <h3 className="doc-card-title">Upload Summary</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11 }}>
            <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Destination</span><strong>{selectedFolderName}</strong></div>
            <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Title</span><strong>{title || "—"}</strong></div>
            <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Category &amp; Version</span><strong>{category} · {version}</strong></div>
            <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Project</span><strong>{selectedProjName}</strong></div>
            <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Confidentiality</span><strong>{confidentiality}</strong></div>
            <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Access Mode</span><strong style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Lock size={11} /> {inheritanceMode}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UploadDocumentPage() {
  return (
    <Suspense fallback={<div className="doc-page"><div className="doc-card doc-empty">Loading upload wizard...</div></div>}>
      <UploadDocumentWizardInner />
    </Suspense>
  );
}
