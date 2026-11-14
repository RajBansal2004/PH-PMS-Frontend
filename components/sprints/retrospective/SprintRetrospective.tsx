
"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarDays, CheckCircle2, ChevronDown, Circle,
  ClipboardList, Download, FileText, Lightbulb,
  MessageSquareText, Plus, Share2, Smile, Target,
  ThumbsDown, ThumbsUp, Users, X,
} from "lucide-react";
import "./sprint-retrospective.css";

type Category = "good" | "bad" | "improve";
type RetroItem = { id: number; title: string; owner: string; score: number };
type Action = { title: string; owner: string; due: string; status: "Completed" | "In Progress" | "Planned"; priority: "High" | "Medium" | "Low" };

const initialIdeas: Record<Category, RetroItem[]> = {
  good: [],
  bad: [],
  improve: [],
};

const initialActions: Action[] = [];

const metricRows = [
  ["Story Points", "38 SP", "38 SP", "0 SP (0%)", "On Track"],
  ["Tasks Completed", "21", "21", "0 (0%)", "On Track"],
  ["Bugs Logged", "12", "9", "-3 (25%)", "Positive"],
  ["Bugs Resolved", "10", "9", "-1 (10%)", "On Track"],
  ["Code Coverage", "75%", "82%", "+7%", "Positive"],
  ["Velocity", "32 SP", "38 SP", "+6 SP (18.75%)", "Positive"],
];

const tabs = [
  "Summary", "What Went Well", "What Didn't Go Well",
  "Action Items", "Metrics", "Team Feedback",
  "Notes & Attachments", "Next Sprint Plan",
];

function Card({ title, children, action, className = "", id }: {
  title: string; children: React.ReactNode; action?: React.ReactNode;
  className?: string; id?: string;
}) {
  return <section id={id} className={`rt-card ${className}`}>
    <div className="rt-card-head"><h3>{title}</h3>{action}</div>
    {children}
  </section>;
}

function Ring({ value, label, color = "#008b52" }: {
  value: number; label: string; color?: string;
}) {
  return <div className="rt-ring" style={{
    background: `conic-gradient(${color} ${value}%, #e5eaf3 ${value}% 100%)`
  }}><div><strong>{value === 100 ? "100%" : label === "Responses" ? "6" : "4.3"}</strong><span>{label}</span></div></div>;
}

function Burndown() {
  const actual = [40, 37, 33, 30, 27, 23, 20, 17, 15, 14, 10, 6, 3, 0];
  const ideal = Array.from({ length: 14 }, (_, i) => 40 - i * 40 / 13);
  const pts = (arr: number[]) => arr.map((v,i) => `${28+i*24},${140-v*3}`).join(" ");
  return <svg className="rt-burndown" viewBox="0 0 360 175" role="img" aria-label="Sprint burndown">
    {[0,10,20,30,40].map(n => <g key={n}><line x1="28" x2="345" y1={140-n*3} y2={140-n*3} stroke="#eef2f9" /><text x="5" y={144-n*3} fontSize="8" fill="#40527a">{n}</text></g>)}
    <polyline points={pts(ideal)} fill="none" stroke="#0754f9" strokeDasharray="4 3" strokeWidth="1.5" />
    <polyline points={pts(actual)} fill="none" stroke="#008b52" strokeWidth="2" />
    {actual.map((v,i) => <circle key={i} cx={28+i*24} cy={140-v*3} r="2" fill="white" stroke="#008b52" />)}
    {["14 May","16 May","18 May","20 May","22 May","24 May","26 May","27 May"].map((d,i) => <text key={d} x={28+i*44} y="163" fontSize="8" fill="#40527a" textAnchor="middle">{d}</text>)}
    <text x="235" y="12" fontSize="8" fill="#0754f9">--- Ideal</text>
    <text x="295" y="12" fontSize="8" fill="#008b52">— Actual</text>
  </svg>;
}

