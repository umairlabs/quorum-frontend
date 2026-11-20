# Quorum Frontend

A modern Angular/Ionic web application for comprehensive enterprise asset management with real-time notifications, AI-powered insights, and responsive design.

## 🎨 Features

### Asset Management Dashboard
- **Asset Inventory**: View all assets with advanced filtering and search
- **Asset Details**: Comprehensive asset information including depreciation and assignment history
- **Asset Creation**: Add new assets with automatic category and unit detection
- **Asset Editing**: Update asset information and metadata
- **Asset Assignment**: Assign assets to employees with tracking
- **Serial Number Tracking**: Monitor individual asset units with barcode support

### Financial Management
- **Purchase Tracking**: View all purchases with payment status
- **Supplier Management**: Track supplier information and payment history
- **Payment Recording**: Record multiple payment methods (bank transfer, cheque, mobile wallet)
- **Invoice Viewing**: Download and review purchase invoices
- **Multi-Currency Support**: Real-time currency conversion

### Maintenance Operations
- **Maintenance Requests**: Create and track maintenance tickets
- **Request Management**: Approve/reject maintenance requests
- **Technician Assignment**: Assign maintenance work to technicians
- **Work Updates**: Real-time status updates from technicians
- **Issue Descriptions**: AI-generated maintenance descriptions

### AI Assistant
- **Smart Insights**: AI-powered asset and maintenance recommendations
- **Voice Mode**: Hands-free voice commands for asset requests
- **Natural Language**: Describe issues in plain English
- **Action Cards**: Quick-action suggestions for common tasks

### User Management
- **Employee Directory**: View all employees with roles and departments
- **Permission Management**: View and configure user permissions
- **Department Organization**: Organize users by departments
- **Profile Management**: Update personal and employee information

### Notifications
- **Push Notifications**: Real-time alerts for important events
- **Notification Preferences**: Configure notification settings
- **Notification Types**: Maintenance alerts, purchase updates, assignments
- **Notification Center**: Centralized notification history

### Reporting & Analytics
- **Dashboard Analytics**: Key metrics and statistics
- **Depreciation Schedules**: Asset depreciation tracking
- **Activity Audit Logs**: Complete audit trail of system activities
- **Export Reports**: Generate and download reports

## 🛠️ Tech Stack

- **Angular 18+**: Modern TypeScript framework
- **Ionic**: Cross-platform mobile/web UI components
- **TypeScript**: Strongly-typed JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **RxJS**: Reactive programming
- **Firebase**: Push notifications and messaging
- **Angular HTTP Client**: API communication

## 📋 Requirements

- Node.js 18+ LTS
- npm 10+ or yarn 4+
- Modern web browser (Chrome, Firefox, Safari, Edge)

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/umairlabs/quorum-frontend.git
cd quorum-frontend
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

**Required environment variables:**
```
NG_APP_API_URL=http://localhost:8000/api
NG_APP_FIREBASE_API_KEY=your-firebase-api-key
NG_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NG_APP_FIREBASE_PROJECT_ID=your-project-id
NG_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NG_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NG_APP_FIREBASE_APP_ID=your-app-id
NG_APP_FIREBASE_MEASUREMENT_ID=your-measurement-id
NG_APP_FIREBASE_VAPID_KEY=your-vapid-key
```

## 🚀 Running the Application

### Development Server
```bash
npm start
# or
ng serve
```

The application will be available at `http://localhost:4200`

### Production Build
```bash
npm run build
# or
ng build --configuration production
```

Built files will be in the `dist/` directory

### Development with Hot Reload
```bash
ng serve --poll 2000
```

## 📁 Project Structure

```
src/
├── app/
│   ├── core/                 # Core services and utilities
│   │   ├── services/         # HTTP services and API calls
│   │   ├── guards/           # Route guards (auth, role-based)
│   │   ├── interceptors/     # HTTP interceptors (auth, camel-case)
│   │   ├── interfaces/       # TypeScript interfaces
│   │   └── components/       # Reusable core components
│   ├── layouts/              # Application layouts
│   │   ├── main-layout/      # Main app layout
│   │   ├── auth-layout/      # Auth pages layout
│   │   └── components/       # Layout sub-components
│   ├── pages/                # Feature pages/modules
│   │   ├── auth/             # Authentication (login)
│   │   ├── dashboard/        # Dashboard page
│   │   ├── assets/           # Asset management
│   │   ├── assignments/      # Asset assignments
│   │   ├── maintenance/      # Maintenance requests
│   │   ├── purchases/        # Purchase management
│   │   ├── users/            # User management
│   │   ├── notifications/    # Notifications
│   │   ├── audit-logs/       # Audit trail
│   │   ├── depreciation/     # Depreciation schedules
│   │   ├── settings/         # Settings and configuration
│   │   └── ai-assistant/     # AI assistant
│   └── app.routes.ts         # Main routing configuration
├── environments/             # Environment configurations
├── assets/                   # Static assets (images, icons, sounds)
├── styles/                   # Global styles
└── main.ts                   # Application entry point
```

## 🔑 Key Components

### Services
- **AuthService**: Authentication and JWT token management
- **AssetService**: Asset CRUD operations and state
- **UserService**: User management and profiles
- **PurchaseService**: Purchase tracking and payments
- **MaintenanceService**: Maintenance request management
- **NotificationService**: Push notification handling
- **DepartmentService**: Department management
- **CategoryService**: Asset category management

