
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
