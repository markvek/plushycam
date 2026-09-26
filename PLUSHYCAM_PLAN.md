# PlushyCam — Camera Configuration and Product Implementation Plan

Date: September 26, 2026

Status: Initial application implementation is now present in this repository. Physical hardware verification and store release remain pending.

### Implementation checkpoint

Implemented: root camera catalog and validation; HTTP MJPEG adapter; single-request session coordination; saved camera settings; live view/reconnect; snapshot capture; browser/native media storage and export implementations; responsive Expo Router screens; local browser bridge; simulated camera; automated protocol/session/browser tests; setup and camera-extension documentation.

The physical XIAO's current address and installed firmware have not yet been confirmed. Native code paths and configuration are implemented, but compilation/fixture testing do not establish physical iOS/Android compatibility. Milestones 0, 3 hardware acceptance, and 4 release validation retain their outstanding physical checks. Future camera-file and recording features remain deliberately deferred.

Use `README.md` for runnable commands and `docs/hardware-test-matrix.md` for verification boundaries.

## 1. Objective

Build PlushyCam as a companion application for separate, third-party cameras. Start with the existing Seeed Studio XIAO ESP32S3 Sense camera, then support additional camera brands and models without rewriting the application UI.

The primary configuration entry point will be a clearly named file at the repository root:

```text
cameras.config.ts
```

This file will describe supported brands, models, connection defaults, endpoints, firmware compatibility, and confirmed capabilities. A developer should be able to find it immediately and copy an existing entry to add a compatible camera.

The application should let an end user select a camera model and enter its address through Settings. End users should not have to edit source files.

**Key boundary:** Configuration can add cameras that use an implemented protocol. A camera using a new protocol, authentication flow, binary command format, or unsupported video format requires a new adapter or playback implementation as well as a configuration entry. Configuration must not pretend to eliminate that engineering work.

## 2. Confirmed Starting Hardware

The initial integration is based on the firmware and viewer code in:

- Repository: <https://github.com/markvek/dashcompanion>
- Firmware: `v1-june-27/xiao_esp32s3_sense_init/xiao_esp32s3_sense_init.ino`
- Initial viewer: `v1-june-27/web_viewer.py`
- Viewer with locally generated clips: `v2-yolo/web_viewer_yolo.py`

The inspected firmware file matched the GitHub version at review time, with Git blob SHA `de253ff223f380fcd2de62d524ea9c2fc885d2fe`.

| Area | Evidence from existing code | Planning consequence |
|---|---|---|
| Board | Firmware targets XIAO ESP32S3 Sense | Use it as the first supported model |
| Sensor | Header identifies OV2640; firmware prints the sensor PID | Verify the physical sensor before publishing sensor-specific claims |
| Network | `WiFi.mode(WIFI_STA)` joins a configured network | Initially put camera and viewing device on the same LAN |
| HTTP server | Port 80 | Initial base address is `http://<camera-ip>` |
| Live feed | `GET /stream`, multipart MJPEG | Start with an HTTP MJPEG adapter |
| Snapshot | `GET /capture`, JPEG response | Support saving a still image |
| Root page | `GET /` returns an HTML camera interface | Useful for manual setup verification |
| Request concurrency | Stream handler loops while its client remains connected | Treat the firmware as supporting one active camera request at a time |
| Camera storage API | No file-list, file-download, or SD recording endpoints in the inspected firmware | Disable camera recording-library features |
| Clip generation | Python viewer assembles received frames into local video | Distinguish host-generated clips from recordings stored on the camera |
| Previous address | Viewers use `172.21.13.217` | Historical clue only; require current address confirmation |
| Antenna | Exact model is not identified in the repository | Do not make an antenna model a software assumption |

Source inspection does not establish that the device is powered on, reachable, or running this exact firmware today. Physical validation is the first execution milestone.

## 3. Product Scope

### Initial camera prototype

The first complete workflow is:

```text
Choose Seeed Studio / XIAO ESP32S3 Sense
→ Enter the current camera address
→ Test connection
→ View live video
→ Save a snapshot
→ Disconnect and reconnect
→ Find and export the saved snapshot
```

The camera remains an external device. A Mac browser or a mobile application acts as its viewer/controller.

### Initial production release

After the prototype is validated, deliver the same supported workflow on iOS and Android, with connection onboarding, reliable recovery, persistent saved media, and export/share behavior.

