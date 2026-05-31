function updateHud() {
  var fertilePercent = Math.round(
    (world.fertileTiles / (WORLD_WIDTH * WORLD_HEIGHT)) * 100
  );

  eraText.textContent = "ERA: " + world.era;
  populationText.textContent = "POPULATION: " + world.organisms.length;
  foodText.textContent =
    "TICK: " + world.tick +
    "   FOOD: " + world.food.length +
    "   FERTILE: " + fertilePercent + "%" +
    "   FPS: " + world.fps.toFixed(1) +
    "   TPS: " + world.tps.toFixed(1) +
    "   UPDATE: " + world.updateMs.toFixed(2) + "ms" +
    "   DRAW: " + world.drawMs.toFixed(2) + "ms" +
    "   MAX U/D: " + world.maxUpdateMs.toFixed(2) + "/" + world.maxDrawMs.toFixed(2) + "ms";

  speedLabel.textContent = "Speed: " + world.speed + "x";
  updateInspectPanel();
}

function getNearestOrganismToTile(tileX, tileY) {
  var nearestOrganism = null;
  var nearestDistance = Infinity;

  for (var i = 0; i < world.organisms.length; i++) {
    var organism = world.organisms[i];
    var distance = Math.abs(organism.x - tileX) + Math.abs(organism.y - tileY);

    if (distance < nearestDistance && distance <= 1) {
      nearestOrganism = organism;
      nearestDistance = distance;
    }
  }

  return nearestOrganism;
}

function formatOrganismTraits(organism) {
  var traits = ensureOrganismTraits(organism);

  return (
    "traits vision " + traits.vision +
    " metabolism " + traits.metabolism +
    " reproduce " + traits.reproductionEnergy +
    " roam " + traits.movementTendency.toFixed(2)
  );
}

function updateInspectPanel() {
  if (!world.inspectedTile) {
    inspectSummaryText.textContent = "INSPECT: None";
    inspectDetailsText.textContent = "TERRAIN: -   FOOD: -   ORGANISM: -";
    return;
  }

  var tileX = world.inspectedTile.x;
  var tileY = world.inspectedTile.y;
  var terrainName = isFertile(tileX, tileY) ? "fertile" : "barren";
  var hasFood = foodExistsAt(tileX, tileY);
  var organism = getNearestOrganismToTile(tileX, tileY);
  var organismText = "none";

  if (organism) {
    organismText =
      "energy " + organism.energy +
      " age " + organism.age +
      " pos " + organism.x + "," + organism.y +
      " dir " + organism.directionX + "," + organism.directionY +
      "   " + formatOrganismTraits(organism);
  }

  inspectSummaryText.textContent = "INSPECT: Tile " + tileX + "," + tileY;
  inspectDetailsText.textContent =
    "TERRAIN: " + terrainName +
    "   FOOD: " + (hasFood ? "yes" : "no") +
    "   ORGANISM: " + organismText;
}

function getTileFromCanvasEvent(event) {
  var rect = canvas.getBoundingClientRect();
  var canvasX = (event.clientX - rect.left) * (canvas.width / rect.width);
  var canvasY = (event.clientY - rect.top) * (canvas.height / rect.height);

  return {
    x: clamp(Math.floor(canvasX / CONFIG.TILE_SIZE), 0, WORLD_WIDTH - 1),
    y: clamp(Math.floor(canvasY / CONFIG.TILE_SIZE), 0, WORLD_HEIGHT - 1)
  };
}

function inspectTile(tileX, tileY) {
  world.inspectedTile = {
    x: clamp(tileX, 0, WORLD_WIDTH - 1),
    y: clamp(tileY, 0, WORLD_HEIGHT - 1)
  };

  drawWorld();
  updateHud();
}

window.setupControls = function() {
  canvas.addEventListener("click", function(event) {
    var tile = getTileFromCanvasEvent(event);
    inspectTile(tile.x, tile.y);
  });

  pauseButton.addEventListener("click", function() {
    world.isPaused = !world.isPaused;
    pauseButton.textContent = world.isPaused ? "Resume" : "Pause";
  });

  stepButton.addEventListener("click", function() {
    if (world.isPaused) {
      var updateStart = performance.now();
      updateWorld();
      world.updateMs = performance.now() - updateStart;
      world.maxUpdateMs = Math.max(world.maxUpdateMs, world.updateMs);
      world.interpolation = 1;

      var drawStart = performance.now();
      drawWorld();
      world.drawMs = performance.now() - drawStart;
      world.maxDrawMs = Math.max(world.maxDrawMs, world.drawMs);

      updateHud();
    }
  });

  speedDownButton.addEventListener("click", function() {
    world.speed = Math.max(1, world.speed - 1);
    updateHud();
  });

  speedUpButton.addEventListener("click", function() {
    world.speed = Math.min(10, world.speed + 1);
    updateHud();
  });

  restartButton.addEventListener("click", function() {
    seedWorld();
    drawWorld();
    updateHud();
  });
};
