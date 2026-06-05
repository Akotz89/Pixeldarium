const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "assets/manifest.json");
const grassMetaPath = path.join(root, "assets/terrain/grass.json");
const grassPngPath = path.join(root, "assets/terrain/grass.png");
const loaderSource = fs.readFileSync(path.join(root, "js/assets/loader.js"), "utf8");
const spriteSheetSource = fs.readFileSync(path.join(root, "js/assets/sprite-sheet.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const grassMeta = JSON.parse(fs.readFileSync(grassMetaPath, "utf8"));
const png = fs.readFileSync(grassPngPath);

function pngSize(buffer) {
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

["terrain", "vegetation", "creatures", "transitions", "effects", "ui"].forEach((directory) => {
  assert.ok(fs.existsSync(path.join(root, "assets", directory)), "asset subdirectory should exist: " + directory);
  assert.ok(fs.existsSync(path.join(root, "assets", directory, ".gitkeep")), "asset subdirectory should include .gitkeep: " + directory);
});

assert.strictEqual(manifest.version, 1, "manifest should declare schema version");
assert.ok(manifest.sheets.terrain_grass, "manifest should include terrain_grass sheet");
assert.strictEqual(manifest.sheets.terrain_grass.path, "assets/terrain/grass.png", "terrain grass path should match placeholder PNG");
assert.strictEqual(manifest.sheets.terrain_grass.tileSize, 32, "terrain grass tile size should be 32");
assert.strictEqual(manifest.sheets.terrain_grass.sprites.length, 8, "terrain grass should declare 8 sprite rects");
assert.deepStrictEqual(manifest.sheets.terrain_grass.sprites[7], { id: "terrain.grass.7", rect: [224, 0, 32, 32] }, "last grass sprite rect should match 8th tile");
assert.deepStrictEqual(grassMeta.names, manifest.sheets.terrain_grass.sprites.map((sprite) => sprite.id), "grass grid metadata should match manifest sprite IDs");
assert.deepStrictEqual(pngSize(png), { width: 256, height: 32 }, "grass PNG should be 256x32");

function createContext() {
  const fetchCalls = [];
  const imageLoads = [];

  function TestImage() {
    this.onload = null;
    this.onerror = null;
    this.width = 0;
    this.height = 0;
  }

  Object.defineProperty(TestImage.prototype, "src", {
    set(url) {
      this._src = url;
      imageLoads.push(url);
      this.width = url === "assets/terrain/grass.png" ? 256 : 1;
      this.height = url === "assets/terrain/grass.png" ? 32 : 1;
      this.onload();
    },
    get() {
      return this._src;
    }
  });

  const context = {
    PS: {
      assets: {},
      runtime: {
        recordError() {}
      }
    },
    Map: Map,
    Promise: Promise,
    Error: Error,
    Image: TestImage,
    Number: Number,
    Math: Math,
    Object: Object,
    Array: Array,
    String: String,
    window: { location: { protocol: "http:" } },
    fetch(url) {
      fetchCalls.push(url);
      return Promise.resolve({
        ok: true,
        status: 200,
        json() {
          if (url === "assets/manifest.json") {
            return Promise.resolve(manifest);
          }
          if (url === "assets/terrain/grass.json") {
            return Promise.resolve(grassMeta);
          }
          return Promise.resolve({});
        }
      });
    },
    fetchCalls: fetchCalls,
    imageLoads: imageLoads
  };

  vm.createContext(context);
  vm.runInContext(spriteSheetSource, context, { filename: "js/assets/sprite-sheet.js" });
  vm.runInContext(loaderSource, context, { filename: "js/assets/loader.js" });
  return context;
}

(async function() {
  const context = createContext();
  const loader = new context.PS.assets.AssetLoader();
  const loadedManifest = await loader.loadManifest("assets/manifest.json");
  const loadedGrass = context.PS.assets.loadedSheets.terrain_grass;
  const grassCell = loadedGrass.sheet.getCell("terrain.grass.7");

  assert.strictEqual(loadedManifest, manifest, "loadManifest should resolve the parsed manifest");
  assert.deepStrictEqual(context.fetchCalls, ["assets/manifest.json", "assets/terrain/grass.json"], "loadManifest should fetch manifest and sheet metadata");
  assert.deepStrictEqual(context.imageLoads, ["assets/terrain/grass.png"], "loadManifest should load the placeholder PNG");
  assert.ok(loadedGrass.sheet, "loadManifest should populate loaded sprite sheet dictionary");
  assert.deepStrictEqual(
    { x: grassCell.x, y: grassCell.y, w: grassCell.w, h: grassCell.h },
    { x: 224, y: 0, w: 32, h: 32 },
    "loaded sprite sheet should expose grass coordinates"
  );

  console.log("asset manifest checks passed");
}()).catch((error) => {
  console.error(error);
  process.exit(1);
});
