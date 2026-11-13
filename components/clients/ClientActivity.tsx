"use client";

import { useMemo, useState } from "react";
import {
  Activity, ArrowLeft, ArrowRight, Bell, CalendarDays, Check,
  ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3,
  FileText, Filter, Mail, MessageCircle, MoreHorizontal, Phone,
  Plus, Search, Send, Share2, SlidersHorizontal, Upload, Users,
  Video, X, Calendar, Download, CheckCircle2, AlertCircle
} from "lucide-react";
import "./client-activity.css";

type ActivityItem = {
  id: number;
  type: string;
  subject: string;
  related: string;
  by: string;
  channel: string;
  date: string;
  status: string;
  priority: string;
  message: string;
};

const initialActivities: ActivityItem[] = [
  {
    id: 1, type: "Email", subject: "Project status update for AI-CMS Implementation",
    related: "AI-CMS Implementation", by: "Rahul Verma", channel: "Email",
    date: "10 May 2025, 10:35 AM", status: "Sent", priority: "High",
    message: "Please find the latest status update for the AI-CMS Implementation project. We have completed 72% of overall progress and are on track to meet the June milestone."
  },
  {
    id: 2, type: "Meeting", subject: "Weekly review meeting",
    related: "AI-CMS Implementation", by: "Mayank Swaroop", channel: "Google Meet",
    date: "09 May 2025, 04:00 PM", status: "Completed", priority: "Normal",
    message: "Weekly review meeting to discuss current project progress, pending activities and next steps."
  },
  {
    id: 3, type: "Note", subject: "Discussed scope changes for EMR module",
    related: "EMR Integration", by: "Neha Patel", channel: "Internal Note",
    date: "09 May 2025, 11:20 AM", status: "Added", priority: "Normal",
    message: "Scope changes discussed with the client. Updated requirements are pending confirmation."
  },
  {
    id: 4, type: "Call", subject: "Follow up call with Dr. Prathap C. Reddy",
    related: "General", by: "Rahul Verma", channel: "Phone",
    date: "08 May 2025, 03:30 PM", status: "Completed", priority: "High",
    message: "Follow-up call regarding the implementation timeline and outstanding approvals."
  },
  {
    id: 5, type: "Email", subject: "Shared SOW_ApolloHospitals_v1.0.pdf",
    related: "EMR Integration", by: "Pooja Singh", channel: "Email",
    date: "08 May 2025, 11:15 AM", status: "Sent", priority: "Normal",
    message: "Statement of Work document shared for review and approval."
  },
  {
    id: 6, type: "Document Shared", subject: "Uploaded Architecture Diagram.pdf",
    related: "AI-CMS Implementation", by: "Amit Kumar", channel: "Portal",
    date: "07 May 2025, 05:10 PM", status: "Shared", priority: "Normal",
    message: "Architecture diagram uploaded and shared with the client team."
  },
  {
    id: 7, type: "WhatsApp", subject: "Quick update on UAT feedback",
    related: "AI-CMS Implementation", by: "Rahul Verma", channel: "WhatsApp",
    date: "07 May 2025, 12:40 PM", status: "Sent", priority: "Normal",
    message: "Quick update shared regarding the latest UAT feedback and pending items."
  },
  {
    id: 8, type: "Meeting", subject: "Kickoff meeting for Mobile App Development",
    related: "Mobile App Development", by: "Mayank Swaroop", channel: "Zoom",
    date: "06 May 2025, 10:30 AM", status: "Completed", priority: "Normal",
    message: "Project kickoff meeting completed with the client and delivery team."
  },
];

const activityTypes = ["Email", "Meeting", "Call", "Note", "Document Shared", "WhatsApp", "Task"];
const users = ["Rahul Verma", "Mayank Swaroop", "Neha Patel", "Pooja Singh", "Amit Kumar"];

