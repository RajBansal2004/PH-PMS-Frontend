"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Plus,
  Download,
  RefreshCw,
  Edit3,
  Trash2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from "lucide-react";
import {
  orgWorkspaceApi,
  type WorkingCalendarItem,
  type CalendarsListResponse,
  type HolidayItem,
} from "@/lib/organization/workspaceApi";
import "@/components/organization/org-workspace.css";

const ALL_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DOW_HEADER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_BY_INDEX = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function OrganizationCalendarsPage() {
  const currentYear = new Date().getFullYear();
  const [data, setData] = useState<CalendarsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedCalId, setSelectedCalId] = useState<string>("");

  const [viewMonth, setViewMonth] = useState(() => new Date(currentYear, new Date().getMonth(), 1));

  // Calendar Modal
  const [calModalOpen, setCalModalOpen] = useState(false);
  const [editingCal, setEditingCal] = useState<WorkingCalendarItem | null>(null);
  const [calForm, setCalForm] = useState<{
    name: string;
    locationId: string;
    calendarType: "STANDARD" | "REGIONAL" | "CLIENT";
    year: number;
    description: string;
    workingDays: string[];
    workStartTime: string;
    workEndTime: string;
    breakMinutes: number;
    dailyWorkHours: number;
    isDefault: boolean;
    status: "ACTIVE" | "INACTIVE";
    seedStandardHolidays: boolean;
  }>({
    name: "",
    locationId: "",
    calendarType: "STANDARD",
    year: currentYear,
    description: "",
    workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
    workStartTime: "09:30",
    workEndTime: "18:30",
    breakMinutes: 60,
    dailyWorkHours: 8,
    isDefault: false,
    status: "ACTIVE",
    seedStandardHolidays: true,
  });

  // Holiday Modal
  const [holModalOpen, setHolModalOpen] = useState(false);
  const [holForm, setHolForm] = useState<{
    date: string;
    name: string;
    type: HolidayItem["type"];
    repeat: HolidayItem["repeat"];
    notes: string;
  }>({
    date: `${currentYear}-01-01`,
    name: "",
    type: "GAZETTED",
    repeat: "YEARLY",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await orgWorkspaceApi.listCalendars({
        search: search || undefined,
        year: yearFilter !== "ALL" ? yearFilter : undefined,
        calendarType: typeFilter !== "ALL" ? typeFilter : undefined,
      });
      setData(res);
      setSelectedCalId((prev) => {
        if (prev && res.items.some((c) => c._id === prev)) return prev;
        return res.items[0]?._id || "";
      });
    } catch (e: any) {
      setError(e?.message || "Failed to load calendars");
    } finally {
      setLoading(false);
    }
  }, [search, yearFilter, typeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = data?.items || [];
  const selectedCal = useMemo(
    () => items.find((c) => c._id === selectedCalId) || items[0] || null,
    [items, selectedCalId]
  );

  // Sync calendar month year when user picks a calendar from a different year
  useEffect(() => {
    if (selectedCal && viewMonth.getFullYear() !== selectedCal.year) {
      setViewMonth(new Date(selectedCal.year, new Date().getMonth(), 1));
    }
  }, [selectedCal?.year, selectedCal?._id]);

  const monthCells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayIso = new Date().toISOString().slice(0, 10);

    const workingSet = new Set(
      (selectedCal?.workingDays || ["MON", "TUE", "WED", "THU", "FRI"]).map((d) => d.toUpperCase())
    );
    const holByDate = new Map<string, HolidayItem[]>();
    for (const h of selectedCal?.holidays || []) {
      const key = String(h.date).slice(0, 10);
      const list = holByDate.get(key) || [];
      list.push(h);
      holByDate.set(key, list);
    }

    const cells: Array<{
      key: string;
      day: number | null;
      iso: string;
      isToday: boolean;
      isWeekend: boolean;
      holidays: HolidayItem[];
    }> = [];

    for (let i = 0; i < firstDow; i++) {
      cells.push({ key: `pad-${i}`, day: null, iso: "", isToday: false, isWeekend: false, holidays: [] });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dow = DAY_BY_INDEX[dt.getDay()];
      cells.push({
        key: iso,
        day: d,
        iso,
        isToday: iso === todayIso,
        isWeekend: !workingSet.has(dow),
        holidays: holByDate.get(iso) || [],
      });
    }
    return cells;
  }, [viewMonth, selectedCal]);

  const openCreateCal = () => {
    setEditingCal(null);
    setCalForm({
      name: "",
      locationId: "",
      calendarType: "STANDARD",
      year: currentYear,
      description: "",
      workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
      workStartTime: "09:30",
      workEndTime: "18:30",
      breakMinutes: 60,
      dailyWorkHours: 8,
      isDefault: false,
      status: "ACTIVE",
      seedStandardHolidays: true,
    });
    setCalModalOpen(true);
  };

  const openEditCal = (cal: WorkingCalendarItem) => {
    setEditingCal(cal);
    setCalForm({
      name: cal.name,
      locationId: cal.locationId || "",
      calendarType: cal.calendarType,
      year: cal.year,
      description: cal.description || "",
      workingDays: cal.workingDays?.length ? cal.workingDays : ["MON", "TUE", "WED", "THU", "FRI"],
      workStartTime: cal.workStartTime || "09:30",
      workEndTime: cal.workEndTime || "18:30",
      breakMinutes: cal.breakMinutes ?? 60,
      dailyWorkHours: cal.dailyWorkHours ?? 8,
      isDefault: Boolean(cal.isDefault),
      status: cal.status,
      seedStandardHolidays: false,
    });
    setCalModalOpen(true);
  };

  const toggleWorkingDay = (day: string) => {
    setCalForm((prev) => {
      const exists = prev.workingDays.includes(day);
      const next = exists
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day];
      return { ...prev, workingDays: next.length ? next : prev.workingDays };
    });
  };

  const saveCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calForm.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...calForm,
        locationId: calForm.locationId || null,
      };
      if (editingCal) {
        await orgWorkspaceApi.updateCalendar(editingCal._id, payload);
        setNotice(`Calendar "${calForm.name}" updated.`);
      } else {
        const created = await orgWorkspaceApi.createCalendar(payload);
        setSelectedCalId(created._id);
        setNotice(`Calendar "${calForm.name}" created.`);
      }
      setCalModalOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to save calendar");
    } finally {
      setSaving(false);
    }
  };

  const removeCalendar = async (cal: WorkingCalendarItem) => {
    if (!window.confirm(`Delete calendar "${cal.name}" (${cal.year})?`)) return;
    try {
      await orgWorkspaceApi.deleteCalendar(cal._id);
      setNotice(`Calendar "${cal.name}" deleted.`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to delete calendar");
    }
  };

  const saveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCal || !holForm.name.trim() || !holForm.date) return;
    setSaving(true);
    setError(null);
    try {
      await orgWorkspaceApi.addHoliday(selectedCal._id, holForm);
      setNotice(`Holiday "${holForm.name}" added to ${selectedCal.name}.`);
      setHolModalOpen(false);
      setHolForm({ date: `${selectedCal.year}-01-01`, name: "", type: "GAZETTED", repeat: "YEARLY", notes: "" });
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to add holiday");
    } finally {
      setSaving(false);
    }
  };

  const seedHolidays = async () => {
    if (!selectedCal) return;
    try {
      await orgWorkspaceApi.addHoliday(selectedCal._id, { seedStandard: true });
      setNotice(`Standard Indian holidays synced for ${selectedCal.name}.`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to seed holidays");
    }
  };

  const removeHoliday = async (hol: HolidayItem) => {
    if (!selectedCal) return;
    try {
      await orgWorkspaceApi.deleteHoliday(selectedCal._id, hol._id);
      setNotice(`Removed holiday "${hol.name}".`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to remove holiday");
    }
  };

  const exportCsv = () => {
    if (!selectedCal) return;
    const header = ["Calendar", "Year", "Date", "Holiday Name", "Type", "Repeat", "Status"];
    const rows = (selectedCal.holidays || []).map((h) => [
      selectedCal.name,
      selectedCal.year,
      h.date,
      h.name,
      h.type,
      h.repeat,
      h.status,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedCal.calendarCode || "holiday-calendar"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const s = data?.summary;

  return (
    <div className="ow-page">
      <div className="ow-header">
        <div>
          <div className="ow-breadcrumb">Organization / Holiday &amp; Working Calendars (ORG-005)</div>
          <h1 className="ow-title">
            <CalendarDays size={18} color="#0755e9" />
            Holiday &amp; Working Calendars
          </h1>
          <div className="ow-subtitle">
            Manage regional working weeks, office timings &amp; gazetted/optional holiday schedules synced across timesheets &amp; dashboards
          </div>
        </div>
        <div className="ow-actions">
          <button type="button" className="ow-btn" onClick={exportCsv} disabled={!selectedCal}>
            <Download size={13} /> Export Holidays CSV
          </button>
          <button type="button" className="ow-btn" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button type="button" className="ow-btn ow-btn-primary" onClick={openCreateCal}>
            <Plus size={14} /> New Calendar
          </button>
        </div>
      </div>

      {error && <div className="ow-banner-err">{error}</div>}
      {notice && <div className="ow-banner-ok">{notice}</div>}

      {/* KPI Strip */}
      <div className="ow-kpi-grid">
        <div className="ow-kpi-card">
          <div className="ow-kpi-label">Total Calendars</div>
          <div className="ow-kpi-value">{s?.totalCalendars ?? "—"}</div>
        </div>
        <div className="ow-kpi-card">
          <div className="ow-kpi-label">Active Calendars</div>
          <div className="ow-kpi-value">{s?.activeCalendars ?? "—"}</div>
        </div>
        <div className="ow-kpi-card">
          <div className="ow-kpi-label">Locations Covered</div>
          <div className="ow-kpi-value">{s?.locationsCovered ?? "—"}</div>
        </div>
        <div className="ow-kpi-card">
          <div className="ow-kpi-label">Total Holidays</div>
          <div className="ow-kpi-value">{s?.totalHolidays ?? "—"}</div>
        </div>
        <div className="ow-kpi-card">
          <div className="ow-kpi-label">Upcoming Holidays</div>
          <div className="ow-kpi-value">{s?.upcomingHolidays ?? "—"}</div>
        </div>
        <div className="ow-kpi-card">
          <div className="ow-kpi-label">Avg Working Days / Yr</div>
          <div className="ow-kpi-value">{s?.workingDays ?? "—"}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="ow-toolbar">
        <div className="ow-filters">
          <input
            className="ow-input"
            style={{ width: 220 }}
            placeholder="Search calendar name, code, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="ow-select" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="ALL">All Years</option>
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
          <select className="ow-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="ALL">All Calendar Types</option>
            <option value="STANDARD">Standard</option>
            <option value="REGIONAL">Regional</option>
            <option value="CLIENT">Client Calendar</option>
          </select>
        </div>
      </div>

      {/* Split Workspace: Calendar List + Interactive Month Preview & Holidays Table */}
      <div className="ow-cal-split">
        <div className="ow-card">
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>Configured Calendars ({items.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((cal) => (
              <div
                key={cal._id}
                className={`ow-cal-list-item ${selectedCal?._id === cal._id ? "active" : ""}`}
                onClick={() => setSelectedCalId(cal._id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                  <strong style={{ fontSize: 12.5 }}>{cal.name}</strong>
                  <span className="ow-badge ow-badge-blue">{cal.year}</span>
                </div>
                <div style={{ fontSize: 11, color: "#475569" }}>
                  {cal.locationName} · {cal.calendarType}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 2 }}>
                  {cal.isDefault && <span className="ow-badge ow-badge-green">Default</span>}
                  <span className="ow-badge ow-badge-amber">{cal.stats.totalHolidays} Holidays</span>
                  <span className="ow-badge ow-badge-slate">{cal.stats.workingDaysCount} Working Days</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, fontSize: 10.5, color: "#64748b" }}>
                  <span>
                    <Clock size={10} style={{ display: "inline", marginRight: 3 }} />
                    {cal.workStartTime}–{cal.workEndTime} ({cal.dailyWorkHours}h)
                  </span>
                  <div style={{ display: "flex", gap: 5 }} onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="ow-btn" style={{ height: 23, padding: "0 7px", fontSize: 10.5 }} onClick={() => openEditCal(cal)}>
                      <Edit3 size={11} />
                    </button>
                    <button type="button" className="ow-btn ow-btn-danger" style={{ height: 23, padding: "0 7px", fontSize: 10.5 }} onClick={() => void removeCalendar(cal)}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!items.length && !loading && (
              <div style={{ textAlign: "center", padding: 18, color: "#64748b", fontSize: 11.5 }}>
                No working calendars found.
              </div>
            )}
          </div>
        </div>

        {/* Right Detail Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {selectedCal ? (
            <>
              <div className="ow-card">
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      {selectedCal.name}{" "}
                      <span className="ow-badge ow-badge-slate">{selectedCal.calendarCode}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                      Location: <strong>{selectedCal.locationName}</strong> · Working Days:{" "}
                      <strong>{selectedCal.workingDays.join(", ")}</strong> · Hours:{" "}
                      <strong>{selectedCal.workStartTime}–{selectedCal.workEndTime}</strong> (Break {selectedCal.breakMinutes}m)
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button
                      type="button"
                      className="ow-btn"
                      onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <strong style={{ fontSize: 12, minWidth: 110, textAlign: "center" }}>
                      {viewMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                    </strong>
                    <button
                      type="button"
                      className="ow-btn"
                      onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>

                {/* Monthly Calendar Grid */}
                <div className="ow-month-grid">
                  {DOW_HEADER.map((d) => (
                    <div key={d} className="ow-month-dow">{d}</div>
                  ))}
                  {monthCells.map((c) => (
                    <div
                      key={c.key}
                      className={`ow-month-cell ${
                        c.day === null
                          ? "muted"
                          : c.holidays.length
                          ? "holiday"
                          : c.isWeekend
                          ? "weekend"
                          : ""
                      } ${c.isToday ? "today" : ""}`}
                    >
                      <span style={{ fontWeight: c.isToday ? 800 : 600 }}>{c.day ?? ""}</span>
                      {c.holidays.map((h) => (
                        <span key={h._id} className="ow-hol-pill" title={`${h.name} (${h.type})`}>
                          {h.name}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Holiday List */}
              <div className="ow-card">
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                    Scheduled Holidays ({selectedCal.holidays.length})
                  </div>
                  <div style={{ display: "flex", gap: 7 }}>
                    <button type="button" className="ow-btn" onClick={() => void seedHolidays()}>
                      <Sparkles size={13} color="#d97706" /> Seed Standard Indian Holidays
                    </button>
                    <button
                      type="button"
                      className="ow-btn ow-btn-primary"
                      onClick={() => {
                        setHolForm({
                          date: `${selectedCal.year}-01-26`,
                          name: "",
                          type: "GAZETTED",
                          repeat: "YEARLY",
                          notes: "",
                        });
                        setHolModalOpen(true);
                      }}
                    >
                      <Plus size={13} /> Add Holiday
                    </button>
                  </div>
                </div>

                <div className="ow-table-wrap">
                  <table className="ow-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Holiday Name</th>
                        <th>Type</th>
                        <th>Recurrence</th>
                        <th>Notes</th>
                        <th style={{ textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCal.holidays.map((h) => (
                        <tr key={h._id}>
                          <td><strong>{h.date}</strong></td>
                          <td>{h.name}</td>
                          <td>
                            <span
                              className={`ow-badge ${
                                h.type === "GAZETTED"
                                  ? "ow-badge-amber"
                                  : h.type === "OPTIONAL"
                                  ? "ow-badge-blue"
                                  : "ow-badge-purple"
                              }`}
                            >
                              {h.type}
                            </span>
                          </td>
                          <td>{h.repeat}</td>
                          <td style={{ color: "#64748b" }}>{h.notes || "—"}</td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className="ow-btn ow-btn-danger"
                              style={{ height: 24, padding: "0 7px" }}
                              onClick={() => void removeHoliday(h)}
                            >
                              <Trash2 size={11} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!selectedCal.holidays.length && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", padding: 20, color: "#64748b" }}>
                            No holidays added yet. Click &quot;Add Holiday&quot; or &quot;Seed Standard Indian Holidays&quot;.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="ow-card" style={{ textAlign: "center", padding: 36, color: "#64748b" }}>
              Select a calendar on the left or create a new Working Calendar.
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Calendar Modal */}
      {calModalOpen && (
        <div className="ow-modal-backdrop" role="dialog" aria-modal="true">
          <form className="ow-modal" onSubmit={saveCalendar}>
            <div className="ow-modal-head">
              <strong>{editingCal ? `Edit Calendar — ${editingCal.name}` : "Create Working & Holiday Calendar"}</strong>
              <button type="button" className="ow-btn" style={{ height: 26, padding: "0 6px" }} onClick={() => setCalModalOpen(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="ow-modal-body">
              <div className="ow-form-grid">
                <div className="ow-field full">
                  <label>Calendar Name *</label>
                  <input
                    className="ow-input"
                    required
                    placeholder="e.g. India Standard Corporate Calendar 2026"
                    value={calForm.name}
                    onChange={(e) => setCalForm({ ...calForm, name: e.target.value })}
                  />
                </div>
                <div className="ow-field">
                  <label>Assigned Location</label>
                  <select
                    className="ow-select"
                    value={calForm.locationId}
                    onChange={(e) => setCalForm({ ...calForm, locationId: e.target.value })}
                  >
                    <option value="">All Locations (Organization-wide)</option>
                    {(data?.locations || []).map((l) => (
                      <option key={l._id} value={l._id}>
                        {l.locationCode} — {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ow-field">
                  <label>Calendar Type</label>
                  <select
                    className="ow-select"
                    value={calForm.calendarType}
                    onChange={(e) => setCalForm({ ...calForm, calendarType: e.target.value as any })}
                  >
                    <option value="STANDARD">Standard Corporate</option>
                    <option value="REGIONAL">Regional / Branch</option>
                    <option value="CLIENT">Client Calendar</option>
                  </select>
                </div>
                <div className="ow-field">
                  <label>Calendar Year</label>
                  <input
                    className="ow-input"
                    type="number"
                    min={2020}
                    max={2035}
                    value={calForm.year}
                    onChange={(e) => setCalForm({ ...calForm, year: Number(e.target.value) })}
                  />
                </div>
                <div className="ow-field">
                  <label>Status</label>
                  <select
                    className="ow-select"
                    value={calForm.status}
                    onChange={(e) => setCalForm({ ...calForm, status: e.target.value as any })}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div className="ow-field full">
                  <label>Working Days</label>
                  <div className="ow-day-chips">
                    {ALL_DAYS.map((d) => (
                      <button
                        type="button"
                        key={d}
                        className={`ow-day-chip ${calForm.workingDays.includes(d) ? "active" : ""}`}
                        onClick={() => toggleWorkingDay(d)}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="ow-field">
                  <label>Work Start Time</label>
                  <input
                    className="ow-input"
                    type="time"
                    value={calForm.workStartTime}
                    onChange={(e) => setCalForm({ ...calForm, workStartTime: e.target.value })}
                  />
                </div>
                <div className="ow-field">
                  <label>Work End Time</label>
                  <input
                    className="ow-input"
                    type="time"
                    value={calForm.workEndTime}
                    onChange={(e) => setCalForm({ ...calForm, workEndTime: e.target.value })}
                  />
                </div>
                <div className="ow-field">
                  <label>Break Duration (mins)</label>
                  <input
                    className="ow-input"
                    type="number"
                    min={0}
                    max={180}
                    value={calForm.breakMinutes}
                    onChange={(e) => setCalForm({ ...calForm, breakMinutes: Number(e.target.value) })}
                  />
                </div>
                <div className="ow-field">
                  <label>Standard Daily Hours</label>
                  <input
                    className="ow-input"
                    type="number"
                    min={1}
                    max={16}
                    value={calForm.dailyWorkHours}
                    onChange={(e) => setCalForm({ ...calForm, dailyWorkHours: Number(e.target.value) })}
                  />
                </div>
                <div className="ow-field full">
                  <label>Description</label>
                  <textarea
                    className="ow-textarea"
                    rows={2}
                    value={calForm.description}
                    onChange={(e) => setCalForm({ ...calForm, description: e.target.value })}
                  />
                </div>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                <input
                  type="checkbox"
                  checked={calForm.isDefault}
                  onChange={(e) => setCalForm({ ...calForm, isDefault: e.target.checked })}
                />
                Set as Default Organization Calendar
              </label>

              {!editingCal && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                  <input
                    type="checkbox"
                    checked={calForm.seedStandardHolidays}
                    onChange={(e) => setCalForm({ ...calForm, seedStandardHolidays: e.target.checked })}
                  />
                  Auto-populate Standard Indian Public Holidays for {calForm.year}
                </label>
              )}
            </div>
            <div className="ow-modal-foot">
              <button type="button" className="ow-btn" onClick={() => setCalModalOpen(false)}>Cancel</button>
              <button type="submit" className="ow-btn ow-btn-primary" disabled={saving}>
                {saving ? "Saving..." : editingCal ? "Save Changes" : "Create Calendar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Holiday Modal */}
      {holModalOpen && (
        <div className="ow-modal-backdrop" role="dialog" aria-modal="true">
          <form className="ow-modal" style={{ maxWidth: 460 }} onSubmit={saveHoliday}>
            <div className="ow-modal-head">
              <strong>Add Holiday to {selectedCal?.name}</strong>
              <button type="button" className="ow-btn" style={{ height: 26, padding: "0 6px" }} onClick={() => setHolModalOpen(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="ow-modal-body">
              <div className="ow-form-grid">
                <div className="ow-field">
                  <label>Date *</label>
                  <input
                    className="ow-input"
                    type="date"
                    required
                    value={holForm.date}
                    onChange={(e) => setHolForm({ ...holForm, date: e.target.value })}
                  />
                </div>
                <div className="ow-field">
                  <label>Holiday Type</label>
                  <select
                    className="ow-select"
                    value={holForm.type}
                    onChange={(e) => setHolForm({ ...holForm, type: e.target.value as HolidayItem["type"] })}
                  >
                    <option value="GAZETTED">Gazetted (Mandatory)</option>
                    <option value="OPTIONAL">Optional</option>
                    <option value="RESTRICTED">Restricted</option>
                  </select>
                </div>
                <div className="ow-field full">
                  <label>Holiday Name *</label>
                  <input
                    className="ow-input"
                    required
                    placeholder="e.g. Diwali / Independence Day"
                    value={holForm.name}
                    onChange={(e) => setHolForm({ ...holForm, name: e.target.value })}
                  />
                </div>
                <div className="ow-field">
                  <label>Recurrence</label>
                  <select
                    className="ow-select"
                    value={holForm.repeat}
                    onChange={(e) => setHolForm({ ...holForm, repeat: e.target.value as HolidayItem["repeat"] })}
                  >
                    <option value="YEARLY">Yearly</option>
                    <option value="ONCE">One-Time</option>
                  </select>
                </div>
                <div className="ow-field">
                  <label>Notes</label>
                  <input
                    className="ow-input"
                    placeholder="Optional description"
                    value={holForm.notes}
                    onChange={(e) => setHolForm({ ...holForm, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="ow-modal-foot">
              <button type="button" className="ow-btn" onClick={() => setHolModalOpen(false)}>Cancel</button>
              <button type="submit" className="ow-btn ow-btn-primary" disabled={saving}>
                {saving ? "Adding..." : "Add Holiday"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
