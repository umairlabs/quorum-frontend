import {
  Component,
  computed,
  inject,
  OnInit,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { MaintenancePriority, CreateMaintenanceRequest } from '../../../core/interfaces/maintenance.interface';
import { MaintenanceService } from '../services/maintenance.service';
import { AssetService } from '../../assets/services/asset.service';
import { Asset, AssetUnit } from '../../../core/interfaces/asset.interface';
import { ToastService } from '../../../core/services/toast.service';
import { NotificationService } from '../../notifications/services/notification.service';

import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { FormSectionComponent } from '../../../core/components/form-section/form-section.component';

import { AuthApisService } from '../../../core/services/api/auth-apis.service';
import { AssetApisService } from '../../assets/services/asset-apis.service';
import { UserService } from '../../users/services/user.service';
import { User } from '../../../core/interfaces/user.interface';

interface PriorityOption {
  value: MaintenancePriority;
  label: string;
  hint: string;
  icon: string;
}

@Component({
  selector: 'app-maintenance-create',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, FormSectionComponent],
  templateUrl: './maintenance-create.component.html',
})
export class MaintenanceCreateComponent implements OnInit {
  private readonly router:             Router             = inject(Router);
  private readonly route:              ActivatedRoute     = inject(ActivatedRoute);
  private readonly maintenanceService: MaintenanceService = inject(MaintenanceService);
  private readonly assetService:       AssetService       = inject(AssetService);
  private readonly assetApis:          AssetApisService   = inject(AssetApisService);
  private readonly authService:        AuthApisService    = inject(AuthApisService);
  private readonly toastService:       ToastService       = inject(ToastService);
  private readonly notificationService:NotificationService= inject(NotificationService);
  protected readonly userService:      UserService        = inject(UserService);
  private readonly http:               HttpClient         = inject(HttpClient);

  // Asset & Unit Search State
  protected readonly showAssetDropdown: WritableSignal<boolean>      = signal(false);
  protected readonly assetSearchQuery:  WritableSignal<string>       = signal('');
  protected readonly selectedAsset:     WritableSignal<Asset | null> = signal(null);
  protected readonly availableUnits:    WritableSignal<AssetUnit[]>  = signal([]);
  protected readonly unitsLoading:      WritableSignal<boolean>      = signal(false);

  // Unit Search State
  protected readonly showUnitDropdown:  WritableSignal<boolean>          = signal(false);
  protected readonly unitSearchQuery:   WritableSignal<string>           = signal('');
  protected readonly selectedUnit:      WritableSignal<AssetUnit | null> = signal(null);

  protected readonly filteredAvailableUnits: Signal<AssetUnit[]> = computed(() => {
    const q = this.unitSearchQuery().toLowerCase().trim();
    const units = this.availableUnits();
    if (!q) return units;
    return units.filter(u =>
      (u.serialNumber || '').toLowerCase().includes(q) ||
      (u.id || '').toLowerCase().includes(q)
    );
  });

  // Employee-specific: assigned assets
  private readonly myAssignedRaw: WritableSignal<any[]> = signal([]);

  // Assignee state (Technicians only)
  protected readonly showAssigneeDropdown: WritableSignal<boolean>     = signal(false);
  protected readonly assigneeSearchQuery:  WritableSignal<string>      = signal('');
  protected readonly selectedAssignee:     WritableSignal<User | null> = signal(null);

  protected readonly filteredAssignees: Signal<User[]> = computed(() => {
    const all = this.userService.users();
    const query = this.assigneeSearchQuery().toLowerCase().trim();

    const roleFiltered = all.filter(u => {
      const r = (u.role || '').toUpperCase().replace(/\s+/g, '_');
      return r === 'TECHNICIAN' || r === 'EXTERNAL_TECHNICIAN' || r === 'TECH';
    });

    if (!query) return roleFiltered;

    return roleFiltered.filter(u => {
      const name = (u.fullName || `${u.firstName} ${u.lastName}`).toLowerCase();
      const email = (u.email || '').toLowerCase();
      const dept = (u.department || '').toLowerCase();
      return name.includes(query) || email.includes(query) || dept.includes(query);
    });
  });

