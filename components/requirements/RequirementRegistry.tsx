
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleHelp,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FilePlus2,
  FileText,
  Filter,
  Layers3,
  MoreVertical,
  Plus,
  Search,
  ShieldCheck,
  Timer,
  Upload,
  X,
} from "lucide-react";
import "./requirement-registry.css";

type RequirementStatus =
  | "Approved"
  | "In Review"
  | "In Progress"
  | "Deferred"
  | "Rejected";

type RequirementPriority = "Critical" | "High" | "Medium" | "Low";

type Requirement = {
  id: string;
  title: string;
  projectCode: string;
  projectName: string;
  brdId: string;
  type: "Functional" | "Non-Functional" | "Business" | "Constraint";
  status: RequirementStatus;
  priority: RequirementPriority;
  category: string;
  createdBy: string;
  createdOn: string;
};

const DEMO_REQUIREMENTS: Requirement[] = [
  {
    id: "REQ-00101",
    title: "Patient Registration",
    projectCode: "PRJ-001",
    projectName: "AI-CMS Platform",
    brdId: "BRD-24-003",
    type: "Functional",
    status: "Approved",
    priority: "High",
    category: "Patient Management",
    createdBy: "Rahul Verma",
    createdOn: "2025-05-14",
  },
  {
    id: "REQ-00102",
    title: "Appointment Scheduling",
    projectCode: "PRJ-001",
    projectName: "AI-CMS Platform",
    brdId: "BRD-24-003",
    type: "Functional",
    status: "Approved",
    priority: "High",
    category: "Appointment",
    createdBy: "Amit Kumar",
    createdOn: "2025-05-14",
  },
  {
    id: "REQ-00103",
    title: "Doctor Availability Calendar",
    projectCode: "PRJ-001",
    projectName: "AI-CMS Platform",
    brdId: "BRD-24-003",
    type: "Functional",
    status: "In Review",
    priority: "Medium",
    category: "Appointment",
    createdBy: "Pooja Singh",
    createdOn: "2025-05-14",
  },
  {
    id: "REQ-00104",
    title: "EMR Creation",
    projectCode: "PRJ-001",
    projectName: "AI-CMS Platform",
    brdId: "BRD-24-003",
    type: "Functional",
    status: "Approved",
    priority: "High",
    category: "EMR",
    createdBy: "Neha Patel",
    createdOn: "2025-05-13",
  },
  {
    id: "REQ-00105",
    title: "Digital Prescription",
    projectCode: "PRJ-001",
    projectName: "AI-CMS Platform",
    brdId: "BRD-24-003",
    type: "Functional",
    status: "Approved",
    priority: "Medium",
    category: "Prescriptions",
    createdBy: "Vikram Singh",
    createdOn: "2025-05-13",
  },
  {
    id: "REQ-00106",
    title: "Lab Order & Integration",
    projectCode: "PRJ-001",
    projectName: "AI-CMS Platform",
    brdId: "BRD-24-003",
    type: "Functional",
    status: "In Progress",
    priority: "Medium",
    category: "Laboratory",
    createdBy: "Rahul Verma",
    createdOn: "2025-05-12",
  },
  {
    id: "REQ-00107",
    title: "Billing & Invoicing",
    projectCode: "PRJ-001",
    projectName: "AI-CMS Platform",
    brdId: "BRD-24-003",
    type: "Functional",
    status: "Approved",
    priority: "High",
    category: "Billing",
    createdBy: "Karthik Reddy",
    createdOn: "2025-05-12",
  },
  {
    id: "REQ-00108",
    title: "Payment Gateway Integration",
    projectCode: "PRJ-001",
    projectName: "AI-CMS Platform",
    brdId: "BRD-24-003",
    type: "Non-Functional",
    status: "In Review",
    priority: "Medium",
    category: "Payments",
    createdBy: "Neha Patel",
    createdOn: "2025-05-12",
  },
  {
    id: "REQ-00109",
    title: "Role Based Access Control",
    projectCode: "PRJ-001",
    projectName: "AI-CMS Platform",
    brdId: "BRD-24-003",
    type: "Non-Functional",
    status: "Approved",
    priority: "High",
    category: "Security",
    createdBy: "Amit Kumar",
    createdOn: "2025-05-12",
  },
  {
    id: "REQ-00110",
    title: "Data Backup & Restore",
    projectCode: "PRJ-001",
    projectName: "AI-CMS Platform",
    brdId: "BRD-24-003",
    type: "Non-Functional",
    status: "In Progress",
    priority: "Medium",
    category: "Infrastructure",
    createdBy: "Rahul Verma",
    createdOn: "2025-05-12",
  },
  {
    id: "REQ-00111",
    title: "Audit Log Retention",
    projectCode: "PRJ-002",
    projectName: "Mobile App",
    brdId: "BRD-24-002",
    type: "Non-Functional",
    status: "Deferred",
    priority: "Low",
    category: "Security",
    createdBy: "Pooja Singh",
    createdOn: "2025-05-11",
  },
  {
    id: "REQ-00112",
    title: "Legacy API Migration",
    projectCode: "PRJ-003",
    projectName: "Patient Portal",
    brdId: "BRD-24-004",
    type: "Constraint",
    status: "Rejected",
    priority: "Critical",
    category: "Integration",
    createdBy: "Vikram Singh",
    createdOn: "2025-05-10",
  },
];

