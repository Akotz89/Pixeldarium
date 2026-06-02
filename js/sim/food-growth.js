
function removeFoodInRadius(x, y, radius, limit) {
  var foods = collectFoodInRadius(x, y, radius, limit);

  for (var i = 0; i < foods.length; i++) {
    removeFood(foods[i]);
  }

  return foods.length;
}

function randomFoodPosition() {
  if (chance(CONFIG.INITIAL_FOOD_FERTILE_CHANCE)) {
    return randomFertilePosition();
  }

  return {
    x: randomInt(WORLD_WIDTH),
    y: randomInt(WORLD_HEIGHT)
  };
}

function foodExistsAt(x, y) {
  return Math.max(0, Math.round(Number(ensureFoodPositions()[getFoodPositionKey(x, y)]) || 0)) > 0;
}

function spawnFoodAtPosition(position) {
  if (!position || world.food.length >= CONFIG.MAX_FOOD) {
    return false;
  }

  if (foodExistsAt(position.x, position.y)) {
    return false;
  }

  addFoodAt(position.x, position.y);

  if (typeof recordFoodSpawned === "function") {
    recordFoodSpawned(1);
  }

  return true;
}

function tryGrowFoodAtPosition(position, growthChance) {
  if (world.food.length >= CONFIG.MAX_FOOD || !chance(growthChance)) {
    return false;
  }

  return spawnFoodAtPosition(position);
}

function getFoodRecoveryPressure() {
  var population = Array.isArray(world.organisms) ? world.organisms.length : 0;

  if (
    population < CONFIG.FOOD_RECOVERY_MIN_POPULATION ||
    world.food.length >= CONFIG.MAX_FOOD
  ) {
    return 0;
  }

  var targetFood = Math.max(
    CONFIG.STARTING_FOOD * 0.12,
    population * CONFIG.FOOD_RECOVERY_TARGET_PER_ORGANISM
  );
  var deficit = targetFood - world.food.length;

  if (deficit <= 0) {
    return 0;
  }

  return clamp(deficit / Math.max(1, targetFood), 0, 1);
}

function getFoodRecoveryAttemptCount(pressure) {
  if (pressure <= 0) {
    return 0;
  }

  return clamp(
    Math.ceil(pressure * CONFIG.FOOD_RECOVERY_MAX_EXTRA_ATTEMPTS),
    1,
    CONFIG.FOOD_RECOVERY_MAX_EXTRA_ATTEMPTS
  );
}

function growFood() {
  world.foodRecoveryPressure = 0;
  world.foodRecoveryAttemptsThisTick = 0;

  if (world.food.length >= CONFIG.MAX_FOOD) {
    return;
  }

  tryGrowFoodAtPosition(randomFertilePosition(), CONFIG.FERTILE_FOOD_GROWTH_CHANCE);

  tryGrowFoodAtPosition({
    x: randomInt(WORLD_WIDTH),
    y: randomInt(WORLD_HEIGHT)
  }, CONFIG.BARREN_FOOD_GROWTH_CHANCE);

  var recoveryPressure = getFoodRecoveryPressure();
  var recoveryAttempts = getFoodRecoveryAttemptCount(recoveryPressure);
  var recoveryChance = CONFIG.FERTILE_FOOD_GROWTH_CHANCE * (
    CONFIG.FOOD_RECOVERY_CHANCE_FLOOR +
    (1 - CONFIG.FOOD_RECOVERY_CHANCE_FLOOR) * recoveryPressure
  );

  world.foodRecoveryPressure = recoveryPressure;
  world.foodRecoveryAttemptsThisTick = recoveryAttempts;

  for (var i = 0; i < recoveryAttempts; i++) {
    tryGrowFoodAtPosition(randomFertilePosition(), recoveryChance);
  }
}
