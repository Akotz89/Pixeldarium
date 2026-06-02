PS.render = PS.render || {};
PS.render.reference = PS.render.reference || {};

PS.render.reference.getLocalGridInfo = function (targetPixels) {
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
};

PS.render.reference.drawLocalCurvature = function () {
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
};

PS.render.reference.drawLocalGrid = function () {
  var grid = PS.render.reference.getLocalGridInfo(140);
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
};

PS.render.reference.drawScaleBar = function () {
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
};

PS.render.reference.drawProjectedLine = function (points, color) {
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
};

PS.render.reference.drawLocalDebugOverlay = function () {
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
  ctx.strokeRect(canvas.width / 2 - 12, canvas.height / 2 - 12, 24, 24);
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
};

PS.render.reference.drawSummaryOverlay = function () {
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
};

PS.render.reference.draw = function () {
  var lonStep = Math.max(10, Math.round(Number(CONFIG.PLANET_GRID_DEGREES) || 30));
  var latStep = lonStep;
  var showDebugOverlay = Boolean(CONFIG.PLANET_DEBUG_OVERLAY);
  var showReferenceGrid = Boolean(CONFIG.PLANET_REFERENCE_GRID || showDebugOverlay);

  if (isGlobeRenderMode() && isPlanetLocalView()) {
    ctx.save();
    if (showReferenceGrid) {
      PS.render.reference.drawLocalCurvature();
      PS.render.reference.drawLocalGrid();
    }
    PS.render.reference.drawScaleBar();

    if (showDebugOverlay) {
      PS.render.reference.drawLocalDebugOverlay();
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

    if (showReferenceGrid) {
      for (var lon = -180; lon <= 180; lon += lonStep) {
        var longitudePoints = [];

        for (var lat = -90; lat <= 90; lat += 2) {
          longitudePoints.push({ longitude: lon, latitude: lat });
        }

        PS.render.reference.drawProjectedLine(longitudePoints, lon === 0 ? "rgba(255, 255, 255, 0.18)" : "rgba(255, 255, 255, 0.055)");
      }

      for (var gridLat = -60; gridLat <= 60; gridLat += latStep) {
        var latitudePoints = [];

        for (var gridLon = -180; gridLon <= 180; gridLon += 2) {
          latitudePoints.push({ longitude: gridLon, latitude: gridLat });
        }

        PS.render.reference.drawProjectedLine(latitudePoints, gridLat === 0 ? "rgba(112, 240, 208, 0.28)" : "rgba(255, 255, 255, 0.055)");
      }

      ctx.beginPath();
      ctx.arc(projection.centerX, projection.centerY, projection.radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.36)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  } else {
    for (var flatLon = -150; flatLon <= 180; flatLon += lonStep) {
      var x = ((flatLon + 180) / 360) * canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.strokeStyle = flatLon === 0 ? "rgba(255, 255, 255, 0.16)" : "rgba(255, 255, 255, 0.055)";
      ctx.stroke();
    }

    for (var flatLat = -60; flatLat <= 60; flatLat += latStep) {
      var y = ((90 - flatLat) / 180) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.strokeStyle = flatLat === 0 ? "rgba(112, 240, 208, 0.24)" : "rgba(255, 255, 255, 0.055)";
      ctx.stroke();
    }
  }

  if (showDebugOverlay && world.planetSummary) {
    PS.render.reference.drawSummaryOverlay();
  }

  ctx.restore();
};

PS.render.reference.rebuildShaders = function () {};
PS.render.reference.rebuildTextures = function () {};
