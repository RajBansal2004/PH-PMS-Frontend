import Link from "next/link";
import {
  ChevronRight,
  FileText,
} from "lucide-react";

import type { BrdStatus } from "../../lib/brd/types";
import BrdStatusBadge from "./BrdStatusBadge";

type Props = {
  brdId: string;
  title: string;
  status: BrdStatus;
  version: string;
};

export default function BrdDetailHeader({
  brdId,
  title,
  status,
  version,
}: Props) {
  return (
    <header className="brd-page-header">
      <nav className="brd-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/projects">Projects</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <Link href="/brd-requirements/brd-registry">
          BRD Registry
        </Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span>{brdId} — BRD Detail</span>
      </nav>

      <div className="brd-title-row">
        <div className="brd-document-icon">
          <FileText size={22} aria-hidden="true" />
        </div>

        <div className="brd-title-content">
          <h1>{title}</h1>

          <div className="brd-title-meta">
            <span>{brdId}</span>
            <span>Version {version}</span>
            <BrdStatusBadge value={status} />
          </div>
        </div>
      </div>
    </header>
  );
}