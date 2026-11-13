
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, Building2, Users, CheckCircle2, BriefcaseBusiness,
  IndianRupee, CalendarClock, Search, ChevronDown, ChevronLeft,
  ChevronRight, ChevronsUpDown, Filter, RotateCcw, Download,
  MoreHorizontal, X, Plus, Eye, Pencil, FolderPlus, UserPlus,
  LayoutGrid, List, MapPin, Globe, Phone, Mail, ExternalLink,
  ShieldCheck, Clock3, FileText, Handshake, Tag, Landmark,
  TrendingUp, CircleDollarSign, ChartNoAxesCombined, Trash2,
} from "lucide-react";
import { useEffect } from "react";
import "./client-registry.css";

type Client = {
  id: string;
  name: string;
  code: string;
  industry: string;
  location: string;
  projects: number;
  value: number;
  relationship: string;
  contractEnd: string;
  status: "Active" | "Inactive" | "On Hold";
  health: "Excellent" | "Good" | "At Risk";
  logo: string;
  color: string;
  type: string;
  branches: string;
  headOffice: string;
  accountManager: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  about: string;
  tags: string[];
  departments: string[];
};

const initialClients: Client[] = [
  {
    id: "1", name: "LifeCare Multi Speciality Hospital",
    code: "LCH-2024-001", industry: "Healthcare",
    location: "Bengaluru, KA", projects: 5, value: 18000000,
    relationship: "15 Jan 2024", contractEnd: "14 Jan 2027",
    status: "Active", health: "Excellent", logo: "✚",
    color: "#10b981", type: "Enterprise", branches: "8 Centers",
    headOffice: "Bengaluru, KA", accountManager: "Rahul Verma",
    email: "contact@lifecare.example", phone: "+91 98765 43210",
    website: "https://lifecare.example",
    address: "LifeCare Hospital, MG Road, Bengaluru, Karnataka",
    about: "A multi-speciality healthcare provider focused on patient care and digital transformation.",
    tags: ["Healthcare", "Priority Client", "Long Term"],
    departments: ["Project Management", "Development", "QA & Testing"],
  },
  {
    id: "2", name: "City Health Clinic Network",
    code: "CHC-2024-002", industry: "Healthcare",
    location: "Mumbai, MH", projects: 3, value: 9500000,
    relationship: "01 Mar 2024", contractEnd: "28 Feb 2027",
    status: "Active", health: "Good", logo: "✥",
    color: "#2563eb", type: "Enterprise", branches: "5 Centers",
    headOffice: "Mumbai, MH", accountManager: "Amit Kumar",
    email: "hello@cityhealth.example", phone: "+91 98765 11111",
    website: "https://cityhealth.example",
    address: "City Health Network, Andheri, Mumbai, Maharashtra",
    about: "A growing network of clinics providing accessible healthcare services.",
    tags: ["Healthcare", "Strategic"],
    departments: ["Project Management", "Development"],
  },
  {
    id: "3", name: "Sunrise Diagnostic Center",
    code: "SDC-2023-007", industry: "Healthcare",
    location: "Delhi, DL", projects: 4, value: 12500000,
    relationship: "20 Nov 2023", contractEnd: "19 Nov 2026",
    status: "Active", health: "Good", logo: "☀",
    color: "#fb923c", type: "Enterprise", branches: "12 Centers",
    headOffice: "Delhi, DL", accountManager: "Rahul Verma",
    email: "info@sunrisedc.example", phone: "+91 11 4567 8900",
    website: "https://sunrisedc.example",
    address: "Sunrise Diagnostic Center Pvt. Ltd., Plot No. 18, Health Street, Vasant Kunj, New Delhi - 110070, India",
    about: "Sunrise Diagnostic Center is a leading chain of diagnostic centers providing pathology, radiology and wellness checkup services across NCR with 12 centers and 500+ staff.",
    tags: ["Priority Client", "NABH", "Long Term", "Strategic"],
    departments: ["Project Management", "Development", "QA & Testing", "DevOps", "Support"],
  },
  {
    id: "4", name: "MediCure Clinics",
    code: "MCC-2024-010", industry: "Healthcare",
    location: "Pune, MH", projects: 2, value: 6500000,
    relationship: "10 May 2024", contractEnd: "09 May 2027",
    status: "Active", health: "Good", logo: "✣",
    color: "#10b981", type: "Mid-Market", branches: "4 Centers",
    headOffice: "Pune, MH", accountManager: "Neha Patel",
    email: "care@medicure.example", phone: "+91 98765 22222",
    website: "https://medicure.example",
    address: "MediCure Clinics, Pune, Maharashtra",
    about: "A clinic group focused on accessible and reliable healthcare.",
    tags: ["Healthcare", "Growth"],
    departments: ["Development", "Support"],
  },
  {
    id: "5", name: "Apollo MedTech Labs",
    code: "AML-2024-003", industry: "Healthcare",
    location: "Hyderabad, TG", projects: 6, value: 24000000,
    relationship: "05 Sep 2023", contractEnd: "04 Sep 2026",
    status: "Active", health: "Excellent", logo: "✥",
    color: "#0ea5e9", type: "Enterprise", branches: "10 Centers",
    headOffice: "Hyderabad, TG", accountManager: "Amit Kumar",
    email: "info@apollomedtech.example", phone: "+91 98765 33333",
    website: "https://apollomedtech.example",
    address: "Apollo MedTech Labs, Hyderabad, Telangana",
    about: "A medical technology and laboratory services organization.",
    tags: ["Enterprise", "Strategic"],
    departments: ["Project Management", "Development", "QA & Testing"],
  },
  {
    id: "6", name: "Urban Wellness Hospital",
    code: "UWH-2024-006", industry: "Healthcare",
    location: "Noida, UP", projects: 3, value: 11000000,
    relationship: "12 Apr 2024", contractEnd: "11 Apr 2027",
    status: "Active", health: "Good", logo: "✿",
    color: "#2563eb", type: "Mid-Market", branches: "3 Centers",
    headOffice: "Noida, UP", accountManager: "Pooja Singh",
    email: "hello@urbanwellness.example", phone: "+91 98765 44444",
    website: "https://urbanwellness.example",
    address: "Urban Wellness Hospital, Noida, Uttar Pradesh",
    about: "A modern hospital focused on wellness and patient experience.",
    tags: ["Healthcare", "Long Term"],
    departments: ["Development", "QA & Testing"],
  },
  {
    id: "7", name: "Shree Sai Clinic",
    code: "SSC-2025-003", industry: "Healthcare",
    location: "Ahmedabad, GJ", projects: 1, value: 3500000,
    relationship: "14 Feb 2025", contractEnd: "13 Feb 2028",
    status: "Active", health: "Good", logo: "✚",
    color: "#ef4444", type: "SMB", branches: "2 Centers",
    headOffice: "Ahmedabad, GJ", accountManager: "Neha Patel",
    email: "contact@shreesai.example", phone: "+91 98765 55555",
    website: "https://shreesai.example",
    address: "Shree Sai Clinic, Ahmedabad, Gujarat",
    about: "A local clinic providing general medical services.",
    tags: ["Healthcare"],
    departments: ["Support", "Development"],
  },
  {
    id: "8", name: "CarePlus Healthcare",
    code: "CPH-2023-009", industry: "Healthcare",
    location: "Chennai, TN", projects: 4, value: 16000000,
    relationship: "18 Dec 2023", contractEnd: "17 Dec 2026",
    status: "Active", health: "Excellent", logo: "✚",
    color: "#0284c7", type: "Enterprise", branches: "7 Centers",
    headOffice: "Chennai, TN", accountManager: "Rahul Verma",
    email: "info@careplus.example", phone: "+91 98765 66666",
    website: "https://careplus.example",
    address: "CarePlus Healthcare, Chennai, Tamil Nadu",
    about: "A healthcare organization offering integrated care services.",
    tags: ["Enterprise", "Priority Client"],
    departments: ["Project Management", "Development", "Support"],
  },

];

