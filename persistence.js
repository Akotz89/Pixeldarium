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

function copyOrganismTraitsForSave(traits) {
  return {
    vision: traits.vision,
    metabolism: traits.metabolism,
    reproductionEnergy: traits.reproductionEnergy,
    movementTendency: traits.movementTendency
  };
}

function copyOrganismForSave(organism) {
  var traits = ensureOrganismTraits(organism);

  return {
    x: organism.x,
    y: organism.y,
    prevX: organism.prevX,
    prevY: organism.prevY,
    energy: organism.energy,
    age: organism.age,
    directionX: organism.directionX,
    directionY: organism.directionY,
    traits: copyOrganismTraitsForSave(traits),
    lineageId: ensureOrganismLineage(organism),
    lineageParentId: organism.lineageParentId,
    generation: organism.generation
  };
}

function copyFoodForSave(food) {
  return {
    x: food.x,
    y: food.y
  };
}

function copyTraitHistorySampleForSave(sample) {
  return {
    tick: sample.tick,
    population: sample.population,
    vision: sample.vision,
    metabolism: sample.metabolism,
    reproductionEnergy: sample.reproductionEnergy,
    movementTendency: sample.movementTendency
  };
}

function copyLineageForSave(lineage) {
  return {
    id: lineage.id,
    parentId: lineage.parentId,
    createdTick: lineage.createdTick,
    founderGeneration: lineage.founderGeneration,
    founderTraits: copyOrganismTraitsForSave(lineage.founderTraits),
    activeCount: lineage.activeCount,
    lastSeenTick: lineage.lastSeenTick,
    peakPopulation: lineage.peakPopulation,
    isExtinct: lineage.isExtinct
  };
}

