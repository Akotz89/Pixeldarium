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
  settlement.population = countSettlementPopulation(settlement);
  settlement.foodStock = countSettlementFoodStock(settlement);
  settlement.isActive = settlement.population > 0;

  if (settlement.isActive) {
    settlement.lastActiveTick = world.tick;
  }
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
    updateSettlementMetrics(world.settlements[i]);
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
