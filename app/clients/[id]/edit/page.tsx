import EditClient from "@/components/clients/EditClient";

export default async function ClientEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <EditClient clientId={id} />;
}
