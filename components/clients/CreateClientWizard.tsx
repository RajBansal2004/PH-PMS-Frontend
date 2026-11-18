
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Building2, UploadCloud, ImagePlus,
  Check, CheckCircle2, ChevronDown, FileText, X, Save,
  MapPin, UserRound, ShieldCheck, Globe, Plus, Loader2,
} from "lucide-react";
import "./client-workflow.css";
import { createClient as apiCreateClient, employees, userRegistry } from "../../lib/api";

type FormData = {
  clientType: string;
  legalName: string;
  displayName: string;
  industry: string;
  registrationNo: string;
  website: string;
  email: string;
  phone: string;
  logo: File | null;
  registeredAddress1: string;
  registeredAddress2: string;
  registeredCity: string;
  registeredState: string;
  registeredPin: string;
  registeredCountry: string;
  sameAddress: boolean;
  billingAddress1: string;
  billingAddress2: string;
  billingCity: string;
  billingState: string;
  billingPin: string;
  billingCountry: string;
  contactName: string;
  designation: string;
  contactEmail: string;
  contactPhone: string;
  billingModel: string;
  currency: string;
  paymentTerms: string;
  tax: string;
  poRequired: boolean;
  poNumber: string;
  contractStart: string;
  contractEnd: string;
  annualValue: string;
  responseTime: string;
  resolutionTime: string;
  supportWindow: string;
  uptime: string;
  escalation: string;
  slaDocument: File | null;
  nextReview: string;
  accountManager: string;
  secondaryManager: string;
  portalEnabled: boolean;
  portalUrl: string;
  accessLevel: string;
  timesheetAccess: boolean;
  invoiceAccess: boolean;
  documentAccess: boolean;
  projectTemplate: string;
  defaultStatus: string;
  projectCategory: string;
  allowClientProjects: boolean;
};

const initialData: FormData = {
  clientType: "Enterprise",
  legalName: "",
  displayName: "",
  industry: "Healthcare",
  registrationNo: "",
  website: "",
  email: "",
  phone: "",
  logo: null,
  registeredAddress1: "",
  registeredAddress2: "",
  registeredCity: "",
  registeredState: "",
  registeredPin: "",
  registeredCountry: "India",
  sameAddress: true,
  billingAddress1: "",
  billingAddress2: "",
  billingCity: "",
  billingState: "",
  billingPin: "",
  billingCountry: "India",
  contactName: "",
  designation: "",
  contactEmail: "",
  contactPhone: "",
  billingModel: "Time & Material",
  currency: "INR",
  paymentTerms: "Net 30",
  tax: "18% GST",
  poRequired: true,
  poNumber: "",
  contractStart: "",
  contractEnd: "",
  annualValue: "",
  responseTime: "4 Business Hours",
  resolutionTime: "24 Business Hours",
  supportWindow: "Mon - Sat (09:00 - 18:00)",
  uptime: "99.50%",
  escalation: "Standard",
  slaDocument: null,
  nextReview: "",
  accountManager: "",
  secondaryManager: "",
  portalEnabled: false,
  portalUrl: "",
  accessLevel: "Client Admin",
  timesheetAccess: true,
  invoiceAccess: true,
  documentAccess: true,
  projectTemplate: "Standard Project Template",
  defaultStatus: "Not Started",
  projectCategory: "Implementation",
  allowClientProjects: true,
};

const steps = [
  "Basic Information",
  "Address & Contact",
  "Commercial & SLA",
  "Account Setup",
  "Review & Confirm",
];

