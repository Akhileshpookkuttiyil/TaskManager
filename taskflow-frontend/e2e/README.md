# TaskFlow End-to-End (E2E) Testing Guide

Comprehensive guide for running, maintaining, and extending automated End-to-End browser tests for TaskFlow using Playwright.

---

## 1. Architecture Overview

TaskFlow's E2E testing framework is built on **Playwright** with Chromium automation. The suite exercises real user journeys against live frontend and backend application layers with PostgreSQL persistence in Neon DB.

```
                      ┌──────────────────────────────────────┐
                      │   Playwright Test Runner (Chromium)  │
                      └──────────────────┬───────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   │                                           │
          [Direct Browser Flow]                       [API & DB Fixtures]
                   │                                           │
                   ▼                                           ▼
       ┌──────────────────────┐                     ┌─────────────────────┐
       │   Vite Frontend App  │                     │   Express Backend   │
       │ (http://localhost:5173)                    │(http://localhost:5000)
       └───────────┬──────────┘                     └──────────┬──────────┘
                   │                                           │
                   │              HTTP / REST API              │
                   └───────────────────►───────────────────────┘
                                       │
                                       ▼
                            ┌─────────────────────┐
                            │ Neon PostgreSQL DB  │
                            │   (Prisma ORM)      │
                            └─────────────────────┘
```

### Key Architectural Principles
- **No Heavy Mocking**: All user journeys (auth, task creation, dependencies, notifications, metrics) interact with the live backend API and Neon PostgreSQL database.
- **Controlled Mocking for Error Simulation**: Route interception (`page.route`) is reserved strictly for simulating transient network / 500 server failures and schema edge cases in Journey F.
- **Zero Race Hydration**: Authentication state is injected via `page.addInitScript` into `localStorage`, eliminating double reloads and state desynchronization.
- **Strict Data Isolation & Cleanup**: Every test generates a unique user email prefix (`test_<journey>_<timestamp>_<rand>@taskflow.dev`). All created user records and their cascading foreign keys (tasks, dependencies, subtasks, notifications, activities) are deleted in `test.afterAll` hooks via Prisma.

---

## 2. Directory Structure

```
taskflow-frontend/
├── e2e/
│   ├── helpers/
│   │   └── test-setup.js           # Test fixtures, DB helpers, API utilities, and cleanup
│   ├── auth.spec.js                # Journey A: Registration, login, session persistence, logout, route protection
│   ├── dashboard.spec.js           # Journey B: Metrics, StatCards against DB, empty states, quick actions
│   ├── tasks.spec.js               # Journey C: Task CRUD, inline editing, subtask rollup, persistence
│   ├── dependencies.spec.js        # Journey D: Blocking workflows, circular dependency prevention
│   ├── notifications-activity.spec.js # Journey E: In-app alerts, unread counters, activity audit feed
│   ├── error-handling.spec.js      # Journey F: Expired tokens, 500 error state & recovery, resilience
│   └── README.md                   # This documentation
├── playwright.config.js            # Playwright configuration file
└── package.json                    # E2E npm scripts
```

---

## 3. Environment Configuration

### Required Environment Variables

| Variable | Location | Default / Example | Purpose |
|---|---|---|---|
| `DATABASE_URL` | `taskflow-backend/.env` | `postgresql://user:pass@ep-xyz.aws.neon.tech/neondb?sslmode=require` | PostgreSQL connection string for Prisma test fixtures & teardown |
| `JWT_SECRET` | `taskflow-backend/.env` | `your_secure_random_jwt_secret` | Signs and verifies user session tokens |
| `VITE_API_URL` | `taskflow-frontend/.env` | `http://localhost:5000/api` | Base URL used by Axios frontend client |
| `BACKEND_URL` | System / Inline | `http://localhost:5000` | Base URL used by Node E2E test setup helpers |
| `CI` | System (optional) | `true` / `false` | When `true`, enables CI retry strategies and prevents server reuse |

---

## 4. How to Run E2E Tests Locally

### Prerequisites
Ensure backend and frontend servers are running:
```bash
# Terminal 1: Backend
cd taskflow-backend
npm run dev

# Terminal 2: Frontend
cd taskflow-frontend
npm run dev
```

