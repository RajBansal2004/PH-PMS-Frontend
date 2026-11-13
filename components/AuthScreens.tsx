"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ChevronDown,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { ApiError } from "../lib/api";
import { useAuth } from "./AuthProvider";

import "../app/auth/auth.css";

function Logo() {
  return (
    <div className="ph-logo">
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

          {/* CSS illustration - no external asset required */}
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
            <Logo />
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

            <p>
              © 2025 Pehal Healthcare Technologies. All rights reserved.
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}

export function LoginScreen() {
  const { signIn, signingIn, user } = useAuth();

  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (signingIn) return;

    setError("");
    setFieldError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setFieldError("Please enter your work email.");
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      setFieldError("Please enter a valid work email address.");
      return;
    }

    if (!pass) {
      setError("Please enter your password.");
      return;
    }

    try {
      const authenticatedUser = await signIn(
        normalizedEmail,
        pass,
        remember
      );

      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");

      if (authenticatedUser.organizationId) {
        window.location.replace(next || "/dashboard");
      } else {
        window.location.replace("/organization/setup");
      }
    } catch (err: unknown) {
      const status = err instanceof ApiError ? err.status : 0;

      if (status === 401) {
        setError("Invalid email or password. Please try again.");
      } else if (status === 423) {
        setError(
          "Your account is temporarily locked. Please try again later or contact your administrator."
        );
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
        {/* EMAIL */}
        <div className="form-field">
          <label htmlFor={emailId} className="field-label">
            <span>
              Work Email <em>*</em>
            </span>

            <span className="step-number">1</span>
          </label>

          <div
            className={`input-wrap ${
              fieldError ? "has-error" : ""
            }`}
          >
            <Mail size={17} aria-hidden="true" />

            <input
              id={emailId}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldError("");
                setError("");
              }}
              placeholder="Enter your work email"
              aria-invalid={Boolean(fieldError)}
              aria-describedby={
                fieldError ? `${emailId}-error` : undefined
              }
            />
          </div>

          {fieldError && (
            <small
              id={`${emailId}-error`}
              className="field-error"
              role="alert"
            >
              {fieldError}
            </small>
          )}
        </div>

        {/* PASSWORD */}
        <div className="form-field">
          <label htmlFor={passwordId} className="field-label">
            <span>
              Password <em>*</em>
            </span>

            <span className="step-number">2</span>
          </label>

          <div className="input-wrap">
            <LockKeyhole size={17} aria-hidden="true" />

            <input
              id={passwordId}
              name="password"
              autoComplete="current-password"
              type={showPassword ? "text" : "password"}
              value={pass}
              onChange={(e) => {
                setPass(e.target.value);
                setError("");
              }}
              placeholder="Enter your password"
            />

            <button
              type="button"
              className="password-toggle"
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
              onClick={() =>
                setShowPassword((value) => !value)
              }
            >
              {showPassword ? (
                <EyeOff size={17} />
              ) : (
                <Eye size={17} />
              )}
            </button>
          </div>
        </div>

        {/* REMEMBER + FORGOT */}
        <div className="auth-row">
          <label className="remember-check">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />

            <span className="custom-check" />

            <span>Remember Me</span>
          </label>

          <Link href="/auth/forgot-password">
            Forgot Password?
          </Link>
        </div>

        {/* CAPTCHA / SECURITY */}
        <div
          className="captcha-box"
          role="status"
          aria-label="Security verification"
        >
          <span className="captcha-checkbox" />

          <div className="captcha-content">
            <strong>I'm not a robot</strong>
            <small>Security verification</small>
          </div>

          <div className="captcha-brand">
            <ShieldCheck size={22} />
            <small>reCAPTCHA</small>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div
            className="auth-error"
            role="alert"
            aria-live="polite"
          >
            <span className="error-icon">!</span>
            <span>{error}</span>
          </div>
        )}

        {/* LOGIN */}
        <button
          type="submit"
          className="auth-primary"
          disabled={signingIn}
        >
          {signingIn ? (
            <>
              <span className="button-spinner" />
              Signing in...
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>

        {/* DIVIDER */}
        <div className="or-divider">
          <span>or continue with</span>
        </div>

        {/* GOOGLE */}
        <button
          type="button"
          className="sso-button"
          disabled
        >
          <span className="google-icon">G</span>

          <span>Sign in with Google</span>

          <small>Coming soon</small>
        </button>

        {/* MICROSOFT */}
        <button
          type="button"
          className="sso-button"
          disabled
        >
          <span className="microsoft-icon">
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
    <AuthLayout title="Two-Factor Authentication" sub="Enter the 6-digit verification code sent to your registered device.">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <label htmlFor="otp">Security Code (TOTP / SMS)</label>
          <div className="input-wrap">
            <ShieldCheck size={18} className="field-icon" />
            <input
              id="otp"
              type="text"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              autoFocus
              style={{ letterSpacing: "4px", fontSize: "1.2rem", fontWeight: "bold" }}
            />
          </div>
        </div>

        <div className="auth-row">
          <label className="checkbox-wrap">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
            />
            <span>Remember this device for 30 days</span>
          </label>
        </div>

        <button type="submit" className="submit-button" disabled={loading || otp.length < 6}>
          {loading ? "Verifying..." : "Verify & Continue"}
        </button>

        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <button type="button" className="text-link" onClick={() => alert("Verification code resent.")}>
            Resend verification code
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}

export function ForgotScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <AuthLayout title="Reset Password" sub="Enter your work email address to receive password reset instructions.">
      {sent ? (
        <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
          <ShieldCheck size={48} color="#059669" style={{ margin: "0 auto 1rem" }} />
          <h3>Check your inbox</h3>
          <p style={{ color: "#64748b", margin: "0.5rem 0 1.5rem" }}>
            We have sent a secure password reset link to <b>{email}</b>. Link expires in 30 minutes.
          </p>
          <Link href="/login" className="submit-button" style={{ display: "inline-block", textAlign: "center" }}>
            Return to Sign In
          </Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="email">Work Email</label>
            <div className="input-wrap">
              <Mail size={18} className="field-icon" />
              <input
                id="email"
                type="email"
                placeholder="name@pehalhealthcare.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="submit-button">
            Send Reset Instructions
          </button>

          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <Link href="/login" className="text-link">
              Remember your password? Sign In
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}

export function ResetScreen({ expired = false }: { expired?: boolean } = {}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    setDone(true);
  };

  return (
    <AuthLayout
      title={expired ? "Password Expired" : "Create New Password"}
      sub={expired ? "Your password has expired per the 90-day security policy. Please set a new password." : "Your new password must be at least 8 characters with numbers and symbols."}
    >
      {done ? (
        <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
          <ShieldCheck size={48} color="#059669" style={{ margin: "0 auto 1rem" }} />
          <h3>Password Updated</h3>
          <p style={{ color: "#64748b", margin: "0.5rem 0 1.5rem" }}>
            Your credentials have been securely updated. Please sign in with your new password.
          </p>
          <Link href="/login" className="submit-button" style={{ display: "inline-block", textAlign: "center" }}>
            Sign In Now
          </Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="np">New Password</label>
            <div className="input-wrap">
              <LockKeyhole size={18} className="field-icon" />
              <input
                id="np"
                type="password"
                placeholder="••••••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="cp">Confirm New Password</label>
            <div className="input-wrap">
              <LockKeyhole size={18} className="field-icon" />
              <input
                id="cp"
                type="password"
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
          </div>

          <button type="submit" className="submit-button">
            Save New Password
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

export function SessionsScreen() {
  return (
    <AuthLayout title="Active Sessions" sub="Manage and terminate active login sessions across your devices.">
      <div style={{ padding: "1rem 0" }}>
        <div className="card" style={{ padding: "1rem", marginBottom: "1rem", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <b>Windows PC · Chrome Browser</b>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>Hyderabad, India · Active Now</p>
            </div>
            <span style={{ fontSize: "0.8rem", color: "#059669", fontWeight: "bold" }}>CURRENT DEVICE</span>
          </div>
        </div>

        <button
          type="button"
          className="submit-button"
          style={{ background: "#dc2626", borderColor: "#dc2626" }}
          onClick={() => alert("All other sessions revoked.")}
        >
          Revoke All Other Sessions
        </button>

        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <Link href="/dashboard" className="text-link">
            Return to Dashboard
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

export function AccessDenied() {
  return (
    <AuthLayout title="Access Denied" sub="You do not have the required permissions to access this screen.">
      <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🔒</div>
        <h3>403 — Restricted Area</h3>
        <p style={{ color: "#64748b", margin: "0.5rem 0 1.5rem" }}>
          This resource is protected by PH-PMS Role-Based Access Control (RBAC). Please contact your Department Head or System Administrator to request elevated access.
        </p>
        <Link href="/dashboard" className="submit-button" style={{ display: "inline-block", textAlign: "center" }}>
          Back to Dashboard
        </Link>
      </div>
    </AuthLayout>
  );
}