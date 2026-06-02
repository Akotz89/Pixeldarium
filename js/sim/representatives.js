PS.sim = PS.sim || {};

var REPRESENTATIVE_HISTORY_LIMIT = 12;
var REPRESENTATIVE_TERRITORY_LIMIT = 8;
var REPRESENTATIVE_TRAIT_KEYS = [
  "vision",
  "metabolism",
  "reproductionEnergy",
  "movementTendency",
  "terrainAffinity",
  "bodySize",
  "limbCount",
  "bodyShape",
  "appendageType",
  "camouflage",
  "thermalTolerance",
  "waterDependency"
];

function ensureRepresentativeState() {
  world.biologyPopulations = Array.isArray(world.biologyPopulations) ? world.biologyPopulations : [];
  world.biologyPopulationById = world.biologyPopulationById || {};
  world.biologyRepresentatives = Array.isArray(world.biologyRepresentatives) ? world.biologyRepresentatives : [];
  world.biologyRepresentativeById = world.biologyRepresentativeById || {};
}

function getBiologyPopulationById(populationId) {
  ensureRepresentativeState();
  return world.biologyPopulationById[String(populationId)] || null;
}

function getBiologyRepresentativeById(representativeId) {
  ensureRepresentativeState();
  return world.biologyRepresentativeById[String(representativeId)] || null;
}

function makeBiologyPopulation(organism) {
  var lineageId = ensureOrganismLineage(organism);
  var populationId = Math.max(1, Math.round(Number(organism.populationId) || lineageId));
  var record = {
    id: populationId,
    speciesId: Math.max(1, Math.round(Number(organism.speciesId) || lineageId)),
    lineageId: lineageId,
    parentPopulationId: Math.max(0, Math.round(Number(organism.parentPopulationId) || 0)),
    count: 0,
    biomass: 0,
    energyReserve: 0,
    territoryCells: [],
    traitMean: {},
    traitVariance: {},
    pressure: {},
    representativeIds: [],
    createdTick: Math.max(0, Math.round(Number(world.tick) || 0)),
    lastUpdatedTick: Math.max(0, Math.round(Number(world.tick) || 0)),
    isActive: true
  };

  world.biologyPopulations.push(record);
  world.biologyPopulationById[String(record.id)] = record;

  if (record.id >= world.nextBiologyPopulationId) {
    world.nextBiologyPopulationId = record.id + 1;
  }

  return record;
}

function ensureBiologyPopulation(organism) {
  ensureRepresentativeState();
  ensureOrganismLineage(organism);

  var populationId = Math.max(1, Math.round(Number(organism.populationId) || organism.lineageId));
  var record = getBiologyPopulationById(populationId);

  if (!record) {
    return makeBiologyPopulation(organism);
  }

  record.speciesId = Math.max(1, Math.round(Number(organism.speciesId) || record.speciesId || organism.lineageId));
  record.lineageId = Math.max(1, Math.round(Number(organism.lineageId) || record.lineageId || record.speciesId));
  record.isActive = true;
  return record;
}

function copyRepresentativeTraits(organism) {
  var traits = ensureOrganismTraits(organism);
  var copy = {};

  for (var i = 0; i < REPRESENTATIVE_TRAIT_KEYS.length; i++) {
    var key = REPRESENTATIVE_TRAIT_KEYS[i];
    copy[key] = traits[key];
  }

  return copy;
}

function getRepresentativeBehavior(organism, traits) {
  if (Number(organism.energy) <= 0) {
    return "retiring";
  }

  if (typeof foodExistsAt === "function" && foodExistsAt(organism.x, organism.y)) {
    return "feeding";
  }

  if (Number(organism.energy) >= Number(traits.reproductionEnergy)) {
    return "breeding";
  }

  if (Number(organism.directionX) || Number(organism.directionY)) {
    return "foraging";
  }

  return "watching";
}

function getRepresentativeTarget(organism, traits) {
  if (typeof findNearestFoodInBuckets !== "function") {
    return null;
  }

  var food = findNearestFoodInBuckets(organism.x, organism.y, traits.vision);

  if (!food) {
    return null;
  }

  return {
    type: "food",
    x: food.x,
    y: food.y
  };
}

