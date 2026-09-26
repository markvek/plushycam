import type { CameraAdapter, Frame } from './types';
import { recordEvent } from './diagnostics';

export type SessionState = {
  connection: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  live: 'stopped' | 'starting' | 'playing' | 'stalled';
  snapshot: 'idle' | 'capturing';
  frame?: Frame;
  error?: string;
  attempt: number;
};
const idle = (): SessionState => ({
  connection: 'disconnected',
  live: 'stopped',
  snapshot: 'idle',
  attempt: 0,
});

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal.addEventListener('abort', finish, { once: true });
    if (signal.aborted) finish();
  });
}

/** Owns the single camera request. Generation checks isolate stale sessions. */
export class CameraSession {
  private state = idle();
  private listeners = new Set<() => void>();
  private generation = 0;
  private desired = false;
  private controller?: AbortController;
  private running: Promise<void> = Promise.resolve();
  private captureRunning: Promise<Uint8Array> | undefined;
  private adapter?: CameraAdapter;
  constructor(private readonly retryBaseMs = 1000) {}

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(patch: Partial<SessionState>) {
    const previous = this.state;
    this.state = { ...this.state, ...patch };
    if (previous.connection !== this.state.connection || previous.attempt !== this.state.attempt) {
      recordEvent({
        event: 'connection',
        state: this.state.connection,
        attempt: this.state.attempt,
      });
    }
    if (previous.snapshot !== this.state.snapshot)
      recordEvent({ event: 'snapshot', state: this.state.snapshot, attempt: 0 });
    this.listeners.forEach((fn) => fn());
  }

  async connect(adapter: CameraAdapter): Promise<void> {
    const generation = ++this.generation;
    this.desired = false;
    this.controller?.abort();
    this.update({ ...idle(), frame: undefined, error: undefined });
    await Promise.allSettled([this.running, this.captureRunning]);
    if (generation !== this.generation) return;
    this.desired = true;
    this.adapter = adapter;
    this.update({ ...idle(), connection: 'connecting', live: 'starting' });
    this.startStream(generation);
  }

  async disconnect(): Promise<void> {
    this.generation++;
    this.desired = false;
    this.controller?.abort();
    this.update({ ...idle(), frame: undefined, error: undefined });
    await Promise.allSettled([this.running, this.captureRunning]);
  }

  private startStream(generation: number) {
    const controller = new AbortController();
    this.controller = controller;
    const adapter = this.adapter!;
    this.running = (async () => {
      let attempt = 0;
      while (this.desired && this.generation === generation && !controller.signal.aborted) {
        try {
          await adapter.stream(controller.signal, (frame) => {
            if (this.generation !== generation || controller.signal.aborted) return;
            attempt = 0;
            this.update({
              frame,
              connection: 'connected',
              live: 'playing',
              error: undefined,
              attempt: 0,
            });
          });
          if (!controller.signal.aborted) throw new Error('Live feed ended.');
        } catch (error) {
          if (controller.signal.aborted || generation !== this.generation) return;
          attempt++;
          this.update({
            connection: 'reconnecting',
            live: 'stalled',
            error: error instanceof Error ? error.message : 'Camera connection failed.',
            attempt,
          });
          await wait(
            Math.min(this.retryBaseMs * 2 ** Math.min(attempt - 1, 4), 15000),
            controller.signal,
          );
        }
      }
    })();
  }

  capture(): Promise<Uint8Array> {
    if (this.captureRunning) return Promise.reject(new Error('A snapshot is already in progress.'));
    if (!this.adapter || this.state.connection !== 'connected')
      return Promise.reject(new Error('Connect to the camera before taking a snapshot.'));
    const generation = this.generation;
    const adapter = this.adapter;
    this.update({ snapshot: 'capturing', live: 'stopped' });
    this.controller?.abort();
    const operation = (async () => {
      await this.running;
      if (generation !== this.generation || !this.desired) throw new Error('Snapshot cancelled.');
      const controller = new AbortController();
      this.controller = controller;
      // Give the firmware a brief opportunity to leave its synchronous stream loop.
      await wait(150, controller.signal);
      if (controller.signal.aborted) throw new Error('Snapshot cancelled.');
      const bytes = await adapter.snapshot(controller.signal);
      if (generation !== this.generation || controller.signal.aborted)
        throw new Error('Snapshot cancelled.');
      return bytes;
    })();
    this.captureRunning = operation;
    void operation
      .finally(() => {
        if (this.captureRunning === operation) this.captureRunning = undefined;
        if (generation === this.generation && this.desired) {
          this.update({ snapshot: 'idle', connection: 'connecting', live: 'starting' });
          this.startStream(generation);
        }
      })
      .catch(() => {});
    return operation;
  }
}
