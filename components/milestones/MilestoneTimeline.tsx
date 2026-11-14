"use client";

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
} from "lucide-react";
import { milestones as getMilestones } from "@/lib/api";
import "./milestone-timeline.css";

type Status = "Completed" | "In Progress" | "Upcoming" | "Overdue";

type Milestone = {
  id: string;
  title: string;
  start: string;
  end: string;
  days: number;
  status: Status;
  progress: number;
  owner: string;
  predecessor?: string;
};

const S = (s: Status) => s.toLowerCase().replace(" ", "-");

const short = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });

const start = new Date("2025-04-20T00:00:00").getTime();
const span = 163 * 86400000;

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

function Pill({ status }: { status: Status }) {
  return <em className={`ml-pill ${S(status)}`}>{status}</em>;
}

export default function MilestoneTimeline() {
  const [data, setData] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"timeline" | "dependency" | "list">(
    "timeline"
  );
  const [scale, setScale] = useState("Weeks");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [filters, setFilters] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    async function fetchTimeline() {
      setLoading(true);
      try {
        const res = await getMilestones();
        const list = Array.isArray(res) ? res : (res as any)?.items || [];
        const mapped: Milestone[] = list.map((m: any, idx: number) => {
          let mappedStatus: Status = "In Progress";
          const rawSt = String(m.status || "").toUpperCase();
          if (rawSt === "COMPLETED") mappedStatus = "Completed";
          else if (
            rawSt === "UPCOMING" ||
            rawSt === "NOT STARTED" ||
            rawSt === "PLANNED"
          )
            mappedStatus = "Upcoming";
          else if (rawSt === "OVERDUE") mappedStatus = "Overdue";

          const startDate = m.startDate
            ? m.startDate.slice(0, 10)
            : new Date().toISOString().slice(0, 10);
          const endDate = m.endDate
            ? m.endDate.slice(0, 10)
            : new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
          const days = Math.max(
            1,
            Math.ceil(
              (new Date(endDate).getTime() - new Date(startDate).getTime()) /
                86400000
            )
          );

          return {
            id: m.code || `MLS-${String(idx + 1).padStart(3, "0")}`,
            title: m.name || m.title || "Milestone",
            start: startDate,
            end: endDate,
            days,
            status: mappedStatus,
            progress: m.weight || m.progress || 0,
            owner: m.owner?.name || "Admin",
          };
        });
        setData(mapped);
      } catch (err) {
        console.warn("Failed to fetch milestone timeline:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTimeline();
  }, []);

  const rows = useMemo(
    () =>
      data.filter(
        (m) =>
          (m.id + " " + m.title + " " + m.owner)
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (status === "All" || m.status === status)
      ),
    [data, query, status]
  );

  const counts = (s: Status) =>
    data.filter((m) => m.status === s).length;

  const exportCSV = () => {
    const csv = [
      ["ID", "Title", "Start", "End", "Days", "Status", "Progress", "Owner"],
      ...rows.map((m) => [
        m.id,
        m.title,
        m.start,
        m.end,
        m.days,
        m.status,
        m.progress + "%",
        m.owner,
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv" })
    );
    a.download = "milestone-timeline.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="ml-page">
      <header className="ml-title">
        <CalendarDays />

        <div>
          <h1>MLS-004 — Milestone Dependency / Timeline</h1>

          <p>
            Project: <b>PRJ-001 - AI-CMS Platform</b>
            <span>
              Module: <b>Requirements Management</b>
            </span>
            <Pill status="In Progress" />
          </p>
        </div>

        <div className="ml-actions">
          <button>
            <FileText size={14} /> Edit Milestone
          </button>

          <button onClick={exportCSV}>
            <Download size={14} /> Export
          </button>

          <button>
            <MoreHorizontal size={15} /> More Actions
          </button>
        </div>
      </header>

      <section className="ml-stats">
        <Stat
          label="Total Milestones"
          value={10}
          note="Across all phases"
          icon={<Flag />}
          tone="blue"
        />

        <Stat
          label="Completed"
          value={counts("Completed")}
          note="30%"
          icon={<CheckCircle2 />}
          tone="green"
        />

        <Stat
          label="In Progress"
          value={counts("In Progress")}
          note="20%"
          icon={<Clock3 />}
          tone="orange"
        />

        <Stat
          label="Upcoming"
          value={counts("Upcoming")}
          note="40%"
          icon={<CalendarDays />}
          tone="blue"
        />

        <Stat
          label="Overdue"
          value={counts("Overdue")}
          note="10%"
          icon={<Activity />}
          tone="red"
        />
      </section>

      <nav className="ml-tabs">
        {(
          [
            ["timeline", "Timeline View"],
            ["dependency", "Dependency View"],
            ["list", "List View"],
          ] as const
        ).map(([v, l]) => (
          <button
            className={tab === v ? "active" : ""}
            onClick={() => setTab(v)}
            key={v}
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
                      onClick={() => {
                        setQuery("");
                        setStatus("All");
                      }}
                    >
                      Today
                    </button>

                    <button
                      onClick={() =>
                        setZoom((z) => Math.max(0.7, z - 0.15))
                      }
                    >
                      <ZoomOut size={14} />
                    </button>

                    <button
                      onClick={() =>
                        setZoom((z) => Math.min(1.7, z + 0.15))
                      }
                    >
                      <ZoomIn size={14} />
                    </button>

                    <button onClick={() => setZoom(1)}>Fit</button>

                    <span className="ml-spacer" />

                    {["Days", "Weeks", "Months"].map((v) => (
                      <button
                        className={scale === v ? "selected" : ""}
                        onClick={() => setScale(v)}
                        key={v}
                      >
                        {v}
                      </button>
                    ))}

                    <button onClick={() => setFilters(!filters)}>
                      <Filter size={13} /> Filters
                    </button>
                  </div>
                </div>

                {filters && (
                  <div className="ml-filter">
                    <label>
                      <Search size={14} />
                      <input
                        placeholder="Search milestones"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>

                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option>All</option>
                      {[
                        "Completed",
                        "In Progress",
                        "Upcoming",
                        "Overdue",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}

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

                      {rows.map((m) => (
                        <div className="ml-data-row" key={m.id}>
                          <b>{m.id}</b>
                          <span>{m.title}</span>
                          <span>{short(m.start)}</span>
                          <span>{short(m.end)}</span>
                          <span>{m.days}d</span>
                          <Pill status={m.status} />
                        </div>
                      ))}
                    </div>

                    <div className="ml-chart">
                      <div className="ml-months">
                        {[
                          "May 2025",
                          "Jun 2025",
                          "Jul 2025",
                          "Aug 2025",
                          "Sep 2025",
                        ].map((m) => (
                          <span key={m}>{m}</span>
                        ))}
                      </div>

                      <div className="ml-weeks">
                        {Array.from({ length: 24 }, (_, i) => (
                          <span key={i}>
                            {String((i * 7) % 31 + 1).padStart(2, "0")}
                          </span>
                        ))}
                      </div>

                      {rows.map((m) => (
                        <div className="ml-chart-row" key={m.id}>
                          <div
                            className={`ml-bar ${S(m.status)}`}
                            style={{
                              left: `${
                                ((new Date(m.start + "T00:00:00").getTime() -
                                  start) /
                                  span) *
                                100
                              }%`,
                              width: `${Math.max(
                                1.4,
                                (m.days / 163) * 100
                              )}%`,
                            }}
                          >
                            <i style={{ width: m.progress + "%" }} />
                            <small>
                              {m.progress ? m.progress + "%" : ""}
                            </small>
                          </div>
                        </div>
                      ))}

                      <div className="ml-today">
                        <span>Today</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ml-legend">
                  <b>Legend:</b>
                  <span>━━ Finish to Start (FS)</span>
                  <span>┄┄ Start to Start (SS)</span>
                  <span>┄┄ Finish to Finish (FF)</span>
                  <span>┄┄ Start to Finish (SF)</span>
                  <span className="dot green" /> Completed
                  <span className="dot orange" /> In Progress
                  <span className="dot blue" /> Upcoming
                  <span className="dot red" /> Overdue
                </div>
              </section>

              <div className="ml-lower">
                <Dependency />

                <div className="ml-stack">
                  <FloatTable data={data} />
                  <Baseline />
                </div>
              </div>
            </>
          )}

          {tab === "dependency" && <Dependency large />}

          {tab === "list" && (
            <section className="ml-card">
              <div className="ml-card-head">
                <h2>Milestone List</h2>

                <div className="ml-tools">
                  <label className="ml-search">
                    <Search size={14} />
                    <input
                      placeholder="Search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>

                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option>All</option>
                    {[
                      "Completed",
                      "In Progress",
                      "Upcoming",
                      "Overdue",
                    ].map((s) => (
                      <option key={s}>{s}</option>
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
                        "Owner",
                      ].map((x) => (
                        <th key={x}>{x}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((m) => (
                      <tr key={m.id}>
                        <td className="ml-link">{m.id}</td>
                        <td>{m.title}</td>
                        <td>{m.start}</td>
                        <td>{m.end}</td>
                        <td>{m.days} days</td>
                        <td>
                          <Pill status={m.status} />
                        </td>
                        <td>{m.progress}%</td>
                        <td>{m.owner}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>

        <aside className="ml-aside">
          <section className="ml-card">
            <h2>Milestone Summary</h2>

            {[
              ["Milestone ID", "MLS-004"],
              ["Title", "Module Development"],
              ["Type", "Phase"],
              ["Status", <Pill status="In Progress" />],
              ["Start Date", "01 Jun 2025"],
              ["End Date", "30 Jul 2025"],
              ["Baseline Duration", "60 Days"],
              ["Actual Progress", "40%"],
              ["Priority", "🔴 High"],
              ["Owner", "Vikram Singh"],
              ["Dependencies", "MLS-003"],
              ["Blocking", "—"],
            ].map(([a, b]) => (
              <div className="ml-info" key={String(a)}>
                <span>{a}</span>
                <b>{b}</b>
              </div>
            ))}
          </section>

          <section className="ml-card">
            <h2>Critical Path</h2>
            <p className="ml-muted">Milestones on the critical path</p>

            {data.slice(0, 6).map((m, i) => (
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
              Total Critical Path Duration: <b>122 Days</b>
            </footer>
          </section>

          <section className="ml-card">
            <div className="ml-card-head">
              <h2>Activity Feed</h2>
              <button className="ml-link-button">View All</button>
            </div>

            {[
              [
                "16 May 2025, 10:15 AM",
                "Milestone status changed from Upcoming to In Progress",
                "Mayank Swaroop",
              ],
              [
                "15 May 2025, 04:45 PM",
                "Design deliverables linked to this milestone",
                "Neha Patel",
              ],
              [
                "14 May 2025, 11:20 AM",
                "Planned dates updated for Module Development",
                "Vikram Singh",
              ],
              [
                "10 May 2025, 09:30 AM",
                "Milestone created",
                "Mayank Swaroop",
              ],
            ].map(([d, t, u]) => (
              <div className="ml-feed" key={d}>
                <i />
                <div>
                  <b>{d}</b>
                  <p>{t}</p>
                  <small>by {u}</small>
                </div>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Dependency({ large = false }: { large?: boolean }) {
  const nodes = [
    ["MLS-001", "Project Kickoff", "01 May – 05 May", "completed", 2, 17],
    [
      "MLS-002",
      "Requirements Sign-off",
      "06 May – 15 May",
      "completed",
      20,
      17,
    ],
    [
      "MLS-003",
      "Design Completion",
      "16 May – 30 May",
      "progress",
      39,
      17,
    ],
    [
      "MLS-004",
      "Module Development",
      "01 Jun – 30 Jul",
      "progress",
      58,
      17,
    ],
    ["MLS-005", "Internal QA", "01 Aug – 20 Aug", "upcoming", 78, 4],
    ["MLS-006", "UAT Completion", "21 Aug – 05 Sep", "upcoming", 78, 42],
    [
      "MLS-007",
      "Production Release",
      "06 Sep – 10 Sep",
      "upcoming",
      78,
      77,
    ],
    ["MLS-009", "Discovery Phase", "20 Apr – 05 May", "overdue", 2, 70],
    [
      "MLS-010",
      "Prototype Approval",
      "06 May – 20 May",
      "completed",
      20,
      70,
    ],
  ] as const;

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

          <path
            d="M140 105V315H205"
            fill="none"
            stroke="#f04444"
            strokeDasharray="6 5"
            strokeWidth="2"
            markerEnd="url(#ml-arrow)"
          />
        </svg>

        {nodes.map((n) => (
          <div
            key={n[0]}
            className={`ml-node ${n[3]}`}
            style={{
              left: n[4] + "%",
              top: n[5] + "%",
            }}
          >
            <b>{n[0]}</b>
            <strong>{n[1]}</strong>
            <span>{n[2]}</span>
            <em>
              {n[3] === "progress"
                ? "In Progress"
                : n[3][0].toUpperCase() + n[3].slice(1)}
            </em>
          </div>
        ))}
      </div>

      <div className="ml-legend">
        <span>━━ Finish to Start (FS)</span>
        <span>┄┄ Start to Start (SS)</span>
        <span>┄┄ Finish to Finish (FF)</span>
        <span>┄┄ Start to Finish (SF)</span>
      </div>
    </section>
  );
}

function FloatTable({ data = [] }: { data?: Milestone[] }) {
  return (
    <section className="ml-card">
      <h2>Slack / Float &amp; Delay</h2>

      <table className="ml-mini">
        <thead>
          <tr>
            <th>Milestone</th>
            <th>Total Float</th>
            <th>Free Float</th>
            <th>Delay</th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={4} style={{ textAlign: "center", padding: "12px", color: "#6b7280" }}>No milestones</td></tr>
          ) : (
            data.map((m) => (
              <tr key={m.id}>
                <td>{m.id}</td>
                <td>0d</td>
                <td>0d</td>
                <td>-</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}

function Baseline() {
  return (
    <section className="ml-card">
      <h2>Baseline vs Actual</h2>

      <div className="ml-baseline-legend">
        <span>■ Baseline</span>
        <span>■ Actual</span>
      </div>

      {[
        ["Start Date", "01 Jun 2025", "01 Jun 2025"],
        ["End Date", "30 Jul 2025", "30 Jul 2025"],
        ["Duration", "60 Days", "60 Days"],
        ["Progress", "40%", "40%"],
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