### Later camera features

Add recorded-file browsing, remote playback, downloads, recording controls, and settings when a supported camera and its adapter implement those operations. Do not implement unsupported UI merely to match a generic dashcam feature list.

### Deferred features

- AI recognition, YOLO overlays, and Ollama analysis.
- Cloud accounts, subscriptions, and cloud backup.
- BLE unless a supported camera requires it.
- Camera hotspot provisioning and automatic network switching.
- Recording the incoming stream into local video clips.
- Firmware updates, SD formatting, and other destructive controls.
- Broad browser/mobile feature parity for every future protocol.

The earlier Python project is a protocol reference and useful test tool. Its AI dependencies are not required for the new core application.

## 4. Platform Strategy

Use Expo / React Native with TypeScript as the intended primary application codebase. Start by validating the known MJPEG camera workflow in the web target on the Mac. Validate the same camera connection and playback on physical iOS and Android devices before substantial screen development.

Use Expo development builds for native integration; do not rely on Expo Go to prove native library compatibility. Choose the actual mobile MJPEG rendering approach through a small hardware experiment. Browser MJPEG rendering does not establish that a React Native image or video component can handle the same response.

Keep these responsibilities separate:

- Camera adapters understand camera protocols.
- Platform media components render supported streams.
- Platform connection services handle OS-specific networking and permissions.
- Application services own sessions and saved media.
- UI presents operations supported by the active combination.

For the initial browser prototype, keep the application and camera on a known local development network. Test actual browser local-network and origin behavior. If a local development proxy is necessary, label it as a development aid; verify direct device communication separately before claiming mobile readiness.

The basic workflow must work without a cloud service or account. A desktop relay must not become an undocumented requirement for the mobile application.

## 5. The Camera Configuration File

### Location and format

Use root-level `cameras.config.ts` as the only authored catalog of supported brands and models. TypeScript permits comments, typed entries, and actionable editor errors while keeping the file easy to edit.

Keep it declarative: no network calls, credentials, arbitrary callbacks, embedded protocol code, or runtime device state. Do not introduce remote configuration delivery or a configuration scripting language for the MVP.

Add a prominent README link: **Add or configure a camera → `cameras.config.ts`**.

### Example first entry

The following is the proposed configuration contract, not existing application code:

```ts
import type { CameraProfile } from './src/camera/types';

export const cameraProfiles = [
  {
    id: 'seeed-xiao-esp32s3-sense-mjpeg-v1',
    brand: 'Seeed Studio',
    model: 'XIAO ESP32S3 Sense',
    description: 'Custom dashcompanion firmware with MJPEG live view',

    adapter: 'http-mjpeg-v1',

    compatibility: {
      firmwareFamily: 'dashcompanion-xiao-mjpeg',
      referenceFirmwareBlob:
        'de253ff223f380fcd2de62d524ea9c2fc885d2fe',
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
        'Connect this device and the camera to the same Wi-Fi network. ' +
        'Enter the camera IP shown in its serial output.',
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
```

### Validation requirements

Validate the catalog during development/build checks and before constructing a camera session:

- Profile IDs are unique and stable.
- Every adapter identifier resolves to an installed implementation.
- Endpoint and option shapes match the selected adapter's configuration type.
- Enabled capabilities have the required endpoint/protocol support.
- Relative endpoint paths cannot silently replace the selected device origin.
- Ports, timeouts, and request-concurrency values are valid.
- No unsupported stream formats or contradictory capability declarations are accepted.

Define `CameraProfile` as a discriminated union keyed by `adapter`. Initially it needs only the HTTP MJPEG profile type. Extend it when a second protocol is implemented; do not create speculative schemas for every camera brand.

### Camera type and firmware variants

Brand/model labels are for people. The stable profile ID selects a specific compatible protocol and firmware family.

Two models can share the same adapter. One model may need separate profiles for incompatible firmware families. Never choose a protocol implementation solely from a display name or chipset guess.

An entry marked `source-reviewed` is not yet certified hardware support. After physical testing, record the firmware evidence, device/platform matrix, date, and limitations in the support documentation.

## 6. Profiles Versus Individual Devices

Keep supported-model configuration separate from each user's saved camera instances.

