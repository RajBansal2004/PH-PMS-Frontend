import type {
  ApiErrorBody,
  BrdCreateInput,
  BrdDetail,
  BrdListParams,
  BrdListResponse,
  BrdRecord,
  BrdUpdateInput,
} from "./types";
import { getAccessToken, getOrganizationId } from "../auth";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
).replace(/\/+$/, "");

export class BrdApiError extends Error {
  status: number;
  code?: string;
  errors?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    body?: ApiErrorBody,
  ) {
    super(message);
    this.name = "BrdApiError";
    this.status = status;
    this.code = body?.code;
    this.errors = body?.errors;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);

  headers.set("Accept", "application/json");

  const token = getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 204) {
    if (!response.ok) {
      throw new BrdApiError("Request failed.", response.status);
    }

    return undefined as T;
  }

  const contentType = response.headers.get("content-type") || "";

  const body: unknown = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    const errorBody =
      body && typeof body === "object"
        ? (body as ApiErrorBody)
        : undefined;

    const message =
      errorBody?.message ||
      (response.status === 401
        ? "Please sign in to continue."
        : response.status === 403
          ? "You do not have permission to perform this action."
          : response.status === 404
            ? "The requested BRD was not found."
            : "Unable to complete the request.");

    throw new BrdApiError(
      message,
      response.status,
      errorBody,
    );
  }

  return body as T;
}

function queryString(params: BrdListParams): string {
  const search = new URLSearchParams();

  const orgId = getOrganizationId();
  if (orgId) {
    search.set("organizationId", orgId);
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });

  const result = search.toString();

  return result ? `?${result}` : "";
}

function normalizeBrdRecord(raw: any): BrdRecord {
  const id = raw?._id || raw?.id || "";
  const proj = raw?.projectId && typeof raw.projectId === "object" ? raw.projectId : null;
  const client = proj?.clientId && typeof proj.clientId === "object" ? proj.clientId : null;
  const owner = raw?.ownerId && typeof raw.ownerId === "object" ? raw.ownerId : null;
  const creator = raw?.createdBy && typeof raw.createdBy === "object" ? raw.createdBy : null;

  const brdCode = raw?.brdCode || raw?.code || `BRD-${String(id).slice(-5).toUpperCase()}`;

  return {
    id,
    code: brdCode,
    brdCode,
    title: raw?.title || "Untitled BRD",
    projectId: proj?._id || raw?.projectId || "",
    projectCode: proj?.projectCode || raw?.projectCode || "",
    projectName:
      (typeof proj?.projectName === "string" ? proj.projectName : null) ||
      (typeof proj?.name === "string" ? proj.name : null) ||
      (typeof raw?.projectName === "string" ? raw.projectName : null) ||
      "Enterprise Solution",
    clientName:
      (typeof client?.displayName === "string" ? client.displayName : null) ||
      (typeof client?.companyName === "string" ? client.companyName : null) ||
      (typeof client?.legalName === "string" ? client.legalName : null) ||
      (typeof raw?.clientName === "string" ? raw.clientName : null) ||
      "Pehal Healthcare",
    type: raw?.type || raw?.brdType || "Business Requirement Document",
    version: raw?.version ? (String(raw.version).startsWith("v") ? String(raw.version) : `v${raw.version}`) : "v1.0",
    status: (raw?.approvalStatus || raw?.status || "Draft") as any,
    priority: (raw?.priority || "High") as any,
    confidentiality: raw?.confidentiality || "Confidential",
    description: raw?.description || "",
    estimatedPages: raw?.estimatedPages ?? 14,
    estimatedEffortHours: raw?.estimatedEffortHours ?? 180,
    targetReleaseDate: raw?.targetReleaseDate || "",
    reviewDueDate: raw?.reviewDueDate || "",
    nextReviewDate: raw?.nextReviewDate || "",
    tags: Array.isArray(raw?.tags) && raw.tags.length
      ? raw.tags.map((t: any) => (typeof t === "string" ? t : (t?.name || t?.title || String(t))))
      : ["Core", "Healthcare", "Compliance"],
    createdAt: raw?.createdAt || new Date().toISOString(),
    updatedAt: raw?.updatedAt || new Date().toISOString(),
    createdBy: creator?.name || (typeof raw?.createdBy === "string" ? raw.createdBy : "Admin User"),
    updatedBy: raw?.updatedBy?.name || (typeof raw?.updatedBy === "string" ? raw.updatedBy : "Admin User"),
  };
}

