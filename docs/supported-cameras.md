# Camera support

| Brand/model | Profile | Implemented features | Evidence | Physical verification |
|---|---|---|---|---|
| Seeed Studio XIAO ESP32S3 Sense with dashcompanion MJPEG firmware | `seeed-xiao-esp32s3-sense-mjpeg-v1` | Live view, JPEG snapshots | Firmware source reviewed; adapter and browser workflow tested against local fixture | Pending |

The catalog contains only the known camera model. Simulated and alternate-endpoint fixtures are test tools, not supported camera brands. The application does not certify a camera merely because a user selects its model.

Current adapter restrictions: HTTP/HTTPS without authentication, JPEG frames up to 4 MiB, one active request, foreground streaming, UI rendering capped at 10 FPS. Features beyond live view and snapshots require a future protocol implementation.
