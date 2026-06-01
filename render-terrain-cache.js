// Terrain cache and progressive surface rendering helpers.
var terrainCache;
var terrainCacheCanvas;
var localTerrainCacheSignature = null;
var localSurfaceRenderWorkScheduled = false;
var globeSurfaceRasterCanvas;
var localSurfaceRenderChunkCache = {
  chunks: {},
  pendingChunks: {},
  placeholderColors: {},
  placeholderColorOrder: [],
  placeholderPreviews: {},
  placeholderPreviewOrder: [],
  order: [],
  stats: {
    hits: 0,
    misses: 0,
    generatedChunks: 0,
    evictions: 0,
    lastVisibleChunks: 0,
    lastVisibleCandidateChunks: 0,
    lastWorkingSetLimit: 0,
    lastCulledChunks: 0,
    lastPendingChunks: 0,
    lastGeneratedThisPass: 0,
    lastFallbackChunks: 0,
    lastFallbackGeneratedThisPass: 0,
    lastFallbackPendingChunks: 0,
    lastPlaceholderChunks: 0,
    lastChunkKey: "-"
  }
};

function invalidateTerrainCache() {
  terrainCache = null;
  localTerrainCacheSignature = null;
}

function getLocalSurfaceRenderChunkCacheLimit() {
  return Math.max(16, Math.round(Number(CONFIG.PLANET_SURFACE_RENDER_CHUNK_CACHE_LIMIT) || 256));
}

function getLocalSurfaceRenderChunksPerPass() {
  var busyChunks = Math.max(1, Math.round(Number(CONFIG.PLANET_SURFACE_RENDER_CHUNKS_PER_PASS) || 1));
  var idleChunks = Math.max(
    busyChunks,
    Math.round(Number(CONFIG.PLANET_SURFACE_RENDER_IDLE_CHUNKS_PER_PASS) || busyChunks)
  );

  if (world.isCameraInteracting || isSimulationRenderBusy()) {
    return busyChunks;
  }

  return idleChunks;
}

function getLocalSurfaceRenderCellsPerPass() {
  var busyCells = Math.max(1, Math.round(Number(CONFIG.PLANET_SURFACE_RENDER_CELLS_PER_PASS) || 24));
  var idleCells = Math.max(
    busyCells,
    Math.round(Number(CONFIG.PLANET_SURFACE_RENDER_IDLE_CELLS_PER_PASS) || busyCells)
  );

  if (world.isCameraInteracting || isSimulationRenderBusy()) {
    return busyCells;
  }

  if (!isLocalSurfaceIdleDetailZoom()) {
    return busyCells;
  }

  return idleCells;
}

function isLocalSurfaceIdleDetailZoom() {
  var idleMaxZoom = Number(CONFIG.PLANET_SURFACE_RENDER_IDLE_MAX_ZOOM);

  if (!Number.isFinite(idleMaxZoom)) {
    return true;
  }

  return getPlanetView().zoomLevel <= idleMaxZoom;
}

function isSimulationRenderBusy() {
  var population = Array.isArray(world.organisms) ? world.organisms.length : 0;
  var speed = Math.max(1, Math.round(Number(world.speed) || 1));
  var busySimLoad = Math.max(1, Number(CONFIG.PLANET_SURFACE_RENDER_BUSY_SIM_LOAD) || 5000);
  var busyUpdateMs = Math.max(0, Number(CONFIG.PLANET_SURFACE_RENDER_BUSY_UPDATE_MS) || 4);
  var measuredUpdateMs = Math.max(
    Number(world.updateMs) || 0,
    Number(world.maxUpdateMs) || 0
  );
  var measuredFps = Number(world.fps) || 0;

  if (population * speed >= busySimLoad) {
    return true;
  }

  if (busyUpdateMs > 0 && measuredUpdateMs >= busyUpdateMs) {
    return true;
  }

  return measuredFps > 0 && measuredFps < 54;
}

function getLocalSurfaceRenderFallbackChunksPerPass() {
  var configuredLimit = Number(CONFIG.PLANET_SURFACE_RENDER_FALLBACK_CHUNKS_PER_PASS);

  if (!Number.isFinite(configuredLimit)) {
    return 8;
  }

  return Math.max(0, Math.round(configuredLimit));
}

function resetLocalSurfaceRenderChunkCache() {
  localSurfaceRenderChunkCache = {
    chunks: {},
    pendingChunks: {},
    placeholderColors: {},
    placeholderColorOrder: [],
    placeholderPreviews: {},
    placeholderPreviewOrder: [],
    order: [],
    stats: {
      hits: 0,
      misses: 0,
      generatedChunks: 0,
      evictions: 0,
      lastVisibleChunks: 0,
      lastVisibleCandidateChunks: 0,
      lastWorkingSetLimit: 0,
      lastCulledChunks: 0,
      lastPendingChunks: 0,
      lastGeneratedThisPass: 0,
      lastFallbackChunks: 0,
      lastFallbackGeneratedThisPass: 0,
      lastFallbackPendingChunks: 0,
      lastPlaceholderChunks: 0,
      lastChunkKey: "-"
    }
  };
}

function getLocalSurfaceRenderCacheStats() {
  return {
    chunks: localSurfaceRenderChunkCache.order.length,
    hits: localSurfaceRenderChunkCache.stats.hits,
    misses: localSurfaceRenderChunkCache.stats.misses,
    generatedChunks: localSurfaceRenderChunkCache.stats.generatedChunks,
    evictions: localSurfaceRenderChunkCache.stats.evictions,
    lastVisibleChunks: localSurfaceRenderChunkCache.stats.lastVisibleChunks,
    lastVisibleCandidateChunks: localSurfaceRenderChunkCache.stats.lastVisibleCandidateChunks,
    lastWorkingSetLimit: localSurfaceRenderChunkCache.stats.lastWorkingSetLimit,
    lastCulledChunks: localSurfaceRenderChunkCache.stats.lastCulledChunks,
    lastPendingChunks: localSurfaceRenderChunkCache.stats.lastPendingChunks,
    lastGeneratedThisPass: localSurfaceRenderChunkCache.stats.lastGeneratedThisPass,
    lastFallbackChunks: localSurfaceRenderChunkCache.stats.lastFallbackChunks,
    lastFallbackGeneratedThisPass: localSurfaceRenderChunkCache.stats.lastFallbackGeneratedThisPass,
    lastFallbackPendingChunks: localSurfaceRenderChunkCache.stats.lastFallbackPendingChunks,
    lastPlaceholderChunks: localSurfaceRenderChunkCache.stats.lastPlaceholderChunks,
    lastChunkKey: localSurfaceRenderChunkCache.stats.lastChunkKey
  };
}

