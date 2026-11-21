---
trigger: always_on
---

# Quorum Frontend Development Rules

## Purpose

This document defines the development standards and coding conventions for the Quorum Frontend project. Every developer must follow these rules to maintain consistency, readability, scalability, and code quality throughout the application.

---

# 1. General Rules

* Follow the ShipSanitor folder structure and architecture.
* Do not implement any feature before its Jira story is approved.
* Every feature must have a defined UI, API contract, and acceptance criteria before development.
* Build reusable and maintainable code.
* Avoid duplicate implementations.
* Always prefer simplicity over unnecessary abstraction.
* Keep business logic out of UI components.

---

# 2. Technology Stack

* Angular 20
* Ionic 8
* TypeScript
* Tailwind CSS
* Django REST Framework Backend

No additional frameworks or libraries should be introduced without team approval.

---

# 3. Angular Standards

## Standalone Components Only

* All new components must be standalone.
* Do not create NgModules.

---

## Modern Control Flow

Always use Angular's new control flow syntax.

Use:

* `@if`
* `@else`
* `@for`
* `@switch`
* `@case`
* `@default`

Do **not** use:

* `*ngIf`
* `*ngFor`
* `*ngSwitch`

---

## Dependency Injection

Prefer

* `inject()`

instead of constructor injection whenever appropriate.

Example:

```
const router = inject(Router);
```

---

## Signals

Use Angular Signals for local component state.

Prefer:

* `signal()`
* `computed()`
* `effect()`

Avoid unnecessary RxJS Subjects for local UI state.

---

## Functional APIs

Use:

* `CanActivateFn`
* `HttpInterceptorFn`

Avoid legacy class-based implementations unless required.

---

## Routing

* Lazy load every feature.
* Keep routes inside their respective feature folders.
* Protect routes using role-based guards.

---

# 4. Component Rules

A component should have only one responsibility.

Do not place business logic inside components.

Components should only:

* Display data
* Handle UI events
* Call services

Keep components as small as possible.

If a component exceeds approximately 300 lines, consider splitting it.

## Template and Style Separation

Always keep HTML templates and CSS styles in separate files from TypeScript component files.

**Required file structure for components:**
```
component-name/
├── component-name.component.ts     (TypeScript logic)
├── component-name.component.html   (HTML template)
└── component-name.component.scss   (CSS styles - if needed)
```

**Do NOT use:**
* Inline templates (`template: '...'`)
* Inline styles (`styles: ['...']`)

**Always use:**
* External template files (`templateUrl: './component-name.component.html'`)
* External style files (`styleUrls: ['./component-name.component.scss']`) when styles are needed

This separation improves:
* Code readability and maintainability
* Template syntax highlighting and IntelliSense
* Easier collaboration between developers
* Better debugging experience
* Consistent project structure

---

# 5. Service Rules

Services contain business logic.

Never call HttpClient directly inside components.

Always use:

```
Component
    ↓
Feature Service
    ↓
API Service
    ↓
Backend
```

Services should be reusable.

---

# 6. API Rules

* Use a centralized API layer.
* Handle errors globally.
* Keep endpoint URLs in one location.
* Never hardcode API URLs.

Use typed request and response interfaces.

---

# 7. Folder Structure

Always follow the approved ShipSanitor architecture.

Example:

```
src/
 └── app/
      ├── core/
      ├── layouts/
      ├── pages/
      └── app.routes.ts
```

Do not create random folders.

---

# 8. Naming Conventions

## Components

```
asset-list.component.ts
```

## Services

```
asset.service.ts
```

## API Services

```
asset-apis.service.ts
```

## Interfaces

```
asset.interface.ts
```

## Guards

```
auth.guard.ts
```

## Interceptors

```
auth.interceptor.ts
```

## Enums

```
core.enums.ts
```

## Constants

```
messages.ts
const.ts
```

Use kebab-case for filenames.

Use PascalCase for classes and interfaces.

Use camelCase for variables and methods.

---

# 9. Interface Rules

Prefer interfaces over classes for API models.

Keep interfaces inside

```
core/interfaces
```

Do not duplicate interfaces.

---

# 10. State Management

Use Angular Signals.

Do not introduce NgRx unless the team approves it.

Use RxJS only where asynchronous streams are required.

### Signal Standards & Typing Rules

* Always provide explicit generic type annotations for all Angular signals, inputs, outputs, and models:
  * **Input Signals**: `public readonly asset: InputSignal<Asset | null> = input<Asset | null>(null);`
  * **Output Emitters**: `public readonly close: OutputEmitterRef<void> = output<void>();`
  * **Model Signals**: `public readonly value: ModelSignal<string> = model<string>('');`
  * **Local Writable Signals**: `protected readonly selectedId: WritableSignal<string | null> = signal<string | null>(null);`

### Access Modifiers

* Always use explicit access specifiers (`public`, `protected`, `private`) and immutability modifiers (`readonly`) on all class properties, methods, and signal declarations:
  * Use `public readonly` for component inputs, outputs, and public signals exposed to parent components.
  * Use `protected readonly` or `protected` for properties and methods used exclusively within the component template or class logic.
  * Use `private readonly` or `private` for internal implementation details, injected services, or private helper methods.

---

# 11. Styling Rules

* Use Tailwind CSS utilities for styling.
* Avoid inline styles.
* Keep custom SCSS minimal.
* Do not use Bootstrap or any other CSS framework.
* Reuse existing utility classes and components whenever possible.

### Design Tokens

All design values must come from centralized variables.

Do **not** hardcode:

* Colors
* Font sizes
* Font weights
* Border radius
* Shadows
* Spacing values (when reusable)
* Z-index values
* Transition durations

