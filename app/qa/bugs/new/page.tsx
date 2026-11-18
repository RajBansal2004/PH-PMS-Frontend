"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  AlertTriangle,
  Bug,
  Paperclip,
} from "lucide-react";
import {
  bugApi,
  testCaseApi,
  qaLookupApi,
  BUG_TYPES,
  TestCaseItem,
  severityBadgeClass,
} from "@/lib/qa/api";
import "@/components/qa/qa.css";

const WIZARD_STEPS = [
  { num: 1, label: "Basic Info" },
  { num: 2, label: "Traceability & Owner" },
  { num: 3, label: "Environment" },
  { num: 4, label: "Reproduction & Evidence" },
  { num: 5, label: "Review & Submit" },
];

const ENVIRONMENTS = ["QA", "STAGING", "UAT", "DEV", "PROD"] as const;

function ReportBugWizardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [step, setStep] = useState(1);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lookups
  const [projects, setProjects] = useState<{ _id: string; projectName: string }[]>([]);
  const [requirements, setRequirements] = useState<{ _id: string; code: string; title: string }[]>([]);
  const [sprints, setSprints] = useState<{ _id: string; name: string }[]>([]);
  const [tasks, setTasks] = useState<{ _id: string; code: string; title: string }[]>([]);
  const [testCases, setTestCases] = useState<TestCaseItem[]>([]);
  const [employees, setEmployees] = useState<{ _id: string; name: string }[]>([]);

  // Step 1: Basic Info
  const [projectId, setProjectId] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [subModule, setSubModule] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bugType, setBugType] = useState<string>("Functional");
  const [severity, setSeverity] = useState<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW">("HIGH");
  const [priority, setPriority] = useState<"URGENT" | "HIGH" | "MEDIUM" | "LOW">("HIGH");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // Step 2: Traceability & Ownership
  const [requirementId, setRequirementId] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [testCaseId, setTestCaseId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [qaOwnerName, setQaOwnerName] = useState("");
  const [targetFixDate, setTargetFixDate] = useState("");

  // Step 3: Environment
  const [environment, setEnvironment] = useState<string>("QA");
  const [foundInVersion, setFoundInVersion] = useState("v1.0.0");
  const [buildVersion, setBuildVersion] = useState("");
  const [browser, setBrowser] = useState("Chrome (Latest)");
  const [os, setOs] = useState("Windows 11");
  const [device, setDevice] = useState("Desktop");
  const [apiService, setApiService] = useState("");

  // Step 4: Reproduction & Evidence
  const [preconditions, setPreconditions] = useState("");
  const [testData, setTestData] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [actualResult, setActualResult] = useState("");
  const [attachments, setAttachments] = useState<{ name: string; type: string; url: string }[]>([]);
  const [attName, setAttName] = useState("");
  const [attUrl, setAttUrl] = useState("");

  useEffect(() => {
    (async () => {
      setLoadingLookups(true);
      try {
        const [projList, empList] = await Promise.all([
          qaLookupApi.projects().catch(() => []),
          qaLookupApi.employees().catch(() => []),
        ]);
        setProjects(projList);
        setEmployees(empList);

        if (editId) {
          const existing = await bugApi.get(editId);
          const pid = typeof existing.projectId === "object" ? existing.projectId?._id : existing.projectId;
          setProjectId(pid || "");
          setModuleName(existing.module || "");
          setSubModule(existing.subModule || "");
          setTitle(existing.title || "");
          setDescription(existing.description || "");
          setBugType(existing.bugType || "Functional");
          setSeverity(existing.severity || "HIGH");
          setPriority(existing.priority || "HIGH");
          setTags(existing.tags || []);
          setRequirementId(typeof existing.requirementId === "object" ? existing.requirementId?._id || "" : existing.requirementId || "");
          setSprintId(typeof existing.sprintId === "object" ? existing.sprintId?._id || "" : existing.sprintId || "");
          setTaskId(typeof existing.taskId === "object" ? existing.taskId?._id || "" : existing.taskId || "");
          setTestCaseId(typeof existing.testCaseId === "object" ? existing.testCaseId?._id || "" : existing.testCaseId || "");
          setAssigneeId(typeof existing.assigneeId === "object" ? existing.assigneeId?._id || "" : existing.assigneeId || "");
          setQaOwnerName(existing.qaOwnerName || "");
          setTargetFixDate(existing.targetFixDate ? String(existing.targetFixDate).slice(0, 10) : "");
          setEnvironment(existing.environment || "QA");
          setFoundInVersion(existing.foundInVersion || "v1.0.0");
          setBuildVersion(existing.buildVersion || "");
          setBrowser(existing.browser || "");
          setOs(existing.os || "");
          setDevice(existing.device || "");
          setApiService(existing.apiService || "");
          setPreconditions(existing.preconditions || "");
          setTestData(existing.testData || "");
          setStepsToReproduce(existing.stepsToReproduce || "");
          setExpectedResult(existing.expectedResult || "");
          setActualResult(existing.actualResult || "");
          setAttachments(existing.attachments || []);
        } else if (projList.length > 0) {
          setProjectId(projList[0]._id);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to initialize bug form");
      } finally {
        setLoadingLookups(false);
      }
    })();
  }, [editId]);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      qaLookupApi.requirements(projectId).catch(() => []),
      qaLookupApi.sprints(projectId).catch(() => []),
      qaLookupApi.tasks(projectId).catch(() => []),
      testCaseApi.list({ projectId, limit: 100 }).catch(() => []),
    ]).then(([reqs, sps, tks, tcs]) => {
      setRequirements(reqs);
      setSprints(sps);
      setTasks(tks);
      setTestCases(tcs);
    });
  }, [projectId]);

  const addTag = () => {
    const clean = tagInput.trim();
    if (clean && !tags.includes(clean)) {
      setTags((prev) => [...prev, clean]);
    }
    setTagInput("");
  };

  const addAttachment = () => {
    if (!attUrl.trim()) return;
    setAttachments((prev) => [
      ...prev,
      { name: attName.trim() || "Evidence Link", type: "URL", url: attUrl.trim() },
    ]);
    setAttName("");
    setAttUrl("");
  };

  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (!projectId) return "Please select a Project.";
      if (!moduleName.trim()) return "Module name is required.";
      if (!title.trim()) return "Bug Title is required.";
      if (!description.trim()) return "Bug Description is required.";
    }
    if (s === 3) {
      if (!environment) return "Environment is required.";
      if (!foundInVersion.trim()) return "Found In Version is required.";
    }
    if (s === 4) {
      if (!stepsToReproduce.trim()) return "Steps to Reproduce are required.";
      if (!expectedResult.trim()) return "Expected Result is required.";
      if (!actualResult.trim()) return "Actual Result is required.";
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(5, s + 1));
  };

  const handleSubmit = async () => {
    for (const s of [1, 3, 4]) {
      const err = validateStep(s);
      if (err) {
        setStep(s);
        setError(err);
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      const selectedProj = projects.find((p) => p._id === projectId);
      const selectedAssignee = employees.find((e) => e._id === assigneeId);
      const payload = {
        projectId,
        projectName: selectedProj?.projectName || "",
        module: moduleName.trim(),
        subModule: subModule.trim(),
        title: title.trim(),
        description: description.trim(),
        bugType,
        severity,
        priority,
        tags,
        requirementId: requirementId || undefined,
        sprintId: sprintId || undefined,
        taskId: taskId || undefined,
        testCaseId: testCaseId || undefined,
        assigneeId: assigneeId || undefined,
        assigneeName: selectedAssignee?.name || "",
        qaOwnerName: qaOwnerName.trim(),
        targetFixDate: targetFixDate || undefined,
        environment,
        foundInVersion: foundInVersion.trim(),
        buildVersion: buildVersion.trim(),
        browser: browser.trim(),
        os: os.trim(),
        device: device.trim(),
        apiService: apiService.trim(),
        preconditions: preconditions.trim(),
        testData: testData.trim(),
        stepsToReproduce: stepsToReproduce.trim(),
        expectedResult: expectedResult.trim(),
        actualResult: actualResult.trim(),
        attachments,
      };

      const saved = editId
        ? await bugApi.update(editId, payload)
        : await bugApi.create(payload);

      router.push(`/qa/bugs/${saved._id}`);
    } catch (e: any) {
      setError(e?.message || "Failed to save bug");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProjectName = projects.find((p) => p._id === projectId)?.projectName || "—";
  const selectedAssigneeName = employees.find((e) => e._id === assigneeId)?.name || "Unassigned";

  return (
    <div className="qa-page">
      <div>
        <div className="qa-breadcrumb">
          <Link href="/qa">QA &amp; Bug Management</Link>
          <ChevronRight size={12} />
          <Link href="/qa/bugs">Bug Registry</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>{editId ? "Edit Bug" : "Report New Bug"}</span>
        </div>
        <div className="qa-header">
          <div>
            <h1 className="qa-title">{editId ? "Edit Bug Report" : "Report New Bug"}</h1>
            <p className="qa-subtitle">
              Capture defect classification, traceability links, environment matrix, and reproducible evidence.
            </p>
          </div>
          <div className="qa-actions">
            <Link href="/qa/bugs" className="qa-btn">
              <ArrowLeft size={12} /> Back to Bug Registry
            </Link>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="qa-subnav">
        <Link href="/qa" className="qa-subnav-link">QA Dashboard</Link>
        <Link href="/qa/test-cases" className="qa-subnav-link">Test Cases</Link>
        <Link href="/qa/test-cases/new" className="qa-subnav-link">Create Test Case</Link>
        <Link href="/qa/test-runs" className="qa-subnav-link">Test Runs</Link>
        <Link href="/qa/bugs" className="qa-subnav-link">Bug Registry</Link>
        <Link href="/qa/bugs/new" className="qa-subnav-link active">Report Bug</Link>
      </div>

      {/* 5-Step Progress Stepper */}
      <div className="qa-card" style={{ padding: "10px 14px" }}>
        <div className="qa-stepper" style={{ margin: 0 }}>
          {WIZARD_STEPS.map((st) => {
            const isDone = step > st.num;
            const isActive = step === st.num;
            return (
              <button
                key={st.num}
                type="button"
                className={`qa-step ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
                onClick={() => {
                  if (st.num < step) {
                    setError(null);
                    setStep(st.num);
                  }
                }}
              >
                <span>{isDone ? <Check size={11} /> : st.num}</span>
                <b>{st.label}</b>
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className="qa-alert qa-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* Main Split: Form + Sticky Right Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 280px", gap: 14, alignItems: "start" }}>
        <div className="qa-card">
          {loadingLookups ? (
            <div className="qa-empty">Loading project &amp; team metadata...</div>
          ) : (
            <>
              {/* STEP 1: BASIC INFO */}
              {step === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  <h2 className="qa-card-title">Step 1: Defect Identity &amp; Classification</h2>
                  <div className="qa-grid-3">
                    <div className="qa-field">
                      <label>Project *</label>
                      <select className="qa-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                        <option value="">Select Project</option>
                        {projects.map((p) => (
                          <option key={p._id} value={p._id}>{p.projectName}</option>
                        ))}
                      </select>
                    </div>
                    <div className="qa-field">
                      <label>Module *</label>
                      <input
                        className="qa-input"
                        placeholder="e.g. Authentication, Billing, Timesheets"
                        value={moduleName}
                        onChange={(e) => setModuleName(e.target.value)}
                      />
                    </div>
                    <div className="qa-field">
                      <label>Sub-Module</label>
                      <input
                        className="qa-input"
                        placeholder="e.g. OAuth Callback, PDF Export"
                        value={subModule}
                        onChange={(e) => setSubModule(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="qa-field">
                    <label>Bug Title *</label>
                    <input
                      className="qa-input"
                      placeholder="Clear, concise summary of the defect..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="qa-field">
                    <label>Detailed Description *</label>
                    <textarea
                      className="qa-textarea"
                      rows={4}
                      placeholder="Explain the issue context, user impact, and frequency..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="qa-grid-3">
                    <div className="qa-field">
                      <label>Bug Type *</label>
                      <select className="qa-select" value={bugType} onChange={(e) => setBugType(e.target.value)}>
                        {BUG_TYPES.map((bt) => (
                          <option key={bt} value={bt}>{bt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="qa-field">
                      <label>Severity *</label>
                      <select className="qa-select" value={severity} onChange={(e) => setSeverity(e.target.value as any)}>
                        <option value="CRITICAL">Critical (Blocker / Crash)</option>
                        <option value="HIGH">High (Major Feature Broken)</option>
                        <option value="MEDIUM">Medium (Workaround Exists)</option>
                        <option value="LOW">Low (Minor / Cosmetic)</option>
                      </select>
                    </div>
                    <div className="qa-field">
                      <label>Priority *</label>
                      <select className="qa-select" value={priority} onChange={(e) => setPriority(e.target.value as any)}>
                        <option value="URGENT">Urgent (Immediate Fix)</option>
                        <option value="HIGH">High (Current Sprint)</option>
                        <option value="MEDIUM">Medium (Next Sprint)</option>
                        <option value="LOW">Low (Backlog)</option>
                      </select>
                    </div>
                  </div>

                  <div className="qa-field">
                    <label>Tags / Labels</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        className="qa-input"
                        style={{ flex: 1 }}
                        placeholder="Add tag (e.g. regression, api, mobile) and press Enter"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                      />
                      <button type="button" className="qa-btn" onClick={addTag}>
                        <Plus size={12} /> Add
                      </button>
                    </div>
                    {tags.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
                        {tags.map((t) => (
                          <span key={t} className="qa-tag-chip">
                            {t}
                            <button
                              type="button"
                              onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                              style={{ border: 0, background: "transparent", cursor: "pointer", color: "#0755e9", padding: 0, fontWeight: 700 }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: TRACEABILITY & OWNERSHIP */}
              {step === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  <h2 className="qa-card-title">Step 2: Traceability Links &amp; Ownership</h2>
                  <div className="qa-grid-2">
                    <div className="qa-field">
                      <label>Linked BRD Requirement</label>
                      <select className="qa-select" value={requirementId} onChange={(e) => setRequirementId(e.target.value)}>
                        <option value="">None</option>
                        {requirements.map((r) => (
                          <option key={r._id} value={r._id}>{r.code ? `${r.code} — ` : ""}{r.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="qa-field">
                      <label>Linked Sprint</label>
                      <select className="qa-select" value={sprintId} onChange={(e) => setSprintId(e.target.value)}>
                        <option value="">None</option>
                        {sprints.map((s) => (
                          <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="qa-field">
                      <label>Linked Task</label>
                      <select className="qa-select" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                        <option value="">None</option>
                        {tasks.map((t) => (
                          <option key={t._id} value={t._id}>{t.code ? `${t.code} — ` : ""}{t.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="qa-field">
                      <label>Linked Test Case</label>
                      <select className="qa-select" value={testCaseId} onChange={(e) => setTestCaseId(e.target.value)}>
                        <option value="">None</option>
                        {testCases.map((tc) => (
                          <option key={tc._id} value={tc._id}>{tc.testCaseCode} — {tc.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="qa-grid-3" style={{ marginTop: 4 }}>
                    <div className="qa-field">
                      <label>Assign To Developer</label>
                      <select className="qa-select" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                        <option value="">Unassigned (Triage Queue)</option>
                        {employees.map((emp) => (
                          <option key={emp._id} value={emp._id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="qa-field">
                      <label>QA Owner / Verifier</label>
                      <select className="qa-select" value={qaOwnerName} onChange={(e) => setQaOwnerName(e.target.value)}>
                        <option value="">Select QA Owner</option>
                        {employees.map((emp) => (
                          <option key={emp._id} value={emp.name}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="qa-field">
                      <label>Target Fix Date</label>
                      <input
                        type="date"
                        className="qa-input"
                        value={targetFixDate}
                        onChange={(e) => setTargetFixDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: ENVIRONMENT */}
              {step === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  <h2 className="qa-card-title">Step 3: Environment &amp; Build Context</h2>
                  <div className="qa-grid-3">
                    <div className="qa-field">
                      <label>Environment *</label>
                      <select className="qa-select" value={environment} onChange={(e) => setEnvironment(e.target.value)}>
                        {ENVIRONMENTS.map((env) => (
                          <option key={env} value={env}>{env}</option>
                        ))}
                      </select>
                    </div>
                    <div className="qa-field">
                      <label>Found In Version *</label>
                      <input
                        className="qa-input"
                        placeholder="e.g. v2.3.1"
                        value={foundInVersion}
                        onChange={(e) => setFoundInVersion(e.target.value)}
                      />
                    </div>
                    <div className="qa-field">
                      <label>Build Number</label>
                      <input
                        className="qa-input"
                        placeholder="e.g. build-4821"
                        value={buildVersion}
                        onChange={(e) => setBuildVersion(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="qa-grid-3">
                    <div className="qa-field">
                      <label>Browser / Client</label>
                      <input
                        className="qa-input"
                        placeholder="e.g. Chrome 124, Safari 17"
                        value={browser}
                        onChange={(e) => setBrowser(e.target.value)}
                      />
                    </div>
                    <div className="qa-field">
                      <label>Operating System</label>
                      <input
                        className="qa-input"
                        placeholder="e.g. Windows 11, macOS 14, iOS 17"
                        value={os}
                        onChange={(e) => setOs(e.target.value)}
                      />
                    </div>
                    <div className="qa-field">
                      <label>Device</label>
                      <input
                        className="qa-input"
                        placeholder="e.g. Desktop 1920x1080, iPhone 15"
                        value={device}
                        onChange={(e) => setDevice(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="qa-field">
                    <label>Affected API / Microservice / Endpoint</label>
                    <input
                      className="qa-input"
                      placeholder="e.g. POST /api/v1/timesheets/submit"
                      value={apiService}
                      onChange={(e) => setApiService(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: REPRODUCTION & EVIDENCE */}
              {step === 4 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  <h2 className="qa-card-title">Step 4: Reproduction Steps &amp; Attachments</h2>
                  <div className="qa-grid-2">
                    <div className="qa-field">
                      <label>Preconditions</label>
                      <textarea
                        className="qa-textarea"
                        rows={2}
                        placeholder="Required user role, feature flag, or setup state..."
                        value={preconditions}
                        onChange={(e) => setPreconditions(e.target.value)}
                      />
                    </div>
                    <div className="qa-field">
                      <label>Test Data Used</label>
                      <textarea
                        className="qa-textarea"
                        rows={2}
                        placeholder="Sample payloads, IDs, or credentials used..."
                        value={testData}
                        onChange={(e) => setTestData(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="qa-field">
                    <label>Steps to Reproduce *</label>
                    <textarea
                      className="qa-textarea"
                      rows={4}
                      placeholder={"1. Navigate to ...\n2. Enter ...\n3. Click Save ..."}
                      value={stepsToReproduce}
                      onChange={(e) => setStepsToReproduce(e.target.value)}
                    />
                  </div>

                  <div className="qa-grid-2">
                    <div className="qa-field">
                      <label>Expected Result *</label>
                      <textarea
                        className="qa-textarea"
                        rows={3}
                        placeholder="What should happen according to requirements..."
                        value={expectedResult}
                        onChange={(e) => setExpectedResult(e.target.value)}
                      />
                    </div>
                    <div className="qa-field">
                      <label>Actual Result *</label>
                      <textarea
                        className="qa-textarea"
                        rows={3}
                        placeholder="What actually happened (error message, UI glitch, HTTP 500)..."
                        value={actualResult}
                        onChange={(e) => setActualResult(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Attachments */}
                  <div style={{ borderTop: "1px solid #e3eaf4", paddingTop: 10 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                      <Paperclip size={12} /> Evidence Attachments (Screenshots / Logs / HAR / Video URLs)
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr auto", gap: 6 }}>
                      <input
                        className="qa-input"
                        placeholder="Attachment label (e.g. Console Error Screenshot)"
                        value={attName}
                        onChange={(e) => setAttName(e.target.value)}
                      />
                      <input
                        className="qa-input"
                        placeholder="https://..."
                        value={attUrl}
                        onChange={(e) => setAttUrl(e.target.value)}
                      />
                      <button type="button" className="qa-btn" onClick={addAttachment}>
                        <Plus size={12} /> Attach
                      </button>
                    </div>
                    {attachments.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
                        {attachments.map((att, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "5px 9px",
                              background: "#f8fafd",
                              border: "1px solid #e3eaf4",
                              borderRadius: 5,
                            }}
                          >
                            <span style={{ fontSize: 11 }}>
                              <strong>{att.name}</strong> — <span style={{ color: "#0755e9" }}>{att.url}</span>
                            </span>
                            <button
                              type="button"
                              className="qa-btn qa-btn-danger qa-btn-sm"
                              onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 5: REVIEW & SUBMIT */}
              {step === 5 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <h2 className="qa-card-title">Step 5: Review &amp; Submit Bug Report</h2>
                  <div className="qa-grid-2">
                    <div style={{ background: "#f8fafd", border: "1px solid #e3eaf4", borderRadius: 7, padding: 11 }}>
                      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
                        Identity &amp; Classification
                      </div>
                      <p style={{ margin: "2px 0" }}><strong>Project:</strong> {selectedProjectName}</p>
                      <p style={{ margin: "2px 0" }}><strong>Module:</strong> {moduleName}{subModule ? ` / ${subModule}` : ""}</p>
                      <p style={{ margin: "2px 0" }}><strong>Title:</strong> {title}</p>
                      <p style={{ margin: "4px 0" }}>
                        <strong>Severity:</strong> <span className={severityBadgeClass(severity)}>{severity}</span>{" "}
                        <strong>Priority:</strong> <span className={severityBadgeClass(priority)}>{priority}</span>
                      </p>
                      <p style={{ margin: "2px 0" }}><strong>Type:</strong> {bugType}</p>
                    </div>
                    <div style={{ background: "#f8fafd", border: "1px solid #e3eaf4", borderRadius: 7, padding: 11 }}>
                      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
                        Environment &amp; Ownership
                      </div>
                      <p style={{ margin: "2px 0" }}><strong>Environment:</strong> {environment} ({foundInVersion})</p>
                      <p style={{ margin: "2px 0" }}><strong>Browser / OS:</strong> {browser || "—"} · {os || "—"}</p>
                      <p style={{ margin: "2px 0" }}><strong>Assignee:</strong> {selectedAssigneeName}</p>
                      <p style={{ margin: "2px 0" }}><strong>QA Owner:</strong> {qaOwnerName || "—"}</p>
                      <p style={{ margin: "2px 0" }}><strong>Target Fix Date:</strong> {targetFixDate || "—"}</p>
                    </div>
                  </div>
                  <div style={{ background: "#f8fafd", border: "1px solid #e3eaf4", borderRadius: 7, padding: 11 }}>
                    <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
                      Reproduction Summary
                    </div>
                    <p style={{ margin: "4px 0", whiteSpace: "pre-wrap" }}><strong>Steps:</strong>{"\n"}{stepsToReproduce}</p>
                    <p style={{ margin: "4px 0" }}><strong>Expected:</strong> {expectedResult}</p>
                    <p style={{ margin: "4px 0" }}><strong>Actual:</strong> {actualResult}</p>
                    <p style={{ margin: "4px 0" }}><strong>Attachments:</strong> {attachments.length}</p>
                  </div>
                </div>
              )}

              {/* Footer Navigation */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid #e3eaf4" }}>
                <button
                  type="button"
                  className="qa-btn"
                  onClick={() => {
                    setError(null);
                    setStep((s) => Math.max(1, s - 1));
                  }}
                  disabled={step === 1}
                >
                  <ArrowLeft size={12} /> Previous
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link href="/qa/bugs" className="qa-btn qa-btn-ghost">Cancel</Link>
                  {step < 5 ? (
                    <button type="button" className="qa-btn qa-btn-primary" onClick={goNext}>
                      Next Step <ArrowRight size={12} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="qa-btn qa-btn-success"
                      onClick={handleSubmit}
                      disabled={submitting}
                    >
                      <Bug size={12} /> {submitting ? "Submitting..." : editId ? "Save Changes" : "Submit Bug Report"}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sticky Live Summary Sidebar */}
        <div className="qa-card" style={{ position: "sticky", top: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Bug size={14} color="#0755e9" />
            <h3 className="qa-card-title">Live Bug Summary</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 11 }}>
            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: 10 }}>Project</span>
              <strong>{selectedProjectName}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: 10 }}>Module</span>
              <strong>{moduleName || "—"}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: 10 }}>Classification</span>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3 }}>
                <span className={severityBadgeClass(severity)}>{severity}</span>
                <span className={severityBadgeClass(priority)}>{priority}</span>
                <span className="qa-badge qa-badge-slate">{bugType}</span>
              </div>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: 10 }}>Environment</span>
              <strong>{environment} · {foundInVersion || "—"}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: 10 }}>Assigned Developer</span>
              <strong>{selectedAssigneeName}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: 10 }}>Attachments</span>
              <strong>{attachments.length} item(s)</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportBugWizardPage() {
  return (
    <Suspense fallback={<div className="qa-page"><div className="qa-card qa-empty">Loading Report Bug wizard...</div></div>}>
      <ReportBugWizardInner />
    </Suspense>
  );
}