const money = (value: number) =>
  value >= 10000000
    ? `₹ ${(value / 10000000).toFixed(2)} Cr`
    : `${(value / 100000).toFixed(2)} L`;

const tabs = [
  "Overview", "Contacts", "Projects", "Commercial",
  "SLA", "Audit Log",
];

export default function ClientRegistry() {
  const router = useRouter();

  const [clients, setClients] = useState(initialClients);
  const [selectedId, setSelectedId] = useState("3");
  const [selectedRows, setSelectedRows] = useState<string[]>(["3"]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All Statuses");
  const [industry, setIndustry] = useState("All Industries");
  const [region, setRegion] = useState("All Regions");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [activeTab, setActiveTab] = useState("Overview");
  const [view, setView] = useState<"list" | "grid">("list");
  const [showFilters, setShowFilters] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [notice, setNotice] = useState("");

  const selectedClient = clients.find((c) => c.id === selectedId);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        [c.name, c.code, c.industry, c.location, c.email, c.accountManager]
          .some((v) => v.toLowerCase().includes(q));

      const matchesStatus = status === "All Statuses" || c.status === status;
      const matchesIndustry = industry === "All Industries" || c.industry === industry;
      const matchesRegion = region === "All Regions" || c.location.endsWith(region);

      return matchesSearch && matchesStatus && matchesIndustry && matchesRegion;
    });
  }, [clients, search, status, industry, region]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [search, status, industry, region, pageSize]);

  const activeCount = clients.filter((c) => c.status === "Active").length;
  const totalValue = clients.reduce((sum, c) => sum + c.value, 0);
  const totalProjects = clients.reduce((sum, c) => sum + c.projects, 0);

  function toggleRow(id: string) {
    setSelectedRows((old) =>
      old.includes(id) ? old.filter((x) => x !== id) : [...old, id]
    );
  }

  function toggleAll() {
    const ids = visible.map((c) => c.id);
    const allSelected = ids.every((id) => selectedRows.includes(id));
    setSelectedRows((old) =>
      allSelected ? old.filter((id) => !ids.includes(id)) : [...new Set([...old, ...ids])]
    );
  }

  function resetFilters() {
    setSearch("");
    setStatus("All Statuses");
    setIndustry("All Industries");
    setRegion("All Regions");
    setShowFilters(false);
  }

  function exportCSV() {
    const headers = [
      "Client Name", "Client Code", "Industry", "Location",
      "Projects", "Total Value", "Relationship Since", "Contract End",
      "Status", "Health", "Account Manager",
    ];

    const rows = filtered.map((c) => [
      c.name, c.code, c.industry, c.location, c.projects,
      c.value, c.relationship, c.contractEnd, c.status, c.health,
      c.accountManager,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "client-registry.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function removeClient(id: string) {
    const client = clients.find((c) => c.id === id);
    if (!client || !window.confirm(`Delete ${client.name}?`)) return;

    setClients((old) => old.filter((c) => c.id !== id));
    setSelectedRows((old) => old.filter((x) => x !== id));

    if (selectedId === id) {
      const next = clients.find((c) => c.id !== id);
      setSelectedId(next?.id ?? "");
    }
    setMenuId(null);
    setNotice("Client removed from the local demo list.");
  }

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  }

  function addContact(e: React.FormEvent) {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim()) return;
    setShowAddContact(false);
    setContactName("");
    setContactEmail("");
    showNotice("Contact captured in this demo. Connect the Contacts API to save permanently.");
  }

  const goEdit = () => { if (selectedClient) router.push(`/clients/${selectedClient.id}/edit`); };
  const goNew = () => router.push("/clients/new");

  return (
    <main className="cr-page">
      <div className="cr-heading">
        <div>
          <div className="cr-breadcrumb">
            <span>PMS</span><ChevronRight size={13} />
            <span>Client Management</span><ChevronRight size={13} />
            <b>Client Registry</b>
          </div>
          <div className="cr-title-line">
            <h1>Client Registry</h1>
            <span className="cr-code">{selectedClient?.code ?? "CLT-001"}</span>
          </div>
          <p>Manage all your clients, contracts, relationships and projects in one place.</p>
        </div>
        <button className="cr-primary" onClick={goNew}>
          <Plus size={16} /> Add New Client <ChevronDown size={14} />
        </button>
      </div>

      {notice && <div className="cr-toast">{notice}</div>}

      <section className="cr-stats">
        <Stat icon={<Users />} tone="blue" label="Total Clients" value={clients.length + 40} note="↑ 12% vs last quarter" />
        <Stat icon={<CheckCircle2 />} tone="green" label="Active Clients" value={activeCount + 34} note={`${((activeCount + 34) / (clients.length + 40) * 100).toFixed(1)}% of total`} />
        <Stat icon={<Building2 />} tone="violet" label="Onboarded This Year" value="11" note="↑ 22% vs last year" />
        <Stat icon={<IndianRupee />} tone="green" label="Total Project Value" value={money(totalValue + 113000000)} note="↑ 28% vs last year" />
        <Stat icon={<BriefcaseBusiness />} tone="blue" label="Active Projects" value={totalProjects + 59} note="Across all clients" />
        <Stat icon={<CalendarClock />} tone="orange" label="Renewals Due" value="6" note="Action Required" />
      </section>

      <section className="cr-workspace">
        <div className="cr-main">
          <div className="cr-toolbar">
            <label className="cr-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by client name, contact, email, city..."
              />
            </label>

            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>All Statuses</option><option>Active</option>
              <option>Inactive</option><option>On Hold</option>
            </select>

            <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
              <option>All Industries</option><option>Healthcare</option>
              <option>Education</option><option>Technology</option>
            </select>

            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option>All Regions</option><option>KA</option><option>MH</option>
              <option>DL</option><option>UP</option><option>TG</option>
              <option>TN</option><option>GJ</option>
            </select>

            <button className={`cr-outline ${showFilters ? "active" : ""}`} onClick={() => setShowFilters(!showFilters)}>
              <Filter size={14} /> More Filters
            </button>
            <button className="cr-outline cr-reset" onClick={resetFilters}>
              <RotateCcw size={14} /> Reset
            </button>
            <div className="cr-toolbar-spacer" />
            <button className="cr-outline" onClick={exportCSV}>
              <Download size={14} /> Export <ChevronDown size={13} />
            </button>
            <div className="cr-dropdown-wrap">
              <button className="cr-outline" onClick={() => setShowBulk(!showBulk)}>
                Bulk Actions <ChevronDown size={13} />
              </button>
              {showBulk && (
                <div className="cr-dropdown">
                  <button onClick={() => { showNotice(`${selectedRows.length} client(s) selected for export.`); setShowBulk(false); }}>
                    Export selected ({selectedRows.length})
                  </button>
                  <button onClick={() => { showNotice(`${selectedRows.length} client(s) selected.`); setShowBulk(false); }}>
                    Mark selected for review
                  </button>
                  <button onClick={() => { setSelectedRows([]); setShowBulk(false); }}>
                    Clear selection
                  </button>
                </div>
              )}
            </div>
            <div className="cr-view-toggle">
              <button className={view === "list" ? "selected" : ""} onClick={() => setView("list")} aria-label="List view"><List size={16} /></button>
              <button className={view === "grid" ? "selected" : ""} onClick={() => setView("grid")} aria-label="Grid view"><LayoutGrid size={16} /></button>
            </div>
          </div>

          {showFilters && (
            <div className="cr-extra-filters">
              <div><label>Client Type</label><select><option>All Types</option><option>Enterprise</option><option>Mid-Market</option><option>SMB</option></select></div>
              <div><label>Relationship Health</label><select><option>All Health</option><option>Excellent</option><option>Good</option><option>At Risk</option></select></div>
              <div><label>Account Manager</label><select><option>All Managers</option><option>Rahul Verma</option><option>Amit Kumar</option><option>Neha Patel</option></select></div>
              <button className="cr-outline" onClick={resetFilters}>Clear filters</button>
            </div>
          )}

          {view === "list" ? (
            <div className="cr-table-wrap">
              <table className="cr-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" checked={visible.length > 0 && visible.every((c) => selectedRows.includes(c.id))} onChange={toggleAll} /></th>
                    <th>Client Name <ChevronsUpDown size={12} /></th>
                    <th>Industry</th><th>Location</th><th>Active Projects</th>
                    <th>Total Value (₹)</th><th>Relationship Since</th>
                    <th>Contract End</th><th>Status</th><th>Health</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((client) => (
                    <tr key={client.id} className={`${selectedId === client.id ? "cr-selected-row" : ""}`} onClick={() => setSelectedId(client.id)}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedRows.includes(client.id)} onChange={() => toggleRow(client.id)} />
                      </td>
                      <td>
                        <div className="cr-client-cell">
                          <span className="cr-client-logo" style={{ color: client.color, background: `${client.color}12` }}>{client.logo}</span>
                          <span><b>{client.name}</b><small>{client.code}</small></span>
                        </div>
                      </td>
                      <td>{client.industry}</td><td>{client.location}</td>
                      <td className="cr-center">{client.projects}</td>
                      <td>{money(client.value)}</td><td>{client.relationship}</td>
                      <td>{client.contractEnd}</td>
                      <td><StatusPill status={client.status} /></td>
                      <td><HealthPill health={client.health} /></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="cr-row-menu">
                          <button className="cr-icon-btn" onClick={() => setMenuId(menuId === client.id ? null : client.id)}><MoreHorizontal size={17} /></button>
                          {menuId === client.id && (
                            <div className="cr-dropdown cr-row-dropdown">
                              <button onClick={() => { setSelectedId(client.id); setMenuId(null); }}> <Eye size={14} /> View Profile</button>
                              <button onClick={() => router.push(`/clients/${client.id}/edit`)}><Pencil size={14} /> Edit Client</button>
                              <button onClick={() => { setSelectedId(client.id); setShowAddContact(true); setMenuId(null); }}><UserPlus size={14} /> Add Contact</button>
                              <button className="danger" onClick={() => removeClient(client.id)}><Trash2 size={14} /> Delete</button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visible.length === 0 && <tr><td colSpan={11} className="cr-empty">No clients found. Try changing your search or filters.</td></tr>}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="cr-grid-view">
              {visible.map((client) => (
                <button className={`cr-client-card ${selectedId === client.id ? "active" : ""}`} key={client.id} onClick={() => setSelectedId(client.id)}>
                  <span className="cr-client-logo large" style={{ color: client.color, background: `${client.color}12` }}>{client.logo}</span>
                  <b>{client.name}</b><small>{client.code}</small>
                  <span>{client.location} · {client.industry}</span>
                  <StatusPill status={client.status} />
                  <strong>{money(client.value)}</strong>
                </button>
              ))}
            </div>
          )}

          <div className="cr-pagination">
            <span>{selectedRows.length} of {clients.length + 40} clients selected</span>
            <div className="cr-page-buttons">
              <button disabled={page <= 1} onClick={() => setPage(1)}>«</button>
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={14} /></button>
              {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
                const n = i + 1;
                return <button key={n} className={page === n ? "current" : ""} onClick={() => setPage(n)}>{n}</button>;
              })}
              {pageCount > 5 && <span>…</span>}
              <button disabled={page >= pageCount} onClick={() => setPage(page + 1)}><ChevronRight size={14} /></button>
              <button disabled={page >= pageCount} onClick={() => setPage(pageCount)}>»</button>
            </div>
            <span className="cr-page-info">Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} of {filtered.length} entries</span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              <option value={8}>8 / page</option><option value={10}>10 / page</option><option value={15}>15 / page</option>
            </select>
          </div>
        </div>

        <aside className="cr-profile">
          <div className="cr-profile-head">
            <h3>Client Profile</h3>
            <button className="cr-icon-btn" onClick={() => setSelectedId("")}><X size={16} /></button>
          </div>

          {selectedClient ? (
            <>
              <div className="cr-profile-intro">
                <span className="cr-client-logo profile-logo" style={{ color: selectedClient.color, background: `${selectedClient.color}12` }}>{selectedClient.logo}</span>
                <div><b>{selectedClient.name}</b><small>{selectedClient.code}</small></div>
                <StatusPill status={selectedClient.status} />
              </div>
              <p className="cr-profile-about">{selectedClient.about}</p>

              <div className="cr-profile-mini-grid">
                <Mini label="Industry" value={selectedClient.industry} />
                <Mini label="Head Office" value={selectedClient.headOffice} />
                <Mini label="Client Type" value={selectedClient.type} />
                <Mini label="No. of Branches" value={selectedClient.branches} />
                <Mini label="Relationship Since" value={selectedClient.relationship} />
                <Mini label="Contract End" value={selectedClient.contractEnd} />
                <Mini label="Account Manager" value={selectedClient.accountManager} />
                <Mini label="Relationship Health" value={selectedClient.health} />
              </div>

              <div className="cr-profile-actions">
                <button onClick={() => showNotice(`Opening details for ${selectedClient.name}`)}><Eye /><span>View Details</span></button>
                <button onClick={goEdit}><Pencil /><span>Edit Client</span></button>
                <button onClick={() => showNotice("Project creation route can be connected to your Projects module.")}><Plus /><span>Add Project</span></button>
                <button onClick={() => setShowAddContact(true)}><Users /><span>Add Contact</span></button>
              </div>

              <div className="cr-profile-section">
                <h4>Key Metrics</h4>
                <div className="cr-metric-grid">
                  <Metric label="Projects" value={String(selectedClient.projects)} tone="blue" />
                  <Metric label="Total Value" value={money(selectedClient.value)} tone="green" />
                  <Metric label="Invoiced" value="₹ 80.00 L" tone="blue" />
                  <Metric label="Outstanding" value="₹ 12.50 L" tone="red" />
                </div>
              </div>

              <div className="cr-profile-section">
                <div className="cr-section-title"><h4>Recent Projects</h4><button onClick={() => setActiveTab("Projects")}>View All</button></div>
                {["AI-CMS Implementation", "Lab Management System", "Mobile Patient App", "Data Analytics Dashboard"].slice(0, selectedClient.projects).map((name, i) => (
                  <div className="cr-project-line" key={name}>
                    <span>{name}</span><b className={i === 2 ? "risk" : ""}>{i === 2 ? "At Risk" : "On Track"}</b>
                    <div className="cr-project-progress"><i style={{ width: `${[65, 80, 40, 70][i]}%` }} /></div>
                    <small>{[65, 80, 40, 70][i]}%</small>
                  </div>
                ))}
              </div>

              <div className="cr-profile-section">
                <h4>Contract &amp; SLA</h4>
                <Mini label="Contract Value" value={money(selectedClient.value)} />
                <Mini label="Billing Model" value="Milestone Based" />
                <Mini label="Payment Terms" value="50% / 30% / 20%" />
                <Mini label="SLA Uptime" value="99.5%" />
                <Mini label="Support" value="24×7" />
              </div>
            </>
          ) : (
            <div className="cr-profile-empty">
              <Users size={30} />
              <b>No client selected</b>
              <span>Select a client from the registry to view its profile.</span>
              <button className="cr-outline" onClick={() => setSelectedId(clients[0]?.id ?? "")}>Select first client</button>
            </div>
          )}
        </aside>
      </section>

      {selectedClient && (
        <section className="cr-details">
          <div className="cr-detail-tabs">
            {tabs.map((tab) => (
              <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>
            ))}
          </div>
          <div className="cr-detail-content">
            {activeTab === "Overview" && (
              <Overview client={selectedClient} onEdit={goEdit} />
            )}

            {activeTab === "Contacts" && (
              <ClientContactsTab client={selectedClient} />
            )}

            {activeTab === "Projects" && (
              <ClientProjectsTab client={selectedClient} />
            )}

            {activeTab === "Commercial" && (
              <Commercial client={selectedClient} />
            )}

            {activeTab === "SLA" && (
              <ClientSLATab client={selectedClient} />
            )}

            {activeTab === "Audit Log" && (
              <Audit />
            )}
          </div>
        </section>
      )}

      {showAddContact && selectedClient && (
        <div className="cr-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowAddContact(false); }}>
          <form className="cr-modal" onSubmit={addContact}>
            <div className="cr-modal-head"><div><h3>Add Client Contact</h3><p>{selectedClient.name}</p></div><button type="button" className="cr-icon-btn" onClick={() => setShowAddContact(false)}><X size={18} /></button></div>
            <label>Contact Name<input value={contactName} onChange={(e) => setContactName(e.target.value)} required placeholder="Enter contact name" /></label>
            <label>Email Address<input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required placeholder="name@company.com" /></label>
            <div className="cr-modal-actions"><button type="button" className="cr-outline" onClick={() => setShowAddContact(false)}>Cancel</button><button className="cr-primary" type="submit"><Plus size={15} /> Add Contact</button></div>
          </form>
        </div>
      )}
    </main>
  );
}

