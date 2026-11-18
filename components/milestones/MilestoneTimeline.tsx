"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Filter,
  Flag,
  Search,
  ZoomIn,
  ZoomOut,
  FileText,
  MoreHorizontal,
  RefreshCw,
  FolderKanban,
} from "lucide-react";
import { milestoneApi } from "../../lib/milestones/api";
import type { Milestone as ApiMilestone, MilestoneStatus } from "../../lib/milestones/types";
import "./milestone-timeline.css";

type TimelineItem = {
  id: string;
  rawId: string;
  title: string;
  start: string;
  end: string;
  days: number;
  status: MilestoneStatus;
  progress: number;
  owner: string;
  projectName: string;
  projectCode: string;
  module: string;
  predecessor?: string;
};

const S = (s: string) => s.toLowerCase().replace(" ", "-");

const short = (d: string) => {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return d;
  }
};

const formatFullDate = (d: string) => {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
};

function Stat({
  label,
  value,
  note,
  icon,
  tone,
}: {
  label: string;
  value: number;
  note: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="ml-stat">
      <i className={tone}>{icon}</i>
      <div>
        <small>{label}</small>
        <b>{value}</b>
        <span>{note}</span>
      </div>
    </div>
  );
}

function Pill({ status }: { status: string }) {
  return <em className={`ml-pill ${S(status)}`}>{status}</em>;
}

