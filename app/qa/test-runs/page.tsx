"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Play,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Bug,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  Trash2,
  FileText,
  ExternalLink,
  CheckSquare,
  PauseCircle,
} from "lucide-react";
import {
  testRunApi,
  testCaseApi,
  qaLookupApi,
  TestRunItem,
  TestRunResultItem,
  TestCaseItem,
  formatShortDate,
  statusBadgeClass,
  severityBadgeClass,
} from "@/lib/qa/api";
import "@/components/qa/qa.css";

const RUN_STATUS_TABS = [
  { key: "ALL", label: "All Runs" },
  { key: "NOT_STARTED", label: "Not Started" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "COMPLETED", label: "Completed" },
  { key: "ON_HOLD", label: "On Hold" },
] as const;

const ENVIRONMENTS = ["QA", "STAGING", "UAT", "DEV", "PROD"] as const;

export default function TestRunsPage() {
  const [runs, setRuns] = useState<TestRunItem[]>([]);
  const [projects, setProjects] = useState<{ _id: string; projectName: string }[]>([]);
  const [allTestCases, setAllTestCases] = useState<TestCaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Filters
  const [statusTab, setStatusTab] = useState<string>("ALL");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");
  const [envFilter, setEnvFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Views: list | create | execute
  const [viewMode, setViewMode] = useState<"list" | "create" | "execute">("list");

  // Create Run state
  const [createTitle, setCreateTitle] = useState("");
  const [createProjectId, setCreateProjectId] = useState("");
  const [createRelease, setCreateRelease] = useState("v1.0.0");
  const [createEnv, setCreateEnv] = useState("QA");
  const [createNotes, setCreateNotes] = useState("");
  const [selectedTcIds, setSelectedTcIds] = useState<string[]>([]);
  const [tcSearch, setTcSearch] = useState("");
  const [creating, setCreating] = useState(false);

  // Active Execution Run state
  const [activeRun, setActiveRun] = useState<TestRunItem | null>(null);
  const [execTab, setExecTab] = useState<"cases" | "bugs" | "activity">("cases");
  const [selectedResult, setSelectedResult] = useState<TestRunResultItem | null>(null);
  const [resStatus, setResStatus] = useState<"PASS" | "FAIL" | "BLOCKED" | "NOT_RUN">("PASS");
  const [resActual, setResActual] = useState("");
  const [resComments, setResComments] = useState("");
  const [logBugOnFail, setLogBugOnFail] = useState(true);
  const [bugTitle, setBugTitle] = useState("");
  const [bugSeverity, setBugSeverity] = useState<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW">("HIGH");
  const [savingResult, setSavingResult] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [runList, projList, tcList] = await Promise.all([
        testRunApi.list({
          status: statusTab !== "ALL" ? statusTab : undefined,
          projectId: projectFilter !== "ALL" ? projectFilter : undefined,
          environment: envFilter !== "ALL" ? envFilter : undefined,
        }),
        qaLookupApi.projects().catch(() => []),
        testCaseApi.list({ limit: 100 }).catch(() => []),
      ]);
      setRuns(runList);
      setProjects(projList);
      setAllTestCases(tcList);
      if (!createProjectId && projList.length > 0) {
        setCreateProjectId(projList[0]._id);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load test runs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusTab, projectFilter, envFilter]);

  const filteredRuns = useMemo(() => {
    if (!search.trim()) return runs;
    const q = search.trim().toLowerCase();
    return runs.filter(
      (r) =>
        r.runCode?.toLowerCase().includes(q) ||
        r.title?.toLowerCase().includes(q) ||
        r.projectName?.toLowerCase().includes(q) ||
        r.releaseVersion?.toLowerCase().includes(q)
    );
  }, [runs, search]);

  const projectTestCases = useMemo(() => {
    return allTestCases.filter((tc) => {
      const pid = typeof tc.projectId === "object" ? tc.projectId?._id : tc.projectId;
      const matchesProj = !createProjectId || pid === createProjectId;
      const matchesSearch =
        !tcSearch.trim() ||
        tc.title?.toLowerCase().includes(tcSearch.toLowerCase()) ||
        tc.testCaseCode?.toLowerCase().includes(tcSearch.toLowerCase()) ||
        tc.module?.toLowerCase().includes(tcSearch.toLowerCase());
      return matchesProj && matchesSearch;
    });
  }, [allTestCases, createProjectId, tcSearch]);

  const summaryStats = useMemo(() => {
    const totalRuns = runs.length;
    const active = runs.filter((r) => r.status === "IN_PROGRESS").length;
    const completed = runs.filter((r) => r.status === "COMPLETED").length;
    const totalExecuted = runs.reduce((acc, r) => acc + (r.executedCount || 0), 0);
    const totalPassed = runs.reduce((acc, r) => acc + (r.passed || 0), 0);
    const passRate = totalExecuted > 0 ? Math.round((totalPassed / totalExecuted) * 100) : 0;
    return { totalRuns, active, completed, passRate };
  }, [runs]);

  const openExecution = async (run: TestRunItem) => {
    setError(null);
    try {
      const fresh = await testRunApi.get(run._id);
      setActiveRun(fresh);
      setViewMode("execute");
      setExecTab("cases");
      const firstNotRun =
        fresh.results?.find((r) => r.status === "NOT_RUN") || fresh.results?.[0] || null;
      selectResultForExec(firstNotRun);
    } catch (e: any) {
      setError(e?.message || "Failed to open test run");
    }
  };

  const selectResultForExec = (res: TestRunResultItem | null) => {
    setSelectedResult(res);
    if (res) {
      setResStatus(res.status === "NOT_RUN" ? "PASS" : res.status);
      setResActual(res.actualResult || "");
      setResComments(res.comments || "");
      setLogBugOnFail(!res.bugId);
      setBugTitle(`Failed Test: ${res.testCaseTitle}`);
      setBugSeverity(res.priority === "CRITICAL" ? "CRITICAL" : res.priority === "LOW" ? "LOW" : "HIGH");
    }
  };

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) {
      setError("Test Run Title is required.");
      return;
    }
    if (!createProjectId) {
      setError("Please select a project.");
      return;
    }
    if (selectedTcIds.length === 0) {
      setError("Select at least one test case to include in this test run.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const created = await testRunApi.create({
        title: createTitle.trim(),
        projectId: createProjectId,
        releaseVersion: createRelease.trim() || "v1.0.0",
        environment: createEnv,
        notes: createNotes.trim(),
        testCaseIds: selectedTcIds,
      });
      showToast(`Test Run ${created.runCode} created with ${created.results?.length || 0} test cases.`);
      setCreateTitle("");
      setCreateNotes("");
      setSelectedTcIds([]);
      await loadData();
      setActiveRun(created);
      setViewMode("execute");
      selectResultForExec(created.results?.[0] || null);
    } catch (err: any) {
      setError(err?.message || "Failed to create test run");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveResult = async () => {
    if (!activeRun || !selectedResult) return;
    setSavingResult(true);
    setError(null);
    try {
      const shouldLogBug = resStatus === "FAIL" && logBugOnFail && !selectedResult.bugId;
      const resp = await testRunApi.updateResult(activeRun._id, selectedResult._id, {
        status: resStatus,
        actualResult: resActual.trim(),
        comments: resComments.trim(),
        logBug: shouldLogBug,
        bugTitle: shouldLogBug ? bugTitle.trim() || `Failed Test: ${selectedResult.testCaseTitle}` : undefined,
        bugSeverity: shouldLogBug ? bugSeverity : undefined,
      });

      const updatedRun = resp.testRun || (resp as any);
      setActiveRun(updatedRun);
      setRuns((prev) => prev.map((r) => (r._id === updatedRun._id ? updatedRun : r)));

      if (resp.createdBug) {
        showToast(
          `Result saved as FAIL & Bug ${resp.createdBug.bugId} created automatically.`
        );
      } else {
        showToast(`Marked ${selectedResult.testCaseCode || "test case"} as ${resStatus}.`);
      }

      // Advance to next NOT_RUN test case if available
      const refreshedList = updatedRun.results || [];
      const currentIdx = refreshedList.findIndex((x: TestRunResultItem) => x._id === selectedResult._id);
      const nextNotRun =
        refreshedList.slice(currentIdx + 1).find((x: TestRunResultItem) => x.status === "NOT_RUN") ||
        refreshedList.find((x: TestRunResultItem) => x.status === "NOT_RUN") ||
        refreshedList[currentIdx] ||
        null;
      selectResultForExec(nextNotRun);
    } catch (err: any) {
      setError(err?.message || "Failed to save execution result");
    } finally {
      setSavingResult(false);
    }
  };

  const handleUpdateRunStatus = async (nextStatus: "COMPLETED" | "IN_PROGRESS" | "ON_HOLD") => {
    if (!activeRun) return;
    try {
      const updated = await testRunApi.update(activeRun._id, { status: nextStatus });
      setActiveRun(updated);
      setRuns((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
      showToast(`Test run status updated to ${nextStatus.replace("_", " ")}.`);
    } catch (err: any) {
      setError(err?.message || "Failed to update run status");
    }
  };

  const handleDeleteRun = async (run: TestRunItem) => {
    if (!window.confirm(`Delete Test Run ${run.runCode} (${run.title})?`)) return;
    try {
      await testRunApi.remove(run._id);
      setRuns((prev) => prev.filter((r) => r._id !== run._id));
      if (activeRun?._id === run._id) {
        setActiveRun(null);
        setViewMode("list");
      }
      showToast(`Deleted test run ${run.runCode}.`);
    } catch (err: any) {
      setError(err?.message || "Failed to delete test run");
    }
  };

  const toggleTcSelection = (id: string) => {
    setSelectedTcIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllTcs = () => {
    if (selectedTcIds.length === projectTestCases.length && projectTestCases.length > 0) {
      setSelectedTcIds([]);
    } else {
      setSelectedTcIds(projectTestCases.map((tc) => tc._id));
    }
  };

  // ==================== EXECUTION WORKSPACE VIEW (QA-003 Panel 3-5) ====================
  if (viewMode === "execute" && activeRun) {
    const total = activeRun.totalTests || activeRun.results?.length || 0;
    const executed = activeRun.executedCount || 0;
    const pct = total > 0 ? Math.round((executed / total) * 100) : 0;
    const passRate = executed > 0 ? Math.round(((activeRun.passed || 0) / executed) * 100) : 0;
    const linkedBugs = (activeRun.results || []).filter((r) => r.bugId || r.bugCode);

    return (
      <div className="qa-page">
        <div>
          <div className="qa-breadcrumb">
            <Link href="/qa">QA &amp; Bug Management</Link>
            <ChevronRight size={12} />
            <button
              type="button"
              onClick={() => setViewMode("list")}
              style={{ border: 0, background: "transparent", color: "#0755e9", cursor: "pointer", fontWeight: 600, padding: 0, fontSize: 11 }}
            >
              Test Runs
            </button>
            <ChevronRight size={12} />
            <span style={{ color: "#10204a", fontWeight: 600 }}>{activeRun.runCode}</span>
          </div>
          <div className="qa-header">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="qa-badge qa-badge-blue">{activeRun.runCode}</span>
                <h1 className="qa-title">{activeRun.title}</h1>
                <span className={statusBadgeClass(activeRun.status)}>
                  {activeRun.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="qa-subtitle">
                Project: <strong>{activeRun.projectName || "—"}</strong> · Release:{" "}
                <strong>{activeRun.releaseVersion || "v1.0"}</strong> · Environment:{" "}
                <strong>{activeRun.environment || "QA"}</strong> · Executed By:{" "}
                <strong>{activeRun.executedBy || "QA Lead"}</strong>
              </p>
            </div>
            <div className="qa-actions">
              <button type="button" className="qa-btn" onClick={() => setViewMode("list")}>
                <ArrowLeft size={12} /> All Runs
              </button>
              {activeRun.status !== "ON_HOLD" && activeRun.status !== "COMPLETED" && (
                <button
                  type="button"
                  className="qa-btn"
                  onClick={() => handleUpdateRunStatus("ON_HOLD")}
                >
                  <PauseCircle size={12} /> Pause Run
                </button>
              )}
              {activeRun.status !== "COMPLETED" ? (
                <button
                  type="button"
                  className="qa-btn qa-btn-success"
                  onClick={() => handleUpdateRunStatus("COMPLETED")}
                >
                  <CheckCircle2 size={12} /> Complete Run
                </button>
              ) : (
                <button
                  type="button"
                  className="qa-btn qa-btn-primary"
                  onClick={() => handleUpdateRunStatus("IN_PROGRESS")}
                >
                  <Play size={12} /> Reopen Run
                </button>
              )}
            </div>
          </div>
        </div>

        {error && <div className="qa-alert qa-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}
        {toast && <div className="qa-alert qa-alert-healthy"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

        {/* KPIs + Execution Progress Bar */}
        <div className="qa-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 12 }}>
              Execution Progress — {executed} / {total} Executed ({pct}%)
            </span>
            <span style={{ fontWeight: 700, color: passRate >= 80 ? "#047857" : "#b45309" }}>
              Pass Rate: {passRate}%
            </span>
          </div>
          <div className="qa-bar-track" style={{ height: 8, marginBottom: 12 }}>
            <div
              className="qa-bar-fill"
              style={{ width: `${pct}%`, background: "#0755e9" }}
            />
          </div>
          <div className="qa-kpi-grid">
            <div className="qa-kpi">
              <div className="qa-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><CheckSquare size={15} /></div>
              <div><span className="qa-kpi-label">Total Cases</span><span className="qa-kpi-val">{total}</span></div>
            </div>
            <div className="qa-kpi">
              <div className="qa-kpi-icon" style={{ background: "#ecfdf5", color: "#047857" }}><CheckCircle2 size={15} /></div>
              <div><span className="qa-kpi-label">Passed</span><span className="qa-kpi-val" style={{ color: "#047857" }}>{activeRun.passed || 0}</span></div>
            </div>
            <div className="qa-kpi">
              <div className="qa-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><XCircle size={15} /></div>
              <div><span className="qa-kpi-label">Failed</span><span className="qa-kpi-val" style={{ color: "#dc2626" }}>{activeRun.failed || 0}</span></div>
            </div>
            <div className="qa-kpi">
              <div className="qa-kpi-icon" style={{ background: "#fffbeb", color: "#b45309" }}><AlertTriangle size={15} /></div>
              <div><span className="qa-kpi-label">Blocked</span><span className="qa-kpi-val" style={{ color: "#b45309" }}>{activeRun.blocked || 0}</span></div>
            </div>
            <div className="qa-kpi">
              <div className="qa-kpi-icon" style={{ background: "#fef2f2", color: "#c2410c" }}><Bug size={15} /></div>
              <div><span className="qa-kpi-label">Linked Bugs</span><span className="qa-kpi-val">{linkedBugs.length}</span></div>
            </div>
          </div>
        </div>

        {/* Sub-tabs inside Run */}
        <div className="qa-seg">
          <button type="button" className={`qa-seg-btn ${execTab === "cases" ? "active" : ""}`} onClick={() => setExecTab("cases")}>
            Test Cases ({total})
          </button>
          <button type="button" className={`qa-seg-btn ${execTab === "bugs" ? "active" : ""}`} onClick={() => setExecTab("bugs")}>
            Linked Bugs ({linkedBugs.length})
          </button>
          <button type="button" className={`qa-seg-btn ${execTab === "activity" ? "active" : ""}`} onClick={() => setExecTab("activity")}>
            Activity Log ({activeRun.activityLog?.length || 0})
          </button>
        </div>

        {execTab === "cases" && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(300px, 1fr)", gap: 12, alignItems: "start" }}>
            {/* Left: Test Cases table */}
            <div className="qa-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="qa-table-wrap">
                <table className="qa-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Test Case</th>
                      <th>Module</th>
                      <th>Status</th>
                      <th>Bug</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeRun.results || []).length === 0 ? (
                      <tr><td colSpan={5} className="qa-empty">No test cases attached to this run.</td></tr>
                    ) : (
                      activeRun.results.map((r) => {
                        const isSel = selectedResult?._id === r._id;
                        return (
                          <tr
                            key={r._id}
                            onClick={() => selectResultForExec(r)}
                            style={{
                              cursor: "pointer",
                              background: isSel ? "#eff6ff" : undefined,
                            }}
                          >
                            <td style={{ fontWeight: 700, color: "#0755e9", whiteSpace: "nowrap" }}>
                              {r.testCaseCode || "TC"}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{r.testCaseTitle}</div>
                              {r.actualResult && (
                                <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                                  Actual: {r.actualResult.slice(0, 70)}
                                </div>
                              )}
                            </td>
                            <td>{r.module || "—"}</td>
                            <td>
                              <span className={statusBadgeClass(r.status)}>
                                {r.status.replace("_", " ")}
                              </span>
                            </td>
                            <td>
                              {r.bugId ? (
                                <Link
                                  href={`/qa/bugs/${r.bugId}`}
                                  className="qa-badge qa-badge-red"
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ textDecoration: "none" }}
                                >
                                  <Bug size={10} /> {r.bugCode || "Bug"}
                                </Link>
                              ) : (
                                <span style={{ color: "#94a3b8" }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Interactive Execution Panel with 1-Click Log Bug */}
            <div className="qa-card" style={{ position: "sticky", top: 14 }}>
              {!selectedResult ? (
                <div className="qa-empty">Select a test case from the table to record execution results.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <span className="qa-badge qa-badge-blue">{selectedResult.testCaseCode || "Test Case"}</span>
                      <span className={severityBadgeClass(selectedResult.priority)}>{selectedResult.priority}</span>
                    </div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, margin: "6px 0 2px" }}>
                      {selectedResult.testCaseTitle}
                    </h3>
                    <span style={{ fontSize: 10.5, color: "#64748b" }}>
                      Module: {selectedResult.module || "General"}
                    </span>
                  </div>

                  <div className="qa-field">
                    <label>Execution Result *</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 5 }}>
                      {(["PASS", "FAIL", "BLOCKED", "NOT_RUN"] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setResStatus(st)}
                          className="qa-btn qa-btn-sm"
                          style={{
                            background:
                              resStatus === st
                                ? st === "PASS"
                                  ? "#079b62"
                                  : st === "FAIL"
                                  ? "#dc2626"
                                  : st === "BLOCKED"
                                  ? "#d97706"
                                  : "#475569"
                                : "#ffffff",
                            color: resStatus === st ? "#ffffff" : "#10204a",
                            borderColor: resStatus === st ? "transparent" : "#d5dfef",
                          }}
                        >
                          {st.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="qa-field">
                    <label>Actual Result</label>
                    <textarea
                      className="qa-textarea"
                      rows={3}
                      placeholder="Describe observed behavior..."
                      value={resActual}
                      onChange={(e) => setResActual(e.target.value)}
                    />
                  </div>

                  <div className="qa-field">
                    <label>Execution Notes / Comments</label>
                    <textarea
                      className="qa-textarea"
                      rows={2}
                      placeholder="Optional QA notes, build ID, or browser details..."
                      value={resComments}
                      onChange={(e) => setResComments(e.target.value)}
                    />
                  </div>

                  {/* 1-Click Log Bug Panel on FAIL (QA-003 Panel 5) */}
                  {resStatus === "FAIL" && !selectedResult.bugId && (
                    <div
                      style={{
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: 7,
                        padding: 10,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 700, color: "#991b1b", fontSize: 11 }}>
                        <input
                          type="checkbox"
                          checked={logBugOnFail}
                          onChange={(e) => setLogBugOnFail(e.target.checked)}
                        />
                        <Bug size={13} /> 1-Click Auto-Log Linked Bug on Save
                      </label>
                      {logBugOnFail && (
                        <>
                          <div className="qa-field">
                            <label style={{ color: "#991b1b" }}>Bug Title</label>
                            <input
                              className="qa-input"
                              value={bugTitle}
                              onChange={(e) => setBugTitle(e.target.value)}
                              placeholder="Bug title..."
                            />
                          </div>
                          <div className="qa-field">
                            <label style={{ color: "#991b1b" }}>Severity</label>
                            <select
                              className="qa-select"
                              value={bugSeverity}
                              onChange={(e) => setBugSeverity(e.target.value as any)}
                            >
                              <option value="CRITICAL">Critical</option>
                              <option value="HIGH">High</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="LOW">Low</option>
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {selectedResult.bugId && (
                    <div className="qa-alert qa-alert-info">
                      <Bug size={14} />
                      <span>
                        Linked Bug:{" "}
                        <Link
                          href={`/qa/bugs/${selectedResult.bugId}`}
                          style={{ color: "#0755e9", fontWeight: 700, textDecoration: "underline" }}
                        >
                          {selectedResult.bugCode || "View Bug"}
                        </Link>
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    className={`qa-btn ${resStatus === "FAIL" && logBugOnFail && !selectedResult.bugId ? "qa-btn-primary" : "qa-btn-success"}`}
                    style={{ width: "100%", height: 34 }}
                    onClick={handleSaveResult}
                    disabled={savingResult}
                  >
                    {savingResult
                      ? "Saving..."
                      : resStatus === "FAIL" && logBugOnFail && !selectedResult.bugId
                      ? "Save FAIL & Create Bug"
                      : "Save Result & Next"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {execTab === "bugs" && (
          <div className="qa-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="qa-table-wrap">
              <table className="qa-table">
                <thead>
                  <tr>
                    <th>Bug Code</th>
                    <th>Failed Test Case</th>
                    <th>Module</th>
                    <th>Actual Result</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedBugs.length === 0 ? (
                    <tr><td colSpan={5} className="qa-empty">No bugs logged from this test run yet.</td></tr>
                  ) : (
                    linkedBugs.map((r) => (
                      <tr key={r._id}>
                        <td><span className="qa-badge qa-badge-red">{r.bugCode || "BUG"}</span></td>
                        <td style={{ fontWeight: 600 }}>{r.testCaseCode} — {r.testCaseTitle}</td>
                        <td>{r.module || "—"}</td>
                        <td>{r.actualResult || r.comments || "—"}</td>
                        <td>
                          {r.bugId && (
                            <Link href={`/qa/bugs/${r.bugId}`} className="qa-btn qa-btn-sm">
                              Open Bug <ExternalLink size={11} />
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {execTab === "activity" && (
          <div className="qa-card">
            <h3 className="qa-card-title" style={{ marginBottom: 10 }}>Execution Audit Trail</h3>
            {(activeRun.activityLog || []).length === 0 ? (
              <div className="qa-empty">No activity logged yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[...(activeRun.activityLog || [])].reverse().map((act, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "7px 10px",
                      background: "#f8fafd",
                      borderRadius: 6,
                      border: "1px solid #e3eaf4",
                    }}
                  >
                    <div>
                      <span className="qa-badge qa-badge-blue" style={{ marginRight: 6 }}>{act.action}</span>
                      <strong>{act.byName}</strong>
                      {act.comments && <span style={{ color: "#475569" }}> — {act.comments}</span>}
                    </div>
                    <span style={{ color: "#64748b", fontSize: 10, whiteSpace: "nowrap" }}>
                      {formatShortDate(act.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ==================== CREATE TEST RUN PANEL (QA-003 Panel 2) ====================
  if (viewMode === "create") {
    return (
      <div className="qa-page">
        <div>
          <div className="qa-breadcrumb">
            <Link href="/qa">QA &amp; Bug Management</Link>
            <ChevronRight size={12} />
            <button
              type="button"
              onClick={() => setViewMode("list")}
              style={{ border: 0, background: "transparent", color: "#0755e9", cursor: "pointer", fontWeight: 600, padding: 0, fontSize: 11 }}
            >
              Test Runs
            </button>
            <ChevronRight size={12} />
            <span style={{ color: "#10204a", fontWeight: 600 }}>Create Test Run</span>
          </div>
          <div className="qa-header">
            <div>
              <h1 className="qa-title">Create Test Run</h1>
              <p className="qa-subtitle">Configure release metadata, target environment, and select test cases to execute.</p>
            </div>
            <div className="qa-actions">
              <button type="button" className="qa-btn" onClick={() => setViewMode("list")}>
                <ArrowLeft size={12} /> Back to Runs
              </button>
            </div>
          </div>
        </div>

        {error && <div className="qa-alert qa-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}

        <form onSubmit={handleCreateRun} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="qa-card">
            <h3 className="qa-card-title" style={{ marginBottom: 10 }}>Run Configuration</h3>
            <div className="qa-grid-2">
              <div className="qa-field">
                <label>Test Run Title *</label>
                <input
                  className="qa-input"
                  placeholder="e.g. Sprint 14 Regression Suite"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  required
                />
              </div>
              <div className="qa-field">
                <label>Project *</label>
                <select
                  className="qa-select"
                  value={createProjectId}
                  onChange={(e) => {
                    setCreateProjectId(e.target.value);
                    setSelectedTcIds([]);
                  }}
                  required
                >
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>{p.projectName}</option>
                  ))}
                </select>
              </div>
              <div className="qa-field">
                <label>Release / Build Version *</label>
                <input
                  className="qa-input"
                  placeholder="e.g. v2.4.0-rc1"
                  value={createRelease}
                  onChange={(e) => setCreateRelease(e.target.value)}
                />
              </div>
              <div className="qa-field">
                <label>Target Environment *</label>
                <select className="qa-select" value={createEnv} onChange={(e) => setCreateEnv(e.target.value)}>
                  {ENVIRONMENTS.map((env) => (
                    <option key={env} value={env}>{env}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="qa-field" style={{ marginTop: 10 }}>
              <label>Notes / Scope</label>
              <textarea
                className="qa-textarea"
                rows={2}
                placeholder="Release scope, prerequisites, or smoke-test goals..."
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="qa-card">
            <div className="qa-card-head">
              <div>
                <h3 className="qa-card-title">
                  Select Test Cases ({selectedTcIds.length} selected of {projectTestCases.length})
                </h3>
              </div>
              <div className="qa-actions">
                <div className="qa-search-wrap" style={{ minWidth: 200 }}>
                  <Search size={13} className="qa-search-icon" />
                  <input
                    className="qa-input"
                    placeholder="Filter test cases..."
                    value={tcSearch}
                    onChange={(e) => setTcSearch(e.target.value)}
                  />
                </div>
                <button type="button" className="qa-btn qa-btn-sm" onClick={toggleSelectAllTcs}>
                  {selectedTcIds.length === projectTestCases.length && projectTestCases.length > 0
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>
            </div>

            {projectTestCases.length === 0 ? (
              <div className="qa-empty">
                No test cases found for the selected project.{" "}
                <Link href="/qa/test-cases/new" style={{ color: "#0755e9", fontWeight: 600 }}>
                  Create a test case first
                </Link>
                .
              </div>
            ) : (
              <div className="qa-table-wrap" style={{ maxHeight: 340, overflowY: "auto" }}>
                <table className="qa-table">
                  <thead>
                    <tr>
                      <th style={{ width: 32 }}>
                        <input
                          type="checkbox"
                          checked={selectedTcIds.length === projectTestCases.length && projectTestCases.length > 0}
                          onChange={toggleSelectAllTcs}
                        />
                      </th>
                      <th>Code</th>
                      <th>Title</th>
                      <th>Module</th>
                      <th>Type</th>
                      <th>Priority</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectTestCases.map((tc) => (
                      <tr key={tc._id} onClick={() => toggleTcSelection(tc._id)} style={{ cursor: "pointer" }}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedTcIds.includes(tc._id)}
                            onChange={() => {}}
                          />
                        </td>
                        <td style={{ fontWeight: 700, color: "#0755e9" }}>{tc.testCaseCode}</td>
                        <td style={{ fontWeight: 600 }}>{tc.title}</td>
                        <td>{tc.module}</td>
                        <td>{tc.testType}</td>
                        <td><span className={severityBadgeClass(tc.priority)}>{tc.priority}</span></td>
                        <td><span className={statusBadgeClass(tc.status)}>{tc.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button type="button" className="qa-btn" onClick={() => setViewMode("list")}>
                Cancel
              </button>
              <button type="submit" className="qa-btn qa-btn-primary" disabled={creating || selectedTcIds.length === 0}>
                <Play size={12} /> {creating ? "Creating Run..." : `Create & Start Run (${selectedTcIds.length})`}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ==================== TEST RUNS LIST VIEW (QA-003 Panel 1) ====================
  return (
    <div className="qa-page">
      <div>
        <div className="qa-breadcrumb">
          <Link href="/qa">QA &amp; Bug Management</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Test Runs &amp; Execution</span>
        </div>
        <div className="qa-header">
          <div>
            <h1 className="qa-title">Test Runs &amp; Execution</h1>
            <p className="qa-subtitle">
              Execute test suites per release, track pass/fail progress in real time, and log defects in one click.
            </p>
          </div>
          <div className="qa-actions">
            <button type="button" className="qa-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" className="qa-btn qa-btn-primary" onClick={() => setViewMode("create")}>
              <Plus size={13} /> New Test Run
            </button>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="qa-subnav">
        <Link href="/qa" className="qa-subnav-link">QA Dashboard</Link>
        <Link href="/qa/test-cases" className="qa-subnav-link">Test Cases</Link>
        <Link href="/qa/test-cases/new" className="qa-subnav-link">Create Test Case</Link>
        <Link href="/qa/test-runs" className="qa-subnav-link active">Test Runs</Link>
        <Link href="/qa/bugs" className="qa-subnav-link">Bug Registry</Link>
        <Link href="/qa/bugs/new" className="qa-subnav-link">Report Bug</Link>
      </div>

      {error && <div className="qa-alert qa-alert-critical"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="qa-alert qa-alert-healthy"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      {/* KPIs */}
      <div className="qa-kpi-grid">
        <div className="qa-kpi">
          <div className="qa-kpi-icon" style={{ background: "#eff6ff", color: "#0755e9" }}><FileText size={16} /></div>
          <div><span className="qa-kpi-label">Total Test Runs</span><span className="qa-kpi-val">{summaryStats.totalRuns}</span></div>
        </div>
        <div className="qa-kpi">
          <div className="qa-kpi-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}><Clock size={16} /></div>
          <div><span className="qa-kpi-label">In Progress</span><span className="qa-kpi-val">{summaryStats.active}</span></div>
        </div>
        <div className="qa-kpi">
          <div className="qa-kpi-icon" style={{ background: "#ecfdf5", color: "#047857" }}><CheckCircle2 size={16} /></div>
          <div><span className="qa-kpi-label">Completed</span><span className="qa-kpi-val">{summaryStats.completed}</span></div>
        </div>
        <div className="qa-kpi">
          <div className="qa-kpi-icon" style={{ background: "#ecfdf5", color: "#079b62" }}><Play size={16} /></div>
          <div><span className="qa-kpi-label">Avg Pass Rate</span><span className="qa-kpi-val">{summaryStats.passRate}%</span></div>
        </div>
      </div>

      {/* Status tabs & Filter Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="qa-seg">
          {RUN_STATUS_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`qa-seg-btn ${statusTab === t.key ? "active" : ""}`}
              onClick={() => setStatusTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="qa-filter-bar">
        <div className="qa-search-wrap">
          <Search size={13} className="qa-search-icon" />
          <input
            className="qa-input"
            placeholder="Search by run code, title, project, or release..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="qa-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="ALL">All Projects</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>{p.projectName}</option>
          ))}
        </select>
        <select className="qa-select" value={envFilter} onChange={(e) => setEnvFilter(e.target.value)}>
          <option value="ALL">All Environments</option>
          {ENVIRONMENTS.map((env) => (
            <option key={env} value={env}>{env}</option>
          ))}
        </select>
      </div>

      {/* Runs Table */}
      <div className="qa-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="qa-table-wrap">
          <table className="qa-table">
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Run Title</th>
                <th>Project</th>
                <th>Release / Env</th>
                <th>Progress</th>
                <th>Pass / Fail / Blk</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="qa-empty">Loading test runs...</td></tr>
              ) : filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="qa-empty">
                    No test runs found. Click <strong>New Test Run</strong> to create your first execution cycle.
                  </td>
                </tr>
              ) : (
                filteredRuns.map((run) => {
                  const total = run.totalTests || run.results?.length || 0;
                  const exec = run.executedCount || 0;
                  const pct = total > 0 ? Math.round((exec / total) * 100) : 0;
                  return (
                    <tr key={run._id}>
                      <td style={{ fontWeight: 700, color: "#0755e9", whiteSpace: "nowrap" }}>
                        {run.runCode}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => openExecution(run)}
                          style={{
                            border: 0,
                            background: "transparent",
                            padding: 0,
                            textAlign: "left",
                            fontWeight: 600,
                            color: "#10204a",
                            cursor: "pointer",
                          }}
                        >
                          {run.title}
                        </button>
                      </td>
                      <td>{run.projectName || "—"}</td>
                      <td>
                        <span className="qa-badge qa-badge-slate" style={{ marginRight: 4 }}>
                          {run.releaseVersion || "v1.0"}
                        </span>
                        <span className="qa-badge qa-badge-purple">{run.environment || "QA"}</span>
                      </td>
                      <td style={{ minWidth: 120 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div className="qa-bar-track" style={{ flex: 1 }}>
                            <div className="qa-bar-fill" style={{ width: `${pct}%`, background: pct === 100 ? "#079b62" : "#0755e9" }} />
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 600 }}>{exec}/{total}</span>
                        </div>
                      </td>
                      <td style={{ whiteSpace: "nowrap", fontSize: 10.5, fontWeight: 600 }}>
                        <span style={{ color: "#047857" }}>{run.passed || 0}P</span>{" / "}
                        <span style={{ color: "#dc2626" }}>{run.failed || 0}F</span>{" / "}
                        <span style={{ color: "#b45309" }}>{run.blocked || 0}B</span>
                      </td>
                      <td>
                        <span className={statusBadgeClass(run.status)}>
                          {run.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td style={{ whiteSpace: "nowrap", color: "#64748b" }}>
                        {formatShortDate(run.createdAt)}
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", gap: 5 }}>
                          <button
                            type="button"
                            className="qa-btn qa-btn-primary qa-btn-sm"
                            onClick={() => openExecution(run)}
                          >
                            <Play size={11} /> Execute
                          </button>
                          <button
                            type="button"
                            className="qa-btn qa-btn-danger qa-btn-sm"
                            onClick={() => handleDeleteRun(run)}
                            title="Delete Run"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
