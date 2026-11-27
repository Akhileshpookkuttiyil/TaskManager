import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { TasksPage } from '../pages/TasksPage';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskDetailDrawer } from '../components/tasks/TaskDetailDrawer';
import { TaskFilters } from '../components/tasks/TaskFilters';
import { renderWithProviders, mockTasks, mockStats } from './test-utils';
import * as tasksSlice from '../store/slices/tasksSlice';
import toast from 'react-hot-toast';
import { tasksApi } from '../api/tasks.api';

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('Task Management Component Testing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(tasksApi, 'getAll').mockResolvedValue({
      data: {
        data: {
          tasks: mockTasks,
          pagination: { total: mockTasks.length, pages: 1, page: 1, limit: 10 },
        },
      },
    });
    vi.spyOn(tasksApi, 'fetchAll').mockResolvedValue({
      data: {
        data: {
          tasks: mockTasks,
        },
      },
    });
    vi.spyOn(tasksApi, 'getStats').mockResolvedValue({
      data: {
        data: {
          stats: mockStats,
        },
      },
    });
    vi.spyOn(tasksApi, 'create').mockImplementation((data) =>
      Promise.resolve({ data: { data: { task: { ...data, _id: 'task-created-1' } } } })
    );
    vi.spyOn(tasksApi, 'update').mockImplementation((id, data) =>
      Promise.resolve({ data: { data: { task: { ...data, _id: id } } } })
    );
    vi.spyOn(tasksApi, 'remove').mockResolvedValue({ data: { success: true } });
    vi.spyOn(tasksApi, 'getDependencies').mockResolvedValue({ data: { data: { dependencies: [] } } });
    vi.spyOn(tasksApi, 'getDependents').mockResolvedValue({ data: { data: { dependents: [] } } });
    vi.spyOn(tasksApi, 'getSubtasks').mockResolvedValue({ data: { data: { subtasks: [] } } });
  });

  describe('TasksPage Component', () => {
    it('renders task workspace with view switcher and task cards', async () => {
      renderWithProviders(<TasksPage />);

      expect(screen.getByText('Workspace Tasks')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /list/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /board/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /calendar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /timeline/i })).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Complete Phase 6 Frontend Component Testing')).toBeInTheDocument();
        expect(screen.getByText('Fix High Priority Security Vulnerability')).toBeInTheDocument();
        expect(screen.getByText('Setup Production Deployment Pipeline')).toBeInTheDocument();
      });
    });

    it('renders skeleton loading list while fetching tasks', () => {
      renderWithProviders(<TasksPage />, {
        preloadedState: {
          tasks: {
            items: [],
            loading: true,
            error: null,
            lastFetchedAt: Date.now(),
          },
        },
      });

      const skeletonLists = screen.getAllByLabelText(/loading tasks/i);
      expect(skeletonLists.length).toBeGreaterThan(0);
    });

    it('renders ErrorState when fetching tasks fails and allows retry', async () => {
      vi.spyOn(tasksApi, 'getAll').mockRejectedValueOnce('Failed to load tasks');

      renderWithProviders(<TasksPage />, {
        preloadedState: {
          tasks: {
            items: [],
            loading: false,
            error: 'Failed to load tasks',
          },
        },
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Failed to load tasks')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('renders empty state when task collection is empty', async () => {
      vi.spyOn(tasksApi, 'getAll').mockResolvedValue({
        data: { data: { tasks: [], pagination: { total: 0, pages: 1, page: 1, limit: 10 } } },
      });

      renderWithProviders(<TasksPage />, {
        preloadedState: {
          tasks: {
            items: [],
            loading: false,
            error: null,
            pagination: { total: 0, pages: 1, page: 1, limit: 10 },
          },
        },
      });

      await waitFor(() => {
        expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
        expect(screen.getByText('Create your first task to get started.')).toBeInTheDocument();
      });
    });
  });

  describe('TaskCard Component Interactions', () => {
    const sampleTask = mockTasks[0];

    it('renders task card with title, priority badge, tags, and due date', () => {
      renderWithProviders(
        <TaskCard
          task={sampleTask}
          onEdit={() => {}}
          onDelete={() => {}}
          onComplete={() => {}}
        />
      );

      expect(screen.getByText(sampleTask.title)).toBeInTheDocument();
      expect(screen.getByText(sampleTask.priority)).toBeInTheDocument();
      expect(screen.getByText('frontend')).toBeInTheDocument();
      expect(screen.getByText('testing')).toBeInTheDocument();
    });

    it('triggers onEdit callback when clicking on the task card', () => {
      const handleEdit = vi.fn();
      renderWithProviders(
        <TaskCard
          task={sampleTask}
          onEdit={handleEdit}
          onDelete={() => {}}
          onComplete={() => {}}
        />
      );

      const card = screen.getByText(sampleTask.title).closest('.card');
      fireEvent.click(card);

      expect(handleEdit).toHaveBeenCalledWith(sampleTask);
    });

    it('triggers onComplete callback when clicking the complete button', () => {
      const handleComplete = vi.fn();
      renderWithProviders(
        <TaskCard
          task={sampleTask}
          onEdit={() => {}}
          onDelete={() => {}}
          onComplete={handleComplete}
        />
      );

      const completeBtn = screen.getByLabelText(/mark task complete/i);
      fireEvent.click(completeBtn);

      expect(handleComplete).toHaveBeenCalledWith(sampleTask);
    });

    it('displays blocked indicator for incomplete blocked task', () => {
      const blockedTask = mockTasks[1]; // isBlocked: true
      renderWithProviders(
        <TaskCard
          task={blockedTask}
          onEdit={() => {}}
          onDelete={() => {}}
          onComplete={() => {}}
        />
      );

      expect(screen.getByTestId('blocked-badge')).toBeInTheDocument();
      expect(screen.getByText('Blocked')).toBeInTheDocument();
    });

    it('triggers onDelete callback when clicking the delete button', () => {
      const handleDelete = vi.fn();
      renderWithProviders(
        <TaskCard
          task={sampleTask}
          onEdit={() => {}}
          onDelete={handleDelete}
          onComplete={() => {}}
        />
      );

      const deleteBtn = screen.getByRole('button', { name: /^delete task/i });
      fireEvent.click(deleteBtn);
      expect(handleDelete).toHaveBeenCalledWith(sampleTask._id);
    });
  });

  describe('Task Detail Drawer (Creation & Editing Lifecycle)', () => {
    it('Task creation: enforces required title validation', async () => {
      renderWithProviders(
        <TaskDetailDrawer
          isOpen={true}
          onClose={() => {}}
          task={null}
        />
      );

      expect(screen.getByRole('dialog', { name: /new task/i })).toBeInTheDocument();

      const createBtn = screen.getByRole('button', { name: /create task/i });
      fireEvent.click(createBtn);

      expect(toast.error).toHaveBeenCalledWith('Task title is required.');
    });

    it('Task creation: populates template title and description', () => {
      renderWithProviders(
        <TaskDetailDrawer
          isOpen={true}
          onClose={() => {}}
          task={null}
        />
      );

      const templateBtn = screen.getByRole('button', { name: /templates/i });
      fireEvent.click(templateBtn);

      // Select Bug Report template
      const bugReportTemplate = screen.getByRole('menuitem', { name: /bug report/i });
      fireEvent.click(bugReportTemplate);

      const titleInput = screen.getByPlaceholderText('What needs to be done?');
      expect(titleInput.value).toBe('Bug Report');
    });

    it('Task creation: dispatches createTask with valid input values', async () => {
      const createTaskSpy = vi.spyOn(tasksSlice, 'createTask');
      const handleClose = vi.fn();

      renderWithProviders(
        <TaskDetailDrawer
          isOpen={true}
          onClose={handleClose}
          task={null}
        />
      );

      const titleInput = screen.getByPlaceholderText('What needs to be done?');
      fireEvent.change(titleInput, { target: { value: 'New Test Automation Task' } });

      const prioritySelect = screen.getByLabelText(/^priority$/i);
      fireEvent.change(prioritySelect, { target: { value: 'high' } });

      const tagsInput = screen.getByLabelText(/^labels \/ tags$/i);
      fireEvent.change(tagsInput, { target: { value: 'qa, release' } });

      const submitBtn = screen.getByRole('button', { name: /create task/i });
      fireEvent.click(submitBtn);

      expect(createTaskSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Test Automation Task',
          priority: 'high',
          tags: ['qa', 'release'],
        })
      );
    });

    it('Task editing: populates existing task fields and saves updates', async () => {
      const updateTaskSpy = vi.spyOn(tasksSlice, 'updateTask');
      const existingTask = mockTasks[0];

      renderWithProviders(
        <TaskDetailDrawer
          isOpen={true}
          onClose={() => {}}
          task={existingTask}
        />
      );

      expect(screen.getByRole('dialog', { name: /task details/i })).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByDisplayValue(existingTask.title)).toBeInTheDocument();
      });

      // Change priority
      const prioritySelect = screen.getByLabelText(/^priority$/i);
      fireEvent.change(prioritySelect, { target: { value: 'low' } });

      expect(updateTaskSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: existingTask._id,
          data: expect.objectContaining({
            priority: 'low',
          }),
        })
      );
    });

    it('Task editing: prevents completed status transition when task is blocked', async () => {
      const blockedTask = { ...mockTasks[1], isBlocked: true, status: 'pending' };

      renderWithProviders(
        <TaskDetailDrawer
          isOpen={true}
          onClose={() => {}}
          task={blockedTask}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue(blockedTask.title)).toBeInTheDocument();
      });

      const statusSelect = screen.getByLabelText(/^status$/i);
      fireEvent.change(statusSelect, { target: { value: 'completed' } });

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Cannot complete task: blocked by incomplete prerequisites.')
      );
    });

    it('closes drawer on Escape key press', () => {
      const handleClose = vi.fn();
      renderWithProviders(
        <TaskDetailDrawer
          isOpen={true}
          onClose={handleClose}
          task={null}
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('TaskFilters Component', () => {
    it('dispatches setFilters when typing search query', async () => {
      const setFiltersSpy = vi.spyOn(tasksSlice, 'setFilters');

      renderWithProviders(<TaskFilters />);

      const searchInput = screen.getByLabelText(/search tasks/i);
      fireEvent.change(searchInput, { target: { value: 'security audit' } });

      await waitFor(() => {
        expect(setFiltersSpy).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'security audit' })
        );
      });
    });

    it('clears all active filters when Clear Filters is clicked', () => {
      const setFiltersSpy = vi.spyOn(tasksSlice, 'setFilters');

      renderWithProviders(<TaskFilters />, {
        preloadedState: {
          tasks: {
            filters: {
              status: 'in_progress',
              priority: 'high',
              search: 'test',
              tag: '',
              dueDate: '',
              sortBy: 'createdAt',
              order: 'desc',
            },
          },
        },
      });

      const clearBtn = screen.getByRole('button', { name: /clear filters/i });
      fireEvent.click(clearBtn);

      expect(setFiltersSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: '',
          priority: '',
          dueDate: '',
          search: '',
        })
      );
    });
  });
});
