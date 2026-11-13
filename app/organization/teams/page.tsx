import type { Metadata } from "next";
import TeamsPage from "../../../components/organization/TeamsPage";

export const metadata: Metadata = {
  title: "Teams | PH-PMS",
  description: "Manage organization teams, members, permissions and hierarchy.",
};

export default function Page() {
  return <TeamsPage />;
}