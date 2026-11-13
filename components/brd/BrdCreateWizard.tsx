
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  File,
  FileCheck2,
  FileText,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Users,
  X,
} from "lucide-react";

import { brdApi } from "../../lib/brd/api";
import type { BrdCreateInput } from "../../lib/brd/types";
import "./brd-create-wizard.css";

const STEPS = [
  "Identity",
  "Requirements",
  "Scope",
  "Stakeholders",
  "Attachments",
  "Review & Submit",
] as const;

type Stakeholder = {
  id: string;
  name: string;
  role: string;
  organization: string;
  responsibility: string;
  contact: string;
  access: "Editor" | "Viewer";
};

type Deliverable = {
  id: string;
  name: string;
  description: string;
  owner: string;
  targetDate: string;
};

type FormState = {
  title: string;
  code: string;
  projectCode: string;
  projectName: string;
  client: string;
  brdType: string;
  version: string;
  status: string;
  priority: string;
  confidentiality: string;
  description: string;
  objectives: string;
  requirementsSummary: string;
  inScope: string[];
  outOfScope: string[];
  deliverables: Deliverable[];
  stakeholders: Stakeholder[];
};

const initialState: FormState = {
  title: "",
  code: "BRD-25-001",
  projectCode: "PRJ-001",
  projectName: "",
  client: "",
  brdType: "Business",
  version: "v1.0",
  status: "Draft",
  priority: "High",
  confidentiality: "Internal",
  description: "",
  objectives: "",
  requirementsSummary: "",
  inScope: [],
  outOfScope: [],
  deliverables: [],
  stakeholders: [],
};

const initialStakeholder: Stakeholder = {
  id: "",
  name: "",
  role: "",
  organization: "",
  responsibility: "",
  contact: "",
  access: "Editor",
};

