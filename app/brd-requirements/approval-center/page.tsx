import type { Metadata } from "next";
import ApprovalCenter from "../../../components/brd/ApprovalCenter";

export const metadata: Metadata = {
  title: "Approval Center",
  description: "Centralized review and approval workflow for project BRDs and Change Requests.",
};

export default function ApprovalCenterPage() {
  return <ApprovalCenter />;
}
