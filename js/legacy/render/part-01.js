function drawPixel(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(
    x * CONFIG.TILE_SIZE,
    y * CONFIG.TILE_SIZE,
    CONFIG.TILE_SIZE,
    CONFIG.TILE_SIZE
  );
}

function drawEntityAtCanvasPosition(canvasX, canvasY, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(
    canvasX - size / 2,
    canvasY - size / 2,
    size,
    size
  );
}

function getPlanetBiomeColor(biome) {
  return PS.render.terrain.getBiomeColor(biome);
}

function mixChannel(channel, target, amount) {
  return PS.render.terrain.mixChannel(channel, target, amount);
}

function getRgbFromHex(hexColor) {
  return PS.render.terrain.getRgbFromHex(hexColor);
}

function getHexFromRgb(red, green, blue) {
  return PS.render.terrain.getHexFromRgb(red, green, blue);
}

function shadeHexColor(hexColor, shade) {
  return PS.render.terrain.shadeHexColor(hexColor, shade);
}

function blendHexColors(fromHex, toHex, amount) {
  return PS.render.terrain.blendHexColors(fromHex, toHex, amount);
}

function blendHexColorWithRgb(fromHex, toRgb, amount) {
  return PS.render.terrain.blendHexColorWithRgb(fromHex, toRgb, amount);
}

function getPlanetCloudOpacity(latitude, longitude, seedOffset) {
  return PS.render.atmosphere.getCloudOpacity(latitude, longitude, seedOffset);
}

function getPlanetAtmosphericLight(point) {
  return PS.render.atmosphere.getLight(point);
}

function getPlanetGlobeSampleSize(projection, multiplier) {
  return PS.render.globe.getSampleSize(projection, multiplier);
}

function getPlanetGlobeRasterScale(width, height, maxSizeOverride) {
  return PS.render.globe.getRasterScale(width, height, maxSizeOverride);
}

function getPlanetLatLonFromProjectedPoint(projection, canvasX, canvasY) {
  return PS.render.globe.getLatLonFromProjectedPoint(projection, canvasX, canvasY);
}

function mixRgb(from, to, amount) {
  return PS.render.terrain.mixRgb(from, to, amount);
}

function clampRgb(rgb) {
  return PS.render.terrain.clampRgb(rgb);
}

function blendRgbWithHex(rgb, hexColor, amount) {
  return PS.render.terrain.blendRgbWithHex(rgb, hexColor, amount);
}

function shadeRgb(rgb, shade) {
  return PS.render.terrain.shadeRgb(rgb, shade);
}

function getPlanetVisualSeedOffset() {
  return PS.render.terrain.getVisualSeedOffset();
}

function getPlanetMeterNoise(eastMeters, northMeters, patchMeters, seedOffset) {
  return PS.render.terrain.getMeterNoise(eastMeters, northMeters, patchMeters, seedOffset);
}

function smoothPlanetNoiseAmount(amount) {
  return PS.render.terrain.smoothNoiseAmount(amount);
}

function getPlanetSmoothMeterNoise(eastMeters, northMeters, patchMeters, seedOffset) {
  return PS.render.terrain.getSmoothMeterNoise(eastMeters, northMeters, patchMeters, seedOffset);
}

function getPlanetTileRgb(tileX, tileY, tileRgbCache) {
  return PS.render.terrain.getTileRgb(tileX, tileY, tileRgbCache);
}

function getPlanetSurfaceRgbAtLatLon(latitude, longitude, tileRgbCache) {
  return PS.render.terrain.getSurfaceRgbAtLatLon(latitude, longitude, tileRgbCache);
}

function getPlanetTileNumericSignal(tile, key, fallback) {
  return PS.render.terrain.getTileNumericSignal(tile, key, fallback);
}

function getPlanetImageryBlendSignals(latitude, longitude) {
  return PS.render.terrain.getImageryBlendSignals(latitude, longitude);
}

