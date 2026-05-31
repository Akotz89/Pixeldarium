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
  return {
    era: world.era,
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

function recordSimulationMilestones(previousSnapshot) {
  var currentSnapshot = getSimulationMilestoneSnapshot();

  if (currentSnapshot.era !== previousSnapshot.era) {
    recordSimulationEvent("era", currentSnapshot.era, previousSnapshot.era + " -> " + currentSnapshot.era);
  }

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

  if (typeof recordTraitHistorySample === "function") {
    recordTraitHistorySample(true);
  }

  recordSimulationEvent("seed", "Simulation seeded", world.organisms.length + " organisms seed " + world.seedText);
}

function updateWorld() {
  world.tick++;
  world.needsRender = true;
  var milestoneSnapshot = getSimulationMilestoneSnapshot();
  growFood();

  var organismsAtStartOfTick = world.organisms.length;

  for (var i = 0; i < organismsAtStartOfTick; i++) {
    updateOrganism(world.organisms[i]);
  }

  removeDeadOrganisms();
  trimOrganismPopulation();

  if (typeof refreshLineageRegistry === "function") {
    refreshLineageRegistry();
  }

  if (typeof updateSettlements === "function") {
    updateSettlements();
  }

  recordSimulationMilestones(milestoneSnapshot);

  if (typeof recordTraitHistorySample === "function") {
    recordTraitHistorySample(false);
  }
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
