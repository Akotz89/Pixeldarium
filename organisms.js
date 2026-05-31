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
    ),
    terrainAffinity: varyTraitValue(
      CONFIG.TRAIT_TERRAIN_AFFINITY_DEFAULT,
      CONFIG.TRAIT_TERRAIN_AFFINITY_MIN,
      CONFIG.TRAIT_TERRAIN_AFFINITY_MAX,
      CONFIG.TRAIT_TERRAIN_AFFINITY_MUTATION_STEP
    )
  };
}

function inheritOrganismTraits(parentTraits) {
  parentTraits = normalizeOrganismTraits(parentTraits);

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
    ),
    terrainAffinity: inheritTraitValue(
      parentTraits.terrainAffinity,
      CONFIG.TRAIT_TERRAIN_AFFINITY_MIN,
      CONFIG.TRAIT_TERRAIN_AFFINITY_MAX,
      CONFIG.TRAIT_TERRAIN_AFFINITY_MUTATION_STEP
    )
  };
}

function copyTraitsForLineage(traits) {
  traits = normalizeOrganismTraits(traits);

  return {
    vision: traits.vision,
    metabolism: traits.metabolism,
    reproductionEnergy: traits.reproductionEnergy,
    movementTendency: traits.movementTendency,
    terrainAffinity: traits.terrainAffinity
  };
}

function allocateLineageId() {
  var lineageId = world.nextLineageId;
  world.nextLineageId++;
  return lineageId;
}

function ensureLineageRegistry() {
  if (!world.lineages) {
    world.lineages = {};
  }

  return world.lineages;
}

function makeLineageRecord(lineageId, parentId, founderGeneration, founderTraits, createdTick) {
  return {
    id: lineageId,
    parentId: Math.max(0, Math.round(parentId || 0)),
    createdTick: Math.max(0, Math.round(createdTick || 0)),
    founderGeneration: Math.max(0, Math.round(founderGeneration || 0)),
    founderTraits: copyTraitsForLineage(founderTraits || makeInitialOrganismTraits()),
    activeCount: 0,
    lastSeenTick: Math.max(0, Math.round(createdTick || 0)),
    peakPopulation: 0,
    isExtinct: true
  };
}

function registerLineage(lineageId, parentId, founderGeneration, founderTraits, createdTick) {
  var lineages = ensureLineageRegistry();
  var lineageKey = String(lineageId);
  var record = lineages[lineageKey];

  if (!record) {
    record = makeLineageRecord(
      lineageId,
      parentId,
      founderGeneration,
      founderTraits,
      createdTick
    );
    lineages[lineageKey] = record;
  } else {
    if (typeof record.parentId !== "number") {
      record.parentId = Math.max(0, Math.round(parentId || 0));
    }

    if (typeof record.createdTick !== "number") {
      record.createdTick = Math.max(0, Math.round(createdTick || 0));
    }

    if (typeof record.founderGeneration !== "number") {
      record.founderGeneration = Math.max(0, Math.round(founderGeneration || 0));
    }

    if (!record.founderTraits) {
      record.founderTraits = copyTraitsForLineage(founderTraits || makeInitialOrganismTraits());
    } else {
      record.founderTraits = copyTraitsForLineage(record.founderTraits);
    }

    record.activeCount = Math.max(0, Math.round(record.activeCount || 0));
    record.lastSeenTick = Math.max(0, Math.round(record.lastSeenTick || record.createdTick || 0));
    record.peakPopulation = Math.max(0, Math.round(record.peakPopulation || 0));
    record.isExtinct = Boolean(record.isExtinct);
  }

  if (lineageId >= world.nextLineageId) {
    world.nextLineageId = lineageId + 1;
  }

  return record;
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

  registerLineage(
    organism.lineageId,
    organism.lineageParentId,
    organism.generation,
    ensureOrganismTraits(organism),
    world.tick
  );

  return organism.lineageId;
}

