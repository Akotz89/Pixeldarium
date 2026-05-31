function varyTraitValue(defaultValue, minValue, maxValue, stepValue) {
  return clamp(defaultValue + (randomInt(3) - 1) * stepValue, minValue, maxValue);
}

function inheritTraitValue(parentValue, minValue, maxValue, stepValue) {
  var nextValue = parentValue;

  if (chance(CONFIG.TRAIT_MUTATION_CHANCE)) {
    nextValue += (randomInt(3) - 1) * stepValue;
  }

  return clamp(nextValue, minValue, maxValue);
}

function makeInitialOrganismTraits() {
  return {
    vision: varyTraitValue(
      CONFIG.TRAIT_VISION_DEFAULT,
      CONFIG.TRAIT_VISION_MIN,
      CONFIG.TRAIT_VISION_MAX,
      CONFIG.TRAIT_VISION_MUTATION_STEP
    ),
    metabolism: varyTraitValue(
      CONFIG.TRAIT_METABOLISM_DEFAULT,
      CONFIG.TRAIT_METABOLISM_MIN,
      CONFIG.TRAIT_METABOLISM_MAX,
      CONFIG.TRAIT_METABOLISM_MUTATION_STEP
    ),
    reproductionEnergy: varyTraitValue(
      CONFIG.TRAIT_REPRODUCTION_ENERGY_DEFAULT,
      CONFIG.TRAIT_REPRODUCTION_ENERGY_MIN,
      CONFIG.TRAIT_REPRODUCTION_ENERGY_MAX,
      CONFIG.TRAIT_REPRODUCTION_ENERGY_MUTATION_STEP
    ),
    movementTendency: varyTraitValue(
      CONFIG.TRAIT_MOVEMENT_TENDENCY_DEFAULT,
      CONFIG.TRAIT_MOVEMENT_TENDENCY_MIN,
      CONFIG.TRAIT_MOVEMENT_TENDENCY_MAX,
      CONFIG.TRAIT_MOVEMENT_TENDENCY_MUTATION_STEP
    )
  };
}

function inheritOrganismTraits(parentTraits) {
  return {
    vision: inheritTraitValue(
      parentTraits.vision,
      CONFIG.TRAIT_VISION_MIN,
      CONFIG.TRAIT_VISION_MAX,
      CONFIG.TRAIT_VISION_MUTATION_STEP
    ),
    metabolism: inheritTraitValue(
      parentTraits.metabolism,
      CONFIG.TRAIT_METABOLISM_MIN,
      CONFIG.TRAIT_METABOLISM_MAX,
      CONFIG.TRAIT_METABOLISM_MUTATION_STEP
    ),
    reproductionEnergy: inheritTraitValue(
      parentTraits.reproductionEnergy,
      CONFIG.TRAIT_REPRODUCTION_ENERGY_MIN,
      CONFIG.TRAIT_REPRODUCTION_ENERGY_MAX,
      CONFIG.TRAIT_REPRODUCTION_ENERGY_MUTATION_STEP
    ),
    movementTendency: inheritTraitValue(
      parentTraits.movementTendency,
      CONFIG.TRAIT_MOVEMENT_TENDENCY_MIN,
      CONFIG.TRAIT_MOVEMENT_TENDENCY_MAX,
      CONFIG.TRAIT_MOVEMENT_TENDENCY_MUTATION_STEP
    )
  };
}

function allocateLineageId() {
  var lineageId = world.nextLineageId;
  world.nextLineageId++;
  return lineageId;
}

function ensureOrganismLineage(organism) {
  if (typeof organism.lineageId !== "number" || organism.lineageId < 1) {
    organism.lineageId = allocateLineageId();
  }

  if (typeof organism.lineageParentId !== "number") {
    organism.lineageParentId = 0;
  }

  if (typeof organism.generation !== "number") {
    organism.generation = 0;
  }

  if (organism.lineageId >= world.nextLineageId) {
    world.nextLineageId = organism.lineageId + 1;
  }

  return organism.lineageId;
}

