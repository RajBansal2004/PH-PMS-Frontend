"use client";

import Link from "next/link";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FolderKanban,
  Users,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getDashboardOverview,
} from "../lib/api";

/* ============================================================
 * TYPES
 * ============================================================
 */

type DashboardKpi = {
  value: number | string;
  subtitle?: string;
  change?: string;
};

type DashboardData = {
  greeting: string;

  kpis: {
    activeProjects: DashboardKpi;

    overdueTasks: DashboardKpi;

    criticalBugs: DashboardKpi;

    availableResources: DashboardKpi;

    pendingUat: DashboardKpi;

    receivable: {
      value: number;

      formatted: string;

      collectionPercentage: number;
    };
  };

  projectPortfolio: {
    id: string;

    name: string;

    progress: number;
  }[];

  upcomingMilestones: {
    id: string;

    date: string | null;

    name: string;

    projectName: string;

    status: string;
  }[];

  deliveryHealth: {
    score: number;

    label: string;
  };

  recentActivity: {
    id: string;

    message: string;

    userName: string;

    date: string;
  }[];

  requiredDecisions: {
    id: string;

    title: string;

    priority:
      | "HIGH"
      | "MEDIUM"
      | "LOW";

    type: string;
  }[];

  commandCenter?: {
    row1_portfolio: {
      activeProjects: number;
      green: number;
      amber: number;
      red: number;
      upcomingClosures: number;
      totalContractValue: string;
    };
    row2_delivery: {
      overdueTasks: number;
      criticalBugs: number;
      blockedTasks: number;
      pendingUat: number;
      upcomingDeployments: number;
    };
    row3_people: {
      totalResources: number;
      allocated: number;
      availableBench: number;
      overallocated: number;
      utilizationRate: string;
    };
    row4_commercial: {
      contractValue: string;
      currentBilling: string;
      receivable: string;
      overdue: string;
      contributionMargin: string;
    };
    row5_intelligence: {
      topRisksCount: number;
      pendingDecisionsCount: number;
      aiForecast: string;
      resourceConflicts: number;
      clientDelaysCount: number;
    };
  };

  actionRequired?: {
    id: string;
    severity: string;
    project: string;
    reason: string;
    cause: string;
    action: string;
  }[];
};

/* ============================================================
 * EMPTY STATE
 * ============================================================
 */

const emptyDashboard: DashboardData = {
  greeting: "Good morning",

  kpis: {
    activeProjects: {
      value: 0,

      change:
        "No new projects this month",
    },

    overdueTasks: {
      value: 0,

      subtitle:
        "Everything on track",
    },

    criticalBugs: {
      value: 0,

      subtitle:
        "QA data unavailable",
    },

    availableResources: {
      value: 0,

      subtitle:
        "Active employees",
    },

    pendingUat: {
      value: 0,

      subtitle:
        "UAT data unavailable",
    },

    receivable: {
      value: 0,

      formatted: "₹ 0",

      collectionPercentage: 0,
    },
  },

  projectPortfolio: [],

  upcomingMilestones: [],

  deliveryHealth: {
    score: 0,

    label: "No data",
  },

  recentActivity: [],

  requiredDecisions: [],

  commandCenter: {
    row1_portfolio: {
      activeProjects: 0,
      green: 0,
      amber: 0,
      red: 0,
      upcomingClosures: 0,
      totalContractValue: "₹ 0",
    },
    row2_delivery: {
      overdueTasks: 0,
      criticalBugs: 0,
      blockedTasks: 0,
      pendingUat: 0,
      upcomingDeployments: 0,
    },
    row3_people: {
      totalResources: 0,
      allocated: 0,
      availableBench: 0,
      overallocated: 0,
      utilizationRate: "0%",
    },
    row4_commercial: {
      contractValue: "₹ 0",
      currentBilling: "₹ 0",
      receivable: "₹ 0",
      overdue: "₹ 0",
      contributionMargin: "0%",
    },
    row5_intelligence: {
      topRisksCount: 0,
      pendingDecisionsCount: 0,
      aiForecast: "Healthy",
      resourceConflicts: 0,
      clientDelaysCount: 0,
    },
  },

  actionRequired: [],
};

