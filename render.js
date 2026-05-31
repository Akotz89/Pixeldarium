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

function drawSettlements() {
  if (!Array.isArray(world.settlements)) {
    return;
  }

  for (var i = 0; i < world.settlements.length; i++) {
    var settlement = world.settlements[i];
    var canvasX = settlement.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    var canvasY = settlement.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    var size = CONFIG.ORGANISM_DRAW_SIZE * 2.2;

    ctx.fillStyle = "rgba(5, 6, 10, 0.72)";
    ctx.fillRect(canvasX - size / 2, canvasY - size / 2, size, size);
    ctx.strokeStyle = settlement.isActive ? getLineageColorById(settlement.lineageId) : "rgba(255, 255, 255, 0.42)";
    ctx.lineWidth = 2;
    ctx.strokeRect(canvasX - size / 2, canvasY - size / 2, size, size);
    ctx.fillStyle = "#f2b85b";
    ctx.fillRect(canvasX - 1.5, canvasY - 1.5, 3, 3);
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
  drawFood();
  drawSettlements();
  drawOrganisms();
  drawInspectSelection();
  drawScanlines();
};
