const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

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
vm.runInContext(read("js/core/tile-registry.js"), context, { filename: "js/core/tile-registry.js" });
vm.runInContext(read("js/render/entity-atlas.js"), context, { filename: "js/render/entity-atlas.js" });
vm.runInContext(read("js/render/entity-atlas-intents.js"), context, { filename: "js/render/entity-atlas-intents.js" });
vm.runInContext(read("js/render/entity-atlas-civilization.js"), context, { filename: "js/render/entity-atlas-civilization.js" });
vm.runInContext(read("js/render/terrain-atlas-civilization.js"), context, { filename: "js/render/terrain-atlas-civilization.js" });
vm.runInContext(read("js/render/terrain-atlas-detail.js"), context, { filename: "js/render/terrain-atlas-detail.js" });

context.PS.core.TileRegistry.loadFromJSON(JSON.parse(read("data/tiles.json")));
context.PS.atlas.init();

function terrainCell(civilization, tileX) {
  return context.PS.atlas.getTerrainCell("grassland", tileX, 18, {
    detail: {
      surface: "grass",
      elevation: 0.42,
      roughness: 0.2,
      materialSignals: {}
    },
    civilization
  });
}

function pixelAt(cell, x, y) {
  const page = context.PS.atlas.pages[cell.pageIndex];
  const index = ((cell.y + y) * page.width + cell.x + x) * 4;
  return Array.from(page.data.slice(index, index + 4));
}

function changedPixels(from, to) {
  let changed = 0;

  for (let y = 0; y < from.h; y++) {
    for (let x = 0; x < from.w; x++) {
      if (pixelAt(from, x, y).join(",") !== pixelAt(to, x, y).join(",")) {
        changed++;
      }
    }
  }

  return changed;
}

const plain = terrainCell(null, 20);
const farm = terrainCell({ type: "settlement", family: "farm", pressure: 0.9, settlementPressure: 0.9 }, 21);
const yard = terrainCell({ type: "settlement", family: "yard", pressure: 0.55, settlementPressure: 0.55 }, 22);
const block = terrainCell({ type: "settlement", family: "block", pressure: 0.85, settlementPressure: 0.85 }, 23);
const production = terrainCell({ type: "settlement", family: "production", pressure: 0.95, settlementPressure: 0.95 }, 24);
const road = terrainCell({ type: "route", family: "road", pressure: 0.7, routePressure: 0.7 }, 25);
const canal = terrainCell({ type: "route", family: "canal", pressure: 0.7, routePressure: 0.7 }, 26);
const dock = terrainCell({ type: "route", family: "dock", pressure: 0.7, routePressure: 0.7 }, 27);

assert.ok(farm.name.indexOf(".civ.settlement.3.farm") > 0, "farm footprint should use a bounded civilization family key");
assert.ok(yard.name.indexOf(".civ.settlement.2.yard") > 0, "yard footprint should use a bounded civilization family key");
assert.ok(block.name.indexOf(".civ.settlement.3.block") > 0, "block footprint should use a bounded civilization family key");
assert.ok(production.name.indexOf(".civ.settlement.3.production") > 0, "production footprint should use a bounded civilization family key");
assert.ok(road.name.indexOf(".civ.route.2.road") > 0, "road footprint should use a bounded route family key");
assert.ok(canal.name.indexOf(".civ.route.2.canal") > 0, "canal footprint should use a bounded route family key");
assert.ok(dock.name.indexOf(".civ.route.2.dock") > 0, "dock footprint should use a bounded route family key");
assert.ok(changedPixels(farm, plain) >= 18, "farm terrain cell should add field-strip footprint pixels");
assert.ok(changedPixels(production, plain) >= 18, "production terrain cell should add rectilinear built pixels");
assert.ok(changedPixels(road, plain) >= 12, "road terrain cell should add route footprint pixels");
assert.notStrictEqual(farm.name, block.name, "settlement families should not overwrite each other in the atlas cache");
assert.notDeepStrictEqual(pixelAt(road, 7, 7), pixelAt(canal, 7, 7), "road and canal route families should render distinct pixels");
assert.ok(changedPixels(dock, road) >= 6, "dock and road route families should render distinct cells");

console.log("terrain civilization atlas checks passed");