function getLocalSurfacePlaceholderColorCacheLimit() {
  return Math.max(64, getLocalSurfaceRenderChunkCacheLimit() * 4);
}

function getLocalSurfacePlaceholderPreviewsPerPass() {
  if (world.isCameraInteracting || isSimulationRenderBusy()) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(Number(CONFIG.PLANET_SURFACE_PLACEHOLDER_PREVIEWS_PER_PASS) || 2)
  );
}

function getLocalTerrainCacheSignature() {
  var view = getPlanetView();
  var scale = getPlanetViewScale();

  return [
    canvas.width,
    canvas.height,
    Number(view.zoomLevel).toFixed(4),
    Number(view.latitude).toFixed(6),
    Number(view.longitude).toFixed(6),
    Number(scale.metersPerSample).toFixed(4),
    getPlanetSurfaceChunkSampleCount()
  ].join(":");
}

function getLocalSurfaceRenderChunkKey(address) {
  return address.chunkKey + ":tile" + CONFIG.TILE_SIZE + ":surface";
}

function makeLocalSurfaceRenderCanvas(width, height) {
  if (typeof document !== "undefined" && document.createElement) {
    return document.createElement("canvas");
  }

  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }

  return null;
}

function buildLocalSurfaceRenderChunk(address) {
  var chunkPixels = address.chunkSamples * CONFIG.TILE_SIZE;
  var chunkCanvas = makeLocalSurfaceRenderCanvas(chunkPixels, chunkPixels);

  if (!chunkCanvas || typeof chunkCanvas.getContext !== "function") {
    return null;
  }

  chunkCanvas.width = chunkPixels;
  chunkCanvas.height = chunkPixels;

  var chunkCtx = chunkCanvas.getContext("2d");

  if (!chunkCtx) {
    return null;
  }

  for (var y = 0; y < address.chunkSamples; y++) {
    for (var x = 0; x < address.chunkSamples; x++) {
      var sample = getPlanetSurfaceChunkSampleAtAddress(address, x, y);
      var screenX = x * CONFIG.TILE_SIZE;
      var screenY = (address.chunkSamples - 1 - y) * CONFIG.TILE_SIZE;
      var baseColor = getPlanetSurfaceColor(sample);

      drawSurfaceBaseCell(chunkCtx, sample, baseColor, screenX, screenY);
      drawSurfaceMicrotexture(chunkCtx, sample, baseColor, screenX, screenY);
      drawSurfaceMarker(chunkCtx, sample, screenX, screenY);
    }
  }

  drawLocalSurfaceGroundFeatures(chunkCtx, address);

  return {
    key: getLocalSurfaceRenderChunkKey(address),
    chunkKey: address.chunkKey,
    parentLineage: getPlanetSurfaceChunkLineage(address),
    canvas: chunkCanvas,
    width: chunkPixels,
    height: chunkPixels,
    sampleMeters: address.sampleMeters,
    chunkSamples: address.chunkSamples
  };
}

function makeLocalSurfaceRenderChunkBuilder(address) {
  var chunkPixels = address.chunkSamples * CONFIG.TILE_SIZE;
  var chunkCanvas = makeLocalSurfaceRenderCanvas(chunkPixels, chunkPixels);

  if (!chunkCanvas || typeof chunkCanvas.getContext !== "function") {
    return null;
  }

  chunkCanvas.width = chunkPixels;
  chunkCanvas.height = chunkPixels;

  var chunkCtx = chunkCanvas.getContext("2d");

  if (!chunkCtx) {
    return null;
  }

  return {
    address: address,
    canvas: chunkCanvas,
    ctx: chunkCtx,
    nextCell: 0,
    totalCells: address.chunkSamples * address.chunkSamples,
    chunkPixels: chunkPixels
  };
}

function advanceLocalSurfaceRenderChunkBuilder(builder, cellLimit) {
  var maxCells = Math.max(1, Math.round(Number(cellLimit) || 1));
  var cellsRendered = 0;
  var address = builder.address;

  while (builder.nextCell < builder.totalCells && cellsRendered < maxCells) {
    var x = builder.nextCell % address.chunkSamples;
    var y = Math.floor(builder.nextCell / address.chunkSamples);
    var sample = getPlanetSurfaceChunkSampleAtAddress(address, x, y);
    var screenX = x * CONFIG.TILE_SIZE;
    var screenY = (address.chunkSamples - 1 - y) * CONFIG.TILE_SIZE;
    var baseColor = getPlanetSurfaceColor(sample);

    drawSurfaceBaseCell(builder.ctx, sample, baseColor, screenX, screenY);
    drawSurfaceMicrotexture(builder.ctx, sample, baseColor, screenX, screenY);
    drawSurfaceMarker(builder.ctx, sample, screenX, screenY);

    builder.nextCell++;
    cellsRendered++;
  }

  if (builder.nextCell < builder.totalCells) {
    return null;
  }

  drawLocalSurfaceGroundFeatures(builder.ctx, address);

  return {
    key: getLocalSurfaceRenderChunkKey(address),
    chunkKey: address.chunkKey,
    parentLineage: getPlanetSurfaceChunkLineage(address),
    canvas: builder.canvas,
    width: builder.chunkPixels,
    height: builder.chunkPixels,
    sampleMeters: address.sampleMeters,
    chunkSamples: address.chunkSamples
  };
}

function getLocalSurfaceChunkMeterBounds(address) {
  var minEastMeters = address.sampleEast * address.sampleMeters;
  var minNorthMeters = address.sampleNorth * address.sampleMeters;
  var sizeMeters = address.chunkSamples * address.sampleMeters;

  return {
    minEastMeters: minEastMeters,
    maxEastMeters: minEastMeters + sizeMeters,
    minNorthMeters: minNorthMeters,
    maxNorthMeters: minNorthMeters + sizeMeters,
    sizeMeters: sizeMeters
  };
}

