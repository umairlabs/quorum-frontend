import { Component, computed, inject, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { CategoryService } from '../../../core/services/category.service';
import { DepartmentService } from '../../../core/services/department.service';
import { AuthApisService } from '../../../core/services/api/auth-apis.service';

@Component({
  selector: 'app-settings-overview',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  templateUrl: './settings-overview.component.html'
})
export class SettingsOverviewComponent {
  private readonly router      = inject(Router);
  private readonly authService = inject(AuthApisService);
  protected readonly categoryService   = inject(CategoryService);
  protected readonly departmentService = inject(DepartmentService);

  protected readonly isAdmin: Signal<boolean> = computed(() => {
    const role = (
      this.authService.currentUser()?.role || localStorage.getItem('role') || ''
    ).toUpperCase().replace(/\s+/g, '_');
    return role === 'SYSTEM_ADMIN' || role === 'SUPER_ADMIN' || role === 'ADMIN';
  });

  protected onNavigate(route?: string): void {
    if (route) this.router.navigate([route]);
  }
}