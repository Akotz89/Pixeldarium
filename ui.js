function updateHud() {
  var fertilePercent = Math.round(
    (world.fertileTiles / (WORLD_WIDTH * WORLD_HEIGHT)) * 100
  );

  setElementText(eraText, "ERA: " + world.era);
  setElementText(populationText, "POPULATION: " + world.organisms.length);
  setElementText(foodText,
    "TICK: " + world.tick +
    "   FOOD: " + world.food.length +
    "   FERTILE: " + fertilePercent + "%" +
    "   FPS: " + world.fps.toFixed(1) +
    "   TPS: " + world.tps.toFixed(1) +
    "   UPDATE: " + world.updateMs.toFixed(2) + "ms" +
    "   DRAW: " + world.drawMs.toFixed(2) + "ms" +
    "   MAX U/D: " + world.maxUpdateMs.toFixed(2) + "/" + world.maxDrawMs.toFixed(2) + "ms"
  );

  setElementText(speedLabel, "Speed: " + world.speed + "x");
  syncTuningControls();
  updateTraitSummary();
  updateLineageSummary();
  updateSettlementSummary();
  updateInspectPanel();
}

function setElementText(element, text) {
  if (element.textContent !== text) {
    element.textContent = text;
  }
}

function setElementHtml(element, html) {
  if (element.innerHTML !== html) {
    element.innerHTML = html;
  }
}

function setElementClass(element, className) {
  if (element.className !== className) {
    element.className = className;
  }
}

function setInputValue(input, value) {
  var stringValue = String(value);

  if (input.value !== stringValue) {
    input.value = stringValue;
  }
}

function getTuningInputNumber(input, fallbackValue) {
  if (!input) {
    return fallbackValue;
  }

  var value = Number(input.value);
  return Number.isFinite(value) ? value : fallbackValue;
}

function syncTuningControls() {
  var growthPercent = Math.round(CONFIG.FERTILE_FOOD_GROWTH_CHANCE * 100);

  setInputValue(speedSlider, world.speed);
  setElementText(speedValue, world.speed + "x");
  setInputValue(organismSizeSlider, CONFIG.ORGANISM_DRAW_SIZE);
  setElementText(organismSizeValue, CONFIG.ORGANISM_DRAW_SIZE + "px");
  setInputValue(foodSizeSlider, CONFIG.FOOD_DRAW_SIZE);
  setElementText(foodSizeValue, CONFIG.FOOD_DRAW_SIZE + "px");
  setInputValue(startingFoodSlider, CONFIG.STARTING_FOOD);
  setElementText(startingFoodValue, String(CONFIG.STARTING_FOOD));
  setInputValue(foodGrowthSlider, growthPercent);
  setElementText(foodGrowthValue, growthPercent + "%");
}

function applyTuningFromControls(redraw) {
  world.speed = clamp(Math.round(getTuningInputNumber(speedSlider, world.speed)), 1, 10);
  CONFIG.ORGANISM_DRAW_SIZE = clamp(Math.round(getTuningInputNumber(organismSizeSlider, CONFIG.ORGANISM_DRAW_SIZE)), 2, 14);
  CONFIG.FOOD_DRAW_SIZE = clamp(Math.round(getTuningInputNumber(foodSizeSlider, CONFIG.FOOD_DRAW_SIZE)), 1, 8);
  CONFIG.STARTING_FOOD = clamp(Math.round(getTuningInputNumber(startingFoodSlider, CONFIG.STARTING_FOOD)), 100, 1000);
  CONFIG.MAX_FOOD = Math.max(CONFIG.MAX_FOOD, CONFIG.STARTING_FOOD);
  CONFIG.FERTILE_FOOD_GROWTH_CHANCE = clamp(getTuningInputNumber(foodGrowthSlider, CONFIG.FERTILE_FOOD_GROWTH_CHANCE * 100) / 100, 0, 1);

  if (redraw) {
    drawWorld();
  }

  updateHud();
}

