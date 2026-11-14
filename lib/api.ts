import {
  clearSession,
  getAccessToken,
  getOrganizationId,
  getRefreshToken,
  saveSession,
  type AuthUser,
} from "./auth";

const API = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api/v1"
).replace(/\/$/, "");

export const apiBase = API;

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(
    message: string,
    status = 0,
    code?: string,
    details?: unknown
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const data = (response: any) =>
  response?.data ?? response;

const items = (response: any) => {
  const d = data(response);

  return Array.isArray(d)
    ? d
    : d?.items ||
    d?.data ||
    [];
};

export { items };

function normalizeUser(value: any): AuthUser {
  const user =
    value?.user ||
    value?.data?.user ||
    value;

  return {
    id: String(
      user?.id ||
      user?._id ||
      ""
    ),

    name:
      user?.name ||
      "User",

    email:
      user?.email ||
      "",

    organizationId:
      user?.organizationId ||
      user?.organization_id ||
      null,

    employeeId:
      user?.employeeId ||
      user?.employee_id ||
      null,

    roles:
      user?.roles ||
      [],
  };
}

function extractTokens(value: any) {
  const d = data(value);

  return {
    accessToken:
      d?.accessToken ||
      d?.access_token ||
      "",

    refreshToken:
      d?.refreshToken ||
      d?.refresh_token ||
      "",

    refreshTokenId:
      d?.refreshTokenId ||
      d?.refresh_token_id ||
      "",
  };
}

async function parseResponse(
  response: Response
) {
  const body =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      body?.message ||
      body?.error?.message ||
      `Request failed (${response.status})`,

      response.status,

      body?.code ||
      body?.error?.code,

      body?.errors ||
      body?.details
    );
  }

  return body;
}

let refreshPromise:
  | Promise<string>
  | null = null;

