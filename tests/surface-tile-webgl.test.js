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
const surfaceCacheSource = read("js/render/surface-cache.js");
const featherSource = read("js/render/surface-ready-feather.js");
const equivalenceSource = read("js/assets/equivalence.js");
const tileWebglSource = read("js/render/surface-tile-webgl.js");

assert.ok(namespaceSource.indexOf("js/render/surface-tile-webgl.js") >= 0, "surface tile WebGL compositor should load in the runtime");
assert.ok(namespaceSource.indexOf("js/render/surface-ecology.js") < namespaceSource.indexOf("js/render/surface-tile-webgl.js"), "surface ecology facade should load before terrain tile consumption");
assert.ok(namespaceSource.indexOf("js/render/surface-ready-feather.js") < namespaceSource.indexOf("js/render/surface-tile-webgl.js"), "surface ready feather helper should load before terrain tile consumption");
assert.ok(/PLANET_SURFACE_TILE_WEBGL_ATLAS:\s*true/.test(configSource), "surface tile WebGL atlas batching should be enabled by default");
assert.ok(/PLANET_SURFACE_TILE_WEBGL_MAX_INSTANCES:\s*8192/.test(configSource), "surface tile WebGL batching should have a capped batch size");
assert.ok(/PLANET_SURFACE_CLOSE_VISIBLE_CHUNK_LIMIT:\s*192/.test(configSource), "close zoom terrain should use a bounded ready chunk working set");
assert.ok(/PLANET_SURFACE_ECOLOGY_RADIUS_TILES:\s*16/.test(configSource), "surface ecology encoding should use a bounded tile radius aligned to spatial buckets");
assert.ok(/PLANET_SURFACE_CIVILIZATION_ENABLED:\s*true/.test(configSource), "surface civilization encoding should be enabled by default");
assert.ok(/PLANET_SURFACE_CIVILIZATION_ROUTE_RADIUS_TILES:\s*3/.test(configSource), "surface civilization routes should use a bounded tile radius");
assert.ok(pipelineSource.indexOf("PS.render.surfaceTileWebgl") >= 0, "render rebuilds should include the surface tile WebGL subsystem");
assert.ok(surfaceCacheSource.indexOf("PLANET_SURFACE_CLOSE_VISIBLE_CHUNK_LIMIT") >= 0, "surface cache should apply the close zoom working-set limit");
assert.ok(surfaceCacheSource.indexOf("architectureZoom >= 15") >= 0, "close zoom working-set limit should start at the local perception band");

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
assert.ok(tileWebglSource.indexOf("getPageBuffer") >= 0, "surface tile compositor should build atlas batches in typed page buffers");
assert.ok(tileWebglSource.indexOf("appendInstance") >= 0, "surface tile compositor should encode instances into typed page buffers");
assert.ok(tileWebglSource.indexOf("finalizeBatchPages") >= 0, "surface tile compositor should finalize atlas pages before submission");
assert.ok(tileWebglSource.indexOf("new Float32Array(page)") >= 0, "surface tile compositor should promote atlas page batches to typed arrays");
assert.ok(tileWebglSource.indexOf("page.data.subarray(0, page.length)") >= 0, "surface tile compositor should finalize only ready typed page ranges");
assert.ok(tileWebglSource.indexOf(".subarray(pageOffset, pageOffset + uploadFloats)") >= 0, "surface tile compositor should upload typed subarray segments");
assert.strictEqual(tileWebglSource.indexOf("page.push"), -1, "surface tile compositor should not build upload pages as boxed JS arrays");
assert.strictEqual(tileWebglSource.indexOf("for (var copyIndex = 0; copyIndex < uploadFloats; copyIndex++)"), -1, "surface tile compositor should not scalar-copy typed upload pages");
assert.ok(tileWebglSource.indexOf("terrainAtlasCell") >= 0, "surface tile compositor should cache atlas material selection on ready chunk cells");
assert.ok(tileWebglSource.indexOf("selectAcceptedTerrainCell") >= 0, "surface tile compositor should replace proof-scene terrain cells with accepted equivalence cells");
assert.ok(featherSource.indexOf("PS.render.surfaceReadyFeather.getAlpha") >= 0, "surface ready feather helper should expose alpha encoding");
assert.ok(tileWebglSource.indexOf("surfaceReadyFeather.getAlpha") >= 0, "surface tile compositor should consume ready chunk edge feathering");
assert.strictEqual(tileWebglSource.indexOf("drawTargetTo2d"), -1, "surface tile compositor should not copy back to Canvas2D");
assert.ok(tileWebglSource.indexOf("drawArraysInstanced") >= 0, "surface tile compositor should submit instanced draws");
assert.ok(tileWebglSource.indexOf("vertexAttribDivisor") >= 0, "surface tile compositor should configure per-instance attributes");

