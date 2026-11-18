"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Plus,
  Search,
  RefreshCw,
  Download,
  Copy,
  Trash2,
  Edit3,
  Eye,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  testCaseApi,
  qaLookupApi,
  TestCaseItem,
  formatShortDate,
  severityBadgeClass,
  statusBadgeClass,
} from "@/lib/qa/api";
import "@/components/qa/qa.css";

export default function TestCasesRegistryPage() {
  const [cases, setCases] = useState<TestCaseItem[]>([]);
  const [projects, setProjects] = useState<{ _id: string; projectName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [statusTab, setStatusTab] = useState<"ALL" | "DRAFT" | "REVIEW" | "APPROVED" | "DEPRECATED">("ALL");
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [selected, setSelected] = useState<TestCaseItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tcList, projList] = await Promise.all([
        testCaseApi.list(),
        qaLookupApi.projects().catch(() => []),
      ]);
      setCases(tcList);
      setProjects(projList);
    } catch (e: any) {
      setError(e?.message || "Failed to load test cases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const counts = useMemo(
    () => ({
      ALL: cases.length,
      DRAFT: cases.filter((c) => c.status === "DRAFT").length,
      REVIEW: cases.filter((c) => c.status === "REVIEW").length,
      APPROVED: cases.filter((c) => c.status === "APPROVED").length,
      DEPRECATED: cases.filter((c) => c.status === "DEPRECATED").length,
    }),
    [cases]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter((c) => {
      if (statusTab !== "ALL" && c.status !== statusTab) return false;
      const pid = c.projectId?._id || c.projectId || "";
      if (projectFilter !== "ALL" && String(pid) !== projectFilter) return false;
      if (priorityFilter !== "ALL" && c.priority !== priorityFilter) return false;
      if (q && !`${c.testCaseCode} ${c.title} ${c.module} ${c.projectName} ${c.authorName}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cases, statusTab, projectFilter, priorityFilter, search]);

  const handleApprove = async (tc: TestCaseItem) => {
    try {
      await testCaseApi.update(tc._id, { status: "APPROVED" });
      await loadData();
      flash(`${tc.testCaseCode} approved.`);
    } catch (e: any) {
      setError(e?.message || "Failed to approve test case");
    }
  };

  const handleClone = async (tc: TestCaseItem) => {
    try {
      const cloned = await testCaseApi.clone(tc._id);
      await loadData();
      flash(`Cloned as ${cloned.testCaseCode}.`);
    } catch (e: any) {
      setError(e?.message || "Failed to clone test case");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await testCaseApi.remove(id);
      if (selected?._id === id) setSelected(null);
      await loadData();
      flash("Test case deleted.");
    } catch (e: any) {
      setError(e?.message || "Failed to delete test case");
    }
  };

  const handleExportCsv = () => {
    const headers = ["ID", "Title", "Project", "Module", "Type", "Priority", "Status", "Steps", "Author", "Created"];
    const rows = filtered.map((c) => [
      c.testCaseCode,
      c.title,
      c.projectId?.projectName || c.projectName,
      c.module,
      c.testType,
      c.priority,
      c.status,
      c.steps?.length || 0,
      c.authorName,
      formatShortDate(c.createdAt),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "test-case-registry.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="qa-page">
      {/* Header */}
      <div>
        <div className="qa-breadcrumb">
          <Link href="/qa">QA &amp; Bug Management</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Test Case Registry</span>
        </div>
        <div className="qa-header">
          <div>
            <h1 className="qa-title">Test Case Registry</h1>
            <p className="qa-subtitle">Create, review, approve, clone, and maintain structured test cases across projects and modules.</p>
          </div>
          <div className="qa-actions">
            <button type="button" className="qa-btn" onClick={handleExportCsv}><Download size={12} /> Export CSV</button>
            <button type="button" className="qa-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            </button>
            <Link href="/qa/test-cases/new" className="qa-btn qa-btn-primary">
              <Plus size={13} /> Create Test Case
            </Link>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="qa-subnav">
        <Link href="/qa" className="qa-subnav-link">QA Dashboard</Link>
        <Link href="/qa/test-cases" className="qa-subnav-link active">Test Cases</Link>
        <Link href="/qa/test-cases/new" className="qa-subnav-link">Create Test Case</Link>
        <Link href="/qa/test-runs" className="qa-subnav-link">Test Runs</Link>
        <Link href="/qa/bugs" className="qa-subnav-link">Bug Registry</Link>
        <Link href="/qa/bugs/new" className="qa-subnav-link">Report Bug</Link>
      </div>

      {notice && <div className="qa-alert qa-alert-healthy"><CheckCircle2 size={14} /> <span>{notice}</span></div>}
      {error && <div className="qa-alert qa-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}

      {/* Status Tabs matching QA-001 Panel 2 */}
      <div className="qa-seg" style={{ width: "fit-content" }}>
        {(["ALL", "DRAFT", "REVIEW", "APPROVED", "DEPRECATED"] as const).map((st) => (
          <button key={st} type="button" className={`qa-seg-btn ${statusTab === st ? "active" : ""}`} onClick={() => setStatusTab(st)}>
            {st.charAt(0) + st.slice(1).toLowerCase()} ({counts[st]})
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="qa-filter-bar">
        <div className="qa-search-wrap">
          <Search size={13} className="qa-search-icon" />
          <input className="qa-input" placeholder="Search test case by ID, title, or module..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="qa-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="ALL">All Projects</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
        </select>
        <select className="qa-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="ALL">All Priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Inline Detail View when Selected (QA-001 Panel 7) */}
      {selected && (
        <div className="qa-card" style={{ borderColor: "#93c5fd" }}>
          <div className="qa-card-head">
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className="qa-badge qa-badge-blue">{selected.testCaseCode}</span>
              <h3 className="qa-card-title">{selected.title}</h3>
              <span className={statusBadgeClass(selected.status)}>{selected.status}</span>
              <span className={severityBadgeClass(selected.priority)}>{selected.priority}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {selected.status !== "APPROVED" && (
                <button type="button" className="qa-btn qa-btn-success qa-btn-sm" onClick={() => handleApprove(selected)}>Approve</button>
              )}
              <Link href={`/qa/test-cases/new?id=${selected._id}`} className="qa-btn qa-btn-sm"><Edit3 size={11} /> Edit</Link>
              <button type="button" className="qa-btn qa-btn-ghost qa-btn-sm" onClick={() => setSelected(null)}><X size={14} /></button>
            </div>
          </div>
          <p style={{ margin: "0 0 10px", color: "#475569" }}>{selected.description || "No description provided."}</p>
          <div className="qa-grid-3" style={{ fontSize: 10.5, marginBottom: 10 }}>
            <div><span style={{ color: "#64748b" }}>Project:</span> <strong>{selected.projectId?.projectName || selected.projectName || "—"}</strong></div>
            <div><span style={{ color: "#64748b" }}>Module:</span> <strong>{selected.module}</strong></div>
            <div><span style={{ color: "#64748b" }}>Test Type:</span> <strong>{selected.testType}</strong></div>
            <div><span style={{ color: "#64748b" }}>Preconditions:</span> <strong>{selected.preconditions || "—"}</strong></div>
            <div><span style={{ color: "#64748b" }}>Postconditions:</span> <strong>{selected.postconditions || "—"}</strong></div>
            <div><span style={{ color: "#64748b" }}>Author:</span> <strong>{selected.authorName || "—"}</strong></div>
          </div>
          <div className="qa-table-wrap">
            <table className="qa-table" style={{ border: "1px solid #e3eaf4" }}>
              <thead><tr><th>#</th><th>Step Description</th><th>Test Data</th><th>Expected Result</th></tr></thead>
              <tbody>
                {(selected.steps || []).length === 0 ? (
                  <tr><td colSpan={4} className="qa-empty">No steps defined.</td></tr>
                ) : (
                  selected.steps.map((st, i) => (
                    <tr key={i}>
                      <td><strong>{st.stepNumber || i + 1}</strong></td>
                      <td>{st.description}</td>
                      <td style={{ color: "#64748b" }}>{st.testData || "—"}</td>
                      <td>{st.expectedResult || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Registry Table */}
      <div className="qa-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="qa-table-wrap">
          <table className="qa-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Project &amp; Module</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Steps</th>
                <th>Created By</th>
                <th>Created On</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && cases.length === 0 ? (
                <tr><td colSpan={10} className="qa-empty">Loading test cases...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="qa-empty">
                    No test cases found. Click <strong>+ Create Test Case</strong> to author your first test case.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: 700, color: "#0755e9", whiteSpace: "nowrap" }}>{c.testCaseCode}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setSelected(c)}
                        style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", fontWeight: 600, color: "#10204a", textAlign: "left" }}
                      >
                        {c.title}
                      </button>
                    </td>
                    <td>
                      <div>{c.projectId?.projectName || c.projectName || "—"}</div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>{c.module}</div>
                    </td>
                    <td><span className="qa-badge qa-badge-slate">{c.testType}</span></td>
                    <td><span className={severityBadgeClass(c.priority)}>{c.priority}</span></td>
                    <td><span className={statusBadgeClass(c.status)}>{c.status}</span></td>
                    <td>{c.steps?.length || 0}</td>
                    <td>{c.authorName || "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatShortDate(c.createdAt)}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <button type="button" className="qa-btn qa-btn-sm" onClick={() => setSelected(c)} title="View"><Eye size={11} /></button>
                        <Link href={`/qa/test-cases/new?id=${c._id}`} className="qa-btn qa-btn-sm" title="Edit"><Edit3 size={11} /></Link>
                        <button type="button" className="qa-btn qa-btn-sm" onClick={() => handleClone(c)} title="Clone"><Copy size={11} /></button>
                        <button type="button" className="qa-btn qa-btn-danger qa-btn-sm" onClick={() => handleDelete(c._id)} title="Delete"><Trash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
