function makeFood(x, y) {
  return { x: x, y: y };
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
  for (let i = 0; i < world.food.length; i++) {
    const food = world.food[i];

    if (food.x === x && food.y === y) {
      return true;
    }
  }

  return false;
}

function growFood() {
  if (world.food.length >= CONFIG.MAX_FOOD) {
    return;
  }

  if (chance(CONFIG.FERTILE_FOOD_GROWTH_CHANCE)) {
    const fertilePosition = randomFertilePosition();

    if (!foodExistsAt(fertilePosition.x, fertilePosition.y)) {
      world.food.push(makeFood(fertilePosition.x, fertilePosition.y));
    }
  }

  if (chance(CONFIG.BARREN_FOOD_GROWTH_CHANCE)) {
    const x = randomInt(WORLD_WIDTH);
    const y = randomInt(WORLD_HEIGHT);

    if (!foodExistsAt(x, y)) {
      world.food.push(makeFood(x, y));
    }
  }
}
