# PlushyCam

A local-first companion for external cameras. The first integration targets the **Seeed Studio XIAO ESP32S3 Sense** running the MJPEG firmware from [dashcompanion](https://github.com/markvek/dashcompanion).

**Add or configure camera brands and models: [`cameras.config.ts`](./cameras.config.ts).**

The app includes camera setup, MJPEG live view, reconnect, snapshots, a persistent local image library, and image export/share. It does not use the phone camera or require a cloud account. Camera-side recording and file downloads are intentionally unavailable for the current firmware.

## Run on your Mac

Prerequisite: Node.js 22.13 or newer and npm.

```bash
npm ci
npm run dev
```

Open **http://localhost:8081**. Select **Add your camera**, choose a model, and enter its current address and port. A saved device's address is separate from the source configuration.

`npm run dev` and `npm run web` both start the browser app. `npm start` opens the general Expo development server for native development.

### Installation warnings

Reanimated and Worklets are explicit dependencies pinned to the versions recommended by the installed Expo SDK. Use `npx expo install` when updating native dependencies; unconstrained transitive versions can produce peer-dependency warnings. Rebuild an existing native development client after changing these versions.

The current dependency tree still reports 14 moderate npm audit findings through transitive packages. They do not cause a missing-script error. Do not apply `npm audit fix --force` blindly: the current suggested resolutions include incompatible Expo/package downgrades. Review SDK-compatible fixes separately.

### Use the physical XIAO camera

1. Power on the camera with the referenced firmware installed.
2. Connect your Mac and camera to the same Wi-Fi network.
3. Find the current camera IP in the Arduino serial output at 115200 baud. The historical address `172.21.13.217` is not assumed to still be correct.
4. Close any other camera viewer; the firmware services one request at a time.
5. Start the browser development bridge, replacing `CAMERA_IP`:

   ```bash
   npm run bridge -- --camera http://CAMERA_IP
   ```

6. In **Cameras**, enter the actual camera IP, port `80`, and a nickname. Expand **Browser connection help** and set the browser bridge address to `http://127.0.0.1:8787`.
7. Save, return to Camera, and press **Connect camera**.

The original firmware does not send browser CORS headers. The bridge allows the app to read the stream for frame monitoring and snapshots. It runs only on loopback, forwards only the selected profile's endpoints to one fixed camera, and allows the local app origins. It is a development aid, not a cloud service. The app checks that the bridge targets the configured camera before connecting.

Optional bridge arguments: `--profile PROFILE_ID`, `--port 8787`, and `--app-origin http://localhost:OTHER_PORT`. If a future camera serves suitable CORS headers, the web app can connect without the bridge. HTTPS-hosted browser deployments also need a deliberately designed local-network strategy; this prototype is intended for local development.

If the bridge returns **HTTP 502**, it could not connect to the camera. On macOS, an immediate **No route to host** error can indicate blocked local-network permission even when the camera is on the same subnet. Open **System Settings → Privacy & Security → Local Network** and enable the app running the bridge (for example, **Conductor**). Reconnect after changing the setting; restart the bridge if needed. Also verify the camera's current address and Wi-Fi. See [Apple's local-network permission guide](https://support.apple.com/guide/mac-help/mchla4f49138/mac).

### Try without hardware

In a second terminal:

```bash
npm run fixture
```

Add a camera using the XIAO profile, nickname **Fixture camera**, address `127.0.0.1`, port `8790`, and no bridge. The moving test pattern is simulated camera data. The fixture deliberately refuses concurrent requests, so it exercises the stream/pause/snapshot/resume flow.

To exercise the bridge against the fixture:

```bash
npm run bridge -- --camera http://127.0.0.1:8790
```

Keep the saved camera address/port at `127.0.0.1:8790`, and set its browser bridge address to `http://127.0.0.1:8787`.

## iOS and Android

The application uses Expo SDK 57, Expo Router, and development builds. Native apps use `expo/fetch` streaming to communicate directly with the camera; they ignore the browser bridge setting.

The iOS development build has been compiled and installed successfully in the iPhone 17 Pro simulator. The web, iOS, and Android bundles export successfully. Physical-device camera workflows remain unverified.

```bash
npm run ios
npm run android
```

These commands require the corresponding local Xcode/Android build tools. For physical devices, use `npx expo run:ios --device` or `npx expo run:android --device`. Local-network permission must be allowed on iOS. Camera HTTP access is configured through Expo app configuration; no Bluetooth or phone-camera permissions are requested.

If a localhost-only web server is already running and the simulator cannot load its bundle, start a separate native development server with `npx expo start --port 8082 --host lan`, then open that server in the development client. This avoids IPv4/IPv6 loopback differences in the development tooling.

`eas.json` also defines development, preview, and production build profiles. No cloud builds, signing-account changes, store submissions, or deployments are performed by setup.

**Native bundle compilation is not hardware certification.** Physical camera, OS networking, and native rendering/storage/export checks remain in the [hardware test matrix](./docs/hardware-test-matrix.md). For a fixture accessed from a physical phone, bind it explicitly to your Mac's LAN address with `npm run fixture -- --host YOUR_MAC_LAN_IP` and use that address on the phone. Loopback addresses on a phone refer to the phone itself.

## Add another camera

1. Open [`cameras.config.ts`](./cameras.config.ts).
2. Copy a compatible profile; change its stable ID, brand/model, firmware information, endpoint paths, defaults, and confirmed capabilities.
3. Run `npm run check:profiles`.
4. Select the new model in the app and test the actual device.

The same HTTP MJPEG adapter can serve different brands/models. A different protocol or authentication exchange requires a new adapter. See [Adding a camera](./docs/adding-a-camera.md) for the exact procedure and boundaries.

Do not put a user's current IP, Wi-Fi password, or camera token in the catalog. Those are individual device settings. Current firmware does not expose an identity endpoint, so the app verifies its stream, not the physical model automatically.

## Validation

```bash
npm run typecheck
npm run lint
npm run check:profiles
npm test
npx playwright install chromium
npm run test:e2e
npx expo-doctor
npx expo export --platform all
```

Unit/integration tests cover catalog constraints, URL handling, split multipart frames, bounded buffers, single-request capture sequencing, stale-session isolation, interruption recovery, alternate configured endpoints, and bridge behavior. Browser tests exercise setup, live view, snapshot persistence across reload, export, deletion, and invalid-address handling.

Playwright starts its fixture and local app if they are not already running. Tests use an isolated browser context; they do not configure or contact physical cameras. Screenshots and traces stay in ignored local folders.

## Storage and behavior

- Saved devices: versioned AsyncStorage data; no credentials in the catalog.
- Browser snapshots: IndexedDB, local to the browser/device. Export important images before clearing browser data.
- Native snapshots: application Documents storage plus a metadata index, with export through the system share sheet.
- One active camera session; snapshots close the stream, capture a JPEG, and restart live view even after a capture failure.
- Live view pauses when the application backgrounds or the browser tab is hidden. Reconnect explicitly on return.
- Incoming frames are consumed continuously; UI updates are capped at 10 FPS to limit base64/rendering work. Native performance on the physical camera still needs profiling.
- Frames/snapshots are capped at 4 MiB. First-frame/inactivity timeout is 10 seconds; reconnect delay grows from 1 to at most 15 seconds.
- Unsupported remote controls and recordings are not fabricated.

## Project map

| Location | Purpose |
|---|---|
| `cameras.config.ts` | Supported brand/model catalog |
| `src/camera/` | Profile validation, adapters, multipart parser, session state |
| `src/app/` | Camera, saved-media, and camera-settings routes |
| `src/media/` | Platform-specific storage and export |
| `src/state/` | Application state and lifecycle coordination |
| `scripts/` | Local bridge, fixture, profile validation |
| `tests/` | Protocol, session, integration, and browser tests |
| `docs/` | Protocol evidence, adding models, support/verification matrix |
| `PLUSHYCAM_PLAN.md` | Product and engineering plan with implementation status |

## Current limitations

This is the first working application implementation, not a store-ready release. The installed physical firmware/current camera address have not been confirmed in this workspace. Physical iPhone/Android acceptance, the 15-minute live-stream run, and the 20-cycle hardware test remain required before describing a model as hardware-verified. The initial prototype has no automatic discovery, camera hotspot provisioning, SD-card API, on-device video recording, cloud backend, or background transfer feature.
