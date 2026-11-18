import { getAccessToken, getOrganizationId } from "@/lib/auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api/v1";

export function isValidObjectId(val: unknown): boolean {
  return typeof val === "string" && /^[a-f\d]{24}$/i.test(val.trim());
}

async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  params?: Record<string, string | number | boolean | undefined | null>
): Promise<T> {
  const token = getAccessToken();
  const orgId = getOrganizationId();

  const url = new URL(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && v !== "ALL") {
        url.searchParams.set(k, String(v));
      }
    });
  }
  if (orgId && isValidObjectId(orgId) && !url.searchParams.has("organizationId")) {
    url.searchParams.set("organizationId", orgId);
  }

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url.toString(), {
    ...options,
    headers,
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || json?.error || `Request failed (${res.status})`);
  }
  return (json?.data !== undefined ? json.data : json) as T;
}

export interface DocCategoryMeta {
  code: string;
  label: string;
  shortDesc: string;
  retention: string;
  approvalPolicy: string;
  accent: string;
  bg: string;
}

export const PMS_DOCUMENT_CATEGORIES: DocCategoryMeta[] = [
  { code: "BRD", label: "Business Requirements", shortDesc: "Scope, objectives & stakeholder requirements", retention: "Project + 5 Years", approvalPolicy: "PM + Client Sign-off", accent: "#0755e9", bg: "#eff6ff" },
  { code: "FSD", label: "Functional Specification", shortDesc: "Detailed workflows, rules & screen specs", retention: "Project + 3 Years", approvalPolicy: "Tech Lead + PM", accent: "#0284c7", bg: "#f0f9ff" },
  { code: "HLD", label: "High Level Design", shortDesc: "System architecture, services & infra diagrams", retention: "Project + 5 Years", approvalPolicy: "Architect Review", accent: "#7c3aed", bg: "#f5f3ff" },
  { code: "LLD", label: "Low Level Design", shortDesc: "DB schemas, component contracts & modules", retention: "Project + 3 Years", approvalPolicy: "Tech Lead Review", accent: "#9333ea", bg: "#faf5ff" },
  { code: "UIUX", label: "UI/UX & Design", shortDesc: "Wireframes, prototypes & design systems", retention: "Project + 3 Years", approvalPolicy: "Design + PM", accent: "#db2777", bg: "#fdf2f8" },
  { code: "API", label: "API Documentation", shortDesc: "REST/OpenAPI specs, webhooks & payloads", retention: "Project + 3 Years", approvalPolicy: "Tech Lead Review", accent: "#0891b2", bg: "#ecfeff" },
  { code: "QA", label: "Quality Assurance", shortDesc: "Test plans, traceability & QA sign-off reports", retention: "Project + 3 Years", approvalPolicy: "QA Lead Review", accent: "#059669", bg: "#ecfdf5" },
  { code: "UAT", label: "User Acceptance Testing", shortDesc: "UAT scripts, evidence & client acceptance", retention: "Project + 5 Years", approvalPolicy: "Client Sign-off", accent: "#16a34a", bg: "#f0fdf4" },
  { code: "CONTRACT", label: "Contracts & Legal", shortDesc: "MSA, SOW, NDAs & commercial agreements", retention: "7 Years (Statutory)", approvalPolicy: "Legal + Executive", accent: "#d97706", bg: "#fffbeb" },
  { code: "CLIENT", label: "Client Provided", shortDesc: "Inputs, brand assets & legacy docs from client", retention: "Project + 3 Years", approvalPolicy: "PM Verification", accent: "#ea580c", bg: "#fff7ed" },
  { code: "RELEASE", label: "Release & Deployment", shortDesc: "Release notes, runbooks & rollback guides", retention: "Project + 3 Years", approvalPolicy: "DevOps + PM", accent: "#dc2626", bg: "#fef2f2" },
  { code: "MISC", label: "Miscellaneous", shortDesc: "Meeting minutes, SOPs & general files", retention: "Project + 1 Year", approvalPolicy: "Standard Review", accent: "#475569", bg: "#f8fafc" },
];

export const CONFIDENTIALITY_LEVELS = [
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "RESTRICTED",
] as const;

export const RETENTION_PERIODS = [
  "1 Year",
  "Project + 1 Year",
  "Project + 3 Years",
  "Project + 5 Years",
  "7 Years (Statutory)",
  "Permanent",
] as const;

