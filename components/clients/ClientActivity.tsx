"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  Filter,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Send,
  Share2,
  SlidersHorizontal,
  Upload,
  Users,
  Video,
  X,
  Calendar,
  Download,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  getClientActivities,
  createClientActivity,
  deleteClientActivity,
  clients as getClients,
} from "@/lib/api";
import "./client-activity.css";

type ActivityItem = {
  id: string;
  backendId?: string;
  type: string;
  subject: string;
  related: string;
  clientId?: string;
  clientName?: string;
  by: string;
  channel: string;
  date: string;
  status: string;
  priority: string;
  message: string;
};

const activityTypes = [
  "Email",
  "Meeting",
  "Call",
  "Note",
  "Document Shared",
  "WhatsApp",
  "Task",
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
  return (
    <span className={`ca-type ca-${type.toLowerCase().replaceAll(" ", "-")}`}>
      <TypeIcon type={type} />
      {type}
    </span>
  );
}

function Panel({
  title,
  icon,
  action,
  children,
  className = "",
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`ca-panel ${className}`}>
      <div className="ca-panel-head">
        <h3>
          {icon}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="ca-stat">
      <span className={`ca-stat-icon ${color}`}>{icon}</span>
      <div>
        <small>{label}</small>
        <b>{value}</b>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="ca-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function ClientActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [selected, setSelected] = useState<ActivityItem | null>(null);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Activity Types");
  const [channelFilter, setChannelFilter] = useState("All Channels");
  const [userFilter, setUserFilter] = useState("All Users");
  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [activeTab, setActiveTab] = useState("Email");
  const [showFilters, setShowFilters] = useState(false);
  const [formType, setFormType] = useState("Email");
  const [formSubject, setFormSubject] = useState("");
  const [formTo, setFormTo] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formRelated, setFormRelated] = useState("General");
  const [formPriority, setFormPriority] = useState("High");
  const [toast, setToast] = useState("");
  const [page, setPage] = useState(1);
  const [detailOpen, setDetailOpen] = useState(true);

  const [clientList, setClientList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [actRes, clientsRes] = await Promise.allSettled([
        getClientActivities(),
        getClients(),
      ]);

      let cList: any[] = [];
      if (clientsRes.status === "fulfilled" && clientsRes.value) {
        cList = Array.isArray(clientsRes.value)
          ? clientsRes.value
          : (clientsRes.value as any)?.items || [];
        setClientList(cList);
        if (cList.length > 0 && !clientInfo) {
          setClientInfo(cList[0]);
          setFormTo(cList[0].email || "");
        }
      }

      if (actRes.status === "fulfilled" && actRes.value) {
        const list = Array.isArray(actRes.value)
          ? actRes.value
          : (actRes.value as any)?.items || [];
        const mapped: ActivityItem[] = list.map((item: any, i: number) => ({
          id: String(item._id || item.id || i + 1),
          backendId: String(item._id || item.id),
          type: item.type || "Note",
          subject: item.subject || "Client Activity",
          related: item.projectId?.projectName || item.clientId?.displayName || "General",
          clientId: String(item.clientId?._id || item.clientId || ""),
          clientName: item.clientId?.displayName || item.clientId?.legalName || "Client",
          by: item.performedByName || item.performedBy?.name || "Team Member",
          channel: item.channel || "Internal",
          date: item.createdAt
            ? new Date(item.createdAt).toLocaleString("en-GB")
            : "—",
          status: item.status || "Completed",
          priority: item.priority || "Normal",
          message: item.message || "Activity recorded.",
        }));
        setActivities(mapped);
        if (mapped.length > 0) {
          setSelected(mapped[0]);
        }
      }
    } catch (err) {
      console.warn("Client activity load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(
    () =>
      activities.filter(
        (a) =>
          `${a.subject} ${a.type} ${a.by} ${a.related}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (typeFilter === "All Activity Types" || a.type === typeFilter) &&
          (channelFilter === "All Channels" || a.channel === channelFilter) &&
          (userFilter === "All Users" || a.by === userFilter) &&
          (projectFilter === "All Projects" || a.related === projectFilter)
      ),
    [activities, search, typeFilter, channelFilter, userFilter, projectFilter]
  );

  const counts = {
    total: activities.length,
    email: activities.filter((a) => a.type === "Email").length,
    meeting: activities.filter((a) => a.type === "Meeting").length,
    notes: activities.filter((a) => a.type === "Note").length,
    calls: activities.filter((a) => a.type === "Call").length,
    other: activities.filter(
      (a) => !["Email", "Meeting", "Note", "Call"].includes(a.type)
    ).length,
  };

  const usersList = useMemo(
    () => Array.from(new Set(activities.map((a) => a.by))),
    [activities]
  );

  function notify(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2500);
  }

  async function handleCreateActivity() {
    if (!formSubject.trim()) {
      notify("Please enter a subject");
      return;
    }

    const clientId = clientInfo?._id || clientInfo?.id;
    if (!clientId) {
      notify("Please select a client to log activity");
      return;
    }

    try {
      await createClientActivity({
        clientId,
        type: formType,
        subject: formSubject.trim(),
        channel: formType === "Email" ? "Email" : formType === "WhatsApp" ? "WhatsApp" : formType === "Call" ? "Phone" : "Internal",
        priority: formPriority,
        message: formMessage.trim() || `Client activity: ${formSubject}`,
        status: "Completed",
      });

      setFormSubject("");
      setFormMessage("");
      notify("Activity logged successfully to database.");
      await loadData();
    } catch (err: any) {
      notify(err?.message || "Failed to log activity to API.");
    }
  }

  return (
    <main className="ca-page">
      {toast && (
        <div className="ca-toast">
          <CheckCircle2 size={15} />
          {toast}
        </div>
      )}

      <div className="ca-header">
        <div className="ca-header-title">
          <span className="ca-client-code">
            {clientInfo?.code || "CLT"}
          </span>
          <div>
            <b>Client Activity &amp; Communication</b>
            <small>Track all interactions and communication with clients</small>
          </div>
        </div>
        <div className="ca-header-actions">
          <button
            className="ca-btn primary"
            onClick={() =>
              document
                .getElementById("ca-create-activity")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <Plus size={13} /> New Activity
          </button>
        </div>
      </div>

      <div className="ca-client-card">
        <div className="ca-client-logo">
          {clientInfo?.logo ? (
            <img src={clientInfo.logo} alt="Client Logo" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 8 }} />
          ) : (
            <Building2 size={20} />
          )}
        </div>
        <div className="ca-client-info">
          <h2>
            {clientInfo?.name || "Client Details"}{" "}
            <span>{clientInfo?.status || "Active"}</span>
          </h2>
          <p>
            {clientInfo?.type || "Enterprise Client"} <i>•</i>{" "}
            {clientInfo?.industry || "Healthcare"} <i>•</i>{" "}
            {clientInfo?.address?.city || clientInfo?.city || "India"}
          </p>
        </div>
        <div className="ca-client-code-info">
          <small>Client Code</small>
          <b>{clientInfo?.code || "CLT-001"}</b>
        </div>
      </div>

      <div className="ca-stats-row">
        <Stat
          icon={<Clock3 size={15} />}
          label="Total Activities"
          value={String(counts.total)}
          color="blue"
        />
        <Stat
          icon={<Mail size={15} />}
          label="Emails"
          value={String(counts.email)}
          color="blue"
        />
        <Stat
          icon={<Users size={15} />}
          label="Meetings"
          value={String(counts.meeting)}
          color="green"
        />
        <Stat
          icon={<FileText size={15} />}
          label="Notes"
          value={String(counts.notes)}
          color="orange"
        />
        <Stat
          icon={<Phone size={15} />}
          label="Calls"
          value={String(counts.calls)}
          color="purple"
        />
        <Stat
          icon={<Activity size={15} />}
          label="Other"
          value={String(counts.other)}
          color="gray"
        />
      </div>

      <div className="ca-filter-bar">
        <div className="ca-search">
          <Search size={14} />
          <input
            placeholder="Search activities by subject, keyword, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option>All Activity Types</option>
          {activityTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
        >
          <option>All Users</option>
          {usersList.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <button
          className="ca-btn subtle"
          onClick={() => {
            setSearch("");
            setTypeFilter("All Activity Types");
            setUserFilter("All Users");
          }}
        >
          Reset
        </button>
      </div>

      <div className="ca-main-grid">
        <Panel
          title="Activity Log"
          icon={<Clock3 size={14} />}
          className="ca-list-panel"
        >
          <div className="ca-activity-list">
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <article
                  key={item.id}
                  className={`ca-activity-item ${
                    selected?.id === item.id ? "selected" : ""
                  }`}
                  onClick={() => setSelected(item)}
                >
                  <div className="ca-activity-top">
                    <TypeBadge type={item.type} />
                    <time>{item.date}</time>
                  </div>
                  <h4>{item.subject}</h4>
                  <p>{item.message}</p>
                  <div className="ca-activity-meta">
                    <span>By: {item.by}</span>
                    <span>Channel: {item.channel}</span>
                  </div>
                </article>
              ))
            ) : (
              <div
                style={{ textAlign: "center", padding: "32px", color: "#667085" }}
              >
                No client activity recorded yet.
              </div>
            )}
          </div>
        </Panel>

        {selected && (
          <Panel
            title="Activity Detail"
            icon={<FileText size={14} />}
            className="ca-detail-panel"
          >
            <div className="ca-detail-body">
              <div className="ca-detail-head">
                <TypeBadge type={selected.type} />
                <time>{selected.date}</time>
              </div>
              <h3>{selected.subject}</h3>
              <div className="ca-detail-meta">
                <div>
                  <small>Logged by:</small>
                  <b>{selected.by}</b>
                </div>
                <div>
                  <small>Channel:</small>
                  <b>{selected.channel}</b>
                </div>
                <div>
                  <small>Status:</small>
                  <b>{selected.status}</b>
                </div>
              </div>
              <div className="ca-detail-message">
                <h4>Details</h4>
                <p>{selected.message}</p>
              </div>
            </div>
          </Panel>
        )}
      </div>

      <div id="ca-create-activity">
        <Panel
          title="Log New Activity"
          icon={<Plus size={14} />}
          className="ca-create-panel"
        >
          <div className="ca-form-grid">
            <Field label="Activity Type">
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
              >
                {activityTypes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Subject *">
              <input
                placeholder="Enter activity subject"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
              />
            </Field>
            <Field label="To / Contact">
              <input
                placeholder="Contact email or phone"
                value={formTo}
                onChange={(e) => setFormTo(e.target.value)}
              />
            </Field>
            <Field label="Priority">
              <select
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value)}
              >
                <option>High</option>
                <option>Normal</option>
                <option>Low</option>
              </select>
            </Field>
          </div>
          <Field label="Details / Message">
            <textarea
              rows={4}
              placeholder="Enter activity notes or email body..."
              value={formMessage}
              onChange={(e) => setFormMessage(e.target.value)}
            />
          </Field>
          <button
            className="ca-btn primary"
            type="button"
            onClick={handleCreateActivity}
          >
            Save Activity
          </button>
        </Panel>
      </div>
    </main>
  );
}
