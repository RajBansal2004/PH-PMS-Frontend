"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  X,
  Upload,
  Phone,
  Plus,
  Check,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from "lucide-react";
import {
  resourceApi,
  lookupApi,
  ResourceItem,
  DepartmentLite,
  DesignationLite,
  getInitials,
  compressAvatarImage,
} from "@/lib/resources/api";
import "./add-resource.css";

const STEPS = [
  { id: 1, label: "Basic Info" },
  { id: 2, label: "Role & Skills" },
  { id: 3, label: "Employment" },
  { id: 4, label: "Work Details" },
  { id: 5, label: "Review" },
];

const WORK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TIME_ZONES = [
  "(GMT+05:30) India Standard Time",
  "(GMT+00:00) Coordinated Universal Time (UTC)",
  "(GMT-05:00) Eastern Time (US & Canada)",
  "(GMT-08:00) Pacific Time (US & Canada)",
  "(GMT+01:00) Central European Time",
  "(GMT+04:00) Gulf Standard Time (Dubai)",
  "(GMT+08:00) Singapore Standard Time",
];

export default function AddNewResourceWizardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState(1);
  const [departments, setDepartments] = useState<DepartmentLite[]>([]);
  const [designations, setDesignations] = useState<DesignationLite[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [primarySkills, setPrimarySkills] = useState<string[]>([]);
  const [primaryInput, setPrimaryInput] = useState("");
  const [secondarySkills, setSecondarySkills] = useState<string[]>([]);
  const [secondaryInput, setSecondaryInput] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    designationId: "",
    departmentId: "",
    employeeCode: "",
    employmentType: "FULL_TIME" as ResourceItem["employmentType"],
    workMode: "HYBRID" as ResourceItem["workMode"],
    location: "",
    reportingManagerName: "",
    dateOfJoining: new Date().toISOString().slice(0, 10),
    hourlyCost: "",
    billingRate: "",
    aboutMe: "",
    workingHoursPerDay: 8,
    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    availabilityMode: "AVAILABLE" as "AVAILABLE" | "PARTIAL" | "UNAVAILABLE",
    partialPercent: 50,
    timeZone: "(GMT+05:30) India Standard Time",
  });

  useEffect(() => {
    Promise.all([
      lookupApi.departments().catch(() => []),
      lookupApi.designations().catch(() => []),
    ])
      .then(([depts, desigs]) => {
        setDepartments(depts);
        setDesignations(desigs);
      })
      .finally(() => setLoadingLookups(false));
  }, []);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Profile photo must be 2 MB or smaller (JPG, PNG).");
      return;
    }
    try {
      const compressed = await compressAvatarImage(file, 256);
      setPhotoPreview(compressed);
      setError(null);
    } catch {
      setError("Could not process image. Please choose a valid JPG or PNG file.");
    }
  };

  const addPrimarySkill = () => {
    const val = primaryInput.trim();
    if (!val) return;
    if (!primarySkills.some((s) => s.toLowerCase() === val.toLowerCase())) {
      setPrimarySkills((prev) => [...prev, val]);
    }
    setPrimaryInput("");
  };

  const addSecondarySkill = () => {
    const val = secondaryInput.trim();
    if (!val) return;
    if (!secondarySkills.some((s) => s.toLowerCase() === val.toLowerCase())) {
      setSecondarySkills((prev) => [...prev, val]);
    }
    setSecondaryInput("");
  };

  const toggleDay = (day: string) => {
    setForm((prev) => {
      const exists = prev.workingDays.includes(day);
      if (exists && prev.workingDays.length === 1) return prev;
      return {
        ...prev,
        workingDays: exists ? prev.workingDays.filter((d) => d !== day) : [...prev.workingDays, day],
      };
    });
  };

  const validateStep = (targetStep: number): boolean => {
    setError(null);
    if (targetStep === 1) {
      if (!form.firstName.trim()) {
        setError("First Name is required.");
        return false;
      }
      if (!form.lastName.trim()) {
        setError("Last Name is required.");
        return false;
      }
      if (!form.email.trim() || !form.email.includes("@")) {
        setError("A valid Email address is required.");
        return false;
      }
      if (!form.phone.trim()) {
        setError("Phone number is required.");
        return false;
      }
    }
    if (targetStep === 2) {
      if (!form.designationId && designations.length > 0) {
        setError("Please select a Role.");
        return false;
      }
      if (!form.departmentId && departments.length > 0) {
        setError("Please select a Department.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(5, s + 1));
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

  const handleSubmit = async () => {
    if (!validateStep(1)) {
      setStep(1);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const allPrimary = primaryInput.trim()
        ? Array.from(new Set([...primarySkills, primaryInput.trim()]))
        : primarySkills;
      const allSecondary = secondaryInput.trim()
        ? Array.from(new Set([...secondarySkills, secondaryInput.trim()]))
        : secondarySkills;

      const skillsMatrix = [
        ...allPrimary.map((sk) => ({ skill: sk, level: 4, experienceMonths: 24 })),
        ...allSecondary.map((sk) => ({ skill: sk, level: 3, experienceMonths: 12 })),
      ];

      const availabilityPercent =
        form.availabilityMode === "AVAILABLE"
          ? 100
          : form.availabilityMode === "PARTIAL"
          ? Math.max(1, Math.min(99, Number(form.partialPercent || 50)))
          : 0;

      const status: ResourceItem["status"] =
        form.availabilityMode === "UNAVAILABLE"
          ? "ON_LEAVE"
          : form.availabilityMode === "PARTIAL"
          ? "ACTIVE"
          : "BENCH";

      const monthlyCapacityHours = Math.round(
        Number(form.workingHoursPerDay || 8) * (form.workingDays.length || 5) * 4.33
      );

      await resourceApi.create({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        displayName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        employeeCode: form.employeeCode.trim() || undefined,
        departmentId: form.departmentId || undefined,
        designationId: form.designationId || undefined,
        primarySkill: allPrimary.join(", "),
        secondarySkills: allSecondary,
        skillsMatrix,
        employmentType: form.employmentType,
        workMode: form.workMode,
        location: form.location.trim(),
        reportingManagerName: form.reportingManagerName.trim(),
        dateOfJoining: form.dateOfJoining || undefined,
        hourlyCost: form.hourlyCost ? Number(form.hourlyCost) : 0,
        billingRate: form.billingRate ? Number(form.billingRate) : 0,
        aboutMe: form.aboutMe.trim(),
        avatarUrl: photoPreview || "",
        workingHoursPerDay: Number(form.workingHoursPerDay || 8),
        workingDaysPerWeek: form.workingDays.length || 5,
        workingDays: form.workingDays,
        monthlyCapacityHours,
        availabilityPercent,
        currentAllocationPercent: Math.max(0, 100 - availabilityPercent),
        status,
        timeZone: form.timeZone,
      });

      router.push("/resources");
    } catch (e: any) {
      setError(e?.message || "Failed to add resource");
    } finally {
      setSubmitting(false);
    }
  };

  const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
  const selectedDeptName = departments.find((d) => d._id === form.departmentId)?.name || "Not selected";
  const selectedRoleName = designations.find((d) => d._id === form.designationId)?.name || "Not selected";
  const weeklyHours = Number(form.workingHoursPerDay || 8) * (form.workingDays.length || 5);
  const monthlyHours = Math.round(weeklyHours * 4.33);
  const availLabel =
    form.availabilityMode === "AVAILABLE"
      ? "Available (100%)"
      : form.availabilityMode === "PARTIAL"
      ? `Partially Available (${form.partialPercent}%)`
      : "Not Available (0%)";

  return (
    <div className="ar-page">
      {/* Top Breadcrumb & Actions Toolbar (Exact PHEOS Create Wizard Header) */}
      <header className="ar-header">
        <div className="ar-breadcrumb">
          <Link href="/resources">Resource Management</Link>
          <b>›</b>
          <Link href="/resources">Resource Directory</Link>
          <b>›</b>
          <strong>Add New Resource</strong>
        </div>

        <div className="ar-header-actions">
          <Link href="/resources" className="ar-btn">
            <X size={13} /> Cancel
          </Link>
          {step < 5 ? (
            <button type="button" className="ar-btn ar-btn-primary" onClick={handleNext}>
              Next: {STEPS[step].label} <ArrowRight size={13} />
            </button>
          ) : (
            <button type="button" className="ar-btn ar-btn-success" disabled={submitting} onClick={handleSubmit}>
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {submitting ? "Adding..." : "Confirm & Add Resource"}
            </button>
          )}
        </div>
      </header>

      {/* Title Row */}
      <div className="ar-title-row">
        <div className="ar-title-icon">
          <UserPlus size={18} strokeWidth={2} />
        </div>
        <div>
          <h1>Add New Resource</h1>
          <p>Complete the 5-step wizard to onboard a resource with role, skills, working schedule, and default availability</p>
        </div>
      </div>

      {/* Full-Width 5-Step Horizontal Stepper */}
      <nav className="ar-stepper" aria-label="Add Resource steps">
        {STEPS.map((s) => {
          const active = step === s.id;
          const done = step > s.id;
          return (
            <button
              key={s.id}
              type="button"
              className={`ar-step ${active ? "active" : ""} ${done ? "done" : ""}`}
              onClick={() => handleStepClick(s.id)}
            >
              <span>{done ? <Check size={12} strokeWidth={2.5} /> : s.id}</span>
              <b>{s.label}</b>
            </button>
          );
        })}
      </nav>

      {error && (
        <div className="ar-error-banner">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="ar-layout">
        <div className="ar-left-col">
          <main className="ar-main-card">
            {/* STEP 1: Basic Info (Exact RES-001 Panel 4) */}
            {step === 1 && (
              <section>
                <h2>Basic Info</h2>
                <div className="ar-step1-grid">
                  <div className="ar-photo-col">
                    <div className="ar-photo-title">Profile Photo</div>
                    <div className="ar-avatar-preview">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Profile preview" />
                      ) : (
                        <span>{getInitials(fullName || "NR")}</span>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      style={{ display: "none" }}
                      onChange={handlePhotoChange}
                    />
                    <button
                      type="button"
                      className="ar-upload-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={11} /> Upload Photo
                    </button>
                    <span className="ar-photo-hint">JPG, PNG (Max 2 MB)</span>
                  </div>

                  <div className="ar-grid-2">
                    <div className="ar-field">
                      <label>
                        First Name <span className="ar-req">*</span>
                      </label>
                      <input
                        className="ar-input"
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        placeholder="Enter first name"
                      />
                    </div>
                    <div className="ar-field">
                      <label>
                        Last Name <span className="ar-req">*</span>
                      </label>
                      <input
                        className="ar-input"
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        placeholder="Enter last name"
                      />
                    </div>
                    <div className="ar-field">
                      <label>
                        Email <span className="ar-req">*</span>
                      </label>
                      <input
                        className="ar-input"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="name@company.com"
                      />
                    </div>
                    <div className="ar-field">
                      <label>
                        Phone <span className="ar-req">*</span>
                      </label>
                      <div className="ar-input-icon-wrap">
                        <Phone size={12} className="ar-input-icon" />
                        <input
                          className="ar-input"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="+91 98765 12345"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* STEP 2: Role & Skills (Exact RES-001 Panel 5) */}
            {step === 2 && (
              <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h2>Role &amp; Skills</h2>
                <div className="ar-grid-2">
                  <div className="ar-field">
                    <label>
                      Role <span className="ar-req">*</span>
                    </label>
                    <select
                      className="ar-select"
                      value={form.designationId}
                      onChange={(e) => setForm({ ...form, designationId: e.target.value })}
                      disabled={loadingLookups}
                    >
                      <option value="">Select Role</option>
                      {designations.map((d) => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ar-field">
                    <label>
                      Department <span className="ar-req">*</span>
                    </label>
                    <select
                      className="ar-select"
                      value={form.departmentId}
                      onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                      disabled={loadingLookups}
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="ar-field">
                  <label>Primary Skills</label>
                  <div className="ar-skills-box">
                    {primarySkills.map((sk) => (
                      <span key={sk} className="ar-skill-pill">
                        {sk}
                        <button
                          type="button"
                          onClick={() => setPrimarySkills((prev) => prev.filter((x) => x !== sk))}
                          aria-label={`Remove ${sk}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      className="ar-skill-inline-input"
                      placeholder="Type skill & press Enter..."
                      value={primaryInput}
                      onChange={(e) => setPrimaryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          addPrimarySkill();
                        }
                      }}
                    />
                    <button type="button" className="ar-add-skill-btn" onClick={addPrimarySkill}>
                      <Plus size={11} /> Add Skill
                    </button>
                  </div>
                </div>

                <div className="ar-field">
                  <label>Secondary Skills</label>
                  <div className="ar-skills-box">
                    {secondarySkills.map((sk) => (
                      <span key={sk} className="ar-skill-pill">
                        {sk}
                        <button
                          type="button"
                          onClick={() => setSecondarySkills((prev) => prev.filter((x) => x !== sk))}
                          aria-label={`Remove ${sk}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      className="ar-skill-inline-input"
                      placeholder="Type skill & press Enter..."
                      value={secondaryInput}
                      onChange={(e) => setSecondaryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          addSecondarySkill();
                        }
                      }}
                    />
                    <button type="button" className="ar-add-skill-btn" onClick={addSecondarySkill}>
                      <Plus size={11} /> Add Skill
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* STEP 3: Employment */}
            {step === 3 && (
              <section>
                <h2>Employment Details</h2>
                <div className="ar-grid-2">
                  <div className="ar-field">
                    <label>Employment Type</label>
                    <select
                      className="ar-select"
                      value={form.employmentType}
                      onChange={(e) => setForm({ ...form, employmentType: e.target.value as any })}
                    >
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="FREELANCER">Freelancer</option>
                      <option value="INTERN">Intern</option>
                      <option value="CONSULTANT">Consultant</option>
                    </select>
                  </div>
                  <div className="ar-field">
                    <label>Work Mode</label>
                    <select
                      className="ar-select"
                      value={form.workMode}
                      onChange={(e) => setForm({ ...form, workMode: e.target.value as any })}
                    >
                      <option value="HYBRID">Hybrid</option>
                      <option value="ONSITE">Onsite</option>
                      <option value="REMOTE">Remote</option>
                    </select>
                  </div>
                  <div className="ar-field">
                    <label>Employee Code (Optional)</label>
                    <input
                      className="ar-input"
                      value={form.employeeCode}
                      onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
                      placeholder="Auto-generated if left blank"
                    />
                  </div>
                  <div className="ar-field">
                    <label>Date of Joining</label>
                    <input
                      className="ar-input"
                      type="date"
                      value={form.dateOfJoining}
                      onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })}
                    />
                  </div>
                  <div className="ar-field">
                    <label>Location</label>
                    <input
                      className="ar-input"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="e.g. Bengaluru, Karnataka"
                    />
                  </div>
                  <div className="ar-field">
                    <label>Reporting Manager</label>
                    <input
                      className="ar-input"
                      value={form.reportingManagerName}
                      onChange={(e) => setForm({ ...form, reportingManagerName: e.target.value })}
                      placeholder="Reporting manager name"
                    />
                  </div>
                  <div className="ar-field">
                    <label>Hourly Cost (₹)</label>
                    <input
                      className="ar-input"
                      type="number"
                      min={0}
                      value={form.hourlyCost}
                      onChange={(e) => setForm({ ...form, hourlyCost: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="ar-field">
                    <label>Billing Rate (₹/hr)</label>
                    <input
                      className="ar-input"
                      type="number"
                      min={0}
                      value={form.billingRate}
                      onChange={(e) => setForm({ ...form, billingRate: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="ar-field" style={{ gridColumn: "1 / -1" }}>
                    <label>About / Bio (Optional)</label>
                    <textarea
                      className="ar-textarea"
                      rows={2}
                      value={form.aboutMe}
                      onChange={(e) => setForm({ ...form, aboutMe: e.target.value })}
                      placeholder="Brief experience summary..."
                    />
                  </div>
                </div>
              </section>
            )}

            {/* STEP 4: Work Details (Exact RES-001 Panel 6) */}
            {step === 4 && (
              <section>
                <h2>Work Details &amp; Availability</h2>

                <h3 className="ar-subhead">Working Hours</h3>
                <div className="ar-work-hours-row">
                  <div className="ar-field" style={{ width: 105 }}>
                    <label>Hours per Day</label>
                    <input
                      className="ar-input"
                      type="number"
                      min={1}
                      max={16}
                      value={form.workingHoursPerDay}
                      onChange={(e) => setForm({ ...form, workingHoursPerDay: Number(e.target.value || 8) })}
                    />
                  </div>
                  <div className="ar-field" style={{ flex: 1 }}>
                    <label>Working Days</label>
                    <div className="ar-days-row">
                      {WORK_DAYS.map((day) => (
                        <label key={day} className="ar-day-check">
                          <input
                            type="checkbox"
                            checked={form.workingDays.includes(day)}
                            onChange={() => toggleDay(day)}
                          />
                          <span>{day}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <h3 className="ar-subhead">Default Availability</h3>
                <div className="ar-avail-row">
                  <label className="ar-radio-opt">
                    <input
                      type="radio"
                      name="availabilityMode"
                      checked={form.availabilityMode === "AVAILABLE"}
                      onChange={() => setForm({ ...form, availabilityMode: "AVAILABLE" })}
                    />
                    <span>Available</span>
                  </label>

                  <label className="ar-radio-opt">
                    <input
                      type="radio"
                      name="availabilityMode"
                      checked={form.availabilityMode === "PARTIAL"}
                      onChange={() => setForm({ ...form, availabilityMode: "PARTIAL" })}
                    />
                    <span>Partially Available</span>
                    <span className="ar-pct-box">
                      <input
                        type="number"
                        min={1}
                        max={99}
                        disabled={form.availabilityMode !== "PARTIAL"}
                        value={form.partialPercent}
                        onChange={(e) => setForm({ ...form, partialPercent: Number(e.target.value || 50) })}
                      />
                      <span>%</span>
                    </span>
                  </label>

                  <label className="ar-radio-opt">
                    <input
                      type="radio"
                      name="availabilityMode"
                      checked={form.availabilityMode === "UNAVAILABLE"}
                      onChange={() => setForm({ ...form, availabilityMode: "UNAVAILABLE" })}
                    />
                    <span>Not Available</span>
                  </label>
                </div>

                <div className="ar-field">
                  <label>Time Zone</label>
                  <select
                    className="ar-select"
                    value={form.timeZone}
                    onChange={(e) => setForm({ ...form, timeZone: e.target.value })}
                  >
                    {TIME_ZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </section>
            )}

            {/* STEP 5: Review */}
            {step === 5 && (
              <section>
                <h2>Review &amp; Confirm</h2>
                <div className="ar-review-grid">
                  <div className="ar-review-box">
                    <div className="ar-review-box-head">
                      <strong>1. Basic Info</strong>
                      <button type="button" className="ar-edit-link" onClick={() => setStep(1)}>Edit</button>
                    </div>
                    <div className="ar-review-row"><span>Full Name</span><b>{fullName || "—"}</b></div>
                    <div className="ar-review-row"><span>Email</span><b>{form.email || "—"}</b></div>
                    <div className="ar-review-row"><span>Phone</span><b>{form.phone || "—"}</b></div>
                  </div>

                  <div className="ar-review-box">
                    <div className="ar-review-box-head">
                      <strong>2. Role &amp; Skills</strong>
                      <button type="button" className="ar-edit-link" onClick={() => setStep(2)}>Edit</button>
                    </div>
                    <div className="ar-review-row"><span>Role</span><b>{selectedRoleName}</b></div>
                    <div className="ar-review-row"><span>Department</span><b>{selectedDeptName}</b></div>
                    <div className="ar-review-row"><span>Primary Skills</span><b>{primarySkills.join(", ") || "—"}</b></div>
                    <div className="ar-review-row"><span>Secondary Skills</span><b>{secondarySkills.join(", ") || "—"}</b></div>
                  </div>

                  <div className="ar-review-box">
                    <div className="ar-review-box-head">
                      <strong>3. Employment</strong>
                      <button type="button" className="ar-edit-link" onClick={() => setStep(3)}>Edit</button>
                    </div>
                    <div className="ar-review-row"><span>Type</span><b>{form.employmentType.replace("_", " ")}</b></div>
                    <div className="ar-review-row"><span>Work Mode</span><b>{form.workMode}</b></div>
                    <div className="ar-review-row"><span>Location</span><b>{form.location || "—"}</b></div>
                    <div className="ar-review-row"><span>Joining Date</span><b>{form.dateOfJoining || "—"}</b></div>
                  </div>

                  <div className="ar-review-box">
                    <div className="ar-review-box-head">
                      <strong>4. Work Details</strong>
                      <button type="button" className="ar-edit-link" onClick={() => setStep(4)}>Edit</button>
                    </div>
                    <div className="ar-review-row"><span>Working Hours</span><b>{form.workingHoursPerDay} hrs/day ({form.workingDays.join(", ")})</b></div>
                    <div className="ar-review-row"><span>Monthly Capacity</span><b>{monthlyHours} hrs/month</b></div>
                    <div className="ar-review-row"><span>Default Availability</span><b>{availLabel}</b></div>
                    <div className="ar-review-row"><span>Time Zone</span><b>{form.timeZone}</b></div>
                  </div>
                </div>
              </section>
            )}
          </main>

          {/* Bottom Navigation Bar */}
          <div className="ar-footer-bar">
            <div>
              {step > 1 ? (
                <button type="button" className="ar-btn" onClick={handleBack}>
                  <ArrowLeft size={13} /> Back
                </button>
              ) : (
                <Link href="/resources" className="ar-btn">
                  <ArrowLeft size={13} /> Back to Directory
                </Link>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/resources" className="ar-btn">Cancel</Link>
              {step < 5 ? (
                <button type="button" className="ar-btn ar-btn-primary" onClick={handleNext}>
                  Next: {STEPS[step].label} <ArrowRight size={13} />
                </button>
              ) : (
                <button type="button" className="ar-btn ar-btn-success" disabled={submitting} onClick={handleSubmit}>
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {submitting ? "Adding..." : "Confirm & Add Resource"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Quick Summary Panel (Matches CreateSprint / CreateProject) */}
        <aside className="ar-summary-card">
          <h2>Resource Summary</h2>
          <div className="ar-summary-person">
            <div className="ar-summary-avatar">
              {photoPreview ? <img src={photoPreview} alt="Avatar" /> : <span>{getInitials(fullName || "NR")}</span>}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 11.5, color: "#10204a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {fullName || "New Resource"}
              </div>
              <div style={{ fontSize: 10, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedRoleName} · {selectedDeptName}
              </div>
            </div>
          </div>

          <div className="ar-summary-list">
            <div className="ar-summary-row"><span>Step Progress</span><strong>{step} of 5</strong></div>
            <div className="ar-summary-row"><span>Employment</span><strong>{form.employmentType.replace("_", " ")}</strong></div>
            <div className="ar-summary-row"><span>Work Mode</span><strong>{form.workMode}</strong></div>
            <div className="ar-summary-row"><span>Schedule</span><strong>{form.workingHoursPerDay}h × {form.workingDays.length}d/wk</strong></div>
            <div className="ar-summary-row"><span>Weekly Capacity</span><strong>{weeklyHours} hrs/wk</strong></div>
            <div className="ar-summary-row"><span>Monthly Capacity</span><strong style={{ color: "#0755e9" }}>{monthlyHours} hrs/mo</strong></div>
            <div className="ar-summary-row"><span>Availability</span><strong style={{ color: "#079b62" }}>{availLabel}</strong></div>
          </div>

          {primarySkills.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 5 }}>SKILLS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {primarySkills.slice(0, 5).map((sk) => (
                  <span key={sk} className="ar-skill-pill">{sk}</span>
                ))}
              </div>
            </div>
          )}

          <div className="ar-tips-box">
            <h4>Quick Guidelines</h4>
            <p>• First Name, Last Name, Email, and Phone are required to auto-create the linked Employee &amp; Resource profile.</p>
            <p>• Working hours &amp; days directly drive Team Capacity, Forecast, and Heatmap calculations.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
