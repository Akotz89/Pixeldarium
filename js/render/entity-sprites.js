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
    variantRole: sprite.variantRole || "single-state",
    atlasCell: sprite.atlasCell || null
  };
};

PS.render.entities.getSpriteVariant = function (spriteId, entity, state) {
  var sprite = PS.render.entities.getSprite(spriteId);
  var idText = String(entity && entity.id !== undefined ? entity.id : spriteId);
  var seed = 0;

  for (var i = 0; i < idText.length; i++) {
    seed = (seed * 29 + idText.charCodeAt(i)) % 7919;
  }

  if (!sprite) {
    return {
      spriteId: spriteId,
      silhouette: "fallback",
      partCount: 1,
      state: state || "idle"
    };
  }

  if (spriteId === "resource.food") {
    var amount = Math.max(0, Number(entity && entity.amount) || 0);
    var clusterCount = clamp(5 + Math.round(amount / 90) + seed % 3, 5, 11);

    return {
      spriteId: spriteId,
      silhouette: amount >= 300 ? "thicket" : (amount >= 150 ? "patch" : "sprout"),
      clusterCount: clusterCount,
      partCount: clusterCount + 3,
      harvestSignal: amount >= 220 ? "ripe" : "fresh",
      state: state || "idle"
    };
  }

  if (spriteId === "entity.organism") {
    var traits = entity && entity.traits ? entity.traits : {};
    var bodySize = clamp(Number(traits.bodySize) || 1, 0.6, 2.4);
    var limbCount = clamp(Math.round(Number(traits.limbCount) || 4), 2, 8);
    var camouflage = clamp(Number(traits.camouflage) || 0, 0, 1);
    var energy = Number(entity && entity.energy) || 0;

    return {
      spriteId: spriteId,
      silhouette: bodySize > 1.55 ? "broad-body" : (limbCount >= 6 ? "many-limbed" : "scout"),
      bodyScale: bodySize,
      limbCount: limbCount,
      camouflageAlpha: camouflage,
      partCount: 5 + limbCount + (camouflage > 0.35 ? 3 : 1),
      vitalitySignal: energy < 60 ? "hungry" : (energy > 200 ? "breeding" : "active"),
      state: state || "idle"
    };
  }

  if (spriteId === "settlement.core") {
    var level = Math.max(1, Math.round(Number(entity && entity.level) || 1));
    var isColony = Boolean(entity && entity.isColony);
    var isOutpost = Boolean(entity && entity.isOutpost);

    return {
      spriteId: spriteId,
      silhouette: isColony ? "colony-grid" : (isOutpost ? "outpost-post" : "core-yard"),
      blockCount: clamp(3 + level + (isColony ? 3 : 0), 4, 12),
      level: level,
      partCount: clamp(8 + level * 2 + (isColony ? 4 : 0), 10, 24),
      civicSignal: isColony ? "colony" : (isOutpost ? "outpost" : "camp"),
      state: state || "core"
    };
  }

  return {
    spriteId: spriteId,
    silhouette: sprite.shape || "block",
    partCount: Math.max(1, Math.round(Number(sprite.partCount) || 1)),
    state: state || "idle"
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

PS.render.entities.drawResourceClusterSprite = function (sprite, drawSize, phase, tint, variant) {
  var sway = phase % 2;
  var clusterCount = variant && variant.clusterCount ? variant.clusterCount : 7;

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

  for (var i = 0; i < clusterCount - 5; i++) {
    var side = i % 2 === 0 ? -1 : 1;
    var row = Math.floor(i / 2);
    ctx.fillStyle = i % 3 === 0 ? (sprite.accent || "#d8ffd0") : tint;
    ctx.fillRect(
      side * drawSize * (0.20 + row * 0.10),
      -drawSize * (0.48 - row * 0.12) + sway,
      Math.max(1, drawSize * 0.18),
      Math.max(1, drawSize * 0.18)
    );
  }
};

PS.render.entities.drawCreatureSprite = function (sprite, drawSize, phase, tint, state, variant) {
  var bob = phase % 2;
  var isHungry = state === "hungry";
  var bodyScale = variant && variant.bodyScale ? variant.bodyScale : 1;
  var limbCount = variant && variant.limbCount ? variant.limbCount : 4;
  var bodyWidth = drawSize * (bodyScale > 1.5 ? 0.92 : 0.76);
  var bodyHeight = drawSize * (bodyScale > 1.5 ? 0.50 : 0.42);

  ctx.fillStyle = sprite.shadow || "rgba(4, 6, 8, 0.45)";
  ctx.fillRect(-drawSize * 0.48, drawSize * 0.34, drawSize * 0.96, Math.max(1, drawSize * 0.18));
  ctx.fillStyle = tint;
  ctx.fillRect(-bodyWidth / 2, -drawSize * 0.18 + bob, bodyWidth, bodyHeight);
  ctx.fillRect(-drawSize * 0.16, -drawSize * 0.46 + bob, drawSize * 0.38, drawSize * 0.26);
  ctx.fillStyle = sprite.leg || "#2f321f";
  for (var limb = 0; limb < limbCount; limb++) {
    var side = limb % 2 === 0 ? -1 : 1;
    var row = Math.floor(limb / 2);
    ctx.fillRect(
      side * drawSize * (0.26 + row * 0.05),
      drawSize * (0.10 + row * 0.06) + bob,
      drawSize * 0.12,
      drawSize * 0.20
    );
  }
  ctx.fillStyle = isHungry ? "#ff9c69" : (sprite.accent || "#ffffff");
  ctx.fillRect(-drawSize * 0.46, -drawSize * 0.02 + bob, drawSize * 0.16, drawSize * 0.16);
  ctx.fillRect(drawSize * 0.30, -drawSize * 0.02 + bob, drawSize * 0.16, drawSize * 0.16);
  if (variant && variant.camouflageAlpha > 0.25) {
    ctx.fillStyle = PS.render.entities.getRgbaFromHex("#1f4a2c", 0.28 + variant.camouflageAlpha * 0.32);
    ctx.fillRect(-bodyWidth * 0.36, -drawSize * 0.08 + bob, bodyWidth * 0.28, Math.max(1, drawSize * 0.10));
    ctx.fillRect(bodyWidth * 0.08, drawSize * 0.04 + bob, bodyWidth * 0.30, Math.max(1, drawSize * 0.10));
  }
  ctx.fillStyle = sprite.eye || "#041018";
  ctx.fillRect(drawSize * 0.08, -drawSize * 0.36 + bob, Math.max(1, drawSize * 0.10), Math.max(1, drawSize * 0.10));
};

PS.render.entities.drawSettlementSprite = function (sprite, drawSize, tint, state, variant) {
  var isColony = state === "colony";
  var isOutpost = state === "outpost";
  var blockCount = variant && variant.blockCount ? variant.blockCount : 5;

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

  for (var i = 0; i < blockCount - 4; i++) {
    var column = i % 4;
    var row = Math.floor(i / 4);
    ctx.fillStyle = i % 2 === 0 ? PS.render.entities.getRgbaFromHex(tint, 0.58) : (sprite.accent || "#fff26b");
    ctx.fillRect(
      -drawSize * 0.48 + column * drawSize * 0.28,
      drawSize * (0.18 + row * 0.16),
      Math.max(1, drawSize * 0.14),
      Math.max(1, drawSize * 0.14)
    );
  }
};

PS.render.entities.drawRegisteredSprite = function (spriteId, entity, point, size, color, state) {
  var sprite = PS.render.entities.getSprite(spriteId);
  var drawSize = Math.max(1, Number(size) || 1);
  var phase = PS.render.entities.getAnimationPhase(entity, state || "idle", sprite && sprite.frames);
  var tint = color || (sprite && sprite.color) || "#ffffff";
  var variant = PS.render.entities.getSpriteVariant(spriteId, entity, state);

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
    PS.render.entities.drawResourceClusterSprite(sprite, drawSize, phase, tint, variant);
  } else if (sprite.shape === "settlement") {
    PS.render.entities.drawSettlementSprite(sprite, drawSize, tint, state, variant);
  } else if (sprite.shape === "creature") {
    PS.render.entities.drawCreatureSprite(sprite, drawSize, phase, tint, state, variant);
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
  variantRole: "amount-cluster",
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
  variantRole: "trait-silhouette",
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
  variantRole: "settlement-growth",
  atlasCell: "settlement/core-cluster-01"
});