function getLocalSurfaceChunkPointForMeters(address, eastMeters, northMeters) {
  var bounds = getLocalSurfaceChunkMeterBounds(address);
  var x = ((Number(eastMeters) || 0) - bounds.minEastMeters) / address.sampleMeters * CONFIG.TILE_SIZE;
  var y = (bounds.maxNorthMeters - (Number(northMeters) || 0)) / address.sampleMeters * CONFIG.TILE_SIZE;

  return {
    x: x,
    y: y
  };
}

function drawLocalSurfaceGroundFeatureLine(targetCtx, address, feature) {
  var start = getLocalSurfaceChunkPointForMeters(address, feature.east1, feature.north1);
  var end = getLocalSurfaceChunkPointForMeters(address, feature.east2, feature.north2);
  var dx = end.x - start.x;
  var dy = end.y - start.y;
  var lengthPixels = Math.sqrt(dx * dx + dy * dy) || 1;
  var normalX = -dy / lengthPixels;
  var normalY = dx / lengthPixels;
  var bends = Array.isArray(feature.bends) ? feature.bends : [];

  targetCtx.save();
  targetCtx.globalAlpha = clamp(Number(feature.alpha) || 0.18, 0, 0.72);
  targetCtx.strokeStyle = feature.color || "#d9e7ff";
  targetCtx.lineWidth = clamp(
    (Number(feature.widthMeters) || 1) / address.sampleMeters * CONFIG.TILE_SIZE,
    1,
    9
  );
  targetCtx.lineCap = "round";
  targetCtx.lineJoin = "round";
  targetCtx.beginPath();
  targetCtx.moveTo(start.x, start.y);

  for (var i = 0; i < bends.length; i++) {
    var bend = bends[i];
    var t = clamp(Number(bend.t) || 0, 0, 1);
    var offsetPixels = (Number(bend.offsetMeters) || 0) / Math.max(0.1, address.sampleMeters) * CONFIG.TILE_SIZE;

    targetCtx.lineTo(
      start.x + dx * t + normalX * offsetPixels,
      start.y + dy * t + normalY * offsetPixels
    );
  }

  targetCtx.lineTo(end.x, end.y);
  targetCtx.stroke();
  targetCtx.restore();
}

function drawLocalSurfaceGroundFeatureRect(targetCtx, address, feature) {
  var center = getLocalSurfaceChunkPointForMeters(address, feature.east, feature.north);
  var width = Math.max(1, (Number(feature.widthMeters) || 1) / address.sampleMeters * CONFIG.TILE_SIZE);
  var height = Math.max(1, (Number(feature.heightMeters) || 1) / address.sampleMeters * CONFIG.TILE_SIZE);
  var patchPoints = Array.isArray(feature.patchPoints) ? feature.patchPoints : [];

  targetCtx.save();
  targetCtx.translate(center.x, center.y);
  targetCtx.rotate(Number(feature.rotation) || 0);
  targetCtx.globalAlpha = clamp(Number(feature.alpha) || 0.18, 0, 0.72);
  targetCtx.fillStyle = feature.color || "#d9e7ff";

  if (patchPoints.length >= 3) {
    targetCtx.beginPath();

    for (var i = 0; i < patchPoints.length; i++) {
      var patchPoint = patchPoints[i];
      var pointX = (Number(patchPoint.x) || 0) / Math.max(0.1, address.sampleMeters) * CONFIG.TILE_SIZE;
      var pointY = (Number(patchPoint.y) || 0) / Math.max(0.1, address.sampleMeters) * CONFIG.TILE_SIZE;

      if (i === 0) {
        targetCtx.moveTo(pointX, pointY);
      } else {
        targetCtx.lineTo(pointX, pointY);
      }
    }

    targetCtx.closePath();
    targetCtx.fill();
  } else {
    targetCtx.fillRect(-width / 2, -height / 2, width, height);
  }

  if (feature.type === "rockfield") {
    targetCtx.globalAlpha = clamp((Number(feature.alpha) || 0.18) + 0.04, 0, 0.44);
    targetCtx.strokeStyle = "rgba(230, 218, 188, 0.26)";
    targetCtx.lineWidth = 1;

    if (patchPoints.length >= 3) {
      targetCtx.stroke();
    } else {
      targetCtx.strokeRect(-width / 2, -height / 2, width, height);
    }
  }

  targetCtx.restore();
}

function drawLocalSurfaceGroundFeatures(targetCtx, address) {
  if (address.sampleMeters > 25 || typeof getPlanetGroundFeaturesForMeterBounds !== "function") {
    return;
  }

  var bounds = getLocalSurfaceChunkMeterBounds(address);
  var features = getPlanetGroundFeaturesForMeterBounds(
    bounds.minEastMeters,
    bounds.maxEastMeters,
    bounds.minNorthMeters,
    bounds.maxNorthMeters
  );

  for (var i = 0; i < features.length; i++) {
    var feature = features[i];

    if (feature.shape === "line") {
      drawLocalSurfaceGroundFeatureLine(targetCtx, address, feature);
    } else if (feature.shape === "rect") {
      drawLocalSurfaceGroundFeatureRect(targetCtx, address, feature);
    }
  }
}

function getLocalSurfaceRenderChunk(address, allowGenerate) {
  var renderKey = getLocalSurfaceRenderChunkKey(address);
  var cachedChunk = localSurfaceRenderChunkCache.chunks[renderKey];

  localSurfaceRenderChunkCache.stats.lastChunkKey = renderKey;

  if (cachedChunk) {
    localSurfaceRenderChunkCache.stats.hits++;
    return cachedChunk;
  }

  if (allowGenerate === false) {
    return null;
  }

  var pendingBuilder = localSurfaceRenderChunkCache.pendingChunks[renderKey];

  if (!pendingBuilder) {
    pendingBuilder = makeLocalSurfaceRenderChunkBuilder(address);

    if (!pendingBuilder) {
      return null;
    }

    localSurfaceRenderChunkCache.pendingChunks[renderKey] = pendingBuilder;
  }

  var renderChunk = advanceLocalSurfaceRenderChunkBuilder(
    pendingBuilder,
    getLocalSurfaceRenderCellsPerPass()
  );

  if (!renderChunk) {
    return null;
  }

  delete localSurfaceRenderChunkCache.pendingChunks[renderKey];
  localSurfaceRenderChunkCache.stats.misses++;
  localSurfaceRenderChunkCache.stats.generatedChunks++;
  localSurfaceRenderChunkCache.chunks[renderKey] = renderChunk;
  localSurfaceRenderChunkCache.order.push(renderKey);

  while (localSurfaceRenderChunkCache.order.length > getLocalSurfaceRenderChunkCacheLimit()) {
    var evictedKey = localSurfaceRenderChunkCache.order.shift();
    delete localSurfaceRenderChunkCache.chunks[evictedKey];
    localSurfaceRenderChunkCache.stats.evictions++;
  }

  return renderChunk;
}

