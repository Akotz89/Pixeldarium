PS.render = PS.render || {};
PS.render.entities = PS.render.entities || {};

PS.render.entities.getTileRenderPosition = function (tileX, tileY) {
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
};

PS.render.entities.drawTileEntity = function (tileX, tileY, size, color) {
  var point = PS.render.entities.getTileRenderPosition(tileX, tileY);

  if (!point) {
    return;
  }

  drawEntityAtCanvasPosition(
    point.x,
    point.y,
    Math.max(1, size * (point.scale || 1)),
    color
  );
};

PS.render.entities.getInterpolationAmount = function (interpolation) {
  var rawInterpolation = Number(interpolation);
  return Number.isFinite(rawInterpolation) ? clamp(rawInterpolation, 0, 1) : 1;
};

PS.render.entities.getInterpolatedTileCoordinate = function (previous, current, amount, worldSize, shouldWrap) {
  var from = Number(previous);
  var to = Number(current);

  if (!Number.isFinite(from) || !Number.isFinite(to) || amount >= 1) {
    return to;
  }

  var delta = to - from;

  if (shouldWrap && worldSize > 0 && Math.abs(delta) > worldSize / 2) {
    delta += delta > 0 ? -worldSize : worldSize;
  }

  var value = from + delta * amount;

  if (shouldWrap && worldSize > 0) {
    while (value < 0) {
      value += worldSize;
    }

    while (value >= worldSize) {
      value -= worldSize;
    }
  }

  return value;
};

PS.render.entities.getInterpolatedTileRenderPosition = function (entity, amount) {
  if (!entity) {
    return null;
  }

  return PS.render.entities.getTileRenderPosition(
    PS.render.entities.getInterpolatedTileCoordinate(entity.prevX, entity.x, amount, WORLD_WIDTH, true),
    PS.render.entities.getInterpolatedTileCoordinate(entity.prevY, entity.y, amount, WORLD_HEIGHT, false)
  );
};

PS.render.entities.getRenderPosition = function (entity, interpolation) {
  if (!entity) {
    return null;
  }

  var amount = PS.render.entities.getInterpolationAmount(interpolation);

  if (!isGlobeRenderMode()) {
    return PS.render.entities.getInterpolatedTileRenderPosition(entity, amount);
  }

  var surfacePosition = getEntitySurfacePosition(entity);

  if (!surfacePosition) {
    return PS.render.entities.getInterpolatedTileRenderPosition(entity, amount);
  }

  ensureEntitySurfacePosition(entity);

  var renderLatitude = surfacePosition.latitude;
  var renderLongitude = surfacePosition.longitude;

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

  return PS.render.entities.getTileRenderPosition(entity.x, entity.y);
};

PS.render.entities.drawSurfaceEntity = function (entity, interpolation, size, color, spriteId, state) {
  var point = PS.render.entities.getRenderPosition(entity, interpolation);

  if (!point) {
    return;
  }

  if (spriteId && typeof PS.render.entities.drawRegisteredSprite === "function") {
    PS.render.entities.drawRegisteredSprite(
      spriteId,
      entity,
      point,
      Math.max(1, size * (point.scale || 1)),
      color,
      state
    );
    return;
  }

  drawEntityAtCanvasPosition(
    point.x,
    point.y,
    Math.max(1, size * (point.scale || 1)),
    color
  );
};

PS.render.entities.shouldDrawGlobeScaleEntities = function () {
  return !isGlobeRenderMode() ||
    isPlanetLocalView() ||
    Boolean(CONFIG.PLANET_GLOBE_ENTITY_MARKERS) ||
    Boolean(CONFIG.PLANET_DEBUG_OVERLAY);
};

PS.render.entities.drawFood = function () {
  if (!PS.render.entities.shouldDrawGlobeScaleEntities()) {
    return;
  }

  for (var i = 0; i < world.food.length; i++) {
    var food = world.food[i];
    PS.render.entities.drawSurfaceEntity(food, 1, CONFIG.FOOD_DRAW_SIZE, "#58f06c", "resource.food", "idle");
  }
};

