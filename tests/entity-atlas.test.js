const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const namespaceSource = read("js/core/namespace.js");
const tileRegistrySource = read("js/core/tile-registry.js");
const atlasSource = read("js/render/entity-atlas.js");
const terrainAtlasDetailSource = read("js/render/terrain-atlas-detail.js");
const entityWebglSource = read("js/render/entity-webgl.js");
const tilesData = JSON.parse(read("data/tiles.json"));

assert.ok(namespaceSource.indexOf("js/render/entity-atlas.js") >= 0, "entity atlas should load before entity WebGL");
assert.ok(namespaceSource.indexOf("js/render/terrain-atlas-detail.js") > namespaceSource.indexOf("js/render/entity-atlas.js"), "terrain atlas detail should load after atlas core");
assert.ok(entityWebglSource.indexOf("getTraitOrganismCell") >= 0, "entity WebGL should request trait-specific organism cells");
assert.ok(entityWebglSource.indexOf("getRgbaTexture") >= 0, "entity WebGL should upload atlas pages as RGBA buffers");
assert.strictEqual(entityWebglSource.indexOf("PS.spriteSystem"), -1, "entity WebGL should not depend on the removed sprite system");

const context = {
  PS: {
    core: {},
    render: {},
    atlas: null
  },
  CONFIG: {
    LINEAGE_COLORS: ["#72d7ff", "#58f06c", "#c884ff"]
  },
  Uint8Array,
  Date,
  Object,
  String,
  Number,
  Boolean,
  Array,
  Map,
  Math,
  Error,
  performance: {
    now() {
      return 1;
    }
  },
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
};

vm.createContext(context);
vm.runInContext(tileRegistrySource, context, { filename: "js/core/tile-registry.js" });
vm.runInContext(atlasSource, context, { filename: "js/render/entity-atlas.js" });
vm.runInContext(terrainAtlasDetailSource, context, { filename: "js/render/terrain-atlas-detail.js" });

context.PS.core.TileRegistry.loadFromJSON(tilesData);
context.PS.atlas.init();

const roundOrganism = {
  lineageId: 1,
  x: 10,
  y: 20,
  traits: {
    bodySize: 0.75,
    bodyShape: 0,
    limbCount: 2,
    appendageType: 0,
    camouflage: 0
  }
};
const angularOrganism = {
  lineageId: 2,
  x: 10,
  y: 20,
  traits: {
    bodySize: 2.4,
    bodyShape: 3,
    limbCount: 10,
    appendageType: 3,
    camouflage: 0.8
  }
};

const roundCell = context.PS.atlas.getTraitOrganismCell(roundOrganism, 0);
const angularCell = context.PS.atlas.getTraitOrganismCell(angularOrganism, 0);
const oceanCell = context.PS.atlas.getTerrainCell("ocean", 4, 8);
const forestCell = context.PS.atlas.getTerrainCell("forest", 4, 8);
const desertCell = context.PS.atlas.getTerrainCell("desert", 4, 8);
const volcanicCell = context.PS.atlas.getTerrainCell("volcanic", 4, 8);
const deepWaterCell = context.PS.atlas.getTerrainCell("ocean", 12, 5, {
  detail: {
    surface: "deep water",
    elevation: 0.1,
    materialSignals: { waterDepth: 0.9, wetness: 1 }
  }
});
const marshCell = context.PS.atlas.getTerrainCell("wetland", 13, 5, {
  detail: {
    surface: "meadow",
    elevation: 0.25,
    roughness: 0.1,
    materialSignals: { wetness: 0.8, surfaceRoughness: 0.1 }
  }
});
const cliffCell = context.PS.atlas.getTerrainCell("mountain", 14, 5, {
  detail: {
    surface: "rock",
    elevation: 0.88,
    roughness: 0.9,
    materialSignals: { surfaceRoughness: 0.92 }
  }
});
const plainGrassCell = context.PS.atlas.getTerrainCell("grassland", 22, 9, {
  detail: {
    surface: "grass",
    elevation: 0.42,
    roughness: 0.2,
    materialSignals: {}
  },
  tileBlend: {
    biomeWeights: { grassland: 1 },
    transitionStrength: 0,
    xAmount: 0.5,
    yAmount: 0.5
  }
});
const coastEdgeGrassCell = context.PS.atlas.getTerrainCell("grassland", 22, 9, {
  detail: {
    surface: "grass",
    elevation: 0.42,
    roughness: 0.2,
    materialSignals: {}
  },
  tileBlend: {
    biomeWeights: { grassland: 0.64, ocean: 0.36 },
    transitionStrength: 0.36,
    xAmount: 0.82,
    yAmount: 0.5
  }
});
const stats = context.PS.atlas.getStats();
const page = context.PS.atlas.pages[0];

