"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Award,
  Plus,
  Trash2,
  Edit3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  X,
  Save,
} from "lucide-react";
import {
  resourceApi,
  allocationApi,
  lookupApi,
  ResourceItem,
  AllocationItem,
  DepartmentLite,
  DesignationLite,
  formatShortDate,
  getInitials,
  compressAvatarImage,
} from "@/lib/resources/api";
import "@/components/resources/resource-capacity.css";

const WORK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ResourceProfile({ resourceId }: { resourceId: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<ResourceItem | null>(null);
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentLite[]>([]);
  const [designations, setDesignations] = useState<DesignationLite[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "skills" | "allocations" | "availability" | "documents" | "settings">("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add skill / cert / doc forms
  const [newSkill, setNewSkill] = useState({ skill: "", level: 4, experienceMonths: 12 });
  const [newCert, setNewCert] = useState({ name: "", issuer: "", credentialId: "" });
  const [newDoc, setNewDoc] = useState({ name: "", type: "PDF", url: "" });

  // Edit profile modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: "",
    email: "",
    phone: "",
    location: "",
    workMode: "HYBRID" as ResourceItem["workMode"],
    departmentId: "",
    designationId: "",
    employmentType: "FULL_TIME" as ResourceItem["employmentType"],
    reportingManagerName: "",
    primarySkill: "",
    aboutMe: "",
    avatarUrl: "",
  });

  // Availability edit state
  const [availForm, setAvailForm] = useState({
    workingHoursPerDay: 8,
    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    status: "ACTIVE" as ResourceItem["status"],
    benchReason: "",
    availableFrom: "",
    expectedAllocationDate: "",
    noticePeriodDays: 30,
    availabilityNotes: "",
  });

  // Settings state
  const [settingsForm, setSettingsForm] = useState({
    hourlyCost: 0,
    billingRate: 0,
    allowOverAllocation: false,
    emailNotifications: true,
    autoAcceptTasks: false,
  });

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, deptList, desigList] = await Promise.all([
        resourceApi.get(resourceId),
        lookupApi.departments().catch(() => []),
        lookupApi.designations().catch(() => []),
      ]);
      setProfile(res);
      setDepartments(deptList);
      setDesignations(desigList);

      if (res.allocations) {
        setAllocations(res.allocations);
      } else if (res.employeeId) {
        const allocs = await allocationApi.list({ employeeId: res.employeeId }).catch(() => []);
        setAllocations(allocs);
      }

      setEditForm({
        displayName: res.name,
        email: res.email,
        phone: res.phone,
        location: res.location,
        workMode: res.workMode,
        departmentId: res.departmentId || "",
        designationId: res.designationId || "",
        employmentType: res.employmentType,
        reportingManagerName: res.reportingManagerName,
        primarySkill: res.primarySkill,
        aboutMe: res.aboutMe,
        avatarUrl: res.avatarUrl || "",
      });

      setAvailForm({
        workingHoursPerDay: res.workingHoursPerDay,
        workingDays: res.workingDays,
        status: res.status,
        benchReason: res.benchReason,
        availableFrom: res.availableFrom ? res.availableFrom.slice(0, 10) : "",
        expectedAllocationDate: res.expectedAllocationDate ? res.expectedAllocationDate.slice(0, 10) : "",
        noticePeriodDays: res.noticePeriodDays,
        availabilityNotes: res.availabilityNotes,
      });

      setSettingsForm({
        hourlyCost: res.hourlyCost,
        billingRate: res.billingRate,
        allowOverAllocation: res.preferences.allowOverAllocation,
        emailNotifications: res.preferences.emailNotifications,
        autoAcceptTasks: res.preferences.autoAcceptTasks,
      });
    } catch (e: any) {
      setError(e?.message || "Resource not found");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [resourceId]);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleSaveEdit = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const updated = await resourceApi.update(profile.id, {
        displayName: editForm.displayName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        location: editForm.location.trim(),
        workMode: editForm.workMode,
        departmentId: editForm.departmentId || null,
        designationId: editForm.designationId || null,
        employmentType: editForm.employmentType,
        reportingManagerName: editForm.reportingManagerName.trim(),
        primarySkill: editForm.primarySkill.trim(),
        aboutMe: editForm.aboutMe.trim(),
        avatarUrl: editForm.avatarUrl,
      });
      setProfile({ ...updated, allocations });
      setShowEditModal(false);
      flash("Resource profile updated.");
    } catch (e: any) {
      setError(e?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = async () => {
    if (!profile || !newSkill.skill.trim()) return;
    setSaving(true);
    try {
      const nextMatrix = [...profile.skillsMatrix, { skill: newSkill.skill.trim(), level: newSkill.level, experienceMonths: newSkill.experienceMonths, lastUsed: new Date().toISOString() }];
      const nextSecondary = Array.from(new Set([...profile.secondarySkills, newSkill.skill.trim()]));
      const updated = await resourceApi.update(profile.id, {
        skillsMatrix: nextMatrix,
        secondarySkills: nextSecondary,
        primarySkill: profile.primarySkill || newSkill.skill.trim(),
      });
      setProfile({ ...updated, allocations });
      setNewSkill({ skill: "", level: 4, experienceMonths: 12 });
      flash("Skill added.");
    } catch (e: any) {
      setError(e?.message || "Failed to add skill");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSkill = async (idx: number) => {
    if (!profile) return;
    setSaving(true);
    try {
      const nextMatrix = profile.skillsMatrix.filter((_, i) => i !== idx);
      const updated = await resourceApi.update(profile.id, { skillsMatrix: nextMatrix });
      setProfile({ ...updated, allocations });
      flash("Skill removed.");
    } catch (e: any) {
      setError(e?.message || "Failed to remove skill");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCert = async () => {
    if (!profile || !newCert.name.trim()) return;
    setSaving(true);
    try {
      const nextCerts = [...profile.certifications, { name: newCert.name.trim(), issuer: newCert.issuer.trim(), credentialId: newCert.credentialId.trim(), issueDate: new Date().toISOString() }];
      const updated = await resourceApi.update(profile.id, { certifications: nextCerts });
      setProfile({ ...updated, allocations });
      setNewCert({ name: "", issuer: "", credentialId: "" });
      flash("Certification added.");
    } catch (e: any) {
      setError(e?.message || "Failed to add certification");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCert = async (idx: number) => {
    if (!profile) return;
    setSaving(true);
    try {
      const nextCerts = profile.certifications.filter((_, i) => i !== idx);
      const updated = await resourceApi.update(profile.id, { certifications: nextCerts });
      setProfile({ ...updated, allocations });
    } catch (e: any) {
      setError(e?.message || "Failed to remove certification");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAvailability = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const monthly = Math.round(availForm.workingHoursPerDay * availForm.workingDays.length * 4.33);
      const updated = await resourceApi.update(profile.id, {
        workingHoursPerDay: availForm.workingHoursPerDay,
        workingDaysPerWeek: availForm.workingDays.length,
        workingDays: availForm.workingDays,
        monthlyCapacityHours: monthly,
        status: availForm.status,
        benchReason: availForm.benchReason,
        availableFrom: availForm.availableFrom || null,
        expectedAllocationDate: availForm.expectedAllocationDate || null,
        noticePeriodDays: availForm.noticePeriodDays,
        availabilityNotes: availForm.availabilityNotes,
      });
      setProfile({ ...updated, allocations });
      flash("Availability schedule saved.");
    } catch (e: any) {
      setError(e?.message || "Failed to update availability");
    } finally {
      setSaving(false);
    }
  };

  const handleAddDocument = async () => {
    if (!profile || !newDoc.name.trim()) return;
    setSaving(true);
    try {
      const nextDocs = [...profile.documents, { name: newDoc.name.trim(), type: newDoc.type, url: newDoc.url.trim(), uploadedAt: new Date().toISOString() }];
      const updated = await resourceApi.update(profile.id, { documents: nextDocs });
      setProfile({ ...updated, allocations });
      setNewDoc({ name: "", type: "PDF", url: "" });
      flash("Document linked.");
    } catch (e: any) {
      setError(e?.message || "Failed to save document");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const updated = await resourceApi.update(profile.id, {
        hourlyCost: Number(settingsForm.hourlyCost || 0),
        billingRate: Number(settingsForm.billingRate || 0),
        preferences: {
          allowOverAllocation: settingsForm.allowOverAllocation,
          emailNotifications: settingsForm.emailNotifications,
          autoAcceptTasks: settingsForm.autoAcceptTasks,
        },
      });
      setProfile({ ...updated, allocations });
      flash("Settings saved.");
    } catch (e: any) {
      setError(e?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReleaseAllocation = async (allocId: string) => {
    try {
      await allocationApi.update(allocId, { status: "RELEASED" });
      await loadProfile();
      flash("Allocation released.");
    } catch (e: any) {
      setError(e?.message || "Failed to release allocation");
    }
  };

  if (loading) {
    return (
      <div className="rc-page">
        <div className="rc-card rc-empty">Loading resource profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rc-page">
        <div className="rc-alert rc-alert-critical">
          <AlertTriangle size={14} /> <span>{error || "Resource not found."}</span>
        </div>
        <Link href="/resources" className="rc-btn rc-btn-outline" style={{ width: "fit-content" }}>
          <ArrowLeft size={13} /> Back to Resource Directory
        </Link>
      </div>
    );
  }

  const activeAllocs = allocations.filter((a) => !["CANCELLED", "RELEASED", "COMPLETED"].includes(a.status));
  const totalAllocPct = activeAllocs.reduce((s, a) => s + a.allocationPercent, 0);
  const availPct = Math.max(0, 100 - totalAllocPct);

  // Donut stroke math
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const allocDash = (Math.min(100, totalAllocPct) / 100) * circumference;

  return (
    <div className="rc-page">
      {/* Top Breadcrumb */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <button type="button" className="rc-btn rc-btn-ghost rc-btn-sm" onClick={() => router.push("/resources")}>
          <ArrowLeft size={13} /> Resource Management / Resource Profile
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="rc-btn rc-btn-outline" onClick={() => setShowEditModal(true)}>
            <Edit3 size={13} /> Edit Profile
          </button>
          <button type="button" className="rc-btn rc-btn-primary" onClick={() => router.push(`/resources/allocate?resourceId=${profile.id}`)}>
            <Plus size={13} /> Allocate to Project
          </button>
        </div>
      </div>

      {notice && (
        <div className="rc-alert rc-alert-healthy">
          <CheckCircle2 size={14} /> <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="rc-alert rc-alert-critical">
          <AlertTriangle size={14} /> <span>{error}</span>
        </div>
      )}

      {/* Profile Header Card matching RES-002 */}
      <div className="rc-card">
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="rc-avatar rc-avatar-lg" style={{ overflow: "hidden" }}>
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                getInitials(profile.name)
              )}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h1 className="rc-title">{profile.name}</h1>
                <span className={`rc-badge ${totalAllocPct > 100 ? "rc-badge-red" : profile.status === "BENCH" ? "rc-badge-blue" : profile.status === "ON_LEAVE" ? "rc-badge-amber" : "rc-badge-green"}`}>
                  {totalAllocPct > 100 ? "Overallocated" : profile.status.replace("_", " ")}
                </span>
                {profile.employeeCode && <span className="rc-badge rc-badge-slate">{profile.employeeCode}</span>}
              </div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                {profile.designationName} · {profile.departmentName} · {profile.employmentType.replace("_", " ")}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 6, fontSize: 11, color: "#64748b" }}>
                {profile.email && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Mail size={12} /> {profile.email}</span>}
                {profile.phone && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Phone size={12} /> {profile.phone}</span>}
                {profile.location && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {profile.location} ({profile.workMode})</span>}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10.5, color: "#64748b" }}>Current Allocation</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: totalAllocPct > 100 ? "#dc2626" : totalAllocPct > 80 ? "#d97706" : "#16a34a" }}>{totalAllocPct}%</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10.5, color: "#64748b" }}>Availability</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{availPct}%</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10.5, color: "#64748b" }}>Monthly Capacity</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#2563eb" }}>{profile.monthlyCapacityHours}h</div>
            </div>
          </div>
        </div>

        {/* Profile Tabs matching RES-002 */}
        <div className="rc-tabs" style={{ marginTop: 14 }}>
          {[
            { id: "overview", label: "Overview" },
            { id: "skills", label: `Skills & Certs (${profile.skillsMatrix.length})` },
            { id: "allocations", label: `Allocations (${allocations.length})` },
            { id: "availability", label: "Availability" },
            { id: "documents", label: `Documents (${profile.documents.length})` },
            { id: "settings", label: "Settings" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              className={`rc-tab ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id as any)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="rc-grid-2">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="rc-card">
              <div className="rc-card-header">
                <h3 className="rc-card-title">About &amp; Employment Details</h3>
              </div>
              <p style={{ color: "#475569", margin: "0 0 12px" }}>
                {profile.aboutMe || "No bio added yet. Click Edit Profile to add a professional summary."}
              </p>
              <div className="rc-grid-2" style={{ fontSize: 11.5 }}>
                <div><span style={{ color: "#64748b" }}>Department:</span> <strong>{profile.departmentName}</strong></div>
                <div><span style={{ color: "#64748b" }}>Role:</span> <strong>{profile.designationName}</strong></div>
                <div><span style={{ color: "#64748b" }}>Reporting Manager:</span> <strong>{profile.reportingManagerName || "—"}</strong></div>
                <div><span style={{ color: "#64748b" }}>Date of Joining:</span> <strong>{formatShortDate(profile.dateOfJoining)}</strong></div>
                <div><span style={{ color: "#64748b" }}>Work Mode:</span> <strong>{profile.workMode}</strong></div>
                <div><span style={{ color: "#64748b" }}>Time Zone:</span> <strong>{profile.timeZone}</strong></div>
                <div><span style={{ color: "#64748b" }}>Working Schedule:</span> <strong>{profile.workingHoursPerDay}h/day ({profile.workingDays.join(", ")})</strong></div>
                <div><span style={{ color: "#64748b" }}>Primary Skill:</span> <strong>{profile.primarySkill || "—"}</strong></div>
              </div>
            </div>

            <div className="rc-card">
              <div className="rc-card-header">
                <h3 className="rc-card-title">Top Skills &amp; Certifications</h3>
                <button type="button" className="rc-btn rc-btn-ghost rc-btn-sm" onClick={() => setActiveTab("skills")}>Manage</button>
              </div>
              {profile.skillsMatrix.length === 0 ? (
                <div style={{ color: "#64748b", fontSize: 11.5 }}>No skills recorded yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {profile.skillsMatrix.slice(0, 6).map((sk, i) => (
                    <div key={`${sk.skill}-${i}`}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}>
                        <span style={{ fontWeight: 600 }}>{sk.skill}</span>
                        <span style={{ color: "#64748b" }}>Level {sk.level}/5 · {sk.experienceMonths || 0} mos</span>
                      </div>
                      <div className="rc-bar-track">
                        <div className="rc-bar-fill" style={{ width: `${(sk.level / 5) * 100}%`, background: "#2563eb" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {profile.certifications.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Certifications</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {profile.certifications.map((c, idx) => (
                      <span key={idx} className="rc-badge rc-badge-blue">
                        <Award size={11} /> {c.name}{c.issuer ? ` (${c.issuer})` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="rc-card">
              <div className="rc-card-header">
                <h3 className="rc-card-title">Capacity &amp; Availability Breakdown</h3>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                <svg width="96" height="96" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    fill="none"
                    stroke={totalAllocPct > 100 ? "#dc2626" : totalAllocPct > 80 ? "#f59e0b" : "#2563eb"}
                    strokeWidth="10"
                    strokeDasharray={`${allocDash} ${circumference}`}
                    strokeLinecap="round"
                    transform="rotate(-90 48 48)"
                  />
                  <text x="48" y="47" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0f172a">{totalAllocPct}%</text>
                  <text x="48" y="60" textAnchor="middle" fontSize="9" fill="#64748b">Allocated</text>
                </svg>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Monthly Capacity</span>
                    <strong>{profile.monthlyCapacityHours} hrs</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Allocated Hours (est.)</span>
                    <strong>{Math.round((totalAllocPct / 100) * profile.monthlyCapacityHours)} hrs</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Available Hours</span>
                    <strong style={{ color: "#16a34a" }}>{Math.max(0, Math.round((availPct / 100) * profile.monthlyCapacityHours))} hrs</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Active Projects</span>
                    <strong>{activeAllocs.length}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="rc-card">
              <div className="rc-card-header">
                <h3 className="rc-card-title">Active Project Allocations</h3>
                <Link href={`/resources/allocate?resourceId=${profile.id}`} className="rc-btn rc-btn-outline rc-btn-sm">+ Allocate</Link>
              </div>
              {activeAllocs.length === 0 ? (
                <div className="rc-empty" style={{ padding: "18px 8px" }}>No active project allocations. Currently on bench.</div>
              ) : (
                <div className="rc-table-wrap">
                  <table className="rc-table">
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>Role</th>
                        <th>Alloc %</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeAllocs.map((a) => (
                        <tr key={a.id}>
                          <td><strong>{a.projectName}</strong></td>
                          <td>{a.role}</td>
                          <td><span className="rc-badge rc-badge-blue">{a.allocationPercent}%</span></td>
                          <td style={{ fontSize: 10.5, color: "#64748b" }}>
                            {formatShortDate(a.startDate)} – {formatShortDate(a.endDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: SKILLS & CERTIFICATIONS */}
      {activeTab === "skills" && (
        <div className="rc-grid-2">
          <div className="rc-card">
            <div className="rc-card-header">
              <h3 className="rc-card-title">Skills Matrix</h3>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              <input
                className="rc-input"
                style={{ flex: 1, minWidth: 140 }}
                placeholder="Skill name (e.g. Next.js)"
                value={newSkill.skill}
                onChange={(e) => setNewSkill({ ...newSkill, skill: e.target.value })}
              />
              <select
                className="rc-select"
                value={newSkill.level}
                onChange={(e) => setNewSkill({ ...newSkill, level: Number(e.target.value) })}
              >
                {[1, 2, 3, 4, 5].map((lv) => <option key={lv} value={lv}>Level {lv}</option>)}
              </select>
              <input
                className="rc-input"
                type="number"
                style={{ width: 84 }}
                min={0}
                placeholder="Months"
                value={newSkill.experienceMonths}
                onChange={(e) => setNewSkill({ ...newSkill, experienceMonths: Number(e.target.value || 0) })}
              />
              <button type="button" className="rc-btn rc-btn-primary" disabled={saving} onClick={handleAddSkill}>
                <Plus size={13} /> Add
              </button>
            </div>
            {profile.skillsMatrix.length === 0 ? (
              <div className="rc-empty">No skills added yet.</div>
            ) : (
              <table className="rc-table">
                <thead>
                  <tr>
                    <th>Skill</th>
                    <th>Proficiency</th>
                    <th>Exp.</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.skillsMatrix.map((sk, idx) => (
                    <tr key={`${sk.skill}-${idx}`}>
                      <td><strong>{sk.skill}</strong></td>
                      <td style={{ width: 140 }}>
                        <div className="rc-bar-track">
                          <div className="rc-bar-fill" style={{ width: `${(sk.level / 5) * 100}%`, background: "#2563eb" }} />
                        </div>
                      </td>
                      <td>{sk.experienceMonths || 0}m</td>
                      <td style={{ textAlign: "right" }}>
                        <button type="button" className="rc-btn rc-btn-danger rc-btn-sm" onClick={() => handleRemoveSkill(idx)}>
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rc-card">
            <div className="rc-card-header">
              <h3 className="rc-card-title">Certifications</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              <input className="rc-input" placeholder="Certification Name (e.g. AWS Solutions Architect)" value={newCert.name} onChange={(e) => setNewCert({ ...newCert, name: e.target.value })} />
              <div style={{ display: "flex", gap: 6 }}>
                <input className="rc-input" style={{ flex: 1 }} placeholder="Issuer (e.g. Amazon)" value={newCert.issuer} onChange={(e) => setNewCert({ ...newCert, issuer: e.target.value })} />
                <input className="rc-input" style={{ flex: 1 }} placeholder="Credential ID" value={newCert.credentialId} onChange={(e) => setNewCert({ ...newCert, credentialId: e.target.value })} />
                <button type="button" className="rc-btn rc-btn-primary" disabled={saving} onClick={handleAddCert}>
                  <Plus size={13} /> Add
                </button>
              </div>
            </div>
            {profile.certifications.length === 0 ? (
              <div className="rc-empty">No certifications added yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {profile.certifications.map((c, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 10.5, color: "#64748b" }}>{c.issuer || "Verified"} {c.credentialId ? `· ID: ${c.credentialId}` : ""}</div>
                    </div>
                    <button type="button" className="rc-btn rc-btn-danger rc-btn-sm" onClick={() => handleRemoveCert(idx)}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: ALLOCATIONS */}
      {activeTab === "allocations" && (
        <div className="rc-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid #e2e8f0" }}>
            <h3 className="rc-card-title">Allocation History ({allocations.length})</h3>
            <Link href={`/resources/allocate?resourceId=${profile.id}`} className="rc-btn rc-btn-primary rc-btn-sm">
              <Plus size={12} /> Allocate to Project
            </Link>
          </div>
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Role</th>
                  <th>Type</th>
                  <th>Allocation</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {allocations.length === 0 ? (
                  <tr><td colSpan={8} className="rc-empty">No allocations found for this resource.</td></tr>
                ) : (
                  allocations.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <strong>{a.projectName}</strong>
                        <div style={{ fontSize: 10, color: "#64748b" }}>{a.projectCode}</div>
                      </td>
                      <td>{a.role}</td>
                      <td>{a.allocationType.replace("_", " ")}</td>
                      <td><strong>{a.allocationPercent}%</strong> ({a.allocatedHours}h)</td>
                      <td>{formatShortDate(a.startDate)}</td>
                      <td>{formatShortDate(a.endDate)}</td>
                      <td>
                        <span className={`rc-badge ${a.status === "ACTIVE" ? "rc-badge-green" : a.status === "PLANNED" ? "rc-badge-blue" : "rc-badge-slate"}`}>
                          {a.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {a.status === "ACTIVE" || a.status === "PLANNED" ? (
                          <button type="button" className="rc-btn rc-btn-outline rc-btn-sm" onClick={() => handleReleaseAllocation(a.id)}>
                            Release
                          </button>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: 10.5 }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: AVAILABILITY */}
      {activeTab === "availability" && (
        <div className="rc-card">
          <div className="rc-card-header">
            <h3 className="rc-card-title">Working Schedule &amp; Bench Availability</h3>
            <button type="button" className="rc-btn rc-btn-primary rc-btn-sm" disabled={saving} onClick={handleSaveAvailability}>
              <Save size={12} /> {saving ? "Saving..." : "Save Schedule"}
            </button>
          </div>
          <div className="rc-grid-2">
            <div className="rc-field">
              <label>Working Hours / Day</label>
              <input className="rc-input" type="number" min={1} max={16} value={availForm.workingHoursPerDay} onChange={(e) => setAvailForm({ ...availForm, workingHoursPerDay: Number(e.target.value || 8) })} />
            </div>
            <div className="rc-field">
              <label>Availability Status</label>
              <select className="rc-select" value={availForm.status} onChange={(e) => setAvailForm({ ...availForm, status: e.target.value as any })}>
                <option value="ACTIVE">Active</option>
                <option value="BENCH">On Bench</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div className="rc-field">
              <label>Available From</label>
              <input className="rc-input" type="date" value={availForm.availableFrom} onChange={(e) => setAvailForm({ ...availForm, availableFrom: e.target.value })} />
            </div>
            <div className="rc-field">
              <label>Expected Allocation Date</label>
              <input className="rc-input" type="date" value={availForm.expectedAllocationDate} onChange={(e) => setAvailForm({ ...availForm, expectedAllocationDate: e.target.value })} />
            </div>
            <div className="rc-field">
              <label>Bench Reason</label>
              <input className="rc-input" value={availForm.benchReason} onChange={(e) => setAvailForm({ ...availForm, benchReason: e.target.value })} placeholder="e.g. Project completed, New joiner" />
            </div>
            <div className="rc-field">
              <label>Notice Period (Days)</label>
              <input className="rc-input" type="number" min={0} value={availForm.noticePeriodDays} onChange={(e) => setAvailForm({ ...availForm, noticePeriodDays: Number(e.target.value || 0) })} />
            </div>
            <div className="rc-field" style={{ gridColumn: "1 / -1" }}>
              <label>Working Days</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                {WORK_DAYS.map((day) => {
                  const active = availForm.workingDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      className={`rc-btn rc-btn-sm ${active ? "rc-btn-primary" : "rc-btn-outline"}`}
                      onClick={() =>
                        setAvailForm((prev) => ({
                          ...prev,
                          workingDays: active ? prev.workingDays.filter((d) => d !== day) : [...prev.workingDays, day],
                        }))
                      }
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="rc-field" style={{ gridColumn: "1 / -1" }}>
              <label>Availability Notes</label>
              <textarea className="rc-textarea" rows={3} value={availForm.availabilityNotes} onChange={(e) => setAvailForm({ ...availForm, availabilityNotes: e.target.value })} />
            </div>
          </div>
        </div>
      )}

      {/* TAB: DOCUMENTS */}
      {activeTab === "documents" && (
        <div className="rc-card">
          <div className="rc-card-header">
            <h3 className="rc-card-title">Resource Documents</h3>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <input className="rc-input" style={{ flex: 1, minWidth: 160 }} placeholder="Document title (e.g. Resume 2026)" value={newDoc.name} onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })} />
            <select className="rc-select" value={newDoc.type} onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value })}>
              <option value="PDF">PDF</option>
              <option value="DOCX">DOCX</option>
              <option value="CERT">Certificate</option>
              <option value="LINK">Link</option>
            </select>
            <input className="rc-input" style={{ flex: 1, minWidth: 180 }} placeholder="Document URL" value={newDoc.url} onChange={(e) => setNewDoc({ ...newDoc, url: e.target.value })} />
            <button type="button" className="rc-btn rc-btn-primary" disabled={saving} onClick={handleAddDocument}>
              <Plus size={13} /> Add Document
            </button>
          </div>
          {profile.documents.length === 0 ? (
            <div className="rc-empty">No documents uploaded or linked yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {profile.documents.map((doc, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FileText size={15} color="#2563eb" />
                    <div>
                      <div style={{ fontWeight: 600 }}>{doc.name}</div>
                      <div style={{ fontSize: 10.5, color: "#64748b" }}>{doc.type} · Added {formatShortDate(doc.uploadedAt)}</div>
                    </div>
                  </div>
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noreferrer" className="rc-btn rc-btn-outline rc-btn-sm">Open</a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: SETTINGS */}
      {activeTab === "settings" && (
        <div className="rc-card">
          <div className="rc-card-header">
            <h3 className="rc-card-title">Costing &amp; Allocation Preferences</h3>
            <button type="button" className="rc-btn rc-btn-primary rc-btn-sm" disabled={saving} onClick={handleSaveSettings}>
              <Save size={12} /> {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
          <div className="rc-grid-2">
            <div className="rc-field">
              <label>Hourly Internal Cost (₹)</label>
              <input className="rc-input" type="number" min={0} value={settingsForm.hourlyCost} onChange={(e) => setSettingsForm({ ...settingsForm, hourlyCost: Number(e.target.value || 0) })} />
            </div>
            <div className="rc-field">
              <label>Client Billing Rate (₹/hr)</label>
              <input className="rc-input" type="number" min={0} value={settingsForm.billingRate} onChange={(e) => setSettingsForm({ ...settingsForm, billingRate: Number(e.target.value || 0) })} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={settingsForm.allowOverAllocation} onChange={(e) => setSettingsForm({ ...settingsForm, allowOverAllocation: e.target.checked })} />
              Allow over-allocation (&gt;100%) with manager override
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={settingsForm.emailNotifications} onChange={(e) => setSettingsForm({ ...settingsForm, emailNotifications: e.target.checked })} />
              Send email notifications on new project allocations
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={settingsForm.autoAcceptTasks} onChange={(e) => setSettingsForm({ ...settingsForm, autoAcceptTasks: e.target.checked })} />
              Auto-accept assigned sprint tasks
            </label>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="rc-modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="rc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rc-modal-header">
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Edit Resource Profile</h2>
              <button type="button" className="rc-btn rc-btn-ghost rc-btn-sm" onClick={() => setShowEditModal(false)}><X size={15} /></button>
            </div>
            <div className="rc-modal-body">
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 10, borderBottom: "1px solid #f1f5f9" }}>
                <div className="rc-avatar rc-avatar-lg" style={{ overflow: "hidden" }}>
                  {editForm.avatarUrl ? (
                    <img src={editForm.avatarUrl} alt={editForm.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    getInitials(editForm.displayName || profile.name)
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label className="rc-btn rc-btn-outline rc-btn-sm" style={{ width: "fit-content" }}>
                    Upload New Photo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      style={{ display: "none" }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          setError("Profile photo must be 2 MB or smaller.");
                          return;
                        }
                        try {
                          const dataUrl = await compressAvatarImage(file, 256);
                          setEditForm((prev) => ({ ...prev, avatarUrl: dataUrl }));
                        } catch {
                          setError("Invalid image file.");
                        }
                      }}
                    />
                  </label>
                  <span style={{ fontSize: 10, color: "#64748b" }}>JPG, PNG (Max 2 MB) · Persisted in database</span>
                </div>
              </div>
              <div className="rc-grid-2">
                <div className="rc-field">
                  <label>Full Name</label>
                  <input className="rc-input" value={editForm.displayName} onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} />
                </div>
                <div className="rc-field">
                  <label>Email</label>
                  <input className="rc-input" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
                <div className="rc-field">
                  <label>Phone</label>
                  <input className="rc-input" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
                <div className="rc-field">
                  <label>Location</label>
                  <input className="rc-input" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
                </div>
                <div className="rc-field">
                  <label>Department</label>
                  <select className="rc-select" value={editForm.departmentId} onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}>
                    <option value="">Unassigned</option>
                    {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="rc-field">
                  <label>Role / Designation</label>
                  <select className="rc-select" value={editForm.designationId} onChange={(e) => setEditForm({ ...editForm, designationId: e.target.value })}>
                    <option value="">Team Member</option>
                    {designations.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="rc-field">
                  <label>Work Mode</label>
                  <select className="rc-select" value={editForm.workMode} onChange={(e) => setEditForm({ ...editForm, workMode: e.target.value as any })}>
                    <option value="HYBRID">Hybrid</option>
                    <option value="ONSITE">Onsite</option>
                    <option value="REMOTE">Remote</option>
                  </select>
                </div>
                <div className="rc-field">
                  <label>Primary Skill</label>
                  <input className="rc-input" value={editForm.primarySkill} onChange={(e) => setEditForm({ ...editForm, primarySkill: e.target.value })} />
                </div>
                <div className="rc-field" style={{ gridColumn: "1 / -1" }}>
                  <label>Reporting Manager</label>
                  <input className="rc-input" value={editForm.reportingManagerName} onChange={(e) => setEditForm({ ...editForm, reportingManagerName: e.target.value })} />
                </div>
                <div className="rc-field" style={{ gridColumn: "1 / -1" }}>
                  <label>About / Bio</label>
                  <textarea className="rc-textarea" rows={3} value={editForm.aboutMe} onChange={(e) => setEditForm({ ...editForm, aboutMe: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="rc-modal-footer">
              <button type="button" className="rc-btn rc-btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button type="button" className="rc-btn rc-btn-primary" disabled={saving} onClick={handleSaveEdit}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
