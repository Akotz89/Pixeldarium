// Pixel Sim Engine - terrain.js
// Terrain generation and fertile land helpers.

function getTerrain(x, y) {
  return world.terrain[getTileIndex(x, y)];
}

function isFertile(x, y) {
  return getTerrain(x, y) === CONFIG.TERRAIN_FERTILE;
}

function seedTerrain() {
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
