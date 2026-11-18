import ResourceProfile from "../../../components/resources/ResourceProfile";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ResourceProfilePage({ params }: PageProps) {
  const { id } = await params;
  return <ResourceProfile resourceId={id} />;
}
