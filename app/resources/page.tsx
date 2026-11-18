"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  UserCheck,
  Clock,
  AlertTriangle,
  Briefcase,
  CalendarOff,
  Search,
  Plus,
  RefreshCw,
  Download,
  LayoutGrid,
  List,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Mail,
} from "lucide-react";
import {
  resourceApi,
  allocationApi,
  lookupApi,
  ResourceItem,
  AllocationItem,
  DepartmentLite,
  getInitials,
} from "@/lib/resources/api";
import "@/components/resources/resource-capacity.css";

export default function ResourcesDirectoryPage() {
  const router = useRouter();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & view
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [availFilter, setAvailFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resList, allocList, deptList] = await Promise.all([
        resourceApi.list(),
        allocationApi.list().catch(() => []),
        lookupApi.departments().catch(() => []),
      ]);
      setResources(resList);
      setAllocations(allocList);
      setDepartments(deptList);
    } catch (e: any) {
      setError(e?.message || "Failed to load resources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const allocByEmp = useMemo(() => {
    const map = new Map<string, { totalPct: number; projects: { name: string; pct: number }[] }>();
    allocations
      .filter((a) => !["CANCELLED", "RELEASED", "COMPLETED"].includes(a.status))
      .forEach((a) => {
        const key = a.employeeId;
        if (!map.has(key)) map.set(key, { totalPct: 0, projects: [] });
        const entry = map.get(key)!;
        entry.totalPct += a.allocationPercent;
        entry.projects.push({ name: a.projectName, pct: a.allocationPercent });
      });
    return map;
  }, [allocations]);

  const enriched = useMemo(() => {
    return resources.map((r) => {
      const live = allocByEmp.get(r.employeeId);
      const allocPct = live ? live.totalPct : r.currentAllocationPercent;
      const availPct = Math.max(0, 100 - allocPct);
      const projects = live ? live.projects : [];
      return {
        ...r,
        currentAllocationPercent: allocPct,
        availabilityPercent: availPct,
        activeProjects: projects,
        activeProjectsCount: projects.length || r.activeProjectsCount,
      };
    });
  }, [resources, allocByEmp]);

  const roleOptions = useMemo(() => {
    const set = new Set<string>();
    enriched.forEach((r) => {
      if (r.designationName) set.add(r.designationName);
    });
    return Array.from(set).sort();
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((r) => {
      if (q) {
        const hay = `${r.name} ${r.email} ${r.employeeCode} ${r.primarySkill} ${r.secondarySkills.join(" ")} ${r.departmentName} ${r.designationName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (deptFilter !== "ALL" && r.departmentId !== deptFilter && r.departmentName !== deptFilter) return false;
      if (roleFilter !== "ALL" && r.designationName !== roleFilter) return false;
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (availFilter === "BENCH" && r.currentAllocationPercent !== 0) return false;
      if (availFilter === "PARTIAL" && (r.currentAllocationPercent === 0 || r.currentAllocationPercent >= 80)) return false;
      if (availFilter === "FULL" && (r.currentAllocationPercent < 80 || r.currentAllocationPercent > 100)) return false;
      if (availFilter === "OVER" && r.currentAllocationPercent <= 100) return false;
      return true;
    });
  }, [enriched, search, deptFilter, roleFilter, statusFilter, availFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const kpis = useMemo(() => {
    const total = enriched.length;
    const onBench = enriched.filter((r) => r.currentAllocationPercent === 0 && r.status !== "ON_LEAVE" && r.status !== "INACTIVE").length;
    const partial = enriched.filter((r) => r.currentAllocationPercent > 0 && r.currentAllocationPercent < 80).length;
    const full = enriched.filter((r) => r.currentAllocationPercent >= 80 && r.currentAllocationPercent <= 100).length;
    const over = enriched.filter((r) => r.currentAllocationPercent > 100).length;
    const onLeave = enriched.filter((r) => r.status === "ON_LEAVE").length;
    return { total, onBench, partial, full, over, onLeave };
  }, [enriched]);

  const handleExportCsv = () => {
    const headers = ["Employee Code", "Name", "Email", "Department", "Role", "Primary Skill", "Allocation %", "Availability %", "Status"];
    const rows = filtered.map((r) => [
      r.employeeCode,
      r.name,
      r.email,
      r.departmentName,
      r.designationName,
      r.primarySkill,
      `${r.currentAllocationPercent}%`,
      `${r.availabilityPercent}%`,
      r.status,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resource-directory.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (r: ResourceItem) => {
    if (r.status === "ON_LEAVE") return <span className="rc-badge rc-badge-amber">On Leave</span>;
    if (r.status === "INACTIVE") return <span className="rc-badge rc-badge-slate">Inactive</span>;
    if (r.currentAllocationPercent > 100) return <span className="rc-badge rc-badge-red">Overallocated</span>;
    if (r.currentAllocationPercent === 0) return <span className="rc-badge rc-badge-blue">On Bench</span>;
    return <span className="rc-badge rc-badge-green">Active</span>;
  };

  const getBarColor = (allocPct: number) => {
    if (allocPct > 100) return "#dc2626";
    if (allocPct > 80) return "#f59e0b";
    return "#16a34a";
  };

  return (
    <div className="rc-page">
      {/* Header */}
      <div>
        <div className="rc-breadcrumb">
          <span>Resource Management</span>
          <ChevronRight size={12} />
          <span style={{ color: "#0f172a", fontWeight: 600 }}>Resource Directory</span>
        </div>
        <div className="rc-header">
          <div>
            <h1 className="rc-title">Resource Directory</h1>
            <p className="rc-subtitle">Manage team members, skills, availability, and project allocations across the organization.</p>
          </div>
          <div className="rc-header-actions">
            <button type="button" className="rc-btn rc-btn-outline" onClick={loadAll} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" className="rc-btn rc-btn-outline" onClick={handleExportCsv}>
              <Download size={13} /> Export CSV
            </button>
            <Link href="/resources/new" className="rc-btn rc-btn-primary">
              <Plus size={14} /> Add Resource
            </Link>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="rc-subnav">
        <Link href="/resources" className="rc-subnav-link active">Resource Directory</Link>
        <Link href="/resources/new" className="rc-subnav-link">Add New Resource</Link>
        <Link href="/resources/allocate" className="rc-subnav-link">Project Allocation</Link>
        <Link href="/resources/planner" className="rc-subnav-link">Allocation Planner</Link>
        <Link href="/resources/calendar" className="rc-subnav-link">Resource Calendar</Link>
        <Link href="/resources/bench" className="rc-subnav-link">Bench &amp; Availability</Link>
      </div>

      {/* 6-KPI Strip matching RES-001 */}
      <div className="rc-kpi-grid">
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#eff6ff", color: "#2563eb" }}><Users size={16} /></div>
          <div>
            <span className="rc-kpi-label">Total Resources</span>
            <span className="rc-kpi-value">{kpis.total}</span>
          </div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#ecfdf5", color: "#16a34a" }}><UserCheck size={16} /></div>
          <div>
            <span className="rc-kpi-label">Available (Bench)</span>
            <span className="rc-kpi-value">{kpis.onBench}</span>
          </div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#eff6ff", color: "#0284c7" }}><Clock size={16} /></div>
          <div>
            <span className="rc-kpi-label">Partially Allocated</span>
            <span className="rc-kpi-value">{kpis.partial}</span>
          </div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#f0fdf4", color: "#15803d" }}><Briefcase size={16} /></div>
          <div>
            <span className="rc-kpi-label">Fully Allocated</span>
            <span className="rc-kpi-value">{kpis.full}</span>
          </div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><AlertTriangle size={16} /></div>
          <div>
            <span className="rc-kpi-label">Overallocated</span>
            <span className="rc-kpi-value" style={{ color: kpis.over > 0 ? "#dc2626" : "#0f172a" }}>{kpis.over}</span>
          </div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#fffbeb", color: "#d97706" }}><CalendarOff size={16} /></div>
          <div>
            <span className="rc-kpi-label">On Leave</span>
            <span className="rc-kpi-value">{kpis.onLeave}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rc-filter-bar">
        <div className="rc-search-wrap">
          <Search size={13} className="rc-search-icon" />
          <input
            type="text"
            className="rc-input rc-search-input"
            placeholder="Search by name, employee code, email, skill..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="rc-select"
          value={deptFilter}
          onChange={(e) => {
            setDeptFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">Department (All)</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>{d.name}</option>
          ))}
        </select>
        <select
          className="rc-select"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">Role (All)</option>
          {roleOptions.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
        <select
          className="rc-select"
          value={availFilter}
          onChange={(e) => {
            setAvailFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">Availability (All)</option>
          <option value="BENCH">On Bench (0%)</option>
          <option value="PARTIAL">Partially Allocated (1–79%)</option>
          <option value="FULL">Fully Allocated (80–100%)</option>
          <option value="OVER">Overallocated (&gt;100%)</option>
        </select>
        <select
          className="rc-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">Status (All)</option>
          <option value="ACTIVE">Active</option>
          <option value="BENCH">On Bench</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <div className="rc-seg">
          <button
            type="button"
            className={`rc-seg-btn ${viewMode === "table" ? "active" : ""}`}
            onClick={() => setViewMode("table")}
            title="Table View"
          >
            <List size={13} />
          </button>
          <button
            type="button"
            className={`rc-seg-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
            title="Card View"
          >
            <LayoutGrid size={13} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rc-alert rc-alert-critical">
          <AlertTriangle size={14} /> <span>{error}</span>
        </div>
      )}

      {/* Table or Card View */}
      {viewMode === "table" ? (
        <div className="rc-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role &amp; Department</th>
                  <th>Skills</th>
                  <th>Availability</th>
                  <th>Projects</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && enriched.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="rc-empty">Loading resources from database...</td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="rc-empty">
                      No resources match the current filters. Click <strong>Add Resource</strong> to add a team member.
                    </td>
                  </tr>
                ) : (
                  paginated.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <span className="rc-avatar" style={{ overflow: "hidden" }}>
                            {r.avatarUrl ? (
                              <img src={r.avatarUrl} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              getInitials(r.name)
                            )}
                          </span>
                          <div>
                            <Link
                              href={`/resources/${r.id}`}
                              style={{ fontWeight: 600, color: "#0f172a", textDecoration: "none" }}
                            >
                              {r.name}
                            </Link>
                            <div style={{ fontSize: 10.5, color: "#64748b" }}>
                              {r.employeeCode || "—"} {r.email ? `· ${r.email}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "#1e293b" }}>{r.designationName}</div>
                        <div style={{ fontSize: 10.5, color: "#64748b" }}>{r.departmentName}</div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 210 }}>
                          {r.primarySkill ? (
                            <span className="rc-skill-chip" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
                              {r.primarySkill}
                            </span>
                          ) : null}
                          {r.secondarySkills.slice(0, 2).map((sk) => (
                            <span key={sk} className="rc-skill-chip">{sk}</span>
                          ))}
                          {!r.primarySkill && r.secondarySkills.length === 0 && (
                            <span style={{ color: "#94a3b8", fontSize: 10.5 }}>Not specified</span>
                          )}
                        </div>
                      </td>
                      <td style={{ minWidth: 150 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginBottom: 3 }}>
                          <span style={{ fontWeight: 700, color: getBarColor(r.currentAllocationPercent) }}>
                            {r.availabilityPercent}% avail
                          </span>
                          <span style={{ color: "#64748b" }}>{r.currentAllocationPercent}% alloc</span>
                        </div>
                        <div className="rc-bar-track">
                          <div
                            className="rc-bar-fill"
                            style={{
                              width: `${Math.min(100, r.currentAllocationPercent)}%`,
                              background: getBarColor(r.currentAllocationPercent),
                            }}
                          />
                        </div>
                      </td>
                      <td>
                        {r.activeProjects.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontWeight: 600 }}>{r.activeProjects.length} Active</span>
                            <span style={{ fontSize: 10, color: "#64748b", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {r.activeProjects.map((p) => `${p.name} (${p.pct}%)`).join(", ")}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>0 Projects</span>
                        )}
                      </td>
                      <td>{getStatusBadge(r)}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <Link href={`/resources/${r.id}`} className="rc-btn rc-btn-outline rc-btn-sm">
                            Profile
                          </Link>
                          <button
                            type="button"
                            className="rc-btn rc-btn-primary rc-btn-sm"
                            onClick={() => router.push(`/resources/allocate?resourceId=${r.id}`)}
                          >
                            Allocate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", borderTop: "1px solid #f1f5f9", fontSize: 11, color: "#64748b" }}>
              <span>
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} resources
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  className="rc-btn rc-btn-outline rc-btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={12} /> Prev
                </button>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  className="rc-btn rc-btn-outline rc-btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rc-grid-3">
          {paginated.length === 0 ? (
            <div className="rc-card rc-empty" style={{ gridColumn: "1 / -1" }}>No resources found.</div>
          ) : (
            paginated.map((r) => (
              <div key={r.id} className="rc-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                    <span className="rc-avatar" style={{ overflow: "hidden" }}>
                      {r.avatarUrl ? (
                        <img src={r.avatarUrl} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        getInitials(r.name)
                      )}
                    </span>
                    <div>
                      <Link href={`/resources/${r.id}`} style={{ fontWeight: 700, color: "#0f172a", textDecoration: "none", fontSize: 12.5 }}>
                        {r.name}
                      </Link>
                      <div style={{ fontSize: 10.5, color: "#64748b" }}>{r.designationName} · {r.departmentName}</div>
                    </div>
                  </div>
                  {getStatusBadge(r)}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11, color: "#475569" }}>
                  {r.email && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Mail size={11} /> {r.email}</span>}
                  {r.location && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><MapPin size={11} /> {r.location} ({r.workMode})</span>}
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginBottom: 4 }}>
                    <span style={{ color: "#64748b" }}>Allocation</span>
                    <span style={{ fontWeight: 700, color: getBarColor(r.currentAllocationPercent) }}>{r.currentAllocationPercent}% ({r.availabilityPercent}% free)</span>
                  </div>
                  <div className="rc-bar-track">
                    <div className="rc-bar-fill" style={{ width: `${Math.min(100, r.currentAllocationPercent)}%`, background: getBarColor(r.currentAllocationPercent) }} />
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {r.primarySkill && <span className="rc-skill-chip" style={{ background: "#eff6ff", color: "#1d4ed8" }}>{r.primarySkill}</span>}
                  {r.secondarySkills.slice(0, 3).map((sk) => <span key={sk} className="rc-skill-chip">{sk}</span>)}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: "auto", paddingTop: 6, borderTop: "1px solid #f1f5f9" }}>
                  <Link href={`/resources/${r.id}`} className="rc-btn rc-btn-outline rc-btn-sm" style={{ flex: 1 }}>View Profile</Link>
                  <button
                    type="button"
                    className="rc-btn rc-btn-primary rc-btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => router.push(`/resources/allocate?resourceId=${r.id}`)}
                  >
                    Allocate
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
