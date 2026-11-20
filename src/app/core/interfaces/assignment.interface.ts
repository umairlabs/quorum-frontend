export type AssignmentStatus = 'Assigned' | 'Returned' | 'Overdue';

export interface Assignment {
  id: string;
  displayId?: string;
  unitId?: string;
  assetId?: string;
  assetIcon?: string;
  assetName: string;
  brand?: string;
  model?: string;
  serialNumber: string;
  employeeId: string;
  employeeName: string;
  employeeInitials?: string;
  department: string;
  location?: string;
  assignedDate: string;
  expectedReturnDate?: string;
  returnedDate?: string;
  status: AssignmentStatus;
  notes?: string;
}

export interface AssignmentCreatePayload {
  unitId?: string;
  assetId?: string;
  employeeId?: string;
  employeeName: string;
  employeeInitials?: string;
  department?: string;
  location?: string;
  assignedDate?: string;
  expectedReturnDate?: string;
  notes?: string;
}

export interface AssignmentTransferPayload {
  employeeId: string;
  employeeName: string;
  department?: string;
  location?: string;
  assignedDate?: string;
  notes?: string;
}