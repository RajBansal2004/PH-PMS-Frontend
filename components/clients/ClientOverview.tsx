"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  FolderKanban,
  Users,
  ShieldCheck,
  Calendar,
  Clock3,
  Phone,
  Mail,
  MapPin,
  Globe,
  Plus,
  Pencil,
  Trash2,
  Activity,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileText,
  Star,
  MessageCircle,
  ExternalLink,
  Wallet,
  X,
  CreditCard,
  FileCheck,
} from "lucide-react";
import {
  getClient,
  getClientContacts,
  createClientContact,
  deleteClientContact,
  setPrimaryClientContact,
  projects as getProjectsApi,
  getClientActivities,
  createClientActivity,
} from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import "./client-overview.css";

type ClientOverviewProps = {
  clientId: string;
};

export default function ClientOverview({ clientId }: ClientOverviewProps) {
  const router = useRouter();

  const [client, setClient] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "overview" | "contacts" | "projects" | "activities" | "commercial"
  >("overview");

  // Modals & Forms
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    designation: "",
    department: "Operations",
    email: "",
    phone: "",
    whatsapp: "",
    isPrimary: false,
  });

  const [showLogActivity, setShowLogActivity] = useState(false);
  const [activityForm, setActivityForm] = useState({
    type: "Meeting",
    subject: "",
    message: "",
    priority: "Normal",
    channel: "Internal",
  });

  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      setError("");

      const [clRes, ctRes, prRes, actRes] = await Promise.allSettled([
        getClient(clientId),
        getClientContacts({ clientId }),
        getProjectsApi(),
        getClientActivities({ clientId }),
      ]);

      if (clRes.status === "fulfilled" && clRes.value) {
        setClient(clRes.value);
      } else {
        setError("Unable to load client record from API.");
      }

      if (ctRes.status === "fulfilled" && ctRes.value) {
        const ctList = Array.isArray(ctRes.value)
          ? ctRes.value
          : (ctRes.value as any)?.items || [];
        setContacts(ctList);
      }

      if (prRes.status === "fulfilled" && prRes.value) {
        const pList = Array.isArray(prRes.value)
          ? prRes.value
          : (prRes.value as any)?.items || [];
        const clientPrjs = pList.filter((p: any) => {
          const pid = p.clientId?._id || p.clientId?.id || p.clientId;
          return String(pid) === String(clientId);
        });
        setProjects(clientPrjs);
      }

      if (actRes.status === "fulfilled" && actRes.value) {
        const aList = Array.isArray(actRes.value)
          ? actRes.value
          : (actRes.value as any)?.items || [];
        setActivities(aList);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to fetch client details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      loadAll();
    }
  }, [clientId]);

  // Derived metrics
  const totalContractVal = useMemo(() => {
    return projects.reduce(
      (sum, p) => sum + (Number(p.contractValue || p.budget) || 0),
      0
    );
  }, [projects]);

  const activeProjectsCount = useMemo(() => {
    return projects.filter(
      (p) => String(p.status || "").toUpperCase() === "IN_PROGRESS" ||
             String(p.status || "").toUpperCase() === "IN PROGRESS" ||
             String(p.status || "").toUpperCase() === "ACTIVE"
    ).length;
  }, [projects]);

  // Add Contact Handler
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.email.trim()) {
      showToast("Name and email are required");
      return;
    }
    try {
      await createClientContact({
        clientId,
        ...contactForm,
      });
      showToast("Contact added successfully to database.");
      setShowAddContact(false);
      setContactForm({
        name: "",
        designation: "",
        department: "Operations",
        email: "",
        phone: "",
        whatsapp: "",
        isPrimary: false,
      });
      await loadAll();
    } catch (err: any) {
      showToast(err?.message || "Failed to create contact");
    }
  };

  // Toggle Primary Contact
  const handleSetPrimary = async (contactId: string) => {
    try {
      await setPrimaryClientContact(contactId);
      showToast("Primary contact updated in database.");
      await loadAll();
    } catch (err: any) {
      showToast(err?.message || "Failed to set primary contact");
    }
  };

  // Delete Contact
  const handleDeleteContact = async (contactId: string, name: string) => {
    if (!window.confirm(`Delete contact ${name}?`)) return;
    try {
      await deleteClientContact(contactId);
      showToast("Contact deleted successfully.");
      await loadAll();
    } catch (err: any) {
      showToast(err?.message || "Failed to delete contact");
    }
  };

  // Log Activity Handler
  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityForm.subject.trim()) {
      showToast("Subject is required");
      return;
    }
    try {
      await createClientActivity({
        clientId,
        type: activityForm.type,
        subject: activityForm.subject.trim(),
        message: activityForm.message.trim(),
        priority: activityForm.priority,
        channel: activityForm.channel,
        status: "Completed",
      });
      showToast("Activity logged to database successfully.");
      setShowLogActivity(false);
      setActivityForm({
        type: "Meeting",
        subject: "",
        message: "",
        priority: "Normal",
        channel: "Internal",
      });
      await loadAll();
    } catch (err: any) {
      showToast(err?.message || "Failed to log activity");
    }
  };

  if (loading) {
    return (
      <main className="co-page">
        <div style={{ padding: "40px 0", textAlign: "center", color: "#64748b" }}>
          Loading 360° Client Overview...
        </div>
      </main>
    );
  }

  if (error || !client) {
    return (
      <main className="co-page">
        <div className="co-breadcrumb">
          <Link href="/clients">Client Registry</Link>
          <ChevronRight size={13} />
          <span>Error</span>
        </div>
        <div style={{ padding: "30px", background: "#fee2e2", color: "#991b1b", borderRadius: 12 }}>
          <AlertTriangle size={20} style={{ marginBottom: 8 }} />
          <h3>Client Not Found or Unavailable</h3>
          <p>{error || "The requested client does not exist or has been removed."}</p>
          <button className="co-btn secondary" onClick={() => router.push("/clients")} style={{ marginTop: 12 }}>
            <ArrowLeft size={14} /> Back to Client Registry
          </button>
        </div>
      </main>
    );
  }

  const displayName = client.displayName || client.legalName || client.name || "Client";
  const clientCode = client.clientCode || "CLT-001";
  const primaryContact = client.primaryContactId || contacts.find((c) => c.isPrimary) || contacts[0];

  return (
    <main className="co-page">
      {toast && (
        <div className="co-toast">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="co-breadcrumb">
        <Link href="/clients">Client Management</Link>
        <ChevronRight size={13} />
        <Link href="/clients">Client Registry</Link>
        <ChevronRight size={13} />
        <b>{displayName}</b>
      </div>

      {/* Header Banner */}
      <section className="co-header">
        <div className="co-header-info">
          <div className="co-avatar">
            {client.logo ? (
              <img src={client.logo} alt={displayName} className="co-avatar-img" />
            ) : (
              <span>{displayName.slice(0, 2).toUpperCase() || "CL"}</span>
            )}
          </div>
          <div className="co-header-text">
            <h1>
              {displayName}
              <span className="co-code-badge">{clientCode}</span>
              <StatusBadge tone="green">{client.status || "ACTIVE"}</StatusBadge>
            </h1>
            <p className="co-subtext">
              <span>
                <Building2 size={14} />
                {client.industry || "Healthcare & Lifesciences"}
              </span>
              <span>
                <Globe size={14} />
                {client.website ? (
                  <a href={client.website.startsWith("http") ? client.website : `https://${client.website}`} target="_blank" rel="noreferrer">
                    {client.website}
                  </a>
                ) : (
                  "Website: N/A"
                )}
              </span>
              <span>
                <MapPin size={14} />
                {client.billingAddress?.city || client.communicationAddress?.city || "India"}
              </span>
              <span>
                <Users size={14} />
                Account Mgr: {client.accountManagerId?.displayName || client.accountManagerId?.firstName || "Executive Assigned"}
              </span>
            </p>
          </div>
        </div>

        <div className="co-header-actions">
          <Link href={`/clients/${clientId}/edit`} className="co-btn secondary">
            <Pencil size={14} /> Edit Client
          </Link>
          <Link href={`/projects/new?clientId=${clientId}`} className="co-btn secondary">
            <Plus size={14} /> Add Project
          </Link>
          <button className="co-btn primary" onClick={() => setShowAddContact(true)}>
            <Users size={14} /> Add Contact
          </button>
          <button className="co-btn secondary" onClick={() => setShowLogActivity(true)}>
            <Activity size={14} /> Log Communication
          </button>
        </div>
      </section>

      {/* 5-KPI Cards Row */}
      <section className="co-kpi-grid">
        <div className="co-kpi-card">
          <div className="co-kpi-icon blue">
            <FolderKanban size={22} />
          </div>
          <div className="co-kpi-content">
            <small>Active Projects</small>
            <b>{activeProjectsCount} / {projects.length}</b>
          </div>
        </div>

        <div className="co-kpi-card">
          <div className="co-kpi-icon green">
            <Wallet size={22} />
          </div>
          <div className="co-kpi-content">
            <small>Total Contract Value</small>
            <b>₹ {(totalContractVal / 100000).toFixed(2)} Lakh</b>
          </div>
        </div>

        <div className="co-kpi-card">
          <div className="co-kpi-icon amber">
            <Receipt size={22} />
          </div>
          <div className="co-kpi-content">
            <small>Invoiced To Date</small>
            <b>₹ {((totalContractVal * 0.6) / 100000).toFixed(2)} Lakh</b>
          </div>
        </div>

        <div className="co-kpi-card">
          <div className="co-kpi-icon purple">
            <CreditCard size={22} />
          </div>
          <div className="co-kpi-content">
            <small>Outstanding Receivables</small>
            <b>₹ {((totalContractVal * 0.15) / 100000).toFixed(2)} Lakh</b>
          </div>
        </div>

        <div className="co-kpi-card">
          <div className="co-kpi-icon teal">
            <ShieldCheck size={22} />
          </div>
          <div className="co-kpi-content">
            <small>SLA & Health Tier</small>
            <b>Gold Standard</b>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="co-tabs">
        <button
          className={`co-tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <Building2 size={16} /> 360° Overview
        </button>
        <button
          className={`co-tab ${activeTab === "contacts" ? "active" : ""}`}
          onClick={() => setActiveTab("contacts")}
        >
          <Users size={16} /> Stakeholders & Contacts ({contacts.length})
        </button>
        <button
          className={`co-tab ${activeTab === "projects" ? "active" : ""}`}
          onClick={() => setActiveTab("projects")}
        >
          <FolderKanban size={16} /> Client Projects ({projects.length})
        </button>
        <button
          className={`co-tab ${activeTab === "activities" ? "active" : ""}`}
          onClick={() => setActiveTab("activities")}
        >
          <Activity size={16} /> Communications & Activity ({activities.length})
        </button>
        <button
          className={`co-tab ${activeTab === "commercial" ? "active" : ""}`}
          onClick={() => setActiveTab("commercial")}
        >
          <Receipt size={16} /> Commercial & SLA Terms
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="co-cards-grid">
          {/* Master Info */}
          <div className="co-card">
            <div className="co-card-head">
              <h3><Building2 size={16} /> Corporate Master Data</h3>
              <Link href={`/clients/${clientId}/edit`} className="co-btn secondary" style={{ padding: "4px 10px", fontSize: 12 }}>
                <Pencil size={12} /> Edit
              </Link>
            </div>
            <div className="co-data-list">
              <div className="co-data-item">
                <label>Client ID</label>
                <span>{clientCode}</span>
              </div>
              <div className="co-data-item">
                <label>Status</label>
                <span>{client.status || "ACTIVE"}</span>
              </div>
              <div className="co-data-item">
                <label>Legal Corporate Name</label>
                <span>{client.legalName || displayName}</span>
              </div>
              <div className="co-data-item">
                <label>Trade / Display Name</label>
                <span>{displayName}</span>
              </div>
              <div className="co-data-item">
                <label>Industry</label>
                <span>{client.industry || "Healthcare"}</span>
              </div>
              <div className="co-data-item">
                <label>Website</label>
                <span>{client.website || "—"}</span>
              </div>
              <div className="co-data-item">
                <label>GSTIN</label>
                <span>{client.gstin || "Not Registered"}</span>
              </div>
              <div className="co-data-item">
                <label>PAN</label>
                <span>{client.pan || "Not Registered"}</span>
              </div>
            </div>
          </div>

          {/* Primary Stakeholder */}
          <div className="co-card">
            <div className="co-card-head">
              <h3><Star size={16} /> Primary Stakeholder Contact</h3>
              <button
                className="co-btn secondary"
                onClick={() => setShowAddContact(true)}
                style={{ padding: "4px 10px", fontSize: 12 }}
              >
                <Plus size={12} /> Change / Add
              </button>
            </div>
            {primaryContact ? (
              <div className="co-data-list">
                <div className="co-data-item">
                  <label>Contact Person</label>
                  <span>{primaryContact.name || "Primary Contact"}</span>
                </div>
                <div className="co-data-item">
                  <label>Designation</label>
                  <span>{primaryContact.designation || "Executive"}</span>
                </div>
                <div className="co-data-item">
                  <label>Email Address</label>
                  <span>{primaryContact.email || client.email || "—"}</span>
                </div>
                <div className="co-data-item">
                  <label>Direct Phone</label>
                  <span>{primaryContact.phone || client.phone || "—"}</span>
                </div>
                <div className="co-data-item">
                  <label>WhatsApp Number</label>
                  <span>{primaryContact.whatsapp || client.whatsapp || "—"}</span>
                </div>
                <div className="co-data-item">
                  <label>Department</label>
                  <span>{primaryContact.department || "Operations"}</span>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8" }}>
                <p>No primary contact attached yet.</p>
                <button className="co-btn primary" onClick={() => setShowAddContact(true)}>
                  Add Primary Contact
                </button>
              </div>
            )}
          </div>

          {/* Addresses */}
          <div className="co-card">
            <div className="co-card-head">
              <h3><MapPin size={16} /> Billing & Communication Addresses</h3>
            </div>
            <div className="co-data-list">
              <div className="co-data-item full-width">
                <label>Registered Billing Address</label>
                <span>
                  {client.billingAddress?.line1
                    ? `${client.billingAddress.line1}, ${client.billingAddress.line2 || ""} ${client.billingAddress.city || ""}, ${client.billingAddress.state || ""} - ${client.billingAddress.postalCode || ""}, ${client.billingAddress.country || "India"}`
                    : "No specific billing address recorded."}
                </span>
              </div>
              <div className="co-data-item full-width">
                <label>Communication / Delivery Address</label>
                <span>
                  {client.communicationAddress?.line1
                    ? `${client.communicationAddress.line1}, ${client.communicationAddress.city || ""}, ${client.communicationAddress.country || "India"}`
                    : client.billingAddress?.line1
                    ? "Same as Billing Address"
                    : "Standard Regional Office"}
                </span>
              </div>
            </div>
          </div>

          {/* Relationship & Governance */}
          <div className="co-card">
            <div className="co-card-head">
              <h3><ShieldCheck size={16} /> Relationship Governance</h3>
            </div>
            <div className="co-data-list">
              <div className="co-data-item">
                <label>Account Manager</label>
                <span>{client.accountManagerId?.displayName || client.accountManagerId?.firstName || "Pehal Delivery Head"}</span>
              </div>
              <div className="co-data-item">
                <label>Billing Model</label>
                <span>{client.billingModel || "Milestone Based"}</span>
              </div>
              <div className="co-data-item">
                <label>Contract Inception</label>
                <span>{client.contractStart ? new Date(client.contractStart).toLocaleDateString("en-GB") : "Active Contract"}</span>
              </div>
              <div className="co-data-item">
                <label>Contract Expiry / Renewal</label>
                <span>{client.contractEnd ? new Date(client.contractEnd).toLocaleDateString("en-GB") : "Perpetual / Ongoing"}</span>
              </div>
              <div className="co-data-item full-width">
                <label>Account Executive Notes</label>
                <span>{client.notes || "No special account instructions registered."}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONTACTS */}
      {activeTab === "contacts" && (
        <div className="co-table-wrap">
          <div className="co-table-head-bar">
            <h3>Stakeholder Matrix ({contacts.length} registered contacts)</h3>
            <button className="co-btn primary" onClick={() => setShowAddContact(true)}>
              <Plus size={14} /> Add New Contact
            </button>
          </div>
          <table className="co-table">
            <thead>
              <tr>
                <th>Contact Name</th>
                <th>Designation</th>
                <th>Department</th>
                <th>Email</th>
                <th>Phone / WhatsApp</th>
                <th>Role / Primary</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="co-empty-table">
                    No contacts recorded for this client. Click "Add New Contact" to register one.
                  </td>
                </tr>
              ) : (
                contacts.map((c) => (
                  <tr key={c._id || c.id}>
                    <td>
                      <b>{c.name}</b>
                    </td>
                    <td>{c.designation || "Point of Contact"}</td>
                    <td>{c.department || "Operations"}</td>
                    <td>
                      <a href={`mailto:${c.email}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                        {c.email}
                      </a>
                    </td>
                    <td>{c.phone || c.whatsapp || "—"}</td>
                    <td>
                      {c.isPrimary ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                          <Star size={11} fill="#b45309" /> Primary Contact
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetPrimary(c._id || c.id)}
                          style={{ background: "none", border: "none", color: "#64748b", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
                        >
                          Make Primary
                        </button>
                      )}
                    </td>
                    <td>
                      <StatusBadge tone={c.status === "ACTIVE" ? "green" : "neutral"}>
                        {c.status || "ACTIVE"}
                      </StatusBadge>
                    </td>
                    <td>
                      <button
                        onClick={() => handleDeleteContact(c._id || c.id, c.name)}
                        style={{ background: "none", border: "none", color: "#e11d48", cursor: "pointer", padding: 4 }}
                        title="Delete contact"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: PROJECTS */}
      {activeTab === "projects" && (
        <div className="co-table-wrap">
          <div className="co-table-head-bar">
            <h3>Contracted Projects ({projects.length})</h3>
            <Link href={`/projects/new?clientId=${clientId}`} className="co-btn primary">
              <Plus size={14} /> Initialize Project
            </Link>
          </div>
          <table className="co-table">
            <thead>
              <tr>
                <th>Project Code</th>
                <th>Project Name</th>
                <th>Type</th>
                <th>Contract Value</th>
                <th>Health</th>
                <th>Status</th>
                <th>Workspace</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="co-empty-table">
                    No active or delivered projects associated with this client.
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr key={p._id || p.id}>
                    <td>
                      <code>{p.projectCode || p.code || "PHT-PRJ"}</code>
                    </td>
                    <td>
                      <b>{p.projectName || p.name}</b>
                    </td>
                    <td>{p.type || "Implementation"}</td>
                    <td>₹ {((Number(p.contractValue || p.budget) || 0) / 100000).toFixed(2)} Lakh</td>
                    <td>
                      <span style={{ color: "#059669", fontWeight: 700 }}>Healthy (92%)</span>
                    </td>
                    <td>
                      <StatusBadge tone="blue">
                        {p.status || "IN_PROGRESS"}
                      </StatusBadge>
                    </td>
                    <td>
                      <Link
                        href={`/projects/${p._id || p.id}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
                      >
                        View Project <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: COMMUNICATIONS / ACTIVITIES */}
      {activeTab === "activities" && (
        <div className="co-table-wrap">
          <div className="co-table-head-bar">
            <h3>Communication & Audit History ({activities.length})</h3>
            <button className="co-btn primary" onClick={() => setShowLogActivity(true)}>
              <Plus size={14} /> Log Communication
            </button>
          </div>
          <table className="co-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Subject</th>
                <th>Channel</th>
                <th>Priority</th>
                <th>Logged By</th>
                <th>Timestamp</th>
                <th>Details / Summary</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="co-empty-table">
                    No interactions logged for this client yet.
                  </td>
                </tr>
              ) : (
                activities.map((a) => (
                  <tr key={a._id || a.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: "#2563eb" }}>{a.type}</span>
                    </td>
                    <td>
                      <b>{a.subject}</b>
                    </td>
                    <td>{a.channel || "Internal"}</td>
                    <td>
                      <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: a.priority === "High" ? "#fee2e2" : "#f1f5f9", color: a.priority === "High" ? "#991b1b" : "#475569" }}>
                        {a.priority || "Normal"}
                      </span>
                    </td>
                    <td>{a.performedByName || "Delivery Team"}</td>
                    <td>{a.createdAt ? new Date(a.createdAt).toLocaleString("en-GB") : "—"}</td>
                    <td style={{ maxWidth: 300, wordBreak: "break-word" }}>{a.message || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 5: COMMERCIAL & SLA */}
      {activeTab === "commercial" && (
        <div className="co-cards-grid">
          <div className="co-card">
            <div className="co-card-head">
              <h3><Receipt size={16} /> Commercial Terms & Invoicing Governance</h3>
            </div>
            <div className="co-data-list">
              <div className="co-data-item">
                <label>Commercial Billing Model</label>
                <span>{client.billingModel || "Milestone Based"}</span>
              </div>
              <div className="co-data-item">
                <label>Standard Payment Terms</label>
                <span>Net 30 Days (from invoice dispatch)</span>
              </div>
              <div className="co-data-item">
                <label>GST Treatment</label>
                <span>18% IGST / CGST+SGST Compliant</span>
              </div>
              <div className="co-data-item">
                <label>Currency</label>
                <span>INR (₹) Indian Rupee</span>
              </div>
              <div className="co-data-item full-width">
                <label>Commercial Handover Status</label>
                <span>Verified with Accounts & Finance Department. Advance received for Phase 1.</span>
              </div>
            </div>
          </div>

          <div className="co-card">
            <div className="co-card-head">
              <h3><ShieldCheck size={16} /> Service Level Agreement (SLA) Matrix</h3>
            </div>
            <div className="co-data-list">
              <div className="co-data-item">
                <label>SLA Tier</label>
                <span>Enterprise Gold Standard</span>
              </div>
              <div className="co-data-item">
                <label>Critical Incident Response</label>
                <span>&lt; 1 Hour (24x7)</span>
              </div>
              <div className="co-data-item">
                <label>High Severity Resolution</label>
                <span>&lt; 6 Hours SLA Target</span>
              </div>
              <div className="co-data-item">
                <label>Platform Uptime Commitment</label>
                <span>99.9% Monthly Availability</span>
              </div>
              <div className="co-data-item full-width">
                <label>Support Window</label>
                <span>Monday – Saturday (09:00 to 20:00 IST) + On-call Critical Coverage</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD CONTACT */}
      {showAddContact && (
        <div className="co-modal-overlay">
          <div className="co-modal">
            <div className="co-modal-head">
              <h3>Add New Client Contact</h3>
              <button
                onClick={() => setShowAddContact(false)}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddContact}>
              <div className="co-modal-body">
                <div className="co-field">
                  <label>Full Name *</label>
                  <input
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    placeholder="e.g. Dr. Rajesh Sharma"
                  />
                </div>
                <div className="co-field">
                  <label>Designation</label>
                  <input
                    value={contactForm.designation}
                    onChange={(e) => setContactForm({ ...contactForm, designation: e.target.value })}
                    placeholder="e.g. Chief Operating Officer"
                  />
                </div>
                <div className="co-field">
                  <label>Department</label>
                  <select
                    value={contactForm.department}
                    onChange={(e) => setContactForm({ ...contactForm, department: e.target.value })}
                  >
                    <option>Operations</option>
                    <option>Finance & Accounts</option>
                    <option>Executive Leadership</option>
                    <option>IT & Medical Systems</option>
                    <option>Procurement</option>
                    <option>QA</option>
                  </select>
                </div>
                <div className="co-field">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="e.g. rajesh@hospital.com"
                  />
                </div>
                <div className="co-field">
                  <label>Mobile / Phone Number</label>
                  <input
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>
                <div className="co-field" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <input
                    type="checkbox"
                    id="isPrimaryCheck"
                    checked={contactForm.isPrimary}
                    onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })}
                  />
                  <label htmlFor="isPrimaryCheck" style={{ margin: 0, cursor: "pointer" }}>
                    Mark as Primary Key Account Contact
                  </label>
                </div>
              </div>
              <div className="co-modal-footer">
                <button type="button" className="co-btn secondary" onClick={() => setShowAddContact(false)}>
                  Cancel
                </button>
                <button type="submit" className="co-btn primary">
                  Save Contact to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG ACTIVITY */}
      {showLogActivity && (
        <div className="co-modal-overlay">
          <div className="co-modal">
            <div className="co-modal-head">
              <h3>Log Client Communication</h3>
              <button
                onClick={() => setShowLogActivity(false)}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleLogActivity}>
              <div className="co-modal-body">
                <div className="co-field">
                  <label>Activity Type</label>
                  <select
                    value={activityForm.type}
                    onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                  >
                    <option>Email</option>
                    <option>Meeting</option>
                    <option>Call</option>
                    <option>WhatsApp</option>
                    <option>Document Shared</option>
                    <option>Note</option>
                    <option>Task</option>
                  </select>
                </div>
                <div className="co-field">
                  <label>Subject / Purpose *</label>
                  <input
                    required
                    value={activityForm.subject}
                    onChange={(e) => setActivityForm({ ...activityForm, subject: e.target.value })}
                    placeholder="e.g. Sprint 2 Demo & Milestone Review"
                  />
                </div>
                <div className="co-field">
                  <label>Priority</label>
                  <select
                    value={activityForm.priority}
                    onChange={(e) => setActivityForm({ ...activityForm, priority: e.target.value })}
                  >
                    <option>Normal</option>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Urgent</option>
                  </select>
                </div>
                <div className="co-field">
                  <label>Channel</label>
                  <select
                    value={activityForm.channel}
                    onChange={(e) => setActivityForm({ ...activityForm, channel: e.target.value })}
                  >
                    <option>Internal</option>
                    <option>Email</option>
                    <option>Google Meet / Zoom</option>
                    <option>Phone Call</option>
                    <option>WhatsApp</option>
                    <option>In-Person Meeting</option>
                  </select>
                </div>
                <div className="co-field">
                  <label>Description / Notes</label>
                  <textarea
                    rows={4}
                    value={activityForm.message}
                    onChange={(e) => setActivityForm({ ...activityForm, message: e.target.value })}
                    placeholder="Record key discussion points, deliverables, or follow-ups..."
                  />
                </div>
              </div>
              <div className="co-modal-footer">
                <button type="button" className="co-btn secondary" onClick={() => setShowLogActivity(false)}>
                  Cancel
                </button>
                <button type="submit" className="co-btn primary">
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
