var terrainCache;

function invalidateTerrainCache() {
  terrainCache = null;
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

  if (detail.surface === "whitecap") {
    return shadeHexColor("#9ed8f0", shade);
  }

  if (detail.surface === "open water") {
    return shadeHexColor("#0a3558", shade);
  }

  if (detail.surface === "deep water") {
    return shadeHexColor("#031026", shade);
  }

  if (detail.surface === "clearing" || detail.surface === "meadow") {
    return shadeHexColor("#2e6835", shade);
  }

  if (detail.surface === "dense canopy") {
    return shadeHexColor("#0a2a18", shade);
  }

  if (detail.surface === "woodland") {
    return shadeHexColor("#123f23", shade);
  }

  if (detail.surface === "brush") {
    return shadeHexColor("#346337", shade);
  }

  if (detail.surface === "grass") {
    return shadeHexColor("#23552d", shade);
  }

  if (detail.surface === "rock" || detail.surface === "stone") {
    return shadeHexColor("#4b4b43", shade);
  }

  if (detail.surface === "dune" || detail.surface === "sand") {
    return shadeHexColor("#755f2d", shade);
  }

  if (detail.surface === "scrub" || detail.surface === "moss") {
    return shadeHexColor("#334739", shade);
  }

  if (detail.surface === "ridge ice" || detail.surface === "ice") {
    return shadeHexColor("#9cc8d8", shade);
  }

  if (detail.surface === "snow") {
    return shadeHexColor("#d9edf4", shade);
  }

  return shadeHexColor(baseColor, shade);
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
  targetCtx.strokeStyle = "rgba(142, 160, 255, 0.76)";
  targetCtx.lineWidth = 2;
  targetCtx.stroke();
  targetCtx.beginPath();
  targetCtx.arc(projection.centerX, projection.centerY, projection.radius + 6, 0, Math.PI * 2);
  targetCtx.strokeStyle = "rgba(112, 240, 208, 0.10)";
  targetCtx.lineWidth = 8;
  targetCtx.stroke();
}

function buildFlatTerrainCache(tctx) {
  for (var y = 0; y < WORLD_HEIGHT; y++) {
    for (var x = 0; x < WORLD_WIDTH; x++) {
      tctx.fillStyle = getPlanetBiomeColor(getPlanetTileBiome(x, y));

      tctx.fillRect(
        x * CONFIG.TILE_SIZE,
        y * CONFIG.TILE_SIZE,
        CONFIG.TILE_SIZE,
        CONFIG.TILE_SIZE
      );
    }
  }
}

function buildGlobeTerrainCache(tctx) {
  var projection = getPlanetProjection();
  var sampleSize = Math.max(2, Math.ceil((projection.radius * 2.35) / Math.max(WORLD_WIDTH, WORLD_HEIGHT)));

  drawPlanetShell(tctx);

  for (var y = 0; y < WORLD_HEIGHT; y++) {
    for (var x = 0; x < WORLD_WIDTH; x++) {
      var point = getPlanetTileProjection(x, y);

      if (!point) {
        continue;
      }

      tctx.globalAlpha = clamp(0.48 + point.visibility * 0.62, 0.48, 1);
      tctx.fillStyle = getPlanetBiomeColor(getPlanetTileBiome(x, y));
      tctx.fillRect(
        point.x - sampleSize / 2,
        point.y - sampleSize / 2,
        sampleSize,
        sampleSize
      );
    }
  }

  tctx.globalAlpha = 1;
}

function buildLocalTerrainCache(tctx) {
  var footprint = getPlanetLocalViewFootprint();

  tctx.fillStyle = "#01030a";
  tctx.fillRect(0, 0, canvas.width, canvas.height);

  for (var y = 0; y < WORLD_HEIGHT; y++) {
    for (var x = 0; x < WORLD_WIDTH; x++) {
      var sample = getPlanetLocalSample(x, y);
      var screenX = x * CONFIG.TILE_SIZE;
      var screenY = y * CONFIG.TILE_SIZE;

      tctx.fillStyle = getPlanetSurfaceColor(sample);
      tctx.fillRect(screenX, screenY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
    }
  }

  tctx.strokeStyle = "rgba(255, 255, 255, 0.10)";
  tctx.lineWidth = 1;

  for (var gridX = 0; gridX <= WORLD_WIDTH; gridX += 16) {
    tctx.beginPath();
    tctx.moveTo(gridX * CONFIG.TILE_SIZE, 0);
    tctx.lineTo(gridX * CONFIG.TILE_SIZE, canvas.height);
    tctx.stroke();
  }

  for (var gridY = 0; gridY <= WORLD_HEIGHT; gridY += 16) {
    tctx.beginPath();
    tctx.moveTo(0, gridY * CONFIG.TILE_SIZE);
    tctx.lineTo(canvas.width, gridY * CONFIG.TILE_SIZE);
    tctx.stroke();
  }

  tctx.fillStyle = "rgba(3, 4, 9, 0.54)";
  tctx.fillRect(18, canvas.height - 70, 510, 26);
  tctx.fillStyle = "rgba(220, 229, 255, 0.88)";
  tctx.font = "14px Arial, Helvetica, sans-serif";
  tctx.fillText(
    getPlanetScaleLabel() + " | view " +
      footprint.widthKm.toLocaleString(undefined, { maximumFractionDigits: 2 }) + " x " +
      footprint.heightKm.toLocaleString(undefined, { maximumFractionDigits: 2 }) + " km",
    28,
    canvas.height - 52
  );
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
}

function drawPlanetReferenceGrid() {
  var lonStep = Math.max(10, Math.round(Number(CONFIG.PLANET_GRID_DEGREES) || 30));
  var latStep = lonStep;

  if (isGlobeRenderMode() && isPlanetLocalView()) {
    var view = getPlanetView();
    var footprint = getPlanetLocalViewFootprint();

    ctx.save();
    ctx.strokeStyle = "rgba(112, 240, 208, 0.42)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      canvas.width / 2 - 12,
      canvas.height / 2 - 12,
      24,
      24
    );
    ctx.fillStyle = "rgba(3, 4, 9, 0.54)";
    ctx.fillRect(18, canvas.height - 38, 610, 24);
    ctx.fillStyle = "rgba(220, 229, 255, 0.88)";
    ctx.font = "14px Arial, Helvetica, sans-serif";
    ctx.fillText(
      "focus " + view.latitude.toFixed(4) + ", " + view.longitude.toFixed(4) +
        " | footprint " + footprint.widthKm.toLocaleString(undefined, { maximumFractionDigits: 2 }) +
        " x " + footprint.heightKm.toLocaleString(undefined, { maximumFractionDigits: 2 }) + " km",
      28,
      canvas.height - 21
    );
    ctx.restore();
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

  if (world.planetSummary) {
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

function drawFood() {
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
