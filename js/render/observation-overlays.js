PS.render = PS.render || {};
PS.render.observationOverlays = PS.render.observationOverlays || {};

PS.render.observationOverlays.ids = [
  "observation.temperature",
  "observation.population",
  "observation.resources",
  "observation.atmosphere",
  "observation.microbial"
];

PS.render.observationOverlays.getActiveId = function() {
  return world.activeObservationOverlay || "none";
};

PS.render.observationOverlays.setActive = function(id) {
  var nextId = String(id || "none");

  if (nextId !== "none" && PS.render.observationOverlays.ids.indexOf(nextId) < 0) {
    nextId = "none";
  }

  world.activeObservationOverlay = nextId;
  world.needsRender = true;
  return nextId;
};

PS.render.observationOverlays.cycle = function() {
  var options = ["none"].concat(PS.render.observationOverlays.ids);
  var currentIndex = options.indexOf(PS.render.observationOverlays.getActiveId());
  var nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % options.length;

  return PS.render.observationOverlays.setActive(options[nextIndex]);
};

PS.render.observationOverlays.isActive = function(id) {
  return PS.render.observationOverlays.getActiveId() === id;
};

PS.render.observationOverlays.getTileTemperature = function(tile) {
  var atmosphere = world.atmosphere || {};
  var base = Number(atmosphere.temperatureC);
  var latitude = tile ? Math.abs(Number(tile.latitude) || 0) : 0;
  var elevation = tile ? Number(tile.elevation) || 0 : 0;
  var moisture = tile ? Number(tile.moisture) || 0 : 0;

  if (!Number.isFinite(base)) {
    base = 18;
  }

  return base - latitude * 0.55 - Math.max(0, elevation) * 18 + moisture * 7;
};

PS.render.observationOverlays.getGasRatio = function() {
  var atmosphere = world.atmosphere || {};
  var gases = atmosphere.gases || {};
  var oxygen = Math.max(0, Number(gases.o2 != null ? gases.o2 : atmosphere.oxygen) || 0);
  var co2 = Math.max(0, Number(gases.co2 != null ? gases.co2 : atmosphere.co2) || 0);

  return {
    oxygen: oxygen,
    co2: co2,
    normalized: Math.max(0, Math.min(1, oxygen / Math.max(0.0001, oxygen + co2)))
  };
};

PS.render.observationOverlays.getDensityAt = function(collection, tileX, tileY, radius) {
  if (!Array.isArray(collection) || collection.length === 0) {
    return 0;
  }

  var count = 0;
  var radiusSquared = radius * radius;

  for (var i = 0; i < collection.length; i++) {
    var entity = collection[i];
    var dx = Math.abs((Number(entity.x) || 0) - tileX);
    var wrappedDx = Math.min(dx, WORLD_WIDTH - dx);
    var dy = (Number(entity.y) || 0) - tileY;

    if (wrappedDx * wrappedDx + dy * dy <= radiusSquared) {
      count++;
    }
  }

  return count;
};

PS.render.observationOverlays.getSampleStep = function() {
  return Math.max(5, Math.round(Math.min(WORLD_WIDTH, WORLD_HEIGHT) / 28));
};

PS.render.observationOverlays.makeColor = function(red, green, blue, alpha) {
  return {
    red: Math.max(0, Math.min(255, Math.round(red))),
    green: Math.max(0, Math.min(255, Math.round(green))),
    blue: Math.max(0, Math.min(255, Math.round(blue))),
    alpha: Math.max(0, Math.min(255, Math.round(alpha * 255)))
  };
};

PS.render.observationOverlays.toRgba = function(color) {
  return "rgba(" + color.red + "," + color.green + "," + color.blue + "," + (color.alpha / 255).toFixed(3) + ")";
};

PS.render.observationOverlays.getOverlaySample = function(id, x, y, tile) {
  if (id === "observation.temperature") {
    var temperature = PS.render.observationOverlays.getTileTemperature(tile);
    var heat = Math.max(0, Math.min(1, (temperature + 30) / 95));
    var red = 50 + heat * 205;
    var green = 90 + Math.max(0, 1 - Math.abs(heat - 0.55) * 2) * 120;
    var blue = 255 - heat * 210;

    return PS.render.observationOverlays.makeColor(red, green, blue, 0.42);
  }

  if (id === "observation.population") {
    var populationDensity = Math.min(1, PS.render.observationOverlays.getDensityAt(world.organisms, x, y, 9) / 9);

    return PS.render.observationOverlays.makeColor(112, 240, 208, 0.10 + populationDensity * 0.55);
  }

  if (id === "observation.resources") {
    var resourceDensity = Math.min(1, PS.render.observationOverlays.getDensityAt(world.food, x, y, 8) / 10);

    return PS.render.observationOverlays.makeColor(255, 242, 107, 0.10 + resourceDensity * 0.55);
  }

  if (id === "observation.atmosphere") {
    var ratio = PS.render.observationOverlays.getGasRatio();
    var oxygen = ratio.normalized;

    return PS.render.observationOverlays.makeColor(255 * (1 - oxygen), 130 + oxygen * 100, 80 + oxygen * 175, 0.34);
  }

  if (id === "observation.microbial") {
    var microbialCell = PS.epochs && PS.epochs.microbial && typeof PS.epochs.microbial.getCellForTile === "function"
      ? PS.epochs.microbial.getCellForTile(x, y)
      : null;
    var bloom = microbialCell ? Math.max(0, Math.min(1, Number(microbialCell.bloomIntensity) || 0)) : 0;
    var stress = microbialCell ? Math.max(0, Math.min(1, Number(microbialCell.stress) || 0)) : 0;

    return PS.render.observationOverlays.makeColor(90 + bloom * 70, 190 + bloom * 55, 135 - stress * 60, 0.08 + bloom * 0.64);
  }

  return PS.render.observationOverlays.makeColor(0, 0, 0, 0);
};

