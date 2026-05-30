function drawPixel(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(
    x * CONFIG.TILE_SIZE,
    y * CONFIG.TILE_SIZE,
    CONFIG.TILE_SIZE,
    CONFIG.TILE_SIZE
  );
}

function drawTerrain() {
  for (var y = 0; y < WORLD_HEIGHT; y++) {
    for (var x = 0; x < WORLD_WIDTH; x++) {
      if (isFertile(x, y)) {
        drawPixel(x, y, "#12351d");
      } else {
        drawPixel(x, y, "#07080f");
      }
    }
  }
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
  for (var i = 0; i < world.organisms.length; i++) {
    var organism = world.organisms[i];
    drawPixel(organism.x, organism.y, getOrganismColor(organism));
  }
}

function drawScanlines() {
  ctx.fillStyle = "rgba(255, 255, 255, 0.025)";

  for (var y = 0; y < canvas.height; y += CONFIG.TILE_SIZE * 8) {
    ctx.fillRect(0, y, canvas.width, 1);
  }
}

window.drawWorld = function() {
  drawTerrain();
  drawFood();
  drawOrganisms();
  drawScanlines();
};