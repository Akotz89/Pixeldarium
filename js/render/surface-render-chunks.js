PS.render = PS.render || {};
PS.render.surfaceRender = PS.render.surfaceRender || {};
PS.render.surfaceRender.chunks = PS.render.surfaceRender.chunks || {};

PS.render.surfaceRender.chunks.getKey = function (address) {
  return address.chunkKey + ":tile" + CONFIG.TILE_SIZE + ":surface";
};

PS.render.surfaceRender.chunks.makeCanvas = function (width, height) {
  if (PS.render.surfaceRender.canvases && typeof PS.render.surfaceRender.canvases.make === "function") {
    return PS.render.surfaceRender.canvases.make(width, height);
  }

  return null;
};

PS.render.surfaceRender.chunks.makeChunkResult = function (address, chunkCanvas, chunkPixels) {
  return {
    key: PS.render.surfaceRender.chunks.getKey(address),
    chunkKey: address.chunkKey,
    parentLineage: getPlanetSurfaceChunkLineage(address),
    canvas: chunkCanvas,
    width: chunkPixels,
    height: chunkPixels,
    sampleMeters: address.sampleMeters,
    chunkSamples: address.chunkSamples
  };
};

PS.render.surfaceRender.chunks.drawCell = function (targetCtx, address, x, y) {
  var sample = getPlanetSurfaceChunkSampleAtAddress(address, x, y);
  var screenX = x * CONFIG.TILE_SIZE;
  var screenY = (address.chunkSamples - 1 - y) * CONFIG.TILE_SIZE;
  var baseColor = getPlanetSurfaceColor(sample);

  drawSurfaceBaseCell(targetCtx, sample, baseColor, screenX, screenY);
  drawSurfaceMicrotexture(targetCtx, sample, baseColor, screenX, screenY);
  drawSurfaceMarker(targetCtx, sample, screenX, screenY);
};

PS.render.surfaceRender.chunks.build = function (address) {
  var chunkPixels = address.chunkSamples * CONFIG.TILE_SIZE;
  var chunkCanvas = PS.render.surfaceRender.chunks.makeCanvas(chunkPixels, chunkPixels);

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
      PS.render.surfaceRender.chunks.drawCell(chunkCtx, address, x, y);
    }
  }

  PS.render.surfaceRender.chunks.drawGroundFeatures(chunkCtx, address);
  return PS.render.surfaceRender.chunks.makeChunkResult(address, chunkCanvas, chunkPixels);
};

PS.render.surfaceRender.chunks.makeBuilder = function (address) {
  var chunkPixels = address.chunkSamples * CONFIG.TILE_SIZE;
  var chunkCanvas = PS.render.surfaceRender.chunks.makeCanvas(chunkPixels, chunkPixels);

  if (!chunkCanvas || typeof chunkCanvas.getContext !== "function") {
    return null;
  }

  chunkCanvas.width = chunkPixels;
  chunkCanvas.height = chunkPixels;

  var chunkCtx = chunkCanvas.getContext("2d");

  if (!chunkCtx) {
    return null;
  }

  return {
    address: address,
    canvas: chunkCanvas,
    ctx: chunkCtx,
    nextCell: 0,
    totalCells: address.chunkSamples * address.chunkSamples,
    chunkPixels: chunkPixels
  };
};

PS.render.surfaceRender.chunks.advanceBuilder = function (builder, cellLimit) {
  var maxCells = Math.max(1, Math.round(Number(cellLimit) || 1));
  var cellsRendered = 0;
  var address = builder.address;

  while (builder.nextCell < builder.totalCells && cellsRendered < maxCells) {
    var x = builder.nextCell % address.chunkSamples;
    var y = Math.floor(builder.nextCell / address.chunkSamples);

    PS.render.surfaceRender.chunks.drawCell(builder.ctx, address, x, y);
    builder.nextCell++;
    cellsRendered++;
  }

  if (builder.nextCell < builder.totalCells) {
    return null;
  }

  PS.render.surfaceRender.chunks.drawGroundFeatures(builder.ctx, address);
  return PS.render.surfaceRender.chunks.makeChunkResult(address, builder.canvas, builder.chunkPixels);
};

