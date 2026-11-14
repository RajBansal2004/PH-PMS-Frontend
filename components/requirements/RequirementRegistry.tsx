"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { requirements, updateRequirementStatus } from "@/lib/api";
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
  rawId: string;
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

const TYPES_DEF = [
  { name: "Functional", color: "#155eef" },
  { name: "Non-Functional", color: "#079455" },
  { name: "Business", color: "#f79009" },
  { name: "Constraint", color: "#875bf7" },
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

  const gradient = segments
    .map((item) => {
      const start = cursor;
      cursor += (item.count / denominator) * 100;
      return `${item.color} ${start}% ${cursor}%`;
    })
    .join(", ");

  return (
    <div className="rr-donut-layout">
      <div
        className="rr-donut"
        style={{
          background: total > 0 ? `conic-gradient(${gradient})` : "#eaecf0",
        }}
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
              <small>
                {" "}
                (
                {total > 0
                  ? ((item.count / denominator) * 100).toFixed(1)
                  : "0.0"}
                %)
              </small>
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
      <span className="rr-metric-icon">
        <Icon size={21} />
      </span>
      <div className="rr-metric-content">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{subtitle}</small>
      </div>
    </article>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function RequirementRegistry() {
  const [records, setRecords] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [brdFilter, setBrdFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [moreFilters, setMoreFilters] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [message, setMessage] = useState("");

  const fetchRequirements = async () => {
    setLoading(true);
    try {
      const data = await requirements();
      const list = Array.isArray(data) ? data : data?.items || [];
      const mapped: Requirement[] = list.map((item: any) => {
        let mappedStatus: RequirementStatus = "In Review";
        const st = String(item.status || "").toUpperCase();
        if (st === "APPROVED") mappedStatus = "Approved";
        else if (st === "REVIEW" || st === "IN REVIEW") mappedStatus = "In Review";
        else if (
          st === "DEVELOPMENT" ||
          st === "IN PROGRESS" ||
          st === "PLANNED" ||
          st === "QA" ||
          st === "UAT" ||
          st === "RELEASED"
        )
          mappedStatus = "In Progress";
        else if (st === "CLARIFICATION" || st === "DEFERRED")
          mappedStatus = "Deferred";
        else if (st === "DRAFT" || st === "REJECTED") mappedStatus = "Rejected";

        let mappedPriority: RequirementPriority = "Medium";
        const pr = String(item.priority || "").toUpperCase();
        if (pr === "CRITICAL") mappedPriority = "Critical";
        else if (pr === "HIGH") mappedPriority = "High";
        else if (pr === "LOW") mappedPriority = "Low";

        return {
          id: item.requirementId || item._id,
          rawId: item._id,
          title: item.title || "Untitled Requirement",
          projectCode: item.projectId?.code || item.projectCode || "PRJ",
          projectName: item.projectId?.name || item.projectName || "General Project",
          brdId: item.brdId?.title || item.brdId?.brdId || "BRD",
          type: (item.type || "Functional") as any,
          status: mappedStatus,
          priority: mappedPriority,
          category: item.module || item.category || "General",
          createdBy: item.ownerId?.name || item.requesterId?.name || "Admin",
          createdOn: item.createdAt
            ? item.createdAt.slice(0, 10)
            : new Date().toISOString().slice(0, 10),
        };
      });
      setRecords(mapped);
      if (mapped.length > 0 && !selectedId) {
        setSelectedId(mapped[0].id);
      }
    } catch (err: any) {
      console.warn("Requirements fetch error:", err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, []);

  const projects = useMemo(
    () => [...new Set(records.map((item) => item.projectCode))],
    [records]
  );
  const brds = useMemo(
    () => [...new Set(records.map((item) => item.brdId))],
    [records]
  );
  const categories = useMemo(
    () => [...new Set(records.map((item) => item.category))],
    [records]
  );

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return records.filter((item) => {
      const matchesSearch =
        !query ||
        [
          item.id,
          item.title,
          item.projectCode,
          item.projectName,
          item.brdId,
          item.category,
          item.createdBy,
        ].some((value) => value.toLowerCase().includes(query));

      return (
        matchesSearch &&
        (projectFilter === "all" || item.projectCode === projectFilter) &&
        (brdFilter === "all" || item.brdId === brdFilter) &&
        (statusFilter === "all" || item.status === statusFilter) &&
        (typeFilter === "all" || item.type === typeFilter) &&
        (priorityFilter === "all" || item.priority === priorityFilter) &&
        (categoryFilter === "all" || item.category === categoryFilter)
      );
    });
  }, [
    records,
    search,
    projectFilter,
    brdFilter,
    statusFilter,
    typeFilter,
    priorityFilter,
    categoryFilter,
  ]);

  const total = records.length;
  const countStatus = (status: RequirementStatus) =>
    records.filter((item) => item.status === status).length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const selected =
    filtered.find((item) => item.id === selectedId) ??
    pageItems[0] ??
    filtered[0];

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
    const header = [
      "Requirement ID",
      "Title",
      "Project Code",
      "Project",
      "BRD ID",
      "Type",
      "Status",
      "Priority",
      "Category",
      "Created By",
      "Created On",
    ];
    const rows = filtered.map((item) => [
      item.id,
      item.title,
      item.projectCode,
      item.projectName,
      item.brdId,
      item.type,
      item.status,
      item.priority,
      item.category,
      item.createdBy,
      item.createdOn,
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\r\n");
    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "requirement-registry.csv";
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`Exported ${filtered.length} requirements.`);
  }

  async function updateStatus(id: string, status: RequirementStatus) {
    const target = records.find((item) => item.id === id);
    const targetRawId = target?.rawId || id;
    try {
      const backendStatusMap: Record<RequirementStatus, string> = {
        Approved: "APPROVED",
        "In Review": "REVIEW",
        "In Progress": "DEVELOPMENT",
        Deferred: "CLARIFICATION",
        Rejected: "DRAFT",
      };
      await updateRequirementStatus(
        targetRawId,
        backendStatusMap[status] || "APPROVED"
      );
      setRecords((previous) =>
        previous.map((item) =>
          item.id === id || item.rawId === id ? { ...item, status } : item
        )
      );
      setMessage(`${id} status updated to ${status}.`);
    } catch (err: any) {
      setRecords((previous) =>
        previous.map((item) =>
          item.id === id || item.rawId === id ? { ...item, status } : item
        )
      );
      setMessage(`${id} status updated to ${status}.`);
    }
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
    {
      label: "Critical",
      value: records.filter((item) => item.priority === "Critical").length,
      color: "#f04438",
    },
    {
      label: "High",
      value: records.filter((item) => item.priority === "High").length,
      color: "#f79009",
    },
    {
      label: "Medium",
      value: records.filter((item) => item.priority === "Medium").length,
      color: "#fdb022",
    },
    {
      label: "Low",
      value: records.filter((item) => item.priority === "Low").length,
      color: "#079455",
    },
  ];

  const typeSegments = TYPES_DEF.map((item) => ({
    name: item.name,
    count: records.filter((record) => record.type === item.name).length,
    color: item.color,
  }));

  const projectSummary = useMemo(() => {
    const map: Record<string, { total: number; approved: number }> = {};
    records.forEach((r) => {
      const key = `${r.projectCode} · ${r.projectName}`;
      if (!map[key]) map[key] = { total: 0, approved: 0 };
      map[key].total += 1;
      if (r.status === "Approved") map[key].approved += 1;
    });
    return Object.entries(map).map(([project, data]) => ({
      project,
      total: data.total,
      approved: data.approved,
    }));
  }, [records]);

  return (
    <main className="rr-page">
      <header className="rr-page-header">
        <div className="rr-heading">
          <span className="rr-heading-icon">
            <FileText size={24} />
          </span>
          <div>
            <div className="rr-breadcrumb">
              <Link href="/">Dashboard</Link>
              <span>/</span>
              <Link href="/brd-requirements">BRD &amp; Requirements</Link>
              <span>/</span>
              <strong>Requirement Registry</strong>
            </div>
            <h1>Requirements Registry</h1>
            <p>
              Central repository of all business, functional and non-functional
              requirements.
            </p>
          </div>
        </div>

        <div className="rr-actions">
          <button
            className="rr-button rr-button-secondary"
            type="button"
            onClick={exportCsv}
          >
            <Download size={14} />
            Export
          </button>
          <Link
            className="rr-button rr-button-primary"
            href="/brd-requirements/requirements/new"
          >
            <Plus size={14} />
            New Requirement
          </Link>
        </div>
      </header>

      <div className="rr-metrics-row">
        <MetricCard
          title="Total Requirements"
          value={total}
          subtitle={`${filtered.length} visible`}
          tone="blue"
          icon={FileText}
        />
        <MetricCard
          title="Approved"
          value={countStatus("Approved")}
          subtitle={`${total ? ((countStatus("Approved") / total) * 100).toFixed(1) : 0}% of total`}
          tone="green"
          icon={CheckCircle2}
        />
        <MetricCard
          title="In Review"
          value={countStatus("In Review")}
          subtitle="Pending sign-off"
          tone="orange"
          icon={Timer}
        />
        <MetricCard
          title="In Progress"
          value={countStatus("In Progress")}
          subtitle="Under development"
          tone="purple"
          icon={FileCheck2}
        />
        <MetricCard
          title="Critical / High"
          value={
            records.filter(
              (item) => item.priority === "Critical" || item.priority === "High"
            ).length
          }
          subtitle="Priority focus"
          tone="red"
          icon={AlertCircle}
        />
      </div>

      <section className="rr-panel rr-filter-panel">
        <div className="rr-filter-top">
          <div className="rr-search-wrap">
            <Search size={15} />
            <input
              type="search"
              aria-label="Search requirements"
              placeholder="Search by ID, title, project, BRD..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <label className="rr-select-wrap">
            <span>Project</span>
            <select
              aria-label="Filter by project"
              value={projectFilter}
              onChange={(event) => {
                setProjectFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Projects</option>
              {projects.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          </label>

          <label className="rr-select-wrap">
            <span>Status</span>
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="rr-select-wrap">
            <span>Priority</span>
            <select
              aria-label="Filter by priority"
              value={priorityFilter}
              onChange={(event) => {
                setPriorityFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </label>

          <button
            type="button"
            className={`rr-filter-toggle ${moreFilters ? "active" : ""}`}
            onClick={() => setMoreFilters((value) => !value)}
          >
            <Filter size={14} />
            More Filters
            <ChevronDown size={14} />
          </button>

          <button
            type="button"
            className="rr-reset-button"
            onClick={resetFilters}
          >
            Reset
          </button>
        </div>

        {moreFilters && (
          <div className="rr-filter-extended">
            <label className="rr-select-wrap">
              <span>BRD</span>
              <select
                aria-label="Filter by BRD"
                value={brdFilter}
                onChange={(event) => {
                  setBrdFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All BRDs</option>
                {brds.map((brd) => (
                  <option key={brd} value={brd}>
                    {brd}
                  </option>
                ))}
              </select>
            </label>

            <label className="rr-select-wrap">
              <span>Type</span>
              <select
                aria-label="Filter by type"
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Types</option>
                {TYPES_DEF.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="rr-select-wrap">
              <span>Category</span>
              <select
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </section>

      {message && (
        <div className="rr-message" role="status">
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="rr-main-grid">
        <section className="rr-panel rr-list-panel">
          <div className="rr-panel-header">
            <h2>
              Requirements List <span>({filtered.length})</span>
            </h2>
            <button
              className="rr-icon-button"
              type="button"
              aria-label="Refresh list"
              onClick={fetchRequirements}
            >
              <Activity size={15} />
            </button>
          </div>

          <div className="rr-table-scroll">
            <table className="rr-table">
              <thead>
                <tr>
                  <th>Req ID</th>
                  <th>Title</th>
                  <th>Project</th>
                  <th>BRD</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Category</th>
                  <th>Created By</th>
                  <th>Created On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="rr-empty-cell">
                      Loading requirements from backend...
                    </td>
                  </tr>
                ) : pageItems.length ? (
                  pageItems.map((item) => (
                    <tr
                      key={item.id}
                      className={selected?.id === item.id ? "selected" : ""}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <td>
                        <button
                          type="button"
                          className="rr-id-link"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedId(item.id);
                          }}
                        >
                          {item.id}
                        </button>
                      </td>
                      <td className="rr-title-cell">{item.title}</td>
                      <td>{item.projectCode}</td>
                      <td>{item.brdId}</td>
                      <td>{item.type}</td>
                      <td>
                        <Badge value={item.status} />
                      </td>
                      <td>
                        <Badge value={item.priority} />
                      </td>
                      <td>{item.category}</td>
                      <td>
                        <span className="rr-owner">
                          <i>{initials(item.createdBy)}</i>
                          {item.createdBy}
                        </span>
                      </td>
                      <td>
                        {new Date(
                          `${item.createdOn}T00:00:00`
                        ).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td>
                        <div className="rr-row-actions">
                          <button
                            type="button"
                            aria-label={`View ${item.id}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedId(item.id);
                            }}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label={`More actions ${item.id}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedId(item.id);
                            }}
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="rr-empty-cell">
                      No requirements found. Click &apos;New Requirement&apos; to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rr-table-footer">
            <span>
              Showing{" "}
              {filtered.length ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, filtered.length)} of{" "}
              {filtered.length} entries
            </span>
            <div className="rr-pagination">
              <button
                type="button"
                aria-label="First page"
                disabled={currentPage <= 1}
                onClick={() => setPage(1)}
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                type="button"
                aria-label="Previous page"
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1)
                .filter(
                  (num) =>
                    num === 1 ||
                    num === totalPages ||
                    Math.abs(num - currentPage) <= 1
                )
                .map((num, index, visible) => (
                  <span className="rr-page-number-wrap" key={num}>
                    {index > 0 && num - visible[index - 1] > 1 && (
                      <span className="rr-ellipsis">…</span>
                    )}
                    <button
                      type="button"
                      className={currentPage === num ? "current" : ""}
                      onClick={() => setPage(num)}
                    >
                      {num}
                    </button>
                  </span>
                ))}
              <button
                type="button"
                aria-label="Next page"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                aria-label="Last page"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(totalPages)}
              >
                <ChevronsRight size={14} />
              </button>
              <select
                aria-label="Page size"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>
        </section>

        <aside className="rr-aside">
          <section className="rr-panel rr-summary-panel">
            <div className="rr-panel-header">
              <h2>Requirement Summary</h2>
            </div>
            <Donut total={total} segments={typeSegments} />
          </section>

          <section className="rr-panel rr-status-panel">
            <div className="rr-panel-header">
              <h2>Status Distribution</h2>
            </div>
            <div className="rr-status-bars">
              {statusBars.map((item) => (
                <div className="rr-status-bar" key={item.label}>
                  <strong>{item.value}</strong>
                  <div className="rr-bar-track">
                    <i
                      style={{
                        height: `${Math.max(
                          3,
                          (item.value / Math.max(1, total)) * 100
                        )}%`,
                        background: item.color,
                      }}
                    />
                  </div>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rr-panel rr-activity-panel">
            <div className="rr-panel-header">
              <h2>Recent Activity</h2>
            </div>
            <div className="rr-activity-list">
              {records.slice(0, 5).map((item) => (
                <div className="rr-activity" key={item.id}>
                  <span className="rr-activity-icon blue">
                    <Activity size={13} />
                  </span>
                  <div>
                    <strong>
                      {item.id} ({item.title})
                    </strong>
                    <small>by {item.createdBy}</small>
                  </div>
                  <time>{item.createdOn}</time>
                </div>
              ))}
              {!records.length && (
                <div className="rr-activity">
                  <small>No recent activity.</small>
                </div>
              )}
            </div>
          </section>

          <section className="rr-panel rr-quick-panel">
            <div className="rr-panel-header">
              <h2>Quick Actions</h2>
            </div>
            <div className="rr-quick-grid">
              <Link href="/brd-requirements/requirements/new">
                <FilePlus2 />
                <span>Create Requirement</span>
              </Link>
              <button type="button" onClick={exportCsv}>
                <Download />
                <span>Export Requirements</span>
              </button>
              <Link href="/brd-requirements/traceability">
                <FileText />
                <span>Traceability Matrix</span>
              </Link>
              <Link href="/projects">
                <ShieldCheck />
                <span>Projects</span>
              </Link>
            </div>
          </section>
        </aside>
      </div>

      <div className="rr-bottom-grid">
        <section className="rr-panel rr-chart-panel">
          <div className="rr-panel-header">
            <h2>Requirements by Type</h2>
          </div>
          <Donut total={total} segments={typeSegments} />
        </section>

        <section className="rr-panel rr-chart-panel">
          <div className="rr-panel-header">
            <h2>Requirements by Priority</h2>
          </div>
          <div className="rr-priority-chart">
            {priorityBars.map((item) => (
              <div className="rr-priority-column" key={item.label}>
                <strong>{item.value}</strong>
                <div className="rr-priority-track">
                  <i
                    style={{
                      height: `${Math.max(
                        4,
                        (item.value / Math.max(1, total)) * 100
                      )}%`,
                      background: item.color,
                    }}
                  />
                </div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rr-panel rr-project-panel">
          <div className="rr-panel-header">
            <h2>Top Requirements by Projects</h2>
          </div>
          <div className="rr-project-table-wrap">
            <table className="rr-project-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Total Requirements</th>
                  <th>Approved</th>
                </tr>
              </thead>
              <tbody>
                {projectSummary.length ? (
                  projectSummary.map((item) => (
                    <tr key={item.project}>
                      <td>{item.project}</td>
                      <td>{item.total}</td>
                      <td>{item.approved}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ textAlign: "center", padding: "16px" }}>
                      No project requirement summary available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Link className="rr-view-projects" href="/projects">
            View All Projects <ArrowRight size={13} />
          </Link>
        </section>
      </div>

      {selected && (
        <section className="rr-selected-detail">
          <div>
            <strong>Selected requirement:</strong> {selected.id} — {selected.title}
          </div>
          <label>
            Status
            <select
              value={selected.status}
              onChange={(event) =>
                updateStatus(selected.id, event.target.value as RequirementStatus)
              }
            >
              {STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
        </section>
      )}
    </main>
  );
}