function getPlanetMaterialPixelNoise(latitude, longitude, patchMeters, seedOffset) {
  return PS.render.terrain.getMaterialPixelNoise(latitude, longitude, patchMeters, seedOffset);
}

function getPlanetImageryWarpedLatLon(latitude, longitude) {
  return PS.render.terrain.getImageryWarpedLatLon(latitude, longitude);
}

function getPlanetPixelArtQuantizedRgb(rgb, latitude, longitude) {
  return PS.render.terrain.getPixelArtQuantizedRgb(rgb, latitude, longitude);
}

function applyPlanetMaterialPixelAccents(color, latitude, longitude, tile) {
  return PS.render.surfaceLandform.applyMaterialPixelAccents(color, latitude, longitude, tile);
}

function makePlanetImagerySignalTile(biome, signals, latitude) {
  return PS.render.surfaceLandform.makeImagerySignalTile(biome, signals, latitude);
}

function getPlanetCloudlessSnowVisualAmount(biome, snowSignal, polar, highland, ridge) {
  return PS.render.surfaceLandform.getCloudlessSnowVisualAmount(biome, snowSignal, polar, highland, ridge);
}

function getPlanetGlobeLandformIdentity(biome, signals, noise, surfaceMeters, normalizedLatitude) {
  return PS.render.surfaceLandform.getGlobeLandformIdentity(biome, signals, noise, surfaceMeters, normalizedLatitude);
}

function getPlanetLandformTerrainBand(biome, signals, noise, normalizedLatitude) {
  return PS.render.surfaceLandform.getTerrainBand(biome, signals, noise, normalizedLatitude);
}

function getPlanetImageryBiomeRgb(baseColor, biome, signals, surfaceMeters, noise, texture, normalizedLatitude, normalizedLongitude) {
  return PS.render.surfaceImagery.getBiomeRgb(baseColor, biome, signals, surfaceMeters, noise, texture, normalizedLatitude, normalizedLongitude);
}

function getPlanetImageryRgbAtLatLon(latitude, longitude, tileRgbCache) {
  return PS.render.surfaceImagery.getRgbAtLatLon(latitude, longitude, tileRgbCache);
}

function getPlanetTileCompositedColor(tile) {
  return PS.render.surfaceImagery.getTileCompositedColor(tile);
}

function getPlanetSurfaceTileBlendRgb(tileBlend) {
  return PS.render.surfaceColor.getTileBlendRgb(tileBlend);
}

function getPlanetSurfaceBiomeTransitionStrength(sample) {
  return PS.render.surfaceColor.getBiomeTransitionStrength(sample);
}

function getPlanetSurfaceColorWithTileBlend(sample, localColor) {
  return PS.render.surfaceColor.blendWithTileBlend(sample, localColor);
}

function getPlanetLocalTerrainBandTint(sample) {
  return PS.render.surfaceColor.getLocalTerrainBandTint(sample);
}

function getPlanetSurfaceMaterialStrataTint(sample) {
  return PS.render.surfaceColor.getMaterialStrataTint(sample);
}

function getPlanetSurfaceColor(sample) {
  return PS.render.surfaceColor.getSurfaceColor(sample);
}

function getPlanetSurfaceMicrotextureAccent(sample, baseColor, amount) {
  return PS.render.surfaceTexture.getMicrotextureAccent(sample, baseColor, amount);
}

function getPlanetSurfaceTextureStrength(sample) {
  return PS.render.surfaceTexture.getTextureStrength(sample);
}

function getPlanetSurfaceTextureSwatchCount(sample, strength) {
  return PS.render.surfaceTexture.getTextureSwatchCount(sample, strength);
}

function getPlanetSurfaceTextureSwatchShape(sample, noise, index) {
  return PS.render.surfaceTexture.getTextureSwatchShape(sample, noise, index);
}

function getPlanetSurfaceMicrotextureSwatches(sample, baseColor) {
  return PS.render.surfaceTexture.getMicrotextureSwatches(sample, baseColor);
}

