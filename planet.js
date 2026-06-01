// Pixel Sim Engine - planet.js
// Earth-scale projection helpers for the planet-sized simulation map.

var planetSurfaceChunkCache = {
  chunks: {},
  order: [],
  stats: {
    hits: 0,
    misses: 0,
    generatedChunks: 0,
    evictions: 0,
    lastChunkKey: "-",
    lastSampleKey: "-"
  }
};

var planetGroundFeatureBlockCache = {
  blocks: {},
  order: [],
  stats: {
    hits: 0,
    misses: 0,
    evictions: 0,
    lastBlockKey: "-"
  }
};

function getPlanetRadiusKm() {
  return Math.max(1, Number(CONFIG.PLANET_RADIUS_KM) || 6371);
}

function getPlanetCircumferenceKm() {
  return 2 * Math.PI * getPlanetRadiusKm();
}

function getPlanetPoleToPoleKm() {
  return Math.PI * getPlanetRadiusKm();
}

function getPlanetEquatorKmPerTile() {
  return getPlanetCircumferenceKm() / Math.max(1, WORLD_WIDTH);
}

function getPlanetMeridianKmPerTile() {
  return getPlanetPoleToPoleKm() / Math.max(1, WORLD_HEIGHT);
}

function getPlanetLatitudeForTile(y) {
  return 90 - ((Math.max(0, Number(y) || 0) + 0.5) / Math.max(1, WORLD_HEIGHT)) * 180;
}

function getPlanetLongitudeForTile(x) {
  return ((Math.max(0, Number(x) || 0) + 0.5) / Math.max(1, WORLD_WIDTH)) * 360 - 180;
}

function getPlanetTileLatitudeStepDeg() {
  return 180 / Math.max(1, WORLD_HEIGHT);
}

function getPlanetTileLongitudeStepDeg() {
  return 360 / Math.max(1, WORLD_WIDTH);
}

function getPlanetLatitudeScale(latitude) {
  return Math.max(0.08, Math.cos((Number(latitude) || 0) * Math.PI / 180));
}

function isGlobeRenderMode() {
  return CONFIG.PLANET_RENDER_MODE === "globe";
}

function getPlanetZoomLevels() {
  return Array.isArray(CONFIG.PLANET_ZOOM_LEVELS) && CONFIG.PLANET_ZOOM_LEVELS.length > 0
    ? CONFIG.PLANET_ZOOM_LEVELS
    : [{ name: "Globe", metersPerSample: getPlanetEquatorKmPerTile() * 1000, chunkKm: 4000 }];
}

function getPlanetZoomLevel(index) {
  var levels = getPlanetZoomLevels();
  var normalizedIndex = clamp(Math.round(Number(index) || 0), 0, levels.length - 1);
  var level = levels[normalizedIndex] || levels[0];

  return {
    index: normalizedIndex,
    name: String(level.name || "Scale " + normalizedIndex),
    metersPerSample: Math.max(0.1, Number(level.metersPerSample) || 1),
    chunkKm: Math.max(0.001, Number(level.chunkKm) || 1)
  };
}

function interpolatePlanetScaleValue(fromValue, toValue, amount) {
  var from = Math.max(0.000001, Number(fromValue) || 1);
  var to = Math.max(0.000001, Number(toValue) || from);

  return Math.exp(Math.log(from) + (Math.log(to) - Math.log(from)) * clamp(Number(amount) || 0, 0, 1));
}

function getPlanetZoomAnchorIndex(zoomLevel) {
  var levels = getPlanetZoomLevels();

  return clamp(Math.floor(Number(zoomLevel) || 0), 0, levels.length - 1);
}

function getPlanetSurfaceLodZoomIndex(zoomLevel) {
  var levels = getPlanetZoomLevels();
  var normalizedZoom = clamp(Number(zoomLevel) || 0, 0, levels.length - 1);
  var lowerIndex = Math.floor(normalizedZoom);
  var upperIndex = Math.ceil(normalizedZoom);
  var zoomFraction = normalizedZoom - lowerIndex;

  if (lowerIndex === upperIndex || lowerIndex < 1) {
    return lowerIndex;
  }

  return zoomFraction + 1e-9 >= 0.55 ? upperIndex : lowerIndex;
}

function getPlanetInterpolatedZoomLevel(zoomLevel) {
  var levels = getPlanetZoomLevels();
  var normalizedZoom = clamp(Number(zoomLevel) || 0, 0, levels.length - 1);
  var lowerIndex = Math.floor(normalizedZoom);
  var upperIndex = Math.ceil(normalizedZoom);
  var amount = normalizedZoom - lowerIndex;
  var lower = getPlanetZoomLevel(lowerIndex);
  var upper = getPlanetZoomLevel(upperIndex);
  var anchorIndex = getPlanetZoomAnchorIndex(normalizedZoom);

  if (lowerIndex === upperIndex) {
    return {
      index: lower.index,
      anchorIndex: lower.index,
      lowerIndex: lower.index,
      upperIndex: upper.index,
      zoomValue: normalizedZoom,
      zoomFraction: 0,
      name: lower.name,
      anchorName: lower.name,
      metersPerSample: lower.metersPerSample,
      chunkKm: lower.chunkKm
    };
  }

  return {
    index: anchorIndex,
    anchorIndex: anchorIndex,
    lowerIndex: lower.index,
    upperIndex: upper.index,
    zoomValue: normalizedZoom,
    zoomFraction: amount,
    name: lower.name + "-" + upper.name,
    anchorName: getPlanetZoomLevel(anchorIndex).name,
    metersPerSample: interpolatePlanetScaleValue(lower.metersPerSample, upper.metersPerSample, amount),
    chunkKm: interpolatePlanetScaleValue(lower.chunkKm, upper.chunkKm, amount)
  };
}

function getPlanetZoomFactor() {
  var scale = getPlanetViewScale();
  var globeScale = getPlanetZoomLevel(0);
  var ratio = globeScale.metersPerSample / Math.max(0.1, scale.metersPerSample);

  return clamp(Math.sqrt(ratio), 1, 28);
}

function getPlanetView() {
  if (!world.planetView) {
    world.planetView = {
      zoomLevel: clamp(
        Number(CONFIG.PLANET_ZOOM_LEVEL) || 0,
        0,
        getPlanetZoomLevels().length - 1
      ),
      latitude: Number(CONFIG.PLANET_VIEW_LATITUDE_DEG) || 0,
      longitude: Number(CONFIG.PLANET_VIEW_LONGITUDE_DEG) || 0
    };
  }

  world.planetView.zoomLevel = clamp(
    Number(world.planetView.zoomLevel) || 0,
    0,
    getPlanetZoomLevels().length - 1
  );
  world.planetView.latitude = clamp(Number(world.planetView.latitude) || 0, -90, 90);
  world.planetView.longitude = ((Number(world.planetView.longitude) || 0) + 540) % 360 - 180;

  return world.planetView;
}

function focusPlanetViewOnTile(x, y) {
  var tile = getPlanetTile(x, y);

  if (!tile) {
    return getPlanetView();
  }

  return focusPlanetViewOnLatLon(tile.latitude, tile.longitude);
}

function focusPlanetViewOnLatLon(latitude, longitude) {
  var view = getPlanetView();
  var previousLatitude = view.latitude;
  var previousLongitude = view.longitude;

  view.latitude = clamp(Number(latitude) || 0, -90, 90);
  view.longitude = normalizeLongitude(longitude);

  if (
    previousLatitude !== view.latitude ||
    previousLongitude !== view.longitude
  ) {
    invalidatePlanetRenderCache();
  }

  return view;
}

function invalidatePlanetRenderCache() {
  if (typeof invalidateTerrainCache === "function") {
    invalidateTerrainCache();
  }

  world.needsRender = true;
}

function setPlanetZoomLevel(zoomLevel) {
  var view = getPlanetView();
  var nextZoom = clamp(
    Number(zoomLevel) || 0,
    0,
    getPlanetZoomLevels().length - 1
  );

  if (view.zoomLevel === nextZoom) {
    return false;
  }

  view.zoomLevel = nextZoom;
  invalidatePlanetRenderCache();
  return true;
}

function focusPlanetViewOnLatLonAtCanvasPoint(latitude, longitude, canvasX, canvasY) {
  var scale = getPlanetViewScale();
  var sampleX = (Number(canvasX) || 0) / CONFIG.TILE_SIZE;
  var sampleY = (Number(canvasY) || 0) / CONFIG.TILE_SIZE;
  var targetMeters = getSurfaceMeterCoordinate(latitude, longitude);
  var centerMeters = {
    eastMeters: targetMeters.eastMeters - (sampleX - WORLD_WIDTH / 2) * scale.metersPerSample,
    northMeters: targetMeters.northMeters + (sampleY - WORLD_HEIGHT / 2) * scale.metersPerSample
  };
  var centerLatLon = getLatLonFromSurfaceMeterCoordinate(centerMeters.eastMeters, centerMeters.northMeters);

  focusPlanetViewOnLatLon(centerLatLon.latitude, centerLatLon.longitude);
  return getPlanetView();
}

function setPlanetZoomLevelAtCanvasPoint(zoomLevel, canvasX, canvasY) {
  var anchoredLatLon = typeof getPlanetLatLonFromCanvasPoint === "function"
    ? getPlanetLatLonFromCanvasPoint(canvasX, canvasY)
    : null;

  if (!setPlanetZoomLevel(zoomLevel)) {
    return false;
  }

  if (anchoredLatLon && isPlanetLocalView()) {
    focusPlanetViewOnLatLonAtCanvasPoint(
      anchoredLatLon.latitude,
      anchoredLatLon.longitude,
      canvasX,
      canvasY
    );
  }

  return true;
}

function adjustPlanetZoom(delta) {
  return setPlanetZoomLevel(getPlanetView().zoomLevel + (Number(delta) || 0));
}

function adjustPlanetZoomAtCanvasPoint(delta, canvasX, canvasY) {
  return setPlanetZoomLevelAtCanvasPoint(
    getPlanetView().zoomLevel + (Number(delta) || 0),
    canvasX,
    canvasY
  );
}

function getPlanetViewScale() {
  return getPlanetInterpolatedZoomLevel(getPlanetView().zoomLevel);
}