function appendRepresentativeHistory(record, behavior, target) {
  var entry = {
    tick: Math.max(0, Math.round(Number(world.tick) || 0)),
    x: record.x,
    y: record.y,
    energy: record.energy,
    behavior: behavior,
    target: target
  };
  var last = record.history.length > 0 ? record.history[record.history.length - 1] : null;

  if (last && last.tick === entry.tick && last.behavior === entry.behavior) {
    return;
  }

  record.history.push(entry);

  while (record.history.length > REPRESENTATIVE_HISTORY_LIMIT) {
    record.history.shift();
  }
}

function syncBiologyRepresentative(organism, options) {
  ensureRepresentativeState();
  var population = ensureBiologyPopulation(organism);
  var traits = copyRepresentativeTraits(organism);
  var representativeId = Math.max(1, Math.round(Number(organism.representativeId) || 0));
  var behavior = getRepresentativeBehavior(organism, traits);
  var target = getRepresentativeTarget(organism, traits);
  var record = getBiologyRepresentativeById(representativeId);
  var tick = Math.max(0, Math.round(Number(world.tick) || 0));

  if (!record) {
    record = {
      id: representativeId,
      history: [],
      pinned: false,
      selected: false,
      bookmarkScore: 0,
      createdTick: tick
    };
    world.biologyRepresentatives.push(record);
    world.biologyRepresentativeById[String(representativeId)] = record;
  }

  record.populationId = population.id;
  record.speciesId = population.speciesId;
  record.lineageId = population.lineageId;
  record.x = organism.x;
  record.y = organism.y;
  record.latitude = organism.latitude;
  record.longitude = organism.longitude;
  record.energy = Math.round(Number(organism.energy) || 0);
  record.age = Math.max(0, Number(organism.age) || 0);
  record.behavior = behavior;
  record.target = target;
  record.traits = traits;
  record.isActive = true;
  record.lastSeenTick = tick;

  if (options && options.selected) {
    record.selected = true;
    record.lastSelectedTick = tick;
  }

  appendRepresentativeHistory(record, behavior, target);
  return record;
}

function getPopulationTraitStats(organisms) {
  var mean = {};
  var variance = {};

  for (var keyIndex = 0; keyIndex < REPRESENTATIVE_TRAIT_KEYS.length; keyIndex++) {
    var key = REPRESENTATIVE_TRAIT_KEYS[keyIndex];
    var total = 0;
    var count = 0;

    for (var i = 0; i < organisms.length; i++) {
      var value = Number(ensureOrganismTraits(organisms[i])[key]);

      if (Number.isFinite(value)) {
        total += value;
        count++;
      }
    }

    mean[key] = count > 0 ? total / count : 0;
    variance[key] = 0;

    for (var j = 0; j < organisms.length; j++) {
      var diff = Number(ensureOrganismTraits(organisms[j])[key]) - mean[key];
      variance[key] += Number.isFinite(diff) ? diff * diff : 0;
    }

    variance[key] = count > 0 ? variance[key] / count : 0;
  }

  return {
    mean: mean,
    variance: variance
  };
}

function getPopulationTerritoryCells(organisms) {
  var cellsByKey = {};
  var cells = [];

  for (var i = 0; i < organisms.length; i++) {
    var key = organisms[i].x + ":" + organisms[i].y;

    if (!cellsByKey[key]) {
      cellsByKey[key] = {
        x: organisms[i].x,
        y: organisms[i].y,
        density: 0
      };
      cells.push(cellsByKey[key]);
    }

    cellsByKey[key].density++;
  }

  cells.sort(function(a, b) {
    if (b.density !== a.density) {
      return b.density - a.density;
    }

    return a.x - b.x || a.y - b.y;
  });

  return cells.slice(0, REPRESENTATIVE_TERRITORY_LIMIT);
}

