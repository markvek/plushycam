export type Capabilities = {
  liveView: boolean;
  snapshot: boolean;
  cameraFileList: boolean;
  cameraFilePlayback: boolean;
  cameraFileDownload: boolean;
  recordingControl: boolean;
  cameraSettings: boolean;
  fileDelete: boolean;
  fileProtect: boolean;
};

// Extend this union with a new configuration type when implementing another protocol.
export type CameraProfile = HttpMjpegProfile;
export type HttpMjpegProfile = {
  id: string;
  brand: string;
  model: string;
  description: string;
  adapter: 'http-mjpeg-v1';
  compatibility: {
    firmwareFamily: string;
    referenceFirmwareBlob: string;
    automaticIdentification: false;
    validationStatus: 'source-reviewed' | 'hardware-verified';
  };
  connection: {
    networkMode: 'existing-wifi' | 'camera-hotspot';
    addressEntry: 'manual';
    scheme: 'http' | 'https';
    defaultPort: number;
    authentication: 'none';
    setupInstructions: string;
  };
  endpoints: {
    liveView: { path: string; format: 'mjpeg' };
    snapshot?: { path: string; format: 'jpeg' };
  };
  capabilities: Capabilities;
  constraints: {
    maxConcurrentRequests: 1;
    snapshotDuringLiveView: 'pause-stream';
    heartbeatDuringLiveView: 'use-frame-arrival';
  };
};

export type SavedCamera = {
  id: string;
  profileId: string;
  nickname: string;
  host: string;
  port?: number;
  // Browser-only development transport. Never used by the native application.
  browserBridge?: string;
};

export type Frame = { bytes: Uint8Array; receivedAt: number };
export type CameraAdapter = {
  stream(signal: AbortSignal, onFrame: (frame: Frame) => void): Promise<void>;
  snapshot(signal: AbortSignal): Promise<Uint8Array>;
};
export type Fetcher = typeof globalThis.fetch;