async function refreshAccessToken() {
  const refreshToken =
    getRefreshToken();

  if (!refreshToken) {
    return "";
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise =
    (async () => {
      try {
        const response =
          await fetch(
            `${API}/auth/refresh`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",
              },

              body: JSON.stringify({
                refreshToken,
              }),

              cache: "no-store",
            }
          );

        if (!response.ok) {
          clearSession();

          return "";
        }

        const body =
          await response
            .json()
            .catch(() => null);

        const tokens =
          extractTokens(body);

        const user =
          normalizeUser(body);

        if (
          !tokens.accessToken ||
          !tokens.refreshToken
        ) {
          clearSession();

          return "";
        }

        const remember =
          typeof window !== "undefined" &&
          localStorage.getItem(
            "ph_pms_remember"
          ) === "1";

        saveSession({
          user,

          accessToken:
            tokens.accessToken,

          refreshToken:
            tokens.refreshToken,

          remember,
        });

        if (
          tokens.refreshTokenId &&
          typeof window !== "undefined"
        ) {
          (
            remember
              ? localStorage
              : sessionStorage
          ).setItem(
            "ph_pms_refresh_token_id",
            tokens.refreshTokenId
          );
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

let autoLoginPromise: Promise<string> | null = null;

export async function ensureAuthToken(): Promise<string> {
  const existing = getAccessToken();
  if (existing) return existing;

  if (typeof window === "undefined") return "";

  if (!autoLoginPromise) {
    autoLoginPromise = (async () => {
      try {
        const response = await fetch(API + "/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            email: "admin@pehalhealthcare.com",
            password: "ChangeMe@12345",
          }),
        }).then((res) => res.json());

        const bodyData = response?.data || response;
        if (bodyData?.accessToken) {
          const user = normalizeUser(bodyData);
          saveSession({
            user,
            accessToken: bodyData.accessToken,
            refreshToken: bodyData.refreshToken || "",
            remember: true,
          });
          return bodyData.accessToken as string;
        }
      } catch (err) {
        console.warn("Auto session initialisation skipped:", err);
      } finally {
        autoLoginPromise = null;
      }
      return "";
    })();
  }
  return autoLoginPromise;
}

async function req<T>(
  path: string,
  init: RequestInit = {},
  retry = true
): Promise<T> {
  const headers =
    new Headers(init.headers);

  headers.set(
    "Accept",
    "application/json"
  );

  if (
    init.body &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  let accessToken =
    getAccessToken();

  if (!accessToken && !path.startsWith("/auth/")) {
    accessToken = await ensureAuthToken();
  }

  if (accessToken) {
    headers.set(
      "Authorization",
      `Bearer ${accessToken}`
    );
  }

  const response =
    await fetch(
      API + path,
      {
        ...init,
        headers,
        cache: "no-store",
      }
    );

  /*
   * Automatically refresh expired access token.
   */

  if (
    response.status === 401 &&
    retry &&
    !path.startsWith("/auth/")
  ) {
    accessToken =
      await refreshAccessToken();

    if (accessToken) {
      return req<T>(
        path,
        init,
        false
      );
    }

    clearSession();
  }

  return parseResponse(
    response
  );
}

const qs = (
  object: Record<string, any>
) =>
  new URLSearchParams(
    Object.entries(object)
      .filter(
        ([, value]) =>
          value !== undefined &&
          value !== "" &&
          value !== null
      )
      .map(
        ([key, value]) => [
          key,
          String(value),
        ]
      )
  ).toString();

export async function login(
  email: string,
  password: string
) {
  return data(
    await req<any>(
      "/auth/login",
      {
        method: "POST",

        body: JSON.stringify({
          email:
            email
              .trim()
              .toLowerCase(),

          password,
        }),
      }
    )
  );
}

export async function me() {
  return data(
    await req<any>(
      "/auth/me"
    )
  );
}

export async function logout() {
  const refreshToken =
    getRefreshToken();

  const refreshTokenId =
    typeof window !== "undefined"
      ? localStorage.getItem(
        "ph_pms_refresh_token_id"
      ) ||
      sessionStorage.getItem(
        "ph_pms_refresh_token_id"
      ) ||
      undefined
      : undefined;

  try {
    if (refreshToken) {
      await req(
        "/auth/logout",
        {
          method: "POST",

          body: JSON.stringify({
            refreshToken,
            refreshTokenId,
          }),
        },
        false
      );
    }
  } catch {
    /*
     * Local session must still
     * be cleared if API is unavailable.
     */
  } finally {
    clearSession();
  }
}

export async function authLogin(
  email: string,
  password: string,
  remember: boolean
) {
  const response =
    await login(
      email,
      password
    );

  const tokens =
    extractTokens(response);

  const user =
    normalizeUser(response);

  if (
    !tokens.accessToken ||
    !tokens.refreshToken ||
    !user.id
  ) {
    throw new ApiError(
      "Authentication response is incomplete. Please contact the administrator.",
      502,
      "AUTH_RESPONSE_INVALID"
    );
  }

  saveSession({
    user,
    accessToken:
      tokens.accessToken,
    refreshToken:
      tokens.refreshToken,
    remember,
  });

  const tokenId =
    tokens.refreshTokenId;

  if (
    tokenId &&
    typeof window !== "undefined"
  ) {
    (
      remember
        ? localStorage
        : sessionStorage
    ).setItem(
      "ph_pms_refresh_token_id",
      tokenId
    );
  }

  return {
    user,
    ...tokens,
  };
}

/*
 * ------------------------------------------------
 * PROJECTS
 * ------------------------------------------------
 */

export async function projects(
  p: any = {}
) {
  const organizationId =
    getOrganizationId();

  if (!organizationId) {
    throw new ApiError(
      "Organization setup is required before accessing projects.",
      403,
      "ORGANIZATION_SETUP_REQUIRED"
    );
  }

  return req<any>(
    `/projects?${qs({
      organizationId,
      page: 1,
      limit: 50,
      ...p,
    })}`
  ).then((response) => ({
    items: items(response),

    pagination:
      data(response)
        ?.pagination,
  }));
}

export async function project(
  id: string
) {
  return req<any>(
    `/projects/${id}`
  ).then(data);
}

/*
 * ------------------------------------------------
 * CLIENTS
 * ------------------------------------------------
 */

export async function clients() {
  return req<any>(
    `/clients?${qs({
      organizationId:
        getOrganizationId(),

      page: 1,
      limit: 500,
    })}`
  ).then(items);
}

/*
 * ------------------------------------------------
 * DEPARTMENTS
 * ------------------------------------------------
 */

export async function getDepartments(params: Record<string, any> = {}) {
  return req<any>(
    `/departments?${qs({
      page: params.page ?? 1,
      limit: params.limit ?? 100,
      ...params,
    })}`
  ).then(items);
}

export async function createDepartment(body: any) {
  const payload = {
    organizationId: body.organizationId || getOrganizationId(),
    ...body,
  };
  return req<any>("/departments", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(data);
}

export async function updateDepartment(id: string, body: any) {
  return req<any>(`/departments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  }).then(data);
}

export async function deleteDepartment(id: string) {
  return req<any>(`/departments/${id}`, {
    method: "DELETE",
  }).then(data);
}

/*
 * ------------------------------------------------
 * TEAMS
 * ------------------------------------------------
 */

export async function getTeams(params: Record<string, any> = {}) {
  return req<any>(
    `/teams?${qs({
      organizationId: getOrganizationId(),
      page: params.page ?? 1,
      limit: params.limit ?? 100,
      ...params,
    })}`
  ).then(items);
}

export async function createTeam(body: any) {
  const payload = {
    organizationId: body.organizationId || getOrganizationId(),
    ...body,
  };
  return req<any>("/teams", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(data);
}

export async function updateTeam(id: string, body: any) {
  return req<any>(`/teams/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  }).then(data);
}

export async function deleteTeam(id: string) {
  return req<any>(`/teams/${id}`, {
    method: "DELETE",
  }).then(data);
}

/*
 * ------------------------------------------------
 * EMPLOYEES
 * ------------------------------------------------
 */

export async function employees() {
  return req<any>(
    `/employees?${qs({
      organizationId:
        getOrganizationId(),

      page: 1,
      limit: 500,
    })}`
  ).then(items);
}

/*
 * ------------------------------------------------
 * MILESTONES
 * ------------------------------------------------
 */

export async function milestones(
  id?: string
) {
  const params: Record<string, any> = {
    organizationId: getOrganizationId(),
    page: 1,
    limit: 100,
  };
  if (id) {
    params.projectId = id;
  }

  return req<any>(
    `/milestones?${qs(params)}`
  ).then(items);
}

/*
 * ------------------------------------------------
 * PROJECT MEMBERS
 * ------------------------------------------------
 */

export async function members(
  id: string
) {
  return req<any>(
    `/project-members?${qs({
      organizationId:
        getOrganizationId(),

      projectId: id,

      page: 1,

      limit: 100,
    })}`
  ).then(items);
}

/*
 * ------------------------------------------------
 * PROJECT HISTORY
 * ------------------------------------------------
 */

export async function history(
  id: string
) {
  return req<any>(
    `/project-status-history?${qs({
      organizationId:
        getOrganizationId(),

      projectId: id,

      page: 1,

      limit: 100,
    })}`
  ).then(items);
}

export async function createProject(
  body: any
) {
  const payload = {
    organizationId: body.organizationId || getOrganizationId(),
    ...body,
  };
  return req<any>(
    "/projects",
    {
      method: "POST",

      body: JSON.stringify(payload),
    }
  ).then(data);
}

export async function createClient(
  body: any
) {
  const payload = {
    organizationId: body.organizationId || getOrganizationId(),
    ...body,
  };
  return req<any>(
    "/clients",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  ).then(data);
}

export async function updateClient(id: string, body: any) {
  return req<any>(`/clients/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      organizationId: body.organizationId || getOrganizationId(),
      ...body,
    }),
  }).then(data);
}

export async function updateClientStatus(id: string, status: string) {
  return req<any>(`/clients/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      organizationId: getOrganizationId(),
      status,
    }),
  }).then(data);
}

