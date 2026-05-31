const PIXELSIM_DB_NAME = "pixelsim";
const PIXELSIM_DB_VERSION = 1;
const PIXELSIM_SAVE_STORE = "saves";
const PIXELSIM_SAVE_ID = "latest";
const PIXELSIM_SAVE_VERSION = 1;

function openPixelSimDatabase() {
  return new Promise(function(resolve, reject) {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    var request = window.indexedDB.open(PIXELSIM_DB_NAME, PIXELSIM_DB_VERSION);

    request.onupgradeneeded = function(event) {
      var db = event.target.result;

      if (!db.objectStoreNames.contains(PIXELSIM_SAVE_STORE)) {
        db.createObjectStore(PIXELSIM_SAVE_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = function(event) {
      resolve(event.target.result);
    };

    request.onerror = function() {
      reject(new Error(request.error ? request.error.message : "Could not open IndexedDB"));
    };
  });
}

function copyOrganismForSave(organism) {
  return {
    x: organism.x,
    y: organism.y,
    prevX: organism.prevX,
    prevY: organism.prevY,
    energy: organism.energy,
    age: organism.age,
    directionX: organism.directionX,
    directionY: organism.directionY
  };
}

function copyFoodForSave(food) {
  return {
    x: food.x,
    y: food.y
  };
}

function createWorldSaveData() {
  return {
    id: PIXELSIM_SAVE_ID,
    version: PIXELSIM_SAVE_VERSION,
    savedAt: new Date().toISOString(),
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tileSize: CONFIG.TILE_SIZE,
    tick: world.tick,
    speed: world.speed,
    era: world.era,
    config: {
      startingOrganisms: CONFIG.STARTING_ORGANISMS,
      startingFood: CONFIG.STARTING_FOOD,
      maxFood: CONFIG.MAX_FOOD,
      maxOrganisms: CONFIG.MAX_ORGANISMS,
      organismDrawSize: CONFIG.ORGANISM_DRAW_SIZE,
      foodDrawSize: CONFIG.FOOD_DRAW_SIZE,
      ticksPerSimUpdate: CONFIG.TICKS_PER_SIM_UPDATE,
      simSpeedMultiplier: CONFIG.SIM_SPEED_MULTIPLIER
    },
    terrain: world.terrain.slice(),
    food: world.food.map(copyFoodForSave),
    organisms: world.organisms.map(copyOrganismForSave)
  };
}

function saveWorldToIndexedDB() {
  return openPixelSimDatabase().then(function(db) {
    return new Promise(function(resolve, reject) {
      var saveData = createWorldSaveData();
      var transaction = db.transaction(PIXELSIM_SAVE_STORE, "readwrite");
      var store = transaction.objectStore(PIXELSIM_SAVE_STORE);

      transaction.oncomplete = function() {
        db.close();
        resolve(saveData);
      };

      transaction.onerror = function() {
        db.close();
        reject(new Error(transaction.error ? transaction.error.message : "Could not save world"));
      };

      store.put(saveData);
    });
  });
}

function validateWorldSaveData(saveData) {
  if (!saveData || saveData.id !== PIXELSIM_SAVE_ID) {
    throw new Error("No PixelSim save found");
  }

  if (saveData.version !== PIXELSIM_SAVE_VERSION) {
    throw new Error("Unsupported save version");
  }

  if (!Array.isArray(saveData.terrain) || saveData.terrain.length !== WORLD_WIDTH * WORLD_HEIGHT) {
    throw new Error("Save terrain does not match this world size");
  }

  if (!Array.isArray(saveData.food) || !Array.isArray(saveData.organisms)) {
    throw new Error("Save is missing food or organism data");
  }
}

function restoreFood(food) {
  return {
    x: clamp(Math.round(Number(food.x)), 0, WORLD_WIDTH - 1),
    y: clamp(Math.round(Number(food.y)), 0, WORLD_HEIGHT - 1)
  };
}

function restoreOrganism(organism) {
  return {
    x: clamp(Math.round(Number(organism.x)), 0, WORLD_WIDTH - 1),
    y: clamp(Math.round(Number(organism.y)), 0, WORLD_HEIGHT - 1),
    prevX: clamp(Math.round(Number(organism.prevX)), 0, WORLD_WIDTH - 1),
    prevY: clamp(Math.round(Number(organism.prevY)), 0, WORLD_HEIGHT - 1),
    energy: Number(organism.energy),
    age: Number(organism.age),
    directionX: clamp(Math.round(Number(organism.directionX)), -1, 1),
    directionY: clamp(Math.round(Number(organism.directionY)), -1, 1)
  };
}

function countFertileTiles() {
  var fertileTiles = 0;

  for (var i = 0; i < world.terrain.length; i++) {
    if (world.terrain[i] === CONFIG.TERRAIN_FERTILE) {
      fertileTiles++;
    }
  }

  return fertileTiles;
}

function applySaveConfig(saveConfig) {
  if (!saveConfig) {
    return;
  }

  if (typeof saveConfig.startingFood === "number") {
    CONFIG.STARTING_FOOD = saveConfig.startingFood;
  }

  if (typeof saveConfig.maxFood === "number") {
    CONFIG.MAX_FOOD = saveConfig.maxFood;
  }

  if (typeof saveConfig.maxOrganisms === "number") {
    CONFIG.MAX_ORGANISMS = saveConfig.maxOrganisms;
  }

  if (typeof saveConfig.organismDrawSize === "number") {
    CONFIG.ORGANISM_DRAW_SIZE = saveConfig.organismDrawSize;
  }

  if (typeof saveConfig.foodDrawSize === "number") {
    CONFIG.FOOD_DRAW_SIZE = saveConfig.foodDrawSize;
  }
}

function applyWorldSaveData(saveData) {
  validateWorldSaveData(saveData);
  applySaveConfig(saveData.config);

  world.tick = Number(saveData.tick);
  world.speed = clamp(Math.round(Number(saveData.speed)), 1, 10);
  world.era = String(saveData.era || "Organisms");
  world.terrain = saveData.terrain.slice();
  world.fertileTiles = countFertileTiles();
  world.food = saveData.food.map(restoreFood);
  world.organisms = saveData.organisms.map(restoreOrganism);
  world.interpolation = 0;
  world.fps = 0;
  world.tps = 0;
  world.updateMs = 0;
  world.drawMs = 0;
  world.maxUpdateMs = 0;
  world.maxDrawMs = 0;

  if (typeof buildTerrainCache === "function") {
    buildTerrainCache();
  }

  drawWorld();
  updateHud();
}

function loadWorldFromIndexedDB() {
  return openPixelSimDatabase().then(function(db) {
    return new Promise(function(resolve, reject) {
      var transaction = db.transaction(PIXELSIM_SAVE_STORE, "readonly");
      var store = transaction.objectStore(PIXELSIM_SAVE_STORE);
      var request = store.get(PIXELSIM_SAVE_ID);

      request.onsuccess = function(event) {
        try {
          var saveData = event.target.result;
          applyWorldSaveData(saveData);
          db.close();
          resolve(saveData);
        } catch (error) {
          db.close();
          reject(error);
        }
      };

      request.onerror = function() {
        db.close();
        reject(new Error(request.error ? request.error.message : "Could not load world"));
      };
    });
  });
}

function exportWorldToJsonFile() {
  var saveData = createWorldSaveData();
  var json = JSON.stringify(saveData, null, 2);
  var blob = new Blob([json], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");

  link.href = url;
  link.download = "pixelsim-world-tick-" + world.tick + ".json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(function() {
    URL.revokeObjectURL(url);
  }, 0);

  return saveData;
}

function importWorldFromJsonFile(file) {
  return new Promise(function(resolve, reject) {
    if (!file) {
      reject(new Error("No JSON file selected"));
      return;
    }

    var reader = new FileReader();

    reader.onload = function(event) {
      try {
        var saveData = JSON.parse(event.target.result);
        applyWorldSaveData(saveData);
        resolve(saveData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = function() {
      reject(new Error(reader.error ? reader.error.message : "Could not read JSON file"));
    };

    reader.readAsText(file);
  });
}
