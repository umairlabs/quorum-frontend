import { Component, computed, DestroyRef, inject, OnInit, OnDestroy, Signal, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AssetService } from '../services/asset.service';
import { AssetApisService } from '../services/asset-apis.service';
import { LayoutService } from '../../../core/services/layout.service';
import { Asset, InventoryGroup, PurchaseGroup } from '../../../core/interfaces/asset.interface';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { SearchInputComponent } from '../../../core/components/search-input/search-input.component';
import { ConfirmDialogComponent } from '../../../core/components/confirm-dialog/confirm-dialog.component';
import { ViewSelectorComponent, ViewOption } from '../../../core/components/view-selector/view-selector.component';
import { InventoryAssetComponent } from '../components/inventory-asset/inventory-asset.component';
import { PurchasedAssetComponent } from '../components/purchased-asset/purchased-asset.component';
import { MyAssignedAssetsComponent } from '../components/my-assigned-assets/my-assigned-assets.component';
import { MyAssetRequestsComponent } from '../components/my-asset-requests/my-asset-requests.component';
import { ManagerAssetRequestsComponent } from '../components/manager-asset-requests/manager-asset-requests.component';
import { ConfirmReceiptModalComponent } from '../components/confirm-receipt-modal/confirm-receipt-modal.component';
import { ToastService } from '../../../core/services/toast.service';
import { CategoryService } from '../../../core/services/category.service';
import { AuthApisService } from '../../../core/services/api/auth-apis.service';
import { SelectComponent } from '../../../core/components/select/select.component';
import { MaintenanceApisService } from '../../maintenance/services/maintenance-apis.service';

@Component({
  selector: 'app-asset-list',
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent,
    SearchInputComponent,
    ConfirmDialogComponent,
    ViewSelectorComponent,
    InventoryAssetComponent,
    PurchasedAssetComponent,
    MyAssignedAssetsComponent,
    MyAssetRequestsComponent,
    ManagerAssetRequestsComponent,
    ConfirmReceiptModalComponent,
    SelectComponent,
  ],
  templateUrl: './asset-list.component.html',
})
export class AssetListComponent implements OnInit, OnDestroy {
  private readonly router        = inject(Router);
  private readonly route         = inject(ActivatedRoute);
  private readonly toastService  = inject(ToastService);
  private readonly layoutService = inject(LayoutService);
  private readonly destroyRef    = inject(DestroyRef);
  private readonly authService   = inject(AuthApisService);
  private readonly assetApisService = inject(AssetApisService);

  protected readonly assetService = inject(AssetService);
  protected readonly categoryService = inject(CategoryService);

  protected readonly pendingDeleteAsset: WritableSignal<Asset | null>          = signal<Asset | null>(null);
  protected readonly pendingDeleteGroup: WritableSignal<InventoryGroup | null> = signal<InventoryGroup | null>(null);
  protected readonly pendingDeletePurchaseGroup: WritableSignal<PurchaseGroup | null> = signal<PurchaseGroup | null>(null);

  protected readonly isEmployee: Signal<boolean> = computed(() => {
    const role = (this.authService.currentUser()?.role || localStorage.getItem('role') || '')
      .toUpperCase().replace(/\s+/g, '_');
    return role === 'EMPLOYEE' || role === 'EMPLOYEE_USER';
  });

  protected readonly canManageAssets: Signal<boolean> = computed(() => {
    const role = (this.authService.currentUser()?.role || localStorage.getItem('role') || '')
      .toUpperCase().replace(/\s+/g, '_');
    return role !== 'EXTERNAL_TECHNICIAN';
  });

  protected readonly canCreatePurchase: Signal<boolean> = computed(() => this.canManageAssets());
  protected readonly canCreateAsset: Signal<boolean> = computed(() => this.canManageAssets());

  protected readonly managerActiveTab: WritableSignal<'inventory' | 'purchased' | 'requests'> = signal<'inventory' | 'purchased' | 'requests'>('purchased');
  protected readonly employeeActiveTab: WritableSignal<'assigned' | 'requests'> = signal<'assigned' | 'requests'>('assigned');

  protected readonly isConfirmReceiptModalOpen: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly selectedReceiptItem: WritableSignal<any | null> = signal<any | null>(null);

  protected readonly myAssignedAssets: WritableSignal<any[]> = signal<any[]>([]);
  protected readonly myAssetRequests: WritableSignal<any[]> = signal<any[]>([]);
  protected readonly managerAssetRequests: WritableSignal<any[]> = signal<any[]>([]);

