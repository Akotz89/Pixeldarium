const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const namespaceSource = read("js/core/namespace.js");
const configSource = read("config.js");
const engineSource = read("js/render/webgl-engine.js");
const workerClientSource = read("js/render/surface-worker-client.js");
const workerSource = read("js/workers/surface-chunk.js");

assert.ok(namespaceSource.indexOf("js/render/surface-worker-client.js") >= 0, "surface worker client should load in the runtime");
assert.strictEqual(namespaceSource.indexOf("js/render/surface-webgl.js"), -1, "Canvas2D chunk compositor should not load in the runtime");
assert.ok(/PLANET_SURFACE_WORKER_CHUNKS:\s*true/.test(configSource), "surface worker chunks should be enabled by default");

assert.ok(engineSource.indexOf("ensureTarget") >= 0, "shared WebGL engine should own render targets");
assert.ok(engineSource.indexOf("ensureBuffer") >= 0, "shared WebGL engine should own GPU buffers");
assert.ok(engineSource.indexOf('getContext("webgl2"') >= 0, "shared WebGL engine should create raw WebGL2 contexts");
assert.ok(engineSource.indexOf("gl.NEAREST") >= 0, "shared WebGL engine should preserve pixel-art nearest-neighbor sampling");

assert.ok(workerClientSource.indexOf("new Worker") >= 0, "surface worker client should create a real Worker");
assert.ok(workerClientSource.indexOf("new Blob") >= 0, "surface worker client should support file:// via blob worker source");
assert.ok(workerClientSource.indexOf("patches") >= 0, "surface worker payload should preserve subcell material patches");
assert.ok(workerSource.indexOf("buildSurfaceChunkBase") >= 0, "surface worker should accept base chunk build messages");
assert.ok(workerSource.indexOf("Uint8ClampedArray") >= 0, "surface worker should build transferable RGBA bytes");

console.log("surface worker webgl checks passed");
