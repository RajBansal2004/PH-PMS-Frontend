import type { Metadata } from "next";
import { notFound } from "next/navigation";

import BrdDetail from "../../../../components/brd/BrdDetail";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "BRD Detail",
  description:
    "View business requirements, stakeholders, deliverables and approvals.",
};

export default async function BrdDetailPage({ params }: Props) {
  const { id } = await params;

  if (!id || id.length > 100) {
    notFound();
  }

  return <BrdDetail brdId={id} />;
}