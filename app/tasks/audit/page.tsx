import TaskActivityAudit from "../../../components/tasks/TaskActivityAudit";

export const metadata = {
  title: "Task Activity Audit (TSK-008) | PH-PMS",
  description: "Immutable audit trail of task transitions, time logs, and assignments",
};

export default function AuditPage() {
  return <TaskActivityAudit />;
}