### Colors

Never use hardcoded colors such as:

```text
bg-blue-500
text-red-600
#2563EB
rgb(37, 99, 235)
```

Always use the project's color variables or Tailwind theme tokens defined by the design system.

Example:

```text
bg-primary
text-primary
bg-surface
text-on-surface
border-outline
```

### Typography

Use only the typography sizes defined by the design system.

Do not invent new font sizes or weights.

### Spacing

Prefer the project's predefined spacing scale.

Avoid arbitrary values unless absolutely necessary.

### Components

If the same styling is used in multiple places, create or reuse a shared component instead of duplicating styles.

### Theme Consistency

All UI must support centralized theme management.

Changing a color or design token in one place should update the entire application without requiring changes to individual pages.

---

# 12. UI Consistency

Follow the Stitch design exactly.

Do not redesign pages.

Reuse existing components.

Maintain consistent:

* spacing
* typography
* tables
* forms
* cards
* dialogs
* navigation

---

# 13. Layout Rules

The application uses role-based layouts.

Layouts must remain consistent across all pages.

Common elements:

* Sidebar
* Header
* Breadcrumbs
* Notifications
* Profile Menu

---

# 14. Role-Based Access

Every page must validate permissions.

Roles:

* System Administrator
* Operations Manager
* External Technician

Unauthorized users must never access restricted pages.

---

# 15. AI Feature Rules

The AI Assistant is **not** a standalone page.

It is available only while creating a maintenance ticket.

Only the Operations Manager can use it.

AI assists by generating:

* Issue Title
* Description
* Category
* Suggested Details

The user can manually enter all information without using AI.

---

# 16. Asset Management Rules

Assets follow the complete lifecycle.

Example:

```
Purchased
→ Available
→ Assigned
→ Maintenance
→ Available
→ Retired
```

Status transitions must follow business rules.

---

# 17. Maintenance Rules

Maintenance tickets contain:

* Title
* Description
* Asset
* Priority
* Status
* Assigned Technician
* Attachments
* Notes
* History

Technicians only update assigned tickets.

Managers create and assign tickets.

---

# 18. Security Rules

Never store sensitive information in source code.

Never expose tokens in logs.

Protect every API request.

Always validate permissions.

---

# 19. Code Quality

Follow strict TypeScript.

No `any` unless absolutely necessary.

Remove unused imports.

Remove dead code.

No commented-out code.

No console logs in production code.

Keep methods short and readable.

---

# 20. Git Rules

* Work from the `develop` branch.
* Create feature branches for new work.
* Keep commits focused on a single change.
* Write meaningful commit messages.
* Pull the latest changes before pushing.

Example commit messages:

```
feat: add asset assignment module

fix: resolve login redirect issue

refactor: move api logic to service

docs: update project documentation
```

---

# 21. Documentation Rules

Every new module should have:

* Jira Story
* UI Design
* API Contract
* Acceptance Criteria

Update documentation whenever architecture changes.

---

# 22. Testing Rules

Build the project after every major change.

Ensure there are no TypeScript errors.

Verify routing.

Verify role permissions.

Test all CRUD operations before marking a story complete.

---

# 23. Performance Rules

Lazy load feature routes.

Avoid unnecessary API calls.

Reuse components.

Use pagination for large datasets.

Optimize images and assets.

---

# 24. Code Review Rules

Before creating a Pull Request, verify:

* Code builds successfully.
* No lint errors.
* No unused files.
* No duplicate code.
* Naming conventions followed.
* Documentation updated.
* Jira story completed.

---

# 25. Component Extraction Rule

Whenever a new page, feature, or section of UI is being created, you must evaluate whether any part of it can or should be a standalone component **before** writing it inline.

Follow this checklist every time:

1. **Is this UI block used more than once on the same page?** → Extract it as a component.
2. **Could this UI block appear on any other existing or future page?** → Extract it to `core/components/`.
3. **Is this UI block only relevant to this specific feature?** → Extract it to `<feature>/components/`.
4. **Does the inline template exceed ~30 lines of HTML for a single concept?** → Extract it.

### Placement Rules

| Scope | Location |
|---|---|
| Used across multiple features/pages | `src/app/core/components/<component-name>/` |
| Used only within one feature | `src/app/pages/<feature>/components/<component-name>/` |

### Examples

* A stat card grid only used on the dashboard → `pages/dashboard/components/stat-cards-grid/`
* An activity feed that could appear on asset detail, maintenance, audit logs → `core/components/activity-feed/`
* A reusable section panel (header + body card shell) → `core/components/section-panel/`

Do **not** build a page by writing everything inline and refactoring later. The extraction decision must happen **at design time**, before the first line of template is written.

### Component Analysis Requirement

**Before creating any new page or major feature**, you must:

1. **Analyze the design/mockup** and identify all distinct UI patterns
2. **Check existing components** in `core/components/` and `<feature>/components/` for reusable patterns
3. **Document the analysis** with component extraction decisions and placement rationale
4. **Create a component extraction plan** listing:
   - Components to be extracted
   - Their placement (core vs feature-specific)
   - Their reusability scope
   - Dependencies between components

This analysis must be completed and approved before writing any template code.

---

# 26. Project Principles

<!-- 1. Build only what the approved Jira story requires. -->
<!-- 2. Keep the architecture consistent with ShipSanitor. -->
3. Prefer reusable solutions over quick fixes.
4. Write code for maintainability, not just functionality.
5. Keep the UI consistent with the approved Stitch designs.
6. Follow Angular 20 best practices at all times.
7. Every change should improve the codebase, not complicate it.
