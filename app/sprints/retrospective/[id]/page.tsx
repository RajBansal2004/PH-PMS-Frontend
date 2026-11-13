import SprintRetrospective from "../../../../components/sprints/retrospective/SprintRetrospective";


export default async function RetrospectivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SprintRetrospective sprintId={id} />;
}
