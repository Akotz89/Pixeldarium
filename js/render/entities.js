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
  return false;
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

  if (PS.render.entityWebgl && PS.render.entityWebgl.drawFood()) {
    return;
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

  var usedInstancedEntities = PS.render.entityWebgl && PS.render.entityWebgl.drawOrganisms(interpolation);

  for (var i = 0; i < world.organisms.length; i++) {
    var organism = world.organisms[i];
    if (usedInstancedEntities) {
      PS.render.entities.drawRepresentativeMarker(organism, interpolation);
    }
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

PS.render.entities.getSettlementRenderPosition = function (settlement) {
  if (!settlement) {
    return null;
  }

  return PS.render.entities.getRenderPosition(settlement, 1);
};

PS.render.entities.drawSettlementMapBadge = function (settlement, point, size) {
  return false;
};

PS.render.entities.drawSettlements = function () {
  if (!PS.render.entities.shouldDrawGlobeScaleEntities()) {
    return false;
  }

  return Boolean(PS.render.entityWebgl && PS.render.entityWebgl.drawSettlements());
};

PS.render.entities.drawSettlementInfluence = function () {
  if (!PS.render.entities.shouldDrawGlobeScaleEntities()) {
    return false;
  }

  return Boolean(PS.render.entityWebgl && PS.render.entityWebgl.drawSettlementInfluence());
};

PS.render.entities.drawSettlementRoutes = function () {
  if (!PS.render.entities.shouldDrawGlobeScaleEntities()) {
    return false;
  }

  return Boolean(PS.render.entityWebgl && PS.render.entityWebgl.drawSettlementRoutes());
};

PS.render.entities.drawOrbitalAssets = function () {
  return false;
};

PS.render.entities.drawPlanetaryBodies = function () {
  return false;
};

PS.render.entities.drawProbeMissions = function () {
  return false;
};

PS.render.entities.drawStarSystems = function () {
  return false;
};

PS.render.entities.drawEmpireSectors = function () {
  return false;
};

PS.render.entities.drawInterstellarFleets = function () {
  return false;
};

PS.render.entities.drawEmpireLegacy = function () {
  return false;
};

PS.render.entities.rebuildShaders = function () {};
PS.render.entities.rebuildTextures = function () {};