function getLineagesForSave() {
  if (typeof refreshLineageRegistry === "function") {
    refreshLineageRegistry();
  }

  var lineages = [];
  var lineageRecords = world.lineages || {};

  for (var lineageKey in lineageRecords) {
    if (Object.prototype.hasOwnProperty.call(lineageRecords, lineageKey)) {
      lineages.push(copyLineageForSave(lineageRecords[lineageKey]));
    }
  }

  lineages.sort(function(a, b) {
    return a.id - b.id;
  });

  return lineages;
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
    nextLineageId: world.nextLineageId,
    config: {
      startingOrganisms: CONFIG.STARTING_ORGANISMS,
      startingFood: CONFIG.STARTING_FOOD,
      maxFood: CONFIG.MAX_FOOD,
      maxOrganisms: CONFIG.MAX_ORGANISMS,
      organismDrawSize: CONFIG.ORGANISM_DRAW_SIZE,
      foodDrawSize: CONFIG.FOOD_DRAW_SIZE,
      ticksPerSimUpdate: CONFIG.TICKS_PER_SIM_UPDATE,
      simSpeedMultiplier: CONFIG.SIM_SPEED_MULTIPLIER,
      traitMutationChance: CONFIG.TRAIT_MUTATION_CHANCE,
      traitVisionMin: CONFIG.TRAIT_VISION_MIN,
      traitVisionMax: CONFIG.TRAIT_VISION_MAX,
      traitVisionDefault: CONFIG.TRAIT_VISION_DEFAULT,
      traitVisionMutationStep: CONFIG.TRAIT_VISION_MUTATION_STEP,
      traitMetabolismMin: CONFIG.TRAIT_METABOLISM_MIN,
      traitMetabolismMax: CONFIG.TRAIT_METABOLISM_MAX,
      traitMetabolismDefault: CONFIG.TRAIT_METABOLISM_DEFAULT,
      traitMetabolismMutationStep: CONFIG.TRAIT_METABOLISM_MUTATION_STEP,
      traitReproductionEnergyMin: CONFIG.TRAIT_REPRODUCTION_ENERGY_MIN,
      traitReproductionEnergyMax: CONFIG.TRAIT_REPRODUCTION_ENERGY_MAX,
      traitReproductionEnergyDefault: CONFIG.TRAIT_REPRODUCTION_ENERGY_DEFAULT,
      traitReproductionEnergyMutationStep: CONFIG.TRAIT_REPRODUCTION_ENERGY_MUTATION_STEP,
      traitMovementTendencyMin: CONFIG.TRAIT_MOVEMENT_TENDENCY_MIN,
      traitMovementTendencyMax: CONFIG.TRAIT_MOVEMENT_TENDENCY_MAX,
      traitMovementTendencyDefault: CONFIG.TRAIT_MOVEMENT_TENDENCY_DEFAULT,
      traitMovementTendencyMutationStep: CONFIG.TRAIT_MOVEMENT_TENDENCY_MUTATION_STEP,
      traitHistorySampleInterval: CONFIG.TRAIT_HISTORY_SAMPLE_INTERVAL,
      traitHistoryMaxSamples: CONFIG.TRAIT_HISTORY_MAX_SAMPLES,
      lineageDivergenceScoreForNewLineage: CONFIG.LINEAGE_DIVERGENCE_SCORE_FOR_NEW_LINEAGE,
      lineageRegistryVersion: 1,
      lineageColors: CONFIG.LINEAGE_COLORS.slice()
    },
    terrain: world.terrain.slice(),
    food: world.food.map(copyFoodForSave),
    organisms: world.organisms.map(copyOrganismForSave),
    traitHistory: world.traitHistory.map(copyTraitHistorySampleForSave),
    lineages: getLineagesForSave()
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

function restoreNumber(value, fallback) {
  var numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function restoreClampedNumber(value, fallback, minValue, maxValue) {
  return clamp(restoreNumber(value, fallback), minValue, maxValue);
}

function restoreOrganismTraits(traits) {
  traits = traits || {};

  return {
    vision: restoreClampedNumber(
      traits.vision,
      CONFIG.TRAIT_VISION_DEFAULT,
      CONFIG.TRAIT_VISION_MIN,
      CONFIG.TRAIT_VISION_MAX
    ),
    metabolism: restoreClampedNumber(
      traits.metabolism,
      CONFIG.TRAIT_METABOLISM_DEFAULT,
      CONFIG.TRAIT_METABOLISM_MIN,
      CONFIG.TRAIT_METABOLISM_MAX
    ),
    reproductionEnergy: restoreClampedNumber(
      traits.reproductionEnergy,
      CONFIG.TRAIT_REPRODUCTION_ENERGY_DEFAULT,
      CONFIG.TRAIT_REPRODUCTION_ENERGY_MIN,
      CONFIG.TRAIT_REPRODUCTION_ENERGY_MAX
    ),
    movementTendency: restoreClampedNumber(
      traits.movementTendency,
      CONFIG.TRAIT_MOVEMENT_TENDENCY_DEFAULT,
      CONFIG.TRAIT_MOVEMENT_TENDENCY_MIN,
      CONFIG.TRAIT_MOVEMENT_TENDENCY_MAX
    )
  };
}

function restoreLineageRecord(lineage) {
  lineage = lineage || {};

  var id = Math.max(1, Math.round(restoreNumber(lineage.id, 1)));
  var record = {
    id: id,
    parentId: Math.max(0, Math.round(restoreNumber(lineage.parentId, 0))),
    createdTick: Math.max(0, Math.round(restoreNumber(lineage.createdTick, 0))),
    founderGeneration: Math.max(0, Math.round(restoreNumber(lineage.founderGeneration, 0))),
    founderTraits: restoreOrganismTraits(lineage.founderTraits),
    activeCount: Math.max(0, Math.round(restoreNumber(lineage.activeCount, 0))),
    lastSeenTick: Math.max(0, Math.round(restoreNumber(lineage.lastSeenTick, 0))),
    peakPopulation: Math.max(0, Math.round(restoreNumber(lineage.peakPopulation, 0))),
    isExtinct: Boolean(lineage.isExtinct)
  };

  if (record.lastSeenTick < record.createdTick) {
    record.lastSeenTick = record.createdTick;
  }

  if (record.peakPopulation < record.activeCount) {
    record.peakPopulation = record.activeCount;
  }

  return record;
}

function restoreLineages(lineages) {
  var restoredLineages = {};

  if (!Array.isArray(lineages)) {
    return restoredLineages;
  }

  for (var i = 0; i < lineages.length; i++) {
    var record = restoreLineageRecord(lineages[i]);
    restoredLineages[String(record.id)] = record;

    if (record.id >= world.nextLineageId) {
      world.nextLineageId = record.id + 1;
    }
  }

  return restoredLineages;
}

function restoreOrganism(organism) {
  var restoredOrganism = {
    x: clamp(Math.round(Number(organism.x)), 0, WORLD_WIDTH - 1),
    y: clamp(Math.round(Number(organism.y)), 0, WORLD_HEIGHT - 1),
    prevX: clamp(Math.round(Number(organism.prevX)), 0, WORLD_WIDTH - 1),
    prevY: clamp(Math.round(Number(organism.prevY)), 0, WORLD_HEIGHT - 1),
    energy: Number(organism.energy),
    age: Number(organism.age),
    directionX: clamp(Math.round(Number(organism.directionX)), -1, 1),
    directionY: clamp(Math.round(Number(organism.directionY)), -1, 1),
    traits: restoreOrganismTraits(organism.traits),
    lineageId: Math.round(restoreNumber(organism.lineageId, 0)),
    lineageParentId: Math.max(0, Math.round(restoreNumber(organism.lineageParentId, 0))),
    generation: Math.max(0, Math.round(restoreNumber(organism.generation, 0)))
  };

  ensureOrganismLineage(restoredOrganism);
  return restoredOrganism;
}

function restoreTraitHistorySample(sample) {
  return {
    tick: Math.max(0, Math.round(restoreNumber(sample.tick, 0))),
    population: Math.max(0, Math.round(restoreNumber(sample.population, 0))),
    vision: restoreClampedNumber(
      sample.vision,
      CONFIG.TRAIT_VISION_DEFAULT,
      CONFIG.TRAIT_VISION_MIN,
      CONFIG.TRAIT_VISION_MAX
    ),
    metabolism: restoreClampedNumber(
      sample.metabolism,
      CONFIG.TRAIT_METABOLISM_DEFAULT,
      CONFIG.TRAIT_METABOLISM_MIN,
      CONFIG.TRAIT_METABOLISM_MAX
    ),
    reproductionEnergy: restoreClampedNumber(
      sample.reproductionEnergy,
      CONFIG.TRAIT_REPRODUCTION_ENERGY_DEFAULT,
      CONFIG.TRAIT_REPRODUCTION_ENERGY_MIN,
      CONFIG.TRAIT_REPRODUCTION_ENERGY_MAX
    ),
    movementTendency: restoreClampedNumber(
      sample.movementTendency,
      CONFIG.TRAIT_MOVEMENT_TENDENCY_DEFAULT,
      CONFIG.TRAIT_MOVEMENT_TENDENCY_MIN,
      CONFIG.TRAIT_MOVEMENT_TENDENCY_MAX
    )
  };
}

function restoreTraitHistory(traitHistory) {
  if (!Array.isArray(traitHistory)) {
    return [];
  }

  return traitHistory
    .slice(-CONFIG.TRAIT_HISTORY_MAX_SAMPLES)
    .map(restoreTraitHistorySample);
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

  if (typeof saveConfig.traitMutationChance === "number") {
    CONFIG.TRAIT_MUTATION_CHANCE = saveConfig.traitMutationChance;
  }

  if (typeof saveConfig.traitVisionMin === "number") {
    CONFIG.TRAIT_VISION_MIN = saveConfig.traitVisionMin;
  }

  if (typeof saveConfig.traitVisionMax === "number") {
    CONFIG.TRAIT_VISION_MAX = saveConfig.traitVisionMax;
  }

  if (typeof saveConfig.traitVisionDefault === "number") {
    CONFIG.TRAIT_VISION_DEFAULT = saveConfig.traitVisionDefault;
  }

  if (typeof saveConfig.traitVisionMutationStep === "number") {
    CONFIG.TRAIT_VISION_MUTATION_STEP = saveConfig.traitVisionMutationStep;
  }

  if (typeof saveConfig.traitMetabolismMin === "number") {
    CONFIG.TRAIT_METABOLISM_MIN = saveConfig.traitMetabolismMin;
  }

  if (typeof saveConfig.traitMetabolismMax === "number") {
    CONFIG.TRAIT_METABOLISM_MAX = saveConfig.traitMetabolismMax;
  }

  if (typeof saveConfig.traitMetabolismDefault === "number") {
    CONFIG.TRAIT_METABOLISM_DEFAULT = saveConfig.traitMetabolismDefault;
  }

  if (typeof saveConfig.traitMetabolismMutationStep === "number") {
    CONFIG.TRAIT_METABOLISM_MUTATION_STEP = saveConfig.traitMetabolismMutationStep;
  }

  if (typeof saveConfig.traitReproductionEnergyMin === "number") {
    CONFIG.TRAIT_REPRODUCTION_ENERGY_MIN = saveConfig.traitReproductionEnergyMin;
  }

  if (typeof saveConfig.traitReproductionEnergyMax === "number") {
    CONFIG.TRAIT_REPRODUCTION_ENERGY_MAX = saveConfig.traitReproductionEnergyMax;
  }

  if (typeof saveConfig.traitReproductionEnergyDefault === "number") {
    CONFIG.TRAIT_REPRODUCTION_ENERGY_DEFAULT = saveConfig.traitReproductionEnergyDefault;
  }

  if (typeof saveConfig.traitReproductionEnergyMutationStep === "number") {
    CONFIG.TRAIT_REPRODUCTION_ENERGY_MUTATION_STEP = saveConfig.traitReproductionEnergyMutationStep;
  }

  if (typeof saveConfig.traitMovementTendencyMin === "number") {
    CONFIG.TRAIT_MOVEMENT_TENDENCY_MIN = saveConfig.traitMovementTendencyMin;
  }

  if (typeof saveConfig.traitMovementTendencyMax === "number") {
    CONFIG.TRAIT_MOVEMENT_TENDENCY_MAX = saveConfig.traitMovementTendencyMax;
  }

  if (typeof saveConfig.traitMovementTendencyDefault === "number") {
    CONFIG.TRAIT_MOVEMENT_TENDENCY_DEFAULT = saveConfig.traitMovementTendencyDefault;
  }

  if (typeof saveConfig.traitMovementTendencyMutationStep === "number") {
    CONFIG.TRAIT_MOVEMENT_TENDENCY_MUTATION_STEP = saveConfig.traitMovementTendencyMutationStep;
  }

  if (typeof saveConfig.traitHistorySampleInterval === "number") {
    CONFIG.TRAIT_HISTORY_SAMPLE_INTERVAL = saveConfig.traitHistorySampleInterval;
  }

  if (typeof saveConfig.traitHistoryMaxSamples === "number") {
    CONFIG.TRAIT_HISTORY_MAX_SAMPLES = saveConfig.traitHistoryMaxSamples;
  }

  if (typeof saveConfig.lineageDivergenceScoreForNewLineage === "number") {
    CONFIG.LINEAGE_DIVERGENCE_SCORE_FOR_NEW_LINEAGE = saveConfig.lineageDivergenceScoreForNewLineage;
  }

  if (Array.isArray(saveConfig.lineageColors) && saveConfig.lineageColors.length > 0) {
    CONFIG.LINEAGE_COLORS = saveConfig.lineageColors.slice();
  }
}

function applyWorldSaveData(saveData) {
  validateWorldSaveData(saveData);
  applySaveConfig(saveData.config);

  world.tick = Number(saveData.tick);
  world.speed = clamp(Math.round(Number(saveData.speed)), 1, 10);
  world.era = String(saveData.era || "Organisms");
  world.nextLineageId = Math.max(1, Math.round(restoreNumber(saveData.nextLineageId, 1)));
  world.lineages = restoreLineages(saveData.lineages);
  world.terrain = saveData.terrain.slice();
  world.fertileTiles = countFertileTiles();
  world.food = saveData.food.map(restoreFood);
  world.organisms = saveData.organisms.map(restoreOrganism);
  refreshLineageRegistry();
  world.traitHistory = restoreTraitHistory(saveData.traitHistory);
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
