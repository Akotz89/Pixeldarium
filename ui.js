function updateHud() {
  var fertilePercent = world.planetSummary
    ? Math.round(world.planetSummary.fertileLandPercent)
    : Math.round((world.fertileTiles / (WORLD_WIDTH * WORLD_HEIGHT)) * 100);
  var waterPercent = world.planetSummary
    ? Math.round(world.planetSummary.waterPercent)
    : 0;
  var estimatedIndividuals = world.organisms.length * Math.max(1, Math.round(Number(CONFIG.ORGANISM_POPULATION_UNIT) || 1));
  var lifecycleState = world.isExtinct ? "extinct" : (world.isPaused ? "paused" : "running");
  var planetScaleInfo = getPlanetCameraScaleInfo();
  var planetCacheStats = getPlanetSurfaceCacheStats();
  var renderCacheStats = getLocalSurfaceRenderCacheStats();
  var centerPyramidLineage = getPlanetSurfaceChunkLineage(
    getPlanetLocalSurfaceAddress(Math.floor(WORLD_WIDTH / 2), Math.floor(WORLD_HEIGHT / 2)).address
  );

  setElementClass(eraText, "hud-card hud-era");
  setElementHtml(eraText, makeHudPrimary("Era", world.era, lifecycleState));
  setElementClass(populationText, "hud-card hud-population");
  setElementHtml(
    populationText,
    makeHudPrimary("Population Bands", world.organisms.length, "~" + estimatedIndividuals.toLocaleString() + " individuals")
  );
  setElementClass(foodText, "hud-metrics");
  setElementHtml(foodText, [
    makeHudMetric("Tick", world.tick),
    makeHudMetric("Day", getSimulationDayLabel()),
    makeHudMetric("Food", world.food.length),
    makeHudMetric("Water", waterPercent + "%"),
    makeHudMetric("Fertile Land", fertilePercent + "%"),
    makeHudMetric("Zoom", getPlanetScaleLabel()),
    makeHudMetric("Ground Px", getPlanetDistanceLabel(planetScaleInfo.metersPerCanvasPixel) + "/px"),
    makeHudMetric("Footprint", getPlanetDistanceLabel(planetScaleInfo.footprintWidthKm * 1000) + " x " + getPlanetDistanceLabel(planetScaleInfo.footprintHeightKm * 1000)),
    makeHudMetric("Camera", "~" + getPlanetDistanceLabel(planetScaleInfo.approximateAltitudeKm * 1000)),
    makeHudMetric("Surface Cache", planetCacheStats.chunks + "c/" + planetCacheStats.samples + "s"),
    makeHudMetric("Render Chunks", renderCacheStats.lastVisibleChunks + "v/" + renderCacheStats.chunks + "c " + renderCacheStats.hits + "h"),
    makeHudMetric("Pyramid", centerPyramidLineage.length + " parents"),
    makeHudMetric("Travel", Math.round(getOrganismTravelKmPerTick()) + " km/tick"),
    makeHudMetric("FPS", world.fps.toFixed(1)),
    makeHudMetric("TPS", world.tps.toFixed(1)),
    makeHudMetric("Update", world.updateMs.toFixed(2) + "ms"),
    makeHudMetric("Draw", world.drawMs.toFixed(2) + "ms"),
    makeHudMetric("Max", world.maxUpdateMs.toFixed(2) + "/" + world.maxDrawMs.toFixed(2) + "ms")
  ].join(""));

  setElementText(speedLabel, "Speed: " + world.speed + "x");
  syncTuningControls();
  syncControlStates();
  updateEcosystemSummary();
  updateSimulationAlerts();
  updateTraitSummary();
  updateLineageSummary();
  updateSettlementSummary();
  updateEventLog();
  updateInspectPanel();
}

function getSimulationDay() {
  return Math.max(0, Math.round(Number(world.tick) || 0)) *
    Math.max(0, Number(CONFIG.SIM_DAYS_PER_TICK) || 0);
}

