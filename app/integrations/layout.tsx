import { Shell } from "../../components/Shell";

export default function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Shell>{children}</Shell>;
}
