"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock3,
  FileText,
  FolderKanban,
  Grid2X2,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  Menu,
  Building2,
  ChartNoAxesCombined,
  Upload,
} from "lucide-react";
import {
  projects as getProjects,
  createProject as apiCreateProject,
  clients as getClients,
} from "@/lib/api";
import "./client-projects.css";

type Project = {
  id?: string;
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

const tabs = [
  "Overview",
  "Team",
  "Milestones",
  "Tasks",
  "Documents",
  "Finance",
  "Timeline",
  "Activity",
];

function Status({ value }: { value: Project["status"] }) {
  const cls = (value || "in-progress").toLowerCase().replaceAll(" ", "-");
  return <span className={`cp-status ${cls}`}>{value}</span>;
}

function Priority({ value }: { value: Project["priority"] }) {
  const cls = (value || "medium").toLowerCase();
  return <span className={`cp-priority ${cls}`}>{value}</span>;
}

function Progress({ value }: { value: number }) {
  return (
    <div className="cp-progress">
      <span>
        <i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </span>
      <b>{value}%</b>
    </div>
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
    <section className={`cp-panel ${className}`}>
      <div className="cp-panel-head">
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="cp-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="cp-detail-row">
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="cp-metric-box">
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}

function TeamRow({ person }: { person?: string[] }) {
  if (!person || !person[0]) return null;
  const initials = person[0]
    .split(/\s+/)
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="cp-team-row">
      <span className="cp-mini-avatar">{initials}</span>
      <div>
        <b>{person[0]}</b>
        <small>{person[1]}</small>
      </div>
      <small>{person[2]}</small>
      <strong>{person[3]}</strong>
    </div>
  );
}

export default function ClientProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [clientList, setClientList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("Overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [managerFilter, setManagerFilter] = useState("All Managers");
  const [priorityFilter, setPriorityFilter] = useState("All Priorities");
  const [createStep, setCreateStep] = useState(1);
  const [toast, setToast] = useState("");
  const [documentSearch, setDocumentSearch] = useState("");
  const [docCategory, setDocCategory] = useState("All Categories");

  const [projectForm, setProjectForm] = useState({
    type: "Implementation",
    code: "PRJ-001",
    name: "",
    client: "",
    description: "",
    start: "",
    end: "",
    manager: "",
    priority: "High",
    budget: "0",
  });

  const loadProjects = async () => {
    try {
      const [prjRes, cltRes] = await Promise.allSettled([
        getProjects(),
        getClients(),
      ]);

      if (cltRes.status === "fulfilled" && cltRes.value) {
        const cList = Array.isArray(cltRes.value)
          ? cltRes.value
          : (cltRes.value as any)?.items || [];
        setClientList(cList);
        if (cList.length > 0) {
          setClientInfo((prev: any) => prev || cList[0]);
          setProjectForm((prev) => ({
            ...prev,
            client: cList[0].displayName || cList[0].name || "",
          }));
        }
      }

      if (prjRes.status === "fulfilled" && prjRes.value) {
        const raw = Array.isArray(prjRes.value)
          ? prjRes.value
          : (prjRes.value as any)?.items || [];
        const mapped: Project[] = raw.map((p: any) => {
          let st: Project["status"] = "In Progress";
          const rawSt = String(p.status || "").toUpperCase();
          if (rawSt === "COMPLETED") st = "Completed";
          else if (rawSt === "ON HOLD" || rawSt === "ON_HOLD") st = "On Hold";
          else if (rawSt === "CANCELLED") st = "Cancelled";

          let pr: Project["priority"] = "Medium";
          const rawPr = String(p.priority || "").toUpperCase();
          if (rawPr === "HIGH" || rawPr === "CRITICAL") pr = "High";
          else if (rawPr === "LOW") pr = "Low";

          return {
            id: p._id,
            code: p.projectCode || p.code || "PRJ",
            name: p.projectName || p.name || "Untitled Project",
            type: p.projectCategory || p.type || "Implementation",
            manager: p.projectManagerId?.displayName || p.projectManagerId?.name || p.manager?.name || "Unassigned",
            status: st,
            priority: pr,
            progress: p.progress || 0,
            start: p.startDate ? p.startDate.slice(0, 10) : "—",
            end: p.targetCompletion ? p.targetCompletion.slice(0, 10) : (p.endDate ? p.endDate.slice(0, 10) : "—"),
            revenue: p.contractValue
              ? `₹ ${Number(p.contractValue).toLocaleString("en-IN")}`
              : (p.budget ? `₹ ${Number(p.budget).toLocaleString("en-IN")}` : "₹ 0"),
          };
        });
        setProjects(mapped);
        if (mapped.length > 0) {
          setSelected(mapped[0]);
        }
      }
    } catch (err) {
      console.warn("Failed to load projects:", err);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const filtered = useMemo(
    () =>
      projects.filter(
        (p) =>
          `${p.name} ${p.code} ${p.manager}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (statusFilter === "All Status" || p.status === statusFilter) &&
          (typeFilter === "All Types" || p.type === typeFilter) &&
          (managerFilter === "All Managers" || p.manager === managerFilter) &&
          (priorityFilter === "All Priorities" || p.priority === priorityFilter)
      ),
    [
      projects,
      search,
      statusFilter,
      typeFilter,
      managerFilter,
      priorityFilter,
    ]
  );

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  }

  async function createProject() {
    if (!projectForm.name.trim()) {
      notify("Please enter Project Name");
      setCreateStep(1);
      return;
    }

    try {
      await apiCreateProject({
        name: projectForm.name,
        code: projectForm.code,
        type: projectForm.type,
        description: projectForm.description,
        startDate: projectForm.start || undefined,
        endDate: projectForm.end || undefined,
        priority: projectForm.priority,
      });

      notify("Project created successfully.");
      setCreateStep(1);
      setProjectForm({
        type: "Implementation",
        code: `PRJ-${String(projects.length + 2).padStart(3, "0")}`,
        name: "",
        client: clientInfo?.name || "",
        description: "",
        start: "",
        end: "",
        manager: "",
        priority: "High",
        budget: "0",
      });
      loadProjects();
    } catch (err: any) {
      notify(`Create project failed: ${err.message || "Unknown error"}`);
    }
  }

  const counts = {
    total: projects.length,
    active: projects.filter((p) => p.status === "In Progress").length,
    completed: projects.filter((p) => p.status === "Completed").length,
    hold: projects.filter((p) => p.status === "On Hold").length,
    cancelled: projects.filter((p) => p.status === "Cancelled").length,
  };

  const managers = useMemo(
    () => Array.from(new Set(projects.map((p) => p.manager))),
    [projects]
  );

  return (
    <main className="cp-page">
      {toast && (
        <div className="cp-toast">
          <CheckCircle2 size={15} />
          {toast}
        </div>
      )}

      <div className="cp-header">
        <div className="cp-header-title">
          <span className="cp-client-code">
            {clientInfo?.code || "CLT"}
          </span>
          <div>
            <b>Client Projects</b>
            <small>Manage and monitor all projects associated with this client</small>
          </div>
        </div>
        <div className="cp-header-actions" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {clientList.length > 0 && (
            <select
              value={clientInfo?._id || clientInfo?.id || ""}
              onChange={(e) => {
                const found = clientList.find((c) => (c._id || c.id) === e.target.value);
                if (found) {
                  setClientInfo(found);
                  setProjectForm((prev) => ({ ...prev, client: found.displayName || found.name }));
                }
              }}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                background: "#ffffff",
                color: "#0f172a",
                fontWeight: 600,
                outline: "none",
                cursor: "pointer",
              }}
            >
              {clientList.map((c) => (
                <option key={c._id || c.id} value={c._id || c.id}>
                  {c.displayName || c.legalName || c.name} ({c.clientCode || "CLT"})
                </option>
              ))}
            </select>
          )}
          <button
            className="cp-btn primary"
            onClick={() =>
              document
                .getElementById("cp-create-project-card")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <Plus size={13} /> New Project
          </button>
        </div>
      </div>

      <div className="cp-client-card">
        <div className="cp-client-logo">
          {clientInfo?.logo ? (
            <img src={clientInfo.logo} alt="Client Logo" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 8 }} />
          ) : (
            <Building2 size={20} />
          )}
        </div>
        <div className="cp-client-info">
          <h2>
            {clientInfo?.name || "Client"}{" "}
            <span>{clientInfo?.status || "Active"}</span>
          </h2>
          <p>
            {clientInfo?.type || "Enterprise Client"} <i>•</i>{" "}
            {clientInfo?.industry || "Healthcare"} <i>•</i>{" "}
            {clientInfo?.address?.city || clientInfo?.city || "India"}
          </p>
        </div>
        <div className="cp-client-stats">
          <div>
            <small>Total Projects</small>
            <b>{counts.total}</b>
          </div>
          <div>
            <small>Active</small>
            <b>{counts.active}</b>
          </div>
          <div>
            <small>Completed</small>
            <b>{counts.completed}</b>
          </div>
        </div>
      </div>

      <div className="cp-main-grid">
        <div className="cp-table-panel">
          <div className="cp-filter-bar">
            <div className="cp-search">
              <Search size={14} />
              <input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>All Status</option>
              <option>In Progress</option>
              <option>Completed</option>
              <option>On Hold</option>
              <option>Cancelled</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option>All Types</option>
              <option>Implementation</option>
              <option>Development</option>
              <option>Migration</option>
              <option>Support</option>
              <option>Integration</option>
            </select>
            <button
              className="cp-btn subtle"
              onClick={() => {
                setSearch("");
                setStatusFilter("All Status");
                setTypeFilter("All Types");
                setManagerFilter("All Managers");
                setPriorityFilter("All Priorities");
              }}
            >
              Reset
            </button>
          </div>

          <div className="cp-table-wrap">
            <table className="cp-project-table">
              <thead>
                <tr>
                  <th>Project Code</th>
                  <th>Project Name</th>
                  <th>Type</th>
                  <th>Manager</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Progress</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Revenue (YTD)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((p) => (
                    <tr
                      key={p.code}
                      className={selected?.code === p.code ? "selected" : ""}
                      onClick={() => setSelected(p)}
                    >
                      <td>{p.code}</td>
                      <td className="project-name">{p.name}</td>
                      <td>{p.type}</td>
                      <td>{p.manager}</td>
                      <td>
                        <Status value={p.status} />
                      </td>
                      <td>
                        <Priority value={p.priority} />
                      </td>
                      <td>
                        <Progress value={p.progress} />
                      </td>
                      <td>{p.start}</td>
                      <td>{p.end}</td>
                      <td>{p.revenue}</td>
                      <td>
                        <button
                          className="cp-icon-btn tiny"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            notify(`Actions for ${p.code}`);
                          }}
                        >
                          <MoreHorizontal size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={11}
                      style={{
                        textAlign: "center",
                        padding: "32px",
                        color: "#667085",
                      }}
                    >
                      No projects found. Click &apos;New Project&apos; to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <div className="cp-detail-card">
            <div className="cp-detail-head">
              <div>
                <div className="cp-detail-project">
                  <div className="cp-project-icon">
                    <Grid2X2 size={25} />
                  </div>
                  <div>
                    <h2>
                      {selected.name} <Status value={selected.status} />
                    </h2>
                    <p>
                      {selected.code} <i>•</i> {selected.type} <i>•</i>{" "}
                      <Priority value={selected.priority} />
                    </p>
                    <small>
                      {selected.start} — {selected.end}
                    </small>
                  </div>
                </div>
              </div>
            </div>

            <div className="cp-tabs">
              {tabs.map((t) => (
                <button
                  key={t}
                  className={activeTab === t ? "active" : ""}
                  onClick={() => setActiveTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="cp-detail-content">
              <div className="cp-summary-box">
                <h4>Project Summary</h4>
                <Detail label="Project Code" value={selected.code} />
                <Detail label="Project Name" value={selected.name} />
                <Detail label="Project Manager" value={selected.manager} />
                <Detail label="Status" value={selected.status} />
                <Detail label="Priority" value={selected.priority} />
                <Detail label="Timeline" value={`${selected.start} to ${selected.end}`} />
              </div>
              <div className="cp-progress-box">
                <h4>Progress</h4>
                <div className="cp-ring-row">
                  <div className="cp-ring">
                    <div>
                      <b>{selected.progress}%</b>
                      <small>Overall Progress</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div id="cp-create-project-card">
          <Panel
            title="Create Project"
            icon={<Plus size={14} />}
            className="cp-create-panel"
          >
            <div className="cp-create-layout">
              <div className="cp-step-list">
                {["Basic Information", "Planning", "Team & Access", "Review & Confirm"].map(
                  (s, i) => (
                    <button
                      key={s}
                      className={
                        createStep === i + 1
                          ? "active"
                          : createStep > i + 1
                          ? "done"
                          : ""
                      }
                      onClick={() => setCreateStep(i + 1)}
                    >
                      <i>{createStep > i + 1 ? <Check size={11} /> : i + 1}</i>
                      {s}
                    </button>
                  )
                )}
              </div>
              <div className="cp-create-form">
                {createStep === 1 && (
                  <>
                    <Field label="Project Type *">
                      <select
                        value={projectForm.type}
                        onChange={(e) =>
                          setProjectForm({
                            ...projectForm,
                            type: e.target.value,
                          })
                        }
                      >
                        <option>Implementation</option>
                        <option>Development</option>
                        <option>Migration</option>
                        <option>Support</option>
                        <option>Integration</option>
                      </select>
                    </Field>
                    <div className="cp-form-two">
                      <Field label="Project Code *">
                        <input
                          value={projectForm.code}
                          onChange={(e) =>
                            setProjectForm({
                              ...projectForm,
                              code: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Project Name *">
                        <input
                          placeholder="Enter project name"
                          value={projectForm.name}
                          onChange={(e) =>
                            setProjectForm({
                              ...projectForm,
                              name: e.target.value,
                            })
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Description">
                      <textarea
                        placeholder="Describe the project..."
                        value={projectForm.description}
                        onChange={(e) =>
                          setProjectForm({
                            ...projectForm,
                            description: e.target.value,
                          })
                        }
                      />
                    </Field>
                  </>
                )}

                {createStep === 2 && (
                  <>
                    <div className="cp-form-two">
                      <Field label="Start Date">
                        <input
                          type="date"
                          value={projectForm.start}
                          onChange={(e) =>
                            setProjectForm({
                              ...projectForm,
                              start: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="End Date">
                        <input
                          type="date"
                          value={projectForm.end}
                          onChange={(e) =>
                            setProjectForm({
                              ...projectForm,
                              end: e.target.value,
                            })
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Priority">
                      <select
                        value={projectForm.priority}
                        onChange={(e) =>
                          setProjectForm({
                            ...projectForm,
                            priority: e.target.value,
                          })
                        }
                      >
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </Field>
                  </>
                )}

                {createStep === 3 && (
                  <>
                    <Field label="Project Manager">
                      <input
                        placeholder="Manager name"
                        value={projectForm.manager}
                        onChange={(e) =>
                          setProjectForm({
                            ...projectForm,
                            manager: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <div className="cp-assignee-note">
                      <Users size={16} /> Team members and access permissions can be
                      assigned after project creation.
                    </div>
                  </>
                )}

                {createStep === 4 && (
                  <div className="cp-confirm">
                    <CheckCircle2 size={25} />
                    <h4>Review Project Details</h4>
                    <p>
                      <b>{projectForm.name || "New Project"}</b>
                    </p>
                    <span>
                      {projectForm.code} · {projectForm.type} ·{" "}
                      {projectForm.priority} Priority
                    </span>
                    <span>
                      {projectForm.start || "—"} to {projectForm.end || "—"}
                    </span>
                  </div>
                )}

                <div className="cp-create-actions">
                  {createStep > 1 && (
                    <button
                      className="cp-btn subtle"
                      onClick={() => setCreateStep((s) => s - 1)}
                    >
                      Back
                    </button>
                  )}
                  {createStep < 4 ? (
                    <button
                      className="cp-btn primary"
                      onClick={() => setCreateStep((s) => s + 1)}
                    >
                      Next <ArrowRight size={12} />
                    </button>
                  ) : (
                    <button className="cp-btn primary" onClick={createProject}>
                      Create Project <Check size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}
