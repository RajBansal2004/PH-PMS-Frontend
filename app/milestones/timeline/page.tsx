
import type { Metadata } from "next";
import MilestoneTimeline from "../../../components/milestones/MilestoneTimeline";

export const metadata: Metadata = {
  title: "Milestone Timeline",
  description: "View project milestones, schedules, progress and dependencies.",
};

export default function MilestoneTimelinePage() {
  return <MilestoneTimeline />;
}
