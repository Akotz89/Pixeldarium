function reportRuntimeError(error) {
  var box = document.getElementById("debug-output");
  var message = error && error.stack ? error.stack : String(error);

  if (!box) {
    alert(message);
    return;
  }

  box.style.display = "block";
  box.textContent += message + String.fromCharCode(10) + String.fromCharCode(10);
}

function clearWorld() {
  world.tick = 0;
  world.era = "Organisms";
  world.organisms = [];
  world.organismBuckets = {};
  world.organismsByLineage = {};
  world.food = [];
  world.foodPositions = {};
  world.foodBuckets = {};
  world.terrain = [];
  world.fertileTiles = 0;
  world.birthsThisTick = 0;
  world.deathsThisTick = 0;
  world.populationDeltaThisTick = 0;
  world.totalBirths = 0;
  world.totalDeaths = 0;
  world.foodSpawnedThisTick = 0;
  world.foodConsumedThisTick = 0;
  world.foodHarvestedThisTick = 0;
  world.totalFoodSpawned = 0;
  world.totalFoodConsumed = 0;
  world.totalFoodHarvested = 0;
  world.isPaused = false;
  world.isExtinct = false;
  world.extinctionTick = 0;
  world.needsRender = true;
  setWorldSeed(world.seedText);
  world.interpolation = 0;
  world.fps = 0;
  world.tps = 0;
  world.updateMs = 0;
  world.drawMs = 0;
  world.maxUpdateMs = 0;
  world.maxDrawMs = 0;
  world.inspectedTile = null;
  world.ecosystemSummary = null;
  world.ecosystemHistory = [];
  world.simulationAlerts = [];
  world.populationTraitSummary = null;
  world.lineageSummaryText = "LINEAGES: -";
  world.nextLineageId = 1;
  world.eventLog = [];
  world.lineages = {};
  world.nextSettlementId = 1;
  world.settlements = [];
  world.settlementsById = {};
  world.settlementBuckets = {};
  world.settlementByLineage = {};
  world.rootSettlementByLineage = {};
  world.settlementChildOutpostCountByParentId = {};
  world.settlementSummary = null;
  world.earlyProgressionSummary = null;
  world.nextSettlementRouteId = 1;
  world.settlementRoutes = [];
  world.settlementRoutesByKey = {};
  world.settlementRouteStatsById = {};
  world.colonyNetworkScore = 0;
  world.colonyNetworkColonies = 0;
  world.colonyNetworkActiveRoutes = 0;
  world.colonyNetworkClaimedTiles = 0;
  world.spaceProgramProgress = 0;
  world.orbitalLaunches = 0;
  world.lastSpaceProgramTick = 0;
  world.spaceProgramReady = false;
  world.nextOrbitalAssetId = 1;
  world.orbitalAssets = [];
  world.orbitalInfrastructureScore = 0;
  world.orbitalPlatformReady = false;
  world.nextPlanetaryBodyId = 1;
  world.planetaryBodies = [];
  world.planetaryBodiesById = {};
  world.planetarySurveyProgress = 0;
  world.planetarySurveyReady = false;
  world.lastPlanetarySurveyTick = 0;
  world.nextProbeMissionId = 1;
  world.probeMissions = [];
  world.probeMissionProgress = 0;
  world.probeMissionReady = false;
  world.lastProbeMissionTick = 0;
  world.nextStarSystemId = 1;
  world.starSystems = [];
  world.starSystemsById = {};
  world.starMapProgress = 0;
  world.starMapReady = false;
  world.lastStarMapTick = 0;
  world.galacticInfluenceProgress = 0;
  world.galacticInfluenceReady = false;
  world.galacticClaimedSystems = 0;
  world.lastGalacticInfluenceTick = 0;
  world.nextInterstellarFleetId = 1;
  world.interstellarFleets = [];
  world.interstellarFleetProgress = 0;
  world.interstellarFleetReady = false;
  world.interstellarFleetActive = 0;
  world.interstellarFleetCompleted = 0;
  world.lastInterstellarFleetTick = 0;
  world.nextEmpireSectorId = 1;
  world.empireSectors = [];
  world.empireSectorBySystemId = {};
  world.empireSectorProgress = 0;
  world.empireSectorReady = false;
  world.empireSectorCount = 0;
  world.lastEmpireSectorTick = 0;
  world.empireLegacyProgress = 0;
  world.empireLegacyLevel = 0;
  world.empireLegacyReady = false;
  world.empireLegacyComplete = false;
  world.lastEmpireLegacyTick = 0;

  if (typeof resetTraitHistory === "function") {
    resetTraitHistory();
  }
}

function ensureEventLog() {
  if (!Array.isArray(world.eventLog)) {
    world.eventLog = [];
  }
}

function countItems(array, predicate) {
  var count = 0;

  if (!Array.isArray(array)) {
    return count;
  }

  for (var i = 0; i < array.length; i++) {
    if (predicate(array[i])) {
      count++;
    }
  }

  return count;
}

