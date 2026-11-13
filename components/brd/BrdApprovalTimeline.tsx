import { Check, Clock3, X } from "lucide-react";
import type { BrdApproval } from "../../lib/brd/types";
import BrdStatusBadge from "./BrdStatusBadge";

type Props = {
  approvals: BrdApproval[];
};

export default function BrdApprovalTimeline({ approvals }: Props) {
  return (
    <section className="brd-card">
      <h2 className="brd-card-title">3. Approval Status</h2>

      <div className="brd-card-body">
        {approvals.length === 0 ? (
          <p>No approval stages have been configured.</p>
        ) : (
          <div className="brd-approval-steps">
            {approvals.map((approval) => (
              <article
                className="brd-approval-step"
                key={approval.id}
              >
                <div className="brd-approval-icon">
                  {approval.status === "Approved" ? (
                    <Check size={15} />
                  ) : approval.status === "Rejected" ? (
                    <X size={15} />
                  ) : (
                    <Clock3 size={15} />
                  )}
                </div>

                <strong>{approval.stage}</strong>
                <span>{approval.approver}</span>
                <BrdStatusBadge value={approval.status} />

                {approval.actedAt && (
                  <small>{approval.actedAt}</small>
                )}

                {approval.comment && (
                  <p>{approval.comment}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}