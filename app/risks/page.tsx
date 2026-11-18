"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Plus,
  RefreshCw,
  Download,
  Edit3,
  ArrowUpRight,
  Trash2,
  X,
} from "lucide-react";
import {
  riskIssueApi,
  formatDate,
  downloadCsv,
  type RiskItem,
  type ProjectRef,
} from "@/lib/phase2/api";
import "@/components/phase2/phase2.css";

const RISK_CATEGORIES = ["TECHNICAL", "SCHEDULE", "BUDGET", "RESOURCE", "SECURITY", "SCOPE", "VENDOR", "COMPLIANCE"];

function sevBadge(sev: string) {
  if (sev === "CRITICAL") return "p2-badge p2-badge-red";
  if (sev === "HIGH") return "p2-badge p2-badge-amber";
  if (sev === "MEDIUM") return "p2-badge p2-badge-blue";
  return "p2-badge p2-badge-green";
}

function matrixTone(score: number) {
  if (score >= 16) return "crit";
  if (score >= 10) return "high";
  if (score >= 5) return "med";
  return "low";
}

const EMPTY_FORM = {
  projectId: "",
  title: "",
  description: "",
  category: "TECHNICAL",
  probability: 3,
  impact: 3,
  responseStrategy: "MITIGATE",
  responsePlan: "",
  contingencyPlan: "",
  ownerName: "",
  targetReviewDate: "",
  status: "IDENTIFIED",
};