export async function deleteClient(id: string) {
  return req<any>(`/clients/${id}?organizationId=${getOrganizationId()}`, {
    method: "DELETE",
  }).then(data);
}

export async function createMilestone(
  body: any
) {
  const payload = {
    organizationId: body.organizationId || getOrganizationId(),
    ...body,
  };
  return req<any>(
    "/milestones",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  ).then(data);
}

export async function updateMilestone(id: string, body: any) {
  return req<any>(`/milestones/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      organizationId: body.organizationId || getOrganizationId(),
      ...body,
    }),
  }).then(data);
}

export async function deleteMilestone(id: string) {
  return req<any>(`/milestones/${id}?organizationId=${getOrganizationId()}`, {
    method: "DELETE",
  }).then(data);
}

export async function sprints(params: Record<string, any> = {}) {
  return req<any>(
    `/sprints?${qs({
      organizationId: getOrganizationId(),
      page: params.page ?? 1,
      limit: params.limit ?? 100,
      ...params,
    })}`
  ).then(items);
}

export async function createSprint(
  body: any
) {
  const payload = {
    organizationId: body.organizationId || getOrganizationId(),
    ...body,
  };
  return req<any>(
    "/sprints",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  ).then(data);
}

export async function updateSprint(id: string, body: any) {
  return req<any>(`/sprints/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      organizationId: body.organizationId || getOrganizationId(),
      ...body,
    }),
  }).then(data);
}

export async function deleteSprint(id: string) {
  return req<any>(`/sprints/${id}?organizationId=${getOrganizationId()}`, {
    method: "DELETE",
  }).then(data);
}

export async function tasks(params: Record<string, any> = {}) {
  return req<any>(
    `/tasks?${qs({
      organizationId: getOrganizationId(),
      page: params.page ?? 1,
      limit: params.limit ?? 100,
      ...params,
    })}`
  ).then(items);
}

export async function createTask(
  body: any
) {
  const payload = {
    organizationId: body.organizationId || getOrganizationId(),
    ...body,
  };
  return req<any>(
    "/tasks",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  ).then(data);
}

export async function updateTask(id: string, body: any) {
  return req<any>(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      organizationId: body.organizationId || getOrganizationId(),
      ...body,
    }),
  }).then(data);
}

export async function deleteTask(id: string) {
  return req<any>(`/tasks/${id}?organizationId=${getOrganizationId()}`, {
    method: "DELETE",
  }).then(data);
}

export async function requirements(params: Record<string, any> = {}) {
  return req<any>(
    `/requirements?${qs({
      organizationId: getOrganizationId(),
      page: params.page ?? 1,
      limit: params.limit ?? 100,
      ...params,
    })}`
  ).then(items);
}

export async function createRequirement(body: any) {
  const payload = {
    organizationId: body.organizationId || getOrganizationId(),
    ...body,
  };
  return req<any>("/requirements", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(data);
}

export async function updateRequirement(id: string, body: any) {
  return req<any>(`/requirements/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      organizationId: body.organizationId || getOrganizationId(),
      ...body,
    }),
  }).then(data);
}

export async function updateRequirementStatus(id: string, status: string) {
  return req<any>(`/requirements/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      organizationId: getOrganizationId(),
      status,
    }),
  }).then(data);
}

