"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Edit3,
  Trash2,
  Play,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  approvalsApi,
  APPROVAL_ENTITY_TYPES,
  APPROVAL_ROLES,
  approvalBadgeClass,
} from "@/lib/approvals/api";
import "@/components/approvals/approvals.css";

export default function ApprovalRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [editing, setEditing] = useState<any | null>(null);
  const [testAmount, setTestAmount] = useState("150000");
  const [testType, setTestType] = useState("CHANGE_REQUEST");
  const [testMatches, setTestMatches] = useState<any[] | null>(null);
  const [saving, setSaving] = useState(false);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3500);
  };

  const loadRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await approvalsApi.listRules();
      setRules(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load approval rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.name?.trim()) return;
    setSaving(true);
    try {
      if (editing._id) {
        await approvalsApi.updateRule(editing._id, editing);
        flash(`Updated rule "${editing.name}".`);
      } else {
        await approvalsApi.createRule(editing);
        flash(`Created rule "${editing.name}".`);
      }
      setEditing(null);
      await loadRules();
    } catch (err: any) {
      setError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: any) => {
    if (!window.confirm(`Delete rule ${r.ruleCode} (${r.name})?`)) return;
    try {
      await approvalsApi.deleteRule(r._id);
      flash(`Deleted ${r.ruleCode}.`);
      await loadRules();
    } catch (err: any) {
      setError(err?.message || "Delete failed");
    }
  };

  const runRuleTest = () => {
    const val = Number(testAmount) || 0;
    const matched = rules.filter((r) => {
      if (r.status !== "ACTIVE" || r.entityType !== testType) return false;
      const target = Number(r.conditionValue) || 0;
      if (r.conditionOperator === "ALWAYS") return true;
      if (r.conditionOperator === "GT") return val > target;
      if (r.conditionOperator === "GTE") return val >= target;
      if (r.conditionOperator === "LT") return val < target;
      if (r.conditionOperator === "EQ") return val === target;
      return false;
    });
    setTestMatches(matched);
  };

  return (
    <div className="apr-page">
      <div>
        <div className="apr-breadcrumb">
          <Link href="/approvals">Approval Engine</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Approval Rules</span>
        </div>
        <div className="apr-header">
          <div>
            <h1 className="apr-title">Approval Rule Configuration</h1>
            <p className="apr-subtitle">
              Define conditional routing rules, approval levels, delegation toggles, and test rule matching live.
            </p>
          </div>
          <div className="apr-actions">
            <button type="button" className="apr-btn" onClick={loadRules} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              type="button"
              className="apr-btn apr-btn-primary"
              onClick={() =>
                setEditing({
                  name: "",
                  entityType: "BRD",
                  description: "",
                  conditionField: "commercialImpact",
                  conditionOperator: "GT",
                  conditionValue: "50000",
                  levels: [{ level: 1, role: "PROJECT_MANAGER" }],
                  allowDelegation: true,
                  requireComments: false,
                  autoEscalateDays: 2,
                  status: "ACTIVE",
                })
              }
            >
              <Plus size={12} /> Create Rule
            </button>
          </div>
        </div>
      </div>

      {/* Subnav */}
      <div className="apr-subnav">
        <Link href="/approvals" className="apr-subnav-link">My Approvals</Link>
        <Link href="/approvals/history" className="apr-subnav-link">Approval History</Link>
        <Link href="/approvals/rules" className="apr-subnav-link active">Approval Rules</Link>
        <Link href="/approvals/delegations" className="apr-subnav-link">Delegation &amp; Escalation</Link>
      </div>

      {error && <div className="apr-alert apr-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="apr-alert apr-alert-ok"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      {/* Create/Edit Rule */}
      {editing && (
        <form onSubmit={handleSave} className="apr-card" style={{ background: "#f8fbff", display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="apr-card-head">
            <h3 className="apr-card-title">{editing._id ? `Edit ${editing.ruleCode}` : "Create Approval Rule"}</h3>
            <button type="button" className="apr-btn apr-btn-sm" onClick={() => setEditing(null)}>Close</button>
          </div>
          <div className="apr-grid-3">
            <div className="apr-field">
              <label>Rule Name *</label>
              <input className="apr-input" value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
            </div>
            <div className="apr-field">
              <label>Request Type</label>
              <select className="apr-select" value={editing.entityType} onChange={(e) => setEditing({ ...editing, entityType: e.target.value })}>
                {APPROVAL_ENTITY_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div className="apr-field">
              <label>Status</label>
              <select className="apr-select" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
          <div className="apr-grid-3">
            <div className="apr-field">
              <label>Condition Operator</label>
              <select className="apr-select" value={editing.conditionOperator} onChange={(e) => setEditing({ ...editing, conditionOperator: e.target.value })}>
                <option value="ALWAYS">Always Trigger</option>
                <option value="GT">Commercial Impact &gt;</option>
                <option value="GTE">Commercial Impact &gt;=</option>
                <option value="LT">Commercial Impact &lt;</option>
              </select>
            </div>
            <div className="apr-field">
              <label>Threshold Value (₹)</label>
              <input type="number" className="apr-input" value={editing.conditionValue} onChange={(e) => setEditing({ ...editing, conditionValue: e.target.value })} />
            </div>
            <div className="apr-field">
              <label>Auto Escalation (Days)</label>
              <input type="number" min={1} max={30} className="apr-input" value={editing.autoEscalateDays ?? 2} onChange={(e) => setEditing({ ...editing, autoEscalateDays: Number(e.target.value) })} />
            </div>
          </div>
          <div className="apr-field">
            <label>Primary Approver Role</label>
            <select
              className="apr-select"
              value={editing.levels?.[0]?.role || "PROJECT_MANAGER"}
              onChange={(e) => setEditing({ ...editing, levels: [{ level: 1, role: e.target.value }] })}
            >
              {APPROVAL_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 7 }}>
            <button type="button" className="apr-btn" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="apr-btn apr-btn-primary" disabled={saving}>Save Rule</button>
          </div>
        </form>
      )}

      {/* Live Rule Tester (APR-005 Panel 9) */}
      <div className="apr-card" style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        <h3 className="apr-card-title">Live Rule Evaluator</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="apr-field">
            <label>Request Type</label>
            <select className="apr-select" value={testType} onChange={(e) => setTestType(e.target.value)}>
              {APPROVAL_ENTITY_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div className="apr-field">
            <label>Commercial Impact (₹)</label>
            <input type="number" className="apr-input" value={testAmount} onChange={(e) => setTestAmount(e.target.value)} />
          </div>
          <button type="button" className="apr-btn apr-btn-primary" onClick={runRuleTest}>
            <Play size={12} /> Test Rules
          </button>
        </div>
        {testMatches && (
          <div className={`apr-alert ${testMatches.length > 0 ? "apr-alert-ok" : "apr-alert-info"}`}>
            {testMatches.length > 0
              ? `Matched ${testMatches.length} active rule(s): ${testMatches.map((m) => `${m.ruleCode} (${m.name})`).join(", ")}`
              : "No active rules matched this sample input."}
          </div>
        )}
      </div>

      {/* Rules Table */}
      <div className="apr-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="apr-table-wrap">
          <table className="apr-table">
            <thead><tr><th>Code</th><th>Rule Name</th><th>Request Type</th><th>Condition</th><th>Approval Levels</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="apr-empty">Loading rules...</td></tr>
              ) : (
                rules.map((r) => (
                  <tr key={r._id}>
                    <td style={{ fontWeight: 700, color: "#0755e9" }}>{r.ruleCode}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{r.name}</div>
                      {r.description && <div style={{ fontSize: 10, color: "#64748b" }}>{r.description}</div>}
                    </td>
                    <td><span className="apr-badge apr-badge-blue">{r.entityType}</span></td>
                    <td>{r.conditionOperator === "ALWAYS" ? "Always" : `${r.conditionOperator} ${r.conditionValue}`}</td>
                    <td>{(r.levels || []).map((l: any) => l.role).join(" → ")}</td>
                    <td><span className={approvalBadgeClass(r.status)}>{r.status}</span></td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <button type="button" className="apr-btn apr-btn-sm" onClick={() => setEditing(r)}><Edit3 size={11} /></button>
                        <button type="button" className="apr-btn apr-btn-danger apr-btn-sm" onClick={() => handleDelete(r)}><Trash2 size={11} /></button>
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