function getNearestOrganismToTile(tileX, tileY) {
  return getNearestOrganismInRadius(tileX, tileY, 1);
}

function getNearestSettlementToTile(tileX, tileY) {
  if (!Array.isArray(world.settlements)) {
    return null;
  }

  var nearestSettlement = null;
  var nearestDistance = Infinity;

  for (var i = 0; i < world.settlements.length; i++) {
    var settlement = world.settlements[i];
    var distance = Math.abs(settlement.x - tileX) + Math.abs(settlement.y - tileY);
    var inspectDistance = Math.max(2, Math.round(Number(settlement.influenceRadius) || 0));

    if (distance < nearestDistance && distance <= inspectDistance) {
      nearestSettlement = settlement;
      nearestDistance = distance;
    }
  }

  return nearestSettlement;
}

function getRouteSummaryForSettlement(settlementId) {
  var routeCount = 0;
  var activeRoutes = 0;
  var foodTransferred = 0;

  if (!Array.isArray(world.settlementRoutes)) {
    return {
      routeCount: 0,
      activeRoutes: 0,
      foodTransferred: 0
    };
  }

  for (var i = 0; i < world.settlementRoutes.length; i++) {
    var route = world.settlementRoutes[i];

    if (route.parentSettlementId === settlementId || route.childSettlementId === settlementId) {
      routeCount++;
      foodTransferred += Math.max(0, Number(route.foodTransferred) || 0);

      if (route.isActive) {
        activeRoutes++;
      }
    }
  }

  return {
    routeCount: routeCount,
    activeRoutes: activeRoutes,
    foodTransferred: foodTransferred
  };
}

function formatOrganismTraits(organism) {
  var traits = ensureOrganismTraits(organism);

  return (
    "traits vision " + traits.vision +
    " metabolism " + traits.metabolism +
    " reproduce " + traits.reproductionEnergy +
    " roam " + traits.movementTendency.toFixed(2) +
    " habitat " + traits.terrainAffinity.toFixed(2)
  );
}

function getPopulationTraitSummary() {
  return world.populationTraitSummary;
}

function updateTraitSummary() {
  var summary = getPopulationTraitSummary();

  if (!summary) {
    setElementText(traitSummaryText, "TRAITS AVG: vision -   metabolism -   reproduce -   roam -   habitat -");
    return;
  }

  setElementText(traitSummaryText,
    "TRAITS AVG: vision " + summary.vision.toFixed(1) +
    "   metabolism " + summary.metabolism.toFixed(2) +
    "   reproduce " + summary.reproductionEnergy.toFixed(1) +
    "   roam " + summary.movementTendency.toFixed(2) +
    "   habitat " + summary.terrainAffinity.toFixed(2)
  );
}

function getLineageSummary() {
  if (typeof refreshLineageRegistry === "function") {
    refreshLineageRegistry();
  }

  var lineages = [];
  var lineageRecords = world.lineages || {};

  for (var lineageKey in lineageRecords) {
    if (Object.prototype.hasOwnProperty.call(lineageRecords, lineageKey)) {
      lineages.push(lineageRecords[lineageKey]);
    }
  }

  lineages.sort(function(a, b) {
    return a.id - b.id;
  });

  return lineages;
}

function getNewestLineage(lineages) {
  var newest = null;

  for (var i = 0; i < lineages.length; i++) {
    if (
      !newest ||
      lineages[i].createdTick > newest.createdTick ||
      (lineages[i].createdTick === newest.createdTick && lineages[i].id > newest.id)
    ) {
      newest = lineages[i];
    }
  }

  return newest;
}

function getActiveLineages(lineages) {
  return lineages.filter(function(lineage) {
    return lineage.activeCount > 0;
  });
}

function getExtinctLineages(lineages) {
  return lineages.filter(function(lineage) {
    return lineage.activeCount === 0;
  });
}

function getTopActiveLineages(activeLineages) {
  return activeLineages.slice().sort(function(a, b) {
    if (b.activeCount !== a.activeCount) {
      return b.activeCount - a.activeCount;
    }

    return a.id - b.id;
  });
}