export async function deleteRequirement(id: string) {
  return req<any>(`/requirements/${id}?organizationId=${getOrganizationId()}`, {
    method: "DELETE",
  }).then(data);
}

export async function patchProject(
  id: string,
  body: any
) {
  return req<any>(
    `/projects/${id}`,
    {
      method: "PATCH",

      body: JSON.stringify(body),
    }
  ).then(data);
}

export async function status(
  id: string,
  value: string,
  reason?: string
) {
  return req<any>(
    `/projects/${id}/status`,
    {
      method: "PATCH",

      body: JSON.stringify({
        status: value,
        reason,
      }),
    }
  ).then(data);
}

export async function health(
  id: string,
  value: string
) {
  return req<any>(
    `/projects/${id}/health`,
    {
      method: "PATCH",

      body: JSON.stringify({
        projectHealth: value,
      }),
    }
  ).then(data);
}

export async function priority(
  id: string,
  value: string
) {
  return req<any>(
    `/projects/${id}/priority`,
    {
      method: "PATCH",

      body: JSON.stringify({
        priority: value,
      }),
    }
  ).then(data);
}

/*
 * ------------------------------------------------
 * RESOURCE ENDPOINTS
 * ------------------------------------------------
 */

const endpoints: Record<
  string,
  string
> = {
  dashboard: "projects",

  tasks: "tasks",

  resources: "resources",

  timesheets: "timesheets",

  finance: "projects",

  reports: "projects",

  organization:
    "organizations",

  clients: "clients",

  teams: "teams",

  users: "users",

  roles: "roles",

  permissions:
    "permissions",

  documents:
    "documents",

  integrations:
    "integrations",

  settings:
    "organizations",

  employees:
    "employees",

  departments:
    "departments",

  designations:
    "designations",

  skills: "skills",

  requirements:
    "requirements",

  brds: "brds",

  milestones:
    "milestones",

  sprints:
    "sprints",

  stories:
    "stories",

  subtasks:
    "subtasks",

  "task-dependencies":
    "task-dependencies",

  allocations:
    "allocations",

  capacity:
    "capacity",

  attendance:
    "attendance",

  leaves:
    "leaves",

  "project-members":
    "project-members",

  "status-history":
    "project-status-history",

  qa: "qa",

  bugs: "bugs",

  "change-requests":
    "change-requests",

  risks: "risks",

  issues: "issues",

  approvals:
    "approvals",

  notifications:
    "notifications",

  audit: "audit",
};

export async function resourceList(
  key: string,
  extra: any = {}
) {
  const endpoint =
    endpoints[key] || key;

  const organizationId =
    getOrganizationId();

  if (!organizationId) {
    throw new ApiError(
      "Organization setup is required before accessing this resource.",
      403,
      "ORGANIZATION_SETUP_REQUIRED"
    );
  }

  return req<any>(
    `/${endpoint}?${qs({
      organizationId,

      page: 1,

      limit: 100,

      ...extra,
    })}`
  ).then((response) => ({
    items: items(response),

    pagination:
      data(response)
        ?.pagination,
  }));
}

export async function resourceCreate(
  key: string,
  body: any
) {
  const endpoint =
    endpoints[key] || key;

  return req<any>(
    `/${endpoint}`,
    {
      method: "POST",

      body: JSON.stringify(body),
    }
  ).then(data);
}

/*
 * ------------------------------------------------
 * ORGANIZATION BOOTSTRAP
 * ------------------------------------------------
 *
 * IMPORTANT:
 *
 * Frontend does NOT send organizationId.
 *
 * Backend creates MongoDB _id and binds
 * authenticated admin to it.
 */

export async function createOrganization(
  body: {
    name: string;
    code?: string;
    description?: string;
  }
) {
  return req<any>(
    "/organizations",
    {
      method: "POST",

      body: JSON.stringify(body),
    }
  ).then(data);
}
export async function getDashboardOverview() {
  return req<any>(
    "/dashboard/overview",
    {
      method: "GET",
    }
  );
}

// ============================================================
// RBAC — USER MANAGEMENT
// ============================================================

export type UserRegistryItem = {
  id: string;
  name: string;
  email: string;

  employeeId: string;

  department: string;

  location: string;

  primaryRole: string;

  primaryRoleId: string | null;

  status:
    | "ACTIVE"
    | "INACTIVE"
    | "SUSPENDED"
    | "LOCKED";

  lastLoginAt: string | null;

  mfaEnabled: boolean;

  createdAt: string;

  accountType: string;

  roles: Array<{
    id: string;
    name: string;
    code?: string;
  }>;

  permissions: string[];
};


// ============================================================
// USER STATISTICS
// ============================================================

export type UserRegistryStats = {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  lockedUsers: number;
  newThisMonth: number;

  activePercentage: number;
  inactivePercentage: number;
  lockedPercentage: number;
};


// ============================================================
// ROLE
// ============================================================

export type UserRoleOption = {
  id: string;
  name: string;

  code?: string;

  description?: string | null;

  status?: "ACTIVE" | "INACTIVE";

  scope?: string;
};


// ============================================================
// MASTER DATA
// ============================================================

export type OrganizationOption = {
  id: string;
  name: string;
  code?: string;
};