  // AI State
  protected readonly aiPrompt:     WritableSignal<string>  = signal('');
  protected readonly aiGenerating: WritableSignal<boolean> = signal(false);

  // Form State
  protected readonly saving:          WritableSignal<boolean> = signal(false);
  protected readonly submitAttempted: WritableSignal<boolean> = signal(false);

  protected formData = {
    unitId:           '',
    issueTitle:       '',
    issueDescription: '',
    priority:         '' as MaintenancePriority | '',
  };

  protected readonly priorityOptions: PriorityOption[] = [
    { value: 'LOW',      label: 'Low',      hint: 'Minor, no urgency',       icon: 'arrow_downward' },
    { value: 'MEDIUM',   label: 'Medium',   hint: 'Affects workflow',        icon: 'remove'         },
    { value: 'HIGH',     label: 'High',     hint: 'Significant impact',      icon: 'arrow_upward'   },
    { value: 'CRITICAL', label: 'Critical', hint: 'Immediate action needed', icon: 'priority_high'  },
  ];

  protected readonly isEmployee: Signal<boolean> = computed(() => {
    const user = this.authService.currentUser();
    const role = (user?.role || localStorage.getItem('role') || '').toUpperCase().replace(/\s+/g, '_');
    return role === 'EMPLOYEE' || role === 'EMPLOYEE_USER';
  });

  protected readonly totalAvailableUnitsCount: Signal<number> = computed(() => {
    return this.allPurchasedAssets().reduce((acc, a) => acc + (a.availableQuantity || 1), 0);
  });

  // All purchased, available assets for maintenance selection:
  // - Employee: ONLY their own active assigned assets (excluding those in maintenance)
  // - Admin/Manager: ONLY assets with truly AVAILABLE units (excluding those in maintenance)
  protected readonly allPurchasedAssets: Signal<Asset[]> = computed(() => {
    // Active maintenance tickets to exclude
    const activeRequests = this.maintenanceService.requests().filter(r => {
      const s = (r.status || '').toUpperCase();
      return !['RESOLVED', 'COMPLETED', 'VERIFIED', 'CANCELLED', 'UNREPAIRABLE', 'NOT_REPAIRABLE'].includes(s);
    });
    const activeSerials = new Set(activeRequests.map(r => (r.serialNumber || '').toLowerCase().trim()).filter(Boolean));
    const activeUnitIds = new Set(activeRequests.map(r => (r as any).assetUnitId || (r as any).asset_unit || (r as any).unitId).filter(Boolean));

    if (this.isEmployee()) {
      // AssignmentListSerializer returns flat fields: assetName, unitId, serialNumber, brand, model, status ('Assigned'/'Returned')
      const activeItems = this.myAssignedRaw().filter((item: any) => {
        const itemStatus = (item.status || '').toLowerCase();
        const unitStatus = (item.unitStatus || item.unit_status || '').toUpperCase();
        const serial = (item.serialNumber || item.unit_serial_snapshot || '').toLowerCase().trim();
        const unitId = item.unitId || item.id;

        const isMaint = item.hasActiveMaintenance === true ||
                        unitStatus === 'MAINTENANCE' ||
                        (serial && activeSerials.has(serial)) ||
                        (unitId && activeUnitIds.has(unitId));

        return itemStatus !== 'returned' && itemStatus !== 'scrapped' && !isMaint;
      });

      return activeItems.map((item: any, index: number) => {
        const parentId = item.parentAssetId || item.assetId || item.unitId || item.id;
        const unitId   = item.unitId || item.id;
        const serial   = item.serialNumber || item.unit_serial_snapshot || '';
        const name     = item.assetName || item.asset_name_snapshot || 'Asset';

        return {
          id:           parentId,
          name:         name,
          serialNumber: serial,
          category:     item.assetIcon || 'Equipment',
          brand:        item.brand  || '',
          model:        item.model  || '',
          status:       'ASSIGNED' as any,
          availableQuantity: 1,
          purchaseCost: 0,
          createdAt:    item.assignedDate || '',
          updatedAt:    item.assignedDate || '',
          _unitId:      unitId,
          _uniqueKey:   `${parentId}-${unitId}-${index}`,
        } as any;
      });
    }

    // Admin / Manager / Operations Manager flow:
    // Only show assets that have physically AVAILABLE units ready for maintenance
    const all = this.assetService.assets();
    const map = new Map<string, Asset>();

    all.forEach(a => {
      if (a.id.includes('-unit-')) return;
      if ((a.status as string) === 'SCRAPPED') return;

      const key = (a.name || '').toLowerCase().trim();

      // Count truly available units (excluding units currently in maintenance)
      let availCount = 0;
      if (Array.isArray(a.units) && a.units.length > 0) {
        availCount = a.units.filter(u => {
          const s = ((u.status as string) || '').toUpperCase();
          const serial = (u.serialNumber || '').toLowerCase().trim();
          const uid = u.id;
          const isUnderMaint = s === 'MAINTENANCE' ||
                              (serial && activeSerials.has(serial)) ||
                              (uid && activeUnitIds.has(uid));
          return s === 'AVAILABLE' && !isUnderMaint;
        }).length;
      } else if (a.availableQuantity !== undefined) {
        availCount = a.availableQuantity;
      } else {
        availCount = (a.status as string) === 'AVAILABLE' ? 1 : 0;
      }

      if (!map.has(key)) {
        map.set(key, { ...a, availableQuantity: availCount });
      } else {
        const existing = map.get(key)!;
        const totalAvail = (existing.availableQuantity ?? 0) + availCount;
        map.set(key, { ...existing, availableQuantity: totalAvail });
      }
    });

    return Array.from(map.values()).filter(a => (a.availableQuantity ?? 0) > 0);
  });

