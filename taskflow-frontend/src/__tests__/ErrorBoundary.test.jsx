import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { sanitizeErrorDetails } from '../utils/sanitize';

// Helper component that throws an error when shouldThrow is true
const ProblemChild = ({ shouldThrow, message = 'Rendering failed' }) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div data-testid="child-content">Normal Content</div>;
};

// Stateful parent to test recovery mechanism
const RecoverableWrapper = ({ initialThrow = true }) => {
  const [hasFault, setHasFault] = useState(initialThrow);
  return (
    <ErrorBoundary onReset={() => setHasFault(false)}>
      <ProblemChild shouldThrow={hasFault} />
    </ErrorBoundary>
  );
};

describe('ErrorBoundary Component', () => {
  let originalConsoleError;

  beforeEach(() => {
    // Silence React's internal console.error during deliberate error boundary tests
    originalConsoleError = console.error;
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('renders children normally when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Normal Content')).toBeInTheDocument();
  });

  it('catches rendering errors and displays user-friendly fallback without blank screen', () => {
    render(
      <ErrorBoundary name="TestWidget">
        <ProblemChild shouldThrow={true} message="Crash in child" />
      </ErrorBoundary>
    );

    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Unable to display this section')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('does NOT display raw internal stack traces to the end user', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} message="Database query timeout in Component.jsx:42" />
      </ErrorBoundary>
    );

    // Fallback title should be friendly
    expect(screen.getByText('Unable to display this section')).toBeInTheDocument();
    // Raw stack trace words like at Object.<anonymous> or filename paths should not be rendered
    expect(screen.queryByText(/at Object\./i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Component\.jsx:42/i)).not.toBeInTheDocument();
  });

  it('supports recovery mechanism via Try again button and onReset callback', () => {
    render(<RecoverableWrapper initialThrow={true} />);

    // Initially in error state
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();

    // Click Try again
    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);

    // Child should have recovered
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('calls onError callback prop when an error is caught', () => {
    const onErrorMock = vi.fn();

    render(
      <ErrorBoundary onError={onErrorMock}>
        <ProblemChild shouldThrow={true} message="Custom failure" />
      </ErrorBoundary>
    );

    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock.mock.calls[0][0].message).toBe('Custom failure');
  });

  it('renders custom fallback element when provided', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom error message</div>}>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('renders custom fallback function with resetErrorBoundary prop', () => {
    const customFallbackFn = vi.fn(({ error, resetErrorBoundary }) => (
      <div data-testid="fn-fallback">
        <span>Error: {error?.message}</span>
        <button type="button" onClick={resetErrorBoundary}>
          Custom Reset
        </button>
      </div>
    ));

    render(
      <ErrorBoundary fallback={customFallbackFn}>
        <ProblemChild shouldThrow={true} message="Fn error" />
      </ErrorBoundary>
    );

    expect(customFallbackFn).toHaveBeenCalled();
    expect(screen.getByTestId('fn-fallback')).toBeInTheDocument();
    expect(screen.getByText('Error: Fn error')).toBeInTheDocument();
  });

  it('renders page variant with reload and dashboard navigation buttons', () => {
    render(
      <ErrorBoundary variant="page">
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument();
  });

  it('renders inline variant with minimal alert badge', () => {
    render(
      <ErrorBoundary variant="inline">
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Failed to display this item.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('isolates sub-component failure from breaking adjacent components', () => {
    render(
      <div>
        <div data-testid="sibling-header">Healthy Header</div>
        <ErrorBoundary name="FailingWidget">
          <ProblemChild shouldThrow={true} />
        </ErrorBoundary>
        <div data-testid="sibling-footer">Healthy Footer</div>
      </div>
    );

    // Header and footer remain completely intact
    expect(screen.getByTestId('sibling-header')).toBeInTheDocument();
    expect(screen.getByTestId('sibling-footer')).toBeInTheDocument();
    // Only the middle widget is replaced by the error boundary
    expect(screen.getByTestId('error-boundary-FailingWidget')).toBeInTheDocument();
  });

  it('sanitizes tokens and passwords from error details', () => {
    const sensitiveError = new Error(
      'Auth failure for Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token123 and password="SuperSecretPassword123"'
    );

    const { message } = sanitizeErrorDetails(sensitiveError);

    expect(message).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(message).not.toContain('SuperSecretPassword123');
    expect(message).toContain('[REDACTED]');
  });
});
