function reportRuntimeError(error) {
  var box = document.getElementById("debug-output");
  var message = error && error.stack ? error.stack : String(error);

  if (!box) {
    alert(message);
    return;
  }

  box.style.display = "block";
  box.textContent += message + String.fromCharCode(10) + String.fromCharCode(10);
}

function clearWorld() {
  world.tick = 0;
  world.organisms = [];
  world.food = [];
  world.terrain = [];
  world.fertileTiles = 0;
  world.interpolation = 0;
  world.fps = 0;
  world.tps = 0;
  world.updateMs = 0;
  world.drawMs = 0;
  world.maxUpdateMs = 0;
  world.maxDrawMs = 0;
  world.inspectedTile = null;
  world.nextLineageId = 1;
  world.lineages = {};

  if (typeof resetTraitHistory === "function") {
    resetTraitHistory();
  }
}

function seedWorld() {
  clearWorld();
  seedTerrain();

  if (typeof buildTerrainCache === "function") {
    buildTerrainCache();
  }

  var centerX = Math.floor(WORLD_WIDTH / 2);
  var centerY = Math.floor(WORLD_HEIGHT / 2);

  for (var i = 0; i < CONFIG.STARTING_ORGANISMS; i++) {
    world.organisms.push(makeOrganism(
      centerX + randomInt(41) - 20,
      centerY + randomInt(41) - 20
    ));
  }

  if (typeof refreshLineageRegistry === "function") {
    refreshLineageRegistry();
  }

  for (var foodIndex = 0; foodIndex < CONFIG.STARTING_FOOD; foodIndex++) {
    var position = randomFoodPosition();
    world.food.push(makeFood(position.x, position.y));
  }

  if (typeof recordTraitHistorySample === "function") {
    recordTraitHistorySample(true);
  }
}

function updateWorld() {
  world.tick++;
  growFood();

  var organismsAtStartOfTick = world.organisms.slice();

  for (var i = 0; i < organismsAtStartOfTick.length; i++) {
    updateOrganism(organismsAtStartOfTick[i]);
  }

  removeDeadOrganisms();
  trimOrganismPopulation();

  if (typeof refreshLineageRegistry === "function") {
    refreshLineageRegistry();
  }

  if (typeof recordTraitHistorySample === "function") {
    recordTraitHistorySample(false);
  }
}

var frameCounter = 0;
var lastFrameTime = performance.now();
var statsTimer = performance.now();
var framesSinceStatsUpdate = 0;
var simTicksSinceStatsUpdate = 0;
var updateMsSinceStatsUpdate = 0;
var drawMsSinceStatsUpdate = 0;
var measuredUpdateFrames = 0;
var measuredDrawFrames = 0;
var maxUpdateMsSinceStatsUpdate = 0;
var maxDrawMsSinceStatsUpdate = 0;

function gameLoop() {
  try {
    var now = performance.now();
    lastFrameTime = now;
    framesSinceStatsUpdate++;
    frameCounter++;

    if (!world.isPaused && frameCounter >= CONFIG.TICKS_PER_SIM_UPDATE) {
      frameCounter = 0;

      var updatesThisFrame = world.speed * CONFIG.SIM_SPEED_MULTIPLIER;
      var updateStart = performance.now();

      for (var i = 0; i < updatesThisFrame; i++) {
        updateWorld();
      }

      var updateElapsed = performance.now() - updateStart;
      updateMsSinceStatsUpdate += updateElapsed;
      measuredUpdateFrames++;

      if (updateElapsed > maxUpdateMsSinceStatsUpdate) {
        maxUpdateMsSinceStatsUpdate = updateElapsed;
      }

      simTicksSinceStatsUpdate += updatesThisFrame;
    }

    if (world.isPaused) {
      world.interpolation = 0;
    } else {
      world.interpolation = Math.min(frameCounter / CONFIG.TICKS_PER_SIM_UPDATE, 1);
    }

    var drawStart = performance.now();
    drawWorld();
    var drawElapsed = performance.now() - drawStart;
    drawMsSinceStatsUpdate += drawElapsed;
    measuredDrawFrames++;

    if (drawElapsed > maxDrawMsSinceStatsUpdate) {
      maxDrawMsSinceStatsUpdate = drawElapsed;
    }

    var statsElapsed = now - statsTimer;

    if (statsElapsed >= 500) {
      world.fps = framesSinceStatsUpdate / (statsElapsed / 1000);
      world.tps = simTicksSinceStatsUpdate / (statsElapsed / 1000);
      world.updateMs = measuredUpdateFrames > 0 ? updateMsSinceStatsUpdate / measuredUpdateFrames : 0;
      world.drawMs = measuredDrawFrames > 0 ? drawMsSinceStatsUpdate / measuredDrawFrames : 0;
      world.maxUpdateMs = maxUpdateMsSinceStatsUpdate;
      world.maxDrawMs = maxDrawMsSinceStatsUpdate;

      framesSinceStatsUpdate = 0;
      simTicksSinceStatsUpdate = 0;
      updateMsSinceStatsUpdate = 0;
      drawMsSinceStatsUpdate = 0;
      measuredUpdateFrames = 0;
      measuredDrawFrames = 0;
      maxUpdateMsSinceStatsUpdate = 0;
      maxDrawMsSinceStatsUpdate = 0;
      statsTimer = now;
    }

    updateHud();

    requestAnimationFrame(gameLoop);
  } catch (error) {
    reportRuntimeError(error);
  }
}

function startGame() {
  try {
    setupControls();
    seedWorld();
    drawWorld();
    updateHud();
    requestAnimationFrame(gameLoop);
  } catch (error) {
    reportRuntimeError(error);
  }
}

startGame();
