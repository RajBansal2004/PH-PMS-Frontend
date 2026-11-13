
import type { Metadata } from "next";
import MilestoneForm from "../../../components/milestones/MilestoneForm";

export const metadata: Metadata = {
  title: "Create Milestone",
  description: "Create or edit a project milestone.",
};

export default function CreateMilestonePage() {
  return <MilestoneForm mode="create" />;
}
