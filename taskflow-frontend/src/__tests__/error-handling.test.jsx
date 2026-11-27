import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorState } from '../components/ui/ErrorState';
import api from '../api/client';
import { loginUser } from '../store/slices/authSlice';
import { fetchTasks } from '../store/slices/tasksSlice';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/slices/authSlice';
import tasksReducer from '../store/slices/tasksSlice';

describe('Frontend Application Error Handling', () => {
  describe('ErrorState Component', () => {
    it('renders with default message when no props provided', () => {
      render(<ErrorState />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(
        screen.getByText('Failed to load data. Please check your connection and try again.')
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });

    it('renders custom title and message and executes onRetry handler', () => {
      const retrySpy = vi.fn();
      render(
        <ErrorState
          title="Custom API Error"
          message="Could not load your task list."
          onRetry={retrySpy}
        />
      );

      expect(screen.getByText('Custom API Error')).toBeInTheDocument();
      expect(screen.getByText('Could not load your task list.')).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryBtn);
      expect(retrySpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Axios Client Error Interceptor', () => {
    let originalLocation;

    beforeEach(() => {
      localStorage.clear();
      originalLocation = window.location;
      delete window.location;
      window.location = {
        pathname: '/tasks',
        assign: vi.fn(),
      };
    });

    afterEach(() => {
      window.location = originalLocation;
    });

    it('intercepts 401 unauthorized and clears token and redirects to /login', async () => {
      localStorage.setItem('token', 'expired-mock-token');

      // Call the response error interceptor directly
      const responseInterceptor = api.interceptors.response.handlers[0].rejected;

      const mockError = {
        config: { url: '/tasks' },
        response: { status: 401, data: { message: 'Token expired' } },
      };

      await expect(responseInterceptor(mockError)).rejects.toBe(mockError);

      expect(localStorage.getItem('token')).toBeNull();
      expect(window.location.assign).toHaveBeenCalledWith('/login');
    });

    it('does NOT redirect to /login when 401 occurs on /auth/me to avoid loops', async () => {
      localStorage.setItem('token', 'invalid-token');

      const responseInterceptor = api.interceptors.response.handlers[0].rejected;

      const mockAuthMeError = {
        config: { url: '/api/auth/me' },
        response: { status: 401, data: { message: 'Invalid token' } },
      };

      await expect(responseInterceptor(mockAuthMeError)).rejects.toBe(mockAuthMeError);

      expect(window.location.assign).not.toHaveBeenCalled();
    });

    it('attaches userMessage to network disconnection errors without leaking sensitive data', async () => {
      const responseInterceptor = api.interceptors.response.handlers[0].rejected;

      const networkError = {
        config: { url: '/tasks', headers: { Authorization: 'Bearer secret-jwt-token' } },
        message: 'Network Error',
        response: undefined,
      };

      await expect(responseInterceptor(networkError)).rejects.toBe(networkError);

      expect(networkError.userMessage.toLowerCase()).toContain('network');
      expect(networkError.userMessage).not.toContain('secret-jwt-token');
    });
  });

  describe('Redux Slice Error Interception', () => {
    it('authSlice gracefully records rejection error without crashing', async () => {
      const store = configureStore({
        reducer: { auth: authReducer },
      });

      // Dispatch rejected action with error payload
      store.dispatch(loginUser.rejected(null, 'req-1', {}, 'Invalid credentials'));

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Invalid credentials');
    });

    it('tasksSlice gracefully records rejection error and resets loading', async () => {
      const store = configureStore({
        reducer: { tasks: tasksReducer },
      });

      store.dispatch(fetchTasks.rejected(null, 'req-2', {}, 'Failed to load tasks'));

      const state = store.getState().tasks;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Failed to load tasks');
    });
  });
});