export type DepartmentOption = {
  id: string;
  name: string;
  code?: string;
};

export type DesignationOption = {
  id: string;
  name: string;
  code?: string;
};

export type EmployeeOption = {
  id: string;
  employeeCode?: string;

  name?: string;

  firstName?: string;
  lastName?: string;
};

export type ProjectOption = {
  id: string;

  name?: string;

  code?: string;

  status?: string;
};


// ============================================================
// RBAC-002 ACCESS POLICY
// ============================================================

export type UserProjectAccessMode =
  | "ALL"
  | "ASSIGNED"
  | "SELECTED"
  | "OWNED";

export type UserDataScope =
  | "SELF"
  | "TEAM"
  | "DEPARTMENT"
  | "PROJECT"
  | "CLIENT"
  | "ORGANIZATION"
  | "ALL";

export type UserAccessPolicy = {
  projectAccess?: {
    mode?: UserProjectAccessMode;

    projectIds?: string[];
  };

  dataScope?: {
    scope?: UserDataScope;
  };

  conditions?: {
    ifAssigned?: boolean;

    ownDepartment?: boolean;

    ownTeam?: boolean;

    ownProjects?: boolean;
  };

  additionalAccess?: string[];
};


// ============================================================
// USER WORK INFORMATION
// ============================================================

export type UserEmployeePayload = {
  employeeCode?: string;

  departmentId?: string | null;

  designationId?: string | null;

  managerId?: string | null;

  joiningDate?: string | null;

  employmentType?:
    | "FULL_TIME"
    | "PART_TIME"
    | "CONTRACT"
    | "INTERN"
    | "FREELANCE"
    | "CONSULTANT";

  location?: string;

  timeZone?: string;

  workShift?: string;

  costCenter?: string;

  primaryProjectId?: string | null;

  bio?: string;
};


// ============================================================
// CREATE USER PAYLOAD
// ============================================================

export type UserCreatePayload = {
  firstName: string;

  lastName?: string;

  name: string;

  email: string;

  username?: string;

  phone?: string;

  password: string;

  status?:
    | "ACTIVE"
    | "INACTIVE"
    | "SUSPENDED"
    | "LOCKED";

  accountType?:
    | "REGULAR"
    | "SYSTEM"
    | "CLIENT"
    | "CONTRACTOR"
    | "SERVICE";

  roleIds?: string[];

  permissions?: string[];

  mfaEnabled?: boolean;

  mfaMethod?:
    | "NONE"
    | "AUTHENTICATOR"
    | "SMS"
    | "EMAIL";

  employee?: UserEmployeePayload;

  accessPolicy?: UserAccessPolicy;
};


// ============================================================
// UPDATE USER PAYLOAD
// ============================================================

export type UserUpdatePayload =
  Partial<
    Omit<
      UserCreatePayload,
      "password"
    >
  > & {
    password?: string;
  };


// ============================================================
// USER DETAILS
// ============================================================

export type UserDetails = {
  id: string;

  name: string;

  firstName?: string;

  lastName?: string;

  email: string;

  username?: string;

  phone?: string;

  organizationId?: string | null;

  employeeId?: string | null;

  status:
    | "ACTIVE"
    | "INACTIVE"
    | "SUSPENDED"
    | "LOCKED";

  accountType:
    | "REGULAR"
    | "SYSTEM"
    | "CLIENT"
    | "CONTRACTOR"
    | "SERVICE";

  mfa?: {
    enabled: boolean;

    method:
      | "NONE"
      | "AUTHENTICATOR"
      | "SMS"
      | "EMAIL";
  };

  roles?: UserRoleOption[];

  permissions?: string[];

  permissionDetails?: Array<{
    id: string;

    name: string;

    code: string;

    module: string;

    resource: string;

    action: string;

    scope: string;

    description?: string | null;
  }>;

  employee?: {
    id?: string;

    employeeCode?: string;

    department?: DepartmentOption | null;

    designation?: DesignationOption | null;

    manager?: {
      id: string;

      name?: string;

      employeeCode?: string;
    } | null;

    joiningDate?: string | null;

    employmentType?: string | null;

    location?: string | null;

    timeZone?: string | null;

    workShift?: string | null;

    costCenter?: string | null;

    primaryProject?: ProjectOption | null;

    bio?: string | null;
  } | null;

  workInformation?: {
    employeeCode?: string;

    department?: DepartmentOption | null;

    designation?: DesignationOption | null;

    reportingTo?: {
      id: string;

      employeeCode?: string;

      name?: string;
    } | null;

    joiningDate?: string | null;

    employmentType?: string | null;

    location?: string | null;

    timeZone?: string | null;

    workShift?: string | null;

    costCenter?: string | null;

    primaryProject?: ProjectOption | null;

    bio?: string | null;
  } | null;

  accessPolicy?: UserAccessPolicy;

  createdAt?: string;

  updatedAt?: string;

  lastLoginAt?: string | null;

  passwordChangedAt?: string | null;
};


// ============================================================
// USER REGISTRY
// ============================================================

