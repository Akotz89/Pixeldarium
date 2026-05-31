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
  settlement.isColony = Boolean(settlement.isColony);
  settlement.lastOutpostTick = Math.max(
    0,
    Math.round(restoreSettlementGrowthNumber(settlement.lastOutpostTick, settlement.foundedTick || 0))
  );
  settlement.lastSupplyGrowthTick = Math.max(
    0,
    Math.round(restoreSettlementGrowthNumber(settlement.lastSupplyGrowthTick, settlement.foundedTick || 0))
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

  if (settlement.isOutpost && settlement.level >= CONFIG.SETTLEMENT_COLONY_LEVEL) {
    settlement.isColony = true;
  }

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

function countActiveRoutesForSettlement(settlementId) {
  ensureSettlementState();

  var activeRouteCount = 0;

  for (var i = 0; i < world.settlementRoutes.length; i++) {
    if (
      world.settlementRoutes[i].isActive &&
      (
        world.settlementRoutes[i].parentSettlementId === settlementId ||
        world.settlementRoutes[i].childSettlementId === settlementId
      )
    ) {
      activeRouteCount++;
    }
  }

  return activeRouteCount;
}

function getColonyNetworkSummary() {
  ensureSettlementState();

  var colonies = 0;
  var activeColonies = 0;
  var activeColonyRoutes = 0;
  var colonyRouteFoodTransferred = 0;
  var colonyStoredFood = 0;
  var colonyDevelopment = 0;
  var colonyClaimedTiles = 0;

  for (var i = 0; i < world.settlements.length; i++) {
    var settlement = world.settlements[i];

    if (!settlement.isColony) {
      continue;
    }

    colonies++;
    colonyStoredFood += Math.max(0, Number(settlement.storedFood) || 0);
    colonyDevelopment += Math.max(0, Number(settlement.development) || 0);
    colonyClaimedTiles += Math.max(0, Number(settlement.claimedTiles) || 0);

    if (settlement.isActive) {
      activeColonies++;
    }
  }

  for (var routeIndex = 0; routeIndex < world.settlementRoutes.length; routeIndex++) {
    var route = world.settlementRoutes[routeIndex];

    if (!route.isActive) {
      continue;
    }

    var parentSettlement = getSettlementById(route.parentSettlementId);
    var childSettlement = getSettlementById(route.childSettlementId);

    if (!parentSettlement || !childSettlement || (!parentSettlement.isColony && !childSettlement.isColony)) {
      continue;
    }

    activeColonyRoutes++;
    colonyRouteFoodTransferred += Math.max(0, Number(route.foodTransferred) || 0);
  }

  var score =
    colonyDevelopment +
    colonyStoredFood * CONFIG.COLONY_NETWORK_STORED_FOOD_SCORE +
    activeColonyRoutes * CONFIG.COLONY_NETWORK_ROUTE_SCORE +
    colonyRouteFoodTransferred * CONFIG.COLONY_NETWORK_TRANSFERRED_FOOD_SCORE +
    colonyClaimedTiles * CONFIG.COLONY_NETWORK_CLAIMED_TILE_SCORE;

  return {
    colonies: colonies,
    activeColonies: activeColonies,
    activeRoutes: activeColonyRoutes,
    foodTransferred: Math.round(colonyRouteFoodTransferred),
    storedFood: Math.round(colonyStoredFood),
    development: colonyDevelopment,
    claimedTiles: Math.round(colonyClaimedTiles),
    score: Math.max(0, Math.round(score))
  };
}

function updateColonyNetworkState() {
  var summary = getColonyNetworkSummary();

  world.colonyNetworkScore = summary.score;
  world.colonyNetworkColonies = summary.colonies;
  world.colonyNetworkActiveRoutes = summary.activeRoutes;
  world.colonyNetworkClaimedTiles = summary.claimedTiles;

  if (summary.colonies > 0) {
    world.era = summary.score >= CONFIG.COLONY_NETWORK_ERA_SCORE && summary.activeRoutes > 0 ? "Networks" : "Colonies";
    return summary;
  }

  if (world.settlements.length > 0) {
    world.era = "Settlements";
    return summary;
  }

  world.era = "Organisms";
  return summary;
}

function getSpaceProgramInvestmentColonies(foodCost) {
  var colonies = [];

  for (var i = 0; i < world.settlements.length; i++) {
    var settlement = world.settlements[i];

    if (settlement.isColony && settlement.isActive && settlement.storedFood >= foodCost) {
      colonies.push(settlement);
    }
  }

  return colonies;
}

function updateSpaceProgramReadiness(networkSummary) {
  networkSummary = networkSummary || getColonyNetworkSummary();

  world.spaceProgramProgress = Math.max(0, restoreSettlementGrowthNumber(world.spaceProgramProgress, 0));
  world.orbitalLaunches = Math.max(0, Math.round(restoreSettlementGrowthNumber(world.orbitalLaunches, 0)));
  world.lastSpaceProgramTick = Math.max(0, Math.round(restoreSettlementGrowthNumber(world.lastSpaceProgramTick, 0)));

  var minScore = Math.max(0, Math.round(Number(CONFIG.SPACE_PROGRAM_MIN_NETWORK_SCORE) || 0));
  var minColonies = Math.max(0, Math.round(Number(CONFIG.SPACE_PROGRAM_MIN_COLONIES) || 0));
  var minRoutes = Math.max(0, Math.round(Number(CONFIG.SPACE_PROGRAM_MIN_ACTIVE_ROUTES) || 0));

  world.spaceProgramReady = Boolean(
    networkSummary.score >= minScore &&
    networkSummary.colonies >= minColonies &&
    networkSummary.activeRoutes >= minRoutes
  );

  if (world.orbitalLaunches > 0 && typeof updateOrbitalInfrastructureState === "function") {
    updateOrbitalInfrastructureState();
  } else if (world.orbitalLaunches > 0) {
    world.era = "Orbital";
  } else if (world.spaceProgramReady) {
    world.era = "Space Program";
  }

  return world.spaceProgramReady;
}

function updateSpaceProgramState(networkSummary) {
  var isReady = updateSpaceProgramReadiness(networkSummary);

  if (!isReady) {
    return;
  }

  var progressInterval = Math.max(1, Math.round(Number(CONFIG.SPACE_PROGRAM_PROGRESS_INTERVAL) || 1));
  var foodCost = Math.max(0, Math.round(Number(CONFIG.SPACE_PROGRAM_COLONY_FOOD_COST) || 0));
  var launchThreshold = Math.max(1, Number(CONFIG.SPACE_PROGRAM_LAUNCH_THRESHOLD) || 1);

  if (world.tick - world.lastSpaceProgramTick < progressInterval) {
    world.era = world.orbitalLaunches > 0 ? "Orbital" : "Space Program";
    return;
  }

  world.lastSpaceProgramTick = world.tick;

  var investmentColonies = getSpaceProgramInvestmentColonies(foodCost);

  if (investmentColonies.length === 0) {
    world.era = world.orbitalLaunches > 0 ? "Orbital" : "Space Program";
    return;
  }

  for (var i = 0; i < investmentColonies.length; i++) {
    investmentColonies[i].storedFood = Math.max(0, investmentColonies[i].storedFood - foodCost);
  }

  world.spaceProgramProgress +=
    networkSummary.score * CONFIG.SPACE_PROGRAM_PROGRESS_PER_NETWORK_SCORE +
    networkSummary.activeRoutes * CONFIG.SPACE_PROGRAM_PROGRESS_PER_ACTIVE_ROUTE +
    investmentColonies.length;

  if (world.spaceProgramProgress >= launchThreshold) {
    var launches = Math.floor(world.spaceProgramProgress / launchThreshold);
    world.orbitalLaunches += launches;
    world.spaceProgramProgress = world.spaceProgramProgress % launchThreshold;
  }

  world.era = world.orbitalLaunches > 0 ? "Orbital" : "Space Program";

  if (world.orbitalLaunches > 0) {
    updateOrbitalInfrastructureState();
  }
}

function ensureOrbitalState() {
  if (!Array.isArray(world.orbitalAssets)) {
    world.orbitalAssets = [];
  }

  if (typeof world.nextOrbitalAssetId !== "number" || world.nextOrbitalAssetId < 1) {
    world.nextOrbitalAssetId = 1;
  }

  world.orbitalInfrastructureScore = Math.max(0, Math.round(restoreSettlementGrowthNumber(world.orbitalInfrastructureScore, 0)));
  world.orbitalPlatformReady = Boolean(world.orbitalPlatformReady);
}

function allocateOrbitalAssetId() {
  ensureOrbitalState();

  var assetId = world.nextOrbitalAssetId;
  world.nextOrbitalAssetId++;
  return assetId;
}

function normalizeOrbitalAsset(asset) {
  asset.id = Math.max(1, Math.round(restoreSettlementGrowthNumber(asset.id, world.nextOrbitalAssetId)));
  asset.launchNumber = Math.max(1, Math.round(restoreSettlementGrowthNumber(asset.launchNumber, asset.id)));
  asset.launchedTick = Math.max(0, Math.round(restoreSettlementGrowthNumber(asset.launchedTick, world.tick)));
  asset.infrastructureScore = Math.max(0, Math.round(restoreSettlementGrowthNumber(asset.infrastructureScore, CONFIG.ORBITAL_ASSET_SCORE)));
  asset.orbitAngle = Math.max(0, Math.round(restoreSettlementGrowthNumber(asset.orbitAngle, asset.launchNumber * 137))) % 360;
  asset.orbitBand = Math.max(1, Math.round(restoreSettlementGrowthNumber(asset.orbitBand, ((asset.launchNumber - 1) % 3) + 1)));
  asset.isActive = asset.isActive !== false;

  if (asset.id >= world.nextOrbitalAssetId) {
    world.nextOrbitalAssetId = asset.id + 1;
  }
}

function makeOrbitalAsset(launchNumber) {
  var assetId = allocateOrbitalAssetId();

  return {
    id: assetId,
    launchNumber: Math.max(1, Math.round(launchNumber)),
    launchedTick: world.tick,
    infrastructureScore: Math.max(1, Math.round(Number(CONFIG.ORBITAL_ASSET_SCORE) || 1)),
    orbitAngle: (assetId * 137) % 360,
    orbitBand: ((assetId - 1) % 3) + 1,
    isActive: true
  };
}

function ensureOrbitalAssetsForLaunches() {
  ensureOrbitalState();

  for (var i = 0; i < world.orbitalAssets.length; i++) {
    normalizeOrbitalAsset(world.orbitalAssets[i]);
  }

  while (world.orbitalAssets.length < world.orbitalLaunches) {
    world.orbitalAssets.push(makeOrbitalAsset(world.orbitalAssets.length + 1));
  }
}

function updateOrbitalInfrastructureState() {
  ensureOrbitalAssetsForLaunches();

  var infrastructureScore = 0;
  var activeAssets = 0;

  for (var i = 0; i < world.orbitalAssets.length; i++) {
    var asset = world.orbitalAssets[i];

    if (!asset.isActive) {
      continue;
    }

    activeAssets++;
    infrastructureScore += Math.max(0, Number(asset.infrastructureScore) || 0);
  }

  world.orbitalInfrastructureScore = Math.round(infrastructureScore);
  world.orbitalPlatformReady = world.orbitalInfrastructureScore >= CONFIG.ORBITAL_PLATFORM_SCORE && activeAssets > 0;

  if (world.orbitalPlatformReady) {
    world.era = "Orbital Platform";
  } else if (world.orbitalLaunches > 0) {
    world.era = "Orbital";
  }

  updatePlanetarySurveyReadiness();
}

function ensurePlanetaryState() {
  if (!Array.isArray(world.planetaryBodies)) {
    world.planetaryBodies = [];
  }

  if (typeof world.nextPlanetaryBodyId !== "number" || world.nextPlanetaryBodyId < 1) {
    world.nextPlanetaryBodyId = 1;
  }

  world.planetarySurveyProgress = Math.max(0, restoreSettlementGrowthNumber(world.planetarySurveyProgress, 0));
  world.planetarySurveyReady = Boolean(world.planetarySurveyReady);
  world.lastPlanetarySurveyTick = Math.max(0, Math.round(restoreSettlementGrowthNumber(world.lastPlanetarySurveyTick, 0)));
}

function allocatePlanetaryBodyId() {
  ensurePlanetaryState();

  var bodyId = world.nextPlanetaryBodyId;
  world.nextPlanetaryBodyId++;
  return bodyId;
}

function getPlanetaryBodyName(bodyId) {
  return "P-" + String(100 + bodyId);
}

function normalizePlanetaryBody(body) {
  body.id = Math.max(1, Math.round(restoreSettlementGrowthNumber(body.id, world.nextPlanetaryBodyId)));
  body.name = String(body.name || getPlanetaryBodyName(body.id));
  body.discoveredTick = Math.max(0, Math.round(restoreSettlementGrowthNumber(body.discoveredTick, world.tick)));
  body.surveyValue = Math.max(1, Math.round(restoreSettlementGrowthNumber(body.surveyValue, 20 + body.id * 7)));
  body.orbitAngle = Math.max(0, Math.round(restoreSettlementGrowthNumber(body.orbitAngle, body.id * 67))) % 360;
  body.orbitRadius = Math.max(1, Math.round(restoreSettlementGrowthNumber(body.orbitRadius, 64 + body.id * 10)));
  body.isSurveyed = body.isSurveyed !== false;

  if (body.id >= world.nextPlanetaryBodyId) {
    world.nextPlanetaryBodyId = body.id + 1;
  }
}

function makePlanetaryBody() {
  var bodyId = allocatePlanetaryBodyId();

  return {
    id: bodyId,
    name: getPlanetaryBodyName(bodyId),
    discoveredTick: world.tick,
    surveyValue: 20 + bodyId * 7,
    orbitAngle: (bodyId * 67) % 360,
    orbitRadius: 64 + bodyId * 10,
    isSurveyed: true
  };
}

function normalizePlanetaryBodies() {
  ensurePlanetaryState();

  for (var i = 0; i < world.planetaryBodies.length; i++) {
    normalizePlanetaryBody(world.planetaryBodies[i]);
  }
}

function getDiscoveredPlanetaryBodyCount() {
  normalizePlanetaryBodies();

  var discoveredBodies = 0;

  for (var i = 0; i < world.planetaryBodies.length; i++) {
    if (world.planetaryBodies[i].isSurveyed) {
      discoveredBodies++;
    }
  }

  return discoveredBodies;
}

function updatePlanetarySurveyEra() {
  var discoveredBodies = getDiscoveredPlanetaryBodyCount();

  if (discoveredBodies >= CONFIG.INTERPLANETARY_BODY_COUNT) {
    world.era = "Interplanetary";
  } else if (discoveredBodies > 0) {
    world.era = "Planetary Survey";
  } else if (world.orbitalPlatformReady) {
    world.era = "Orbital Platform";
  }
}

function updatePlanetarySurveyReadiness() {
  ensurePlanetaryState();

  world.planetarySurveyReady = Boolean(
    world.orbitalPlatformReady &&
    world.orbitalInfrastructureScore >= CONFIG.PLANETARY_SURVEY_MIN_INFRASTRUCTURE &&
    world.planetaryBodies.length < CONFIG.PLANETARY_SURVEY_MAX_BODIES
  );

  updatePlanetarySurveyEra();
  return world.planetarySurveyReady;
}

function updatePlanetarySurveyState() {
  if (!updatePlanetarySurveyReadiness()) {
    return;
  }

  var surveyInterval = Math.max(1, Math.round(Number(CONFIG.PLANETARY_SURVEY_INTERVAL) || 1));

  if (world.tick - world.lastPlanetarySurveyTick < surveyInterval) {
    return;
  }

  world.lastPlanetarySurveyTick = world.tick;
  world.planetarySurveyProgress +=
    world.orbitalInfrastructureScore * CONFIG.PLANETARY_SURVEY_PROGRESS_PER_INFRASTRUCTURE +
    world.orbitalAssets.length * CONFIG.PLANETARY_SURVEY_PROGRESS_PER_ORBITAL_ASSET;

  var discoveryThreshold = Math.max(1, Number(CONFIG.PLANETARY_DISCOVERY_THRESHOLD) || 1);

  while (
    world.planetarySurveyProgress >= discoveryThreshold &&
    world.planetaryBodies.length < CONFIG.PLANETARY_SURVEY_MAX_BODIES
  ) {
    world.planetaryBodies.push(makePlanetaryBody());
    world.planetarySurveyProgress -= discoveryThreshold;
  }

  updatePlanetarySurveyReadiness();
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
    isColony: Boolean(options.isColony),
    lastOutpostTick: world.tick,
    lastSupplyGrowthTick: world.tick,
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

function runSuppliedOutpostGrowth(settlement) {
  normalizeSettlementGrowth(settlement);

  if (!settlement.isOutpost || countActiveRoutesForSettlement(settlement.id) === 0) {
    return;
  }

  var supplyGrowthInterval = Math.max(1, Math.round(Number(CONFIG.SETTLEMENT_SUPPLY_GROWTH_INTERVAL) || 1));

  if (world.tick - settlement.lastSupplyGrowthTick < supplyGrowthInterval) {
    return;
  }

  var foodCost = Math.max(0, Math.round(Number(CONFIG.SETTLEMENT_SUPPLY_GROWTH_FOOD_COST) || 0));

  settlement.lastSupplyGrowthTick = world.tick;

  if (foodCost <= 0 || settlement.storedFood < foodCost) {
    return;
  }

  settlement.storedFood -= foodCost;
  settlement.development += foodCost * CONFIG.SETTLEMENT_DEVELOPMENT_PER_SUPPLIED_FOOD;
  updateSettlementLevel(settlement);
}

function updateSuppliedOutpostGrowth() {
  for (var i = 0; i < world.settlements.length; i++) {
    runSuppliedOutpostGrowth(world.settlements[i]);
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
  updateSuppliedOutpostGrowth();

  var lineages = world.lineages || {};

  for (var lineageKey in lineages) {
    if (
      Object.prototype.hasOwnProperty.call(lineages, lineageKey) &&
      canFoundSettlement(lineages[lineageKey])
    ) {
      foundSettlementForLineage(lineages[lineageKey]);
    }
  }

  var networkSummary = updateColonyNetworkState();
  updateSpaceProgramState(networkSummary);
  updatePlanetarySurveyState();
}
