PS.render = PS.render || {};

PS.atlas = PS.atlas || {
  cellSize: 16,
  pageWidth: 256,
  pageHeight: 256,
  pages: [],
  cells: {},
  cursorX: 0,
  cursorY: 0,
  rowHeight: 0,
  initialized: false,
  stats: {
    generatedCells: 0,
    traitCells: 0,
    terrainCells: 0,
    foodCells: 0,
    settlementCells: 0,
    routeCells: 0,
    pageBytes: 0,
    lastGenerationMs: 0
  }
};

PS.atlas.reset = function () {
  PS.atlas.pages = [];
  PS.atlas.cells = {};
  PS.atlas.cursorX = 0;
  PS.atlas.cursorY = 0;
  PS.atlas.rowHeight = 0;
  PS.atlas.initialized = false;
  PS.atlas.stats.generatedCells = 0;
  PS.atlas.stats.traitCells = 0;
  PS.atlas.stats.terrainCells = 0;
  PS.atlas.stats.foodCells = 0;
  PS.atlas.stats.settlementCells = 0;
  PS.atlas.stats.routeCells = 0;
  PS.atlas.stats.pageBytes = 0;
  PS.atlas.stats.lastGenerationMs = 0;
};

PS.atlas.ensurePage = function () {
  if (PS.atlas.pages.length <= 0) {
    PS.atlas.pages.push({
      pageIndex: 0,
      width: PS.atlas.pageWidth,
      height: PS.atlas.pageHeight,
      data: new Uint8Array(PS.atlas.pageWidth * PS.atlas.pageHeight * 4),
      version: 1
    });
    PS.atlas.stats.pageBytes = PS.atlas.pages[0].data.byteLength;
  }

  return PS.atlas.pages[0];
};

PS.atlas.allocateCell = function (name, width, height) {
  var page = PS.atlas.ensurePage();
  var cellWidth = Math.max(1, Math.round(Number(width) || PS.atlas.cellSize));
  var cellHeight = Math.max(1, Math.round(Number(height) || PS.atlas.cellSize));
  var x;
  var y;

  if (PS.atlas.cells[name]) {
    return PS.atlas.cells[name];
  }

  if (PS.atlas.cursorX + cellWidth > page.width) {
    PS.atlas.cursorX = 0;
    PS.atlas.cursorY += PS.atlas.rowHeight;
    PS.atlas.rowHeight = 0;
  }

  if (PS.atlas.cursorY + cellHeight > page.height) {
    throw new Error("Entity atlas page is full; increase pageWidth/pageHeight");
  }

  x = PS.atlas.cursorX;
  y = PS.atlas.cursorY;
  PS.atlas.cursorX += cellWidth;
  PS.atlas.rowHeight = Math.max(PS.atlas.rowHeight, cellHeight);

  PS.atlas.cells[name] = {
    name: name,
    pageIndex: 0,
    x: x,
    y: y,
    w: cellWidth,
    h: cellHeight,
    u0: x / page.width,
    v0: y / page.height,
    u1: (x + cellWidth) / page.width,
    v1: (y + cellHeight) / page.height
  };
  PS.atlas.stats.generatedCells++;
  return PS.atlas.cells[name];
};

PS.atlas.hexToRgb = function (hexColor) {
  var color = String(hexColor || "#ffffff").replace("#", "");

  if (color.length !== 6) {
    return [255, 255, 255];
  }

  return [
    parseInt(color.slice(0, 2), 16),
    parseInt(color.slice(2, 4), 16),
    parseInt(color.slice(4, 6), 16)
  ];
};

PS.atlas.writePixel = function (cell, localX, localY, rgba) {
  var page = PS.atlas.pages[cell.pageIndex];
  var x = cell.x + localX;
  var y = cell.y + localY;
  var index;

  if (!page || x < cell.x || y < cell.y || x >= cell.x + cell.w || y >= cell.y + cell.h) {
    return;
  }

  index = (y * page.width + x) * 4;
  page.data[index] = rgba[0];
  page.data[index + 1] = rgba[1];
  page.data[index + 2] = rgba[2];
  page.data[index + 3] = rgba[3];
};

PS.atlas.writeDot = function (cell, x, y, radius, rgba) {
  var r = Math.max(0, Math.round(Number(radius) || 0));
  var dx;
  var dy;

  for (dy = -r; dy <= r; dy++) {
    for (dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r + 0.5) {
        PS.atlas.writePixel(cell, x + dx, y + dy, rgba);
      }
    }
  }
};

