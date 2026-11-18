"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Eye,
  Grid,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sliders,
  Trash2,
  Users,
  X,
} from "lucide-react";

import {
  createRole,
  deleteRole,
  getPermissionsList,
  getRolesList,
  updateRole,
} from "../../../lib/api";

import "./roles-rbac.css";

/* =========================================================
   TYPES & DISPLAY MAPS
   ========================================================= */

type PermissionDoc = {
  _id: string;
  id?: string;
  name: string;
  code: string;
  module: string;
  resource: string;
  action: string;
  scope?: string;
  description?: string | null;
};

type RoleDoc = {
  _id: string;
  id?: string;
  name: string;
  code: string;
  description?: string | null;
  scope: string;
  status: "ACTIVE" | "INACTIVE";
  isSystem?: boolean;
  hierarchyLevel?: number;
  permissions?: Array<PermissionDoc | string>;
  permissionsCount?: number;
  userCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

const MODULE_LABELS: Record<string, string> = {
  AUTH: "Authentication & Security",
  DASH: "Dashboard & Workbench",
  ORG: "Organization Management",
  RBAC: "Users & RBAC",
  EMP: "Employees & Skills",
  CLT: "Client Management",
  PRJ: "Project Management",
  BRD: "BRD & Requirements",
  REQ: "Requirements",
  MLS: "Milestone Management",
  SPR: "Sprint Management",
  TSK: "Tasks & Kanban",
  RES: "Resource Allocation",
  CAP: "Capacity & Workload",
  TIME: "Timesheets",
  TMS: "Timesheets",
  QA: "QA & Defect Engine",
  DOC: "Document Repository",
  APR: "Approval Center",
  NOT: "Notification Center",
  NTF: "Notification Center",
  INT: "Integration Hub",
  RPT: "Reports & Analytics",
  AUD: "Audit & Compliance",
  ADM: "System Administration",
  FIN: "Finance & Commercials",
  DEP: "Deployments & Releases",
  RSK: "Risks & Issues",
};

const SCOPE_DEFINITIONS = [
  {
    scope: "ALL",
    name: "Global Unrestricted Scope",
    desc: "Full visibility and administrative authority across every organization workspace, project, department, and financial record.",
    tone: "scope-all",
  },
  {
    scope: "ORGANIZATION",
    name: "Organization-Wide Scope",
    desc: "Executive, Finance, HR, and Compliance roles can oversee all departments, portfolios, and records within the tenant organization.",
    tone: "scope-org",
  },
  {
    scope: "DEPARTMENT",
    name: "Departmental Boundary",
    desc: "Department heads and managers can view and administer teams, resources, projects, and timesheets within their own department.",
    tone: "scope-dept",
  },
  {
    scope: "PROJECT",
    name: "Project Assignment Scope",
    desc: "Project Managers, QA, DevOps, and Delivery Leads access BRDs, sprints, tasks, and releases only for projects they are allocated to.",
    tone: "scope-project",
  },
  {
    scope: "TEAM",
    name: "Functional Team Scope",
    desc: "Team Leads manage sprint velocity, task assignments, and L1 timesheet approvals for members assigned under their team.",
    tone: "scope-team",
  },
  {
    scope: "CLIENT",
    name: "Client Portal Boundary",
    desc: "Clients and Sales / BDA users are isolated to their mapped client accounts, deliverables, milestones, UAT, and invoices.",
    tone: "scope-client",
  },
  {
    scope: "SELF",
    name: "Individual Self Scope",
    desc: "Contributors are restricted to tasks, bugs, and timesheets explicitly assigned to their own User or Employee ID.",
    tone: "scope-self",
  },
] as const;

function getModuleLabel(code: string) {
  const key = String(code || "").toUpperCase();
  return MODULE_LABELS[key] || key.replace(/_/g, " ");
}

function getScopeClass(scope: string) {
  switch (String(scope || "").toUpperCase()) {
    case "ALL":
      return "scope-all";
    case "ORGANIZATION":
      return "scope-org";
    case "DEPARTMENT":
      return "scope-dept";
    case "PROJECT":
      return "scope-project";
    case "TEAM":
      return "scope-team";
    case "CLIENT":
      return "scope-client";
    default:
      return "scope-self";
  }
}

function extractRolePermissionIds(role: RoleDoc): string[] {
  if (!Array.isArray(role.permissions)) return [];
  return role.permissions
    .map((p) => (typeof p === "string" ? p : String(p?._id || p?.id || "")))
    .filter(Boolean);
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* =========================================================
   MAIN PAGE COMPONENT
   ========================================================= */

export default function RolesManagementPage() {
  const [activeTab, setActiveTab] = useState<
    "registry" | "builder" | "matrix" | "scope"
  >("registry");

  const [roles, setRoles] = useState<RoleDoc[]>([]);
  const [catalog, setCatalog] = useState<PermissionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Notices & errors
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Registry filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "SYSTEM" | "CUSTOM">("ALL");
  const [scopeFilter, setScopeFilter] = useState<string>("ALL_SCOPES");

  // Detail & Delete modals
  const [detailRole, setDetailRole] = useState<RoleDoc | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleDoc | null>(null);

  // Role Builder state (Create + Edit mode!)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingIsSuperAdmin, setEditingIsSuperAdmin] = useState(false);
  const [builderName, setBuilderName] = useState("");
  const [builderCode, setBuilderCode] = useState("");
  const [builderDescription, setBuilderDescription] = useState("");
  const [builderScope, setBuilderScope] = useState("PROJECT");
  const [builderLevel, setBuilderLevel] = useState(6);
  const [builderStatus, setBuilderStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());
  const [permSearch, setPermSearch] = useState("");
  const [builderError, setBuilderError] = useState("");

  // Matrix tab state
  const [matrixModuleFilter, setMatrixModuleFilter] = useState("ALL");
  const [matrixTypeFilter, setMatrixTypeFilter] = useState<"ALL" | "SYSTEM" | "CUSTOM">("ALL");
  const [matrixSearch, setMatrixSearch] = useState("");
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [togglingCell, setTogglingCell] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [rolesRes, permsRes] = await Promise.all([
        getRolesList({ limit: 100 }),
        getPermissionsList({ limit: 500 }).catch(() => ({ items: [] })),
      ]);

      const fetchedRoles: RoleDoc[] = Array.isArray(rolesRes?.items)
        ? rolesRes.items
        : [];
      const fetchedPerms: PermissionDoc[] = Array.isArray(permsRes?.items)
        ? permsRes.items
        : [];

      setRoles(fetchedRoles);
      setCatalog(fetchedPerms);
    } catch (err: any) {
      setError(err?.message || "Failed to load roles and permissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAllData();
  }, [fetchAllData]);

  // Group permission catalog by module -> resource -> permissions[]
  const groupedCatalog = useMemo(() => {
    const map = new Map<
      string,
      {
        module: string;
        label: string;
        allIds: string[];
        resources: Map<string, PermissionDoc[]>;
      }
    >();

    for (const perm of catalog) {
      const mod = String(perm.module || "OTHER").toUpperCase();
      const res = String(perm.resource || "GENERAL").toUpperCase();
      const id = String(perm._id || perm.id || "");
      if (!id) continue;

      if (!map.has(mod)) {
        map.set(mod, {
          module: mod,
          label: getModuleLabel(mod),
          allIds: [],
          resources: new Map(),
        });
      }

      const modEntry = map.get(mod)!;
      modEntry.allIds.push(id);
      if (!modEntry.resources.has(res)) {
        modEntry.resources.set(res, []);
      }
      modEntry.resources.get(res)!.push(perm);
    }

    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [catalog]);

  // KPI metrics
  const kpis = useMemo(() => {
    const total = roles.length;
    const active = roles.filter((r) => r.status === "ACTIVE").length;
    const system = roles.filter((r) => r.isSystem).length;
    const custom = total - system;
    return {
      total,
      active,
      activePct: total ? ((active / total) * 100).toFixed(0) : "0",
      system,
      custom,
      catalogCount: catalog.length,
    };
  }, [roles, catalog]);

  // Filtered roles for Registry tab
  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roles.filter((r) => {
      const matchesSearch =
        !q ||
        r.name?.toLowerCase().includes(q) ||
        r.code?.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" || r.status === statusFilter;

      const matchesType =
        typeFilter === "ALL" ||
        (typeFilter === "SYSTEM" && Boolean(r.isSystem)) ||
        (typeFilter === "CUSTOM" && !r.isSystem);

      const matchesScope =
        scopeFilter === "ALL_SCOPES" || r.scope === scopeFilter;

      return matchesSearch && matchesStatus && matchesType && matchesScope;
    });
  }, [roles, search, statusFilter, typeFilter, scopeFilter]);

  // Filtered modules for Builder tab
  const filteredBuilderModules = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    if (!q) return groupedCatalog;

    return groupedCatalog.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.module.toLowerCase().includes(q) ||
        Array.from(m.resources.keys()).some((r) => r.toLowerCase().includes(q))
    );
  }, [groupedCatalog, permSearch]);

  // Matrix roles & modules
  const matrixRoles = useMemo(() => {
    return roles
      .filter((r) => {
        if (matrixTypeFilter === "SYSTEM" && !r.isSystem) return false;
        if (matrixTypeFilter === "CUSTOM" && r.isSystem) return false;
        return true;
      })
      .sort((a, b) => (b.hierarchyLevel || 6) - (a.hierarchyLevel || 6));
  }, [roles, matrixTypeFilter]);

  const matrixModules = useMemo(() => {
    const q = matrixSearch.trim().toLowerCase();
    return groupedCatalog.filter((m) => {
      if (matrixModuleFilter !== "ALL" && m.module !== matrixModuleFilter) {
        return false;
      }
      if (!q) return true;
      return (
        m.label.toLowerCase().includes(q) ||
        m.module.toLowerCase().includes(q)
      );
    });
  }, [groupedCatalog, matrixModuleFilter, matrixSearch]);

  // Role permission lookup Set per roleId
  const rolePermSetMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const r of roles) {
      map.set(String(r._id), new Set(extractRolePermissionIds(r)));
    }
    return map;
  }, [roles]);

  /* =========================================================
     BUILDER HELPERS
     ========================================================= */

  const resetBuilderToCreate = () => {
    setEditingRoleId(null);
    setEditingIsSuperAdmin(false);
    setBuilderName("");
    setBuilderCode("");
    setBuilderDescription("");
    setBuilderScope("PROJECT");
    setBuilderLevel(6);
    setBuilderStatus("ACTIVE");
    setSelectedPermIds(new Set());
    setPermSearch("");
    setBuilderError("");
    setActiveTab("builder");
  };

  const openRoleInEditor = (role: RoleDoc) => {
    setEditingRoleId(String(role._id));
    setEditingIsSuperAdmin(role.code === "SUPER_ADMIN");
    setBuilderName(role.name || "");
    setBuilderCode(role.code || "");
    setBuilderDescription(role.description || "");
    setBuilderScope(role.scope || "PROJECT");
    setBuilderLevel(role.hierarchyLevel || 6);
    setBuilderStatus(role.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
    setSelectedPermIds(new Set(extractRolePermissionIds(role)));
    setPermSearch("");
    setBuilderError("");
    setDetailRole(null);
    setActiveTab("builder");
  };

  const openRoleClone = (role: RoleDoc) => {
    setEditingRoleId(null);
    setEditingIsSuperAdmin(false);
    setBuilderName(`${role.name} (Copy)`);
    setBuilderCode(`${role.code}_COPY`);
    setBuilderDescription(role.description || "");
    setBuilderScope(role.scope || "PROJECT");
    setBuilderLevel(role.hierarchyLevel || 6);
    setBuilderStatus("ACTIVE");
    setSelectedPermIds(new Set(extractRolePermissionIds(role)));
    setPermSearch("");
    setBuilderError("");
    setDetailRole(null);
    setActiveTab("builder");
  };

  const togglePermId = (id: string) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleModuleAll = (allIds: string[]) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      const everySelected = allIds.every((id) => next.has(id));
      if (everySelected) {
        allIds.forEach((id) => next.delete(id));
      } else {
        allIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setBuilderError("");

    const cleanName = builderName.trim();
    const cleanCode = builderCode.trim().toUpperCase().replace(/\s+/g, "_");

    if (!cleanName) {
      setBuilderError("Role Name is required.");
      return;
    }
    if (!cleanCode) {
      setBuilderError("Role Code is required.");
      return;
    }

    const payload = {
      name: cleanName,
      code: cleanCode,
      description: builderDescription.trim() || null,
      scope: builderScope,
      hierarchyLevel: Number(builderLevel) || 6,
      status: builderStatus,
      permissions: Array.from(selectedPermIds),
    };

    setSaving(true);
    try {
      if (editingRoleId) {
        await updateRole(editingRoleId, payload);
        setNotice(`Role "${cleanName}" updated successfully.`);
      } else {
        await createRole(payload);
        setNotice(`Custom role "${cleanName}" created successfully.`);
      }

      setEditingRoleId(null);
      setEditingIsSuperAdmin(false);
      setActiveTab("registry");
      await fetchAllData();
    } catch (err: any) {
      setBuilderError(err?.message || "Unable to save role definition.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || saving) return;
    setSaving(true);
    setError("");

    try {
      await deleteRole(String(deleteTarget._id));
      setNotice(`Role "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      setDetailRole(null);
      await fetchAllData();
    } catch (err: any) {
      setError(err?.message || "Unable to delete role.");
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  // Interactive Matrix cell toggle (updates single permission on role via PATCH)
  const handleToggleMatrixPermission = async (
    role: RoleDoc,
    permId: string
  ) => {
    const cellKey = `${role._id}:${permId}`;
    if (togglingCell) return;

    const currentIds = new Set(extractRolePermissionIds(role));
    if (currentIds.has(permId)) {
      currentIds.delete(permId);
    } else {
      currentIds.add(permId);
    }

    setTogglingCell(cellKey);
    setError("");
    try {
      const updated = await updateRole(String(role._id), {
        permissions: Array.from(currentIds),
      });

      setRoles((prev) =>
        prev.map((r) => (String(r._id) === String(role._id) ? updated : r))
      );
      setNotice(`Updated permissions for ${role.name}.`);
    } catch (err: any) {
      setError(err?.message || "Failed to update role permission.");
    } finally {
      setTogglingCell(null);
    }
  };

  const handleExportRolesCsv = () => {
    const header = [
      "Role Name",
      "Code",
      "Type",
      "Scope",
      "Hierarchy Level",
      "Users",
      "Permissions",
      "Status",
      "Description",
    ];
    const rows = filteredRoles.map((r) => [
      r.name,
      r.code,
      r.isSystem ? "System" : "Custom",
      r.scope,
      String(r.hierarchyLevel || 6),
      String(r.userCount || 0),
      String(r.permissionsCount ?? extractRolePermissionIds(r).length),
      r.status,
      r.description || "",
    ]);
    downloadCsv("ph-pms-roles.csv", [header, ...rows]);
    setNotice(`Exported ${filteredRoles.length} roles to CSV.`);
  };

  const handleExportMatrixCsv = () => {
    const header = ["Module", "Permission Code", ...matrixRoles.map((r) => r.code)];
    const rows: string[][] = [];
    for (const mod of matrixModules) {
      for (const perms of mod.resources.values()) {
        for (const p of perms) {
          const pId = String(p._id);
          rows.push([
            mod.label,
            p.code,
            ...matrixRoles.map((r) =>
              rolePermSetMap.get(String(r._id))?.has(pId) ? "ALLOW" : "DENY"
            ),
          ]);
        }
      }
    }
    downloadCsv("ph-pms-permission-matrix.csv", [header, ...rows]);
    setNotice("Permission Matrix exported to CSV.");
  };

  // Module breakdown for Role Details modal
  const detailModuleSummary = useMemo(() => {
    if (!detailRole) return [];
    const granted = new Set(extractRolePermissionIds(detailRole));
    return groupedCatalog
      .map((m) => ({
        module: m.module,
        label: m.label,
        granted: m.allIds.filter((id) => granted.has(id)).length,
        total: m.allIds.length,
      }))
      .filter((x) => x.granted > 0);
  }, [detailRole, groupedCatalog]);

  return (
    <section className="rm-page">
      {/* BREADCRUMB */}
      <div className="rm-breadcrumb">
        <span className="rm-badge-code">RBAC-003–007</span>
        <Link href="/users">Users &amp; Team</Link>
        <span>/</span>
        <span>Roles, Permissions &amp; Security Matrix</span>
      </div>

      {/* HEADER */}
      <header className="rm-header">
        <div>
          <h1>Roles, Permissions &amp; Security Matrix</h1>
          <p>
            Manage system &amp; custom roles, granular permission grants, comparative
            access matrix, and data scope boundaries.
          </p>
        </div>

        <div className="rm-header-actions">
          <button
            type="button"
            className="rm-btn"
            onClick={() => void fetchAllData()}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            className="rm-btn"
            onClick={
              activeTab === "matrix"
                ? handleExportMatrixCsv
                : handleExportRolesCsv
            }
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            className="rm-btn rm-btn-primary"
            onClick={resetBuilderToCreate}
          >
            <Plus size={15} />
            <span>Create Custom Role</span>
          </button>
        </div>
      </header>

      {/* BANNERS */}
      {notice && (
        <div className="rm-banner rm-banner-success" role="status">
          <div className="rm-banner-left">
            <CheckCircle2 size={16} />
            <span>{notice}</span>
          </div>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice("")}>
            <X size={15} />
          </button>
        </div>
      )}

      {error && (
        <div className="rm-banner rm-banner-error" role="alert">
          <div className="rm-banner-left">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button type="button" aria-label="Dismiss" onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* KPI STRIP */}
      <div className="rm-kpi-grid">
        <div className="rm-kpi-card">
          <div className="rm-kpi-icon blue">
            <Shield size={19} />
          </div>
          <div className="rm-kpi-body">
            <span>Total Roles</span>
            <div className="rm-kpi-row">
              <strong>{kpis.total}</strong>
              <small style={{ color: "#1d4ed8" }}>Live DB</small>
            </div>
          </div>
        </div>

        <div className="rm-kpi-card">
          <div className="rm-kpi-icon green">
            <CheckCircle2 size={19} />
          </div>
          <div className="rm-kpi-body">
            <span>Active Roles</span>
            <div className="rm-kpi-row">
              <strong>{kpis.active}</strong>
              <small>{kpis.activePct}%</small>
            </div>
          </div>
        </div>

        <div className="rm-kpi-card">
          <div className="rm-kpi-icon purple">
            <ShieldCheck size={19} />
          </div>
          <div className="rm-kpi-body">
            <span>System Roles</span>
            <div className="rm-kpi-row">
              <strong>{kpis.system}</strong>
              <small style={{ color: "#7c3aed" }}>Built-in</small>
            </div>
          </div>
        </div>

        <div className="rm-kpi-card">
          <div className="rm-kpi-icon amber">
            <Sliders size={19} />
          </div>
          <div className="rm-kpi-body">
            <span>Custom Roles</span>
            <div className="rm-kpi-row">
              <strong>{kpis.custom}</strong>
              <small style={{ color: "#d97706" }}>Tenant</small>
            </div>
          </div>
        </div>

        <div
          className="rm-kpi-card is-clickable"
          role="button"
          tabIndex={0}
          onClick={() => setActiveTab("matrix")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setActiveTab("matrix");
          }}
        >
          <div className="rm-kpi-icon slate">
            <Lock size={19} />
          </div>
          <div className="rm-kpi-body">
            <span>Permissions Catalog</span>
            <div className="rm-kpi-row">
              <strong>{kpis.catalogCount}</strong>
              <small style={{ color: "#1d4ed8" }}>Matrix →</small>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <nav className="rm-tabs" aria-label="RBAC sections">
        <button
          type="button"
          className={`rm-tab ${activeTab === "registry" ? "active" : ""}`}
          onClick={() => setActiveTab("registry")}
        >
          <Shield size={15} />
          <span>Role Registry (RBAC-003)</span>
          <span className="rm-tab-pill">{roles.length}</span>
        </button>

        <button
          type="button"
          className={`rm-tab ${activeTab === "builder" ? "active" : ""}`}
          onClick={() => setActiveTab("builder")}
        >
          <Sliders size={15} />
          <span>
            {editingRoleId
              ? "Edit Role (RBAC-004)"
              : "Role Builder (RBAC-004)"}
          </span>
        </button>

        <button
          type="button"
          className={`rm-tab ${activeTab === "matrix" ? "active" : ""}`}
          onClick={() => setActiveTab("matrix")}
        >
          <Grid size={15} />
          <span>Permission Matrix (RBAC-005)</span>
        </button>

        <button
          type="button"
          className={`rm-tab ${activeTab === "scope" ? "active" : ""}`}
          onClick={() => setActiveTab("scope")}
        >
          <KeyRound size={15} />
          <span>Data Scope Policy (RBAC-007)</span>
        </button>
      </nav>

      {/* =========================================================
          TAB 1: ROLE REGISTRY (RBAC-003)
         ========================================================= */}
      {activeTab === "registry" && (
        <div className="rm-card">
          <div className="rm-toolbar">
            <div className="rm-search-wrap">
              <Search size={15} />
              <input
                type="text"
                className="rm-input"
                placeholder="Search role name, code, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="rm-select rm-select-inline"
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">Status: All</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <select
              className="rm-select rm-select-inline"
              aria-label="Filter by role type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
            >
              <option value="ALL">Type: All</option>
              <option value="SYSTEM">System Built-in</option>
              <option value="CUSTOM">Custom Tenant</option>
            </select>

            <select
              className="rm-select rm-select-inline"
              aria-label="Filter by data scope"
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
            >
              <option value="ALL_SCOPES">Scope: All</option>
              {SCOPE_DEFINITIONS.map((s) => (
                <option key={s.scope} value={s.scope}>
                  {s.scope}
                </option>
              ))}
            </select>

            <div className="rm-toolbar-spacer" />

            <span className="rm-count-chip">
              {filteredRoles.length} of {roles.length} Roles
            </span>
          </div>

          <div className="rm-table-wrap">
            <table className="rm-table">
              <thead>
                <tr>
                  <th>Role Name &amp; Code</th>
                  <th>Level</th>
                  <th>Data Scope</th>
                  <th>Users</th>
                  <th>Permissions</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="rm-empty">
                      Loading roles from backend...
                    </td>
                  </tr>
                ) : filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="rm-empty">
                      No roles match your current filters.
                    </td>
                  </tr>
                ) : (
                  filteredRoles.map((role) => {
                    const permCount =
                      role.permissionsCount ??
                      extractRolePermissionIds(role).length;

                    return (
                      <tr key={role._id}>
                        <td>
                          <div className="rm-role-name">{role.name}</div>
                          <span className="rm-role-code">{role.code}</span>
                          {role.description && (
                            <div className="rm-role-desc">{role.description}</div>
                          )}
                        </td>
                        <td>
                          <span className="rm-level-badge">
                            L{role.hierarchyLevel || 6}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`rm-pill ${getScopeClass(role.scope)}`}
                          >
                            {role.scope || "ORGANIZATION"}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              fontWeight: 600,
                            }}
                          >
                            <Users size={13} color="#64748b" />
                            {role.userCount ?? 0}
                          </span>
                        </td>
                        <td>
                          <strong>{permCount}</strong>{" "}
                          <span style={{ color: "#64748b", fontSize: 12 }}>
                            grants
                          </span>
                        </td>
                        <td>
                          <span
                            className={`rm-pill ${
                              role.isSystem ? "type-system" : "type-custom"
                            }`}
                          >
                            {role.isSystem ? "System" : "Custom"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`rm-pill ${
                              role.status === "ACTIVE"
                                ? "status-active"
                                : "status-inactive"
                            }`}
                          >
                            {role.status === "ACTIVE" ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className="rm-row-actions">
                            <button
                              type="button"
                              className="rm-icon-btn"
                              title="View Role Details"
                              aria-label={`View ${role.name}`}
                              onClick={() => setDetailRole(role)}
                            >
                              <Eye size={14} />
                            </button>

                            <button
                              type="button"
                              className="rm-icon-btn"
                              title="Edit Role & Permissions"
                              aria-label={`Edit ${role.name}`}
                              onClick={() => openRoleInEditor(role)}
                            >
                              <Pencil size={14} />
                            </button>

                            <button
                              type="button"
                              className="rm-icon-btn"
                              title="Clone Role"
                              aria-label={`Clone ${role.name}`}
                              onClick={() => openRoleClone(role)}
                            >
                              <Copy size={14} />
                            </button>

                            <button
                              type="button"
                              className="rm-icon-btn danger"
                              title={
                                role.isSystem
                                  ? "System roles cannot be deleted"
                                  : "Delete Custom Role"
                              }
                              aria-label={`Delete ${role.name}`}
                              disabled={Boolean(role.isSystem)}
                              onClick={() => setDeleteTarget(role)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: ROLE BUILDER — CREATE & EDIT (RBAC-004)
         ========================================================= */}
      {activeTab === "builder" && (
        <div className="rm-card rm-card-pad">
          <div className="rm-builder-head">
            <div>
              <h2>
                {editingRoleId
                  ? `Edit Role: ${builderName || builderCode}`
                  : "Create Custom Role"}
              </h2>
              <p>
                {editingRoleId
                  ? "Update role metadata, data boundary scope, and real database permission grants."
                  : "Define a new organization role and assign granular module permissions from the live catalog."}
              </p>
            </div>

            {editingRoleId && (
              <button
                type="button"
                className="rm-btn rm-btn-sm"
                onClick={resetBuilderToCreate}
              >
                <Plus size={13} />
                <span>Switch to New Role</span>
              </button>
            )}
          </div>

          {builderError && (
            <div className="rm-banner rm-banner-error" role="alert">
              <div className="rm-banner-left">
                <AlertCircle size={16} />
                <span>{builderError}</span>
              </div>
              <button type="button" onClick={() => setBuilderError("")}>
                <X size={15} />
              </button>
            </div>
          )}

          <form onSubmit={handleSaveRole}>
            <div className="rm-form-grid">
              <div className="rm-field">
                <label htmlFor="rm-role-name">
                  Role Name <em>*</em>
                </label>
                <input
                  id="rm-role-name"
                  type="text"
                  className="rm-input"
                  placeholder="e.g. Delivery Coordinator"
                  maxLength={100}
                  value={builderName}
                  onChange={(e) => {
                    setBuilderName(e.target.value);
                    setBuilderError("");
                  }}
                />
              </div>

              <div className="rm-field">
                <label htmlFor="rm-role-code">
                  Role Code <em>*</em>
                </label>
                <input
                  id="rm-role-code"
                  type="text"
                  className="rm-input"
                  placeholder="e.g. DELIVERY_COORDINATOR"
                  maxLength={80}
                  disabled={editingIsSuperAdmin}
                  value={builderCode}
                  onChange={(e) => {
                    setBuilderCode(
                      e.target.value.toUpperCase().replace(/\s+/g, "_")
                    );
                    setBuilderError("");
                  }}
                />
              </div>

              <div className="rm-field">
                <label htmlFor="rm-role-scope">Data Boundary Scope</label>
                <select
                  id="rm-role-scope"
                  className="rm-select"
                  value={builderScope}
                  onChange={(e) => setBuilderScope(e.target.value)}
                >
                  {SCOPE_DEFINITIONS.map((s) => (
                    <option key={s.scope} value={s.scope}>
                      {s.scope} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rm-field">
                <label htmlFor="rm-role-level">Hierarchy Level (1–15)</label>
                <input
                  id="rm-role-level"
                  type="number"
                  min={1}
                  max={15}
                  className="rm-input"
                  value={builderLevel}
                  onChange={(e) => setBuilderLevel(Number(e.target.value))}
                />
              </div>

              <div className="rm-field">
                <label htmlFor="rm-role-status">Status</label>
                <select
                  id="rm-role-status"
                  className="rm-select"
                  disabled={editingIsSuperAdmin}
                  value={builderStatus}
                  onChange={(e) =>
                    setBuilderStatus(e.target.value as "ACTIVE" | "INACTIVE")
                  }
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div className="rm-field">
                <label htmlFor="rm-role-desc">Role Description</label>
                <input
                  id="rm-role-desc"
                  type="text"
                  className="rm-input"
                  placeholder="Describe responsibilities and governance..."
                  maxLength={500}
                  value={builderDescription}
                  onChange={(e) => setBuilderDescription(e.target.value)}
                />
              </div>
            </div>

            {/* LIVE PERMISSION CATALOG */}
            <div className="rm-perm-toolbar">
              <div>
                <h3>
                  Granular Module Permissions ({selectedPermIds.size} /{" "}
                  {catalog.length} selected)
                </h3>
              </div>

              <div className="rm-perm-toolbar-right">
                <div className="rm-search-wrap" style={{ minWidth: 200 }}>
                  <Search size={14} />
                  <input
                    type="text"
                    className="rm-input"
                    placeholder="Filter modules or resources..."
                    value={permSearch}
                    onChange={(e) => setPermSearch(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="rm-btn rm-btn-sm"
                  onClick={() =>
                    setSelectedPermIds(
                      new Set(catalog.map((p) => String(p._id)))
                    )
                  }
                >
                  Select All
                </button>

                <button
                  type="button"
                  className="rm-btn rm-btn-sm"
                  onClick={() => setSelectedPermIds(new Set())}
                >
                  Clear All
                </button>
              </div>
            </div>

            {catalog.length === 0 ? (
              <div className="rm-empty">
                No permission catalog items loaded. Click Sync to reload.
              </div>
            ) : (
              <div className="rm-module-list">
                {filteredBuilderModules.map((mod) => {
                  const selectedInMod = mod.allIds.filter((id) =>
                    selectedPermIds.has(id)
                  ).length;
                  const allChecked =
                    mod.allIds.length > 0 &&
                    selectedInMod === mod.allIds.length;

                  return (
                    <div key={mod.module} className="rm-module-card">
                      <div className="rm-module-head">
                        <div className="rm-module-title">
                          <span className="rm-module-code">{mod.module}</span>
                          <strong>{mod.label}</strong>
                          <span className="rm-module-count">
                            {selectedInMod} / {mod.allIds.length} granted
                          </span>
                        </div>

                        <button
                          type="button"
                          className="rm-btn rm-btn-sm"
                          onClick={() => toggleModuleAll(mod.allIds)}
                        >
                          {allChecked ? "Unselect Module" : "Select All Module"}
                        </button>
                      </div>

                      <div className="rm-module-body">
                        {Array.from(mod.resources.entries()).map(
                          ([resource, perms]) => (
                            <div key={resource} className="rm-resource-row">
                              <span className="rm-resource-name">
                                {resource.replace(/_/g, " ")}
                              </span>

                              <div className="rm-action-chips">
                                {perms.map((perm) => {
                                  const id = String(perm._id);
                                  const checked = selectedPermIds.has(id);
                                  return (
                                    <button
                                      type="button"
                                      key={id}
                                      className={`rm-action-chip ${
                                        checked ? "is-checked" : ""
                                      }`}
                                      title={`${perm.name} (${perm.code})`}
                                      onClick={() => togglePermId(id)}
                                    >
                                      {checked && <Check size={11} />}
                                      <span>{perm.action}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="rm-builder-footer">
              <span style={{ fontSize: 12.5, color: "#64748b" }}>
                Total selected permissions:{" "}
                <strong style={{ color: "#0f172a" }}>
                  {selectedPermIds.size}
                </strong>
              </span>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="rm-btn"
                  onClick={() => {
                    setEditingRoleId(null);
                    setActiveTab("registry");
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rm-btn rm-btn-primary"
                  disabled={saving}
                >
                  <Check size={15} />
                  <span>
                    {saving
                      ? "Saving..."
                      : editingRoleId
                      ? "Save Role Changes"
                      : "Create Role"}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================
          TAB 3: LIVE PERMISSION MATRIX GRID (RBAC-005)
         ========================================================= */}
      {activeTab === "matrix" && (
        <>
          <div className="rm-card">
            <div className="rm-toolbar">
              <div className="rm-search-wrap">
                <Search size={15} />
                <input
                  type="text"
                  className="rm-input"
                  placeholder="Search module..."
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                />
              </div>

              <select
                className="rm-select rm-select-inline"
                aria-label="Filter module"
                value={matrixModuleFilter}
                onChange={(e) => setMatrixModuleFilter(e.target.value)}
              >
                <option value="ALL">All Modules ({groupedCatalog.length})</option>
                {groupedCatalog.map((m) => (
                  <option key={m.module} value={m.module}>
                    {m.label} ({m.module})
                  </option>
                ))}
              </select>

              <select
                className="rm-select rm-select-inline"
                aria-label="Filter role type"
                value={matrixTypeFilter}
                onChange={(e) => setMatrixTypeFilter(e.target.value as any)}
              >
                <option value="ALL">All Roles ({roles.length})</option>
                <option value="SYSTEM">System Roles</option>
                <option value="CUSTOM">Custom Roles</option>
              </select>

              <div className="rm-toolbar-spacer" />

              <div className="rm-matrix-legend">
                <span className="rm-legend-item">
                  <span className="rm-matrix-badge full">✓ Full</span>
                </span>
                <span className="rm-legend-item">
                  <span className="rm-matrix-badge partial">◐ Partial</span>
                </span>
                <span className="rm-legend-item">
                  <span className="rm-matrix-badge none">— None</span>
                </span>
              </div>
            </div>

            <div className="rm-table-wrap">
              <table className="rm-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 220 }}>Workspace Module</th>
                    {matrixRoles.map((r) => (
                      <th key={r._id} style={{ textAlign: "center" }}>
                        <div>{r.code}</div>
                        <small
                          style={{
                            fontWeight: 500,
                            textTransform: "none",
                            color: "#94a3b8",
                          }}
                        >
                          {r.isSystem ? "System" : "Custom"}
                        </small>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixModules.length === 0 ? (
                    <tr>
                      <td colSpan={matrixRoles.length + 1} className="rm-empty">
                        No modules match your filter.
                      </td>
                    </tr>
                  ) : (
                    matrixModules.map((mod) => {
                      const isExpanded = expandedModule === mod.module;
                      return (
                        <tr key={mod.module}>
                          <td>
                            <button
                              type="button"
                              className="rm-matrix-row-btn"
                              onClick={() =>
                                setExpandedModule(
                                  isExpanded ? null : mod.module
                                )
                              }
                            >
                              {isExpanded ? (
                                <ChevronDown size={15} color="#1d4ed8" />
                              ) : (
                                <ChevronRight size={15} color="#94a3b8" />
                              )}
                              <span>{mod.label}</span>
                              <span className="rm-module-code">
                                {mod.allIds.length}
                              </span>
                            </button>
                          </td>

                          {matrixRoles.map((r) => {
                            const pSet =
                              rolePermSetMap.get(String(r._id)) || new Set();
                            const count = mod.allIds.filter((id) =>
                              pSet.has(id)
                            ).length;
                            const total = mod.allIds.length;
                            const state =
                              count === total && total > 0
                                ? "full"
                                : count > 0
                                ? "partial"
                                : "none";

                            return (
                              <td key={r._id} className="rm-matrix-cell">
                                <span className={`rm-matrix-badge ${state}`}>
                                  {state === "full"
                                    ? `✓ ${count}/${total}`
                                    : state === "partial"
                                    ? `◐ ${count}/${total}`
                                    : "—"}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* EXPANDED MODULE ACTION DETAIL (LIVE INTERACTIVE TOGGLE!) */}
          {expandedModule &&
            (() => {
              const activeMod = groupedCatalog.find(
                (m) => m.module === expandedModule
              );
              if (!activeMod) return null;

              const allModulePerms = Array.from(
                activeMod.resources.values()
              ).flat();

              return (
                <div className="rm-matrix-detail">
                  <div className="rm-matrix-detail-head">
                    <div>
                      <h3>
                        Module Action Detail — {activeMod.label} (
                        {activeMod.module})
                      </h3>
                      <span>
                        Click any cell below to toggle Allow / Deny directly in
                        the database.
                      </span>
                    </div>

                    <button
                      type="button"
                      className="rm-btn rm-btn-sm"
                      onClick={() => setExpandedModule(null)}
                    >
                      <X size={13} />
                      <span>Close Detail</span>
                    </button>
                  </div>

                  <div className="rm-table-wrap">
                    <table className="rm-table">
                      <thead>
                        <tr>
                          <th style={{ minWidth: 240 }}>Permission Action</th>
                          {matrixRoles.map((r) => (
                            <th key={r._id} style={{ textAlign: "center" }}>
                              {r.code}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allModulePerms.map((perm) => {
                          const pId = String(perm._id);
                          return (
                            <tr key={pId}>
                              <td>
                                <div style={{ fontWeight: 600 }}>
                                  {perm.name}
                                </div>
                                <small className="rm-role-code">
                                  {perm.code}
                                </small>
                              </td>

                              {matrixRoles.map((r) => {
                                const allowed =
                                  rolePermSetMap
                                    .get(String(r._id))
                                    ?.has(pId) || false;
                                const cellKey = `${r._id}:${pId}`;
                                const busy = togglingCell === cellKey;

                                return (
                                  <td key={r._id} className="rm-matrix-cell">
                                    <button
                                      type="button"
                                      className={`rm-matrix-toggle-btn ${
                                        allowed ? "allowed" : "denied"
                                      }`}
                                      disabled={Boolean(togglingCell)}
                                      title={`${r.name}: ${
                                        allowed ? "Allowed" : "Not granted"
                                      } — click to toggle`}
                                      onClick={() =>
                                        void handleToggleMatrixPermission(r, pId)
                                      }
                                    >
                                      {busy ? (
                                        <RefreshCw
                                          size={12}
                                          className="animate-spin"
                                        />
                                      ) : allowed ? (
                                        <Check size={14} strokeWidth={2.8} />
                                      ) : (
                                        <X size={13} />
                                      )}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
        </>
      )}

      {/* =========================================================
          TAB 4: DATA SCOPE POLICY (RBAC-007)
         ========================================================= */}
      {activeTab === "scope" && (
        <div className="rm-card rm-card-pad">
          <div className="rm-builder-head">
            <div>
              <h2>Data Boundary Scope Enforcement (RBAC-007)</h2>
              <p>
                Live mapping of every role to its data visibility boundary.
                Click any role chip to edit its scope or permissions.
              </p>
            </div>
          </div>

          <div className="rm-scope-list">
            {SCOPE_DEFINITIONS.map((def) => {
              const assignedRoles = roles.filter(
                (r) => String(r.scope || "").toUpperCase() === def.scope
              );

              return (
                <div key={def.scope} className="rm-scope-card">
                  <div className="rm-scope-top">
                    <div>
                      <div className="rm-scope-title">
                        <span className={`rm-pill ${def.tone}`}>
                          {def.scope}
                        </span>
                        <span>{def.name}</span>
                      </div>
                      <p className="rm-scope-desc">{def.desc}</p>
                    </div>

                    <span className="rm-count-chip">
                      {assignedRoles.length} Role
                      {assignedRoles.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="rm-scope-roles">
                    {assignedRoles.length === 0 ? (
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>
                        No roles currently assigned to this scope.
                      </span>
                    ) : (
                      assignedRoles.map((r) => (
                        <button
                          type="button"
                          key={r._id}
                          className="rm-scope-role-chip"
                          onClick={() => openRoleInEditor(r)}
                          title={`Click to edit ${r.name}`}
                        >
                          <span>{r.name}</span>
                          <small style={{ opacity: 0.75 }}>({r.code})</small>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: ROLE DETAILS (RBAC-003)
         ========================================================= */}
      {detailRole && (
        <div
          className="rm-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDetailRole(null);
          }}
        >
          <div className="rm-modal" role="dialog" aria-modal="true">
            <div className="rm-modal-head">
              <div>
                <h3>{detailRole.name}</h3>
                <p>
                  Code: <strong>{detailRole.code}</strong> ·{" "}
                  {detailRole.isSystem ? "System Role" : "Custom Role"}
                </p>
              </div>
              <button
                type="button"
                className="rm-icon-btn"
                aria-label="Close"
                onClick={() => setDetailRole(null)}
              >
                <X size={15} />
              </button>
            </div>

            <div className="rm-modal-body">
              <div className="rm-detail-grid">
                <div className="rm-detail-item">
                  <span>Status</span>
                  <strong>{detailRole.status}</strong>
                </div>
                <div className="rm-detail-item">
                  <span>Data Scope</span>
                  <strong>{detailRole.scope}</strong>
                </div>
                <div className="rm-detail-item">
                  <span>Assigned Users</span>
                  <strong>{detailRole.userCount ?? 0}</strong>
                </div>
                <div className="rm-detail-item">
                  <span>Permissions Granted</span>
                  <strong>
                    {detailRole.permissionsCount ??
                      extractRolePermissionIds(detailRole).length}{" "}
                    / {catalog.length}
                  </strong>
                </div>
                <div className="rm-detail-item">
                  <span>Hierarchy Level</span>
                  <strong>Level {detailRole.hierarchyLevel || 6}</strong>
                </div>
                <div className="rm-detail-item">
                  <span>Last Updated</span>
                  <strong>{formatDate(detailRole.updatedAt || detailRole.createdAt)}</strong>
                </div>
              </div>

              {detailRole.description && (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#334155",
                      marginBottom: 4,
                    }}
                  >
                    Description
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
                    {detailRole.description}
                  </p>
                </div>
              )}

              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#334155",
                    marginBottom: 8,
                  }}
                >
                  Granted Modules Breakdown
                </div>

                {detailModuleSummary.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 12.5, color: "#64748b" }}>
                    No catalog permissions explicitly linked to this role yet.
                    Click &quot;Edit Role &amp; Grants&quot; to assign permissions.
                  </p>
                ) : (
                  <div className="rm-mod-summary-grid">
                    {detailModuleSummary.map((item) => (
                      <span
                        key={item.module}
                        className="rm-mod-summary-pill"
                      >
                        {item.label} ({item.granted}/{item.total})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rm-modal-foot">
              {!detailRole.isSystem && (
                <button
                  type="button"
                  className="rm-btn rm-btn-danger"
                  style={{ marginRight: "auto" }}
                  onClick={() => setDeleteTarget(detailRole)}
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              )}

              <button
                type="button"
                className="rm-btn"
                onClick={() => openRoleClone(detailRole)}
              >
                <Copy size={14} />
                <span>Clone</span>
              </button>

              <button
                type="button"
                className="rm-btn rm-btn-primary"
                onClick={() => openRoleInEditor(detailRole)}
              >
                <Pencil size={14} />
                <span>Edit Role &amp; Grants</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: DELETE CONFIRMATION
         ========================================================= */}
      {deleteTarget && (
        <div
          className="rm-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null);
          }}
        >
          <div className="rm-modal rm-modal-sm" role="dialog" aria-modal="true">
            <div className="rm-modal-head">
              <div>
                <h3>Delete Role</h3>
                <p>This action permanently removes the custom role.</p>
              </div>
              <button
                type="button"
                className="rm-icon-btn"
                aria-label="Close"
                onClick={() => setDeleteTarget(null)}
              >
                <X size={15} />
              </button>
            </div>

            <div className="rm-modal-body">
              <p style={{ margin: 0, fontSize: 13.5, color: "#334155", lineHeight: 1.5 }}>
                Are you sure you want to delete{" "}
                <strong>{deleteTarget.name}</strong> (<code>{deleteTarget.code}</code>)?
              </p>
            </div>

            <div className="rm-modal-foot">
              <button
                type="button"
                className="rm-btn"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rm-btn rm-btn-danger"
                disabled={saving}
                onClick={() => void handleConfirmDelete()}
              >
                <Trash2 size={14} />
                <span>{saving ? "Deleting..." : "Delete Role"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
