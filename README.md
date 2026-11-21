# Quorum Frontend - Asset Management UI

The responsive web and mobile client for Quorum, an enterprise asset management system. Built with Angular and Ionic, this frontend provides an intuitive interface for tracking assets, managing assignments, handling maintenance workflows, and monitoring real-time notifications.

![Angular](https://img.shields.io/badge/Angular-20.3.25-DD0031?style=flat-square&logo=angular)
![Ionic](https://img.shields.io/badge/Ionic-8.0.0-3880FF?style=flat-square&logo=ionic)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.0-3178C6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4.17-06B6D4?style=flat-square&logo=tailwind-css)
![Capacitor](https://img.shields.io/badge/Capacitor-8.4.2-57C2FF?style=flat-square&logo=capacitor)


## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Components & Services](#components--services)
- [State Management](#state-management)
- [Mobile Development](#mobile-development)
- [Styling & Design](#styling--design)
- [Environment Configuration](#environment-configuration)
- [Building for Production](#building-for-production)
- [Testing](#testing)
- [Contributing](#contributing)

## Features

### 🎨 Modern UI/UX
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Tailwind CSS**: Modern utility-first styling framework
- **Ionic Components**: Pre-built mobile-optimized UI components
- **Dark Mode Support**: Optional dark theme for better visibility
- **Intuitive Navigation**: Clear menu structure with breadcrumbs

### 📊 Asset Management Dashboard
- **Dashboard Overview**: At-a-glance metrics and statistics
- **Asset Listing**: Browse all assets with filtering and sorting
- **Asset Details**: Comprehensive asset information with history
- **Asset Search**: Quick search by name, category, serial number
- **Bulk Operations**: Manage multiple assets efficiently
- **Asset Icons**: Auto-generated icons based on asset type

### 👥 Asset Assignment Management
- **Assignment Interface**: Assign assets to employees
- **Assignment History**: View complete assignment timeline
- **Return Management**: Track asset returns with condition notes
- **Expected Return Dates**: Visual timeline for upcoming returns
- **Receipt Confirmation**: Confirm asset receipt with condition tracking
- **Department Tracking**: Organize by employee departments

### 🔧 Maintenance Workflow
- **Create Requests**: Submit maintenance requests for assets
- **Request Management**: View and manage all maintenance tickets
- **Status Tracking**: Real-time status updates with visual indicators
- **Priority Management**: Filter by priority levels (Low, Medium, High, Critical)
- **Technician Assignment**: Assign technicians to maintenance tasks
- **Work Tracking**: Document work done and resolution notes
- **Timeline View**: Complete maintenance history and timeline

### 💰 Financial Management
- **Asset Valuation**: View current asset values and depreciation
- **Depreciation Tracking**: Monitor asset depreciation over time
- **Warranty Status**: Track warranty status with expiration alerts
- **Financial Reports**: Generate reports for accounting and budgeting
- **Asset Cost Analysis**: View purchase costs and current valuations

### 🔔 Real-time Notifications
- **Push Notifications**: Receive alerts on important events (mobile)
- **In-App Notifications**: Notification center with unread count
- **Notification Preferences**: Customize notification types
- **Notification History**: Access past notifications
- **Status Badges**: Real-time status indicators
- **Maintenance Alerts**: Get notified of maintenance updates

### 🤖 AI Assistance
- **Smart Suggestions**: AI-powered recommendations
- **Intelligent Search**: Enhanced search with natural language
- **Asset Classification**: AI-assisted asset categorization
- **Issue Description**: AI-generated maintenance descriptions

### 👤 User Management
- **Profile Management**: Update user profile information
- **Password Management**: Change password securely
- **Role-Based Access**: See features based on your role
- **User Preferences**: Customize application settings
- **Department Assignment**: Track user department affiliation

### 🔐 Security & Authentication
- **JWT Authentication**: Secure token-based login
- **Auto-Logout**: Automatic logout on inactivity
- **Secure Storage**: Encrypted token storage
- **Permission-Based UI**: UI adapts to user permissions
- **Password Reset**: Secure password recovery flow

## Tech Stack

### Frontend Framework
- **Angular**: 20.3.25 - Modern web framework
- **Angular CLI**: 20.3.28 - Build and development tool
- **TypeScript**: 5.9.0 - Type-safe JavaScript

### Mobile Framework
- **Ionic**: 8.0.0 - Mobile UI framework
- **Capacitor**: 8.4.2 - Cross-platform mobile runtime
- **iOS/Android Support**: Native app capabilities

### Styling
- **Tailwind CSS**: 3.4.17 - Utility-first CSS framework
- **Sass/SCSS**: Component-level styling

### State Management & Async
- **RxJS**: 7.8.0 - Reactive programming library
- **Angular Services**: Centralized data management
- **HTTP Client**: RESTful API communication

### Testing
- **Karma**: Test runner
- **Jasmine**: Testing framework
- **Cypress**: E2E testing (optional)

### Build & Development
- **Webpack**: Module bundler (via Angular CLI)
- **PostCSS**: CSS processing with Tailwind
- **ESLint**: Code quality and style checking

### Real-time Features
- **Firebase SDK**: 11.4.0 - Cloud messaging and notifications
- **Firebase Messaging**: Push notification support

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js**: 18.x or higher (LTS recommended)
- **npm**: 10.x or higher (comes with Node.js)
- **Git**: For version control
- **Angular CLI**: Install globally with `npm install -g @angular/cli`
- **(Optional) Ionic CLI**: `npm install -g @ionic/cli`

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/umairlabs/quorum.git
cd quorum/quorum-frontend
```

2. **Install dependencies**:
```bash
npm install
```

### Configuration

1. **Copy the environment template**:
```bash
cp .env.example .env
```

2. **Configure your `.env` file**:
```bash
# API Configuration
NG_APP_API_URL=http://localhost:8000/api
NG_APP_WS_URL=ws://localhost:8000

# Firebase Configuration (for push notifications)
NG_APP_FIREBASE_API_KEY=your-firebase-api-key
NG_APP_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
NG_APP_FIREBASE_PROJECT_ID=your-firebase-project-id
NG_APP_FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
NG_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NG_APP_FIREBASE_APP_ID=your-firebase-app-id

# Application Settings
NG_APP_APP_NAME=Quorum
NG_APP_APP_VERSION=1.0.0
```

3. **Update environment files** if needed:
   - `src/environments/environment.ts` - Development
   - `src/environments/environment.prod.ts` - Production

### Running the Application

**Development Server**:
```bash
npm start
# or
ng serve
```

The application will be available at `http://localhost:4200`

**With Live Reload**:
```bash
ng serve --watch
```

**Specify Port**:
```bash
ng serve --port 4300
```

## Project Structure

```
quorum-frontend/
├── src/
│   ├── app/
│   │   ├── pages/                    # Page components
│   │   │   ├── login/               # Authentication pages
│   │   │   ├── dashboard/           # Dashboard overview
│   │   │   ├── assets/              # Asset management pages
│   │   │   ├── assignments/         # Asset assignment pages
│   │   │   ├── maintenance/         # Maintenance workflow pages
│   │   │   ├── users/               # User management pages
│   │   │   └── settings/            # User settings
│   │   ├── components/               # Reusable components
│   │   │   ├── header/              # Navigation header
│   │   │   ├── sidebar/             # Navigation sidebar
│   │   │   ├── asset-card/          # Asset display card
│   │   │   ├── status-badge/        # Status indicator
│   │   │   └── notifications/       # Notification components
│   │   ├── services/                 # API and business logic
│   │   │   ├── api/                 # API client services
│   │   │   ├── auth/                # Authentication service
│   │   │   ├── asset/               # Asset service
│   │   │   ├── maintenance/         # Maintenance service
│   │   │   └── notification/        # Notification service
│   │   ├── models/                   # TypeScript interfaces
│   │   │   ├── asset.model.ts       # Asset interfaces
│   │   │   ├── user.model.ts        # User interfaces
│   │   │   ├── maintenance.model.ts # Maintenance interfaces
│   │   │   └── notification.model.ts # Notification interfaces
│   │   ├── guards/                   # Route guards
│   │   │   ├── auth.guard.ts        # Authentication guard
│   │   │   └── permission.guard.ts  # Permission-based guard
│   │   ├── interceptors/             # HTTP interceptors
│   │   │   ├── auth.interceptor.ts  # Token injection
│   │   │   └── error.interceptor.ts # Error handling
│   │   ├── app.component.ts         # Root component
│   │   └── app.routes.ts            # Route definitions
│   ├── assets/
│   │   ├── icons/                   # App icons and images
│   │   ├── images/                  # UI images
│   │   └── styles/                  # Global styles
│   ├── environments/                 # Environment configurations
│   │   ├── environment.ts           # Development env
│   │   └── environment.prod.ts      # Production env
│   ├── index.html                    # HTML entry point
│   ├── main.ts                       # Application bootstrap
│   ├── polyfills.ts                  # Browser polyfills
│   ├── styles.scss                   # Global styles
│   └── global.scss                   # Ionic global styles
├── www/                              # Built application output
├── angular.json                      # Angular CLI configuration
├── tsconfig.json                     # TypeScript configuration
├── karma.conf.js                     # Test runner configuration
├── capacitor.config.ts               # Capacitor mobile config
├── ionic.config.json                 # Ionic configuration
├── tailwind.config.js                # Tailwind CSS configuration
├── package.json                      # Dependencies and scripts
├── .eslintrc.json                    # ESLint configuration
├── .env.example                      # Environment template
└── README.md                         # This file
```

## Key Features

### 1. Asset Management
View, create, update, and delete assets. Track asset details including:
- Asset name, category, and specifications
- Serial numbers and SKUs
- Purchase date and cost
- Current value and depreciation
- Warranty status
- Asset icon (auto-detected)
- Assignment status

### 2. Asset Assignment Workflow
Manage complete asset lifecycle:
1. **Create Assignment**: Select asset and employee
2. **Set Expectations**: Define expected return date
3. **Track Status**: Monitor assignment status
4. **Return Asset**: Confirm return with condition notes
5. **View History**: Complete audit trail

### 3. Maintenance Management
Handle maintenance requests:
1. **Create Request**: Submit maintenance ticket with details
2. **Assign Technician**: Route to appropriate technician
3. **Track Progress**: Real-time status updates
4. **Document Work**: Add notes and completion details
5. **Close Ticket**: Mark as resolved and verified

### 4. Dashboard & Analytics
Get insights at a glance:
- Total assets and asset units
- Available vs. assigned assets
- Maintenance request statistics
- Asset value tracking
- Department breakdowns
- Upcoming returns

### 5. Real-time Notifications
Stay informed with:
- New maintenance requests
- Assignment updates
- Warranty expiration alerts
- Maintenance status changes
- High-priority alerts
- System announcements

## Components & Services

### Core Services

**AuthService**
```typescript
// Authentication and JWT token management
login(email, password)
logout()
refreshToken()
getCurrentUser()
hasPermission(permission)
```

**AssetService**
```typescript
// Asset CRUD and management
getAssets(filters?)
getAsset(id)
createAsset(data)
updateAsset(id, data)
deleteAsset(id)
getAssetUnits(id)
```

**MaintenanceService**
```typescript
// Maintenance request management
getRequests(filters?)
getRequest(id)
createRequest(data)
updateRequest(id, data)
updateStatus(id, status)
```

**NotificationService**
```typescript
// Real-time notifications
getNotifications()
markAsRead(id)
subscribeToNotifications()
getUnreadCount()
```

### Key Components

**HeaderComponent**
- Navigation menu
- User profile dropdown
- Notification indicator
- Search bar

**SidebarComponent**
- Main navigation
- Role-based menu items
- Collapsible sections

**AssetCardComponent**
- Asset display
- Quick actions
- Status indicators

**StatusBadgeComponent**
- Status visualization
- Color-coded indicators
- Icon display

## State Management

The application uses Angular services with RxJS for state management:

```typescript
// Example: Asset Service with RxJS
private assets$ = new BehaviorSubject<Asset[]>([]);
private loading$ = new BehaviorSubject(false);

getAssets() {
  this.loading$.next(true);
  return this.http.get<Asset[]>('/api/assets/').pipe(
    tap(assets => this.assets$.next(assets)),
    finalize(() => this.loading$.next(false))
  );
}
```

## Mobile Development

### Building for iOS

```bash
# Add iOS platform
ionic capacitor add ios

# Build web assets
npm run build

# Open in Xcode
ionic capacitor open ios
```

### Building for Android

```bash
# Add Android platform
ionic capacitor add android

# Build web assets
npm run build

# Open in Android Studio
ionic capacitor open android
```

### Mobile Features

- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **Device Plugins**: Status bar, keyboard, haptics
- **Native Camera**: Asset photo capture (with setup)
- **Offline Support**: Service Worker for offline functionality
- **Deep Linking**: Direct navigation to specific content

## Styling & Design

### Tailwind CSS Integration

The project uses Tailwind CSS for utility-first styling:

```html
<!-- Example: Responsive button -->
<button class="px-4 py-2 bg-blue-500 text-white rounded-lg 
                hover:bg-blue-600 active:bg-blue-700 
                md:px-6 lg:px-8">
  Click Me
</button>
```

### Ionic Components

Pre-built mobile components:
- `ion-button`, `ion-input`, `ion-select`
- `ion-card`, `ion-list`, `ion-grid`
- `ion-modal`, `ion-popover`, `ion-menu`
- `ion-tabs`, `ion-navbar`, `ion-toolbar`

### Custom Theme

Configure colors in `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    colors: {
      primary: '#3B82F6',
      secondary: '#10B981',
      danger: '#EF4444',
    }
  }
}
```

## Environment Configuration

### Development Environment

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api',
  wsUrl: 'ws://localhost:8000',
  firebase: { /* config */ }
};
```

### Production Environment

```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://your-api-domain.com/api',
  wsUrl: 'wss://your-api-domain.com',
  firebase: { /* config */ }
};
```

## Building for Production

### Build Web Version

```bash
# Production build
npm run build
# or
ng build --configuration production

# Output in: www/
```

### Build Mobile Apps

```bash
# Build web assets
npm run build

# Sync to native platforms
ionic capacitor sync

# Build iOS app
ionic capacitor build ios --release

# Build Android app
ionic capacitor build android --release
```

### Optimization

The build includes:
- ✅ Tree-shaking (unused code removal)
- ✅ Code splitting
- ✅ Minification
- ✅ Asset compression
- ✅ Lazy loading
- ✅ AOT compilation

## Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run specific test file
ng test --include='**/asset.service.spec.ts'

# Run with coverage
ng test --code-coverage

# Watch mode
ng test --watch
```

### E2E Tests (if configured)

```bash
# Run end-to-end tests
ng e2e

# Run specific spec
ng e2e --specs=src/e2e/asset.e2e.ts
```

### Test Structure

```typescript
// Example test
describe('AssetService', () => {
  let service: AssetService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AssetService]
    });
    service = TestBed.inject(AssetService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should fetch assets', () => {
    const mockAssets = [{ id: '1', name: 'Laptop' }];
    
    service.getAssets().subscribe(assets => {
      expect(assets).toEqual(mockAssets);
    });

    const req = httpMock.expectOne('/api/assets/');
    expect(req.request.method).toBe('GET');
    req.flush(mockAssets);
  });
});
```

## Troubleshooting

### Common Issues

**Issue**: `ng: command not found`
- **Solution**: Install Angular CLI globally: `npm install -g @angular/cli`

**Issue**: Port 4200 already in use
- **Solution**: Use different port: `ng serve --port 4300`

**Issue**: Module not found errors
- **Solution**: Clear node_modules and reinstall: `rm -rf node_modules && npm install`

**Issue**: CORS errors from API
- **Solution**: Verify API URL in environment files and ensure backend CORS is configured

**Issue**: Firebase notifications not working
- **Solution**: Verify Firebase configuration in .env and ensure service worker is registered

**Issue**: Build failures
- **Solution**: Clear Angular cache: `ng cache clean`

## Scripts

Available npm scripts:

```bash
npm start              # Start development server
npm run build          # Build for production
npm run watch          # Build with watch mode
npm test               # Run unit tests
npm run lint           # Run ESLint
npm run build:mobile   # Build for mobile deployment
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository** and create a feature branch
2. **Follow Angular style guide**: Use established patterns
3. **Write tests** for new features
4. **Update documentation** as needed
5. **Submit a Pull Request** with clear description

## Support

For issues, questions, or contributions:
- 📧 Email: fareumair7@gmail.com
- 🐛 GitHub: [github.com/umairlabs](https://github.com/umairlabs)

---

**Quorum Frontend** - Intuitive asset management interface for web and mobile platforms.
