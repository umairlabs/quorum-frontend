import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { environment } from '../../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class FcmService {
    private messaging: Messaging | null = null;

    constructor(private http: HttpClient) { }

    async initFirebase(): Promise<void> {
        try {
            const app = initializeApp(environment.firebaseConfig);
            this.messaging = getMessaging(app);

            // Listen for messages while the app is open (foreground)
            onMessage(this.messaging, (payload: any) => {
                console.log('Foreground push received:', payload);
                // Yahan aap toast/snackbar dikha sakte hain
                if (payload.notification) {
                    alert(`${payload.notification.title}\n${payload.notification.body}`);
                }
            });

            await this.requestPermissionAndGetToken();
        } catch (error) {
            console.error('Firebase init error:', error);
        }
    }

    private async requestPermissionAndGetToken(): Promise<void> {
        if (!this.messaging) return;

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn('Notification permission not granted.');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            await navigator.serviceWorker.ready;

            const token = await getToken(this.messaging, {
                vapidKey: environment.vapidKey,
                serviceWorkerRegistration: registration
            });

            if (token) {
                console.log('🔥 MY FCM TOKEN:', token);
                this.registerTokenWithBackend(token);
            }
        } catch (error) {
            console.error('Error getting FCM token:', error);
        }
    } 

    private registerTokenWithBackend(token: string): void {
        this.http.post(`${environment.apiUrl}/notifications/register-device/`, { token })
            .subscribe({
                next: () => console.log('FCM token registered with backend.'),
                error: (err) => console.error('Failed to register FCM token:', err)
            });
    }
}