function getLocalSurfaceFallbackRenderChunk(address, allowGenerate) {
  var lineage = getPlanetSurfaceChunkLineage(address);

  for (var i = 0; i < lineage.length; i++) {
    var parent = lineage[i];
    var parentAddress = makePlanetSurfaceChunkAddress(parent.zoomLevel, parent.chunkX, parent.chunkY);
    var renderKey = getLocalSurfaceRenderChunkKey(parentAddress);
    var isCached = Boolean(localSurfaceRenderChunkCache.chunks[renderKey]);

    if (!isCached && !allowGenerate) {
      continue;
    }

    var renderChunk = getLocalSurfaceRenderChunk(parentAddress, isCached || allowGenerate);

    if (renderChunk) {
      return {
        renderChunk: renderChunk,
        address: parentAddress,
        generated: !isCached
      };
    }

    if (allowGenerate) {
      break;
    }
  }

  return null;
}

function getLocalSurfacePlaceholderDraw(address, allowPreview) {
  if (!address) {
    return null;
  }

  var rect = getPlanetSurfaceChunkScreenRect(address);
  var color = getLocalSurfacePlaceholderColor(address);
  var previewCanvas = !allowPreview
    ? null
    : getLocalSurfacePlaceholderPreview(address);

  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    color: color,
    canvas: previewCanvas,
    sampleMeters: address.sampleMeters,
    chunkKey: address.chunkKey
  };
}

function getLocalSurfacePlaceholderColor(address) {
  var placeholderKey = address.chunkKey + ":placeholder";
  var cachedColor = localSurfaceRenderChunkCache.placeholderColors[placeholderKey];

  if (cachedColor) {
    return cachedColor;
  }

  var center = getPlanetSurfaceChunkCenterLatLon(address);
  var rgb = getPlanetImageryRgbAtLatLon(center.latitude, center.longitude);
  var color = getHexFromRgb(rgb.red, rgb.green, rgb.blue);

  localSurfaceRenderChunkCache.placeholderColors[placeholderKey] = color;
  localSurfaceRenderChunkCache.placeholderColorOrder.push(placeholderKey);

  while (
    localSurfaceRenderChunkCache.placeholderColorOrder.length >
    getLocalSurfacePlaceholderColorCacheLimit()
  ) {
    var evictedKey = localSurfaceRenderChunkCache.placeholderColorOrder.shift();
    delete localSurfaceRenderChunkCache.placeholderColors[evictedKey];
  }

  return color;
}

function getLocalSurfacePlaceholderPreviewSampleCount() {
  return clamp(
    Math.round(Number(CONFIG.PLANET_SURFACE_PLACEHOLDER_PREVIEW_SAMPLES) || 2),
    1,
    getPlanetSurfaceChunkSampleCount()
  );
}

function getLocalSurfacePlaceholderPreviewKey(address) {
  return address.chunkKey + ":preview:" + getLocalSurfacePlaceholderPreviewSampleCount();
}

function hasLocalSurfacePlaceholderPreview(address) {
  return Boolean(localSurfaceRenderChunkCache.placeholderPreviews[getLocalSurfacePlaceholderPreviewKey(address)]);
}

function getLocalSurfacePlaceholderPreview(address) {
  if (typeof document === "undefined" || typeof document.createElement !== "function") {
    return null;
  }

  var previewSamples = getLocalSurfacePlaceholderPreviewSampleCount();

  if (previewSamples <= 1) {
    return null;
  }

  var previewKey = getLocalSurfacePlaceholderPreviewKey(address);
  var cachedPreview = localSurfaceRenderChunkCache.placeholderPreviews[previewKey];

  if (cachedPreview) {
    return cachedPreview;
  }

  var previewCanvas = document.createElement("canvas");
  previewCanvas.width = previewSamples;
  previewCanvas.height = previewSamples;

  var previewCtx = previewCanvas.getContext("2d");

  if (!previewCtx) {
    return null;
  }

  previewCtx.imageSmoothingEnabled = false;

  for (var y = 0; y < previewSamples; y++) {
    for (var x = 0; x < previewSamples; x++) {
      var localSampleX = ((x + 0.5) / previewSamples) * address.chunkSamples - 0.5;
      var localSampleY = ((previewSamples - y - 0.5) / previewSamples) * address.chunkSamples - 0.5;
      var sample = getPlanetSurfaceChunkSampleAtAddress(address, localSampleX, localSampleY);

      previewCtx.fillStyle = getPlanetSurfaceColor(sample);
      previewCtx.fillRect(x, y, 1, 1);
    }
  }

  localSurfaceRenderChunkCache.placeholderPreviews[previewKey] = previewCanvas;
  localSurfaceRenderChunkCache.placeholderPreviewOrder.push(previewKey);

  while (
    localSurfaceRenderChunkCache.placeholderPreviewOrder.length >
    getLocalSurfacePlaceholderColorCacheLimit()
  ) {
    var evictedKey = localSurfaceRenderChunkCache.placeholderPreviewOrder.shift();
    delete localSurfaceRenderChunkCache.placeholderPreviews[evictedKey];
  }

  return previewCanvas;
}

