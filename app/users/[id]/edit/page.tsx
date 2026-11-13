import UserWizard from "../../../../components/users/UserWizard";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditUserPage({
  params,
}: PageProps) {
  const { id } = await params;

  return (
    <UserWizard
      mode="edit"
      userId={id}
    />
  );
}