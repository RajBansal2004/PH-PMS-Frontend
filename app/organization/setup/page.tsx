"use client";

import { useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "../../../components/AuthProvider";

import {
  ApiError,
  createOrganization,
} from "../../../lib/api";

export default function OrganizationSetupPage() {
  const router = useRouter();

  const {
    signOut,
    refreshUser,
  } = useAuth();

  const [name, setName] = useState("");

  const [message, setMessage] = useState("");

  const [creating, setCreating] =
    useState(false);

  const [created, setCreated] =
    useState(false);

  const [organizationCode, setOrganizationCode] =
    useState("");

  const submit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const normalizedName =
      name.trim();

    /*
     * ----------------------------------------
     * CLIENT VALIDATION
     * ----------------------------------------
     */

    if (normalizedName.length < 2) {
      setMessage(
        "Please enter a valid organization name."
      );

      return;
    }

    setMessage("");
    setCreating(true);

    try {
      /*
       * ----------------------------------------
       * CREATE ORGANIZATION
       * ----------------------------------------
       *
       * Organization code is intentionally NOT
       * sent from the frontend.
       *
       * Backend automatically generates it.
       */

      const response =
        await createOrganization({
          name: normalizedName,
        });

      /*
       * ----------------------------------------
       * GET GENERATED ORGANIZATION CODE
       * ----------------------------------------
       *
       * Supports the standard API response
       * structure as well as direct response.
       */

      const generatedOrganizationCode =
        response?.organization?.code ||
        response?.data?.organization?.code ||
        response?.code ||
        response?.organizationCode ||
        "";

      if (generatedOrganizationCode) {
        setOrganizationCode(
          generatedOrganizationCode
        );
      }

      /*
       * ----------------------------------------
       * REFRESH USER SESSION
       * ----------------------------------------
       *
       * Before setup:
       *
       * organizationId = null
       *
       * After setup:
       *
       * organizationId = MongoDB ObjectId
       *
       * Refreshing /auth/me makes sure the
       * frontend receives the new organization
       * context.
       */

      const updatedUser =
        await refreshUser();

      if (!updatedUser?.organizationId) {
        throw new ApiError(
          "Organization was created, but the session could not be updated. Please sign in again.",
          500,
          "ORGANIZATION_SESSION_REFRESH_FAILED"
        );
      }

      /*
       * ----------------------------------------
       * SUCCESS STATE
       * ----------------------------------------
       */

      setCreated(true);

      /*
       * Redirect to dashboard.
       */

      window.setTimeout(() => {
        router.replace("/dashboard");
      }, 1000);
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage(
          "Unable to create organization. Please try again."
        );
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="setup-page">
      <section className="setup-card card">

        {/* --------------------------------
            ICON
        --------------------------------- */}

        <div className="setup-icon">
          {created ? (
            <CheckCircle2 size={28} />
          ) : (
            <Building2 size={28} />
          )}
        </div>

        {/* --------------------------------
            EYEBROW
        --------------------------------- */}

        <div className="eyebrow">
          FIRST-TIME SETUP
        </div>

        {/* --------------------------------
            TITLE
        --------------------------------- */}

        <h1>
          {created
            ? "Organization created"
            : "Set up your organization"}
        </h1>

        {/* --------------------------------
            DESCRIPTION
        --------------------------------- */}

        <p>
          {created
            ? "Your administrator account is now linked to the organization. Opening your PH-PMS workspace…"
            : "Create your organization to start using PH-PMS. Your organization code will be generated automatically."}
        </p>

        {/* --------------------------------
            FORM
        --------------------------------- */}

        {!created && (
          <form onSubmit={submit}>

            {/* Organization Name */}

            <label>
              Organization Name

              <div className="input-wrap">
                <Building2 size={15} />

                <input
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(
                      event.target.value
                    );

                    setMessage("");
                  }}
                  placeholder="PehalHealthcare Technologies"
                  maxLength={160}
                  autoFocus
                  autoComplete="organization"
                  required
                />
              </div>
            </label>

            {/* --------------------------------
                AUTO GENERATED CODE INFORMATION
            --------------------------------- */}

            <div className="setup-auto-code">
              <div className="setup-auto-code-icon">
                <ShieldCheck size={16} />
              </div>

              <div>
                <strong>
                  Organization Code
                </strong>

                <span>
                  Automatically generated by
                  the system
                </span>
              </div>
            </div>

            {/* Error */}

            {message && (
              <div
                className="auth-error"
                role="alert"
              >
                {message}
              </div>
            )}

            {/* Submit */}

            <button
              className="auth-primary"
              type="submit"
              disabled={
                !name.trim() ||
                creating
              }
            >
              {creating ? (
                <>
                  <span className="button-spinner" />

                  Creating organization…
                </>
              ) : (
                <>
                  Create Organization

                  <ArrowRight size={16} />
                </>
              )}
            </button>

          </form>
        )}

        {/* --------------------------------
            SUCCESS DETAILS
        --------------------------------- */}

        {created && (
          <div className="organization-created">

            <div className="organization-created-row">
              <span>
                Organization
              </span>

              <strong>
                {name}
              </strong>
            </div>

            {organizationCode && (
              <div className="organization-created-row">
                <span>
                  Organization Code
                </span>

                <strong>
                  {organizationCode}
                </strong>
              </div>
            )}

            <div className="organization-created-success">
              <CheckCircle2 size={17} />

              <span>
                Organization setup completed
                successfully.
              </span>
            </div>

          </div>
        )}

        {/* --------------------------------
            SIGN OUT
        --------------------------------- */}

        {!created && (
          <button
            className="back-btn"
            type="button"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        )}

        {/* --------------------------------
            SECURITY MESSAGE
        --------------------------------- */}

        <div className="setup-security">
          <ShieldCheck size={16} />

          <span>
            Tenant isolation is enforced by the
            backend. The organization ID and
            organization code are generated
            server-side.
          </span>
        </div>

      </section>
    </main>
  );
}