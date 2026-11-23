import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TargetDisplay } from './TargetDisplay';

describe('<TargetDisplay /> progress', () => {
  it('shows no progress before the first question is answered', () => {
    render(<TargetDisplay currentTarget={6} round={1} totalRounds={5} />);
    expect(screen.getByText('0 of 5 solved')).toBeInTheDocument();
  });

  it('moves only when the current question is solved', () => {
    const { rerender } = render(<TargetDisplay currentTarget={6} round={2} totalRounds={5} />);
    expect(screen.getByText('1 of 5 solved')).toBeInTheDocument();
    rerender(<TargetDisplay currentTarget={6} round={2} totalRounds={5} roundSolved />);
    expect(screen.getByText('2 of 5 solved')).toBeInTheDocument();
  });
});
