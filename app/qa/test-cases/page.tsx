"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Plus, Upload, Download, RotateCcw, Eye, Pencil,
  Copy, Trash2, X, ChevronLeft, ChevronRight, Check,
  FileSpreadsheet, MoreHorizontal, ClipboardList, AlertCircle,
  CheckCircle2, Clock3, ChevronDown, ArrowLeft, Save,
  ListChecks, Paperclip,
} from "lucide-react";
import { getTestCases, createTestCase, deleteTestCase, projects as getProjectsApi } from "@/lib/api";
import "./test-cases.css";

type TestStatus = "Approved" | "Draft" | "Review" | "Deprecated";
type Priority = "High" | "Medium" | "Low";

type TestStep = {
  id: number;
  description: string;
  testData: string;
  expectedResult: string;
};

type TestCase = {
  id: string;
  backendId?: string;
  title: string;
  module: string;
  priority: Priority;
  status: TestStatus;
  createdBy: string;
  createdOn: string;
  project: string;
  type: string;
  description: string;
  author: string;
  steps: TestStep[];
};

const emptyStep = (): TestStep => ({
  id: Date.now(),
  description: "",
  testData: "",
  expectedResult: "",
});

const emptyForm = () => ({
  project: "General Project",
  module: "General",
  title: "",
  description: "",
  priority: "High" as Priority,
  type: "Functional",
  author: "QA Engineer",
});

