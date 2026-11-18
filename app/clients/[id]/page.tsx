import ClientOverview from "@/components/clients/ClientOverview";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ClientOverview clientId={id} />;
}