PS.render.observationOverlays.drawTileSamples = function(id, getColor) {
  if (!PS.render.observationOverlays.isActive(id)) {
    return 0;
  }

  if (
    PS.render.webglGlobe &&
    PS.render.webglGlobe.state &&
    PS.render.webglGlobe.state.lastUsedObservationOverlay === id &&
    PS.render.webglGlobe.state.lastUsedFallback === false &&
    typeof isPlanetLocalView === "function" &&
    !isPlanetLocalView()
  ) {
    return 0;
  }

  var overlay = PS.render.overlays.get(id);
  var step = PS.render.observationOverlays.getSampleStep();
  var sampleCount = 0;

  for (var y = 0; y < WORLD_HEIGHT; y += step) {
    for (var x = 0; x < WORLD_WIDTH; x += step) {
      var point = PS.render.entities.getTileRenderPosition(x, y);

      if (!point) {
        continue;
      }

      ctx.fillStyle = getColor(x, y, getPlanetTile(x, y));
      ctx.fillRect(
        point.x - Math.max(2, step * CONFIG.TILE_SIZE * 0.5 * point.scale),
        point.y - Math.max(2, step * CONFIG.TILE_SIZE * 0.5 * point.scale),
        Math.max(3, step * CONFIG.TILE_SIZE * point.scale),
        Math.max(3, step * CONFIG.TILE_SIZE * point.scale)
      );
      sampleCount++;
    }
  }

  if (overlay) {
    overlay.lastSampleCount = sampleCount;
  }

  return sampleCount;
};

PS.render.overlays.register("observation.temperature", {
  order: 10,
  family: "overlays",
  semantic: "temperature heat map",
  blendMode: "screen",
  alpha: 0.72,
  shortcut: "O",
  draw: function() {
    PS.render.observationOverlays.drawTileSamples("observation.temperature", function(x, y, tile) {
      return PS.render.observationOverlays.toRgba(
        PS.render.observationOverlays.getOverlaySample("observation.temperature", x, y, tile)
      );
    });
  }
});

PS.render.overlays.register("observation.population", {
  order: 11,
  family: "overlays",
  semantic: "organism population density",
  blendMode: "lighter",
  alpha: 0.82,
  shortcut: "O",
  draw: function() {
    PS.render.observationOverlays.drawTileSamples("observation.population", function(x, y) {
      return PS.render.observationOverlays.toRgba(
        PS.render.observationOverlays.getOverlaySample("observation.population", x, y, getPlanetTile(x, y))
      );
    });
  }
});

PS.render.overlays.register("observation.resources", {
  order: 12,
  family: "overlays",
  semantic: "food and resource distribution",
  blendMode: "lighter",
  alpha: 0.78,
  shortcut: "O",
  draw: function() {
    PS.render.observationOverlays.drawTileSamples("observation.resources", function(x, y) {
      return PS.render.observationOverlays.toRgba(
        PS.render.observationOverlays.getOverlaySample("observation.resources", x, y, getPlanetTile(x, y))
      );
    });
  }
});

PS.render.overlays.register("observation.atmosphere", {
  order: 13,
  family: "overlays",
  semantic: "O2 and CO2 atmospheric composition",
  blendMode: "screen",
  alpha: 0.70,
  shortcut: "O",
  draw: function() {
    PS.render.observationOverlays.drawTileSamples("observation.atmosphere", function(x, y) {
      return PS.render.observationOverlays.toRgba(
        PS.render.observationOverlays.getOverlaySample("observation.atmosphere", x, y, getPlanetTile(x, y))
      );
    });
  }
});

PS.render.overlays.register("observation.microbial", {
  order: 14,
  family: "overlays",
  semantic: "microbial blooms and stromatolite mats",
  blendMode: "lighter",
  alpha: 0.78,
  shortcut: "O",
  draw: function() {
    PS.render.observationOverlays.drawTileSamples("observation.microbial", function(x, y) {
      return PS.render.observationOverlays.toRgba(
        PS.render.observationOverlays.getOverlaySample("observation.microbial", x, y, getPlanetTile(x, y))
      );
    });
  }
});
