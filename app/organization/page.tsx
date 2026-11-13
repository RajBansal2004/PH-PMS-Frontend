"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import React from "react";

import {

  Activity, Building2, Check, ClipboardList, Edit3, ExternalLink,

  FileText, Globe2, History, Landmark, Link2, Loader2, Mail, MapPin,

  Palette, Phone, RefreshCw, Save, Settings, ShieldCheck, SlidersHorizontal,

  Upload, Users, WalletCards, X

} from "lucide-react";

import {
  ApiError,
  getOrganization,
  updateOrganization,
  updateOrganizationBranding,
  updateOrganizationConfiguration,
  updateOrganizationPreferences,
} from "../../lib/api";

import { getOrganizationId } from "../../lib/auth";

import "./organization.css";

type TabKey =

  | "overview" | "basic" | "contact" | "branding"

  | "configuration" | "preferences" | "integrations"

  | "bank" | "documents" | "users" | "audit";

type Organization = {

  _id?: string;

  id?: string;

  name?: string | null;

  legalName?: string | null;

  shortName?: string | null;

  code?: string;

  industry?: string | null;

  organizationType?: string;

  establishedOn?: string | null;

  gstin?: string | null;

  pan?: string | null;

  website?: string | null;

  employeeStrength?: number;

  description?: string | null;

  contact?: {

    primaryEmail?: string | null;

    primaryPhone?: string | null;

    alternateEmail?: string | null;

    alternatePhone?: string | null;

  };

  address?: {

    addressLine1?: string | null;

    addressLine2?: string | null;

    city?: string | null;

    state?: string | null;

    country?: string;

    postalCode?: string | null;

  };

  branding?: {

    logo?: string | null;

    favicon?: string | null;

    loginBackground?: string | null;

    primaryColor?: string;

    secondaryColor?: string;

    accentColor?: string;

    sidebarTheme?: "LIGHT" | "DARK";

  };

  configuration?: {

    dateFormat?: string;

    timeFormat?: "12H" | "24H";

    firstDayOfWeek?: string;

    fiscalYearStartMonth?: number;

    language?: string;

    timezone?: string;

    currency?: string;

    workingDays?: string[];

    weekHours?: number;

    hoursPerDay?: number;

  };

  preferences?: {

    allowUsersToSignUp?: boolean;

    emailNotifications?: boolean;

    taskDueDateReminders?: boolean;

    projectStatusAlerts?: boolean;

    enableTimesheetApproval?: boolean;

    enableBudgetAlerts?: boolean;

    defaultTaskView?: string;

    itemsPerPage?: 10 | 25 | 50 | 100;

    themeMode?: "LIGHT" | "DARK" | "SYSTEM";

  };

  status?: string;

  createdAt?: string;

  updatedAt?: string;

};

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [

  { key: "overview", label: "Overview", icon: <Building2 size={14} /> },

  { key: "basic", label: "Basic Information", icon: <ClipboardList size={14} /> },

  { key: "contact", label: "Contact & Address", icon: <MapPin size={14} /> },

  { key: "branding", label: "Branding", icon: <Palette size={14} /> },

  { key: "configuration", label: "Configuration", icon: <Settings size={14} /> },

  { key: "preferences", label: "Preferences", icon: <SlidersHorizontal size={14} /> },

  { key: "integrations", label: "Integrations", icon: <Link2 size={14} /> },

  { key: "bank", label: "Bank Details", icon: <Landmark size={14} /> },

  { key: "documents", label: "Documents", icon: <FileText size={14} /> },

  { key: "users", label: "Users & Roles", icon: <Users size={14} /> },

  { key: "audit", label: "Audit Log", icon: <History size={14} /> },

];

