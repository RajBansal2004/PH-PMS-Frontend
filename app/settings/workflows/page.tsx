"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  GitBranch,
  Plus,
  Edit3,
  Trash2,
  Play,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { settingsApi } from "@/lib/settings/api";
import "@/components/settings/settings.css";

export default function WorkflowSettingsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [editing, setEditing] = useState<any | null>(null);
  const [simulating, setSimulating] = useState<any | null>(null);
  const [simStepIdx, setSimStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await settingsApi.listWorkflows();
      setWorkflows(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load workflows");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditing({
      name: "",
      module: "Project Management",
      description: "",
      status: "ACTIVE",
      enableNotifications: true,
      enableAuditTrail: true,
      steps: [
        { stepOrder: 1, stepName: "Manager Approval", stepType: "APPROVAL", approverRole: "Project Manager", slaHours: 24, autoEscalate: false, mandatoryComments: false },
      ],
      rules: [],
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.name?.trim()) return;
    setSaving(true);
    try {
      if (editing._id) {
        await settingsApi.updateWorkflow(editing._id, editing);
        flash(`Updated workflow "${editing.name}".`);
      } else {
        await settingsApi.createWorkflow(editing);
        flash(`Created workflow "${editing.name}".`);
      }
      setEditing(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (wf: any) => {
    if (!window.confirm(`Delete workflow ${wf.workflowCode} (${wf.name})?`)) return;
    try {
      await settingsApi.deleteWorkflow(wf._id);
      flash(`Deleted ${wf.workflowCode}.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Delete failed");
    }
  };

  return (
    <div className="sys-page">
      <div>
        <div className="sys-breadcrumb">
          <Link href="/settings">System Administration</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Workflow Settings</span>
        </div>
        <div className="sys-header">
          <div>
            <h1 className="sys-title">Workflow Engine Settings</h1>
            <p className="sys-subtitle">
              Configure approval pipelines, SLA escalation timers, conditional rules, and simulate routing across PMS modules.
            </p>
          </div>
          <div className="sys-actions">
            <button type="button" className="sys-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" className="sys-btn sys-btn-primary" onClick={openCreate}>
              <Plus size={12} /> Create Workflow
            </button>
          </div>
        </div>
      </div>

      {/* Subnav */}
      <div className="sys-subnav">
        <Link href="/settings" className="sys-subnav-link">General Settings</Link>
        <Link href="/settings/workflows" className="sys-subnav-link active">Workflow Settings</Link>
        <Link href="/settings/master-data" className="sys-subnav-link">Master Data</Link>
        <Link href="/settings/health" className="sys-subnav-link">System Health</Link>
        <Link href="/settings/feature-flags" className="sys-subnav-link">Feature Flags</Link>
      </div>

      {error && <div className="sys-alert sys-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="sys-alert sys-alert-ok"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      {/* Simulator Panel (ADM-002 Panel 8) */}
      {simulating && (
        <div className="sys-card" style={{ background: "#f8fbff", borderColor: "#bfdbfe" }}>
          <div className="sys-card-head">
            <h3 className="sys-card-title">Interactive Workflow Simulation — {simulating.name}</h3>
            <button type="button" className="sys-btn sys-btn-sm" onClick={() => setSimulating(null)}>Close</button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
            {(simulating.steps || []).map((st: any, idx: number) => (
              <div key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    padding: "7px 11px",
                    borderRadius: 6,
                    border: `1.5px solid ${idx < simStepIdx ? "#079b62" : idx === simStepIdx ? "#0755e9" : "#dce5f2"}`,
                    background: idx < simStepIdx ? "#ecfdf5" : idx === simStepIdx ? "#eff6ff" : "#ffffff",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{idx + 1}. {st.stepName}</div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>{st.approverRole} · SLA {st.slaHours}h</div>
                </div>
                {idx < (simulating.steps || []).length - 1 && <span style={{ color: "#94a3b8", fontWeight: 700 }}>→</span>}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 7 }}>
            <button
              type="button"
              className="sys-btn sys-btn-primary sys-btn-sm"
              onClick={() => setSimStepIdx((i) => Math.min((simulating.steps || []).length, i + 1))}
              disabled={simStepIdx >= (simulating.steps || []).length}
            >
              Simulate Step Approval →
            </button>
            <button type="button" className="sys-btn sys-btn-sm" onClick={() => setSimStepIdx(0)}>Reset Simulation</button>
          </div>
        </div>
      )}

      {/* Editor */}
      {editing && (
        <form onSubmit={handleSave} className="sys-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="sys-card-head">
            <h3 className="sys-card-title">{editing._id ? `Edit ${editing.workflowCode}` : "Create Approval Workflow"}</h3>
            <button type="button" className="sys-btn sys-btn-sm" onClick={() => setEditing(null)}>Close</button>
          </div>
          <div className="sys-grid-3">
            <div className="sys-field">
              <label>Workflow Name *</label>
              <input className="sys-input" value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
            </div>
            <div className="sys-field">
              <label>Module *</label>
              <input className="sys-input" value={editing.module || ""} onChange={(e) => setEditing({ ...editing, module: e.target.value })} required />
            </div>
            <div className="sys-field">
              <label>Status</label>
              <select className="sys-select" value={editing.status || "ACTIVE"} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
          <div className="sys-field">
            <label>Description</label>
            <input className="sys-input" value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </div>

          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 9 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
              <strong style={{ fontSize: 11.5 }}>Approval Steps ({(editing.steps || []).length})</strong>
              <button
                type="button"
                className="sys-btn sys-btn-sm"
                onClick={() =>
                  setEditing({
                    ...editing,
                    steps: [
                      ...(editing.steps || []),
                      { stepOrder: (editing.steps || []).length + 1, stepName: "New Review Step", stepType: "APPROVAL", approverRole: "Director", slaHours: 24 },
                    ],
                  })
                }
              >
                <Plus size={11} /> Add Step
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(editing.steps || []).map((st: any, idx: number) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 90px auto", gap: 6, alignItems: "center" }}>
                  <input
                    className="sys-input"
                    value={st.stepName}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        steps: editing.steps.map((x: any, i: number) => (i === idx ? { ...x, stepName: e.target.value } : x)),
                      })
                    }
                    placeholder="Step Name"
                  />
                  <input
                    className="sys-input"
                    value={st.approverRole}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        steps: editing.steps.map((x: any, i: number) => (i === idx ? { ...x, approverRole: e.target.value } : x)),
                      })
                    }
                    placeholder="Approver Role"
                  />
                  <input
                    type="number"
                    className="sys-input"
                    value={st.slaHours}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        steps: editing.steps.map((x: any, i: number) => (i === idx ? { ...x, slaHours: Number(e.target.value) } : x)),
                      })
                    }
                    placeholder="SLA (h)"
                  />
                  <button
                    type="button"
                    className="sys-btn sys-btn-danger sys-btn-sm"
                    onClick={() => setEditing({ ...editing, steps: editing.steps.filter((_: any, i: number) => i !== idx) })}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 7 }}>
            <button type="button" className="sys-btn" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="sys-btn sys-btn-primary" disabled={saving}>Save Workflow</button>
          </div>
        </form>
      )}

      {/* Workflows Table */}
      <div className="sys-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="sys-table-wrap">
          <table className="sys-table">
            <thead><tr><th>Code</th><th>Workflow Name</th><th>Module</th><th>Steps</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="sys-empty">Loading workflows...</td></tr>
              ) : (
                workflows.map((wf) => (
                  <tr key={wf._id}>
                    <td style={{ fontWeight: 700, color: "#0755e9" }}>{wf.workflowCode}</td>
                    <td>
                      <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}><GitBranch size={12} color="#64748b" /> {wf.name}</div>
                      {wf.description && <div style={{ fontSize: 10, color: "#64748b" }}>{wf.description}</div>}
                    </td>
                    <td><span className="sys-badge sys-badge-purple">{wf.module}</span></td>
                    <td>{(wf.steps || []).map((s: any) => s.stepName).join(" → ") || "—"}</td>
                    <td><span className={wf.status === "ACTIVE" ? "sys-badge sys-badge-green" : "sys-badge sys-badge-amber"}>{wf.status}</span></td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <button type="button" className="sys-btn sys-btn-sm" onClick={() => { setSimulating(wf); setSimStepIdx(0); }}><Play size={11} /> Simulate</button>
                        <button type="button" className="sys-btn sys-btn-sm" onClick={() => setEditing(wf)}><Edit3 size={11} /> Edit</button>
                        <button type="button" className="sys-btn sys-btn-danger sys-btn-sm" onClick={() => handleDelete(wf)}><Trash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
