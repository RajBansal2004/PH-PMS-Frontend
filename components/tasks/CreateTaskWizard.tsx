"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CloudUpload,
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
  Loader2,
} from "lucide-react";
import "./create-task-wizard.css";
import {
  projects as getProjectsApi,
  milestones as getMilestonesApi,
  requirements as getRequirementsApi,
} from "../../lib/api";
import { sprintApi, type Sprint } from "../../lib/sprints/api";
import { getStoredUser } from "../../lib/auth";
import {
  taskApi,
  isValidObjectId,
  toBackendPriority,
  toBackendStatus,
  type NormalizedTask,
} from "../../lib/tasks/api";

type TaskForm = {
  title: string;
  projectId: string;
  milestoneId: string;
  sprintId: string;
  requirementId: string;
  type: string;
  priority: string;
  status: string;
  assignee: string;
  reporter: string;
  labels: string[];
  description: string;
  dependency: string;
  blockedBy: string;
  category: string;
  risk: string;
  acceptance: string;
  definitionOfDone: string;
  estimatedHours: string;
  remainingHours: string;
  storyPoints: string;
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

const todayIso = () => new Date().toISOString().slice(0, 10);
const plusDaysIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const makeInitialForm = (): TaskForm => ({
  title: "",
  projectId: "",
  milestoneId: "",
  sprintId: "",
  requirementId: "",
  type: "Development",
  priority: "Medium",
  status: "To Do",
  assignee: "",
  reporter: "",
  labels: [],
  description: "",
  dependency: "None",
  blockedBy: "",
  category: "Feature",
  risk: "Low",
  acceptance: "",
  definitionOfDone: "",
  estimatedHours: "8",
  remainingHours: "8",
  storyPoints: "2",
  startDate: todayIso(),
  dueDate: plusDaysIso(5),
  workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  dailyCapacity: "8 hrs / day",
  calendar: "Default Project Calendar",
  timezone: "(GMT+05:30) Asia/Kolkata",
  designLink: "",
  apiLink: "",
});

const steps = [
  "Basic Information",
  "Task Details",
  "Estimates",
  "Attachments",
  "Review",
];

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

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="ctw-input" {...props} />;
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="ctw-select-wrap">
      <select
        className="ctw-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} />
    </div>
  );
}

