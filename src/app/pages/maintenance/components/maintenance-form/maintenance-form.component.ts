import {
  Component, computed, inject, input, InputSignal, OnChanges, OnDestroy,
  output, OutputEmitterRef, signal, Signal, SimpleChanges, ViewChild, WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  MaintenanceRequest, MaintenancePriority, CreateMaintenanceRequest,
} from '../../../../core/interfaces/maintenance.interface';
import { MaintenanceService } from '../../services/maintenance.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FormSectionComponent } from '../../../../core/components/form-section/form-section.component';
import { BreadcrumbService } from '../../../../core/services/breadcrumb.service';
import { AssetService } from '../../../assets/services/asset.service';
import { AssetApisService } from '../../../assets/services/asset-apis.service';
import { Asset, AssetUnit } from '../../../../core/interfaces/asset.interface';
import { AuthApisService } from '../../../../core/services/api/auth-apis.service';
import { UserService } from '../../../users/services/user.service';
import { User } from '../../../../core/interfaces/user.interface';

interface MaintenanceFormData {
  issueTitle:       string;
  issueDescription: string;
  priority:         MaintenancePriority | '';
  unitId:           string;
}

interface PriorityOption {
  value: MaintenancePriority;
  label: string;
  hint:  string;
  icon:  string;
}

@Component({
  selector: 'app-maintenance-form',
  standalone: true,
  imports: [CommonModule, FormsModule, FormSectionComponent],
  templateUrl: './maintenance-form.component.html',
})
export class MaintenanceFormComponent implements OnChanges, OnDestroy {
  private readonly maintenanceService: MaintenanceService = inject(MaintenanceService);
  private readonly toastService:       ToastService       = inject(ToastService);
  private readonly breadcrumbService:  BreadcrumbService  = inject(BreadcrumbService);
  private readonly assetService:       AssetService       = inject(AssetService);
  private readonly assetApis:          AssetApisService   = inject(AssetApisService);
  protected readonly userService:      UserService        = inject(UserService);
  private readonly http:               HttpClient         = inject(HttpClient);

  public readonly isOpen:              InputSignal<boolean>                  = input<boolean>(false);
  public readonly editRequest:         InputSignal<MaintenanceRequest | null> = input<MaintenanceRequest | null>(null);
  public readonly preselectedAssetId:  InputSignal<string | null>            = input<string | null>(null);
  public readonly close:               OutputEmitterRef<void>                = output<void>();
  public readonly saved:               OutputEmitterRef<void>                = output<void>();

  // ─── Asset & Unit search state ──────────────────────────────────────────
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

  // ─── Assignee state (Technicians only) ──────────────────────────────
  protected readonly showAssigneeDropdown:  WritableSignal<boolean>                  = signal(false);
  protected readonly assigneeSearchQuery:   WritableSignal<string>                   = signal('');
  protected readonly selectedAssignee:      WritableSignal<User | null>              = signal(null);

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

  // Employee-specific: only their own assigned assets (from my-assigned API)
  private readonly myAssignedRaw: WritableSignal<any[]> = signal([]);

  // ─── AI state ────────────────────────────────────────────────────────────
  protected readonly aiPrompt:     WritableSignal<string>  = signal('');
  protected readonly aiGenerating: WritableSignal<boolean> = signal(false);

  // ─── Form state ──────────────────────────────────────────────────────────
  protected readonly saving:          WritableSignal<boolean> = signal(false);
  protected readonly submitAttempted: WritableSignal<boolean> = signal(false);
  protected formData: MaintenanceFormData = this.emptyForm();

  protected readonly priorityOptions: PriorityOption[] = [
    { value: 'LOW',      label: 'Low',      hint: 'Minor, no urgency',       icon: 'arrow_downward' },
    { value: 'MEDIUM',   label: 'Medium',   hint: 'Affects workflow',        icon: 'remove'         },
    { value: 'HIGH',     label: 'High',     hint: 'Significant impact',      icon: 'arrow_upward'   },
    { value: 'CRITICAL', label: 'Critical', hint: 'Immediate action needed', icon: 'priority_high'  },
  ];

  private readonly authService: AuthApisService = inject(AuthApisService);