function drawPlanetShell(targetCtx) {
  var projection = getPlanetProjection();
  var gradient = targetCtx.createRadialGradient(
    projection.centerX - projection.radius * 0.32,
    projection.centerY - projection.radius * 0.34,
    projection.radius * 0.1,
    projection.centerX,
    projection.centerY,
    projection.radius * 1.08
  );

  gradient.addColorStop(0, "#123f34");
  gradient.addColorStop(0.36, "#071a2c");
  gradient.addColorStop(1, "#01040b");

  targetCtx.fillStyle = "#01030a";
  targetCtx.fillRect(0, 0, canvas.width, canvas.height);
  targetCtx.beginPath();
  targetCtx.arc(projection.centerX, projection.centerY, projection.radius, 0, Math.PI * 2);
  targetCtx.fillStyle = gradient;
  targetCtx.fill();
  targetCtx.strokeStyle = "rgba(170, 221, 255, 0.34)";
  targetCtx.lineWidth = 1.5;
  targetCtx.stroke();
  targetCtx.beginPath();
  targetCtx.arc(projection.centerX, projection.centerY, projection.radius + 4, 0, Math.PI * 2);
  targetCtx.strokeStyle = "rgba(95, 199, 255, 0.08)";
  targetCtx.lineWidth = 6;
  targetCtx.stroke();
}

function drawPlanetCloudLayer(targetCtx) {
  var projection = getPlanetProjection();
  var sampleSize = getPlanetGlobeSampleSize(projection, 1.35);
  var stride = 6;
  var cloudSeed = typeof hashSeedText === "function" ? hashSeedText(world.seedText || "") % 997 : 0;
  var configuredCloudAlpha = Number(CONFIG.PLANET_CLOUD_ALPHA);
  var maxCloudAlpha = clamp(Number.isFinite(configuredCloudAlpha) ? configuredCloudAlpha : 0.11, 0, 0.22);

  if (maxCloudAlpha <= 0) {
    return;
  }

  targetCtx.save();
  targetCtx.beginPath();
  targetCtx.arc(projection.centerX, projection.centerY, projection.radius, 0, Math.PI * 2);
  targetCtx.clip();
  targetCtx.globalCompositeOperation = "screen";
  targetCtx.filter = "blur(" + Math.max(2, Math.round(sampleSize * 0.28)) + "px)";

  for (var y = 0; y < WORLD_HEIGHT; y += stride) {
    for (var x = 0; x < WORLD_WIDTH; x += stride) {
      var point = getPlanetTileProjection(x, y);

      if (!point || !point.tile) {
        continue;
      }

      var opacity = getPlanetCloudOpacity(point.tile.latitude, point.tile.longitude, cloudSeed);

      if (opacity <= 0.18) {
        continue;
      }

      var light = getPlanetAtmosphericLight(point);
      var cloudSize = sampleSize * stride * (1.20 + opacity * 0.60);

      targetCtx.globalAlpha = clamp(opacity * (0.035 + light * 0.075), 0, maxCloudAlpha);
      targetCtx.fillStyle = light > 0.52 ? "#f6fbff" : "#b6cce2";
      targetCtx.fillRect(
        point.x - cloudSize / 2,
        point.y - cloudSize / 2,
        cloudSize,
        cloudSize
      );
    }
  }

  targetCtx.restore();
  targetCtx.filter = "none";
  targetCtx.globalAlpha = 1;
  targetCtx.globalCompositeOperation = "source-over";
}

function drawPlanetAtmosphereOverlay(targetCtx) {
  var projection = getPlanetProjection();
  var limbGradient = targetCtx.createRadialGradient(
    projection.centerX - projection.radius * 0.28,
    projection.centerY - projection.radius * 0.32,
    projection.radius * 0.15,
    projection.centerX,
    projection.centerY,
    projection.radius * 1.03
  );
  var shadowGradient = targetCtx.createRadialGradient(
    projection.centerX + projection.radius * 0.36,
    projection.centerY + projection.radius * 0.30,
    projection.radius * 0.12,
    projection.centerX,
    projection.centerY,
    projection.radius * 1.18
  );

  targetCtx.save();
  targetCtx.beginPath();
  targetCtx.arc(projection.centerX, projection.centerY, projection.radius, 0, Math.PI * 2);
  targetCtx.clip();

  limbGradient.addColorStop(0, "rgba(255, 255, 255, 0.010)");
  limbGradient.addColorStop(0.58, "rgba(86, 176, 255, 0.006)");
  limbGradient.addColorStop(0.84, "rgba(54, 148, 255, 0.024)");
  limbGradient.addColorStop(1, "rgba(4, 14, 34, 0.20)");
  targetCtx.globalCompositeOperation = "screen";
  targetCtx.fillStyle = limbGradient;
  targetCtx.fillRect(
    projection.centerX - projection.radius,
    projection.centerY - projection.radius,
    projection.radius * 2,
    projection.radius * 2
  );

  shadowGradient.addColorStop(0, "rgba(0, 0, 0, 0.30)");
  shadowGradient.addColorStop(0.44, "rgba(0, 0, 0, 0.10)");
  shadowGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  targetCtx.globalCompositeOperation = "multiply";
  targetCtx.fillStyle = shadowGradient;
  targetCtx.fillRect(
    projection.centerX - projection.radius,
    projection.centerY - projection.radius,
    projection.radius * 2,
    projection.radius * 2
  );

  targetCtx.restore();

  targetCtx.beginPath();
  targetCtx.arc(projection.centerX, projection.centerY, projection.radius + 1, 0, Math.PI * 2);
  targetCtx.strokeStyle = "rgba(170, 226, 255, 0.24)";
  targetCtx.lineWidth = 1;
  targetCtx.stroke();
  targetCtx.beginPath();
  targetCtx.arc(projection.centerX, projection.centerY, projection.radius + 8, 0, Math.PI * 2);
  targetCtx.strokeStyle = "rgba(107, 227, 255, 0.045)";
  targetCtx.lineWidth = 7;
  targetCtx.stroke();
  targetCtx.globalAlpha = 1;
  targetCtx.globalCompositeOperation = "source-over";
}

function buildFlatTerrainCache(tctx) {
  for (var y = 0; y < WORLD_HEIGHT; y++) {
    for (var x = 0; x < WORLD_WIDTH; x++) {
      tctx.fillStyle = getPlanetTileCompositedColor(getPlanetTile(x, y));

      tctx.fillRect(
        x * CONFIG.TILE_SIZE,
        y * CONFIG.TILE_SIZE,
        CONFIG.TILE_SIZE,
        CONFIG.TILE_SIZE
      );
    }
  }
}

