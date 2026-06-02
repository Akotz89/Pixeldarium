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
  return PS.render.surfaceRender.invalidateTerrainCache();
}

function getLocalSurfaceRenderChunkCacheLimit() {
  return PS.render.surfaceRender.getChunkCacheLimit();
}

function getLocalSurfaceRenderChunksPerPass() {
  return PS.render.surfaceRender.getChunksPerPass();
}

function getLocalSurfaceRenderCellsPerPass() {
  return PS.render.surfaceRender.getCellsPerPass();
}

function isLocalSurfaceIdleDetailZoom() {
  return PS.render.surfaceRender.isIdleDetailZoom();
}

function isSimulationRenderBusy() {
  return PS.render.surfaceRender.isSimulationBusy();
}

function getLocalSurfaceRenderFallbackChunksPerPass() {
  return PS.render.surfaceRender.getFallbackChunksPerPass();
}

function resetLocalSurfaceRenderChunkCache() {
  return PS.render.surfaceRender.resetChunkCache();
}

function getLocalSurfaceRenderCacheStats() {
  return PS.render.surfaceRender.getCacheStats();
}

function getLocalSurfacePlaceholderColorCacheLimit() {
  return PS.render.surfaceRender.getPlaceholderColorCacheLimit();
}

function getLocalSurfacePlaceholderPreviewsPerPass() {
  return PS.render.surfaceRender.getPlaceholderPreviewsPerPass();
}

function getLocalTerrainCacheSignature() {
  return PS.render.terrainCache.getLocalSignature();
}

function getLocalSurfaceRenderChunkKey(address) {
  return PS.render.surfaceRender.chunks.getKey(address);
}

function makeLocalSurfaceRenderCanvas(width, height) {
  return PS.render.surfaceRender.chunks.makeCanvas(width, height);
}

function buildLocalSurfaceRenderChunk(address) {
  return PS.render.surfaceRender.chunks.build(address);
}

function makeLocalSurfaceRenderChunkBuilder(address) {
  return PS.render.surfaceRender.chunks.makeBuilder(address);
}

function advanceLocalSurfaceRenderChunkBuilder(builder, cellLimit) {
  return PS.render.surfaceRender.chunks.advanceBuilder(builder, cellLimit);
}

function getLocalSurfaceChunkMeterBounds(address) {
  return PS.render.surfaceRender.chunks.getMeterBounds(address);
}

function getLocalSurfaceChunkPointForMeters(address, eastMeters, northMeters) {
  return PS.render.surfaceRender.chunks.getPointForMeters(address, eastMeters, northMeters);
}

function drawLocalSurfaceGroundFeatureLine(targetCtx, address, feature) {
  return PS.render.surfaceRender.chunks.drawGroundFeatureLine(targetCtx, address, feature);
}

function drawLocalSurfaceGroundFeatureRect(targetCtx, address, feature) {
  return PS.render.surfaceRender.chunks.drawGroundFeatureRect(targetCtx, address, feature);
}

function drawLocalSurfaceGroundFeatures(targetCtx, address) {
  return PS.render.surfaceRender.chunks.drawGroundFeatures(targetCtx, address);
}

function getLocalSurfaceRenderChunk(address, allowGenerate) {
  return PS.render.surfaceRender.getChunk(address, allowGenerate);
}

function getLocalSurfaceFallbackRenderChunk(address, allowGenerate) {
  return PS.render.surfaceRender.placeholders.getFallbackChunk(address, allowGenerate);
}

function getLocalSurfacePlaceholderDraw(address, allowPreview) {
  return PS.render.surfaceRender.placeholders.getDraw(address, allowPreview);
}

function getLocalSurfacePlaceholderColor(address) {
  return PS.render.surfaceRender.placeholders.getColor(address);
}

function getLocalSurfacePlaceholderPreviewSampleCount() {
  return PS.render.surfaceRender.placeholders.getPreviewSampleCount();
}

function getLocalSurfacePlaceholderPreviewKey(address) {
  return PS.render.surfaceRender.placeholders.getPreviewKey(address);
}

function hasLocalSurfacePlaceholderPreview(address) {
  return PS.render.surfaceRender.placeholders.hasPreview(address);
}

function getLocalSurfacePlaceholderPreview(address) {
  return PS.render.surfaceRender.placeholders.getPreview(address);
}

function buildFlatTerrainCache(tctx) {
  return PS.render.raster.buildFlatTerrainCache(tctx);
}

function buildGlobeTileRgbCache() {
  return PS.render.raster.buildGlobeTileRgbCache();
}

function getGlobeSurfaceRasterCanvas(width, height) {
  return PS.render.raster.getGlobeSurfaceCanvas(width, height);
}

function drawGlobeSurfaceRaster(targetCtx, projection) {
  return PS.render.raster.drawGlobeSurface(targetCtx, projection);
}

function drawGlobeTilePreview(targetCtx, projection) {
  return PS.render.raster.drawGlobeTilePreview(targetCtx, projection);
}

function buildGlobeTerrainCache(tctx) {
  return PS.render.terrainCache.buildGlobe(tctx);
}

function buildLocalTerrainCache(tctx) {
  return PS.render.surfaceRender.work.buildLocalTerrainCache(tctx);
}

function advanceLocalSurfaceRenderWork(maxChunksOverride) {
  return PS.render.surfaceRender.work.advance(maxChunksOverride);
}

function drawCompletedLocalSurfaceChunksToTerrainCache(draws) {
  return PS.render.surfaceRender.work.drawCompletedToTerrainCache(draws);
}

function getLocalSurfaceIdleWorkBudgetMs() {
  return PS.render.surfaceRender.work.getIdleBudgetMs();
}

function getLocalSurfaceIdleDeadlineTimeRemaining(deadline) {
  return PS.render.surfaceRender.work.getDeadlineTimeRemaining(deadline);
}

function runLocalSurfaceRenderIdleWork(deadline) {
  return PS.render.surfaceRender.work.runIdle(deadline);
}

function requestLocalSurfaceRenderIdleWork() {
  return PS.render.surfaceRender.work.requestIdle();
}

function buildTerrainCache() {
  return PS.render.terrainCache.build();
}

function drawTerrain() {
  return PS.render.terrainCache.draw();
}
