import { Component, input, InputSignal } from '@angular/core';
import { MaintenanceStats } from '../../../../core/interfaces/maintenance.interface';

@Component({
  selector: 'app-maintenance-stats',
  standalone: true,
  imports: [],
  templateUrl: './maintenance-stats.component.html'
})
export class MaintenanceStatsComponent {
  public readonly stats: InputSignal<MaintenanceStats> = input<MaintenanceStats>({
    total: 0, pending: 0, inProgress: 0, completed: 0
  });
}
