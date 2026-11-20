importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: (typeof self !== 'undefined' && self.env) ? self.env.NG_APP_FIREBASE_API_KEY : "",
    authDomain: (typeof self !== 'undefined' && self.env) ? self.env.NG_APP_FIREBASE_AUTH_DOMAIN : "",
    projectId: (typeof self !== 'undefined' && self.env) ? self.env.NG_APP_FIREBASE_PROJECT_ID : "",
    storageBucket: (typeof self !== 'undefined' && self.env) ? self.env.NG_APP_FIREBASE_STORAGE_BUCKET : "",
    messagingSenderId: (typeof self !== 'undefined' && self.env) ? self.env.NG_APP_FIREBASE_MESSAGING_SENDER_ID : "",
    appId: (typeof self !== 'undefined' && self.env) ? self.env.NG_APP_FIREBASE_APP_ID : ""
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('Background push received:', payload);

    const notificationTitle = payload.notification?.title || 'New Notification';
    const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/assets/icons/notification-icon.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});