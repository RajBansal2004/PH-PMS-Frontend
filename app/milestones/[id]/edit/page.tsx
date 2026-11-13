
import type { Metadata } from "next";
import MilestoneForm from "../../../../components/milestones/MilestoneForm";

export const metadata: Metadata = {
  title: "Edit Milestone",
  description: "Update project milestone details.",
};

export default async function EditMilestonePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <MilestoneForm mode="edit" milestoneId={id} />;
}