function getSimulationMilestoneSnapshot() {
  var ecosystemSummary = world.ecosystemSummary || null;
  var stabilityProfile = ecosystemSummary ? ecosystemSummary.stabilityProfile : null;
  var foodNetThisTick = ecosystemSummary
    ? ecosystemSummary.foodNetThisTick
    : (Number(world.foodSpawnedThisTick) || 0) - (Number(world.foodConsumedThisTick) || 0);

  return {
    era: world.era,
    population: Array.isArray(world.organisms) ? world.organisms.length : 0,
    isExtinct: Boolean(world.isExtinct),
    populationDelta: Math.round(Number(world.populationDeltaThisTick) || 0),
    populationBalance: ecosystemSummary ? ecosystemSummary.populationBalance : "unknown",
    foodNetThisTick: Math.round(Number(foodNetThisTick) || 0),
    resourceBalance: ecosystemSummary ? ecosystemSummary.resourceBalance : "unknown",
    ecosystemPressure: ecosystemSummary ? ecosystemSummary.pressure : "unknown",
    ecosystemStabilityBand: ecosystemSummary ? getEcosystemStabilityBand(ecosystemSummary.stabilityScore) : -1,
    ecosystemLimitingFactor: stabilityProfile ? stabilityProfile.limitingFactor : "unknown",
    ecosystemLimitingFactorDetail: stabilityProfile ? formatEcosystemStabilityFactorScore(stabilityProfile) : "unknown",
    recoveryAction: ecosystemSummary ? String(ecosystemSummary.recoveryAction || "observe") : "unknown",
    settlements: Array.isArray(world.settlements) ? world.settlements.length : 0,
    outposts: countItems(world.settlements, function(settlement) {
      return settlement && settlement.isOutpost;
    }),
    colonies: countItems(world.settlements, function(settlement) {
      return settlement && settlement.isColony;
    }),
    routes: Array.isArray(world.settlementRoutes) ? world.settlementRoutes.length : 0,
    orbitalLaunches: Math.max(0, Math.round(Number(world.orbitalLaunches) || 0)),
    planetaryBodies: Array.isArray(world.planetaryBodies) ? world.planetaryBodies.length : 0,
    completedProbeMissions: countItems(world.probeMissions, function(mission) {
      return mission && mission.isComplete;
    }),
    starSystems: Array.isArray(world.starSystems) ? world.starSystems.length : 0,
    claimedSystems: Math.max(0, Math.round(Number(world.galacticClaimedSystems) || 0)),
    interstellarFleets: Array.isArray(world.interstellarFleets) ? world.interstellarFleets.length : 0,
    completedInterstellarFleets: Math.max(0, Math.round(Number(world.interstellarFleetCompleted) || 0)),
    empireSectors: Array.isArray(world.empireSectors) ? world.empireSectors.length : 0,
    empireLegacyLevel: Math.max(0, Math.round(Number(world.empireLegacyLevel) || 0)),
    empireLegacyComplete: Boolean(world.empireLegacyComplete)
  };
}

function recordSimulationEvent(type, label, detail) {
  ensureEventLog();

  var lastEvent = world.eventLog[world.eventLog.length - 1];

  if (
    lastEvent &&
    lastEvent.tick === world.tick &&
    lastEvent.type === type &&
    lastEvent.label === label &&
    lastEvent.detail === detail
  ) {
    return;
  }

  world.eventLog.push({
    tick: world.tick,
    type: type,
    label: label,
    detail: detail
  });

  while (world.eventLog.length > CONFIG.EVENT_LOG_MAX_ENTRIES) {
    world.eventLog.shift();
  }
}

function recordCountMilestone(previous, current, key, type, label, detailPrefix) {
  if (current[key] > previous[key]) {
    recordSimulationEvent(type, label, detailPrefix + " " + current[key]);
  }
}

function formatMilestoneSignedNumber(value) {
  var numberValue = Math.round(Number(value) || 0);

  if (numberValue > 0) {
    return "+" + numberValue;
  }

  return String(numberValue);
}

function getEcosystemStabilityBand(stabilityScore) {
  return clamp(Math.floor(Math.max(0, Math.round(Number(stabilityScore) || 0)) / 20), 0, 5);
}

function getEcosystemStabilityBandLabel(stabilityBand) {
  if (stabilityBand <= 0) {
    return "critical";
  }

  if (stabilityBand === 1) {
    return "fragile";
  }

  if (stabilityBand === 2) {
    return "strained";
  }

  if (stabilityBand === 3) {
    return "stable";
  }

  if (stabilityBand === 4) {
    return "strong";
  }

  return "thriving";
}

function recordEcosystemMilestones(previousSnapshot, currentSnapshot) {
  if (
    previousSnapshot.ecosystemPressure !== "unknown" &&
    currentSnapshot.ecosystemPressure !== previousSnapshot.ecosystemPressure
  ) {
    recordSimulationEvent(
      "ecosystem",
      "Pressure " + currentSnapshot.ecosystemPressure,
      previousSnapshot.ecosystemPressure + " -> " + currentSnapshot.ecosystemPressure
    );
  }

  if (
    previousSnapshot.ecosystemStabilityBand >= 0 &&
    currentSnapshot.ecosystemStabilityBand !== previousSnapshot.ecosystemStabilityBand
  ) {
    var direction = currentSnapshot.ecosystemStabilityBand > previousSnapshot.ecosystemStabilityBand
      ? "improved"
      : "dropped";

    recordSimulationEvent(
      "ecosystem",
      "Stability " + direction,
      getEcosystemStabilityBandLabel(previousSnapshot.ecosystemStabilityBand) +
        " -> " +
        getEcosystemStabilityBandLabel(currentSnapshot.ecosystemStabilityBand)
    );
  }

  if (
    previousSnapshot.ecosystemLimitingFactor !== "unknown" &&
    currentSnapshot.ecosystemLimitingFactor !== "unknown" &&
    currentSnapshot.ecosystemLimitingFactor !== previousSnapshot.ecosystemLimitingFactor
  ) {
    recordSimulationEvent(
      "ecosystem",
      "Limiter " + formatEcosystemStabilityFactor(currentSnapshot.ecosystemLimitingFactor),
      formatEcosystemStabilityFactor(previousSnapshot.ecosystemLimitingFactor) +
        " -> " +
        currentSnapshot.ecosystemLimitingFactorDetail
    );
  }

  if (
    previousSnapshot.recoveryAction !== "unknown" &&
    currentSnapshot.recoveryAction !== "unknown" &&
    currentSnapshot.recoveryAction !== previousSnapshot.recoveryAction
  ) {
    recordSimulationEvent(
      "ecosystem",
      "Recovery " + currentSnapshot.recoveryAction,
      previousSnapshot.recoveryAction + " -> " + currentSnapshot.recoveryAction
    );
  }
}

