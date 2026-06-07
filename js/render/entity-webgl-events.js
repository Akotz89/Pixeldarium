PS.render = PS.render || {};
PS.render.entityWebgl = PS.render.entityWebgl || {};

PS.render.entityWebgl.getOrbitEventMarkerCap = function () {
  return Math.max(0, Math.floor(Number(CONFIG.PLANET_ORBIT_EVENT_MARKER_MAX_MARKERS) || 24));
};

PS.render.entityWebgl.getOrbitEventLocation = function (event) {
  var location = event && event.location ? event.location : null;
  var target = event && event.inspectTarget ? event.inspectTarget : null;
  var tile = null;

  if (location && Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude))) {
    return {
      latitude: Number(location.latitude),
      longitude: Number(location.longitude)
    };
  }

  if (target && Number.isFinite(Number(target.latitude)) && Number.isFinite(Number(target.longitude))) {
    return {
      latitude: Number(target.latitude),
      longitude: Number(target.longitude)
    };
  }

  if (target && Number.isFinite(Number(target.x)) && Number.isFinite(Number(target.y)) && typeof getTileIndex === "function") {
    tile = world.planetTiles[getTileIndex(target.x, target.y)];
  }

  if (!tile && event && Number.isFinite(Number(event.x)) && Number.isFinite(Number(event.y)) && typeof getTileIndex === "function") {
    tile = world.planetTiles[getTileIndex(event.x, event.y)];
  }

  if (tile && Number.isFinite(Number(tile.latitude)) && Number.isFinite(Number(tile.longitude))) {
    return {
      latitude: Number(tile.latitude),
      longitude: Number(tile.longitude)
    };
  }

  return null;
};

PS.render.entityWebgl.getOrbitEventCandidates = function () {
  var events = Array.isArray(world.timelineEvents) ? world.timelineEvents : [];
  var cap = PS.render.entityWebgl.getOrbitEventMarkerCap();
  var candidates = [];

  for (var i = events.length - 1; i >= 0 && candidates.length < cap; i--) {
    var event = events[i];
    var location = PS.render.entityWebgl.getOrbitEventLocation(event);

    if (!location) {
      continue;
    }

    candidates.push({
      event: event,
      latitude: location.latitude,
      longitude: location.longitude,
      tick: Math.max(0, Math.round(Number(event.tick) || 0))
    });
  }

  return candidates;
};

PS.render.entityWebgl.getOrbitEventMarkerCell = function (event) {
  if (PS.atlas && typeof PS.atlas.getOrbitEventMarkerCell === "function") {
    return PS.atlas.getOrbitEventMarkerCell(event);
  }

  return null;
};

PS.render.entityWebgl.buildOrbitEventMarkerBatches = function () {
  var batches = PS.render.entityWebgl.createBatches();
  var candidates = PS.render.entityWebgl.getOrbitEventCandidates();
  var view = world && world.planetView ? world.planetView : {};
  var band = PS.render.pipeline && typeof PS.render.pipeline.getZoomBand === "function"
    ? PS.render.pipeline.getZoomBand(view.zoomLevel)
    : "orbit";

  if (band !== "orbit" && band !== "planet") {
    return batches;
  }

  for (var i = 0; i < candidates.length; i++) {
    var candidate = candidates[i];
    var age = Math.max(0, Math.round(Number(world.tick) || 0) - candidate.tick);
    var point = PS.render.entities.getRenderPosition({
      x: 0,
      y: 0,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      prevLatitude: candidate.latitude,
      prevLongitude: candidate.longitude
    }, 1);
    var scale = point && Number.isFinite(Number(point.scale)) ? Number(point.scale) : 1;
    var ageAlpha = clamp(1 - Math.min(age, 1200) / 1800, 0.38, 1);
    var severity = PS.atlas && typeof PS.atlas.getOrbitEventSeverityBucket === "function"
      ? PS.atlas.getOrbitEventSeverityBucket(candidate.event)
      : 0;
    var size = Math.max(14, (severity >= 2 ? 28 : 22) * scale);

    PS.render.entityWebgl.submit(
      batches,
      PS.render.entityWebgl.getOrbitEventMarkerCell(candidate.event),
      point,
      size,
      [1, 1, 1, ageAlpha],
      false,
      "eventMarker"
    );
  }

  return batches;
};

PS.render.entityWebgl.drawOrbitEventMarkers = function () {
  if (CONFIG.PLANET_ENTITY_WEBGL_INSTANCING === false) {
    return false;
  }

  if (!PS.render.entityWebgl.initialize(canvas.width, canvas.height)) {
    PS.render.entityWebgl.state.fallbackCount++;
    return false;
  }

  if (PS.render.webglPresenter && PS.render.webglPresenter.state) {
    PS.render.webglPresenter.state.clearPending = false;
  }

  return PS.render.entityWebgl.drawBatches(PS.render.entityWebgl.buildOrbitEventMarkerBatches());
};
