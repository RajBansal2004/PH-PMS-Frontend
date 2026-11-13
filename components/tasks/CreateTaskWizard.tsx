
"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  CloudUpload,
  Download,
  File,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  Trash2,
  X,
  CalendarDays,
  Clock3,
  UserRound,
  BriefcaseBusiness,
  ClipboardList,
  Paperclip,
  AlertCircle,
  Eye,
} from "lucide-react";
import "./create-task-wizard.css";

type TaskForm = {
  title: string;
  parent: string;
  project: string;
  sprint: string;
  type: string;
  priority: string;
  assignee: string;
  reporter: string;
  labels: string[];
  description: string;
  dependency: string;
  blockedBy: string;
  category: string;
  risk: string;
  plannedIn: string;
  acceptance: string;
  definitionOfDone: string;
  estimatedHours: string;
  remainingHours: string;
  startDate: string;
  dueDate: string;
  workingDays: string[];
  dailyCapacity: string;
  calendar: string;
  timezone: string;
  designLink: string;
  apiLink: string;
};

type UploadedFile = {
  id: string;
  name: string;
  size: string;
  type: string;
};

const initialForm: TaskForm = {
  title: "Implement login validation",
  parent: "US-145 - Doctor dashboard redesign",
  project: "AI-CMS Redesign",
  sprint: "Sprint 12 (26 May – 08 Jun 2025)",
  type: "Development",
  priority: "High",
  assignee: "Amit Kumar",
  reporter: "Mayank Swaroop",
  labels: ["Backend", "Authentication", "Login"],
  description:
    "Implement server side validation for login API including email/mobile, password, captcha and rate limiting.",
  dependency: "None",
  blockedBy: "",
  category: "Feature",
  risk: "Medium",
  plannedIn: "Sprint 12",
  acceptance:
    "Validate email/mobile format\nValidate password (min 8 chars)\nValidate captcha token\nOn success return JWT token\nOn failure return proper error codes",
  definitionOfDone:
    "Code complete\nUnit tests written\nCode reviewed\nDeployed to dev\nVerified by QA",
  estimatedHours: "8",
  remainingHours: "8",
  startDate: "2025-05-27",
  dueDate: "2025-05-30",
  workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  dailyCapacity: "8 hrs / day",
  calendar: "Default Project Calendar",
  timezone: "(GMT+05:30) Asia/Kolkata",
  designLink: "https://figma.com/file/abc123/login-design",
  apiLink: "https://confluence.pheos.com/display/API/Login+API",
};

const steps = [
  "Basic Information",
  "Task Details",
  "Estimates",
  "Attachments",
  "Review",
];

const people = [
  "Amit Kumar",
  "Mayank Swaroop",
  "Priya Verma",
  "Rahul Sharma",
  "Neha Gupta",
  "Vikas Singh",
];

const stepFields: Record<number, string[]> = {
  0: ["title", "parent", "project", "sprint", "type", "priority", "assignee"],
  1: ["description", "acceptance", "definitionOfDone"],
  2: ["estimatedHours", "remainingHours", "startDate", "dueDate"],
  3: [],
  4: [],
};

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="ctw-field">
      <span className="ctw-field-label">
        {required && <i>*</i>}
        {label}
      </span>
      {children}
    </label>
  );
}

function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return <input className="ctw-input" {...props} />;
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="ctw-select-wrap">
      <select
        className="ctw-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown size={14} />
    </div>
  );
}