PS.render.entities.getRgbaFromHex = function (hexColor, alpha) {
  var color = String(hexColor || "#ffffff").replace("#", "");

  if (color.length !== 6) {
    return "rgba(255, 255, 255, " + alpha + ")";
  }

  var red = parseInt(color.slice(0, 2), 16);
  var green = parseInt(color.slice(2, 4), 16);
  var blue = parseInt(color.slice(4, 6), 16);
  return "rgba(" + red + ", " + green + ", " + blue + ", " + alpha + ")";
};

PS.render.entities.getLineageColor = function (organism) {
  var lineageId = typeof organism.lineageId === "number" ? organism.lineageId : 1;
  return PS.render.entities.getLineageColorById(lineageId);
};

PS.render.entities.getLineageColorById = function (lineageId) {
  var colorIndex = (lineageId - 1) % CONFIG.LINEAGE_COLORS.length;
  return CONFIG.LINEAGE_COLORS[colorIndex];
};

PS.render.entities.getOrganismColor = function (organism) {
  if (organism.energy > 200) {
    return "#fff26b";
  }

  if (organism.energy < 60) {
    return "#ff9c69";
  }

  return PS.render.entities.getLineageColor(organism);
};

PS.render.entities.drawRepresentativeMarker = function (organism, interpolation) {
  if (!PS.sim || !PS.sim.representatives || !PS.sim.representatives.getRepresentative) {
    return;
  }

  var representative = PS.sim.representatives.getRepresentative(organism.representativeId);

  if (!representative || (!representative.selected && !representative.pinned && representative.bookmarkScore <= 0)) {
    return;
  }

  var point = PS.render.entities.getRenderPosition(organism, interpolation);

  if (!point) {
    return;
  }

  var size = Math.max(4, CONFIG.ORGANISM_DRAW_SIZE * (point.scale || 1) * 2.2);
  ctx.save();
  ctx.strokeStyle = representative.pinned ? "#fff26b" : "#72d7ff";
  ctx.lineWidth = Math.max(1, size * 0.18);
  ctx.beginPath();
  ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
  ctx.stroke();

  if (representative.bookmarkScore > 0) {
    ctx.fillStyle = PS.render.entities.getRgbaFromHex("#fff26b", clamp(representative.bookmarkScore, 0.2, 0.75));
    ctx.fillRect(point.x - size * 0.18, point.y - size * 1.45, size * 0.36, size * 0.70);
  }

  ctx.restore();
};

PS.render.entities.drawOrganisms = function () {
  if (!PS.render.entities.shouldDrawGlobeScaleEntities()) {
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
    PS.render.entities.drawSurfaceEntity(
      organism,
      interpolation,
      CONFIG.ORGANISM_DRAW_SIZE,
      PS.render.entities.getOrganismColor(organism),
      "entity.organism",
      PS.render.entities.getOrganismSpriteState(organism)
    );
    PS.render.entities.drawRepresentativeMarker(organism, interpolation);
  }
};

PS.render.entities.getSettlementDrawSize = function (settlement) {
  var level = Math.max(1, Math.round(Number(settlement.level) || 1));
  var growthScale = 2.1 + Math.min(level - 1, 5) * 0.35;
  return CONFIG.ORGANISM_DRAW_SIZE * growthScale;
};

PS.render.entities.getSettlementById = function (settlementId) {
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
};

