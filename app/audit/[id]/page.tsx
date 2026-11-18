"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Copy,
  Download,
  Printer,
  ShieldAlert,
  Lock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  auditApi,
  AuditEventItem,
  actorDisplay,
  formatDateTime,
  severityBadgeClass,
  outcomeBadgeClass,
  exportAuditJson,
} from "@/lib/audit/api";
import "@/components/audit/audit.css";

export default function AuditEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");

  const [event, setEvent] = useState<AuditEventItem | null>(null);
  const [related, setRelated] = useState<{ sameCorrelation: AuditEventItem[]; sameActor: AuditEventItem[]; sameModule: AuditEventItem[] }>({
    sameCorrelation: [],
    sameActor: [],
    sameModule: [],
  });
  const [nav, setNav] = useState<{ prevId?: string | null; nextId?: string | null }>({});
  const [tab, setTab] = useState<"overview" | "raw" | "related">("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [escalating, setEscalating] = useState(false);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    auditApi
      .detail(id)
      .then((res) => {
        setEvent(res.event);
        setRelated(res.related || { sameCorrelation: [], sameActor: [], sameModule: [] });
        setNav(res.navigation || {});
      })
      .catch((e: any) => setError(e?.message || "Failed to load audit event"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleEscalateToAlert = async () => {
    if (!event) return;
    setEscalating(true);
    try {
      const alert = await auditApi.createAlert({
        eventId: event._id,
        userName: actorDisplay(event),
        ipAddress: event.ipAddress || "",
        alertType: `Investigate: ${event.action}`,
        reason: event.description || `Escalated from audit event ${event.eventCode || event._id}`,
        severity: event.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
        riskScore: event.outcome === "FAILURE" ? 85 : 65,
      });
      flash(`Created Security Investigation ${alert.alertCode}.`);
    } catch (e: any) {
      setError(e?.message || "Failed to create security alert");
    } finally {
      setEscalating(false);
    }
  };

  if (loading) {
    return <div className="aud-page"><div className="aud-card aud-empty">Loading immutable audit record...</div></div>;
  }

  if (!event) {
    return (
      <div className="aud-page">
        <div className="aud-alert aud-alert-err"><AlertTriangle size={14} /> <span>{error || "Audit record not found."}</span></div>
        <Link href="/audit" className="aud-btn" style={{ width: "fit-content" }}><ArrowLeft size={12} /> Back to Audit Explorer</Link>
      </div>
    );
  }

  return (
    <div className="aud-page">
      <div>
        <div className="aud-breadcrumb">
          <Link href="/audit">Audit Explorer</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>{event.eventCode || event._id}</span>
        </div>
        <div className="aud-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              <span className="aud-badge aud-badge-blue">{event.eventCode || event._id.slice(-8)}</span>
              <span className={outcomeBadgeClass(event.outcome)}>{event.outcome}</span>
              <span className={severityBadgeClass(event.severity)}>{event.severity || "INFO"}</span>
              {event.recordHash && (
                <span className="aud-badge aud-badge-green" title={`SHA-256: ${event.recordHash}`}>
                  <Lock size={9} /> Hash: {event.recordHash.slice(0, 12)}…
                </span>
              )}
            </div>
            <h1 className="aud-title" style={{ marginTop: 4 }}>{event.action} — {event.resourceType}</h1>
            <p className="aud-subtitle">
              {formatDateTime(event.createdAt)} · Actor: <strong>{actorDisplay(event)}</strong> · Source: <strong>{event.source || "PMS_WEB"}</strong>
            </p>
          </div>
          <div className="aud-actions">
            <Link href="/audit" className="aud-btn"><ArrowLeft size={12} /> Back</Link>
            {nav.prevId && (
              <button type="button" className="aud-btn" onClick={() => router.push(`/audit/${nav.prevId}`)}>
                <ArrowLeft size={11} /> Prev
              </button>
            )}
            {nav.nextId && (
              <button type="button" className="aud-btn" onClick={() => router.push(`/audit/${nav.nextId}`)}>
                Next <ArrowRight size={11} />
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <div className="aud-alert aud-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="aud-alert aud-alert-ok"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 290px", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <div className="aud-seg">
            <button type="button" className={`aud-seg-btn ${tab === "overview" ? "active" : ""}`} onClick={() => setTab("overview")}>
              Overview &amp; Value Diff
            </button>
            <button type="button" className={`aud-seg-btn ${tab === "raw" ? "active" : ""}`} onClick={() => setTab("raw")}>
              Raw Event JSON
            </button>
            <button type="button" className={`aud-seg-btn ${tab === "related" ? "active" : ""}`} onClick={() => setTab("related")}>
              Related Events ({related.sameCorrelation.length + related.sameActor.length})
            </button>
          </div>

          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* 11-Field Structured Record (AUD-Audit_Records Panel 2-3) */}
              <div className="aud-card">
                <h3 className="aud-card-title" style={{ marginBottom: 10 }}>Audit Record Fields</h3>
                <div className="aud-grid-2" style={{ gap: 9 }}>
                  <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>1. Who (Actor)</span><strong>{actorDisplay(event)}</strong></div>
                  <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>2. What (Action)</span><strong>{event.action}</strong></div>
                  <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>3. Entity &amp; ID</span><strong>{event.resourceType}{event.resourceId ? ` (${event.resourceId})` : ""}</strong></div>
                  <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>4. Module / Category</span><strong>{event.module || event.resourceType} · {event.category || "SYSTEM"}</strong></div>
                  <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>5. Server Timestamp</span><strong>{formatDateTime(event.createdAt)}</strong></div>
                  <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>6. Source IP Address</span><strong style={{ fontFamily: "ui-monospace, monospace" }}>{event.ipAddress || "—"}</strong></div>
                  <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>7. Correlation / Request ID</span><strong style={{ fontFamily: "ui-monospace, monospace" }}>{event.correlationId || event.requestId || "—"}</strong></div>
                  <div><span style={{ color: "#64748b", fontSize: 10, display: "block" }}>8. Origin Source</span><strong>{event.source || "PMS_WEB"}</strong></div>
                </div>
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Description</span>
                  <p style={{ margin: "3px 0 0" }}>{event.description || "—"}</p>
                </div>
                <div style={{ marginTop: 8 }}>
                  <span style={{ color: "#64748b", fontSize: 10, display: "block" }}>User Agent / Device</span>
                  <div style={{ fontSize: 10.5, color: "#475569", wordBreak: "break-all" }}>{event.userAgent || "—"}</div>
                </div>
              </div>

              {/* Previous vs New Value Diff (AUD-Audit_Records Panel 4) */}
              <div className="aud-card">
                <h3 className="aud-card-title" style={{ marginBottom: 10 }}>Previous Value vs New Value</h3>
                {!event.previousValue && !event.newValue ? (
                  <div className="aud-alert aud-alert-info">No before/after state diff recorded for this event type.</div>
                ) : (
                  <div className="aud-grid-2">
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", marginBottom: 4 }}>BEFORE (PREVIOUS VALUE)</div>
                      <pre style={{ margin: 0, fontSize: 10.5, whiteSpace: "pre-wrap" }}>
                        {JSON.stringify(event.previousValue ?? {}, null, 2)}
                      </pre>
                    </div>
                    <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 6, padding: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#047857", marginBottom: 4 }}>AFTER (NEW VALUE)</div>
                      <pre style={{ margin: 0, fontSize: 10.5, whiteSpace: "pre-wrap" }}>
                        {JSON.stringify(event.newValue ?? {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "raw" && (
            <div className="aud-card">
              <div className="aud-card-head">
                <h3 className="aud-card-title">Complete Immutable Event Payload (JSON)</h3>
                <button
                  type="button"
                  className="aud-btn aud-btn-sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(JSON.stringify(event, null, 2));
                    flash("Copied raw JSON to clipboard.");
                  }}
                >
                  <Copy size={11} /> Copy JSON
                </button>
              </div>
              <pre className="aud-code-box">{JSON.stringify(event, null, 2)}</pre>
            </div>
          )}

          {tab === "related" && (
            <div className="aud-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <h3 className="aud-card-title" style={{ marginBottom: 6 }}>Same Correlation / Request Flow ({related.sameCorrelation.length})</h3>
                {related.sameCorrelation.length === 0 ? (
                  <div style={{ color: "#64748b", fontSize: 11 }}>No sibling events share this correlation ID.</div>
                ) : (
                  <div className="aud-table-wrap">
                    <table className="aud-table">
                      <thead><tr><th>Time</th><th>Action</th><th>Resource</th><th>Outcome</th><th></th></tr></thead>
                      <tbody>
                        {related.sameCorrelation.map((r) => (
                          <tr key={r._id}>
                            <td>{formatDateTime(r.createdAt)}</td>
                            <td><span className="aud-badge aud-badge-blue">{r.action}</span></td>
                            <td>{r.resourceType}</td>
                            <td><span className={outcomeBadgeClass(r.outcome)}>{r.outcome}</span></td>
                            <td><Link href={`/audit/${r._id}`} className="aud-btn aud-btn-sm">View</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h3 className="aud-card-title" style={{ marginBottom: 6 }}>Recent Events by Same Actor ({related.sameActor.length})</h3>
                {related.sameActor.length === 0 ? (
                  <div style={{ color: "#64748b", fontSize: 11 }}>No other events recorded for this actor.</div>
                ) : (
                  <div className="aud-table-wrap">
                    <table className="aud-table">
                      <thead><tr><th>Time</th><th>Action</th><th>Module</th><th>Outcome</th><th></th></tr></thead>
                      <tbody>
                        {related.sameActor.map((r) => (
                          <tr key={r._id}>
                            <td>{formatDateTime(r.createdAt)}</td>
                            <td><span className="aud-badge aud-badge-blue">{r.action}</span></td>
                            <td>{r.module || r.resourceType}</td>
                            <td><span className={outcomeBadgeClass(r.outcome)}>{r.outcome}</span></td>
                            <td><Link href={`/audit/${r._id}`} className="aud-btn aud-btn-sm">View</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Sticky Panel: Audit Controls (AUD-002 Panel 8) */}
        <div className="aud-card" style={{ position: "sticky", top: 14, display: "flex", flexDirection: "column", gap: 9 }}>
          <h3 className="aud-card-title">Audit Controls</h3>
          <button
            type="button"
            className="aud-btn"
            style={{ width: "100%", justifyContent: "flex-start" }}
            onClick={() => {
              navigator.clipboard?.writeText(event.eventCode || event._id);
              flash("Copied Event ID.");
            }}
          >
            <Copy size={12} /> Copy Event ID
          </button>
          <button
            type="button"
            className="aud-btn"
            style={{ width: "100%", justifyContent: "flex-start" }}
            onClick={() => exportAuditJson([event], event.eventCode || "audit-event")}
          >
            <Download size={12} /> Export Event JSON
          </button>
          <button
            type="button"
            className="aud-btn"
            style={{ width: "100%", justifyContent: "flex-start" }}
            onClick={() => window.print()}
          >
            <Printer size={12} /> Print Evidence
          </button>
          <button
            type="button"
            className="aud-btn aud-btn-danger"
            style={{ width: "100%", justifyContent: "flex-start" }}
            onClick={handleEscalateToAlert}
            disabled={escalating}
          >
            <ShieldAlert size={12} /> {escalating ? "Creating..." : "Escalate to Investigation"}
          </button>

          <div style={{ marginTop: 6, padding: 9, background: "#f8fafd", borderRadius: 6, border: "1px solid #e3eaf4", fontSize: 10.5, color: "#475569" }}>
            <strong style={{ color: "#10204a", display: "block", marginBottom: 3 }}>WORM Immutability Guarantee</strong>
            Audit records are strictly append-only. No role—including Super Admin—can edit or delete this evidence.
          </div>
        </div>
      </div>
    </div>
  );
}
