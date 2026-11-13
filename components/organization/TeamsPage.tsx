
"use client";

import { useMemo, useState } from "react";
import {
  Activity, ArrowDownToLine, ArrowRight, Bell, Check, ChevronDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CircleHelp,
  Clock3, Ellipsis, Eye, FileText, Filter, FolderKanban, GitBranch,
  LockKeyhole, Pencil, Plus, Search, Settings2, ShieldCheck, Trash2,
  UserRound, UserRoundPlus, Users, X,
} from "lucide-react";
import "./teams.css";

type TeamStatus = "Active" | "Inactive";

type Team = {
  id: string;
  code: string;
  name: string;
  description: string;
  department: string;
  lead: string;
  members: number;
  projects: number;
  status: TeamStatus;
  createdOn: string;
  parentTeam: string;
  location: string;
};

type TeamPanel =
  | "create" | "edit" | "details" | "members"
  | "permissions" | "hierarchy" | "settings" | "delete" | "audit" | null;

const INITIAL_TEAMS: Team[] = [
  { id: "T-001", code: "PLAT-DEV", name: "Platform Development", description: "Core platform development and maintenance.", department: "IT - Development", lead: "Rahul Verma", members: 18, projects: 7, status: "Active", createdOn: "2025-01-12", parentTeam: "IT Division", location: "Head Office - Noida" },
  { id: "T-002", code: "MOB-APP", name: "Mobile Applications", description: "Mobile application development team.", department: "IT - Development", lead: "Neha Patel", members: 12, projects: 5, status: "Active", createdOn: "2025-01-15", parentTeam: "IT Division", location: "Head Office - Noida" },
  { id: "T-003", code: "QA-TEAM", name: "Quality Assurance", description: "Manual and automation testing.", department: "IT - QA", lead: "Vikram Singh", members: 16, projects: 6, status: "Active", createdOn: "2025-01-20", parentTeam: "IT Division", location: "Head Office - Noida" },
  { id: "T-004", code: "UI-UX", name: "UI/UX Design", description: "Design systems, UI/UX and prototyping.", department: "Design", lead: "Sneha Iyer", members: 10, projects: 4, status: "Active", createdOn: "2025-01-22", parentTeam: "IT Division", location: "Head Office - Noida" },
  { id: "T-005", code: "DEVOPS", name: "DevOps & Infra", description: "Infrastructure, CI/CD and deployments.", department: "IT - Operations", lead: "Arjun Mehta", members: 8, projects: 3, status: "Active", createdOn: "2025-01-25", parentTeam: "IT Division", location: "Remote" },
  { id: "T-006", code: "BUS-ANALYTICS", name: "Business Analytics", description: "Data analytics and reporting.", department: "Analytics", lead: "Karan Gupta", members: 9, projects: 4, status: "Active", createdOn: "2025-01-26", parentTeam: "Business Division", location: "Head Office - Noida" },
  { id: "T-007", code: "SUPPORT", name: "Customer Support", description: "Customer support and issue resolution.", department: "Support", lead: "Pooja Singh", members: 22, projects: 0, status: "Active", createdOn: "2025-02-01", parentTeam: "Operations Division", location: "Bhopal Office" },
  { id: "T-008", code: "CONT-MGMT", name: "Contract Management", description: "Manage contracts and legal documentation.", department: "Finance", lead: "Amit Kumar", members: 6, projects: 2, status: "Inactive", createdOn: "2025-02-05", parentTeam: "Operations Division", location: "Bhopal Office" },
];

const MEMBER_DATA = [
  { name: "Rahul Verma", role: "Team Lead", designation: "Senior Developer", joined: "12 Jan 2025" },
  { name: "Priya Sharma", role: "Developer", designation: "Software Engineer", joined: "15 Jan 2025" },
  { name: "Amit Kumar", role: "Developer", designation: "Backend Developer", joined: "18 Jan 2025" },
  { name: "Neha Patel", role: "Developer", designation: "Frontend Developer", joined: "20 Jan 2025" },
  { name: "Arjun Mehta", role: "DevOps", designation: "DevOps Engineer", joined: "22 Jan 2025" },
  { name: "Sneha Iyer", role: "Designer", designation: "UI/UX Designer", joined: "25 Jan 2025" },
  { name: "Vikram Singh", role: "QA Engineer", designation: "Test Engineer", joined: "28 Jan 2025" },
];

