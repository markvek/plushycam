# Adding a camera to PlushyCam

## Three distinct changes

| Goal | What to change |
|---|---|
| Add another physical unit of an existing model | Add a saved camera in the app; enter its address and nickname |
| Add a brand/model using an implemented protocol | Add an entry in root-level `cameras.config.ts` |
| Support a new protocol/authentication/codec | Implement/register an adapter (and renderer if needed), then add a catalog entry |

## Compatible HTTP MJPEG models

The initial `http-mjpeg-v1` adapter supports unauthenticated HTTP/HTTPS multipart MJPEG, optional JPEG snapshots, relative endpoint paths, manual address entry, and one active request. JPEG parts can carry a Content-Length or be boundary-delimited. Camera formats larger than 4 MiB per frame require an intentional implementation change and measurement.

1. Verify the stream content type, boundary, JPEG parts, and optional capture response on the real device.
2. Copy the full XIAO profile in `cameras.config.ts`. Change `id`, `brand`, `model`, description, compatibility evidence, connection defaults, and endpoints. Never reuse the XIAO firmware hash for another model.
3. Keep unimplemented capabilities false. To support live view only, set `snapshot: false` and omit `endpoints.snapshot`.
4. Keep the single-request constraints until a different scheduling policy is implemented and tested. Changing a number in configuration does not implement concurrency.
5. Use `validationStatus: 'source-reviewed'` while developing. Record the actual evidence and uncertainty in a protocol document.
6. Run `npm run check:profiles`, `npm test`, and the relevant hardware acceptance checks.
7. Update `docs/supported-cameras.md` and `docs/hardware-test-matrix.md`. Only mark `hardware-verified` after the declared platform/firmware matrix has passed.

Example endpoint customization within a copied profile:

```ts
id: 'example-brand-model-mjpeg-v1',
brand: 'Example brand',
model: 'Example model',
adapter: 'http-mjpeg-v1',
endpoints: {
  liveView: { path: '/video/live', format: 'mjpeg' },
  snapshot: { path: '/photo.jpg', format: 'jpeg' },
},
```

Those paths are examples, not claims about a supported physical camera. The integration test uses `/alternate/live` and `/alternate/photo` against the fixture to prove that endpoints come from configuration.

Profiles use stable IDs. Renaming the human-facing model label is harmless; changing an ID requires migrating saved instances. If firmware changes its protocol incompatibly, create a separate firmware-specific profile unless a tested compatibility implementation can support both.

## New protocols

1. Add a new profile type in `src/camera/types.ts` and extend the `CameraProfile` discriminated union.
2. Add its configuration validation and supported capability checks in `src/camera/config.ts`.
3. Implement its adapter and register the factory in `src/camera/adapterRegistry.ts`.
4. Extend the stream descriptor/renderer contract if the protocol is not JPEG-frame based. The current `CameraAdapter` contract is intentionally scoped to the first JPEG implementation; it must not represent RTSP as fake JPEG frames.
5. Add meaningful session/protocol tests and actual-device evidence.
6. Add the catalog entry. UI should consume capability-driven operations rather than switch on brand/model names.

A new adapter is responsible for cancellation, bounded parsing, protocol errors, authentication/session lifetimes, and cleanup. Future camera-file transfers belong under a dedicated job manager, with adapters supplying protocol access rather than owning UI state.

## Browser versus mobile

The original XIAO firmware lacks CORS response headers, so browser streaming uses the fixed-target local bridge. The bridge reads endpoint paths from the same selected profile. Native apps connect directly and require separate real-device networking validation.

Do not call a model supported merely because its stream works through the Mac bridge. Record browser, iOS, and Android results individually.
