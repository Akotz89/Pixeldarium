PS.render = PS.render || {};
PS.render.surfaceRender = PS.render.surfaceRender || {};
PS.render.surfaceRender.work = PS.render.surfaceRender.work || {};

PS.render.surfaceRender.work.buildLocalTerrainCache = function (targetCtx) {
  var visibleChunks = PS.render.surfaceStreaming.makeQueue(getPlanetSurfaceChunkSampleCount());
  var generatedThisPass = 0;
  var pendingChunks = 0;
  var chunksPerPass = getLocalSurfaceRenderChunksPerPass();
  var fallbackChunks = 0;
  var fallbackGeneratedThisPass = 0;
  var fallbackPendingChunks = 0;
  var fallbackChunksPerPass = world.isCameraInteracting ? 0 : getLocalSurfaceRenderFallbackChunksPerPass();
  var placeholderPreviewsPerPass = getLocalSurfacePlaceholderPreviewsPerPass();
  var placeholderPreviewsThisPass = 0;
  var fallbackDraws = [];
  var placeholderDraws = [];
  var fineDraws = [];
  var shouldCompositeChunks = false;
  var underlayDrawn = drawLocalSurfaceUnderlay(targetCtx);

  if (!underlayDrawn) {
    targetCtx.fillStyle = "#01030a";
    targetCtx.fillRect(0, 0, canvas.width, canvas.height);
  }
  localSurfaceRenderChunkCache.stats.lastVisibleChunks = Number(visibleChunks.visibleCount) || visibleChunks.length;
  localSurfaceRenderChunkCache.stats.lastVisibleQueueChunks = Number(visibleChunks.visibleCount) || visibleChunks.length;
  localSurfaceRenderChunkCache.stats.lastPrefetchQueueChunks = Number(visibleChunks.prefetchCount) || 0;
  localSurfaceRenderChunkCache.stats.lastVisibleCandidateChunks = Number(visibleChunks.totalCandidateChunks) || visibleChunks.length;
  localSurfaceRenderChunkCache.stats.lastWorkingSetLimit = Number(visibleChunks.workingSetLimit) || getPlanetSurfaceVisibleChunkLimit();
  localSurfaceRenderChunkCache.stats.lastCulledChunks = Number(visibleChunks.culledChunks) || 0;
  localSurfaceRenderChunkCache.stats.lastGeneratedThisPass = 0;
  localSurfaceRenderChunkCache.stats.lastPendingChunks = 0;
  localSurfaceRenderChunkCache.stats.lastFallbackChunks = 0;
  localSurfaceRenderChunkCache.stats.lastFallbackGeneratedThisPass = 0;
  localSurfaceRenderChunkCache.stats.lastFallbackPendingChunks = 0;
  localSurfaceRenderChunkCache.stats.lastPlaceholderChunks = 0;
  localSurfaceRenderChunkCache.stats.lastPreloadAttemptedChunks = 0;
  localSurfaceRenderChunkCache.stats.lastPreloadCacheHits = 0;
  localSurfaceRenderChunkCache.stats.lastPreloadedChunks = 0;

  visibleChunks.forEach(function (visibleChunk) {
    var renderKey = getLocalSurfaceRenderChunkKey(visibleChunk.address);
    var isCached = Boolean(localSurfaceRenderChunkCache.chunks[renderKey]);
    var canGenerate = isCached || generatedThisPass < chunksPerPass;
    var didScheduleRenderWork = !isCached && canGenerate;
    var renderChunk = getLocalSurfaceRenderChunk(visibleChunk.address, canGenerate);

    if (didScheduleRenderWork) {
      generatedThisPass++;
    }

    if (renderChunk && visibleChunk.queueType !== "prefetch") {
      fineDraws.push({
        canvas: renderChunk.canvas,
        x: visibleChunk.screenX,
        y: visibleChunk.screenY,
        width: visibleChunk.width,
        height: visibleChunk.height
      });
    } else {
      if (visibleChunk.queueType === "prefetch") {
        return;
      }

      pendingChunks++;
      var fallback = underlayDrawn || fallbackChunksPerPass <= 0
        ? null
        : getLocalSurfaceFallbackRenderChunk(
          visibleChunk.address,
          fallbackGeneratedThisPass < fallbackChunksPerPass
        );

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
        var hasPreview = !underlayDrawn && hasLocalSurfacePlaceholderPreview(visibleChunk.address);
        var allowPreview = !underlayDrawn && (hasPreview || placeholderPreviewsThisPass < placeholderPreviewsPerPass);
        var placeholder = underlayDrawn ? null : getLocalSurfacePlaceholderDraw(visibleChunk.address, allowPreview);

        if (placeholder) {
          if (placeholder.canvas && !hasPreview) {
            placeholderPreviewsThisPass++;
          }

          placeholderDraws.push(placeholder);
        }
      }
    }
  });

  shouldCompositeChunks = PS.render.surfaceRender.work.shouldCompositeVisibleChunks(
    fineDraws.length,
    fineDraws.length + pendingChunks
  );

  if (shouldCompositeChunks) {
    fineDraws.forEach(function (draw) {
      PS.render.surfaceRender.work.drawChunkOverUnderlay(targetCtx, draw, 0.90);
    });
  }

  PS.render.raster.drawLocalSurfaceReadabilityVeil(targetCtx);

  localSurfaceRenderChunkCache.stats.lastGeneratedThisPass = generatedThisPass;
  localSurfaceRenderChunkCache.stats.lastPendingChunks = pendingChunks;
  localSurfaceRenderChunkCache.stats.lastFallbackChunks = fallbackChunks;
  localSurfaceRenderChunkCache.stats.lastFallbackGeneratedThisPass = fallbackGeneratedThisPass;
  localSurfaceRenderChunkCache.stats.lastFallbackPendingChunks = fallbackPendingChunks;
  localSurfaceRenderChunkCache.stats.lastPlaceholderChunks = placeholderDraws.length;

  if (pendingChunks > 0) {
    world.needsRender = true;
  }

  if (pendingChunks > 0 || PS.render.surfaceRender.work.hasZoomPreloadWork()) {
    PS.render.surfaceRender.work.requestIdle();
  }

  localTerrainCacheSignature = getLocalTerrainCacheSignature();
};

