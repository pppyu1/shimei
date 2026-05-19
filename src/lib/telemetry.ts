const eventStorageKey = 'shimei:telemetry-events';
const errorStorageKey = 'shimei:telemetry-errors';
const maxEntries = 50;

type TelemetryPayload = Record<string, unknown>;

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const appendRecord = (storageKey: string, nextRecord: TelemetryPayload) => {
  if (!canUseStorage()) {
    return;
  }

  const current = window.localStorage.getItem(storageKey);
  const records = current ? JSON.parse(current) : [];
  const nextRecords = Array.isArray(records) ? [...records, nextRecord].slice(-maxEntries) : [nextRecord];
  window.localStorage.setItem(storageKey, JSON.stringify(nextRecords));
};

export const trackEvent = (name: string, payload: TelemetryPayload = {}) => {
  const entry = {
    name,
    payload,
    at: new Date().toISOString(),
  };

  appendRecord(eventStorageKey, entry);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('shimei:track', { detail: entry }));
  }
};

export const captureError = (source: string, error: unknown, context: TelemetryPayload = {}) => {
  const message = error instanceof Error ? error.message : String(error);
  appendRecord(errorStorageKey, {
    source,
    message,
    context,
    at: new Date().toISOString(),
  });
};

export const installTelemetry = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.addEventListener('error', (event) => {
    captureError('window.error', event.error ?? event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    captureError('window.unhandledrejection', event.reason);
  });
};
