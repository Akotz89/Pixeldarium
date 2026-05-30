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

  for (var foodIndex = 0; foodIndex < CONFIG.STARTING_FOOD; foodIndex++) {
    var position = randomFoodPosition();
    world.food.push(makeFood(position.x, position.y));
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
}

var frameCounter = 0;
var lastFrameTime = performance.now();
var statsTimer = performance.now();
var framesSinceStatsUpdate = 0;
var simTicksSinceStatsUpdate = 0;

function gameLoop() {
  try {
    var now = performance.now();
    lastFrameTime = now;
    framesSinceStatsUpdate++;
    frameCounter++;

    if (!world.isPaused && frameCounter >= CONFIG.TICKS_PER_SIM_UPDATE) {
      frameCounter = 0;

      var updatesThisFrame = world.speed * CONFIG.SIM_SPEED_MULTIPLIER;

      for (var i = 0; i < updatesThisFrame; i++) {
        updateWorld();
      }

      simTicksSinceStatsUpdate += updatesThisFrame;
    }

    if (world.isPaused) {
      world.interpolation = 0;
    } else {
      world.interpolation = Math.min(frameCounter / CONFIG.TICKS_PER_SIM_UPDATE, 1);
    }

    var statsElapsed = now - statsTimer;

    if (statsElapsed >= 500) {
      world.fps = framesSinceStatsUpdate / (statsElapsed / 1000);
      world.tps = simTicksSinceStatsUpdate / (statsElapsed / 1000);
      framesSinceStatsUpdate = 0;
      simTicksSinceStatsUpdate = 0;
      statsTimer = now;
    }

    drawWorld();
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