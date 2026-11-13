"use client";

import { useMemo, useState } from "react";
import {
  Activity, ArrowLeft, ArrowRight, Bell, CalendarDays, Check,
  CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  ClipboardList, Clock3, FileText, FolderKanban, Grid2X2,
  MoreHorizontal, Plus, Search, ShieldCheck, Users, Wallet,
  Menu, Building2, ChartNoAxesCombined, Upload
} from "lucide-react";
import "./client-projects.css";

type Project = {
  code: string;
  name: string;
  type: string;
  manager: string;
  status: "In Progress" | "Completed" | "On Hold" | "Cancelled";
  priority: "High" | "Medium" | "Low";
  progress: number;
  start: string;
  end: string;
  revenue: string;
};

const initialProjects: Project[] = [
  { code: "PRJ-00075", name: "AI-CMS Implementation", type: "Implementation", manager: "Rahul Verma", status: "In Progress", priority: "High", progress: 72, start: "01 Jan 2025", end: "30 Jun 2025", revenue: "₹ 26,40,000" },
  { code: "PRJ-00064", name: "Mobile App Development", type: "Development", manager: "Neha Patel", status: "In Progress", priority: "High", progress: 45, start: "15 Feb 2025", end: "15 Aug 2025", revenue: "₹ 18,00,000" },
  { code: "PRJ-00058", name: "Hospital Website Revamp", type: "Development", manager: "Amit Kumar", status: "Completed", priority: "Medium", progress: 100, start: "01 Dec 2024", end: "31 Mar 2025", revenue: "₹ 9,80,000" },
  { code: "PRJ-00043", name: "Data Migration to Cloud", type: "Migration", manager: "Vikram Singh", status: "In Progress", priority: "Medium", progress: 60, start: "01 Mar 2025", end: "31 May 2025", revenue: "₹ 5,90,000" },
  { code: "PRJ-00031", name: "Support & Maintenance", type: "Support", manager: "Pooja Singh", status: "In Progress", priority: "Low", progress: 30, start: "01 Apr 2025", end: "31 Mar 2026", revenue: "₹ 1,20,000" },
  { code: "PRJ-00029", name: "EMR Integration", type: "Integration", manager: "Rahul Verma", status: "On Hold", priority: "High", progress: 15, start: "10 Apr 2025", end: "10 Aug 2025", revenue: "₹ 0" },
  { code: "PRJ-00012", name: "Patient Portal Development", type: "Development", manager: "Neha Patel", status: "Completed", priority: "Medium", progress: 100, start: "01 Oct 2024", end: "31 Jan 2025", revenue: "₹ 0" },
  { code: "PRJ-00005", name: "Infrastructure Setup", type: "Internal", manager: "Amit Kumar", status: "Completed", priority: "Low", progress: 100, start: "01 Sep 2024", end: "30 Sep 2024", revenue: "₹ 0" },
];

const tabs = ["Overview", "Team", "Milestones", "Tasks", "Documents", "Finance", "Timeline", "Activity"];

const taskRows = [
  "1. Project Initiation", "Kick-off Meeting", "Requirement Gathering",
  "SOW & Planning", "2. System Design", "UI/UX Design",
  "System Architecture", "3. Development", "Module Development",
  "Integration", "4. Testing", "System Testing", "Deployment", "Go Live"
];

const team = [
  ["Rahul Verma", "Project Manager", "rahul.verma@pehalhealth.com", "100%"],
  ["Neha Patel", "Business Analyst", "neha.patel@pehalhealth.com", "80%"],
  ["Amit Kumar", "Tech Lead", "amit.kumar@pehalhealth.com", "100%"],
  ["Vikram Singh", "Developer", "vikram.singh@pehalhealth.com", "100%"],
  ["Pooja Sharma", "QA Engineer", "pooja.sharma@pehalhealth.com", "75%"],
  ["Anil Kumar", "UI/UX Designer", "anil.kumar@pehalhealth.com", "75%"],
];