function buildGlobeTileRgbCache() {
  var colors = [];

  for (var y = 0; y < WORLD_HEIGHT; y++) {
    for (var x = 0; x < WORLD_WIDTH; x++) {
      var index = getTileIndex(x, y);
      colors[index] = getRgbFromHex(getPlanetTileCompositedColor(getPlanetTile(x, y)));
    }
  }

  return colors;
}

function getGlobeSurfaceRasterCanvas(width, height) {
  if (
    !globeSurfaceRasterCanvas ||
    globeSurfaceRasterCanvas.width !== width ||
    globeSurfaceRasterCanvas.height !== height
  ) {
    globeSurfaceRasterCanvas = document.createElement("canvas");
    globeSurfaceRasterCanvas.width = width;
    globeSurfaceRasterCanvas.height = height;
  }

  return globeSurfaceRasterCanvas;
}

function drawGlobeSurfaceRaster(targetCtx, projection) {
  if (!targetCtx.createImageData || !targetCtx.putImageData || typeof document === "undefined") {
    return false;
  }

  var minX = Math.max(0, Math.floor(projection.centerX - projection.radius - 1));
  var minY = Math.max(0, Math.floor(projection.centerY - projection.radius - 1));
  var maxX = Math.min(canvas.width, Math.ceil(projection.centerX + projection.radius + 1));
  var maxY = Math.min(canvas.height, Math.ceil(projection.centerY + projection.radius + 1));
  var width = Math.max(1, maxX - minX);
  var height = Math.max(1, maxY - minY);
  var interactiveMaxSize = Number(CONFIG.PLANET_GLOBE_INTERACTIVE_RASTER_MAX_SIZE) || 180;
  var isGlobeTransitionZoom = typeof getPlanetView === "function" &&
    getPlanetView().zoomLevel > 0 &&
    getPlanetView().zoomLevel < 1;
  var rasterMaxSize = world.isCameraInteracting || isGlobeTransitionZoom
    ? interactiveMaxSize
    : Number(CONFIG.PLANET_GLOBE_RASTER_MAX_SIZE) || 720;
  var rasterScale = getPlanetGlobeRasterScale(width, height, rasterMaxSize);
  var rasterWidth = Math.max(1, Math.ceil(width * rasterScale));
  var rasterHeight = Math.max(1, Math.ceil(height * rasterScale));
  var surfaceCanvas = getGlobeSurfaceRasterCanvas(rasterWidth, rasterHeight);
  var surfaceCtx;
  var image;
  var data;
  var tileRgbCache = buildGlobeTileRgbCache();

  surfaceCtx = surfaceCanvas.getContext("2d");
  image = surfaceCtx.createImageData(rasterWidth, rasterHeight);
  data = image.data;

  for (var py = 0; py < rasterHeight; py++) {
    for (var px = 0; px < rasterWidth; px++) {
      var screenX = minX + (px + 0.5) / rasterScale;
      var screenY = minY + (py + 0.5) / rasterScale;
      var latLon = getPlanetLatLonFromProjectedPoint(projection, screenX, screenY);

      if (!latLon) {
        continue;
      }

      var rgb = getPlanetImageryRgbAtLatLon(latLon.latitude, latLon.longitude, tileRgbCache);
      var visibility = clamp(Number(latLon.visibility) || 0, 0, 1);
      var nx = (screenX - projection.centerX) / Math.max(1, projection.radius);
      var ny = (projection.centerY - screenY) / Math.max(1, projection.radius);
      var daylight = clamp(0.50 + visibility * 0.54 - nx * 0.07 + ny * 0.035, 0.20, 1.05);
      var limb = clamp(Math.pow(1 - visibility, 1.7), 0, 1);
      var red = rgb.red * daylight;
      var green = rgb.green * daylight;
      var blue = rgb.blue * daylight;
      var index = (py * rasterWidth + px) * 4;

      red = red + (42 - red) * limb * 0.08;
      green = green + (112 - green) * limb * 0.11;
      blue = blue + (176 - blue) * limb * 0.16;

      data[index] = clamp(red, 0, 255);
      data[index + 1] = clamp(green, 0, 255);
      data[index + 2] = clamp(blue, 0, 255);
      data[index + 3] = 255;
    }
  }

  surfaceCtx.putImageData(image, 0, 0);
  targetCtx.save();
  targetCtx.imageSmoothingEnabled = rasterScale < 0.98;
  targetCtx.drawImage(surfaceCanvas, minX, minY, width, height);
  targetCtx.restore();
  return true;
}

function drawGlobeTilePreview(targetCtx, projection) {
  var stride = 4;
  var sampleSize = getPlanetGlobeSampleSize(projection, 1.24) * stride;

  for (var y = 0; y < WORLD_HEIGHT; y += stride) {
    for (var x = 0; x < WORLD_WIDTH; x += stride) {
      var point = getPlanetTileProjection(x, y);

      if (!point) {
        continue;
      }

      targetCtx.globalAlpha = clamp(0.74 + point.visibility * 0.30, 0.74, 1);
      targetCtx.fillStyle = getPlanetTileCompositedColor(point.tile);
      targetCtx.fillRect(
        point.x - sampleSize / 2,
        point.y - sampleSize / 2,
        sampleSize,
        sampleSize
      );
    }
  }

  targetCtx.globalAlpha = 1;
}

function buildGlobeTerrainCache(tctx) {
  var projection = getPlanetProjection();
  var sampleSize = getPlanetGlobeSampleSize(projection, 1.08);
  var isGlobeTransitionZoom = getPlanetView().zoomLevel > 0 && getPlanetView().zoomLevel < 1;

  drawPlanetShell(tctx);

  if (world.isCameraInteracting || isGlobeTransitionZoom) {
    drawGlobeTilePreview(tctx, projection);
    drawPlanetAtmosphereOverlay(tctx);
    return;
  }

  if (drawGlobeSurfaceRaster(tctx, projection)) {
    drawPlanetCloudLayer(tctx);
    drawPlanetAtmosphereOverlay(tctx);
    return;
  }

  for (var y = 0; y < WORLD_HEIGHT; y++) {
    for (var x = 0; x < WORLD_WIDTH; x++) {
      var point = getPlanetTileProjection(x, y);

      if (!point) {
        continue;
      }

      tctx.globalAlpha = clamp(0.72 + point.visibility * 0.34, 0.72, 1);
      tctx.fillStyle = getPlanetTileCompositedColor(point.tile);
      tctx.fillRect(
        point.x - sampleSize / 2,
        point.y - sampleSize / 2,
        sampleSize,
        sampleSize
      );
    }
  }

  tctx.globalAlpha = 1;
  drawPlanetCloudLayer(tctx);
  drawPlanetAtmosphereOverlay(tctx);
}

