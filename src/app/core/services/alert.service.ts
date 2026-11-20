import { inject, Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private alertController = inject(AlertController);

  public async presentAlert(header: string, message: string, buttons: string[] = ['OK']) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons
    });
    await alert.present();
  }
}
