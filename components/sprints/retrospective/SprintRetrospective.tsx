"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, ChevronDown, Circle,
  ClipboardList, Download, FileText, Lightbulb,
  Plus, Share2, Target, ThumbsDown, ThumbsUp, X,
} from "lucide-react";
import { sprintApi, isValidObjectId, type Sprint } from "@/lib/sprints/api";
import { tasks as getTasks, getBugs } from "@/lib/api";
import "./sprint-retrospective.css";

type Category = "good" | "bad" | "improve";
type RetroItem = { id: number; title: string; owner: string; score: number };
type ActionItem = {
  id: number;
  title: string;
  owner: string;
  due: string;
  status: "Completed" | "In Progress" | "Planned";
  priority: "High" | "Medium" | "Low";
};

const initialIdeas: Record<Category, RetroItem[]> = {
  good: [],
  bad: [],
  improve: [],
};

const tabs = [
  "Summary", "What Went Well", "What Didn't Go Well",
  "Action Items", "Metrics", "Team Feedback",
  "Notes & Attachments", "Next Sprint Plan",
];

function Card({ title, children, action, className = "", id }: {
  title: string; children: React.ReactNode; action?: React.ReactNode;
  className?: string; id?: string;
}) {
  return (
    <section id={id} className={`rt-card ${className}`}>
      <div className="rt-card-head"><h3>{title}</h3>{action}</div>
      {children}
    </section>
  );
}

function Ring({ value, display, label, color = "#008b52" }: {
  value: number; display: string; label: string; color?: string;
}) {
  const safeVal = Math.max(0, Math.min(100, value));
  return (
    <div
      className="rt-ring"
      style={{
        background: `conic-gradient(${color} ${safeVal}%, #e5eaf3 ${safeVal}% 100%)`,
      }}
    >
      <div>
        <strong>{display}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function Burndown({
  totalPoints,
  completedPoints,
  startDate,
  endDate,
}: {
  totalPoints: number;
  completedPoints: number;
  startDate?: string;
  endDate?: string;
}) {
  const maxVal = Math.max(10, totalPoints);
  const remaining = Math.max(0, totalPoints - completedPoints);
  const steps = 6;
  const ideal = Array.from({ length: steps }, (_, i) =>
    totalPoints - (i * totalPoints) / (steps - 1)
  );
  const actual = Array.from({ length: steps }, (_, i) => {
    const ratio = i / (steps - 1);
    return Math.round(totalPoints - ratio * completedPoints);
  });

  const y = (v: number) => 140 - (v / maxVal) * 115;
  const x = (i: number) => 34 + (i / (steps - 1)) * 305;
  const pts = (arr: number[]) => arr.map((v, i) => `${x(i)},${y(v)}`).join(" ");

  const ticks = [0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5), Math.round(maxVal * 0.75), maxVal];
  const dateLabels = (() => {
    if (!startDate || !endDate) return ["Start", "Day 3", "Day 6", "Day 9", "Day 12", "End"];
    const s = new Date(`${startDate}T00:00:00`).getTime();
    const e = new Date(`${endDate}T00:00:00`).getTime();
    if (Number.isNaN(s) || Number.isNaN(e) || e <= s) {
      return ["Start", "", "", "", "", "End"];
    }
    return Array.from({ length: steps }, (_, i) => {
      const d = new Date(s + ((e - s) * i) / (steps - 1));
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    });
  })();

  return (
    <svg className="rt-burndown" viewBox="0 0 360 175" role="img" aria-label="Sprint burndown">
      {ticks.map((n, idx) => (
        <g key={`${n}-${idx}`}>
          <line x1="34" x2="345" y1={y(n)} y2={y(n)} stroke="#eef2f9" />
          <text x="5" y={y(n) + 3} fontSize="8" fill="#40527a">{n}</text>
        </g>
      ))}
      <polyline points={pts(ideal)} fill="none" stroke="#0754f9" strokeDasharray="4 3" strokeWidth="1.5" />
      <polyline points={pts(actual)} fill="none" stroke="#008b52" strokeWidth="2" />
      {actual.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill="white" stroke="#008b52" />
      ))}
      {dateLabels.map((d, i) => (
        <text key={`${d}-${i}`} x={x(i)} y="163" fontSize="8" fill="#40527a" textAnchor="middle">{d}</text>
      ))}
      <text x="225" y="12" fontSize="8" fill="#0754f9">--- Ideal ({totalPoints} SP)</text>
      <text x="295" y="12" fontSize="8" fill="#008b52">— Rem ({remaining} SP)</text>
    </svg>
  );
}

