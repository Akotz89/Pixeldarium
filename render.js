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

function blendHexColorWithRgb(fromHex, toRgb, amount) {
  var from = getRgbFromHex(fromHex);
  var normalizedAmount = clamp(Number(amount) || 0, 0, 1);
  var target = clampRgb(toRgb || from);

  return getHexFromRgb(
    from.red + (target.red - from.red) * normalizedAmount,
    from.green + (target.green - from.green) * normalizedAmount,
    from.blue + (target.blue - from.blue) * normalizedAmount
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

function getPlanetGlobeRasterScale(width, height, maxSizeOverride) {
  var configuredMaxSize = Number.isFinite(Number(maxSizeOverride))
    ? Number(maxSizeOverride)
    : Number(CONFIG.PLANET_GLOBE_RASTER_MAX_SIZE) || 720;
  var maxSize = Math.max(48, configuredMaxSize);
  var largestSize = Math.max(1, Number(width) || 1, Number(height) || 1);

  return clamp(maxSize / largestSize, 0.04, 1);
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

function getPlanetTileNumericSignal(tile, key, fallback) {
  return tile && Number.isFinite(Number(tile[key])) ? Number(tile[key]) : fallback;
}

function getPlanetImageryBlendSignals(latitude, longitude) {
  var normalizedLatitude = clamp(Number(latitude) || 0, -90, 90);
  var normalizedLongitude = normalizeLongitude(longitude);
  var tilePosition = getTileFromLatLon(normalizedLatitude, normalizedLongitude);
  var fallbackTile = getPlanetTile(tilePosition.x, tilePosition.y) || {};
  var tileBlend = typeof getPlanetSurfaceTileBlend === "function"
    ? getPlanetSurfaceTileBlend(normalizedLatitude, normalizedLongitude)
    : null;
  var blendItems = tileBlend && Array.isArray(tileBlend.tiles) && tileBlend.tiles.length > 0
    ? tileBlend.tiles
    : [{ tile: fallbackTile, biome: fallbackTile.biome || "unknown", weight: 1 }];
  var signals = {
    tile: fallbackTile,
    tileBlend: tileBlend,
    biomeWeights: {},
    dominantBiome: fallbackTile.biome || "unknown",
    dominantWeight: 0,
    transitionStrength: 0,
    elevation: 0,
    moisture: 0,
    highlandLift: 0,
    coastFactor: 0,
    coastlineNoise: 0,
    shallowWater: 0,
    shelfStrength: 0,
    riverStrength: 0,
    riverMouth: 0,
    ridgeStrength: 0,
    roughness: 0,
    terrainSlope: 0,
    terrainHillshade: 0,
    snowSignal: 0,
    totalWeight: 0
  };

  for (var i = 0; i < blendItems.length; i++) {
    var item = blendItems[i];
    var tile = item.tile || getPlanetTile(item.x, item.y) || fallbackTile;
    var biome = item.biome || (tile && tile.biome) || "unknown";
    var weight = clamp(Number(item.weight) || 0, 0, 1);

    if (weight <= 0) {
      continue;
    }

    signals.biomeWeights[biome] = (signals.biomeWeights[biome] || 0) + weight;
    signals.elevation += getPlanetTileNumericSignal(tile, "elevation", 0) * weight;
    signals.moisture += getPlanetTileNumericSignal(tile, "moisture", 0.8) * weight;
    signals.highlandLift += getPlanetTileNumericSignal(tile, "highlandLift", 0) * weight;
    signals.coastFactor += getPlanetTileNumericSignal(tile, "coastFactor", 0) * weight;
    signals.coastlineNoise += getPlanetTileNumericSignal(tile, "coastlineNoise", 0) * weight;
    signals.shallowWater += getPlanetTileNumericSignal(tile, "shallowWater", 0) * weight;
    signals.shelfStrength += getPlanetTileNumericSignal(tile, "shelfStrength", 0) * weight;
    signals.riverStrength += getPlanetTileNumericSignal(tile, "riverStrength", 0) * weight;
    signals.riverMouth += getPlanetTileNumericSignal(tile, "riverMouth", 0) * weight;
    signals.ridgeStrength += getPlanetTileNumericSignal(tile, "ridgeStrength", 0) * weight;
    signals.roughness += getPlanetTileNumericSignal(tile, "roughness", 0) * weight;
    signals.terrainSlope += getPlanetTileNumericSignal(tile, "terrainSlope", 0) * weight;
    signals.terrainHillshade += getPlanetTileNumericSignal(tile, "terrainHillshade", 0.55) * weight;
    signals.snowSignal += getPlanetSurfaceSnowSignal(tile, normalizedLatitude) * weight;
    signals.totalWeight += weight;
  }

  if (signals.totalWeight <= 0) {
    signals.totalWeight = 1;
    signals.biomeWeights[signals.dominantBiome] = 1;
    signals.moisture = getPlanetTileNumericSignal(fallbackTile, "moisture", 0.8);
    signals.terrainHillshade = getPlanetTileNumericSignal(fallbackTile, "terrainHillshade", 0.55);
    signals.snowSignal = getPlanetSurfaceSnowSignal(fallbackTile, normalizedLatitude);
  } else if (Math.abs(signals.totalWeight - 1) > 0.000001) {
    Object.keys(signals.biomeWeights).forEach(function(biome) {
      signals.biomeWeights[biome] = signals.biomeWeights[biome] / signals.totalWeight;
    });
    [
      "elevation",
      "moisture",
      "highlandLift",
      "coastFactor",
      "coastlineNoise",
      "shallowWater",
      "shelfStrength",
      "riverStrength",
      "riverMouth",
      "ridgeStrength",
      "roughness",
      "terrainSlope",
      "terrainHillshade",
      "snowSignal"
    ].forEach(function(key) {
      signals[key] = signals[key] / signals.totalWeight;
    });
    signals.totalWeight = 1;
  }

  Object.keys(signals.biomeWeights).forEach(function(biome) {
    if (signals.biomeWeights[biome] > signals.dominantWeight) {
      signals.dominantWeight = signals.biomeWeights[biome];
      signals.dominantBiome = biome;
    }
  });

  signals.transitionStrength = clamp(1 - signals.dominantWeight, 0, 1);
  return signals;
}

function getPlanetMaterialPixelNoise(latitude, longitude, patchMeters, seedOffset) {
  var surfaceMeters = getSurfaceMeterCoordinate(latitude, longitude);
  var normalizedPatchMeters = Math.max(1, Number(patchMeters) || 1);
  var smoothNoise = getPlanetSmoothMeterNoise(
    surfaceMeters.eastMeters,
    surfaceMeters.northMeters,
    normalizedPatchMeters,
    seedOffset
  );
  var quantizedSteps = normalizedPatchMeters >= 10000
    ? 10
    : (normalizedPatchMeters >= 4000 ? 8 : 6);

  return Math.round(clamp(smoothNoise, 0, 1) * quantizedSteps) / quantizedSteps;
}

function getPlanetImageryWarpedLatLon(latitude, longitude) {
  var normalizedLatitude = clamp(Number(latitude) || 0, -90, 90);
  var normalizedLongitude = normalizeLongitude(longitude);
  var surfaceMeters = getSurfaceMeterCoordinate(normalizedLatitude, normalizedLongitude);
  var longitudeStep = typeof getPlanetTileLongitudeStepDeg === "function" ? getPlanetTileLongitudeStepDeg() : 360 / Math.max(1, WORLD_WIDTH);
  var latitudeStep = typeof getPlanetTileLatitudeStepDeg === "function" ? getPlanetTileLatitudeStepDeg() : 180 / Math.max(1, WORLD_HEIGHT);
  var broadEast = getPlanetSmoothMeterNoise(surfaceMeters.eastMeters, surfaceMeters.northMeters, 190000, 1181) - 0.5;
  var broadNorth = getPlanetSmoothMeterNoise(surfaceMeters.eastMeters, surfaceMeters.northMeters, 170000, 1213) - 0.5;
  var localEast = getPlanetSmoothMeterNoise(surfaceMeters.eastMeters, surfaceMeters.northMeters, 72000, 1249) - 0.5;
  var localNorth = getPlanetSmoothMeterNoise(surfaceMeters.eastMeters, surfaceMeters.northMeters, 68000, 1283) - 0.5;
  var latitudeFalloff = clamp(1 - Math.abs(normalizedLatitude) / 88, 0.35, 1);
  var warpScale = 0.34 * latitudeFalloff;

  return {
    latitude: clamp(normalizedLatitude + (broadNorth * 0.70 + localNorth * 0.30) * latitudeStep * warpScale, -90, 90),
    longitude: normalizeLongitude(normalizedLongitude + (broadEast * 0.68 + localEast * 0.32) * longitudeStep * warpScale)
  };
}

function getPlanetPixelArtQuantizedRgb(rgb, latitude, longitude) {
  var color = clampRgb(rgb);
  var surfaceMeters = getSurfaceMeterCoordinate(latitude, longitude);
  var dither = getPlanetSmoothMeterNoise(surfaceMeters.eastMeters, surfaceMeters.northMeters, 2400, 1543) - 0.5;
  var grain = getPlanetSmoothMeterNoise(surfaceMeters.eastMeters, surfaceMeters.northMeters, 820, 1567) - 0.5;
  var step = 4;
  var offset = (dither * 3.0) + (grain * 1.4);

  function quantizeChannel(value, bias) {
    return clamp(Math.round((Number(value) + offset + bias) / step) * step, 0, 255);
  }

  return {
    red: quantizeChannel(color.red, 0.5),
    green: quantizeChannel(color.green, 0),
    blue: quantizeChannel(color.blue, -0.5)
  };
}

function applyPlanetMaterialPixelAccents(color, latitude, longitude, tile) {
  var biome = tile && tile.biome ? tile.biome : "unknown";
  var coarse = getPlanetMaterialPixelNoise(latitude, longitude, 18000, 503);
  var fine = getPlanetMaterialPixelNoise(latitude, longitude, 6200, 607);
  var fleck = getPlanetMaterialPixelNoise(latitude, longitude, 2200, 709);
  var ridge = clamp(tile && Number.isFinite(Number(tile.ridgeStrength)) ? Number(tile.ridgeStrength) : 0, 0, 1);
  var roughness = clamp(tile && Number.isFinite(Number(tile.roughness)) ? Number(tile.roughness) : 0, 0, 1);
  var coast = clamp(tile && Number.isFinite(Number(tile.coastFactor)) ? Number(tile.coastFactor) : 0, 0, 1);
  var absLatitude = Math.abs(Number(latitude) || 0);
  var elevationValue = tile && Number.isFinite(Number(tile.elevation)) ? Number(tile.elevation) : 0;
  var elevation = clamp((Math.tanh(elevationValue / 2) + 1) / 2, 0, 1);
  var highland = clamp((elevation - 0.58) / 0.34, 0, 1);
  var polar = clamp((absLatitude - 54) / 32, 0, 1);
  var shallowWater = clamp(Math.max(
    tile && Number.isFinite(Number(tile.shallowWater)) ? Number(tile.shallowWater) : 0,
    tile && Number.isFinite(Number(tile.shelfStrength)) ? Number(tile.shelfStrength) : 0
  ), 0, 1);
  var snowSignal = getPlanetSurfaceSnowSignal(tile, latitude);
  var snowVisual = getPlanetCloudlessSnowVisualAmount(biome, snowSignal, polar, highland, ridge);
  var material = color;

  if (biome === "ocean") {
    material = blendRgbWithHex(material, coarse > 0.58 ? "#0d4e70" : "#03152f", clamp(0.035 + fine * 0.045, 0, 0.08));
    material = blendRgbWithHex(material, "#6fb9b1", clamp(shallowWater * 0.10 + coast * 0.05 + fleck * coast * 0.05, 0, 0.16));
  } else if (biome === "forest") {
    material = blendRgbWithHex(material, coarse > 0.50 ? "#143d21" : "#06180e", clamp(0.05 + fine * 0.08, 0, 0.13));
    material = blendRgbWithHex(material, "#2d6b35", clamp(fleck * 0.045, 0, 0.06));
  } else if (biome === "grassland") {
    material = blendRgbWithHex(material, coarse > 0.54 ? "#7c8d42" : "#244d28", clamp(0.045 + fine * 0.065, 0, 0.12));
    material = blendRgbWithHex(material, "#917638", clamp((1 - fine) * 0.04, 0, 0.06));
  } else if (biome === "desert") {
    material = blendRgbWithHex(material, coarse > 0.48 ? "#c2a25a" : "#755e31", clamp(0.055 + fine * 0.070, 0, 0.14));
    material = blendRgbWithHex(material, "#564f43", clamp((ridge + roughness) * 0.035 + fleck * 0.035, 0, 0.09));
  } else if (biome === "tundra") {
    material = blendRgbWithHex(material, coarse > 0.50 ? "#7f8b78" : "#465a50", clamp(0.045 + fine * 0.060, 0, 0.12));
    material = blendRgbWithHex(material, "#cfd9d7", clamp(snowSignal * 0.18, 0, 0.22));
  } else if (biome === "ice") {
    material = blendRgbWithHex(material, coarse > 0.48 ? "#f0f8f9" : "#8fbfd1", clamp(0.08 + fine * 0.08, 0, 0.18));
    material = blendRgbWithHex(material, "#d7eef7", clamp(fleck * 0.08, 0, 0.10));
  }

  material = blendRgbWithHex(material, "#68655a", clamp(ridge * 0.08 + roughness * 0.05, 0, 0.15));

  if (biome !== "ice") {
    material = blendRgbWithHex(material, "#e6f2f3", clamp(snowVisual * 0.72, 0, 0.18));
  }

  return clampRgb(shadeRgb(material, clamp(0.94 + (coarse - 0.5) * 0.10 + (fine - 0.5) * 0.08, 0.84, 1.08)));
}

function makePlanetImagerySignalTile(biome, signals, latitude) {
  return {
    biome: biome,
    latitude: latitude,
    moisture: signals.moisture,
    elevation: signals.elevation,
    highlandLift: signals.highlandLift,
    coastFactor: signals.coastFactor,
    coastlineNoise: signals.coastlineNoise,
    shallowWater: signals.shallowWater,
    shelfStrength: signals.shelfStrength,
    riverStrength: signals.riverStrength,
    riverMouth: signals.riverMouth,
    ridgeStrength: signals.ridgeStrength,
    roughness: signals.roughness,
    terrainSlope: signals.terrainSlope,
    terrainHillshade: signals.terrainHillshade
  };
}

function getPlanetCloudlessSnowVisualAmount(biome, snowSignal, polar, highland, ridge) {
  var normalizedSnow = clamp(Number(snowSignal) || 0, 0, 1);
  var normalizedPolar = clamp(Number(polar) || 0, 0, 1);
  var normalizedHighland = clamp(Number(highland) || 0, 0, 1);
  var normalizedRidge = clamp(Number(ridge) || 0, 0, 1);
  var mountainGate = clamp(normalizedHighland * 0.52 + normalizedRidge * 0.28 + normalizedPolar * 0.48, 0, 1);

  if (biome === "ice") {
    return clamp(0.12 + normalizedSnow * 0.16 + normalizedPolar * 0.06, 0, 0.32);
  }

  if (biome === "ocean") {
    return clamp(normalizedSnow * normalizedPolar * 0.026, 0, 0.035);
  }

  if (biome === "tundra") {
    return clamp(normalizedSnow * mountainGate * 0.14 + normalizedPolar * 0.026, 0, 0.15);
  }

  return clamp(normalizedSnow * mountainGate * 0.075, 0, 0.09);
}

function getPlanetGlobeLandformIdentity(biome, signals, noise, surfaceMeters, normalizedLatitude) {
  var normalizedBiome = biome || "unknown";
  var elevation = clamp((Math.tanh((Number(signals && signals.elevation) || 0) / 2) + 1) / 2, 0, 1);
  var moisture = clamp((Number(signals && signals.moisture) || 0.8) / 1.8, 0, 1);
  var coast = clamp(Number(signals && signals.coastFactor) || 0, 0, 1);
  var shelf = clamp(Math.max(Number(signals && signals.shallowWater) || 0, Number(signals && signals.shelfStrength) || 0), 0, 1);
  var river = clamp(Number(signals && signals.riverStrength) || 0, 0, 1);
  var riverMouth = clamp(Number(signals && signals.riverMouth) || 0, 0, 1);
  var ridge = clamp(Number(signals && signals.ridgeStrength) || 0, 0, 1);
  var roughness = clamp(Number(signals && signals.roughness) || 0, 0, 1);
  var slope = clamp(Number(signals && signals.terrainSlope) || 0, 0, 1);
  var snowSignal = clamp(Number(signals && signals.snowSignal) || 0, 0, 1);
  var broad = clamp(Number(noise && noise.broad) || 0.5, 0, 1);
  var regional = clamp(Number(noise && noise.regional) || 0.5, 0, 1);
  var local = clamp(Number(noise && noise.local) || 0.5, 0, 1);
  var fine = clamp(Number(noise && noise.fine) || 0.5, 0, 1);
  var eastMeters = Number(surfaceMeters && surfaceMeters.eastMeters) || 0;
  var northMeters = Number(surfaceMeters && surfaceMeters.northMeters) || 0;
  var polar = clamp((Math.abs(Number(normalizedLatitude) || 0) - 54) / 32, 0, 1);
  var highland = clamp((elevation - 0.58) / 0.34, 0, 1);
  var dry = clamp(1 - moisture, 0, 1);
  var relief = clamp(highland * 0.34 + ridge * 0.34 + roughness * 0.17 + slope * 0.15, 0, 1);
  var directionalBands = Math.sin(eastMeters * 0.000018 + northMeters * 0.000010 + regional * Math.PI * 2) * 0.5 + 0.5;
  var brokenBands = clamp(directionalBands * 0.62 + local * 0.24 + fine * 0.14, 0, 1);
  var identity = {
    type: "lowland",
    color: "#5f6b45",
    amount: clamp(0.025 + relief * 0.09 + Math.abs(broad - 0.5) * 0.04, 0, 0.18),
    snowcap: 0,
    relief: relief
  };

  if (normalizedBiome === "ocean") {
    var basin = clamp((1 - elevation) * 0.52 + (1 - shelf) * 0.36 + (1 - coast) * 0.12, 0, 1);

    identity.type = shelf > 0.34 || coast > 0.42 || riverMouth > 0.18 ? "continental-shelf" : "deep-basin";
    identity.color = identity.type === "continental-shelf" ? "#7bc7ad" : "#001229";
    identity.amount = clamp(0.05 + basin * 0.12 + shelf * 0.16 + coast * 0.08 + brokenBands * 0.035, 0, 0.25);
    return identity;
  }

  if (normalizedBiome === "forest") {
    identity.type = relief > 0.50 ? "forested-highland" : "canopy";
    identity.color = moisture > 0.56 ? "#0b2e19" : "#26452a";
    identity.amount = clamp(0.05 + moisture * 0.08 + (1 - brokenBands) * 0.04 + relief * 0.035, 0, 0.19);
  } else if (normalizedBiome === "grassland") {
    identity.type = dry > 0.50 ? "dry-plain" : "green-plain";
    identity.color = dry > 0.50 ? "#9b853f" : "#3f7137";
    identity.amount = clamp(0.04 + moisture * 0.045 + dry * 0.075 + relief * 0.05, 0, 0.18);
  } else if (normalizedBiome === "desert") {
    identity.type = relief > 0.46 ? "rocky-desert" : "dune-field";
    identity.color = identity.type === "rocky-desert" ? "#6b6250" : "#c0a057";
    identity.amount = clamp(0.07 + dry * 0.10 + brokenBands * 0.07 + relief * 0.06, 0, 0.24);
  } else if (normalizedBiome === "tundra") {
    identity.type = polar > 0.40 ? "cold-steppe" : "scrubland";
    identity.color = polar > 0.40 ? "#8c9a91" : "#596c60";
    identity.amount = clamp(0.05 + polar * 0.07 + relief * 0.06 + brokenBands * 0.03, 0, 0.20);
  } else if (normalizedBiome === "ice") {
    identity.type = relief > 0.36 ? "ice-ridge" : "ice-sheet";
    identity.color = identity.type === "ice-ridge" ? "#83b9ce" : "#eaf6f8";
    identity.amount = clamp(0.08 + polar * 0.10 + relief * 0.08 + (1 - brokenBands) * 0.035, 0, 0.26);
  }

  if (normalizedBiome !== "ice" && relief > 0.54) {
    identity.type = relief > 0.68 || highland > 0.62 ? "mountain-highland" : identity.type;
    identity.color = blendHexColors(identity.color, "#777264", clamp(0.24 + relief * 0.28, 0, 0.52));
    identity.amount = clamp(identity.amount + relief * 0.08, 0, 0.24);
    identity.snowcap = clamp((snowSignal * 0.36 + polar * 0.18) * relief - 0.06, 0, 0.16);
  }

  if (coast > 0.42 || shelf > 0.44) {
    identity.type = identity.type === "mountain-highland" ? identity.type : "coastal-" + identity.type;
    identity.color = blendHexColors(identity.color, "#b5ab70", clamp(coast * 0.22 + shelf * 0.12, 0, 0.30));
    identity.amount = clamp(identity.amount + coast * 0.04 + shelf * 0.035, 0, 0.25);
  }

  if (river > 0.40) {
    identity.color = blendHexColors(identity.color, "#245d70", clamp(river * 0.38, 0, 0.42));
    identity.amount = clamp(identity.amount + river * 0.04, 0, 0.25);
  }

  return identity;
}

function getPlanetLandformTerrainBand(biome, signals, noise, normalizedLatitude) {
  var normalizedBiome = biome || "unknown";
  var elevationValue = signals && Number.isFinite(Number(signals.elevation)) ? Number(signals.elevation) : 0;
  var moistureValue = signals && Number.isFinite(Number(signals.moisture)) ? Number(signals.moisture) : 0.8;
  var elevation = clamp((Math.tanh(elevationValue) + 1) / 2, 0, 1);
  var moisture = clamp(moistureValue / 1.8, 0, 1);
  var highland = clamp((elevation - 0.58) / 0.34, 0, 1);
  var ridge = clamp(signals && Number.isFinite(Number(signals.ridgeStrength)) ? Number(signals.ridgeStrength) : 0, 0, 1);
  var roughness = clamp(signals && Number.isFinite(Number(signals.roughness)) ? Number(signals.roughness) : 0, 0, 1);
  var slope = clamp(signals && Number.isFinite(Number(signals.terrainSlope)) ? Number(signals.terrainSlope) : 0, 0, 1);
  var hillshade = clamp(signals && Number.isFinite(Number(signals.terrainHillshade)) ? Number(signals.terrainHillshade) : 0.55, 0, 1);
  var coast = clamp(signals && Number.isFinite(Number(signals.coastFactor)) ? Number(signals.coastFactor) : 0, 0, 1);
  var shelf = clamp(Math.max(
    signals && Number.isFinite(Number(signals.shallowWater)) ? Number(signals.shallowWater) : 0,
    signals && Number.isFinite(Number(signals.shelfStrength)) ? Number(signals.shelfStrength) : 0
  ), 0, 1);
  var river = clamp(signals && Number.isFinite(Number(signals.riverStrength)) ? Number(signals.riverStrength) : 0, 0, 1);
  var polar = clamp((Math.abs(Number(normalizedLatitude) || 0) - 54) / 32, 0, 1);
  var regional = noise ? clamp(Number(noise.regional) || 0, 0, 1) : 0.5;
  var fine = noise ? clamp(Number(noise.fine) || 0, 0, 1) : 0.5;
  var bandNoise = Math.round(clamp(regional * 0.55 + fine * 0.45, 0, 1) * 6) / 6;
  var relief = clamp(highland * 0.34 + ridge * 0.28 + roughness * 0.13 + slope * 0.17 + Math.abs(hillshade - 0.5) * 0.12, 0, 1);
  var dry = clamp(1 - moisture, 0, 1);
  var amount = clamp(0.025 + relief * 0.16 + bandNoise * 0.045, 0, 0.24);
  var color = "#6b6a5f";

  if (normalizedBiome === "ocean") {
    amount = clamp(0.04 + shelf * 0.14 + coast * 0.07 + (1 - elevation) * 0.035, 0, 0.20);
    color = shelf > 0.36 || coast > 0.40 ? "#69b7a6" : "#021631";
  } else if (normalizedBiome === "forest") {
    color = relief > 0.44 ? "#5f674b" : (moisture > 0.58 ? "#0a2516" : "#24442a");
    amount = clamp(amount + moisture * 0.035 - dry * 0.025, 0, 0.23);
  } else if (normalizedBiome === "grassland") {
    color = relief > 0.50 ? "#77735a" : (dry > 0.48 ? "#a08a43" : "#47723a");
  } else if (normalizedBiome === "desert") {
    color = relief > 0.42 ? "#786b53" : "#c3a456";
    amount = clamp(amount + dry * 0.05, 0, 0.27);
  } else if (normalizedBiome === "tundra") {
    color = relief > 0.36 || polar > 0.32 ? "#a3aca1" : "#5f7068";
    amount = clamp(amount + polar * 0.035, 0, 0.25);
  } else if (normalizedBiome === "ice") {
    color = relief > 0.38 ? "#88bdd2" : "#f2fbff";
    amount = clamp(0.04 + relief * 0.10 + polar * 0.045, 0, 0.19);
  }

  if (river > 0.36 && normalizedBiome !== "ocean" && normalizedBiome !== "ice") {
    color = "#245d70";
    amount = clamp(amount + river * 0.08, 0, 0.28);
  }

  return {
    color: color,
    amount: amount,
    relief: relief,
    bandNoise: bandNoise
  };
}

function getPlanetImageryBiomeRgb(baseColor, biome, signals, surfaceMeters, noise, texture, normalizedLatitude, normalizedLongitude) {
  var color = clampRgb(baseColor);
  var broad = noise ? clamp(Number(noise.broad) || 0, 0, 1) : 0.5;
  var regional = noise ? clamp(Number(noise.regional) || 0, 0, 1) : 0.5;
  var local = noise ? clamp(Number(noise.local) || 0, 0, 1) : 0.5;
  var fine = noise ? clamp(Number(noise.fine) || 0, 0, 1) : 0.5;
  var micro = noise ? clamp(Number(noise.micro) || 0, 0, 1) : 0.5;
  var elevation = clamp((Math.tanh(signals.elevation / 2) + 1) / 2, 0, 1);
  var moisture = clamp(signals.moisture / 1.8, 0, 1);
  var highland = clamp((elevation - 0.58) / 0.34, 0, 1);
  var polar = clamp((Math.abs(normalizedLatitude) - 54) / 32, 0, 1);
  var coast = clamp(signals.coastFactor, 0, 1);
  var shallowWater = clamp(Math.max(signals.shallowWater, signals.shelfStrength), 0, 1);
  var coastlineNoise = clamp(signals.coastlineNoise, 0, 1);
  var river = clamp(signals.riverStrength, 0, 1);
  var riverMouth = clamp(signals.riverMouth, 0, 1);
  var ridge = clamp(signals.ridgeStrength, 0, 1);
  var roughness = clamp(signals.roughness, 0, 1);
  var snowSignal = clamp(signals.snowSignal, 0, 1);
  var signalTile = makePlanetImagerySignalTile(biome, signals, normalizedLatitude);
  var reliefBand = clamp(highland * 0.38 + ridge * 0.34 + roughness * 0.16 + regional * 0.12, 0, 1);
  var weathering = clamp((broad - 0.5) * 0.34 + (local - 0.5) * 0.22 + (fine - 0.5) * 0.14 + 0.5, 0, 1);
  var terrainGrain = clamp((regional - 0.5) * 0.36 + (fine - 0.5) * 0.28 + (micro - 0.5) * 0.18 + 0.5, 0, 1);
  var snowVisual = getPlanetCloudlessSnowVisualAmount(biome, snowSignal, polar, highland, ridge);
  var terrainShade = clamp(
    0.50 +
      texture * 0.68 +
      (signals.terrainHillshade - 0.5) * 0.20 +
      ridge * 0.035 +
      highland * 0.025 -
      reliefBand * 0.018,
    0,
    1
  );
  var terrainBand = getPlanetLandformTerrainBand(biome, signals, noise, normalizedLatitude);
  var landformIdentity = getPlanetGlobeLandformIdentity(biome, signals, noise, surfaceMeters, normalizedLatitude);

  if (biome === "ocean") {
    var current = Math.sin((surfaceMeters.eastMeters * 0.000021) + (surfaceMeters.northMeters * 0.000011)) * 0.5 + 0.5;
    var gyre = Math.sin((surfaceMeters.eastMeters * 0.000006) - (surfaceMeters.northMeters * 0.000017)) * 0.5 + 0.5;
    var depth = clamp((1 - shallowWater) * 0.58 + (1 - elevation) * 0.32 + (1 - coast) * 0.10, 0, 1);
    var shelf = clamp(shallowWater * 0.72 + coast * 0.34 + riverMouth * 0.22 + coastlineNoise * coast * 0.08, 0, 1);

    color = blendRgbWithHex(color, "#001027", clamp(depth * 0.22, 0, 0.24));
    color = blendRgbWithHex(color, "#06405f", clamp((1 - depth) * 0.10 + current * 0.04, 0, 0.14));
    color = blendRgbWithHex(color, "#0d7894", clamp(shelf * 0.26 + gyre * 0.035, 0, 0.30));
    color = blendRgbWithHex(color, "#8ccfc2", clamp(shelf * coast * 0.24, 0, 0.24));
    color = blendRgbWithHex(color, terrainBand.color, terrainBand.amount);
    color = blendRgbWithHex(color, landformIdentity.color, landformIdentity.amount);
    color = blendRgbWithHex(color, "#d9edf4", snowVisual);
    return applyPlanetMaterialPixelAccents(
      clampRgb(shadeRgb(color, clamp(terrainShade - 0.02 + current * 0.035 + shelf * 0.08 - depth * 0.05, 0, 1))),
      normalizedLatitude,
      normalizedLongitude,
      signalTile
    );
  }

  if (biome === "forest") {
    color = blendRgbWithHex(color, "#071f12", clamp(0.06 + moisture * 0.12 + terrainGrain * 0.04, 0, 0.20));
    color = blendRgbWithHex(color, "#2d6532", clamp(regional * moisture * 0.10 + weathering * 0.035, 0, 0.14));
    color = blendRgbWithHex(color, "#5d7041", clamp(reliefBand * 0.07, 0, 0.10));
  } else if (biome === "grassland") {
    color = blendRgbWithHex(color, "#6f8a3f", clamp(0.06 + moisture * 0.09 + regional * 0.04, 0, 0.16));
    color = blendRgbWithHex(color, "#9a843f", clamp((1 - moisture) * 0.12 + weathering * 0.05, 0, 0.18));
    color = blendRgbWithHex(color, "#365c36", clamp(moisture * (1 - reliefBand) * 0.06, 0, 0.08));
  } else if (biome === "desert") {
    var dune = Math.sin((surfaceMeters.eastMeters + surfaceMeters.northMeters * 0.48) / 85000) * 0.5 + 0.5;
    color = blendRgbWithHex(color, "#c8a85b", clamp(0.10 + dune * 0.10 + fine * 0.05, 0, 0.22));
    color = blendRgbWithHex(color, "#7e6734", clamp((1 - dune) * 0.08 + regional * 0.05, 0, 0.16));
    color = blendRgbWithHex(color, "#5f6154", clamp(reliefBand * 0.12 + roughness * 0.04, 0, 0.18));
  } else if (biome === "tundra") {
    color = blendRgbWithHex(color, "#788777", clamp(0.06 + polar * 0.09 + terrainGrain * 0.05, 0, 0.18));
    color = blendRgbWithHex(color, "#dce5df", clamp(polar * 0.08 + highland * 0.045 + snowVisual * 0.50, 0, 0.18));
    color = blendRgbWithHex(color, "#555e5b", clamp(reliefBand * 0.08, 0, 0.12));
  } else if (biome === "ice") {
    color = blendRgbWithHex(color, "#f3fbff", clamp(0.14 + polar * 0.15 + broad * 0.06, 0, 0.32));
    color = blendRgbWithHex(color, "#8fc6dc", clamp(local * 0.06 + (1 - fine) * 0.05 + reliefBand * 0.04, 0, 0.14));
    color = blendRgbWithHex(color, "#d6eef7", clamp(terrainGrain * 0.06, 0, 0.08));
  }

  color = blendRgbWithHex(color, landformIdentity.color, landformIdentity.amount);
  color = blendRgbWithHex(color, terrainBand.color, terrainBand.amount);
  color = blendRgbWithHex(color, "#244f63", river * 0.18);
  color = blendRgbWithHex(color, "#c8bd82", coast * 0.08);
  color = blendRgbWithHex(color, "#6f6b5d", clamp(highland * 0.11 + ridge * 0.13 + roughness * 0.05, 0, 0.24));
  color = blendRgbWithHex(color, "#e8f4f3", clamp(snowVisual + landformIdentity.snowcap, 0, biome === "ice" ? 0.34 : 0.18));
  return applyPlanetMaterialPixelAccents(
    clampRgb(shadeRgb(color, clamp(terrainShade - (1 - moisture) * 0.02, 0, 1))),
    normalizedLatitude,
    normalizedLongitude,
    signalTile
  );
}

function getPlanetImageryRgbAtLatLon(latitude, longitude, tileRgbCache) {
  var normalizedLatitude = clamp(Number(latitude) || 0, -90, 90);
  var normalizedLongitude = normalizeLongitude(longitude);
  var warped = getPlanetImageryWarpedLatLon(normalizedLatitude, normalizedLongitude);
  var surfaceMeters = getSurfaceMeterCoordinate(warped.latitude, warped.longitude);
  var broad = getPlanetSmoothMeterNoise(surfaceMeters.eastMeters, surfaceMeters.northMeters, 260000, 17);
  var regional = getPlanetSmoothMeterNoise(surfaceMeters.eastMeters, surfaceMeters.northMeters, 82000, 31);
  var local = getPlanetSmoothMeterNoise(surfaceMeters.eastMeters, surfaceMeters.northMeters, 26000, 47);
  var fine = getPlanetSmoothMeterNoise(surfaceMeters.eastMeters, surfaceMeters.northMeters, 8200, 59);
  var micro = getPlanetSmoothMeterNoise(surfaceMeters.eastMeters, surfaceMeters.northMeters, 2600, 67);
  var baseColor = clampRgb(getPlanetSurfaceRgbAtLatLon(warped.latitude, warped.longitude, tileRgbCache));
  var signals = getPlanetImageryBlendSignals(warped.latitude, warped.longitude);
  var biomeWeights = signals.biomeWeights || {};
  var biomeNames = Object.keys(biomeWeights);
  var noise = {
    broad: broad,
    regional: regional,
    local: local,
    fine: fine,
    micro: micro
  };
  var texture = (broad - 0.5) * 0.10 + (regional - 0.5) * 0.08 + (local - 0.5) * 0.06 + (fine - 0.5) * 0.04 + (micro - 0.5) * 0.035;
  var mixed = { red: 0, green: 0, blue: 0 };
  var totalWeight = 0;

  if (biomeNames.length === 0) {
    biomeNames = [signals.dominantBiome || "unknown"];
    biomeWeights[biomeNames[0]] = 1;
  }

  biomeNames.forEach(function(biome) {
    var weight = clamp(Number(biomeWeights[biome]) || 0, 0, 1);
    var candidate;

    if (weight <= 0) {
      return;
    }

    candidate = getPlanetImageryBiomeRgb(
      baseColor,
      biome,
      signals,
      surfaceMeters,
      noise,
      texture,
      warped.latitude,
      warped.longitude
    );
    mixed.red += candidate.red * weight;
    mixed.green += candidate.green * weight;
    mixed.blue += candidate.blue * weight;
    totalWeight += weight;
  });

  if (totalWeight <= 0) {
    return getPlanetPixelArtQuantizedRgb(
      getPlanetImageryBiomeRgb(
        baseColor,
        signals.dominantBiome || "unknown",
        signals,
        surfaceMeters,
        noise,
        texture,
        warped.latitude,
        warped.longitude
      ),
      warped.latitude,
      warped.longitude
    );
  }

  return getPlanetPixelArtQuantizedRgb({
    red: mixed.red / totalWeight,
    green: mixed.green / totalWeight,
    blue: mixed.blue / totalWeight
  }, warped.latitude, warped.longitude);
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
  var shallowWater = clamp(Math.max(
    tile && Number.isFinite(Number(tile.shallowWater)) ? Number(tile.shallowWater) : 0,
    tile && Number.isFinite(Number(tile.shelfStrength)) ? Number(tile.shelfStrength) : 0
  ), 0, 1);
  var river = clamp(tile && Number.isFinite(Number(tile.riverStrength)) ? Number(tile.riverStrength) : 0, 0, 1);
  var riverMouth = clamp(tile && Number.isFinite(Number(tile.riverMouth)) ? Number(tile.riverMouth) : 0, 0, 1);
  var terrainSlope = clamp(tile && Number.isFinite(Number(tile.terrainSlope)) ? Number(tile.terrainSlope) : 0, 0, 1);
  var terrainHillshade = clamp(tile && Number.isFinite(Number(tile.terrainHillshade)) ? Number(tile.terrainHillshade) : 0.55, 0, 1);
  var ridge = clamp(tile && Number.isFinite(Number(tile.ridgeStrength)) ? Number(tile.ridgeStrength) : 0, 0, 1);
  var roughness = clamp(tile && Number.isFinite(Number(tile.roughness)) ? Number(tile.roughness) : 0, 0, 1);
  var snowSignal = getPlanetSurfaceSnowSignal(tile, latitude);
  var snowVisual = getPlanetCloudlessSnowVisualAmount(biome, snowSignal, polar, highland, ridge);
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
  color = blendHexColors(color, "#6f6a5c", clamp(highland * 0.20 + ridge * 0.18, 0, 0.32));
  color = blendHexColors(
    color,
    "#eef6f5",
    biome === "ice" ? clamp(snowSignal * 0.42, 0, 0.52) : clamp(snowVisual * 0.85, 0, 0.22)
  );
  return shadeHexColor(
    color,
    clamp(0.28 + terrainHillshade * 0.40 + elevation * 0.12 + moisture * 0.05 + ridge * 0.035 - dry * 0.05, 0, 1)
  );
}

function getPlanetSurfaceTileBlendRgb(tileBlend) {
  var tiles = tileBlend && Array.isArray(tileBlend.tiles) ? tileBlend.tiles : [];
  var red = 0;
  var green = 0;
  var blue = 0;
  var totalWeight = 0;

  for (var i = 0; i < tiles.length; i++) {
    var item = tiles[i];
    var weight = clamp(Number(item.weight) || 0, 0, 1);
    var tile = item.tile || getPlanetTile(item.x, item.y);

    if (!tile || weight <= 0) {
      continue;
    }

    var rgb = getRgbFromHex(getPlanetTileCompositedColor(tile));

    red += rgb.red * weight;
    green += rgb.green * weight;
    blue += rgb.blue * weight;
    totalWeight += weight;
  }

  if (totalWeight <= 0) {
    return null;
  }

  return clampRgb({
    red: red / totalWeight,
    green: green / totalWeight,
    blue: blue / totalWeight
  });
}

function getPlanetSurfaceBiomeTransitionStrength(sample) {
  var tileBlend = sample && sample.tileBlend ? sample.tileBlend : null;
  var biomeWeights = tileBlend && tileBlend.biomeWeights ? tileBlend.biomeWeights : null;
  var sampleBiome = sample && sample.biome ? sample.biome : "unknown";

  if (!biomeWeights) {
    return 0;
  }

  return clamp(1 - (Number(biomeWeights[sampleBiome]) || 0), 0, 1);
}

function getPlanetSurfaceColorWithTileBlend(sample, localColor) {
  var detail = sample && sample.detail ? sample.detail : {};
  var surface = detail.surface || "";
  var transitionStrength = getPlanetSurfaceBiomeTransitionStrength(sample);
  var targetRgb;
  var strongSurfaceScale = 1;

  if (transitionStrength <= 0.01) {
    return localColor;
  }

  targetRgb = getPlanetSurfaceTileBlendRgb(sample.tileBlend);

  if (!targetRgb) {
    return localColor;
  }

  if (surface === "whitecap" || surface === "deep water" || surface === "ridge ice" || surface === "snow") {
    strongSurfaceScale = 0.18;
  } else if (surface === "open water" || surface === "rock" || surface === "stone") {
    strongSurfaceScale = 0.62;
  }

  return blendHexColorWithRgb(localColor, targetRgb, clamp(transitionStrength * 0.34 * strongSurfaceScale, 0, 0.34));
}

function getPlanetLocalTerrainBandTint(sample) {
  var detail = sample && sample.detail ? sample.detail : {};
  var materialSignals = detail.materialSignals || {};
  var tile = sample && sample.tile ? sample.tile : {};
  var biome = sample && sample.biome ? sample.biome : "unknown";
  var surface = detail.surface || "ground";
  var sampleMeters = Math.max(1, Number(sample && sample.surfaceSampleMeters) || Number(detail.sampleMeters) || 1);
  var elevationSignal = tile && Number.isFinite(Number(tile.elevation))
    ? Number(tile.elevation)
    : ((Number.isFinite(Number(detail.elevation)) ? Number(detail.elevation) : 0.5) - 0.5) * 2;
  var signals = {
    elevation: elevationSignal,
    moisture: tile && Number.isFinite(Number(tile.moisture))
      ? Number(tile.moisture)
      : clamp(Number.isFinite(Number(materialSignals.moisture)) ? Number(materialSignals.moisture) : 0.35, 0, 1) * 1.8,
    ridgeStrength: Number.isFinite(Number(materialSignals.ridge))
      ? Number(materialSignals.ridge)
      : (tile && Number.isFinite(Number(tile.ridgeStrength)) ? Number(tile.ridgeStrength) : 0),
    roughness: Number.isFinite(Number(materialSignals.surfaceRoughness))
      ? Number(materialSignals.surfaceRoughness)
      : (Number.isFinite(Number(detail.roughness)) ? Number(detail.roughness) : 0),
    terrainSlope: Number.isFinite(Number(detail.slope)) ? Number(detail.slope) : 0,
    terrainHillshade: Number.isFinite(Number(detail.hillshade)) ? Number(detail.hillshade) : 0.55,
    coastFactor: Number.isFinite(Number(materialSignals.coast))
      ? Number(materialSignals.coast)
      : (tile && Number.isFinite(Number(tile.coastFactor)) ? Number(tile.coastFactor) : 0),
    shallowWater: Number.isFinite(Number(materialSignals.shallowWater))
      ? Number(materialSignals.shallowWater)
      : (tile && Number.isFinite(Number(tile.shallowWater)) ? Number(tile.shallowWater) : 0),
    shelfStrength: Number.isFinite(Number(materialSignals.shelfStrength))
      ? Number(materialSignals.shelfStrength)
      : (tile && Number.isFinite(Number(tile.shelfStrength)) ? Number(tile.shelfStrength) : 0),
    riverStrength: Number.isFinite(Number(materialSignals.river))
      ? Number(materialSignals.river)
      : (tile && Number.isFinite(Number(tile.riverStrength)) ? Number(tile.riverStrength) : 0)
  };
  var noise = {
    regional: Number.isFinite(Number(detail.meterNoise))
      ? Number(detail.meterNoise)
      : (Number.isFinite(Number(detail.elevation)) ? Number(detail.elevation) : 0.5),
    fine: Number.isFinite(Number(detail.microNoise))
      ? Number(detail.microNoise)
      : (Number.isFinite(Number(detail.roughness)) ? Number(detail.roughness) : 0.5)
  };
  var band = getPlanetLandformTerrainBand(biome, signals, noise, Number(sample && sample.latitude) || Number(tile.latitude) || 0);
  var strongSurfaceScale = 1;
  var scaleAmount = sampleMeters <= 1 ? 0.68 : (sampleMeters <= 5 ? 0.54 : 0.38);

  if (surface === "whitecap" || surface === "deep water" || surface === "ridge ice" || surface === "snow") {
    strongSurfaceScale = 0.18;
  } else if (surface === "open water" || surface === "rock" || surface === "stone" || surface === "ice") {
    strongSurfaceScale = 0.46;
  } else if (surface === "sand" || surface === "dune") {
    strongSurfaceScale = 0.78;
  }

  return {
    color: band.color,
    amount: clamp(band.amount * scaleAmount * strongSurfaceScale, 0, 0.18),
    relief: band.relief,
    bandNoise: band.bandNoise,
    surfaceScale: strongSurfaceScale
  };
}

function getPlanetSurfaceMaterialStrataTint(sample) {
  var detail = sample && sample.detail ? sample.detail : {};
  var strata = detail.materialStrata || null;
  var surface = detail.surface || "ground";
  var sampleMeters = Math.max(1, Number(sample && sample.surfaceSampleMeters) || Number(detail.sampleMeters) || 1);
  var closeScale = sampleMeters <= 1 ? 1 : (sampleMeters <= 5 ? 0.72 : (sampleMeters <= 25 ? 0.34 : 0));
  var strongSurfaceScale = 1;
  var amount;

  if (!strata || closeScale <= 0) {
    return {
      color: "#000000",
      amount: 0
    };
  }

  if (surface === "whitecap" || surface === "deep water" || surface === "snow" || surface === "ice") {
    strongSurfaceScale = 0.38;
  } else if (surface === "open water" || surface === "ridge ice") {
    strongSurfaceScale = 0.58;
  } else if (surface === "rock" || surface === "stone" || surface === "sand" || surface === "dune") {
    strongSurfaceScale = 0.86;
  }

  amount = clamp(
    (
      0.05 +
        (Number(strata.granularity) || 0) * 0.05 +
        (Number(strata.organicCover) || 0) * 0.04 +
        (Number(strata.rockExposure) || 0) * 0.04 +
        (Number(strata.depthMix) || 0) * 0.03
    ) * closeScale * strongSurfaceScale,
    0,
    0.18
  );

  return {
    color: strata.tintColor || "#6c6552",
    amount: amount
  };
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
  var materialSignals = detail.materialSignals || {};
  var snowLine = Number.isFinite(Number(materialSignals.snow))
    ? clamp(Number(materialSignals.snow), 0, 1)
    : (biome === "ice" ? 0.35 : clamp((heightMeters - 1800) / 2200, 0, 1));
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
  var terrainBandTint = getPlanetLocalTerrainBandTint(sample);
  color = blendHexColors(color, terrainBandTint.color, terrainBandTint.amount);
  var strataTint = getPlanetSurfaceMaterialStrataTint(sample);
  color = blendHexColors(color, strataTint.color, strataTint.amount);
  color = getPlanetSurfaceColorWithTileBlend(sample, color);
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

function getPlanetSurfaceTextureStrength(sample) {
  var detail = sample && sample.detail ? sample.detail : {};
  var sampleMeters = Math.max(1, Number(sample && sample.surfaceSampleMeters) || Number(detail.sampleMeters) || 1);
  var featureRelief = detail.featureRelief || {};
  var groundFeature = detail.groundFeature || null;
  var surface = detail.surface || "ground";
  var closeScaleBoost = sampleMeters <= 5 ? 0.24 : sampleMeters <= 25 ? 0.12 : 0;
  var calmSurfacePenalty = surface === "deep water" || surface === "snow" || surface === "ice" ? 0.06 : 0;

  return clamp(
    0.12 +
      (Number(detail.roughness) || 0) * 0.28 +
      (Number(detail.slope) || 0) * 0.18 +
      (Number(featureRelief.roughnessBoost) || 0) * 0.18 +
      (groundFeature ? clamp(Number(groundFeature.influence) || 0, 0, 1) * 0.10 : 0) +
      closeScaleBoost -
      calmSurfacePenalty,
    0,
    0.74
  );
}

function getPlanetSurfaceTextureSwatchCount(sample, strength) {
  var detail = sample && sample.detail ? sample.detail : {};
  var sampleMeters = Math.max(1, Number(sample && sample.surfaceSampleMeters) || Number(detail.sampleMeters) || 1);
  var normalizedStrength = clamp(Number(strength) || 0, 0, 1);

  if (sampleMeters > 25 || CONFIG.TILE_SIZE < 4 || normalizedStrength <= 0.14) {
    return 0;
  }

  return clamp(
    Math.round((sampleMeters <= 5 ? 4 : 2) + normalizedStrength * (sampleMeters <= 5 ? 5 : 3)),
    1,
    sampleMeters <= 5 ? 9 : 5
  );
}

function getPlanetSurfaceTextureSwatchShape(sample, noise, index) {
  var detail = sample && sample.detail ? sample.detail : {};
  var surface = detail.surface || "ground";
  var normalizedNoise = clamp(Number(noise) || 0, 0, 1);
  var maxSize = Math.max(1, CONFIG.TILE_SIZE - 1);
  var smallSize = clamp(Math.round(CONFIG.TILE_SIZE * (0.16 + normalizedNoise * 0.20)), 1, maxSize);
  var wideSize = clamp(Math.round(CONFIG.TILE_SIZE * (0.34 + normalizedNoise * 0.30)), 1, maxSize);
  var thinSize = clamp(Math.round(CONFIG.TILE_SIZE * (0.14 + normalizedNoise * 0.12)), 1, maxSize);

  if (surface === "open water" || surface === "deep water" || surface === "whitecap") {
    return {
      width: wideSize,
      height: thinSize
    };
  }

  if (surface === "grass" || surface === "brush" || surface === "meadow" || surface === "clearing") {
    return {
      width: index % 2 === 0 ? smallSize : clamp(smallSize + 1, 1, maxSize),
      height: smallSize
    };
  }

  if (surface === "rock" || surface === "stone" || surface === "ridge ice") {
    return {
      width: clamp(smallSize + 1, 1, maxSize),
      height: clamp(smallSize + (index % 2), 1, maxSize)
    };
  }

  if (surface === "sand" || surface === "dune") {
    return {
      width: wideSize,
      height: 1
    };
  }

  return {
    width: smallSize,
    height: smallSize
  };
}

function getPlanetSurfaceMicrotextureSwatches(sample, baseColor) {
  var strength = getPlanetSurfaceTextureStrength(sample);
  var swatchCount = getPlanetSurfaceTextureSwatchCount(sample, strength);
  var swatches = [];
  var seedEast = Math.round(Number(sample && sample.surfaceSampleX) || 0);
  var seedNorth = Math.round(Number(sample && sample.surfaceSampleY) || 0);

  if (swatchCount <= 0) {
    return swatches;
  }

  for (var i = 0; i < swatchCount; i++) {
    var noise = getDeterministicUnitNoise(seedEast + i * 13, seedNorth - i * 17, getPlanetVisualSeedOffset() + i * 29 + swatchCount);
    var shape;
    var maxX;
    var maxY;

    if (i > 0 && noise > strength + 0.38) {
      continue;
    }

    shape = getPlanetSurfaceTextureSwatchShape(sample, noise, i);
    maxX = Math.max(1, CONFIG.TILE_SIZE - shape.width + 1);
    maxY = Math.max(1, CONFIG.TILE_SIZE - shape.height + 1);

    swatches.push({
      x: Math.floor(getDeterministicUnitNoise(seedEast, seedNorth, 701 + i) * maxX),
      y: Math.floor(getDeterministicUnitNoise(seedEast, seedNorth, 811 + i) * maxY),
      size: Math.max(shape.width, shape.height),
      width: shape.width,
      height: shape.height,
      color: getPlanetSurfaceMicrotextureAccent(sample, baseColor, noise),
      alpha: clamp(0.14 + strength * 0.42 + noise * 0.16, 0.16, 0.68)
    });
  }

  return swatches;
}

function getPlanetSurfaceFinePixelTextureStrength(sample) {
  var detail = sample && sample.detail ? sample.detail : {};
  var sampleMeters = Math.max(1, Number(sample && sample.surfaceSampleMeters) || Number(detail.sampleMeters) || 1);
  var featureRelief = detail.featureRelief || {};
  var groundFeature = detail.groundFeature || null;
  var surface = detail.surface || "ground";
  var calmPenalty = surface === "deep water" || surface === "snow" || surface === "ice" ? 0.07 : 0;

  if (sampleMeters > 5 || CONFIG.TILE_SIZE < 4) {
    return 0;
  }

  return clamp(
    0.18 +
      (sampleMeters <= 1 ? 0.16 : 0.06) +
      (Number(detail.roughness) || 0) * 0.20 +
      (Number(detail.slope) || 0) * 0.18 +
      (Number(featureRelief.roughnessBoost) || 0) * 0.16 +
      (groundFeature ? clamp(Number(groundFeature.influence) || 0, 0, 1) * 0.08 : 0) -
      calmPenalty,
    0,
    0.78
  );
}

function getPlanetSurfaceFinePixelTextureCount(sample, strength) {
  var detail = sample && sample.detail ? sample.detail : {};
  var sampleMeters = Math.max(1, Number(sample && sample.surfaceSampleMeters) || Number(detail.sampleMeters) || 1);
  var normalizedStrength = clamp(Number(strength) || 0, 0, 1);
  var baseCount = sampleMeters <= 1 ? 5 : 3;

  if (sampleMeters > 5 || CONFIG.TILE_SIZE < 4 || normalizedStrength <= 0.12) {
    return 0;
  }

  return clamp(Math.round(baseCount + normalizedStrength * (sampleMeters <= 1 ? 6 : 4)), 1, sampleMeters <= 1 ? 11 : 7);
}

function getPlanetSurfaceFinePixelAccent(sample, baseColor, noise) {
  var detail = sample && sample.detail ? sample.detail : {};
  var surface = detail.surface || "ground";
  var normalizedNoise = clamp(Number(noise) || 0, 0, 1);
  var accent = normalizedNoise > 0.52 ? shadeHexColor(baseColor, 0.62 + normalizedNoise * 0.16) : shadeHexColor(baseColor, 0.32 + normalizedNoise * 0.18);

  if (surface === "open water" || surface === "deep water" || surface === "whitecap") {
    accent = normalizedNoise > 0.56 ? blendHexColors(baseColor, "#9ad9eb", 0.26) : blendHexColors(baseColor, "#03142b", 0.20);
  } else if (surface === "dense canopy" || surface === "woodland") {
    accent = normalizedNoise > 0.54 ? blendHexColors(baseColor, "#2a6a3b", 0.22) : blendHexColors(baseColor, "#04160c", 0.24);
  } else if (surface === "grass" || surface === "brush" || surface === "meadow" || surface === "clearing") {
    accent = normalizedNoise > 0.54 ? blendHexColors(baseColor, "#91b85a", 0.24) : blendHexColors(baseColor, "#14331f", 0.22);
  } else if (surface === "rock" || surface === "stone") {
    accent = normalizedNoise > 0.50 ? blendHexColors(baseColor, "#aaa898", 0.24) : blendHexColors(baseColor, "#262824", 0.22);
  } else if (surface === "sand" || surface === "dune") {
    accent = normalizedNoise > 0.50 ? blendHexColors(baseColor, "#d7bd78", 0.25) : blendHexColors(baseColor, "#665226", 0.18);
  } else if (surface === "snow" || surface === "ice" || surface === "ridge ice") {
    accent = normalizedNoise > 0.50 ? blendHexColors(baseColor, "#ffffff", 0.18) : blendHexColors(baseColor, "#8bbfd1", 0.18);
  }

  return accent;
}

function getPlanetSurfaceFinePixelSwatches(sample, baseColor) {
  var strength = getPlanetSurfaceFinePixelTextureStrength(sample);
  var swatchCount = getPlanetSurfaceFinePixelTextureCount(sample, strength);
  var swatches = [];
  var seedEast = Math.round(Number(sample && sample.surfaceSampleX) || 0);
  var seedNorth = Math.round(Number(sample && sample.surfaceSampleY) || 0);
  var cellMax = Math.max(1, CONFIG.TILE_SIZE - 1);

  if (swatchCount <= 0) {
    return swatches;
  }

  for (var i = 0; i < swatchCount; i++) {
    var noise = getDeterministicUnitNoise(seedEast + i * 19, seedNorth - i * 23, getPlanetVisualSeedOffset() + 1201 + i * 31);
    var wideNoise = getDeterministicUnitNoise(seedEast - i * 7, seedNorth + i * 11, getPlanetVisualSeedOffset() + 1439 + i * 17);
    var width = wideNoise > 0.82 && CONFIG.TILE_SIZE >= 5 ? 2 : 1;
    var height = wideNoise < 0.18 && CONFIG.TILE_SIZE >= 5 ? 2 : 1;

    if (i > 0 && noise > strength + 0.42) {
      continue;
    }

    swatches.push({
      x: Math.floor(getDeterministicUnitNoise(seedEast, seedNorth, 1601 + i * 13) * Math.max(1, CONFIG.TILE_SIZE - width + 1)),
      y: Math.floor(getDeterministicUnitNoise(seedEast, seedNorth, 1741 + i * 17) * Math.max(1, CONFIG.TILE_SIZE - height + 1)),
      width: clamp(width, 1, cellMax),
      height: clamp(height, 1, cellMax),
      size: Math.max(width, height),
      color: getPlanetSurfaceFinePixelAccent(sample, baseColor, noise),
      alpha: clamp(0.10 + strength * 0.24 + noise * 0.12, 0.12, 0.46)
    });
  }

  return swatches;
}

function getPlanetSurfaceSilhouetteBreakupAccent(sample, baseColor, noise) {
  var detail = sample && sample.detail ? sample.detail : {};
  var surface = detail.surface || "ground";
  var normalizedNoise = clamp(Number(noise) || 0, 0, 1);
  var target = normalizedNoise > 0.52 ? "#dfeadf" : "#101713";

  if (surface === "open water" || surface === "deep water" || surface === "whitecap") {
    target = normalizedNoise > 0.52 ? "#8bd4e8" : "#021124";
  } else if (surface === "dense canopy" || surface === "woodland") {
    target = normalizedNoise > 0.52 ? "#2b6a38" : "#03140a";
  } else if (surface === "grass" || surface === "brush" || surface === "meadow" || surface === "clearing") {
    target = normalizedNoise > 0.52 ? "#83ad4e" : "#102819";
  } else if (surface === "rock" || surface === "stone") {
    target = normalizedNoise > 0.52 ? "#a9a592" : "#252722";
  } else if (surface === "sand" || surface === "dune") {
    target = normalizedNoise > 0.52 ? "#d2b66f" : "#5e4b22";
  } else if (surface === "snow" || surface === "ice" || surface === "ridge ice") {
    target = normalizedNoise > 0.52 ? "#ffffff" : "#88b9cb";
  } else if (surface === "scrub" || surface === "moss") {
    target = normalizedNoise > 0.52 ? "#738b66" : "#253428";
  }

  return blendHexColors(baseColor, target, clamp(0.16 + normalizedNoise * 0.24, 0.16, 0.46));
}

function getPlanetSurfaceSilhouetteBreakupStrength(sample) {
  var detail = sample && sample.detail ? sample.detail : {};
  var sampleMeters = Math.max(1, Number(sample && sample.surfaceSampleMeters) || Number(detail.sampleMeters) || 1);
  var featureInfluence = detail.groundFeature ? clamp(Number(detail.groundFeature.influence) || 0, 0, 1) : 0;
  var featureRelief = detail.featureRelief || {};
  var surface = detail.surface || "ground";
  var calmPenalty = surface === "deep water" || surface === "snow" || surface === "ice" ? 0.10 : 0;

  if (sampleMeters > 5 || CONFIG.TILE_SIZE < 4) {
    return 0;
  }

  return clamp(
    0.10 +
      (sampleMeters <= 1 ? 0.12 : 0.05) +
      (Number(detail.roughness) || 0) * 0.16 +
      (Number(detail.slope) || 0) * 0.12 +
      getPlanetSurfaceBiomeTransitionStrength(sample) * 0.16 +
      featureInfluence * 0.10 +
      (Number(featureRelief.roughnessBoost) || 0) * 0.10 -
      calmPenalty,
    0,
    0.64
  );
}

function getPlanetSurfaceSilhouetteBreakupSwatches(sample, baseColor) {
  var strength = getPlanetSurfaceSilhouetteBreakupStrength(sample);
  var swatches = [];
  var seedEast = Math.round(Number(sample && sample.surfaceSampleX) || 0);
  var seedNorth = Math.round(Number(sample && sample.surfaceSampleY) || 0);
  var count = strength <= 0.14 ? 0 : clamp(Math.round(2 + strength * 7), 1, 6);
  var maxSize = Math.max(1, CONFIG.TILE_SIZE - 1);
  var edgeThickness = Math.max(1, Math.floor(CONFIG.TILE_SIZE * 0.20));

  if (count <= 0) {
    return swatches;
  }

  for (var i = 0; i < count; i++) {
    var noise = getDeterministicUnitNoise(seedEast + i * 41, seedNorth - i * 43, getPlanetVisualSeedOffset() + 3203 + i * 29);
    var sideNoise = getDeterministicUnitNoise(seedEast - i * 17, seedNorth + i * 19, getPlanetVisualSeedOffset() + 3511 + i * 31);
    var offsetNoise = getDeterministicUnitNoise(seedEast + i * 23, seedNorth + i * 7, getPlanetVisualSeedOffset() + 3761 + i * 13);
    var side = Math.floor(sideNoise * 4) % 4;
    var runLength = clamp(Math.round(CONFIG.TILE_SIZE * (0.28 + noise * 0.34)), 1, maxSize);
    var offset = Math.floor(offsetNoise * Math.max(1, CONFIG.TILE_SIZE - runLength + 1));
    var swatch = {
      x: 0,
      y: 0,
      width: edgeThickness,
      height: runLength,
      size: runLength,
      color: getPlanetSurfaceSilhouetteBreakupAccent(sample, baseColor, noise),
      alpha: clamp(0.08 + strength * 0.25 + noise * 0.10, 0.10, 0.42),
      side: side
    };

    if (side === 0) {
      swatch.x = offset;
      swatch.y = 0;
      swatch.width = runLength;
      swatch.height = edgeThickness;
    } else if (side === 1) {
      swatch.x = CONFIG.TILE_SIZE - edgeThickness;
      swatch.y = offset;
    } else if (side === 2) {
      swatch.x = offset;
      swatch.y = CONFIG.TILE_SIZE - edgeThickness;
      swatch.width = runLength;
      swatch.height = edgeThickness;
    } else {
      swatch.x = 0;
      swatch.y = offset;
    }

    swatches.push(swatch);
  }

  return swatches;
}

function getPlanetSurfacePatternType(sample) {
  var detail = sample && sample.detail ? sample.detail : {};
  var surface = detail.surface || "ground";

  if (surface === "open water" || surface === "deep water" || surface === "whitecap") {
    return "water-streak";
  }

  if (surface === "sand" || surface === "dune") {
    return "sand-ripple";
  }

  if (surface === "rock" || surface === "stone" || surface === "ridge ice") {
    return "fracture";
  }

  if (surface === "dense canopy" || surface === "woodland" || surface === "grass" || surface === "brush" || surface === "meadow" || surface === "clearing" || surface === "scrub" || surface === "moss") {
    return "vegetation-clump";
  }

  if (surface === "snow" || surface === "ice") {
    return "ice-facet";
  }

  return "ground-grain";
}

function getPlanetSurfacePatternStrength(sample) {
  var detail = sample && sample.detail ? sample.detail : {};
  var sampleMeters = Math.max(1, Number(sample && sample.surfaceSampleMeters) || Number(detail.sampleMeters) || 1);
  var featureRelief = detail.featureRelief || {};
  var surface = detail.surface || "ground";
  var calmPenalty = surface === "deep water" || surface === "snow" || surface === "ice" ? 0.08 : 0;

  if (sampleMeters > 5 || CONFIG.TILE_SIZE < 4) {
    return 0;
  }

  return clamp(
    0.14 +
      (sampleMeters <= 1 ? 0.14 : 0.06) +
      (Number.isFinite(Number(detail.roughness)) ? Number(detail.roughness) : 0) * 0.18 +
      (Number.isFinite(Number(detail.slope)) ? Number(detail.slope) : 0) * 0.12 +
      (Number.isFinite(Number(detail.meterNoise)) ? Number(detail.meterNoise) : 0.5) * 0.06 +
      (Number.isFinite(Number(featureRelief.roughnessBoost)) ? Number(featureRelief.roughnessBoost) : 0) * 0.10 -
      calmPenalty,
    0,
    0.72
  );
}

function getPlanetSurfacePatternAccent(sample, baseColor, noise, patternType) {
  var normalizedNoise = clamp(Number(noise) || 0, 0, 1);
  var target = normalizedNoise > 0.52 ? "#d7e4d8" : "#1f2b24";

  if (patternType === "water-streak") {
    target = normalizedNoise > 0.52 ? "#9bd8e7" : "#03142b";
  } else if (patternType === "sand-ripple") {
    target = normalizedNoise > 0.52 ? "#d8bf78" : "#604d23";
  } else if (patternType === "fracture") {
    target = normalizedNoise > 0.52 ? "#aaa797" : "#242621";
  } else if (patternType === "vegetation-clump") {
    target = normalizedNoise > 0.52 ? "#86ad4f" : "#102718";
  } else if (patternType === "ice-facet") {
    target = normalizedNoise > 0.52 ? "#ffffff" : "#86b7c8";
  }

  return blendHexColors(baseColor, target, clamp(0.14 + normalizedNoise * 0.20, 0.14, 0.40));
}

function getPlanetSurfacePatternShape(patternType, noise, index) {
  var normalizedNoise = clamp(Number(noise) || 0, 0, 1);
  var maxSize = Math.max(1, CONFIG.TILE_SIZE - 1);
  var shortSize = 1;
  var midSize = clamp(Math.round(CONFIG.TILE_SIZE * (0.24 + normalizedNoise * 0.18)), 1, maxSize);
  var longSize = clamp(Math.round(CONFIG.TILE_SIZE * (0.48 + normalizedNoise * 0.22)), 1, maxSize);

  if (patternType === "water-streak" || patternType === "sand-ripple") {
    return {
      width: longSize,
      height: shortSize
    };
  }

  if (patternType === "fracture") {
    return index % 2 === 0
      ? { width: shortSize, height: longSize }
      : { width: longSize, height: shortSize };
  }

  if (patternType === "vegetation-clump") {
    return {
      width: midSize,
      height: clamp(midSize + (index % 2), 1, maxSize)
    };
  }

  if (patternType === "ice-facet") {
    return {
      width: clamp(midSize + 1, 1, maxSize),
      height: shortSize
    };
  }

  return {
    width: midSize,
    height: midSize
  };
}

function getPlanetSurfacePatternSwatches(sample, baseColor) {
  var strength = getPlanetSurfacePatternStrength(sample);
  var swatches = [];
  var seedEast = Math.round(Number(sample && sample.surfaceSampleX) || 0);
  var seedNorth = Math.round(Number(sample && sample.surfaceSampleY) || 0);
  var patternType = getPlanetSurfacePatternType(sample);
  var count = strength <= 0.14 ? 0 : clamp(Math.round(1 + strength * 6), 1, 6);

  if (count <= 0) {
    return swatches;
  }

  for (var i = 0; i < count; i++) {
    var noise = getDeterministicUnitNoise(seedEast + i * 47, seedNorth - i * 53, getPlanetVisualSeedOffset() + 4211 + i * 31);
    var shape = getPlanetSurfacePatternShape(patternType, noise, i);
    var maxX = Math.max(1, CONFIG.TILE_SIZE - shape.width + 1);
    var maxY = Math.max(1, CONFIG.TILE_SIZE - shape.height + 1);

    if (i > 0 && noise > strength + 0.48) {
      continue;
    }

    swatches.push({
      x: Math.floor(getDeterministicUnitNoise(seedEast - i * 11, seedNorth + i * 13, getPlanetVisualSeedOffset() + 443 + i) * maxX),
      y: Math.floor(getDeterministicUnitNoise(seedEast + i * 17, seedNorth - i * 19, getPlanetVisualSeedOffset() + 557 + i) * maxY),
      width: shape.width,
      height: shape.height,
      size: Math.max(shape.width, shape.height),
      color: getPlanetSurfacePatternAccent(sample, baseColor, noise, patternType),
      alpha: clamp(0.08 + strength * 0.22 + noise * 0.08, 0.10, 0.40),
      patternType: patternType
    });
  }

  return swatches;
}

function getPlanetSurfaceStrataSwatchAccent(sample, baseColor, noise) {
  var detail = sample && sample.detail ? sample.detail : {};
  var strata = detail.materialStrata || {};
  var primary = strata.primary || "soil";
  var secondary = strata.secondary || "";
  var normalizedNoise = clamp(Number(noise) || 0, 0, 1);
  var target = normalizedNoise > 0.52 ? "#8b8062" : "#302a22";

  if (primary === "water") {
    target = secondary === "shelf-sediment"
      ? (normalizedNoise > 0.52 ? "#87b8a8" : "#18394d")
      : (normalizedNoise > 0.52 ? "#5f8fb0" : "#05162d");
  } else if (primary === "sand" || primary === "sandy-soil") {
    target = secondary === "gravel"
      ? (normalizedNoise > 0.52 ? "#c8ad71" : "#675129")
      : (normalizedNoise > 0.52 ? "#d4bd79" : "#77602d");
  } else if (primary === "bedrock" || primary === "scree") {
    target = secondary === "mineral-vein"
      ? (normalizedNoise > 0.52 ? "#bbb6a2" : "#373933")
      : (normalizedNoise > 0.52 ? "#8f8e82" : "#272923");
  } else if (primary === "ice" || primary === "frost") {
    target = normalizedNoise > 0.52 ? "#f5fdff" : "#83b8cc";
  } else if (primary === "humus" || primary === "peat") {
    target = normalizedNoise > 0.52 ? "#566339" : "#1b2115";
  } else if (primary === "topsoil" || primary === "loam") {
    target = secondary === "root-mat"
      ? (normalizedNoise > 0.52 ? "#718046" : "#26321e")
      : (normalizedNoise > 0.52 ? "#756b4d" : "#2f2b20");
  }

  return blendHexColors(baseColor, target, clamp(0.16 + normalizedNoise * 0.18, 0.16, 0.38));
}

function getPlanetSurfaceStrataSwatchShape(strata, noise, index) {
  var primary = strata && strata.primary ? strata.primary : "soil";
  var secondary = strata && strata.secondary ? strata.secondary : "";
  var normalizedNoise = clamp(Number(noise) || 0, 0, 1);
  var maxSize = Math.max(1, CONFIG.TILE_SIZE - 1);
  var shortSize = 1;
  var midSize = clamp(Math.round(CONFIG.TILE_SIZE * (0.18 + normalizedNoise * 0.18)), 1, maxSize);
  var longSize = clamp(Math.round(CONFIG.TILE_SIZE * (0.44 + normalizedNoise * 0.28)), 1, maxSize);

  if (primary === "water" || primary === "sand" || primary === "sandy-soil") {
    return {
      width: longSize,
      height: shortSize
    };
  }

  if (primary === "bedrock" || primary === "scree" || secondary === "mineral-vein") {
    return index % 2 === 0
      ? { width: shortSize, height: longSize }
      : { width: longSize, height: shortSize };
  }

  if (primary === "humus" || primary === "peat" || secondary === "root-mat" || secondary === "leaf-litter") {
    return {
      width: midSize,
      height: clamp(midSize + (index % 2), 1, maxSize)
    };
  }

  if (primary === "ice" || primary === "frost") {
    return {
      width: clamp(midSize + 1, 1, maxSize),
      height: shortSize
    };
  }

  return {
    width: midSize,
    height: midSize
  };
}

function getPlanetSurfaceStrataSwatchRotation(sample, strata, noise, index) {
  var detail = sample && sample.detail ? sample.detail : {};
  var primary = strata && strata.primary ? strata.primary : "soil";
  var base = Number.isFinite(Number(detail.aspect))
    ? (Number(detail.aspect) * Math.PI / 180)
    : 0;
  var jitter = (clamp(Number(noise) || 0, 0, 1) - 0.5) * Math.PI * 0.12;

  if (primary === "water" || primary === "sand" || primary === "sandy-soil" || primary === "ice" || primary === "frost") {
    return normalizePlanetLineAngleRadians(base + Math.PI * 0.5 + jitter);
  }

  if (primary === "bedrock" || primary === "scree") {
    return normalizePlanetLineAngleRadians(base + jitter + (index % 2) * Math.PI * 0.5);
  }

  return 0;
}

function getPlanetSurfaceStrataSwatches(sample, baseColor) {
  var detail = sample && sample.detail ? sample.detail : {};
  var strata = detail.materialStrata || null;
  var sampleMeters = Math.max(1, Number(sample && sample.surfaceSampleMeters) || Number(detail.sampleMeters) || 1);
  var seedEast = Math.round(Number(sample && sample.surfaceSampleX) || 0);
  var seedNorth = Math.round(Number(sample && sample.surfaceSampleY) || 0);
  var swatches = [];
  var strength;
  var count;
  var typeSeed;

  if (!strata || sampleMeters > 5 || CONFIG.TILE_SIZE < 4) {
    return swatches;
  }

  strength = clamp(
    0.12 +
      (Number(strata.granularity) || 0) * 0.24 +
      (Number(strata.organicCover) || 0) * 0.18 +
      (Number(strata.rockExposure) || 0) * 0.22 +
      (Number(strata.wetness) || 0) * 0.06,
    0,
    0.78
  );
  count = strength <= 0.14 ? 0 : clamp(Math.round(1 + strength * (sampleMeters <= 1 ? 6 : 4)), 1, sampleMeters <= 1 ? 7 : 5);

  if (count <= 0) {
    return swatches;
  }

  typeSeed = String(strata.primary || "").split("").reduce(function(total, character) {
    return total + character.charCodeAt(0);
  }, 0) + String(strata.secondary || "").split("").reduce(function(total, character) {
    return total + character.charCodeAt(0);
  }, 0);

  for (var i = 0; i < count; i++) {
    var noise = getDeterministicUnitNoise(seedEast + i * 41, seedNorth - i * 43, getPlanetVisualSeedOffset() + typeSeed + 6101 + i * 29);
    var shape = getPlanetSurfaceStrataSwatchShape(strata, noise, i);
    var maxX = Math.max(1, CONFIG.TILE_SIZE - shape.width + 1);
    var maxY = Math.max(1, CONFIG.TILE_SIZE - shape.height + 1);

    if (i > 0 && noise > strength + 0.46) {
      continue;
    }

    swatches.push({
      x: Math.floor(getDeterministicUnitNoise(seedEast - i * 17, seedNorth + i * 19, getPlanetVisualSeedOffset() + typeSeed + 6221 + i) * maxX),
      y: Math.floor(getDeterministicUnitNoise(seedEast + i * 23, seedNorth - i * 29, getPlanetVisualSeedOffset() + typeSeed + 6359 + i) * maxY),
      width: shape.width,
      height: shape.height,
      size: Math.max(shape.width, shape.height),
      color: getPlanetSurfaceStrataSwatchAccent(sample, baseColor, noise),
      alpha: clamp(0.08 + strength * 0.20 + noise * 0.10, 0.10, 0.42),
      rotationRadians: getPlanetSurfaceStrataSwatchRotation(sample, strata, noise, i),
      strataPrimary: strata.primary,
      strataSecondary: strata.secondary
    });
  }

  return swatches;
}

function getPlanetSurfaceNaturalElementShape(elementType, noise, index) {
  var normalizedNoise = clamp(Number(noise) || 0, 0, 1);
  var maxSize = Math.max(1, CONFIG.TILE_SIZE - 1);
  var shortSize = 1;
  var midSize = clamp(Math.round(CONFIG.TILE_SIZE * (0.20 + normalizedNoise * 0.20)), 1, maxSize);
  var longSize = clamp(Math.round(CONFIG.TILE_SIZE * (0.44 + normalizedNoise * 0.28)), 1, maxSize);

  if (elementType === "water-ripple" || elementType === "sand-ripple" || elementType === "ice-crack") {
    return {
      width: longSize,
      height: shortSize
    };
  }

  if (elementType === "grass-blade") {
    return {
      width: shortSize,
      height: clamp(midSize + (index % 2), 1, maxSize)
    };
  }

  if (elementType === "leaf-litter" || elementType === "snow-crust") {
    return {
      width: clamp(midSize + 1, 1, maxSize),
      height: shortSize
    };
  }

  if (elementType === "stone-chip") {
    return index % 2 === 0
      ? { width: midSize, height: shortSize }
      : { width: shortSize, height: midSize };
  }

  return {
    width: midSize,
    height: midSize
  };
}

function getPlanetSurfaceNaturalElementRotation(element, elementType, noise, index) {
  var base = Number.isFinite(Number(element && element.orientationRadians))
    ? Number(element.orientationRadians)
    : 0;
  var jitter = (clamp(Number(noise) || 0, 0, 1) - 0.5) * Math.PI * 0.18;

  if (elementType === "grass-blade") {
    jitter += (index % 2 === 0 ? -1 : 1) * Math.PI * 0.035;
  } else if (elementType === "stone-chip" || elementType === "pebble") {
    jitter += (index % 3 - 1) * Math.PI * 0.08;
  } else if (elementType === "leaf-litter" || elementType === "snow-crust") {
    jitter += Math.PI * 0.5;
  }

  return normalizePlanetLineAngleRadians(base + jitter);
}

function getPlanetSurfaceNaturalElementSwatches(sample, baseColor) {
  var detail = sample && sample.detail ? sample.detail : {};
  var element = detail.naturalElement || null;
  var sampleMeters = Math.max(1, Number(sample && sample.surfaceSampleMeters) || Number(detail.sampleMeters) || 1);
  var density = clamp(Number(element && element.density) || 0, 0, 1);
  var swatches = [];
  var seedEast = Math.round(Number(sample && sample.surfaceSampleX) || 0);
  var seedNorth = Math.round(Number(sample && sample.surfaceSampleY) || 0);
  var type = element && element.type ? element.type : "none";
  var typeSeed = String(type).split("").reduce(function(total, character) {
    return total + character.charCodeAt(0);
  }, 0);
  var count = density <= 0.18 ? 0 : clamp(Math.round(1 + density * 5), 1, 6);

  if (!element || type === "none" || sampleMeters > 5 || CONFIG.TILE_SIZE < 4 || count <= 0) {
    return swatches;
  }

  for (var i = 0; i < count; i++) {
    var noise = getDeterministicUnitNoise(seedEast + i * 29, seedNorth - i * 31, getPlanetVisualSeedOffset() + typeSeed + 5303 + i * 17);
    var shape = getPlanetSurfaceNaturalElementShape(type, noise, i);
    var maxX = Math.max(1, CONFIG.TILE_SIZE - shape.width + 1);
    var maxY = Math.max(1, CONFIG.TILE_SIZE - shape.height + 1);

    if (i > 0 && noise > density + 0.42) {
      continue;
    }

    swatches.push({
      x: Math.floor(getDeterministicUnitNoise(seedEast - i * 13, seedNorth + i * 11, getPlanetVisualSeedOffset() + typeSeed + 5417 + i) * maxX),
      y: Math.floor(getDeterministicUnitNoise(seedEast + i * 7, seedNorth - i * 19, getPlanetVisualSeedOffset() + typeSeed + 5521 + i) * maxY),
      width: shape.width,
      height: shape.height,
      size: Math.max(shape.width, shape.height),
      color: blendHexColors(baseColor, element.color || "#d9e7ff", clamp(0.18 + density * 0.28 + noise * 0.10, 0.18, 0.54)),
      alpha: clamp((Number(element.alpha) || 0.18) + noise * 0.08, 0.12, 0.50),
      rotationRadians: getPlanetSurfaceNaturalElementRotation(element, type, noise, i),
      elementType: type
    });
  }

  return swatches;
}

function getPlanetSurfaceReliefAccentStrength(sample) {
  var detail = sample && sample.detail ? sample.detail : {};
  var sampleMeters = Math.max(1, Number(sample && sample.surfaceSampleMeters) || Number(detail.sampleMeters) || 1);
  var featureRelief = detail.featureRelief || {};
  var surface = detail.surface || "ground";
  var slope = clamp(Number(detail.slope) || 0, 0, 1);
  var roughness = clamp(Number(detail.roughness) || 0, 0, 1);
  var hillshade = clamp(Number(detail.hillshade) || 0.5, 0, 1);
  var shadow = clamp(1 - hillshade, 0, 1);
  var reliefBoost = clamp(Number(featureRelief.roughnessBoost) || 0, 0, 1);
  var calmPenalty = surface === "deep water" || surface === "snow" || surface === "ice" ? 0.18 : 0;

  if (sampleMeters > 5 || CONFIG.TILE_SIZE < 4) {
    return 0;
  }

  return clamp(
    slope * 0.46 +
      roughness * 0.18 +
      shadow * 0.16 +
      reliefBoost * 0.24 -
      calmPenalty,
    0,
    0.82
  );
}

function getPlanetSurfaceReliefAccentColor(sample, baseColor, amount, index) {
  var detail = sample && sample.detail ? sample.detail : {};
  var surface = detail.surface || "ground";
  var hillshade = clamp(Number(detail.hillshade) || 0.5, 0, 1);
  var normalizedAmount = clamp(Number(amount) || 0, 0, 1);
  var shade = index % 2 === 0
    ? clamp(0.32 + hillshade * 0.22 - normalizedAmount * 0.10, 0.18, 0.62)
    : clamp(0.54 + hillshade * 0.24 + normalizedAmount * 0.10, 0.44, 0.82);
  var color = shadeHexColor(baseColor, shade);

  if (surface === "rock" || surface === "stone" || surface === "ridge ice") {
    color = blendHexColors(color, index % 2 === 0 ? "#252722" : "#b5b2a1", 0.18);
  } else if (surface === "sand" || surface === "dune") {
    color = blendHexColors(color, index % 2 === 0 ? "#5d4c24" : "#d9bd74", 0.16);
  } else if (surface === "open water" || surface === "whitecap") {
    color = blendHexColors(color, index % 2 === 0 ? "#041b36" : "#9bd8e7", 0.14);
  } else if (surface === "grass" || surface === "brush" || surface === "meadow" || surface === "clearing") {
    color = blendHexColors(color, index % 2 === 0 ? "#15341f" : "#8eae58", 0.12);
  }

  return color;
}

function getPlanetSurfaceReliefAccentSwatches(sample, baseColor) {
  var detail = sample && sample.detail ? sample.detail : {};
  var strength = getPlanetSurfaceReliefAccentStrength(sample);
  var swatches = [];
  var sampleMeters = Math.max(1, Number(sample && sample.surfaceSampleMeters) || Number(detail.sampleMeters) || 1);
  var swatchCount = strength <= 0.16 ? 0 : clamp(Math.round(2 + strength * (sampleMeters <= 1 ? 6 : 4)), 1, sampleMeters <= 1 ? 8 : 6);
  var seedEast = Math.round(Number(sample && sample.surfaceSampleX) || 0);
  var seedNorth = Math.round(Number(sample && sample.surfaceSampleY) || 0);
  var aspect = normalizeLongitude(Number(detail.aspect) || 0);
  var contourRadians = (aspect + 90) * Math.PI / 180;
  var horizontalBias = Math.abs(Math.cos(contourRadians));
  var verticalBias = Math.abs(Math.sin(contourRadians));
  var mostlyHorizontal = horizontalBias >= verticalBias;
  var longSize = clamp(Math.round(CONFIG.TILE_SIZE * (0.46 + strength * 0.28)), 1, CONFIG.TILE_SIZE);
  var shortSize = clamp(Math.round(CONFIG.TILE_SIZE * (0.12 + strength * 0.08)), 1, Math.max(1, CONFIG.TILE_SIZE - 1));
  var lineWidth = mostlyHorizontal ? longSize : shortSize;
  var lineHeight = mostlyHorizontal ? shortSize : longSize;

  if (swatchCount <= 0) {
    return swatches;
  }

  for (var i = 0; i < swatchCount; i++) {
    var noise = getDeterministicUnitNoise(seedEast + i * 31, seedNorth - i * 37, getPlanetVisualSeedOffset() + 2203 + Math.round(aspect) + i * 19);
    var jitter = getDeterministicUnitNoise(seedEast - i * 11, seedNorth + i * 13, getPlanetVisualSeedOffset() + 2477 + i * 23);
    var width = lineWidth;
    var height = lineHeight;
    var x;
    var y;

    if (i > 0 && noise > strength + 0.46) {
      continue;
    }

    if (mostlyHorizontal) {
      x = Math.floor(jitter * Math.max(1, CONFIG.TILE_SIZE - width + 1));
      y = Math.floor(((i + noise) / Math.max(1, swatchCount + 1)) * Math.max(1, CONFIG.TILE_SIZE - height + 1));
    } else {
      x = Math.floor(((i + noise) / Math.max(1, swatchCount + 1)) * Math.max(1, CONFIG.TILE_SIZE - width + 1));
      y = Math.floor(jitter * Math.max(1, CONFIG.TILE_SIZE - height + 1));
    }

    swatches.push({
      x: clamp(x, 0, Math.max(0, CONFIG.TILE_SIZE - width)),
      y: clamp(y, 0, Math.max(0, CONFIG.TILE_SIZE - height)),
      width: width,
      height: height,
      size: Math.max(width, height),
      color: getPlanetSurfaceReliefAccentColor(sample, baseColor, noise, i),
      alpha: clamp(0.08 + strength * 0.26 + noise * 0.08, 0.10, 0.48),
      aspect: aspect
    });
  }

  return swatches;
}

function getPlanetSurfaceEdgeAccentSwatches(sample, baseColor) {
  var tileBlend = sample && sample.tileBlend ? sample.tileBlend : null;
  var transitionStrength = getPlanetSurfaceBiomeTransitionStrength(sample);
  var detail = sample && sample.detail ? sample.detail : {};
  var featureInfluence = detail.groundFeature ? clamp(Number(detail.groundFeature.influence) || 0, 0, 1) : 0;
  var featureRelief = detail.featureRelief || {};
  var reliefEdge = clamp((Number(featureRelief.roughnessBoost) || 0) * 0.24 + featureInfluence * 0.16, 0, 0.28);
  var edgeStrength = clamp(transitionStrength * 0.55 + reliefEdge, 0, 0.52);
  var targetRgb;
  var targetColor;
  var swatches = [];
  var xAmount = tileBlend ? clamp(Number(tileBlend.xAmount) || 0, 0, 1) : 0.5;
  var yAmount = tileBlend ? clamp(Number(tileBlend.yAmount) || 0, 0, 1) : 0.5;
  var edgeSize = Math.max(1, Math.floor(CONFIG.TILE_SIZE * 0.22));

  if (CONFIG.TILE_SIZE < 4 || edgeStrength <= 0.06) {
    return swatches;
  }

  targetRgb = getPlanetSurfaceTileBlendRgb(tileBlend);
  targetColor = targetRgb
    ? blendHexColorWithRgb(baseColor, targetRgb, clamp(edgeStrength * 0.72, 0, 0.36))
    : shadeHexColor(baseColor, 0.50 + edgeStrength * 0.28);

  if (xAmount < 0.34 || featureInfluence > 0.62) {
    swatches.push({
      x: 0,
      y: 0,
      width: edgeSize,
      height: CONFIG.TILE_SIZE,
      size: CONFIG.TILE_SIZE,
      color: targetColor,
      alpha: clamp(0.10 + edgeStrength * 0.34, 0.10, 0.38)
    });
  }

  if (xAmount > 0.66 || featureInfluence > 0.72) {
    swatches.push({
      x: CONFIG.TILE_SIZE - edgeSize,
      y: 0,
      width: edgeSize,
      height: CONFIG.TILE_SIZE,
      size: CONFIG.TILE_SIZE,
      color: targetColor,
      alpha: clamp(0.10 + edgeStrength * 0.30, 0.10, 0.36)
    });
  }

  if (yAmount < 0.34) {
    swatches.push({
      x: 0,
      y: 0,
      width: CONFIG.TILE_SIZE,
      height: edgeSize,
      size: CONFIG.TILE_SIZE,
      color: targetColor,
      alpha: clamp(0.09 + edgeStrength * 0.28, 0.09, 0.34)
    });
  }

  if (yAmount > 0.66) {
    swatches.push({
      x: 0,
      y: CONFIG.TILE_SIZE - edgeSize,
      width: CONFIG.TILE_SIZE,
      height: edgeSize,
      size: CONFIG.TILE_SIZE,
      color: targetColor,
      alpha: clamp(0.09 + edgeStrength * 0.28, 0.09, 0.34)
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

function drawSurfaceSwatch(tctx, swatch, screenX, screenY) {
  var width = Number(swatch.width) || swatch.size;
  var height = Number(swatch.height) || swatch.size;
  var rotation = Number.isFinite(Number(swatch.rotationRadians)) ? Number(swatch.rotationRadians) : 0;

  tctx.globalAlpha = clamp(Number(swatch.alpha) || 0.24, 0, 0.82);
  tctx.fillStyle = swatch.color;

  if (rotation) {
    tctx.save();
    tctx.beginPath();
    tctx.rect(screenX, screenY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
    tctx.clip();
    tctx.translate(screenX + swatch.x + width / 2, screenY + swatch.y + height / 2);
    tctx.rotate(rotation);
    tctx.fillRect(-width / 2, -height / 2, width, height);
    tctx.restore();
    return;
  }

  tctx.fillRect(
    screenX + swatch.x,
    screenY + swatch.y,
    width,
    height
  );
}

function getPlanetSurfaceSubcellBasePatchSize(sample) {
  var detail = sample && sample.detail ? sample.detail : {};
  var sampleMeters = Math.max(1, Number(sample && sample.surfaceSampleMeters) || Number(detail.sampleMeters) || 1);

  if (CONFIG.TILE_SIZE < 5 || sampleMeters > 5) {
    return 0;
  }

  return sampleMeters <= 1 ? 1 : 2;
}

function getPlanetSurfaceSubcellBasePatchColor(sample, baseColor, localX, localY) {
  var detail = sample && sample.detail ? sample.detail : {};
  var strata = detail.materialStrata || {};
  var surface = detail.surface || "ground";
  var seedEast = Math.round(Number(sample && sample.surfaceSampleX) || 0);
  var seedNorth = Math.round(Number(sample && sample.surfaceSampleY) || 0);
  var noise = getDeterministicUnitNoise(
    seedEast + localX * 17,
    seedNorth - localY * 19,
    getPlanetVisualSeedOffset() + 7103 + localX * 23 + localY * 29
  );
  var grain = getDeterministicUnitNoise(
    seedEast - localY * 31,
    seedNorth + localX * 37,
    getPlanetVisualSeedOffset() + 7349 + localX * 11 + localY * 13
  );
  var roughness = clamp(Number(detail.roughness) || 0, 0, 1);
  var slope = clamp(Number(detail.slope) || 0, 0, 1);
  var granularity = clamp(Number(strata.granularity) || 0, 0, 1);
  var organicCover = clamp(Number(strata.organicCover) || 0, 0, 1);
  var rockExposure = clamp(Number(strata.rockExposure) || 0, 0, 1);
  var wetness = clamp(Number(strata.wetness) || 0, 0, 1);
  var shade = clamp(
    0.45 +
      (noise - 0.5) * (0.18 + granularity * 0.16 + roughness * 0.10) +
      (grain - 0.5) * (0.10 + slope * 0.08),
    0.18,
    0.82
  );
  var color = shadeHexColor(baseColor, shade);
  var tintAmount = clamp(0.04 + granularity * 0.08 + organicCover * 0.05 + rockExposure * 0.06 + wetness * 0.03, 0, 0.22);

  if (strata.tintColor) {
    color = blendHexColors(color, strata.tintColor, tintAmount);
  }

  if (surface === "open water" || surface === "deep water" || surface === "whitecap") {
    color = blendHexColors(color, noise > 0.55 ? "#8cccdc" : "#02152e", clamp(0.08 + wetness * 0.07, 0.08, 0.18));
  } else if (surface === "rock" || surface === "stone" || surface === "ridge ice") {
    color = blendHexColors(color, noise > 0.52 ? "#aaa798" : "#2b2d28", clamp(0.08 + rockExposure * 0.10, 0.08, 0.20));
  } else if (surface === "sand" || surface === "dune") {
    color = blendHexColors(color, noise > 0.52 ? "#d6bd78" : "#665329", clamp(0.08 + granularity * 0.08, 0.08, 0.18));
  } else if (surface === "dense canopy" || surface === "woodland" || surface === "grass" || surface === "brush" || surface === "meadow" || surface === "clearing" || surface === "moss" || surface === "scrub") {
    color = blendHexColors(color, noise > 0.52 ? "#7fa850" : "#122619", clamp(0.06 + organicCover * 0.10, 0.06, 0.20));
  } else if (surface === "snow" || surface === "ice") {
    color = blendHexColors(color, noise > 0.52 ? "#f8feff" : "#8dbed0", 0.12);
  }

  return color;
}

function getPlanetSurfaceSubcellBasePatches(sample, baseColor) {
  var patchSize = getPlanetSurfaceSubcellBasePatchSize(sample);
  var patches = [];

  if (patchSize <= 0) {
    return patches;
  }

  for (var y = 0; y < CONFIG.TILE_SIZE; y += patchSize) {
    for (var x = 0; x < CONFIG.TILE_SIZE; x += patchSize) {
      patches.push({
        x: x,
        y: y,
        width: Math.min(patchSize, CONFIG.TILE_SIZE - x),
        height: Math.min(patchSize, CONFIG.TILE_SIZE - y),
        color: getPlanetSurfaceSubcellBasePatchColor(sample, baseColor, x, y)
      });
    }
  }

  return patches;
}

function drawSurfaceBaseCell(tctx, sample, baseColor, screenX, screenY) {
  var patchSize = getPlanetSurfaceSubcellBasePatchSize(sample);

  if (patchSize <= 0) {
    tctx.fillStyle = baseColor;
    tctx.fillRect(screenX, screenY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
    return;
  }

  for (var y = 0; y < CONFIG.TILE_SIZE; y += patchSize) {
    for (var x = 0; x < CONFIG.TILE_SIZE; x += patchSize) {
      tctx.fillStyle = getPlanetSurfaceSubcellBasePatchColor(sample, baseColor, x, y);
      tctx.fillRect(
        screenX + x,
        screenY + y,
        Math.min(patchSize, CONFIG.TILE_SIZE - x),
        Math.min(patchSize, CONFIG.TILE_SIZE - y)
      );
    }
  }
}

function drawSurfaceMicrotexture(tctx, sample, baseColor, screenX, screenY) {
  var swatches = getPlanetSurfaceFinePixelSwatches(sample, baseColor)
    .concat(getPlanetSurfaceReliefAccentSwatches(sample, baseColor))
    .concat(getPlanetSurfaceEdgeAccentSwatches(sample, baseColor))
    .concat(getPlanetSurfaceSilhouetteBreakupSwatches(sample, baseColor))
    .concat(getPlanetSurfaceStrataSwatches(sample, baseColor))
    .concat(getPlanetSurfacePatternSwatches(sample, baseColor))
    .concat(getPlanetSurfaceNaturalElementSwatches(sample, baseColor))
    .concat(getPlanetSurfaceMicrotextureSwatches(sample, baseColor));

  for (var i = 0; i < swatches.length; i++) {
    drawSurfaceSwatch(tctx, swatches[i], screenX, screenY);
  }

  tctx.globalAlpha = 1;
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
