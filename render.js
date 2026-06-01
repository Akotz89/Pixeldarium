var terrainCache;
var localSurfaceRenderChunkCache = {
  chunks: {},
  order: [],
  stats: {
    hits: 0,
    misses: 0,
    generatedChunks: 0,
    evictions: 0,
    lastVisibleChunks: 0,
    lastPendingChunks: 0,
    lastGeneratedThisPass: 0,
    lastFallbackChunks: 0,
    lastFallbackGeneratedThisPass: 0,
    lastFallbackPendingChunks: 0,
    lastChunkKey: "-"
  }
};

function invalidateTerrainCache() {
  terrainCache = null;
}

function getLocalSurfaceRenderChunkCacheLimit() {
  return Math.max(16, Math.round(Number(CONFIG.PLANET_SURFACE_RENDER_CHUNK_CACHE_LIMIT) || 256));
}

function getLocalSurfaceRenderChunksPerPass() {
  return Math.max(1, Math.round(Number(CONFIG.PLANET_SURFACE_RENDER_CHUNKS_PER_PASS) || 32));
}

function getLocalSurfaceRenderFallbackChunksPerPass() {
  return Math.max(0, Math.round(Number(CONFIG.PLANET_SURFACE_RENDER_FALLBACK_CHUNKS_PER_PASS) || 8));
}

function resetLocalSurfaceRenderChunkCache() {
  localSurfaceRenderChunkCache = {
    chunks: {},
    order: [],
    stats: {
      hits: 0,
      misses: 0,
      generatedChunks: 0,
      evictions: 0,
      lastVisibleChunks: 0,
      lastPendingChunks: 0,
      lastGeneratedThisPass: 0,
      lastFallbackChunks: 0,
      lastFallbackGeneratedThisPass: 0,
      lastFallbackPendingChunks: 0,
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
    lastPendingChunks: localSurfaceRenderChunkCache.stats.lastPendingChunks,
    lastGeneratedThisPass: localSurfaceRenderChunkCache.stats.lastGeneratedThisPass,
    lastFallbackChunks: localSurfaceRenderChunkCache.stats.lastFallbackChunks,
    lastFallbackGeneratedThisPass: localSurfaceRenderChunkCache.stats.lastFallbackGeneratedThisPass,
    lastFallbackPendingChunks: localSurfaceRenderChunkCache.stats.lastFallbackPendingChunks,
    lastChunkKey: localSurfaceRenderChunkCache.stats.lastChunkKey
  };
}

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
  switch (biome) {
    case "forest":
      return "#123f23";
    case "grassland":
      return "#23552d";
    case "desert":
      return "#56451f";
    case "tundra":
      return "#29383a";
    case "ice":
      return "#a8d4e8";
    case "ocean":
      return "#06172b";
    default:
      return "#07080f";
  }
}

function mixChannel(channel, target, amount) {
  return Math.round(channel + (target - channel) * clamp(amount, 0, 1));
}

function getRgbFromHex(hexColor) {
  var color = String(hexColor || "#ffffff").replace("#", "");

  if (color.length !== 6) {
    return { red: 255, green: 255, blue: 255 };
  }

  return {
    red: parseInt(color.slice(0, 2), 16),
    green: parseInt(color.slice(2, 4), 16),
    blue: parseInt(color.slice(4, 6), 16)
  };
}

function getHexFromRgb(red, green, blue) {
  function toHex(value) {
    return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  }

  return "#" + toHex(red) + toHex(green) + toHex(blue);
}

function shadeHexColor(hexColor, shade) {
  var rgb = getRgbFromHex(hexColor);
  var normalizedShade = clamp(Number(shade) || 0, 0, 1);
  var target = normalizedShade > 0.5 ? 255 : 0;
  var amount = Math.abs(normalizedShade - 0.5) * 0.52;

  return getHexFromRgb(
    mixChannel(rgb.red, target, amount),
    mixChannel(rgb.green, target, amount),
    mixChannel(rgb.blue, target, amount)
  );
}

function blendHexColors(fromHex, toHex, amount) {
  var from = getRgbFromHex(fromHex);
  var to = getRgbFromHex(toHex);
  var normalizedAmount = clamp(Number(amount) || 0, 0, 1);

  return getHexFromRgb(
    from.red + (to.red - from.red) * normalizedAmount,
    from.green + (to.green - from.green) * normalizedAmount,
    from.blue + (to.blue - from.blue) * normalizedAmount
  );
}

function getPlanetCloudOpacity(latitude, longitude, seedOffset) {
  var normalizedLatitude = clamp(Number(latitude) || 0, -90, 90);
  var normalizedLongitude = normalizeLongitude(longitude);
  var normalizedSeed = Math.round(Number(seedOffset) || 0);
  var absLatitude = Math.abs(normalizedLatitude);
  var tropicBand = clamp(1 - Math.abs(absLatitude - 12) / 34, 0, 1);
  var stormBand = clamp(1 - Math.abs(absLatitude - 48) / 28, 0, 1);
  var polarDryness = clamp((absLatitude - 62) / 24, 0, 1);
  var broad = getDeterministicUnitNoise(
    Math.floor((normalizedLongitude + 180) / 11),
    Math.floor((normalizedLatitude + 90) / 7),
    701 + normalizedSeed
  );
  var fine = getDeterministicUnitNoise(
    Math.floor((normalizedLongitude + 180) / 4),
    Math.floor((normalizedLatitude + 90) / 4),
    719 + normalizedSeed
  );
  var streak = getDeterministicUnitNoise(
    Math.floor((normalizedLongitude + normalizedLatitude * 1.7 + 180) / 15),
    Math.floor((normalizedLatitude + 90) / 5),
    733 + normalizedSeed
  );
  var coverage = broad * 0.46 + fine * 0.28 + streak * 0.26;
  var latitudeWeight = clamp(0.12 + tropicBand * 0.44 + stormBand * 0.38 - polarDryness * 0.24, 0, 1);

  return clamp((coverage - 0.44) * 1.85 * latitudeWeight, 0, 0.68);
}

function getPlanetAtmosphericLight(point) {
  if (!point) {
    return 0;
  }

  var visibility = clamp(Number(point.visibility) || 0, 0, 1);

  return clamp(0.22 + visibility * 0.58, 0, 1);
}

function getPlanetGlobeSampleSize(projection, multiplier) {
  var normalizedMultiplier = Number(multiplier) || 1;
  var longitudeSpacing = (projection.radius * Math.PI * 2) / Math.max(1, WORLD_WIDTH);
  var latitudeSpacing = (projection.radius * Math.PI) / Math.max(1, WORLD_HEIGHT);

  return Math.max(3, Math.ceil(Math.max(longitudeSpacing, latitudeSpacing) * normalizedMultiplier));
}

function getPlanetGlobeRasterScale(width, height) {
  var maxSize = Math.max(240, Number(CONFIG.PLANET_GLOBE_RASTER_MAX_SIZE) || 720);
  var largestSize = Math.max(1, Number(width) || 1, Number(height) || 1);

  return clamp(maxSize / largestSize, 0.25, 1);
}

function getPlanetLatLonFromProjectedPoint(projection, canvasX, canvasY) {
  var radius = Math.max(1, Number(projection && projection.radius) || 1);
  var x = ((Number(canvasX) || 0) - (Number(projection.centerX) || 0)) / radius;
  var y = ((Number(projection.centerY) || 0) - (Number(canvasY) || 0)) / radius;
  var rho = Math.sqrt(x * x + y * y);

  if (rho > 1) {
    return null;
  }

  var centerLatitude = (Number(projection.viewLatitudeDeg) || 0) * Math.PI / 180;
  var centerLongitude = (Number(projection.viewLongitudeDeg) || 0) * Math.PI / 180;
  var c = Math.asin(clamp(rho, 0, 1));
  var sinC = Math.sin(c);
  var cosC = Math.cos(c);
  var sinCenterLatitude = Math.sin(centerLatitude);
  var cosCenterLatitude = Math.cos(centerLatitude);
  var latitude;
  var longitude;

  if (rho < 0.000001) {
    latitude = centerLatitude;
    longitude = centerLongitude;
  } else {
    latitude = Math.asin(
      cosC * sinCenterLatitude + (y * sinC * cosCenterLatitude) / rho
    );
    longitude = centerLongitude + Math.atan2(
      x * sinC,
      rho * cosCenterLatitude * cosC - y * sinCenterLatitude * sinC
    );
  }

  return {
    latitude: clamp(latitude * 180 / Math.PI, -90, 90),
    longitude: normalizeLongitude(longitude * 180 / Math.PI),
    visibility: clamp(cosC, 0, 1)
  };
}

function mixRgb(from, to, amount) {
  var normalizedAmount = clamp(Number(amount) || 0, 0, 1);

  return {
    red: from.red + (to.red - from.red) * normalizedAmount,
    green: from.green + (to.green - from.green) * normalizedAmount,
    blue: from.blue + (to.blue - from.blue) * normalizedAmount
  };
}