PS.atlas.fillNormalHalf = function (cell) {
  var x;
  var y;

  for (y = 0; y < cell.h; y++) {
    for (x = Math.floor(cell.w / 2); x < cell.w; x++) {
      PS.atlas.writePixel(cell, x, y, [128, 128, 255, 190]);
    }
  }
};

PS.atlas.makeTraitHash = function (organism, frameVariant) {
  var traits = organism && organism.traits ? organism.traits : {};
  var lineageId = Math.max(1, Math.round(Number(organism && organism.lineageId) || 1));
  var bodySize = clamp(Math.round((Number(traits.bodySize) || 1) * 2), 1, 6);
  var bodyShape = clamp(Math.round(Number(traits.bodyShape) || 0), 0, 7);
  var limbCount = clamp(Math.round(Number(traits.limbCount) || 0), 0, 12);
  var appendageType = clamp(Math.round(Number(traits.appendageType) || 0), 0, 7);
  var camouflage = clamp(Math.round((Number(traits.camouflage) || 0) * 4), 0, 4);
  var variant = clamp(Math.round(Number(frameVariant) || 0), 0, 3);

  return [
    "entity.organism.trait",
    lineageId % 16,
    bodySize,
    bodyShape,
    limbCount,
    appendageType,
    camouflage,
    variant
  ].join(".");
};

PS.atlas.getLineageRgb = function (lineageId, camouflage) {
  var colors = CONFIG && CONFIG.LINEAGE_COLORS ? CONFIG.LINEAGE_COLORS : ["#72d7ff"];
  var base = PS.atlas.hexToRgb(colors[(Math.max(1, lineageId) - 1) % colors.length]);
  var camo = clamp(Number(camouflage) || 0, 0, 1);
  var earth = [72, 112, 74];
  var mix = camo * 0.45;

  return [
    Math.round(base[0] * (1 - mix) + earth[0] * mix),
    Math.round(base[1] * (1 - mix) + earth[1] * mix),
    Math.round(base[2] * (1 - mix) + earth[2] * mix)
  ];
};

PS.atlas.drawOrganismSprite = function (cell, organism, frameVariant) {
  var traits = organism && organism.traits ? organism.traits : {};
  var lineageId = Math.max(1, Math.round(Number(organism && organism.lineageId) || 1));
  var bodySize = clamp(Number(traits.bodySize) || 1, 0.5, 3);
  var bodyShape = clamp(Math.round(Number(traits.bodyShape) || 0), 0, 7);
  var limbCount = clamp(Math.round(Number(traits.limbCount) || 0), 0, 12);
  var appendageType = clamp(Math.round(Number(traits.appendageType) || 0), 0, 7);
  var camouflage = clamp(Number(traits.camouflage) || 0, 0, 1);
  var variant = clamp(Math.round(Number(frameVariant) || 0), 0, 3);
  var color = PS.atlas.getLineageRgb(lineageId, camouflage);
  var shade = [Math.max(0, color[0] - 35), Math.max(0, color[1] - 35), Math.max(0, color[2] - 35), 255];
  var highlight = [Math.min(255, color[0] + 42), Math.min(255, color[1] + 42), Math.min(255, color[2] + 42), 255];
  var body = [color[0], color[1], color[2], 255];
  var centerX = 7 + (variant % 2);
  var centerY = 7 + Math.floor(variant / 2);
  var radiusX = clamp(Math.round(3 + bodySize + (bodyShape === 1 ? 2 : 0)), 3, 7);
  var radiusY = clamp(Math.round(3 + bodySize + (bodyShape === 2 ? 2 : 0)), 3, 7);
  var maxLimbs = Math.min(12, limbCount);
  var i;
  var limbX;
  var limbY;
  var side;
  var offset;
  var appendageRadius = appendageType === 3 ? 2 : 1;

  PS.atlas.fillNormalHalf(cell);

  for (i = 0; i < maxLimbs; i++) {
    side = i % 2 === 0 ? -1 : 1;
    offset = Math.floor(i / 2) - Math.floor(maxLimbs / 4);
    limbX = centerX + side * (radiusX + 1);
    limbY = centerY + offset * 2;
    PS.atlas.writeDot(cell, limbX, limbY, appendageRadius, shade);
  }

  for (limbY = 0; limbY < 16; limbY++) {
    for (limbX = 0; limbX < 16; limbX++) {
      var dx = (limbX - centerX) / radiusX;
      var dy = (limbY - centerY) / radiusY;
      var inside = bodyShape === 3
        ? Math.abs(dx) + Math.abs(dy) <= 1.05
        : dx * dx + dy * dy <= 1.05;

      if (inside) {
        PS.atlas.writePixel(cell, limbX, limbY, body);
      }
    }
  }

  PS.atlas.writePixel(cell, centerX - 1, Math.max(1, centerY - radiusY + 1), highlight);
  PS.atlas.writePixel(cell, centerX + 1, Math.max(1, centerY - radiusY + 1), highlight);
  PS.atlas.writeDot(cell, centerX, centerY + radiusY - 1, 1, shade);
};

