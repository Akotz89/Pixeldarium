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
  var surfacePosition = getRandomLatLonInTile(tileX, tileY);
  var organism = PS.pools && PS.pools.ensure().organism.acquire();

  if (!organism) {
    return null;
  }

  organism.x = tileX;
  organism.y = tileY;
  organism.prevX = tileX;
  organism.prevY = tileY;
  organism.latitude = surfacePosition.latitude;
  organism.longitude = surfacePosition.longitude;
  organism.prevLatitude = surfacePosition.latitude;
  organism.prevLongitude = surfacePosition.longitude;
  organism.energy = CONFIG.STARTING_ORGANISM_ENERGY;
  organism.age = 0;
  organism.directionX = randomInt(3) - 1;
  organism.directionY = randomInt(3) - 1;
  organism.velocityX = 0;
  organism.velocityY = 0;
  organism.travelKm = 0;
  organism.traits = makeInitialOrganismTraits();
  organism.lineageId = lineageId || allocateLineageId();
  organism.lineageParentId = 0;
  organism.generation = 0;

  registerLineage(organism.lineageId, 0, 0, organism.traits, world.tick);
  return organism;
}
