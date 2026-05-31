function ensureSettlementState() {
  if (!Array.isArray(world.settlements)) {
    world.settlements = [];
  }

  if (typeof world.nextSettlementId !== "number" || world.nextSettlementId < 1) {
    world.nextSettlementId = 1;
  }
}

function allocateSettlementId() {
  ensureSettlementState();

  var settlementId = world.nextSettlementId;
  world.nextSettlementId++;
  return settlementId;
}

function getSettlementForLineage(lineageId) {
  ensureSettlementState();

  for (var i = 0; i < world.settlements.length; i++) {
    if (world.settlements[i].lineageId === lineageId) {
      return world.settlements[i];
    }
  }

  return null;
}

function getOrganismsForLineage(lineageId) {
  var organisms = [];

  for (var i = 0; i < world.organisms.length; i++) {
    if (ensureOrganismLineage(world.organisms[i]) === lineageId) {
      organisms.push(world.organisms[i]);
    }
  }

  return organisms;
}

function getLineageCenter(organisms) {
  var totalX = 0;
  var totalY = 0;

  for (var i = 0; i < organisms.length; i++) {
    totalX += organisms[i].x;
    totalY += organisms[i].y;
  }

  return {
    x: clamp(Math.round(totalX / organisms.length), 0, WORLD_WIDTH - 1),
    y: clamp(Math.round(totalY / organisms.length), 0, WORLD_HEIGHT - 1)
  };
}

function getDistanceToSettlement(settlement, x, y) {
  return Math.abs(settlement.x - x) + Math.abs(settlement.y - y);
}

