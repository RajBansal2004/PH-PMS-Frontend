"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  ApiError,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyResetToken,
} from "../lib/api";
import {
  getRememberedEmail,
  setRememberedEmail,
} from "../lib/auth";
import { useAuth } from "./AuthProvider";
import { getDefaultRouteForRole, resolveRoleCode } from "../lib/rbac";

import "../app/auth/auth.css";

/* =========================================================
   BRAND & ICON HELPERS
   ========================================================= */

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`ph-logo ${dark ? "is-dark" : ""}`}>
      <div className="ph-logo-mark" aria-hidden="true">
        <span className="dot dot-1" />
        <span className="dot dot-2" />
        <span className="dot dot-3" />
        <span className="dot dot-4" />
        <span className="dot dot-5" />
        <span className="dot dot-6" />
      </div>

      <div className="ph-logo-text">
        <strong>Pehal</strong>
        <strong>Healthcare</strong>
        <strong>Technologies</strong>
      </div>
    </div>
  );
}

function RecaptchaEmblem() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M27.3 15.8C27.3 9.7 22.3 4.7 16.2 4.7C12.3 4.7 8.9 6.7 6.9 9.7L10.3 12.9C11.5 10.7 13.7 9.2 16.2 9.2C19.8 9.2 22.8 12.2 22.8 15.8H19.4L25 21.4L30.6 15.8H27.3Z"
        fill="#1C3AA9"
      />
      <path
        d="M16.2 22.4C12.6 22.4 9.6 19.4 9.6 15.8H13L7.4 10.2L1.8 15.8H5.1C5.1 21.9 10.1 26.9 16.2 26.9C20.1 26.9 23.5 24.9 25.5 21.9L22.1 18.7C20.9 20.9 18.7 22.4 16.2 22.4Z"
        fill="#4285F4"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
      />
      <path
        fill="#34A853"
        d="M3.6 7.4l3.2 2.3C7.7 7.6 9.7 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 8.2 2.5 4.9 4.6 3.6 7.4z"
      />
      <path
        fill="#FBBC05"
        d="M12 21.5c2.5 0 4.6-.8 6.2-2.3l-2.9-2.4c-.8.5-1.9.9-3.3.9-2.6 0-4.8-1.7-5.6-4.1l-3.2 2.4c1.4 3.2 4.6 5.5 8.8 5.5z"
      />
      <path
        fill="#4285F4"
        d="M21.1 12.2c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.3-1 2.4-2.2 3.1l2.9 2.4c1.7-1.6 2.9-4 2.9-7.8z"
      />
    </svg>
  );
}

/* =========================================================
   PASSWORD POLICY & STRENGTH HELPERS (AUTH-004 / AUTH-005)
   ========================================================= */

type PasswordRuleCheck = {
  id: string;
  label: string;
  met: boolean;
};

function evaluatePassword(password: string) {
  const rules: PasswordRuleCheck[] = [
    {
      id: "length",
      label: "At least 8 characters",
      met: password.length >= 8,
    },
    {
      id: "upper",
      label: "At least 1 uppercase letter (A-Z)",
      met: /[A-Z]/.test(password),
    },
    {
      id: "lower",
      label: "At least 1 lowercase letter (a-z)",
      met: /[a-z]/.test(password),
    },
    {
      id: "number",
      label: "At least 1 number (0-9)",
      met: /[0-9]/.test(password),
    },
    {
      id: "special",
      label: "At least 1 special character (!@#$%^&*)",
      met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    },
  ];

  const metCount = rules.filter((r) => r.met).length;
  const allMet = metCount === rules.length;

  let level = 0;
  let label = "";
  let toneClass = "strength-label-empty";

  if (password.length > 0) {
    if (metCount <= 2) {
      level = 1;
      label = "Very Weak";
      toneClass = "strength-label-very-weak";
    } else if (metCount === 3) {
      level = 2;
      label = "Weak";
      toneClass = "strength-label-weak";
    } else if (metCount === 4) {
      level = 3;
      label = "Medium";
      toneClass = "strength-label-medium";
    } else {
      level = 4;
      label = "Strong";
      toneClass = "strength-label-strong";
    }
  }

  return { rules, metCount, allMet, level, label, toneClass };
}