PS.atlas.getTraitOrganismCell = function (organism, frameVariant) {
  var name = PS.atlas.makeTraitHash(organism, frameVariant);
  var cell = PS.atlas.cells[name];

  if (!cell) {
    cell = PS.atlas.allocateCell(name, 32, 16);
    PS.atlas.drawOrganismSprite(cell, organism, frameVariant);
    PS.atlas.stats.traitCells++;
    PS.atlas.pages[cell.pageIndex].version++;
  }

  return cell;
};

PS.atlas.getFoodRichnessBucket = function (food) {
  var amount = Math.max(
    Number(food && food.amount) || 0,
    Number(food && food.energy) || 0,
    Number(food && food.biomass) || 0,
    Number(food && food.value) || 0,
    Number(food && food.nutrients) || 0
  );

  if (amount >= 120) { return 3; }
  if (amount >= 60) { return 2; }
  if (amount > 0) { return 1; }
  return 0;
};

PS.atlas.drawFoodCell = function (cell, variant, richness) {
  var safeRichness = clamp(Math.round(Number(richness) || 0), 0, 3);
  var base = [
    [58, 178, 74, 255],
    [70, 210, 88, 255],
    [118, 224, 92, 255],
    [174, 238, 98, 255]
  ][safeRichness];
  var dark = [Math.max(0, base[0] - 36), Math.max(0, base[1] - 58), Math.max(0, base[2] - 36), 255];
  var light = [Math.min(255, base[0] + 52), Math.min(255, base[1] + 34), Math.min(255, base[2] + 58), 255];
  var podCount = 3 + safeRichness * 2;
  var i;
  var x;
  var y;

  PS.atlas.fillNormalHalf(cell);

  for (i = 0; i < podCount; i++) {
    x = 3 + ((variant * 5 + i * 4) % 11);
    y = 5 + ((variant * 3 + i * 5) % 7);
    PS.atlas.writePixel(cell, x, y + 2, dark);
    PS.atlas.writeDot(cell, x, y, i % 3 === 0 && safeRichness > 1 ? 2 : 1, base);
    PS.atlas.writePixel(cell, x - 1, y - 1, light);
  }

  if (safeRichness >= 2) {
    PS.atlas.writePixel(cell, 4 + variant, 12, dark);
    PS.atlas.writePixel(cell, 9 + (variant % 3), 11, dark);
    PS.atlas.writePixel(cell, 12, 7 + (variant % 2), light);
  }
};

PS.atlas.getSettlementArchetype = function (settlement) {
  if (settlement && settlement.isColony) { return "colony"; }
  if (settlement && settlement.isOutpost) { return "outpost"; }
  return "camp";
};

PS.atlas.getSettlementLevelBucket = function (settlement) {
  return clamp(Math.floor((Math.max(1, Math.round(Number(settlement && settlement.level) || 1)) - 1) / 2), 0, 5);
};

