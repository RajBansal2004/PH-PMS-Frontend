import SprintReview from "../../../../components/sprints/review/SprintReview";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SprintReviewPage({ params }: Props) {
  const { id } = await params;

  return <SprintReview sprintId={id} />;
}