import { clearSession, getAccessToken, getOrganizationId, getRefreshToken, saveSession, type AuthUser } from "./auth";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1").replace(/\/$/, "");
export const apiBase = API;

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  constructor(message: string, status = 0, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const data = (r: any) => r?.data ?? r;
const items = (r: any) => {
  const d = data(r);
  return Array.isArray(d) ? d : d?.items || d?.data || [];
};
export { items };

function normalizeUser(value: any): AuthUser {
  const u = value?.user || value?.data?.user || value;
  return {
    id: String(u?.id || u?._id || ""),
    name: u?.name || "User",
    email: u?.email || "",
    organizationId: u?.organizationId || u?.organization_id || null,
    employeeId: u?.employeeId || u?.employee_id || null,
    roles: u?.roles || [],
  };
}

function extractTokens(value: any) {
  const d = data(value);
  return {
    accessToken: d?.accessToken || d?.access_token || "",
    refreshToken: d?.refreshToken || d?.refresh_token || "",
    refreshTokenId: d?.refreshTokenId || d?.refresh_token_id || "",
  };
}

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      body?.message || body?.error?.message || `Request failed (${response.status})`,
      response.status,
      body?.code || body?.error?.code,
      body?.errors || body?.details,
    );
  }
  return body;
}

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return "";
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
      });
      if (!response.ok) {
        clearSession();
        return "";
      }
      const body = await response.json().catch(() => null);
      const tokens = extractTokens(body);
      const user = normalizeUser(body);
      if (!tokens.accessToken || !tokens.refreshToken) {
        clearSession();
        return "";
      }
      const remember = typeof window !== "undefined" && localStorage.getItem("ph_pms_remember") === "1";
      saveSession({ user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, remember });
      if (tokens.refreshTokenId && typeof window !== "undefined") {
        (remember ? localStorage : sessionStorage).setItem("ph_pms_refresh_token_id", tokens.refreshTokenId);
      }
      return tokens.accessToken;
    } catch {
      clearSession();
      return "";
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function refreshSession() {
  return refreshAccessToken();
}

async function req<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let accessToken = getAccessToken();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(API + path, { ...init, headers, cache: "no-store" });

  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    accessToken = await refreshAccessToken();
    if (accessToken) return req<T>(path, init, false);
    clearSession();
  }

  return parseResponse(response);
}

const qs = (o: Record<string, any>) =>
  new URLSearchParams(
    Object.entries(o)
      .filter(([, v]) => v !== undefined && v !== "" && v !== null)
      .map(([k, v]) => [k, String(v)]),
  ).toString();

export async function login(email: string, password: string) {
  return data(await req<any>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  }));
}

export async function me() {
  return data(await req<any>("/auth/me"));
}

export async function logout() {
  const refreshToken = getRefreshToken();
  const refreshTokenId = typeof window !== "undefined"
    ? localStorage.getItem("ph_pms_refresh_token_id") || sessionStorage.getItem("ph_pms_refresh_token_id") || undefined
    : undefined;
  try {
    if (refreshToken) {
      await req("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken, refreshTokenId }),
      }, false);
    }
  } catch {
    // Local session is always cleared even if the server is unavailable.
  } finally {
    clearSession();
  }
}

export async function authLogin(email: string, password: string, remember: boolean) {
  const response = await login(email, password);
  const tokens = extractTokens(response);
  const user = normalizeUser(response);
  if (!tokens.accessToken || !tokens.refreshToken || !user.id) {
    throw new ApiError("Authentication response is incomplete. Please contact the administrator.", 502, "AUTH_RESPONSE_INVALID");
  }
  saveSession({ user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, remember });
  const tokenId = tokens.refreshTokenId;
  if (tokenId && typeof window !== "undefined") {
    (remember ? localStorage : sessionStorage).setItem("ph_pms_refresh_token_id", tokenId);
  }
  return { user, ...tokens };
}

export async function projects(p: any = {}) {
  const organizationId = getOrganizationId();
  if (!organizationId) throw new ApiError("Organization setup is required before accessing projects.", 403, "ORGANIZATION_SETUP_REQUIRED");
  return req<any>(`/projects?${qs({ organizationId, page: 1, limit: 50, ...p })}`).then((r) => ({ items: items(r), pagination: data(r)?.pagination }));
}
export async function project(id: string) { return req<any>(`/projects/${id}`).then(data); }
export async function clients() { return req<any>(`/clients?${qs({ organizationId: getOrganizationId(), page: 1, limit: 500 })}`).then(items); }
export async function employees() { return req<any>(`/employees?${qs({ organizationId: getOrganizationId(), page: 1, limit: 500 })}`).then(items); }
export async function milestones(id: string) { return req<any>(`/milestones?${qs({ organizationId: getOrganizationId(), projectId: id, page: 1, limit: 100 })}`).then(items); }
export async function members(id: string) { return req<any>(`/project-members?${qs({ organizationId: getOrganizationId(), projectId: id, page: 1, limit: 100 })}`).then(items); }
export async function history(id: string) { return req<any>(`/project-status-history?${qs({ organizationId: getOrganizationId(), projectId: id, page: 1, limit: 100 })}`).then(items); }
export async function createProject(body: any) { return req<any>(`/projects`, { method: "POST", body: JSON.stringify(body) }).then(data); }
export async function patchProject(id: string, body: any) { return req<any>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) }).then(data); }
export async function status(id: string, v: string, reason?: string) { return req<any>(`/projects/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: v, reason }) }).then(data); }
export async function health(id: string, v: string) { return req<any>(`/projects/${id}/health`, { method: "PATCH", body: JSON.stringify({ projectHealth: v }) }).then(data); }
export async function priority(id: string, v: string) { return req<any>(`/projects/${id}/priority`, { method: "PATCH", body: JSON.stringify({ priority: v }) }).then(data); }

const endpoints: Record<string, string> = {
  dashboard: "projects", tasks: "tasks", resources: "resources", timesheets: "timesheets", finance: "projects", reports: "projects",
  organization: "organizations", clients: "clients", teams: "teams", users: "users", roles: "roles", permissions: "permissions",
  documents: "documents", integrations: "integrations", settings: "organizations", employees: "employees", departments: "departments",
  designations: "designations", skills: "skills", requirements: "requirements", brds: "brds", milestones: "milestones", sprints: "sprints",
  stories: "stories", subtasks: "subtasks", "task-dependencies": "task-dependencies", allocations: "allocations", capacity: "capacity",
  attendance: "attendance", leaves: "leaves", "project-members": "project-members", "status-history": "project-status-history",
  qa: "qa", bugs: "bugs", "change-requests": "change-requests", risks: "risks", issues: "issues", approvals: "approvals", notifications: "notifications", audit: "audit",
};
export async function resourceList(key: string, extra: any = {}) {
  const ep = endpoints[key] || key;
  const organizationId = getOrganizationId();
  if (!organizationId) throw new ApiError("Organization setup is required before accessing this resource.", 403, "ORGANIZATION_SETUP_REQUIRED");
  return req<any>(`/${ep}?${qs({ organizationId, page: 1, limit: 100, ...extra })}`).then((r) => ({ items: items(r), pagination: data(r)?.pagination }));
}
export async function resourceCreate(key: string, body: any) {
  const ep = endpoints[key] || key;
  return req<any>(`/${ep}`, { method: "POST", body: JSON.stringify(body) }).then(data);
}
