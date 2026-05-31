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
  return countFoodInRadius(settlement.x, settlement.y, settlement.radius);
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
  var harvestedFood = removeFoodInRadius(settlement.x, settlement.y, settlement.radius, harvestLimit);

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

  if (getCompletedProbeMissionCount() >= CONFIG.STELLAR_CARTOGRAPHY_MISSION_COUNT) {
    world.era = "Stellar Cartography";
  } else if (discoveredBodies >= CONFIG.INTERPLANETARY_BODY_COUNT) {
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

function ensureProbeMissionState() {
  if (!Array.isArray(world.probeMissions)) {
    world.probeMissions = [];
  }

  if (typeof world.nextProbeMissionId !== "number" || world.nextProbeMissionId < 1) {
    world.nextProbeMissionId = 1;
  }

  world.probeMissionProgress = Math.max(0, restoreSettlementGrowthNumber(world.probeMissionProgress, 0));
  world.probeMissionReady = Boolean(world.probeMissionReady);
  world.lastProbeMissionTick = Math.max(0, Math.round(restoreSettlementGrowthNumber(world.lastProbeMissionTick, 0)));
}

function allocateProbeMissionId() {
  ensureProbeMissionState();

  var missionId = world.nextProbeMissionId;
  world.nextProbeMissionId++;
  return missionId;
}

function getPlanetaryBodyById(bodyId) {
  normalizePlanetaryBodies();

  for (var i = 0; i < world.planetaryBodies.length; i++) {
    if (world.planetaryBodies[i].id === bodyId) {
      return world.planetaryBodies[i];
    }
  }

  return null;
}

function getProbeMissionTargetBodyId() {
  normalizePlanetaryBodies();

  if (world.planetaryBodies.length === 0) {
    return 0;
  }

  var targetIndex = world.probeMissions.length % world.planetaryBodies.length;
  return world.planetaryBodies[targetIndex].id;
}

function normalizeProbeMission(mission) {
  mission.id = Math.max(1, Math.round(restoreSettlementGrowthNumber(mission.id, world.nextProbeMissionId)));
  mission.targetBodyId = Math.max(0, Math.round(restoreSettlementGrowthNumber(mission.targetBodyId, 0)));
  mission.launchedTick = Math.max(0, Math.round(restoreSettlementGrowthNumber(mission.launchedTick, world.tick)));
  mission.arrivalTick = Math.max(mission.launchedTick, Math.round(restoreSettlementGrowthNumber(mission.arrivalTick, mission.launchedTick)));
  mission.progress = Math.max(0, Math.min(1, restoreSettlementGrowthNumber(mission.progress, 0)));
  mission.isComplete = Boolean(mission.isComplete);

  if (mission.id >= world.nextProbeMissionId) {
    world.nextProbeMissionId = mission.id + 1;
  }
}

function makeProbeMission() {
  var missionId = allocateProbeMissionId();
  var targetBodyId = getProbeMissionTargetBodyId();
  var travelTicks = Math.max(1, Math.round(Number(CONFIG.PROBE_MISSION_COMPLETE_TICKS) || 1));

  return {
    id: missionId,
    targetBodyId: targetBodyId,
    launchedTick: world.tick,
    arrivalTick: world.tick + travelTicks,
    progress: 0,
    isComplete: false
  };
}

function normalizeProbeMissions() {
  ensureProbeMissionState();

  for (var i = 0; i < world.probeMissions.length; i++) {
    normalizeProbeMission(world.probeMissions[i]);
  }
}

function getCompletedProbeMissionCount() {
  normalizeProbeMissions();

  var completedMissions = 0;

  for (var i = 0; i < world.probeMissions.length; i++) {
    if (world.probeMissions[i].isComplete) {
      completedMissions++;
    }
  }

  return completedMissions;
}

function updateProbeMissionTravel() {
  normalizeProbeMissions();

  for (var i = 0; i < world.probeMissions.length; i++) {
    var mission = world.probeMissions[i];

    if (mission.isComplete) {
      mission.progress = 1;
      continue;
    }

    var travelTicks = Math.max(1, mission.arrivalTick - mission.launchedTick);
    mission.progress = Math.max(0, Math.min(1, (world.tick - mission.launchedTick) / travelTicks));

    if (world.tick >= mission.arrivalTick) {
      mission.progress = 1;
      mission.isComplete = true;
    }
  }
}

function updateProbeMissionEra() {
  if (getEmpireLegacyLevel() >= CONFIG.ASCENDANT_EMPIRE_LEGACY_LEVEL) {
    world.era = "Ascendant Empire";
  } else if (getEmpireSectorCount() >= CONFIG.GALACTIC_EMPIRE_SECTOR_COUNT) {
    world.era = "Galactic Empire";
  } else if (getEmpireSectorCount() > 0) {
    world.era = "Empire Sectors";
  } else if (getCompletedInterstellarFleetCount() >= CONFIG.EMPIRE_NETWORK_COMPLETED_FLEETS) {
    world.era = "Empire Network";
  } else if (getInterstellarFleetCount() > 0) {
    world.era = "Interstellar Fleets";
  } else if (getClaimedStarSystemCount() >= CONFIG.PROTO_EMPIRE_SYSTEM_COUNT) {
    world.era = "Proto-Empire";
  } else if (getClaimedStarSystemCount() > 0) {
    world.era = "Galactic Influence";
  } else if (getDiscoveredStarSystemCount() >= CONFIG.GALACTIC_MAP_SYSTEM_COUNT) {
    world.era = "Galactic Map";
  } else if (getCompletedProbeMissionCount() >= CONFIG.STELLAR_CARTOGRAPHY_MISSION_COUNT) {
    world.era = "Stellar Cartography";
  } else if (world.probeMissions.length > 0) {
    world.era = "Interplanetary Missions";
  } else {
    updatePlanetarySurveyEra();
  }
}

function updateProbeMissionReadiness() {
  ensureProbeMissionState();
  updateProbeMissionTravel();

  world.probeMissionReady = Boolean(
    getDiscoveredPlanetaryBodyCount() >= CONFIG.PROBE_MISSION_MIN_BODIES &&
    world.orbitalPlatformReady
  );

  updateProbeMissionEra();
  return world.probeMissionReady;
}

function updateProbeMissionState() {
  if (!updateProbeMissionReadiness()) {
    return;
  }

  var missionInterval = Math.max(1, Math.round(Number(CONFIG.PROBE_MISSION_INTERVAL) || 1));

  if (world.tick - world.lastProbeMissionTick < missionInterval) {
    return;
  }

  world.lastProbeMissionTick = world.tick;
  world.probeMissionProgress +=
    getDiscoveredPlanetaryBodyCount() * CONFIG.PROBE_MISSION_PROGRESS_PER_BODY +
    world.orbitalInfrastructureScore * CONFIG.PROBE_MISSION_PROGRESS_PER_INFRASTRUCTURE;

  var missionThreshold = Math.max(1, Number(CONFIG.PROBE_MISSION_THRESHOLD) || 1);

  while (world.probeMissionProgress >= missionThreshold) {
    world.probeMissions.push(makeProbeMission());
    world.probeMissionProgress -= missionThreshold;
  }

  updateProbeMissionReadiness();
}

function ensureStarMapState() {
  if (!Array.isArray(world.starSystems)) {
    world.starSystems = [];
  }

  if (typeof world.nextStarSystemId !== "number" || world.nextStarSystemId < 1) {
    world.nextStarSystemId = 1;
  }

  world.starMapProgress = Math.max(0, restoreSettlementGrowthNumber(world.starMapProgress, 0));
  world.starMapReady = Boolean(world.starMapReady);
  world.lastStarMapTick = Math.max(0, Math.round(restoreSettlementGrowthNumber(world.lastStarMapTick, 0)));
}

function allocateStarSystemId() {
  ensureStarMapState();

  var systemId = world.nextStarSystemId;
  world.nextStarSystemId++;
  return systemId;
}

function getStarSystemName(systemId) {
  return "S-" + String(200 + systemId);
}

function normalizeStarSystem(system) {
  system.id = Math.max(1, Math.round(restoreSettlementGrowthNumber(system.id, world.nextStarSystemId)));
  system.name = String(system.name || getStarSystemName(system.id));
  system.discoveredTick = Math.max(0, Math.round(restoreSettlementGrowthNumber(system.discoveredTick, world.tick)));
  system.mapValue = Math.max(1, Math.round(restoreSettlementGrowthNumber(system.mapValue, 40 + system.id * 11)));
  system.mapX = Math.max(-1, Math.min(1, restoreSettlementGrowthNumber(system.mapX, Math.cos(system.id * 2.1))));
  system.mapY = Math.max(-1, Math.min(1, restoreSettlementGrowthNumber(system.mapY, Math.sin(system.id * 2.1))));
  system.isMapped = system.isMapped !== false;
  system.influenceValue = Math.max(1, Math.round(restoreSettlementGrowthNumber(system.influenceValue, system.mapValue)));
  system.isClaimed = Boolean(system.isClaimed);
  system.claimedTick = Math.max(0, Math.round(restoreSettlementGrowthNumber(system.claimedTick, 0)));

  if (system.id >= world.nextStarSystemId) {
    world.nextStarSystemId = system.id + 1;
  }
}

function makeStarSystem() {
  var systemId = allocateStarSystemId();
  var angle = systemId * 2.1;
  var distance = 0.34 + (systemId % 4) * 0.16;

  return {
    id: systemId,
    name: getStarSystemName(systemId),
    discoveredTick: world.tick,
    mapValue: 40 + systemId * 11,
    mapX: Math.cos(angle) * distance,
    mapY: Math.sin(angle) * distance,
    isMapped: true,
    influenceValue: 40 + systemId * 11,
    isClaimed: false,
    claimedTick: 0
  };
}

function normalizeStarSystems() {
  ensureStarMapState();

  for (var i = 0; i < world.starSystems.length; i++) {
    normalizeStarSystem(world.starSystems[i]);
  }
}

function getDiscoveredStarSystemCount() {
  normalizeStarSystems();

  var discoveredSystems = 0;

  for (var i = 0; i < world.starSystems.length; i++) {
    if (world.starSystems[i].isMapped) {
      discoveredSystems++;
    }
  }

  return discoveredSystems;
}

function getMappedStarSystemValue() {
  normalizeStarSystems();

  var mapValue = 0;

  for (var i = 0; i < world.starSystems.length; i++) {
    if (world.starSystems[i].isMapped) {
      mapValue += Math.max(0, Number(world.starSystems[i].mapValue) || 0);
    }
  }

  return mapValue;
}

function getClaimedStarSystemCount() {
  normalizeStarSystems();

  var claimedSystems = 0;

  for (var i = 0; i < world.starSystems.length; i++) {
    if (world.starSystems[i].isMapped && world.starSystems[i].isClaimed) {
      claimedSystems++;
    }
  }

  return claimedSystems;
}

function updateStarMapEra() {
  if (getEmpireLegacyLevel() >= CONFIG.ASCENDANT_EMPIRE_LEGACY_LEVEL) {
    world.era = "Ascendant Empire";
  } else if (getEmpireSectorCount() >= CONFIG.GALACTIC_EMPIRE_SECTOR_COUNT) {
    world.era = "Galactic Empire";
  } else if (getEmpireSectorCount() > 0) {
    world.era = "Empire Sectors";
  } else if (getCompletedInterstellarFleetCount() >= CONFIG.EMPIRE_NETWORK_COMPLETED_FLEETS) {
    world.era = "Empire Network";
  } else if (getInterstellarFleetCount() > 0) {
    world.era = "Interstellar Fleets";
  } else if (getClaimedStarSystemCount() >= CONFIG.PROTO_EMPIRE_SYSTEM_COUNT) {
    world.era = "Proto-Empire";
  } else if (getClaimedStarSystemCount() > 0) {
    world.era = "Galactic Influence";
  } else if (getDiscoveredStarSystemCount() >= CONFIG.GALACTIC_MAP_SYSTEM_COUNT) {
    world.era = "Galactic Map";
  } else if (getCompletedProbeMissionCount() >= CONFIG.STELLAR_CARTOGRAPHY_MISSION_COUNT) {
    world.era = "Stellar Cartography";
  }
}

function updateStarMapReadiness() {
  ensureStarMapState();

  world.starMapReady = Boolean(
    getCompletedProbeMissionCount() >= CONFIG.STAR_MAP_MIN_COMPLETED_PROBES &&
    world.starSystems.length < CONFIG.STAR_MAP_MAX_SYSTEMS
  );

  updateStarMapEra();
  return world.starMapReady;
}

function updateStarMapState() {
  if (!updateStarMapReadiness()) {
    return;
  }

  var mapInterval = Math.max(1, Math.round(Number(CONFIG.STAR_MAP_INTERVAL) || 1));

  if (world.tick - world.lastStarMapTick < mapInterval) {
    return;
  }

  world.lastStarMapTick = world.tick;
  world.starMapProgress +=
    getCompletedProbeMissionCount() * CONFIG.STAR_MAP_PROGRESS_PER_COMPLETED_PROBE +
    world.orbitalInfrastructureScore * CONFIG.STAR_MAP_PROGRESS_PER_INFRASTRUCTURE;

  var discoveryThreshold = Math.max(1, Number(CONFIG.STAR_SYSTEM_DISCOVERY_THRESHOLD) || 1);

  while (
    world.starMapProgress >= discoveryThreshold &&
    world.starSystems.length < CONFIG.STAR_MAP_MAX_SYSTEMS
  ) {
    world.starSystems.push(makeStarSystem());
    world.starMapProgress -= discoveryThreshold;
  }

  updateStarMapReadiness();
}

function ensureGalacticInfluenceState() {
  normalizeStarSystems();

  world.galacticInfluenceProgress = Math.max(0, restoreSettlementGrowthNumber(world.galacticInfluenceProgress, 0));
  world.galacticInfluenceReady = Boolean(world.galacticInfluenceReady);
  world.galacticClaimedSystems = Math.max(0, Math.round(restoreSettlementGrowthNumber(world.galacticClaimedSystems, 0)));
  world.lastGalacticInfluenceTick = Math.max(0, Math.round(restoreSettlementGrowthNumber(world.lastGalacticInfluenceTick, 0)));
}

function getNextClaimableStarSystem() {
  normalizeStarSystems();

  var claimableSystem = null;

  for (var i = 0; i < world.starSystems.length; i++) {
    var system = world.starSystems[i];

    if (!system.isMapped || system.isClaimed) {
      continue;
    }

    if (
      !claimableSystem ||
      system.influenceValue > claimableSystem.influenceValue ||
      (system.influenceValue === claimableSystem.influenceValue && system.id < claimableSystem.id)
    ) {
      claimableSystem = system;
    }
  }

  return claimableSystem;
}

function updateGalacticInfluenceEra() {
  world.galacticClaimedSystems = getClaimedStarSystemCount();

  if (getEmpireLegacyLevel() >= CONFIG.ASCENDANT_EMPIRE_LEGACY_LEVEL) {
    world.era = "Ascendant Empire";
  } else if (getEmpireSectorCount() >= CONFIG.GALACTIC_EMPIRE_SECTOR_COUNT) {
    world.era = "Galactic Empire";
  } else if (getEmpireSectorCount() > 0) {
    world.era = "Empire Sectors";
  } else if (getCompletedInterstellarFleetCount() >= CONFIG.EMPIRE_NETWORK_COMPLETED_FLEETS) {
    world.era = "Empire Network";
  } else if (getInterstellarFleetCount() > 0) {
    world.era = "Interstellar Fleets";
  } else if (world.galacticClaimedSystems >= CONFIG.PROTO_EMPIRE_SYSTEM_COUNT) {
    world.era = "Proto-Empire";
  } else if (world.galacticClaimedSystems > 0) {
    world.era = "Galactic Influence";
  } else {
    updateStarMapEra();
  }
}

function updateGalacticInfluenceReadiness() {
  ensureGalacticInfluenceState();

  world.galacticClaimedSystems = getClaimedStarSystemCount();
  world.galacticInfluenceReady = Boolean(
    getDiscoveredStarSystemCount() >= CONFIG.GALACTIC_INFLUENCE_MIN_SYSTEMS &&
    getNextClaimableStarSystem()
  );

  updateGalacticInfluenceEra();
  return world.galacticInfluenceReady;
}

function claimNextStarSystem() {
  var system = getNextClaimableStarSystem();

  if (!system) {
    return null;
  }

  system.isClaimed = true;
  system.claimedTick = world.tick;
  world.galacticClaimedSystems = getClaimedStarSystemCount();
  return system;
}

function updateGalacticInfluenceState() {
  if (!updateGalacticInfluenceReadiness()) {
    return;
  }

  var influenceInterval = Math.max(1, Math.round(Number(CONFIG.GALACTIC_INFLUENCE_INTERVAL) || 1));

  if (world.tick - world.lastGalacticInfluenceTick < influenceInterval) {
    return;
  }

  world.lastGalacticInfluenceTick = world.tick;
  world.galacticInfluenceProgress +=
    getMappedStarSystemValue() * CONFIG.GALACTIC_INFLUENCE_PROGRESS_PER_MAP_VALUE +
    getCompletedProbeMissionCount() * CONFIG.GALACTIC_INFLUENCE_PROGRESS_PER_COMPLETED_PROBE +
    world.orbitalInfrastructureScore * CONFIG.GALACTIC_INFLUENCE_PROGRESS_PER_INFRASTRUCTURE;

  var claimThreshold = Math.max(1, Number(CONFIG.GALACTIC_SYSTEM_CLAIM_THRESHOLD) || 1);

  while (world.galacticInfluenceProgress >= claimThreshold && getNextClaimableStarSystem()) {
    claimNextStarSystem();
    world.galacticInfluenceProgress -= claimThreshold;
  }

  updateGalacticInfluenceReadiness();
}

function ensureInterstellarFleetState() {
  if (!Array.isArray(world.interstellarFleets)) {
    world.interstellarFleets = [];
  }

  if (typeof world.nextInterstellarFleetId !== "number" || world.nextInterstellarFleetId < 1) {
    world.nextInterstellarFleetId = 1;
  }

  world.interstellarFleetProgress = Math.max(0, restoreSettlementGrowthNumber(world.interstellarFleetProgress, 0));
  world.interstellarFleetReady = Boolean(world.interstellarFleetReady);
  world.interstellarFleetActive = Math.max(0, Math.round(restoreSettlementGrowthNumber(world.interstellarFleetActive, 0)));
  world.interstellarFleetCompleted = Math.max(0, Math.round(restoreSettlementGrowthNumber(world.interstellarFleetCompleted, 0)));
  world.lastInterstellarFleetTick = Math.max(0, Math.round(restoreSettlementGrowthNumber(world.lastInterstellarFleetTick, 0)));
}

function allocateInterstellarFleetId() {
  ensureInterstellarFleetState();

  var fleetId = world.nextInterstellarFleetId;
  world.nextInterstellarFleetId++;
  return fleetId;
}

function getClaimedStarSystems() {
  normalizeStarSystems();

  var claimedSystems = [];

  for (var i = 0; i < world.starSystems.length; i++) {
    if (world.starSystems[i].isMapped && world.starSystems[i].isClaimed) {
      claimedSystems.push(world.starSystems[i]);
    }
  }

  claimedSystems.sort(function(a, b) {
    return a.id - b.id;
  });

  return claimedSystems;
}

function getStarSystemById(systemId) {
  normalizeStarSystems();

  for (var i = 0; i < world.starSystems.length; i++) {
    if (world.starSystems[i].id === systemId) {
      return world.starSystems[i];
    }
  }

  return null;
}

function getInterstellarFleetEndpoints() {
  var claimedSystems = getClaimedStarSystems();

  if (claimedSystems.length < 2) {
    return null;
  }

  var sourceIndex = world.interstellarFleets.length % claimedSystems.length;
  var targetIndex = (sourceIndex + 1 + Math.floor(world.interstellarFleets.length / claimedSystems.length)) % claimedSystems.length;

  if (targetIndex === sourceIndex) {
    targetIndex = (sourceIndex + 1) % claimedSystems.length;
  }

  return {
    sourceSystemId: claimedSystems[sourceIndex].id,
    targetSystemId: claimedSystems[targetIndex].id
  };
}

function normalizeInterstellarFleet(fleet) {
  fleet.id = Math.max(1, Math.round(restoreSettlementGrowthNumber(fleet.id, world.nextInterstellarFleetId)));
  fleet.sourceSystemId = Math.max(1, Math.round(restoreSettlementGrowthNumber(fleet.sourceSystemId, 1)));
  fleet.targetSystemId = Math.max(1, Math.round(restoreSettlementGrowthNumber(fleet.targetSystemId, fleet.sourceSystemId)));
  fleet.launchedTick = Math.max(0, Math.round(restoreSettlementGrowthNumber(fleet.launchedTick, world.tick)));
  fleet.arrivalTick = Math.max(fleet.launchedTick, Math.round(restoreSettlementGrowthNumber(fleet.arrivalTick, fleet.launchedTick)));
  fleet.progress = Math.max(0, Math.min(1, restoreSettlementGrowthNumber(fleet.progress, 0)));
  fleet.isComplete = Boolean(fleet.isComplete);

  if (fleet.id >= world.nextInterstellarFleetId) {
    world.nextInterstellarFleetId = fleet.id + 1;
  }
}

function makeInterstellarFleet() {
  var endpoints = getInterstellarFleetEndpoints();

  if (!endpoints) {
    return null;
  }

  var fleetId = allocateInterstellarFleetId();
  var travelTicks = Math.max(1, Math.round(Number(CONFIG.INTERSTELLAR_FLEET_TRAVEL_TICKS) || 1));

  return {
    id: fleetId,
    sourceSystemId: endpoints.sourceSystemId,
    targetSystemId: endpoints.targetSystemId,
    launchedTick: world.tick,
    arrivalTick: world.tick + travelTicks,
    progress: 0,
    isComplete: false
  };
}

function normalizeInterstellarFleets() {
  ensureInterstellarFleetState();

  for (var i = 0; i < world.interstellarFleets.length; i++) {
    normalizeInterstellarFleet(world.interstellarFleets[i]);
  }
}

function updateInterstellarFleetTravel() {
  normalizeInterstellarFleets();

  var activeFleets = 0;
  var completedFleets = 0;

  for (var i = 0; i < world.interstellarFleets.length; i++) {
    var fleet = world.interstellarFleets[i];

    if (fleet.isComplete) {
      fleet.progress = 1;
      completedFleets++;
      continue;
    }

    var travelTicks = Math.max(1, fleet.arrivalTick - fleet.launchedTick);
    fleet.progress = Math.max(0, Math.min(1, (world.tick - fleet.launchedTick) / travelTicks));

    if (world.tick >= fleet.arrivalTick) {
      fleet.progress = 1;
      fleet.isComplete = true;
      completedFleets++;
    } else {
      activeFleets++;
    }
  }

  world.interstellarFleetActive = activeFleets;
  world.interstellarFleetCompleted = completedFleets;
}

function getInterstellarFleetCount() {
  ensureInterstellarFleetState();
  return world.interstellarFleets.length;
}

function getCompletedInterstellarFleetCount() {
  updateInterstellarFleetTravel();
  return world.interstellarFleetCompleted;
}

function updateInterstellarFleetEra() {
  updateInterstellarFleetTravel();

  if (getEmpireLegacyLevel() >= CONFIG.ASCENDANT_EMPIRE_LEGACY_LEVEL) {
    world.era = "Ascendant Empire";
  } else if (getEmpireSectorCount() >= CONFIG.GALACTIC_EMPIRE_SECTOR_COUNT) {
    world.era = "Galactic Empire";
  } else if (getEmpireSectorCount() > 0) {
    world.era = "Empire Sectors";
  } else if (world.interstellarFleetCompleted >= CONFIG.EMPIRE_NETWORK_COMPLETED_FLEETS) {
    world.era = "Empire Network";
  } else if (world.interstellarFleets.length > 0) {
    world.era = "Interstellar Fleets";
  } else {
    updateGalacticInfluenceEra();
  }
}

function updateInterstellarFleetReadiness() {
  ensureInterstellarFleetState();
  updateInterstellarFleetTravel();

  var maxMissions = Math.max(1, Math.round(Number(CONFIG.INTERSTELLAR_FLEET_MAX_MISSIONS) || 1));
  world.interstellarFleetReady = Boolean(
    getClaimedStarSystemCount() >= CONFIG.INTERSTELLAR_FLEET_MIN_CLAIMED_SYSTEMS &&
    world.interstellarFleets.length < maxMissions &&
    getInterstellarFleetEndpoints()
  );

  updateInterstellarFleetEra();
  return world.interstellarFleetReady;
}

function updateInterstellarFleetState() {
  if (!updateInterstellarFleetReadiness()) {
    return;
  }

  var buildInterval = Math.max(1, Math.round(Number(CONFIG.INTERSTELLAR_FLEET_BUILD_INTERVAL) || 1));

  if (world.tick - world.lastInterstellarFleetTick < buildInterval) {
    return;
  }

  world.lastInterstellarFleetTick = world.tick;
  world.interstellarFleetProgress +=
    getClaimedStarSystemCount() * CONFIG.INTERSTELLAR_FLEET_PROGRESS_PER_CLAIMED_SYSTEM +
    getCompletedProbeMissionCount() * CONFIG.INTERSTELLAR_FLEET_PROGRESS_PER_COMPLETED_PROBE +
    world.orbitalInfrastructureScore * CONFIG.INTERSTELLAR_FLEET_PROGRESS_PER_INFRASTRUCTURE;

  var buildThreshold = Math.max(1, Number(CONFIG.INTERSTELLAR_FLEET_BUILD_THRESHOLD) || 1);
  var maxMissions = Math.max(1, Math.round(Number(CONFIG.INTERSTELLAR_FLEET_MAX_MISSIONS) || 1));

  while (world.interstellarFleetProgress >= buildThreshold && world.interstellarFleets.length < maxMissions) {
    var fleet = makeInterstellarFleet();

    if (!fleet) {
      break;
    }

    world.interstellarFleets.push(fleet);
    world.interstellarFleetProgress -= buildThreshold;
  }

  updateInterstellarFleetReadiness();
}

function ensureEmpireSectorState() {
  if (!Array.isArray(world.empireSectors)) {
    world.empireSectors = [];
  }

  if (typeof world.nextEmpireSectorId !== "number" || world.nextEmpireSectorId < 1) {
    world.nextEmpireSectorId = 1;
  }

  world.empireSectorProgress = Math.max(0, restoreSettlementGrowthNumber(world.empireSectorProgress, 0));
  world.empireSectorReady = Boolean(world.empireSectorReady);
  world.empireSectorCount = Math.max(0, Math.round(restoreSettlementGrowthNumber(world.empireSectorCount, 0)));
  world.lastEmpireSectorTick = Math.max(0, Math.round(restoreSettlementGrowthNumber(world.lastEmpireSectorTick, 0)));
}

function allocateEmpireSectorId() {
  ensureEmpireSectorState();

  var sectorId = world.nextEmpireSectorId;
  world.nextEmpireSectorId++;
  return sectorId;
}

function normalizeEmpireSector(sector) {
  sector.id = Math.max(1, Math.round(restoreSettlementGrowthNumber(sector.id, world.nextEmpireSectorId)));
  sector.systemId = Math.max(1, Math.round(restoreSettlementGrowthNumber(sector.systemId, 1)));
  sector.foundedTick = Math.max(0, Math.round(restoreSettlementGrowthNumber(sector.foundedTick, world.tick)));
  sector.controlValue = Math.max(1, Math.round(restoreSettlementGrowthNumber(sector.controlValue, 40 + sector.id * 9)));
  sector.controlRadius = Math.max(0.08, restoreSettlementGrowthNumber(sector.controlRadius, 0.18 + (sector.id % 3) * 0.04));
  sector.isActive = sector.isActive !== false;

  if (sector.id >= world.nextEmpireSectorId) {
    world.nextEmpireSectorId = sector.id + 1;
  }
}

function normalizeEmpireSectors() {
  ensureEmpireSectorState();

  for (var i = 0; i < world.empireSectors.length; i++) {
    normalizeEmpireSector(world.empireSectors[i]);
  }

  world.empireSectorCount = world.empireSectors.length;
}

function getEmpireSectorCount() {
  normalizeEmpireSectors();
  return world.empireSectorCount;
}

function hasEmpireSectorForSystem(systemId) {
  normalizeEmpireSectors();

  for (var i = 0; i < world.empireSectors.length; i++) {
    if (world.empireSectors[i].systemId === systemId) {
      return true;
    }
  }

  return false;
}

function getNextSectorSystem() {
  var claimedSystems = getClaimedStarSystems();
  var bestSystem = null;

  for (var i = 0; i < claimedSystems.length; i++) {
    var system = claimedSystems[i];

    if (hasEmpireSectorForSystem(system.id)) {
      continue;
    }

    if (!bestSystem || system.influenceValue > bestSystem.influenceValue || (system.influenceValue === bestSystem.influenceValue && system.id < bestSystem.id)) {
      bestSystem = system;
    }
  }

  return bestSystem;
}

function makeEmpireSector(system) {
  var sectorId = allocateEmpireSectorId();

  return {
    id: sectorId,
    systemId: system.id,
    foundedTick: world.tick,
    controlValue: Math.max(1, Math.round(Number(system.influenceValue || system.mapValue) || 1)),
    controlRadius: 0.18 + (sectorId % 3) * 0.04,
    isActive: true
  };
}

function updateEmpireSectorEra() {
  normalizeEmpireSectors();

  if (getEmpireLegacyLevel() >= CONFIG.ASCENDANT_EMPIRE_LEGACY_LEVEL) {
    world.era = "Ascendant Empire";
  } else if (world.empireSectorCount >= CONFIG.GALACTIC_EMPIRE_SECTOR_COUNT) {
    world.era = "Galactic Empire";
  } else if (world.empireSectorCount > 0) {
    world.era = "Empire Sectors";
  } else {
    updateInterstellarFleetEra();
  }
}

function updateEmpireSectorReadiness() {
  normalizeEmpireSectors();

  var maxSectors = Math.max(1, Math.round(Number(CONFIG.EMPIRE_SECTOR_MAX_SECTORS) || 1));
  world.empireSectorReady = Boolean(
    getCompletedInterstellarFleetCount() >= CONFIG.EMPIRE_SECTOR_MIN_COMPLETED_FLEETS &&
    world.empireSectors.length < maxSectors &&
    getNextSectorSystem()
  );

  updateEmpireSectorEra();
  return world.empireSectorReady;
}

function updateEmpireSectorState() {
  if (!updateEmpireSectorReadiness()) {
    return;
  }

  var sectorInterval = Math.max(1, Math.round(Number(CONFIG.EMPIRE_SECTOR_BUILD_INTERVAL) || 1));

  if (world.tick - world.lastEmpireSectorTick < sectorInterval) {
    return;
  }

  world.lastEmpireSectorTick = world.tick;
  world.empireSectorProgress +=
    getCompletedInterstellarFleetCount() * CONFIG.EMPIRE_SECTOR_PROGRESS_PER_COMPLETED_FLEET +
    getClaimedStarSystemCount() * CONFIG.EMPIRE_SECTOR_PROGRESS_PER_CLAIMED_SYSTEM +
    world.orbitalInfrastructureScore * CONFIG.EMPIRE_SECTOR_PROGRESS_PER_INFRASTRUCTURE;

  var sectorThreshold = Math.max(1, Number(CONFIG.EMPIRE_SECTOR_BUILD_THRESHOLD) || 1);
  var maxSectors = Math.max(1, Math.round(Number(CONFIG.EMPIRE_SECTOR_MAX_SECTORS) || 1));

  while (world.empireSectorProgress >= sectorThreshold && world.empireSectors.length < maxSectors) {
    var system = getNextSectorSystem();

    if (!system) {
      break;
    }

    world.empireSectors.push(makeEmpireSector(system));
    world.empireSectorProgress -= sectorThreshold;
  }

  updateEmpireSectorReadiness();
}

function ensureEmpireLegacyState() {
  world.empireLegacyProgress = Math.max(0, restoreSettlementGrowthNumber(world.empireLegacyProgress, 0));
  world.empireLegacyLevel = Math.max(0, Math.round(restoreSettlementGrowthNumber(world.empireLegacyLevel, 0)));
  world.empireLegacyReady = Boolean(world.empireLegacyReady);
  world.empireLegacyComplete = Boolean(world.empireLegacyComplete);
  world.lastEmpireLegacyTick = Math.max(0, Math.round(restoreSettlementGrowthNumber(world.lastEmpireLegacyTick, 0)));

  if (world.empireLegacyLevel >= CONFIG.ASCENDANT_EMPIRE_LEGACY_LEVEL) {
    world.empireLegacyComplete = true;
    world.era = "Ascendant Empire";
  }
}

function getEmpireLegacyLevel() {
  ensureEmpireLegacyState();
  return world.empireLegacyLevel;
}

function updateEmpireLegacyEra() {
  ensureEmpireLegacyState();

  if (world.empireLegacyLevel >= CONFIG.ASCENDANT_EMPIRE_LEGACY_LEVEL) {
    world.empireLegacyComplete = true;
    world.era = "Ascendant Empire";
  } else {
    updateEmpireSectorEra();
  }
}

function updateEmpireLegacyReadiness() {
  ensureEmpireLegacyState();

  world.empireLegacyReady = Boolean(
    getEmpireSectorCount() >= CONFIG.EMPIRE_LEGACY_MIN_SECTORS &&
    !world.empireLegacyComplete
  );

  updateEmpireLegacyEra();
  return world.empireLegacyReady;
}

function updateEmpireLegacyState() {
  if (!updateEmpireLegacyReadiness()) {
    return;
  }

  var legacyInterval = Math.max(1, Math.round(Number(CONFIG.EMPIRE_LEGACY_INTERVAL) || 1));

  if (world.tick - world.lastEmpireLegacyTick < legacyInterval) {
    return;
  }

  world.lastEmpireLegacyTick = world.tick;
  world.empireLegacyProgress +=
    getEmpireSectorCount() * CONFIG.EMPIRE_LEGACY_PROGRESS_PER_SECTOR +
    getCompletedInterstellarFleetCount() * CONFIG.EMPIRE_LEGACY_PROGRESS_PER_COMPLETED_FLEET +
    getClaimedStarSystemCount() * CONFIG.EMPIRE_LEGACY_PROGRESS_PER_CLAIMED_SYSTEM;

  var legacyThreshold = Math.max(1, Number(CONFIG.EMPIRE_LEGACY_THRESHOLD) || 1);

  while (
    world.empireLegacyProgress >= legacyThreshold &&
    world.empireLegacyLevel < CONFIG.ASCENDANT_EMPIRE_LEGACY_LEVEL
  ) {
    world.empireLegacyLevel++;
    world.empireLegacyProgress -= legacyThreshold;
  }

  updateEmpireLegacyReadiness();
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
  updateProbeMissionState();
  updateStarMapState();
  updateGalacticInfluenceState();
  updateInterstellarFleetState();
  updateEmpireSectorState();
  updateEmpireLegacyState();
}
