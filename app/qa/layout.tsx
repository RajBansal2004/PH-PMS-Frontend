import { Shell } from "../../components/Shell";

export default function QaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Shell>{children}</Shell>;
}
