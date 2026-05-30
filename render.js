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

function drawPixelAtCanvasPosition(canvasX, canvasY, color) {
  ctx.fillStyle = color;
  ctx.fillRect(canvasX, canvasY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
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
    drawPixel(food.x, food.y, "#58f06c");
  }
}

function getOrganismColor(organism) {
  if (organism.energy > 200) {
    return "#fff26b";
  }

  if (organism.energy < 60) {
    return "#ff9c69";
  }

  return "#72d7ff";
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

    drawPixelAtCanvasPosition(
      renderX * CONFIG.TILE_SIZE,
      renderY * CONFIG.TILE_SIZE,
      getOrganismColor(organism)
    );
  }
}

function drawScanlines() {
  ctx.fillStyle = "rgba(255, 255, 255, 0.025)";

  for (var y = 0; y < canvas.height; y += CONFIG.TILE_SIZE * 8) {
    ctx.fillRect(0, y, canvas.width, 1);
  }
}

window.buildTerrainCache = buildTerrainCache;

window.drawWorld = function() {
  drawTerrain();
  drawFood();
  drawOrganisms();
  drawScanlines();
};