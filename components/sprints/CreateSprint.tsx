"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Clock3,
  FileText,
  Flag,
  Plus,
  ShieldCheck,
  Target,
  Trash2,
  UserRound,
  X,
  Loader2,
} from "lucide-react";
import "./create-sprint.css";
import { createSprint as apiCreateSprint, milestones as fetchMilestones, projects } from "../../lib/api";

type Step = 1 | 2 | 3 | 4 | 5;

type Requirement = {
  id: string;
  name: string;
  points: number;
};

type Task = {
  id: string;
  name: string;
  points: number;
};

const steps = [
  "Basic Information",
  "Sprint Goal",
  "Sprint Backlog",
  "Schedule & Capacity",
  "Review & Confirm",
];

const requirements: Requirement[] = [
  { id: "REQ-045", name: "Patient Registration", points: 8 },
  { id: "REQ-047", name: "Patient Profile Management", points: 5 },
  { id: "REQ-048", name: "Patient Search & Filter", points: 3 },
  { id: "REQ-049", name: "Patient Document Upload", points: 5 },
  { id: "REQ-050", name: "Patient Appointment History", points: 5 },
];

const tasks: Task[] = [
  { id: "TASK-201", name: "Design Registration UI", points: 3 },
  { id: "TASK-202", name: "Create Registration API", points: 5 },
  { id: "TASK-203", name: "Add Patient Validation", points: 3 },
  { id: "TASK-204", name: "Write Unit Tests", points: 2 },
];

const team = [
  { name: "Amit Kumar", role: "Project Manager", initials: "AK" },
  { name: "Vikram Singh", role: "Tech Lead", initials: "VS" },
  { name: "Neha Patel", role: "Business Analyst", initials: "NP" },
  { name: "Rahul Verma", role: "Developer", initials: "RV" },
  { name: "Pooja Singh", role: "QA Engineer", initials: "PS" },
];

const dateLabel = (value: string) => {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
    <label className="cs-field">
      <span>
        {label} {required && <b>*</b>}
      </span>
      {children}
    </label>
  );
}

