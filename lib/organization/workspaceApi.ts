import { getAccessToken, getOrganizationId } from "@/lib/auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api/v1";

function isValidObjectId(val: unknown): boolean {
  return typeof val === "string" && /^[a-f\d]{24}$/i.test(val.trim());
}

async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  params?: Record<string, string | number | undefined | null>
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== "" && String(v) !== "ALL") {
        url.searchParams.set(k, String(v));
      }
    });
  }
  const token = getAccessToken();
  const orgId = getOrganizationId();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (isValidObjectId(orgId)) headers["x-organization-id"] = String(orgId);

  const res = await fetch(url.toString(), { ...options, headers, cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `Request failed (${res.status})`);
  return (json?.data ?? json) as T;
}

export interface AuditEntry {
  _id?: string;
  action: string;
  byName: string;
  details: string;
  timestamp: string;
}

export interface OrgLocation {
  _id: string;
  locationCode: string;
  name: string;
  type: "HEAD_OFFICE" | "BRANCH" | "REMOTE" | "CLIENT_SITE";
  region: string;
  parentLocationId?: { _id: string; name: string; locationCode: string } | string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  timezone: string;
  email: string;
  phone: string;
  managerName: string;
  settings: {
    allowTimeTracking: boolean;
    enableTimesheetApproval: boolean;
    enableProjectCreation: boolean;
  };
  status: "ACTIVE" | "INACTIVE";
  auditLog?: AuditEntry[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LocationsListResponse {
  items: OrgLocation[];
  summary: {
    totalLocations: number;
    activeLocations: number;
    inactiveLocations: number;
    totalUsers: number;
    totalTeams: number;
    totalProjects: number;
  };
  facets: {
    regions: string[];
    states: string[];
  };
}

export interface HolidayItem {
  _id: string;
  date: string;
  name: string;
  type: "GAZETTED" | "OPTIONAL" | "RESTRICTED";
  repeat: "YEARLY" | "ONCE";
  status: "ACTIVE" | "INACTIVE";
  notes?: string;
}

export interface WorkingCalendarItem {
  _id: string;
  name: string;
  calendarCode: string;
  locationId?: string | null;
  locationName: string;
  calendarType: "STANDARD" | "REGIONAL" | "CLIENT";
  year: number;
  description: string;
  workingDays: string[];
  workStartTime: string;
  workEndTime: string;
  breakMinutes: number;
  dailyWorkHours: number;
  isDefault: boolean;
  holidays: HolidayItem[];
  status: "ACTIVE" | "INACTIVE";
  stats: {
    totalHolidays: number;
    gazettedCount: number;
    optionalCount: number;
    upcomingHolidaysCount: number;
    workingDaysCount: number;
  };
  auditLog?: AuditEntry[];
}

export interface CalendarsListResponse {
  items: WorkingCalendarItem[];
  locations: Array<{ _id: string; locationCode: string; name: string; city: string; state: string }>;
  summary: {
    totalCalendars: number;
    activeCalendars: number;
    locationsCovered: number;
    totalHolidays: number;
    upcomingHolidays: number;
    workingDays: number;
  };
}

export const orgWorkspaceApi = {
  /* ORG-004: Locations */
  listLocations: (params?: Record<string, string | undefined>) =>
    apiFetch<LocationsListResponse>("/organizations/locations", { method: "GET" }, params),
  createLocation: (payload: Partial<OrgLocation>) =>
    apiFetch<OrgLocation>("/organizations/locations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateLocation: (locationId: string, payload: Partial<OrgLocation>) =>
    apiFetch<OrgLocation>(`/organizations/locations/${locationId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  bulkStatusLocations: (ids: string[], status: "ACTIVE" | "INACTIVE") =>
    apiFetch<{ modifiedCount: number; status: string }>("/organizations/locations/bulk-status", {
      method: "POST",
      body: JSON.stringify({ ids, status }),
    }),
  deleteLocation: (locationId: string) =>
    apiFetch<{ deletedId: string }>(`/organizations/locations/${locationId}`, {
      method: "DELETE",
    }),

  /* ORG-005: Working & Holiday Calendars */
  listCalendars: (params?: Record<string, string | number | undefined>) =>
    apiFetch<CalendarsListResponse>("/organizations/calendars", { method: "GET" }, params),
  createCalendar: (payload: Partial<WorkingCalendarItem> & { seedStandardHolidays?: boolean }) =>
    apiFetch<WorkingCalendarItem>("/organizations/calendars", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCalendar: (calendarId: string, payload: Partial<WorkingCalendarItem>) =>
    apiFetch<WorkingCalendarItem>(`/organizations/calendars/${calendarId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteCalendar: (calendarId: string) =>
    apiFetch<{ deletedId: string }>(`/organizations/calendars/${calendarId}`, {
      method: "DELETE",
    }),
  addHoliday: (
    calendarId: string,
    payload: Partial<HolidayItem> & { seedStandard?: boolean }
  ) =>
    apiFetch<WorkingCalendarItem>(`/organizations/calendars/${calendarId}/holidays`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteHoliday: (calendarId: string, holidayId: string) =>
    apiFetch<WorkingCalendarItem>(
      `/organizations/calendars/${calendarId}/holidays/${holidayId}`,
      { method: "DELETE" }
    ),
};
