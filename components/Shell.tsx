"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { Bell, BriefcaseBusiness, CalendarDays, ChevronDown, ChevronRight, ClipboardList, FileText, FolderKanban, Gauge, Grid2X2, LayoutDashboard, Menu, MessageSquare, Network, PanelLeftClose, PanelLeftOpen, Settings, ShieldCheck, Users, WalletCards, HardDrive, LogOut, Search, CircleHelp, X } from "lucide-react";

const top = [
  ["Dashboard","/dashboard",LayoutDashboard], ["Projects","/projects",FolderKanban], ["Tasks","/tasks",ClipboardList], ["Resources","/resources",Users], ["Timesheets","/timesheets",CalendarDays], ["Finance","/finance",WalletCards], ["Reports","/reports",Gauge], ["Organization","/organization",Network], ["Clients","/clients",BriefcaseBusiness], ["Teams","/teams",Users], ["Users","/users",Users], ["Roles & Permissions","/roles-permissions",ShieldCheck], ["Documents","/documents",FileText], ["Integrations","/integrations",HardDrive], ["Settings","/settings",Settings],
] as const;
const projectLinks = [["Project Registry","/projects"],["My Projects","/projects/my"],["Project Templates","/projects/templates"],["Project Calendar","/projects/calendar"],["Project Timeline","/projects/timeline"],["Project Financials","/projects/financials"],["Project Health","/projects/health"]] as const;
function active(path:string, href:string){ return href==="/projects" ? path==="/projects" : path===href || path.startsWith(href+"/"); }
export function Shell({children}:{children:React.ReactNode}){
 const path=usePathname(); const { user, signOut } = useAuth(); const [collapsed,setCollapsed]=useState(false); const [mobile,setMobile]=useState(false); const projectsOpen=path.startsWith("/projects");
 const signout=()=>{ void signOut(); };
 return <div className={`app-shell ${collapsed?"is-collapsed":""}`}>
  <aside className={`sidebar ${mobile?"mobile-open":""}`}>
   <div className="brand"><div className="brand-mark"><Grid2X2 size={18}/></div>{!collapsed&&<div><strong>PehalHealthcare</strong><span>Technologies</span></div>}<button className="mobile-close" onClick={()=>setMobile(false)}><X size={18}/></button></div>
   <nav className="nav-list">{top.map(([label,href,Icon])=>{const is=active(path,href);return <div key={href}><Link href={href} className={`nav-item ${is?"active":""}`} onClick={()=>setMobile(false)} title={collapsed?label:undefined}><Icon size={16}/>{!collapsed&&<span>{label}</span>}{!collapsed&&label==="Projects"&&(projectsOpen?<ChevronDown size={13}/>:<ChevronRight size={13}/>)}</Link>{label==="Projects"&&projectsOpen&&!collapsed&&<div className="subnav">{projectLinks.map(([l,h])=><Link key={h} href={h} className={path===h?"active":""} onClick={()=>setMobile(false)}>{l}</Link>)}</div>}</div>})}</nav>
   <button className="collapse-btn" onClick={()=>setCollapsed(v=>!v)}>{collapsed?<PanelLeftOpen size={16}/>:<PanelLeftClose size={16}/>} {!collapsed&&"Collapse Menu"}</button>
  </aside>
  {mobile&&<div className="backdrop" onClick={()=>setMobile(false)}/>} 
  <main className="main-area">
   <header className="topbar"><button className="mobile-menu" onClick={()=>setMobile(true)}><Menu size={20}/></button><div className="topbar-left"><div className="project-context"><span>▣</span> PRJ-00075 <ChevronDown size={12}/></div></div><div className="topbar-actions"><div className="global-search"><Search size={15}/><input placeholder="Search projects, tasks, docs..."/><kbd>Ctrl K</kbd></div><Link className="btn primary" href="/projects/new">+ New Project</Link><button className="icon-btn"><Bell size={17}/><i>3</i></button><button className="icon-btn"><MessageSquare size={17}/><i>2</i></button><button className="icon-btn"><CircleHelp size={17}/></button><div className="user-menu"><div className="avatar">MS</div><div><strong>{user?.name || "User"}</strong><span>{Array.isArray(user?.roles) && user.roles[0] && typeof user.roles[0] === "object" ? (user.roles[0] as any).name || (user.roles[0] as any).code || "User" : "User"}</span></div><ChevronDown size={13}/><button onClick={signout} title="Sign out"><LogOut size={14}/></button></div></div></header>
   <div className="page-wrap">{children}</div>
  </main>
 </div>
}
