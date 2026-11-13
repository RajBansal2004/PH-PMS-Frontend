
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
} from "lucide-react";

import { demoMilestones } from "../../lib/milestones/demo-data";
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
const STATUS_OPTIONS = [
  "Completed",
  "In Progress",
  "Upcoming",
  "At Risk",
  "Overdue",
  "On Hold",
  "Cancelled",
];
const initialValues: FormValues = {
  projectId: "PRJ-001",
  milestoneId: "MLS-011",
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
  requestedBy: "Pooja Singh",
  owner: "Rahul Verma",
  budget: "0",
  notes: "",
};

const projectOptions = [
  { id: "PRJ-001", name: "AI-CMS Platform" },
  { id: "PRJ-002", name: "Mobile App" },
  { id: "PRJ-003", name: "Patient Portal" },
  { id: "PRJ-004", name: "Internal Tools" },
];

const ownerOptions = [
  "Rahul Verma",
  "Amit Kumar",
  "Neha Patel",
  "Vikram Singh",
  "Pooja Singh",
];

const requiredByStep: Record<number, (keyof FormValues)[]> = {
  0: ["projectId", "milestoneId", "type", "module", "title", "priority", "status"],
  1: ["plannedStart", "plannedEnd"],
  2: ["businessObjective", "acceptanceCriteria"],
  3: ["owner"],
  4: [],
  5: [],
};

