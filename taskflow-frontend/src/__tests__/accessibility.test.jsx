import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/slices/authSlice';
import tasksReducer from '../store/slices/tasksSlice';
import notificationsReducer from '../store/slices/notificationsSlice';
import activityReducer from '../store/slices/activitySlice';
import { Modal } from '../components/ui/Modal';
import { ShortcutsModal } from '../components/ui/ShortcutsModal';
import { PomodoroModal } from '../components/pomodoro/PomodoroModal';
import { PomodoroProvider } from '../context/PomodoroContext';
import { usePomodoro } from '../context/pomodoro-context';
import { Spinner } from '../components/ui/Spinner';
import { FieldError } from '../components/ui/shared';
import { ErrorState } from '../components/ui/ErrorState';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { AppLayout } from '../components/layout/AppLayout';
import { ThemeProvider } from '../components/theme/ThemeProvider';

const createMockStore = (initialState = {}) =>
  configureStore({
    reducer: {
      auth: authReducer,
      tasks: tasksReducer,
      notifications: notificationsReducer,
      activity: activityReducer,
    },
    preloadedState: {
      auth: {
        user: { id: 'u1', name: 'Test User', email: 'test@example.com' },
        token: 'test-token',
        loading: false,
        error: null,
        initialized: true,
      },
      tasks: {
        items: [],
        loading: false,
        stats: { total: 0, pending: 0, in_progress: 0, completed: 0, tags: [] },
      },
      notifications: {
        items: [],
        unreadCount: 0,
        loading: false,
      },
      activity: {
        items: [],
        loading: false,
      },
      ...initialState,
    },
  });

