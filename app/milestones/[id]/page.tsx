
import type { Metadata } from "next";
import MilestoneDetail from "../../../components/milestones/MilestoneDetail";

export const metadata: Metadata = {
  title: "Milestone Detail",
  description: "View milestone details, progress, deliverables and dependencies.",
};

export default async function MilestoneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <MilestoneDetail milestoneId={id} />;
}
