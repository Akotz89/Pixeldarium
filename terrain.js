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
  const elevations = [];
  const targetWaterRatio = clamp((Number(CONFIG.PLANET_TARGET_WATER_PERCENT) || 71) / 100, 0.05, 0.95);

  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const latitude = getPlanetLatitudeForTile(y);
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
        elevation
      };

      tileSeeds.push(tileSeed);
      elevations.push(elevation);
    }
  }

  elevations.sort(function(a, b) {
    return a - b;
  });

  const waterThreshold = elevations[Math.min(
    elevations.length - 1,
    Math.max(0, Math.floor(elevations.length * targetWaterRatio))
  )];

  for (let i = 0; i < tileSeeds.length; i++) {
    const tileSeed = tileSeeds[i];
    const isWater = tileSeed.elevation <= waterThreshold;
    let biome = "ocean";

    if (!isWater && tileSeed.polarBand > 0.55) {
      biome = "ice";
    } else if (!isWater && tileSeed.fertilityScore > CONFIG.TERRAIN_FERTILITY_CUTOFF + 0.45) {
      biome = "forest";
    } else if (!isWater && tileSeed.fertilityScore > CONFIG.TERRAIN_FERTILITY_CUTOFF) {
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
