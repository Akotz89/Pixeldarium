function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function chance(percent) {
  return Math.random() < percent;
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