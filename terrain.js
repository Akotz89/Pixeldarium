// Pixel Sim Engine - terrain.js
// Terrain generation and fertile land helpers.

function getTerrain(x, y) {
  return world.terrain[getTileIndex(x, y)];
}

function isFertile(x, y) {
  return getTerrain(x, y) === CONFIG.TERRAIN_FERTILE;
}

function getTerrainNeighborTiles(tile) {
  var neighbors = [];

  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) {
        continue;
      }

      neighbors.push({
        dx: dx,
        dy: dy,
        tile: getPlanetTile(getWrappedWorldX(tile.x + dx), getClampedWorldY(tile.y + dy))
      });
    }
  }

  return neighbors;
}

function annotatePlanetHydrology() {
  if (!Array.isArray(world.planetTiles) || world.planetTiles.length === 0) {
    return;
  }

  var landTiles = [];
  var totalLandAreaKm2 = 0;

  for (var i = 0; i < world.planetTiles.length; i++) {
    var tile = world.planetTiles[i];

    if (!tile) {
      continue;
    }

    tile.coastFactor = 0;
    tile.coastlineNoise = 0;
    tile.shallowWater = 0;
    tile.shelfStrength = 0;
    tile.waterFlow = 0;
    tile.riverStrength = 0;
    tile.riverMouth = 0;
    tile.flowDirectionX = 0;
    tile.flowDirectionY = 0;

    if (tile.biome !== "ocean") {
      landTiles.push(tile);
      totalLandAreaKm2 += Math.max(0, Number(tile.areaKm2) || 0);
    }
  }

  for (var tileIndex = 0; tileIndex < world.planetTiles.length; tileIndex++) {
    var currentTile = world.planetTiles[tileIndex];

    if (!currentTile) {
      continue;
    }

    var neighbors = getTerrainNeighborTiles(currentTile);
    var waterNeighbors = 0;
    var landNeighbors = 0;
    var secondRingWaterNeighbors = 0;
    var secondRingLandNeighbors = 0;
    var shorelineSeedOffset = typeof hashSeedText === "function" ? hashSeedText(world.seedText || "") % 100000 : 0;
    var coastlineNoise = getTerrainFractalNoise(
      currentTile.x + getDeterministicUnitNoise(currentTile.x, currentTile.y, shorelineSeedOffset + 911) * 0.45,
      currentTile.y + getDeterministicUnitNoise(currentTile.x, currentTile.y, shorelineSeedOffset + 919) * 0.45,
      5.5,
      shorelineSeedOffset + 927,
      3,
      0.48
    );

    for (var neighborIndex = 0; neighborIndex < neighbors.length; neighborIndex++) {
      var neighborTile = neighbors[neighborIndex].tile;

      if (!neighborTile) {
        continue;
      }

      if (neighborTile.biome === "ocean") {
        waterNeighbors++;
      } else {
        landNeighbors++;
      }
    }

    for (var ringY = -2; ringY <= 2; ringY++) {
      for (var ringX = -2; ringX <= 2; ringX++) {
        var ringTile;

        if (Math.max(Math.abs(ringX), Math.abs(ringY)) !== 2) {
          continue;
        }

        ringTile = getPlanetTile(getWrappedWorldX(currentTile.x + ringX), getClampedWorldY(currentTile.y + ringY));

        if (!ringTile) {
          continue;
        }

        if (ringTile.biome === "ocean") {
          secondRingWaterNeighbors++;
        } else {
          secondRingLandNeighbors++;
        }
      }
    }

    currentTile.coastlineNoise = coastlineNoise;

    if (currentTile.biome === "ocean") {
      currentTile.shallowWater = clamp(
        landNeighbors / 8 * 0.72 +
          secondRingLandNeighbors / 16 * 0.22 +
          Math.max(0, coastlineNoise - 0.38) * 0.18,
        0,
        1
      );
      currentTile.shelfStrength = clamp(
        currentTile.shallowWater * 0.82 +
          Math.max(0, Number(currentTile.seaLevelDelta) || 0) * 0.16,
        0,
        1
      );
      currentTile.coastFactor = currentTile.shallowWater;
    } else {
      currentTile.coastFactor = clamp(
        waterNeighbors / 8 * 0.72 +
          secondRingWaterNeighbors / 16 * 0.22 +
          Math.max(0, coastlineNoise - 0.42) * 0.16,
        0,
        1
      );
      currentTile.shelfStrength = clamp(currentTile.coastFactor * 0.68 + Math.max(0, 0.12 - (Number(currentTile.seaLevelDelta) || 0)) * 0.25, 0, 1);
    }
  }

  for (var landIndex = 0; landIndex < landTiles.length; landIndex++) {
    var landTile = landTiles[landIndex];
    var rainfall = clamp(Number(landTile.moisture) || 0, 0.08, 2.2);

    landTile.waterFlow = Math.max(0, rainfall * Math.max(1, Number(landTile.areaKm2) || 1));
  }

  landTiles.sort(function(a, b) {
    return (Number(b.elevation) || 0) - (Number(a.elevation) || 0);
  });

  for (var flowIndex = 0; flowIndex < landTiles.length; flowIndex++) {
    var sourceTile = landTiles[flowIndex];
    var sourceNeighbors = getTerrainNeighborTiles(sourceTile);
    var lowestNeighbor = null;
    var lowestOffset = { dx: 0, dy: 0 };
    var sourceElevation = Number(sourceTile.elevation) || 0;

    for (var sourceNeighborIndex = 0; sourceNeighborIndex < sourceNeighbors.length; sourceNeighborIndex++) {
      var candidate = sourceNeighbors[sourceNeighborIndex].tile;

      if (!candidate) {
        continue;
      }

      if (!lowestNeighbor || (Number(candidate.elevation) || 0) < (Number(lowestNeighbor.elevation) || 0)) {
        lowestNeighbor = candidate;
        lowestOffset = {
          dx: sourceNeighbors[sourceNeighborIndex].dx,
          dy: sourceNeighbors[sourceNeighborIndex].dy
        };
      }
    }

    if (lowestNeighbor && (lowestNeighbor.biome === "ocean" || (Number(lowestNeighbor.elevation) || 0) < sourceElevation)) {
      sourceTile.flowDirectionX = lowestOffset.dx;
      sourceTile.flowDirectionY = lowestOffset.dy;

      if (lowestNeighbor.biome === "ocean") {
        sourceTile.riverMouth = 1;
        lowestNeighbor.riverMouth = Math.max(Number(lowestNeighbor.riverMouth) || 0, 0.65);
        lowestNeighbor.shallowWater = Math.max(Number(lowestNeighbor.shallowWater) || 0, 0.72);
      } else {
        lowestNeighbor.waterFlow += sourceTile.waterFlow;
      }
    }
  }

  var riverThreshold = Math.max(1, totalLandAreaKm2 * 0.00008);

  for (var riverIndex = 0; riverIndex < landTiles.length; riverIndex++) {
    var riverTile = landTiles[riverIndex];

    riverTile.riverStrength = clamp((riverTile.waterFlow / riverThreshold - 1) / 6, 0, 1);
    riverTile.riverMouth = Math.max(
      Number(riverTile.riverMouth) || 0,
      riverTile.coastFactor > 0 ? riverTile.riverStrength * riverTile.coastFactor : 0
    );
  }
}