function getPlanetSurfaceFinePixelTextureStrength(sample) {
  return PS.render.surfaceTexture.getFinePixelStrength(sample);
}

function getPlanetSurfaceFinePixelTextureCount(sample, strength) {
  return PS.render.surfaceTexture.getFinePixelCount(sample, strength);
}

function getPlanetSurfaceFinePixelAccent(sample, baseColor, noise) {
  return PS.render.surfaceTexture.getFinePixelAccent(sample, baseColor, noise);
}

function getPlanetSurfaceFinePixelSwatches(sample, baseColor) {
  return PS.render.surfaceTexture.getFinePixelSwatches(sample, baseColor);
}

function getPlanetSurfaceSilhouetteBreakupAccent(sample, baseColor, noise) {
  return PS.render.surfaceTexture.getSilhouetteAccent(sample, baseColor, noise);
}

function getPlanetSurfaceSilhouetteBreakupStrength(sample) {
  return PS.render.surfaceTexture.getSilhouetteStrength(sample);
}

function getPlanetSurfaceSilhouetteBreakupSwatches(sample, baseColor) {
  return PS.render.surfaceTexture.getSilhouetteSwatches(sample, baseColor);
}

function getPlanetSurfacePatternType(sample) {
  return PS.render.surfacePatterns.getPatternType(sample);
}

function getPlanetSurfacePatternStrength(sample) {
  return PS.render.surfacePatterns.getPatternStrength(sample);
}

function getPlanetSurfacePatternAccent(sample, baseColor, noise, patternType) {
  return PS.render.surfacePatterns.getPatternAccent(sample, baseColor, noise, patternType);
}

function getPlanetSurfacePatternShape(patternType, noise, index) {
  return PS.render.surfacePatterns.getPatternShape(patternType, noise, index);
}

function getPlanetSurfacePatternSwatches(sample, baseColor) {
  return PS.render.surfacePatterns.getPatternSwatches(sample, baseColor);
}

function getPlanetSurfaceStrataSwatchAccent(sample, baseColor, noise) {
  return PS.render.surfaceStrata.getSwatchAccent(sample, baseColor, noise);
}

function getPlanetSurfaceStrataSwatchShape(strata, noise, index) {
  return PS.render.surfaceStrata.getSwatchShape(strata, noise, index);
}

function getPlanetSurfaceStrataSwatchRotation(sample, strata, noise, index) {
  return PS.render.surfaceStrata.getSwatchRotation(sample, strata, noise, index);
}

function getPlanetSurfaceStrataSwatches(sample, baseColor) {
  return PS.render.surfaceStrata.getSwatches(sample, baseColor);
}

function getPlanetSurfaceNaturalElementShape(elementType, noise, index) {
  return PS.render.surfaceNatural.getElementShape(elementType, noise, index);
}

function getPlanetSurfaceNaturalElementRotation(element, elementType, noise, index) {
  return PS.render.surfaceNatural.getElementRotation(element, elementType, noise, index);
}

function getPlanetSurfaceNaturalElementSwatches(sample, baseColor) {
  return PS.render.surfaceNatural.getElementSwatches(sample, baseColor);
}

function getPlanetSurfaceReliefAccentStrength(sample) {
  return PS.render.surfaceRelief.getAccentStrength(sample);
}

function getPlanetSurfaceReliefAccentColor(sample, baseColor, amount, index) {
  return PS.render.surfaceRelief.getAccentColor(sample, baseColor, amount, index);
}

function getPlanetSurfaceReliefAccentSwatches(sample, baseColor) {
  return PS.render.surfaceRelief.getAccentSwatches(sample, baseColor);
}

function getPlanetSurfaceEdgeAccentSwatches(sample, baseColor) {
  return PS.render.surfaceRelief.getEdgeAccentSwatches(sample, baseColor);
}

function shouldDrawSurfaceMarker(sample) {
  return PS.render.surfaceDraw.shouldDrawMarker(sample);
}