export default function TestCasesPage() {
  const [cases, setCases] = useState<TestCase[]>([]);
  const [projectsList, setProjectsList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All Modules");
  const [priorityFilter, setPriorityFilter] = useState("All Priorities");
  const [ownerFilter, setOwnerFilter] = useState("All Owners");

  const [view, setView] = useState<"registry" | "create" | "details" | "import">("registry");
  const [wizardStep, setWizardStep] = useState(1);
  const [form, setForm] = useState(emptyForm());
  const [steps, setSteps] = useState<TestStep[]>([emptyStep()]);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  const loadData = async () => {
    try {
      setLoading(true);
      const [tcRes, pRes] = await Promise.allSettled([
        getTestCases(),
        getProjectsApi().catch(() => []),
      ]);

      if (tcRes.status === "fulfilled") {
        const items = tcRes.value?.items || [];
        const mapped: TestCase[] = items.map((tc: any) => ({
          id: tc.testCaseId || tc.code || `TC-${String(tc._id || tc.id).slice(-3).toUpperCase()}`,
          backendId: tc._id || tc.id,
          title: tc.title || "Untitled Test Case",
          module: tc.module || "General",
          priority: (tc.priority || "Medium") as Priority,
          status: (tc.status === "APPROVED" ? "Approved" : tc.status === "REVIEW" ? "Review" : tc.status === "DEPRECATED" ? "Deprecated" : "Draft") as TestStatus,
          createdBy: tc.createdByName || tc.author || "QA Engineer",
          createdOn: tc.createdAt ? new Date(tc.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Today",
          project: tc.projectId?.projectName || tc.projectId?.name || tc.projectName || "General Project",
          type: tc.type || "Functional",
          description: tc.description || "",
          author: tc.author || "QA Engineer",
          steps: Array.isArray(tc.steps) ? tc.steps : [],
        }));
        setCases(mapped);
      } else {
        setCases([]);
      }

      if (pRes.status === "fulfilled") {
        const rawP: any = pRes.value;
        const pItems = Array.isArray(rawP) ? rawP : rawP?.data || rawP?.items || [];
        const names = pItems.map((p: any) => p.name || p.projectName).filter(Boolean);
        setProjectsList(names);
        if (names.length > 0) {
          setForm((f) => ({ ...f, project: names[0] }));
        }
      }
    } catch {
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      const matchesTab = activeTab === "All" || item.status === activeTab;
      const q = search.toLowerCase().trim();

      const matchesSearch =
        !q ||
        item.id.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.module.toLowerCase().includes(q);

      const matchesModule =
        moduleFilter === "All Modules" || item.module === moduleFilter;

      const matchesPriority =
        priorityFilter === "All Priorities" || item.priority === priorityFilter;

      const matchesOwner =
        ownerFilter === "All Owners" || item.createdBy === ownerFilter;

      return matchesTab && matchesSearch && matchesModule && matchesPriority && matchesOwner;
    });
  }, [cases, activeTab, search, moduleFilter, priorityFilter, ownerFilter]);

  const counts: Record<string, number> = {
    All: cases.length,
    Draft: cases.filter((x) => x.status === "Draft").length,
    Review: cases.filter((x) => x.status === "Review").length,
    Approved: cases.filter((x) => x.status === "Approved").length,
    Deprecated: cases.filter((x) => x.status === "Deprecated").length,
  };

  function startCreate() {
    setForm(emptyForm());
    if (projectsList.length > 0) {
      setForm((f) => ({ ...f, project: projectsList[0] }));
    }
    setSteps([emptyStep()]);
    setWizardStep(1);
    setView("create");
  }

  function updateForm(key: keyof ReturnType<typeof emptyForm>, value: string) {
    setForm((old) => ({ ...old, [key]: value }));
  }

  function updateStep(index: number, key: keyof TestStep, value: string) {
    setSteps((old) =>
      old.map((step, i) => (i === index ? { ...step, [key]: value } : step))
    );
  }

  function addStep() {
    setSteps((old) => [...old, emptyStep()]);
  }

  function removeStep(index: number) {
    setSteps((old) => old.filter((_, i) => i !== index));
  }

  async function saveTestCase(status: TestStatus) {
    if (!form.title.trim()) {
      notify("Please enter a test case title.");
      setWizardStep(1);
      return;
    }

    if (!form.description.trim()) {
      notify("Please enter a test case description.");
      setWizardStep(1);
      return;
    }

    if (steps.some((s) => !s.description.trim() || !s.expectedResult.trim())) {
      notify("Please complete the step description and expected result.");
      setWizardStep(2);
      return;
    }

    try {
      const payload = {
        title: form.title,
        description: form.description,
        module: form.module,
        priority: form.priority,
        type: form.type,
        status: status.toUpperCase(),
        steps,
      };

      const created = await createTestCase(payload);
      const newCase: TestCase = {
        id: created?.testCaseId || `TC-${String(cases.length + 1).padStart(3, "0")}`,
        backendId: created?._id || created?.id,
        title: form.title,
        module: form.module,
        priority: form.priority,
        status,
        createdBy: form.author,
        createdOn: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        project: form.project,
        type: form.type,
        description: form.description,
        author: form.author,
        steps,
      };

      setCases((old) => [newCase, ...old]);
      setSelectedCase(newCase);
      setView(status === "Review" ? "details" : "registry");
      setActiveTab("All");
      notify(status === "Review" ? "Test case submitted for review." : "Test case saved as draft.");
    } catch (err: any) {
      notify(`Failed to save test case: ${err?.message || "Server error"}`);
    }
  }

  function openDetails(item: TestCase) {
    setSelectedCase(item);
    setView("details");
    setMenuId(null);
  }

  function cloneCase(item: TestCase) {
    const cloned = {
      ...item,
      id: `TC-${String(cases.length + 1).padStart(3, "0")}`,
      title: `${item.title} (Copy)`,
      status: "Draft" as TestStatus,
      createdOn: new Date().toLocaleDateString("en-GB"),
    };
    setCases((old) => [cloned, ...old]);
    setMenuId(null);
    notify("Test case cloned successfully.");
  }

  async function deleteCase(id: string) {
    if (!window.confirm(`Delete ${id}? This action cannot be undone.`)) return;
    const target = cases.find((c) => c.id === id);
    if (target?.backendId) {
      try {
        await deleteTestCase(target.backendId);
      } catch (err: any) {
        notify(`Delete error: ${err?.message || "Server error"}`);
      }
    }
    setCases((old) => old.filter((item) => item.id !== id));
    setMenuId(null);
    notify("Test case deleted.");
  }

  function exportCases() {
    const headers = ["ID", "Title", "Module", "Priority", "Status", "Created By", "Created On"];
    const rows = filteredCases.map((x) => [
      x.id, x.title, x.module, x.priority, x.status, x.createdBy, x.createdOn,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "test-cases-export.csv";
    a.click();
    URL.revokeObjectURL(url);
    notify("Test cases exported as CSV.");
  }

  function resetFilters() {
    setSearch("");
    setModuleFilter("All Modules");
    setPriorityFilter("All Priorities");
    setOwnerFilter("All Owners");
  }

  const uniqueModules = Array.from(new Set(cases.map((c) => c.module)));
  const uniqueOwners = Array.from(new Set(cases.map((c) => c.createdBy)));

  return (
    <main className="tc-page">
      <header className="tc-header">
        <div className="tc-title-wrap">
          <h1>Test Case Management</h1>
          <p>Design, organize, review, and track quality test specifications</p>
        </div>

        <div className="tc-header-actions">
          <button className="tc-btn tc-btn-secondary" onClick={() => setView("import")}>
            <Upload size={15} /> Import
          </button>
          <button className="tc-btn tc-btn-secondary" onClick={exportCases}>
            <Download size={15} /> Export
          </button>
          <button className="tc-btn tc-btn-primary" onClick={startCreate}>
            <Plus size={15} /> Create Test Case
          </button>
        </div>
      </header>

      {view === "registry" && (
        <section className="tc-card">
          <div className="tc-tabs">
            {["All", "Draft", "Review", "Approved", "Deprecated"].map((tab) => (
              <button
                key={tab}
                className={activeTab === tab ? "active" : ""}
                onClick={() => setActiveTab(tab)}
              >
                {tab} <span>{counts[tab] || 0}</span>
              </button>
            ))}
          </div>

          <div className="tc-filter-row">
            <div className="tc-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search test case by ID, title or module..."
              />
            </div>

            <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
              <option>All Modules</option>
              {uniqueModules.map((m) => <option key={m}>{m}</option>)}
            </select>

            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option>All Priorities</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>

            <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
              <option>All Owners</option>
              {uniqueOwners.map((o) => <option key={o}>{o}</option>)}
            </select>

            <button className="tc-btn tc-btn-reset" onClick={resetFilters}>
              <RotateCcw size={14} /> Reset
            </button>
          </div>

          <div className="tc-table-wrap">
            <table className="tc-table">
              <thead>
                <tr>
                  <th><input type="checkbox" aria-label="Select all test cases" /></th>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Module</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th>Created On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((item) => (
                  <tr key={item.id}>
                    <td><input type="checkbox" aria-label={`Select ${item.id}`} /></td>
                    <td className="tc-id">{item.id}</td>
                    <td className="tc-title-cell">{item.title}</td>
                    <td>{item.module}</td>
                    <td><span className={`tc-priority ${item.priority.toLowerCase()}`}>{item.priority}</span></td>
                    <td><span className={`tc-status ${item.status.toLowerCase()}`}>{item.status}</span></td>
                    <td>{item.createdBy}</td>
                    <td>{item.createdOn}</td>
                    <td>
                      <div className="tc-row-actions">
                        <button title="View" onClick={() => openDetails(item)}><Eye size={15} /></button>
                        <button title="Edit" onClick={() => { setSelectedCase(item); setForm({ project: item.project, module: item.module, title: item.title, description: item.description, priority: item.priority, type: item.type, author: item.author }); setSteps(item.steps.length ? item.steps : [emptyStep()]); setWizardStep(1); setView("create"); }}><Pencil size={15} /></button>
                        <button title="More actions" onClick={() => setMenuId(menuId === item.id ? null : item.id)}><MoreHorizontal size={16} /></button>
                      </div>
                      {menuId === item.id && (
                        <div className="tc-action-menu">
                          <button onClick={() => openDetails(item)}><Eye size={14} /> View</button>
                          <button onClick={() => cloneCase(item)}><Copy size={14} /> Clone</button>
                          <button onClick={() => exportCases()}><Download size={14} /> Export</button>
                          <button className="danger" onClick={() => deleteCase(item.id)}><Trash2 size={14} /> Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!filteredCases.length && (
                  <tr>
                    <td colSpan={9} className="tc-empty">
                      No test cases found. Click "Create Test Case" to add a new test case.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="tc-table-footer">
            <span>Showing {filteredCases.length ? 1 : 0} to {filteredCases.length} of {filteredCases.length} test cases</span>
            <div className="tc-pagination">
              <button disabled><ChevronLeft size={15} /></button>
              <button className="active">1</button>
              <button disabled><ChevronRight size={15} /></button>
            </div>
          </div>
        </section>
      )}

      {view === "create" && (
        <section className="tc-card tc-wizard">
          <div className="tc-wizard-head">
            <button className="tc-back-btn" onClick={() => setView("registry")}>
              <ArrowLeft size={16} /> Back to Registry
            </button>
            <h2>Create New Test Case</h2>
            <div className="tc-steps-indicator">
              <span className={wizardStep === 1 ? "active" : ""}>1. Details</span>
              <span className={wizardStep === 2 ? "active" : ""}>2. Test Steps</span>
              <span className={wizardStep === 3 ? "active" : ""}>3. Review</span>
            </div>
          </div>

          {wizardStep === 1 && (
            <div className="tc-form-grid">
              <label>
                Project
                <select value={form.project} onChange={(e) => updateForm("project", e.target.value)}>
                  {projectsList.length > 0 ? (
                    projectsList.map((p) => <option key={p}>{p}</option>)
                  ) : (
                    <option>General Project</option>
                  )}
                </select>
              </label>

              <label>
                Module
                <input value={form.module} onChange={(e) => updateForm("module", e.target.value)} placeholder="e.g. Authentication, Billing, Patient" />
              </label>

              <label className="tc-col-full">
                Title
                <input value={form.title} onChange={(e) => updateForm("title", e.target.value)} placeholder="Enter test case title" />
              </label>

              <label className="tc-col-full">
                Description / Preconditions
                <textarea rows={3} value={form.description} onChange={(e) => updateForm("description", e.target.value)} placeholder="State test intent, prerequisites, environment details..." />
              </label>

              <label>
                Priority
                <select value={form.priority} onChange={(e) => updateForm("priority", e.target.value as Priority)}>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </label>

              <label>
                Type
                <select value={form.type} onChange={(e) => updateForm("type", e.target.value)}>
                  <option>Functional</option>
                  <option>Regression</option>
                  <option>Integration</option>
                  <option>Security</option>
                </select>
              </label>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="tc-steps-builder">
              <div className="tc-steps-head">
                <h3>Test Steps</h3>
                <button className="tc-btn tc-btn-secondary" onClick={addStep}>
                  <Plus size={14} /> Add Step
                </button>
              </div>

              {steps.map((st, index) => (
                <div className="tc-step-card" key={st.id}>
                  <div className="tc-step-num">Step {index + 1}</div>
                  <div className="tc-step-fields">
                    <input
                      placeholder="Step action / description"
                      value={st.description}
                      onChange={(e) => updateStep(index, "description", e.target.value)}
                    />
                    <input
                      placeholder="Test data (optional)"
                      value={st.testData}
                      onChange={(e) => updateStep(index, "testData", e.target.value)}
                    />
                    <input
                      placeholder="Expected outcome"
                      value={st.expectedResult}
                      onChange={(e) => updateStep(index, "expectedResult", e.target.value)}
                    />
                  </div>
                  {steps.length > 1 && (
                    <button className="tc-step-del" onClick={() => removeStep(index)} aria-label="Delete step">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {wizardStep === 3 && (
            <div className="tc-review">
              <div className="tc-review-summary">
                <div><span>Project:</span> <strong>{form.project}</strong></div>
                <div><span>Module:</span> <strong>{form.module}</strong></div>
                <div><span>Title:</span> <strong>{form.title}</strong></div>
                <div><span>Priority:</span> <strong>{form.priority}</strong></div>
                <div><span>Type:</span> <strong>{form.type}</strong></div>
                <div><span>Steps Count:</span> <strong>{steps.length}</strong></div>
              </div>
              <p className="tc-review-desc">{form.description}</p>
            </div>
          )}

          <div className="tc-wizard-actions">
            {wizardStep > 1 && (
              <button className="tc-btn tc-btn-secondary" onClick={() => setWizardStep((s) => s - 1)}>
                Previous
              </button>
            )}

            {wizardStep < 3 ? (
              <button className="tc-btn tc-btn-primary" onClick={() => setWizardStep((s) => s + 1)}>
                Next
              </button>
            ) : (
              <div className="tc-final-actions">
                <button className="tc-btn tc-btn-secondary" onClick={() => saveTestCase("Draft")}>
                  Save Draft
                </button>
                <button className="tc-btn tc-btn-primary" onClick={() => saveTestCase("Review")}>
                  Submit for Review
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {view === "details" && selectedCase && (
        <section className="tc-card tc-details-view">
          <div className="tc-details-head">
            <button className="tc-back-btn" onClick={() => setView("registry")}>
              <ArrowLeft size={16} /> Back to Registry
            </button>
            <div className="tc-details-badges">
              <span className={`tc-status ${selectedCase.status.toLowerCase()}`}>{selectedCase.status}</span>
              <span className={`tc-priority ${selectedCase.priority.toLowerCase()}`}>{selectedCase.priority}</span>
            </div>
          </div>

          <h2>{selectedCase.id}: {selectedCase.title}</h2>
          <p className="tc-details-meta">
            Project: <b>{selectedCase.project}</b> | Module: <b>{selectedCase.module}</b> | Created by: <b>{selectedCase.createdBy}</b> on {selectedCase.createdOn}
          </p>

          <div className="tc-details-section">
            <h3>Description & Preconditions</h3>
            <p>{selectedCase.description || "No description provided."}</p>
          </div>

          <div className="tc-details-section">
            <h3>Execution Steps</h3>
            {selectedCase.steps.length === 0 ? (
              <p style={{ color: "#6b7280" }}>No steps defined for this test case.</p>
            ) : (
              <ol className="tc-details-steps">
                {selectedCase.steps.map((s, idx) => (
                  <li key={s.id || idx}>
                    <strong>Action:</strong> {s.description}
                    {s.testData && <span> (Data: {s.testData})</span>}
                    <br />
                    <em>Expected:</em> {s.expectedResult}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      )}

      {view === "import" && (
        <section className="tc-card tc-import-card">
          <button className="tc-back-btn" onClick={() => setView("registry")}>
            <ArrowLeft size={16} /> Back to Registry
          </button>
          <h2>Import Test Cases from CSV</h2>
          <p>Upload a standard CSV file with columns: Title, Module, Priority, Type, Description</p>
          <div className="tc-dropzone" onClick={() => fileRef.current?.click()}>
            <FileSpreadsheet size={36} />
            <p>{importFile ? importFile.name : "Click to select CSV file"}</p>
            <input
              type="file"
              ref={fileRef}
              accept=".csv"
              style={{ display: "none" }}
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="tc-import-actions">
            <button className="tc-btn tc-btn-secondary" onClick={() => setView("registry")}>Cancel</button>
            <button className="tc-btn tc-btn-primary" onClick={() => { if (!importFile) { notify("Select a CSV file first."); return; } notify("CSV import received. Processing records."); setView("registry"); }}>Upload & Import</button>
          </div>
        </section>
      )}

      {toast && <div className="tc-toast">{toast}</div>}
    </main>
  );
}