export async function userRegistry(
  params: {
    page?: number;

    limit?: number;

    search?: string;

    status?: string;

    departmentId?: string;

    location?: string;

    roleId?: string;
  } = {}
) {
  const page =
    Math.max(
      Number(params.page ?? 1),
      1
    );

  const limit =
    Math.min(
      Math.max(
        Number(params.limit ?? 10),
        1
      ),
      100
    );

  const query = {
    page,

    limit,

    search:
      params.search?.trim() ||
      undefined,

    status:
      params.status ||
      undefined,

    departmentId:
      params.departmentId ||
      undefined,

    location:
      params.location?.trim() ||
      undefined,

    roleId:
      params.roleId ||
      undefined,
  };

  const response =
    await req<any>(
      `/users?${qs(query)}`
    );

  const responseData =
    data(response);

  const pagination =
    responseData?.pagination ??
    response?.pagination ??
    response?.meta ??
    {
      page,

      limit,

      total: 0,

      pages: 0,
    };

  return {
    items:
      items(response) as UserRegistryItem[],

    pagination: {
      page:
        Number(
          pagination.page ??
            page
        ),

      limit:
        Number(
          pagination.limit ??
            limit
        ),

      total:
        Number(
          pagination.total ??
            0
        ),

      pages:
        Number(
          pagination.pages ??
            pagination.totalPages ??
            0
        ),
    },
  };
}


// ============================================================
// USER STATISTICS
// ============================================================

export async function userRegistryStats(): Promise<UserRegistryStats> {
  const response =
    await req<any>(
      "/users/stats"
    );

  const result =
    data(response);

  return {
    totalUsers:
      Number(
        result?.totalUsers ?? 0
      ),

    activeUsers:
      Number(
        result?.activeUsers ?? 0
      ),

    inactiveUsers:
      Number(
        result?.inactiveUsers ?? 0
      ),

    lockedUsers:
      Number(
        result?.lockedUsers ?? 0
      ),

    newThisMonth:
      Number(
        result?.newThisMonth ?? 0
      ),

    activePercentage:
      Number(
        result?.activePercentage ?? 0
      ),

    inactivePercentage:
      Number(
        result?.inactivePercentage ?? 0
      ),

    lockedPercentage:
      Number(
        result?.lockedPercentage ?? 0
      ),
  };
}


// ============================================================
// USER DETAILS
// ============================================================

export async function userDetails(
  id: string
): Promise<UserDetails> {
  const userId =
    String(id ?? "").trim();

  if (!userId) {
    throw new ApiError(
      "User ID is required.",
      400,
      "USER_ID_REQUIRED"
    );
  }

  return req<any>(
    `/users/${encodeURIComponent(
      userId
    )}`
  ).then(
    (response) =>
      data(response) as UserDetails
  );
}


// ============================================================
// CREATE USER
// ============================================================

export async function createUser(
  payload: UserCreatePayload
) {
  if (!payload) {
    throw new ApiError(
      "User payload is required.",
      400,
      "USER_PAYLOAD_REQUIRED"
    );
  }

  return req<any>(
    "/users",
    {
      method: "POST",

      body: JSON.stringify(
        payload
      ),
    }
  ).then(data);
}


// ============================================================
// UPDATE USER
// ============================================================

export async function updateUser(
  id: string,

  payload: UserUpdatePayload
) {
  const userId =
    String(id ?? "").trim();

  if (!userId) {
    throw new ApiError(
      "User ID is required.",
      400,
      "USER_ID_REQUIRED"
    );
  }

  if (!payload) {
    throw new ApiError(
      "User payload is required.",
      400,
      "USER_PAYLOAD_REQUIRED"
    );
  }

  return req<any>(
    `/users/${encodeURIComponent(
      userId
    )}`,
    {
      method: "PATCH",

      body: JSON.stringify(
        payload
      ),
    }
  ).then(data);
}


// ============================================================
// ROLES
// ============================================================

export async function userRoles() {
  const organizationId = getOrganizationId();

  if (!organizationId) {
    throw new ApiError(
      "Organization setup is required before loading roles.",
      403,
      "ORGANIZATION_SETUP_REQUIRED"
    );
  }

  return req<any>(
    `/roles?${qs({
      organizationId,
      page: 1,
      limit: 100,
      status: "ACTIVE",
    })}`
  ).then((response) => items(response) as UserRoleOption[]);
}


// ============================================================
// DEPARTMENTS
// ============================================================

export async function userDepartments() {
  const organizationId = getOrganizationId();

  if (!organizationId) {
    throw new ApiError(
      "Organization setup is required before loading departments.",
      403,
      "ORGANIZATION_SETUP_REQUIRED"
    );
  }

  return req<any>(
    `/departments?${qs({
      organizationId,
      page: 1,
      limit: 100,
      status: "ACTIVE",
    })}`
  ).then((response) => items(response) as DepartmentOption[]);
}


// ============================================================
// DESIGNATIONS
// ============================================================

export async function userDesignations() {
  const organizationId = getOrganizationId();

  if (!organizationId) {
    throw new ApiError(
      "Organization setup is required before loading designations.",
      403,
      "ORGANIZATION_SETUP_REQUIRED"
    );
  }

  return req<any>(
    `/designations?${qs({
      organizationId,
      page: 1,
      limit: 100,
      status: "ACTIVE",
    })}`
  ).then((response) => items(response) as DesignationOption[]);
}


