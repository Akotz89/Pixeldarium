PS.render = PS.render || {};
PS.render.entityWebgl = PS.render.entityWebgl || {};

PS.render.entityWebgl.getSettlementReadinessMarkerCap = function () {
  return Math.max(0, Math.floor(Number(CONFIG.PLANET_SETTLEMENT_READINESS_MAX_MARKERS) || 0));
};

PS.render.entityWebgl.getLineageSettlementProgress = function (lineage) {
  var activeCount = Math.max(0, Math.round(Number(lineage && lineage.activeCount) || 0));
  var peakPopulation = Math.max(0, Math.round(Number(lineage && lineage.peakPopulation) || 0));
  var populationTarget = Math.max(1, Math.round(Number(CONFIG.SETTLEMENT_MIN_LINEAGE_POPULATION) || 1));
  var peakTarget = Math.max(1, Math.round(Number(CONFIG.SETTLEMENT_MIN_LINEAGE_PEAK_POPULATION) || 1));

  return Math.min(activeCount / populationTarget, peakPopulation / peakTarget);
};

PS.render.entityWebgl.getSettlementReadinessBucket = function (progress) {
  var value = clamp(Number(progress) || 0, 0, 1);

  if (value >= 0.88) { return 3; }
  if (value >= 0.68) { return 2; }
  if (value >= 0.42) { return 1; }
  return 0;
};

PS.render.entityWebgl.getLineageOrganisms = function (lineageId) {
  if (PS.sim && PS.sim.organisms && typeof PS.sim.organisms.byLineage === "function") {
    return PS.sim.organisms.byLineage(lineageId) || [];
  }

  var results = [];

  if (!Array.isArray(world.organisms)) {
    return results;
  }

  for (var i = 0; i < world.organisms.length; i++) {
    if (Math.round(Number(world.organisms[i].lineageId) || 0) === lineageId) {
      results.push(world.organisms[i]);
    }
  }

  return results;
};

PS.render.entityWebgl.getLineageCenter = function (organisms) {
  var totalX = 0;
  var totalY = 0;
  var totalLatitude = 0;
  var totalLongitude = 0;
  var surfaceCount = 0;

  if (!Array.isArray(organisms) || organisms.length <= 0) {
    return null;
  }

  for (var i = 0; i < organisms.length; i++) {
    totalX += Number(organisms[i].x) || 0;
    totalY += Number(organisms[i].y) || 0;

    if (
      Number.isFinite(Number(organisms[i].latitude)) &&
      Number.isFinite(Number(organisms[i].longitude))
    ) {
      totalLatitude += Number(organisms[i].latitude);
      totalLongitude += Number(organisms[i].longitude);
      surfaceCount++;
    }
  }

  return {
    x: clamp(Math.round(totalX / organisms.length), 0, WORLD_WIDTH - 1),
    y: clamp(Math.round(totalY / organisms.length), 0, WORLD_HEIGHT - 1),
    latitude: surfaceCount > 0 ? totalLatitude / surfaceCount : null,
    longitude: surfaceCount > 0 ? totalLongitude / surfaceCount : null
  };
};

PS.render.entityWebgl.hasSettlementForLineage = function (lineageId) {
  var key = String(Math.max(1, Math.round(Number(lineageId) || 1)));

  return Boolean(
    world.settlementByLineage && world.settlementByLineage[key]
  );
};

PS.render.entityWebgl.getSettlementReadinessCandidates = function () {
  var cap = PS.render.entityWebgl.getSettlementReadinessMarkerCap();
  var lineages = world.lineages || {};
  var candidates = [];

  if (
    cap <= 0 ||
    world.isExtinct ||
    (Array.isArray(world.settlements) && world.settlements.length > 0)
  ) {
    return candidates;
  }

  for (var lineageKey in lineages) {
    if (!Object.prototype.hasOwnProperty.call(lineages, lineageKey)) {
      continue;
    }

    var lineage = lineages[lineageKey];
    var lineageId = Math.max(1, Math.round(Number(lineage && lineage.id) || Number(lineageKey) || 1));
    var progress = PS.render.entityWebgl.getLineageSettlementProgress(lineage);

    if (
      Boolean(lineage && lineage.isExtinct) ||
      PS.render.entityWebgl.hasSettlementForLineage(lineageId) ||
      progress < 0.35
    ) {
      continue;
    }

    var organisms = PS.render.entityWebgl.getLineageOrganisms(lineageId);
    var center = PS.render.entityWebgl.getLineageCenter(organisms);

    if (!center) {
      continue;
    }

    candidates.push({
      lineageId: lineageId,
      x: center.x,
      y: center.y,
      latitude: center.latitude,
      longitude: center.longitude,
      progress: progress,
      progressBucket: PS.render.entityWebgl.getSettlementReadinessBucket(progress),
      activeCount: Math.max(0, Math.round(Number(lineage.activeCount) || 0)),
      peakPopulation: Math.max(0, Math.round(Number(lineage.peakPopulation) || 0))
    });
  }

  candidates.sort(function (a, b) {
    if (b.progress !== a.progress) {
      return b.progress - a.progress;
    }

    return b.activeCount - a.activeCount;
  });

  return candidates.slice(0, cap);
};

PS.render.entityWebgl.getSettlementReadinessCell = function (marker) {
  return PS.atlas && typeof PS.atlas.getSettlementReadinessCell === "function"
    ? PS.atlas.getSettlementReadinessCell(marker)
    : null;
};

PS.render.entityWebgl.buildSettlementReadinessBatches = function () {
  var batches = PS.render.entityWebgl.createBatches();
  var markers = PS.render.entityWebgl.getSettlementReadinessCandidates();

  for (var i = 0; i < markers.length; i++) {
    var marker = markers[i];
    var point = PS.render.entities.getRenderPosition({
      x: marker.x,
      y: marker.y,
      prevX: marker.x,
      prevY: marker.y,
      latitude: marker.latitude,
      longitude: marker.longitude,
      prevLatitude: marker.latitude,
      prevLongitude: marker.longitude,
      lineageId: marker.lineageId
    }, 1);
    var scale = point && Number.isFinite(Number(point.scale)) ? Number(point.scale) : 1;
    var size = Math.max(72, (48 + marker.progressBucket * 16) * scale);
    var tint = PS.render.entityWebgl.parseColor(PS.render.entities.getLineageColorById(marker.lineageId), 0.92);

    if (point) {
      point = {
        x: point.x,
        y: point.y - Math.max(10, size * 0.42),
        scale: point.scale || 1,
        visibility: point.visibility || 1,
        visible: point.visible
      };
    }

    PS.render.entityWebgl.submit(
      batches,
      PS.render.entityWebgl.getSettlementReadinessCell(marker),
      point,
      size,
      tint,
      false,
      "readiness"
    );
  }

  return batches;
};

PS.render.entityWebgl.drawSettlementReadiness = function () {
  if (CONFIG.PLANET_ENTITY_WEBGL_INSTANCING === false || !PS.render.entities.shouldDrawGlobeScaleEntities()) {
    return false;
  }

  if (!PS.render.entityWebgl.initialize(canvas.width, canvas.height)) {
    PS.render.entityWebgl.state.fallbackCount++;
    return false;
  }

  return PS.render.entityWebgl.drawBatches(PS.render.entityWebgl.buildSettlementReadinessBatches());
};