function updateLineageSummary() {
  var lineages = getLineageSummary();

  if (lineages.length === 0) {
    setElementText(lineageSummaryText, "LINEAGES: -");
    return;
  }

  var activeLineages = getActiveLineages(lineages);
  var extinctLineages = getExtinctLineages(lineages);
  var newestLineage = getNewestLineage(lineages);
  var visibleLineages = getTopActiveLineages(activeLineages).slice(0, 5).map(function(lineage) {
    return "L" + lineage.id + " " + lineage.activeCount + " peak " + lineage.peakPopulation;
  });
  var newestText = "newest L" + newestLineage.id + " founder";

  if (newestLineage.parentId > 0) {
    newestText = "newest L" + newestLineage.id + " parent L" + newestLineage.parentId;
  }

  setElementText(lineageSummaryText,
    "LINEAGES: " + activeLineages.length +
    " active / " + extinctLineages.length + " extinct   " +
    newestText +
    "   top " + (visibleLineages.length > 0 ? visibleLineages.join(" | ") : "-")
  );
}

function getSettlementSummary() {
  if (!Array.isArray(world.settlements) || world.settlements.length === 0) {
    return null;
  }

  var activeSettlements = 0;
  var totalPopulation = 0;
  var totalFoodStock = 0;
  var totalStoredFood = 0;
  var totalDevelopment = 0;
  var totalClaimedTiles = 0;
  var totalClaimedFood = 0;
  var totalOutposts = 0;
  var totalColonies = 0;
  var totalRoutes = Array.isArray(world.settlementRoutes) ? world.settlementRoutes.length : 0;
  var activeRoutes = 0;
  var totalRouteFoodTransferred = 0;
  var topSettlement = null;

  if (Array.isArray(world.settlementRoutes)) {
    for (var routeIndex = 0; routeIndex < world.settlementRoutes.length; routeIndex++) {
      totalRouteFoodTransferred += Math.max(0, Number(world.settlementRoutes[routeIndex].foodTransferred) || 0);

      if (world.settlementRoutes[routeIndex].isActive) {
        activeRoutes++;
      }
    }
  }

  for (var i = 0; i < world.settlements.length; i++) {
    var settlement = world.settlements[i];

    if (settlement.isOutpost) {
      totalOutposts++;
    }

    if (settlement.isColony) {
      totalColonies++;
    }

    if (settlement.isActive) {
      activeSettlements++;
    }

    totalPopulation += settlement.population;
    totalFoodStock += settlement.foodStock;
    totalStoredFood += Math.max(0, Number(settlement.storedFood) || 0);
    totalDevelopment += Math.max(0, Number(settlement.development) || 0);
    totalClaimedTiles += Math.max(0, Number(settlement.claimedTiles) || 0);
    totalClaimedFood += Math.max(0, Number(settlement.claimedFood) || 0);

    if (
      !topSettlement ||
      settlement.level > topSettlement.level ||
      (settlement.level === topSettlement.level && settlement.influenceRadius > topSettlement.influenceRadius) ||
      (settlement.level === topSettlement.level && settlement.influenceRadius === topSettlement.influenceRadius && settlement.population > topSettlement.population)
    ) {
      topSettlement = settlement;
    }
  }

  return {
    total: world.settlements.length,
    active: activeSettlements,
    totalPopulation: totalPopulation,
    totalFoodStock: totalFoodStock,
    totalStoredFood: totalStoredFood,
    totalDevelopment: totalDevelopment,
    totalClaimedTiles: totalClaimedTiles,
    totalClaimedFood: totalClaimedFood,
    totalOutposts: totalOutposts,
    totalColonies: totalColonies,
    totalRoutes: totalRoutes,
    activeRoutes: activeRoutes,
    totalRouteFoodTransferred: totalRouteFoodTransferred,
    colonyNetworkScore: Math.max(0, Math.round(Number(world.colonyNetworkScore) || 0)),
    colonyNetworkColonies: Math.max(0, Math.round(Number(world.colonyNetworkColonies) || 0)),
    colonyNetworkActiveRoutes: Math.max(0, Math.round(Number(world.colonyNetworkActiveRoutes) || 0)),
    colonyNetworkClaimedTiles: Math.max(0, Math.round(Number(world.colonyNetworkClaimedTiles) || 0)),
    spaceProgramProgress: Math.max(0, Number(world.spaceProgramProgress) || 0),
    orbitalLaunches: Math.max(0, Math.round(Number(world.orbitalLaunches) || 0)),
    spaceProgramReady: Boolean(world.spaceProgramReady),
    orbitalAssets: Array.isArray(world.orbitalAssets) ? world.orbitalAssets.length : 0,
    orbitalInfrastructureScore: Math.max(0, Math.round(Number(world.orbitalInfrastructureScore) || 0)),
    orbitalPlatformReady: Boolean(world.orbitalPlatformReady),
    planetaryBodies: Array.isArray(world.planetaryBodies) ? world.planetaryBodies.length : 0,
    planetarySurveyProgress: Math.max(0, Number(world.planetarySurveyProgress) || 0),
    planetarySurveyReady: Boolean(world.planetarySurveyReady),
    probeMissions: Array.isArray(world.probeMissions) ? world.probeMissions.length : 0,
    completedProbeMissions: typeof getCompletedProbeMissionCount === "function" ? getCompletedProbeMissionCount() : 0,
    probeMissionProgress: Math.max(0, Number(world.probeMissionProgress) || 0),
    probeMissionReady: Boolean(world.probeMissionReady),
    starSystems: Array.isArray(world.starSystems) ? world.starSystems.length : 0,
    starMapProgress: Math.max(0, Number(world.starMapProgress) || 0),
    starMapReady: Boolean(world.starMapReady),
    galacticClaimedSystems: Math.max(0, Math.round(Number(world.galacticClaimedSystems) || 0)),
    galacticInfluenceProgress: Math.max(0, Number(world.galacticInfluenceProgress) || 0),
    galacticInfluenceReady: Boolean(world.galacticInfluenceReady),
    interstellarFleets: Array.isArray(world.interstellarFleets) ? world.interstellarFleets.length : 0,
    interstellarFleetCompleted: Math.max(0, Math.round(Number(world.interstellarFleetCompleted) || 0)),
    interstellarFleetProgress: Math.max(0, Number(world.interstellarFleetProgress) || 0),
    interstellarFleetReady: Boolean(world.interstellarFleetReady),
    empireSectors: Array.isArray(world.empireSectors) ? world.empireSectors.length : 0,
    empireSectorProgress: Math.max(0, Number(world.empireSectorProgress) || 0),
    empireSectorReady: Boolean(world.empireSectorReady),
    empireLegacyLevel: Math.max(0, Math.round(Number(world.empireLegacyLevel) || 0)),
    empireLegacyProgress: Math.max(0, Number(world.empireLegacyProgress) || 0),
    empireLegacyReady: Boolean(world.empireLegacyReady),
    empireLegacyComplete: Boolean(world.empireLegacyComplete),
    topSettlement: topSettlement
  };
}

