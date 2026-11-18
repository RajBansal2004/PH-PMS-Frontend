import TaskDependencyGraph from "../../../components/tasks/TaskDependencyGraph";

export const metadata = {
  title: "Task Dependency Graph (TSK-007) | PH-PMS",
  description: "Visual DAG representation of task dependencies and critical path",
};

export default function DependencyGraphPage() {
  return <TaskDependencyGraph />;
}
