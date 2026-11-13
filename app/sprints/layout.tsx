import { Shell } from "../../components/Shell";

export default function SprintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Shell>{children}</Shell>;
}