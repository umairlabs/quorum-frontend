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
import { AssetCategory } from '../../interfaces/asset-category.interface';

export interface CategoryFormValue {
  name: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
}

@Component({
  selector: 'app-category-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormSectionComponent],
  templateUrl: './category-modal.component.html'
})
export class CategoryModalComponent implements OnChanges, OnDestroy {
  private readonly fb: FormBuilder = inject(FormBuilder);
  private readonly breadcrumbService: BreadcrumbService = inject(BreadcrumbService);

  public readonly isOpen: InputSignal<boolean> = input<boolean>(false);
  public readonly category: InputSignal<AssetCategory | null> = input<AssetCategory | null>(null);
  public readonly title: InputSignal<string> = input<string>('Add Category');

  public readonly close: OutputEmitterRef<void> = output<void>();
  public readonly save: OutputEmitterRef<CategoryFormValue> = output<CategoryFormValue>();

  protected readonly form: FormGroup = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^(?!\s*$).+/)]],
    description: [''],
  });

  constructor() {
    effect(() => {
      const cat = this.category();
      if (cat) {
        this.form.patchValue({
          name:        cat.name        || '',
          description: cat.description || '',
        });
      } else {
        this.form.reset({ name: '', description: '' });
      }
    });
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (changes['isOpen'].currentValue === true) {
        const isEdit = !!this.category();
        this.breadcrumbService.setOverride({
          showBackArrow: false,
          items: [
            { label: 'AssetFlow' },
            { label: 'Settings', action: () => this.onClose() },
            { label: isEdit ? 'Edit Category' : 'Add Category', isLast: true },
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
    this.form.reset({ name: '', description: '' });
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
      description: (val.description as string || '').trim(),
      status:      'ACTIVE',
    });
    this.onClose();
  }
}
