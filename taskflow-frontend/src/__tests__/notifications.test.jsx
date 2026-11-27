import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationsPage } from '../pages/NotificationsPage';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { renderWithProviders, mockNotifications } from './test-utils';
import * as notificationsSlice from '../store/slices/notificationsSlice';
import { notificationsApi } from '../api/notifications.api';

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('Notifications Component Testing', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.spyOn(notificationsApi, 'getAll').mockResolvedValue({
      data: {
        data: {
          notifications: mockNotifications,
        },
      },
    });
    vi.spyOn(notificationsApi, 'markRead').mockImplementation((id) =>
      Promise.resolve({
        data: {
          data: {
            notification: {
              ...mockNotifications.find((n) => n._id === id) || mockNotifications[0],
              isRead: true,
              readAt: new Date().toISOString(),
            },
            unreadCount: 1,
          },
        },
      })
    );
    vi.spyOn(notificationsApi, 'markAllRead').mockResolvedValue({
      data: {
        data: {
          notifications: mockNotifications.map((n) => ({
            ...n,
            isRead: true,
            readAt: new Date().toISOString(),
          })),
          unreadCount: 0,
        },
      },
    });
  });

  it('renders Notification Center with unread count and notification items', async () => {
    renderWithProviders(<NotificationsPage />);

    expect(screen.getByText('Notification Center')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Task Assigned')).toBeInTheDocument();
      expect(screen.getByText('Milestone Reached')).toBeInTheDocument();
      expect(screen.getByText('Task Overdue Warning')).toBeInTheDocument();
    });
  });

  it('dispatches markAllNotificationsRead when clicking Mark all read', async () => {
    const markAllSpy = vi.spyOn(notificationsSlice, 'markAllNotificationsRead');
    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark all read/i })).toBeInTheDocument();
    });

    const markAllBtn = screen.getByRole('button', { name: /mark all read/i });
    fireEvent.click(markAllBtn);

    expect(markAllSpy).toHaveBeenCalledTimes(1);
  });

  it('dispatches markNotificationRead when clicking on an unread notification', async () => {
    const markReadSpy = vi.spyOn(notificationsSlice, 'markNotificationRead');
    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Task Assigned')).toBeInTheDocument();
    });

    const unreadItem = screen.getByText('Task Assigned');
    fireEvent.click(unreadItem);

    expect(markReadSpy).toHaveBeenCalledWith('notif-1');
  });

  it('filters notifications by unread tab', async () => {
    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^unread$/i })).toBeInTheDocument();
    });

    const unreadTab = screen.getByRole('button', { name: /^unread$/i });
    fireEvent.click(unreadTab);

    // Only unread items should be visible
    expect(screen.getByText('Task Assigned')).toBeInTheDocument();
    expect(screen.getByText('Task Overdue Warning')).toBeInTheDocument();
    expect(screen.queryByText('Milestone Reached')).not.toBeInTheDocument();
  });

  it('filters notifications by search query', async () => {
    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Milestone Reached')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText(/search notifications/i);
    fireEvent.change(searchInput, { target: { value: 'Milestone' } });

    expect(screen.getByText('Milestone Reached')).toBeInTheDocument();
    expect(screen.queryByText('Task Assigned')).not.toBeInTheDocument();
  });

  it('dismisses all notifications when Clear all is clicked', async () => {
    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
    });

    const clearAllBtn = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearAllBtn);

    expect(screen.getByText('Your inbox is clean')).toBeInTheDocument();
  });

  it('renders empty notification state when list is empty', async () => {
    vi.spyOn(notificationsApi, 'getAll').mockResolvedValueOnce({
      data: { data: { notifications: [] } },
    });

    renderWithProviders(<NotificationsPage />, {
      preloadedState: {
        notifications: {
          items: [],
          unreadCount: 0,
          loading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Your inbox is clean')).toBeInTheDocument();
      expect(screen.getByText(/You have 0 unread notifications\./i)).toBeInTheDocument();
    });
  });

  it('renders ErrorState when fetching notifications fails', async () => {
    vi.spyOn(notificationsApi, 'getAll').mockRejectedValueOnce('Network error');

    renderWithProviders(<NotificationsPage />, {
      preloadedState: {
        notifications: {
          items: [],
          unreadCount: 0,
          loading: false,
          error: 'Failed to load notifications',
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to load notifications')).toBeInTheDocument();
    });
  });

  it('NotificationBell renders trigger button with unread count badge', () => {
    renderWithProviders(<NotificationBell />);

    const bellBtn = screen.getByRole('button', { name: /open notifications/i });
    expect(bellBtn).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('NotificationBell opens flyout panel on click and displays recent notifications', () => {
    renderWithProviders(<NotificationBell />);

    const bellBtn = screen.getByRole('button', { name: /open notifications/i });
    fireEvent.click(bellBtn);

    expect(screen.getByText('2 unread')).toBeInTheDocument();
    expect(screen.getByText('Task Assigned')).toBeInTheDocument();
  });
});