PS.atlas.drawSettlementCell = function (cell, archetype, levelBucket, lineageId) {
  var colors = CONFIG && CONFIG.LINEAGE_COLORS ? CONFIG.LINEAGE_COLORS : ["#72d7ff"];
  var baseRgb = PS.atlas.hexToRgb(colors[(Math.max(1, lineageId) - 1) % colors.length]);
  var wall = archetype === "outpost" ? [126, 104, 78, 255] : [144, 128, 96, 255];
  var roof = archetype === "colony" ? [190, 92, 76, 255] : [164, 118, 72, 255];
  var shadow = [54, 44, 42, 255];
  var banner = [baseRgb[0], baseRgb[1], baseRgb[2], 255];
  var light = [218, 202, 144, 255];
  var x;
  var y;
  var buildingCount = archetype === "outpost" ? 2 : 3 + Math.min(3, levelBucket);

  PS.atlas.fillNormalHalf(cell);

  for (x = 2; x <= 13; x++) {
    PS.atlas.writePixel(cell, x, 12, shadow);
    if (archetype !== "camp" || x % 2 === 0) {
      PS.atlas.writePixel(cell, x, 11, wall);
    }
  }

  for (y = 0; y < buildingCount; y++) {
    var bx = 3 + ((y * 4 + levelBucket) % 10);
    var by = 8 - Math.min(3, Math.floor(y / 2));
    PS.atlas.writePixel(cell, bx, by + 2, shadow);
    PS.atlas.writePixel(cell, bx + 1, by + 2, shadow);
    PS.atlas.writePixel(cell, bx, by + 1, wall);
    PS.atlas.writePixel(cell, bx + 1, by + 1, wall);
    PS.atlas.writePixel(cell, bx - 1, by, roof);
    PS.atlas.writePixel(cell, bx, by - 1, roof);
    PS.atlas.writePixel(cell, bx + 1, by, roof);
    PS.atlas.writePixel(cell, bx + 1, by + 1, light);
  }

  if (archetype === "outpost") {
    PS.atlas.writePixel(cell, 7, 4, wall);
    PS.atlas.writePixel(cell, 7, 5, wall);
    PS.atlas.writePixel(cell, 8, 4, banner);
  } else {
    PS.atlas.writePixel(cell, 8, 3, wall);
    PS.atlas.writePixel(cell, 8, 4, wall);
    PS.atlas.writePixel(cell, 9, 3, banner);
    PS.atlas.writePixel(cell, 10, 3, banner);
  }

  if (levelBucket >= 2) {
    PS.atlas.writePixel(cell, 5, 5, banner);
    PS.atlas.writePixel(cell, 11, 6, banner);
  }
};

PS.atlas.drawRouteCell = function (cell, shape, activityBucket, lineageId) {
  var colors = CONFIG && CONFIG.LINEAGE_COLORS ? CONFIG.LINEAGE_COLORS : ["#72d7ff"];
  var baseRgb = PS.atlas.hexToRgb(colors[(Math.max(1, lineageId) - 1) % colors.length]);
  var base = [baseRgb[0], baseRgb[1], baseRgb[2], 255];
  var shadow = [18, 24, 28, 210];
  var highlight = [
    Math.min(255, baseRgb[0] + 72),
    Math.min(255, baseRgb[1] + 72),
    Math.min(255, baseRgb[2] + 72),
    255
  ];
  var alpha = activityBucket <= 0 ? 120 : (activityBucket === 1 ? 185 : 235);
  var x;
  var y;

  PS.atlas.fillNormalHalf(cell);

  if (shape === "vertical") {
    for (y = 1; y < 15; y++) {
      PS.atlas.writePixel(cell, 7, y, shadow);
      PS.atlas.writePixel(cell, 8, y, [base[0], base[1], base[2], alpha]);
      if (activityBucket >= 1 && y % 4 === 0) {
        PS.atlas.writePixel(cell, 9, y, highlight);
      }
    }
    return;
  }

  if (shape === "diag") {
    for (x = 2; x < 14; x++) {
      y = 13 - x;
      PS.atlas.writePixel(cell, x, y + 1, shadow);
      PS.atlas.writePixel(cell, x, y, [base[0], base[1], base[2], alpha]);
      if (activityBucket >= 1 && x % 4 === 0) {
        PS.atlas.writePixel(cell, x + 1, y, highlight);
      }
    }
    return;
  }

  for (x = 1; x < 15; x++) {
    PS.atlas.writePixel(cell, x, 8, shadow);
    PS.atlas.writePixel(cell, x, 7, [base[0], base[1], base[2], alpha]);
    if (activityBucket >= 1 && x % 4 === 0) {
      PS.atlas.writePixel(cell, x, 6, highlight);
    }
  }
};