function getPlanetScaleLabel() {
  var scale = getPlanetViewScale();
  var anchorLabel = scale.zoomFraction > 0
    ? " anchor " + scale.anchorName
    : "";

  if (scale.metersPerSample >= 1000) {
    return scale.name + " " + (scale.metersPerSample / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + " km/sample" + anchorLabel;
  }

  return scale.name + " " + scale.metersPerSample.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " m/sample" + anchorLabel;
}

function getPlanetViewFootprintKm() {
  var scale = getPlanetViewScale();
  var sampleCount = Math.max(WORLD_WIDTH, WORLD_HEIGHT);

  return (scale.metersPerSample * sampleCount) / 1000;
}

function isPlanetLocalView() {
  return getPlanetView().zoomLevel >= 1;
}

function getPlanetLocalViewFootprint() {
  var scale = getPlanetViewScale();

  return {
    widthKm: WORLD_WIDTH * scale.metersPerSample / 1000,
    heightKm: WORLD_HEIGHT * scale.metersPerSample / 1000,
    metersPerSample: scale.metersPerSample
  };
}

function getPlanetDistanceLabel(meters) {
  var normalizedMeters = Math.max(0, Number(meters) || 0);

  if (normalizedMeters >= 1000000) {
    return (normalizedMeters / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + " Mm";
  }

  if (normalizedMeters >= 1000) {
    return (normalizedMeters / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + " km";
  }

  if (normalizedMeters >= 1) {
    return normalizedMeters.toLocaleString(undefined, { maximumFractionDigits: 0 }) + " m";
  }

  return (normalizedMeters * 100).toLocaleString(undefined, { maximumFractionDigits: 0 }) + " cm";
}

function getPlanetCameraScaleInfo() {
  var view = getPlanetView();
  var scale = getPlanetViewScale();
  var surfaceLod = getPlanetZoomLevel(getPlanetSurfaceLodZoomIndex(view.zoomLevel));
  var footprint = getPlanetLocalViewFootprint();
  var verticalFovRadians = 45 * Math.PI / 180;
  var metersPerCanvasPixel = scale.metersPerSample / Math.max(1, CONFIG.TILE_SIZE);
  var approximateAltitudeKm = footprint.heightKm / (2 * Math.tan(verticalFovRadians / 2));

  return {
    zoomLevel: scale.index,
    zoomValue: scale.zoomValue,
    zoomFraction: scale.zoomFraction,
    anchorLevel: scale.anchorIndex,
    anchorName: scale.anchorName,
    surfaceLodLevel: surfaceLod.index,
    surfaceLodName: surfaceLod.name,
    surfaceSampleMeters: surfaceLod.metersPerSample,
    scaleName: scale.name,
    latitude: view.latitude,
    longitude: view.longitude,
    metersPerSample: scale.metersPerSample,
    metersPerCanvasPixel: metersPerCanvasPixel,
    footprintWidthKm: footprint.widthKm,
    footprintHeightKm: footprint.heightKm,
    approximateAltitudeKm: Math.max(0.001, approximateAltitudeKm)
  };
}

function getNicePlanetDistanceMeters(targetMeters) {
  var normalizedTarget = Math.max(0.01, Number(targetMeters) || 1);
  var exponent = Math.floor(Math.log10(normalizedTarget));
  var bestDistance = 1;
  var bestScore = Infinity;
  var bases = [1, 2, 5, 10];

  for (var offset = -1; offset <= 1; offset++) {
    var magnitude = Math.pow(10, exponent + offset);

    for (var i = 0; i < bases.length; i++) {
      var distance = bases[i] * magnitude;
      var score = Math.abs(Math.log(distance / normalizedTarget));

      if (score < bestScore) {
        bestDistance = distance;
        bestScore = score;
      }
    }
  }

  return Math.max(0.01, bestDistance);
}

function getPlanetScaleBar(targetPixels) {
  var scaleInfo = getPlanetCameraScaleInfo();
  var normalizedTargetPixels = Math.max(80, Number(targetPixels) || 220);
  var targetMeters = normalizedTargetPixels * scaleInfo.metersPerCanvasPixel;
  var distanceMeters = getNicePlanetDistanceMeters(targetMeters);
  var pixelWidth = distanceMeters / Math.max(0.001, scaleInfo.metersPerCanvasPixel);

  return {
    distanceMeters: distanceMeters,
    label: getPlanetDistanceLabel(distanceMeters),
    pixelWidth: pixelWidth,
    metersPerCanvasPixel: scaleInfo.metersPerCanvasPixel
  };
}

function getPlanetSurfaceChunkSampleCount() {
  return Math.max(8, Math.round(Number(CONFIG.PLANET_SURFACE_CHUNK_SAMPLES) || 32));
}

function getPlanetSurfaceChunkCacheLimit() {
  return Math.max(32, Math.round(Number(CONFIG.PLANET_SURFACE_CHUNK_CACHE_LIMIT) || 768));
}

function getPlanetSurfaceVisibleChunkLimit() {
  var configuredLimit = Math.round(Number(CONFIG.PLANET_SURFACE_VISIBLE_CHUNK_LIMIT) || 96);
  var cacheLimited = Math.floor(getPlanetSurfaceChunkCacheLimit() * 0.75);

  return Math.max(16, Math.min(Math.max(16, configuredLimit), Math.max(16, cacheLimited)));
}

function getPositiveModulo(value, divisor) {
  var normalizedDivisor = Math.max(1, Math.round(Number(divisor) || 1));
  return ((Math.round(Number(value) || 0) % normalizedDivisor) + normalizedDivisor) % normalizedDivisor;
}

function resetPlanetSurfaceChunkCache() {
  planetSurfaceChunkCache = {
    chunks: {},
    order: [],
    stats: {
      hits: 0,
      misses: 0,
      generatedChunks: 0,
      evictions: 0,
      lastChunkKey: "-",
      lastSampleKey: "-"
    }
  };
}

function getPlanetSurfaceCacheStats() {
  var sampleCount = 0;

  for (var i = 0; i < planetSurfaceChunkCache.order.length; i++) {
    var chunk = planetSurfaceChunkCache.chunks[planetSurfaceChunkCache.order[i]];
    sampleCount += chunk && chunk.samples ? Object.keys(chunk.samples).length : 0;
  }

  return {
    chunks: planetSurfaceChunkCache.order.length,
    samples: sampleCount,
    hits: planetSurfaceChunkCache.stats.hits,
    misses: planetSurfaceChunkCache.stats.misses,
    generatedChunks: planetSurfaceChunkCache.stats.generatedChunks,
    evictions: planetSurfaceChunkCache.stats.evictions,
    lastChunkKey: planetSurfaceChunkCache.stats.lastChunkKey,
    lastSampleKey: planetSurfaceChunkCache.stats.lastSampleKey
  };
}

function getLongitudeDistanceKmPerDegree(latitude) {
  return Math.max(0.001, (getPlanetCircumferenceKm() / 360) * getPlanetLatitudeScale(latitude));
}

function getLatitudeDistanceKmPerDegree() {
  return getPlanetPoleToPoleKm() / 180;
}

function normalizeLongitude(longitude) {
  return ((Number(longitude) || 0) + 540) % 360 - 180;
}

function getLatLonFromLocalOffset(eastKm, northKm) {
  var view = getPlanetView();
  var viewMeters = getSurfaceMeterCoordinate(view.latitude, view.longitude);

  return getLatLonFromSurfaceMeterCoordinate(
    viewMeters.eastMeters + (Number(eastKm) || 0) * 1000,
    viewMeters.northMeters + (Number(northKm) || 0) * 1000
  );
}

function getLatLonFromSurfaceMeterCoordinate(eastMeters, northMeters) {
  var latitude = clamp(
    (Number(northMeters) || 0) / (getLatitudeDistanceKmPerDegree() * 1000),
    -90,
    90
  );
  var longitude = normalizeLongitude(
    (Number(eastMeters) || 0) / (getLongitudeDistanceKmPerDegree(latitude) * 1000)
  );

  return {
    latitude: latitude,
    longitude: longitude
  };
}

function getPlanetLocalLatLonFromCanvasPoint(canvasX, canvasY) {
  var scale = getPlanetViewScale();
  var sampleX = (Number(canvasX) || 0) / CONFIG.TILE_SIZE;
  var sampleY = (Number(canvasY) || 0) / CONFIG.TILE_SIZE;
  var viewMeters = getSurfaceMeterCoordinate(getPlanetView().latitude, getPlanetView().longitude);
  var eastMeters = viewMeters.eastMeters + (sampleX - WORLD_WIDTH / 2) * scale.metersPerSample;
  var northMeters = viewMeters.northMeters - (sampleY - WORLD_HEIGHT / 2) * scale.metersPerSample;

  return getLatLonFromSurfaceMeterCoordinate(eastMeters, northMeters);
}

function getPlanetLatLonFromCanvasPoint(canvasX, canvasY) {
  if (isGlobeRenderMode() && isPlanetLocalView()) {
    return getPlanetLocalLatLonFromCanvasPoint(canvasX, canvasY);
  }

  if (!isGlobeRenderMode()) {
    var flatTileX = clamp(Math.floor((Number(canvasX) || 0) / CONFIG.TILE_SIZE), 0, WORLD_WIDTH - 1);
    var flatTileY = clamp(Math.floor((Number(canvasY) || 0) / CONFIG.TILE_SIZE), 0, WORLD_HEIGHT - 1);

    return {
      latitude: getPlanetLatitudeForTile(flatTileY),
      longitude: getPlanetLongitudeForTile(flatTileX)
    };
  }

  var projection = getPlanetProjection();
  var normalizedX = ((Number(canvasX) || 0) - projection.centerX) / projection.radius;
  var normalizedYNorth = -((Number(canvasY) || 0) - projection.centerY) / projection.radius;
  var rho = Math.sqrt(normalizedX * normalizedX + normalizedYNorth * normalizedYNorth);

  if (rho > 1) {
    return null;
  }

  if (rho === 0) {
    return {
      latitude: projection.viewLatitudeDeg,
      longitude: projection.viewLongitudeDeg
    };
  }

  var centerLatitude = projection.viewLatitudeDeg * Math.PI / 180;
  var centerLongitude = projection.viewLongitudeDeg * Math.PI / 180;
  var angularDistance = Math.asin(rho);
  var latitude = Math.asin(
    Math.cos(angularDistance) * Math.sin(centerLatitude) +
    (normalizedYNorth * Math.sin(angularDistance) * Math.cos(centerLatitude)) / rho
  );
  var longitude = centerLongitude + Math.atan2(
    normalizedX * Math.sin(angularDistance),
    rho * Math.cos(centerLatitude) * Math.cos(angularDistance) -
      normalizedYNorth * Math.sin(centerLatitude) * Math.sin(angularDistance)
  );

  return {
    latitude: clamp(latitude * 180 / Math.PI, -90, 90),
    longitude: normalizeLongitude(longitude * 180 / Math.PI)
  };
}

function focusPlanetViewOnCanvasPoint(canvasX, canvasY) {
  var latLon = getPlanetLatLonFromCanvasPoint(canvasX, canvasY);

  if (!latLon) {
    return false;
  }

  focusPlanetViewOnLatLon(latLon.latitude, latLon.longitude);
  return true;
}

function panPlanetViewByKm(eastKm, northKm) {
  var target = getLatLonFromLocalOffset(eastKm, northKm);

  focusPlanetViewOnLatLon(target.latitude, target.longitude);
  return getPlanetView();
}

function panPlanetViewByScreenDelta(deltaX, deltaY) {
  var scale = getPlanetViewScale();
  var eastKm = -(Number(deltaX) || 0) * scale.metersPerSample / CONFIG.TILE_SIZE / 1000;
  var northKm = (Number(deltaY) || 0) * scale.metersPerSample / CONFIG.TILE_SIZE / 1000;

  return panPlanetViewByKm(eastKm, northKm);
}

function panPlanetViewBySamples(eastSamples, northSamples) {
  var scale = getPlanetViewScale();

  return panPlanetViewByKm(
    (Number(eastSamples) || 0) * scale.metersPerSample / 1000,
    (Number(northSamples) || 0) * scale.metersPerSample / 1000
  );
}

function getTileFromLatLon(latitude, longitude) {
  var normalizedLongitude = normalizeLongitude(longitude);
  var normalizedLatitude = clamp(Number(latitude) || 0, -90, 90);

  return {
    x: getWrappedWorldX(Math.floor(((normalizedLongitude + 180) / 360) * WORLD_WIDTH)),
    y: getClampedWorldY(Math.floor(((90 - normalizedLatitude) / 180) * WORLD_HEIGHT))
  };
}

function getPlanetSurfaceTileBlend(latitude, longitude) {
  var normalizedLongitude = normalizeLongitude(longitude);
  var normalizedLatitude = clamp(Number(latitude) || 0, -90, 90);
  var xFloat = ((normalizedLongitude + 180) / 360) * Math.max(1, WORLD_WIDTH) - 0.5;
  var yFloat = ((90 - normalizedLatitude) / 180) * Math.max(1, WORLD_HEIGHT) - 0.5;
  var x0 = Math.floor(xFloat);
  var y0 = Math.floor(yFloat);
  var xAmount = smoothSurfaceNoiseAmount(xFloat - x0);
  var yAmount = smoothSurfaceNoiseAmount(yFloat - y0);
  var rawTiles = [
    { x: x0, y: y0, weight: (1 - xAmount) * (1 - yAmount) },
    { x: x0 + 1, y: y0, weight: xAmount * (1 - yAmount) },
    { x: x0, y: y0 + 1, weight: (1 - xAmount) * yAmount },
    { x: x0 + 1, y: y0 + 1, weight: xAmount * yAmount }
  ];
  var tiles = [];
  var biomeWeights = {};
  var totalWeight = 0;
  var dominantBiome = "unknown";
  var dominantWeight = 0;

  for (var i = 0; i < rawTiles.length; i++) {
    var raw = rawTiles[i];
    var tileX = getWrappedWorldX(raw.x);
    var tileY = getClampedWorldY(raw.y);
    var tile = getPlanetTile(tileX, tileY);
    var weight = clamp(Number(raw.weight) || 0, 0, 1);
    var biome = tile && tile.biome ? tile.biome : "unknown";

    if (weight <= 0) {
      continue;
    }

    tiles.push({
      x: tileX,
      y: tileY,
      weight: weight,
      biome: biome,
      tile: tile
    });
    biomeWeights[biome] = (biomeWeights[biome] || 0) + weight;
    totalWeight += weight;
  }

  if (totalWeight > 0 && Math.abs(totalWeight - 1) > 0.000001) {
    tiles.forEach(function(item) {
      item.weight = item.weight / totalWeight;
    });

    Object.keys(biomeWeights).forEach(function(biome) {
      biomeWeights[biome] = biomeWeights[biome] / totalWeight;
    });
    totalWeight = 1;
  }

  Object.keys(biomeWeights).forEach(function(biome) {
    if (biomeWeights[biome] > dominantWeight) {
      dominantWeight = biomeWeights[biome];
      dominantBiome = biome;
    }
  });

  return {
    tiles: tiles,
    biomeWeights: biomeWeights,
    dominantBiome: dominantBiome,
    dominantWeight: dominantWeight,
    transitionStrength: clamp(1 - dominantWeight, 0, 1),
    xAmount: xAmount,
    yAmount: yAmount,
    totalWeight: totalWeight
  };
}

function getPlanetTileCenterLatLon(x, y) {
  return {
    latitude: getPlanetLatitudeForTile(getClampedWorldY(y)),
    longitude: getPlanetLongitudeForTile(getWrappedWorldX(x))
  };
}

function getRandomLatLonInTile(x, y) {
  var center = getPlanetTileCenterLatLon(x, y);
  var latitudeJitter = (randomUnit() - 0.5) * getPlanetTileLatitudeStepDeg() * 0.86;
  var longitudeJitter = (randomUnit() - 0.5) * getPlanetTileLongitudeStepDeg() * 0.86;

  return {
    latitude: clamp(center.latitude + latitudeJitter, -90, 90),
    longitude: normalizeLongitude(center.longitude + longitudeJitter)
  };
}

function getEntitySurfacePosition(entity) {
  if (!entity) {
    return null;
  }

  if (
    Number.isFinite(Number(entity.latitude)) &&
    Number.isFinite(Number(entity.longitude))
  ) {
    return {
      latitude: clamp(Number(entity.latitude), -90, 90),
      longitude: normalizeLongitude(entity.longitude)
    };
  }

  return getPlanetTileCenterLatLon(entity.x, entity.y);
}

function setEntitySurfacePosition(entity, latitude, longitude) {
  if (!entity) {
    return entity;
  }

  entity.latitude = clamp(Number(latitude) || 0, -90, 90);
  entity.longitude = normalizeLongitude(longitude);
  return entity;
}

function assignRandomSurfacePositionInTile(entity) {
  if (!entity) {
    return entity;
  }

  var position = getRandomLatLonInTile(entity.x, entity.y);
  return setEntitySurfacePosition(entity, position.latitude, position.longitude);
}

function ensureEntitySurfacePosition(entity) {
  var position = getEntitySurfacePosition(entity);

  if (!position) {
    return entity;
  }

  return setEntitySurfacePosition(entity, position.latitude, position.longitude);
}

function syncEntityTileFromSurfacePosition(entity) {
  var position = getEntitySurfacePosition(entity);

  if (!entity || !position) {
    return entity;
  }

  var tile = getTileFromLatLon(position.latitude, position.longitude);
  entity.x = tile.x;
  entity.y = tile.y;
  return entity;
}

function interpolateLongitudeDeg(fromLongitude, toLongitude, amount) {
  return normalizeLongitude(
    (Number(fromLongitude) || 0) +
      wrapPlanetLongitudeDelta((Number(toLongitude) || 0) - (Number(fromLongitude) || 0)) *
      clamp(Number(amount) || 0, 0, 1)
  );
}

function getPlanetLocalSurfaceAddress(gridX, gridY) {
  var scale = getPlanetViewScale();
  var viewMeters = getSurfaceMeterCoordinate(getPlanetView().latitude, getPlanetView().longitude);
  var eastMeters = viewMeters.eastMeters + (gridX - WORLD_WIDTH / 2 + 0.5) * scale.metersPerSample;
  var northMeters = viewMeters.northMeters - (gridY - WORLD_HEIGHT / 2 + 0.5) * scale.metersPerSample;
  var latLon = getLatLonFromSurfaceMeterCoordinate(eastMeters, northMeters);

  return {
    latitude: latLon.latitude,
    longitude: latLon.longitude,
    eastKm: (eastMeters - viewMeters.eastMeters) / 1000,
    northKm: (northMeters - viewMeters.northMeters) / 1000,
    eastMeters: eastMeters,
    northMeters: northMeters,
    address: getPlanetSurfaceSampleAddress(latLon.latitude, latLon.longitude)
  };
}

function makePlanetSurfaceChunkAddress(zoomLevelIndex, chunkX, chunkY) {
  var scale = getPlanetZoomLevel(
    typeof zoomLevelIndex === "number" ? zoomLevelIndex : getPlanetSurfaceLodZoomIndex(getPlanetView().zoomLevel)
  );
  var chunkSamples = getPlanetSurfaceChunkSampleCount();
  var sampleMeters = Math.max(0.1, scale.metersPerSample);
  var normalizedChunkX = Math.round(Number(chunkX) || 0);
  var normalizedChunkY = Math.round(Number(chunkY) || 0);
  var chunkKey = [
    scale.index,
    sampleMeters,
    chunkSamples,
    normalizedChunkX,
    normalizedChunkY
  ].join(":");

  return {
    zoomLevel: scale.index,
    scaleName: scale.name,
    sampleMeters: sampleMeters,
    chunkSamples: chunkSamples,
    sampleEast: normalizedChunkX * chunkSamples,
    sampleNorth: normalizedChunkY * chunkSamples,
    chunkX: normalizedChunkX,
    chunkY: normalizedChunkY,
    localSampleX: 0,
    localSampleY: 0,
    chunkKey: chunkKey,
    sampleKey: "0:0"
  };
}

function getPlanetSurfaceChunkCenterLatLon(address) {
  var centerEastMeters = (address.sampleEast + address.chunkSamples / 2) * address.sampleMeters;
  var centerNorthMeters = (address.sampleNorth + address.chunkSamples / 2) * address.sampleMeters;

  return getLatLonFromSurfaceMeterCoordinate(centerEastMeters, centerNorthMeters);
}

function getPlanetSurfaceChunkParentAddress(address, parentZoomLevelIndex) {
  var targetZoomLevel = typeof parentZoomLevelIndex === "number"
    ? parentZoomLevelIndex
    : address.zoomLevel - 1;
  var center = getPlanetSurfaceChunkCenterLatLon(address);

  if (targetZoomLevel < 0 || targetZoomLevel >= address.zoomLevel) {
    return null;
  }

  return getPlanetSurfaceSampleAddress(center.latitude, center.longitude, targetZoomLevel);
}

function getPlanetSurfaceChunkLineage(address) {
  var lineage = [];

  for (var zoomLevel = address.zoomLevel - 1; zoomLevel >= 0; zoomLevel--) {
    var parentAddress = getPlanetSurfaceChunkParentAddress(address, zoomLevel);

    if (parentAddress) {
      lineage.push({
        zoomLevel: parentAddress.zoomLevel,
        scaleName: parentAddress.scaleName,
        sampleMeters: parentAddress.sampleMeters,
        chunkX: parentAddress.chunkX,
        chunkY: parentAddress.chunkY,
        chunkKey: parentAddress.chunkKey
      });
    }
  }

  return lineage;
}

function getPlanetSurfaceChunkLineageLabel(lineage) {
  if (!Array.isArray(lineage) || lineage.length === 0) {
    return "-";
  }

  return lineage.map(function(item) {
    return item.scaleName + " " + item.chunkX + "," + item.chunkY;
  }).join(" <- ");
}

function getPlanetLocalCanvasPoint(longitude, latitude) {
  var scale = getPlanetViewScale();
  var viewMeters = getSurfaceMeterCoordinate(getPlanetView().latitude, getPlanetView().longitude);
  var targetMeters = getSurfaceMeterCoordinate(latitude, longitude);
  var eastMeters = targetMeters.eastMeters - viewMeters.eastMeters;
  var northMeters = targetMeters.northMeters - viewMeters.northMeters;

  return {
    x: canvas.width / 2 + (eastMeters / scale.metersPerSample) * CONFIG.TILE_SIZE,
    y: canvas.height / 2 - (northMeters / scale.metersPerSample) * CONFIG.TILE_SIZE
  };
}

function getPlanetSurfaceChunkScreenRect(address) {
  var currentScale = getPlanetViewScale();
  var samplePixelSize = CONFIG.TILE_SIZE * (address.sampleMeters / Math.max(0.1, currentScale.metersPerSample));
  var viewMeters = getSurfaceMeterCoordinate(getPlanetView().latitude, getPlanetView().longitude);
  var minEastMeters = address.sampleEast * address.sampleMeters;
  var maxNorthMeters = (address.sampleNorth + address.chunkSamples) * address.sampleMeters;
  var sizePixels = address.chunkSamples * samplePixelSize;

  return {
    x: canvas.width / 2 + ((minEastMeters - viewMeters.eastMeters) / currentScale.metersPerSample) * CONFIG.TILE_SIZE,
    y: canvas.height / 2 - ((maxNorthMeters - viewMeters.northMeters) / currentScale.metersPerSample) * CONFIG.TILE_SIZE,
    width: sizePixels,
    height: sizePixels,
    samplePixelSize: samplePixelSize
  };
}

function getPlanetSurfaceChunkScreenPriority(screenRect) {
  var centerX = (Number(screenRect.x) || 0) + (Number(screenRect.width) || 0) / 2;
  var centerY = (Number(screenRect.y) || 0) + (Number(screenRect.height) || 0) / 2;
  var deltaX = centerX - canvas.width / 2;
  var deltaY = centerY - canvas.height / 2;

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

function getPlanetVisibleSurfaceChunks(guardSamples, maxChunks) {
  var normalizedGuardSamples = Math.max(1, Math.round(Number(guardSamples) || 1));
  var visibleChunkLimit = Math.max(
    1,
    Math.round(Number(maxChunks) || getPlanetSurfaceVisibleChunkLimit())
  );
  var samplePoints = [
    getPlanetLocalSurfaceAddress(-normalizedGuardSamples, -normalizedGuardSamples).address,
    getPlanetLocalSurfaceAddress(WORLD_WIDTH + normalizedGuardSamples, -normalizedGuardSamples).address,
    getPlanetLocalSurfaceAddress(-normalizedGuardSamples, WORLD_HEIGHT + normalizedGuardSamples).address,
    getPlanetLocalSurfaceAddress(WORLD_WIDTH + normalizedGuardSamples, WORLD_HEIGHT + normalizedGuardSamples).address
  ];
  var minChunkX = samplePoints[0].chunkX;
  var maxChunkX = samplePoints[0].chunkX;
  var minChunkY = samplePoints[0].chunkY;
  var maxChunkY = samplePoints[0].chunkY;
  var visibleChunks = [];

  for (var i = 1; i < samplePoints.length; i++) {
    minChunkX = Math.min(minChunkX, samplePoints[i].chunkX);
    maxChunkX = Math.max(maxChunkX, samplePoints[i].chunkX);
    minChunkY = Math.min(minChunkY, samplePoints[i].chunkY);
    maxChunkY = Math.max(maxChunkY, samplePoints[i].chunkY);
  }

  for (var chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
    for (var chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      var address = makePlanetSurfaceChunkAddress(samplePoints[0].zoomLevel, chunkX, chunkY);
      var screenRect = getPlanetSurfaceChunkScreenRect(address);

      if (
        screenRect.x > canvas.width + CONFIG.TILE_SIZE ||
        screenRect.x + screenRect.width < -CONFIG.TILE_SIZE ||
        screenRect.y > canvas.height + CONFIG.TILE_SIZE ||
        screenRect.y + screenRect.height < -CONFIG.TILE_SIZE
      ) {
        continue;
      }

      visibleChunks.push({
        address: address,
        screenX: screenRect.x,
        screenY: screenRect.y,
        width: screenRect.width,
        height: screenRect.height,
        priorityDistance: getPlanetSurfaceChunkScreenPriority(screenRect)
      });
    }
  }

  visibleChunks.sort(function(a, b) {
    if (a.priorityDistance !== b.priorityDistance) {
      return a.priorityDistance - b.priorityDistance;
    }

    if (a.address.chunkY !== b.address.chunkY) {
      return a.address.chunkY - b.address.chunkY;
    }

    return a.address.chunkX - b.address.chunkX;
  });

  var totalCandidateChunks = visibleChunks.length;

  visibleChunks.totalCandidateChunks = totalCandidateChunks;
  visibleChunks.workingSetLimit = visibleChunkLimit;

  if (visibleChunks.length > visibleChunkLimit) {
    visibleChunks = visibleChunks.slice(0, visibleChunkLimit);
    visibleChunks.totalCandidateChunks = totalCandidateChunks;
    visibleChunks.workingSetLimit = visibleChunkLimit;
  }

  visibleChunks.culledChunks = Math.max(0, visibleChunks.totalCandidateChunks - visibleChunks.length);
  return visibleChunks;
}

function getPlanetLocalSample(gridX, gridY) {
  var localAddress = getPlanetLocalSurfaceAddress(gridX, gridY);
  var latLon = {
    latitude: localAddress.latitude,
    longitude: localAddress.longitude
  };
  var tilePosition = getTileFromLatLon(latLon.latitude, latLon.longitude);
  var tile = getPlanetTile(tilePosition.x, tilePosition.y);
  var cachedSample = getPlanetSurfaceChunkSample(latLon.latitude, latLon.longitude, tile);

  return {
    x: cachedSample.x,
    y: cachedSample.y,
    latitude: cachedSample.latitude,
    longitude: cachedSample.longitude,
    tile: cachedSample.tile,
    biome: cachedSample.biome,
    detail: cachedSample.detail,
    surfaceChunkKey: cachedSample.surfaceChunkKey,
    surfaceSampleKey: cachedSample.surfaceSampleKey,
    surfaceChunkX: cachedSample.surfaceChunkX,
    surfaceChunkY: cachedSample.surfaceChunkY,
    surfaceParentLineage: cachedSample.surfaceParentLineage,
    surfaceSampleX: cachedSample.surfaceSampleX,
    surfaceSampleY: cachedSample.surfaceSampleY,
    surfaceChunkLocalX: cachedSample.surfaceChunkLocalX,
    surfaceChunkLocalY: cachedSample.surfaceChunkLocalY,
    surfaceSampleMeters: cachedSample.surfaceSampleMeters,
    eastKm: localAddress.eastKm,
    northKm: localAddress.northKm
  };
}

function getDeterministicUnitNoise(a, b, c) {
  var value = Math.sin((Number(a) || 0) * 12.9898 + (Number(b) || 0) * 78.233 + (Number(c) || 0) * 37.719) * 43758.5453;

  return value - Math.floor(value);
}

function getQuantizedSurfaceNoise(latitude, longitude, metersPerPatch) {
  var patchMeters = Math.max(1, Number(metersPerPatch) || 1);
  var latitudeMeters = latitude * getLatitudeDistanceKmPerDegree() * 1000;
  var longitudeMeters = longitude * getLongitudeDistanceKmPerDegree(latitude) * 1000;
  var cellLatitude = Math.floor(latitudeMeters / patchMeters);
  var cellLongitude = Math.floor(longitudeMeters / patchMeters);

  return getDeterministicUnitNoise(cellLatitude, cellLongitude, patchMeters);
}

function getSurfaceMeterCoordinate(latitude, longitude) {
  return {
    northMeters: (Number(latitude) || 0) * getLatitudeDistanceKmPerDegree() * 1000,
    eastMeters: normalizeLongitude(longitude) * getLongitudeDistanceKmPerDegree(latitude) * 1000
  };
}

function getPlanetGroundFeatureBlockMeters() {
  return 64;
}

function getPlanetGroundFeatureQueryBlockLimit() {
  return 4096;
}

function getPlanetGroundFeatureBlockCacheLimit() {
  return 2048;
}

function resetPlanetGroundFeatureBlockCache() {
  planetGroundFeatureBlockCache = {
    blocks: {},
    order: [],
    stats: {
      hits: 0,
      misses: 0,
      evictions: 0,
      lastBlockKey: "-"
    }
  };
}

function getPlanetGroundFeatureBlockCacheStats() {
  return {
    blocks: planetGroundFeatureBlockCache.order.length,
    hits: planetGroundFeatureBlockCache.stats.hits,
    misses: planetGroundFeatureBlockCache.stats.misses,
    evictions: planetGroundFeatureBlockCache.stats.evictions,
    lastBlockKey: planetGroundFeatureBlockCache.stats.lastBlockKey
  };
}

function getPlanetGroundFeatureTypeColor(type) {
  switch (type) {
    case "stream":
      return "#7ec8ff";
    case "wetland":
      return "#5da879";
    case "reef":
      return "#8ed7c9";
    case "shoal":
      return "#a5d9c7";
    case "ridge":
      return "#b9b081";
    case "swale":
      return "#6fa778";
    case "rockfield":
      return "#a99d8a";
    case "meadow":
      return "#8fcf71";
    case "clearing":
      return "#8fcf71";
    default:
      return "#d9e7ff";
  }
}

function getPlanetGroundFeatureSeedOffset() {
  return typeof hashSeedText === "function" ? hashSeedText(world.seedText || "") % 100000 : 0;
}

function getPlanetGroundFeatureId(blockEast, blockNorth, type, localIndex) {
  return [
    "GF",
    Math.round(Number(blockEast) || 0),
    Math.round(Number(blockNorth) || 0),
    String(type || "feature"),
    Math.round(Number(localIndex) || 0)
  ].join(":");
}

function appendPlanetGroundFeature(features, blockEast, blockNorth, feature) {
  var localIndex = features.length;

  feature.blockEast = Math.round(Number(blockEast) || 0);
  feature.blockNorth = Math.round(Number(blockNorth) || 0);
  feature.localIndex = localIndex;
  feature.id = getPlanetGroundFeatureId(blockEast, blockNorth, feature.type, localIndex);
  features.push(feature);
  return feature;
}

function getPlanetGroundFeatureLineBends(blockEast, blockNorth, seed, lengthMeters) {
  var bends = [];
  var normalizedLengthMeters = Math.max(1, Number(lengthMeters) || 1);
  var bendScale = normalizedLengthMeters * 0.13;

  for (var i = 1; i <= 3; i++) {
    bends.push({
      t: i / 4,
      offsetMeters: (getDeterministicUnitNoise(blockEast, blockNorth, seed + 31 + i * 11) - 0.5) * bendScale
    });
  }

  return bends;
}

function getPlanetGroundFeaturePatchPoints(blockEast, blockNorth, seed, radiusX, radiusY) {
  var points = [];
  var normalizedRadiusX = Math.max(1, Number(radiusX) || 1);
  var normalizedRadiusY = Math.max(1, Number(radiusY) || 1);
  var pointCount = 8;

  for (var i = 0; i < pointCount; i++) {
    var angle = (Math.PI * 2 * i) / pointCount;
    var jitter = 0.74 + getDeterministicUnitNoise(blockEast, blockNorth, seed + 41 + i * 17) * 0.34;

    points.push({
      x: Math.cos(angle) * normalizedRadiusX * jitter,
      y: Math.sin(angle) * normalizedRadiusY * jitter
    });
  }

  return points;
}

function normalizePlanetLineAngleRadians(angle) {
  var normalized = Number(angle) || 0;

  while (normalized < 0) {
    normalized += Math.PI;
  }

  while (normalized >= Math.PI) {
    normalized -= Math.PI;
  }

  return normalized;
}

function getPlanetLineAngleDifferenceRadians(firstAngle, secondAngle) {
  var first = normalizePlanetLineAngleRadians(firstAngle);
  var second = normalizePlanetLineAngleRadians(secondAngle);
  var delta = Math.abs(first - second);

  return Math.min(delta, Math.PI - delta);
}

function getPlanetTileFlowAngleRadians(tile) {
  if (!tile) {
    return null;
  }

  var dx = Number(tile.flowDirectionX) || 0;
  var dy = Number(tile.flowDirectionY) || 0;

  if (dx === 0 && dy === 0) {
    return null;
  }

  return normalizePlanetLineAngleRadians(Math.atan2(-dy, dx));
}

function getPlanetTileRidgeAngleRadians(tile) {
  if (!tile || !Number.isFinite(Number(tile.terrainAspect))) {
    return null;
  }

  return normalizePlanetLineAngleRadians((Number(tile.terrainAspect) * Math.PI / 180) + Math.PI / 2);
}

function getPlanetGroundFeatureOrientation(tile, type, blockEast, blockNorth, seed) {
  var seededAngle = getDeterministicUnitNoise(blockEast, blockNorth, seed + 7) * Math.PI;
  var jitter = (getDeterministicUnitNoise(blockEast, blockNorth, seed + 23) - 0.5) * Math.PI * 0.18;
  var flowAngle = getPlanetTileFlowAngleRadians(tile);
  var ridgeAngle = getPlanetTileRidgeAngleRadians(tile);
  var preferredAngle = null;
  var source = "seed";

  if ((type === "stream" || type === "swale" || type === "wetland") && flowAngle !== null) {
    preferredAngle = flowAngle;
    source = "flow";
  } else if ((type === "ridge" || type === "rockfield") && ridgeAngle !== null) {
    preferredAngle = ridgeAngle;
    source = "ridge";
  } else if ((type === "shoal" || type === "reef") && ridgeAngle !== null) {
    preferredAngle = ridgeAngle;
    source = "coast";
  }

  if (preferredAngle === null) {
    preferredAngle = seededAngle;
  }

  return {
    angle: normalizePlanetLineAngleRadians(preferredAngle + jitter),
    source: source,
    preferredAngle: normalizePlanetLineAngleRadians(preferredAngle),
    seededAngle: normalizePlanetLineAngleRadians(seededAngle),
    jitterRadians: jitter
  };
}

function getPlanetGroundFeatureBlock(blockEast, blockNorth, blockMeters) {
  var normalizedBlockMeters = Math.max(16, Number(blockMeters) || getPlanetGroundFeatureBlockMeters());
  var normalizedBlockEast = Math.round(Number(blockEast) || 0);
  var normalizedBlockNorth = Math.round(Number(blockNorth) || 0);
  var seedOffset = getPlanetGroundFeatureSeedOffset();
  var cacheKey = [
    seedOffset,
    Math.round(normalizedBlockMeters * 100) / 100,
    normalizedBlockEast,
    normalizedBlockNorth
  ].join(":");
  var cachedBlock = planetGroundFeatureBlockCache.blocks[cacheKey];

  planetGroundFeatureBlockCache.stats.lastBlockKey = cacheKey;

  if (cachedBlock) {
    planetGroundFeatureBlockCache.stats.hits++;
    return cachedBlock;
  }

  var centerEast = (Number(blockEast) || 0) * normalizedBlockMeters + normalizedBlockMeters / 2;
  var centerNorth = (Number(blockNorth) || 0) * normalizedBlockMeters + normalizedBlockMeters / 2;
  var center = getLatLonFromSurfaceMeterCoordinate(centerEast, centerNorth);
  var tilePosition = getTileFromLatLon(center.latitude, center.longitude);
  var tile = getPlanetTile(tilePosition.x, tilePosition.y);
  var biome = tile ? tile.biome : "unknown";
  var landBiome = biome !== "ocean" && biome !== "ice" && biome !== "unknown";
  var forestBiome = biome === "forest" || biome === "tundra";
  var openBiome = biome === "grassland" || biome === "desert" || biome === "tundra";
  var riverStrength = clamp(tile && Number.isFinite(Number(tile.riverStrength)) ? Number(tile.riverStrength) : 0, 0, 1);
  var moisture = clamp(tile && Number.isFinite(Number(tile.moisture)) ? Number(tile.moisture) / 2.2 : 0.35, 0, 1);
  var coast = clamp(tile && Number.isFinite(Number(tile.coastFactor)) ? Number(tile.coastFactor) : 0, 0, 1);
  var shallowWater = clamp(Math.max(
    tile && Number.isFinite(Number(tile.shallowWater)) ? Number(tile.shallowWater) : 0,
    tile && Number.isFinite(Number(tile.shelfStrength)) ? Number(tile.shelfStrength) : 0
  ), 0, 1);
  var ridgeStrength = clamp(tile && Number.isFinite(Number(tile.ridgeStrength)) ? Number(tile.ridgeStrength) : 0, 0, 1);
  var roughness = clamp(tile && Number.isFinite(Number(tile.roughness)) ? Number(tile.roughness) : 0, 0, 1);
  var highlandLift = clamp(tile && Number.isFinite(Number(tile.highlandLift)) ? Number(tile.highlandLift) / 1.4 : 0, 0, 1);
  var features = [];
  var naturalSeed = getDeterministicUnitNoise(blockEast, blockNorth, 41 + seedOffset);
  var ridgeSeed = getDeterministicUnitNoise(blockEast, blockNorth, 73 + seedOffset);
  var rockSeed = getDeterministicUnitNoise(blockEast, blockNorth, 109 + seedOffset);
  var meadowSeed = getDeterministicUnitNoise(blockEast, blockNorth, 131 + seedOffset);
  var wetSignal = clamp(riverStrength * 0.62 + moisture * 0.30 + coast * 0.18, 0, 1);
  var ridgeSignal = clamp(ridgeStrength * 0.58 + roughness * 0.24 + highlandLift * 0.34, 0, 1);
  var oceanSignal = clamp(shallowWater * 0.56 + coast * 0.34 + naturalSeed * 0.10, 0, 1);

  function makeLine(type, seed, widthMeters, alpha) {
    var orientation = getPlanetGroundFeatureOrientation(tile, type, blockEast, blockNorth, seed);
    var angle = orientation.angle;
    var offset = (getDeterministicUnitNoise(blockEast, blockNorth, seed + 13) - 0.5) * normalizedBlockMeters * 0.62;
    var length = normalizedBlockMeters * (1.18 + getDeterministicUnitNoise(blockEast, blockNorth, seed + 19) * 0.62);
    var normalX = -Math.sin(angle);
    var normalY = Math.cos(angle);
    var centerLineEast = centerEast + normalX * offset;
    var centerLineNorth = centerNorth + normalY * offset;
    var dx = Math.cos(angle) * length / 2;
    var dy = Math.sin(angle) * length / 2;

    appendPlanetGroundFeature(features, blockEast, blockNorth, {
      type: type,
      shape: "line",
      biome: biome,
      east1: centerLineEast - dx,
      north1: centerLineNorth - dy,
      east2: centerLineEast + dx,
      north2: centerLineNorth + dy,
      widthMeters: widthMeters,
      bends: getPlanetGroundFeatureLineBends(blockEast, blockNorth, seed, length),
      angleRadians: angle,
      orientationSource: orientation.source,
      preferredAngleRadians: orientation.preferredAngle,
      seededAngleRadians: orientation.seededAngle,
      color: getPlanetGroundFeatureTypeColor(type),
      alpha: alpha
    });
  }

  if (biome === "ocean") {
    if (oceanSignal > 0.46 || naturalSeed > 0.58) {
      makeLine(shallowWater > 0.44 ? "shoal" : "reef", 211, 1.2 + naturalSeed * 2.4 + oceanSignal * 1.6, 0.12 + oceanSignal * 0.08);
    }
  } else if (landBiome && naturalSeed > 0.34) {
    makeLine(forestBiome ? "swale" : "ridge", 223, 0.7 + naturalSeed * 1.8, forestBiome ? 0.16 : 0.20);
  }

  if (landBiome && (wetSignal > 0.58 || (wetSignal > 0.34 && naturalSeed > 0.26))) {
    makeLine("stream", 257, 1.2 + wetSignal * 3.2, 0.20 + wetSignal * 0.20);
  }

  if (landBiome && (ridgeSeed > 0.72 || ridgeSignal > 0.52)) {
    makeLine(openBiome || ridgeSignal > 0.52 ? "ridge" : "swale", 307, openBiome ? 2.2 + ridgeSignal * 2.0 : 1.4 + ridgeSignal, openBiome ? 0.20 + ridgeSignal * 0.16 : 0.16 + ridgeSignal * 0.12);
  }

  if (landBiome && (meadowSeed > 0.82 || wetSignal > 0.66)) {
    var clearingWidth = normalizedBlockMeters * (0.18 + meadowSeed * 0.20);
    var clearingHeight = normalizedBlockMeters * (0.12 + getDeterministicUnitNoise(blockEast, blockNorth, 149) * 0.18);
    var patchType = wetSignal > 0.66 ? "wetland" : "meadow";
    var patchOrientation = getPlanetGroundFeatureOrientation(tile, patchType, blockEast, blockNorth, 163);

    appendPlanetGroundFeature(features, blockEast, blockNorth, {
      type: patchType,
      shape: "rect",
      biome: biome,
      east: centerEast + (getDeterministicUnitNoise(blockEast, blockNorth, 151) - 0.5) * normalizedBlockMeters * 0.46,
      north: centerNorth + (getDeterministicUnitNoise(blockEast, blockNorth, 157) - 0.5) * normalizedBlockMeters * 0.46,
      widthMeters: clearingWidth,
      heightMeters: clearingHeight,
      rotation: patchOrientation.angle,
      orientationSource: patchOrientation.source,
      preferredAngleRadians: patchOrientation.preferredAngle,
      seededAngleRadians: patchOrientation.seededAngle,
      patchPoints: getPlanetGroundFeaturePatchPoints(blockEast, blockNorth, 167, clearingWidth / 2, clearingHeight / 2),
      color: getPlanetGroundFeatureTypeColor(patchType),
      alpha: patchType === "wetland" ? 0.18 : 0.13
    });
  }

  if (openBiome && (rockSeed > 0.88 || ridgeSignal > 0.62)) {
    var widthMeters = 7 + getDeterministicUnitNoise(blockEast, blockNorth, 173) * 18 + ridgeSignal * 8;
    var heightMeters = 6 + getDeterministicUnitNoise(blockEast, blockNorth, 181) * 14 + roughness * 6;
    var rockfieldOrientation = getPlanetGroundFeatureOrientation(tile, "rockfield", blockEast, blockNorth, 197);

    appendPlanetGroundFeature(features, blockEast, blockNorth, {
      type: "rockfield",
      shape: "rect",
      biome: biome,
      east: centerEast + (getDeterministicUnitNoise(blockEast, blockNorth, 191) - 0.5) * normalizedBlockMeters * 0.52,
      north: centerNorth + (getDeterministicUnitNoise(blockEast, blockNorth, 193) - 0.5) * normalizedBlockMeters * 0.52,
      widthMeters: widthMeters,
      heightMeters: heightMeters,
      rotation: rockfieldOrientation.angle,
      orientationSource: rockfieldOrientation.source,
      preferredAngleRadians: rockfieldOrientation.preferredAngle,
      seededAngleRadians: rockfieldOrientation.seededAngle,
      patchPoints: getPlanetGroundFeaturePatchPoints(blockEast, blockNorth, 199, widthMeters / 2, heightMeters / 2),
      color: getPlanetGroundFeatureTypeColor("rockfield"),
      alpha: 0.20
    });
  }

  planetGroundFeatureBlockCache.stats.misses++;
  planetGroundFeatureBlockCache.blocks[cacheKey] = features;
  planetGroundFeatureBlockCache.order.push(cacheKey);

  while (planetGroundFeatureBlockCache.order.length > getPlanetGroundFeatureBlockCacheLimit()) {
    var evictedKey = planetGroundFeatureBlockCache.order.shift();
    delete planetGroundFeatureBlockCache.blocks[evictedKey];
    planetGroundFeatureBlockCache.stats.evictions++;
  }

  return features;
}

function getPointToSegmentDistanceMeters(pointEast, pointNorth, lineEast1, lineNorth1, lineEast2, lineNorth2) {
  var dx = (Number(lineEast2) || 0) - (Number(lineEast1) || 0);
  var dy = (Number(lineNorth2) || 0) - (Number(lineNorth1) || 0);
  var lengthSquared = dx * dx + dy * dy;

  if (lengthSquared <= 0) {
    var pointDx = (Number(pointEast) || 0) - (Number(lineEast1) || 0);
    var pointDy = (Number(pointNorth) || 0) - (Number(lineNorth1) || 0);

    return Math.sqrt(pointDx * pointDx + pointDy * pointDy);
  }

  var amount = clamp(
    (((Number(pointEast) || 0) - (Number(lineEast1) || 0)) * dx +
      ((Number(pointNorth) || 0) - (Number(lineNorth1) || 0)) * dy) / lengthSquared,
    0,
    1
  );
  var nearestEast = (Number(lineEast1) || 0) + amount * dx;
  var nearestNorth = (Number(lineNorth1) || 0) + amount * dy;
  var nearestDx = (Number(pointEast) || 0) - nearestEast;
  var nearestDy = (Number(pointNorth) || 0) - nearestNorth;

  return Math.sqrt(nearestDx * nearestDx + nearestDy * nearestDy);
}

function getPointToRotatedRectDistanceMeters(pointEast, pointNorth, feature) {
  var rotation = -(Number(feature.rotation) || 0);
  var cos = Math.cos(rotation);
  var sin = Math.sin(rotation);
  var localEast = ((Number(pointEast) || 0) - (Number(feature.east) || 0)) * cos -
    ((Number(pointNorth) || 0) - (Number(feature.north) || 0)) * sin;
  var localNorth = ((Number(pointEast) || 0) - (Number(feature.east) || 0)) * sin +
    ((Number(pointNorth) || 0) - (Number(feature.north) || 0)) * cos;
  var outsideEast = Math.max(Math.abs(localEast) - (Number(feature.widthMeters) || 0) / 2, 0);
  var outsideNorth = Math.max(Math.abs(localNorth) - (Number(feature.heightMeters) || 0) / 2, 0);

  return Math.sqrt(outsideEast * outsideEast + outsideNorth * outsideNorth);
}

function getPlanetGroundFeatureDistanceMeters(feature, eastMeters, northMeters) {
  if (!feature) {
    return Infinity;
  }

  if (feature.shape === "line") {
    return getPointToSegmentDistanceMeters(
      eastMeters,
      northMeters,
      feature.east1,
      feature.north1,
      feature.east2,
      feature.north2
    );
  }

  if (feature.shape === "rect") {
    return getPointToRotatedRectDistanceMeters(eastMeters, northMeters, feature);
  }

  return Infinity;
}

function getPlanetGroundFeatureQueryWindow(minEastMeters, maxEastMeters, minNorthMeters, maxNorthMeters, blockMeters) {
  var normalizedBlockMeters = Math.max(16, Number(blockMeters) || getPlanetGroundFeatureBlockMeters());
  var minEast = Math.min(Number(minEastMeters) || 0, Number(maxEastMeters) || 0);
  var maxEast = Math.max(Number(minEastMeters) || 0, Number(maxEastMeters) || 0);
  var minNorth = Math.min(Number(minNorthMeters) || 0, Number(maxNorthMeters) || 0);
  var maxNorth = Math.max(Number(minNorthMeters) || 0, Number(maxNorthMeters) || 0);
  var minBlockEast = Math.floor(minEast / normalizedBlockMeters) - 1;
  var maxBlockEast = Math.floor(maxEast / normalizedBlockMeters) + 1;
  var minBlockNorth = Math.floor(minNorth / normalizedBlockMeters) - 1;
  var maxBlockNorth = Math.floor(maxNorth / normalizedBlockMeters) + 1;
  var blockColumns = Math.max(0, maxBlockEast - minBlockEast + 1);
  var blockRows = Math.max(0, maxBlockNorth - minBlockNorth + 1);

  return {
    blockMeters: normalizedBlockMeters,
    minBlockEast: minBlockEast,
    maxBlockEast: maxBlockEast,
    minBlockNorth: minBlockNorth,
    maxBlockNorth: maxBlockNorth,
    blockCount: blockColumns * blockRows,
    capped: blockColumns * blockRows > getPlanetGroundFeatureQueryBlockLimit()
  };
}

function getPlanetGroundFeaturesForMeterBounds(minEastMeters, maxEastMeters, minNorthMeters, maxNorthMeters, blockMeters) {
  var queryWindow = getPlanetGroundFeatureQueryWindow(
    minEastMeters,
    maxEastMeters,
    minNorthMeters,
    maxNorthMeters,
    blockMeters
  );
  var features = [];

  if (queryWindow.capped) {
    return features;
  }

  for (var blockNorth = queryWindow.minBlockNorth; blockNorth <= queryWindow.maxBlockNorth; blockNorth++) {
    for (var blockEast = queryWindow.minBlockEast; blockEast <= queryWindow.maxBlockEast; blockEast++) {
      var blockFeatures = getPlanetGroundFeatureBlock(blockEast, blockNorth, queryWindow.blockMeters);

      for (var i = 0; i < blockFeatures.length; i++) {
        features.push(blockFeatures[i]);
      }
    }
  }

  return features;
}

function getNearestPlanetGroundFeature(latitude, longitude, radiusMeters) {
  var meters = getSurfaceMeterCoordinate(latitude, longitude);
  var radius = Math.max(1, Number(radiusMeters) || 48);
  var features = getPlanetGroundFeaturesForMeterBounds(
    meters.eastMeters - radius,
    meters.eastMeters + radius,
    meters.northMeters - radius,
    meters.northMeters + radius
  );
  var nearest = null;
  var nearestDistance = Infinity;

  for (var i = 0; i < features.length; i++) {
    var distance = getPlanetGroundFeatureDistanceMeters(features[i], meters.eastMeters, meters.northMeters);

    if (distance < nearestDistance) {
      nearest = features[i];
      nearestDistance = distance;
    }
  }

  if (!nearest || nearestDistance > radius) {
    return null;
  }

  var result = {};

  for (var key in nearest) {
    if (Object.prototype.hasOwnProperty.call(nearest, key)) {
      result[key] = nearest[key];
    }
  }

  result.distanceMeters = nearestDistance;
  return result;
}

function getPlanetGroundFeatureInfluenceRadius(feature, sampleMeters) {
  var normalizedSampleMeters = Math.max(1, Number(sampleMeters) || 1);
  var baseRadius = clamp(normalizedSampleMeters * 3 + 6, 8, 48);

  if (!feature) {
    return baseRadius;
  }

  if (feature.shape === "line") {
    return Math.max(baseRadius, (Number(feature.widthMeters) || 1) / 2 + normalizedSampleMeters * 2 + 3);
  }

  if (feature.shape === "rect") {
    return Math.max(baseRadius, normalizedSampleMeters * 2 + 6);
  }

  return baseRadius;
}

function getPlanetSurfaceGroundFeatureInfluence(latitude, longitude, sampleMeters) {
  var normalizedSampleMeters = Math.max(1, Number(sampleMeters) || 1);
  var queryRadius = clamp(normalizedSampleMeters * 4 + 12, 16, 64);
  var nearest = normalizedSampleMeters <= 25
    ? getNearestPlanetGroundFeature(latitude, longitude, queryRadius)
    : null;
  var influenceRadius;
  var influence;

  if (!nearest) {
    return null;
  }

  influenceRadius = getPlanetGroundFeatureInfluenceRadius(nearest, normalizedSampleMeters);
  influence = clamp(1 - (Number(nearest.distanceMeters) || 0) / Math.max(1, influenceRadius), 0, 1);

  if (influence <= 0.01) {
    return null;
  }

  return {
    id: nearest.id,
    type: nearest.type,
    shape: nearest.shape,
    biome: nearest.biome,
    distanceMeters: Number(nearest.distanceMeters) || 0,
    influenceRadiusMeters: influenceRadius,
    influence: influence,
    color: nearest.color,
    widthMeters: nearest.widthMeters,
    heightMeters: nearest.heightMeters
  };
}

function getPlanetGroundFeatureDimensionLabel(feature) {
  if (!feature) {
    return "-";
  }

  if (feature.shape === "line") {
    var dx = (Number(feature.east2) || 0) - (Number(feature.east1) || 0);
    var dy = (Number(feature.north2) || 0) - (Number(feature.north1) || 0);
    var lengthMeters = Math.sqrt(dx * dx + dy * dy);

    return Math.round(lengthMeters) + "m x " + (Number(feature.widthMeters) || 0).toFixed(1) + "m";
  }

  if (feature.shape === "rect") {
    return Math.round(Number(feature.widthMeters) || 0) + "m x " +
      Math.round(Number(feature.heightMeters) || 0) + "m";
  }

  return "-";
}

function getPlanetGroundFeatureSummary(latitude, longitude, radiusMeters) {
  var meters = getSurfaceMeterCoordinate(latitude, longitude);
  var radius = Math.max(8, Number(radiusMeters) || 48);
  var queryWindow = getPlanetGroundFeatureQueryWindow(
    meters.eastMeters - radius,
    meters.eastMeters + radius,
    meters.northMeters - radius,
    meters.northMeters + radius
  );

  if (queryWindow.capped) {
    return {
      count: 0,
      counts: {},
      nearest: null,
      capped: true,
      blockCount: queryWindow.blockCount,
      label: "zoom closer"
    };
  }

  var features = getPlanetGroundFeaturesForMeterBounds(
    meters.eastMeters - radius,
    meters.eastMeters + radius,
    meters.northMeters - radius,
    meters.northMeters + radius
  );
  var counts = {};

  for (var i = 0; i < features.length; i++) {
    counts[features[i].type] = (counts[features[i].type] || 0) + 1;
  }

  return {
    count: features.length,
    counts: counts,
    nearest: getNearestPlanetGroundFeature(latitude, longitude, radius),
    capped: false,
    blockCount: queryWindow.blockCount,
    label: Object.keys(counts).sort().map(function(type) {
      return type + " " + counts[type];
    }).join(", ") || "none"
  };
}

function getPlanetSurfaceSampleAddress(latitude, longitude, zoomLevelIndex) {
  var scale = getPlanetZoomLevel(
    typeof zoomLevelIndex === "number" ? zoomLevelIndex : getPlanetSurfaceLodZoomIndex(getPlanetView().zoomLevel)
  );
  var chunkSamples = getPlanetSurfaceChunkSampleCount();
  var meters = getSurfaceMeterCoordinate(latitude, longitude);
  var sampleMeters = Math.max(0.1, scale.metersPerSample);
  var sampleEast = Math.floor(meters.eastMeters / sampleMeters);
  var sampleNorth = Math.floor(meters.northMeters / sampleMeters);
  var chunkX = Math.floor(sampleEast / chunkSamples);
  var chunkY = Math.floor(sampleNorth / chunkSamples);
  var localSampleX = getPositiveModulo(sampleEast, chunkSamples);
  var localSampleY = getPositiveModulo(sampleNorth, chunkSamples);
  var chunkKey = [
    scale.index,
    sampleMeters,
    chunkSamples,
    chunkX,
    chunkY
  ].join(":");
  var sampleKey = localSampleX + ":" + localSampleY;

  return {
    zoomLevel: scale.index,
    scaleName: scale.name,
    sampleMeters: sampleMeters,
    chunkSamples: chunkSamples,
    sampleEast: sampleEast,
    sampleNorth: sampleNorth,
    chunkX: chunkX,
    chunkY: chunkY,
    localSampleX: localSampleX,
    localSampleY: localSampleY,
    chunkKey: chunkKey,
    sampleKey: sampleKey
  };
}

function getPlanetSurfaceChunkKeyForLatLon(latitude, longitude, zoomLevelIndex) {
  return getPlanetSurfaceSampleAddress(latitude, longitude, zoomLevelIndex).chunkKey;
}

function getPlanetSurfaceLatLonFromChunkAddress(address, localSampleX, localSampleY) {
  var sampleEast = address.chunkX * address.chunkSamples + Math.round(Number(localSampleX) || 0);
  var sampleNorth = address.chunkY * address.chunkSamples + Math.round(Number(localSampleY) || 0);
  var eastMeters = (sampleEast + 0.5) * address.sampleMeters;
  var northMeters = (sampleNorth + 0.5) * address.sampleMeters;

  return getLatLonFromSurfaceMeterCoordinate(eastMeters, northMeters);
}

function getPlanetSurfaceChunkSampleAtAddress(address, localSampleX, localSampleY) {
  var latLon = getPlanetSurfaceLatLonFromChunkAddress(address, localSampleX, localSampleY);

  return getPlanetSurfaceChunkSample(latLon.latitude, latLon.longitude, null, address.zoomLevel);
}

function getPlanetSurfaceChunk(address) {
  var chunk = planetSurfaceChunkCache.chunks[address.chunkKey];

  if (chunk) {
    return chunk;
  }

  chunk = {
    key: address.chunkKey,
    zoomLevel: address.zoomLevel,
    sampleMeters: address.sampleMeters,
    chunkSamples: address.chunkSamples,
    chunkX: address.chunkX,
    chunkY: address.chunkY,
    parentLineage: getPlanetSurfaceChunkLineage(address),
    samples: {}
  };

  planetSurfaceChunkCache.chunks[address.chunkKey] = chunk;
  planetSurfaceChunkCache.order.push(address.chunkKey);
  planetSurfaceChunkCache.stats.generatedChunks++;

  while (planetSurfaceChunkCache.order.length > getPlanetSurfaceChunkCacheLimit()) {
    var evictedKey = planetSurfaceChunkCache.order.shift();
    delete planetSurfaceChunkCache.chunks[evictedKey];
    planetSurfaceChunkCache.stats.evictions++;
  }

  return chunk;
}

function getPlanetSurfaceChunkSample(latitude, longitude, tile, zoomLevelIndex) {
  var address = getPlanetSurfaceSampleAddress(latitude, longitude, zoomLevelIndex);
  var chunk = getPlanetSurfaceChunk(address);
  var cachedSample = chunk.samples[address.sampleKey];

  planetSurfaceChunkCache.stats.lastChunkKey = address.chunkKey;
  planetSurfaceChunkCache.stats.lastSampleKey = address.sampleKey;

  if (cachedSample) {
    planetSurfaceChunkCache.stats.hits++;
    return cachedSample;
  }

  var tilePosition = tile
    ? { x: tile.x, y: tile.y }
    : getTileFromLatLon(latitude, longitude);
  var resolvedTile = tile || getPlanetTile(tilePosition.x, tilePosition.y);
  var tileBlend = getPlanetSurfaceTileBlend(latitude, longitude);

  planetSurfaceChunkCache.stats.misses++;
  cachedSample = {
    x: tilePosition.x,
    y: tilePosition.y,
    latitude: latitude,
    longitude: longitude,
    tile: resolvedTile,
    biome: resolvedTile ? resolvedTile.biome : "unknown",
    tileBlend: tileBlend,
    detail: getPlanetSurfaceDetail(latitude, longitude, resolvedTile, address.sampleMeters),
    surfaceChunkKey: address.chunkKey,
    surfaceSampleKey: address.sampleKey,
    surfaceChunkX: address.chunkX,
    surfaceChunkY: address.chunkY,
    surfaceParentLineage: chunk.parentLineage,
    surfaceSampleX: address.sampleEast,
    surfaceSampleY: address.sampleNorth,
    surfaceChunkLocalX: address.localSampleX,
    surfaceChunkLocalY: address.localSampleY,
    surfaceSampleMeters: address.sampleMeters
  };
  chunk.samples[address.sampleKey] = cachedSample;

  return cachedSample;
}

function getSurfaceLayerNoise(meters, patchMeters, salt) {
  var normalizedPatchMeters = Math.max(1, Number(patchMeters) || 1);
  var eastCell = (Number(meters.eastMeters) || 0) / normalizedPatchMeters;
  var northCell = (Number(meters.northMeters) || 0) / normalizedPatchMeters;
  var cellEast = Math.floor(eastCell);
  var cellNorth = Math.floor(northCell);
  var eastAmount = smoothSurfaceNoiseAmount(eastCell - cellEast);
  var northAmount = smoothSurfaceNoiseAmount(northCell - cellNorth);
  var topLeft = getSurfaceCellNoise(cellEast, cellNorth, normalizedPatchMeters, salt);
  var topRight = getSurfaceCellNoise(cellEast + 1, cellNorth, normalizedPatchMeters, salt);
  var bottomLeft = getSurfaceCellNoise(cellEast, cellNorth + 1, normalizedPatchMeters, salt);
  var bottomRight = getSurfaceCellNoise(cellEast + 1, cellNorth + 1, normalizedPatchMeters, salt);
  var top = topLeft + (topRight - topLeft) * eastAmount;
  var bottom = bottomLeft + (bottomRight - bottomLeft) * eastAmount;

  return top + (bottom - top) * northAmount;
}

function smoothSurfaceNoiseAmount(amount) {
  var t = clamp(Number(amount) || 0, 0, 1);

  return t * t * (3 - 2 * t);
}

function getSurfaceNoiseSeed(patchMeters, salt) {
  var seedOffset = typeof hashSeedText === "function" ? hashSeedText(world.seedText || "") % 100000 : 0;

  return Math.round(Number(patchMeters) || 1) + (Number(salt) || 0) * 31 + seedOffset;
}

function getSurfaceCellNoise(cellEast, cellNorth, patchMeters, salt) {
  return getDeterministicUnitNoise(
    Math.round(Number(cellEast) || 0) + (Number(salt) || 0) * 17,
    Math.round(Number(cellNorth) || 0) - (Number(salt) || 0) * 23,
    getSurfaceNoiseSeed(patchMeters, salt)
  );
}

function getSurfacePixelNoise(meters, patchMeters, salt) {
  var normalizedPatchMeters = Math.max(1, Number(patchMeters) || 1);
  var cellEast = Math.floor((Number(meters.eastMeters) || 0) / normalizedPatchMeters);
  var cellNorth = Math.floor((Number(meters.northMeters) || 0) / normalizedPatchMeters);

  return getSurfaceCellNoise(cellEast, cellNorth, normalizedPatchMeters, salt);
}

function getPlanetSurfaceSnowSignal(tile, latitude) {
  var biome = tile && tile.biome ? tile.biome : "unknown";
  var absLatitude = Math.abs(Number(latitude) || 0);
  var elevationValue = tile && Number.isFinite(Number(tile.elevation)) ? Number(tile.elevation) : 0;
  var elevation = clamp((Math.tanh(elevationValue / 2) + 1) / 2, 0, 1);
  var ridge = clamp(tile && Number.isFinite(Number(tile.ridgeStrength)) ? Number(tile.ridgeStrength) : 0, 0, 1);
  var roughness = clamp(tile && Number.isFinite(Number(tile.roughness)) ? Number(tile.roughness) : 0, 0, 1);
  var highlandLift = clamp(tile && Number.isFinite(Number(tile.highlandLift)) ? Number(tile.highlandLift) / 1.4 : 0, 0, 1);
  var polarSnow = clamp((absLatitude - 62) / 24, 0, 1) * clamp((elevation - 0.44) / 0.34 + ridge * 0.20, 0, 1);
  var mountainSnow =
    clamp((elevation - 0.76) / 0.18, 0, 1) *
    clamp(ridge * 0.52 + highlandLift * 0.38 + roughness * 0.10 - 0.26, 0, 1) *
    clamp((absLatitude - 18) / 42, 0, 1);

  if (biome === "ice") {
    return clamp(0.78 + polarSnow * 0.20 + ridge * 0.08, 0, 1);
  }

  if (biome === "ocean") {
    return clamp(polarSnow * 0.18, 0, 0.22);
  }

  return clamp(Math.max(polarSnow, mountainSnow), 0, 0.86);
}

function getPlanetSurfaceRegionalContext(tile) {
  return {
    continentShape: clamp(tile && Number.isFinite(Number(tile.continentShape)) ? Number(tile.continentShape) : 0, 0, 1.15),
    plateInfluence: clamp(tile && Number.isFinite(Number(tile.plateInfluence)) ? Number(tile.plateInfluence) : 0, 0, 1),
    islandArc: clamp(tile && Number.isFinite(Number(tile.islandArc)) ? Number(tile.islandArc) : 0, 0, 1),
    shelfStrength: clamp(tile && Number.isFinite(Number(tile.shelfStrength)) ? Number(tile.shelfStrength) : 0, 0, 1),
    seaLevelDelta: Number.isFinite(Number(tile && tile.seaLevelDelta)) ? Number(tile.seaLevelDelta) : 0,
    highlandLift: clamp(tile && Number.isFinite(Number(tile.highlandLift)) ? Number(tile.highlandLift) : 0, 0, 1.4),
    coastFactor: clamp(tile && Number.isFinite(Number(tile.coastFactor)) ? Number(tile.coastFactor) : 0, 0, 1),
    coastlineNoise: clamp(tile && Number.isFinite(Number(tile.coastlineNoise)) ? Number(tile.coastlineNoise) : 0, 0, 1)
  };
}

function getPlanetGroundLod(latitude, longitude, sampleMetersOverride, tile) {
  var meters = getSurfaceMeterCoordinate(latitude, longitude);
  var sampleMeters = Math.max(
    1,
    Number(sampleMetersOverride) || getPlanetViewScale().metersPerSample
  );
  var regional = getPlanetSurfaceRegionalContext(tile);
  var continentalNoise = getSurfaceLayerNoise(meters, Math.max(1000, sampleMeters * 48), 1);
  var landformNoise = getSurfaceLayerNoise(meters, Math.max(160, sampleMeters * 24), 2);
  var canopyNoise = getSurfaceLayerNoise(meters, Math.max(30, sampleMeters * 10), 3);
  var groundNoise = getSurfaceLayerNoise(meters, Math.max(6, sampleMeters * 3), 4);
  var meter = getSurfaceLayerNoise(meters, Math.max(1, sampleMeters), 5);
  var micro = getSurfacePixelNoise(meters, Math.max(1, sampleMeters), 6);
  var continental = clamp(
    continentalNoise * 0.56 +
      regional.continentShape * 0.24 +
      regional.plateInfluence * 0.12 +
      regional.islandArc * 0.08,
    0,
    1
  );
  var landform = clamp(
    landformNoise * 0.66 +
      regional.highlandLift * 0.14 +
      regional.islandArc * 0.10 +
      regional.shelfStrength * 0.06 +
      Math.max(0, regional.seaLevelDelta) * 0.04,
    0,
    1
  );
  var canopy = clamp(
    canopyNoise * 0.78 +
      regional.continentShape * 0.08 +
      regional.coastFactor * 0.06 +
      regional.coastlineNoise * 0.04 +
      regional.islandArc * 0.04,
    0,
    1
  );
  var ground = clamp(
    groundNoise * 0.76 +
      regional.shelfStrength * 0.08 +
      regional.coastlineNoise * 0.06 +
      regional.islandArc * 0.06 +
      regional.highlandLift * 0.04,
    0,
    1
  );
  var elevation = clamp(
    continental * 0.34 +
      landform * 0.28 +
      canopy * 0.16 +
      ground * 0.14 +
      meter * 0.08,
    0,
    1
  );
  var roughness = clamp(
    Math.abs(landform - ground) * 0.58 +
      Math.abs(ground - meter) * 0.30 +
      Math.abs(meter - micro) * 0.12 +
      regional.islandArc * 0.08 +
      regional.highlandLift * 0.07 +
      regional.coastlineNoise * regional.coastFactor * 0.05 -
      regional.shelfStrength * 0.04,
    0,
    1
  );

  return {
    sampleMeters: sampleMeters,
    northMeters: meters.northMeters,
    eastMeters: meters.eastMeters,
    continental: continental,
    landform: landform,
    canopy: canopy,
    ground: ground,
    meter: meter,
    micro: micro,
    elevation: elevation,
    roughness: roughness,
    regional: regional,
    continentShape: regional.continentShape,
    plateInfluence: regional.plateInfluence,
    islandArc: regional.islandArc,
    shelfStrength: regional.shelfStrength,
    seaLevelDelta: regional.seaLevelDelta,
    highlandLift: regional.highlandLift,
    coastFactor: regional.coastFactor,
    coastlineNoise: regional.coastlineNoise
  };
}

function getLatLonOffsetFromPoint(latitude, longitude, eastKm, northKm) {
  var nextLatitude = clamp(
    (Number(latitude) || 0) + (Number(northKm) || 0) / getLatitudeDistanceKmPerDegree(),
    -90,
    90
  );
  var nextLongitude = normalizeLongitude(
    (Number(longitude) || 0) + (Number(eastKm) || 0) / getLongitudeDistanceKmPerDegree(nextLatitude)
  );

  return {
    latitude: nextLatitude,
    longitude: nextLongitude
  };
}

function getBiomeReliefRangeMeters(biome) {
  switch (biome) {
    case "ocean":
      return 90;
    case "forest":
      return 180;
    case "grassland":
      return 90;
    case "desert":
      return 220;
    case "tundra":
      return 160;
    case "ice":
      return 260;
    default:
      return 120;
  }
}

function getBiomeBaseHeightMeters(biome, tile) {
  var tileElevation = tile && Number.isFinite(Number(tile.elevation))
    ? Math.tanh(Number(tile.elevation) / 2)
    : 0;

  if (biome === "ocean") {
    return -4200 + tileElevation * 900;
  }

  if (biome === "ice") {
    return 1100 + tileElevation * 1400;
  }

  if (biome === "desert") {
    return 420 + tileElevation * 1250;
  }

  if (biome === "tundra") {
    return 650 + tileElevation * 1050;
  }

  return 260 + tileElevation * 950;
}

function getPlanetGroundFeatureReliefDeltaMeters(groundFeature, biome) {
  var type = groundFeature && groundFeature.type ? groundFeature.type : "";
  var influence = groundFeature ? clamp(Number(groundFeature.influence) || 0, 0, 1) : 0;
  var isOcean = biome === "ocean";

  if (!groundFeature || influence <= 0) {
    return {
      heightDeltaMeters: 0,
      roughnessBoost: 0,
      flattenAmount: 0,
      influence: 0,
      type: ""
    };
  }

  if (type === "stream") {
    return {
      heightDeltaMeters: isOcean ? 0 : -clamp(0.75 + influence * 2.35, 0, 3.1),
      roughnessBoost: clamp(influence * 0.08, 0, 0.12),
      flattenAmount: clamp(0.18 + influence * 0.32, 0, 0.56),
      influence: influence,
      type: type
    };
  }

  if (type === "wetland" || type === "meadow" || type === "clearing") {
    return {
      heightDeltaMeters: isOcean ? 0 : -clamp(0.18 + influence * 0.62, 0, 0.9),
      roughnessBoost: 0,
      flattenAmount: clamp(0.28 + influence * 0.38, 0, 0.72),
      influence: influence,
      type: type
    };
  }

  if (type === "swale") {
    return {
      heightDeltaMeters: isOcean ? 0 : -clamp(0.35 + influence * 1.05, 0, 1.55),
      roughnessBoost: clamp(influence * 0.04, 0, 0.08),
      flattenAmount: clamp(0.18 + influence * 0.28, 0, 0.50),
      influence: influence,
      type: type
    };
  }

  if (type === "ridge") {
    return {
      heightDeltaMeters: clamp(1.2 + influence * 4.8, 0, 6.2),
      roughnessBoost: clamp(0.22 + influence * 0.48, 0, 0.74),
      flattenAmount: 0,
      influence: influence,
      type: type
    };
  }

  if (type === "rockfield") {
    return {
      heightDeltaMeters: clamp(0.55 + influence * 2.25, 0, 3.0),
      roughnessBoost: clamp(0.28 + influence * 0.42, 0, 0.76),
      flattenAmount: 0,
      influence: influence,
      type: type
    };
  }

  if (type === "reef" || type === "shoal") {
    return {
      heightDeltaMeters: isOcean
        ? clamp(2.0 + influence * (type === "reef" ? 7.0 : 4.5), 0, type === "reef" ? 9.4 : 6.8)
        : 0,
      roughnessBoost: type === "reef" ? clamp(0.18 + influence * 0.32, 0, 0.54) : clamp(influence * 0.12, 0, 0.18),
      flattenAmount: type === "shoal" ? clamp(0.24 + influence * 0.30, 0, 0.58) : 0,
      influence: influence,
      type: type
    };
  }

  return {
    heightDeltaMeters: 0,
    roughnessBoost: 0,
    flattenAmount: 0,
    influence: influence,
    type: type
  };
}

function getPlanetSurfaceFeatureReliefAdjustment(latitude, longitude, sampleMeters, biome, groundFeature) {
  var normalizedSampleMeters = Math.max(1, Number(sampleMeters) || getPlanetViewScale().metersPerSample);
  var feature = groundFeature || null;
  var delta;

  if (normalizedSampleMeters > 25) {
    return {
      heightDeltaMeters: 0,
      roughnessBoost: 0,
      flattenAmount: 0,
      influence: 0,
      type: "",
      groundFeature: null
    };
  }

  if (!feature) {
    feature = getPlanetSurfaceGroundFeatureInfluence(latitude, longitude, normalizedSampleMeters);
  }

  delta = getPlanetGroundFeatureReliefDeltaMeters(feature, biome);

  return {
    heightDeltaMeters: delta.heightDeltaMeters,
    roughnessBoost: delta.roughnessBoost,
    flattenAmount: delta.flattenAmount,
    influence: delta.influence,
    type: delta.type,
    groundFeature: feature || null
  };
}

function getPlanetSurfaceHeightMeters(latitude, longitude, tile, sampleMeters, featureReliefOverride) {
  var biome = tile ? tile.biome : "unknown";
  var normalizedSampleMeters = Math.max(1, Number(sampleMeters) || getPlanetViewScale().metersPerSample);
  var lod = getPlanetGroundLod(latitude, longitude, normalizedSampleMeters, tile);
  var featureRelief = featureReliefOverride ||
    getPlanetSurfaceFeatureReliefAdjustment(latitude, longitude, normalizedSampleMeters, biome);
  var tileRidge = clamp(tile && Number.isFinite(Number(tile.ridgeStrength)) ? Number(tile.ridgeStrength) : 0, 0, 1);
  var tileRoughness = clamp(tile && Number.isFinite(Number(tile.roughness)) ? Number(tile.roughness) : 0, 0, 1);
  var regional = lod.regional || getPlanetSurfaceRegionalContext(tile);
  var tileHighlandLift = regional.highlandLift;
  var featureRoughnessBoost = clamp(Number(featureRelief.roughnessBoost) || 0, 0, 1);
  var featureFlattenAmount = clamp(Number(featureRelief.flattenAmount) || 0, 0, 1);
  var reliefRangeMeters = getBiomeReliefRangeMeters(biome) *
    (1 + tileRidge * 0.44 + tileRoughness * 0.16 + regional.islandArc * 0.18 + featureRoughnessBoost * 0.22) *
    (1 - featureFlattenAmount * 0.36);
  var landformMeters = (lod.elevation - 0.5) * reliefRangeMeters;
  var roughMeters = (lod.ground - 0.5) * reliefRangeMeters * 0.22;
  var microMeters = (lod.micro - 0.5) * reliefRangeMeters * 0.06;
  var highlandMeters = biome === "ocean" ? 0 : tileHighlandLift * 260;
  var continentMeters = biome === "ocean" ? 0 : regional.continentShape * 70 + regional.plateInfluence * 45;
  var islandArcMeters = biome === "ocean" ? regional.islandArc * 120 : regional.islandArc * 180;
  var shelfMeters = regional.shelfStrength * 1750 + regional.coastFactor * 180;
  var coastFlatten = regional.shelfStrength * featureFlattenAmount * 35;
  var featureHeightDeltaMeters = Number(featureRelief.heightDeltaMeters) || 0;

  if (biome === "ocean") {
    return getBiomeBaseHeightMeters(biome, tile) +
      shelfMeters +
      islandArcMeters +
      (lod.landform - 0.5) * 520 +
      roughMeters * 0.34 +
      microMeters * 0.18 +
      featureHeightDeltaMeters;
  }

  return getBiomeBaseHeightMeters(biome, tile) + highlandMeters + continentMeters + islandArcMeters - coastFlatten + landformMeters + roughMeters + microMeters + featureHeightDeltaMeters;
}

function getPlanetSurfaceRelief(latitude, longitude, tile, sampleMetersOverride) {
  var sampleMeters = Math.max(1, Number(sampleMetersOverride) || getPlanetViewScale().metersPerSample);
  var sampleKm = sampleMeters / 1000;
  var biome = tile ? tile.biome : "unknown";
  var centerFeatureRelief = getPlanetSurfaceFeatureReliefAdjustment(latitude, longitude, sampleMeters, biome);
  var centerHeight = getPlanetSurfaceHeightMeters(latitude, longitude, tile, sampleMeters, centerFeatureRelief);
  var east = getLatLonOffsetFromPoint(latitude, longitude, sampleKm, 0);
  var west = getLatLonOffsetFromPoint(latitude, longitude, -sampleKm, 0);
  var north = getLatLonOffsetFromPoint(latitude, longitude, 0, sampleKm);
  var south = getLatLonOffsetFromPoint(latitude, longitude, 0, -sampleKm);
  var heightEast = getPlanetSurfaceHeightMeters(east.latitude, east.longitude, tile, sampleMeters);
  var heightWest = getPlanetSurfaceHeightMeters(west.latitude, west.longitude, tile, sampleMeters);
  var heightNorth = getPlanetSurfaceHeightMeters(north.latitude, north.longitude, tile, sampleMeters);
  var heightSouth = getPlanetSurfaceHeightMeters(south.latitude, south.longitude, tile, sampleMeters);
  var dzdx = (heightEast - heightWest) / Math.max(1, sampleMeters * 2);
  var dzdy = (heightNorth - heightSouth) / Math.max(1, sampleMeters * 2);
  var normalX = -dzdx;
  var normalY = -dzdy;
  var normalZ = 1;
  var normalLength = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ) || 1;
  var lightX = -0.52;
  var lightY = 0.58;
  var lightZ = 0.63;
  var lightLength = Math.sqrt(lightX * lightX + lightY * lightY + lightZ * lightZ) || 1;
  var dot =
    (normalX / normalLength) * (lightX / lightLength) +
    (normalY / normalLength) * (lightY / lightLength) +
    (normalZ / normalLength) * (lightZ / lightLength);
  var slope = clamp(Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) / (Math.PI / 2), 0, 1);
  var aspect = normalizeLongitude(Math.atan2(dzdy, dzdx) * 180 / Math.PI);
  var hillshade = clamp(0.22 + Math.max(0, dot) * 0.78, 0, 1);

  return {
    heightMeters: centerHeight,
    slope: slope,
    aspect: aspect,
    hillshade: hillshade,
    dzdx: dzdx,
    dzdy: dzdy,
    featureRelief: centerFeatureRelief
  };
}

function getPlanetSurfaceFeatureMarker(biome, lod, relief) {
  var type = "none";
  var intensity = 0;
  var color = "#ffffff";
  var size = 0;
  var markerSeed = clamp(lod.micro * 0.48 + lod.meter * 0.32 + relief.slope * 0.20, 0, 1);

  if (biome === "ocean") {
    intensity = markerSeed > 0.72 || relief.hillshade > 0.82 ? clamp(markerSeed * 0.78 + relief.hillshade * 0.22, 0, 1) : 0;
    type = intensity > 0 ? "wave cap" : "swell";
    color = "#c6f0ff";
    size = 0.32 + intensity * 0.42;
  } else if (biome === "forest") {
    intensity = lod.canopy > 0.52 ? clamp(lod.canopy * 0.68 + lod.micro * 0.20 + relief.hillshade * 0.12, 0, 1) : 0;
    type = intensity > 0.72 ? "canopy crown" : (intensity > 0 ? "leaf gap" : "understory");
    color = intensity > 0.72 ? "#4f8f45" : "#193f20";
    size = 0.26 + intensity * 0.58;
  } else if (biome === "grassland") {
    intensity = markerSeed > 0.58 ? clamp(markerSeed * 0.70 + lod.ground * 0.30, 0, 1) : 0;
    type = intensity > 0.72 ? "grass tuft" : (intensity > 0 ? "field fleck" : "short grass");
    color = "#9fdd5b";
    size = 0.20 + intensity * 0.44;
  } else if (biome === "desert") {
    intensity = lod.ground > 0.62 || relief.slope > 0.18 ? clamp(lod.ground * 0.62 + relief.slope * 0.38, 0, 1) : 0;
    type = intensity > 0.72 ? "rock fleck" : (intensity > 0 ? "sand grain" : "smooth sand");
    color = intensity > 0.72 ? "#a99561" : "#c7a85a";
    size = 0.18 + intensity * 0.50;
  } else if (biome === "tundra") {
    intensity = markerSeed > 0.54 ? clamp(markerSeed * 0.58 + relief.slope * 0.42, 0, 1) : 0;
    type = intensity > 0.70 ? "frost stone" : (intensity > 0 ? "moss clump" : "scrub mat");
    color = intensity > 0.70 ? "#8c9691" : "#6a875f";
    size = 0.22 + intensity * 0.48;
  } else if (biome === "ice") {
    intensity = lod.micro < 0.28 || relief.slope > 0.16 ? clamp((1 - lod.micro) * 0.54 + relief.slope * 0.46, 0, 1) : 0;
    type = intensity > 0.72 ? "ice ridge" : (intensity > 0 ? "snow crust" : "smooth ice");
    color = intensity > 0.72 ? "#e8fbff" : "#b9dce8";
    size = 0.22 + intensity * 0.54;
  }

  return {
    type: type,
    intensity: intensity,
    color: color,
    size: clamp(size, 0, 1)
  };
}

function getPlanetLocalShorelineRefinement(latitude, longitude, tile, lod) {
  var biome = tile && tile.biome ? tile.biome : "unknown";
  var coast = clamp(tile && Number.isFinite(Number(tile.coastFactor)) ? Number(tile.coastFactor) : 0, 0, 1);
  var shallowWater = clamp(Math.max(
    tile && Number.isFinite(Number(tile.shallowWater)) ? Number(tile.shallowWater) : 0,
    tile && Number.isFinite(Number(tile.shelfStrength)) ? Number(tile.shelfStrength) : 0
  ), 0, 1);
  var sampleMeters = Math.max(1, Number(lod && lod.sampleMeters) || 1);
  var meters = {
    eastMeters: Number(lod && lod.eastMeters) || 0,
    northMeters: Number(lod && lod.northMeters) || 0
  };
  var tileBlend = Number.isFinite(Number(longitude)) && typeof getPlanetSurfaceTileBlend === "function"
    ? getPlanetSurfaceTileBlend(latitude, longitude)
    : null;
  var biomeWeights = tileBlend && tileBlend.biomeWeights ? tileBlend.biomeWeights : {};
  var oceanWeight = Number.isFinite(Number(biomeWeights.ocean))
    ? clamp(Number(biomeWeights.ocean), 0, 1)
    : (biome === "ocean" ? 1 : 0);
  var landWeight = clamp(1 - oceanWeight, 0, 1);
  var blendedEdge = clamp(Math.min(oceanWeight, landWeight) * 2, 0, 1);
  var closeScale = clamp((30 - sampleMeters) / 29, 0, 1);
  var shorelineStrength = clamp(Math.max(coast, shallowWater, blendedEdge) * closeScale, 0, 1);
  var shorelineNoise = clamp(
    getSurfaceLayerNoise(meters, Math.max(12, sampleMeters * 10), 71) * 0.68 +
      getSurfacePixelNoise(meters, Math.max(1, sampleMeters * 3), 73) * 0.32,
    0,
    1
  );
  var beachBand = clamp(1 - Math.abs(shorelineNoise - 0.52) * 2.35, 0, 1);
  var waterPocket = clamp(
    shorelineStrength *
      (
        oceanWeight * 0.58 +
        shallowWater * 0.36 +
        coast * 0.18 +
        Math.max(0, shorelineNoise - 0.52) * 0.72
      ),
    0,
    1
  );
  var landPocket = clamp(
    shorelineStrength *
      (
        landWeight * 0.58 +
        coast * 0.14 +
        Math.max(0, 0.52 - shorelineNoise) * 0.72
      ),
    0,
    1
  );

  if (shorelineStrength <= 0) {
    waterPocket = 0;
    landPocket = 0;
    beachBand = 0;
  }

  return {
    strength: shorelineStrength,
    noise: shorelineNoise,
    oceanWeight: oceanWeight,
    landWeight: landWeight,
    beach: clamp(shorelineStrength * beachBand, 0, 1),
    waterPocket: waterPocket,
    landPocket: landPocket
  };
}

function getPlanetLocalSurfaceMaterialSignals(latitude, tile, lod, relief, longitude) {
  var biome = tile && tile.biome ? tile.biome : "unknown";
  var regional = lod && lod.regional ? lod.regional : getPlanetSurfaceRegionalContext(tile);
  var moisture = clamp(tile && Number.isFinite(Number(tile.moisture)) ? Number(tile.moisture) / 2.2 : 0.35, 0, 1);
  var river = clamp(tile && Number.isFinite(Number(tile.riverStrength)) ? Number(tile.riverStrength) : 0, 0, 1);
  var coast = clamp(tile && Number.isFinite(Number(tile.coastFactor)) ? Number(tile.coastFactor) : 0, 0, 1);
  var shallowWater = clamp(Math.max(
    tile && Number.isFinite(Number(tile.shallowWater)) ? Number(tile.shallowWater) : 0,
    tile && Number.isFinite(Number(tile.shelfStrength)) ? Number(tile.shelfStrength) : 0
  ), 0, 1);
  var tileRoughness = clamp(tile && Number.isFinite(Number(tile.roughness)) ? Number(tile.roughness) : 0, 0, 1);
  var ridge = clamp(tile && Number.isFinite(Number(tile.ridgeStrength)) ? Number(tile.ridgeStrength) : 0, 0, 1);
  var snow = getPlanetSurfaceSnowSignal(tile, latitude);
  var surfaceRoughness = clamp(
    lod.roughness * 0.46 +
      relief.slope * 0.32 +
      tileRoughness * 0.13 +
      regional.islandArc * 0.06 +
      regional.highlandLift * 0.05 -
      regional.shelfStrength * 0.04,
    0,
    1
  );
  var shoreline = getPlanetLocalShorelineRefinement(latitude, longitude, tile, lod);
  var wetness = clamp(
    moisture * 0.44 +
      river * 0.34 +
      coast * 0.16 +
      (1 - lod.ground) * 0.06 +
      regional.shelfStrength * 0.06 +
      shoreline.waterPocket * 0.18 +
      shoreline.beach * 0.04,
    0,
    1
  );
  var canopyDensity = clamp(lod.canopy * 0.50 + moisture * 0.22 + lod.continental * 0.08 + regional.continentShape * 0.06 - relief.slope * 0.18 + (1 - ridge) * 0.08, 0, 1);
  var waterDepth = biome === "ocean"
    ? clamp((-relief.heightMeters - 180) / 4200 - Math.max(shallowWater, shoreline.landPocket, regional.shelfStrength) * 0.38 + (1 - lod.landform) * 0.12, 0, 1)
    : clamp(shoreline.waterPocket * 0.18, 0, 1);
  var chop = biome === "ocean"
    ? clamp(lod.ground * 0.38 + lod.micro * 0.32 + relief.slope * 0.20 + (1 - waterDepth) * 0.10 + shoreline.waterPocket * 0.08, 0, 1)
    : 0;
  var dryness = clamp(1 - moisture + (1 - wetness) * 0.22 + regional.plateInfluence * 0.04 - regional.shelfStrength * 0.05, 0, 1);

  return {
    moisture: moisture,
    wetness: wetness,
    snow: snow,
    canopyDensity: canopyDensity,
    surfaceRoughness: surfaceRoughness,
    waterDepth: waterDepth,
    chop: chop,
    dryness: dryness,
    river: river,
    coast: Math.max(coast, shoreline.strength),
    shallowWater: Math.max(shallowWater, shoreline.waterPocket, shoreline.landPocket * 0.45),
    ridge: ridge,
    continentShape: regional.continentShape,
    plateInfluence: regional.plateInfluence,
    islandArc: regional.islandArc,
    shelfStrength: regional.shelfStrength,
    seaLevelDelta: regional.seaLevelDelta,
    highlandLift: regional.highlandLift,
    coastlineNoise: regional.coastlineNoise,
    shorelineStrength: shoreline.strength,
    shorelineNoise: shoreline.noise,
    shorelineBeach: shoreline.beach,
    shorelineWater: shoreline.waterPocket,
    shorelineLand: shoreline.landPocket
  };
}

function getPlanetLocalSurfaceMaterialClassification(latitude, biome, lod, relief, tile, longitude) {
  var signals = getPlanetLocalSurfaceMaterialSignals(latitude, tile, lod, relief, longitude);
  var surface = "ground";
  var feature = "plain";

  if (biome === "ocean") {
    if (signals.shorelineBeach > 0.42 && signals.shorelineLand > signals.shorelineWater * 0.75) {
      surface = "sand";
      feature = "tidal flat";
    } else if (signals.chop > 0.78 && signals.waterDepth < 0.78) {
      surface = "whitecap";
      feature = "surface chop";
    } else if (signals.waterDepth > 0.66) {
      surface = "deep water";
      feature = "deep channel";
    } else {
      surface = "open water";
      feature = signals.shallowWater > 0.44 || signals.coast > 0.44 ? "shoal water" : "swell";
    }
  } else if (biome === "forest") {
    if (signals.shorelineWater > 0.60) {
      surface = "open water";
      feature = "shore pool";
    } else if (signals.shorelineBeach > 0.44 && signals.snow < 0.34) {
      surface = "sand";
      feature = "shoreline";
    } else if (signals.canopyDensity < 0.30 && signals.wetness > 0.35) {
      surface = "clearing";
      feature = "shadow gap";
    } else if (signals.canopyDensity > 0.66 && signals.surfaceRoughness < 0.62) {
      surface = "dense canopy";
      feature = "tree crown";
    } else {
      surface = "woodland";
      feature = "understory";
    }
  } else if (biome === "grassland") {
    if (signals.shorelineWater > 0.60) {
      surface = "open water";
      feature = "shore pool";
    } else if (signals.shorelineBeach > 0.44 && signals.snow < 0.34) {
      surface = "sand";
      feature = "beach";
    } else if (signals.snow > 0.58) {
      surface = "snow";
      feature = "snow grass";
    } else if (signals.wetness > 0.58 && signals.surfaceRoughness < 0.52) {
      surface = "meadow";
      feature = "swale";
    } else if (signals.surfaceRoughness > 0.52 || signals.dryness > 0.62) {
      surface = "brush";
      feature = "tuft";
    } else {
      surface = "grass";
      feature = "field";
    }
  } else if (biome === "desert") {
    if (signals.shorelineWater > 0.62) {
      surface = "open water";
      feature = "shore pool";
    } else if (signals.shorelineBeach > 0.36) {
      surface = "sand";
      feature = "beach";
    } else if (signals.surfaceRoughness > 0.56 || relief.slope > 0.22 || signals.ridge > 0.58) {
      surface = "rock";
      feature = "ridge";
    } else if (lod.landform > 0.58 && signals.dryness > 0.45) {
      surface = "dune";
      feature = "wind streak";
    } else {
      surface = "sand";
      feature = "grit";
    }
  } else if (biome === "tundra") {
    if (signals.shorelineWater > 0.58) {
      surface = "open water";
      feature = "shore pool";
    } else if (signals.snow > 0.52) {
      surface = "snow";
      feature = "snow crust";
    } else if (signals.surfaceRoughness > 0.50 || relief.slope > 0.20) {
      surface = "stone";
      feature = "frost stone";
    } else if (signals.wetness > 0.48) {
      surface = "moss";
      feature = "moss pocket";
    } else {
      surface = "scrub";
      feature = "low scrub";
    }
  } else if (biome === "ice") {
    if (signals.surfaceRoughness > 0.48 || relief.slope > 0.18) {
      surface = "ridge ice";
      feature = "pressure ridge";
    } else if (signals.snow > 0.84 && lod.micro < 0.52) {
      surface = "snow";
      feature = "powder";
    } else {
      surface = "ice";
      feature = "crust";
    }
  }

  return {
    surface: surface,
    feature: feature,
    signals: signals
  };
}

function applyPlanetGroundFeatureInfluenceToMaterial(material, groundFeature, biome) {
  var result = {
    surface: material.surface,
    feature: material.feature,
    signals: {}
  };
  var type = groundFeature && groundFeature.type ? groundFeature.type : "";
  var influence = groundFeature ? clamp(Number(groundFeature.influence) || 0, 0, 1) : 0;

  Object.keys(material.signals || {}).forEach(function(key) {
    result.signals[key] = material.signals[key];
  });

  if (!groundFeature || influence <= 0) {
    return result;
  }

  result.groundFeature = groundFeature;

  if (type === "stream") {
    result.signals.wetness = Math.max(result.signals.wetness || 0, clamp(0.58 + influence * 0.38, 0, 1));
    result.signals.chop = Math.max(result.signals.chop || 0, influence * 0.42);
    result.surface = influence > 0.58 ? "open water" : (biome === "tundra" ? "moss" : "meadow");
    result.feature = "stream channel";
  } else if (type === "wetland") {
    result.signals.wetness = Math.max(result.signals.wetness || 0, clamp(0.62 + influence * 0.32, 0, 1));
    result.surface = biome === "tundra" ? "moss" : "meadow";
    result.feature = "wetland";
  } else if (type === "meadow" || type === "clearing") {
    result.signals.wetness = Math.max(result.signals.wetness || 0, clamp(0.36 + influence * 0.24, 0, 1));
    result.signals.canopyDensity = Math.min(result.signals.canopyDensity || 0, clamp(0.38 - influence * 0.18, 0, 1));
    result.surface = type === "clearing" ? "clearing" : "meadow";
    result.feature = type;
  } else if (type === "ridge") {
    result.signals.surfaceRoughness = Math.max(result.signals.surfaceRoughness || 0, clamp(0.55 + influence * 0.34, 0, 1));
    result.surface = biome === "ice" ? "ridge ice" : (biome === "tundra" ? "stone" : "rock");
    result.feature = "ridge";
  } else if (type === "swale") {
    result.signals.wetness = Math.max(result.signals.wetness || 0, clamp(0.44 + influence * 0.26, 0, 1));
    result.surface = biome === "forest" ? "clearing" : (biome === "tundra" ? "moss" : "meadow");
    result.feature = "swale";
  } else if (type === "rockfield") {
    result.signals.surfaceRoughness = Math.max(result.signals.surfaceRoughness || 0, clamp(0.60 + influence * 0.30, 0, 1));
    result.surface = biome === "tundra" ? "stone" : "rock";
    result.feature = "rockfield";
  } else if (type === "reef" || type === "shoal") {
    result.signals.waterDepth = Math.min(result.signals.waterDepth || 0.45, clamp(0.34 - influence * 0.24, 0, 1));
    result.signals.shallowWater = Math.max(result.signals.shallowWater || 0, clamp(0.58 + influence * 0.34, 0, 1));
    result.surface = "open water";
    result.feature = type === "reef" ? "reef shelf" : "shoal water";
  }

  return result;
}

function getPlanetSurfaceDetail(latitude, longitude, tile, sampleMetersOverride) {
  var biome = tile ? tile.biome : "unknown";
  var lod = getPlanetGroundLod(latitude, longitude, sampleMetersOverride, tile);
  var relief = getPlanetSurfaceRelief(latitude, longitude, tile, lod.sampleMeters);
  var marker = getPlanetSurfaceFeatureMarker(biome, lod, relief);
  var mixedNoise = clamp(lod.elevation * 0.64 + lod.ground * 0.22 + lod.micro * 0.14, 0, 1);
  var groundFeature = getPlanetSurfaceGroundFeatureInfluence(latitude, longitude, lod.sampleMeters);
  var material = applyPlanetGroundFeatureInfluenceToMaterial(
    getPlanetLocalSurfaceMaterialClassification(latitude, biome, lod, relief, tile, longitude),
    groundFeature,
    biome
  );
  var shade = clamp(
    0.12 + mixedNoise * 0.46 + lod.roughness * 0.16 + relief.hillshade * 0.26,
    0,
    1
  );

  return {
    surface: material.surface,
    feature: material.feature,
    shade: shade,
    elevation: lod.elevation,
    roughness: lod.roughness,
    materialSignals: material.signals,
    groundFeature: material.groundFeature || null,
    heightMeters: relief.heightMeters,
    slope: relief.slope,
    aspect: relief.aspect,
    hillshade: relief.hillshade,
    featureRelief: relief.featureRelief,
    regionalContext: lod.regional,
    continentShape: lod.continentShape,
    plateInfluence: lod.plateInfluence,
    islandArc: lod.islandArc,
    shelfStrength: lod.shelfStrength,
    seaLevelDelta: lod.seaLevelDelta,
    highlandLift: lod.highlandLift,
    marker: marker,
    meterNoise: lod.meter,
    microNoise: lod.micro,
    sampleMeters: lod.sampleMeters
  };
}

function projectPlanetLocalPoint(longitude, latitude) {
  var point = getPlanetLocalCanvasPoint(longitude, latitude);

  if (
    point.x < -CONFIG.TILE_SIZE ||
    point.x > canvas.width + CONFIG.TILE_SIZE ||
    point.y < -CONFIG.TILE_SIZE ||
    point.y > canvas.height + CONFIG.TILE_SIZE
  ) {
    return null;
  }

  return {
    x: point.x,
    y: point.y,
    scale: 1,
    visibility: 1,
    visible: true
  };
}

function getPlanetChunkKeyForTile(x, y, zoomLevelIndex) {
  var tile = getPlanetTile(x, y);
  var scale = getPlanetZoomLevel(
    typeof zoomLevelIndex === "number" ? zoomLevelIndex : getPlanetView().zoomLevel
  );
  var latitude = tile ? tile.latitude : getPlanetLatitudeForTile(getClampedWorldY(y));
  var longitude = tile ? tile.longitude : getPlanetLongitudeForTile(getWrappedWorldX(x));
  var latitudeKmPerDegree = getPlanetPoleToPoleKm() / 180;
  var longitudeKmPerDegree = Math.max(0.001, latitudeKmPerDegree * getPlanetLatitudeScale(latitude));
  var chunkLatitudeDegrees = scale.chunkKm / latitudeKmPerDegree;
  var chunkLongitudeDegrees = scale.chunkKm / longitudeKmPerDegree;
  var chunkY = Math.floor((latitude + 90) / Math.max(0.000001, chunkLatitudeDegrees));
  var chunkX = Math.floor((longitude + 180) / Math.max(0.000001, chunkLongitudeDegrees));

  return scale.index + ":" + chunkX + ":" + chunkY;
}

function getPlanetProjection() {
  var zoomFactor = getPlanetZoomFactor();
  var radius = Math.floor(Math.min(canvas.width, canvas.height) * 0.46 * zoomFactor);
  var view = getPlanetView();

  return {
    centerX: canvas.width / 2,
    centerY: canvas.height / 2,
    radius: radius,
    viewLongitudeDeg: view.longitude,
    viewLatitudeDeg: view.latitude,
    zoomFactor: zoomFactor
  };
}

function wrapPlanetLongitudeDelta(degrees) {
  var delta = Number(degrees) || 0;

  while (delta < -180) {
    delta += 360;
  }

  while (delta > 180) {
    delta -= 360;
  }

  return delta;
}

function getWrappedWorldX(x) {
  var width = Math.max(1, WORLD_WIDTH);
  var wrappedX = Math.round(Number(x) || 0) % width;

  return wrappedX < 0 ? wrappedX + width : wrappedX;
}

function getWrappedWorldCoordinateX(x) {
  var width = Math.max(1, WORLD_WIDTH);
  var wrappedX = (Number(x) || 0) % width;

  return wrappedX < 0 ? wrappedX + width : wrappedX;
}

function getClampedWorldY(y) {
  return clamp(Math.round(Number(y) || 0), 0, WORLD_HEIGHT - 1);
}

function normalizeWorldPosition(entity) {
  entity.x = getWrappedWorldX(entity.x);
  entity.y = getClampedWorldY(entity.y);
  return entity;
}

function getWrappedDeltaX(fromX, toX) {
  var width = Math.max(1, WORLD_WIDTH);
  var delta = getWrappedWorldCoordinateX(toX) - getWrappedWorldCoordinateX(fromX);

  if (delta > width / 2) {
    delta -= width;
  } else if (delta < -width / 2) {
    delta += width;
  }

  return delta;
}

function getTileManhattanDistance(fromX, fromY, toX, toY) {
  return Math.abs(getWrappedDeltaX(fromX, toX)) + Math.abs(getClampedWorldY(toY) - getClampedWorldY(fromY));
}

function getTileGreatCircleDistanceKm(fromX, fromY, toX, toY) {
  var fromLatitude = getPlanetLatitudeForTile(getClampedWorldY(fromY)) * Math.PI / 180;
  var toLatitude = getPlanetLatitudeForTile(getClampedWorldY(toY)) * Math.PI / 180;
  var deltaLatitude = toLatitude - fromLatitude;
  var deltaLongitude = wrapPlanetLongitudeDelta(
    getPlanetLongitudeForTile(getWrappedWorldX(toX)) - getPlanetLongitudeForTile(getWrappedWorldX(fromX))
  ) * Math.PI / 180;
  var haversine =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(fromLatitude) * Math.cos(toLatitude) *
      Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2);

  return 2 * getPlanetRadiusKm() * Math.atan2(Math.sqrt(haversine), Math.sqrt(Math.max(0, 1 - haversine)));
}

function getDirectionXToTile(fromX, toX) {
  var delta = getWrappedDeltaX(fromX, toX);

  if (delta > 0) {
    return 1;
  }

  if (delta < 0) {
    return -1;
  }

  return 0;
}

function getDirectionYToTile(fromY, toY) {
  var delta = getClampedWorldY(toY) - getClampedWorldY(fromY);

  if (delta > 0) {
    return 1;
  }

  if (delta < 0) {
    return -1;
  }

  return 0;
}

function getWrappedBucketIndexes(centerX, radius, bucketSize, worldSize) {
  var normalizedBucketSize = Math.max(1, Math.round(Number(bucketSize) || 1));
  var normalizedWorldSize = Math.max(1, Math.round(Number(worldSize) || 1));
  var bucketCount = Math.ceil(normalizedWorldSize / normalizedBucketSize);
  var normalizedRadius = Math.max(0, Math.round(Number(radius) || 0));
  var minBucket = Math.floor((Math.round(Number(centerX) || 0) - normalizedRadius) / normalizedBucketSize);
  var maxBucket = Math.floor((Math.round(Number(centerX) || 0) + normalizedRadius) / normalizedBucketSize);
  var indexes = [];
  var seen = {};

  if (normalizedRadius >= normalizedWorldSize) {
    minBucket = 0;
    maxBucket = bucketCount - 1;
  }

  for (var bucket = minBucket; bucket <= maxBucket; bucket++) {
    var wrappedBucket = bucket % bucketCount;

    if (wrappedBucket < 0) {
      wrappedBucket += bucketCount;
    }

    if (!seen[wrappedBucket]) {
      seen[wrappedBucket] = true;
      indexes.push(wrappedBucket);
    }
  }

  return indexes;
}

function getClampedBucketIndexes(centerY, radius, bucketSize, worldSize) {
  var normalizedBucketSize = Math.max(1, Math.round(Number(bucketSize) || 1));
  var normalizedWorldSize = Math.max(1, Math.round(Number(worldSize) || 1));
  var normalizedRadius = Math.max(0, Math.round(Number(radius) || 0));
  var minBucket = Math.floor(Math.max(0, Math.round(Number(centerY) || 0) - normalizedRadius) / normalizedBucketSize);
  var maxBucket = Math.floor(Math.min(normalizedWorldSize - 1, Math.round(Number(centerY) || 0) + normalizedRadius) / normalizedBucketSize);
  var indexes = [];

  for (var bucket = minBucket; bucket <= maxBucket; bucket++) {
    indexes.push(bucket);
  }

  return indexes;
}

function projectPlanetPoint(longitudeDeg, latitudeDeg) {
  var projection = getPlanetProjection();
  var latitude = (Number(latitudeDeg) || 0) * Math.PI / 180;
  var centerLatitude = projection.viewLatitudeDeg * Math.PI / 180;
  var longitudeDelta = wrapPlanetLongitudeDelta(
    (Number(longitudeDeg) || 0) - projection.viewLongitudeDeg
  ) * Math.PI / 180;
  var visibility =
    Math.sin(centerLatitude) * Math.sin(latitude) +
    Math.cos(centerLatitude) * Math.cos(latitude) * Math.cos(longitudeDelta);

  if (visibility <= 0) {
    return null;
  }

  return {
    x: projection.centerX + projection.radius * Math.cos(latitude) * Math.sin(longitudeDelta),
    y: projection.centerY - projection.radius * (
      Math.cos(centerLatitude) * Math.sin(latitude) -
      Math.sin(centerLatitude) * Math.cos(latitude) * Math.cos(longitudeDelta)
    ),
    scale: clamp(0.22 + visibility * 0.78, 0.22, 1),
    visibility: visibility,
    visible: true
  };
}

function getPlanetTileProjection(x, y) {
  var tile = getPlanetTile(
    clamp(Math.floor(Number(x) || 0), 0, WORLD_WIDTH - 1),
    clamp(Math.floor(Number(y) || 0), 0, WORLD_HEIGHT - 1)
  );

  if (!tile) {
    return null;
  }

  var projection = projectPlanetPoint(tile.longitude, tile.latitude);

  if (!projection) {
    return null;
  }

  projection.tile = tile;
  return projection;
}

function getPlanetInterpolatedProjection(x, y) {
  if (isPlanetLocalView()) {
    var localTileX = getWrappedWorldCoordinateX(x);
    var localTileY = clamp(Number(y) || 0, 0, WORLD_HEIGHT - 1);
    var localLongitude = ((localTileX + 0.5) / Math.max(1, WORLD_WIDTH)) * 360 - 180;
    var localLatitude = 90 - ((localTileY + 0.5) / Math.max(1, WORLD_HEIGHT)) * 180;

    return projectPlanetLocalPoint(localLongitude, localLatitude);
  }

  var tileX = getWrappedWorldCoordinateX(x);
  var tileY = clamp(Number(y) || 0, 0, WORLD_HEIGHT - 1);
  var longitude = ((tileX + 0.5) / Math.max(1, WORLD_WIDTH)) * 360 - 180;
  var latitude = 90 - ((tileY + 0.5) / Math.max(1, WORLD_HEIGHT)) * 180;

  return projectPlanetPoint(longitude, latitude);
}

function getPlanetTileFromCanvasPoint(canvasX, canvasY) {
  var latLon = getPlanetLatLonFromCanvasPoint(canvasX, canvasY);

  if (!latLon) {
    return null;
  }

  return getTileFromLatLon(latLon.latitude, latLon.longitude);
}

function getPlanetTileAreaKm2(latitude) {
  var latitudeCenter = clamp(Number(latitude) || 0, -90, 90);
  var latitudeStep = 180 / Math.max(1, WORLD_HEIGHT);
  var longitudeStep = (360 / Math.max(1, WORLD_WIDTH)) * Math.PI / 180;
  var northLatitude = clamp(latitudeCenter + latitudeStep / 2, -90, 90) * Math.PI / 180;
  var southLatitude = clamp(latitudeCenter - latitudeStep / 2, -90, 90) * Math.PI / 180;
  var radius = getPlanetRadiusKm();

  return radius * radius * longitudeStep * Math.abs(Math.sin(northLatitude) - Math.sin(southLatitude));
}

function getPlanetTile(x, y) {
  if (!Array.isArray(world.planetTiles)) {
    return null;
  }

  return world.planetTiles[getTileIndex(x, y)] || null;
}

function getPlanetTileBiome(x, y) {
  var tile = getPlanetTile(x, y);
  return tile ? tile.biome : "unknown";
}

function makePlanetTile(x, y, biome, fertilityScore, moisture, elevation) {
  var latitude = getPlanetLatitudeForTile(y);
  return {
    x: x,
    y: y,
    latitude: latitude,
    longitude: getPlanetLongitudeForTile(x),
    areaKm2: getPlanetTileAreaKm2(latitude),
    biome: biome,
    fertilityScore: fertilityScore,
    moisture: moisture,
    elevation: elevation
  };
}

function refreshPlanetSummary() {
  var landTiles = 0;
  var waterTiles = 0;
  var fertileTiles = 0;
  var totalAreaKm2 = 0;
  var landAreaKm2 = 0;
  var waterAreaKm2 = 0;
  var fertileAreaKm2 = 0;

  if (Array.isArray(world.planetTiles)) {
    for (var i = 0; i < world.planetTiles.length; i++) {
      var tile = world.planetTiles[i];

      if (!tile) {
        continue;
      }

      totalAreaKm2 += Math.max(0, Number(tile.areaKm2) || 0);

      if (tile.biome === "ocean") {
        waterTiles++;
        waterAreaKm2 += Math.max(0, Number(tile.areaKm2) || 0);
      } else {
        landTiles++;
        landAreaKm2 += Math.max(0, Number(tile.areaKm2) || 0);
      }

      if (tile.biome === "forest" || tile.biome === "grassland") {
        fertileAreaKm2 += Math.max(0, Number(tile.areaKm2) || 0);
      }
    }
  }

  fertileTiles = Math.max(0, Number(world.fertileTiles) || 0);
  world.planetSummary = {
    name: CONFIG.PLANET_NAME || "Earth",
    radiusKm: getPlanetRadiusKm(),
    circumferenceKm: getPlanetCircumferenceKm(),
    poleToPoleKm: getPlanetPoleToPoleKm(),
    equatorKmPerTile: getPlanetEquatorKmPerTile(),
    meridianKmPerTile: getPlanetMeridianKmPerTile(),
    totalAreaKm2: totalAreaKm2,
    landAreaKm2: landAreaKm2,
    waterAreaKm2: waterAreaKm2,
    fertileAreaKm2: fertileAreaKm2,
    landTiles: landTiles,
    waterTiles: waterTiles,
    fertileTiles: fertileTiles,
    waterTilePercent: world.planetTiles && world.planetTiles.length > 0
      ? (waterTiles / world.planetTiles.length) * 100
      : 0,
    waterPercent: totalAreaKm2 > 0 ? (waterAreaKm2 / totalAreaKm2) * 100 : 0,
    fertileLandPercent: landAreaKm2 > 0 ? (fertileAreaKm2 / landAreaKm2) * 100 : 0,
    fertileTileLandPercent: landTiles > 0 ? (fertileTiles / landTiles) * 100 : 0
  };

  return world.planetSummary;
}
