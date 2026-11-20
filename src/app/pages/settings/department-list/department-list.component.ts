import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DepartmentService } from '../../../core/services/department.service';
import { Department } from '../../../core/interfaces/department.interface';
import { DepartmentModalComponent, DepartmentFormValue } from '../../../core/components/department-modal/department-modal.component';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [CommonModule, DepartmentModalComponent],
  templateUrl: './department-list.component.html'
})
export class DepartmentListComponent {
  protected readonly departmentService = inject(DepartmentService);
  private readonly router              = inject(Router);
  private readonly breadcrumbService   = inject(BreadcrumbService);

  protected readonly isAddModalOpen    = signal<boolean>(false);
  protected readonly editTarget        = signal<Department | null>(null);
  protected readonly pendingDeleteId   = signal<string | null>(null);

  constructor() {
    this.breadcrumbService.setOverride({
      showBackArrow: true,
      backUrl: '/settings',
      items: [
        { label: 'Settings', url: '/settings' },
        { label: 'Departments', isLast: true }
      ]
    });
  }

  protected openAdd(): void {
    this.editTarget.set(null);
    this.isAddModalOpen.set(true);
  }

  protected openEdit(dept: Department): void {
    this.editTarget.set(dept);
    this.isAddModalOpen.set(true);
  }

  protected closeModal(): void {
    this.isAddModalOpen.set(false);
    this.editTarget.set(null);
  }

  protected onSaveDepartment(value: DepartmentFormValue): void {
    const existing = this.editTarget();
    if (existing) {
      this.departmentService.updateDepartment(existing.id, {
        name:        value.name,
        code:        value.code,
        description: value.description,
        status:      value.status as 'ACTIVE' | 'INACTIVE'
      });
    } else {
      this.departmentService.addDepartment(value);
    }
    this.closeModal();
  }

  protected confirmDelete(id: string): void {
    this.pendingDeleteId.set(id);
  }

  protected onConfirmDelete(): void {
    const id = this.pendingDeleteId();
    if (id) {
      this.departmentService.deleteDepartment(id);
      this.pendingDeleteId.set(null);
    }
  }

  protected cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  protected goBack(): void {
    this.router.navigate(['/settings']);
  }
}