```ts
type SavedCamera = {
  id: string;          // App-generated identity for this saved device
  profileId: string;   // References cameras.config.ts
  nickname: string;    // For example, "Desk prototype"
  host: string;        // Current IP or hostname, without a URL path
  port?: number;      // Optional override of the profile default
};
```

Persist saved device instances in application storage. Do not edit the source catalog when an IP changes. A later verified camera serial number can strengthen identity; an IP address alone is not a permanent hardware identity.

If future adapters require credentials, store them using suitable platform credential storage and reference them by saved-device ID. Keep passwords and tokens out of the catalog, logs, and exported diagnostics.

The device selection UI groups profiles by brand and displays model names and setup instructions. Switching camera instances closes the prior session and clears its transient state before opening the next one. MVP permits one active camera session.

## 7. Architecture

```text
cameras.config.ts ──→ Profile validation
                           │
Saved camera instance ──────┤
                           ▼
UI → Camera session service → Adapter registry → Protocol adapter → Camera
             │                       │
             │                       └─ HTTP MJPEG adapter initially
             ├─ Platform media renderer
             ├─ Local media library
             └─ Download manager, when remote camera files are supported
```

### Adapter registry

Maintain a small code registry mapping protocol IDs to adapter factories:

```ts
const adapterFactories = {
  'http-mjpeg-v1': createHttpMjpegAdapter,
};
```

Adding another compatible camera changes only the catalog and its verification fixtures/docs. Adding a new protocol changes the registry, adds an adapter, and may add a platform media implementation. Routine model additions should not require modifying screens.

### Adapter responsibilities

- Normalize configuration into concrete connection/stream descriptors.
- Validate camera responses sufficiently for the claimed connection state.
- Implement supported operations and normalize protocol errors.
- Express protocol constraints and confirmed dynamic capabilities.
- Cancel in-flight operations and close resources on disconnect.

### Session service responsibilities

- Own the active saved device and profile.
- Coordinate connect, disconnect, reconnect, and app lifecycle events.
- Enforce concurrency and mode transitions across adapters and renderers.
- Expose observable state to the UI.
- Prevent retries or callbacks from an old session updating a new one.
- Combine profile capabilities with adapter, runtime, and platform support.

The effective feature set is the intersection of declared camera support, implemented adapter support, platform support, and current camera state. Configuration must not enable an operation that has no implementation.

### Interface design

Start with connection/session lifecycle and a live-stream descriptor. Add capability-specific operation groups for snapshots, camera files, recording controls, and settings only as those features are implemented.

A stream descriptor carries its format and transport information, not just an opaque URL. Future headers, session lifetimes, and stream cleanup requirements must have explicit ownership.

Do not require the initial XIAO adapter to implement fake `getFiles()`, `startRecording()`, or `getSettings()` methods. Unsupported features should be absent or explicitly unavailable, never return invented success.

## 8. Initial XIAO Connection and Streaming Behavior

### Connection sequence

1. User selects the XIAO profile and enters the current camera address.
2. Validate the address and show a useful input error when necessary.
3. Open the MJPEG stream with a bounded connection/first-frame timeout.
4. Confirm the expected multipart response and at least one decodable frame.
5. Mark live view ready and track frame arrival.
6. On disconnect, unmount/stop the renderer and release the network connection.

The existing firmware does not provide a reliable automatic model-identification endpoint. Describe the selected model as user-selected, and the stream as verified. Do not imply that a successful HTTP response proves the board's identity.

### Single-request constraint

The firmware's synchronous stream handler prevents normal servicing of other endpoints during its loop. Therefore:

- Do not poll `/` or `/capture` as a heartbeat while streaming.
- Use frame arrival to determine whether the stream is active.
- Keep one stream connection per active session.
- For a fresh snapshot, close the stream, request `/capture`, then reopen the stream.
- Restore live view after snapshot success or failure when the user still wants it.
- Verify on hardware that closing the client releases the firmware handler promptly.

If the renderer can safely expose the latest decoded frame, a later optimization may save that frame instead. Label its semantics clearly and avoid requiring this optimization for the first implementation.

### Connection and media states

Track separate concerns:

```text
Connection: disconnected / connecting / connected / reconnecting / error
Live view:  stopped / starting / playing / stalled / error
Snapshot:   idle / capturing / saving / complete / error
```

Add recording and download states only when those operations exist. Use explicit transitions and bounded reconnect backoff. Manual disconnect cancels automatic reconnect. A new frame after a reconnect must not revive a stale session.

