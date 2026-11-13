import {
  CheckCircle2,
  Clock3,
  FileText,
  ShieldAlert,
} from "lucide-react";

import type { BrdRecord } from "../../lib/brd/types";

type Props = {
  records: BrdRecord[];
};

export default function BrdSummaryCards({ records }: Props) {
  const counts = [
    {
      label: "Total BRDs",
      value: records.length,
      icon: FileText,
    },
    {
      label: "Approved",
      value: records.filter((item) => item.status === "Approved").length,
      icon: CheckCircle2,
    },
    {
      label: "In Review",
      value: records.filter(
        (item) =>
          item.status === "In Review" ||
          item.status === "Client Review",
      ).length,
      icon: Clock3,
    },
    {
      label: "High Priority",
      value: records.filter(
        (item) =>
          item.priority === "High" ||
          item.priority === "Critical",
      ).length,
      icon: ShieldAlert,
    },
  ];

  return (
    <div className="brd-summary-cards">
      {counts.map(({ label, value, icon: Icon }) => (
        <article className="brd-summary-card" key={label}>
          <div>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
          <Icon size={21} aria-hidden="true" />
        </article>
      ))}
    </div>
  );
}