function getPopulationPressure(organisms, energyReserve) {
  var foodCount = 0;
  var terrainMismatch = 0;

  for (var i = 0; i < organisms.length; i++) {
    if (typeof foodExistsAt === "function" && foodExistsAt(organisms[i].x, organisms[i].y)) {
      foodCount++;
    }

    if (typeof getTerrainMismatchForTraits === "function") {
      terrainMismatch += getTerrainMismatchForTraits(ensureOrganismTraits(organisms[i]), organisms[i].x, organisms[i].y);
    }
  }

  return {
    food: foodCount,
    scarcity: organisms.length > 0 ? Math.max(0, 1 - foodCount / organisms.length) : 0,
    terrain: organisms.length > 0 ? terrainMismatch / organisms.length : 0,
    energyReserve: energyReserve
  };
}

function updatePopulationFromOrganisms(population, organisms) {
  var stats = getPopulationTraitStats(organisms);
  var biomass = 0;
  var representativeIds = [];

  for (var i = 0; i < organisms.length; i++) {
    var record = syncBiologyRepresentative(organisms[i]);
    representativeIds.push(record.id);
    biomass += Math.max(0, Number(organisms[i].energy) || 0);
  }

  population.count = organisms.length;
  population.biomass = Math.round(biomass);
  population.energyReserve = organisms.length > 0 ? biomass / organisms.length : 0;
  population.territoryCells = getPopulationTerritoryCells(organisms);
  population.traitMean = stats.mean;
  population.traitVariance = stats.variance;
  population.pressure = getPopulationPressure(organisms, population.energyReserve);
  population.representativeIds = representativeIds;
  population.lastUpdatedTick = Math.max(0, Math.round(Number(world.tick) || 0));
  population.isActive = organisms.length > 0;
}

function refreshBiologyRepresentatives() {
  ensureRepresentativeState();
  rebuildOrganismIndexes();
  var activeIds = {};
  var grouped = {};

  for (var i = 0; i < world.organisms.length; i++) {
    var organism = world.organisms[i];
    var population = ensureBiologyPopulation(organism);
    var key = String(population.id);
    grouped[key] = grouped[key] || [];
    grouped[key].push(organism);
    activeIds[String(organism.representativeId)] = true;
  }

  for (var populationKey in grouped) {
    if (Object.prototype.hasOwnProperty.call(grouped, populationKey)) {
      updatePopulationFromOrganisms(getBiologyPopulationById(populationKey), grouped[populationKey]);
    }
  }

  for (var j = 0; j < world.biologyRepresentatives.length; j++) {
    var record = world.biologyRepresentatives[j];
    record.isActive = Boolean(activeIds[String(record.id)]);
  }

  return world.biologyPopulations;
}

function setRepresentativePinned(organismOrId, pinned) {
  var record = typeof organismOrId === "object"
    ? syncBiologyRepresentative(organismOrId)
    : getBiologyRepresentativeById(organismOrId);

  if (!record) {
    return null;
  }

  record.pinned = pinned !== false;
  return record;
}

function setRepresentativeBookmark(organismOrId, score) {
  var record = typeof organismOrId === "object"
    ? syncBiologyRepresentative(organismOrId)
    : getBiologyRepresentativeById(organismOrId);

  if (!record) {
    return null;
  }

  record.bookmarkScore = clamp(Number(score), 0, 1);
  return record;
}

function selectRepresentative(organismOrId) {
  var record = typeof organismOrId === "object"
    ? syncBiologyRepresentative(organismOrId, { selected: true })
    : getBiologyRepresentativeById(organismOrId);

  if (record) {
    record.selected = true;
    record.lastSelectedTick = Math.max(0, Math.round(Number(world.tick) || 0));
  }

  return record;
}

function inspectBiologyRepresentative(organismOrId) {
  var record = typeof organismOrId === "object"
    ? syncBiologyRepresentative(organismOrId)
    : getBiologyRepresentativeById(organismOrId);

  if (!record) {
    return null;
  }

  return {
    representative: record,
    population: getBiologyPopulationById(record.populationId)
  };
}

PS.sim.representatives = {
  refresh: refreshBiologyRepresentatives,
  syncOrganism: syncBiologyRepresentative,
  pin: setRepresentativePinned,
  bookmark: setRepresentativeBookmark,
  select: selectRepresentative,
  inspect: inspectBiologyRepresentative,
  getRepresentative: getBiologyRepresentativeById,
  getPopulation: getBiologyPopulationById
};
