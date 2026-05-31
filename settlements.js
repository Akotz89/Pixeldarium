function ensureSettlementState() {
  if (!Array.isArray(world.settlements)) {
    world.settlements = [];
  }

  if (typeof world.nextSettlementId !== "number" || world.nextSettlementId < 1) {
    world.nextSettlementId = 1;
  }

  if (!Array.isArray(world.settlementRoutes)) {
    world.settlementRoutes = [];
  }

  if (typeof world.nextSettlementRouteId !== "number" || world.nextSettlementRouteId < 1) {
    world.nextSettlementRouteId = 1;
  }
}

function allocateSettlementId() {
  ensureSettlementState();

  var settlementId = world.nextSettlementId;
  world.nextSettlementId++;
  return settlementId;
}

function allocateSettlementRouteId() {
  ensureSettlementState();

  var routeId = world.nextSettlementRouteId;
  world.nextSettlementRouteId++;
  return routeId;
}

function getSettlementById(settlementId) {
  ensureSettlementState();

  for (var i = 0; i < world.settlements.length; i++) {
    if (world.settlements[i].id === settlementId) {
      return world.settlements[i];
    }
  }

  return null;
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

function getRootSettlementForLineage(lineageId) {
  ensureSettlementState();

  for (var i = 0; i < world.settlements.length; i++) {
    if (world.settlements[i].lineageId === lineageId && !world.settlements[i].isOutpost) {
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

function getDistanceBetweenSettlements(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
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
  settlement.parentSettlementId = Math.max(0, Math.round(restoreSettlementGrowthNumber(settlement.parentSettlementId, 0)));
  settlement.isOutpost = Boolean(settlement.isOutpost);
  settlement.lastOutpostTick = Math.max(
    0,
    Math.round(restoreSettlementGrowthNumber(settlement.lastOutpostTick, settlement.foundedTick || 0))
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

function countChildOutposts(settlement) {
  var childOutposts = 0;

  for (var i = 0; i < world.settlements.length; i++) {
    if (world.settlements[i].parentSettlementId === settlement.id) {
      childOutposts++;
    }
  }

  return childOutposts;
}

function countRoutesForSettlement(settlementId) {
  ensureSettlementState();

  var routeCount = 0;

  for (var i = 0; i < world.settlementRoutes.length; i++) {
    if (
      world.settlementRoutes[i].parentSettlementId === settlementId ||
      world.settlementRoutes[i].childSettlementId === settlementId
    ) {
      routeCount++;
    }
  }

  return routeCount;
}

function makeSettlement(lineage, organisms) {
  var center = getLineageCenter(organisms);
  return makeSettlementAt(lineage.id, center.x, center.y, {
    parentSettlementId: 0,
    isOutpost: false
  });
}

function makeSettlementAt(lineageId, x, y, options) {
  options = options || {};
  return {
    id: allocateSettlementId(),
    lineageId: lineageId,
    x: clamp(Math.round(x), 0, WORLD_WIDTH - 1),
    y: clamp(Math.round(y), 0, WORLD_HEIGHT - 1),
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
    parentSettlementId: Math.max(0, Math.round(options.parentSettlementId || 0)),
    isOutpost: Boolean(options.isOutpost),
    lastOutpostTick: world.tick,
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
    !getRootSettlementForLineage(lineage.id)
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

function getDistanceToNearestSettlement(x, y) {
  var nearestDistance = Infinity;

  for (var i = 0; i < world.settlements.length; i++) {
    var settlement = world.settlements[i];
    var distance = Math.abs(settlement.x - x) + Math.abs(settlement.y - y);

    if (distance < nearestDistance) {
      nearestDistance = distance;
    }
  }

  return nearestDistance;
}

function countFoodNearTile(x, y, radius) {
  var foodCount = 0;

  for (var i = 0; i < world.food.length; i++) {
    if (Math.abs(world.food[i].x - x) + Math.abs(world.food[i].y - y) <= radius) {
      foodCount++;
    }
  }

  return foodCount;
}

function getOutpostPlacement(parentSettlement) {
  var searchRadius = Math.max(1, Math.round(Number(CONFIG.SETTLEMENT_OUTPOST_SEARCH_RADIUS) || 1));
  var minDistance = Math.max(1, Math.round(Number(CONFIG.SETTLEMENT_OUTPOST_MIN_DISTANCE) || 1));
  var bestCandidate = null;
  var bestScore = -Infinity;

  for (var distance = minDistance; distance <= searchRadius; distance++) {
    for (var dy = -distance; dy <= distance; dy++) {
      var dxMagnitude = distance - Math.abs(dy);
      var dxValues = dxMagnitude === 0 ? [0] : [-dxMagnitude, dxMagnitude];

      for (var dxIndex = 0; dxIndex < dxValues.length; dxIndex++) {
        var candidateX = clamp(parentSettlement.x + dxValues[dxIndex], 0, WORLD_WIDTH - 1);
        var candidateY = clamp(parentSettlement.y + dy, 0, WORLD_HEIGHT - 1);

        if (getDistanceToNearestSettlement(candidateX, candidateY) < minDistance) {
          continue;
        }

        var score =
          countFoodNearTile(candidateX, candidateY, CONFIG.SETTLEMENT_RADIUS) * 4 +
          (isFertile(candidateX, candidateY) ? 2 : 0) -
          Math.abs(parentSettlement.x - candidateX) * 0.01 -
          Math.abs(parentSettlement.y - candidateY) * 0.01;

        if (score > bestScore) {
          bestScore = score;
          bestCandidate = {
            x: candidateX,
            y: candidateY
          };
        }
      }
    }
  }

  return bestCandidate;
}

function canFoundOutpost(settlement) {
  return (
    settlement &&
    settlement.isActive &&
    settlement.level >= CONFIG.SETTLEMENT_OUTPOST_MIN_LEVEL &&
    settlement.storedFood >= CONFIG.SETTLEMENT_OUTPOST_MIN_STORED_FOOD &&
    settlement.development >= CONFIG.SETTLEMENT_OUTPOST_MIN_DEVELOPMENT &&
    world.tick - settlement.lastOutpostTick >= CONFIG.SETTLEMENT_OUTPOST_COOLDOWN &&
    countChildOutposts(settlement) < CONFIG.SETTLEMENT_OUTPOST_MAX_CHILDREN
  );
}

function foundOutpostFromSettlement(parentSettlement) {
  if (!canFoundOutpost(parentSettlement)) {
    return null;
  }

  var placement = getOutpostPlacement(parentSettlement);

  if (!placement) {
    return null;
  }

  parentSettlement.storedFood = Math.max(0, parentSettlement.storedFood - CONFIG.SETTLEMENT_OUTPOST_FOOD_COST);
  parentSettlement.development = Math.max(0, parentSettlement.development - CONFIG.SETTLEMENT_OUTPOST_DEVELOPMENT_COST);
  parentSettlement.lastOutpostTick = world.tick;
  updateSettlementLevel(parentSettlement);

  var outpost = makeSettlementAt(parentSettlement.lineageId, placement.x, placement.y, {
    parentSettlementId: parentSettlement.id,
    isOutpost: true
  });
  updateSettlementMetrics(outpost);
  world.settlements.push(outpost);
  return outpost;
}

function updateSettlementOutposts() {
  var settlementCount = world.settlements.length;

  for (var i = 0; i < settlementCount; i++) {
    foundOutpostFromSettlement(world.settlements[i]);
  }
}

function getSettlementRoute(parentSettlementId, childSettlementId) {
  ensureSettlementState();

  for (var i = 0; i < world.settlementRoutes.length; i++) {
    var route = world.settlementRoutes[i];

    if (route.parentSettlementId === parentSettlementId && route.childSettlementId === childSettlementId) {
      return route;
    }
  }

  return null;
}

function makeSettlementRoute(parentSettlement, childSettlement) {
  return {
    id: allocateSettlementRouteId(),
    parentSettlementId: parentSettlement.id,
    childSettlementId: childSettlement.id,
    lineageId: parentSettlement.lineageId,
    foundedTick: world.tick,
    distance: getDistanceBetweenSettlements(parentSettlement, childSettlement),
    foodTransferred: 0,
    lastTransferTick: world.tick,
    isActive: true
  };
}

function ensureSettlementRoute(parentSettlement, childSettlement) {
  var route = getSettlementRoute(parentSettlement.id, childSettlement.id);

  if (!route) {
    route = makeSettlementRoute(parentSettlement, childSettlement);
    world.settlementRoutes.push(route);
  }

  return route;
}

function normalizeSettlementRoute(route) {
  route.parentSettlementId = Math.max(1, Math.round(restoreSettlementGrowthNumber(route.parentSettlementId, 1)));
  route.childSettlementId = Math.max(1, Math.round(restoreSettlementGrowthNumber(route.childSettlementId, 1)));
  route.lineageId = Math.max(1, Math.round(restoreSettlementGrowthNumber(route.lineageId, 1)));
  route.foundedTick = Math.max(0, Math.round(restoreSettlementGrowthNumber(route.foundedTick, 0)));
  route.distance = Math.max(0, Math.round(restoreSettlementGrowthNumber(route.distance, 0)));
  route.foodTransferred = Math.max(0, Math.round(restoreSettlementGrowthNumber(route.foodTransferred, 0)));
  route.lastTransferTick = Math.max(0, Math.round(restoreSettlementGrowthNumber(route.lastTransferTick, route.foundedTick)));
  route.isActive = Boolean(route.isActive);
}

function transferSettlementRouteFood(route, parentSettlement, childSettlement) {
  var transferInterval = Math.max(1, Math.round(Number(CONFIG.SETTLEMENT_ROUTE_TRANSFER_INTERVAL) || 1));

  if (world.tick - route.lastTransferTick < transferInterval) {
    return 0;
  }

  var minStoredFood = Math.max(0, Math.round(Number(CONFIG.SETTLEMENT_ROUTE_MIN_PARENT_STORED_FOOD) || 0));
  var transferLimit = Math.max(0, Math.round(Number(CONFIG.SETTLEMENT_ROUTE_FOOD_TRANSFER) || 0));
  var transferableFood = Math.max(0, parentSettlement.storedFood - minStoredFood);
  var transferAmount = Math.min(transferLimit, transferableFood);

  route.lastTransferTick = world.tick;

  if (transferAmount <= 0) {
    return 0;
  }

  parentSettlement.storedFood -= transferAmount;
  childSettlement.storedFood += transferAmount;
  route.foodTransferred += transferAmount;
  return transferAmount;
}

function updateSettlementRoute(route) {
  normalizeSettlementRoute(route);

  var parentSettlement = getSettlementById(route.parentSettlementId);
  var childSettlement = getSettlementById(route.childSettlementId);

  route.isActive = Boolean(parentSettlement && childSettlement);

  if (!route.isActive) {
    return;
  }

  route.lineageId = parentSettlement.lineageId;
  route.distance = getDistanceBetweenSettlements(parentSettlement, childSettlement);
  transferSettlementRouteFood(route, parentSettlement, childSettlement);
}

function ensureOutpostRoutes() {
  ensureSettlementState();

  for (var i = 0; i < world.settlements.length; i++) {
    var settlement = world.settlements[i];

    if (!settlement.isOutpost || settlement.parentSettlementId <= 0) {
      continue;
    }

    var parentSettlement = getSettlementById(settlement.parentSettlementId);

    if (parentSettlement) {
      ensureSettlementRoute(parentSettlement, settlement);
    }
  }
}

function updateSettlementRoutes() {
  ensureOutpostRoutes();

  for (var i = 0; i < world.settlementRoutes.length; i++) {
    updateSettlementRoute(world.settlementRoutes[i]);
  }
}

function updateSettlements() {
  ensureSettlementState();

  for (var i = 0; i < world.settlements.length; i++) {
    var settlement = world.settlements[i];
    updateSettlementMetrics(settlement);
    runSettlementGrowth(settlement);
  }

  updateSettlementOutposts();
  updateSettlementRoutes();

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