function getTraitDivergenceScore(parentTraits, childTraits) {
  return (
    Math.abs(childTraits.vision - parentTraits.vision) / CONFIG.TRAIT_VISION_MUTATION_STEP +
    Math.abs(childTraits.metabolism - parentTraits.metabolism) / CONFIG.TRAIT_METABOLISM_MUTATION_STEP +
    Math.abs(childTraits.reproductionEnergy - parentTraits.reproductionEnergy) / CONFIG.TRAIT_REPRODUCTION_ENERGY_MUTATION_STEP +
    Math.abs(childTraits.movementTendency - parentTraits.movementTendency) / CONFIG.TRAIT_MOVEMENT_TENDENCY_MUTATION_STEP
  );
}

function assignChildLineage(child, parent, parentTraits) {
  var childTraits = ensureOrganismTraits(child);
  var divergenceScore = getTraitDivergenceScore(parentTraits, childTraits);
  var parentLineageId = ensureOrganismLineage(parent);

  child.generation = parent.generation + 1;

  if (divergenceScore >= CONFIG.LINEAGE_DIVERGENCE_SCORE_FOR_NEW_LINEAGE) {
    child.lineageId = allocateLineageId();
    child.lineageParentId = parentLineageId;
  } else {
    child.lineageId = parentLineageId;
    child.lineageParentId = parent.lineageParentId;
  }
}

function ensureOrganismTraits(organism) {
  if (!organism.traits) {
    organism.traits = makeInitialOrganismTraits();
  }

  return organism.traits;
}

function makeOrganism(x, y, lineageId) {
  return {
    x: x,
    y: y,
    prevX: x,
    prevY: y,
    energy: CONFIG.STARTING_ORGANISM_ENERGY,
    age: 0,
    directionX: randomInt(3) - 1,
    directionY: randomInt(3) - 1,
    traits: makeInitialOrganismTraits(),
    lineageId: lineageId || allocateLineageId(),
    lineageParentId: 0,
    generation: 0
  };
}

function findNearestFood(organism, searchRadius) {
  var nearest = null;
  var nearestDistance = Infinity;

  for (var i = 0; i < world.food.length; i++) {
    var food = world.food[i];
    var dx = food.x - organism.x;
    var dy = food.y - organism.y;
    var distance = Math.abs(dx) + Math.abs(dy);

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
  for (var i = world.food.length - 1; i >= 0; i--) {
    var food = world.food[i];

    if (food.x === organism.x && food.y === organism.y) {
      world.food.splice(i, 1);
      organism.energy += CONFIG.FOOD_ENERGY_VALUE;
      return true;
    }
  }

  return false;
}

function reproduceIfReady(organism) {
  var traits = ensureOrganismTraits(organism);

  if (organism.energy < traits.reproductionEnergy) {
    return;
  }

  organism.energy = CONFIG.PARENT_ENERGY_AFTER_REPRODUCTION;

  var child = makeOrganism(
    organism.x + randomInt(3) - 1,
    organism.y + randomInt(3) - 1,
    organism.lineageId
  );

  child.energy = CONFIG.CHILD_ORGANISM_ENERGY;
  child.traits = inheritOrganismTraits(traits);
  assignChildLineage(child, organism, traits);
  clampToWorld(child);
  child.prevX = child.x;
  child.prevY = child.y;
  world.organisms.push(child);
}

function updateOrganism(organism) {
  var traits = ensureOrganismTraits(organism);

  organism.prevX = organism.x;
  organism.prevY = organism.y;
  organism.age++;

  if (world.tick % 3 === 0) {
    organism.energy -= traits.metabolism;
  }

  var nearestFood = findNearestFood(organism, traits.vision);

  if (nearestFood) {
    moveTowardFood(organism, nearestFood);
  } else if (chance(traits.movementTendency)) {
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