  // All assets available for maintenance selection
  // - Employee: ONLY their own assigned assets (from my-assigned API)
  // - Manager/Admin: all purchased non-scrapped assets
  protected readonly allPurchasedAssets: Signal<Asset[]> = computed(() => {
    const user = this.authService.currentUser();
    const role = (user?.role || localStorage.getItem('role') || '').toUpperCase();
    const isEmp = role === 'EMPLOYEE';

    // Active maintenance tickets to exclude for all roles
    const activeRequests = this.maintenanceService.requests().filter(r => {
      const s = (r.status || '').toUpperCase();
      return !['RESOLVED', 'COMPLETED', 'VERIFIED', 'CANCELLED', 'UNREPAIRABLE', 'NOT_REPAIRABLE'].includes(s);
    });
    const activeSerials = new Set(activeRequests.map(r => (r.serialNumber || '').toLowerCase().trim()).filter(Boolean));
    const activeUnitIds = new Set(activeRequests.map(r => (r as any).assetUnitId || (r as any).asset_unit || (r as any).unitId).filter(Boolean));

    if (isEmp) {

      // Convert my-assigned records to Asset-like objects for the dropdown
      const activeItems = this.myAssignedRaw().filter((item: any) => {
        const itemStatus = (item.status || item.unit?.status || '').toUpperCase();
        const unitStatus = (item.unitStatus || item.unit_status || '').toUpperCase();
        const serial = (item.serialNumber || item.unit_serial_snapshot || item.unit?.serial_number || '').toLowerCase().trim();
        const unitId = item.unitId || item.unit?.id || item.id;

        const isMaint = item.hasActiveMaintenance === true ||
                        unitStatus === 'MAINTENANCE' ||
                        itemStatus === 'MAINTENANCE' ||
                        (serial && activeSerials.has(serial)) ||
                        (unitId && activeUnitIds.has(unitId));

        return !isMaint && itemStatus !== 'SCRAPPED' && itemStatus !== 'RETURNED';
      });
      return activeItems.map((item: any, index: number) => {
        const parentId = item.parentAssetId || item.unit?.asset?.id || item.assetId || item.unitId || item.id;
        const unitId   = item.unitId || item.unit?.id || item.id;
        return {
          id:           parentId,
          name:         item.assetName || item.asset_name_snapshot || item.unit?.asset?.name || 'Asset',
          serialNumber: item.serialNumber || item.unit_serial_snapshot || item.unit?.serial_number || '',
          category:     item.unit?.asset?.category?.name || 'Equipment',
          brand:        item.brand  || item.unit?.asset?.brand  || '',
          model:        item.model  || item.unit?.asset?.model  || '',
          status:       'ASSIGNED' as any,
          purchaseCost: 0,
          createdAt:    item.assignedDate || '',
          updatedAt:    item.assignedDate || '',
          // Keep unit id so selectAsset can set unitId
          _unitId:      unitId,
          _uniqueKey:   `${parentId}-${unitId}-${index}`,
        } as any;
      });
    }

    const all = this.assetService.assets();
    const map = new Map<string, Asset>();

    all.forEach(a => {
      if (a.id.includes('-unit-')) return;
      if ((a.status as string) === 'SCRAPPED') return;

      const key = (a.name || '').toLowerCase().trim();

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
      const name   = (a.name  || '').toLowerCase();
      const brand  = (a.brand || '').toLowerCase();
      const model  = (a.model || '').toLowerCase();
      const serial = (a.serialNumber || (a as any).serial_number || '').toLowerCase();
      const cat    = typeof a.category === 'string'
        ? a.category.toLowerCase()
        : ((a.category as any)?.name || '').toLowerCase();
      return name.includes(query) || brand.includes(query) || model.includes(query) || cat.includes(query) || serial.includes(query);
    });
  });

