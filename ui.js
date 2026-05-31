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
  updateTraitSummary();
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

function getPopulationTraitSummary() {
  if (world.organisms.length === 0) {
    return null;
  }

  var totals = {
    vision: 0,
    metabolism: 0,
    reproductionEnergy: 0,
    movementTendency: 0
  };

  for (var i = 0; i < world.organisms.length; i++) {
    var traits = ensureOrganismTraits(world.organisms[i]);
    totals.vision += traits.vision;
    totals.metabolism += traits.metabolism;
    totals.reproductionEnergy += traits.reproductionEnergy;
    totals.movementTendency += traits.movementTendency;
  }

  return {
    vision: totals.vision / world.organisms.length,
    metabolism: totals.metabolism / world.organisms.length,
    reproductionEnergy: totals.reproductionEnergy / world.organisms.length,
    movementTendency: totals.movementTendency / world.organisms.length
  };
}

function updateTraitSummary() {
  var summary = getPopulationTraitSummary();

  if (!summary) {
    traitSummaryText.textContent = "TRAITS AVG: vision -   metabolism -   reproduce -   roam -";
    return;
  }

  traitSummaryText.textContent =
    "TRAITS AVG: vision " + summary.vision.toFixed(1) +
    "   metabolism " + summary.metabolism.toFixed(2) +
    "   reproduce " + summary.reproductionEnergy.toFixed(1) +
    "   roam " + summary.movementTendency.toFixed(2);
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

function setPersistenceStatus(message, isError) {
  persistenceStatus.textContent = message;
  persistenceStatus.classList.toggle("error", Boolean(isError));
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
    setPersistenceStatus("SAVE: Ready", false);
  });

  saveButton.addEventListener("click", function() {
    setPersistenceStatus("SAVE: Saving...", false);
    saveWorldToIndexedDB()
      .then(function(saveData) {
        setPersistenceStatus("SAVE: Saved tick " + saveData.tick, false);
      })
      .catch(function(error) {
        setPersistenceStatus("SAVE ERROR: " + error.message, true);
      });
  });

  loadButton.addEventListener("click", function() {
    setPersistenceStatus("SAVE: Loading...", false);
    loadWorldFromIndexedDB()
      .then(function(saveData) {
        setPersistenceStatus("SAVE: Loaded tick " + saveData.tick, false);
      })
      .catch(function(error) {
        setPersistenceStatus("LOAD ERROR: " + error.message, true);
      });
  });

  exportJsonButton.addEventListener("click", function() {
    try {
      var saveData = exportWorldToJsonFile();
      setPersistenceStatus("EXPORT: Downloaded tick " + saveData.tick, false);
    } catch (error) {
      setPersistenceStatus("EXPORT ERROR: " + error.message, true);
    }
  });

  importJsonButton.addEventListener("click", function() {
    importJsonFile.click();
  });

  importJsonFile.addEventListener("change", function() {
    var file = importJsonFile.files[0];

    setPersistenceStatus("IMPORT: Loading...", false);
    importWorldFromJsonFile(file)
      .then(function(saveData) {
        setPersistenceStatus("IMPORT: Loaded tick " + saveData.tick, false);
      })
      .catch(function(error) {
        setPersistenceStatus("IMPORT ERROR: " + error.message, true);
      })
      .finally(function() {
        importJsonFile.value = "";
      });
  });
};
