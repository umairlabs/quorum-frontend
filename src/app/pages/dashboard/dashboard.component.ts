import { Component, OnInit, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { StatCardsGridComponent } from './components/stat-cards-grid/stat-cards-grid.component';
import { SectionPanelComponent } from '../../core/components/section-panel/section-panel.component';
import { LineChartComponent, ChartSeries } from '../../core/components/line-chart/line-chart.component';
import { DonutChartComponent, DonutSegment } from '../../core/components/donut-chart/donut-chart.component';
import { ActivityFeedComponent } from '../../core/components/activity-feed/activity-feed.component';
import { StatusBadgeComponent } from '../../core/components/status-badge/status-badge.component';
import { DataTableComponent, TableColumn } from '../../core/components/data-table/data-table.component';
import { StatCard, MaintenanceTicket, ActivityItem, DashboardSummary, StatusDistributionItem, TicketStatus } from '../../core/interfaces/dashboard.interface';
import { DashboardApisService } from './services/dashboard-apis.service';
import { AuthApisService } from '../../core/services/api/auth-apis.service';
import { CurrencyService } from '../../core/services/currency.service';
import { MaintenanceService } from '../maintenance/services/maintenance.service';
import { NotificationService } from '../notifications/services/notification.service';

import { Location } from '@angular/common';

function normalizeRole(role: string | null | undefined): string {
  return (role || '').toUpperCase().replace(/\s+/g, '_');
}

import { SelectComponent } from '../../core/components/select/select.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    StatCardsGridComponent,
    SectionPanelComponent,
    LineChartComponent,
    DonutChartComponent,
    ActivityFeedComponent,
  ],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  private readonly location: Location = inject(Location);
  private readonly router: Router = inject(Router);
  private readonly dashboardApisService: DashboardApisService = inject(DashboardApisService);
  private readonly authService: AuthApisService = inject(AuthApisService);
  protected readonly currencyService: CurrencyService = inject(CurrencyService);
  protected readonly maintenanceService: MaintenanceService = inject(MaintenanceService);
  protected readonly notificationService: NotificationService = inject(NotificationService);

  protected goBack(): void {
    this.location.back();
  }

  // ── Reactive Signals ──────────────────────────────────────────────────────
  protected readonly summaryData: WritableSignal<DashboardSummary | null> = signal<DashboardSummary | null>(null);
  protected readonly isLoadingDashboard: WritableSignal<boolean> = signal<boolean>(true);
  protected readonly dashboardError: WritableSignal<string | null> = signal<string | null>(null);

  // ── Date Range Signals ─────────────────────────────────────────────────────
  protected readonly fromDate: WritableSignal<string> = signal<string>(
    (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; })()
  );
  protected readonly toDate: WritableSignal<string> = signal<string>(
    new Date().toISOString().split('T')[0]
  );

  // ── Role Access ───────────────────────────────────────────────────────────
  protected readonly userRole: Signal<string> = computed(() => {
    return normalizeRole(
      this.authService.currentUser()?.role || localStorage.getItem('role')
    );
  });

  protected readonly isTechnician: Signal<boolean> = computed(() => {
    const r = this.userRole();
    return r === 'EXTERNAL_TECHNICIAN' || r === 'TECHNICIAN' || r === 'TECH';
  });

  protected readonly isAdminOrManager: Signal<boolean> = computed(() => {
    const r = this.userRole();
    return r === 'SYSTEM_ADMIN' || r === 'SUPER_ADMIN' || r === 'ADMIN' || r === 'OPERATIONS_MANAGER' || r === 'MANAGER';
  });

  public ngOnInit(): void {
    this.loadDashboardSummary(this.fromDate(), this.toDate());
    this.maintenanceService.loadRequestsFromApi();
    this.notificationService.loadInitialData();
  }

  protected loadDashboardSummary(dateFrom?: string, dateTo?: string): void {
    this.isLoadingDashboard.set(true);
    this.dashboardError.set(null);

    this.dashboardApisService.getDashboardSummary(dateFrom, dateTo).subscribe({
      next: (summary: DashboardSummary) => {
        this.summaryData.set(summary);
        this.isLoadingDashboard.set(false);
      },
      error: (err: unknown) => {
        console.error('[Dashboard] Failed to load dashboard data:', err);
        this.dashboardError.set('Could not load dashboard information. Please verify your backend server.');
        this.isLoadingDashboard.set(false);
      }
    });
  }

  protected onFromDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fromDate.set(input.value);
    this.loadDashboardSummary(this.fromDate(), this.toDate());
  }

  protected onToDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.toDate.set(input.value);
    this.loadDashboardSummary(this.fromDate(), this.toDate());
  }

  // ── Derived Stat Cards ──────────────────────────────────────────────────
  protected readonly statCards: Signal<StatCard[]> = computed(() => {
    const isTech = this.isTechnician();

    if (isTech) {
      const reqs = this.maintenanceService.requests();
      const openCount = reqs.filter((r) => r.status === 'PENDING').length;
      const inProgressCount = reqs.filter((r) => r.status === 'IN_PROGRESS').length;
      const resolvedCount = reqs.filter((r) => r.status === 'COMPLETED' || r.status === 'VERIFIED').length;
      const urgentCount = reqs.filter(
        (r) => (r.status === 'PENDING' || r.status === 'IN_PROGRESS') && (r.priority === 'HIGH' || r.priority === 'CRITICAL')
      ).length;

      return [
        {
          label: 'Open Tickets',
          value: openCount.toString(),
          icon: 'pending_actions',
          iconColor: 'text-[#091426]',
          meta: openCount > 0 ? `${openCount} tickets pending` : 'No open tickets',
          metaIcon: 'info',
          metaIconColor: 'text-on-surface-variant',
          route: '/maintenance'
        },
        {
          label: 'In Progress',
          value: inProgressCount.toString(),
          icon: 'build',
          iconColor: 'text-[#091426]',
          meta: inProgressCount > 0 ? `${inProgressCount} active repairs` : 'No active repairs',
          metaIcon: 'sync',
          metaIconColor: 'text-on-surface-variant',
          route: '/maintenance'
        },
        {
          label: 'Resolved',
          value: resolvedCount.toString(),
          icon: 'task_alt',
          iconColor: 'text-[#091426]',
          meta: resolvedCount > 0 ? `${resolvedCount} resolved` : 'No resolved tickets',
          metaIcon: 'check',
          metaIconColor: 'text-on-surface-variant',
          route: '/maintenance'
        },
        {
          label: 'Urgent Tickets',
          value: urgentCount.toString(),
          icon: 'error',
          iconColor: 'text-[#091426]',
          meta: urgentCount > 0 ? `${urgentCount} urgent priority` : 'No urgent issues',
          metaIcon: urgentCount > 0 ? 'warning' : 'check',
          metaIconColor: 'text-on-surface-variant',
          route: '/maintenance'
        }
      ];
    }

    const data = this.summaryData();
    if (!data || !data.summary) return [];

    const sum = data.summary;

    const total = sum.totalAssets;
    const modelsCount = (sum as any).totalAssetModels || 0;
    const assigned = sum.assignedCount;
    const activeAssigns = (sum as any).activeAssignments || 0;
    const maintenance = sum.maintenanceCount;
    const maintenanceTickets = sum.maintenanceTickets ?? maintenance;
    const scrapped = sum.scrappedCount;
    const retired = sum.retiredCount || 0;

    const available = sum.availableCount;

    const purchaseVal = sum.totalPurchaseValue;

    const assignedPct = total > 0 ? Math.round((assigned / total) * 100) : 0;
    const availablePct = total > 0 ? Math.round((available / total) * 100) : 0;
    
    // Format spent, purchases value & outstanding values using CurrencyService
    const rawSpent = (sum as any).totalSpent || 0.0;
    const rawPurchasesVal = (sum as any).totalPurchasesValue || 0.0;
    const rawOutstanding = (sum as any).totalOutstanding || 0.0;
    
    const spentConverted = this.currencyService.convert(rawSpent);
    const purchasesConverted = this.currencyService.convert(rawPurchasesVal);
    const outstandingConverted = this.currencyService.convert(rawOutstanding);
    const symbol = this.currencyService.currentConfig().symbol.trim();
    
    const formatCurrency = (val: number) => {
      return val >= 1_000_000
        ? `${symbol}${(val / 1_000_000).toFixed(2)}M`
        : `${symbol}${(val / 1_000).toFixed(1)}K`;
    };

    // Admin / Manager Complete Company Summary Cards
    return [
      {
        label: 'Total Assets',
        value: total.toLocaleString(),
        icon: 'devices',
        iconColor: 'text-[#091426]',
        meta: modelsCount > 0 ? `${modelsCount} models • ${scrapped} scrapped` : `${scrapped} scrapped`,
        metaIcon: 'info',
        metaIconColor: 'text-on-surface-variant',
        route: '/assets'
      },
      {
        label: 'Assigned',
        value: assigned.toLocaleString(),
        icon: 'assignment_ind',
        iconColor: 'text-[#091426]',
        meta: activeAssigns > 0 ? `${assignedPct}% of units (${activeAssigns} active)` : `${assignedPct}% of total`,
        metaIcon: 'person',
        metaIconColor: 'text-on-surface-variant',
        route: '/assignments'
      },
      {
        label: 'Available',
        value: available.toLocaleString(),
        icon: 'check_circle',
        iconColor: 'text-[#091426]',
        meta: available > 0 ? `${availablePct}% ready to assign` : '0 available',
        metaIcon: 'check',
        metaIconColor: 'text-on-surface-variant',
        route: '/assets'
      },
      {
        label: 'Maintenance',
        value: maintenanceTickets.toLocaleString(),
        icon: 'build',
        iconColor: 'text-[#091426]',
        meta: maintenance > 0 ? `${maintenance} units in repair` : 'None in repair',
        metaIcon: maintenance > 0 ? 'warning' : 'check',
        metaIconColor: 'text-on-surface-variant',
        route: '/maintenance'
      },
      {
        label: 'Total Spent',
        value: formatCurrency(spentConverted),
        icon: 'shopping_cart',
        iconColor: 'text-[#091426]',
        meta: purchasesConverted > 0 ? `Paid of ${formatCurrency(purchasesConverted)} POs` : 'Acquisition cost',
        metaIcon: 'payments',
        metaIconColor: 'text-on-surface-variant',
        route: '/purchases'
      },
      {
        label: 'Outstanding',
        value: formatCurrency(outstandingConverted),
        icon: 'pending_actions',
        iconColor: 'text-[#091426]',
        meta: 'Pending dues',
        metaIcon: 'schedule',
        metaIconColor: 'text-on-surface-variant',
        route: '/purchases'
      }
    ];
  });

  // ── Donut Segments ────────────────────────────────────────────────────────
  protected readonly donutSegments: Signal<DonutSegment[]> = computed(() => {
    const data = this.summaryData();
    if (!data || !data.statusDistribution) return [];

    return data.statusDistribution.map((item: StatusDistributionItem) => ({
      label: item.label,
      percentage: item.percentage,
      color: item.color,
      hexColor: item.hexColor
    }));
  });

  protected readonly totalAssetsCount: Signal<number> = computed(() => {
    return this.summaryData()?.summary?.totalAssets || 0;
  });

  // ── Value Overview Chart ──────────────────────────────────────────────────
  protected readonly chartSeries: Signal<any[]> = computed(() => {
    const data = this.summaryData();
    if (!data || !data.valueOverview || !data.valueOverview.series) return [];

    // Compute global max across ALL series so both lines share the same Y scale
    const globalMax = data.valueOverview.series.reduce((max: number, s: any) => {
      const seriesMax = s.values && s.values.length ? Math.max(...s.values) : 0;
      return Math.max(max, seriesMax);
    }, 1);

    return data.valueOverview.series.map((s) => ({
      label: s.label,
      values: s.values || [],
      points: this.generateSvgPoints(s.values || [], globalMax),
      strokeColor: s.strokeColor,
      legendColor: s.legendColor,
      dashed: s.label.includes('Current')
    }));
  });

  protected readonly chartXLabels: Signal<string[]> = computed(() => {
    return this.summaryData()?.valueOverview?.xLabels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  });

  protected readonly chartYLabels: Signal<string[]> = computed(() => {
    const data = this.summaryData();
    const symbol = this.currencyService.currentConfig().symbol.trim();
    if (!data || !data.valueOverview || !data.valueOverview.series) return [`${symbol}100K`, `${symbol}75K`, `${symbol}50K`, `${symbol}25K`, `${symbol}0`];

    let maxVal = 0;
    data.valueOverview.series.forEach((s: any) => {
      if (s.values && s.values.length) {
        const sMax = Math.max(...s.values);
        if (sMax > maxVal) maxVal = sMax;
      }
    });

    if (maxVal === 0) maxVal = 1000;
    const convertedMax = this.currencyService.convert(maxVal);

    // Round up to a "nice" number so Y-axis steps are perfectly even
    const magnitude = Math.pow(10, Math.floor(Math.log10(convertedMax || 1)));
    const fraction = convertedMax / magnitude;
    const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
    const niceMax = niceFraction * magnitude;

    const steps = 4;
    const labels: string[] = [];
    for (let i = steps; i >= 0; i--) {
      const val = (niceMax * i) / steps;
      if (val >= 1_000_000) {
        labels.push(`${symbol}${(val / 1_000_000).toFixed(1)}M`);
      } else if (val >= 10_000) {
        labels.push(`${symbol}${(val / 1_000).toFixed(0)}K`);
      } else if (val >= 1_000) {
        labels.push(`${symbol}${(val / 1_000).toFixed(1)}K`);
      } else {
        labels.push(`${symbol}${Math.round(val)}`);
      }
    }
    return labels;
  });

  // ── Tickets & Activity ───────────────────────────────────────────────────
  protected readonly tickets: Signal<MaintenanceTicket[]> = computed(() => {
    if (this.isTechnician()) {
      const reqs = this.maintenanceService.requests();
      return reqs.map((r) => ({
        id: r.requestId || r.id,
        rawId: r.id,
        assetIcon: r.assetIcon || 'build',
        assetName: r.assetName || 'Asset',
        serialNumber: r.serialNumber || 'N/A',
        problem: r.componentOrIssueType || r.issueDescription || 'Repair',
        technician: r.requestedByName || 'Assigned Tech',
        priority: r.priority || 'MEDIUM',
        status: r.status as TicketStatus,
        date: r.createdAt ? r.createdAt.split('T')[0] : 'N/A'
      }));
    }

    return this.summaryData()?.recentMaintenanceTickets || [];
  });

  protected readonly activityItems: Signal<ActivityItem[]> = computed(() => {
    if (this.isTechnician()) {
      const reqs = this.maintenanceService.requests();
      const activities: ActivityItem[] = [];

      reqs.forEach((r) => {
        if (r.timeline && r.timeline.length > 0) {
          r.timeline.forEach((t) => {
            activities.push({
              dotColor: r.priority === 'CRITICAL' ? 'bg-error' : 'bg-primary',
              description: `${r.requestId}: ${t.label}`,
              time: t.timestamp ? new Date(t.timestamp).toLocaleDateString() : 'Recent'
            });
          });
        } else {
          activities.push({
            dotColor: 'bg-primary',
            description: `${r.requestId}: Maintenance ticket created for ${r.assetName}`,
            time: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recent'
          });
        }
      });

      return activities.slice(0, 10);
    }

    return this.summaryData()?.recentActivity || [];
  });

  protected readonly maintenanceColumns: TableColumn[] = [
    { key: 'id', label: 'Ticket ID' },
    { key: 'asset', label: 'Asset' },
    { key: 'problem', label: 'Problem' },
    { key: 'technician', label: 'Technician' },
    { key: 'status', label: 'Status' },
    { key: 'date', label: 'Date' }
  ];

  protected readonly techMaintenanceColumns: TableColumn[] = [
    { key: 'id', label: 'Ticket ID' },
    { key: 'asset', label: 'Asset Name' },
    { key: 'serialNumber', label: 'Serial Number' },
    { key: 'problem', label: 'Issue / Problem' },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' },
    { key: 'date', label: 'Created Date' }
  ];

  protected readonly reportDate: string = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  // ── Navigation & Actions ─────────────────────────────────────────────────
  protected onNewAsset(): void {
    this.router.navigate(['/assets/create']);
  }

  protected onViewAllMaintenance(): void {
    this.router.navigate(['/maintenance']);
  }

  protected onExportReport(): void {
    window.print();
  }

  private generateSvgPoints(values: number[], globalMax?: number): string {
    if (!values || values.length === 0) return '0,50';
    const maxVal = globalMax ?? Math.max(...values, 1);
    const range = maxVal || 1;

    const stepX = 100 / (values.length - 1 || 1);
    return values.map((val, idx) => {
      const x = Math.round(idx * stepX);
      const y = Math.round(85 - (val / range) * 70);
      return `${x},${y}`;
    }).join(' ');
  }
}