export default function RisksRegisterPage() {
  const [items, setItems] = useState<RiskItem[]>([]);
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [matrix, setMatrix] = useState<Record<string, number>>({});
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RiskItem | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await riskIssueApi.listRisks({
        search: search || undefined,
        severityLevel: sevFilter !== "ALL" ? sevFilter : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      });
      setItems(res.items || []);
      setProjects(res.projects || []);
      setMatrix(res.matrix || {});
      setSummary(res.summary || null);
    } catch (e: any) {
      setError(e?.message || "Failed to load Risk Register");
    } finally {
      setLoading(false);
    }
  }, [search, sevFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, projectId: projects[0]?._id || "" });
    setModalOpen(true);
  };

  const openEdit = (r: RiskItem) => {
    setEditing(r);
    setForm({
      projectId: typeof r.projectId === "object" && r.projectId ? r.projectId._id : (r.projectId as string) || "",
      title: r.title,
      description: r.description || "",
      category: r.category || "TECHNICAL",
      probability: r.probability || 3,
      impact: r.impact || 3,
      responseStrategy: r.responseStrategy || "MITIGATE",
      responsePlan: r.responsePlan || "",
      contingencyPlan: r.contingencyPlan || "",
      ownerName: r.ownerName || "",
      targetReviewDate: r.targetReviewDate ? String(r.targetReviewDate).slice(0, 10) : "",
      status: r.status || "IDENTIFIED",
    });
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await riskIssueApi.updateRisk(editing._id, form);
        setNotice(`Risk "${form.title}" updated.`);
      } else {
        await riskIssueApi.createRisk(form);
        setNotice(`Risk "${form.title}" logged.`);
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to save risk");
    } finally {
      setSaving(false);
    }
  };

  const escalate = async (r: RiskItem) => {
    if (!window.confirm(`Escalate risk ${r.riskCode || r.title} into an active Issue?`)) return;
    try {
      const res = await riskIssueApi.escalateRisk(r._id);
      setNotice(`Escalated to Issue ${res.issue?.issueCode || ""}.`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Escalation failed");
    }
  };

  const remove = async (r: RiskItem) => {
    if (!window.confirm(`Delete risk "${r.title}"?`)) return;
    try {
      await riskIssueApi.deleteRisk(r._id);
      setNotice("Risk deleted.");
      await load();
    } catch (err: any) {
      setError(err?.message || "Delete failed");
    }
  };

  const previewScore = Number(form.probability || 1) * Number(form.impact || 1);

  return (
    <div className="p2-page">
      <div className="p2-header">
        <div>
          <div className="p2-breadcrumb">Governance / Risk &amp; Issue Register (RSK-001)</div>
          <h1 className="p2-title">
            <ShieldAlert size={18} color="#dc2626" />
            Risk Register &amp; 5×5 Exposure Matrix
          </h1>
          <div className="p2-subtitle">
            Proactive project risk scoring (Probability × Impact), mitigation tracking &amp; 1-click issue escalation
          </div>
        </div>
        <div className="p2-actions">
          <div className="p2-tabs">
            <Link href="/risks" className="p2-tab active">Risk Register</Link>
            <Link href="/risks/issues" className="p2-tab">Issue Tracker</Link>
          </div>
          <button
            type="button"
            className="p2-btn"
            disabled={!items.length}
            onClick={() =>
              downloadCsv(
                "risk-register.csv",
                ["Code", "Project", "Title", "Category", "P", "I", "Score", "Severity", "Strategy", "Owner", "Status"],
                items.map((r) => [
                  r.riskCode,
                  r.projectName,
                  r.title,
                  r.category,
                  r.probability,
                  r.impact,
                  r.score,
                  r.severityLevel,
                  r.responseStrategy,
                  r.ownerName,
                  r.status,
                ])
              )
            }
          >
            <Download size={13} /> CSV
          </button>
          <button type="button" className="p2-btn" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button type="button" className="p2-btn p2-btn-primary" onClick={openCreate}>
            <Plus size={14} /> Log Risk
          </button>
        </div>
      </div>

      {error && <div className="p2-banner-err">{error}</div>}
      {notice && <div className="p2-banner-ok">{notice}</div>}

      <div className="p2-kpi-grid">
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Active Risks</div>
          <div className="p2-kpi-value">{summary?.active ?? 0}</div>
          <div className="p2-kpi-sub">{summary?.total ?? 0} total logged</div>
        </div>
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Critical (16–25)</div>
          <div className="p2-kpi-value" style={{ color: "#dc2626" }}>{summary?.critical ?? 0}</div>
        </div>
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">High (10–15)</div>
          <div className="p2-kpi-value" style={{ color: "#d97706" }}>{summary?.high ?? 0}</div>
        </div>
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">In Mitigation</div>
          <div className="p2-kpi-value" style={{ color: "#0755e9" }}>{summary?.mitigating ?? 0}</div>
        </div>
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Avg Risk Score</div>
          <div className="p2-kpi-value">{summary?.avgScore ?? 0} / 25</div>
        </div>
      </div>

      {/* 5x5 Risk Matrix Heatmap */}
      <div className="p2-card">
        <div className="p2-card-head">
          <span className="p2-card-title">5×5 Probability vs Impact Exposure Heatmap (Active Risks)</span>
          <span style={{ fontSize: 10.5, color: "#64748b" }}>Rows = Probability (5→1) · Columns = Impact (1→5)</span>
        </div>
        <div className="p2-matrix">
          <div />
          {[1, 2, 3, 4, 5].map((imp) => (
            <div key={imp} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 700, color: "#64748b" }}>
              Impact {imp}
            </div>
          ))}
          {[5, 4, 3, 2, 1].map((prob) => (
            <React.Fragment key={prob}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b" }}>P{prob}</div>
              {[1, 2, 3, 4, 5].map((imp) => {
                const count = matrix[`${prob}x${imp}`] || 0;
                const sc = prob * imp;
                return (
                  <div key={`${prob}-${imp}`} className={`p2-matrix-cell ${matrixTone(sc)}`} title={`P${prob} × I${imp} = ${sc} (${count} risks)`}>
                    <span>{count > 0 ? count : "·"}</span>
                    <span style={{ fontSize: 9, opacity: 0.7 }}>{sc}</span>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="p2-toolbar">
        <div className="p2-filters">
          <input className="p2-input" style={{ width: 220 }} placeholder="Search risk code, title, owner..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="p2-select" value={sevFilter} onChange={(e) => setSevFilter(e.target.value)}>
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select className="p2-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="IDENTIFIED">Identified</option>
            <option value="ASSESSING">Assessing</option>
            <option value="MITIGATING">Mitigating</option>
            <option value="MONITORING">Monitoring</option>
            <option value="REALIZED">Realized</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      <div className="p2-card">
        <div className="p2-table-wrap">
          <table className="p2-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Risk &amp; Project</th>
                <th>Category</th>
                <th>P × I = Score</th>
                <th>Strategy / Owner</th>
                <th>Review Date</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r._id}>
                  <td><strong>{r.riskCode || "RSK"}</strong></td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{r.title}</div>
                    <div style={{ fontSize: 10.5, color: "#64748b" }}>
                      {typeof r.projectId === "object" && r.projectId ? r.projectId.projectName : r.projectName || "Org-wide"}
                    </div>
                  </td>
                  <td><span className="p2-badge p2-badge-slate">{r.category}</span></td>
                  <td>
                    <span className={sevBadge(r.severityLevel)}>
                      P{r.probability} × I{r.impact} = {r.score} ({r.severityLevel})
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.responseStrategy}</div>
                    <div style={{ fontSize: 10.5, color: "#64748b" }}>{r.ownerName || "Unassigned"}</div>
                  </td>
                  <td>{formatDate(r.targetReviewDate)}</td>
                  <td><span className="p2-badge p2-badge-blue">{r.status}</span></td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 4 }}>
                      {r.status !== "REALIZED" && r.status !== "CLOSED" && (
                        <button type="button" className="p2-btn" style={{ height: 25, fontSize: 10.5 }} onClick={() => void escalate(r)} title="Escalate to Issue">
                          <ArrowUpRight size={12} color="#dc2626" /> Escalate
                        </button>
                      )}
                      <button type="button" className="p2-btn" style={{ height: 25, padding: "0 7px" }} onClick={() => openEdit(r)}>
                        <Edit3 size={12} />
                      </button>
                      <button type="button" className="p2-btn p2-btn-danger" style={{ height: 25, padding: "0 7px" }} onClick={() => void remove(r)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && !loading && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 24, color: "#64748b" }}>
                    No risks logged yet. Click &quot;Log Risk&quot; to register a project risk.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="p2-modal-backdrop" role="dialog" aria-modal="true">
          <form className="p2-modal" onSubmit={save}>
            <div className="p2-modal-head">
              <strong>{editing ? `Edit Risk — ${editing.riskCode}` : "Log Project Risk"}</strong>
              <button type="button" className="p2-btn" style={{ height: 26, padding: "0 6px" }} onClick={() => setModalOpen(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="p2-modal-body">
              <div className="p2-form-grid">
                <div className="p2-field full">
                  <label>Risk Title *</label>
                  <input className="p2-input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Third-party payment gateway certification delay" />
                </div>
                <div className="p2-field">
                  <label>Project</label>
                  <select className="p2-select" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                    <option value="">Organization-wide</option>
                    {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
                  </select>
                </div>
                <div className="p2-field">
                  <label>Category</label>
                  <select className="p2-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {RISK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="p2-field">
                  <label>Probability (1–5): {form.probability}</label>
                  <input type="range" min={1} max={5} value={form.probability} onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })} />
                </div>
                <div className="p2-field">
                  <label>Impact (1–5): {form.impact}</label>
                  <input type="range" min={1} max={5} value={form.impact} onChange={(e) => setForm({ ...form, impact: Number(e.target.value) })} />
                </div>
                <div className="p2-field full">
                  <div style={{ fontSize: 11.5, padding: "7px 10px", background: "#f8fafc", borderRadius: 7, border: "1px solid #e2e8f0" }}>
                    Calculated Exposure Score: <strong>{previewScore} / 25</strong>{" "}
                    <span className={sevBadge(previewScore >= 16 ? "CRITICAL" : previewScore >= 10 ? "HIGH" : previewScore >= 5 ? "MEDIUM" : "LOW")}>
                      {previewScore >= 16 ? "CRITICAL" : previewScore >= 10 ? "HIGH" : previewScore >= 5 ? "MEDIUM" : "LOW"}
                    </span>
                  </div>
                </div>
                <div className="p2-field">
                  <label>Response Strategy</label>
                  <select className="p2-select" value={form.responseStrategy} onChange={(e) => setForm({ ...form, responseStrategy: e.target.value })}>
                    <option value="MITIGATE">Mitigate</option>
                    <option value="AVOID">Avoid</option>
                    <option value="TRANSFER">Transfer</option>
                    <option value="ACCEPT">Accept</option>
                  </select>
                </div>
                <div className="p2-field">
                  <label>Status</label>
                  <select className="p2-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="IDENTIFIED">Identified</option>
                    <option value="ASSESSING">Assessing</option>
                    <option value="MITIGATING">Mitigating</option>
                    <option value="MONITORING">Monitoring</option>
                    <option value="REALIZED">Realized</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
                <div className="p2-field">
                  <label>Risk Owner</label>
                  <input className="p2-input" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
                </div>
                <div className="p2-field">
                  <label>Target Review Date</label>
                  <input className="p2-input" type="date" value={form.targetReviewDate} onChange={(e) => setForm({ ...form, targetReviewDate: e.target.value })} />
                </div>
                <div className="p2-field full">
                  <label>Mitigation / Response Plan</label>
                  <textarea className="p2-textarea" rows={2} value={form.responsePlan} onChange={(e) => setForm({ ...form, responsePlan: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="p2-modal-foot">
              <button type="button" className="p2-btn" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="p2-btn p2-btn-primary" disabled={saving}>
                {saving ? "Saving..." : editing ? "Save Risk" : "Log Risk"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
