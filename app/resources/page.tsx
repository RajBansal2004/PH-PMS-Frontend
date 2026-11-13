"use client";

import { useState } from "react";
import Link from "next/link";
import { Shell } from "../../components/Shell";
import { StatusBadge } from "../../components/StatusBadge";
import {
  Users,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

type ResourceRecord = {
  id: string;
  name: string;
  code: string;
  email: string;
  department: string;
  designation: string;
  primarySkill: string;
  secondarySkills: string[];
  allocationPercent: number;
  activeProjects: { name: string; percent: number }[];
  effectiveCapacityHours: number; // 7.2h/day standard
  benchStatus: "ALLOCATED" | "PARTIAL" | "BENCH";
  statusTone: "green" | "amber" | "red";
};

const initialResources: ResourceRecord[] = [
  {
    id: "EMP-001",
    name: "Rahul Verma",
    code: "PHT-EMP-0101",
    email: "rahul.verma@pehalhealthcare.com",
    department: "Application Development",
    designation: "Project Manager",
    primarySkill: "Agile Project Delivery",
    secondarySkills: ["Healthcare IT", "Jira", "Risk Management"],
    allocationPercent: 85,
    activeProjects: [
      { name: "AI-CMS Apollo", percent: 50 },
      { name: "Telehealth Portal", percent: 35 },
    ],
    effectiveCapacityHours: 7.2,
    benchStatus: "ALLOCATED",
    statusTone: "amber",
  },
  {
    id: "EMP-002",
    name: "Amit Kumar",
    code: "PHT-EMP-0102",
    email: "amit.kumar@pehalhealthcare.com",
    department: "Application Development",
    designation: "Technical Lead",
    primarySkill: "Node.js & Microservices",
    secondarySkills: ["PostgreSQL", "Redis", "AWS Lambda"],
    allocationPercent: 120, // OVERALLOCATED > 100%
    activeProjects: [
      { name: "AI-CMS Apollo", percent: 70 },
      { name: "Telehealth Portal", percent: 50 },
    ],
    effectiveCapacityHours: 7.2,
    benchStatus: "ALLOCATED",
    statusTone: "red",
  },
  {
    id: "EMP-003",
    name: "Neha Patel",
    code: "PHT-EMP-0103",
    email: "neha.patel@pehalhealthcare.com",
    department: "Product",
    designation: "Technical Lead",
    primarySkill: "React & Next.js",
    secondarySkills: ["TypeScript", "TailwindCSS", "State Management"],
    allocationPercent: 75,
    activeProjects: [{ name: "AI-CMS Apollo", percent: 75 }],
    effectiveCapacityHours: 7.2,
    benchStatus: "ALLOCATED",
    statusTone: "green",
  },
  {
    id: "EMP-004",
    name: "Pooja Singh",
    code: "PHT-EMP-0104",
    email: "pooja.singh@pehalhealthcare.com",
    department: "Research & Development",
    designation: "Senior Executive",
    primarySkill: "AI & Machine Learning",
    secondarySkills: ["Python", "TensorFlow", "NLP Clinical Models"],
    allocationPercent: 50,
    activeProjects: [{ name: "AI Diagnostics POC", percent: 50 }],
    effectiveCapacityHours: 7.2,
    benchStatus: "PARTIAL",
    statusTone: "green",
  },
  {
    id: "EMP-005",
    name: "Vikram Singh",
    code: "PHT-EMP-0105",
    email: "vikram.singh@pehalhealthcare.com",
    department: "Services",
    designation: "Senior Executive",
    primarySkill: "QA Automation",
    secondarySkills: ["Selenium", "Playwright", "Cypress", "API Testing"],
    allocationPercent: 80,
    activeProjects: [
      { name: "AI-CMS Apollo", percent: 40 },
      { name: "Telehealth Portal", percent: 40 },
    ],
    effectiveCapacityHours: 7.2,
    benchStatus: "ALLOCATED",
    statusTone: "green",
  },
  {
    id: "EMP-006",
    name: "Karthik Reddy",
    code: "PHT-EMP-0106",
    email: "karthik.reddy@pehalhealthcare.com",
    department: "Application Development",
    designation: "Executive",
    primarySkill: "Java / Spring Boot",
    secondarySkills: ["J2EE", "Hibernate", "REST APIs"],
    allocationPercent: 0, // BENCH
    activeProjects: [],
    effectiveCapacityHours: 7.2,
    benchStatus: "BENCH",
    statusTone: "green",
  },
];

export default function ResourcesPage() {
  const [resources] = useState<ResourceRecord[]>(initialResources);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");

  const filtered = resources.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.primarySkill.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === "ALL" || r.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const overallocatedCount = resources.filter((r) => r.allocationPercent > 100).length;
  const benchCount = resources.filter((r) => r.allocationPercent === 0).length;
  const averageAllocation = Math.round(
    resources.reduce((sum, r) => sum + r.allocationPercent, 0) / resources.length
  );

  return (
    <Shell>
      <div>
        <div className="page-head">
          <div>
            <div className="eyebrow">HUMAN CAPITAL & CAPACITY ENGINE</div>
            <h1>Resource Allocation & Capacity Master</h1>
            <p>Manage multi-project allocation, capacity planning (6 days, 7.2h net effective), skills matrix, and bench forecasting.</p>
          </div>
          <div>
            <Link href="/users/new" className="btn primary">
              + Add Resource
            </Link>
          </div>
        </div>

        {/* METRIC STRIP */}
        <div className="kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <div className="kpi card">
            <Users size={24} color="#2563eb" />
            <div>
              <small>Total Engineering Resources</small>
              <strong>{resources.length}</strong>
              <small style={{ color: "#64748b" }}>Target capacity: 103</small>
            </div>
          </div>
          <div className="kpi card">
            <TrendingUp size={24} color="#059669" />
            <div>
              <small>Average Team Utilization</small>
              <strong>{averageAllocation}%</strong>
              <small style={{ color: "#059669" }}>Optimal target: 75-80%</small>
            </div>
          </div>
          <div className="kpi card">
            <AlertTriangle size={24} color="#dc2626" />
            <div>
              <small>Overallocated (&gt;100%)</small>
              <strong style={{ color: overallocatedCount > 0 ? "#dc2626" : "#059669" }}>
                {overallocatedCount}
              </strong>
              <small style={{ color: "#dc2626" }}>Requires load shedding</small>
            </div>
          </div>
          <div className="kpi card">
            <Layers size={24} color="#d97706" />
            <div>
              <small>Available on Bench</small>
              <strong>{benchCount}</strong>
              <small style={{ color: "#d97706" }}>Ready for next pipeline project</small>
            </div>
          </div>
        </div>

        {/* ALLOCATION THRESHOLD GUIDELINES BAR */}
        <div className="card" style={{ padding: "12px 18px", marginBottom: "1.5rem", background: "#f8fafc" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
            <b>Allocation Threshold Indicators (BRD Section 23):</b>
            <div style={{ display: "flex", gap: "20px" }}>
              <span><b style={{ color: "#059669" }}>● Green:</b> ≤ 80% (Optimal Capacity)</span>
              <span><b style={{ color: "#d97706" }}>● Amber:</b> 81% - 100% (High Load)</span>
              <span><b style={{ color: "#dc2626" }}>● Red:</b> &gt; 100% (Over-Allocated / Exception)</span>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTERS */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "1rem" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "12px", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search by resource name, employee code, primary skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "10px 10px 10px 38px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
          </div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
          >
            <option value="ALL">All Departments</option>
            <option value="Application Development">Application Development</option>
            <option value="Product">Product</option>
            <option value="Research & Development">Research & Development</option>
            <option value="Services">Services</option>
          </select>
        </div>

        {/* RESOURCE TABLE */}
        <div className="card">
          <div className="data-table">
            <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase" }}>
                  <th style={{ padding: "12px" }}>Resource</th>
                  <th style={{ padding: "12px" }}>Department & Role</th>
                  <th style={{ padding: "12px" }}>Skills Profile</th>
                  <th style={{ padding: "12px" }}>Multi-Project Allocation</th>
                  <th style={{ padding: "12px" }}>Load Status</th>
                  <th style={{ padding: "12px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((res) => (
                  <tr key={res.id} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "0.88rem" }}>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: "bold", color: "#0f172a" }}>{res.name}</div>
                      <small style={{ color: "#64748b" }}>{res.code} · {res.email}</small>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div>{res.department}</div>
                      <small style={{ color: "#64748b" }}>{res.designation}</small>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: "500", color: "#1e293b" }}>{res.primarySkill}</div>
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                        {res.secondarySkills.map((sk) => (
                          <span key={sk} style={{ fontSize: "0.7rem", background: "#f1f5f9", padding: "1px 6px", borderRadius: "4px", color: "#475569" }}>
                            {sk}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: "12px", minWidth: "220px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: "bold" }}>{res.allocationPercent}%</span>
                        <small style={{ color: "#64748b" }}>{res.activeProjects.length} active project(s)</small>
                      </div>
                      <div style={{ height: "8px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(100, res.allocationPercent)}%`,
                            background:
                              res.allocationPercent > 100
                                ? "#dc2626"
                                : res.allocationPercent > 80
                                ? "#d97706"
                                : "#059669",
                          }}
                        />
                      </div>
                      {res.activeProjects.length > 0 && (
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                          {res.activeProjects.map((p) => `${p.name} (${p.percent}%)`).join(", ")}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <StatusBadge tone={res.statusTone}>
                        {res.allocationPercent > 100 ? "OVERALLOCATED" : res.allocationPercent === 0 ? "BENCH" : "OPTIMAL"}
                      </StatusBadge>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <button type="button" className="btn outline small" onClick={() => alert(`Opening allocation manager for ${res.name}`)}>
                        Rebalance
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  );
}
