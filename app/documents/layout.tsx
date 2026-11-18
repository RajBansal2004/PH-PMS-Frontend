import { Shell } from "../../components/Shell";

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Shell>{children}</Shell>;
}
