import type { BrdDeliverable } from "../../lib/brd/types";
import BrdStatusBadge from "./BrdStatusBadge";

type Props = {
  items: BrdDeliverable[];
};

export default function BrdDeliverablesTable({ items }: Props) {
  if (!items.length) {
    return <p>No deliverables have been added.</p>;
  }

  return (
    <div className="brd-table-wrap">
      <table className="brd-table">
        <thead>
          <tr>
            <th>Deliverable</th>
            <th>Owner</th>
            <th>Target Date</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.owner}</td>
              <td>{item.targetDate || "—"}</td>
              <td><BrdStatusBadge value={item.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}