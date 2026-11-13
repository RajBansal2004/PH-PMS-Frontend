import type { Metadata } from "next";
import RequirementTraceability from "../../../components/requirements/RequirementTraceability";

export const metadata: Metadata = {
  title: "Requirement Traceability Matrix",
  description:
    "Trace requirements across test cases, user stories, deliverables and acceptance criteria.",
};

export default function RequirementTraceabilityPage() {
  return <RequirementTraceability />;
}