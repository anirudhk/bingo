import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { feedback } from './feedback';
import { usePrefsStore } from '../store/prefsStore';

describe('feedback', () => {
  const vibrate = vi.fn();
  beforeEach(() => {
    vibrate.mockReset();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
  });
  afterEach(() => usePrefsStore.getState().resetPrefs());

  it('vibrates when haptics are enabled', () => {
    usePrefsStore.setState({ hapticsEnabled: true, soundEnabled: false });
    feedback('wrong');
    expect(vibrate).toHaveBeenCalledWith([50, 40, 50]);
  });

  it('stays silent and still when both are turned off', () => {
    usePrefsStore.setState({ hapticsEnabled: false, soundEnabled: false });
    feedback('correct');
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('never throws when Web Audio is unavailable (jsdom)', () => {
    usePrefsStore.setState({ hapticsEnabled: false, soundEnabled: true });
    expect(() => feedback('complete')).not.toThrow();
  });
});