function updateSettlementSummary() {
  var summary = getSettlementSummary();

  if (!summary) {
    setElementClass(settlementSummaryText, "");
    setElementText(settlementSummaryText, "SETTLEMENTS: -");
    return;
  }

  var topType = "Root";

  if (summary.topSettlement.isColony) {
    topType = "Colony S" + summary.topSettlement.parentSettlementId;
  } else if (summary.topSettlement.isOutpost) {
    topType = "Outpost S" + summary.topSettlement.parentSettlementId;
  }

  var legacyState = summary.empireLegacyComplete ? "complete" : (summary.empireLegacyReady ? "ascending" : "waiting");
  var chips = [
    ["Settlements", summary.active + "/" + summary.total],
    ["Outposts", summary.totalOutposts],
    ["Colonies", summary.totalColonies],
    ["Routes", summary.activeRoutes + "/" + summary.totalRoutes],
    ["Moved", summary.totalRouteFoodTransferred],
    ["Network", summary.colonyNetworkScore],
    ["Space", summary.spaceProgramProgress.toFixed(1) + "/" + CONFIG.SPACE_PROGRAM_LAUNCH_THRESHOLD],
    ["Launches", summary.orbitalLaunches],
    ["Orbit", summary.orbitalAssets + " / " + summary.orbitalInfrastructureScore],
    ["Planets", summary.planetaryBodies + " / " + summary.planetarySurveyProgress.toFixed(1)],
    ["Probes", summary.completedProbeMissions + "/" + summary.probeMissions],
    ["Stars", summary.starSystems],
    ["Claims", summary.galacticClaimedSystems],
    ["Fleets", summary.interstellarFleetCompleted + "/" + summary.interstellarFleets],
    ["Sectors", summary.empireSectors],
    ["Legacy", "L" + summary.empireLegacyLevel + " " + legacyState],
    ["Camp Pop", summary.totalPopulation],
    ["Stored", summary.totalStoredFood],
    ["Claimed", summary.totalClaimedTiles],
    ["Top", "S" + summary.topSettlement.id + " L" + summary.topSettlement.lineageId],
    ["Top Level", summary.topSettlement.level + " / " + summary.topSettlement.influenceRadius],
    ["Top Type", topType],
    ["Top Pop", summary.topSettlement.population],
    ["Top Dev", summary.topSettlement.development.toFixed(1)]
  ];

  setElementClass(settlementSummaryText, "summary-grid");
  setElementHtml(settlementSummaryText, chips.map(function(chip) {
    return "<span class=\"summary-chip\"><b>" + chip[0] + "</b><span>" + chip[1] + "</span></span>";
  }).join(""));
}

