"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Star,
  Trash2,
  Play,
  CalendarClock,
  Download,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Power,
} from "lucide-react";
import { reportsApi, formatShortDate, reportRouteForType } from "@/lib/reports/api";
import "@/components/reports/reports.css";

export default function SavedSchedulesExportsPage() {
  const [savedViews, setSavedViews] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [exportsLog, setExportsLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3500);
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sv, sc, ex] = await Promise.all([
        reportsApi.listSavedViews(),
        reportsApi.listSchedules(),
        reportsApi.listExports(),
      ]);
      setSavedViews(sv);
      setSchedules(sc);
      setExportsLog(ex);
    } catch (e: any) {
      setError(e?.message || "Failed to load saved reports & schedules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleToggleFav = async (id: string) => {
    try {
      const updated = await reportsApi.toggleFavoriteView(id);
      setSavedViews((prev) => prev.map((v) => (v._id === id ? updated : v)));
    } catch (e: any) {
      setError(e?.message || "Failed to toggle favorite");
    }
  };

  const handleDeleteView = async (id: string) => {
    if (!window.confirm("Delete this saved view?")) return;
    try {
      await reportsApi.deleteSavedView(id);
      setSavedViews((prev) => prev.filter((v) => v._id !== id));
      flash("Saved view deleted.");
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    }
  };

  const handleToggleSchedule = async (id: string) => {
    try {
      const updated = await reportsApi.toggleSchedule(id);
      setSchedules((prev) => prev.map((s) => (s._id === id ? updated : s)));
      flash(`Schedule ${updated.enabled ? "enabled" : "paused"}.`);
    } catch (e: any) {
      setError(e?.message || "Toggle failed");
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm("Delete this scheduled report?")) return;
    try {
      await reportsApi.deleteSchedule(id);
      setSchedules((prev) => prev.filter((s) => s._id !== id));
      flash("Schedule deleted.");
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    }
  };

  return (
    <div className="rpt-page">
      <div>
        <div className="rpt-breadcrumb">
          <Link href="/reports">Reports &amp; Analytics</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#10204a", fontWeight: 600 }}>Saved Views, Schedules &amp; Export Audit</span>
        </div>
        <div className="rpt-header">
          <div>
            <h1 className="rpt-title">Saved Views, Schedules &amp; Export Audit</h1>
            <p className="rpt-subtitle">
              Manage reusable report filter presets, automated report delivery schedules, and export compliance logs.
            </p>
          </div>
          <button type="button" className="rpt-btn" onClick={loadAll} disabled={loading}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Subnav */}
      <div className="rpt-subnav">
        <Link href="/reports" className="rpt-subnav-link">Report Center</Link>
        <Link href="/reports/projects" className="rpt-subnav-link">Project Performance</Link>
        <Link href="/reports/resources" className="rpt-subnav-link">Resource Utilization</Link>
        <Link href="/reports/timesheets" className="rpt-subnav-link">Timesheet &amp; Productivity</Link>
        <Link href="/reports/qa" className="rpt-subnav-link">QA &amp; Defect Analytics</Link>
        <Link href="/reports/saved" className="rpt-subnav-link active">Saved, Schedules &amp; Exports</Link>
      </div>

      {error && <div className="rpt-alert rpt-alert-err"><AlertTriangle size={14} /> <span>{error}</span></div>}
      {toast && <div className="rpt-alert rpt-alert-ok"><CheckCircle2 size={14} /> <span>{toast}</span></div>}

      {/* Saved Views */}
      <div className="rpt-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4", fontWeight: 700 }}>
          Saved Filter Views ({savedViews.length})
        </div>
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead>
              <tr><th>View Name</th><th>Category</th><th>Created By</th><th>Saved On</th><th style={{ textAlign: "right" }}>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="rpt-empty">Loading saved views...</td></tr>
              ) : savedViews.length === 0 ? (
                <tr><td colSpan={5} className="rpt-empty">No saved views yet. Open any analytics report and click <strong>Save View</strong>.</td></tr>
              ) : (
                savedViews.map((v) => (
                  <tr key={v._id}>
                    <td style={{ fontWeight: 700 }}>{v.name}</td>
                    <td><span className="rpt-badge rpt-badge-blue">{v.category}</span></td>
                    <td>{v.createdByName || "—"}</td>
                    <td style={{ color: "#64748b" }}>{formatShortDate(v.createdAt)}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <button type="button" className="rpt-btn rpt-btn-sm" onClick={() => handleToggleFav(v._id)} title="Favorite">
                          <Star size={11} color={v.isFavorite ? "#f59e0b" : "#94a3b8"} fill={v.isFavorite ? "#f59e0b" : "none"} />
                        </button>
                        <Link href={reportRouteForType(v.reportType)} className="rpt-btn rpt-btn-primary rpt-btn-sm">
                          <Play size={11} /> Run
                        </Link>
                        <button type="button" className="rpt-btn rpt-btn-danger rpt-btn-sm" onClick={() => handleDeleteView(v._id)}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scheduled Reports */}
      <div className="rpt-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <CalendarClock size={14} color="#0755e9" /> Scheduled Reports ({schedules.length})
        </div>
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead>
              <tr><th>Schedule Name</th><th>Cadence</th><th>Format</th><th>Recipients</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr><td colSpan={6} className="rpt-empty">No scheduled reports configured yet. Click <strong>Schedule</strong> inside any report.</td></tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 700 }}>{s.name}</td>
                    <td>{s.frequency} · {s.dayOfWeek} at {s.timeOfDay}</td>
                    <td><span className="rpt-badge rpt-badge-purple">{s.format}</span></td>
                    <td>{(s.recipients || []).join(", ") || "—"}</td>
                    <td><span className={s.enabled ? "rpt-badge rpt-badge-green" : "rpt-badge rpt-badge-slate"}>{s.enabled ? "Enabled" : "Paused"}</span></td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <button type="button" className="rpt-btn rpt-btn-sm" onClick={() => handleToggleSchedule(s._id)}>
                          <Power size={11} /> {s.enabled ? "Pause" : "Enable"}
                        </button>
                        <button type="button" className="rpt-btn rpt-btn-danger rpt-btn-sm" onClick={() => handleDeleteSchedule(s._id)}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Audit Log (RPT-Filters_Exports Panel 11) */}
      <div className="rpt-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #e3eaf4", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <Download size={14} color="#0755e9" /> Export Audit Log ({exportsLog.length})
        </div>
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead>
              <tr><th>Date &amp; Time</th><th>User</th><th>Report Name</th><th>Format</th><th>Rows</th><th>Status</th></tr>
            </thead>
            <tbody>
              {exportsLog.length === 0 ? (
                <tr><td colSpan={6} className="rpt-empty">No exports logged yet. Every CSV, JSON, or PDF export is automatically audited here.</td></tr>
              ) : (
                exportsLog.map((ex) => (
                  <tr key={ex._id}>
                    <td style={{ whiteSpace: "nowrap", color: "#64748b" }}>{formatShortDate(ex.exportedAt)}</td>
                    <td style={{ fontWeight: 600 }}>{ex.exportedByName || "—"}</td>
                    <td>{ex.reportName}</td>
                    <td><span className="rpt-badge rpt-badge-purple">{ex.format}</span></td>
                    <td>{ex.rowCount}</td>
                    <td><span className="rpt-badge rpt-badge-green">{ex.status}</span></td>
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
