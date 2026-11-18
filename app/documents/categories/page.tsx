"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Upload,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  HardDrive,
  FolderOpen,
  AlertTriangle,
} from "lucide-react";
import {
  documentApi,
  PMS_DOCUMENT_CATEGORIES,
  formatBytes,
} from "@/lib/documents/api";
import "@/components/documents/documents.css";

export default function DocumentCategoriesPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await documentApi.summary({});
      setSummary(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load category statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const byCategory: Record<string, number> = summary?.byCategory || {};

  return (
    <div className="doc-page">
      <div>
        <div className="doc-breadcrumb">
          <Link href="/documents">Documents</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Categories &amp; Governance</span>
        </div>
        <div className="doc-header">
          <div>
            <h1 className="doc-title">Document Categories &amp; Governance</h1>
            <p className="doc-subtitle">
              Standardized PMS document taxonomy, retention schedules, approval workflows, and storage adapters.
            </p>
          </div>
          <div className="doc-actions">
            <button type="button" className="doc-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <Link href="/documents/upload" className="doc-btn doc-btn-primary">
              <Upload size={13} /> Upload Document
            </Link>
          </div>
        </div>
      </div>

      {/* Subnav */}
      <div className="doc-subnav">
        <Link href="/documents" className="doc-subnav-link">Document Repository</Link>
        <Link href="/documents/upload" className="doc-subnav-link">Upload Document</Link>
        <Link href="/documents/categories" className="doc-subnav-link active">Categories &amp; Governance</Link>
      </div>

      {error && <div className="doc-alert doc-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* 12 PMS Categories Grid (DOC-Catg-WF-GDI Panel 1) */}
      <div className="doc-grid-4">
        {PMS_DOCUMENT_CATEGORIES.map((cat) => {
          const count = byCategory[cat.code] || 0;
          return (
            <div key={cat.code} className="doc-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: cat.bg,
                    color: cat.accent,
                    fontWeight: 800,
                    fontSize: 11,
                  }}
                >
                  {cat.code}
                </span>
                <span className="doc-badge doc-badge-slate">{count} doc{count === 1 ? "" : "s"}</span>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12.5 }}>{cat.label}</div>
                <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 2 }}>{cat.shortDesc}</div>
              </div>
              <div style={{ fontSize: 10, color: "#475569", background: "#f8fafd", borderRadius: 5, padding: "6px 8px", border: "1px solid #e3eaf4" }}>
                <div><strong>Approval:</strong> {cat.approvalPolicy}</div>
                <div><strong>Retention:</strong> {cat.retention}</div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
                <Link href={`/documents?category=${cat.code}`} className="doc-btn doc-btn-sm" style={{ flex: 1 }}>
                  <FolderOpen size={11} /> Browse
                </Link>
                <Link href={`/documents/upload?category=${cat.code}`} className="doc-btn doc-btn-primary doc-btn-sm" style={{ flex: 1 }}>
                  <Upload size={11} /> Upload
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Governance Lifecycle & Storage Architecture Card (DOC-Catg-WF-GDI Panels 7 & 11) */}
      <div className="doc-grid-2">
        <div className="doc-card">
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <ShieldCheck size={15} color="#0755e9" />
            <h3 className="doc-card-title">Standard Document Lifecycle</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              ["1. Draft & Security Scan", "File uploaded or linked, validated for MIME & size, version v1.0 created."],
              ["2. Technical Review", "Tech Lead verifies architecture, completeness, and traceability links."],
              ["3. Project Review", "Project Manager verifies scope alignment and stakeholder readiness."],
              ["4. Client Approval & Published", "Approved baseline published with immutable version history & access control."],
            ].map(([title, desc]) => (
              <div key={title} style={{ padding: "7px 10px", background: "#f8fafd", borderRadius: 6, border: "1px solid #e3eaf4" }}>
                <div style={{ fontWeight: 700 }}>{title}</div>
                <div style={{ fontSize: 10.5, color: "#64748b" }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="doc-card">
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <HardDrive size={15} color="#0755e9" />
            <h3 className="doc-card-title">Storage Adapter Overview</h3>
          </div>
          <p style={{ margin: "0 0 10px", color: "#64748b" }}>
            PMS remains the master record for metadata, versions, permissions, and approvals across all storage providers.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 10px", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 6 }}>
              <div><strong>Local Repository Storage</strong><div style={{ fontSize: 10, color: "#065f46" }}>Direct file upload &amp; inline preview streaming</div></div>
              <span className="doc-badge doc-badge-green">Active ({formatBytes(summary?.totalSizeBytes || 0)})</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 10px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6 }}>
              <div><strong>Google Drive / OneDrive / Dropbox URLs</strong><div style={{ fontSize: 10, color: "#1e40af" }}>Cloud link attachment with full PMS governance</div></div>
              <span className="doc-badge doc-badge-blue">Supported</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 10px", background: "#f8fafd", border: "1px solid #e3eaf4", borderRadius: 6 }}>
              <div><strong>Total Repository Assets</strong><div style={{ fontSize: 10, color: "#64748b" }}>{summary?.totalFolders || 0} folders · {summary?.totalDocuments || 0} documents</div></div>
              <span className="doc-badge doc-badge-slate"><Layers size={10} /> Live</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
