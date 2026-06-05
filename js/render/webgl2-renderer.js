PS.render = PS.render || {};

PS.render.WebGL2Renderer = function () {
  PS.render.Renderer.call(this, "webgl2");
  this.frameStartMs = 0;
  this.camera = null;
  this.target = null;
  this.gl = null;
  this.spriteQueue = [];
  this.shadowQueue = [];
  this.particleQueue = [];
  this.lightQueue = [];
  this.frameStartStats = null;
  this.frameStartPresenterStats = null;
};

PS.render.WebGL2Renderer.prototype = Object.create(PS.render.Renderer.prototype);
PS.render.WebGL2Renderer.prototype.constructor = PS.render.WebGL2Renderer;

PS.render.WebGL2Renderer.prototype.ensureContext = function () {
  this.target = null;
  this.gl = PS.render.webglEngine && PS.render.webglEngine.state
    ? PS.render.webglEngine.state.sharedGl
    : null;
  return Boolean(this.gl);
};

PS.render.WebGL2Renderer.prototype.beginFrame = function (camera) {
  var engineStats = PS.render.webglEngine && PS.render.webglEngine.getStats
    ? PS.render.webglEngine.getStats()
    : null;
  var presenterStats = PS.render.webglPresenter && PS.render.webglPresenter.getStats
    ? PS.render.webglPresenter.getStats()
    : null;

  this.camera = camera || (PS.camera && PS.camera.unified ? PS.camera.unified.getState() : null);
  this.frameStartMs = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  this.frameStartStats = engineStats;
  this.frameStartPresenterStats = presenterStats;
  this.spriteQueue.length = 0;
  this.shadowQueue.length = 0;
  this.particleQueue.length = 0;
  this.lightQueue.length = 0;
  this.stats.lastError = PS.render.webglEngine ? "" : "WebGL2 engine unavailable";
  if (PS.render.webglPresenter && typeof PS.render.webglPresenter.beginFrame === "function" && typeof canvas !== "undefined") {
    PS.render.webglPresenter.beginFrame(canvas.width, canvas.height);
  }
  if (PS.render.webglEngine && typeof PS.render.webglEngine.ensureTarget === "function" && typeof canvas !== "undefined") {
    this.target = PS.render.webglEngine.ensureTarget("presenter-frame", canvas.width, canvas.height, { alpha: false });
    this.gl = this.target ? this.target.gl : null;
    if (this.gl) {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
      this.gl.viewport(0, 0, canvas.width, canvas.height);
      this.gl.disable(this.gl.DEPTH_TEST);
      this.gl.clearColor(1 / 255, 3 / 255, 10 / 255, 1);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
  }
  return Boolean(PS.render.webglEngine);
};

PS.render.WebGL2Renderer.prototype.drawTilemap = function (tileBuffer, camera) {
  var buffer = tileBuffer || {};
  var usedWebgl = false;

  if (PS.render.surfaceTileWebgl && Array.isArray(buffer.chunks)) {
    usedWebgl = PS.render.surfaceTileWebgl.drawTerrainAtlasBatch(
      buffer.chunks,
      buffer.alpha,
      buffer.options
    );
  } else if (PS.render.surfaceTileWebgl && buffer.address && Array.isArray(buffer.cellCache)) {
    usedWebgl = PS.render.surfaceTileWebgl.drawTerrainAtlas(
      buffer.address,
      buffer.cellCache,
      buffer.alpha,
      buffer.options
    );
  }

  this.stats.tilemapDraws++;
  this.stats.tilemapWebglDraws = (Number(this.stats.tilemapWebglDraws) || 0) + (usedWebgl ? 1 : 0);
  this.stats.tilemapFallbacks = (Number(this.stats.tilemapFallbacks) || 0) + (usedWebgl ? 0 : 1);
  this.stats.drawCalls += usedWebgl ? Math.max(1, PS.render.surfaceTileWebgl.state.pageDrawCount || 1) : 0;
  this.stats.triangleCount += usedWebgl ? Math.max(2, (PS.render.surfaceTileWebgl.state.tileDrawCount || 1) * 2) : 0;
  this.camera = camera || this.camera;
  return usedWebgl;
};

PS.render.WebGL2Renderer.prototype.drawSprite = function (spriteId, x, y, opts) {
  this.spriteQueue.push({
    spriteId: spriteId,
    x: x,
    y: y,
    opts: opts || {}
  });
  this.stats.spriteDraws++;
  return true;
};

PS.render.WebGL2Renderer.prototype.batchSprites = function (spriteList) {
  var list = Array.isArray(spriteList) ? spriteList : [];

  for (var i = 0; i < list.length; i++) {
    this.drawSprite(list[i].spriteId, list[i].x, list[i].y, list[i].opts);
  }

  return list.length;
};

PS.render.WebGL2Renderer.prototype.drawShadow = function (spriteId, x, y, dir) {
  this.shadowQueue.push({
    spriteId: spriteId,
    x: x,
    y: y,
    direction: dir
  });
  this.stats.shadowDraws++;
  return true;
};

PS.render.WebGL2Renderer.prototype.drawParticle = function (x, y, color, size) {
  this.particleQueue.push({
    x: x,
    y: y,
    color: color,
    size: size
  });
  this.stats.particleDraws++;
  return true;
};

PS.render.WebGL2Renderer.prototype.addLight = function (x, y, radius, color, intensity) {
  this.lightQueue.push({
    x: x,
    y: y,
    radius: radius,
    color: color,
    intensity: intensity
  });
  this.stats.lightCount = this.lightQueue.length;
  return true;
};

PS.render.WebGL2Renderer.prototype.endFrame = function () {
  var now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  var entityState = PS.render.entityWebgl ? PS.render.entityWebgl.state : null;
  var surfaceState = PS.render.surfaceTileWebgl ? PS.render.surfaceTileWebgl.state : null;
  var engineStats = PS.render.webglEngine && PS.render.webglEngine.getStats
    ? PS.render.webglEngine.getStats()
    : null;
  var frameStartStats = this.frameStartStats || {};
  var frameStartPresenterStats = this.frameStartPresenterStats || {};
  var terrainMs = surfaceState ? Number(surfaceState.lastFrameMs) || 0 : 0;
  var entityMs = entityState ? Number(entityState.lastFrameMs) || 0 : 0;
  var rendererGpuFrameMs = Math.max(terrainMs, entityMs);
  var gpuFrameMs = rendererGpuFrameMs;

  this.stats.frameCount++;
  this.stats.batchFlushes++;
  this.stats.pipelineFrameMs = Math.max(0, now - this.frameStartMs);
  this.stats.gpuFrameMs = gpuFrameMs;
  this.stats.rendererGpuFrameMs = rendererGpuFrameMs;
  this.stats.lastFrameMs = rendererGpuFrameMs;
  this.stats.frameBudgetMs = 16;
  this.stats.overBudget = gpuFrameMs > this.stats.frameBudgetMs;
  this.stats.rendererOverBudget = rendererGpuFrameMs > this.stats.frameBudgetMs;
  this.stats.entityDraws = entityState ? entityState.instanceDrawCount : 0;
  this.stats.terrainDraws = surfaceState ? surfaceState.tileDrawCount : 0;
  this.stats.terrainPageDraws = surfaceState ? surfaceState.pageDrawCount : 0;
  this.stats.terrainLastFrameMs = surfaceState ? surfaceState.lastFrameMs : 0;
  this.stats.entityLastFrameMs = entityState ? entityState.lastFrameMs : 0;
  this.stats.webglContextCount = engineStats ? engineStats.contextCount : 0;
  this.stats.webglTargetCount = engineStats ? engineStats.targetCount : 0;
  var presenterStats = PS.render.webglPresenter && PS.render.webglPresenter.getStats
    ? PS.render.webglPresenter.getStats()
    : null;
  this.stats.directPresentsThisFrame = presenterStats
    ? Math.max(0, (Number(presenterStats.directPresentCount) || 0) - (Number(frameStartPresenterStats.directPresentCount) || 0))
    : 0;
  this.stats.webglPresenterActive = presenterStats ? presenterStats.active && presenterStats.hasCanvas : false;
  this.stats.webglPresenterLastFramePresents = presenterStats ? presenterStats.lastFramePresents : 0;
  this.stats.singleVisibleCanvas = presenterStats ? presenterStats.singleVisibleCanvas === true : false;
  this.stats.directSingleCanvas = this.stats.singleVisibleCanvas === true && this.stats.webglTargetCount <= 1;
  this.stats.spriteQueueLength = this.spriteQueue.length;
  this.stats.shadowQueueLength = this.shadowQueue.length;
  this.stats.particleQueueLength = this.particleQueue.length;
  this.stats.lightCount = this.lightQueue.length;
  if (PS.render.webglPresenter && typeof PS.render.webglPresenter.endFrame === "function") {
    PS.render.webglPresenter.endFrame();
  }
  return this.getStats();
};

PS.render.webgl2Renderer = PS.render.webgl2Renderer || new PS.render.WebGL2Renderer();
PS.render.renderer.setActive(PS.render.webgl2Renderer);