### Proposed starting timeout policy

Begin with configurable implementation defaults for first-frame timeout, stream inactivity, and capped reconnect delay. Measure them on the actual camera before selecting release values. Do not promise 30 FPS based on the firmware's `delay(33)` comment; capture, encoding, and network time also affect throughput.

## 9. User Experience

### Camera

- Selected camera nickname, brand, and model.
- Connection status and actionable connection errors.
- Live view, fullscreen, disconnect/reconnect, and snapshot.
- Explicit state when pausing the feed to capture a still.
- Last-frame age when the feed stalls; avoid showing a frozen image as live.

### Saved Media

- Locally saved snapshots for the initial release.
- Open, export/share, and delete local items.
- Camera nickname, capture timestamp, and media type.
- Availability while disconnected from the camera.

### Settings / Cameras

- Add a camera by brand and model.
- Edit nickname and current host/port.
- Read connection instructions and test the connection.
- View verified capabilities and support limitations.
- Remove a saved camera without silently deleting its saved media.

### Future conditional screens

Show camera recordings and transfer progress only when remote file capabilities exist. Explain an unsupported feature in the camera details, rather than filling primary screens with unusable controls.

For later destructive operations, distinguish deleting a local copy from deleting the camera original. Camera recording status must reflect verified device state, not merely the presence of a live stream.

## 10. Local Media and Future Transfers

### Snapshot storage

Store snapshots in persistent application media storage with a small metadata index. Avoid temporary cache storage for items labeled saved. Write the media successfully before marking the record complete, and recover cleanly from storage failures.

For the web prototype, explicitly use a browser download or implemented persistent browser storage; do not promise an in-app persistent library if the prototype only triggers downloads. The production mobile library must survive app restarts.

Preserve provenance:

```text
sourceKind: camera-snapshot / camera-recording / host-generated-clip
savedCameraId
profileId
capturedAt, when known
savedAt
local media reference
```

Keep unknown camera timestamps unknown; do not assume all camera times have a valid timezone. Record a phone/app save time separately.

### Future camera-file downloads

When a real supported camera exposes stored recordings, the adapter supplies file metadata and protocol-specific transfer access. The DownloadManager owns persistent jobs, scheduling, progress, retries, destination files, and completion validation.

Requirements before enabling downloads:

- One active transfer initially, with explicit camera concurrency constraints.
- Stable source identity beyond just a reused filename where available.
- Storage checks and temporary-file cleanup.
- Explicit handling of a missing, overwritten, or still-growing camera file.
- Resume only after verifying protocol support and source consistency.
- Size/checksum validation where supported before marking completion.
- Honest behavior when the app backgrounds, the network changes, or the camera disappears.

Background continuation is a separately verified platform feature. Persisting job metadata alone does not provide background transfer execution.

## 11. Firmware Strategy

Start by using the existing firmware without changes so that application work has a known baseline. Document the Arduino board package, build settings, and firmware source revision used for each test.

Potential follow-up firmware improvements, in priority order:

1. Reliable release of the stream connection and recovery after Wi-Fi interruption.
2. A versioned `/api/info` endpoint with model, firmware version, and capabilities.
3. Concurrent or separate stream/control serving if required by the product.
4. Optional hostname/service discovery.
5. Optional camera hotspot mode for router-free use.
6. SD recording and a versioned file API, if this board remains the desired hardware.

A new endpoint alone does not solve concurrency: it must actually be serviceable while streaming if the app depends on it. New firmware behavior gets a documented compatibility update or a separate profile when incompatible.

Decide firmware ownership before changing it: either retain a pinned reference to the dashcompanion repository or intentionally bring the maintained firmware into this repository. Avoid two independently edited copies with unclear authority.

## 12. Suggested Repository Layout

```text
plushycam/
├── PLUSHYCAM_PLAN.md
├── README.md
├── cameras.config.ts                 # Main camera catalog; prominently linked
├── app/                              # Routes and screens
├── src/
│   ├── camera/
│   │   ├── types.ts
│   │   ├── validateProfiles.ts
│   │   ├── adapterRegistry.ts
│   │   ├── CameraSession.ts
│   │   └── adapters/
│   │       └── httpMjpeg/
│   ├── platform/                     # Platform networking/media integrations
│   ├── media/                        # Local library and export
│   ├── storage/                      # Saved cameras and media metadata
│   └── components/
├── tests/
│   └── fixtures/                     # Representative protocol/error samples
└── docs/
    ├── adding-a-camera.md
    ├── supported-cameras.md
    ├── hardware-test-matrix.md
    └── protocols/
        └── xiao-http-mjpeg.md
```