function buildLocalTerrainCache(tctx) {
  var visibleChunks = getPlanetVisibleSurfaceChunks(getPlanetSurfaceChunkSampleCount());
  var generatedThisPass = 0;
  var pendingChunks = 0;
  var chunksPerPass = 0;
  var fallbackChunks = 0;
  var fallbackGeneratedThisPass = 0;
  var fallbackPendingChunks = 0;
  var fallbackChunksPerPass = world.isCameraInteracting ? 0 : getLocalSurfaceRenderFallbackChunksPerPass();
  var placeholderPreviewsPerPass = getLocalSurfacePlaceholderPreviewsPerPass();
  var placeholderPreviewsThisPass = 0;
  var fallbackDraws = [];
  var placeholderDraws = [];
  var fineDraws = [];

  tctx.fillStyle = "#01030a";
  tctx.fillRect(0, 0, canvas.width, canvas.height);
  localSurfaceRenderChunkCache.stats.lastVisibleChunks = visibleChunks.length;
  localSurfaceRenderChunkCache.stats.lastVisibleCandidateChunks = Number(visibleChunks.totalCandidateChunks) || visibleChunks.length;
  localSurfaceRenderChunkCache.stats.lastWorkingSetLimit = Number(visibleChunks.workingSetLimit) || getPlanetSurfaceVisibleChunkLimit();
  localSurfaceRenderChunkCache.stats.lastCulledChunks = Number(visibleChunks.culledChunks) || 0;
  localSurfaceRenderChunkCache.stats.lastGeneratedThisPass = 0;
  localSurfaceRenderChunkCache.stats.lastPendingChunks = 0;
  localSurfaceRenderChunkCache.stats.lastFallbackChunks = 0;
  localSurfaceRenderChunkCache.stats.lastFallbackGeneratedThisPass = 0;
  localSurfaceRenderChunkCache.stats.lastFallbackPendingChunks = 0;
  localSurfaceRenderChunkCache.stats.lastPlaceholderChunks = 0;

  visibleChunks.forEach(function(visibleChunk) {
    var renderKey = getLocalSurfaceRenderChunkKey(visibleChunk.address);
    var isCached = Boolean(localSurfaceRenderChunkCache.chunks[renderKey]);
    var canGenerate = isCached || generatedThisPass < chunksPerPass;
    var didScheduleRenderWork = !isCached && canGenerate;
    var renderChunk = getLocalSurfaceRenderChunk(visibleChunk.address, canGenerate);

    if (didScheduleRenderWork) {
      generatedThisPass++;
    }

    if (renderChunk) {
      fineDraws.push({
        canvas: renderChunk.canvas,
        x: visibleChunk.screenX,
        y: visibleChunk.screenY,
        width: visibleChunk.width,
        height: visibleChunk.height
      });
    } else {
      pendingChunks++;
      var fallback = fallbackChunksPerPass > 0
        ? getLocalSurfaceFallbackRenderChunk(
          visibleChunk.address,
          fallbackGeneratedThisPass < fallbackChunksPerPass
        )
        : null;

      if (fallback) {
        var fallbackRect = getPlanetSurfaceChunkScreenRect(fallback.address);
        fallbackDraws.push({
          canvas: fallback.renderChunk.canvas,
          x: fallbackRect.x,
          y: fallbackRect.y,
          width: fallbackRect.width,
          height: fallbackRect.height
        });
        fallbackChunks++;

        if (fallback.generated) {
          fallbackGeneratedThisPass++;
        }
      } else {
        fallbackPendingChunks++;
        var hasPreview = hasLocalSurfacePlaceholderPreview(visibleChunk.address);
        var allowPreview = hasPreview || placeholderPreviewsThisPass < placeholderPreviewsPerPass;
        var placeholder = getLocalSurfacePlaceholderDraw(visibleChunk.address, allowPreview);

        if (placeholder) {
          if (placeholder.canvas && !hasPreview) {
            placeholderPreviewsThisPass++;
          }

          placeholderDraws.push(placeholder);
        }
      }
    }
  });

  placeholderDraws.forEach(function(draw) {
    if (draw.canvas) {
      tctx.save();
      tctx.imageSmoothingEnabled = false;
      tctx.drawImage(draw.canvas, draw.x, draw.y, draw.width, draw.height);
      tctx.restore();
    } else {
      tctx.fillStyle = draw.color;
      tctx.fillRect(draw.x, draw.y, draw.width, draw.height);
    }
  });

  fallbackDraws.forEach(function(draw) {
    tctx.drawImage(draw.canvas, draw.x, draw.y, draw.width, draw.height);
  });

  fineDraws.forEach(function(draw) {
    tctx.drawImage(draw.canvas, draw.x, draw.y, draw.width, draw.height);
  });

  localSurfaceRenderChunkCache.stats.lastGeneratedThisPass = generatedThisPass;
  localSurfaceRenderChunkCache.stats.lastPendingChunks = pendingChunks;
  localSurfaceRenderChunkCache.stats.lastFallbackChunks = fallbackChunks;
  localSurfaceRenderChunkCache.stats.lastFallbackGeneratedThisPass = fallbackGeneratedThisPass;
  localSurfaceRenderChunkCache.stats.lastFallbackPendingChunks = fallbackPendingChunks;
  localSurfaceRenderChunkCache.stats.lastPlaceholderChunks = placeholderDraws.length;

  if (pendingChunks > 0) {
    world.needsRender = true;
  }

  localTerrainCacheSignature = getLocalTerrainCacheSignature();
}

