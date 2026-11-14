"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Code2,
  FileText,
  GitBranch,
  Link2,
  LockKeyhole,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Star,
  Trash2,
  Users,
  Workflow,
  X,
} from "lucide-react";
import {
  projects as getProjects,
  patchProject,
  employees as getEmployees,
  getOrganizationAudit,
} from "@/lib/api";
import "./project-settings.css";

type Tab =
  | "General"
  | "Team & Access"
  | "Roles & Permissions"
  | "Workflow"
  | "Notifications"
  | "Custom Fields"
  | "Statuses"
  | "Priorities"
  | "Milestones"
  | "Financial Settings"
  | "Integrations"
  | "Documents"
  | "Other Settings"
  | "Audit Log";

type ProjectForm = {
  id?: string;
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

const EMPTY_PROJECT: ProjectForm = {
  name: "",
  code: "",
  client: "",
  type: "Implementation",
  description: "",
  startDate: "",
  endDate: "",
  status: "In Progress",
  manager: "",
  priority: "High",
  accountManager: "",
  timezone: "(GMT+05:30) Asia/Kolkata",
  dateFormat: "DD MMM YYYY",
  timeFormat: "24 Hour",
  currency: "INR - Indian Rupee (₹)",
  visibility: "Private",
};

const TABS: Tab[] = [
  "General",
  "Team & Access",
  "Roles & Permissions",
  "Workflow",
  "Notifications",
  "Custom Fields",
  "Statuses",
  "Priorities",
  "Milestones",
  "Financial Settings",
  "Integrations",
  "Documents",
  "Other Settings",
  "Audit Log",
];

const DEFAULT_STATUSES = [
  { name: "Not Started", color: "#98a2b3", category: "To Do", isDefault: false },
  { name: "In Progress", color: "#155eef", category: "In Progress", isDefault: true },
  { name: "On Hold", color: "#f79009", category: "In Progress", isDefault: false },
  { name: "Under Review", color: "#875bf7", category: "In Progress", isDefault: false },
  { name: "Completed", color: "#039855", category: "Completed", isDefault: false },
  { name: "Cancelled", color: "#f04438", category: "Closed", isDefault: false },
];

const DEFAULT_PRIORITIES = [
  { name: "Critical", color: "#f04438", score: 5, description: "Requires immediate attention" },
  { name: "High", color: "#f97024", score: 4, description: "High priority task or issue" },
  { name: "Medium", color: "#f79009", score: 3, description: "Normal priority" },
  { name: "Low", color: "#039855", score: 2, description: "Low priority" },
  { name: "Minimal", color: "#155eef", score: 1, description: "Very low priority" },
];

const DEFAULT_NOTIFICATIONS = [
  { event: "Task Assigned", inApp: true, email: true, whatsapp: true, sms: true },
  { event: "Task Due Reminder", inApp: true, email: true, whatsapp: true, sms: true },
  { event: "Milestone Due", inApp: true, email: true, whatsapp: true, sms: false },
  { event: "Issue Created", inApp: true, email: true, whatsapp: true, sms: true },
  { event: "Status Change", inApp: true, email: true, whatsapp: false, sms: false },
  { event: "Timesheet Submitted", inApp: true, email: true, whatsapp: false, sms: false },
  { event: "Invoice Generated", inApp: true, email: false, whatsapp: false, sms: false },
];

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`ps-panel ${className}`}>
      <h2>{title}</h2>
      <div className="ps-panel-body">{children}</div>
    </section>
  );
}

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
    <label className="ps-field">
      <span>
        {label}
        {required && <b> *</b>}
      </span>
      {children}
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`ps-toggle ${checked ? "on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <i />
    </button>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="ps-stat">
      <span className={`ps-stat-icon ${tone}`}>
        <Check size={15} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export default function ProjectSettingsPage() {
  const [tab, setTab] = useState<Tab>("General");
  const [projectList, setProjectList] = useState<any[]>([]);
  const [project, setProject] = useState<ProjectForm>(EMPTY_PROJECT);
  const [savedProject, setSavedProject] = useState<ProjectForm>(EMPTY_PROJECT);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [moreActions, setMoreActions] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [statuses, setStatuses] = useState(DEFAULT_STATUSES);
  const [priorities, setPriorities] = useState(DEFAULT_PRIORITIES);
  const [fields, setFields] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [workflow, setWorkflow] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showAddField, setShowAddField] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [showAddStatus, setShowAddStatus] = useState(false);
  const [showAddPriority, setShowAddPriority] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [newFieldType, setNewFieldType] = useState("Text");
  const [newMember, setNewMember] = useState("");
  const [logoText, setLogoText] = useState("Project PMS");
  const [themeColor, setThemeColor] = useState("#155eef");
  const [financial, setFinancial] = useState({
    budgetType: "Fixed Price",
    currency: "INR - Indian Rupee (₹)",
    totalBudget: "0",
    billingModel: "Milestone Based",
    taxApplicable: true,
    taxRate: "18",
    paymentTerms: "Net 30 Days",
    retainer: "0",
  });
  const [otherSettings, setOtherSettings] = useState({
    allowTimeEntry: true,
    allowTaskReassignment: true,
    allowExpenseWithoutApproval: false,
    enableDependency: true,
    allowPrivateTasks: true,
    enableBaseline: true,
    autoCloseMilestones: false,
    lockAfterCompletion: false,
    enableBudgetTracking: true,
    enableTimesheets: true,
    enableExpenses: true,
    enableBilling: true,
    enableIssueTracking: true,
    enableChangeRequests: true,
    enableRisks: true,
    enableFileVersioning: true,
    enableActivityLog: true,
    archiveAfterCompletion: false,
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [prjRes, empRes, auditRes] = await Promise.allSettled([
          getProjects(),
          getEmployees(),
          getOrganizationAudit({ limit: 20 }),
        ]);

        if (prjRes.status === "fulfilled" && prjRes.value) {
          const list = Array.isArray(prjRes.value)
            ? prjRes.value
            : (prjRes.value as any)?.items || [];
          setProjectList(list);
          if (list.length > 0) {
            const first = list[0];
            const pData: ProjectForm = {
              id: first._id,
              name: first.name || "",
              code: first.code || "",
              client: first.client?.name || first.clientName || "",
              type: first.type || "Implementation",
              description: first.description || "",
              startDate: first.startDate ? first.startDate.slice(0, 10) : "",
              endDate: first.endDate ? first.endDate.slice(0, 10) : "",
              status: first.status || "In Progress",
              manager: first.manager?.name || "",
              priority: first.priority || "High",
              accountManager: first.accountManager?.name || "",
              timezone: "(GMT+05:30) Asia/Kolkata",
              dateFormat: "DD MMM YYYY",
              timeFormat: "24 Hour",
              currency: "INR - Indian Rupee (₹)",
              visibility: "Private",
            };
            setProject(pData);
            setSavedProject(pData);
            setLogoText(first.name ? first.name.slice(0, 6) : "PRJ");
          }
        }

        if (empRes.status === "fulfilled" && empRes.value) {
          const empList = Array.isArray(empRes.value)
            ? empRes.value
            : (empRes.value as any)?.items || [];
          const mappedMembers = empList.map((emp: any) => ({
            name: `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.name || "Employee",
            role: emp.designation?.name || "Member",
            department: emp.department?.name || "General",
            access: "Full Access",
          }));
          setMembers(mappedMembers);
        }

        if (auditRes.status === "fulfilled" && auditRes.value) {
          const aList = Array.isArray(auditRes.value)
            ? auditRes.value
            : (auditRes.value as any)?.items || [];
          const rows = aList.map((log: any) => [
            log.createdAt ? new Date(log.createdAt).toLocaleString("en-GB") : "—",
            log.performedBy?.name || log.userId?.name || "System",
            log.action || "Updated",
            log.module || "Projects",
            log.details || log.description || "Project settings event",
          ]);
          setAuditLogs(rows);
        }
      } catch (err: any) {
        console.warn("Failed to load project settings data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const daysLeft = useMemo(() => {
    if (!project.endDate) return "—";
    const end = new Date(`${project.endDate}T00:00:00`);
    if (Number.isNaN(end.getTime())) return "—";
    return Math.ceil(
      (end.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000
    );
  }, [project.endDate]);

  function updateProject<K extends keyof ProjectForm>(
    key: K,
    value: ProjectForm[K]
  ) {
    setProject((previous) => ({ ...previous, [key]: value }));
    setDirty(true);
  }

  async function saveChanges() {
    if (!project.name.trim()) {
      setMessage("Project Name is required.");
      setTab("General");
      return;
    }
    if (
      project.endDate &&
      project.startDate &&
      project.endDate < project.startDate
    ) {
      setMessage("End Date cannot be earlier than Start Date.");
      setTab("General");
      return;
    }

    try {
      if (project.id) {
        await patchProject(project.id, {
          name: project.name,
          description: project.description,
          startDate: project.startDate || undefined,
          endDate: project.endDate || undefined,
          priority: project.priority,
        });
      }
      setSavedProject(project);
      setDirty(false);
      setMessage("Project settings successfully saved.");
    } catch (err: any) {
      setMessage(`Failed to save settings: ${err.message || "Unknown error"}`);
    }
  }

  function discardChanges() {
    setProject(savedProject);
    setDirty(false);
    setMessage("Unsaved project information has been reverted.");
  }

  function addSimpleItem(kind: "field" | "role" | "status" | "priority") {
    const value = newValue.trim();
    if (!value) {
      setMessage("Please enter a name first.");
      return;
    }
    if (kind === "field") {
      setFields((prev) => [
        ...prev,
        {
          name: value,
          type: newFieldType,
          required: "No",
          visible: "Project Team",
        },
      ]);
      setShowAddField(false);
    } else if (kind === "role") {
      setRoles((prev) => [
        ...prev,
        { name: value, description: "New project role", members: 0 },
      ]);
      setShowAddRole(false);
    } else if (kind === "status") {
      setStatuses((prev) => [
        ...prev,
        {
          name: value,
          color: "#155eef",
          category: "In Progress",
          isDefault: false,
        },
      ]);
      setShowAddStatus(false);
    } else {
      setPriorities((prev) => [
        ...prev,
        {
          name: value,
          color: "#155eef",
          score: prev.length + 1,
          description: "Custom priority",
        },
      ]);
      setShowAddPriority(false);
    }
    setNewValue("");
    setMessage(`${value} added.`);
  }

  function addMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newMember.trim()) {
      setMessage("Enter a member name.");
      return;
    }
    if (
      members.some(
        (member) =>
          member.name.toLowerCase() === newMember.trim().toLowerCase()
      )
    ) {
      setMessage("This member is already in the list.");
      return;
    }
    setMembers((prev) => [
      ...prev,
      {
        name: newMember.trim(),
        role: "Developer",
        department: "Development",
        access: "Edit",
      },
    ]);
    setNewMember("");
    setShowAddMember(false);
    setMessage("Member added.");
  }

  function exportAudit() {
    const csv = [
      ["Date & Time", "User", "Action", "Section", "Details"],
      ...auditLogs,
    ]
      .map((row) =>
        row
          .map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" })
    );
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
    setMessage(`${name} removed.`);
  }

  return (
    <main className="ps-page">
      <header className="ps-page-header">
        <div className="ps-page-heading">
          <h1>Project Settings</h1>
          <p>Configure project preferences, access, workflows and integrations.</p>
        </div>
        <div className="ps-header-actions">
          <button
            type="button"
            className="ps-button primary"
            onClick={saveChanges}
          >
            <Save size={13} /> Save Changes{dirty ? " *" : ""}
          </button>
          <div className="ps-menu-wrap">
            <button
              type="button"
              className="ps-button"
              onClick={() => setMoreActions((v) => !v)}
            >
              More Actions <ChevronDown size={12} />
            </button>
            {moreActions && (
              <div className="ps-dropdown">
                <button
                  type="button"
                  onClick={() => {
                    discardChanges();
                    setMoreActions(false);
                  }}
                >
                  Discard Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("Audit Log");
                    setMoreActions(false);
                  }}
                >
                  View Audit Log
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                    setMoreActions(false);
                  }}
                >
                  Print Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {message && (
        <div className="ps-message" role="status">
          <span>{message}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setMessage("")}
          >
            <X size={13} />
          </button>
        </div>
      )}

      <section className="ps-project-banner">
        <div
          className="ps-project-avatar"
          style={{ background: themeColor }}
        >
          {logoText}
        </div>
        <div className="ps-banner-info">
          <div className="ps-banner-title">
            <h2>{project.name || "Untitled Project"}</h2>
            <span className="ps-pill green">{project.status}</span>
            <span className="ps-pill red">{project.priority} Priority</span>
          </div>
          <div className="ps-banner-meta">
            <span>Code: {project.code || "PRJ"}</span>
            <span>Client: {project.client || "—"}</span>
            <span>Manager: {project.manager || "—"}</span>
            <span>Type: {project.type}</span>
          </div>
        </div>
        <div className="ps-banner-stats">
          <Stat
            label="Project Timeline"
            value={`${project.startDate || "—"} to ${project.endDate || "—"}`}
            tone="blue"
          />
          <Stat
            label="Days Remaining"
            value={`${daysLeft} days`}
            tone="green"
          />
        </div>
      </section>

      <nav className="ps-tabs" aria-label="Project Settings Tabs">
        {TABS.map((t) => (
          <button
            type="button"
            key={t}
            className={`ps-tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "General" && (
        <>
          <div className="ps-two-col">
            <Panel title="Basic Information">
              <div className="ps-form-grid">
                <Field label="Project Name" required>
                  <input
                    value={project.name}
                    onChange={(e) => updateProject("name", e.target.value)}
                    placeholder="Enter project name"
                  />
                </Field>
                <Field label="Project Code">
                  <input
                    value={project.code}
                    onChange={(e) => updateProject("code", e.target.value)}
                    placeholder="PRJ-001"
                  />
                </Field>
                <Field label="Client Name">
                  <input
                    value={project.client}
                    onChange={(e) => updateProject("client", e.target.value)}
                    placeholder="Client name"
                  />
                </Field>
                <Field label="Project Type">
                  <select
                    value={project.type}
                    onChange={(e) => updateProject("type", e.target.value)}
                  >
                    <option>Implementation</option>
                    <option>Development</option>
                    <option>Integration</option>
                    <option>Migration</option>
                    <option>Support</option>
                  </select>
                </Field>
                <Field label="Start Date">
                  <input
                    type="date"
                    value={project.startDate}
                    onChange={(e) => updateProject("startDate", e.target.value)}
                  />
                </Field>
                <Field label="End Date">
                  <input
                    type="date"
                    value={project.endDate}
                    onChange={(e) => updateProject("endDate", e.target.value)}
                  />
                </Field>
                <Field label="Project Status">
                  <select
                    value={project.status}
                    onChange={(e) => updateProject("status", e.target.value)}
                  >
                    <option>Planning</option>
                    <option>In Progress</option>
                    <option>On Hold</option>
                    <option>Completed</option>
                    <option>Cancelled</option>
                  </select>
                </Field>
                <Field label="Priority">
                  <select
                    value={project.priority}
                    onChange={(e) => updateProject("priority", e.target.value)}
                  >
                    <option>Critical</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </Field>
              </div>
              <Field label="Project Description">
                <textarea
                  rows={4}
                  value={project.description}
                  onChange={(e) => updateProject("description", e.target.value)}
                  placeholder="Detailed project description..."
                />
              </Field>
            </Panel>

            <Panel title="Branding & Appearance">
              <div className="ps-branding-grid">
                <div>
                  <label className="ps-field">
                    <span>Theme Color</span>
                    <input
                      type="color"
                      className="ps-color-picker"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                    />
                  </label>
                </div>
                <div>
                  <label className="ps-field">
                    <span>Short Code / Abbreviation</span>
                    <input
                      value={logoText}
                      maxLength={8}
                      onChange={(e) => setLogoText(e.target.value)}
                    />
                  </label>
                </div>
              </div>
            </Panel>
          </div>

          <div className="ps-bottom-grid">
            <Panel title="Financial Settings">
              <div className="ps-form-grid">
                <Field label="Budget Type">
                  <select
                    value={financial.budgetType}
                    onChange={(e) =>
                      setFinancial({ ...financial, budgetType: e.target.value })
                    }
                  >
                    <option>Fixed Price</option>
                    <option>Time & Materials</option>
                    <option>Cost Plus</option>
                  </select>
                </Field>
                <Field label="Currency">
                  <select
                    value={financial.currency}
                    onChange={(e) =>
                      setFinancial({ ...financial, currency: e.target.value })
                    }
                  >
                    <option>INR - Indian Rupee (₹)</option>
                    <option>USD - US Dollar ($)</option>
                    <option>EUR - Euro (€)</option>
                  </select>
                </Field>
                <Field label="Total Budget (INR)">
                  <input
                    type="number"
                    min="0"
                    value={financial.totalBudget}
                    onChange={(e) =>
                      setFinancial({ ...financial, totalBudget: e.target.value })
                    }
                  />
                </Field>
                <Field label="Billing Model">
                  <select
                    value={financial.billingModel}
                    onChange={(e) =>
                      setFinancial({
                        ...financial,
                        billingModel: e.target.value,
                      })
                    }
                  >
                    <option>Milestone Based</option>
                    <option>Monthly</option>
                    <option>Hourly</option>
                    <option>Fixed Price</option>
                  </select>
                </Field>
              </div>
            </Panel>

            <Panel title="Other Settings">
              <div className="ps-toggle-list ps-other-toggle">
                {(
                  [
                    ["allowTimeEntry", "Allow Time Entry After Approval"],
                    ["allowTaskReassignment", "Allow Task Reassignment"],
                    ["allowExpenseWithoutApproval", "Allow Expense Without Approval"],
                    ["enableDependency", "Enable Dependency"],
                    ["allowPrivateTasks", "Allow Private Tasks"],
                    ["enableBaseline", "Enable Baseline"],
                    ["autoCloseMilestones", "Auto Close Completed Milestones"],
                    ["lockAfterCompletion", "Lock Project After Completion"],
                  ] as [keyof typeof otherSettings, string][]
                ).map(([key, label]) => (
                  <div key={key}>
                    <span>{label}</span>
                    <Toggle
                      label={label}
                      checked={otherSettings[key]}
                      onChange={() => toggleOther(key)}
                    />
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Audit Log" className="ps-audit-panel">
              <div className="ps-table-scroll">
                <table className="ps-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>User</th>
                      <th>Action</th>
                      <th>Section</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length ? (
                      auditLogs.map((row, idx) => (
                        <tr key={idx}>
                          {row.map((cell: any, i: number) => (
                            <td key={i}>{cell}</td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "16px" }}>
                          No audit entries recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                className="ps-link-button"
                onClick={exportAudit}
              >
                Export Audit Log
              </button>
            </Panel>
          </div>
        </>
      )}

      {tab === "Team & Access" && (
        <Panel title="Team & Access">
          <div className="ps-panel-heading-action">
            <span>Project Members ({members.length})</span>
            <button
              type="button"
              className="ps-button primary compact"
              onClick={() => setShowAddMember((v) => !v)}
            >
              <Plus size={12} /> Add Member
            </button>
          </div>
          {showAddMember && (
            <form className="ps-inline-form" onSubmit={addMember}>
              <input
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
                placeholder="Member name"
              />
              <button className="ps-button primary compact">Add</button>
            </form>
          )}
          <div className="ps-table-scroll">
            <table className="ps-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Access Level</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.length ? (
                  members.map((member) => (
                    <tr key={member.name}>
                      <td>{member.name}</td>
                      <td>{member.role}</td>
                      <td>{member.department}</td>
                      <td>
                        <select
                          value={member.access}
                          onChange={(e) =>
                            setMembers((prev) =>
                              prev.map((m) =>
                                m.name === member.name
                                  ? { ...m, access: e.target.value }
                                  : m
                              )
                            )
                          }
                        >
                          <option>Full Access</option>
                          <option>Edit</option>
                          <option>View</option>
                        </select>
                      </td>
                      <td>
                        <button
                          className="ps-table-action"
                          type="button"
                          onClick={() => removeMember(member.name)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "16px" }}>
                      No members assigned to this project yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === "Roles & Permissions" && (
        <Panel title="Roles & Permissions">
          <div className="ps-panel-heading-action">
            <span>Project Roles</span>
            <button
              className="ps-button primary compact"
              type="button"
              onClick={() => setShowAddRole((v) => !v)}
            >
              <Plus size={12} /> Add Role
            </button>
          </div>
          {showAddRole && (
            <div className="ps-inline-form">
              <input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Role name"
              />
              <button
                className="ps-button primary compact"
                type="button"
                onClick={() => addSimpleItem("role")}
              >
                Add
              </button>
            </div>
          )}
          <div className="ps-table-scroll">
            <table className="ps-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Description</th>
                  <th>Members</th>
                  <th>Access</th>
                </tr>
              </thead>
              <tbody>
                {roles.length ? (
                  roles.map((role) => (
                    <tr key={role.name}>
                      <td>{role.name}</td>
                      <td>{role.description}</td>
                      <td>{role.members}</td>
                      <td>
                        <button
                          type="button"
                          className="ps-button compact"
                          onClick={() =>
                            setMessage(
                              `Configuring role permissions for ${role.name}.`
                            )
                          }
                        >
                          Configure
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "16px" }}>
                      No custom project roles defined.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === "Notifications" && (
        <Panel title="Notification Preferences">
          <div className="ps-table-scroll">
            <table className="ps-table ps-notification-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>In-App</th>
                  <th>Email</th>
                  <th>WhatsApp</th>
                  <th>SMS</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((row, index) => (
                  <tr key={row.event}>
                    <td>{row.event}</td>
                    {(["inApp", "email", "whatsapp", "sms"] as const).map(
                      (key) => (
                        <td key={key}>
                          <input
                            type="checkbox"
                            checked={row[key]}
                            onChange={(e) =>
                              setNotifications((prev) =>
                                prev.map((item, i) =>
                                  i === index
                                    ? { ...item, [key]: e.target.checked }
                                    : item
                                )
                              )
                            }
                          />
                        </td>
                      )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === "Custom Fields" && (
        <Panel title="Custom Fields">
          <div className="ps-panel-heading-action">
            <span>Project-level fields</span>
            <button
              className="ps-button primary compact"
              type="button"
              onClick={() => setShowAddField((v) => !v)}
            >
              <Plus size={12} /> Add Field
            </button>
          </div>
          {showAddField && (
            <div className="ps-inline-form">
              <input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Field name"
              />
              <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value)}
              >
                <option>Text</option>
                <option>Dropdown</option>
                <option>Date</option>
                <option>Number</option>
                <option>File</option>
              </select>
              <button
                className="ps-button primary compact"
                type="button"
                onClick={() => addSimpleItem("field")}
              >
                Add
              </button>
            </div>
          )}
          <div className="ps-table-scroll">
            <table className="ps-table">
              <thead>
                <tr>
                  <th>Field Name</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Visible To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {fields.length ? (
                  fields.map((field) => (
                    <tr key={field.name}>
                      <td>{field.name}</td>
                      <td>{field.type}</td>
                      <td>{field.required}</td>
                      <td>{field.visible}</td>
                      <td>
                        <button
                          type="button"
                          className="ps-table-action"
                          onClick={() =>
                            setFields((prev) =>
                              prev.filter((item) => item.name !== field.name)
                            )
                          }
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "16px" }}>
                      No custom fields added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === "Statuses" && (
        <Panel title="Project Statuses">
          <div className="ps-panel-heading-action">
            <span>Manage lifecycle states</span>
            <button
              className="ps-button primary compact"
              type="button"
              onClick={() => setShowAddStatus((v) => !v)}
            >
              <Plus size={12} /> Add Status
            </button>
          </div>
          {showAddStatus && (
            <div className="ps-inline-form">
              <input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Status name"
              />
              <button
                className="ps-button primary compact"
                type="button"
                onClick={() => addSimpleItem("status")}
              >
                Add
              </button>
            </div>
          )}
          <div className="ps-table-scroll">
            <table className="ps-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Color</th>
                  <th>Category</th>
                  <th>Default</th>
                </tr>
              </thead>
              <tbody>
                {statuses.map((st) => (
                  <tr key={st.name}>
                    <td>{st.name}</td>
                    <td>
                      <input
                        type="color"
                        className="ps-color-input"
                        value={st.color}
                        onChange={(e) =>
                          setStatuses((prev) =>
                            prev.map((s) =>
                              s.name === st.name
                                ? { ...s, color: e.target.value }
                                : s
                            )
                          )
                        }
                      />
                    </td>
                    <td>
                      <select
                        value={st.category}
                        onChange={(e) =>
                          setStatuses((prev) =>
                            prev.map((s) =>
                              s.name === st.name
                                ? { ...s, category: e.target.value }
                                : s
                            )
                          )
                        }
                      >
                          <option>To Do</option>
                          <option>In Progress</option>
                          <option>Completed</option>
                          <option>Closed</option>
                        </select>
                    </td>
                    <td>
                      <input
                        type="radio"
                        name="defaultStatus"
                        checked={st.isDefault}
                        onChange={() =>
                          setStatuses((prev) =>
                            prev.map((s) => ({
                              ...s,
                              isDefault: s.name === st.name,
                            }))
                          )
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === "Priorities" && (
        <Panel title="Project Priorities">
          <div className="ps-panel-heading-action">
            <span>Priority levels</span>
            <button
              className="ps-button primary compact"
              type="button"
              onClick={() => setShowAddPriority((v) => !v)}
            >
              <Plus size={12} /> Add Priority
            </button>
          </div>
          {showAddPriority && (
            <div className="ps-inline-form">
              <input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Priority name"
              />
              <button
                className="ps-button primary compact"
                type="button"
                onClick={() => addSimpleItem("priority")}
              >
                Add
              </button>
            </div>
          )}
          <div className="ps-table-scroll">
            <table className="ps-table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Color</th>
                  <th>Score</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {priorities.map((priority) => (
                  <tr key={priority.name}>
                    <td>{priority.name}</td>
                    <td>
                      <input
                        type="color"
                        className="ps-color-input"
                        value={priority.color}
                        onChange={(e) =>
                          setPriorities((prev) =>
                            prev.map((p) =>
                              p.name === priority.name
                                ? { ...p, color: e.target.value }
                                : p
                            )
                          )
                        }
                      />
                    </td>
                    <td>{priority.score}</td>
                    <td>{priority.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === "Audit Log" && (
        <Panel title="Project Settings Audit Log">
          <div className="ps-panel-heading-action">
            <span>Recent project changes</span>
            <button
              type="button"
              className="ps-button compact"
              onClick={exportAudit}
            >
              Export CSV
            </button>
          </div>
          <div className="ps-table-scroll">
            <table className="ps-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Section</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length ? (
                  auditLogs.map((row, idx) => (
                    <tr key={idx}>
                      {row.map((cell: any, i: number) => (
                        <td key={i}>{cell}</td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "16px" }}>
                      No audit entries recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <footer className="ps-sticky-footer">
        <span>
          {dirty ? "You have unsaved changes." : "Project Settings"}{" "}
          {dirty && <b>Save changes before leaving this page.</b>}
        </span>
        <div>
          <button
            type="button"
            className="ps-button"
            onClick={discardChanges}
          >
            Discard
          </button>
          <button
            type="button"
            className="ps-button primary"
            onClick={saveChanges}
          >
            <Save size={13} /> Save Changes
          </button>
        </div>
      </footer>
    </main>
  );
}
