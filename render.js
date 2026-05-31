var terrainCache;

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

function buildTerrainCache() {
  terrainCache = document.createElement("canvas");
  terrainCache.width = canvas.width;
  terrainCache.height = canvas.height;

  var tctx = terrainCache.getContext("2d");

  for (var y = 0; y < WORLD_HEIGHT; y++) {
    for (var x = 0; x < WORLD_WIDTH; x++) {
      if (isFertile(x, y)) {
        tctx.fillStyle = "#12351d";
      } else {
        tctx.fillStyle = "#07080f";
      }

      tctx.fillRect(
        x * CONFIG.TILE_SIZE,
        y * CONFIG.TILE_SIZE,
        CONFIG.TILE_SIZE,
        CONFIG.TILE_SIZE
      );
    }
  }
}

function drawTerrain() {
  if (!terrainCache) {
    buildTerrainCache();
  }

  ctx.drawImage(terrainCache, 0, 0);
}

function drawFood() {
  for (var i = 0; i < world.food.length; i++) {
    var food = world.food[i];
    drawEntityAtCanvasPosition(
      food.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
      food.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
      CONFIG.FOOD_DRAW_SIZE,
      "#58f06c"
    );
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
    var previousX = typeof organism.prevX === "number" ? organism.prevX : organism.x;
    var previousY = typeof organism.prevY === "number" ? organism.prevY : organism.y;
    var renderX = previousX + (organism.x - previousX) * interpolation;
    var renderY = previousY + (organism.y - previousY) * interpolation;

    drawEntityAtCanvasPosition(
      renderX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
      renderY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
      CONFIG.ORGANISM_DRAW_SIZE,
      getOrganismColor(organism)
    );
  }
}

function getSettlementDrawSize(settlement) {
  var level = Math.max(1, Math.round(Number(settlement.level) || 1));
  var growthScale = 2.1 + Math.min(level - 1, 5) * 0.35;
  return CONFIG.ORGANISM_DRAW_SIZE * growthScale;
}

function getRenderedSettlementById(settlementId) {
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

    var parentX = parentSettlement.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    var parentY = parentSettlement.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    var childX = childSettlement.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    var childY = childSettlement.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    var lineageColor = getLineageColorById(route.lineageId || parentSettlement.lineageId);
    var isColonyRoute = parentSettlement.isColony || childSettlement.isColony;

    ctx.beginPath();
    ctx.moveTo(parentX, parentY);
    ctx.lineTo(childX, childY);
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
    var canvasX = settlement.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    var canvasY = settlement.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    var canvasRadius = radius * CONFIG.TILE_SIZE;
    var lineageColor = getLineageColorById(settlement.lineageId);

    ctx.beginPath();
    ctx.moveTo(canvasX, canvasY - canvasRadius);
    ctx.lineTo(canvasX + canvasRadius, canvasY);
    ctx.lineTo(canvasX, canvasY + canvasRadius);
    ctx.lineTo(canvasX - canvasRadius, canvasY);
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
    var canvasX = settlement.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    var canvasY = settlement.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    var size = getSettlementDrawSize(settlement);
    var markerSize = Math.min(7, 3 + Math.max(0, Math.round(Number(settlement.level) || 1) - 1));

    ctx.fillStyle = settlement.isColony ? "rgba(8, 24, 26, 0.66)" : (settlement.isOutpost ? "rgba(8, 10, 18, 0.58)" : "rgba(5, 6, 10, 0.72)");
    ctx.fillRect(canvasX - size / 2, canvasY - size / 2, size, size);
    ctx.strokeStyle = settlement.isActive ? getLineageColorById(settlement.lineageId) : "rgba(255, 255, 255, 0.42)";
    ctx.lineWidth = Math.min(4, 1 + Math.max(1, Math.round(Number(settlement.level) || 1)));
    ctx.setLineDash(settlement.isOutpost && !settlement.isColony ? [3, 2] : []);
    ctx.strokeRect(canvasX - size / 2, canvasY - size / 2, size, size);
    ctx.setLineDash([]);
    ctx.fillStyle = settlement.isColony ? "#70f0d0" : (settlement.isOutpost ? "#fff26b" : "#f2b85b");
    ctx.fillRect(canvasX - markerSize / 2, canvasY - markerSize / 2, markerSize, markerSize);
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

  var canvasX = world.inspectedTile.x * CONFIG.TILE_SIZE;
  var canvasY = world.inspectedTile.y * CONFIG.TILE_SIZE;

  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  ctx.fillRect(canvasX, canvasY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.strokeRect(canvasX - 1, canvasY - 1, CONFIG.TILE_SIZE + 2, CONFIG.TILE_SIZE + 2);
}

window.buildTerrainCache = buildTerrainCache;

window.drawWorld = function() {
  drawTerrain();
  drawSettlementInfluence();
  drawSettlementRoutes();
  drawFood();
  drawSettlements();
  drawOrganisms();
  drawInspectSelection();
  drawScanlines();
};
