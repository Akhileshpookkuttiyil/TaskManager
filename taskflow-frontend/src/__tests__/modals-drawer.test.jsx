import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEffect } from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Modal } from '../components/ui/Modal';
import { ShortcutsModal } from '../components/ui/ShortcutsModal';
import { PomodoroModal } from '../components/pomodoro/PomodoroModal';
import { usePomodoro } from '../context/pomodoro-context';
import { TaskDependencies } from '../components/tasks/TaskDependencies';
import { TaskDetailDrawer } from '../components/tasks/TaskDetailDrawer';
import { renderWithProviders, mockTasks } from './test-utils';
import { tasksApi } from '../api/tasks.api';

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('Modal & Drawer Component Testing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Component Behavior', () => {
    it('renders modal dialog when isOpen is true', () => {
      renderWithProviders(
        <Modal isOpen={true} onClose={() => {}} title="Test Dialog Modal">
          <p>Dialog Body Message</p>
        </Modal>
      );

      const dialog = screen.getByRole('dialog', { name: 'Test Dialog Modal' });
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByText('Dialog Body Message')).toBeInTheDocument();
    });

    it('does not render modal when isOpen is false', () => {
      renderWithProviders(
        <Modal isOpen={false} onClose={() => {}} title="Hidden Modal">
          <p>Hidden Content</p>
        </Modal>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes on clicking the backdrop', () => {
      const handleClose = vi.fn();
      renderWithProviders(
        <Modal isOpen={true} onClose={handleClose} title="Backdrop Test">
          <p>Modal Inner</p>
        </Modal>
      );

      const backdrop = screen.getByRole('button', { name: 'Close dialog backdrop' });
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('closes on clicking the close button', () => {
      const handleClose = vi.fn();
      renderWithProviders(
        <Modal isOpen={true} onClose={handleClose} title="Close Button Test">
          <p>Modal Content</p>
        </Modal>
      );

      const closeBtn = screen.getByRole('button', { name: 'Close dialog' });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('ShortcutsModal Component Behavior', () => {
    it('renders shortcut list table when open', () => {
      renderWithProviders(
        <ShortcutsModal isOpen={true} onClose={() => {}} />
      );

      expect(screen.getByRole('dialog', { name: /keyboard shortcuts/i })).toBeInTheDocument();
      expect(screen.getByText('Quick add a new task')).toBeInTheDocument();
      expect(screen.getByText('Toggle Global Command Palette')).toBeInTheDocument();
    });

    it('calls onClose on backdrop click', () => {
      const handleClose = vi.fn();
      renderWithProviders(
        <ShortcutsModal isOpen={true} onClose={handleClose} />
      );

      const backdrop = screen.getByRole('dialog').previousElementSibling;
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(handleClose).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('PomodoroModal Behavior & Controls', () => {
    it('renders countdown timer, controls, and session duration settings', () => {
      const PomodoroTestWrapper = () => {
        const { openModal } = usePomodoro();
        useEffect(() => {
          openModal();
        }, [openModal]);
        return <PomodoroModal />;
      };

      renderWithProviders(<PomodoroTestWrapper />);

      expect(screen.getByRole('dialog', { name: /pomodoro focus timer/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start focus timer/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset timer/i })).toBeInTheDocument();
      expect(screen.getByText('25:00')).toBeInTheDocument();
    });
  });

  describe('TaskDetailDrawer Subtask & Dependency Interactions', () => {
    const sampleTask = mockTasks[0];

    it('subtask creation: adds new subtask title and calls API', async () => {
      vi.spyOn(tasksApi, 'getSubtasks').mockResolvedValue({
        data: { data: { subtasks: [] } },
      });
      const createSubtaskSpy = vi.spyOn(tasksApi, 'createSubtask').mockResolvedValue({
        data: {
          data: {
            subtask: {
              _id: 'sub-new-1',
              title: 'Write automated unit test',
              status: 'pending',
            },
            progress: { total: 1, completed: 0, percent: 0 },
          },
        },
      });

      renderWithProviders(
        <TaskDetailDrawer
          isOpen={true}
          onClose={() => {}}
          task={sampleTask}
        />
      );

      const subtaskInput = screen.getByPlaceholderText(/add a subtask\.\.\./i);
      fireEvent.change(subtaskInput, { target: { value: 'Write automated unit test' } });

      const addBtn = screen.getByRole('button', { name: /^add$/i });
      fireEvent.click(addBtn);

      expect(createSubtaskSpy).toHaveBeenCalledWith(
        sampleTask._id,
        expect.objectContaining({ title: 'Write automated unit test' })
      );
    });

    it('TaskDependencies renders prerequisites and dependents tabs', async () => {
      vi.spyOn(tasksApi, 'getDependencies').mockResolvedValue({
        data: { data: { dependencies: [] } },
      });
      vi.spyOn(tasksApi, 'getDependents').mockResolvedValue({
        data: { data: { dependents: [] } },
      });

      renderWithProviders(
        <TaskDependencies
          taskId={sampleTask._id}
          allTasks={mockTasks}
          onDependenciesChanged={() => {}}
        />
      );

      expect(screen.getByRole('button', { name: /prerequisites/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /dependents/i })).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText(/no prerequisites yet/i)).toBeInTheDocument();
      });
    });

    it('TaskDependencies renders blocked notice banner when task has incomplete prerequisites', async () => {
      vi.spyOn(tasksApi, 'getDependencies').mockResolvedValue({
        data: {
          data: {
            dependencies: [
              {
                _id: 'dep-1',
                prerequisite: { _id: 'task-prereq-1', title: 'API Schema Migration', status: 'in_progress' },
              },
            ],
          },
        },
      });
      vi.spyOn(tasksApi, 'getDependents').mockResolvedValue({
        data: { data: { dependents: [] } },
      });

      renderWithProviders(
        <TaskDependencies
          taskId="task-target-1"
          allTasks={mockTasks}
          onDependenciesChanged={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('blocked-warning-banner')).toBeInTheDocument();
        expect(screen.getByText(/cannot complete: task is blocked/i)).toBeInTheDocument();
        expect(screen.getAllByText('API Schema Migration').length).toBeGreaterThan(0);
      });
    });
  });
});