function annotatePlanetTerrainRelief() {
  if (!Array.isArray(world.planetTiles) || world.planetTiles.length === 0) {
    return;
  }

  var lightX = -0.46;
  var lightY = 0.54;
  var lightZ = 0.70;
  var lightLength = Math.sqrt(lightX * lightX + lightY * lightY + lightZ * lightZ) || 1;

  for (var i = 0; i < world.planetTiles.length; i++) {
    var tile = world.planetTiles[i];

    if (!tile) {
      continue;
    }

    var west = getPlanetTile(getWrappedWorldX(tile.x - 1), tile.y);
    var east = getPlanetTile(getWrappedWorldX(tile.x + 1), tile.y);
    var north = getPlanetTile(tile.x, getClampedWorldY(tile.y - 1));
    var south = getPlanetTile(tile.x, getClampedWorldY(tile.y + 1));
    var dzdx = ((east ? Number(east.elevation) || 0 : 0) - (west ? Number(west.elevation) || 0 : 0)) / 2;
    var dzdy = ((north ? Number(north.elevation) || 0 : 0) - (south ? Number(south.elevation) || 0 : 0)) / 2;
    var slopeMagnitude = Math.sqrt(dzdx * dzdx + dzdy * dzdy);
    var normalX = -dzdx;
    var normalY = -dzdy;
    var normalZ = 1.2;
    var normalLength = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ) || 1;
    var dot =
      (normalX / normalLength) * (lightX / lightLength) +
      (normalY / normalLength) * (lightY / lightLength) +
      (normalZ / normalLength) * (lightZ / lightLength);

    tile.terrainSlope = clamp(slopeMagnitude / 1.8, 0, 1);
    tile.terrainAspect = normalizeLongitude(Math.atan2(dzdy, dzdx) * 180 / Math.PI);
    tile.terrainHillshade = clamp(0.26 + Math.max(0, dot) * 0.74, 0, 1);
  }
}

