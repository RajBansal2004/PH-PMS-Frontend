"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  CheckCircle2,
  UserCheck,
  Briefcase,
  Calendar,
  Plus,
  Search,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import {
  resourceApi,
  allocationApi,
  lookupApi,
  ResourceItem,
  AllocationItem,
  ProjectLite,
  formatShortDate,
  getInitials,
} from "@/lib/resources/api";
import "@/components/resources/resource-capacity.css";

const BAR_COLORS = ["#93c5fd", "#86efac", "#c4b5fd", "#fdba74", "#fca5a5", "#67e8f9"];

function ProjectAllocationInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialResourceId = searchParams.get("resourceId") || "";
  const initialProjectId = searchParams.get("projectId") || "";

  // If navigated with preselected resourceId or projectId, redirect directly to the dedicated wizard page
  useEffect(() => {
    if (initialResourceId || initialProjectId) {
      const qs = new URLSearchParams();
      if (initialResourceId) qs.set("resourceId", initialResourceId);
      if (initialProjectId) qs.set("projectId", initialProjectId);
      router.replace(`/resources/allocate/new?${qs.toString()}`);
    }
  }, [initialResourceId, initialProjectId, router]);

  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [projects, setProjects] = useState<ProjectLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<"table" | "timeline" | "utilization">("table");
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resList, allocList, projList] = await Promise.all([
        resourceApi.list(),
        allocationApi.list(),
        lookupApi.projects(),
      ]);
      setResources(resList);
      setAllocations(allocList);
      setProjects(projList);
    } catch (e: any) {
      setError(e?.message || "Failed to load project allocations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const currentAllocMap = useMemo(() => {
    const map = new Map<string, number>();
    allocations
      .filter((a) => !["CANCELLED", "RELEASED", "COMPLETED", "PENDING_APPROVAL", "REJECTED"].includes(a.status))
      .forEach((a) => {
        map.set(a.employeeId, (map.get(a.employeeId) || 0) + a.allocationPercent);
      });
    return map;
  }, [allocations]);

  const kpis = useMemo(() => {
    const totalResources = resources.length;
    const allocatedRes = resources.filter((r) => (currentAllocMap.get(r.employeeId) || 0) > 0).length;
    const availableRes = totalResources - allocatedRes;
    const activeProjectIds = new Set(
      allocations.filter((a) => a.status === "ACTIVE").map((a) => a.projectId)
    );
    const plannedCount = allocations.filter((a) => a.status === "PLANNED").length;
    return {
      totalResources,
      allocatedRes,
      allocatedPct: totalResources > 0 ? Math.round((allocatedRes / totalResources) * 100) : 0,
      availableRes,
      availablePct: totalResources > 0 ? Math.round((availableRes / totalResources) * 100) : 0,
      activeProjects: activeProjectIds.size || projects.filter((p) => p.status === "ACTIVE" || p.status === "IN_PROGRESS").length,
      plannedCount,
    };
  }, [resources, allocations, projects, currentAllocMap]);

  const filteredAllocations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allocations.filter((a) => {
      if (projectFilter !== "ALL" && a.projectId !== projectFilter) return false;
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (q) {
        const hay = `${a.projectName} ${a.projectCode} ${a.employeeName} ${a.role} ${a.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allocations, search, projectFilter, statusFilter]);

  const projectUtilization = useMemo(() => {
    const map = new Map<string, { projectName: string; projectCode: string; allocatedHours: number; totalPct: number; members: Set<string> }>();
    allocations
      .filter((a) => !["CANCELLED", "RELEASED"].includes(a.status))
      .forEach((a) => {
        if (!map.has(a.projectId)) {
          map.set(a.projectId, {
            projectName: a.projectName,
            projectCode: a.projectCode,
            allocatedHours: 0,
            totalPct: 0,
            members: new Set(),
          });
        }
        const entry = map.get(a.projectId)!;
        entry.allocatedHours += a.allocatedHours || Math.round((a.allocationPercent / 100) * 160);
        entry.totalPct += a.allocationPercent;
        entry.members.add(a.employeeName);
      });
    return Array.from(map.entries()).map(([id, v]) => ({
      projectId: id,
      projectName: v.projectName,
      projectCode: v.projectCode,
      allocatedHours: v.allocatedHours,
      avgUtilization: v.members.size > 0 ? Math.round(v.totalPct / v.members.size) : 0,
      members: Array.from(v.members),
    }));
  }, [allocations]);

  const handleUpdateStatus = async (id: string, status: AllocationItem["status"]) => {
    try {
      await allocationApi.update(id, { status });
      await loadData();
      flash(`Allocation marked as ${status}.`);
    } catch (e: any) {
      setError(e?.message || "Failed to update allocation");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await allocationApi.remove(id);
      await loadData();
      flash("Allocation deleted.");
    } catch (e: any) {
      setError(e?.message || "Failed to delete allocation");
    }
  };

  const handleOverrideDecision = async (id: string, decision: "APPROVE" | "REJECT") => {
    try {
      await allocationApi.decideOverride(id, {
        decision,
        comments: decision === "APPROVE" ? "Override approved from Project Allocation" : "Override rejected",
      });
      await loadData();
      flash(decision === "APPROVE" ? "Over-allocation override approved & activated." : "Over-allocation override rejected.");
    } catch (e: any) {
      setError(e?.message || "Failed to process override decision");
    }
  };

  const timelineMonths = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 4 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      return {
        label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        start: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime(),
      };
    });
  }, []);

  const rangeStart = timelineMonths[0].start;
  const rangeEnd = timelineMonths[timelineMonths.length - 1].end;
  const rangeSpan = Math.max(1, rangeEnd - rangeStart);

  return (
    <div className="rc-page">
      {/* Header */}
      <div>
        <div className="rc-breadcrumb">
          <span>Resource Management</span>
          <ChevronRight size={12} />
          <span style={{ color: "#0f172a", fontWeight: 600 }}>Project Allocation</span>
        </div>
        <div className="rc-header">
          <div>
            <h1 className="rc-title">Project Allocation</h1>
            <p className="rc-subtitle">Allocate the right people to active projects, enforce over-allocation guardrails, and track utilization.</p>
          </div>
          <div className="rc-header-actions">
            <div className="rc-seg">
              <button type="button" className={`rc-seg-btn ${activeView === "table" ? "active" : ""}`} onClick={() => setActiveView("table")}>Overview</button>
              <button type="button" className={`rc-seg-btn ${activeView === "timeline" ? "active" : ""}`} onClick={() => setActiveView("timeline")}>Timeline</button>
              <button type="button" className={`rc-seg-btn ${activeView === "utilization" ? "active" : ""}`} onClick={() => setActiveView("utilization")}>Project Utilization</button>
            </div>
            <button type="button" className="rc-btn rc-btn-outline" onClick={loadData} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <Link href="/resources/allocate/new" className="rc-btn rc-btn-primary">
              <Plus size={14} /> Allocate Resource
            </Link>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="rc-subnav">
        <Link href="/resources" className="rc-subnav-link">Resource Directory</Link>
        <Link href="/resources/new" className="rc-subnav-link">Add New Resource</Link>
        <Link href="/resources/allocate" className="rc-subnav-link active">Project Allocation</Link>
        <Link href="/resources/planner" className="rc-subnav-link">Allocation Planner</Link>
        <Link href="/resources/calendar" className="rc-subnav-link">Resource Calendar</Link>
        <Link href="/resources/bench" className="rc-subnav-link">Bench &amp; Availability</Link>
      </div>

      {notice && <div className="rc-alert rc-alert-healthy"><CheckCircle2 size={14} /> <span>{notice}</span></div>}
      {error && <div className="rc-alert rc-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* 5-KPI Strip matching RES-003 */}
      <div className="rc-kpi-grid">
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#eff6ff", color: "#2563eb" }}><Users size={16} /></div>
          <div>
            <span className="rc-kpi-label">Total Resources</span>
            <span className="rc-kpi-value">{kpis.totalResources}</span>
          </div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#ecfdf5", color: "#16a34a" }}><CheckCircle2 size={16} /></div>
          <div>
            <span className="rc-kpi-label">Allocated</span>
            <span className="rc-kpi-value">{kpis.allocatedRes}<span className="rc-kpi-sub">({kpis.allocatedPct}%)</span></span>
          </div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#fffbeb", color: "#d97706" }}><UserCheck size={16} /></div>
          <div>
            <span className="rc-kpi-label">Available</span>
            <span className="rc-kpi-value">{kpis.availableRes}<span className="rc-kpi-sub">({kpis.availablePct}%)</span></span>
          </div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#eff6ff", color: "#0284c7" }}><Briefcase size={16} /></div>
          <div>
            <span className="rc-kpi-label">Active Projects</span>
            <span className="rc-kpi-value">{kpis.activeProjects}</span>
          </div>
        </div>
        <div className="rc-kpi">
          <div className="rc-kpi-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}><Calendar size={16} /></div>
          <div>
            <span className="rc-kpi-label">Planned Allocations</span>
            <span className="rc-kpi-value">{kpis.plannedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rc-filter-bar">
        <div className="rc-search-wrap">
          <Search size={13} className="rc-search-icon" />
          <input
            className="rc-input rc-search-input"
            placeholder="Search by project, resource, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="rc-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="ALL">Project (All)</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
        </select>
        <select className="rc-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">Status (All)</option>
          <option value="ACTIVE">Active</option>
          <option value="PLANNED">Planned</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="REJECTED">Rejected</option>
          <option value="COMPLETED">Completed</option>
          <option value="RELEASED">Released</option>
        </select>
      </div>

      {/* VIEW 1: TABLE OVERVIEW */}
      {activeView === "table" && (
        <div className="rc-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Resource</th>
                  <th>Role</th>
                  <th>Allocation</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && allocations.length === 0 ? (
                  <tr><td colSpan={8} className="rc-empty">Loading allocations...</td></tr>
                ) : filteredAllocations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="rc-empty">
                      No allocations found. Click <strong>Allocate Resource</strong> to assign a team member to a project.
                    </td>
                  </tr>
                ) : (
                  filteredAllocations.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "#2563eb" }}>{a.projectName}</div>
                        <div style={{ fontSize: 10, color: "#64748b" }}>{a.projectCode || a.clientName}</div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="rc-avatar" style={{ overflow: "hidden" }}>
                            {a.employeeAvatarUrl ? (
                              <img src={a.employeeAvatarUrl} alt={a.employeeName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              getInitials(a.employeeName)
                            )}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600 }}>{a.employeeName}</div>
                            <div style={{ fontSize: 10, color: "#64748b" }}>{a.employeeCode || a.employeeEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td>{a.role}</td>
                      <td style={{ minWidth: 130 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="rc-bar-track" style={{ flex: 1 }}>
                            <div
                              className="rc-bar-fill"
                              style={{
                                width: `${Math.min(100, a.allocationPercent)}%`,
                                background: a.allocationPercent > 100 ? "#dc2626" : a.allocationPercent >= 80 ? "#16a34a" : "#2563eb",
                              }}
                            />
                          </div>
                          <strong>{a.allocationPercent}%</strong>
                        </div>
                      </td>
                      <td>{formatShortDate(a.startDate)}</td>
                      <td>{formatShortDate(a.endDate)}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span
                            className={`rc-badge ${
                              a.status === "ACTIVE"
                                ? "rc-badge-green"
                                : a.status === "PENDING_APPROVAL"
                                ? "rc-badge-amber"
                                : a.status === "REJECTED"
                                ? "rc-badge-red"
                                : a.status === "PLANNED"
                                ? "rc-badge-blue"
                                : "rc-badge-slate"
                            }`}
                            title={a.overrideJustification || undefined}
                          >
                            {a.status === "PENDING_APPROVAL" ? "Pending Approval" : a.status}
                          </span>
                          {a.isOverAllocationOverride && (
                            <span style={{ fontSize: 9.5, color: "#b45309" }}>
                              Override {a.projectedUtilizationPercent ? `(${a.projectedUtilizationPercent}%)` : ""}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", gap: 5 }}>
                          {a.status === "PENDING_APPROVAL" && (
                            <>
                              <button type="button" className="rc-btn rc-btn-success rc-btn-sm" onClick={() => handleOverrideDecision(a.id, "APPROVE")}>
                                Approve
                              </button>
                              <button type="button" className="rc-btn rc-btn-danger rc-btn-sm" onClick={() => handleOverrideDecision(a.id, "REJECT")}>
                                Reject
                              </button>
                            </>
                          )}
                          {a.status === "ACTIVE" && (
                            <button type="button" className="rc-btn rc-btn-outline rc-btn-sm" onClick={() => handleUpdateStatus(a.id, "RELEASED")}>
                              Release
                            </button>
                          )}
                          {a.status === "PLANNED" && (
                            <button type="button" className="rc-btn rc-btn-success rc-btn-sm" onClick={() => handleUpdateStatus(a.id, "ACTIVE")}>
                              Activate
                            </button>
                          )}
                          <button type="button" className="rc-btn rc-btn-danger rc-btn-sm" onClick={() => handleDelete(a.id)} title="Delete allocation">
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
      )}

      {/* VIEW 2: TIMELINE VIEW */}
      {activeView === "timeline" && (
        <div className="rc-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 className="rc-card-title">Allocation Timeline</h3>
            <span style={{ fontSize: 11, color: "#64748b" }}>
              {timelineMonths[0].label} – {timelineMonths[timelineMonths.length - 1].label}
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 700 }}>
              <div style={{ display: "grid", gridTemplateColumns: "200px repeat(4, 1fr)", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: 11, fontWeight: 600, color: "#64748b" }}>
                <div style={{ padding: "8px 12px" }}>Resource</div>
                {timelineMonths.map((m) => (
                  <div key={m.label} style={{ padding: "8px 10px", textAlign: "center", borderLeft: "1px solid #e2e8f0" }}>{m.label}</div>
                ))}
              </div>
              {filteredAllocations.length === 0 ? (
                <div className="rc-empty">No allocations to visualize on the timeline.</div>
              ) : (
                filteredAllocations.map((a, idx) => {
                  const s = a.startDate ? new Date(a.startDate).getTime() : rangeStart;
                  const e = a.endDate ? new Date(a.endDate).getTime() : rangeEnd;
                  const clampedS = Math.max(rangeStart, Math.min(rangeEnd, s));
                  const clampedE = Math.max(clampedS + 86400000 * 5, Math.min(rangeEnd, e));
                  const leftPct = ((clampedS - rangeStart) / rangeSpan) * 100;
                  const widthPct = Math.max(8, ((clampedE - clampedS) / rangeSpan) * 100);
                  const bg = BAR_COLORS[idx % BAR_COLORS.length];

                  return (
                    <div key={a.id} style={{ display: "grid", gridTemplateColumns: "200px 1fr", borderBottom: "1px solid #f1f5f9", alignItems: "center" }}>
                      <div style={{ padding: "9px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="rc-avatar">{getInitials(a.employeeName)}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 11.5 }}>{a.employeeName}</div>
                          <div style={{ fontSize: 10, color: "#64748b" }}>{a.role}</div>
                        </div>
                      </div>
                      <div style={{ position: "relative", height: 36, borderLeft: "1px solid #f1f5f9" }}>
                        <div
                          style={{
                            position: "absolute",
                            top: 7,
                            left: `${leftPct}%`,
                            width: `${Math.min(100 - leftPct, widthPct)}%`,
                            height: 22,
                            background: bg,
                            borderRadius: 6,
                            padding: "0 8px",
                            display: "flex",
                            alignItems: "center",
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: "#0f172a",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                          }}
                          title={`${a.projectName} (${a.allocationPercent}%) · ${formatShortDate(a.startDate)} - ${formatShortDate(a.endDate)}`}
                        >
                          {a.projectName} ({a.allocationPercent}%)
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: PROJECT-WISE UTILIZATION */}
      {activeView === "utilization" && (
        <div className="rc-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e2e8f0" }}>
            <h3 className="rc-card-title">Project-wise Resource Utilization</h3>
          </div>
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Allocated Hours</th>
                  <th>Avg Allocation %</th>
                  <th>Assigned Resources</th>
                </tr>
              </thead>
              <tbody>
                {projectUtilization.length === 0 ? (
                  <tr><td colSpan={4} className="rc-empty">No project allocations yet.</td></tr>
                ) : (
                  projectUtilization.map((p) => (
                    <tr key={p.projectId}>
                      <td>
                        <strong style={{ color: "#2563eb" }}>{p.projectName}</strong>
                        <div style={{ fontSize: 10, color: "#64748b" }}>{p.projectCode}</div>
                      </td>
                      <td><strong>{p.allocatedHours} hrs</strong></td>
                      <td style={{ minWidth: 150 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="rc-bar-track" style={{ flex: 1 }}>
                            <div className="rc-bar-fill" style={{ width: `${Math.min(100, p.avgUtilization)}%`, background: "#16a34a" }} />
                          </div>
                          <strong>{p.avgUtilization}%</strong>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {p.members.map((m) => <span key={m} className="rc-skill-chip">{m}</span>)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectAllocationWizard() {
  return (
    <Suspense fallback={<div className="rc-page"><div className="rc-card rc-empty">Loading Project Allocation...</div></div>}>
      <ProjectAllocationInner />
    </Suspense>
  );
}