PS.atlas.terrainPalettes = {
  ocean: { base: [28, 82, 123], accent: [70, 145, 178], dark: [8, 32, 68], pattern: "wave" },
  coastal: { base: [84, 139, 144], accent: [194, 174, 114], dark: [27, 78, 99], pattern: "shore" },
  temperate: { base: [70, 136, 58], accent: [124, 176, 72], dark: [42, 92, 43], pattern: "grass" },
  grassland: { base: [126, 173, 76], accent: [176, 196, 92], dark: [86, 126, 52], pattern: "grass" },
  tropical: { base: [42, 132, 72], accent: [84, 190, 94], dark: [20, 86, 57], pattern: "canopy" },
  forest: { base: [34, 91, 43], accent: [74, 132, 59], dark: [18, 55, 34], pattern: "canopy" },
  wetland: { base: [45, 92, 70], accent: [90, 150, 91], dark: [25, 62, 75], pattern: "reed" },
  tundra: { base: [168, 183, 179], accent: [226, 232, 224], dark: [102, 122, 128], pattern: "frost" },
  ice: { base: [104, 164, 188], accent: [216, 242, 248], dark: [67, 118, 153], pattern: "crack" },
  desert: { base: [184, 150, 98], accent: [222, 200, 140], dark: [128, 93, 64], pattern: "dune" },
  mountain: { base: [98, 100, 128], accent: [158, 162, 174], dark: [59, 62, 80], pattern: "ridge" },
  highland: { base: [90, 106, 116], accent: [152, 158, 142], dark: [57, 72, 76], pattern: "ridge" },
  volcanic: { base: [45, 43, 64], accent: [238, 86, 43], dark: [20, 20, 34], pattern: "lava" },
  barren: { base: [130, 111, 78], accent: [170, 143, 94], dark: [86, 75, 57], pattern: "grit" },
  unknown: { base: [82, 112, 88], accent: [130, 152, 105], dark: [48, 70, 58], pattern: "grit" }
};

PS.atlas.getTerrainPalette = function (biome) {
  var key = String(biome || "unknown").toLowerCase();

  return PS.atlas.terrainPalettes[key] || PS.atlas.terrainPalettes.unknown;
};

PS.atlas.getTerrainTilePalette = function (biome, tileDefinition) {
  var fallback = PS.atlas.getTerrainPalette(biome);
  var base = tileDefinition && tileDefinition.baseColor ? PS.atlas.hexToRgb(tileDefinition.baseColor) : fallback.base;
  var priority = clamp(Number(tileDefinition && tileDefinition.transitionPriority) || 4, 1, 12);
  var waterDepth = clamp(Number(tileDefinition && tileDefinition.waterDepth) || 0, 0, 1);
  var fertility = clamp(Number(tileDefinition && tileDefinition.baseFertility) || 0, 0, 1);
  var accentLift = 30 + priority * 3 + fertility * 18 + waterDepth * 24;
  var darkDrop = 24 + priority * 2 + waterDepth * 26;

  return {
    base: base,
    accent: [
      clamp(Math.round(base[0] + accentLift), 0, 255),
      clamp(Math.round(base[1] + accentLift), 0, 255),
      clamp(Math.round(base[2] + accentLift), 0, 255)
    ],
    dark: [
      clamp(Math.round(base[0] - darkDrop), 0, 255),
      clamp(Math.round(base[1] - darkDrop), 0, 255),
      clamp(Math.round(base[2] - darkDrop), 0, 255)
    ],
    pattern: PS.atlas.getTerrainPatternForTile(tileDefinition, fallback.pattern)
  };
};

PS.atlas.getTerrainPatternForTile = function (tileDefinition, fallbackPattern) {
  var id = String(tileDefinition && tileDefinition.id || "");
  var sheet = String(tileDefinition && tileDefinition.spriteSheet || "");

  if (id.indexOf("water") >= 0) { return "wave"; }
  if (id.indexOf("marsh") >= 0 || id.indexOf("wetland") >= 0 || id.indexOf("mud") >= 0) { return "reed"; }
  if (id.indexOf("forest") >= 0 || id.indexOf("moss") >= 0 || sheet.indexOf("forest") >= 0) { return "canopy"; }
  if (id.indexOf("dune") >= 0 || id.indexOf("sand") >= 0) { return "dune"; }
  if (id.indexOf("cliff") >= 0 || id.indexOf("rock") >= 0) { return "ridge"; }
  if (id.indexOf("snow") >= 0) { return "frost"; }
  if (id.indexOf("ice") >= 0) { return "crack"; }
  if (id.indexOf("volcanic") >= 0) { return "lava"; }
  if (id.indexOf("grass") >= 0) { return "grass"; }

  return fallbackPattern || "grit";
};