function makeTraitHistorySample(summary) {
  return {
    tick: world.tick,
    population: world.organisms.length,
    vision: summary.vision,
    metabolism: summary.metabolism,
    reproductionEnergy: summary.reproductionEnergy,
    movementTendency: summary.movementTendency,
    terrainAffinity: summary.terrainAffinity
  };
}

function resetTraitHistory() {
  world.traitHistory = [];
  drawTraitHistory();
}

function recordTraitHistorySample(force) {
  var summary = getPopulationTraitSummary();

  if (!summary) {
    return;
  }

  if (!force && world.tick % CONFIG.TRAIT_HISTORY_SAMPLE_INTERVAL !== 0) {
    return;
  }

  var lastSample = world.traitHistory[world.traitHistory.length - 1];

  if (lastSample && lastSample.tick === world.tick) {
    return;
  }

  world.traitHistory.push(makeTraitHistorySample(summary));

  while (world.traitHistory.length > CONFIG.TRAIT_HISTORY_MAX_SAMPLES) {
    world.traitHistory.shift();
  }

  drawTraitHistory();
}

function scaleTraitValue(value, minValue, maxValue, height) {
  if (maxValue <= minValue) {
    return height / 2;
  }

  var normalized = (value - minValue) / (maxValue - minValue);
  normalized = clamp(normalized, 0, 1);
  return height - normalized * height;
}

function drawTraitHistoryLine(samples, getValue, minValue, maxValue, color, chart) {
  if (samples.length === 0) {
    return;
  }

  traitHistoryCtx.strokeStyle = color;
  traitHistoryCtx.fillStyle = color;
  traitHistoryCtx.lineWidth = 2;
  traitHistoryCtx.beginPath();

  for (var i = 0; i < samples.length; i++) {
    var x = chart.x;

    if (samples.length > 1) {
      x += (i / (samples.length - 1)) * chart.width;
    }

    var y = chart.y + scaleTraitValue(getValue(samples[i]), minValue, maxValue, chart.height);

    if (i === 0) {
      traitHistoryCtx.moveTo(x, y);
    } else {
      traitHistoryCtx.lineTo(x, y);
    }
  }

  traitHistoryCtx.stroke();

  if (samples.length === 1) {
    traitHistoryCtx.beginPath();
    traitHistoryCtx.arc(chart.x, chart.y + scaleTraitValue(getValue(samples[0]), minValue, maxValue, chart.height), 3, 0, Math.PI * 2);
    traitHistoryCtx.fill();
  }
}

