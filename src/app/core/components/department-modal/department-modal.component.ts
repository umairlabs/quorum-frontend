import {
  Component,
  effect,
  inject,
  input,
  output,
  InputSignal,
  OutputEmitterRef,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormSectionComponent } from '../form-section/form-section.component';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { Department } from '../../interfaces/department.interface';

export interface DepartmentFormValue {
  name: string;
  code?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

@Component({
  selector: 'app-department-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormSectionComponent],
  templateUrl: './department-modal.component.html'
})
export class DepartmentModalComponent implements OnChanges, OnDestroy {
  private readonly fb: FormBuilder = inject(FormBuilder);
  private readonly breadcrumbService: BreadcrumbService = inject(BreadcrumbService);

  public readonly isOpen: InputSignal<boolean> = input<boolean>(false);
  public readonly department: InputSignal<Department | null> = input<Department | null>(null);
  public readonly title: InputSignal<string> = input<string>('Add Department');

  public readonly close: OutputEmitterRef<void> = output<void>();
  public readonly save: OutputEmitterRef<DepartmentFormValue> = output<DepartmentFormValue>();

  protected readonly form: FormGroup = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^(?!\s*$).+/)]],
    code:        [''],
    description: [''],
  });

  constructor() {
    effect(() => {
      const dept = this.department();
      if (dept) {
        this.form.patchValue({
          name:        dept.name        || '',
          code:        dept.code        || '',
          description: dept.description || '',
        });
      } else {
        this.form.reset({ name: '', code: '', description: '' });
      }
    });
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (changes['isOpen'].currentValue === true) {
        const isEdit = !!this.department();
        this.breadcrumbService.setOverride({
          showBackArrow: false,
          items: [
            { label: 'AssetFlow' },
            { label: 'Settings', action: () => this.onClose() },
            { label: isEdit ? 'Edit Department' : 'Add Department', isLast: true },
          ],
        });
      } else {
        this.breadcrumbService.clearOverride();
      }
    }
  }

  public ngOnDestroy(): void {
    if (this.isOpen()) this.breadcrumbService.clearOverride();
  }

  protected onClose(): void {
    this.form.reset({ name: '', code: '', description: '' });
    this.breadcrumbService.clearOverride();
    this.close.emit();
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    this.save.emit({
      name:        (val.name        as string).trim(),
      code:        (val.code        as string || '').trim().toUpperCase(),
      description: (val.description as string || '').trim(),
      status:      'ACTIVE',
    });
    this.onClose();
  }
}
