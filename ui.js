function updateHud() {
  var fertilePercent = Math.round(
    (world.fertileTiles / (WORLD_WIDTH * WORLD_HEIGHT)) * 100
  );

  eraText.textContent = "ERA: " + world.era;
  populationText.textContent = "POPULATION: " + world.organisms.length;
  foodText.textContent =
    "TICK: " + world.tick +
    "   FOOD: " + world.food.length +
    "   FERTILE: " + fertilePercent + "%" +
    "   FPS: " + world.fps.toFixed(1) +
    "   TPS: " + world.tps.toFixed(1) +
    "   UPDATE: " + world.updateMs.toFixed(2) + "ms" +
    "   DRAW: " + world.drawMs.toFixed(2) + "ms" +
    "   MAX U/D: " + world.maxUpdateMs.toFixed(2) + "/" + world.maxDrawMs.toFixed(2) + "ms";

  speedLabel.textContent = "Speed: " + world.speed + "x";
  updateTraitSummary();
  updateLineageSummary();
  updateSettlementSummary();
  updateInspectPanel();
  drawTraitHistory();
}

function getNearestOrganismToTile(tileX, tileY) {
  var nearestOrganism = null;
  var nearestDistance = Infinity;

  for (var i = 0; i < world.organisms.length; i++) {
    var organism = world.organisms[i];
    var distance = Math.abs(organism.x - tileX) + Math.abs(organism.y - tileY);

    if (distance < nearestDistance && distance <= 1) {
      nearestOrganism = organism;
      nearestDistance = distance;
    }
  }

  return nearestOrganism;
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
  if (world.organisms.length === 0) {
    return null;
  }

  var totals = {
    vision: 0,
    metabolism: 0,
    reproductionEnergy: 0,
    movementTendency: 0,
    terrainAffinity: 0
  };

  for (var i = 0; i < world.organisms.length; i++) {
    var traits = ensureOrganismTraits(world.organisms[i]);
    totals.vision += traits.vision;
    totals.metabolism += traits.metabolism;
    totals.reproductionEnergy += traits.reproductionEnergy;
    totals.movementTendency += traits.movementTendency;
    totals.terrainAffinity += traits.terrainAffinity;
  }

  return {
    vision: totals.vision / world.organisms.length,
    metabolism: totals.metabolism / world.organisms.length,
    reproductionEnergy: totals.reproductionEnergy / world.organisms.length,
    movementTendency: totals.movementTendency / world.organisms.length,
    terrainAffinity: totals.terrainAffinity / world.organisms.length
  };
}

function updateTraitSummary() {
  var summary = getPopulationTraitSummary();

  if (!summary) {
    traitSummaryText.textContent = "TRAITS AVG: vision -   metabolism -   reproduce -   roam -   habitat -";
    return;
  }

  traitSummaryText.textContent =
    "TRAITS AVG: vision " + summary.vision.toFixed(1) +
    "   metabolism " + summary.metabolism.toFixed(2) +
    "   reproduce " + summary.reproductionEnergy.toFixed(1) +
    "   roam " + summary.movementTendency.toFixed(2) +
    "   habitat " + summary.terrainAffinity.toFixed(2);
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
    lineageSummaryText.textContent = "LINEAGES: -";
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

  lineageSummaryText.textContent =
    "LINEAGES: " + activeLineages.length +
    " active / " + extinctLineages.length + " extinct   " +
    newestText +
    "   top " + (visibleLineages.length > 0 ? visibleLineages.join(" | ") : "-");
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
    topSettlement: topSettlement
  };
}

function updateSettlementSummary() {
  var summary = getSettlementSummary();

  if (!summary) {
    settlementSummaryText.textContent = "SETTLEMENTS: -";
    return;
  }

  settlementSummaryText.textContent =
    "SETTLEMENTS: " + summary.active + "/" + summary.total +
    " active   outposts " + summary.totalOutposts +
    " colonies " + summary.totalColonies +
    " routes " + summary.activeRoutes + "/" + summary.totalRoutes +
    " moved " + summary.totalRouteFoodTransferred +
    "   network score " + summary.colonyNetworkScore +
    " colonies " + summary.colonyNetworkColonies +
    " routes " + summary.colonyNetworkActiveRoutes +
    " claimed " + summary.colonyNetworkClaimedTiles +
    "   camp pop " + summary.totalPopulation +
    "   nearby " + summary.totalFoodStock +
    "   stored " + summary.totalStoredFood +
    "   dev " + summary.totalDevelopment.toFixed(1) +
    "   claimed " + summary.totalClaimedTiles +
    " food " + summary.totalClaimedFood +
    "   top S" + summary.topSettlement.id +
    " L" + summary.topSettlement.lineageId +
    " lvl " + summary.topSettlement.level +
    " influence " + summary.topSettlement.influenceRadius +
    (summary.topSettlement.isColony ? " colony of S" + summary.topSettlement.parentSettlementId : (summary.topSettlement.isOutpost ? " outpost of S" + summary.topSettlement.parentSettlementId : " root camp")) +
    " pop " + summary.topSettlement.population +
    " stored " + summary.topSettlement.storedFood +
    " dev " + summary.topSettlement.development.toFixed(1);
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
    inspectSummaryText.textContent = "INSPECT: None";
    inspectDetailsText.textContent = "TERRAIN: -   FOOD: -   ORGANISM: -";
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

  inspectSummaryText.textContent = "INSPECT: Tile " + tileX + "," + tileY;
  inspectDetailsText.textContent =
    "TERRAIN: " + terrainName +
    "   FOOD: " + (hasFood ? "yes" : "no") +
    "   ORGANISM: " + organismText +
    "   SETTLEMENT: " + settlementText;
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
  persistenceStatus.textContent = message;
  persistenceStatus.classList.toggle("error", Boolean(isError));
}

window.setupControls = function() {
  canvas.addEventListener("click", function(event) {
    var tile = getTileFromCanvasEvent(event);
    inspectTile(tile.x, tile.y);
  });

  pauseButton.addEventListener("click", function() {
    world.isPaused = !world.isPaused;
    pauseButton.textContent = world.isPaused ? "Resume" : "Pause";
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

  restartButton.addEventListener("click", function() {
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