export default function MilestoneTimeline() {
  const [tab, setTab] = useState<"timeline" | "dependency" | "list">("timeline");
  const [scale, setScale] = useState("Weeks");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [filters, setFilters] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [milestones, setMilestones] = useState<ApiMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    milestoneApi
      .list()
      .then((res) => {
        if (isMounted) {
          setMilestones(res?.items || []);
        }
      })
      .catch((err) => {
        console.warn("Failed to load timeline milestones:", err);
        if (isMounted) setMilestones([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const items: TimelineItem[] = useMemo(() => {
    return milestones.map((m) => {
      const start = m.plannedStart || new Date().toISOString().slice(0, 10);
      const end = m.plannedEnd || start;
      const sDate = new Date(`${start}T00:00:00`).getTime();
      const eDate = new Date(`${end}T00:00:00`).getTime();
      const days = Math.max(1, Math.ceil((eDate - sDate) / 86400000) + 1);

      return {
        id: m.milestoneCode || m.id,
        rawId: m._id || m.id,
        title: m.title || "Untitled Milestone",
        start,
        end,
        days: Number.isFinite(days) ? days : 15,
        status: m.status,
        progress: m.progress || 0,
        owner: m.owner?.name || "Unassigned",
        projectName: m.projectName || "General Project",
        projectCode: m.projectCode || "PRJ",
        module: (m as any).module || "Core Scope",
        predecessor: m.dependencies ? m.dependencies.split(",")[0]?.trim() : undefined,
      };
    });
  }, [milestones]);

  const rows = useMemo(() => {
    return items.filter((m) => {
      const matchesQuery =
        !query.trim() ||
        (m.id + " " + m.title + " " + m.owner + " " + m.projectName)
          .toLowerCase()
          .includes(query.toLowerCase());
      const matchesStatus = statusFilter === "All" || m.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [items, query, statusFilter]);

  const selectedItem = rows[selectedIndex] || items[0] || null;

  // Compute dynamic timeline boundaries
  const { timelineStart, timelineSpan, monthLabels } = useMemo(() => {
    if (items.length === 0) {
      const now = new Date();
      const startMs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const spanMs = 150 * 86400000;
      return {
        timelineStart: startMs,
        timelineSpan: spanMs,
        monthLabels: ["Month 1", "Month 2", "Month 3", "Month 4", "Month 5"],
      };
    }

    const startTimes = items.map((i) => new Date(`${i.start}T00:00:00`).getTime());
    const endTimes = items.map((i) => new Date(`${i.end}T00:00:00`).getTime());
    const minStart = Math.min(...startTimes);
    const maxEnd = Math.max(...endTimes);

    // Buffer by 5 days on start and 15 days on end
    const startMs = minStart - 5 * 86400000;
    const spanMs = Math.max(30 * 86400000, maxEnd - startMs + 15 * 86400000);

    const labels: string[] = [];
    const curr = new Date(startMs);
    for (let k = 0; k < 5; k++) {
      labels.push(
        curr.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
      );
      curr.setMonth(curr.getMonth() + 1);
    }

    return {
      timelineStart: startMs,
      timelineSpan: spanMs,
      monthLabels: labels,
    };
  }, [items]);

  const counts = (s: MilestoneStatus) =>
    items.filter((m) => m.status === s).length;

  const total = items.length;
  const completedCount = counts("Completed");
  const inProgressCount = counts("In Progress");
  const upcomingCount = counts("Upcoming");
  const overdueCount = counts("Overdue") + counts("At Risk");

  const exportCSV = () => {
    const csv = [
      ["Milestone ID", "Title", "Start Date", "End Date", "Duration (Days)", "Status", "Progress", "Owner", "Project"],
      ...rows.map((m) => [
        m.id,
        `"${m.title.replace(/"/g, '""')}"`,
        m.start,
        m.end,
        m.days,
        m.status,
        m.progress + "%",
        `"${m.owner}"`,
        `"${m.projectName}"`,
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "milestone-timeline.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center", color: "#64748b" }}>
        <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 16px", color: "#3b82f6" }} />
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
          Loading Milestone Gantt Schedule...
        </h3>
        <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
          Calculating chronological dependency paths and baseline timelines from database.
        </p>
      </div>
    );
  }

  return (
    <div className="ml-page">
      <header className="ml-title">
        <CalendarDays />

        <div>
          <h1>
            {selectedItem
              ? `${selectedItem.id} — ${selectedItem.title}`
              : "Milestone Schedule & Timeline"}
          </h1>

          <p>
            Project: <b>{selectedItem ? `${selectedItem.projectCode} - ${selectedItem.projectName}` : "All Active Projects"}</b>
            <span>
              Module: <b>{selectedItem?.module || "Functional Requirements"}</b>
            </span>
            {selectedItem && <Pill status={selectedItem.status} />}
          </p>
        </div>

        <div className="ml-actions">
          {selectedItem && (
            <Link href={`/milestones/${encodeURIComponent(selectedItem.rawId)}/edit`} className="ms-btn" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <FileText size={14} /> Edit Milestone
            </Link>
          )}

          <button onClick={exportCSV} type="button">
            <Download size={14} /> Export CSV
          </button>

          <Link href="/milestones/new" style={{ padding: "8px 14px", background: "#1d4ed8", color: "#fff", borderRadius: "6px", textDecoration: "none", fontSize: "12.5px", fontWeight: 600 }}>
            + New Milestone
          </Link>
        </div>
      </header>

      <section className="ml-stats">
        <Stat
          label="Total Milestones"
          value={total}
          note="Across active projects"
          icon={<Flag />}
          tone="blue"
        />

        <Stat
          label="Completed"
          value={completedCount}
          note={`${total ? Math.round((completedCount / total) * 100) : 0}%`}
          icon={<CheckCircle2 />}
          tone="green"
        />

        <Stat
          label="In Progress"
          value={inProgressCount}
          note={`${total ? Math.round((inProgressCount / total) * 100) : 0}%`}
          icon={<Clock3 />}
          tone="orange"
        />

        <Stat
          label="Upcoming"
          value={upcomingCount}
          note={`${total ? Math.round((upcomingCount / total) * 100) : 0}%`}
          icon={<CalendarDays />}
          tone="blue"
        />

        <Stat
          label="Overdue / At Risk"
          value={overdueCount}
          note={`${total ? Math.round((overdueCount / total) * 100) : 0}%`}
          icon={<Activity />}
          tone="red"
        />
      </section>

      <nav className="ml-tabs">
        {(
          [
            ["timeline", "Timeline View (Gantt)"],
            ["dependency", "Dependency View"],
            ["list", "List View"],
          ] as const
        ).map(([v, l]) => (
          <button
            className={tab === v ? "active" : ""}
            onClick={() => setTab(v)}
            key={v}
            type="button"
          >
            {l}
          </button>
        ))}
      </nav>

      <div className="ml-layout">
        <main className="ml-main">
          {tab === "timeline" && (
            <>
              <section className="ml-card">
                <div className="ml-card-head">
                  <h2>Milestone Timeline (Gantt)</h2>

                  <div className="ml-tools">
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setStatusFilter("All");
                      }}
                    >
                      Reset
                    </button>

                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))}
                    >
                      <ZoomOut size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.min(1.7, z + 0.15))}
                    >
                      <ZoomIn size={14} />
                    </button>

                    <button type="button" onClick={() => setZoom(1)}>Fit</button>

                    <span className="ml-spacer" />

                    {["Days", "Weeks", "Months"].map((v) => (
                      <button
                        type="button"
                        className={scale === v ? "selected" : ""}
                        onClick={() => setScale(v)}
                        key={v}
                      >
                        {v}
                      </button>
                    ))}

                    <button type="button" onClick={() => setFilters(!filters)}>
                      <Filter size={13} /> Filters
                    </button>
                  </div>
                </div>

                {filters && (
                  <div className="ml-filter">
                    <label>
                      <Search size={14} />
                      <input
                        placeholder="Search by title, owner, ID..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="All">All Statuses</option>
                      {[
                        "Completed",
                        "In Progress",
                        "Upcoming",
                        "At Risk",
                        "Overdue",
                      ].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                {rows.length === 0 ? (
                  <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
                    <p style={{ margin: 0, fontSize: "14px" }}>
                      No milestones match the selected filters.
                    </p>
                  </div>
                ) : (
                  <div className="ml-gantt-scroll">
                    <div
                      className="ml-gantt"
                      style={{ "--zoom": zoom } as React.CSSProperties}
                    >
                      <div className="ml-left">
                        <div className="ml-gantt-head">
                          <span>Milestone ID</span>
                          <span>Milestone Title</span>
                          <span>Start Date</span>
                          <span>End Date</span>
                          <span>Duration</span>
                          <span>Status</span>
                        </div>

                        {rows.map((m, idx) => (
                          <div
                            className={`ml-data-row ${idx === selectedIndex ? "is-selected" : ""}`}
                            key={m.id}
                            style={{ cursor: "pointer" }}
                            onClick={() => setSelectedIndex(idx)}
                          >
                            <b>
                              <Link href={`/milestones/${encodeURIComponent(m.rawId)}`} style={{ color: "#1d4ed8", textDecoration: "none" }}>
                                {m.id}
                              </Link>
                            </b>
                            <span title={m.title}>{m.title}</span>
                            <span>{short(m.start)}</span>
                            <span>{short(m.end)}</span>
                            <span>{m.days}d</span>
                            <Pill status={m.status} />
                          </div>
                        ))}
                      </div>

                      <div className="ml-chart">
                        <div className="ml-months">
                          {monthLabels.map((m) => (
                            <span key={m}>{m}</span>
                          ))}
                        </div>

                        <div className="ml-weeks">
                          {Array.from({ length: 24 }, (_, i) => (
                            <span key={i}>
                              {String(((i * 7) % 31) + 1).padStart(2, "0")}
                            </span>
                          ))}
                        </div>

                        {rows.map((m) => {
                          const mStart = new Date(`${m.start}T00:00:00`).getTime();
                          const leftPct = Math.max(
                            0,
                            Math.min(95, ((mStart - timelineStart) / timelineSpan) * 100)
                          );
                          const widthPct = Math.max(
                            2.5,
                            Math.min(95 - leftPct, ((m.days * 86400000) / timelineSpan) * 100)
                          );

                          return (
                            <div className="ml-chart-row" key={m.id}>
                              <div
                                className={`ml-bar ${S(m.status)}`}
                                style={{
                                  left: `${leftPct}%`,
                                  width: `${widthPct}%`,
                                }}
                              >
                                <i style={{ width: `${m.progress}%` }} />
                                <small>
                                  {m.progress ? `${m.progress}%` : ""}
                                </small>
                              </div>
                            </div>
                          );
                        })}

                        <div className="ml-today">
                          <span>Today</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="ml-legend">
                  <b>Legend:</b>
                  <span>━━ Milestone Baseline Sequence</span>
                  <span className="dot green" /> Completed
                  <span className="dot orange" /> In Progress
                  <span className="dot blue" /> Upcoming
                  <span className="dot red" /> Overdue
                </div>
              </section>

              <div className="ml-lower">
                <Dependency items={items} />

                <div className="ml-stack">
                  <FloatTable items={items} />
                  <Baseline item={selectedItem} />
                </div>
              </div>
            </>
          )}

          {tab === "dependency" && <Dependency items={items} large />}

          {tab === "list" && (
            <section className="ml-card">
              <div className="ml-card-head">
                <h2>Milestone Registry List</h2>

                <div className="ml-tools">
                  <label className="ml-search">
                    <Search size={14} />
                    <input
                      placeholder="Search milestones..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    {[
                      "Completed",
                      "In Progress",
                      "Upcoming",
                      "At Risk",
                      "Overdue",
                    ].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="ml-table-wrap">
                <table className="ml-table">
                  <thead>
                    <tr>
                      {[
                        "Milestone ID",
                        "Milestone Title",
                        "Start Date",
                        "End Date",
                        "Duration",
                        "Status",
                        "Progress",
                        "Lead / Owner",
                      ].map((x) => (
                        <th key={x}>{x}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {rows.length > 0 ? (
                      rows.map((m) => (
                        <tr key={m.id}>
                          <td className="ml-link">
                            <Link href={`/milestones/${encodeURIComponent(m.rawId)}`}>
                              {m.id}
                            </Link>
                          </td>
                          <td><strong>{m.title}</strong></td>
                          <td>{formatFullDate(m.start)}</td>
                          <td>{formatFullDate(m.end)}</td>
                          <td>{m.days} days</td>
                          <td>
                            <Pill status={m.status} />
                          </td>
                          <td>{m.progress}%</td>
                          <td>{m.owner}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                          No milestones recorded in the current project registry.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>

        <aside className="ml-aside">
          <section className="ml-card">
            <h2>Milestone Summary</h2>

            {selectedItem ? (
              [
                ["Milestone ID", selectedItem.id],
                ["Title", selectedItem.title],
                ["Project", `${selectedItem.projectCode} - ${selectedItem.projectName}`],
                ["Scope / Module", selectedItem.module],
                ["Status", <Pill status={selectedItem.status} key="status" />],
                ["Start Date", formatFullDate(selectedItem.start)],
                ["End Date", formatFullDate(selectedItem.end)],
                ["Baseline Duration", `${selectedItem.days} Days`],
                ["Actual Progress", `${selectedItem.progress}%`],
                ["Milestone Lead", selectedItem.owner],
              ].map(([a, b]) => (
                <div className="ml-info" key={String(a)}>
                  <span>{a}</span>
                  <b>{b}</b>
                </div>
              ))
            ) : (
              <p style={{ margin: "16px 0", fontSize: "13px", color: "#64748b" }}>
                Select a milestone from the timeline to view details.
              </p>
            )}
          </section>

          <section className="ml-card">
            <h2>Critical Path Milestones</h2>
            <p className="ml-muted">Sequential project delivery sequence</p>

            {items.slice(0, 5).map((m, i) => (
              <div className="ml-critical" key={m.id}>
                <b>{i + 1}</b>

                <div>
                  <strong>{m.id}</strong>
                  <span>{m.title}</span>
                  <small>
                    {short(m.start)} – {short(m.end)}
                  </small>
                </div>

                <Pill status={m.status} />
              </div>
            ))}

            <footer>
              Total Critical Path Milestones: <b>{items.length}</b>
            </footer>
          </section>

          <section className="ml-card">
            <div className="ml-card-head">
              <h2>Milestone Audit Feed</h2>
            </div>

            {items.slice(0, 4).map((m, idx) => (
              <div className="ml-feed" key={m.id || idx}>
                <i />
                <div>
                  <b>{formatFullDate(m.start)}</b>
                  <p>Milestone {m.id} ({m.title}) active at {m.progress}% completion</p>
                  <small>Owner: {m.owner}</small>
                </div>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Dependency({ items, large = false }: { items: TimelineItem[]; large?: boolean }) {
  const displayItems = items.slice(0, 8);

  return (
    <section className="ml-card ml-dependency">
      <h2>Milestone Dependency Diagram</h2>

      <div className={`ml-diagram ${large ? "large" : ""}`}>
        <svg viewBox="0 0 1000 420" preserveAspectRatio="none">
          <defs>
            <marker
              id="ml-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path d="M0 0 L0 6 L6 3z" fill="#53647f" />
            </marker>
          </defs>

          <path
            d="M140 105H205 M330 105H395 M520 105H585 M710 105H780 M835 145V205 M710 105V300H780"
            fill="none"
            stroke="#53647f"
            strokeWidth="2"
            markerEnd="url(#ml-arrow)"
          />
        </svg>

        {displayItems.length > 0 ? (
          displayItems.map((n, idx) => {
            const leftPct = (idx % 4) * 24 + 2;
            const topPct = Math.floor(idx / 4) * 45 + 15;
            const stateClass =
              n.status === "Completed"
                ? "completed"
                : n.status === "In Progress"
                ? "progress"
                : n.status === "Overdue" || n.status === "At Risk"
                ? "overdue"
                : "upcoming";

            return (
              <div
                key={n.id}
                className={`ml-node ${stateClass}`}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                }}
              >
                <b>{n.id}</b>
                <strong>{n.title}</strong>
                <span>{short(n.start)} – {short(n.end)}</span>
                <em>{n.status}</em>
              </div>
            );
          })
        ) : (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
            No milestones to render in dependency graph.
          </div>
        )}
      </div>

      <div className="ml-legend">
        <span>━━ Sequential Execution Flow</span>
        <span className="dot green" /> Completed
        <span className="dot orange" /> In Progress
        <span className="dot blue" /> Upcoming
        <span className="dot red" /> Overdue
      </div>
    </section>
  );
}

function FloatTable({ items }: { items: TimelineItem[] }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="ml-card">
      <h2>Schedule Float &amp; Delay</h2>

      <table className="ml-mini">
        <thead>
          <tr>
            <th>Milestone</th>
            <th>Lead</th>
            <th>Delay</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {items.length > 0 ? (
            items.slice(0, 6).map((m) => {
              const isOverdue = m.end < today && m.progress < 100;
              return (
                <tr key={m.id}>
                  <td><strong>{m.id}</strong></td>
                  <td>{m.owner}</td>
                  <td>{isOverdue ? "Slippage detected" : "On Schedule"}</td>
                  <td><Pill status={m.status} /></td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", color: "#64748b", padding: "12px" }}>
                No active milestones.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function Baseline({ item }: { item: TimelineItem | null }) {
  if (!item) {
    return (
      <section className="ml-card">
        <h2>Baseline vs Actual</h2>
        <p style={{ fontSize: "13px", color: "#64748b" }}>No milestone selected.</p>
      </section>
    );
  }

  return (
    <section className="ml-card">
      <h2>Baseline vs Actual</h2>

      <div className="ml-baseline-legend">
        <span>■ Planned Baseline</span>
        <span>■ Progress Actual</span>
      </div>

      {[
        ["Start Date", formatFullDate(item.start), formatFullDate(item.start)],
        ["End Date", formatFullDate(item.end), formatFullDate(item.end)],
        ["Duration", `${item.days} Days`, `${item.days} Days`],
        ["Progress", `${item.progress}%`, `${item.progress}%`],
      ].map((r) => (
        <div className="ml-baseline-row" key={r[0]}>
          <span>{r[0]}</span>
          <b>{r[1]}</b>
          <b>{r[2]}</b>
        </div>
      ))}
    </section>
  );
}
