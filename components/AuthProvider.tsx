"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  authLogin,
  logout,
  me,
  refreshSession,
} from "../lib/api";

import {
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  isTokenExpired,
  type AuthUser,
} from "../lib/auth";

import {
  canAccessPath,
  getDefaultRouteForRole,
  getRoleProfile,
  resolveRoleCode,
  type CanonicalRoleCode,
  type RoleProfile,
} from "../lib/rbac";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signingIn: boolean;
  realRoleCode: CanonicalRoleCode;
  effectiveRoleCode: CanonicalRoleCode;
  roleProfile: RoleProfile;
  isSuperAdmin: boolean;

  signIn: (
    email: string,
    password: string,
    remember: boolean,
    captchaToken?: string
  ) => Promise<AuthUser>;

  signOut: () => Promise<void>;

  refreshUser: () => Promise<AuthUser | null>;
};

const AuthContext =
  createContext<AuthContextValue | null>(null);

const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/mfa",
  "/auth/password-expired",
  "/auth/access-denied",
];

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [signingIn, setSigningIn] =
    useState(false);

  const realRoleCode = useMemo(
    () => resolveRoleCode(user),
    [user]
  );

  const isSuperAdmin = realRoleCode === "SUPER_ADMIN";
  const effectiveRoleCode: CanonicalRoleCode = realRoleCode;

  const roleProfile = useMemo(
    () => getRoleProfile(effectiveRoleCode),
    [effectiveRoleCode]
  );

  /*
   * ------------------------------------------------
   * REFRESH CURRENT USER
   * ------------------------------------------------
   */

  const refreshUser = async () => {
    try {
      let token = getAccessToken();

      /*
       * Access token missing or close to expiry:
       * refresh it first.
       */

      if (
        !token ||
        isTokenExpired(token, 15000)
      ) {
        token = await refreshSession();
      }

      if (!token) {
        setUser(null);

        return null;
      }

      /*
       * Always ask backend for current user.
       *
       * This is important after organization
       * bootstrap because organizationId has
       * changed server-side.
       */

      const profile: any =
        await me();

      const nextUser =
        profile?.user || profile;

      setUser(nextUser);

      return nextUser;
    } catch {
      setUser(null);

      return null;
    }
  };

  /*
   * ------------------------------------------------
   * INITIAL SESSION CHECK
   * ------------------------------------------------
   */

  useEffect(() => {
    let mounted = true;

    (async () => {
      const hasToken =
        !!(getAccessToken() || getRefreshToken());

      if (hasToken) {
        await refreshUser();
      } else {
        const stored =
          getStoredUser();

        if (
          stored &&
          mounted
        ) {
          setUser(stored);
        }
      }

      if (mounted) {
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ------------------------------------------------
   * AUTH ROUTING
   * ------------------------------------------------
   */

  useEffect(() => {
    if (loading) {
      return;
    }

    const isPublic =
      PUBLIC_PATHS.some(
        (path) =>
          pathname === path ||
          pathname.startsWith(`${path}/`)
      );

    const isOrganizationSetup =
      pathname === "/organization/setup" ||
      pathname.startsWith(
        "/organization/setup/"
      );

    /*
     * No authenticated user
     * -> Login
     */

    if (
      !user &&
      !isPublic &&
      !isOrganizationSetup
    ) {
      router.replace(
        `/login?next=${encodeURIComponent(
          pathname
        )}`
      );

      return;
    }

    /*
     * Authenticated user visits login.
     *
     * If organization exists:
     * Dashboard
     *
     * If organization missing:
     * Organization Setup
     */

    if (
      user &&
      pathname === "/login"
    ) {
      router.replace(
        user.organizationId
          ? getDefaultRouteForRole(effectiveRoleCode)
          : "/organization/setup"
      );

      return;
    }

    /*
     * Authenticated but organization-less
     * user cannot access protected modules.
     */

    if (
      user &&
      !user.organizationId &&
      !isOrganizationSetup &&
      !isPublic
    ) {
      router.replace(
        "/organization/setup"
      );
      return;
    }

    /*
     * Role-based landing redirect & strict route guard.
     */
    if (user && user.organizationId && !isPublic && !isOrganizationSetup) {
      if (pathname === "/" || (pathname === "/dashboard" && !canAccessPath(effectiveRoleCode, "/dashboard"))) {
        router.replace(getDefaultRouteForRole(effectiveRoleCode));
        return;
      }
      if (!canAccessPath(effectiveRoleCode, pathname)) {
        router.replace("/auth/access-denied");
        return;
      }
    }
  }, [
    loading,
    user,
    pathname,
    router,
    effectiveRoleCode,
  ]);

  /*
   * ------------------------------------------------
   * SESSION REVALIDATION
   * ------------------------------------------------
   */

  useEffect(() => {
    if (!user) {
      return;
    }

    const onFocus = () => {
      void refreshUser();
    };

    window.addEventListener(
      "focus",
      onFocus
    );

    const timer =
      window.setInterval(
        () => {
          void refreshUser();
        },
        4 * 60 * 1000
      );

    return () => {
      window.removeEventListener(
        "focus",
        onFocus
      );

      window.clearInterval(timer);
    };
  }, [user]);

  /*
   * ------------------------------------------------
   * AUTH CONTEXT
   * ------------------------------------------------
   */

  const value =
    useMemo<AuthContextValue>(
      () => ({
        user,
        loading,
        signingIn,
        realRoleCode,
        effectiveRoleCode,
        roleProfile,
        isSuperAdmin,

        signIn: async (
          email,
          password,
          remember,
          captchaToken
        ) => {
          setSigningIn(true);

          try {
            const result =
              await authLogin(
                email,
                password,
                remember,
                captchaToken
              );

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
      }),
      [
        user,
        loading,
        signingIn,
        realRoleCode,
        effectiveRoleCode,
        roleProfile,
        isSuperAdmin,
      ]
    );

  /*
   * ------------------------------------------------
   * LOADING SCREEN
   * ------------------------------------------------
   */

  if (
    loading &&
    !PUBLIC_PATHS.some(
      (path) =>
        pathname === path ||
        pathname.startsWith(`${path}/`)
    )
  ) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-card">

          <div className="loading-spinner" />

          <b>
            Securing your session…
          </b>

          <span>
            Pehal Healthcare Technologies
          </span>

        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value =
    useContext(AuthContext);

  if (!value) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return value;
}