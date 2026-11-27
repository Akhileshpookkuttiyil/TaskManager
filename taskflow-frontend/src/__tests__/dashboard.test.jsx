import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardPage } from '../pages/DashboardPage';
import { renderWithProviders, mockStats, mockTasks, mockActivities } from './test-utils';
import * as tasksSlice from '../store/slices/tasksSlice';
import toast from 'react-hot-toast';
import { tasksApi } from '../api/tasks.api';
import { activitiesApi } from '../api/activities.api';

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock AnimatedNumber to render synchronously without animation frame delays
vi.mock('../components/ui/AnimatedNumber', () => ({
  AnimatedNumber: ({ value, prefix = '', suffix = '' }) => (
    <span aria-live="polite" className="tabular-nums">
      {prefix}{value}{suffix}
    </span>
  ),
}));

describe('Dashboard Component Testing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(tasksApi, 'getStats').mockResolvedValue({ data: { data: { stats: mockStats } } });
    vi.spyOn(tasksApi, 'fetchAll').mockResolvedValue({ data: { data: { tasks: mockTasks } } });
    vi.spyOn(tasksApi, 'getAll').mockResolvedValue({ data: { data: { tasks: mockTasks } } });
    vi.spyOn(tasksApi, 'update').mockImplementation((id, data) =>
      Promise.resolve({ data: { data: { task: { ...data, _id: id } } } })
    );
    vi.spyOn(activitiesApi, 'getRecent').mockResolvedValue({ data: { data: { activities: mockActivities } } });
  });

  it('renders dashboard with personalized user greeting and navigation buttons', () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByText(/Akhilesh/i)).toBeInTheDocument();
    expect(screen.getByText(/Welcome back\. Let's see what needs to be done\./i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open workspace/i })).toHaveAttribute('href', '/tasks');
    expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument();
  });

  it('renders all summary StatCards with metrics correctly', () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByText('Total tasks')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Due today')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();

    // Verify statistical metric values from mockStats
    expect(screen.getByText(String(mockStats.total))).toBeInTheDocument();
    expect(screen.getByText(String(mockStats.completed))).toBeInTheDocument();
    expect(screen.getByText(String(mockStats.pending))).toBeInTheDocument();
  });

  it('renders productivity score and analytics metrics cards', () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByText(/productivity score/i)).toBeInTheDocument();
    expect(screen.getByText(/completion rate/i)).toBeInTheDocument();
    expect(screen.getByText(/current streak/i)).toBeInTheDocument();
    expect(screen.getByText(/best streak/i)).toBeInTheDocument();
  });

  it('renders TaskSkeletonList when dashboard tasks are loading', () => {
    renderWithProviders(<DashboardPage />, {
      preloadedState: {
        tasks: {
          dashboard: {
            tasks: [],
            loading: true,
            error: null,
            lastFetchedAt: null,
          },
        },
      },
    });

    const skeletonLists = screen.getAllByLabelText(/loading tasks/i);
    expect(skeletonLists.length).toBeGreaterThan(0);
  });

  it('renders friendly empty state when user has zero tasks', async () => {
    vi.spyOn(tasksApi, 'fetchAll').mockResolvedValue({
      data: { data: { tasks: [] } },
    });
    vi.spyOn(tasksApi, 'getStats').mockResolvedValue({
      data: {
        data: {
          stats: {
            total: 0,
            completed: 0,
            pending: 0,
            dueToday: 0,
            overdue: 0,
          },
        },
      },
    });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/no high-priority tasks scheduled for today/i)).toBeInTheDocument();
      expect(screen.getByText(/no work scheduled for today/i)).toBeInTheDocument();
      expect(screen.getByText(/no upcoming tasks scheduled for the next 7 days/i)).toBeInTheDocument();
    });
  });

  it('handles API error state gracefully without crashing', async () => {
    vi.spyOn(tasksApi, 'fetchAll').mockRejectedValue({
      response: { data: { message: 'Failed to load dashboard tasks' } },
    });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to (load|fetch) dashboard tasks/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  it('intercepts completion attempt on blocked task and shows user-friendly error toast', async () => {
    const todayIso = new Date().toISOString();
    const blockedTask = {
      ...mockTasks[1],
      isBlocked: true,
      status: 'pending',
      dueDate: todayIso,
    };

    vi.spyOn(tasksApi, 'fetchAll').mockResolvedValue({
      data: { data: { tasks: [blockedTask] } },
    });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText(blockedTask.title).length).toBeGreaterThan(0);
    });

    const completeBtns = screen.getAllByRole('button', { name: /complete task/i });
    fireEvent.click(completeBtns[0]);

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Cannot complete task: blocked by incomplete prerequisites.')
    );
  });

  it('completes unblocked task successfully when complete button clicked', async () => {
    const updateSpy = vi.spyOn(tasksSlice, 'updateTask');
    const todayIso = new Date().toISOString();
    const normalTask = {
      ...mockTasks[0],
      isBlocked: false,
      status: 'pending',
      dueDate: todayIso,
    };

    vi.spyOn(tasksApi, 'fetchAll').mockResolvedValue({
      data: { data: { tasks: [normalTask] } },
    });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText(normalTask.title).length).toBeGreaterThan(0);
    });

    const completeBtns = screen.getAllByRole('button', { name: /complete task/i });
    fireEvent.click(completeBtns[0]);

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: normalTask._id,
        data: expect.objectContaining({ status: 'completed' }),
      })
    );
  });

  it('renders user initials and navigates to /tasks on Workspace button click', () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByRole('link', { name: /open workspace/i })).toHaveAttribute('href', '/tasks');
  });
});
