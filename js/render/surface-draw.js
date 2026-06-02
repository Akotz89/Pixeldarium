PS.render = PS.render || {};
PS.render.surfaceDraw = PS.render.surfaceDraw || {};

PS.render.surfaceDraw.shouldDrawMarker = function (sample) {
  var detail = sample && sample.detail ? sample.detail : null;
  var marker = detail && detail.marker ? detail.marker : null;

  return Boolean(
    marker &&
    marker.intensity > 0.38 &&
    detail.sampleMeters <= 100 &&
    CONFIG.TILE_SIZE >= 4
  );
};

PS.render.surfaceDraw.drawMarker = function (tctx, sample, screenX, screenY) {
  if (!PS.render.surfaceDraw.shouldDrawMarker(sample)) {
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
};

PS.render.surfaceDraw.drawSwatch = function (tctx, swatch, screenX, screenY) {
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
};

PS.render.surfaceDraw.getSubcellBasePatchSize = function (sample) {
  var detail = sample && sample.detail ? sample.detail : {};
  var sampleMeters = Math.max(1, Number(sample && sample.surfaceSampleMeters) || Number(detail.sampleMeters) || 1);

  if (CONFIG.TILE_SIZE < 5 || sampleMeters > 5) {
    return 0;
  }

  return sampleMeters <= 1 ? 1 : 2;
};

PS.render.surfaceDraw.getSubcellBasePatchColor = function (sample, baseColor, localX, localY) {
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
};

PS.render.surfaceDraw.getSubcellBasePatches = function (sample, baseColor) {
  var patchSize = PS.render.surfaceDraw.getSubcellBasePatchSize(sample);
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
        color: PS.render.surfaceDraw.getSubcellBasePatchColor(sample, baseColor, x, y)
      });
    }
  }

  return patches;
};

PS.render.surfaceDraw.drawBaseCell = function (tctx, sample, baseColor, screenX, screenY) {
  var patchSize = PS.render.surfaceDraw.getSubcellBasePatchSize(sample);

  if (patchSize <= 0) {
    tctx.fillStyle = baseColor;
    tctx.fillRect(screenX, screenY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
    return;
  }

  for (var y = 0; y < CONFIG.TILE_SIZE; y += patchSize) {
    for (var x = 0; x < CONFIG.TILE_SIZE; x += patchSize) {
      tctx.fillStyle = PS.render.surfaceDraw.getSubcellBasePatchColor(sample, baseColor, x, y);
      tctx.fillRect(
        screenX + x,
        screenY + y,
        Math.min(patchSize, CONFIG.TILE_SIZE - x),
        Math.min(patchSize, CONFIG.TILE_SIZE - y)
      );
    }
  }
};

PS.render.surfaceDraw.drawMicrotexture = function (tctx, sample, baseColor, screenX, screenY) {
  var swatches = getPlanetSurfaceFinePixelSwatches(sample, baseColor)
    .concat(getPlanetSurfaceReliefAccentSwatches(sample, baseColor))
    .concat(getPlanetSurfaceEdgeAccentSwatches(sample, baseColor))
    .concat(getPlanetSurfaceSilhouetteBreakupSwatches(sample, baseColor))
    .concat(getPlanetSurfaceStrataSwatches(sample, baseColor))
    .concat(getPlanetSurfacePatternSwatches(sample, baseColor))
    .concat(getPlanetSurfaceLandmarkSwatches(sample, baseColor))
    .concat(getPlanetSurfaceNaturalElementSwatches(sample, baseColor))
    .concat(getPlanetSurfaceMicrotextureSwatches(sample, baseColor));

  for (var i = 0; i < swatches.length; i++) {
    PS.render.surfaceDraw.drawSwatch(tctx, swatches[i], screenX, screenY);
  }

  tctx.globalAlpha = 1;
};