PS.atlas.getTerrainMaterialScore = function (tileDefinition, sample, biome, tileX, tileY) {
  var detail = sample && sample.detail ? sample.detail : {};
  var signals = detail.materialSignals || {};
  var surface = String(detail.surface || "");
  var id = String(tileDefinition && tileDefinition.id || "");
  var score = 0;
  var elevationMin = Number(tileDefinition && tileDefinition.elevation && tileDefinition.elevation.min);
  var elevationMax = Number(tileDefinition && tileDefinition.elevation && tileDefinition.elevation.max);
  var normalizedHeight = Number.isFinite(Number(detail.elevation)) ? Number(detail.elevation) : 0.5;
  var waterDepth = clamp(Number(signals.waterDepth) || Number(tileDefinition && tileDefinition.waterDepth) || 0, 0, 1);
  var wetness = clamp(Number(signals.wetness) || 0, 0, 1);
  var roughness = clamp(Number(signals.surfaceRoughness) || Number(detail.roughness) || 0, 0, 1);
  var snow = clamp(Number(signals.snow) || 0, 0, 1);
  var noise = PS.ranmap ? PS.ranmap.variant(tileX + tileDefinition.transitionPriority, tileY - tileDefinition.transitionPriority, 17) / 16 : 0;

  if (tileDefinition.biome === biome) { score += 20; }
  if (surface.indexOf("water") >= 0 && id.indexOf("water") >= 0) { score += 28 + waterDepth * 12; }
  if (surface === "deep water" && id.indexOf("deep") >= 0) { score += 30; }
  if ((surface === "open water" || surface === "whitecap") && id.indexOf("shallow") >= 0 && waterDepth < 0.70) { score += 22; }
  if ((surface === "sand" || surface === "dune") && (id.indexOf("sand") >= 0 || id.indexOf("dune") >= 0)) { score += 25; }
  if (surface === "dune" && id.indexOf("dune") >= 0) { score += 18; }
  if ((surface === "rock" || surface === "stone" || surface === "ridge ice") && (id.indexOf("rock") >= 0 || id.indexOf("cliff") >= 0)) { score += 25; }
  if (id.indexOf("cliff") >= 0 && roughness > 0.52) { score += 16; }
  if ((surface === "dense canopy" || surface === "woodland") && (id.indexOf("forest") >= 0 || id.indexOf("moss") >= 0)) { score += 24; }
  if ((surface === "clearing" || surface === "meadow" || surface === "grass") && (id.indexOf("grass") >= 0 || id === "dirt")) { score += 18; }
  if ((surface === "moss" || surface === "scrub") && (id.indexOf("moss") >= 0 || id.indexOf("wetland") >= 0)) { score += 15; }
  if (wetness > 0.52 && (id.indexOf("mud") >= 0 || id.indexOf("marsh") >= 0 || id.indexOf("wetland") >= 0)) { score += 16 + wetness * 12; }
  if ((surface === "snow" || snow > 0.55) && id.indexOf("snow") >= 0) { score += 28; }
  if ((surface === "ice" || surface === "ridge ice") && id.indexOf("ice") >= 0) { score += 24; }
  if (biome === "volcanic" && id.indexOf("volcanic") >= 0) { score += 30; }

  if (Number.isFinite(elevationMin) && Number.isFinite(elevationMax)) {
    if (normalizedHeight >= elevationMin && normalizedHeight <= elevationMax) {
      score += 6;
    } else {
      score -= 4;
    }
  }

  return score + noise;
};

PS.atlas.getTerrainMaterialTile = function (biome, tileX, tileY, sample) {
  var registry = PS.core && PS.core.TileRegistry && typeof PS.core.TileRegistry.getByBiome === "function"
    ? PS.core.TileRegistry
    : null;
  var candidates = registry ? registry.getByBiome(biome) : [];
  var detail = sample && sample.detail ? sample.detail : {};
  var surface = String(detail.surface || "");
  var best = null;
  var bestScore = -Infinity;
  var i;

  if (registry && biome === "forest") {
    candidates = candidates.concat(registry.getByBiome("temperate"));
  } else if (registry && biome === "grassland" && surface === "meadow") {
    candidates = candidates.concat(registry.getByBiome("temperate"));
  } else if (registry && (surface === "open water" || surface === "deep water" || surface === "whitecap")) {
    candidates = candidates.concat(registry.getByBiome("ocean"));
  }

  for (i = 0; i < candidates.length; i++) {
    var score = PS.atlas.getTerrainMaterialScore(candidates[i], sample, biome, tileX, tileY);

    if (score > bestScore) {
      bestScore = score;
      best = candidates[i];
    }
  }

  return best;
};

