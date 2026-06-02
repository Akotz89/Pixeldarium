PS.render = PS.render || {};
PS.render.raster = PS.render.raster || {};

PS.render.raster.buildFlatTerrainCache = function (targetCtx) {
  for (var y = 0; y < WORLD_HEIGHT; y++) {
    for (var x = 0; x < WORLD_WIDTH; x++) {
      targetCtx.fillStyle = getPlanetTileCompositedColor(getPlanetTile(x, y));
      targetCtx.fillRect(
        x * CONFIG.TILE_SIZE,
        y * CONFIG.TILE_SIZE,
        CONFIG.TILE_SIZE,
        CONFIG.TILE_SIZE
      );
    }
  }
};

PS.render.raster.drawLocalSurfaceUnderlay = function (targetCtx) {
  if (!targetCtx || typeof getPlanetLatLonFromCanvasPoint !== "function") {
    return false;
  }

  var pixelSize = Math.max(2, Math.round(Number(CONFIG.PLANET_LOCAL_UNDERLAY_PIXEL_SIZE) || 8));
  var surfaceLod = getPlanetSurfaceLodZoomIndex(getPlanetView().zoomLevel);
  var underlayLod = Math.max(1, surfaceLod - 1);

  for (var y = 0; y < canvas.height; y += pixelSize) {
    var height = Math.min(pixelSize, canvas.height - y);

    for (var x = 0; x < canvas.width; x += pixelSize) {
      var width = Math.min(pixelSize, canvas.width - x);
      var latLon = getPlanetLatLonFromCanvasPoint(x + width / 2, y + height / 2);
      var sample = PS.render.surface.getChunkSample(latLon.latitude, latLon.longitude, null, underlayLod);
      var rgb = getRgbFromHex(getPlanetSurfaceColor(sample));
      var shadeSeed = getPlanetMaterialPixelNoise(latLon.latitude, latLon.longitude, 120, 9109) - 0.5;
      var shade = 1 + shadeSeed * 0.12;

      targetCtx.fillStyle = getHexFromRgb(
        clamp(rgb.red * shade, 0, 255),
        clamp(rgb.green * shade, 0, 255),
        clamp(rgb.blue * shade, 0, 255)
      );
      targetCtx.fillRect(x, y, width, height);
      PS.render.raster.drawLocalSurfaceUnderlayAccent(targetCtx, x, y, width, height, sample);
    }
  }

  return true;
};

PS.render.raster.drawLocalSurfaceUnderlayAccent = function (targetCtx, x, y, width, height, sample) {
  var detail = sample && sample.detail ? sample.detail : {};
  var signals = detail.materialSignals || {};
  var biome = sample && sample.biome ? sample.biome : "unknown";
  var zoom = Number(getPlanetView().zoomLevel) || 0;
  var seedX = Math.round(Number(sample && sample.surfaceSampleX) || 0);
  var seedY = Math.round(Number(sample && sample.surfaceSampleY) || 0);
  var noise = getDeterministicUnitNoise(seedX, seedY, getPlanetVisualSeedOffset() + 9119);
  var secondaryNoise = getDeterministicUnitNoise(seedX - 17, seedY + 23, getPlanetVisualSeedOffset() + 9151);
  var river = clamp(Number(signals.river) || 0, 0, 1);
  var wetness = clamp(Number(signals.wetness) || 0, 0, 1);
  var ridge = clamp(Number(signals.ridge) || 0, 0, 1);
  var roughness = clamp(Number(signals.surfaceRoughness) || 0, 0, 1);
  var coast = clamp(Number(signals.coast) || 0, 0, 1);
  var snow = clamp(Number(signals.snow) || 0, 0, 1);
  var canopy = clamp(Number(signals.canopyDensity) || 0, 0, 1);
  var fertility = clamp(Number(sample && sample.tile && sample.tile.fertilityScore) || 0, 0, 1);
  var closeDetail = clamp((zoom - 3.5) / 3, 0, 1);
  var drawWidth = Math.max(1, Math.round(width * (0.35 + secondaryNoise * 0.50)));
  var drawHeight = Math.max(1, Math.round(height * (0.28 + noise * 0.38)));
  var drawX = x + Math.floor((width - drawWidth) * secondaryNoise);
  var drawY = y + Math.floor((height - drawHeight) * noise);
  var accent = null;
  var alpha = 0;

  if ((river > 0.42 || wetness > 0.76) && biome !== "ocean" && noise > 0.38 - closeDetail * 0.14) {
    accent = river > 0.38 ? "#7ec8ff" : "#5da879";
    alpha = clamp(0.12 + Math.max(river, wetness) * (0.16 + closeDetail * 0.08), 0.12, 0.36);
    drawHeight = Math.max(1, Math.round(height * 0.28));
  } else if ((ridge > 0.55 || roughness > 0.78) && noise > 0.55 - closeDetail * 0.12) {
    accent = ridge > 0.48 ? "#c1b89f" : "#a99d8a";
    alpha = clamp(0.10 + Math.max(ridge, roughness) * (0.12 + closeDetail * 0.06), 0.10, 0.28);
  } else if (closeDetail > 0.15 && (fertility > 0.62 || canopy > 0.68) && biome !== "ocean" && noise > 0.70 - closeDetail * 0.12) {
    accent = canopy > 0.58 ? "#4f8f45" : "#9fdd5b";
    alpha = clamp(0.10 + Math.max(fertility, canopy) * 0.14, 0.10, 0.26);
    drawWidth = Math.max(1, Math.round(width * 0.34));
    drawHeight = Math.max(1, Math.round(height * 0.34));
  } else if ((coast > 0.58 || snow > 0.68) && noise > 0.62 - closeDetail * 0.10) {
    accent = snow > 0.58 ? "#e8fbff" : "#d7bd78";
    alpha = clamp(0.10 + Math.max(coast, snow) * 0.14, 0.10, 0.26);
  }

  if (!accent || alpha <= 0) {
    return;
  }

  targetCtx.save();
  targetCtx.globalAlpha = alpha;
  targetCtx.fillStyle = accent;
  targetCtx.fillRect(drawX, drawY, drawWidth, drawHeight);
  targetCtx.restore();
};

PS.render.raster.buildGlobeTileRgbCache = function () {
  var colors = [];

  for (var y = 0; y < WORLD_HEIGHT; y++) {
    for (var x = 0; x < WORLD_WIDTH; x++) {
      var index = getTileIndex(x, y);
      colors[index] = getRgbFromHex(getPlanetTileCompositedColor(getPlanetTile(x, y)));
    }
  }

  return colors;
};

PS.render.raster.getGlobeSurfaceCanvas = function (width, height) {
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
};

PS.render.raster.drawGlobeSurface = function (targetCtx, projection) {
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
  var surfaceCanvas = PS.render.raster.getGlobeSurfaceCanvas(rasterWidth, rasterHeight);
  var surfaceCtx = surfaceCanvas.getContext("2d");
  var image = surfaceCtx.createImageData(rasterWidth, rasterHeight);
  var data = image.data;
  var tileRgbCache = PS.render.raster.buildGlobeTileRgbCache();

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
};

PS.render.raster.drawGlobeTilePreview = function (targetCtx, projection) {
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
};

PS.render.raster.rebuildShaders = function () {};
PS.render.raster.rebuildTextures = function () {
  globeSurfaceRasterCanvas = null;
};