function Stat({ icon, tone, label, value, note }: { icon: React.ReactNode; tone: string; label: string; value: React.ReactNode; note: string }) {
  return <div className="cr-stat"><span className={`cr-stat-icon ${tone}`}>{icon}</span><div><small>{label}</small><b>{value}</b><em>{note}</em></div></div>;
}

function StatusPill({ status }: { status: string }) {
  return <span className={`cr-status ${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>;
}

function HealthPill({ health }: { health: string }) {
  return <span className={`cr-health ${health.toLowerCase().replaceAll(" ", "-")}`}><i />{health}</span>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="cr-mini"><small>{label}</small><b>{value}</b></div>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className={`cr-metric ${tone}`}><small>{label}</small><b>{value}</b></div>;
}

function Overview({ client, onEdit }: { client: Client; onEdit: () => void }) {
  return (
    <div className="cr-overview-grid">
      <div className="cr-info-card">
        <div className="cr-card-title"><h4><Users size={15} /> Basic Information</h4><button onClick={onEdit}><Pencil size={13} /> Edit</button></div>
        <Info label="Client Name" value={client.name} />
        <Info label="Client Code" value={client.code} />
        <Info label="Industry" value={client.industry} />
        <Info label="Client Type" value={client.type} />
        <Info label="Website" value={client.website} link />
        <Info label="Phone" value={client.phone} />
        <Info label="Email" value={client.email} />
        <Info label="Head Office" value={client.headOffice} />
        <Info label="PAN" value="AAACS1234F" />
        <Info label="GST" value="07AAACS1234F1Z9" />
      </div>
      <div className="cr-overview-middle">
        <div className="cr-info-card">
          <h4><MapPin size={15} /> Address</h4>
          <p className="cr-address">{client.address}</p>
          <button className="cr-map-button" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`, "_blank")}><MapPin size={16} /></button>
        </div>
        <div className="cr-info-card">
          <h4><Building2 size={15} /> About Client</h4>
          <p>{client.about}</p>
        </div>
        <div className="cr-info-card">
          <h4><Tag size={15} /> Tags</h4>
          <div className="cr-tags">{client.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        </div>
      </div>
      <div className="cr-overview-right">
        <div className="cr-info-card">
          <h4><ShieldCheck size={15} /> Status &amp; Relationships</h4>
          <Info label="Status" value={client.status} />
          <Info label="Relationship Since" value={client.relationship} />
          <Info label="Contract End" value={client.contractEnd} />
          <Info label="Account Manager" value={client.accountManager} />
          <Info label="Delivery Manager" value="Neha Patel" />
          <Info label="Customer Success" value="Amit Kumar" />
        </div>
        <div className="cr-info-card">
          <h4><Landmark size={15} /> Department Access</h4>
          <div className="cr-tags">{client.departments.map((d) => <span key={d}>{d}</span>)}</div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, link = false }: { label: string; value: string; link?: boolean }) {
  return <div className="cr-info-row"><span>{label}</span>{link ? <a href={value} target="_blank" rel="noreferrer">{value} <ExternalLink size={11} /></a> : <b>{value}</b>}</div>;
}