export const PERMISSION_ROLES = [
  "OWNER",
  "EDITOR",
  "COMMENTER",
  "VIEWER",
  "NO_ACCESS",
] as const;

export interface DocumentFolderItem {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  parentId?: string | null;
  projectId?: any;
  projectName?: string;
  createdByName?: string;
  documentCount?: number;
  subfolderCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentPermissionItem {
  _id?: string;
  principalType: "USER" | "GROUP";
  principalId?: string;
  name: string;
  email?: string;
  role: "OWNER" | "EDITOR" | "COMMENTER" | "VIEWER" | "NO_ACCESS";
  source: "DIRECT" | "INHERITED";
  allowDownload: boolean;
  allowPrint: boolean;
  allowCopy: boolean;
  allowShare: boolean;
  expiresAt?: string | null;
  grantedBy?: string;
  grantedAt?: string;
}

export interface DocumentVersionItem {
  _id: string;
  version: string;
  fileName: string;
  fileUrl?: string;
  localFilePath?: string;
  mimeType?: string;
  sizeBytes?: number;
  notes?: string;
  textSnapshot?: string;
  uploadedByName?: string;
  uploadedAt?: string;
  restoredFrom?: string;
}

export interface DocumentItem {
  _id: string;
  docCode: string;
  folderId?: any;
  folderPath?: string;
  projectId?: any;
  projectName?: string;
  requirementId?: any;
  milestoneId?: any;
  sprintId?: any;
  module?: string;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  confidentiality: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
  retentionPeriod?: string;
  ownerName?: string;
  fileName: string;
  fileUrl?: string;
  localFilePath?: string;
  storageProvider: string;
  mimeType: string;
  fileExtension?: string;
  sizeBytes: number;
  textContent?: string;
  currentVersion: string;
  versions: DocumentVersionItem[];
  status: string;
  approvalStage: string;
  approvalHistory: { _id?: string; stage: string; action: string; byName: string; comments?: string; timestamp: string }[];
  inheritanceMode: "INHERIT" | "BREAK" | "INHERIT_AND_ADD";
  allowExternalShare: boolean;
  shareLinkToken?: string;
  shareLinkExpiry?: string | null;
  permissions: DocumentPermissionItem[];
  activityLog: { _id?: string; action: string; byName: string; details?: string; timestamp: string }[];
  uploadedByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const documentApi = {
  async summary(params?: { projectId?: string }): Promise<any> {
    return apiFetch("/documents/summary", { method: "GET" }, params);
  },

  async listFolders(params?: { parentId?: string; projectId?: string; search?: string }): Promise<DocumentFolderItem[]> {
    const data = await apiFetch<any>("/documents/folders", { method: "GET" }, params);
    return Array.isArray(data) ? data : data?.items || [];
  },

  async createFolder(payload: { name: string; parentId?: string | null; projectId?: string; description?: string; color?: string }): Promise<DocumentFolderItem> {
    return apiFetch("/documents/folders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async renameFolder(folderId: string, name: string): Promise<DocumentFolderItem> {
    return apiFetch(`/documents/folders/${folderId}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  },

  async deleteFolder(folderId: string): Promise<void> {
    await apiFetch(`/documents/folders/${folderId}`, { method: "DELETE" });
  },

  async list(params?: Record<string, any>): Promise<DocumentItem[]> {
    const data = await apiFetch<any>("/documents", { method: "GET" }, { limit: 100, ...params });
    return Array.isArray(data) ? data : data?.items || [];
  },

  async get(id: string): Promise<DocumentItem> {
    return apiFetch(`/documents/${id}`, { method: "GET" });
  },

  async upload(formData: FormData): Promise<DocumentItem> {
    return apiFetch("/documents", { method: "POST", body: formData });
  },

  async createJson(payload: Record<string, any>): Promise<DocumentItem> {
    return apiFetch("/documents", { method: "POST", body: JSON.stringify(payload) });
  },

  async update(id: string, payload: Record<string, any>): Promise<DocumentItem> {
    return apiFetch(`/documents/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },

  async copy(id: string, payload?: { folderId?: string | null; title?: string }): Promise<DocumentItem> {
    return apiFetch(`/documents/${id}/copy`, { method: "POST", body: JSON.stringify(payload || {}) });
  },

  async uploadVersion(id: string, formData: FormData): Promise<DocumentItem> {
    return apiFetch(`/documents/${id}/versions`, { method: "POST", body: formData });
  },

  async restoreVersion(id: string, versionId: string, reason: string): Promise<DocumentItem> {
    return apiFetch(`/documents/${id}/versions/${versionId}/restore`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async updatePermissions(id: string, payload: Record<string, any>): Promise<DocumentItem> {
    return apiFetch(`/documents/${id}/permissions`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async transitionApproval(id: string, action: string, comments?: string): Promise<DocumentItem> {
    return apiFetch(`/documents/${id}/approval`, {
      method: "PATCH",
      body: JSON.stringify({ action, comments }),
    });
  },

  async remove(id: string): Promise<void> {
    await apiFetch(`/documents/${id}`, { method: "DELETE" });
  },

  async fetchFileBlob(id: string, options?: { inline?: boolean; versionId?: string }): Promise<{ blob: Blob; contentType: string }> {
    const token = getAccessToken();
    const url = new URL(`${API_BASE}/documents/${id}/download`);
    if (options?.inline) url.searchParams.set("inline", "true");
    if (options?.versionId) url.searchParams.set("versionId", options.versionId);

    const res = await fetch(url.toString(), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Unable to fetch file (${res.status})`);
    const blob = await res.blob();
    return { blob, contentType: res.headers.get("content-type") || blob.type || "application/octet-stream" };
  },
};

export const docLookupApi = {
  async projects(): Promise<{ _id: string; projectName: string }[]> {
    const data = await apiFetch<any>("/projects", { method: "GET" }, { limit: 100 });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map((p: any) => ({ _id: String(p._id || p.id), projectName: p.projectName || p.name || "Project" }));
  },
  async requirements(projectId?: string): Promise<{ _id: string; code: string; title: string }[]> {
    const data = await apiFetch<any>("/requirements", { method: "GET" }, { limit: 100, projectId });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map((r: any) => ({ _id: String(r._id || r.id), code: r.requirementCode || "", title: r.title || "Requirement" }));
  },
  async milestones(projectId?: string): Promise<{ _id: string; title: string }[]> {
    const data = await apiFetch<any>("/milestones", { method: "GET" }, { limit: 100, projectId });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map((m: any) => ({ _id: String(m._id || m.id), title: m.title || m.name || "Milestone" }));
  },
  async sprints(projectId?: string): Promise<{ _id: string; name: string }[]> {
    const data = await apiFetch<any>("/sprints", { method: "GET" }, { limit: 100, projectId });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map((s: any) => ({ _id: String(s._id || s.id), name: s.name || s.sprintName || "Sprint" }));
  },
  async employees(): Promise<{ _id: string; name: string; email: string }[]> {
    const data = await apiFetch<any>("/employees", { method: "GET" }, { limit: 100 });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map((e: any) => ({
      _id: String(e._id || e.id),
      name: e.displayName || e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.email || "Member",
      email: e.email || "",
    }));
  },
};

export function formatBytes(bytes?: number): string {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatShortDate(d?: string | Date | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDocStatus(st?: string): string {
  if (!st) return "Draft";
  return st
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function docStatusBadgeClass(st?: string): string {
  const s = String(st || "").toUpperCase();
  if (["PUBLISHED", "APPROVED"].includes(s)) return "doc-badge doc-badge-green";
  if (["IN_REVIEW", "SUBMITTED", "TECHNICAL_REVIEW", "PROJECT_REVIEW", "CLIENT_APPROVAL"].includes(s))
    return "doc-badge doc-badge-blue";
  if (["CHANGES_REQUESTED", "DRAFT"].includes(s)) return "doc-badge doc-badge-amber";
  if (["REJECTED", "ARCHIVED"].includes(s)) return "doc-badge doc-badge-red";
  return "doc-badge doc-badge-slate";
}

export function confBadgeClass(conf?: string): string {
  switch (String(conf || "").toUpperCase()) {
    case "RESTRICTED":
      return "doc-badge doc-badge-red";
    case "CONFIDENTIAL":
      return "doc-badge doc-badge-amber";
    case "PUBLIC":
      return "doc-badge doc-badge-green";
    default:
      return "doc-badge doc-badge-slate";
  }
}
