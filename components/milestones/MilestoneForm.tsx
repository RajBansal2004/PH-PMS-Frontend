"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  Paperclip,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  X,
  Building2,
  FolderKanban,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

import { projects as getProjectsApi } from "../../lib/api";
import { milestoneApi } from "../../lib/milestones/api";
import { getOrganizationId } from "../../lib/auth";
import type { MilestonePriority, MilestoneStatus, MilestoneType } from "../../lib/milestones/types";
import "./milestone-form.css";

type FormMode = "create" | "edit";

type MilestoneFormProps = {
  mode: FormMode;
  milestoneId?: string;
};

type FormValues = {
  projectId: string;
  milestoneId: string;
  type: MilestoneType;
  module: string;
  title: string;
  description: string;
  priority: MilestonePriority;
  status: MilestoneStatus;
  plannedStart: string;
  plannedEnd: string;
  baselineDuration: string;
  progress: number;
  completionType: string;
  businessObjective: string;
  acceptanceCriteria: string;
  businessRules: string;
  dependencies: string;
  requestedBy: string;
  owner: string;
  budget: string;
  notes: string;
};

const steps = [
  "Milestone Details",
  "Schedule & Progress",
  "Dependencies & Deliverables",
  "Resources & Budget",
  "Additional Information",
  "Review & Submit",
];

const STATUS_OPTIONS: MilestoneStatus[] = [
  "Completed",
  "In Progress",
  "Upcoming",
  "At Risk",
  "Overdue",
  "On Hold",
  "Cancelled",
];

const initialValues: FormValues = {
  projectId: "",
  milestoneId: "",
  type: "Phase",
  module: "Requirements Management",
  title: "",
  description: "",
  priority: "Medium",
  status: "Upcoming",
  plannedStart: "",
  plannedEnd: "",
  baselineDuration: "0",
  progress: 0,
  completionType: "Manual",
  businessObjective: "",
  acceptanceCriteria: "",
  businessRules: "",
  dependencies: "",
  requestedBy: "",
  owner: "",
  budget: "10",
  notes: "",
};

const requiredByStep: Record<number, (keyof FormValues)[]> = {
  0: ["projectId", "milestoneId", "type", "title", "priority", "status"],
  1: ["plannedStart", "plannedEnd"],
  2: ["businessObjective", "acceptanceCriteria"],
  3: ["owner"],
  4: [],
  5: [],
};

// Top-level stable field components to prevent DOM remounting / focus loss
interface BaseFieldProps {
  label: string;
  name: keyof FormValues;
  required?: boolean;
  error?: string;
}

