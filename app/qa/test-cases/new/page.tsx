"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardCheck,
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  testCaseApi,
  qaLookupApi,
  TEST_TYPES,
  TestStep,
} from "@/lib/qa/api";
import "@/components/qa/qa.css";

const STEPS = [
  { id: 1, label: "Basic Information" },
  { id: 2, label: "Test Steps & Expected Results" },
  { id: 3, label: "Additional Details" },
  { id: 4, label: "Review & Save" },
];

function CreateTestCaseInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id") || "";
  const isEdit = Boolean(editId);

  const [step, setStep] = useState(1);
  const [projects, setProjects] = useState<{ _id: string; projectName: string }[]>([]);
  const [requirements, setRequirements] = useState<{ _id: string; code: string; title: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    projectId: "",
    projectName: "",
    module: "",
    title: "",
    description: "",
    priority: "HIGH" as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
    testType: "Functional",
    authorName: "",
    preconditions: "",
    postconditions: "",
    requirementId: "",
    requirementTitle: "",
    tagsText: "",
  });

  const [testSteps, setTestSteps] = useState<TestStep[]>([
    { stepNumber: 1, description: "", testData: "", expectedResult: "" },
  ]);

  useEffect(() => {
    Promise.all([
      qaLookupApi.projects().catch(() => []),
      qaLookupApi.requirements().catch(() => []),
      isEdit ? testCaseApi.get(editId).catch(() => null) : Promise.resolve(null),
    ]).then(([projs, reqs, existing]) => {
      setProjects(projs);
      setRequirements(reqs);
      if (existing) {
        setForm({
          projectId: existing.projectId?._id || existing.projectId || "",
          projectName: existing.projectId?.projectName || existing.projectName || "",
          module: existing.module || "",
          title: existing.title || "",
          description: existing.description || "",
          priority: existing.priority || "MEDIUM",
          testType: existing.testType || "Functional",
          authorName: existing.authorName || "",
          preconditions: existing.preconditions || "",
          postconditions: existing.postconditions || "",
          requirementId: existing.requirementId?._id || existing.requirementId || "",
          requirementTitle: existing.requirementTitle || "",
          tagsText: (existing.tags || []).join(", "),
        });
        if (existing.steps?.length) setTestSteps(existing.steps);
      }
    });
  }, [isEdit, editId]);

  const addStepRow = () => {
    setTestSteps((prev) => [
      ...prev,
      { stepNumber: prev.length + 1, description: "", testData: "", expectedResult: "" },
    ]);
  };

  const updateStepRow = (idx: number, patch: Partial<TestStep>) => {
    setTestSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeStepRow = (idx: number) => {
    setTestSteps((prev) =>
      prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 1 }))
    );
  };

  const validate = (s: number) => {
    setError(null);
    if (s === 1) {
      if (!form.title.trim()) {
        setError("Test Case Title is required.");
        return false;
      }
      if (!form.module.trim()) {
        setError("Module name is required.");
        return false;
      }
    }
    if (s === 2) {
      const validSteps = testSteps.filter((st) => st.description.trim());
      if (validSteps.length === 0) {
        setError("Add at least one test step description.");
        return false;
      }
    }
    return true;
  };

  const handleSave = async (status: "DRAFT" | "REVIEW" | "APPROVED") => {
    if (!validate(1) || !validate(2)) return;
    setSubmitting(true);
    setError(null);
    try {
      const cleanedSteps = testSteps
        .filter((st) => st.description.trim())
        .map((st, idx) => ({ ...st, stepNumber: idx + 1 }));
      const tags = form.tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        projectId: form.projectId || null,
        projectName: form.projectName,
        module: form.module.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        testType: form.testType,
        authorName: form.authorName.trim() || undefined,
        preconditions: form.preconditions.trim(),
        postconditions: form.postconditions.trim(),
        requirementId: form.requirementId || null,
        requirementTitle: form.requirementTitle,
        steps: cleanedSteps,
        tags,
        status,
      };

      if (isEdit) {
        await testCaseApi.update(editId, payload);
      } else {
        await testCaseApi.create(payload);
      }
      router.push("/qa/test-cases");
    } catch (e: any) {
      setError(e?.message || "Failed to save test case");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="qa-page" style={{ background: "#ffffff", padding: "10px 14px 22px", borderRadius: 6 }}>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid #eef2f8", flexWrap: "wrap", gap: 8 }}>
        <div className="qa-breadcrumb" style={{ marginBottom: 0 }}>
          <Link href="/qa">QA &amp; Bug Management</Link>
          <span>›</span>
          <Link href="/qa/test-cases">Test Cases</Link>
          <span>›</span>
          <strong style={{ color: "#0755e9" }}>{isEdit ? "Edit Test Case" : "Create Test Case"}</strong>
        </div>
        <div className="qa-actions">
          <Link href="/qa/test-cases" className="qa-btn"><X size={13} /> Cancel</Link>
          {step < 4 ? (
            <button type="button" className="qa-btn qa-btn-primary" onClick={() => validate(step) && setStep(step + 1)}>
              Next: {STEPS[step].label} <ArrowRight size={13} />
            </button>
          ) : (
            <button type="button" className="qa-btn qa-btn-success" disabled={submitting} onClick={() => handleSave("APPROVED")}>
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {submitting ? "Saving..." : "Save Test Case"}
            </button>
          )}
        </div>
      </div>

      {/* Title Row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 7, background: "#eef5ff", color: "#0755e9", display: "grid", placeItems: "center" }}>
          <ClipboardCheck size={17} />
        </div>
        <div>
          <h1 className="qa-title">{isEdit ? "Edit Test Case" : "Create Test Case"}</h1>
          <p className="qa-subtitle">Define structured test steps, test data, expected results, and requirement traceability.</p>
        </div>
      </div>

      {/* 4-Step Stepper matching QA-002e */}
      <nav className="qa-stepper">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`qa-step ${step === s.id ? "active" : step > s.id ? "done" : ""}`}
            onClick={() => {
              if (s.id < step) setStep(s.id);
              else if (s.id === step + 1 && validate(step)) setStep(s.id);
            }}
          >
            <span>{step > s.id ? <Check size={11} /> : s.id}</span>
            <b>{s.label}</b>
          </button>
        ))}
      </nav>

      {error && <div className="qa-alert qa-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 265px", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="qa-card" style={{ padding: "15px 18px" }}>
            {step === 1 && (
              <div className="qa-grid-2">
                <div className="qa-field">
                  <label>Project</label>
                  <select
                    className="qa-select"
                    value={form.projectId}
                    onChange={(e) => {
                      const p = projects.find((x) => x._id === e.target.value);
                      setForm({ ...form, projectId: e.target.value, projectName: p?.projectName || "" });
                    }}
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
                  </select>
                </div>
                <div className="qa-field">
                  <label>Module *</label>
                  <input className="qa-input" placeholder="e.g. Authentication, Billing, Timesheets" value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })} />
                </div>
                <div className="qa-field" style={{ gridColumn: "1 / -1" }}>
                  <label>Test Case Title *</label>
                  <input className="qa-input" placeholder="e.g. Verify login with valid credentials" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="qa-field" style={{ gridColumn: "1 / -1" }}>
                  <label>Description</label>
                  <textarea className="qa-textarea" rows={3} placeholder="Objective and scope of this test case..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="qa-field">
                  <label>Priority *</label>
                  <select className="qa-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as any })}>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div className="qa-field">
                  <label>Test Type *</label>
                  <select className="qa-select" value={form.testType} onChange={(e) => setForm({ ...form, testType: e.target.value })}>
                    {TEST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 className="qa-card-title" style={{ color: "#0755e9" }}>Test Steps &amp; Expected Results</h3>
                  <button type="button" className="qa-btn qa-btn-primary qa-btn-sm" onClick={addStepRow}><Plus size={12} /> Add Step</button>
                </div>
                <div className="qa-table-wrap">
                  <table className="qa-table" style={{ border: "1px solid #e3eaf4" }}>
                    <thead>
                      <tr>
                        <th style={{ width: 32 }}>#</th>
                        <th>Step Description *</th>
                        <th>Test Data</th>
                        <th>Expected Result *</th>
                        <th style={{ width: 38 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {testSteps.map((st, idx) => (
                        <tr key={idx}>
                          <td><strong>{idx + 1}</strong></td>
                          <td><input className="qa-input" style={{ width: "100%" }} placeholder="Action to perform" value={st.description} onChange={(e) => updateStepRow(idx, { description: e.target.value })} /></td>
                          <td><input className="qa-input" style={{ width: "100%" }} placeholder="Inputs / credentials" value={st.testData} onChange={(e) => updateStepRow(idx, { testData: e.target.value })} /></td>
                          <td><input className="qa-input" style={{ width: "100%" }} placeholder="Expected system outcome" value={st.expectedResult} onChange={(e) => updateStepRow(idx, { expectedResult: e.target.value })} /></td>
                          <td>
                            {testSteps.length > 1 && (
                              <button type="button" className="qa-btn qa-btn-danger qa-btn-sm" onClick={() => removeStepRow(idx)}><Trash2 size={11} /></button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="qa-grid-2">
                <div className="qa-field">
                  <label>Pre-conditions</label>
                  <textarea className="qa-textarea" rows={3} placeholder="User registered, valid test data seeded..." value={form.preconditions} onChange={(e) => setForm({ ...form, preconditions: e.target.value })} />
                </div>
                <div className="qa-field">
                  <label>Post-conditions</label>
                  <textarea className="qa-textarea" rows={3} placeholder="Session created, audit log recorded..." value={form.postconditions} onChange={(e) => setForm({ ...form, postconditions: e.target.value })} />
                </div>
                <div className="qa-field">
                  <label>Related Requirement</label>
                  <select
                    className="qa-select"
                    value={form.requirementId}
                    onChange={(e) => {
                      const req = requirements.find((r) => r._id === e.target.value);
                      setForm({ ...form, requirementId: e.target.value, requirementTitle: req ? `${req.code} - ${req.title}` : "" });
                    }}
                  >
                    <option value="">None</option>
                    {requirements.map((r) => <option key={r._id} value={r._id}>{r.code ? `${r.code} - ` : ""}{r.title}</option>)}
                  </select>
                </div>
                <div className="qa-field">
                  <label>Tags (comma-separated)</label>
                  <input className="qa-input" placeholder="smoke, regression, auth" value={form.tagsText} onChange={(e) => setForm({ ...form, tagsText: e.target.value })} />
                </div>
              </div>
            )}

            {step === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h3 className="qa-card-title" style={{ color: "#0755e9" }}>Review Test Case</h3>
                <table className="qa-table" style={{ border: "1px solid #e3eaf4" }}>
                  <tbody>
                    <tr><td style={{ width: 150, color: "#64748b", background: "#f8fafd" }}>Project &amp; Module</td><td><strong>{form.projectName || "—"} · {form.module}</strong></td></tr>
                    <tr><td style={{ color: "#64748b", background: "#f8fafd" }}>Title</td><td><strong>{form.title}</strong></td></tr>
                    <tr><td style={{ color: "#64748b", background: "#f8fafd" }}>Priority / Type</td><td><strong>{form.priority} · {form.testType}</strong></td></tr>
                    <tr><td style={{ color: "#64748b", background: "#f8fafd" }}>Steps Defined</td><td><strong>{testSteps.filter((s) => s.description.trim()).length} step(s)</strong></td></tr>
                    <tr><td style={{ color: "#64748b", background: "#f8fafd" }}>Pre-conditions</td><td>{form.preconditions || "—"}</td></tr>
                    <tr><td style={{ color: "#64748b", background: "#f8fafd" }}>Requirement</td><td>{form.requirementTitle || "—"}</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom Bar */}
          <div className="qa-card" style={{ padding: "10px 15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {step > 1 ? (
              <button type="button" className="qa-btn" onClick={() => setStep(step - 1)}><ArrowLeft size={13} /> Back</button>
            ) : (
              <Link href="/qa/test-cases" className="qa-btn"><ArrowLeft size={13} /> Back to Registry</Link>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              {step < 4 ? (
                <button type="button" className="qa-btn qa-btn-primary" onClick={() => validate(step) && setStep(step + 1)}>
                  Next: {STEPS[step].label} <ArrowRight size={13} />
                </button>
              ) : (
                <>
                  <button type="button" className="qa-btn" disabled={submitting} onClick={() => handleSave("DRAFT")}>Save as Draft</button>
                  <button type="button" className="qa-btn qa-btn-primary" disabled={submitting} onClick={() => handleSave("REVIEW")}>Submit for Review</button>
                  <button type="button" className="qa-btn qa-btn-success" disabled={submitting} onClick={() => handleSave("APPROVED")}>Save &amp; Approve</button>
                </>
              )}
            </div>
          </div>
        </div>

        <aside className="qa-card" style={{ position: "sticky", top: 60 }}>
          <h3 className="qa-card-title" style={{ color: "#0755e9", marginBottom: 10 }}>Test Case Summary</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 10.5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}><span style={{ color: "#64748b" }}>Project</span><strong>{form.projectName || "—"}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}><span style={{ color: "#64748b" }}>Module</span><strong>{form.module || "—"}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}><span style={{ color: "#64748b" }}>Priority</span><strong>{form.priority}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}><span style={{ color: "#64748b" }}>Type</span><strong>{form.testType}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span style={{ color: "#64748b" }}>Steps</span><strong>{testSteps.filter((s) => s.description.trim()).length}</strong></div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function CreateTestCasePage() {
  return (
    <Suspense fallback={<div className="qa-page"><div className="qa-card qa-empty">Loading Test Case Wizard...</div></div>}>
      <CreateTestCaseInner />
    </Suspense>
  );
}