const context = {
  PS: {
    assets: {
      loadedSheets: {}
    },
    render: {
      surface: {
        withEcology(sample) {
          if (!sample || !sample.ecologyKey) {
            return sample;
          }

          return Object.assign({}, sample, {
            ecology: { key: sample.ecologyKey }
          });
        },
        withCivilization(sample) {
          if (!sample || !sample.civilizationKey) {
            return sample;
          }

          return Object.assign({}, sample, {
            civilization: { key: sample.civilizationKey }
          });
        }
      }
    },
    atlas: {
      pages: [],
      getTerrainEcologyMicroKey(sample, tileX, tileY) {
        return sample && sample.ecology ? ".ecoform." + ((tileX + tileY) % 4) : "";
      },
      getTerrainTransitionInfo(sample) {
        return sample && sample.acceptedTransition ? sample.acceptedTransition : null;
      },
      getTerrainCell(biome, tileX, tileY, sample) {
        const microKey = context.PS.atlas.getTerrainEcologyMicroKey(sample, tileX, tileY);
        const civKey = sample && sample.civilization ? sample.civilization.key : "civ0";

        return {
          name: "test.grass." + (sample && sample.ecology ? sample.ecology.key : "eco.0.0") + microKey + "." + civKey,
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
      },
      normalizedBits() {
        return 0.75;
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
  Uint8Array,
  Buffer,
  Math,
  Number,
  Object,
  String,
  Boolean,
  Array,
  console
};

function makeLoadedSheet(cellIds) {
  return {
    image: { width: 512, height: 64, naturalWidth: 512, naturalHeight: 64 },
    pixelData: {
      type: "rgba-base64",
      width: 512,
      height: 64,
      byteLength: 512 * 64 * 4,
      data: Buffer.alloc(512 * 64 * 4, 255).toString("base64")
    },
    sheet: {
      getCell(name) {
        if (cellIds.indexOf(name) < 0) {
          return null;
        }
        return { name, x: 0, y: 0, w: 32, h: 32, image: { width: 32, height: 32 } };
      }
    }
  };
}

context.PS.assets.loadedSheets.equivalence_terrain_materials_v0 = makeLoadedSheet([
  "grass-lush.0",
  "grass-lush.1",
  "dirt-soil.0",
  "rock-mountain.0",
  "water-shallow.0",
  "water-deep.0"
]);
context.PS.assets.loadedSheets.equivalence_transitions_v0 = makeLoadedSheet([
  "grass-water.edge.n"
]);
context.PS.assets.loadedSheets.equivalence_terrain_transitions_v0 = makeLoadedSheet([
  "grass-water.edge.n"
]);

vm.createContext(context);
vm.runInContext(featherSource, context, { filename: "js/render/surface-ready-feather.js" });
vm.runInContext(equivalenceSource, context, { filename: "js/assets/equivalence.js" });
vm.runInContext(tileWebglSource, context, { filename: "js/render/surface-tile-webgl.js" });

const batches = context.PS.render.surfaceTileWebgl.makeBatches(
  {
    sampleEast: 0,
    sampleNorth: 0,
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
const firstPageBuffer = batches.pages[0].data;
const page = context.PS.render.surfaceTileWebgl.finalizeBatchPages(batches).pages[0];

assert.strictEqual(page[0], 10, "terrain atlas x should stay grid-aligned and ignore positional jitter");
assert.strictEqual(page[1], 32, "terrain atlas y should stay grid-aligned and ignore positional jitter");
assert.strictEqual(page[8], 1, "terrain atlas alpha should stay full when no edge feather is requested");
assert.ok(Math.abs(page[9] - 0.18) < 0.0001, "terrain atlas instances should encode bounded RANMAP shade variation");
assert.strictEqual(page[10], 22, "adjacent terrain atlas x should advance by exact sample size");
assert.strictEqual(page[11], 32, "adjacent terrain atlas y should remain grid-aligned");
assert.ok(batches.equivalenceTerrain > 0, "terrain atlas batches should select accepted terrain material pixels");
assert.ok(context.PS.assets.equivalence.getStats().byUse.terrainGround > 0, "surface terrain cells should record accepted terrain ground usage");

const reusedBatches = context.PS.render.surfaceTileWebgl.makeBatches(
  {
    sampleEast: 4,
    sampleNorth: 8,
    renderScreenX: 10,
    renderScreenY: 20,
    renderSamplePixelSize: 12,
    chunkSamples: 1
  },
  [{ sample: { biome: "grassland" }, screenX: 0, screenY: 0 }],
  1
);
assert.strictEqual(reusedBatches.pages[0].data, firstPageBuffer, "terrain atlas page builder should reuse typed page capacity across batches");
assert.strictEqual(reusedBatches.pages[0].length, 10, "reused terrain atlas page builder should reset to the current ready range");

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
assert.strictEqual(ecologyCell.terrainAtlasCell.name, "test.grass.eco.3.2.ecoform.0.civ0", "terrain cell cache should include the active ecology key and bounded micro phase");
assert.strictEqual(context.PS.render.surfaceTileWebgl.makeBatches(ecologyAddress, [ecologyCell], 1).equivalenceTerrain, 0, "accepted terrain materials should not replace active ecology terrain encoding");
ecologyAddress.sampleEast = 1;
context.PS.render.surfaceTileWebgl.makeBatches(ecologyAddress, [ecologyCell], 1);
assert.strictEqual(ecologyCell.terrainAtlasCell.name, "test.grass.eco.3.2.ecoform.1.civ0", "terrain cell cache should invalidate when ecology micro phase changes");
ecologyCell.sample.ecologyKey = "eco.0.0";
context.PS.render.surfaceTileWebgl.makeBatches(ecologyAddress, [ecologyCell], 1);
assert.strictEqual(ecologyCell.terrainAtlasCell.name, "test.grass.eco.0.0.ecoform.1.civ0", "terrain cell cache should invalidate when ecology key changes");
ecologyCell.sample.civilizationKey = "civ.route.2";
context.PS.render.surfaceTileWebgl.makeBatches(ecologyAddress, [ecologyCell], 1);
assert.strictEqual(ecologyCell.terrainAtlasCell.name, "test.grass.eco.0.0.ecoform.1.civ.route.2", "terrain cell cache should invalidate when civilization terrain pressure changes");
assert.strictEqual(context.PS.render.surfaceTileWebgl.makeBatches(ecologyAddress, [ecologyCell], 1).equivalenceTerrain, 0, "accepted terrain materials should not replace civilization terrain encoding");

context.PS.assets.equivalence.resetFrameStats();
const transitionBatches = context.PS.render.surfaceTileWebgl.makeBatches(
  {
    sampleEast: 0,
    sampleNorth: 0,
    renderScreenX: 0,
    renderScreenY: 0,
    renderSamplePixelSize: 12,
    chunkSamples: 1
  },
  [{
    sample: {
      biome: "grassland",
      acceptedTransition: {
        type: "coast",
        mask: 8,
        weight: 0.5,
        strength: 0.8
      }
    },
    screenX: 0,
    screenY: 0
  }],
  1
);
assert.strictEqual(transitionBatches.equivalenceTransitions, 1, "terrain transition batches should select accepted transition pixels");
assert.strictEqual(context.PS.assets.equivalence.getStats().byUse.terrainTransition, 1, "surface transitions should record accepted transition usage");

const featheredBatches = context.PS.render.surfaceTileWebgl.makeBatches(
  {
    sampleEast: 0,
    sampleNorth: 0,
    renderScreenX: 0,
    renderScreenY: 0,
    renderSamplePixelSize: 12,
    chunkSamples: 2,
    featherCenterX: 6,
    featherCenterY: 6,
    featherInnerRadius: 4,
    featherOuterRadius: 20,
    featherMinAlpha: 0.25
  },
  [
    { sample: { biome: "grassland" }, screenX: 0, screenY: 0 },
    { sample: { biome: "grassland" }, screenX: 16, screenY: 16 }
  ],
  1
);
const featheredPage = context.PS.render.surfaceTileWebgl.finalizeBatchPages(featheredBatches).pages[0];
assert.strictEqual(featheredPage[8], 1, "center ready cell should remain fully opaque");
assert.ok(featheredPage[18] >= 0.25 && featheredPage[18] < 1, "edge ready cell should fade toward the underlay");

const finalized = context.PS.render.surfaceTileWebgl.finalizeBatchPages({
  pages: {
    0: { data: new Float32Array([1, 2, 3, 4, 99, 100]), length: 4 },
    1: new Float32Array([5, 6, 7, 8]),
    2: [9, 10, 11, 12]
  },
  count: 0,
  culled: 0,
  materialCounts: {}
});
assert.ok(finalized.pages[0] instanceof Float32Array, "finalized terrain page should be a typed upload buffer");
assert.ok(finalized.pages[1] instanceof Float32Array, "already finalized terrain pages should stay typed");
assert.strictEqual(finalized.pages[0][2], 3, "finalized terrain page should preserve instance values");
assert.strictEqual(finalized.pages[0].length, 4, "finalized terrain page should expose only the ready range");
assert.ok(finalized.pages[2] instanceof Float32Array, "legacy array terrain pages should be promoted to typed data");

console.log("surface tile webgl checks passed");
