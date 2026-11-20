import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { Observable, of, tap, catchError, throwError } from 'rxjs';
import { User, UserFormInput, UserRole, UserStatus } from '../../../core/interfaces/user.interface';
import { UserApisService } from './user-apis.service';

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  managers: number;
  technicians: number;
}

const DEFAULT_INITIAL_USERS: User[] = [];

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly userApisService = inject(UserApisService);

  // State Signals — backend source with reliable initial employees fallback
  public readonly users: WritableSignal<User[]> = signal<User[]>(DEFAULT_INITIAL_USERS);
  public readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  public readonly errorMessage: WritableSignal<string | null> = signal<string | null>(null);

  // Filter Signals
  public readonly searchQuery: WritableSignal<string> = signal<string>('');
  public readonly selectedRole: WritableSignal<string> = signal<string>('');
  public readonly selectedStatus: WritableSignal<string> = signal<string>('');
  public readonly currentPage: WritableSignal<number> = signal<number>(1);
  public readonly pageSize: WritableSignal<number> = signal<number>(5);

  // Computed Signals
  public readonly filteredUsers: Signal<User[]> = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const roleFilter = this.selectedRole().toUpperCase().trim();
    const statusFilter = this.selectedStatus().toUpperCase().trim();

    return this.users().filter((user) => {
      const name = (user.fullName || `${user.firstName} ${user.lastName}`).toLowerCase();
      const email = user.email.toLowerCase();
      const dept = (user.department || '').toLowerCase();
      const loc = (user.location || '').toLowerCase();

      const matchesQuery =
        !query ||
        name.includes(query) ||
        email.includes(query) ||
        dept.includes(query) ||
        loc.includes(query);

      const userRoleNorm = this.normalizeRole(user.role).toUpperCase();
      const matchesRole = !roleFilter || userRoleNorm === roleFilter || user.role.toUpperCase() === roleFilter;

      let matchesStatus = true;
      if (statusFilter === 'ACTIVE') {
        matchesStatus = user.isActive === true;
      } else if (statusFilter === 'INACTIVE') {
        matchesStatus = user.isActive === false;
      }

      return matchesQuery && matchesRole && matchesStatus;
    });
  });

  public readonly totalFilteredCount: Signal<number> = computed(() => this.filteredUsers().length);

  public readonly totalPages: Signal<number> = computed(() =>
    Math.ceil(this.totalFilteredCount() / this.pageSize()) || 1
  );

  public readonly paginatedUsers: Signal<User[]> = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredUsers().slice(start, start + this.pageSize());
  });

  public readonly stats: Signal<UserStats> = computed(() => {
    const list = this.users();
    const total = list.length;
    const active = list.filter(u => u.isActive).length;
    const inactive = list.filter(u => !u.isActive).length;
    const managers = list.filter(u => {
      const r = this.normalizeRole(u.role);
      return r === 'OPERATIONS_MANAGER' || r === 'MANAGER';
    }).length;
    const technicians = list.filter(u => {
      const r = this.normalizeRole(u.role);
      return r === 'EXTERNAL_TECHNICIAN';
    }).length;

    return { total, active, inactive, managers, technicians };
  });

  // Helper — backend response ko normalize karta hai
  public normalizeUser(raw: any): User {
    if (!raw) return raw;

    const fName = raw.firstName || raw.first_name || '';
    const lName = raw.lastName || raw.last_name || '';
    const fullName = raw.fullName || raw.full_name || `${fName} ${lName}`.trim() || raw.email;
    const initials =
      raw.avatarInitials ||
      raw.avatar_initials ||
      fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ||
      'U';

    const isActive = raw.isActive !== undefined ? Boolean(raw.isActive) : Boolean(raw.is_active);
    const roleNorm = this.normalizeRole(raw.role);

    const rawId = String(raw.id || '');
    const displayId = raw.displayId || raw.display_id || undefined;
    let empId: string = displayId || raw.employeeId || raw.employee_id || raw.employee_code || raw.employeeCode || '';
    if (!empId && rawId) {
      if (!isNaN(Number(rawId))) {
        empId = `EMP-${String(rawId).padStart(3, '0')}`;
      } else {
        const clean = rawId.length > 8 ? rawId.slice(0, 6).toUpperCase() : rawId.toUpperCase();
        empId = clean.startsWith('EMP-') ? clean : `EMP-${clean}`;
      }
    }

    return {
      ...raw,
      id: String(raw.id),
      displayId,
      employeeId: empId,
      email: raw.email || '',
      firstName: fName,
      lastName: lName,
      fullName: fullName,
      role: roleNorm,
      isActive: isActive,
      phoneNumber: raw.phoneNumber || raw.phone_number || raw.phone || '',
      department: raw.department || '',
      location: raw.location || '',
      joiningDate: raw.joiningDate || raw.joining_date || raw.date_joined || raw.createdAt || raw.created_at || '',
      avatarInitials: initials,
      createdAt: raw.createdAt || raw.created_at || '',
      lastLogin: raw.lastLogin || raw.last_login || undefined
    };
  }

  // FIX: EMPLOYEE role explicitly handle kiya + unknown role ab raw value return nahi karta
  // (raw value return karne se aage jaake backend ko wapas bhejte waqt invalid choice ban sakta tha)
  public normalizeRole(role: string | undefined): UserRole {
    if (!role) return 'EMPLOYEE';
    const r = role.toUpperCase().replace(/\s+/g, '_');
    if (r === 'SYSTEM_ADMINISTRATOR' || r === 'SYSTEM_ADMIN' || r === 'SUPER_ADMIN' || r === 'ADMIN') {
      return 'SYSTEM_ADMIN';
    }
    if (r === 'OPERATIONS_MANAGER' || r === 'MANAGER') {
      return 'OPERATIONS_MANAGER';
    }
    if (r === 'EXTERNAL_TECHNICIAN' || r === 'TECHNICIAN') {
      return 'EXTERNAL_TECHNICIAN';
    }
    if (r === 'EMPLOYEE') {
      return 'EMPLOYEE';
    }
    return 'EMPLOYEE'; // safe default instead of returning unknown raw value
  }

  // Load Users from Backend
  public loadUsersFromApi(params?: Record<string, unknown>): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.userApisService.getUsers({ page_size: 100, ...(params || {}) }).subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : (res?.results ?? []);
        const normalized = data.map((u: any) => this.normalizeUser(u));
        this.users.set(normalized);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        console.warn('Failed to load users from API.', err);
        this.errorMessage.set('Failed to load employees.');
        this.loading.set(false);
      }
    });
  }

  // Actions
  public setSearchQuery(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  public setRoleFilter(role: string): void {
    this.selectedRole.set(role);
    this.currentPage.set(1);
  }

  public setStatusFilter(status: string): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
  }

  public setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  public createUser(formInput: UserFormInput): Observable<User> {
    const parts = formInput.fullName.trim().split(' ');
    const fName = parts[0] || '';
    const lName = parts.slice(1).join(' ') || '';

    const payload = {
      email: formInput.email.trim(),
      first_name: fName,
      last_name: lName,
      role: formInput.role ? String(formInput.role).toLowerCase() : 'employee',
      department: formInput.department || '',
      location: formInput.location || '',
      phoneNumber: formInput.phoneNumber || '',
      joiningDate: formInput.joiningDate || null,
      password: formInput.password || undefined
    };

    return this.userApisService.createUser(payload).pipe(
      tap(() => this.loadUsersFromApi())
    );
  }

  public updateUser(id: string, formInput: UserFormInput): Observable<User> {
    const parts = formInput.fullName.trim().split(' ');
    const fName = parts[0] || '';
    const lName = parts.slice(1).join(' ') || '';
    const isAct = formInput.status === 'ACTIVE' || formInput.status === true || formInput.isActive === true;

    const existing = this.users().find(u => u.id === id);

    let cleanJoiningDate: string | null = null;
    const jDateRaw = formInput.joiningDate || existing?.joiningDate;
    if (jDateRaw && jDateRaw !== '—') {
      const sliced = String(jDateRaw).slice(0, 10);
      if (sliced.length === 10 && !isNaN(Date.parse(sliced))) {
        cleanJoiningDate = sliced;
      }
    }

    const payload: Record<string, any> = {
      email: formInput.email.trim() || existing?.email || '',
      first_name: fName,
      last_name: lName,
      role: this.normalizeRole(formInput.role || existing?.role || 'EMPLOYEE').toLowerCase(),
      is_active: isAct,
      department: formInput.department || '',
      location: formInput.location || existing?.location || '',
      phoneNumber: formInput.phoneNumber || existing?.phoneNumber || '',
      joiningDate: cleanJoiningDate
    };

    if (formInput.password && formInput.password.trim()) {
      payload['password'] = formInput.password.trim();
    }

    const updatedUser = this.normalizeUser({
      ...existing,
      ...payload,
      id,
      fullName: `${fName} ${lName}`.trim() || existing?.fullName || existing?.email
    });

    // Optimistically update local state signal for immediate reactivity
    if (existing) {
      this.users.update(list => list.map(u => u.id === id ? updatedUser : u));
    }

    return this.userApisService.updateUser(id, payload).pipe(
      tap((res) => {
        if (res) {
          const norm = this.normalizeUser(res);
          this.users.update(list => list.map(u => u.id === id ? norm : u));
        }
      }),
      catchError((err) => {
        console.warn('Backend updateUser error:', err);
        if (existing) {
          this.users.update(list => list.map(u => u.id === id ? existing : u));
        }
        this.errorMessage.set('Failed to update employee.');
        return throwError(() => err);
      })
    );
  }

  public toggleUserStatus(id: string): Observable<User> {
    const existing = this.users().find(u => u.id === id);
    const nextStatus = existing ? !existing.isActive : true;

    if (!existing) {
      return throwError(() => new Error('User not found'));
    }

    // FIX: role yahan bhi lowercase bhejna zaroori hai
    const payload = {
      email: existing.email || '',
      first_name: existing.firstName || existing.fullName || '',
      last_name: existing.lastName || '',
      role: (existing.role || 'operations_manager').toString().toLowerCase(),
      is_active: nextStatus,
      department: existing.department || '',
      location: existing.location || ''
    };

    const updatedUser = { ...existing, isActive: nextStatus };
    this.users.update(list => list.map(u => u.id === id ? updatedUser : u));

    return this.userApisService.toggleUserStatus(id, payload).pipe(
      tap((res) => {
        if (res) {
          const norm = this.normalizeUser(res);
          this.users.update(list => list.map(u => u.id === id ? norm : u));
        }
      }),
      catchError((err) => {
        console.warn('Backend toggleUserStatus error:', err);
        // FIX: rollback + error propagate (pehle silently success maan liya jata tha)
        this.users.update(list => list.map(u => u.id === id ? existing : u));
        this.errorMessage.set('Failed to update employee status.');
        return throwError(() => err);
      })
    );
  }

  public deleteUser(id: string): Observable<void> {
    const existing = this.users();
    this.users.update(list => list.filter(u => u.id !== id));

    return this.userApisService.deleteUser(id).pipe(
      catchError((err) => {
        console.warn('Backend deleteUser error, rollback:', err);
        // FIX: delete fail hone par bhi list se hataya hi rehta tha — rollback add kiya
        this.users.set(existing);
        this.errorMessage.set('Failed to delete employee.');
        return throwError(() => err);
      })
    );
  }
}