PS.render.surfaceRender.chunks.getMeterBounds = function (address) {
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
};

PS.render.surfaceRender.chunks.getPointForMeters = function (address, eastMeters, northMeters) {
  var bounds = PS.render.surfaceRender.chunks.getMeterBounds(address);
  var x = ((Number(eastMeters) || 0) - bounds.minEastMeters) / address.sampleMeters * CONFIG.TILE_SIZE;
  var y = (bounds.maxNorthMeters - (Number(northMeters) || 0)) / address.sampleMeters * CONFIG.TILE_SIZE;

  return {
    x: x,
    y: y
  };
};

PS.render.surfaceRender.chunks.getGroundFeatureDrawStyle = function (feature, address) {
  var type = feature && feature.type ? feature.type : "feature";
  var sampleMeters = Math.max(0.25, Number(address && address.sampleMeters) || 1);
  var closeAmount = clamp((25 - sampleMeters) / 24, 0, 1);
  var baseAlpha = clamp(Number(feature && feature.alpha) || 0.18, 0.10, 0.72);
  var widthPixels = clamp((Number(feature && feature.widthMeters) || 1) / sampleMeters * CONFIG.TILE_SIZE, 1, 12);
  var style = {
    strokeColor: feature && feature.color ? feature.color : "#d9e7ff",
    fillColor: feature && feature.color ? feature.color : "#d9e7ff",
    haloColor: "rgba(4, 9, 14, 0.86)",
    tickColor: "rgba(226, 238, 226, 0.42)",
    alpha: clamp(baseAlpha + closeAmount * 0.22, 0.18, 0.74),
    haloAlpha: clamp(0.16 + closeAmount * 0.18, 0.12, 0.42),
    outlineAlpha: clamp(0.18 + closeAmount * 0.16, 0.12, 0.38),
    lineWidth: widthPixels,
    haloWidth: clamp(widthPixels + 2 + closeAmount * 2, 2, 16),
    tickSpacingMeters: 12,
    tickLengthPixels: clamp(1 + closeAmount * 3, 1, 5)
  };

  if (type === "stream") {
    style.strokeColor = "#8fdcff";
    style.haloColor = "rgba(0, 17, 34, 0.92)";
    style.tickColor = "rgba(213, 250, 255, 0.62)";
    style.alpha = clamp(baseAlpha + 0.26 + closeAmount * 0.18, 0.34, 0.82);
    style.lineWidth = clamp(widthPixels + 1, 2, 12);
    style.tickSpacingMeters = 10;
  } else if (type === "ridge") {
    style.strokeColor = "#c8bc86";
    style.haloColor = "rgba(17, 15, 10, 0.80)";
    style.tickColor = "rgba(238, 226, 182, 0.48)";
    style.alpha = clamp(baseAlpha + 0.20 + closeAmount * 0.16, 0.32, 0.76);
    style.lineWidth = clamp(widthPixels + 1, 2, 11);
    style.tickSpacingMeters = 14;
  } else if (type === "swale") {
    style.strokeColor = "#79b77b";
    style.haloColor = "rgba(7, 24, 14, 0.74)";
    style.tickColor = "rgba(169, 223, 154, 0.40)";
    style.alpha = clamp(baseAlpha + 0.16 + closeAmount * 0.12, 0.28, 0.68);
  } else if (type === "reef" || type === "shoal") {
    style.strokeColor = type === "reef" ? "#8ed7c9" : "#b1e4d4";
    style.haloColor = "rgba(0, 26, 36, 0.70)";
    style.tickColor = "rgba(225, 255, 242, 0.42)";
    style.alpha = clamp(baseAlpha + 0.18 + closeAmount * 0.14, 0.28, 0.70);
  } else if (type === "rockfield") {
    style.strokeColor = "#c7bda9";
    style.fillColor = "#a99d8a";
    style.haloColor = "rgba(20, 18, 14, 0.72)";
    style.tickColor = "rgba(236, 224, 198, 0.42)";
    style.alpha = clamp(baseAlpha + 0.14 + closeAmount * 0.12, 0.26, 0.66);
  } else if (type === "wetland" || type === "meadow" || type === "clearing") {
    style.strokeColor = type === "wetland" ? "#70bc89" : "#a0d77a";
    style.fillColor = type === "wetland" ? "#5da879" : "#8fcf71";
    style.haloColor = "rgba(5, 24, 15, 0.68)";
    style.alpha = clamp(baseAlpha + 0.12 + closeAmount * 0.10, 0.24, 0.62);
  }

  return style;
};