function drawTraitHistory() {
  var width = traitHistoryCanvas.width;
  var height = traitHistoryCanvas.height;
  var chart = {
    x: 10,
    y: 8,
    width: width - 20,
    height: height - 16
  };

  traitHistoryCtx.clearRect(0, 0, width, height);
  traitHistoryCtx.fillStyle = "rgba(5, 6, 10, 0.86)";
  traitHistoryCtx.fillRect(0, 0, width, height);
  traitHistoryCtx.strokeStyle = "rgba(255, 255, 255, 0.10)";
  traitHistoryCtx.lineWidth = 1;

  for (var i = 0; i <= 3; i++) {
    var y = chart.y + (i / 3) * chart.height;
    traitHistoryCtx.beginPath();
    traitHistoryCtx.moveTo(chart.x, y);
    traitHistoryCtx.lineTo(chart.x + chart.width, y);
    traitHistoryCtx.stroke();
  }

  drawTraitHistoryLine(world.traitHistory, function(sample) {
    return sample.vision;
  }, CONFIG.TRAIT_VISION_MIN, CONFIG.TRAIT_VISION_MAX, "#72d7ff", chart);

  drawTraitHistoryLine(world.traitHistory, function(sample) {
    return sample.metabolism;
  }, CONFIG.TRAIT_METABOLISM_MIN, CONFIG.TRAIT_METABOLISM_MAX, "#ff9c69", chart);

  drawTraitHistoryLine(world.traitHistory, function(sample) {
    return sample.reproductionEnergy;
  }, CONFIG.TRAIT_REPRODUCTION_ENERGY_MIN, CONFIG.TRAIT_REPRODUCTION_ENERGY_MAX, "#fff26b", chart);

  drawTraitHistoryLine(world.traitHistory, function(sample) {
    return sample.movementTendency;
  }, CONFIG.TRAIT_MOVEMENT_TENDENCY_MIN, CONFIG.TRAIT_MOVEMENT_TENDENCY_MAX, "#c884ff", chart);

  drawTraitHistoryLine(world.traitHistory, function(sample) {
    return sample.terrainAffinity;
  }, CONFIG.TRAIT_TERRAIN_AFFINITY_MIN, CONFIG.TRAIT_TERRAIN_AFFINITY_MAX, "#70f0d0", chart);
}