function recordBalanceTransition(previousSnapshot, currentSnapshot, key, target, label, valueKey) {
  if (
    previousSnapshot[key] !== "unknown" &&
    previousSnapshot[key] !== target &&
    currentSnapshot[key] === target
  ) {
    recordSimulationEvent(
      "ecosystem",
      label,
      "net " + formatMilestoneSignedNumber(currentSnapshot[valueKey])
    );
  }
}

function recordBalanceMilestones(previousSnapshot, currentSnapshot) {
  recordBalanceTransition(
    previousSnapshot,
    currentSnapshot,
    "populationBalance",
    "surging",
    "Population surge",
    "populationDelta"
  );
  recordBalanceTransition(
    previousSnapshot,
    currentSnapshot,
    "populationBalance",
    "crashing",
    "Population crash",
    "populationDelta"
  );
  recordBalanceTransition(
    previousSnapshot,
    currentSnapshot,
    "resourceBalance",
    "replenishing",
    "Food replenishing",
    "foodNetThisTick"
  );
  recordBalanceTransition(
    previousSnapshot,
    currentSnapshot,
    "resourceBalance",
    "draining",
    "Food draining",
    "foodNetThisTick"
  );
}

function recordLifecycleMilestones(previousSnapshot, currentSnapshot) {
  if (!previousSnapshot.isExtinct && currentSnapshot.isExtinct) {
    recordSimulationEvent("lifecycle", "Extinction", "population 0");
  }

  if (previousSnapshot.isExtinct && !currentSnapshot.isExtinct && currentSnapshot.population > 0) {
    recordSimulationEvent("lifecycle", "Population recovered", "population " + currentSnapshot.population);
  }
}

function recordSimulationMilestones(previousSnapshot) {
  var currentSnapshot = getSimulationMilestoneSnapshot();

  if (currentSnapshot.era !== previousSnapshot.era) {
    recordSimulationEvent("era", currentSnapshot.era, previousSnapshot.era + " -> " + currentSnapshot.era);
  }

  recordLifecycleMilestones(previousSnapshot, currentSnapshot);
  recordEcosystemMilestones(previousSnapshot, currentSnapshot);
  recordBalanceMilestones(previousSnapshot, currentSnapshot);
  recordCountMilestone(previousSnapshot, currentSnapshot, "settlements", "settlement", "Settlement founded", "total");
  recordCountMilestone(previousSnapshot, currentSnapshot, "outposts", "settlement", "Outpost founded", "total");
  recordCountMilestone(previousSnapshot, currentSnapshot, "colonies", "settlement", "Colony matured", "total");
  recordCountMilestone(previousSnapshot, currentSnapshot, "routes", "network", "Trade route opened", "total");
  recordCountMilestone(previousSnapshot, currentSnapshot, "orbitalLaunches", "space", "Orbital launch", "launches");
  recordCountMilestone(previousSnapshot, currentSnapshot, "planetaryBodies", "space", "Planet discovered", "bodies");
  recordCountMilestone(previousSnapshot, currentSnapshot, "completedProbeMissions", "space", "Probe arrived", "completed");
  recordCountMilestone(previousSnapshot, currentSnapshot, "starSystems", "galaxy", "Star mapped", "systems");
  recordCountMilestone(previousSnapshot, currentSnapshot, "claimedSystems", "galaxy", "System claimed", "claimed");
  recordCountMilestone(previousSnapshot, currentSnapshot, "interstellarFleets", "galaxy", "Fleet launched", "fleets");
  recordCountMilestone(previousSnapshot, currentSnapshot, "completedInterstellarFleets", "galaxy", "Fleet arrived", "completed");
  recordCountMilestone(previousSnapshot, currentSnapshot, "empireSectors", "empire", "Sector founded", "sectors");
  recordCountMilestone(previousSnapshot, currentSnapshot, "empireLegacyLevel", "empire", "Legacy advanced", "level");

  if (currentSnapshot.empireLegacyComplete && !previousSnapshot.empireLegacyComplete) {
    recordSimulationEvent("empire", "Ascendant empire", "legacy complete");
  }
}

function getActiveLineageCount() {
  var activeLineages = 0;
  var lineages = world.lineages || {};

  for (var lineageKey in lineages) {
    if (
      Object.prototype.hasOwnProperty.call(lineages, lineageKey) &&
      Math.max(0, Math.round(Number(lineages[lineageKey].activeCount) || 0)) > 0
    ) {
      activeLineages++;
    }
  }

  return activeLineages;
}

