import { computed, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { Department } from '../interfaces/department.interface';

const DEFAULT_DEPARTMENTS: Department[] = [];

const DEFAULT_SEED_IDS = new Set(['dept-1', 'dept-2', 'dept-3', 'dept-4', 'dept-5', 'dept-6', 'dept-7', 'dept-8']);

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private readonly STORAGE_KEY = 'astra_departments';

  private saveToLocalStorage(data: Department[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save departments to localStorage', e);
    }
  }

  private loadFromLocalStorage(): Department[] | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Department[];
        // Filter out old pre-seeded default items so only user-added departments remain
        return parsed.filter((d) => !DEFAULT_SEED_IDS.has(d.id));
      }
    } catch (e) {
      console.warn('Failed to read departments from localStorage', e);
    }
    return null;
  }

  // Central State Signal — initialized from localStorage or empty list
  public readonly departments: WritableSignal<Department[]> = signal<Department[]>(
    this.loadFromLocalStorage() || DEFAULT_DEPARTMENTS
  );

  // Active Departments list for dropdowns (e.g., Employee Form, Assignment Edit) - Deduplicated by name
  public readonly activeDepartmentsList: Signal<Department[]> = computed(() => {
    const seen = new Set<string>();
    const result: Department[] = [];

    for (const d of this.departments()) {
      if ((d.status || 'ACTIVE') !== 'ACTIVE') continue;
      const key = d.name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(d);
      }
    }
    return result;
  });

  public setDepartments(departments: Department[]): void {
    const list = departments || [];
    this.departments.set(list);
    this.saveToLocalStorage(list);
  }

  // Add Department with Deduplication & localStorage persistence
  public addDepartment(payload: { name: string; description?: string; code?: string; status?: 'ACTIVE' | 'INACTIVE'; id?: string }): Department {
    const nameTrimmed = payload.name.trim();
    const normalizedKey = nameTrimmed.toLowerCase();

    const existing = this.departments().find(
      (d) => d.name.toLowerCase().trim() === normalizedKey
    );

    if (existing) {
      this.updateDepartment(existing.id, {
        description: payload.description || existing.description,
        status: payload.status || existing.status || 'ACTIVE'
      });
      return existing;
    }

    const today = new Date().toISOString().split('T')[0];
    const newDept: Department = {
      id: payload.id || `dept-${Date.now()}`,
      name: nameTrimmed,
      code: payload.code ? payload.code.trim().toUpperCase() : undefined,
      description: payload.description ? payload.description.trim() : '',
      status: payload.status || 'ACTIVE',
      createdAt: today
    };

    this.departments.update((prev) => [newDept, ...prev]);
    this.saveToLocalStorage(this.departments());
    return newDept;
  }

  public updateDepartment(id: string, payload: Partial<Department>): void {
    this.departments.update((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...payload } : d))
    );
    this.saveToLocalStorage(this.departments());
  }

  public deleteDepartment(id: string): void {
    this.departments.update((prev) => prev.filter((d) => d.id !== id));
    this.saveToLocalStorage(this.departments());
  }
}