### Core Components
- **DataTable**: Reusable data table with sorting/filtering
- **Modal**: Reusable modal component
- **Toast**: Toast notifications
- **StatusBadge**: Status display component
- **LineChart**: Chart visualization
- **EmptyState**: Empty state placeholder

### Pages
- **Dashboard**: Key metrics and activity feed
- **Asset Management**: Inventory and assignment
- **Maintenance Tracking**: Request management
- **Purchase Management**: Financial tracking
- **User Management**: Employee directory
- **Settings**: Configuration and preferences

## 🔐 Security

- JWT token-based authentication
- Secure token storage (no localStorage for sensitive data)
- Role-based route guards
- CORS configured for backend
- Environment variables for all secrets (no hardcoded credentials)
- Firebase credentials injected at runtime
- XSS protection via Angular sanitization
- CSRF protection with HTTP-only cookies

**Important**: Configure environment variables before deployment:
1. Set correct API URL for your environment
2. Use production Firebase credentials
3. Disable debug logging in production
4. Enable HTTPS only
5. Set proper CORS origin

See `SECURITY_FIX_COMPLETION_REPORT.md` for security details.

## 🧪 Testing

### Unit Tests
```bash
npm run test
# or
ng test
```

### E2E Tests
```bash
npm run e2e
# or
ng e2e
```

### Coverage Report
```bash
ng test --code-coverage
```

## 🚀 Deployment

### Deploy to Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

### Deploy to Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Deploy to GitHub Pages
```bash
npm run build -- --base-href=/quorum-frontend/
# Push dist/ to gh-pages branch
```

### Docker Deployment
```bash
docker build -t quorum-frontend .
docker run -p 80:80 quorum-frontend
```

### Environment-Specific Deployment
- **Development**: `ng serve` with local .env
- **Staging**: `ng build --configuration staging` with staging credentials
- **Production**: `ng build --configuration production` with production credentials

## 📚 API Integration

All API calls go through the `BaseApiCallService`:

```typescript
// Example: Get assets
this.assetService.getAllAssets().subscribe(
  (assets) => console.log(assets),
  (error) => console.error(error)
);

// Example: Create asset
this.assetService.createAsset(assetData).subscribe(
  (asset) => console.log('Created:', asset),
  (error) => console.error(error)
);
```

### Interceptors
- **Auth Interceptor**: Automatically adds JWT token to requests
- **Camel-Case Interceptor**: Converts snake_case API responses to camelCase

## 🎯 Authentication Flow

1. User submits login credentials
2. Backend returns JWT token
3. Token stored in memory (not localStorage)
4. Token automatically added to API requests
5. Routes protected by auth guard
6. Unauthorized access redirects to login

## 🔄 State Management

The application uses Angular services with RxJS Observables for state management:

```typescript
// Example: Subscribe to asset updates
this.assetService.assets$.subscribe(
  (assets) => this.displayAssets(assets)
);

// Example: Update state
this.assetService.updateAsset(id, data).subscribe(
  () => this.assetService.refreshAssets()
);
```

## 📱 Responsive Design

- Mobile-first design approach
- Tailwind CSS responsive breakpoints
- Ionic components for mobile UI
- Adaptive layouts for all screen sizes
- Touch-friendly interactions

## 🌐 Internationalization (i18n)

The application is ready for internationalization:
- Service for language switching
- Translated strings in component templates
- Locale-specific formatting (dates, currency)

## 🆘 Troubleshooting

### API Connection Issues
- Verify `NG_APP_API_URL` is correct
- Check backend is running
- Verify CORS is enabled
- Check browser console for errors

### Firebase Notifications Not Working
- Verify Firebase credentials in .env
- Check VAPID key is correct
- Enable push notifications in browser
- Check browser console for Firebase errors

### Build Issues
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Angular cache: `ng cache clean`
- Update Angular CLI: `npm install -g @angular/cli@latest`

### Permission/Access Errors
- Verify JWT token is valid
- Check user role has required permissions
- Verify backend permission configuration
- Check CORS settings

## 🔍 Performance Optimization

- Lazy loading of feature modules
- OnPush change detection strategy
- Virtual scrolling for large lists
- Code splitting by route
- Minification and bundling

## 📊 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📝 Environment Variables Reference

See `.env.example` for complete list. All variables use `NG_APP_` prefix for Angular.

| Variable | Description | Required |
|----------|-------------|----------|
| `NG_APP_API_URL` | Backend API base URL | Yes |
| `NG_APP_FIREBASE_API_KEY` | Firebase API key | Yes |
| `NG_APP_FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `NG_APP_FIREBASE_VAPID_KEY` | FCM VAPID key for push | Yes |

## 🆘 Getting Help

### Documentation
- [Security Fix Report](./SECURITY_FIX_COMPLETION_REPORT.md)
- [Security Audit Report](./SECURITY_AUDIT_REPORT.md)
- [Angular Documentation](https://angular.io/docs)
- [Ionic Documentation](https://ionicframework.com/docs)

### Issues
Create an issue on GitHub with:
- Description of the problem
- Steps to reproduce
- Browser and OS
- Console errors

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Test thoroughly
4. Create a pull request with description

## 📄 License

This project is proprietary software. All rights reserved.

## 👨‍💻 Author

Umair Zafar - [GitHub](https://github.com/umairlabs)

## 📧 Support

For issues, questions, or feedback, please create an issue on GitHub.

---

**Version**: 1.0.0  
**Last Updated**: November 2026  
**Status**: Ready for Production
