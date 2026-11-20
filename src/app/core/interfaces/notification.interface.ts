// Asset-request sub-types emitted by the backend
export type AssetRequestSubType =
  | 'ASSET_REQUEST_SUBMITTED'   // employee confirmation
  | 'ASSET_REQUEST_NEW'         // manager/admin — new request arrived
  | 'ASSET_REQUEST_APPROVED'    // employee — request approved
  | 'ASSET_REQUEST_REJECTED'    // employee — request rejected
  | 'ASSET_REQUEST_ASSIGNED'    // employee — asset assigned, confirm receipt
  | 'ASSET_RECEIPT_CONFIRMED';  // manager/admin — employee confirmed receipt

export type NotificationType = 'MAINTENANCE' | 'ASSETS' | 'ASSIGNMENTS' | 'WARRANTY' | 'SYSTEM';

// 'REQUESTS' is a client-side–only filter that matches ASSETS notifications
// whose subType starts with 'ASSET_REQUEST_'
export type NotificationFilter =
  | 'ALL'
  | 'UNREAD'
  | 'READ'
  | 'REQUESTS'
  | 'MAINTENANCE'
  | 'ASSETS'
  | 'ASSIGNMENTS'
  | 'WARRANTY'
  | 'SYSTEM';

export interface NotificationItem {
  id: string;
  userId?: string | null;
  targetRole?: string;
  type: NotificationType;
  subType?: string;
  title: string;
  message: string;
  relatedAssetId?: string | null;
  relatedAssetName?: string;
  relatedMaintenanceId?: string | null;
  relatedMaintenanceRequestId?: string;
  relatedAssignmentId?: string | null;
  /** Asset-request UUID — used to navigate to the specific request */
  relatedRequestId?: string | null;
  /** Human-readable request number e.g. REQ-1001 */
  relatedRequestNumber?: string;
  isRead: boolean;
  createdAt: string;
}

export interface UnreadCountResponse {
  unread_count?: number;
  unreadCount?: number;
}

export interface NotificationPreferences {
  id?: string;
  userId?: string;

  // Maintenance
  maintenanceNewTicket: boolean;
  maintenanceAssignedToTech: boolean;
  maintenanceStatusChanged: boolean;
  maintenanceHighPriority: boolean;
  maintenanceCriticalAlert: boolean;
  maintenanceCompleted: boolean;
  maintenanceUpdated: boolean;

  // Assets
  assetAssigned: boolean;
  assetTransferred: boolean;
  assetReturned: boolean;
  assetRetired: boolean;
  assetScrapped: boolean;
  assetMaintenanceActivity: boolean;

  // Assignments
  assignmentNew: boolean;
  assignmentTransfer: boolean;
  assignmentReturn: boolean;

  // Warranty
  warrantyExpiringSoon: boolean;
  warrantyExpired: boolean;

  // System
  systemImportantAlerts: boolean;
  systemRequiredActions: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  maintenanceNewTicket: true,
  maintenanceAssignedToTech: true,
  maintenanceStatusChanged: true,
  maintenanceHighPriority: true,
  maintenanceCriticalAlert: true,
  maintenanceCompleted: true,
  maintenanceUpdated: true,

  assetAssigned: true,
  assetTransferred: true,
  assetReturned: true,
  assetRetired: true,
  assetScrapped: true,
  assetMaintenanceActivity: true,

  assignmentNew: true,
  assignmentTransfer: true,
  assignmentReturn: true,

  warrantyExpiringSoon: true,
  warrantyExpired: true,

  systemImportantAlerts: true,
  systemRequiredActions: true,
};
