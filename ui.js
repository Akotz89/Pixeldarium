function updateHud() {
  var fertilePercent = Math.round(
    (world.fertileTiles / (WORLD_WIDTH * WORLD_HEIGHT)) * 100
  );

  setElementText(eraText, "ERA: " + world.era);
  setElementText(populationText, "POPULATION: " + world.organisms.length);
  setElementClass(foodText, "hud-metrics");
  setElementHtml(foodText, [
    makeHudMetric("Tick", world.tick),
    makeHudMetric("Food", world.food.length),
    makeHudMetric("Fertile", fertilePercent + "%"),
    makeHudMetric("FPS", world.fps.toFixed(1)),
    makeHudMetric("TPS", world.tps.toFixed(1)),
    makeHudMetric("Update", world.updateMs.toFixed(2) + "ms"),
    makeHudMetric("Draw", world.drawMs.toFixed(2) + "ms"),
    makeHudMetric("Max", world.maxUpdateMs.toFixed(2) + "/" + world.maxDrawMs.toFixed(2) + "ms")
  ].join(""));

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

function makeHudMetric(label, value) {
  return (
    "<span class=\"hud-metric\">" +
    "<b>" + escapeSummaryText(label) + "</b>" +
    "<span>" + escapeSummaryText(value) + "</span>" +
    "</span>"
  );
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
  return typeof getNearestInfluencingSettlement === "function"
    ? getNearestInfluencingSettlement(tileX, tileY)
    : null;
}

function getRouteSummaryForSettlement(settlementId) {
  if (typeof getSettlementRouteStats === "function") {
    return getSettlementRouteStats(settlementId);
  }

  return {
    routeCount: 0,
    activeRoutes: 0,
    foodTransferred: 0
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

function updateLineageSummary() {
  setElementText(lineageSummaryText, world.lineageSummaryText || "LINEAGES: -");
}

function getSettlementSummary() {
  if (!world.settlementSummary && typeof refreshSettlementSummaryCache === "function") {
    return refreshSettlementSummaryCache();
  }

  return world.settlementSummary;
}

function escapeSummaryText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getProgressRatio(currentValue, targetValue) {
  var target = Math.max(1, Number(targetValue) || 1);
  return clamp((Number(currentValue) || 0) / target, 0, 1);
}

function makeSummaryChip(label, value) {
  return (
    "<span class=\"summary-chip\">" +
    "<b>" + escapeSummaryText(label) + "</b>" +
    "<span class=\"summary-chip-value\">" + escapeSummaryText(value) + "</span>" +
    "</span>"
  );
}

function makeInspectChip(label, value) {
  return (
    "<span class=\"inspect-chip\">" +
    "<b>" + escapeSummaryText(label) + "</b>" +
    "<span>" + escapeSummaryText(value) + "</span>" +
    "</span>"
  );
}

function makeSummaryProgressChip(label, currentValue, targetValue, value, isReady, isComplete) {
  var ratio = getProgressRatio(currentValue, targetValue);
  var percent = Math.round(ratio * 100);
  var className = "summary-chip summary-progress-chip";

  if (isReady) {
    className += " ready";
  }

  if (isComplete) {
    className += " complete";
  }

  return (
    "<span class=\"" + className + "\">" +
    "<span class=\"summary-chip-top\">" +
    "<b>" + escapeSummaryText(label) + "</b>" +
    "<span class=\"summary-chip-value\">" + escapeSummaryText(value) + "</span>" +
    "</span>" +
    "<span class=\"summary-progress-track\"><span style=\"width: " + percent + "%\"></span></span>" +
    "</span>"
  );
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
    makeSummaryChip("Settlements", summary.active + "/" + summary.total),
    makeSummaryChip("Outposts", summary.totalOutposts),
    makeSummaryChip("Colonies", summary.totalColonies),
    makeSummaryChip("Routes", summary.activeRoutes + "/" + summary.totalRoutes),
    makeSummaryChip("Moved", summary.totalRouteFoodTransferred),
    makeSummaryChip("Network", summary.colonyNetworkScore),
    makeSummaryProgressChip("Space", summary.spaceProgramProgress, CONFIG.SPACE_PROGRAM_LAUNCH_THRESHOLD, summary.spaceProgramProgress.toFixed(1) + "/" + CONFIG.SPACE_PROGRAM_LAUNCH_THRESHOLD, summary.spaceProgramReady, summary.orbitalLaunches > 0),
    makeSummaryChip("Launches", summary.orbitalLaunches),
    makeSummaryChip("Orbit", summary.orbitalAssets + " / " + summary.orbitalInfrastructureScore),
    makeSummaryProgressChip("Planets", summary.planetarySurveyProgress, CONFIG.PLANETARY_DISCOVERY_THRESHOLD, summary.planetaryBodies + " / " + summary.planetarySurveyProgress.toFixed(1), summary.planetarySurveyReady, summary.planetaryBodies > 0),
    makeSummaryProgressChip("Probes", summary.probeMissionProgress, CONFIG.PROBE_MISSION_THRESHOLD, summary.completedProbeMissions + "/" + summary.probeMissions, summary.probeMissionReady, summary.completedProbeMissions > 0),
    makeSummaryProgressChip("Stars", summary.starMapProgress, CONFIG.STAR_SYSTEM_DISCOVERY_THRESHOLD, summary.starSystems + " / " + summary.starMapProgress.toFixed(1), summary.starMapReady, summary.starSystems > 0),
    makeSummaryProgressChip("Claims", summary.galacticInfluenceProgress, CONFIG.GALACTIC_SYSTEM_CLAIM_THRESHOLD, summary.galacticClaimedSystems + " / " + summary.galacticInfluenceProgress.toFixed(1), summary.galacticInfluenceReady, summary.galacticClaimedSystems > 0),
    makeSummaryProgressChip("Fleets", summary.interstellarFleetProgress, CONFIG.INTERSTELLAR_FLEET_BUILD_THRESHOLD, summary.interstellarFleetCompleted + "/" + summary.interstellarFleets, summary.interstellarFleetReady, summary.interstellarFleetCompleted > 0),
    makeSummaryProgressChip("Sectors", summary.empireSectorProgress, CONFIG.EMPIRE_SECTOR_BUILD_THRESHOLD, summary.empireSectors + " / " + summary.empireSectorProgress.toFixed(1), summary.empireSectorReady, summary.empireSectors > 0),
    makeSummaryProgressChip("Legacy", summary.empireLegacyProgress, CONFIG.EMPIRE_LEGACY_THRESHOLD, "L" + summary.empireLegacyLevel + " " + legacyState, summary.empireLegacyReady, summary.empireLegacyComplete),
    makeSummaryChip("Camp Pop", summary.totalPopulation),
    makeSummaryChip("Stored", summary.totalStoredFood),
    makeSummaryChip("Claimed", summary.totalClaimedTiles),
    makeSummaryChip("Top", "S" + summary.topSettlement.id + " L" + summary.topSettlement.lineageId),
    makeSummaryChip("Top Level", summary.topSettlement.level + " / " + summary.topSettlement.influenceRadius),
    makeSummaryChip("Top Type", topType),
    makeSummaryChip("Top Pop", summary.topSettlement.population),
    makeSummaryChip("Top Dev", summary.topSettlement.development.toFixed(1))
  ];

  setElementClass(settlementSummaryText, "summary-grid");
  setElementHtml(settlementSummaryText, chips.join(""));
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
    setElementClass(inspectDetailsText, "");
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
  var detailChips = [
    makeInspectChip("Terrain", terrainName),
    makeInspectChip("Food", hasFood ? "yes" : "no")
  ];

  if (organism) {
    var lineageRecord = world.lineages ? world.lineages[String(ensureOrganismLineage(organism))] : null;
    var parentText = lineageRecord && lineageRecord.parentId > 0 ? " parent L" + lineageRecord.parentId : " founder";
    var traits = ensureOrganismTraits(organism);

    detailChips.push(makeInspectChip("Organism", "L" + ensureOrganismLineage(organism) + parentText));
    detailChips.push(makeInspectChip("Org Energy", organism.energy));
    detailChips.push(makeInspectChip("Org Age", organism.age));
    detailChips.push(makeInspectChip("Org Gen", organism.generation));
    detailChips.push(makeInspectChip("Org Pos", organism.x + "," + organism.y));
    detailChips.push(makeInspectChip("Org Dir", organism.directionX + "," + organism.directionY));
    detailChips.push(makeInspectChip("Org Traits", "V" + traits.vision + " M" + traits.metabolism + " R" + traits.reproductionEnergy + " roam " + traits.movementTendency.toFixed(2) + " hab " + traits.terrainAffinity.toFixed(2)));
  } else {
    detailChips.push(makeInspectChip("Organism", "none"));
  }

  if (settlement) {
    var settlementRouteSummary = getRouteSummaryForSettlement(settlement.id);
    var settlementType = settlement.isColony ? "colony S" + settlement.parentSettlementId : (settlement.isOutpost ? "outpost S" + settlement.parentSettlementId : "root camp");

    detailChips.push(makeInspectChip("Settlement", "S" + settlement.id + " L" + settlement.lineageId));
    detailChips.push(makeInspectChip("Set Type", settlementType));
    detailChips.push(makeInspectChip("Routes", settlementRouteSummary.activeRoutes + "/" + settlementRouteSummary.routeCount));
    detailChips.push(makeInspectChip("Route Food", settlementRouteSummary.foodTransferred));
    detailChips.push(makeInspectChip("Level", settlement.level));
    detailChips.push(makeInspectChip("Influence", settlement.influenceRadius));
    detailChips.push(makeInspectChip("Claimed", settlement.claimedTiles + " / food " + settlement.claimedFood));
    detailChips.push(makeInspectChip("Population", settlement.population));
    detailChips.push(makeInspectChip("Nearby Food", settlement.foodStock));
    detailChips.push(makeInspectChip("Stored", settlement.storedFood));
    detailChips.push(makeInspectChip("Dev", settlement.development.toFixed(1)));
    detailChips.push(makeInspectChip("Growth", "last " + settlement.lastGrowthTick + " supply " + settlement.lastSupplyGrowthTick));
    detailChips.push(makeInspectChip("Outpost", "last " + settlement.lastOutpostTick));
    detailChips.push(makeInspectChip("Founded", settlement.foundedTick));
    detailChips.push(makeInspectChip("Status", settlement.isActive ? "active" : "stale"));

    if (settlement.isColony) {
      detailChips.push(makeInspectChip("Network", Math.max(0, Math.round(Number(world.colonyNetworkScore) || 0))));
      detailChips.push(makeInspectChip("Space", Math.max(0, Number(world.spaceProgramProgress) || 0).toFixed(1) + "/" + CONFIG.SPACE_PROGRAM_LAUNCH_THRESHOLD));
      detailChips.push(makeInspectChip("Orbit", (Array.isArray(world.orbitalAssets) ? world.orbitalAssets.length : 0) + " / " + Math.max(0, Math.round(Number(world.orbitalInfrastructureScore) || 0))));
      detailChips.push(makeInspectChip("Planets", (Array.isArray(world.planetaryBodies) ? world.planetaryBodies.length : 0) + " / " + Math.max(0, Number(world.planetarySurveyProgress) || 0).toFixed(1)));
      detailChips.push(makeInspectChip("Probes", (typeof getCompletedProbeMissionCount === "function" ? getCompletedProbeMissionCount() : 0) + "/" + (Array.isArray(world.probeMissions) ? world.probeMissions.length : 0)));
      detailChips.push(makeInspectChip("Stars", (Array.isArray(world.starSystems) ? world.starSystems.length : 0) + " / " + Math.max(0, Number(world.starMapProgress) || 0).toFixed(1)));
      detailChips.push(makeInspectChip("Claims", Math.max(0, Math.round(Number(world.galacticClaimedSystems) || 0)) + " / " + Math.max(0, Number(world.galacticInfluenceProgress) || 0).toFixed(1)));
      detailChips.push(makeInspectChip("Fleets", Math.max(0, Math.round(Number(world.interstellarFleetCompleted) || 0)) + "/" + (Array.isArray(world.interstellarFleets) ? world.interstellarFleets.length : 0)));
      detailChips.push(makeInspectChip("Sectors", (Array.isArray(world.empireSectors) ? world.empireSectors.length : 0) + " / " + Math.max(0, Number(world.empireSectorProgress) || 0).toFixed(1)));
      detailChips.push(makeInspectChip("Legacy", "L" + Math.max(0, Math.round(Number(world.empireLegacyLevel) || 0)) + " / " + Math.max(0, Number(world.empireLegacyProgress) || 0).toFixed(1)));
    }
  } else {
    detailChips.push(makeInspectChip("Settlement", "none"));
  }

  setElementText(inspectSummaryText, "INSPECT: Tile " + tileX + "," + tileY);
  setElementClass(inspectDetailsText, "inspect-grid");
  setElementHtml(inspectDetailsText, detailChips.join(""));
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
