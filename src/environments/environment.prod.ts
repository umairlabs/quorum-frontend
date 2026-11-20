export const environment = {
  production: true,
  apiUrl: (window as any)['env']?.['NG_APP_API_URL'] || 'https://api.example.com/api',

  firebaseConfig: {
    apiKey: (window as any)['env']?.['NG_APP_FIREBASE_API_KEY'] || '',
    authDomain: (window as any)['env']?.['NG_APP_FIREBASE_AUTH_DOMAIN'] || '',
    projectId: (window as any)['env']?.['NG_APP_FIREBASE_PROJECT_ID'] || '',
    storageBucket: (window as any)['env']?.['NG_APP_FIREBASE_STORAGE_BUCKET'] || '',
    messagingSenderId: (window as any)['env']?.['NG_APP_FIREBASE_MESSAGING_SENDER_ID'] || '',
    appId: (window as any)['env']?.['NG_APP_FIREBASE_APP_ID'] || '',
    measurementId: (window as any)['env']?.['NG_APP_FIREBASE_MEASUREMENT_ID'] || ''
  },
  vapidKey: (window as any)['env']?.['NG_APP_FIREBASE_VAPID_KEY'] || ''
};