function getTraitDivergenceScore(parentTraits, childTraits) {
  parentTraits = normalizeOrganismTraits(parentTraits);
  childTraits = normalizeOrganismTraits(childTraits);

  return (
    Math.abs(childTraits.vision - parentTraits.vision) / CONFIG.TRAIT_VISION_MUTATION_STEP +
    Math.abs(childTraits.metabolism - parentTraits.metabolism) / CONFIG.TRAIT_METABOLISM_MUTATION_STEP +
    Math.abs(childTraits.reproductionEnergy - parentTraits.reproductionEnergy) / CONFIG.TRAIT_REPRODUCTION_ENERGY_MUTATION_STEP +
    Math.abs(childTraits.movementTendency - parentTraits.movementTendency) / CONFIG.TRAIT_MOVEMENT_TENDENCY_MUTATION_STEP +
    Math.abs(childTraits.terrainAffinity - parentTraits.terrainAffinity) / CONFIG.TRAIT_TERRAIN_AFFINITY_MUTATION_STEP
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
    registerLineage(child.lineageId, parentLineageId, child.generation, childTraits, world.tick);
  } else {
    child.lineageId = parentLineageId;
    child.lineageParentId = parent.lineageParentId;
  }
}

function ensureOrganismTraits(organism) {
  if (!organism.traits) {
    organism.traits = makeInitialOrganismTraits();
  }

  return normalizeOrganismTraits(organism.traits);
}

function normalizeOrganismTraits(traits) {
  traits = traits || {};

  if (typeof traits.vision !== "number") {
    traits.vision = CONFIG.TRAIT_VISION_DEFAULT;
  }

  if (typeof traits.metabolism !== "number") {
    traits.metabolism = CONFIG.TRAIT_METABOLISM_DEFAULT;
  }

  if (typeof traits.reproductionEnergy !== "number") {
    traits.reproductionEnergy = CONFIG.TRAIT_REPRODUCTION_ENERGY_DEFAULT;
  }

  if (typeof traits.movementTendency !== "number") {
    traits.movementTendency = CONFIG.TRAIT_MOVEMENT_TENDENCY_DEFAULT;
  }

  if (typeof traits.terrainAffinity !== "number") {
    traits.terrainAffinity = CONFIG.TRAIT_TERRAIN_AFFINITY_DEFAULT;
  }

  traits.vision = clamp(traits.vision, CONFIG.TRAIT_VISION_MIN, CONFIG.TRAIT_VISION_MAX);
  traits.metabolism = clamp(traits.metabolism, CONFIG.TRAIT_METABOLISM_MIN, CONFIG.TRAIT_METABOLISM_MAX);
  traits.reproductionEnergy = clamp(
    traits.reproductionEnergy,
    CONFIG.TRAIT_REPRODUCTION_ENERGY_MIN,
    CONFIG.TRAIT_REPRODUCTION_ENERGY_MAX
  );
  traits.movementTendency = clamp(
    traits.movementTendency,
    CONFIG.TRAIT_MOVEMENT_TENDENCY_MIN,
    CONFIG.TRAIT_MOVEMENT_TENDENCY_MAX
  );
  traits.terrainAffinity = clamp(
    traits.terrainAffinity,
    CONFIG.TRAIT_TERRAIN_AFFINITY_MIN,
    CONFIG.TRAIT_TERRAIN_AFFINITY_MAX
  );

  return traits;
}

function makeOrganism(x, y, lineageId) {
  var tileX = getWrappedWorldX(x);
  var tileY = getClampedWorldY(y);
  var organism = {
    x: tileX,
    y: tileY,
    prevX: tileX,
    prevY: tileY,
    energy: CONFIG.STARTING_ORGANISM_ENERGY,
    age: 0,
    directionX: randomInt(3) - 1,
    directionY: randomInt(3) - 1,
    traits: makeInitialOrganismTraits(),
    lineageId: lineageId || allocateLineageId(),
    lineageParentId: 0,
    generation: 0
  };

  registerLineage(organism.lineageId, 0, 0, organism.traits, world.tick);
  return organism;
}

