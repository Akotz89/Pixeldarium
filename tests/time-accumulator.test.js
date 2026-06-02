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
    speed: 1,
    isPaused: false
  }
};

const source = [
  "js/core/namespace.js",
  "config.js",
  "js/core/config.js",
  "js/systems/time.js"
].map(read).join("\n");

vm.runInNewContext(`${source}

assert.strictEqual(PS.time.dt, 1000 / 30, "fixed timestep should default to 1000/30ms");
assert.strictEqual(PS.time.maxTicksPerFrame, 4, "max ticks per frame should default to 4");

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

console.log("time accumulator checks passed");
`, context);
