
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
  var tileX = clamp(Math.round(restoreNumber(organism.x, 0)), 0, WORLD_WIDTH - 1);
  var tileY = clamp(Math.round(restoreNumber(organism.y, 0)), 0, WORLD_HEIGHT - 1);
  var previousTileX = clamp(Math.round(restoreNumber(organism.prevX, tileX)), 0, WORLD_WIDTH - 1);
  var previousTileY = clamp(Math.round(restoreNumber(organism.prevY, tileY)), 0, WORLD_HEIGHT - 1);
  var surfacePosition = getRestoredSurfacePosition(organism, tileX, tileY);
  var previousSurfacePosition = {
    latitude: Number.isFinite(Number(organism.prevLatitude))
      ? clamp(Number(organism.prevLatitude), -90, 90)
      : surfacePosition.latitude,
    longitude: Number.isFinite(Number(organism.prevLongitude))
      ? normalizeLongitude(organism.prevLongitude)
      : surfacePosition.longitude
  };
  var restoredOrganism = {
    x: tileX,
    y: tileY,
    prevX: previousTileX,
    prevY: previousTileY,
    latitude: surfacePosition.latitude,
    longitude: surfacePosition.longitude,
    prevLatitude: previousSurfacePosition.latitude,
    prevLongitude: previousSurfacePosition.longitude,
    energy: Number(organism.energy),
    age: Number(organism.age),
    directionX: clamp(Math.round(Number(organism.directionX)), -1, 1),
    directionY: clamp(Math.round(Number(organism.directionY)), -1, 1),
    travelKm: Math.max(0, restoreNumber(organism.travelKm, 0)),
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

function restoreSimulationEvent(event) {
  event = event || {};

  return {
    tick: Math.max(0, Math.round(restoreNumber(event.tick, 0))),
    type: String(event.type || "sim"),
    label: String(event.label || "Event"),
    detail: String(event.detail || "")
  };
}

function restoreSimulationEvents(eventLog) {
  if (!Array.isArray(eventLog)) {
    return [];
  }

  return eventLog
    .slice(-CONFIG.EVENT_LOG_MAX_ENTRIES)
    .map(restoreSimulationEvent);
}

function restoreEcosystemHistorySample(sample) {
  sample = sample || {};

  return {
    tick: Math.max(0, Math.round(restoreNumber(sample.tick, 0))),
    population: Math.max(0, Math.round(restoreNumber(sample.population, 0))),
    food: Math.max(0, Math.round(restoreNumber(sample.food, 0))),
    averageEnergy: Math.max(0, restoreNumber(sample.averageEnergy, 0)),
    foodPerOrganism: Math.max(0, restoreNumber(sample.foodPerOrganism, 0)),
    populationBalance: String(sample.populationBalance || "steady"),
    resourceBalance: String(sample.resourceBalance || "steady"),
    foodNetThisTick: Math.round(restoreNumber(sample.foodNetThisTick, 0)),
    foodRunwayTicks: Math.round(restoreNumber(sample.foodRunwayTicks, -1)),
    pressure: String(sample.pressure || "balanced"),
    stabilityScore: clamp(Math.round(restoreNumber(sample.stabilityScore, 0)), 0, 100)
  };
}

function restoreEcosystemHistory(ecosystemHistory) {
  if (!Array.isArray(ecosystemHistory)) {
    return [];
  }

  return ecosystemHistory
    .slice(-CONFIG.ECOSYSTEM_HISTORY_MAX_SAMPLES)
    .map(restoreEcosystemHistorySample);
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

  var numericConfigMappings = [
    ["startingFood", "STARTING_FOOD", function(value) { return value; }],
    ["maxFood", "MAX_FOOD", function(value) { return value; }],
    ["maxOrganisms", "MAX_ORGANISMS", function(value) { return value; }],
    ["organismDrawSize", "ORGANISM_DRAW_SIZE", function(value) { return value; }],
    ["foodDrawSize", "FOOD_DRAW_SIZE", function(value) { return value; }],
    ["fertileFoodGrowthChance", "FERTILE_FOOD_GROWTH_CHANCE", function(value) { return value; }],
    ["barrenFoodGrowthChance", "BARREN_FOOD_GROWTH_CHANCE", function(value) { return value; }],
    ["simUpdateIntervalMs", "SIM_UPDATE_INTERVAL_MS", function(value) { return Math.max(1, value); }],
    ["maxSimUpdatesPerFrame", "MAX_SIM_UPDATES_PER_FRAME", function(value) { return Math.max(1, Math.round(value)); }],
    ["hudUpdateIntervalMs", "HUD_UPDATE_INTERVAL_MS", function(value) { return Math.max(50, value); }],
    ["traitMutationChance", "TRAIT_MUTATION_CHANCE", function(value) { return value; }],
    ["traitVisionMin", "TRAIT_VISION_MIN", function(value) { return value; }],
    ["traitVisionMax", "TRAIT_VISION_MAX", function(value) { return value; }],
    ["traitVisionDefault", "TRAIT_VISION_DEFAULT", function(value) { return value; }],
    ["traitVisionMutationStep", "TRAIT_VISION_MUTATION_STEP", function(value) { return value; }],
    ["traitMetabolismMin", "TRAIT_METABOLISM_MIN", function(value) { return value; }],
    ["traitMetabolismMax", "TRAIT_METABOLISM_MAX", function(value) { return value; }],
    ["traitMetabolismDefault", "TRAIT_METABOLISM_DEFAULT", function(value) { return value; }],
    ["traitMetabolismMutationStep", "TRAIT_METABOLISM_MUTATION_STEP", function(value) { return value; }],
    ["traitReproductionEnergyMin", "TRAIT_REPRODUCTION_ENERGY_MIN", function(value) { return value; }],
    ["traitReproductionEnergyMax", "TRAIT_REPRODUCTION_ENERGY_MAX", function(value) { return value; }],
    ["traitReproductionEnergyDefault", "TRAIT_REPRODUCTION_ENERGY_DEFAULT", function(value) { return value; }],
    ["traitReproductionEnergyMutationStep", "TRAIT_REPRODUCTION_ENERGY_MUTATION_STEP", function(value) { return value; }],
    ["traitMovementTendencyMin", "TRAIT_MOVEMENT_TENDENCY_MIN", function(value) { return value; }],
    ["traitMovementTendencyMax", "TRAIT_MOVEMENT_TENDENCY_MAX", function(value) { return value; }],
    ["traitMovementTendencyDefault", "TRAIT_MOVEMENT_TENDENCY_DEFAULT", function(value) { return value; }],
    ["traitMovementTendencyMutationStep", "TRAIT_MOVEMENT_TENDENCY_MUTATION_STEP", function(value) { return value; }],
    ["traitTerrainAffinityMin", "TRAIT_TERRAIN_AFFINITY_MIN", function(value) { return value; }],
    ["traitTerrainAffinityMax", "TRAIT_TERRAIN_AFFINITY_MAX", function(value) { return value; }],
    ["traitTerrainAffinityDefault", "TRAIT_TERRAIN_AFFINITY_DEFAULT", function(value) { return value; }],
    ["traitTerrainAffinityMutationStep", "TRAIT_TERRAIN_AFFINITY_MUTATION_STEP", function(value) { return value; }],
    ["terrainMismatchMaxEnergyCost", "TERRAIN_MISMATCH_MAX_ENERGY_COST", function(value) { return value; }],
    ["traitHistorySampleInterval", "TRAIT_HISTORY_SAMPLE_INTERVAL", function(value) { return value; }],
    ["traitHistoryMaxSamples", "TRAIT_HISTORY_MAX_SAMPLES", function(value) { return value; }],
    ["ecosystemHistorySampleInterval", "ECOSYSTEM_HISTORY_SAMPLE_INTERVAL", function(value) { return Math.max(1, Math.round(value)); }],
    ["ecosystemHistoryMaxSamples", "ECOSYSTEM_HISTORY_MAX_SAMPLES", function(value) { return Math.max(1, Math.round(value)); }],
    ["eventLogMaxEntries", "EVENT_LOG_MAX_ENTRIES", function(value) { return Math.max(1, Math.round(value)); }],
    ["eventLogVisibleEntries", "EVENT_LOG_VISIBLE_ENTRIES", function(value) { return Math.max(1, Math.round(value)); }],
    ["lineageDivergenceScoreForNewLineage", "LINEAGE_DIVERGENCE_SCORE_FOR_NEW_LINEAGE", function(value) { return value; }],
    ["settlementMinLineagePopulation", "SETTLEMENT_MIN_LINEAGE_POPULATION", function(value) { return value; }],
    ["settlementMinLineagePeakPopulation", "SETTLEMENT_MIN_LINEAGE_PEAK_POPULATION", function(value) { return value; }],
    ["settlementRadius", "SETTLEMENT_RADIUS", function(value) { return value; }],
    ["settlementGrowthInterval", "SETTLEMENT_GROWTH_INTERVAL", function(value) { return value; }],
    ["settlementFoodHarvestPerGrowth", "SETTLEMENT_FOOD_HARVEST_PER_GROWTH", function(value) { return value; }],
    ["settlementDevelopmentPerPopulation", "SETTLEMENT_DEVELOPMENT_PER_POPULATION", function(value) { return value; }],
    ["settlementDevelopmentPerStoredFood", "SETTLEMENT_DEVELOPMENT_PER_STORED_FOOD", function(value) { return value; }],
    ["settlementLevelDevelopment", "SETTLEMENT_LEVEL_DEVELOPMENT", function(value) { return value; }],
    ["settlementInfluenceBaseRadius", "SETTLEMENT_INFLUENCE_BASE_RADIUS", function(value) { return value; }],
    ["settlementInfluenceRadiusPerLevel", "SETTLEMENT_INFLUENCE_RADIUS_PER_LEVEL", function(value) { return value; }],
    ["settlementOutpostMinLevel", "SETTLEMENT_OUTPOST_MIN_LEVEL", function(value) { return value; }],
    ["settlementOutpostMinStoredFood", "SETTLEMENT_OUTPOST_MIN_STORED_FOOD", function(value) { return value; }],
    ["settlementOutpostMinDevelopment", "SETTLEMENT_OUTPOST_MIN_DEVELOPMENT", function(value) { return value; }],
    ["settlementOutpostFoodCost", "SETTLEMENT_OUTPOST_FOOD_COST", function(value) { return value; }],
    ["settlementOutpostDevelopmentCost", "SETTLEMENT_OUTPOST_DEVELOPMENT_COST", function(value) { return value; }],
    ["settlementOutpostCooldown", "SETTLEMENT_OUTPOST_COOLDOWN", function(value) { return value; }],
    ["settlementOutpostSearchRadius", "SETTLEMENT_OUTPOST_SEARCH_RADIUS", function(value) { return value; }],
    ["settlementOutpostMinDistance", "SETTLEMENT_OUTPOST_MIN_DISTANCE", function(value) { return value; }],
    ["settlementOutpostMaxChildren", "SETTLEMENT_OUTPOST_MAX_CHILDREN", function(value) { return value; }],
    ["settlementRouteTransferInterval", "SETTLEMENT_ROUTE_TRANSFER_INTERVAL", function(value) { return value; }],
    ["settlementRouteFoodTransfer", "SETTLEMENT_ROUTE_FOOD_TRANSFER", function(value) { return value; }],
    ["settlementRouteMinParentStoredFood", "SETTLEMENT_ROUTE_MIN_PARENT_STORED_FOOD", function(value) { return value; }],
    ["settlementSupplyGrowthInterval", "SETTLEMENT_SUPPLY_GROWTH_INTERVAL", function(value) { return value; }],
    ["settlementSupplyGrowthFoodCost", "SETTLEMENT_SUPPLY_GROWTH_FOOD_COST", function(value) { return value; }],
    ["settlementDevelopmentPerSuppliedFood", "SETTLEMENT_DEVELOPMENT_PER_SUPPLIED_FOOD", function(value) { return value; }],
    ["settlementColonyLevel", "SETTLEMENT_COLONY_LEVEL", function(value) { return value; }],
    ["colonyNetworkEraScore", "COLONY_NETWORK_ERA_SCORE", function(value) { return value; }],
    ["colonyNetworkRouteScore", "COLONY_NETWORK_ROUTE_SCORE", function(value) { return value; }],
    ["colonyNetworkStoredFoodScore", "COLONY_NETWORK_STORED_FOOD_SCORE", function(value) { return value; }],
    ["colonyNetworkTransferredFoodScore", "COLONY_NETWORK_TRANSFERRED_FOOD_SCORE", function(value) { return value; }],
    ["colonyNetworkClaimedTileScore", "COLONY_NETWORK_CLAIMED_TILE_SCORE", function(value) { return value; }],
    ["spaceProgramMinNetworkScore", "SPACE_PROGRAM_MIN_NETWORK_SCORE", function(value) { return value; }],
    ["spaceProgramMinColonies", "SPACE_PROGRAM_MIN_COLONIES", function(value) { return value; }],
    ["spaceProgramMinActiveRoutes", "SPACE_PROGRAM_MIN_ACTIVE_ROUTES", function(value) { return value; }],
    ["spaceProgramProgressInterval", "SPACE_PROGRAM_PROGRESS_INTERVAL", function(value) { return value; }],
    ["spaceProgramColonyFoodCost", "SPACE_PROGRAM_COLONY_FOOD_COST", function(value) { return value; }],
    ["spaceProgramProgressPerNetworkScore", "SPACE_PROGRAM_PROGRESS_PER_NETWORK_SCORE", function(value) { return value; }],
    ["spaceProgramProgressPerActiveRoute", "SPACE_PROGRAM_PROGRESS_PER_ACTIVE_ROUTE", function(value) { return value; }],
    ["spaceProgramLaunchThreshold", "SPACE_PROGRAM_LAUNCH_THRESHOLD", function(value) { return value; }],
    ["orbitalAssetScore", "ORBITAL_ASSET_SCORE", function(value) { return value; }],
    ["orbitalPlatformScore", "ORBITAL_PLATFORM_SCORE", function(value) { return value; }],
    ["planetarySurveyMinInfrastructure", "PLANETARY_SURVEY_MIN_INFRASTRUCTURE", function(value) { return value; }],
    ["planetarySurveyInterval", "PLANETARY_SURVEY_INTERVAL", function(value) { return value; }],
    ["planetarySurveyProgressPerInfrastructure", "PLANETARY_SURVEY_PROGRESS_PER_INFRASTRUCTURE", function(value) { return value; }],
    ["planetarySurveyProgressPerOrbitalAsset", "PLANETARY_SURVEY_PROGRESS_PER_ORBITAL_ASSET", function(value) { return value; }],
    ["planetaryDiscoveryThreshold", "PLANETARY_DISCOVERY_THRESHOLD", function(value) { return value; }],
    ["planetarySurveyMaxBodies", "PLANETARY_SURVEY_MAX_BODIES", function(value) { return value; }],
    ["interplanetaryBodyCount", "INTERPLANETARY_BODY_COUNT", function(value) { return value; }],
    ["probeMissionMinBodies", "PROBE_MISSION_MIN_BODIES", function(value) { return value; }],
    ["probeMissionInterval", "PROBE_MISSION_INTERVAL", function(value) { return value; }],
    ["probeMissionProgressPerBody", "PROBE_MISSION_PROGRESS_PER_BODY", function(value) { return value; }],
    ["probeMissionProgressPerInfrastructure", "PROBE_MISSION_PROGRESS_PER_INFRASTRUCTURE", function(value) { return value; }],
    ["probeMissionThreshold", "PROBE_MISSION_THRESHOLD", function(value) { return value; }],
    ["probeMissionCompleteTicks", "PROBE_MISSION_COMPLETE_TICKS", function(value) { return value; }],
    ["stellarCartographyMissionCount", "STELLAR_CARTOGRAPHY_MISSION_COUNT", function(value) { return value; }],
    ["starMapMinCompletedProbes", "STAR_MAP_MIN_COMPLETED_PROBES", function(value) { return value; }],
    ["starMapInterval", "STAR_MAP_INTERVAL", function(value) { return value; }],
    ["starMapProgressPerCompletedProbe", "STAR_MAP_PROGRESS_PER_COMPLETED_PROBE", function(value) { return value; }],
    ["starMapProgressPerInfrastructure", "STAR_MAP_PROGRESS_PER_INFRASTRUCTURE", function(value) { return value; }],
    ["starSystemDiscoveryThreshold", "STAR_SYSTEM_DISCOVERY_THRESHOLD", function(value) { return value; }],
    ["starMapMaxSystems", "STAR_MAP_MAX_SYSTEMS", function(value) { return value; }],
    ["galacticMapSystemCount", "GALACTIC_MAP_SYSTEM_COUNT", function(value) { return value; }],
    ["galacticInfluenceMinSystems", "GALACTIC_INFLUENCE_MIN_SYSTEMS", function(value) { return value; }],
    ["galacticInfluenceInterval", "GALACTIC_INFLUENCE_INTERVAL", function(value) { return value; }],
    ["galacticInfluenceProgressPerMapValue", "GALACTIC_INFLUENCE_PROGRESS_PER_MAP_VALUE", function(value) { return value; }],
    ["galacticInfluenceProgressPerCompletedProbe", "GALACTIC_INFLUENCE_PROGRESS_PER_COMPLETED_PROBE", function(value) { return value; }],
    ["galacticInfluenceProgressPerInfrastructure", "GALACTIC_INFLUENCE_PROGRESS_PER_INFRASTRUCTURE", function(value) { return value; }],
    ["galacticSystemClaimThreshold", "GALACTIC_SYSTEM_CLAIM_THRESHOLD", function(value) { return value; }],
    ["protoEmpireSystemCount", "PROTO_EMPIRE_SYSTEM_COUNT", function(value) { return value; }],
    ["interstellarFleetMinClaimedSystems", "INTERSTELLAR_FLEET_MIN_CLAIMED_SYSTEMS", function(value) { return value; }],
    ["interstellarFleetBuildInterval", "INTERSTELLAR_FLEET_BUILD_INTERVAL", function(value) { return value; }],
    ["interstellarFleetProgressPerClaimedSystem", "INTERSTELLAR_FLEET_PROGRESS_PER_CLAIMED_SYSTEM", function(value) { return value; }],
    ["interstellarFleetProgressPerCompletedProbe", "INTERSTELLAR_FLEET_PROGRESS_PER_COMPLETED_PROBE", function(value) { return value; }],
    ["interstellarFleetProgressPerInfrastructure", "INTERSTELLAR_FLEET_PROGRESS_PER_INFRASTRUCTURE", function(value) { return value; }],
    ["interstellarFleetBuildThreshold", "INTERSTELLAR_FLEET_BUILD_THRESHOLD", function(value) { return value; }],
    ["interstellarFleetTravelTicks", "INTERSTELLAR_FLEET_TRAVEL_TICKS", function(value) { return value; }],
    ["interstellarFleetMaxMissions", "INTERSTELLAR_FLEET_MAX_MISSIONS", function(value) { return value; }],
    ["empireNetworkCompletedFleets", "EMPIRE_NETWORK_COMPLETED_FLEETS", function(value) { return value; }],
    ["empireSectorMinCompletedFleets", "EMPIRE_SECTOR_MIN_COMPLETED_FLEETS", function(value) { return value; }],
    ["empireSectorBuildInterval", "EMPIRE_SECTOR_BUILD_INTERVAL", function(value) { return value; }],
    ["empireSectorProgressPerCompletedFleet", "EMPIRE_SECTOR_PROGRESS_PER_COMPLETED_FLEET", function(value) { return value; }],
    ["empireSectorProgressPerClaimedSystem", "EMPIRE_SECTOR_PROGRESS_PER_CLAIMED_SYSTEM", function(value) { return value; }],
    ["empireSectorProgressPerInfrastructure", "EMPIRE_SECTOR_PROGRESS_PER_INFRASTRUCTURE", function(value) { return value; }],
    ["empireSectorBuildThreshold", "EMPIRE_SECTOR_BUILD_THRESHOLD", function(value) { return value; }],
    ["empireSectorMaxSectors", "EMPIRE_SECTOR_MAX_SECTORS", function(value) { return value; }],
    ["galacticEmpireSectorCount", "GALACTIC_EMPIRE_SECTOR_COUNT", function(value) { return value; }],
    ["empireLegacyMinSectors", "EMPIRE_LEGACY_MIN_SECTORS", function(value) { return value; }],
    ["empireLegacyInterval", "EMPIRE_LEGACY_INTERVAL", function(value) { return value; }],
    ["empireLegacyProgressPerSector", "EMPIRE_LEGACY_PROGRESS_PER_SECTOR", function(value) { return value; }],
    ["empireLegacyProgressPerCompletedFleet", "EMPIRE_LEGACY_PROGRESS_PER_COMPLETED_FLEET", function(value) { return value; }],
    ["empireLegacyProgressPerClaimedSystem", "EMPIRE_LEGACY_PROGRESS_PER_CLAIMED_SYSTEM", function(value) { return value; }],
    ["empireLegacyThreshold", "EMPIRE_LEGACY_THRESHOLD", function(value) { return value; }],
    ["ascendantEmpireLegacyLevel", "ASCENDANT_EMPIRE_LEGACY_LEVEL", function(value) { return value; }]
  ];
  var stringConfigMappings = [
    ["defaultSeed", "DEFAULT_SEED", function(value) { return normalizeSeedText(value); }]
  ];

  for (var stringIndex = 0; stringIndex < stringConfigMappings.length; stringIndex++) {
    var stringMapping = stringConfigMappings[stringIndex];
    if (typeof saveConfig[stringMapping[0]] === "string") {
      CONFIG[stringMapping[1]] = stringMapping[2](saveConfig[stringMapping[0]]);
    }
  }

  for (var numericIndex = 0; numericIndex < numericConfigMappings.length; numericIndex++) {
    var numericMapping = numericConfigMappings[numericIndex];
    if (typeof saveConfig[numericMapping[0]] === "number") {
      CONFIG[numericMapping[1]] = numericMapping[2](saveConfig[numericMapping[0]]);
    }
  }
}
