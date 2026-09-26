# XIAO HTTP MJPEG protocol

## Evidence

- Source: [dashcompanion firmware](https://github.com/markvek/dashcompanion/blob/main/v1-june-27/xiao_esp32s3_sense_init/xiao_esp32s3_sense_init.ino).
- Inspected Git blob: `de253ff223f380fcd2de62d524ea9c2fc885d2fe`.
- Status: source-reviewed; physical unit has not been verified in this workspace.
- Board target: Seeed Studio XIAO ESP32S3 Sense.
- Header says OV2640; confirm sensor PID from serial output before treating it as a physical identification.

## Network and identity

Firmware uses `WIFI_STA` and joins an existing network using its local secrets header. The firmware prints its address at 115200 baud. The viewer previously used `172.21.13.217`; the application never assumes that address.

No model/version/capabilities endpoint exists. There is no authentication in the inspected HTTP endpoints. Do not report automatic hardware identification from a successful request.

## Endpoints

| Request | Response |
|---|---|
| `GET /` | HTML camera page |
| `GET /stream` | `multipart/x-mixed-replace; boundary=frame` |
| `GET /capture` | `image/jpeg` with a complete JPEG body |

The default port is 80. Each live part contains Content-Type, Content-Length, JPEG bytes, and CRLF. The application also supports properly boundary-delimited JPEG parts without Content-Length for compatible future profiles.

## Concurrency

The synchronous WebServer handler remains inside a loop while a streaming client is connected. Other ordinary requests are not serviced during that loop.

PlushyCam maintains one request at a time, uses frame arrival instead of HTTP polling as a heartbeat, aborts/releases the live request before capture, waits a short 150 ms interval, captures the still, then reopens the stream. Confirm on the physical firmware that client close releases its loop promptly; the fixture verifies the application's sequencing, not the firmware's exact timing.

## Unsupported operations

No camera file listing, stored recording playback/download, recording start/stop, file delete/protect, or settings API is present. The existing Python viewer's generated clips are host recordings, not SD-card recordings.

## Browser access

The inspected firmware does not send CORS headers. An HTML image can render differently from a JavaScript-readable streaming response; successful direct browser viewing alone does not prove fetch-based access. The local bridge exposes the same endpoints with permitted local-app CORS origins. It also offers `/__bridge` for fixed-target verification.

## Physical checks still needed

- Installed firmware, current IP, sensor PID, board package/toolchain versions.
- First-frame timing and actual sustained frame rate/resolution.
- Stream disconnect/reopen behavior and capture timing.
- Recovery after camera reboot or Wi-Fi loss.
- Direct iOS/Android network access and rendering performance.
- The exact antenna model, if relevant to radio performance; it is not established by this repository.
