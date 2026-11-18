import type { Metadata } from "next";
import RequirementCreateForm from "../../../../components/requirements/RequirementCreateForm";

export const metadata: Metadata = {
  title: "Create New Requirement | PH PMS",
  description: "Define a new functional or non-functional requirement for your project.",
};

export default function NewRequirementPage() {
  return <RequirementCreateForm />;
}
