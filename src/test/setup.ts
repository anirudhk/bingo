import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom doesn't ship matchMedia (used by framer-motion's reduced-motion check).
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

// jsdom lacks PointerEvent — framer-motion's tap handlers expect it.
if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  // @ts-expect-error — minimal shim, MouseEvent shape is enough for our tests.
  window.PointerEvent = class extends MouseEvent {};
}

afterEach(() => {
  cleanup();
});
