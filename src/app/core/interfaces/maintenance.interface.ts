export type MaintenanceStatus =
  | 'PENDING'
  | 'TODO'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'COMPLETED'
  | 'VERIFIED'
  | 'CANCELLED'
  | 'UNREPAIRABLE'
  | 'RESOLVED'
  | 'NOT_REPAIRABLE';

export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE' | 'EMERGENCY' | 'INSPECTION' | 'UPGRADE';

export interface MaintenanceTimelineEntry {
  id: string;
  status: MaintenanceStatus;
  label: string;
  timestamp: string;
  note?: string;
  workDone?: string;
  completedBy?: string;
}

export interface MaintenanceHistoryEntry {
  id: string;
  date: string;
  issue: string;
  action: string;
}

export interface MaintenanceRequest {
  id: string;
  displayId?: string;
  requestId: string;
  assetId: string;
  assetUnitId?: string;
  assetName: string;
  serialNumber: string;
  assetIcon?: string;
  componentOrIssueType: string;
  issueDescription: string;
  maintenanceType: MaintenanceType;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  timeline?: MaintenanceTimelineEntry[];
  assetMaintenanceHistory?: MaintenanceHistoryEntry[];
  notes?: string;
  requestedBy?: string;
  requestedByName?: string;
  department?: string;
  assignedEmployee?: string;
  assignedEmployeeDepartment?: string;
  technicianId?: string;
  technicianName?: string;
  assignedTechnician?: string;
  workDone?: string;
  findings?: string;
  technicianNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface MaintenanceStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

export interface CreateMaintenanceRequest {
  assetId: string;
  unitId?: string;
  componentOrIssueType: string;
  issueDescription: string;
  maintenanceType: MaintenanceType;
  priority: MaintenancePriority;
  assignedTechnician?: string;
  assignedTechnicianId?: string;
  technicianId?: string;
  technicianName?: string;
  assignedTo?: string;
  assigneeType?: 'TECHNICIAN' | 'MANAGER';
}

export interface UpdateMaintenanceStatusPayload {
  status: MaintenanceStatus;
  note?: string;
}

export interface MaintenanceWorkUpdatePayload {
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'RESOLVED' | 'NOT_REPAIRABLE' | MaintenanceStatus;
  workDone: string;
  technicianNotes?: string;
  technicianId?: string;
  technicianName?: string;
}

