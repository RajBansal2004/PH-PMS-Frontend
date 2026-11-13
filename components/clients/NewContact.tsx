
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  CloudUpload,
  FileText,
  ShieldCheck,
  UserRound,
  X,
  Download,
} from "lucide-react";

import "./new-contact.css";

type ContactForm = {
  firstName: string;
  lastName: string;
  displayName: string;
  gender: string;
  dob: string;
  bio: string;
  designation: string;
  department: string;
  reportsTo: string;
  role: string;
  accessLevel: string;
  primary: boolean;
  canApprove: boolean;
  email: string;
  mobile: string;
  officePhone: string;
  alternatePhone: string;
  location: string;
  address: string;
  timezone: string;
  communication: string[];
  language: string;
  bestTime: string;
};

const initialForm: ContactForm = {
  firstName: "",
  lastName: "",
  displayName: "",
  gender: "Male",
  dob: "",
  bio: "",
  designation: "",
  department: "Projects",
  reportsTo: "",
  role: "Team Member",
  accessLevel: "Standard Access",
  primary: false,
  canApprove: false,
  email: "",
  mobile: "",
  officePhone: "",
  alternatePhone: "",
  location: "",
  address: "",
  timezone: "Asia/Kolkata (IST)",
  communication: ["Email"],
  language: "English",
  bestTime: "10:00 AM - 06:00 PM",
};

const steps = [
  "Basic Information",
  "Role & Department",
  "Contact Details",
  "Review & Save",
];

const departments = [
  "Leadership",
  "Finance",
  "IT",
  "Procurement",
  "Projects",
  "Operations",
  "QA",
  "HR",
  "Support",
];