export default function CreateTaskWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<TaskForm>(initialForm);
  const [files, setFiles] = useState<UploadedFile[]>([
    {
      id: "file-1",
      name: "login_api_spec.pdf",
      size: "1.2 MB",
      type: "pdf",
    },
    {
      id: "file-2",
      name: "login_flow.png",
      size: "890 KB",
      type: "image",
    },
  ]);
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [taskId, setTaskId] = useState("TSK-016");
  const [createAnother, setCreateAnother] = useState(false);
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const update = <K extends keyof TaskForm>(
    key: K,
    value: TaskForm[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const progress = useMemo(
    () => Math.round(((step + 1) / steps.length) * 100),
    [step],
  );

  const duration = useMemo(() => {
    if (!form.startDate || !form.dueDate) return 0;
    const start = new Date(`${form.startDate}T00:00:00`);
    const end = new Date(`${form.dueDate}T00:00:00`);
    if (end < start) return 0;
    let days = 0;
    const current = new Date(start);
    while (current <= end) {
      if (form.workingDays.includes(
        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][current.getDay()],
      )) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [form.startDate, form.dueDate, form.workingDays]);

  const estimated = Number(form.estimatedHours) || 0;
  const remaining = Number(form.remainingHours) || 0;
  const daily = Number.parseInt(form.dailyCapacity, 10) || 8;
  const available = duration * daily;
  const buffer = Math.max(available - estimated, 0);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  };

  const validateStep = () => {
    const required: Record<number, string[]> = {
      0: ["title", "parent", "project", "sprint", "type", "priority", "assignee"],
      1: ["description"],
      2: ["estimatedHours", "remainingHours", "startDate", "dueDate"],
      3: [],
      4: [],
    };

    for (const key of required[step] || []) {
      const value = form[key as keyof TaskForm];
      if (typeof value === "string" && !value.trim()) {
        setError("Please fill all required fields before continuing.");
        return false;
      }
    }

    if (step === 2) {
      if (Number(form.estimatedHours) <= 0 || Number(form.remainingHours) < 0) {
        setError("Please enter valid hour values.");
        return false;
      }
      if (form.dueDate < form.startDate) {
        setError("Due date cannot be earlier than start date.");
        return false;
      }
    }

    setError("");
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((current) => Math.min(current + 1, 4));
  };

  const back = () => {
    setError("");
    setStep((current) => Math.max(current - 1, 0));
  };

  const addLabel = () => {
    const label = newLabel.trim();
    if (!label) return;
    if (!form.labels.includes(label)) {
      update("labels", [...form.labels, label]);
    }
    setNewLabel("");
  };

  const removeLabel = (label: string) => {
    update("labels", form.labels.filter((item) => item !== label));
  };

  const addFiles = (selected: FileList | null) => {
    if (!selected) return;
    const added = Array.from(selected).map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      name: file.name,
      size:
        file.size >= 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(file.size / 1024))} KB`,
      type: file.type.startsWith("image/") ? "image" : "pdf",
    }));
    setFiles((current) => [...current, ...added]);
  };

  const removeFile = (id: string) => {
    setFiles((current) => current.filter((file) => file.id !== id));
  };

  const toggleDay = (day: string) => {
    update(
      "workingDays",
      form.workingDays.includes(day)
        ? form.workingDays.filter((item) => item !== day)
        : [...form.workingDays, day],
    );
  };

  const saveDraft = () => {
    try {
      localStorage.setItem("ph-pms-task-draft", JSON.stringify(form));
      showToast("Task draft saved on this device.");
    } catch {
      showToast("Could not save draft in this browser.");
    }
  };

  const createTask = () => {
    if (!validateStep()) return;
    const nextId = `TSK-${String(
      16 + Math.floor(Math.random() * 84),
    ).padStart(3, "0")}`;
    setTaskId(nextId);
    setSuccess(true);
    // Connect your POST /api/tasks request here for database persistence.
  };

  const resetWizard = () => {
    setForm(initialForm);
    setFiles([]);
    setStep(0);
    setError("");
    setSuccess(false);
  };

  const renderProgress = () => (
    <div className="ctw-progress">
      {steps.map((label, index) => (
        <button
          key={label}
          type="button"
          className={`ctw-progress-step ${
            index === step ? "current" : index < step ? "completed" : ""
          }`}
          onClick={() => {
            if (index < step) setStep(index);
          }}
          disabled={index > step}
        >
          <span className="ctw-progress-circle">
            {index < step ? <Check size={13} /> : index + 1}
          </span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );

  const renderBasicInfo = () => (
    <div className="ctw-form-grid">
      <div className="ctw-form-column">
        <Field label="Task Title" required>
          <TextInput
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Enter task title"
          />
        </Field>

        <Field label="Associated Story / Parent" required>
          <SelectInput
            value={form.parent}
            onChange={(v) => update("parent", v)}
            options={[
              "US-145 - Doctor dashboard redesign",
              "US-146 - Patient profile",
              "US-147 - Login and authentication",
            ]}
          />
        </Field>

        <div className="ctw-two-fields">
          <Field label="Project" required>
            <SelectInput
              value={form.project}
              onChange={(v) => update("project", v)}
              options={["AI-CMS Redesign", "PHEOS PMS", "School ERP"]}
            />
          </Field>
          <Field label="Sprint" required>
            <SelectInput
              value={form.sprint}
              onChange={(v) => update("sprint", v)}
              options={[
                "Sprint 12 (26 May – 08 Jun 2025)",
                "Sprint 13 (09 Jun – 22 Jun 2025)",
                "Backlog",
              ]}
            />
          </Field>
        </div>

        <div className="ctw-two-fields">
          <Field label="Task Type" required>
            <SelectInput
              value={form.type}
              onChange={(v) => update("type", v)}
              options={["Development", "Design", "QA", "Documentation", "Bug"]}
            />
          </Field>
          <Field label="Priority" required>
            <SelectInput
              value={form.priority}
              onChange={(v) => update("priority", v)}
              options={["High", "Medium", "Low", "Critical"]}
            />
          </Field>
        </div>

        <div className="ctw-two-fields">
          <Field label="Assignee" required>
            <SelectInput
              value={form.assignee}
              onChange={(v) => update("assignee", v)}
              options={people}
            />
          </Field>
          <Field label="Reporter">
            <SelectInput
              value={form.reporter}
              onChange={(v) => update("reporter", v)}
              options={people}
            />
          </Field>
        </div>

        <Field label="Labels">
          <div className="ctw-chip-input">
            {form.labels.map((label) => (
              <span className="ctw-chip" key={label}>
                {label}
                <button type="button" onClick={() => removeLabel(label)}>
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLabel();
                }
              }}
              placeholder="Add label..."
            />
            <button type="button" onClick={addLabel} aria-label="Add label">
              <Plus size={15} />
            </button>
          </div>
        </Field>
      </div>

      <div className="ctw-form-column ctw-basic-side">
        <div className="ctw-info-card">
          <div className="ctw-info-icon"><ClipboardList size={17} /></div>
          <div>
            <b>Task ID</b>
            <strong>Auto-generated</strong>
            <small>Task ID will be assigned when the task is created.</small>
          </div>
        </div>
        <div className="ctw-info-card">
          <div className="ctw-info-icon"><BriefcaseBusiness size={17} /></div>
          <div>
            <b>Project context</b>
            <strong>{form.project}</strong>
            <small>Tasks are linked to a project and sprint for tracking.</small>
          </div>
        </div>
        <div className="ctw-info-card">
          <div className="ctw-info-icon"><UserRound size={17} /></div>
          <div>
            <b>Task ownership</b>
            <strong>{form.assignee}</strong>
            <small>Assigned team member responsible for delivery.</small>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDetails = () => (
    <div className="ctw-form-grid">
      <div className="ctw-form-column">
        <Field label="Description" required>
          <textarea
            className="ctw-textarea ctw-description"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Describe the task..."
          />
        </Field>
        <Field label="Acceptance Criteria">
          <textarea
            className="ctw-textarea ctw-large-textarea"
            value={form.acceptance}
            onChange={(e) => update("acceptance", e.target.value)}
            placeholder="Enter acceptance criteria, one per line"
          />
        </Field>
        <Field label="Definition of Done">
          <textarea
            className="ctw-textarea ctw-large-textarea"
            value={form.definitionOfDone}
            onChange={(e) => update("definitionOfDone", e.target.value)}
            placeholder="Enter definition of done, one per line"
          />
        </Field>
      </div>

      <div className="ctw-form-column">
        <Field label="Dependency">
          <SelectInput
            value={form.dependency}
            onChange={(v) => update("dependency", v)}
            options={["None", "Finish to Start", "Start to Start", "Finish to Finish"]}
          />
        </Field>
        <Field label="Blocked By">
          <SelectInput
            value={form.blockedBy || "Select task..."}
            onChange={(v) => update("blockedBy", v === "Select task..." ? "" : v)}
            options={[
              "Select task...",
              "TSK-001 - Design login screen UI",
              "TSK-002 - API integration for login",
              "TSK-003 - Validate user login",
            ]}
          />
        </Field>
        <Field label="Tags / Labels">
          <div className="ctw-chip-input">
            {form.labels.map((label) => (
              <span className="ctw-chip" key={label}>
                {label}
                <button type="button" onClick={() => removeLabel(label)}>
                  <X size={11} />
                </button>
              </span>
            ))}
            <button type="button" onClick={() => setNewLabel("New Label")}>
              <Plus size={15} />
            </button>
          </div>
        </Field>
        <Field label="Task Category">
          <SelectInput
            value={form.category}
            onChange={(v) => update("category", v)}
            options={["Feature", "Enhancement", "Bug Fix", "Technical Debt", "Support"]}
          />
        </Field>
        <Field label="Risk">
          <SelectInput
            value={form.risk}
            onChange={(v) => update("risk", v)}
            options={["Low", "Medium", "High", "Critical"]}
          />
        </Field>
        <Field label="Planned In">
          <SelectInput
            value={form.plannedIn}
            onChange={(v) => update("plannedIn", v)}
            options={["Sprint 12", "Sprint 13", "Product Backlog"]}
          />
        </Field>
      </div>
    </div>
  );

  const renderEstimates = () => (
    <div className="ctw-form-grid">
      <div className="ctw-form-column">
        <h3 className="ctw-subheading">Estimates</h3>
        <div className="ctw-two-fields">
          <Field label="Estimated Hours" required>
            <div className="ctw-unit-input">
              <TextInput
                type="number"
                min="1"
                value={form.estimatedHours}
                onChange={(e) => update("estimatedHours", e.target.value)}
              />
              <span>hrs</span>
            </div>
          </Field>
          <Field label="Remaining Hours" required>
            <div className="ctw-unit-input">
              <TextInput
                type="number"
                min="0"
                value={form.remainingHours}
                onChange={(e) => update("remainingHours", e.target.value)}
              />
              <span>hrs</span>
            </div>
          </Field>
        </div>

        <div className="ctw-two-fields">
          <Field label="Start Date" required>
            <TextInput
              type="date"
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
            />
          </Field>
          <Field label="Due Date" required>
            <TextInput
              type="date"
              value={form.dueDate}
              onChange={(e) => update("dueDate", e.target.value)}
            />
          </Field>
        </div>

        <Field label="Planned End Date">
          <TextInput type="date" value={form.dueDate} readOnly />
        </Field>

        <Field label="Time Zone">
          <SelectInput
            value={form.timezone}
            onChange={(v) => update("timezone", v)}
            options={[
              "(GMT+05:30) Asia/Kolkata",
              "(GMT+00:00) UTC",
              "(GMT-05:00) America/New_York",
            ]}
          />
        </Field>
      </div>

      <div className="ctw-form-column">
        <h3 className="ctw-subheading">Scheduling</h3>
        <Field label="Working Days">
          <div className="ctw-days">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <label key={day}>
                <input
                  type="checkbox"
                  checked={form.workingDays.includes(day)}
                  onChange={() => toggleDay(day)}
                />
                {day}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Daily Capacity">
          <SelectInput
            value={form.dailyCapacity}
            onChange={(v) => update("dailyCapacity", v)}
            options={["4 hrs / day", "6 hrs / day", "8 hrs / day", "10 hrs / day"]}
          />
        </Field>
        <Field label="Calendar">
          <SelectInput
            value={form.calendar}
            onChange={(v) => update("calendar", v)}
            options={["Default Project Calendar", "India Working Calendar", "Custom Calendar"]}
          />
        </Field>
      </div>

      <div className="ctw-capacity-strip">
        <div><Clock3 size={16} /><span>Duration<strong>{duration} Working Days</strong></span></div>
        <div><CalendarDays size={16} /><span>Available Capacity<strong>{available.toFixed(1)} hrs</strong></span></div>
        <div><BriefcaseBusiness size={16} /><span>Estimated Hours<strong>{estimated} hrs</strong></span></div>
        <div><CheckCircle2 size={16} /><span>Buffer<strong>{buffer.toFixed(1)} hrs</strong></span></div>
      </div>
    </div>
  );

  const renderAttachments = () => (
    <div className="ctw-attachments-layout">
      <div className="ctw-form-column">
        <h3 className="ctw-subheading">Attachments</h3>
        <button
          type="button"
          className="ctw-dropzone"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
        >
          <CloudUpload size={30} />
          <strong>Drag & drop files here or</strong>
          <span>click to upload</span>
          <small>Max file size: 100 MB</small>
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      <div className="ctw-form-column">
        <h3 className="ctw-subheading">Uploaded Files ({files.length})</h3>
        <div className="ctw-file-list">
          {files.map((file) => (
            <div className="ctw-file-row" key={file.id}>
              <div className={`ctw-file-icon ${file.type}`}>
                {file.type === "image" ? <ImageIcon size={17} /> : <FileText size={17} />}
              </div>
              <div className="ctw-file-name">
                <b>{file.name}</b>
                <small>{file.size}</small>
              </div>
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                aria-label={`Remove ${file.name}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {files.length === 0 && (
            <div className="ctw-no-files">No files uploaded yet.</div>
          )}
        </div>
      </div>

      <div className="ctw-related-links">
        <h3 className="ctw-subheading">Related Links</h3>
        <Field label="Design Link">
          <div className="ctw-link-input">
            <LinkIcon size={15} />
            <TextInput
              value={form.designLink}
              onChange={(e) => update("designLink", e.target.value)}
              placeholder="https://..."
            />
          </div>
        </Field>
        <Field label="API Doc Link">
          <div className="ctw-link-input">
            <LinkIcon size={15} />
            <TextInput
              value={form.apiLink}
              onChange={(e) => update("apiLink", e.target.value)}
              placeholder="https://..."
            />
          </div>
        </Field>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="ctw-review">
      <h3 className="ctw-subheading">Review Task Details</h3>
      <div className="ctw-review-grid">
        <div className="ctw-review-column">
          <ReviewRow label="Task Title" value={form.title} />
          <ReviewRow label="Story / Parent" value={form.parent} />
          <ReviewRow label="Task Type" value={form.type} />
          <ReviewRow label="Priority" value={form.priority} />
          <ReviewRow label="Assignee" value={form.assignee} />
          <ReviewRow label="Reporter" value={form.reporter} />
          <ReviewRow label="Labels" value={form.labels.join(", ") || "—"} />
          <ReviewRow label="Status" value="To Do" badge />
        </div>
        <div className="ctw-review-column">
          <ReviewRow label="Estimated Hours" value={`${form.estimatedHours} hrs`} />
          <ReviewRow label="Remaining Hours" value={`${form.remainingHours} hrs`} />
          <ReviewRow label="Start Date" value={form.startDate} />
          <ReviewRow label="Due Date" value={form.dueDate} />
          <ReviewRow label="Duration" value={`${duration} Working Days`} />
          <ReviewRow label="Dependency" value={form.dependency} />
          <ReviewRow label="Risk" value={form.risk} />
          <ReviewRow label="Planned In" value={form.plannedIn} />
        </div>
      </div>

      <div className="ctw-review-description">
        <b>Description</b>
        <p>{form.description || "No description provided."}</p>
        <b>Acceptance Criteria</b>
        <p>{form.acceptance || "Not provided."}</p>
        <b>Definition of Done</b>
        <p>{form.definitionOfDone || "Not provided."}</p>
      </div>

      <div className="ctw-review-footer">
        <span><Paperclip size={15} /> {files.length} attachment(s)</span>
        <span><LinkIcon size={15} /> {form.designLink || form.apiLink ? "Reference links added" : "No links added"}</span>
      </div>
    </div>
  );

  if (success) {
    return (
      <main className="ctw-page">
        <div className="ctw-success">
          <div className="ctw-success-icon"><CheckCircle2 size={31} /></div>
          <div>
            <h2>Task Created Successfully!</h2>
            <p>Task ID: <strong>{taskId}</strong></p>
          </div>
          <div className="ctw-success-actions">
            <button type="button" onClick={() => {
              setSuccess(false);
              showToast(`Open task details for ${taskId} after connecting the task detail route.`);
            }}>
              <Eye size={15} /> View Task
            </button>
            <button type="button" className="primary" onClick={resetWizard}>
              <Plus size={15} /> Add Another Task
            </button>
          </div>
        </div>
        <div className="ctw-after-create">
          <b>After creation, you can:</b>
          <ul>
            <li>View the task details</li>
            <li>Create another task</li>
            <li>Return to Task Registry</li>
          </ul>
          <button type="button" onClick={() => window.location.href = "/tasks"}>
            Return to Task Registry
          </button>
        </div>
        {toast && <div className="ctw-toast">{toast}</div>}
      </main>
    );
  }

  return (
    <main className="ctw-page">
      <div className="ctw-topline">
        <div>
          <div className="ctw-heading-row">
            <div className="ctw-heading-icon"><ClipboardList size={20} /></div>
            <div>
              <h1>Create New Task</h1>
              <p>Create and schedule a task for your project team.</p>
            </div>
          </div>
        </div>
        <div className="ctw-top-actions">
          <button type="button" onClick={saveDraft}><FileText size={15} /> Save as Draft</button>
          <button type="button" onClick={() => window.location.href = "/tasks"}><X size={15} /> Cancel</button>
        </div>
      </div>

      {renderProgress()}

      <div className="ctw-main-card">
        <div className="ctw-card-heading">
          <div>
            <h2>{steps[step]}</h2>
            <p>
              {[
                "Fill in the basic details to create a new task.",
                "Add description, acceptance criteria and task dependencies.",
                "Set effort, dates, calendar and scheduling preferences.",
                "Upload relevant files and add reference links.",
                "Review all task details before creating the task.",
              ][step]}
            </p>
          </div>
          <span className="ctw-step-count">Step {step + 1} of 5</span>
        </div>

        {error && (
          <div className="ctw-error">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <div className="ctw-step-content">
          {step === 0 && renderBasicInfo()}
          {step === 1 && renderDetails()}
          {step === 2 && renderEstimates()}
          {step === 3 && renderAttachments()}
          {step === 4 && renderReview()}
        </div>

        <div className="ctw-form-footer">
          <button
            type="button"
            className="ctw-back"
            onClick={back}
            disabled={step === 0}
          >
            <ArrowLeft size={15} /> Back
          </button>
          <div className="ctw-footer-right">
            <span>{progress}% complete</span>
            <div className="ctw-progress-bar"><i style={{ width: `${progress}%` }} /></div>
            {step < 4 ? (
              <button type="button" className="ctw-next" onClick={next}>
                Next: {steps[step + 1]} <ArrowRight size={15} />
              </button>
            ) : (
              <button type="button" className="ctw-submit" onClick={createTask}>
                <CheckCircle2 size={15} /> Create Task
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="ctw-bottom-note">
        <CheckCircle2 size={15} />
        Your task details are preserved as you move between steps.
      </div>

      {toast && (
        <div className="ctw-toast">
          <CheckCircle2 size={15} /> {toast}
          <button type="button" onClick={() => setToast("")}><X size={14} /></button>
        </div>
      )}
    </main>
  );
}

function ReviewRow({
  label,
  value,
  badge = false,
}: {
  label: string;
  value: string;
  badge?: boolean;
}) {
  return (
    <div className="ctw-review-row">
      <span>{label}</span>
      {badge ? <b className="ctw-review-badge">{value}</b> : <strong>{value}</strong>}
    </div>
  );
}
