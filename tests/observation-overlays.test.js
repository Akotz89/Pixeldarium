const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const fills = [];
const context = {
  console,
  performance: {
    now() {
      return Date.now();
    }
  },
  WORLD_WIDTH: 28,
  WORLD_HEIGHT: 16,
  CONFIG: {
    TILE_SIZE: 5
  },
  canvas: {
    width: 140,
    height: 80
  },
  ctx: {
    globalCompositeOperation: "source-over",
    globalAlpha: 1,
    fillStyle: "",
    fillRect(x, y, width, height) {
      fills.push({
        x,
        y,
        width,
        height,
        fillStyle: this.fillStyle,
        composite: this.globalCompositeOperation,
        alpha: this.globalAlpha
      });
    }
  },
  world: {
    activeObservationOverlay: "none",
    needsRender: false,
    overlayPerformance: {},
    organisms: [
      { x: 8, y: 8 },
      { x: 9, y: 8 },
      { x: 10, y: 8 }
    ],
    food: [
      { x: 18, y: 8 },
      { x: 19, y: 8 }
    ],
    atmosphere: {
      gases: {
        o2: 0.2,
        co2: 0.04
      },
      temperatureC: 21
    }
  },
  getPlanetTile(x, y) {
    return {
      x,
      y,
      latitude: (y / 16) * 180 - 90,
      longitude: (x / 28) * 360 - 180,
      elevation: x % 4 === 0 ? 0.8 : 0.1,
      moisture: y % 3 === 0 ? 0.75 : 0.25
    };
  },
  PS: {
    render: {
      entities: {
        getTileRenderPosition(x, y) {
          return {
            x: x * 5,
            y: y * 5,
            scale: 1
          };
        }
      }
    }
  }
};

vm.runInNewContext(read("js/render/overlays.js") + "\n" + read("js/render/observation-overlays.js"), context);

const expectedIds = [
  "observation.temperature",
  "observation.population",
  "observation.resources",
  "observation.atmosphere"
];
const manifest = context.PS.render.overlays.getManifest();
const webglShaderSource = read("js/render/webgl-globe-shaders.js");
const webglGlobeSource = read("js/render/webgl-globe.js");

expectedIds.forEach((id) => {
  const entry = manifest.find((overlay) => overlay.id === id);

  assert.ok(entry, `${id} should be registered`);
  assert.ok(entry.blendMode === "screen" || entry.blendMode === "lighter", `${id} should expose blend metadata`);
  assert.strictEqual(entry.shortcut, "O", `${id} should expose keyboard shortcut metadata`);
});

assert.strictEqual(context.PS.render.observationOverlays.setActive("observation.temperature"), "observation.temperature");
assert.strictEqual(context.world.needsRender, true, "activating an overlay should request render");
context.PS.render.overlays.drawRegistered();
assert.ok(fills.length > 0, "active temperature overlay should draw sample cells");
assert.strictEqual(fills[0].composite, "screen", "temperature overlay should use screen blend metadata");
assert.ok(context.world.overlayPerformance.lastFrameMs >= 0, "overlay draw should record frame timing");
assert.ok(context.world.overlayPerformance.lastSampleCount > 0, "overlay draw should record sample count");

fills.length = 0;
context.PS.render.observationOverlays.setActive("observation.population");
context.PS.render.overlays.drawRegistered();
assert.ok(fills.length > 0, "population overlay should draw density cells");
assert.strictEqual(fills[0].composite, "lighter", "population overlay should use additive blend metadata");

fills.length = 0;
context.PS.render.observationOverlays.setActive("observation.resources");
context.PS.render.overlays.drawRegistered();
assert.ok(fills.length > 0, "resource overlay should draw food density cells");

fills.length = 0;
context.PS.render.observationOverlays.setActive("observation.atmosphere");
context.PS.render.overlays.drawRegistered();
assert.ok(fills.length > 0, "atmosphere overlay should draw gas composition cells");

context.PS.render.observationOverlays.setActive("unknown");
assert.strictEqual(context.world.activeObservationOverlay, "none", "unknown overlay should normalize to none");
assert.strictEqual(context.PS.render.observationOverlays.cycle(), "observation.temperature", "cycle should move from none to first overlay");
assert.ok(webglShaderSource.indexOf("uniform sampler2D u_overlay") >= 0, "WebGL shader should accept observation overlay texture");
assert.ok(webglShaderSource.indexOf("u_overlayMode") >= 0, "WebGL shader should expose overlay blend mode");
assert.ok(webglGlobeSource.indexOf("uploadObservationOverlayTexture") >= 0, "WebGL globe should upload active observation overlay texture");
assert.ok(webglGlobeSource.indexOf('compositor = "webgl2"') >= 0, "WebGL globe should record webgl2 compositor evidence");

console.log("observation overlay checks passed");