const timelineItems = [
  { date: "10 May 2025", time: "10:35 AM", type: "Email", title: "Email Sent", detail: "Project status update for AI-CMS Implementation", by: "Rahul Verma to Dr. Prathap C. Reddy", priority: "High" },
  { date: "09 May 2025", time: "04:00 PM", type: "Meeting", title: "Meeting Completed", detail: "Weekly review meeting", by: "Mayank Swaroop", priority: "Normal" },
  { date: "09 May 2025", time: "11:20 AM", type: "Note", title: "Note Added", detail: "Discussed scope changes for EMR module", by: "Neha Patel", priority: "Normal" },
  { date: "08 May 2025", time: "03:30 PM", type: "Call", title: "Call Completed", detail: "Follow up call with Dr. Prathap C. Reddy", by: "Rahul Verma", priority: "High" },
  { date: "08 May 2025", time: "11:15 AM", type: "Document Shared", title: "Document Shared", detail: "Shared SOW_ApolloHospitals_v1.0.pdf", by: "Pooja Singh", priority: "Normal" },
];

const auditRows = [
  ["10 May 2025, 10:35 AM", "Activity Created", "Email", "Rahul Verma", "Email sent to Dr. Prathap C. Reddy"],
  ["10 May 2025, 10:35 AM", "Attachment Added", "Email", "Rahul Verma", "Added Status_Report_AI-CMS_May.pdf"],
  ["10 May 2025, 10:35 AM", "Status Updated", "Email", "Rahul Verma", "Status changed to Sent"],
  ["09 May 2025, 05:15 PM", "Activity Updated", "Note", "Neha Patel", "Updated note content"],
  ["10 May 2025, 04:20 PM", "Activity Deleted", "WhatsApp", "Amit Kumar", "Deleted WhatsApp message"],
];

function TypeIcon({ type }: { type: string }) {
  if (type === "Email") return <Mail size={12} />;
  if (type === "Meeting") return <Users size={12} />;
  if (type === "Call") return <Phone size={12} />;
  if (type === "Note") return <FileText size={12} />;
  if (type === "WhatsApp") return <MessageCircle size={12} />;
  if (type === "Document Shared") return <Upload size={12} />;
  return <CheckCircle2 size={12} />;
}

function TypeBadge({ type }: { type: string }) {
  return <span className={`ca-type ca-${type.toLowerCase().replaceAll(" ", "-")}`}><TypeIcon type={type} />{type}</span>;
}

