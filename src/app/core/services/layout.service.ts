import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  public readonly isMobileMenuOpen = signal(false);
  public readonly navItemClicked$ = new Subject<string>();

  public toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
  }

  public closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  public notifyNavItemClick(route: string): void {
    this.navItemClicked$.next(route);
  }
}