describe('Accessibility Standards (WCAG 2.2 AA)', () => {
  describe('Modal Focus Management & Keyboard Navigation', () => {
    it('Modal renders with proper dialog role, aria-modal, and labelledby', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Dialog" description="Dialog explanation">
          <div>Modal Body</div>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'modal-description');
      expect(screen.getByText('Test Dialog')).toHaveAttribute('id', 'modal-title');
      expect(screen.getByText('Dialog explanation')).toHaveAttribute('id', 'modal-description');
    });

    it('Modal closes when pressing the Escape key', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Escape Test">
          <button type="button">Action</button>
        </Modal>
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('traps focus inside Modal when tabbing through interactive elements', async () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Focus Trap Dialog">
          <input data-testid="input-1" placeholder="First" />
          <input data-testid="input-2" placeholder="Second" />
          <button type="button" data-testid="btn-action">Submit</button>
        </Modal>
      );

      const closeBtn = screen.getByLabelText('Close dialog');
      const submitBtn = screen.getByTestId('btn-action');

      // Forward Tab from submitBtn (last element) should wrap to closeBtn (first element)
      submitBtn.focus();
      expect(document.activeElement).toBe(submitBtn);

      fireEvent.keyDown(window, { key: 'Tab', shiftKey: false });
      expect(document.activeElement).toBe(closeBtn);

      // Backward Tab from closeBtn (first element) should wrap to submitBtn (last element)
      closeBtn.focus();
      fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(submitBtn);
    });

    it('restores focus to previously active element when Modal closes', async () => {
      const TestContainer = () => {
        const [open, setOpen] = useState(false);
        return (
          <div>
            <button
              type="button"
              data-testid="open-trigger"
              onClick={() => setOpen(true)}
            >
              Open Dialog
            </button>
            <Modal isOpen={open} onClose={() => setOpen(false)} title="Test">
              <button
                type="button"
                data-testid="modal-close-action"
                onClick={() => setOpen(false)}
              >
                Done
              </button>
            </Modal>
          </div>
        );
      };

      render(<TestContainer />);

      const triggerBtn = screen.getByTestId('open-trigger');
      triggerBtn.focus();
      expect(document.activeElement).toBe(triggerBtn);

      // Open modal
      fireEvent.click(triggerBtn);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Close modal
      const closeAction = screen.getByTestId('modal-close-action');
      fireEvent.click(closeAction);

      // Modal closed, focus restored to triggerBtn
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(document.activeElement).toBe(triggerBtn);
    });
  });

  describe('ShortcutsModal Accessibility', () => {
    it('renders with role="dialog", aria-modal="true", and accessible title', () => {
      render(<ShortcutsModal isOpen={true} onClose={() => {}} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'shortcuts-modal-title');
      expect(screen.getByLabelText('Close shortcuts dialog')).toBeInTheDocument();
    });

    it('closes on Escape key press', () => {
      const handleClose = vi.fn();
      render(<ShortcutsModal isOpen={true} onClose={handleClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('PomodoroModal Accessibility', () => {
    it('renders with dialog role, accessible label, and close button with label', () => {
      const store = createMockStore();
      const PomodoroTestHarness = () => {
        const { openModal } = usePomodoro();
        return (
          <div>
            <button type="button" onClick={openModal}>Open Timer</button>
            <PomodoroModal />
          </div>
        );
      };

      render(
        <Provider store={store}>
          <PomodoroProvider>
            <PomodoroTestHarness />
          </PomodoroProvider>
        </Provider>
      );

      fireEvent.click(screen.getByText('Open Timer'));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-label', 'Pomodoro Focus Timer');
      expect(screen.getByLabelText('Close timer')).toBeInTheDocument();

      // Escape key closes it
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Skip to Main Content Link', () => {
    it('AppLayout provides accessible skip to content link targeting #main-content', () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <ThemeProvider>
            <MemoryRouter initialEntries={['/']}>
              <AppLayout />
            </MemoryRouter>
          </ThemeProvider>
        </Provider>
      );

      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');

      const mainContent = document.getElementById('main-content');
      expect(mainContent).toBeInTheDocument();
      expect(mainContent).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Semantic Form Accessibility', () => {
    it('LoginPage form inputs have proper label association and validation error attributes', async () => {
      const store = createMockStore({ auth: { token: null, user: null, loading: false } });
      render(
        <Provider store={store}>
          <ThemeProvider>
            <MemoryRouter>
              <LoginPage />
            </MemoryRouter>
          </ThemeProvider>
        </Provider>
      );

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);

      expect(emailInput).toHaveAttribute('id', 'login-email');
      expect(passwordInput).toHaveAttribute('id', 'login-password');

      // Set email but leave password empty to trigger field validation
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      // Password input now has aria-invalid="true" and aria-describedby pointing to error alert
      expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
      expect(passwordInput).toHaveAttribute('aria-describedby', 'login-password-error');

      const passwordError = document.getElementById('login-password-error');
      expect(passwordError).toBeInTheDocument();
      expect(passwordError).toHaveAttribute('role', 'alert');
    });

    it('RegisterPage form controls have semantic labels, aria-invalid, and alert roles on errors', async () => {
      const store = createMockStore({ auth: { token: null, user: null, loading: false } });
      render(
        <Provider store={store}>
          <ThemeProvider>
            <MemoryRouter>
              <RegisterPage />
            </MemoryRouter>
          </ThemeProvider>
        </Provider>
      );

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);

      expect(nameInput).toBeInTheDocument();
      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();

      // Submit empty form
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      expect(nameInput).toHaveAttribute('aria-describedby', 'register-name-error');

      const nameError = document.getElementById('register-name-error');
      expect(nameError).toBeInTheDocument();
      expect(nameError).toHaveAttribute('role', 'alert');
    });
  });

  describe('Screen Reader Status & Live Regions', () => {
    it('Spinner provides role="status" and sr-only accessible text', () => {
      render(<Spinner size="md" />);

      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
      expect(screen.getByText('Loading...')).toHaveClass('sr-only');
    });

    it('FieldError has role="alert" and aria-live="polite"', () => {
      render(<FieldError id="test-error" message="Invalid email address" />);

      const error = screen.getByRole('alert');
      expect(error).toBeInTheDocument();
      expect(error).toHaveAttribute('id', 'test-error');
      expect(error).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });

    it('ErrorState renders role="alert" with title and accessible retry button', () => {
      const retryMock = vi.fn();
      render(
        <ErrorState
          title="Connection Failure"
          message="Server is unreachable"
          onRetry={retryMock}
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(screen.getByText('Connection Failure')).toBeInTheDocument();
      expect(screen.getByText('Server is unreachable')).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryBtn);
      expect(retryMock).toHaveBeenCalledTimes(1);
    });
  });
});
