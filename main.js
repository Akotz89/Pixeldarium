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
  world.lineages = {};
  world.nextSettlementId = 1;
  world.settlements = [];
  world.settlementsById = {};
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
}

function updateWorld() {
  world.tick++;
  world.needsRender = true;
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
    requestAnimationFrame(gameLoop);
  } catch (error) {
    reportRuntimeError(error);
  }
}

startGame();
