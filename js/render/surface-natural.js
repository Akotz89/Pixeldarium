PS.render = PS.render || {};
PS.render.surfaceNatural = PS.render.surfaceNatural || {};

PS.render.surfaceNatural.getElementShape = function (elementType, noise, index) {
  var normalizedNoise = clamp(Number(noise) || 0, 0, 1);
  var maxSize = Math.max(1, CONFIG.TILE_SIZE - 1);
  var shortSize = 1;
  var midSize = clamp(Math.round(CONFIG.TILE_SIZE * (0.20 + normalizedNoise * 0.20)), 1, maxSize);
  var longSize = clamp(Math.round(CONFIG.TILE_SIZE * (0.44 + normalizedNoise * 0.28)), 1, maxSize);

  if (elementType === "water-ripple" || elementType === "sand-ripple" || elementType === "ice-crack") {
    return {
      width: longSize,
      height: shortSize
    };
  }

  if (elementType === "grass-blade") {
    return {
      width: shortSize,
      height: clamp(midSize + (index % 2), 1, maxSize)
    };
  }

  if (elementType === "leaf-litter" || elementType === "snow-crust") {
    return {
      width: clamp(midSize + 1, 1, maxSize),
      height: shortSize
    };
  }

  if (elementType === "stone-chip") {
    return index % 2 === 0
      ? { width: midSize, height: shortSize }
      : { width: shortSize, height: midSize };
  }

  return {
    width: midSize,
    height: midSize
  };
};

PS.render.surfaceNatural.getElementRotation = function (element, elementType, noise, index) {
  var base = Number.isFinite(Number(element && element.orientationRadians))
    ? Number(element.orientationRadians)
    : 0;
  var jitter = (clamp(Number(noise) || 0, 0, 1) - 0.5) * Math.PI * 0.18;

  if (elementType === "grass-blade") {
    jitter += (index % 2 === 0 ? -1 : 1) * Math.PI * 0.035;
  } else if (elementType === "stone-chip" || elementType === "pebble") {
    jitter += (index % 3 - 1) * Math.PI * 0.08;
  } else if (elementType === "leaf-litter" || elementType === "snow-crust") {
    jitter += Math.PI * 0.5;
  }

  return normalizePlanetLineAngleRadians(base + jitter);
};

PS.render.surfaceNatural.getElementColor = function (type) {
  switch (type) {
    case "water-ripple":
      return "#9bd8e7";
    case "grass-blade":
      return "#8fcf71";
    case "leaf-litter":
      return "#7a8f4d";
    case "pebble":
      return "#a9a18d";
    case "stone-chip":
      return "#c1b89f";
    case "sand-ripple":
      return "#d7bd78";
    case "snow-crust":
      return "#f6fdff";
    case "ice-crack":
      return "#8fc6dc";
    case "moss-clump":
      return "#78a66a";
    default:
      return "#d9e7ff";
  }
};

PS.render.surfaceNatural.getElementType = function (surface, biome, signals, relief) {
  var normalizedSurface = surface || "ground";
  var normalizedBiome = biome || "unknown";
  var surfaceRoughness = clamp(Number(signals && signals.surfaceRoughness) || 0, 0, 1);
  var wetness = clamp(Number(signals && signals.wetness) || 0, 0, 1);
  var slope = clamp(Number(relief && relief.slope) || 0, 0, 1);

  if (normalizedSurface === "open water" || normalizedSurface === "deep water" || normalizedSurface === "whitecap") {
    return "water-ripple";
  }

  if (normalizedSurface === "sand" || normalizedSurface === "dune") {
    return "sand-ripple";
  }

  if (normalizedSurface === "rock" || normalizedSurface === "stone") {
    return surfaceRoughness > 0.58 || slope > 0.20 ? "stone-chip" : "pebble";
  }

  if (normalizedSurface === "snow") {
    return "snow-crust";
  }

  if (normalizedSurface === "ice" || normalizedSurface === "ridge ice") {
    return "ice-crack";
  }

  if (normalizedSurface === "dense canopy" || normalizedSurface === "woodland") {
    return "leaf-litter";
  }

  if (normalizedSurface === "moss" || normalizedSurface === "scrub") {
    return "moss-clump";
  }

  if (normalizedSurface === "grass" || normalizedSurface === "brush" || normalizedSurface === "meadow" || normalizedSurface === "clearing") {
    return wetness > 0.56 && normalizedBiome !== "desert" ? "grass-blade" : (surfaceRoughness > 0.58 ? "pebble" : "grass-blade");
  }

  if (normalizedBiome === "desert") {
    return "sand-ripple";
  }

  return "pebble";
};

