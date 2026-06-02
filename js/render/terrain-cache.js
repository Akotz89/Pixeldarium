PS.render = PS.render || {};
PS.render.terrainCache = PS.render.terrainCache || {};

PS.render.terrainCache.getLocalSignature = function () {
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
};

PS.render.terrainCache.buildGlobe = function (targetCtx) {
  var projection = getPlanetProjection();
  var sampleSize = getPlanetGlobeSampleSize(projection, 1.08);
  var isGlobeTransitionZoom = getPlanetView().zoomLevel > 0 && getPlanetView().zoomLevel < 1;

  PS.render.atmosphere.drawShell(targetCtx);

  if (PS.render.webglGlobe && PS.render.webglGlobe.draw(targetCtx, projection)) {
    PS.render.atmosphere.drawCloudLayer(targetCtx);
    PS.render.atmosphere.drawOverlay(targetCtx);
    return;
  }

  if (world.isCameraInteracting || isGlobeTransitionZoom) {
    drawGlobeTilePreview(targetCtx, projection);
    PS.render.atmosphere.drawOverlay(targetCtx);
    return;
  }

  if (drawGlobeSurfaceRaster(targetCtx, projection)) {
    PS.render.atmosphere.drawCloudLayer(targetCtx);
    PS.render.atmosphere.drawOverlay(targetCtx);
    return;
  }

  for (var y = 0; y < WORLD_HEIGHT; y++) {
    for (var x = 0; x < WORLD_WIDTH; x++) {
      var point = getPlanetTileProjection(x, y);

      if (!point) {
        continue;
      }

      targetCtx.globalAlpha = clamp(0.72 + point.visibility * 0.34, 0.72, 1);
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
  PS.render.atmosphere.drawCloudLayer(targetCtx);
  PS.render.atmosphere.drawOverlay(targetCtx);
};

PS.render.terrainCache.build = function () {
  if (
    !terrainCacheCanvas ||
    terrainCacheCanvas.width !== canvas.width ||
    terrainCacheCanvas.height !== canvas.height
  ) {
    PS.render.surfaceRender.releaseRenderCanvas(terrainCacheCanvas);
    terrainCacheCanvas = PS.render.surfaceRender.canvases.make(canvas.width, canvas.height);
  }

  terrainCache = terrainCacheCanvas;

  if (!terrainCache || typeof terrainCache.getContext !== "function") {
    return;
  }

  var targetCtx = terrainCache.getContext("2d");

  if (isGlobeRenderMode() && isPlanetLocalView()) {
    buildLocalTerrainCache(targetCtx);
  } else if (isGlobeRenderMode()) {
    localTerrainCacheSignature = null;
    PS.render.terrainCache.buildGlobe(targetCtx);
  } else {
    localTerrainCacheSignature = null;
    buildFlatTerrainCache(targetCtx);
  }
};

PS.render.terrainCache.draw = function () {
  if (!terrainCache) {
    PS.render.terrainCache.build();
  }

  ctx.drawImage(terrainCache, 0, 0);

  if (
    isGlobeRenderMode() &&
    isPlanetLocalView() &&
    localSurfaceRenderChunkCache.stats.lastPendingChunks > 0
  ) {
    requestLocalSurfaceRenderIdleWork();
  }
};