function updateInspectPanel() {
  if (!world.inspectedTile) {
    setElementText(inspectSummaryText, "INSPECT: None");
    setElementText(inspectDetailsText, "TERRAIN: -   FOOD: -   ORGANISM: -");
    return;
  }

  var tileX = world.inspectedTile.x;
  var tileY = world.inspectedTile.y;
  var terrainName = isFertile(tileX, tileY) ? "fertile" : "barren";
  var hasFood = foodExistsAt(tileX, tileY);
  var organism = getNearestOrganismToTile(tileX, tileY);
  var settlement = getNearestSettlementToTile(tileX, tileY);
  var organismText = "none";
  var settlementText = "none";

  if (organism) {
    var lineageRecord = world.lineages ? world.lineages[String(ensureOrganismLineage(organism))] : null;
    var parentText = lineageRecord && lineageRecord.parentId > 0 ? " parent L" + lineageRecord.parentId : " founder";

    organismText =
      "energy " + organism.energy +
      " age " + organism.age +
      " lineage L" + ensureOrganismLineage(organism) +
      parentText +
      " gen " + organism.generation +
      " pos " + organism.x + "," + organism.y +
      " dir " + organism.directionX + "," + organism.directionY +
      "   " + formatOrganismTraits(organism);
  }

  if (settlement) {
    var settlementRouteSummary = getRouteSummaryForSettlement(settlement.id);

    settlementText =
      "S" + settlement.id +
      " lineage L" + settlement.lineageId +
      (settlement.isColony ? " colony parent S" + settlement.parentSettlementId : (settlement.isOutpost ? " outpost parent S" + settlement.parentSettlementId : " root camp")) +
      " routes " + settlementRouteSummary.activeRoutes + "/" + settlementRouteSummary.routeCount +
      " route food " + settlementRouteSummary.foodTransferred +
      (settlement.isColony ? " network " + Math.max(0, Math.round(Number(world.colonyNetworkScore) || 0)) : "") +
      (settlement.isColony ? " space " + Math.max(0, Number(world.spaceProgramProgress) || 0).toFixed(1) + "/" + CONFIG.SPACE_PROGRAM_LAUNCH_THRESHOLD + " launches " + Math.max(0, Math.round(Number(world.orbitalLaunches) || 0)) : "") +
      (settlement.isColony ? " orbit assets " + (Array.isArray(world.orbitalAssets) ? world.orbitalAssets.length : 0) + " infra " + Math.max(0, Math.round(Number(world.orbitalInfrastructureScore) || 0)) : "") +
      (settlement.isColony ? " planets " + (Array.isArray(world.planetaryBodies) ? world.planetaryBodies.length : 0) + " survey " + Math.max(0, Number(world.planetarySurveyProgress) || 0).toFixed(1) : "") +
      (settlement.isColony ? " probes " + (typeof getCompletedProbeMissionCount === "function" ? getCompletedProbeMissionCount() : 0) + "/" + (Array.isArray(world.probeMissions) ? world.probeMissions.length : 0) : "") +
      (settlement.isColony ? " stars " + (Array.isArray(world.starSystems) ? world.starSystems.length : 0) + " map " + Math.max(0, Number(world.starMapProgress) || 0).toFixed(1) : "") +
      (settlement.isColony ? " galactic claims " + Math.max(0, Math.round(Number(world.galacticClaimedSystems) || 0)) + " influence " + Math.max(0, Number(world.galacticInfluenceProgress) || 0).toFixed(1) : "") +
      (settlement.isColony ? " fleets " + Math.max(0, Math.round(Number(world.interstellarFleetCompleted) || 0)) + "/" + (Array.isArray(world.interstellarFleets) ? world.interstellarFleets.length : 0) + " build " + Math.max(0, Number(world.interstellarFleetProgress) || 0).toFixed(1) : "") +
      (settlement.isColony ? " sectors " + (Array.isArray(world.empireSectors) ? world.empireSectors.length : 0) + " build " + Math.max(0, Number(world.empireSectorProgress) || 0).toFixed(1) : "") +
      (settlement.isColony ? " legacy lvl " + Math.max(0, Math.round(Number(world.empireLegacyLevel) || 0)) + " progress " + Math.max(0, Number(world.empireLegacyProgress) || 0).toFixed(1) : "") +
      " lvl " + settlement.level +
      " influence " + settlement.influenceRadius +
      " claimed " + settlement.claimedTiles +
      " claimed food " + settlement.claimedFood +
      " last outpost " + settlement.lastOutpostTick +
      " supply growth " + settlement.lastSupplyGrowthTick +
      " pop " + settlement.population +
      " nearby " + settlement.foodStock +
      " stored " + settlement.storedFood +
      " dev " + settlement.development.toFixed(1) +
      " last growth " + settlement.lastGrowthTick +
      " founded " + settlement.foundedTick +
      " " + (settlement.isActive ? "active" : "stale");
  }

  setElementText(inspectSummaryText, "INSPECT: Tile " + tileX + "," + tileY);
  setElementText(inspectDetailsText,
    "TERRAIN: " + terrainName +
    "   FOOD: " + (hasFood ? "yes" : "no") +
    "   ORGANISM: " + organismText +
    "   SETTLEMENT: " + settlementText
  );
}