PS.atlas.mixTerrainColor = function (palette, amount) {
  var shade = clamp(Number(amount) || 0, -1, 1);
  var other = shade >= 0 ? palette.accent : palette.dark;
  var mix = Math.abs(shade);

  return [
    Math.round(palette.base[0] * (1 - mix) + other[0] * mix),
    Math.round(palette.base[1] * (1 - mix) + other[1] * mix),
    Math.round(palette.base[2] * (1 - mix) + other[2] * mix),
    255
  ];
};

PS.atlas.getTerrainPatternAmount = function (pattern, x, y, variant) {
  var hash = (x * 17 + y * 31 + variant * 43) & 15;

  if (pattern === "wave") {
    return ((x + variant * 3 + Math.floor(y / 2)) % 7 === 0) ? 0.45 : (hash < 2 ? -0.22 : 0);
  }
  if (pattern === "shore") {
    return ((x + y + variant) % 6 < 2) ? 0.42 : (hash < 3 ? -0.18 : 0);
  }
  if (pattern === "canopy") {
    return hash < 4 ? 0.34 : (hash > 12 ? -0.28 : 0);
  }
  if (pattern === "reed") {
    return x % 5 === variant % 5 ? 0.36 : (y % 7 === 0 ? -0.24 : 0);
  }
  if (pattern === "frost") {
    return (x + y + variant) % 5 === 0 ? 0.45 : (hash < 3 ? -0.18 : 0);
  }
  if (pattern === "crack") {
    return Math.abs(x - y + variant * 2) % 9 === 0 ? -0.42 : (hash < 2 ? 0.34 : 0);
  }
  if (pattern === "dune") {
    return (x + Math.floor(y / 2) + variant * 2) % 8 < 2 ? 0.34 : (hash < 2 ? -0.16 : 0);
  }
  if (pattern === "ridge") {
    return Math.abs(x - 8) + Math.floor(y / 3) + variant < 8 ? 0.36 : (hash < 4 ? -0.24 : 0);
  }
  if (pattern === "lava") {
    return (hash === 0 || (x + y + variant) % 13 === 0) ? 0.85 : (hash < 6 ? -0.34 : 0);
  }
  if (pattern === "grass") {
    return hash < 4 ? 0.28 : (hash > 12 ? -0.18 : 0);
  }

  return hash < 3 ? 0.22 : (hash > 13 ? -0.22 : 0);
};

PS.atlas.drawTerrainCell = function (cell, biome, variant, tileDefinition, sample) {
  var palette = tileDefinition
    ? PS.atlas.getTerrainTilePalette(biome, tileDefinition)
    : PS.atlas.getTerrainPalette(biome);
  var x;
  var y;

  for (y = 0; y < cell.h; y++) {
    for (x = 0; x < cell.w; x++) {
      PS.atlas.writePixel(cell, x, y, PS.atlas.mixTerrainColor(
        palette,
        PS.atlas.getTerrainPatternAmount(palette.pattern, x, y, variant)
      ));
    }
  }

  if (typeof PS.atlas.drawTerrainDetailOverlay === "function") {
    PS.atlas.drawTerrainDetailOverlay(cell, palette, variant, tileDefinition, biome, sample);
  }
};

PS.atlas.getCell = function (name) {
  return PS.atlas.cells[String(name || "")] || null;
};

PS.atlas.getOrganismCell = function (bodyType, variant) {
  var name = "entity.organism_" + clamp(Math.round(Number(bodyType) || 0), 0, 3) + "." + clamp(Math.round(Number(variant) || 0), 0, 3);
  var cell = PS.atlas.cells[name];

  if (!cell) {
    cell = PS.atlas.allocateCell(name, 32, 16);
    PS.atlas.drawOrganismSprite(cell, {
      lineageId: 1,
      traits: {
        bodySize: 0.75 + clamp(Number(bodyType) || 0, 0, 3) * 0.35,
        bodyShape: bodyType,
        limbCount: 4,
        appendageType: 0,
        camouflage: 0.2
      }
    }, variant);
  }

  return cell;
};

PS.atlas.getFoodCell = function (variant, food) {
  var safeVariant = clamp(Math.round(Number(variant) || 0), 0, 3);
  var richness = PS.atlas.getFoodRichnessBucket(food);
  var name = "entity.food." + safeVariant + "." + richness;
  var cell = PS.atlas.cells[name];

  if (!cell) {
    cell = PS.atlas.allocateCell(name, 32, 16);
    PS.atlas.drawFoodCell(cell, safeVariant, richness);
    PS.atlas.stats.foodCells++;
    PS.atlas.pages[cell.pageIndex].version++;
  }

  return cell;
};