PS.render.surfaceRender.chunks.getGroundFeatureGlyph = function (feature, address) {
  var sampleMeters = Math.max(0.25, Number(address && address.sampleMeters) || 1);
  var type = String(feature && feature.type ? feature.type : "feature");
  var glyph = {
    type: type,
    shape: "feature-dot",
    accentColor: feature && feature.color ? feature.color : "#d9e7ff",
    haloColor: "rgba(4, 9, 14, 0.72)",
    alpha: clamp(0.18 + (8 - sampleMeters) / 8 * 0.38, 0.18, 0.62),
    detailCount: sampleMeters <= 2 ? 5 : 3,
    sampleMeters: sampleMeters
  };

  if (sampleMeters > 8 || !feature) {
    return null;
  }

  if (type === "stream") {
    glyph.shape = "water-run";
    glyph.accentColor = "#d5faff";
    glyph.detailCount = sampleMeters <= 2 ? 6 : 4;
  } else if (type === "ridge") {
    glyph.shape = "ridge-comb";
    glyph.accentColor = "#eee2b6";
    glyph.detailCount = sampleMeters <= 2 ? 6 : 4;
  } else if (type === "swale") {
    glyph.shape = "green-run";
    glyph.accentColor = "#a9df9a";
  } else if (type === "reef" || type === "shoal") {
    glyph.shape = "shelf-dash";
    glyph.accentColor = "#e1fff2";
  } else if (type === "rockfield") {
    glyph.shape = "stone-cluster";
    glyph.accentColor = "#ece0c6";
    glyph.detailCount = sampleMeters <= 2 ? 7 : 4;
  } else if (type === "wetland") {
    glyph.shape = "reed-patch";
    glyph.accentColor = "#b8efaa";
  } else if (type === "meadow" || type === "clearing") {
    glyph.shape = "field-speckle";
    glyph.accentColor = "#e0f3a7";
  }

  return glyph;
};

PS.render.surfaceRender.chunks.getGroundFeatureGlyphPoint = function (address, feature) {
  if (!feature) {
    return null;
  }

  if (feature.shape === "line") {
    return PS.render.surfaceRender.chunks.getPointForMeters(
      address,
      ((Number(feature.east1) || 0) + (Number(feature.east2) || 0)) / 2,
      ((Number(feature.north1) || 0) + (Number(feature.north2) || 0)) / 2
    );
  }

  if (feature.shape === "rect") {
    return PS.render.surfaceRender.chunks.getPointForMeters(address, feature.east, feature.north);
  }

  return null;
};

PS.render.surfaceRender.chunks.drawGroundFeatureGlyph = function (targetCtx, address, feature) {
  var glyph = PS.render.surfaceRender.chunks.getGroundFeatureGlyph(feature, address);
  var point = glyph ? PS.render.surfaceRender.chunks.getGroundFeatureGlyphPoint(address, feature) : null;

  if (!glyph || !point) {
    return;
  }

  var size = Math.max(2, Math.round(CONFIG.TILE_SIZE * (address.sampleMeters <= 2 ? 1.25 : 0.85)));
  var half = Math.max(1, Math.round(size / 2));

  targetCtx.save();
  targetCtx.globalAlpha = glyph.alpha;
  targetCtx.fillStyle = glyph.haloColor;
  targetCtx.fillRect(Math.round(point.x - half), Math.round(point.y - half), size, size);
  targetCtx.fillStyle = glyph.accentColor;

  for (var i = 0; i < glyph.detailCount; i++) {
    var noiseX = getDeterministicUnitNoise(feature.blockEast + i * 23, feature.blockNorth - i * 17, 9191);
    var noiseY = getDeterministicUnitNoise(feature.blockEast - i * 19, feature.blockNorth + i * 29, 9209);
    var offsetX = Math.round((noiseX - 0.5) * size);
    var offsetY = Math.round((noiseY - 0.5) * size);
    var pixel = glyph.shape === "ridge-comb" || glyph.shape === "water-run" ? 2 : 1;

    targetCtx.fillRect(Math.round(point.x + offsetX), Math.round(point.y + offsetY), pixel, 1);
  }

  targetCtx.restore();
};