function getEcosystemPressure(population, averageEnergy, foodPerOrganism) {
  if (population <= 0) {
    return "extinct";
  }

  if (population >= CONFIG.MAX_ORGANISMS * 0.92) {
    return "crowded";
  }

  if (foodPerOrganism < 0.18 || averageEnergy < CONFIG.CHILD_ORGANISM_ENERGY * 0.45) {
    return "starving";
  }

  if (foodPerOrganism < 0.55 || averageEnergy < CONFIG.CHILD_ORGANISM_ENERGY * 0.8) {
    return "strained";
  }

  if (foodPerOrganism >= 1.2 && averageEnergy >= CONFIG.STARTING_ORGANISM_ENERGY * 0.85) {
    return "growing";
  }

  return "balanced";
}

function getLatestEcosystemHistorySample() {
  if (!Array.isArray(world.ecosystemHistory) || world.ecosystemHistory.length === 0) {
    return null;
  }

  return world.ecosystemHistory[world.ecosystemHistory.length - 1];
}

function getEcosystemTrend(summary) {
  var sample = getLatestEcosystemHistorySample();

  if (!sample || sample.tick === world.tick) {
    return {
      populationDelta: 0,
      energyDelta: 0,
      foodDelta: 0,
      stabilityDelta: 0,
      foodNetDelta: 0
    };
  }

  return {
    populationDelta: summary.population - sample.population,
    energyDelta: summary.averageEnergy - sample.averageEnergy,
    foodDelta: summary.food - sample.food,
    stabilityDelta: summary.stabilityScore - (Number(sample.stabilityScore) || 0),
    foodNetDelta: summary.foodNetThisTick - (Number(sample.foodNetThisTick) || 0)
  };
}

function getEcosystemMomentum(trend) {
  trend = trend || {};

  if ((Number(trend.stabilityDelta) || 0) >= 8 && (Number(trend.foodNetDelta) || 0) >= 0) {
    return "recovering";
  }

  if ((Number(trend.stabilityDelta) || 0) <= -12) {
    return "sliding";
  }

  if ((Number(trend.foodNetDelta) || 0) <= -18) {
    return "draining";
  }

  if ((Number(trend.populationDelta) || 0) >= 8 && (Number(trend.foodNetDelta) || 0) >= 0) {
    return "expanding";
  }

  return "steady";
}

function getLowestStabilityFactor(componentScores) {
  var lowestKey = "population";
  var lowestScore = componentScores.population;

  for (var key in componentScores) {
    if (
      Object.prototype.hasOwnProperty.call(componentScores, key) &&
      componentScores[key] < lowestScore
    ) {
      lowestKey = key;
      lowestScore = componentScores[key];
    }
  }

  return lowestKey;
}

function getEcosystemStabilityProfile(population, averageEnergy, foodPerOrganism, activeLineages, matureRatio) {
  if (population <= 0) {
    return {
      stabilityScore: 0,
      limitingFactor: "population",
      population: 0,
      energy: 0,
      food: 0,
      diversity: 0,
      maturity: 0,
      crowdPenalty: 1
    };
  }

  var componentRatios = {
    population: clamp(population / Math.max(1, CONFIG.MAX_ORGANISMS * 0.45), 0, 1),
    energy: clamp(averageEnergy / Math.max(1, CONFIG.STARTING_ORGANISM_ENERGY), 0, 1),
    food: clamp(foodPerOrganism / 1.2, 0, 1),
    diversity: clamp(activeLineages / 5, 0, 1),
    maturity: clamp(matureRatio / 0.25, 0, 1)
  };
  var componentScores = {
    population: Math.round(componentRatios.population * 100),
    energy: Math.round(componentRatios.energy * 100),
    food: Math.round(componentRatios.food * 100),
    diversity: Math.round(componentRatios.diversity * 100),
    maturity: Math.round(componentRatios.maturity * 100)
  };
  var crowdPenalty = population > CONFIG.MAX_ORGANISMS * 0.9 ? 0.72 : 1;
  var limitingFactor = getLowestStabilityFactor(componentScores);

  if (crowdPenalty < 1 && componentScores.population >= 90) {
    limitingFactor = "crowding";
  }

  return {
    stabilityScore: Math.round(
      (
        componentRatios.population * 24 +
        componentRatios.energy * 26 +
        componentRatios.food * 22 +
        componentRatios.diversity * 14 +
        componentRatios.maturity * 14
      ) * crowdPenalty
    ),
    limitingFactor: limitingFactor,
    population: componentScores.population,
    energy: componentScores.energy,
    food: componentScores.food,
    diversity: componentScores.diversity,
    maturity: componentScores.maturity,
    crowdPenalty: crowdPenalty
  };
}

function getEcosystemStabilityScore(population, averageEnergy, foodPerOrganism, activeLineages, matureRatio) {
  return getEcosystemStabilityProfile(
    population,
    averageEnergy,
    foodPerOrganism,
    activeLineages,
    matureRatio
  ).stabilityScore;
}

function formatEcosystemStabilityFactor(factor) {
  if (factor === "crowding") {
    return "crowding";
  }

  if (factor === "diversity") {
    return "lineage diversity";
  }

  return String(factor || "stability");
}