  // Filtered for autocomplete
  protected readonly filteredAssets: Signal<Asset[]> = computed(() => {
    const query  = this.assetSearchQuery().toLowerCase().trim();
    const assets = this.allPurchasedAssets();
    if (!query) return assets;
    return assets.filter(a => {
      const name  = (a.name  || '').toLowerCase();
      const brand = (a.brand || '').toLowerCase();
      const model = (a.model || '').toLowerCase();
      const cat   = typeof a.category === 'string'
        ? a.category.toLowerCase()
        : ((a.category as any)?.name || '').toLowerCase();
      const serial = (a.serialNumber || '').toLowerCase();
      return name.includes(query) || brand.includes(query) || model.includes(query) || cat.includes(query) || serial.includes(query);
    });
  });

  public ngOnInit(): void {
    this.maintenanceService.loadRequestsFromApi();
    this.userService.loadUsersFromApi({ scope: 'all' });
    this.assetService.loadAssetsFromApi();
    this.assetApis.getMyAssignedAssets().subscribe({
      next: (res: any) => {
        const items: any[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.myAssignedRaw.set(items);
      },
      error: () => this.myAssignedRaw.set([])
    });
    this.route.queryParams.subscribe(params => {
      if (params['assetId']) {
        const asset = this.allPurchasedAssets().find((a: any) =>
          a.id === params['assetId'] || a._unitId === params['assetId']
        );
        if (asset) this.selectAsset(asset);
      }
    });
  }

  // ─── Assignee selection handlers ─────────────────────────────────────────
  protected onFocusAssigneeSearch(): void {
    this.showAssigneeDropdown.set(true);
  }

  protected onBlurAssigneeSearch(): void {
    setTimeout(() => this.showAssigneeDropdown.set(false), 200);
  }

  protected onAssigneeInputChange(value: string): void {
    this.assigneeSearchQuery.set(value);
    this.showAssigneeDropdown.set(true);

    const match = this.filteredAssignees().find(u =>
      (u.fullName || `${u.firstName} ${u.lastName}`).toLowerCase() === value.trim().toLowerCase()
    );
    if (match) {
      this.selectAssignee(match);
    } else {
      this.selectedAssignee.set(null);
    }
  }

  protected selectAssignee(user: User): void {
    this.selectedAssignee.set(user);
    const name = user.fullName || `${user.firstName} ${user.lastName}`.trim();
    this.assigneeSearchQuery.set(name);
    this.showAssigneeDropdown.set(false);
  }

  protected clearSelectedAssignee(event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.selectedAssignee.set(null);
    this.assigneeSearchQuery.set('');
    this.showAssigneeDropdown.set(true);
  }

  protected onFocusAssetSearch(): void { this.showAssetDropdown.set(true); }
  protected onBlurAssetSearch():  void { setTimeout(() => this.showAssetDropdown.set(false), 200); }

  protected onAssetInputChange(value: string): void {
    this.assetSearchQuery.set(value);
    this.showAssetDropdown.set(true);
    if (!value.trim()) this.clearSelectedAsset();
  }

  protected selectAsset(asset: Asset): void {
    this.selectedAsset.set(asset);
    this.assetSearchQuery.set(asset.name);
    this.showAssetDropdown.set(false);
    this.formData.unitId = '';
    this.availableUnits.set([]);
    this.selectedUnit.set(null);
    this.unitSearchQuery.set('');

    // For employee flow, _unitId is directly attached to the assigned unit option
    const unitId = (asset as any)._unitId;
    if (unitId) {
      this.formData.unitId = unitId;
      return;
    }

    this.unitsLoading.set(true);

    // Find all parent asset IDs matching this asset name to gather all physical units across POs
    const matchingParentIds = this.assetService.assets()
      .filter(a => !a.id.includes('-unit-') && (a.name || '').toLowerCase().trim() === (asset.name || '').toLowerCase().trim())
      .map(a => a.id);

    const targetIds = matchingParentIds.length > 0 ? matchingParentIds : [asset.id];
    let completed = 0;
    const allEligibleUnits: AssetUnit[] = [];

    targetIds.forEach(id => {
      this.assetService.getAvailableUnits(id).subscribe({
        next: (units) => {
          const activeReqs = this.maintenanceService.requests().filter(r => {
            const s = (r.status || '').toUpperCase();
            return !['RESOLVED', 'COMPLETED', 'VERIFIED', 'CANCELLED', 'UNREPAIRABLE', 'NOT_REPAIRABLE'].includes(s);
          });
          const actSerials = new Set(activeReqs.map(r => (r.serialNumber || '').toLowerCase().trim()).filter(Boolean));
          const actUnitIds = new Set(activeReqs.map(r => (r as any).assetUnitId || (r as any).asset_unit || (r as any).unitId).filter(Boolean));

          const eligible = units.filter(u => {
            const s = ((u.status as string) || '').toUpperCase();
            const serial = (u.serialNumber || '').toLowerCase().trim();
            const uid = u.id;
            const isMaint = s === 'MAINTENANCE' || (serial && actSerials.has(serial)) || (uid && actUnitIds.has(uid));
            return s === 'AVAILABLE' && !isMaint;
          });
          // Normalize status to uppercase and cast to AssetStatus for type safety
          const normalized = eligible.map(u => ({
            ...u,
            status: 'AVAILABLE' as any
          }));
          allEligibleUnits.push(...normalized);
          completed++;
          if (completed === targetIds.length) {
            this.availableUnits.set(allEligibleUnits);
            if (allEligibleUnits.length === 1) this.formData.unitId = allEligibleUnits[0].id;
            this.unitsLoading.set(false);
          }
        },
        error: () => {
          completed++;
          if (completed === targetIds.length) {
            this.availableUnits.set(allEligibleUnits);
            this.unitsLoading.set(false);
          }
        }
      });
    });
  }

  protected clearSelectedAsset(): void {
    this.selectedAsset.set(null);
    this.assetSearchQuery.set('');
    this.availableUnits.set([]);
    this.formData.unitId = '';
    this.selectedUnit.set(null);
    this.unitSearchQuery.set('');
  }

  // ─── Unit search handlers ───────────────────────────────────────────────
  protected onFocusUnitSearch(): void { this.showUnitDropdown.set(true); }
  protected onBlurUnitSearch():  void { setTimeout(() => this.showUnitDropdown.set(false), 200); }

  protected onUnitInputChange(value: string): void {
    this.unitSearchQuery.set(value);
    this.showUnitDropdown.set(true);
    const val = value.trim().toLowerCase();
    const match = this.availableUnits().find(u =>
      (u.displayId || '').toLowerCase() === val ||
      (u.serialNumber || '').toLowerCase() === val ||
      (u.id || '') === value.trim()
    );
    if (match) {
      this.selectedUnit.set(match);
      this.formData.unitId = match.id;
    } else {
      this.selectedUnit.set(null);
      this.formData.unitId = '';
    }
  }

  protected selectUnit(unit: AssetUnit): void {
    this.selectedUnit.set(unit);
    this.formData.unitId = unit.id;
    this.unitSearchQuery.set(unit.displayId || unit.serialNumber || unit.id);
    this.showUnitDropdown.set(false);
  }

  protected clearSelectedUnit(event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.selectedUnit.set(null);
    this.unitSearchQuery.set('');
    this.formData.unitId = '';
    this.showUnitDropdown.set(true);
  }

  protected generateWithAI(): void {
    const prompt = this.aiPrompt().trim();
    if (!prompt) {
      this.toastService.presentToast('Please describe the issue first.', 2000, 'error');
      return;
    }
    this.aiGenerating.set(true);
    this.http.post<{ title: string; description: string; priority: string }>(
      '/api/ai/generate-maintenance-issue/',
      { prompt }
    ).subscribe({
      next: (res) => {
        this.formData.issueTitle       = res.title;
        this.formData.issueDescription = res.description;
        if (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(res.priority)) {
          this.formData.priority = res.priority as MaintenancePriority;
        }
        this.aiGenerating.set(false);
        this.toastService.presentToast('Issue details generated!', 2000, 'success');
      },
      error: () => {
        this.aiGenerating.set(false);
        this.toastService.presentToast('AI generation failed. Please fill in the form manually.', 3000, 'error');
      }
    });
  }

  protected onSubmit(): void {
    this.submitAttempted.set(true);
    if (!this.isFormValid()) return;

    const assignee = this.selectedAssignee();
    const assigneeName = assignee ? (assignee.fullName || `${assignee.firstName} ${assignee.lastName}`.trim()) : undefined;

    const payload: CreateMaintenanceRequest = {
      assetId:              this.selectedAsset()!.id,
      unitId:               this.formData.unitId || undefined,
      componentOrIssueType: this.formData.issueTitle.trim(),
      issueDescription:     this.formData.issueDescription.trim(),
      maintenanceType:      'CORRECTIVE',
      priority:             this.formData.priority as MaintenancePriority,
      assignedTechnician:   assigneeName,
      assignedTechnicianId: assignee?.id,
      technicianId:         assignee?.id,
      technicianName:       assigneeName,
      assignedTo:           assigneeName,
      assigneeType:         'TECHNICIAN',
    };

    this.saving.set(true);
    this.maintenanceService.createRequest(payload).subscribe({
      next: () => {
        this.toastService.presentToast('Maintenance request created successfully.', 2500, 'success');
        this.notificationService.triggerImmediateNotification(true);
        this.saving.set(false);
        this.router.navigate(['/maintenance']);
      },
      error: (err: any) => {
        const errorMsg = err?.error?.detail || (err?.error?.assetId ? err.error.assetId[0] : null) || 'Failed to create request. Please try again.';
        this.toastService.presentToast(errorMsg, 3500, 'error');
        this.saving.set(false);
      },
    });
  }

  protected onCancel(): void { this.router.navigate(['/maintenance']); }

  protected get showPriorityError(): boolean {
    return this.submitAttempted() && !this.formData.priority;
  }

  protected getCategoryName(asset: Asset): string {
    return typeof asset.category === 'string'
      ? asset.category
      : (asset.category as any)?.name ?? '';
  }

  protected isFormValid(): boolean {
    return !!(
      this.selectedAsset() &&
      this.formData.issueTitle.trim().length >= 5 &&
      this.formData.issueDescription.trim().length >= 10 &&
      this.formData.priority &&
      this.selectedAssignee()
    );
  }
}
