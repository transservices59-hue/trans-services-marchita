import * as Sentry from '@sentry/react';

// Initialisation silencieuse si VITE_SENTRY_DSN absent (mode dev sans Sentry)
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) {
    console.info('[Sentry] DSN absent — monitoring désactivé (normal en dev)');
    return;
  }

  Sentry.init({
    dsn,
    environment:            import.meta.env.MODE,
    tracesSampleRate:       0.1,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
  });
}

export function setSentryUser(user: { id: string; email?: string; role?: string } | null): void {
  if (!user) { Sentry.setUser(null); return; }
  Sentry.setUser({ id: user.id, email: user.email, data: { role: user.role } });
}

export { Sentry };
