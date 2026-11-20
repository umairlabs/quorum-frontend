import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilityService {
  public isMobileView: WritableSignal<boolean> = signal<boolean>(false);
}