function formatEcosystemStabilityFactorScore(profile) {
  if (!profile) {
    return "stability";
  }

  if (profile.limitingFactor === "crowding") {
    return "crowding penalty " + Math.round((1 - profile.crowdPenalty) * 100) + "%";
  }

  return (
    formatEcosystemStabilityFactor(profile.limitingFactor) +
    " " +
    Math.max(0, Math.round(Number(profile[profile.limitingFactor]) || 0)) +
    "/100"
  );
}

function getEcosystemRecoveryAction(summary) {
  if (!summary || !summary.stabilityProfile) {
    return "observe";
  }

  var factor = summary.stabilityProfile.limitingFactor;

  if (summary.population <= 0 || factor === "population") {
    return "restart seed";
  }

  if (factor === "food") {
    if (summary.resourceBalance === "draining") {
      return "reduce food drain";
    }

    return "grow food stock";
  }

  if (factor === "energy") {
    return "restore energy";
  }

  if (factor === "maturity") {
    return "let adults form";
  }

  if (factor === "diversity") {
    return "protect lineages";
  }

  if (factor === "crowding") {
    return "relieve crowding";
  }

  return "stabilize";
}

function getPopulationBalance(populationDelta, population) {
  if (population <= 0) {
    return "extinct";
  }

  var magnitude = Math.abs(populationDelta);
  var largeSwing = Math.max(4, Math.ceil(population * 0.08));

  if (populationDelta >= largeSwing) {
    return "surging";
  }

  if (populationDelta > 0) {
    return "growing";
  }

  if (populationDelta <= -largeSwing) {
    return "crashing";
  }

  if (populationDelta < 0) {
    return "declining";
  }

  return magnitude === 0 ? "steady" : "shifting";
}

function getResourceBalance(foodNet, foodStock) {
  var largeSwing = Math.max(3, Math.ceil(Math.max(1, foodStock) * 0.025));

  if (foodNet >= largeSwing) {
    return "replenishing";
  }

  if (foodNet > 0) {
    return "gaining";
  }

  if (foodNet <= -largeSwing) {
    return "draining";
  }

  if (foodNet < 0) {
    return "spending";
  }

  return "steady";
}

function refreshEcosystemSummary() {
  var population = world.organisms.length;
  var totalEnergy = 0;
  var totalAge = 0;
  var matureOrganisms = 0;

  for (var i = 0; i < world.organisms.length; i++) {
    var organism = world.organisms[i];
    var traits = ensureOrganismTraits(organism);

    totalEnergy += Math.max(0, Number(organism.energy) || 0);
    totalAge += Math.max(0, Number(organism.age) || 0);

    if (organism.energy >= traits.reproductionEnergy) {
      matureOrganisms++;
    }
  }

  var averageEnergy = population > 0 ? totalEnergy / population : 0;
  var averageAge = population > 0 ? totalAge / population : 0;
  var foodPerOrganism = population > 0 ? world.food.length / population : world.food.length;
  var fertilePercent = (world.fertileTiles / (WORLD_WIDTH * WORLD_HEIGHT)) * 100;
  var activeLineages = getActiveLineageCount();
  var matureRatio = population > 0 ? matureOrganisms / population : 0;
  var foodNetThisTick = Math.max(0, Math.round(Number(world.foodSpawnedThisTick) || 0)) -
    Math.max(0, Math.round(Number(world.foodConsumedThisTick) || 0));
  var pressure = getEcosystemPressure(population, averageEnergy, foodPerOrganism);
  var stabilityProfile = getEcosystemStabilityProfile(
    population,
    averageEnergy,
    foodPerOrganism,
    activeLineages,
    matureRatio
  );

  world.ecosystemSummary = {
    population: population,
    food: world.food.length,
    foodPerOrganism: foodPerOrganism,
    averageEnergy: averageEnergy,
    averageAge: averageAge,
    matureOrganisms: matureOrganisms,
    matureRatio: matureRatio,
    activeLineages: activeLineages,
    fertilePercent: fertilePercent,
    populationBalance: getPopulationBalance(Math.round(Number(world.populationDeltaThisTick) || 0), population),
    resourceBalance: getResourceBalance(foodNetThisTick, world.food.length),
    foodNetThisTick: foodNetThisTick,
    pressure: pressure,
    stabilityScore: stabilityProfile.stabilityScore,
    stabilityProfile: stabilityProfile,
    recoveryAction: ""
  };

  world.ecosystemSummary.recoveryAction = getEcosystemRecoveryAction(world.ecosystemSummary);
  world.ecosystemSummary.trend = getEcosystemTrend(world.ecosystemSummary);
  world.ecosystemSummary.momentum = getEcosystemMomentum(world.ecosystemSummary.trend);
  return world.ecosystemSummary;
}

function makeEcosystemHistorySample(summary) {
  summary = summary || refreshEcosystemSummary();

  return {
    tick: world.tick,
    population: summary.population,
    food: summary.food,
    averageEnergy: summary.averageEnergy,
    foodPerOrganism: summary.foodPerOrganism,
    populationBalance: summary.populationBalance,
    resourceBalance: summary.resourceBalance,
    foodNetThisTick: summary.foodNetThisTick,
    pressure: summary.pressure,
    stabilityScore: summary.stabilityScore
  };
}

