import { Shell } from "../../components/Shell";

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Shell>{children}</Shell>;
}
