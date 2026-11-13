
"use client";

import { useMemo, useState } from "react";
import {
  Activity, Bell, Check, ChevronDown, CircleHelp, Clock3, Code2,
  FileText, GitBranch, Link2, LockKeyhole, Plus, Save, Settings2,
  ShieldCheck, Star, Trash2, Users, Workflow, X,
} from "lucide-react";
import "./project-settings.css";

type Tab =
  | "General" | "Team & Access" | "Roles & Permissions" | "Workflow"
  | "Notifications" | "Custom Fields" | "Statuses" | "Priorities"
  | "Milestones" | "Financial Settings" | "Integrations" | "Documents"
  | "Other Settings" | "Audit Log";

type ProjectForm = {
  name: string;
  code: string;
  client: string;
  type: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  manager: string;
  priority: string;
  accountManager: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  visibility: string;
};

const INITIAL_PROJECT: ProjectForm = {
  name: "AI-CMS Implementation",
  code: "PRJ-00075",
  client: "Apollo Hospitals",
  type: "Implementation",
  description:
    "Implementation of AI-CMS platform including configuration, data migration, training and go-live support for Apollo Hospitals across all departments.",
  startDate: "2025-01-01",
  endDate: "2025-06-30",
  status: "In Progress",
  manager: "Rahul Verma",
  priority: "High",
  accountManager: "Amit Kumar",
  timezone: "(GMT+05:30) Asia/Kolkata",
  dateFormat: "DD MMM YYYY",
  timeFormat: "24 Hour",
  currency: "INR - Indian Rupee (₹)",
  visibility: "Private",
};

const TABS: Tab[] = [
  "General", "Team & Access", "Roles & Permissions", "Workflow",
  "Notifications", "Custom Fields", "Statuses", "Priorities",
  "Milestones", "Financial Settings", "Integrations", "Documents",
  "Other Settings", "Audit Log",
];

const INITIAL_MEMBERS = [
  { name: "Rahul Verma", role: "Project Manager", department: "Project Management", access: "Full Access" },
  { name: "Amit Kumar", role: "Tech Lead", department: "Development", access: "Full Access" },
  { name: "Neha Patel", role: "Business Analyst", department: "Business Analysis", access: "Edit" },
  { name: "Pooja Singh", role: "QA Lead", department: "Quality Assurance", access: "Edit" },
  { name: "Vikram Singh", role: "Developer", department: "Development", access: "View" },
];

const INITIAL_ROLES = [
  { name: "Project Manager", description: "Overall project planning and delivery", members: 1 },
  { name: "Tech Lead", description: "Technical planning and code review", members: 1 },
  { name: "Developer", description: "Development and unit testing", members: 2 },
  { name: "QA Engineer", description: "Testing and quality assurance", members: 2 },
  { name: "Business Analyst", description: "Requirement and documentation", members: 1 },
];

const INITIAL_STATUSES = [
  { name: "Not Started", color: "#98a2b3", category: "To Do", isDefault: false },
  { name: "In Progress", color: "#155eef", category: "In Progress", isDefault: true },
  { name: "On Hold", color: "#f79009", category: "In Progress", isDefault: false },
  { name: "Under Review", color: "#875bf7", category: "In Progress", isDefault: false },
  { name: "Completed", color: "#039855", category: "Completed", isDefault: false },
  { name: "Cancelled", color: "#f04438", category: "Closed", isDefault: false },
];

const INITIAL_PRIORITIES = [
  { name: "Critical", color: "#f04438", score: 5, description: "Requires immediate attention" },
  { name: "High", color: "#f97024", score: 4, description: "High priority task or issue" },
  { name: "Medium", color: "#f79009", score: 3, description: "Normal priority" },
  { name: "Low", color: "#039855", score: 2, description: "Low priority" },
  { name: "Minimal", color: "#155eef", score: 1, description: "Very low priority" },
];

const INITIAL_FIELDS = [
  { name: "Client Contact", type: "Text", required: "Yes", visible: "Project Team" },
  { name: "Deployment Type", type: "Dropdown", required: "No", visible: "Project Team" },
  { name: "Go-Live Date", type: "Date", required: "No", visible: "Project Team" },
  { name: "Support Plan", type: "Dropdown", required: "No", visible: "Project Team" },
  { name: "Reference Document", type: "File", required: "No", visible: "Project Team" },
];

const INITIAL_INTEGRATIONS = [
  { name: "Slack", category: "Communication", connected: true },
  { name: "GitHub", category: "Development", connected: true },
  { name: "GitLab", category: "Development", connected: true },
  { name: "Jira", category: "Project tracking", connected: true },
  { name: "Google Drive", category: "Storage", connected: true },
  { name: "Google Calendar", category: "Calendar", connected: true },
  { name: "WhatsApp", category: "Communication", connected: true },
  { name: "Email (SMTP)", category: "Email", connected: true },
];

const INITIAL_AUDIT = [
  ["16 May 2025, 09:15 AM", "Rahul Verma", "Project settings updated", "General", "Updated project description and end date"],
  ["16 May 2025, 09:05 AM", "Amit Kumar", "Member added", "Team & Access", "Added Neha Patel as Business Analyst"],
  ["15 May 2025, 06:20 PM", "Neha Patel", "Workflow updated", "Workflow", "Updated step Testing & QA"],
  ["15 May 2025, 05:40 PM", "Pooja Singh", "Notification settings updated", "Notifications", "Disabled SMS for Timesheet Submitted"],
  ["15 May 2025, 05:10 PM", "Rahul Verma", "Integration connected", "Integrations", "Connected Jira integration"],
];

const INITIAL_NOTIFICATIONS = [
  { event: "Task Assigned", inApp: true, email: true, whatsapp: true, sms: true },
  { event: "Task Due Reminder", inApp: true, email: true, whatsapp: true, sms: true },
  { event: "Milestone Due", inApp: true, email: true, whatsapp: true, sms: false },
  { event: "Issue Created", inApp: true, email: true, whatsapp: true, sms: true },
  { event: "Status Change", inApp: true, email: true, whatsapp: false, sms: false },
  { event: "Timesheet Submitted", inApp: true, email: true, whatsapp: false, sms: false },
  { event: "Invoice Generated", inApp: true, email: false, whatsapp: false, sms: false },
];

