"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { canAccessPath } from "@/lib/rbac";
import type { CountSlice, WeeklyHourSlot } from "@/lib/dashboard/workbenchApi";

export function DashboardRoleTabs({ active }: { active: "overview" | "pm" | "tl" | "my-work" | "portfolio" }) {
  const { effectiveRoleCode } = useAuth();
  const allTabs: Array<{ key: typeof active; label: string; href: string }> = [
    { key: "overview", label: "Executive", href: "/dashboard" },
    { key: "pm", label: "PM Workbench", href: "/dashboard/pm" },
    { key: "tl", label: "Team Lead", href: "/dashboard/tl" },
    { key: "my-work", label: "My Work", href: "/dashboard/my-work" },
    { key: "portfolio", label: "Portfolio", href: "/dashboard/portfolio" },
  ];
  const tabs = allTabs.filter((t) => canAccessPath(effectiveRoleCode, t.href));

  if (tabs.length <= 1) return null;

  return (
    <div className="wb-role-tabs" role="navigation" aria-label="Dashboard Workbenches">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`wb-role-tab ${active === t.key ? "active" : ""}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

export function DonutBreakdown({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: CountSlice[];
  centerLabel: string;
  centerValue?: number | string;
}) {
  const total = slices.reduce((s, x) => s + Number(x.count || 0), 0);
  let cursor = 0;
  const stops: string[] = [];

  if (total > 0) {
    for (const sl of slices) {
      const pct = (Number(sl.count || 0) / total) * 100;
      if (pct <= 0) continue;
      const start = cursor;
      cursor += pct;
      stops.push(`${sl.color || "#0755e9"} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`);
    }
  }
  const bg = stops.length ? `conic-gradient(${stops.join(", ")})` : "#e2e8f0";

  return (
    <div className="wb-donut-row">
      <div className="wb-donut" style={{ background: bg }}>
        <div className="wb-donut-hole">
          <span className="wb-donut-num">{centerValue ?? total}</span>
          <span className="wb-donut-lbl">{centerLabel}</span>
        </div>
      </div>
      <div className="wb-legend">
        {slices.map((s) => (
          <div key={s.key || s.severity || s.label} className="wb-legend-item">
            <span className="wb-legend-left">
              <span className="wb-dot" style={{ background: s.color || "#0755e9" }} />
              <span>{s.label}</span>
            </span>
            <strong>{s.count}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WeeklyHoursChart({ slots }: { slots: WeeklyHourSlot[] }) {
  const maxVal = Math.max(8, ...slots.map((s) => Number(s.total || 0)));
  return (
    <div>
      <div className="wb-week-chart">
        {slots.map((slot) => {
          const billH = Math.round((Number(slot.billable || 0) / maxVal) * 72);
          const nonH = Math.round((Number(slot.nonBillable || 0) / maxVal) * 72);
          return (
            <div key={slot.date} className="wb-week-col" title={`${slot.date}: ${slot.total}h (${slot.billable}h billable)`}>
              <span className="wb-week-val">{slot.total > 0 ? `${slot.total}h` : "0"}</span>
              <div className="wb-week-bars">
                {nonH > 0 && (
                  <div style={{ height: `${nonH}px`, background: "#94a3b8", borderRadius: "3px 3px 0 0" }} />
                )}
                <div
                  style={{
                    height: `${Math.max(billH, slot.total === 0 ? 3 : 0)}px`,
                    background: slot.total === 0 ? "#e2e8f0" : "#0755e9",
                    borderRadius: nonH > 0 ? "0 0 3px 3px" : "3px",
                  }}
                />
              </div>
              <span className="wb-week-day">{slot.label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 14, justifyContent: "flex-end", marginTop: 6, fontSize: 10.5, color: "#64748b" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span className="wb-dot" style={{ background: "#0755e9" }} /> Billable
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span className="wb-dot" style={{ background: "#94a3b8" }} /> Non-Billable
        </span>
      </div>
    </div>
  );
}

export function priorityBadgeClass(priority?: string): string {
  const p = String(priority || "").toUpperCase();
  if (p === "URGENT" || p === "CRITICAL") return "wb-badge wb-badge-red";
  if (p === "HIGH") return "wb-badge wb-badge-amber";
  if (p === "LOW") return "wb-badge wb-badge-slate";
  return "wb-badge wb-badge-blue";
}

export function healthBadgeClass(health?: string): string {
  const h = String(health || "").toUpperCase();
  if (h === "HEALTHY" || h === "GREEN" || h === "COMPLETED") return "wb-badge wb-badge-green";
  if (h === "AT_RISK" || h === "AMBER") return "wb-badge wb-badge-amber";
  if (h === "DELAYED" || h === "CRITICAL" || h === "RED") return "wb-badge wb-badge-red";
  return "wb-badge wb-badge-slate";
}
