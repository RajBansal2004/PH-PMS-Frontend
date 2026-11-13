
import type { Metadata } from "next";
import { Shell } from "../../components/Shell";

export const metadata: Metadata = {
  title: {
    default: "Milestone Management",
    template: "%s | Milestone Management",
  },
  description:
    "Manage project milestones, schedules, dependencies and progress.",
};

export default function MilestoneLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <Shell>{children}</Shell>;
}