function clampRgb(rgb) {
  return {
    red: clamp(rgb && Number.isFinite(Number(rgb.red)) ? Number(rgb.red) : 0, 0, 255),
    green: clamp(rgb && Number.isFinite(Number(rgb.green)) ? Number(rgb.green) : 0, 0, 255),
    blue: clamp(rgb && Number.isFinite(Number(rgb.blue)) ? Number(rgb.blue) : 0, 0, 255)
  };
}

function blendRgbWithHex(rgb, hexColor, amount) {
  return mixRgb(clampRgb(rgb), getRgbFromHex(hexColor), amount);
}

function shadeRgb(rgb, shade) {
  var color = clampRgb(rgb);
  var normalizedShade = clamp(Number(shade) || 0, 0, 1);
  var target = normalizedShade > 0.5 ? 255 : 0;
  var amount = Math.abs(normalizedShade - 0.5) * 0.30;

  return {
    red: mixChannel(color.red, target, amount),
    green: mixChannel(color.green, target, amount),
    blue: mixChannel(color.blue, target, amount)
  };
}

function getPlanetVisualSeedOffset() {
  return typeof hashSeedText === "function" ? hashSeedText(world.seedText || "") % 100000 : 0;
}

function getPlanetMeterNoise(eastMeters, northMeters, patchMeters, seedOffset) {
  var normalizedPatchMeters = Math.max(1, Number(patchMeters) || 1);
  var normalizedSeed = Math.round(Number(seedOffset) || 0) + getPlanetVisualSeedOffset();

  return getDeterministicUnitNoise(
    Math.floor((Number(eastMeters) || 0) / normalizedPatchMeters),
    Math.floor((Number(northMeters) || 0) / normalizedPatchMeters),
    Math.round(normalizedPatchMeters) + normalizedSeed
  );
}

function smoothPlanetNoiseAmount(amount) {
  var t = clamp(Number(amount) || 0, 0, 1);

  return t * t * (3 - 2 * t);
}

function getPlanetSmoothMeterNoise(eastMeters, northMeters, patchMeters, seedOffset) {
  var normalizedPatchMeters = Math.max(1, Number(patchMeters) || 1);
  var normalizedSeed = Math.round(Number(seedOffset) || 0) + getPlanetVisualSeedOffset();
  var eastCell = (Number(eastMeters) || 0) / normalizedPatchMeters;
  var northCell = (Number(northMeters) || 0) / normalizedPatchMeters;
  var x0 = Math.floor(eastCell);
  var y0 = Math.floor(northCell);
  var xAmount = smoothPlanetNoiseAmount(eastCell - x0);
  var yAmount = smoothPlanetNoiseAmount(northCell - y0);
  var seed = Math.round(normalizedPatchMeters) + normalizedSeed;
  var topLeft = getDeterministicUnitNoise(x0, y0, seed);
  var topRight = getDeterministicUnitNoise(x0 + 1, y0, seed);
  var bottomLeft = getDeterministicUnitNoise(x0, y0 + 1, seed);
  var bottomRight = getDeterministicUnitNoise(x0 + 1, y0 + 1, seed);
  var top = topLeft + (topRight - topLeft) * xAmount;
  var bottom = bottomLeft + (bottomRight - bottomLeft) * xAmount;

  return top + (bottom - top) * yAmount;
}

function getPlanetTileRgb(tileX, tileY, tileRgbCache) {
  var x = getWrappedWorldX(tileX);
  var y = getClampedWorldY(tileY);
  var index = getTileIndex(x, y);

  if (tileRgbCache && tileRgbCache[index]) {
    return tileRgbCache[index];
  }

  return getRgbFromHex(getPlanetTileCompositedColor(getPlanetTile(x, y)));
}

function getPlanetSurfaceRgbAtLatLon(latitude, longitude, tileRgbCache) {
  var normalizedLatitude = clamp(Number(latitude) || 0, -90, 90);
  var normalizedLongitude = normalizeLongitude(longitude);
  var xFloat = ((normalizedLongitude + 180) / 360) * Math.max(1, WORLD_WIDTH) - 0.5;
  var yFloat = ((90 - normalizedLatitude) / 180) * Math.max(1, WORLD_HEIGHT) - 0.5;
  var x0 = Math.floor(xFloat);
  var y0 = Math.floor(yFloat);
  var xAmount = xFloat - x0;
  var yAmount = yFloat - y0;
  var top = mixRgb(
    getPlanetTileRgb(x0, y0, tileRgbCache),
    getPlanetTileRgb(x0 + 1, y0, tileRgbCache),
    xAmount
  );
  var bottom = mixRgb(
    getPlanetTileRgb(x0, y0 + 1, tileRgbCache),
    getPlanetTileRgb(x0 + 1, y0 + 1, tileRgbCache),
    xAmount
  );

  return mixRgb(top, bottom, yAmount);
}

function getPlanetImageryRgbAtLatLon(latitude, longitude, tileRgbCache) {
  var normalizedLatitude = clamp(Number(latitude) || 0, -90, 90);
  var normalizedLongitude = normalizeLongitude(longitude);
  var tilePosition = getTileFromLatLon(normalizedLatitude, normalizedLongitude);
  var tile = getPlanetTile(tilePosition.x, tilePosition.y) || {};
  var biome = tile.biome || "unknown";
  var surfaceMeters = getSurfaceMeterCoordinate(normalizedLatitude, normalizedLongitude);
  var broad = getPlanetSmoothMeterNoise(surfaceMeters.eastMeters, surfaceMeters.northMeters, 260000, 17);
  var regional = getPlanetSmoothMeterNoise(surfaceMeters.eastMeters, surfaceMeters.northMeters, 82000, 31);
  var local = getPlanetSmoothMeterNoise(surfaceMeters.eastMeters, surfaceMeters.northMeters, 26000, 47);
  var fine = getPlanetSmoothMeterNoise(surfaceMeters.eastMeters, surfaceMeters.northMeters, 8200, 59);
  var micro = getPlanetSmoothMeterNoise(surfaceMeters.eastMeters, surfaceMeters.northMeters, 2600, 67);
  var color = clampRgb(getPlanetSurfaceRgbAtLatLon(normalizedLatitude, normalizedLongitude, tileRgbCache));
  var elevationValue = Number.isFinite(Number(tile.elevation)) ? Number(tile.elevation) : 0;
  var elevation = clamp((Math.tanh(elevationValue / 2) + 1) / 2, 0, 1);
  var moisture = clamp(Number.isFinite(Number(tile.moisture)) ? Number(tile.moisture) / 1.8 : 0.45, 0, 1);
  var highland = clamp((elevation - 0.58) / 0.34, 0, 1);
  var polar = clamp((Math.abs(normalizedLatitude) - 54) / 32, 0, 1);
  var coast = clamp(Number(tile.coastFactor) || 0, 0, 1);
  var shallowWater = clamp(Number(tile.shallowWater) || 0, 0, 1);
  var river = clamp(Number(tile.riverStrength) || 0, 0, 1);
  var ridge = clamp(Number(tile.ridgeStrength) || 0, 0, 1);
  var roughness = clamp(Number(tile.roughness) || 0, 0, 1);
  var texture = (broad - 0.5) * 0.10 + (regional - 0.5) * 0.08 + (local - 0.5) * 0.06 + (fine - 0.5) * 0.04 + (micro - 0.5) * 0.035;

  if (biome === "ocean") {
    var current = Math.sin((surfaceMeters.eastMeters * 0.000021) + (surfaceMeters.northMeters * 0.000011)) * 0.5 + 0.5;
    color = blendRgbWithHex(color, "#02132c", clamp((1 - shallowWater) * 0.10 + (1 - elevation) * 0.06, 0, 0.18));
    color = blendRgbWithHex(color, "#14708d", clamp(shallowWater * 0.22 + coast * 0.10, 0, 0.28));
    color = blendRgbWithHex(color, "#a5d9c7", clamp(coast * 0.10, 0, 0.16));
    return clampRgb(shadeRgb(color, clamp(0.50 + texture * 0.72 + current * 0.035, 0, 1)));
  }

  if (biome === "forest") {
    color = blendRgbWithHex(color, "#092717", clamp(0.06 + moisture * 0.10 + local * 0.05, 0, 0.18));
    color = blendRgbWithHex(color, "#2d6532", clamp(regional * moisture * 0.08, 0, 0.12));
  } else if (biome === "grassland") {
    color = blendRgbWithHex(color, "#789144", clamp(0.05 + moisture * 0.08 + regional * 0.04, 0, 0.14));
    color = blendRgbWithHex(color, "#9a843f", clamp((1 - moisture) * 0.08 + broad * 0.04, 0, 0.14));
  } else if (biome === "desert") {
    var dune = Math.sin((surfaceMeters.eastMeters + surfaceMeters.northMeters * 0.48) / 85000) * 0.5 + 0.5;
    color = blendRgbWithHex(color, "#c9ab5d", clamp(0.08 + dune * 0.10 + fine * 0.04, 0, 0.20));
    color = blendRgbWithHex(color, "#836b35", clamp((1 - dune) * 0.06 + regional * 0.04, 0, 0.14));
  } else if (biome === "tundra") {
    color = blendRgbWithHex(color, "#7e8b7a", clamp(0.05 + polar * 0.08 + local * 0.05, 0, 0.16));
    color = blendRgbWithHex(color, "#dce5df", clamp(polar * 0.08 + highland * 0.08, 0, 0.16));
  } else if (biome === "ice") {
    color = blendRgbWithHex(color, "#f2fbff", clamp(0.10 + polar * 0.14 + broad * 0.06, 0, 0.28));
    color = blendRgbWithHex(color, "#8fc6dc", clamp(local * 0.05 + (1 - fine) * 0.04, 0, 0.10));
  }

  color = blendRgbWithHex(color, "#244f63", river * 0.18);
  color = blendRgbWithHex(color, "#c8bd82", coast * 0.08);
  color = blendRgbWithHex(color, "#7b796b", clamp(ridge * 0.13 + roughness * 0.04, 0, 0.17));
  color = blendRgbWithHex(color, "#e8f4f3", clamp(highland * 0.12 + ridge * 0.08 + polar * 0.08, 0, 0.24));
  return clampRgb(shadeRgb(color, clamp(0.50 + texture + highland * 0.035 + ridge * 0.022 - (1 - moisture) * 0.02, 0, 1)));
}