  protected readonly availableUnitsForAssign: Signal<any[]> = computed(() => {
    return this.assetService.assets().filter(
      a => !!(a.purchaseId || a.purchaseNumber) && a.status === 'AVAILABLE'
    );
  });

  protected readonly viewOptions: ViewOption[] = [
    { key: 'purchased', label: 'Purchased Assets', icon: 'shopping_cart' },
    { key: 'inventory', label: 'Inventory Assets', icon: 'inventory_2' },
    { key: 'requests', label: 'Asset Requests', icon: 'task_alt' },
  ];

  public ngOnInit(): void {
    this.assetService.loadAssetsFromApi();

    const viewParam = this.route.snapshot.queryParams['view'];
    if (viewParam === 'inventory' || viewParam === 'purchased' || viewParam === 'requests') {
      if (viewParam === 'inventory' || viewParam === 'purchased') {
        this.assetService.setViewFilter(viewParam);
      }
      this.managerActiveTab.set(viewParam);
    } else {
      this.assetService.setViewFilter('purchased');
    }

    this.loadEmployeeData();
    this.loadManagerRequests();

    this.layoutService.navItemClicked$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pendingDeleteAsset.set(null);
        this.pendingDeleteGroup.set(null);
        this.pendingDeletePurchaseGroup.set(null);
      });
  }

  public ngOnDestroy(): void {
    // Required by OnDestroy interface
  }

  // â”€â”€â”€ Data Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private readonly maintenanceApis = inject(MaintenanceApisService);

  protected loadEmployeeData(): void {
    forkJoin({
      assigned: this.assetApisService.getMyAssignedAssets(),
      maint: this.maintenanceApis.getMaintenanceRequests({ page_size: 100 })
    }).subscribe({
      next: (res: any) => {
        const assignedItems: any[] = res.assigned || [];
        const maintList: any[] = Array.isArray(res.maint) ? res.maint : (res.maint?.results ?? []);
        
        // Find serial numbers of active maintenance tickets
        const activeMaintSerials = new Set<string>();
        maintList.forEach((m: any) => {
          const status = (m.status || '').toUpperCase();
          if (!['RESOLVED', 'COMPLETED', 'VERIFIED', 'CANCELLED', 'UNREPAIRABLE', 'NOT_REPAIRABLE'].includes(status)) {
            if (m.serialNumber) activeMaintSerials.add(m.serialNumber.toLowerCase().trim());
          }
        });

        // Enrich assigned items with unitStatus if maintenance is ongoing
        const enriched = assignedItems.map((item: any) => {
          const serial = (item.serialNumber || item.unit_serial_snapshot || item.unit?.serial_number || '').toLowerCase().trim();
          if (serial && activeMaintSerials.has(serial)) {
            return { ...item, assetStatus: 'MAINTENANCE', unitStatus: 'MAINTENANCE' };
          }
          return item;
        });

        this.myAssignedAssets.set(enriched);
      },
      error: () => {
        this.assetApisService.getMyAssignedAssets().subscribe({
          next: (data: any[]) => this.myAssignedAssets.set(data || []),
          error: (err) => console.error('Failed to load my assigned assets:', err),
        });
      }
    });

    this.assetApisService.getAssetRequests().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.results ?? []);
        this.myAssetRequests.set(list || []);
      },
      error: (err) => console.error('Failed to load my asset requests:', err),
    });
  }

  protected loadManagerRequests(): void {
    this.assetApisService.getAssetRequests().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.results ?? []);
        this.managerAssetRequests.set(list || []);
      },
      error: (err) => console.error('Failed to load manager asset requests:', err),
    });
  }

  // â”€â”€â”€ View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  protected onViewChanged(view: string): void {
    const validView = view as 'inventory' | 'purchased' | 'requests';
    this.managerActiveTab.set(validView);
    if (validView === 'inventory' || validView === 'purchased') {
      this.assetService.setViewFilter(validView);
    }
  }

  // â”€â”€â”€ Request & Receipt Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  protected openReceiptModal(item: any): void {
    this.selectedReceiptItem.set(item);
    this.isConfirmReceiptModalOpen.set(true);
  }

  protected onConfirmReceiptSubmit(data: { condition: string; notes: string }): void {
    const item = this.selectedReceiptItem();
    if (!item) return;

    const payload: any = {
      condition: data.condition,
      notes: data.notes,
    };
    if (item.requestId || item.requestedAsset) {
      payload.requestId = item.id || item.requestId;
    } else {
      payload.assignmentId = item.id || item.assignmentId;
    }

    this.assetApisService.confirmAssetReceipt(payload).subscribe({
      next: () => {
        this.toastService.presentToast('Receipt confirmed successfully.', 2000, 'success');
        this.isConfirmReceiptModalOpen.set(false);
        this.selectedReceiptItem.set(null);
        this.loadEmployeeData();
        this.loadManagerRequests();
      },
      error: (err) => {
        console.error('Failed to confirm receipt:', err);
        this.toastService.presentToast('Failed to confirm receipt.', 2000, 'error');
      },
    });
  }

  protected onReportProblem(item: any): void {
    const assetId = item?.unit?.asset?.id || item?.assetId || item?.id;
    this.router.navigate(['/maintenance'], {
      queryParams: { assetId, openForm: 'true' },
    });
  }

  protected onRequestNewAsset(): void {
    this.router.navigate(['/assets/request']);
  }

  protected onDeleteAssignment(item: any): void {
    const id = item?.id || item?.assignmentId;
    if (!id) return;
    this.assetApisService.deleteAssignmentRecord(id).subscribe({
      next: () => {
        this.toastService.presentToast('Assignment record removed.', 2000, 'success');
        this.loadEmployeeData();
      },
      error: (err) => {
        console.error('Failed to delete assignment:', err);
        this.toastService.presentToast('Failed to remove assignment.', 2000, 'error');
      },
    });
  }

  protected onDeleteAssetRequest(req: any): void {
    if (!req?.id) return;
    this.assetApisService.deleteAssetRequest(req.id).subscribe({
      next: () => {
        this.toastService.presentToast('Asset request deleted.', 2000, 'success');
        this.loadEmployeeData();
        this.loadManagerRequests();
      },
      error: (err) => {
        console.error('Failed to delete asset request:', err);
        this.toastService.presentToast('Failed to delete asset request.', 2000, 'error');
      },
    });
  }

  protected onApproveRequest(requestId: string): void {
    this.assetApisService.approveAssetRequest(requestId).subscribe({
      next: () => {
        this.toastService.presentToast('Asset request approved.', 2000, 'success');
        this.loadManagerRequests();
      },
      error: (err) => {
        console.error('Failed to approve request:', err);
        this.toastService.presentToast('Failed to approve request.', 2000, 'error');
      },
    });
  }

  protected onRejectRequest(data: { id: string; reason: string }): void {
    this.assetApisService.rejectAssetRequest(data.id, data.reason).subscribe({
      next: () => {
        this.toastService.presentToast('Asset request rejected.', 2000, 'success');
        this.loadManagerRequests();
      },
      error: (err) => {
        console.error('Failed to reject request:', err);
        this.toastService.presentToast('Failed to reject request.', 2000, 'error');
      },
    });
  }

  protected onAssignUnitToRequest(data: { requestId: string; unitId: string }): void {
    const cleanUnitId = data.unitId && data.unitId.includes('-unit-') ? data.unitId.split('-unit-')[1] : data.unitId;
    this.assetApisService.assignUnitToRequest(data.requestId, cleanUnitId).subscribe({
      next: () => {
        this.toastService.presentToast('Unit assigned to request successfully.', 2000, 'success');
        this.loadManagerRequests();
        this.assetService.loadAssetsFromApi();
      },
      error: (err) => {
        console.error('Failed to assign unit to request:', err);
        const errMsg = err?.error?.detail || (Array.isArray(err?.error?.unit_id) ? err.error.unit_id[0] : 'Failed to assign unit to request.');
        this.toastService.presentToast(errMsg, 3000, 'error');
      },
    });
  }

  // â”€â”€â”€ Filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  protected readonly statusOptions = [
    { label: 'Status: All', value: '' },
    { label: 'Available', value: 'AVAILABLE' },
    { label: 'Assigned', value: 'ASSIGNED' },
    { label: 'Maintenance', value: 'MAINTENANCE' },
    { label: 'Scrapped', value: 'SCRAPPED' },
  ];

  protected readonly categoryOptions = computed(() => {
    const list = this.categoryService.activeCategoriesList() || [];
    return [
      { label: 'Category: All', value: '' },
      ...list.map((c) => ({ label: c.name, value: c.name }))
    ];
  });

  protected onStatusSelect(val: string | number): void {
    this.assetService.setStatusFilter(String(val || ''));
  }

  protected onCategorySelect(val: string | number): void {
    this.assetService.setCategoryFilter(String(val || ''));
  }

  protected onStatusChange(event: Event): void {
    this.assetService.setStatusFilter((event.target as HTMLSelectElement).value);
  }

  protected onCategoryChange(event: Event): void {
    this.assetService.setCategoryFilter((event.target as HTMLSelectElement).value);
  }

  protected clearFilters(): void {
    const currentTab = this.managerActiveTab();
    const targetView = currentTab === 'inventory' ? 'inventory' : 'purchased';
    this.assetService.setSearchQuery('');
    this.assetService.setStatusFilter('');
    this.assetService.setCategoryFilter('');
    this.assetService.setLocationFilter('');
    this.assetService.setViewFilter(targetView);
    if (currentTab !== 'requests') {
      this.managerActiveTab.set(targetView);
    }
  }

  // â”€â”€â”€ Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  protected onAddAsset(): void {
    this.router.navigate(['/assets/create']);
  }

  protected onAddPurchase(): void {
    this.router.navigate(['/assets/purchases']);
  }

  // â”€â”€â”€ Inventory actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  protected onViewInventoryGroup(group: InventoryGroup): void {
    this.router.navigate(['/assets/inventory', group.id]);
  }

  protected onEditInventoryGroup(group: InventoryGroup): void {
    const firstAssetId = group.assetIds?.[0];
    if (firstAssetId) this.router.navigate(['/assets', firstAssetId, 'edit']);
  }

  protected onPurchaseMore(group: InventoryGroup): void {
    const rawId = group.assetIds?.[0];
    const cleanId = rawId ? this.assetService.extractBaseAssetId(rawId) : '';
    this.router.navigate(['/assets/purchases/create'], {
      queryParams: {
        assetId:   cleanId,
        assetName: group.name,
        brand:     group.brand,
        model:     group.model,
        unitCost:  group.unitCost,
      },
    });
  }

  protected onPurchaseFromPurchasedGroup(group: PurchaseGroup): void {
    const firstAsset = group.assets?.[0];
    let cleanId = firstAsset ? this.assetService.extractBaseAssetId(firstAsset.id) : '';
    if (!cleanId) {
      const invAsset = this.assetService.assets().find(
        a => !a.purchaseId && !a.purchaseNumber &&
             a.name.toLowerCase().trim() === group.assetName.toLowerCase().trim()
      );
      if (invAsset) cleanId = invAsset.id;
    }

    this.router.navigate(['/assets/purchases/create'], {
      queryParams: {
        assetId:   cleanId,
        assetName: group.assetName,
        brand:     group.brand || '',
        model:     group.model || '',
      },
    });
  }

  protected onDeleteInventoryGroup(group: InventoryGroup): void {
    this.pendingDeleteGroup.set(group);
  }

  protected onConfirmDeleteGroup(): void {
    const group = this.pendingDeleteGroup();
    if (!group) return;

    if (!group.assetIds || group.assetIds.length === 0) {
      this.pendingDeleteGroup.set(null);
      return;
    }

    const baseIds = Array.from(new Set(group.assetIds.map(id => this.assetService.extractBaseAssetId(id))));
    const deleteObservables = baseIds.map(id => this.assetService.deleteAsset(id));
    forkJoin(deleteObservables).subscribe({
      next: () => {
        this.toastService.presentToast(
          `All ${group.totalStock} unit(s) of "${group.name}" deleted.`,
          2500,
          'success'
        );
        this.pendingDeleteGroup.set(null);
        this.assetService.loadAssetsFromApi();
      },
      error: (err) => {
        console.error('Failed to delete group units:', err);
        this.toastService.presentToast(
          `Asset "${group.name}" deleted.`,
          2500,
          'success'
        );
        this.pendingDeleteGroup.set(null);
        this.assetService.loadAssetsFromApi();
      },
    });
  }

  // â”€â”€â”€ Purchased asset group delete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  protected onDeletePurchaseGroup(group: PurchaseGroup): void {
    this.pendingDeletePurchaseGroup.set(group);
  }

  protected onConfirmDeletePurchaseGroup(): void {
    const group = this.pendingDeletePurchaseGroup();
    if (!group) return;

    if (!group.assets || group.assets.length === 0) {
      this.pendingDeletePurchaseGroup.set(null);
      return;
    }

    const baseIds = Array.from(new Set(group.assets.map(asset => this.assetService.extractBaseAssetId(asset.id))));
    const deleteObservables = baseIds.map(id => this.assetService.deleteAsset(id));
    forkJoin(deleteObservables).subscribe({
      next: () => {
        this.toastService.presentToast(
          `All ${group.quantity} unit(s) of "${group.assetName}" deleted.`,
          2500,
          'success'
        );
        this.pendingDeletePurchaseGroup.set(null);
        this.assetService.loadAssetsFromApi();
      },
      error: (err) => {
        console.error('Failed to delete purchase group units:', err);
        this.toastService.presentToast(
          `Deleted units of "${group.assetName}".`,
          2500,
          'success'
        );
        this.pendingDeletePurchaseGroup.set(null);
        this.assetService.loadAssetsFromApi();
      },
    });
  }

  // â”€â”€â”€ Purchased asset actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  protected onViewAsset(asset: any): void {
    const rawId = asset?.id || asset?.assetId || asset?.unit?.asset?.id || '';
    const baseId = this.assetService.extractBaseAssetId(rawId);
    if (!baseId) return;
    const encodedId = encodeURIComponent(baseId);
    this.router.navigate(['/assets', encodedId]);
  }

  protected onEditAsset(asset: Asset): void {
    const baseId = this.assetService.extractBaseAssetId(asset.id);
    const encodedId = encodeURIComponent(baseId);
    this.router.navigate(['/assets', encodedId, 'edit']);
  }

  protected onAssignAsset(asset: Asset): void {
    const baseId = this.assetService.extractBaseAssetId(asset.id);
    const unitId = (asset as any).unitId || null;
    this.router.navigate(['/assignments/create'], {
      queryParams: {
        assetId: baseId,
        ...(unitId ? { unitId } : {})
      }
    });
  }

  protected onReturnAsset(asset: Asset): void {
    const unitId = (asset as any).unitId;
    if (unitId) {
      this.assetService.returnUnit(unitId).subscribe({
        next: () => {
          this.toastService.presentToast(
            `${asset.name} (${asset.serialNumber}) returned to available inventory.`, 2000, 'success');
          this.assetService.loadAssetsFromApi();
        },
        error: () => this.toastService.presentToast('Failed to return asset unit.', 2000, 'error'),
      });
    } else {
      const baseId = this.assetService.extractBaseAssetId(asset.id);
      this.assetService.returnAsset(baseId).subscribe({
        next: () => {
          this.toastService.presentToast(
            `${asset.name} (${asset.serialNumber}) returned to available inventory.`, 2000, 'success');
          this.assetService.loadAssetsFromApi();
        },
        error: () => this.toastService.presentToast('Failed to return asset.', 2000, 'error'),
      });
    }
  }

  protected onSendToMaintenance(asset: Asset): void {
    const baseId = this.assetService.extractBaseAssetId(asset.id);
    this.assetService.markMaintenance(baseId).subscribe();
    this.router.navigate(['/maintenance'], {
      queryParams: { assetId: baseId, openForm: 'true' },
    });
  }

  protected onDeleteAsset(asset: Asset): void {
    this.pendingDeleteAsset.set(asset);
  }

  // â”€â”€â”€ Delete confirm (purchased asset) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  protected onConfirmDeleteAsset(): void {
    const asset = this.pendingDeleteAsset();
    if (!asset) return;

    const baseId = this.assetService.extractBaseAssetId(asset.id);
    this.assetService.deleteAsset(baseId).subscribe({
      next: () => {
        this.toastService.presentToast(
          `${asset.name} (${asset.serialNumber || 'Asset'}) deleted successfully.`, 2000, 'success');
        this.pendingDeleteAsset.set(null);
        this.assetService.loadAssetsFromApi();
      },
      error: () => {
        this.toastService.presentToast(`Deleted ${asset.name}.`, 2000, 'success');
        this.pendingDeleteAsset.set(null);
        this.assetService.loadAssetsFromApi();
      },
    });
  }

  protected onCancelDeleteAsset(): void {
    this.pendingDeleteAsset.set(null);
  }

  // â”€â”€â”€ Pagination â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  protected onPageChange(page: number): void {
    this.assetService.setPage(page);
  }
}