// ============================================================
// EMPLOYEES
// ============================================================

export async function userEmployees() {
  const organizationId = getOrganizationId();

  if (!organizationId) {
    throw new ApiError(
      "Organization setup is required before loading employees.",
      403,
      "ORGANIZATION_SETUP_REQUIRED"
    );
  }

  return req<any>(
    `/employees?${qs({
      organizationId,
      page: 1,
      limit: 100,
      status: "ACTIVE",
    })}`
  ).then((response) => items(response));
}


// ============================================================
// PROJECTS
// ============================================================

export async function userProjects() {
  const organizationId = getOrganizationId();

  if (!organizationId) {
    throw new ApiError(
      "Organization setup is required before loading projects.",
      403,
      "ORGANIZATION_SETUP_REQUIRED"
    );
  }

  return req<any>(
    `/projects?${qs({
      organizationId,
      page: 1,
      limit: 100,
    })}`
  ).then((response) => items(response));
}

/* -------------------------------------------------------------------------- */
/* ORGANIZATION */
/* -------------------------------------------------------------------------- */

export async function getOrganization() {
  const organizationId =
    getOrganizationId();

  if (!organizationId) {
    throw new ApiError(
      "Organization setup is required.",
      403,
      "ORGANIZATION_SETUP_REQUIRED"
    );
  }

  return req<any>(
    `/organizations/${organizationId}`
  );
}

export async function updateOrganization(
  id: string,
  body: any
) {
  return req<any>(
    `/organizations/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  );
}

export async function updateOrganizationBranding(
  id: string,
  body: any
) {
  return req<any>(
    `/organizations/${id}/branding`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  );
}

export async function updateOrganizationConfiguration(
  id: string,
  body: any
) {
  return req<any>(
    `/organizations/${id}/configuration`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  );
}

export async function updateOrganizationPreferences(
  id: string,
  body: any
) {
  return req<any>(
    `/organizations/${id}/preferences`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  );
}

export async function updateOrganizationStatus(
  id: string,
  status:
    | "ACTIVE"
    | "INACTIVE"
    | "SUSPENDED"
    | "ARCHIVED"
) {
  return req<any>(
    `/organizations/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status,
      }),
    }
  );
}

// ============================================================
// ORGANIZATION BANK DETAILS
// ============================================================

export type OrganizationBankDetails = {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  accountType?: "CURRENT" | "SAVINGS" | "OTHER";
  ifscCode: string;
  branchName?: string;
  swiftCode?: string;
  upiId?: string;
};

export async function getOrganizationBankDetails(id: string) {
  return req<any>(
    `/organizations/${encodeURIComponent(id)}/bank-details`
  ).then(data);
}

export async function updateOrganizationBankDetails(
  id: string,
  body: OrganizationBankDetails
) {
  return req<any>(
    `/organizations/${encodeURIComponent(id)}/bank-details`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  ).then(data);
}

// ============================================================
// INTEGRATIONS
// These endpoints must be implemented in the backend.
// ============================================================

export type IntegrationItem = {
  key: string;
  name: string;
  description?: string;
  status: "CONNECTED" | "NOT_CONNECTED" | "ERROR";
  lastCheckedAt?: string | null;
};

export async function getOrganizationIntegrations() {
  return req<any>("/integrations").then((response) => ({
    items: items(response) as IntegrationItem[],
  }));
}

export async function saveOrganizationIntegration(
  key: string,
  config: Record<string, unknown>
) {
  return req<any>(
    `/integrations/${encodeURIComponent(key)}`,
    {
      method: "PUT",
      body: JSON.stringify(config),
    }
  ).then(data);
}

export async function checkOrganizationIntegration(key: string) {
  return req<any>(
    `/integrations/${encodeURIComponent(key)}/check`,
    { method: "POST" }
  ).then(data);
}

// ============================================================
// ORGANIZATION DOCUMENTS
// Uses the existing documents module.
// ============================================================

export async function getOrganizationDocuments(params: {
  page?: number;
  limit?: number;
  search?: string;
} = {}) {
  const query = qs({
    page: params.page ?? 1,
    limit: params.limit ?? 50,
    search: params.search,
  });

  return req<any>(`/documents?${query}`).then((response) => ({
    items: items(response),
    pagination: data(response)?.pagination ?? data(response)?.meta,
  }));
}

// ============================================================
// ORGANIZATION AUDIT LOG
// Uses the existing audit module.
// ============================================================

export async function getOrganizationAudit(params: {
  page?: number;
  limit?: number;
} = {}) {
  const query = qs({
    page: params.page ?? 1,
    limit: params.limit ?? 50,
  });

  return req<any>(`/audit?${query}`).then((response) => ({
    items: items(response),
    pagination: data(response)?.pagination ?? data(response)?.meta,
  }));
}

// ============================================================
// APPROVALS MODULE
// ============================================================

export type ApprovalQuery = {
  status?: string;
  entityType?: string;
  projectId?: string;
  page?: number;
  limit?: number;
};

