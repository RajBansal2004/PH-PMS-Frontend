import ActiveSprint from "../../../../components/sprints/ActiveSprint";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ActiveSprintPage({ params }: PageProps) {
  const { id } = await params;

  return <ActiveSprint sprintId={id} />;
}
