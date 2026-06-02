PS.render = PS.render || {};
PS.render.entities = PS.render.entities || {};
PS.render.entities.sprites = PS.render.entities.sprites || {};

PS.render.entities.registerSprite = function (id, sprite) {
  var spriteId = String(id || "").trim();

  if (!spriteId) {
    throw new Error("Entity sprite id is required");
  }

  PS.render.entities.sprites[spriteId] = sprite || {};
  return PS.render.entities.sprites[spriteId];
};

PS.render.entities.getSprite = function (id) {
  return PS.render.entities.sprites[String(id || "")] || null;
};

PS.render.entities.getAnimationPhase = function (entity, state, frameCount) {
  var frames = Math.max(1, Math.round(Number(frameCount) || 1));
  var seed = 0;
  var id = entity && entity.id !== undefined ? String(entity.id) : String((entity && entity.x) || 0) + ":" + String((entity && entity.y) || 0);
  var stateText = String(state || "idle");

  for (var i = 0; i < id.length; i++) {
    seed = (seed * 31 + id.charCodeAt(i)) % 9973;
  }

  for (var j = 0; j < stateText.length; j++) {
    seed = (seed * 17 + stateText.charCodeAt(j)) % 9973;
  }

  return (Math.floor((Number(world && world.tick) || 0) / 18) + seed) % frames;
};

PS.render.entities.getOrganismSpriteState = function (organism) {
  if (!organism) {
    return "idle";
  }

  if (Number(organism.energy) < 60) {
    return "hungry";
  }

  if (Number(organism.directionX) || Number(organism.directionY)) {
    return "move";
  }

  return "idle";
};

PS.render.entities.drawRegisteredSprite = function (spriteId, entity, point, size, color, state) {
  var sprite = PS.render.entities.getSprite(spriteId);
  var drawSize = Math.max(1, Number(size) || 1);
  var phase = PS.render.entities.getAnimationPhase(entity, state || "idle", sprite && sprite.frames);
  var tint = color || (sprite && sprite.color) || "#ffffff";

  if (!point) {
    return;
  }

  if (!sprite) {
    drawEntityAtCanvasPosition(point.x, point.y, drawSize, tint);
    return;
  }

  ctx.save();
  ctx.translate(Math.round(point.x), Math.round(point.y));
  ctx.fillStyle = tint;

  if (sprite.shape === "diamond") {
    ctx.beginPath();
    ctx.moveTo(0, -drawSize / 2);
    ctx.lineTo(drawSize / 2, 0);
    ctx.lineTo(0, drawSize / 2);
    ctx.lineTo(-drawSize / 2, 0);
    ctx.closePath();
    ctx.fill();
  } else if (sprite.shape === "sprout") {
    ctx.fillRect(-drawSize * 0.25, -drawSize * 0.35, drawSize * 0.50, drawSize * 0.70);
    ctx.fillStyle = sprite.accent || "#d8ffd0";
    ctx.fillRect(-drawSize * 0.50, -drawSize * 0.10 + phase % 2, drawSize, Math.max(1, drawSize * 0.22));
  } else if (sprite.shape === "settlement") {
    ctx.fillStyle = sprite.shadow || "rgba(5, 6, 10, 0.72)";
    ctx.fillRect(-drawSize * 0.58, -drawSize * 0.42, drawSize * 1.16, drawSize * 0.84);
    ctx.strokeStyle = tint;
    ctx.lineWidth = Math.max(1, Math.min(3, drawSize * 0.18));
    ctx.strokeRect(-drawSize * 0.58, -drawSize * 0.42, drawSize * 1.16, drawSize * 0.84);
    ctx.fillStyle = sprite.accent || "#f2b85b";
    ctx.fillRect(-drawSize * 0.42, -drawSize * 0.18, drawSize * 0.26, drawSize * 0.34);
    ctx.fillRect(-drawSize * 0.08, -drawSize * 0.28, drawSize * 0.22, drawSize * 0.44);
    ctx.fillRect(drawSize * 0.22, -drawSize * 0.10, drawSize * 0.26, drawSize * 0.32);
  } else if (sprite.shape === "creature") {
    var bob = phase % 2;
    ctx.fillStyle = sprite.shadow || "rgba(4, 6, 8, 0.45)";
    ctx.fillRect(-drawSize * 0.42, drawSize * 0.34, drawSize * 0.84, Math.max(1, drawSize * 0.18));
    ctx.fillStyle = tint;
    ctx.fillRect(-drawSize * 0.34, -drawSize * 0.22 + bob, drawSize * 0.68, drawSize * 0.46);
    ctx.fillRect(-drawSize * 0.18, -drawSize * 0.44 + bob, drawSize * 0.36, drawSize * 0.24);
    ctx.fillStyle = sprite.accent || "#ffffff";
    ctx.fillRect(-drawSize * 0.44, -drawSize * 0.04 + bob, drawSize * 0.18, drawSize * 0.18);
    ctx.fillRect(drawSize * 0.26, -drawSize * 0.04 + bob, drawSize * 0.18, drawSize * 0.18);
  } else {
    var bob = phase % 2;
    ctx.fillRect(-drawSize * 0.34, -drawSize * 0.42 + bob, drawSize * 0.68, drawSize * 0.84);
    ctx.fillStyle = sprite.accent || "#ffffff";
    ctx.fillRect(-drawSize * 0.16, -drawSize * 0.52 + bob, drawSize * 0.32, Math.max(1, drawSize * 0.22));
  }

  ctx.restore();
};

PS.render.entities.registerSprite("resource.food", {
  family: "resources",
  shape: "sprout",
  frames: 2,
  color: "#58f06c",
  accent: "#c8ffd0"
});

PS.render.entities.registerSprite("entity.organism", {
  family: "entities",
  shape: "creature",
  frames: 4,
  color: "#fff26b",
  accent: "#ffffff"
});

PS.render.entities.registerSprite("settlement.core", {
  family: "settlement",
  shape: "settlement",
  frames: 2,
  color: "#f2b85b",
  accent: "#fff26b"
});
