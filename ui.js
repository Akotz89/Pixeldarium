function updateHud() {
  var fertilePercent = Math.round(
    (world.fertileTiles / (WORLD_WIDTH * WORLD_HEIGHT)) * 100
  );

  eraText.textContent = "ERA: " + world.era;
  populationText.textContent = "POPULATION: " + world.organisms.length;
  foodText.textContent =
    "TICK: " + world.tick +
    "   FOOD: " + world.food.length +
    "   FERTILE: " + fertilePercent + "%" +
    "   FPS: " + world.fps.toFixed(1) +
    "   TPS: " + world.tps.toFixed(1) +
    "   UPDATE: " + world.updateMs.toFixed(2) + "ms" +
    "   DRAW: " + world.drawMs.toFixed(2) + "ms" +
    "   MAX U/D: " + world.maxUpdateMs.toFixed(2) + "/" + world.maxDrawMs.toFixed(2) + "ms";

  speedLabel.textContent = "Speed: " + world.speed + "x";
  syncTuningDisplay();
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function configureRange(input, min, max, step, value) {
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
}

function syncTuningDisplay() {
  speedTune.value = String(world.speed);
  speedTuneValue.textContent = world.speed + "x";
  organismSizeTune.value = String(CONFIG.ORGANISM_DRAW_SIZE);
  organismSizeValue.textContent = CONFIG.ORGANISM_DRAW_SIZE + "px";
  foodSizeTune.value = String(CONFIG.FOOD_DRAW_SIZE);
  foodSizeValue.textContent = CONFIG.FOOD_DRAW_SIZE + "px";
  foodTargetTune.value = String(CONFIG.STARTING_FOOD);
  foodTargetValue.textContent = String(CONFIG.STARTING_FOOD);
}

function setSpeed(value) {
  world.speed = clampNumber(Math.round(Number(value)), CONFIG.SPEED_MIN, CONFIG.SPEED_MAX);
  updateHud();
}

function setOrganismSize(value) {
  CONFIG.ORGANISM_DRAW_SIZE = clampNumber(Math.round(Number(value)), CONFIG.ORGANISM_DRAW_SIZE_MIN, CONFIG.ORGANISM_DRAW_SIZE_MAX);
  drawWorld();
  updateHud();
}

function setFoodSize(value) {
  CONFIG.FOOD_DRAW_SIZE = clampNumber(Math.round(Number(value)), CONFIG.FOOD_DRAW_SIZE_MIN, CONFIG.FOOD_DRAW_SIZE_MAX);
  drawWorld();
  updateHud();
}

function addFoodUntil(targetFoodCount) {
  var attempts = 0;
  var maxAttempts = targetFoodCount * 20;

  while (world.food.length < targetFoodCount && attempts < maxAttempts) {
    var position = randomFoodPosition();

    if (!foodExistsAt(position.x, position.y)) {
      world.food.push(makeFood(position.x, position.y));
    }

    attempts++;
  }
}

function setFoodTarget(value) {
  var targetFoodCount = clampNumber(
    Math.round(Number(value) / CONFIG.FOOD_TARGET_STEP) * CONFIG.FOOD_TARGET_STEP,
    CONFIG.FOOD_TARGET_MIN,
    CONFIG.FOOD_TARGET_MAX
  );

  CONFIG.STARTING_FOOD = targetFoodCount;
  CONFIG.MAX_FOOD = targetFoodCount;

  while (world.food.length > CONFIG.STARTING_FOOD) {
    world.food.pop();
  }

  addFoodUntil(CONFIG.STARTING_FOOD);
  drawWorld();
  updateHud();
}

function setupTuningControls() {
  configureRange(speedTune, CONFIG.SPEED_MIN, CONFIG.SPEED_MAX, 1, world.speed);
  configureRange(organismSizeTune, CONFIG.ORGANISM_DRAW_SIZE_MIN, CONFIG.ORGANISM_DRAW_SIZE_MAX, 1, CONFIG.ORGANISM_DRAW_SIZE);
  configureRange(foodSizeTune, CONFIG.FOOD_DRAW_SIZE_MIN, CONFIG.FOOD_DRAW_SIZE_MAX, 1, CONFIG.FOOD_DRAW_SIZE);
  configureRange(foodTargetTune, CONFIG.FOOD_TARGET_MIN, CONFIG.FOOD_TARGET_MAX, CONFIG.FOOD_TARGET_STEP, CONFIG.STARTING_FOOD);
  syncTuningDisplay();
}

window.setupControls = function() {
  setupTuningControls();

  pauseButton.addEventListener("click", function() {
    world.isPaused = !world.isPaused;
    pauseButton.textContent = world.isPaused ? "Resume" : "Pause";
  });

  stepButton.addEventListener("click", function() {
    if (world.isPaused) {
      var updateStart = performance.now();
      updateWorld();
      world.updateMs = performance.now() - updateStart;
      world.maxUpdateMs = Math.max(world.maxUpdateMs, world.updateMs);
      world.interpolation = 1;

      var drawStart = performance.now();
      drawWorld();
      world.drawMs = performance.now() - drawStart;
      world.maxDrawMs = Math.max(world.maxDrawMs, world.drawMs);

      updateHud();
    }
  });

  speedDownButton.addEventListener("click", function() {
    setSpeed(world.speed - 1);
  });

  speedUpButton.addEventListener("click", function() {
    setSpeed(world.speed + 1);
  });

  restartButton.addEventListener("click", function() {
    seedWorld();
    drawWorld();
    updateHud();
  });

  tuningToggle.addEventListener("click", function() {
    var isExpanded = tuningToggle.getAttribute("aria-expanded") === "true";
    tuningToggle.setAttribute("aria-expanded", String(!isExpanded));
    tuningControls.hidden = isExpanded;
  });

  speedTune.addEventListener("input", function() {
    setSpeed(speedTune.value);
  });

  organismSizeTune.addEventListener("input", function() {
    setOrganismSize(organismSizeTune.value);
  });

  foodSizeTune.addEventListener("input", function() {
    setFoodSize(foodSizeTune.value);
  });

  foodTargetTune.addEventListener("input", function() {
    setFoodTarget(foodTargetTune.value);
  });
};
