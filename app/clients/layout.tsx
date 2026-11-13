import { Shell } from "../../components/Shell";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Shell>{children}</Shell>;
}