function advanceLocalSurfaceRenderWork(maxChunksOverride) {
  if (!isGlobeRenderMode() || !isPlanetLocalView() || world.isCameraInteracting) {
    return {
      hasPendingChunks: false,
      completedChunks: 0,
      generatedThisPass: 0
    };
  }

  var visibleChunks = getPlanetVisibleSurfaceChunks(getPlanetSurfaceChunkSampleCount());
  var configuredChunksPerPass = Number(maxChunksOverride);
  var chunksPerPass = Number.isFinite(configuredChunksPerPass)
    ? Math.max(1, Math.round(configuredChunksPerPass))
    : getLocalSurfaceRenderChunksPerPass();
  var generatedThisPass = 0;
  var completedChunks = 0;
  var pendingChunks = 0;
  var completedDraws = [];

  for (var i = 0; i < visibleChunks.length; i++) {
    var visibleChunk = visibleChunks[i];
    var renderKey = getLocalSurfaceRenderChunkKey(visibleChunk.address);

    if (localSurfaceRenderChunkCache.chunks[renderKey]) {
      continue;
    }

    pendingChunks++;

    if (generatedThisPass >= chunksPerPass) {
      continue;
    }

    var renderChunk = getLocalSurfaceRenderChunk(visibleChunk.address, true);

    generatedThisPass++;

    if (renderChunk) {
      completedChunks++;
      pendingChunks--;
      completedDraws.push({
        canvas: renderChunk.canvas,
        x: visibleChunk.screenX,
        y: visibleChunk.screenY,
        width: visibleChunk.width,
        height: visibleChunk.height
      });
    }
  }

  if (generatedThisPass > 0) {
    localSurfaceRenderChunkCache.stats.lastGeneratedThisPass = generatedThisPass;
  }

  localSurfaceRenderChunkCache.stats.lastPendingChunks = Math.max(0, pendingChunks);
  localSurfaceRenderChunkCache.stats.lastFallbackPendingChunks = Math.max(0, pendingChunks);
  localSurfaceRenderChunkCache.stats.lastPlaceholderChunks = Math.max(0, pendingChunks);

  return {
    hasPendingChunks: pendingChunks > 0,
    completedChunks: completedChunks,
    generatedThisPass: generatedThisPass,
    completedDraws: completedDraws
  };
}

function drawCompletedLocalSurfaceChunksToTerrainCache(draws) {
  if (
    !terrainCache ||
    !Array.isArray(draws) ||
    draws.length === 0 ||
    localTerrainCacheSignature !== getLocalTerrainCacheSignature()
  ) {
    return false;
  }

  var tctx = terrainCache.getContext("2d");

  if (!tctx) {
    return false;
  }

  draws.forEach(function(draw) {
    tctx.drawImage(draw.canvas, draw.x, draw.y, draw.width, draw.height);
  });

  return true;
}

function getLocalSurfaceIdleWorkBudgetMs() {
  return Math.max(1, Number(CONFIG.PLANET_SURFACE_RENDER_IDLE_WORK_MS) || 5);
}

function getLocalSurfaceIdleDeadlineTimeRemaining(deadline) {
  if (deadline && deadline.didTimeout) {
    return Infinity;
  }

  if (deadline && typeof deadline.timeRemaining === "function") {
    return Math.max(0, Number(deadline.timeRemaining()) || 0);
  }

  return Infinity;
}

function runLocalSurfaceRenderIdleWork(deadline) {
  localSurfaceRenderWorkScheduled = false;

  if (
    !terrainCache ||
    !isGlobeRenderMode() ||
    !isPlanetLocalView() ||
    world.isCameraInteracting ||
    localTerrainCacheSignature !== getLocalTerrainCacheSignature()
  ) {
    return;
  }

  var workStart = performance.now();
  var workBudgetMs = getLocalSurfaceIdleWorkBudgetMs();
  var hasPendingChunks = localSurfaceRenderChunkCache.stats.lastPendingChunks > 0;
  var completedChunks = 0;

  while (
    hasPendingChunks &&
    performance.now() - workStart < workBudgetMs &&
    getLocalSurfaceIdleDeadlineTimeRemaining(deadline) > 1
  ) {
    var renderWork = advanceLocalSurfaceRenderWork(1);

    hasPendingChunks = renderWork.hasPendingChunks;

    if (renderWork.completedChunks > 0) {
      if (!drawCompletedLocalSurfaceChunksToTerrainCache(renderWork.completedDraws)) {
        terrainCache = null;
        world.needsRender = true;
        return;
      }

      completedChunks += renderWork.completedChunks;
    }

    if (renderWork.generatedThisPass <= 0) {
      break;
    }
  }

  if (completedChunks > 0) {
    world.needsRender = true;
  }

  if (hasPendingChunks) {
    requestLocalSurfaceRenderIdleWork();
  }
}

function requestLocalSurfaceRenderIdleWork() {
  if (
    localSurfaceRenderWorkScheduled ||
    typeof window === "undefined" ||
    !isGlobeRenderMode() ||
    !isPlanetLocalView() ||
    world.isCameraInteracting ||
    localSurfaceRenderChunkCache.stats.lastPendingChunks <= 0
  ) {
    return;
  }

  localSurfaceRenderWorkScheduled = true;

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(runLocalSurfaceRenderIdleWork, { timeout: 24 });
    return;
  }

  if (typeof window.setTimeout === "function") {
    window.setTimeout(function() {
      runLocalSurfaceRenderIdleWork(null);
    }, 0);
  } else {
    localSurfaceRenderWorkScheduled = false;
  }
}

function buildTerrainCache() {
  if (
    !terrainCacheCanvas ||
    terrainCacheCanvas.width !== canvas.width ||
    terrainCacheCanvas.height !== canvas.height
  ) {
    terrainCacheCanvas = document.createElement("canvas");
    terrainCacheCanvas.width = canvas.width;
    terrainCacheCanvas.height = canvas.height;
  }

  terrainCache = terrainCacheCanvas;

  var tctx = terrainCache.getContext("2d");

  if (isGlobeRenderMode() && isPlanetLocalView()) {
    buildLocalTerrainCache(tctx);
  } else if (isGlobeRenderMode()) {
    localTerrainCacheSignature = null;
    buildGlobeTerrainCache(tctx);
  } else {
    localTerrainCacheSignature = null;
    buildFlatTerrainCache(tctx);
  }
}

function drawTerrain() {
  if (!terrainCache) {
    buildTerrainCache();
  }

  ctx.drawImage(terrainCache, 0, 0);

  if (
    isGlobeRenderMode() &&
    isPlanetLocalView() &&
    localSurfaceRenderChunkCache.stats.lastPendingChunks > 0
  ) {
    requestLocalSurfaceRenderIdleWork();
  }
}
