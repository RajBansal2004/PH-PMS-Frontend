"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Bug,
  Plus,
  Search,
  RefreshCw,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Copy,
  ShieldAlert,
  Clock,
  Activity,
} from "lucide-react";
import {
  bugApi,
  qaLookupApi,
  BugItem,
  BUG_LIFECYCLE_STATUSES,
  formatShortDate,
  formatBugStatus,
  severityBadgeClass,
  statusBadgeClass,
} from "@/lib/qa/api";
import "@/components/qa/qa.css";

const BUG_STATUS_TABS = [
  { key: "ALL", label: "All Bugs" },
  { key: "NEW", label: "New" },
  { key: "TRIAGED", label: "Triaged" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "FIXED", label: "Fixed" },
  { key: "READY_FOR_RETEST", label: "Ready for Retest" },
  { key: "RETEST", label: "Retest" },
  { key: "CLOSED", label: "Closed" },
  { key: "REOPENED", label: "Reopened" },
] as const;

export default function BugRegistryPage() {
  const [bugs, setBugs] = useState<BugItem[]>([]);
  const [projects, setProjects] = useState<{ _id: string; projectName: string }[]>([]);
  const [employees, setEmployees] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Filters
  const [statusTab, setStatusTab] = useState<string>("ALL");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");
  const [moduleFilter, setModuleFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>("TRIAGED");
  const [bulkBusy, setBulkBusy] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bugList, projList, empList] = await Promise.all([
        bugApi.list({
          status: statusTab !== "ALL" ? statusTab : undefined,
          projectId: projectFilter !== "ALL" ? projectFilter : undefined,
          severity: severityFilter !== "ALL" ? severityFilter : undefined,
          assigneeId: assigneeFilter !== "ALL" ? assigneeFilter : undefined,
        }),
        qaLookupApi.projects().catch(() => []),
        qaLookupApi.employees().catch(() => []),
      ]);
      setBugs(bugList);
      setProjects(projList);
      setEmployees(empList);
      setSelectedIds([]);
    } catch (e: any) {
      setError(e?.message || "Failed to load bug registry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusTab, projectFilter, severityFilter, assigneeFilter]);

  const modules = useMemo(() => {
    const set = new Set<string>();
    bugs.forEach((b) => {
      if (b.module) set.add(b.module);
    });
    return Array.from(set).sort();
  }, [bugs]);

  const filteredBugs = useMemo(() => {
    return bugs.filter((b) => {
      if (moduleFilter !== "ALL" && b.module !== moduleFilter) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        b.bugId?.toLowerCase().includes(q) ||
        b.title?.toLowerCase().includes(q) ||
        b.module?.toLowerCase().includes(q) ||
        b.projectName?.toLowerCase().includes(q) ||
        b.assigneeName?.toLowerCase().includes(q)
      );
    });
  }, [bugs, moduleFilter, search]);

  const stats = useMemo(() => {
    const total = bugs.length;
    const open = bugs.filter((b) => !["CLOSED", "DUPLICATE", "NOT_A_BUG", "WONT_FIX"].includes(b.status)).length;
    const critical = bugs.filter((b) => b.severity === "CRITICAL" && b.status !== "CLOSED").length;
    const retest = bugs.filter((b) => ["FIXED", "READY_FOR_RETEST", "RETEST"].includes(b.status)).length;
    const closed = bugs.filter((b) => b.status === "CLOSED").length;
    return { total, open, critical, retest, closed };
  }, [bugs]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredBugs.length && filteredBugs.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredBugs.map((b) => b._id));
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    setError(null);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          bugApi.transitionStatus(id, {
            status: bulkStatus,
            statusReason: "Bulk status update from Bug Registry",
          })
        )
      );
      showToast(`Updated ${selectedIds.length} bug(s) to ${formatBugStatus(bulkStatus)}.`);
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Bulk status update failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Permanently delete ${selectedIds.length} selected bug(s)?`)) return;
    setBulkBusy(true);
    setError(null);
    try {
      await Promise.all(selectedIds.map((id) => bugApi.remove(id)));
      showToast(`Deleted ${selectedIds.length} bug(s).`);
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Bulk delete failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleClone = async (bug: BugItem) => {
    try {
      const cloned = await bugApi.clone(bug._id);
      showToast(`Cloned ${bug.bugId} → ${cloned.bugId}.`);
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Failed to clone bug");
    }
  };

  const handleDelete = async (bug: BugItem) => {
    if (!window.confirm(`Delete ${bug.bugId}: ${bug.title}?`)) return;
    try {
      await bugApi.remove(bug._id);
      setBugs((prev) => prev.filter((b) => b._id !== bug._id));
      showToast(`Deleted ${bug.bugId}.`);
    } catch (e: any) {
      setError(e?.message || "Failed to delete bug");
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "Bug ID",
      "Title",
      "Project",
      "Module",
      "Type",
      "Severity",
      "Priority",
      "Status",
      "Environment",
      "Assignee",
      "Reporter",
      "Created",
    ];
    const rows = filteredBugs.map((b) => [
      b.bugId,
      `"${String(b.title || "").replace(/"/g, '""')}"`,
      `"${String(b.projectName || "").replace(/"/g, '""')}"`,
      `"${String(b.module || "").replace(/"/g, '""')}"`,
      b.bugType || "",
      b.severity || "",
      b.priority || "",
      b.status || "",
      b.environment || "",
      `"${String(b.assigneeName || "").replace(/"/g, '""')}"`,
      `"${String(b.reporterName || "").replace(/"/g, '""')}"`,
      formatShortDate(b.createdAt),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bug-registry-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="qa-page">
      <div>
        <div className="qa-breadcrumb">
          <Link href="/qa">QA &amp; Bug Management</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Bug Registry</span>
        </div>
        <div className="qa-header">
          <div>
            <h1 className="qa-title">Bug Registry</h1>
            <p className="qa-subtitle">
              Track defects across projects, triage severities, manage lifecycle transitions, and verify fixes.
            </p>
          </div>
          <div className="qa-actions">
            <button type="button" className="qa-btn" onClick={handleExportCsv} disabled={filteredBugs.length === 0}>
              <Download size={12} /> Export CSV
            </button>
            <button type="button" className="qa-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <Link href="/qa/bugs/new" className="qa-btn qa-btn-primary">
              <Plus size={13} /> Report Bug
            </Link>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="qa-subnav">
        <Link href="/qa" className="qa-subnav-link">QA Dashboard</Link>
        <Link href="/qa/test-cases" className="qa-subnav-link">Test Cases</Link>
        <Link href="/qa/test-cases/new" className="qa-subnav-link">Create Test Case</Link>
        <Link href="/qa/test-runs" className="qa-subnav-link">Test Runs</Link>
        <Link href="/qa/bugs" className="qa-subnav-link active">Bug Registry</Link>
        <Link href="/qa/bugs/new" className="qa-subnav-link">Report Bug</Link>
      </div>

      {error && <div className="qa-alert qa-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="qa-alert qa-alert-healthy"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      {/* KPI Summary */}
      <div className="qa-kpi-grid">
        <div className="qa-kpi">
          <div className="qa-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><Bug size={16} /></div>
          <div><span className="qa-kpi-label">Total Bugs</span><span className="qa-kpi-val">{stats.total}</span></div>
        </div>
        <div className="qa-kpi">
          <div className="qa-kpi-icon" style={{ background: "#fff7ed", color: "#c2410c" }}><Activity size={16} /></div>
          <div><span className="qa-kpi-label">Active / Open</span><span className="qa-kpi-val">{stats.open}</span></div>
        </div>
        <div className="qa-kpi">
          <div className="qa-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><ShieldAlert size={16} /></div>
          <div><span className="qa-kpi-label">Open Critical</span><span className="qa-kpi-val" style={{ color: "#dc2626" }}>{stats.critical}</span></div>
        </div>
        <div className="qa-kpi">
          <div className="qa-kpi-icon" style={{ background: "#f5f3ff", color: "#6d28d9" }}><Clock size={16} /></div>
          <div><span className="qa-kpi-label">Fixed / Retest</span><span className="qa-kpi-val">{stats.retest}</span></div>
        </div>
        <div className="qa-kpi">
          <div className="qa-kpi-icon" style={{ background: "#ecfdf5", color: "#047857" }}><CheckCircle2 size={16} /></div>
          <div><span className="qa-kpi-label">Closed</span><span className="qa-kpi-val" style={{ color: "#047857" }}>{stats.closed}</span></div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="qa-seg">
        {BUG_STATUS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`qa-seg-btn ${statusTab === t.key ? "active" : ""}`}
            onClick={() => setStatusTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="qa-filter-bar">
        <div className="qa-search-wrap">
          <Search size={13} className="qa-search-icon" />
          <input
            className="qa-input"
            placeholder="Search by bug ID, title, module, project, or assignee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="qa-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="ALL">All Projects</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>{p.projectName}</option>
          ))}
        </select>
        <select className="qa-select" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
          <option value="ALL">All Modules</option>
          {modules.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select className="qa-select" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select className="qa-select" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
          <option value="ALL">All Assignees</option>
          {employees.map((e) => (
            <option key={e._id} value={e._id}>{e.name}</option>
          ))}
        </select>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="qa-alert qa-alert-info" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700 }}>{selectedIds.length} bug(s) selected</span>
          <div className="qa-actions">
            <select className="qa-select" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
              {BUG_LIFECYCLE_STATUSES.map((st) => (
                <option key={st} value={st}>{formatBugStatus(st)}</option>
              ))}
            </select>
            <button type="button" className="qa-btn qa-btn-primary qa-btn-sm" onClick={handleBulkStatusUpdate} disabled={bulkBusy}>
              Apply Status
            </button>
            <button type="button" className="qa-btn qa-btn-danger qa-btn-sm" onClick={handleBulkDelete} disabled={bulkBusy}>
              <Trash2 size={11} /> Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Bugs Table */}
      <div className="qa-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="qa-table-wrap">
          <table className="qa-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}>
                  <input
                    type="checkbox"
                    checked={filteredBugs.length > 0 && selectedIds.length === filteredBugs.length}
                    onChange={toggleAll}
                  />
                </th>
                <th>Bug ID</th>
                <th>Title &amp; Module</th>
                <th>Project</th>
                <th>Severity</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Env</th>
                <th>Created</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="qa-empty">Loading bugs...</td></tr>
              ) : filteredBugs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="qa-empty">
                    No bugs match your filters.{" "}
                    <Link href="/qa/bugs/new" style={{ color: "#0755e9", fontWeight: 600 }}>
                      Report a new bug
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                filteredBugs.map((bug) => (
                  <tr key={bug._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(bug._id)}
                        onChange={() => toggleSelect(bug._id)}
                      />
                    </td>
                    <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                      <Link href={`/qa/bugs/${bug._id}`} style={{ color: "#0755e9", textDecoration: "none" }}>
                        {bug.bugId}
                      </Link>
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      <Link
                        href={`/qa/bugs/${bug._id}`}
                        style={{ color: "#10204a", fontWeight: 600, textDecoration: "none", display: "block" }}
                      >
                        {bug.title}
                      </Link>
                      <span style={{ fontSize: 10, color: "#64748b" }}>
                        {bug.module || "General"}
                        {bug.subModule ? ` / ${bug.subModule}` : ""}
                        {bug.reopenCount ? ` · Reopened ×${bug.reopenCount}` : ""}
                      </span>
                    </td>
                    <td>{bug.projectName || "—"}</td>
                    <td><span className={severityBadgeClass(bug.severity)}>{bug.severity}</span></td>
                    <td><span className={severityBadgeClass(bug.priority)}>{bug.priority}</span></td>
                    <td>
                      <span className={statusBadgeClass(bug.status)}>
                        {formatBugStatus(bug.status)}
                      </span>
                    </td>
                    <td>{bug.assigneeName || <span style={{ color: "#94a3b8" }}>Unassigned</span>}</td>
                    <td><span className="qa-badge qa-badge-slate">{bug.environment || "QA"}</span></td>
                    <td style={{ whiteSpace: "nowrap", color: "#64748b" }}>{formatShortDate(bug.createdAt)}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <Link href={`/qa/bugs/${bug._id}`} className="qa-btn qa-btn-sm" title="View Details">
                          <ExternalLink size={11} />
                        </Link>
                        <button type="button" className="qa-btn qa-btn-sm" onClick={() => handleClone(bug)} title="Clone Bug">
                          <Copy size={11} />
                        </button>
                        <button type="button" className="qa-btn qa-btn-danger qa-btn-sm" onClick={() => handleDelete(bug)} title="Delete Bug">
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
