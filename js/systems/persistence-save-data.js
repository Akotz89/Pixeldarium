
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

function copyCameraForSave() {
  var view = typeof getPlanetView === "function"
    ? getPlanetView()
    : (world.planetView || {});

  return {
    zoomLevel: Number(view.zoomLevel) || 0,
    latitude: clamp(Number(view.latitude) || 0, -90, 90),
    longitude: normalizeLongitude(view.longitude),
    panEastMeters: Number(view.panEastMeters) || 0,
    panNorthMeters: Number(view.panNorthMeters) || 0
  };
}

function copyLayerStateForSave(layerState) {
  if (!layerState) {
    return null;
  }

  return JSON.parse(JSON.stringify(layerState));
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
    id: PIXELDARIUM_SAVE_ID,
    version: PIXELDARIUM_SAVE_VERSION,
    savedAt: new Date().toISOString(),
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tileSize: CONFIG.TILE_SIZE,
    tick: world.tick,
    deepTimeYears: Math.max(0, Number(world.deepTimeYears) || 0),
    timeScale: PS.time && PS.time.timeScale ? copyLayerStateForSave(PS.time.timeScale) : null,
    speed: world.speed,
    era: world.era,
    isExtinct: Boolean(world.isExtinct),
    extinctionTick: Math.max(0, Math.round(Number(world.extinctionTick) || 0)),
    totalBirths: Math.max(0, Math.round(Number(world.totalBirths) || 0)),
    totalDeaths: Math.max(0, Math.round(Number(world.totalDeaths) || 0)),
    totalFoodSpawned: Math.max(0, Math.round(Number(world.totalFoodSpawned) || 0)),
    totalFoodConsumed: Math.max(0, Math.round(Number(world.totalFoodConsumed) || 0)),
    totalFoodHarvested: Math.max(0, Math.round(Number(world.totalFoodHarvested) || 0)),
    seedText: normalizeSeedText(world.seedText),
    rngState: Math.max(1, Math.round(Number(world.rngState) || 1)) >>> 0,
    nextLineageId: world.nextLineageId,
    nextSpeciesId: Math.max(1, Math.round(Number(world.nextSpeciesId) || 1)),
    nextBiologyPopulationId: Math.max(1, Math.round(Number(world.nextBiologyPopulationId) || 1)),
    nextBiologyRepresentativeId: Math.max(1, Math.round(Number(world.nextBiologyRepresentativeId) || 1)),
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
    geology: copyLayerStateForSave(world.geology),
    atmosphere: copyLayerStateForSave(world.atmosphere),
    abiogenesis: copyLayerStateForSave(world.abiogenesis),
    microbial: copyLayerStateForSave(world.microbial),
    microbialReady: Boolean(world.microbialReady),
    config: {
      startingOrganisms: CONFIG.STARTING_ORGANISMS,
      startingFood: CONFIG.STARTING_FOOD,
      maxFood: CONFIG.MAX_FOOD,
      maxOrganisms: CONFIG.MAX_ORGANISMS,
      defaultSeed: CONFIG.DEFAULT_SEED,
      organismDrawSize: CONFIG.ORGANISM_DRAW_SIZE,
      foodDrawSize: CONFIG.FOOD_DRAW_SIZE,
      fertileFoodGrowthChance: CONFIG.FERTILE_FOOD_GROWTH_CHANCE,
      barrenFoodGrowthChance: CONFIG.BARREN_FOOD_GROWTH_CHANCE,
      simUpdateIntervalMs: CONFIG.SIM_UPDATE_INTERVAL_MS,
      maxSimUpdatesPerFrame: CONFIG.MAX_SIM_UPDATES_PER_FRAME,
      hudUpdateIntervalMs: CONFIG.HUD_UPDATE_INTERVAL_MS,
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
      ecosystemHistorySampleInterval: CONFIG.ECOSYSTEM_HISTORY_SAMPLE_INTERVAL,
      ecosystemHistoryMaxSamples: CONFIG.ECOSYSTEM_HISTORY_MAX_SAMPLES,
      eventLogMaxEntries: CONFIG.EVENT_LOG_MAX_ENTRIES,
      eventLogVisibleEntries: CONFIG.EVENT_LOG_VISIBLE_ENTRIES,
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
    biologyPopulations: copyLayerStateForSave(Array.isArray(world.biologyPopulations) ? world.biologyPopulations : []),
    biologyRepresentatives: copyLayerStateForSave(
      Array.isArray(world.biologyRepresentatives) ? world.biologyRepresentatives : []
    ),
    camera: copyCameraForSave(),
    organisms: world.organisms.map(copyOrganismForSave),
    traitHistory: world.traitHistory.map(copyTraitHistorySampleForSave),
    ecosystemHistory: (Array.isArray(world.ecosystemHistory) ? world.ecosystemHistory : []).map(copyEcosystemHistorySampleForSave),
    eventLog: (Array.isArray(world.eventLog) ? world.eventLog : []).map(copySimulationEventForSave),
    timelineEvents: (Array.isArray(world.timelineEvents) ? world.timelineEvents : []).map(copySimulationEventForSave),
    milestonesReached: copyLayerStateForSave(world.milestonesReached || {}),
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
