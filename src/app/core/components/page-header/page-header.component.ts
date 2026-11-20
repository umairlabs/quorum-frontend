import { Location } from '@angular/common';
import { Component, input, output, inject, InputSignal, OutputEmitterRef } from '@angular/core';
import { Router } from '@angular/router';
import { BreadcrumbService } from '../../services/breadcrumb.service';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [],
  templateUrl: './page-header.component.html',
  host: {
    '[attr.title]': 'null'
  }
})
export class PageHeaderComponent {
  private readonly location = inject(Location);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly router = inject(Router);

  public readonly title: InputSignal<string> = input<string>('');
  public readonly subtitle: InputSignal<string> = input<string>('');
  public readonly actionLabel: InputSignal<string> = input<string>('');
  public readonly actionIcon: InputSignal<string> = input<string>('add');
  public readonly showBack: InputSignal<boolean> = input<boolean>(true);
  public readonly actionClick: OutputEmitterRef<void> = output<void>();

  protected onActionClick(): void {
    this.actionClick.emit();
  }

  protected goBack(): void {
    const backUrl = this.breadcrumbService.breadcrumbs().backUrl;
    if (backUrl) {
      this.router.navigate([backUrl]);
    } else {
      this.location.back();
    }
  }
}
