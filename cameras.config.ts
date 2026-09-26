import type { CameraProfile } from './src/camera/types';

/**
 * ADD CAMERA BRANDS AND MODELS HERE.
 * Copy an entry for cameras using the same implemented protocol.
 * New protocols need an adapter: see docs/adding-a-camera.md.
 * Addresses and credentials belong to saved devices, never this catalog.
 */
export const cameraProfiles = [
  {
    id: 'seeed-xiao-esp32s3-sense-mjpeg-v1',
    brand: 'Seeed Studio',
    model: 'XIAO ESP32S3 Sense',
    description: 'A small camera. A direct connection. Your own point of view.',
    adapter: 'http-mjpeg-v1',
    compatibility: {
      firmwareFamily: 'dashcompanion-xiao-mjpeg',
      referenceFirmwareBlob: 'de253ff223f380fcd2de62d524ea9c2fc885d2fe',
      automaticIdentification: false,
      validationStatus: 'source-reviewed',
    },
    connection: {
      networkMode: 'existing-wifi',
      addressEntry: 'manual',
      scheme: 'http',
      defaultPort: 80,
      authentication: 'none',
      setupInstructions:
        'Power on your camera and connect this device to the same Wi-Fi. Find the camera’s current IP address in its Arduino serial output.',
    },
    endpoints: {
      liveView: { path: '/stream', format: 'mjpeg' },
      snapshot: { path: '/capture', format: 'jpeg' },
    },
    capabilities: {
      liveView: true,
      snapshot: true,
      cameraFileList: false,
      cameraFilePlayback: false,
      cameraFileDownload: false,
      recordingControl: false,
      cameraSettings: false,
      fileDelete: false,
      fileProtect: false,
    },
    constraints: {
      maxConcurrentRequests: 1,
      snapshotDuringLiveView: 'pause-stream',
      heartbeatDuringLiveView: 'use-frame-arrival',
    },
  },
] satisfies readonly CameraProfile[];
