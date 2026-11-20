importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBN9Zf3Fg5CXBBoAsWNfRcsNDPO24JpH3k",
    authDomain: "asset-flow-a9f4a.firebaseapp.com",
    projectId: "asset-flow-a9f4a",
    storageBucket: "asset-flow-a9f4a.firebasestorage.app",
    messagingSenderId: "460237501964",
    appId: "1:460237501964:web:6429fc76a39279365d2029"
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