function pixelAt(cell, x, y) {
  const index = ((cell.y + y) * page.width + cell.x + x) * 4;
  return Array.from(page.data.slice(index, index + 4));
}

function uniqueColorCount(cell) {
  const colors = new Set();

  for (let y = 0; y < cell.h; y++) {
    for (let x = 0; x < cell.w; x++) {
      colors.add(pixelAt(cell, x, y).join(","));
    }
  }

  return colors.size;
}

assert.ok(page.data instanceof Uint8Array, "atlas page should be a packed RGBA buffer");
assert.strictEqual(page.width, 256, "atlas page should use stable packed width");
assert.strictEqual(page.height, 256, "atlas page should use stable packed height");
assert.notStrictEqual(roundCell.name, angularCell.name, "different traits should produce different cell keys");
assert.strictEqual(roundCell.w, 32, "organism cell should reserve diffuse plus normal halves");
assert.strictEqual(roundCell.h, 16, "organism cell should use a 16px pixel sprite height");
assert.notDeepStrictEqual(pixelAt(roundCell, 7, 7), pixelAt(angularCell, 7, 7), "trait/lineage differences should change sprite pixels");
assert.notDeepStrictEqual(pixelAt(oceanCell, 7, 7), pixelAt(forestCell, 7, 7), "ocean and forest terrain cells should use distinct material pixels");
assert.notDeepStrictEqual(pixelAt(desertCell, 7, 7), pixelAt(volcanicCell, 7, 7), "desert and volcanic terrain cells should use distinct material pixels");
assert.ok(uniqueColorCount(oceanCell) >= 5, "water atlas cells should include foam/shadow detail beyond base palette colors");
assert.ok(uniqueColorCount(forestCell) >= 5, "forest atlas cells should include canopy detail beyond base palette colors");
assert.ok(uniqueColorCount(desertCell) >= 5, "desert atlas cells should include dune detail beyond base palette colors");
assert.ok(uniqueColorCount(cliffCell) >= 5, "ridge atlas cells should include rocky detail beyond base palette colors");
assert.ok(oceanCell.name.indexOf("terrain.water_") === 0, "ocean terrain should select registered water materials");
assert.ok(forestCell.name.indexOf("terrain.forest_floor.") === 0 || forestCell.name.indexOf("terrain.rock_mossy.") === 0, "forest terrain should select registered forest materials");
assert.ok(deepWaterCell.name.indexOf("terrain.water_deep.") === 0, "deep water samples should select the deep water tile");
assert.ok(marshCell.name.indexOf("terrain.marsh.") === 0 || marshCell.name.indexOf("terrain.wetland.") === 0 || marshCell.name.indexOf("terrain.mud.") === 0, "wet samples should select wetland material tiles");
assert.ok(cliffCell.name.indexOf("terrain.rock_cliff.") === 0 || cliffCell.name.indexOf("terrain.rock.") === 0, "rough mountain samples should select rock material tiles");
assert.ok(plainGrassCell.name.indexOf(".plain") > 0, "plain terrain cells should keep an explicit plain transition key");
assert.ok(coastEdgeGrassCell.name.indexOf(".coast.") > 0, "biome blend samples should encode bounded coast transition cells");
assert.notStrictEqual(coastEdgeGrassCell.name, plainGrassCell.name, "transition edges should not overwrite plain material atlas cells");
assert.notDeepStrictEqual(pixelAt(coastEdgeGrassCell, 15, 2), pixelAt(plainGrassCell, 15, 2), "east coast edge should add readable transition pixels");
assert.ok(uniqueColorCount(coastEdgeGrassCell) >= uniqueColorCount(plainGrassCell), "transition edge cells should preserve material detail density");
assert.ok(stats.traitCells >= 2, "atlas stats should count generated trait sprites");
assert.ok(stats.terrainCells >= 4, "atlas stats should count generated biome terrain cells");
assert.ok(stats.pageBytes > 0, "atlas stats should expose packed atlas bytes");

console.log("entity atlas checks passed");
