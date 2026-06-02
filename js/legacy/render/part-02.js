function drawSurfaceMarker(tctx, sample, screenX, screenY) {
  PS.render.surfaceDraw.drawMarker(tctx, sample, screenX, screenY);
}

function drawSurfaceSwatch(tctx, swatch, screenX, screenY) {
  PS.render.surfaceDraw.drawSwatch(tctx, swatch, screenX, screenY);
}

function getPlanetSurfaceSubcellBasePatchSize(sample) {
  return PS.render.surfaceDraw.getSubcellBasePatchSize(sample);
}

function getPlanetSurfaceSubcellBasePatchColor(sample, baseColor, localX, localY) {
  return PS.render.surfaceDraw.getSubcellBasePatchColor(sample, baseColor, localX, localY);
}

function getPlanetSurfaceSubcellBasePatches(sample, baseColor) {
  return PS.render.surfaceDraw.getSubcellBasePatches(sample, baseColor);
}

function drawSurfaceBaseCell(tctx, sample, baseColor, screenX, screenY) {
  PS.render.surfaceDraw.drawBaseCell(tctx, sample, baseColor, screenX, screenY);
}

function drawSurfaceMicrotexture(tctx, sample, baseColor, screenX, screenY) {
  PS.render.surfaceDraw.drawMicrotexture(tctx, sample, baseColor, screenX, screenY);
}



function getPlanetLocalReferenceGridInfo(targetPixels) {
  return PS.render.reference.getLocalGridInfo(targetPixels);
}

function drawPlanetLocalCurvatureOverlay() {
  return PS.render.reference.drawLocalCurvature();
}

function drawPlanetLocalReferenceGrid() {
  return PS.render.reference.drawLocalGrid();
}

function drawPlanetScaleBar() {
  return PS.render.reference.drawScaleBar();
}

function drawPlanetReferenceGrid() {
  return PS.render.reference.draw();
}

window.buildTerrainCache = buildTerrainCache;
window.invalidateTerrainCache = invalidateTerrainCache;

window.drawWorld = function() {
  if (window.PS && PS.render && PS.render.pipeline && typeof PS.render.pipeline.drawWorld === "function") {
    PS.render.pipeline.drawWorld();
    return;
  }

  drawTerrain();
  drawPlanetReferenceGrid();

  if (window.PS && PS.render && PS.render.overlays) {
    PS.render.overlays.drawOrbitalAssets();
    PS.render.overlays.drawPlanetaryBodies();
    PS.render.overlays.drawProbeMissions();
    PS.render.overlays.drawEmpireSectors();
    PS.render.overlays.drawInterstellarFleets();
    PS.render.overlays.drawEmpireLegacy();
    PS.render.overlays.drawStarSystems();
  }

  if (window.PS && PS.render && PS.render.overlays) {
    PS.render.overlays.drawInspectSelection();
    PS.render.overlays.drawScanlines();
  }
};