const documents = [
  ["Project Charter.pdf", "Planning", "PDF", "Rahul Verma", "10 May 2025", "245 KB"],
  ["SOW_ApolloHospitals.pdf", "Contract", "PDF", "Rahul Verma", "10 May 2025", "512 KB"],
  ["Requirement Specification.docx", "Requirements", "DOCX", "Neha Patel", "15 May 2025", "134 KB"],
  ["UI Design Overview.pdf", "Design", "PDF", "Anil Kumar", "20 May 2025", "2.1 MB"],
  ["Architecture Diagram.vsdx", "Design", "VSDX", "Amit Kumar", "22 May 2025", "1.4 MB"],
  ["Test Plan.xlsx", "Testing", "XLSX", "Pooja Sharma", "25 May 2025", "98 KB"],
  ["Deployment Guide.pdf", "Deployment", "PDF", "Cloud Infra", "01 Jun 2025", "678 KB"],
];

const audit = [
  ["10 May 2025, 10:35 AM", "Project status changed from On Hold to In Progress", "Rahul Verma", "PRJ-00075"],
  ["10 May 2025, 10:30 AM", "New document uploaded: SOW_ApolloHospitals.pdf", "Rahul Verma", "PRJ-00075"],
  ["09 May 2025, 04:20 PM", "Milestone “System Design” marked as completed", "Amit Kumar", "PRJ-00075"],
  ["09 May 2025, 03:15 PM", "Task updated: Database Integration", "Vikram Singh", "PRJ-00064"],
  ["08 May 2025, 11:40 AM", "New team member added: Anil Kumar", "Rahul Verma", "PRJ-00075"],
];

function Status({ value }: { value: Project["status"] }) {
  return <span className={`cp-status ${value.toLowerCase().replaceAll(" ", "-")}`}>{value}</span>;
}

function Priority({ value }: { value: Project["priority"] }) {
  return <span className={`cp-priority ${value.toLowerCase()}`}>{value}</span>;
}

function Progress({ value }: { value: number }) {
  return <div className="cp-progress"><span><i style={{ width: `${value}%` }} /></span><b>{value}%</b></div>;
}

function Panel({ title, icon, action, children, className = "" }: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`cp-panel ${className}`}>
      <div className="cp-panel-head"><h3>{icon}{title}</h3>{action}</div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="cp-field"><span>{label}</span>{children}</label>;
}

