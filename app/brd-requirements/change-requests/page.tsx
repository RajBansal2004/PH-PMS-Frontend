import type { Metadata } from "next";
import ChangeRequestManagement from "../../../components/requirements/ChangeRequestManagement";

export const metadata: Metadata = {
  title: "Change Request Management",
  description: "Track, evaluate, and approve project scope change requests, effort/cost impacts, and timeline extensions.",
};

export default function ChangeRequestsPage() {
  return <ChangeRequestManagement />;
}
