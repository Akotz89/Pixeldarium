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

PS.render.surfaceRender.chunks.drawGroundFeatureLine = function (targetCtx, address, feature) {
  var start = PS.render.surfaceRender.chunks.getPointForMeters(address, feature.east1, feature.north1);
  var end = PS.render.surfaceRender.chunks.getPointForMeters(address, feature.east2, feature.north2);
  var dx = end.x - start.x;
  var dy = end.y - start.y;
  var lengthPixels = Math.sqrt(dx * dx + dy * dy) || 1;
  var normalX = -dy / lengthPixels;
  var normalY = dx / lengthPixels;
  var bends = Array.isArray(feature.bends) ? feature.bends : [];

  targetCtx.save();
  targetCtx.globalAlpha = clamp(Number(feature.alpha) || 0.18, 0, 0.72);
  targetCtx.strokeStyle = feature.color || "#d9e7ff";
  targetCtx.lineWidth = clamp((Number(feature.widthMeters) || 1) / address.sampleMeters * CONFIG.TILE_SIZE, 1, 9);
  targetCtx.lineCap = "round";
  targetCtx.lineJoin = "round";
  targetCtx.beginPath();
  targetCtx.moveTo(start.x, start.y);

  for (var i = 0; i < bends.length; i++) {
    var bend = bends[i];
    var t = clamp(Number(bend.t) || 0, 0, 1);
    var offsetPixels = (Number(bend.offsetMeters) || 0) / Math.max(0.1, address.sampleMeters) * CONFIG.TILE_SIZE;

    targetCtx.lineTo(start.x + dx * t + normalX * offsetPixels, start.y + dy * t + normalY * offsetPixels);
  }

  targetCtx.lineTo(end.x, end.y);
  targetCtx.stroke();
  targetCtx.restore();
};

PS.render.surfaceRender.chunks.drawGroundFeatureRect = function (targetCtx, address, feature) {
  var center = PS.render.surfaceRender.chunks.getPointForMeters(address, feature.east, feature.north);
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
