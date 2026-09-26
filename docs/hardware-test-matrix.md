# Verification matrix

Last implementation session: September 26, 2026.

## Automated evidence

| Check | Coverage |
|---|---|
| TypeScript | Passed: application, scripts, and tests |
| ESLint | Passed without warnings: Expo/React Native source checks |
| Profile validation | IDs, adapter availability, endpoints, constraints, truthful capabilities |
| Unit/integration suite | 15 tests passed: multipart chunk splits, bounded data, cancellation, reconnect, alternate endpoints, capture exclusion, fixed-target bridge |
| Chromium workflow | 3 tests passed: complete media workflow, invalid-address handling, and bridge-backed streaming/capture |
| Browser responsive review | Desktop live view and mobile-width saved library screenshots |
| Expo export | Passed: web, iOS, and Android JavaScript/Hermes bundles |
| Expo Doctor | 21/21 checks passed |
| iOS simulator build | Passed on Xcode 27; installed on iPhone 17 Pro simulator, iOS 26.5; initial app screen rendered |

The native build emitted one Expo-generated build-phase dependency warning and no build errors. Native live streaming, native snapshot storage, and native sharing have not been exercised end to end. Android native compilation was not run because Android SDK tools are unavailable in this environment.

Local-start follow-up: added the `dev` alias and explicitly aligned Reanimated 4.5.1 / Worklets 0.10.1 with Expo SDK 57. Typecheck, lint, dependency-tree validation, and Expo Doctor pass after this change. The earlier simulator binary predates this dependency alignment and must be rebuilt for subsequent native testing.

The historical physical camera address `172.21.13.217` was probed once with a bounded HTTP request; port 80 refused the connection. No subnet scan was performed, and no camera firmware was modified.

See `npm test`, `npm run test:e2e`, and the implementation-session report for executed results. Compilation and fixture tests do not prove physical hardware behavior.

## Required physical checks

All rows below remain pending until performed with the real camera.

| Check | Mac browser + bridge | Physical iPhone | Physical Android |
|---|---|---|---|
| Record camera/firmware/OS/network versions | Pending | Pending | Pending |
| Connect and decode first frame | Pending | Pending | Pending |
| 20 connect/disconnect cycles | Pending | Pending | Pending |
| 15-minute live view; frame gaps and memory | Pending | Pending | Pending |
| Capture and restore live view | Pending | Pending | Pending |
| Camera restart and Wi-Fi interruption | Pending | Pending | Pending |
| Denied local-network permission and recovery | Browser dependent | Pending | OS dependent |
| Background/return and reconnect | Pending | Pending | Pending |
| Save, restart app, export offline | Fixture covered | Pending | Pending |
| Low storage and write/export failure | Pending | Pending | Pending |

For each run, record first-frame time, snapshot time, reconnect time, observed frame rate, test duration, failures, and a reproducible setup. Inspect stale-image behavior: an interrupted stream must not remain labeled LIVE.

Do not change the catalog to `hardware-verified` until the declared release platform/firmware combination passes. The initial browser implementation is available now; store release acceptance remains open.
