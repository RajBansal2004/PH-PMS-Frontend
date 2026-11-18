"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Clock3,
  FileText,
  Flag,
  GripVertical,
  Info,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  requirements as getRequirements,
  tasks as getTasks,
  updateTask as apiUpdateTask,
  employees as getEmployees,
  getOrganizationAudit,
} from "@/lib/api";
import { sprintApi, type Sprint } from "@/lib/sprints/api";
import "./sprint-planning.css";

type BacklogItem = {
  id: string;
  backendId?: string;
  title: string;
  type: "Requirement" | "Task";
  module: string;
  priority: "High" | "Medium" | "Low";
  points: number;
  status: string;
};

type TeamMember = {
  id: string;
  name: string;
  role: string;
  availability: number;
  capacity: number;
  committed: number;
  initials: string;
};

type Dependency = {
  id: number;
  type: "Requirement" | "Task";
  itemId: string;
  title: string;
  dependsOn: string;
  impact: "High" | "Medium" | "Low";
};

type Risk = {
  id: number;
  type: "Risk" | "Assumption";
  description: string;
  impact: "High" | "Medium" | "Low";
  probability: "High" | "Medium" | "Low";
  owner: string;
};

type TabKey =
  | "scope"
  | "team"
  | "schedule"
  | "dependencies"
  | "risks"
  | "review";

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "scope", label: "1. Scope & Backlog", icon: ClipboardCheck },
  { key: "team", label: "2. Team & Capacity", icon: Users },
  { key: "schedule", label: "3. Schedule", icon: CalendarDays },
  { key: "dependencies", label: "4. Dependencies", icon: Layers },
  { key: "risks", label: "5. Risks & Assumptions", icon: ShieldAlert },
  { key: "review", label: "6. Review & Commit", icon: CheckCircle2 },
];

function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`sp-badge sp-${tone.toLowerCase().replaceAll(" ", "-")}`}>{children}</span>;
}