const PERMISSIONS = [
  ["Projects", "Read, Create, Update, Delete"],
  ["Tasks", "Read, Create, Update, Delete"],
  ["Timesheets", "Read, Create, Update"],
  ["Documents", "Read, Upload, Update, Delete"],
  ["Reports", "Read"],
  ["Finance", "No Access"],
  ["Settings", "No Access"],
];

const AUDIT = [
  ["01 May 2025, 04:15 PM", "Team updated", "Mayank Swaroop", "Updated team details and settings"],
  ["28 Apr 2025, 02:30 PM", "Member added", "Rahul Verma", "Added new member Pooja Singh"],
  ["25 Apr 2025, 11:20 AM", "Permission updated", "Amit Kumar", "Updated permissions for Projects module"],
  ["22 Apr 2025, 09:05 AM", "Project linked", "Neha Patel", "Linked project PHEOS Platform"],
  ["15 Apr 2025, 03:10 PM", "Member removed", "Rahul Verma", "Removed member John Doe"],
];

const EMPTY_FORM = {
  code: "",
  name: "",
  description: "",
  department: "",
  parentTeam: "",
  location: "Head Office - Noida",
  lead: "",
  status: "Active" as TeamStatus,
};

function Avatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  return <span className="tm-avatar" aria-hidden="true">{initials}</span>;
}

function Status({ value }: { value: TeamStatus }) {
  return <span className={`tm-status ${value === "Active" ? "active" : "inactive"}`}>{value}</span>;
}

function Metric({
  label, value, note, icon: Icon, tone,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: typeof Users;
  tone: string;
}) {
  return (
    <article className="tm-metric">
      <span className={`tm-metric-icon ${tone}`}><Icon size={17} /></span>
      <div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
    </article>
  );
}

