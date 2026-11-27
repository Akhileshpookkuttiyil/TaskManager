import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/slices/authSlice';
import tasksReducer from '../store/slices/tasksSlice';
import notificationsReducer from '../store/slices/notificationsSlice';
import activityReducer from '../store/slices/activitySlice';
import { ThemeProvider } from '../components/theme/ThemeProvider';
import { PomodoroProvider } from '../context/PomodoroContext';

export const mockUser = {
  _id: 'user-101',
  id: 'user-101',
  name: 'Akhilesh Tester',
  email: 'akhilesh@example.com',
};

export const mockStats = {
  total: 10,
  completed: 4,
  done: 4,
  pending: 3,
  todo: 3,
  in_progress: 3,
  dueToday: 2,
  overdue: 1,
  highPriority: 2,
  tags: ['frontend', 'testing', 'security'],
};

export const mockTasks = [
  {
    _id: 'task-1',
    id: 'task-1',
    title: 'Complete Phase 6 Frontend Component Testing',
    description: 'Ensure 100% reliable observable user behavior tests for TaskFlow',
    status: 'in_progress',
    priority: 'high',
    dueDate: new Date(Date.now() + 3600000).toISOString(),
    reminderDate: null,
    recurrence: 'none',
    tags: ['frontend', 'testing'],
    isBlocked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'task-2',
    id: 'task-2',
    title: 'Fix High Priority Security Vulnerability',
    description: 'Investigate token storage and audit sanitize patterns',
    status: 'pending',
    priority: 'high',
    dueDate: new Date(Date.now() - 86400000).toISOString(), // overdue
    reminderDate: null,
    recurrence: 'none',
    tags: ['security'],
    isBlocked: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'task-3',
    id: 'task-3',
    title: 'Setup Production Deployment Pipeline',
    description: 'Configure Cloudflare Workers and Docker containers',
    status: 'completed',
    priority: 'medium',
    dueDate: new Date(Date.now() + 172800000).toISOString(),
    reminderDate: null,
    recurrence: 'none',
    tags: ['backend'],
    isBlocked: false,
    completedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'task-4',
    id: 'task-4',
    title: 'Draft Sprint Retrospective Notes',
    description: 'Gather feedback from the entire team',
    status: 'pending',
    priority: 'low',
    dueDate: null,
    reminderDate: null,
    recurrence: 'none',
    tags: ['retrospective'],
    isBlocked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const mockNotifications = [
  {
    _id: 'notif-1',
    id: 'notif-1',
    title: 'Task Assigned',
    message: 'You were assigned to Complete Phase 6 Testing',
    type: 'task_assigned',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'notif-2',
    id: 'notif-2',
    title: 'Milestone Reached',
    message: 'Congratulations on completing 5 tasks in a row!',
    type: 'streak_milestone',
    isRead: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    _id: 'notif-3',
    id: 'notif-3',
    title: 'Task Overdue Warning',
    message: 'Fix High Priority Security Vulnerability is overdue',
    type: 'system',
    isRead: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

export const mockActivities = [
  {
    _id: 'act-1',
    message: 'Created task "Complete Phase 6 Frontend Component Testing"',
    type: 'created',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'act-2',
    message: 'Marked task "Setup Production Deployment Pipeline" as completed',
    type: 'completed',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

export function createTestStore(preloadedState = {}) {
  const defaultTasks = {
    items: mockTasks,
    loading: false,
    error: null,
    stats: mockStats,
    statsLoading: false,
    dashboard: {
      tasks: mockTasks,
      loading: false,
      error: null,
      lastFetchedAt: Date.now(),
    },
    analytics: {
      tasks: mockTasks,
      loading: false,
      error: null,
      lastFetchedAt: Date.now(),
    },
    pagination: {
      total: mockTasks.length,
      page: 1,
      pages: 1,
      limit: 10,
    },
    filters: {
      status: 'all',
      priority: 'all',
      search: '',
      sortBy: 'createdAt',
      order: 'desc',
    },
    pendingDeleteIds: [],
    pendingDeleteTasks: {},
  };

  const defaultAuth = {
    user: mockUser,
    token: 'mock-jwt-token',
    loading: false,
    profileLoading: false,
    hydrating: false,
    error: null,
    profileError: null,
    initialized: true,
  };

  const defaultNotifications = {
    items: mockNotifications,
    unreadCount: 2,
    loading: false,
    error: null,
  };

  const defaultActivity = {
    items: mockActivities,
    loading: false,
    error: null,
  };

  return configureStore({
    reducer: {
      auth: authReducer,
      tasks: tasksReducer,
      notifications: notificationsReducer,
      activity: activityReducer,
    },
    preloadedState: {
      auth: { ...defaultAuth, ...preloadedState.auth },
      tasks: {
        ...defaultTasks,
        ...preloadedState.tasks,
        dashboard: {
          ...defaultTasks.dashboard,
          ...(preloadedState.tasks?.dashboard || {}),
        },
        analytics: {
          ...defaultTasks.analytics,
          ...(preloadedState.tasks?.analytics || {}),
        },
        filters: {
          ...defaultTasks.filters,
          ...(preloadedState.tasks?.filters || {}),
        },
      },
      notifications: { ...defaultNotifications, ...preloadedState.notifications },
      activity: { ...defaultActivity, ...preloadedState.activity },
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }),
  });
}

export function renderWithProviders(
  ui,
  {
    preloadedState = {},
    store = createTestStore(preloadedState),
    route = '/',
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    return (
      <Provider store={store}>
        <ThemeProvider>
          <PomodoroProvider>
            <MemoryRouter initialEntries={[route]}>
              {children}
            </MemoryRouter>
          </PomodoroProvider>
        </ThemeProvider>
      </Provider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
