"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  CheckCircle2,
  AlertTriangle,
  ChevronRight as ChevronBreadcrumb,
  RefreshCw,
} from "lucide-react";
import { milestoneApi } from "@/lib/milestones/api";
import type { Milestone } from "@/lib/milestones/types";

export default function MilestoneCalendarPage() {
  const [data, setData] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarDate, setCalendarDate] = useState(() => new Date(2026, 2, 1)); // Default March 2026

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await milestoneApi.list();
        setData(res?.items || []);
      } catch (err) {
        console.warn("Failed to load milestones for calendar:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const monthLabel = useMemo(() => {
    return calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [calendarDate]);

  const prevMonth = () => {
    setCalendarDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCalendarDate(new Date(year, month + 1, 1));
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Convert Sun=0 to Mon=0

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const paddingArray = Array.from({ length: firstDayIndex }, (_, i) => i);

  // Group milestones by day of the current month
  const milestonesByDay = useMemo(() => {
    const map = new Map<number, Milestone[]>();

    data.forEach((m) => {
      // Check plannedEnd first, then plannedStart
      const targetDateStr = m.plannedEnd || m.plannedStart;
      if (!targetDateStr) return;

      const dateObj = new Date(`${targetDateStr}T00:00:00`);
      if (!isNaN(dateObj.getTime())) {
        if (dateObj.getFullYear() === year && dateObj.getMonth() === month) {
          const day = dateObj.getDate();
          if (!map.has(day)) map.set(day, []);
          map.get(day)!.push(m);
        }
      }
    });

    return map;
  }, [data, year, month]);

  const totalThisMonth = useMemo(() => {
    let count = 0;
    milestonesByDay.forEach((list) => {
      count += list.length;
    });
    return count;
  }, [milestonesByDay]);

  return (
    <div style={{ padding: "24px 32px", maxWidth: "1350px", margin: "0 auto" }}>
      <nav style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#667085", marginBottom: "16px" }}>
        <Link href="/milestones" style={{ color: "#475467", textDecoration: "none" }}>Milestones</Link>
        <ChevronBreadcrumb size={14} />
        <span style={{ color: "#1d2939", fontWeight: 600 }}>Milestone Calendar</span>
      </nav>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#101828", margin: 0 }}>
            Milestone Schedule Calendar
          </h1>
          <p style={{ margin: "4px 0 0", color: "#475467", fontSize: "14px" }}>
            Monthly calendar distribution of project deliverables, stage gates, and billing milestones.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", background: "#fff", border: "1px solid #d0d5dd", borderRadius: "8px", overflow: "hidden" }}>
            <button
              type="button"
              onClick={prevMonth}
              style={{ padding: "8px 12px", border: "none", background: "none", cursor: "pointer", color: "#475467" }}
              aria-label="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ padding: "0 12px", fontSize: "14px", fontWeight: 600, color: "#101828", minWidth: "130px", textAlign: "center" }}>
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              style={{ padding: "8px 12px", border: "none", background: "none", cursor: "pointer", color: "#475467" }}
              aria-label="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <Link
            href="/milestones/new"
            style={{ padding: "8px 16px", background: "#155eef", color: "#fff", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 600 }}
          >
            + New Milestone
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eaecf0", padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: "0 auto 12px", color: "#3b82f6" }} />
          <p style={{ margin: 0, fontSize: "14px" }}>Loading calendar events...</p>
        </div>
      ) : (
        /* Calendar Grid */
        <div style={{ background: "#fff", border: "1px solid #eaecf0", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(16,24,40,0.05)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px", marginBottom: "8px", textAlign: "center", fontWeight: 600, fontSize: "13px", color: "#475467" }}>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
            {/* Blank leading days */}
            {paddingArray.map((i) => (
              <div
                key={`pad-${i}`}
                style={{
                  minHeight: "95px",
                  borderRadius: "8px",
                  background: "#fcfcfd",
                  border: "1px dashed #f2f4f7",
                }}
              />
            ))}

            {/* Days of month */}
            {daysArray.map((day) => {
              const dayMilestones = milestonesByDay.get(day) || [];
              const isMilestoneDay = dayMilestones.length > 0;

              return (
                <div
                  key={day}
                  style={{
                    minHeight: "95px",
                    border: "1px solid",
                    borderColor: isMilestoneDay ? "#b2ddff" : "#eaecf0",
                    borderRadius: "8px",
                    padding: "8px",
                    background: isMilestoneDay ? "#f8fafd" : "#fff",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", fontWeight: 600, color: isMilestoneDay ? "#155eef" : "#667085" }}>
                    <span>{day}</span>
                    {isMilestoneDay && <Flag size={12} color="#155eef" />}
                  </div>

                  <div style={{ marginTop: "4px", display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                    {dayMilestones.map((m) => {
                      const isComplete = m.status === "Completed";
                      const isInProgress = m.status === "In Progress";
                      const bg = isComplete ? "#ecfdf3" : isInProgress ? "#eff8ff" : "#fef0c7";
                      const border = isComplete ? "#a6f4c5" : isInProgress ? "#b2ddff" : "#fedf89";
                      const text = isComplete ? "#027a48" : isInProgress ? "#175cd3" : "#b54708";

                      return (
                        <Link
                          key={m.id}
                          href={`/milestones/${encodeURIComponent(m._id || m.id)}`}
                          style={{
                            display: "block",
                            padding: "4px 6px",
                            background: bg,
                            border: `1px solid ${border}`,
                            borderRadius: "4px",
                            fontSize: "11px",
                            color: text,
                            fontWeight: 600,
                            textDecoration: "none",
                            lineHeight: 1.3,
                          }}
                          title={`${m.milestoneCode || m.id}: ${m.title} (${m.status})`}
                        >
                          <strong>{m.milestoneCode || m.id}:</strong> {m.title.slice(0, 20)}
                          {m.title.length > 20 ? "..." : ""} ({m.progress}%)
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #eaecf0", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: "#667085" }}>
            <span>
              Total scheduled milestones in <strong>{monthLabel}</strong>: <strong>{totalThisMonth}</strong>
            </span>
            <div style={{ display: "flex", gap: "16px", fontSize: "12px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#ecfdf3", border: "1px solid #a6f4c5" }} />
                Completed
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#eff8ff", border: "1px solid #b2ddff" }} />
                In Progress
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#fef0c7", border: "1px solid #fedf89" }} />
                Upcoming
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
