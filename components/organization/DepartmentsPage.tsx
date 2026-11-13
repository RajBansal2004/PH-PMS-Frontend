
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleHelp,
  Clock3,
  Ellipsis,
  Eye,
  FileText,
  Filter,
  FolderKanban,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  Users,
  UserRound,
  UserRoundPlus,
  X,
} from "lucide-react";
import "./departments.css";

type Department = {
  id: string;
  name: string;
  code: string;
  head: string;
  role: string;
  employees: number;
  projects: number;
  budget: number;
  status: "Active" | "Inactive";
  createdOn: string;
  location: string;
  parent: string;
  description: string;
};

const INITIAL_DEPARTMENTS: Department[] = [
  { id: "D-001", name: "Product & Strategy", code: "PST", head: "Rahul Verma", role: "Director", employees: 22, projects: 8, budget: 12500000, status: "Active", createdOn: "2018-01-12", location: "Head Office - Indore", parent: "—", description: "Product strategy, planning and business innovation." },
  { id: "D-002", name: "Engineering / Development", code: "ENG", head: "Amit Kumar", role: "Head - Engineering", employees: 48, projects: 14, budget: 28000000, status: "Active", createdOn: "2018-01-12", location: "Head Office - Indore", parent: "Product & Strategy", description: "Core development team for all products." },
  { id: "D-003", name: "Quality Assurance", code: "QA", head: "Sneha Iyer", role: "QA Manager", employees: 18, projects: 10, budget: 9500000, status: "Active", createdOn: "2018-03-15", location: "Head Office - Indore", parent: "Engineering / Development", description: "Quality assurance, testing and release validation." },
  { id: "D-004", name: "UI/UX & Design", code: "UXD", head: "Neha Patel", role: "Design Lead", employees: 12, projects: 7, budget: 7500000, status: "Active", createdOn: "2018-03-20", location: "Head Office - Indore", parent: "Product & Strategy", description: "Product experience, design systems and user research." },
  { id: "D-005", name: "Business Analysis", code: "BA", head: "Vikram Singh", role: "BA Manager", employees: 10, projects: 6, budget: 6000000, status: "Active", createdOn: "2018-04-10", location: "Bhopal Office", parent: "Product & Strategy", description: "Business requirements, process analysis and documentation." },
  { id: "D-006", name: "Implementation", code: "IMP", head: "Pooja Sharma", role: "Implementation Head", employees: 16, projects: 9, budget: 9000000, status: "Active", createdOn: "2018-05-05", location: "Bhopal Office", parent: "Engineering / Development", description: "Client onboarding, deployment and implementation." },
  { id: "D-007", name: "Support & Maintenance", code: "SUP", head: "Karan Mehta", role: "Support Manager", employees: 14, projects: 6, budget: 5000000, status: "Active", createdOn: "2018-06-20", location: "Bhopal Office", parent: "Implementation", description: "Customer support, maintenance and incident resolution." },
  { id: "D-008", name: "Sales & Marketing", code: "S&M", head: "Rohit Agarwal", role: "Sales Head", employees: 20, projects: 8, budget: 14000000, status: "Active", createdOn: "2018-08-12", location: "Head Office - Indore", parent: "Product & Strategy", description: "Sales operations, marketing and customer acquisition." },
  { id: "D-009", name: "Human Resources", code: "HR", head: "Anjali Gupta", role: "HR Manager", employees: 8, projects: 3, budget: 3000000, status: "Active", createdOn: "2018-09-01", location: "Head Office - Indore", parent: "—", description: "Hiring, employee relations and HR operations." },
  { id: "D-010", name: "Finance & Accounts", code: "FIN", head: "Saurabh Jain", role: "Finance Head", employees: 6, projects: 2, budget: 2000000, status: "Active", createdOn: "2018-09-01", location: "Head Office - Indore", parent: "—", description: "Financial planning, accounts and compliance." },
  { id: "D-011", name: "Admin & Operations", code: "ADM", head: "Rajesh Kumar", role: "Admin Manager", employees: 6, projects: 2, budget: 1500000, status: "Active", createdOn: "2018-10-15", location: "Head Office - Indore", parent: "—", description: "Administration, facilities and daily operations." },
  { id: "D-012", name: "Research & Innovation", code: "R&D", head: "Dr. Priya Nair", role: "Innovation Lead", employees: 4, projects: 2, budget: 2500000, status: "Inactive", createdOn: "2024-01-10", location: "Remote", parent: "Product & Strategy", description: "Research, experimentation and innovation projects." },
];