interface TextFieldProps extends BaseFieldProps {
  value: string | number;
  onChange: (name: keyof FormValues, val: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
}

function TextField({
  label,
  name,
  value,
  required,
  error,
  onChange,
  placeholder,
  type = "text",
  readOnly = false,
}: TextFieldProps) {
  return (
    <label className="ms-field">
      <span>
        {label}
        {required && <b> *</b>}
      </span>
      <input
        type={type}
        value={String(value ?? "")}
        placeholder={placeholder}
        readOnly={readOnly}
        style={readOnly ? { background: "#f8fafc", cursor: "not-allowed" } : {}}
        onChange={(e) => onChange(name, e.target.value)}
        aria-invalid={Boolean(error)}
      />
      {error && <small className="ms-error">{error}</small>}
    </label>
  );
}

interface SelectFieldProps extends BaseFieldProps {
  value: string;
  onChange: (name: keyof FormValues, val: string) => void;
  options: { label: string; value: string }[];
}

function SelectField({
  label,
  name,
  value,
  required,
  error,
  onChange,
  options,
}: SelectFieldProps) {
  return (
    <label className="ms-field">
      <span>
        {label}
        {required && <b> *</b>}
      </span>
      <select
        value={String(value ?? "")}
        onChange={(e) => onChange(name, e.target.value)}
        aria-invalid={Boolean(error)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <small className="ms-error">{error}</small>}
    </label>
  );
}

interface TextAreaFieldProps extends BaseFieldProps {
  value: string;
  onChange: (name: keyof FormValues, val: string) => void;
  placeholder?: string;
  rows?: number;
}

function TextAreaField({
  label,
  name,
  value,
  required,
  error,
  onChange,
  placeholder,
  rows = 3,
}: TextAreaFieldProps) {
  return (
    <label className="ms-field ms-field-full">
      <span>
        {label}
        {required && <b> *</b>}
      </span>
      <textarea
        rows={rows}
        value={String(value ?? "")}
        placeholder={placeholder}
        onChange={(e) => onChange(name, e.target.value)}
        aria-invalid={Boolean(error)}
      />
      <small className="ms-counter">{String(value ?? "").length} / 2000</small>
      {error && <small className="ms-error">{error}</small>}
    </label>
  );
}

export default function MilestoneForm({
  mode,
  milestoneId,
}: MilestoneFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [projectList, setProjectList] = useState<
    { id: string; code: string; name: string; clientName: string }[]
  >([]);
  const [personnelList, setPersonnelList] = useState<
    { id: string; name: string; email?: string }[]
  >([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingPersonnel, setLoadingPersonnel] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const [saveMessage, setSaveMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");

  // Load Real Personnel from DB (Active Users and Employees)
  useEffect(() => {
    async function loadPersonnel() {
      try {
        setLoadingPersonnel(true);
        const personnel = await milestoneApi.getPersonnel();
        setPersonnelList(personnel);
        if (personnel.length > 0) {
          setValues((prev) => ({
            ...prev,
            owner: prev.owner || personnel[0].name,
            requestedBy: prev.requestedBy || personnel[0].name,
          }));
        }
      } catch (err) {
        console.warn("Failed to load personnel:", err);
      } finally {
        setLoadingPersonnel(false);
      }
    }
    loadPersonnel();
  }, []);

  // Load Projects from DB
  useEffect(() => {
    async function loadProjects() {
      try {
        setLoadingProjects(true);
        const orgId = getOrganizationId();
        const res: any = await getProjectsApi({ organizationId: orgId, limit: 100 });
        const raw = Array.isArray(res) ? res : res?.items || res?.data || [];
        const mapped = raw.map((p: any) => {
          const client = p.clientId && typeof p.clientId === "object" ? p.clientId : null;
          const clientName =
            client?.displayName ||
            client?.companyName ||
            client?.legalName ||
            (typeof p.clientName === "string" ? p.clientName : null) ||
            "Direct Client";
          return {
            id: p._id || p.id,
            code: p.projectCode || p.code || "PRJ",
            name: p.projectName || p.name || "Untitled Project",
            clientName,
          };
        });
        setProjectList(mapped);

        // Auto select first project if not selected
        if (mapped.length > 0) {
          setValues((prev) => ({
            ...prev,
            projectId: prev.projectId || mapped[0].id,
          }));
        }
      } catch (err) {
        console.warn("Failed to load projects:", err);
      } finally {
        setLoadingProjects(false);
      }
    }
    loadProjects();
  }, []);

  // In Create Mode, auto-generate Milestone Code
  useEffect(() => {
    async function loadCodeOrData() {
      try {
        setLoadingInitial(true);
        if (mode === "create") {
          const codeInfo = await milestoneApi.getNextCode();
          if (codeInfo?.nextCode) {
            setValues((prev) => ({ ...prev, milestoneId: codeInfo.nextCode }));
          }
        } else if (mode === "edit" && milestoneId) {
          const m = await milestoneApi.get(milestoneId);
          if (m) {
            setValues({
              projectId: m.projectId,
              milestoneId: m.milestoneCode || m.id,
              type: m.type,
              module: (m as any).module || "Requirements Management",
              title: m.title || m.name || "",
              description: m.description || "",
              priority: m.priority,
              status: m.status,
              plannedStart: m.plannedStart || "",
              plannedEnd: m.plannedEnd || "",
              baselineDuration: "0",
              progress: m.progress || 0,
              completionType: "Manual",
              businessObjective: m.businessObjective || "",
              acceptanceCriteria: m.acceptanceCriteria || "",
              businessRules: m.businessRules || "",
              dependencies: m.dependencies || "",
              requestedBy: (m as any).requestedBy || m.owner.name || "",
              owner: m.owner.name,
              budget: String(m.weight || 10),
              notes: (m as any).notes || "",
            });
          }
        }
      } catch (err) {
        console.warn("Failed to init milestone form:", err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadCodeOrData();
  }, [mode, milestoneId]);

  const selectedProject = useMemo(() => {
    return projectList.find((p) => p.id === values.projectId);
  }, [projectList, values.projectId]);

  const personnelOptions = useMemo(() => {
    if (personnelList.length === 0) {
      return [{ value: "", label: loadingPersonnel ? "Loading active personnel..." : "No personnel found" }];
    }
    return personnelList.map((p) => ({
      value: p.name,
      label: p.email ? `${p.name} (${p.email})` : p.name,
    }));
  }, [personnelList, loadingPersonnel]);

  const duration = useMemo(() => {
    if (!values.plannedStart || !values.plannedEnd) return 0;

    const start = new Date(`${values.plannedStart}T00:00:00`);
    const end = new Date(`${values.plannedEnd}T00:00:00`);
    const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;

    return Number.isFinite(days) && days > 0 ? days : 0;
  }, [values.plannedStart, values.plannedEnd]);

  const update = <K extends keyof FormValues>(
    key: K,
    value: FormValues[K],
  ) => {
    setValues((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: "" }));
    setSaveMessage("");
  };

  const validateStep = (currentStep: number) => {
    const nextErrors: Record<string, string> = {};

    requiredByStep[currentStep].forEach((key) => {
      if (!String(values[key] ?? "").trim()) {
        nextErrors[key] = "This field is required.";
      }
    });

    if (currentStep === 0 && values.title.trim().length < 3) {
      nextErrors.title = "Title must contain at least 3 characters.";
    }

    if (currentStep === 1) {
      if (values.plannedStart && values.plannedEnd) {
        if (values.plannedEnd < values.plannedStart) {
          nextErrors.plannedEnd = "End date cannot be before start date.";
        }
      }
    }

    if (currentStep === 2) {
      if (values.businessObjective.trim().length < 5) {
        nextErrors.businessObjective = "Please provide at least 5 characters.";
      }
      if (values.acceptanceCriteria.trim().length < 5) {
        nextErrors.acceptanceCriteria = "Please provide at least 5 characters.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((previous) => Math.min(5, previous + 1));
  };

  const goPrevious = () => {
    setStep((previous) => Math.max(0, previous - 1));
  };

  const handleSaveDraft = async () => {
    if (!values.title.trim()) {
      setMessageType("error");
      setSaveMessage("Please enter a Milestone Title to save a draft.");
      return;
    }
    if (!values.projectId) {
      setMessageType("error");
      setSaveMessage("Please select a valid Project.");
      return;
    }

    try {
      setIsSubmitting(true);
      const matchedOwner = personnelList.find((p) => p.name === values.owner);
      const payload = {
        name: values.title.trim(),
        title: values.title.trim(),
        milestoneCode: values.milestoneId,
        projectId: values.projectId,
        type: values.type,
        module: values.module,
        description: values.description,
        status: "Upcoming",
        priority: values.priority,
        plannedStart: values.plannedStart || undefined,
        plannedEnd: values.plannedEnd || undefined,
        progress: values.progress || 0,
        weight: Number(values.budget) || 10,
        ownerName: values.owner,
        ownerId: matchedOwner?.id,
        requestedBy: values.requestedBy,
        businessObjective: values.businessObjective,
        acceptanceCriteria: values.acceptanceCriteria,
      };

      if (mode === "edit" && milestoneId) {
        await milestoneApi.update(milestoneId, payload);
      } else {
        await milestoneApi.create(payload);
      }

      setMessageType("success");
      setSaveMessage("Draft milestone saved successfully into database!");
    } catch (err: any) {
      setMessageType("error");
      setSaveMessage(`Draft save failed: ${err?.message || "Server error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    const allValid = [0, 1, 2, 3].every(validateStep);

    if (!allValid) {
      const firstInvalid = [0, 1, 2, 3].find((index) => !validateStep(index));
      setStep(firstInvalid ?? 0);
      setMessageType("error");
      setSaveMessage("Please complete all required fields before submitting.");
      return;
    }

    try {
      setIsSubmitting(true);
      const matchedOwner = personnelList.find((p) => p.name === values.owner);
      const payload = {
        name: values.title.trim(),
        title: values.title.trim(),
        milestoneCode: values.milestoneId,
        projectId: values.projectId,
        type: values.type,
        module: values.module,
        description: values.description,
        status: values.status,
        priority: values.priority,
        plannedStart: values.plannedStart,
        plannedEnd: values.plannedEnd,
        progress: values.progress,
        weight: Number(values.budget) || 10,
        ownerName: values.owner,
        ownerId: matchedOwner?.id,
        businessObjective: values.businessObjective,
        acceptanceCriteria: values.acceptanceCriteria,
        businessRules: values.businessRules,
        dependencies: values.dependencies,
        requestedBy: values.requestedBy,
        notes: values.notes,
      };

      if (mode === "edit" && milestoneId) {
        await milestoneApi.update(milestoneId, payload);
        setMessageType("success");
        setSaveMessage("Milestone updated successfully! Redirecting...");
      } else {
        await milestoneApi.create(payload);
        setMessageType("success");
        setSaveMessage("Milestone registered successfully! Redirecting to Milestone Registry...");
      }

      setTimeout(() => {
        router.push("/milestones");
      }, 1200);
    } catch (err: any) {
      setMessageType("error");
      setSaveMessage(`Submission error: ${err?.message || "Failed to persist milestone."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;

    const allowed = Array.from(files).filter((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      return ["pdf", "doc", "docx", "xls", "xlsx", "pptx", "png", "jpg", "jpeg"].includes(
        extension ?? "",
      );
    });

    setAttachments((previous) => [...previous, ...allowed]);
  };

  const removeFile = (index: number) => {
    setAttachments((previous) => previous.filter((_, i) => i !== index));
  };

  return (
    <section className="milestone-form-page">
      <div className="ms-top-heading">
        <div>
          <div className="ms-title-row">
            <div className="ms-title-icon"><FileText size={20} /></div>
            <div>
              <h1>{mode === "edit" ? "Edit Milestone" : "Create New Milestone"}</h1>
              <p>
                <strong>{values.milestoneId || "MLS-AUTO"}</strong> — {values.title || "New Project Milestone"}
                <span className="ms-title-status">{values.status}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="ms-top-actions">
          <button
            type="button"
            disabled={isSubmitting}
            className="ms-btn"
            onClick={handleSaveDraft}
          >
            <Save size={14} /> Save Draft
          </button>
          <Link href="/milestones" className="ms-btn">
            <X size={14} /> Cancel
          </Link>
          <button
            type="button"
            disabled={isSubmitting}
            className="ms-btn ms-btn-primary"
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            {mode === "edit" ? "Update Milestone" : "Submit Milestone"}
          </button>
        </div>
      </div>

      <nav className="ms-stepper" aria-label="Milestone form steps">
        {steps.map((label, index) => (
          <button
            type="button"
            key={label}
            className={`ms-step ${step === index ? "active" : ""} ${step > index ? "done" : ""}`}
            onClick={() => {
              if (index <= step) setStep(index);
              else if (validateStep(step)) setStep(index);
            }}
          >
            <span className="ms-step-number">
              {step > index ? <Check size={14} /> : index + 1}
            </span>
            <span>{label}</span>
            {index < steps.length - 1 && <i />}
          </button>
        ))}
      </nav>

      {saveMessage && (
        <div
          className="ms-notice"
          style={{
            background: messageType === "success" ? "#ecfdf5" : messageType === "error" ? "#fef2f2" : "#eff6ff",
            color: messageType === "success" ? "#065f46" : messageType === "error" ? "#991b1b" : "#1e40af",
            border: messageType === "success" ? "1px solid #a7f3d0" : messageType === "error" ? "1px solid #fecaca" : "1px solid #bfdbfe",
            padding: "12px 18px",
            borderRadius: "8px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
          role="status"
        >
          {messageType === "success" ? <CheckCircle2 size={18} /> : <CircleHelp size={18} />}
          <span>{saveMessage}</span>
        </div>
      )}

      <div className="ms-content-grid">
        <div className="ms-main-column">
          {step === 0 && (
            <section className="ms-card">
              <div className="ms-card-heading">
                <h2>Milestone Details</h2>
                <CircleHelp size={15} />
              </div>

              <div className="ms-form-grid">
                <div>
                  <SelectField
                    label="Target Project"
                    name="projectId"
                    value={values.projectId}
                    error={errors.projectId}
                    onChange={update}
                    required
                    options={
                      projectList.length > 0
                        ? projectList.map((item) => ({
                            value: item.id,
                            label: `${item.code} - ${item.name} (${item.clientName})`,
                          }))
                        : [{ label: "Loading active projects...", value: "" }]
                    }
                  />
                  {selectedProject && (
                    <div style={{ marginTop: "4px", fontSize: "12px", color: "#64748b" }}>
                      Project: <strong>{selectedProject.name}</strong> · Client: <strong>{selectedProject.clientName}</strong>
                    </div>
                  )}
                </div>

                <div>
                  <TextField
                    label="Milestone Code (Auto-generated)"
                    name="milestoneId"
                    value={values.milestoneId}
                    error={errors.milestoneId}
                    onChange={update}
                    required
                    readOnly
                    placeholder="Auto-generating MLS code..."
                  />
                  <div style={{ marginTop: "4px", fontSize: "11px", color: "#64748b" }}>
                    Sequentially auto-generated for your organization
                  </div>
                </div>

                <SelectField
                  label="Milestone Type"
                  name="type"
                  value={values.type}
                  error={errors.type}
                  onChange={update}
                  required
                  options={["Phase", "Project", "Sprint", "Release", "Operational"].map((item) => ({
                    value: item,
                    label: item,
                  }))}
                />

                <TextField
                  label="Functional Module / Scope"
                  name="module"
                  value={values.module}
                  error={errors.module}
                  onChange={update}
                  placeholder="e.g. Telehealth Video Signaling, Billing Engine..."
                />

                <div style={{ gridColumn: "span 2" }}>
                  <TextField
                    label="Milestone Title"
                    name="title"
                    value={values.title}
                    error={errors.title}
                    onChange={update}
                    required
                    placeholder="e.g. Phase 1: Core Architecture & Video Consultation Engine"
                  />
                </div>

                <SelectField
                  label="Priority"
                  name="priority"
                  value={values.priority}
                  error={errors.priority}
                  onChange={update}
                  required
                  options={["Critical", "High", "Medium", "Low"].map((item) => ({
                    value: item,
                    label: `${item} Priority`,
                  }))}
                />

                <SelectField
                  label="Status"
                  name="status"
                  value={values.status}
                  error={errors.status}
                  onChange={update}
                  required
                  options={STATUS_OPTIONS.map((item) => ({
                    value: item,
                    label: item,
                  }))}
                />

                <div style={{ gridColumn: "span 2" }}>
                  <TextAreaField
                    label="Detailed Scope / Description"
                    name="description"
                    value={values.description}
                    error={errors.description}
                    onChange={update}
                    placeholder="Provide a comprehensive summary of what will be delivered in this milestone..."
                  />
                </div>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="ms-card">
              <div className="ms-card-heading"><h2>Schedule & Timeline</h2></div>
              <div className="ms-form-grid">
                <TextField
                  label="Planned Start Date"
                  name="plannedStart"
                  value={values.plannedStart}
                  error={errors.plannedStart}
                  onChange={update}
                  required
                  type="date"
                />
                <TextField
                  label="Planned Due Date"
                  name="plannedEnd"
                  value={values.plannedEnd}
                  error={errors.plannedEnd}
                  onChange={update}
                  required
                  type="date"
                />
                <label className="ms-field">
                  <span>Calculated Duration</span>
                  <input type="text" value={`${duration} calendar days`} readOnly />
                </label>
                <label className="ms-field">
                  <span>Current Progress (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={values.progress}
                    onChange={(event) => update("progress", Math.min(100, Math.max(0, Number(event.target.value))))}
                  />
                </label>
                <SelectField
                  label="Completion Method"
                  name="completionType"
                  value={values.completionType}
                  error={errors.completionType}
                  onChange={update}
                  options={[
                    { value: "Manual", label: "Manual Sign-off" },
                    { value: "Automatic", label: "Automatic Calculation" },
                    { value: "Deliverable Based", label: "Deliverable Linked" },
                  ]}
                />
                <TextField
                  label="Milestone Weight (Allocation %)"
                  name="budget"
                  value={values.budget}
                  error={errors.budget}
                  onChange={update}
                  type="number"
                  placeholder="10"
                />
              </div>
              <div className="ms-progress-preview">
                <div><span>Configured progress</span><strong>{values.progress}%</strong></div>
                <div className="ms-progress-track">
                  <span style={{ width: `${values.progress}%` }} />
                </div>
                <small>Deliverables linked to this milestone will automatically increment completion status.</small>
              </div>
            </section>
          )}

          {step === 2 && (
            <>
              <section className="ms-card">
                <div className="ms-card-heading"><h2>Business Objectives & Acceptance Criteria</h2></div>
                <div className="ms-form-grid">
                  <TextAreaField
                    label="Business Objective"
                    name="businessObjective"
                    value={values.businessObjective}
                    error={errors.businessObjective}
                    onChange={update}
                    required
                    placeholder="Specify the business problem solved or milestone deliverable purpose..."
                  />
                  <TextAreaField
                    label="Acceptance Criteria"
                    name="acceptanceCriteria"
                    value={values.acceptanceCriteria}
                    error={errors.acceptanceCriteria}
                    onChange={update}
                    required
                    placeholder="What conditions must pass for the client/management to sign off on this milestone?"
                  />
                  <TextAreaField
                    label="Business Rules & Constraints"
                    name="businessRules"
                    value={values.businessRules}
                    error={errors.businessRules}
                    onChange={update}
                    placeholder="Compliance standards, HIPAA, ABDM, data residency or performance limits..."
                  />
                  <TextAreaField
                    label="Dependencies"
                    name="dependencies"
                    value={values.dependencies}
                    error={errors.dependencies}
                    onChange={update}
                    placeholder="Previous milestones or third-party deliverables required before this milestone starts..."
                  />
                </div>
              </section>

              <section className="ms-card">
                <div className="ms-card-heading">
                  <h2>Deliverables Mapping</h2>
                  <button
                    type="button"
                    className="ms-btn"
                    onClick={() => {
                      setMessageType("info");
                      setSaveMessage("Deliverables will be automatically associated from the Deliverable Register.");
                    }}
                  >
                    <Plus size={14} /> Link Deliverable
                  </button>
                </div>
                <div className="ms-empty-link">
                  <FileText size={23} />
                  <strong>No deliverables linked yet</strong>
                  <span>Outputs, SRS documents, and build artifacts will appear here once linked.</span>
                </div>
              </section>
            </>
          )}

          {step === 3 && (
            <section className="ms-card">
              <div className="ms-card-heading"><h2>Resources & Ownership</h2></div>
              <div className="ms-form-grid">
                <SelectField
                  label="Milestone Lead / Owner"
                  name="owner"
                  value={values.owner}
                  error={errors.owner}
                  onChange={update}
                  required
                  options={personnelOptions}
                />
                <TextField
                  label="Estimated Cost / Budget (INR)"
                  name="budget"
                  value={values.budget}
                  error={errors.budget}
                  onChange={update}
                  type="number"
                  placeholder="0"
                />
                <label className="ms-field ms-field-full">
                  <span>Resource Notes</span>
                  <textarea rows={4} placeholder="Describe engineering team allocation, QA resources, or client POC..." />
                </label>
              </div>
              <div className="ms-info-note">
                <ShieldCheck size={17} />
                Resource assignment will notify the assigned lead for execution and deliverable verification.
              </div>
            </section>
          )}

          {step === 4 && (
            <>
              <section className="ms-card">
                <div className="ms-card-heading"><h2>Additional Metadata</h2></div>
                <div className="ms-form-grid">
                  <SelectField
                    label="Requested By"
                    name="requestedBy"
                    value={values.requestedBy}
                    error={errors.requestedBy}
                    onChange={update}
                    options={personnelOptions}
                  />
                  <SelectField
                    label="Milestone Owner"
                    name="owner"
                    value={values.owner}
                    error={errors.owner}
                    onChange={update}
                    options={personnelOptions}
                  />
                  <TextAreaField
                    label="Additional Notes"
                    name="notes"
                    value={values.notes}
                    error={errors.notes}
                    onChange={update}
                    placeholder="Any special notes or client instructions..."
                  />
                </div>
              </section>

              <section className="ms-card">
                <div className="ms-card-heading"><h2>Attachments & Specification References</h2></div>
                <label className="ms-upload-zone">
                  <Upload size={23} />
                  <strong>Drag & drop files here or click to browse</strong>
                  <span>PDF, DOCX, XLSX, PPTX, JPG, PNG — Max 20 MB per file</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.pptx,.png,.jpg,.jpeg"
                    onChange={(event) => addFiles(event.target.files)}
                  />
                </label>
                {attachments.map((file, index) => (
                  <div className="ms-file-row" key={`${file.name}-${index}`}>
                    <Paperclip size={14} />
                    <span>{file.name}</span>
                    <small>{(file.size / 1024 / 1024).toFixed(2)} MB</small>
                    <button type="button" onClick={() => removeFile(index)} aria-label={`Remove ${file.name}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </section>
            </>
          )}

          {step === 5 && (
            <section className="ms-card">
              <div className="ms-card-heading"><h2>Review & Confirm Milestone</h2></div>
              <div className="ms-review-grid">
                <div><span>Milestone Code</span><strong>{values.milestoneId || "MLS-AUTO"}</strong></div>
                <div><span>Milestone Title</span><strong>{values.title || "—"}</strong></div>
                <div>
                  <span>Project</span>
                  <strong>{selectedProject ? `${selectedProject.code} - ${selectedProject.name}` : values.projectId}</strong>
                </div>
                <div><span>Client</span><strong>{selectedProject?.clientName || "Direct"}</strong></div>
                <div><span>Type</span><strong>{values.type}</strong></div>
                <div><span>Priority</span><strong>{values.priority}</strong></div>
                <div><span>Status</span><strong>{values.status}</strong></div>
                <div><span>Planned Start</span><strong>{values.plannedStart || "—"}</strong></div>
                <div><span>Planned End</span><strong>{values.plannedEnd || "—"}</strong></div>
                <div><span>Duration</span><strong>{duration} days</strong></div>
                <div><span>Current Progress</span><strong>{values.progress}%</strong></div>
                <div><span>Owner / Lead</span><strong>{values.owner}</strong></div>
              </div>
              <div className="ms-review-description">
                <strong>Scope Description</strong>
                <p>{values.description || "No description provided."}</p>
              </div>
              <div className="ms-info-note">
                <ShieldCheck size={17} />
                Clicking Submit will register this milestone dynamically in the PMS database and bind it to the project baseline.
              </div>
            </section>
          )}

          <div className="ms-bottom-actions">
            <Link href="/milestones" className="ms-btn">Cancel</Link>
            <div>
              <button
                type="button"
                disabled={isSubmitting}
                className="ms-btn"
                onClick={handleSaveDraft}
              >
                <Save size={14} /> Save Draft
              </button>
              {step > 0 && (
                <button type="button" className="ms-btn" onClick={goPrevious}>
                  <ArrowLeft size={14} /> Previous
                </button>
              )}
              {step < 5 ? (
                <button type="button" className="ms-btn ms-btn-primary" onClick={goNext}>
                  Next: {steps[step + 1]} <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  className="ms-btn ms-btn-primary"
                  onClick={handleSubmit}
                >
                  {isSubmitting ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  {mode === "edit" ? "Update Milestone" : "Register Milestone"}
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="ms-side-column">
          <section className="ms-card ms-summary-card">
            <h2>Milestone Summary</h2>
            <dl>
              <div><dt>Milestone Code</dt><dd>{values.milestoneId || "MLS-AUTO"}</dd></div>
              <div><dt>Title</dt><dd>{values.title || "—"}</dd></div>
              <div>
                <dt>Project</dt>
                <dd>{selectedProject ? selectedProject.name : "Not selected"}</dd>
              </div>
              <div>
                <dt>Client</dt>
                <dd>{selectedProject ? selectedProject.clientName : "Direct"}</dd>
              </div>
              <div><dt>Milestone Type</dt><dd>{values.type}</dd></div>
              <div><dt>Priority</dt><dd>{values.priority}</dd></div>
              <div><dt>Status</dt><dd>{values.status}</dd></div>
              <div><dt>Planned Start</dt><dd>{values.plannedStart || "—"}</dd></div>
              <div><dt>Planned End</dt><dd>{values.plannedEnd || "—"}</dd></div>
              <div><dt>Owner</dt><dd>{values.owner}</dd></div>
              <div><dt>Progress</dt><dd>{values.progress}%</dd></div>
            </dl>
          </section>

          <section className="ms-card ms-approval-card">
            <h2>Workflow Status</h2>
            {[
              ["Planned / Draft", "Milestone created and baseline scheduled", values.status === "Upcoming" ? "active" : "pending"],
              ["Execution", "Deliverables in progress", values.status === "In Progress" ? "active" : "pending"],
              ["Sign-off / Done", "All acceptance criteria verified", values.status === "Completed" ? "success" : "pending"],
              ["At Risk / Overdue", "Schedule slippage detected", values.status === "At Risk" || values.status === "Overdue" ? "danger" : "pending"],
            ].map(([title, desc, state]) => (
              <div className={`ms-approval-step ${state}`} key={title}>
                <span />
                <div><strong>{title}</strong><small>{desc}</small></div>
              </div>
            ))}
          </section>

          <section className="ms-card ms-quick-card">
            <h2>Quick Actions</h2>
            <Link href="/milestones"><FolderKanban size={16} /> Milestone Registry</Link>
            <Link href="/milestones/timeline"><Clock3 size={16} /> Milestone Timeline</Link>
            <Link href="/milestones/calendar"><CalendarDays size={16} /> Milestone Calendar</Link>
          </section>
        </aside>
      </div>
    </section>
  );
}
