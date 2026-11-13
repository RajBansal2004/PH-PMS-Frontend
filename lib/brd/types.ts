export type BrdStatus =
  | "Draft"
  | "In Review"
  | "Client Review"
  | "Approved"
  | "Rejected"
  | "Archived";

export type BrdPriority = "Low" | "Medium" | "High" | "Critical";

export type BrdType =
  | "Business Requirement Document"
  | "Functional Requirement Document"
  | "Technical Requirement Document";

export interface BrdRecord {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  clientName: string;
  type: BrdType;
  version: string;
  status: BrdStatus;
  priority: BrdPriority;
  confidentiality: string;
  description: string;
  estimatedPages?: number;
  estimatedEffortHours?: number;
  targetReleaseDate?: string;
  reviewDueDate?: string;
  nextReviewDate?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface BrdStakeholder {
  id: string;
  name: string;
  role: string;
  organization: string;
  responsibility: string;
  email: string;
}

export interface BrdScopeItem {
  id: string;
  title: string;
  description?: string;
  included: boolean;
}

export interface BrdDeliverable {
  id: string;
  name: string;
  owner: string;
  targetDate: string;
  status: "Not Started" | "In Progress" | "Completed" | "Blocked";
}

export interface BrdAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
  downloadUrl?: string;
}

export interface BrdComment {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface BrdRevision {
  id: string;
  version: string;
  summary: string;
  createdBy: string;
  createdAt: string;
  status: BrdStatus;
}

export interface BrdApproval {
  id: string;
  stage: string;
  approver: string;
  status: "Pending" | "Approved" | "Rejected";
  comment?: string;
  actedAt?: string;
}

export interface BrdActivity {
  id: string;
  action: string;
  actor: string;
  createdAt: string;
  details?: string;
}

export interface BrdDetail extends BrdRecord {
  objectives: string[];
  scope: BrdScopeItem[];
  stakeholders: BrdStakeholder[];
  deliverables: BrdDeliverable[];
  attachments: BrdAttachment[];
  comments: BrdComment[];
  revisions: BrdRevision[];
  approvals: BrdApproval[];
  activities: BrdActivity[];
}

export interface BrdListResponse {
  items: BrdRecord[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface BrdListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: BrdStatus | "";
  priority?: BrdPriority | "";
  projectId?: string;
  sortBy?: "title" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface BrdCreateInput {
  title: string;
  projectId: string;
  clientName: string;
  type: BrdType;
  priority: BrdPriority;
  confidentiality: string;
  description: string;
  tags: string[];
  targetReleaseDate?: string;
  reviewDueDate?: string;
}

export type BrdUpdateInput = Partial<BrdCreateInput>;

export interface ApiErrorBody {
  message?: string;
  code?: string;
  errors?: Record<string, string[]>;
}