function Panel({ title, icon, action, children, className = "" }: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`ca-panel ${className}`}>
      <div className="ca-panel-head">
        <h3>{icon}{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  return (
    <div className="ca-stat">
      <span className={`ca-stat-icon ${color}`}>{icon}</span>
      <div><small>{label}</small><b>{value}</b></div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="ca-field"><span>{label}</span>{children}</label>;
}

export default function ClientActivity() {
  const [activities, setActivities] = useState(initialActivities);
  const [selected, setSelected] = useState(initialActivities[0]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Activity Types");
  const [channelFilter, setChannelFilter] = useState("All Channels");
  const [userFilter, setUserFilter] = useState("All Users");
  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [activeTab, setActiveTab] = useState("Email");
  const [showFilters, setShowFilters] = useState(false);
  const [formType, setFormType] = useState("Email");
  const [formSubject, setFormSubject] = useState("");
  const [formTo, setFormTo] = useState("prathap.reddy@apollohospitals.com");
  const [formMessage, setFormMessage] = useState("");
  const [formRelated, setFormRelated] = useState("AI-CMS Implementation (PRJ-00075)");
  const [formPriority, setFormPriority] = useState("High");
  const [toast, setToast] = useState("");
  const [page, setPage] = useState(1);
  const [detailOpen, setDetailOpen] = useState(true);

  const filtered = useMemo(() => activities.filter(a =>
    `${a.subject} ${a.type} ${a.by} ${a.related}`.toLowerCase().includes(search.toLowerCase()) &&
    (typeFilter === "All Activity Types" || a.type === typeFilter) &&
    (channelFilter === "All Channels" || a.channel === channelFilter) &&
    (userFilter === "All Users" || a.by === userFilter) &&
    (projectFilter === "All Projects" || a.related === projectFilter)
  ), [activities, search, typeFilter, channelFilter, userFilter, projectFilter]);

  const counts = {
    total: activities.length,
    email: activities.filter(a => a.type === "Email").length,
    meeting: activities.filter(a => a.type === "Meeting").length,
    notes: activities.filter(a => a.type === "Note").length,
    documents: activities.filter(a => a.type === "Document Shared").length,
  };

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function resetFilters() {
    setSearch("");
    setTypeFilter("All Activity Types");
    setChannelFilter("All Channels");
    setUserFilter("All Users");
    setProjectFilter("All Projects");
    setShowFilters(false);
  }

  function sendActivity() {
    if (!formSubject.trim()) {
      notify("Please enter a subject");
      return;
    }
    if (!formMessage.trim()) {
      notify("Please enter activity message");
      return;
    }

    const next: ActivityItem = {
      id: Date.now(),
      type: formType,
      subject: formSubject,
      related: formRelated.split(" (")[0],
      by: "Mayank Swaroop",
      channel: formType === "Email" ? "Email" : formType === "Call" ? "Phone" : formType,
      date: new Date().toLocaleString("en-IN"),
      status: formType === "Note" ? "Added" : "Sent",
      priority: formPriority,
      message: formMessage,
    };

    setActivities(old => [next, ...old]);
    setSelected(next);
    setFormSubject("");
    setFormMessage("");
    notify("Activity created successfully");
  }

  return (
    <main className="ca-page">
      {toast && <div className="ca-toast"><CheckCircle2 size={15} />{toast}</div>}

      {/* Header is intentionally limited to module title/actions.
          Reuse your existing application Shell and sidebar. */}
      <div className="ca-header">
        <div className="ca-header-title">
          <span className="ca-client-code">CLT-006</span>
          <div><b>Client Activity / Communication</b><small>Track all interactions and communication with clients</small></div>
        </div>
        <div className="ca-header-actions">
          <button className="ca-btn primary" onClick={() => document.getElementById("ca-create-activity")?.scrollIntoView({ behavior: "smooth" })}>
            <Plus size={13} /> New Activity
          </button>
        </div>
      </div>

      {/* Client identity */}
      <div className="ca-client-card">
        <div className="ca-client-logo">✚</div>
        <div className="ca-client-info">
          <h2>Apollo Hospitals <span>Active</span></h2>
          <p>Enterprise Client <i>•</i> Healthcare <i>•</i> Hyderabad, Telangana, India</p>
        </div>
        <div className="ca-client-code-info"><small>Client Code</small><b>CLT-00086</b></div>
      </div>

      {/* Summary cards */}
      <div className="ca-stats">
        <Stat icon={<MessageCircle />} label="Total Activities" value="128" color="blue" />
        <Stat icon={<Mail />} label="Emails" value="42" color="green" />
        <Stat icon={<Phone />} label="Meeting / Calls" value="18" color="purple" />
        <Stat icon={<FileText />} label="Notes" value="21" color="orange" />
        <Stat icon={<FileText />} label="Documents Shared" value="15" color="navy" />
        <Stat icon={<Clock3 />} label="Last Activity" value="10 May 2025" color="amber" />
      </div>

      {/* Main activity table + details */}
      <div className={`ca-main-grid ${detailOpen ? "" : "detail-hidden"}`}>
        <Panel title="Activity" icon={<Activity size={13} />} className="ca-activity-list">
          <div className="ca-filter-toolbar">
            <label className="ca-search"><Search size={13} /><input placeholder="Search by subject, content, type, or person..." value={search} onChange={e => setSearch(e.target.value)} /></label>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option>All Activity Types</option>{activityTypes.map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)}>
              <option>All Channels</option>{["Email", "Google Meet", "Phone", "Internal Note", "Portal", "WhatsApp", "Zoom"].map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={userFilter} onChange={e => setUserFilter(e.target.value)}>
              <option>All Users</option>{users.map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
              <option>All Projects</option>{["AI-CMS Implementation", "EMR Integration", "Mobile App Development", "General"].map(t => <option key={t}>{t}</option>)}
            </select>
            <button className="ca-btn filter-btn" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={12} /> Filters</button>
            <button className="ca-btn" onClick={resetFilters}>Reset</button>
            <button className="ca-btn export-btn" onClick={() => notify("Export prepared")}><Download size={12} /> Export <ChevronDown size={11} /></button>
          </div>

          {showFilters && (
            <div className="ca-extra-filters">
              <Field label="Date Range"><input type="date" defaultValue="2025-05-01" /></Field>
              <Field label="Priority"><select><option>All Priorities</option><option>High</option><option>Normal</option></select></Field>
              <Field label="Status"><select><option>All Status</option><option>Sent</option><option>Completed</option></select></Field>
            </div>
          )}

          <div className="ca-table-scroll">
            <table className="ca-table">
              <thead><tr><th></th><th>Activity</th><th>Type</th><th>Subject / Summary</th><th>Related To</th><th>By</th><th>Channel</th><th>Date & Time</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className={selected.id === a.id ? "selected" : ""} onClick={() => { setSelected(a); setDetailOpen(true); }}>
                    <td><span className="ca-row-number">{a.id > 1000 ? "●" : a.id}</span></td>
                    <td><span className="ca-type-icon"><TypeIcon type={a.type} /></span></td>
                    <td><TypeBadge type={a.type} /></td>
                    <td className="ca-subject">{a.subject}</td>
                    <td>{a.related}</td><td>{a.by}</td><td>{a.channel}</td><td>{a.date}</td>
                    <td><button className="ca-icon-btn small" onClick={e => { e.stopPropagation(); setSelected(a); setDetailOpen(true); }}><MoreHorizontal size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && <div className="ca-empty">No activities found.</div>}
          </div>
          <div className="ca-table-footer">
            <span>Showing 1 to {filtered.length} of 128 entries</span>
            <div><button onClick={() => setPage(Math.max(1, page - 1))}><ChevronLeft size={12} /></button><button className="active">{page}</button><button onClick={() => setPage(page + 1)}>{page + 1}</button><button onClick={() => setPage(page + 2)}>{page + 2}</button><button>...</button><button>16</button><button onClick={() => setPage(page + 1)}><ChevronRight size={12} /></button><select><option>10 / page</option><option>25 / page</option></select></div>
          </div>
        </Panel>

        {detailOpen && (
          <Panel title="Activity Details" icon={<ArrowLeft size={13} />} action={<button className="ca-close" onClick={() => setDetailOpen(false)}><X size={14} /></button>} className="ca-detail-panel">
            <div className="ca-detail-top">
              <div className="ca-detail-type-icon"><TypeIcon type={selected.type} /></div>
              <div><div className="ca-detail-type">{selected.type} <span>{selected.status}</span></div><h3>{selected.subject}</h3></div>
            </div>
            <div className="ca-detail-actions">
              {["Reply", "Reply All", "Forward", "Mark as Important", "Add Follow-up", "Create Task", "Share Document", "Download", "Delete Activity"].map((item, i) => (
                <button key={item} className={i === 8 ? "danger" : ""} onClick={() => notify(`${item} action selected`)}>
                  {i === 0 ? <ArrowLeft size={12} /> : i === 1 ? <Users size={12} /> : i === 2 ? <Share2 size={12} /> : i === 8 ? <X size={12} /> : <Check size={12} />}{item}
                </button>
              ))}
            </div>
            <div className="ca-detail-fields">
              <div><small>Related To</small><b>{selected.related} (PRJ-00075)</b></div>
              <div><small>Client</small><b>Apollo Hospitals (CLT-00086)</b></div>
              <div><small>Priority</small><b className="high-text">{selected.priority}</b></div>
              <div><small>From</small><b>{selected.by} (rahul.verma@pehalhealth.com)</b></div>
              <div><small>To</small><b>prathap.reddy@apollohospitals.com<br />suneta.reddy@apollohospitals.com</b></div>
              <div><small>Date & Time</small><b>{selected.date}</b></div>
              <div><small>CC</small><b>neha.patel@pehalhealth.com</b></div>
              <div><small>Channel</small><b>{selected.channel}</b></div>
              <div><small>Status</small><b className="success-text">{selected.status}</b></div>
            </div>
            <div className="ca-attachments">
              <b>Attachments (2)</b>
              <div><span><FileText size={14} />Status_Report_AI-CMS_May.pdf <small>PDF · 245 KB</small></span><button onClick={() => notify("Downloading attachment")}><Download size={12} /></button></div>
              <div><span><FileText size={14} />Sprint_Burndown_May.png <small>PNG · 120 KB</small></span><button onClick={() => notify("Downloading attachment")}><Download size={12} /></button></div>
            </div>
            <div className="ca-message">
              <b>Message</b>
              <p>Dear Dr. Prathap,</p>
              <p>{selected.message}</p>
              <p>Regards,<br />{selected.by}<br />Project Manager<br />PehalHealthcare Technologies</p>
            </div>
            <div className="ca-related">
              <b>Related Activities</b>
              {timelineItems.slice(1, 4).map((item, i) => <div key={i}><span><TypeIcon type={item.type} /></span><p><b>{item.detail}</b><small>{item.date}, {item.time}</small></p></div>)}
              <a>View all (12) →</a>
            </div>
            <div className="ca-detail-pagination"><button onClick={() => setSelected(activities[Math.max(0, activities.findIndex(a => a.id === selected.id) - 1)])}><ArrowLeft size={11} /> Previous</button><button onClick={() => setSelected(activities[Math.min(activities.length - 1, activities.findIndex(a => a.id === selected.id) + 1)])}>Next <ArrowRight size={11} /></button></div>
          </Panel>
        )}
      </div>

      {/* Lower panels */}
      <div className="ca-middle-grid">
        <Panel title="Create New Activity" icon={<Plus size={13} />} action={<button className="ca-close" onClick={() => notify("Activity form is ready")}><X size={13} /></button>} className="ca-create-panel">
          <div className="ca-type-tabs">
            {["Email", "Call", "Meeting", "Note", "WhatsApp", "Task", "Document Share"].map(t => (
              <button key={t} className={formType === t ? "active" : ""} onClick={() => setFormType(t)}><TypeIcon type={t === "Document Share" ? "Document Shared" : t} />{t}</button>
            ))}
          </div>
          <div className="ca-create-fields">
            <Field label="Related To *"><select value={formRelated} onChange={e => setFormRelated(e.target.value)}><option>AI-CMS Implementation (PRJ-00075)</option><option>EMR Integration (PRJ-00029)</option><option>Mobile App Development (PRJ-00064)</option></select></Field>
            <div className="ca-field-inline"><Field label="To *"><input value={formTo} onChange={e => setFormTo(e.target.value)} /></Field><div className="ca-cc">CC&nbsp; BCC</div></div>
            <Field label="Subject *"><input value={formSubject} onChange={e => setFormSubject(e.target.value)} placeholder="Enter activity subject" /></Field>
            <div className="ca-editor-toolbar"><select><option>Normal</option><option>Heading</option></select><button>B</button><button><i>I</i></button><button><u>U</u></button><button>≡</button><button>☷</button><button>↗</button></div>
            <Field label="Message *"><textarea value={formMessage} onChange={e => setFormMessage(e.target.value)} placeholder="Write your message or activity details..." /></Field>
            <div className="ca-attach-row"><b>Attachments</b><button onClick={() => notify("Choose attachment")}>＋ Add Attachment</button></div>
            <div className="ca-send-row">
              <Field label="Priority"><select value={formPriority} onChange={e => setFormPriority(e.target.value)}><option>High</option><option>Normal</option><option>Low</option></select></Field>
              <Field label="Follow up on"><input type="date" defaultValue="2025-05-12" /></Field>
              <Field label="Time"><input type="time" defaultValue="10:00" /></Field>
              <button className="ca-btn primary" onClick={sendActivity}><Send size={12} /> Send</button>
            </div>
          </div>
        </Panel>

        <Panel title="Activity Timeline" icon={<Activity size={13} />} action={<select className="ca-compact-select"><option>All Activities</option><option>Emails</option><option>Meetings</option></select>} className="ca-timeline-panel">
          <div className="ca-timeline">
            {timelineItems.map((item, i) => (
              <div className="ca-timeline-item" key={i}>
                <div className="ca-timeline-date"><b>{item.date}</b><small>{item.time}</small></div>
                <div className="ca-timeline-marker"><span><TypeIcon type={item.type} /></span></div>
                <div className="ca-timeline-card">
                  <div><b>{item.title}</b><span className={item.priority === "High" ? "high" : "normal"}>{item.priority}</span></div>
                  <p>{item.detail}</p><small>By {item.by}</small>
                </div>
              </div>
            ))}
          </div>
          <a className="ca-view-link">View Full Timeline →</a>
        </Panel>

        <Panel title="Email Activity View" icon={<Mail size={13} />} action={<button className="ca-more-text" onClick={() => notify("More email actions")}>••• More</button>} className="ca-email-panel">
          <div className="ca-email-actions"><button onClick={() => notify("Reply selected")}>↶ Reply</button><button onClick={() => notify("Reply all selected")}>↶ Reply All</button><button onClick={() => notify("Forward selected")}>↗ Forward</button></div>
          <h4>{selected.subject}</h4>
          <div className="ca-email-meta">
            <span>From <b>Rahul Verma &lt;rahul.verma@pehalhealth.com&gt;</b></span>
            <span>10 May 2025, 10:35 AM</span>
            <span>To <b>Dr. Prathap C. Reddy &lt;prathap.reddy@apollohospitals.com&gt;</b></span>
          </div>
          <div className="ca-email-body">
            <p>Dear Dr. Prathap,</p>
            <p>{selected.message}</p>
            <p>Attached are the status report and sprint burndown chart for your reference.</p>
            <p>Regards,<br />Rahul Verma<br />Project Manager<br />PehalHealthcare Technologies</p>
          </div>
          <b className="ca-attachment-title">Attachments (2)</b>
          <div className="ca-attachment-inline"><span><FileText size={14} />Status_Report_AI-CMS_May.pdf <small>PDF · 245 KB</small></span><button><Download size={12} /></button><span><FileText size={14} />Sprint_Burndown_May.png <small>PNG · 120 KB</small></span><button><Download size={12} /></button></div>
        </Panel>

        <Panel title="Activity Summary by Type" icon={<ChartPieIcon />} action={<button className="ca-btn" onClick={() => notify("Report exported")}><Download size={11} /> Export</button>} className="ca-summary-panel">
          <select className="ca-date-select"><option>01 May 2025 - 10 May 2025</option><option>Last 30 Days</option><option>This Month</option></select>
          <div className="ca-summary-chart">
            <div className="ca-donut"><div><b>128</b><small>Total</small></div></div>
            <div className="ca-summary-legend">
              {[
                ["Emails", "42", "32.8%", "blue"], ["Meetings", "18", "14.06%", "teal"],
                ["Calls", "16", "12.5%", "orange"], ["Notes", "21", "16.4%", "purple"],
                ["Documents Shared", "15", "11.72%", "green"], ["WhatsApp", "8", "6.25%", "mint"],
                ["Tasks", "8", "6.25%", "gray"]
              ].map(x => <div key={x[0]}><i className={x[3]} /><span>{x[0]}</span><b>{x[1]} ({x[2]})</b></div>)}
            </div>
          </div>
          <h4 className="ca-users-heading">Top Communicated Users</h4>
          <table className="ca-users-table"><thead><tr><th>User</th><th>Sent</th><th>Received</th><th>Total</th></tr></thead><tbody>{[["Rahul Verma", "48", "36", "84"], ["Mayank Swaroop", "25", "31", "56"], ["Neha Patel", "18", "16", "34"], ["Pooja Singh", "12", "8", "20"], ["Amit Kumar", "8", "6", "14"]].map(x => <tr key={x[0]}>{x.map(v => <td key={v}>{v}</td>)}</tr>)}</tbody></table>
          <a className="ca-view-link">View Full Report →</a>
        </Panel>
      </div>

      {/* Filters, audit, heatmap and quick actions */}
      <div className="ca-bottom-grid">
        <Panel title="Activity Filters" icon={<Filter size={13} />} className="ca-filter-panel">
          <div className="ca-filter-form">
            <Field label="Date Range"><input type="date" defaultValue="2025-05-01" /></Field>
            <Field label="Activity Type"><select><option>All Types</option>{activityTypes.map(t => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Channel"><select><option>All Channels</option><option>Email</option><option>Phone</option></select></Field>
            <Field label="Related To"><select><option>All Projects</option><option>AI-CMS Implementation</option></select></Field>
            <Field label="Status"><select><option>All Status</option><option>Sent</option><option>Completed</option></select></Field>
            <Field label="Priority"><select><option>All Priorities</option><option>High</option><option>Normal</option></select></Field>
            <Field label="Created By"><select><option>All Users</option>{users.map(u => <option key={u}>{u}</option>)}</select></Field>
            <Field label="Keywords"><input placeholder="Search keywords..." /></Field>
          </div>
          <div className="ca-filter-actions"><button className="ca-btn" onClick={resetFilters}>Reset</button><button className="ca-btn primary" onClick={() => notify("Filters applied")}>Apply Filters</button></div>
        </Panel>

        <Panel title="Activity Audit Trail" icon={<Users size={13} />} action={<button className="ca-btn" onClick={() => notify("Audit exported")}><Download size={11} /> Export</button>} className="ca-audit-panel">
          <div className="ca-table-scroll">
            <table className="ca-audit-table"><thead><tr><th>Date & Time</th><th>Action</th><th>Activity Type</th><th>Performed By</th><th>Details</th></tr></thead><tbody>{auditRows.map((r, i) => <tr key={i} className={i === 4 ? "deleted" : ""}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody></table>
          </div>
          <a className="ca-view-link">View Full Audit Log →</a>
        </Panel>

        <Panel title="Communication Heatmap (Last 30 Days)" icon={<CalendarDays size={13} />} action={<select className="ca-compact-select"><option>Last 30 Days</option><option>Last 7 Days</option></select>} className="ca-heatmap-panel">
          <div className="ca-heatmap">
            <div className="ca-heatmap-dates"><span></span>{["11 Apr", "14 Apr", "17 Apr", "20 Apr", "23 Apr", "26 Apr", "29 Apr", "02 May", "06 May", "09 May"].map(d => <small key={d}>{d}</small>)}</div>
            {users.map((u, i) => <div className="ca-heatmap-row" key={u}><span>{u}</span><div>{Array.from({ length: 18 }, (_, j) => <i key={j} className={`heat-${(i * 3 + j * 2 + j % 3) % 5}`} />)}</div></div>)}
          </div>
          <div className="ca-heat-legend"><span>Less</span>{[0, 1, 2, 3, 4].map(i => <i key={i} className={`heat-${i}`} />)}<span>More</span></div>
          <a className="ca-view-link">View Detailed Analytics →</a>
        </Panel>

        <Panel title="Quick Actions (from Activity Module)" icon={<Plus size={13} />} className="ca-quick-panel">
          <div className="ca-quick-grid">
            {[
              [<Phone size={14} />, "Log Call", "Record a phone call with client"],
              [<Calendar size={14} />, "Schedule Meeting", "Create and send meeting invite"],
              [<Mail size={14} />, "Send Email", "Send email to client contacts"],
              [<FileText size={14} />, "Add Note", "Add an internal note"],
              [<Share2 size={14} />, "Share Document", "Share document with client"],
              [<CheckCircle2 size={14} />, "Create Task", "Create follow-up task"],
            ].map(([icon, title, desc], i) => (
              <button key={i} onClick={() => { setFormType(String(title).replace("Log ", "").replace("Schedule ", "")); document.getElementById("ca-create-activity")?.scrollIntoView({ behavior: "smooth" }); }}>
                <span>{icon}</span><b>{title}</b><small>{desc}</small>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </main>
  );
}

function ChartPieIcon() {
  return <Activity size={13} />;
}