function recordEcosystemHistorySample(force) {
  if (!Array.isArray(world.ecosystemHistory)) {
    world.ecosystemHistory = [];
  }

  if (!force && world.tick % CONFIG.ECOSYSTEM_HISTORY_SAMPLE_INTERVAL !== 0) {
    return;
  }

  var lastSample = getLatestEcosystemHistorySample();

  if (lastSample && lastSample.tick === world.tick) {
    return;
  }

  world.ecosystemHistory.push(makeEcosystemHistorySample(world.ecosystemSummary));

  while (world.ecosystemHistory.length > CONFIG.ECOSYSTEM_HISTORY_MAX_SAMPLES) {
    world.ecosystemHistory.shift();
  }
}

function resetPopulationFlowCounters() {
  world.birthsThisTick = 0;
  world.deathsThisTick = 0;
  world.populationDeltaThisTick = 0;
}

function resetFoodFlowCounters() {
  world.foodSpawnedThisTick = 0;
  world.foodConsumedThisTick = 0;
  world.foodHarvestedThisTick = 0;
}

function recordOrganismBirth(count) {
  var birthCount = Math.max(0, Math.round(Number(count) || 0));

  if (birthCount <= 0) {
    return;
  }

  world.birthsThisTick += birthCount;
  world.totalBirths += birthCount;
}

function recordOrganismDeath(count) {
  var deathCount = Math.max(0, Math.round(Number(count) || 0));

  if (deathCount <= 0) {
    return;
  }

  world.deathsThisTick += deathCount;
  world.totalDeaths += deathCount;
}

function recordFoodSpawned(count) {
  var foodCount = Math.max(0, Math.round(Number(count) || 0));

  if (foodCount <= 0) {
    return;
  }

  world.foodSpawnedThisTick += foodCount;
  world.totalFoodSpawned += foodCount;
}

function recordFoodConsumed(count) {
  var foodCount = Math.max(0, Math.round(Number(count) || 0));

  if (foodCount <= 0) {
    return;
  }

  world.foodConsumedThisTick += foodCount;
  world.totalFoodConsumed += foodCount;
}

function recordFoodHarvested(count) {
  var foodCount = Math.max(0, Math.round(Number(count) || 0));

  if (foodCount <= 0) {
    return;
  }

  world.foodHarvestedThisTick += foodCount;
  world.totalFoodHarvested += foodCount;
  recordFoodConsumed(foodCount);
}

function makeSimulationAlert(severity, label, detail, priority) {
  return {
    severity: String(severity || "info"),
    label: String(label || "Simulation"),
    detail: String(detail || ""),
    priority: Math.max(0, Math.round(Number(priority) || 100))
  };
}

function getSimulationAlertSeverityRank(severity) {
  if (severity === "danger") {
    return 0;
  }

  if (severity === "warning") {
    return 1;
  }

  if (severity === "ready") {
    return 2;
  }

  return 3;
}

function compareSimulationAlerts(left, right) {
  if (left.priority !== right.priority) {
    return left.priority - right.priority;
  }

  var leftSeverity = getSimulationAlertSeverityRank(left.severity);
  var rightSeverity = getSimulationAlertSeverityRank(right.severity);

  if (leftSeverity !== rightSeverity) {
    return leftSeverity - rightSeverity;
  }

  return left.order - right.order;
}

function addSimulationAlert(alerts, severity, label, detail, priority) {
  var nextAlert = makeSimulationAlert(severity, label, detail, priority);
  nextAlert.order = alerts.length;

  for (var i = 0; i < alerts.length; i++) {
    if (alerts[i].label === nextAlert.label) {
      if (compareSimulationAlerts(nextAlert, alerts[i]) < 0) {
        nextAlert.order = alerts[i].order;
        alerts[i] = nextAlert;
      }

      return;
    }
  }

  alerts.push(nextAlert);
}

function rankSimulationAlerts(alerts) {
  return alerts.slice().sort(compareSimulationAlerts).map(function(alert) {
    return {
      severity: alert.severity,
      label: alert.label,
      detail: alert.detail,
      priority: alert.priority
    };
  });
}

