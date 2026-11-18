"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UserPlus,
  X,
  Search,
  Check,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Briefcase,
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
import "./allocate-resource.css";

const STEPS = [
  { id: 1, label: "Select Project" },
  { id: 2, label: "Select Resource" },
  { id: 3, label: "Allocation Details" },
  { id: 4, label: "Review & Confirm" },
];

function AllocateResourceWizardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get("projectId") || "";
  const initialResourceId = searchParams.get("resourceId") || "";

  const [step, setStep] = useState(initialProjectId && initialResourceId ? 3 : initialProjectId ? 2 : 1);
  const [projects, setProjects] = useState<ProjectLite[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters for Steps 1 & 2
  const [projectSearch, setProjectSearch] = useState("");
  const [resourceSearch, setResourceSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [availFilter, setAvailFilter] = useState("ALL");

  // Selection & details state (RES-003 Panels 2-5)
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [selectedResourceId, setSelectedResourceId] = useState(initialResourceId);
  const [details, setDetails] = useState({
    role: "",
    allocationType: "FULL_TIME" as AllocationItem["allocationType"],
    allocationPercent: 80,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    billingType: "INTERNAL" as AllocationItem["billingType"],
    monthlyCost: "",
    status: "ACTIVE" as "ACTIVE" | "PLANNED",
    overrideMode: "APPROVAL_WORKFLOW" as "APPROVAL_WORKFLOW" | "DIRECT_OVERRIDE",
    overrideJustification: "",
    overrideImpactAssessment: "No major impact on delivery",
    overrideApprovedBy: "",
    notes: "",
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      lookupApi.projects(),
      resourceApi.list(),
      allocationApi.list().catch(() => []),
    ])
      .then(([projList, resList, allocList]) => {
        setProjects(projList);
        setResources(resList);
        setAllocations(allocList);
        if (initialResourceId) {
          const matched = resList.find((r) => r.id === initialResourceId || r.employeeId === initialResourceId);
          if (matched) {
            setSelectedResourceId(matched.id);
            setDetails((prev) => ({ ...prev, role: prev.role || matched.designationName || "Developer" }));
          }
        }
      })
      .catch((e: any) => setError(e?.message || "Failed to load projects and resources"))
      .finally(() => setLoading(false));
  }, [initialResourceId]);

  // Live current allocation % per employeeId
  const currentAllocMap = useMemo(() => {
    const map = new Map<string, number>();
    allocations
      .filter((a) => !["CANCELLED", "RELEASED", "COMPLETED", "PENDING_APPROVAL", "REJECTED"].includes(a.status))
      .forEach((a) => {
        map.set(a.employeeId, (map.get(a.employeeId) || 0) + a.allocationPercent);
      });
    return map;
  }, [allocations]);

  const roleOptions = useMemo(() => {
    const set = new Set<string>();
    resources.forEach((r) => r.designationName && set.add(r.designationName));
    return Array.from(set).sort();
  }, [resources]);

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => `${p.projectName} ${p.projectCode} ${p.clientName}`.toLowerCase().includes(q));
  }, [projects, projectSearch]);

  const filteredResources = useMemo(() => {
    const q = resourceSearch.trim().toLowerCase();
    return resources.filter((r) => {
      const cur = currentAllocMap.get(r.employeeId) || 0;
      const avail = Math.max(0, 100 - cur);
      if (roleFilter !== "ALL" && r.designationName !== roleFilter) return false;
      if (availFilter === "AVAILABLE" && avail < 50) return false;
      if (availFilter === "BENCH" && cur !== 0) return false;
      if (q && !`${r.name} ${r.designationName} ${r.primarySkill} ${r.secondarySkills.join(" ")}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [resources, resourceSearch, roleFilter, availFilter, currentAllocMap]);

  const selectedProject = projects.find((p) => p._id === selectedProjectId) || null;
  const selectedResource =
    resources.find((r) => r.id === selectedResourceId || r.employeeId === selectedResourceId) || null;
  const currentLoad = selectedResource ? currentAllocMap.get(selectedResource.employeeId) || 0 : 0;
  const projectedLoad = currentLoad + Number(details.allocationPercent || 0);
  const isOverAllocated = projectedLoad > 100;
  const monthlyHours = selectedResource
    ? Math.round((Number(details.allocationPercent || 0) / 100) * (selectedResource.monthlyCapacityHours || 160))
    : Math.round((Number(details.allocationPercent || 0) / 100) * 160);

  const validateStep = (target: number): boolean => {
    setError(null);
    if (target === 1 && !selectedProjectId) {
      setError("Please select a project to continue.");
      return false;
    }
    if (target === 2 && !selectedResourceId) {
      setError("Please select a resource to continue.");
      return false;
    }
    if (target === 3) {
      if (!details.startDate || !details.endDate) {
        setError("Start Date and End Date are required.");
        return false;
      }
      if (new Date(details.endDate) < new Date(details.startDate)) {
        setError("End Date cannot be before Start Date.");
        return false;
      }
      if (isOverAllocated) {
        if (details.overrideMode === "APPROVAL_WORKFLOW" && !details.overrideJustification.trim()) {
          setError("Over-allocation requires Justification before submitting for approval.");
          return false;
        }
        if (details.overrideMode === "DIRECT_OVERRIDE" && !details.overrideApprovedBy.trim()) {
          setError("Direct override requires Manager Approver name.");
          return false;
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(4, s + 1));
  };

  const handleBack = () => {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const handleStepClick = (target: number) => {
    if (target < step) {
      setError(null);
      setStep(target);
    } else if (target === step + 1 && validateStep(step)) {
      setStep(target);
    }
  };

  const handleConfirmAllocation = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;
    if (!selectedProject || !selectedResource) return;

    setSubmitting(true);
    setError(null);
    try {
      const wantsApproval = isOverAllocated && details.overrideMode === "APPROVAL_WORKFLOW";
      await allocationApi.create({
        projectId: selectedProject._id,
        employeeId: selectedResource.employeeId,
        role: details.role.trim() || selectedResource.designationName || "Developer",
        allocationType: details.allocationType,
        allocationPercent: Number(details.allocationPercent),
        startDate: details.startDate,
        endDate: details.endDate,
        billingType: details.billingType,
        monthlyCost: details.monthlyCost ? Number(details.monthlyCost) : 0,
        status: wantsApproval ? "PENDING_APPROVAL" : details.status,
        requestOverrideApproval: wantsApproval,
        overrideJustification: isOverAllocated ? details.overrideJustification.trim() : "",
        overrideImpactAssessment: isOverAllocated ? details.overrideImpactAssessment : "",
        overrideApprovedBy: isOverAllocated && !wantsApproval ? details.overrideApprovedBy.trim() : null,
        notes: details.notes.trim(),
      });
      router.push("/resources/allocate");
    } catch (e: any) {
      setError(e?.message || "Failed to confirm allocation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="al-page">
      {/* Top Breadcrumb & Actions Bar */}
      <header className="al-header">
        <div className="al-breadcrumb">
          <Link href="/resources">Resource Management</Link>
          <b>›</b>
          <Link href="/resources/allocate">Project Allocation</Link>
          <b>›</b>
          <strong>Allocate Resource to Project</strong>
        </div>

        <div className="al-header-actions">
          <Link href="/resources/allocate" className="al-btn">
            <X size={13} /> Cancel
          </Link>
          {step < 4 ? (
            <button type="button" className="al-btn al-btn-primary" onClick={handleNext}>
              Next: {STEPS[step].label} <ArrowRight size={13} />
            </button>
          ) : (
            <button type="button" className="al-btn al-btn-success" disabled={submitting} onClick={handleConfirmAllocation}>
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {submitting
                ? "Submitting..."
                : isOverAllocated && details.overrideMode === "APPROVAL_WORKFLOW"
                ? "Submit for Approval"
                : "Confirm Allocation"}
            </button>
          )}
        </div>
      </header>

      {/* Title Row */}
      <div className="al-title-row">
        <div className="al-title-icon">
          <UserPlus size={18} strokeWidth={2} />
        </div>
        <div>
          <h1>Allocate Resource to Project</h1>
          <p>Assign the right team member to a project with live availability checks and over-allocation guardrails</p>
        </div>
      </div>

      {/* 4-Step Horizontal Stepper (RES-003 Panels 2-5) */}
      <nav className="al-stepper" aria-label="Allocate resource steps">
        {STEPS.map((s) => {
          const active = step === s.id;
          const done = step > s.id;
          return (
            <button
              key={s.id}
              type="button"
              className={`al-step ${active ? "active" : ""} ${done ? "done" : ""}`}
              onClick={() => handleStepClick(s.id)}
            >
              <span>{done ? <Check size={12} strokeWidth={2.5} /> : s.id}</span>
              <b>{s.label}</b>
            </button>
          );
        })}
      </nav>

      {error && (
        <div className="al-error-banner">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="al-layout">
        <div className="al-left-col">
          <main className="al-main-card">
            {/* STEP 1: Select Project (RES-003 Panel 2) */}
            {step === 1 && (
              <section>
                <h2>Select Project</h2>
                <div className="al-toolbar">
                  <div className="al-search-wrap">
                    <Search size={13} className="al-search-icon" />
                    <input
                      className="al-input"
                      placeholder="Search project by name, code, or client..."
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="al-table-wrap">
                  <table className="al-table">
                    <thead>
                      <tr>
                        <th style={{ width: 32 }}></th>
                        <th>Project &amp; Client</th>
                        <th>Progress</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#64748b" }}>Loading projects...</td></tr>
                      ) : filteredProjects.length === 0 ? (
                        <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#64748b" }}>No projects found.</td></tr>
                      ) : (
                        filteredProjects.map((p) => {
                          const selected = selectedProjectId === p._id;
                          return (
                            <tr
                              key={p._id}
                              className={selected ? "selected" : ""}
                              onClick={() => setSelectedProjectId(p._id)}
                            >
                              <td>
                                <input
                                  type="radio"
                                  name="selectedProject"
                                  checked={selected}
                                  onChange={() => setSelectedProjectId(p._id)}
                                />
                              </td>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span className="al-avatar" style={{ borderRadius: 6 }}><Briefcase size={12} /></span>
                                  <div>
                                    <div style={{ fontWeight: 700 }}>{p.projectName}</div>
                                    <div style={{ fontSize: 10, color: "#64748b" }}>
                                      {p.projectCode ? `${p.projectCode} · ` : ""}Client: {p.clientName || "Internal"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ minWidth: 120 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                  <div className="al-bar-track" style={{ flex: 1 }}>
                                    <div className="al-bar-fill" style={{ width: `${Math.min(100, p.progress || 0)}%`, background: "#079b62" }} />
                                  </div>
                                  <span style={{ fontWeight: 600 }}>{p.progress || 0}%</span>
                                </div>
                              </td>
                              <td>{formatShortDate(p.startDate)}</td>
                              <td>{formatShortDate(p.endDate)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* STEP 2: Select Resource (RES-003 Panel 3) */}
            {step === 2 && (
              <section>
                <h2>Select Resource</h2>
                {selectedProject && (
                  <div className="al-selected-strip">
                    <div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>Selected Project</div>
                      <strong style={{ fontSize: 12 }}>{selectedProject.projectName}</strong>
                      <span style={{ color: "#64748b", marginLeft: 6 }}>Client: {selectedProject.clientName || "Internal"}</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: "#475569" }}>
                      {formatShortDate(selectedProject.startDate)} – {formatShortDate(selectedProject.endDate)}
                    </div>
                  </div>
                )}

                <div className="al-toolbar">
                  <div className="al-search-wrap">
                    <Search size={13} className="al-search-icon" />
                    <input
                      className="al-input"
                      placeholder="Search by name, skill, role..."
                      value={resourceSearch}
                      onChange={(e) => setResourceSearch(e.target.value)}
                    />
                  </div>
                  <select className="al-select" style={{ width: 150 }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                    <option value="ALL">Role (All)</option>
                    {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                  <select className="al-select" style={{ width: 150 }} value={availFilter} onChange={(e) => setAvailFilter(e.target.value)}>
                    <option value="ALL">Availability (All)</option>
                    <option value="BENCH">On Bench (100% Free)</option>
                    <option value="AVAILABLE">&ge; 50% Available</option>
                  </select>
                </div>

                <div className="al-table-wrap">
                  <table className="al-table">
                    <thead>
                      <tr>
                        <th style={{ width: 32 }}></th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Skills</th>
                        <th>Availability</th>
                        <th>Current Allocation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResources.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#64748b" }}>No resources match filters.</td></tr>
                      ) : (
                        filteredResources.map((r) => {
                          const cur = currentAllocMap.get(r.employeeId) || 0;
                          const avail = Math.max(0, 100 - cur);
                          const selected = selectedResourceId === r.id || selectedResourceId === r.employeeId;
                          return (
                            <tr
                              key={r.id}
                              className={selected ? "selected" : ""}
                              onClick={() => {
                                setSelectedResourceId(r.id);
                                setDetails((prev) => ({ ...prev, role: prev.role || r.designationName || "Developer" }));
                              }}
                            >
                              <td>
                                <input
                                  type="radio"
                                  name="selectedResource"
                                  checked={selected}
                                  onChange={() => setSelectedResourceId(r.id)}
                                />
                              </td>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span className="al-avatar">{getInitials(r.name)}</span>
                                  <div>
                                    <div style={{ fontWeight: 700 }}>{r.name}</div>
                                    <div style={{ fontSize: 10, color: "#64748b" }}>{r.departmentName}</div>
                                  </div>
                                </div>
                              </td>
                              <td>{r.designationName}</td>
                              <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {r.primarySkill || r.secondarySkills.slice(0, 2).join(", ") || "—"}
                              </td>
                              <td style={{ minWidth: 110 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <div className="al-bar-track" style={{ flex: 1 }}>
                                    <div
                                      className="al-bar-fill"
                                      style={{
                                        width: `${avail}%`,
                                        background: avail >= 50 ? "#079b62" : avail > 0 ? "#f59e0b" : "#ef4444",
                                      }}
                                    />
                                  </div>
                                  <strong>{avail}%</strong>
                                </div>
                              </td>
                              <td style={{ minWidth: 110 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <div className="al-bar-track" style={{ flex: 1 }}>
                                    <div
                                      className="al-bar-fill"
                                      style={{
                                        width: `${Math.min(100, cur)}%`,
                                        background: cur > 100 ? "#ef4444" : "#0755e9",
                                      }}
                                    />
                                  </div>
                                  <strong>{cur}%</strong>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* STEP 3: Allocation Details (RES-003 Panel 4) */}
            {step === 3 && (
              <section style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                <h2>Allocation Details</h2>

                <div className="al-grid-2">
                  <div className="al-selected-strip" style={{ marginBottom: 0 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>Project</div>
                      <strong>{selectedProject?.projectName || "—"}</strong>
                      <div style={{ fontSize: 10, color: "#64748b" }}>Client: {selectedProject?.clientName || "Internal"}</div>
                    </div>
                  </div>
                  <div className="al-selected-strip" style={{ marginBottom: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="al-avatar">{getInitials(selectedResource?.name || "R")}</span>
                      <div>
                        <div style={{ fontSize: 10, color: "#64748b" }}>Resource</div>
                        <strong>{selectedResource?.name || "—"}</strong>
                        <div style={{ fontSize: 10, color: "#64748b" }}>{selectedResource?.designationName} · Current: {currentLoad}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="al-field">
                  <label>Allocation Type</label>
                  <div className="al-radio-group">
                    {(
                      [
                        { v: "FULL_TIME", l: "Full Time" },
                        { v: "PART_TIME", l: "Part Time" },
                        { v: "HOURLY", l: "Hourly" },
                        { v: "CONTRACT", l: "Contract" },
                      ] as const
                    ).map((opt) => (
                      <label key={opt.v} className="al-radio-opt">
                        <input
                          type="radio"
                          name="allocationType"
                          checked={details.allocationType === opt.v}
                          onChange={() => setDetails({ ...details, allocationType: opt.v })}
                        />
                        <span>{opt.l}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="al-grid-2">
                  <div className="al-field" style={{ gridColumn: "1 / -1" }}>
                    <label>
                      Allocation % <span className="al-req">*</span>{" "}
                      <span style={{ fontWeight: 500, color: "#64748b", marginLeft: 6 }}>
                        (Projected total load: <strong style={{ color: isOverAllocated ? "#dc2626" : "#0755e9" }}>{projectedLoad}%</strong>)
                      </span>
                    </label>
                    <div className="al-slider-row">
                      <input
                        type="range"
                        min={10}
                        max={150}
                        step={5}
                        value={details.allocationPercent}
                        onChange={(e) => setDetails({ ...details, allocationPercent: Number(e.target.value) })}
                      />
                      <span className="al-pct-pill">{details.allocationPercent}%</span>
                    </div>
                  </div>

                  <div className="al-field">
                    <label>Start Date <span className="al-req">*</span></label>
                    <input
                      className="al-input"
                      type="date"
                      value={details.startDate}
                      onChange={(e) => setDetails({ ...details, startDate: e.target.value })}
                    />
                  </div>
                  <div className="al-field">
                    <label>End Date <span className="al-req">*</span></label>
                    <input
                      className="al-input"
                      type="date"
                      value={details.endDate}
                      onChange={(e) => setDetails({ ...details, endDate: e.target.value })}
                    />
                  </div>

                  <div className="al-field">
                    <label>Role in Project</label>
                    <input
                      className="al-input"
                      value={details.role}
                      onChange={(e) => setDetails({ ...details, role: e.target.value })}
                      placeholder="e.g. Frontend Developer"
                    />
                  </div>
                  <div className="al-field">
                    <label>Billing Type</label>
                    <select
                      className="al-select"
                      value={details.billingType}
                      onChange={(e) => setDetails({ ...details, billingType: e.target.value as any })}
                    >
                      <option value="INTERNAL">Internal</option>
                      <option value="BILLABLE">Billable</option>
                      <option value="NON_BILLABLE">Non-Billable</option>
                      <option value="SHADOW">Shadow</option>
                    </select>
                  </div>

                  <div className="al-field">
                    <label>Cost (Optional, ₹ / month)</label>
                    <input
                      className="al-input"
                      type="number"
                      min={0}
                      value={details.monthlyCost}
                      onChange={(e) => setDetails({ ...details, monthlyCost: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="al-field">
                    <label>Status</label>
                    <select
                      className="al-select"
                      value={details.status}
                      onChange={(e) => setDetails({ ...details, status: e.target.value as any })}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="PLANNED">Planned</option>
                    </select>
                  </div>

                  {isOverAllocated && (
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        border: "1px solid #fecaca",
                        borderRadius: 6,
                        background: "#fffafb",
                        padding: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#b91c1c", fontWeight: 700, fontSize: 12 }}>
                          <AlertTriangle size={15} />
                          OVER-ALLOCATED: {projectedLoad}% (Exceeds 100% by {projectedLoad - 100}%)
                        </div>
                        <span style={{ fontSize: 10.5, color: "#64748b" }}>
                          Existing: <strong>{currentLoad}%</strong> + Requested: <strong>{details.allocationPercent}%</strong>
                        </span>
                      </div>

                      <div className="al-radio-group" style={{ paddingTop: 2 }}>
                        <label className="al-radio-opt">
                          <input
                            type="radio"
                            name="overrideMode"
                            checked={details.overrideMode === "APPROVAL_WORKFLOW"}
                            onChange={() => setDetails({ ...details, overrideMode: "APPROVAL_WORKFLOW" })}
                          />
                          <span><strong>Request Override Approval</strong> (Routes to Approval Center)</span>
                        </label>
                        <label className="al-radio-opt">
                          <input
                            type="radio"
                            name="overrideMode"
                            checked={details.overrideMode === "DIRECT_OVERRIDE"}
                            onChange={() => setDetails({ ...details, overrideMode: "DIRECT_OVERRIDE" })}
                          />
                          <span>Direct Manager Override (Pre-approved)</span>
                        </label>
                      </div>

                      {details.overrideMode === "APPROVAL_WORKFLOW" ? (
                        <div className="al-grid-2">
                          <div className="al-field" style={{ gridColumn: "1 / -1" }}>
                            <label>Justification <span className="al-req">*</span></label>
                            <textarea
                              className="al-textarea"
                              rows={2}
                              value={details.overrideJustification}
                              onChange={(e) => setDetails({ ...details, overrideJustification: e.target.value })}
                              placeholder="e.g. Critical feature release for client; temporary support needed for 2 weeks."
                            />
                          </div>
                          <div className="al-field" style={{ gridColumn: "1 / -1" }}>
                            <label>Impact Assessment <span className="al-req">*</span></label>
                            <select
                              className="al-select"
                              value={details.overrideImpactAssessment}
                              onChange={(e) => setDetails({ ...details, overrideImpactAssessment: e.target.value })}
                            >
                              <option value="No major impact on delivery">No major impact on delivery</option>
                              <option value="Minor delay possible on secondary tasks">Minor delay possible on secondary tasks</option>
                              <option value="Requires timeline adjustment">Requires timeline adjustment</option>
                              <option value="Temporary sprint peak only">Temporary sprint peak only</option>
                            </select>
                          </div>
                          <div style={{ gridColumn: "1 / -1", fontSize: 10.5, color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 5, padding: "6px 9px" }}>
                            This request will be saved as <strong>Pending Approval</strong> and routed to the <strong>Approval Center</strong> for Delivery / Project Manager sign-off.
                          </div>
                        </div>
                      ) : (
                        <div className="al-field">
                          <label>Manager Override Approver <span className="al-req">*</span></label>
                          <input
                            className="al-input"
                            value={details.overrideApprovedBy}
                            onChange={(e) => setDetails({ ...details, overrideApprovedBy: e.target.value })}
                            placeholder="Enter approving Delivery / Project Manager name"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="al-field" style={{ gridColumn: "1 / -1" }}>
                    <label>Notes (Optional)</label>
                    <textarea
                      className="al-textarea"
                      rows={2}
                      value={details.notes}
                      onChange={(e) => setDetails({ ...details, notes: e.target.value })}
                      placeholder="Working on UI modules, deliverables, or onboarding notes..."
                    />
                  </div>
                </div>
              </section>
            )}

            {/* STEP 4: Review & Confirm (RES-003 Panel 5) */}
            {step === 4 && (
              <section>
                <h2>Review Allocation</h2>
                <table className="al-review-table">
                  <tbody>
                    <tr>
                      <td className="al-review-key">Project</td>
                      <td className="al-review-val">{selectedProject?.projectName || "—"}</td>
                      <td className="al-review-key">Client</td>
                      <td className="al-review-val">{selectedProject?.clientName || "Internal"}</td>
                    </tr>
                    <tr>
                      <td className="al-review-key">Resource</td>
                      <td className="al-review-val">{selectedResource?.name || "—"}</td>
                      <td className="al-review-key">Role</td>
                      <td className="al-review-val">{details.role || selectedResource?.designationName || "Developer"}</td>
                    </tr>
                    <tr>
                      <td className="al-review-key">Allocation Type</td>
                      <td className="al-review-val">{details.allocationType.replace("_", " ")}</td>
                      <td className="al-review-key">Allocation</td>
                      <td className="al-review-val">{details.allocationPercent}% (Total: {projectedLoad}%)</td>
                    </tr>
                    <tr>
                      <td className="al-review-key">Start Date</td>
                      <td className="al-review-val">{formatShortDate(details.startDate)}</td>
                      <td className="al-review-key">End Date</td>
                      <td className="al-review-val">{formatShortDate(details.endDate)}</td>
                    </tr>
                    <tr>
                      <td className="al-review-key">Billing Type</td>
                      <td className="al-review-val">{details.billingType.replace("_", " ")}</td>
                      <td className="al-review-key">Cost</td>
                      <td className="al-review-val">₹ {Number(details.monthlyCost || 0).toLocaleString()} / month</td>
                    </tr>
                    <tr>
                      <td className="al-review-key">Status</td>
                      <td className="al-review-val">
                        {isOverAllocated && details.overrideMode === "APPROVAL_WORKFLOW"
                          ? "PENDING APPROVAL (Override Request)"
                          : details.status}
                      </td>
                      <td className="al-review-key">Override Workflow</td>
                      <td className="al-review-val">
                        {!isOverAllocated
                          ? "Not required"
                          : details.overrideMode === "APPROVAL_WORKFLOW"
                          ? `Routed to Approval Center (${details.overrideImpactAssessment})`
                          : `Direct Override by ${details.overrideApprovedBy}`}
                      </td>
                    </tr>
                    {isOverAllocated && details.overrideJustification && (
                      <tr>
                        <td className="al-review-key">Override Justification</td>
                        <td className="al-review-val" colSpan={3}>{details.overrideJustification}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="al-review-key">Notes</td>
                      <td className="al-review-val" colSpan={3}>{details.notes || "—"}</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            )}
          </main>

          {/* Bottom Footer Bar */}
          <div className="al-footer-bar">
            <div>
              {step > 1 ? (
                <button type="button" className="al-btn" onClick={handleBack}>
                  <ArrowLeft size={13} /> Back
                </button>
              ) : (
                <Link href="/resources/allocate" className="al-btn">
                  <ArrowLeft size={13} /> Back to Allocations
                </Link>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/resources/allocate" className="al-btn">Cancel</Link>
              {step < 4 ? (
                <button type="button" className="al-btn al-btn-primary" onClick={handleNext}>
                  Next: {STEPS[step].label} <ArrowRight size={13} />
                </button>
              ) : (
                <button type="button" className="al-btn al-btn-success" disabled={submitting} onClick={handleConfirmAllocation}>
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {submitting
                    ? "Submitting..."
                    : isOverAllocated && details.overrideMode === "APPROVAL_WORKFLOW"
                    ? "Submit for Approval"
                    : "Confirm Allocation"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Sticky Summary Card */}
        <aside className="al-summary-card">
          <h2>Allocation Summary</h2>
          <div className="al-summary-row"><span>Step</span><strong>{step} of 4</strong></div>
          <div className="al-summary-row"><span>Project</span><strong>{selectedProject?.projectName || "Not selected"}</strong></div>
          <div className="al-summary-row"><span>Resource</span><strong>{selectedResource?.name || "Not selected"}</strong></div>
          <div className="al-summary-row"><span>Current Load</span><strong>{currentLoad}%</strong></div>
          <div className="al-summary-row"><span>New Allocation</span><strong>+{details.allocationPercent}%</strong></div>
          <div className="al-summary-row">
            <span>Projected Load</span>
            <strong style={{ color: projectedLoad > 100 ? "#dc2626" : projectedLoad > 80 ? "#d97706" : "#079b62" }}>
              {projectedLoad}%
            </strong>
          </div>
          <div className="al-summary-row"><span>Est. Monthly Hours</span><strong>{monthlyHours} hrs/mo</strong></div>
          <div className="al-summary-row"><span>Duration</span><strong>{formatShortDate(details.startDate)} – {formatShortDate(details.endDate)}</strong></div>

          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b", marginBottom: 4 }}>
              <span>Utilization Preview</span>
              <span>{projectedLoad}%</span>
            </div>
            <div className="al-bar-track">
              <div
                className="al-bar-fill"
                style={{
                  width: `${Math.min(100, projectedLoad)}%`,
                  background: projectedLoad > 100 ? "#dc2626" : projectedLoad > 80 ? "#f59e0b" : "#079b62",
                }}
              />
            </div>
          </div>

          <div className="al-tips-box">
            <h4>Allocation Guardrails</h4>
            <p>• ≤ 80%: Optimal capacity (Green)</p>
            <p>• 81% – 100%: High load (Amber)</p>
            <p>• &gt; 100%: Over-allocated — requires Manager Override approver</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function AllocateResourceNewPage() {
  return (
    <Suspense fallback={<div className="al-page">Loading allocation wizard...</div>}>
      <AllocateResourceWizardInner />
    </Suspense>
  );
}
