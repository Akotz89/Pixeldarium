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

function growFood() {
  if (world.food.length >= CONFIG.MAX_FOOD) {
    return;
  }

  if (chance(CONFIG.FERTILE_FOOD_GROWTH_CHANCE)) {
    const fertilePosition = randomFertilePosition();

    if (!foodExistsAt(fertilePosition.x, fertilePosition.y)) {
      addFoodAt(fertilePosition.x, fertilePosition.y);
    }
  }

  if (chance(CONFIG.BARREN_FOOD_GROWTH_CHANCE)) {
    const x = randomInt(WORLD_WIDTH);
    const y = randomInt(WORLD_HEIGHT);

    if (!foodExistsAt(x, y)) {
      addFoodAt(x, y);
    }
  }
}