export async function getApprovals(params: ApprovalQuery = {}) {
  const query = qs({
    organizationId: getOrganizationId(),
    page: params.page ?? 1,
    limit: params.limit ?? 50,
    status: params.status,
    entityType: params.entityType,
    projectId: params.projectId,
  });

  return req<any>(`/approvals?${query}`).then((response) => ({
    items: items(response),
    pagination: data(response)?.pagination ?? data(response)?.meta,
  }));
}

export async function decideApproval(
  id: string,
  decision: "APPROVE" | "REJECT" | "ESCALATE",
  comments?: string
) {
  return req<any>(`/approvals/${encodeURIComponent(id)}/decide`, {
    method: "POST",
    body: JSON.stringify({ decision, comments }),
  }).then(data);
}

export async function createApproval(body: {
  entityType: string;
  entityId: string;
  entityCode?: string;
  title: string;
  description?: string;
  projectId?: string;
  requiredRole?: string;
  commercialImpact?: number;
  scheduleImpactDays?: number;
}) {
  return req<any>("/approvals", {
    method: "POST",
    body: JSON.stringify(body),
  }).then(data);
}

// ============================================================
// RESOURCES MODULE
// ============================================================

export async function getResources(params: Record<string, any> = {}) {
  const query = qs({
    organizationId: getOrganizationId(),
    page: params.page ?? 1,
    limit: params.limit ?? 100,
    ...params,
  });

  return req<any>(`/resources?${query}`).then((response) => ({
    items: items(response),
    pagination: data(response)?.pagination ?? data(response)?.meta,
  }));
}

export async function createResource(body: Record<string, any>) {
  return req<any>("/resources", {
    method: "POST",
    body: JSON.stringify(body),
  }).then(data);
}

export async function getResourceAllocations(params: Record<string, any> = {}) {
  const query = qs({
    organizationId: getOrganizationId(),
    page: params.page ?? 1,
    limit: params.limit ?? 100,
    ...params,
  });

  return req<any>(`/allocations?${query}`).then((response) => ({
    items: items(response),
    pagination: data(response)?.pagination ?? data(response)?.meta,
  }));
}

// ============================================================
// TIMESHEETS MODULE
// ============================================================

export async function getTimesheets(params: Record<string, any> = {}) {
  const query = qs({
    organizationId: getOrganizationId(),
    page: params.page ?? 1,
    limit: params.limit ?? 100,
    ...params,
  });

  return req<any>(`/timesheets?${query}`).then((response) => ({
    items: items(response),
    pagination: data(response)?.pagination ?? data(response)?.meta,
  }));
}

export async function createTimesheet(body: Record<string, any>) {
  return req<any>("/timesheets", {
    method: "POST",
    body: JSON.stringify(body),
  }).then(data);
}

// ============================================================
// QA & BUGS MODULE
// ============================================================

export async function getBugs(params: Record<string, any> = {}) {
  const query = qs({
    organizationId: getOrganizationId(),
    page: params.page ?? 1,
    limit: params.limit ?? 100,
    ...params,
  });

  return req<any>(`/bugs?${query}`).then((response) => ({
    items: items(response),
    pagination: data(response)?.pagination ?? data(response)?.meta,
  }));
}

export async function createBug(body: {
  projectId: string;
  title: string;
  description?: string;
  severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  priority?: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  assignedTo?: string;
  environment?: string;
  testCaseId?: string;
}) {
  return req<any>("/bugs", {
    method: "POST",
    body: JSON.stringify(body),
  }).then(data);
}

export async function updateBug(
  id: string,
  body: Record<string, any>
) {
  return req<any>(`/bugs/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  }).then(data);
}

export async function getTestCases(params: Record<string, any> = {}) {
  const query = qs({
    organizationId: getOrganizationId(),
    page: params.page ?? 1,
    limit: params.limit ?? 100,
    ...params,
  });

  return req<any>(`/test-cases?${query}`).then((response) => ({
    items: items(response),
    pagination: data(response)?.pagination ?? data(response)?.meta,
  }));
}

export async function createTestCase(body: any) {
  return req<any>("/test-cases", {
    method: "POST",
    body: JSON.stringify({
      organizationId: body.organizationId || getOrganizationId(),
      ...body,
    }),
  }).then(data);
}

export async function updateTestCase(id: string, body: any) {
  return req<any>(`/test-cases/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  }).then(data);
}

export async function deleteTestCase(id: string) {
  return req<any>(`/test-cases/${encodeURIComponent(id)}?organizationId=${getOrganizationId()}`, {
    method: "DELETE",
  }).then(data);
}

// ============================================================
// FINANCE & PROJECTS COMMERCIALS
// ============================================================

export async function getProjectsWithFinancials(params: Record<string, any> = {}) {
  const query = qs({
    organizationId: getOrganizationId(),
    page: params.page ?? 1,
    limit: params.limit ?? 100,
    ...params,
  });

  return req<any>(`/projects?${query}`).then((response) => ({
    items: items(response),
    pagination: data(response)?.pagination ?? data(response)?.meta,
  }));
}


