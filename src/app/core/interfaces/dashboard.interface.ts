export interface StatCard {
  label: string;
  value: string;
  icon: string;
  iconColor: string;
  meta: string;
  metaIcon?: string;
  metaIconColor?: string;
  progressWidth?: string;
  progressColor?: string;
  route?: string;
}

export type TicketStatus = 'In Progress' | 'Open' | 'Resolved' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED' | 'CANCELLED';

export interface MaintenanceTicket {
  id: string;
  rawId?: string;
  assetIcon: string;
  assetName: string;
  problem: string;
  technician: string;
  priority?: string;
  status: TicketStatus;
  date: string;
}

export interface ActivityItem {
  dotColor: string;
  type?: string;
  assetName?: string;
  description: string;
  highlighted?: string[];
  time: string;
}

export interface SummaryStats {
  totalAssets: number;
  assignedCount: number;
  availableCount: number;
  maintenanceCount: number;   // physical units with MAINTENANCE status
  maintenanceTickets: number; // total open maintenance request tickets
  scrappedCount: number;
  retiredCount: number;
  totalPurchaseValue: number;
  totalCurrentValue: number;
  totalAssetModels?: number;
  activeAssignments?: number;
  totalSpent?: number;
  totalPurchasesValue?: number;
  totalOutstanding?: number;
}

export interface StatusDistributionItem {
  label: string;
  count: number;
  percentage: number;
  color: string;
  hexColor: string;
}

export interface ChartSeriesItem {
  label: string;
  values: number[];
  strokeColor: string;
  legendColor: string;
}

export interface ValueOverview {
  xLabels: string[];
  series: ChartSeriesItem[];
}

export interface DashboardSummary {
  summary: SummaryStats;
  statusDistribution: StatusDistributionItem[];
  valueOverview: ValueOverview;
  recentMaintenanceTickets: MaintenanceTicket[];
  recentActivity: ActivityItem[];
}