PS.render.surfaceRender.chunks.getGroundFeatureLinePoints = function (address, feature) {
  var start = PS.render.surfaceRender.chunks.getPointForMeters(address, feature.east1, feature.north1);
  var end = PS.render.surfaceRender.chunks.getPointForMeters(address, feature.east2, feature.north2);
  var dx = end.x - start.x;
  var dy = end.y - start.y;
  var lengthPixels = Math.sqrt(dx * dx + dy * dy) || 1;
  var normalX = -dy / lengthPixels;
  var normalY = dx / lengthPixels;
  var bends = Array.isArray(feature.bends) ? feature.bends : [];
  var points = [start];

  for (var i = 0; i < bends.length; i++) {
    var bend = bends[i];
    var t = clamp(Number(bend.t) || 0, 0, 1);
    var offsetPixels = (Number(bend.offsetMeters) || 0) / Math.max(0.1, address.sampleMeters) * CONFIG.TILE_SIZE;

    points.push({
      x: start.x + dx * t + normalX * offsetPixels,
      y: start.y + dy * t + normalY * offsetPixels
    });
  }

  points.push(end);
  return points;
};

PS.render.surfaceRender.chunks.strokeGroundFeaturePath = function (targetCtx, points) {
  targetCtx.beginPath();
  targetCtx.moveTo(points[0].x, points[0].y);

  for (var i = 1; i < points.length; i++) {
    targetCtx.lineTo(points[i].x, points[i].y);
  }

  targetCtx.stroke();
};

PS.render.surfaceRender.chunks.drawGroundFeatureLineTicks = function (targetCtx, address, feature, points, style) {
  if (address.sampleMeters > 8 || !points || points.length < 2) {
    return;
  }

  var spacing = Math.max(6, Number(style.tickSpacingMeters) || 12) / address.sampleMeters * CONFIG.TILE_SIZE;
  var tickLength = Math.max(1, Number(style.tickLengthPixels) || 1);
  var seed = Math.round(Number(feature.blockEast) || 0) * 31 + Math.round(Number(feature.blockNorth) || 0) * 17;
  var drawn = 0;

  targetCtx.save();
  targetCtx.globalAlpha = clamp((Number(style.alpha) || 0.3) * 0.72, 0.16, 0.62);
  targetCtx.strokeStyle = style.tickColor;
  targetCtx.lineWidth = 1;

  for (var i = 1; i < points.length; i++) {
    var previous = points[i - 1];
    var current = points[i];
    var dx = current.x - previous.x;
    var dy = current.y - previous.y;
    var segmentLength = Math.sqrt(dx * dx + dy * dy) || 1;
    var normalX = -dy / segmentLength;
    var normalY = dx / segmentLength;

    for (var distance = spacing * 0.5; distance < segmentLength; distance += spacing) {
      var t = distance / segmentLength;
      var noise = getDeterministicUnitNoise(seed + drawn * 7, i * 19, 9029);
      var side = noise > 0.5 ? 1 : -1;
      var x = previous.x + dx * t;
      var y = previous.y + dy * t;

      targetCtx.beginPath();
      targetCtx.moveTo(x, y);
      targetCtx.lineTo(x + normalX * tickLength * side, y + normalY * tickLength * side);
      targetCtx.stroke();
      drawn++;
    }
  }

  targetCtx.restore();
};

