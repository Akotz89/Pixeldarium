const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const namespaceSource = read("js/core/namespace.js");
const configSource = read("config.js");
const pipelineSource = read("js/render/pipeline.js");
const engineSource = read("js/render/webgl-engine.js");
const tileWebglSource = read("js/render/surface-tile-webgl.js");

assert.ok(namespaceSource.indexOf("js/render/surface-tile-webgl.js") >= 0, "surface tile WebGL compositor should load in the runtime");
assert.ok(/PLANET_SURFACE_TILE_WEBGL_ATLAS:\s*true/.test(configSource), "surface tile WebGL atlas batching should be enabled by default");
assert.ok(/PLANET_SURFACE_TILE_WEBGL_MAX_INSTANCES:\s*4096/.test(configSource), "surface tile WebGL batching should have a capped batch size");
assert.ok(pipelineSource.indexOf("PS.render.surfaceTileWebgl") >= 0, "render rebuilds should include the surface tile WebGL subsystem");

assert.ok(engineSource.indexOf('getContext("webgl2"') >= 0, "shared WebGL engine should create raw WebGL2 contexts");
assert.ok(engineSource.indexOf("gl.NEAREST") >= 0, "shared WebGL engine should preserve pixel-art nearest-neighbor sampling");
assert.ok(tileWebglSource.indexOf('ensureTarget("surface-tiles"') >= 0, "surface tile compositor should allocate through shared engine target");
assert.ok(tileWebglSource.indexOf('ensureBuffer(state.target, "surface-tile-quad"') >= 0, "surface tile compositor should use shared quad buffer");
assert.ok(tileWebglSource.indexOf('ensureBuffer(state.target, "surface-tile-instances"') >= 0, "surface tile compositor should use shared instance buffer");
assert.ok(tileWebglSource.indexOf("updateBuffer") >= 0, "surface tile compositor should upload instance data through shared engine");
assert.ok(tileWebglSource.indexOf("beginTransparentPass") >= 0, "surface tile compositor should use shared pass setup");
assert.ok(tileWebglSource.indexOf("presentTarget") >= 0, "surface tile compositor should present through WebGL");
assert.ok(tileWebglSource.indexOf("drawTerrainAtlasBatch") >= 0, "surface tile compositor should batch ready chunks into one viewport draw path");
assert.ok(tileWebglSource.indexOf("appendBatches") >= 0, "surface tile compositor should append multiple chunks into shared atlas page batches");
assert.ok(tileWebglSource.indexOf("terrainAtlasCell") >= 0, "surface tile compositor should cache atlas material selection on ready chunk cells");
assert.strictEqual(tileWebglSource.indexOf("drawTargetTo2d"), -1, "surface tile compositor should not copy back to Canvas2D");
assert.ok(tileWebglSource.indexOf("drawArraysInstanced") >= 0, "surface tile compositor should submit instanced draws");
assert.ok(tileWebglSource.indexOf("vertexAttribDivisor") >= 0, "surface tile compositor should configure per-instance attributes");

console.log("surface tile webgl checks passed");