const TEAM = [
  { name: "Amit Kumar", role: "Head - Engineering", type: "Full Time" },
  { name: "Rahul Verma", role: "Senior Developer", type: "Full Time" },
  { name: "Sneha Iyer", role: "QA Engineer", type: "Full Time" },
  { name: "Vikram Singh", role: "DevOps Engineer", type: "Full Time" },
  { name: "Arjun Mehta", role: "Frontend Developer", type: "Full Time" },
  { name: "Priya Shah", role: "Backend Developer", type: "Full Time" },
];

type Panel = "create" | "details" | "edit" | "team" | "deactivate" | "bulk" | null;

const EMPTY_FORM = {
  name: "",
  code: "",
  head: "",
  role: "",
  parent: "",
  location: "Head Office - Indore",
  description: "",
  status: "Active" as "Active" | "Inactive",
  budget: "0",
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    notation: value >= 10000000 ? "compact" : "standard",
  }).format(value);
}

function Status({ value }: { value: Department["status"] }) {
  return <span className={`dp-status ${value === "Active" ? "active" : "inactive"}`}>{value}</span>;
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  return <span className="dp-avatar" aria-hidden="true">{initials}</span>;
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
    <label className="dp-field">
      <span>{label}{required && <b> *</b>}</span>
      {children}
    </label>
  );
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState(INITIAL_DEPARTMENTS);
  const [selectedId, setSelectedId] = useState("D-002");
  const [panel, setPanel] = useState<Panel>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "active" | "inactive">("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [headFilter, setHeadFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [deletePermanently, setDeletePermanently] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  const selected = departments.find((item) => item.id === selectedId) ?? departments[0];
  const activeCount = departments.filter((item) => item.status === "Active").length;
  const inactiveCount = departments.length - activeCount;
  const totalEmployees = departments.reduce((sum, item) => sum + item.employees, 0);
  const totalProjects = departments.reduce((sum, item) => sum + item.projects, 0);
  const avgTeam = departments.length ? totalEmployees / departments.length : 0;

  const locations = useMemo(() => [...new Set(departments.map((item) => item.location))], [departments]);
  const heads = useMemo(() => [...new Set(departments.map((item) => item.head))], [departments]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return departments.filter((item) => {
      const matchesSearch = !search || [
        item.name, item.code, item.head, item.role, item.description,
      ].some((value) => value.toLowerCase().includes(search));
      const matchesTab = tab === "all" || (tab === "active" ? item.status === "Active" : item.status === "Inactive");
      return matchesSearch && matchesTab &&
        (locationFilter === "all" || item.location === locationFilter) &&
        (headFilter === "all" || item.head === headFilter) &&
        (statusFilter === "all" || item.status === statusFilter);
    });
  }, [departments, query, tab, locationFilter, headFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const distribution = [
    { name: "Engineering", value: 25, color: "#155eef" },
    { name: "Product", value: 18, color: "#079455" },
    { name: "Sales & Marketing", value: 17, color: "#f79009" },
    { name: "QA", value: 10, color: "#875bf7" },
    { name: "Implementation", value: 8, color: "#f04438" },
    { name: "Others", value: 22, color: "#98a2b3" },
  ];

  const teamSize = [
    { name: "Engineering", count: 48 },
    { name: "Product", count: 22 },
    { name: "Sales & Marketing", count: 20 },
    { name: "QA", count: 18 },
    { name: "Implementation", count: 16 },
    { name: "Support", count: 14 },
  ];

  const projectBars = [
    { code: "ENG", value: 14 },
    { code: "QA", value: 10 },
    { code: "IMP", value: 9 },
    { code: "PST", value: 8 },
    { code: "S&M", value: 8 },
  ];

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError("");
    setPanel("create");
  }

  function openEdit(item: Department) {
    setSelectedId(item.id);
    setForm({
      name: item.name,
      code: item.code,
      head: item.head,
      role: item.role,
      parent: item.parent === "—" ? "" : item.parent,
      location: item.location,
      description: item.description,
      status: item.status,
      budget: String(item.budget),
    });
    setFormError("");
    setPanel("edit");
  }

  function saveDepartment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.code.trim() || !form.head.trim()) {
      setFormError("Department Name, Department Code and Department Head are required.");
      return;
    }

    const duplicate = departments.some((item) =>
      item.code.toLowerCase() === form.code.trim().toLowerCase() &&
      (panel === "create" || item.id !== selectedId)
    );
    if (duplicate) {
      setFormError("This department code is already in use.");
      return;
    }

    if (panel === "edit" && selected) {
      setDepartments((previous) => previous.map((item) => item.id === selected.id ? {
        ...item,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        head: form.head.trim(),
        role: form.role.trim() || "Department Head",
        parent: form.parent || "—",
        location: form.location,
        description: form.description.trim(),
        status: form.status,
        budget: Math.max(0, Number(form.budget) || 0),
      } : item));
      setNotice("Department updated in the current view.");
    } else {
      const newId = `D-${String(Date.now()).slice(-5)}`;
      const item: Department = {
        id: newId,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        head: form.head.trim(),
        role: form.role.trim() || "Department Head",
        parent: form.parent || "—",
        location: form.location,
        description: form.description.trim(),
        status: form.status,
        budget: Math.max(0, Number(form.budget) || 0),
        employees: 0,
        projects: 0,
        createdOn: new Date().toISOString().slice(0, 10),
      };
      setDepartments((previous) => [item, ...previous]);
      setSelectedId(newId);
      setNotice("Department created in the current view.");
      setPage(1);
    }
    setPanel(null);
  }

  function confirmDeactivate() {
    if (!selected) return;
    if (deletePermanently) {
      setDepartments((previous) => previous.filter((item) => item.id !== selected.id));
      setSelectedId(departments.find((item) => item.id !== selected.id)?.id ?? "");
      setNotice("Department removed from the current demo view.");
    } else {
      setDepartments((previous) => previous.map((item) =>
        item.id === selected.id ? { ...item, status: "Inactive" } : item
      ));
      setNotice("Department marked inactive in the current demo view.");
    }
    setPanel(null);
  }

  function applyBulk() {
    if (!selectedIds.length) {
      setNotice("Select at least one department first.");
      return;
    }
    setDepartments((previous) => previous.map((item) =>
      selectedIds.includes(item.id) ? { ...item, status: "Inactive" } : item
    ));
    setNotice(`${selectedIds.length} selected department(s) marked inactive in the current demo view.`);
    setSelectedIds([]);
    setPanel(null);
  }

  function exportCsv() {
    const header = ["Department", "Code", "Head", "Employees", "Active Projects", "Budget", "Status", "Location", "Created On"];
    const csvRows = filtered.map((item) => [
      item.name, item.code, item.head, item.employees, item.projects,
      item.budget, item.status, item.location, item.createdOn,
    ]);
    const csv = [header, ...csvRows].map((row) =>
      row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
    ).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "departments.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice(`Exported ${filtered.length} departments to CSV.`);
  }

  function toggleSelected(id: string) {
    setSelectedIds((previous) => previous.includes(id)
      ? previous.filter((value) => value !== id)
      : [...previous, id]
    );
  }

  function resetFilters() {
    setQuery("");
    setTab("all");
    setLocationFilter("all");
    setHeadFilter("all");
    setStatusFilter("all");
    setPage(1);
  }

  const filteredTeam = TEAM.filter((member) =>
    `${member.name} ${member.role}`.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <main className="dp-page">
      <header className="dp-header">
        <div>
          <div className="dp-breadcrumb"><span>Organization</span><ChevronRight size={12} /><span>Departments</span></div>
          <h1>Departments</h1>
        </div>
        <div className="dp-header-actions">
          <label className="dp-global-search"><Search size={14} /><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search departments..." /></label>
          <button type="button" className="dp-btn dp-btn-primary" onClick={openCreate}><Plus size={15} /> Create Department</button>
          <button type="button" className="dp-icon-btn" aria-label="Notifications" onClick={() => setNotice("Notifications panel is not connected yet.")}><Bell size={17} /><i>12</i></button>
          <button type="button" className="dp-profile" onClick={() => setNotice("Signed in as Mayank Swaroop · Super Admin.")}><Avatar name="Mayank Swaroop" /><span><strong>Mayank Swaroop</strong><small>Super Admin</small></span><ChevronDown size={12} /></button>
          <button type="button" className="dp-icon-btn" aria-label="Quick create" onClick={openCreate}><Plus size={16} /></button>
        </div>
      </header>

      {notice && <div className="dp-notice" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss"><X size={14} /></button></div>}

      <section className="dp-metrics">
        <article><span className="dp-kpi-icon blue"><Users size={17} /></span><label>Total Departments</label><strong>{departments.length}</strong><small className="positive">＋ Department directory</small></article>
        <article><span className="dp-kpi-icon green"><Check size={17} /></span><label>Active Departments</label><strong>{activeCount}</strong><small className="positive">{departments.length ? (activeCount / departments.length * 100).toFixed(1) : "0"}% of total</small></article>
        <article><span className="dp-kpi-icon purple"><UserRound size={17} /></span><label>Total Employees</label><strong>{totalEmployees}</strong><small className="positive">Across all departments</small></article>
        <article><span className="dp-kpi-icon blue"><Activity size={17} /></span><label>Avg. Team Size</label><strong>{avgTeam.toFixed(1)}</strong><small>Across all departments</small></article>
        <article><span className="dp-kpi-icon gray"><FolderKanban size={17} /></span><label>Departments with Projects</label><strong>{departments.filter((item) => item.projects > 0).length} / {departments.length}</strong><small className="positive">Project allocation</small></article>
        <article><span className="dp-kpi-icon orange"><UserRoundPlus size={17} /></span><label>Open Positions</label><strong>8</strong><small>Hiring in progress</small></article>
      </section>

      <div className="dp-layout">
        <section className="dp-main">
          <div className="dp-list-toolbar">
            <div className="dp-tabs">
              <button className={tab === "all" ? "active" : ""} type="button" onClick={() => { setTab("all"); setPage(1); }}>All Departments ({departments.length})</button>
              <button className={tab === "active" ? "active" : ""} type="button" onClick={() => { setTab("active"); setPage(1); }}>Active ({activeCount})</button>
              <button className={tab === "inactive" ? "active" : ""} type="button" onClick={() => { setTab("inactive"); setPage(1); }}>Inactive ({inactiveCount})</button>
            </div>
            <div className="dp-filters">
              <select aria-label="Filter by location" value={locationFilter} onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }}>
                <option value="all">All Locations</option>
                {locations.map((item) => <option key={item}>{item}</option>)}
              </select>
              <select aria-label="Filter by head" value={headFilter} onChange={(e) => { setHeadFilter(e.target.value); setPage(1); }}>
                <option value="all">All Heads</option>
                {heads.map((item) => <option key={item}>{item}</option>)}
              </select>
              <select aria-label="Filter by status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="all">All Status</option><option>Active</option><option>Inactive</option>
              </select>
              <button type="button" className="dp-btn dp-btn-small" onClick={resetFilters}>Reset</button>
            </div>
          </div>

          <div className="dp-table-wrap">
            <table className="dp-table">
              <thead><tr>
                <th><input aria-label="Select all visible departments" type="checkbox" checked={rows.length > 0 && rows.every((item) => selectedIds.includes(item.id))} onChange={(e) => setSelectedIds((previous) => e.target.checked ? [...new Set([...previous, ...rows.map((item) => item.id)])] : previous.filter((id) => !rows.some((item) => item.id === id)))} /></th>
                <th>Department Name</th><th>Code</th><th>Head / Manager</th><th>Employees</th><th>Active Projects</th><th>Budget (YTD)</th><th>Status</th><th>Created On</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {rows.map((item, index) => (
                  <tr key={item.id}>
                    <td>{(currentPage - 1) * pageSize + index + 1}</td>
                    <td><div className="dp-dept-name"><span><Building2 size={15} /></span><strong>{item.name}</strong></div></td>
                    <td>{item.code}</td>
                    <td><div className="dp-manager"><Avatar name={item.head} /><span><strong>{item.head}</strong><small>{item.role}</small></span></div></td>
                    <td>{item.employees}</td><td>{item.projects}</td><td>{money(item.budget)}</td>
                    <td><Status value={item.status} /></td>
                    <td>{new Date(`${item.createdOn}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td><div className="dp-row-actions">
                      <button type="button" title="View details" aria-label={`View ${item.name}`} onClick={() => { setSelectedId(item.id); setPanel("details"); }}><Eye size={14} /></button>
                      <button type="button" title="Edit" aria-label={`Edit ${item.name}`} onClick={() => openEdit(item)}><Pencil size={14} /></button>
                      <button type="button" title="Team & resources" aria-label={`Team ${item.name}`} onClick={() => { setSelectedId(item.id); setPanel("team"); }}><Users size={14} /></button>
                      <button type="button" title="More actions" aria-label={`More actions ${item.name}`} onClick={() => { setSelectedId(item.id); setPanel("deactivate"); setDeletePermanently(false); }}><Ellipsis size={15} /></button>
                      <input aria-label={`Select ${item.name}`} type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelected(item.id)} />
                    </div></td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={10} className="dp-empty">No departments found. Try changing the filters.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="dp-table-footer">
            <span>Showing {filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} departments</span>
            <div className="dp-pagination">
              <label>Rows per page:
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  <option value={10}>10</option><option value={12}>12</option><option value={20}>20</option><option value={50}>50</option>
                </select>
              </label>
              <button type="button" aria-label="First page" disabled={currentPage <= 1} onClick={() => setPage(1)}><ChevronsLeft size={13} /></button>
              <button type="button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={13} /></button>
              <span>{currentPage}</span>
              <button type="button" aria-label="Next page" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight size={13} /></button>
              <button type="button" aria-label="Last page" disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)}><ChevronsRight size={13} /></button>
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="dp-bulk-strip">
              <span>{selectedIds.length} department(s) selected</span>
              <button type="button" onClick={() => setPanel("bulk")}><Settings2 size={14} /> Bulk Actions</button>
              <button type="button" onClick={() => setSelectedIds([])}>Clear selection</button>
            </div>
          )}
        </section>

        <aside className="dp-aside">
          <section className="dp-card">
            <div className="dp-card-heading"><h2>Department Distribution</h2></div>
            <div className="dp-donut-layout">
              <div className="dp-donut"><div><strong>{departments.length}</strong><small>Total</small></div></div>
              <div className="dp-legend">{distribution.map((item) => <div key={item.name}><span><i style={{ background: item.color }} />{item.name}</span><strong>{item.value}%</strong></div>)}</div>
            </div>
          </section>

          <section className="dp-card">
            <div className="dp-card-heading"><h2>Team Size by Department</h2></div>
            <div className="dp-team-bars">{teamSize.map((item) => <div key={item.name}><span>{item.name}</span><div><i style={{ width: `${item.count / 48 * 100}%` }} /></div><strong>{item.count}</strong></div>)}</div>
            <button type="button" className="dp-card-link" onClick={() => setNotice("Team analytics will open when the analytics route is connected.")}>View Team Analytics <ArrowUpRight size={12} /></button>
          </section>

          <section className="dp-card">
            <div className="dp-card-heading"><h2>Projects by Department</h2></div>
            <div className="dp-project-bars">{projectBars.map((item) => <div key={item.code}><strong>{item.value}</strong><i style={{ height: `${item.value / 14 * 65}px` }} /><span>{item.code}</span></div>)}</div>
            <Link href="/projects" className="dp-card-link">View Project Mapping <ArrowUpRight size={12} /></Link>
          </section>
        </aside>
      </div>

      {panel && (
        <div className="dp-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setPanel(null); }}>
          <section className={`dp-modal ${panel === "details" || panel === "team" ? "dp-modal-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="dp-modal-title">
            <header className="dp-modal-header">
              <div><h2 id="dp-modal-title">
                {panel === "create" ? "Create Department" :
                 panel === "edit" ? "Edit Department" :
                 panel === "details" ? "Department Details" :
                 panel === "team" ? "Team & Resources" :
                 panel === "bulk" ? "Bulk Actions" : "Deactivate / Delete Department"}
              </h2>
              <p>{panel === "create" ? "Add a department to your organization." : selected?.name}</p></div>
              <button type="button" onClick={() => setPanel(null)} aria-label="Close dialog"><X size={17} /></button>
            </header>

            {(panel === "create" || panel === "edit") && (
              <form className="dp-form" onSubmit={saveDepartment}>
                {formError && <div className="dp-form-error">{formError}</div>}
                <div className="dp-form-grid">
                  <Field label="Department Name" required><input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Engineering" maxLength={100} /></Field>
                  <Field label="Department Code" required><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. ENG" maxLength={12} /></Field>
                  <Field label="Department Head" required><input value={form.head} onChange={(e) => setForm({ ...form, head: e.target.value })} placeholder="Full name" maxLength={100} /></Field>
                  <Field label="Head Designation"><input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Engineering Head" maxLength={100} /></Field>
                  <Field label="Parent Department"><select value={form.parent} onChange={(e) => setForm({ ...form, parent: e.target.value })}><option value="">No parent department</option>{departments.filter((item) => item.id !== selectedId).map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></Field>
                  <Field label="Location"><select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}><option>Head Office - Indore</option><option>Bhopal Office</option><option>Remote</option><option>Other</option></select></Field>
                  <Field label="Annual Budget (INR)"><input type="number" min="0" step="1000" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></Field>
                  <Field label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "Active" | "Inactive" })}><option>Active</option><option>Inactive</option></select></Field>
                  <div className="dp-form-full"><Field label="Description"><textarea rows={3} maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the department's responsibilities..." /></Field><small>{form.description.length}/500 characters</small></div>
                </div>
                <footer className="dp-modal-footer"><button type="button" className="dp-btn" onClick={() => setPanel(null)}>Cancel</button><button type="submit" className="dp-btn dp-btn-primary"><Check size={14} /> {panel === "create" ? "Create Department" : "Save Changes"}</button></footer>
              </form>
            )}

            {panel === "details" && selected && (
              <div className="dp-detail-body">
                <div className="dp-detail-title"><span><Building2 size={22} /></span><div><h3>{selected.name}</h3><p>{selected.code} · {selected.location}</p></div><Status value={selected.status} /></div>
                <div className="dp-detail-metrics"><article><small>Team Members</small><strong>{selected.employees}</strong></article><article><small>Active Projects</small><strong>{selected.projects}</strong></article><article><small>Budget (YTD)</small><strong>{money(selected.budget)}</strong></article></div>
                <h3 className="dp-section-title">Department Information</h3>
                <dl className="dp-detail-list"><dt>Department Name</dt><dd>{selected.name}</dd><dt>Code</dt><dd>{selected.code}</dd><dt>Department Head</dt><dd>{selected.head} · {selected.role}</dd><dt>Parent Department</dt><dd>{selected.parent}</dd><dt>Location</dt><dd>{selected.location}</dd><dt>Created On</dt><dd>{new Date(`${selected.createdOn}T00:00:00`).toLocaleDateString("en-GB")}</dd><dt>Description</dt><dd>{selected.description || "—"}</dd></dl>
                <footer className="dp-modal-footer"><button type="button" className="dp-btn" onClick={() => setPanel("team")}><Users size={14} /> View Team</button><button type="button" className="dp-btn dp-btn-primary" onClick={() => openEdit(selected)}><Pencil size={14} /> Edit Department</button></footer>
              </div>
            )}

            {panel === "team" && selected && (
              <div className="dp-team-modal">
                <div className="dp-detail-title"><span><Users size={22} /></span><div><h3>{selected.name}</h3><p>{selected.employees} team members · {selected.projects} active projects</p></div><Status value={selected.status} /></div>
                <div className="dp-team-tabs"><button className="active" type="button">Team ({selected.employees})</button><button type="button" onClick={() => setNotice("Project mapping requires the project allocation API.")}>Projects ({selected.projects})</button><button type="button" onClick={() => setNotice("Budget records require the finance API.")}>Budget</button><button type="button" onClick={() => setNotice("Department documents require document storage integration.")}>Documents</button></div>
                <div className="dp-team-toolbar"><label className="dp-global-search"><Search size={13} /><input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search team members..." /></label><button type="button" className="dp-btn dp-btn-primary" onClick={() => setNotice("Connect the employee assignment API to add team members.")}><Plus size={14} /> Add Member</button></div>
                <div className="dp-team-list">{filteredTeam.map((member) => <div key={member.name}><Avatar name={member.name} /><strong>{member.name}</strong><span>{member.role}</span><small>{member.type}</small></div>)}{!filteredTeam.length && <p>No team members match your search.</p>}</div>
                <footer className="dp-modal-footer"><button type="button" className="dp-btn" onClick={() => setPanel(null)}>Close</button><span>Showing {filteredTeam.length} demo members</span></footer>
              </div>
            )}

            {panel === "deactivate" && selected && (
              <div className="dp-confirm-body">
                <div className="dp-warning-icon"><ShieldCheck size={25} /></div>
                <h3>{deletePermanently ? "Delete Department Permanently?" : "Deactivate Department?"}</h3>
                <p>{deletePermanently ? "This removes the department from this demo view. A real system should check dependencies before deletion." : `${selected.name} will be marked inactive. Department records are preserved in this demo view.`}</p>
                <label className="dp-radio-card"><input type="radio" checked={!deletePermanently} onChange={() => setDeletePermanently(false)} /><span><strong>Deactivate (Recommended)</strong><small>Preserve records and mark this department inactive.</small></span></label>
                <label className="dp-radio-card danger"><input type="radio" checked={deletePermanently} onChange={() => setDeletePermanently(true)} /><span><strong>Delete Permanently</strong><small>Potentially destructive; validate dependencies in the backend first.</small></span></label>
                <footer className="dp-modal-footer"><button type="button" className="dp-btn" onClick={() => setPanel(null)}>Cancel</button><button type="button" className={`dp-btn ${deletePermanently ? "dp-btn-danger" : "dp-btn-primary"}`} onClick={confirmDeactivate}>{deletePermanently ? <Trash2 size={14} /> : <ShieldCheck size={14} />}{deletePermanently ? "Delete Department" : "Deactivate"}</button></footer>
              </div>
            )}

            {panel === "bulk" && (
              <div className="dp-confirm-body">
                <h3>Bulk Actions</h3>
                <p>{selectedIds.length} departments selected.</p>
                <label className="dp-field"><span>Action</span><select defaultValue="inactive"><option value="inactive">Change Status</option></select></label>
                <label className="dp-field"><span>Set Status</span><select defaultValue="Inactive"><option>Inactive</option><option>Active</option></select></label>
                <div className="dp-info-box">This demo action marks selected departments inactive. Connect your backend before using this in production.</div>
                <footer className="dp-modal-footer"><button type="button" className="dp-btn" onClick={() => setPanel(null)}>Cancel</button><button type="button" className="dp-btn dp-btn-primary" onClick={applyBulk}>Apply</button></footer>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
