const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

const source = [
  "js/legacy/persistence/part-02.js",
  "js/legacy/persistence/part-03.js",
  "js/legacy/persistence/part-05.js",
  "js/legacy/ui/part-05.js",
  "js/ui/touch.js"
].map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");

const context = {
  assert,
  console,
  CONFIG: {
    PLANET_ZOOM_LEVEL: 2,
    PLANET_VIEW_LATITUDE_DEG: 0,
    PLANET_VIEW_LONGITUDE_DEG: 0,
    PLANET_CAMERA_INTERACTION_SETTLE_MS: 80,
    TILE_SIZE: 10,
    PLANET_ZOOM_LEVELS: [{}, {}, {}, {}, {}, {}]
  },
  WORLD_WIDTH: 160,
  WORLD_HEIGHT: 85,
  world: {
    planetView: {
      zoomLevel: 3.25,
      latitude: 12.5,
      longitude: -45.25,
      panEastMeters: 120,
      panNorthMeters: -80
    },
    isMenuOpen: false,
    organisms: [],
    food: [],
    settlements: []
  },
  toggledPause: false,
  lastKeyboardPan: null,
  lastScreenPan: null,
  lastZoomAnchor: null,
  canvas: {
    width: 160,
    height: 85,
    style: {},
    classList: { add() {}, remove() {} },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 1600, height: 850 };
    }
  },
  window: {
    PS: {},
    setTimeout(callback) {
      return callback();
    },
    clearTimeout() {},
    requestAnimationFrame(callback) {
      return callback();
    },
    cancelAnimationFrame() {}
  },
  performance: {
    now() {
      return 100;
    }
  },
  clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  },
  normalizeLongitude(value) {
    return ((Number(value) || 0) + 540) % 360 - 180;
  },
  getPlanetZoomLevels() {
    return CONFIG.PLANET_ZOOM_LEVELS;
  },
  getPlanetView() {
    return world.planetView;
  },
  getNearestSettlementToTile() {
    return { id: 7, lineageId: 2, x: 10, y: 12, isOutpost: true, isColony: false };
  },
  getNearestOrganismToTile() {
    return { x: 10, y: 12, lineageId: 3, generation: 4, energy: 88 };
  },
  ensureOrganismLineage(organism) {
    return organism.lineageId;
  },
  foodExistsAt() {
    return true;
  },
  setElementText() {},
  invalidateTerrainCache() {},
  updateHud() {},
  redrawPlanetView() {},
  toggleSimulationPaused() {
    toggledPause = true;
  },
  stepSimulationOnce() {},
  setMenuOpen() {
    return false;
  },
  shouldIgnoreSimulationShortcut() {
    return false;
  },
  adjustPlanetZoom(delta) {
    world.planetView.zoomLevel += delta;
    return true;
  },
  adjustPlanetZoomAtCanvasPoint(delta, canvasX, canvasY) {
    world.planetView.zoomLevel += delta;
    lastZoomAnchor = { canvasX, canvasY };
    return true;
  },
  panPlanetViewBySamples(eastSamples, northSamples) {
    lastKeyboardPan = { eastSamples, northSamples };
  },
  panPlanetViewByScreenDelta(deltaX, deltaY) {
    lastScreenPan = { deltaX, deltaY };
  }
};

context.getPlanetZoomLevels = function () {
  return context.CONFIG.PLANET_ZOOM_LEVELS;
};
context.getPlanetView = function () {
  return context.world.planetView;
};
context.toggleSimulationPaused = function () {
  context.toggledPause = true;
};
context.adjustPlanetZoom = function (delta) {
  context.world.planetView.zoomLevel += delta;
  return true;
};
context.adjustPlanetZoomAtCanvasPoint = function (delta, canvasX, canvasY) {
  context.world.planetView.zoomLevel += delta;
  context.lastZoomAnchor = { canvasX, canvasY };
  return true;
};
context.panPlanetViewBySamples = function (eastSamples, northSamples) {
  context.lastKeyboardPan = { eastSamples, northSamples };
};
context.panPlanetViewByScreenDelta = function (deltaX, deltaY) {
  context.lastScreenPan = { deltaX, deltaY };
};

