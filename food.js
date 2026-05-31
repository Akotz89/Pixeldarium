function makeFood(x, y) {
  return { x: x, y: y };
}

function getFoodPositionKey(x, y) {
  return x + ":" + y;
}

function getFoodBucketSize() {
  return Math.max(1, Math.round(Number(CONFIG.FOOD_SPATIAL_BUCKET_SIZE) || 16));
}

function getFoodBucketKey(x, y) {
  var bucketSize = getFoodBucketSize();
  return Math.floor(x / bucketSize) + ":" + Math.floor(y / bucketSize);
}

function rebuildFoodPositions() {
  world.foodPositions = {};
  world.foodBuckets = {};

  for (var i = 0; i < world.food.length; i++) {
    registerFood(world.food[i]);
  }

  return world.foodPositions;
}

function ensureFoodPositions() {
  if (!world.foodPositions) {
    return rebuildFoodPositions();
  }

  return world.foodPositions;
}

function ensureFoodBuckets() {
  if (!world.foodBuckets) {
    rebuildFoodPositions();
  }

  return world.foodBuckets;
}

function registerFoodPosition(food) {
  var positions = ensureFoodPositions();
  var key = getFoodPositionKey(food.x, food.y);
  positions[key] = (positions[key] || 0) + 1;
}

function unregisterFoodPosition(food) {
  var positions = ensureFoodPositions();
  var key = getFoodPositionKey(food.x, food.y);
  var count = Math.max(0, Math.round(Number(positions[key]) || 0));

  if (count <= 1) {
    delete positions[key];
  } else {
    positions[key] = count - 1;
  }
}

function registerFoodBucket(food) {
  var buckets = ensureFoodBuckets();
  var key = getFoodBucketKey(food.x, food.y);

  if (!buckets[key]) {
    buckets[key] = [];
  }

  buckets[key].push(food);
}

function unregisterFoodBucket(food) {
  var buckets = ensureFoodBuckets();
  var key = getFoodBucketKey(food.x, food.y);
  var bucket = buckets[key];

  if (!bucket) {
    return;
  }

  for (var i = bucket.length - 1; i >= 0; i--) {
    if (bucket[i] === food) {
      bucket.splice(i, 1);
      break;
    }
  }

  if (bucket.length === 0) {
    delete buckets[key];
  }
}

function registerFood(food) {
  registerFoodPosition(food);
  registerFoodBucket(food);
}

function unregisterFood(food) {
  unregisterFoodPosition(food);
  unregisterFoodBucket(food);
}

function addFoodAt(x, y) {
  var food = makeFood(x, y);
  world.food.push(food);
  registerFood(food);
  return food;
}

function removeFoodAtIndex(index) {
  var food = world.food[index];

  if (!food) {
    return null;
  }

  unregisterFood(food);
  world.food.splice(index, 1);
  return food;
}

function removeFood(food) {
  if (!food) {
    return null;
  }

  unregisterFood(food);

  var index = world.food.indexOf(food);

  if (index >= 0) {
    world.food.splice(index, 1);
  }

  return food;
}

function findFoodAt(x, y) {
  var bucket = ensureFoodBuckets()[getFoodBucketKey(x, y)];

  if (!bucket) {
    return null;
  }

  for (var i = 0; i < bucket.length; i++) {
    if (bucket[i].x === x && bucket[i].y === y) {
      return bucket[i];
    }
  }

  return null;
}

function removeFoodAtPosition(x, y) {
  return removeFood(findFoodAt(x, y));
}

function findNearestFoodInBuckets(x, y, searchRadius) {
  var buckets = ensureFoodBuckets();
  var bucketSize = getFoodBucketSize();
  var minBucketX = Math.floor(Math.max(0, x - searchRadius) / bucketSize);
  var maxBucketX = Math.floor(Math.min(WORLD_WIDTH - 1, x + searchRadius) / bucketSize);
  var minBucketY = Math.floor(Math.max(0, y - searchRadius) / bucketSize);
  var maxBucketY = Math.floor(Math.min(WORLD_HEIGHT - 1, y + searchRadius) / bucketSize);
  var nearest = null;
  var nearestDistance = Infinity;

  for (var bucketY = minBucketY; bucketY <= maxBucketY; bucketY++) {
    for (var bucketX = minBucketX; bucketX <= maxBucketX; bucketX++) {
      var bucket = buckets[bucketX + ":" + bucketY];

      if (!bucket) {
        continue;
      }

      for (var i = 0; i < bucket.length; i++) {
        var food = bucket[i];
        var dx = food.x - x;
        var dy = food.y - y;
        var distance = Math.abs(dx) + Math.abs(dy);

        if (distance < nearestDistance && distance <= searchRadius) {
          nearest = food;
          nearestDistance = distance;
        }
      }
    }
  }

  return nearest;
}

function collectFoodInRadius(x, y, radius, limit) {
  var buckets = ensureFoodBuckets();
  var bucketSize = getFoodBucketSize();
  var normalizedRadius = Math.max(0, Math.round(Number(radius) || 0));
  var normalizedLimit = Number.isFinite(Number(limit)) ? Math.max(0, Math.round(Number(limit))) : Infinity;
  var minBucketX = Math.floor(Math.max(0, x - normalizedRadius) / bucketSize);
  var maxBucketX = Math.floor(Math.min(WORLD_WIDTH - 1, x + normalizedRadius) / bucketSize);
  var minBucketY = Math.floor(Math.max(0, y - normalizedRadius) / bucketSize);
  var maxBucketY = Math.floor(Math.min(WORLD_HEIGHT - 1, y + normalizedRadius) / bucketSize);
  var foods = [];

  if (normalizedLimit <= 0) {
    return foods;
  }

  for (var bucketY = minBucketY; bucketY <= maxBucketY; bucketY++) {
    for (var bucketX = minBucketX; bucketX <= maxBucketX; bucketX++) {
      var bucket = buckets[bucketX + ":" + bucketY];

      if (!bucket) {
        continue;
      }

      for (var i = 0; i < bucket.length; i++) {
        var food = bucket[i];
        var distance = Math.abs(food.x - x) + Math.abs(food.y - y);

        if (distance <= normalizedRadius) {
          foods.push(food);

          if (foods.length >= normalizedLimit) {
            return foods;
          }
        }
      }
    }
  }

  return foods;
}

function countFoodInRadius(x, y, radius) {
  var buckets = ensureFoodBuckets();
  var bucketSize = getFoodBucketSize();
  var normalizedRadius = Math.max(0, Math.round(Number(radius) || 0));
  var minBucketX = Math.floor(Math.max(0, x - normalizedRadius) / bucketSize);
  var maxBucketX = Math.floor(Math.min(WORLD_WIDTH - 1, x + normalizedRadius) / bucketSize);
  var minBucketY = Math.floor(Math.max(0, y - normalizedRadius) / bucketSize);
  var maxBucketY = Math.floor(Math.min(WORLD_HEIGHT - 1, y + normalizedRadius) / bucketSize);
  var count = 0;

  for (var bucketY = minBucketY; bucketY <= maxBucketY; bucketY++) {
    for (var bucketX = minBucketX; bucketX <= maxBucketX; bucketX++) {
      var bucket = buckets[bucketX + ":" + bucketY];

      if (!bucket) {
        continue;
      }

      for (var i = 0; i < bucket.length; i++) {
        var food = bucket[i];

        if (Math.abs(food.x - x) + Math.abs(food.y - y) <= normalizedRadius) {
          count++;
        }
      }
    }
  }

  return count;
}

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
