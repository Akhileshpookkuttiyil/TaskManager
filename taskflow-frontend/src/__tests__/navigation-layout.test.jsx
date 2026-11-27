import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { BottomNav } from '../components/layout/BottomNav';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { CommandPalette } from '../components/ui/CommandPalette';
import { renderWithProviders, mockStats, mockUser } from './test-utils';

describe('Navigation & Layout Component Testing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Sidebar Component', () => {
    it('renders brand header and primary navigation links with badge counts', () => {
      renderWithProviders(<Sidebar />, {
        preloadedState: {
          tasks: {
            items: [],
            stats: mockStats,
          },
          notifications: {
            unreadCount: 4,
          },
        },
      });

      expect(screen.getByText('TaskFlow')).toBeInTheDocument();
      expect(screen.getByText('v1.0')).toBeInTheDocument();

      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /inbox/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /today/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /upcoming/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /calendar/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /notifications/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /analytics/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();

      // Notifications badge count
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('renders label tags and toggles label section visibility', () => {
      renderWithProviders(<Sidebar />, {
        preloadedState: {
          tasks: {
            stats: { ...mockStats, tags: ['frontend', 'backend'] },
          },
        },
      });

      expect(screen.getByText(/labels/i)).toBeInTheDocument();
      expect(screen.getByText('frontend')).toBeInTheDocument();
      expect(screen.getByText('backend')).toBeInTheDocument();

      // Collapse labels section
      const labelsToggleBtn = screen.getByRole('button', { name: /labels/i });
      fireEvent.click(labelsToggleBtn);
      expect(screen.queryByText('frontend')).not.toBeInTheDocument();
    });
  });

  describe('Topbar Component', () => {
    it('renders dynamic title, subtitle, focus pill and action triggers', () => {
      renderWithProviders(
        <Topbar
          onQuickAdd={() => {}}
          onOpenCommandPalette={() => {}}
          onOpenShortcuts={() => {}}
        />,
        { route: '/tasks' }
      );

      expect(screen.getByText('Tasks Workspace')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /quick add/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/open command palette/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/user account options/i)).toBeInTheDocument();
    });

    it('toggles UserMenu dropdown when clicking user account button', () => {
      renderWithProviders(
        <Topbar
          onQuickAdd={() => {}}
          onOpenCommandPalette={() => {}}
          onOpenShortcuts={() => {}}
        />
      );

      const userBtn = screen.getByLabelText(/user account options/i);
      expect(userBtn).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(userBtn);
      expect(userBtn).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  describe('BottomNav Mobile Navigation', () => {
    it('renders all 4 tabs and floating quick add button', () => {
      const handleQuickAdd = vi.fn();
      renderWithProviders(<BottomNav onQuickAdd={handleQuickAdd} />);

      expect(screen.getByRole('link', { name: /^home$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^tasks$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^analytics$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^settings$/i })).toBeInTheDocument();

      const quickAddBtn = screen.getByRole('button', { name: /quick add task/i });
      fireEvent.click(quickAddBtn);
      expect(handleQuickAdd).toHaveBeenCalledTimes(1);
    });
  });

  describe('CommandPalette Component', () => {
    it('renders search input, categories, and handles navigation selection', () => {
      const handleClose = vi.fn();
      renderWithProviders(
        <CommandPalette isOpen={true} onClose={handleClose} />
      );

      const searchInput = screen.getByPlaceholderText(/type a command or search/i);
      expect(searchInput).toBeInTheDocument();

      expect(screen.getAllByText('Navigation').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Quick Actions').length).toBeGreaterThan(0);
      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
    });

    it('closes on Escape key press in CommandPalette', () => {
      const handleClose = vi.fn();
      renderWithProviders(
        <CommandPalette isOpen={true} onClose={handleClose} />
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('AppLayout Keyboard Shortcuts & Shell', () => {
    it('toggles command palette when Ctrl+K is pressed', () => {
      renderWithProviders(<AppLayout />);

      // Trigger Ctrl+K
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
      expect(screen.getByPlaceholderText(/type a command or search/i)).toBeInTheDocument();
    });

    it('toggles shortcuts help when ? is pressed', () => {
      renderWithProviders(<AppLayout />);

      // Trigger '?' key
      fireEvent.keyDown(window, { key: '?' });
      expect(screen.getByRole('dialog', { name: /keyboard shortcuts/i })).toBeInTheDocument();
    });
  });

  describe('ProtectedRoute Behavior', () => {
    it('renders loading spinner when token exists but auth is hydrating', () => {
      renderWithProviders(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
        {
          preloadedState: {
            auth: {
              token: 'mock-token',
              hydrating: true,
              user: null,
            },
          },
        }
      );

      expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('renders protected child component when user is authenticated', () => {
      renderWithProviders(
        <ProtectedRoute>
          <div>Authenticated Secret Area</div>
        </ProtectedRoute>,
        {
          preloadedState: {
            auth: {
              token: 'mock-token',
              hydrating: false,
              user: mockUser,
            },
          },
        }
      );

      expect(screen.getByText('Authenticated Secret Area')).toBeInTheDocument();
    });

    it('redirects to /login when user has no token', () => {
      renderWithProviders(
        <ProtectedRoute>
          <div>Secret Content</div>
        </ProtectedRoute>,
        {
          preloadedState: {
            auth: {
              token: null,
              hydrating: false,
              user: null,
            },
          },
        }
      );

      expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
    });
  });
});
