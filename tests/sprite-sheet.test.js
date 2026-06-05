const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "js/assets/sprite-sheet.js"), "utf8");

const context = {
  PS: {
    assets: {}
  },
  Number: Number,
  Math: Math,
  Object: Object,
  Array: Array,
  String: String,
  Error: Error
};
const image = { id: "sheet" };

vm.createContext(context);
vm.runInContext(source, context, { filename: "js/assets/sprite-sheet.js" });

function plainCell(cell) {
  return {
    name: cell.name,
    x: cell.x,
    y: cell.y,
    w: cell.w,
    h: cell.h,
    image: cell.image
  };
}

const SpriteSheet = context.PS.assets.SpriteSheet;

const gridNames = [];
for (let index = 0; index < 32; index += 1) {
  gridNames.push("grass_" + index);
}
const gridSheet = SpriteSheet.fromGrid(image, {
  type: "grid",
  tileWidth: 32,
  tileHeight: 32,
  columns: 8,
  rows: 4,
  names: gridNames
});

assert.strictEqual(gridSheet.format, "grid", "grid parser should label format");
assert.strictEqual(gridSheet.getCells().length, 32, "8x4 grid should produce 32 cells");
assert.deepStrictEqual(
  plainCell(gridSheet.getCell("grass_0")),
  { name: "grass_0", x: 0, y: 0, w: 32, h: 32, image: image },
  "first grid cell should start at origin"
);
assert.deepStrictEqual(
  plainCell(gridSheet.getCell("grass_9")),
  { name: "grass_9", x: 32, y: 32, w: 32, h: 32, image: image },
  "grid cell should use column and row coordinates"
);
assert.deepStrictEqual(
  plainCell(gridSheet.getCell("grass_31")),
  { name: "grass_31", x: 224, y: 96, w: 32, h: 32, image: image },
  "last 8x4 grid cell should be at column 7 row 3"
);

const textureSheet = SpriteSheet.fromTexturePacker(image, {
  frames: {
    grass_0: { frame: { x: 0, y: 0, w: 32, h: 32 } },
    grass_1: { frame: { x: 40, y: 8, w: 16, h: 24 } }
  }
});

assert.strictEqual(textureSheet.format, "texturepacker", "TexturePacker parser should label format");
assert.deepStrictEqual(
  plainCell(textureSheet.getCell("grass_1")),
  { name: "grass_1", x: 40, y: 8, w: 16, h: 24, image: image },
  "TexturePacker frame hash should parse frame coordinates"
);

const asepriteSheet = SpriteSheet.fromAseprite(image, {
  frames: {
    walk_0: { frame: { x: 0, y: 0, w: 16, h: 24 }, duration: 80 },
    walk_1: { frame: { x: 16, y: 0, w: 16, h: 24 }, duration: 100 },
    idle_0: { frame: { x: 32, y: 0, w: 16, h: 24 }, duration: 200 }
  },
  meta: {
    frameTags: [
      { name: "walk", from: 0, to: 1, direction: "forward" },
      { name: "idle", from: 2, to: 2, direction: "forward" }
    ]
  }
});
const walk = asepriteSheet.getAnimation("walk");

assert.strictEqual(asepriteSheet.format, "aseprite", "Aseprite parser should label format");
assert.ok(walk, "Aseprite parser should expose frame tag animation");
assert.strictEqual(walk.frames.length, 2, "walk tag should include frames from tag range");
assert.strictEqual(walk.frames[0].cell.name, "walk_0", "animation frame should reference parsed cell");
assert.strictEqual(walk.frames[0].duration, 80, "animation frame should keep duration");
assert.strictEqual(walk.direction, "forward", "animation should keep frame tag direction");
assert.strictEqual(asepriteSheet.getAnimation("idle").frames[0].cell.name, "idle_0", "single-frame tag should parse");

assert.strictEqual(SpriteSheet.detect(image, { type: "grid", tileWidth: 1, tileHeight: 1, columns: 1, rows: 1 }).format, "grid");
assert.strictEqual(SpriteSheet.detect(image, { frames: { a: { frame: { x: 0, y: 0, w: 1, h: 1 } } } }).format, "texturepacker");
assert.strictEqual(
  SpriteSheet.detect(image, {
    frames: { a: { frame: { x: 0, y: 0, w: 1, h: 1 }, duration: 50 } },
    meta: { frameTags: [{ name: "a", from: 0, to: 0 }] }
  }).format,
  "aseprite"
);
assert.throws(function() {
  SpriteSheet.detect(image, {});
}, /Unknown sprite sheet format/, "unknown format should throw");

console.log("sprite sheet checks passed");