function Field({
  label, required, children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return <label className="tm-field"><span>{label}{required && <b> *</b>}</span>{children}</label>;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState(INITIAL_TEAMS);
  const [selectedId, setSelectedId] = useState("T-001");
  const [panel, setPanel] = useState<TeamPanel>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRole, setMemberRole] = useState("Team Lead");
  const [settings, setSettings] = useState({
    invitations: true,
    projects: true,
    tasks: true,
    timesheets: true,
    approvals: false,
    dashboard: true,
    directory: true,
    defaultAssignee: "Team Lead",
    projectVisibility: "Team Members",
    approvalBy: "Team Lead",
  });

  const selected = teams.find((team) => team.id === selectedId) ?? teams[0];
  const activeTeams = teams.filter((team) => team.status === "Active").length;
  const inactiveTeams = teams.length - activeTeams;
  const totalMembers = teams.reduce((sum, team) => sum + team.members, 0);
  const projectTeams = teams.filter((team) => team.projects > 0).length;

  const departments = useMemo(
    () => [...new Set(teams.map((team) => team.department))],
    [teams],
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return teams.filter((team) => {
      const matchesSearch = !search || [
        team.name, team.code, team.description, team.department, team.lead,
      ].some((value) => value.toLowerCase().includes(search));
      return matchesSearch &&
        (statusFilter === "all" || team.status === statusFilter) &&
        (departmentFilter === "all" || team.department === departmentFilter);
    });
  }, [teams, query, statusFilter, departmentFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const visibleMembers = MEMBER_DATA.filter((member) =>
    `${member.name} ${member.role} ${member.designation}`.toLowerCase().includes(memberSearch.toLowerCase())
  );

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError("");
    setPanel("create");
  }

  function openEdit(team: Team) {
    setSelectedId(team.id);
    setForm({
      code: team.code,
      name: team.name,
      description: team.description,
      department: team.department,
      parentTeam: team.parentTeam,
      location: team.location,
      lead: team.lead,
      status: team.status,
    });
    setFormError("");
    setPanel("edit");
  }

  function saveTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.code.trim() || !form.name.trim() || !form.department || !form.lead.trim()) {
      setFormError("Team Code, Team Name, Department and Team Lead are required.");
      return;
    }

    if (teams.some((team) =>
      team.code.toLowerCase() === form.code.trim().toLowerCase() &&
      (panel === "create" || team.id !== selectedId)
    )) {
      setFormError("This team code is already in use.");
      return;
    }

    if (panel === "edit" && selected) {
      setTeams((previous) => previous.map((team) =>
        team.id === selected.id ? {
          ...team,
          ...form,
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          lead: form.lead.trim(),
          description: form.description.trim(),
        } : team
      ));
      setNotice("Team updated in the current demo view.");
    } else {
      const id = `T-${Date.now().toString().slice(-5)}`;
      setTeams((previous) => [{
        id,
        ...form,
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        lead: form.lead.trim(),
        description: form.description.trim(),
        members: 0,
        projects: 0,
        createdOn: new Date().toISOString().slice(0, 10),
      }, ...previous]);
      setSelectedId(id);
      setPage(1);
      setNotice("Team created in the current demo view.");
    }
    setPanel(null);
  }

  function toggleSelection(id: string) {
    setSelectedIds((previous) => previous.includes(id)
      ? previous.filter((value) => value !== id)
      : [...previous, id]
    );
  }

  function applyBulkStatus(status: TeamStatus) {
    if (!selectedIds.length) {
      setNotice("Select at least one team first.");
      return;
    }
    setTeams((previous) => previous.map((team) =>
      selectedIds.includes(team.id) ? { ...team, status } : team
    ));
    setNotice(`${selectedIds.length} team(s) marked ${status.toLowerCase()} in the demo view.`);
    setSelectedIds([]);
  }

  function confirmDelete() {
    if (!selected) return;
    setTeams((previous) => previous.filter((team) => team.id !== selected.id));
    setSelectedId(teams.find((team) => team.id !== selected.id)?.id ?? "");
    setPanel(null);
    setNotice("Team removed from the current demo view.");
  }

  function exportCsv() {
    const header = ["Team Code", "Team Name", "Description", "Department", "Team Lead", "Members", "Projects", "Status", "Created On"];
    const csv = [header, ...filtered.map((team) => [
      team.code, team.name, team.description, team.department, team.lead,
      team.members, team.projects, team.status, team.createdOn,
    ])].map((row) =>
      row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
    ).join("\r\n");

    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "teams.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice(`Exported ${filtered.length} teams to CSV.`);
  }

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setDepartmentFilter("all");
    setPage(1);
  }

  function toggleSetting(key: keyof typeof settings) {
    if (typeof settings[key] !== "boolean") return;
    setSettings((previous) => ({ ...previous, [key]: !previous[key] }));
  }

  return (
    <main className="tm-page">
      <header className="tm-header">
        <div>
          <div className="tm-breadcrumb"><span>Organization</span><span>›</span><span>Teams</span></div>
          <h1>Teams</h1>
          <p>View and manage teams across your organization.</p>
        </div>
        <div className="tm-header-actions">
          <label className="tm-search"><Search size={13} /><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search teams, code, lead..." /><kbd>/</kbd></label>
          <button type="button" className="tm-round-btn" aria-label="Create team" onClick={openCreate}><Plus size={18} /></button>
          <button type="button" className="tm-icon-btn" aria-label="Notifications" onClick={() => setNotice("Notifications are not connected yet.")}><Bell size={16} /><i>0</i></button>
          <button type="button" className="tm-icon-btn" aria-label="Help" onClick={() => setNotice("Open your organization help center to learn about teams.")}><CircleHelp size={16} /></button>
          <button type="button" className="tm-user" onClick={() => setNotice("Signed in as Mayank Swaroop · Super Admin.")}><Avatar name="Mayank Swaroop" /><span><strong>Mayank Swaroop</strong><small>Super Admin</small></span><ChevronDown size={12} /></button>
        </div>
      </header>

      {notice && <div className="tm-notice" role="status"><span>{notice}</span><button type="button" aria-label="Dismiss notice" onClick={() => setNotice("")}><X size={13} /></button></div>}

      <section className="tm-metrics">
        <Metric label="Total Teams" value={teams.length} note="View all teams →" icon={Users} tone="blue" />
        <Metric label="Active Teams" value={activeTeams} note={`${teams.length ? (activeTeams / teams.length * 100).toFixed(2) : 0}% of total`} icon={Check} tone="green" />
        <Metric label="Total Members" value={totalMembers} note="Across all teams" icon={UserRound} tone="blue" />
        <Metric label="Teams with Projects" value={projectTeams} note={`${teams.length ? (projectTeams / teams.length * 100).toFixed(2) : 0}%`} icon={FolderKanban} tone="green" />
        <Metric label="Inactive Teams" value={inactiveTeams} note={`${teams.length ? (inactiveTeams / teams.length * 100).toFixed(2) : 0}%`} icon={Activity} tone="red" />
        <div className="tm-metric-action"><button type="button" className="tm-btn" onClick={exportCsv}><ArrowDownToLine size={14} /> Export</button><button type="button" className="tm-btn tm-btn-primary" onClick={openCreate}><Plus size={14} /> Add Team</button></div>
      </section>

      <section className="tm-registry">
        <div className="tm-toolbar">
          <label className="tm-search tm-table-search"><Search size={13} /><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search teams..." /></label>
          <select aria-label="Filter by status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}><option value="all">Status: All</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select>
          <select aria-label="Filter by department" value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}><option value="all">Department: All</option>{departments.map((item) => <option key={item}>{item}</option>)}</select>
          <button type="button" className="tm-btn" onClick={() => setPanel("settings")}><Filter size={13} /> Filters</button>
          <button type="button" className="tm-clear" onClick={resetFilters}>Reset</button>
          <span className="tm-toolbar-spacer" />
          <span className="tm-view-label">View</span>
          <button type="button" className="tm-view-btn active" aria-label="Table view"><span /></button>
          <button type="button" className="tm-view-btn" aria-label="Team hierarchy" onClick={() => setPanel("hierarchy")}><GitBranch size={13} /></button>
        </div>

        <div className="tm-table-wrap">
          <table className="tm-table">
            <thead><tr>
              <th><input type="checkbox" aria-label="Select all visible teams" checked={rows.length > 0 && rows.every((team) => selectedIds.includes(team.id))} onChange={(e) => setSelectedIds((previous) => e.target.checked ? [...new Set([...previous, ...rows.map((team) => team.id)])] : previous.filter((id) => !rows.some((team) => team.id === id)))} /></th>
              <th>Team Code</th><th>Team Name</th><th>Description</th><th>Department</th><th>Team Lead</th><th>Members</th><th>Projects</th><th>Status</th><th>Created On</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {rows.map((team) => (
                <tr key={team.id}>
                  <td><input type="checkbox" aria-label={`Select ${team.name}`} checked={selectedIds.includes(team.id)} onChange={() => toggleSelection(team.id)} /></td>
                  <td>{team.code}</td>
                  <td><button type="button" className="tm-team-link" onClick={() => { setSelectedId(team.id); setPanel("details"); }}>{team.name}</button></td>
                  <td className="tm-description">{team.description}</td>
                  <td>{team.department}</td>
                  <td><div className="tm-lead"><Avatar name={team.lead} /><span>{team.lead}</span></div></td>
                  <td>{team.members}</td><td>{team.projects}</td>
                  <td><Status value={team.status} /></td>
                  <td>{new Date(`${team.createdOn}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td><div className="tm-row-actions">
                    <button type="button" aria-label={`View ${team.name}`} title="View" onClick={() => { setSelectedId(team.id); setPanel("details"); }}><Eye size={13} /></button>
                    <button type="button" aria-label={`Edit ${team.name}`} title="Edit" onClick={() => openEdit(team)}><Pencil size={13} /></button>
                    <button type="button" aria-label={`More actions for ${team.name}`} title="More actions" onClick={() => { setSelectedId(team.id); setPanel("delete"); }}><Ellipsis size={14} /></button>
                  </div></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={11} className="tm-empty">No teams found. Try changing your search or filters.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="tm-table-footer">
          <span>Showing {filtered.length ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} entries</span>
          <div className="tm-pagination">
            <label><select value={pageSize} aria-label="Rows per page" onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}><option value={8}>8 / page</option><option value={10}>10 / page</option><option value={20}>20 / page</option><option value={50}>50 / page</option></select></label>
            <button type="button" aria-label="First page" disabled={currentPage <= 1} onClick={() => setPage(1)}><ChevronsLeft size={13} /></button>
            <button type="button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={13} /></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).filter((num) => num === 1 || num === totalPages || Math.abs(num - currentPage) <= 1).map((num, i, arr) => <span className="tm-page-num" key={num}>{i > 0 && num - arr[i - 1] > 1 && <b>…</b>}<button type="button" className={num === currentPage ? "current" : ""} onClick={() => setPage(num)}>{num}</button></span>)}
            <button type="button" aria-label="Next page" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight size={13} /></button>
            <button type="button" aria-label="Last page" disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)}><ChevronsRight size={13} /></button>
          </div>
        </div>
        {selectedIds.length > 0 && <div className="tm-bulk-bar"><span>{selectedIds.length} team(s) selected</span><button type="button" onClick={() => setPanel("delete")}>Manage selection</button><button type="button" onClick={() => applyBulkStatus("Inactive")}>Deactivate selected</button><button type="button" onClick={() => setSelectedIds([])}>Clear</button></div>}
      </section>

      <section className="tm-workflow-grid">
        <article className="tm-workflow-card">
          <header><b>1</b> Teams List</header>
          <div className="tm-workflow-content"><Users size={23} /><h3>Team Registry</h3><p>Search, filter, select and export organization teams.</p><button type="button" className="tm-btn" onClick={resetFilters}>Reset filters</button><button type="button" className="tm-btn tm-btn-primary" onClick={exportCsv}>Export teams</button></div>
        </article>
        <article className="tm-workflow-card">
          <header><b>2</b> Create Team</header>
          <div className="tm-workflow-content"><UserRoundPlus size={23} /><h3>Create a team</h3><p>Set team code, department, lead and location.</p><button type="button" className="tm-btn tm-btn-primary" onClick={openCreate}><Plus size={13} /> Create Team</button></div>
        </article>
        <article className="tm-workflow-card">
          <header><b>3</b> Team Details</header>
          <div className="tm-workflow-content"><FileText size={23} /><h3>{selected?.name ?? "Select a team"}</h3><p>{selected?.code} · {selected?.department}</p><p>{selected?.members} members · {selected?.projects} projects</p><button type="button" className="tm-btn" onClick={() => setPanel("details")}>View details</button></div>
        </article>
        <article className="tm-workflow-card">
          <header><b>4</b> Team Members</header>
          <div className="tm-workflow-content"><Users size={23} /><h3>Team Members</h3><p>View team members and their roles.</p><button type="button" className="tm-btn tm-btn-primary" onClick={() => setPanel("members")}>Manage members</button></div>
        </article>
        <article className="tm-workflow-card">
          <header><b>5</b> Team Permissions</header>
          <div className="tm-workflow-content"><LockKeyhole size={23} /><h3>Permissions</h3><p>Review module-level access for this team.</p><button type="button" className="tm-btn" onClick={() => setPanel("permissions")}>View permissions</button></div>
        </article>
        <article className="tm-workflow-card">
          <header><b>6</b> Team Hierarchy</header>
          <div className="tm-workflow-content"><GitBranch size={23} /><h3>Team Hierarchy</h3><p>View parent and child team relationships.</p><button type="button" className="tm-btn" onClick={() => setPanel("hierarchy")}>Open hierarchy</button></div>
        </article>
        <article className="tm-workflow-card">
          <header><b>7</b> Team Settings</header>
          <div className="tm-workflow-content"><Settings2 size={23} /><h3>General Settings</h3><p>Manage invitations, task access and approvals.</p><button type="button" className="tm-btn" onClick={() => setPanel("settings")}>Open settings</button></div>
        </article>
        <article className="tm-workflow-card">
          <header><b>8</b> Delete Team</header>
          <div className="tm-workflow-content"><Trash2 size={23} /><h3>Deactivate / Delete</h3><p>Review the selected team before taking action.</p><button type="button" className="tm-btn tm-btn-danger" onClick={() => setPanel("delete")}>Manage team</button></div>
        </article>
        <article className="tm-workflow-card">
          <header><b>9</b> Audit Log</header>
          <div className="tm-workflow-content"><Clock3 size={23} /><h3>Audit Log</h3><p>Review changes, membership and permission activity.</p><button type="button" className="tm-btn" onClick={() => setPanel("audit")}>View audit log</button></div>
        </article>
      </section>

      {panel && (
        <div className="tm-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setPanel(null); }}>
          <section className={`tm-modal ${["details", "members", "permissions", "hierarchy", "audit"].includes(panel) ? "tm-modal-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="tm-modal-title">
            <header className="tm-modal-header">
              <div><h2 id="tm-modal-title">
                {panel === "create" ? "Create Team" : panel === "edit" ? "Edit Team" : panel === "details" ? "Team Details" : panel === "members" ? "Team Members" : panel === "permissions" ? "Team Permissions" : panel === "hierarchy" ? "Team Hierarchy" : panel === "settings" ? "Team Settings" : panel === "audit" ? "Audit Log" : "Delete Team (Confirmation)"}
              </h2><p>{selected?.name ?? "Organization team management"}</p></div>
              <button type="button" aria-label="Close dialog" onClick={() => setPanel(null)}><X size={16} /></button>
            </header>

            {(panel === "create" || panel === "edit") && (
              <form className="tm-form" onSubmit={saveTeam}>
                {formError && <div className="tm-error">{formError}</div>}
                <div className="tm-form-grid">
                  <Field label="Team Code" required><input autoFocus maxLength={30} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. PLAT-DEV" /></Field>
                  <Field label="Team Name" required><input maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Platform Development" /></Field>
                  <Field label="Department" required><select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}><option value="">Select Department</option>{departments.map((item) => <option key={item}>{item}</option>)}</select></Field>
                  <Field label="Parent Team"><select value={form.parentTeam} onChange={(e) => setForm({ ...form, parentTeam: e.target.value })}><option value="">No parent team</option>{teams.filter((team) => team.id !== selectedId).map((team) => <option key={team.id}>{team.name}</option>)}</select></Field>
                  <Field label="Location"><select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}><option>Head Office - Noida</option><option>Bhopal Office</option><option>Remote</option><option>Other</option></select></Field>
                  <Field label="Team Lead" required><input maxLength={100} value={form.lead} onChange={(e) => setForm({ ...form, lead: e.target.value })} placeholder="Full name" /></Field>
                  <Field label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TeamStatus })}><option>Active</option><option>Inactive</option></select></Field>
                  <div className="tm-form-full"><Field label="Description"><textarea rows={3} maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description about the team" /></Field><small>{form.description.length}/500 characters</small></div>
                </div>
                <footer className="tm-modal-footer"><button type="button" className="tm-btn" onClick={() => setPanel(null)}>Cancel</button><button type="submit" className="tm-btn tm-btn-primary"><Check size={13} />{panel === "create" ? "Create Team" : "Save Changes"}</button></footer>
              </form>
            )}

            {panel === "details" && selected && (
              <div className="tm-modal-body">
                <div className="tm-team-summary"><div className="tm-team-avatar">{selected.code.slice(0, 2)}</div><div><h3>{selected.name}</h3><p>{selected.code} · {selected.department}</p><p>Team Lead: {selected.lead}</p></div><Status value={selected.status} /></div>
                <div className="tm-summary-cards"><article><span>Members</span><strong>{selected.members}</strong></article><article><span>Projects</span><strong>{selected.projects}</strong></article><article><span>Department</span><strong>{selected.department}</strong></article></div>
                <h3 className="tm-section-title">Team Information</h3>
                <dl className="tm-details"><dt>Team Code</dt><dd>{selected.code}</dd><dt>Team Name</dt><dd>{selected.name}</dd><dt>Description</dt><dd>{selected.description}</dd><dt>Department</dt><dd>{selected.department}</dd><dt>Parent Team</dt><dd>{selected.parentTeam}</dd><dt>Location</dt><dd>{selected.location}</dd><dt>Created On</dt><dd>{new Date(`${selected.createdOn}T00:00:00`).toLocaleDateString("en-GB")}</dd><dt>Created By</dt><dd>Mayank Swaroop</dd></dl>
                <footer className="tm-modal-footer"><button type="button" className="tm-btn" onClick={() => setPanel("members")}><Users size={13} /> Team Members</button><button type="button" className="tm-btn tm-btn-primary" onClick={() => openEdit(selected)}><Pencil size={13} /> Edit Team</button></footer>
              </div>
            )}

            {panel === "members" && (
              <div className="tm-modal-body">
                <div className="tm-members-toolbar"><label className="tm-search"><Search size={13} /><input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search team members..." /></label><button type="button" className="tm-btn tm-btn-primary" onClick={() => setNotice("Connect the employee assignment API to add members.")}><Plus size={13} /> Add Member</button></div>
                <div className="tm-subtabs"><button className="active" type="button">Members ({selected?.members ?? 0})</button><button type="button" onClick={() => setNotice("Pending invitations need the invitation API.")}>Pending Invitations</button></div>
                <div className="tm-modal-table-wrap"><table className="tm-modal-table"><thead><tr><th>Member</th><th>Role in Team</th><th>Designation</th><th>Joined On</th><th>Action</th></tr></thead><tbody>{visibleMembers.map((member) => <tr key={member.name}><td><div className="tm-lead"><Avatar name={member.name} /><strong>{member.name}</strong></div></td><td><span className="tm-role">{member.name === selected?.lead ? "Team Lead" : member.role}</span></td><td>{member.designation}</td><td>{member.joined}</td><td><button type="button" className="tm-mini-action" aria-label={`Actions for ${member.name}`} onClick={() => setNotice(`Member actions for ${member.name} need the employee API.`)}><Ellipsis size={14} /></button></td></tr>)}</tbody></table></div>
                <footer className="tm-modal-footer"><button type="button" className="tm-btn" onClick={() => setPanel(null)}>Close</button><span>Showing {visibleMembers.length} sample members</span></footer>
              </div>
            )}

            {panel === "permissions" && (
              <div className="tm-modal-body">
                <div className="tm-subtabs"><button className="active" type="button">Permissions</button><button type="button" onClick={() => setNotice("Inherited permissions require the RBAC backend.")}>Inherited From</button><button type="button" className="tm-add-permission" onClick={() => setNotice("Connect the permission management API to add permissions.")}><Plus size={12} /> Add Permission</button></div>
                <div className="tm-modal-table-wrap"><table className="tm-modal-table"><thead><tr><th>Module</th><th>Access Level</th></tr></thead><tbody>{PERMISSIONS.map(([module, access]) => <tr key={module}><td>{module}</td><td><span className={access === "No Access" ? "tm-no-access" : "tm-access"}>{access}</span></td></tr>)}</tbody></table></div>
                <div className="tm-info-note"><ShieldCheck size={15} /> Displayed permissions are examples. Enforce actual permissions in the API and authorization middleware.</div>
              </div>
            )}

            {panel === "hierarchy" && (
              <div className="tm-modal-body">
                <div className="tm-hierarchy">
                  <div className="tm-hierarchy-node root"><GitBranch size={15} /> IT Division</div>
                  <div className="tm-hierarchy-children">{teams.filter((team) => team.parentTeam === "IT Division").map((team) => <button type="button" key={team.id} className={`tm-hierarchy-node ${team.id === selectedId ? "selected" : ""}`} onClick={() => setSelectedId(team.id)}><strong>{team.name}</strong><small>{team.code} · {team.members} members</small></button>)}</div>
                  <div className="tm-hierarchy-note">Select a team above to inspect it. Save parent-team relationships through your backend when integrating this module.</div>
                </div>
              </div>
            )}

            {panel === "settings" && (
              <div className="tm-modal-body">
                <h3 className="tm-section-title">General Settings</h3>
                <div className="tm-setting-list">
                  {([
                    ["invitations", "Allow members to invite others"],
                    ["projects", "Allow members to create projects"],
                    ["tasks", "Allow members to manage tasks"],
                    ["timesheets", "Allow time logging for this team"],
                    ["approvals", "Require approval for timesheets"],
                    ["dashboard", "Enable team-specific dashboard"],
                    ["directory", "Visible in organization directory"],
                  ] as [keyof typeof settings, string][]).map(([key, label]) => <label key={key}><span>{label}</span><button type="button" role="switch" aria-checked={Boolean(settings[key])} className={`tm-switch ${settings[key] ? "on" : ""}`} onClick={() => toggleSetting(key)}><i /></button></label>)}
                </div>
                <div className="tm-settings-selects">
                  <Field label="Default Task Assignee"><select value={settings.defaultAssignee} onChange={(e) => setSettings({ ...settings, defaultAssignee: e.target.value })}><option>Team Lead</option><option>Project Manager</option><option>Unassigned</option></select></Field>
                  <Field label="Default Project Visibility"><select value={settings.projectVisibility} onChange={(e) => setSettings({ ...settings, projectVisibility: e.target.value })}><option>Team Members</option><option>Organization</option><option>Private</option></select></Field>
                  <Field label="Default Time Approval By"><select value={settings.approvalBy} onChange={(e) => setSettings({ ...settings, approvalBy: e.target.value })}><option>Team Lead</option><option>Project Manager</option><option>Organization Admin</option></select></Field>
                </div>
                <footer className="tm-modal-footer"><button type="button" className="tm-btn" onClick={() => setPanel(null)}>Cancel</button><button type="button" className="tm-btn tm-btn-primary" onClick={() => { setPanel(null); setNotice("Settings saved in the current demo state. Persist them through your settings API."); }}>Save Settings</button></footer>
              </div>
            )}

            {panel === "delete" && selected && (
              <div className="tm-modal-body tm-delete-body">
                <div className="tm-danger-icon"><Trash2 size={23} /></div><h3>Delete Team</h3><p>Are you sure you want to delete the team <strong>{selected.name}</strong> ({selected.code})?</p><p>This action can affect associated members, projects, tasks and documents. Review dependencies before permanent deletion.</p>
                <div className="tm-delete-warning">Recommended: deactivate the team to preserve its historical records.</div>
                <footer className="tm-modal-footer"><button type="button" className="tm-btn" onClick={() => setPanel(null)}>Cancel</button><button type="button" className="tm-btn" onClick={() => { setTeams((previous) => previous.map((team) => team.id === selected.id ? { ...team, status: "Inactive" } : team)); setPanel(null); setNotice("Team deactivated in the current demo state."); }}>Deactivate</button><button type="button" className="tm-btn tm-btn-danger" onClick={confirmDelete}><Trash2 size={13} /> Delete Team</button></footer>
              </div>
            )}

            {panel === "audit" && (
              <div className="tm-modal-body">
                <div className="tm-audit-filters"><label>Team<select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.code} - {team.name}</option>)}</select></label><label>Date Range<select defaultValue="month"><option value="month">01 May 2025 - 31 May 2025</option><option value="all">All activity</option></select></label><button type="button" className="tm-btn" onClick={() => setNotice("Audit log filters require the audit API.")}><Filter size={12} /> Filters</button></div>
                <div className="tm-modal-table-wrap"><table className="tm-modal-table"><thead><tr><th>Date & Time</th><th>Action</th><th>Performed By</th><th>Details</th></tr></thead><tbody>{AUDIT.map((item) => <tr key={item[0]}>{item.map((cell, i) => <td key={i}>{cell}</td>)}</tr>)}</tbody></table></div>
                <footer className="tm-modal-footer"><button type="button" className="tm-btn" onClick={() => setPanel(null)}>Close</button><span>Sample audit records</span></footer>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
