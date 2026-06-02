PS.render = PS.render || {};
PS.render.atmosphere = PS.render.atmosphere || {};

PS.render.atmosphere.getCloudOpacity = function (latitude, longitude, seedOffset) {
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
};

PS.render.atmosphere.getLight = function (point) {
  if (!point) {
    return 0;
  }

  var visibility = clamp(Number(point.visibility) || 0, 0, 1);

  return clamp(0.22 + visibility * 0.58, 0, 1);
};

PS.render.atmosphere.drawCloudLayer = function (targetCtx) {
  var projection = getPlanetProjection();
  var sampleSize = PS.render.globe.getSampleSize(projection, 1.35);
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

      var opacity = PS.render.atmosphere.getCloudOpacity(point.tile.latitude, point.tile.longitude, cloudSeed);

      if (opacity <= 0.18) {
        continue;
      }

      var light = PS.render.atmosphere.getLight(point);
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
};

PS.render.atmosphere.drawOverlay = function (targetCtx) {
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

  limbGradient.addColorStop(0, "rgba(255, 255, 255, 0.010)");
  limbGradient.addColorStop(0.58, "rgba(86, 176, 255, 0.006)");
  limbGradient.addColorStop(0.84, "rgba(54, 148, 255, 0.024)");
  limbGradient.addColorStop(1, "rgba(4, 14, 34, 0.20)");
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
};

PS.render.atmosphere.drawShell = function (targetCtx) {
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
};

PS.render.atmosphere.rebuildShaders = function () {};
PS.render.atmosphere.rebuildTextures = function () {
  if (typeof invalidatePlanetRenderCache === "function") {
    invalidatePlanetRenderCache();
  }
};