function restoreSettlementGrowthNumber(value, fallback) {
  var numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function getSettlementLevelForDevelopment(development) {
  var threshold = Math.max(1, Number(CONFIG.SETTLEMENT_LEVEL_DEVELOPMENT) || 1);
  return Math.max(1, Math.floor(Math.max(0, development) / threshold) + 1);
}

function getSettlementInfluenceRadius(settlement) {
  var level = Math.max(1, Math.round(restoreSettlementGrowthNumber(settlement.level, 1)));
  var baseRadius = Math.max(1, Math.round(Number(CONFIG.SETTLEMENT_INFLUENCE_BASE_RADIUS) || 1));
  var radiusPerLevel = Math.max(0, Math.round(Number(CONFIG.SETTLEMENT_INFLUENCE_RADIUS_PER_LEVEL) || 0));
  return baseRadius + (level - 1) * radiusPerLevel;
}

function countSettlementClaimedTiles(settlement) {
  var claimedTiles = 0;
  var radius = Math.max(1, Math.round(settlement.influenceRadius || getSettlementInfluenceRadius(settlement)));
  var minY = Math.max(0, settlement.y - radius);
  var maxY = Math.min(WORLD_HEIGHT - 1, settlement.y + radius);

  for (var y = minY; y <= maxY; y++) {
    var rowDistance = Math.abs(settlement.y - y);
    var rowRadius = radius - rowDistance;
    var minX = Math.max(0, settlement.x - rowRadius);
    var maxX = Math.min(WORLD_WIDTH - 1, settlement.x + rowRadius);
    claimedTiles += maxX - minX + 1;
  }

  return Math.min(claimedTiles, WORLD_WIDTH * WORLD_HEIGHT);
}

function countSettlementClaimedFood(settlement) {
  var claimedFood = 0;
  var radius = Math.max(1, Math.round(settlement.influenceRadius || getSettlementInfluenceRadius(settlement)));

  for (var i = 0; i < world.food.length; i++) {
    if (getDistanceToSettlement(settlement, world.food[i].x, world.food[i].y) <= radius) {
      claimedFood++;
    }
  }

  return claimedFood;
}

function updateSettlementInfluence(settlement) {
  settlement.influenceRadius = getSettlementInfluenceRadius(settlement);
  settlement.claimedTiles = countSettlementClaimedTiles(settlement);
  settlement.claimedFood = countSettlementClaimedFood(settlement);
}

function normalizeSettlementGrowth(settlement) {
  settlement.storedFood = Math.max(0, Math.round(restoreSettlementGrowthNumber(settlement.storedFood, 0)));
  settlement.development = Math.max(0, restoreSettlementGrowthNumber(settlement.development, 0));
  settlement.level = Math.max(
    1,
    Math.round(restoreSettlementGrowthNumber(settlement.level, getSettlementLevelForDevelopment(settlement.development)))
  );
  settlement.lastGrowthTick = Math.max(
    0,
    Math.round(restoreSettlementGrowthNumber(settlement.lastGrowthTick, settlement.foundedTick || 0))
  );
  settlement.influenceRadius = Math.max(
    1,
    Math.round(restoreSettlementGrowthNumber(settlement.influenceRadius, getSettlementInfluenceRadius(settlement)))
  );
  settlement.claimedTiles = Math.max(0, Math.round(restoreSettlementGrowthNumber(settlement.claimedTiles, 0)));
  settlement.claimedFood = Math.max(0, Math.round(restoreSettlementGrowthNumber(settlement.claimedFood, 0)));
}

function updateSettlementLevel(settlement) {
  settlement.level = getSettlementLevelForDevelopment(settlement.development);
  updateSettlementInfluence(settlement);
}

function countSettlementFoodStock(settlement) {
  var foodStock = 0;

  for (var i = 0; i < world.food.length; i++) {
    if (getDistanceToSettlement(settlement, world.food[i].x, world.food[i].y) <= settlement.radius) {
      foodStock++;
    }
  }

  return foodStock;
}

function countSettlementPopulation(settlement) {
  var population = 0;

  for (var i = 0; i < world.organisms.length; i++) {
    var organism = world.organisms[i];

    if (
      ensureOrganismLineage(organism) === settlement.lineageId &&
      getDistanceToSettlement(settlement, organism.x, organism.y) <= settlement.radius
    ) {
      population++;
    }
  }

  return population;
}

function updateSettlementMetrics(settlement) {
  normalizeSettlementGrowth(settlement);
  settlement.population = countSettlementPopulation(settlement);
  settlement.foodStock = countSettlementFoodStock(settlement);
  settlement.isActive = settlement.population > 0;
  updateSettlementLevel(settlement);
  updateSettlementInfluence(settlement);

  if (settlement.isActive) {
    settlement.lastActiveTick = world.tick;
  }
}

function harvestSettlementFood(settlement) {
  var harvestLimit = Math.max(0, Math.round(Number(CONFIG.SETTLEMENT_FOOD_HARVEST_PER_GROWTH) || 0));
  var harvestedFood = 0;

  for (var i = world.food.length - 1; i >= 0 && harvestedFood < harvestLimit; i--) {
    if (getDistanceToSettlement(settlement, world.food[i].x, world.food[i].y) <= settlement.radius) {
      world.food.splice(i, 1);
      harvestedFood++;
    }
  }

  settlement.storedFood += harvestedFood;
  settlement.foodStock = countSettlementFoodStock(settlement);
  return harvestedFood;
}

function runSettlementGrowth(settlement) {
  normalizeSettlementGrowth(settlement);

  if (!settlement.isActive) {
    return;
  }

  var growthInterval = Math.max(1, Math.round(Number(CONFIG.SETTLEMENT_GROWTH_INTERVAL) || 1));

  if (world.tick - settlement.lastGrowthTick < growthInterval) {
    return;
  }

  harvestSettlementFood(settlement);

  settlement.development +=
    settlement.population * CONFIG.SETTLEMENT_DEVELOPMENT_PER_POPULATION +
    settlement.storedFood * CONFIG.SETTLEMENT_DEVELOPMENT_PER_STORED_FOOD;
  settlement.lastGrowthTick = world.tick;
  updateSettlementLevel(settlement);
}

function makeSettlement(lineage, organisms) {
  var center = getLineageCenter(organisms);

  return {
    id: allocateSettlementId(),
    lineageId: lineage.id,
    x: center.x,
    y: center.y,
    foundedTick: world.tick,
    radius: CONFIG.SETTLEMENT_RADIUS,
    population: 0,
    foodStock: 0,
    storedFood: 0,
    development: 0,
    level: 1,
    lastGrowthTick: world.tick,
    influenceRadius: CONFIG.SETTLEMENT_INFLUENCE_BASE_RADIUS,
    claimedTiles: 0,
    claimedFood: 0,
    isActive: true,
    lastActiveTick: world.tick
  };
}

function canFoundSettlement(lineage) {
  return (
    lineage &&
    lineage.activeCount >= CONFIG.SETTLEMENT_MIN_LINEAGE_POPULATION &&
    lineage.peakPopulation >= CONFIG.SETTLEMENT_MIN_LINEAGE_PEAK_POPULATION &&
    !lineage.isExtinct &&
    !getSettlementForLineage(lineage.id)
  );
}

function foundSettlementForLineage(lineage) {
  var organisms = getOrganismsForLineage(lineage.id);

  if (organisms.length === 0) {
    return null;
  }

  var settlement = makeSettlement(lineage, organisms);
  updateSettlementMetrics(settlement);
  world.settlements.push(settlement);
  return settlement;
}

function updateSettlements() {
  ensureSettlementState();

  for (var i = 0; i < world.settlements.length; i++) {
    var settlement = world.settlements[i];
    updateSettlementMetrics(settlement);
    runSettlementGrowth(settlement);
  }

  var lineages = world.lineages || {};

  for (var lineageKey in lineages) {
    if (
      Object.prototype.hasOwnProperty.call(lineages, lineageKey) &&
      canFoundSettlement(lineages[lineageKey])
    ) {
      foundSettlementForLineage(lineages[lineageKey]);
    }
  }

  if (world.settlements.length > 0) {
    world.era = "Settlements";
  } else {
    world.era = "Organisms";
  }
}
