"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bold,
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Code2,
  FileText,
  Flag,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Target,
  Underline,
  X,
} from "lucide-react";
import "./create-sprint.css";
import {
  milestones as fetchMilestones,
  projects as getProjectsApi,
  requirements as getRequirementsApi,
  tasks as getTasksApi,
  employees as getEmployeesApi,
} from "../../lib/api";
import { getStoredUser } from "../../lib/auth";
import { sprintApi } from "../../lib/sprints/api";

type Step = 1 | 2 | 3 | 4 | 5;

type BacklogItem = {
  id: string;
  rawId?: string;
  name: string;
  points: number;
};

type PersonnelItem = {
  id: string;
  name: string;
  email?: string;
  role?: string;
};

const steps = [
  "Basic Information",
  "Sprint Goal",
  "Sprint Backlog",
  "Schedule & Capacity",
  "Review & Confirm",
];

const dateLabel = (value: string) => {
  if (!value) return "—";
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
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
  leading,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  leading?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="cs-select-wrap">
      {leading}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
      <ChevronDown size={14} />
    </div>
  );
}

function Avatar({ name, small }: { name: string; small?: boolean }) {
  const safe = (name || "U").trim();
  const initials = safe
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return <span className={`cs-avatar ${small ? "cs-avatar-sm" : ""}`}>{initials || "U"}</span>;
}