function refreshSimulationAlerts() {
  var alerts = [];
  var ecosystemSummary = world.ecosystemSummary || refreshEcosystemSummary();
  var settlementSummary = world.settlementSummary || (
    typeof refreshSettlementSummaryCache === "function" ? refreshSettlementSummaryCache() : null
  );
  var earlySummary = !settlementSummary && typeof refreshEarlyProgressionSummaryCache === "function"
    ? refreshEarlyProgressionSummaryCache()
    : null;

  if (world.isExtinct) {
    addSimulationAlert(alerts, "danger", "Extinction", "restart available", 0);
  } else if (ecosystemSummary.pressure === "starving") {
    addSimulationAlert(alerts, "danger", "Food stress", "energy " + ecosystemSummary.averageEnergy.toFixed(1), 10);
  } else if (ecosystemSummary.pressure === "crowded") {
    addSimulationAlert(alerts, "warning", "Crowding", ecosystemSummary.population + "/" + CONFIG.MAX_ORGANISMS, 35);
  } else if (ecosystemSummary.pressure === "strained") {
    addSimulationAlert(alerts, "warning", "Strained", "food/org " + ecosystemSummary.foodPerOrganism.toFixed(2), 35);
  }

  if (!world.isExtinct && ecosystemSummary.populationBalance === "crashing") {
    addSimulationAlert(alerts, "danger", "Population crash", String(world.populationDeltaThisTick), 12);
  }

  if (!world.isExtinct && ecosystemSummary.resourceBalance === "draining") {
    addSimulationAlert(alerts, "warning", "Food draining", String(ecosystemSummary.foodNetThisTick), 28);
  }

  if (!world.isExtinct && ecosystemSummary.stabilityScore <= 20) {
    addSimulationAlert(
      alerts,
      "warning",
      "Low stability",
      ecosystemSummary.recoveryAction + " - " + formatEcosystemStabilityFactorScore(ecosystemSummary.stabilityProfile),
      24
    );
  }

  if (!world.isExtinct && ecosystemSummary.trend && ecosystemSummary.trend.stabilityDelta <= -12) {
    addSimulationAlert(
      alerts,
      "warning",
      "Stability falling",
      formatMilestoneSignedNumber(ecosystemSummary.trend.stabilityDelta) + " - " + ecosystemSummary.recoveryAction,
      26
    );
  }

  if (!world.isExtinct && ecosystemSummary.momentum === "recovering") {
    addSimulationAlert(
      alerts,
      "ready",
      "Recovery improving",
      formatMilestoneSignedNumber(ecosystemSummary.trend.stabilityDelta) + " stability",
      58
    );
  }

  if (earlySummary && earlySummary.settlementReady) {
    addSimulationAlert(alerts, "ready", "Settlement ready", "top " + earlySummary.topActive + "/" + earlySummary.populationTarget, 60);
  }

  if (world.spaceProgramReady) {
    addSimulationAlert(alerts, "ready", "Launch ready", world.spaceProgramProgress.toFixed(1) + "/" + CONFIG.SPACE_PROGRAM_LAUNCH_THRESHOLD, 62);
  }

  if (world.planetarySurveyReady) {
    addSimulationAlert(alerts, "ready", "Survey ready", world.planetarySurveyProgress.toFixed(1), 64);
  }

  if (world.probeMissionReady) {
    addSimulationAlert(alerts, "ready", "Probe ready", world.probeMissionProgress.toFixed(1), 66);
  }

  if (alerts.length === 0) {
    addSimulationAlert(alerts, "info", "Nominal", ecosystemSummary.pressure + " stability " + ecosystemSummary.stabilityScore + "/100", 90);
  }

  world.simulationAlerts = rankSimulationAlerts(alerts).slice(0, 5);
  return world.simulationAlerts;
}

function syncLifecycleState() {
  var population = Array.isArray(world.organisms) ? world.organisms.length : 0;

  if (population <= 0) {
    if (!world.isExtinct) {
      world.isExtinct = true;
      world.extinctionTick = world.tick;
    }

    world.isPaused = true;
    world.needsRender = true;
    return;
  }

  if (world.isExtinct) {
    world.isExtinct = false;
    world.extinctionTick = 0;
    world.needsRender = true;
  }
}

function seedWorld() {
  clearWorld();
  seedTerrain();

  if (typeof buildTerrainCache === "function") {
    buildTerrainCache();
  }

  var centerX = Math.floor(WORLD_WIDTH / 2);
  var centerY = Math.floor(WORLD_HEIGHT / 2);

  for (var i = 0; i < CONFIG.STARTING_ORGANISMS; i++) {
    world.organisms.push(makeOrganism(
      centerX + randomInt(41) - 20,
      centerY + randomInt(41) - 20
    ));
  }

  if (typeof refreshLineageRegistry === "function") {
    refreshLineageRegistry();
  }

  for (var foodIndex = 0; foodIndex < CONFIG.STARTING_FOOD; foodIndex++) {
    var position = randomFoodPosition();
    addFoodAt(position.x, position.y);
  }

  refreshEcosystemSummary();
  syncLifecycleState();
  recordEcosystemHistorySample(true);

  if (typeof recordTraitHistorySample === "function") {
    recordTraitHistorySample(true);
  }

  recordSimulationEvent("seed", "Simulation seeded", world.organisms.length + " organisms seed " + world.seedText);
  refreshSimulationAlerts();
}

function updateWorld() {
  world.tick++;
  world.needsRender = true;
  resetPopulationFlowCounters();
  resetFoodFlowCounters();
  var milestoneSnapshot = getSimulationMilestoneSnapshot();
  growFood();

  var organismsAtStartOfTick = world.organisms.length;

  for (var i = 0; i < organismsAtStartOfTick; i++) {
    updateOrganism(world.organisms[i]);
  }

  removeDeadOrganisms();
  trimOrganismPopulation();
  world.populationDeltaThisTick = world.organisms.length - organismsAtStartOfTick;

  if (typeof refreshLineageRegistry === "function") {
    refreshLineageRegistry();
  }

  refreshEcosystemSummary();
  syncLifecycleState();
  recordEcosystemHistorySample(!milestoneSnapshot.isExtinct && world.isExtinct);

  if (!world.isExtinct && typeof updateSettlements === "function") {
    updateSettlements();
  }

  recordSimulationMilestones(milestoneSnapshot);

  if (typeof recordTraitHistorySample === "function") {
    recordTraitHistorySample(false);
  }

  refreshSimulationAlerts();
}

function setSimulationPaused(isPaused) {
  if (world.isExtinct) {
    return false;
  }

  var nextPaused = Boolean(isPaused);

  if (world.isPaused === nextPaused) {
    return false;
  }

  world.isPaused = nextPaused;
  world.needsRender = true;

  if (typeof syncControlStates === "function") {
    syncControlStates();
  }

  return true;
}