PS.render.surfaceNatural.getElement = function (latitude, longitude, biome, material, lod, relief) {
  var sampleMeters = Math.max(1, Number(lod && lod.sampleMeters) || 1);
  var surface = material && material.surface ? material.surface : "ground";
  var signals = material && material.signals ? material.signals : {};
  var meters = getSurfaceMeterCoordinate(latitude, longitude);
  var elementNoise = PS.render.surfaceNoise.getLayerNoise(meters, Math.max(1, sampleMeters), 89);
  var detailNoise = PS.render.surfaceNoise.getPixelNoise(meters, Math.max(1, sampleMeters), 97);
  var type = PS.render.surfaceNatural.getElementType(surface, biome, signals, relief);
  var density = 0;
  var roughness = clamp(Number(signals.surfaceRoughness) || Number(lod && lod.roughness) || 0, 0, 1);
  var wetness = clamp(Number(signals.wetness) || 0, 0, 1);
  var slope = clamp(Number(relief && relief.slope) || 0, 0, 1);

  if (sampleMeters > 5) {
    return { type: "none", density: 0, sizeMeters: 0, orientationRadians: 0, color: "#000000", alpha: 0 };
  }

  density = clamp(0.18 + elementNoise * 0.22 + detailNoise * 0.16 + roughness * 0.18 + wetness * 0.10 + slope * 0.10, 0, 0.86);

  if (type === "water-ripple") {
    density = clamp(density + (Number(signals.chop) || 0) * 0.18, 0, 0.88);
  } else if (type === "sand-ripple") {
    density = clamp(density + (Number(signals.dryness) || 0) * 0.14, 0, 0.88);
  } else if (type === "leaf-litter") {
    density = clamp(density + (Number(signals.canopyDensity) || 0) * 0.16, 0, 0.88);
  } else if (type === "snow-crust" || type === "ice-crack") {
    density = clamp(density + (Number(signals.snow) || 0) * 0.08, 0, 0.82);
  }

  return {
    type: type,
    density: density,
    sizeMeters: clamp(0.12 + density * 0.62 + detailNoise * 0.18, 0.08, sampleMeters),
    orientationRadians: normalizePlanetLineAngleRadians(Number.isFinite(Number(relief && relief.aspect)) ? (Number(relief.aspect) * Math.PI / 180) : elementNoise * Math.PI),
    color: PS.render.surfaceNatural.getElementColor(type),
    alpha: clamp(0.12 + density * 0.28, 0.12, 0.42)
  };
};

PS.render.surfaceNatural.getElementSwatches = function (sample, baseColor) {
  var detail = sample && sample.detail ? sample.detail : {};
  var element = detail.naturalElement || null;
  var sampleMeters = Math.max(1, Number(sample && sample.surfaceSampleMeters) || Number(detail.sampleMeters) || 1);
  var density = clamp(Number(element && element.density) || 0, 0, 1);
  var swatches = [];
  var seedEast = Math.round(Number(sample && sample.surfaceSampleX) || 0);
  var seedNorth = Math.round(Number(sample && sample.surfaceSampleY) || 0);
  var type = element && element.type ? element.type : "none";
  var typeSeed = String(type).split("").reduce(function(total, character) {
    return total + character.charCodeAt(0);
  }, 0);
  var count = density <= 0.18 ? 0 : clamp(Math.round(1 + density * 5), 1, 6);

  if (!element || type === "none" || sampleMeters > 5 || CONFIG.TILE_SIZE < 4 || count <= 0) {
    return swatches;
  }

  for (var i = 0; i < count; i++) {
    var noise = getDeterministicUnitNoise(seedEast + i * 29, seedNorth - i * 31, getPlanetVisualSeedOffset() + typeSeed + 5303 + i * 17);
    var shape = PS.render.surfaceNatural.getElementShape(type, noise, i);
    var maxX = Math.max(1, CONFIG.TILE_SIZE - shape.width + 1);
    var maxY = Math.max(1, CONFIG.TILE_SIZE - shape.height + 1);

    if (i > 0 && noise > density + 0.42) {
      continue;
    }

    swatches.push({
      x: Math.floor(getDeterministicUnitNoise(seedEast - i * 13, seedNorth + i * 11, getPlanetVisualSeedOffset() + typeSeed + 5417 + i) * maxX),
      y: Math.floor(getDeterministicUnitNoise(seedEast + i * 7, seedNorth - i * 19, getPlanetVisualSeedOffset() + typeSeed + 5521 + i) * maxY),
      width: shape.width,
      height: shape.height,
      size: Math.max(shape.width, shape.height),
      color: blendHexColors(baseColor, element.color || "#d9e7ff", clamp(0.18 + density * 0.28 + noise * 0.10, 0.18, 0.54)),
      alpha: clamp((Number(element.alpha) || 0.18) + noise * 0.08, 0.12, 0.50),
      rotationRadians: PS.render.surfaceNatural.getElementRotation(element, type, noise, i),
      elementType: type
    });
  }

  return swatches;
};