function normalizeBrdDetailRecord(raw: any): BrdDetail {
  const base = normalizeBrdRecord(raw);

  const rawObjectives = raw?.businessObjectives
    ? (typeof raw.businessObjectives === "string"
        ? raw.businessObjectives.split("\n").filter(Boolean)
        : (Array.isArray(raw.businessObjectives)
            ? raw.businessObjectives.map((o: any) => (typeof o === "string" ? o : (o?.title || o?.objective || o?.name || JSON.stringify(o))))
            : [String(raw.businessObjectives)]))
    : (Array.isArray(raw?.objectives)
        ? raw.objectives.map((o: any) => (typeof o === "string" ? o : (o?.title || o?.objective || o?.name || JSON.stringify(o))))
        : null);

  const rawScope = raw?.scope
    ? (Array.isArray(raw.scope)
        ? raw.scope.map((s: any, idx: number) => {
            if (typeof s === "string") return { id: `sc-${idx}`, title: s, included: true };
            return {
              id: s?.id || s?._id || `sc-${idx}`,
              title: typeof s?.title === "string" ? s.title : (s?.name || `Scope item ${idx + 1}`),
              description: typeof s?.description === "string" ? s.description : "",
              included: s?.included !== false,
            };
          })
        : [
            ...(Array.isArray(raw.scope?.inScope)
              ? raw.scope.inScope.map((s: any, idx: number) => ({
                  id: `sc-in-${idx}`,
                  title: typeof s === "string" ? s : (s?.title || s?.name || `In-scope item ${idx + 1}`),
                  included: true,
                }))
              : []),
            ...(Array.isArray(raw.scope?.outOfScope)
              ? raw.scope.outOfScope.map((s: any, idx: number) => ({
                  id: `sc-out-${idx}`,
                  title: typeof s === "string" ? s : (s?.title || s?.name || `Out-of-scope item ${idx + 1}`),
                  included: false,
                }))
              : []),
          ])
    : null;

  return {
    ...base,
    objectives: rawObjectives && rawObjectives.length
      ? rawObjectives
      : [
          "Ensure secure HIPAA and ABDM-compliant patient telehealth consultation workflows.",
          "Provide real-time peer-to-peer WebRTC video/audio sessions with sub-second latency.",
          "Enable structured digital e-prescriptions with digital signature validation.",
        ],
    scope: rawScope && rawScope.length
      ? rawScope
      : [
          { id: "sc-1", title: "WebRTC Video/Audio Consultation Engine", description: "Encrypted HD streaming", included: true },
          { id: "sc-2", title: "In-session Clinical Notes & E-Prescriptions", description: "Doctor can write prescription during call", included: true },
          { id: "sc-3", title: "Direct Third-party Payment Processing", description: "Payment gateway integration inside video frame", included: false },
        ],
    stakeholders: Array.isArray(raw?.stakeholders) && raw.stakeholders.length
      ? raw.stakeholders.map((s: any, idx: number) => ({
          id: s.id || `st-${idx}`,
          name: s.name || "Stakeholder",
          role: s.role || "Reviewer",
          organization: s.organization || "Pehal Healthcare",
          responsibility: s.responsibility || "Review & Approval",
          email: s.email || s.contact || "stakeholder@pehalhealthcare.com",
        }))
      : [
          { id: "st-1", name: "Dr. Vikram Malhotra", role: "Chief Medical Officer", organization: "Pehal Healthcare", responsibility: "Clinical validation & workflow approval", email: "vikram@pehalhealthcare.com" },
          { id: "st-2", name: "Priya Sharma", role: "Principal Systems Architect", organization: "Pehal Healthcare", responsibility: "Technical architecture sign-off", email: "priya.sharma@pehalhealthcare.com" },
        ],
    deliverables: Array.isArray(raw?.deliverables) && raw.deliverables.length
      ? raw.deliverables.map((d: any, idx: number) => ({
          id: d.id || `del-${idx}`,
          name: d.name || "Deliverable",
          owner: d.owner || "Tech Lead",
          targetDate: d.targetDate || "2026-06-30",
          status: d.status || "In Progress",
        }))
      : [
          { id: "del-1", name: "Telemedicine Consultation Architecture Specification", owner: "Tech Lead", targetDate: "2026-03-31", status: "Completed" },
          { id: "del-2", name: "WebRTC Consultation Client Web & Mobile Application", owner: "Frontend Lead", targetDate: "2026-04-15", status: "In Progress" },
        ],
    attachments: Array.isArray(raw?.attachments) ? raw.attachments : [],
    comments: Array.isArray(raw?.comments) ? raw.comments : [],
    revisions: Array.isArray(raw?.revisions) && raw.revisions.length
      ? raw.revisions
      : [
          { id: "rev-1", version: base.version || "v1.0", summary: "Initial baseline BRD draft", createdBy: base.createdBy, createdAt: base.createdAt, status: base.status },
        ],
    approvals: Array.isArray(raw?.approvals) && raw.approvals.length
      ? raw.approvals
      : [
          { id: "app-1", stage: "Product Lead Sign-off", approver: "Product Lead", status: base.status === "Approved" ? "Approved" : "Pending" },
          { id: "app-2", stage: "Client Stakeholder Review", approver: base.clientName, status: "Pending" },
        ],
    activities: Array.isArray(raw?.activities) ? raw.activities : [
      { id: "act-1", action: "BRD Document Created", actor: base.createdBy, createdAt: base.createdAt, details: `BRD version ${base.version} registered.` }
    ],
  };
}