export default function ClientProjects() {
  const [projects, setProjects] = useState(initialProjects);
  const [selected, setSelected] = useState(initialProjects[0]);
  const [activeTab, setActiveTab] = useState("Overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [managerFilter, setManagerFilter] = useState("All Managers");
  const [priorityFilter, setPriorityFilter] = useState("All Priorities");
  const [createStep, setCreateStep] = useState(1);
  const [projectForm, setProjectForm] = useState({
    type: "Implementation",
    code: "PRJ-00076",
    name: "",
    client: "Apollo Hospitals (CLT-00086)",
    description: "",
    start: "2025-07-01",
    end: "2025-12-30",
    manager: "Rahul Verma",
    priority: "High",
    budget: "3600000",
  });
  const [documentSearch, setDocumentSearch] = useState("");
  const [docCategory, setDocCategory] = useState("All Categories");
  const [toast, setToast] = useState("");

  const filtered = useMemo(() => projects.filter((p) =>
    `${p.name} ${p.code} ${p.manager}`.toLowerCase().includes(search.toLowerCase()) &&
    (statusFilter === "All Status" || p.status === statusFilter) &&
    (typeFilter === "All Types" || p.type === typeFilter) &&
    (managerFilter === "All Managers" || p.manager === managerFilter) &&
    (priorityFilter === "All Priorities" || p.priority === priorityFilter)
  ), [projects, search, statusFilter, typeFilter, managerFilter, priorityFilter]);

  const filteredDocs = documents.filter((d) =>
    d[0].toLowerCase().includes(documentSearch.toLowerCase()) &&
    (docCategory === "All Categories" || d[1] === docCategory)
  );

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  }

  function createProject() {
    if (!projectForm.name.trim()) {
      notify("Please enter Project Name");
      setCreateStep(1);
      return;
    }

    const project: Project = {
      code: projectForm.code,
      name: projectForm.name,
      type: projectForm.type,
      manager: projectForm.manager,
      status: "In Progress",
      priority: projectForm.priority as Project["priority"],
      progress: 0,
      start: new Date(projectForm.start).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric"
      }),
      end: new Date(projectForm.end).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric"
      }),
      revenue: `₹ ${(Number(projectForm.budget) || 0).toLocaleString("en-IN")}`,
    };

    setProjects((old) => [project, ...old]);
    setSelected(project);
    setCreateStep(1);
    setProjectForm({
      type: "Implementation",
      code: `PRJ-${String(projects.length + 76).padStart(5, "0")}`,
      name: "",
      client: "Apollo Hospitals (CLT-00086)",
      description: "",
      start: "2025-07-01",
      end: "2025-12-30",
      manager: "Rahul Verma",
      priority: "High",
      budget: "3600000",
    });
    notify("Project created successfully");
  }

  const counts = {
    total: projects.length,
    active: projects.filter((p) => p.status === "In Progress").length,
    completed: projects.filter((p) => p.status === "Completed").length,
    hold: projects.filter((p) => p.status === "On Hold").length,
    cancelled: projects.filter((p) => p.status === "Cancelled").length,
  };

  return (
    <main className="cp-page">
      {toast && <div className="cp-toast"><CheckCircle2 size={15} />{toast}</div>}
      {/* TOP: CLIENT PROJECT LIST + PROJECT DETAILS */}
      <div className="cp-upper-grid">
        <div className="cp-left-main">
          <div className="cp-client-card">
            <div className="cp-client-logo"><Building2 size={31} /></div>
            <div className="cp-client-info">
              <h2>Apollo Hospitals <Status value="In Progress" /></h2>
              <p>Enterprise Client <i>•</i> Healthcare <i>•</i> Hyderabad, Telangana, India</p>
            </div>
            <div className="cp-client-code"><small>Client Code</small><b>CLT-00086</b></div>
          </div>

          <div className="cp-stat-grid">
            <Stat icon={<FolderKanban />} label="Total Projects" value={counts.total} />
            <Stat icon={<ShieldCheck />} label="Active Projects" value={counts.active} color="green" />
            <Stat icon={<CheckCircle2 />} label="Completed Projects" value={counts.completed} color="blue" />
            <Stat icon={<Clock3 />} label="On Hold" value={counts.hold} color="orange" />
            <Stat icon={<FileText />} label="Cancelled" value={counts.cancelled} color="red" />
            <Stat icon={<Wallet />} label="Total Revenue (YTD)" value="₹ 62,40,000" color="green" />
          </div>

          <div className="cp-filter-row">
            <label className="cp-search">
              <Search size={13} />
              <input placeholder="Search projects by name, code, manager..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option>All Status</option><option>In Progress</option><option>Completed</option><option>On Hold</option><option>Cancelled</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option>All Types</option>
              {Array.from(new Set(projects.map(p => p.type))).map(x => <option key={x}>{x}</option>)}
            </select>
            <select value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)}>
              <option>All Managers</option>
              {Array.from(new Set(projects.map(p => p.manager))).map(x => <option key={x}>{x}</option>)}
            </select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option>All Priorities</option><option>High</option><option>Medium</option><option>Low</option>
            </select>
            <button className="cp-btn subtle" onClick={() => {
              setSearch(""); setStatusFilter("All Status"); setTypeFilter("All Types");
              setManagerFilter("All Managers"); setPriorityFilter("All Priorities");
            }}>Reset</button>
          </div>

          <div className="cp-table-wrap">
            <table className="cp-project-table">
              <thead>
                <tr>
                  <th>Project Code</th><th>Project Name</th><th>Type</th><th>Manager</th>
                  <th>Status</th><th>Priority</th><th>Progress</th><th>Start Date</th>
                  <th>End Date</th><th>Revenue (YTD)</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.code} className={selected.code === p.code ? "selected" : ""} onClick={() => setSelected(p)}>
                    <td>{p.code}</td><td className="project-name">{p.name}</td><td>{p.type}</td><td>{p.manager}</td>
                    <td><Status value={p.status} /></td><td><Priority value={p.priority} /></td>
                    <td><Progress value={p.progress} /></td><td>{p.start}</td><td>{p.end}</td><td>{p.revenue}</td>
                    <td><button className="cp-icon-btn tiny" onClick={(e) => { e.stopPropagation(); notify(`Actions for ${p.code}`); }}><MoreHorizontal size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="cp-empty">No projects match your filters.</div>}
          </div>
          <div className="cp-table-foot">
            <span>Showing 1 to {filtered.length} of {projects.length} entries</span>
            <div>
              <button className="cp-page-btn"><ChevronLeft size={13} /></button>
              <button className="cp-page-btn active">1</button>
              <button className="cp-page-btn"><ChevronRight size={13} /></button>
              <select><option>10 / page</option><option>25 / page</option></select>
            </div>
          </div>
        </div>

        {/* PROJECT DETAILS */}
        <div className="cp-detail-card">
          <div className="cp-detail-head">
            <div>
              <div className="cp-detail-title"><Grid2X2 size={16} /><b>Project Details</b><span className="cp-back-link"><ArrowLeft size={11} /> Back to Projects</span></div>
              <div className="cp-detail-project">
                <div className="cp-project-icon"><Grid2X2 size={25} /></div>
                <div>
                  <h2>{selected.name} <Status value={selected.status} /></h2>
                  <p>{selected.code} <i>•</i> {selected.type} <i>•</i> <Priority value={selected.priority} /></p>
                  <small>{selected.start} — {selected.end} <b>(61 days left)</b></small>
                </div>
              </div>
            </div>
            <div className="cp-detail-actions">
              <button className="cp-btn subtle" onClick={() => notify("Edit project form coming next")}>Edit Project</button>
              <button className="cp-btn subtle" onClick={() => notify("More project actions")}>More Actions <ChevronDown size={12} /></button>
            </div>
          </div>

          <div className="cp-tabs">
            {tabs.map(t => <button key={t} className={activeTab === t ? "active" : ""} onClick={() => setActiveTab(t)}>{t}</button>)}
          </div>

          {activeTab === "Overview" ? (
            <div className="cp-detail-content">
              <div className="cp-summary-box">
                <h4>Project Summary</h4>
                <Detail label="Client" value="Apollo Hospitals" />
                <Detail label="Project Manager" value="Rahul Verma" />
                <Detail label="Account Manager" value="Rahul Verma" />
                <Detail label="Billing Model" value="Time & Material" />
                <Detail label="Contract No." value="PO-APOL-0025-0012" />
                <Detail label="SLA" value="Bronze Plan" />
                <Detail label="Location" value="Hyderabad, Telangana, India" />
                <div className="cp-tags">AI, CMS, Implementation</div>
              </div>
              <div className="cp-progress-box">
                <h4>Progress</h4>
                <div className="cp-ring-row">
                  <div className="cp-ring"><div><b>{selected.progress}%</b><small>Overall Progress</small></div></div>
                  <div className="cp-progress-legend">
                    <span>● Tasks Completed <b>124 / 172</b></span>
                    <span>● Milestones <b>3 / 5</b></span>
                    <span>● Start Date <b>{selected.start}</b></span>
                    <span>● End Date <b>{selected.end}</b></span>
                    <span>● Days Left <b>61 Days</b></span>
                  </div>
                </div>
              </div>
              <div className="cp-metrics-box">
                <h4>Key Metrics (YTD)</h4>
                <Metric label="Planned Value (PV)" value="₹ 36,00,000" />
                <Metric label="Earned Value (EV)" value="₹ 25,92,000" />
                <Metric label="Actual Cost (AC)" value="₹ 22,80,000" />
                <Metric label="CPI" value="1.14" />
                <Metric label="SPI" value="0.94" />
              </div>
              <div className="cp-financial-box">
                <h4>Financial Overview</h4>
                <div className="cp-financial-stats">
                  <Metric label="Total Budget" value="₹ 36,00,000" />
                  <Metric label="Billed Amount" value="₹ 24,40,000" />
                  <Metric label="Paid Amount" value="₹ 20,80,000" />
                </div>
                <a>View Financials →</a>
              </div>
              <div className="cp-quick-box">
                <h4>Quick Actions</h4>
                <div>
                  <button onClick={() => notify("Add task action")}>＋ Add Task</button>
                  <button onClick={() => notify("Log time action")}>◷ Log Time</button>
                  <button onClick={() => notify("Upload document action")}>⇧ Upload Document</button>
                  <button onClick={() => notify("Create invoice action")}>▣ Create Invoice</button>
                </div>
              </div>
              <div className="cp-created">
                <span><b>Created On</b>10 Dec 2024, 10:30 AM by Mayank Swaroop</span>
                <span><b>Last Updated</b>10 May 2025, 10:35 AM by Rahul Verma</span>
              </div>
            </div>
          ) : (
            <div className="cp-tab-placeholder"><h3>{activeTab}</h3><p>{activeTab} information for {selected.name} will be displayed here.</p></div>
          )}
        </div>
      </div>

      {/* CREATE PROJECT, GANTT, TEAM AND DOCUMENTS */}
      <div className="cp-middle-grid">
        <Panel title="Create New Project" icon={<Plus size={13} />} className="cp-create-panel">
          <div className="cp-create-layout">
            <div className="cp-step-list">
              {["Basic Information", "Planning", "Team & Access", "Review & Confirm"].map((s, i) => (
                <button key={s} className={createStep === i + 1 ? "active" : createStep > i + 1 ? "done" : ""} onClick={() => setCreateStep(i + 1)}>
                  <i>{createStep > i + 1 ? <Check size={11} /> : i + 1}</i>{s}
                </button>
              ))}
            </div>
            <div className="cp-create-form">
              {createStep === 1 && <>
                <Field label="Project Type *">
                  <select value={projectForm.type} onChange={e => setProjectForm({ ...projectForm, type: e.target.value })}>
                    <option>Implementation</option><option>Development</option><option>Migration</option><option>Support</option><option>Integration</option>
                  </select>
                </Field>
                <div className="cp-form-two">
                  <Field label="Project Code *"><input value={projectForm.code} onChange={e => setProjectForm({ ...projectForm, code: e.target.value })} /></Field>
                  <Field label="Project Name *"><input placeholder="Enter project name" value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} /></Field>
                </div>
                <Field label="Client *"><select value={projectForm.client} onChange={e => setProjectForm({ ...projectForm, client: e.target.value })}><option>Apollo Hospitals (CLT-00086)</option></select></Field>
                <Field label="Description"><textarea placeholder="Describe the project..." value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} /></Field>
              </>}

              {createStep === 2 && <>
                <div className="cp-form-two">
                  <Field label="Start Date"><input type="date" value={projectForm.start} onChange={e => setProjectForm({ ...projectForm, start: e.target.value })} /></Field>
                  <Field label="End Date"><input type="date" value={projectForm.end} onChange={e => setProjectForm({ ...projectForm, end: e.target.value })} /></Field>
                </div>
                <Field label="Project Budget (₹)"><input type="number" value={projectForm.budget} onChange={e => setProjectForm({ ...projectForm, budget: e.target.value })} /></Field>
                <Field label="Priority"><select value={projectForm.priority} onChange={e => setProjectForm({ ...projectForm, priority: e.target.value })}><option>High</option><option>Medium</option><option>Low</option></select></Field>
              </>}

              {createStep === 3 && <>
                <Field label="Project Manager"><select value={projectForm.manager} onChange={e => setProjectForm({ ...projectForm, manager: e.target.value })}><option>Rahul Verma</option><option>Neha Patel</option><option>Amit Kumar</option><option>Vikram Singh</option></select></Field>
                <div className="cp-assignee-note"><Users size={16} /> Team members and access permissions can be assigned after project creation.</div>
              </>}

              {createStep === 4 && (
                <div className="cp-confirm">
                  <CheckCircle2 size={25} /><h4>Review Project Details</h4>
                  <p><b>{projectForm.name || "New Project"}</b></p>
                  <span>{projectForm.code} · {projectForm.type} · {projectForm.priority} Priority</span>
                  <span>{projectForm.start} to {projectForm.end}</span>
                  <span>Manager: {projectForm.manager}</span>
                  <span>Budget: ₹ {Number(projectForm.budget || 0).toLocaleString("en-IN")}</span>
                </div>
              )}

              <div className="cp-create-actions">
                {createStep > 1 && <button className="cp-btn subtle" onClick={() => setCreateStep(s => s - 1)}>Back</button>}
                {createStep < 4
                  ? <button className="cp-btn primary" onClick={() => setCreateStep(s => s + 1)}>Next <ArrowRight size={12} /></button>
                  : <button className="cp-btn primary" onClick={createProject}>Create Project <Check size={12} /></button>}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Project Timeline (Gantt View)" icon={<CalendarDays size={13} />}
          action={<div className="cp-panel-actions"><button onClick={() => notify("Today selected")}>Today</button><button><Search size={12} /></button><button><Search size={12} /></button></div>}
          className="cp-gantt-panel">
          <div className="cp-gantt">
            <div className="cp-gantt-labels"><b>Task / Milestone</b>{taskRows.map((r, i) => <span key={i}>{r}</span>)}</div>
            <div className="cp-gantt-chart">
              <div className="cp-gantt-months">{["Jan 2025", "Feb 2025", "Mar 2025", "Apr 2025", "May 2025", "Jun 2025"].map(m => <b key={m}>{m}</b>)}</div>
              {taskRows.map((r, i) => <div className="cp-gantt-row" key={i}><i style={{ left: `${12 + i * 5}%`, width: `${i % 4 === 0 ? 15 : i % 3 === 0 ? 12 : 9}%` }} /></div>)}
            </div>
          </div>
        </Panel>

        <Panel title="Project Team" icon={<Users size={13} />}
          action={<button className="cp-btn primary mini" onClick={() => notify("Add team member")}><Plus size={11} /> Add Member</button>}
          className="cp-team-panel">
          <h4>Project Manager (1)</h4><TeamRow person={team[0]} />
          <h4>Core Team (5)</h4>{team.slice(1).map((p, i) => <TeamRow key={i} person={p} />)}
          <h4>External Team (2)</h4>
          <TeamRow person={["Cloud Infra Pvt. Ltd.", "DevOps Partner", "ops@cloudinfra.com", "50%"]} />
          <TeamRow person={["TechTest Solutions", "QA Partner", "qa@techtest.com", "50%"]} />
        </Panel>

        <Panel title="Project Documents" icon={<FileText size={13} />}
          action={<button className="cp-btn primary mini" onClick={() => notify("Upload document")}><Upload size={11} /> Upload Document</button>}
          className="cp-doc-panel">
          <div className="cp-doc-filters">
            <select value={docCategory} onChange={e => setDocCategory(e.target.value)}>
              <option>All Categories</option>
              {["Planning", "Contract", "Requirements", "Design", "Testing", "Deployment"].map(x => <option key={x}>{x}</option>)}
            </select>
            <select><option>All Types</option><option>PDF</option><option>DOCX</option><option>XLSX</option></select>
            <label><Search size={12} /><input placeholder="Search documents..." value={documentSearch} onChange={e => setDocumentSearch(e.target.value)} /></label>
          </div>
          <div className="cp-doc-table-wrap">
            <table className="cp-small-table">
              <thead><tr><th>Document Name</th><th>Category</th><th>Type</th><th>Uploaded By</th><th>Date</th><th>Size</th><th>Actions</th></tr></thead>
              <tbody>{filteredDocs.map((d, i) => <tr key={i}><td>{d[0]}</td><td>{d[1]}</td><td>{d[2]}</td><td>{d[3]}</td><td>{d[4]}</td><td>{d[5]}</td><td><button className="cp-icon-btn tiny" onClick={() => notify(`Document: ${d[0]}`)}><MoreHorizontal size={13} /></button></td></tr>)}</tbody>
            </table>
          </div>
          <a className="cp-view-all" onClick={() => setActiveTab("Documents")}>View all documents →</a>
        </Panel>
      </div>

      {/* BOTTOM DASHBOARD CARDS */}
      <div className="cp-bottom-grid">
        <Panel title="Project Status Board" icon={<ClipboardList size={13} />} className="cp-status-board">
          <div className="cp-kanban">
            {(["In Progress", "Completed", "On Hold", "Cancelled"] as const).map((s) => {
              const list = projects.filter(p => p.status === s);
              return (
                <div className={`cp-kanban-col ${s.toLowerCase().replaceAll(" ", "-")}`} key={s}>
                  <h4>{s} <span>({list.length})</span></h4>
                  {list.length ? list.map(p => (
                    <button className="cp-kanban-item" key={p.code} onClick={() => setSelected(p)}>
                      <b>{p.name}</b><small>{p.code}</small><Progress value={p.progress} />
                    </button>
                  )) : <p className="cp-no-items">No {s.toLowerCase()} projects</p>}
                </div>
              );
            })}
          </div>
          <a className="cp-view-all" onClick={() => notify("Showing all projects")}>View All Projects →</a>
        </Panel>

        <Panel title="Projects by Status" icon={<ChartNoAxesCombined size={13} />} className="cp-status-chart">
          <div className="cp-donut-area">
            <div className="cp-donut"><div><b>{projects.length}</b><small>Total</small></div></div>
            <div className="cp-donut-legend">
              <span><i className="blue" />In Progress <b>{counts.active} ({Math.round(counts.active / projects.length * 100)}%)</b></span>
              <span><i className="green" />Completed <b>{counts.completed} ({Math.round(counts.completed / projects.length * 100)}%)</b></span>
              <span><i className="orange" />On Hold <b>{counts.hold} ({Math.round(counts.hold / projects.length * 100)}%)</b></span>
              <span><i className="red" />Cancelled <b>{counts.cancelled} ({Math.round(counts.cancelled / projects.length * 100)}%)</b></span>
            </div>
          </div>
          <a className="cp-view-all" onClick={() => notify("Opening project report")}>View Report →</a>
        </Panel>

        <Panel title="Project Financial Summary" icon={<Wallet size={13} />}
          action={<select className="cp-period"><option>This Year</option><option>Last Year</option></select>}
          className="cp-finance-chart">
          <div className="cp-finance-numbers">
            <Metric label="Total Budget" value="₹ 66,90,000" />
            <Metric label="Billed Amount" value="₹ 42,70,000" />
            <Metric label="Paid Amount" value="₹ 34,20,000" />
            <Metric label="Pending Amount" value="₹ 8,50,000" />
          </div>
          <div className="cp-bar-legend"><span><i className="grey" />Budget</span><span><i className="blue" />Billed</span><span><i className="green" />Paid</span></div>
          <div className="cp-bars">
            {[["Jan", 18, 12, 8], ["Feb", 25, 18, 13], ["Mar", 22, 20, 17], ["Apr", 28, 22, 18], ["May", 24, 17, 14], ["Jun", 20, 16, 12], ["Jul", 18, 14, 11], ["Aug", 25, 19, 15], ["Sep", 22, 17, 13], ["Oct", 20, 16, 12], ["Nov", 24, 18, 15], ["Dec", 19, 15, 11]].map((m, i) => (
              <div className="cp-bar-group" key={i}>
                <div className="cp-bar-set"><i className="budget" style={{ height: `${Number(m[1]) * 3}px` }} /><i className="billed" style={{ height: `${Number(m[3]) * 3}px` }} /></div>
                <small>{m[0]}</small>
              </div>
            ))}
          </div>
          <a className="cp-view-all" onClick={() => notify("Opening financial report")}>View Financial Report →</a>
        </Panel>

        <Panel title="Activity & Audit Trail" icon={<Activity size={13} />} className="cp-audit-panel">
          <div className="cp-audit-filter"><select><option>All Activities</option><option>Project Updates</option><option>Documents</option></select></div>
          <div className="cp-audit-table-wrap">
            <table className="cp-small-table">
              <thead><tr><th>Date & Time</th><th>Activity</th><th>Performed By</th><th>Details</th></tr></thead>
              <tbody>{audit.map((a, i) => <tr key={i}><td>{a[0]}</td><td>{a[1]}</td><td>{a[2]}</td><td>{a[3]}</td></tr>)}</tbody>
            </table>
          </div>
          <a className="cp-view-all" onClick={() => setActiveTab("Activity")}>View Full Audit Log →</a>
        </Panel>
      </div>
    </main>
  );
}

function Stat({ icon, label, value, color = "" }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
}) {
  return <div className="cp-stat"><span className={`cp-stat-icon ${color}`}>{icon}</span><div><small>{label}</small><b>{value}</b></div></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="cp-detail-line"><small>{label}</small><b>{value}</b></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="cp-metric"><small>{label}</small><b>{value}</b></div>;
}

function TeamRow({ person }: { person: string[] }) {
  return (
    <div className="cp-team-row">
      <span className="cp-mini-avatar">{person[0].split(" ").map(x => x[0]).join("").slice(0, 2)}</span>
      <div><b>{person[0]}</b><small>{person[1]}</small></div>
      <small>{person[2]}</small>
      <strong>{person[3]}</strong>
    </div>
  );
}