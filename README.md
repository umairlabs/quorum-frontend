# Astra - Asset Management System

Astra is an enterprise Asset Management application built with Angular 18, Ionic Standalone, and Tailwind CSS, following the **ShipSanitor Reference Architecture**.

---

## 📋 Architectural Overview

Astra uses a modular, scalable architecture structured identically to the **ShipSanitor** reference standard. All core functionality, shared UI elements, state management helpers, data interfaces, and API services are centralized in `src/app/core/`, while domain features are organized as page modules in `src/app/pages/`. Layout routing is managed centrally in `src/app/layouts/`.

---

## 🔄 Summary of Architectural Alignment Changes

* **`pages/` (formerly `features/`)**: Feature modules moved to `src/app/pages/` (e.g., `pages/assets`, `pages/assignments`, `pages/maintenance`, `pages/auth`, etc.). Path alias `@pages/*` configured in `tsconfig.json`.
* **`layouts/` (formerly `layout/`)**: Pluralized layout directory `src/app/layouts/`. Includes central `layout.component.ts` and `layout.routes.ts`. Path alias `@layouts/*` configured.
* **`core/interfaces/` (formerly `core/models/`)**: Data contracts use TypeScript interfaces with `.interface.ts` file extensions.
* **`core/services/Api's/` Layer**: API HTTP communication refactored into service classes inside `src/app/core/services/Api's/` extending `BaseApiCallService`.
* **`core/` Shared UI**: Reusable components, directives, pipes, and menus moved into `core/components/`, `core/directives/`, `core/pipes/`, and `core/menus/`. Top-level `shared/` directory removed.
* **`core/interceptors/`**: Renamed to `auth.interceptor.ts` exporting `authInterceptor`.
* **`core/Types/`**: Capitalized type definitions folder containing `types.ts`.
* **Assets & SCSS**: Structured `src/assets/` into `icons/svgs/`, `icons/`, and `scss/` (`_base.scss`, `_icons.scss`, `_maxin.scss`, `fonts.css`) imported into `global.scss`.
* **Tailwind CSS & Sass Modernization**: Retained `tailwind.config.js` and `@tailwind` directives. Modernized `global.scss` using Dart Sass `@use` syntax to eliminate Sass deprecation warnings.
* **Angular 20 & Ionic 8 Best Practices**: Utilizes functional guards (`CanActivateFn`), functional HTTP interceptors (`HttpInterceptorFn`), `inject()` dependency injection, Angular Signals (`signal()`), standalone components, and Ionic 8 standalone providers (`provideIonicAngular`).

---

## 📁 Current Folder Structure

```text
d:/projects/astra/
├── angular.json
├── capacitor.config.ts
├── ionic.config.json
├── karma.conf.js
├── package.json
├── tailwind.config.js
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.spec.json
└── src/
    ├── main.ts
    ├── global.scss
    ├── index.html
    ├── polyfills.ts
    ├── test.ts
    ├── zone-flags.ts
    ├── environments/
    │   ├── environment.ts
    │   └── environment.prod.ts
    ├── theme/
    │   └── variables.scss
    ├── assets/
    │   ├── icons/
    │   │   ├── favicon.png
    │   │   └── svgs/
    │   │       └── shapes.svg
    │   ├── javascript/
    │   └── scss/
    │       ├── _base.scss
    │       ├── _icons.scss
    │       ├── _maxin.scss
    │       └── fonts.css
    └── app/
        ├── app.component.html
        ├── app.component.scss
        ├── app.component.ts
        ├── app.config.ts
        ├── app.routes.ts
        ├── core/
        │   ├── components/
        │   │   ├── not-found/
        │   │   └── unauthorized/
        │   ├── constants/
        │   ├── directives/
        │   ├── enums/
        │   ├── guards/
        │   │   └── auth.guard.ts
        │   ├── interceptors/
        │   │   └── auth.interceptor.ts
        │   ├── interfaces/
        │   │   ├── api-response.interface.ts
        │   │   ├── asset.interface.ts
        │   │   ├── asset-category.interface.ts
        │   │   ├── assignment.interface.ts
        │   │   ├── attachment.interface.ts
        │   │   ├── audit-log.interface.ts
        │   │   ├── auth.interface.ts
        │   │   ├── depreciation.interface.ts
        │   │   ├── maintenance.interface.ts
        │   │   ├── notification.interface.ts
        │   │   ├── role.interface.ts
        │   │   └── user.interface.ts
        │   ├── menus/
        │   ├── pipes/
        │   ├── services/
        │   │   ├── Api's/
        │   │   │   ├── baseApiCall.service.ts
        │   │   │   └── auth-apis.service.ts
        │   │   ├── Database/
        │   │   ├── alert.service.ts
        │   │   ├── local-storage.service.ts
        │   │   ├── toast.service.ts
        │   │   └── utility.service.ts
        │   └── Types/
        │       └── types.ts
        ├── layouts/
        │   ├── layout.component.html
        │   ├── layout.component.ts
        │   ├── layout.routes.ts
        │   ├── components/
        │   ├── footer/
        │   └── header/
        └── pages/
            ├── ai-assistant/
            ├── assets/
            ├── assignments/
            ├── audit-logs/
            ├── auth/
            ├── dashboard/
            ├── depreciation/
            ├── maintenance/
            ├── notifications/
            ├── reports/
            ├── settings/
            └── users/
```