const ACTIVITY = [
  { id: 1, color: "green", title: "REQ-00101 (Patient Registration) approved", by: "Mayank Swaroop", time: "10 mins ago" },
  { id: 2, color: "green", title: "REQ-00103 (Doctor Availability) moved to In Review", by: "Amit Kumar", time: "25 mins ago" },
  { id: 3, color: "blue", title: "REQ-00106 (Lab Order & Integration) status updated", by: "Neha Patel", time: "1 hour ago" },
  { id: 4, color: "orange", title: "REQ-00108 (Payment Gateway Integration) added", by: "Rahul Verma", time: "2 hours ago" },
  { id: 5, color: "red", title: "REQ-00102 (Appointment Scheduling) updated", by: "Pooja Singh", time: "3 hours ago" },
];

const TYPES = [
  { name: "Functional", count: 112, color: "#155eef" },
  { name: "Non-Functional", count: 35, color: "#079455" },
  { name: "Business", count: 10, color: "#f79009" },
  { name: "Constraint", count: 5, color: "#875bf7" },
];

const PROJECT_SUMMARY = [
  { project: "PRJ-001 · AI-CMS Platform", total: 72, approved: 40 },
  { project: "PRJ-002 · Mobile App", total: 28, approved: 15 },
  { project: "PRJ-003 · Patient Portal", total: 22, approved: 12 },
  { project: "PRJ-004 · Teleconsultation", total: 18, approved: 10 },
  { project: "PRJ-005 · Inventory Module", total: 12, approved: 7 },
  { project: "PRJ-006 · HRMS Integration", total: 10, approved: 6 },
];

const STATUSES: RequirementStatus[] = [
  "Approved",
  "In Review",
  "In Progress",
  "Deferred",
  "Rejected",
];

function Badge({
  value,
}: {
  value: RequirementStatus | RequirementPriority;
}) {
  const slug = value.toLowerCase().replace(/\s+/g, "-");
  return <span className={`rr-badge rr-badge-${slug}`}>{value}</span>;
}