PS.render.surfaceRender.work.hasZoomPreloadWork = function () {
  if (
    !PS.render.lod ||
    world.isCameraInteracting ||
    !isGlobeRenderMode() ||
    !isPlanetLocalView()
  ) {
    return false;
  }

  return PS.render.lod.getPreloadSurfaceLodIndex() !==
    getPlanetSurfaceLodZoomIndex(getPlanetView().zoomLevel);
};

PS.render.surfaceRender.work.preloadZoomDirection = function (maxChunks) {
  if (
    !PS.render.lod ||
    world.isCameraInteracting ||
    !isGlobeRenderMode() ||
    !isPlanetLocalView()
  ) {
    return 0;
  }

  var targetZoom = PS.render.lod.getPreloadSurfaceLodIndex();
  var currentZoom = getPlanetSurfaceLodZoomIndex(getPlanetView().zoomLevel);
  var limit = Math.max(0, Math.round(Number(maxChunks) || 0));

  if (limit <= 0 || targetZoom === currentZoom) {
    return 0;
  }

  var visibleChunks = PS.render.surfaceStreaming.makeQueue(getPlanetSurfaceChunkSampleCount(), limit * 3);
  var attempted = 0;
  var cacheHits = 0;
  var generated = 0;

  for (var i = 0; i < visibleChunks.length && generated < limit; i++) {
    var center = PS.render.surface.getChunkCenterLatLon(visibleChunks[i].address);
    var preloadAddress = getPlanetSurfaceSampleAddress(center.latitude, center.longitude, targetZoom);
    var renderKey = getLocalSurfaceRenderChunkKey(preloadAddress);

    attempted++;

    if (localSurfaceRenderChunkCache.chunks[renderKey]) {
      cacheHits++;
    } else if (getLocalSurfaceRenderChunk(preloadAddress, true)) {
      generated++;
    }
  }

  localSurfaceRenderChunkCache.stats.lastPreloadAttemptedChunks = attempted;
  localSurfaceRenderChunkCache.stats.lastPreloadCacheHits = cacheHits;
  localSurfaceRenderChunkCache.stats.lastPreloadedChunks = generated;
  localSurfaceRenderChunkCache.stats.lastPreloadZoomLevel = targetZoom;
  return generated;
};