function smoothTerrainNoiseAmount(amount) {
  var t = clamp(Number(amount) || 0, 0, 1);

  return t * t * (3 - 2 * t);
}

function getWrappedTerrainNoiseCellX(cellX, columnCount) {
  var normalizedColumnCount = Math.max(1, Math.round(Number(columnCount) || 1));

  return ((Math.round(Number(cellX) || 0) % normalizedColumnCount) + normalizedColumnCount) % normalizedColumnCount;
}

function getTerrainValueNoise(x, y, scale, seedOffset) {
  var normalizedScale = Math.max(1, Number(scale) || 1);
  var columnCount = Math.max(1, Math.ceil(WORLD_WIDTH / normalizedScale));
  var rowCount = Math.max(1, Math.ceil(WORLD_HEIGHT / normalizedScale));
  var xCell = (Number(x) || 0) / normalizedScale;
  var yCell = (Number(y) || 0) / normalizedScale;
  var x0 = Math.floor(xCell);
  var y0 = Math.floor(yCell);
  var x1 = x0 + 1;
  var y1 = y0 + 1;
  var xAmount = smoothTerrainNoiseAmount(xCell - x0);
  var yAmount = smoothTerrainNoiseAmount(yCell - y0);
  var seed = Math.round(Number(seedOffset) || 0);
  var topLeft = getDeterministicUnitNoise(getWrappedTerrainNoiseCellX(x0, columnCount), clamp(y0, 0, rowCount - 1), seed);
  var topRight = getDeterministicUnitNoise(getWrappedTerrainNoiseCellX(x1, columnCount), clamp(y0, 0, rowCount - 1), seed);
  var bottomLeft = getDeterministicUnitNoise(getWrappedTerrainNoiseCellX(x0, columnCount), clamp(y1, 0, rowCount - 1), seed);
  var bottomRight = getDeterministicUnitNoise(getWrappedTerrainNoiseCellX(x1, columnCount), clamp(y1, 0, rowCount - 1), seed);
  var top = topLeft + (topRight - topLeft) * xAmount;
  var bottom = bottomLeft + (bottomRight - bottomLeft) * xAmount;

  return top + (bottom - top) * yAmount;
}

function getTerrainFractalNoise(x, y, scale, seedOffset, octaves, persistence) {
  var normalizedOctaves = Math.max(1, Math.round(Number(octaves) || 1));
  var normalizedPersistence = clamp(Number(persistence) || 0.5, 0.1, 0.9);
  var value = 0;
  var amplitude = 1;
  var amplitudeTotal = 0;
  var currentScale = Math.max(1, Number(scale) || 1);

  for (var octave = 0; octave < normalizedOctaves; octave++) {
    value += getTerrainValueNoise(x, y, currentScale, seedOffset + octave * 101) * amplitude;
    amplitudeTotal += amplitude;
    amplitude *= normalizedPersistence;
    currentScale = Math.max(1, currentScale * 0.52);
  }

  return amplitudeTotal > 0 ? value / amplitudeTotal : 0.5;
}

function getTerrainRidgedNoise(x, y, scale, seedOffset) {
  var base = getTerrainFractalNoise(x, y, scale, seedOffset, 4, 0.54);
  var ridge = 1 - Math.abs(base * 2 - 1);

  return clamp(ridge * ridge * 1.35, 0, 1);
}

function getTerrainWrappedTileDeltaX(x, centerX) {
  var width = Math.max(1, WORLD_WIDTH);
  var delta = Math.abs((Number(x) || 0) - (Number(centerX) || 0));

  return Math.min(delta, width - delta);
}

function getTerrainContinentPlateInfluence(x, y, seedOffset) {
  var influence = 0;
  var plateCount = 8;
  var normalizedX = Number(x) || 0;
  var normalizedY = Number(y) || 0;

  for (var plateIndex = 0; plateIndex < plateCount; plateIndex++) {
    var centerX = getDeterministicUnitNoise(plateIndex, 11, seedOffset + 701) * WORLD_WIDTH;
    var centerY = (0.14 + getDeterministicUnitNoise(plateIndex, 23, seedOffset + 709) * 0.72) * WORLD_HEIGHT;
    var radiusX = (0.09 + getDeterministicUnitNoise(plateIndex, 37, seedOffset + 719) * 0.14) * WORLD_WIDTH;
    var radiusY = (0.11 + getDeterministicUnitNoise(plateIndex, 41, seedOffset + 727) * 0.18) * WORLD_HEIGHT;
    var weight = 0.70 + getDeterministicUnitNoise(plateIndex, 53, seedOffset + 733) * 0.42;
    var dx = getTerrainWrappedTileDeltaX(normalizedX, centerX) / Math.max(1, radiusX);
    var dy = (normalizedY - centerY) / Math.max(1, radiusY);
    var distance = Math.sqrt(dx * dx + dy * dy);
    var plate = clamp(1 - Math.pow(distance, 1.55), 0, 1) * weight;

    influence = Math.max(influence, plate);
  }

  return clamp(influence, 0, 1);
}

