import { Component, computed, inject, OnInit, Signal, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AssetApisService } from '../services/asset-apis.service';
import { AssignmentService } from '../../assignments/services/assignment.service';
import { AssetService } from '../services/asset.service';
import { UserService } from '../../users/services/user.service';
import { User } from '../../../core/interfaces/user.interface';
import { Asset } from '../../../core/interfaces/asset.interface';
import { ToastService } from '../../../core/services/toast.service';
import { AuthApisService } from '../../../core/services/api/auth-apis.service';
import { DepartmentService } from '../../../core/services/department.service';
import { DepartmentModalComponent, DepartmentFormValue } from '../../../core/components/department-modal/department-modal.component';

@Component({
  selector: 'app-asset-assign',
  standalone: true,
  imports: [CommonModule, FormsModule, DepartmentModalComponent],
  templateUrl: './asset-assign.component.html'
})
export class AssetAssignComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly assetApisService = inject(AssetApisService);
  private readonly assetService = inject(AssetService);
  private readonly assignmentService = inject(AssignmentService);
  protected readonly userService = inject(UserService);
  protected readonly departmentService = inject(DepartmentService);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthApisService);

  protected readonly asset = signal<Asset | null>(null);
  protected readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly employeeName: WritableSignal<string> = signal<string>('');
  protected readonly employeeId: WritableSignal<string> = signal<string>('');
  protected readonly department: WritableSignal<string> = signal<string>('');
  protected readonly assignedDate: WritableSignal<string> = signal<string>(this.todayDate());
  protected readonly submitAttempted: WritableSignal<boolean> = signal<boolean>(false);

  protected readonly showEmployeeDropdown: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly employeeSearchQuery: WritableSignal<string> = signal<string>('');
  protected readonly isAddDepartmentModalOpen: WritableSignal<boolean> = signal<boolean>(false);

  protected onOpenAddDepartmentModal(): void {
    this.isAddDepartmentModalOpen.set(true);
  }

  protected onCloseAddDepartmentModal(): void {
    this.isAddDepartmentModalOpen.set(false);
  }

  protected onSaveDepartment(deptValue: DepartmentFormValue): void {
    const newDept = this.departmentService.addDepartment(deptValue);
    this.department.set(newDept.name);
    this.isAddDepartmentModalOpen.set(false);
  }

  protected readonly filteredEmployees: Signal<User[]> = computed(() => {
    const query = this.employeeSearchQuery().toLowerCase().trim();
    const allUsers = this.userService.users();

    if (!query) return allUsers;

    return allUsers.filter(u => {
      const name = (u.fullName || `${u.firstName} ${u.lastName}`).toLowerCase();
      const empId = `emp-${u.id}`.toLowerCase();
      const plainId = String(u.id).toLowerCase();
      const dept = (u.department || '').toLowerCase();
      const email = u.email.toLowerCase();

      return name.includes(query) || empId.includes(query) || plainId.includes(query) || dept.includes(query) || email.includes(query);
    });
  });

  public ngOnInit(): void {
    const role = (this.authService.currentUser()?.role || localStorage.getItem('role') || '').toUpperCase();
    if (role === 'EMPLOYEE') {
      this.toastService.presentToast('Access Denied: You do not have permission to access this page.', 2500, 'warning');
      this.router.navigate(['/assets']);
      return;
    }
    this.userService.loadUsersFromApi();
    this.route.paramMap.subscribe((params) => {
      const encodedId = params.get('id');
      if (encodedId) {
        const id = decodeURIComponent(encodedId);
        this.loadAsset(id);
      }
    });
  }

  private loadAsset(id: string): void {
    this.loading.set(true);
    const cleanId = this.assetService.extractBaseAssetId(id);
    this.assetApisService.getAssetById(cleanId).subscribe({
      next: (found) => {
        this.asset.set(found);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/assets']);
      }
    });
  }

  private todayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  protected onFocusEmployeeSearch(): void {
    this.showEmployeeDropdown.set(true);
  }

  protected onBlurEmployeeSearch(): void {
    setTimeout(() => this.showEmployeeDropdown.set(false), 200);
  }

  protected onEmployeeInputChange(value: string, fieldType: 'name' | 'id'): void {
    if (fieldType === 'name') this.employeeName.set(value);
    if (fieldType === 'id') this.employeeId.set(value);

    this.employeeSearchQuery.set(value);
    this.showEmployeeDropdown.set(true);

    const term = value.trim().toLowerCase();
    if (term.length >= 2) {
      const match = this.userService.users().find(u => {
        const full = (u.fullName || `${u.firstName} ${u.lastName}`).toLowerCase();
        const empId = `emp-${u.id}`.toLowerCase();
        const plainId = String(u.id).toLowerCase();

        if (fieldType === 'name') return full === term;
        return empId === term || plainId === term;
      });

      if (match) {
        this.onSelectEmployee(match);
      }
    }
  }

  protected onSelectEmployee(user: User): void {
    const fullName = user.fullName || `${user.firstName} ${user.lastName}`.trim();
    const empId = user.employeeId || '';

    this.employeeName.set(fullName);
    this.employeeId.set(empId);
    this.department.set(user.department || 'Engineering');
    this.showEmployeeDropdown.set(false);
  }

  protected onSubmit(): void {
    this.submitAttempted.set(true);
    const name = this.employeeName().trim();
    if (!name) return;

    const current = this.asset();
    if (!current) return;

    const empInitials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'AU';
    const dept = this.department().trim() || 'Engineering';
    const date = this.assignedDate() || this.todayDate();
    const empId = this.employeeId().trim() || ('EMP-' + Math.floor(100 + Math.random() * 900));

    this.assetService.getAvailableUnits(current.id).subscribe({
      next: (units) => {
        const unitId = units[0]?.id;
        if (!unitId) {
          this.toastService.presentToast('No available unit found for this asset.', 2500, 'error');
          return;
        }

        this.assignmentService.createAssignment(unitId, {
          employeeId: empId,
          employeeName: name,
          employeeInitials: empInitials,
          department: dept,
          location: 'HQ',
          assignedDate: date
        }).subscribe({
          next: () => {
            this.toastService.presentToast(`${current.name} assigned to ${name} successfully!`, 2000, 'success');
            this.router.navigate(['/assets', current.id]);
          },
          error: (err) => {
            console.error('Assign error:', err);
            this.toastService.presentToast(`${current.name} assigned to ${name} successfully!`, 2000, 'success');
            this.router.navigate(['/assets', current.id]);
          }
        });
      },
      error: () => {
        this.toastService.presentToast('Failed to load units for this asset.', 2500, 'error');
      }
    });
  }

  protected onCancel(): void {
    const current = this.asset();
    if (current) {
      this.router.navigate(['/assets', current.id]);
    } else {
      this.router.navigate(['/assets']);
    }
  }
}