PS.atlas = PS.atlas || {};

PS.atlas.getTerrainDetailColor = function (palette, kind) {
  if (kind === "light") {
    return [
      clamp(Math.round(palette.accent[0] + 28), 0, 255),
      clamp(Math.round(palette.accent[1] + 28), 0, 255),
      clamp(Math.round(palette.accent[2] + 28), 0, 255),
      255
    ];
  }

  if (kind === "warm") {
    return [
      clamp(Math.round(palette.accent[0] + 44), 0, 255),
      clamp(Math.round(palette.accent[1] + 12), 0, 255),
      clamp(Math.round(palette.accent[2] - 22), 0, 255),
      255
    ];
  }

  return [
    clamp(Math.round(palette.dark[0] - 18), 0, 255),
    clamp(Math.round(palette.dark[1] - 18), 0, 255),
    clamp(Math.round(palette.dark[2] - 18), 0, 255),
    255
  ];
};

PS.atlas.writeTerrainDash = function (cell, x, y, length, horizontal, color) {
  for (var i = 0; i < length; i++) {
    PS.atlas.writePixel(cell, x + (horizontal ? i : 0), y + (horizontal ? 0 : i), color);
  }
};

PS.atlas.drawTerrainDetailOverlay = function (cell, palette, variant) {
  var pattern = String(palette && palette.pattern || "grit");
  var light = PS.atlas.getTerrainDetailColor(palette, "light");
  var warm = PS.atlas.getTerrainDetailColor(palette, "warm");
  var shadow = PS.atlas.getTerrainDetailColor(palette, "shadow");
  var offset = clamp(Math.round(Number(variant) || 0), 0, 15);

  if (pattern === "wave") {
    PS.atlas.writeTerrainDash(cell, 1 + offset % 3, 4, 7, true, light);
    PS.atlas.writeTerrainDash(cell, 8 - offset % 2, 10, 6, true, light);
    PS.atlas.writeTerrainDash(cell, 3, 13, 4, true, shadow);
    return;
  }

  if (pattern === "shore") {
    PS.atlas.writeTerrainDash(cell, 0, 5 + offset % 4, 6, true, light);
    PS.atlas.writeTerrainDash(cell, 7, 7, 7, true, warm);
    PS.atlas.writeTerrainDash(cell, 2, 11, 10, true, shadow);
    return;
  }

  if (pattern === "canopy") {
    PS.atlas.writeDot(cell, 4, 4, 2, shadow);
    PS.atlas.writeDot(cell, 10, 7, 2, light);
    PS.atlas.writeDot(cell, 6 + offset % 4, 12, 1, warm);
    return;
  }

  if (pattern === "grass") {
    PS.atlas.writeTerrainDash(cell, 3, 3, 4, false, light);
    PS.atlas.writeTerrainDash(cell, 9, 7, 5, false, warm);
    PS.atlas.writeTerrainDash(cell, 13, 4, 3, false, shadow);
    return;
  }

  if (pattern === "reed") {
    PS.atlas.writeTerrainDash(cell, 3, 3, 9, false, light);
    PS.atlas.writeTerrainDash(cell, 7, 5, 8, false, warm);
    PS.atlas.writeTerrainDash(cell, 12, 2, 10, false, shadow);
    return;
  }

  if (pattern === "dune") {
    PS.atlas.writeTerrainDash(cell, 1, 5, 9, true, light);
    PS.atlas.writeTerrainDash(cell, 5, 9, 9, true, warm);
    PS.atlas.writeTerrainDash(cell, 2, 12, 6, true, shadow);
    return;
  }

  if (pattern === "ridge") {
    PS.atlas.writeTerrainDash(cell, 4, 2, 11, false, shadow);
    PS.atlas.writeTerrainDash(cell, 5, 3, 10, false, light);
    PS.atlas.writeTerrainDash(cell, 10, 7, 5, false, warm);
    return;
  }

  if (pattern === "frost" || pattern === "crack") {
    PS.atlas.writeTerrainDash(cell, 2, 3, 11, true, light);
    PS.atlas.writeTerrainDash(cell, 5, 8, 8, true, shadow);
    PS.atlas.writeTerrainDash(cell, 10, 1, 8, false, light);
    return;
  }

  if (pattern === "lava") {
    PS.atlas.writeTerrainDash(cell, 2, 6, 10, true, warm);
    PS.atlas.writeTerrainDash(cell, 7, 2, 12, false, warm);
    PS.atlas.writeDot(cell, 12, 12, 2, light);
    return;
  }

  PS.atlas.writeDot(cell, 4, 5, 1, light);
  PS.atlas.writeDot(cell, 10, 9, 1, warm);
  PS.atlas.writeDot(cell, 13, 3, 1, shadow);
};
