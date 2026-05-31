function makeFood(x, y) {
  return { x: x, y: y };
}

function getFoodPositionKey(x, y) {
  return x + ":" + y;
}

function rebuildFoodPositions() {
  world.foodPositions = {};

  for (var i = 0; i < world.food.length; i++) {
    registerFoodPosition(world.food[i]);
  }

  return world.foodPositions;
}

function ensureFoodPositions() {
  if (!world.foodPositions) {
    return rebuildFoodPositions();
  }

  return world.foodPositions;
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

function addFoodAt(x, y) {
  var food = makeFood(x, y);
  world.food.push(food);
  registerFoodPosition(food);
  return food;
}

function removeFoodAtIndex(index) {
  var food = world.food[index];

  if (!food) {
    return null;
  }

  unregisterFoodPosition(food);
  world.food.splice(index, 1);
  return food;
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
