# WebWorker Evaluation

## Context

AZR-281 evaluates whether Pixeldarium should move simulation ticks from the main thread into a WebWorker during Phase 1 Foundation.

The production constraints remain unchanged:

- zero dependencies
- no build step
- vanilla browser APIs
- `file://` support
- no server headers

## Prototype

The spike worker lives at `js/workers/sim-worker.js`. It is a classic worker script with no imports. The worker accepts transferred `Float32Array` buffers for organism-style state, runs a deterministic synthetic tick, and transfers the buffers back to the main thread.

The validation harness is `tests/webworker-spike.test.js`. It opens `index.html` through a `file://` URL in Chromium, creates `new Worker("js/workers/sim-worker.js")`, measures a main-thread synthetic tick, measures worker round-trip latency, and checks whether `SharedArrayBuffer` is available.

## Findings

Direct `new Worker("js/workers/sim-worker.js")` does not launch under `file://` in the tested Chromium environment. It fails because the page origin is `null` and the worker file cannot be accessed.

A blob URL fallback can launch under `file://`, but that fallback requires injecting or constructing worker source on the main thread.

`SharedArrayBuffer` is not a reliable Phase 1 option because it requires cross-origin isolation through COOP/COEP headers. Those headers are not available when the game is opened directly from `file://`.

Transferable `ArrayBuffer` communication works, but the production simulation state is not yet worker-shaped. Adopting the worker now would require a larger data contract for terrain, food, settlements, events, persistence, and render interpolation.

Measured in Chromium against `file://` with 10,000 synthetic entities:

| Path | Average |
| --- | ---: |
| Main-thread synthetic tick | 0.26ms |
| Worker compute time | 0.40ms |
| Worker round trip | 0.72ms |
| Transfer overhead | 0.32ms |

The synthetic worker compute time is similar to the main-thread compute time, while transfer overhead dominates the total worker round trip.

## Decision

Stay single-threaded for Phase 1.

Rationale:

- AZR-280 already brought the measured 10,000-organism average tick under the Linear target.
- Direct worker files are blocked in the tested Chromium `file://` path; blob fallback works but adds bootstrapping complexity.
- The worker spike proves transferable typed arrays are viable, but transfer overhead is larger than the synthetic compute work while `SharedArrayBuffer` is unavailable for the required `file://` path.
- Moving the current simulation into a worker would create a second state owner before the render, persistence, and event systems are fully typed-array backed.

## Follow-Up Contract If Revisited

If a later phase adopts workers, the main-thread to worker contract should use transferred typed-array snapshots:

- organism state buffers
- food state buffers
- terrain read-only numeric buffers
- command/event queue buffers
- summary result buffers for HUD and render interpolation

The worker should own fixed-step simulation state. The main thread should own rendering, input, IndexedDB persistence, and UI.
