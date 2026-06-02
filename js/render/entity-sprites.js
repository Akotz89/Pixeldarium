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

PS.render.entities.getSpriteVisualIdentity = function (spriteId) {
  var sprite = PS.render.entities.getSprite(spriteId);

  if (!sprite) {
    return null;
  }

  return {
    family: sprite.family || "entities",
    shape: sprite.shape || "block",
    partCount: Math.max(1, Math.round(Number(sprite.partCount) || 1)),
    pixelRole: sprite.pixelRole || "marker",
    atlasCell: sprite.atlasCell || null
  };
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

PS.render.entities.drawResourceClusterSprite = function (sprite, drawSize, phase, tint) {
  var sway = phase % 2;

  ctx.fillStyle = sprite.shadow || "rgba(4, 8, 6, 0.42)";
  ctx.fillRect(-drawSize * 0.52, drawSize * 0.28, drawSize * 1.04, Math.max(1, drawSize * 0.20));
  ctx.fillStyle = sprite.stem || "#2b7a42";
  ctx.fillRect(-drawSize * 0.08, -drawSize * 0.42, drawSize * 0.16, drawSize * 0.78);
  ctx.fillStyle = tint;
  ctx.fillRect(-drawSize * 0.42, -drawSize * 0.20 + sway, drawSize * 0.32, drawSize * 0.28);
  ctx.fillRect(drawSize * 0.10, -drawSize * 0.32 - sway, drawSize * 0.36, drawSize * 0.30);
  ctx.fillStyle = sprite.accent || "#d8ffd0";
  ctx.fillRect(-drawSize * 0.18, -drawSize * 0.62, drawSize * 0.24, drawSize * 0.22);
  ctx.fillRect(drawSize * 0.20, -drawSize * 0.04, drawSize * 0.20, drawSize * 0.20);
};

PS.render.entities.drawCreatureSprite = function (sprite, drawSize, phase, tint, state) {
  var bob = phase % 2;
  var isHungry = state === "hungry";

  ctx.fillStyle = sprite.shadow || "rgba(4, 6, 8, 0.45)";
  ctx.fillRect(-drawSize * 0.48, drawSize * 0.34, drawSize * 0.96, Math.max(1, drawSize * 0.18));
  ctx.fillStyle = tint;
  ctx.fillRect(-drawSize * 0.38, -drawSize * 0.18 + bob, drawSize * 0.76, drawSize * 0.42);
  ctx.fillRect(-drawSize * 0.16, -drawSize * 0.46 + bob, drawSize * 0.38, drawSize * 0.26);
  ctx.fillStyle = sprite.leg || "#2f321f";
  ctx.fillRect(-drawSize * 0.42, drawSize * 0.16 + bob, drawSize * 0.16, drawSize * 0.22);
  ctx.fillRect(drawSize * 0.26, drawSize * 0.16 + bob, drawSize * 0.16, drawSize * 0.22);
  ctx.fillStyle = isHungry ? "#ff9c69" : (sprite.accent || "#ffffff");
  ctx.fillRect(-drawSize * 0.46, -drawSize * 0.02 + bob, drawSize * 0.16, drawSize * 0.16);
  ctx.fillRect(drawSize * 0.30, -drawSize * 0.02 + bob, drawSize * 0.16, drawSize * 0.16);
  ctx.fillStyle = sprite.eye || "#041018";
  ctx.fillRect(drawSize * 0.08, -drawSize * 0.36 + bob, Math.max(1, drawSize * 0.10), Math.max(1, drawSize * 0.10));
};

PS.render.entities.drawSettlementSprite = function (sprite, drawSize, tint, state) {
  var isColony = state === "colony";
  var isOutpost = state === "outpost";

  ctx.fillStyle = sprite.shadow || "rgba(5, 6, 10, 0.72)";
  ctx.fillRect(-drawSize * 0.64, -drawSize * 0.48, drawSize * 1.28, drawSize * 0.96);
  ctx.strokeStyle = tint;
  ctx.lineWidth = Math.max(1, Math.min(3, drawSize * 0.16));
  ctx.strokeRect(-drawSize * 0.64, -drawSize * 0.48, drawSize * 1.28, drawSize * 0.96);
  ctx.fillStyle = isColony ? "#70f0d0" : (isOutpost ? "#fff26b" : (sprite.accent || "#f2b85b"));
  ctx.fillRect(-drawSize * 0.46, -drawSize * 0.18, drawSize * 0.24, drawSize * 0.34);
  ctx.fillRect(-drawSize * 0.08, -drawSize * 0.34, drawSize * 0.24, drawSize * 0.50);
  ctx.fillRect(drawSize * 0.24, -drawSize * 0.08, drawSize * 0.28, drawSize * 0.30);
  ctx.fillStyle = sprite.roof || "#382719";
  ctx.fillRect(-drawSize * 0.50, -drawSize * 0.28, drawSize * 0.36, drawSize * 0.10);
  ctx.fillRect(-drawSize * 0.12, -drawSize * 0.42, drawSize * 0.34, drawSize * 0.10);
  ctx.fillRect(drawSize * 0.20, -drawSize * 0.18, drawSize * 0.36, drawSize * 0.10);
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
  } else if (sprite.shape === "resource-cluster") {
    PS.render.entities.drawResourceClusterSprite(sprite, drawSize, phase, tint);
  } else if (sprite.shape === "settlement") {
    PS.render.entities.drawSettlementSprite(sprite, drawSize, tint, state);
  } else if (sprite.shape === "creature") {
    PS.render.entities.drawCreatureSprite(sprite, drawSize, phase, tint, state);
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
  shape: "resource-cluster",
  frames: 2,
  color: "#58f06c",
  accent: "#c8ffd0",
  stem: "#2f8a4a",
  partCount: 7,
  pixelRole: "resource-node",
  atlasCell: "resources/food-cluster-01"
});

PS.render.entities.registerSprite("entity.organism", {
  family: "entities",
  shape: "creature",
  frames: 4,
  color: "#fff26b",
  accent: "#ffffff",
  leg: "#514e25",
  eye: "#061018",
  partCount: 8,
  pixelRole: "mobile-agent",
  atlasCell: "entities/organism-creature-01"
});

PS.render.entities.registerSprite("settlement.core", {
  family: "settlement",
  shape: "settlement",
  frames: 2,
  color: "#f2b85b",
  accent: "#fff26b",
  roof: "#46321f",
  partCount: 9,
  pixelRole: "built-cluster",
  atlasCell: "settlement/core-cluster-01"
});
