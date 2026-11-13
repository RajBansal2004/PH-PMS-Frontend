import type {
  ApiErrorBody,
  BrdCreateInput,
  BrdDetail,
  BrdListParams,
  BrdListResponse,
  BrdRecord,
  BrdUpdateInput,
} from "./types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "/api/v1"
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

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });

  const result = search.toString();

  return result ? `?${result}` : "";
}

export const brdApi = {
  list(params: BrdListParams = {}) {
    return request<BrdListResponse>(
      `/brds${queryString(params)}`,
    );
  },

  get(id: string) {
    return request<BrdDetail>(
      `/brds/${encodeURIComponent(id)}`,
    );
  },

  create(input: BrdCreateInput) {
    return request<BrdRecord>("/brds", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  update(id: string, input: BrdUpdateInput) {
    return request<BrdRecord>(
      `/brds/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    );
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