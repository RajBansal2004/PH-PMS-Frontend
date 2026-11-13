import type { BrdPriority, BrdStatus } from "../../lib/brd/types";

type Props = {
  value: BrdStatus | BrdPriority | string;
};

export default function BrdStatusBadge({ value }: Props) {
  const normalized = value.toLowerCase().replace(/\s+/g, "-");

  const className =
    normalized === "approved" || normalized === "completed"
      ? "brd-status-approved"
      : normalized === "rejected" || normalized === "critical"
        ? "brd-status-danger"
        : normalized === "in-review" ||
            normalized === "client-review" ||
            normalized === "in-progress" ||
            normalized === "high"
          ? "brd-status-progress"
          : normalized === "medium"
            ? "brd-status-medium"
            : "brd-status-neutral";

  return (
    <span className={`brd-status ${className}`}>
      {value}
    </span>
  );
}