function getTileFromCanvasEvent(event) {
  var rect = canvas.getBoundingClientRect();
  var canvasX = (event.clientX - rect.left) * (canvas.width / rect.width);
  var canvasY = (event.clientY - rect.top) * (canvas.height / rect.height);

  return {
    x: clamp(Math.floor(canvasX / CONFIG.TILE_SIZE), 0, WORLD_WIDTH - 1),
    y: clamp(Math.floor(canvasY / CONFIG.TILE_SIZE), 0, WORLD_HEIGHT - 1)
  };
}

function inspectTile(tileX, tileY) {
  world.inspectedTile = {
    x: clamp(tileX, 0, WORLD_WIDTH - 1),
    y: clamp(tileY, 0, WORLD_HEIGHT - 1)
  };

  drawWorld();
  updateHud();
}

function setPersistenceStatus(message, isError) {
  setElementText(persistenceStatus, message);
  persistenceStatus.classList.toggle("error", Boolean(isError));
}

window.setupControls = function() {
  canvas.addEventListener("click", function(event) {
    var tile = getTileFromCanvasEvent(event);
    inspectTile(tile.x, tile.y);
  });

  pauseButton.addEventListener("click", function() {
    world.isPaused = !world.isPaused;
    world.needsRender = true;
    setElementText(pauseButton, world.isPaused ? "Resume" : "Pause");
  });

  stepButton.addEventListener("click", function() {
    if (world.isPaused) {
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
    }
  });

  speedDownButton.addEventListener("click", function() {
    world.speed = Math.max(1, world.speed - 1);
    updateHud();
  });

  speedUpButton.addEventListener("click", function() {
    world.speed = Math.min(10, world.speed + 1);
    updateHud();
  });

  speedSlider.addEventListener("input", function() {
    applyTuningFromControls(false);
  });

  organismSizeSlider.addEventListener("input", function() {
    applyTuningFromControls(true);
  });

  foodSizeSlider.addEventListener("input", function() {
    applyTuningFromControls(true);
  });

  startingFoodSlider.addEventListener("input", function() {
    applyTuningFromControls(false);
  });

  foodGrowthSlider.addEventListener("input", function() {
    applyTuningFromControls(false);
  });

  restartButton.addEventListener("click", function() {
    applyTuningFromControls(false);
    seedWorld();
    drawWorld();
    updateHud();
    setPersistenceStatus("SAVE: Ready", false);
  });

  saveButton.addEventListener("click", function() {
    setPersistenceStatus("SAVE: Saving...", false);
    saveWorldToIndexedDB()
      .then(function(saveData) {
        setPersistenceStatus("SAVE: Saved tick " + saveData.tick, false);
      })
      .catch(function(error) {
        setPersistenceStatus("SAVE ERROR: " + error.message, true);
      });
  });

  loadButton.addEventListener("click", function() {
    setPersistenceStatus("SAVE: Loading...", false);
    loadWorldFromIndexedDB()
      .then(function(saveData) {
        setPersistenceStatus("SAVE: Loaded tick " + saveData.tick, false);
      })
      .catch(function(error) {
        setPersistenceStatus("LOAD ERROR: " + error.message, true);
      });
  });

  exportJsonButton.addEventListener("click", function() {
    try {
      var saveData = exportWorldToJsonFile();
      setPersistenceStatus("EXPORT: Downloaded tick " + saveData.tick, false);
    } catch (error) {
      setPersistenceStatus("EXPORT ERROR: " + error.message, true);
    }
  });

  importJsonButton.addEventListener("click", function() {
    importJsonFile.click();
  });

  importJsonFile.addEventListener("change", function() {
    var file = importJsonFile.files[0];

    setPersistenceStatus("IMPORT: Loading...", false);
    importWorldFromJsonFile(file)
      .then(function(saveData) {
        setPersistenceStatus("IMPORT: Loaded tick " + saveData.tick, false);
      })
      .catch(function(error) {
        setPersistenceStatus("IMPORT ERROR: " + error.message, true);
      })
      .finally(function() {
        importJsonFile.value = "";
      });
  });
};
