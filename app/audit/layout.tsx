import { Shell } from "../../components/Shell";

export default function AuditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Shell>{children}</Shell>;
}
