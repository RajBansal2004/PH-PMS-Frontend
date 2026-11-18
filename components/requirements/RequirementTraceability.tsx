
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { requirements as getRequirementsApi } from "../../lib/api";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeftRight,
  BarChart3,
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
  FileBarChart,
  FileText,
  Filter,
  GitBranch,
  Grid2X2,
  Link2,
  ListChecks,
  MoreHorizontal,
  Search,
  Settings2,
  ShieldCheck,
  Target,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import "./requirement-traceability.css";

type ReqStatus = "Approved" | "In Review" | "In Progress" | "Deferred" | "Rejected";
type ReqType = "Functional" | "Non-Functional" | "Business" | "Constraint";
type Priority = "Critical" | "High" | "Medium" | "Low" | "Info";

type Requirement = {
  id: string;
  title: string;
  project: string;
  brd: string;
  type: ReqType;
  priority: Priority;
  status: ReqStatus;
  testCases: string[];
  userStory: string;
  deliverables: string[];
  category: string;
};

const TEST_CASES = [
  "TC-1001", "TC-1002", "TC-1003", "TC-1004",
  "TC-1005", "TC-1006", "TC-1007", "TC-1008",
];

const INITIAL_REQUIREMENTS: Requirement[] = [
  { id: "REQ-0001", title: "Patient Registration", project: "PRJ-001", brd: "BRD-24-003", type: "Functional", priority: "High", status: "Approved", testCases: ["TC-1001", "TC-1002", "TC-1003", "TC-1004", "TC-1005", "TC-1007", "TC-1008"], userStory: "US-0001", deliverables: ["D-1001", "D-1002"], category: "Patient Management" },
  { id: "REQ-0002", title: "Appointment Scheduling", project: "PRJ-001", brd: "BRD-24-003", type: "Functional", priority: "High", status: "Approved", testCases: ["TC-1001", "TC-1002", "TC-1003", "TC-1005", "TC-1006", "TC-1007"], userStory: "US-0002", deliverables: ["D-1003"], category: "Appointment" },
  { id: "REQ-0003", title: "Doctor Availability Calendar", project: "PRJ-001", brd: "BRD-24-003", type: "Functional", priority: "Medium", status: "In Review", testCases: ["TC-1002", "TC-1004", "TC-1006", "TC-1008"], userStory: "US-0003", deliverables: ["D-1004"], category: "Appointment" },
  { id: "REQ-0004", title: "EMR Creation", project: "PRJ-001", brd: "BRD-24-003", type: "Functional", priority: "High", status: "Approved", testCases: ["TC-1001", "TC-1002", "TC-1003", "TC-1004", "TC-1006", "TC-1007", "TC-1008"], userStory: "US-0004", deliverables: ["D-1005", "D-1006"], category: "EMR" },
  { id: "REQ-0005", title: "Digital Prescription", project: "PRJ-001", brd: "BRD-24-003", type: "Functional", priority: "Medium", status: "Approved", testCases: ["TC-1002", "TC-1003", "TC-1004", "TC-1006", "TC-1007", "TC-1008"], userStory: "US-0005", deliverables: ["D-1007"], category: "Prescriptions" },
  { id: "REQ-0006", title: "Lab Order & Integration", project: "PRJ-001", brd: "BRD-24-003", type: "Functional", priority: "Medium", status: "In Progress", testCases: ["TC-1001", "TC-1002", "TC-1003", "TC-1007", "TC-1008"], userStory: "US-0006", deliverables: ["D-1008"], category: "Laboratory" },
  { id: "REQ-0007", title: "Billing & Invoicing", project: "PRJ-001", brd: "BRD-24-003", type: "Functional", priority: "High", status: "Approved", testCases: ["TC-1001", "TC-1002", "TC-1003", "TC-1004", "TC-1005", "TC-1007", "TC-1008"], userStory: "US-0007", deliverables: ["D-1009", "D-1010"], category: "Billing" },
  { id: "REQ-0008", title: "Payment Gateway Integration", project: "PRJ-001", brd: "BRD-24-003", type: "Non-Functional", priority: "Medium", status: "Approved", testCases: ["TC-1001", "TC-1002", "TC-1004", "TC-1006"], userStory: "US-0008", deliverables: ["D-1011"], category: "Payments" },
  { id: "REQ-0009", title: "Role Based Access Control", project: "PRJ-001", brd: "BRD-24-003", type: "Non-Functional", priority: "High", status: "Approved", testCases: ["TC-1001", "TC-1002", "TC-1003", "TC-1004", "TC-1005"], userStory: "US-0009", deliverables: ["D-1012"], category: "Security" },
  { id: "REQ-0010", title: "Data Backup & Restore", project: "PRJ-001", brd: "BRD-24-003", type: "Non-Functional", priority: "Medium", status: "In Review", testCases: ["TC-1001", "TC-1002", "TC-1006"], userStory: "US-0010", deliverables: ["D-1013"], category: "Infrastructure" },
  { id: "REQ-0018", title: "Report Export (PDF/Excel)", project: "PRJ-002", brd: "BRD-24-002", type: "Functional", priority: "High", status: "In Progress", testCases: [], userStory: "", deliverables: [], category: "Reporting" },
  { id: "REQ-0027", title: "Multi Language Support", project: "PRJ-002", brd: "BRD-24-002", type: "Non-Functional", priority: "Medium", status: "In Review", testCases: [], userStory: "US-0027", deliverables: [], category: "Accessibility" },
  { id: "REQ-0035", title: "Push Notification Preferences", project: "PRJ-003", brd: "BRD-24-004", type: "Business", priority: "Low", status: "Deferred", testCases: [], userStory: "", deliverables: ["D-1035"], category: "Notifications" },
  { id: "REQ-0042", title: "Offline Data Sync", project: "PRJ-004", brd: "BRD-24-005", type: "Constraint", priority: "Critical", status: "Rejected", testCases: [], userStory: "", deliverables: [], category: "Infrastructure" },
];

