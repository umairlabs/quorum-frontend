import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AssetService } from '../../services/asset.service';
import { Asset, InventoryGroup } from '../../../../core/interfaces/asset.interface';
import { AssetCategory } from '../../../../core/interfaces/asset-category.interface';
import { StatusBadgeComponent } from '../../../../core/components/status-badge/status-badge.component';
import { PageHeaderComponent } from '../../../../core/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../../core/components/empty-state/empty-state.component';
import { getCategoryIcon } from '../../../../core/utils/asset-icon.util';

@Component({
  selector: 'app-inventory-asset-detail',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './inventory-asset-detail.component.html',
})
export class InventoryAssetDetailComponent implements OnInit {
  private readonly route        = inject(ActivatedRoute);
  private readonly router       = inject(Router);
  private readonly assetService = inject(AssetService);
  private readonly sanitizer    = inject(DomSanitizer);

  protected readonly group: WritableSignal<InventoryGroup | null> = signal<InventoryGroup | null>(null);
  protected readonly units: WritableSignal<Asset[]>               = signal<Asset[]>([]);

  // ─── PDF Viewer Modal State ────────────────────────────────────────────────
  protected readonly pdfBlobUrl: WritableSignal<string | null> = signal<string | null>(null);
  protected readonly pdfFileName: WritableSignal<string> = signal<string>('Inventory_Asset_Details.pdf');
  protected readonly pdfViewerTitle: WritableSignal<string> = signal<string>('Inventory Product Catalogue Report');

  public ngOnInit(): void {
    this.assetService.loadAssetsFromApi();
    const id = decodeURIComponent(this.route.snapshot.paramMap.get('groupId') ?? '');
    this.resolveGroup(id);
  }

  // ─── Resolve group from all inventory assets ──────────────────────────────
  // Rebuilds the group map independent of selectedView so the detail page
  // works when navigated to directly (not from the inventory list).
  private resolveGroup(groupId: string): void {
    const allAssets     = this.assetService.assets();
    const inventoryOnly = allAssets.filter(a => !(a.purchaseId || a.purchaseNumber));

    const groups = new Map<string, InventoryGroup>();
    inventoryOnly.forEach(asset => {
      const key = `${asset.name}-${asset.brand ?? ''}-${asset.model ?? ''}`;
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          name: asset.name,
          category: asset.category,
          brand: asset.brand,
          model: asset.model,
          unitCost: asset.purchaseCost || 0,
          totalStock: 0,
          availableStock: 0,
          assignedStock: 0,
          maintenanceStock: 0,
          assetIds: [],
        });
      }
      const g = groups.get(key)!;
      g.totalStock++;
      g.assetIds.push(asset.id);
      if (asset.status === 'AVAILABLE')    g.availableStock++;
      else if (asset.status === 'ASSIGNED')    g.assignedStock++;
      else if (asset.status === 'MAINTENANCE') g.maintenanceStock++;
    });

    const found = groups.get(groupId) ?? null;
    this.group.set(found);

    if (found) {
      this.units.set(allAssets.filter(a => found.assetIds.includes(a.id)));
    } else {
      this.router.navigate(['/assets']);
    }
  }

  // ─── Actions ──────────────────────────────────────────────────────────────
  protected onExportPdf(): void {
    const g = this.group();
    if (!g) return;

    if (this.pdfBlobUrl()) {
      URL.revokeObjectURL(this.pdfBlobUrl()!);
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Inventory Product - ${g.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1c1e; background: #f8fafc; padding: 32px 20px; }
    .card { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; max-width: 800px; margin: 0 auto; padding: 36px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 20px; margin-bottom: 24px; }
    .header-title { font-size: 22px; font-weight: 700; color: #0f172a; }
    .header-sub { font-size: 13px; color: #64748b; margin-top: 4px; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: #e0f2fe; color: #0369a1; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 14px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .field-label { font-size: 12px; color: #64748b; margin-bottom: 2px; }
    .field-value { font-size: 14px; font-weight: 600; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; font-weight: 600; color: #475569; }
    .footer { margin-top: 36px; padding-top: 18px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div class="header-title">${g.name}</div>
        <div class="header-sub">Category: <strong>${this.getCategoryName(g.category)}</strong></div>
      </div>
      <div style="text-align: right;">
        <span class="badge">${g.totalStock} UNITS TOTAL</span>
        <div class="header-sub" style="margin-top: 8px;">Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Product Specification</div>
      <div class="grid">
        <div>
          <div class="field-label">Category</div>
          <div class="field-value">${this.getCategoryName(g.category)}</div>
        </div>
        <div>
          <div class="field-label">Brand</div>
          <div class="field-value">${g.brand || '—'}</div>
        </div>
        <div>
          <div class="field-label">Model</div>
          <div class="field-value">${g.model || '—'}</div>
        </div>
        <div>
          <div class="field-label">Total Stock</div>
          <div class="field-value">${g.totalStock}</div>
        </div>
      </div>
    </div>

    ${this.units() && this.units().length > 0 ? `
    <div class="section">
      <div class="section-title">Physical Stock Units (${this.units().length})</div>
      <table>
        <thead>
          <tr>
            <th>Serial Number</th>
            <th>PO Number</th>
            <th>Purchase Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${this.units().map(u => `
            <tr>
              <td style="font-family: monospace; font-weight: 600; color: #0284c7;">${u.serialNumber || '—'}</td>
              <td>${u.purchaseNumber || '—'}</td>
              <td>${u.purchaseDate ? new Date(u.purchaseDate).toLocaleDateString() : '—'}</td>
              <td>${u.status || 'AVAILABLE'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="footer">
      <div>AssetFlow Enterprise Asset Management</div>
      <div>Confidential Product Report</div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    this.pdfBlobUrl.set(url);
    this.pdfFileName.set(`${g.name.replace(/\s+/g, '_')}_Inventory_Report.html`);
    this.pdfViewerTitle.set(`Product Report - ${g.name}`);
  }

  protected pdfBlobUrlSafe(): SafeResourceUrl | null {
    const url = this.pdfBlobUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  }

  protected closePdfViewer(): void {
    const url = this.pdfBlobUrl();
    if (url) URL.revokeObjectURL(url);
    this.pdfBlobUrl.set(null);
  }

  protected onEdit(): void {
    const firstId = this.group()?.assetIds?.[0];
    if (firstId) this.router.navigate(['/assets', firstId, 'edit']);
  }

  protected onPurchaseUnits(): void {
    const g = this.group();
    if (!g) return;
    this.router.navigate(['/assets/purchases/create'], {
      queryParams: {
        assetId:   g.assetIds?.[0],
        assetName: g.name,
        brand:     g.brand || '',
        model:     g.model || '',
      },
    });
  }

  protected onBack(): void {
    this.router.navigate(['/assets']);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  protected getCategoryIcon(category: AssetCategory | string | undefined): string {
    return getCategoryIcon(category);
  }

  protected getCategoryName(category: AssetCategory | string | undefined): string {
    if (!category) return 'Uncategorized';
    if (typeof category === 'string') return category;
    return (category as AssetCategory).name || 'Uncategorized';
  }
  protected get groupColor(): string {
    const list = this.units();
    return list.length > 0 ? (list[0].color || '') : '';
  }

}