function Commercial({ client }: { client: Client }) {
  return <div className="cr-tab-grid"><div className="cr-info-card"><h4><CircleDollarSign size={15} /> Commercial Overview</h4><Info label="Contract Value" value={money(client.value)} /><Info label="Billing Model" value="Milestone Based" /><Info label="Payment Terms" value="50% / 30% / 20%" /><Info label="Currency" value="INR (₹)" /></div><div className="cr-info-card"><h4><FileText size={15} /> Invoices & Payments</h4><Info label="Total Invoiced" value="₹ 80.00 L" /><Info label="Outstanding" value="₹ 12.50 L" /><Info label="Last Payment" value="15 May 2025" /><Info label="Next Due" value="15 Jun 2025" /></div></div>;
}

function Sla() {
  return <div className="cr-tab-grid"><div className="cr-info-card"><h4><ShieldCheck size={15} /> SLA Performance</h4><Info label="Uptime Commitment" value="99.5%" /><Info label="Current Uptime" value="99.8%" /><Info label="Support Coverage" value="24×7" /><Info label="Severity 1 Response" value="30 minutes" /></div><div className="cr-info-card"><h4><Clock3 size={15} /> Support Terms</h4><Info label="Standard Response" value="4 business hours" /><Info label="Resolution Target" value="1 business day" /><Info label="Escalation Manager" value="Rahul Verma" /></div></div>;
}

