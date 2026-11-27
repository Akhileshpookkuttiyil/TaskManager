import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ProfilePage } from '../pages/ProfilePage';
import { UserMenu } from '../components/layout/UserMenu';
import { renderWithProviders, mockUser } from './test-utils';
import * as authSlice from '../store/slices/authSlice';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('Authentication & Profile Component Testing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LoginPage Component', () => {
    it('renders sign in form with title, inputs, and submit button', () => {
      renderWithProviders(<LoginPage />, {
        preloadedState: { auth: { user: null, token: null, loading: false } },
      });

      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /create one/i })).toHaveAttribute('href', '/register');
    });

    it('toggles password visibility between text and password types', () => {
      renderWithProviders(<LoginPage />, {
        preloadedState: { auth: { user: null, token: null, loading: false } },
      });

      const passwordInput = screen.getByLabelText(/^password$/i);
      const toggleBtn = screen.getByLabelText(/show password/i);

      expect(passwordInput).toHaveAttribute('type', 'password');

      fireEvent.click(toggleBtn);
      expect(passwordInput).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText(/hide password/i)).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText(/hide password/i));
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('validates empty inputs and prevents submission', () => {
      renderWithProviders(<LoginPage />, {
        preloadedState: { auth: { user: null, token: null, loading: false } },
      });

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);

      // Clear both fields
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: '' } });

      const submitBtn = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitBtn);

      expect(toast.error).toHaveBeenCalledWith('Please complete the required fields.');
    });

    it('submits login payload with valid credentials', async () => {
      const loginSpy = vi.spyOn(authSlice, 'loginUser');
      renderWithProviders(<LoginPage />, {
        preloadedState: { auth: { user: null, token: null, loading: false } },
      });

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);

      fireEvent.change(emailInput, { target: { value: 'akhilesh@gmail.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      const submitBtn = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitBtn);

      expect(loginSpy).toHaveBeenCalledWith({
        email: 'akhilesh@gmail.com',
        password: 'password123',
      });
    });
  });

  describe('RegisterPage Component', () => {
    it('renders register form with name, email, password fields', () => {
      renderWithProviders(<RegisterPage />, {
        preloadedState: { auth: { user: null, token: null, loading: false } },
      });

      expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/^full name$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
    });

    it('validates minimum password length', () => {
      renderWithProviders(<RegisterPage />, {
        preloadedState: { auth: { user: null, token: null, loading: false } },
      });

      const nameInput = screen.getByLabelText(/^full name$/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);

      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: '123' } }); // < 6 chars

      const submitBtn = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitBtn);

      expect(toast.error).toHaveBeenCalledWith('Please complete the required fields.');
      expect(screen.getByText('Use at least 6 characters.')).toBeInTheDocument();
    });

    it('submits registration with valid credentials', () => {
      const registerSpy = vi.spyOn(authSlice, 'registerUser');
      renderWithProviders(<RegisterPage />, {
        preloadedState: { auth: { user: null, token: null, loading: false } },
      });

      const nameInput = screen.getByLabelText(/^full name$/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);

      fireEvent.change(nameInput, { target: { value: 'Valid User' } });
      fireEvent.change(emailInput, { target: { value: 'valid@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'SecurePass123' } });

      const submitBtn = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitBtn);

      expect(registerSpy).toHaveBeenCalledWith({
        name: 'Valid User',
        email: 'valid@example.com',
        password: 'SecurePass123',
      });
    });
  });

  describe('ProfilePage & UserMenu Component', () => {
    it('renders user details and summary cards', () => {
      renderWithProviders(<ProfilePage />);

      expect(screen.getByRole('heading', { name: /profile settings/i })).toBeInTheDocument();
      expect(screen.getAllByText(mockUser.name).length).toBeGreaterThan(0);
      expect(screen.getAllByText(mockUser.email).length).toBeGreaterThan(0);
      expect(screen.getByText('Account summary')).toBeInTheDocument();
      expect(screen.getByText('Productivity at a glance')).toBeInTheDocument();
    });

    it('dispatches updateProfile with updated name and email', () => {
      const updateProfileSpy = vi.spyOn(authSlice, 'updateProfile');
      renderWithProviders(<ProfilePage />);

      const nameInput = screen.getByLabelText(/^name$/i);
      fireEvent.change(nameInput, { target: { value: 'Updated Akhilesh' } });

      const submitBtn = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(submitBtn);

      expect(updateProfileSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Akhilesh',
          email: mockUser.email,
        })
      );
    });

    it('validates password change requires both current and new password', () => {
      renderWithProviders(<ProfilePage />);

      const currentPwInput = screen.getByLabelText(/^current password$/i);
      fireEvent.change(currentPwInput, { target: { value: 'currentPass123' } });

      const submitBtn = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(submitBtn);

      expect(toast.error).toHaveBeenCalledWith('Please resolve the required fields.');
      expect(screen.getByText('Enter new password.')).toBeInTheDocument();
    });

    it('UserMenu displays account details and dispatches logout on Sign out', () => {
      const logoutSpy = vi.spyOn(authSlice, 'logout');
      const triggerRef = { current: document.createElement('button') };

      renderWithProviders(
        <UserMenu
          isOpen={true}
          onClose={() => {}}
          onOpenShortcuts={() => {}}
          triggerRef={triggerRef}
          id="user-menu"
        />
      );

      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
      expect(screen.getByText(mockUser.email)).toBeInTheDocument();

      const signOutBtn = screen.getByRole('menuitem', { name: /sign out/i });
      fireEvent.click(signOutBtn);

      expect(logoutSpy).toHaveBeenCalledTimes(1);
    });
  });
});

