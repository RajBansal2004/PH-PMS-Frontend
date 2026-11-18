export type AuthUser = {
  id: string;
  name: string;
  email: string;
  organizationId?: string | null;
  employeeId?: string | null;
  roles?: Array<{ id?: string; name?: string; code?: string }> | string[];
  roleCodes?: string[];
  primaryRole?: string;
  primaryRoleCode?: string;
  roleProfile?: Record<string, any>;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  remember: boolean;
};

const ACCESS_KEY = "ph_pms_access_token";
const REFRESH_KEY = "ph_pms_refresh_token";
const ORG_KEY = "ph_pms_organization_id";
const USER_KEY = "ph_pms_user";
const REMEMBER_KEY = "ph_pms_remember";
const REMEMBERED_EMAIL_KEY = "ph_pms_remembered_email";

export const AUTH_KEYS = [ACCESS_KEY, REFRESH_KEY, ORG_KEY, USER_KEY, REMEMBER_KEY, "ph_pms_refresh_token_id"];

export function getRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) || "";
  } catch {
    return "";
  }
}

export function setRememberedEmail(email: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (email && email.trim()) {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim().toLowerCase());
    } else {
      localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }
  } catch {
    // ignore storage quota / privacy mode errors
  }
}

function stores() {
  if (typeof window === "undefined") return [] as Storage[];
  return [localStorage, sessionStorage];
}

function read(key: string) {
  for (const store of stores()) {
    const value = store.getItem(key);
    if (value) return value;
  }
  return "";
}

export function getAccessToken() { return read(ACCESS_KEY); }
export function getRefreshToken() { return read(REFRESH_KEY); }
export function getStoredUser(): AuthUser | null {
  const raw = read(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
export function getOrganizationId() {
  const org = read(ORG_KEY);
  if (org) return org;
  const user = getStoredUser();
  if (user?.organizationId) return String(user.organizationId);
  const token = getAccessToken();
  if (token) {
    const decoded = decodeJwt<{ organizationId?: string }>(token);
    if (decoded?.organizationId) return String(decoded.organizationId);
  }
  return "6ac46aa65c7e160e9d89d492";
}

export function decodeJwt<T = Record<string, any>>(token: string): T | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    return JSON.parse(atob(normalized));
  } catch { return null; }
}

export function accessTokenExpiresAt(token = getAccessToken()): number | null {
  const payload = decodeJwt<{ exp?: number }>(token);
  return typeof payload?.exp === "number" ? payload.exp * 1000 : null;
}

export function isTokenExpired(token = getAccessToken(), leewayMs = 0) {
  const exp = accessTokenExpiresAt(token);
  return exp !== null && Date.now() + leewayMs >= exp;
}

export function saveSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  const target = session.remember ? localStorage : sessionStorage;
  const other = session.remember ? sessionStorage : localStorage;

  AUTH_KEYS.forEach((key) => other.removeItem(key));
  target.setItem(ACCESS_KEY, session.accessToken);
  target.setItem(REFRESH_KEY, session.refreshToken);
  target.setItem(REMEMBER_KEY, session.remember ? "1" : "0");
  target.setItem(USER_KEY, JSON.stringify(session.user));
  if (session.user.organizationId) target.setItem(ORG_KEY, session.user.organizationId);
  else target.removeItem(ORG_KEY);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  AUTH_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

export function authHeader(token = getAccessToken()) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
