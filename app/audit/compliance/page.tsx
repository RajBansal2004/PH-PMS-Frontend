"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Download,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { auditApi, exportAuditCsv, exportAuditJson } from "@/lib/audit/api";
import "@/components/audit/audit.css";

const ACCESS_MATRIX = [
  { role: "Employee", view: "Limited (Own)", exportPerm: "No", security: "No", modify: "Never" },
  { role: "Team Lead / PM", view: "Project Scope", exportPerm: "Limited", security: "Limited", modify: "Never" },
  { role: "Department Head", view: "Dept Scope", exportPerm: "Permission", security: "Limited", modify: "Never" },
  { role: "Auditor / Compliance", view: "Broad", exportPerm: "Yes", security: "Yes", modify: "Never" },
  { role: "Security Admin", view: "Security Scope", exportPerm: "Yes", security: "Yes", modify: "Never" },
  { role: "Super Admin", view: "Broad", exportPerm: "Permission", security: "Yes", modify: "Never" },
];

export default function AuditCompliancePage() {
  const [retentionYears, setRetentionYears] = useState(5);
  const [archiveInsteadOfDelete, setArchiveInsteadOfDelete] = useState(true);
  const [logReadAccess, setLogReadAccess] = useState(true);
  const [logExports, setLogExports] = useState(true);
  const [failedLoginThreshold, setFailedLoginThreshold] = useState(5);
  const [totalRecords, setTotalRecords] = useState(0);
  const [updatedBy, setUpdatedBy] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 4000);
  };

  const loadPolicy = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await auditApi.getPolicy();
      const p = res.policy || {};
      setRetentionYears(p.retentionYears ?? 5);
      setArchiveInsteadOfDelete(p.archiveInsteadOfDelete !== false);
      setLogReadAccess(p.logReadAccess !== false);
      setLogExports(p.logExports !== false);
      setFailedLoginThreshold(p.failedLoginThreshold ?? 5);
      setUpdatedBy(p.updatedByName || "System");
      setTotalRecords(res.totalImmutableRecords ?? 0);
    } catch (e: any) {
      setError(e?.message || "Failed to load compliance policy");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicy();
  }, []);

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await auditApi.updatePolicy({
        retentionYears,
        archiveInsteadOfDelete,
        logReadAccess,
        logExports,
        failedLoginThreshold,
      });
      setUpdatedBy(updated.updatedByName || "Admin");
      flash("Retention & compliance policy saved and recorded in immutable audit log.");
    } catch (err: any) {
      setError(err?.message || "Failed to update policy");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPackage = async (format: "CSV" | "JSON") => {
    try {
      const { items } = await auditApi.list({ limit: 100, page: 1 });
      if (format === "CSV") exportAuditCsv(items, "regulatory-compliance-audit");
      else exportAuditJson(items, "regulatory-compliance-audit");
      flash(`Downloaded ${format} compliance package (${items.length} records) and audited export.`);
    } catch (err: any) {
      setError(err?.message || "Export failed");
    }
  };

  return (
    <div className="aud-page">
      <div>
        <div className="aud-breadcrumb">
          <Link href="/audit">Audit &amp; Compliance</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Compliance &amp; Retention</span>
        </div>
        <div className="aud-header">
          <div>
            <h1 className="aud-title">Compliance, Retention &amp; Governance</h1>
            <p className="aud-subtitle">
              Configure regulatory retention periods, WORM immutability safeguards, and download compliance audit packages.
            </p>
          </div>
          <button type="button" className="aud-btn" onClick={loadPolicy} disabled={loading}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Subnav */}
      <div className="aud-subnav">
        <Link href="/audit" className="aud-subnav-link">Audit Explorer</Link>
        <Link href="/audit/security" className="aud-subnav-link">Security Activity &amp; Alerts</Link>
        <Link href="/audit/compliance" className="aud-subnav-link active">Compliance &amp; Retention</Link>
      </div>

      {error && <div className="aud-alert aud-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="aud-alert aud-alert-ok"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      <div className="aud-grid-2">
        {/* Retention Policy Form (AUD-001 Panel 9) */}
        <form onSubmit={handleSavePolicy} className="aud-card" style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 className="aud-card-title">Audit Log Retention Policy</h3>
            <span className="aud-badge aud-badge-slate">Updated by: {updatedBy}</span>
          </div>

          <div className="aud-grid-2">
            <div className="aud-field">
              <label>Retention Period (Years)</label>
              <select className="aud-select" value={retentionYears} onChange={(e) => setRetentionYears(Number(e.target.value))}>
                <option value={1}>1 Year</option>
                <option value={3}>3 Years</option>
                <option value={5}>5 Years (Recommended)</option>
                <option value={7}>7 Years (Statutory)</option>
                <option value={10}>10 Years (Enterprise)</option>
              </select>
            </div>
            <div className="aud-field">
              <label>Failed Login Alert Threshold</label>
              <input type="number" min={2} max={50} className="aud-input" value={failedLoginThreshold} onChange={(e) => setFailedLoginThreshold(Number(e.target.value))} />
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
            <input type="checkbox" checked={archiveInsteadOfDelete} onChange={(e) => setArchiveInsteadOfDelete(e.target.checked)} />
            <span>Archive logs older than retention period instead of deleting</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
            <input type="checkbox" checked={logReadAccess} onChange={(e) => setLogReadAccess(e.target.checked)} />
            <span>Log sensitive document &amp; audit center read access</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
            <input type="checkbox" checked={logExports} onChange={(e) => setLogExports(e.target.checked)} />
            <span>Audit every CSV / JSON / PDF report export event</span>
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="aud-btn aud-btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Retention Policy"}
            </button>
          </div>
        </form>

        {/* Compliance Reports & Immutability Verification */}
        <div className="aud-card" style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Lock size={15} color="#047857" />
            <h3 className="aud-card-title">Immutability &amp; Regulatory Export</h3>
          </div>
          <div className="aud-alert aud-alert-ok">
            <ShieldCheck size={15} />
            <span>
              <strong>{totalRecords} Immutable Audit Records</strong> protected by Mongoose WORM mutation hooks &amp; SHA-256 tamper-evident hashes.
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <button type="button" className="aud-btn aud-btn-primary" onClick={() => handleExportPackage("CSV")}>
              <Download size={12} /> Download Regulatory Audit Package (CSV)
            </button>
            <button type="button" className="aud-btn" onClick={() => handleExportPackage("JSON")}>
              <Download size={12} /> Download Raw Tamper-Evident Evidence (JSON)
            </button>
          </div>
          <div style={{ fontSize: 10.5, color: "#64748b", background: "#f8fafd", padding: 9, borderRadius: 6, border: "1px solid #e3eaf4" }}>
            Every compliance export automatically generates an append-only <strong>AUDIT_LOG_EXPORTED</strong> record.
          </div>
        </div>
      </div>

      {/* Role-Based Audit Access Control Matrix (AUD-Audit_Records Panel 10) */}
      <div className="aud-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4", fontWeight: 700 }}>
          Audit Access Control &amp; Separation of Duties Matrix
        </div>
        <div className="aud-table-wrap">
          <table className="aud-table">
            <thead>
              <tr><th>Role</th><th>View Scope</th><th>Export</th><th>Security Events</th><th>Modify / Delete Evidence</th></tr>
            </thead>
            <tbody>
              {ACCESS_MATRIX.map((r) => (
                <tr key={r.role}>
                  <td style={{ fontWeight: 700 }}>{r.role}</td>
                  <td>{r.view}</td>
                  <td><span className="aud-badge aud-badge-blue">{r.exportPerm}</span></td>
                  <td><span className="aud-badge aud-badge-slate">{r.security}</span></td>
                  <td><span className="aud-badge aud-badge-red">{r.modify}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
