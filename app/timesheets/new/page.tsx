"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Clock,
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  Search,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Briefcase,
} from "lucide-react";
import {
  timesheetApi,
  tsLookupApi,
  WORK_TYPES,
  WorkType,
  computeHoursBetween,
  formatShortDate,
} from "@/lib/timesheets/api";
import "@/components/timesheets/timesheets.css";

const STEPS = [
  { id: 1, label: "Date" },
  { id: 2, label: "Project" },
  { id: 3, label: "Sprint & Task" },
  { id: 4, label: "Time & Details" },
  { id: 5, label: "Review & Save" },
];

function AddTimeEntryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDate = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const editTimesheetId = searchParams.get("timesheetId") || "";
  const editEntryId = searchParams.get("entryId") || "";
  const isEditMode = Boolean(editTimesheetId && editEntryId);

  const [step, setStep] = useState(isEditMode ? 4 : 1);
  const [projects, setProjects] = useState<{ _id: string; projectCode: string; projectName: string; clientName?: string }[]>([]);
  const [sprints, setSprints] = useState<{ _id: string; name: string; projectId: string }[]>([]);
  const [tasks, setTasks] = useState<{ _id: string; taskCode: string; title: string; projectId: string; sprintId?: string }[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [projectSearch, setProjectSearch] = useState("");
  const [taskSearch, setTaskSearch] = useState("");

  const [form, setForm] = useState({
    date: initialDate,
    projectId: "",
    projectName: "",
    sprintId: "",
    sprintName: "",
    taskId: "",
    taskTitle: "",
    workType: "Development" as WorkType,
    startTime: "09:00",
    endTime: "13:00",
    hours: 4,
    billable: true,
    description: "",
    attachmentName: "",
    attachmentUrl: "",
  });

  useEffect(() => {
    Promise.all([
      tsLookupApi.projects().catch(() => []),
      tsLookupApi.sprints().catch(() => []),
      tsLookupApi.tasks().catch(() => []),
      isEditMode ? timesheetApi.get(editTimesheetId).catch(() => null) : Promise.resolve(null),
    ])
      .then(([p, s, t, existingTs]) => {
        setProjects(p);
        setSprints(s);
        setTasks(t);
        if (existingTs && editEntryId) {
          const entry = (existingTs.dailyEntries || []).find((e) => String(e._id) === editEntryId);
          if (entry) {
            setForm({
              date: entry.date,
              projectId: entry.projectId ? String(entry.projectId) : "",
              projectName: entry.projectName || "",
              sprintId: entry.sprintId ? String(entry.sprintId) : "",
              sprintName: entry.sprintName || "",
              taskId: entry.taskId ? String(entry.taskId) : "",
              taskTitle: entry.taskTitle || "",
              workType: entry.workType || "Development",
              startTime: entry.startTime || "09:00",
              endTime: entry.endTime || "13:00",
              hours: Number(entry.hours || 1),
              billable: entry.billable !== false,
              description: entry.description || "",
              attachmentName: entry.attachmentName || "",
              attachmentUrl: entry.attachmentUrl || "",
            });
          }
        }
      })
      .finally(() => setLoadingLookups(false));
  }, [isEditMode, editTimesheetId, editEntryId]);

  const projectSprints = useMemo(
    () => (form.projectId ? sprints.filter((s) => s.projectId === form.projectId) : sprints),
    [sprints, form.projectId]
  );

  const projectTasks = useMemo(() => {
    const q = taskSearch.trim().toLowerCase();
    return tasks.filter((t) => {
      if (form.projectId && t.projectId !== form.projectId) return false;
      if (form.sprintId && t.sprintId && t.sprintId !== form.sprintId) return false;
      if (q && !`${t.taskCode} ${t.title}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, form.projectId, form.sprintId, taskSearch]);

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => `${p.projectName} ${p.projectCode} ${p.clientName}`.toLowerCase().includes(q));
  }, [projects, projectSearch]);

  const handleTimeChange = (field: "startTime" | "endTime", value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      const calc = computeHoursBetween(next.startTime, next.endTime);
      if (calc > 0) next.hours = calc;
      return next;
    });
  };

  const validateStep = (target: number): boolean => {
    setError(null);
    if (target === 1 && !form.date) {
      setError("Please choose a date for your time entry.");
      return false;
    }
    if (target === 2 && !form.projectName && !form.projectId) {
      setError("Please select a project (or choose General / Internal).");
      return false;
    }
    if (target === 4) {
      if (!form.hours || Number(form.hours) <= 0 || Number(form.hours) > 24) {
        setError("Hours must be between 0.25 and 24.");
        return false;
      }
      if (form.startTime && form.endTime && computeHoursBetween(form.startTime, form.endTime) <= 0) {
        setError("End Time must be later than Start Time.");
        return false;
      }
      if (form.description.trim().length < 5) {
        setError("Description / Notes is required (minimum 5 characters).");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(5, s + 1));
  };

  const handleSave = async (addAnother: boolean) => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(4)) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        date: form.date,
        projectId: form.projectId || null,
        projectName: form.projectName || "General / Internal",
        sprintId: form.sprintId || null,
        sprintName: form.sprintName,
        taskId: form.taskId || null,
        taskTitle: form.taskTitle || form.workType,
        workType: form.workType,
        startTime: form.startTime,
        endTime: form.endTime,
        hours: Number(form.hours),
        billable: form.billable,
        description: form.description.trim(),
        attachmentName: form.attachmentName.trim(),
        attachmentUrl: form.attachmentUrl.trim(),
        source: "MANUAL" as const,
      };

      if (isEditMode) {
        await timesheetApi.updateEntry(editTimesheetId, editEntryId, payload);
        router.push("/timesheets");
        return;
      }

      await timesheetApi.addEntry(payload);

      if (addAnother) {
        setSavedMsg(`Saved ${form.hours}h on ${form.projectName || "General"} (${formatShortDate(form.date)}). Ready for next entry.`);
        setForm((prev) => ({
          ...prev,
          taskId: "",
          taskTitle: "",
          description: "",
          attachmentName: "",
          attachmentUrl: "",
        }));
        setStep(3);
      } else {
        router.push("/timesheets");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to save time entry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ts-page" style={{ background: "#ffffff", padding: "10px 14px 22px", borderRadius: 6 }}>
      {/* Top Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid #eef2f8", flexWrap: "wrap", gap: 8 }}>
        <div className="ts-breadcrumb" style={{ marginBottom: 0 }}>
          <Link href="/timesheets">Timesheets</Link>
          <span>›</span>
          <Link href="/timesheets">My Timesheet</Link>
          <span>›</span>
          <strong style={{ color: "#0755e9" }}>{isEditMode ? "Edit Time Entry" : "Add Time Entry"}</strong>
        </div>
        <div className="ts-actions">
          <Link href="/timesheets" className="ts-btn"><X size={13} /> Cancel</Link>
          {step < 5 ? (
            <button type="button" className="ts-btn ts-btn-primary" onClick={handleNext}>
              Next: {STEPS[step].label} <ArrowRight size={13} />
            </button>
          ) : (
            <button type="button" className="ts-btn ts-btn-success" disabled={submitting} onClick={() => handleSave(false)}>
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {submitting ? "Saving..." : isEditMode ? "Update Entry" : "Save Entry"}
            </button>
          )}
        </div>
      </div>

      {/* Title Row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 7, background: "#eef5ff", color: "#0755e9", display: "grid", placeItems: "center" }}>
          <Clock size={17} />
        </div>
        <div>
          <h1 className="ts-title">{isEditMode ? "Edit Time Entry" : "Add Time Entry"}</h1>
          <p className="ts-subtitle">Log daily work hours against a project, sprint, and task with automatic duration calculation.</p>
        </div>
      </div>

      {/* 5-Step Horizontal Stepper matching TIME-002 */}
      <nav className="ts-stepper">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`ts-step ${step === s.id ? "active" : step > s.id ? "done" : ""}`}
            onClick={() => {
              if (s.id < step) {
                setError(null);
                setStep(s.id);
              } else if (s.id === step + 1 && validateStep(step)) {
                setStep(s.id);
              }
            }}
          >
            <span>{step > s.id ? <Check size={11} /> : s.id}</span>
            <b>{s.label}</b>
          </button>
        ))}
      </nav>

      {savedMsg && <div className="ts-alert ts-alert-healthy"><CheckCircle2 size={14} /> <span>{savedMsg}</span></div>}
      {error && <div className="ts-alert ts-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* Main 2-Column Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 270px", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="ts-card" style={{ padding: "15px 18px" }}>
            {/* STEP 1: Date */}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <h2 className="ts-card-title" style={{ color: "#0755e9" }}>Step 1: Choose Date</h2>
                <div className="ts-field" style={{ maxWidth: 280 }}>
                  <label>Work Date *</label>
                  <input
                    className="ts-input"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
                    { label: "Today", offset: 0 },
                    { label: "Yesterday", offset: -1 },
                    { label: "2 Days Ago", offset: -2 },
                  ].map((q) => {
                    const d = new Date(Date.now() + q.offset * 86400000).toISOString().slice(0, 10);
                    return (
                      <button
                        key={q.label}
                        type="button"
                        className={`ts-btn ts-btn-sm ${form.date === d ? "ts-btn-primary" : ""}`}
                        onClick={() => setForm({ ...form, date: d })}
                      >
                        {q.label} ({formatShortDate(d)})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Project */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h2 className="ts-card-title" style={{ color: "#0755e9" }}>Step 2: Select Project</h2>
                <div className="ts-search-wrap">
                  <Search size={13} className="ts-search-icon" />
                  <input
                    className="ts-input"
                    placeholder="Search project..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                  {loadingLookups ? (
                    <div className="ts-empty">Loading projects...</div>
                  ) : (
                    <>
                      {filteredProjects.map((p) => {
                        const selected = form.projectId === p._id;
                        return (
                          <button
                            key={p._id}
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                projectId: p._id,
                                projectName: p.projectName,
                                sprintId: "",
                                sprintName: "",
                                taskId: "",
                                taskTitle: "",
                              }))
                            }
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "9px 11px",
                              borderRadius: 6,
                              border: `1px solid ${selected ? "#0755e9" : "#e3eaf4"}`,
                              background: selected ? "#eef5ff" : "#ffffff",
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                              <span className="ts-avatar" style={{ borderRadius: 6 }}><Briefcase size={12} /></span>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 11.5 }}>{p.projectName}</div>
                                <div style={{ fontSize: 10, color: "#64748b" }}>{p.projectCode || "Active"} · Client: {p.clientName}</div>
                              </div>
                            </div>
                            {selected && <Check size={14} color="#0755e9" />}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            projectId: "",
                            projectName: "Training & General / Internal",
                            sprintId: "",
                            sprintName: "",
                            taskId: "",
                            taskTitle: "",
                            billable: false,
                          }))
                        }
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "9px 11px",
                          borderRadius: 6,
                          border: `1px solid ${!form.projectId && form.projectName === "Training & General / Internal" ? "#0755e9" : "#e3eaf4"}`,
                          background: !form.projectId && form.projectName === "Training & General / Internal" ? "#eef5ff" : "#ffffff",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 11.5 }}>Training &amp; General / Internal</div>
                          <div style={{ fontSize: 10, color: "#64748b" }}>Meetings, learning, admin, or non-project work</div>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Sprint & Task */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <h2 className="ts-card-title" style={{ color: "#0755e9" }}>Step 3: Select Sprint &amp; Task</h2>
                <div className="ts-grid-2">
                  <div className="ts-field">
                    <label>Sprint (Optional)</label>
                    <select
                      className="ts-select"
                      value={form.sprintId}
                      onChange={(e) => {
                        const sp = projectSprints.find((s) => s._id === e.target.value);
                        setForm({ ...form, sprintId: e.target.value, sprintName: sp?.name || "" });
                      }}
                    >
                      <option value="">No Specific Sprint</option>
                      {projectSprints.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="ts-field">
                    <label>Work Type *</label>
                    <select
                      className="ts-select"
                      value={form.workType}
                      onChange={(e) => setForm({ ...form, workType: e.target.value as WorkType })}
                    >
                      {WORK_TYPES.map((w) => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                </div>

                <div className="ts-field">
                  <label>Select Task from Project (or enter custom activity below)</label>
                  <div className="ts-search-wrap" style={{ marginBottom: 6 }}>
                    <Search size={13} className="ts-search-icon" />
                    <input className="ts-input" placeholder="Search tasks..." value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)} />
                  </div>
                  {projectTasks.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 170, overflowY: "auto", marginBottom: 8 }}>
                      {projectTasks.slice(0, 15).map((t) => {
                        const selected = form.taskId === t._id;
                        const label = t.taskCode ? `${t.taskCode} - ${t.title}` : t.title;
                        return (
                          <button
                            key={t._id}
                            type="button"
                            onClick={() => setForm({ ...form, taskId: t._id, taskTitle: label })}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "7px 10px",
                              borderRadius: 5,
                              border: `1px solid ${selected ? "#0755e9" : "#e3eaf4"}`,
                              background: selected ? "#eef5ff" : "#ffffff",
                              cursor: "pointer",
                              textAlign: "left",
                              fontSize: 11,
                            }}
                          >
                            <span><strong>{t.taskCode ? `${t.taskCode} · ` : ""}</strong>{t.title}</span>
                            {selected && <Check size={13} color="#0755e9" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <input
                    className="ts-input"
                    placeholder="Or type custom task / activity title (e.g. UI Development, Code Review)..."
                    value={form.taskTitle}
                    onChange={(e) => setForm({ ...form, taskId: "", taskTitle: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* STEP 4: Time & Details */}
            {step === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <h2 className="ts-card-title" style={{ color: "#0755e9" }}>Step 4: Enter Time &amp; Details</h2>
                <div className="ts-grid-3">
                  <div className="ts-field">
                    <label>Start Time</label>
                    <input className="ts-input" type="time" value={form.startTime} onChange={(e) => handleTimeChange("startTime", e.target.value)} />
                  </div>
                  <div className="ts-field">
                    <label>End Time</label>
                    <input className="ts-input" type="time" value={form.endTime} onChange={(e) => handleTimeChange("endTime", e.target.value)} />
                  </div>
                  <div className="ts-field">
                    <label>Hours (Auto / Editable) *</label>
                    <input
                      className="ts-input"
                      type="number"
                      step={0.25}
                      min={0.25}
                      max={24}
                      value={form.hours}
                      onChange={(e) => setForm({ ...form, hours: Number(e.target.value || 0) })}
                    />
                  </div>
                </div>

                <div className="ts-field">
                  <label>Billable *</label>
                  <div style={{ display: "flex", gap: 18, padding: "4px 0" }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 500, cursor: "pointer" }}>
                      <input type="radio" checked={form.billable} onChange={() => setForm({ ...form, billable: true })} />
                      Billable
                    </label>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 500, cursor: "pointer" }}>
                      <input type="radio" checked={!form.billable} onChange={() => setForm({ ...form, billable: false })} />
                      Non-Billable
                    </label>
                  </div>
                </div>

                <div className="ts-field">
                  <label>Description / Notes * (min 5 characters)</label>
                  <textarea
                    className="ts-textarea"
                    rows={3}
                    maxLength={500}
                    placeholder="Describe the work completed, ticket references, or blockers resolved..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                  <span style={{ fontSize: 10, color: "#64748b", textAlign: "right" }}>{form.description.length}/500</span>
                </div>

                <div className="ts-grid-2">
                  <div className="ts-field">
                    <label>Attachment Name (Optional)</label>
                    <input className="ts-input" placeholder="e.g. PR-214-Screenshot.png" value={form.attachmentName} onChange={(e) => setForm({ ...form, attachmentName: e.target.value })} />
                  </div>
                  <div className="ts-field">
                    <label>Attachment / PR URL (Optional)</label>
                    <input className="ts-input" placeholder="https://..." value={form.attachmentUrl} onChange={(e) => setForm({ ...form, attachmentUrl: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Review & Confirm */}
            {step === 5 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h2 className="ts-card-title" style={{ color: "#0755e9" }}>Step 5: Review &amp; Confirm</h2>
                <table className="ts-table" style={{ border: "1px solid #e3eaf4" }}>
                  <tbody>
                    <tr><td style={{ width: 150, color: "#64748b", background: "#f8fafd" }}>Date</td><td><strong>{formatShortDate(form.date)}</strong></td></tr>
                    <tr><td style={{ color: "#64748b", background: "#f8fafd" }}>Project</td><td><strong>{form.projectName || "General / Internal"}</strong></td></tr>
                    <tr><td style={{ color: "#64748b", background: "#f8fafd" }}>Sprint / Task</td><td><strong>{form.sprintName ? `${form.sprintName} · ` : ""}{form.taskTitle || form.workType}</strong></td></tr>
                    <tr><td style={{ color: "#64748b", background: "#f8fafd" }}>Work Type</td><td><strong>{form.workType}</strong></td></tr>
                    <tr><td style={{ color: "#64748b", background: "#f8fafd" }}>Time Range &amp; Hours</td><td><strong>{form.startTime} – {form.endTime} ({form.hours} hrs)</strong></td></tr>
                    <tr>
                      <td style={{ color: "#64748b", background: "#f8fafd" }}>Billable</td>
                      <td><span className={`ts-badge ${form.billable ? "ts-badge-green" : "ts-badge-amber"}`}>{form.billable ? "Billable" : "Non-Billable"}</span></td>
                    </tr>
                    <tr><td style={{ color: "#64748b", background: "#f8fafd" }}>Description</td><td>{form.description}</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom Bar */}
          <div className="ts-card" style={{ padding: "10px 15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              {step > 1 ? (
                <button type="button" className="ts-btn" onClick={() => { setError(null); setStep(step - 1); }}>
                  <ArrowLeft size={13} /> Back
                </button>
              ) : (
                <Link href="/timesheets" className="ts-btn"><ArrowLeft size={13} /> Back to My Timesheet</Link>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {step < 5 ? (
                <button type="button" className="ts-btn ts-btn-primary" onClick={handleNext}>
                  Next: {STEPS[step].label} <ArrowRight size={13} />
                </button>
              ) : (
                <>
                  <button type="button" className="ts-btn" disabled={submitting} onClick={() => handleSave(true)}>
                    Save &amp; Add Another
                  </button>
                  <button type="button" className="ts-btn ts-btn-success" disabled={submitting} onClick={() => handleSave(false)}>
                    {submitting ? "Saving..." : "Save Entry"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Sticky Summary Sidebar */}
        <aside className="ts-card" style={{ position: "sticky", top: 60 }}>
          <h3 className="ts-card-title" style={{ color: "#0755e9", marginBottom: 10 }}>Entry Summary</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 10.5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#64748b" }}>Date</span><strong>{formatShortDate(form.date)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#64748b" }}>Project</span><strong>{form.projectName || "Not selected"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#64748b" }}>Work Type</span><strong>{form.workType}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#64748b" }}>Duration</span><strong style={{ color: "#0755e9" }}>{form.hours} hrs</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ color: "#64748b" }}>Billing</span>
              <span className={`ts-badge ${form.billable ? "ts-badge-green" : "ts-badge-amber"}`}>
                {form.billable ? "Billable" : "Non-Billable"}
              </span>
            </div>
          </div>

          <div style={{ marginTop: 12, padding: 10, borderRadius: 6, background: "#f5f9ff", border: "1px solid #e1ecfc", fontSize: 10, color: "#475569" }}>
            <div style={{ fontWeight: 700, color: "#0755e9", marginBottom: 4 }}>Validation Rules</div>
            <div>• Start Time must be earlier than End Time.</div>
            <div>• Hours are auto-calculated and capped at 24h/entry.</div>
            <div>• Description requires at least 5 characters.</div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function AddTimeEntryPage() {
  return (
    <Suspense fallback={<div className="ts-page"><div className="ts-card ts-empty">Loading Add Time Entry...</div></div>}>
      <AddTimeEntryInner />
    </Suspense>
  );
}