PS.atlas.getSettlementCell = function (settlement) {
  var archetype = PS.atlas.getSettlementArchetype(settlement);
  var levelBucket = PS.atlas.getSettlementLevelBucket(settlement);
  var lineageBucket = ((Math.max(1, Math.round(Number(settlement && settlement.lineageId) || 1)) - 1) % 16) + 1;
  var name = "entity.settlement." + archetype + "." + levelBucket + "." + lineageBucket;
  var cell = PS.atlas.cells[name];

  if (!cell) {
    cell = PS.atlas.allocateCell(name, 32, 16);
    PS.atlas.drawSettlementCell(cell, archetype, levelBucket, lineageBucket);
    PS.atlas.stats.settlementCells++;
    PS.atlas.pages[cell.pageIndex].version++;
  }

  return cell;
};

PS.atlas.getRouteActivityBucket = function (route) {
  if (!route || route.isActive === false) { return 0; }
  if (Math.max(0, Number(route.foodTransferred) || 0) >= 80) { return 2; }
  return 1;
};

PS.atlas.getRouteCell = function (route, shape) {
  var safeShape = String(shape || "horizontal");
  var activityBucket = PS.atlas.getRouteActivityBucket(route);
  var lineageBucket = ((Math.max(1, Math.round(Number(route && route.lineageId) || 1)) - 1) % 16) + 1;
  var name = "entity.route." + safeShape + "." + activityBucket + "." + lineageBucket;
  var cell = PS.atlas.cells[name];

  if (!cell) {
    cell = PS.atlas.allocateCell(name, 32, 16);
    PS.atlas.drawRouteCell(cell, safeShape, activityBucket, lineageBucket);
    PS.atlas.stats.routeCells++;
    PS.atlas.pages[cell.pageIndex].version++;
  }

  return cell;
};

PS.atlas.getTerrainCell = function (biome, tileX, tileY, sample) {
  var tileDefinition = PS.atlas.getTerrainMaterialTile(biome, tileX, tileY, sample);
  var variantCount = Math.max(1, Number(tileDefinition && tileDefinition.variants) || 4);
  var variant = PS.ranmap ? PS.ranmap.variant(tileX, tileY, variantCount) : 0;
  var materialId = tileDefinition ? tileDefinition.id : String(biome || "grass");
  var transitionKey = typeof PS.atlas.getTerrainTransitionKey === "function"
    ? PS.atlas.getTerrainTransitionKey(sample, biome)
    : "plain";
  var name = "terrain." + materialId + "." + variant + "." + transitionKey;
  var cell = PS.atlas.cells[name];

  if (!cell) {
    cell = PS.atlas.allocateCell(name, 16, 16);
    PS.atlas.drawTerrainCell(cell, biome, variant, tileDefinition, sample);
    PS.atlas.stats.terrainCells++;
    PS.atlas.pages[cell.pageIndex].version++;
  }

  return cell;
};

PS.atlas.init = function () {
  var startedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();

  if (PS.atlas.initialized) {
    return true;
  }

  PS.atlas.ensurePage();
  for (var i = 0; i < 4; i++) {
    PS.atlas.getFoodCell(i);
    PS.atlas.getOrganismCell(i, 0);
    PS.atlas.getOrganismCell(i, 1);
  }
  PS.atlas.getSettlementCell({ lineageId: 1, level: 1 });
  PS.atlas.getRouteCell({ lineageId: 1, isActive: true, foodTransferred: 0 }, "horizontal");
  PS.atlas.initialized = true;
  PS.atlas.stats.lastGenerationMs = (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now()) - startedAt;
  return true;
};

PS.atlas.getStats = function () {
  return {
    initialized: PS.atlas.initialized,
    pageCount: PS.atlas.pages.length,
    cellCount: Object.keys(PS.atlas.cells).length,
    traitCells: PS.atlas.stats.traitCells,
    terrainCells: PS.atlas.stats.terrainCells,
    foodCells: PS.atlas.stats.foodCells,
    settlementCells: PS.atlas.stats.settlementCells,
    routeCells: PS.atlas.stats.routeCells,
    generatedCells: PS.atlas.stats.generatedCells,
    pageBytes: PS.atlas.stats.pageBytes,
    lastGenerationMs: PS.atlas.stats.lastGenerationMs
  };
};
