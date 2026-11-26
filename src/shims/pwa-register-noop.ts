/**
 * Stub for `virtual:pwa-register` when building for Capacitor (no service worker).
 */
export function registerSW(_options?: {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegisteredSW?: (url: string, registration: ServiceWorkerRegistration | undefined) => void;
}): (reload?: boolean) => Promise<void> {
  return async () => {};
}
