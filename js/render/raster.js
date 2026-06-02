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