export default function NewContact() {
  const [form, setForm] = useState<ContactForm>(initialForm);
  const [currentStep, setCurrentStep] = useState(1);
  const [photo, setPhoto] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof ContactForm>(
    key: K,
    value: ContactForm[K]
  ) {
    setForm((old) => {
      const next = { ...old, [key]: value };

      if (key === "firstName" || key === "lastName") {
        next.displayName =
          `${next.firstName} ${next.lastName}`.trim();
      }

      return next;
    });
  }

  function toggleCommunication(value: string) {
    setForm((old) => ({
      ...old,
      communication: old.communication.includes(value)
        ? old.communication.filter((item) => item !== value)
        : [...old.communication, value],
    }));
  }

  function handlePhoto(file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Profile photo must be smaller than 2 MB.");
      return;
    }

    setPhoto(file.name);
    setPhotoPreview(URL.createObjectURL(file));
    setError("");
  }

  function validateStep() {
    setError("");

    if (currentStep === 1) {
      if (!form.firstName.trim()) {
        setError("Please enter First Name.");
        return false;
      }

      if (!form.lastName.trim()) {
        setError("Please enter Last Name.");
        return false;
      }
    }

    if (currentStep === 2) {
      if (!form.designation.trim()) {
        setError("Please enter Designation.");
        return false;
      }

      if (!form.department.trim()) {
        setError("Please select Department.");
        return false;
      }
    }

    if (currentStep === 3) {
      if (!form.email.trim()) {
        setError("Please enter Email Address.");
        return false;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        setError("Please enter a valid Email Address.");
        return false;
      }

      if (!form.mobile.trim()) {
        setError("Please enter Mobile Number.");
        return false;
      }

      if (!form.location.trim()) {
        setError("Please enter Location.");
        return false;
      }

      if (!form.communication.length) {
        setError("Select at least one communication method.");
        return false;
      }
    }

    return true;
  }

  function handleNext() {
    if (!validateStep()) return;

    setCurrentStep((step) => Math.min(step + 1, 4));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    setError("");
    setCurrentStep((step) => Math.max(step - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveContact() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Please complete the required contact information.");
      setCurrentStep(1);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      setCurrentStep(3);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const existing = JSON.parse(
        localStorage.getItem("pms-client-contacts") || "[]"
      );

      const contact = {
        ...form,
        photo,
        id: `CNT-${String(existing.length + 1).padStart(3, "0")}`,
        clientCode: "CLT-004",
        status: "Active",
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(
        "pms-client-contacts",
        JSON.stringify([...existing, contact])
      );

      setSaved(true);
    } catch {
      setError("Unable to save contact. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setForm(initialForm);
    setCurrentStep(1);
    setPhoto("");
    setPhotoPreview("");
    setError("");
    setSaved(false);
  }

  if (saved) {
    return (
      <main className="nc-page">
        <div className="nc-success">
          <div className="nc-success-icon">
            <CheckCircle2 size={38} />
          </div>

          <h1>Contact Created Successfully!</h1>
          <p>
            {form.displayName} has been added to Apollo Hospitals.
          </p>

          <div className="nc-success-details">
            <div>
              <small>Contact Name</small>
              <b>{form.displayName}</b>
            </div>
            <div>
              <small>Designation</small>
              <b>{form.designation}</b>
            </div>
            <div>
              <small>Email</small>
              <b>{form.email}</b>
            </div>
            <div>
              <small>Status</small>
              <span className="nc-badge green">Active</span>
            </div>
          </div>

          <div className="nc-success-actions">
            <button className="nc-btn secondary" onClick={resetForm}>
              Add Another Contact
            </button>
            <Link className="nc-btn primary" href="/clients/contacts">
              Go to Contact List
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="nc-page">
      {/* PAGE HEADER */}

      <header className="nc-page-header">
        <div>
          <div className="nc-breadcrumb">
            <Link href="/clients/contacts">
              <ArrowLeft size={13} />
              Client Contacts
            </Link>
            <span>/</span>
            <b>Add New Contact</b>
          </div>

          <h1>
            Add New Contact <span>CLT-004</span>
          </h1>

          <p>Add a new contact person to Apollo Hospitals.</p>
        </div>

        <Link href="/clients/contacts" className="nc-btn secondary">
          Cancel
        </Link>
      </header>

      {/* TOP WIZARD - ONLY ONE STEP AT A TIME */}

      <section className="nc-wizard">
        <div className="nc-wizard-progress">
          <div className="nc-progress-heading">
            <div>
              <h2>{steps[currentStep - 1]}</h2>
              <p>Complete the information for this step.</p>
            </div>

            <span className="nc-progress-count">
              Step {currentStep} of 4
            </span>
          </div>

          <div className="nc-progress-track">
            <div
              className="nc-progress-fill"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>

          <div className="nc-wizard-steps">
            {steps.map((label, index) => {
              const number = index + 1;

              return (
                <button
                  type="button"
                  key={label}
                  disabled={number > currentStep}
                  onClick={() => {
                    if (number < currentStep) {
                      setCurrentStep(number);
                      setError("");
                    }
                  }}
                  className={[
                    "nc-wizard-step",
                    currentStep === number ? "active" : "",
                    currentStep > number ? "done" : "",
                  ].join(" ")}
                >
                  <i>
                    {currentStep > number ? (
                      <Check size={13} />
                    ) : (
                      number
                    )}
                  </i>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 1 */}

        {currentStep === 1 && (
          <article className="nc-card nc-step-card">
            <PanelTitle number="1" title="Basic Information" />

            <div className="nc-basic-grid">
              <Field label="First Name *">
                <input
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  placeholder="Enter first name"
                />
              </Field>

              <div className="nc-photo-field">
                <label>Profile Photo</label>
                <label className="nc-photo-upload">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile preview" />
                  ) : (
                    <UserRound size={28} />
                  )}
                  <span>{photo ? "Change" : "Upload"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhoto(e.target.files?.[0])}
                  />
                </label>
              </div>

              <Field label="Last Name *">
                <input
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  placeholder="Enter last name"
                />
              </Field>

              <Field label="Display Name">
                <input
                  value={form.displayName}
                  onChange={(e) => update("displayName", e.target.value)}
                  placeholder="Display name"
                />
              </Field>

              <Field label="Gender">
                <select
                  value={form.gender}
                  onChange={(e) => update("gender", e.target.value)}
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </Field>

              <Field label="Date of Birth">
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => update("dob", e.target.value)}
                />
              </Field>

              <Field label="About / Bio" wide>
                <textarea
                  value={form.bio}
                  onChange={(e) => update("bio", e.target.value)}
                  placeholder="Write a short description..."
                />
              </Field>
            </div>
          </article>
        )}

        {/* STEP 2 */}

        {currentStep === 2 && (
          <article className="nc-card nc-step-card">
            <PanelTitle number="2" title="Contact Role & Department" />

            <div className="nc-fields">
              <Field label="Designation *">
                <input
                  value={form.designation}
                  onChange={(e) => update("designation", e.target.value)}
                  placeholder="e.g. Project Manager"
                />
              </Field>

              <Field label="Department *">
                <select
                  value={form.department}
                  onChange={(e) => update("department", e.target.value)}
                >
                  {departments.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>

              <Field label="Reports To">
                <select
                  value={form.reportsTo}
                  onChange={(e) => update("reportsTo", e.target.value)}
                >
                  <option value="">Select reporting person</option>
                  <option>Anil Kumar (CFO)</option>
                  <option>Rahul Verma</option>
                  <option>Mayank Swaroop</option>
                </select>
              </Field>

              <Field label="Role in Organization">
                <select
                  value={form.role}
                  onChange={(e) => update("role", e.target.value)}
                >
                  <option>Team Member</option>
                  <option>Department Head</option>
                  <option>Billing & Accounts</option>
                  <option>Project Lead</option>
                  <option>Client Admin</option>
                </select>
              </Field>

              <Field label="Access Level">
                <select
                  value={form.accessLevel}
                  onChange={(e) => update("accessLevel", e.target.value)}
                >
                  <option>Standard Access</option>
                  <option>Client Admin</option>
                  <option>Read Only</option>
                  <option>Restricted Access</option>
                </select>
              </Field>

              <label className="nc-toggle-row">
                <span>Primary Contact</span>
                <input
                  type="checkbox"
                  checked={form.primary}
                  onChange={(e) => update("primary", e.target.checked)}
                />
              </label>

              <label className="nc-toggle-row">
                <span>Can Approve</span>
                <input
                  type="checkbox"
                  checked={form.canApprove}
                  onChange={(e) => update("canApprove", e.target.checked)}
                />
              </label>
            </div>
          </article>
        )}

        {/* STEP 3 */}

        {currentStep === 3 && (
          <article className="nc-card nc-step-card">
            <PanelTitle number="3" title="Contact Details" />

            <div className="nc-fields two">
              <Field label="Email *">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="name@company.com"
                />
              </Field>

              <Field label="Location *">
                <input
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="City, State, Country"
                />
              </Field>

              <Field label="Phone (Mobile) *">
                <input
                  value={form.mobile}
                  onChange={(e) => update("mobile", e.target.value)}
                  placeholder="+91 9876543210"
                />
              </Field>

              <Field label="Address">
                <textarea
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="Enter full address"
                />
              </Field>

              <Field label="Phone (Office)">
                <input
                  value={form.officePhone}
                  onChange={(e) => update("officePhone", e.target.value)}
                  placeholder="+91 40 2306 7000"
                />
              </Field>

              <Field label="Time Zone">
                <select
                  value={form.timezone}
                  onChange={(e) => update("timezone", e.target.value)}
                >
                  <option>Asia/Kolkata (IST)</option>
                  <option>Asia/Dubai</option>
                  <option>Europe/London</option>
                  <option>America/New_York</option>
                </select>
              </Field>

              <Field label="Alternate Phone">
                <input
                  value={form.alternatePhone}
                  onChange={(e) => update("alternatePhone", e.target.value)}
                  placeholder="Enter alternate phone"
                />
              </Field>

              <Field label="Language">
                <select
                  value={form.language}
                  onChange={(e) => update("language", e.target.value)}
                >
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Telugu</option>
                </select>
              </Field>

              <div className="nc-communication">
                <label>Preferred Communication *</label>
                <div>
                  {["Email", "Phone", "WhatsApp"].map((item) => (
                    <label key={item}>
                      <input
                        type="checkbox"
                        checked={form.communication.includes(item)}
                        onChange={() => toggleCommunication(item)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>

              <Field label="Best Time to Contact">
                <select
                  value={form.bestTime}
                  onChange={(e) => update("bestTime", e.target.value)}
                >
                  <option>10:00 AM - 06:00 PM</option>
                  <option>09:00 AM - 05:00 PM</option>
                  <option>11:00 AM - 07:00 PM</option>
                </select>
              </Field>
            </div>
          </article>
        )}

        {/* STEP 4 */}

        {currentStep === 4 && (
          <article className="nc-card nc-step-card">
            <PanelTitle number="4" title="Review & Save" />

            <div className="nc-review">
              <div className="nc-review-person">
                <div className="nc-review-avatar">
                  {form.firstName[0] || "?"}
                  {form.lastName[0] || "?"}
                </div>

                <div>
                  <b>{form.displayName || "Contact Name"}</b>
                  <span>{form.designation || "Designation"}</span>
                  <span>{form.department}</span>
                  <span className="nc-badge green">Active</span>
                </div>
              </div>

              <div className="nc-review-data">
                <Review label="First Name" value={form.firstName} />
                <Review label="Last Name" value={form.lastName} />
                <Review label="Gender" value={form.gender} />
                <Review label="Date of Birth" value={form.dob} />
                <Review label="Designation" value={form.designation} />
                <Review label="Department" value={form.department} />
                <Review label="Role" value={form.role} />
                <Review label="Reports To" value={form.reportsTo} />
                <Review label="Access Level" value={form.accessLevel} />
                <Review label="Email" value={form.email} />
                <Review label="Mobile" value={form.mobile} />
                <Review label="Office Phone" value={form.officePhone} />
                <Review label="Alternate Phone" value={form.alternatePhone} />
                <Review label="Location" value={form.location} />
                <Review label="Address" value={form.address} />
                <Review label="Timezone" value={form.timezone} />
                <Review label="Language" value={form.language} />
                <Review
                  label="Preferred Communication"
                  value={form.communication.join(", ")}
                />
                <Review label="Best Time to Contact" value={form.bestTime} />
                <Review
                  label="Primary Contact"
                  value={form.primary ? "Yes" : "No"}
                />
                <Review
                  label="Can Approve"
                  value={form.canApprove ? "Yes" : "No"}
                />
                <Review label="About / Bio" value={form.bio} />
              </div>
            </div>
          </article>
        )}

        {error && (
          <div className="nc-error">
            {error}
            <button type="button" onClick={() => setError("")}>
              <X size={13} />
            </button>
          </div>
        )}

        {/* WIZARD BUTTONS */}

        <div className="nc-wizard-footer">
          <button
            type="button"
            className="nc-btn secondary"
            onClick={() => {
              if (currentStep === 1) {
                window.location.href = "/clients/contacts";
              } else {
                handleBack();
              }
            }}
          >
            {currentStep === 1 ? (
              "Cancel"
            ) : (
              <>
                <ArrowLeft size={13} />
                Back
              </>
            )}
          </button>

          <div className="nc-footer-right">
            <span>Step {currentStep} of 4</span>

            {currentStep < 4 ? (
              <button
                type="button"
                className="nc-btn primary"
                onClick={handleNext}
              >
                Next <ChevronRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                className="nc-btn save"
                disabled={saving}
                onClick={saveContact}
              >
                <Check size={13} />
                {saving ? "Saving..." : "Save Contact"}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* BOTTOM PANELS - ALWAYS VISIBLE ON ALL 4 STEPS */}

      <section className="nc-bottom-grid">
        {/* BULK IMPORT */}

        <article className="nc-card nc-support-card">
          <PanelTitle title="Bulk Import Contacts" />

          <div className="nc-import">
            <label className="nc-drop">
              <CloudUpload size={28} />
              <b>Drag & drop your file here</b>
              <span>or</span>
              <span className="nc-browse">Browse</span>
              <small>Supported formats: CSV, XLSX</small>
              <input type="file" accept=".csv,.xlsx,.xls" />
            </label>

            <div className="nc-instructions">
              <b>Import Instructions</b>
              <ul>
                <li>Maximum file size: 8 MB</li>
                <li>Ensure email and phone columns are correct</li>
                <li>Date format: DD/MM/YYYY</li>
                <li>Duplicate email/phones will be skipped</li>
              </ul>

              <div className="nc-import-summary">
                <b>Import Summary</b>
                <p>Total Records <strong>25</strong></p>
                <p>Valid Records <strong>23</strong></p>
                <p>Invalid Records <strong>2</strong></p>
                <p>Duplicates Found <strong>1</strong></p>
              </div>

              <button type="button" className="nc-btn secondary">
                <Download size={12} />
                Download Sample Template
              </button>
            </div>
          </div>
        </article>

        {/* ACTIVITY TIMELINE */}

        <article className="nc-card nc-support-card">
          <PanelTitle title="Contact Activity Timeline" />

          <Timeline
            title="Contact updated"
            date="10 May 2025, 11:20 AM"
            text="Updated phone number by Rahul Verma"
          />
          <Timeline
            title="Contact created"
            date="10 May 2025, 10:35 AM"
            text="Contact created by Rahul Verma"
          />
          <Timeline
            title="Note added"
            date="09 May 2025, 04:30 PM"
            text="Discussed renewal of SLA and upcoming projects."
          />
          <Timeline
            title="Email sent"
            date="09 May 2025, 03:15 PM"
            text="Sent introductory email and shared company profile."
          />

          <a className="nc-view-link" href="#activity">
            View full activity →
          </a>
        </article>

        {/* CONTACT PERMISSIONS */}

        <article className="nc-card nc-support-card">
          <PanelTitle title="Contact Permissions" />

          <p className="nc-muted">
            Manage what this contact can access in the system.
          </p>

          <div className="nc-permissions-wrap">
            <table className="nc-permissions">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>View</th>
                  <th>Create</th>
                  <th>Edit</th>
                  <th>Delete</th>
                  <th>Approve</th>
                  <th>Export</th>
                </tr>
              </thead>

              <tbody>
                {["Projects", "Tasks", "Documents", "Timesheets", "Finance"].map(
                  (module, index) => (
                    <tr key={module}>
                      <td>{module}</td>
                      {Array.from({ length: 6 }, (_, j) => (
                        <td key={j}>
                          <input
                            type="checkbox"
                            defaultChecked={
                              j === 0 ||
                              (j === 1 && index < 3) ||
                              (j === 2 && index < 3)
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <Field label="Assign Role">
            <select defaultValue="Finance Team Member">
              <option>Finance Team Member</option>
              <option>Project Manager</option>
              <option>Client Admin</option>
            </select>
          </Field>

          <button type="button" className="nc-btn primary nc-wide">
            <ShieldCheck size={12} />
            Save Permissions
          </button>
        </article>

        {/* AUDIT TRAIL */}

        <article className="nc-card nc-support-card">
          <PanelTitle title="Contact Audit Trail" />

          <div className="nc-audit-filters">
            <Field label="Date Range">
              <input type="date" defaultValue="2025-05-01" />
            </Field>

            <Field label="Action">
              <select>
                <option>All Actions</option>
                <option>Created</option>
                <option>Updated</option>
              </select>
            </Field>

            <Field label="Performed By">
              <select>
                <option>All Users</option>
                <option>Rahul Verma</option>
              </select>
            </Field>

            <button type="button" className="nc-btn primary">
              Apply Filters
            </button>
          </div>

          <div className="nc-audit-wrap">
            <table className="nc-audit">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Action</th>
                  <th>Performed By</th>
                  <th>Details</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>10 May 2025, 11:20 AM</td>
                  <td>Contact Updated</td>
                  <td>Rahul Verma</td>
                  <td>Updated phone number</td>
                </tr>
                <tr>
                  <td>10 May 2025, 10:35 AM</td>
                  <td>Contact Created</td>
                  <td>Rahul Verma</td>
                  <td>New contact created</td>
                </tr>
                <tr>
                  <td>09 May 2025, 04:30 PM</td>
                  <td>Note Added</td>
                  <td>Rahul Verma</td>
                  <td>Added note on SLA discussion</td>
                </tr>
                <tr>
                  <td>09 May 2025, 03:15 PM</td>
                  <td>Email Sent</td>
                  <td>Neha Patel</td>
                  <td>Intro email sent</td>
                </tr>
                <tr>
                  <td>08 May 2025, 02:10 PM</td>
                  <td>Document Uploaded</td>
                  <td>Rahul Verma</td>
                  <td>Uploaded NDA document</td>
                </tr>
              </tbody>
            </table>
          </div>

          <a className="nc-view-link" href="#audit">
            View full audit log
          </a>
        </article>
      </section>
    </main>
  );
}

/* REUSABLE COMPONENTS */

function PanelTitle({
  number,
  title,
}: {
  number?: string;
  title: string;
}) {
  return (
    <div className="nc-panel-title">
      <h2>
        {number && <i>{number}</i>}
        {title}
      </h2>
    </div>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`nc-field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Review({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="nc-review-row">
      <b>{label}</b>
      <span>{value || "—"}</span>
    </div>
  );
}

function Timeline({
  title,
  date,
  text,
}: {
  title: string;
  date: string;
  text: string;
}) {
  return (
    <div className="nc-timeline">
      <i />
      <div>
        <small>{date}</small>
        <b>{title}</b>
        <p>{text}</p>
      </div>
    </div>
  );
}
