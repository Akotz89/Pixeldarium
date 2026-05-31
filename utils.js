function normalizeSeedText(seedValue) {
  var seedText = String(seedValue == null ? "" : seedValue).trim();
  return seedText || String(CONFIG.DEFAULT_SEED || "PIXELSIM");
}

function hashSeedText(seedText) {
  var hash = 2166136261;

  for (var i = 0; i < seedText.length; i++) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  hash = hash >>> 0;
  return hash === 0 ? 1 : hash;
}

function setWorldSeed(seedValue) {
  world.seedText = normalizeSeedText(seedValue);
  world.rngState = hashSeedText(world.seedText);
  return world.seedText;
}

function ensureRandomState() {
  if (typeof world.rngState !== "number" || !Number.isFinite(world.rngState) || world.rngState <= 0) {
    setWorldSeed(world.seedText);
  }
}

function randomUnit() {
  ensureRandomState();

  var state = world.rngState >>> 0;
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  world.rngState = state >>> 0 || 1;

  return world.rngState / 4294967296;
}

function randomInt(max) {
  var normalizedMax = Math.max(1, Math.floor(Number(max) || 1));
  return Math.floor(randomUnit() * normalizedMax);
}

function chance(percent) {
  return randomUnit() < percent;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getTileIndex(x, y) {
  return y * WORLD_WIDTH + x;
}

function clampToWorld(entity) {
  entity.x = clamp(entity.x, 0, WORLD_WIDTH - 1);
  entity.y = clamp(entity.y, 0, WORLD_HEIGHT - 1);
}