Create files when they serve an implemented feature. Avoid empty native modules, placeholder cloud services, and speculative adapter directories.

## 13. How to Add Another Camera

### Case A: Same implemented protocol

1. Record the brand, model, firmware version, and hardware evidence.
2. Verify the camera uses a supported MJPEG/snapshot exchange and compatible session behavior.
3. Copy the closest entry in `cameras.config.ts`.
4. Assign a new stable profile ID and edit labels, endpoints, defaults, and constraints.
5. Enable only observed capabilities supported by the adapter.
6. Run profile validation and relevant adapter fixture checks.
7. Test a real device, including reconnect and supported concurrent operations.
8. Record its support status and limitations in `docs/supported-cameras.md`.

No screen changes should be required.

### Case B: New protocol or behavior

1. Obtain supplier documentation or investigate the actual exchange.
2. Define the protocol-specific configuration shape and fixture samples.
3. Implement a new adapter, reusing existing transport utilities where appropriate.
4. Add platform decoding/transport support if needed.
5. Register the adapter and add the model profile.
6. Run the same session and hardware acceptance workflow.

Do not force an RTSP, proprietary TCP, or authenticated session protocol into an HTTP MJPEG entry merely because both devices are cameras.

### Case C: User adds another physical unit

Choose the existing model in Settings and enter the new device address. Create another saved instance; do not duplicate the model profile.

## 14. Execution Milestones

### Milestone 0 — Validate the existing camera

Work:

- Power the XIAO and confirm the installed firmware and current address.
- Verify `/stream` and `/capture` on the Mac.
- Measure basic first-frame time and sustained stream behavior.
- Verify whether stream disconnection releases the device for another request.
- Record current network mode and how to recover from a camera restart.

Exit evidence: repeatable manual instructions, a saved real snapshot, and a protocol document separating observations from assumptions.

### Milestone 1 — Establish the configurable camera core

Work:

- Initialize Expo/TypeScript and development builds.
- Add `cameras.config.ts`, its validation, the adapter registry, and saved instances.
- Implement the HTTP MJPEG adapter and camera session service.
- Build a minimal model/address selection screen and live view.
- Verify mobile stream rendering and local networking on physical iOS/Android devices.

Exit evidence: the real XIAO streams through a selected profile; no camera URL is hardcoded in a screen; native feasibility is demonstrated or a specific blocker and decision are documented.

### Milestone 2 — Complete the initial workflow

Work:

- Add snapshot capture with correct stream coordination.
- Add saved media and export/share.
- Add camera editing, reconnect, and useful failure messages.
- Verify offline use and app restart behavior.

Exit evidence: a user can configure the camera, view it, save an image, disconnect, reopen the app, and retrieve/export that image on each release platform.

### Milestone 3 — Validate extensibility and reliability

Work:

- Exercise a second configuration using a local protocol fixture server with different endpoint paths.
- Verify that endpoint and constraint differences come from the profile rather than UI conditionals.
- Test interruption recovery, session switching, storage failures, and permissions.
- Complete the supported-camera matrix and adding-a-camera guide.

Exit evidence: a compatible second profile works without editing screens or the adapter. This proves configuration behavior, not support for an untested physical camera brand.

### Milestone 4 — Prepare a release

Work:

- Choose supported OS versions and validate the agreed physical-device matrix.
- Finalize app identifiers, signing, required permissions, and distribution setup.
- Review dependency maintenance and licensing for the selected media implementation.
- Run an installation/onboarding trial with someone unfamiliar with the hardware.
- Verify useful, redacted diagnostics and documented support instructions.

Exit evidence: repeatable builds and the acceptance checklist pass on the declared support matrix.

### Subsequent milestones

Add a second real camera and only its confirmed features. Camera-file browsing/downloads, recording control, and advanced settings should each have their own protocol evidence and acceptance criteria.

Do not assign a release date until Milestone 0 and the mobile feasibility checks establish the actual firmware, media, and network constraints. Track each milestone with an owner, blockers, and reviewable exit evidence.

