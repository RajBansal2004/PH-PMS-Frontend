"use client";

import { useState } from "react";
import { Download, CalendarClock, BookmarkPlus, Printer, FileJson, CheckCircle2, AlertTriangle } from "lucide-react";
import { reportsApi } from "@/lib/reports/api";

interface Props {
  reportType: string;
  reportName: string;
  category: string;
  appliedFilters: Record<string, any>;
  onExportCsv: () => void;
  onExportJson: () => void;
  rowCount: number;
}

export function ReportToolbar({
  reportType,
  reportName,
  category,
  appliedFilters,
  onExportCsv,
  onExportJson,
  rowCount,
}: Props) {
  const [panel, setPanel] = useState<"none" | "save" | "schedule">("none");
  const [viewName, setViewName] = useState(reportName);
  const [schedFreq, setSchedFreq] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("WEEKLY");
  const [schedDay, setSchedDay] = useState("Monday");
  const [schedTime, setSchedTime] = useState("09:00");
  const [schedFmt, setSchedFmt] = useState<"PDF" | "CSV" | "XLSX">("PDF");
  const [schedRecipients, setSchedRecipients] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleSaveView = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewName.trim()) return;
    setBusy(true);
    try {
      await reportsApi.createSavedView({
        name: viewName.trim(),
        reportType,
        category,
        filters: appliedFilters,
      });
      setPanel("none");
      flash("ok", `Saved filter view "${viewName.trim()}".`);
    } catch (err: any) {
      flash("err", err?.message || "Failed to save view");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await reportsApi.createSchedule({
        name: `${reportName} (${schedFreq})`,
        reportType,
        frequency: schedFreq,
        dayOfWeek: schedDay,
        timeOfDay: schedTime,
        format: schedFmt,
        recipients: schedRecipients,
        filters: appliedFilters,
      });
      setPanel("none");
      setSchedRecipients("");
      flash("ok", `Scheduled ${schedFreq.toLowerCase()} ${schedFmt} delivery.`);
    } catch (err: any) {
      flash("err", err?.message || "Failed to create schedule");
    } finally {
      setBusy(false);
    }
  };

  const handlePrintPdf = () => {
    reportsApi
      .recordExport({
        reportType,
        reportName,
        format: "PDF",
        rowCount,
        appliedFilters,
      })
      .catch(() => {});
    window.print();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="rpt-actions">
        <button type="button" className="rpt-btn" onClick={() => setPanel(panel === "save" ? "none" : "save")}>
          <BookmarkPlus size={12} /> Save View
        </button>
        <button type="button" className="rpt-btn" onClick={() => setPanel(panel === "schedule" ? "none" : "schedule")}>
          <CalendarClock size={12} /> Schedule
        </button>
        <button type="button" className="rpt-btn" onClick={onExportJson}>
          <FileJson size={12} /> JSON
        </button>
        <button type="button" className="rpt-btn" onClick={handlePrintPdf}>
          <Printer size={12} /> Print / PDF
        </button>
        <button type="button" className="rpt-btn rpt-btn-primary" onClick={onExportCsv}>
          <Download size={12} /> Export CSV
        </button>
      </div>

      {msg && (
        <div className={`rpt-alert ${msg.type === "ok" ? "rpt-alert-ok" : "rpt-alert-err"}`}>
          {msg.type === "ok" ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
          <span>{msg.text}</span>
        </div>
      )}

      {panel === "save" && (
        <form onSubmit={handleSaveView} className="rpt-card" style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", background: "#f8fbff" }}>
          <div className="rpt-field" style={{ flex: 1, minWidth: 200 }}>
            <label>Saved View Name *</label>
            <input className="rpt-input" value={viewName} onChange={(e) => setViewName(e.target.value)} required />
          </div>
          <button type="submit" className="rpt-btn rpt-btn-primary" disabled={busy}>
            {busy ? "Saving..." : "Save Preset"}
          </button>
          <button type="button" className="rpt-btn" onClick={() => setPanel("none")}>Cancel</button>
        </form>
      )}

      {panel === "schedule" && (
        <form onSubmit={handleCreateSchedule} className="rpt-card" style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", background: "#f8fbff" }}>
          <div className="rpt-field">
            <label>Frequency</label>
            <select className="rpt-select" value={schedFreq} onChange={(e) => setSchedFreq(e.target.value as any)}>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
          <div className="rpt-field">
            <label>Day</label>
            <select className="rpt-select" value={schedDay} onChange={(e) => setSchedDay(e.target.value)}>
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "1st of Month"].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="rpt-field">
            <label>Time</label>
            <input type="time" className="rpt-input" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} />
          </div>
          <div className="rpt-field">
            <label>Format</label>
            <select className="rpt-select" value={schedFmt} onChange={(e) => setSchedFmt(e.target.value as any)}>
              <option value="PDF">PDF</option>
              <option value="CSV">CSV</option>
              <option value="XLSX">XLSX</option>
            </select>
          </div>
          <div className="rpt-field" style={{ flex: 1, minWidth: 180 }}>
            <label>Recipient Emails (comma-separated)</label>
            <input className="rpt-input" placeholder="pm@company.com, lead@company.com" value={schedRecipients} onChange={(e) => setSchedRecipients(e.target.value)} />
          </div>
          <button type="submit" className="rpt-btn rpt-btn-primary" disabled={busy}>
            {busy ? "Saving..." : "Save Schedule"}
          </button>
          <button type="button" className="rpt-btn" onClick={() => setPanel("none")}>Cancel</button>
        </form>
      )}
    </div>
  );
}
