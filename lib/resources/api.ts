import { getAccessToken, getOrganizationId } from "@/lib/auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api/v1";

export function isValidObjectId(value: unknown): boolean {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value.trim());
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

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
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

export interface ResourceSkill {
  skill: string;
  level: number;
  experienceMonths?: number;
  lastUsed?: string | null;
}

export interface ResourceCert {
  name: string;
  issuer?: string;
  issueDate?: string | null;
  credentialId?: string;
}

export interface ResourceItem {
  _id: string;
  id: string;
  employeeId: string;
  name: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  email: string;
  phone: string;
  alternatePhone: string;
  location: string;
  workMode: "ONSITE" | "HYBRID" | "REMOTE";
  timeZone: string;
  aboutMe: string;
  avatarUrl: string;
  reportingManagerName: string;
  dateOfJoining: string | null;
  departmentId: string | null;
  departmentName: string;
  designationId: string | null;
  designationName: string;
  primarySkill: string;
  secondarySkills: string[];
  skillsMatrix: ResourceSkill[];
  certifications: ResourceCert[];
  languages: string[];
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "FREELANCER" | "INTERN" | "CONSULTANT";
  workingHoursPerDay: number;
  workingDaysPerWeek: number;
  workingDays: string[];
  monthlyCapacityHours: number;
  availabilityPercent: number;
  currentAllocationPercent: number;
  allocationStatus: "GREEN" | "AMBER" | "RED";
  hourlyCost: number;
  billingRate: number;
  activeProjectsCount: number;
  status: "ACTIVE" | "ON_LEAVE" | "BENCH" | "INACTIVE";
  benchSince: string | null;
  benchReason: string;
  availableFrom: string | null;
  expectedAllocationDate: string | null;
  noticePeriodDays: number;
  availabilityNotes: string;
  documents: { name: string; type: string; url: string; uploadedAt: string }[];
  preferences: {
    allowOverAllocation: boolean;
    emailNotifications: boolean;
    autoAcceptTasks: boolean;
  };
  allocations?: AllocationItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AllocationItem {
  _id: string;
  id: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  projectStatus?: string;
  clientName?: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  employeeEmail: string;
  employeeAvatarUrl: string;
  role: string;
  allocationType: "FULL_TIME" | "PART_TIME" | "HOURLY" | "CONTRACT";
  billingType: "BILLABLE" | "INTERNAL" | "NON_BILLABLE" | "SHADOW";
  monthlyCost: number;
  workingDays: string[];
  activityType: "ALLOCATION" | "LEAVE" | "MEETING" | "TRAINING" | "OTHER";
  taskActivity: string;
  startDate: string | null;
  endDate: string | null;
  allocatedHours: number;
  allocationPercent: number;
  status: "ACTIVE" | "PLANNED" | "PENDING_APPROVAL" | "REJECTED" | "COMPLETED" | "RELEASED" | "CANCELLED";
  notes: string;
  isOverAllocationOverride?: boolean;
  projectedUtilizationPercent?: number;
  overrideJustification?: string;
  overrideImpactAssessment?: string;
  overrideStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  approvalId?: string | null;
  overrideApprovedBy?: string | null;
  overrideApprovedAt?: string | null;
  overrideDecisionComments?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveItem {
  _id: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
}

export interface ProjectLite {
  _id: string;
  projectCode: string;
  projectName: string;
  clientName?: string;
  status?: string;
  progress?: number;
  startDate?: string;
  endDate?: string;
}

export interface DepartmentLite {
  _id: string;
  name: string;
  code?: string;
}

export interface DesignationLite {
  _id: string;
  name: string;
  title?: string;
  level?: number;
}

export function normalizeResource(raw: any): ResourceItem {
  const emp = raw?.employeeId && typeof raw.employeeId === "object" ? raw.employeeId : {};
  const dept = raw?.departmentId && typeof raw.departmentId === "object" ? raw.departmentId : {};
  const desig = raw?.designationId && typeof raw.designationId === "object" ? raw.designationId : {};

  const firstName = emp.firstName || raw?.firstName || "";
  const lastName = emp.lastName || raw?.lastName || "";
  const fullName =
    emp.displayName ||
    emp.name ||
    `${firstName} ${lastName}`.trim() ||
    raw?.name ||
    emp.email ||
    "Unnamed Resource";

  const currentAlloc = Number(raw?.currentAllocationPercent ?? 0);
  const avail = raw?.availabilityPercent != null ? Number(raw.availabilityPercent) : Math.max(0, 100 - currentAlloc);
  const allocStatus: "GREEN" | "AMBER" | "RED" =
    currentAlloc > 100 ? "RED" : currentAlloc > 80 ? "AMBER" : "GREEN";

  return {
    _id: String(raw?._id || emp?._id || ""),
    id: String(raw?._id || emp?._id || ""),
    employeeId: String(emp?._id || raw?.employeeId || raw?._id || ""),
    name: fullName,
    firstName,
    lastName,
    employeeCode: emp.employeeCode || raw?.employeeCode || "",
    email: emp.email || raw?.email || "",
    phone: raw?.phone || emp.phone || "",
    alternatePhone: raw?.alternatePhone || "",
    location: raw?.location || emp.location || "",
    workMode: raw?.workMode || "HYBRID",
    timeZone: raw?.timeZone || emp.timeZone || "Asia/Kolkata",
    aboutMe: raw?.aboutMe || emp.bio || "",
    avatarUrl: raw?.avatarUrl || emp.avatarUrl || "",
    reportingManagerName: raw?.reportingManagerName || "",
    dateOfJoining: raw?.dateOfJoining || emp.joiningDate || raw?.createdAt || null,
    departmentId: dept?._id ? String(dept._id) : typeof raw?.departmentId === "string" ? raw.departmentId : null,
    departmentName: dept?.name || raw?.departmentName || "Unassigned",
    designationId: desig?._id ? String(desig._id) : typeof raw?.designationId === "string" ? raw.designationId : null,
    designationName: desig?.name || desig?.title || raw?.designationName || "Team Member",
    primarySkill: raw?.primarySkill || "",
    secondarySkills: Array.isArray(raw?.secondarySkills) ? raw.secondarySkills : [],
    skillsMatrix: Array.isArray(raw?.skillsMatrix) ? raw.skillsMatrix : [],
    certifications: Array.isArray(raw?.certifications) ? raw.certifications : [],
    languages: Array.isArray(raw?.languages) && raw.languages.length ? raw.languages : ["English"],
    employmentType: raw?.employmentType || emp.employmentType || "FULL_TIME",
    workingHoursPerDay: Number(raw?.workingHoursPerDay || 8),
    workingDaysPerWeek: Number(raw?.workingDaysPerWeek || 5),
    workingDays:
      Array.isArray(raw?.workingDays) && raw.workingDays.length
        ? raw.workingDays
        : ["Mon", "Tue", "Wed", "Thu", "Fri"],
    monthlyCapacityHours: Number(raw?.monthlyCapacityHours || 160),
    availabilityPercent: avail,
    currentAllocationPercent: currentAlloc,
    allocationStatus: raw?.allocationStatus || allocStatus,
    hourlyCost: Number(raw?.hourlyCost ?? emp.hourlyCostRate ?? 0),
    billingRate: Number(raw?.billingRate ?? emp.billingRate ?? 0),
    activeProjectsCount: Number(raw?.activeProjectsCount ?? 0),
    status: raw?.status || (currentAlloc === 0 ? "BENCH" : "ACTIVE"),
    benchSince: raw?.benchSince || null,
    benchReason: raw?.benchReason || "",
    availableFrom: raw?.availableFrom || null,
    expectedAllocationDate: raw?.expectedAllocationDate || null,
    noticePeriodDays: Number(raw?.noticePeriodDays ?? 30),
    availabilityNotes: raw?.availabilityNotes || "",
    documents: Array.isArray(raw?.documents) ? raw.documents : [],
    preferences: {
      allowOverAllocation: Boolean(raw?.preferences?.allowOverAllocation),
      emailNotifications: raw?.preferences?.emailNotifications !== false,
      autoAcceptTasks: Boolean(raw?.preferences?.autoAcceptTasks),
    },
    allocations: Array.isArray(raw?.allocations) ? raw.allocations.map(normalizeAllocation) : undefined,
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
  };
}

export function normalizeAllocation(raw: any): AllocationItem {
  const proj = raw?.projectId && typeof raw.projectId === "object" ? raw.projectId : {};
  const emp = raw?.employeeId && typeof raw.employeeId === "object" ? raw.employeeId : {};
  const empName =
    emp.displayName ||
    emp.name ||
    `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
    emp.email ||
    "Resource";

  return {
    _id: String(raw?._id || ""),
    id: String(raw?._id || ""),
    projectId: String(proj?._id || raw?.projectId || ""),
    projectName: proj?.projectName || proj?.name || raw?.projectName || "Project",
    projectCode: proj?.projectCode || "",
    projectStatus: proj?.status || "",
    clientName: proj?.clientName || "Internal",
    employeeId: String(emp?._id || raw?.employeeId || ""),
    employeeName: empName,
    employeeCode: emp?.employeeCode || "",
    employeeEmail: emp?.email || "",
    employeeAvatarUrl: emp?.avatarUrl || "",
    role: raw?.role || "Developer",
    allocationType: raw?.allocationType || "FULL_TIME",
    billingType: raw?.billingType || "BILLABLE",
    monthlyCost: Number(raw?.monthlyCost || 0),
    workingDays:
      Array.isArray(raw?.workingDays) && raw.workingDays.length
        ? raw.workingDays
        : ["Mon", "Tue", "Wed", "Thu", "Fri"],
    activityType: raw?.activityType || "ALLOCATION",
    taskActivity: raw?.taskActivity || "",
    startDate: raw?.startDate || null,
    endDate: raw?.endDate || null,
    allocatedHours: Number(raw?.allocatedHours || 0),
    allocationPercent: Number(raw?.allocationPercent || 0),
    status: raw?.status || "ACTIVE",
    notes: raw?.notes || "",
    isOverAllocationOverride: Boolean(raw?.isOverAllocationOverride),
    projectedUtilizationPercent: Number(raw?.projectedUtilizationPercent || 0),
    overrideJustification: raw?.overrideJustification || "",
    overrideImpactAssessment: raw?.overrideImpactAssessment || "",
    overrideStatus: raw?.overrideStatus || "NONE",
    approvalId: raw?.approvalId ? String(raw.approvalId) : null,
    overrideApprovedBy: raw?.overrideApprovedBy || null,
    overrideApprovedAt: raw?.overrideApprovedAt || null,
    overrideDecisionComments: raw?.overrideDecisionComments || "",
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
  };
}

export const resourceApi = {
  async list(params?: Record<string, any>): Promise<ResourceItem[]> {
    const data = await apiFetch<any>("/resources", { method: "GET" }, { limit: 100, ...params });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map(normalizeResource);
  },

  async get(id: string): Promise<ResourceItem> {
    const data = await apiFetch<any>(`/resources/${id}`, { method: "GET" });
    return normalizeResource(data);
  },

  async create(payload: Record<string, any>): Promise<ResourceItem> {
    const orgId = getOrganizationId();
    const body = { ...payload };
    if (orgId && isValidObjectId(orgId) && !body.organizationId) {
      body.organizationId = orgId;
    }
    const data = await apiFetch<any>("/resources", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return normalizeResource(data);
  },

  async update(id: string, payload: Record<string, any>): Promise<ResourceItem> {
    const data = await apiFetch<any>(`/resources/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return normalizeResource(data);
  },

  async remove(id: string): Promise<void> {
    await apiFetch(`/resources/${id}`, { method: "DELETE" });
  },
};

export const allocationApi = {
  async list(params?: Record<string, any>): Promise<AllocationItem[]> {
    const data = await apiFetch<any>("/allocations", { method: "GET" }, { limit: 100, ...params });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map(normalizeAllocation);
  },

  async get(id: string): Promise<AllocationItem> {
    const data = await apiFetch<any>(`/allocations/${id}`, { method: "GET" });
    return normalizeAllocation(data);
  },

  async create(payload: Record<string, any>): Promise<AllocationItem> {
    const orgId = getOrganizationId();
    const body = { ...payload };
    if (orgId && isValidObjectId(orgId) && !body.organizationId) {
      body.organizationId = orgId;
    }
    const data = await apiFetch<any>("/allocations", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return normalizeAllocation(data);
  },

  async update(id: string, payload: Record<string, any>): Promise<AllocationItem> {
    const data = await apiFetch<any>(`/allocations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return normalizeAllocation(data);
  },

  async remove(id: string): Promise<void> {
    await apiFetch(`/allocations/${id}`, { method: "DELETE" });
  },

  async decideOverride(
    id: string,
    payload: { decision: "APPROVE" | "REJECT"; comments?: string }
  ): Promise<AllocationItem> {
    const data = await apiFetch<any>(`/allocations/${id}/override-decision`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return normalizeAllocation(data);
  },
};

export const capacityApi = {
  async getTeam(params?: { month?: string; departmentId?: string }): Promise<any> {
    return apiFetch("/capacity/team", { method: "GET" }, params);
  },

  async getIndividual(params?: { month?: string; departmentId?: string }): Promise<any[]> {
    const data = await apiFetch<any>("/capacity/individual", { method: "GET" }, params);
    return Array.isArray(data) ? data : [];
  },

  async getForecast(params?: { months?: number; departmentId?: string; projectId?: string }): Promise<any> {
    return apiFetch("/capacity/forecast", { method: "GET" }, params);
  },

  async getHeatmap(params?: { month?: string; departmentId?: string; projectId?: string }): Promise<any> {
    return apiFetch("/capacity/heatmap", { method: "GET" }, params);
  },

  async listAdjustments(params?: { employeeId?: string; departmentId?: string }): Promise<any[]> {
    const data = await apiFetch<any>("/capacity", { method: "GET" }, { limit: 100, ...params });
    return Array.isArray(data) ? data : data?.items || [];
  },

  async createAdjustment(payload: Record<string, any>): Promise<any> {
    const orgId = getOrganizationId();
    const body = { ...payload };
    if (orgId && isValidObjectId(orgId) && !body.organizationId) {
      body.organizationId = orgId;
    }
    return apiFetch("/capacity", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};

export const leaveApi = {
  async list(params?: Record<string, any>): Promise<LeaveItem[]> {
    const data = await apiFetch<any>("/leaves", { method: "GET" }, { limit: 100, ...params });
    return Array.isArray(data) ? data : data?.items || [];
  },

  async create(payload: Record<string, any>): Promise<LeaveItem> {
    return apiFetch("/leaves", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

export const lookupApi = {
  async projects(): Promise<ProjectLite[]> {
    const data = await apiFetch<any>("/projects", { method: "GET" }, { limit: 100 });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map((p: any) => ({
      _id: String(p._id || p.id),
      projectCode: p.projectCode || p.code || "",
      projectName: p.projectName || p.name || "Untitled Project",
      clientName: p.clientId?.companyName || p.clientId?.name || p.clientName || "Internal",
      status: p.status || "ACTIVE",
      progress: Number(p.progress ?? p.completionPercentage ?? 0),
      startDate: p.startDate || p.plannedStartDate || null,
      endDate: p.endDate || p.plannedEndDate || null,
    }));
  },

  async departments(): Promise<DepartmentLite[]> {
    const data = await apiFetch<any>("/departments", { method: "GET" }, { limit: 100 });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map((d: any) => ({
      _id: String(d._id || d.id),
      name: d.name || "Department",
      code: d.code || "",
    }));
  },

  async designations(): Promise<DesignationLite[]> {
    const data = await apiFetch<any>("/designations", { method: "GET" }, { limit: 100 });
    const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
    return arr.map((d: any) => ({
      _id: String(d._id || d.id),
      name: d.name || d.title || "Role",
      title: d.title || d.name || "Role",
      level: d.level,
    }));
  },
};

export function formatShortDate(d?: string | Date | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function getInitials(name: string): string {
  const parts = (name || "U").trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return monthKey;
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const dt = new Date(y || new Date().getFullYear(), (m || 1) - 1 + delta, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

export function compressAvatarImage(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image file"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result || ""));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}
