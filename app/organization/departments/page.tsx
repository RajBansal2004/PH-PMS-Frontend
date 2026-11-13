import type { Metadata } from "next";
import DepartmentsPage from "../../../components/organization/DepartmentsPage";

export const metadata: Metadata = {
  title: "Departments | PH-PMS",
  description: "Manage departments, team members, budgets and projects.",
};

export default function Page() {
  return <DepartmentsPage />;
}