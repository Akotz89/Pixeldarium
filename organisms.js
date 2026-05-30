function makeOrganism(x, y) {
  return {
    x: x,
    y: y,
    energy: CONFIG.STARTING_ORGANISM_ENERGY,
    age: 0,
    directionX: randomInt(3) - 1,
    directionY: randomInt(3) - 1
  };
}

function findNearestFood(organism, searchRadius) {
  let nearest = null;
  let nearestDistance = Infinity;

  for (let i = 0; i < world.food.length; i++) {
    const food = world.food[i];
    const dx = food.x - organism.x;
    const dy = food.y - organism.y;
    const distance = Math.abs(dx) + Math.abs(dy);

    if (distance < nearestDistance && distance <= searchRadius) {
      nearest = food;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function moveTowardFood(organism, food) {
  if (food.x > organism.x) {
    organism.directionX = 1;
  } else if (food.x < organism.x) {
    organism.directionX = -1;
  } else {
    organism.directionX = 0;
  }

  if (food.y > organism.y) {
    organism.directionY = 1;
  } else if (food.y < organism.y) {
    organism.directionY = -1;
  } else {
    organism.directionY = 0;
  }
}

function eatFoodOnCurrentTile(organism) {
  for (let i = world.food.length - 1; i >= 0; i--) {
    const food = world.food[i];

    if (food.x === organism.x && food.y === organism.y) {
      world.food.splice(i, 1);
      organism.energy += CONFIG.FOOD_ENERGY_VALUE;
      return true;
    }
  }

  return false;
}

function reproduceIfReady(organism) {
  if (organism.energy < CONFIG.REPRODUCTION_ENERGY) {
    return;
  }

  organism.energy = CONFIG.PARENT_ENERGY_AFTER_REPRODUCTION;

  const child = makeOrganism(
    organism.x + randomInt(3) - 1,
    organism.y + randomInt(3) - 1
  );

  child.energy = CONFIG.CHILD_ORGANISM_ENERGY;
  clampToWorld(child);
  world.organisms.push(child);
}

function updateOrganism(organism) {
  organism.age++;

  if (world.tick % 3 === 0) {
    organism.energy--;
  }

  const nearestFood = findNearestFood(organism, CONFIG.ORGANISM_FOOD_SEARCH_RADIUS);

  if (nearestFood) {
    moveTowardFood(organism, nearestFood);
  } else if (chance(CONFIG.RANDOM_DIRECTION_CHANGE_CHANCE)) {
    organism.directionX = randomInt(3) - 1;
    organism.directionY = randomInt(3) - 1;
  }

  organism.x += organism.directionX;
  organism.y += organism.directionY;
  clampToWorld(organism);

  eatFoodOnCurrentTile(organism);
  reproduceIfReady(organism);
}

function removeDeadOrganisms() {
  world.organisms = world.organisms.filter(function (organism) {
    return organism.energy > 0 && organism.age < CONFIG.ORGANISM_MAX_AGE;
  });
}

function trimOrganismPopulation() {
  if (world.organisms.length > CONFIG.MAX_ORGANISMS) {
    world.organisms.length = CONFIG.MAX_ORGANISMS;
  }
}
