"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Building2, Star } from "lucide-react";
import { project as apiGetProject } from "../lib/api";
import { StatusBadge } from "./StatusBadge";

export function ProjectHeader({
  tab = "Overview",
  projectId,
}: {
  tab?: string;
  projectId?: string;
}) {
  const params = useParams();
  const rawId = projectId || (params?.id as string) || "1";
  const id = rawId === "new" ? "1" : rawId;

  const [projectData, setProjectData] = useState<any>(null);

  useEffect(() => {
    if (!id || id === "1") return;
    let mounted = true;
    apiGetProject(id)
      .then((res) => {
        if (!mounted) return;
        const d = res?.data || res;
        if (d && (d.projectName || d.projectCode)) {
          setProjectData(d);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [id]);

  const tabs = [
    "Overview",
    "Timeline",
    "Tasks",
    "Milestones",
    "Team",
    "Documents",
    "Finance",
    "Risks & Issues",
    "Changes",
    "Activity",
    "Reports",
    "Settings",
  ];

  const links: Record<string, string> = {
    Overview: `/projects/${id}`,
    Timeline: `/projects/${id}/timeline`,
    Tasks: `/projects/${id}/tasks`,
    Milestones: `/projects/${id}/milestones`,
    Team: `/projects/${id}/team`,
    Documents: `/projects/${id}/documents`,
    Finance: `/projects/${id}/financials`,
    Risks: `/projects/${id}/health`,
    Changes: `/projects/${id}/changes`,
    Activity: `/projects/${id}/activity`,
    Reports: `/projects/${id}/reports`,
    Settings: `/projects/${id}/settings`,
  };

  const name = projectData?.projectName || "AI-CMS Implementation";
  const code = projectData?.projectCode || "PRJ-00075";
  const clientName =
    projectData?.clientId?.displayName ||
    projectData?.clientId?.legalName ||
    "Apollo Hospitals";
  const managerName =
    projectData?.projectManagerId?.displayName ||
    (projectData?.projectManagerId?.firstName
      ? `${projectData.projectManagerId.firstName} ${projectData.projectManagerId.lastName || ""}`.trim()
      : "Rahul Verma");
  const priority = projectData?.priority || "HIGH";
  const status = projectData?.status || "ACTIVE";
  const category = projectData?.projectCategory || "Implementation";
  const desc = projectData?.description || `Implementation project for ${clientName}`;

  const formatDate = (dStr?: string) => {
    if (!dStr) return "—";
    try {
      return new Date(dStr).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dStr;
    }
  };

  const startDate = projectData?.startDate
    ? formatDate(projectData.startDate)
    : "01 Jan 2025";
  const endDate = projectData?.targetCompletion
    ? formatDate(projectData.targetCompletion)
    : "30 Jun 2025";

  let daysLeft = "45 Days";
  if (projectData?.targetCompletion) {
    const diff = Math.ceil(
      (new Date(projectData.targetCompletion).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
    );
    daysLeft = diff > 0 ? `${diff} Days` : diff === 0 ? "Due Today" : "Overdue";
  }

  const getPriorityTone = (p: string) => {
    const up = String(p).toUpperCase();
    if (up === "CRITICAL" || up === "HIGH") return "red";
    if (up === "MEDIUM") return "amber";
    return "green";
  };

  const getStatusTone = (s: string) => {
    const us = String(s).toUpperCase();
    if (us === "ACTIVE" || us === "COMPLETED") return "green";
    if (us === "PENDING_APPROVAL" || us === "ON_HOLD") return "amber";
    return "blue";
  };

  return (
    <>
      <div className="project-hero card">
        <div className="project-identity">
          <Star className="star" size={21} fill="currentColor" />
          <div className="client-logo">
            <Building2 size={16} />
          </div>
          <div>
            <h2>
              {name}{" "}
              <StatusBadge tone={getStatusTone(status)}>
                {status.replace(/_/g, " ")}
              </StatusBadge>
            </h2>
            <p>{desc}</p>
            <div className="project-meta">
              <span>
                <b>Client</b> {clientName}
              </span>
              <span>
                <b>Project Manager</b> {managerName}
              </span>
              <span>
                <b>Priority</b>{" "}
                <StatusBadge tone={getPriorityTone(priority)}>
                  {priority}
                </StatusBadge>
              </span>
              <span>
                <b>Type</b> {category}
              </span>
              <span>
                <b>Start Date</b> {startDate}
              </span>
              <span>
                <b>End Date</b> {endDate}
              </span>
              <span className="days">
                <b>Days Left</b> {daysLeft}
              </span>
            </div>
          </div>
        </div>
        <div className="project-code">
          <small>Project Code</small>
          <strong>{code}</strong>
        </div>
      </div>
      <div className="tabs project-tabs">
        {tabs.map((t) => {
          const key = t.split(" ")[0];
          const href = links[key] || "#";
          return (
            <Link
              key={t}
              href={href}
              className={tab === t ? "active" : ""}
            >
              {t}
            </Link>
          );
        })}
      </div>
    </>
  );
}
