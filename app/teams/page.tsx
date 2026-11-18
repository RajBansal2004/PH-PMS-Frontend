import type { Metadata } from "next";
import TeamsPage from "../../components/organization/TeamsPage";

export const metadata: Metadata = {
  title: "Teams | PH-PMS",
  description:
    "Manage organization teams, members, hierarchy, permissions, and settings.",
};

export default function Page() {
  return <TeamsPage />;
}
