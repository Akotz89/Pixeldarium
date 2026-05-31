const PIXELSIM_DB_NAME = "pixelsim";
const PIXELSIM_DB_VERSION = 1;
const PIXELSIM_SAVE_STORE = "saves";
const PIXELSIM_SAVE_ID = "latest";
const PIXELSIM_SAVE_VERSION = 1;

function openPixelSimDatabase() {
  return new Promise(function(resolve, reject) {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    var request = window.indexedDB.open(PIXELSIM_DB_NAME, PIXELSIM_DB_VERSION);

    request.onupgradeneeded = function(event) {
      var db = event.target.result;

      if (!db.objectStoreNames.contains(PIXELSIM_SAVE_STORE)) {
        db.createObjectStore(PIXELSIM_SAVE_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = function(event) {
      resolve(event.target.result);
    };

    request.onerror = function() {
      reject(new Error(request.error ? request.error.message : "Could not open IndexedDB"));
    };
  });
}

function copyOrganismTraitsForSave(traits) {
  traits = normalizeOrganismTraits(traits);

  return {
    vision: traits.vision,
    metabolism: traits.metabolism,
    reproductionEnergy: traits.reproductionEnergy,
    movementTendency: traits.movementTendency,
    terrainAffinity: traits.terrainAffinity
  };
}

function copyOrganismForSave(organism) {
  var traits = ensureOrganismTraits(organism);

  return {
    x: organism.x,
    y: organism.y,
    prevX: organism.prevX,
    prevY: organism.prevY,
    energy: organism.energy,
    age: organism.age,
    directionX: organism.directionX,
    directionY: organism.directionY,
    traits: copyOrganismTraitsForSave(traits),
    lineageId: ensureOrganismLineage(organism),
    lineageParentId: organism.lineageParentId,
    generation: organism.generation
  };
}

function copyFoodForSave(food) {
  return {
    x: food.x,
    y: food.y
  };
}

function copyTraitHistorySampleForSave(sample) {
  return {
    tick: sample.tick,
    population: sample.population,
    vision: sample.vision,
    metabolism: sample.metabolism,
    reproductionEnergy: sample.reproductionEnergy,
    movementTendency: sample.movementTendency,
    terrainAffinity: sample.terrainAffinity
  };
}

function copyLineageForSave(lineage) {
  return {
    id: lineage.id,
    parentId: lineage.parentId,
    createdTick: lineage.createdTick,
    founderGeneration: lineage.founderGeneration,
    founderTraits: copyOrganismTraitsForSave(lineage.founderTraits),
    activeCount: lineage.activeCount,
    lastSeenTick: lineage.lastSeenTick,
    peakPopulation: lineage.peakPopulation,
    isExtinct: lineage.isExtinct
  };
}

function copySettlementForSave(settlement) {
  return {
    id: settlement.id,
    lineageId: settlement.lineageId,
    x: settlement.x,
    y: settlement.y,
    foundedTick: settlement.foundedTick,
    radius: settlement.radius,
    population: settlement.population,
    foodStock: settlement.foodStock,
    storedFood: settlement.storedFood,
    development: settlement.development,
    level: settlement.level,
    lastGrowthTick: settlement.lastGrowthTick,
    influenceRadius: settlement.influenceRadius,
    claimedTiles: settlement.claimedTiles,
    claimedFood: settlement.claimedFood,
    parentSettlementId: settlement.parentSettlementId,
    isOutpost: settlement.isOutpost,
    isColony: settlement.isColony,
    lastOutpostTick: settlement.lastOutpostTick,
    lastSupplyGrowthTick: settlement.lastSupplyGrowthTick,
    isActive: settlement.isActive,
    lastActiveTick: settlement.lastActiveTick
  };
}

function copySettlementRouteForSave(route) {
  return {
    id: route.id,
    parentSettlementId: route.parentSettlementId,
    childSettlementId: route.childSettlementId,
    lineageId: route.lineageId,
    foundedTick: route.foundedTick,
    distance: route.distance,
    foodTransferred: route.foodTransferred,
    lastTransferTick: route.lastTransferTick,
    isActive: route.isActive
  };
}

function copyOrbitalAssetForSave(asset) {
  return {
    id: asset.id,
    launchNumber: asset.launchNumber,
    launchedTick: asset.launchedTick,
    infrastructureScore: asset.infrastructureScore,
    orbitAngle: asset.orbitAngle,
    orbitBand: asset.orbitBand,
    isActive: asset.isActive
  };
}

function copyPlanetaryBodyForSave(body) {
  return {
    id: body.id,
    name: body.name,
    discoveredTick: body.discoveredTick,
    surveyValue: body.surveyValue,
    orbitAngle: body.orbitAngle,
    orbitRadius: body.orbitRadius,
    isSurveyed: body.isSurveyed
  };
}

function copyProbeMissionForSave(mission) {
  return {
    id: mission.id,
    targetBodyId: mission.targetBodyId,
    launchedTick: mission.launchedTick,
    arrivalTick: mission.arrivalTick,
    progress: mission.progress,
    isComplete: mission.isComplete
  };
}

function copyStarSystemForSave(system) {
  return {
    id: system.id,
    name: system.name,
    discoveredTick: system.discoveredTick,
    mapValue: system.mapValue,
    mapX: system.mapX,
    mapY: system.mapY,
    isMapped: system.isMapped,
    influenceValue: system.influenceValue,
    isClaimed: system.isClaimed,
    claimedTick: system.claimedTick
  };
}

function copyInterstellarFleetForSave(fleet) {
  return {
    id: fleet.id,
    sourceSystemId: fleet.sourceSystemId,
    targetSystemId: fleet.targetSystemId,
    launchedTick: fleet.launchedTick,
    arrivalTick: fleet.arrivalTick,
    progress: fleet.progress,
    isComplete: fleet.isComplete
  };
}

function copyEmpireSectorForSave(sector) {
  return {
    id: sector.id,
    systemId: sector.systemId,
    foundedTick: sector.foundedTick,
    controlValue: sector.controlValue,
    controlRadius: sector.controlRadius,
    isActive: sector.isActive
  };
}

function getLineagesForSave() {
  if (typeof refreshLineageRegistry === "function") {
    refreshLineageRegistry();
  }

  var lineages = [];
  var lineageRecords = world.lineages || {};

  for (var lineageKey in lineageRecords) {
    if (Object.prototype.hasOwnProperty.call(lineageRecords, lineageKey)) {
      lineages.push(copyLineageForSave(lineageRecords[lineageKey]));
    }
  }

  lineages.sort(function(a, b) {
    return a.id - b.id;
  });

  return lineages;
}

function getSettlementsForSave() {
  if (!Array.isArray(world.settlements)) {
    return [];
  }

  return world.settlements.map(copySettlementForSave);
}

function getSettlementRoutesForSave() {
  if (!Array.isArray(world.settlementRoutes)) {
    return [];
  }

  return world.settlementRoutes.map(copySettlementRouteForSave);
}

function getOrbitalAssetsForSave() {
  if (typeof updateOrbitalInfrastructureState === "function") {
    updateOrbitalInfrastructureState();
  }

  if (!Array.isArray(world.orbitalAssets)) {
    return [];
  }

  return world.orbitalAssets.map(copyOrbitalAssetForSave);
}

function getPlanetaryBodiesForSave() {
  if (typeof updatePlanetarySurveyReadiness === "function") {
    updatePlanetarySurveyReadiness();
  }

  if (!Array.isArray(world.planetaryBodies)) {
    return [];
  }

  return world.planetaryBodies.map(copyPlanetaryBodyForSave);
}

function getProbeMissionsForSave() {
  if (typeof updateProbeMissionReadiness === "function") {
    updateProbeMissionReadiness();
  }

  if (!Array.isArray(world.probeMissions)) {
    return [];
  }

  return world.probeMissions.map(copyProbeMissionForSave);
}

function getStarSystemsForSave() {
  if (typeof updateStarMapReadiness === "function") {
    updateStarMapReadiness();
  }

  if (typeof updateGalacticInfluenceReadiness === "function") {
    updateGalacticInfluenceReadiness();
  }

  if (!Array.isArray(world.starSystems)) {
    return [];
  }

  return world.starSystems.map(copyStarSystemForSave);
}

function getInterstellarFleetsForSave() {
  if (typeof updateInterstellarFleetReadiness === "function") {
    updateInterstellarFleetReadiness();
  }

  if (!Array.isArray(world.interstellarFleets)) {
    return [];
  }

  return world.interstellarFleets.map(copyInterstellarFleetForSave);
}

function getEmpireSectorsForSave() {
  if (typeof updateEmpireSectorReadiness === "function") {
    updateEmpireSectorReadiness();
  }

  if (!Array.isArray(world.empireSectors)) {
    return [];
  }

  return world.empireSectors.map(copyEmpireSectorForSave);
}

function createWorldSaveData() {
  var networkSummary = null;

  if (typeof updateColonyNetworkState === "function") {
    networkSummary = updateColonyNetworkState();
  }

  if (typeof updateSpaceProgramReadiness === "function") {
    updateSpaceProgramReadiness(networkSummary);
  }

  if (typeof updateGalacticInfluenceReadiness === "function") {
    updateGalacticInfluenceReadiness();
  }

  if (typeof updateInterstellarFleetReadiness === "function") {
    updateInterstellarFleetReadiness();
  }

  if (typeof updateEmpireSectorReadiness === "function") {
    updateEmpireSectorReadiness();
  }

  if (typeof updateEmpireLegacyReadiness === "function") {
    updateEmpireLegacyReadiness();
  }

  return {
    id: PIXELSIM_SAVE_ID,
    version: PIXELSIM_SAVE_VERSION,
    savedAt: new Date().toISOString(),
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tileSize: CONFIG.TILE_SIZE,
    tick: world.tick,
    speed: world.speed,
    era: world.era,
    nextLineageId: world.nextLineageId,
    nextSettlementId: world.nextSettlementId,
    nextSettlementRouteId: world.nextSettlementRouteId,
    nextOrbitalAssetId: Math.max(1, Math.round(Number(world.nextOrbitalAssetId) || 1)),
    nextPlanetaryBodyId: Math.max(1, Math.round(Number(world.nextPlanetaryBodyId) || 1)),
    nextProbeMissionId: Math.max(1, Math.round(Number(world.nextProbeMissionId) || 1)),
    nextStarSystemId: Math.max(1, Math.round(Number(world.nextStarSystemId) || 1)),
    colonyNetworkScore: Math.max(0, Math.round(Number(world.colonyNetworkScore) || 0)),
    colonyNetworkColonies: Math.max(0, Math.round(Number(world.colonyNetworkColonies) || 0)),
    colonyNetworkActiveRoutes: Math.max(0, Math.round(Number(world.colonyNetworkActiveRoutes) || 0)),
    colonyNetworkClaimedTiles: Math.max(0, Math.round(Number(world.colonyNetworkClaimedTiles) || 0)),
    spaceProgramProgress: Math.max(0, Number(world.spaceProgramProgress) || 0),
    orbitalLaunches: Math.max(0, Math.round(Number(world.orbitalLaunches) || 0)),
    lastSpaceProgramTick: Math.max(0, Math.round(Number(world.lastSpaceProgramTick) || 0)),
    spaceProgramReady: Boolean(world.spaceProgramReady),
    orbitalInfrastructureScore: Math.max(0, Math.round(Number(world.orbitalInfrastructureScore) || 0)),
    orbitalPlatformReady: Boolean(world.orbitalPlatformReady),
    planetarySurveyProgress: Math.max(0, Number(world.planetarySurveyProgress) || 0),
    planetarySurveyReady: Boolean(world.planetarySurveyReady),
    lastPlanetarySurveyTick: Math.max(0, Math.round(Number(world.lastPlanetarySurveyTick) || 0)),
    probeMissionProgress: Math.max(0, Number(world.probeMissionProgress) || 0),
    probeMissionReady: Boolean(world.probeMissionReady),
    lastProbeMissionTick: Math.max(0, Math.round(Number(world.lastProbeMissionTick) || 0)),
    starMapProgress: Math.max(0, Number(world.starMapProgress) || 0),
    starMapReady: Boolean(world.starMapReady),
    lastStarMapTick: Math.max(0, Math.round(Number(world.lastStarMapTick) || 0)),
    galacticInfluenceProgress: Math.max(0, Number(world.galacticInfluenceProgress) || 0),
    galacticInfluenceReady: Boolean(world.galacticInfluenceReady),
    galacticClaimedSystems: Math.max(0, Math.round(Number(world.galacticClaimedSystems) || 0)),
    lastGalacticInfluenceTick: Math.max(0, Math.round(Number(world.lastGalacticInfluenceTick) || 0)),
    nextInterstellarFleetId: Math.max(1, Math.round(Number(world.nextInterstellarFleetId) || 1)),
    interstellarFleetProgress: Math.max(0, Number(world.interstellarFleetProgress) || 0),
    interstellarFleetReady: Boolean(world.interstellarFleetReady),
    interstellarFleetActive: Math.max(0, Math.round(Number(world.interstellarFleetActive) || 0)),
    interstellarFleetCompleted: Math.max(0, Math.round(Number(world.interstellarFleetCompleted) || 0)),
    lastInterstellarFleetTick: Math.max(0, Math.round(Number(world.lastInterstellarFleetTick) || 0)),
    nextEmpireSectorId: Math.max(1, Math.round(Number(world.nextEmpireSectorId) || 1)),
    empireSectorProgress: Math.max(0, Number(world.empireSectorProgress) || 0),
    empireSectorReady: Boolean(world.empireSectorReady),
    empireSectorCount: Math.max(0, Math.round(Number(world.empireSectorCount) || 0)),
    lastEmpireSectorTick: Math.max(0, Math.round(Number(world.lastEmpireSectorTick) || 0)),
    empireLegacyProgress: Math.max(0, Number(world.empireLegacyProgress) || 0),
    empireLegacyLevel: Math.max(0, Math.round(Number(world.empireLegacyLevel) || 0)),
    empireLegacyReady: Boolean(world.empireLegacyReady),
    empireLegacyComplete: Boolean(world.empireLegacyComplete),
    lastEmpireLegacyTick: Math.max(0, Math.round(Number(world.lastEmpireLegacyTick) || 0)),
    config: {
      startingOrganisms: CONFIG.STARTING_ORGANISMS,
      startingFood: CONFIG.STARTING_FOOD,
      maxFood: CONFIG.MAX_FOOD,
      maxOrganisms: CONFIG.MAX_ORGANISMS,
      organismDrawSize: CONFIG.ORGANISM_DRAW_SIZE,
      foodDrawSize: CONFIG.FOOD_DRAW_SIZE,
      fertileFoodGrowthChance: CONFIG.FERTILE_FOOD_GROWTH_CHANCE,
      barrenFoodGrowthChance: CONFIG.BARREN_FOOD_GROWTH_CHANCE,
      ticksPerSimUpdate: CONFIG.TICKS_PER_SIM_UPDATE,
      simSpeedMultiplier: CONFIG.SIM_SPEED_MULTIPLIER,
      traitMutationChance: CONFIG.TRAIT_MUTATION_CHANCE,
      traitVisionMin: CONFIG.TRAIT_VISION_MIN,
      traitVisionMax: CONFIG.TRAIT_VISION_MAX,
      traitVisionDefault: CONFIG.TRAIT_VISION_DEFAULT,
      traitVisionMutationStep: CONFIG.TRAIT_VISION_MUTATION_STEP,
      traitMetabolismMin: CONFIG.TRAIT_METABOLISM_MIN,
      traitMetabolismMax: CONFIG.TRAIT_METABOLISM_MAX,
      traitMetabolismDefault: CONFIG.TRAIT_METABOLISM_DEFAULT,
      traitMetabolismMutationStep: CONFIG.TRAIT_METABOLISM_MUTATION_STEP,
      traitReproductionEnergyMin: CONFIG.TRAIT_REPRODUCTION_ENERGY_MIN,
      traitReproductionEnergyMax: CONFIG.TRAIT_REPRODUCTION_ENERGY_MAX,
      traitReproductionEnergyDefault: CONFIG.TRAIT_REPRODUCTION_ENERGY_DEFAULT,
      traitReproductionEnergyMutationStep: CONFIG.TRAIT_REPRODUCTION_ENERGY_MUTATION_STEP,
      traitMovementTendencyMin: CONFIG.TRAIT_MOVEMENT_TENDENCY_MIN,
      traitMovementTendencyMax: CONFIG.TRAIT_MOVEMENT_TENDENCY_MAX,
      traitMovementTendencyDefault: CONFIG.TRAIT_MOVEMENT_TENDENCY_DEFAULT,
      traitMovementTendencyMutationStep: CONFIG.TRAIT_MOVEMENT_TENDENCY_MUTATION_STEP,
      traitTerrainAffinityMin: CONFIG.TRAIT_TERRAIN_AFFINITY_MIN,
      traitTerrainAffinityMax: CONFIG.TRAIT_TERRAIN_AFFINITY_MAX,
      traitTerrainAffinityDefault: CONFIG.TRAIT_TERRAIN_AFFINITY_DEFAULT,
      traitTerrainAffinityMutationStep: CONFIG.TRAIT_TERRAIN_AFFINITY_MUTATION_STEP,
      terrainMismatchMaxEnergyCost: CONFIG.TERRAIN_MISMATCH_MAX_ENERGY_COST,
      traitHistorySampleInterval: CONFIG.TRAIT_HISTORY_SAMPLE_INTERVAL,
      traitHistoryMaxSamples: CONFIG.TRAIT_HISTORY_MAX_SAMPLES,
      lineageDivergenceScoreForNewLineage: CONFIG.LINEAGE_DIVERGENCE_SCORE_FOR_NEW_LINEAGE,
      lineageRegistryVersion: 1,
      lineageColors: CONFIG.LINEAGE_COLORS.slice(),
      settlementMinLineagePopulation: CONFIG.SETTLEMENT_MIN_LINEAGE_POPULATION,
      settlementMinLineagePeakPopulation: CONFIG.SETTLEMENT_MIN_LINEAGE_PEAK_POPULATION,
      settlementRadius: CONFIG.SETTLEMENT_RADIUS,
      settlementGrowthInterval: CONFIG.SETTLEMENT_GROWTH_INTERVAL,
      settlementFoodHarvestPerGrowth: CONFIG.SETTLEMENT_FOOD_HARVEST_PER_GROWTH,
      settlementDevelopmentPerPopulation: CONFIG.SETTLEMENT_DEVELOPMENT_PER_POPULATION,
      settlementDevelopmentPerStoredFood: CONFIG.SETTLEMENT_DEVELOPMENT_PER_STORED_FOOD,
      settlementLevelDevelopment: CONFIG.SETTLEMENT_LEVEL_DEVELOPMENT,
      settlementInfluenceBaseRadius: CONFIG.SETTLEMENT_INFLUENCE_BASE_RADIUS,
      settlementInfluenceRadiusPerLevel: CONFIG.SETTLEMENT_INFLUENCE_RADIUS_PER_LEVEL,
      settlementOutpostMinLevel: CONFIG.SETTLEMENT_OUTPOST_MIN_LEVEL,
      settlementOutpostMinStoredFood: CONFIG.SETTLEMENT_OUTPOST_MIN_STORED_FOOD,
      settlementOutpostMinDevelopment: CONFIG.SETTLEMENT_OUTPOST_MIN_DEVELOPMENT,
      settlementOutpostFoodCost: CONFIG.SETTLEMENT_OUTPOST_FOOD_COST,
      settlementOutpostDevelopmentCost: CONFIG.SETTLEMENT_OUTPOST_DEVELOPMENT_COST,
      settlementOutpostCooldown: CONFIG.SETTLEMENT_OUTPOST_COOLDOWN,
      settlementOutpostSearchRadius: CONFIG.SETTLEMENT_OUTPOST_SEARCH_RADIUS,
      settlementOutpostMinDistance: CONFIG.SETTLEMENT_OUTPOST_MIN_DISTANCE,
      settlementOutpostMaxChildren: CONFIG.SETTLEMENT_OUTPOST_MAX_CHILDREN,
      settlementRouteTransferInterval: CONFIG.SETTLEMENT_ROUTE_TRANSFER_INTERVAL,
      settlementRouteFoodTransfer: CONFIG.SETTLEMENT_ROUTE_FOOD_TRANSFER,
      settlementRouteMinParentStoredFood: CONFIG.SETTLEMENT_ROUTE_MIN_PARENT_STORED_FOOD,
      settlementSupplyGrowthInterval: CONFIG.SETTLEMENT_SUPPLY_GROWTH_INTERVAL,
      settlementSupplyGrowthFoodCost: CONFIG.SETTLEMENT_SUPPLY_GROWTH_FOOD_COST,
      settlementDevelopmentPerSuppliedFood: CONFIG.SETTLEMENT_DEVELOPMENT_PER_SUPPLIED_FOOD,
      settlementColonyLevel: CONFIG.SETTLEMENT_COLONY_LEVEL,
      colonyNetworkEraScore: CONFIG.COLONY_NETWORK_ERA_SCORE,
      colonyNetworkRouteScore: CONFIG.COLONY_NETWORK_ROUTE_SCORE,
      colonyNetworkStoredFoodScore: CONFIG.COLONY_NETWORK_STORED_FOOD_SCORE,
      colonyNetworkTransferredFoodScore: CONFIG.COLONY_NETWORK_TRANSFERRED_FOOD_SCORE,
      colonyNetworkClaimedTileScore: CONFIG.COLONY_NETWORK_CLAIMED_TILE_SCORE,
      spaceProgramMinNetworkScore: CONFIG.SPACE_PROGRAM_MIN_NETWORK_SCORE,
      spaceProgramMinColonies: CONFIG.SPACE_PROGRAM_MIN_COLONIES,
      spaceProgramMinActiveRoutes: CONFIG.SPACE_PROGRAM_MIN_ACTIVE_ROUTES,
      spaceProgramProgressInterval: CONFIG.SPACE_PROGRAM_PROGRESS_INTERVAL,
      spaceProgramColonyFoodCost: CONFIG.SPACE_PROGRAM_COLONY_FOOD_COST,
      spaceProgramProgressPerNetworkScore: CONFIG.SPACE_PROGRAM_PROGRESS_PER_NETWORK_SCORE,
      spaceProgramProgressPerActiveRoute: CONFIG.SPACE_PROGRAM_PROGRESS_PER_ACTIVE_ROUTE,
      spaceProgramLaunchThreshold: CONFIG.SPACE_PROGRAM_LAUNCH_THRESHOLD,
      orbitalAssetScore: CONFIG.ORBITAL_ASSET_SCORE,
      orbitalPlatformScore: CONFIG.ORBITAL_PLATFORM_SCORE,
      planetarySurveyMinInfrastructure: CONFIG.PLANETARY_SURVEY_MIN_INFRASTRUCTURE,
      planetarySurveyInterval: CONFIG.PLANETARY_SURVEY_INTERVAL,
      planetarySurveyProgressPerInfrastructure: CONFIG.PLANETARY_SURVEY_PROGRESS_PER_INFRASTRUCTURE,
      planetarySurveyProgressPerOrbitalAsset: CONFIG.PLANETARY_SURVEY_PROGRESS_PER_ORBITAL_ASSET,
      planetaryDiscoveryThreshold: CONFIG.PLANETARY_DISCOVERY_THRESHOLD,
      planetarySurveyMaxBodies: CONFIG.PLANETARY_SURVEY_MAX_BODIES,
      interplanetaryBodyCount: CONFIG.INTERPLANETARY_BODY_COUNT,
      probeMissionMinBodies: CONFIG.PROBE_MISSION_MIN_BODIES,
      probeMissionInterval: CONFIG.PROBE_MISSION_INTERVAL,
      probeMissionProgressPerBody: CONFIG.PROBE_MISSION_PROGRESS_PER_BODY,
      probeMissionProgressPerInfrastructure: CONFIG.PROBE_MISSION_PROGRESS_PER_INFRASTRUCTURE,
      probeMissionThreshold: CONFIG.PROBE_MISSION_THRESHOLD,
      probeMissionCompleteTicks: CONFIG.PROBE_MISSION_COMPLETE_TICKS,
      stellarCartographyMissionCount: CONFIG.STELLAR_CARTOGRAPHY_MISSION_COUNT,
      starMapMinCompletedProbes: CONFIG.STAR_MAP_MIN_COMPLETED_PROBES,
      starMapInterval: CONFIG.STAR_MAP_INTERVAL,
      starMapProgressPerCompletedProbe: CONFIG.STAR_MAP_PROGRESS_PER_COMPLETED_PROBE,
      starMapProgressPerInfrastructure: CONFIG.STAR_MAP_PROGRESS_PER_INFRASTRUCTURE,
      starSystemDiscoveryThreshold: CONFIG.STAR_SYSTEM_DISCOVERY_THRESHOLD,
      starMapMaxSystems: CONFIG.STAR_MAP_MAX_SYSTEMS,
      galacticMapSystemCount: CONFIG.GALACTIC_MAP_SYSTEM_COUNT,
      galacticInfluenceMinSystems: CONFIG.GALACTIC_INFLUENCE_MIN_SYSTEMS,
      galacticInfluenceInterval: CONFIG.GALACTIC_INFLUENCE_INTERVAL,
      galacticInfluenceProgressPerMapValue: CONFIG.GALACTIC_INFLUENCE_PROGRESS_PER_MAP_VALUE,
      galacticInfluenceProgressPerCompletedProbe: CONFIG.GALACTIC_INFLUENCE_PROGRESS_PER_COMPLETED_PROBE,
      galacticInfluenceProgressPerInfrastructure: CONFIG.GALACTIC_INFLUENCE_PROGRESS_PER_INFRASTRUCTURE,
      galacticSystemClaimThreshold: CONFIG.GALACTIC_SYSTEM_CLAIM_THRESHOLD,
      protoEmpireSystemCount: CONFIG.PROTO_EMPIRE_SYSTEM_COUNT,
      interstellarFleetMinClaimedSystems: CONFIG.INTERSTELLAR_FLEET_MIN_CLAIMED_SYSTEMS,
      interstellarFleetBuildInterval: CONFIG.INTERSTELLAR_FLEET_BUILD_INTERVAL,
      interstellarFleetProgressPerClaimedSystem: CONFIG.INTERSTELLAR_FLEET_PROGRESS_PER_CLAIMED_SYSTEM,
      interstellarFleetProgressPerCompletedProbe: CONFIG.INTERSTELLAR_FLEET_PROGRESS_PER_COMPLETED_PROBE,
      interstellarFleetProgressPerInfrastructure: CONFIG.INTERSTELLAR_FLEET_PROGRESS_PER_INFRASTRUCTURE,
      interstellarFleetBuildThreshold: CONFIG.INTERSTELLAR_FLEET_BUILD_THRESHOLD,
      interstellarFleetTravelTicks: CONFIG.INTERSTELLAR_FLEET_TRAVEL_TICKS,
      interstellarFleetMaxMissions: CONFIG.INTERSTELLAR_FLEET_MAX_MISSIONS,
      empireNetworkCompletedFleets: CONFIG.EMPIRE_NETWORK_COMPLETED_FLEETS,
      empireSectorMinCompletedFleets: CONFIG.EMPIRE_SECTOR_MIN_COMPLETED_FLEETS,
      empireSectorBuildInterval: CONFIG.EMPIRE_SECTOR_BUILD_INTERVAL,
      empireSectorProgressPerCompletedFleet: CONFIG.EMPIRE_SECTOR_PROGRESS_PER_COMPLETED_FLEET,
      empireSectorProgressPerClaimedSystem: CONFIG.EMPIRE_SECTOR_PROGRESS_PER_CLAIMED_SYSTEM,
      empireSectorProgressPerInfrastructure: CONFIG.EMPIRE_SECTOR_PROGRESS_PER_INFRASTRUCTURE,
      empireSectorBuildThreshold: CONFIG.EMPIRE_SECTOR_BUILD_THRESHOLD,
      empireSectorMaxSectors: CONFIG.EMPIRE_SECTOR_MAX_SECTORS,
      galacticEmpireSectorCount: CONFIG.GALACTIC_EMPIRE_SECTOR_COUNT,
      empireLegacyMinSectors: CONFIG.EMPIRE_LEGACY_MIN_SECTORS,
      empireLegacyInterval: CONFIG.EMPIRE_LEGACY_INTERVAL,
      empireLegacyProgressPerSector: CONFIG.EMPIRE_LEGACY_PROGRESS_PER_SECTOR,
      empireLegacyProgressPerCompletedFleet: CONFIG.EMPIRE_LEGACY_PROGRESS_PER_COMPLETED_FLEET,
      empireLegacyProgressPerClaimedSystem: CONFIG.EMPIRE_LEGACY_PROGRESS_PER_CLAIMED_SYSTEM,
      empireLegacyThreshold: CONFIG.EMPIRE_LEGACY_THRESHOLD,
      ascendantEmpireLegacyLevel: CONFIG.ASCENDANT_EMPIRE_LEGACY_LEVEL
    },
    terrain: world.terrain.slice(),
    food: world.food.map(copyFoodForSave),
    organisms: world.organisms.map(copyOrganismForSave),
    traitHistory: world.traitHistory.map(copyTraitHistorySampleForSave),
    lineages: getLineagesForSave(),
    settlements: getSettlementsForSave(),
    settlementRoutes: getSettlementRoutesForSave(),
    orbitalAssets: getOrbitalAssetsForSave(),
    planetaryBodies: getPlanetaryBodiesForSave(),
    probeMissions: getProbeMissionsForSave(),
    starSystems: getStarSystemsForSave(),
    interstellarFleets: getInterstellarFleetsForSave(),
    empireSectors: getEmpireSectorsForSave()
  };
}

function saveWorldToIndexedDB() {
  return openPixelSimDatabase().then(function(db) {
    return new Promise(function(resolve, reject) {
      var saveData = createWorldSaveData();
      var transaction = db.transaction(PIXELSIM_SAVE_STORE, "readwrite");
      var store = transaction.objectStore(PIXELSIM_SAVE_STORE);

      transaction.oncomplete = function() {
        db.close();
        resolve(saveData);
      };

      transaction.onerror = function() {
        db.close();
        reject(new Error(transaction.error ? transaction.error.message : "Could not save world"));
      };

      store.put(saveData);
    });
  });
}

function validateWorldSaveData(saveData) {
  if (!saveData || saveData.id !== PIXELSIM_SAVE_ID) {
    throw new Error("No PixelSim save found");
  }

  if (saveData.version !== PIXELSIM_SAVE_VERSION) {
    throw new Error("Unsupported save version");
  }

  if (!Array.isArray(saveData.terrain) || saveData.terrain.length !== WORLD_WIDTH * WORLD_HEIGHT) {
    throw new Error("Save terrain does not match this world size");
  }

  if (!Array.isArray(saveData.food) || !Array.isArray(saveData.organisms)) {
    throw new Error("Save is missing food or organism data");
  }
}

function restoreFood(food) {
  return {
    x: clamp(Math.round(Number(food.x)), 0, WORLD_WIDTH - 1),
    y: clamp(Math.round(Number(food.y)), 0, WORLD_HEIGHT - 1)
  };
}

function restoreNumber(value, fallback) {
  var numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function restoreClampedNumber(value, fallback, minValue, maxValue) {
  return clamp(restoreNumber(value, fallback), minValue, maxValue);
}

function restoreOrganismTraits(traits) {
  traits = traits || {};

  return {
    vision: restoreClampedNumber(
      traits.vision,
      CONFIG.TRAIT_VISION_DEFAULT,
      CONFIG.TRAIT_VISION_MIN,
      CONFIG.TRAIT_VISION_MAX
    ),
    metabolism: restoreClampedNumber(
      traits.metabolism,
      CONFIG.TRAIT_METABOLISM_DEFAULT,
      CONFIG.TRAIT_METABOLISM_MIN,
      CONFIG.TRAIT_METABOLISM_MAX
    ),
    reproductionEnergy: restoreClampedNumber(
      traits.reproductionEnergy,
      CONFIG.TRAIT_REPRODUCTION_ENERGY_DEFAULT,
      CONFIG.TRAIT_REPRODUCTION_ENERGY_MIN,
      CONFIG.TRAIT_REPRODUCTION_ENERGY_MAX
    ),
    movementTendency: restoreClampedNumber(
      traits.movementTendency,
      CONFIG.TRAIT_MOVEMENT_TENDENCY_DEFAULT,
      CONFIG.TRAIT_MOVEMENT_TENDENCY_MIN,
      CONFIG.TRAIT_MOVEMENT_TENDENCY_MAX
    ),
    terrainAffinity: restoreClampedNumber(
      traits.terrainAffinity,
      CONFIG.TRAIT_TERRAIN_AFFINITY_DEFAULT,
      CONFIG.TRAIT_TERRAIN_AFFINITY_MIN,
      CONFIG.TRAIT_TERRAIN_AFFINITY_MAX
    )
  };
}

function restoreLineageRecord(lineage) {
  lineage = lineage || {};

  var id = Math.max(1, Math.round(restoreNumber(lineage.id, 1)));
  var record = {
    id: id,
    parentId: Math.max(0, Math.round(restoreNumber(lineage.parentId, 0))),
    createdTick: Math.max(0, Math.round(restoreNumber(lineage.createdTick, 0))),
    founderGeneration: Math.max(0, Math.round(restoreNumber(lineage.founderGeneration, 0))),
    founderTraits: restoreOrganismTraits(lineage.founderTraits),
    activeCount: Math.max(0, Math.round(restoreNumber(lineage.activeCount, 0))),
    lastSeenTick: Math.max(0, Math.round(restoreNumber(lineage.lastSeenTick, 0))),
    peakPopulation: Math.max(0, Math.round(restoreNumber(lineage.peakPopulation, 0))),
    isExtinct: Boolean(lineage.isExtinct)
  };

  if (record.lastSeenTick < record.createdTick) {
    record.lastSeenTick = record.createdTick;
  }

  if (record.peakPopulation < record.activeCount) {
    record.peakPopulation = record.activeCount;
  }

  return record;
}

function restoreLineages(lineages) {
  var restoredLineages = {};

  if (!Array.isArray(lineages)) {
    return restoredLineages;
  }

  for (var i = 0; i < lineages.length; i++) {
    var record = restoreLineageRecord(lineages[i]);
    restoredLineages[String(record.id)] = record;

    if (record.id >= world.nextLineageId) {
      world.nextLineageId = record.id + 1;
    }
  }

  return restoredLineages;
}

function restoreSettlement(settlement) {
  settlement = settlement || {};

  var restoredSettlement = {
    id: Math.max(1, Math.round(restoreNumber(settlement.id, world.nextSettlementId))),
    lineageId: Math.max(1, Math.round(restoreNumber(settlement.lineageId, 1))),
    x: clamp(Math.round(restoreNumber(settlement.x, 0)), 0, WORLD_WIDTH - 1),
    y: clamp(Math.round(restoreNumber(settlement.y, 0)), 0, WORLD_HEIGHT - 1),
    foundedTick: Math.max(0, Math.round(restoreNumber(settlement.foundedTick, 0))),
    radius: Math.max(1, Math.round(restoreNumber(settlement.radius, CONFIG.SETTLEMENT_RADIUS))),
    population: Math.max(0, Math.round(restoreNumber(settlement.population, 0))),
    foodStock: Math.max(0, Math.round(restoreNumber(settlement.foodStock, 0))),
    storedFood: Math.max(0, Math.round(restoreNumber(settlement.storedFood, 0))),
    development: Math.max(0, restoreNumber(settlement.development, 0)),
    level: Math.max(1, Math.round(restoreNumber(settlement.level, 1))),
    lastGrowthTick: Math.max(
      0,
      Math.round(restoreNumber(settlement.lastGrowthTick, restoreNumber(settlement.foundedTick, 0)))
    ),
    influenceRadius: Math.max(1, Math.round(restoreNumber(settlement.influenceRadius, CONFIG.SETTLEMENT_INFLUENCE_BASE_RADIUS))),
    claimedTiles: Math.max(0, Math.round(restoreNumber(settlement.claimedTiles, 0))),
    claimedFood: Math.max(0, Math.round(restoreNumber(settlement.claimedFood, 0))),
    parentSettlementId: Math.max(0, Math.round(restoreNumber(settlement.parentSettlementId, 0))),
    isOutpost: Boolean(settlement.isOutpost),
    isColony: Boolean(settlement.isColony),
    lastOutpostTick: Math.max(
      0,
      Math.round(restoreNumber(settlement.lastOutpostTick, restoreNumber(settlement.foundedTick, 0)))
    ),
    lastSupplyGrowthTick: Math.max(
      0,
      Math.round(restoreNumber(settlement.lastSupplyGrowthTick, restoreNumber(settlement.foundedTick, 0)))
    ),
    isActive: Boolean(settlement.isActive),
    lastActiveTick: Math.max(0, Math.round(restoreNumber(settlement.lastActiveTick, 0)))
  };

  if (typeof getSettlementInfluenceRadius === "function") {
    restoredSettlement.influenceRadius = getSettlementInfluenceRadius(restoredSettlement);
  }

  if (typeof countSettlementClaimedTiles === "function") {
    restoredSettlement.claimedTiles = countSettlementClaimedTiles(restoredSettlement);
  }

  if (restoredSettlement.isOutpost && restoredSettlement.level >= CONFIG.SETTLEMENT_COLONY_LEVEL) {
    restoredSettlement.isColony = true;
  }

  if (restoredSettlement.id >= world.nextSettlementId) {
    world.nextSettlementId = restoredSettlement.id + 1;
  }

  return restoredSettlement;
}

function restoreSettlements(settlements) {
  if (!Array.isArray(settlements)) {
    return [];
  }

  return settlements.map(restoreSettlement);
}

function restoreSettlementRoute(route) {
  route = route || {};

  var restoredRoute = {
    id: Math.max(1, Math.round(restoreNumber(route.id, world.nextSettlementRouteId))),
    parentSettlementId: Math.max(1, Math.round(restoreNumber(route.parentSettlementId, 1))),
    childSettlementId: Math.max(1, Math.round(restoreNumber(route.childSettlementId, 1))),
    lineageId: Math.max(1, Math.round(restoreNumber(route.lineageId, 1))),
    foundedTick: Math.max(0, Math.round(restoreNumber(route.foundedTick, 0))),
    distance: Math.max(0, Math.round(restoreNumber(route.distance, 0))),
    foodTransferred: Math.max(0, Math.round(restoreNumber(route.foodTransferred, 0))),
    lastTransferTick: Math.max(0, Math.round(restoreNumber(route.lastTransferTick, restoreNumber(route.foundedTick, 0)))),
    isActive: Boolean(route.isActive)
  };

  if (restoredRoute.id >= world.nextSettlementRouteId) {
    world.nextSettlementRouteId = restoredRoute.id + 1;
  }

  return restoredRoute;
}

function restoreSettlementRoutes(routes) {
  if (!Array.isArray(routes)) {
    return [];
  }

  return routes.map(restoreSettlementRoute);
}

function restoreOrbitalAsset(asset) {
  asset = asset || {};

  var restoredAsset = {
    id: Math.max(1, Math.round(restoreNumber(asset.id, world.nextOrbitalAssetId))),
    launchNumber: Math.max(1, Math.round(restoreNumber(asset.launchNumber, asset.id || 1))),
    launchedTick: Math.max(0, Math.round(restoreNumber(asset.launchedTick, 0))),
    infrastructureScore: Math.max(0, Math.round(restoreNumber(asset.infrastructureScore, CONFIG.ORBITAL_ASSET_SCORE))),
    orbitAngle: Math.max(0, Math.round(restoreNumber(asset.orbitAngle, 0))) % 360,
    orbitBand: Math.max(1, Math.round(restoreNumber(asset.orbitBand, 1))),
    isActive: asset.isActive !== false
  };

  if (restoredAsset.id >= world.nextOrbitalAssetId) {
    world.nextOrbitalAssetId = restoredAsset.id + 1;
  }

  return restoredAsset;
}

function restoreOrbitalAssets(assets) {
  if (!Array.isArray(assets)) {
    return [];
  }

  return assets.map(restoreOrbitalAsset);
}

function restorePlanetaryBody(body) {
  body = body || {};

  var id = Math.max(1, Math.round(restoreNumber(body.id, world.nextPlanetaryBodyId)));
  var restoredBody = {
    id: id,
    name: String(body.name || "P-" + String(100 + id)),
    discoveredTick: Math.max(0, Math.round(restoreNumber(body.discoveredTick, 0))),
    surveyValue: Math.max(1, Math.round(restoreNumber(body.surveyValue, 20 + id * 7))),
    orbitAngle: Math.max(0, Math.round(restoreNumber(body.orbitAngle, id * 67))) % 360,
    orbitRadius: Math.max(1, Math.round(restoreNumber(body.orbitRadius, 64 + id * 10))),
    isSurveyed: body.isSurveyed !== false
  };

  if (restoredBody.id >= world.nextPlanetaryBodyId) {
    world.nextPlanetaryBodyId = restoredBody.id + 1;
  }

  return restoredBody;
}

function restorePlanetaryBodies(bodies) {
  if (!Array.isArray(bodies)) {
    return [];
  }

  return bodies.map(restorePlanetaryBody);
}

function restoreProbeMission(mission) {
  mission = mission || {};

  var restoredMission = {
    id: Math.max(1, Math.round(restoreNumber(mission.id, world.nextProbeMissionId))),
    targetBodyId: Math.max(0, Math.round(restoreNumber(mission.targetBodyId, 0))),
    launchedTick: Math.max(0, Math.round(restoreNumber(mission.launchedTick, 0))),
    arrivalTick: Math.max(0, Math.round(restoreNumber(mission.arrivalTick, 0))),
    progress: Math.max(0, Math.min(1, restoreNumber(mission.progress, 0))),
    isComplete: Boolean(mission.isComplete)
  };

  if (restoredMission.arrivalTick < restoredMission.launchedTick) {
    restoredMission.arrivalTick = restoredMission.launchedTick;
  }

  if (restoredMission.id >= world.nextProbeMissionId) {
    world.nextProbeMissionId = restoredMission.id + 1;
  }

  return restoredMission;
}

function restoreProbeMissions(missions) {
  if (!Array.isArray(missions)) {
    return [];
  }

  return missions.map(restoreProbeMission);
}

function restoreStarSystem(system) {
  system = system || {};

  var id = Math.max(1, Math.round(restoreNumber(system.id, world.nextStarSystemId)));
  var restoredSystem = {
    id: id,
    name: String(system.name || "S-" + String(200 + id)),
    discoveredTick: Math.max(0, Math.round(restoreNumber(system.discoveredTick, 0))),
    mapValue: Math.max(1, Math.round(restoreNumber(system.mapValue, 40 + id * 11))),
    mapX: Math.max(-1, Math.min(1, restoreNumber(system.mapX, Math.cos(id * 2.1)))),
    mapY: Math.max(-1, Math.min(1, restoreNumber(system.mapY, Math.sin(id * 2.1)))),
    isMapped: system.isMapped !== false,
    influenceValue: Math.max(1, Math.round(restoreNumber(system.influenceValue, restoreNumber(system.mapValue, 40 + id * 11)))),
    isClaimed: Boolean(system.isClaimed),
    claimedTick: Math.max(0, Math.round(restoreNumber(system.claimedTick, 0)))
  };

  if (restoredSystem.id >= world.nextStarSystemId) {
    world.nextStarSystemId = restoredSystem.id + 1;
  }

  return restoredSystem;
}

function restoreStarSystems(systems) {
  if (!Array.isArray(systems)) {
    return [];
  }

  return systems.map(restoreStarSystem);
}

function restoreInterstellarFleet(fleet) {
  fleet = fleet || {};

  var restoredFleet = {
    id: Math.max(1, Math.round(restoreNumber(fleet.id, world.nextInterstellarFleetId))),
    sourceSystemId: Math.max(1, Math.round(restoreNumber(fleet.sourceSystemId, 1))),
    targetSystemId: Math.max(1, Math.round(restoreNumber(fleet.targetSystemId, 1))),
    launchedTick: Math.max(0, Math.round(restoreNumber(fleet.launchedTick, 0))),
    arrivalTick: Math.max(0, Math.round(restoreNumber(fleet.arrivalTick, 0))),
    progress: Math.max(0, Math.min(1, restoreNumber(fleet.progress, 0))),
    isComplete: Boolean(fleet.isComplete)
  };

  if (restoredFleet.arrivalTick < restoredFleet.launchedTick) {
    restoredFleet.arrivalTick = restoredFleet.launchedTick;
  }

  if (restoredFleet.id >= world.nextInterstellarFleetId) {
    world.nextInterstellarFleetId = restoredFleet.id + 1;
  }

  return restoredFleet;
}

function restoreInterstellarFleets(fleets) {
  if (!Array.isArray(fleets)) {
    return [];
  }

  return fleets.map(restoreInterstellarFleet);
}

function restoreEmpireSector(sector) {
  sector = sector || {};

  var restoredSector = {
    id: Math.max(1, Math.round(restoreNumber(sector.id, world.nextEmpireSectorId))),
    systemId: Math.max(1, Math.round(restoreNumber(sector.systemId, 1))),
    foundedTick: Math.max(0, Math.round(restoreNumber(sector.foundedTick, 0))),
    controlValue: Math.max(1, Math.round(restoreNumber(sector.controlValue, 40))),
    controlRadius: Math.max(0.08, restoreNumber(sector.controlRadius, 0.18)),
    isActive: sector.isActive !== false
  };

  if (restoredSector.id >= world.nextEmpireSectorId) {
    world.nextEmpireSectorId = restoredSector.id + 1;
  }

  return restoredSector;
}

function restoreEmpireSectors(sectors) {
  if (!Array.isArray(sectors)) {
    return [];
  }

  return sectors.map(restoreEmpireSector);
}

function restoreOrganism(organism) {
  var restoredOrganism = {
    x: clamp(Math.round(Number(organism.x)), 0, WORLD_WIDTH - 1),
    y: clamp(Math.round(Number(organism.y)), 0, WORLD_HEIGHT - 1),
    prevX: clamp(Math.round(Number(organism.prevX)), 0, WORLD_WIDTH - 1),
    prevY: clamp(Math.round(Number(organism.prevY)), 0, WORLD_HEIGHT - 1),
    energy: Number(organism.energy),
    age: Number(organism.age),
    directionX: clamp(Math.round(Number(organism.directionX)), -1, 1),
    directionY: clamp(Math.round(Number(organism.directionY)), -1, 1),
    traits: restoreOrganismTraits(organism.traits),
    lineageId: Math.round(restoreNumber(organism.lineageId, 0)),
    lineageParentId: Math.max(0, Math.round(restoreNumber(organism.lineageParentId, 0))),
    generation: Math.max(0, Math.round(restoreNumber(organism.generation, 0)))
  };

  ensureOrganismLineage(restoredOrganism);
  return restoredOrganism;
}

function restoreTraitHistorySample(sample) {
  return {
    tick: Math.max(0, Math.round(restoreNumber(sample.tick, 0))),
    population: Math.max(0, Math.round(restoreNumber(sample.population, 0))),
    vision: restoreClampedNumber(
      sample.vision,
      CONFIG.TRAIT_VISION_DEFAULT,
      CONFIG.TRAIT_VISION_MIN,
      CONFIG.TRAIT_VISION_MAX
    ),
    metabolism: restoreClampedNumber(
      sample.metabolism,
      CONFIG.TRAIT_METABOLISM_DEFAULT,
      CONFIG.TRAIT_METABOLISM_MIN,
      CONFIG.TRAIT_METABOLISM_MAX
    ),
    reproductionEnergy: restoreClampedNumber(
      sample.reproductionEnergy,
      CONFIG.TRAIT_REPRODUCTION_ENERGY_DEFAULT,
      CONFIG.TRAIT_REPRODUCTION_ENERGY_MIN,
      CONFIG.TRAIT_REPRODUCTION_ENERGY_MAX
    ),
    movementTendency: restoreClampedNumber(
      sample.movementTendency,
      CONFIG.TRAIT_MOVEMENT_TENDENCY_DEFAULT,
      CONFIG.TRAIT_MOVEMENT_TENDENCY_MIN,
      CONFIG.TRAIT_MOVEMENT_TENDENCY_MAX
    ),
    terrainAffinity: restoreClampedNumber(
      sample.terrainAffinity,
      CONFIG.TRAIT_TERRAIN_AFFINITY_DEFAULT,
      CONFIG.TRAIT_TERRAIN_AFFINITY_MIN,
      CONFIG.TRAIT_TERRAIN_AFFINITY_MAX
    )
  };
}

function restoreTraitHistory(traitHistory) {
  if (!Array.isArray(traitHistory)) {
    return [];
  }

  return traitHistory
    .slice(-CONFIG.TRAIT_HISTORY_MAX_SAMPLES)
    .map(restoreTraitHistorySample);
}

function countFertileTiles() {
  var fertileTiles = 0;

  for (var i = 0; i < world.terrain.length; i++) {
    if (world.terrain[i] === CONFIG.TERRAIN_FERTILE) {
      fertileTiles++;
    }
  }

  return fertileTiles;
}

function applySaveConfig(saveConfig) {
  if (!saveConfig) {
    return;
  }

  if (typeof saveConfig.startingFood === "number") {
    CONFIG.STARTING_FOOD = saveConfig.startingFood;
  }

  if (typeof saveConfig.maxFood === "number") {
    CONFIG.MAX_FOOD = saveConfig.maxFood;
  }

  if (typeof saveConfig.maxOrganisms === "number") {
    CONFIG.MAX_ORGANISMS = saveConfig.maxOrganisms;
  }

  if (typeof saveConfig.organismDrawSize === "number") {
    CONFIG.ORGANISM_DRAW_SIZE = saveConfig.organismDrawSize;
  }

  if (typeof saveConfig.foodDrawSize === "number") {
    CONFIG.FOOD_DRAW_SIZE = saveConfig.foodDrawSize;
  }

  if (typeof saveConfig.fertileFoodGrowthChance === "number") {
    CONFIG.FERTILE_FOOD_GROWTH_CHANCE = saveConfig.fertileFoodGrowthChance;
  }

  if (typeof saveConfig.barrenFoodGrowthChance === "number") {
    CONFIG.BARREN_FOOD_GROWTH_CHANCE = saveConfig.barrenFoodGrowthChance;
  }

  if (typeof saveConfig.traitMutationChance === "number") {
    CONFIG.TRAIT_MUTATION_CHANCE = saveConfig.traitMutationChance;
  }

  if (typeof saveConfig.traitVisionMin === "number") {
    CONFIG.TRAIT_VISION_MIN = saveConfig.traitVisionMin;
  }

  if (typeof saveConfig.traitVisionMax === "number") {
    CONFIG.TRAIT_VISION_MAX = saveConfig.traitVisionMax;
  }

  if (typeof saveConfig.traitVisionDefault === "number") {
    CONFIG.TRAIT_VISION_DEFAULT = saveConfig.traitVisionDefault;
  }

  if (typeof saveConfig.traitVisionMutationStep === "number") {
    CONFIG.TRAIT_VISION_MUTATION_STEP = saveConfig.traitVisionMutationStep;
  }

  if (typeof saveConfig.traitMetabolismMin === "number") {
    CONFIG.TRAIT_METABOLISM_MIN = saveConfig.traitMetabolismMin;
  }

  if (typeof saveConfig.traitMetabolismMax === "number") {
    CONFIG.TRAIT_METABOLISM_MAX = saveConfig.traitMetabolismMax;
  }

  if (typeof saveConfig.traitMetabolismDefault === "number") {
    CONFIG.TRAIT_METABOLISM_DEFAULT = saveConfig.traitMetabolismDefault;
  }

  if (typeof saveConfig.traitMetabolismMutationStep === "number") {
    CONFIG.TRAIT_METABOLISM_MUTATION_STEP = saveConfig.traitMetabolismMutationStep;
  }

  if (typeof saveConfig.traitReproductionEnergyMin === "number") {
    CONFIG.TRAIT_REPRODUCTION_ENERGY_MIN = saveConfig.traitReproductionEnergyMin;
  }

  if (typeof saveConfig.traitReproductionEnergyMax === "number") {
    CONFIG.TRAIT_REPRODUCTION_ENERGY_MAX = saveConfig.traitReproductionEnergyMax;
  }

  if (typeof saveConfig.traitReproductionEnergyDefault === "number") {
    CONFIG.TRAIT_REPRODUCTION_ENERGY_DEFAULT = saveConfig.traitReproductionEnergyDefault;
  }

  if (typeof saveConfig.traitReproductionEnergyMutationStep === "number") {
    CONFIG.TRAIT_REPRODUCTION_ENERGY_MUTATION_STEP = saveConfig.traitReproductionEnergyMutationStep;
  }

  if (typeof saveConfig.traitMovementTendencyMin === "number") {
    CONFIG.TRAIT_MOVEMENT_TENDENCY_MIN = saveConfig.traitMovementTendencyMin;
  }

  if (typeof saveConfig.traitMovementTendencyMax === "number") {
    CONFIG.TRAIT_MOVEMENT_TENDENCY_MAX = saveConfig.traitMovementTendencyMax;
  }

  if (typeof saveConfig.traitMovementTendencyDefault === "number") {
    CONFIG.TRAIT_MOVEMENT_TENDENCY_DEFAULT = saveConfig.traitMovementTendencyDefault;
  }

  if (typeof saveConfig.traitMovementTendencyMutationStep === "number") {
    CONFIG.TRAIT_MOVEMENT_TENDENCY_MUTATION_STEP = saveConfig.traitMovementTendencyMutationStep;
  }

  if (typeof saveConfig.traitTerrainAffinityMin === "number") {
    CONFIG.TRAIT_TERRAIN_AFFINITY_MIN = saveConfig.traitTerrainAffinityMin;
  }

  if (typeof saveConfig.traitTerrainAffinityMax === "number") {
    CONFIG.TRAIT_TERRAIN_AFFINITY_MAX = saveConfig.traitTerrainAffinityMax;
  }

  if (typeof saveConfig.traitTerrainAffinityDefault === "number") {
    CONFIG.TRAIT_TERRAIN_AFFINITY_DEFAULT = saveConfig.traitTerrainAffinityDefault;
  }

  if (typeof saveConfig.traitTerrainAffinityMutationStep === "number") {
    CONFIG.TRAIT_TERRAIN_AFFINITY_MUTATION_STEP = saveConfig.traitTerrainAffinityMutationStep;
  }

  if (typeof saveConfig.terrainMismatchMaxEnergyCost === "number") {
    CONFIG.TERRAIN_MISMATCH_MAX_ENERGY_COST = saveConfig.terrainMismatchMaxEnergyCost;
  }

  if (typeof saveConfig.traitHistorySampleInterval === "number") {
    CONFIG.TRAIT_HISTORY_SAMPLE_INTERVAL = saveConfig.traitHistorySampleInterval;
  }

  if (typeof saveConfig.traitHistoryMaxSamples === "number") {
    CONFIG.TRAIT_HISTORY_MAX_SAMPLES = saveConfig.traitHistoryMaxSamples;
  }

  if (typeof saveConfig.lineageDivergenceScoreForNewLineage === "number") {
    CONFIG.LINEAGE_DIVERGENCE_SCORE_FOR_NEW_LINEAGE = saveConfig.lineageDivergenceScoreForNewLineage;
  }

  if (Array.isArray(saveConfig.lineageColors) && saveConfig.lineageColors.length > 0) {
    CONFIG.LINEAGE_COLORS = saveConfig.lineageColors.slice();
  }

  if (typeof saveConfig.settlementMinLineagePopulation === "number") {
    CONFIG.SETTLEMENT_MIN_LINEAGE_POPULATION = saveConfig.settlementMinLineagePopulation;
  }

  if (typeof saveConfig.settlementMinLineagePeakPopulation === "number") {
    CONFIG.SETTLEMENT_MIN_LINEAGE_PEAK_POPULATION = saveConfig.settlementMinLineagePeakPopulation;
  }

  if (typeof saveConfig.settlementRadius === "number") {
    CONFIG.SETTLEMENT_RADIUS = saveConfig.settlementRadius;
  }

  if (typeof saveConfig.settlementGrowthInterval === "number") {
    CONFIG.SETTLEMENT_GROWTH_INTERVAL = saveConfig.settlementGrowthInterval;
  }

  if (typeof saveConfig.settlementFoodHarvestPerGrowth === "number") {
    CONFIG.SETTLEMENT_FOOD_HARVEST_PER_GROWTH = saveConfig.settlementFoodHarvestPerGrowth;
  }

  if (typeof saveConfig.settlementDevelopmentPerPopulation === "number") {
    CONFIG.SETTLEMENT_DEVELOPMENT_PER_POPULATION = saveConfig.settlementDevelopmentPerPopulation;
  }

  if (typeof saveConfig.settlementDevelopmentPerStoredFood === "number") {
    CONFIG.SETTLEMENT_DEVELOPMENT_PER_STORED_FOOD = saveConfig.settlementDevelopmentPerStoredFood;
  }

  if (typeof saveConfig.settlementLevelDevelopment === "number") {
    CONFIG.SETTLEMENT_LEVEL_DEVELOPMENT = saveConfig.settlementLevelDevelopment;
  }

  if (typeof saveConfig.settlementInfluenceBaseRadius === "number") {
    CONFIG.SETTLEMENT_INFLUENCE_BASE_RADIUS = saveConfig.settlementInfluenceBaseRadius;
  }

  if (typeof saveConfig.settlementInfluenceRadiusPerLevel === "number") {
    CONFIG.SETTLEMENT_INFLUENCE_RADIUS_PER_LEVEL = saveConfig.settlementInfluenceRadiusPerLevel;
  }

  if (typeof saveConfig.settlementOutpostMinLevel === "number") {
    CONFIG.SETTLEMENT_OUTPOST_MIN_LEVEL = saveConfig.settlementOutpostMinLevel;
  }

  if (typeof saveConfig.settlementOutpostMinStoredFood === "number") {
    CONFIG.SETTLEMENT_OUTPOST_MIN_STORED_FOOD = saveConfig.settlementOutpostMinStoredFood;
  }

  if (typeof saveConfig.settlementOutpostMinDevelopment === "number") {
    CONFIG.SETTLEMENT_OUTPOST_MIN_DEVELOPMENT = saveConfig.settlementOutpostMinDevelopment;
  }

  if (typeof saveConfig.settlementOutpostFoodCost === "number") {
    CONFIG.SETTLEMENT_OUTPOST_FOOD_COST = saveConfig.settlementOutpostFoodCost;
  }

  if (typeof saveConfig.settlementOutpostDevelopmentCost === "number") {
    CONFIG.SETTLEMENT_OUTPOST_DEVELOPMENT_COST = saveConfig.settlementOutpostDevelopmentCost;
  }

  if (typeof saveConfig.settlementOutpostCooldown === "number") {
    CONFIG.SETTLEMENT_OUTPOST_COOLDOWN = saveConfig.settlementOutpostCooldown;
  }

  if (typeof saveConfig.settlementOutpostSearchRadius === "number") {
    CONFIG.SETTLEMENT_OUTPOST_SEARCH_RADIUS = saveConfig.settlementOutpostSearchRadius;
  }

  if (typeof saveConfig.settlementOutpostMinDistance === "number") {
    CONFIG.SETTLEMENT_OUTPOST_MIN_DISTANCE = saveConfig.settlementOutpostMinDistance;
  }

  if (typeof saveConfig.settlementOutpostMaxChildren === "number") {
    CONFIG.SETTLEMENT_OUTPOST_MAX_CHILDREN = saveConfig.settlementOutpostMaxChildren;
  }

  if (typeof saveConfig.settlementRouteTransferInterval === "number") {
    CONFIG.SETTLEMENT_ROUTE_TRANSFER_INTERVAL = saveConfig.settlementRouteTransferInterval;
  }

  if (typeof saveConfig.settlementRouteFoodTransfer === "number") {
    CONFIG.SETTLEMENT_ROUTE_FOOD_TRANSFER = saveConfig.settlementRouteFoodTransfer;
  }

  if (typeof saveConfig.settlementRouteMinParentStoredFood === "number") {
    CONFIG.SETTLEMENT_ROUTE_MIN_PARENT_STORED_FOOD = saveConfig.settlementRouteMinParentStoredFood;
  }

  if (typeof saveConfig.settlementSupplyGrowthInterval === "number") {
    CONFIG.SETTLEMENT_SUPPLY_GROWTH_INTERVAL = saveConfig.settlementSupplyGrowthInterval;
  }

  if (typeof saveConfig.settlementSupplyGrowthFoodCost === "number") {
    CONFIG.SETTLEMENT_SUPPLY_GROWTH_FOOD_COST = saveConfig.settlementSupplyGrowthFoodCost;
  }

  if (typeof saveConfig.settlementDevelopmentPerSuppliedFood === "number") {
    CONFIG.SETTLEMENT_DEVELOPMENT_PER_SUPPLIED_FOOD = saveConfig.settlementDevelopmentPerSuppliedFood;
  }

  if (typeof saveConfig.settlementColonyLevel === "number") {
    CONFIG.SETTLEMENT_COLONY_LEVEL = saveConfig.settlementColonyLevel;
  }

  if (typeof saveConfig.colonyNetworkEraScore === "number") {
    CONFIG.COLONY_NETWORK_ERA_SCORE = saveConfig.colonyNetworkEraScore;
  }

  if (typeof saveConfig.colonyNetworkRouteScore === "number") {
    CONFIG.COLONY_NETWORK_ROUTE_SCORE = saveConfig.colonyNetworkRouteScore;
  }

  if (typeof saveConfig.colonyNetworkStoredFoodScore === "number") {
    CONFIG.COLONY_NETWORK_STORED_FOOD_SCORE = saveConfig.colonyNetworkStoredFoodScore;
  }

  if (typeof saveConfig.colonyNetworkTransferredFoodScore === "number") {
    CONFIG.COLONY_NETWORK_TRANSFERRED_FOOD_SCORE = saveConfig.colonyNetworkTransferredFoodScore;
  }

  if (typeof saveConfig.colonyNetworkClaimedTileScore === "number") {
    CONFIG.COLONY_NETWORK_CLAIMED_TILE_SCORE = saveConfig.colonyNetworkClaimedTileScore;
  }

  if (typeof saveConfig.spaceProgramMinNetworkScore === "number") {
    CONFIG.SPACE_PROGRAM_MIN_NETWORK_SCORE = saveConfig.spaceProgramMinNetworkScore;
  }

  if (typeof saveConfig.spaceProgramMinColonies === "number") {
    CONFIG.SPACE_PROGRAM_MIN_COLONIES = saveConfig.spaceProgramMinColonies;
  }

  if (typeof saveConfig.spaceProgramMinActiveRoutes === "number") {
    CONFIG.SPACE_PROGRAM_MIN_ACTIVE_ROUTES = saveConfig.spaceProgramMinActiveRoutes;
  }

  if (typeof saveConfig.spaceProgramProgressInterval === "number") {
    CONFIG.SPACE_PROGRAM_PROGRESS_INTERVAL = saveConfig.spaceProgramProgressInterval;
  }

  if (typeof saveConfig.spaceProgramColonyFoodCost === "number") {
    CONFIG.SPACE_PROGRAM_COLONY_FOOD_COST = saveConfig.spaceProgramColonyFoodCost;
  }

  if (typeof saveConfig.spaceProgramProgressPerNetworkScore === "number") {
    CONFIG.SPACE_PROGRAM_PROGRESS_PER_NETWORK_SCORE = saveConfig.spaceProgramProgressPerNetworkScore;
  }

  if (typeof saveConfig.spaceProgramProgressPerActiveRoute === "number") {
    CONFIG.SPACE_PROGRAM_PROGRESS_PER_ACTIVE_ROUTE = saveConfig.spaceProgramProgressPerActiveRoute;
  }

  if (typeof saveConfig.spaceProgramLaunchThreshold === "number") {
    CONFIG.SPACE_PROGRAM_LAUNCH_THRESHOLD = saveConfig.spaceProgramLaunchThreshold;
  }

  if (typeof saveConfig.orbitalAssetScore === "number") {
    CONFIG.ORBITAL_ASSET_SCORE = saveConfig.orbitalAssetScore;
  }

  if (typeof saveConfig.orbitalPlatformScore === "number") {
    CONFIG.ORBITAL_PLATFORM_SCORE = saveConfig.orbitalPlatformScore;
  }

  if (typeof saveConfig.planetarySurveyMinInfrastructure === "number") {
    CONFIG.PLANETARY_SURVEY_MIN_INFRASTRUCTURE = saveConfig.planetarySurveyMinInfrastructure;
  }

  if (typeof saveConfig.planetarySurveyInterval === "number") {
    CONFIG.PLANETARY_SURVEY_INTERVAL = saveConfig.planetarySurveyInterval;
  }

  if (typeof saveConfig.planetarySurveyProgressPerInfrastructure === "number") {
    CONFIG.PLANETARY_SURVEY_PROGRESS_PER_INFRASTRUCTURE = saveConfig.planetarySurveyProgressPerInfrastructure;
  }

  if (typeof saveConfig.planetarySurveyProgressPerOrbitalAsset === "number") {
    CONFIG.PLANETARY_SURVEY_PROGRESS_PER_ORBITAL_ASSET = saveConfig.planetarySurveyProgressPerOrbitalAsset;
  }

  if (typeof saveConfig.planetaryDiscoveryThreshold === "number") {
    CONFIG.PLANETARY_DISCOVERY_THRESHOLD = saveConfig.planetaryDiscoveryThreshold;
  }

  if (typeof saveConfig.planetarySurveyMaxBodies === "number") {
    CONFIG.PLANETARY_SURVEY_MAX_BODIES = saveConfig.planetarySurveyMaxBodies;
  }

  if (typeof saveConfig.interplanetaryBodyCount === "number") {
    CONFIG.INTERPLANETARY_BODY_COUNT = saveConfig.interplanetaryBodyCount;
  }

  if (typeof saveConfig.probeMissionMinBodies === "number") {
    CONFIG.PROBE_MISSION_MIN_BODIES = saveConfig.probeMissionMinBodies;
  }

  if (typeof saveConfig.probeMissionInterval === "number") {
    CONFIG.PROBE_MISSION_INTERVAL = saveConfig.probeMissionInterval;
  }

  if (typeof saveConfig.probeMissionProgressPerBody === "number") {
    CONFIG.PROBE_MISSION_PROGRESS_PER_BODY = saveConfig.probeMissionProgressPerBody;
  }

  if (typeof saveConfig.probeMissionProgressPerInfrastructure === "number") {
    CONFIG.PROBE_MISSION_PROGRESS_PER_INFRASTRUCTURE = saveConfig.probeMissionProgressPerInfrastructure;
  }

  if (typeof saveConfig.probeMissionThreshold === "number") {
    CONFIG.PROBE_MISSION_THRESHOLD = saveConfig.probeMissionThreshold;
  }

  if (typeof saveConfig.probeMissionCompleteTicks === "number") {
    CONFIG.PROBE_MISSION_COMPLETE_TICKS = saveConfig.probeMissionCompleteTicks;
  }

  if (typeof saveConfig.stellarCartographyMissionCount === "number") {
    CONFIG.STELLAR_CARTOGRAPHY_MISSION_COUNT = saveConfig.stellarCartographyMissionCount;
  }

  if (typeof saveConfig.starMapMinCompletedProbes === "number") {
    CONFIG.STAR_MAP_MIN_COMPLETED_PROBES = saveConfig.starMapMinCompletedProbes;
  }

  if (typeof saveConfig.starMapInterval === "number") {
    CONFIG.STAR_MAP_INTERVAL = saveConfig.starMapInterval;
  }

  if (typeof saveConfig.starMapProgressPerCompletedProbe === "number") {
    CONFIG.STAR_MAP_PROGRESS_PER_COMPLETED_PROBE = saveConfig.starMapProgressPerCompletedProbe;
  }

  if (typeof saveConfig.starMapProgressPerInfrastructure === "number") {
    CONFIG.STAR_MAP_PROGRESS_PER_INFRASTRUCTURE = saveConfig.starMapProgressPerInfrastructure;
  }

  if (typeof saveConfig.starSystemDiscoveryThreshold === "number") {
    CONFIG.STAR_SYSTEM_DISCOVERY_THRESHOLD = saveConfig.starSystemDiscoveryThreshold;
  }

  if (typeof saveConfig.starMapMaxSystems === "number") {
    CONFIG.STAR_MAP_MAX_SYSTEMS = saveConfig.starMapMaxSystems;
  }

  if (typeof saveConfig.galacticMapSystemCount === "number") {
    CONFIG.GALACTIC_MAP_SYSTEM_COUNT = saveConfig.galacticMapSystemCount;
  }

  if (typeof saveConfig.galacticInfluenceMinSystems === "number") {
    CONFIG.GALACTIC_INFLUENCE_MIN_SYSTEMS = saveConfig.galacticInfluenceMinSystems;
  }

  if (typeof saveConfig.galacticInfluenceInterval === "number") {
    CONFIG.GALACTIC_INFLUENCE_INTERVAL = saveConfig.galacticInfluenceInterval;
  }

  if (typeof saveConfig.galacticInfluenceProgressPerMapValue === "number") {
    CONFIG.GALACTIC_INFLUENCE_PROGRESS_PER_MAP_VALUE = saveConfig.galacticInfluenceProgressPerMapValue;
  }

  if (typeof saveConfig.galacticInfluenceProgressPerCompletedProbe === "number") {
    CONFIG.GALACTIC_INFLUENCE_PROGRESS_PER_COMPLETED_PROBE = saveConfig.galacticInfluenceProgressPerCompletedProbe;
  }

  if (typeof saveConfig.galacticInfluenceProgressPerInfrastructure === "number") {
    CONFIG.GALACTIC_INFLUENCE_PROGRESS_PER_INFRASTRUCTURE = saveConfig.galacticInfluenceProgressPerInfrastructure;
  }

  if (typeof saveConfig.galacticSystemClaimThreshold === "number") {
    CONFIG.GALACTIC_SYSTEM_CLAIM_THRESHOLD = saveConfig.galacticSystemClaimThreshold;
  }

  if (typeof saveConfig.protoEmpireSystemCount === "number") {
    CONFIG.PROTO_EMPIRE_SYSTEM_COUNT = saveConfig.protoEmpireSystemCount;
  }

  if (typeof saveConfig.interstellarFleetMinClaimedSystems === "number") {
    CONFIG.INTERSTELLAR_FLEET_MIN_CLAIMED_SYSTEMS = saveConfig.interstellarFleetMinClaimedSystems;
  }

  if (typeof saveConfig.interstellarFleetBuildInterval === "number") {
    CONFIG.INTERSTELLAR_FLEET_BUILD_INTERVAL = saveConfig.interstellarFleetBuildInterval;
  }

  if (typeof saveConfig.interstellarFleetProgressPerClaimedSystem === "number") {
    CONFIG.INTERSTELLAR_FLEET_PROGRESS_PER_CLAIMED_SYSTEM = saveConfig.interstellarFleetProgressPerClaimedSystem;
  }

  if (typeof saveConfig.interstellarFleetProgressPerCompletedProbe === "number") {
    CONFIG.INTERSTELLAR_FLEET_PROGRESS_PER_COMPLETED_PROBE = saveConfig.interstellarFleetProgressPerCompletedProbe;
  }

  if (typeof saveConfig.interstellarFleetProgressPerInfrastructure === "number") {
    CONFIG.INTERSTELLAR_FLEET_PROGRESS_PER_INFRASTRUCTURE = saveConfig.interstellarFleetProgressPerInfrastructure;
  }

  if (typeof saveConfig.interstellarFleetBuildThreshold === "number") {
    CONFIG.INTERSTELLAR_FLEET_BUILD_THRESHOLD = saveConfig.interstellarFleetBuildThreshold;
  }

  if (typeof saveConfig.interstellarFleetTravelTicks === "number") {
    CONFIG.INTERSTELLAR_FLEET_TRAVEL_TICKS = saveConfig.interstellarFleetTravelTicks;
  }

  if (typeof saveConfig.interstellarFleetMaxMissions === "number") {
    CONFIG.INTERSTELLAR_FLEET_MAX_MISSIONS = saveConfig.interstellarFleetMaxMissions;
  }

  if (typeof saveConfig.empireNetworkCompletedFleets === "number") {
    CONFIG.EMPIRE_NETWORK_COMPLETED_FLEETS = saveConfig.empireNetworkCompletedFleets;
  }

  if (typeof saveConfig.empireSectorMinCompletedFleets === "number") {
    CONFIG.EMPIRE_SECTOR_MIN_COMPLETED_FLEETS = saveConfig.empireSectorMinCompletedFleets;
  }

  if (typeof saveConfig.empireSectorBuildInterval === "number") {
    CONFIG.EMPIRE_SECTOR_BUILD_INTERVAL = saveConfig.empireSectorBuildInterval;
  }

  if (typeof saveConfig.empireSectorProgressPerCompletedFleet === "number") {
    CONFIG.EMPIRE_SECTOR_PROGRESS_PER_COMPLETED_FLEET = saveConfig.empireSectorProgressPerCompletedFleet;
  }

  if (typeof saveConfig.empireSectorProgressPerClaimedSystem === "number") {
    CONFIG.EMPIRE_SECTOR_PROGRESS_PER_CLAIMED_SYSTEM = saveConfig.empireSectorProgressPerClaimedSystem;
  }

  if (typeof saveConfig.empireSectorProgressPerInfrastructure === "number") {
    CONFIG.EMPIRE_SECTOR_PROGRESS_PER_INFRASTRUCTURE = saveConfig.empireSectorProgressPerInfrastructure;
  }

  if (typeof saveConfig.empireSectorBuildThreshold === "number") {
    CONFIG.EMPIRE_SECTOR_BUILD_THRESHOLD = saveConfig.empireSectorBuildThreshold;
  }

  if (typeof saveConfig.empireSectorMaxSectors === "number") {
    CONFIG.EMPIRE_SECTOR_MAX_SECTORS = saveConfig.empireSectorMaxSectors;
  }

  if (typeof saveConfig.galacticEmpireSectorCount === "number") {
    CONFIG.GALACTIC_EMPIRE_SECTOR_COUNT = saveConfig.galacticEmpireSectorCount;
  }

  if (typeof saveConfig.empireLegacyMinSectors === "number") {
    CONFIG.EMPIRE_LEGACY_MIN_SECTORS = saveConfig.empireLegacyMinSectors;
  }

  if (typeof saveConfig.empireLegacyInterval === "number") {
    CONFIG.EMPIRE_LEGACY_INTERVAL = saveConfig.empireLegacyInterval;
  }

  if (typeof saveConfig.empireLegacyProgressPerSector === "number") {
    CONFIG.EMPIRE_LEGACY_PROGRESS_PER_SECTOR = saveConfig.empireLegacyProgressPerSector;
  }

  if (typeof saveConfig.empireLegacyProgressPerCompletedFleet === "number") {
    CONFIG.EMPIRE_LEGACY_PROGRESS_PER_COMPLETED_FLEET = saveConfig.empireLegacyProgressPerCompletedFleet;
  }

  if (typeof saveConfig.empireLegacyProgressPerClaimedSystem === "number") {
    CONFIG.EMPIRE_LEGACY_PROGRESS_PER_CLAIMED_SYSTEM = saveConfig.empireLegacyProgressPerClaimedSystem;
  }

  if (typeof saveConfig.empireLegacyThreshold === "number") {
    CONFIG.EMPIRE_LEGACY_THRESHOLD = saveConfig.empireLegacyThreshold;
  }

  if (typeof saveConfig.ascendantEmpireLegacyLevel === "number") {
    CONFIG.ASCENDANT_EMPIRE_LEGACY_LEVEL = saveConfig.ascendantEmpireLegacyLevel;
  }
}

function applyWorldSaveData(saveData) {
  validateWorldSaveData(saveData);
  applySaveConfig(saveData.config);

  world.tick = Number(saveData.tick);
  world.speed = clamp(Math.round(Number(saveData.speed)), 1, 10);
  world.era = String(saveData.era || "Organisms");
  world.nextLineageId = Math.max(1, Math.round(restoreNumber(saveData.nextLineageId, 1)));
  world.nextSettlementId = Math.max(1, Math.round(restoreNumber(saveData.nextSettlementId, 1)));
  world.nextSettlementRouteId = Math.max(1, Math.round(restoreNumber(saveData.nextSettlementRouteId, 1)));
  world.nextOrbitalAssetId = Math.max(1, Math.round(restoreNumber(saveData.nextOrbitalAssetId, 1)));
  world.nextPlanetaryBodyId = Math.max(1, Math.round(restoreNumber(saveData.nextPlanetaryBodyId, 1)));
  world.nextProbeMissionId = Math.max(1, Math.round(restoreNumber(saveData.nextProbeMissionId, 1)));
  world.nextStarSystemId = Math.max(1, Math.round(restoreNumber(saveData.nextStarSystemId, 1)));
  world.nextInterstellarFleetId = Math.max(1, Math.round(restoreNumber(saveData.nextInterstellarFleetId, 1)));
  world.nextEmpireSectorId = Math.max(1, Math.round(restoreNumber(saveData.nextEmpireSectorId, 1)));
  world.colonyNetworkScore = Math.max(0, Math.round(restoreNumber(saveData.colonyNetworkScore, 0)));
  world.colonyNetworkColonies = Math.max(0, Math.round(restoreNumber(saveData.colonyNetworkColonies, 0)));
  world.colonyNetworkActiveRoutes = Math.max(0, Math.round(restoreNumber(saveData.colonyNetworkActiveRoutes, 0)));
  world.colonyNetworkClaimedTiles = Math.max(0, Math.round(restoreNumber(saveData.colonyNetworkClaimedTiles, 0)));
  world.spaceProgramProgress = Math.max(0, restoreNumber(saveData.spaceProgramProgress, 0));
  world.orbitalLaunches = Math.max(0, Math.round(restoreNumber(saveData.orbitalLaunches, 0)));
  world.lastSpaceProgramTick = Math.max(0, Math.round(restoreNumber(saveData.lastSpaceProgramTick, 0)));
  world.spaceProgramReady = Boolean(saveData.spaceProgramReady);
  world.orbitalInfrastructureScore = Math.max(0, Math.round(restoreNumber(saveData.orbitalInfrastructureScore, 0)));
  world.orbitalPlatformReady = Boolean(saveData.orbitalPlatformReady);
  world.planetarySurveyProgress = Math.max(0, restoreNumber(saveData.planetarySurveyProgress, 0));
  world.planetarySurveyReady = Boolean(saveData.planetarySurveyReady);
  world.lastPlanetarySurveyTick = Math.max(0, Math.round(restoreNumber(saveData.lastPlanetarySurveyTick, 0)));
  world.probeMissionProgress = Math.max(0, restoreNumber(saveData.probeMissionProgress, 0));
  world.probeMissionReady = Boolean(saveData.probeMissionReady);
  world.lastProbeMissionTick = Math.max(0, Math.round(restoreNumber(saveData.lastProbeMissionTick, 0)));
  world.starMapProgress = Math.max(0, restoreNumber(saveData.starMapProgress, 0));
  world.starMapReady = Boolean(saveData.starMapReady);
  world.lastStarMapTick = Math.max(0, Math.round(restoreNumber(saveData.lastStarMapTick, 0)));
  world.galacticInfluenceProgress = Math.max(0, restoreNumber(saveData.galacticInfluenceProgress, 0));
  world.galacticInfluenceReady = Boolean(saveData.galacticInfluenceReady);
  world.galacticClaimedSystems = Math.max(0, Math.round(restoreNumber(saveData.galacticClaimedSystems, 0)));
  world.lastGalacticInfluenceTick = Math.max(0, Math.round(restoreNumber(saveData.lastGalacticInfluenceTick, 0)));
  world.interstellarFleetProgress = Math.max(0, restoreNumber(saveData.interstellarFleetProgress, 0));
  world.interstellarFleetReady = Boolean(saveData.interstellarFleetReady);
  world.interstellarFleetActive = Math.max(0, Math.round(restoreNumber(saveData.interstellarFleetActive, 0)));
  world.interstellarFleetCompleted = Math.max(0, Math.round(restoreNumber(saveData.interstellarFleetCompleted, 0)));
  world.lastInterstellarFleetTick = Math.max(0, Math.round(restoreNumber(saveData.lastInterstellarFleetTick, 0)));
  world.empireSectorProgress = Math.max(0, restoreNumber(saveData.empireSectorProgress, 0));
  world.empireSectorReady = Boolean(saveData.empireSectorReady);
  world.empireSectorCount = Math.max(0, Math.round(restoreNumber(saveData.empireSectorCount, 0)));
  world.lastEmpireSectorTick = Math.max(0, Math.round(restoreNumber(saveData.lastEmpireSectorTick, 0)));
  world.empireLegacyProgress = Math.max(0, restoreNumber(saveData.empireLegacyProgress, 0));
  world.empireLegacyLevel = Math.max(0, Math.round(restoreNumber(saveData.empireLegacyLevel, 0)));
  world.empireLegacyReady = Boolean(saveData.empireLegacyReady);
  world.empireLegacyComplete = Boolean(saveData.empireLegacyComplete);
  world.lastEmpireLegacyTick = Math.max(0, Math.round(restoreNumber(saveData.lastEmpireLegacyTick, 0)));
  world.lineages = restoreLineages(saveData.lineages);
  world.settlements = restoreSettlements(saveData.settlements);
  world.settlementRoutes = restoreSettlementRoutes(saveData.settlementRoutes);
  world.orbitalAssets = restoreOrbitalAssets(saveData.orbitalAssets);
  world.planetaryBodies = restorePlanetaryBodies(saveData.planetaryBodies);
  world.probeMissions = restoreProbeMissions(saveData.probeMissions);
  world.starSystems = restoreStarSystems(saveData.starSystems);
  world.interstellarFleets = restoreInterstellarFleets(saveData.interstellarFleets);
  world.empireSectors = restoreEmpireSectors(saveData.empireSectors);
  world.terrain = saveData.terrain.slice();
  world.fertileTiles = countFertileTiles();
  world.food = saveData.food.map(restoreFood);
  world.organisms = saveData.organisms.map(restoreOrganism);
  refreshLineageRegistry();

  if (typeof ensureOutpostRoutes === "function") {
    ensureOutpostRoutes();
  }

  if (typeof updateColonyNetworkState === "function") {
    var networkSummary = updateColonyNetworkState();

    if (typeof updateSpaceProgramReadiness === "function") {
      updateSpaceProgramReadiness(networkSummary);
    }
  }

  if (typeof updateOrbitalInfrastructureState === "function") {
    updateOrbitalInfrastructureState();
  }

  if (typeof updatePlanetarySurveyReadiness === "function") {
    updatePlanetarySurveyReadiness();
  }

  if (typeof updateProbeMissionReadiness === "function") {
    updateProbeMissionReadiness();
  }

  if (typeof updateStarMapReadiness === "function") {
    updateStarMapReadiness();
  }

  if (typeof updateGalacticInfluenceReadiness === "function") {
    updateGalacticInfluenceReadiness();
  }

  if (typeof updateInterstellarFleetReadiness === "function") {
    updateInterstellarFleetReadiness();
  }

  if (typeof updateEmpireSectorReadiness === "function") {
    updateEmpireSectorReadiness();
  }

  if (typeof updateEmpireLegacyReadiness === "function") {
    updateEmpireLegacyReadiness();
  }

  world.traitHistory = restoreTraitHistory(saveData.traitHistory);
  world.interpolation = 0;
  world.fps = 0;
  world.tps = 0;
  world.updateMs = 0;
  world.drawMs = 0;
  world.maxUpdateMs = 0;
  world.maxDrawMs = 0;

  if (typeof buildTerrainCache === "function") {
    buildTerrainCache();
  }

  drawWorld();
  updateHud();
}

function loadWorldFromIndexedDB() {
  return openPixelSimDatabase().then(function(db) {
    return new Promise(function(resolve, reject) {
      var transaction = db.transaction(PIXELSIM_SAVE_STORE, "readonly");
      var store = transaction.objectStore(PIXELSIM_SAVE_STORE);
      var request = store.get(PIXELSIM_SAVE_ID);

      request.onsuccess = function(event) {
        try {
          var saveData = event.target.result;
          applyWorldSaveData(saveData);
          db.close();
          resolve(saveData);
        } catch (error) {
          db.close();
          reject(error);
        }
      };

      request.onerror = function() {
        db.close();
        reject(new Error(request.error ? request.error.message : "Could not load world"));
      };
    });
  });
}

function exportWorldToJsonFile() {
  var saveData = createWorldSaveData();
  var json = JSON.stringify(saveData, null, 2);
  var blob = new Blob([json], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");

  link.href = url;
  link.download = "pixelsim-world-tick-" + world.tick + ".json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(function() {
    URL.revokeObjectURL(url);
  }, 0);

  return saveData;
}

function importWorldFromJsonFile(file) {
  return new Promise(function(resolve, reject) {
    if (!file) {
      reject(new Error("No JSON file selected"));
      return;
    }

    var reader = new FileReader();

    reader.onload = function(event) {
      try {
        var saveData = JSON.parse(event.target.result);
        applyWorldSaveData(saveData);
        resolve(saveData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = function() {
      reject(new Error(reader.error ? reader.error.message : "Could not read JSON file"));
    };

    reader.readAsText(file);
  });
}
