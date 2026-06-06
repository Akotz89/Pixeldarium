PS.atlas = PS.atlas || {};

PS.atlas.getTerrainCivilizationInfo = function (sample) {
  var detail = sample && sample.detail ? sample.detail : {};
  var signals = detail.materialSignals || {};
  var civilization = sample && sample.civilization ? sample.civilization : {};
  var settlement = Math.max(
    Number(signals.settlementDensity) || 0,
    Number(civilization.settlementPressure) || 0,
    civilization.type === "settlement" ? Number(civilization.pressure) || 0 : 0
  );
  var route = Math.max(
    Number(signals.routeTraffic) || 0,
    Number(civilization.routePressure) || 0,
    civilization.type === "route" ? Number(civilization.pressure) || 0 : 0
  );
  var border = Math.max(
    Number(signals.borderInfluence) || 0,
    Number(civilization.borderPressure) || 0,
    civilization.type === "border" ? Number(civilization.pressure) || 0 : 0
  );
  var pressure = Math.max(settlement, route, border);
  var type = "settlement";

  if (pressure < 0.18) {
    return null;
  }

  if (civilization.type === "settlement") {
    type = "settlement";
    pressure = settlement || Number(civilization.pressure) || pressure;
  } else if (civilization.type === "route") {
    type = "route";
    pressure = route || Number(civilization.pressure) || pressure;
  } else if (civilization.type === "border") {
    type = "border";
    pressure = border || Number(civilization.pressure) || pressure;
  } else if (route >= settlement && route >= border) {
    type = "route";
    pressure = route;
  } else if (border >= settlement && border >= route) {
    type = "border";
    pressure = border;
  } else {
    pressure = settlement;
  }

  return {
    type: type,
    bucket: clamp(Math.floor(clamp(pressure, 0, 1) * 4), 1, 3),
    pressure: clamp(pressure, 0, 1),
    lineageId: Math.max(1, Math.round(Number(civilization.lineageId) || 1))
  };
};

PS.atlas.getTerrainCivilizationKey = function (sample) {
  var civilization = PS.atlas.getTerrainCivilizationInfo(sample);

  if (!civilization) {
    return "civ0";
  }

  return "civ." + civilization.type + "." + civilization.bucket;
};

PS.atlas.applyTerrainCivilizationPalette = function (palette, civilization) {
  if (!civilization) {
    return palette;
  }

  var builtBase = civilization.type === "route" ? [130, 102, 70] : (civilization.type === "border" ? [82, 96, 132] : [118, 96, 76]);
  var builtAccent = civilization.type === "route" ? [220, 188, 122] : (civilization.type === "border" ? [154, 184, 232] : [214, 178, 112]);
  var pressure = clamp(0.14 + civilization.pressure * 0.22, 0, 0.38);

  return {
    base: [
      Math.round(palette.base[0] * (1 - pressure) + builtBase[0] * pressure),
      Math.round(palette.base[1] * (1 - pressure) + builtBase[1] * pressure),
      Math.round(palette.base[2] * (1 - pressure) + builtBase[2] * pressure)
    ],
    accent: [
      Math.round(palette.accent[0] * (1 - pressure) + builtAccent[0] * pressure),
      Math.round(palette.accent[1] * (1 - pressure) + builtAccent[1] * pressure),
      Math.round(palette.accent[2] * (1 - pressure) + builtAccent[2] * pressure)
    ],
    dark: palette.dark,
    pattern: palette.pattern
  };
};

PS.atlas.drawTerrainCivilizationMarks = function (cell, palette, variant, sample) {
  var civilization = PS.atlas.getTerrainCivilizationInfo(sample);
  var light = civilization ? PS.atlas.getTerrainDetailColor(palette, "light") : null;
  var warm = civilization ? PS.atlas.getTerrainDetailColor(palette, "warm") : null;
  var shadow = civilization ? PS.atlas.getTerrainDetailColor(palette, "shadow") : null;
  var phase = clamp(Math.round(Number(variant) || 0), 0, 15);
  var i;
  var x;
  var y;

  if (!civilization) {
    return;
  }

  if (civilization.type === "settlement") {
    for (i = 0; i < civilization.bucket + 1; i++) {
      x = 5 + ((phase + i * 3) % 6);
      y = 5 + ((phase * 2 + i * 2) % 6);
      PS.atlas.writeDot(cell, x, y, civilization.bucket >= 3 ? 1 : 0, warm);
      PS.atlas.writePixel(cell, x, Math.max(0, y - 1), light);
      PS.atlas.writePixel(cell, Math.min(15, x + 1), Math.min(15, y + 1), shadow);
    }
    PS.atlas.writeTerrainDash(cell, 4, 11, 8, true, shadow);
    return;
  }

  if (civilization.type === "route") {
    y = 6 + (phase % 4);
    PS.atlas.writeTerrainDash(cell, 1, y, 14, true, shadow);
    PS.atlas.writeTerrainDash(cell, 2, y + 1, 11, true, warm);
    if (civilization.bucket >= 2) {
      PS.atlas.writePixel(cell, 5, Math.max(0, y - 1), light);
      PS.atlas.writePixel(cell, 10, Math.min(15, y + 2), light);
    }
    if (civilization.bucket >= 3) {
      PS.atlas.writePixel(cell, 7, y, light);
      PS.atlas.writePixel(cell, 8, y + 1, light);
    }
    return;
  }

  for (i = 0; i < 3 + civilization.bucket; i++) {
    x = (phase * 3 + i * 5) % 16;
    y = (phase + i * 4) % 16;
    PS.atlas.writePixel(cell, x, y, light);
    PS.atlas.writePixel(cell, Math.min(15, x + 1), y, shadow);
  }
};
