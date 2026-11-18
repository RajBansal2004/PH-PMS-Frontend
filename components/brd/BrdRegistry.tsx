
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Archive,
  ArrowDownToLine,
  ArrowRight,
  Bell,
  BookOpen,
  Check,
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
  FolderOpen,
  History,
  MoreVertical,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  Users,
  X,
} from "lucide-react";

import { brdApi, BrdApiError } from "../../lib/brd/api";
import type {
  BrdListParams,
  BrdListResponse,
} from "../../lib/brd/types";
import BrdStatusBadge from "./BrdStatusBadge";
import "./brd-detail.css";

type BrdRecord = BrdListResponse["items"][number];

const PAGE_SIZE = 10;

const DEMO_BRDS: BrdRecord[] = [
  {
    id: "BRD-24-001",
    title: "AI-CMS Implementation BRD",
    projectId: "PRJ-001",
    projectName: "AI-CMS Platform",
    clientName: "Apollo Hospitals",
    type: "Business Requirement Document",
    version: "v1.2",
    status: "Approved" as any,
    priority: "High" as any,
    confidentiality: "Confidential",
    description: "Enterprise clinical management system business requirements.",
    estimatedPages: 24,
    estimatedEffortHours: 320,
    targetReleaseDate: "2025-06-30",
    reviewDueDate: "2025-05-20",
    nextReviewDate: "2025-06-01",
    tags: ["Healthcare", "EMR", "Clinical"],
    createdAt: "2025-01-15T09:00:00.000Z",
    updatedAt: "2025-05-16T14:30:00.000Z",
    createdBy: "Mayank Swaroop",
    updatedBy: "Rahul Verma",
  },
  {
    id: "BRD-24-002",
    title: "Mobile Patient App BRD",
    projectId: "PRJ-002",
    projectName: "Mobile App",
    clientName: "Apollo Hospitals",
    type: "Functional Requirement Document",
    version: "v1.0",
    status: "In Review" as any,
    priority: "High" as any,
    confidentiality: "Confidential",
    description: "Patient facing mobile application for appointments and lab records.",
    estimatedPages: 18,
    estimatedEffortHours: 240,
    targetReleaseDate: "2025-07-15",
    reviewDueDate: "2025-05-25",
    nextReviewDate: "2025-06-05",
    tags: ["Mobile", "iOS", "Android"],
    createdAt: "2025-02-10T11:00:00.000Z",
    updatedAt: "2025-05-15T16:00:00.000Z",
    createdBy: "Amit Kumar",
    updatedBy: "Amit Kumar",
  },
  {
    id: "BRD-24-003",
    title: "Patient Telehealth Portal BRD",
    projectId: "PRJ-003",
    projectName: "Patient Portal",
    clientName: "Max Healthcare",
    type: "Business Requirement Document",
    version: "v0.8",
    status: "Draft" as any,
    priority: "Medium" as any,
    confidentiality: "Internal",
    description: "HIPAA compliant video consultation and digital prescription portal.",
    estimatedPages: 14,
    estimatedEffortHours: 180,
    targetReleaseDate: "2025-08-30",
    reviewDueDate: "2025-06-10",
    nextReviewDate: "2025-06-20",
    tags: ["Telehealth", "WebRTC"],
    createdAt: "2025-03-01T10:00:00.000Z",
    updatedAt: "2025-05-14T10:00:00.000Z",
    createdBy: "Neha Patel",
    updatedBy: "Neha Patel",
  },
  {
    id: "BRD-24-004",
    title: "HRMS & Payroll Integration BRD",
    projectId: "PRJ-004",
    projectName: "Internal Tools",
    clientName: "Pehal Healthcare",
    type: "Technical Requirement Document",
    version: "v1.1",
    status: "Pending Approval" as any,
    priority: "Medium" as any,
    confidentiality: "Restricted",
    description: "Integration layer connecting employee attendance and project allocation.",
    estimatedPages: 12,
    estimatedEffortHours: 120,
    targetReleaseDate: "2025-09-15",
    reviewDueDate: "2025-06-15",
    nextReviewDate: "2025-07-01",
    tags: ["Integration", "Payroll", "HRMS"],
    createdAt: "2025-03-20T12:00:00.000Z",
    updatedAt: "2025-05-12T11:30:00.000Z",
    createdBy: "Rahul Verma",
    updatedBy: "Pooja Singh",
  },
];

