import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RequirementDetail from "../../../../components/requirements/RequirementDetail";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Requirement Detail",
  description: "View user stories, business rules, acceptance criteria, and traceability links.",
};

export default async function RequirementDetailPage({ params }: Props) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  return <RequirementDetail requirementId={id} />;
}
