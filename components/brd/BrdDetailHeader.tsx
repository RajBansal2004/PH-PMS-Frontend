"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Edit3,
  FileText,
  Printer,
  Share2,
  CheckCircle2,
  Plus,
} from "lucide-react";

import type { BrdStatus, BrdPriority } from "../../lib/brd/types";
import BrdStatusBadge from "./BrdStatusBadge";

type Props = {
  brdId: string;
  title: string;
  status: BrdStatus;
  version: string;
  priority?: BrdPriority;
  projectName?: string;
  clientName?: string;
};

export default function BrdDetailHeader({
  brdId,
  title,
  status,
  version,
  priority = "High",
  projectName,
  clientName,
}: Props) {
  return (
    <header className="brd-page-header">
      <div className="brd-header-top-row">
        <nav className="brd-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/projects">Projects</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <Link href="/brd-requirements/brd-registry">BRD Registry</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <span className="brd-breadcrumb-current">{brdId}</span>
        </nav>

        <div className="brd-header-actions">
          <Link
            href="/brd-requirements/brd-registry"
            className="brd-btn brd-btn-outline"
          >
            <ArrowLeft size={14} /> Back to Registry
          </Link>
          <button
            type="button"
            className="brd-btn brd-btn-outline"
            onClick={() => window.print()}
          >
            <Printer size={14} /> Print
          </button>
          <button
            type="button"
            className="brd-btn brd-btn-outline"
            onClick={() => alert("BRD export generated successfully.")}
          >
            <Download size={14} /> Export PDF
          </button>
          <Link
            href="/brd-requirements/requirements"
            className="brd-btn brd-btn-outline"
          >
            <Plus size={14} /> Add Requirement
          </Link>
          <button
            type="button"
            className="brd-btn brd-btn-primary"
            onClick={() => alert("BRD is already in current workflow state: " + status)}
          >
            <CheckCircle2 size={14} /> {status === "Approved" ? "Approved Baseline" : "Submit for Approval"}
          </button>
        </div>
      </div>

      <div className="brd-title-hero-card">
        <div className="brd-title-left">
          <div className="brd-document-icon">
            <FileText size={26} aria-hidden="true" />
          </div>

          <div className="brd-title-content">
            <div className="brd-eyebrow-tag">
              BUSINESS REQUIREMENT DOCUMENT · {brdId}
            </div>
            <h1>{title}</h1>
            <p className="brd-title-sub">
              {projectName && <span>Project: <strong>{projectName}</strong></span>}
              {clientName && <span>Client: <strong>{clientName}</strong></span>}
            </p>

            <div className="brd-title-badges">
              <span className="brd-pill brd-pill-code">{brdId}</span>
              <span className="brd-pill brd-pill-version">Version {version}</span>
              <BrdStatusBadge value={status} />
              <span className="brd-pill brd-pill-priority">Priority: {priority}</span>
              <span className="brd-pill brd-pill-confidential">Confidential</span>
            </div>
          </div>
        </div>

        <div className="brd-title-right-kpi">
          <div className="brd-kpi-ring">
            <div className="brd-ring-circle">
              <span className="brd-ring-num">100%</span>
              <span className="brd-ring-label">Baseline</span>
            </div>
          </div>
          <div className="brd-kpi-dates">
            <div>
              <span>Governance</span>
              <strong>Formal Sign-off</strong>
            </div>
            <div>
              <span>Status</span>
              <strong style={{ color: "#059669" }}>{status}</strong>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
