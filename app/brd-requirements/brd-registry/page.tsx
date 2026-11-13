import type { Metadata } from "next";
import BrdRegistry from "../../../components/brd/BrdRegistry";

export const metadata: Metadata = {
  title: "BRD Registry",
  description: "Browse and manage business requirement documents.",
};

export default function BrdRegistryPage() {
  return <BrdRegistry />;
}