function getOrganismBucketSize() {
  return Math.max(1, Math.round(Number(CONFIG.ORGANISM_SPATIAL_BUCKET_SIZE) || 16));
}

function getOrganismBucketKey(x, y) {
  var bucketSize = getOrganismBucketSize();
  return Math.floor(getWrappedWorldX(x) / bucketSize) + ":" + Math.floor(getClampedWorldY(y) / bucketSize);
}

function ensureOrganismIndexState() {
  if (!world.organismBuckets) {
    world.organismBuckets = {};
  }

  if (!world.organismsByLineage) {
    world.organismsByLineage = {};
  }
}

function registerOrganismInIndexes(organism) {
  ensureOrganismIndexState();

  var lineageId = ensureOrganismLineage(organism);
  var lineageKey = String(lineageId);
  var bucketKey = getOrganismBucketKey(organism.x, organism.y);

  if (!world.organismBuckets[bucketKey]) {
    world.organismBuckets[bucketKey] = [];
  }

  if (!world.organismsByLineage[lineageKey]) {
    world.organismsByLineage[lineageKey] = [];
  }

  world.organismBuckets[bucketKey].push(organism);
  world.organismsByLineage[lineageKey].push(organism);
}

function rebuildOrganismIndexes() {
  world.organismBuckets = {};
  world.organismsByLineage = {};

  for (var i = 0; i < world.organisms.length; i++) {
    registerOrganismInIndexes(world.organisms[i]);
  }
}

function ensureOrganismIndexes() {
  if (!world.organismBuckets || !world.organismsByLineage) {
    rebuildOrganismIndexes();
  }
}

function getIndexedOrganismsForLineage(lineageId) {
  ensureOrganismIndexes();
  return world.organismsByLineage[String(lineageId)] || [];
}

function collectOrganismsInRadius(x, y, radius, lineageId, limit) {
  ensureOrganismIndexes();

  var bucketSize = getOrganismBucketSize();
  var normalizedRadius = Math.max(0, Math.round(Number(radius) || 0));
  var normalizedLineageId = Math.max(0, Math.round(Number(lineageId) || 0));
  var normalizedLimit = Number.isFinite(Number(limit)) ? Math.max(0, Math.round(Number(limit))) : Infinity;
  var bucketXs = getWrappedBucketIndexes(x, normalizedRadius, bucketSize, WORLD_WIDTH);
  var bucketYs = getClampedBucketIndexes(y, normalizedRadius, bucketSize, WORLD_HEIGHT);
  var organisms = [];

  if (normalizedLimit <= 0) {
    return organisms;
  }

  for (var bucketYIndex = 0; bucketYIndex < bucketYs.length; bucketYIndex++) {
    for (var bucketXIndex = 0; bucketXIndex < bucketXs.length; bucketXIndex++) {
      var bucketY = bucketYs[bucketYIndex];
      var bucketX = bucketXs[bucketXIndex];
      var bucket = world.organismBuckets[bucketX + ":" + bucketY];

      if (!bucket) {
        continue;
      }

      for (var i = 0; i < bucket.length; i++) {
        var organism = bucket[i];

        if (
          (normalizedLineageId <= 0 || ensureOrganismLineage(organism) === normalizedLineageId) &&
          getTileManhattanDistance(x, y, organism.x, organism.y) <= normalizedRadius
        ) {
          organisms.push(organism);

          if (organisms.length >= normalizedLimit) {
            return organisms;
          }
        }
      }
    }
  }

  return organisms;
}

