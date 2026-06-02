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
  now: 0,
  window: {
    addEventListener() {}
  },
  performance: {
    now() {
      return context.now;
    }
  },
  world: {
    tick: 0,
    era: "Organisms",
    deepTimeYears: 0,
    speed: 1,
    isPaused: false
  }
};

const source = [
  "js/core/namespace.js",
  "config.js",
  "js/core/config.js",
  "js/epochs/registry.js",
  "js/systems/time.js"
].map(read).join("\n");

vm.runInNewContext(`${source}

assert.strictEqual(PS.time.dt, 1000 / 30, "fixed timestep should default to 1000/30ms");
assert.strictEqual(PS.time.maxTicksPerFrame, 4, "max ticks per frame should default to 4");
assert.strictEqual(PS.time.timeScales.length, 7, "adaptive time table should cover all AZR-295 epochs");
assert.strictEqual(PS.time.timeScales[0].yearsPerTick, 10000000, "cosmological scale should be 10M years per tick");
assert.strictEqual(PS.time.timeScales[1].yearsPerTick, 100000, "primordial scale should be 100K years per tick");
assert.strictEqual(PS.time.timeScales[2].yearsPerTick, 10000, "microbial scale should be 10K years per tick");
assert.strictEqual(PS.time.timeScales[3].yearsPerTick, 1000, "complex life scale should be 1K years per tick");
assert.strictEqual(PS.time.timeScales[4].yearsPerTick, 100, "intelligence scale should be 100 years per tick");
assert.strictEqual(PS.time.timeScales[5].yearsPerTick, 1, "civilization scale should be 1 year per tick");
assert.strictEqual(PS.time.timeScales[6].yearsPerTick, 1 / 12, "space scale should be 1 month per tick");

var ticks = 0;
var receivedDt = [];

function simulateTick(dt) {
  receivedDt.push(dt);
  ticks++;
  world.tick++;
  now += 2;
}

PS.time.reset();
var first = PS.time.runFrame(16, simulateTick);
assert.strictEqual(first.ticks, 0, "sub-dt frame should not simulate");
assert.ok(first.interpolation > 0 && first.interpolation < 1, "sub-dt frame should interpolate");
assert.strictEqual(first.rendered, false, "runFrame should not imply a render frame");
PS.time.recordRenderFrame(3.5);
assert.strictEqual(PS.time.lastFrame.rendered, true, "render frame should be recorded separately from sim tick");
assert.strictEqual(PS.time.lastFrame.drawMs, 3.5, "render frame should record draw duration");

var second = PS.time.runFrame(20, simulateTick);
assert.strictEqual(second.ticks, 1, "accumulated elapsed should simulate one fixed tick");
assert.strictEqual(receivedDt[0], PS.time.dt, "simulateTick should receive fixed dt");
assert.ok(second.updateMs > 0, "update time should be measured when ticks run");

world.speed = 2;
PS.time.reset();
var scaled = PS.time.runFrame(20, simulateTick);
assert.strictEqual(scaled.ticks, 1, "speed scale should advance accumulator faster");

world.speed = 1;
PS.time.reset();
var capped = PS.time.runFrame(250, simulateTick);
assert.strictEqual(capped.ticks, 4, "spiral guard should cap ticks per frame");
assert.ok(capped.droppedMs > 0, "spiral guard should report dropped backlog");
assert.ok(PS.time.accumulator <= PS.time.dt, "spiral guard should clamp accumulator backlog");

PS.config.sim.fixedDeltaMs = 25;
PS.config.sim.maxUpdatesPerFrame = 2;
PS.time.reset();
var configured = PS.time.runFrame(100, simulateTick);
assert.strictEqual(PS.time.dt, 25, "dt should be configurable through PS.config.sim");
assert.strictEqual(configured.ticks, 2, "configured max ticks should be honored");

var currentCalls = 0;
PS.epochs.current = function() {
  currentCalls++;
  return world.era;
};

PS.time.clearManualTimeScale();
world.era = "Primordial";
PS.time.timeScale.currentYearsPerTick = 1000;
var primordialScale = PS.time.updateAdaptiveTimeScale(false);
assert.ok(currentCalls > 0, "PS.time should read PS.epochs.current to detect epoch");
assert.strictEqual(primordialScale.targetYearsPerTick, 100000, "primordial epoch should target 100K years per tick");
assert.ok(
  primordialScale.currentYearsPerTick > 1000 && primordialScale.currentYearsPerTick < 100000,
  "epoch changes should transition smoothly instead of snapping"
);

PS.time.setManualTimeScale(6);
world.era = "Cosmological";
var manualScale = PS.time.updateAdaptiveTimeScale(false);
assert.strictEqual(manualScale.manualOverride, true, "manual time scale slider should set override state");
assert.strictEqual(manualScale.targetYearsPerTick, 1 / 12, "manual override should keep selected scale despite epoch");
assert.ok(PS.time.getTimeScaleLabel().indexOf("manual") >= 0, "manual override should be visible in label");

world.deepTimeYears = 0;
PS.time.reset();
PS.time.runFrame(100, simulateTick);
assert.ok(world.deepTimeYears > 0, "sim ticks should advance deep-time units");

console.log("time accumulator checks passed");
`, context);