const activityItems = [
  {
    id: "a1",
    type: "review",
    title: "BRD-24-002 submitted for review",
    detail: "Mobile App Development BRD · Amit Kumar",
    time: "1 hour ago",
  },
  {
    id: "a2",
    type: "approved",
    title: "BRD-24-001 approved v1.2",
    detail: "AI-CMS Implementation BRD · Mayank Swaroop",
    time: "3 hours ago",
  },
  {
    id: "a3",
    type: "updated",
    title: "BRD-24-003 updated to v0.3",
    detail: "Patient Portal BRD · Neha Patel",
    time: "5 hours ago",
  },
  {
    id: "a4",
    type: "review",
    title: "BRD-24-006 submitted for review",
    detail: "HRMS Integration BRD · Rahul Verma",
    time: "Yesterday",
  },
];

function normalise(value: string) {
  return value.toLowerCase().replace(/[_-]/g, " ").trim();
}

function statusIs(status: string, expected: string) {
  return normalise(status) === normalise(expected);
}

function formatDate(value?: string) {
  if (!value || Number.isNaN(Date.parse(value))) return "—";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function initials(value?: string) {
  return (value || "BR")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function StatCard({
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
    <article className={`brd-stat-card brd-stat-${tone}`}>
      <div className="brd-stat-icon">
        <Icon size={21} strokeWidth={1.8} />
      </div>

      <div className="brd-stat-copy">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{subtitle}</small>
      </div>

      <span className="brd-stat-mini">
        <Users size={13} />
      </span>
    </article>
  );
}

function DonutChart({
  total,
  segments,
  label,
}: {
  total: number;
  label: string;
  segments: { label: string; value: number; color: string }[];
}) {
  const denominator = Math.max(
    segments.reduce((sum, segment) => sum + segment.value, 0),
    1,
  );

  let cursor = 0;
  const gradient = segments
    .map((segment) => {
      const start = cursor;
      cursor += (segment.value / denominator) * 100;
      return `${segment.color} ${start}% ${cursor}%`;
    })
    .join(", ");

  return (
    <div className="brd-donut-layout">
      <div
        className="brd-donut"
        style={{ background: `conic-gradient(${gradient})` }}
        role="img"
        aria-label={`${total} ${label}`}
      >
        <div className="brd-donut-hole">
          <strong>{total}</strong>
          <span>{label}</span>
        </div>
      </div>

      <div className="brd-donut-legend">
        {segments.map((segment) => (
          <div key={segment.label} className="brd-legend-row">
            <span className="brd-legend-name">
              <i style={{ background: segment.color }} />
              {segment.label}
            </span>
            <strong>
              {segment.value}
              <small>
                {denominator
                  ? ` (${((segment.value / denominator) * 100).toFixed(1)}%)`
                  : ""}
              </small>
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BrdRegistry() {
  const [filters, setFilters] = useState<BrdListParams>({
    page: 1,
    pageSize: PAGE_SIZE,
    sortBy: "updatedAt",
    sortOrder: "desc",
  });

  const [data, setData] = useState<BrdListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await brdApi.list(filters);
      setData(result);
    } catch (err) {
      setError(
        err instanceof BrdApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unable to load BRD records. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const allItems = data?.items && data.items.length > 0 ? data.items : DEMO_BRDS;

  const projectOptions = useMemo(
    () => [...new Set(allItems.map((item) => (typeof item.projectName === "string" ? item.projectName : "")).filter(Boolean))],
    [allItems],
  );

  const clientOptions = useMemo(
    () => [...new Set(allItems.map((item) => (typeof item.clientName === "string" ? item.clientName : "")).filter(Boolean))],
    [allItems],
  );

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return allItems.filter((item) => {
      const matchesSearch =
        !query ||
        [
          item.id,
          item.title,
          item.projectName,
          item.clientName,
          item.status,
          item.priority,
        ].some((value) => String(value ?? "").toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "all" ||
        statusIs(String(item.status), statusFilter);

      const matchesType =
        typeFilter === "all" ||
        normalise(String((item as BrdRecord & { type?: string }).type ?? ""))
          .includes(normalise(typeFilter));

      const matchesPriority =
        priorityFilter === "all" ||
        statusIs(String(item.priority), priorityFilter);

      const matchesProject =
        projectFilter === "all" || item.projectName === projectFilter;

      const matchesClient =
        clientFilter === "all" || item.clientName === clientFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesPriority &&
        matchesProject &&
        matchesClient
      );
    });
  }, [
    allItems,
    search,
    statusFilter,
    typeFilter,
    priorityFilter,
    projectFilter,
    clientFilter,
  ]);

  const selected =
    visibleItems.find((item) => item.id === selectedId) ??
    visibleItems[0] ??
    allItems.find((item) => item.id === selectedId) ??
    allItems[0];

  const countStatus = (status: string) =>
    allItems.filter((item) => statusIs(String(item.status), status)).length;

  const totalRecords = data?.total ?? allItems.length;
  const totalPages = Math.max(1, data?.totalPages ?? 1);
  const currentPage = data?.page ?? filters.page ?? 1;

  const typeSegments = [
    { label: "Business", value: 9, color: "#155eef" },
    { label: "Technical", value: 6, color: "#079455" },
    { label: "Functional", value: 5, color: "#f79009" },
    { label: "Integration", value: 4, color: "#875bf7" },
  ];

  const projectBars = [
    { name: "PRJ-001 · AI-CMS Platform", value: 8 },
    { name: "PRJ-002 · Mobile App", value: 5 },
    { name: "PRJ-003 · Teleconsultation", value: 4 },
    { name: "PRJ-004 · Inventory Mgmt", value: 3 },
    { name: "PRJ-005 · HRMS Integration", value: 2 },
    { name: "PRJ-006 · Third Party Integrations", value: 2 },
  ];

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setPriorityFilter("all");
    setProjectFilter("all");
    setClientFilter("all");
    setFilters((previous) => ({ ...previous, page: 1 }));
  }

  function changePage(page: number) {
    setFilters((previous) => ({ ...previous, page }));
  }

  function exportCsv() {
    const rows = [
      ["BRD ID", "BRD Title", "Project", "Client", "Status", "Priority", "Version", "Updated"],
      ...visibleItems.map((item) => [
        item.id,
        item.title,
        item.projectName,
        item.clientName,
        item.status,
        item.priority,
        item.version,
        item.updatedAt,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "brd-registry.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="brd-registry brd-dashboard">
      <div className="brd-page-heading">
        <div className="brd-page-title">
          <span className="brd-page-title-icon">
            <FileText size={23} />
          </span>
          <div>
            <h1>BRD Registry</h1>
            <p>Central repository of all Business Requirement Documents</p>
          </div>
        </div>

        <div className="brd-heading-actions">
          <Link
            href="/brd-requirements/brd-registry/new"
            className="brd-action-primary"
          >
            <Plus size={15} /> Create New BRD
          </Link>

          <button
            type="button"
            className="brd-action-secondary"
            onClick={() =>
              document.getElementById("brd-import-file")?.click()
            }
          >
            <Upload size={15} /> Import BRD
          </button>

          <input
            id="brd-import-file"
            type="file"
            accept=".csv,.xlsx,.xls,.pdf,.doc,.docx"
            hidden
            onChange={() =>
              setError(
                "File selected. Connect your import endpoint to process uploaded BRDs.",
              )
            }
          />

          <button
            type="button"
            className="brd-action-secondary"
            onClick={exportCsv}
          >
            <Download size={15} /> Export <ChevronDown size={13} />
          </button>
        </div>
      </div>

      <div className="brd-stats-grid">
        <StatCard
          title="Total BRDs"
          value={totalRecords}
          subtitle="Across all projects"
          tone="blue"
          icon={FileText}
        />
        <StatCard
          title="Draft"
          value={countStatus("draft")}
          subtitle={`${totalRecords ? Math.round((countStatus("draft") / totalRecords) * 100) : 0}% of total`}
          tone="slate"
          icon={FileCheck2}
        />
        <StatCard
          title="In Review"
          value={countStatus("in review")}
          subtitle={`${totalRecords ? ((countStatus("in review") / totalRecords) * 100).toFixed(1) : "0.0"}% of total`}
          tone="orange"
          icon={Clock3}
        />
        <StatCard
          title="Approved"
          value={countStatus("approved")}
          subtitle={`${totalRecords ? ((countStatus("approved") / totalRecords) * 100).toFixed(1) : "0.0"}% of total`}
          tone="green"
          icon={CheckCircle2}
        />
        <StatCard
          title="Archived"
          value={countStatus("archived")}
          subtitle={`${totalRecords ? ((countStatus("archived") / totalRecords) * 100).toFixed(1) : "0.0"}% of total`}
          tone="purple"
          icon={Archive}
        />
      </div>

      <div className="brd-filter-panel">
        <label className="brd-search-field">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setFilters((previous) => ({ ...previous, page: 1 }));
            }}
            placeholder="Search by BRD Title, ID, Project, Client..."
            aria-label="Search BRDs"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch("")}
            >
              <X size={14} />
            </button>
          )}
        </label>

        <label className="brd-filter-select">
          <span>Project</span>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="all">All Projects</option>
            {projectOptions.map((option, idx) => <option key={`${option}-${idx}`}>{option}</option>)}
          </select>
        </label>

        <label className="brd-filter-select">
          <span>Client</span>
          <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
            <option value="all">All Clients</option>
            {clientOptions.map((option, idx) => <option key={`${option}-${idx}`}>{option}</option>)}
          </select>
        </label>

        <label className="brd-filter-select">
          <span>Status</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="in review">In Review</option>
            <option value="approved">Approved</option>
            <option value="archived">Archived</option>
          </select>
        </label>

        <label className="brd-filter-select">
          <span>BRD Type</span>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="business">Business</option>
            <option value="technical">Technical</option>
            <option value="functional">Functional</option>
            <option value="integration">Integration</option>
          </select>
        </label>

        <label className="brd-filter-select">
          <span>Priority</span>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>

        <button
          type="button"
          className={`brd-more-filter ${showMoreFilters ? "is-active" : ""}`}
          onClick={() => setShowMoreFilters((value) => !value)}
        >
          <Filter size={14} /> More Filters
        </button>

        <button type="button" className="brd-clear-filter" onClick={clearFilters}>
          Clear
        </button>

        {showMoreFilters && (
          <div className="brd-extra-filters">
            <p><strong>Additional filters</strong></p>
            <span>Use the primary filters above to narrow the registry. Date and owner filters can be connected when those fields are available from the API.</span>
          </div>
        )}
      </div>

      {error && (
        <div className="brd-registry-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void loadRecords()}>Retry</button>
        </div>
      )}

      <div className="brd-dashboard-main">
        <section className="brd-panel brd-list-panel">
          <div className="brd-panel-heading">
            <h2>BRD List <span>({visibleItems.length})</span></h2>
            <button type="button" className="brd-icon-button" onClick={() => void loadRecords()} aria-label="Refresh BRDs">
              <Activity size={15} />
            </button>
          </div>

          <div className="brd-table-scroll">
            <table className="brd-table brd-dashboard-table">
              <thead>
                <tr>
                  <th>BRD ID</th>
                  <th>BRD Title</th>
                  <th>Project</th>
                  <th>Client</th>
                  <th>BRD Type</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Version</th>
                  <th>Created On</th>
                  <th>Owner</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="brd-table-message">Loading BRD records…</td></tr>
                ) : visibleItems.length ? (
                  visibleItems.map((record) => (
                    <tr
                      key={record.id}
                      className={selected?.id === record.id ? "brd-row-selected" : ""}
                      onClick={() => setSelectedId(record.id)}
                    >
                      <td>
                        <span className="brd-id-cell"><FileText size={14} />{record.brdCode || record.code || record.id}</span>
                      </td>
                      <td className="brd-title-cell">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedId(record.id);
                          }}
                        >
                          {record.title}
                        </button>
                      </td>
                      <td>{record.projectName || "—"}</td>
                      <td>{record.clientName || "—"}</td>
                      <td>{(record as BrdRecord & { type?: string }).type || "Business"}</td>
                      <td><BrdStatusBadge value={record.status} /></td>
                      <td><BrdStatusBadge value={record.priority} /></td>
                      <td>{record.version || "v1.0"}</td>
                      <td>{formatDate(record.updatedAt)}</td>
                      <td>
                        <span className="brd-owner-cell">
                          <span className="brd-avatar">{initials(record.title)}</span>
                          <span>—</span>
                        </span>
                      </td>
                      <td>
                        <div className="brd-row-actions">
                          <Link
                            href={`/brd-requirements/brd-registry/${encodeURIComponent(record.id)}`}
                            aria-label={`View ${record.title}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Eye size={15} />
                          </Link>
                          <button
                            type="button"
                            aria-label={`More actions for ${record.title}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedId(record.id);
                            }}
                          >
                            <MoreVertical size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={11} className="brd-table-message">No BRD records found for these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="brd-table-footer">
            <span>
              Showing {visibleItems.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0} to{" "}
              {Math.min((currentPage - 1) * PAGE_SIZE + visibleItems.length, totalRecords)} of {totalRecords} entries
            </span>

            <div className="brd-pagination-controls">
              <button type="button" disabled={loading || currentPage <= 1} onClick={() => changePage(1)} aria-label="First page"><ChevronsLeft size={14} /></button>
              <button type="button" disabled={loading || currentPage <= 1} onClick={() => changePage(Math.max(1, currentPage - 1))} aria-label="Previous page"><ChevronLeft size={14} /></button>
              <button type="button" className="is-current">{currentPage}</button>
              <button type="button" disabled={loading || currentPage >= totalPages} onClick={() => changePage(Math.min(totalPages, currentPage + 1))} aria-label="Next page"><ChevronRight size={14} /></button>
              <button type="button" disabled={loading || currentPage >= totalPages} onClick={() => changePage(totalPages)} aria-label="Last page"><ChevronsRight size={14} /></button>
              <select
                value={filters.pageSize ?? PAGE_SIZE}
                aria-label="Rows per page"
                onChange={(event) => setFilters((previous) => ({
                  ...previous,
                  page: 1,
                  pageSize: Number(event.target.value),
                }))}
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>
        </section>

        <aside className="brd-dashboard-aside">
          <section className="brd-panel brd-detail-summary">
            <div className="brd-panel-heading">
              <h2>BRD Details</h2>
              {selected && (
                <Link href={`/brd-requirements/brd-registry/${encodeURIComponent(selected.id)}`}>
                  View Full Details <ArrowRight size={12} />
                </Link>
              )}
            </div>

            {selected ? (
              <>
                <div className="brd-detail-status"><BrdStatusBadge value={selected.status} /></div>
                <h3>{selected.title}</h3>
                <p className="brd-detail-id">{selected.brdCode || selected.code || selected.id} <span>·</span> {selected.version || "v1.0"}</p>

                <div className="brd-detail-grid">
                  <div><span>Project</span><strong>{selected.projectName || "—"}</strong></div>
                  <div><span>Created On</span><strong>{formatDate(selected.updatedAt)}</strong></div>
                  <div><span>Client</span><strong>{selected.clientName || "—"}</strong></div>
                  <div><span>Last Updated</span><strong>{formatDate(selected.updatedAt)}</strong></div>
                  <div><span>BRD Type</span><strong>Business Requirement Document</strong></div>
                  <div><span>Owner</span><strong><span className="brd-avatar">{initials(selected.title)}</span> —</strong></div>
                  <div><span>Priority</span><strong><BrdStatusBadge value={selected.priority} /></strong></div>
                  <div><span>Review Due</span><strong>—</strong></div>
                  <div><span>Created By</span><strong>—</strong></div>
                  <div><span>Approved On</span><strong>—</strong></div>
                </div>
              </>
            ) : (
              <div className="brd-empty-selection">Select a BRD to see its details.</div>
            )}
          </section>

          <section className="brd-panel brd-summary-panel">
            <div className="brd-panel-heading"><h2>BRD Summary</h2></div>
            <DonutChart total={totalRecords} label="Total BRDs" segments={typeSegments} />
          </section>

          <section className="brd-panel brd-activity-panel">
            <div className="brd-panel-heading">
              <h2>Recent Activity</h2>
              <Link href="/brd-requirements/approval-center">View All</Link>
            </div>
            <div className="brd-activity-list">
              {activityItems.map((item) => (
                <div className="brd-activity-row" key={item.id}>
                  <span className={`brd-activity-icon brd-activity-${item.type}`}>
                    {item.type === "approved" ? <Check size={14} /> : item.type === "updated" ? <FileText size={14} /> : <Clock3 size={14} />}
                  </span>
                  <div><strong>{item.title}</strong><span>{item.detail}</span></div>
                  <small>{item.time}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="brd-panel brd-quick-actions-panel">
            <div className="brd-panel-heading"><h2>Quick Actions</h2></div>
            <div className="brd-quick-actions-grid">
              <Link href="/brd-requirements/brd-registry/new"><Plus /><span>Create New BRD</span></Link>
              <button type="button" onClick={() => document.getElementById("brd-import-file")?.click()}><ArrowDownToLine /><span>Import BRD</span></button>
              <button type="button" onClick={exportCsv}><Download /><span>Export BRD List</span></button>
              <Link href="/brd-requirements/brd-templates"><FileText /><span>BRD Templates</span></Link>
              <Link href="/brd-requirements/approval-center"><ShieldCheck /><span>Approval Center</span></Link>
              <Link href="/brd-requirements/reports"><BookOpen /><span>BRD Reports</span></Link>
            </div>
          </section>
        </aside>
      </div>

      <div className="brd-dashboard-bottom">
        <section className="brd-panel brd-chart-panel">
          <div className="brd-panel-heading"><h2>BRD Status Overview</h2></div>
          <div className="brd-bar-chart">
            {[
              { label: "Draft", value: countStatus("draft"), color: "#98a2b3" },
              { label: "In Review", value: countStatus("in review"), color: "#f79009" },
              { label: "Approved", value: countStatus("approved"), color: "#079455" },
              { label: "Archived", value: countStatus("archived"), color: "#875bf7" },
            ].map((bar) => (
              <div className="brd-bar-column" key={bar.label}>
                <span>{bar.value}</span>
                <div className="brd-bar-track">
                  <i style={{ height: `${Math.max(5, (bar.value / Math.max(1, totalRecords)) * 100)}%`, background: bar.color }} />
                </div>
                <small>{bar.label}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="brd-panel brd-chart-panel">
          <div className="brd-panel-heading"><h2>BRD by Type</h2></div>
          <DonutChart total={typeSegments.reduce((sum, item) => sum + item.value, 0)} label="Total BRDs" segments={typeSegments} />
        </section>

        <section className="brd-panel brd-chart-panel brd-project-chart">
          <div className="brd-panel-heading"><h2>Top Projects by BRDs</h2></div>
          <div className="brd-project-bars">
            {projectBars.map((project) => (
              <div className="brd-project-bar-row" key={project.name}>
                <span>{project.name}</span>
                <div><i style={{ width: `${(project.value / 8) * 100}%` }} /></div>
                <strong>{project.value}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
