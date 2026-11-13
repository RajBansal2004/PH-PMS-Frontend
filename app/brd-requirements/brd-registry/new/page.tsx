
import type { Metadata } from "next";
import BrdCreateWizard from "../../../../components/brd/BrdCreateWizard";

export const metadata: Metadata = {
  title: "Create New BRD",
  description: "Create, review and submit a business requirement document.",
};

export default function CreateBrdPage() {
  return <BrdCreateWizard />;
}