PS.render.surfaceRender.work.getChunkCompositeReadiness = function (readyChunks, totalChunks) {
  var total = Math.max(0, Math.round(Number(totalChunks) || 0));

  if (total <= 0) {
    return 1;
  }

  return clamp((Number(readyChunks) || 0) / total, 0, 1);
};

PS.render.surfaceRender.work.shouldCompositeVisibleChunks = function (readyChunks, totalChunks) {
  return PS.render.surfaceRender.work.getChunkCompositeReadiness(readyChunks, totalChunks) >= 1;
};

PS.render.surfaceRender.work.getVisibleChunkReadiness = function () {
  var visibleChunks = PS.render.surfaceStreaming.makeQueue(getPlanetSurfaceChunkSampleCount());
  var readyChunks = 0;
  var totalChunks = 0;

  visibleChunks.forEach(function (visibleChunk) {
    if (visibleChunk.queueType === "prefetch") {
      return;
    }

    totalChunks++;

    if (localSurfaceRenderChunkCache.chunks[getLocalSurfaceRenderChunkKey(visibleChunk.address)]) {
      readyChunks++;
    }
  });

  return {
    readyChunks: readyChunks,
    totalChunks: totalChunks
  };
};

PS.render.surfaceRender.work.drawChunkOverUnderlay = function (targetCtx, draw, alpha) {
  if (!targetCtx || !draw || !draw.canvas) {
    return false;
  }

  var sourceWidth = Math.max(1, Number(draw.canvas.width) || 1);
  var sourceHeight = Math.max(1, Number(draw.canvas.height) || 1);

  targetCtx.save();
  targetCtx.globalAlpha = clamp(Number(alpha) || 1, 0, 1);
  targetCtx.drawImage(
    draw.canvas,
    0,
    0,
    sourceWidth,
    sourceHeight,
    Number(draw.x) || 0,
    Number(draw.y) || 0,
    Math.max(1, Number(draw.width) || sourceWidth),
    Math.max(1, Number(draw.height) || sourceHeight)
  );
  targetCtx.restore();
  return true;
};

