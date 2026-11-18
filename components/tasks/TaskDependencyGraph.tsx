"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  ChevronRight,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Trash2,
  Check,
  Filter,
} from "lucide-react";
import { projects as getProjectsApi } from "../../lib/api";
import { sprintApi, type Sprint } from "../../lib/sprints/api";
import { taskApi, type NormalizedTask } from "../../lib/tasks/api";
import "./task-dependency.css";

type TabKey = "overview" | "graph" | "critical" | "blocked";

function statusTone(status: string) {
  const key = status.toLowerCase().replace(/\s+/g, "-");
  if (key === "done") return "done";
  if (key === "in-progress") return "in-progress";
  if (key === "in-review") return "in-review";
  if (key === "testing") return "testing";
  return "to-do";
}

export default function TaskDependencyGraph() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("overview");
  const [tasks, setTasks] = useState<NormalizedTask[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [depTypeFilter, setDepTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sprintFilter, setSprintFilter] = useState("All");
  const [zoom, setZoom] = useState(1);

  // Add Dependency 3-Step Modal (Matches TSK-007 Panels 2, 3, 4)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1);
  const [dependentTaskId, setDependentTaskId] = useState("");
  const [predecessorTaskId, setPredecessorTaskId] = useState("");
  const [depType, setDepType] = useState("Finish to Start (FS)");
  const [lagDays, setLagDays] = useState("0");
  const [impact, setImpact] = useState("Medium");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [selectedTask, setSelectedTask] = useState<NormalizedTask | null>(null);
  const [toast, setToast] = useState("");

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    Promise.allSettled([
      taskApi.list({ limit: 100 }),
      getProjectsApi({ limit: 100 }).catch(() => []),
      sprintApi.list({ limit: 100 }).catch(() => ({ items: [], total: 0 })),
    ])
      .then(([tRes, pRes, sRes]) => {
        if (tRes.status === "fulfilled") {
          const list = tRes.value.items || [];
          setTasks(list);
          if (list.length >= 2) {
            setDependentTaskId(list[1]._id);
            setPredecessorTaskId(list[0]._id);
          } else if (list.length === 1) {
            setDependentTaskId(list[0]._id);
          }
        }
        if (pRes.status === "fulfilled") {
          const raw: any = pRes.value;
          setProjects(Array.isArray(raw) ? raw : raw?.data || raw?.items || []);
        }
        if (sRes.status === "fulfilled") {
          setSprints(sRes.value.items || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Build reverse lookup: which tasks does each task block?
  const blocksMap = useMemo(() => {
    const map = new Map<string, string[]>();
    tasks.forEach((t) => {
      t.blockedBy.forEach((entry) => {
        const predCode = entry.split(" - ")[0].trim();
        if (!map.has(predCode)) map.set(predCode, []);
        map.get(predCode)!.push(t.taskId);
      });
    });
    return map;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const term = search.toLowerCase().trim();
    return tasks.filter((t) => {
      const matchesSearch =
        !term ||
        t.taskId.toLowerCase().includes(term) ||
        t.title.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "All" || t.status === statusFilter;
      const matchesSprint = sprintFilter === "All" || t.sprintId === sprintFilter;
      const matchesDepType =
        depTypeFilter === "All" ||
        t.dependencies.some((d) => d.toLowerCase().includes(depTypeFilter.toLowerCase()));
      return matchesSearch && matchesStatus && matchesSprint && matchesDepType;
    });
  }, [tasks, search, statusFilter, sprintFilter, depTypeFilter]);

  const totalTasks = tasks.length;
  const withDeps = tasks.filter(
    (t) => t.blockedBy.length > 0 || (blocksMap.get(t.taskId)?.length || 0) > 0
  ).length;
  const dependentOnOthers = tasks.filter((t) => t.blockedBy.length > 0).length;
  const blockingOthers = tasks.filter((t) => (blocksMap.get(t.taskId)?.length || 0) > 0).length;
  const blockedTasks = tasks.filter((t) => t.status !== "Done" && (t.blockedBy.length > 0 || t.rawStatus === "BLOCKED"));
  const criticalTasks = tasks.filter(
    (t) =>
      t.status !== "Done" &&
      (t.priority === "Critical" || t.priority === "High" || (blocksMap.get(t.taskId)?.length || 0) > 0)
  );

  const withDepsPct = totalTasks > 0 ? `${((withDeps / totalTasks) * 100).toFixed(1)}%` : "0%";

  const openAddModal = () => {
    setModalStep(1);
    setModalOpen(true);
  };

  const handleCreateDependency = async () => {
    const depTask = tasks.find((t) => t._id === dependentTaskId);
    const predTask = tasks.find((t) => t._id === predecessorTaskId);
    if (!depTask || !predTask || depTask._id === predTask._id) {
      notify("Please select two different tasks.");
      return;
    }

    const predLabel = `${predTask.taskId} - ${predTask.title}`;
    try {
      setSaving(true);
      const nextBlocked = Array.from(new Set([...depTask.blockedBy, predLabel]));
      const nextDeps = Array.from(new Set([...depTask.dependencies, depType]));
      const updated = await taskApi.update(depTask._id, {
        blockedBy: nextBlocked,
        dependencies: nextDeps,
      });
      setTasks((prev) => prev.map((t) => (t._id === depTask._id ? updated : t)));
      setModalOpen(false);
      notify(`Dependency linked: ${predTask.taskId} → ${depTask.taskId}`);
    } catch (err: any) {
      notify(`Could not create dependency: ${err?.message || "API error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDependency = async (task: NormalizedTask, blockerEntry: string) => {
    try {
      const nextBlocked = task.blockedBy.filter((b) => b !== blockerEntry);
      const updated = await taskApi.update(task._id, { blockedBy: nextBlocked });
      setTasks((prev) => prev.map((t) => (t._id === task._id ? updated : t)));
      notify(`Dependency removed from ${task.taskId}.`);
    } catch (err: any) {
      notify(`Failed to remove dependency: ${err?.message || "API error"}`);
    }
  };

  // Graph stages (Light canvas matching TSK-007 Panel 5)
  const stage1 = filteredTasks.filter((t) => t.blockedBy.length === 0 && (blocksMap.get(t.taskId)?.length || 0) > 0);
  const stage1Fallback = stage1.length > 0 ? stage1 : filteredTasks.filter((t) => t.blockedBy.length === 0).slice(0, 4);
  const stage2 = filteredTasks.filter((t) => t.blockedBy.length > 0 && (blocksMap.get(t.taskId)?.length || 0) > 0);
  const stage3 = filteredTasks.filter((t) => t.blockedBy.length > 0 && (blocksMap.get(t.taskId)?.length || 0) === 0);

  const depTaskObj = tasks.find((t) => t._id === dependentTaskId);
  const predTaskObj = tasks.find((t) => t._id === predecessorTaskId);

  return (
    <main className="td-page">
      <div className="td-breadcrumb">
        <span onClick={() => router.push("/projects")}>Projects</span>
        <ChevronRight size={12} />
        <span onClick={() => router.push("/tasks")}>Tasks / Kanban</span>
        <ChevronRight size={12} />
        <b>Task Dependency</b>
      </div>

      <header className="td-header">
        <h1>Task Dependency</h1>
        <button className="td-btn td-btn-primary" onClick={openAddModal}>
          <Plus size={13} /> Add Dependency
        </button>
      </header>

      {/* Tabs Bar (Matches TSK-007.png) */}
      <div className="td-tabs-bar">
        <nav className="td-tabs">
          <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>
            Overview
          </button>
          <button className={tab === "graph" ? "active" : ""} onClick={() => setTab("graph")}>
            Graph View
          </button>
          <button className={tab === "critical" ? "active" : ""} onClick={() => setTab("critical")}>
            Critical Path
          </button>
          <button className={tab === "blocked" ? "active" : ""} onClick={() => setTab("blocked")}>
            Blocked Tasks ({blockedTasks.length})
          </button>
        </nav>
        <button
          className="td-btn"
          style={{ height: "28px", fontSize: "11px" }}
          onClick={() => { setSearch(""); setStatusFilter("All"); setSprintFilter("All"); setDepTypeFilter("All"); }}
        >
          <Filter size={12} /> Reset Filters
        </button>
      </div>

      {/* 6-KPI Summary Strip */}
      <section className="td-kpi-strip">
        <div className="td-kpi">
          <span>Total Tasks</span>
          <strong>{totalTasks}</strong>
        </div>
        <div className="td-kpi">
          <span>With Dependencies</span>
          <strong className="teal">{withDeps}</strong>
          <small>({withDepsPct})</small>
        </div>
        <div className="td-kpi">
          <span>Dependent On Others</span>
          <strong>{dependentOnOthers}</strong>
        </div>
        <div className="td-kpi">
          <span>Blocking Others</span>
          <strong className="amber">{blockingOthers}</strong>
        </div>
        <div className="td-kpi">
          <span>Blocked Tasks</span>
          <strong className="red">{blockedTasks.length}</strong>
        </div>
        <div className="td-kpi">
          <span>Critical Path Tasks</span>
          <strong className="red">{criticalTasks.length}</strong>
        </div>
      </section>

      {/* TAB 1: OVERVIEW TABLE */}
      {tab === "overview" && (
        <section className="td-card">
          <div className="td-filterbar">
            <label className="td-search">
              <Search size={13} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search task by ID or title..."
              />
            </label>
            <select value={depTypeFilter} onChange={(e) => setDepTypeFilter(e.target.value)}>
              <option value="All">Dependency Type (All)</option>
              <option value="Finish to Start">Finish to Start (FS)</option>
              <option value="Start to Start">Start to Start (SS)</option>
              <option value="Finish to Finish">Finish to Finish (FF)</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">Status (All)</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="In Review">In Review</option>
              <option value="Testing">Testing</option>
              <option value="Done">Done</option>
            </select>
            <select value={sprintFilter} onChange={(e) => setSprintFilter(e.target.value)}>
              <option value="All">Sprint (All)</option>
              {sprints.map((s) => (
                <option key={s._id || s.id} value={s._id || s.id}>{s.sprintCode} — {s.name}</option>
              ))}
            </select>
          </div>

          <div className="td-table-wrap">
            <table className="td-table">
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Task Title</th>
                  <th>Depends On</th>
                  <th>Blocks</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Impact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>Loading task dependencies...</td></tr>
                ) : filteredTasks.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>No tasks found.</td></tr>
                ) : (
                  filteredTasks.map((t) => {
                    const blocks = blocksMap.get(t.taskId) || [];
                    const dependsOnCodes = t.blockedBy.map((b) => b.split(" - ")[0].trim());
                    return (
                      <tr key={t._id}>
                        <td><span className="td-link" onClick={() => setSelectedTask(t)}>{t.taskId}</span></td>
                        <td style={{ fontWeight: 500, color: "#0f172a" }}>{t.title}</td>
                        <td>
                          {dependsOnCodes.length > 0 ? (
                            <span className="td-link">{dependsOnCodes.join(", ")}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          {blocks.length > 0 ? (
                            <span className="td-link">{blocks.join(", ")}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{t.dependencies[0] || "Finish to Start (FS)"}</td>
                        <td>
                          <span className={`td-pill ${statusTone(t.status)}`}>{t.status}</span>
                        </td>
                        <td>
                          <span className={`td-impact ${t.priority.toLowerCase()}`}>{t.priority}</span>
                        </td>
                        <td>
                          {t.blockedBy.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveDependency(t, t.blockedBy[0])}
                              style={{ border: 0, background: "transparent", color: "#dc2626", cursor: "pointer" }}
                              title="Remove dependency"
                            >
                              <Trash2 size={13} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setDependentTaskId(t._id); openAddModal(); }}
                              style={{ border: 0, background: "transparent", color: "#0755e9", cursor: "pointer", fontSize: "11px", fontWeight: 600 }}
                            >
                              + Link
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 2: LIGHT GRAPH VIEW (Exact TSK-007 Panel 5) */}
      {tab === "graph" && (
        <section className="td-card">
          <div className="td-graph-toolbar">
            <div className="td-graph-controls">
              <button className="td-btn" style={{ height: "28px" }} onClick={() => setZoom((z) => Math.min(1.25, z + 0.1))}>
                <ZoomIn size={13} /> Zoom In
              </button>
              <button className="td-btn" style={{ height: "28px" }} onClick={() => setZoom((z) => Math.max(0.75, z - 0.1))}>
                <ZoomOut size={13} /> Zoom Out
              </button>
              <button className="td-btn" style={{ height: "28px" }} onClick={() => setZoom(1)}>
                <Maximize2 size={13} /> Fit
              </button>
            </div>
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
              Layout: Left to Right ({filteredTasks.length} tasks)
            </span>
          </div>

          <div className="td-graph-canvas">
            {filteredTasks.length === 0 ? (
              <p style={{ textAlign: "center", color: "#64748b", padding: "40px 0" }}>
                No tasks available to visualize. Create tasks and link dependencies.
              </p>
            ) : (
              <div className="td-graph-stages" style={{ transform: `scale(${zoom})` }}>
                <div className="td-graph-col">
                  <span className="td-graph-col-label">Predecessors / Independent</span>
                  {stage1Fallback.map((t) => (
                    <div
                      key={t._id}
                      className={`td-node ${statusTone(t.status)}`}
                      onClick={() => setSelectedTask(t)}
                    >
                      <span className="td-node-id">{t.taskId}</span>
                      <span className="td-node-title">{t.title}</span>
                      <div className="td-node-foot">
                        <span className={`td-pill ${statusTone(t.status)}`}>{t.status}</span>
                        <span style={{ fontSize: "10px", color: "#64748b" }}>{t.estimatedHours}h</span>
                      </div>
                    </div>
                  ))}
                </div>

                <ArrowRight size={22} color="#94a3b8" />

                <div className="td-graph-col">
                  <span className="td-graph-col-label">Intermediate / Blocking</span>
                  {stage2.length === 0 ? (
                    <div className="td-node" style={{ borderStyle: "dashed", color: "#94a3b8", textAlign: "center" }}>
                      No chained mid-stage tasks
                    </div>
                  ) : (
                    stage2.map((t) => (
                      <div
                        key={t._id}
                        className={`td-node ${statusTone(t.status)}`}
                        onClick={() => setSelectedTask(t)}
                      >
                        <span className="td-node-id">{t.taskId}</span>
                        <span className="td-node-title">{t.title}</span>
                        <div className="td-node-foot">
                          <span className={`td-pill ${statusTone(t.status)}`}>{t.status}</span>
                          <span style={{ fontSize: "10px", color: "#dc2626" }}>Blocked by {t.blockedBy.length}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <ArrowRight size={22} color="#94a3b8" />

                <div className="td-graph-col">
                  <span className="td-graph-col-label">Downstream Dependent</span>
                  {stage3.length === 0 ? (
                    <div className="td-node" style={{ borderStyle: "dashed", color: "#94a3b8", textAlign: "center" }}>
                      Click &quot;+ Add Dependency&quot; to link tasks
                    </div>
                  ) : (
                    stage3.map((t) => (
                      <div
                        key={t._id}
                        className={`td-node ${t.status !== "Done" ? "blocked" : "done"}`}
                        onClick={() => setSelectedTask(t)}
                      >
                        <span className="td-node-id">{t.taskId}</span>
                        <span className="td-node-title">{t.title}</span>
                        <div className="td-node-foot">
                          <span className={`td-pill ${statusTone(t.status)}`}>{t.status}</span>
                          <span style={{ fontSize: "10px", color: "#64748b" }}>← {t.blockedBy[0]?.split(" - ")[0]}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="td-graph-legend">
            <b>Legend:</b>
            <span><i className="td-dot done" /> Done</span>
            <span><i className="td-dot in-progress" /> In Progress</span>
            <span><i className="td-dot in-review" /> In Review</span>
            <span><i className="td-dot testing" /> Testing</span>
            <span><i className="td-dot to-do" /> To Do</span>
            <span><i className="td-dot blocked" /> Blocked</span>
          </div>
        </section>
      )}

      {/* TAB 3: CRITICAL PATH */}
      {tab === "critical" && (
        <section className="td-card">
          <div className="td-table-wrap">
            <table className="td-table">
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Task Title</th>
                  <th>Project</th>
                  <th>Est. Effort</th>
                  <th>Downstream Blocks</th>
                  <th>Status</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {criticalTasks.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>No open critical-path tasks detected.</td></tr>
                ) : (
                  criticalTasks.map((t) => (
                    <tr key={t._id}>
                      <td><span className="td-link">{t.taskId}</span></td>
                      <td style={{ fontWeight: 600 }}>{t.title}</td>
                      <td>{t.projectName}</td>
                      <td>{t.estimatedHours}h</td>
                      <td>{(blocksMap.get(t.taskId) || []).join(", ") || "None"}</td>
                      <td><span className={`td-pill ${statusTone(t.status)}`}>{t.status}</span></td>
                      <td><span className={`td-impact ${t.priority.toLowerCase()}`}>{t.priority}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 4: BLOCKED TASKS (Exact TSK-007 Panel 6) */}
      {tab === "blocked" && (
        <>
          <div className="td-alert-banner">
            <AlertCircle size={18} />
            <div>
              <strong>
                {blockedTasks.length} {blockedTasks.length === 1 ? "task is" : "tasks are"} currently blocked
              </strong>
              <small>Resolve the blocking dependencies to unblock and start these tasks.</small>
            </div>
          </div>

          <section className="td-card">
            <div className="td-table-wrap">
              <table className="td-table">
                <thead>
                  <tr>
                    <th>Task ID</th>
                    <th>Task Title</th>
                    <th>Blocked By</th>
                    <th>Task Status</th>
                    <th>Due Date</th>
                    <th>Impact</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {blockedTasks.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>Zero blocked tasks! All work items are clear.</td></tr>
                  ) : (
                    blockedTasks.map((t) => (
                      <tr key={t._id}>
                        <td><span className="td-link">{t.taskId}</span></td>
                        <td style={{ fontWeight: 500 }}>{t.title}</td>
                        <td><span className="td-link">{t.blockedBy.map((b) => b.split(" - ")[0]).join(", ") || "Flagged Blocked"}</span></td>
                        <td><span className={`td-pill ${statusTone(t.status)}`}>{t.status}</span></td>
                        <td>{t.dueDateLabel}</td>
                        <td><span className={`td-impact ${t.priority.toLowerCase()}`}>{t.priority}</span></td>
                        <td>
                          <button
                            className="td-btn"
                            style={{ height: "25px", padding: "0 10px", fontSize: "10.5px" }}
                            onClick={() => setSelectedTask(t)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* 3-Step Add Dependency Modal (Exact TSK-007 Panels 2, 3, 4) */}
      {modalOpen && (
        <div className="td-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="td-modal" onClick={(e) => e.stopPropagation()}>
            <div className="td-modal-head">
              <h2>Add Task Dependency</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ border: 0, background: "transparent", cursor: "pointer", color: "#64748b" }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="td-modal-steps">
              {[
                { num: 1 as const, label: "Select Tasks" },
                { num: 2 as const, label: "Dependency Type" },
                { num: 3 as const, label: "Review" },
              ].map((s) => (
                <div
                  key={s.num}
                  className={`td-modal-step ${modalStep === s.num ? "active" : modalStep > s.num ? "done" : ""}`}
                >
                  <span>{modalStep > s.num ? <Check size={11} /> : s.num}</span>
                  <b>{s.label}</b>
                </div>
              ))}
            </div>

            <div className="td-modal-body">
              {modalStep === 1 && (
                <>
                  <label className="td-modal-field">
                    <span>This Task (Dependent Task) *</span>
                    <select value={dependentTaskId} onChange={(e) => setDependentTaskId(e.target.value)}>
                      <option value="">Select dependent task...</option>
                      {tasks.map((t) => (
                        <option key={t._id} value={t._id}>{t.taskId} - {t.title}</option>
                      ))}
                    </select>
                  </label>

                  <label className="td-modal-field">
                    <span>Depends On (Predecessor Task) *</span>
                    <select value={predecessorTaskId} onChange={(e) => setPredecessorTaskId(e.target.value)}>
                      <option value="">Select predecessor task...</option>
                      {tasks
                        .filter((t) => t._id !== dependentTaskId)
                        .map((t) => (
                          <option key={t._id} value={t._id}>{t.taskId} - {t.title}</option>
                        ))}
                    </select>
                  </label>

                  {predTaskObj && depTaskObj && (
                    <div className="td-preview-box">
                      <div className="td-preview-node">
                        <span className="td-node-id">{predTaskObj.taskId}</span>
                        <span className="td-node-title" style={{ marginBottom: 4 }}>{predTaskObj.title}</span>
                        <span className={`td-pill ${statusTone(predTaskObj.status)}`}>{predTaskObj.status}</span>
                      </div>
                      <div className="td-preview-arrow">
                        <div>{depType}</div>
                        <ArrowRight size={18} color="#0755e9" style={{ margin: "4px auto 0" }} />
                      </div>
                      <div className="td-preview-node">
                        <span className="td-node-id">{depTaskObj.taskId}</span>
                        <span className="td-node-title" style={{ marginBottom: 4 }}>{depTaskObj.title}</span>
                        <span className={`td-pill ${statusTone(depTaskObj.status)}`}>{depTaskObj.status}</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {modalStep === 2 && (
                <>
                  <label className="td-modal-field">
                    <span>Dependency Type *</span>
                    <select value={depType} onChange={(e) => setDepType(e.target.value)}>
                      <option>Finish to Start (FS)</option>
                      <option>Start to Start (SS)</option>
                      <option>Finish to Finish (FF)</option>
                    </select>
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <label className="td-modal-field">
                      <span>Lead / Lag Buffer (Days)</span>
                      <input type="number" value={lagDays} onChange={(e) => setLagDays(e.target.value)} />
                    </label>
                    <label className="td-modal-field">
                      <span>Impact / Severity</span>
                      <select value={impact} onChange={(e) => setImpact(e.target.value)}>
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </label>
                  </div>
                  <label className="td-modal-field">
                    <span>Note (Optional)</span>
                    <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Describe why this dependency is required..." />
                  </label>
                </>
              )}

              {modalStep === 3 && predTaskObj && depTaskObj && (
                <>
                  <div className="td-preview-box">
                    <div className="td-preview-node">
                      <small style={{ color: "#64748b", display: "block", marginBottom: 2 }}>Predecessor (Upstream)</small>
                      <span className="td-node-id">{predTaskObj.taskId}</span>
                      <span className="td-node-title" style={{ marginBottom: 0 }}>{predTaskObj.title}</span>
                    </div>
                    <div className="td-preview-arrow">
                      <div>{depType}</div>
                      <ArrowRight size={18} color="#0755e9" style={{ margin: "4px auto" }} />
                      <small>{lagDays} Days Buffer</small>
                    </div>
                    <div className="td-preview-node">
                      <small style={{ color: "#64748b", display: "block", marginBottom: 2 }}>Successor (Dependent)</small>
                      <span className="td-node-id">{depTaskObj.taskId}</span>
                      <span className="td-node-title" style={{ marginBottom: 0 }}>{depTaskObj.title}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#334155", display: "grid", gap: "5px" }}>
                    <div><span style={{ color: "#64748b" }}>Impact:</span> <strong>{impact}</strong></div>
                    {note && <div><span style={{ color: "#64748b" }}>Note:</span> {note}</div>}
                  </div>
                </>
              )}
            </div>

            <div className="td-modal-foot">
              {modalStep > 1 ? (
                <button className="td-btn" onClick={() => setModalStep((s) => (s - 1) as 1 | 2 | 3)}>Back</button>
              ) : (
                <button className="td-btn" onClick={() => setModalOpen(false)}>Cancel</button>
              )}
              {modalStep < 3 ? (
                <button
                  className="td-btn td-btn-primary"
                  disabled={!dependentTaskId || !predecessorTaskId || dependentTaskId === predecessorTaskId}
                  onClick={() => setModalStep((s) => (s + 1) as 1 | 2 | 3)}
                >
                  Next
                </button>
              ) : (
                <button className="td-btn td-btn-success" disabled={saving} onClick={handleCreateDependency}>
                  {saving ? "Saving..." : "Create Dependency"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected Task Quick Detail Modal */}
      {selectedTask && (
        <div className="td-modal-backdrop" onClick={() => setSelectedTask(null)}>
          <div className="td-modal" onClick={(e) => e.stopPropagation()}>
            <div className="td-modal-head">
              <h2>{selectedTask.taskId} — {selectedTask.title}</h2>
              <button onClick={() => setSelectedTask(null)} style={{ border: 0, background: "transparent", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>
            <div className="td-modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11.5px" }}>
                <div><span style={{ color: "#64748b" }}>Project:</span> <b>{selectedTask.projectName}</b></div>
                <div><span style={{ color: "#64748b" }}>Sprint:</span> <b>{selectedTask.sprintName}</b></div>
                <div><span style={{ color: "#64748b" }}>Status:</span> <span className={`td-pill ${statusTone(selectedTask.status)}`}>{selectedTask.status}</span></div>
                <div><span style={{ color: "#64748b" }}>Assignee:</span> <b>{selectedTask.assignee}</b></div>
              </div>
              <div>
                <strong style={{ display: "block", fontSize: "11.5px", marginBottom: "6px" }}>
                  This task depends on ({selectedTask.blockedBy.length})
                </strong>
                {selectedTask.blockedBy.length === 0 ? (
                  <p style={{ margin: 0, color: "#64748b", fontSize: "11px" }}>No upstream dependencies.</p>
                ) : (
                  selectedTask.blockedBy.map((b) => (
                    <div key={b} style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", background: "#f8fafd", borderRadius: "5px", marginBottom: "4px" }}>
                      <span>{b}</span>
                      <button
                        onClick={() => handleRemoveDependency(selectedTask, b)}
                        style={{ border: 0, background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: "11px" }}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="td-modal-foot">
              <button className="td-btn" onClick={() => setSelectedTask(null)}>Close</button>
              <button
                className="td-btn td-btn-primary"
                onClick={() => { setDependentTaskId(selectedTask._id); setSelectedTask(null); openAddModal(); }}
              >
                + Add Dependency
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="td-toast">
          <CheckCircle2 size={14} color="#34d399" />
          <span>{toast}</span>
        </div>
      )}
    </main>
  );
}
