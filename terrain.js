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
  world.fertileTiles = 0;

  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const waveA = Math.sin(x * 0.06) + Math.cos(y * 0.09);
      const waveB = Math.sin((x + y) * 0.04);
      const noise = randomUnit() * 0.75;
      const fertilityScore = waveA + waveB + noise;

      const terrain = fertilityScore > CONFIG.TERRAIN_FERTILITY_CUTOFF
        ? CONFIG.TERRAIN_FERTILE
        : CONFIG.TERRAIN_BARREN;

      world.terrain.push(terrain);

      if (terrain === CONFIG.TERRAIN_FERTILE) {
        world.fertileTiles++;
      }
    }
  }
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
