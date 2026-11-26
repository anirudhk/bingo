import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalculationFeedback } from './CalculationFeedback';

const bar = (props: Partial<React.ComponentProps<typeof CalculationFeedback>>) =>
  render(
    <CalculationFeedback
      calculation="2 + 4"
      result={6}
      target={6}
      isCorrect
      isVisible
      onContinue={vi.fn()}
      {...props}
    />
  );

describe('<CalculationFeedback /> praise', () => {
  it('starts plain and builds with the combo', () => {
    const { rerender } = bar({ combo: 1 });
    expect(screen.getByText('Correct!')).toBeInTheDocument();
    rerender(
      <CalculationFeedback
        calculation="2 + 4"
        result={6}
        target={6}
        isCorrect
        isVisible
        combo={2}
        onContinue={vi.fn()}
      />
    );
    expect(screen.getByText(/2 in a row/)).toBeInTheDocument();
    rerender(
      <CalculationFeedback
        calculation="2 + 4"
        result={6}
        target={6}
        isCorrect
        isVisible
        combo={4}
        onContinue={vi.fn()}
      />
    );
    expect(screen.getByText('🔥 4 in a row!')).toBeInTheDocument();
  });

  it('encourages after a wrong answer, with a kid-friendly miss', () => {
    bar({ isCorrect: false, result: 7, onContinue: undefined, onTryAgain: vi.fn() });
    expect(screen.getByText(/Not quite/)).toBeInTheDocument();
    expect(screen.getByText(/1 too many/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