---

## 🏛 Core Architecture (`src/app/core/`)

The `core/` module is the central backbone of the application:

* **`interfaces/`**: TypeScript interface definitions (`*.interface.ts`) representing API responses and business entities.
* **`Types/`**: Global TypeScript custom types declared in `types.ts`.
* **`constants/`**: Application-wide constants.
* **`enums/`**: Core enumeration types.
* **`guards/`**: Route activation guards including `auth.guard.ts`.
* **`interceptors/`**: HTTP interceptors including `auth.interceptor.ts` which appends bearer tokens and handles `401 Unauthorized` responses.
* **`components/`, `directives/`, `pipes/`, `menus/`**: App-wide reusable UI components (`not-found`, `unauthorized`), custom directives, custom pipes, and popover menus.

---

## 🔌 Services and API Layer (`src/app/core/services/`)

The API and service layer follows a structured inheritance model matching ShipSanitor:

### 1. API Services (`core/services/Api's/`)
* **`BaseApiCallService` (`baseApiCall.service.ts`)**: Base HTTP client providing `get()`, `post()`, `put()`, `patch()`, and `delete()` methods, base URL resolution, and common HTTP headers.
* **`AuthApisService` (`auth-apis.service.ts`)**: Extends `BaseApiCallService` to handle authentication, session storage, signals (`currentUser`, `isAuthenticated`), and login/logout state.
* **Domain API Services**: Additional domain services (e.g. `assets-apis.service.ts`) extend `BaseApiCallService`.

### 2. Core Helper Services (`core/services/`)
* **`UtilityService` (`utility.service.ts`)**: Holds global application signals such as `isMobileView`.
* **`ToastService` (`toast.service.ts`)**: Utility wrapper for Ionic Toast controller.
* **`AlertService` (`alert.service.ts`)**: Utility wrapper for Ionic Alert controller.
* **`LocalStorageService` (`local-storage.service.ts`)**: Typed wrapper for browser LocalStorage operations.

---

## 📐 Layout Architecture (`src/app/layouts/`)

Authenticated application pages render within `LayoutComponent`:

* **`LayoutComponent` (`layouts/layout.component.ts` & `layout.component.html`)**: Host shell component rendering `<ion-router-outlet>`.
* **`LayoutRoutes` (`layouts/layout.routes.ts`)**: Aggregates all authenticated child page routes (`dashboard`, `assets`, `assignments`, `maintenance`, `reports`, `users`, `settings`, `depreciation`, `notifications`, `ai-assistant`).

---

## 📄 Pages & Modules (`src/app/pages/`)

Domain features are organized into standalone page directories under `src/app/pages/`:

| Page Directory | Description |
| :--- | :--- |
| `pages/auth/` | Authentication pages (Login, Signup, Password reset, Verification) |
| `pages/dashboard/` | Analytics & system overview dashboard |
| `pages/assets/` | Asset catalog, asset creation, asset detail management |
| `pages/assignments/` | Asset issuance and check-in/check-out tracking |
| `pages/maintenance/` | Maintenance schedule, work orders, service logs |
| `pages/depreciation/` | Asset depreciation calculations and financial tracking |
| `pages/audit-logs/` | System audit trail & user activity history |
| `pages/reports/` | Reporting and export module |
| `pages/notifications/`| User alerts & notification center |
| `pages/ai-assistant/` | AI-assisted search and query module |
| `pages/users/` | User management & role permissions |
| `pages/settings/` | System configuration & application settings |

---

## 🔀 Routing Structure

Routing is split between root path definitions and central layout route tables:

### 1. Root Routes (`src/app/app.routes.ts`)
```typescript
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './layouts/layout.component';
import { LayoutRoutes } from './layouts/layout.routes';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: LayoutRoutes
  },
  {
    path: 'auth',
    loadChildren: () => import('./pages/auth/auth.routes').then((m) => m.AUTH_ROUTES)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
```

### 2. Layout Child Routes (`src/app/layouts/layout.routes.ts`)
Child routes map all protected pages (`dashboard`, `assets`, `assignments`, `maintenance`, etc.) within the main layout wrapper.

---

## 🎨 Tailwind CSS & Ionic Setup

* **Tailwind CSS**: Configured via `tailwind.config.js` and imported at the top of `src/global.scss`:
  ```scss
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```
* **Ionic Standalone**: Configured in `src/app/app.config.ts` via `provideIonicAngular({})`.
* **SCSS Assets**: Custom styling modules stored in `src/assets/scss/` (`_base.scss`, `_icons.scss`, `_maxin.scss`, `fonts.css`) and imported directly into `global.scss`.

---

## ⚙️ Environment Configuration

Environments are configured in `src/environments/`:

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api/v1'
};
```

---

## 🛠 Build Verification

The application compiles cleanly with Angular Angular CLI / Ionic CLI:

```bash
# Development server
npm run start

# Production build verification
npm run build
```

**Build Status**: Verified and compiling cleanly.
