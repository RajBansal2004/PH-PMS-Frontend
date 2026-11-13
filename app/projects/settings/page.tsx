
import type { Metadata } from "next";
import ProjectSettingsPage from "../../../components/projects/ProjectSettingsPage";

export const metadata: Metadata = {
  title: "Project Settings | PH-PMS",
  description:
    "Configure project information, team access, workflows, notifications, integrations and financial settings.",
};

export default function Page() {
  return <ProjectSettingsPage />;
}
