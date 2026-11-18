"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  approvalsApi,
  approvalLookupApi,
  APPROVAL_ENTITY_TYPES,
  formatDateTime,
  approvalBadgeClass,
} from "@/lib/approvals/api";
import "@/components/approvals/approvals.css";

export default function ApprovalDelegationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [employees, setEmployees] = useState<{ _id: string; name: string }[]>([]);
  const [typeTab, setTypeTab] = useState<"ALL" | "DELEGATION" | "ESCALATION">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [formType, setFormType] = useState<"DELEGATION" | "ESCALATION">("DELEGATION");
  const [toUserId, setToUserId] = useState("");
  const [reason, setReason] = useState("On Leave");
  const [validFrom, setValidFrom] = useState(new Date().toISOString().slice(0, 10));
  const [validTo, setValidTo] = useState("");
  const [slaDays, setSlaDays] = useState(2);
  const [reqType, setReqType] = useState("ALL");
  const [saving, setSaving] = useState(false);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, emps] = await Promise.all([
        approvalsApi.listDelegations({ type: typeTab }),
        approvalLookupApi.employees().catch(() => []),
      ]);
      setItems(list);
      setEmployees(emps);
    } catch (e: any) {
      setError(e?.message || "Failed to load delegations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [typeTab]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x._id === toUserId);
    if (!emp) {
      setError("Please select a delegate / escalation target user.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await approvalsApi.createDelegation({
        type: formType,
        toUserId: emp._id,
        toUserName: emp.name,
        reason: reason.trim() || "Delegated authority",
        requestTypes: [reqType],
        validFrom: validFrom || undefined,
        validTo: validTo || undefined,
        slaDays,
        status: "ACTIVE",
      });
      setShowCreate(false);
      setToUserId("");
      flash(`${formType === "DELEGATION" ? "Delegation" : "Escalation rule"} saved.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to save delegation");
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (item: any) => {
    try {
      const nextStatus = item.status === "ACTIVE" ? "REVOKED" : "ACTIVE";
      await approvalsApi.updateDelegation(item._id, { status: nextStatus });
      flash(`Updated status to ${nextStatus}.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Update failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this delegation/escalation record?")) return;
    try {
      await approvalsApi.deleteDelegation(id);
      flash("Deleted.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Delete failed");
    }
  };

  return (
    <div className="apr-page">
      <div>
        <div className="apr-breadcrumb">
          <Link href="/approvals">Approval Engine</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Delegation &amp; Escalation</span>
        </div>
        <div className="apr-header">
          <div>
            <h1 className="apr-title">Delegation &amp; SLA Escalation</h1>
            <p className="apr-subtitle">
              Delegate approval authority during leave or configure automatic SLA breach escalations.
            </p>
          </div>
          <div className="apr-actions">
            <button type="button" className="apr-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" className="apr-btn apr-btn-primary" onClick={() => setShowCreate((v) => !v)}>
              <Plus size={12} /> New Delegation / Escalation
            </button>
          </div>
        </div>
      </div>

      {/* Subnav */}
      <div className="apr-subnav">
        <Link href="/approvals" className="apr-subnav-link">My Approvals</Link>
        <Link href="/approvals/history" className="apr-subnav-link">Approval History</Link>
        <Link href="/approvals/rules" className="apr-subnav-link">Approval Rules</Link>
        <Link href="/approvals/delegations" className="apr-subnav-link active">Delegation &amp; Escalation</Link>
      </div>

      {error && <div className="apr-alert apr-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="apr-alert apr-alert-ok"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      <div className="apr-seg">
        {(["ALL", "DELEGATION", "ESCALATION"] as const).map((t) => (
          <button key={t} type="button" className={`apr-seg-btn ${typeTab === t ? "active" : ""}`} onClick={() => setTypeTab(t)}>
            {t === "ALL" ? "All" : t === "DELEGATION" ? "Delegations" : "Escalation Rules"}
          </button>
        ))}
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="apr-card" style={{ background: "#f8fbff", display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <Users size={14} color="#0755e9" /> Configure Delegation or SLA Escalation
          </div>
          <div className="apr-grid-3">
            <div className="apr-field">
              <label>Rule Type</label>
              <select className="apr-select" value={formType} onChange={(e) => setFormType(e.target.value as any)}>
                <option value="DELEGATION">Temporary Delegation</option>
                <option value="ESCALATION">SLA Breach Escalation</option>
              </select>
            </div>
            <div className="apr-field">
              <label>Delegate / Escalate To *</label>
              <select className="apr-select" value={toUserId} onChange={(e) => setToUserId(e.target.value)} required>
                <option value="">Select Team Member</option>
                {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
              </select>
            </div>
            <div className="apr-field">
              <label>Applicable Request Type</label>
              <select className="apr-select" value={reqType} onChange={(e) => setReqType(e.target.value)}>
                <option value="ALL">All Request Types</option>
                {APPROVAL_ENTITY_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          </div>
          <div className="apr-grid-3">
            <div className="apr-field">
              <label>Reason / Trigger</label>
              <input className="apr-input" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            {formType === "DELEGATION" ? (
              <>
                <div className="apr-field">
                  <label>Valid From</label>
                  <input type="date" className="apr-input" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
                </div>
                <div className="apr-field">
                  <label>Valid To</label>
                  <input type="date" className="apr-input" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
                </div>
              </>
            ) : (
              <div className="apr-field">
                <label>Escalate After (SLA Days)</label>
                <input type="number" min={1} max={30} className="apr-input" value={slaDays} onChange={(e) => setSlaDays(Number(e.target.value))} />
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 7 }}>
            <button type="button" className="apr-btn" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="apr-btn apr-btn-primary" disabled={saving}>Save</button>
          </div>
        </form>
      )}

      <div className="apr-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="apr-table-wrap">
          <table className="apr-table">
            <thead>
              <tr><th>Type</th><th>From</th><th>To</th><th>Scope</th><th>Reason / SLA</th><th>Validity</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="apr-empty">Loading delegations...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="apr-empty">No active delegations or escalation rules configured.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id}>
                    <td><span className="apr-badge apr-badge-purple">{item.type}</span></td>
                    <td style={{ fontWeight: 600 }}>{item.fromUserName}</td>
                    <td style={{ fontWeight: 700, color: "#0755e9" }}>{item.toUserName}</td>
                    <td>{(item.requestTypes || ["ALL"]).join(", ")}</td>
                    <td>{item.reason}{item.type === "ESCALATION" ? ` (${item.slaDays}d SLA)` : ""}</td>
                    <td style={{ color: "#64748b", whiteSpace: "nowrap" }}>
                      {formatDateTime(item.validFrom)} {item.validTo ? `→ ${formatDateTime(item.validTo)}` : ""}
                    </td>
                    <td><span className={approvalBadgeClass(item.status)}>{item.status}</span></td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <button type="button" className="apr-btn apr-btn-sm" onClick={() => handleRevoke(item)}>
                          {item.status === "ACTIVE" ? "Revoke" : "Activate"}
                        </button>
                        <button type="button" className="apr-btn apr-btn-danger apr-btn-sm" onClick={() => handleDelete(item._id)}>
                          <Trash2 size={11} />
                        </button>
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