export default function CreateSprint() {
  const router = useRouter();
  const descRef = useRef<HTMLTextAreaElement>(null);
  const [step, setStep] = useState<Step>(1);

  // Dynamic lists from DB
  const [projectList, setProjectList] = useState<any[]>([]);
  const [milestoneList, setMilestoneList] = useState<any[]>([]);
  const [requirementsList, setRequirementsList] = useState<BacklogItem[]>([]);
  const [tasksList, setTasksList] = useState<BacklogItem[]>([]);
  const [existingSprints, setExistingSprints] = useState<any[]>([]);
  const [team, setTeam] = useState<PersonnelItem[]>([]);
  const [createdByName, setCreatedByName] = useState("PH PMS Admin");
  const [createdOnText, setCreatedOnText] = useState("");

  const [createdSprintId, setCreatedSprintId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  // Basic information
  const [project, setProject] = useState("");
  const [milestone, setMilestone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("SPR-0001");
  const [sprintType, setSprintType] = useState("Development");
  const [priority, setPriority] = useState("High");
  const [businessValue, setBusinessValue] = useState("High");
  const [category, setCategory] = useState("Feature Development");
  const [owner, setOwner] = useState("");
  const [coOwners, setCoOwners] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [addingTag, setAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [requirementLink, setRequirementLink] = useState("");
  const [dependency, setDependency] = useState("None");
  const [sprintColor, setSprintColor] = useState("#2563EB");

  // Sprint goal
  const [goal, setGoal] = useState("");
  const [outcomes, setOutcomes] = useState("");
  const [definition, setDefinition] = useState("");

  // Backlog selections
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [requirementSearch, setRequirementSearch] = useState("");
  const [taskSearch, setTaskSearch] = useState("");

  // Schedule
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dailyHours, setDailyHours] = useState("8");
  const [standupTime, setStandupTime] = useState("09:30");
  const [timezone, setTimezone] = useState("(GMT+05:30) India Standard Time");
  const [workingDays, setWorkingDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);

  const [savedDraft, setSavedDraft] = useState(false);
  const [created, setCreated] = useState(false);

  // Initial load from DB
  useEffect(() => {
    const user = getStoredUser();
    if (user?.name) setCreatedByName(user.name);
    setCreatedOnText(
      new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    );

    async function initForm() {
      const [codeRes, pRes, rRes, tRes, sRes, personnelRes, empRes] = await Promise.allSettled([
        sprintApi.getNextCode(),
        getProjectsApi({ limit: 100 }),
        getRequirementsApi({ limit: 100 }),
        getTasksApi({ limit: 100 }),
        sprintApi.list({ limit: 100 }),
        sprintApi.getPersonnel(),
        getEmployeesApi({ limit: 100 }).catch(() => []),
      ]);

      if (codeRes.status === "fulfilled" && codeRes.value?.nextCode) {
        setCode(codeRes.value.nextCode);
      }

      if (pRes.status === "fulfilled") {
        const raw = pRes.value;
        const list = Array.isArray(raw) ? raw : (raw as any)?.data || (raw as any)?.items || [];
        setProjectList(list);
        if (list.length > 0) {
          setProject(list[0]._id || list[0].id);
        }
      }

      if (rRes.status === "fulfilled") {
        const raw = rRes.value;
        const list = Array.isArray(raw) ? raw : (raw as any)?.data || (raw as any)?.items || [];
        const mapped: BacklogItem[] = list.map((r: any) => ({
          id: r.requirementId || r.reqId || r.requirementCode || r.code || `REQ-${String(r._id || r.id).slice(-4).toUpperCase()}`,
          rawId: r._id || r.id,
          name: r.title || "Requirement",
          points: Number(r.storyPoints || r.points || 5),
        }));
        setRequirementsList(mapped);
        if (mapped.length > 0) {
          setRequirementLink(`${mapped[0].id} - ${mapped[0].name}`);
        }
      }

      if (tRes.status === "fulfilled") {
        const raw = tRes.value;
        const list = Array.isArray(raw) ? raw : (raw as any)?.data || (raw as any)?.items || [];
        const mapped: BacklogItem[] = list.map((t: any) => ({
          id: t.taskId || t.code || `TSK-${String(t._id || t.id).slice(-4).toUpperCase()}`,
          rawId: t._id || t.id,
          name: t.title || "Engineering Task",
          points: Number(t.storyPoints || (t.estimatedHours ? Math.max(1, Math.round(t.estimatedHours / 4)) : 3)),
        }));
        setTasksList(mapped);
      }

      if (sRes.status === "fulfilled") {
        setExistingSprints(sRes.value.items || []);
      }

      // Build rich personnel list with role/designation
      const empByName = new Map<string, string>();
      if (empRes.status === "fulfilled") {
        const rawE: any = empRes.value;
        const eList = Array.isArray(rawE) ? rawE : rawE?.data || rawE?.items || [];
        eList.forEach((e: any) => {
          const full = e.displayName || `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.name;
          const role = e.designation?.name || e.designation || e.role || e.department?.name || "";
          if (full && role) empByName.set(full.toLowerCase(), String(role));
        });
      }

      if (personnelRes.status === "fulfilled" && personnelRes.value.length > 0) {
        const enriched: PersonnelItem[] = personnelRes.value.map((p) => ({
          ...p,
          role: empByName.get(p.name.toLowerCase()) || p.email || "Team Member",
        }));
        setTeam(enriched);
        setOwner(enriched[0].name);
      }
    }
    initForm();
  }, []);

  // Load milestones for selected project
  useEffect(() => {
    if (!project) return;
    fetchMilestones(project)
      .then((res) => {
        const list = Array.isArray(res) ? res : (res as any)?.data || (res as any)?.items || [];
        setMilestoneList(list);
        if (list.length > 0) {
          setMilestone(list[0]._id || list[0].id);
        } else {
          setMilestone("");
        }
      })
      .catch(() => {
        setMilestoneList([]);
        setMilestone("");
      });
  }, [project]);

  const selectedProjectObj = useMemo(
    () => projectList.find((p) => (p._id || p.id) === project),
    [projectList, project]
  );

  const selectedMilestoneObj = useMemo(
    () => milestoneList.find((m) => (m._id || m.id) === milestone),
    [milestoneList, milestone]
  );

  const ownerObj = useMemo(
    () => team.find((p) => p.name === owner),
    [team, owner]
  );

  const projectDisplay = selectedProjectObj
    ? `${selectedProjectObj.projectCode ? `${selectedProjectObj.projectCode} - ` : ""}${selectedProjectObj.projectName || selectedProjectObj.name}`
    : "—";

  const milestoneDisplay = selectedMilestoneObj
    ? `${selectedMilestoneObj.milestoneCode ? `${selectedMilestoneObj.milestoneCode} - ` : ""}${selectedMilestoneObj.title || selectedMilestoneObj.name}`
    : "—";

  const selectedRequirementRows = requirementsList.filter((r) =>
    selectedRequirements.includes(r.id)
  );
  const selectedTaskRows = tasksList.filter((t) => selectedTasks.includes(t.id));

  const totalPoints =
    selectedRequirementRows.reduce((sum, item) => sum + item.points, 0) +
    selectedTaskRows.reduce((sum, item) => sum + item.points, 0);

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

  const memberCount = Math.max(1, team.length);
  const effectiveWorkingDays = workingDayCount || 10;
  const totalCapacity = memberCount * effectiveWorkingDays * Number(dailyHours || 0);
  const dailyCapacity = memberCount * Number(dailyHours || 0);

  const roleBreakdown = useMemo(() => {
    const groups = new Map<string, number>();
    team.forEach((m) => {
      const r = m.role && !m.role.includes("@") ? m.role : "Team Members";
      groups.set(r, (groups.get(r) || 0) + 1);
    });
    return Array.from(groups.entries()).map(([role, count]) => ({
      role,
      count,
      hours: count * effectiveWorkingDays * Number(dailyHours || 0),
    }));
  }, [team, effectiveWorkingDays, dailyHours]);

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
    setAddingTag(false);
  };

  const toggleWorkingDay = (day: string) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleCoOwner = (person: string) => {
    setCoOwners((prev) =>
      prev.includes(person) ? prev.filter((p) => p !== person) : [...prev, person]
    );
  };

  const applyFormat = (wrapper: string, suffix = wrapper) => {
    const el = descRef.current;
    if (!el) {
      setDescription((prev) => `${prev}${wrapper}`);
      return;
    }
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const selected = description.slice(start, end) || "text";
    const next = `${description.slice(0, start)}${wrapper}${selected}${suffix}${description.slice(end)}`;
    setDescription(next.slice(0, 1000));
    window.setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + wrapper.length, start + wrapper.length + selected.length);
    }, 0);
  };

  const canContinue = () => {
    if (step === 1) return Boolean(project && name.trim() && code.trim());
    if (step === 2) return Boolean(goal.trim() || name.trim());
    if (step === 4) return Boolean(startDate && endDate && duration > 0);
    return true;
  };

  const nextStep = () => {
    // Initialize default dates when entering Schedule step if not set yet
    if (step === 3 && !startDate) {
      const today = new Date();
      const end = new Date();
      end.setDate(today.getDate() + 13);
      setStartDate(today.toISOString().slice(0, 10));
      setEndDate(end.toISOString().slice(0, 10));
    }
    if (step < 5) setStep((step + 1) as Step);
  };

  const previousStep = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  const saveDraft = () => {
    try {
      localStorage.setItem(
        "ph-pms-sprint-draft",
        JSON.stringify({
          project,
          milestone,
          name,
          code,
          sprintType,
          priority,
          owner,
          goal,
          startDate,
          endDate,
        })
      );
      setSavedDraft(true);
      window.setTimeout(() => setSavedDraft(false), 2500);
    } catch {
      // ignore storage errors
    }
  };

  const createSprint = async () => {
    if (submitting) return;
    setSubmitting(true);
    setApiError("");
    try {
      const matchedOwner = team.find((p) => p.name === owner);
      const safeStart = startDate ? new Date(`${startDate}T00:00:00`) : new Date();
      const safeEnd = endDate ? new Date(`${endDate}T00:00:00`) : new Date(safeStart.getTime() + 13 * 86400000);

      const payload: any = {
        name: name.trim(),
        sprintCode: code.trim(),
        goal: goal.trim() || name.trim(),
        description: description.trim(),
        outcomes: outcomes.trim(),
        definitionOfDone: definition.trim(),
        startDate: safeStart.toISOString(),
        endDate: safeEnd.toISOString(),
        status: "PLANNED",
        projectId: project,
        milestoneId: milestone || undefined,
        ownerId: matchedOwner?.id || undefined,
        ownerName: owner || matchedOwner?.name || createdByName,
        type: sprintType,
        category,
        businessValue,
        tags,
        sprintColor,
        durationDays: duration || 14,
        capacity: totalCapacity || 40,
        plannedStoryPoints: totalPoints || 0,
        priority: priority || "Medium",
        planning: {
          selectedIds: [...selectedRequirements, ...selectedTasks],
          workingDays,
          standupTime,
          timeZone: timezone,
          dailyHours: Number(dailyHours || 8),
          coOwners,
          linkedRequirement: requirementLink,
          predecessorSprint: dependency,
        },
      };

      const res = await sprintApi.create(payload);
      const newId = res?._id || res?.id || code;
      setCreatedSprintId(newId);
      setCreated(true);
    } catch (err: any) {
      console.error("Failed to create sprint:", err);
      setApiError(err?.message || "Failed to create sprint. Please verify dates and project selection.");
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <div className="cs-page">
        <div className="cs-success-card">
          <div className="cs-success-icon"><Check size={28} /></div>
          <h1>Sprint Created Successfully!</h1>
          <p>
            <strong>{code} — {name}</strong> has been registered in the PMS database for <strong>{projectDisplay}</strong>.
          </p>
          <div className="cs-success-actions">
            <button
              type="button"
              className="cs-btn cs-btn-outline-blue"
              onClick={() => router.push("/sprints")}
            >
              Go to Sprint Registry
            </button>
            <button
              type="button"
              className="cs-btn cs-btn-primary"
              onClick={() => router.push(`/sprints/${encodeURIComponent(createdSprintId)}/planning`)}
            >
              Open Sprint Planning
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cs-page">
      {/* Top Breadcrumb & Header Action Bar (Exact match to SPR-002) */}
      <header className="cs-header">
        <div className="cs-breadcrumb">
          <span onClick={() => router.push("/sprints")}>Sprint Management</span>
          <b>›</b>
          <span onClick={() => router.push("/sprints")}>Sprint Registry</span>
          <b>›</b>
          <strong>Create Sprint ({code})</strong>
        </div>

        <div className="cs-header-actions">
          <button type="button" className="cs-btn cs-btn-outline-blue" onClick={saveDraft}>
            <Save size={14} />
            {savedDraft ? "Draft Saved ✓" : "Save as Draft"}
          </button>
          <button type="button" className="cs-btn" onClick={() => router.push("/sprints")}>
            <X size={14} />
            Cancel
          </button>
          {step < 5 ? (
            <button
              type="button"
              className="cs-btn cs-btn-primary"
              disabled={!canContinue()}
              onClick={nextStep}
            >
              Next: {steps[step]}
            </button>
          ) : (
            <button
              type="button"
              className="cs-btn cs-btn-success"
              disabled={submitting}
              onClick={createSprint}
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {submitting ? "Creating..." : "Create Sprint"}
            </button>
          )}
        </div>
      </header>

      {/* Title Row */}
      <div className="cs-title-row">
        <div className="cs-title-icon">
          <CalendarCheck2 size={22} strokeWidth={1.8} />
        </div>
        <div>
          <h1>Create Sprint ({code})</h1>
          <p>Fill in the basic details to create a new sprint</p>
        </div>
      </div>

      {/* 5-Step Horizontal Stepper */}
      <nav className="cs-stepper" aria-label="Create sprint steps">
        {steps.map((label, index) => {
          const stepNum = (index + 1) as Step;
          const active = step === stepNum;
          const done = step > stepNum;
          return (
            <button
              type="button"
              key={label}
              className={`cs-step ${active ? "active" : ""} ${done ? "done" : ""}`}
              onClick={() => {
                if (stepNum < step) {
                  setStep(stepNum);
                } else if (stepNum === step + 1 && canContinue()) {
                  nextStep();
                }
              }}
            >
              <span>{done ? <Check size={13} strokeWidth={2.5} /> : stepNum}</span>
              <b>{label}</b>
            </button>
          );
        })}
      </nav>

      {apiError && <div className="cs-error-banner">{apiError}</div>}

      {/* Main 2-Column Content */}
      <div className="cs-layout">
        <div className="cs-left-col">
          <main className="cs-main-card">
            {step === 1 && (
              <section>
                <h2>Basic Information</h2>

                <div className="cs-form-columns">
                  {/* Left Column */}
                  <div className="cs-form-column">
                    <Field label="Project" required>
                      <SelectField value={project} onChange={setProject}>
                        {projectList.length === 0 ? (
                          <option value="">No Active Projects Found</option>
                        ) : (
                          projectList.map((p) => (
                            <option key={p._id || p.id} value={p._id || p.id}>
                              {p.projectCode ? `${p.projectCode} - ` : ""}{p.projectName || p.name}
                            </option>
                          ))
                        )}
                      </SelectField>
                    </Field>

                    <Field label="Milestone" required>
                      <SelectField value={milestone} onChange={setMilestone}>
                        <option value="">-- No Milestone / Independent Sprint --</option>
                        {milestoneList.map((m) => (
                          <option key={m._id || m.id} value={m._id || m.id}>
                            {m.milestoneCode ? `${m.milestoneCode} - ` : ""}{m.title || m.name}
                          </option>
                        ))}
                      </SelectField>
                    </Field>

                    <Field label="Sprint Name" required>
                      <input
                        className="cs-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Patient Management Sprint"
                      />
                    </Field>

                    <Field label="Sprint Code / ID" required>
                      <div className="cs-code-inline">
                        <input
                          className="cs-input"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                        />
                        <span className="cs-code-hint">
                          Auto-generated code. You can modify if required.
                        </span>
                      </div>
                    </Field>

                    <div className="cs-two-col">
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
                        <div className="cs-owner-box">
                          <div className="cs-owner-pill">
                            <Avatar name={owner || "U"} />
                            <div className="cs-owner-meta">
                              <strong>{owner || "Select Owner"}</strong>
                              <small>{ownerObj?.role || "Sprint Lead"}</small>
                            </div>
                          </div>
                          <select
                            className="cs-owner-overlay-select"
                            aria-label="Select Sprint Owner"
                            value={owner}
                            onChange={(e) => setOwner(e.target.value)}
                          >
                            {team.length === 0 && <option value="">Loading...</option>}
                            {team.map((person) => (
                              <option key={person.id} value={person.name}>
                                {person.name}
                              </option>
                            ))}
                          </select>
                          {owner && (
                            <button
                              type="button"
                              className="cs-owner-clear"
                              title="Clear owner"
                              onClick={() => setOwner("")}
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      </Field>
                    </div>

                    <Field label="Co-Sprint Owners">
                      <div className="cs-coowners-box">
                        <div className="cs-coowners-chips">
                          {coOwners.map((personName) => {
                            const info = team.find((p) => p.name === personName);
                            return (
                              <span className="cs-person-chip" key={personName}>
                                <Avatar name={personName} />
                                <div className="cs-owner-meta">
                                  <strong>{personName}</strong>
                                  <small>{info?.role || "Co-Owner"}</small>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleCoOwner(personName)}
                                  aria-label={`Remove ${personName}`}
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            );
                          })}
                          {coOwners.length === 0 && (
                            <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: 400 }}>
                              Select co-sprint owners...
                            </span>
                          )}
                        </div>
                        <div className="cs-coowner-add">
                          <select
                            aria-label="Add co-sprint owner"
                            value=""
                            onChange={(e) => e.target.value && toggleCoOwner(e.target.value)}
                          >
                            <option value="">+ Add</option>
                            {team
                              .filter((p) => !coOwners.includes(p.name) && p.name !== owner)
                              .map((p) => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </Field>

                    <Field label="Sprint Description">
                      <div className="cs-editor-box">
                        <div className="cs-editor-toolbar">
                          <select aria-label="Text style" defaultValue="Normal">
                            <option value="Normal">Normal</option>
                            <option value="Heading">Heading</option>
                          </select>
                          <span className="cs-editor-divider" />
                          <button type="button" title="Bold" onClick={() => applyFormat("**")}>
                            <Bold size={13} />
                          </button>
                          <button type="button" title="Italic" onClick={() => applyFormat("_")}>
                            <Italic size={13} />
                          </button>
                          <button type="button" title="Underline" onClick={() => applyFormat("__")}>
                            <Underline size={13} />
                          </button>
                          <span className="cs-editor-divider" />
                          <button type="button" title="Bullet list" onClick={() => applyFormat("\n• ", "")}>
                            <List size={13} />
                          </button>
                          <button type="button" title="Numbered list" onClick={() => applyFormat("\n1. ", "")}>
                            <ListOrdered size={13} />
                          </button>
                          <span className="cs-editor-divider" />
                          <button type="button" title="Link" onClick={() => applyFormat("[", "](https://)")}>
                            <Link2 size={13} />
                          </button>
                          <button type="button" title="Code" onClick={() => applyFormat("`")}>
                            <Code2 size={13} />
                          </button>
                        </div>
                        <div className="cs-editor-body">
                          <textarea
                            ref={descRef}
                            className="cs-textarea"
                            rows={4}
                            maxLength={1000}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the focus, core modules, and deliverables for this sprint..."
                          />
                          <span className="cs-inside-counter">{description.length} / 1000</span>
                        </div>
                      </div>
                    </Field>
                  </div>

                  {/* Right Column */}
                  <div className="cs-form-column">
                    <Field label="Priority" required>
                      <SelectField
                        value={priority}
                        onChange={setPriority}
                        leading={<i className={`cs-priority-dot ${priority.toLowerCase()}`} />}
                      >
                        <option>Critical</option>
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </SelectField>
                    </Field>

                    <Field label="Business Value">
                      <SelectField value={businessValue} onChange={setBusinessValue}>
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
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
                          <span className="cs-tag-pill" key={tag}>
                            {tag}
                            <button
                              type="button"
                              onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                              aria-label={`Remove tag ${tag}`}
                            >
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                        {addingTag ? (
                          <div className="cs-tag-inline-add">
                            <input
                              autoFocus
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addTag();
                                } else if (e.key === "Escape") {
                                  setAddingTag(false);
                                  setTagInput("");
                                }
                              }}
                              onBlur={addTag}
                              placeholder="Type tag..."
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="cs-tag-add-btn"
                            onClick={() => setAddingTag(true)}
                          >
                            <Plus size={12} /> Add Tag
                          </button>
                        )}
                      </div>
                    </Field>

                    <Field label="Linked Requirement (Optional)">
                      <div className="cs-linked-field">
                        <select
                          value={requirementLink}
                          onChange={(e) => setRequirementLink(e.target.value)}
                        >
                          <option value="">None</option>
                          {requirementsList.map((r) => (
                            <option key={r.id} value={`${r.id} - ${r.name}`}>
                              {r.id} - {r.name}
                            </option>
                          ))}
                        </select>
                        <button type="button" onClick={() => setStep(3)}>
                          <Plus size={12} /> Add Requirement
                        </button>
                      </div>
                    </Field>

                    <Field label="Dependencies (Optional)">
                      <div className="cs-linked-field">
                        <select value={dependency} onChange={(e) => setDependency(e.target.value)}>
                          <option value="None">None</option>
                          {existingSprints.map((s) => (
                            <option key={s.id} value={`${s.sprintCode} - ${s.name}`}>
                              {s.sprintCode} - {s.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setStep(3)}
                        >
                          <Plus size={12} /> Add Dependency
                        </button>
                      </div>
                    </Field>

                    <Field label="Sprint Color">
                      <div className="cs-color-field">
                        <div className="cs-color-swatch" style={{ background: sprintColor }}>
                          <input
                            type="color"
                            value={sprintColor}
                            onChange={(e) => setSprintColor(e.target.value)}
                            aria-label="Pick sprint color"
                          />
                        </div>
                        <span>{sprintColor.toUpperCase()}</span>
                        <ChevronDown size={14} />
                      </div>
                    </Field>
                  </div>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="cs-step-panel">
                <h2>Sprint Goal</h2>
                <p className="cs-section-intro">
                  Define the goal and expected outcomes for this sprint.
                </p>

                <Field label="Sprint Goal" required>
                  <div className="cs-textarea-wrap">
                    <textarea
                      className="cs-textarea"
                      rows={4}
                      maxLength={500}
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      placeholder="What is the primary deliverable or release objective for this sprint?"
                    />
                    <span className="cs-inside-counter">{goal.length} / 500</span>
                  </div>
                </Field>

                <Field label="Expected Outcome">
                  <div className="cs-textarea-wrap">
                    <textarea
                      className="cs-textarea"
                      rows={5}
                      maxLength={1000}
                      value={outcomes}
                      onChange={(e) => setOutcomes(e.target.value)}
                      placeholder="• Enter each expected outcome on a new line..."
                    />
                    <span className="cs-inside-counter">{outcomes.length} / 1000</span>
                  </div>
                </Field>

                <Field label="Definition of Done">
                  <div className="cs-textarea-wrap">
                    <textarea
                      className="cs-textarea"
                      rows={5}
                      maxLength={1000}
                      value={definition}
                      onChange={(e) => setDefinition(e.target.value)}
                      placeholder="• Code complete & reviewed&#10;• Unit tests written and passed&#10;• QA verification passed"
                    />
                    <span className="cs-inside-counter">{definition.length} / 1000</span>
                  </div>
                </Field>
              </section>
            )}

            {step === 3 && (
              <section className="cs-step-panel">
                <h2>Sprint Backlog (Add Top Requirements / Tasks)</h2>
                <p className="cs-section-intro">
                  Select requirements and tasks to include in this sprint.
                </p>

                <div className="cs-list-header">
                  <h3>Select Requirements</h3>
                  <span>{selectedRequirements.length} selected</span>
                </div>
                <div className="cs-list-search">
                  <input
                    placeholder="Search requirements..."
                    value={requirementSearch}
                    onChange={(e) => setRequirementSearch(e.target.value)}
                  />
                  {requirementsList.length > 0 && (
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedRequirements.length === requirementsList.length}
                        onChange={(e) =>
                          setSelectedRequirements(
                            e.target.checked ? requirementsList.map((r) => r.id) : []
                          )
                        }
                      />
                      Select All
                    </label>
                  )}
                </div>
                <div className="cs-select-list">
                  {requirementsList.length > 0 ? (
                    requirementsList
                      .filter((r) =>
                        `${r.id} ${r.name}`.toLowerCase().includes(requirementSearch.toLowerCase())
                      )
                      .map((r) => (
                        <label key={r.id}>
                          <input
                            type="checkbox"
                            checked={selectedRequirements.includes(r.id)}
                            onChange={() =>
                              toggleItem(r.id, selectedRequirements, setSelectedRequirements)
                            }
                          />
                          <span>
                            <b>{r.id}</b> - {r.name}
                          </span>
                          <strong>{r.points} SP</strong>
                        </label>
                      ))
                  ) : (
                    <p style={{ padding: "16px", color: "#64748b", fontSize: "12.5px", margin: 0 }}>
                      No requirements found in database.
                    </p>
                  )}
                </div>

                <div className="cs-list-footer">
                  <span>
                    Selected {selectedRequirementRows.length} of {requirementsList.length} requirements
                  </span>
                  <b>Total Story Points: {totalPoints}</b>
                </div>

                <div className="cs-list-header cs-task-heading">
                  <h3>Add Tasks (Optional)</h3>
                  <span>{selectedTasks.length} selected</span>
                </div>
                <div className="cs-list-search">
                  <input
                    placeholder="Search tasks..."
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                  />
                  {tasksList.length > 0 && (
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedTasks.length === tasksList.length}
                        onChange={(e) =>
                          setSelectedTasks(e.target.checked ? tasksList.map((t) => t.id) : [])
                        }
                      />
                      Select All
                    </label>
                  )}
                </div>
                <div className="cs-select-list">
                  {tasksList.length > 0 ? (
                    tasksList
                      .filter((t) =>
                        `${t.id} ${t.name}`.toLowerCase().includes(taskSearch.toLowerCase())
                      )
                      .map((t) => (
                        <label key={t.id}>
                          <input
                            type="checkbox"
                            checked={selectedTasks.includes(t.id)}
                            onChange={() => toggleItem(t.id, selectedTasks, setSelectedTasks)}
                          />
                          <span>
                            <b>{t.id}</b> - {t.name}
                          </span>
                          <strong>{t.points} SP</strong>
                        </label>
                      ))
                  ) : (
                    <p style={{ padding: "16px", color: "#64748b", fontSize: "12.5px", margin: 0 }}>
                      No active engineering tasks found in database.
                    </p>
                  )}
                </div>
              </section>
            )}

            {step === 4 && (
              <section className="cs-step-panel">
                <h2>Schedule &amp; Capacity</h2>
                <p className="cs-section-intro">
                  Configure sprint timeline, working days, daily standup, and team capacity.
                </p>

                <div className="cs-schedule-grid">
                  <div className="cs-schedule-fields">
                    <Field label="Start Date" required>
                      <div className="cs-date-field">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                        <CalendarDays size={15} />
                      </div>
                    </Field>

                    <Field label="End Date" required>
                      <div className="cs-date-field">
                        <input
                          type="date"
                          min={startDate}
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                        <CalendarDays size={15} />
                      </div>
                    </Field>

                    <Field label="Duration (Working Days)">
                      <div className="cs-readonly">
                        <span>{workingDayCount} Days</span>
                        <strong>{duration} Calendar Days</strong>
                      </div>
                    </Field>

                    <Field label="Working Days">
                      <div className="cs-day-pills">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                          const isSelected = workingDays.includes(day);
                          return (
                            <button
                              type="button"
                              key={day}
                              className={isSelected ? "selected" : ""}
                              onClick={() => toggleWorkingDay(day)}
                            >
                              {day} {isSelected && <X size={11} />}
                            </button>
                          );
                        })}
                      </div>
                    </Field>

                    <Field label="Daily Standup Time">
                      <div className="cs-date-field">
                        <input
                          type="time"
                          value={standupTime}
                          onChange={(e) => setStandupTime(e.target.value)}
                        />
                        <Clock3 size={15} />
                      </div>
                    </Field>

                    <Field label="Time Zone">
                      <SelectField value={timezone} onChange={setTimezone}>
                        <option>(GMT+05:30) India Standard Time</option>
                        <option>(GMT+00:00) UTC</option>
                        <option>(GMT+01:00) Central European Time</option>
                        <option>(GMT-05:00) Eastern Time</option>
                      </SelectField>
                    </Field>

                    <Field label="Hours per Member / Day">
                      <input
                        className="cs-input"
                        type="number"
                        min="1"
                        max="24"
                        value={dailyHours}
                        onChange={(e) => setDailyHours(e.target.value)}
                      />
                    </Field>
                  </div>

                  <div className="cs-capacity-card">
                    <h3>Team Capacity</h3>
                    <div className="cs-cap-stat">
                      <span>Total Team Members</span>
                      <b>{team.length}</b>
                    </div>
                    <div className="cs-cap-stat">
                      <span>Total Capacity (Hours)</span>
                      <b>{totalCapacity}h</b>
                    </div>
                    <div className="cs-cap-stat">
                      <span>Average Daily Capacity</span>
                      <b>{dailyCapacity}h</b>
                    </div>
                    <h3 className="cs-capacity-subtitle">Sprint Capacity by Role</h3>
                    {roleBreakdown.map((item) => (
                      <div className="cs-role-row" key={item.role}>
                        <span>{item.role}</span>
                        <b>{item.count}</b>
                        <strong>{item.hours}h</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {step === 5 && (
              <section className="cs-step-panel">
                <h2>Review &amp; Confirm</h2>
                <p className="cs-section-intro">
                  Review your sprint configuration before creating it in the database.
                </p>

                <div className="cs-review-grid">
                  <div className="cs-review-card">
                    <h3><FileText size={14} /> Basic Information</h3>
                    {[
                      ["Project", projectDisplay],
                      ["Milestone", milestoneDisplay],
                      ["Sprint Name", name || "—"],
                      ["Sprint Code", code],
                      ["Sprint Type", sprintType],
                      ["Priority", priority],
                      ["Sprint Owner", owner || "Unassigned"],
                      ["Co-Owners", coOwners.join(", ") || "—"],
                    ].map(([k, v]) => (
                      <div className="cs-review-row" key={k}>
                        <span>{k}</span>
                        <b>{v}</b>
                      </div>
                    ))}
                  </div>

                  <div className="cs-review-card">
                    <h3><Target size={14} /> Sprint Goal</h3>
                    <p>{goal || "No sprint goal defined."}</p>
                    <h4>Definition of Done</h4>
                    <p className="cs-preserve-lines">
                      {definition || "No definition of done specified."}
                    </p>
                    <h4>Schedule</h4>
                    {[
                      ["Start Date", dateLabel(startDate)],
                      ["End Date", dateLabel(endDate)],
                      ["Duration", `${workingDayCount} Working Days`],
                      ["Working Days", workingDays.join(", ")],
                    ].map(([k, v]) => (
                      <div className="cs-review-row" key={k}>
                        <span>{k}</span>
                        <b>{v}</b>
                      </div>
                    ))}
                  </div>

                  <div className="cs-review-card">
                    <h3><Flag size={14} /> Sprint Backlog Summary</h3>
                    <div className="cs-review-metrics">
                      <div><span>Requirements</span><b>{selectedRequirements.length}</b></div>
                      <div><span>Tasks</span><b>{totalTasks}</b></div>
                      <div><span>Story Points</span><b>{totalPoints}</b></div>
                    </div>
                  </div>

                  <div className="cs-review-card">
                    <h3><CalendarDays size={14} /> Team Capacity</h3>
                    <div className="cs-review-metrics">
                      <div><span>Total Members</span><b>{team.length}</b></div>
                      <div><span>Total Capacity</span><b>{totalCapacity}h</b></div>
                      <div><span>Daily Capacity</span><b>{dailyCapacity}h</b></div>
                    </div>
                  </div>
                </div>

                <div className="cs-confirm-note">
                  <ShieldCheck size={17} />
                  <span>
                    Confirm that the sprint details, backlog, and schedule are accurate before creating.
                  </span>
                </div>
              </section>
            )}
          </main>

          {/* Footer Buttons directly beneath Left Card (Exact match to SPR-002) */}
          <footer className="cs-form-footer">
            <button
              type="button"
              className="cs-btn cs-btn-outline-blue"
              onClick={step === 1 ? () => router.push("/sprints") : previousStep}
            >
              {step === 1 ? (
                "Cancel"
              ) : (
                <>
                  <ArrowLeft size={14} /> Back
                </>
              )}
            </button>

            {step < 5 ? (
              <button
                type="button"
                className="cs-btn cs-btn-primary"
                disabled={!canContinue()}
                onClick={nextStep}
              >
                Next: {steps[step]} <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                className="cs-btn cs-btn-success"
                disabled={submitting}
                onClick={createSprint}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {submitting ? "Creating..." : "Create Sprint"}
              </button>
            )}
          </footer>
        </div>

        {/* Right Sprint Summary Card (Exact match to SPR-002) */}
        <aside className="cs-summary-card">
          <h2>Sprint Summary</h2>
          <div className="cs-summary-list">
            <div className="cs-summary-row"><span>Project</span><b>{projectDisplay}</b></div>
            <div className="cs-summary-row"><span>Milestone</span><b>{milestoneDisplay}</b></div>
            <div className="cs-summary-row"><span>Sprint Name</span><b>{name || "—"}</b></div>
            <div className="cs-summary-row"><span>Sprint Code</span><b>{code || "—"}</b></div>
            <div className="cs-summary-row"><span>Sprint Type</span><b>{sprintType}</b></div>
            <div className="cs-summary-row">
              <span>Priority</span>
              <b><i className={`cs-priority-dot ${priority.toLowerCase()}`} />{priority}</b>
            </div>
            <div className="cs-summary-row">
              <span>Sprint Owner</span>
              <b>
                {owner ? (
                  <>
                    <Avatar name={owner} small />
                    {owner}
                  </>
                ) : (
                  "—"
                )}
              </b>
            </div>
            <div className="cs-summary-row"><span>Start Date</span><b>{dateLabel(startDate)}</b></div>
            <div className="cs-summary-row"><span>End Date</span><b>{dateLabel(endDate)}</b></div>
            <div className="cs-summary-row"><span>Duration</span><b>{duration ? `${duration} days` : "— days"}</b></div>
            <div className="cs-summary-row"><span>Status</span><b><i className="cs-planning">Planning</i></b></div>
            <div className="cs-summary-row"><span>Total Story Points</span><b>{totalPoints ? `${totalPoints} SP` : "—"}</b></div>
            <div className="cs-summary-row"><span>Total Tasks</span><b>{totalTasks || "—"}</b></div>
            <div className="cs-summary-row"><span>Capacity</span><b>{startDate && endDate ? `${totalCapacity}h` : "—"}</b></div>
          </div>

          <div className="cs-summary-meta">
            <div className="cs-summary-row">
              <span>Created By</span>
              <b><Avatar name={createdByName} small />{createdByName}</b>
            </div>
            <div className="cs-summary-row">
              <span>Created On</span>
              <b>{createdOnText || "—"}</b>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
