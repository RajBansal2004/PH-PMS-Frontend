
import type { Metadata } from "next";
import MilestoneRegistry from "../../components/milestones/MilestoneRegistry";

export const metadata: Metadata = {
  title: "Milestone Registry",
  description:
    "Central repository of project milestones and their progress.",
};

export default function MilestoneRegistryPage() {
  return <MilestoneRegistry />;
}
