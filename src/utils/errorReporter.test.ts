import { describe, expect, it } from 'vitest';
import { buildReport } from './errorReporter';

describe('buildReport', () => {
  it('keeps the route path but never the query string', () => {
    window.history.pushState({}, '', '/bingo/game?level=u1-l1&token=secret');
    const r = buildReport(new Error('boom'), 'window');
    expect(r.path).toBe('/bingo/game');
    expect(JSON.stringify(r)).not.toContain('secret');
    expect(r.message).toBe('boom');
  });

  it('accepts non-Error values and truncates long messages', () => {
    expect(buildReport('plain string', 'promise').message).toBe('plain string');
    expect(buildReport('x'.repeat(2000), 'manual').message.length).toBe(500);
  });
});