const INITIAL_WORKFLOW = [
  { name: "Requirement Gathering", role: "Business Analyst", status: "Completed" },
  { name: "Design & Planning", role: "Tech Lead", status: "Completed" },
  { name: "Development", role: "Developer", status: "In Progress" },
  { name: "Testing & QA", role: "QA Engineer", status: "Pending" },
  { name: "Review & Approval", role: "Project Manager", status: "Pending" },
  { name: "Deployment", role: "DevOps Engineer", status: "Pending" },
];

function Panel({
  title, children, className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`ps-panel ${className}`}><h2>{title}</h2><div className="ps-panel-body">{children}</div></section>;
}

function Field({
  label, required, children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return <label className="ps-field"><span>{label}{required && <b> *</b>}</span>{children}</label>;
}

function Toggle({
  checked, onChange, label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`ps-toggle ${checked ? "on" : ""}`} onClick={() => onChange(!checked)}><i /></button>;
}

function Pill({ children, tone = "blue" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`ps-pill ${tone}`}>{children}</span>;
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className="ps-stat"><span className={`ps-stat-icon ${tone}`}><Check size={15} /></span><div><small>{label}</small><strong>{value}</strong></div></div>;
}

export default function ProjectSettingsPage() {
  const [tab, setTab] = useState<Tab>("General");
  const [project, setProject] = useState(INITIAL_PROJECT);
  const [savedProject, setSavedProject] = useState(INITIAL_PROJECT);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [moreActions, setMoreActions] = useState(false);
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [roles, setRoles] = useState(INITIAL_ROLES);
  const [statuses, setStatuses] = useState(INITIAL_STATUSES);
  const [priorities, setPriorities] = useState(INITIAL_PRIORITIES);
  const [fields, setFields] = useState(INITIAL_FIELDS);
  const [integrations, setIntegrations] = useState(INITIAL_INTEGRATIONS);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [workflow, setWorkflow] = useState(INITIAL_WORKFLOW);
  const [showAddField, setShowAddField] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [showAddStatus, setShowAddStatus] = useState(false);
  const [showAddPriority, setShowAddPriority] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [newFieldType, setNewFieldType] = useState("Text");
  const [newMember, setNewMember] = useState("");
  const [logoText, setLogoText] = useState("AI CMS");
  const [themeColor, setThemeColor] = useState("#155eef");
  const [logoFile, setLogoFile] = useState("");
  const [bannerFile, setBannerFile] = useState("");
  const [financial, setFinancial] = useState({
    budgetType: "Fixed Price", currency: "INR - Indian Rupee (₹)",
    totalBudget: "3640000", billingModel: "Milestone Based",
    taxApplicable: true, taxRate: "18", paymentTerms: "Net 30 Days",
    retainer: "0",
  });
  const [otherSettings, setOtherSettings] = useState({
    allowTimeEntry: true, allowTaskReassignment: true,
    allowExpenseWithoutApproval: false, enableDependency: true,
    allowPrivateTasks: true, enableBaseline: true,
    autoCloseMilestones: false, lockAfterCompletion: false,
    enableBudgetTracking: true, enableTimesheets: true,
    enableExpenses: true, enableBilling: true,
    enableIssueTracking: true, enableChangeRequests: true,
    enableRisks: true, enableFileVersioning: true,
    enableActivityLog: true, archiveAfterCompletion: false,
  });

  const daysLeft = useMemo(() => {
    const end = new Date(`${project.endDate}T00:00:00`);
    if (Number.isNaN(end.getTime())) return "—";
    return Math.ceil((end.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
  }, [project.endDate]);

  function updateProject<K extends keyof ProjectForm>(key: K, value: ProjectForm[K]) {
    setProject((previous) => ({ ...previous, [key]: value }));
    setDirty(true);
  }

  function saveChanges() {
    if (!project.name.trim() || !project.code.trim() || !project.client.trim()) {
      setMessage("Project Name, Project Code and Client are required.");
      setTab("General");
      return;
    }
    if (project.endDate && project.startDate && project.endDate < project.startDate) {
      setMessage("End Date cannot be earlier than Start Date.");
      setTab("General");
      return;
    }
    setSavedProject(project);
    setDirty(false);
    setMessage("Changes saved in this demo view. Connect your project API to persist them.");
  }

  function discardChanges() {
    setProject(savedProject);
    setDirty(false);
    setMessage("Unsaved project information has been reverted.");
  }

  function addSimpleItem(
    kind: "field" | "role" | "status" | "priority",
  ) {
    const value = newValue.trim();
    if (!value) {
      setMessage("Please enter a name first.");
      return;
    }
    if (kind === "field") {
      setFields((prev) => [...prev, { name: value, type: newFieldType, required: "No", visible: "Project Team" }]);
      setShowAddField(false);
    } else if (kind === "role") {
      setRoles((prev) => [...prev, { name: value, description: "New project role", members: 0 }]);
      setShowAddRole(false);
    } else if (kind === "status") {
      setStatuses((prev) => [...prev, { name: value, color: "#155eef", category: "In Progress", isDefault: false }]);
      setShowAddStatus(false);
    } else {
      setPriorities((prev) => [...prev, { name: value, color: "#155eef", score: prev.length + 1, description: "Custom priority" }]);
      setShowAddPriority(false);
    }
    setNewValue("");
    setMessage(`${value} added to the current page state.`);
  }

  function addMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newMember.trim()) {
      setMessage("Enter a member name.");
      return;
    }
    if (members.some((member) => member.name.toLowerCase() === newMember.trim().toLowerCase())) {
      setMessage("This member is already in the list.");
      return;
    }
    setMembers((prev) => [...prev, {
      name: newMember.trim(),
      role: "Developer",
      department: "Development",
      access: "Edit",
    }]);
    setNewMember("");
    setShowAddMember(false);
    setMessage("Member added to the demo view.");
  }

  function exportAudit() {
    const csv = [
      ["Date & Time", "User", "Action", "Section", "Details"],
      ...INITIAL_AUDIT,
    ].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "project-settings-audit.csv";
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Audit log exported.");
  }

  function toggleOther(key: keyof typeof otherSettings) {
    setOtherSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  }

  function removeMember(name: string) {
    setMembers((prev) => prev.filter((member) => member.name !== name));
    setMessage(`${name} removed from the demo view.`);
  }

  return (
    <main className="ps-page">
      <header className="ps-page-header">
        <div className="ps-page-heading">
          <h1>Project Settings</h1>
          <p>Configure project preferences, access, workflows and integrations.</p>
        </div>
        <div className="ps-header-actions">
          <button type="button" className="ps-button primary" onClick={saveChanges}><Save size={13} /> Save Changes{dirty ? " *" : ""}</button>
          <div className="ps-menu-wrap">
            <button type="button" className="ps-button" onClick={() => setMoreActions((v) => !v)}>More Actions <ChevronDown size={12} /></button>
            {moreActions && <div className="ps-dropdown"><button type="button" onClick={() => { discardChanges(); setMoreActions(false); }}>Discard Changes</button><button type="button" onClick={() => { setTab("Audit Log"); setMoreActions(false); }}>View Audit Log</button><button type="button" onClick={() => { window.print(); setMoreActions(false); }}>Print Settings</button></div>}
          </div>
          <button type="button" className="ps-button" onClick={() => setMessage("Connect your project detail route to open this project.")}>View Project</button>
          <button type="button" className="ps-icon-button" aria-label="Help" onClick={() => setMessage("Project Settings help: configure each section using the tabs below.")}><CircleHelp size={17} /></button>
          <button type="button" className="ps-icon-button" aria-label="Activity" onClick={() => setTab("Audit Log")}><Activity size={17} /></button>
        </div>
      </header>

      {message && <div className="ps-message" role="status"><span>{message}</span><button type="button" aria-label="Dismiss message" onClick={() => setMessage("")}><X size={13} /></button></div>}

      <section className="ps-project-banner">
        <div className="ps-project-main">
          <Star size={17} fill="#fdb022" color="#fdb022" />
          <div><h2>{project.name} <Pill tone="blue">{project.status}</Pill></h2><p>{project.description.slice(0, 92)}{project.description.length > 92 ? "…" : ""}</p></div>
        </div>
        <div className="ps-project-code"><small>Project Code</small><strong>{project.code}</strong></div>
        <div className="ps-project-meta">
          <div><small>Client</small><strong>{project.client}</strong></div>
          <div><small>Project Manager</small><strong>{project.manager}</strong></div>
          <div><small>Priority</small><Pill tone={project.priority === "High" || project.priority === "Critical" ? "red" : "orange"}>{project.priority}</Pill></div>
          <div><small>Start Date</small><strong>{project.startDate || "—"}</strong></div>
          <div><small>End Date</small><strong>{project.endDate || "—"}</strong></div>
          <div><small>Days Left</small><strong className={Number(daysLeft) < 0 ? "ps-overdue" : "ps-positive"}>{daysLeft === "—" ? "—" : Number(daysLeft) < 0 ? `${Math.abs(Number(daysLeft))} Days Overdue` : `${daysLeft} Days`}</strong></div>
        </div>
      </section>

      <nav className="ps-tabs" aria-label="Project settings sections">
        {TABS.map((item) => <button type="button" key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}
      </nav>

      {tab === "General" && (
        <>
          <div className="ps-general-grid">
            <Panel title="Project Information">
              <div className="ps-form-grid">
                <Field label="Project Name" required><input value={project.name} onChange={(e) => updateProject("name", e.target.value)} maxLength={120} /></Field>
                <Field label="Project Code" required><input value={project.code} onChange={(e) => updateProject("code", e.target.value.toUpperCase())} maxLength={30} /></Field>
                <Field label="Client" required><select value={project.client} onChange={(e) => updateProject("client", e.target.value)}><option>Apollo Hospitals</option><option>MediLife Clinic</option><option>CarePlus</option><option>HealthFirst</option><option>Other</option></select></Field>
                <Field label="Project Type"><select value={project.type} onChange={(e) => updateProject("type", e.target.value)}><option>Implementation</option><option>Software Development</option><option>Consulting</option><option>Maintenance</option><option>Internal</option></select></Field>
                <div className="ps-full"><Field label="Description"><textarea rows={3} maxLength={1000} value={project.description} onChange={(e) => updateProject("description", e.target.value)} /></Field><small className="ps-counter">{project.description.length}/1000</small></div>
                <Field label="Start Date" required><input type="date" value={project.startDate} onChange={(e) => updateProject("startDate", e.target.value)} /></Field>
                <Field label="End Date" required><input type="date" value={project.endDate} min={project.startDate || undefined} onChange={(e) => updateProject("endDate", e.target.value)} /></Field>
                <Field label="Project Status"><select value={project.status} onChange={(e) => updateProject("status", e.target.value)}><option>Not Started</option><option>In Progress</option><option>On Hold</option><option>Completed</option><option>Cancelled</option></select></Field>
                <Field label="Project Manager" required><select value={project.manager} onChange={(e) => updateProject("manager", e.target.value)}><option>Rahul Verma</option><option>Amit Kumar</option><option>Neha Patel</option><option>Pooja Singh</option></select></Field>
                <Field label="Priority"><select value={project.priority} onChange={(e) => updateProject("priority", e.target.value)}><option>Critical</option><option>High</option><option>Medium</option><option>Low</option><option>Minimal</option></select></Field>
                <Field label="Account Manager"><select value={project.accountManager} onChange={(e) => updateProject("accountManager", e.target.value)}><option>Amit Kumar</option><option>Rahul Verma</option><option>Neha Patel</option><option>Pooja Singh</option></select></Field>
              </div>
            </Panel>

            <Panel title="Project Configuration">
              <div className="ps-config-grid">
                <div className="ps-config-fields">
                  <Field label="Default Timezone"><select value={project.timezone} onChange={(e) => updateProject("timezone", e.target.value)}><option>(GMT+05:30) Asia/Kolkata</option><option>(GMT+00:00) UTC</option><option>(GMT-05:00) America/New_York</option><option>(GMT+08:00) Asia/Singapore</option></select></Field>
                  <Field label="Date Format"><select value={project.dateFormat} onChange={(e) => updateProject("dateFormat", e.target.value)}><option>DD MMM YYYY</option><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></select></Field>
                  <div className="ps-field"><span>Time Format</span><div className="ps-radio-row">{["12 Hour", "24 Hour"].map((value) => <label key={value}><input type="radio" name="timeFormat" checked={project.timeFormat === value} onChange={() => updateProject("timeFormat", value)} />{value}</label>)}</div></div>
                  <Field label="Currency"><select value={project.currency} onChange={(e) => updateProject("currency", e.target.value)}><option>INR - Indian Rupee (₹)</option><option>USD - US Dollar ($)</option><option>EUR - Euro (€)</option><option>SGD - Singapore Dollar (S$)</option><option>GBP - Pound Sterling (£)</option></select></Field>
                  <div className="ps-field"><span>Working Days</span><div className="ps-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => <label key={day}><input type="checkbox" defaultChecked={i < 5} />{day}</label>)}</div></div>
                  <Field label="Project Visibility"><select value={project.visibility} onChange={(e) => updateProject("visibility", e.target.value)}><option>Private</option><option>Team Members</option><option>Organization</option><option>Public</option></select></Field>
                </div>
                <div className="ps-toggle-list">
                  {([
                    ["enableBudgetTracking", "Enable Budget Tracking"],
                    ["enableTimesheets", "Enable Timesheets"],
                    ["enableExpenses", "Enable Expenses"],
                    ["enableBilling", "Enable Billing"],
                    ["enableIssueTracking", "Enable Issue Tracking"],
                    ["enableChangeRequests", "Enable Change Requests"],
                    ["enableRisks", "Enable Risks"],
                    ["enableFileVersioning", "Enable File Versioning"],
                    ["enableActivityLog", "Enable Activity Log"],
                    ["archiveAfterCompletion", "Archive Project After Completion"],
                  ] as [keyof typeof otherSettings, string][]).map(([key, label]) => <div key={key}><span>{label}</span><Toggle label={label} checked={otherSettings[key]} onChange={() => toggleOther(key)} /></div>)}
                </div>
              </div>
            </Panel>

            <Panel title="Project Logo & Branding">
              <Field label="Project Logo"><div className="ps-logo-preview" style={{ color: themeColor }}><strong>{logoText || "AI"}</strong><small>Project logo preview</small><button type="button" aria-label="Clear logo text" onClick={() => setLogoText("")}><X size={11} /></button></div></Field>
              <label className="ps-upload-button"><Plus size={12} /> Upload Logo<input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={(e) => setLogoFile(e.target.files?.[0]?.name ?? "")} /></label>
              <p className="ps-hint">{logoFile ? `Selected: ${logoFile}` : "PNG, JPG or SVG. Max size 2 MB."}</p>
              <Field label="Logo Text"><input value={logoText} onChange={(e) => setLogoText(e.target.value)} maxLength={20} placeholder="Project name" /></Field>
              <div className="ps-field ps-theme-field"><span>Theme Color</span><div className="ps-color-options">{["#155eef", "#039855", "#0e9384", "#f97316", "#875bf7", "#f04438", "#98a2b3"].map((color) => <button key={color} type="button" aria-label={`Set theme color ${color}`} className={themeColor === color ? "selected" : ""} style={{ background: color }} onClick={() => { setThemeColor(color); setDirty(true); }} />)}</div></div>
              <Field label="Project Banner (Optional)"><label className="ps-banner-upload"><Plus size={15} /><span>{bannerFile || "Upload Banner"}</span><small>Recommended size: 1200 × 300 px</small><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setBannerFile(e.target.files?.[0]?.name ?? "")} /></label></Field>
            </Panel>
          </div>

          <div className="ps-middle-grid">
            <Panel title="Team & Access">
              <div className="ps-panel-heading-action"><span>Team Members ({members.length})</span><button type="button" className="ps-button compact" onClick={() => setShowAddMember((v) => !v)}><Plus size={12} /> Add Member</button></div>
              {showAddMember && <form className="ps-inline-form" onSubmit={addMember}><input value={newMember} onChange={(e) => setNewMember(e.target.value)} placeholder="Member full name" maxLength={100} /><button className="ps-button primary compact" type="submit">Add</button></form>}
              <div className="ps-table-scroll"><table className="ps-table"><thead><tr><th>Member</th><th>Role</th><th>Department</th><th>Access Level</th><th>Action</th></tr></thead><tbody>{members.map((member) => <tr key={member.name}><td>{member.name}</td><td>{member.role}</td><td>{member.department}</td><td><select aria-label={`Access for ${member.name}`} value={member.access} onChange={(e) => setMembers((prev) => prev.map((m) => m.name === member.name ? { ...m, access: e.target.value } : m))}><option>Full Access</option><option>Edit</option><option>View</option></select></td><td><button type="button" className="ps-table-action" aria-label={`Remove ${member.name}`} onClick={() => removeMember(member.name)}><X size={12} /></button></td></tr>)}</tbody></table></div>
              <button type="button" className="ps-link-button" onClick={() => setTab("Team & Access")}>View All Members →</button>
            </Panel>

            <Panel title="Roles & Permissions">
              <div className="ps-panel-heading-action"><span>Project Roles</span><button type="button" className="ps-button compact" onClick={() => setShowAddRole((v) => !v)}><Plus size={12} /> Add Role</button></div>
              {showAddRole && <div className="ps-inline-form"><input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Role name" maxLength={60} /><button type="button" className="ps-button primary compact" onClick={() => addSimpleItem("role")}>Add</button></div>}
              <div className="ps-table-scroll"><table className="ps-table"><thead><tr><th>Role Name</th><th>Description</th><th>Members</th></tr></thead><tbody>{roles.map((role) => <tr key={role.name}><td>{role.name}</td><td>{role.description}</td><td>{role.members}</td></tr>)}</tbody></table></div>
              <button type="button" className="ps-link-button" onClick={() => setTab("Roles & Permissions")}>View All Roles →</button>
            </Panel>

            <Panel title="Workflow">
              <div className="ps-panel-heading-action"><span>Project Workflow</span><button type="button" className="ps-button compact" onClick={() => setTab("Workflow")}>Configure Workflow</button></div>
              <div className="ps-workflow-list">{workflow.map((step, i) => <div className="ps-workflow-step" key={step.name}><span className={`ps-workflow-dot ${step.status === "Completed" ? "done" : step.status === "In Progress" ? "progress" : ""}`}>{step.status === "Completed" ? <Check size={10} /> : i + 1}</span><div><strong>{step.name}</strong><small>Role: {step.role}</small></div><Pill tone={step.status === "Completed" ? "green" : step.status === "In Progress" ? "blue" : "neutral"}>{step.status}</Pill></div>)}</div>
              <button type="button" className="ps-link-button" onClick={() => setTab("Workflow")}>Edit Workflow</button>
            </Panel>

            <Panel title="Notifications">
              <div className="ps-table-scroll"><table className="ps-table ps-notification-table"><thead><tr><th>Event</th><th>In-App</th><th>Email</th><th>WhatsApp</th><th>SMS</th></tr></thead><tbody>{notifications.map((row, index) => <tr key={row.event}><td>{row.event}</td>{(["inApp", "email", "whatsapp", "sms"] as const).map((key) => <td key={key}><input type="checkbox" aria-label={`${row.event} ${key}`} checked={row[key]} onChange={(e) => setNotifications((prev) => prev.map((item, i) => i === index ? { ...item, [key]: e.target.checked } : item))} /></td>)}</tr>)}</tbody></table></div>
              <button type="button" className="ps-link-button" onClick={() => setTab("Notifications")}>Manage Notification Templates</button>
            </Panel>
          </div>

          <div className="ps-lower-grid">
            <Panel title="Custom Fields">
              <div className="ps-panel-heading-action"><span>Project Level Fields</span><button type="button" className="ps-button compact" onClick={() => setShowAddField((v) => !v)}><Plus size={12} /> Add Field</button></div>
              {showAddField && <div className="ps-inline-form ps-inline-stack"><input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Field name" maxLength={60} /><select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)}><option>Text</option><option>Dropdown</option><option>Date</option><option>Number</option><option>File</option></select><button type="button" className="ps-button primary compact" onClick={() => addSimpleItem("field")}>Add</button></div>}
              <div className="ps-table-scroll"><table className="ps-table"><thead><tr><th>Field Name</th><th>Type</th><th>Required</th><th>Visible To</th><th>Action</th></tr></thead><tbody>{fields.map((field) => <tr key={field.name}><td>{field.name}</td><td>{field.type}</td><td>{field.required}</td><td>{field.visible}</td><td><button type="button" className="ps-table-action" aria-label={`Delete ${field.name}`} onClick={() => setFields((prev) => prev.filter((item) => item.name !== field.name))}><Trash2 size={11} /></button></td></tr>)}</tbody></table></div>
              <button type="button" className="ps-link-button" onClick={() => setMessage("Field groups require backend support.")}>Manage Field Groups</button>
            </Panel>

            <Panel title="Statuses">
              <div className="ps-panel-heading-action"><span>Project Statuses</span><button type="button" className="ps-button compact" onClick={() => setShowAddStatus((v) => !v)}><Plus size={12} /> Add Status</button></div>
              {showAddStatus && <div className="ps-inline-form"><input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Status name" maxLength={40} /><button type="button" className="ps-button primary compact" onClick={() => addSimpleItem("status")}>Add</button></div>}
              <div className="ps-table-scroll"><table className="ps-table"><thead><tr><th>Status Name</th><th>Color</th><th>Category</th><th>Default</th></tr></thead><tbody>{statuses.map((status) => <tr key={status.name}><td>{status.name}</td><td><input className="ps-color-input" aria-label={`${status.name} color`} type="color" value={status.color} onChange={(e) => setStatuses((prev) => prev.map((s) => s.name === status.name ? { ...s, color: e.target.value } : s))} /></td><td><select value={status.category} onChange={(e) => setStatuses((prev) => prev.map((s) => s.name === status.name ? { ...s, category: e.target.value } : s))}><option>To Do</option><option>In Progress</option><option>Completed</option><option>Closed</option></select></td><td><input type="radio" name="defaultStatus" checked={status.isDefault} aria-label={`Set ${status.name} as default`} onChange={() => setStatuses((prev) => prev.map((s) => ({ ...s, isDefault: s.name === status.name })))} /></td></tr>)}</tbody></table></div>
            </Panel>

            <Panel title="Priorities">
              <div className="ps-panel-heading-action"><span>Priority Levels</span><button type="button" className="ps-button compact" onClick={() => setShowAddPriority((v) => !v)}><Plus size={12} /> Add Priority</button></div>
              {showAddPriority && <div className="ps-inline-form"><input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Priority name" maxLength={40} /><button type="button" className="ps-button primary compact" onClick={() => addSimpleItem("priority")}>Add</button></div>}
              <div className="ps-table-scroll"><table className="ps-table"><thead><tr><th>Priority</th><th>Color</th><th>Score</th><th>Description</th></tr></thead><tbody>{priorities.map((priority) => <tr key={priority.name}><td>{priority.name}</td><td><input className="ps-color-input" type="color" aria-label={`${priority.name} color`} value={priority.color} onChange={(e) => setPriorities((prev) => prev.map((p) => p.name === priority.name ? { ...p, color: e.target.value } : p))} /></td><td>{priority.score}</td><td>{priority.description}</td></tr>)}</tbody></table></div>
            </Panel>

            <Panel title="Integrations">
              <div className="ps-panel-heading-action"><span>Connected Apps</span><button type="button" className="ps-button compact" onClick={() => setMessage("Connect your integration provider APIs to add an integration.")}>Manage</button></div>
              <div className="ps-integration-grid">{integrations.map((item) => <article key={item.name}><span className="ps-integration-icon"><Link2 size={15} /></span><div><strong>{item.name}</strong><small>{item.connected ? "Connected" : "Not connected"}</small></div><button type="button" aria-label={`${item.connected ? "Disconnect" : "Connect"} ${item.name}`} onClick={() => setIntegrations((prev) => prev.map((app) => app.name === item.name ? { ...app, connected: !app.connected } : app))}><ChevronDown size={12} /></button></article>)}</div>
              <p className="ps-hint">Demo connection state only. OAuth/API credentials are not configured.</p>
            </Panel>
          </div>

          <div className="ps-bottom-grid">
            <Panel title="Financial Settings">
              <div className="ps-form-grid">
                <Field label="Budget Type"><select value={financial.budgetType} onChange={(e) => setFinancial({ ...financial, budgetType: e.target.value })}><option>Fixed Price</option><option>Time & Materials</option><option>Cost Plus</option></select></Field>
                <Field label="Tax Rate (%)"><input type="number" min="0" max="100" value={financial.taxRate} onChange={(e) => setFinancial({ ...financial, taxRate: e.target.value })} /></Field>
                <Field label="Currency"><select value={financial.currency} onChange={(e) => setFinancial({ ...financial, currency: e.target.value })}><option>INR - Indian Rupee (₹)</option><option>USD - US Dollar ($)</option><option>EUR - Euro (€)</option></select></Field>
                <Field label="Payment Terms"><select value={financial.paymentTerms} onChange={(e) => setFinancial({ ...financial, paymentTerms: e.target.value })}><option>Due on Receipt</option><option>Net 15 Days</option><option>Net 30 Days</option><option>Net 45 Days</option></select></Field>
                <Field label="Total Budget (INR)"><input type="number" min="0" value={financial.totalBudget} onChange={(e) => setFinancial({ ...financial, totalBudget: e.target.value })} /></Field>
                <Field label="Retainer Amount"><input type="number" min="0" value={financial.retainer} onChange={(e) => setFinancial({ ...financial, retainer: e.target.value })} /></Field>
                <Field label="Billing Model"><select value={financial.billingModel} onChange={(e) => setFinancial({ ...financial, billingModel: e.target.value })}><option>Milestone Based</option><option>Monthly</option><option>Hourly</option><option>Fixed Price</option></select></Field>
              </div>
              <label className="ps-check-row"><input type="checkbox" checked={financial.taxApplicable} onChange={(e) => setFinancial({ ...financial, taxApplicable: e.target.checked })} /> Tax Applicable</label>
              <button type="button" className="ps-link-button" onClick={() => setTab("Milestones")}>Manage Milestones & Payment Schedule</button>
            </Panel>

            <Panel title="Other Settings">
              <div className="ps-toggle-list ps-other-toggle">
                {([
                  ["allowTimeEntry", "Allow Time Entry After Approval"],
                  ["allowTaskReassignment", "Allow Task Reassignment"],
                  ["allowExpenseWithoutApproval", "Allow Expense Without Approval"],
                  ["enableDependency", "Enable Dependency"],
                  ["allowPrivateTasks", "Allow Private Tasks"],
                  ["enableBaseline", "Enable Baseline"],
                  ["autoCloseMilestones", "Auto Close Completed Milestones"],
                  ["lockAfterCompletion", "Lock Project After Completion"],
                ] as [keyof typeof otherSettings, string][]).map(([key, label]) => <div key={key}><span>{label}</span><Toggle label={label} checked={otherSettings[key]} onChange={() => toggleOther(key)} /></div>)}
              </div>
            </Panel>

            <Panel title="Audit Log" className="ps-audit-panel">
              <div className="ps-table-scroll"><table className="ps-table"><thead><tr><th>Date & Time</th><th>User</th><th>Action</th><th>Section</th><th>Details</th></tr></thead><tbody>{INITIAL_AUDIT.map((row) => <tr key={`${row[0]}-${row[1]}`}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>)}</tbody></table></div>
              <button type="button" className="ps-link-button" onClick={exportAudit}>View / Export Audit Log</button>
            </Panel>
          </div>
        </>
      )}

      {tab === "Team & Access" && <Panel title="Team & Access"><div className="ps-panel-heading-action"><span>Project Members ({members.length})</span><button type="button" className="ps-button primary compact" onClick={() => setShowAddMember((v) => !v)}><Plus size={12} /> Add Member</button></div>{showAddMember && <form className="ps-inline-form" onSubmit={addMember}><input value={newMember} onChange={(e) => setNewMember(e.target.value)} placeholder="Member name" /><button className="ps-button primary compact">Add</button></form>}<div className="ps-table-scroll"><table className="ps-table"><thead><tr><th>Member</th><th>Role</th><th>Department</th><th>Access Level</th><th>Actions</th></tr></thead><tbody>{members.map((member) => <tr key={member.name}><td>{member.name}</td><td>{member.role}</td><td>{member.department}</td><td><select value={member.access} onChange={(e) => setMembers((prev) => prev.map((m) => m.name === member.name ? { ...m, access: e.target.value } : m))}><option>Full Access</option><option>Edit</option><option>View</option></select></td><td><button className="ps-table-action" type="button" onClick={() => removeMember(member.name)}><Trash2 size={12} /></button></td></tr>)}</tbody></table></div></Panel>}

      {tab === "Roles & Permissions" && <Panel title="Roles & Permissions"><div className="ps-panel-heading-action"><span>Project Roles</span><button className="ps-button primary compact" type="button" onClick={() => setShowAddRole((v) => !v)}><Plus size={12} /> Add Role</button></div>{showAddRole && <div className="ps-inline-form"><input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Role name" /><button className="ps-button primary compact" type="button" onClick={() => addSimpleItem("role")}>Add</button></div>}<div className="ps-table-scroll"><table className="ps-table"><thead><tr><th>Role</th><th>Description</th><th>Members</th><th>Access</th></tr></thead><tbody>{roles.map((role) => <tr key={role.name}><td>{role.name}</td><td>{role.description}</td><td>{role.members}</td><td><button type="button" className="ps-button compact" onClick={() => setMessage(`Permission matrix for ${role.name} needs RBAC API integration.`)}>Configure</button></td></tr>)}</tbody></table></div><p className="ps-hint">UI permissions are not a security boundary. Enforce role permissions on the server.</p></Panel>}

      {tab === "Workflow" && <Panel title="Project Workflow"><div className="ps-workflow-list ps-workflow-expanded">{workflow.map((step, i) => <div className="ps-workflow-step" key={step.name}><span className={`ps-workflow-dot ${step.status === "Completed" ? "done" : step.status === "In Progress" ? "progress" : ""}`}>{i + 1}</span><div><strong>{step.name}</strong><small>Role: {step.role}</small></div><select aria-label={`${step.name} status`} value={step.status} onChange={(e) => setWorkflow((prev) => prev.map((item) => item.name === step.name ? { ...item, status: e.target.value } : item))}><option>Pending</option><option>In Progress</option><option>Completed</option><option>Blocked</option></select><button type="button" className="ps-table-action" aria-label={`Remove ${step.name}`} onClick={() => setWorkflow((prev) => prev.filter((item) => item.name !== step.name))}><Trash2 size={12} /></button></div>)}</div><button className="ps-button" type="button" onClick={() => setWorkflow((prev) => [...prev, { name: `Workflow Step ${prev.length + 1}`, role: "Project Manager", status: "Pending" }])}><Plus size={12} /> Add Step</button></Panel>}

      {tab === "Notifications" && <Panel title="Notification Preferences"><p className="ps-hint">Select which channels should be used for each project event.</p><div className="ps-table-scroll"><table className="ps-table ps-notification-table"><thead><tr><th>Event</th><th>In-App</th><th>Email</th><th>WhatsApp</th><th>SMS</th></tr></thead><tbody>{notifications.map((row, index) => <tr key={row.event}><td>{row.event}</td>{(["inApp", "email", "whatsapp", "sms"] as const).map((key) => <td key={key}><input type="checkbox" checked={row[key]} onChange={(e) => setNotifications((prev) => prev.map((item, i) => i === index ? { ...item, [key]: e.target.checked } : item))} /></td>)}</tr>)}</tbody></table></div></Panel>}

      {tab === "Custom Fields" && <Panel title="Custom Fields"><div className="ps-panel-heading-action"><span>Project-level fields</span><button className="ps-button primary compact" type="button" onClick={() => setShowAddField((v) => !v)}><Plus size={12} /> Add Field</button></div>{showAddField && <div className="ps-inline-form"><input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Field name" /><select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)}><option>Text</option><option>Dropdown</option><option>Date</option><option>Number</option><option>File</option></select><button className="ps-button primary compact" type="button" onClick={() => addSimpleItem("field")}>Add</button></div>}<div className="ps-table-scroll"><table className="ps-table"><thead><tr><th>Field Name</th><th>Type</th><th>Required</th><th>Visible To</th><th>Actions</th></tr></thead><tbody>{fields.map((field) => <tr key={field.name}><td>{field.name}</td><td>{field.type}</td><td>{field.required}</td><td>{field.visible}</td><td><button type="button" className="ps-table-action" onClick={() => setFields((prev) => prev.filter((item) => item.name !== field.name))}><Trash2 size={12} /></button></td></tr>)}</tbody></table></div></Panel>}

      {tab === "Statuses" && <Panel title="Project Statuses"><div className="ps-panel-heading-action"><span>Manage lifecycle states</span><button className="ps-button primary compact" type="button" onClick={() => setShowAddStatus((v) => !v)}><Plus size={12} /> Add Status</button></div>{showAddStatus && <div className="ps-inline-form"><input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Status name" /><button className="ps-button primary compact" type="button" onClick={() => addSimpleItem("status")}>Add</button></div>}<div className="ps-table-scroll"><table className="ps-table"><thead><tr><th>Status</th><th>Color</th><th>Category</th><th>Default</th></tr></thead><tbody>{statuses.map((status) => <tr key={status.name}><td>{status.name}</td><td><input type="color" className="ps-color-input" value={status.color} onChange={(e) => setStatuses((prev) => prev.map((s) => s.name === status.name ? { ...s, color: e.target.value } : s))} /></td><td><select value={status.category} onChange={(e) => setStatuses((prev) => prev.map((s) => s.name === status.name ? { ...s, category: e.target.value } : s))}><option>To Do</option><option>In Progress</option><option>Completed</option><option>Closed</option></select></td><td><input type="radio" name="defaultStatus" checked={status.isDefault} onChange={() => setStatuses((prev) => prev.map((s) => ({ ...s, isDefault: s.name === status.name })))} /></td></tr>)}</tbody></table></div></Panel>}

      {tab === "Priorities" && <Panel title="Project Priorities"><div className="ps-panel-heading-action"><span>Priority levels</span><button className="ps-button primary compact" type="button" onClick={() => setShowAddPriority((v) => !v)}><Plus size={12} /> Add Priority</button></div>{showAddPriority && <div className="ps-inline-form"><input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Priority name" /><button className="ps-button primary compact" type="button" onClick={() => addSimpleItem("priority")}>Add</button></div>}<div className="ps-table-scroll"><table className="ps-table"><thead><tr><th>Priority</th><th>Color</th><th>Score</th><th>Description</th></tr></thead><tbody>{priorities.map((priority) => <tr key={priority.name}><td>{priority.name}</td><td><input type="color" className="ps-color-input" value={priority.color} onChange={(e) => setPriorities((prev) => prev.map((p) => p.name === priority.name ? { ...p, color: e.target.value } : p))} /></td><td>{priority.score}</td><td>{priority.description}</td></tr>)}</tbody></table></div></Panel>}

      {tab === "Milestones" && <Panel title="Milestones & Payment Schedule"><p className="ps-hint">Configure milestone dates, approval criteria and linked billing schedules.</p><div className="ps-empty-state"><Clock3 size={25} /><strong>Milestone schedule</strong><span>Connect the existing Milestones module to load and edit real project milestones.</span><button type="button" className="ps-button primary" onClick={() => setMessage("Link this action to your existing Milestones route.")}>Open Milestones</button></div></Panel>}

      {tab === "Financial Settings" && <Panel title="Financial Settings"><div className="ps-form-grid ps-financial-form"><Field label="Budget Type"><select value={financial.budgetType} onChange={(e) => setFinancial({ ...financial, budgetType: e.target.value })}><option>Fixed Price</option><option>Time & Materials</option><option>Cost Plus</option></select></Field><Field label="Tax Rate (%)"><input type="number" min="0" max="100" value={financial.taxRate} onChange={(e) => setFinancial({ ...financial, taxRate: e.target.value })} /></Field><Field label="Currency"><select value={financial.currency} onChange={(e) => setFinancial({ ...financial, currency: e.target.value })}><option>INR - Indian Rupee (₹)</option><option>USD - US Dollar ($)</option><option>EUR - Euro (€)</option></select></Field><Field label="Payment Terms"><select value={financial.paymentTerms} onChange={(e) => setFinancial({ ...financial, paymentTerms: e.target.value })}><option>Due on Receipt</option><option>Net 15 Days</option><option>Net 30 Days</option><option>Net 45 Days</option></select></Field><Field label="Total Budget"><input type="number" min="0" value={financial.totalBudget} onChange={(e) => setFinancial({ ...financial, totalBudget: e.target.value })} /></Field><Field label="Retainer Amount"><input type="number" min="0" value={financial.retainer} onChange={(e) => setFinancial({ ...financial, retainer: e.target.value })} /></Field><Field label="Billing Model"><select value={financial.billingModel} onChange={(e) => setFinancial({ ...financial, billingModel: e.target.value })}><option>Milestone Based</option><option>Monthly</option><option>Hourly</option><option>Fixed Price</option></select></Field></div><label className="ps-check-row"><input type="checkbox" checked={financial.taxApplicable} onChange={(e) => setFinancial({ ...financial, taxApplicable: e.target.checked })} /> Tax Applicable</label></Panel>}

      {tab === "Integrations" && <Panel title="Project Integrations"><p className="ps-hint">Connection toggles below only update the UI; actual OAuth/API connections must be handled securely on the server.</p><div className="ps-integration-grid ps-integration-grid-large">{integrations.map((item) => <article key={item.name}><span className="ps-integration-icon"><Link2 size={17} /></span><div><strong>{item.name}</strong><small>{item.connected ? "Connected" : "Not connected"}</small></div><button className="ps-button compact" type="button" onClick={() => setIntegrations((prev) => prev.map((app) => app.name === item.name ? { ...app, connected: !app.connected } : app))}>{item.connected ? "Disconnect" : "Connect"}</button></article>)}</div></Panel>}

      {tab === "Documents" && <Panel title="Project Documents"><p className="ps-hint">Manage document permissions and version history for this project.</p><div className="ps-empty-state"><FileText size={26} /><strong>Project documents</strong><span>Connect the existing Documents module to browse project files and configure document access.</span><button type="button" className="ps-button primary" onClick={() => setMessage("Connect this action to your existing Documents route.")}>Open Documents</button></div></Panel>}

      {tab === "Other Settings" && <Panel title="Other Project Settings"><div className="ps-toggle-list ps-other-toggle">{([
        ["allowTimeEntry", "Allow Time Entry After Approval"],
        ["allowTaskReassignment", "Allow Task Reassignment"],
        ["allowExpenseWithoutApproval", "Allow Expense Without Approval"],
        ["enableDependency", "Enable Dependency"],
        ["allowPrivateTasks", "Allow Private Tasks"],
        ["enableBaseline", "Enable Baseline"],
        ["autoCloseMilestones", "Auto Close Completed Milestones"],
        ["lockAfterCompletion", "Lock Project After Completion"],
        ["enableBudgetTracking", "Enable Budget Tracking"],
        ["enableTimesheets", "Enable Timesheets"],
        ["enableExpenses", "Enable Expenses"],
        ["enableBilling", "Enable Billing"],
        ["enableIssueTracking", "Enable Issue Tracking"],
        ["enableChangeRequests", "Enable Change Requests"],
        ["enableRisks", "Enable Risks"],
        ["enableFileVersioning", "Enable File Versioning"],
        ["enableActivityLog", "Enable Activity Log"],
        ["archiveAfterCompletion", "Archive Project After Completion"],
      ] as [keyof typeof otherSettings, string][]).map(([key, label]) => <div key={key}><span>{label}</span><Toggle label={label} checked={otherSettings[key]} onChange={() => toggleOther(key)} /></div>)}</div></Panel>}

      {tab === "Audit Log" && <Panel title="Project Settings Audit Log"><div className="ps-panel-heading-action"><span>Recent project changes</span><button type="button" className="ps-button compact" onClick={exportAudit}>Export CSV</button></div><div className="ps-table-scroll"><table className="ps-table"><thead><tr><th>Date & Time</th><th>User</th><th>Action</th><th>Section</th><th>Details</th></tr></thead><tbody>{INITIAL_AUDIT.map((row) => <tr key={`${row[0]}-${row[1]}`}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>)}</tbody></table></div></Panel>}

      <footer className="ps-sticky-footer"><span>{dirty ? "You have unsaved changes." : "Project Settings"} {dirty && <b>Save changes before leaving this page.</b>}</span><div><button type="button" className="ps-button" onClick={discardChanges}>Discard</button><button type="button" className="ps-button primary" onClick={saveChanges}><Save size={13} /> Save Changes</button></div></footer>
    </main>
  );
}
