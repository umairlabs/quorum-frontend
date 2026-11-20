import { Component, EventEmitter, inject, Input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { User } from '../../../../core/interfaces/user.interface';
import { PhoneInputComponent } from '../../../../core/components/phone-input/phone-input.component';
import { ModalComponent } from '../../../../core/components/modal/modal.component';
import { DepartmentService } from '../../../../core/services/department.service';
import { DepartmentModalComponent, DepartmentFormValue } from '../../../../core/components/department-modal/department-modal.component';

export interface EmployeeFormInput {
  fullName: string;
  email: string;
  phoneNumber: string;
  department?: string;
  joiningDate?: string;
  password?: string;
}

@Component({
  selector: 'app-employee-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PhoneInputComponent, ModalComponent, DepartmentModalComponent],
  templateUrl: './employee-form-modal.component.html'
})
export class EmployeeFormModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() initialEmployee: User | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<EmployeeFormInput>();

  private readonly fb = inject(FormBuilder);
  protected readonly departmentService = inject(DepartmentService);

  protected readonly showPassword = signal<boolean>(false);
  protected readonly isAddDepartmentModalOpen = signal<boolean>(false);

  protected form: FormGroup = this.buildForm();

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

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] || changes['initialEmployee'] || changes['mode']) {
      this.showPassword.set(false);
      this.form = this.buildForm();
    }
  }

  private buildForm(): FormGroup {
    const e = this.initialEmployee;
    let jDate = e?.joiningDate ? String(e.joiningDate).slice(0, 10) : '';
    if (!jDate || jDate.length !== 10 || isNaN(Date.parse(jDate))) {
      jDate = new Date().toISOString().split('T')[0];
    }
    const name = e?.fullName || (e ? `${e.firstName || ''} ${e.lastName || ''}`.trim() : '') || '';
    const isCreate = this.mode === 'create';

    return this.fb.group({
      fullName: [name, [Validators.required]],
      email: [e?.email || '', [Validators.required, Validators.email]],
      phoneNumber: [e?.phoneNumber || '', [Validators.required]],
      department: [e?.department || '', [Validators.required]],
      joiningDate: [jDate],
      password: ['', isCreate ? [Validators.required] : []],
    });
  }

  protected onClose(): void {
    this.close.emit();
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;

    this.save.emit({
      fullName: v.fullName,
      email: v.email ? v.email.trim() : '',
      phoneNumber: v.phoneNumber,
      department: v.department || undefined,
      joiningDate: v.joiningDate || undefined,
      password: v.password ? v.password.trim() : undefined,
    });
  }

  protected getError(field: string): string | null {
    const c = this.form.get(field);
    if (c && c.invalid && c.touched) {
      if (c.errors?.['required']) {
        return field === 'fullName' ? 'Employee name is required'
          : field === 'email' ? 'Email / Gmail is required'
            : field === 'phoneNumber' ? 'Phone number is required'
              : field === 'department' ? 'Department is required'
                : field === 'password' ? 'Password is required'
                  : `${field} is required`;
      }
      if (c.errors?.['email']) {
        return 'Please enter a valid email address';
      }
    }
    return null;
  }
}