function getPlanetTileCompositedColor(tile) {
  var biome = tile && tile.biome ? tile.biome : "unknown";
  var latitude = tile && Number.isFinite(Number(tile.latitude)) ? Number(tile.latitude) : 0;
  var absLatitude = Math.abs(latitude);
  var elevationValue = tile && Number.isFinite(Number(tile.elevation)) ? Number(tile.elevation) : 0;
  var elevation = clamp((Math.tanh(elevationValue / 2) + 1) / 2, 0, 1);
  var moisture = clamp(tile && Number.isFinite(Number(tile.moisture)) ? Number(tile.moisture) / 1.8 : 0.45, 0, 1);
  var polar = clamp((absLatitude - 54) / 32, 0, 1);
  var highland = clamp((elevation - 0.58) / 0.34, 0, 1);
  var dry = clamp(1 - moisture, 0, 1);
  var coast = clamp(tile && Number.isFinite(Number(tile.coastFactor)) ? Number(tile.coastFactor) : 0, 0, 1);
  var shallowWater = clamp(tile && Number.isFinite(Number(tile.shallowWater)) ? Number(tile.shallowWater) : 0, 0, 1);
  var river = clamp(tile && Number.isFinite(Number(tile.riverStrength)) ? Number(tile.riverStrength) : 0, 0, 1);
  var riverMouth = clamp(tile && Number.isFinite(Number(tile.riverMouth)) ? Number(tile.riverMouth) : 0, 0, 1);
  var terrainSlope = clamp(tile && Number.isFinite(Number(tile.terrainSlope)) ? Number(tile.terrainSlope) : 0, 0, 1);
  var terrainHillshade = clamp(tile && Number.isFinite(Number(tile.terrainHillshade)) ? Number(tile.terrainHillshade) : 0.55, 0, 1);
  var ridge = clamp(tile && Number.isFinite(Number(tile.ridgeStrength)) ? Number(tile.ridgeStrength) : 0, 0, 1);
  var roughness = clamp(tile && Number.isFinite(Number(tile.roughness)) ? Number(tile.roughness) : 0, 0, 1);
  var color;

  if (biome === "ocean") {
    var shallow = Math.max(clamp((elevation - 0.18) / 0.34, 0, 1), shallowWater);

    color = blendHexColors("#031026", "#0a4f76", shallow);
    color = blendHexColors(color, "#2b6f87", shallow * 0.24);
    color = blendHexColors(color, "#7fb7a7", shallowWater * 0.35);
    color = blendHexColors(color, "#a3d7ca", riverMouth * 0.38);
    color = blendHexColors(color, "#d9edf4", polar * 0.22);
    return shadeHexColor(color, 0.48 + shallow * 0.22 + (1 - polar) * 0.05);
  }

  if (biome === "forest") {
    color = blendHexColors("#0b2718", "#2d6432", moisture);
    color = blendHexColors(color, "#1f3d25", highland * 0.42);
  } else if (biome === "grassland") {
    color = blendHexColors("#597737", "#2f6a35", moisture);
    color = blendHexColors(color, "#8b7a3b", dry * 0.32);
  } else if (biome === "desert") {
    color = blendHexColors("#8c6f35", "#c2a45a", clamp(0.35 + dry * 0.58, 0, 1));
    color = blendHexColors(color, "#6c624d", highland * 0.30);
  } else if (biome === "tundra") {
    color = blendHexColors("#4f6356", "#8c9380", clamp(0.25 + polar * 0.45, 0, 1));
    color = blendHexColors(color, "#5e5f58", highland * 0.38);
  } else if (biome === "ice") {
    color = blendHexColors("#a9d1df", "#f0f7f8", clamp(0.40 + polar * 0.55, 0, 1));
  } else {
    color = getPlanetBiomeColor(biome);
  }

  color = blendHexColors(color, "#224f63", river * 0.45);
  color = blendHexColors(color, "#b6b06a", coast * 0.18);
  color = blendHexColors(color, "#6d6a60", clamp(terrainSlope * 0.22 + roughness * 0.08, 0, 0.30));
  color = blendHexColors(color, "#6f6a5c", clamp(highland * 0.24 + ridge * 0.20, 0, 0.36));
  color = blendHexColors(color, "#eef6f5", clamp((highland - 0.58) * 1.6 + ridge * 0.18 + polar * 0.55, 0, 0.64));
  return shadeHexColor(
    color,
    clamp(0.28 + terrainHillshade * 0.40 + elevation * 0.12 + moisture * 0.05 + ridge * 0.035 - dry * 0.05, 0, 1)
  );
}

function getPlanetSurfaceColor(sample) {
  var biome = sample && sample.biome ? sample.biome : "unknown";
  var detail = sample && sample.detail ? sample.detail : null;
  var baseColor = getPlanetBiomeColor(biome);

  if (!detail) {
    return baseColor;
  }

  var shade = clamp(
    (Number(detail.shade) || 0.5) * 0.54 +
      (Number(detail.elevation) || 0.5) * 0.12 +
      (Number(detail.roughness) || 0) * 0.08 +
      (Number(detail.hillshade) || 0.5) * 0.26,
    0,
    1
  );
  var heightMeters = Number(detail.heightMeters) || 0;
  var slope = clamp(Number(detail.slope) || 0, 0, 1);
  var highland = clamp((heightMeters - 900) / 2600, 0, 1);
  var snowLine = biome === "ice" ? 0.35 : clamp((heightMeters - 1800) / 2200, 0, 1);
  var shadow = clamp(1 - (Number(detail.hillshade) || 0.5), 0, 1);
  var river = sample && sample.tile ? clamp(Number(sample.tile.riverStrength) || 0, 0, 1) : 0;
  var coast = sample && sample.tile ? clamp(Number(sample.tile.coastFactor) || 0, 0, 1) : 0;
  var shallowWater = sample && sample.tile ? clamp(Number(sample.tile.shallowWater) || 0, 0, 1) : 0;
  var reliefShade = clamp(shade + highland * 0.08 - shadow * 0.10, 0, 1);
  var color;

  if (detail.surface === "whitecap") {
    color = "#b7e9f4";
  } else if (detail.surface === "open water") {
    color = blendHexColors("#08365f", "#16658a", clamp((heightMeters + 4200) / 4200, 0, 1));
  } else if (detail.surface === "deep water") {
    color = "#020b1f";
  } else if (detail.surface === "clearing" || detail.surface === "meadow") {
    color = blendHexColors("#2e6835", "#7c8f3e", clamp(Number(detail.roughness) || 0, 0, 1) * 0.22);
  } else if (detail.surface === "dense canopy") {
    color = "#082716";
  } else if (detail.surface === "woodland") {
    color = "#123f23";
  } else if (detail.surface === "brush") {
    color = "#346337";
  } else if (detail.surface === "grass") {
    color = "#2f6531";
  } else if (detail.surface === "rock" || detail.surface === "stone") {
    color = blendHexColors("#454640", "#7c7b6f", slope * 0.55);
  } else if (detail.surface === "dune" || detail.surface === "sand") {
    color = blendHexColors("#755f2d", "#b9964e", clamp(1 - slope, 0, 1) * 0.35);
  } else if (detail.surface === "scrub" || detail.surface === "moss") {
    color = "#334739";
  } else if (detail.surface === "ridge ice" || detail.surface === "ice") {
    color = blendHexColors("#9cc8d8", "#eaf6f8", slope * 0.32);
  } else if (detail.surface === "snow") {
    color = "#e5f3f7";
  } else {
    color = baseColor;
  }

  if (biome === "ocean") {
    color = blendHexColors(color, "#7fb7a7", shallowWater * 0.34);
  } else {
    color = blendHexColors(color, "#1d5265", river * 0.46);
    color = blendHexColors(color, "#aaa05e", coast * 0.16);
  }

  color = blendHexColors(color, "#56544c", slope * 0.26);
  color = blendHexColors(color, "#f1f6f4", snowLine * 0.48);
  return shadeHexColor(color, reliefShade);
}