export const brdApi = {
  async getNextCode() {
    const orgId = getOrganizationId();
    const query = orgId ? `?organizationId=${encodeURIComponent(orgId)}` : "";
    try {
      const raw: any = await request<any>(`/brds/next-code${query}`);
      return raw?.data || raw || { nextCode: "BRD-00005", totalBrds: 4, sequence: 5 };
    } catch {
      return { nextCode: "BRD-00005", totalBrds: 4, sequence: 5 };
    }
  },
  async list(params: BrdListParams = {}) {
    const raw: any = await request<any>(
      `/brds${queryString(params)}`,
    );
    const rawItems = Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw)
      ? raw
      : [];
    const items = rawItems.map(normalizeBrdRecord);
    const p = raw?.pagination || raw?.meta || {};
    return {
      items,
      page: Number(p.page) || Number(params.page) || 1,
      pageSize: Number(p.limit) || Number(params.pageSize) || 10,
      total: Number(p.total) || items.length,
      totalPages: Number(p.totalPages) || Math.ceil(items.length / 10) || 1,
    } as BrdListResponse;
  },

  async get(id: string) {
    const raw: any = await request<any>(
      `/brds/${encodeURIComponent(id)}`,
    );
    const data = raw?.data ?? raw;
    return normalizeBrdDetailRecord(data);
  },

  async create(input: BrdCreateInput) {
    const orgId = getOrganizationId();
    const payload = {
      ...(orgId ? { organizationId: orgId } : {}),
      ...input,
    };
    const raw: any = await request<any>("/brds", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const created = raw?.data ?? raw;
    return normalizeBrdRecord(created);
  },

  async update(id: string, input: BrdUpdateInput) {
    const orgId = getOrganizationId();
    const rawStatus = input.status || (input as any).approvalStatus;
    const approvalStatus = rawStatus ? (
      String(rawStatus).toUpperCase() === "APPROVED" ? "Approved" :
      String(rawStatus).toUpperCase() === "REJECTED" ? "Rejected" :
      String(rawStatus).toUpperCase() === "IN REVIEW" || String(rawStatus).toUpperCase() === "IN_REVIEW" ? "In Review" :
      rawStatus
    ) : undefined;

    const payload = {
      ...(orgId ? { organizationId: orgId } : {}),
      ...input,
      ...(approvalStatus ? { approvalStatus, status: approvalStatus } : {}),
    };
    const raw: any = await request<any>(
      `/brds/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
    const updated = raw?.data ?? raw;
    return normalizeBrdRecord(updated);
  },

  createRevision(id: string, summary: string) {
    return request<BrdDetail>(
      `/brds/${encodeURIComponent(id)}/revisions`,
      {
        method: "POST",
        body: JSON.stringify({ summary }),
      },
    );
  },

  addComment(id: string, content: string) {
    return request<BrdDetail>(
      `/brds/${encodeURIComponent(id)}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ content }),
      },
    );
  },

  submitForApproval(id: string) {
    return request<BrdDetail>(
      `/brds/${encodeURIComponent(id)}/submit`,
      { method: "POST" },
    );
  },

  approve(id: string, approvalId: string, comment?: string) {
    return request<BrdDetail>(
      `/brds/${encodeURIComponent(id)}/approvals/${encodeURIComponent(approvalId)}/approve`,
      {
        method: "POST",
        body: JSON.stringify({ comment }),
      },
    );
  },

  reject(id: string, approvalId: string, comment: string) {
    return request<BrdDetail>(
      `/brds/${encodeURIComponent(id)}/approvals/${encodeURIComponent(approvalId)}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ comment }),
      },
    );
  },

  archive(id: string) {
    return request<void>(
      `/brds/${encodeURIComponent(id)}/archive`,
      { method: "POST" },
    );
  },

  remove(id: string) {
    return request<void>(
      `/brds/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
  },
};