export default function SprintRetrospective({ sprintId }: { sprintId: string }) {
  const router = useRouter();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [allSprints, setAllSprints] = useState<Sprint[]>([]);
  const [nextSprint, setNextSprint] = useState<Sprint | null>(null);
  const [personnel, setPersonnel] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [bugsList, setBugsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [ideas, setIdeas] = useState<Record<Category, RetroItem[]>>(initialIdeas);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [tab, setTab] = useState(0);
  const [closed, setClosed] = useState(false);
  const [modal, setModal] = useState<Category | "action" | null>(null);
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [actionDue, setActionDue] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [actionPriority, setActionPriority] = useState<ActionItem["priority"]>("Medium");
  const [notice, setNotice] = useState("");
  const [menu, setMenu] = useState(false);
  const [files, setFiles] = useState<{ name: string; size: string; uploadedAt?: string }[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [notes, setNotes] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [newFocus, setNewFocus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 3500);
  };

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const [{ sprint: currentSprint, allSprints: items }, people] = await Promise.all([
          sprintApi.resolve(sprintId, ["COMPLETED", "ACTIVE", "PLANNED"]),
          sprintApi.getPersonnel().catch(() => []),
        ]);

        if (!active) return;

        setAllSprints(items);
        setSprint(currentSprint);
        setPersonnel(people);

        if (people.length > 0) {
          setOwner(
            currentSprint?.ownerName && currentSprint.ownerName !== "Unassigned"
              ? currentSprint.ownerName
              : people[0].name
          );
        }

        const upcoming =
          items.find(
            (s) =>
              s._id !== currentSprint?._id &&
              (s.rawStatus === "PLANNED" || s.status === "Upcoming")
          ) ||
          items.find((s) => s._id !== currentSprint?._id) ||
          null;
        setNextSprint(upcoming);

        if (!currentSprint) {
          setIdeas(initialIdeas);
          setActions([]);
          setNotes("");
          setClosed(false);
          setFiles([]);
          setFocusAreas([]);
          setTasksList([]);
          setBugsList([]);
          return;
        }

        const retro = currentSprint.retrospective || {};
        setIdeas({
          good: Array.isArray(retro.ideas?.good) ? retro.ideas.good : [],
          bad: Array.isArray(retro.ideas?.bad) ? retro.ideas.bad : [],
          improve: Array.isArray(retro.ideas?.improve) ? retro.ideas.improve : [],
        });
        setActions(Array.isArray(retro.actions) ? retro.actions : []);
        setNotes(typeof retro.notes === "string" ? retro.notes : "");
        setClosed(Boolean(retro.closed));
        setFiles(Array.isArray(retro.attachments) ? retro.attachments : []);
        setFocusAreas(Array.isArray(retro.focusAreas) ? retro.focusAreas : []);

        const projectKey =
          typeof currentSprint.projectId === "object"
            ? currentSprint.projectId?._id
            : currentSprint.projectId;

        const [tasksRes, bugsRes] = await Promise.allSettled([
          getTasks({ sprintId: currentSprint._id, limit: 100 }),
          getBugs(projectKey && isValidObjectId(projectKey) ? { projectId: projectKey, limit: 100 } : { limit: 100 }).catch(() => ({ items: [] })),
        ]);

        if (!active) return;

        if (tasksRes.status === "fulfilled") {
          const raw: any = tasksRes.value;
          const sprintTasks = Array.isArray(raw) ? raw : raw?.data || raw?.items || [];
          setTasksList(sprintTasks);
        }

        if (bugsRes.status === "fulfilled") {
          const raw: any = bugsRes.value;
          const relatedBugs = Array.isArray(raw) ? raw : raw?.items || raw?.data || [];
          setBugsList(relatedBugs);
        }
      } catch (err: any) {
        showNotice(`Failed to load retrospective: ${err?.message || "Server error"}`);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [sprintId]);

  const persistRetrospective = async (override?: {
    ideas?: Record<Category, RetroItem[]>;
    actions?: ActionItem[];
    notes?: string;
    closed?: boolean;
    attachments?: { name: string; size: string; uploadedAt?: string }[];
    focusAreas?: string[];
  }) => {
    if (!sprint?._id) return;
    try {
      setSaving(true);
      const payload = {
        ideas: override?.ideas ?? ideas,
        actions: override?.actions ?? actions,
        notes: override?.notes ?? notes,
        closed: override?.closed ?? closed,
        attachments: override?.attachments ?? files,
        focusAreas: override?.focusAreas ?? focusAreas,
        updatedAt: new Date().toISOString(),
      };
      await sprintApi.update(sprint._id, { retrospective: payload });
    } catch (err: any) {
      showNotice(`Could not save retrospective: ${err?.message || "API error"}`);
    } finally {
      setSaving(false);
    }
  };

  const completedTasks = useMemo(
    () => tasksList.filter((t) => ["completed", "done"].includes(String(t.status || "").toLowerCase())),
    [tasksList]
  );

  const inProgressTasks = useMemo(
    () =>
      tasksList.filter((t) =>
        ["in progress", "in_progress", "testing", "in review", "in_review", "code_review", "qa", "uat"].includes(
          String(t.status || "").toLowerCase()
        )
      ),
    [tasksList]
  );

  const totalPoints = useMemo(() => {
    const fromTasks = tasksList.reduce((sum, t) => sum + Number(t.storyPoints || (t.estimatedHours ? Math.round(t.estimatedHours / 4) : 0)), 0);
    return fromTasks > 0 ? fromTasks : sprint?.plannedStoryPoints || 0;
  }, [tasksList, sprint]);

  const completedPoints = useMemo(() => {
    const fromTasks = completedTasks.reduce((sum, t) => sum + Number(t.storyPoints || (t.estimatedHours ? Math.round(t.estimatedHours / 4) : 0)), 0);
    return fromTasks > 0 ? fromTasks : sprint?.completedStoryPoints || 0;
  }, [completedTasks, sprint]);

  const inProgressPoints = useMemo(
    () => inProgressTasks.reduce((sum, t) => sum + Number(t.storyPoints || (t.estimatedHours ? Math.round(t.estimatedHours / 4) : 0)), 0),
    [inProgressTasks]
  );

  const notCompletedPoints = Math.max(0, totalPoints - completedPoints - inProgressPoints);
  const completionPct = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : sprint?.progress || 0;

  const resolvedBugsCount = useMemo(
    () => bugsList.filter((b) => ["resolved", "closed", "fixed"].includes(String(b.status || "").toLowerCase())).length,
    [bugsList]
  );

  const uniqueContributors = useMemo(() => {
    const names = new Set<string>();
    (["good", "bad", "improve"] as Category[]).forEach((c) => {
      ideas[c].forEach((item) => {
        if (item.owner) names.add(item.owner);
      });
    });
    actions.forEach((a) => {
      if (a.owner) names.add(a.owner);
    });
    return names.size;
  }, [ideas, actions]);

  const totalTeamCount = Math.max(personnel.length, uniqueContributors, 1);
  const participationPct = Math.min(100, Math.round((uniqueContributors / totalTeamCount) * 100));

  const sentimentStats = useMemo(() => {
    const goodCount = ideas.good.length;
    const badCount = ideas.bad.length;
    const improveCount = ideas.improve.length;
    const total = goodCount + badCount + improveCount;
    if (total === 0) {
      return { label: "Neutral", rating: 0, pct: 0 };
    }
    const score = (goodCount * 5 + improveCount * 3.5 + badCount * 2) / total;
    const rating = Number(score.toFixed(1));
    const pct = Math.round((rating / 5) * 100);
    const label = rating >= 4 ? "Positive" : rating >= 3 ? "Balanced" : "Needs Attention";
    return { label, rating, pct };
  }, [ideas]);

  const metricRows = useMemo(() => {
    const spVariance = completedPoints - totalPoints;
    const taskVariance = completedTasks.length - tasksList.length;
    const velocity = sprint?.velocity || completedPoints;
    const capacity = sprint?.capacity || 40;
    return [
      [
        "Story Points",
        `${totalPoints} SP`,
        `${completedPoints} SP`,
        `${spVariance >= 0 ? "+" : ""}${spVariance} SP`,
        completionPct >= 80 ? "On Track" : "In Progress",
      ],
      [
        "Tasks Completed",
        `${tasksList.length}`,
        `${completedTasks.length}`,
        `${taskVariance >= 0 ? "+" : ""}${taskVariance}`,
        tasksList.length > 0 && completedTasks.length === tasksList.length ? "Positive" : "On Track",
      ],
      [
        "Bugs Logged",
        "0",
        `${bugsList.length}`,
        `${bugsList.length}`,
        bugsList.length === 0 ? "Positive" : "Tracked",
      ],
      [
        "Bugs Resolved",
        `${bugsList.length}`,
        `${resolvedBugsCount}`,
        `${resolvedBugsCount - bugsList.length}`,
        bugsList.length === resolvedBugsCount ? "Positive" : "On Track",
      ],
      [
        "Sprint Velocity",
        `${capacity} SP`,
        `${velocity} SP`,
        `${velocity - capacity >= 0 ? "+" : ""}${velocity - capacity} SP`,
        velocity >= capacity ? "Positive" : "On Track",
      ],
    ];
  }, [totalPoints, completedPoints, completionPct, tasksList.length, completedTasks.length, bugsList.length, resolvedBugsCount, sprint]);

  const go = (index: number) => {
    setTab(index);
    document.getElementById(`rt-section-${index}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const saveItem = async () => {
    if (!title.trim() || !modal) return;
    const itemOwner = owner || sprint?.ownerName || personnel[0]?.name || "Team Member";
    if (modal === "action") {
      const nextActions: ActionItem[] = [
        ...actions,
        {
          id: Date.now(),
          title: title.trim(),
          owner: itemOwner,
          due: actionDue
            ? new Date(`${actionDue}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : "TBD",
          status: "Planned",
          priority: actionPriority,
        },
      ];
      setActions(nextActions);
      await persistRetrospective({ actions: nextActions });
      showNotice("Action item saved.");
    } else {
      const category = modal;
      const nextIdeas: Record<Category, RetroItem[]> = {
        ...ideas,
        [category]: [
          ...ideas[category],
          { id: Date.now(), title: title.trim(), owner: itemOwner, score: category === "bad" ? -1 : 1 },
        ],
      };
      setIdeas(nextIdeas);
      await persistRetrospective({ ideas: nextIdeas });
      showNotice("Retrospective item saved.");
    }
    setTitle("");
    setModal(null);
  };

  const toggleActionStatus = async (index: number) => {
    const order: ActionItem["status"][] = ["Planned", "In Progress", "Completed"];
    const nextActions = actions.map((a, i) => {
      if (i !== index) return a;
      const nextStatus = order[(order.indexOf(a.status) + 1) % order.length];
      return { ...a, status: nextStatus };
    });
    setActions(nextActions);
    await persistRetrospective({ actions: nextActions });
    showNotice("Action status updated.");
  };

  const toggleClosed = async () => {
    const nextClosed = !closed;
    setClosed(nextClosed);
    await persistRetrospective({ closed: nextClosed });
    showNotice(nextClosed ? "Retrospective closed and saved." : "Retrospective reopened.");
  };

  const handleSaveNotes = async () => {
    await persistRetrospective({ notes });
    showNotice("Facilitator summary saved.");
  };

  const handleAddFocusArea = async () => {
    if (!newFocus.trim()) return;
    const nextFocus = [...focusAreas, newFocus.trim()];
    setFocusAreas(nextFocus);
    setNewFocus("");
    await persistRetrospective({ focusAreas: nextFocus });
    showNotice("Focus area added.");
  };

  const exportCsv = () => {
    const code = sprint?.sprintCode || sprintId;
    const lines = [
      "Category,Item,Owner,Score",
      ...(["good", "bad", "improve"] as Category[]).flatMap((c) =>
        ideas[c].map((i) => `${c},"${i.title.replaceAll('"', '""')}",${i.owner},${i.score}`)
      ),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${code}-retrospective.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sprintCode = sprint?.sprintCode || sprintId;
  const sprintName = sprint?.name || "Sprint";
  const projectLabel = sprint?.projectName
    ? `${sprint.projectCode || "PRJ"} - ${sprint.projectName}`
    : "Not Linked";
  const milestoneLabel = sprint?.milestoneName || "Not Linked";
  const facilitator = sprint?.ownerName || "Unassigned";
  const completedOnStr = sprint?.updatedAt
    ? new Date(sprint.updatedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

  const ideaColumn = (category: Category, heading: string) => (
    <Card
      id={category === "good" ? "rt-section-1" : category === "bad" ? "rt-section-2" : undefined}
      title={heading}
      className={`rt-ideas rt-${category}`}
      action={<span className="rt-count">{ideas[category].length}</span>}
    >
      <div className="rt-idea-list">
        {ideas[category].length ? (
          ideas[category].map((i) => (
            <div className="rt-idea" key={i.id}>
              <span className="rt-idea-icon">
                {category === "good" ? (
                  <CheckCircle2 size={13} />
                ) : category === "bad" ? (
                  <Circle size={13} />
                ) : (
                  <Lightbulb size={13} />
                )}
              </span>
              <div>
                <strong>{i.title}</strong>
                <small>by {i.owner}</small>
              </div>
              <span className="rt-score">{i.score > 0 ? "+" : ""}{i.score}</span>
            </div>
          ))
        ) : (
          <p style={{ padding: "12px", color: "#667085", fontSize: "13px" }}>
            No items captured yet.
          </p>
        )}
      </div>
      <button className="rt-add" onClick={() => setModal(category)}>
        <Plus size={12} /> Add Item
      </button>
    </Card>
  );

  return (
    <main className="rt-page">
      <header className="rt-toolbar">
        <nav className="rt-crumb">
          <Link href="/sprints">Sprint Management</Link><span>›</span>
          <Link href="/sprints">Sprint Registry</Link><span>›</span>
          <strong>Sprint Retrospective ({sprintCode})</strong>
        </nav>
        <div className="rt-actions">
          {allSprints.length > 0 && (
            <select
              aria-label="Switch Sprint"
              value={sprint?._id || sprint?.id || ""}
              onChange={(e) => {
                if (e.target.value) router.push(`/sprints/retrospective/${encodeURIComponent(e.target.value)}`);
              }}
              style={{
                height: "30px",
                padding: "0 10px",
                border: "1px solid #d5dfef",
                borderRadius: "5px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#10204a",
                background: "#ffffff",
                cursor: "pointer",
              }}
            >
              {allSprints.map((s) => (
                <option key={s._id || s.id} value={s._id || s.id}>
                  {s.sprintCode} — {s.name}
                </option>
              ))}
            </select>
          )}
          <button onClick={exportCsv}><Download size={13} /> Download Report</button>
          <button
            onClick={async () => {
              if (navigator.share) {
                try {
                  await navigator.share({ title: `Retrospective ${sprintCode}`, url: window.location.href });
                } catch {
                  /* cancelled */
                }
              } else {
                await navigator.clipboard.writeText(window.location.href);
                showNotice("Link copied.");
              }
            }}
          >
            <Share2 size={13} /> Share
          </button>
          <div className="rt-more">
            <button onClick={() => setMenu(!menu)}>More Actions <ChevronDown size={12} /></button>
            {menu && (
              <div className="rt-menu">
                <button onClick={() => { exportCsv(); setMenu(false); }}>Export CSV</button>
                <button onClick={() => { go(3); setMenu(false); }}>Action Items</button>
                <button onClick={() => { go(6); setMenu(false); }}>Attachments</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="rt-titlebar">
        <div className="rt-title">
          <ClipboardList size={25} color="#ef4040" />
          <div>
            <div className="rt-title-line">
              <h1>Sprint Retrospective ({sprintCode})</h1>
              <span className="rt-pill rt-green">
                {closed ? "Closed" : sprint?.status || "Active"}
              </span>
            </div>
            <p>
              {loading
                ? "Loading sprint retrospective data..."
                : `Reflect on ${sprintName}: what went well, what didn't, and action items for the next sprint.`}
            </p>
          </div>
        </div>
        <div className="rt-actions">
          <button onClick={handleSaveNotes} disabled={saving}>
            <FileText size={13} /> {saving ? "Saving..." : "Save Changes"}
          </button>
          <button className="rt-primary" onClick={toggleClosed} disabled={saving}>
            {closed ? "Reopen Retrospective" : "Close Retrospective"}
          </button>
        </div>
      </div>

      <section className="rt-info">
        {[
          ["Project", projectLabel],
          ["Milestone", milestoneLabel],
          ["Sprint", `${sprintCode} - ${sprintName}`],
          ["Duration", `${sprint?.start || "—"} - ${sprint?.end || "—"} (${sprint?.durationDays || 14} Days)`],
          ["Last Updated", completedOnStr],
          ["Facilitator", facilitator],
          ["Participants", `${uniqueContributors} / ${totalTeamCount}`],
          ["Overall Sentiment", sentimentStats.label],
        ].map(([k, v]) => (
          <div key={k}>
            <small>{k}</small>
            <strong>{v}</strong>
          </div>
        ))}
      </section>

      <nav className="rt-tabs">
        {tabs.map((t, i) => (
          <button key={t} className={tab === i ? "active" : ""} onClick={() => go(i)}>
            {i + 1}. {t}
          </button>
        ))}
      </nav>

      <div id="rt-section-0" className="rt-summary">
        <Card title="Sprint Goal">
          <div className="rt-goal">
            <p>{sprint?.goal || "No sprint goal defined for this sprint."}</p>
            <strong>
              <CheckCircle2 size={13} /> {completionPct >= 80 ? "Achieved" : `${completionPct}% Progress`}
            </strong>
            <Target className="rt-target" size={70} />
          </div>
        </Card>
        <Card title="Sprint Progress">
          <div className="rt-chart-row">
            <Ring value={completionPct} display={`${completionPct}%`} label="Completed" />
            <div className="rt-legend">
              <p><i className="green" /> Completed <b>{completedPoints} SP ({completionPct}%)</b></p>
              <p><i className="blue" /> In Progress <b>{inProgressPoints} SP</b></p>
              <p><i className="red" /> Not Completed <b>{notCompletedPoints} SP</b></p>
            </div>
          </div>
        </Card>
        <Card title="Team Participation">
          <div className="rt-chart-row">
            <Ring value={participationPct} display={String(uniqueContributors)} label="Contributors" color="#a75ae6" />
            <div className="rt-legend">
              <p><i className="purple" /> Active Contributors <b>{uniqueContributors} ({participationPct}%)</b></p>
              <p><i className="gray" /> Total Personnel <b>{totalTeamCount}</b></p>
              <p><i className="orange" /> Total Items <b>{ideas.good.length + ideas.bad.length + ideas.improve.length}</b></p>
            </div>
          </div>
        </Card>
        <Card title="Action Items">
          <div className="rt-action-stats">
            <p><CheckCircle2 color="#008b52" /> <strong>{actions.filter((a) => a.status === "Completed").length} Completed</strong></p>
            <p><Circle color="#e98b0a" /> <strong>{actions.filter((a) => a.status === "In Progress").length} In Progress</strong></p>
            <p><Circle color="#0754f9" /> <strong>{actions.filter((a) => a.status === "Planned").length} Planned</strong></p>
          </div>
        </Card>
        <Card title="Team Sentiment">
          <div className="rt-chart-row">
            <Ring
              value={sentimentStats.pct}
              display={sentimentStats.rating > 0 ? String(sentimentStats.rating) : "—"}
              label="/ 5"
            />
            <div className="rt-ratings">
              <p><ThumbsUp size={11} /> Went Well <b>{ideas.good.length}</b></p>
              <p><Lightbulb size={11} /> To Improve <b>{ideas.improve.length}</b></p>
              <p><ThumbsDown size={11} /> Challenges <b>{ideas.bad.length}</b></p>
            </div>
          </div>
          <strong className="rt-positive">{sentimentStats.label}</strong>
        </Card>
      </div>

      <div className="rt-middle">
        {ideaColumn("good", "What Went Well?")}
        {ideaColumn("bad", "What Didn't Go Well?")}
        {ideaColumn("improve", "What Can We Improve?")}
        <Card id="rt-section-3" title="Action Items" action={<span className="rt-count">{actions.length}</span>}>
          <div className="rt-table-wrap">
            <table className="rt-table">
              <thead>
                <tr><th>Action Item</th><th>Owner</th><th>Due Date</th><th>Status</th><th>Priority</th></tr>
              </thead>
              <tbody>
                {actions.length ? (
                  actions.map((a, i) => (
                    <tr key={`${a.id || a.title}-${i}`}>
                      <td>{a.title}</td>
                      <td>{a.owner}</td>
                      <td>{a.due}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => toggleActionStatus(i)}
                          title="Click to cycle status"
                          style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                        >
                          <span className={`rt-pill ${a.status === "Completed" ? "rt-green" : a.status === "Planned" ? "rt-blue" : "rt-orange"}`}>
                            {a.status}
                          </span>
                        </button>
                      </td>
                      <td><span className={`rt-pill rt-${a.priority.toLowerCase()}`}>{a.priority}</span></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "16px", color: "#667085" }}>
                      No action items recorded yet. Click &apos;Add Action Item&apos; below.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <button className="rt-add" onClick={() => setModal("action")}><Plus size={12} /> Add Action Item</button>
        </Card>
      </div>

      <div className="rt-analytics">
        <Card id="rt-section-4" title="Sprint Metrics">
          <div className="rt-table-wrap">
            <table className="rt-table">
              <thead><tr><th>Metric</th><th>Planned</th><th>Actual</th><th>Variance</th><th>Status</th></tr></thead>
              <tbody>
                {metricRows.map((m) => (
                  <tr key={m[0]}>
                    {m.slice(0, 4).map((c, i) => <td key={i}>{c}</td>)}
                    <td><span className="rt-pill rt-green">{m[4]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Burndown Chart">
          <Burndown
            totalPoints={totalPoints}
            completedPoints={completedPoints}
            startDate={sprint?.startDate}
            endDate={sprint?.endDate}
          />
        </Card>
        <Card id="rt-section-5" title="Team Feedback Summary">
          <div className="rt-chart-row">
            <Ring
              value={sentimentStats.pct}
              display={String(ideas.good.length + ideas.bad.length + ideas.improve.length)}
              label="Notes"
            />
            <div className="rt-legend">
              <p><i className="green" /> Positives <b>{ideas.good.length}</b></p>
              <p><i className="blue" /> Improvements <b>{ideas.improve.length}</b></p>
              <p><i className="red" /> Challenges <b>{ideas.bad.length}</b></p>
            </div>
          </div>
          <p>Sentiment Score: <strong>{sentimentStats.rating > 0 ? `${sentimentStats.rating} / 5` : "No entries yet"}</strong></p>
          <button className="rt-add" onClick={() => setModal("good")}><Plus size={12} /> Add Feedback</button>
        </Card>
        <Card id="rt-section-6" title="Attachments & References">
          <div className="rt-file-list">
            {files.length === 0 ? (
              <p style={{ padding: "12px", color: "#667085", fontSize: "13px" }}>
                No attachments uploaded for this retrospective yet.
              </p>
            ) : (
              files.map((f) => (
                <div key={f.name}>
                  <FileText size={13} />
                  <span>{f.name}</span>
                  <small>{f.size}</small>
                  <button
                    aria-label={`Download ${f.name}`}
                    onClick={() => {
                      const file = uploadedFiles[f.name];
                      if (!file) {
                        showNotice("Re-upload file in current session to download locally.");
                        return;
                      }
                      const url = URL.createObjectURL(file);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = file.name;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
          <input
            ref={fileRef}
            hidden
            type="file"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const nextFiles = [...files, { name: f.name, size: `${Math.ceil(f.size / 1024)} KB`, uploadedAt: new Date().toISOString() }];
              setFiles(nextFiles);
              setUploadedFiles((prev) => ({ ...prev, [f.name]: f }));
              e.target.value = "";
              await persistRetrospective({ attachments: nextFiles });
              showNotice(`Attachment "${f.name}" recorded.`);
            }}
          />
          <button className="rt-add" onClick={() => fileRef.current?.click()}><Plus size={12} /> Add Attachment</button>
        </Card>
      </div>

      <div id="rt-section-7" className="rt-bottom">
        <Card title="Facilitator Summary">
          <textarea
            aria-label="Facilitator summary"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleSaveNotes}
            placeholder="Write facilitator notes, sprint reflections, and key takeaways..."
          />
          <p><strong>{facilitator}</strong></p>
          <small>Last updated: {completedOnStr}</small>
        </Card>
        <Card title="Next Sprint Focus Areas">
          <ul className="rt-checks">
            {focusAreas.length > 0 ? (
              focusAreas.map((s, idx) => (
                <li key={`${s}-${idx}`}><CheckCircle2 size={13} />{s}</li>
              ))
            ) : (
              <li style={{ color: "#667085" }}>No focus areas added yet.</li>
            )}
          </ul>
          <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
            <input
              value={newFocus}
              onChange={(e) => setNewFocus(e.target.value)}
              placeholder="Add focus area..."
              style={{ flex: 1, padding: "6px 8px", border: "1px solid #d7dfee", borderRadius: "6px", fontSize: "12px" }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddFocusArea();
              }}
            />
            <button className="rt-add" style={{ marginTop: 0 }} onClick={handleAddFocusArea}>
              <Plus size={12} /> Add
            </button>
          </div>
        </Card>
        <Card title="Next Sprint Preview">
          {nextSprint ? (
            <>
              <div className="rt-next">
                <span>Sprint Code</span><strong>{nextSprint.sprintCode}</strong>
                <span>Sprint Name</span><strong>{nextSprint.name}</strong>
                <span>Planned Dates</span><strong>{nextSprint.start} - {nextSprint.end}</strong>
                <span>Sprint Goal</span><strong>{nextSprint.goal || "Goal not defined yet."}</strong>
              </div>
              <Link className="rt-next-button" href={`/sprints/${nextSprint._id || nextSprint.sprintCode}/planning`}>
                Plan Next Sprint →
              </Link>
            </>
          ) : (
            <>
              <div className="rt-next">
                <span>Status</span><strong>No upcoming sprint scheduled</strong>
                <span>Action</span><strong>Create your next sprint to continue delivery</strong>
              </div>
              <Link className="rt-next-button" href="/sprints/new">
                Create Next Sprint →
              </Link>
            </>
          )}
        </Card>
        <Card title="Next Steps">
          <ul className="rt-checks">
            <li><CheckCircle2 size={13} />Capture sprint feedback &amp; lessons learned</li>
            <li>{actions.length > 0 ? <CheckCircle2 size={13} /> : <Circle size={13} />}Track action items ({actions.length}) for next sprint</li>
            <li>{notes.trim() ? <CheckCircle2 size={13} /> : <Circle size={13} />}Finalize facilitator summary</li>
            <li>{closed ? <CheckCircle2 size={13} /> : <Circle size={13} />}Close retrospective</li>
          </ul>
          <button className="rt-next-button" onClick={toggleClosed} disabled={saving}>
            {closed ? "Reopen Retrospective" : "Close Retrospective"}
          </button>
        </Card>
      </div>

      {modal && (
        <div className="rt-modal-overlay" onClick={() => setModal(null)}>
          <div className="rt-modal" role="dialog" aria-modal="true" aria-label="Add retrospective item" onClick={(e) => e.stopPropagation()}>
            <div className="rt-modal-head">
              <h3>{modal === "action" ? "Add Action Item" : "Add Retrospective Item"}</h3>
              <button onClick={() => setModal(null)}><X size={17} /></button>
            </div>
            <label>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter description" autoFocus />
            </label>
            <label>
              Owner
              <select value={owner} onChange={(e) => setOwner(e.target.value)}>
                {personnel.length === 0 && <option value={facilitator}>{facilitator}</option>}
                {personnel.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </label>
            {modal === "action" && (
              <>
                <label>
                  Due Date
                  <input type="date" value={actionDue} onChange={(e) => setActionDue(e.target.value)} />
                </label>
                <label>
                  Priority
                  <select value={actionPriority} onChange={(e) => setActionPriority(e.target.value as ActionItem["priority"])}>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </label>
              </>
            )}
            <div className="rt-modal-buttons">
              <button onClick={() => setModal(null)}>Cancel</button>
              <button className="rt-primary" onClick={saveItem} disabled={!title.trim() || saving}>
                {saving ? "Saving..." : "Save Item"}
              </button>
            </div>
          </div>
        </div>
      )}
      {notice && (
        <div className="rt-toast" role="status">
          {notice}
          <button onClick={() => setNotice("")}><X size={14} /></button>
        </div>
      )}
    </main>
  );
}
