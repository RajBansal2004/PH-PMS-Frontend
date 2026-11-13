import type { Metadata } from "next";
import { Shell } from "../../components/Shell";

export const metadata: Metadata = {
  title: {
    default: "BRD & Requirements",
    template: "%s | BRD & Requirements",
  },
  description: "Manage BRDs, requirements, revisions and approvals.",
};

export default function BrdRequirementsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <Shell>{children}</Shell>;
}