export default function CreateTaskWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<TaskForm>(makeInitialForm);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const [projectList, setProjectList] = useState<any[]>([]);
  const [milestoneList, setMilestoneList] = useState<any[]>([]);
  const [sprintList, setSprintList] = useState<Sprint[]>([]);
  const [requirementList, setRequirementList] = useState<any[]>([]);
  const [existingTasks, setExistingTasks] = useState<NormalizedTask[]>([]);
  const [personnel, setPersonnel] = useState<{ id: string; employeeId?: string; name: string; email?: string; role?: string }[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [taskId, setTaskId] = useState("TSK-0001");
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadInitialData = async () => {
    const user = getStoredUser();
    const initialStatusParam =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("status")
        : null;

    const [codeRes, pRes, sRes, rRes, tRes, peopleRes] = await Promise.allSettled([
      taskApi.getNextCode(),
      getProjectsApi({ limit: 100 }),
      sprintApi.list({ limit: 100 }),
      getRequirementsApi({ limit: 100 }).catch(() => []),
      taskApi.list({ limit: 100 }),
      taskApi.getPersonnel(),
    ]);

    if (codeRes.status === "fulfilled" && codeRes.value?.nextCode) {
      setTaskId(codeRes.value.nextCode);
    }

    let defaultProjId = "";
    if (pRes.status === "fulfilled") {
      const raw: any = pRes.value;
      const list = Array.isArray(raw) ? raw : raw?.data || raw?.items || [];
      setProjectList(list);
      if (list.length > 0) {
        defaultProjId = list[0]._id || list[0].id;
      }
    }

    if (sRes.status === "fulfilled") {
      setSprintList(sRes.value.items || []);
    }

    if (rRes.status === "fulfilled") {
      const raw: any = rRes.value;
      const list = Array.isArray(raw) ? raw : raw?.data || raw?.items || [];
      setRequirementList(list);
    }

    if (tRes.status === "fulfilled") {
      setExistingTasks(tRes.value.items || []);
    }

    let defaultAssignee = "";
    if (peopleRes.status === "fulfilled") {
      const list = peopleRes.value || [];
      setPersonnel(list);
      if (list.length > 0) defaultAssignee = list[0].name;
    }

    setForm((prev) => ({
      ...prev,
      projectId: prev.projectId || defaultProjId,
      assignee: prev.assignee || defaultAssignee,
      reporter: prev.reporter || user?.name || defaultAssignee || "PH PMS Admin",
      status: initialStatusParam || prev.status,
    }));
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Load milestones for selected project
  useEffect(() => {
    if (!form.projectId) {
      setMilestoneList([]);
      return;
    }
    getMilestonesApi(form.projectId)
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.data || res?.items || [];
        setMilestoneList(list);
      })
      .catch(() => setMilestoneList([]));
  }, [form.projectId]);

  const projectSprints = useMemo(() => {
    if (!form.projectId) return sprintList;
    return sprintList.filter((s) => {
      const pid = typeof s.projectId === "object" ? s.projectId?._id : s.projectId;
      return !pid || pid === form.projectId;
    });
  }, [sprintList, form.projectId]);

  const projectRequirements = useMemo(() => {
    if (!form.projectId) return requirementList;
    return requirementList.filter((r) => {
      const pid = typeof r.projectId === "object" ? r.projectId?._id : r.projectId;
      return !pid || pid === form.projectId;
    });
  }, [requirementList, form.projectId]);

  const selectedProject = projectList.find((p) => (p._id || p.id) === form.projectId);
  const selectedSprint = projectSprints.find((s) => (s._id || s.id) === form.sprintId);
  const selectedReq = projectRequirements.find((r) => (r._id || r.id) === form.requirementId);

  const update = <K extends keyof TaskForm>(key: K, value: TaskForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const progress = useMemo(() => Math.round(((step + 1) / steps.length) * 100), [step]);

  const duration = useMemo(() => {
    if (!form.startDate || !form.dueDate) return 0;
    const start = new Date(`${form.startDate}T00:00:00`);
    const end = new Date(`${form.dueDate}T00:00:00`);
    if (end < start) return 0;
    let days = 0;
    const current = new Date(start);
    while (current <= end) {
      if (
        form.workingDays.includes(
          ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][current.getDay()]
        )
      ) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [form.startDate, form.dueDate, form.workingDays]);

  const estimated = Number(form.estimatedHours) || 0;
  const daily = Number.parseInt(form.dailyCapacity, 10) || 8;
  const available = duration * daily;
  const buffer = Math.max(available - estimated, 0);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  };

  const validateStep = () => {
    if (step === 0) {
      if (!form.title.trim()) {
        setError("Please enter a Task Title.");
        return false;
      }
      if (!form.projectId) {
        setError("Please select a Project before continuing.");
        return false;
      }
    }
    if (step === 1 && !form.description.trim()) {
      setError("Please enter a task description.");
      return false;
    }
    if (step === 2) {
      if (Number(form.estimatedHours) <= 0) {
        setError("Please enter a valid estimated hours value (> 0).");
        return false;
      }
      if (form.startDate && form.dueDate && form.dueDate < form.startDate) {
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
        : [...form.workingDays, day]
    );
  };

  const saveDraft = () => {
    try {
      localStorage.setItem("ph-pms-task-draft", JSON.stringify(form));
      showToast("Task draft saved.");
    } catch {
      showToast("Could not save draft in this browser.");
    }
  };

  const createTask = async () => {
    if (!validateStep() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const matchedPerson = personnel.find((p) => p.name === form.assignee);
      const backendStatus = form.sprintId
        ? toBackendStatus(form.status)
        : form.status === "To Do"
        ? "BACKLOG"
        : toBackendStatus(form.status);

      const payload: Record<string, any> = {
        taskId: taskId.trim(),
        projectId: form.projectId,
        title: form.title.trim(),
        description: form.description.trim() || form.title.trim(),
        type: form.type,
        priority: toBackendPriority(form.priority),
        status: backendStatus,
        assigneeName: form.assignee || "Unassigned",
        reporterName: form.reporter || "PH PMS Admin",
        tags: form.labels,
        category: form.category,
        risk: form.risk,
        acceptanceCriteria: form.acceptance.trim(),
        definitionOfDone: form.definitionOfDone.trim(),
        dependencies: form.dependency && form.dependency !== "None" ? [form.dependency] : [],
        blockedBy: form.blockedBy ? [form.blockedBy] : [],
        estimatedHours: Number(form.estimatedHours) || 0,
        storyPoints: Number(form.storyPoints) || Math.max(1, Math.round((Number(form.estimatedHours) || 4) / 4)),
        startDate: form.startDate ? new Date(`${form.startDate}T00:00:00`).toISOString() : null,
        dueDate: form.dueDate ? new Date(`${form.dueDate}T00:00:00`).toISOString() : null,
        designLink: form.designLink.trim(),
        apiLink: form.apiLink.trim(),
        attachments: files,
      };

      if (isValidObjectId(form.milestoneId)) payload.milestoneId = form.milestoneId;
      if (isValidObjectId(form.sprintId)) payload.sprintId = form.sprintId;
      if (isValidObjectId(form.requirementId)) payload.requirementId = form.requirementId;
      if (matchedPerson?.employeeId && isValidObjectId(matchedPerson.employeeId)) {
        payload.assigneeId = matchedPerson.employeeId;
      }

      const res = await taskApi.create(payload);
      setTaskId(res.taskId || taskId);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Failed to create task. Please verify all fields.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetWizard = async () => {
    setForm((prev) => ({
      ...makeInitialForm(),
      projectId: prev.projectId,
      assignee: prev.assignee,
      reporter: prev.reporter,
    }));
    setFiles([]);
    setStep(0);
    setError("");
    setSuccess(false);
    const codeRes = await taskApi.getNextCode();
    if (codeRes?.nextCode) setTaskId(codeRes.nextCode);
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
            placeholder="e.g. Build ABDM patient consent verification endpoint"
          />
        </Field>

        <div className="ctw-two-fields">
          <Field label="Project" required>
            <SelectInput
              value={form.projectId}
              onChange={(v) => {
                setForm((prev) => ({ ...prev, projectId: v, sprintId: "", milestoneId: "", requirementId: "" }));
              }}
              options={
                projectList.length > 0
                  ? projectList.map((p) => ({
                      value: p._id || p.id,
                      label: `${p.projectCode ? `${p.projectCode} - ` : ""}${p.projectName || p.name}`,
                    }))
                  : [{ value: "", label: "No active projects found" }]
              }
            />
          </Field>

          <Field label="Sprint">
            <SelectInput
              value={form.sprintId}
              onChange={(v) => update("sprintId", v)}
              options={[
                { value: "", label: "Product Backlog (Unassigned)" },
                ...projectSprints.map((s) => ({
                  value: s._id || s.id,
                  label: `${s.sprintCode} — ${s.name}`,
                })),
              ]}
            />
          </Field>
        </div>

        <div className="ctw-two-fields">
          <Field label="Milestone (Optional)">
            <SelectInput
              value={form.milestoneId}
              onChange={(v) => update("milestoneId", v)}
              options={[
                { value: "", label: "None" },
                ...milestoneList.map((m) => ({
                  value: m._id || m.id,
                  label: `${m.milestoneCode ? `${m.milestoneCode} - ` : ""}${m.title || m.name}`,
                })),
              ]}
            />
          </Field>

          <Field label="Linked Requirement (Optional)">
            <SelectInput
              value={form.requirementId}
              onChange={(v) => update("requirementId", v)}
              options={[
                { value: "", label: "None" },
                ...projectRequirements.map((r) => ({
                  value: r._id || r.id,
                  label: `${r.requirementId || r.reqId || r.code || "REQ"} - ${r.title}`,
                })),
              ]}
            />
          </Field>
        </div>

        <div className="ctw-two-fields">
          <Field label="Task Type" required>
            <SelectInput
              value={form.type}
              onChange={(v) => update("type", v)}
              options={["Development", "Design", "QA", "Documentation", "Bug", "Task"].map((v) => ({
                value: v,
                label: v,
              }))}
            />
          </Field>
          <Field label="Priority" required>
            <SelectInput
              value={form.priority}
              onChange={(v) => update("priority", v)}
              options={["Critical", "High", "Medium", "Low"].map((v) => ({ value: v, label: v }))}
            />
          </Field>
        </div>

        <div className="ctw-two-fields">
          <Field label="Assignee">
            <SelectInput
              value={form.assignee}
              onChange={(v) => update("assignee", v)}
              options={[
                { value: "", label: "Unassigned" },
                ...personnel.map((p) => ({
                  value: p.name,
                  label: p.email ? `${p.name} (${p.email})` : p.name,
                })),
              ]}
            />
          </Field>
          <Field label="Reporter">
            <SelectInput
              value={form.reporter}
              onChange={(v) => update("reporter", v)}
              options={[
                ...(form.reporter && !personnel.some((p) => p.name === form.reporter)
                  ? [{ value: form.reporter, label: form.reporter }]
                  : []),
                ...personnel.map((p) => ({ value: p.name, label: p.name })),
              ]}
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
              placeholder="Add label and press Enter..."
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
            <strong>{taskId}</strong>
            <small>Sequential code auto-generated from database.</small>
          </div>
        </div>
        <div className="ctw-info-card">
          <div className="ctw-info-icon"><BriefcaseBusiness size={17} /></div>
          <div>
            <b>Project &amp; Sprint</b>
            <strong>{selectedProject?.projectName || "Select a project"}</strong>
            <small>{selectedSprint ? `${selectedSprint.sprintCode} — ${selectedSprint.name}` : "Product Backlog"}</small>
          </div>
        </div>
        <div className="ctw-info-card">
          <div className="ctw-info-icon"><UserRound size={17} /></div>
          <div>
            <b>Task Ownership</b>
            <strong>{form.assignee || "Unassigned"}</strong>
            <small>Reporter: {form.reporter || "Current User"}</small>
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
            placeholder="Describe the technical scope and deliverable..."
          />
        </Field>
        <Field label="Acceptance Criteria">
          <textarea
            className="ctw-textarea ctw-large-textarea"
            value={form.acceptance}
            onChange={(e) => update("acceptance", e.target.value)}
            placeholder="Enter acceptance criteria, one per line..."
          />
        </Field>
        <Field label="Definition of Done">
          <textarea
            className="ctw-textarea ctw-large-textarea"
            value={form.definitionOfDone}
            onChange={(e) => update("definitionOfDone", e.target.value)}
            placeholder="Code reviewed, unit tests passed, QA sign-off..."
          />
        </Field>
      </div>

      <div className="ctw-form-column">
        <Field label="Initial Workflow Status">
          <SelectInput
            value={form.status}
            onChange={(v) => update("status", v)}
            options={["To Do", "In Progress", "In Review", "Testing", "Done"].map((v) => ({
              value: v,
              label: v,
            }))}
          />
        </Field>
        <Field label="Dependency Type">
          <SelectInput
            value={form.dependency}
            onChange={(v) => update("dependency", v)}
            options={["None", "Finish to Start", "Start to Start", "Finish to Finish"].map((v) => ({
              value: v,
              label: v,
            }))}
          />
        </Field>
        <Field label="Blocked By (Existing Task)">
          <SelectInput
            value={form.blockedBy}
            onChange={(v) => update("blockedBy", v)}
            options={[
              { value: "", label: "None (Unblocked)" },
              ...existingTasks.map((t) => ({
                value: `${t.taskId} - ${t.title}`,
                label: `${t.taskId} - ${t.title}`,
              })),
            ]}
          />
        </Field>
        <Field label="Task Category">
          <SelectInput
            value={form.category}
            onChange={(v) => update("category", v)}
            options={["Feature", "Enhancement", "Bug Fix", "Technical Debt", "Support"].map((v) => ({
              value: v,
              label: v,
            }))}
          />
        </Field>
        <Field label="Risk Level">
          <SelectInput
            value={form.risk}
            onChange={(v) => update("risk", v)}
            options={["Low", "Medium", "High", "Critical"].map((v) => ({ value: v, label: v }))}
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
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    estimatedHours: val,
                    remainingHours: val,
                    storyPoints: String(Math.max(1, Math.round((Number(val) || 4) / 4))),
                  }));
                }}
              />
              <span>hrs</span>
            </div>
          </Field>
          <Field label="Story Points">
            <div className="ctw-unit-input">
              <TextInput
                type="number"
                min="0"
                value={form.storyPoints}
                onChange={(e) => update("storyPoints", e.target.value)}
              />
              <span>SP</span>
            </div>
          </Field>
        </div>

        <div className="ctw-two-fields">
          <Field label="Start Date">
            <TextInput
              type="date"
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
            />
          </Field>
          <Field label="Due Date">
            <TextInput
              type="date"
              min={form.startDate}
              value={form.dueDate}
              onChange={(e) => update("dueDate", e.target.value)}
            />
          </Field>
        </div>

        <Field label="Time Zone">
          <SelectInput
            value={form.timezone}
            onChange={(v) => update("timezone", v)}
            options={[
              "(GMT+05:30) Asia/Kolkata",
              "(GMT+00:00) UTC",
              "(GMT-05:00) America/New_York",
            ].map((v) => ({ value: v, label: v }))}
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
            options={["4 hrs / day", "6 hrs / day", "8 hrs / day", "10 hrs / day"].map((v) => ({
              value: v,
              label: v,
            }))}
          />
        </Field>
        <Field label="Calendar">
          <SelectInput
            value={form.calendar}
            onChange={(v) => update("calendar", v)}
            options={["Default Project Calendar", "India Working Calendar", "Custom Calendar"].map((v) => ({
              value: v,
              label: v,
            }))}
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
          <strong>Drag &amp; drop files here or</strong>
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
          <ReviewRow label="Task ID" value={taskId} />
          <ReviewRow label="Task Title" value={form.title} />
          <ReviewRow label="Project" value={selectedProject?.projectName || "—"} />
          <ReviewRow label="Sprint" value={selectedSprint ? `${selectedSprint.sprintCode} — ${selectedSprint.name}` : "Product Backlog"} />
          <ReviewRow label="Requirement" value={selectedReq ? `${selectedReq.requirementId || selectedReq.code || ""} ${selectedReq.title}` : "—"} />
          <ReviewRow label="Task Type" value={form.type} />
          <ReviewRow label="Priority" value={form.priority} />
          <ReviewRow label="Assignee" value={form.assignee || "Unassigned"} />
          <ReviewRow label="Status" value={form.status} badge />
        </div>
        <div className="ctw-review-column">
          <ReviewRow label="Estimated Hours" value={`${form.estimatedHours} hrs`} />
          <ReviewRow label="Story Points" value={`${form.storyPoints} SP`} />
          <ReviewRow label="Start Date" value={form.startDate || "—"} />
          <ReviewRow label="Due Date" value={form.dueDate || "—"} />
          <ReviewRow label="Duration" value={`${duration} Working Days`} />
          <ReviewRow label="Blocked By" value={form.blockedBy || "None"} />
          <ReviewRow label="Category" value={form.category} />
          <ReviewRow label="Risk" value={form.risk} />
          <ReviewRow label="Labels" value={form.labels.join(", ") || "—"} />
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
            <p>Task ID: <strong>{taskId}</strong> — saved to MongoDB.</p>
          </div>
          <div className="ctw-success-actions">
            <button type="button" onClick={() => router.push("/tasks/kanban")}>
              <Eye size={15} /> Open Kanban Board
            </button>
            <button type="button" className="primary" onClick={resetWizard}>
              <Plus size={15} /> Add Another Task
            </button>
          </div>
        </div>
        <div className="ctw-after-create">
          <b>After creation, you can:</b>
          <ul>
            <li>Track and move the task on the Kanban Board</li>
            <li>Create another task for your sprint</li>
            <li>View all tasks in the Task Registry</li>
          </ul>
          <button type="button" onClick={() => router.push("/tasks")}>
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
              <h1>Create New Task ({taskId})</h1>
              <p>Create, link, and schedule a task for your project sprint.</p>
            </div>
          </div>
        </div>
        <div className="ctw-top-actions">
          <button type="button" onClick={saveDraft}><FileText size={15} /> Save as Draft</button>
          <button type="button" onClick={() => router.push("/tasks")}><X size={15} /> Cancel</button>
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
                "Add description, acceptance criteria, and task dependencies.",
                "Set effort, story points, dates, and scheduling preferences.",
                "Attach relevant files and add design/API reference links.",
                "Review all task details before persisting to database.",
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
          <button type="button" className="ctw-back" onClick={back} disabled={step === 0}>
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
              <button type="button" className="ctw-submit" onClick={createTask} disabled={submitting}>
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {submitting ? "Creating..." : "Create Task"}
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
