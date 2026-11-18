"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Loader2,
  Save,
} from "lucide-react";
import {
  clients as getClients,
  createProject,
  employees as getEmployees,
  getNextProjectCode,
  projects as getProjects,
} from "../lib/api";

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

  const [totalProjectsCount, setTotalProjectsCount] = useState<number>(10);
  const [autoProjectCode, setAutoProjectCode] = useState<string>("PRJ-00011");

  // Form values initialized clean (NO dummy text autofill, auto project code pre-populated)
  const [formData, setFormData] = useState<Record<string, string>>({
    Client: "",
    "Project Name": "",
    "Project Code": "PRJ-00011",
    "Project Type": "",
    Description: "",
    "Project Manager": "",
    "Technical Lead": "",
    "QA Lead": "",
    "Business Analyst": "",
    "Planned Start": "",
    "Planned End": "",
    "Actual Start": "",
    "Target Release": "",
    "Contract Type": "Fixed Price",
    Budget: "",
    Currency: "INR",
    "Billing Type": "Milestone Based",
    "Estimated Hours": "",
    Frontend: "",
    Backend: "",
    Database: "",
    Cloud: "",
    Repository: "",
    Priority: "High",
    "Risk Level": "Medium",
    Status: "Planned",
    "Approval Workflow": "Standard Project Approval",
  });

  const [clientOptions, setClientOptions] = useState<any[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
  const [teamList, setTeamList] = useState<
    Array<{ name: string; role: string; alloc: string }>
  >([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getClients().catch(() => []),
      getEmployees().catch(() => []),
      getNextProjectCode().catch(() => null),
      getProjects({ limit: 100 }).catch(() => null),
    ]).then(([cList, eList, nextCodeRes, pRes]) => {
      if (!mounted) return;
      const cls = Array.isArray(cList) ? cList : (cList as any)?.items || [];
      const emps = Array.isArray(eList) ? eList : (eList as any)?.items || [];
      setClientOptions(cls);
      setEmployeeOptions(emps);

      let total = 10;
      let code = "PRJ-00011";

      if (nextCodeRes?.nextCode) {
        code = nextCodeRes.nextCode;
        total = Number(nextCodeRes.totalProjects) || 10;
      } else if (pRes) {
        const pItems: any[] = (pRes as any)?.items || [];
        total = Number((pRes as any)?.pagination?.total) || pItems.length;
        const codes = new Set(
          pItems.map((p: any) => String(p.projectCode || "").toUpperCase())
        );
        let nextNum = Math.max(1, total + 1);
        while (codes.has(`PRJ-${String(nextNum).padStart(5, "0")}`)) {
          nextNum++;
        }
        code = `PRJ-${String(nextNum).padStart(5, "0")}`;
      }

      setTotalProjectsCount(total);
      setAutoProjectCode(code);
      setFormData((prev) => ({
        ...prev,
        "Project Code": prev["Project Code"] === "PRJ-00011" || !prev["Project Code"] ? code : prev["Project Code"],
      }));
    });
    return () => {
      mounted = false;
    };
  }, []);

  const go = (n: number) => {
    setSubmitError("");
    router.push(`/projects/new?step=${n}`);
  };

  const updateField = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const selectedClient = clientOptions.find(
    (c) =>
      String(c._id || c.id) === String(formData["Client"]) ||
      c.displayName === formData["Client"] ||
      c.legalName === formData["Client"] ||
      c.clientCode === formData["Client"]
  );

  const handleSave = async (overrideStatus?: string) => {
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const name = formData["Project Name"]?.trim();
      if (!name) {
        go(1);
        throw new Error("Project Name is required.");
      }

      const findEmpId = (val?: string) => {
        if (!val) return undefined;
        const emp = employeeOptions.find(
          (e) =>
            String(e._id || e.id) === String(val) ||
            e.displayName === val ||
            `${e.firstName || ""} ${e.lastName || ""}`.trim() === val ||
            e.name === val ||
            e.employeeCode === val
        );
        return emp ? (emp._id || emp.id) : undefined;
      };

      const start = formData["Planned Start"];
      const end = formData["Planned End"];
      if (start && end && new Date(end) < new Date(start)) {
        go(3);
        throw new Error("Planned End date cannot be before Planned Start date.");
      }

      const budgetNum = Number(String(formData["Budget"]).replace(/[^0-9.]/g, "")) || 0;
      const hoursNum = Number(String(formData["Estimated Hours"]).replace(/[^0-9.]/g, "")) || 0;

      const code = (
        formData["Project Code"]?.trim() ||
        autoProjectCode ||
        `PRJ-${String(totalProjectsCount + 1).padStart(5, "0")}`
      ).toUpperCase();

      const payload: any = {
        projectName: name,
        projectCode: code,
        projectCategory: formData["Project Type"] || "Construction & Civil",
        description: formData["Description"]?.trim() || undefined,
        status: overrideStatus || (formData["Status"] === "Draft" ? "DRAFT" : "ACTIVE"),
        priority: (formData["Priority"] || "HIGH").toUpperCase(),
        riskLevel: (formData["Risk Level"] || "MEDIUM").toUpperCase(),
        contractType: formData["Contract Type"] || "Fixed Price",
        billingType: formData["Billing Type"] || "Milestone Based",
        currency: formData["Currency"] || "INR",
        budget: budgetNum,
        estimatedHours: hoursNum,
      };

      if (selectedClient?._id || selectedClient?.id) {
        payload.clientId = selectedClient._id || selectedClient.id;
      }
      const pmId = findEmpId(formData["Project Manager"]);
      if (pmId) payload.projectManagerId = pmId;

      const tlId = findEmpId(formData["Technical Lead"]);
      if (tlId) payload.technicalLeadId = tlId;

      const qaId = findEmpId(formData["QA Lead"]);
      if (qaId) payload.qaLeadId = qaId;

      const baId = findEmpId(formData["Business Analyst"]);
      if (baId) payload.businessAnalystId = baId;

      if (start) payload.startDate = start;
      if (end) payload.targetCompletion = end;
      if (formData["Actual Start"]) payload.actualCompletion = formData["Actual Start"];
      if (formData["Target Release"]) payload.targetRelease = formData["Target Release"];
      if (formData["Frontend"]) payload.frontend = formData["Frontend"];
      if (formData["Backend"]) payload.backend = formData["Backend"];
      if (formData["Database"]) payload.database = formData["Database"];
      if (formData["Cloud"]) payload.cloud = formData["Cloud"];
      if (formData["Repository"]) payload.repository = formData["Repository"];

      await createProject(payload);

      setSubmitSuccess(`Project "${name}" (${code}) created successfully!`);
      setTimeout(() => {
        router.push("/projects");
      }, 1200);
    } catch (err: any) {
      console.error("Project creation error:", err);
      setSubmitError(err?.message || "Failed to create project. Please verify the entered details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">PROJECTS / CREATE</div>
          <h1>
            Create New Project <span>({formData["Project Code"] || autoProjectCode})</span>
          </h1>
          <p>Configure a project through a controlled, approval-ready workflow.</p>
        </div>
        <Link href="/projects" className="btn outline">
          ← Back to Projects
        </Link>
      </div>

      <div className="stepper card">
        {steps.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => go(i + 1)}
            className={step === i + 1 ? "active" : step > i + 1 ? "done" : ""}
          >
            <span>{step > i + 1 ? <Check size={13} /> : i + 1}</span>
            {s}
          </button>
        ))}
      </div>

      {submitError && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            padding: "10px 14px",
            borderRadius: 6,
            marginTop: 10,
            marginBottom: 6,
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={15} />
          <span>{submitError}</span>
        </div>
      )}

      {submitSuccess && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#15803d",
            padding: "10px 14px",
            borderRadius: 6,
            marginTop: 10,
            marginBottom: 6,
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Check size={15} />
          <span>{submitSuccess}</span>
        </div>
      )}

      <div className="create-layout">
        <section className="card create-main">
          <div className="section-head">
            <div>
              <div className="eyebrow">STEP {step} OF 8</div>
              <h2>{steps[step - 1]}</h2>
              <p>
                {step === 1
                  ? "Provide basic identity information about the project."
                  : step === 2
                  ? "Assign key ownership roles for the project."
                  : step === 3
                  ? "Define project schedule and important target dates."
                  : step === 4
                  ? "Configure commercial details and budget information."
                  : step === 5
                  ? "Select technology stack and development tools."
                  : step === 6
                  ? "Configure governance, priority and approval settings."
                  : step === 7
                  ? "Define project team members and access settings."
                  : "Review all details before creating the project."}
              </p>
            </div>
          </div>

          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <div className="form-grid create-form">
              <label>
                Client <b>*</b>
                <select
                  value={formData["Client"] || ""}
                  onChange={(e) => updateField("Client", e.target.value)}
                >
                  <option value="">Select Client</option>
                  {clientOptions.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.displayName || c.legalName} ({c.clientCode || "CLT"})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Project Name <b>*</b>
                <input
                  type="text"
                  placeholder="Enter Project Name"
                  value={formData["Project Name"] || ""}
                  onChange={(e) => updateField("Project Name", e.target.value)}
                />
              </label>

              <label>
                Project Code <b>*</b>
                <input
                  type="text"
                  placeholder="e.g. PRJ-00011"
                  value={formData["Project Code"] || autoProjectCode}
                  onChange={(e) => updateField("Project Code", e.target.value.toUpperCase())}
                />
              </label>

              <label>
                Project Type <b>*</b>
                <select
                  value={formData["Project Type"] || ""}
                  onChange={(e) => updateField("Project Type", e.target.value)}
                >
                  <option value="">Select Project Type</option>
                  <option value="Implementation">Implementation</option>
                  <option value="Construction & Civil">Construction & Civil</option>
                  <option value="Residential High-Rise">Residential High-Rise</option>
                  <option value="Commercial & Retail">Commercial & Retail</option>
                  <option value="Turnkey Infrastructure">Turnkey Infrastructure</option>
                  <option value="Consulting & Architecture">Consulting & Architecture</option>
                  <option value="Facility Management">Facility Management</option>
                </select>
              </label>

              <label className="span-2">
                Description
                <textarea
                  rows={3}
                  placeholder="Enter project description..."
                  value={formData["Description"] || ""}
                  onChange={(e) => updateField("Description", e.target.value)}
                />
              </label>
            </div>
          )}

          {/* STEP 2: OWNERSHIP */}
          {step === 2 && (
            <div className="form-grid create-form">
              <label>
                Project Manager <b>*</b>
                <select
                  value={formData["Project Manager"] || ""}
                  onChange={(e) => updateField("Project Manager", e.target.value)}
                >
                  <option value="">Select Project Manager</option>
                  {employeeOptions.map((e) => (
                    <option key={e._id || e.id} value={e._id || e.id}>
                      {e.displayName || `${e.firstName || ""} ${e.lastName || ""}`.trim()} ({e.employeeCode || "EMP"})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Technical Lead
                <select
                  value={formData["Technical Lead"] || ""}
                  onChange={(e) => updateField("Technical Lead", e.target.value)}
                >
                  <option value="">Select Technical Lead</option>
                  {employeeOptions.map((e) => (
                    <option key={e._id || e.id} value={e._id || e.id}>
                      {e.displayName || `${e.firstName || ""} ${e.lastName || ""}`.trim()} ({e.employeeCode || "EMP"})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                QA Lead
                <select
                  value={formData["QA Lead"] || ""}
                  onChange={(e) => updateField("QA Lead", e.target.value)}
                >
                  <option value="">Select QA Lead</option>
                  {employeeOptions.map((e) => (
                    <option key={e._id || e.id} value={e._id || e.id}>
                      {e.displayName || `${e.firstName || ""} ${e.lastName || ""}`.trim()} ({e.employeeCode || "EMP"})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Business Analyst
                <select
                  value={formData["Business Analyst"] || ""}
                  onChange={(e) => updateField("Business Analyst", e.target.value)}
                >
                  <option value="">Select Business Analyst</option>
                  {employeeOptions.map((e) => (
                    <option key={e._id || e.id} value={e._id || e.id}>
                      {e.displayName || `${e.firstName || ""} ${e.lastName || ""}`.trim()} ({e.employeeCode || "EMP"})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {/* STEP 3: TIMELINE */}
          {step === 3 && (
            <div className="form-grid create-form">
              <label>
                Planned Start <b>*</b>
                <input
                  type="date"
                  value={formData["Planned Start"] || ""}
                  onChange={(e) => updateField("Planned Start", e.target.value)}
                />
              </label>

              <label>
                Planned End <b>*</b>
                <input
                  type="date"
                  value={formData["Planned End"] || ""}
                  onChange={(e) => updateField("Planned End", e.target.value)}
                />
              </label>

              <label>
                Actual Start
                <input
                  type="date"
                  value={formData["Actual Start"] || ""}
                  onChange={(e) => updateField("Actual Start", e.target.value)}
                />
              </label>

              <label>
                Target Release
                <input
                  type="date"
                  value={formData["Target Release"] || ""}
                  onChange={(e) => updateField("Target Release", e.target.value)}
                />
              </label>
            </div>
          )}

          {/* STEP 4: COMMERCIAL */}
          {step === 4 && (
            <div className="form-grid create-form">
              <label>
                Contract Type <b>*</b>
                <select
                  value={formData["Contract Type"] || "Fixed Price"}
                  onChange={(e) => updateField("Contract Type", e.target.value)}
                >
                  <option value="Fixed Price">Fixed Price</option>
                  <option value="Item Rate / BOQ">Item Rate / BOQ</option>
                  <option value="EPC / Turnkey">EPC / Turnkey</option>
                  <option value="Cost Plus Fee">Cost Plus Fee</option>
                  <option value="Milestone Based">Milestone Based</option>
                  <option value="Time & Material">Time & Material</option>
                </select>
              </label>

              <label>
                Budget <b>*</b>
                <input
                  type="number"
                  placeholder="Enter budget (e.g. 2640000)"
                  value={formData["Budget"] || ""}
                  onChange={(e) => updateField("Budget", e.target.value)}
                />
              </label>

              <label>
                Currency
                <select
                  value={formData["Currency"] || "INR"}
                  onChange={(e) => updateField("Currency", e.target.value)}
                >
                  <option value="INR">INR - Indian Rupee (₹)</option>
                  <option value="USD">USD - US Dollar ($)</option>
                  <option value="EUR">EUR - Euro (€)</option>
                  <option value="AED">AED - UAE Dirham</option>
                </select>
              </label>

              <label>
                Billing Type
                <select
                  value={formData["Billing Type"] || "Milestone Based"}
                  onChange={(e) => updateField("Billing Type", e.target.value)}
                >
                  <option value="Milestone Based">Milestone Based</option>
                  <option value="Monthly Progress / RA Billing">Monthly Progress / RA Billing</option>
                  <option value="Advance & Retention">Advance & Retention</option>
                  <option value="Time & Material">Time & Material</option>
                </select>
              </label>

              <label>
                Estimated Hours
                <input
                  type="number"
                  placeholder="e.g. 2450"
                  value={formData["Estimated Hours"] || ""}
                  onChange={(e) => updateField("Estimated Hours", e.target.value)}
                />
              </label>
            </div>
          )}

          {/* STEP 5: TECHNOLOGY */}
          {step === 5 && (
            <div className="form-grid create-form">
              <label>
                Frontend
                <input
                  type="text"
                  placeholder="e.g. React.js"
                  value={formData["Frontend"] || ""}
                  onChange={(e) => updateField("Frontend", e.target.value)}
                />
              </label>

              <label>
                Backend
                <input
                  type="text"
                  placeholder="e.g. Node.js"
                  value={formData["Backend"] || ""}
                  onChange={(e) => updateField("Backend", e.target.value)}
                />
              </label>

              <label>
                Database
                <input
                  type="text"
                  placeholder="e.g. PostgreSQL"
                  value={formData["Database"] || ""}
                  onChange={(e) => updateField("Database", e.target.value)}
                />
              </label>

              <label>
                Cloud
                <input
                  type="text"
                  placeholder="e.g. AWS (Amazon Web Services)"
                  value={formData["Cloud"] || ""}
                  onChange={(e) => updateField("Cloud", e.target.value)}
                />
              </label>

              <label className="span-2">
                Repository
                <input
                  type="text"
                  placeholder="e.g. GitHub @pehalhealth/ai-cms"
                  value={formData["Repository"] || ""}
                  onChange={(e) => updateField("Repository", e.target.value)}
                />
              </label>
            </div>
          )}

          {/* STEP 6: GOVERNANCE */}
          {step === 6 && (
            <div className="form-grid create-form">
              <label>
                Priority
                <select
                  value={formData["Priority"] || "High"}
                  onChange={(e) => updateField("Priority", e.target.value)}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                  <option value="Critical">Critical</option>
                </select>
              </label>

              <label>
                Risk Level
                <select
                  value={formData["Risk Level"] || "Medium"}
                  onChange={(e) => updateField("Risk Level", e.target.value)}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </label>

              <label>
                Status
                <select
                  value={formData["Status"] || "Planned"}
                  onChange={(e) => updateField("Status", e.target.value)}
                >
                  <option value="Planned">Planned</option>
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Pending Approval">Pending Approval</option>
                </select>
              </label>

              <label>
                Approval Workflow
                <select
                  value={formData["Approval Workflow"] || "Standard Project Approval"}
                  onChange={(e) => updateField("Approval Workflow", e.target.value)}
                >
                  <option value="Standard Project Approval">Standard Project Approval</option>
                  <option value="Executive Committee Approval">Executive Committee Approval</option>
                  <option value="Fast-track Approval">Fast-track Approval</option>
                </select>
              </label>
            </div>
          )}

          {/* STEP 7: TEAM & ACCESS */}
          {step === 7 && (
            <TeamStep
              employeeOptions={employeeOptions}
              teamList={teamList}
              setTeamList={setTeamList}
            />
          )}

          {/* STEP 8: REVIEW & APPROVAL */}
          {step === 8 && (
            <ReviewStep
              formData={formData}
              clientOptions={clientOptions}
              autoProjectCode={autoProjectCode}
              go={go}
            />
          )}

          <div className="create-actions">
            <button
              className="btn outline"
              type="button"
              disabled={submitting}
              onClick={() => step > 1 && go(step - 1)}
            >
              ← Back
            </button>
            <button
              className="btn outline"
              type="button"
              disabled={submitting}
              onClick={() => handleSave("DRAFT")}
            >
              <Save size={14} /> Save Draft
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
                onClick={() => handleSave("ACTIVE")}
              >
                {submitting ? (
                  <>
                    <Loader2 size={13} className="spin" /> Creating...
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
            <strong>{formData["Project Code"] || autoProjectCode}</strong>
          </div>
          <div>
            <span>Client</span>
            <strong>{selectedClient?.displayName || selectedClient?.legalName || formData["Client"] || "—"}</strong>
          </div>
          <div>
            <span>Project Type</span>
            <strong>{formData["Project Type"] || "—"}</strong>
          </div>
          <div>
            <span>Status</span>
            <StatusP>{formData["Status"] || "Draft"}</StatusP>
          </div>
          <div>
            <span>Created By</span>
            <strong>PH PMS Admin</strong>
          </div>
          <div>
            <span>Target End</span>
            <strong>{formData["Planned End"] || "—"}</strong>
          </div>
          <div className="tips">
            <b>Helpful Tips</b>
            <p>• All required fields are marked with *.</p>
            <p>• Project code is auto-generated ({totalProjectsCount} existing projects).</p>
            <p>• You can save this project as draft.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatusP({ children }: { children: React.ReactNode }) {
  return <span className="status amber">{children}</span>;
}

function TeamStep({
  employeeOptions,
  teamList,
  setTeamList,
}: {
  employeeOptions: any[];
  teamList: Array<{ name: string; role: string; alloc: string }>;
  setTeamList: React.Dispatch<
    React.SetStateAction<Array<{ name: string; role: string; alloc: string }>>
  >;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const defaultMembers = [
    { name: "Rahul Verma", role: "Project Manager", alloc: "100%" },
    { name: "Amit Kumar", role: "Technical Lead", alloc: "80%" },
    { name: "Pooja Singh", role: "QA Lead", alloc: "60%" },
    { name: "Neha Patel", role: "Business Analyst", alloc: "40%" },
  ];

  const currentList = teamList.length > 0 ? teamList : defaultMembers;

  return (
    <div className="member-table">
      {currentList.map((x, i) => (
        <div key={x.name + i}>
          <b>{x.name}</b>
          <span>{x.role}</span>
          <input
            value={x.alloc}
            onChange={(e) => {
              const val = e.target.value;
              setTeamList((prev) => {
                const base = prev.length > 0 ? prev : defaultMembers;
                return base.map((item, idx) => (idx === i ? { ...item, alloc: val } : item));
              });
            }}
          />
          <button
            type="button"
            onClick={() => {
              setTeamList((prev) => {
                const base = prev.length > 0 ? prev : defaultMembers;
                return base.filter((_, idx) => idx !== i);
              });
            }}
          >
            ×
          </button>
        </div>
      ))}
      {showPicker ? (
        <select
          autoFocus
          style={{
            height: 28,
            fontSize: "8px",
            borderRadius: 4,
            border: "1px solid #dce6f1",
            padding: "0 6px",
            marginTop: 6,
          }}
          onChange={(e) => {
            const empId = e.target.value;
            setShowPicker(false);
            if (!empId) return;
            const emp = employeeOptions.find((x) => String(x._id || x.id) === String(empId));
            if (emp) {
              const name =
                emp.displayName ||
                `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
                emp.name;
              setTeamList((prev) => [
                ...(prev.length > 0 ? prev : defaultMembers),
                { name, role: "Team Member", alloc: "100%" },
              ]);
            }
          }}
          onBlur={() => setShowPicker(false)}
        >
          <option value="">Select Employee to Add...</option>
          {employeeOptions.map((e) => (
            <option key={e._id || e.id} value={e._id || e.id}>
              {e.displayName || `${e.firstName || ""} ${e.lastName || ""}`.trim()} ({e.employeeCode || "EMP"})
            </option>
          ))}
        </select>
      ) : (
        <button
          className="btn outline"
          type="button"
          onClick={() => setShowPicker(true)}
          style={{ alignSelf: "flex-start", marginTop: 4 }}
        >
          + Add Member
        </button>
      )}
    </div>
  );
}

function ReviewStep({
  formData,
  clientOptions,
  autoProjectCode,
  go,
}: {
  formData: Record<string, string>;
  clientOptions: any[];
  autoProjectCode: string;
  go: (n: number) => void;
}) {
  const sections = [
    { title: "Identity", step: 1 },
    { title: "Ownership", step: 2 },
    { title: "Timeline", step: 3 },
    { title: "Commercial", step: 4 },
    { title: "Technology", step: 5 },
    { title: "Governance", step: 6 },
    { title: "Team & Access", step: 7 },
  ];

  const selectedClient = clientOptions.find(
    (c) =>
      String(c._id || c.id) === String(formData["Client"]) ||
      c.displayName === formData["Client"] ||
      c.legalName === formData["Client"]
  );

  return (
    <div className="review-grid">
      {sections.map(({ title, step }) => (
        <div key={title}>
          <div className="section-head">
            <b>{title}</b>
            <a onClick={() => go(step)} style={{ cursor: "pointer" }}>
              Edit
            </a>
          </div>
          <p>
            Client: <strong>{selectedClient?.displayName || selectedClient?.legalName || formData["Client"] || "Not selected"}</strong>
          </p>
          <p>
            Project: <strong>{formData["Project Name"] || "Not entered"}</strong>
          </p>
          <p>
            Code: <strong>{formData["Project Code"] || autoProjectCode}</strong>
          </p>
          <p>
            Status: <strong>{formData["Status"] || "Planned"}</strong>
          </p>
          <p style={{ color: "#7186a2", fontSize: "7px" }}>
            All required information has been reviewed.
          </p>
        </div>
      ))}
      <div className="next-steps">
        <b>Next Steps</b>
        <span>1. Save Draft</span>
        <span>2. Submit for Approval</span>
        <span>3. Create Project</span>
        <span>4. Project Initialisation</span>
      </div>
    </div>
  );
}
