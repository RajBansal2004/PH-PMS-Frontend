"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapPin,
  Plus,
  Download,
  RefreshCw,
  List,
  LayoutGrid,
  GitBranch,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Building2,
  Clock,
} from "lucide-react";
import {
  orgWorkspaceApi,
  type OrgLocation,
  type LocationsListResponse,
} from "@/lib/organization/workspaceApi";
import "@/components/organization/org-workspace.css";

const TYPE_LABELS: Record<OrgLocation["type"], string> = {
  HEAD_OFFICE: "Head Office",
  BRANCH: "Branch",
  REMOTE: "Remote Hub",
  CLIENT_SITE: "Client Site",
};

const EMPTY_FORM: Partial<OrgLocation> = {
  locationCode: "",
  name: "",
  type: "BRANCH",
  region: "India",
  parentLocationId: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  postalCode: "",
  timezone: "Asia/Kolkata",
  email: "",
  phone: "",
  managerName: "",
  status: "ACTIVE",
  settings: {
    allowTimeTracking: true,
    enableTimesheetApproval: true,
    enableProjectCreation: true,
  },
};

export default function OrganizationLocationsPage() {
  const [data, setData] = useState<LocationsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [regionFilter, setRegionFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"list" | "grid" | "hierarchy">("list");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OrgLocation | null>(null);
  const [form, setForm] = useState<Partial<OrgLocation>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await orgWorkspaceApi.listLocations({
        search: search || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        type: typeFilter !== "ALL" ? typeFilter : undefined,
        region: regionFilter !== "ALL" ? regionFilter : undefined,
      });
      setData(res);
      setSelectedIds([]);
    } catch (e: any) {
      setError(e?.message || "Failed to load locations");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, regionFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = data?.items || [];

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, settings: { ...EMPTY_FORM.settings! } });
    setModalOpen(true);
  };

  const openEdit = (loc: OrgLocation) => {
    setEditing(loc);
    const parentId =
      typeof loc.parentLocationId === "object" && loc.parentLocationId
        ? loc.parentLocationId._id
        : (loc.parentLocationId as string) || "";
    setForm({
      ...loc,
      parentLocationId: parentId,
      settings: {
        allowTimeTracking: loc.settings?.allowTimeTracking !== false,
        enableTimesheetApproval: loc.settings?.enableTimesheetApproval !== false,
        enableProjectCreation: loc.settings?.enableProjectCreation !== false,
      },
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      setError("Location name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        parentLocationId: form.parentLocationId || null,
      };
      if (editing) {
        await orgWorkspaceApi.updateLocation(editing._id, payload);
        setNotice(`Location "${form.name}" updated.`);
      } else {
        await orgWorkspaceApi.createLocation(payload);
        setNotice(`Location "${form.name}" created.`);
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to save location");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (loc: OrgLocation) => {
    if (!window.confirm(`Delete location "${loc.name}" (${loc.locationCode})?`)) return;
    try {
      await orgWorkspaceApi.deleteLocation(loc._id);
      setNotice(`Location "${loc.name}" removed.`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to delete location");
    }
  };

  const handleBulkStatus = async (status: "ACTIVE" | "INACTIVE") => {
    if (!selectedIds.length) return;
    try {
      await orgWorkspaceApi.bulkStatusLocations(selectedIds, status);
      setNotice(`Updated ${selectedIds.length} location(s) to ${status}.`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Bulk update failed");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const exportCsv = () => {
    const header = ["Code", "Name", "Type", "Region", "City", "State", "Country", "Timezone", "Status"];
    const rows = items.map((l) => [
      l.locationCode,
      l.name,
      TYPE_LABELS[l.type] || l.type,
      l.region,
      l.city,
      l.state,
      l.country,
      l.timezone,
      l.status,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "organization-locations.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const hierarchyTree = useMemo(() => {
    const roots: OrgLocation[] = [];
    const byParent = new Map<string, OrgLocation[]>();
    const allIds = new Set(items.map((x) => x._id));

    for (const loc of items) {
      const pid =
        typeof loc.parentLocationId === "object" && loc.parentLocationId
          ? loc.parentLocationId._id
          : typeof loc.parentLocationId === "string"
          ? loc.parentLocationId
          : "";
      if (pid && allIds.has(pid)) {
        const list = byParent.get(pid) || [];
        list.push(loc);
        byParent.set(pid, list);
      } else {
        roots.push(loc);
      }
    }
    return { roots, byParent };
  }, [items]);

  const s = data?.summary;

  return (
    <div className="ow-page">
      <div className="ow-header">
        <div>
          <div className="ow-breadcrumb">Organization / Locations &amp; Branches (ORG-004)</div>
          <h1 className="ow-title">
            <MapPin size={18} color="#0755e9" />
            Locations &amp; Branches Management
          </h1>
          <div className="ow-subtitle">
            Configure corporate offices, regional branches, remote hubs, timezones &amp; location governance policies
          </div>
        </div>
        <div className="ow-actions">
          <button type="button" className="ow-btn" onClick={exportCsv} disabled={!items.length}>
            <Download size={13} /> Export CSV
          </button>
          <button type="button" className="ow-btn" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button type="button" className="ow-btn ow-btn-primary" onClick={openCreate}>
            <Plus size={14} /> Add Location
          </button>
        </div>
      </div>

      {error && <div className="ow-banner-err">{error}</div>}
      {notice && <div className="ow-banner-ok">{notice}</div>}

      {/* KPI Strip */}
      <div className="ow-kpi-grid">
        <div className="ow-kpi-card">
          <div className="ow-kpi-label">Total Locations <Building2 size={14} color="#0755e9" /></div>
          <div className="ow-kpi-value">{s?.totalLocations ?? "—"}</div>
        </div>
        <div className="ow-kpi-card">
          <div className="ow-kpi-label">Active <CheckCircle2 size={14} color="#079b62" /></div>
          <div className="ow-kpi-value">{s?.activeLocations ?? "—"}</div>
        </div>
        <div className="ow-kpi-card">
          <div className="ow-kpi-label">Inactive <XCircle size={14} color="#64748b" /></div>
          <div className="ow-kpi-value">{s?.inactiveLocations ?? "—"}</div>
        </div>
        <div className="ow-kpi-card">
          <div className="ow-kpi-label">Active Users</div>
          <div className="ow-kpi-value">{s?.totalUsers ?? "—"}</div>
        </div>
        <div className="ow-kpi-card">
          <div className="ow-kpi-label">Org Teams</div>
          <div className="ow-kpi-value">{s?.totalTeams ?? "—"}</div>
        </div>
        <div className="ow-kpi-card">
          <div className="ow-kpi-label">Active Projects</div>
          <div className="ow-kpi-value">{s?.totalProjects ?? "—"}</div>
        </div>
      </div>

      {/* Filters & View Mode */}
      <div className="ow-toolbar">
        <div className="ow-filters">
          <input
            className="ow-input"
            style={{ width: 220 }}
            placeholder="Search name, code, city, manager..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="ow-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <select className="ow-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="ALL">All Types</option>
            <option value="HEAD_OFFICE">Head Office</option>
            <option value="BRANCH">Branch</option>
            <option value="REMOTE">Remote Hub</option>
            <option value="CLIENT_SITE">Client Site</option>
          </select>
          <select className="ow-select" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
            <option value="ALL">All Regions</option>
            {(data?.facets?.regions || []).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {selectedIds.length > 0 && (
            <>
              <button type="button" className="ow-btn" onClick={() => void handleBulkStatus("ACTIVE")}>
                Activate ({selectedIds.length})
              </button>
              <button type="button" className="ow-btn ow-btn-danger" onClick={() => void handleBulkStatus("INACTIVE")}>
                Deactivate ({selectedIds.length})
              </button>
            </>
          )}
        </div>

        <div className="ow-view-toggle">
          <button type="button" className={`ow-view-btn ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")}>
            <List size={13} /> List
          </button>
          <button type="button" className={`ow-view-btn ${viewMode === "grid" ? "active" : ""}`} onClick={() => setViewMode("grid")}>
            <LayoutGrid size={13} /> Grid
          </button>
          <button type="button" className={`ow-view-btn ${viewMode === "hierarchy" ? "active" : ""}`} onClick={() => setViewMode("hierarchy")}>
            <GitBranch size={13} /> Hierarchy
          </button>
        </div>
      </div>

      {/* Content Views */}
      {viewMode === "list" && (
        <div className="ow-card">
          <div className="ow-table-wrap">
            <table className="ow-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <input
                      type="checkbox"
                      checked={items.length > 0 && selectedIds.length === items.length}
                      onChange={(e) => setSelectedIds(e.target.checked ? items.map((x) => x._id) : [])}
                    />
                  </th>
                  <th>Code</th>
                  <th>Location Name</th>
                  <th>Type</th>
                  <th>City / State / Region</th>
                  <th>Timezone</th>
                  <th>Policies</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((loc) => (
                  <tr key={loc._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(loc._id)}
                        onChange={() => toggleSelect(loc._id)}
                      />
                    </td>
                    <td><strong>{loc.locationCode}</strong></td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{loc.name}</div>
                      {loc.managerName ? <div style={{ fontSize: 10, color: "#64748b" }}>Lead: {loc.managerName}</div> : null}
                    </td>
                    <td>
                      <span className={`ow-badge ${loc.type === "HEAD_OFFICE" ? "ow-badge-purple" : "ow-badge-blue"}`}>
                        {TYPE_LABELS[loc.type] || loc.type}
                      </span>
                    </td>
                    <td>
                      {[loc.city, loc.state].filter(Boolean).join(", ") || "—"}
                      <div style={{ fontSize: 10, color: "#64748b" }}>{loc.region} · {loc.country}</div>
                    </td>
                    <td><Clock size={11} style={{ display: "inline", marginRight: 4 }} />{loc.timezone}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {loc.settings?.allowTimeTracking && <span className="ow-badge ow-badge-slate">Time</span>}
                        {loc.settings?.enableTimesheetApproval && <span className="ow-badge ow-badge-slate">TS Approval</span>}
                        {loc.settings?.enableProjectCreation && <span className="ow-badge ow-badge-slate">Projects</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`ow-badge ${loc.status === "ACTIVE" ? "ow-badge-green" : "ow-badge-slate"}`}>
                        {loc.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 5 }}>
                        <button type="button" className="ow-btn" style={{ height: 26, padding: "0 8px" }} onClick={() => openEdit(loc)}>
                          <Edit3 size={12} /> Edit
                        </button>
                        <button type="button" className="ow-btn ow-btn-danger" style={{ height: 26, padding: "0 8px" }} onClick={() => void handleDelete(loc)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!items.length && !loading && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: 24, color: "#64748b" }}>
                      No locations match your filters. Click &quot;Add Location&quot; to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === "grid" && (
        <div className="ow-grid-cards">
          {items.map((loc) => (
            <div key={loc._id} className="ow-loc-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "#0755e9" }}>{loc.locationCode}</span>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{loc.name}</div>
                </div>
                <span className={`ow-badge ${loc.status === "ACTIVE" ? "ow-badge-green" : "ow-badge-slate"}`}>
                  {loc.status}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: "#475569" }}>
                {[loc.address, loc.city, loc.state, loc.country].filter(Boolean).join(", ") || "Address not set"}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="ow-badge ow-badge-blue">{TYPE_LABELS[loc.type]}</span>
                <span className="ow-badge ow-badge-slate">{loc.region}</span>
                <span className="ow-badge ow-badge-slate">{loc.timezone}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: "auto", paddingTop: 6, borderTop: "1px solid #f1f5f9" }}>
                <button type="button" className="ow-btn" style={{ height: 27 }} onClick={() => openEdit(loc)}>
                  <Edit3 size={12} /> Edit
                </button>
                <button type="button" className="ow-btn ow-btn-danger" style={{ height: 27 }} onClick={() => void handleDelete(loc)}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === "hierarchy" && (
        <div className="ow-card">
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Location Reporting Hierarchy</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {hierarchyTree.roots.map((root) => {
              const children = hierarchyTree.byParent.get(root._id) || [];
              return (
                <div key={root._id} style={{ border: "1px solid #e2e8f0", borderRadius: 9, padding: 11, background: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>{root.locationCode} — {root.name}</strong>{" "}
                      <span className="ow-badge ow-badge-purple">{TYPE_LABELS[root.type]}</span>{" "}
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        {[root.city, root.state, root.country].filter(Boolean).join(", ")}
                      </span>
                    </div>
                    <button type="button" className="ow-btn" style={{ height: 25 }} onClick={() => openEdit(root)}>
                      Edit
                    </button>
                  </div>
                  {children.length > 0 && (
                    <div style={{ marginTop: 8, paddingLeft: 20, borderLeft: "2px solid #cbd5e1", display: "flex", flexDirection: "column", gap: 6 }}>
                      {children.map((ch) => (
                        <div key={ch._id} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 7, padding: "7px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <strong>{ch.locationCode} — {ch.name}</strong>{" "}
                            <span className="ow-badge ow-badge-blue">{TYPE_LABELS[ch.type]}</span>{" "}
                            <span style={{ fontSize: 11, color: "#64748b" }}>{ch.city}, {ch.state}</span>
                          </div>
                          <button type="button" className="ow-btn" style={{ height: 24 }} onClick={() => openEdit(ch)}>
                            Edit
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="ow-modal-backdrop" role="dialog" aria-modal="true">
          <form className="ow-modal" onSubmit={handleSave}>
            <div className="ow-modal-head">
              <strong>{editing ? `Edit Location — ${editing.locationCode}` : "Add Organization Location"}</strong>
              <button type="button" className="ow-btn" style={{ height: 26, padding: "0 6px" }} onClick={() => setModalOpen(false)}>
                <X size={14} />
              </button>
            </div>

            <div className="ow-modal-body">
              <div className="ow-form-grid">
                <div className="ow-field">
                  <label>Location Code</label>
                  <input
                    className="ow-input"
                    placeholder="Auto-generated if empty (e.g. BLR-01)"
                    value={form.locationCode || ""}
                    onChange={(e) => setForm({ ...form, locationCode: e.target.value })}
                  />
                </div>
                <div className="ow-field">
                  <label>Location Name *</label>
                  <input
                    className="ow-input"
                    required
                    placeholder="e.g. Bengaluru Engineering Hub"
                    value={form.name || ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="ow-field">
                  <label>Location Type</label>
                  <select
                    className="ow-select"
                    value={form.type || "BRANCH"}
                    onChange={(e) => setForm({ ...form, type: e.target.value as OrgLocation["type"] })}
                  >
                    <option value="HEAD_OFFICE">Head Office</option>
                    <option value="BRANCH">Branch</option>
                    <option value="REMOTE">Remote Hub</option>
                    <option value="CLIENT_SITE">Client Site</option>
                  </select>
                </div>
                <div className="ow-field">
                  <label>Parent Location</label>
                  <select
                    className="ow-select"
                    value={typeof form.parentLocationId === "string" ? form.parentLocationId : ""}
                    onChange={(e) => setForm({ ...form, parentLocationId: e.target.value })}
                  >
                    <option value="">None (Top-Level)</option>
                    {items
                      .filter((x) => !editing || x._id !== editing._id)
                      .map((x) => (
                        <option key={x._id} value={x._id}>
                          {x.locationCode} — {x.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="ow-field">
                  <label>Region</label>
                  <input className="ow-input" value={form.region || ""} onChange={(e) => setForm({ ...form, region: e.target.value })} />
                </div>
                <div className="ow-field">
                  <label>Timezone</label>
                  <select className="ow-select" value={form.timezone || "Asia/Kolkata"} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+5:30)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                  </select>
                </div>
                <div className="ow-field full">
                  <label>Street Address</label>
                  <input className="ow-input" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="ow-field">
                  <label>City</label>
                  <input className="ow-input" value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="ow-field">
                  <label>State / Province</label>
                  <input className="ow-input" value={form.state || ""} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                </div>
                <div className="ow-field">
                  <label>Country</label>
                  <input className="ow-input" value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                </div>
                <div className="ow-field">
                  <label>Location Manager</label>
                  <input className="ow-input" value={form.managerName || ""} onChange={(e) => setForm({ ...form, managerName: e.target.value })} />
                </div>
                <div className="ow-field">
                  <label>Contact Email</label>
                  <input className="ow-input" type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="ow-field">
                  <label>Status</label>
                  <select
                    className="ow-select"
                    value={form.status || "ACTIVE"}
                    onChange={(e) => setForm({ ...form, status: e.target.value as "ACTIVE" | "INACTIVE" })}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>Location Governance Settings</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={form.settings?.allowTimeTracking !== false}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          settings: { ...form.settings!, allowTimeTracking: e.target.checked },
                        })
                      }
                    />
                    Allow Time Tracking &amp; Daily Timesheet Logging
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={form.settings?.enableTimesheetApproval !== false}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          settings: { ...form.settings!, enableTimesheetApproval: e.target.checked },
                        })
                      }
                    />
                    Require Manager Timesheet Approval Workflow
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={form.settings?.enableProjectCreation !== false}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          settings: { ...form.settings!, enableProjectCreation: e.target.checked },
                        })
                      }
                    />
                    Enable New Project Creation from this Location
                  </label>
                </div>
              </div>
            </div>

            <div className="ow-modal-foot">
              <button type="button" className="ow-btn" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="ow-btn ow-btn-primary" disabled={saving}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Create Location"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
