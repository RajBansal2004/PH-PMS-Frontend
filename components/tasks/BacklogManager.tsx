"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Download,
  Filter,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Flag,
  CheckCircle2,
  Clock3,
  Ban,
  Layers,
  X,
  MoreVertical,
  FileText,
} from "lucide-react";
import { projects as getProjectsApi } from "../../lib/api";
import { sprintApi, type Sprint } from "../../lib/sprints/api";
import { taskApi, type NormalizedTask } from "../../lib/tasks/api";
import "./backlog-manager.css";

function backlogStatusInfo(t: NormalizedTask): { label: string; tone: string } {
  if (t.rawStatus === "BLOCKED" || t.blockedBy.length > 0) return { label: "Blocked", tone: "blocked" };
  if (t.status === "Done") return { label: "Done", tone: "done" };
  if (t.estimatedHours === 0) return { label: "Needs Estimation", tone: "estimation" };
  if (t.sprintId && t.rawStatus !== "BACKLOG") return { label: "Ready", tone: "ready" };
  if (t.status === "In Progress" || t.status === "In Review") return { label: "In Refinement", tone: "refinement" };
  return { label: "To Do", tone: "todo" };
}

export default function BacklogManager() {
  const router = useRouter();
  const [tasks, setTasks] = useState<NormalizedTask[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [drawerTab, setDrawerTab] = useState<"details" | "description" | "ac" | "activity">("details");
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [toast, setToast] = useState("");

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [tRes, sRes, pRes, peopleRes] = await Promise.allSettled([
        taskApi.list({ limit: 100 }),
        sprintApi.list({ limit: 100 }),
        getProjectsApi({ limit: 100 }),
        taskApi.getPersonnel(),
      ]);

      if (tRes.status === "fulfilled") {
        const list = tRes.value.items || [];
        setTasks(list);
        if (list.length > 0) {
          setSelectedId((prev) => (prev && list.some((t) => t._id === prev) ? prev : list[0]._id));
        }
      }
      if (sRes.status === "fulfilled") {
        setSprints(sRes.value.items || []);
      }
      if (pRes.status === "fulfilled") {
        const raw: any = pRes.value;
        setProjects(Array.isArray(raw) ? raw : raw?.data || raw?.items || []);
      }
      if (peopleRes.status === "fulfilled") {
        setPersonnel((peopleRes.value || []).map((p) => p.name));
      }
    } catch (err: any) {
      notify(`Failed to load backlog: ${err?.message || "Server error"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTasks = useMemo(() => {
    const term = search.toLowerCase().trim();
    return tasks.filter((t) => {
      const st = backlogStatusInfo(t).label;
      const matchesSearch =
        !term ||
        t.taskId.toLowerCase().includes(term) ||
        t.title.toLowerCase().includes(term) ||
        t.assignee.toLowerCase().includes(term) ||
        t.category.toLowerCase().includes(term);
      return (
        matchesSearch &&
        (projectFilter === "All" || t.projectId === projectFilter) &&
        (typeFilter === "All" || t.type.toLowerCase() === typeFilter.toLowerCase()) &&
        (priorityFilter === "All" || t.priority === priorityFilter) &&
        (statusFilter === "All" || st === statusFilter) &&
        (assigneeFilter === "All" || t.assignee === assigneeFilter)
      );
    });
  }, [tasks, search, projectFilter, typeFilter, priorityFilter, statusFilter, assigneeFilter]);

  const totalItems = tasks.length;
  const totalSP = tasks.reduce((s, t) => s + (t.storyPoints || 0), 0);
  const totalHours = tasks.reduce((s, t) => s + (t.estimatedHours || 0), 0);
  const highPriorityCount = tasks.filter((t) => t.priority === "High" || t.priority === "Critical").length;
  const readyCount = tasks.filter((t) => backlogStatusInfo(t).label === "Ready").length;
  const blockedCount = tasks.filter((t) => backlogStatusInfo(t).label === "Blocked").length;
  const needsEstCount = tasks.filter((t) => t.estimatedHours === 0).length;

  const pageCount = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleRows = filteredTasks.slice((safePage - 1) * pageSize, safePage * pageSize);

  const selectedTask = tasks.find((t) => t._id === selectedId) || null;

  const moveTaskToSprint = async (task: NormalizedTask, targetSprintId: string | null) => {
    setShowMoveMenu(false);
    try {
      const updated = await taskApi.update(task._id, {
        sprintId: targetSprintId,
        status: targetSprintId ? "SELECTED" : "BACKLOG",
      });
      setTasks((prev) => prev.map((t) => (t._id === task._id ? updated : t)));
      notify(
        targetSprintId
          ? `Moved ${task.taskId} to sprint.`
          : `Returned ${task.taskId} to Product Backlog.`
      );
    } catch (err: any) {
      notify(`Failed to move task: ${err?.message || "API error"}`);
    }
  };

  const addQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    const projId = projectFilter !== "All" ? projectFilter : projects[0]?._id || projects[0]?.id;
    if (!projId) {
      notify("Create a project first before adding backlog items.");
      return;
    }
    try {
      const { nextCode } = await taskApi.getNextCode();
      const created = await taskApi.create({
        taskId: nextCode,
        title: quickTitle.trim(),
        projectId: projId,
        status: "BACKLOG",
        priority: "MEDIUM",
        estimatedHours: 8,
        storyPoints: 2,
      });
      setQuickTitle("");
      setShowQuickAdd(false);
      setTasks((prev) => [created, ...prev]);
      setSelectedId(created._id);
      notify(`${nextCode} created in Backlog.`);
    } catch (err: any) {
      notify(`Failed to add task: ${err?.message || "API error"}`);
    }
  };

  const exportCsv = () => {
    const headers = ["ID", "Title", "Type", "Category", "Priority", "SP", "Est. Hours", "Status", "Assignee", "Sprint"];
    const rows = filteredTasks.map((t) => [
      t.taskId, t.title, t.type, t.category, t.priority, t.storyPoints, `${t.estimatedHours}h`, backlogStatusInfo(t).label, t.assignee, t.sprintName,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "product-backlog.csv";
    a.click();
    URL.revokeObjectURL(url);
    notify("Backlog exported as CSV.");
  };

  const projectLabel =
    projectFilter !== "All"
      ? projects.find((p) => (p._id || p.id) === projectFilter)?.projectName || "Project"
      : "All Projects";

  return (
    <main className="bm-page">
      {/* Top Bar (Matches TSK-005.png) */}
      <div className="bm-topbar">
        <div className="bm-title-group">
          <div className="bm-breadcrumb">
            <span onClick={() => router.push("/projects")}>Projects</span>
            <ChevronRight size={12} />
            <span>{projectLabel}</span>
            <ChevronRight size={12} />
            <b>Backlog</b>
          </div>
          <h1>Backlog</h1>
          <p>Manage and prioritize all user stories &amp; tasks before Sprint</p>
        </div>

        <div className="bm-actions">
          <button className="bm-btn" onClick={() => setShowQuickAdd((v) => !v)}>
            <Plus size={13} /> Quick Add
          </button>
          <button className="bm-btn" onClick={exportCsv}>
            <Download size={13} /> Export
          </button>
          <button className="bm-btn" onClick={() => router.push("/tasks/kanban")}>
            <Layers size={13} /> Kanban Board
          </button>
          <button className="bm-btn bm-btn-primary" onClick={() => router.push("/tasks/new")}>
            <Plus size={13} /> Create Story / Task
          </button>
        </div>
      </div>

      {/* 7-Metric KPI Strip (Exact TSK-005 layout) */}
      <section className="bm-kpi-strip">
        <div className="bm-kpi-item">
          <div className="bm-kpi-icon blue"><Layers size={15} /></div>
          <div className="bm-kpi-text">
            <span>Total Backlog Items</span>
            <strong>{totalItems}</strong>
            <small>All Stories &amp; Tasks</small>
          </div>
        </div>
        <div className="bm-kpi-item">
          <div className="bm-kpi-icon green"><CheckCircle2 size={15} /></div>
          <div className="bm-kpi-text">
            <span>Estimated Story Points</span>
            <strong>{totalSP} SP</strong>
          </div>
        </div>
        <div className="bm-kpi-item">
          <div className="bm-kpi-icon indigo"><Clock3 size={15} /></div>
          <div className="bm-kpi-text">
            <span>Estimated Hours</span>
            <strong>{totalHours} h</strong>
          </div>
        </div>
        <div className="bm-kpi-item">
          <div className="bm-kpi-icon red"><Flag size={15} /></div>
          <div className="bm-kpi-text">
            <span>High Priority</span>
            <strong>{highPriorityCount}</strong>
          </div>
        </div>
        <div className="bm-kpi-item">
          <div className="bm-kpi-icon emerald"><Flag size={15} /></div>
          <div className="bm-kpi-text">
            <span>Ready for Sprint</span>
            <strong>{readyCount}</strong>
          </div>
        </div>
        <div className="bm-kpi-item">
          <div className="bm-kpi-icon rose"><Ban size={15} /></div>
          <div className="bm-kpi-text">
            <span>Blocked</span>
            <strong>{blockedCount}</strong>
          </div>
        </div>
        <div className="bm-kpi-item">
          <div className="bm-kpi-icon amber"><Flag size={15} /></div>
          <div className="bm-kpi-text">
            <span>Needs Estimation</span>
            <strong>{needsEstCount}</strong>
          </div>
        </div>
      </section>

      {/* Main Content: Table + Right Details Panel */}
      <div className={`bm-content ${drawerOpen && selectedTask ? "has-drawer" : ""}`}>
        <section className="bm-card">
          {/* Inline Filter Bar */}
          <div className="bm-filterbar">
            <label className="bm-search">
              <Search size={13} />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by ID, title, keywords..."
              />
            </label>
            <select value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }}>
              <option value="All">Project (All)</option>
              {projects.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>{p.projectName || p.name}</option>
              ))}
            </select>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
              <option value="All">Type (All)</option>
              {["Development", "Design", "QA", "Documentation", "Bug", "Task"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}>
              <option value="All">Priority (All)</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="All">Status (All)</option>
              <option value="Ready">Ready</option>
              <option value="In Refinement">In Refinement</option>
              <option value="Needs Estimation">Needs Estimation</option>
              <option value="Blocked">Blocked</option>
              <option value="To Do">To Do</option>
              <option value="Done">Done</option>
            </select>
            <select value={assigneeFilter} onChange={(e) => { setAssigneeFilter(e.target.value); setPage(1); }}>
              <option value="All">Assignee (All)</option>
              {personnel.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button
              className="bm-btn"
              style={{ height: "30px", padding: "0 10px" }}
              onClick={() => {
                setSearch("");
                setProjectFilter("All");
                setTypeFilter("All");
                setPriorityFilter("All");
                setStatusFilter("All");
                setAssigneeFilter("All");
              }}
            >
              <Filter size={12} /> Reset
            </button>
          </div>

          {showQuickAdd && (
            <form className="bm-quick-bar" onSubmit={addQuickTask}>
              <input
                autoFocus
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Type backlog story/task title and press Enter..."
              />
              <button type="submit" className="bm-btn bm-btn-primary">Add Item</button>
              <button type="button" className="bm-btn" onClick={() => setShowQuickAdd(false)}>Cancel</button>
            </form>
          )}

          {/* Table */}
          <div className="bm-table-wrap">
            <table className="bm-table">
              <thead>
                <tr>
                  <th style={{ width: "30px" }}>
                    <input
                      type="checkbox"
                      checked={visibleRows.length > 0 && visibleRows.every((r) => selectedIds.includes(r._id))}
                      onChange={(e) =>
                        setSelectedIds(e.target.checked ? visibleRows.map((r) => r._id) : [])
                      }
                    />
                  </th>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Category / Feature</th>
                  <th>Priority</th>
                  <th>SP</th>
                  <th>Est. Hours</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Created On</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={12} style={{ textAlign: "center", padding: "28px", color: "#64748b" }}>Loading backlog items...</td></tr>
                ) : visibleRows.length === 0 ? (
                  <tr><td colSpan={12} style={{ textAlign: "center", padding: "28px", color: "#64748b" }}>No backlog items match your filters.</td></tr>
                ) : (
                  visibleRows.map((t) => {
                    const st = backlogStatusInfo(t);
                    const createdLabel = t.createdAt
                      ? new Date(t.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                      : "—";
                    return (
                      <tr
                        key={t._id}
                        className={selectedId === t._id ? "selected" : ""}
                        onClick={() => { setSelectedId(t._id); setDrawerOpen(true); }}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(t._id)}
                            onChange={() =>
                              setSelectedIds((prev) =>
                                prev.includes(t._id) ? prev.filter((x) => x !== t._id) : [...prev, t._id]
                              )
                            }
                          />
                        </td>
                        <td><span className="bm-id-link">{t.taskId}</span></td>
                        <td className="bm-title-cell" title={t.title}>{t.title}</td>
                        <td>{t.type}</td>
                        <td>{t.category}</td>
                        <td>
                          <span className={`bm-priority ${t.priority.toLowerCase()}`}>
                            <Flag size={11} /> {t.priority}
                          </span>
                        </td>
                        <td>{t.storyPoints}</td>
                        <td>{t.estimatedHours}h</td>
                        <td><span className={`bm-status-pill ${st.tone}`}>{st.label}</span></td>
                        <td>
                          <span className="bm-person">
                            <span className="bm-avatar">{t.initials}</span>
                            {t.assignee}
                          </span>
                        </td>
                        <td>{createdLabel}</td>
                        <td><MoreVertical size={13} color="#94a3b8" /></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bm-pagination">
            <span>
              Showing {filteredTasks.length ? (safePage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(safePage * pageSize, filteredTasks.length)} of {filteredTasks.length} items
            </span>
            <div className="bm-page-btns">
              <button disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft size={12} />
              </button>
              {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => i + 1).map((n) => (
                <button key={n} className={safePage === n ? "active" : ""} onClick={() => setPage(n)}>
                  {n}
                </button>
              ))}
              <button disabled={safePage === pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
                <ChevronRight size={12} />
              </button>
            </div>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              style={{ height: "26px", border: "1px solid #dce5f2", borderRadius: "5px", fontSize: "11px", padding: "0 6px" }}
            >
              <option value={15}>15 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </section>

        {/* Right Sticky Detail Drawer (Exact TSK-005 right panel) */}
        {drawerOpen && selectedTask && (
          <aside className="bm-drawer">
            <div className="bm-drawer-top">
              <div className="bm-drawer-id">
                <strong>{selectedTask.taskId}</strong>
                <span className={`bm-status-pill ${backlogStatusInfo(selectedTask).tone}`}>
                  {backlogStatusInfo(selectedTask).label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                style={{ border: 0, background: "transparent", cursor: "pointer", color: "#64748b" }}
                aria-label="Close detail panel"
              >
                <X size={15} />
              </button>
            </div>

            <h3 className="bm-drawer-title">{selectedTask.title}</h3>

            <div className="bm-drawer-tabs">
              <button className={drawerTab === "details" ? "active" : ""} onClick={() => setDrawerTab("details")}>Details</button>
              <button className={drawerTab === "description" ? "active" : ""} onClick={() => setDrawerTab("description")}>Description</button>
              <button className={drawerTab === "ac" ? "active" : ""} onClick={() => setDrawerTab("ac")}>AC</button>
              <button className={drawerTab === "activity" ? "active" : ""} onClick={() => setDrawerTab("activity")}>Activity</button>
            </div>

            {drawerTab === "details" && (
              <>
                <div className="bm-meta-list">
                  <div className="bm-meta-row"><span>Type</span><b>{selectedTask.type}</b></div>
                  <div className="bm-meta-row"><span>Category</span><b>{selectedTask.category}</b></div>
                  <div className="bm-meta-row">
                    <span>Priority</span>
                    <b className={`bm-priority ${selectedTask.priority.toLowerCase()}`}>{selectedTask.priority}</b>
                  </div>
                  <div className="bm-meta-row"><span>Story Points</span><b>{selectedTask.storyPoints} SP</b></div>
                  <div className="bm-meta-row"><span>Est. Hours</span><b>{selectedTask.estimatedHours} Hours</b></div>
                  <div className="bm-meta-row">
                    <span>Assignee</span>
                    <b><span className="bm-avatar">{selectedTask.initials}</span>{selectedTask.assignee}</b>
                  </div>
                  <div className="bm-meta-row">
                    <span>Reporter</span>
                    <b><span className="bm-avatar">{selectedTask.reporterInitials}</span>{selectedTask.reporter}</b>
                  </div>
                  <div className="bm-meta-row">
                    <span>Created On</span>
                    <b>{selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</b>
                  </div>
                  <div className="bm-meta-row">
                    <span>Sprint</span>
                    <b>{selectedTask.sprintCode ? `${selectedTask.sprintCode} — ${selectedTask.sprintName}` : "—"}</b>
                  </div>
                  <div className="bm-meta-row">
                    <span>Labels</span>
                    <b>
                      {selectedTask.tags.length > 0
                        ? selectedTask.tags.map((tag) => <span className="bm-label-chip" key={tag}>{tag}</span>)
                        : "—"}
                    </b>
                  </div>
                  <div className="bm-meta-row"><span>Depends On</span><b>{selectedTask.dependencies.join(", ") || "—"}</b></div>
                  <div className="bm-meta-row"><span>Blocked By</span><b>{selectedTask.blockedBy.join(", ") || "—"}</b></div>
                </div>

                <div className="bm-drawer-section">
                  <h4>Description</h4>
                  <p>{selectedTask.description || "No description provided yet."}</p>
                </div>

                <div className="bm-drawer-section">
                  <h4>Attachments ({selectedTask.attachments.length})</h4>
                  {selectedTask.attachments.length === 0 ? (
                    <p>No attachments added.</p>
                  ) : (
                    selectedTask.attachments.map((f: any, idx: number) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", padding: "4px 0" }}>
                        <FileText size={13} color="#0755e9" />
                        <span>{f.name || "Attachment"}</span>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {drawerTab === "description" && (
              <div className="bm-drawer-section">
                <h4>Full Description</h4>
                <p>{selectedTask.description || "No detailed description recorded."}</p>
              </div>
            )}

            {drawerTab === "ac" && (
              <div className="bm-drawer-section">
                <h4>Acceptance Criteria</h4>
                <p style={{ whiteSpace: "pre-line" }}>{selectedTask.acceptanceCriteria || "No acceptance criteria defined."}</p>
                <h4 style={{ marginTop: "12px" }}>Definition of Done</h4>
                <p style={{ whiteSpace: "pre-line" }}>{selectedTask.definitionOfDone || "Standard DoD applies."}</p>
              </div>
            )}

            {drawerTab === "activity" && (
              <div className="bm-drawer-section">
                <h4>Task Activity ({selectedTask.activityLog.length})</h4>
                {selectedTask.activityLog.length === 0 ? (
                  <p>No recorded activity yet.</p>
                ) : (
                  selectedTask.activityLog.slice().reverse().map((ev: any, idx: number) => (
                    <div key={ev.id || idx} style={{ padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: "11px" }}>
                      <strong style={{ display: "block", color: "#0f172a" }}>{ev.details || ev.action}</strong>
                      <span style={{ color: "#64748b", fontSize: "10px" }}>
                        {ev.performedBy || "Team"} • {ev.timestamp ? new Date(ev.timestamp).toLocaleString("en-IN") : "Recent"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="bm-drawer-footer">
              <button className="bm-btn" onClick={() => router.push("/tasks")}>Edit</button>
              <div className="bm-move-wrap">
                <button
                  className="bm-btn bm-btn-primary"
                  style={{ width: "100%" }}
                  onClick={() => setShowMoveMenu((v) => !v)}
                >
                  Move to Sprint <ChevronDown size={13} />
                </button>
                {showMoveMenu && (
                  <div className="bm-move-menu">
                    {selectedTask.sprintId && (
                      <button onClick={() => moveTaskToSprint(selectedTask, null)}>
                        ← Return to Product Backlog
                      </button>
                    )}
                    {sprints.length === 0 ? (
                      <button onClick={() => router.push("/sprints/new")}>+ Create a Sprint first</button>
                    ) : (
                      sprints.map((s) => (
                        <button
                          key={s._id || s.id}
                          onClick={() => moveTaskToSprint(selectedTask, s._id || s.id)}
                        >
                          {s.sprintCode} — {s.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {toast && (
        <div className="bm-toast">
          <CheckCircle2 size={14} color="#34d399" />
          <span>{toast}</span>
        </div>
      )}
    </main>
  );
}
