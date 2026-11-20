import { Component, computed, inject, OnInit, Signal, WritableSignal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AssignmentService } from '../services/assignment.service';
import { AssetService } from '../../assets/services/asset.service';
import { UserService } from '../../users/services/user.service';
import { DepartmentService } from '../../../core/services/department.service';
import { User } from '../../../core/interfaces/user.interface';
import { Asset, AssetUnit } from '../../../core/interfaces/asset.interface';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { FormSectionComponent } from '../../../core/components/form-section/form-section.component';

export const returnDateAfterAssignedValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const assigned = control.get('assignedDate')?.value;
  const expected = control.get('expectedReturnDate')?.value;
  if (!assigned || !expected) return null;
  return expected <= assigned ? { returnDateMustBeAfterAssigned: true } : null;
};

@Component({
  selector: 'app-assignment-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, FormSectionComponent],
  templateUrl: './assignment-create.component.html'
})
export class AssignmentCreateComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly assignmentService = inject(AssignmentService);
  private readonly assetService = inject(AssetService);
  protected readonly userService = inject(UserService);
  protected readonly departmentService = inject(DepartmentService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  // ── Employee search ──────────────────────────────────────────────────────
  protected readonly showNameDropdown: WritableSignal<boolean> = signal(false);
  protected readonly showIdDropdown: WritableSignal<boolean> = signal(false);
  protected readonly employeeSearchQuery: WritableSignal<string> = signal('');

  // ── Asset search ─────────────────────────────────────────────────────────
  protected readonly showAssetDropdown: WritableSignal<boolean> = signal(false);
  protected readonly assetSearchQuery: WritableSignal<string> = signal('');

  // ── Unit search ──────────────────────────────────────────────────────────
  protected readonly showUnitDropdown: WritableSignal<boolean> = signal(false);
  protected readonly unitSearchQuery: WritableSignal<string> = signal('');

  // ── Department search ────────────────────────────────────────────────────
  protected readonly showDeptDropdown: WritableSignal<boolean> = signal(false);
  protected readonly deptSearchQuery: WritableSignal<string> = signal('');

  protected readonly filteredDepts: Signal<string[]> = computed(() => {
    const q = this.deptSearchQuery().toLowerCase().trim();
    const names = this.departmentService.activeDepartmentsList().map(d => d.name);
    if (!q) return names;
    return names.filter(n => n.toLowerCase().includes(q));
  });

  // ── Asset unit selection ─────────────────────────────────────────────────
  protected readonly selectedAsset: WritableSignal<Asset | null> = signal(null);
  protected readonly availableUnits: WritableSignal<AssetUnit[]> = signal([]);
  protected readonly unitsLoading: WritableSignal<boolean> = signal(false);

  // Filtered available units for autocomplete dropdown
  protected readonly filteredAvailableUnits: Signal<AssetUnit[]> = computed(() => {
    const query = this.unitSearchQuery().toLowerCase().trim();
    const units = this.availableUnits();

    if (!query) return units;

    return units.filter(u => {
      const displayId = (u.displayId || '').toLowerCase();
      const serial = (u.serialNumber || '').toLowerCase();
      const id = (u.id || '').toLowerCase();
      return displayId.includes(query) || serial.includes(query) || id.includes(query);
    });
  });

  // ── Form ─────────────────────────────────────────────────────────────────
  protected readonly form: FormGroup = this.fb.group({
    assetId: ['', Validators.required],
    unitId: ['', Validators.required],
    employeeName: ['', Validators.required],
    employeeId: ['', Validators.required],
    employeeInitials: ['', Validators.required],
    department: ['', Validators.required],
    location: ['HQ'],
    assignedDate: ['', Validators.required],
    expectedReturnDate: ['', Validators.required],
    notes: ['']
  }, { validators: returnDateAfterAssignedValidator });

  // ── Computed signals ─────────────────────────────────────────────────────

  protected readonly availableAssets: Signal<Asset[]> = computed(() =>
    this.assetService.assets().filter(a => {
      const isParent = !a.id.includes('-unit-');
      const isNotScrapped = (a.status as string) !== 'SCRAPPED' && (a.status as string) !== 'RETIRED';
      const hasUnits = Array.isArray(a.units) && a.units.some(u => u.status === 'AVAILABLE');
      const hasAvailQty = a.availableQuantity !== undefined ? a.availableQuantity > 0 : hasUnits;
      return isParent && isNotScrapped && (hasAvailQty || hasUnits || a.status === 'AVAILABLE');
    })
  );

  protected readonly filteredAvailableAssets: Signal<Asset[]> = computed(() => {
    const q = this.assetSearchQuery().toLowerCase().trim();
    const assets = this.availableAssets();
    if (!q) return assets;
    return assets.filter(a => {
      const cat = typeof a.category === 'string'
        ? a.category.toLowerCase()
        : ((a.category as any)?.name || '').toLowerCase();
      return (a.name || '').toLowerCase().includes(q)
        || (a.serialNumber || '').toLowerCase().includes(q)
        || (a.brand || '').toLowerCase().includes(q)
        || (a.model || '').toLowerCase().includes(q)
        || cat.includes(q);
    });
  });

  protected readonly filteredEmployees: Signal<User[]> = computed(() => {
    const q = this.employeeSearchQuery().toLowerCase().trim();
    const all = this.userService.users();
    if (!q) return all;
    return all.filter(u => {
      const name = (u.fullName || `${u.firstName} ${u.lastName}`).toLowerCase();
      const empId = (u.employeeId || '').toLowerCase();
      const dept = (u.department || '').toLowerCase();
      return name.includes(q) || empId.includes(q) || dept.includes(q) || u.email.toLowerCase().includes(q);
    });
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────

  public ngOnInit(): void {
    this.assetService.loadAssetsFromApi();
    this.userService.loadUsersFromApi();
    const today = new Date();
    const returnDate = new Date();
    returnDate.setDate(today.getDate() + 30);

    const todayStr = today.toISOString().split('T')[0];
    const returnStr = returnDate.toISOString().split('T')[0];

    this.form.patchValue({
      assignedDate: todayStr,
      expectedReturnDate: returnStr
    });

    // Pre-fill asset from query params (when navigated from Assets page)
    this.route.queryParamMap.subscribe(params => {
      const assetId = params.get('assetId');
      const unitId  = params.get('unitId');
      if (!assetId) return;

      // Wait for assets to load then select the matching one
      const trySelect = () => {
        const assets = this.assetService.assets();
        const match = assets.find(a => a.id === assetId || a.id.startsWith(assetId));
        if (match) {
          this.selectAsset(match);
          if (unitId) {
            // Pre-select the specific unit after units are loaded
            const tryUnit = () => {
              const units = this.availableUnits();
              const unit = units.find(u => u.id === unitId || u.id.includes(unitId));
              if (unit) {
                this.form.patchValue({ unitId: unit.id });
                this.unitSearchQuery.set(unit.displayId || unit.serialNumber || unit.id);
              } else if (this.unitsLoading()) {
                setTimeout(tryUnit, 100);
              }
            };
            setTimeout(tryUnit, 300);
          }
        } else if (assets.length === 0) {
          setTimeout(trySelect, 200);
        }
      };
      setTimeout(trySelect, 300);
    });
  }

  protected get minExpectedReturnDate(): string {
    const assigned = this.form.get('assignedDate')?.value;
    if (!assigned) return '';
    const d = new Date(assigned);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  protected onDateInput(controlName: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.value) return;
    const parts = input.value.split('-');
    if (parts[0] && parts[0].length > 4) {
      parts[0] = parts[0].slice(0, 4);
      const fixed = parts.join('-');
      input.value = fixed;
      this.form.get(controlName)?.setValue(fixed);
    }
  }

  protected onDateBlur(controlName: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.value) return;
    const parts = input.value.split('-');
    if (parts[0] && parts[0].length > 4) {
      parts[0] = parts[0].slice(0, 4);
      const fixed = parts.join('-');
      input.value = fixed;
      this.form.get(controlName)?.setValue(fixed);
    }
  }

  // ── Employee search handlers ──────────────────────────────────────────────

  protected onFocusNameSearch(): void { this.showNameDropdown.set(true); }
  protected onBlurNameSearch(): void { setTimeout(() => this.showNameDropdown.set(false), 200); }

  protected onFocusIdSearch(): void { this.showIdDropdown.set(true); }
  protected onBlurIdSearch(): void { setTimeout(() => this.showIdDropdown.set(false), 200); }

  protected onNameInputChange(value: string): void {
    this.employeeSearchQuery.set(value);
    this.showNameDropdown.set(true);
    this._autoFillFromInput(value, 'name');
  }

  protected onIdInputChange(value: string): void {
    this.employeeSearchQuery.set(value);
    this.showIdDropdown.set(true);
    this._autoFillFromInput(value, 'id');
  }

  private _autoFillFromInput(value: string, fieldType: 'name' | 'id'): void {
    const term = value.trim().toLowerCase();
    if (term.length >= 2) {
      const match = this.userService.users().find(u => {
        const full = (u.fullName || `${u.firstName} ${u.lastName}`).toLowerCase();
        const empId = (u.employeeId || u.id || '').toString().toLowerCase();
        return fieldType === 'name' ? full === term : empId === term;
      });
      if (match) this.fillEmployeeData(match);
    }
  }

  protected onSelectEmployeeFromName(user: User): void {
    this.fillEmployeeData(user);
    this.showNameDropdown.set(false);
  }

  protected onSelectEmployeeFromId(user: User): void {
    this.fillEmployeeData(user);
    this.showIdDropdown.set(false);
  }

  private fillEmployeeData(user: User): void {
    const fullName = user.fullName || `${user.firstName} ${user.lastName}`.trim();
    const empId = user.employeeId || '';
    const initials = user.avatarInitials
      || fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      || 'EU';

    let dept = user.department || '';
    const names = this.departmentService.activeDepartmentsList().map(d => d.name);
    const match = names.find(n => n.toLowerCase() === dept.toLowerCase());
    if (match) dept = match;

    this.form.patchValue({
      employeeName: fullName,
      employeeId: empId,
      employeeInitials: initials,
      department: dept,
      location: user.location || 'HQ'
    });
    this.deptSearchQuery.set(dept);
  }

  // ── Department search handlers ────────────────────────────────────────────

  protected onFocusDeptSearch(): void { this.showDeptDropdown.set(true); }
  protected onBlurDeptSearch(): void { setTimeout(() => this.showDeptDropdown.set(false), 200); }

  protected onDeptInputChange(value: string): void {
    this.deptSearchQuery.set(value);
    this.showDeptDropdown.set(true);
    this.form.patchValue({ department: value });
  }

  protected onSelectDept(dept: string): void {
    this.deptSearchQuery.set(dept);
    this.form.patchValue({ department: dept });
    this.showDeptDropdown.set(false);
  }

  // ── Asset search handlers ─────────────────────────────────────────────────

  protected onFocusAssetSearch(): void { this.showAssetDropdown.set(true); }
  protected onBlurAssetSearch(): void { setTimeout(() => this.showAssetDropdown.set(false), 200); }

  protected onAssetInputChange(value: string): void {
    this.assetSearchQuery.set(value);
    this.showAssetDropdown.set(true);
    if (!value.trim()) this.clearSelectedAsset();
  }

  protected selectAsset(asset: Asset): void {
    this.selectedAsset.set(asset);
    this.form.patchValue({ assetId: asset.id });
    this.assetSearchQuery.set(asset.name);
    this.showAssetDropdown.set(false);
    this.unitsLoading.set(true);
    this.form.patchValue({ unitId: '' });
    this.unitSearchQuery.set('');
    this.showUnitDropdown.set(false);
    this.availableUnits.set([]);

    const baseId = this.assetService.extractBaseAssetId(asset.id);
    const allAssets = this.assetService.assets();

    let cachedUnits: AssetUnit[] = [];
    if (asset.units && Array.isArray(asset.units)) {
      cachedUnits = asset.units.filter(u => u.status === 'AVAILABLE');
    }
    if (cachedUnits.length === 0) {
      cachedUnits = allAssets
        .filter(a => (a.id.startsWith(`${baseId}-unit-`) || a.id === asset.id || a.name === asset.name) && a.status === 'AVAILABLE')
        .map((a, idx) => ({
          id: a.unitId || a.id.replace(`${baseId}-unit-`, '') || a.id,
          displayId: a.displayId,
          assetId: baseId,
          unitNumber: idx + 1,
          serialNumber: a.serialNumber || '',
          status: 'AVAILABLE' as const,
          location: a.location,
          createdAt: a.createdAt || '',
          updatedAt: a.updatedAt || '',
        }));
    }

    const setUnits = (apiUnits: AssetUnit[]) => {
      const finalUnits = apiUnits.length > 0 ? apiUnits : cachedUnits;
      this.unitsLoading.set(false);
      if (finalUnits.length > 0) {
        this.availableUnits.set(finalUnits);
        this.form.patchValue({ unitId: '' });
        this.unitSearchQuery.set('');
      } else if (asset.status === 'AVAILABLE') {
        const fb: AssetUnit = {
          id: asset.id, displayId: asset.displayId, assetId: asset.id, unitNumber: 1,
          serialNumber: asset.serialNumber || '',
          status: 'AVAILABLE', createdAt: asset.createdAt || '', updatedAt: asset.updatedAt || '',
        };
        this.availableUnits.set([fb]);
        this.form.patchValue({ unitId: '' });
        this.unitSearchQuery.set('');
      } else {
        this.availableUnits.set([]);
        this.form.patchValue({ unitId: '' });
        this.unitSearchQuery.set('');
      }
    };

    this.assetService.getAvailableUnits(baseId).subscribe({
      next: (units) => setUnits(Array.isArray(units) ? units : ((units as any)?.results ?? [])),
      error: () => setUnits([]),
    });
  }

  protected onFocusUnitSearch(): void {
    this.showUnitDropdown.set(true);
  }

  protected onBlurUnitSearch(): void {
    setTimeout(() => this.showUnitDropdown.set(false), 200);
  }

  protected onUnitInputChange(value: string): void {
    this.unitSearchQuery.set(value);
    this.showUnitDropdown.set(true);

    const val = value.trim().toLowerCase();
    const match = this.availableUnits().find(u => 
      (u.displayId || '').toLowerCase() === val ||
      (u.serialNumber || u.id || '').toLowerCase() === val
    );
    if (match) {
      this.selectUnit(match);
    } else {
      this.form.patchValue({ unitId: '' });
    }
  }

  protected selectUnit(unit: AssetUnit): void {
    this.form.patchValue({ unitId: unit.id });
    this.unitSearchQuery.set(unit.displayId || unit.serialNumber || unit.id);
    this.showUnitDropdown.set(false);
  }

  protected clearSelectedUnit(): void {
    this.form.patchValue({ unitId: '' });
    this.unitSearchQuery.set('');
    this.showUnitDropdown.set(true);
  }

  protected clearSelectedAsset(): void {
    this.selectedAsset.set(null);
    this.form.patchValue({ assetId: '', unitId: '' });
    this.assetSearchQuery.set('');
    this.unitSearchQuery.set('');
    this.showUnitDropdown.set(false);
    this.availableUnits.set([]);
  }

  protected onAssetChange(event: Event): void {
    const assetId = (event.target as HTMLSelectElement).value;
    if (!assetId) { this.clearSelectedAsset(); return; }
    const asset = this.assetService.assets().find(a => a.id === assetId) ?? null;
    if (asset) this.selectAsset(asset);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  protected onSubmit(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    const unitId = (v.unitId as string) || (v.assetId as string);

    this.assignmentService.createAssignment(unitId, {
      unitId,
      assetId: v.assetId as string,
      employeeId: (v.employeeId as string).trim(),
      employeeName: (v.employeeName as string).trim(),
      department: v.department as string,
      location: (v.location as string)?.trim() || 'HQ',
      assignedDate: v.assignedDate as string,
      expectedReturnDate: (v.expectedReturnDate as string) || undefined,
      notes: (v.notes as string)?.trim() || undefined,
    }).subscribe({
      next: () => {
        this.assetService.loadAssetsFromApi();
        this.toastService.presentToast('Assignment created successfully!', 2000, 'success');
        this.router.navigate(['/assignments']);
      },
      error: (err: any) => {
        const msg = err?.error?.detail
          || err?.error?.unitId?.[0]
          || err?.error?.employeeName?.[0]
          || 'Failed to create assignment. Please try again.';
        this.toastService.presentToast(msg, 3000, 'error');
      }
    });
  }

  protected onCancel(): void { this.router.navigate(['/assignments']); }

  protected getCategoryName(asset: Asset): string {
    return typeof asset.category === 'string'
      ? asset.category
      : (asset.category as any)?.name ?? '';
  }
}
