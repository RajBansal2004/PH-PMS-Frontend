"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Cloud,
  GitBranch,
  Loader2,
  Rocket,
  Save,
  Users,
  WalletCards,
} from "lucide-react";
import { clients, createProject, employees } from "../lib/api";

const steps = [
  "Identity",
  "Ownership",
  "Timeline",
  "Commercial",
  "Technology",
  "Governance",
  "Team & Access",
  "Review & Approval",
];

export function CreateProject() {
  const params = useSearchParams();
  const router = useRouter();
  const step = Math.max(1, Math.min(8, Number(params.get("step") || 1)));
  const go = (n: number) => router.push(`/projects/new?step=${n}`);

  const [clientList, setClientList] = useState<any[]>([]);
  const [employeeList, setEmployeeList] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [form, setForm] = useState({
    clientId: "",
    projectName: "",
    projectCode: `PRJ-${String(Math.floor(1000 + Math.random() * 9000))}`,
    projectCategory: "Implementation",
    description: "",
    projectManagerId: "",
    technicalLeadId: "",
    qaLeadId: "",
    businessAnalystId: "",
    startDate: "",
    targetCompletion: "",
    actualStart: "",
    targetRelease: "",
    contractType: "Fixed Price",
    budget: "",
    currency: "INR",
    billingType: "Milestone Based",
    estimatedHours: "",
    frontend: "",
    backend: "",
    database: "",
    cloud: "",
    repository: "",
    priority: "HIGH",
    riskLevel: "MEDIUM",
    status: "PLANNED",
    approvalWorkflow: "Standard Project Approval",
  });

  const [teamMembers, setTeamMembers] = useState<{ employeeId: string; allocationPercentage: number }[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [cData, eData] = await Promise.all([
          clients().catch(() => []),
          employees().catch(() => []),
        ]);
        setClientList(Array.isArray(cData) ? cData : []);
        setEmployeeList(Array.isArray(eData) ? eData : []);
        if (Array.isArray(cData) && cData.length > 0) {
          setForm((prev) => ({ ...prev, clientId: prev.clientId || cData[0]._id || cData[0].id || "" }));
        }
      } catch (err) {
        console.warn("Failed to load options:", err);
      } finally {
        setLoadingOptions(false);
      }
    }
    loadData();
  }, []);

  const update = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrorMsg("");
  };

  const handleCreate = async () => {
    if (!form.projectName.trim()) {
      setErrorMsg("Project name is required.");
      go(1);
      return;
    }
    if (!form.clientId) {
      setErrorMsg("Please select a client.");
      go(1);
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      const payload: any = {
        clientId: form.clientId,
        projectName: form.projectName.trim(),
        projectCode: form.projectCode.trim().toUpperCase(),
        projectCategory: form.projectCategory,
        description: form.description || null,
        projectManagerId: form.projectManagerId || null,
        technicalLeadId: form.technicalLeadId || null,
        qaLeadId: form.qaLeadId || null,
        businessAnalystId: form.businessAnalystId || null,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        targetCompletion: form.targetCompletion ? new Date(form.targetCompletion).toISOString() : null,
        targetRelease: form.targetRelease ? new Date(form.targetRelease).toISOString() : null,
        contractType: form.contractType || null,
        budget: form.budget ? Number(form.budget.replace(/[^0-9.]/g, "")) : null,
        currency: form.currency || "INR",
        billingType: form.billingType || null,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : null,
        frontend: form.frontend || null,
        backend: form.backend || null,
        database: form.database || null,
        cloud: form.cloud || null,
        repository: form.repository || null,
        technology: [form.frontend, form.backend, form.database, form.cloud].filter(Boolean),
        priority: form.priority,
        riskLevel: form.riskLevel,
        status: form.status,
      };

      await createProject(payload);
      setSuccessMsg("Project created successfully!");
      setTimeout(() => {
        router.push("/projects");
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create project. Please verify all inputs.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedClient = clientList.find(
    (c) => (c._id || c.id) === form.clientId
  );

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">PROJECTS / CREATE</div>
          <h1>
            Create New Project <span>(PRJ-002)</span>
          </h1>
          <p>Configure a project through a controlled, approval-ready workflow.</p>
        </div>
        <Link href="/projects" className="btn outline">
          ← Back to Projects
        </Link>
      </div>

      {errorMsg && (
        <div style={{ padding: "12px 16px", background: "#fee2e2", color: "#991b1b", borderRadius: 8, marginBottom: 16 }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: "12px 16px", background: "#dcfce7", color: "#166534", borderRadius: 8, marginBottom: 16 }}>
          {successMsg}
        </div>
      )}

      <div className="stepper card">
        {steps.map((s, i) => (
          <button
            key={s}
            onClick={() => go(i + 1)}
            className={step === i + 1 ? "active" : step > i + 1 ? "done" : ""}
          >
            <span>{step > i + 1 ? <Check size={13} /> : i + 1}</span>
            {s}
          </button>
        ))}
      </div>

      <div className="create-layout">
        <section className="card create-main">
          <div className="section-head">
            <div>
              <div className="eyebrow">STEP {step} OF 8</div>
              <h2>{steps[step - 1]}</h2>
              <p>
                {step === 1 && "Provide basic identity information about the project."}
                {step === 2 && "Assign key ownership roles for the project."}
                {step === 3 && "Define project schedule and important target dates."}
                {step === 4 && "Configure commercial details and budget information."}
                {step === 5 && "Select technology stack and development tools."}
                {step === 6 && "Configure governance, priority and approval settings."}
                {step === 7 && "Define project team members and access settings."}
                {step === 8 && "Review all details before creating the project."}
              </p>
            </div>
          </div>

          {step === 1 && (
            <div className="form-grid create-form">
              <label>
                Client <b>*</b>
                <select
                  value={form.clientId}
                  onChange={(e) => update("clientId", e.target.value)}
                >
                  <option value="">-- Select Client --</option>
                  {clientList.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.displayName || c.legalName || c.name || "Client"}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Project Name <b>*</b>
                <input
                  value={form.projectName}
                  onChange={(e) => update("projectName", e.target.value)}
                  placeholder="e.g. AI-CMS Implementation"
                />
              </label>

              <label>
                Project Code <b>*</b>
                <input
                  value={form.projectCode}
                  onChange={(e) => update("projectCode", e.target.value.toUpperCase())}
                  placeholder="e.g. PRJ-00075"
                />
              </label>

              <label>
                Project Type <b>*</b>
                <select
                  value={form.projectCategory}
                  onChange={(e) => update("projectCategory", e.target.value)}
                >
                  <option value="Implementation">Implementation</option>
                  <option value="Custom Development">Custom Development</option>
                  <option value="Integration">Integration</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="R&D">R&D</option>
                </select>
              </label>

              <label className="span-2">
                Description
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Provide project summary, business scope and core objectives..."
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="form-grid create-form">
              <label>
                Project Manager
                <select
                  value={form.projectManagerId}
                  onChange={(e) => update("projectManagerId", e.target.value)}
                >
                  <option value="">-- Select Project Manager --</option>
                  {employeeList.map((emp) => (
                    <option key={emp._id || emp.id} value={emp._id || emp.id}>
                      {emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Technical Lead
                <select
                  value={form.technicalLeadId}
                  onChange={(e) => update("technicalLeadId", e.target.value)}
                >
                  <option value="">-- Select Technical Lead --</option>
                  {employeeList.map((emp) => (
                    <option key={emp._id || emp.id} value={emp._id || emp.id}>
                      {emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                QA Lead
                <select
                  value={form.qaLeadId}
                  onChange={(e) => update("qaLeadId", e.target.value)}
                >
                  <option value="">-- Select QA Lead --</option>
                  {employeeList.map((emp) => (
                    <option key={emp._id || emp.id} value={emp._id || emp.id}>
                      {emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Business Analyst
                <select
                  value={form.businessAnalystId}
                  onChange={(e) => update("businessAnalystId", e.target.value)}
                >
                  <option value="">-- Select Business Analyst --</option>
                  {employeeList.map((emp) => (
                    <option key={emp._id || emp.id} value={emp._id || emp.id}>
                      {emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="form-grid create-form">
              <label>
                Planned Start <b>*</b>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
                />
              </label>

              <label>
                Planned End <b>*</b>
                <input
                  type="date"
                  value={form.targetCompletion}
                  onChange={(e) => update("targetCompletion", e.target.value)}
                />
              </label>

              <label>
                Actual Start
                <input
                  type="date"
                  value={form.actualStart}
                  onChange={(e) => update("actualStart", e.target.value)}
                />
              </label>

              <label>
                Target Release
                <input
                  type="date"
                  value={form.targetRelease}
                  onChange={(e) => update("targetRelease", e.target.value)}
                />
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="form-grid create-form">
              <label>
                Contract Type <b>*</b>
                <select
                  value={form.contractType}
                  onChange={(e) => update("contractType", e.target.value)}
                >
                  <option value="Fixed Price">Fixed Price</option>
                  <option value="Time & Material">Time & Material</option>
                  <option value="Dedicated Team">Dedicated Team</option>
                  <option value="Retainer">Retainer</option>
                </select>
              </label>

              <label>
                Budget Amount <b>*</b>
                <input
                  value={form.budget}
                  onChange={(e) => update("budget", e.target.value)}
                  placeholder="e.g. 2500000"
                />
              </label>

              <label>
                Currency
                <select
                  value={form.currency}
                  onChange={(e) => update("currency", e.target.value)}
                >
                  <option value="INR">INR - Indian Rupee (₹)</option>
                  <option value="USD">USD - US Dollar ($)</option>
                  <option value="EUR">EUR - Euro (€)</option>
                  <option value="GBP">GBP - British Pound (£)</option>
                </select>
              </label>

              <label>
                Billing Type
                <select
                  value={form.billingType}
                  onChange={(e) => update("billingType", e.target.value)}
                >
                  <option value="Milestone Based">Milestone Based</option>
                  <option value="Monthly Retainer">Monthly Retainer</option>
                  <option value="Hourly Bi-Weekly">Hourly Bi-Weekly</option>
                </select>
              </label>

              <label>
                Estimated Hours
                <input
                  value={form.estimatedHours}
                  onChange={(e) => update("estimatedHours", e.target.value)}
                  placeholder="e.g. 2400"
                />
              </label>
            </div>
          )}

          {step === 5 && (
            <div className="form-grid create-form">
              <label>
                Frontend
                <input
                  value={form.frontend}
                  onChange={(e) => update("frontend", e.target.value)}
                  placeholder="e.g. Next.js, React"
                />
              </label>

              <label>
                Backend
                <input
                  value={form.backend}
                  onChange={(e) => update("backend", e.target.value)}
                  placeholder="e.g. Node.js, Express"
                />
              </label>

              <label>
                Database
                <input
                  value={form.database}
                  onChange={(e) => update("database", e.target.value)}
                  placeholder="e.g. MongoDB, PostgreSQL"
                />
              </label>

              <label>
                Cloud / Infrastructure
                <input
                  value={form.cloud}
                  onChange={(e) => update("cloud", e.target.value)}
                  placeholder="e.g. AWS, Azure, GCP"
                />
              </label>

              <label className="span-2">
                Git Repository
                <input
                  value={form.repository}
                  onChange={(e) => update("repository", e.target.value)}
                  placeholder="e.g. https://github.com/pehalhealth/ai-cms"
                />
              </label>
            </div>
          )}

          {step === 6 && (
            <div className="form-grid create-form">
              <label>
                Priority
                <select
                  value={form.priority}
                  onChange={(e) => update("priority", e.target.value)}
                >
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </label>

              <label>
                Risk Level
                <select
                  value={form.riskLevel}
                  onChange={(e) => update("riskLevel", e.target.value)}
                >
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </label>

              <label>
                Status
                <select
                  value={form.status}
                  onChange={(e) => update("status", e.target.value)}
                >
                  <option value="PLANNED">Planned</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </label>

              <label>
                Approval Workflow
                <input
                  value={form.approvalWorkflow}
                  onChange={(e) => update("approvalWorkflow", e.target.value)}
                />
              </label>
            </div>
          )}

          {step === 7 && (
            <div className="member-table">
              <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 12 }}>
                Team assignments can be configured here or refined later in the Project Team workspace.
              </p>
              {employeeList.slice(0, 4).map((emp, i) => (
                <div key={emp._id || emp.id}>
                  <b>{emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email}</b>
                  <span>{emp.designation?.name || "Team Member"}</span>
                  <input defaultValue="100%" />
                </div>
              ))}
            </div>
          )}

          {step === 8 && (
            <div className="review-grid">
              <div className="card" style={{ padding: 16 }}>
                <div className="section-head">
                  <b>Identity & Scope</b>
                  <a onClick={() => go(1)} style={{ cursor: "pointer", color: "#2563eb" }}>Edit</a>
                </div>
                <p>Client: <strong>{selectedClient?.displayName || selectedClient?.legalName || "Not selected"}</strong></p>
                <p>Project: <strong>{form.projectName || "Not specified"}</strong> ({form.projectCode})</p>
                <p>Category: <strong>{form.projectCategory}</strong></p>
              </div>

              <div className="card" style={{ padding: 16 }}>
                <div className="section-head">
                  <b>Commercial & Schedule</b>
                  <a onClick={() => go(3)} style={{ cursor: "pointer", color: "#2563eb" }}>Edit</a>
                </div>
                <p>Timeline: <strong>{form.startDate || "TBD"}</strong> to <strong>{form.targetCompletion || "TBD"}</strong></p>
                <p>Budget: <strong>{form.budget ? `${form.currency} ${form.budget}` : "Not set"}</strong></p>
                <p>Status: <strong>{form.status}</strong></p>
              </div>
            </div>
          )}

          <div className="create-actions">
            <button
              className="btn outline"
              type="button"
              disabled={step === 1 || submitting}
              onClick={() => step > 1 && go(step - 1)}
            >
              ← Back
            </button>

            {step < 8 ? (
              <button
                className="btn primary"
                type="button"
                onClick={() => go(step + 1)}
              >
                Next: {steps[step]} <ChevronRight size={15} />
              </button>
            ) : (
              <button
                className="btn success"
                type="button"
                disabled={submitting}
                onClick={handleCreate}
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="spin" /> Creating...
                  </>
                ) : (
                  "✓ Create Project"
                )}
              </button>
            )}
          </div>
        </section>

        <aside className="card quick-info">
          <b>Quick Info</b>
          <div>
            <span>Project Code</span>
            <strong>{form.projectCode || "—"}</strong>
          </div>
          <div>
            <span>Client</span>
            <strong>{selectedClient?.displayName || selectedClient?.legalName || "—"}</strong>
          </div>
          <div>
            <span>Project Type</span>
            <strong>{form.projectCategory || "—"}</strong>
          </div>
          <div>
            <span>Status</span>
            <span className="status amber">{form.status}</span>
          </div>
          <div className="tips">
            <b>Helpful Tips</b>
            <p>• All required fields are marked with *.</p>
            <p>• Project code is auto-formatted and unique.</p>
            <p>• Connects directly to backend database on submit.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