PS.render.surfaceRender.work.advance = function (maxChunksOverride) {
  if (!isGlobeRenderMode() || !isPlanetLocalView() || world.isCameraInteracting) {
    return {
      hasPendingChunks: false,
      completedChunks: 0,
      generatedThisPass: 0
    };
  }

  var visibleChunks = PS.render.surfaceStreaming.makeQueue(getPlanetSurfaceChunkSampleCount());
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

    if (visibleChunk.queueType !== "prefetch") {
      pendingChunks++;
    }

    if (generatedThisPass >= chunksPerPass) {
      continue;
    }

    var renderChunk = getLocalSurfaceRenderChunk(visibleChunk.address, true);

    generatedThisPass++;

    if (renderChunk) {
      completedChunks++;

      if (visibleChunk.queueType !== "prefetch") {
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
};

PS.render.surfaceRender.work.drawCompletedToTerrainCache = function (draws) {
  if (
    !terrainCache ||
    !Array.isArray(draws) ||
    draws.length === 0 ||
    localTerrainCacheSignature !== getLocalTerrainCacheSignature()
  ) {
    return false;
  }

  var targetCtx = terrainCache.getContext("2d");

  if (!targetCtx) {
    return false;
  }

  var readiness = PS.render.surfaceRender.work.getVisibleChunkReadiness();

  if (!PS.render.surfaceRender.work.shouldCompositeVisibleChunks(readiness.readyChunks, readiness.totalChunks)) {
    return true;
  }

  draws.forEach(function (draw) {
    PS.render.surfaceRender.work.drawChunkOverUnderlay(targetCtx, draw, 0.90);
  });

  PS.render.raster.drawLocalSurfaceReadabilityVeil(targetCtx);

  return true;
};

PS.render.surfaceRender.work.getIdleBudgetMs = function () {
  return Math.max(1, Number(CONFIG.PLANET_SURFACE_RENDER_IDLE_WORK_MS) || 5);
};

PS.render.surfaceRender.work.getDeadlineTimeRemaining = function (deadline) {
  if (deadline && deadline.didTimeout) {
    return Infinity;
  }

  if (deadline && typeof deadline.timeRemaining === "function") {
    return Math.max(0, Number(deadline.timeRemaining()) || 0);
  }

  return Infinity;
};

PS.render.surfaceRender.work.runIdle = function (deadline) {
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
  var workBudgetMs = Math.min(
    PS.render.surfaceRender.work.getIdleBudgetMs(),
    PS.render.surfaceStreaming.getFrameBudgetMs()
  );
  var hasPendingChunks = localSurfaceRenderChunkCache.stats.lastPendingChunks > 0;
  var completedChunks = 0;
  var idleChunksPerPass = getLocalSurfaceRenderChunksPerPass();

  while (
    hasPendingChunks &&
    performance.now() - workStart < workBudgetMs &&
    PS.render.surfaceRender.work.getDeadlineTimeRemaining(deadline) > 1
  ) {
    var readinessBefore = PS.render.surfaceRender.work.getVisibleChunkReadiness();
    var readyBefore = PS.render.surfaceRender.work.shouldCompositeVisibleChunks(
      readinessBefore.readyChunks,
      readinessBefore.totalChunks
    );
    var renderWork = PS.render.surfaceRender.work.advance(idleChunksPerPass);

    hasPendingChunks = renderWork.hasPendingChunks;

    if (renderWork.completedChunks > 0) {
      var readinessAfter = PS.render.surfaceRender.work.getVisibleChunkReadiness();
      var readyAfter = PS.render.surfaceRender.work.shouldCompositeVisibleChunks(
        readinessAfter.readyChunks,
        readinessAfter.totalChunks
      );

      if (readyAfter && !readyBefore) {
        terrainCache = null;
        world.needsRender = true;
        PS.render.surfaceRender.work.requestIdle();
        return;
      }

      if (!PS.render.surfaceRender.work.drawCompletedToTerrainCache(renderWork.completedDraws)) {
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

  if (
    !hasPendingChunks &&
    PS.render.surfaceRender.work.hasZoomPreloadWork() &&
    performance.now() - workStart < workBudgetMs
  ) {
    PS.render.surfaceRender.work.preloadZoomDirection(1);
  }

  if (hasPendingChunks) {
    PS.render.surfaceRender.work.requestIdle();
  }
};

PS.render.surfaceRender.work.requestIdle = function () {
  if (
    localSurfaceRenderWorkScheduled ||
    typeof window === "undefined" ||
    !isGlobeRenderMode() ||
    !isPlanetLocalView() ||
    world.isCameraInteracting ||
    (
      localSurfaceRenderChunkCache.stats.lastPendingChunks <= 0 &&
      !PS.render.surfaceRender.work.hasZoomPreloadWork()
    )
  ) {
    return;
  }

  localSurfaceRenderWorkScheduled = true;

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(PS.render.surfaceRender.work.runIdle, { timeout: 24 });
    return;
  }

  if (typeof window.setTimeout === "function") {
    window.setTimeout(function () {
      PS.render.surfaceRender.work.runIdle(null);
    }, 0);
  } else {
    localSurfaceRenderWorkScheduled = false;
  }
};
