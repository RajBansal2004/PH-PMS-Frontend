"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  FileText,
  History,
  MessageSquare,
  RefreshCw,
  Users,
} from "lucide-react";

import { brdApi, BrdApiError } from "../../lib/brd/api";
import type { BrdDetail as BrdDetailType } from "../../lib/brd/types";

import BrdDetailHeader from "./BrdDetailHeader";
import BrdStatusBadge from "./BrdStatusBadge";
import BrdScopeCard from "./BrdScopeCard";
import BrdStakeholdersTable from "./BrdStakeholdersTable";
import BrdDeliverablesTable from "./BrdDeliverablesTable";
import BrdAttachmentsTable from "./BrdAttachmentsTable";
import BrdApprovalTimeline from "./BrdApprovalTimeline";
import BrdQuickActions from "./BrdQuickActions";
import "./brd-detail.css";

type Props = {
  brdId: string;
};

const tabs = [
  "Overview",
  "Content",
  "Scope",
  "Stakeholders",
  "Requirements",
  "Deliverables",
  "Attachments",
  "Comments",
  "Approvals",
  "Revision History",
  "Activity Log",
] as const;

type Tab = (typeof tabs)[number];

export default function BrdDetail({ brdId }: Props) {
  const [brd, setBrd] = useState<BrdDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  const loadBrd = useCallback(async () => {
    setLoading(true);
    setError("");
    setStatusCode(null);

    try {
      const result = await brdApi.get(brdId);
      setBrd(result);
    } catch (err) {
      setBrd(null);

      if (err instanceof BrdApiError) {
        setStatusCode(err.status);
        setError(err.message);
      } else {
        setError("Unable to load this BRD. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [brdId]);

  useEffect(() => {
    void loadBrd();
  }, [loadBrd]);

  if (loading) {
    return (
      <section className="brd-card" aria-busy="true">
        <div className="brd-card-body">
          <p>Loading BRD details…</p>
        </div>
      </section>
    );
  }

  if (error || !brd) {
    const notFound = statusCode === 404;
    const forbidden = statusCode === 403;
    const unauthenticated = statusCode === 401;

    return (
      <section className="brd-card" role="alert">
        <div className="brd-card-body">
          <h1>
            {notFound
              ? "BRD not found"
              : forbidden
                ? "Access denied"
                : unauthenticated
                  ? "Sign-in required"
                  : "Unable to load BRD"}
          </h1>

          <p className="brd-description">
            {error || "The requested document could not be loaded."}
          </p>

          <div className="brd-header-actions">
            <Link
              className="brd-button"
              href="/brd-requirements/brd-registry"
            >
              <ArrowLeft size={14} />
              Back to Registry
            </Link>

            {!notFound && !forbidden && !unauthenticated && (
              <button
                type="button"
                className="brd-button brd-button-primary"
                onClick={() => void loadBrd()}
              >
                <RefreshCw size={14} />
                Retry
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  const contentTabs: Record<Tab, React.ReactNode> = {
    Overview: (
      <div className="brd-overview-grid">
        <div className="brd-column">
          <section className="brd-card">
            <h2 className="brd-card-title">1. Document Summary</h2>
            <div className="brd-card-body">
              <p className="brd-description">{brd.description}</p>

              <h3 className="brd-subheading">Business Objectives</h3>
              {brd.objectives.length ? (
                <ul className="brd-bullet-list">
                  {brd.objectives.map((objective, index) => (
                    <li key={`${index}-${objective}`}>{objective}</li>
                  ))}
                </ul>
              ) : (
                <p>No objectives have been added.</p>
              )}
            </div>
          </section>

          <section className="brd-card">
            <h2 className="brd-card-title">2. Document Details</h2>
            <div className="brd-card-body">
              <div className="brd-detail-metrics">
                <div>
                  <span>Confidentiality</span>
                  <strong>{brd.confidentiality}</strong>
                </div>
                <div>
                  <span>Estimated Pages</span>
                  <strong>{brd.estimatedPages ?? "—"}</strong>
                </div>
                <div>
                  <span>Estimated Effort</span>
                  <strong>
                    {brd.estimatedEffortHours != null
                      ? `${brd.estimatedEffortHours} hours`
                      : "—"}
                  </strong>
                </div>
                <div>
                  <span>Target Release</span>
                  <strong>{brd.targetReleaseDate || "—"}</strong>
                </div>
                <div>
                  <span>Review Due</span>
                  <strong>{brd.reviewDueDate || "—"}</strong>
                </div>
                <div>
                  <span>Next Review</span>
                  <strong>{brd.nextReviewDate || "—"}</strong>
                </div>
              </div>

              <div className="brd-tags">
                {brd.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="brd-column">
          <BrdScopeCard items={brd.scope} />

          <section className="brd-card">
            <h2 className="brd-card-title">5. Key Deliverables</h2>
            <div className="brd-card-body">
              <BrdDeliverablesTable items={brd.deliverables} />
            </div>
          </section>
        </div>

        <div className="brd-column">
          <section className="brd-card">
            <h2 className="brd-card-title">6. Stakeholders</h2>
            <div className="brd-card-body">
              <BrdStakeholdersTable items={brd.stakeholders} />
            </div>
          </section>

          <section className="brd-card">
            <h2 className="brd-card-title">7. Attachments</h2>
            <div className="brd-card-body">
              <BrdAttachmentsTable items={brd.attachments} />
            </div>
          </section>
        </div>

        <div className="brd-column brd-bottom-left">
          <BrdApprovalTimeline approvals={brd.approvals} />
        </div>

        <div className="brd-column">
          <BrdQuickActions
            brd={brd}
            onRefresh={loadBrd}
          />
        </div>
      </div>
    ),

    Content: (
      <section className="brd-card">
        <h2 className="brd-card-title">Document Content</h2>
        <div className="brd-card-body">
          <p className="brd-description">{brd.description}</p>
          <p>Content sections can be connected to the BRD content API.</p>
        </div>
      </section>
    ),

    Scope: <BrdScopeCard items={brd.scope} />,

    Stakeholders: (
      <section className="brd-card">
        <h2 className="brd-card-title">
          <Users size={16} /> Stakeholders
        </h2>
        <div className="brd-card-body">
          <BrdStakeholdersTable items={brd.stakeholders} />
        </div>
      </section>
    ),

    Requirements: (
      <section className="brd-card">
        <h2 className="brd-card-title">Requirements</h2>
        <div className="brd-card-body">
          <p className="brd-description">
            Requirement records need to be fetched from the requirements
            endpoint associated with this BRD.
          </p>
        </div>
      </section>
    ),

    Deliverables: (
      <section className="brd-card">
        <h2 className="brd-card-title">Deliverables</h2>
        <div className="brd-card-body">
          <BrdDeliverablesTable items={brd.deliverables} />
        </div>
      </section>
    ),

    Attachments: (
      <section className="brd-card">
        <h2 className="brd-card-title">Attachments</h2>
        <div className="brd-card-body">
          <BrdAttachmentsTable items={brd.attachments} />
        </div>
      </section>
    ),

    Comments: (
      <section className="brd-card">
        <h2 className="brd-card-title">
          <MessageSquare size={16} /> Comments
        </h2>
        <div className="brd-card-body">
          {brd.comments.length ? (
            brd.comments.map((item) => (
              <article className="brd-comment-item" key={item.id}>
                <strong>{item.author}</strong>
                <p>{item.content}</p>
                <small>{item.createdAt}</small>
              </article>
            ))
          ) : (
            <p>No comments have been added.</p>
          )}
        </div>
      </section>
    ),

    Approvals: <BrdApprovalTimeline approvals={brd.approvals} />,

    "Revision History": (
      <section className="brd-card">
        <h2 className="brd-card-title">
          <History size={16} /> Revision History
        </h2>
        <div className="brd-card-body">
          {brd.revisions.length ? (
            <div className="brd-table-wrap">
              <table className="brd-table">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Summary</th>
                    <th>Created By</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {brd.revisions.map((revision) => (
                    <tr key={revision.id}>
                      <td>{revision.version}</td>
                      <td>{revision.summary}</td>
                      <td>{revision.createdBy}</td>
                      <td>{revision.createdAt}</td>
                      <td><BrdStatusBadge value={revision.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No revisions are available.</p>
          )}
        </div>
      </section>
    ),

    "Activity Log": (
      <section className="brd-card">
        <h2 className="brd-card-title">
          <Activity size={16} /> Activity Log
        </h2>
        <div className="brd-card-body">
          {brd.activities.length ? (
            brd.activities.map((activity) => (
              <article className="brd-activity-item" key={activity.id}>
                <CheckCircle2 size={16} />
                <div>
                  <strong>{activity.action}</strong>
                  <p>{activity.details || ""}</p>
                  <small>
                    {activity.actor} · {activity.createdAt}
                  </small>
                </div>
              </article>
            ))
          ) : (
            <p>No activity has been recorded.</p>
          )}
        </div>
      </section>
    ),
  };

  return (
    <div className="brd-detail">
      <BrdDetailHeader
        brdId={brd.id}
        title={brd.title}
        status={brd.status}
        version={brd.version}
      />

      <div className="brd-summary-strip">
        {[
          ["Project", brd.projectName],
          ["Client", brd.clientName],
          ["BRD Type", brd.type],
          ["Version", brd.version],
          ["Status", brd.status],
          ["Priority", brd.priority],
        ].map(([label, value]) => (
          <div className="brd-summary-item" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <nav className="brd-tabs" aria-label="BRD detail sections">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? "active" : ""}
            aria-current={activeTab === tab ? "page" : undefined}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {contentTabs[activeTab]}
    </div>
  );
}