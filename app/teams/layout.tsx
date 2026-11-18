import type { ReactNode } from "react";
import { Shell } from "../../components/Shell";

export default function TeamsLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <Shell>{children}</Shell>;
}