  protected get showPriorityError(): boolean {
    return this.submitAttempted() && !this.formData.priority;
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.submitAttempted.set(false);
      this.aiPrompt.set('');
      this.assetSearchQuery.set('');
      this.selectedAsset.set(null);
      this.availableUnits.set([]);

      const user = this.authService.currentUser();
      const role = (user?.role || localStorage.getItem('role') || '').toUpperCase();
      const isEmp = role === 'EMPLOYEE';

      if (isEmp) {
        // Load only the employee's own assigned assets
        this.assetApis.getMyAssignedAssets().subscribe({
          next: (res: any) => {
            const items: any[] = Array.isArray(res) ? res : (res?.results ?? []);
            this.myAssignedRaw.set(items);
          },
          error: () => this.myAssignedRaw.set([])
        });
      } else {
        this.assetService.loadAssetsFromApi();
      }
      this.userService.loadUsersFromApi({ scope: 'all' });

      const edit = this.editRequest();

      this.breadcrumbService.setOverride({
        showBackArrow: false,
        items: [
          { label: 'AssetFlow' },
          { label: 'Maintenance', action: () => this.onClose() },
          { label: edit ? 'Edit Request' : 'New Maintenance Request', isLast: true },
        ],
      });

      if (edit) {
        this.formData = {
          issueTitle:       edit.componentOrIssueType,
          issueDescription: edit.issueDescription,
          priority:         edit.priority,
          unitId:           '',
        };
        // Pre-select the asset in the search box
        const asset = this.assetService.assets().find(a => a.id === edit.assetId);
        if (asset) {
          this.selectedAsset.set(asset);
          this.assetSearchQuery.set(asset.name);
        } else {
          this.assetSearchQuery.set(edit.assetName || '');
        }
      } else {
        this.formData = this.emptyForm();
        // Pre-select if coming from Assets page
        const preId = this.preselectedAssetId();
        if (preId) {
          const asset = this.assetService.assets().find(a => a.id === preId);
          if (asset) this.selectAsset(asset);
        }
      }
    }
  }

  public ngOnDestroy(): void {
    if (this.isOpen()) this.breadcrumbService.clearOverride();
  }

  // ─── Asset search ────────────────────────────────────────────────────────
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

    // For employee flow, _unitId is already the direct unit id
    const unitId = (asset as any)._unitId;
    if (unitId) {
      this.formData.unitId = unitId;
      this.availableUnits.set([{
        id: unitId,
        assetId: asset.id,
        unitNumber: 1,
        serialNumber: asset.serialNumber || '',
        status: 'ASSIGNED',
        createdAt: '',
        updatedAt: '',
      }]);
      return;
    }

    // Manager/Admin flow — load available units from API
    this.unitsLoading.set(true);
    this.assetService.getAvailableUnits(asset.id).subscribe({
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
        this.availableUnits.set(eligible);
        if (eligible.length === 1) this.formData.unitId = eligible[0].id;
        this.unitsLoading.set(false);
      },
      error: () => { this.availableUnits.set([]); this.unitsLoading.set(false); }
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

  // ─── AI generation ───────────────────────────────────────────────────────
  protected generateWithAI(): void {
    const prompt = this.aiPrompt().trim();
    if (!prompt) {
      this.toastService.presentToast('Please describe the issue first.', 2000, 'error');
      return;
    }
    this.aiGenerating.set(true);
    this.maintenanceService.generateIssueWithAI(prompt).subscribe({
      next: (res) => {
        console.log('AI generation response:', res);
        this.formData.issueTitle       = res.title;
        this.formData.issueDescription = res.description;
        if (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(res.priority)) {
          this.formData.priority = res.priority as MaintenancePriority;
        }
        this.aiGenerating.set(false);
        this.toastService.presentToast('Issue details generated!', 2000, 'success');
      },
      error: (err) => {
        console.error('AI generation error:', err);
        this.aiGenerating.set(false);
        this.toastService.presentToast('AI generation failed. Please fill in the form manually.', 3000, 'error');
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

  // ─── Submit ───────────────────────────────────────────────────────────────
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
    const edit    = this.editRequest();
    const action$ = edit
      ? this.maintenanceService.updateRequest(edit.id, payload)
      : this.maintenanceService.createRequest(payload);

    action$.subscribe({
      next: () => {
        this.toastService.presentToast(
          edit ? `Request ${edit.requestId} updated.` : 'Maintenance request created successfully.',
          2500, 'success'
        );
        this.saving.set(false);
        this.resetForm();
        this.breadcrumbService.clearOverride();
        this.saved.emit();
      },
      error: (err: any) => {
        const errorMsg = err?.error?.detail || (err?.error?.assetId ? err.error.assetId[0] : null) || 'Failed to save. Please try again.';
        this.toastService.presentToast(errorMsg, 3500, 'error');
        this.saving.set(false);
      },
    });
  }

  protected onClose(): void {
    this.resetForm();
    this.breadcrumbService.clearOverride();
    this.close.emit();
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

  private resetForm(): void {
    this.formData = this.emptyForm();
    this.submitAttempted.set(false);
    this.aiPrompt.set('');
    this.selectedAsset.set(null);
    this.assetSearchQuery.set('');
    this.availableUnits.set([]);
    this.selectedAssignee.set(null);
    this.assigneeSearchQuery.set('');
    this.showAssigneeDropdown.set(false);
  }

  private emptyForm(): MaintenanceFormData {
    return { issueTitle: '', issueDescription: '', priority: '', unitId: '' };
  }
}
