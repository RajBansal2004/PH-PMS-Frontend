
export type MilestoneStatus =
  | "Completed"
  | "In Progress"
  | "Upcoming"
  | "At Risk"
  | "Overdue"
  | "On Hold"
  | "Cancelled";

export type MilestonePriority =
  | "Critical"
  | "High"
  | "Medium"
  | "Low";

export type MilestoneType =
  | "Project"
  | "Phase"
  | "Sprint"
  | "Release"
  | "Operational";

export interface Milestone {
  id: string;
  _id?: string;
  milestoneCode?: string;
  title: string;
  name?: string;
  projectId: string;
  projectCode?: string;
  projectName: string;
  clientName?: string;
  type: MilestoneType;
  plannedStart: string;
  plannedEnd: string;
  actualEnd?: string;
  status: MilestoneStatus;
  progress: number;
  priority: MilestonePriority;
  weight?: number;
  budget?: number;
  owner: {
    id: string;
    name: string;
    initials: string;
  };
  description?: string;
  businessObjective?: string;
  acceptanceCriteria?: string;
  businessRules?: string;
  dependencies?: string;
}

export interface MilestoneActivity {
  id: string;
  milestoneId: string;
  milestoneTitle: string;
  projectId: string;
  change: string;
  changedBy: string;
  changedAt: string;
  comment?: string;
}

export interface MilestoneListResponse {
  items: Milestone[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MilestoneFilters {
  search: string;
  projectId: string;
  status: string;
  type: string;
  ownerId: string;
  priority: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}