function countOrganismsInRadiusForLineage(x, y, radius, lineageId) {
  ensureOrganismIndexes();

  var bucketSize = getOrganismBucketSize();
  var normalizedRadius = Math.max(0, Math.round(Number(radius) || 0));
  var normalizedLineageId = Math.max(0, Math.round(Number(lineageId) || 0));
  var bucketXs = getWrappedBucketIndexes(x, normalizedRadius, bucketSize, WORLD_WIDTH);
  var bucketYs = getClampedBucketIndexes(y, normalizedRadius, bucketSize, WORLD_HEIGHT);
  var count = 0;

  for (var bucketYIndex = 0; bucketYIndex < bucketYs.length; bucketYIndex++) {
    for (var bucketXIndex = 0; bucketXIndex < bucketXs.length; bucketXIndex++) {
      var bucketY = bucketYs[bucketYIndex];
      var bucketX = bucketXs[bucketXIndex];
      var bucket = world.organismBuckets[bucketX + ":" + bucketY];

      if (!bucket) {
        continue;
      }

      for (var i = 0; i < bucket.length; i++) {
        var organism = bucket[i];

        if (
          (normalizedLineageId <= 0 || ensureOrganismLineage(organism) === normalizedLineageId) &&
          getTileManhattanDistance(x, y, organism.x, organism.y) <= normalizedRadius
        ) {
          count++;
        }
      }
    }
  }

  return count;
}

function getNearestOrganismInRadius(x, y, radius) {
  ensureOrganismIndexes();

  var bucketSize = getOrganismBucketSize();
  var normalizedRadius = Math.max(0, Math.round(Number(radius) || 0));
  var bucketXs = getWrappedBucketIndexes(x, normalizedRadius, bucketSize, WORLD_WIDTH);
  var bucketYs = getClampedBucketIndexes(y, normalizedRadius, bucketSize, WORLD_HEIGHT);
  var nearestOrganism = null;
  var nearestDistance = Infinity;

  for (var bucketYIndex = 0; bucketYIndex < bucketYs.length; bucketYIndex++) {
    for (var bucketXIndex = 0; bucketXIndex < bucketXs.length; bucketXIndex++) {
      var bucketY = bucketYs[bucketYIndex];
      var bucketX = bucketXs[bucketXIndex];
      var bucket = world.organismBuckets[bucketX + ":" + bucketY];

      if (!bucket) {
        continue;
      }

      for (var i = 0; i < bucket.length; i++) {
        var organism = bucket[i];
        var distance = getTileManhattanDistance(x, y, organism.x, organism.y);

        if (distance < nearestDistance && distance <= normalizedRadius) {
          nearestOrganism = organism;
          nearestDistance = distance;
        }
      }
    }
  }

  return nearestOrganism;
}

function updateLineageSummaryCache() {
  var lineages = [];
  var activeCount = 0;
  var extinctCount = 0;
  var newestLineage = null;
  var topLineages = [];
  var lineageRecords = world.lineages || {};

  for (var lineageKey in lineageRecords) {
    if (Object.prototype.hasOwnProperty.call(lineageRecords, lineageKey)) {
      lineages.push(lineageRecords[lineageKey]);
    }
  }

  if (lineages.length === 0) {
    world.lineageSummary = null;
    world.lineageSummaryText = "LINEAGES: -";
    return world.lineageSummaryText;
  }

  for (var i = 0; i < lineages.length; i++) {
    var lineage = lineages[i];

    if (lineage.activeCount > 0) {
      activeCount++;
      topLineages.push(lineage);
    } else {
      extinctCount++;
    }

    if (
      !newestLineage ||
      lineage.createdTick > newestLineage.createdTick ||
      (lineage.createdTick === newestLineage.createdTick && lineage.id > newestLineage.id)
    ) {
      newestLineage = lineage;
    }
  }

  topLineages.sort(function(a, b) {
    if (b.activeCount !== a.activeCount) {
      return b.activeCount - a.activeCount;
    }

    return a.id - b.id;
  });

  var visibleLineages = [];
  var visibleLineageSummaries = [];

  for (var topIndex = 0; topIndex < Math.min(5, topLineages.length); topIndex++) {
    visibleLineages.push(
      "L" + topLineages[topIndex].id +
      " " + topLineages[topIndex].activeCount +
      " peak " + topLineages[topIndex].peakPopulation
    );
    visibleLineageSummaries.push({
      id: topLineages[topIndex].id,
      activeCount: topLineages[topIndex].activeCount,
      peakPopulation: topLineages[topIndex].peakPopulation
    });
  }

  var newestText = "newest L" + newestLineage.id + " founder";

  if (newestLineage.parentId > 0) {
    newestText = "newest L" + newestLineage.id + " parent L" + newestLineage.parentId;
  }

  world.lineageSummaryText =
    "LINEAGES: " + activeCount +
    " active / " + extinctCount + " extinct   " +
    newestText +
    "   top " + (visibleLineages.length > 0 ? visibleLineages.join(" | ") : "-");
  world.lineageSummary = {
    activeCount: activeCount,
    extinctCount: extinctCount,
    newestId: newestLineage.id,
    newestParentId: newestLineage.parentId,
    newestCreatedTick: newestLineage.createdTick,
    topLineages: visibleLineageSummaries
  };

  return world.lineageSummaryText;
}

