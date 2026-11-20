declare module 'firebase/app' {
    export interface FirebaseOptions {
        apiKey?: string;
        authDomain?: string;
        databaseURL?: string;
        projectId?: string;
        storageBucket?: string;
        messagingSenderId?: string;
        appId?: string;
        measurementId?: string;
        [key: string]: any;
    }

    export interface FirebaseApp {
        name: string;
        options: FirebaseOptions;
        automaticDataCollectionEnabled: boolean;
        [key: string]: any;
    }

    export function initializeApp(options: FirebaseOptions, name?: string): FirebaseApp;
    export function initializeApp(options?: FirebaseOptions): FirebaseApp;
    export function getApp(name?: string): FirebaseApp;
    export function getApps(): FirebaseApp[];
    export function deleteApp(app: FirebaseApp): Promise<void>;
}

declare module 'firebase/messaging' {
    export interface Messaging {
        app: any;
        [key: string]: any;
    }

    export interface NotificationPayload {
        title?: string;
        body?: string;
        image?: string;
        icon?: string;
        [key: string]: any;
    }

    export interface MessagePayload {
        collapseKey?: string;
        from?: string;
        notification?: NotificationPayload;
        data?: { [key: string]: string };
        fcmOptions?: {
            link?: string;
            analyticsLabel?: string;
        };
        [key: string]: any;
    }

    export interface GetTokenOptions {
        vapidKey?: string;
        serviceWorkerRegistration?: any;
    }

    export function getMessaging(app?: any): Messaging;
    export function getToken(messaging: Messaging, options?: GetTokenOptions): Promise<string>;
    export function onMessage(messaging: Messaging, nextOrObserver: (payload: any) => any): () => void;
    export function deleteToken(messaging: Messaging): Promise<boolean>;
}
