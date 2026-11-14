"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Shell } from "../../components/Shell";
import { StatusBadge } from "../../components/StatusBadge";
import { getResources, employees as getEmployeesList } from "@/lib/api";
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
  RefreshCw,
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
  isLive?: boolean;
};

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const fetchResourcesData = async () => {
    setLoading(true);
    try {
      const [resData, empData] = await Promise.allSettled([
        getResources(),
        getEmployeesList().catch(() => []),
      ]);

      const resItems = resData.status === "fulfilled" && resData.value?.items ? resData.value.items : [];
      const empItems = empData.status === "fulfilled" && Array.isArray(empData.value) ? empData.value : [];

      if (resItems.length > 0) {
        const mapped: ResourceRecord[] = resItems.map((it: any) => {
          const alloc = Number(it.currentAllocationPercent ?? it.allocationPercent ?? 0);
          const tone: "green" | "amber" | "red" = alloc > 100 ? "red" : alloc >= 80 ? "amber" : "green";
          const bench: "ALLOCATED" | "PARTIAL" | "BENCH" = alloc === 0 ? "BENCH" : alloc < 70 ? "PARTIAL" : "ALLOCATED";

          return {
            id: it._id || it.id,
            name: it.employeeId?.name || it.name || "Resource Specialist",
            code: it.employeeId?.employeeCode || it.code || `PHT-EMP-${(it._id || "0000").slice(-4).toUpperCase()}`,
            email: it.employeeId?.email || it.email || "resource@pehalhealthcare.com",
            department: it.departmentId?.name || it.department || "Application Development",
            designation: it.designationId?.name || it.designation || "Engineer",
            primarySkill: it.primarySkill || "Full Stack Architecture",
            secondarySkills: Array.isArray(it.secondarySkills) && it.secondarySkills.length ? it.secondarySkills : ["TypeScript", "Cloud APIs"],
            allocationPercent: alloc,
            activeProjects: Array.isArray(it.activeProjects) && it.activeProjects.length ? it.activeProjects : [{ name: "Core Healthcare PMS", percent: alloc }],
            effectiveCapacityHours: 7.2,
            benchStatus: bench,
            statusTone: tone,
            isLive: true,
          };
        });
        setResources(mapped);
        setIsLiveConnected(true);
      } else if (empItems.length > 0) {
        const mapped: ResourceRecord[] = empItems.map((emp: any, idx: number) => {
          const alloc = Number(emp.currentAllocationPercent ?? emp.allocationPercent ?? 0);
          return {
            id: emp._id || `EMP-${idx}`,
            name: emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Team Member",
            code: emp.employeeCode || `PHT-EMP-0${100 + idx}`,
            email: emp.email || "member@pehalhealthcare.com",
            department: emp.departmentId?.name || emp.department || "Engineering",
            designation: emp.designationId?.name || emp.designation || "Developer",
            primarySkill: emp.primarySkill || "Software Engineering",
            secondarySkills: Array.isArray(emp.secondarySkills) ? emp.secondarySkills : Array.isArray(emp.skills) ? emp.skills : [],
            allocationPercent: alloc,
            activeProjects: Array.isArray(emp.activeProjects) ? emp.activeProjects : [],
            effectiveCapacityHours: 7.2,
            benchStatus: alloc === 0 ? "BENCH" : alloc < 70 ? "PARTIAL" : "ALLOCATED",
            statusTone: alloc > 100 ? "red" : alloc >= 80 ? "amber" : "green",
            isLive: true,
          };
        });
        setResources(mapped);
        setIsLiveConnected(true);
      } else {
        setResources([]);
        setIsLiveConnected(true);
      }
    } catch {
      setResources([]);
      setIsLiveConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResourcesData();
  }, []);

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
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "0.8rem", color: isLiveConnected ? "#059669" : "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: isLiveConnected ? "#059669" : "#94a3b8" }} />
              {isLiveConnected ? "Live API Connected" : "Local / Seed View"}
            </span>
            <button
              type="button"
              className="btn outline"
              onClick={fetchResourcesData}
              disabled={loading}
              title="Sync resources from backend"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} style={{ marginRight: "4px" }} />
              {loading ? "Syncing..." : "Sync API"}
            </button>
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
                {loading && resources.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                      <RefreshCw size={28} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                      <div>Loading live resource roster from API...</div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                      <div>No engineering resources found from API.</div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((res) => (
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
                )))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  );
}