## 15. Acceptance Criteria and Testing

The following are proposed initial gates, to refine after hardware measurement:

| Area | Acceptance evidence |
|---|---|
| Configuration | Invalid entries fail with the profile ID and actionable reason |
| Extensibility | Alternate compatible endpoint paths work by changing configuration alone |
| Connection | 20 consecutive connect/disconnect cycles succeed under recorded LAN conditions |
| Live view | 15-minute run without unbounded memory growth or a silently stale image |
| Snapshot | Capture during live view completes and restores the stream without a device reboot |
| Recovery | Camera restart/network interruption produces a clear state and successful recovery once reachable |
| Isolation | Switching devices cannot display late frames/results from the prior session |
| Saved media | Successfully saved items survive app restart and remain usable offline |
| Unsupported features | No recording-library or remote-control actions appear for the current XIAO profile |
| Platform support | Real iOS/Android behavior is verified independently of the Mac browser result |

Record first-frame latency, frame gaps, snapshot duration, recovery time, device/OS, firmware, and network conditions. Establish performance thresholds from measured results rather than invented throughput claims.

Use focused automated tests for profile validation, capability resolution, URL construction, session cancellation, stream/snapshot coordination, and malformed/truncated protocol responses. Use a fixture server for disconnects, stalls, and changed endpoint paths. Preserve hardware tests for Wi-Fi behavior, permissions, app lifecycle, and actual rendering.

A mock is a development tool, not evidence of physical-device compatibility.

## 16. Diagnostics and Support

Log structured session events with profile ID, anonymized/local device identifier as appropriate, operation, duration, error category, and reconnect attempt. Avoid per-frame verbose logs in ordinary use.

Distinguish:

- Invalid address.
- Camera unreachable.
- Permission denied.
- Unexpected response or incompatible firmware.
- Stream stalled.
- Camera busy with another client/request.
- Snapshot failed.
- Insufficient storage or export failure.

Diagnostics should be inspectable locally without internet. Any support export should exclude credentials and image/video content by default. Do not embed a broad local-network scanner into the initial connection flow; manual address entry is sufficient for this prototype.

## 17. Main Risks and Decisions

| Risk or open question | Planned resolution |
|---|---|
| Installed firmware differs from source | Verify serial output and observed endpoints before implementation assumptions |
| Mobile MJPEG renderer is unsuitable | Run a physical-device playback experiment in Milestone 1 |
| Stream blocks snapshots/control | Enforce one request at a time; test disconnect/reopen; change firmware only if needed |
| IP changes | Editable saved address first; hostname/discovery later |
| Existing firmware has weak identity reporting | Use explicit user model selection; add versioned info endpoint later |
| Browser succeeds while mobile fails | Test mobile local-network access and playback independently |
| Camera cannot recover after Wi-Fi loss | Document observed behavior and decide whether firmware changes are required |
| Future brand uses incompatible protocol | Add an adapter; preserve the same catalog and UI boundaries |
| Feature scope expands before live view is reliable | Require milestone exit evidence before adding unrelated features |

## 18. Definition of Success

PlushyCam initially succeeds when the external XIAO camera can be configured, viewed, disconnected/reconnected, and used to save/export snapshots through a reliable application workflow.

The architecture succeeds when a developer can open `cameras.config.ts`, add another camera using an existing protocol, and make it selectable without changing screens. New protocols have an explicit adapter extension point, and unsupported features remain honestly unavailable.

## 19. Reference Documentation

- Existing camera firmware: <https://github.com/markvek/dashcompanion/blob/main/v1-june-27/xiao_esp32s3_sense_init/xiao_esp32s3_sense_init.ino>
- Existing host-side clip implementation: <https://github.com/markvek/dashcompanion/blob/main/v2-yolo/web_viewer_yolo.py>
- Expo development builds: <https://docs.expo.dev/develop/development-builds/introduction/>
- Apple local-network privacy: <https://developer.apple.com/documentation/technotes/tn3179-understanding-local-network-privacy>
- Android Wi-Fi network request API, for a later assisted-connection flow: <https://developer.android.com/develop/connectivity/wifi/wifi-bootstrap>
- Apple background transfers, relevant when camera-file downloads are introduced: <https://developer.apple.com/documentation/Foundation/downloading-files-in-the-background>
