"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Lock,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import {
  userRegistry,
  userRegistryStats,
  type UserRegistryItem,
  type UserRegistryStats,
} from "../../lib/api";

type StatusFilter =
  | ""
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "LOCKED";

const EMPTY_STATS: UserRegistryStats = {
  totalUsers: 0,
  activeUsers: 0,
  inactiveUsers: 0,
  lockedUsers: 0,
  newThisMonth: 0,
  activePercentage: 0,
  inactivePercentage: 0,
  lockedPercentage: 0,
};

function formatDate(
  value: string | null
) {
  if (!value) return "—";

  const date =
    new Date(value);

  if (Number.isNaN(
    date.getTime()
  )) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

function StatusBadge({
  status,
}: {
  status: UserRegistryItem["status"];
}) {
  const label =
    status === "LOCKED"
      ? "Locked"
      : status === "INACTIVE"
      ? "Inactive"
      : status === "SUSPENDED"
      ? "Suspended"
      : "Active";

  return (
    <span
      className={`user-status user-status-${status.toLowerCase()}`}
    >
      {label}
    </span>
  );
}

function StatCard({
  title,
  value,
  percentage,
  icon,
  tone,
  subtitle,
}: {
  title: string;
  value: number;
  percentage?: number;
  icon: React.ReactNode;
  tone: string;
  subtitle?: string;
}) {
  return (
    <div className="rbac-stat-card">
      <div
        className={`rbac-stat-icon ${tone}`}
      >
        {icon}
      </div>

      <div className="rbac-stat-content">
        <span>{title}</span>

        <strong>
          {value.toLocaleString(
            "en-IN"
          )}
        </strong>

        {percentage !== undefined ? (
          <small>
            {percentage.toFixed(2)}%
          </small>
        ) : subtitle ? (
          <small>
            {subtitle}
          </small>
        ) : null}
      </div>
    </div>
  );
}

export default function UserRegistryPage() {
  const [users, setUsers] =
    useState<UserRegistryItem[]>(
      []
    );

  const [stats, setStats] =
    useState<UserRegistryStats>(
      EMPTY_STATS
    );

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState<StatusFilter>("");

  const [page, setPage] =
    useState(1);

  const [limit] =
    useState(10);

  const [total, setTotal] =
    useState(0);

  const [pages, setPages] =
    useState(1);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadUsers =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const [
            usersResponse,
            statsResponse,
          ] = await Promise.all([
            userRegistry({
              page,
              limit,
              search:
                search.trim() ||
                undefined,
              status:
                status ||
                undefined,
            }),

            userRegistryStats(),
          ]);

          setUsers(
            usersResponse.items
          );

          const pagination =
            usersResponse.pagination;

          setTotal(
            Number(
              pagination?.total || 0
            )
          );

          setPages(
            Math.max(
              Number(
                pagination?.pages || 1
              ),
              1
            )
          );

          setStats(
            statsResponse
          );
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load users."
          );
        } finally {
          setLoading(false);
        }
      },
      [
        page,
        limit,
        search,
        status,
      ]
    );

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          void loadUsers();
        },
        250
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [loadUsers]);

  const pageStart =
    total === 0
      ? 0
      : (page - 1) * limit + 1;

  const pageEnd =
    Math.min(
      page * limit,
      total
    );

  const visiblePages =
    useMemo(() => {
      const result: number[] =
        [];

      const start =
        Math.max(
          1,
          page - 2
        );

      const end =
        Math.min(
          pages,
          page + 2
        );

      for (
        let value = start;
        value <= end;
        value++
      ) {
        result.push(value);
      }

      return result;
    }, [page, pages]);

  return (
    <section className="rbac-page">
      <div className="rbac-page-header">
        <div>
          <div className="rbac-breadcrumb">
            RBAC-001
          </div>

          <h1>
            User Registry
          </h1>

          <p>
            Manage all users across
            the organization.
          </p>
        </div>

        <button
          className="rbac-primary-btn"
          type="button"
          onClick={() =>
            window.location.assign(
              "/users/new"
            )
          }
        >
          <Plus size={15} />
          Add User
        </button>
      </div>

      <div className="rbac-stats-grid">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={
            <Users size={18} />
          }
          tone="blue"
          subtitle="View all"
        />

        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          percentage={
            stats.activePercentage
          }
          icon={
            <CheckCircle2
              size={18}
            />
          }
          tone="green"
        />

        <StatCard
          title="Inactive Users"
          value={stats.inactiveUsers}
          percentage={
            stats.inactivePercentage
          }
          icon={
            <AlertCircle
              size={18}
            />
          }
          tone="red"
        />

        <StatCard
          title="Locked Users"
          value={stats.lockedUsers}
          percentage={
            stats.lockedPercentage
          }
          icon={
            <Lock size={18} />
          }
          tone="orange"
        />

        <StatCard
          title="New This Month"
          value={stats.newThisMonth}
          icon={
            <UserRound
              size={18}
            />
          }
          tone="purple"
          subtitle="Current month"
        />
      </div>

      <div className="rbac-toolbar">
        <div className="rbac-search">
          <Search size={15} />

          <input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(
                event.target.value
              );
            }}
            placeholder="Search users..."
            aria-label="Search users"
          />
        </div>

        <select
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(
              event.target
                .value as StatusFilter
            );
          }}
          className="rbac-select"
          aria-label="Status"
        >
          <option value="">
            Status: All
          </option>

          <option value="ACTIVE">
            Active
          </option>

          <option value="INACTIVE">
            Inactive
          </option>

          <option value="LOCKED">
            Locked
          </option>

          <option value="SUSPENDED">
            Suspended
          </option>
        </select>

        <button
          type="button"
          className="rbac-filter-btn"
        >
          <Filter size={14} />
          More Filters
        </button>

        <div className="rbac-toolbar-spacer" />

        <button
          type="button"
          className="rbac-secondary-btn"
        >
          Import
        </button>

        <button
          type="button"
          className="rbac-secondary-btn"
        >
          Export
        </button>
      </div>

      {error ? (
        <div className="rbac-error">
          <AlertCircle size={17} />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="rbac-table-card">
        <div className="rbac-table-scroll">
          <table className="rbac-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Location</th>
                <th>Primary Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>MFA</th>
                <th>Created On</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({
                  length: 6,
                }).map(
                  (_, index) => (
                    <tr
                      key={
                        `loading-${index}`
                      }
                    >
                      <td
                        colSpan={10}
                      >
                        <div className="rbac-skeleton-row" />
                      </td>
                    </tr>
                  )
                )
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="rbac-empty"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map(
                  (user) => (
                    <tr
                      key={user.id}
                    >
                      <td>
                        <div className="rbac-user-cell">
                          <div className="rbac-avatar">
                            {user.name
                              .slice(
                                0,
                                2
                              )
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {
                                user.name
                              }
                            </strong>

                            <span>
                              {
                                user.email
                              }
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        {
                          user.employeeId
                        }
                      </td>

                      <td>
                        {
                          user.department
                        }
                      </td>

                      <td>
                        {
                          user.location
                        }
                      </td>

                      <td>
                        {
                          user.primaryRole
                        }
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            user.status
                          }
                        />
                      </td>

                      <td>
                        {formatDate(
                          user.lastLoginAt
                        )}
                      </td>

                      <td>
                        {user.mfaEnabled ? (
                          <ShieldCheck
                            size={15}
                            className="rbac-mfa-on"
                          />
                        ) : (
                          "—"
                        )}
                      </td>

                      <td>
                        {formatDate(
                          user.createdAt
                        )}
                      </td>

                      <td>
                        <div className="rbac-actions">
                          <button
                            type="button"
                            title="View User"
                            onClick={() =>
                              window.location.assign(
                                `/users/${user.id}`
                              )
                            }
                          >
                            <Eye
                              size={14}
                            />
                          </button>

                          <button
                            type="button"
                            title="Edit User"
                            onClick={() =>
                              window.location.assign(
                                `/users/${user.id}/edit`
                              )
                            }
                          >
                            <Pencil
                              size={14}
                            />
                          </button>

                          <button
                            type="button"
                            title="More actions"
                          >
                            •••
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="rbac-pagination">
          <span>
            Showing{" "}
            {pageStart}–{pageEnd} of{" "}
            {total} entries
          </span>

          <div className="rbac-pagination-actions">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() =>
                setPage(
                  (value) =>
                    Math.max(
                      value - 1,
                      1
                    )
                )
              }
            >
              <ChevronLeft
                size={14}
              />
            </button>

            {visiblePages.map(
              (value) => (
                <button
                  type="button"
                  key={value}
                  className={
                    value === page
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setPage(value)
                  }
                >
                  {value}
                </button>
              )
            )}

            <button
              type="button"
              disabled={
                page >= pages
              }
              onClick={() =>
                setPage(
                  (value) =>
                    Math.min(
                      value + 1,
                      pages
                    )
                )
              }
            >
              <ChevronRight
                size={14}
              />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}