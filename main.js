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
}

function seedWorld() {
  clearWorld();
  seedTerrain();

  var centerX = Math.floor(WORLD_WIDTH / 2);
  var centerY = Math.floor(WORLD_HEIGHT / 2);

  for (var i = 0; i < CONFIG.STARTING_ORGANISMS; i++) {
    world.organisms.push(makeOrganism(
      centerX + randomInt(41) - 20,
      centerY + randomInt(41) - 20
    ));
  }

  for (var i = 0; i < CONFIG.STARTING_FOOD; i++) {
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
var lastTime = performance.now();
var fps = 0;
var simTicksPerSecond = 0;
var tickCounter = 0;

function gameLoop() {
  try {
    var now = performance.now();
    var delta = now - lastTime;
    lastTime = now;

    fps = 1000 / delta;

    frameCounter++;
    tickCounter += world.speed * CONFIG.SIM_SPEED_MULTIPLIER;

    if (!world.isPaused && frameCounter >= CONFIG.TICKS_PER_SIM_UPDATE) {
      frameCounter = 0;

      for (var i = 0; i < world.speed * CONFIG.SIM_SPEED_MULTIPLIER; i++) {
        updateWorld();
      }

      simTicksPerSecond = tickCounter / (delta / 1000);
      tickCounter = 0;
    }

    world.interpolation = Math.min(frameCounter / CONFIG.TICKS_PER_SIM_UPDATE, 1);

    drawWorld();
    updateHud();
    document.getElementById('food').textContent += '  FPS: ' + fps.toFixed(1) + '  TPS: ' + simTicksPerSecond.toFixed(1);

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