function seedTerrain() {
  if (typeof resetPlanetSurfaceChunkCache === "function") {
    resetPlanetSurfaceChunkCache();
  }

  if (typeof resetLocalSurfaceRenderChunkCache === "function") {
    resetLocalSurfaceRenderChunkCache();
  }

  if (typeof resetPlanetGroundFeatureBlockCache === "function") {
    resetPlanetGroundFeatureBlockCache();
  }

  world.terrain = [];
  world.planetTiles = [];
  world.fertileTiles = 0;

  const tileSeeds = [];
  const targetWaterRatio = clamp((Number(CONFIG.PLANET_TARGET_WATER_PERCENT) || 71) / 100, 0.05, 0.95);
  const targetFertileLandRatio = clamp((Number(CONFIG.PLANET_TARGET_FERTILE_LAND_PERCENT) || 42) / 100, 0.05, 0.95);
  const seedOffset = typeof hashSeedText === "function" ? hashSeedText(world.seedText || "") % 100000 : 0;
  let totalPlanetAreaKm2 = 0;

  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const latitude = getPlanetLatitudeForTile(y);
      const areaKm2 = getPlanetTileAreaKm2(latitude);
      const absLatitude = Math.abs(latitude);
      const tropicalBand = Math.max(0, 1 - absLatitude / 58);
      const stormBand = Math.max(0, 1 - Math.abs(absLatitude - 52) / 26);
      const subtropicalDryBand = Math.max(0, 1 - Math.abs(absLatitude - 28) / 18);
      const polarBand = clamp((absLatitude - 62) / 28, 0, 1);
      const continental = getTerrainFractalNoise(x, y, 74, seedOffset + 1201, 5, 0.58);
      const plateInfluence = getTerrainContinentPlateInfluence(x, y, seedOffset + 7301);
      const shelf = getTerrainFractalNoise(x, y, 38, seedOffset + 2203, 4, 0.55);
      const basin = getTerrainFractalNoise(x, y, 17, seedOffset + 3209, 3, 0.50);
      const ridge = getTerrainRidgedNoise(x, y, 33, seedOffset + 4211);
      const roughness = getTerrainFractalNoise(x, y, 8, seedOffset + 5227, 3, 0.48);
      const islandArc = Math.pow(getTerrainRidgedNoise(x, y, 18, seedOffset + 7247), 1.8) *
        getTerrainFractalNoise(x, y, 26, seedOffset + 7253, 3, 0.52) *
        clamp(1 - plateInfluence * 0.72, 0, 1);
      const continentShape = clamp(
        plateInfluence * 0.72 +
          continental * 0.24 +
          islandArc * 0.22 +
          (shelf - 0.5) * 0.10,
        0,
        1.15
      );
      const highlandLift = Math.pow(ridge, 2.25) * clamp(0.34 + continentShape * 0.86, 0, 1.15);
      const elevation =
        (continentShape - 0.5) * 2.72 +
        (shelf - 0.5) * 0.78 +
        (basin - 0.5) * 0.32 +
        (roughness - 0.5) * 0.16 +
        highlandLift * 1.18 -
        polarBand * 0.10;
      const moistureNoise = getTerrainFractalNoise(x, y, 46, seedOffset + 6233, 4, 0.56);
      const rainShadow = clamp(ridge * 0.42 + highlandLift * 0.30, 0, 0.58);
      const moisture = clamp(
        tropicalBand * 0.88 +
          stormBand * 0.46 +
          moistureNoise * 0.70 -
          subtropicalDryBand * 0.44 -
          rainShadow +
          0.12,
        0,
        2.2
      );
      const fertilityScore = moisture + elevation * 0.23 - polarBand * 1.55 - highlandLift * 0.18;
      const tileSeed = {
        x,
        y,
        latitude,
        absLatitude,
        polarBand,
        moisture,
        fertilityScore,
        elevation,
        continentShape,
        plateInfluence,
        islandArc,
        ridge,
        roughness,
        highlandLift,
        areaKm2
      };

      tileSeeds.push(tileSeed);
      totalPlanetAreaKm2 += areaKm2;
    }
  }

  const sortedTileSeeds = tileSeeds.slice().sort(function(a, b) {
    return a.elevation - b.elevation;
  });
  const targetWaterAreaKm2 = totalPlanetAreaKm2 * targetWaterRatio;
  let cumulativeWaterAreaKm2 = 0;
  let waterThreshold = sortedTileSeeds.length > 0 ? sortedTileSeeds[0].elevation : 0;

  for (let i = 0; i < sortedTileSeeds.length; i++) {
    cumulativeWaterAreaKm2 += sortedTileSeeds[i].areaKm2;
    waterThreshold = sortedTileSeeds[i].elevation;

    if (cumulativeWaterAreaKm2 >= targetWaterAreaKm2) {
      break;
    }
  }

  const candidateLandSeeds = [];
  let totalLandAreaKm2 = 0;

  for (let i = 0; i < tileSeeds.length; i++) {
    const tileSeed = tileSeeds[i];

    if (tileSeed.elevation > waterThreshold) {
      totalLandAreaKm2 += tileSeed.areaKm2;

      if (tileSeed.polarBand <= 0.55) {
        candidateLandSeeds.push(tileSeed);
      }
    }
  }

  const sortedFertileSeeds = candidateLandSeeds.slice().sort(function(a, b) {
    return b.fertilityScore - a.fertilityScore;
  });
  const targetFertileAreaKm2 = totalLandAreaKm2 * targetFertileLandRatio;
  let cumulativeFertileAreaKm2 = 0;
  let fertileThreshold = sortedFertileSeeds.length > 0
    ? sortedFertileSeeds[sortedFertileSeeds.length - 1].fertilityScore
    : CONFIG.TERRAIN_FERTILITY_CUTOFF;

  for (let i = 0; i < sortedFertileSeeds.length; i++) {
    cumulativeFertileAreaKm2 += sortedFertileSeeds[i].areaKm2;
    fertileThreshold = sortedFertileSeeds[i].fertilityScore;

    if (cumulativeFertileAreaKm2 >= targetFertileAreaKm2) {
      break;
    }
  }

  for (let i = 0; i < tileSeeds.length; i++) {
    const tileSeed = tileSeeds[i];
    const isWater = tileSeed.elevation <= waterThreshold;
    const isFrozen = !isWater && tileSeed.polarBand > 0.55;
    const isFertileLand = !isWater && !isFrozen && tileSeed.fertilityScore >= fertileThreshold;
    let biome = "ocean";

    if (isFrozen) {
      biome = "ice";
    } else if (isFertileLand && tileSeed.fertilityScore > fertileThreshold + 0.25) {
      biome = "forest";
    } else if (isFertileLand) {
      biome = "grassland";
    } else if (!isWater && tileSeed.absLatitude < 34 && tileSeed.moisture < 0.55) {
      biome = "desert";
    } else if (!isWater) {
      biome = "tundra";
    }

    const terrain = biome === "forest" || biome === "grassland"
      ? CONFIG.TERRAIN_FERTILE
      : CONFIG.TERRAIN_BARREN;

    world.terrain.push(terrain);

    const planetTile = makePlanetTile(
      tileSeed.x,
      tileSeed.y,
      biome,
      tileSeed.fertilityScore,
      tileSeed.moisture,
      tileSeed.elevation
    );

    planetTile.ridgeStrength = tileSeed.ridge;
    planetTile.roughness = tileSeed.roughness;
    planetTile.highlandLift = tileSeed.highlandLift;
    planetTile.continentShape = tileSeed.continentShape;
    planetTile.plateInfluence = tileSeed.plateInfluence;
    planetTile.islandArc = tileSeed.islandArc;
    planetTile.seaLevelDelta = tileSeed.elevation - waterThreshold;
    world.planetTiles.push(planetTile);

    if (terrain === CONFIG.TERRAIN_FERTILE) {
      world.fertileTiles++;
    }
  }

  annotatePlanetHydrology();
  annotatePlanetTerrainRelief();
  refreshPlanetSummary();
}

function randomFertilePosition() {
  for (let i = 0; i < 200; i++) {
    const x = randomInt(WORLD_WIDTH);
    const y = randomInt(WORLD_HEIGHT);

    if (isFertile(x, y)) {
      return { x, y };
    }
  }

  return {
    x: randomInt(WORLD_WIDTH),
    y: randomInt(WORLD_HEIGHT)
  };
}