vm.runInNewContext(`${source}

prepareTouchInput();
assert.strictEqual(canvas.style.touchAction, "none", "touch input should disable browser touch gestures on the canvas");

var selected = getInspectableEntityFromTile(10, 12);
assert.strictEqual(selected.type, "outpost", "click inspection should prioritize a settlement-like entity on the selected tile");
assert.strictEqual(selected.id, 7, "click inspection should preserve selected entity id");

var savedCamera = copyCameraForSave();
world.planetView = { zoomLevel: 0, latitude: 0, longitude: 0, panEastMeters: 0, panNorthMeters: 0 };
restoreCameraState(savedCamera);
assert.strictEqual(world.planetView.zoomLevel, 3.25, "camera save should preserve zoom");
assert.strictEqual(world.planetView.latitude, 12.5, "camera save should preserve latitude");
assert.strictEqual(world.planetView.longitude, -45.25, "camera save should preserve longitude");
assert.strictEqual(world.planetView.panEastMeters, 120, "camera save should preserve east pan");
assert.strictEqual(world.planetView.panNorthMeters, -80, "camera save should preserve north pan");

var zoomBefore = world.planetView.zoomLevel;
handleSimulationShortcut({
  key: "+",
  code: "Equal",
  target: null,
  preventDefault: function() { this.prevented = true; }
});
assert.ok(world.planetView.zoomLevel > zoomBefore, "plus shortcut should zoom the camera");

var pinchZoomBefore = world.planetView.zoomLevel;
beginPlanetDrag({
  pointerType: "touch",
  pointerId: 1,
  clientX: 400,
  clientY: 300,
  preventDefault: function() {}
});
beginPlanetDrag({
  pointerType: "touch",
  pointerId: 2,
  clientX: 600,
  clientY: 300,
  preventDefault: function() { this.prevented = true; }
});
updatePlanetDrag({
  pointerType: "touch",
  pointerId: 2,
  clientX: 700,
  clientY: 300,
  preventDefault: function() { this.prevented = true; }
});
assert.ok(world.planetView.zoomLevel > pinchZoomBefore, "two-finger pinch-out should zoom the camera");
assert.strictEqual(lastZoomAnchor.canvasX, 55, "pinch zoom should anchor at the touch midpoint X");
assert.strictEqual(lastZoomAnchor.canvasY, 30, "pinch zoom should anchor at the touch midpoint Y");
assert.strictEqual(planetDragState.skipNextClick, true, "pinch zoom should suppress the synthetic follow-up click");
var lastRotatePanBefore = lastScreenPan;
updatePlanetDrag({
  pointerType: "touch",
  pointerId: 2,
  clientX: 550,
  clientY: 450,
  preventDefault: function() { this.prevented = true; }
});
assert.notStrictEqual(lastScreenPan, lastRotatePanBefore, "two-finger rotate should pan the globe camera");
assert.ok(Math.abs(lastScreenPan.deltaX) > 0, "two-finger rotate should map angle changes to horizontal globe rotation");
endPlanetDrag({ pointerType: "touch", pointerId: 1 });
endPlanetDrag({ pointerType: "touch", pointerId: 2 });

handleSimulationShortcut({
  key: "ArrowRight",
  code: "ArrowRight",
  target: null,
  preventDefault: function() {}
});
assert.strictEqual(lastKeyboardPan.eastSamples, 24, "arrow key should pan the camera east");
assert.strictEqual(lastKeyboardPan.northSamples, 0, "arrow key should preserve north pan for right arrow");

handleSimulationShortcut({
  key: " ",
  code: "Space",
  target: null,
  preventDefault: function() {}
});
assert.strictEqual(toggledPause, true, "space shortcut should toggle pause");
`, context);

console.log("globe interaction checks passed");
