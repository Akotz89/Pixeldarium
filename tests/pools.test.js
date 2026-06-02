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
  window: {
    addEventListener() {}
  },
  document: {
    getElementById() {
      return {
        hidden: false,
        textContent: ""
      };
    }
  },
  performance: {},
  world: {
    tick: 0,
    seedText: "POOL-TEST",
    rngState: 1,
    nextLineageId: 1,
    lineages: {},
    organisms: [],
    food: [],
    foodPositions: {},
    foodBuckets: {},
    fps: 60,
    tps: 60,
    updateMs: 1.5,
    drawMs: 2.5
  }
};

const source = [
  "js/core/namespace.js",
  "config.js",
  "const WORLD_WIDTH = 320; const WORLD_HEIGHT = 170;",
  "js/legacy/utils/part-01.js",
  "js/core/config.js",
  "js/core/world-grid.js",
  "js/systems/pools.js",
  "js/legacy/food/part-01.js",
  "js/legacy/organisms/part-01.js",
  "js/legacy/organisms/part-03.js",
  "js/debug/performance.js"
].map((file) => file.endsWith(".js") ? read(file) : file).join("\n");

vm.runInNewContext(`${source}

function getRandomLatLonInTile(x, y) {
  return {
    latitude: y + 0.25,
    longitude: x + 0.75
  };
}

function getWrappedWorldX(x) {
  return PS.worldGrid.getWrappedX(x);
}

function getClampedWorldY(y) {
  return PS.worldGrid.getClampedY(y);
}

function getWrappedBucketIndexes(centerX, radius, bucketSize, worldSize) {
  return PS.worldGrid.getWrappedBucketIndexes(centerX, radius, bucketSize, worldSize);
}

function getClampedBucketIndexes(centerY, radius, bucketSize, worldSize) {
  return PS.worldGrid.getClampedBucketIndexes(centerY, radius, bucketSize, worldSize);
}

function getTileManhattanDistance(fromX, fromY, toX, toY) {
  return PS.worldGrid.getTileManhattanDistance(fromX, fromY, toX, toY);
}

function getEntitySurfacePosition(entity) {
  return {
    latitude: entity.latitude,
    longitude: entity.longitude
  };
}

function getPlanetLatitudeForTile(y) {
  return y;
}

function getPlanetLongitudeForTile(x) {
  return x;
}

function getTileGreatCircleDistanceKm() {
  return 0;
}

function isFertile() {
  return true;
}

function recordOrganismDeath(count) {
  world.deathsRecorded = (world.deathsRecorded || 0) + count;
}

PS.config.pools.maxOrganisms = 4;
PS.config.pools.maxFoodParticles = 3;
PS.pools.reset();

assert.strictEqual(PS.pools.organism.capacity, 4, "organism capacity should be configurable");
assert.strictEqual(PS.pools.food.capacity, 3, "food capacity should be configurable");
assert.ok(PS.pools.organism.arrays.x instanceof Float32Array, "organism x should be typed-array backed");
assert.strictEqual(Object.keys(PS.pools.organism.arrays).length, 24, "organism pool should expose 20+ typed arrays");

var organism = makeOrganism(5, 6);
assert.strictEqual(PS.pools.getStats().activeOrganisms, 1, "makeOrganism should acquire from pool");
assert.strictEqual(organism.x, 5, "pooled organism should expose x");
organism.energy = 42;
organism.traits.vision = 27;
assert.strictEqual(PS.pools.organism.arrays.energy[organism.poolIndex], 42, "organism energy should write through to typed array");
assert.strictEqual(PS.pools.organism.arrays.vision[organism.poolIndex], 27, "trait writes should update typed array");

organism.energy = 0;
world.organisms = [organism];
removeDeadOrganisms();
assert.strictEqual(world.organisms.length, 0, "dead organism should be removed");
assert.strictEqual(PS.pools.getStats().activeOrganisms, 0, "dead organism should return to free list");

var reused = makeOrganism(7, 8);
assert.strictEqual(reused, organism, "free-list should reuse released organism facade");

var food = addFoodAt(2, 3);
assert.strictEqual(PS.pools.getStats().activeFood, 1, "addFoodAt should acquire pooled food");
assert.strictEqual(food.x, 2, "pooled food should expose x");
assert.strictEqual(removeFood(food), food, "removeFood should preserve returned identity");
assert.strictEqual(PS.pools.getStats().activeFood, 0, "removed food should return to pool");

var foodAgain = addFoodAt(4, 5);
assert.strictEqual(foodAgain, food, "food pool should reuse released particle");

var memoryLabel = PS.debug.performance.getMemoryLabel();
var poolLabel = PS.debug.performance.getPoolLabel();
assert.ok(memoryLabel.indexOf("MB est") > -1, "performance debug should estimate memory when performance.memory is unavailable");
assert.ok(poolLabel.indexOf("org 1/4") > -1, "performance debug should report organism pool usage");
assert.ok(poolLabel.indexOf("food 1/3") > -1, "performance debug should report food pool usage");

console.log("pool checks passed");
`, context);

const hotLoopFiles = [
  "js/legacy/organisms/part-03.js",
  "js/legacy/food/part-01.js",
  "js/sim/organisms.js",
  "js/sim/food.js"
];

for (const file of hotLoopFiles) {
  assert.ok(!/\bnew\s+/.test(read(file)), `${file} should not use new in hot simulation paths`);
}
