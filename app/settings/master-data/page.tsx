"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Layers,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { settingsApi, MASTER_DATA_CATEGORIES } from "@/lib/settings/api";
import "@/components/settings/settings.css";

export default function MasterDataPage() {
  const [items, setItems] = useState<any[]>([]);
  const [category, setCategory] = useState<string>("PROJECT_STATUS");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Add/Edit inline form
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await settingsApi.listMasterData({});
      setItems(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load master data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const countsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((i) => {
      map[i.category] = (map[i.category] || 0) + 1;
    });
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (i.category !== category) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q);
    });
  }, [items, category, search]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.name?.trim() || !editing?.code?.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editing._id) {
        await settingsApi.updateMasterData(editing._id, editing);
        flash(`Updated ${editing.code}.`);
      } else {
        await settingsApi.createMasterData({ ...editing, category });
        flash(`Added ${editing.code.toUpperCase()} to ${category}.`);
      }
      setEditing(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: any) => {
    if (!window.confirm(`Delete master data entry ${item.code} (${item.name})?`)) return;
    try {
      await settingsApi.deleteMasterData(item._id);
      flash(`Deleted ${item.code}.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Delete failed");
    }
  };

  const catLabel = MASTER_DATA_CATEGORIES.find((c) => c.code === category)?.label || category;

  return (
    <div className="sys-page">
      <div>
        <div className="sys-breadcrumb">
          <Link href="/settings">System Administration</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Master Data</span>
        </div>
        <div className="sys-header">
          <div>
            <h1 className="sys-title">Master Data Management</h1>
            <p className="sys-subtitle">
              Manage all 12 standardized PMS reference catalogs ({items.length} total records across {MASTER_DATA_CATEGORIES.length} categories).
            </p>
          </div>
          <div className="sys-actions">
            <button type="button" className="sys-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              type="button"
              className="sys-btn sys-btn-primary"
              onClick={() =>
                setEditing({
                  category,
                  name: "",
                  code: "",
                  description: "",
                  color: "#0755e9",
                  rank: filtered.length + 1,
                  status: "ACTIVE",
                })
              }
            >
              <Plus size={12} /> Add {catLabel.replace(/s$/, "")}
            </button>
          </div>
        </div>
      </div>

      {/* Subnav */}
      <div className="sys-subnav">
        <Link href="/settings" className="sys-subnav-link">General Settings</Link>
        <Link href="/settings/workflows" className="sys-subnav-link">Workflow Settings</Link>
        <Link href="/settings/master-data" className="sys-subnav-link active">Master Data</Link>
        <Link href="/settings/health" className="sys-subnav-link">System Health</Link>
        <Link href="/settings/feature-flags" className="sys-subnav-link">Feature Flags</Link>
      </div>

      {error && <div className="sys-alert sys-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="sys-alert sys-alert-ok"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      {/* Category Selector Pills */}
      <div className="sys-seg">
        {MASTER_DATA_CATEGORIES.map((c) => (
          <button
            key={c.code}
            type="button"
            className={`sys-seg-btn ${category === c.code ? "active" : ""}`}
            onClick={() => { setCategory(c.code); setEditing(null); }}
          >
            {c.label} ({countsByCategory[c.code] || 0})
          </button>
        ))}
      </div>

      {/* Inline Editor */}
      {editing && (
        <form onSubmit={handleSave} className="sys-card" style={{ background: "#f8fbff", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, alignItems: "end" }}>
          <div className="sys-field">
            <label>Name *</label>
            <input className="sys-input" value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
          </div>
          <div className="sys-field">
            <label>Code *</label>
            <input className="sys-input" value={editing.code || ""} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} required />
          </div>
          <div className="sys-field">
            <label>Description</label>
            <input className="sys-input" value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </div>
          <div className="sys-field">
            <label>Color</label>
            <input type="color" className="sys-input" style={{ padding: 2 }} value={editing.color || "#0755e9"} onChange={(e) => setEditing({ ...editing, color: e.target.value })} />
          </div>
          <div className="sys-field">
            <label>Status</label>
            <select className="sys-select" value={editing.status || "ACTIVE"} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="submit" className="sys-btn sys-btn-primary" disabled={saving}>Save</button>
            <button type="button" className="sys-btn" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="sys-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 13px", borderBottom: "1px solid #e3eaf4" }}>
          <strong style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Layers size={13} color="#0755e9" /> {catLabel} ({filtered.length})</strong>
          <input className="sys-input" placeholder={`Filter ${catLabel.toLowerCase()}...`} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="sys-table-wrap">
          <table className="sys-table">
            <thead><tr><th>Rank</th><th>Color</th><th>Code</th><th>Name</th><th>Description</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="sys-empty">Loading master data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="sys-empty">No entries in this category yet.</td></tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item._id}>
                    <td>{item.rank}</td>
                    <td><span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 4, background: item.color || "#0755e9" }} /></td>
                    <td style={{ fontWeight: 700, fontFamily: "ui-monospace, monospace", color: "#0755e9" }}>{item.code}</td>
                    <td style={{ fontWeight: 700 }}>{item.name}</td>
                    <td style={{ color: "#64748b" }}>{item.description || item.meta || "—"}</td>
                    <td><span className={item.status === "ACTIVE" ? "sys-badge sys-badge-green" : "sys-badge sys-badge-slate"}>{item.status}</span></td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <button type="button" className="sys-btn sys-btn-sm" onClick={() => setEditing(item)}><Edit3 size={11} /></button>
                        <button type="button" className="sys-btn sys-btn-danger sys-btn-sm" onClick={() => handleDelete(item)}><Trash2 size={11} /></button>
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
