"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authLogin, logout, me, refreshSession } from "../lib/api";
import { getAccessToken, getStoredUser, isTokenExpired, type AuthUser } from "../lib/auth";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signingIn: boolean;
  signIn: (email: string, password: string, remember: boolean) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const PUBLIC_PATHS = ["/login", "/forgot-password", "/auth/forgot-password", "/auth/reset-password", "/auth/mfa", "/auth/password-expired", "/auth/access-denied"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  const refreshUser = async () => {
    try {
      let token = getAccessToken();
      if (!token || isTokenExpired(token, 15000)) token = await refreshSession();
      if (!token) { setUser(null); return null; }
      const profile: any = await me();
      const nextUser = profile?.user || profile;
      setUser(nextUser);
      return nextUser;
    } catch {
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = getStoredUser();
      if (stored && mounted) setUser(stored);
      const hasToken = !!getAccessToken();
      if (hasToken) await refreshUser();
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (loading) return;

    const isPublic = PUBLIC_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );

    if (!user && !isPublic) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!user) return;

    // Bootstrap administrators are allowed to authenticate before a tenant
    // organization exists. Keep them inside the setup flow instead of sending
    // them to an organization-scoped dashboard.
    if (!user.organizationId && pathname !== "/organization/setup" && !isPublic) {
      router.replace("/organization/setup");
      return;
    }

    if (pathname === "/login") {
      router.replace(user.organizationId ? "/dashboard" : "/organization/setup");
    }
  }, [loading, user, pathname, router]);

  useEffect(() => {
    if (!user) return;
    const onFocus = () => { void refreshUser(); };
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => { void refreshUser(); }, 4 * 60 * 1000);
    return () => { window.removeEventListener("focus", onFocus); window.clearInterval(timer); };
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    signingIn,
    signIn: async (email, password, remember) => {
      setSigningIn(true);
      try {
        const result = await authLogin(email, password, remember);
        setUser(result.user);
        return result.user;
      } finally {
        setSigningIn(false);
      }
    },
    signOut: async () => {
      await logout();
      setUser(null);
      router.replace("/login");
    },
    refreshUser,
  }), [user, loading, signingIn]);

  if (loading && !PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return <div className="auth-loading"><div className="auth-loading-card"><div className="loading-spinner"/><b>Securing your session…</b><span>Pehal Healthcare Technologies</span></div></div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
