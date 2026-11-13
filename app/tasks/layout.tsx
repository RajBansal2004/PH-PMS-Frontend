import { Shell } from "../../components/Shell";

export default function TaskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Shell>{children}</Shell>;
}