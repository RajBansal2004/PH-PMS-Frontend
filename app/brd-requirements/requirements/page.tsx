import type { Metadata } from "next";
import RequirementRegistry from "../../../components/requirements/RequirementRegistry";

export const metadata: Metadata = {
  title: "Requirement Registry",
  description:
    "Manage, search and track project requirements, approvals and priorities.",
};

export default function RequirementRegistryPage() {
  return <RequirementRegistry />;
}