function Audit() {
  return <div className="cr-audit"><h4><Activity size={15} /> Recent Audit Activity</h4>{[["Client profile created", "Mayank Swaroop", "20 Nov 2023, 10:15 AM"], ["Contract details updated", "Rahul Verma", "12 Jan 2025, 02:30 PM"], ["Relationship status reviewed", "Neha Patel", "15 May 2025, 11:45 AM"]].map((a) => <div key={a[0]}><b>{a[0]}</b><span>{a[1]}</span><small>{a[2]}</small></div>)}</div>;
}


/* -------------------------------------------------------------------------- */
/* Client detail tabs                                                         */
/* -------------------------------------------------------------------------- */

type ClientContact = {
  name: string;
  designation: string;
  email: string;
  phone: string;
};

function ClientContactsTab({ client }: { client: Client }) {
  const [contacts, setContacts] = useState<ClientContact[]>([
    { name: "Dr. Prathap C. Reddy", designation: "Chairman", email: "prathap.reddy@apollohospitals.com", phone: "+91 40 2306 7001" },
    { name: "Suneeta Reddy", designation: "Managing Director", email: "suneeta.reddy@apollohospitals.com", phone: "+91 40 2306 7002" },
    { name: "Amit Kumar", designation: "CFO", email: "amit.kumar@apollohospitals.com", phone: "+91 40 2306 7003" },
    { name: "Ramesh Babu", designation: "IT Head", email: "ramesh.babu@apollohospitals.com", phone: "+91 40 2306 7004" },
    { name: "Krishna Murthy", designation: "Procurement Head", email: "krishna.murthy@apollohospitals.com", phone: "+91 40 2306 7005" },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setContacts((current) => [...current, { name: name.trim(), designation: designation.trim(), email: email.trim(), phone: phone.trim() }]);
    setName(""); setDesignation(""); setEmail(""); setPhone("");
    setShowForm(false);
  }

  return (
    <div className="cr-tab-panel">
      <div className="cr-tab-heading">
        <div><h3>Contacts</h3><p>People and key stakeholders associated with {client.name}.</p></div>
        <button className="cr-primary" onClick={() => setShowForm((v) => !v)}><Plus size={15} /> Add Contact</button>
      </div>

      {showForm && (
        <form className="cr-contact-form" onSubmit={handleAdd}>
          <label>Contact Name<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter full name" /></label>
          <label>Designation<input required value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Enter designation" /></label>
          <label>Email Address<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" /></label>
          <label>Phone Number<input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 ..." /></label>
          <div className="cr-form-actions">
            <button type="button" className="cr-outline" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="cr-primary"><Plus size={14} /> Save Contact</button>
          </div>
        </form>
      )}

      <div className="cr-data-table-wrap">
        <table className="cr-data-table">
          <thead><tr><th>Name</th><th>Designation</th><th>Email</th><th>Phone</th><th>Action</th></tr></thead>
          <tbody>
            {contacts.map((contact, index) => (
              <tr key={`${contact.email}-${index}`}>
                <td><b>{contact.name}</b></td><td>{contact.designation}</td><td>{contact.email}</td><td>{contact.phone}</td>
                <td><button className="cr-icon-btn" title="Remove contact" onClick={() => setContacts((current) => current.filter((_, i) => i !== index))}><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {contacts.length === 0 && <tr><td colSpan={5} className="cr-empty">No contacts added yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="cr-tab-footer">Showing {contacts.length} contacts</div>
    </div>
  );
}

type ClientProject = {
  code: string; name: string; manager: string; status: string;
  start: string; end: string; progress: number;
};

function ClientProjectsTab({ client }: { client: Client }) {
  const [projects, setProjects] = useState<ClientProject[]>([
    { code: "PRJ-00075", name: "AI-CMS Implementation", manager: "Rahul Verma", status: "In Progress", start: "01 Jan 2025", end: "30 Jun 2025", progress: 72 },
    { code: "PRJ-00064", name: "Mobile App Development", manager: "Neha Patel", status: "In Progress", start: "15 Feb 2025", end: "15 Aug 2025", progress: 45 },
    { code: "PRJ-00058", name: "Hospital Website Revamp", manager: "Amit Kumar", status: "Completed", start: "01 Dec 2024", end: "31 Mar 2025", progress: 100 },
    { code: "PRJ-00043", name: "Data Migration to Cloud", manager: "Rahul Verma", status: "In Progress", start: "01 Mar 2025", end: "31 May 2025", progress: 60 },
    { code: "PRJ-00031", name: "Support & Maintenance", manager: "Pooja Singh", status: "In Progress", start: "01 Apr 2025", end: "31 Mar 2026", progress: 30 },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [projectName, setProjectName] = useState("");

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextNumber = 76 + projects.length;
    setProjects((current) => [...current, {
      code: `PRJ-${String(nextNumber).padStart(5, "0")}`,
      name: projectName.trim(), manager: client.accountManager,
      status: "Planning", start: "Not scheduled", end: "Not scheduled", progress: 0,
    }]);
    setProjectName(""); setShowForm(false);
  }

  return (
    <div className="cr-tab-panel">
      <div className="cr-tab-heading">
        <div><h3>Projects</h3><p>Projects delivered and managed for {client.name}.</p></div>
        <button className="cr-primary" onClick={() => setShowForm((v) => !v)}><Plus size={15} /> Create Project</button>
      </div>
      {showForm && (
        <form className="cr-inline-form" onSubmit={handleCreate}>
          <input required value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Enter project name" />
          <button className="cr-primary" type="submit">Create Project</button>
          <button className="cr-outline" type="button" onClick={() => setShowForm(false)}>Cancel</button>
        </form>
      )}
      <div className="cr-data-table-wrap">
        <table className="cr-data-table">
          <thead><tr><th>Project Code</th><th>Project Name</th><th>Manager</th><th>Status</th><th>Start Date</th><th>End Date</th><th>Progress</th></tr></thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.code}>
                <td className="cr-blue-text">{project.code}</td><td><b>{project.name}</b></td><td>{project.manager}</td>
                <td><span className={`cr-project-status ${project.status === "Completed" ? "completed" : project.status === "Planning" ? "planning" : ""}`}>{project.status}</span></td>
                <td>{project.start}</td><td>{project.end}</td>
                <td><div className="cr-progress-cell"><div><i style={{ width: `${project.progress}%` }} /></div><b>{project.progress}%</b></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cr-tab-footer">{projects.length} projects associated with this client</div>
    </div>
  );
}

function ClientSLATab({ client }: { client: Client }) {
  const [clientStatus, setClientStatus] = useState<Client["status"]>(client.status);
  const [notify, setNotify] = useState(true);
  const [operation, setOperation] = useState("Update Status");
  const [message, setMessage] = useState("");
  const [permissions, setPermissions] = useState([
    { user: "Rahul Verma", role: "Account Manager", scope: "Department" },
    { user: "Neha Patel", role: "Project Manager", scope: "Project" },
    { user: "Amit Kumar", role: "Project Manager", scope: "Project" },
    { user: "Pooja Singh", role: "Finance Manager", scope: "Department" },
  ]);

  function applyChanges() {
    setMessage(`${operation} applied locally for ${client.name}. Notification ${notify ? "enabled" : "disabled"}.`);
  }

  return (
    <div className="cr-tab-panel">
      <div className="cr-tab-heading">
        <div><h3>SLA & Support</h3><p>Service commitments, access permissions and client status controls.</p></div>
        <span className="cr-status active">SLA Active</span>
      </div>

      <div className="cr-tab-grid">
        <div className="cr-info-card">
          <h4><ShieldCheck size={15} /> SLA Performance</h4>
          <Info label="Uptime Commitment" value="99.5%" /><Info label="Current Uptime" value="99.8%" />
          <Info label="Support Coverage" value="24×7" /><Info label="Severity 1 Response" value="30 minutes" />
          <Info label="Standard Response" value="4 business hours" /><Info label="Resolution Target" value="1 business day" />
        </div>
        <div className="cr-info-card">
          <h4><Clock3 size={15} /> Support Terms</h4>
          <Info label="Support Window" value="Mon - Sat (09:00 - 18:00)" /><Info label="Escalation Manager" value="Rahul Verma" />
          <Info label="SLA Document" value="SLA_Agreement_v1.pdf" /><Info label="Last Review Date" value="01 May 2025" />
          <Info label="Next Review Date" value="01 Nov 2025" />
        </div>
      </div>

      <div className="cr-sla-lower">
        <div className="cr-info-card">
          <div className="cr-card-title"><h4><Users size={15} /> Permissions</h4><span className="cr-status active">{permissions.length} Assigned</span></div>
          <div className="cr-data-table-wrap">
            <table className="cr-data-table">
              <thead><tr><th>User</th><th>Role</th><th>Scope</th><th>Action</th></tr></thead>
              <tbody>
                {permissions.map((item, index) => (
                  <tr key={item.user}><td><b>{item.user}</b></td><td>{item.role}</td><td>{item.scope}</td>
                    <td><button className="cr-icon-btn" title="Remove permission" onClick={() => setPermissions((current) => current.filter((_, i) => i !== index))}><Trash2 size={13} /></button></td>
                  </tr>
                ))}
                {permissions.length === 0 && <tr><td colSpan={4} className="cr-empty">No permissions assigned.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="cr-info-card">
          <h4><Activity size={15} /> Bulk Operations</h4>
          <label className="cr-field-label">Select Operation</label>
          <select className="cr-full-select" value={operation} onChange={(e) => setOperation(e.target.value)}>
            <option>Update Status</option><option>Review SLA</option><option>Send Client Notification</option>
          </select>
          <label className="cr-field-label">Selected Client</label>
          <div className="cr-selected-client">{client.name} ({client.code})</div>
          <label className="cr-field-label">New Status</label>
          <select className="cr-full-select" value={clientStatus} onChange={(e) => setClientStatus(e.target.value as Client["status"])}>
            <option>Active</option><option>Inactive</option><option>On Hold</option>
          </select>
          <label className="cr-check-line"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Send notification to client admins</label>
          <button className="cr-primary cr-apply" onClick={applyChanges}>Apply Changes</button>
          {message && <p className="cr-inline-message">{message}</p>}
        </div>

        <div className="cr-info-card">
          <h4><ShieldCheck size={15} /> Status Controls</h4>
          <div className="cr-status-workflow">
            {(["Onboarding", "Active", "Inactive", "Blacklisted"] as const).map((item, index) => (
              <span key={item} className={clientStatus === item ? "current" : ""}>{item}{index < 3 && <ChevronRight size={12} />}</span>
            ))}
          </div>
          <div className="cr-status-definitions">
            <p><i className="orange" /><b>Onboarding</b> Client is being onboarded. Limited access.</p>
            <p><i className="green" /><b>Active</b> Client is active and can create projects.</p>
            <p><i className="gray" /><b>Inactive</b> No new projects can be created.</p>
            <p><i className="red" /><b>Blacklisted</b> Access restricted due to policy / violation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
