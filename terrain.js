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
    tile.shallowWater = 0;
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

    if (currentTile.biome === "ocean") {
      currentTile.shallowWater = clamp(landNeighbors / 8, 0, 1);
      currentTile.coastFactor = currentTile.shallowWater;
    } else {
      currentTile.coastFactor = clamp(waterNeighbors / 8, 0, 1);
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

function seedTerrain() {
  if (typeof resetPlanetSurfaceChunkCache === "function") {
    resetPlanetSurfaceChunkCache();
  }

  if (typeof resetLocalSurfaceRenderChunkCache === "function") {
    resetLocalSurfaceRenderChunkCache();
  }

  world.terrain = [];
  world.planetTiles = [];
  world.fertileTiles = 0;

  const tileSeeds = [];
  const targetWaterRatio = clamp((Number(CONFIG.PLANET_TARGET_WATER_PERCENT) || 71) / 100, 0.05, 0.95);
  const targetFertileLandRatio = clamp((Number(CONFIG.PLANET_TARGET_FERTILE_LAND_PERCENT) || 42) / 100, 0.05, 0.95);
  let totalPlanetAreaKm2 = 0;

  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const latitude = getPlanetLatitudeForTile(y);
      const areaKm2 = getPlanetTileAreaKm2(latitude);
      const absLatitude = Math.abs(latitude);
      const tropicalBand = Math.max(0, 1 - absLatitude / 58);
      const polarBand = clamp((absLatitude - 62) / 28, 0, 1);
      const continentWave =
        Math.sin(x * 0.035) +
        Math.cos(y * 0.052) +
        Math.sin((x + y) * 0.024) +
        Math.cos((x - y) * 0.018);
      const localVariation = randomUnit() * 1.15 - 0.35;
      const elevation = continentWave + localVariation - polarBand * 0.15;
      const moisture = tropicalBand * 1.05 + Math.sin((x - y) * 0.045) * 0.32 + randomUnit() * 0.5;
      const fertilityScore = moisture + elevation * 0.28 - polarBand * 1.55;
      const tileSeed = {
        x,
        y,
        latitude,
        absLatitude,
        polarBand,
        moisture,
        fertilityScore,
        elevation,
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
    world.planetTiles.push(makePlanetTile(
      tileSeed.x,
      tileSeed.y,
      biome,
      tileSeed.fertilityScore,
      tileSeed.moisture,
      tileSeed.elevation
    ));

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
