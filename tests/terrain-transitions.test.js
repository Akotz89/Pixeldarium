const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { performance } = require("perf_hooks");

const root = path.resolve(__dirname, "..");
const registrySource = fs.readFileSync(path.join(root, "js/core/tile-registry.js"), "utf8");
const resolverSource = fs.readFileSync(path.join(root, "js/render/terrain-transitions.js"), "utf8");
const transitionsSidecarSource = fs.readFileSync(path.join(root, "data/transitions.json.js"), "utf8");
const tilesData = JSON.parse(fs.readFileSync(path.join(root, "data/tiles.json"), "utf8"));
const transitionsData = JSON.parse(fs.readFileSync(path.join(root, "data/transitions.json"), "utf8"));

function createGrid(width, height, fill) {
  const tiles = new Array(width * height).fill(fill);
  return {
    width,
    height,
    revision: 1,
    tiles,
    getTileId(x, y) {
      if (x < 0 || y < 0 || x >= width || y >= height) {
        return null;
      }
      return tiles[y * width + x];
    },
    setTileId(x, y, id) {
      tiles[y * width + x] = id;
      this.revision += 1;
    }
  };
}

const sidecarContext = {
  PS: {
    assets: {
      captured: {},
      registerJSON(url, data) {
        this.captured[url] = data;
      }
    }
  }
};
vm.createContext(sidecarContext);
vm.runInContext(transitionsSidecarSource, sidecarContext, { filename: "data/transitions.json.js" });
assert.strictEqual(
  JSON.stringify(sidecarContext.PS.assets.captured["data/transitions.json"]),
  JSON.stringify(transitionsData),
  "transitions sidecar should match transitions JSON"
);

const context = {
  PS: {
    core: {},
    render: {}
  },
  Map,
  Array,
  Object,
  String,
  Number,
  Error,
  RegExp,
  Math,
  WeakMap
};
vm.createContext(context);
vm.runInContext(registrySource, context, { filename: "js/core/tile-registry.js" });
vm.runInContext(resolverSource, context, { filename: "js/render/terrain-transitions.js" });

const registry = context.PS.core.TileRegistry;
registry.loadFromJSON(tilesData);
const Resolver = context.PS.render.TerrainTransitionResolver;
const resolver = new Resolver(registry, transitionsData);
const bits = Resolver.BITS;

assert.ok(transitionsData.pairs.length >= 5, "transitions data should define required transition pairs");
assert.strictEqual(resolver.lookup.size, transitionsData.pairs.length * 2, "lookup should include forward and reverse pairs");
assert.ok(resolver.getPair("grass_lush", "sand"), "lookup should include grass to sand pair");
assert.ok(resolver.getPair("sand", "grass_lush"), "lookup should include reverse sand to grass pair");

const edgeGrid = createGrid(3, 3, "sand");
edgeGrid.setTileId(1, 1, "sand");
edgeGrid.setTileId(1, 0, "grass_lush");
let resolved = resolver.resolve(1, 1, edgeGrid);
assert.strictEqual(resolver.getNeighborMask(1, 1, "sand", edgeGrid), bits.N, "north neighbor should set N bit");
assert.strictEqual(resolver.maskToSpriteIndex(bits.N), 0, "N mask should map to north edge sprite");
assert.strictEqual(resolved.baseTile, "sand", "resolved base tile should match grid tile");
assert.ok(resolved.overlays.some((overlay) => overlay.spriteId === "transitions.grass_sand.0" && overlay.edge === "N"), "grass-sand north edge should produce transition overlay");

const cornerGrid = createGrid(3, 3, "sand");
cornerGrid.setTileId(1, 1, "sand");
cornerGrid.setTileId(2, 0, "grass_lush");
resolved = resolver.resolve(1, 1, cornerGrid);
assert.strictEqual(resolver.getNeighborMask(1, 1, "sand", cornerGrid), bits.NE, "diagonal neighbor should set NE bit");
assert.strictEqual(resolver.maskToSpriteIndex(bits.NE), 4, "NE diagonal should map to outer corner sprite");
assert.ok(resolved.overlays.some((overlay) => overlay.spriteIndex === 4 && overlay.edge === "NE"), "NE diagonal should produce outer corner overlay");

const innerGrid = createGrid(3, 3, "sand");
innerGrid.setTileId(1, 1, "sand");
innerGrid.setTileId(1, 0, "grass_lush");
innerGrid.setTileId(2, 1, "grass_lush");
resolved = resolver.resolve(1, 1, innerGrid);
assert.strictEqual(
  resolver.getNeighborMask(1, 1, "sand", innerGrid) & (bits.N | bits.E | bits.NE),
  bits.N | bits.E,
  "missing diagonal with N/E neighbors should form inner corner mask"
);
assert.ok(resolved.overlays.some((overlay) => overlay.spriteIndex === 8 && overlay.edge === "innerNE"), "N+E without NE should produce inner corner overlay");

const noOverlay = resolver.resolve(1, 1, createGrid(3, 3, "grass_lush"));
assert.strictEqual(noOverlay.overlays.length, 0, "uniform terrain should produce no transition overlays");

const cacheGrid = createGrid(3, 3, "sand");
cacheGrid.setTileId(1, 0, "grass_lush");
const beforeChange = resolver.resolve(1, 1, cacheGrid);
cacheGrid.setTileId(1, 0, "water_shallow");
const afterChange = resolver.resolve(1, 1, cacheGrid);
assert.notStrictEqual(beforeChange.overlays[0].to, afterChange.overlays[0].to, "revision change should invalidate cached transition result");

const largeGrid = createGrid(40, 25, "sand");
for (let y = 0; y < 25; y += 1) {
  for (let x = 0; x < 40; x += 1) {
    if ((x + y) % 7 === 0) {
      largeGrid.setTileId(x, y, "grass_lush");
    } else if ((x * 3 + y) % 11 === 0) {
      largeGrid.setTileId(x, y, "water_shallow");
    }
  }
}
resolver.invalidate();
resolver.resolveChunk(largeGrid, 40, 25);
const start = performance.now();
resolver.resolveChunk(largeGrid, 40, 25);
const elapsed = performance.now() - start;
assert.ok(elapsed < 1, "cached transition resolution for 1000 tiles should be under 1ms; got " + elapsed.toFixed(3) + "ms");
assert.ok(resolver.cacheHits >= 1000, "second chunk pass should use cached transition resolutions");

console.log("terrain transition checks passed", JSON.stringify({ elapsedMs: Number(elapsed.toFixed(3)), cacheHits: resolver.cacheHits }));
