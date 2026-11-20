import { Component, input, output, InputSignal, OutputEmitterRef, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Supplier } from '../../interfaces/supplier.interface';
import { PurchaseService } from '../../../pages/assets/services/purchase.service';

@Component({
  selector: 'app-supplier-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supplier-detail-modal.component.html'
})
export class SupplierDetailModalComponent {
  private readonly purchaseService = inject(PurchaseService);

  public readonly isOpen: InputSignal<boolean> = input<boolean>(false);
  public readonly supplier: InputSignal<Supplier | null> = input<Supplier | null>(null);
  public readonly supplierName: InputSignal<string | null> = input<string | null>(null);
  public readonly close: OutputEmitterRef<void> = output<void>();

  protected readonly resolvedSupplier = computed<Supplier | null>(() => {
    const s = this.supplier();
    if (s) return s;
    const name = this.supplierName();
    if (!name) return null;
    return this.purchaseService.suppliers().find(sup => 
      sup.company.toLowerCase() === name.toLowerCase() || sup.id === name || sup.name.toLowerCase() === name.toLowerCase()
    ) || {
      id: 'sup-gen',
      company: name,
      name: 'Primary Contact',
      status: 'ACTIVE',
      createdAt: '',
      updatedAt: ''
    };
  });

  protected onClose(): void {
    this.close.emit();
  }

  protected get specList(): { key: string; value: string }[] {
    const specs = this.resolvedSupplier()?.specifications;
    if (!specs) return [];
    return Object.entries(specs).map(([key, value]) => ({ key, value }));
  }
}
