import SprintPlanning from "../../../../components/sprints/SprintPlanning";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SprintPlanningPage({ params }: PageProps) {
  const { id } = await params;

  return <SprintPlanning sprintId={id.toUpperCase()} />;
}