function getPlanetSurfaceMicrotextureAccent(sample, baseColor, amount) {
  var detail = sample && sample.detail ? sample.detail : {};
  var biome = sample && sample.biome ? sample.biome : "unknown";
  var surface = detail.surface || "ground";
  var normalizedAmount = clamp(Number(amount) || 0, 0, 1);
  var accent = "#ffffff";

  if (biome === "ocean" || surface === "open water" || surface === "deep water" || surface === "whitecap") {
    accent = surface === "whitecap" ? "#e9fbff" : "#86c8df";
  } else if (surface === "dense canopy" || surface === "woodland") {
    accent = normalizedAmount > 0.58 ? "#1b5630" : "#071f12";
  } else if (surface === "grass" || surface === "brush" || surface === "meadow" || surface === "clearing") {
    accent = normalizedAmount > 0.55 ? "#80a84b" : "#244c28";
  } else if (surface === "rock" || surface === "stone") {
    accent = normalizedAmount > 0.50 ? "#9b998a" : "#343632";
  } else if (surface === "sand" || surface === "dune") {
    accent = normalizedAmount > 0.50 ? "#d0b36c" : "#6a572a";
  } else if (surface === "snow" || surface === "ice" || surface === "ridge ice") {
    accent = normalizedAmount > 0.50 ? "#f5fdff" : "#8bbfd1";
  } else if (surface === "scrub" || surface === "moss") {
    accent = normalizedAmount > 0.50 ? "#708764" : "#26352c";
  } else {
    accent = normalizedAmount > 0.50 ? "#d7e4d8" : "#1f2b24";
  }

  return blendHexColors(baseColor, accent, clamp(0.14 + normalizedAmount * 0.22, 0, 0.42));
}

function getPlanetSurfaceMicrotextureSwatches(sample, baseColor) {
  var detail = sample && sample.detail ? sample.detail : {};
  var sampleMeters = Math.max(1, Number(sample && sample.surfaceSampleMeters) || Number(detail.sampleMeters) || 1);
  var strength = clamp(
    0.12 +
      (Number(detail.roughness) || 0) * 0.28 +
      (Number(detail.slope) || 0) * 0.18 +
      (sampleMeters <= 5 ? 0.24 : sampleMeters <= 25 ? 0.12 : 0),
    0,
    0.64
  );
  var swatches = [];
  var seedEast = Math.round(Number(sample && sample.surfaceSampleX) || 0);
  var seedNorth = Math.round(Number(sample && sample.surfaceSampleY) || 0);

  if (strength <= 0.14 || CONFIG.TILE_SIZE < 4) {
    return swatches;
  }

  for (var i = 0; i < 3; i++) {
    var noise = getDeterministicUnitNoise(seedEast + i * 13, seedNorth - i * 17, getPlanetVisualSeedOffset() + i * 29 + sampleMeters);

    if (noise > strength + 0.30) {
      continue;
    }

    var size = clamp(Math.round(CONFIG.TILE_SIZE * (0.22 + noise * 0.22)), 1, Math.max(1, CONFIG.TILE_SIZE - 2));

    swatches.push({
      x: Math.floor(getDeterministicUnitNoise(seedEast, seedNorth, 701 + i) * Math.max(1, CONFIG.TILE_SIZE - size + 1)),
      y: Math.floor(getDeterministicUnitNoise(seedEast, seedNorth, 811 + i) * Math.max(1, CONFIG.TILE_SIZE - size + 1)),
      size: size,
      color: getPlanetSurfaceMicrotextureAccent(sample, baseColor, noise),
      alpha: clamp(0.18 + strength * 0.48 + noise * 0.18, 0.18, 0.72)
    });
  }

  return swatches;
}

function shouldDrawSurfaceMarker(sample) {
  var detail = sample && sample.detail ? sample.detail : null;
  var marker = detail && detail.marker ? detail.marker : null;

  return Boolean(
    marker &&
    marker.intensity > 0.38 &&
    detail.sampleMeters <= 100 &&
    CONFIG.TILE_SIZE >= 4
  );
}

function drawSurfaceMarker(tctx, sample, screenX, screenY) {
  if (!shouldDrawSurfaceMarker(sample)) {
    return;
  }

  var marker = sample.detail.marker;
  var size = clamp(
    Math.round(CONFIG.TILE_SIZE * clamp(Number(marker.size) || 0.25, 0.15, 0.86)),
    1,
    CONFIG.TILE_SIZE
  );
  var offsetX = Math.floor((CONFIG.TILE_SIZE - size) * clamp(sample.detail.meterNoise || 0, 0, 1));
  var offsetY = Math.floor((CONFIG.TILE_SIZE - size) * clamp(sample.detail.microNoise || 0, 0, 1));

  tctx.globalAlpha = clamp(0.18 + marker.intensity * 0.58, 0.18, 0.76);
  tctx.fillStyle = marker.color;
  tctx.fillRect(screenX + offsetX, screenY + offsetY, size, size);
  tctx.globalAlpha = 1;
}

function drawSurfaceMicrotexture(tctx, sample, baseColor, screenX, screenY) {
  var swatches = getPlanetSurfaceMicrotextureSwatches(sample, baseColor);

  for (var i = 0; i < swatches.length; i++) {
    var swatch = swatches[i];

    tctx.globalAlpha = clamp(Number(swatch.alpha) || 0.24, 0, 0.82);
    tctx.fillStyle = swatch.color;
    tctx.fillRect(screenX + swatch.x, screenY + swatch.y, swatch.size, swatch.size);
  }

  tctx.globalAlpha = 1;
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

      chunkCtx.fillStyle = baseColor;
      chunkCtx.fillRect(screenX, screenY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
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

  var renderChunk = buildLocalSurfaceRenderChunk(address);

  if (!renderChunk) {
    return null;
  }

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

  limbGradient.addColorStop(0, "rgba(255, 255, 255, 0.025)");
  limbGradient.addColorStop(0.58, "rgba(86, 176, 255, 0.012)");
  limbGradient.addColorStop(0.84, "rgba(54, 148, 255, 0.04)");
  limbGradient.addColorStop(1, "rgba(4, 14, 34, 0.28)");
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
  var rasterScale = getPlanetGlobeRasterScale(width, height);
  var rasterWidth = Math.max(1, Math.ceil(width * rasterScale));
  var rasterHeight = Math.max(1, Math.ceil(height * rasterScale));
  var surfaceCanvas = document.createElement("canvas");
  var surfaceCtx;
  var image;
  var data;
  var tileRgbCache = buildGlobeTileRgbCache();

  surfaceCanvas.width = rasterWidth;
  surfaceCanvas.height = rasterHeight;
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
      var daylight = clamp(0.48 + visibility * 0.56 - nx * 0.08 + ny * 0.04, 0.20, 1.05);
      var limb = clamp(Math.pow(1 - visibility, 1.7), 0, 1);
      var red = rgb.red * daylight;
      var green = rgb.green * daylight;
      var blue = rgb.blue * daylight;
      var index = (py * rasterWidth + px) * 4;

      red = red + (62 - red) * limb * 0.20;
      green = green + (150 - green) * limb * 0.24;
      blue = blue + (220 - blue) * limb * 0.32;

      data[index] = clamp(red, 0, 255);
      data[index + 1] = clamp(green, 0, 255);
      data[index + 2] = clamp(blue, 0, 255);
      data[index + 3] = 255;
    }
  }

  surfaceCtx.putImageData(image, 0, 0);
  targetCtx.save();
  targetCtx.imageSmoothingEnabled = false;
  targetCtx.drawImage(surfaceCanvas, minX, minY, width, height);
  targetCtx.restore();
  return true;
}