function toggleSimulationPaused() {
  return setSimulationPaused(!world.isPaused);
}

function setSimulationSpeed(speed) {
  var nextSpeed = clamp(Math.round(Number(speed) || world.speed), 1, 10);

  if (world.speed === nextSpeed) {
    return false;
  }

  world.speed = nextSpeed;
  return true;
}

function adjustSimulationSpeed(delta) {
  return setSimulationSpeed(world.speed + Math.round(Number(delta) || 0));
}

function stepSimulationOnce() {
  if (!world.isPaused || world.isExtinct) {
    return false;
  }

  var updateStart = performance.now();
  updateWorld();
  world.updateMs = performance.now() - updateStart;
  world.maxUpdateMs = Math.max(world.maxUpdateMs, world.updateMs);
  world.interpolation = 1;

  var drawStart = performance.now();
  drawWorld();
  world.drawMs = performance.now() - drawStart;
  world.maxDrawMs = Math.max(world.maxDrawMs, world.drawMs);

  updateHud();
  return true;
}

var lastFrameTime = performance.now();
var simAccumulatorMs = 0;
var statsTimer = performance.now();
var hudTimer = performance.now();
var framesSinceStatsUpdate = 0;
var simTicksSinceStatsUpdate = 0;
var updateMsSinceStatsUpdate = 0;
var drawMsSinceStatsUpdate = 0;
var measuredUpdateFrames = 0;
var measuredDrawFrames = 0;
var maxUpdateMsSinceStatsUpdate = 0;
var maxDrawMsSinceStatsUpdate = 0;

function gameLoop() {
  try {
    var now = performance.now();
    var frameElapsed = Math.min(250, Math.max(0, now - lastFrameTime));
    lastFrameTime = now;
    framesSinceStatsUpdate++;

    if (!world.isPaused) {
      var updateInterval = Math.max(
        1,
        CONFIG.SIM_UPDATE_INTERVAL_MS / Math.max(1, world.speed * CONFIG.SIM_SPEED_MULTIPLIER)
      );
      var updatesThisFrame = 0;
      var updateStart = performance.now();
      simAccumulatorMs += frameElapsed;

      while (
        simAccumulatorMs >= updateInterval &&
        updatesThisFrame < CONFIG.MAX_SIM_UPDATES_PER_FRAME
      ) {
        updateWorld();
        simAccumulatorMs -= updateInterval;
        updatesThisFrame++;
      }

      if (updatesThisFrame >= CONFIG.MAX_SIM_UPDATES_PER_FRAME) {
        simAccumulatorMs = Math.min(simAccumulatorMs, updateInterval);
      }

      if (updatesThisFrame > 0) {
        var updateElapsed = performance.now() - updateStart;
        updateMsSinceStatsUpdate += updateElapsed;
        measuredUpdateFrames++;

        if (updateElapsed > maxUpdateMsSinceStatsUpdate) {
          maxUpdateMsSinceStatsUpdate = updateElapsed;
        }

        simTicksSinceStatsUpdate += updatesThisFrame;
      }

      world.interpolation = Math.min(simAccumulatorMs / updateInterval, 1);
    } else {
      simAccumulatorMs = 0;
      world.interpolation = 0;
    }

    if (!world.isPaused || world.needsRender) {
      var drawStart = performance.now();
      drawWorld();
      world.needsRender = false;
      var drawElapsed = performance.now() - drawStart;
      drawMsSinceStatsUpdate += drawElapsed;
      measuredDrawFrames++;

      if (drawElapsed > maxDrawMsSinceStatsUpdate) {
        maxDrawMsSinceStatsUpdate = drawElapsed;
      }
    }

    var statsElapsed = now - statsTimer;

    if (statsElapsed >= 500) {
      world.fps = framesSinceStatsUpdate / (statsElapsed / 1000);
      world.tps = simTicksSinceStatsUpdate / (statsElapsed / 1000);
      world.updateMs = measuredUpdateFrames > 0 ? updateMsSinceStatsUpdate / measuredUpdateFrames : 0;
      world.drawMs = measuredDrawFrames > 0 ? drawMsSinceStatsUpdate / measuredDrawFrames : 0;
      world.maxUpdateMs = maxUpdateMsSinceStatsUpdate;
      world.maxDrawMs = maxDrawMsSinceStatsUpdate;

      framesSinceStatsUpdate = 0;
      simTicksSinceStatsUpdate = 0;
      updateMsSinceStatsUpdate = 0;
      drawMsSinceStatsUpdate = 0;
      measuredUpdateFrames = 0;
      measuredDrawFrames = 0;
      maxUpdateMsSinceStatsUpdate = 0;
      maxDrawMsSinceStatsUpdate = 0;
      statsTimer = now;
    }

    if (now - hudTimer >= CONFIG.HUD_UPDATE_INTERVAL_MS) {
      updateHud();
      hudTimer = now;
    }

    requestAnimationFrame(gameLoop);
  } catch (error) {
    reportRuntimeError(error);
  }
}

function startGame() {
  try {
    setupControls();
    seedWorld();
    drawWorld();
    updateHud();
    syncControlStates();
    requestAnimationFrame(gameLoop);
  } catch (error) {
    reportRuntimeError(error);
  }
}

startGame();
