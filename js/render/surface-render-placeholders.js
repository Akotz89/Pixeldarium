PS.render = PS.render || {};
PS.render.surfaceRender = PS.render.surfaceRender || {};
PS.render.surfaceRender.placeholders = PS.render.surfaceRender.placeholders || {};

PS.render.surfaceRender.placeholders.getFallbackChunk = function (address, allowGenerate) {
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
};

PS.render.surfaceRender.placeholders.getDraw = function (address, allowPreview) {
  if (!address) {
    return null;
  }

  var rect = getPlanetSurfaceChunkScreenRect(address);
  var color = PS.render.surfaceRender.placeholders.getColor(address);
  var previewCanvas = !allowPreview
    ? null
    : PS.render.surfaceRender.placeholders.getPreview(address);

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
};

PS.render.surfaceRender.placeholders.getColor = function (address) {
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
};

PS.render.surfaceRender.placeholders.getPreviewSampleCount = function () {
  return clamp(
    Math.round(Number(CONFIG.PLANET_SURFACE_PLACEHOLDER_PREVIEW_SAMPLES) || 2),
    1,
    getPlanetSurfaceChunkSampleCount()
  );
};

PS.render.surfaceRender.placeholders.getPreviewKey = function (address) {
  return address.chunkKey + ":preview:" + PS.render.surfaceRender.placeholders.getPreviewSampleCount();
};

PS.render.surfaceRender.placeholders.hasPreview = function (address) {
  return Boolean(
    localSurfaceRenderChunkCache.placeholderPreviews[
      PS.render.surfaceRender.placeholders.getPreviewKey(address)
    ]
  );
};

PS.render.surfaceRender.placeholders.getPreview = function (address) {
  if (typeof document === "undefined" || typeof document.createElement !== "function") {
    return null;
  }

  var previewSamples = PS.render.surfaceRender.placeholders.getPreviewSampleCount();

  if (previewSamples <= 1) {
    return null;
  }

  var previewKey = PS.render.surfaceRender.placeholders.getPreviewKey(address);
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
};