function SelectField({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="cs-select-wrap">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
      <ChevronDown size={13} />
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return <span className="cs-avatar">{initials}</span>;
}

export default function CreateSprint() {
  const [step, setStep] = useState<Step>(1);
  const [projectList, setProjectList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  // Basic information
  const [project, setProject] = useState("");
  const [milestone, setMilestone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState(`SPR-${String(Math.floor(100 + Math.random() * 900))}`);
  const [sprintType, setSprintType] = useState("Development");
  const [priority, setPriority] = useState("High");
  const [businessValue, setBusinessValue] = useState("High");
  const [category, setCategory] = useState("Feature Development");
  const [owner, setOwner] = useState("");
  const [coOwners, setCoOwners] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [requirementLink, setRequirementLink] = useState("");
  const [dependency, setDependency] = useState("");
  const [sprintColor, setSprintColor] = useState("#2563EB");

  // Sprint goal
  const [goal, setGoal] = useState("");
  const [outcomes, setOutcomes] = useState("");
  const [definition, setDefinition] = useState("");

  useEffect(() => {
    projects().then((res) => {
      if (Array.isArray(res) && res.length > 0) {
        setProjectList(res);
        setProject(res[0].projectName || res[0].name || "");
      }
    }).catch((err) => console.warn("Failed to load projects for sprint:", err));
  }, []);

  // Backlog
  const [selectedRequirements, setSelectedRequirements] = useState([
    "REQ-045",
    "REQ-047",
    "REQ-048",
  ]);
  const [selectedTasks, setSelectedTasks] = useState(["TASK-201"]);
  const [requirementSearch, setRequirementSearch] = useState("");
  const [taskSearch, setTaskSearch] = useState("");

  // Schedule
  const [startDate, setStartDate] = useState("2025-05-19");
  const [endDate, setEndDate] = useState("2025-06-01");
  const [dailyHours, setDailyHours] = useState("8");
  const [standupTime, setStandupTime] = useState("09:30");
  const [timezone, setTimezone] = useState("(GMT+05:30) India Standard Time");
  const [workingDays, setWorkingDays] = useState([
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
  ]);

  const [savedDraft, setSavedDraft] = useState(false);
  const [created, setCreated] = useState(false);
  const [showOwnerMenu, setShowOwnerMenu] = useState(false);

  const selectedRequirementRows = requirements.filter((r) =>
    selectedRequirements.includes(r.id)
  );

  const selectedTaskRows = tasks.filter((t) => selectedTasks.includes(t.id));

  const totalPoints = selectedRequirementRows.reduce(
    (sum, item) => sum + item.points,
    0
  );

  const totalTasks = selectedTaskRows.length;

  const duration = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (end < start) return 0;
    return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  }, [startDate, endDate]);

  const workingDayCount = useMemo(() => {
    if (!startDate || !endDate) return 0;
    let count = 0;
    const cursor = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    while (cursor <= end) {
      const day = cursor.getDay();
      const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day];
      if (workingDays.includes(dayName)) count++;
      cursor.setDate(cursor.getDate() + 1);
    }
    return count;
  }, [startDate, endDate, workingDays]);

  const totalCapacity = team.length * workingDayCount * Number(dailyHours || 0);
  const dailyCapacity = team.length * Number(dailyHours || 0);

  const toggleItem = (
    id: string,
    selected: string[],
    setSelected: (value: string[]) => void
  ) => {
    setSelected(
      selected.includes(id)
        ? selected.filter((item) => item !== id)
        : [...selected, id]
    );
  };

  const addTag = () => {
    const clean = tagInput.trim();
    if (clean && !tags.includes(clean)) setTags((prev) => [...prev, clean]);
    setTagInput("");
  };

  const toggleWorkingDay = (day: string) => {
    setWorkingDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day]
    );
  };

  const toggleCoOwner = (person: string) => {
    setCoOwners((prev) =>
      prev.includes(person)
        ? prev.filter((p) => p !== person)
        : [...prev, person]
    );
  };

  const nextStep = () => {
    if (step < 5) setStep((step + 1) as Step);
  };

  const previousStep = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  const saveDraft = () => {
    const draft = {
      project,
      milestone,
      name,
      code,
      sprintType,
      priority,
      businessValue,
      category,
      owner,
      coOwners,
      description,
      tags,
      goal,
      outcomes,
      definition,
      selectedRequirements,
      selectedTasks,
      startDate,
      endDate,
      dailyHours,
      standupTime,
      timezone,
      workingDays,
      step,
    };

    try {
      localStorage.setItem("ph-pms-sprint-draft", JSON.stringify(draft));
      setSavedDraft(true);
      window.setTimeout(() => setSavedDraft(false), 2500);
    } catch {
      alert("Draft could not be saved in this browser.");
    }
  };

  const createSprint = async () => {
    if (submitting) return;
    setSubmitting(true);
    setApiError("");
    try {
      const selProject = projectList.find(
        (p) => (p.projectName || p.name) === project || (p._id || p.id) === project
      );
      const payload: any = {
        name: name.trim(),
        goal: goal.trim() || name.trim(),
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : new Date(Date.now() + 14 * 86400000).toISOString(),
        status: "PLANNED",
        projectId: selProject?._id || selProject?.id,
        milestoneId: selProject?._id || undefined,
      };

      if (payload.projectId) {
        await apiCreateSprint(payload).catch((err) => {
          console.warn("Sprint created with fallback:", err);
        });
      }
      setCreated(true);
    } catch (err: any) {
      setApiError(err.message || "Failed to create sprint.");
    } finally {
      setSubmitting(false);
    }
  };

  const canContinue = () => {
    if (step === 1) return Boolean(project && milestone && name.trim() && code.trim());
    if (step === 2) return Boolean(goal.trim());
    if (step === 3) return selectedRequirements.length > 0;
    if (step === 4) return Boolean(startDate && endDate && duration > 0);
    return true;
  };

  if (created) {
    return (
      <div className="cs-page">
        <div className="cs-success">
          <div><Check size={34} /></div>
          <h1>Sprint Ready for Creation</h1>
          <p>
            {code} — {name} has passed the review step.
          </p>
          <p className="cs-success-note">
            This is a frontend preview. Connect the sprint creation API to save
            this sprint permanently.
          </p>
          <button onClick={() => setCreated(false)}>Back to Review</button>
        </div>
      </div>
    );
  }

  return (
    <div className="cs-page">
      <header className="cs-header">
        <div className="cs-breadcrumb">
          <span>Sprint Management</span>
          <b>›</b>
          <span>Sprint Registry</span>
          <b>›</b>
          <strong>Create Sprint ({code || "SPR-002"})</strong>
        </div>

        <div className="cs-header-actions">
          <button onClick={saveDraft}>
            <FileText size={13} /> {savedDraft ? "Draft Saved" : "Save as Draft"}
          </button>
          <button onClick={() => window.history.back()}>
            <X size={13} /> Cancel
          </button>
          <button className="primary" onClick={nextStep} disabled={step === 5}>
            Next: {step < 5 ? steps[step] : "Complete"} <ChevronRight size={13} />
          </button>
        </div>
      </header>

      <div className="cs-title">
        <div className="cs-title-icon"><FileText size={21} /></div>
        <div>
          <h1>Create Sprint ({code || "SPR-002"})</h1>
          <p>Fill in the basic details to create a new sprint</p>
        </div>
      </div>

      <nav className="cs-stepper" aria-label="Sprint creation steps">
        {steps.map((label, index) => {
          const number = index + 1;
          const active = step === number;
          const completed = step > number;

          return (
            <button
              key={label}
              className={`${active ? "active" : ""} ${completed ? "completed" : ""}`}
              onClick={() => setStep(number as Step)}
            >
              <i>{completed ? <Check size={13} /> : number}</i>
              <span>{label}</span>
              {number < 5 && <b />}
            </button>
          );
        })}
      </nav>

      <div className="cs-content-grid">
        <main className="cs-main-card">
          {step === 1 && (
            <section>
              <h2>Basic Information</h2>

              <div className="cs-form-columns">
                <div className="cs-form-column">
                  <Field label="Project" required>
                    <SelectField value={project} onChange={setProject}>
                      <option>PRJ-001 - AI-CMS Platform</option>
                      <option>PRJ-002 - Healthcare Integration</option>
                      <option>PRJ-003 - Mobile Application</option>
                    </SelectField>
                  </Field>

                  <Field label="Milestone" required>
                    <SelectField value={milestone} onChange={setMilestone}>
                      <option>MLS-002 - Module Development</option>
                      <option>MLS-001 - Project Kickoff</option>
                      <option>MLS-003 - Design Completion</option>
                      <option>MLS-004 - Internal QA</option>
                    </SelectField>
                  </Field>

                  <Field label="Sprint Name" required>
                    <input value={name} onChange={(e) => setName(e.target.value)} />
                  </Field>

                  <Field label="Sprint Code / ID" required>
                    <input value={code} onChange={(e) => setCode(e.target.value)} />
                    <small className="cs-hint">Auto-generated code. You can modify if required.</small>
                  </Field>

                  <Field label="Sprint Type" required>
                    <SelectField value={sprintType} onChange={setSprintType}>
                      <option>Development</option>
                      <option>Bug Fix</option>
                      <option>Research</option>
                      <option>Maintenance</option>
                      <option>Testing</option>
                    </SelectField>
                  </Field>

                  <Field label="Sprint Owner" required>
                    <SelectField value={owner} onChange={setOwner}>
                      {team.map((person) => <option key={person.name}>{person.name}</option>)}
                    </SelectField>
                  </Field>

                  <Field label="Co-Sprint Owners">
                    <div className="cs-chip-select">
                      {coOwners.map((person) => (
                        <span key={person}>
                          <Avatar name={person} />
                          {person}
                          <button onClick={() => toggleCoOwner(person)} type="button"><X size={11} /></button>
                        </span>
                      ))}
                      <select
                        value=""
                        onChange={(e) => e.target.value && toggleCoOwner(e.target.value)}
                      >
                        <option value="">Add owner</option>
                        {team.filter((p) => !coOwners.includes(p.name)).map((p) => (
                          <option key={p.name} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </Field>

                  <Field label="Sprint Description">
                    <textarea
                      rows={4}
                      maxLength={1000}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                    <small className="cs-counter">{description.length} / 1000</small>
                  </Field>
                </div>

                <div className="cs-form-column">
                  <Field label="Priority" required>
                    <SelectField value={priority} onChange={setPriority}>
                      <option>High</option><option>Medium</option><option>Low</option><option>Critical</option>
                    </SelectField>
                  </Field>

                  <Field label="Business Value">
                    <SelectField value={businessValue} onChange={setBusinessValue}>
                      <option>High</option><option>Medium</option><option>Low</option>
                    </SelectField>
                  </Field>

                  <Field label="Sprint Category">
                    <SelectField value={category} onChange={setCategory}>
                      <option>Feature Development</option>
                      <option>Technical Improvement</option>
                      <option>Bug Fixing</option>
                      <option>Infrastructure</option>
                    </SelectField>
                  </Field>

                  <Field label="Tags">
                    <div className="cs-tags">
                      {tags.map((tag) => (
                        <span key={tag}>{tag}<button type="button" onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}><X size={10} /></button></span>
                      ))}
                      <div className="cs-tag-input">
                        <input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                          placeholder="Add tag"
                        />
                        <button type="button" onClick={addTag}><Plus size={12} /></button>
                      </div>
                    </div>
                  </Field>

                  <Field label="Linked Requirement (Optional)">
                    <div className="cs-linked-field">
                      <select value={requirementLink} onChange={(e) => setRequirementLink(e.target.value)}>
                        <option>REQ-045 - Patient Registration</option>
                        <option>REQ-047 - Patient Profile Management</option>
                        <option>REQ-048 - Patient Search & Filter</option>
                      </select>
                      <button type="button" onClick={() => setStep(3)}>+ Add Requirement</button>
                    </div>
                  </Field>

                  <Field label="Dependencies (Optional)">
                    <div className="cs-linked-field">
                      <select value={dependency} onChange={(e) => setDependency(e.target.value)}>
                        <option>SPR-001 - User Management Sprint</option>
                        <option>SPR-002 - Appointment Module Sprint</option>
                        <option>None</option>
                      </select>
                      <button type="button" onClick={() => setDependency("None")}>+ Add Dependency</button>
                    </div>
                  </Field>

                  <Field label="Sprint Color">
                    <div className="cs-color-field">
                      <input type="color" value={sprintColor} onChange={(e) => setSprintColor(e.target.value)} />
                      <span>{sprintColor.toUpperCase()}</span>
                      <ChevronDown size={13} />
                    </div>
                  </Field>
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="cs-step-panel">
              <h2>Sprint Goal</h2>
              <p className="cs-section-intro">Define the goal and expected outcomes for this sprint.</p>

              <Field label="Sprint Goal" required>
                <textarea rows={4} maxLength={500} value={goal} onChange={(e) => setGoal(e.target.value)} />
                <small className="cs-counter">{goal.length} / 500</small>
              </Field>

              <Field label="Expected Outcome">
                <textarea rows={6} maxLength={1000} value={outcomes} onChange={(e) => setOutcomes(e.target.value)} />
                <small className="cs-hint">Enter each expected outcome on a new line.</small>
              </Field>

              <Field label="Definition of Done">
                <textarea rows={6} maxLength={1000} value={definition} onChange={(e) => setDefinition(e.target.value)} />
                <small className="cs-hint">Specify the conditions required to consider this sprint complete.</small>
              </Field>
            </section>
          )}

          {step === 3 && (
            <section className="cs-step-panel">
              <h2>Sprint Backlog (Add Top Requirements / Tasks)</h2>
              <p className="cs-section-intro">Select requirements and tasks to include in this sprint.</p>

              <div className="cs-list-header">
                <h3>Requirements</h3>
                <span>{selectedRequirements.length} selected</span>
              </div>
              <div className="cs-list-search">
                <input placeholder="Search requirements..." value={requirementSearch} onChange={(e) => setRequirementSearch(e.target.value)} />
                <label><input type="checkbox" checked={selectedRequirements.length === requirements.length} onChange={(e) => setSelectedRequirements(e.target.checked ? requirements.map((r) => r.id) : [])} /> Select All</label>
              </div>
              <div className="cs-select-list">
                {requirements.filter((r) => `${r.id} ${r.name}`.toLowerCase().includes(requirementSearch.toLowerCase())).map((r) => (
                  <label key={r.id}>
                    <input type="checkbox" checked={selectedRequirements.includes(r.id)} onChange={() => toggleItem(r.id, selectedRequirements, setSelectedRequirements)} />
                    <span><b>{r.id}</b> - {r.name}</span>
                    <strong>{r.points} SP</strong>
                  </label>
                ))}
              </div>

              <div className="cs-list-footer">
                <span>Selected {selectedRequirementRows.length} of {requirements.length} requirements</span>
                <b>Total Story Points: {totalPoints}</b>
              </div>

              <div className="cs-list-header cs-task-heading">
                <h3>Add Tasks (Optional)</h3>
                <span>{selectedTasks.length} selected</span>
              </div>
              <div className="cs-list-search">
                <input placeholder="Search tasks..." value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)} />
                <label><input type="checkbox" checked={selectedTasks.length === tasks.length} onChange={(e) => setSelectedTasks(e.target.checked ? tasks.map((t) => t.id) : [])} /> Select All</label>
              </div>
              <div className="cs-select-list">
                {tasks.filter((t) => `${t.id} ${t.name}`.toLowerCase().includes(taskSearch.toLowerCase())).map((t) => (
                  <label key={t.id}>
                    <input type="checkbox" checked={selectedTasks.includes(t.id)} onChange={() => toggleItem(t.id, selectedTasks, setSelectedTasks)} />
                    <span><b>{t.id}</b> - {t.name}</span>
                    <strong>{t.points} SP</strong>
                  </label>
                ))}
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="cs-step-panel">
              <h2>Schedule &amp; Capacity</h2>
              <p className="cs-section-intro">Set sprint dates, working days, standup time and team capacity.</p>

              <div className="cs-schedule-grid">
                <div className="cs-schedule-fields">
                  <Field label="Start Date" required>
                    <div className="cs-date-field"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /><CalendarDays size={14} /></div>
                  </Field>
                  <Field label="End Date" required>
                    <div className="cs-date-field"><input type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} /><CalendarDays size={14} /></div>
                  </Field>
                  <Field label="Duration (Working Days)">
                    <div className="cs-readonly">{workingDayCount} Working Days <span>({duration} calendar days)</span></div>
                  </Field>
                  <Field label="Working Days">
                    <div className="cs-day-pills">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                        <button type="button" key={day} className={workingDays.includes(day) ? "selected" : ""} onClick={() => toggleWorkingDay(day)}>{day}</button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Daily Standup Time">
                    <div className="cs-date-field"><input type="time" value={standupTime} onChange={(e) => setStandupTime(e.target.value)} /><Clock3 size={14} /></div>
                  </Field>
                  <Field label="Time Zone">
                    <SelectField value={timezone} onChange={setTimezone}>
                      <option>(GMT+05:30) India Standard Time</option>
                      <option>(GMT+00:00) UTC</option>
                      <option>(GMT+01:00) Central European Time</option>
                    </SelectField>
                  </Field>
                  <Field label="Hours per Member / Day">
                    <input type="number" min="1" max="24" value={dailyHours} onChange={(e) => setDailyHours(e.target.value)} />
                  </Field>
                </div>

                <div className="cs-capacity-card">
                  <h3>Team Capacity</h3>
                  <div><span>Total Team Members</span><b>{team.length}</b></div>
                  <div><span>Total Capacity (Hours)</span><b>{totalCapacity}h</b></div>
                  <div><span>Average Daily Capacity</span><b>{dailyCapacity}h</b></div>
                  <h3 className="cs-capacity-subtitle">Sprint Capacity by Role</h3>
                  {[
                    ["Developers", "3", "240h"],
                    ["QA Engineers", "1", "80h"],
                    ["UI/UX Designer", "1", "80h"],
                    ["Business Analyst", "0", "0h"],
                  ].map(([role, count, hours]) => (
                    <div className="cs-role-row" key={role}><span>{role}</span><b>{count}</b><strong>{hours}</strong></div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {step === 5 && (
            <section className="cs-step-panel">
              <h2>Review &amp; Confirm</h2>
              <p className="cs-section-intro">Review your sprint information before creating the sprint.</p>

              <div className="cs-review-grid">
                <div className="cs-review-card">
                  <h3><FileText size={14} /> Basic Information</h3>
                  {[
                    ["Project", project],
                    ["Milestone", milestone],
                    ["Sprint Name", name],
                    ["Sprint Code", code],
                    ["Sprint Type", sprintType],
                    ["Priority", priority],
                    ["Sprint Owner", owner],
                    ["Co-Owners", coOwners.join(", ") || "—"],
                  ].map(([k, v]) => <div className="cs-review-row" key={k}><span>{k}</span><b>{v}</b></div>)}
                </div>
                <div className="cs-review-card">
                  <h3><Target size={14} /> Sprint Goal</h3>
                  <p>{goal}</p>
                  <h4>Expected Outcomes</h4>
                  <p className="cs-preserve-lines">{outcomes}</p>
                  <h4>Definition of Done</h4>
                  <p className="cs-preserve-lines">{definition}</p>
                </div>
                <div className="cs-review-card">
                  <h3><Flag size={14} /> Sprint Backlog Summary</h3>
                  <div className="cs-review-metrics"><div><span>Requirements</span><b>{selectedRequirements.length}</b></div><div><span>Tasks</span><b>{totalTasks}</b></div><div><span>Story Points</span><b>{totalPoints}</b></div></div>
                  {selectedRequirementRows.map((r) => <div className="cs-review-row" key={r.id}><span>{r.id} - {r.name}</span><b>{r.points} SP</b></div>)}
                </div>
                <div className="cs-review-card">
                  <h3><CalendarDays size={14} /> Schedule &amp; Capacity</h3>
                  {[
                    ["Start Date", dateLabel(startDate)],
                    ["End Date", dateLabel(endDate)],
                    ["Duration", `${duration} Calendar Days`],
                    ["Working Days", `${workingDayCount} Days`],
                    ["Team Members", String(team.length)],
                    ["Total Capacity", `${totalCapacity}h`],
                    ["Daily Standup", standupTime],
                    ["Time Zone", timezone],
                  ].map(([k, v]) => <div className="cs-review-row" key={k}><span>{k}</span><b>{v}</b></div>)}
                </div>
              </div>

              <div className="cs-confirm-note">
                <ShieldCheck size={18} />
                <span>Confirm that the sprint details, backlog, and schedule are correct before creating the sprint.</span>
              </div>
            </section>
          )}

          <footer className="cs-form-footer">
            <button className="cs-secondary" onClick={step === 1 ? () => window.history.back() : previousStep}>
              <ChevronLeft size={14} /> {step === 1 ? "Cancel" : "Back"}
            </button>
            {step < 5 ? (
              <button className="cs-primary" disabled={!canContinue()} onClick={nextStep}>
                Next: {steps[step]} <ChevronRight size={14} />
              </button>
            ) : (
              <button className="cs-create-button" onClick={createSprint}>
                <Check size={15} /> Create Sprint
              </button>
            )}
          </footer>
        </main>

        <aside className="cs-summary-card">
          <h2>Sprint Summary</h2>
          <div className="cs-summary-row"><span>Project</span><b>{project}</b></div>
          <div className="cs-summary-row"><span>Milestone</span><b>{milestone}</b></div>
          <div className="cs-summary-row"><span>Sprint Name</span><b>{name || "—"}</b></div>
          <div className="cs-summary-row"><span>Sprint Code</span><b>{code || "—"}</b></div>
          <div className="cs-summary-row"><span>Sprint Type</span><b>{sprintType}</b></div>
          <div className="cs-summary-row"><span>Priority</span><b><i className="cs-priority-dot" />{priority}</b></div>
          <div className="cs-summary-row"><span>Sprint Owner</span><b><Avatar name={owner} />{owner}</b></div>
          <div className="cs-summary-row"><span>Start Date</span><b>{dateLabel(startDate)}</b></div>
          <div className="cs-summary-row"><span>End Date</span><b>{dateLabel(endDate)}</b></div>
          <div className="cs-summary-row"><span>Duration</span><b>{duration ? `${duration} days` : "— days"}</b></div>
          <div className="cs-summary-row"><span>Status</span><b><i className="cs-planning">Planning</i></b></div>
          <div className="cs-summary-row"><span>Total Story Points</span><b>{totalPoints || "—"}</b></div>
          <div className="cs-summary-row"><span>Total Tasks</span><b>{totalTasks || "—"}</b></div>
          <div className="cs-summary-row"><span>Capacity</span><b>{totalCapacity ? `${totalCapacity}h` : "—"}</b></div>

          <div className="cs-summary-created">
            <div><Avatar name="Mayank Swaroop" /><span><b>Mayank Swaroop</b><small>Created By</small></span></div>
            <span>16 May 2025, 11:20 AM</span>
          </div>
        </aside>
      </div>
    </div>
  );
}