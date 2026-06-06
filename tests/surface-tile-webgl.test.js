const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

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
assert.ok(namespaceSource.indexOf("js/render/surface-ecology.js") < namespaceSource.indexOf("js/render/surface-tile-webgl.js"), "surface ecology facade should load before terrain tile consumption");
assert.ok(/PLANET_SURFACE_TILE_WEBGL_ATLAS:\s*true/.test(configSource), "surface tile WebGL atlas batching should be enabled by default");
assert.ok(/PLANET_SURFACE_TILE_WEBGL_MAX_INSTANCES:\s*4096/.test(configSource), "surface tile WebGL batching should have a capped batch size");
assert.ok(/PLANET_SURFACE_ECOLOGY_RADIUS_TILES:\s*16/.test(configSource), "surface ecology encoding should use a bounded tile radius aligned to spatial buckets");
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

const context = {
  PS: {
    render: {
      surface: {
        withEcology(sample) {
          if (!sample || !sample.ecologyKey) {
            return sample;
          }

          return Object.assign({}, sample, {
            ecology: { key: sample.ecologyKey }
          });
        }
      }
    },
    atlas: {
      getTerrainEcologyMicroKey(sample, tileX, tileY) {
        return sample && sample.ecology ? ".ecoform." + ((tileX + tileY) % 4) : "";
      },
      getTerrainCell(biome, tileX, tileY, sample) {
        const microKey = context.PS.atlas.getTerrainEcologyMicroKey(sample, tileX, tileY);

        return {
          name: "test.grass." + (sample && sample.ecology ? sample.ecology.key : "eco.0.0") + microKey,
          pageIndex: 0,
          u0: 0,
          v0: 0,
          u1: 0.25,
          v1: 0.25
        };
      }
    },
    ranmap: {
      data: true,
      jitterX() {
        return 99;
      },
      jitterY() {
        return 99;
      },
      flipH() {
        return false;
      }
    }
  },
  CONFIG: {
    TILE_SIZE: 16
  },
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },
  Float32Array,
  Math,
  Number,
  Object,
  String,
  Boolean,
  Array,
  console
};

vm.createContext(context);
vm.runInContext(tileWebglSource, context, { filename: "js/render/surface-tile-webgl.js" });

const batches = context.PS.render.surfaceTileWebgl.makeBatches(
  {
    sampleEast: 4,
    sampleNorth: 8,
    renderScreenX: 10,
    renderScreenY: 20,
    renderSamplePixelSize: 12,
    chunkSamples: 2
  },
  [
    { sample: { biome: "grassland" }, screenX: 0, screenY: 16 },
    { sample: { biome: "grassland" }, screenX: 16, screenY: 16 }
  ],
  1
);
const page = batches.pages[0];

assert.strictEqual(page[0], 10, "terrain atlas x should stay grid-aligned and ignore positional jitter");
assert.strictEqual(page[1], 32, "terrain atlas y should stay grid-aligned and ignore positional jitter");
assert.strictEqual(page[10], 22, "adjacent terrain atlas x should advance by exact sample size");
assert.strictEqual(page[11], 32, "adjacent terrain atlas y should remain grid-aligned");

const ecologyCell = { sample: { biome: "grassland", ecologyKey: "eco.3.2" }, screenX: 0, screenY: 0 };
const ecologyAddress = {
  sampleEast: 0,
  sampleNorth: 0,
  renderScreenX: 0,
  renderScreenY: 0,
  renderSamplePixelSize: 12,
  chunkSamples: 1
};
context.PS.render.surfaceTileWebgl.makeBatches(ecologyAddress, [ecologyCell], 1);
assert.strictEqual(ecologyCell.terrainAtlasCell.name, "test.grass.eco.3.2.ecoform.0", "terrain cell cache should include the active ecology key and bounded micro phase");
ecologyAddress.sampleEast = 1;
context.PS.render.surfaceTileWebgl.makeBatches(ecologyAddress, [ecologyCell], 1);
assert.strictEqual(ecologyCell.terrainAtlasCell.name, "test.grass.eco.3.2.ecoform.1", "terrain cell cache should invalidate when ecology micro phase changes");
ecologyCell.sample.ecologyKey = "eco.0.0";
context.PS.render.surfaceTileWebgl.makeBatches(ecologyAddress, [ecologyCell], 1);
assert.strictEqual(ecologyCell.terrainAtlasCell.name, "test.grass.eco.0.0.ecoform.1", "terrain cell cache should invalidate when ecology key changes");

console.log("surface tile webgl checks passed");
