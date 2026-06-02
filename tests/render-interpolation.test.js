const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const context = {
  assert,
  console,
  PS: {
    render: {}
  },
  CONFIG: {
    TILE_SIZE: 10
  },
  WORLD_WIDTH: 20,
  WORLD_HEIGHT: 10,
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },
  isGlobeRenderMode() {
    return false;
  },
  getEntitySurfacePosition() {
    return null;
  },
  ensureEntitySurfacePosition(entity) {
    return entity;
  },
  isPlanetLocalView() {
    return false;
  },
  projectPlanetLocalPoint() {
    return null;
  },
  projectPlanetPoint() {
    return null;
  },
  interpolateLongitudeDeg(fromLongitude, toLongitude, amount) {
    return fromLongitude + (toLongitude - fromLongitude) * amount;
  },
  drawEntityAtCanvasPosition() {}
};

vm.runInNewContext(`${read("js/render/entities.js")}

var midpoint = PS.render.entities.getRenderPosition({
  prevX: 2,
  prevY: 4,
  x: 4,
  y: 8
}, 0.5);

assert.strictEqual(midpoint.x, 35, "flat render X should interpolate between previous and current tile centers");
assert.strictEqual(midpoint.y, 65, "flat render Y should interpolate between previous and current tile centers");

var wrapped = PS.render.entities.getRenderPosition({
  prevX: 19,
  prevY: 5,
  x: 0,
  y: 5
}, 0.5);

assert.strictEqual(wrapped.x, 200, "wrapped flat render X should take the shortest world-edge path");
assert.strictEqual(wrapped.y, 55, "wrapped flat render Y should stay centered on the row");

var current = PS.render.entities.getRenderPosition({
  prevX: 2,
  prevY: 2,
  x: 7,
  y: 3
}, 1);

assert.strictEqual(current.x, 75, "full interpolation should render current X");
assert.strictEqual(current.y, 35, "full interpolation should render current Y");

console.log("render interpolation checks passed");
`, context);