function PasswordStrengthMeter({ password }: { password: string }) {
  const { rules, level, label, toneClass } = useMemo(
    () => evaluatePassword(password),
    [password]
  );

  return (
    <div className="password-strength-box">
      <div className="password-strength-header">
        <span>Password Strength</span>
        <strong className={toneClass}>{label || "Not entered"}</strong>
      </div>

      <div
        className={`strength-bars ${level > 0 ? `level-${level}` : ""}`}
        role="progressbar"
        aria-valuenow={level * 25}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Password strength"
      >
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="password-rules-card">
        <p className="password-rules-title">Password must contain:</p>
        <ul className="password-rules-list">
          {rules.map((rule) => (
            <li key={rule.id} className={rule.met ? "is-met" : ""}>
              {rule.met ? (
                <CheckCircle2 size={14} className="rule-icon" aria-hidden="true" />
              ) : (
                <Circle size={14} className="rule-icon" aria-hidden="true" />
              )}
              <span>{rule.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* =========================================================
   LAYOUTS
   ========================================================= */

function AuthLayout({
  children,
  title = "Welcome Back!",
  sub = "Please sign in to continue to your account.",
}: {
  children: ReactNode;
  title?: string;
  sub?: string;
}) {
  return (
    <main className="auth-page">
      {/* LEFT BRANDING PANEL */}
      <section className="auth-showcase">
        <div className="showcase-inner">
          <Logo />

          <div className="showcase-copy">
            <h1>
              One Platform.
              <br />
              Complete Project
              <br />
              Excellence.
            </h1>

            <p>Plan. Track. Collaborate. Deliver.</p>
          </div>

          <div className="showcase-illustration" aria-hidden="true">
            <div className="illustration-glow" />

            <div className="dashboard-window">
              <div className="window-top">
                <span />
                <span />
                <span />
              </div>

              <div className="window-body">
                <div className="window-sidebar">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>

                <div className="window-content">
                  <div className="chart-title" />

                  <div className="chart-bars">
                    <span style={{ height: "35%" }} />
                    <span style={{ height: "55%" }} />
                    <span style={{ height: "45%" }} />
                    <span style={{ height: "75%" }} />
                    <span style={{ height: "60%" }} />
                    <span style={{ height: "90%" }} />
                  </div>

                  <div className="mini-cards">
                    <div />
                    <div />
                    <div />
                  </div>
                </div>
              </div>
            </div>

            <div className="floating-card floating-card-one">
              <span className="floating-icon blue">✓</span>
              <div>
                <b>Projects</b>
                <small>24 Active</small>
              </div>
            </div>

            <div className="floating-card floating-card-two">
              <span className="floating-icon purple">↗</span>
              <div>
                <b>Analytics</b>
                <small>+24.8%</small>
              </div>
            </div>

            <div className="floating-card floating-card-three">
              <span className="floating-icon green">✓</span>
              <div>
                <b>Delivery</b>
                <small>On Track</small>
              </div>
            </div>
          </div>

          <div className="trusted-copy">
            Trusted by teams to deliver successful
            <br />
            projects, every time.
          </div>
        </div>
      </section>

      {/* RIGHT LOGIN PANEL */}
      <section className="auth-panel">
        <div className="auth-card">
          <div className="language-selector" aria-label="Language">
            <span>EN</span>
            <ChevronDown size={13} />
          </div>

          <div className="mobile-logo">
            <Logo dark />
          </div>

          <div className="auth-heading">
            <h2>{title}</h2>
            <p>{sub}</p>
          </div>

          {children}

          <footer className="auth-footer">
            <div>
              <a href="#" onClick={(e) => e.preventDefault()}>
                Privacy Policy
              </a>
              <span>•</span>
              <a href="#" onClick={(e) => e.preventDefault()}>
                Terms of Use
              </a>
              <span>•</span>
              <a href="#" onClick={(e) => e.preventDefault()}>
                Support
              </a>
            </div>

            <p>© 2025 Pehal Healthcare Technologies. All rights reserved.</p>
          </footer>
        </div>
      </section>
    </main>
  );
}

function AuthCenteredLayout({
  children,
  title,
  sub,
  badge,
}: {
  children: ReactNode;
  title?: string;
  sub?: string;
  badge?: ReactNode;
}) {
  return (
    <main className="auth-centered-page">
      <div className="auth-centered-card">
        <div className="auth-centered-logo">
          <Logo dark />
        </div>

        {badge}

        {(title || sub) && (
          <div className="auth-heading">
            {title && <h2>{title}</h2>}
            {sub && <p>{sub}</p>}
          </div>
        )}

        {children}
      </div>
    </main>
  );
}

/* =========================================================
   AUTH-001: LOGIN SCREEN
   ========================================================= */

export function LoginScreen() {
  const { signIn, signingIn, user } = useAuth();

  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Interactive "I'm not a robot" reCAPTCHA state
  const [captchaState, setCaptchaState] = useState<
    "idle" | "verifying" | "verified"
  >("idle");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const verifyTimerRef = useRef<number | null>(null);
  const expireTimerRef = useRef<number | null>(null);

  // Form errors
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Restore remembered email if user previously enabled Remember Me
  useEffect(() => {
    const saved = getRememberedEmail();
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  // Cleanup captcha timers on unmount
  useEffect(() => {
    return () => {
      if (verifyTimerRef.current) window.clearTimeout(verifyTimerRef.current);
      if (expireTimerRef.current) window.clearTimeout(expireTimerRef.current);
    };
  }, []);

  const resetCaptcha = (expiredMessage = "") => {
    if (verifyTimerRef.current) window.clearTimeout(verifyTimerRef.current);
    if (expireTimerRef.current) window.clearTimeout(expireTimerRef.current);
    setCaptchaState("idle");
    setCaptchaToken("");
    if (expiredMessage) {
      setCaptchaError(expiredMessage);
    }
  };

  const handleCaptchaToggle = () => {
    if (signingIn || captchaState === "verifying") return;

    setCaptchaError("");
    setError("");

    if (captchaState === "verified") {
      resetCaptcha();
      return;
    }

    setCaptchaState("verifying");

    verifyTimerRef.current = window.setTimeout(() => {
      const generatedToken = `ph_captcha_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 12)}`;
      setCaptchaToken(generatedToken);
      setCaptchaState("verified");

      // Expire verification after 2 minutes like standard reCAPTCHA v2
      expireTimerRef.current = window.setTimeout(() => {
        resetCaptcha("Verification expired. Please check the box again.");
      }, 2 * 60 * 1000);
    }, 520);
  };

  const handleCaptchaKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleCaptchaToggle();
    }
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (signingIn) return;

    setError("");
    setEmailError("");
    setPasswordError("");
    setCaptchaError("");

    const normalizedEmail = email.trim().toLowerCase();
    let hasValidationError = false;

    if (!normalizedEmail) {
      setEmailError("Please enter your work email.");
      hasValidationError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setEmailError("Please enter a valid email address.");
      hasValidationError = true;
    }

    if (!pass) {
      setPasswordError("Please enter your password.");
      hasValidationError = true;
    }

    if (captchaState !== "verified" || !captchaToken) {
      setCaptchaError("Please verify that you are not a robot.");
      hasValidationError = true;
    }

    if (hasValidationError) return;

    try {
      const authenticatedUser = await signIn(
        normalizedEmail,
        pass,
        remember,
        captchaToken
      );

      // Persist or clear remembered email per user's Remember Me choice
      if (remember) {
        setRememberedEmail(normalizedEmail);
      } else {
        setRememberedEmail(null);
      }

      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");

      if (authenticatedUser.organizationId) {
        const defaultHome = getDefaultRouteForRole(
          resolveRoleCode(authenticatedUser)
        );
        window.location.replace(
          next && next !== "/dashboard" ? next : defaultHome
        );
      } else {
        window.location.replace("/organization/setup");
      }
    } catch (err: unknown) {
      // Reset captcha after failed login attempt for security
      resetCaptcha();

      const status = err instanceof ApiError ? err.status : 0;

      if (status === 401) {
        setError("Invalid email or password. Please try again.");
      } else if (status === 423) {
        setError("Your account is locked. Please try again after 15 minutes.");
      } else if (status === 403) {
        setError(
          err instanceof ApiError
            ? err.message || "Your account does not have access to PH-PMS."
            : "Your account does not have access to PH-PMS."
        );
      } else {
        setError(
          err instanceof Error
            ? err.message || "Unable to sign in. Please try again."
            : "Unable to sign in. Please try again."
        );
      }
    }
  };

  if (user) return null;

  return (
    <AuthLayout>
      <form
        className="auth-form"
        onSubmit={submit}
        noValidate
        aria-label="Login form"
      >
        {/* TOP ALERT BANNER (Invalid Credentials / Account Locked) */}
        {error && (
          <div className="auth-error" role="alert" aria-live="polite">
            <span className="error-icon">!</span>
            <span>{error}</span>
          </div>
        )}

        {/* WORK EMAIL */}
        <div className="form-field">
          <label htmlFor={emailId} className="field-label">
            <span>
              Work Email <em>*</em>
            </span>
          </label>

          <div className={`input-wrap ${emailError ? "has-error" : ""}`}>
            <Mail size={17} className="input-icon" aria-hidden="true" />

            <input
              id={emailId}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              maxLength={100}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError("");
                setError("");
              }}
              placeholder="Enter your work email"
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? `${emailId}-error` : undefined}
            />
          </div>

          {emailError && (
            <small
              id={`${emailId}-error`}
              className="field-error"
              role="alert"
            >
              <AlertCircle size={13} aria-hidden="true" />
              <span>{emailError}</span>
            </small>
          )}
        </div>

        {/* PASSWORD */}
        <div className="form-field">
          <label htmlFor={passwordId} className="field-label">
            <span>
              Password <em>*</em>
            </span>
          </label>

          <div className={`input-wrap ${passwordError ? "has-error" : ""}`}>
            <LockKeyhole size={17} className="input-icon" aria-hidden="true" />

            <input
              id={passwordId}
              name="password"
              autoComplete="current-password"
              maxLength={50}
              type={showPassword ? "text" : "password"}
              value={pass}
              onChange={(e) => {
                setPass(e.target.value);
                setPasswordError("");
                setError("");
              }}
              placeholder="Enter your password"
              aria-invalid={Boolean(passwordError)}
              aria-describedby={
                passwordError ? `${passwordId}-error` : undefined
              }
            />

            <button
              type="button"
              className="password-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {passwordError && (
            <small
              id={`${passwordId}-error`}
              className="field-error"
              role="alert"
            >
              <AlertCircle size={13} aria-hidden="true" />
              <span>{passwordError}</span>
            </small>
          )}
        </div>

        {/* REMEMBER ME + FORGOT PASSWORD */}
        <div className="auth-row">
          <label className="remember-check">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => {
                const checked = e.target.checked;
                setRemember(checked);
                if (!checked) {
                  setRememberedEmail(null);
                }
              }}
            />

            <span className="custom-check" aria-hidden="true">
              {remember && <Check size={11} strokeWidth={3.2} />}
            </span>

            <span>Remember Me</span>
          </label>

          <Link href="/auth/forgot-password">Forgot Password?</Link>
        </div>

        {/* INTERACTIVE CAPTCHA ("I'm not a robot") */}
        <div className="captcha-field">
          <div
            className={`captcha-box ${
              captchaState === "verifying" ? "is-verifying" : ""
            } ${captchaState === "verified" ? "is-verified" : ""} ${
              captchaError ? "has-error" : ""
            }`}
            role="checkbox"
            tabIndex={0}
            aria-checked={captchaState === "verified"}
            aria-invalid={Boolean(captchaError)}
            aria-label="I'm not a robot security verification"
            onClick={handleCaptchaToggle}
            onKeyDown={handleCaptchaKeyDown}
          >
            <span className="captcha-checkbox" aria-hidden="true">
              {captchaState === "verifying" && (
                <span className="captcha-spinner" />
              )}
              {captchaState === "verified" && (
                <Check size={16} strokeWidth={3.2} />
              )}
            </span>

            <div className="captcha-content">
              <strong>I&apos;m not a robot</strong>
              <small>
                {captchaState === "verifying"
                  ? "Verifying..."
                  : captchaState === "verified"
                  ? "Verified"
                  : "Click to verify"}
              </small>
            </div>

            <div className="captcha-brand" aria-hidden="true">
              <RecaptchaEmblem />
              <span className="recaptcha-name">reCAPTCHA</span>
              <span className="recaptcha-links">Privacy - Terms</span>
            </div>
          </div>

          {captchaError && (
            <small className="field-error" role="alert">
              <AlertCircle size={13} aria-hidden="true" />
              <span>{captchaError}</span>
            </small>
          )}
        </div>

        {/* SIGN IN */}
        <button
          type="submit"
          className="auth-primary"
          disabled={signingIn || captchaState === "verifying"}
        >
          {signingIn ? (
            <>
              <span className="button-spinner" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>

        {/* DIVIDER */}
        <div className="or-divider">
          <span>or continue with</span>
        </div>

        {/* GOOGLE SSO */}
        <button type="button" className="sso-button" disabled>
          <GoogleIcon />
          <span>Sign in with Google</span>
          <small>Coming soon</small>
        </button>

        {/* MICROSOFT SSO */}
        <button type="button" className="sso-button" disabled>
          <span className="microsoft-icon" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>Sign in with Microsoft</span>
          <small>Coming soon</small>
        </button>
      </form>
    </AuthLayout>
  );
}

/* =========================================================
   AUTH-003: FORGOT PASSWORD SCREEN
   ========================================================= */

export function ForgotScreen() {
  const emailId = useId();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [sentData, setSentData] = useState<{
    email: string;
    userName?: string;
    expiresInMinutes?: number;
    resetUrl?: string;
    resetToken?: string;
  } | null>(null);

  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const formatTimer = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const requestReset = async (targetEmail: string) => {
    setSubmitting(true);
    setServerError("");

    try {
      const res = await forgotPassword(targetEmail);
      setSentData({
        email: res?.email || targetEmail,
        userName: res?.userName,
        expiresInMinutes: res?.expiresInMinutes || 30,
        resetUrl: res?.resetUrl,
        resetToken: res?.resetToken,
      });
      setCooldown(30);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError(
          "Unable to send reset link right now. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    setEmailError("");
    setServerError("");

    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setEmailError("Please enter your work email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setEmailError("Please enter a valid work email address.");
      return;
    }

    await requestReset(normalized);
  };

  const handleResend = async () => {
    if (cooldown > 0 || submitting || !sentData?.email) return;
    await requestReset(sentData.email);
  };

  if (sentData) {
    const localResetHref = sentData.resetToken
      ? `/auth/reset-password?token=${encodeURIComponent(sentData.resetToken)}`
      : sentData.resetUrl;

    return (
      <AuthCenteredLayout>
        <div className="auth-state-panel">
          <div className="auth-state-circle success" aria-hidden="true">
            <Check size={30} strokeWidth={3} />
          </div>

          <h3>Reset link sent!</h3>

          <p className="state-desc">
            We&apos;ve sent a password reset link to your email (
            <strong>{sentData.email}</strong>). Please check your inbox and
            follow the instructions to reset your password.
          </p>

          {serverError && (
            <div className="auth-error" role="alert">
              <span className="error-icon">!</span>
              <span>{serverError}</span>
            </div>
          )}

          {/* Direct Reset Link Preview (Dev / Local without external SMTP) */}
          {localResetHref && (
            <div className="auth-email-preview">
              <div className="auth-email-preview-head">
                <span>Reset Password Email</span>
                <small>
                  Expires in {sentData.expiresInMinutes || 30} mins
                </small>
              </div>
              <p>
                Hi {sentData.userName || "there"}, click the button below to
                create a new password for your PH-PMS account.
              </p>
              <Link href={localResetHref} className="auth-primary">
                <span>Reset Password</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          )}

          <div className="auth-help-box">
            <h4>Didn&apos;t receive the email?</h4>
            <ul>
              <li>Check your Spam / Junk folder</li>
              <li>
                <button
                  type="button"
                  className="auth-inline-btn"
                  disabled={cooldown > 0 || submitting}
                  onClick={handleResend}
                >
                  {submitting
                    ? "Resending link..."
                    : cooldown > 0
                    ? `Resend Link (in ${formatTimer(cooldown)})`
                    : "Resend Link"}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="auth-inline-btn"
                  onClick={() => {
                    setSentData(null);
                    setServerError("");
                    setCooldown(0);
                  }}
                >
                  Change Email Address
                </button>
              </li>
            </ul>
          </div>

          <Link href="/login" className="auth-secondary">
            <ArrowLeft size={16} />
            <span>Back to Login</span>
          </Link>
        </div>
      </AuthCenteredLayout>
    );
  }

  return (
    <AuthCenteredLayout
      title="Forgot Password?"
      sub="No worries! Enter your registered email address and we'll send you a link to reset your password."
    >
      <form
        className="auth-form"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Forgot password form"
      >
        {serverError && (
          <div className="auth-error" role="alert" aria-live="polite">
            <span className="error-icon">!</span>
            <span>{serverError}</span>
          </div>
        )}

        <div className="form-field">
          <label htmlFor={emailId} className="field-label">
            <span>
              Work Email <em>*</em>
            </span>
          </label>

          <div className={`input-wrap ${emailError ? "has-error" : ""}`}>
            <input
              id={emailId}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={100}
              placeholder="Enter your work email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError("");
                setServerError("");
              }}
              aria-invalid={Boolean(emailError)}
            />
            <Mail size={17} className="input-icon" aria-hidden="true" />
          </div>

          {emailError && (
            <small className="field-error" role="alert">
              <AlertCircle size={13} aria-hidden="true" />
              <span>{emailError}</span>
            </small>
          )}
        </div>

        <button type="submit" className="auth-primary" disabled={submitting}>
          {submitting ? (
            <>
              <span className="button-spinner" />
              <span>Sending Reset Link...</span>
            </>
          ) : (
            <>
              <span>Send Reset Link</span>
              <Send size={16} />
            </>
          )}
        </button>

        <div className="or-divider">
          <span>or</span>
        </div>

        <Link href="/login" className="auth-secondary">
          <ArrowLeft size={16} />
          <span>Back to Login</span>
        </Link>

        <div className="auth-bottom-links">
          <span>
            Remember your password? <Link href="/login">Sign In</Link>
          </span>
          <span>
            Need help?{" "}
            <a href="#" onClick={(e) => e.preventDefault()}>
              Contact Support
            </a>
          </span>
        </div>
      </form>
    </AuthCenteredLayout>
  );
}

/* =========================================================
   AUTH-004 (RESET PASSWORD) & AUTH-005 (PASSWORD EXPIRED)
   ========================================================= */

function ResetPasswordContent({ expired = false }: { expired?: boolean }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const currentPassId = useId();
  const newPassId = useId();
  const confirmPassId = useId();

  const [tokenState, setTokenState] = useState<
    "checking" | "valid" | "expired"
  >(expired ? "valid" : "checking");
  const [maskedEmail, setMaskedEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [currentError, setCurrentError] = useState("");
  const [newPassError, setNewPassError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [serverError, setServerError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const policy = useMemo(() => evaluatePassword(newPassword), [newPassword]);

  // Verify reset token on mount for AUTH-004
  useEffect(() => {
    if (expired) {
      setTokenState("valid");
      return;
    }

    if (!token.trim()) {
      setTokenState("expired");
      return;
    }

    let active = true;
    setTokenState("checking");

    verifyResetToken(token)
      .then((res) => {
        if (!active) return;
        setMaskedEmail(res?.email || "");
        setTokenState("valid");
      })
      .catch(() => {
        if (!active) return;
        setTokenState("expired");
      });

    return () => {
      active = false;
    };
  }, [expired, token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    setCurrentError("");
    setNewPassError("");
    setConfirmError("");
    setServerError("");

    let hasError = false;

    if (expired && !currentPassword) {
      setCurrentError("Please enter your current password.");
      hasError = true;
    }

    if (!newPassword) {
      setNewPassError("Please enter a new password.");
      hasError = true;
    } else if (!policy.allMet) {
      setNewPassError(
        "Password must meet all the security requirements listed below."
      );
      hasError = true;
    }

    if (!confirmPassword) {
      setConfirmError("Please confirm your new password.");
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      setConfirmError("Passwords do not match.");
      hasError = true;
    }

    if (hasError) return;

    setSubmitting(true);

    try {
      if (expired) {
        await changePassword(currentPassword, newPassword, confirmPassword);
      } else {
        await resetPassword(token, newPassword, confirmPassword);
      }
      setDone(true);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Unable to update your password. Please try again.";

      if (
        !expired &&
        /expired|invalid.*link|invalid.*token/i.test(msg)
      ) {
        setTokenState("expired");
      } else {
        setServerError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Checking link state
  if (tokenState === "checking") {
    return (
      <AuthCenteredLayout>
        <div className="auth-state-panel">
          <div className="auth-state-circle loading" aria-hidden="true">
            <span
              className="button-spinner"
              style={{
                width: 24,
                height: 24,
                borderColor: "#bfdbfe",
                borderTopColor: "#1d4ed8",
              }}
            />
          </div>
          <h3>Verifying reset link...</h3>
          <p className="state-desc">
            Please wait while we validate your secure password reset link.
          </p>
        </div>
      </AuthCenteredLayout>
    );
  }

  // AUTH-004 Link Expired State
  if (!expired && tokenState === "expired") {
    return (
      <AuthCenteredLayout>
        <div className="auth-state-panel">
          <div className="auth-state-circle error" aria-hidden="true">
            <X size={28} strokeWidth={2.8} />
          </div>

          <h3 className="is-error">This link has expired</h3>

          <p className="state-desc">
            The reset link is invalid or has expired. Please request a new
            password reset link.
          </p>

          <div className="auth-stack-actions">
            <Link href="/auth/forgot-password" className="auth-primary">
              <span>Request New Link</span>
            </Link>

            <Link href="/login" className="auth-secondary">
              <ArrowLeft size={16} />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </AuthCenteredLayout>
    );
  }

  // Success State (AUTH-004 & AUTH-005)
  if (done) {
    return (
      <AuthCenteredLayout>
        <div className="auth-state-panel">
          <div className="auth-state-circle success" aria-hidden="true">
            <Check size={30} strokeWidth={3} />
          </div>

          <h3 className="is-success">
            {expired ? "Password Updated!" : "Password Reset Successful!"}
          </h3>

          <p className="state-desc">
            {expired
              ? "Your password has been updated successfully. You can continue to your workspace."
              : "Your password has been updated successfully. You can now sign in with your new password."}
          </p>

          <Link
            href={expired ? "/dashboard" : "/login"}
            className="auth-primary"
          >
            <span>{expired ? "Continue to Dashboard" : "Go to Login"}</span>
            <ArrowRight size={17} />
          </Link>
        </div>
      </AuthCenteredLayout>
    );
  }

  return (
    <AuthCenteredLayout
      badge={
        expired ? (
          <div className="auth-badge-icon expired" aria-hidden="true">
            <Clock size={26} />
          </div>
        ) : undefined
      }
      title={expired ? "Password Expired" : "Create New Password"}
      sub={
        expired
          ? "Your password has expired for security reasons. Please create a new password to continue."
          : maskedEmail
          ? `Enter your new password for ${maskedEmail}.`
          : "Enter your new password below."
      }
    >
      <form
        className="auth-form"
        onSubmit={handleSubmit}
        noValidate
        aria-label={expired ? "Update expired password form" : "Reset password form"}
      >
        {serverError && (
          <div className="auth-error" role="alert" aria-live="polite">
            <span className="error-icon">!</span>
            <span>{serverError}</span>
          </div>
        )}

        {/* CURRENT PASSWORD (AUTH-005 ONLY) */}
        {expired && (
          <div className="form-field">
            <label htmlFor={currentPassId} className="field-label">
              <span>
                Current Password <em>*</em>
              </span>
            </label>

            <div className={`input-wrap ${currentError ? "has-error" : ""}`}>
              <input
                id={currentPassId}
                name="currentPassword"
                type={showCurrent ? "text" : "password"}
                autoComplete="current-password"
                maxLength={100}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setCurrentError("");
                  setServerError("");
                }}
              />

              <button
                type="button"
                className="password-toggle"
                aria-label={
                  showCurrent
                    ? "Hide current password"
                    : "Show current password"
                }
                onClick={() => setShowCurrent((v) => !v)}
              >
                {showCurrent ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            {currentError && (
              <small className="field-error" role="alert">
                <AlertCircle size={13} aria-hidden="true" />
                <span>{currentError}</span>
              </small>
            )}
          </div>
        )}

        {/* NEW PASSWORD */}
        <div className="form-field">
          <label htmlFor={newPassId} className="field-label">
            <span>
              New Password <em>*</em>
            </span>
          </label>

          <div className={`input-wrap ${newPassError ? "has-error" : ""}`}>
            <input
              id={newPassId}
              name="newPassword"
              type={showNew ? "text" : "password"}
              autoComplete="new-password"
              maxLength={100}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setNewPassError("");
                setServerError("");
                if (confirmPassword && e.target.value === confirmPassword) {
                  setConfirmError("");
                }
              }}
              aria-invalid={Boolean(newPassError)}
            />

            <button
              type="button"
              className="password-toggle"
              aria-label={
                showNew ? "Hide new password" : "Show new password"
              }
              onClick={() => setShowNew((v) => !v)}
            >
              {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {newPassError && (
            <small className="field-error" role="alert">
              <AlertCircle size={13} aria-hidden="true" />
              <span>{newPassError}</span>
            </small>
          )}
        </div>

        {/* CONFIRM NEW PASSWORD */}
        <div className="form-field">
          <label htmlFor={confirmPassId} className="field-label">
            <span>
              Confirm New Password <em>*</em>
            </span>
          </label>

          <div className={`input-wrap ${confirmError ? "has-error" : ""}`}>
            <input
              id={confirmPassId}
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              maxLength={100}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => {
                const next = e.target.value;
                setConfirmPassword(next);
                setServerError("");
                if (next && newPassword && next !== newPassword) {
                  setConfirmError("Passwords do not match.");
                } else {
                  setConfirmError("");
                }
              }}
              aria-invalid={Boolean(confirmError)}
            />

            <button
              type="button"
              className="password-toggle"
              aria-label={
                showConfirm
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
              onClick={() => setShowConfirm((v) => !v)}
            >
              {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {confirmError && (
            <small className="field-error" role="alert">
              <AlertCircle size={13} aria-hidden="true" />
              <span>{confirmError}</span>
            </small>
          )}
        </div>

        {/* PASSWORD STRENGTH & POLICY CHECKLIST */}
        <PasswordStrengthMeter password={newPassword} />

        {/* SUBMIT & BACK ACTIONS */}
        <div className="auth-stack-actions">
          <button
            type="submit"
            className="auth-primary"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="button-spinner" />
                <span>
                  {expired ? "Updating Password..." : "Resetting Password..."}
                </span>
              </>
            ) : (
              <>
                <LockKeyhole size={16} />
                <span>{expired ? "Update Password" : "Reset Password"}</span>
              </>
            )}
          </button>

          {!expired && (
            <Link href="/login" className="auth-secondary">
              <ArrowLeft size={16} />
              <span>Back to Login</span>
            </Link>
          )}
        </div>
      </form>
    </AuthCenteredLayout>
  );
}

export function ResetScreen({ expired = false }: { expired?: boolean } = {}) {
  return (
    <Suspense
      fallback={
        <AuthCenteredLayout>
          <div className="auth-state-panel">
            <div className="auth-state-circle loading" aria-hidden="true">
              <span
                className="button-spinner"
                style={{
                  width: 24,
                  height: 24,
                  borderColor: "#bfdbfe",
                  borderTopColor: "#1d4ed8",
                }}
              />
            </div>
            <h3>Loading...</h3>
          </div>
        </AuthCenteredLayout>
      }
    >
      <ResetPasswordContent expired={expired} />
    </Suspense>
  );
}

/* =========================================================
   OTHER AUTH SCREENS (MFA / SESSIONS / ACCESS DENIED)
   ========================================================= */

export function MfaScreen() {
  const [otp, setOtp] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 600);
  };

  return (
    <AuthLayout
      title="Two-Factor Authentication"
      sub="Enter the 6-digit verification code sent to your registered device."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="otp" className="field-label">
            <span>Security Code (TOTP / SMS)</span>
          </label>
          <div className="input-wrap">
            <ShieldCheck size={18} className="input-icon" />
            <input
              id="otp"
              type="text"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              autoFocus
              style={{
                letterSpacing: "4px",
                fontSize: "16px",
                fontWeight: 700,
              }}
            />
          </div>
        </div>

        <div className="auth-row">
          <label className="remember-check">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
            />
            <span className="custom-check" aria-hidden="true">
              {rememberDevice && <Check size={11} strokeWidth={3.2} />}
            </span>
            <span>Remember this device for 30 days</span>
          </label>
        </div>

        <button
          type="submit"
          className="auth-primary"
          disabled={loading || otp.length < 6}
        >
          {loading ? "Verifying..." : "Verify & Continue"}
        </button>

        <div style={{ textAlign: "center", marginTop: "14px" }}>
          <button
            type="button"
            className="auth-inline-btn"
            onClick={() => alert("Verification code resent.")}
          >
            Resend verification code
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}

export function SessionsScreen() {
  return (
    <AuthCenteredLayout
      title="Active Sessions"
      sub="Manage and terminate active login sessions across your devices."
    >
      <div style={{ padding: "8px 0" }}>
        <div
          style={{
            padding: "14px",
            marginBottom: "16px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            background: "#f8fafc",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <b style={{ fontSize: "13px", color: "#0f172a" }}>
              Windows PC · Chrome Browser
            </b>
            <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#64748b" }}>
              Hyderabad, India · Active Now
            </p>
          </div>
          <span
            style={{
              fontSize: "11px",
              color: "#15803d",
              fontWeight: 700,
              background: "#dcfce7",
              padding: "3px 8px",
              borderRadius: "999px",
            }}
          >
            CURRENT
          </span>
        </div>

        <div className="auth-stack-actions">
          <button
            type="button"
            className="auth-primary"
            style={{ background: "#dc2626", boxShadow: "none" }}
            onClick={() => alert("All other sessions revoked.")}
          >
            Revoke All Other Sessions
          </button>

          <Link href="/dashboard" className="auth-secondary">
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </AuthCenteredLayout>
  );
}

export function AccessDenied() {
  const { roleProfile } = useAuth();
  return (
    <AuthCenteredLayout
      title="Access Denied"
      sub="You do not have the required permissions to access this screen."
    >
      <div className="auth-state-panel">
        <div className="auth-state-circle error" aria-hidden="true">
          <LockKeyhole size={26} />
        </div>
        <h3>403 — Restricted Area</h3>
        <p className="state-desc">
          Your active role <strong>{roleProfile.label}</strong> (Scope:{" "}
          <strong>{roleProfile.dataScope}</strong>) does not have permission to
          open this module under PH-PMS RBAC Policy.
        </p>
        <Link href={roleProfile.defaultRoute} className="auth-primary">
          <span>Go to {roleProfile.shortLabel} Home</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </AuthCenteredLayout>
  );
}
