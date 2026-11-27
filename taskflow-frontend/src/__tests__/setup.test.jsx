import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Frontend Testing Infrastructure', () => {
  it('renders test component and verifies jest-dom matchers', () => {
    render(<div data-testid="test-element">TaskFlow Test</div>);
    const element = screen.getByTestId('test-element');
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('TaskFlow Test');
  });
});
