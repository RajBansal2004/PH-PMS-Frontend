"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Rocket,
  Plus,
  RefreshCw,
  Download,
  CheckCircle2,
  RotateCcw,
  Play,
  Trash2,
  ClipboardCheck,
  X,
} from "lucide-react";
import {
  deploymentApi,
  formatDate,
  downloadCsv,
  type ReleaseDeploymentItem,
  type EnvironmentItem,
  type ProjectRef,
} from "@/lib/phase2/api";
import "@/components/phase2/phase2.css";

function depBadge(status: string) {
  if (status === "DEPLOYED") return "p2-badge p2-badge-green";
  if (status === "FAILED" || status === "ROLLED_BACK") return "p2-badge p2-badge-red";
  if (status === "IN_PROGRESS" || status === "APPROVED") return "p2-badge p2-badge-blue";
  return "p2-badge p2-badge-amber";
}

function healthBadge(h: string) {
  if (h === "HEALTHY") return "p2-badge p2-badge-green";
  if (h === "DEGRADED" || h === "MAINTENANCE") return "p2-badge p2-badge-amber";
  return "p2-badge p2-badge-red";
}

export default function DeploymentsPipelinePage() {
  const [items, setItems] = useState<ReleaseDeploymentItem[]>([]);
  const [envs, setEnvs] = useState<EnvironmentItem[]>([]);
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [envFilter, setEnvFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    projectId: "",
    version: "v1.0.0",
    title: "",
    environment: "STAGING",
    deploymentType: "MINOR",
    branchName: "main",
    buildNumber: "",
    plannedDate: new Date().toISOString().slice(0, 10),
    downtimeMinutes: 0,
    changeSummary: "",
    rollbackPlan: "",
  });

  const [checklistTarget, setChecklistTarget] = useState<ReleaseDeploymentItem | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await deploymentApi.list({
        search: search || undefined,
        environment: envFilter !== "ALL" ? envFilter : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      });
      setItems(res.items || []);
      setEnvs(res.environments || []);
      setProjects(res.projects || []);
      setSummary(res.summary || null);
    } catch (e: any) {
      setError(e?.message || "Failed to load deployments");
    } finally {
      setLoading(false);
    }
  }, [search, envFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.projectId || !form.version.trim() || !form.title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await deploymentApi.create(form);
      setNotice(`Release ${form.version} planned.`);
      setCreateOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to create release");
    } finally {
      setSaving(false);
    }
  };

  const runTransition = async (dep: ReleaseDeploymentItem, action: string) => {
    try {
      await deploymentApi.transition(dep._id, action);
      setNotice(`Release ${dep.releaseCode} transitioned (${action}).`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Transition failed");
    }
  };

  const toggleChecklistItem = async (dep: ReleaseDeploymentItem, idx: number) => {
    const nextChecklist = dep.checklist.map((c, i) =>
      i === idx ? { ...c, completed: !c.completed } : c
    );
    try {
      const updated = await deploymentApi.update(dep._id, { checklist: nextChecklist });
      setChecklistTarget(updated);
      await load();
    } catch (err: any) {
      setError(err?.message || "Checklist update failed");
    }
  };

  const remove = async (dep: ReleaseDeploymentItem) => {
    if (!window.confirm(`Delete release ${dep.releaseCode}?`)) return;
    try {
      await deploymentApi.remove(dep._id);
      setNotice("Release deleted.");
      await load();
    } catch (err: any) {
      setError(err?.message || "Delete failed");
    }
  };

  return (
    <div className="p2-page">
      <div className="p2-header">
        <div>
          <div className="p2-breadcrumb">Delivery Operations / Deployments &amp; Releases (DEP-001)</div>
          <h1 className="p2-title">
            <Rocket size={18} color="#0755e9" />
            Release &amp; Deployment Pipeline
          </h1>
          <div className="p2-subtitle">
            Track multi-environment releases (DEV → QA → UAT → STAGING → PRODUCTION), checklists, sign-offs &amp; rollbacks
          </div>
        </div>
        <div className="p2-actions">
          <div className="p2-tabs">
            <Link href="/deployments" className="p2-tab active">Release Pipeline</Link>
            <Link href="/deployments/environments" className="p2-tab">Environments</Link>
          </div>
          <button
            type="button"
            className="p2-btn"
            disabled={!items.length}
            onClick={() =>
              downloadCsv(
                "releases-deployments.csv",
                ["Code", "Version", "Title", "Project", "Env", "Type", "Status", "Planned Date", "Manager"],
                items.map((d) => [
                  d.releaseCode,
                  d.version,
                  d.title,
                  d.projectName,
                  d.environment,
                  d.deploymentType,
                  d.status,
                  d.plannedDate,
                  d.releaseManagerName,
                ])
              )
            }
          >
            <Download size={13} /> CSV
          </button>
          <button type="button" className="p2-btn" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            type="button"
            className="p2-btn p2-btn-primary"
            onClick={() => {
              setForm((f) => ({ ...f, projectId: f.projectId || projects[0]?._id || "" }));
              setCreateOpen(true);
            }}
          >
            <Plus size={14} /> Plan Release
          </button>
        </div>
      </div>

      {error && <div className="p2-banner-err">{error}</div>}
      {notice && <div className="p2-banner-ok">{notice}</div>}

      {/* KPIs */}
      <div className="p2-kpi-grid">
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Total Releases</div>
          <div className="p2-kpi-value">{summary?.totalReleases ?? 0}</div>
        </div>
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Production Deploys</div>
          <div className="p2-kpi-value" style={{ color: "#079b62" }}>{summary?.productionDeploys ?? 0}</div>
        </div>
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Pending Approval</div>
          <div className="p2-kpi-value" style={{ color: "#d97706" }}>{summary?.pendingApproval ?? 0}</div>
        </div>
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Deploy Success Rate</div>
          <div className="p2-kpi-value">{summary?.successRatePct ?? 100}%</div>
        </div>
        <div className="p2-kpi-card">
          <div className="p2-kpi-label">Rollbacks</div>
          <div className="p2-kpi-value" style={{ color: (summary?.rollbacks || 0) > 0 ? "#dc2626" : "#0f172a" }}>
            {summary?.rollbacks ?? 0}
          </div>
        </div>
      </div>

      {/* Live 5-Environment Status Cards */}
      <div className="p2-grid-5">
        {envs.map((env) => (
          <div key={env._id} className="p2-env-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: 12 }}>{env.envKey}</strong>
              <span className={healthBadge(env.health)}>{env.health}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0755e9" }}>{env.currentVersion}</div>
            <div style={{ fontSize: 10.5, color: "#64748b" }}>
              Uptime {env.uptimePct}% · {env.lastReleaseCode || "Baseline"}
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>
              {env.lastDeployedAt ? `Deployed ${formatDate(env.lastDeployedAt)}` : "Ready for release"}
            </div>
          </div>
        ))}
      </div>

      <div className="p2-toolbar">
        <div className="p2-filters">
          <input className="p2-input" style={{ width: 220 }} placeholder="Search release code, version, title..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="p2-select" value={envFilter} onChange={(e) => setEnvFilter(e.target.value)}>
            <option value="ALL">All Environments</option>
            {["DEV", "QA", "UAT", "STAGING", "PRODUCTION"].map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <select className="p2-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="PLANNED">Planned</option>
            <option value="APPROVED">Approved</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DEPLOYED">Deployed</option>
            <option value="ROLLED_BACK">Rolled Back</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      <div className="p2-card">
        <div className="p2-table-wrap">
          <table className="p2-table">
            <thead>
              <tr>
                <th>Release / Version</th>
                <th>Project &amp; Branch</th>
                <th>Env / Type</th>
                <th>Checklist</th>
                <th>Planned / Deployed</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((dep) => {
                const doneChecks = (dep.checklist || []).filter((c) => c.completed).length;
                const totalChecks = (dep.checklist || []).length;
                return (
                  <tr key={dep._id}>
                    <td>
                      <strong>{dep.releaseCode}</strong>{" "}
                      <span className="p2-badge p2-badge-purple">{dep.version}</span>
                      <div style={{ fontSize: 11, marginTop: 2 }}>{dep.title}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {typeof dep.projectId === "object" && dep.projectId ? dep.projectId.projectName : dep.projectName}
                      </div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>Branch: {dep.branchName || "main"}</div>
                    </td>
                    <td>
                      <span className={`p2-badge ${dep.environment === "PRODUCTION" ? "p2-badge-red" : "p2-badge-blue"}`}>
                        {dep.environment}
                      </span>
                      <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{dep.deploymentType}</div>
                    </td>
                    <td>
                      <button type="button" className="p2-btn" style={{ height: 24, fontSize: 10.5 }} onClick={() => setChecklistTarget(dep)}>
                        <ClipboardCheck size={12} /> {doneChecks}/{totalChecks}
                      </button>
                    </td>
                    <td>
                      <div>{formatDate(dep.deployedAt || dep.plannedDate)}</div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>{dep.releaseManagerName}</div>
                    </td>
                    <td><span className={depBadge(dep.status)}>{dep.status.replace(/_/g, " ")}</span></td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        {["PLANNED", "READY_FOR_QA"].includes(dep.status) && (
                          <button type="button" className="p2-btn" style={{ height: 25, fontSize: 10.5 }} onClick={() => void runTransition(dep, "APPROVE")}>
                            Approve
                          </button>
                        )}
                        {dep.status === "APPROVED" && (
                          <button type="button" className="p2-btn p2-btn-primary" style={{ height: 25, fontSize: 10.5 }} onClick={() => void runTransition(dep, "START")}>
                            <Play size={11} /> Start
                          </button>
                        )}
                        {["APPROVED", "IN_PROGRESS"].includes(dep.status) && (
                          <button type="button" className="p2-btn p2-btn-green" style={{ height: 25, fontSize: 10.5 }} onClick={() => void runTransition(dep, "COMPLETE")}>
                            <CheckCircle2 size={11} /> Deployed
                          </button>
                        )}
                        {dep.status === "DEPLOYED" && (
                          <button type="button" className="p2-btn p2-btn-danger" style={{ height: 25, fontSize: 10.5 }} onClick={() => void runTransition(dep, "ROLLBACK")}>
                            <RotateCcw size={11} /> Rollback
                          </button>
                        )}
                        <button type="button" className="p2-btn p2-btn-danger" style={{ height: 25, padding: "0 7px" }} onClick={() => void remove(dep)}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!items.length && !loading && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "#64748b" }}>
                    No releases planned yet. Click &quot;Plan Release&quot; to schedule your first deployment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Release Modal */}
      {createOpen && (
        <div className="p2-modal-backdrop" role="dialog" aria-modal="true">
          <form className="p2-modal" onSubmit={submitRelease}>
            <div className="p2-modal-head">
              <strong>Plan New Release / Deployment</strong>
              <button type="button" className="p2-btn" style={{ height: 26, padding: "0 6px" }} onClick={() => setCreateOpen(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="p2-modal-body">
              <div className="p2-form-grid">
                <div className="p2-field">
                  <label>Project *</label>
                  <select className="p2-select" required value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                    <option value="">Select Project</option>
                    {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
                  </select>
                </div>
                <div className="p2-field">
                  <label>Release Version *</label>
                  <input className="p2-input" required placeholder="e.g. v2.4.0" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
                </div>
                <div className="p2-field full">
                  <label>Release Title *</label>
                  <input className="p2-input" required placeholder="e.g. Q4 Billing Engine & Audit Security Release" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="p2-field">
                  <label>Target Environment</label>
                  <select className="p2-select" value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })}>
                    {["DEV", "QA", "UAT", "STAGING", "PRODUCTION"].map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div className="p2-field">
                  <label>Deployment Type</label>
                  <select className="p2-select" value={form.deploymentType} onChange={(e) => setForm({ ...form, deploymentType: e.target.value })}>
                    <option value="MAJOR">Major Release</option>
                    <option value="MINOR">Minor Release</option>
                    <option value="PATCH">Patch</option>
                    <option value="HOTFIX">Emergency Hotfix</option>
                  </select>
                </div>
                <div className="p2-field">
                  <label>Git Branch</label>
                  <input className="p2-input" value={form.branchName} onChange={(e) => setForm({ ...form, branchName: e.target.value })} />
                </div>
                <div className="p2-field">
                  <label>Planned Release Date</label>
                  <input className="p2-input" type="date" value={form.plannedDate} onChange={(e) => setForm({ ...form, plannedDate: e.target.value })} />
                </div>
                <div className="p2-field full">
                  <label>Change Summary</label>
                  <textarea className="p2-textarea" rows={2} value={form.changeSummary} onChange={(e) => setForm({ ...form, changeSummary: e.target.value })} />
                </div>
                <div className="p2-field full">
                  <label>Rollback Plan</label>
                  <textarea className="p2-textarea" rows={2} value={form.rollbackPlan} onChange={(e) => setForm({ ...form, rollbackPlan: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="p2-modal-foot">
              <button type="button" className="p2-btn" onClick={() => setCreateOpen(false)}>Cancel</button>
              <button type="submit" className="p2-btn p2-btn-primary" disabled={saving}>
                {saving ? "Planning..." : "Create Release"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Interactive Pre-Flight Release Checklist Modal */}
      {checklistTarget && (
        <div className="p2-modal-backdrop" role="dialog" aria-modal="true">
          <div className="p2-modal" style={{ maxWidth: 480 }}>
            <div className="p2-modal-head">
              <strong>Release Checklist — {checklistTarget.releaseCode} ({checklistTarget.version})</strong>
              <button type="button" className="p2-btn" style={{ height: 26, padding: "0 6px" }} onClick={() => setChecklistTarget(null)}>
                <X size={14} />
              </button>
            </div>
            <div className="p2-modal-body">
              {(checklistTarget.checklist || []).map((c, idx) => (
                <label
                  key={c._id || idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "8px 10px",
                    borderRadius: 7,
                    border: "1px solid #e2e8f0",
                    background: c.completed ? "#ecfdf5" : "#ffffff",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(c.completed)}
                    onChange={() => void toggleChecklistItem(checklistTarget, idx)}
                  />
                  <span style={{ textDecoration: c.completed ? "line-through" : "none" }}>{c.item}</span>
                </label>
              ))}
            </div>
            <div className="p2-modal-foot">
              <button type="button" className="p2-btn p2-btn-primary" onClick={() => setChecklistTarget(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