const defaultOrg: Organization = {

  name: "",

  contact: {},

  address: { country: "India" },

  branding: { primaryColor: "#1D4ED8", secondaryColor: "#0F766E", accentColor: "#F59E0B", sidebarTheme: "DARK" },

  configuration: { dateFormat: "DD MMM YYYY", timeFormat: "12H", firstDayOfWeek: "MONDAY", fiscalYearStartMonth: 4, language: "en", timezone: "Asia/Kolkata", currency: "INR", workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"], weekHours: 40, hoursPerDay: 8 },

  preferences: { allowUsersToSignUp: false, emailNotifications: true, taskDueDateReminders: true, projectStatusAlerts: true, enableTimesheetApproval: true, enableBudgetAlerts: true, defaultTaskView: "KANBAN", itemsPerPage: 25, themeMode: "SYSTEM" },

};

function unwrap<T>(body: unknown): T {

  const value = body as { data?: unknown };

  if (value && typeof value === "object" && "data" in value) {

    const first = value.data as { data?: unknown } | T;

    if (first && typeof first === "object" && "data" in first) {

      return (first as { data: T }).data;

    }

    return first as T;

  }

  return body as T;

}

function messageOf(error: unknown) {

  if (error instanceof ApiError || error instanceof Error) return error.message;

  return "Something went wrong. Please try again.";

}

function orgId(org: Organization | null) { return org?.id || org?._id || ""; }

function val(value: unknown) { return value == null ? "" : String(value); }

function Field({ label, children, full = false, required = false }: {

  label: string; children: React.ReactNode; full?: boolean; required?: boolean;

}) {

  return <label className={`org-field ${full ? "org-field-full" : ""}`}>

    <span className="org-field-label">{label}{required ? " *" : ""}</span>

    {children}

  </label>;

}

function Input({ value, onChange, disabled, type = "text", placeholder }: {

  value: string; onChange: (value: string) => void; disabled: boolean; type?: string; placeholder?: string;

}) {

  return <input className="org-input" type={type} value={value} disabled={disabled} placeholder={placeholder}

    onChange={(event) => onChange(event.target.value)} />;

}

function Select({ value, onChange, disabled, children }: {

  value: string; onChange: (value: string) => void; disabled: boolean; children: React.ReactNode;

}) {

  return <select className="org-select" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>{children}</select>;

}

function EditorCard({ title, description, children }: {

  title: string; description: string; children: React.ReactNode;

}) {

  return <section className="org-card"><div className="org-card-body">

    <div className="org-section-heading"><div><h2>{title}</h2><p>{description}</p></div></div>

    {children}

  </div></section>;

}

export default function OrganizationPage() {

  const [tab, setTab] = useState<TabKey>("overview");

  const [organization, setOrganization] = useState<Organization | null>(null);

  const [draft, setDraft] = useState<Organization>(defaultOrg);

  const [editing, setEditing] = useState(false);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [copied, setCopied] = useState(false);

  const idFromSession = getOrganizationId();

  const id = useMemo(() => orgId(organization) || idFromSession || "", [organization, idFromSession]);

  const load = useCallback(async () => {

    if (!idFromSession) {

      setError("Organization setup is required before opening this page.");

      setLoading(false);

      return;

    }

    setLoading(true); setError(""); setSuccess("");

    try {

      // The backend derives tenant access from the authenticated user; this ID is only the resource locator.

      const result = unwrap<Organization>(await getOrganization());

      setOrganization(result);

      setDraft(result);

    } catch (e) {

      setError(messageOf(e));

    } finally {

      setLoading(false);

    }

  }, [idFromSession]);

  useEffect(() => { void load(); }, [load]);

  function patch<K extends keyof Organization>(key: K, value: Organization[K]) {

    setDraft((current) => ({ ...current, [key]: value }));

  }

  function patchNested<K extends "contact" | "address" | "branding" | "configuration" | "preferences">(

    section: K, key: string, value: unknown

  ) {

    setDraft((current) => ({

      ...current,

      [section]: { ...(current[section] as object | undefined), [key]: value },

    }));

  }

  function beginEdit() { setError(""); setSuccess(""); setDraft(organization || defaultOrg); setEditing(true); }

  function cancelEdit() { setDraft(organization || defaultOrg); setEditing(false); setError(""); }

  async function save() {
    if (!id) {
      setError("Organization ID is missing. Refresh and try again.");
      return;
    }

    if (!draft.name?.trim()) {
      setError("Organization name is required.");
      setTab("basic");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      let updated: unknown;

      if (tab === "branding") {
        updated = await updateOrganizationBranding(id, {
          logo: draft.branding?.logo ?? null,
          favicon: draft.branding?.favicon ?? null,
          loginBackground: draft.branding?.loginBackground ?? null,
          primaryColor: draft.branding?.primaryColor,
          secondaryColor: draft.branding?.secondaryColor,
          accentColor: draft.branding?.accentColor,
          sidebarTheme: draft.branding?.sidebarTheme,
        });
      } else if (tab === "configuration") {
        updated = await updateOrganizationConfiguration(id, {
          ...draft.configuration,
        });
      } else if (tab === "preferences") {
        updated = await updateOrganizationPreferences(id, {
          ...draft.preferences,
        });
      } else {
        // Backend maps these flat profile fields into the organization document.
        updated = await updateOrganization(id, {
          name: draft.name.trim(),
          legalName: draft.legalName ?? null,
          shortName: draft.shortName ?? null,
          industry: draft.industry ?? null,
          organizationType: draft.organizationType,
          establishedOn: draft.establishedOn ?? null,
          gstin: draft.gstin ?? null,
          pan: draft.pan ?? null,
          website: draft.website ?? null,
          employeeStrength: draft.employeeStrength ?? 0,
          description: draft.description ?? null,
          email: draft.contact?.primaryEmail ?? null,
          phone: draft.contact?.primaryPhone ?? null,
          alternateEmail: draft.contact?.alternateEmail ?? null,
          alternatePhone: draft.contact?.alternatePhone ?? null,
          addressLine1: draft.address?.addressLine1 ?? null,
          addressLine2: draft.address?.addressLine2 ?? null,
          city: draft.address?.city ?? null,
          state: draft.address?.state ?? null,
          postalCode: draft.address?.postalCode ?? null,
        });
      }

      // Fetch the canonical record through the shared authenticated API client.
      const canonical = unwrap<Organization>(await getOrganization());
      const savedOrganization = canonical || unwrap<Organization>(updated);

      setOrganization(savedOrganization);
      setDraft(savedOrganization);
      setEditing(false);
      setSuccess("Changes saved successfully.");
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setSaving(false);
    }
  }

  async function copyId() {

    if (!id) return;

    try {

      await navigator.clipboard.writeText(id);

      setCopied(true);

      window.setTimeout(() => setCopied(false), 1500);

    } catch { setError("Clipboard access is unavailable in this browser."); }

  }

  if (loading) return <div className="org-page"><div className="org-container"><div className="org-card"><div className="org-card-body">Loading organization profile…</div></div></div></div>;

  const org = organization || defaultOrg;

  const isEditableTab = ["basic", "contact", "branding", "configuration", "preferences"].includes(tab);

  const start = (key: TabKey) => { setTab(key); setError(""); setSuccess(""); };

  return <main className="org-page"><div className="org-container">

    <header className="org-page-header">

      <div className="org-page-title-wrap"><div className="org-page-title-icon"><Building2 size={20} /></div>

        <div><h1 className="org-page-title">Organization Profile</h1><p className="org-page-subtitle">View and manage your organization details and settings</p></div>

      </div>

      <div className="org-header-actions">

        <button type="button" className="org-btn org-btn-secondary" onClick={() => void load()} disabled={loading || saving}><RefreshCw size={14} /> Refresh</button>

        {!editing ? <button type="button" className="org-btn org-btn-primary" onClick={() => { if (isEditableTab) beginEdit(); else start("basic"); }}><Edit3 size={14} /> Edit Profile</button> : <>

          <button type="button" className="org-btn org-btn-secondary" onClick={cancelEdit} disabled={saving}><X size={14} /> Cancel</button>

          <button type="button" className="org-btn org-btn-primary" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 size={14} className="org-spin" /> : <Save size={14} />}{saving ? "Saving…" : "Save Changes"}</button>

        </>}

      </div>

    </header>

    {error && <div className="org-alert org-alert-error" role="alert"><strong>Unable to complete request</strong><div>{error}</div></div>}

    {success && <div className="org-alert org-alert-success" role="status"><Check size={15} /> {success}</div>}

    <nav className="org-tabs-wrapper" aria-label="Organization sections"><div className="org-tabs">

      {tabs.map((item) => <button key={item.key} type="button" className={`org-tab ${tab === item.key ? "org-tab-active" : ""}`} onClick={() => { if (editing) { setDraft(organization || defaultOrg); setEditing(false); } start(item.key); }}>{item.icon}<span>{item.label}</span></button>)}

    </div></nav>

    {tab === "overview" && (
      <section className="org-overview-layout">
        {/* 1. Organization identity */}
        <article className="org-overview-card org-overview-identity">
          <div className="org-overview-card-heading">
            <h2>Organization Logo</h2>
            <button
              type="button"
              className="org-overview-icon-btn"
              title="Edit branding"
              onClick={() => {
                start("branding");
                beginEdit();
              }}
            >
              <Edit3 size={14} />
            </button>
          </div>

          <div className="org-overview-logo-box">
            {org.branding?.logo ? (
              <img
                className="org-overview-logo"
                src={org.branding.logo}
                alt={`${org.name || "Organization"} logo`}
              />
            ) : (
              <div className="org-overview-logo-fallback">
                <Building2 size={34} />
              </div>
            )}

            <strong>{org.name || "Organization Name"}</strong>
            <span>{org.shortName || org.industry || "Organization profile"}</span>

            <button
              type="button"
              className="org-overview-change-logo"
              onClick={() => {
                start("branding");
                beginEdit();
              }}
            >
              <Upload size={13} />
              Change Logo
            </button>
          </div>

          <div className="org-overview-meta">
            <span>Organization ID</span>
            <div className="org-overview-id">
              <strong title={id}>{id || "Not available"}</strong>
              <button
                type="button"
                className="org-overview-icon-btn"
                onClick={() => void copyId()}
                disabled={!id}
                title="Copy organization ID"
              >
                {copied ? <Check size={13} /> : <ClipboardList size={13} />}
              </button>
            </div>
          </div>

          <div className="org-overview-meta org-overview-status-row">
            <span>Status</span>
            <span className="org-overview-status">
              <span className="org-overview-status-dot" />
              {org.status || "Unknown"}
            </span>
          </div>
        </article>

        {/* 2. Organization summary */}
        <article className="org-overview-card org-overview-summary">
          <div className="org-overview-card-heading">
            <div>
              <h2>Organization Summary</h2>
              <p>Registered organization information</p>
            </div>
            <button
              type="button"
              className="org-overview-icon-btn"
              title="Edit basic information"
              onClick={() => {
                start("basic");
                beginEdit();
              }}
            >
              <Edit3 size={14} />
            </button>
          </div>

          <div className="org-overview-detail-list">
            <OverviewDetail label="Organization Name" value={org.name} />
            <OverviewDetail label="Legal Name" value={org.legalName} />
            <OverviewDetail label="Short Name" value={org.shortName} />
            <OverviewDetail label="Industry" value={org.industry} />
            <OverviewDetail label="Organization Type" value={org.organizationType} />
            <OverviewDetail label="Established On" value={org.establishedOn} />
            <OverviewDetail label="GSTIN" value={org.gstin} />
            <OverviewDetail label="PAN" value={org.pan} />

            <div className="org-overview-detail-row">
              <span>Website</span>
              <strong className="org-overview-detail-value">
                {org.website ? (
                  <a
                    href={
                      /^https?:\/\//i.test(org.website)
                        ? org.website
                        : `https://${org.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {org.website}
                    <ExternalLink size={12} />
                  </a>
                ) : (
                  "—"
                )}
              </strong>
            </div>

            <OverviewDetail
              label="Employee Strength"
              value={
                org.employeeStrength != null
                  ? org.employeeStrength.toLocaleString()
                  : undefined
              }
            />
            <OverviewDetail
              label="Time Zone"
              value={org.configuration?.timezone}
            />
            <OverviewDetail
              label="Currency"
              value={org.configuration?.currency}
            />
          </div>
        </article>

        {/* 3. Contact and registered address */}
        <div className="org-overview-contact-stack">
          <article className="org-overview-card">
            <div className="org-overview-card-heading">
              <div>
                <h2>Primary Contact</h2>
                <p>Organization contact information</p>
              </div>
              <button
                type="button"
                className="org-overview-icon-btn"
                title="Edit contact details"
                onClick={() => {
                  start("contact");
                  beginEdit();
                }}
              >
                <Edit3 size={14} />
              </button>
            </div>

            <div className="org-overview-contact-item">
              <span className="org-overview-contact-icon">
                <Mail size={15} />
              </span>
              <div>
                <span>Primary Email</span>
                {org.contact?.primaryEmail ? (
                  <a href={`mailto:${org.contact.primaryEmail}`}>
                    {org.contact.primaryEmail}
                  </a>
                ) : (
                  <strong>Not provided</strong>
                )}
              </div>
            </div>

            <div className="org-overview-contact-item">
              <span className="org-overview-contact-icon">
                <Phone size={15} />
              </span>
              <div>
                <span>Primary Phone</span>
                {org.contact?.primaryPhone ? (
                  <a href={`tel:${org.contact.primaryPhone}`}>
                    {org.contact.primaryPhone}
                  </a>
                ) : (
                  <strong>Not provided</strong>
                )}
              </div>
            </div>

            {(org.contact?.alternateEmail || org.contact?.alternatePhone) && (
              <div className="org-overview-contact-extra">
                {org.contact.alternateEmail && (
                  <div>
                    <span>Alternate Email</span>
                    <strong>{org.contact.alternateEmail}</strong>
                  </div>
                )}
                {org.contact.alternatePhone && (
                  <div>
                    <span>Alternate Phone</span>
                    <strong>{org.contact.alternatePhone}</strong>
                  </div>
                )}
              </div>
            )}
          </article>

          <article className="org-overview-card org-overview-address-card">
            <div className="org-overview-card-heading">
              <div>
                <h2>Registered Address</h2>
                <p>Official organization location</p>
              </div>
              <MapPin size={16} className="org-overview-muted-icon" />
            </div>

            <div className="org-overview-address">
              <span className="org-overview-contact-icon">
                <MapPin size={15} />
              </span>
              <p>
                {[
                  org.address?.addressLine1,
                  org.address?.addressLine2,
                  org.address?.city,
                  org.address?.state,
                  org.address?.postalCode,
                  org.address?.country,
                ]
                  .filter(Boolean)
                  .join(", ") || "Address not configured."}
              </p>
            </div>

            <button
              type="button"
              className="org-overview-text-link"
              onClick={() => {
                start("contact");
                beginEdit();
              }}
            >
              Update address <Edit3 size={12} />
            </button>
          </article>
        </div>

        {/* 4. Real organization stats; no fabricated project/user counts */}
        <article className="org-overview-card org-overview-quick-stats">
          <div className="org-overview-card-heading">
            <div>
              <h2>Quick Stats</h2>
              <p>Organization record overview</p>
            </div>
            <Activity size={16} className="org-overview-muted-icon" />
          </div>

          <div className="org-overview-stat">
            <span className="org-overview-stat-icon org-stat-blue">
              <Building2 size={17} />
            </span>
            <div>
              <span>Profile Status</span>
              <strong>{org.status || "Unknown"}</strong>
              <small>Organization record</small>
            </div>
          </div>

          <div className="org-overview-stat">
            <span className="org-overview-stat-icon org-stat-green">
              <Users size={17} />
            </span>
            <div>
              <span>Employee Strength</span>
              <strong>
                {org.employeeStrength != null
                  ? org.employeeStrength.toLocaleString()
                  : "—"}
              </strong>
              <small>As recorded in organization profile</small>
            </div>
          </div>

          <div className="org-overview-stat">
            <span className="org-overview-stat-icon org-stat-purple">
              <ShieldCheck size={17} />
            </span>
            <div>
              <span>Profile Completeness</span>
              <strong>
                {Math.round(
                  ([
                    org.name,
                    org.legalName,
                    org.industry,
                    org.contact?.primaryEmail,
                    org.contact?.primaryPhone,
                    org.address?.addressLine1,
                    org.address?.city,
                    org.gstin,
                  ].filter((value) => Boolean(String(value ?? "").trim())).length /
                    8) *
                  100
                )}%
              </strong>
              <small>Based on 8 key profile fields</small>
            </div>
          </div>

          <div className="org-overview-stat">
            <span className="org-overview-stat-icon org-stat-amber">
              <History size={17} />
            </span>
            <div>
              <span>Last Updated</span>
              <strong>
                {org.updatedAt
                  ? new Date(org.updatedAt).toLocaleDateString()
                  : "—"}
              </strong>
              <small>
                {org.updatedAt
                  ? new Date(org.updatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  : "No update timestamp"}
              </small>
            </div>
          </div>

          <button
            type="button"
            className="org-overview-full-link"
            onClick={() => {
              start("basic");
              beginEdit();
            }}
          >
            Review organization profile
            <ExternalLink size={13} />
          </button>
        </article>
      </section>
    )}

    {tab === "basic" && <EditorCard title="Basic Information" description="Edit the legal and identity details.">

      <div className="org-form-grid">

        <Field label="Organization Name" required><Input value={val(draft.name)} disabled={!editing} onChange={(v) => patch("name", v)} /></Field>

        <Field label="Legal Name"><Input value={val(draft.legalName)} disabled={!editing} onChange={(v) => patch("legalName", v)} /></Field>

        <Field label="Short Name"><Input value={val(draft.shortName)} disabled={!editing} onChange={(v) => patch("shortName", v)} /></Field>

        <Field label="Industry"><Input value={val(draft.industry)} disabled={!editing} onChange={(v) => patch("industry", v)} /></Field>

        <Field label="Organization Type"><Select value={val(draft.organizationType || "PRIVATE_LIMITED")} disabled={!editing} onChange={(v) => patch("organizationType", v)}><option value="PRIVATE_LIMITED">Private Limited</option><option value="PUBLIC_LIMITED">Public Limited</option><option value="PARTNERSHIP">Partnership</option><option value="LLP">LLP</option><option value="PROPRIETORSHIP">Proprietorship</option><option value="NON_PROFIT">Non-profit</option><option value="OTHER">Other</option></Select></Field>

        <Field label="Established On"><Input type="date" value={draft.establishedOn ? String(draft.establishedOn).slice(0, 10) : ""} disabled={!editing} onChange={(v) => patch("establishedOn", v || null)} /></Field>

        <Field label="GSTIN"><Input value={val(draft.gstin)} disabled={!editing} onChange={(v) => patch("gstin", v.toUpperCase())} /></Field>

        <Field label="PAN"><Input value={val(draft.pan)} disabled={!editing} onChange={(v) => patch("pan", v.toUpperCase())} /></Field>

        <Field label="Website"><Input value={val(draft.website)} disabled={!editing} onChange={(v) => patch("website", v)} placeholder="https://example.com" /></Field>

        <Field label="Employee Strength"><Input type="number" value={val(draft.employeeStrength)} disabled={!editing} onChange={(v) => patch("employeeStrength", v === "" ? 0 : Number(v))} /></Field>

        <Field label="Description" full><textarea className="org-textarea" value={val(draft.description)} disabled={!editing} onChange={(e) => patch("description", e.target.value)} rows={4} /></Field>

      </div>

    </EditorCard>}

    {tab === "contact" && <EditorCard title="Contact & Address" description="Changes are saved to the organization's contact and registered address fields.">

      <div className="org-form-grid">

        <Field label="Primary Email"><Input value={val(draft.contact?.primaryEmail)} disabled={!editing} onChange={(v) => patchNested("contact", "primaryEmail", v)} type="email" /></Field>

        <Field label="Primary Phone"><Input value={val(draft.contact?.primaryPhone)} disabled={!editing} onChange={(v) => patchNested("contact", "primaryPhone", v)} /></Field>

        <Field label="Alternate Email"><Input value={val(draft.contact?.alternateEmail)} disabled={!editing} onChange={(v) => patchNested("contact", "alternateEmail", v)} type="email" /></Field>

        <Field label="Alternate Phone"><Input value={val(draft.contact?.alternatePhone)} disabled={!editing} onChange={(v) => patchNested("contact", "alternatePhone", v)} /></Field>

        <Field label="Address Line 1" full><Input value={val(draft.address?.addressLine1)} disabled={!editing} onChange={(v) => patchNested("address", "addressLine1", v)} /></Field>

        <Field label="Address Line 2" full><Input value={val(draft.address?.addressLine2)} disabled={!editing} onChange={(v) => patchNested("address", "addressLine2", v)} /></Field>

        <Field label="City"><Input value={val(draft.address?.city)} disabled={!editing} onChange={(v) => patchNested("address", "city", v)} /></Field>

        <Field label="State"><Input value={val(draft.address?.state)} disabled={!editing} onChange={(v) => patchNested("address", "state", v)} /></Field>

        <Field label="Postal Code"><Input value={val(draft.address?.postalCode)} disabled={!editing} onChange={(v) => patchNested("address", "postalCode", v)} /></Field>

        <Field label="Country"><Input value={val(draft.address?.country || "India")} disabled={!editing} onChange={(v) => patchNested("address", "country", v)} /></Field>

      </div>

    </EditorCard>}

    {tab === "branding" && <EditorCard title="Branding" description="Set organization logo and brand colors.">

      <div className="org-brand-preview" style={{ background: draft.branding?.primaryColor || "#1D4ED8", color: "#fff", padding: 20, borderRadius: 12, marginBottom: 20 }}>

        {draft.branding?.logo && <img src={draft.branding.logo} alt="Brand preview" style={{ maxWidth: 120, maxHeight: 56, objectFit: "contain" }} />}

        <strong>{draft.name || "Your Organization"}</strong><span style={{ display: "block", opacity: .85 }}>PH-PMS Organization</span>

      </div>

      <div className="org-form-grid">

        <Field label="Logo URL" full><Input value={val(draft.branding?.logo)} disabled={!editing} onChange={(v) => patchNested("branding", "logo", v || null)} placeholder="https://..." /></Field>

        <Field label="Favicon URL"><Input value={val(draft.branding?.favicon)} disabled={!editing} onChange={(v) => patchNested("branding", "favicon", v || null)} /></Field>

        <Field label="Login Background URL"><Input value={val(draft.branding?.loginBackground)} disabled={!editing} onChange={(v) => patchNested("branding", "loginBackground", v || null)} /></Field>

        {(["primaryColor", "secondaryColor", "accentColor"] as const).map((key) => <Field key={key} label={key.replace(/([A-Z])/g, " $1")}><div style={{ display: "flex", gap: 8, alignItems: "center" }}><input aria-label={key} type="color" value={draft.branding?.[key] || "#1D4ED8"} disabled={!editing} onChange={(e) => patchNested("branding", key, e.target.value)} /><Input value={val(draft.branding?.[key] || "")} disabled={!editing} onChange={(v) => patchNested("branding", key, v)} /></div></Field>)}

        <Field label="Sidebar Theme"><Select value={val(draft.branding?.sidebarTheme || "DARK")} disabled={!editing} onChange={(v) => patchNested("branding", "sidebarTheme", v)}><option value="DARK">Dark</option><option value="LIGHT">Light</option></Select></Field>

      </div>

    </EditorCard>}

    {tab === "configuration" && <EditorCard title="Configuration" description="Regional settings and working calendar.">

      <div className="org-form-grid">

        <Field label="Timezone"><Select value={val(draft.configuration?.timezone || "Asia/Kolkata")} disabled={!editing} onChange={(v) => patchNested("configuration", "timezone", v)}><option value="Asia/Kolkata">Asia/Kolkata (UTC+05:30)</option><option value="Asia/Dubai">Asia/Dubai</option><option value="Europe/London">Europe/London</option><option value="America/New_York">America/New_York</option></Select></Field>

        <Field label="Currency"><Select value={val(draft.configuration?.currency || "INR")} disabled={!editing} onChange={(v) => patchNested("configuration", "currency", v)}><option value="INR">INR — Indian Rupee</option><option value="USD">USD — US Dollar</option><option value="EUR">EUR — Euro</option><option value="GBP">GBP — Pound Sterling</option></Select></Field>

        <Field label="Date Format"><Select value={val(draft.configuration?.dateFormat || "DD MMM YYYY")} disabled={!editing} onChange={(v) => patchNested("configuration", "dateFormat", v)}><option>DD MMM YYYY</option><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></Select></Field>

        <Field label="Time Format"><Select value={val(draft.configuration?.timeFormat || "12H")} disabled={!editing} onChange={(v) => patchNested("configuration", "timeFormat", v)}><option value="12H">12-hour</option><option value="24H">24-hour</option></Select></Field>

        <Field label="First Day of Week"><Select value={val(draft.configuration?.firstDayOfWeek || "MONDAY")} disabled={!editing} onChange={(v) => patchNested("configuration", "firstDayOfWeek", v)}>{["MONDAY", "SUNDAY", "SATURDAY"].map((day) => <option key={day} value={day}>{day[0] + day.slice(1).toLowerCase()}</option>)}</Select></Field>

        <Field label="Fiscal Year Start Month"><Select value={val(draft.configuration?.fiscalYearStartMonth ?? 4)} disabled={!editing} onChange={(v) => patchNested("configuration", "fiscalYearStartMonth", Number(v))}>{Array.from({ length: 12 }, (_, i) => i + 1).map((month) => <option key={month} value={month}>{new Date(2000, month - 1, 1).toLocaleString("en", { month: "long" })}</option>)}</Select></Field>

        <Field label="Language"><Input value={val(draft.configuration?.language || "en")} disabled={!editing} onChange={(v) => patchNested("configuration", "language", v)} /></Field>

        <Field label="Hours per Day"><Input type="number" value={val(draft.configuration?.hoursPerDay ?? 8)} disabled={!editing} onChange={(v) => patchNested("configuration", "hoursPerDay", Number(v))} /></Field>

        <Field label="Hours per Week"><Input type="number" value={val(draft.configuration?.weekHours ?? 40)} disabled={!editing} onChange={(v) => patchNested("configuration", "weekHours", Number(v))} /></Field>

      </div>

      <div className="org-subsection"><h3>Working Days</h3><div className="org-working-days">

        {["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map((day) => {

          const selected = draft.configuration?.workingDays || [];

          const checked = selected.includes(day);

          return <label key={day} className="org-day"><input type="checkbox" disabled={!editing} checked={checked} onChange={(e) => patchNested("configuration", "workingDays", e.target.checked ? [...selected, day] : selected.filter((x) => x !== day))} />{day.slice(0, 3)}</label>;

        })}

      </div></div>

    </EditorCard>}

    {tab === "preferences" && <EditorCard title="Preferences" description="These settings are persisted through the organization preferences API.">

      <div className="org-preference-list">

        {([

          ["allowUsersToSignUp", "Allow users to sign up", "Allow users to initiate account registration."],

          ["emailNotifications", "Email notifications", "Send system notifications through email."],

          ["taskDueDateReminders", "Task due-date reminders", "Notify assignees about approaching due dates."],

          ["projectStatusAlerts", "Project status alerts", "Notify members when project status changes."],

          ["enableTimesheetApproval", "Timesheet approval", "Require approval for submitted timesheets."],

          ["enableBudgetAlerts", "Budget alerts", "Notify authorized users about budget thresholds."],

        ] as const).map(([key, title, description]) => <label key={key} className="org-preference-row">

          <span><strong className="org-preference-title">{title}</strong><small className="org-preference-description">{description}</small></span>

          <input type="checkbox" disabled={!editing} checked={Boolean(draft.preferences?.[key])} onChange={(e) => patchNested("preferences", key, e.target.checked)} />

        </label>)}

        <Field label="Default Task View"><Select value={val(draft.preferences?.defaultTaskView || "KANBAN")} disabled={!editing} onChange={(v) => patchNested("preferences", "defaultTaskView", v)}><option value="KANBAN">Kanban Board</option><option value="LIST">List</option><option value="TABLE">Table</option></Select></Field>

        <Field label="Items Per Page"><Select value={val(draft.preferences?.itemsPerPage || 25)} disabled={!editing} onChange={(v) => patchNested("preferences", "itemsPerPage", Number(v))}>{[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>

        <Field label="Theme Mode"><Select value={val(draft.preferences?.themeMode || "SYSTEM")} disabled={!editing} onChange={(v) => patchNested("preferences", "themeMode", v)}><option value="LIGHT">Light</option><option value="DARK">Dark</option><option value="SYSTEM">System</option></Select></Field>

      </div>

    </EditorCard>}

    {tab === "integrations" && (
  <EditorCard
    title="Integrations"
    description="Manage connected third-party services."
  >
    <div className="org-shot-section">
      <h3>Connected Integrations</h3>

      <div className="org-service-list">
        {[
          { name: "Google Workspace", status: "Connected", color: "#4285F4", logo: "G" },
          { name: "Microsoft 365", status: "Not Connected", color: "#0F9DCE", logo: "▦" },
          { name: "Slack", status: "Connected", color: "#611F69", logo: "✣" },
          { name: "GitHub", status: "Connected", color: "#24292F", logo: "GH" },
          { name: "AWS", status: "Not Connected", color: "#FF9900", logo: "aws" },
          { name: "Twilio (SMS)", status: "Connected", color: "#F22F46", logo: "◎" },
          { name: "Zoom", status: "Not Connected", color: "#2D8CFF", logo: "Z" },
        ].map((service) => (
          <div className="org-service-row" key={service.name}>
            <div
              className="org-service-logo"
              style={{ color: service.color }}
            >
              {service.logo}
            </div>

            <div className="org-service-info">
              <strong>{service.name}</strong>
              <span
                className={
                  service.status === "Connected"
                    ? "org-service-connected"
                    : "org-service-disconnected"
                }
              >
                {service.status}
              </span>
            </div>

            <button
              type="button"
              className="org-service-button"
              onClick={() =>
                setError(
                  `${service.name}: configure the backend integration before connecting this service.`
                )
              }
            >
              {service.status === "Connected" ? "Manage" : "Connect"}
            </button>
          </div>
        ))}
      </div>

      <p className="org-shot-note">
        Integration statuses are placeholders until verified by the backend.
      </p>
    </div>
  </EditorCard>
)}


{tab === "bank" && (
  <EditorCard
    title="Bank Details"
    description="Manage your organization's bank account information."
  >
    <BankDetailsSection />
  </EditorCard>
)}

{/* DOCUMENTS */}
{tab === "documents" && (
  <EditorCard
    title="Organization Documents"
    description="Manage legal, tax and compliance documents."
  >
    <div className="org-section-toolbar">
      <div>
        <h3>Organization Documents</h3>
        <p>Certificates, registrations and compliance records.</p>
      </div>
      <button
        type="button"
        className="org-action-btn"
        onClick={() => {
          setError(
            "Document upload requires a configured backend upload API."
          );
        }}
      >
        <Upload size={15} />
        Upload Document
      </button>
    </div>

    <div className="org-data-table-wrap">
      <table className="org-data-table">
        <thead>
          <tr>
            <th>Document Name</th>
            <th>Type</th>
            <th>Uploaded On</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Certificate of Incorporation", "Legal"],
            ["GST Certificate", "Tax"],
            ["PAN Card", "Legal"],
            ["MOA / AOA", "Legal"],
            ["Trade License", "Compliance"],
            ["ISO Certificate", "Compliance"],
          ].map(([name, type]) => (
            <tr key={name}>
              <td><strong>{name}</strong></td>
              <td>{type}</td>
              <td>—</td>
              <td>
                <span className="org-config-status">
                  Not uploaded
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </EditorCard>
)}

{/* USERS & ROLES */}
{tab === "users" && (
  <EditorCard
    title="Users & Roles"
    description="Manage organization users and access permissions."
  >
    <div className="org-section-toolbar">
      <div>
        <h3>User Roles Summary</h3>
        <p>Role and permission information from the organization.</p>
      </div>
    </div>

    <div className="org-data-table-wrap">
      <table className="org-data-table">
        <thead>
          <tr>
            <th>Role</th>
            <th>Description</th>
            <th>Users</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Super Admin", "Full administrative access"],
            ["Project Manager", "Manage projects and teams"],
            ["Team Lead", "Manage team and tasks"],
            ["Employee", "Standard employee access"],
            ["Client", "Limited client access"],
            ["Viewer", "Read-only access"],
          ].map(([role, description]) => (
            <tr key={role}>
              <td><strong>{role}</strong></td>
              <td>{description}</td>
              <td>—</td>
              <td>
                <button
                  type="button"
                  className="org-action-btn"
                  onClick={() => {
                    setError(
                      "User and role management requires the roles API."
                    );
                  }}
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </EditorCard>
)}

{tab === "audit" && (
  <EditorCard
    title="Audit Log"
    description="Track changes and security activity across your organization."
  >
    <div className="org-shot-section">
      <div className="org-shot-heading">
        <div>
          <h3>Recent Activity</h3>
          <p>Organization activity and change history</p>
        </div>
      </div>

      <div className="org-audit-table-wrap">
        <table className="org-audit-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Action</th>
              <th>Module</th>
              <th>Date &amp; Time</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4}>
                <div className="org-audit-empty">
                  <History size={26} />
                  <strong>No audit records available</strong>
                  <span>
                    Connect the audit API to show actual organization activity.
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="org-shot-note">
        Audit entries should be loaded from the backend and must not be fabricated.
      </div>
    </div>
  </EditorCard>
)}

    {isEditableTab && <div className="org-form-footer">

      {!editing ? <button type="button" className="org-btn org-btn-primary" onClick={beginEdit}><Edit3 size={14} /> Edit {tabs.find((x) => x.key === tab)?.label}</button> : <>

        <button type="button" className="org-btn org-btn-secondary" onClick={cancelEdit} disabled={saving}><X size={14} /> Cancel</button>

        <button type="button" className="org-btn org-btn-primary" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 size={14} className="org-spin" /> : <Save size={14} />}{saving ? "Saving…" : "Save Changes"}</button>

      </>}

    </div>}

  </div></main>;

}

function Info({ label, value, link = false, icon }: { label: string; value?: unknown; link?: boolean; icon?: React.ReactNode }) {

  const text = val(value) || "—";

  return <div className="org-info-row">{icon && <span className="org-info-icon">{icon}</span>}<span>{label}</span><strong>{link && text !== "—" ? <a href={text} target="_blank" rel="noopener noreferrer">{text} <ExternalLink size={11} /></a> : text}</strong></div>;

}
function OverviewDetail({
  label,
  value,
}: {
  label: string;
  value?: unknown;
}) {
  const displayValue = value == null || value === "" ? "—" : String(value);

  return (
    <div className="org-overview-detail-row">
      <span>{label}</span>
      <strong className="org-overview-detail-value" title={displayValue}>
        {displayValue}
      </strong>
    </div>
  );
}
function BankDetailsSection() {
  const [editing, setEditing] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const [bank, setBank] = React.useState({
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    accountType: "Current Account",
    branch: "",
  });

  const update = (key: keyof typeof bank, value: string) => {
    setBank((previous) => ({ ...previous, [key]: value }));
  };

  const fields: {
    key: keyof typeof bank;
    label: string;
    placeholder: string;
  }[] = [
    { key: "bankName", label: "Bank Name", placeholder: "Enter bank name" },
    {
      key: "accountHolderName",
      label: "Account Holder Name",
      placeholder: "Enter account holder name",
    },
    {
      key: "accountNumber",
      label: "Account Number",
      placeholder: "Enter account number",
    },
    {
      key: "ifscCode",
      label: "IFSC Code",
      placeholder: "Enter IFSC code",
    },
    { key: "branch", label: "Branch", placeholder: "Enter branch name" },
  ];

  return (
    <div className="org-shot-section">
      <div className="org-shot-heading">
        <h3>Bank Account Information</h3>
        {!editing && (
          <button
            type="button"
            className="org-service-button"
            onClick={() => setEditing(true)}
          >
            Edit Details
          </button>
        )}
      </div>

      <div className="org-bank-grid">
        {fields.map((field) => (
          <label className="org-bank-field" key={field.key}>
            <span>
              {field.label}
              {field.key !== "branch" && <b> *</b>}
            </span>

            <input
              type={field.key === "accountNumber" ? "password" : "text"}
              autoComplete="off"
              disabled={!editing}
              placeholder={field.placeholder}
              value={bank[field.key]}
              onChange={(event) =>
                update(
                  field.key,
                  field.key === "ifscCode"
                    ? event.target.value.toUpperCase()
                    : event.target.value
                )
              }
            />
          </label>
        ))}

        <label className="org-bank-field">
          <span>Account Type <b>*</b></span>
          <select
            disabled={!editing}
            value={bank.accountType}
            onChange={(event) => update("accountType", event.target.value)}
          >
            <option>Current Account</option>
            <option>Savings Account</option>
            <option>Cash Credit</option>
            <option>Overdraft</option>
          </select>
        </label>
      </div>

      <div className="org-shot-note">
        <ShieldCheck size={15} />
        Bank information must be securely stored and restricted to authorized users.
      </div>

      {saved && (
        <p className="org-bank-message">
          Form data is currently local only; backend persistence is not configured.
        </p>
      )}

      {editing && (
        <div className="org-shot-actions">
          <button
            type="button"
            className="org-service-button"
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="org-service-button org-service-primary"
            onClick={() => {
              setSaved(true);
              setEditing(false);
            }}
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}