function buildGlobeTerrainCache(tctx) {
  var projection = getPlanetProjection();
  var sampleSize = getPlanetGlobeSampleSize(projection, 1.08);

  drawPlanetShell(tctx);

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
  var chunksPerPass = getLocalSurfaceRenderChunksPerPass();
  var fallbackChunks = 0;
  var fallbackGeneratedThisPass = 0;
  var fallbackPendingChunks = 0;
  var fallbackChunksPerPass = getLocalSurfaceRenderFallbackChunksPerPass();
  var fallbackDraws = [];
  var fineDraws = [];

  tctx.fillStyle = "#01030a";
  tctx.fillRect(0, 0, canvas.width, canvas.height);
  localSurfaceRenderChunkCache.stats.lastVisibleChunks = visibleChunks.length;
  localSurfaceRenderChunkCache.stats.lastGeneratedThisPass = 0;
  localSurfaceRenderChunkCache.stats.lastPendingChunks = 0;
  localSurfaceRenderChunkCache.stats.lastFallbackChunks = 0;
  localSurfaceRenderChunkCache.stats.lastFallbackGeneratedThisPass = 0;
  localSurfaceRenderChunkCache.stats.lastFallbackPendingChunks = 0;

  visibleChunks.forEach(function(visibleChunk) {
    var renderKey = getLocalSurfaceRenderChunkKey(visibleChunk.address);
    var isCached = Boolean(localSurfaceRenderChunkCache.chunks[renderKey]);
    var canGenerate = isCached || generatedThisPass < chunksPerPass;
    var renderChunk = getLocalSurfaceRenderChunk(visibleChunk.address, canGenerate);

    if (renderChunk) {
      fineDraws.push({
        canvas: renderChunk.canvas,
        x: visibleChunk.screenX,
        y: visibleChunk.screenY,
        width: visibleChunk.width,
        height: visibleChunk.height
      });
      if (!isCached) {
        generatedThisPass++;
      }
    } else {
      pendingChunks++;
      var fallback = getLocalSurfaceFallbackRenderChunk(
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
      }
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

  if (pendingChunks > 0) {
    world.needsRender = true;
  }
}

function buildTerrainCache() {
  terrainCache = document.createElement("canvas");
  terrainCache.width = canvas.width;
  terrainCache.height = canvas.height;

  var tctx = terrainCache.getContext("2d");

  if (isGlobeRenderMode() && isPlanetLocalView()) {
    buildLocalTerrainCache(tctx);
  } else if (isGlobeRenderMode()) {
    buildGlobeTerrainCache(tctx);
  } else {
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
    terrainCache = null;
    world.needsRender = true;
  }
}

function getPlanetLocalReferenceGridInfo(targetPixels) {
  var scaleInfo = getPlanetCameraScaleInfo();
  var normalizedTargetPixels = Math.max(72, Number(targetPixels) || 140);
  var distanceMeters = getNicePlanetDistanceMeters(scaleInfo.metersPerCanvasPixel * normalizedTargetPixels);
  var pixelSpacing = distanceMeters / Math.max(0.001, scaleInfo.metersPerCanvasPixel);
  var opacity = clamp(0.13 - scaleInfo.zoomValue * 0.018, 0.035, 0.105);

  while (pixelSpacing < 72) {
    distanceMeters *= 2;
    pixelSpacing *= 2;
  }

  while (pixelSpacing > 230) {
    distanceMeters /= 2;
    pixelSpacing /= 2;
  }

  return {
    distanceMeters: distanceMeters,
    label: getPlanetDistanceLabel(distanceMeters),
    pixelSpacing: pixelSpacing,
    opacity: opacity
  };
}

function drawPlanetLocalCurvatureOverlay() {
  var scaleInfo = getPlanetCameraScaleInfo();
  var curvature = clamp(scaleInfo.footprintWidthKm / 9000, 0, 1);

  if (curvature <= 0.02 || typeof ctx.createRadialGradient !== "function") {
    return;
  }

  var centerX = canvas.width / 2;
  var centerY = canvas.height / 2;
  var gradient = ctx.createRadialGradient(
    centerX,
    centerY,
    Math.min(canvas.width, canvas.height) * 0.16,
    centerX,
    centerY,
    Math.max(canvas.width, canvas.height) * 0.68
  );

  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(0.72, "rgba(0, 0, 0, " + (0.08 * curvature).toFixed(3) + ")");
  gradient.addColorStop(1, "rgba(1, 3, 10, " + (0.42 * curvature).toFixed(3) + ")");

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(142, 160, 255, " + (0.12 * curvature).toFixed(3) + ")";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(
    centerX,
    canvas.height * (1.68 + (1 - curvature) * 0.48),
    canvas.width * (1.12 + (1 - curvature) * 0.34),
    Math.PI * 1.06,
    Math.PI * 1.94
  );
  ctx.stroke();
  ctx.restore();
}

function drawPlanetLocalReferenceGrid() {
  var grid = getPlanetLocalReferenceGridInfo(140);
  var scaleInfo = getPlanetCameraScaleInfo();
  var view = getPlanetView();
  var viewMeters = getSurfaceMeterCoordinate(view.latitude, view.longitude);
  var metersPerPixel = Math.max(0.001, scaleInfo.metersPerCanvasPixel);
  var minEast = viewMeters.eastMeters - (canvas.width / 2) * metersPerPixel;
  var maxEast = viewMeters.eastMeters + (canvas.width / 2) * metersPerPixel;
  var minNorth = viewMeters.northMeters - (canvas.height / 2) * metersPerPixel;
  var maxNorth = viewMeters.northMeters + (canvas.height / 2) * metersPerPixel;
  var eastStart = Math.floor(minEast / grid.distanceMeters) * grid.distanceMeters;
  var northStart = Math.floor(minNorth / grid.distanceMeters) * grid.distanceMeters;

  ctx.save();
  ctx.strokeStyle = "rgba(220, 229, 255, " + grid.opacity.toFixed(3) + ")";
  ctx.lineWidth = 1;

  for (var east = eastStart; east <= maxEast; east += grid.distanceMeters) {
    var x = canvas.width / 2 + (east - viewMeters.eastMeters) / metersPerPixel;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (var north = northStart; north <= maxNorth; north += grid.distanceMeters) {
    var y = canvas.height / 2 - (north - viewMeters.northMeters) / metersPerPixel;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(220, 229, 255, " + Math.min(0.68, grid.opacity * 5).toFixed(3) + ")";
  ctx.font = "11px Arial, Helvetica, sans-serif";
  ctx.fillText("grid " + grid.label, canvas.width - 102, canvas.height - 25);
  ctx.restore();
}

function drawPlanetScaleBar() {
  var scaleInfo = getPlanetCameraScaleInfo();
  var scaleBar = getPlanetScaleBar(Math.min(260, canvas.width * 0.18));
  var barWidth = clamp(scaleBar.pixelWidth, 80, 320);
  var x = 24;
  var y = canvas.height - 58;
  var label = scaleBar.label + " | " +
    getPlanetDistanceLabel(scaleInfo.metersPerCanvasPixel) + "/px | alt " +
    getPlanetDistanceLabel(scaleInfo.approximateAltitudeKm * 1000);

  ctx.save();
  ctx.fillStyle = "rgba(3, 4, 9, 0.68)";
  ctx.strokeStyle = "rgba(147, 161, 255, 0.42)";
  ctx.lineWidth = 1;

  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x - 12, y - 34, Math.max(300, barWidth + 112), 52, 8);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(x - 12, y - 34, Math.max(300, barWidth + 112), 52);
    ctx.strokeRect(x - 12, y - 34, Math.max(300, barWidth + 112), 52);
  }

  ctx.strokeStyle = "rgba(236, 242, 255, 0.94)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + barWidth, y);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x, y + 8);
  ctx.moveTo(x + barWidth, y - 8);
  ctx.lineTo(x + barWidth, y + 8);
  ctx.stroke();

  ctx.fillStyle = "rgba(236, 242, 255, 0.96)";
  ctx.font = "bold 14px Arial, Helvetica, sans-serif";
  ctx.fillText(scaleBar.label, x, y - 14);

  ctx.fillStyle = "rgba(190, 205, 238, 0.9)";
  ctx.font = "12px Arial, Helvetica, sans-serif";
  ctx.fillText(label, x + barWidth + 16, y + 5);
  ctx.restore();
}

function drawPlanetReferenceGrid() {
  var lonStep = Math.max(10, Math.round(Number(CONFIG.PLANET_GRID_DEGREES) || 30));
  var latStep = lonStep;
  var showDebugOverlay = Boolean(CONFIG.PLANET_DEBUG_OVERLAY);
  var showReferenceGrid = Boolean(CONFIG.PLANET_REFERENCE_GRID || showDebugOverlay);

  if (isGlobeRenderMode() && isPlanetLocalView()) {
    ctx.save();
    if (showReferenceGrid) {
      drawPlanetLocalCurvatureOverlay();
      drawPlanetLocalReferenceGrid();
    }
    drawPlanetScaleBar();

    if (showDebugOverlay) {
      var view = getPlanetView();
      var scaleInfo = getPlanetCameraScaleInfo();
      var cacheStats = getPlanetSurfaceCacheStats();
      var renderCacheStats = getLocalSurfaceRenderCacheStats();
      var visibleChunks = getPlanetVisibleSurfaceChunks(0);
      var pyramidLabel = visibleChunks.length > 0
        ? getPlanetSurfaceChunkLineageLabel(getPlanetSurfaceChunkLineage(visibleChunks[0].address))
        : "-";

      ctx.strokeStyle = "rgba(112, 240, 208, 0.42)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        canvas.width / 2 - 12,
        canvas.height / 2 - 12,
        24,
        24
      );
      ctx.fillStyle = "rgba(3, 4, 9, 0.54)";
      ctx.fillRect(18, canvas.height - 104, canvas.width - 36, 24);
      ctx.fillStyle = "rgba(220, 229, 255, 0.88)";
      ctx.font = "12px Arial, Helvetica, sans-serif";
      ctx.fillText(
        "focus " + view.latitude.toFixed(4) + ", " + view.longitude.toFixed(4) +
          " | footprint " + scaleInfo.footprintWidthKm.toLocaleString(undefined, { maximumFractionDigits: 2 }) +
          " x " + scaleInfo.footprintHeightKm.toLocaleString(undefined, { maximumFractionDigits: 2 }) + " km" +
          " | " + getPlanetScaleLabel() +
          " | cache " + cacheStats.chunks + "c/" + cacheStats.samples + "s" +
          " | render " + renderCacheStats.lastVisibleChunks + "v/" +
            renderCacheStats.chunks + "c/" +
            renderCacheStats.lastPendingChunks + "p/" +
            renderCacheStats.lastGeneratedThisPass + "g/" +
            renderCacheStats.lastFallbackChunks + "f/" +
            renderCacheStats.lastFallbackGeneratedThisPass + "fg/" +
            renderCacheStats.hits + "h" +
          " | pyramid " + pyramidLabel,
        28,
        canvas.height - 87
      );
    }

    ctx.restore();
    return;
  }

  if (isGlobeRenderMode() && !showReferenceGrid && !showDebugOverlay) {
    return;
  }

  ctx.save();
  ctx.lineWidth = 1;

  if (isGlobeRenderMode()) {
    var projection = getPlanetProjection();

    function drawProjectedLine(points, color) {
      var drawing = false;

      ctx.beginPath();

      for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
        var point = points[pointIndex];
        var projected = projectPlanetPoint(point.longitude, point.latitude);

        if (!projected) {
          drawing = false;
          continue;
        }

        if (!drawing) {
          ctx.moveTo(projected.x, projected.y);
          drawing = true;
        } else {
          ctx.lineTo(projected.x, projected.y);
        }
      }

      ctx.strokeStyle = color;
      ctx.stroke();
    }

    if (showReferenceGrid) {
      for (var lon = -180; lon <= 180; lon += lonStep) {
        var longitudePoints = [];

        for (var lat = -90; lat <= 90; lat += 2) {
          longitudePoints.push({ longitude: lon, latitude: lat });
        }

        drawProjectedLine(longitudePoints, lon === 0 ? "rgba(255, 255, 255, 0.18)" : "rgba(255, 255, 255, 0.055)");
      }

      for (var gridLat = -60; gridLat <= 60; gridLat += latStep) {
        var latitudePoints = [];

        for (var gridLon = -180; gridLon <= 180; gridLon += 2) {
          latitudePoints.push({ longitude: gridLon, latitude: gridLat });
        }

        drawProjectedLine(latitudePoints, gridLat === 0 ? "rgba(112, 240, 208, 0.28)" : "rgba(255, 255, 255, 0.055)");
      }

      ctx.beginPath();
      ctx.arc(projection.centerX, projection.centerY, projection.radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.36)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  } else {
    for (var lon = -150; lon <= 180; lon += lonStep) {
      var x = ((lon + 180) / 360) * canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.strokeStyle = lon === 0 ? "rgba(255, 255, 255, 0.16)" : "rgba(255, 255, 255, 0.055)";
      ctx.stroke();
    }

    for (var lat = -60; lat <= 60; lat += latStep) {
      var y = ((90 - lat) / 180) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.strokeStyle = lat === 0 ? "rgba(112, 240, 208, 0.24)" : "rgba(255, 255, 255, 0.055)";
      ctx.stroke();
    }
  }

  if (showDebugOverlay && world.planetSummary) {
    ctx.fillStyle = "rgba(3, 4, 9, 0.50)";
    ctx.fillRect(18, canvas.height - 42, 430, 24);
    ctx.fillStyle = "rgba(220, 229, 255, 0.86)";
    ctx.font = "14px Arial, Helvetica, sans-serif";
    ctx.fillText(
      world.planetSummary.name + " scale | " +
        Math.round(world.planetSummary.circumferenceKm).toLocaleString() + " km circumference | " +
        world.planetSummary.equatorKmPerTile.toFixed(1) + " km/tile @ equator",
      28,
      canvas.height - 25
    );
  }

  ctx.restore();
}

function getTileRenderPosition(tileX, tileY) {
  if (isGlobeRenderMode()) {
    return getPlanetInterpolatedProjection(tileX, tileY);
  }

  return {
    x: tileX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
    y: tileY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
    scale: 1,
    visibility: 1,
    visible: true
  };
}

function drawTileEntity(tileX, tileY, size, color) {
  var point = getTileRenderPosition(tileX, tileY);

  if (!point) {
    return;
  }

  drawEntityAtCanvasPosition(
    point.x,
    point.y,
    Math.max(1, size * (point.scale || 1)),
    color
  );
}

function getEntityRenderPosition(entity, interpolation) {
  if (!entity) {
    return null;
  }

  var surfacePosition = getEntitySurfacePosition(entity);

  if (!surfacePosition) {
    return getTileRenderPosition(entity.x, entity.y);
  }

  ensureEntitySurfacePosition(entity);

  var renderLatitude = surfacePosition.latitude;
  var renderLongitude = surfacePosition.longitude;
  var rawInterpolation = Number(interpolation);
  var amount = Number.isFinite(rawInterpolation) ? clamp(rawInterpolation, 0, 1) : 1;

  if (
    amount < 1 &&
    Number.isFinite(Number(entity.prevLatitude)) &&
    Number.isFinite(Number(entity.prevLongitude))
  ) {
    renderLatitude = Number(entity.prevLatitude) + (surfacePosition.latitude - Number(entity.prevLatitude)) * amount;
    renderLongitude = interpolateLongitudeDeg(entity.prevLongitude, surfacePosition.longitude, amount);
  }

  if (isGlobeRenderMode()) {
    if (isPlanetLocalView()) {
      return projectPlanetLocalPoint(renderLongitude, renderLatitude);
    }

    return projectPlanetPoint(renderLongitude, renderLatitude);
  }

  return getTileRenderPosition(entity.x, entity.y);
}

function drawSurfaceEntity(entity, interpolation, size, color) {
  var point = getEntityRenderPosition(entity, interpolation);

  if (!point) {
    return;
  }

  drawEntityAtCanvasPosition(
    point.x,
    point.y,
    Math.max(1, size * (point.scale || 1)),
    color
  );
}

function shouldDrawGlobeScaleEntities() {
  return !isGlobeRenderMode() ||
    isPlanetLocalView() ||
    Boolean(CONFIG.PLANET_GLOBE_ENTITY_MARKERS) ||
    Boolean(CONFIG.PLANET_DEBUG_OVERLAY);
}

function drawFood() {
  if (!shouldDrawGlobeScaleEntities()) {
    return;
  }

  for (var i = 0; i < world.food.length; i++) {
    var food = world.food[i];
    drawSurfaceEntity(food, 1, CONFIG.FOOD_DRAW_SIZE, "#58f06c");
  }
}

function getRgbaFromHex(hexColor, alpha) {
  var color = String(hexColor || "#ffffff").replace("#", "");

  if (color.length !== 6) {
    return "rgba(255, 255, 255, " + alpha + ")";
  }

  var red = parseInt(color.slice(0, 2), 16);
  var green = parseInt(color.slice(2, 4), 16);
  var blue = parseInt(color.slice(4, 6), 16);
  return "rgba(" + red + ", " + green + ", " + blue + ", " + alpha + ")";
}

function getLineageColor(organism) {
  var lineageId = typeof organism.lineageId === "number" ? organism.lineageId : 1;
  return getLineageColorById(lineageId);
}

function getLineageColorById(lineageId) {
  var colorIndex = (lineageId - 1) % CONFIG.LINEAGE_COLORS.length;
  return CONFIG.LINEAGE_COLORS[colorIndex];
}

function getOrganismColor(organism) {
  if (organism.energy > 200) {
    return "#fff26b";
  }

  if (organism.energy < 60) {
    return "#ff9c69";
  }

  return getLineageColor(organism);
}

function drawOrganisms() {
  if (!shouldDrawGlobeScaleEntities()) {
    return;
  }

  var interpolation = world.interpolation;

  if (interpolation < 0) {
    interpolation = 0;
  }

  if (interpolation > 1) {
    interpolation = 1;
  }

  for (var i = 0; i < world.organisms.length; i++) {
    var organism = world.organisms[i];
    drawSurfaceEntity(organism, interpolation, CONFIG.ORGANISM_DRAW_SIZE, getOrganismColor(organism));
  }
}

function getSettlementDrawSize(settlement) {
  var level = Math.max(1, Math.round(Number(settlement.level) || 1));
  var growthScale = 2.1 + Math.min(level - 1, 5) * 0.35;
  return CONFIG.ORGANISM_DRAW_SIZE * growthScale;
}

function getRenderedSettlementById(settlementId) {
  if (typeof getSettlementById === "function") {
    return getSettlementById(settlementId);
  }

  if (!Array.isArray(world.settlements)) {
    return null;
  }

  for (var i = 0; i < world.settlements.length; i++) {
    if (world.settlements[i].id === settlementId) {
      return world.settlements[i];
    }
  }

  return null;
}

function drawSettlementRoutes() {
  if (!Array.isArray(world.settlementRoutes)) {
    return;
  }

  for (var i = 0; i < world.settlementRoutes.length; i++) {
    var route = world.settlementRoutes[i];
    var parentSettlement = getRenderedSettlementById(route.parentSettlementId);
    var childSettlement = getRenderedSettlementById(route.childSettlementId);

    if (!parentSettlement || !childSettlement) {
      continue;
    }

    var parentPoint = getTileRenderPosition(parentSettlement.x, parentSettlement.y);
    var childPoint = getTileRenderPosition(childSettlement.x, childSettlement.y);

    if (!parentPoint || !childPoint) {
      continue;
    }

    var lineageColor = getLineageColorById(route.lineageId || parentSettlement.lineageId);
    var isColonyRoute = parentSettlement.isColony || childSettlement.isColony;

    ctx.beginPath();
    ctx.moveTo(parentPoint.x, parentPoint.y);
    ctx.lineTo(childPoint.x, childPoint.y);
    ctx.strokeStyle = isColonyRoute ? "rgba(112, 240, 208, 0.68)" : getRgbaFromHex(lineageColor, route.isActive ? 0.52 : 0.20);
    ctx.lineWidth = isColonyRoute ? 3 : (route.isActive ? 2 : 1);
    ctx.setLineDash(isColonyRoute ? [10, 3] : (route.isActive ? [6, 4] : [2, 5]));
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawSettlementInfluence() {
  if (!Array.isArray(world.settlements)) {
    return;
  }

  for (var i = 0; i < world.settlements.length; i++) {
    var settlement = world.settlements[i];
    var radius = Math.max(1, Math.round(Number(settlement.influenceRadius) || CONFIG.SETTLEMENT_INFLUENCE_BASE_RADIUS));
    var point = getTileRenderPosition(settlement.x, settlement.y);

    if (!point) {
      continue;
    }

    var canvasRadius = radius * CONFIG.TILE_SIZE * (point.scale || 1);
    var lineageColor = getLineageColorById(settlement.lineageId);

    ctx.beginPath();
    ctx.moveTo(point.x, point.y - canvasRadius);
    ctx.lineTo(point.x + canvasRadius, point.y);
    ctx.lineTo(point.x, point.y + canvasRadius);
    ctx.lineTo(point.x - canvasRadius, point.y);
    ctx.closePath();
    ctx.fillStyle = getRgbaFromHex(lineageColor, settlement.isActive ? 0.07 : 0.035);
    ctx.fill();
    ctx.strokeStyle = getRgbaFromHex(lineageColor, settlement.isActive ? 0.22 : 0.12);
    ctx.lineWidth = Math.min(3, Math.max(1, Math.round(Number(settlement.level) || 1)));
    ctx.stroke();
  }
}

function drawSettlements() {
  if (!Array.isArray(world.settlements)) {
    return;
  }

  for (var i = 0; i < world.settlements.length; i++) {
    var settlement = world.settlements[i];
    var point = getTileRenderPosition(settlement.x, settlement.y);

    if (!point) {
      continue;
    }

    var size = getSettlementDrawSize(settlement) * (point.scale || 1);
    var markerSize = Math.min(7, 3 + Math.max(0, Math.round(Number(settlement.level) || 1) - 1)) * (point.scale || 1);

    ctx.fillStyle = settlement.isColony ? "rgba(8, 24, 26, 0.66)" : (settlement.isOutpost ? "rgba(8, 10, 18, 0.58)" : "rgba(5, 6, 10, 0.72)");
    ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
    ctx.strokeStyle = settlement.isActive ? getLineageColorById(settlement.lineageId) : "rgba(255, 255, 255, 0.42)";
    ctx.lineWidth = Math.min(4, 1 + Math.max(1, Math.round(Number(settlement.level) || 1)));
    ctx.setLineDash(settlement.isOutpost && !settlement.isColony ? [3, 2] : []);
    ctx.strokeRect(point.x - size / 2, point.y - size / 2, size, size);
    ctx.setLineDash([]);
    ctx.fillStyle = settlement.isColony ? "#70f0d0" : (settlement.isOutpost ? "#fff26b" : "#f2b85b");
    ctx.fillRect(point.x - markerSize / 2, point.y - markerSize / 2, markerSize, markerSize);

    if (settlement.isColony && world.spaceProgramReady) {
      ctx.beginPath();
      ctx.moveTo(point.x, point.y - size / 2 - 10);
      ctx.lineTo(point.x + 5, point.y - size / 2 - 2);
      ctx.lineTo(point.x - 5, point.y - size / 2 - 2);
      ctx.closePath();
      ctx.fillStyle = world.orbitalLaunches > 0 ? "#ffffff" : "#72d7ff";
      ctx.fill();
    }
  }
}

function drawOrbitalAssets() {
  if (!Array.isArray(world.orbitalAssets) || world.orbitalAssets.length === 0) {
    return;
  }

  var centerX = canvas.width - 92;
  var centerY = 84;
  var platformReady = Boolean(world.orbitalPlatformReady);

  ctx.beginPath();
  ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
  ctx.strokeStyle = platformReady ? "rgba(255, 255, 255, 0.42)" : "rgba(114, 215, 255, 0.28)";
  ctx.lineWidth = platformReady ? 2 : 1;
  ctx.setLineDash([4, 6]);
  ctx.stroke();
  ctx.setLineDash([]);

  for (var i = 0; i < world.orbitalAssets.length; i++) {
    var asset = world.orbitalAssets[i];

    if (!asset.isActive) {
      continue;
    }

    var angle = ((asset.orbitAngle + world.tick * 0.08) % 360) * Math.PI / 180;
    var radius = 28 + Math.max(1, Math.round(Number(asset.orbitBand) || 1)) * 8;
    var assetX = centerX + Math.cos(angle) * radius;
    var assetY = centerY + Math.sin(angle) * radius;
    var assetSize = platformReady ? 5 : 4;

    ctx.fillStyle = platformReady ? "#ffffff" : "#72d7ff";
    ctx.fillRect(assetX - assetSize / 2, assetY - assetSize / 2, assetSize, assetSize);
  }
}

function drawPlanetaryBodies() {
  if (!Array.isArray(world.planetaryBodies) || world.planetaryBodies.length === 0) {
    return;
  }

  var centerX = canvas.width - 92;
  var centerY = 84;
  var interplanetary = world.era === "Interplanetary";

  for (var i = 0; i < world.planetaryBodies.length; i++) {
    var body = world.planetaryBodies[i];
    var angle = ((body.orbitAngle + world.tick * 0.02) % 360) * Math.PI / 180;
    var radius = Math.max(1, Math.round(Number(body.orbitRadius) || 64)) * 0.72;
    var bodyX = centerX + Math.cos(angle) * radius;
    var bodyY = centerY + Math.sin(angle) * radius;
    var size = interplanetary ? 7 : 5;

    ctx.beginPath();
    ctx.arc(bodyX, bodyY, size, 0, Math.PI * 2);
    ctx.fillStyle = interplanetary ? "rgba(112, 240, 208, 0.92)" : "rgba(242, 184, 91, 0.88)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.38)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawProbeMissions() {
  if (!Array.isArray(world.probeMissions) || world.probeMissions.length === 0) {
    return;
  }

  var centerX = canvas.width - 92;
  var centerY = 84;

  for (var i = 0; i < world.probeMissions.length; i++) {
    var mission = world.probeMissions[i];
    var targetBody = typeof getPlanetaryBodyById === "function" ? getPlanetaryBodyById(mission.targetBodyId) : null;

    if (!targetBody) {
      continue;
    }

    var angle = ((targetBody.orbitAngle + world.tick * 0.02) % 360) * Math.PI / 180;
    var radius = Math.max(1, Math.round(Number(targetBody.orbitRadius) || 64)) * 0.72;
    var targetX = centerX + Math.cos(angle) * radius;
    var targetY = centerY + Math.sin(angle) * radius;
    var progress = Math.max(0, Math.min(1, Number(mission.progress) || 0));
    var probeX = centerX + (targetX - centerX) * progress;
    var probeY = centerY + (targetY - centerY) * progress;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(targetX, targetY);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = mission.isComplete ? "#70f0d0" : "#ffffff";
    ctx.fillRect(probeX - 2, probeY - 2, 4, 4);
  }
}

function drawStarSystems() {
  if (!Array.isArray(world.starSystems) || world.starSystems.length === 0) {
    return;
  }

  var centerX = canvas.width - 92;
  var centerY = 84;
  var mapRadius = 88;
  var galacticMap = world.era === "Galactic Map" || world.era === "Galactic Influence" || world.era === "Proto-Empire";
  var empireEra = world.era === "Galactic Influence" || world.era === "Proto-Empire";

  ctx.beginPath();
  ctx.arc(centerX, centerY, mapRadius, 0, Math.PI * 2);
  ctx.strokeStyle = empireEra ? "rgba(255, 242, 107, 0.42)" : (galacticMap ? "rgba(200, 132, 255, 0.34)" : "rgba(255, 255, 255, 0.16)");
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 10]);
  ctx.stroke();
  ctx.setLineDash([]);

  for (var i = 0; i < world.starSystems.length; i++) {
    var system = world.starSystems[i];

    if (!system.isMapped) {
      continue;
    }

    var starX = centerX + system.mapX * mapRadius;
    var starY = centerY + system.mapY * mapRadius;
    var claimed = Boolean(system.isClaimed);
    var size = claimed ? 8 : (galacticMap ? 5 : 4);

    if (claimed) {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(starX, starY);
      ctx.strokeStyle = world.era === "Proto-Empire" ? "rgba(255, 242, 107, 0.36)" : "rgba(112, 240, 208, 0.30)";
      ctx.lineWidth = world.era === "Proto-Empire" ? 2 : 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(starX, starY, 9, 0, Math.PI * 2);
      ctx.fillStyle = world.era === "Proto-Empire" ? "rgba(255, 242, 107, 0.18)" : "rgba(112, 240, 208, 0.16)";
      ctx.fill();
    }

    ctx.fillStyle = claimed ? (world.era === "Proto-Empire" ? "#fff26b" : "#70f0d0") : (galacticMap ? "#c884ff" : "#ffffff");
    ctx.fillRect(starX - size / 2, starY - size / 2, size, size);
  }
}

function getRenderedStarSystemById(systemId) {
  if (typeof getStarSystemById === "function") {
    return getStarSystemById(systemId);
  }

  if (!Array.isArray(world.starSystems)) {
    return null;
  }

  for (var i = 0; i < world.starSystems.length; i++) {
    if (world.starSystems[i].id === systemId) {
      return world.starSystems[i];
    }
  }

  return null;
}

function drawEmpireSectors() {
  if (!Array.isArray(world.empireSectors) || world.empireSectors.length === 0) {
    return;
  }

  var centerX = canvas.width - 92;
  var centerY = 84;
  var mapRadius = 88;
  var galacticEmpire = world.era === "Galactic Empire" || world.era === "Ascendant Empire";

  for (var i = 0; i < world.empireSectors.length; i++) {
    var sector = world.empireSectors[i];
    var system = getRenderedStarSystemById(sector.systemId);

    if (!system) {
      continue;
    }

    var sectorX = centerX + system.mapX * mapRadius;
    var sectorY = centerY + system.mapY * mapRadius;
    var sectorRadius = Math.max(8, Math.round((Number(sector.controlRadius) || 0.18) * mapRadius));

    ctx.beginPath();
    ctx.arc(sectorX, sectorY, sectorRadius, 0, Math.PI * 2);
    ctx.fillStyle = galacticEmpire ? "rgba(255, 242, 107, 0.14)" : "rgba(200, 132, 255, 0.12)";
    ctx.fill();
    ctx.strokeStyle = galacticEmpire ? "rgba(255, 242, 107, 0.44)" : "rgba(200, 132, 255, 0.34)";
    ctx.lineWidth = galacticEmpire ? 2 : 1;
    ctx.stroke();
  }
}

function drawEmpireLegacy() {
  if (Math.max(0, Math.round(Number(world.empireLegacyLevel) || 0)) <= 0) {
    return;
  }

  var centerX = canvas.width - 92;
  var centerY = 84;
  var legacyLevel = Math.max(0, Math.round(Number(world.empireLegacyLevel) || 0));
  var legacyComplete = Boolean(world.empireLegacyComplete) || world.era === "Ascendant Empire";
  var ringCount = Math.min(4, legacyLevel + 1);

  for (var i = 0; i < ringCount; i++) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20 + i * 14, 0, Math.PI * 2);
    ctx.strokeStyle = legacyComplete ? "rgba(255, 242, 107, 0.42)" : "rgba(112, 240, 208, 0.28)";
    ctx.lineWidth = legacyComplete ? 2 : 1;
    ctx.setLineDash(i % 2 === 0 ? [] : [3, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.fillStyle = legacyComplete ? "#fff26b" : "#70f0d0";
  ctx.fillRect(centerX - 4, centerY - 4, 8, 8);
}

function drawInterstellarFleets() {
  if (!Array.isArray(world.interstellarFleets) || world.interstellarFleets.length === 0) {
    return;
  }

  var centerX = canvas.width - 92;
  var centerY = 84;
  var mapRadius = 88;
  var empireNetwork = world.era === "Empire Network";

  for (var i = 0; i < world.interstellarFleets.length; i++) {
    var fleet = world.interstellarFleets[i];
    var sourceSystem = getRenderedStarSystemById(fleet.sourceSystemId);
    var targetSystem = getRenderedStarSystemById(fleet.targetSystemId);

    if (!sourceSystem || !targetSystem) {
      continue;
    }

    var sourceX = centerX + sourceSystem.mapX * mapRadius;
    var sourceY = centerY + sourceSystem.mapY * mapRadius;
    var targetX = centerX + targetSystem.mapX * mapRadius;
    var targetY = centerY + targetSystem.mapY * mapRadius;
    var progress = Math.max(0, Math.min(1, Number(fleet.progress) || 0));
    var fleetX = sourceX + (targetX - sourceX) * progress;
    var fleetY = sourceY + (targetY - sourceY) * progress;
    var fleetSize = fleet.isComplete ? 5 : 4;

    ctx.beginPath();
    ctx.moveTo(sourceX, sourceY);
    ctx.lineTo(targetX, targetY);
    ctx.strokeStyle = fleet.isComplete ? (empireNetwork ? "rgba(255, 242, 107, 0.34)" : "rgba(112, 240, 208, 0.26)") : "rgba(255, 255, 255, 0.20)";
    ctx.lineWidth = fleet.isComplete && empireNetwork ? 2 : 1;
    ctx.setLineDash(fleet.isComplete ? [] : [3, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = fleet.isComplete ? (empireNetwork ? "#fff26b" : "#70f0d0") : "#ffffff";
    ctx.fillRect(fleetX - fleetSize / 2, fleetY - fleetSize / 2, fleetSize, fleetSize);
  }
}

function drawScanlines() {
  if (!CONFIG.SHOW_SCANLINES && !CONFIG.PLANET_DEBUG_OVERLAY) {
    return;
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.025)";

  for (var y = 0; y < canvas.height; y += CONFIG.TILE_SIZE * 8) {
    ctx.fillRect(0, y, canvas.width, 1);
  }
}

function drawInspectSelection() {
  if (!world.inspectedTile) {
    return;
  }

  var point = getTileRenderPosition(world.inspectedTile.x, world.inspectedTile.y);

  if (!point) {
    return;
  }

  var size = Math.max(5, CONFIG.TILE_SIZE * 2.4 * (point.scale || 1));

  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  ctx.beginPath();
  ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();
}

window.buildTerrainCache = buildTerrainCache;
window.invalidateTerrainCache = invalidateTerrainCache;

window.drawWorld = function() {
  drawTerrain();
  drawPlanetReferenceGrid();
  drawSettlementInfluence();
  drawSettlementRoutes();
  drawFood();
  drawSettlements();
  drawOrganisms();
  drawOrbitalAssets();
  drawPlanetaryBodies();
  drawProbeMissions();
  drawEmpireSectors();
  drawInterstellarFleets();
  drawEmpireLegacy();
  drawStarSystems();
  drawInspectSelection();
  drawScanlines();
};
