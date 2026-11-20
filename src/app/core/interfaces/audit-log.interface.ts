export type AuditActionType =
  | 'ASSET_CREATED'
  | 'ASSET_UPDATED'
  | 'ASSET_PURCHASED'
  | 'ASSET_RETIRED'
  | 'ASSET_SCRAPPED'
  | 'ASSET_ASSIGNED'
  | 'ASSET_TRANSFERRED'
  | 'ASSET_RETURNED'
  | 'MAINTENANCE_CREATED'
  | 'MAINTENANCE_ASSIGNED'
  | 'MAINTENANCE_STARTED'
  | 'MAINTENANCE_RESOLVED'
  | 'MAINTENANCE_CLOSED';

export type AuditModuleType =
  | 'ASSETS'
  | 'ASSIGNMENTS'
  | 'MAINTENANCE'
  | 'PURCHASES'
  | 'USERS'
  | 'SETTINGS';

export interface AuditLog {
  id: string;
  displayId?: string;
  auditId: string;
  timestamp: string;
  userId?: string | null;
  userName: string;
  userRole: string;
  action: AuditActionType | string;
  module: AuditModuleType | string;
  assetId?: string | null;
  assetName?: string;
  serialNumber?: string;
  description: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogFilter {
  search?: string;
  action?: string;
  module?: string;
  assetId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogStats {
  total: number;
  assets: number;
  assignments: number;
  maintenance: number;
}
