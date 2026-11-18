import { Shell } from "../../components/Shell";

export default function ResourceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Shell>{children}</Shell>;
}