export default function SprintRetrospective({ sprintId }: { sprintId: string }) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [actions, setActions] = useState(initialActions);
  const [tab, setTab] = useState(0);
  const [closed, setClosed] = useState(false);
  const [modal, setModal] = useState<Category | "action" | null>(null);
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("Amit Kumar");
  const [notice, setNotice] = useState("");
  const [menu, setMenu] = useState(false);
  const [files, setFiles] = useState([
    { name: "Retrospective Board Export.pdf", size: "245 KB" },
    { name: "Action Items List.xlsx", size: "18 KB" },
    { name: "Sprint Metrics Report.pdf", size: "312 KB" },
    { name: "Team Feedback Summary.pdf", size: "198 KB" },
  ]);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [notes, setNotes] = useState("Overall sprint went well with strong team collaboration and good delivery. Major challenges were requirement changes and external API delay.");
  const fileRef = useRef<HTMLInputElement>(null);

  const go = (index: number) => {
    setTab(index);
    document.getElementById(`rt-section-${index}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const saveItem = () => {
    if (!title.trim() || !modal) return;
    if (modal === "action") {
      setActions(prev => [...prev, { title: title.trim(), owner, due: "10 Jun 2025", status: "Planned", priority: "Medium" }]);
    } else {
      const category = modal;
      setIdeas(prev => ({ ...prev, [category]: [...prev[category], { id: Date.now(), title: title.trim(), owner, score: category === "bad" ? -1 : 1 }] }));
    }
    setTitle("");
    setModal(null);
    setNotice("Item added.");
  };

  const exportCsv = () => {
    const lines = [
      "Category,Item,Owner,Score",
      ...(["good","bad","improve"] as Category[]).flatMap(c => ideas[c].map(i =>
        `${c},"${i.title.replaceAll('"','""')}",${i.owner},${i.score}`)),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${sprintId}-retrospective.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const ideaColumn = (category: Category, heading: string) => {
    const icon = category === "good" ? <ThumbsUp size={14}/> : category === "bad" ? <ThumbsDown size={14}/> : <Lightbulb size={14}/>;
    return <Card id={category === "good" ? "rt-section-1" : category === "bad" ? "rt-section-2" : undefined} title={heading}
      className={`rt-ideas rt-${category}`}
      action={<span className="rt-count">{ideas[category].length}</span>}>
      <div className="rt-idea-list">
        {ideas[category].length ? (
          ideas[category].map(i => <div className="rt-idea" key={i.id}>
            <span className="rt-idea-icon">{category === "good" ? <CheckCircle2 size={13}/> : category === "bad" ? <Circle size={13}/> : <Lightbulb size={13}/>}</span>
            <div><strong>{i.title}</strong><small>by {i.owner}</small></div>
            <span className="rt-score">{i.score > 0 ? "+" : ""}{i.score}</span>
          </div>)
        ) : (
          <p style={{ padding: "12px", color: "#667085", fontSize: "13px" }}>No items captured yet.</p>
        )}
      </div>
      <button className="rt-add" onClick={() => setModal(category)}><Plus size={12}/> Add Item</button>
    </Card>;
  };

  return <main className="rt-page">
    <header className="rt-toolbar">
      <nav className="rt-crumb">
        <Link href="/sprints">Sprint Management</Link><span>›</span>
        <Link href="/sprints">Sprint Registry</Link><span>›</span>
        <strong>Sprint Retrospective ({sprintId})</strong>
      </nav>
      <div className="rt-actions">
        <button onClick={exportCsv}><Download size={13}/> Download Report</button>
        <button onClick={async () => {
          if (navigator.share) {
            try { await navigator.share({ title: `Retrospective ${sprintId}`, url: window.location.href }); }
            catch { /* cancelled */ }
          } else {
            await navigator.clipboard.writeText(window.location.href);
            setNotice("Link copied.");
          }
        }}><Share2 size={13}/> Share</button>
        <div className="rt-more"><button onClick={() => setMenu(!menu)}>More Actions <ChevronDown size={12}/></button>
          {menu && <div className="rt-menu">
            <button onClick={() => { exportCsv(); setMenu(false); }}>Export CSV</button>
            <button onClick={() => { go(3); setMenu(false); }}>Action Items</button>
            <button onClick={() => { go(6); setMenu(false); }}>Attachments</button>
          </div>}
        </div>
      </div>
    </header>

    <div className="rt-titlebar">
      <div className="rt-title">
        <ClipboardList size={25} color="#ef4040"/>
        <div><div className="rt-title-line"><h1>Sprint Retrospective ({sprintId})</h1><span className="rt-pill rt-green">{closed ? "Closed" : "Completed"}</span></div>
          <p>Reflect on what went well, what didn't, and how we can improve in the next sprint.</p>
        </div>
      </div>
      <div className="rt-actions">
        <button onClick={() => setNotice("Template save requires backend integration.")}><FileText size={13}/> Save as Template</button>
        <button className="rt-primary" onClick={() => setClosed(!closed)}>{closed ? "Reopen Retrospective" : "Close Retrospective"}</button>
      </div>
    </div>

    <section className="rt-info">
      {[
        ["Project","PRJ-001 - AI-CMS Platform"],
        ["Milestone","MLS-002 - Module Development"],
        ["Sprint",`${sprintId} - Notification Engine Sprint`],
        ["Duration","14 May 2025 - 27 May 2025 (14 Days)"],
        ["Completed On","27 May 2025, 06:15 PM"],
        ["Facilitator","Vikram Singh"],
        ["Participants","6 / 6"],
        ["Overall Sentiment","Positive"],
      ].map(([k,v]) => <div key={k}><small>{k}</small><strong>{v}</strong></div>)}
    </section>

    <nav className="rt-tabs">{tabs.map((t,i) => <button key={t} className={tab===i?"active":""} onClick={() => go(i)}>{i+1}. {t}</button>)}</nav>

    <div id="rt-section-0" className="rt-summary">
      <Card title="Sprint Goal">
        <div className="rt-goal"><p>Develop notification engine with email, SMS, push notification and in-app alerts.</p><strong><CheckCircle2 size={13}/> Achieved</strong><Target className="rt-target" size={70}/></div>
      </Card>
      <Card title="Sprint Progress">
        <div className="rt-chart-row"><Ring value={100} label="Completed"/><div className="rt-legend"><p><i className="green"/> Completed <b>38 SP (100%)</b></p><p><i className="blue"/> In Progress <b>0 SP (0%)</b></p><p><i className="red"/> Not Completed <b>0 SP (0%)</b></p></div></div>
      </Card>
      <Card title="Team Participation">
        <div className="rt-chart-row"><Ring value={100} label="Responses" color="#a75ae6"/><div className="rt-legend"><p><i className="purple"/> Active Participants <b>6 (100%)</b></p><p><i className="gray"/> Partial Participants <b>0</b></p><p><i className="orange"/> Absent <b>0</b></p></div></div>
      </Card>
      <Card title="Action Items">
        <div className="rt-action-stats">
          <p><CheckCircle2 color="#008b52"/> <strong>{actions.filter(a=>a.status==="Completed").length} Completed</strong></p>
          <p><Circle color="#e98b0a"/> <strong>{actions.filter(a=>a.status==="In Progress").length} In Progress</strong></p>
          <p><Circle color="#0754f9"/> <strong>{actions.filter(a=>a.status==="Planned").length} Planned</strong></p>
        </div>
      </Card>
      <Card title="Team Sentiment">
        <div className="rt-chart-row"><Ring value={86} label="/ 5"/><div className="rt-ratings">{[5,4,3,2,1].map((n,i) => <p key={n}>{n} <span>★</span><b>{[3,2,1,0,0][i]}</b></p>)}</div></div>
        <strong className="rt-positive">Positive</strong>
      </Card>
    </div>

    <div className="rt-middle">
      {ideaColumn("good","What Went Well?")}
      {ideaColumn("bad","What Didn't Go Well?")}
      {ideaColumn("improve","What Can We Improve?")}
      <Card id="rt-section-3" title="Action Items" action={<span className="rt-count">{actions.length}</span>}>
        <div className="rt-table-wrap"><table className="rt-table">
          <thead><tr><th>Action Item</th><th>Owner</th><th>Due Date</th><th>Status</th><th>Priority</th></tr></thead>
          <tbody>{actions.length ? actions.map((a,i) => <tr key={`${a.title}-${i}`}><td>{a.title}</td><td>{a.owner}</td><td>{a.due}</td><td><span className={`rt-pill ${a.status==="Completed"?"rt-green":a.status==="Planned"?"rt-blue":"rt-orange"}`}>{a.status}</span></td><td><span className={`rt-pill rt-${a.priority.toLowerCase()}`}>{a.priority}</span></td></tr>) : <tr><td colSpan={5} style={{ textAlign: "center", padding: "16px", color: "#667085" }}>No action items recorded yet. Click &apos;Add Action Item&apos; below.</td></tr>}</tbody>
        </table></div>
        <button className="rt-add" onClick={() => setModal("action")}><Plus size={12}/> Add Action Item</button>
      </Card>
    </div>

    <div className="rt-analytics">
      <Card id="rt-section-4" title="Sprint Metrics">
        <div className="rt-table-wrap"><table className="rt-table">
          <thead><tr><th>Metric</th><th>Planned</th><th>Actual</th><th>Variance</th><th>Status</th></tr></thead>
          <tbody>{metricRows.map(m => <tr key={m[0]}>{m.slice(0,4).map((c,i)=><td key={i}>{c}</td>)}<td><span className="rt-pill rt-green">{m[4]}</span></td></tr>)}</tbody>
        </table></div>
      </Card>
      <Card title="Burndown Chart"><Burndown/></Card>
      <Card id="rt-section-5" title="Team Feedback Summary">
        <div className="rt-chart-row"><Ring value={83} label="Responses"/><div className="rt-legend"><p><i className="green"/> Excellent <b>3 (50%)</b></p><p><i className="blue"/> Good <b>2 (33.33%)</b></p><p><i className="orange"/> Average <b>1 (16.67%)</b></p><p><i className="red"/> Poor <b>0</b></p></div></div>
        <p>Average Rating: <strong>4.3 / 5</strong></p>
        <button className="rt-add" onClick={() => go(5)}>View All Feedback</button>
      </Card>
      <Card id="rt-section-6" title="Attachments & References">
        <div className="rt-file-list">{files.map(f => <div key={f.name}><FileText size={13}/><span>{f.name}</span><small>{f.size}</small><button aria-label={`Download ${f.name}`} onClick={() => {
          const file = uploadedFiles[f.name];
          if (!file) { setNotice("This sample attachment is not available for download."); return; }
          const url = URL.createObjectURL(file);
          const a = document.createElement("a"); a.href = url; a.download = file.name; a.click();
          URL.revokeObjectURL(url);
        }}><Download size={13}/></button></div>)}</div>
        <input ref={fileRef} hidden type="file" onChange={e => {
          const f = e.target.files?.[0]; if (!f) return;
          setFiles(prev => [...prev, { name: f.name, size: `${Math.ceil(f.size/1024)} KB` }]);
          setUploadedFiles(prev => ({ ...prev, [f.name]: f }));
          e.target.value = "";
        }}/>
        <button className="rt-add" onClick={() => fileRef.current?.click()}><Plus size={12}/> Add Attachment</button>
      </Card>
    </div>

    <div className="rt-bottom">
      <Card title="Facilitator Summary">
        <textarea aria-label="Facilitator summary" value={notes} onChange={e => setNotes(e.target.value)}/>
        <p><strong>Vikram Singh (Delivery Manager)</strong></p><small>27 May 2025, 06:15 PM</small>
      </Card>
      <Card title="Next Sprint Focus Areas">
        <ul className="rt-checks">{["Improve estimation and planning accuracy","Enhance automation and testing","Stabilize external API dependencies","Strengthen documentation and knowledge sharing"].map(s=><li key={s}><CheckCircle2 size={13}/>{s}</li>)}</ul>
      </Card>
      <Card title="Next Sprint Preview">
        <div className="rt-next"><span>Sprint Code</span><strong>SPR-007</strong><span>Sprint Name</span><strong>EMR Integration Sprint</strong><span>Planned Dates</span><strong>28 May 2025 - 10 Jun 2025</strong><span>Sprint Goal</span><strong>Integrate EMR module with patient history, lab results and prescriptions.</strong></div>
        <Link className="rt-next-button" href="/sprints/SPR-003/planning">Plan Next Sprint →</Link>
      </Card>
      <Card title="Next Steps">
        <ul className="rt-checks">{["Share retrospective with team","Track action items in next sprint","Plan improvements for next sprint"].map(s=><li key={s}><CheckCircle2 size={13}/>{s}</li>)}<li><Circle size={13}/>Close retrospective</li></ul>
        <button className="rt-next-button" onClick={() => setClosed(true)}>Close Retrospective</button>
      </Card>
    </div>

    {modal && <div className="rt-modal-overlay" onClick={() => setModal(null)}>
      <div className="rt-modal" role="dialog" aria-modal="true" aria-label="Add retrospective item" onClick={e=>e.stopPropagation()}>
        <div className="rt-modal-head"><h3>{modal==="action"?"Add Action Item":"Add Retrospective Item"}</h3><button onClick={()=>setModal(null)}><X size={17}/></button></div>
        <label>Title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Enter description"/></label>
        <label>Owner<select value={owner} onChange={e=>setOwner(e.target.value)}>{["Amit Kumar","Vikram Singh","Neha Patel","Rahul Verma","Pooja Singh"].map(n=><option key={n}>{n}</option>)}</select></label>
        <div className="rt-modal-buttons"><button onClick={()=>setModal(null)}>Cancel</button><button className="rt-primary" onClick={saveItem} disabled={!title.trim()}>Save Item</button></div>
      </div>
    </div>}
    {notice && <div className="rt-toast" role="status">{notice}<button onClick={()=>setNotice("")}><X size={14}/></button></div>}
  </main>;
}