function Donut({
  total,
  centerLabel = "Total",
  segments,
}: {
  total: number;
  centerLabel?: string;
  segments: { name: string; count: number; color: string }[];
}) {
  const denominator = segments.reduce((sum, item) => sum + item.count, 0) || 1;
  let cursor = 0;

  const gradient = segments.map((item) => {
    const start = cursor;
    cursor += (item.count / denominator) * 100;
    return `${item.color} ${start}% ${cursor}%`;
  }).join(", ");

  return (
    <div className="rr-donut-layout">
      <div
        className="rr-donut"
        style={{ background: `conic-gradient(${gradient})` }}
        role="img"
        aria-label={`${total} requirements`}
      >
        <div className="rr-donut-hole">
          <strong>{total}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>

      <div className="rr-legend">
        {segments.map((item) => (
          <div className="rr-legend-row" key={item.name}>
            <span className="rr-legend-name">
              <i style={{ background: item.color }} />
              {item.name}
            </span>
            <strong>
              {item.count}
              <small> ({((item.count / denominator) * 100).toFixed(2)}%)</small>
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  tone,
  icon: Icon,
}: {
  title: string;
  value: number;
  subtitle: string;
  tone: string;
  icon: typeof FileText;
}) {
  return (
    <article className={`rr-metric rr-metric-${tone}`}>
      <span className="rr-metric-icon"><Icon size={21} /></span>
      <div className="rr-metric-content">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{subtitle}</small>
      </div>
    </article>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function RequirementRegistry() {
  const [records, setRecords] = useState<Requirement[]>(DEMO_REQUIREMENTS);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [brdFilter, setBrdFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [moreFilters, setMoreFilters] = useState(false);
  const [selectedId, setSelectedId] = useState("REQ-00101");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [message, setMessage] = useState("");

  const projects = useMemo(() => [...new Set(records.map((item) => item.projectCode))], [records]);
  const brds = useMemo(() => [...new Set(records.map((item) => item.brdId))], [records]);
  const categories = useMemo(() => [...new Set(records.map((item) => item.category))], [records]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return records.filter((item) => {
      const matchesSearch = !query || [
        item.id, item.title, item.projectCode, item.projectName,
        item.brdId, item.category, item.createdBy,
      ].some((value) => value.toLowerCase().includes(query));

      return matchesSearch &&
        (projectFilter === "all" || item.projectCode === projectFilter) &&
        (brdFilter === "all" || item.brdId === brdFilter) &&
        (statusFilter === "all" || item.status === statusFilter) &&
        (typeFilter === "all" || item.type === typeFilter) &&
        (priorityFilter === "all" || item.priority === priorityFilter) &&
        (categoryFilter === "all" || item.category === categoryFilter);
    });
  }, [records, search, projectFilter, brdFilter, statusFilter, typeFilter, priorityFilter, categoryFilter]);

  const total = records.length;
  const countStatus = (status: RequirementStatus) => records.filter((item) => item.status === status).length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selected = filtered.find((item) => item.id === selectedId) ?? pageItems[0] ?? filtered[0];

  function resetFilters() {
    setSearch("");
    setProjectFilter("all");
    setBrdFilter("all");
    setStatusFilter("all");
    setTypeFilter("all");
    setPriorityFilter("all");
    setCategoryFilter("all");
    setPage(1);
  }

  function exportCsv() {
    const header = ["Requirement ID", "Title", "Project Code", "Project", "BRD ID", "Type", "Status", "Priority", "Category", "Created By", "Created On"];
    const rows = filtered.map((item) => [
      item.id, item.title, item.projectCode, item.projectName, item.brdId,
      item.type, item.status, item.priority, item.category, item.createdBy, item.createdOn,
    ]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "requirement-registry.csv";
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`Exported ${filtered.length} requirements.`);
  }

  function importFile() {
    setMessage("Import UI is ready. Connect your backend import endpoint to process a file.");
  }

  function updateStatus(id: string, status: RequirementStatus) {
    setRecords((previous) => previous.map((item) => item.id === id ? { ...item, status } : item));
    setMessage(`${id} status changed to ${status} in the current view.`);
  }

  const statusBars = STATUSES.map((status) => ({
    label: status,
    value: countStatus(status),
    color: ({
      Approved: "#079455",
      "In Review": "#f79009",
      "In Progress": "#155eef",
      Deferred: "#875bf7",
      Rejected: "#f04438",
    } as Record<RequirementStatus, string>)[status],
  }));

  const priorityBars = [
    { label: "Critical", value: records.filter((item) => item.priority === "Critical").length, color: "#f04438" },
    { label: "High", value: records.filter((item) => item.priority === "High").length, color: "#f79009" },
    { label: "Medium", value: records.filter((item) => item.priority === "Medium").length, color: "#fdb022" },
    { label: "Low", value: records.filter((item) => item.priority === "Low").length, color: "#079455" },
  ];

  const typeSegments = TYPES.map((item) => ({
    name: item.name,
    count: records.filter((record) => record.type === item.name).length,
    color: item.color,
  }));

  return (
    <main className="rr-page">
      <header className="rr-page-header">
        <div className="rr-heading">
          <span className="rr-heading-icon"><FileText size={24} /></span>
          <div>
            <h1>Requirement Registry</h1>
            <p>Central repository of all project requirements</p>
          </div>
        </div>

        <div className="rr-header-actions">
          <Link href="/brd-requirements/requirements/new" className="rr-button rr-primary">
            <Plus size={15} /> Create Requirement
          </Link>
          <button type="button" className="rr-button" onClick={importFile}><Download size={14} /> Import</button>
          <button type="button" className="rr-button" onClick={exportCsv}><FileCheck2 size={14} /> Export <ChevronDown size={13} /></button>
          <button type="button" className="rr-button" onClick={() => setMoreFilters((value) => !value)}>More Actions <ChevronDown size={13} /></button>
        </div>
      </header>

      <section className="rr-metrics-grid">
        <MetricCard title="Total Requirements" value={total} subtitle="Across all projects" tone="blue" icon={FileText} />
        <MetricCard title="Approved" value={countStatus("Approved")} subtitle={`${total ? ((countStatus("Approved") / total) * 100).toFixed(2) : "0.00"}% of total`} tone="green" icon={CheckCircle2} />
        <MetricCard title="In Review" value={countStatus("In Review")} subtitle={`${total ? ((countStatus("In Review") / total) * 100).toFixed(2) : "0.00"}% of total`} tone="orange" icon={Clock3} />
        <MetricCard title="In Progress" value={countStatus("In Progress")} subtitle={`${total ? ((countStatus("In Progress") / total) * 100).toFixed(2) : "0.00"}% of total`} tone="blue" icon={Timer} />
        <MetricCard title="Deferred" value={countStatus("Deferred")} subtitle={`${total ? ((countStatus("Deferred") / total) * 100).toFixed(2) : "0.00"}% of total`} tone="purple" icon={Clock3} />
        <MetricCard title="Rejected" value={countStatus("Rejected")} subtitle={`${total ? ((countStatus("Rejected") / total) * 100).toFixed(2) : "0.00"}% of total`} tone="red" icon={AlertCircle} />
      </section>

      <section className="rr-filter-panel">
        <label className="rr-search">
          <Search size={15} />
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search by Req ID, Title, Keyword..."
            aria-label="Search requirements"
          />
          {search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")}><X size={13} /></button>}
        </label>

        <label className="rr-filter-field"><span>Project</span>
          <select value={projectFilter} onChange={(event) => { setProjectFilter(event.target.value); setPage(1); }}>
            <option value="all">All Projects</option>
            {projects.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <label className="rr-filter-field"><span>BRD</span>
          <select value={brdFilter} onChange={(event) => { setBrdFilter(event.target.value); setPage(1); }}>
            <option value="all">All BRDs</option>
            {brds.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>

        <label className="rr-filter-field"><span>Status</span>
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
            <option value="all">All Status</option>
            {STATUSES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>

        <label className="rr-filter-field"><span>Requirement Type</span>
          <select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1); }}>
            <option value="all">All Types</option>
            {["Functional", "Non-Functional", "Business", "Constraint"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>

        <label className="rr-filter-field"><span>Priority</span>
          <select value={priorityFilter} onChange={(event) => { setPriorityFilter(event.target.value); setPage(1); }}>
            <option value="all">All Priorities</option>
            {["Critical", "High", "Medium", "Low"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>

        <label className="rr-filter-field"><span>Category</span>
          <select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }}>
            <option value="all">All Categories</option>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>

        <button type="button" className={`rr-button rr-more-filter ${moreFilters ? "active" : ""}`} onClick={() => setMoreFilters((value) => !value)}><Filter size={14} /> More Filters</button>
        <button type="button" className="rr-clear" onClick={resetFilters}>Clear</button>

        {moreFilters && (
          <div className="rr-more-panel">
            <strong>Additional actions</strong>
            <button type="button" onClick={exportCsv}><Download size={14} /> Export current filtered list</button>
            <button type="button" onClick={resetFilters}><X size={14} /> Reset all filters</button>
          </div>
        )}
      </section>

      {message && (
        <div className="rr-message" role="status">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage("")} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}

      <div className="rr-main-grid">
        <section className="rr-panel rr-list-panel">
          <div className="rr-panel-header">
            <h2>Requirements List <span>({filtered.length})</span></h2>
            <button className="rr-icon-button" type="button" aria-label="Refresh list" onClick={() => setMessage("This demo view uses local sample data.")}><Activity size={15} /></button>
          </div>

          <div className="rr-table-scroll">
            <table className="rr-table">
              <thead>
                <tr>
                  <th>Req ID</th><th>Title</th><th>Project</th><th>BRD</th><th>Type</th><th>Status</th><th>Priority</th><th>Category</th><th>Created By</th><th>Created On</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length ? pageItems.map((item) => (
                  <tr key={item.id} className={selected?.id === item.id ? "selected" : ""} onClick={() => setSelectedId(item.id)}>
                    <td><button type="button" className="rr-id-link" onClick={(event) => { event.stopPropagation(); setSelectedId(item.id); }}>{item.id}</button></td>
                    <td className="rr-title-cell">{item.title}</td>
                    <td>{item.projectCode}</td>
                    <td>{item.brdId}</td>
                    <td>{item.type}</td>
                    <td><Badge value={item.status} /></td>
                    <td><Badge value={item.priority} /></td>
                    <td>{item.category}</td>
                    <td><span className="rr-owner"><i>{initials(item.createdBy)}</i>{item.createdBy}</span></td>
                    <td>{new Date(`${item.createdOn}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td><div className="rr-row-actions">
                      <button type="button" aria-label={`View ${item.id}`} onClick={(event) => { event.stopPropagation(); setSelectedId(item.id); }}><Eye size={14} /></button>
                      <button type="button" aria-label={`More actions ${item.id}`} onClick={(event) => { event.stopPropagation(); setSelectedId(item.id); }}><MoreVertical size={14} /></button>
                    </div></td>
                  </tr>
                )) : <tr><td colSpan={11} className="rr-empty-cell">No requirements match your filters.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="rr-table-footer">
            <span>Showing {filtered.length ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} entries</span>
            <div className="rr-pagination">
              <button type="button" aria-label="First page" disabled={currentPage <= 1} onClick={() => setPage(1)}><ChevronsLeft size={14} /></button>
              <button type="button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={14} /></button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).filter((num) => num === 1 || num === totalPages || Math.abs(num - currentPage) <= 1).map((num, index, visible) => (
                <span className="rr-page-number-wrap" key={num}>
                  {index > 0 && num - visible[index - 1] > 1 && <span className="rr-ellipsis">…</span>}
                  <button type="button" className={currentPage === num ? "current" : ""} onClick={() => setPage(num)}>{num}</button>
                </span>
              ))}
              <button type="button" aria-label="Next page" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight size={14} /></button>
              <button type="button" aria-label="Last page" disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)}><ChevronsRight size={14} /></button>
              <select aria-label="Page size" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>
        </section>

        <aside className="rr-aside">
          <section className="rr-panel rr-summary-panel">
            <div className="rr-panel-header"><h2>Requirement Summary</h2></div>
            <Donut total={total} segments={typeSegments} />
          </section>

          <section className="rr-panel rr-status-panel">
            <div className="rr-panel-header"><h2>Status Distribution</h2></div>
            <div className="rr-status-bars">
              {statusBars.map((item) => (
                <div className="rr-status-bar" key={item.label}>
                  <strong>{item.value}</strong>
                  <div className="rr-bar-track"><i style={{ height: `${Math.max(3, (item.value / Math.max(1, total)) * 100)}%`, background: item.color }} /></div>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rr-panel rr-activity-panel">
            <div className="rr-panel-header"><h2>Recent Activity</h2><button type="button" onClick={() => setMessage("Activity feed requires a connected backend endpoint.")}>View All</button></div>
            <div className="rr-activity-list">
              {ACTIVITY.map((item) => (
                <div className="rr-activity" key={item.id}>
                  <span className={`rr-activity-icon ${item.color}`}>
                    {item.color === "green" ? <CheckCircle2 size={13} /> : item.color === "blue" ? <Activity size={13} /> : item.color === "orange" ? <Clock3 size={13} /> : <AlertCircle size={13} />}
                  </span>
                  <div><strong>{item.title}</strong><small>by {item.by}</small></div>
                  <time>{item.time}</time>
                </div>
              ))}
            </div>
          </section>

          <section className="rr-panel rr-quick-panel">
            <div className="rr-panel-header"><h2>Quick Actions</h2></div>
            <div className="rr-quick-grid">
              <Link href="/brd-requirements/requirements/new"><FilePlus2 /><span>Create Requirement</span></Link>
              <button type="button" onClick={importFile}><Upload /><span>Import Requirements</span></button>
              <button type="button" onClick={exportCsv}><Download /><span>Export Requirements</span></button>
              <Link href="/brd-requirements/requirement-templates"><FileText /><span>Requirement Templates</span></Link>
              <Link href="/brd-requirements/requirement-categories"><Layers3 /><span>Requirement Categories</span></Link>
              <Link href="/brd-requirements/reports"><ShieldCheck /><span>Reports &amp; Analytics</span></Link>
            </div>
          </section>
        </aside>
      </div>

      <div className="rr-bottom-grid">
        <section className="rr-panel rr-chart-panel">
          <div className="rr-panel-header"><h2>Requirements by Type</h2></div>
          <Donut total={total} segments={typeSegments} />
        </section>

        <section className="rr-panel rr-chart-panel">
          <div className="rr-panel-header"><h2>Requirements by Priority</h2></div>
          <div className="rr-priority-chart">
            {priorityBars.map((item) => (
              <div className="rr-priority-column" key={item.label}>
                <strong>{item.value}</strong>
                <div className="rr-priority-track"><i style={{ height: `${Math.max(4, (item.value / Math.max(1, total)) * 100)}%`, background: item.color }} /></div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rr-panel rr-project-panel">
          <div className="rr-panel-header"><h2>Top Requirements by Projects</h2></div>
          <div className="rr-project-table-wrap">
            <table className="rr-project-table">
              <thead><tr><th>Project</th><th>Total Requirements</th><th>Approved</th></tr></thead>
              <tbody>
                {PROJECT_SUMMARY.map((item) => (
                  <tr key={item.project}><td>{item.project}</td><td>{item.total}</td><td>{item.approved}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link className="rr-view-projects" href="/projects">View All Projects <ArrowRight size={13} /></Link>
        </section>
      </div>

      {selected && (
        <section className="rr-selected-detail">
          <div><strong>Selected requirement:</strong> {selected.id} — {selected.title}</div>
          <label>Status
            <select value={selected.status} onChange={(event) => updateStatus(selected.id, event.target.value as RequirementStatus)}>
              {STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <span className="rr-demo-note">Local demo interaction only</span>
        </section>
      )}
    </main>
  );
}