const initialDeliverable: Deliverable = {
  id: "",
  name: "",
  description: "",
  owner: "",
  targetDate: "",
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function Field({
  label,
  required,
  children,
  error,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
  className?: string;
}) {
  return (
    <label className={`bcw-field ${className}`}>
      <span>
        {label} {required && <b aria-hidden="true">*</b>}
      </span>
      {children}
      {error && <small className="bcw-field-error">{error}</small>}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
    />
  );
}

export default function BrdCreateWizard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [scopeInput, setScopeInput] = useState("");
  const [outScopeInput, setOutScopeInput] = useState("");
  const [stakeholderDraft, setStakeholderDraft] =
    useState<Stakeholder>(initialStakeholder);
  const [deliverableDraft, setDeliverableDraft] =
    useState<Deliverable>(initialDeliverable);
  const [showStakeholderForm, setShowStakeholderForm] = useState(false);
  const [showDeliverableForm, setShowDeliverableForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }

  function validateStep(currentStep: number) {
    const nextErrors: Record<string, string> = {};

    if (currentStep === 0) {
      if (!form.title.trim()) nextErrors.title = "BRD title is required.";
      if (!form.code.trim()) nextErrors.code = "BRD code is required.";
      if (!form.projectCode.trim())
        nextErrors.projectCode = "Project code is required.";
      if (!form.projectName.trim())
        nextErrors.projectName = "Project name is required.";
      if (!form.client.trim()) nextErrors.client = "Client is required.";
      if (!form.description.trim())
        nextErrors.description = "Purpose / description is required.";
    }

    if (currentStep === 1) {
      if (!form.objectives.trim())
        nextErrors.objectives = "Add at least one business objective.";
      if (!form.requirementsSummary.trim())
        nextErrors.requirementsSummary =
          "Add a high-level requirements summary.";
    }

    if (currentStep === 2) {
      if (form.inScope.length === 0)
        nextErrors.inScope = "Add at least one in-scope item.";
    }

    if (currentStep === 3 && form.stakeholders.length === 0) {
      nextErrors.stakeholders =
        "Add at least one stakeholder before continuing.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function nextStep() {
    if (!validateStep(step)) return;
    setNotice("");
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function previousStep() {
    setNotice("");
    setErrors({});
    setStep((current) => Math.max(0, current - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addListItem(kind: "inScope" | "outOfScope") {
    const value = kind === "inScope" ? scopeInput.trim() : outScopeInput.trim();
    if (!value) return;

    const current = form[kind];
    if (current.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setNotice("That item is already in the list.");
      return;
    }

    update(kind, [...current, value]);
    if (kind === "inScope") setScopeInput("");
    else setOutScopeInput("");
    setNotice("");
  }

  function removeListItem(kind: "inScope" | "outOfScope", index: number) {
    update(
      kind,
      form[kind].filter((_, itemIndex) => itemIndex !== index),
    );
  }

  function addStakeholder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !stakeholderDraft.name.trim() ||
      !stakeholderDraft.role.trim() ||
      !stakeholderDraft.contact.trim()
    ) {
      setNotice("Stakeholder name, role and contact are required.");
      return;
    }

    update("stakeholders", [
      ...form.stakeholders,
      { ...stakeholderDraft, id: makeId() },
    ]);
    setStakeholderDraft(initialStakeholder);
    setShowStakeholderForm(false);
    setNotice("");
  }

  function addDeliverable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!deliverableDraft.name.trim()) {
      setNotice("Deliverable name is required.");
      return;
    }

    update("deliverables", [
      ...form.deliverables,
      { ...deliverableDraft, id: makeId() },
    ]);
    setDeliverableDraft(initialDeliverable);
    setShowDeliverableForm(false);
    setNotice("");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    const allowedExtensions =
      /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|png|jpg|jpeg|txt|csv)$/i;

    const invalid = selectedFiles.filter((file) => !allowedExtensions.test(file.name));
    const oversized = selectedFiles.filter((file) => file.size > 10 * 1024 * 1024);
    const valid = selectedFiles.filter(
      (file) => allowedExtensions.test(file.name) && file.size <= 10 * 1024 * 1024,
    );

    setFiles((previous) => {
      const combined = [...previous];
      for (const file of valid) {
        if (!combined.some((existing) => existing.name === file.name && existing.size === file.size)) {
          combined.push(file);
        }
      }
      return combined;
    });

    if (invalid.length || oversized.length) {
      setNotice(
        "Some files were skipped. Use supported file types and files no larger than 10 MB each.",
      );
    } else if (valid.length) {
      setNotice("");
    }

    event.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((previous) => previous.filter((_, fileIndex) => fileIndex !== index));
  }

  async function submitBrd(asDraft: boolean) {
    if (submitting) return;

    if (!asDraft) {
      for (let current = 0; current < 4; current += 1) {
        if (!validateStep(current)) {
          setStep(current);
          setNotice("Please complete the required fields before submitting.");
          return;
        }
      }
    }

    setSubmitting(true);
    setNotice("");

    try {
      /*
       * The existing API contract is BrdCreateInput.
       * Only fields supported by your backend should be sent.
       *
       * Review lib/brd/types.ts and the create endpoint schema before
       * extending this payload with objectives, stakeholders or files.
       */
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        projectCode: form.projectCode.trim(),
        projectName: form.projectName.trim(),
        clientName: form.client.trim(),
        status: asDraft ? "Draft" : form.status,
        priority: form.priority,
        version: form.version,
        brdCode: form.code.trim(),
        brdType: form.brdType,
        confidentiality: form.confidentiality,
        businessObjectives: form.objectives.trim(),
        requirementsSummary: form.requirementsSummary.trim(),
        scope: {
          inScope: form.inScope,
          outOfScope: form.outOfScope,
        },
        deliverables: form.deliverables,
        stakeholders: form.stakeholders,
      } as unknown as BrdCreateInput;

      const created = await brdApi.create(payload);

      /*
       * Important:
       * Files are currently selected locally. They are NOT uploaded by
       * brdApi.create() unless your API explicitly supports file uploads.
       */
      if (files.length > 0) {
        setNotice(
          "BRD created, but attachments were not uploaded. Connect your document upload API to save these files.",
        );
        router.push(
          `/brd-requirements/brd-registry/${encodeURIComponent(created.id)}`,
        );
        return;
      }

      router.push(
        `/brd-requirements/brd-registry/${encodeURIComponent(created.id)}`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to create the BRD. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <main className="bcw-page">
      <header className="bcw-header">
        <div className="bcw-breadcrumb">
          <span className="bcw-project-chip">PRJ-001</span>
          <span>BRD &amp; Requirements</span>
          <ArrowRight size={13} />
          <strong>Create New BRD ({form.code || "New"})</strong>
        </div>

        <div className="bcw-header-actions">
          <button
            type="button"
            className="bcw-btn bcw-btn-primary"
            disabled={submitting}
            onClick={() => void submitBrd(true)}
          >
            <Save size={14} /> Save Draft
          </button>
          <Link className="bcw-btn" href="/brd-requirements/brd-registry">
            Cancel
          </Link>
        </div>
      </header>

      <section className="bcw-workspace">
        <div className="bcw-form-column">
          <div className="bcw-title-row">
            <div>
              <h1>Create New BRD ({form.code || "New"})</h1>
              <p>Build your business requirements document step by step.</p>
            </div>
            <span className="bcw-draft-badge">Draft</span>
          </div>

          <nav className="bcw-stepper" aria-label="BRD creation steps">
            {STEPS.map((label, index) => (
              <div
                className={`bcw-step ${step === index ? "is-active" : ""} ${step > index ? "is-complete" : ""}`}
                key={label}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (index < step) {
                      setStep(index);
                      setErrors({});
                    } else if (index > step && validateStep(step)) {
                      setStep(index);
                    }
                  }}
                  aria-current={step === index ? "step" : undefined}
                >
                  <span className="bcw-step-number">
                    {step > index ? <Check size={12} /> : index + 1}
                  </span>
                  <span className="bcw-step-label">{label}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <span className="bcw-step-connector" />
                )}
              </div>
            ))}
          </nav>

          <div className="bcw-progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>

          {notice && (
            <div className="bcw-notice" role="status">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice("")} aria-label="Dismiss message">
                <X size={14} />
              </button>
            </div>
          )}

          <form
            className="bcw-form-card"
            onSubmit={(event) => {
              event.preventDefault();
              if (step < STEPS.length - 1) nextStep();
              else void submitBrd(false);
            }}
          >
            {step === 0 && (
              <section className="bcw-step-content">
                <div className="bcw-section-heading">
                  <FileText size={18} />
                  <div>
                    <h2>BRD Information</h2>
                    <p>Enter the core information for this business requirement.</p>
                  </div>
                </div>

                <div className="bcw-form-grid">
                  <Field label="BRD Title" required error={errors.title}>
                    <Input value={form.title} onChange={(value) => update("title", value)} placeholder="e.g. AI-CMS Implementation BRD" />
                  </Field>
                  <Field label="BRD Code" required error={errors.code}>
                    <Input value={form.code} onChange={(value) => update("code", value)} placeholder="BRD-25-001" />
                  </Field>
                  <Field label="Project Code" required error={errors.projectCode}>
                    <Input value={form.projectCode} onChange={(value) => update("projectCode", value)} placeholder="PRJ-001" />
                  </Field>
                  <Field label="Project Name" required error={errors.projectName}>
                    <Input value={form.projectName} onChange={(value) => update("projectName", value)} placeholder="Project name" />
                  </Field>
                  <Field label="Client" required error={errors.client}>
                    <Input value={form.client} onChange={(value) => update("client", value)} placeholder="Client / organization name" />
                  </Field>
                  <Field label="BRD Type" required>
                    <Select value={form.brdType} onChange={(value) => update("brdType", value)} options={["Business", "Technical", "Functional", "Integration"]} />
                  </Field>
                  <Field label="Document Status">
                    <Select value={form.status} onChange={(value) => update("status", value)} options={["Draft", "In Review", "Approved"]} />
                  </Field>
                  <Field label="Version">
                    <Input value={form.version} onChange={(value) => update("version", value)} placeholder="v1.0" />
                  </Field>
                  <Field label="Priority" required>
                    <Select value={form.priority} onChange={(value) => update("priority", value)} options={["High", "Medium", "Low"]} />
                  </Field>
                  <Field label="Confidentiality">
                    <Select value={form.confidentiality} onChange={(value) => update("confidentiality", value)} options={["Internal", "Confidential", "Public", "Restricted"]} />
                  </Field>
                  <Field label="Description / Purpose" required error={errors.description} className="bcw-full">
                    <Textarea value={form.description} onChange={(value) => update("description", value)} placeholder="Describe the purpose and business context of this BRD..." rows={4} />
                  </Field>
                </div>
              </section>
            )}

            {step === 1 && (
              <section className="bcw-step-content">
                <div className="bcw-section-heading">
                  <FileCheck2 size={18} />
                  <div>
                    <h2>Business Objectives</h2>
                    <p>Define the business objectives this BRD aims to achieve.</p>
                  </div>
                </div>

                <Field label="Business Objectives" required error={errors.objectives}>
                  <Textarea
                    value={form.objectives}
                    onChange={(value) => update("objectives", value)}
                    rows={7}
                    placeholder={"• Improve operational efficiency\n• Improve customer experience\n• Reduce manual work"}
                  />
                </Field>

                <Field label="High Level Requirements Summary" required error={errors.requirementsSummary}>
                  <Textarea
                    value={form.requirementsSummary}
                    onChange={(value) => update("requirementsSummary", value)}
                    rows={5}
                    placeholder="Summarize the major functional and non-functional requirements..."
                  />
                </Field>
              </section>
            )}

            {step === 2 && (
              <section className="bcw-step-content">
                <div className="bcw-section-heading">
                  <ShieldCheck size={18} />
                  <div>
                    <h2>Project Scope</h2>
                    <p>Define what is included and excluded in this project.</p>
                  </div>
                </div>

                <div className="bcw-scope-grid">
                  <div className="bcw-scope-box bcw-scope-in">
                    <h3><CheckCircle2 size={15} /> In Scope (What is included?)</h3>
                    <ul>
                      {form.inScope.map((item, index) => (
                        <li key={`${item}-${index}`}>
                          <span>{item}</span>
                          <button type="button" onClick={() => removeListItem("inScope", index)} aria-label={`Remove ${item}`}><X size={13} /></button>
                        </li>
                      ))}
                    </ul>
                    <div className="bcw-add-inline">
                      <input value={scopeInput} onChange={(event) => setScopeInput(event.target.value)} placeholder="Add scope item..." onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addListItem("inScope"); } }} />
                      <button type="button" onClick={() => addListItem("inScope")} aria-label="Add in-scope item"><Plus size={15} /></button>
                    </div>
                    {errors.inScope && <small className="bcw-field-error">{errors.inScope}</small>}
                  </div>

                  <div className="bcw-scope-box bcw-scope-out">
                    <h3><X size={15} /> Out of Scope (What is excluded?)</h3>
                    <ul>
                      {form.outOfScope.map((item, index) => (
                        <li key={`${item}-${index}`}>
                          <span>{item}</span>
                          <button type="button" onClick={() => removeListItem("outOfScope", index)} aria-label={`Remove ${item}`}><X size={13} /></button>
                        </li>
                      ))}
                    </ul>
                    <div className="bcw-add-inline">
                      <input value={outScopeInput} onChange={(event) => setOutScopeInput(event.target.value)} placeholder="Add excluded item..." onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addListItem("outOfScope"); } }} />
                      <button type="button" onClick={() => addListItem("outOfScope")} aria-label="Add out-of-scope item"><Plus size={15} /></button>
                    </div>
                  </div>
                </div>

                <div className="bcw-section-subheading">
                  <h3>Deliverables</h3>
                  <button type="button" className="bcw-btn bcw-btn-outline" onClick={() => setShowDeliverableForm((value) => !value)}>
                    <Plus size={14} /> Add Deliverable
                  </button>
                </div>

                {showDeliverableForm && (
                  <form className="bcw-inline-form" onSubmit={addDeliverable}>
                    <Field label="Deliverable Name" required>
                      <Input value={deliverableDraft.name} onChange={(value) => setDeliverableDraft((old) => ({ ...old, name: value }))} placeholder="BRD Document" />
                    </Field>
                    <Field label="Description">
                      <Input value={deliverableDraft.description} onChange={(value) => setDeliverableDraft((old) => ({ ...old, description: value }))} placeholder="Deliverable description" />
                    </Field>
                    <Field label="Owner">
                      <Input value={deliverableDraft.owner} onChange={(value) => setDeliverableDraft((old) => ({ ...old, owner: value }))} placeholder="Owner name" />
                    </Field>
                    <Field label="Target Date">
                      <Input type="date" value={deliverableDraft.targetDate} onChange={(value) => setDeliverableDraft((old) => ({ ...old, targetDate: value }))} />
                    </Field>
                    <div className="bcw-inline-actions">
                      <button type="button" className="bcw-btn" onClick={() => setShowDeliverableForm(false)}>Cancel</button>
                      <button type="submit" className="bcw-btn bcw-btn-primary">Add</button>
                    </div>
                  </form>
                )}

                <div className="bcw-deliverable-list">
                  {form.deliverables.length === 0 ? (
                    <p className="bcw-empty-state">No deliverables added yet.</p>
                  ) : (
                    form.deliverables.map((item) => (
                      <div className="bcw-deliverable-row" key={item.id}>
                        <div><strong>{item.name}</strong><span>{item.description || "No description"}</span></div>
                        <span>{item.owner || "Unassigned"}</span>
                        <span>{item.targetDate || "No target date"}</span>
                        <button type="button" onClick={() => update("deliverables", form.deliverables.filter((entry) => entry.id !== item.id))} aria-label={`Remove ${item.name}`}><Trash2 size={14} /></button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="bcw-step-content">
                <div className="bcw-section-heading">
                  <Users size={18} />
                  <div>
                    <h2>Stakeholders</h2>
                    <p>Identify all key stakeholders associated with this BRD.</p>
                  </div>
                </div>

                <div className="bcw-section-subheading">
                  <h3>Stakeholder Directory</h3>
                  <button type="button" className="bcw-btn bcw-btn-outline" onClick={() => setShowStakeholderForm((value) => !value)}>
                    <Plus size={14} /> Add Stakeholder
                  </button>
                </div>

                {errors.stakeholders && <p className="bcw-field-error">{errors.stakeholders}</p>}

                {showStakeholderForm && (
                  <form className="bcw-inline-form" onSubmit={addStakeholder}>
                    <Field label="Full Name" required>
                      <Input value={stakeholderDraft.name} onChange={(value) => setStakeholderDraft((old) => ({ ...old, name: value }))} placeholder="Full name" />
                    </Field>
                    <Field label="Role / Designation" required>
                      <Input value={stakeholderDraft.role} onChange={(value) => setStakeholderDraft((old) => ({ ...old, role: value }))} placeholder="Project Manager" />
                    </Field>
                    <Field label="Organization">
                      <Input value={stakeholderDraft.organization} onChange={(value) => setStakeholderDraft((old) => ({ ...old, organization: value }))} placeholder="Organization" />
                    </Field>
                    <Field label="Responsibility">
                      <Input value={stakeholderDraft.responsibility} onChange={(value) => setStakeholderDraft((old) => ({ ...old, responsibility: value }))} placeholder="Overall delivery" />
                    </Field>
                    <Field label="Email / Contact" required>
                      <Input value={stakeholderDraft.contact} onChange={(value) => setStakeholderDraft((old) => ({ ...old, contact: value }))} placeholder="name@example.com" />
                    </Field>
                    <Field label="Access Level">
                      <Select value={stakeholderDraft.access} onChange={(value) => setStakeholderDraft((old) => ({ ...old, access: value as Stakeholder["access"] }))} options={["Editor", "Viewer"]} />
                    </Field>
                    <div className="bcw-inline-actions">
                      <button type="button" className="bcw-btn" onClick={() => setShowStakeholderForm(false)}>Cancel</button>
                      <button type="submit" className="bcw-btn bcw-btn-primary">Add Stakeholder</button>
                    </div>
                  </form>
                )}

                <div className="bcw-table-wrap">
                  <table className="bcw-data-table">
                    <thead>
                      <tr>
                        <th>Name</th><th>Role / Designation</th><th>Organization</th><th>Responsibility</th><th>Contact</th><th>Access</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.stakeholders.length === 0 ? (
                        <tr><td colSpan={7} className="bcw-empty-cell">No stakeholders added yet.</td></tr>
                      ) : (
                        form.stakeholders.map((person) => (
                          <tr key={person.id}>
                            <td><strong>{person.name}</strong></td>
                            <td>{person.role}</td>
                            <td>{person.organization || "—"}</td>
                            <td>{person.responsibility || "—"}</td>
                            <td>{person.contact}</td>
                            <td><span className="bcw-access-pill">{person.access}</span></td>
                            <td><button type="button" className="bcw-delete-button" onClick={() => update("stakeholders", form.stakeholders.filter((entry) => entry.id !== person.id))} aria-label={`Remove ${person.name}`}><Trash2 size={14} /></button></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {step === 4 && (
              <section className="bcw-step-content">
                <div className="bcw-section-heading">
                  <UploadCloud size={18} />
                  <div>
                    <h2>Attachments</h2>
                    <p>Upload supporting documents, references or related files.</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="bcw-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const dropped = Array.from(event.dataTransfer.files);
                    setFiles((previous) => [...previous, ...dropped.filter((file) => !previous.some((item) => item.name === file.name && item.size === file.size))]);
                  }}
                >
                  <UploadCloud size={31} />
                  <strong>Drag &amp; drop files here or click to browse</strong>
                  <span>PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, PNG, JPG, CSV · Maximum 10 MB per file</span>
                  <span className="bcw-browse-button">Browse Files</span>
                </button>
                <input
                  ref={fileInputRef}
                  hidden
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.csv,.txt"
                  onChange={handleFileChange}
                />

                <div className="bcw-section-subheading">
                  <h3>Selected Files ({files.length})</h3>
                </div>
                <div className="bcw-file-list">
                  {files.length === 0 ? (
                    <p className="bcw-empty-state">No files selected. Attachments need a document-upload API to be saved permanently.</p>
                  ) : (
                    files.map((file, index) => (
                      <div className="bcw-file-row" key={`${file.name}-${file.size}-${index}`}>
                        <span className="bcw-file-icon"><File size={17} /></span>
                        <div><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></div>
                        <button type="button" onClick={() => removeFile(index)} aria-label={`Remove ${file.name}`}><Trash2 size={14} /></button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {step === 5 && (
              <section className="bcw-step-content">
                <div className="bcw-section-heading">
                  <CheckCircle2 size={18} />
                  <div>
                    <h2>Review &amp; Submit</h2>
                    <p>Review the document details before creating or saving the BRD.</p>
                  </div>
                </div>

                <div className="bcw-review-grid">
                  <section className="bcw-review-card">
                    <div className="bcw-review-card-heading"><h3>Identity</h3><button type="button" onClick={() => setStep(0)}>Edit</button></div>
                    <dl>
                      <dt>BRD Title</dt><dd>{form.title || "—"}</dd>
                      <dt>BRD Code</dt><dd>{form.code || "—"}</dd>
                      <dt>Project</dt><dd>{form.projectCode} · {form.projectName || "—"}</dd>
                      <dt>Client</dt><dd>{form.client || "—"}</dd>
                      <dt>BRD Type</dt><dd>{form.brdType}</dd>
                      <dt>Version</dt><dd>{form.version}</dd>
                      <dt>Priority</dt><dd>{form.priority}</dd>
                      <dt>Confidentiality</dt><dd>{form.confidentiality}</dd>
                    </dl>
                  </section>

                  <section className="bcw-review-card">
                    <div className="bcw-review-card-heading"><h3>Scope Summary</h3><button type="button" onClick={() => setStep(2)}>Edit</button></div>
                    <p><strong>In Scope</strong><span>{form.inScope.length} items</span></p>
                    <p><strong>Out of Scope</strong><span>{form.outOfScope.length} items</span></p>
                    <p><strong>Deliverables</strong><span>{form.deliverables.length} items</span></p>
                  </section>

                  <section className="bcw-review-card">
                    <div className="bcw-review-card-heading"><h3>Stakeholders</h3><button type="button" onClick={() => setStep(3)}>Edit</button></div>
                    <p><strong>Total Stakeholders</strong><span>{form.stakeholders.length}</span></p>
                    <p><strong>Editors</strong><span>{form.stakeholders.filter((item) => item.access === "Editor").length}</span></p>
                    <p><strong>Viewers</strong><span>{form.stakeholders.filter((item) => item.access === "Viewer").length}</span></p>
                  </section>

                  <section className="bcw-review-card">
                    <div className="bcw-review-card-heading"><h3>Attachments</h3><button type="button" onClick={() => setStep(4)}>Edit</button></div>
                    <p><strong>Selected Files</strong><span>{files.length}</span></p>
                    <p><strong>Total Size</strong><span>{(files.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(2)} MB</span></p>
                    <small>Files require upload integration to be stored with the BRD.</small>
                  </section>

                  <section className="bcw-review-card bcw-review-wide">
                    <div className="bcw-review-card-heading"><h3>Business Objectives</h3><button type="button" onClick={() => setStep(1)}>Edit</button></div>
                    <p className="bcw-review-text">{form.objectives || "No objectives entered."}</p>
                    <h4>High Level Requirements Summary</h4>
                    <p className="bcw-review-text">{form.requirementsSummary || "No requirements summary entered."}</p>
                  </section>

                  <section className="bcw-review-card bcw-review-wide">
                    <div className="bcw-review-card-heading"><h3>Description / Purpose</h3><button type="button" onClick={() => setStep(0)}>Edit</button></div>
                    <p className="bcw-review-text">{form.description || "No description entered."}</p>
                  </section>
                </div>
              </section>
            )}

            <footer className="bcw-form-footer">
              <Link className="bcw-btn" href="/brd-requirements/brd-registry">Cancel</Link>
              <div className="bcw-footer-right">
                {step > 0 && (
                  <button type="button" className="bcw-btn" onClick={previousStep} disabled={submitting}>
                    <ArrowLeft size={14} /> Back
                  </button>
                )}
                <button type="button" className="bcw-btn bcw-btn-outline" onClick={() => void submitBrd(true)} disabled={submitting}>
                  <Save size={14} /> Save Draft
                </button>
                {step < STEPS.length - 1 ? (
                  <button type="submit" className="bcw-btn bcw-btn-primary" disabled={submitting}>
                    Next: {STEPS[step + 1]} <ArrowRight size={14} />
                  </button>
                ) : (
                  <button type="button" className="bcw-btn bcw-btn-success" disabled={submitting} onClick={() => void submitBrd(false)}>
                    <CheckCircle2 size={15} /> {submitting ? "Creating…" : "Create BRD"}
                  </button>
                )}
              </div>
            </footer>
          </form>

          <p className="bcw-footer-note">
            <ShieldCheck size={13} />
            Creating a BRD submits the document using the configured BRD API.
            Approval workflows and file uploads must be enabled by the backend.
          </p>
        </div>

        <aside className="bcw-quick-info">
          <div className="bcw-quick-info-heading">
            <h2>Quick Info</h2>
            <span>BRD context</span>
          </div>
          <dl>
            <dt>Project Code</dt><dd>{form.projectCode || "—"}</dd>
            <dt>Client</dt><dd>{form.client || "Not selected"}</dd>
            <dt>Project Manager</dt><dd>—</dd>
            <dt>Created By</dt><dd>Current user</dd>
            <dt>Created On</dt><dd><CalendarDays size={12} /> {new Date().toLocaleDateString()}</dd>
            <dt>Last Updated</dt><dd>Not saved yet</dd>
          </dl>
          <div className="bcw-info-progress">
            <div><span>Completion</span><strong>{Math.round(progress)}%</strong></div>
            <span className="bcw-info-progress-track"><i style={{ width: `${progress}%` }} /></span>
          </div>
          <div className="bcw-info-tip">
            <ShieldCheck size={16} />
            <p>Use clear objectives, defined scope and accurate stakeholder details for an approval-ready BRD.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