/* ============================================================
 * COMPONENT
 * ============================================================
 */

export function Dashboard() {
  const [
    data,
    setData,
  ] =
    useState<DashboardData>(
      emptyDashboard
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const loadDashboard =
    useCallback(
      async () => {
        try {
          setLoading(true);

          setError(null);

          const response =
            await getDashboardOverview();

          /*
           * Supports:
           *
           * { success: true, data: {...} }
           *
           * and
           *
           * {...}
           */

          const dashboard =
            response?.data ??
            response;

          if (!dashboard) {
            throw new Error(
              "Dashboard response is empty."
            );
          }

          setData(
            normalizeDashboard(
              dashboard
            )
          );
        } catch (error) {
          console.error(
            "Dashboard loading failed:",
            error
          );

          setError(
            getDashboardErrorMessage(
              error
            )
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* ==========================================================
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return (
      <DashboardSkeleton />
    );
  }

  /* ==========================================================
   * ERROR
   * ==========================================================
   */

  if (error) {
    return (
      <div className="p-6">
        <div className="card p-8">
          <div
            style={{
              display: "flex",
              alignItems:
                "flex-start",
              gap: "16px",
            }}
          >
            <AlertTriangle
              size={24}
            />

            <div>
              <h2>
                Unable to load dashboard
              </h2>

              <p>
                {error}
              </p>

              <button
                type="button"
                className="btn primary"
                onClick={
                  loadDashboard
                }
                style={{
                  marginTop:
                    "16px",
                }}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const {
    kpis,
    projectPortfolio,
    upcomingMilestones,
    deliveryHealth,
    recentActivity,
    requiredDecisions,
  } = data;

  /* ==========================================================
   * UI
   * ==========================================================
   */

  return (
    <div>
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="page-head">
        <div>
          <div className="eyebrow">
            EXECUTIVE WORKBENCH
          </div>

          <h1>
            {data.greeting}
          </h1>

          <p>
            Here is what is happening
            across your projects today.
          </p>
        </div>

        <div>
          <Link
            href="/projects/new"
            className="btn primary"
          >
            + New Project
          </Link>
        </div>
      </div>

      {/* ======================================================
          ACTION REQUIRED PANEL (BRD SECTION 56)
      ====================================================== */}
      {data.actionRequired && data.actionRequired.length > 0 && (
        <section className="card" style={{ borderLeft: "4px solid #ef4444", marginBottom: "1.5rem" }}>
          <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertTriangle size={18} color="#ef4444" />
              <b style={{ color: "#ef4444" }}>Action Required — Critical Operational Attention</b>
            </div>
            <small style={{ color: "#64748b" }}>{data.actionRequired.length} alerts require managerial intervention</small>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
            {data.actionRequired.map((item) => (
              <div key={item.id} style={{ background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: "8px", padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <strong style={{ fontSize: "0.9rem", color: "#991b1b" }}>{item.project}</strong>
                  <span style={{ fontSize: "0.75rem", background: "#fecaca", color: "#991b1b", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                    {item.severity}
                  </span>
                </div>
                <p style={{ margin: "4px 0", fontSize: "0.85rem", color: "#1e293b", fontWeight: "500" }}>{item.reason}</p>
                <p style={{ margin: "2px 0 8px", fontSize: "0.8rem", color: "#64748b" }}>Cause: {item.cause}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #fee2e2", paddingTop: "6px" }}>
                  <small style={{ color: "#b91c1c", fontWeight: "bold" }}>Action: {item.action}</small>
                  <Link href="/approvals" style={{ fontSize: "0.75rem", color: "#dc2626", textDecoration: "underline", fontWeight: "bold" }}>
                    Resolve →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ======================================================
          FOUNDER / MD COMMAND CENTER (BRD SECTION 83)
      ====================================================== */}
    

      {/* ======================================================
          KPI GRID
      ====================================================== */}

      <div className="kpi-grid">
        <Kpi
          title="Active Projects"
          value={
            kpis.activeProjects
              .value
          }
          subtitle={
            kpis.activeProjects
              .change ??
            ""
          }
          icon={
            FolderKanban
          }
        />

        <Kpi
          title="Overdue Tasks"
          value={
            kpis.overdueTasks
              .value
          }
          subtitle={
            kpis.overdueTasks
              .subtitle ??
            ""
          }
          icon={
            AlertTriangle
          }
        />

        <Kpi
          title="Critical Bugs"
          value={
            kpis.criticalBugs
              .value
          }
          subtitle={
            kpis.criticalBugs
              .subtitle ??
            ""
          }
          icon={
            Activity
          }
        />

        <Kpi
          title="Available Resources"
          value={
            kpis
              .availableResources
              .value
          }
          subtitle={
            kpis
              .availableResources
              .subtitle ??
            ""
          }
          icon={
            Users
          }
        />

        <Kpi
          title="Pending UAT"
          value={
            kpis.pendingUat
              .value
          }
          subtitle={
            kpis.pendingUat
              .subtitle ??
            ""
          }
          icon={
            CheckCircle2
          }
        />

        <Kpi
          title="Receivable"
          value={
            kpis.receivable
              .formatted
          }
          subtitle={`${kpis.receivable.collectionPercentage}% collection`}
          icon={
            CircleDollarSign
          }
        />
      </div>

      {/* ======================================================
          PROJECT PORTFOLIO + MILESTONES
      ====================================================== */}

      <div className="dashboard-main">
        <section className="card">
          <div className="section-head">
            <b>
              Project Portfolio
            </b>

            <Link href="/projects">
              View Registry →
            </Link>
          </div>

          <div className="portfolio-bars">
            {projectPortfolio.length ===
            0 ? (
              <EmptyState
                text="No active projects found."
              />
            ) : (
              projectPortfolio.map(
                (project) => (
                  <div
                    key={
                      project.id
                    }
                  >
                    <span>
                      {
                        project.name
                      }
                    </span>

                    <div>
                      <i
                        style={{
                          width: `${project.progress}%`,
                        }}
                      />
                    </div>

                    <b>
                      {
                        project.progress
                      }
                      %
                    </b>
                  </div>
                )
              )
            )}
          </div>
        </section>

        <section className="card">
          <div className="section-head">
            <b>
              Upcoming Milestones
            </b>

            <Link href="/milestones">
              View All
            </Link>
          </div>

          <div className="milestone-list">
            {upcomingMilestones.length ===
            0 ? (
              <EmptyState
                text="No upcoming milestones."
              />
            ) : (
              upcomingMilestones.map(
                (milestone) => {
                  const date =
                    milestone.date
                      ? new Date(
                          milestone.date
                        )
                      : null;

                  return (
                    <div
                      key={
                        milestone.id
                      }
                    >
                      <strong>
                        {date
                          ? date.getDate()
                          : "—"}

                        <small>
                          {date
                            ? date.toLocaleDateString(
                                "en-US",
                                {
                                  month:
                                    "short",
                                }
                              )
                            : ""}
                        </small>
                      </strong>

                      <span>
                        <b>
                          {
                            milestone.name
                          }
                        </b>

                        <small>
                          {
                            milestone.projectName
                          }
                        </small>
                      </span>

                      <em>
                        {
                          milestone.status
                        }
                      </em>
                    </div>
                  );
                }
              )
            )}
          </div>
        </section>
      </div>

      {/* ======================================================
          LOWER GRID
      ====================================================== */}

      <div className="lower-grid">
        {/* DELIVERY HEALTH */}

        <section className="card">
          <div className="section-head">
            <b>
              Delivery Health
            </b>

            <Link href="/reports">
              View Report →
            </Link>
          </div>

          <div className="big-health">
            <div>
              {
                deliveryHealth.score
              }
            </div>

            <strong>
              {
                deliveryHealth.label
              }
            </strong>

            <small>
              Portfolio health score
            </small>
          </div>
        </section>

        {/* RECENT ACTIVITY */}

        <section className="card">
          <div className="section-head">
            <b>
              Recent Activity
            </b>

            <Link href="/activity">
              View All
            </Link>
          </div>

          <div className="timeline-list">
            {recentActivity.length ===
            0 ? (
              <EmptyState
                text="No recent activity available."
              />
            ) : (
              recentActivity.map(
                (activity) => (
                  <div
                    key={
                      activity.id
                    }
                  >
                    <span className="dot d1" />

                    <div>
                      <b>
                        {
                          activity.message
                        }
                      </b>

                      <small>
                        {
                          activity.userName
                        }
                      </small>
                    </div>

                    <em>
                      {formatDate(
                        activity.date
                      )}
                    </em>
                  </div>
                )
              )
            )}
          </div>
        </section>

        {/* REQUIRED DECISIONS */}

        <section className="card">
          <div className="section-head">
            <b>
              Required Decisions
            </b>
          </div>

          <div className="decision-list">
            {requiredDecisions.length ===
            0 ? (
              <EmptyState
                text="No pending decisions."
              />
            ) : (
              requiredDecisions.map(
                (decision) => (
                  <div
                    key={
                      decision.id
                    }
                  >
                    <AlertTriangle />

                    <span>
                      {
                        decision.title
                      }
                    </span>

                    <b>
                      {
                        decision.priority
                      }
                    </b>
                  </div>
                )
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ============================================================
 * KPI
 * ============================================================
 */

function Kpi({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;

  value: string | number;

  subtitle: string;

  icon: React.ElementType;
}) {
  return (
    <div className="kpi card">
      <span className="kpi-icon blue">
        <Icon size={20} />
      </span>

      <div>
        <small>
          {title}
        </small>

        <strong>
          {value}
        </strong>

        <em>
          {subtitle}
        </em>
      </div>
    </div>
  );
}

/* ============================================================
 * EMPTY STATE
 * ============================================================
 */

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="empty-state">
      {text}
    </div>
  );
}

/* ============================================================
 * DATE
 * ============================================================
 */

function formatDate(
  value: string
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

/* ============================================================
 * NORMALIZATION
 * ============================================================
 */

function normalizeDashboard(
  input: any
): DashboardData {
  const source =
    input || {};

  const kpis =
    source.kpis || {};

  return {
    greeting:
      source.greeting ||
      "Good morning",

    kpis: {
      activeProjects: {
        value:
          kpis.activeProjects
            ?.value ??
          0,

        change:
          kpis.activeProjects
            ?.change ??
          "No new projects this month",
      },

      overdueTasks: {
        value:
          kpis.overdueTasks
            ?.value ??
          0,

        subtitle:
          kpis.overdueTasks
            ?.subtitle ??
          "Everything on track",
      },

      criticalBugs: {
        value:
          kpis.criticalBugs
            ?.value ??
          0,

        subtitle:
          kpis.criticalBugs
            ?.subtitle ??
          "QA data unavailable",
      },

      availableResources: {
        value:
          kpis
            .availableResources
            ?.value ??
          0,

        subtitle:
          kpis
            .availableResources
            ?.subtitle ??
          "Active employees",
      },

      pendingUat: {
        value:
          kpis.pendingUat
            ?.value ??
          0,

        subtitle:
          kpis.pendingUat
            ?.subtitle ??
          "UAT data unavailable",
      },

      receivable: {
        value:
          Number(
            kpis.receivable
              ?.value ?? 0
          ),

        formatted:
          kpis.receivable
            ?.formatted ??
          "₹ 0",

        collectionPercentage:
          Number(
            kpis.receivable
              ?.collectionPercentage ??
              0
          ),
      },
    },

    projectPortfolio:
      Array.isArray(
        source.projectPortfolio
      )
        ? source.projectPortfolio.map(
            (item: any) => ({
              id: String(
                item.id ||
                  item._id
              ),

              name:
                item.name ||
                "Unnamed Project",

              progress:
                Math.max(
                  0,
                  Math.min(
                    100,
                    Number(
                      item.progress ||
                        0
                    )
                  )
                ),
            })
          )
        : [],

    upcomingMilestones:
      Array.isArray(
        source.upcomingMilestones
      )
        ? source.upcomingMilestones.map(
            (item: any) => ({
              id: String(
                item.id ||
                  item._id
              ),

              date:
                item.date ||
                null,

              name:
                item.name ||
                "Unnamed Milestone",

              projectName:
                item.projectName ||
                "Project",

              status:
                item.status ||
                "UPCOMING",
            })
          )
        : [],

    deliveryHealth: {
      score: Math.max(
        0,
        Math.min(
          100,
          Number(
            source
              .deliveryHealth
              ?.score ?? 0
          )
        )
      ),

      label:
        source
          .deliveryHealth
          ?.label ||
        "No data",
    },

    recentActivity:
      Array.isArray(
        source.recentActivity
      )
        ? source.recentActivity
        : [],

    requiredDecisions:
      Array.isArray(
        source.requiredDecisions
      )
        ? source.requiredDecisions
        : [],

    commandCenter: source.commandCenter || emptyDashboard.commandCenter,

    actionRequired: Array.isArray(source.actionRequired) ? source.actionRequired : [],
  };
}

/* ============================================================
 * ERROR MESSAGE
 * ============================================================
 */

function getDashboardErrorMessage(
  error: unknown
) {
  if (
    error &&
    typeof error === "object"
  ) {
    const value =
      error as {
        message?: string;
        code?: string;
        status?: number;
      };

    if (
      value.code ===
      "ORGANIZATION_SETUP_REQUIRED"
    ) {
      return "Please complete organization setup before opening the dashboard.";
    }

    if (
      value.status === 401
    ) {
      return "Your session has expired. Please sign in again.";
    }

    if (
      value.status === 403
    ) {
      return "You do not have permission to access the dashboard.";
    }

    if (value.message) {
      return value.message;
    }
  }

  return "Unable to load dashboard. Please try again.";
}

/* ============================================================
 * LOADING SKELETON
 * ============================================================
 */

function DashboardSkeleton() {
  return (
    <div>
      <div className="page-head">
        <div>
          <div
            className="skeleton"
            style={{
              width: "160px",
              height: "12px",
              marginBottom:
                "14px",
            }}
          />

          <div
            className="skeleton"
            style={{
              width: "280px",
              height: "32px",
              marginBottom:
                "10px",
            }}
          />

          <div
            className="skeleton"
            style={{
              width: "380px",
              height: "16px",
            }}
          />
        </div>

        <div
          className="skeleton"
          style={{
            width: "130px",
            height: "42px",
            borderRadius:
              "8px",
          }}
        />
      </div>

      <div className="kpi-grid">
        {Array.from({
          length: 6,
        }).map((_, index) => (
          <div
            className="kpi card"
            key={index}
          >
            <div
              className="skeleton"
              style={{
                width: "40px",
                height: "40px",
                borderRadius:
                  "10px",
              }}
            />

            <div
              style={{
                flex: 1,
              }}
            >
              <div
                className="skeleton"
                style={{
                  width: "90px",
                  height: "12px",
                  marginBottom:
                    "10px",
                }}
              />

              <div
                className="skeleton"
                style={{
                  width: "60px",
                  height: "24px",
                  marginBottom:
                    "8px",
                }}
              />

              <div
                className="skeleton"
                style={{
                  width: "110px",
                  height: "10px",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-main">
        <SkeletonCard />

        <SkeletonCard />
      </div>

      <div className="lower-grid">
        <SkeletonCard />

        <SkeletonCard />

        <SkeletonCard />
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <section className="card">
      <div
        className="skeleton"
        style={{
          width: "180px",
          height: "18px",
          marginBottom:
            "25px",
        }}
      />

      <div
        className="skeleton"
        style={{
          width: "100%",
          height: "100px",
        }}
      />
    </section>
  );
}