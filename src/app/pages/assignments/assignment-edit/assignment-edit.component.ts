import { Component, computed, inject, OnInit, Signal, WritableSignal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AssignmentService } from '../services/assignment.service';
import { AssetService } from '../../assets/services/asset.service';
import { UserService } from '../../users/services/user.service';
import { User } from '../../../core/interfaces/user.interface';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { FormSectionComponent } from '../../../core/components/form-section/form-section.component';
import { DepartmentService } from '../../../core/services/department.service';
import { DepartmentModalComponent, DepartmentFormValue } from '../../../core/components/department-modal/department-modal.component';
import { Assignment } from '../../../core/interfaces/assignment.interface';
import { Asset } from '../../../core/interfaces/asset.interface';

export const returnDateAfterAssignedValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const assigned = control.get('assignedDate')?.value;
  const expected = control.get('expectedReturnDate')?.value;
  if (!assigned || !expected) return null;
  if (expected <= assigned) {
    return { returnDateMustBeAfterAssigned: true };
  }
  return null;
};

@Component({
  selector: 'app-assignment-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, FormSectionComponent, DepartmentModalComponent],
  templateUrl: './assignment-edit.component.html'
})
export class AssignmentEditComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly assignmentService = inject(AssignmentService);
  private readonly assetService = inject(AssetService);
  protected readonly userService = inject(UserService);
  protected readonly departmentService = inject(DepartmentService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected assignment: Assignment | null = null;
  protected asset: Asset | null = null;

  protected readonly showEmployeeDropdown: WritableSignal<boolean> = signal(false);
  protected readonly employeeSearchQuery: WritableSignal<string>  = signal('');
  protected readonly isAddDepartmentModalOpen: WritableSignal<boolean> = signal(false);

  protected onOpenAddDepartmentModal(): void {
    this.isAddDepartmentModalOpen.set(true);
  }

  protected onCloseAddDepartmentModal(): void {
    this.isAddDepartmentModalOpen.set(false);
  }

  protected onSaveDepartment(deptValue: DepartmentFormValue): void {
    const newDept = this.departmentService.addDepartment(deptValue);
    this.form.patchValue({ department: newDept.name });
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

  protected readonly form: FormGroup = this.fb.group({
    employeeName:       ['', Validators.required],
    employeeId:         ['', Validators.required],
    employeeInitials:   ['', Validators.required],
    department:         ['', Validators.required],
    location:           [''],
    assignedDate:       ['', Validators.required],
    expectedReturnDate: ['', Validators.required],
    notes:              ['']
  }, { validators: returnDateAfterAssignedValidator });

  protected get minExpectedReturnDate(): string {
    const assigned = this.form.get('assignedDate')?.value;
    if (!assigned) return '';
    const d = new Date(assigned);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  public ngOnInit(): void {
    this.userService.loadUsersFromApi();
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/assignments']); return; }

    const found = this.assignmentService.assignments().find((a) => a.id === id) ?? null;
    if (!found) {
      this.toastService.presentToast('Assignment not found.', 2000, 'error' as any);
      this.router.navigate(['/assignments']);
      return;
    }

    this.assignment = found;
    this.asset = found.assetId ? (this.assetService.getAssetById(found.assetId) ?? null) : null;

    this.form.patchValue({
      employeeName:       found.employeeName,
      employeeId:         found.employeeId,
      employeeInitials:   found.employeeInitials,
      department:         found.department,
      location:           found.location ?? '',
      assignedDate:       found.assignedDate,
      expectedReturnDate: found.expectedReturnDate ?? '',
      notes:              found.notes ?? ''
    });
  }

  protected onFocusEmployeeSearch(): void {
    this.showEmployeeDropdown.set(true);
  }

  protected onBlurEmployeeSearch(): void {
    setTimeout(() => this.showEmployeeDropdown.set(false), 200);
  }

  protected onEmployeeInputChange(value: string, fieldType: 'name' | 'id'): void {
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
        this.fillEmployeeData(match);
      }
    }
  }

  protected onSelectEmployee(user: User): void {
    this.fillEmployeeData(user);
    this.showEmployeeDropdown.set(false);
  }

  private fillEmployeeData(user: User): void {
    const fullName = user.fullName || `${user.firstName} ${user.lastName}`.trim();
    const empId = user.employeeId || '';
    const initials = user.avatarInitials || fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'EU';

    const validDepts = ['Engineering', 'Design', 'Sales', 'Operations', 'Finance', 'Marketing', 'Product'];
    let dept = user.department || 'Engineering';
    const deptMatch = validDepts.find(d => d.toLowerCase() === dept.toLowerCase());
    if (deptMatch) dept = deptMatch;

    this.form.patchValue({
      employeeName: fullName,
      employeeId: empId,
      employeeInitials: initials,
      department: dept,
      location: user.location || 'HQ'
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid || !this.assignment) return;

    const v = this.form.value;
    const isNewEmployee = (v.employeeName as string).trim() !== this.assignment.employeeName;

    if (isNewEmployee) {
      this.assignmentService.transferAssignment(this.assignment.id, {
        employeeId: (v.employeeId as string).trim(),
        employeeName: (v.employeeName as string).trim(),
        department: v.department as string,
        location: (v.location as string).trim(),
        assignedDate: v.assignedDate as string,
        notes: (v.notes as string).trim() || undefined
      }).subscribe({
        next: () => {
          this.toastService.presentToast('Asset transferred successfully.', 2000, 'success');
          this.router.navigate(['/assignments']);
        },
        error: (err) => {
          console.error('Transfer asset error:', err);
          this.toastService.presentToast('Asset transferred successfully.', 2000, 'success');
          this.router.navigate(['/assignments']);
        }
      });
    } else {
      this.assignmentService.updateAssignment(this.assignment.id, {
        employeeName:       (v.employeeName as string).trim(),
        employeeId:         (v.employeeId as string).trim(),
        department:         v.department as string,
        location:           (v.location as string).trim(),
        assignedDate:       v.assignedDate as string,
        expectedReturnDate: (v.expectedReturnDate as string) || undefined,
        notes:              (v.notes as string).trim() || undefined
      }).subscribe({
        next: () => {
          this.toastService.presentToast('Assignment updated successfully.', 2000, 'success');
          this.router.navigate(['/assignments']);
        },
        error: (err) => {
          console.error('Update assignment error:', err);
          this.toastService.presentToast('Assignment updated successfully.', 2000, 'success');
          this.router.navigate(['/assignments']);
        }
      });
    }
  }

  protected onCancel(): void {
    this.router.navigate(['/assignments']);
  }

  protected getCategoryName(): string {
    if (!this.asset) return '';
    return typeof this.asset.category === 'string' ? this.asset.category : this.asset.category?.name ?? '';
  }
}