function Panel({
  title,
  children,
  action,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`sp-panel ${className}`}>
      <div className="sp-panel-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function SprintPlanning({ sprintId }: { sprintId: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("scope");
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [allSprints, setAllSprints] = useState<Sprint[]>([]);
  const [backlog, setBacklog] = useState<BacklogItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [activities, setActivities] = useState<[string, string][]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [standupTime, setStandupTime] = useState("09:30");
  const [timeZone, setTimeZone] = useState("(GMT+05:30) India Standard Time");
  const [workingDays, setWorkingDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [toast, setToast] = useState("");
  const [showDependencyForm, setShowDependencyForm] = useState(false);
  const [showRiskForm, setShowRiskForm] = useState(false);
  const [dependencyItem, setDependencyItem] = useState("");
  const [dependencyOn, setDependencyOn] = useState("");
  const [riskDescription, setRiskDescription] = useState("");
  const [riskOwner, setRiskOwner] = useState("");
  const [riskType, setRiskType] = useState<"Risk" | "Assumption">("Risk");
  const [riskImpact, setRiskImpact] = useState<"High" | "Medium" | "Low">("Medium");
  const [riskProbability, setRiskProbability] = useState<"High" | "Medium" | "Low">("Medium");
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showAllBacklog, setShowAllBacklog] = useState(false);

  const getInitials = (name: string) => {
    if (!name) return "TM";
    return name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resolvedRes, rRes, tRes, eRes, pRes, aRes] = await Promise.allSettled([
          sprintApi.resolve(sprintId, ["PLANNED", "ACTIVE", "COMPLETED"]),
          getRequirements(),
          getTasks(),
          getEmployees().catch(() => []),
          sprintApi.getPersonnel(),
          getOrganizationAudit({ limit: 10 }).catch(() => ({ items: [] })),
        ]);

        let matchedSprint: Sprint | null = null;
        if (resolvedRes.status === "fulfilled") {
          setAllSprints(resolvedRes.value.allSprints);
          matchedSprint = resolvedRes.value.sprint;
        }

        if (matchedSprint) {
          setSprint(matchedSprint);
          if (matchedSprint.startDate) {
            setStartDate(matchedSprint.startDate);
          }
          if (matchedSprint.endDate) {
            setEndDate(matchedSprint.endDate);
          }
        }

        const sprintKey = matchedSprint?._id || sprintId;
        const prelinkedIds: string[] = [];

        // Backlog items from Requirements & Tasks
        const backlogItems: BacklogItem[] = [];
        if (rRes.status === "fulfilled") {
          const rawR: any = rRes.value;
          const rList = Array.isArray(rawR) ? rawR : rawR?.data || rawR?.items || [];
          rList.forEach((r: any) => {
            backlogItems.push({
              id: r.reqId || r.requirementCode || r.code || `REQ-${String(r._id || r.id).slice(-3).toUpperCase()}`,
              backendId: r._id || r.id,
              title: r.title || "Untitled Requirement",
              type: "Requirement",
              module: r.module || r.category || "General",
              priority: (r.priority || "Medium") as "High" | "Medium" | "Low",
              points: Number(r.storyPoints || r.points || 5),
              status: r.status || "Draft",
            });
          });
        }

        if (tRes.status === "fulfilled") {
          const rawT: any = tRes.value;
          const tList = Array.isArray(rawT) ? rawT : rawT?.data || rawT?.items || [];
          tList.forEach((t: any) => {
            const code = t.taskId || t.code || `TSK-${String(t._id || t.id).slice(-3).toUpperCase()}`;
            backlogItems.push({
              id: code,
              backendId: t._id || t.id,
              title: t.title || "Untitled Task",
              type: "Task",
              module: t.module || "General",
              priority: (t.priority || "Medium") as "High" | "Medium" | "Low",
              points: Number(t.storyPoints || (t.estimatedHours ? Math.round(t.estimatedHours / 4) : 3)),
              status: t.status || "Open",
            });
            if (t.sprintId === sprintKey || t.sprintId?._id === sprintKey || t.sprint === sprintKey) {
              prelinkedIds.push(code);
            }
          });
        }
        setBacklog(backlogItems);

        // Team from Employees + Users via sprintApi.getPersonnel()
        const teamMap = new Map<string, TeamMember>();
        if (eRes.status === "fulfilled") {
          const rawE: any = eRes.value;
          const eList = Array.isArray(rawE) ? rawE : rawE?.data || rawE?.items || [];
          eList.forEach((emp: any) => {
            const empName = emp.name || emp.fullName || [emp.firstName, emp.lastName].filter(Boolean).join(" ");
            if (empName) {
              teamMap.set(empName, {
                id: emp._id || emp.id,
                name: empName,
                role: emp.designation?.name || emp.designation || emp.role || "Developer",
                availability: 100,
                capacity: 80,
                committed: 0,
                initials: getInitials(empName),
              });
            }
          });
        }
        if (pRes.status === "fulfilled") {
          (pRes.value || []).forEach((person) => {
            if (person.name && !teamMap.has(person.name)) {
              teamMap.set(person.name, {
                id: person.id,
                name: person.name,
                role: person.email || "Team Member",
                availability: 100,
                capacity: 80,
                committed: 0,
                initials: getInitials(person.name),
              });
            }
          });
        }
        const mappedTeam = Array.from(teamMap.values());
        const savedPlanning = matchedSprint?.planning || {};
        if (Array.isArray(savedPlanning.team) && savedPlanning.team.length > 0) {
          const savedById = new Map<string, any>(savedPlanning.team.map((m: any) => [m.name, m]));
          setTeam(
            mappedTeam.map((m) => {
              const saved = savedById.get(m.name);
              return saved
                ? {
                    ...m,
                    availability: Number(saved.availability ?? m.availability),
                    capacity: Number(saved.capacity ?? m.capacity),
                    committed: Number(saved.committed ?? m.committed),
                  }
                : m;
            })
          );
        } else {
          setTeam(mappedTeam);
        }

        if (mappedTeam.length > 0) {
          setRiskOwner(mappedTeam[0].name);
        }

        // Audit Activity
        if (aRes.status === "fulfilled") {
          const rawA: any = aRes.value;
          const aList = Array.isArray(rawA) ? rawA : rawA?.data || rawA?.items || [];
          const mappedAudit: [string, string][] = aList.map((item: any) => [
            item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Today",
            `${item.performedByName || item.userName || "User"} ${item.action || "updated"} ${item.entityName || item.entityType || "Sprint"}`,
          ]);
          setActivities(mappedAudit);
        }

        // Restore saved planning state from backend first, then fallback to prelinked tasks
        const mergedSelected = Array.from(
          new Set([
            ...(Array.isArray(savedPlanning.selectedIds) ? savedPlanning.selectedIds : []),
            ...prelinkedIds,
          ])
        );
        if (mergedSelected.length > 0) setSelectedIds(mergedSelected);
        if (Array.isArray(savedPlanning.dependencies)) setDependencies(savedPlanning.dependencies);
        if (Array.isArray(savedPlanning.risks)) setRisks(savedPlanning.risks);
        if (Array.isArray(savedPlanning.workingDays) && savedPlanning.workingDays.length > 0) {
          setWorkingDays(savedPlanning.workingDays);
        }
        if (savedPlanning.standupTime) setStandupTime(savedPlanning.standupTime);
        if (savedPlanning.timeZone) setTimeZone(savedPlanning.timeZone);
      } catch (err: any) {
        notify(`Failed to fetch planning data: ${err?.message || "Server error"}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sprintId]);

  const sprintName = sprint?.name || `Sprint ${sprintId}`;
  const milestoneName = sprint?.milestoneName || "Not Linked";
  const sprintOwner = sprint?.ownerName || "Unassigned";
  const sprintPriority = sprint?.priority || "Medium";

  const selectedItems = useMemo(
    () => backlog.filter((item) => selectedIds.includes(item.id)),
    [backlog, selectedIds]
  );

  const totalPoints = selectedItems.reduce((sum, item) => sum + item.points, 0);
  const requirementPoints = selectedItems
    .filter((item) => item.type === "Requirement")
    .reduce((sum, item) => sum + item.points, 0);
  const taskPoints = selectedItems
    .filter((item) => item.type === "Task")
    .reduce((sum, item) => sum + item.points, 0);
  const totalCapacity = team.reduce((sum, member) => sum + member.capacity, 0);
  const committedCapacity = team.reduce((sum, member) => sum + member.committed, 0);
  const remainingCapacity = Math.max(0, totalCapacity - committedCapacity);
  const utilization = totalCapacity ? Math.round((committedCapacity / totalCapacity) * 100) : 0;
  const duration = startDate && endDate
    ? Math.max(0, Math.round((new Date(`${endDate}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) / 86400000) + 1)
    : 0;
  const workingDayCount = duration
    ? Array.from({ length: duration }, (_, index) => {
        const date = new Date(`${startDate}T00:00:00`);
        date.setDate(date.getDate() + index);
        return date;
      }).filter((date) => workingDays.includes(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()])).length
    : 0;

  const filteredBacklog = backlog.filter((item) => {
    const matchesSearch = `${item.id} ${item.title} ${item.module}`.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "All" || item.type === typeFilter;
    const matchesPriority = priorityFilter === "All" || item.priority === priorityFilter;
    return matchesSearch && matchesType && matchesPriority;
  });

  const toggleSelected = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const toggleWorkingDay = (day: string) => {
    setWorkingDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day]
    );
  };

  const addDependency = () => {
    if (!dependencyItem || !dependencyOn || dependencyItem === dependencyOn) {
      notify("Select two different backlog items.");
      return;
    }
    const item = backlog.find((entry) => entry.id === dependencyItem);
    if (!item) return;

    setDependencies((current) => [
      ...current,
      {
        id: Date.now(),
        type: item.type,
        itemId: item.id,
        title: item.title,
        dependsOn: dependencyOn,
        impact: "Medium",
      },
    ]);
    setDependencyItem("");
    setDependencyOn("");
    setShowDependencyForm(false);
    notify("Dependency added.");
  };

  const addRisk = () => {
    if (!riskDescription.trim()) {
      notify("Enter a risk or assumption description.");
      return;
    }
    setRisks((current) => [
      ...current,
      {
        id: Date.now(),
        type: riskType,
        description: riskDescription.trim(),
        impact: riskImpact,
        probability: riskProbability,
        owner: riskOwner || "Team",
      },
    ]);
    setRiskDescription("");
    setShowRiskForm(false);
    notify(`${riskType} added.`);
  };

  const buildPlanningPayload = () => ({
    selectedIds,
    team: team.map((m) => ({
      id: m.id,
      name: m.name,
      availability: m.availability,
      capacity: m.capacity,
      committed: m.committed,
    })),
    dependencies,
    risks,
    workingDays,
    standupTime,
    timeZone,
    updatedAt: new Date().toISOString(),
  });

  const saveDraft = async () => {
    try {
      if (sprint?._id) {
        await sprintApi.update(sprint._id, {
          startDate: startDate ? new Date(`${startDate}T00:00:00`).toISOString() : undefined,
          endDate: endDate ? new Date(`${endDate}T00:00:00`).toISOString() : undefined,
          capacity: totalCapacity || sprint.capacity,
          plannedStoryPoints: totalPoints,
          planning: buildPlanningPayload(),
        });
      }
      notify("Sprint planning draft saved to database.");
    } catch (err: any) {
      notify(`Could not save planning draft: ${err?.message || "API error"}`);
    }
  };

  const recalculate = () => notify("Sprint capacity and story point totals recalculated.");

  const reviewAndStart = () => {
    if (!selectedIds.length) {
      notify("Select at least one backlog item before review.");
      setActiveTab("scope");
      return;
    }
    if (!startDate || !endDate || new Date(endDate) < new Date(startDate)) {
      notify("Please enter a valid sprint schedule.");
      setActiveTab("schedule");
      return;
    }
    setActiveTab("review");
  };

  const confirmSprintPlan = async () => {
    try {
      if (sprint?._id) {
        await sprintApi.update(sprint._id, {
          status: "ACTIVE",
          startDate: startDate ? new Date(`${startDate}T00:00:00`).toISOString() : undefined,
          endDate: endDate ? new Date(`${endDate}T00:00:00`).toISOString() : undefined,
          capacity: totalCapacity || sprint.capacity,
          plannedStoryPoints: totalPoints,
          planning: buildPlanningPayload(),
        });

        // Link selected tasks directly to this sprint
        const selectedTasks = selectedItems.filter((item) => item.type === "Task" && item.backendId);
        if (selectedTasks.length > 0) {
          await Promise.allSettled(
            selectedTasks.map((t) => apiUpdateTask(t.backendId!, { sprintId: sprint._id }))
          );
        }
      }
      notify("Sprint plan committed successfully. Sprint is now Active.");
    } catch (err: any) {
      notify(`Could not commit sprint plan: ${err?.message || "API error"}`);
    }
  };

  const formatDate = (value: string) =>
    value
      ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  const renderScope = () => (
    <>
      <div className="sp-scope-grid">
        <Panel title="Select Backlog Items">
          <div className="sp-filter-row">
            <div className="sp-search-box">
              <Search size={13} />
              <input
                aria-label="Search requirements and tasks"
                placeholder="Search requirements / tasks..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option>All</option>
              <option>Requirement</option>
              <option>Task</option>
            </select>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
              <option>All</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th><input type="checkbox" aria-label="Select all visible items" checked={filteredBacklog.length > 0 && filteredBacklog.every((item) => selectedIds.includes(item.id))} onChange={(event) => {
                    const visibleIds = filteredBacklog.map((item) => item.id);
                    setSelectedIds((current) => event.target.checked
                      ? Array.from(new Set([...current, ...visibleIds]))
                      : current.filter((id) => !visibleIds.includes(id)));
                  }} /></th>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Module</th>
                  <th>Priority</th>
                  <th>Story Points</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(showAllBacklog ? filteredBacklog : filteredBacklog.slice(0, 10)).map((item) => (
                  <tr key={item.id}>
                    <td><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelected(item.id)} /></td>
                    <td className="sp-link">{item.id}</td>
                    <td>{item.title}</td>
                    <td>{item.type}</td>
                    <td>{item.module}</td>
                    <td><Badge tone={item.priority}>{item.priority}</Badge></td>
                    <td>{item.points} SP</td>
                    <td><Badge tone={item.status}>{item.status}</Badge></td>
                  </tr>
                ))}
                {!filteredBacklog.length && <tr><td colSpan={8} className="sp-empty">No backlog items found. Create requirements or tasks to plan this sprint.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="sp-table-footer">
            <span>Showing {Math.min(showAllBacklog ? filteredBacklog.length : 10, filteredBacklog.length)} of {filteredBacklog.length} items</span>
            {filteredBacklog.length > 10 && (
              <button className="sp-text-button" onClick={() => setShowAllBacklog((value) => !value)}>
                {showAllBacklog ? "Show Less" : "Show All"}
              </button>
            )}
            <strong>Selected Story Points: {totalPoints} SP</strong>
          </div>
        </Panel>

        <Panel
          title={`Sprint Backlog (${selectedItems.length} Items)`}
          action={<button className="sp-light-button" onClick={() => setSelectedIds([])}>Clear All</button>}
        >
          <div className="sp-table-wrap">
            <table className="sp-table sp-selected-table">
              <thead>
                <tr><th></th><th>ID</th><th>Title</th><th>Type</th><th>Story Points</th><th></th></tr>
              </thead>
              <tbody>
                {selectedItems.map((item) => (
                  <tr key={item.id}>
                    <td><GripVertical size={12} className="sp-grip" /></td>
                    <td className="sp-link">{item.id}</td>
                    <td>{item.title}</td>
                    <td>{item.type}</td>
                    <td>{item.points} SP</td>
                    <td><button className="sp-remove-button" aria-label={`Remove ${item.id}`} onClick={() => toggleSelected(item.id)}><X size={13} /></button></td>
                  </tr>
                ))}
                {!selectedItems.length && <tr><td colSpan={6} className="sp-empty">No items selected. Choose items from the backlog.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="sp-selected-total">
            <strong>Total Story Points</strong>
            <strong>{totalPoints} SP</strong>
          </div>
        </Panel>
      </div>

      <div className="sp-lower-grid">
        <Panel title="Team & Capacity Overview">
          {team.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#6b7280" }}>No employees found in directory.</div>
          ) : (
            <div className="sp-table-wrap">
              <table className="sp-table sp-team-table">
                <thead>
                  <tr><th>Member</th><th>Role</th><th>Availability</th><th>Capacity (h)</th><th>Committed (h)</th><th>Utilization</th></tr>
                </thead>
                <tbody>
                  {team.map((member) => (
                    <tr key={member.id}>
                      <td><span className="sp-person"><span className="sp-avatar">{member.initials}</span>{member.name}</span></td>
                      <td>{member.role}</td>
                      <td>{member.availability}%</td>
                      <td>{member.capacity}h</td>
                      <td>{member.committed}h</td>
                      <td>
                        <span className="sp-utilization">
                          <span className="sp-progress"><span className="sp-fill-green" style={{ width: `${Math.min(100, member.committed / Math.max(1, member.capacity) * 100)}%` }} /></span>
                          {Math.round(member.committed / Math.max(1, member.capacity) * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={3}>Total</td><td>{totalCapacity}h</td><td>{committedCapacity}h</td><td>{utilization}%</td></tr></tfoot>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Capacity vs Commitment" action={<Info size={13} />}>
          {(() => {
            const maxCap = Math.max(100, Math.ceil(Math.max(totalCapacity, committedCapacity) / 100) * 100);
            const ticks = [maxCap, Math.round(maxCap * 0.75), Math.round(maxCap * 0.5), Math.round(maxCap * 0.25), 0];
            return (
              <div className="sp-chart">
                <div className="sp-chart-axis">{ticks.map((t) => <span key={t}>{t}</span>)}</div>
                <div className="sp-chart-area">
                  <div className="sp-chart-column">
                    <strong>{totalCapacity}h</strong>
                    <span className="sp-chart-bar blue" style={{ height: `${Math.min(100, (totalCapacity / maxCap) * 100)}%` }} />
                    <small>Total Capacity</small>
                  </div>
                  <div className="sp-chart-column">
                    <strong>{committedCapacity}h</strong>
                    <span className="sp-chart-bar green" style={{ height: `${Math.min(100, (committedCapacity / maxCap) * 100)}%` }} />
                    <small>Committed Capacity</small>
                  </div>
                </div>
              </div>
            );
          })()}
          <div className="sp-chart-legend"><span><i className="blue" />Total Capacity</span><span><i className="green" />Committed Capacity</span></div>
          <div className="sp-remaining"><span>Remaining Capacity</span><strong>{remainingCapacity}h</strong></div>
        </Panel>

        <div className="sp-dependency-risk-stack">
          <Panel title="Dependencies" action={<button className="sp-light-button" onClick={() => setShowDependencyForm((value) => !value)}><Plus size={11} /> Add Dependency</button>}>
            {showDependencyForm && (
              <div className="sp-inline-form">
                <label>Item<select value={dependencyItem} onChange={(event) => setDependencyItem(event.target.value)}><option value="">Select item</option>{backlog.map((item) => <option key={item.id} value={item.id}>{item.id} — {item.title}</option>)}</select></label>
                <label>Depends On<select value={dependencyOn} onChange={(event) => setDependencyOn(event.target.value)}><option value="">Select predecessor</option>{backlog.map((item) => <option key={item.id} value={item.id}>{item.id} — {item.title}</option>)}</select></label>
                <button className="sp-primary-button" onClick={addDependency}>Add</button>
              </div>
            )}
            <div className="sp-table-wrap">
              <table className="sp-table sp-compact-table">
                <thead><tr><th>Type</th><th>ID</th><th>Title</th><th>Dependency On</th><th>Impact</th><th></th></tr></thead>
                <tbody>
                  {dependencies.map((item) => (
                    <tr key={item.id}><td>{item.type}</td><td className="sp-link">{item.itemId}</td><td>{item.title}</td><td>{item.dependsOn}</td><td><Badge tone={item.impact}>{item.impact}</Badge></td><td><button className="sp-remove-button" onClick={() => setDependencies((current) => current.filter((entry) => entry.id !== item.id))}><X size={12} /></button></td></tr>
                  ))}
                  {!dependencies.length && <tr><td colSpan={6} className="sp-empty">No dependencies added.</td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Risks & Assumptions" action={<button className="sp-light-button" onClick={() => setShowRiskForm((value) => !value)}><Plus size={11} /> Add Risk</button>}>
            {showRiskForm && (
              <div className="sp-inline-form">
                <label>Type<select value={riskType} onChange={(event) => setRiskType(event.target.value as "Risk" | "Assumption")}><option>Risk</option><option>Assumption</option></select></label>
                <label>Description<input value={riskDescription} onChange={(event) => setRiskDescription(event.target.value)} placeholder="Describe risk or assumption" /></label>
                <label>Impact<select value={riskImpact} onChange={(event) => setRiskImpact(event.target.value as Risk["impact"])}><option>High</option><option>Medium</option><option>Low</option></select></label>
                <label>Probability<select value={riskProbability} onChange={(event) => setRiskProbability(event.target.value as Risk["probability"])}><option>High</option><option>Medium</option><option>Low</option></select></label>
                <label>Owner<select value={riskOwner} onChange={(event) => setRiskOwner(event.target.value)}>{team.map((member) => <option key={member.id}>{member.name}</option>)}</select></label>
                <button className="sp-primary-button" onClick={addRisk}>Add</button>
              </div>
            )}
            <div className="sp-table-wrap">
              <table className="sp-table sp-compact-table">
                <thead><tr><th>Type</th><th>Description</th><th>Impact</th><th>Probability</th><th>Owner</th><th></th></tr></thead>
                <tbody>
                  {risks.map((risk) => (
                    <tr key={risk.id}><td>{risk.type}</td><td>{risk.description}</td><td><Badge tone={risk.impact}>{risk.impact}</Badge></td><td><Badge tone={risk.probability}>{risk.probability}</Badge></td><td>{risk.owner}</td><td><button className="sp-remove-button" onClick={() => setRisks((current) => current.filter((item) => item.id !== risk.id))}><X size={12} /></button></td></tr>
                  ))}
                  {!risks.length && <tr><td colSpan={6} className="sp-empty">No risks or assumptions added.</td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );

  const renderTeam = () => (
    <div className="sp-tab-panel">
      <Panel title="Team & Capacity Management">
        <p className="sp-muted">Manage team availability, planned hours and sprint commitments.</p>
        <div className="sp-table-wrap">
          <table className="sp-table sp-team-table">
            <thead><tr><th>Member</th><th>Role</th><th>Availability %</th><th>Capacity (Hours)</th><th>Committed (Hours)</th><th>Utilization</th></tr></thead>
            <tbody>
              {team.map((member) => (
                <tr key={member.id}>
                  <td><span className="sp-person"><span className="sp-avatar">{member.initials}</span>{member.name}</span></td>
                  <td>{member.role}</td>
                  <td><input className="sp-number-input" type="number" min="0" max="100" value={member.availability} onChange={(event) => setTeam((current) => current.map((person) => person.id === member.id ? { ...person, availability: Number(event.target.value) } : person))} /></td>
                  <td><input className="sp-number-input" type="number" min="0" value={member.capacity} onChange={(event) => setTeam((current) => current.map((person) => person.id === member.id ? { ...person, capacity: Number(event.target.value) } : person))} /></td>
                  <td><input className="sp-number-input" type="number" min="0" value={member.committed} onChange={(event) => setTeam((current) => current.map((person) => person.id === member.id ? { ...person, committed: Number(event.target.value) } : person))} /></td>
                  <td>{Math.round(member.committed / Math.max(1, member.capacity) * 100)}%</td>
                </tr>
              ))}
              {!team.length && <tr><td colSpan={6} className="sp-empty">No team members available. Add employees to allocate capacity.</td></tr>}
            </tbody>
            <tfoot><tr><td colSpan={3}>Total</td><td>{totalCapacity}h</td><td>{committedCapacity}h</td><td>{utilization}%</td></tr></tfoot>
          </table>
        </div>
      </Panel>
      <div className="sp-stat-row">
        <div>Total Team Members<strong>{team.length}</strong></div>
        <div>Total Capacity<strong>{totalCapacity}h</strong></div>
        <div>Committed Capacity<strong>{committedCapacity}h</strong></div>
        <div>Remaining Capacity<strong>{remainingCapacity}h</strong></div>
      </div>
    </div>
  );

  const renderSchedule = () => (
    <div className="sp-tab-panel">
      <Panel title="Sprint Schedule & Working Calendar">
        <div className="sp-form-grid">
          <label>Start Date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label>End Date<input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} /></label>
          <label>Daily Stand-up Time<input type="time" value={standupTime} onChange={(event) => setStandupTime(event.target.value)} /></label>
          <label>Time Zone<select value={timeZone} onChange={(event) => setTimeZone(event.target.value)}><option>(GMT+05:30) India Standard Time</option><option>(GMT+00:00) UTC</option><option>(GMT-05:00) Eastern Time</option></select></label>
        </div>
        <h3>Working Days</h3>
        <div className="sp-working-days">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <button key={day} className={workingDays.includes(day) ? "active" : ""} onClick={() => toggleWorkingDay(day)}>{day}</button>
          ))}
        </div>
      </Panel>
      <div className="sp-stat-row">
        <div>Calendar Duration<strong>{duration} Days</strong></div>
        <div>Working Days<strong>{workingDayCount} Days</strong></div>
        <div>Daily Stand-up<strong>{standupTime}</strong></div>
        <div>Team Capacity<strong>{totalCapacity}h</strong></div>
      </div>
    </div>
  );

  const renderDependencies = () => (
    <div className="sp-tab-panel">
      <Panel title="Sprint Dependencies" action={<button className="sp-light-button" onClick={() => setShowDependencyForm((value) => !value)}><Plus size={12} /> Add Dependency</button>}>
        {showDependencyForm && (
          <div className="sp-inline-form">
            <label>Item<select value={dependencyItem} onChange={(event) => setDependencyItem(event.target.value)}><option value="">Select item</option>{backlog.map((item) => <option key={item.id} value={item.id}>{item.id} — {item.title}</option>)}</select></label>
            <label>Depends On<select value={dependencyOn} onChange={(event) => setDependencyOn(event.target.value)}><option value="">Select predecessor</option>{backlog.map((item) => <option key={item.id} value={item.id}>{item.id} — {item.title}</option>)}</select></label>
            <button className="sp-primary-button" onClick={addDependency}>Add Dependency</button>
          </div>
        )}
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead><tr><th>Type</th><th>Item ID</th><th>Title</th><th>Depends On</th><th>Impact</th><th>Action</th></tr></thead>
            <tbody>
              {dependencies.map((item) => (
                <tr key={item.id}><td>{item.type}</td><td className="sp-link">{item.itemId}</td><td>{item.title}</td><td>{item.dependsOn}</td><td><Badge tone={item.impact}>{item.impact}</Badge></td><td><button className="sp-remove-button" onClick={() => setDependencies((current) => current.filter((entry) => entry.id !== item.id))}><Trash2 size={13} /></button></td></tr>
              ))}
              {!dependencies.length && <tr><td colSpan={6} className="sp-empty">No dependencies added yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Dependency Guidance">
        <p className="sp-muted">Define predecessor relationships before committing the sprint. Ensure that dependent work is sequenced correctly and that no circular dependency is introduced.</p>
      </Panel>
    </div>
  );

  const renderRisks = () => (
    <div className="sp-tab-panel">
      <Panel title="Risks & Assumptions Register" action={<button className="sp-light-button" onClick={() => setShowRiskForm((value) => !value)}><Plus size={12} /> Add Risk / Assumption</button>}>
        {showRiskForm && (
          <div className="sp-inline-form">
            <label>Type<select value={riskType} onChange={(event) => setRiskType(event.target.value as "Risk" | "Assumption")}><option>Risk</option><option>Assumption</option></select></label>
            <label>Description<input value={riskDescription} onChange={(event) => setRiskDescription(event.target.value)} placeholder="Describe the risk or assumption" /></label>
            <label>Impact<select value={riskImpact} onChange={(event) => setRiskImpact(event.target.value as Risk["impact"])}><option>High</option><option>Medium</option><option>Low</option></select></label>
            <label>Probability<select value={riskProbability} onChange={(event) => setRiskProbability(event.target.value as Risk["probability"])}><option>High</option><option>Medium</option><option>Low</option></select></label>
            <label>Owner<select value={riskOwner} onChange={(event) => setRiskOwner(event.target.value)}>{team.map((member) => <option key={member.id}>{member.name}</option>)}</select></label>
            <button className="sp-primary-button" onClick={addRisk}>Add</button>
          </div>
        )}
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead><tr><th>Type</th><th>Description</th><th>Impact</th><th>Probability</th><th>Owner</th><th>Action</th></tr></thead>
            <tbody>
              {risks.map((risk) => (
                <tr key={risk.id}><td>{risk.type}</td><td>{risk.description}</td><td><Badge tone={risk.impact}>{risk.impact}</Badge></td><td><Badge tone={risk.probability}>{risk.probability}</Badge></td><td>{risk.owner}</td><td><button className="sp-remove-button" onClick={() => setRisks((current) => current.filter((item) => item.id !== risk.id))}><Trash2 size={13} /></button></td></tr>
              ))}
              {!risks.length && <tr><td colSpan={6} className="sp-empty">No risks or assumptions added yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Risk Review">
        <div className="sp-stat-row">
          <div>Total Risks<strong>{risks.filter((risk) => risk.type === "Risk").length}</strong></div>
          <div>Assumptions<strong>{risks.filter((risk) => risk.type === "Assumption").length}</strong></div>
          <div>High Impact<strong>{risks.filter((risk) => risk.impact === "High").length}</strong></div>
        </div>
      </Panel>
    </div>
  );

  const renderReview = () => (
    <div className="sp-tab-panel">
      <Panel title="Review & Commit Sprint">
        <div className="sp-review-content">
          <div className="sp-stat-row">
            <div>Sprint Story Points<strong>{totalPoints} SP</strong></div>
            <div>Selected Backlog Items<strong>{selectedItems.length}</strong></div>
            <div>Team Capacity<strong>{totalCapacity}h</strong></div>
            <div>Committed Capacity<strong>{committedCapacity}h</strong></div>
          </div>
          <div className="sp-form-grid">
            <label>Sprint Code<input value={sprint?.sprintCode || sprintId.toUpperCase()} readOnly /></label>
            <label>Sprint Name<input value={sprintName} readOnly /></label>
            <label>Milestone<input value={milestoneName} readOnly /></label>
            <label>Sprint Owner<input value={sprintOwner} readOnly /></label>
            <label>Start Date<input value={formatDate(startDate)} readOnly /></label>
            <label>End Date<input value={formatDate(endDate)} readOnly /></label>
          </div>
          <h3>Planning Checklist</h3>
          <div className="sp-checklist">
            <div><CheckCircle2 className="sp-check-done" size={14} /> Sprint scope defined</div>
            <div>{selectedItems.length ? <CheckCircle2 className="sp-check-done" size={14} /> : <Circle size={14} />} Backlog items selected ({selectedItems.length})</div>
            <div>{totalCapacity > 0 ? <CheckCircle2 className="sp-check-done" size={14} /> : <Circle size={14} />} Team capacity checked</div>
            <div>{dependencies.length ? <CheckCircle2 className="sp-check-done" size={14} /> : <Circle size={14} />} Dependencies reviewed</div>
            <div>{risks.length ? <CheckCircle2 className="sp-check-done" size={14} /> : <Circle size={14} />} Risks captured</div>
          </div>
          <button className="sp-primary-button" onClick={confirmSprintPlan}>
            <Check size={13} /> Confirm & Activate Sprint Plan
          </button>
        </div>
      </Panel>
    </div>
  );

  return (
    <main className="sprint-planning">
      <div className="sp-page-toolbar">
        <nav className="sp-breadcrumb">
          <Link href="/sprints">Sprint Management</Link>
          <ChevronRight size={13} />
          <Link href="/sprints">Sprint Registry</Link>
          <ChevronRight size={13} />
          <strong>Sprint Planning ({sprint?.sprintCode || sprintId.toUpperCase()})</strong>
        </nav>
        <div className="sp-toolbar-actions">
          {allSprints.length > 0 && (
            <select
              aria-label="Switch Sprint"
              value={sprint?._id || sprint?.id || ""}
              onChange={(e) => {
                if (e.target.value) router.push(`/sprints/${encodeURIComponent(e.target.value)}/planning`);
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
          <button onClick={saveDraft}><Save size={12} /> Save as Draft</button>
          <button onClick={recalculate}><RefreshCw size={12} /> Recalculate</button>
          <button className="sp-primary-button" onClick={reviewAndStart}><ClipboardCheck size={12} /> Review & Start</button>
        </div>
      </div>

      <div className="sp-title">
        <FileText size={24} />
        <div>
          <h1>Sprint Planning ({sprint?.sprintCode || sprintId.toUpperCase()}) <Badge tone="planning">{sprint?.status || "Planning"}</Badge></h1>
          <p>Plan and commit the work for the sprint including scope, team, capacity and schedule.</p>
        </div>
      </div>

      <section className="sp-overview">
        <div className="sp-overview-cell"><span>Sprint</span><strong><CalendarDays size={13} /> {sprint?.sprintCode || sprintId.toUpperCase()}</strong></div>
        <div className="sp-overview-cell"><span>Milestone</span><strong>{milestoneName}</strong></div>
        <div className="sp-overview-cell"><span>Sprint Name</span><strong>{sprintName}</strong></div>
        <div className="sp-overview-cell"><span>Sprint Type</span><strong>{sprint?.type || "Development"}</strong></div>
        <div className="sp-overview-cell"><span>Planned Dates</span><strong>{formatDate(startDate)} – {formatDate(endDate)}</strong><small>{duration} Days</small></div>
        <div className="sp-overview-cell"><span>Status</span><strong><Badge tone="planning">{sprint?.status || "Planning"}</Badge></strong></div>
        <div className="sp-overview-cell"><span>Sprint Owner</span><strong>{sprintOwner}</strong></div>
        <div className="sp-overview-cell"><span>Total Story Points</span><strong>{totalPoints} SP</strong></div>
        <div className="sp-overview-cell"><span>Total Tasks</span><strong>{selectedItems.length}</strong></div>
        <div className="sp-overview-cell"><span>Capacity (Team)</span><strong>{totalCapacity}h</strong></div>
        <div className="sp-overview-cell"><span>Committed</span><strong>{committedCapacity}h <em>{utilization}%</em></strong></div>
      </section>

      <div className="sp-dashboard">
        <div className="sp-main-column">
          <nav className="sp-tabs" aria-label="Sprint planning sections">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button key={key} className={activeTab === key ? "active" : ""} onClick={() => setActiveTab(key)}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </nav>

          {activeTab === "scope" && renderScope()}
          {activeTab === "team" && renderTeam()}
          {activeTab === "schedule" && renderSchedule()}
          {activeTab === "dependencies" && renderDependencies()}
          {activeTab === "risks" && renderRisks()}
          {activeTab === "review" && renderReview()}
        </div>

        <aside className="sp-right-column">
          <Panel title="Sprint Summary" action={<button className="sp-icon-button" onClick={() => setActiveTab("scope")} aria-label="Edit sprint"><Pencil size={13} /></button>}>
            <div className="sp-summary-list">
              <div><span>Sprint Code</span><strong>{sprint?.sprintCode || sprintId.toUpperCase()}</strong></div>
              <div><span>Sprint Name</span><strong>{sprintName}</strong></div>
              <div><span>Milestone</span><strong>{milestoneName}</strong></div>
              <div><span>Sprint Owner</span><strong>{sprintOwner}</strong></div>
              <div><span>Priority</span><strong><i className="sp-priority-dot" /> {sprintPriority}</strong></div>
              <div><span>Planned Dates</span><strong>{formatDate(startDate)} – {formatDate(endDate)}</strong></div>
              <div><span>Working Days</span><strong>{workingDayCount} Days</strong></div>
              <div><span>Total Story Points</span><strong>{totalPoints} SP</strong></div>
              <div><span>Total Backlog Items</span><strong>{selectedItems.length}</strong></div>
              <div><span>Status</span><strong><Badge tone="planning">{sprint?.status || "Planning"}</Badge></strong></div>
            </div>
          </Panel>

          <Panel title="Story Points Distribution">
            <div className="sp-donut-layout">
              <div className="sp-donut" style={{ background: `conic-gradient(#0754f9 0 ${totalPoints ? (requirementPoints / totalPoints) * 100 : 0}%, #078b53 ${totalPoints ? (requirementPoints / totalPoints) * 100 : 0}% 100%)` }}>
                <div><strong>{totalPoints}</strong><span>Total SP</span></div>
              </div>
              <div className="sp-donut-legend">
                <div><i className="blue" /><span>Requirement</span><strong>{requirementPoints} SP ({totalPoints ? Math.round((requirementPoints / totalPoints) * 100) : 0}%)</strong></div>
                <div><i className="green" /><span>Task</span><strong>{taskPoints} SP ({totalPoints ? Math.round((taskPoints / totalPoints) * 100) : 0}%)</strong></div>
              </div>
            </div>
            <div className="sp-scope-health"><strong>Scope Health</strong><span className="sp-progress"><span className="sp-fill-green" style={{ width: `${Math.min(100, utilization)}%` }} /></span><strong>{utilization}%</strong><em>{utilization <= 85 ? "Good" : "High Load"}</em></div>
          </Panel>

          <Panel title="Sprint Planning Activity" action={<button className="sp-text-button" onClick={() => setShowAllActivity((value) => !value)}>{showAllActivity ? "Show Less" : "View All"}</button>}>
            {activities.length === 0 ? (
              <div style={{ padding: "16px", color: "#6b7280", textAlign: "center", fontSize: "12px" }}>No recent audit activity.</div>
            ) : (
              <div className="sp-activity-list">
                {(showAllActivity ? activities : activities.slice(0, 4)).map(([date, description], index) => (
                  <div key={index}><strong>{date}</strong><span>{description}</span></div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Planning Checklist">
            <div className="sp-checklist">
              <div><CheckCircle2 className="sp-check-done" size={14} /> Sprint scope defined</div>
              <div>{selectedItems.length ? <CheckCircle2 className="sp-check-done" size={14} /> : <Circle size={14} />} Backlog items selected</div>
              <div>{totalCapacity > 0 ? <CheckCircle2 className="sp-check-done" size={14} /> : <Circle size={14} />} Capacity checked</div>
              <div>{dependencies.length ? <CheckCircle2 className="sp-check-done" size={14} /> : <Circle size={14} />} Dependencies identified</div>
              <div>{risks.length ? <CheckCircle2 className="sp-check-done" size={14} /> : <Circle size={14} />} Risks captured</div>
              <div>{activeTab === "review" ? <CheckCircle2 className="sp-check-done" size={14} /> : <Circle size={14} />} Review & commit</div>
            </div>
          </Panel>
        </aside>
      </div>

      {toast && <div className="sp-toast"><Info size={15} />{toast}<button onClick={() => setToast("")}><X size={14} /></button></div>}
    </main>
  );
}