PS.render.entities.drawSettlements = function () {
  if (!Array.isArray(world.settlements)) {
    return;
  }

  for (var i = 0; i < world.settlements.length; i++) {
    var settlement = world.settlements[i];
    var point = PS.render.entities.getTileRenderPosition(settlement.x, settlement.y);

    if (!point) {
      continue;
    }

    var size = PS.render.entities.getSettlementDrawSize(settlement) * (point.scale || 1);
    var markerSize = Math.min(7, 3 + Math.max(0, Math.round(Number(settlement.level) || 1) - 1)) * (point.scale || 1);

    PS.render.entities.drawRegisteredSprite(
      "settlement.core",
      settlement,
      point,
      size,
      settlement.isActive ? PS.render.entities.getLineageColorById(settlement.lineageId) : "rgba(255, 255, 255, 0.42)",
      settlement.isColony ? "colony" : (settlement.isOutpost ? "outpost" : "core")
    );
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
};

PS.render.entities.drawSettlementInfluence = function () {
  if (!Array.isArray(world.settlements)) {
    return;
  }

  for (var i = 0; i < world.settlements.length; i++) {
    var settlement = world.settlements[i];
    var radius = Math.max(1, Math.round(Number(settlement.influenceRadius) || CONFIG.SETTLEMENT_INFLUENCE_BASE_RADIUS));
    var point = PS.render.entities.getTileRenderPosition(settlement.x, settlement.y);

    if (!point) {
      continue;
    }

    var canvasRadius = radius * CONFIG.TILE_SIZE * (point.scale || 1);
    var lineageColor = PS.render.entities.getLineageColorById(settlement.lineageId);

    ctx.beginPath();
    ctx.moveTo(point.x, point.y - canvasRadius);
    ctx.lineTo(point.x + canvasRadius, point.y);
    ctx.lineTo(point.x, point.y + canvasRadius);
    ctx.lineTo(point.x - canvasRadius, point.y);
    ctx.closePath();
    ctx.fillStyle = PS.render.entities.getRgbaFromHex(lineageColor, settlement.isActive ? 0.07 : 0.035);
    ctx.fill();
    ctx.strokeStyle = PS.render.entities.getRgbaFromHex(lineageColor, settlement.isActive ? 0.22 : 0.12);
    ctx.lineWidth = Math.min(3, Math.max(1, Math.round(Number(settlement.level) || 1)));
    ctx.stroke();
  }
};

PS.render.entities.drawSettlementRoutes = function () {
  if (!Array.isArray(world.settlementRoutes)) {
    return;
  }

  for (var i = 0; i < world.settlementRoutes.length; i++) {
    var route = world.settlementRoutes[i];
    var parentSettlement = PS.render.entities.getSettlementById(route.parentSettlementId);
    var childSettlement = PS.render.entities.getSettlementById(route.childSettlementId);

    if (!parentSettlement || !childSettlement) {
      continue;
    }

    var parentPoint = PS.render.entities.getTileRenderPosition(parentSettlement.x, parentSettlement.y);
    var childPoint = PS.render.entities.getTileRenderPosition(childSettlement.x, childSettlement.y);

    if (!parentPoint || !childPoint) {
      continue;
    }

    var lineageColor = PS.render.entities.getLineageColorById(route.lineageId || parentSettlement.lineageId);
    var isColonyRoute = parentSettlement.isColony || childSettlement.isColony;

    ctx.beginPath();
    ctx.moveTo(parentPoint.x, parentPoint.y);
    ctx.lineTo(childPoint.x, childPoint.y);
    ctx.strokeStyle = isColonyRoute ? "rgba(112, 240, 208, 0.68)" : PS.render.entities.getRgbaFromHex(lineageColor, route.isActive ? 0.52 : 0.20);
    ctx.lineWidth = isColonyRoute ? 3 : (route.isActive ? 2 : 1);
    ctx.setLineDash(isColonyRoute ? [10, 3] : (route.isActive ? [6, 4] : [2, 5]));
    ctx.stroke();
    ctx.setLineDash([]);
  }
};

PS.render.entities.drawOrbitalAssets = function () {
  return PS.render.overlays.drawOrbitalAssets();
};

PS.render.entities.drawPlanetaryBodies = function () {
  return PS.render.overlays.drawPlanetaryBodies();
};

PS.render.entities.drawProbeMissions = function () {
  return PS.render.overlays.drawProbeMissions();
};

PS.render.entities.drawStarSystems = function () {
  return PS.render.overlays.drawStarSystems();
};

PS.render.entities.drawEmpireSectors = function () {
  return PS.render.overlays.drawEmpireSectors();
};

PS.render.entities.drawInterstellarFleets = function () {
  return PS.render.overlays.drawInterstellarFleets();
};

PS.render.entities.drawEmpireLegacy = function () {
  return PS.render.overlays.drawEmpireLegacy();
};

PS.render.entities.rebuildShaders = function () {};
PS.render.entities.rebuildTextures = function () {};
