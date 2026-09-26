export type DiagnosticEvent = {
  at: string;
  event: 'connection' | 'snapshot';
  state: string;
  attempt: number;
};

// Bounded, local-only diagnostics. No hostnames, credentials, names, or image data.
const events: DiagnosticEvent[] = [];
export function recordEvent(event: Omit<DiagnosticEvent, 'at'>) {
  events.push({ ...event, at: new Date().toISOString() });
  if (events.length > 100) events.shift();
}
export function recentEvents(): readonly DiagnosticEvent[] {
  return [...events];
}