const STATUS_OPTIONS: ReqStatus[] = ["Approved", "In Review", "In Progress", "Deferred", "Rejected"];
const TYPE_OPTIONS: ReqType[] = ["Functional", "Non-Functional", "Business", "Constraint"];
const PRIORITY_OPTIONS: Priority[] = ["Critical", "High", "Medium", "Low", "Info"];

const TYPE_COLORS: Record<ReqType, string> = {
  Functional: "#079455",
  "Non-Functional": "#155eef",
  Business: "#f79009",
  Constraint: "#875bf7",
};

const STATUS_COLORS: Record<ReqStatus, string> = {
  Approved: "#079455",
  "In Review": "#f79009",
  "In Progress": "#155eef",
  Deferred: "#875bf7",
  Rejected: "#f04438",
};

function Badge({ value }: { value: ReqStatus | Priority }) {
  return (
    <span className={`rt-badge rt-${value.toLowerCase().replace(/\s+/g, "-")}`}>
      {value}
    </span>
  );
}

function Donut({
  total,
  segments,
}: {
  total: number;
  segments: { label: string; value: number; color: string }[];
}) {
  const sum = segments.reduce((acc, item) => acc + item.value, 0) || 1;
  let cursor = 0;
  const gradient = segments.map((segment) => {
    const start = cursor;
    cursor += segment.value / sum * 100;
    return `${segment.color} ${start}% ${cursor}%`;
  }).join(", ");

  return (
    <div className="rt-donut-layout">
      <div
        className="rt-donut"
        style={{ background: `conic-gradient(${gradient})` }}
        role="img"
        aria-label={`${total} requirements`}
      >
        <div className="rt-donut-hole">
          <strong>{total}</strong>
          <span>Total</span>
          <small>Requirements</small>
        </div>
      </div>
      <div className="rt-legend">
        {segments.map((item) => (
          <div className="rt-legend-row" key={item.label}>
            <span><i style={{ background: item.color }} />{item.label}</span>
            <strong>{item.value}<small> ({(item.value / sum * 100).toFixed(2)}%)</small></strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({
  title,
  value,
  sub,
  tone,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  sub?: string;
  tone: string;
  icon: typeof FileText;
}) {
  return (
    <article className={`rt-metric rt-tone-${tone}`}>
      <span className="rt-metric-icon"><Icon size={21} /></span>
      <div>
        <span className="rt-metric-title">{title}</span>
        <strong>{value}</strong>
        {sub && <small>{sub}</small>}
      </div>
    </article>
  );
}

function safeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function RequirementTraceability() {
  const [requirements, setRequirements] = useState(INITIAL_REQUIREMENTS);
  const [project, setProject] = useState("all");
  const [brd, setBrd] = useState("all");
  const [direction, setDirection] = useState("req-test");
  const [linkFilter, setLinkFilter] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [search, setSearch] = useState("");
  const [moreFilters, setMoreFilters] = useState(false);
  const [view, setView] = useState<"matrix" | "graph">("matrix");
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [showColumns, setShowColumns] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    getRequirementsApi()
      .then((res: any) => {
        const list = Array.isArray(res) ? res : (res as any)?.items || [];
        if (list.length > 0) {
          const mapped: Requirement[] = list.map((r: any, idx: number) => {
            const brdLabel =
              typeof r.brdId === "object" && r.brdId !== null
                ? r.brdId.brdCode || r.brdId.code || r.brdId.title || "BRD-00001"
                : (typeof r.brdId === "string" ? r.brdId : "BRD-00001");
            const projectCode =
              typeof r.projectId === "object" && r.projectId !== null
                ? r.projectId.projectCode || r.projectId.code || r.projectId.name || "PRJ-001"
                : (typeof r.projectCode === "string" ? r.projectCode : "PRJ-001");

            const rawTestCases = Array.isArray(r.testCases) ? r.testCases : [];
            const safeTestCases = rawTestCases.length > 0
              ? rawTestCases.map((tc: any) => typeof tc === "string" ? tc : (tc?.testCaseId || tc?.code || tc?.title || String(tc?._id || "TC-101")))
              : ["TC-101", "TC-102"];

            const rawDeliverables = Array.isArray(r.deliverables) ? r.deliverables : [];
            const safeDeliverables = rawDeliverables.length > 0
              ? rawDeliverables.map((del: any) => typeof del === "string" ? del : (del?.name || del?.title || String(del?._id || "DEL-01")))
              : ["DEL-01"];

            return {
              id: r.requirementId || r.reqCode || r.code || `REQ-${String(idx + 101).padStart(5, "0")}`,
              title: r.title || r.name || "Requirement",
              project: projectCode,
              brd: brdLabel,
              type: (r.type || "Functional") as any,
              priority: (r.priority || "High") as any,
              status: (r.status === "APPROVED" ? "Approved" : r.status === "IN_REVIEW" ? "In Review" : "Approved") as any,
              category: typeof r.category === "string" ? r.category : (r.module || "Clinical"),
              testCases: safeTestCases,
              userStory: typeof r.userStory === "string" ? r.userStory : (r.userStory?.title || "US-101"),
              deliverables: safeDeliverables,
              updatedAt: r.updatedAt ? String(r.updatedAt) : new Date().toISOString(),
            };
          });
          setRequirements((prev) => {
            const existingIds = new Set(mapped.map((m) => m.id));
            return [...mapped, ...prev.filter((p) => !existingIds.has(p.id))];
          });
        }
      })
      .catch(() => {});
  }, []);

  const projectOptions = useMemo(() => [...new Set(requirements.map((item) => String(item.project || "")).filter(Boolean))], [requirements]);
  const brdOptions = useMemo(() => [...new Set(requirements.map((item) => String(item.brd || "")).filter(Boolean))], [requirements]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requirements.filter((item) => {
      const matchesSearch = !q || [
        item.id, item.title, item.category, item.brd, item.project, item.userStory,
        ...item.testCases, ...item.deliverables,
      ].some((value) => value.toLowerCase().includes(q));

      const isLinked = item.testCases.length > 0 || Boolean(item.userStory) || item.deliverables.length > 0;
      return matchesSearch &&
        (project === "all" || item.project === project) &&
        (brd === "all" || item.brd === brd) &&
        (type === "all" || item.type === type) &&
        (status === "all" || item.status === status) &&
        (priority === "all" || item.priority === priority) &&
        (linkFilter === "all" || (linkFilter === "linked" ? isLinked : !isLinked));
    });
  }, [requirements, search, project, brd, type, status, priority, linkFilter]);

  const total = requirements.length;
  const linked = requirements.filter((item) => item.testCases.length > 0 || item.userStory || item.deliverables.length > 0).length;
  const unlinked = total - linked;
  const coverage = total ? linked / total * 100 : 0;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const fullyLinked = requirements.filter((item) => item.testCases.length > 0 && item.userStory && item.deliverables.length > 0).length;
  const partiallyLinked = linked - fullyLinked;

  const typeSegments = TYPE_OPTIONS.map((name) => ({
    label: name,
    value: requirements.filter((item) => item.type === name).length,
    color: TYPE_COLORS[name],
  })).filter((item) => item.value > 0);

  const statusSummary = STATUS_OPTIONS.map((name) => ({
    name,
    count: requirements.filter((item) => item.status === name).length,
    color: STATUS_COLORS[name],
  }));

  const prioritySummary = PRIORITY_OPTIONS.map((name) => ({
    name,
    count: requirements.filter((item) => item.priority === name).length,
    color: ({
      Critical: "#f04438",
      High: "#f04438",
      Medium: "#f79009",
      Low: "#079455",
      Info: "#155eef",
    } as Record<Priority, string>)[name],
  }));

  function resetFilters() {
    setProject("all");
    setBrd("all");
    setDirection("req-test");
    setLinkFilter("all");
    setType("all");
    setStatus("all");
    setPriority("all");
    setSearch("");
    setPage(1);
  }

  function exportMatrix() {
    const header = ["Requirement ID", "Title", "Project", "BRD", "Type", "Priority", "Test Cases", "User Story", "Deliverables", "Status"];
    const rows = filtered.map((item) => [
      item.id, item.title, item.project, item.brd, item.type, item.priority,
      item.testCases.join("; "), item.userStory, item.deliverables.join("; "), item.status,
    ]);
    const csv = [header, ...rows].map((row) => row.map((value) => safeCsv(String(value))).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "requirement-traceability-matrix.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice(`Exported ${filtered.length} requirements.`);
  }

  function changeLink(requirementId: string, testCaseId: string) {
    setRequirements((current) => current.map((item) => {
      if (item.id !== requirementId) return item;
      const exists = item.testCases.includes(testCaseId);
      return {
        ...item,
        testCases: exists
          ? item.testCases.filter((id) => id !== testCaseId)
          : [...item.testCases, testCaseId],
      };
    }));
    setNotice("Traceability link updated in this local demo view.");
  }

  function clearNotice() {
    setNotice("");
  }

  const unlinkedItems = requirements.filter((item) =>
    item.testCases.length === 0 && !item.userStory && item.deliverables.length === 0
  );

  const visibleColumns = [
    { id: "id", label: "Req ID" },
    { id: "title", label: "Title" },
    { id: "type", label: "Type" },
    { id: "priority", label: "Priority" },
    ...TEST_CASES.map((id) => ({ id, label: id })),
    { id: "total", label: "Total TC" },
    { id: "stories", label: "User Stories" },
    { id: "deliverables", label: "Deliverables" },
    { id: "status", label: "Status" },
  ];

  return (
    <main className="rt-page">
      <header className="rt-header">
        <div className="rt-heading">
          <span className="rt-heading-icon"><GitBranch size={24} /></span>
          <div>
            <h1>Requirement Traceability Matrix</h1>
            <p>Bi-directional traceability across BRD, Requirements, Deliverables, Test Cases and User Stories</p>
          </div>
        </div>
        <div className="rt-header-actions">
          <button type="button" className="rt-button" onClick={exportMatrix}><Download size={14} /> Export <ChevronDown size={12} /></button>
          <button type="button" className="rt-button" onClick={() => setNotice("Connect your import endpoint to upload and validate a traceability matrix.")}><Upload size={14} /> Import</button>
          <button type="button" className="rt-button rt-button-primary" onClick={() => setNotice("Report generation requires the backend report endpoint.")}><FileBarChart size={14} /> Generate Report</button>
        </div>
      </header>

      <div className="rt-view-switch">
        <button type="button" className={view === "matrix" ? "active" : ""} onClick={() => setView("matrix")}><Grid2X2 size={13} /> Matrix View</button>
        <button type="button" className={view === "graph" ? "active" : ""} onClick={() => setView("graph")}><GitBranch size={13} /> Graph View</button>
      </div>

      <section className="rt-filters">
        <label><span>Project</span>
          <select value={project} onChange={(e) => { setProject(e.target.value); setPage(1); }}>
            <option value="all">All Projects</option>
            {projectOptions.map((item, idx) => <option key={`${item}-${idx}`}>{item}</option>)}
          </select>
        </label>
        <label className="rt-filter-wide"><span>BRD</span>
          <select value={brd} onChange={(e) => { setBrd(e.target.value); setPage(1); }}>
            <option value="all">All BRDs</option>
            {brdOptions.map((item, idx) => <option key={`${item}-${idx}`}>{item}</option>)}
          </select>
        </label>
        <label><span>View By</span>
          <select value={direction} onChange={(e) => setDirection(e.target.value)}>
            <option value="req-test">Requirement → Test Case</option>
            <option value="req-story">Requirement → User Story</option>
            <option value="req-deliverable">Requirement → Deliverable</option>
          </select>
        </label>
        <label><span>Show</span>
          <select value={linkFilter} onChange={(e) => { setLinkFilter(e.target.value); setPage(1); }}>
            <option value="all">All Links</option>
            <option value="linked">Linked Only</option>
            <option value="unlinked">Unlinked Only</option>
          </select>
        </label>
        <label><span>Requirement Type</span>
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="all">All</option>
            {TYPE_OPTIONS.map((item, idx) => <option key={`${item}-${idx}`}>{item}</option>)}
          </select>
        </label>
        <label><span>Status</span>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map((item, idx) => <option key={`${item}-${idx}`}>{item}</option>)}
          </select>
        </label>
        <button type="button" className="rt-button rt-more-filter" onClick={() => setMoreFilters((v) => !v)}><Filter size={13} /> More Filters</button>
        <button type="button" className="rt-clear" onClick={resetFilters}>Clear All</button>
        {moreFilters && (
          <label className="rt-extra-filter"><span>Priority</span>
            <select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
              <option value="all">All Priorities</option>
              {PRIORITY_OPTIONS.map((item, idx) => <option key={`${item}-${idx}`}>{item}</option>)}
            </select>
          </label>
        )}
      </section>

      <section className="rt-metrics">
        <Metric title="Total Requirements" value={total} tone="blue" icon={FileText} />
        <Metric title="Linked Requirements" value={linked} sub={`${coverage.toFixed(2)}%`} tone="green" icon={Link2} />
        <Metric title="Linked Test Cases" value={requirements.reduce((sum, item) => sum + item.testCases.length, 0)} tone="orange" icon={ShieldCheck} />
        <Metric title="Linked User Stories" value={requirements.filter((item) => item.userStory).length} tone="purple" icon={Target} />
        <Metric title="Unlinked Requirements" value={unlinked} sub={`${total ? (unlinked / total * 100).toFixed(2) : "0.00"}%`} tone="red" icon={XCircle} />
        <Metric title="Traceability Coverage" value={`${coverage.toFixed(2)}%`} tone="green" icon={CheckCircle2} />
      </section>

      {notice && <div className="rt-notice" role="status"><span>{notice}</span><button type="button" onClick={clearNotice} aria-label="Dismiss notice"><X size={14} /></button></div>}

      <div className="rt-content-grid">
        <section className="rt-panel rt-matrix-panel">
          <div className="rt-panel-heading rt-matrix-heading">
            <h2>Traceability Matrix <span>({direction === "req-test" ? "Requirement → Test Case" : direction === "req-story" ? "Requirement → User Story" : "Requirement → Deliverable"})</span></h2>
            <div className="rt-matrix-tools">
              <label className="rt-matrix-search"><Search size={13} /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search in matrix..." /></label>
              <div className="rt-column-control">
                <button type="button" className="rt-button" onClick={() => setShowColumns((v) => !v)}><Settings2 size={13} /> Columns</button>
                {showColumns && (
                  <div className="rt-column-popover">
                    <strong>Visible columns</strong>
                    {visibleColumns.map((column) => (
                      <label key={column.id}>
                        <input
                          type="checkbox"
                          checked={!hiddenColumns.includes(column.id)}
                          onChange={() => setHiddenColumns((old) => old.includes(column.id) ? old.filter((id) => id !== column.id) : [...old, column.id])}
                        />
                        {column.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" className="rt-button rt-icon-only" onClick={exportMatrix} aria-label="Download matrix"><ArrowDownToLine size={15} /></button>
            </div>
          </div>

          {view === "matrix" ? (
            <div className="rt-matrix-scroll">
              <table className="rt-table">
                <thead>
                  <tr>
                    {!hiddenColumns.includes("id") && <th rowSpan={2}>Req ID</th>}
                    {!hiddenColumns.includes("title") && <th rowSpan={2}>Requirements</th>}
                    {!hiddenColumns.includes("type") && <th rowSpan={2}>Type</th>}
                    {!hiddenColumns.includes("priority") && <th rowSpan={2}>Priority</th>}
                    {direction === "req-test" && <th colSpan={TEST_CASES.filter((id) => !hiddenColumns.includes(id)).length || 1}>Linked Test Cases (TC)</th>}
                    {direction !== "req-test" && <th rowSpan={2}>{direction === "req-story" ? "Linked User Story" : "Linked Deliverables"}</th>}
                    {!hiddenColumns.includes("total") && <th rowSpan={2}>Total TC</th>}
                    {!hiddenColumns.includes("stories") && <th rowSpan={2}>User Stories</th>}
                    {!hiddenColumns.includes("deliverables") && <th rowSpan={2}>Deliverables</th>}
                    {!hiddenColumns.includes("status") && <th rowSpan={2}>Status</th>}
                  </tr>
                  {direction === "req-test" && <tr>{TEST_CASES.filter((id) => !hiddenColumns.includes(id)).map((id) => <th key={id}>{id}</th>)}</tr>}
                </thead>
                <tbody>
                  {pageRows.map((item, rowIdx) => (
                    <tr key={item.id || `req-row-${rowIdx}`}>
                      {!hiddenColumns.includes("id") && <td><Link href={`/brd-requirements/requirement-detail/${encodeURIComponent(item.id)}`} className="rt-id-link">{item.id}</Link></td>}
                      {!hiddenColumns.includes("title") && <td className="rt-title-cell">{item.title}</td>}
                      {!hiddenColumns.includes("type") && <td>{item.type}</td>}
                      {!hiddenColumns.includes("priority") && <td><Badge value={item.priority} /></td>}

                      {direction === "req-test" && TEST_CASES.filter((id) => !hiddenColumns.includes(id)).map((testCase, tcIdx) => (
                        <td className="rt-link-cell" key={`${testCase}-${tcIdx}`}>
                          <button
                            type="button"
                            className={item.testCases.includes(testCase) ? "is-linked" : "is-unlinked"}
                            title={`${item.id}: ${testCase} — click to toggle demo link`}
                            aria-label={`${item.testCases.includes(testCase) ? "Unlink" : "Link"} ${testCase} to ${item.id}`}
                            onClick={() => changeLink(item.id, testCase)}
                          >
                            {item.testCases.includes(testCase) ? <Link2 size={12} /> : <span>−</span>}
                          </button>
                        </td>
                      ))}

                      {direction !== "req-test" && (
                        <td>
                          {direction === "req-story"
                            ? item.userStory || <span className="rt-muted">Not linked</span>
                            : item.deliverables.join(", ") || <span className="rt-muted">Not linked</span>}
                        </td>
                      )}
                      {!hiddenColumns.includes("total") && <td className="rt-center">{item.testCases.length}</td>}
                      {!hiddenColumns.includes("stories") && <td>{item.userStory || <span className="rt-muted">—</span>}</td>}
                      {!hiddenColumns.includes("deliverables") && <td>{item.deliverables.join(", ") || <span className="rt-muted">—</span>}</td>}
                      {!hiddenColumns.includes("status") && <td><Badge value={item.status} /></td>}
                    </tr>
                  ))}
                  {!pageRows.length && <tr><td colSpan={20} className="rt-empty">No requirements match the selected filters.</td></tr>}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rt-graph-view">
              <div className="rt-graph-column">
                <h3>Requirements</h3>
                {pageRows.slice(0, 6).map((item, idx) => <div className="rt-graph-node" key={item.id || `node-req-${idx}`}><FileText size={14} /><span><strong>{item.id}</strong><small>{item.title}</small></span></div>)}
              </div>
              <div className="rt-graph-links" aria-hidden="true">
                {pageRows.slice(0, 6).map((item, idx) => <div key={item.id || `link-${idx}`}><ArrowLeftRight size={15} /></div>)}
              </div>
              <div className="rt-graph-column">
                <h3>{direction === "req-test" ? "Test Cases" : direction === "req-story" ? "User Stories" : "Deliverables"}</h3>
                {pageRows.slice(0, 6).map((item, idx) => (
                  <div className={`rt-graph-node ${!(direction === "req-test" ? item.testCases.length : direction === "req-story" ? item.userStory : item.deliverables.length) ? "unlinked" : ""}`} key={item.id || `node-target-${idx}`}>
                    <GitBranch size={14} /><span><strong>{direction === "req-test" ? item.testCases[0] || "Not linked" : direction === "req-story" ? item.userStory || "Not linked" : item.deliverables[0] || "Not linked"}</strong><small>{direction === "req-test" ? `${item.testCases.length} linked test cases` : "Traceability target"}</small></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rt-table-footer">
            <span>Showing {filtered.length ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} requirements</span>
            <div className="rt-pagination">
              <button type="button" disabled={currentPage <= 1} onClick={() => setPage(1)} aria-label="First page"><ChevronsLeft size={13} /></button>
              <button type="button" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous page"><ChevronLeft size={13} /></button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).filter((num) => num === 1 || num === totalPages || Math.abs(num - currentPage) <= 1).map((num, index, arr) => (
                <span className="rt-page-number" key={num}>
                  {index > 0 && num - arr[index - 1] > 1 && <span>…</span>}
                  <button type="button" className={num === currentPage ? "current" : ""} onClick={() => setPage(num)}>{num}</button>
                </span>
              ))}
              <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Next page"><ChevronRight size={13} /></button>
              <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)} aria-label="Last page"><ChevronsRight size={13} /></button>
              <select aria-label="Page size" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>
        </section>

        <aside className="rt-sidebar">
          <section className="rt-panel">
            <div className="rt-panel-heading"><h2>Traceability Summary</h2></div>
            <Donut
              total={total}
              segments={[
                { label: "Fully Linked", value: fullyLinked, color: "#079455" },
                { label: "Partially Linked", value: partiallyLinked, color: "#155eef" },
                { label: "Not Linked", value: unlinked, color: "#f04438" },
              ]}
            />
          </section>

          <section className="rt-panel">
            <div className="rt-panel-heading"><h2>Coverage Details</h2></div>
            <div className="rt-coverage">
              {[
                { label: "Requirement → Test Case", value: requirements.filter((item) => item.testCases.length > 0).length },
                { label: "Requirement → User Story", value: requirements.filter((item) => item.userStory).length },
                { label: "Requirement → Deliverable", value: requirements.filter((item) => item.deliverables.length > 0).length },
                { label: "Requirement → Acceptance Criteria", value: Math.max(0, total - unlinked) },
              ].map((item) => (
                <div className="rt-coverage-item" key={item.label}>
                  <div><span>{item.label}</span><strong>{total ? (item.value / total * 100).toFixed(2) : "0.00"}%</strong></div>
                  <div className="rt-progress-track"><i style={{ width: `${total ? item.value / total * 100 : 0}%` }} /></div>
                </div>
              ))}
            </div>
          </section>

          <section className="rt-panel">
            <div className="rt-panel-heading"><h2>Unlinked Requirements ({unlinkedItems.length})</h2><button type="button" onClick={() => { setLinkFilter("unlinked"); setPage(1); }}>View All</button></div>
            <div className="rt-unlinked-list">
              {unlinkedItems.slice(0, 4).map((item) => (
                <div key={item.id}><i /><strong>{item.id}</strong><span>{item.title}</span></div>
              ))}
              {unlinkedItems.length > 4 && <button type="button" onClick={() => { setLinkFilter("unlinked"); setPage(1); }}>+ {unlinkedItems.length - 4} more</button>}
              {!unlinkedItems.length && <p>All requirements have at least one link.</p>}
            </div>
          </section>

          <section className="rt-panel">
            <div className="rt-panel-heading"><h2>Quick Actions</h2></div>
            <div className="rt-quick-actions">
              <button type="button" onClick={() => setNotice("Connect the matrix report generation API to create a downloadable report.")}><FileBarChart size={15} />Generate Matrix Report</button>
              <button type="button" onClick={exportMatrix}><Download size={15} />Export Matrix (Excel/CSV)</button>
              <button type="button" onClick={() => setView("graph")}><GitBranch size={15} />View Graph Traceability</button>
              <button type="button" onClick={() => setNotice("Traceability settings need a connected settings API.")}><Settings2 size={15} />Traceability Settings</button>
            </div>
          </section>
        </aside>
      </div>

      <div className="rt-bottom-grid">
        <section className="rt-panel">
          <div className="rt-panel-heading"><h2>Traceability by Requirement Type</h2></div>
          <Donut total={total} segments={typeSegments} />
        </section>

        <section className="rt-panel">
          <div className="rt-panel-heading"><h2>Traceability by Priority</h2></div>
          <div className="rt-priority-chart">
            {prioritySummary.map((item) => (
              <div className="rt-priority-bar" key={item.name}>
                <strong>{item.count}</strong>
                <div><i style={{ height: `${Math.max(3, item.count / Math.max(1, total) * 100)}%`, background: item.color }} /></div>
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rt-panel">
          <div className="rt-panel-heading"><h2>Traceability by Status</h2></div>
          <div className="rt-status-list">
            {statusSummary.map((item) => (
              <div key={item.name}><span><i style={{ background: item.color }} />{item.name}</span><strong>{item.count}<small> ({total ? (item.count / total * 100).toFixed(2) : "0.00"}%)</small></strong></div>
            ))}
          </div>
        </section>
      </div>

      <footer className="rt-legend-footer">
        <strong>Legend</strong>
        <span><Link2 size={15} /> Linked</span>
        <span><b>−</b> Not Linked</span>
        <span><ArrowLeftRight size={15} /> Bi-directional Link</span>
        <span><b className="rt-key">TC</b> Test Case</span>
        <span><b className="rt-key">US</b> User Story</span>
        <span><b className="rt-key">D</b> Deliverable</span>
        <span><b className="rt-key">AC</b> Acceptance Criteria</span>
        <span className="rt-generated">Sample data · Connect backend for live traceability</span>
      </footer>
    </main>
  );
}
