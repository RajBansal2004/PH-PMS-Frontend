"use client";
import Link from "next/link";
import { ChevronDown, MoreHorizontal, Star } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
export function ProjectHeader({tab="Overview"}:{tab?:string}){
 const tabs=["Overview","Timeline","Tasks","Milestones","Team","Documents","Finance","Risks & Issues","Changes","Activity","Reports","Settings"];
 const links:Record<string,string>={Overview:"/projects/1",Timeline:"/projects/1/timeline",Tasks:"/projects/1/tasks",Milestones:"/projects/1/milestones",Team:"/projects/1/team",Documents:"/projects/1/documents",Finance:"/projects/1/financials",Risks:"/projects/1/health",Changes:"/projects/1/changes",Activity:"/projects/1/activity",Reports:"/projects/1/reports",Settings:"/projects/1/settings"};
 return <>
  <div className="project-hero card"><div className="project-identity"><Star className="star" size={21} fill="currentColor"/><div className="client-logo">✚</div><div><h2>AI-CMS Implementation <StatusBadge tone="blue">In Progress</StatusBadge></h2><p>Implementation of AI-CMS platform for Apollo Hospitals</p><div className="project-meta"><span><b>Client</b>Apollo Hospitals</span><span><b>Project Manager</b>Rahul Verma</span><span><b>Priority</b><StatusBadge tone="red">High</StatusBadge></span><span><b>Type</b>Implementation</span><span><b>Start Date</b>01 Jan 2025</span><span><b>End Date</b>30 Jun 2025</span><span className="days"><b>Days Left</b>45 Days</span></div></div></div><div className="project-code"><small>Project Code</small><strong>PRJ-00075</strong></div></div>
  <div className="tabs project-tabs">{tabs.map(t=>{const key=t.split(" ")[0]; const href=links[key]||"#"; return <Link key={t} href={href} className={tab===t?"active":""}>{t}</Link>})}</div>
 </>
}