export default function CreateClientWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState(false);
  const [clientCode, setClientCode] = useState("");
  const [employeeList, setEmployeeList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const slaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.allSettled([employees(), userRegistry()]).then(([empRes, userRes]) => {
      let list: any[] = [];
      if (empRes.status === "fulfilled" && Array.isArray(empRes.value)) {
        list = [...empRes.value];
      }
      if (userRes.status === "fulfilled" && (userRes.value as any)?.items) {
        if (list.length === 0) {
          list = (userRes.value as any).items.map((u: any) => ({
            _id: u.id || u._id,
            id: u.id || u._id,
            name: u.name,
            displayName: u.name,
            email: u.email,
          }));
        }
      }
      if (list.length === 0) {
        list = [{ id: "admin", _id: "admin", name: "PH PMS Admin", displayName: "PH PMS Admin" }];
      }
      setEmployeeList(list);
      if (list.length > 0 && !data.accountManager) {
        update("accountManager", list[0]._id || list[0].id || list[0].name);
      }
    }).catch((err) => console.warn("Failed to load staff for client wizard:", err));
  }, []);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setData((old) => ({ ...old, [key]: value }));
    setErrors((old) => ({ ...old, [key]: "" }));
    setApiError("");
  }

  function validateStep() {
    const next: Record<string, string> = {};

    if (step === 0) {
      if (!data.legalName.trim()) next.legalName = "Legal name is required";
      if (!data.displayName.trim()) next.displayName = "Display name is required";
      if (!data.email.trim()) next.email = "Email is required";
      if (!data.phone.trim()) next.phone = "Phone is required";
      if (!data.industry) next.industry = "Select an industry";
    }

    if (step === 1) {
      if (!data.registeredAddress1.trim()) next.registeredAddress1 = "Address is required";
      if (!data.registeredCity.trim()) next.registeredCity = "City is required";
      if (!data.registeredState.trim()) next.registeredState = "State is required";
      if (!data.registeredPin.trim()) next.registeredPin = "PIN code is required";
      if (!data.contactName.trim()) next.contactName = "Contact name is required";
      if (!data.contactEmail.trim()) next.contactEmail = "Contact email is required";
    }

    if (step === 2) {
      if (!data.contractStart) next.contractStart = "Start date is required";
      if (!data.contractEnd) next.contractEnd = "End date is required";
      if (!data.annualValue.trim()) next.annualValue = "Contract value is required";
    }

    if (step === 3 && !data.accountManager) {
      next.accountManager = "Select an account manager";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function nextStep() {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, 4));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveDraft() {
    localStorage.setItem("pheos-client-draft", JSON.stringify({
      ...data,
      logo: data.logo?.name ?? null,
      slaDocument: data.slaDocument?.name ?? null,
    }));
    alert("Client draft saved in this browser.");
  }

  async function createClient() {
    if (submitting) return;
    setSubmitting(true);
    setApiError("");
    try {
      const selectedEmp = employeeList.find(
        (e) => (e._id === data.accountManager) ||
               (e.id === data.accountManager) ||
               (e.displayName === data.accountManager) ||
               (e.name === data.accountManager) ||
               (`${e.firstName || ''} ${e.lastName || ''}`.trim() === data.accountManager) ||
               (e.userId?.name === data.accountManager)
      );

      const code = `CLT-${String(Date.now()).slice(-5)}`;
      const payload: any = {
        clientCode: code,
        legalName: data.legalName.trim(),
        displayName: data.displayName.trim() || data.legalName.trim(),
        industry: data.industry || "Healthcare",
        website: data.website || null,
        email: data.email.trim() || null,
        phone: data.phone.trim() || null,
        logo: logoBase64 || null,
        accountManagerId: selectedEmp?._id || selectedEmp?.id || (data.accountManager?.match(/^[0-9a-fA-F]{24}$/) ? data.accountManager : undefined),
        billingModel: data.billingModel || "Time & Material",
        status: "ACTIVE",
        billingAddress: {
          line1: data.billingAddress1 || data.registeredAddress1 || null,
          line2: data.billingAddress2 || data.registeredAddress2 || null,
          city: data.billingCity || data.registeredCity || null,
          state: data.billingState || data.registeredState || null,
          country: data.billingCountry || "India",
          postalCode: data.billingPin || data.registeredPin || null,
        },
        notes: data.contactName ? `Contact: ${data.contactName} (${data.designation}) - ${data.contactEmail}` : null,
      };

      await apiCreateClient(payload);
      setClientCode(code);
      setCreated(true);
    } catch (err: any) {
      setApiError(err.message || "Failed to create client in database.");
    } finally {
      setSubmitting(false);
    }
  }

  function fileName(file: File | null) {
    return file ? file.name : "";
  }

  if (created) {
    return (
      <main className="cw-page">
        <div className="cw-success">
          <div className="cw-success-icon"><Check size={34} /></div>
          <h1>Client Created Successfully!</h1>
          <p>{data.displayName || data.legalName} has been created and is ready to use.</p>
          <div className="cw-success-info">
            <div><small>Client Code</small><b>{clientCode}</b></div>
            <div><small>Display Name</small><b>{data.displayName}</b></div>
            <div><small>Account Manager</small><b>{data.accountManager}</b></div>
            <div><small>Status</small><span className="cw-badge success">Active</span></div>
          </div>
          <div className="cw-next-box">
            <h3>What's Next?</h3>
            <div><span>Add more contacts for this client</span><button onClick={() => router.push("/clients")}>Add Contacts</button></div>
            <div><span>Create the first project</span><button onClick={() => router.push("/projects")}>Create Project</button></div>
            <div><span>Upload important documents</span><button onClick={() => router.push(`/clients/${clientCode}/documents`)}>Upload Documents</button></div>
            <div><span>Manage permissions</span><button onClick={() => router.push(`/clients/${clientCode}/permissions`)}>Manage Permissions</button></div>
          </div>
          <div className="cw-success-actions">
            <button className="cw-secondary" onClick={() => router.push(`/clients/${clientCode}`)}>Go to Client Details</button>
            <button className="cw-primary" onClick={() => router.push("/clients")}>Go to Client List</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="cw-page">
      <header className="cw-heading">
        <div>
          <div className="cw-breadcrumb"><span>Client Management</span><span>›</span><b>Create Client</b></div>
          <h1>Create Client</h1>
          <p>Register a new client/organization in the system.</p>
        </div>
        <div className="cw-heading-code">New Client</div>
      </header>

      <div className="cw-stepper">
        {steps.map((label, index) => (
          <button
            key={label}
            className={`cw-step ${index === step ? "active" : ""} ${index < step ? "completed" : ""}`}
            onClick={() => index < step && setStep(index)}
            disabled={index > step}
          >
            <span className="cw-step-number">{index < step ? <Check size={13} /> : index + 1}</span>
            <span>{label}</span>
            {index !== steps.length - 1 && <i />}
          </button>
        ))}
      </div>

      {apiError && (
        <div style={{ padding: "12px 16px", background: "#fee2e2", color: "#991b1b", borderRadius: 8, marginBottom: 16 }}>
          {apiError}
        </div>
      )}

      <section className="cw-panel">
        <div className="cw-panel-title">
          <div>
            <span className="cw-section-number">{step + 1}</span>
            <div><h2>{steps[step]}</h2><p>{step === 4 ? "Review all information before creating this client." : "Enter the required information to continue."}</p></div>
          </div>
          <span className="cw-step-count">Step {step + 1} of 5</span>
        </div>

        {step === 0 && (
          <div className="cw-basic-grid">
            <div className="cw-logo-upload">
              <label>Client Logo</label>
              <button type="button" className="cw-logo-drop" onClick={() => logoRef.current?.click()}>
                {logoBase64 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <img src={logoBase64} alt="Client Logo" style={{ maxHeight: 60, maxWidth: 140, objectFit: "contain", borderRadius: 6 }} />
                    <span className="cw-uploaded-logo">{data.logo?.name || "Logo uploaded"}</span>
                    <small style={{ color: "#2563eb", textDecoration: "underline" }}>Click to replace</small>
                  </div>
                ) : (
                  <>
                    <UploadCloud size={27} />
                    <b>Drag & drop logo here</b>
                    <span>or Browse</span>
                    <small>JPG, PNG up to 2MB</small>
                  </>
                )}
              </button>
              <input
                ref={logoRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  update("logo", file);
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      setLogoBase64(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  } else {
                    setLogoBase64(null);
                  }
                }}
              />
              <small>This logo will be displayed across client registry, overview, and reports.</small>
            </div>
            <div className="cw-fields-grid">
              <Field label="Client Type" required><select value={data.clientType} onChange={(e) => update("clientType", e.target.value)}><option>Enterprise</option><option>SME</option><option>SMB</option><option>Government</option><option>Startup</option></select></Field>
              <Field label="Legal Name" required error={errors.legalName}><input value={data.legalName} onChange={(e) => update("legalName", e.target.value)} placeholder="Enter registered legal name" /></Field>
              <Field label="Trading / Display Name" required error={errors.displayName}><input value={data.displayName} onChange={(e) => update("displayName", e.target.value)} placeholder="Enter display name" /></Field>
              <Field label="Industry" required error={errors.industry}><select value={data.industry} onChange={(e) => update("industry", e.target.value)}><option>Healthcare</option><option>Education</option><option>IT Services</option><option>Finance</option><option>Manufacturing</option><option>Retail</option><option>Other</option></select></Field>
              <Field label="Business Registration Number / CIN"><input value={data.registrationNo} onChange={(e) => update("registrationNo", e.target.value)} placeholder="Enter registration number" /></Field>
              <Field label="Website"><input value={data.website} onChange={(e) => update("website", e.target.value)} placeholder="https://www.example.com" /></Field>
              <Field label="Email" required error={errors.email}><input type="email" value={data.email} onChange={(e) => update("email", e.target.value)} placeholder="info@example.com" /></Field>
              <Field label="Phone" required error={errors.phone}><input value={data.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91 98765 43210" /></Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="cw-two-column">
            <div className="cw-subpanel">
              <h3><MapPin size={15} /> Registered Address</h3>
              <div className="cw-fields-grid">
                <Field label="Address Line 1" required error={errors.registeredAddress1}><input value={data.registeredAddress1} onChange={(e) => update("registeredAddress1", e.target.value)} placeholder="Street / Building" /></Field>
                <Field label="Address Line 2"><input value={data.registeredAddress2} onChange={(e) => update("registeredAddress2", e.target.value)} placeholder="Area / Landmark" /></Field>
                <Field label="City" required error={errors.registeredCity}><input value={data.registeredCity} onChange={(e) => update("registeredCity", e.target.value)} placeholder="City" /></Field>
                <Field label="State" required error={errors.registeredState}><input value={data.registeredState} onChange={(e) => update("registeredState", e.target.value)} placeholder="State" /></Field>
                <Field label="PIN / ZIP Code" required error={errors.registeredPin}><input value={data.registeredPin} onChange={(e) => update("registeredPin", e.target.value)} placeholder="PIN code" /></Field>
                <Field label="Country"><select value={data.registeredCountry} onChange={(e) => update("registeredCountry", e.target.value)}><option>India</option><option>United States</option><option>United Kingdom</option><option>Singapore</option></select></Field>
              </div>
            </div>
            <div className="cw-subpanel">
              <h3><MapPin size={15} /> Billing Address</h3>
              <label className="cw-checkbox"><input type="checkbox" checked={data.sameAddress} onChange={(e) => update("sameAddress", e.target.checked)} /> Same as Registered Address</label>
              {!data.sameAddress && <div className="cw-fields-grid">
                <Field label="Address Line 1"><input value={data.billingAddress1} onChange={(e) => update("billingAddress1", e.target.value)} /></Field>
                <Field label="Address Line 2"><input value={data.billingAddress2} onChange={(e) => update("billingAddress2", e.target.value)} /></Field>
                <Field label="City"><input value={data.billingCity} onChange={(e) => update("billingCity", e.target.value)} /></Field>
                <Field label="State"><input value={data.billingState} onChange={(e) => update("billingState", e.target.value)} /></Field>
                <Field label="PIN / ZIP Code"><input value={data.billingPin} onChange={(e) => update("billingPin", e.target.value)} /></Field>
                <Field label="Country"><select value={data.billingCountry} onChange={(e) => update("billingCountry", e.target.value)}><option>India</option><option>United States</option><option>United Kingdom</option></select></Field>
              </div>}
              <h3 className="cw-contact-heading"><UserRound size={15} /> Primary Contact</h3>
              <div className="cw-fields-grid">
                <Field label="Name" required error={errors.contactName}><input value={data.contactName} onChange={(e) => update("contactName", e.target.value)} placeholder="Contact person" /></Field>
                <Field label="Designation"><input value={data.designation} onChange={(e) => update("designation", e.target.value)} placeholder="Designation" /></Field>
                <Field label="Email" required error={errors.contactEmail}><input type="email" value={data.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} placeholder="contact@example.com" /></Field>
                <Field label="Phone"><input value={data.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} placeholder="+91 ..." /></Field>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="cw-two-column">
            <div className="cw-subpanel">
              <h3><Building2 size={15} /> Commercial Details</h3>
              <div className="cw-fields-grid">
                <Field label="Billing Model" required><select value={data.billingModel} onChange={(e) => update("billingModel", e.target.value)}><option>Time & Material</option><option>Fixed Price</option><option>Milestone Based</option><option>Retainer</option></select></Field>
                <Field label="Currency" required><select value={data.currency} onChange={(e) => update("currency", e.target.value)}><option>INR</option><option>USD</option><option>GBP</option><option>EUR</option></select></Field>
                <Field label="Payment Terms"><select value={data.paymentTerms} onChange={(e) => update("paymentTerms", e.target.value)}><option>Net 15</option><option>Net 30</option><option>Net 45</option><option>Net 60</option></select></Field>
                <Field label="Tax Applicability"><select value={data.tax} onChange={(e) => update("tax", e.target.value)}><option>18% GST</option><option>12% GST</option><option>5% GST</option><option>Exempt</option></select></Field>
                <Field label="PO / Contract Number"><input value={data.poNumber} onChange={(e) => update("poNumber", e.target.value)} placeholder="PO-SRC-0005-0012" /></Field>
                <Field label="Annual Contract Value" required error={errors.annualValue}><input type="number" min="0" value={data.annualValue} onChange={(e) => update("annualValue", e.target.value)} placeholder="₹ 24,00,000" /></Field>
                <Field label="Contract Start Date" required error={errors.contractStart}><input type="date" value={data.contractStart} onChange={(e) => update("contractStart", e.target.value)} /></Field>
                <Field label="Contract End Date" required error={errors.contractEnd}><input type="date" value={data.contractEnd} onChange={(e) => update("contractEnd", e.target.value)} /></Field>
              </div>
              <label className="cw-checkbox cw-switch-row"><input type="checkbox" checked={data.poRequired} onChange={(e) => update("poRequired", e.target.checked)} /> PO / Contract Required</label>
            </div>
            <div className="cw-subpanel">
              <h3><ShieldCheck size={15} /> SLA Details</h3>
              <div className="cw-fields-grid">
                <Field label="Response Time"><select value={data.responseTime} onChange={(e) => update("responseTime", e.target.value)}><option>30 Minutes</option><option>1 Business Hour</option><option>4 Business Hours</option><option>8 Business Hours</option></select></Field>
                <Field label="Resolution Number"><select value={data.resolutionTime} onChange={(e) => update("resolutionTime", e.target.value)}><option>4 Business Hours</option><option>24 Business Hours</option><option>48 Business Hours</option><option>72 Business Hours</option></select></Field>
                <Field label="Support Window"><select value={data.supportWindow} onChange={(e) => update("supportWindow", e.target.value)}><option>Mon - Sat (09:00 - 18:00)</option><option>24×7</option><option>Mon - Fri (09:00 - 18:00)</option></select></Field>
                <Field label="Uptime Commitment"><select value={data.uptime} onChange={(e) => update("uptime", e.target.value)}><option>99.00%</option><option>99.50%</option><option>99.90%</option><option>99.99%</option></select></Field>
                <Field label="Escalation Matrix"><select value={data.escalation} onChange={(e) => update("escalation", e.target.value)}><option>Standard</option><option>Priority</option><option>Enterprise</option></select></Field>
                <Field label="Next Review Date"><input type="date" value={data.nextReview} onChange={(e) => update("nextReview", e.target.value)} /></Field>
              </div>
              <div className="cw-file-row">
                <div><FileText size={18} /><span><b>{fileName(data.slaDocument) || "SLA Document"}</b><small>{data.slaDocument ? `${(data.slaDocument.size / 1024).toFixed(0)} KB` : "Upload signed SLA document (PDF)"}</small></span></div>
                <input ref={slaRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={(e) => update("slaDocument", e.target.files?.[0] ?? null)} />
                <button type="button" className="cw-secondary small" onClick={() => slaRef.current?.click()}><UploadCloud size={14} /> Upload</button>
                {data.slaDocument && <button type="button" className="cw-remove-file" onClick={() => update("slaDocument", null)}><X size={14} /></button>}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="cw-two-column">
            <div className="cw-subpanel">
              <h3><UserRound size={15} /> Account Setup</h3>
              <div className="cw-fields-grid">
                <Field label="Account Manager" required error={errors.accountManager}>
                  <select value={data.accountManager} onChange={(e) => update("accountManager", e.target.value)}>
                    <option value="">Select Account Manager</option>
                    {employeeList.map((emp) => {
                      const name = emp.displayName || emp.name || emp.userId?.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || "Staff Member";
                      const empId = emp._id || emp.id;
                      const codeStr = emp.employeeCode ? ` (${emp.employeeCode})` : "";
                      return <option key={empId} value={empId}>{name}{codeStr}</option>;
                    })}
                  </select>
                </Field>
                <Field label="Secondary Account Manager">
                  <select value={data.secondaryManager} onChange={(e) => update("secondaryManager", e.target.value)}>
                    <option value="">Select Secondary Manager</option>
                    {employeeList.map((emp) => {
                      const name = emp.displayName || emp.name || emp.userId?.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || "Staff Member";
                      const empId = emp._id || emp.id;
                      const codeStr = emp.employeeCode ? ` (${emp.employeeCode})` : "";
                      return <option key={empId} value={empId}>{name}{codeStr}</option>;
                    })}
                  </select>
                </Field>
                <Field label="Default Project Template"><select value={data.projectTemplate} onChange={(e) => update("projectTemplate", e.target.value)}><option>Standard Project Template</option><option>Agile Project Template</option><option>Enterprise Delivery Template</option></select></Field>
                <Field label="Default Task Status"><select value={data.defaultStatus} onChange={(e) => update("defaultStatus", e.target.value)}><option>Not Started</option><option>To Do</option><option>Backlog</option></select></Field>
                <Field label="Default Project Category"><select value={data.projectCategory} onChange={(e) => update("projectCategory", e.target.value)}><option>Implementation</option><option>Development</option><option>Support</option><option>Consulting</option></select></Field>
              </div>
              <label className="cw-checkbox"><input type="checkbox" checked={data.allowClientProjects} onChange={(e) => update("allowClientProjects", e.target.checked)} /> Allow Client to Create Projects</label>
            </div>
            <div className="cw-subpanel">
              <h3><Globe size={15} /> Client Portal Access</h3>
              <label className="cw-switch-row"><span><b>Enable Client Portal</b><small>Allow client users to access the portal</small></span><input type="checkbox" checked={data.portalEnabled} onChange={(e) => update("portalEnabled", e.target.checked)} /></label>
              <Field label="Portal URL"><input value={data.portalUrl} onChange={(e) => update("portalUrl", e.target.value)} /></Field>
              <Field label="Default Access Level"><select value={data.accessLevel} onChange={(e) => update("accessLevel", e.target.value)}><option>Client Admin</option><option>Project Manager</option><option>Viewer</option></select></Field>
              <div className="cw-access-list">
                <label><input type="checkbox" checked={data.timesheetAccess} onChange={(e) => update("timesheetAccess", e.target.checked)} /> Allow Time Sheet Access</label>
                <label><input type="checkbox" checked={data.invoiceAccess} onChange={(e) => update("invoiceAccess", e.target.checked)} /> Allow Invoice Access</label>
                <label><input type="checkbox" checked={data.documentAccess} onChange={(e) => update("documentAccess", e.target.checked)} /> Allow Document Access</label>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="cw-review">
            <div className="cw-review-card">
              <div className="cw-review-heading"><h3><Building2 size={15} /> Basic Information</h3><button onClick={() => setStep(0)}>Edit</button></div>
              <div className="cw-review-client">
                <span className="cw-review-logo" style={{ display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {logoBase64 ? (
                    <img src={logoBase64} alt="Client Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  ) : (
                    <Building2 />
                  )}
                </span>
                <div><b>{data.displayName || "Client Display Name"}</b><small>{data.legalName || "Legal name not entered"}</small></div>
              </div>
              <ReviewRow label="Client Type" value={data.clientType} /><ReviewRow label="Industry" value={data.industry} /><ReviewRow label="Registration No." value={data.registrationNo || "-"} /><ReviewRow label="Website" value={data.website || "-"} /><ReviewRow label="Email" value={data.email} /><ReviewRow label="Phone" value={data.phone} />
            </div>
            <div className="cw-review-card">
              <div className="cw-review-heading"><h3><MapPin size={15} /> Address & Contact</h3><button onClick={() => setStep(1)}>Edit</button></div>
              <b className="cw-review-subtitle">Registered Address</b>
              <p>{data.registeredAddress1}, {data.registeredAddress2}, {data.registeredCity}, {data.registeredState} - {data.registeredPin}, {data.registeredCountry}</p>
              <b className="cw-review-subtitle">Billing Address</b>
              <p>{data.sameAddress ? "Same as registered address" : `${data.billingAddress1}, ${data.billingCity}, ${data.billingState} - ${data.billingPin}`}</p>
              <ReviewRow label="Primary Contact" value={data.contactName} /><ReviewRow label="Designation" value={data.designation || "-"} /><ReviewRow label="Contact Email" value={data.contactEmail} /><ReviewRow label="Contact Phone" value={data.contactPhone || "-"} />
            </div>
            <div className="cw-review-card">
              <div className="cw-review-heading"><h3><ShieldCheck size={15} /> Commercial & SLA</h3><button onClick={() => setStep(2)}>Edit</button></div>
              <ReviewRow label="Billing Model" value={data.billingModel} /><ReviewRow label="Payment Terms" value={data.paymentTerms} /><ReviewRow label="Contract Value" value={`${data.currency} ${data.annualValue}`} /><ReviewRow label="Contract Period" value={`${data.contractStart} to ${data.contractEnd}`} /><ReviewRow label="Response Time" value={data.responseTime} /><ReviewRow label="Resolution Time" value={data.resolutionTime} /><ReviewRow label="Uptime" value={data.uptime} />
            </div>
            <div className="cw-review-card">
              <div className="cw-review-heading"><h3><UserRound size={15} /> Account Setup</h3><button onClick={() => setStep(3)}>Edit</button></div>
              <ReviewRow label="Account Manager" value={employeeList.find((e) => (e._id === data.accountManager || e.id === data.accountManager))?.userId?.name || data.accountManager} /><ReviewRow label="Secondary Manager" value={data.secondaryManager} /><ReviewRow label="Client Portal" value={data.portalEnabled ? "Enabled" : "Disabled"} /><ReviewRow label="Access Level" value={data.accessLevel} /><ReviewRow label="Project Template" value={data.projectTemplate} /><ReviewRow label="Default Status" value={data.defaultStatus} />
            </div>
          </div>
        )}

        <div className="cw-footer">
          <button className="cw-secondary" onClick={saveDraft}><Save size={14} /> Save & Exit</button>
          <div>
            {step > 0 && <button className="cw-secondary" onClick={() => setStep(step - 1)}><ArrowLeft size={14} /> Back</button>}
            {step < 4 ? (
              <button className="cw-primary" onClick={nextStep}>Next <ArrowRight size={14} /></button>
            ) : (
              <button className="cw-primary success" onClick={createClient}><CheckCircle2 size={15} /> Create Client</button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return <label className={`cw-field ${error ? "has-error" : ""}`}><span>{label}{required && <i> *</i>}</span>{children}{error && <small>{error}</small>}</label>;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <div className="cw-review-row"><span>{label}</span><b>{value || "-"}</b></div>;
}