PS.render.surfaceRender.chunks.drawGroundFeatureLine = function (targetCtx, address, feature) {
  var style = PS.render.surfaceRender.chunks.getGroundFeatureDrawStyle(feature, address);
  var points = PS.render.surfaceRender.chunks.getGroundFeatureLinePoints(address, feature);

  targetCtx.save();
  targetCtx.lineCap = "round";
  targetCtx.lineJoin = "round";
  targetCtx.globalAlpha = style.haloAlpha;
  targetCtx.strokeStyle = style.haloColor;
  targetCtx.lineWidth = style.haloWidth;
  PS.render.surfaceRender.chunks.strokeGroundFeaturePath(targetCtx, points);
  targetCtx.globalAlpha = style.alpha;
  targetCtx.strokeStyle = style.strokeColor;
  targetCtx.lineWidth = style.lineWidth;
  PS.render.surfaceRender.chunks.strokeGroundFeaturePath(targetCtx, points);
  targetCtx.restore();
  PS.render.surfaceRender.chunks.drawGroundFeatureLineTicks(targetCtx, address, feature, points, style);
  PS.render.surfaceRender.chunks.drawGroundFeatureGlyph(targetCtx, address, feature);
};

PS.render.surfaceRender.chunks.drawGroundFeatureRect = function (targetCtx, address, feature) {
  var center = PS.render.surfaceRender.chunks.getPointForMeters(address, feature.east, feature.north);
  var width = Math.max(1, (Number(feature.widthMeters) || 1) / address.sampleMeters * CONFIG.TILE_SIZE);
  var height = Math.max(1, (Number(feature.heightMeters) || 1) / address.sampleMeters * CONFIG.TILE_SIZE);
  var patchPoints = Array.isArray(feature.patchPoints) ? feature.patchPoints : [];
  var style = PS.render.surfaceRender.chunks.getGroundFeatureDrawStyle(feature, address);

  targetCtx.save();
  targetCtx.translate(center.x, center.y);
  targetCtx.rotate(Number(feature.rotation) || 0);
  targetCtx.globalAlpha = style.alpha;
  targetCtx.fillStyle = style.fillColor;

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

  if (feature.type === "rockfield" || feature.type === "wetland" || feature.type === "meadow" || feature.type === "clearing") {
    targetCtx.globalAlpha = style.outlineAlpha;
    targetCtx.strokeStyle = style.tickColor;
    targetCtx.lineWidth = 1;

    if (patchPoints.length >= 3) {
      targetCtx.stroke();
    } else {
      targetCtx.strokeRect(-width / 2, -height / 2, width, height);
    }
  }

  if (feature.type === "rockfield" && address.sampleMeters <= 8) {
    targetCtx.globalAlpha = clamp(style.alpha * 0.78, 0.16, 0.52);
    targetCtx.fillStyle = style.tickColor;

    for (var i = 0; i < 8; i++) {
      var noiseX = getDeterministicUnitNoise(feature.blockEast + i * 11, feature.blockNorth - i * 13, 8053);
      var noiseY = getDeterministicUnitNoise(feature.blockEast - i * 17, feature.blockNorth + i * 19, 8069);
      targetCtx.fillRect(
        -width / 2 + noiseX * width,
        -height / 2 + noiseY * height,
        1,
        1
      );
    }
  }

  targetCtx.restore();
  PS.render.surfaceRender.chunks.drawGroundFeatureGlyph(targetCtx, address, feature);
};

PS.render.surfaceRender.chunks.drawGroundFeatures = function (targetCtx, address) {
  if (address.sampleMeters > 25 || typeof getPlanetGroundFeaturesForMeterBounds !== "function") {
    return;
  }

  var bounds = PS.render.surfaceRender.chunks.getMeterBounds(address);
  var features = getPlanetGroundFeaturesForMeterBounds(
    bounds.minEastMeters,
    bounds.maxEastMeters,
    bounds.minNorthMeters,
    bounds.maxNorthMeters
  );

  for (var i = 0; i < features.length; i++) {
    var feature = features[i];

    if (feature.shape === "line") {
      PS.render.surfaceRender.chunks.drawGroundFeatureLine(targetCtx, address, feature);
    } else if (feature.shape === "rect") {
      PS.render.surfaceRender.chunks.drawGroundFeatureRect(targetCtx, address, feature);
    }
  }
};