function getSimulationDayLabel() {
  var day = getSimulationDay();
  var year = Math.floor(day / 365);
  var dayOfYear = Math.floor(day % 365);

  return "Y" + year + " D" + dayOfYear;
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

function makeHudPrimary(label, value, detail) {
  return (
    "<span class=\"hud-primary-label\">" + escapeSummaryText(label) + "</span>" +
    "<strong>" + escapeSummaryText(value) + "</strong>" +
    "<small>" + escapeSummaryText(detail || "") + "</small>"
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
  setInputValue(seedInput, world.seedText);
}

function setButtonPressed(button, isPressed) {
  button.setAttribute("aria-pressed", isPressed ? "true" : "false");
  button.classList.toggle("active", Boolean(isPressed));
}

function setButtonDisabled(button, isDisabled) {
  button.disabled = Boolean(isDisabled);
  button.setAttribute("aria-disabled", isDisabled ? "true" : "false");
}

function syncControlStates() {
  setElementClass(
    controlsPanel,
    "controls-state " + (world.isExtinct ? "controls-extinct" : (world.isPaused ? "controls-paused" : "controls-running"))
  );
  setElementText(pauseButton, world.isExtinct ? "Extinct" : (world.isPaused ? "Resume" : "Pause"));
  setButtonPressed(pauseButton, world.isPaused);
  pauseButton.classList.toggle("danger", Boolean(world.isExtinct));
  setButtonDisabled(pauseButton, world.isExtinct);
  setButtonDisabled(stepButton, world.isExtinct || !world.isPaused);
  setButtonDisabled(speedDownButton, world.isExtinct || world.speed <= 1);
  setButtonDisabled(speedUpButton, world.isExtinct || world.speed >= 10);
  pauseButton.title = world.isExtinct ? "Run extinct. Restart to seed a new population." : "Pause or resume simulation (Space)";
  stepButton.title = "Advance one tick while paused (N)";
  speedDownButton.title = "Decrease simulation speed (-)";
  speedUpButton.title = "Increase simulation speed (+)";
  restartButton.title = "Restart with current tuning (R)";
  pauseButton.setAttribute("aria-keyshortcuts", "Space");
  stepButton.setAttribute("aria-keyshortcuts", "N");
  speedDownButton.setAttribute("aria-keyshortcuts", "-");
  speedUpButton.setAttribute("aria-keyshortcuts", "+");
  restartButton.setAttribute("aria-keyshortcuts", "R");
}

function syncMenuState() {
  setElementClass(gameWrap, world.isMenuOpen ? "menu-open" : "menu-closed");
  menuToggleButton.setAttribute("aria-expanded", world.isMenuOpen ? "true" : "false");
  uiMenu.setAttribute("aria-hidden", world.isMenuOpen ? "false" : "true");
  menuBackdrop.setAttribute("aria-hidden", world.isMenuOpen ? "false" : "true");
  menuBackdrop.tabIndex = world.isMenuOpen ? 0 : -1;

  if (world.isMenuOpen) {
    uiMenu.removeAttribute("inert");
  } else {
    uiMenu.setAttribute("inert", "");
  }

  setElementText(menuToggleText, world.isMenuOpen ? "Close" : "Menu");
  menuToggleButton.setAttribute("aria-label", world.isMenuOpen ? "Close simulation menu" : "Open simulation menu");
}

function setMenuOpen(isOpen) {
  var nextOpen = Boolean(isOpen);

  if (world.isMenuOpen === nextOpen) {
    return false;
  }

  world.isMenuOpen = nextOpen;
  syncMenuState();
  return true;
}

function toggleMenuOpen() {
  return setMenuOpen(!world.isMenuOpen);
}

function syncMenuPage() {
  var activePage = world.menuPage || "controls";
  var pages = uiMenu.querySelectorAll("[data-menu-page]");
  var tabs = menuTabs.querySelectorAll("[data-menu-target]");

  for (var pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    pages[pageIndex].hidden = pages[pageIndex].getAttribute("data-menu-page") !== activePage;
  }

  for (var tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
    var isActive = tabs[tabIndex].getAttribute("data-menu-target") === activePage;
    tabs[tabIndex].classList.toggle("active", isActive);
    tabs[tabIndex].setAttribute("aria-pressed", isActive ? "true" : "false");
  }
}

function setMenuPage(pageName) {
  var nextPage = String(pageName || "controls");

  if (!/^(controls|status|ecosystem|log)$/.test(nextPage)) {
    nextPage = "controls";
  }

  if (world.menuPage === nextPage) {
    syncMenuPage();
    return false;
  }

  world.menuPage = nextPage;
  syncMenuPage();
  return true;
}

function applyTuningFromControls(redraw) {
  world.speed = clamp(Math.round(getTuningInputNumber(speedSlider, world.speed)), 1, 10);
  CONFIG.ORGANISM_DRAW_SIZE = clamp(Math.round(getTuningInputNumber(organismSizeSlider, CONFIG.ORGANISM_DRAW_SIZE)), 2, 14);
  CONFIG.FOOD_DRAW_SIZE = clamp(Math.round(getTuningInputNumber(foodSizeSlider, CONFIG.FOOD_DRAW_SIZE)), 1, 8);
  CONFIG.STARTING_FOOD = clamp(Math.round(getTuningInputNumber(startingFoodSlider, CONFIG.STARTING_FOOD)), 100, 1000);
  CONFIG.MAX_FOOD = Math.max(CONFIG.MAX_FOOD, CONFIG.STARTING_FOOD);
  CONFIG.FERTILE_FOOD_GROWTH_CHANCE = clamp(getTuningInputNumber(foodGrowthSlider, CONFIG.FERTILE_FOOD_GROWTH_CHANCE * 100) / 100, 0, 1);
  world.seedText = normalizeSeedText(seedInput.value);

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

function getInspectContextRadius() {
  return Math.max(4, Math.round(Number(CONFIG.SETTLEMENT_RADIUS) / 2 || 6));
}

function countFertileTilesInRadius(tileX, tileY, radius) {
  var normalizedRadius = Math.max(0, Math.round(Number(radius) || 0));
  var fertileTiles = 0;
  var sampledTiles = 0;

  for (var y = Math.max(0, tileY - normalizedRadius); y <= Math.min(WORLD_HEIGHT - 1, tileY + normalizedRadius); y++) {
    var rowRadius = normalizedRadius - Math.abs(tileY - y);

    for (var dx = -rowRadius; dx <= rowRadius; dx++) {
      var x = getWrappedWorldX(tileX + dx);
      sampledTiles++;

      if (isFertile(x, y)) {
        fertileTiles++;
      }
    }
  }

  return {
    fertileTiles: fertileTiles,
    sampledTiles: sampledTiles,
    fertilePercent: sampledTiles > 0 ? (fertileTiles / sampledTiles) * 100 : 0
  };
}

function getDistanceLabel(distance, distanceKm) {
  if (!Number.isFinite(distance)) {
    return "-";
  }

  if (Number.isFinite(distanceKm)) {
    return String(distance) + " / " + Math.round(distanceKm).toLocaleString() + " km";
  }

  return String(distance);
}

function getLocalInspectContext(tileX, tileY) {
  var contextRadius = getInspectContextRadius();
  var nearbyOrganisms = typeof collectOrganismsInRadius === "function"
    ? collectOrganismsInRadius(tileX, tileY, contextRadius, 0)
    : [];
  var nearbyFood = typeof countFoodInRadius === "function"
    ? countFoodInRadius(tileX, tileY, contextRadius)
    : 0;
  var fertileContext = countFertileTilesInRadius(tileX, tileY, contextRadius);
  var nearestFood = typeof findNearestFoodInBuckets === "function"
    ? findNearestFoodInBuckets(tileX, tileY, contextRadius * 2)
    : null;
  var nearestSettlementDistance = typeof getDistanceToNearestSettlement === "function"
    ? getDistanceToNearestSettlement(tileX, tileY, contextRadius * 4)
    : Infinity;
  var localPressure = "open";

  if (world.isExtinct) {
    localPressure = "extinct";
  } else if (nearbyOrganisms.length >= contextRadius * 2) {
    localPressure = "crowded";
  } else if (nearbyFood <= 0 && nearbyOrganisms.length > 0) {
    localPressure = "starving";
  } else if (nearbyFood >= nearbyOrganisms.length && fertileContext.fertilePercent >= 45) {
    localPressure = "rich";
  } else if (nearbyOrganisms.length > 0) {
    localPressure = "active";
  }

  return {
    radius: contextRadius,
    nearbyOrganisms: nearbyOrganisms.length,
    nearbyFood: nearbyFood,
    fertilePercent: fertileContext.fertilePercent,
    nearestFoodDistance: nearestFood ? getTileManhattanDistance(tileX, tileY, nearestFood.x, nearestFood.y) : Infinity,
    nearestFoodDistanceKm: nearestFood ? getTileGreatCircleDistanceKm(tileX, tileY, nearestFood.x, nearestFood.y) : Infinity,
    nearestSettlementDistance: nearestSettlementDistance,
    localPressure: localPressure
  };
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
    setElementClass(traitSummaryText, "");
    setElementText(traitSummaryText, "TRAITS AVG: vision -   metabolism -   reproduce -   roam -   habitat -");
    return;
  }

  var chips = [
    makeSummaryChip("Vision", summary.vision.toFixed(1)),
    makeSummaryChip("Metabolism", summary.metabolism.toFixed(2)),
    makeSummaryChip("Reproduce", summary.reproductionEnergy.toFixed(1)),
    makeSummaryChip("Roam", summary.movementTendency.toFixed(2)),
    makeSummaryChip("Habitat", summary.terrainAffinity.toFixed(2))
  ];

  setElementClass(traitSummaryText, "summary-grid trait-summary-grid");
  setElementHtml(traitSummaryText, chips.join(""));
}

function updateLineageSummary() {
  var summary = world.lineageSummary || null;

  if (!summary) {
    setElementClass(lineageSummaryText, "");
    setElementText(lineageSummaryText, world.lineageSummaryText || "LINEAGES: -");
    return;
  }

  var newestLabel = summary.newestParentId > 0
    ? "L" + summary.newestId + " <- L" + summary.newestParentId
    : "L" + summary.newestId + " founder";
  var chips = [
    makeSummaryChip("Active", summary.activeCount),
    makeSummaryChip("Extinct", summary.extinctCount),
    makeSummaryChip("Newest", newestLabel)
  ];

  for (var i = 0; i < summary.topLineages.length; i++) {
    var lineage = summary.topLineages[i];
    chips.push(makeSummaryChip(
      "Top L" + lineage.id,
      lineage.activeCount + " / peak " + lineage.peakPopulation
    ));
  }

  setElementClass(lineageSummaryText, "summary-grid lineage-summary-grid");
  setElementHtml(lineageSummaryText, chips.join(""));
}

function getSettlementSummary() {
  if (!world.settlementSummary && typeof refreshSettlementSummaryCache === "function") {
    return refreshSettlementSummaryCache();
  }

  return world.settlementSummary;
}

function getEarlyProgressionSummary() {
  if (typeof refreshEarlyProgressionSummaryCache === "function") {
    return refreshEarlyProgressionSummaryCache();
  }

  return null;
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

function makeDashboardCard(title, tone, bodyHtml) {
  return (
    "<section class=\"dashboard-card dashboard-" + escapeSummaryText(tone || "neutral") + "\">" +
    "<h2>" + escapeSummaryText(title) + "</h2>" +
    bodyHtml +
    "</section>"
  );
}

function makePrimaryMetric(label, value, detail) {
  return (
    "<div class=\"primary-metric\">" +
    "<span>" + escapeSummaryText(label) + "</span>" +
    "<strong>" + escapeSummaryText(value) + "</strong>" +
    "<small>" + escapeSummaryText(detail || "") + "</small>" +
    "</div>"
  );
}

function makeMetricRow(label, value) {
  return (
    "<span class=\"metric-row\">" +
    "<b>" + escapeSummaryText(label) + "</b>" +
    "<span>" + escapeSummaryText(value) + "</span>" +
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

function makeAlertChip(alert) {
  return (
    "<span class=\"alert-chip alert-" + escapeSummaryText(alert.severity || "info") + "\">" +
    "<b>" + escapeSummaryText(alert.label || "Simulation") + "</b>" +
    "<span>" + escapeSummaryText(alert.detail || "") + "</span>" +
    "</span>"
  );
}

function getEcosystemSummary() {
  if (!world.ecosystemSummary && typeof refreshEcosystemSummary === "function") {
    return refreshEcosystemSummary();
  }

  return world.ecosystemSummary;
}

function getSimulationAlerts() {
  if (typeof refreshSimulationAlerts === "function") {
    return refreshSimulationAlerts();
  }

  return Array.isArray(world.simulationAlerts) ? world.simulationAlerts : [];
}

function updateSimulationAlerts() {
  var alerts = getSimulationAlerts();

  if (alerts.length === 0) {
    setElementClass(simulationAlertsText, "");
    setElementText(simulationAlertsText, "ALERTS: -");
    return;
  }

  var chips = [];

  for (var i = 0; i < alerts.length; i++) {
    chips.push(makeAlertChip(alerts[i]));
  }

  setElementClass(simulationAlertsText, "alert-grid");
  setElementHtml(simulationAlertsText, chips.join(""));
}

function formatStabilityProfileMix(profile) {
  if (!profile) {
    return "-";
  }

  return (
    "P" + Math.max(0, Math.round(Number(profile.population) || 0)) +
    " E" + Math.max(0, Math.round(Number(profile.energy) || 0)) +
    " F" + Math.max(0, Math.round(Number(profile.food) || 0)) +
    " D" + Math.max(0, Math.round(Number(profile.diversity) || 0)) +
    " M" + Math.max(0, Math.round(Number(profile.maturity) || 0))
  );
}

function formatStabilityLimiter(profile) {
  if (!profile || !profile.limitingFactor) {
    return "-";
  }

  if (typeof formatEcosystemStabilityFactorScore === "function") {
    return formatEcosystemStabilityFactorScore(profile);
  }

  return String(profile.limitingFactor);
}

function updateEcosystemSummary() {
  var summary = getEcosystemSummary();

  if (!summary) {
    setElementClass(ecosystemSummaryText, "");
    setElementText(ecosystemSummaryText, "ECOSYSTEM: -");
    drawEcosystemHistory();
    return;
  }

  var trend = summary.trend || {};
  var lifecycleLabel = world.isExtinct
    ? "extinct T" + Math.max(0, Math.round(Number(world.extinctionTick) || 0))
    : "active";
  var stabilityDetail = summary.momentum + " / " + formatStabilityLimiter(summary.stabilityProfile);
  var populationDetail = summary.populationBalance + " " + formatSignedNumber(world.populationDeltaThisTick, 0);
  var foodRunway = typeof formatFoodRunway === "function" ? formatFoodRunway(summary.foodRunwayTicks) : "-";
  var cards = [
    makeDashboardCard("System", "status",
      makePrimaryMetric("Pressure", summary.pressure, stabilityDetail) +
      makeMetricRow("Lifecycle", lifecycleLabel) +
      makeMetricRow("Stability", summary.stabilityScore + "/100") +
      makeMetricRow("Next Fix", summary.recoveryAction || "-") +
      makeMetricRow("Health Mix", formatStabilityProfileMix(summary.stabilityProfile))
    ),
    makeDashboardCard("Population", "population",
      makePrimaryMetric("Organisms", summary.population, populationDetail) +
      makeMetricRow("Flow", "+" + world.birthsThisTick + " / -" + world.deathsThisTick) +
      makeMetricRow("Lifetime", world.totalBirths + " / " + world.totalDeaths) +
      makeMetricRow("Mature", summary.matureOrganisms + "/" + summary.population) +
      makeMetricRow("Lineages", summary.activeLineages)
    ),
    makeDashboardCard("Food", "food",
      makePrimaryMetric("Stock", summary.food, summary.resourceBalance + " " + formatSignedNumber(summary.foodNetThisTick || 0, 0)) +
      makeMetricRow("Food/Org", summary.foodPerOrganism.toFixed(2)) +
      makeMetricRow("Runway", foodRunway) +
      makeMetricRow("Regrowth", Math.round((summary.foodRecoveryPressure || 0) * 100) + "% / " + (summary.foodRecoveryAttempts || 0)) +
      makeMetricRow("Food Life", world.totalFoodSpawned + " / " + world.totalFoodConsumed)
    ),
    makeDashboardCard("Trends", "trend",
      makePrimaryMetric("Stability", formatSignedNumber(trend.stabilityDelta || 0, 0), "since last sample") +
      makeMetricRow("Population", formatSignedNumber(trend.populationDelta || 0, 0)) +
      makeMetricRow("Energy", formatSignedNumber(trend.energyDelta || 0, 1)) +
      makeMetricRow("Food", formatSignedNumber(trend.foodDelta || 0, 0)) +
      makeMetricRow("Flow", formatSignedNumber(trend.foodNetDelta || 0, 0)) +
      makeMetricRow("Runway", formatSignedNumber(trend.foodRunwayDelta || 0, 0))
    )
  ];

  setElementClass(ecosystemSummaryText, "ecosystem-dashboard ecosystem-" + summary.pressure);
  setElementHtml(ecosystemSummaryText, cards.join(""));
  drawEcosystemHistory();
}

function formatSignedNumber(value, decimals) {
  var numberValue = Number(value) || 0;
  var fixedValue = Math.abs(numberValue).toFixed(decimals);

  if (numberValue > 0) {
    return "+" + fixedValue;
  }

  if (numberValue < 0) {
    return "-" + fixedValue;
  }

  return decimals > 0 ? "0." + "0".repeat(decimals) : "0";
}

function makeEventChip(event) {
  return (
    "<article class=\"event-entry event-" + escapeSummaryText(event.type || "sim") + "\">" +
    "<span class=\"event-tick\">T" + escapeSummaryText(event.tick) + "</span>" +
    "<span class=\"event-copy\">" +
    "<b>" + escapeSummaryText(event.label || "Event") + "</b>" +
    "<span>" + escapeSummaryText(event.detail || "") + "</span>" +
    "</span>" +
    "</article>"
  );
}

function scaleHistoryValue(value, minValue, maxValue, height) {
  if (maxValue <= minValue) {
    return height / 2;
  }

  return height - clamp((value - minValue) / (maxValue - minValue), 0, 1) * height;
}

function getHistoryRange(samples, getValue, fallbackMax) {
  var minValue = Infinity;
  var maxValue = -Infinity;

  for (var i = 0; i < samples.length; i++) {
    var value = Number(getValue(samples[i])) || 0;
    minValue = Math.min(minValue, value);
    maxValue = Math.max(maxValue, value);
  }

  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return {
      min: 0,
      max: fallbackMax
    };
  }

  if (minValue === maxValue) {
    maxValue = Math.max(fallbackMax, maxValue + 1);
    minValue = 0;
  }

  return {
    min: minValue,
    max: maxValue
  };
}

function getSymmetricHistoryRange(samples, getValue, fallbackMagnitude) {
  var magnitude = Math.max(1, Math.abs(Number(fallbackMagnitude) || 1));

  for (var i = 0; i < samples.length; i++) {
    magnitude = Math.max(magnitude, Math.abs(Number(getValue(samples[i])) || 0));
  }

  return {
    min: -magnitude,
    max: magnitude
  };
}

function getFoodRunwayHistoryRange(samples) {
  var maxRunway = 40;

  for (var i = 0; i < samples.length; i++) {
    var value = Number(samples[i].foodRunwayTicks);

    if (Number.isFinite(value) && value >= 0) {
      maxRunway = Math.max(maxRunway, value);
    }
  }

  return {
    min: 0,
    max: Math.max(1, maxRunway)
  };
}

function getFoodRunwayHistoryValue(sample, range) {
  var runwayTicks = Number(sample.foodRunwayTicks);

  if (Number.isFinite(runwayTicks) && runwayTicks >= 0) {
    return runwayTicks;
  }

  return null;
}

function drawEcosystemHistoryGuide(chart, ratio, color) {
  var y = chart.y + clamp(Number(ratio) || 0, 0, 1) * chart.height;

  ecosystemHistoryCtx.strokeStyle = color;
  ecosystemHistoryCtx.lineWidth = 1;
  ecosystemHistoryCtx.beginPath();
  ecosystemHistoryCtx.moveTo(chart.x, y);
  ecosystemHistoryCtx.lineTo(chart.x + chart.width, y);
  ecosystemHistoryCtx.stroke();
}

function drawEcosystemHistoryLine(samples, getValue, color, chart, range) {
  if (samples.length === 0) {
    return;
  }

  ecosystemHistoryCtx.strokeStyle = color;
  ecosystemHistoryCtx.fillStyle = color;
  ecosystemHistoryCtx.lineWidth = 2;
  ecosystemHistoryCtx.beginPath();
  var hasActiveSegment = false;
  var finitePointCount = 0;
  var lastFinitePoint = null;

  for (var i = 0; i < samples.length; i++) {
    var x = chart.x;

    if (samples.length > 1) {
      x += (i / (samples.length - 1)) * chart.width;
    }

    var rawValue = getValue(samples[i]);

    if (rawValue === null || typeof rawValue === "undefined") {
      hasActiveSegment = false;
      continue;
    }

    var value = Number(rawValue);

    if (!Number.isFinite(value)) {
      hasActiveSegment = false;
      continue;
    }

    var y = chart.y + scaleHistoryValue(value, range.min, range.max, chart.height);
    finitePointCount++;
    lastFinitePoint = {
      x: x,
      y: y
    };

    if (!hasActiveSegment) {
      ecosystemHistoryCtx.moveTo(x, y);
      hasActiveSegment = true;
    } else {
      ecosystemHistoryCtx.lineTo(x, y);
    }
  }

  ecosystemHistoryCtx.stroke();

  if (finitePointCount === 1 && lastFinitePoint) {
    ecosystemHistoryCtx.beginPath();
    ecosystemHistoryCtx.arc(
      lastFinitePoint.x,
      lastFinitePoint.y,
      3,
      0,
      Math.PI * 2
    );
    ecosystemHistoryCtx.fill();
  }
}

function drawEcosystemHistory() {
  var width = ecosystemHistoryCanvas.width;
  var height = ecosystemHistoryCanvas.height;
  var chart = {
    x: 10,
    y: 8,
    width: width - 20,
    height: height - 16
  };
  var samples = Array.isArray(world.ecosystemHistory) ? world.ecosystemHistory : [];

  ecosystemHistoryCtx.clearRect(0, 0, width, height);
  ecosystemHistoryCtx.fillStyle = "rgba(5, 6, 10, 0.86)";
  ecosystemHistoryCtx.fillRect(0, 0, width, height);
  ecosystemHistoryCtx.strokeStyle = "rgba(255, 255, 255, 0.10)";
  ecosystemHistoryCtx.lineWidth = 1;

  for (var i = 0; i <= 3; i++) {
    drawEcosystemHistoryGuide(chart, i / 3, "rgba(255, 255, 255, 0.10)");
  }

  drawEcosystemHistoryGuide(chart, 0.5, "rgba(255, 156, 105, 0.22)");

  drawEcosystemHistoryLine(samples, function(sample) {
    return sample.stabilityScore;
  }, "#70f0d0", chart, { min: 0, max: 100 });

  drawEcosystemHistoryLine(samples, function(sample) {
    return sample.population;
  }, "#72d7ff", chart, getHistoryRange(samples, function(sample) {
    return sample.population;
  }, CONFIG.STARTING_ORGANISMS));

  drawEcosystemHistoryLine(samples, function(sample) {
    return sample.food;
  }, "#fff26b", chart, getHistoryRange(samples, function(sample) {
    return sample.food;
  }, CONFIG.STARTING_FOOD));

  drawEcosystemHistoryLine(samples, function(sample) {
    return sample.foodNetThisTick;
  }, "#ff9c69", chart, getSymmetricHistoryRange(samples, function(sample) {
    return sample.foodNetThisTick;
  }, Math.ceil(CONFIG.STARTING_FOOD * 0.08)));

  var runwayRange = getFoodRunwayHistoryRange(samples);
  drawEcosystemHistoryLine(samples, function(sample) {
    return getFoodRunwayHistoryValue(sample, runwayRange);
  }, "#c884ff", chart, runwayRange);
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
    var earlySummary = getEarlyProgressionSummary();

    if (!earlySummary) {
      setElementClass(settlementSummaryText, "");
      setElementText(settlementSummaryText, "SETTLEMENTS: -");
      return;
    }

    var topLineageText = earlySummary.topLineage ? "L" + earlySummary.topLineage.id : "-";
    var nextStep = earlySummary.settlementReady ? "founding" : "lineage growth";
    var earlyChips = [
      makeSummaryChip("Stage", earlySummary.status),
      makeSummaryProgressChip(
        "Population",
        earlySummary.topActive,
        earlySummary.populationTarget,
        earlySummary.topActive + "/" + earlySummary.populationTarget,
        earlySummary.topActive >= earlySummary.populationTarget,
        earlySummary.settlementReady
      ),
      makeSummaryProgressChip(
        "Peak",
        earlySummary.topPeak,
        earlySummary.peakTarget,
        earlySummary.topPeak + "/" + earlySummary.peakTarget,
        earlySummary.topPeak >= earlySummary.peakTarget,
        earlySummary.settlementReady
      ),
      makeSummaryChip("Lineages", earlySummary.activeLineages + "/" + earlySummary.totalLineages),
      makeSummaryChip("Top", topLineageText),
      makeSummaryChip("Next", nextStep)
    ];

    setElementClass(settlementSummaryText, "summary-grid early-summary");
    setElementHtml(settlementSummaryText, earlyChips.join(""));
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

function updateEventLog() {
  var events = Array.isArray(world.eventLog) ? world.eventLog : [];

  if (events.length === 0) {
    setElementClass(eventLogText, "");
    setElementText(eventLogText, "EVENTS: Waiting for milestones");
    return;
  }

  var visibleCount = Math.max(1, Math.round(Number(CONFIG.EVENT_LOG_VISIBLE_ENTRIES) || 6));
  var startIndex = Math.max(0, events.length - visibleCount);
  var chips = [];

  for (var i = events.length - 1; i >= startIndex; i--) {
    chips.push(makeEventChip(events[i]));
  }

  setElementClass(eventLogText, "event-timeline");
  setElementHtml(eventLogText, chips.join(""));
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
  var planetTile = getPlanetTile(tileX, tileY);
  var terrainName = planetTile ? planetTile.biome : (isFertile(tileX, tileY) ? "fertile" : "barren");
  var hasFood = foodExistsAt(tileX, tileY);
  var organism = getNearestOrganismToTile(tileX, tileY);
  var settlement = getNearestSettlementToTile(tileX, tileY);
  var localContext = getLocalInspectContext(tileX, tileY);
  var planetScaleInfo = getPlanetCameraScaleInfo();
  var planetCacheStats = getPlanetSurfaceCacheStats();
  var renderCacheStats = getLocalSurfaceRenderCacheStats();
  var inspectedPyramidLineage = isPlanetLocalView()
    ? getPlanetSurfaceChunkLineage(getPlanetLocalSurfaceAddress(tileX, tileY).address)
    : [];
  var detailChips = [
    makeInspectChip("Terrain", terrainName),
    makeInspectChip("Food", hasFood ? "yes" : "no"),
    makeInspectChip("Lat/Lon", planetTile ? planetTile.latitude.toFixed(1) + " / " + planetTile.longitude.toFixed(1) : "-"),
    makeInspectChip("Surface Lat/Lon", getInspectSurfacePositionLabel(tileX, tileY)),
    makeInspectChip("Tile Area", planetTile ? Math.round(planetTile.areaKm2).toLocaleString() + " km2" : "-"),
    makeInspectChip("Zoom Scale", getPlanetScaleLabel()),
    makeInspectChip("Ground Px", getPlanetDistanceLabel(planetScaleInfo.metersPerCanvasPixel) + "/px"),
    makeInspectChip("Footprint", getPlanetDistanceLabel(planetScaleInfo.footprintWidthKm * 1000) + " x " + getPlanetDistanceLabel(planetScaleInfo.footprintHeightKm * 1000)),
    makeInspectChip("Camera Alt", "~" + getPlanetDistanceLabel(planetScaleInfo.approximateAltitudeKm * 1000)),
    makeInspectChip("Surface Cache", planetCacheStats.chunks + " chunks / " + planetCacheStats.samples + " samples"),
    makeInspectChip("Surface Chunk", planetCacheStats.lastChunkKey),
    makeInspectChip("Render Chunks", renderCacheStats.lastVisibleChunks + " visible / " + renderCacheStats.chunks + " cached / " + renderCacheStats.hits + " hits"),
    makeInspectChip("Pyramid", getPlanetSurfaceChunkLineageLabel(inspectedPyramidLineage)),
    makeInspectChip("Chunk", planetTile ? getPlanetChunkKeyForTile(tileX, tileY) : "-"),
    makeInspectChip("Surface", getInspectSurfaceLabel(tileX, tileY)),
    makeInspectChip("Local", "R" + localContext.radius + " " + localContext.localPressure),
    makeInspectChip("Local Org", localContext.nearbyOrganisms),
    makeInspectChip("Local Food", localContext.nearbyFood),
    makeInspectChip("Local Fertile", Math.round(localContext.fertilePercent) + "%"),
    makeInspectChip("Near Food", getDistanceLabel(localContext.nearestFoodDistance, localContext.nearestFoodDistanceKm)),
    makeInspectChip("Near Camp", getDistanceLabel(localContext.nearestSettlementDistance))
  ];

  if (organism) {
    var lineageRecord = world.lineages ? world.lineages[String(ensureOrganismLineage(organism))] : null;
    var parentText = lineageRecord && lineageRecord.parentId > 0 ? " parent L" + lineageRecord.parentId : " founder";
    var traits = ensureOrganismTraits(organism);
    var organismSurfacePosition = getEntitySurfacePosition(organism);

    detailChips.push(makeInspectChip("Organism", "L" + ensureOrganismLineage(organism) + parentText));
    detailChips.push(makeInspectChip("Org Unit", "~" + Math.max(1, Math.round(Number(CONFIG.ORGANISM_POPULATION_UNIT) || 1)).toLocaleString()));
    detailChips.push(makeInspectChip("Org Energy", organism.energy));
    detailChips.push(makeInspectChip("Org Age", Math.round(organism.age * Math.max(0, Number(CONFIG.SIM_DAYS_PER_TICK) || 0)).toLocaleString() + " days"));
    detailChips.push(makeInspectChip("Travel Bank", Math.round(Math.max(0, Number(organism.travelKm) || 0)).toLocaleString() + " km"));
    detailChips.push(makeInspectChip("Org Gen", organism.generation));
    detailChips.push(makeInspectChip("Org Pos", organism.x + "," + organism.y));
    detailChips.push(makeInspectChip("Org Lat/Lon", organismSurfacePosition ? organismSurfacePosition.latitude.toFixed(4) + " / " + organismSurfacePosition.longitude.toFixed(4) : "-"));
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

function getInspectSurfaceLabel(tileX, tileY) {
  if (!isPlanetLocalView()) {
    return "global";
  }

  var tile = getPlanetTile(tileX, tileY);
  var surfacePosition = getInspectSurfacePosition(tileX, tileY);
  var latitude = surfacePosition ? surfacePosition.latitude : (tile ? tile.latitude : getPlanetLatitudeForTile(tileY));
  var longitude = surfacePosition ? surfacePosition.longitude : (tile ? tile.longitude : getPlanetLongitudeForTile(tileX));
  var detail = getPlanetSurfaceDetail(latitude, longitude, tile);

  return detail.surface + " / " + detail.feature +
    " marker " + detail.marker.type +
    " elev " + Math.round(detail.elevation * 100) +
    " rough " + Math.round(detail.roughness * 100) +
    " height " + Math.round(detail.heightMeters).toLocaleString() + "m" +
    " shade " + Math.round(detail.hillshade * 100) +
    " @ " + detail.sampleMeters + "m";
}

function getInspectSurfacePosition(tileX, tileY) {
  var surfacePosition = world.inspectedSurface;

  if (
    surfacePosition &&
    Number.isFinite(Number(surfacePosition.latitude)) &&
    Number.isFinite(Number(surfacePosition.longitude))
  ) {
    var surfaceTile = getTileFromLatLon(surfacePosition.latitude, surfacePosition.longitude);

    if (surfaceTile.x === tileX && surfaceTile.y === tileY) {
      return {
        latitude: clamp(Number(surfacePosition.latitude), -90, 90),
        longitude: normalizeLongitude(surfacePosition.longitude)
      };
    }
  }

  return null;
}

function getInspectSurfacePositionLabel(tileX, tileY) {
  var surfacePosition = getInspectSurfacePosition(tileX, tileY);

  if (!surfacePosition) {
    return "-";
  }

  return surfacePosition.latitude.toFixed(5) + " / " + surfacePosition.longitude.toFixed(5);
}

var planetDragState = {
  active: false,
  moved: false,
  skipNextClick: false,
  lastClientX: 0,
  lastClientY: 0
};

function getCanvasPointFromEvent(event) {
  var rect = canvas.getBoundingClientRect();

  return {
    canvasX: (event.clientX - rect.left) * (canvas.width / rect.width),
    canvasY: (event.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function getTileFromCanvasEvent(event) {
  var point = getCanvasPointFromEvent(event);
  var planetTile = typeof getPlanetTileFromCanvasPoint === "function"
    ? getPlanetTileFromCanvasPoint(point.canvasX, point.canvasY)
    : null;

  if (planetTile) {
    return planetTile;
  }

  return {
    x: clamp(Math.floor(point.canvasX / CONFIG.TILE_SIZE), 0, WORLD_WIDTH - 1),
    y: clamp(Math.floor(point.canvasY / CONFIG.TILE_SIZE), 0, WORLD_HEIGHT - 1)
  };
}

function getSurfacePositionFromCanvasEvent(event) {
  if (typeof getPlanetLatLonFromCanvasPoint !== "function") {
    return null;
  }

  var point = getCanvasPointFromEvent(event);
  return getPlanetLatLonFromCanvasPoint(point.canvasX, point.canvasY);
}

function inspectTile(tileX, tileY, shouldFocus, surfacePosition) {
  world.inspectedTile = {
    x: clamp(tileX, 0, WORLD_WIDTH - 1),
    y: clamp(tileY, 0, WORLD_HEIGHT - 1)
  };
  world.inspectedSurface = surfacePosition || null;

  if (shouldFocus !== false && !isPlanetLocalView()) {
    focusPlanetViewOnTile(world.inspectedTile.x, world.inspectedTile.y);
  }

  drawWorld();
  updateHud();
}

function zoomPlanetView(delta) {
  if (!adjustPlanetZoom(delta)) {
    return false;
  }

  drawWorld();
  updateHud();
  return true;
}

function redrawPlanetView() {
  drawWorld();
  updateHud();
}

function beginPlanetDrag(event) {
  if (typeof event.button === "number" && event.button !== 0) {
    return;
  }

  planetDragState.active = true;
  planetDragState.moved = false;
  planetDragState.lastClientX = Number(event.clientX) || 0;
  planetDragState.lastClientY = Number(event.clientY) || 0;
  canvas.classList.add("dragging");

  if (typeof canvas.setPointerCapture === "function" && typeof event.pointerId !== "undefined") {
    canvas.setPointerCapture(event.pointerId);
  }
}

function updatePlanetDrag(event) {
  if (!planetDragState.active) {
    return;
  }

  var clientX = Number(event.clientX) || 0;
  var clientY = Number(event.clientY) || 0;
  var deltaX = clientX - planetDragState.lastClientX;
  var deltaY = clientY - planetDragState.lastClientY;

  if (deltaX === 0 && deltaY === 0) {
    return;
  }

  planetDragState.lastClientX = clientX;
  planetDragState.lastClientY = clientY;

  if (Math.abs(deltaX) + Math.abs(deltaY) > 2) {
    planetDragState.moved = true;
  }

  if (typeof panPlanetViewByScreenDelta === "function") {
    panPlanetViewByScreenDelta(deltaX, deltaY);
    redrawPlanetView();
  }

  if (typeof event.preventDefault === "function") {
    event.preventDefault();
  }
}

function endPlanetDrag(event) {
  if (!planetDragState.active) {
    return;
  }

  planetDragState.active = false;
  planetDragState.skipNextClick = planetDragState.moved;
  canvas.classList.remove("dragging");

  if (typeof canvas.releasePointerCapture === "function" && event && typeof event.pointerId !== "undefined") {
    canvas.releasePointerCapture(event.pointerId);
  }
}

function panPlanetViewFromKeyboard(eastSamples, northSamples) {
  if (typeof panPlanetViewBySamples !== "function") {
    return false;
  }

  panPlanetViewBySamples(eastSamples, northSamples);
  redrawPlanetView();
  return true;
}

function setPersistenceStatus(message, isError) {
  setElementText(persistenceStatus, message);
  persistenceStatus.classList.toggle("error", Boolean(isError));
}

function restartSimulationFromControls() {
  applyTuningFromControls(false);
  seedWorld();
  drawWorld();
  updateHud();
  setPersistenceStatus("SAVE: Ready", false);
}

function shouldIgnoreSimulationShortcut(target) {
  if (!target) {
    return false;
  }

  var tagName = String(target.tagName || "").toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    tagName === "button" ||
    Boolean(target.isContentEditable)
  );
}

function handleSimulationShortcut(event) {
  var key = String(event.key || "");
  var code = String(event.code || "");
  var handled = false;

  if (code === "Escape" || key === "Escape") {
    handled = setMenuOpen(false);
  } else if (!shouldIgnoreSimulationShortcut(event.target) && (code === "KeyM" || key.toLowerCase() === "m")) {
    handled = true;
    toggleMenuOpen();
  } else if (shouldIgnoreSimulationShortcut(event.target)) {
    return;
  } else if (code === "Space" || key === " ") {
    handled = true;
    toggleSimulationPaused();
  } else if (code === "KeyN" || key.toLowerCase() === "n") {
    handled = true;
    stepSimulationOnce();
  } else if (code === "BracketRight" || key === "]") {
    handled = true;
    zoomPlanetView(1);
  } else if (code === "BracketLeft" || key === "[") {
    handled = true;
    zoomPlanetView(-1);
  } else if (code === "ArrowUp") {
    handled = panPlanetViewFromKeyboard(0, 24);
  } else if (code === "ArrowDown") {
    handled = panPlanetViewFromKeyboard(0, -24);
  } else if (code === "ArrowLeft") {
    handled = panPlanetViewFromKeyboard(-24, 0);
  } else if (code === "ArrowRight") {
    handled = panPlanetViewFromKeyboard(24, 0);
  } else if (code === "Equal" || code === "NumpadAdd" || key === "+" || key === "=") {
    handled = true;

    if (adjustSimulationSpeed(1)) {
      updateHud();
    }
  } else if (code === "Minus" || code === "NumpadSubtract" || key === "-" || key === "_") {
    handled = true;

    if (adjustSimulationSpeed(-1)) {
      updateHud();
    }
  } else if (code === "KeyR" || key.toLowerCase() === "r") {
    handled = true;
    restartSimulationFromControls();
  } else if (world.isMenuOpen && code === "Digit1") {
    handled = true;
    setMenuPage("controls");
  } else if (world.isMenuOpen && code === "Digit2") {
    handled = true;
    setMenuPage("status");
  } else if (world.isMenuOpen && code === "Digit3") {
    handled = true;
    setMenuPage("ecosystem");
  } else if (world.isMenuOpen && code === "Digit4") {
    handled = true;
    setMenuPage("log");
  }

  if (handled && typeof event.preventDefault === "function") {
    event.preventDefault();
  }
}

window.setupControls = function() {
  var tabButtons = menuTabs.querySelectorAll("[data-menu-target]");

  for (var tabIndex = 0; tabIndex < tabButtons.length; tabIndex++) {
    tabButtons[tabIndex].addEventListener("click", function(event) {
      setMenuPage(event.currentTarget.getAttribute("data-menu-target"));
    });
  }

  menuToggleButton.addEventListener("click", function() {
    toggleMenuOpen();
  });

  menuBackdrop.addEventListener("click", function() {
    setMenuOpen(false);
  });

  canvas.addEventListener("pointerdown", beginPlanetDrag);
  window.addEventListener("pointermove", updatePlanetDrag);
  window.addEventListener("pointerup", endPlanetDrag);
  window.addEventListener("pointercancel", endPlanetDrag);

  canvas.addEventListener("click", function(event) {
    if (planetDragState.skipNextClick) {
      planetDragState.skipNextClick = false;
      return;
    }

    var surfacePosition = getSurfacePositionFromCanvasEvent(event);
    var tile = getTileFromCanvasEvent(event);
    inspectTile(tile.x, tile.y, !isPlanetLocalView(), surfacePosition);
  });

  canvas.addEventListener("wheel", function(event) {
    if (typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    var point = getCanvasPointFromEvent(event);
    var surfacePosition = typeof getPlanetLatLonFromCanvasPoint === "function"
      ? getPlanetLatLonFromCanvasPoint(point.canvasX, point.canvasY)
      : null;
    var surfaceTile = surfacePosition ? getTileFromLatLon(surfacePosition.latitude, surfacePosition.longitude) : null;

    if (typeof focusPlanetViewOnCanvasPoint === "function") {
      focusPlanetViewOnCanvasPoint(point.canvasX, point.canvasY);
    }

    var tile = surfaceTile || getTileFromCanvasEvent(event);
    inspectTile(tile.x, tile.y, false, surfacePosition);
    zoomPlanetView(event.deltaY < 0 ? 1 : -1);
  }, { passive: false });

  pauseButton.addEventListener("click", function() {
    toggleSimulationPaused();
  });

  stepButton.addEventListener("click", function() {
    stepSimulationOnce();
  });

  speedDownButton.addEventListener("click", function() {
    if (adjustSimulationSpeed(-1)) {
      updateHud();
    }
  });

  speedUpButton.addEventListener("click", function() {
    if (adjustSimulationSpeed(1)) {
      updateHud();
    }
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

  seedInput.addEventListener("input", function() {
    world.seedText = seedInput.value;
  });

  seedInput.addEventListener("change", function() {
    world.seedText = normalizeSeedText(seedInput.value);
    syncTuningControls();
  });

  seedRandomButton.addEventListener("click", function() {
    world.seedText = "PIXEL-" + String(Date.now()).slice(-8);
    syncTuningControls();
  });

  syncControlStates();
  syncMenuState();
  syncMenuPage();

  restartButton.addEventListener("click", function() {
    restartSimulationFromControls();
  });

  document.addEventListener("keydown", handleSimulationShortcut);

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
