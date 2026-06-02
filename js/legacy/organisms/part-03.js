
function findNearestFood(organism, searchRadius) {
  return findNearestFoodInBuckets(organism.x, organism.y, searchRadius);
}

function moveTowardFood(organism, food) {
  organism.directionX = getDirectionXToTile(organism.x, food.x);
  organism.directionY = getDirectionYToTile(organism.y, food.y);
}

function getTerrainAffinityTargetValue(x, y) {
  return isFertile(x, y) ? 1 : 0;
}

function getTerrainMismatchForTraits(traits, x, y) {
  return Math.abs(traits.terrainAffinity - getTerrainAffinityTargetValue(x, y));
}

function getTerrainEnergyCost(traits, x, y) {
  return getTerrainMismatchForTraits(traits, x, y) * CONFIG.TERRAIN_MISMATCH_MAX_ENERGY_COST;
}

function applyTerrainEnergyCost(organism, traits) {
  organism.energy -= getTerrainEnergyCost(traits, organism.x, organism.y);
}

function chooseRoamingDirection(organism, traits) {
  var bestDirections = [];
  var bestMismatch = Infinity;

  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) {
        continue;
      }

      var nextX = getWrappedWorldX(organism.x + dx);
      var nextY = getClampedWorldY(organism.y + dy);
      var mismatch = getTerrainMismatchForTraits(traits, nextX, nextY);

      if (mismatch < bestMismatch) {
        bestMismatch = mismatch;
        bestDirections = [{ dx: dx, dy: dy }];
      } else if (mismatch === bestMismatch) {
        bestDirections.push({ dx: dx, dy: dy });
      }
    }
  }

  if (bestDirections.length === 0) {
    organism.directionX = randomInt(3) - 1;
    organism.directionY = randomInt(3) - 1;
    return;
  }

  var direction = bestDirections[randomInt(bestDirections.length)];
  organism.directionX = direction.dx;
  organism.directionY = direction.dy;
}

function eatFoodOnCurrentTile(organism) {
  if (!removeFoodAtPosition(organism.x, organism.y)) {
    return false;
  }

  organism.energy += CONFIG.FOOD_ENERGY_VALUE;

  if (typeof recordFoodConsumed === "function") {
    recordFoodConsumed(1);
  }

  return true;
}

function getReproductionScarcityPressure() {
  var population = Array.isArray(world.organisms) ? world.organisms.length : 0;

  if (population < CONFIG.FOOD_RECOVERY_MIN_POPULATION) {
    return 0;
  }

  var targetFood = Math.max(
    CONFIG.STARTING_FOOD * 0.08,
    population * CONFIG.REPRODUCTION_RESOURCE_TARGET_PER_ORGANISM
  );
  var deficit = targetFood - world.food.length;

  if (deficit <= 0) {
    return 0;
  }

  return clamp(deficit / Math.max(1, targetFood), 0, 1);
}

function getResourceAdjustedReproductionEnergy(traits, scarcityPressure) {
  var multiplier = 1 + clamp(scarcityPressure, 0, 1) * (
    CONFIG.REPRODUCTION_SCARCITY_MAX_ENERGY_MULTIPLIER - 1
  );

  return traits.reproductionEnergy * multiplier;
}

function reproduceIfReady(organism) {
  var traits = ensureOrganismTraits(organism);
  var scarcityPressure = getReproductionScarcityPressure();
  var reproductionEnergy = getResourceAdjustedReproductionEnergy(traits, scarcityPressure);

  world.reproductionScarcityPressure = Math.max(
    Number(world.reproductionScarcityPressure) || 0,
    scarcityPressure
  );

  if (organism.energy < reproductionEnergy) {
    return;
  }

  organism.energy = CONFIG.PARENT_ENERGY_AFTER_REPRODUCTION;

  var child = makeOrganism(
    organism.x + randomInt(3) - 1,
    organism.y + randomInt(3) - 1,
    organism.lineageId
  );

  if (!child) {
    return;
  }

  child.energy = CONFIG.CHILD_ORGANISM_ENERGY;
  child.traits = inheritOrganismTraits(traits);
  assignChildLineage(child, organism, traits);
  clampToWorld(child);
  child.prevX = child.x;
  child.prevY = child.y;
  world.organisms.push(child);

  if (typeof recordOrganismBirth === "function") {
    recordOrganismBirth(1);
  }
}

function updateOrganism(organism) {
  var traits = ensureOrganismTraits(organism);
  var surfacePosition = getEntitySurfacePosition(organism);

  organism.prevX = organism.x;
  organism.prevY = organism.y;
  organism.prevLatitude = surfacePosition ? surfacePosition.latitude : getPlanetLatitudeForTile(organism.y);
  organism.prevLongitude = surfacePosition ? surfacePosition.longitude : getPlanetLongitudeForTile(organism.x);
  organism.age++;
  organism.travelKm = Math.max(0, Number(organism.travelKm) || 0) + getOrganismTravelKmPerTick();

  if (world.tick % 3 === 0) {
    organism.energy -= traits.metabolism;
    applyTerrainEnergyCost(organism, traits);
  }

  var nearestFood = findNearestFood(organism, traits.vision);

  if (nearestFood) {
    moveTowardFood(organism, nearestFood);
  } else if (chance(traits.movementTendency)) {
    chooseRoamingDirection(organism, traits);
  }

  moveOrganismByTravelBudget(organism);

  eatFoodOnCurrentTile(organism);
  reproduceIfReady(organism);
}

function moveOrganismByTravelBudget(organism) {
  var nextX = getWrappedWorldX(organism.x + organism.directionX);
  var nextY = getClampedWorldY(organism.y + organism.directionY);

  if (nextX === organism.x && nextY === organism.y) {
    return false;
  }

  var requiredTravelKm = getTileGreatCircleDistanceKm(organism.x, organism.y, nextX, nextY);

  if (organism.travelKm < requiredTravelKm) {
    return false;
  }

  organism.travelKm -= requiredTravelKm;
  organism.x = nextX;
  organism.y = nextY;
  clampToWorld(organism);
  assignRandomSurfacePositionInTile(organism);
  return true;
}

function removeDeadOrganisms() {
  var writeIndex = 0;
  var removedCount = 0;

  for (var readIndex = 0; readIndex < world.organisms.length; readIndex++) {
    var organism = world.organisms[readIndex];

    if (organism.energy > 0 && organism.age < CONFIG.ORGANISM_MAX_AGE) {
      world.organisms[writeIndex] = organism;
      writeIndex++;
    } else {
      if (PS.pools && PS.pools.organism) {
        PS.pools.organism.release(organism);
      }
      removedCount++;
    }
  }

  world.organisms.length = writeIndex;

  if (typeof recordOrganismDeath === "function") {
    recordOrganismDeath(removedCount);
  }
}

function trimOrganismPopulation() {
  if (world.organisms.length > CONFIG.MAX_ORGANISMS) {
    var trimmedCount = world.organisms.length - CONFIG.MAX_ORGANISMS;

    for (var i = CONFIG.MAX_ORGANISMS; i < world.organisms.length; i++) {
      if (PS.pools && PS.pools.organism) {
        PS.pools.organism.release(world.organisms[i]);
      }
    }

    world.organisms.length = CONFIG.MAX_ORGANISMS;

    if (typeof recordOrganismDeath === "function") {
      recordOrganismDeath(trimmedCount);
    }
  }
}