export default function MilestoneForm({
  mode,
  milestoneId,
}: MilestoneFormProps) {
  const existing = demoMilestones.find((item) => item.id === milestoneId);

  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormValues>(() => {
    if (mode !== "edit" || !existing) return initialValues;

    return {
      ...initialValues,
      projectId: existing.projectId,
      milestoneId: existing.id,
      type: existing.type,
      title: existing.title,
      priority: existing.priority,
      status: existing.status,
      plannedStart: existing.plannedStart,
      plannedEnd: existing.plannedEnd,
      progress: existing.progress,
      owner: existing.owner.name,
      description: existing.description ?? "",
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const [saveMessage, setSaveMessage] = useState("");

  const selectedProject = projectOptions.find(
    (project) => project.id === values.projectId,
  );

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
      if (values.businessObjective.trim().length < 10) {
        nextErrors.businessObjective =
          "Please provide at least 10 characters.";
      }
      if (values.acceptanceCriteria.trim().length < 10) {
        nextErrors.acceptanceCriteria =
          "Please provide at least 10 characters.";
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

  const handleSaveDraft = () => {
    setSaveMessage(
      "Draft is ready in this form. Connect the milestone API to persist it.",
    );
  };

  const handleSubmit = () => {
    const allValid = [0, 1, 2, 3, 4].every(validateStep);

    if (!allValid) {
      const firstInvalid = [0, 1, 2, 3, 4].find(
        (index) => !validateStep(index),
      );
      setStep(firstInvalid ?? 0);
      return;
    }

    setSaveMessage(
      "Validation successful. Connect the create/update API to submit this milestone.",
    );
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

  const FieldError = ({ name }: { name: keyof FormValues }) =>
    errors[name] ? <small className="ms-error">{errors[name]}</small> : null;

  const TextField = ({
    label,
    name,
    required,
    placeholder,
    type = "text",
  }: {
    label: string;
    name: keyof FormValues;
    required?: boolean;
    placeholder?: string;
    type?: string;
  }) => (
    <label className="ms-field">
      <span>{label}{required && <b> *</b>}</span>
      <input
        type={type}
        value={String(values[name])}
        placeholder={placeholder}
        onChange={(event) => update(name, event.target.value as never)}
        aria-invalid={Boolean(errors[name])}
      />
      <FieldError name={name} />
    </label>
  );

  const SelectField = ({
    label,
    name,
    required,
    options,
  }: {
    label: string;
    name: keyof FormValues;
    required?: boolean;
    options: { label: string; value: string }[];
  }) => (
    <label className="ms-field">
      <span>{label}{required && <b> *</b>}</span>
      <select
        value={String(values[name])}
        onChange={(event) => update(name, event.target.value as never)}
        aria-invalid={Boolean(errors[name])}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldError name={name} />
    </label>
  );

  const TextAreaField = ({
    label,
    name,
    required,
    placeholder,
    rows = 3,
  }: {
    label: string;
    name: keyof FormValues;
    required?: boolean;
    placeholder?: string;
    rows?: number;
  }) => (
    <label className="ms-field ms-field-full">
      <span>{label}{required && <b> *</b>}</span>
      <textarea
        rows={rows}
        value={String(values[name])}
        placeholder={placeholder}
        onChange={(event) => update(name, event.target.value as never)}
        aria-invalid={Boolean(errors[name])}
      />
      <small className="ms-counter">
        {String(values[name]).length} / 2000
      </small>
      <FieldError name={name} />
    </label>
  );

  return (
    <section className="milestone-form-page">
      <div className="ms-top-heading">
        <div>
          <div className="ms-title-row">
            <div className="ms-title-icon"><FileText size={20} /></div>
            <div>
              <h1>{mode === "edit" ? "Edit Milestone" : "Create Milestone"}</h1>
              <p>
                {values.milestoneId} — {values.title || "New milestone"}
                <span className="ms-title-status">{values.status}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="ms-top-actions">
          <button type="button" className="ms-btn" onClick={handleSaveDraft}>
            <Save size={14} /> Save as Draft
          </button>
          <Link href="/milestones" className="ms-btn">
            <X size={14} /> Cancel
          </Link>
          <button type="button" className="ms-btn ms-btn-primary" onClick={handleSubmit}>
            Save Milestone
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
        <div className="ms-notice" role="status">
          {saveMessage}
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
                <SelectField
                  label="Project"
                  name="projectId"
                  required
                  options={projectOptions.map((item) => ({
                    value: item.id,
                    label: `${item.id} - ${item.name}`,
                  }))}
                />
                <TextField label="Milestone ID" name="milestoneId" required />
                <SelectField
                  label="Milestone Type"
                  name="type"
                  required
                  options={["Project", "Phase", "Sprint", "Release", "Operational"].map((item) => ({
                    value: item,
                    label: item,
                  }))}
                />
                <TextField label="Module / Area" name="module" required placeholder="e.g. Requirements Management" />
                <TextField label="Title" name="title" required placeholder="Enter milestone title" />
                <SelectField
                  label="Priority"
                  name="priority"
                  required
                  options={["Critical", "High", "Medium", "Low"].map((item) => ({
                    value: item,
                    label: item,
                  }))}
                />
                <TextAreaField
                  label="Description"
                  name="description"
                  placeholder="Describe the milestone and expected outcome..."
                  rows={4}
                />
                <SelectField
                  label="Status"
                  name="status"
                  required
                  options={STATUS_OPTIONS.map((item) => ({
                    value: item,
                    label: item,
                  }))}
                />
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="ms-card">
              <div className="ms-card-heading"><h2>Schedule & Progress</h2></div>
              <div className="ms-form-grid ms-form-grid-four">
                <TextField label="Planned Start Date" name="plannedStart" required type="date" />
                <TextField label="Planned End Date" name="plannedEnd" required type="date" />
                <label className="ms-field">
                  <span>Baseline Duration (Days)</span>
                  <input value={duration} readOnly />
                </label>
                <label className="ms-field">
                  <span>Progress (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={values.progress}
                    onChange={(event) => update("progress", Math.min(100, Math.max(0, Number(event.target.value))))}
                  />
                </label>
                <SelectField
                  label="Completion Type"
                  name="completionType"
                  options={[
                    { value: "Manual", label: "Manual" },
                    { value: "Automatic", label: "Automatic" },
                    { value: "Deliverable Based", label: "Deliverable Based" },
                  ]}
                />
              </div>
              <div className="ms-progress-preview">
                <div><span>Current progress</span><strong>{values.progress}%</strong></div>
                <div className="ms-progress-track">
                  <span style={{ width: `${values.progress}%` }} />
                </div>
                <small>Progress may be calculated automatically when deliverables are linked.</small>
              </div>
            </section>
          )}

          {step === 2 && (
            <>
              <section className="ms-card">
                <div className="ms-card-heading"><h2>Business & Acceptance</h2></div>
                <div className="ms-form-grid">
                  <TextAreaField label="Business Objective" name="businessObjective" required placeholder="What business outcome should this milestone achieve?" />
                  <TextAreaField label="Acceptance Criteria" name="acceptanceCriteria" required placeholder="List the conditions that must be met..." />
                  <TextAreaField label="Business Rules" name="businessRules" placeholder="Enter rules or constraints..." />
                  <TextAreaField label="Dependencies" name="dependencies" placeholder="List milestone dependencies..." />
                </div>
              </section>

              <section className="ms-card">
                <div className="ms-card-heading">
                  <h2>Dependencies & Deliverables</h2>
                  <button type="button" className="ms-btn" onClick={() => setSaveMessage("Deliverable linking will be connected to the deliverables module.")}>
                    <Plus size={14} /> Add Deliverable
                  </button>
                </div>
                <div className="ms-empty-link">
                  <FileText size={23} />
                  <strong>No deliverables linked yet</strong>
                  <span>Link documents, tasks or outputs required to complete this milestone.</span>
                </div>
              </section>
            </>
          )}

          {step === 3 && (
            <section className="ms-card">
              <div className="ms-card-heading"><h2>Resources & Budget</h2></div>
              <div className="ms-form-grid">
                <SelectField
                  label="Milestone Owner"
                  name="owner"
                  required
                  options={ownerOptions.map((name) => ({ value: name, label: name }))}
                />
                <TextField label="Estimated Budget (INR)" name="budget" type="number" />
                <label className="ms-field ms-field-full">
                  <span>Resource Notes</span>
                  <textarea rows={4} placeholder="Describe required people, equipment or other resources..." />
                </label>
              </div>
              <div className="ms-info-note">
                <ShieldCheck size={17} />
                Resource allocation and budget approvals will follow the project's access permissions.
              </div>
            </section>
          )}

          {step === 4 && (
            <>
              <section className="ms-card">
                <div className="ms-card-heading"><h2>Additional Information</h2></div>
                <div className="ms-form-grid">
                  <SelectField
                    label="Requested By"
                    name="requestedBy"
                    options={ownerOptions.map((name) => ({ value: name, label: name }))}
                  />
                  <SelectField
                    label="Milestone Owner"
                    name="owner"
                    options={ownerOptions.map((name) => ({ value: name, label: name }))}
                  />
                  <TextAreaField label="Additional Notes" name="notes" placeholder="Add relevant notes or instructions..." />
                </div>
              </section>

              <section className="ms-card">
                <div className="ms-card-heading"><h2>Attachments</h2></div>
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
              <div className="ms-card-heading"><h2>Review & Submit</h2></div>
              <div className="ms-review-grid">
                <div><span>Milestone ID</span><strong>{values.milestoneId}</strong></div>
                <div><span>Title</span><strong>{values.title || "—"}</strong></div>
                <div><span>Project</span><strong>{selectedProject?.name ?? values.projectId}</strong></div>
                <div><span>Type</span><strong>{values.type}</strong></div>
                <div><span>Priority</span><strong>{values.priority}</strong></div>
                <div><span>Status</span><strong>{values.status}</strong></div>
                <div><span>Planned Start</span><strong>{values.plannedStart || "—"}</strong></div>
                <div><span>Planned End</span><strong>{values.plannedEnd || "—"}</strong></div>
                <div><span>Duration</span><strong>{duration} days</strong></div>
                <div><span>Progress</span><strong>{values.progress}%</strong></div>
                <div><span>Owner</span><strong>{values.owner}</strong></div>
                <div><span>Budget</span><strong>₹{Number(values.budget || 0).toLocaleString("en-IN")}</strong></div>
              </div>
              <div className="ms-review-description">
                <strong>Description</strong>
                <p>{values.description || "No description provided."}</p>
              </div>
              <div className="ms-info-note">
                <ShieldCheck size={17} />
                Review the milestone information before submitting it for the configured approval workflow.
              </div>
            </section>
          )}

          <div className="ms-bottom-actions">
            <Link href="/milestones" className="ms-btn">Cancel</Link>
            <div>
              <button type="button" className="ms-btn" onClick={handleSaveDraft}>
                <Save size={14} /> Save as Draft
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
                <button type="button" className="ms-btn ms-btn-primary" onClick={handleSubmit}>
                  {mode === "edit" ? "Update Milestone" : "Submit Milestone"}
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="ms-side-column">
          <section className="ms-card ms-summary-card">
            <h2>Milestone Summary</h2>
            <dl>
              <div><dt>Milestone ID</dt><dd>{values.milestoneId || "—"}</dd></div>
              <div><dt>Title</dt><dd>{values.title || "—"}</dd></div>
              <div><dt>Project</dt><dd>{values.projectId} - {selectedProject?.name}</dd></div>
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
            <h2>Approval Status</h2>
            {[
              ["Not Submitted", "Milestone not submitted for approval", "pending"],
              ["Submitted", "Pending approval", "active"],
              ["Approved", "Approved by all required approvers", "success"],
              ["Rejected", "Returned for changes", "danger"],
              ["Obsolete", "Milestone no longer applicable", "pending"],
            ].map(([title, description, state]) => (
              <div className={`ms-approval-step ${state}`} key={title}>
                <span />
                <div><strong>{title}</strong><small>{description}</small></div>
              </div>
            ))}
          </section>

          <section className="ms-card ms-quick-card">
            <h2>Quick Actions</h2>
            <Link href="/milestones/calendar"><CalendarDays size={16} /> View Milestone Calendar</Link>
            <Link href="/milestones/timeline"><Clock3 size={16} /> View Milestone Timeline</Link>
            <Link href="/milestones/reports"><FileText size={16} /> View Milestone Report</Link>
          </section>
        </aside>
      </div>
    </section>
  );
}