function refreshLineageRegistry() {
  var lineages = ensureLineageRegistry();
  var lineageKey;
  var traitTotals = {
    vision: 0,
    metabolism: 0,
    reproductionEnergy: 0,
    movementTendency: 0,
    terrainAffinity: 0
  };

  world.organismBuckets = {};
  world.organismsByLineage = {};

  for (lineageKey in lineages) {
    if (Object.prototype.hasOwnProperty.call(lineages, lineageKey)) {
      lineages[lineageKey].activeCount = 0;
    }
  }

  for (var i = 0; i < world.organisms.length; i++) {
    var organism = world.organisms[i];
    var traits = ensureOrganismTraits(organism);
    var lineageId = ensureOrganismLineage(organism);
    var record = registerLineage(
      lineageId,
      organism.lineageParentId,
      organism.generation,
      traits,
      world.tick
    );

    traitTotals.vision += traits.vision;
    traitTotals.metabolism += traits.metabolism;
    traitTotals.reproductionEnergy += traits.reproductionEnergy;
    traitTotals.movementTendency += traits.movementTendency;
    traitTotals.terrainAffinity += traits.terrainAffinity;

    record.activeCount++;
    record.lastSeenTick = world.tick;

    if (record.activeCount > record.peakPopulation) {
      record.peakPopulation = record.activeCount;
    }

    registerOrganismInIndexes(organism);
  }

  for (lineageKey in lineages) {
    if (Object.prototype.hasOwnProperty.call(lineages, lineageKey)) {
      var lineage = lineages[lineageKey];
      lineage.isExtinct = lineage.activeCount === 0;
    }
  }

  if (world.organisms.length === 0) {
    world.populationTraitSummary = null;
  } else {
    world.populationTraitSummary = {
      population: world.organisms.length,
      vision: traitTotals.vision / world.organisms.length,
      metabolism: traitTotals.metabolism / world.organisms.length,
      reproductionEnergy: traitTotals.reproductionEnergy / world.organisms.length,
      movementTendency: traitTotals.movementTendency / world.organisms.length,
      terrainAffinity: traitTotals.terrainAffinity / world.organisms.length
    };
  }

  updateLineageSummaryCache();
}

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

  organism.prevX = organism.x;
  organism.prevY = organism.y;
  organism.age++;

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

  organism.x += organism.directionX;
  organism.y += organism.directionY;
  clampToWorld(organism);

  eatFoodOnCurrentTile(organism);
  reproduceIfReady(organism);
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
    world.organisms.length = CONFIG.MAX_ORGANISMS;

    if (typeof recordOrganismDeath === "function") {
      recordOrganismDeath(trimmedCount);
    }
  }
}