### Running Test Commands

```bash
# Run all E2E tests headlessly (Standard)
npm run test:e2e

# Run with visible browser window (Headed mode)
npm run test:e2e:headed

# Run with interactive Playwright UI
npm run test:e2e:ui

# Run in step-by-step debug mode with Playwright Inspector
npm run test:e2e:debug

# Run a specific user journey spec
npx playwright test e2e/auth.spec.js

# Run a specific test by title
npx playwright test -g "creates a new task"
```

---

## 5. Continuous Integration (CI) Configuration

Example GitHub Actions workflow (`.github/workflows/e2e.yml`):

```yaml
name: End-to-End Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  e2e:
    timeout-minutes: 20
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install backend dependencies
        working-directory: taskflow-backend
        run: npm ci

      - name: Install frontend dependencies
        working-directory: taskflow-frontend
        run: npm ci

      - name: Install Playwright Browsers
        working-directory: taskflow-frontend
        run: npx playwright install --with-deps chromium

      - name: Run Backend Prisma Migrations
        working-directory: taskflow-backend
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: npx prisma migrate deploy

      - name: Start Backend
        working-directory: taskflow-backend
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          PORT: 5000
          NODE_ENV: test
        run: npm start &

      - name: Run Playwright E2E Tests
        working-directory: taskflow-frontend
        env:
          CI: true
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          VITE_API_URL: http://localhost:5000/api
        run: npm run test:e2e

      - name: Upload Playwright Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: taskflow-frontend/playwright-report/
          retention-days: 14
```

---

## 6. Test Suite Coverage & Verification Matrix

| Spec File | User Journey | Test Count | Status | Key Coverage Points |
|---|---|:---:|:---:|---|
| `e2e/auth.spec.js` | Journey A: Authentication | 6 | PASS | User registration, valid/invalid login, token persistence on reload, user logout, protected route guards |
| `e2e/dashboard.spec.js` | Journey B: Dashboard & Metrics | 3 | PASS | Real DB stat cards, empty state rendering, navigation to creation workflows |
| `e2e/tasks.spec.js` | Journey C: Task Management | 4 | PASS | Full task creation, inline field updating, subtask completion rollup, task deletion & reload persistence |
| `e2e/dependencies.spec.js` | Journey D: Dependencies | 3 | PASS | Prerequisite creation, blocked badge display, completion guard interception, unblocking upon prerequisite completion, circular dependency prevention |
| `e2e/notifications-activity.spec.js` | Journey E: Notifications & Activity | 2 | PASS | In-app alerts, unread counts, mark as read, dismiss notification, task audit log, workspace activity feed |
| `e2e/error-handling.spec.js` | Journey F: Error Resilience | 4 | PASS | Expired token redirect, 500 error state rendering & retry recovery, non-existent UUID handling, malformed payload resilience |
| **Total** | **All Critical Journeys** | **22** | **PASS** | **100% Pass Rate** |

---

## 7. Known Limitations & Trade-offs

1. **Dual-Stack DNS (IPv6 vs IPv4 on Windows)**:
   - Neon AWS PostgreSQL endpoints resolve both A (IPv4) and AAAA (IPv6) records. In Windows Node.js environments, attempting IPv6 routing to Neon can result in `ECONNREFUSED`.
   - *Mitigation*: The test setup helper automatically sets `dns.setDefaultResultOrder('ipv4first')` in Node.js before database connections are initialized.

2. **Rate Limiting in Automated Runs**:
   - Production rate limiting strictly caps authentication and API requests. Running rapid E2E suites can trigger false 429 rejections if executed against production limits.
   - *Mitigation*: `taskflow-backend/routes/auth.routes.js` and `taskflow-backend/server.js` automatically elevate limits to 50,000 requests in non-production environments (`process.env.NODE_ENV !== 'production'`), while preserving strict limits for production.

3. **Controlled Mocking for Schema Testing**:
   - Backend APIs strictly validate schemas before returning data. Simulating malformed backend responses requires Playwright `page.route` interception with explicit backend origin targeting (`http://localhost:5000/api/*`) and CORS headers.
