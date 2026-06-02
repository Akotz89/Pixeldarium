PS.render = PS.render || {};
PS.render.entities = PS.render.entities || {};

PS.render.entities.getPresenceZoomAmount = function (zoomLevel) {
  var viewZoom = Number.isFinite(Number(zoomLevel))
    ? Number(zoomLevel)
    : Number(world && world.planetView && world.planetView.zoomLevel) || 0;
  var maxZoom = PS.camera && PS.camera.getZoomLevels ? PS.camera.getZoomLevels().length - 1 : 7;

  return clamp((viewZoom - 1) / Math.max(1, maxZoom - 1), 0, 1);
};

PS.render.entities.shouldDrawLocalPresenceField = function () {
  return Boolean(
    isGlobeRenderMode() &&
    isPlanetLocalView() &&
    PS.render.entities.getPresenceZoomAmount() > 0
  );
};

PS.render.entities.getPresenceHash = function (entity, salt) {
  var idText = String(entity && entity.id !== undefined ? entity.id : "");
  var seed = (Number(entity && entity.x) || 0) * 97 + (Number(entity && entity.y) || 0) * 131 + (Number(salt) || 0) * 53;

  for (var i = 0; i < idText.length; i++) {
    seed += idText.charCodeAt(i) * (i + 17);
  }

  var raw = Math.sin(seed * 12.9898) * 43758.5453;
  return raw - Math.floor(raw);
};

PS.render.entities.getPresenceDensitySample = function (entity, family, sampleIndex) {
  var kind = String(family || "entity");
  var index = Math.max(0, Math.round(Number(sampleIndex) || 0));
  var amount = PS.render.entities.getPresenceZoomAmount();
  var radius = kind === "settlement" ? 18 : (kind === "resource" ? 10 : 7);
  var angle = PS.render.entities.getPresenceHash(entity, index + 1) * Math.PI * 2;
  var distance = (0.28 + PS.render.entities.getPresenceHash(entity, index + 23) * 0.72) * radius * (0.55 + amount);
  var size = kind === "settlement" ? 3.2 : (kind === "resource" ? 2.3 : 1.8);

  return {
    offsetX: Math.round(Math.cos(angle) * distance),
    offsetY: Math.round(Math.sin(angle) * distance),
    size: Math.max(1, size + amount * 2.2),
    alpha: kind === "settlement" ? 0.28 + amount * 0.22 : 0.18 + amount * 0.24
  };
};

PS.render.entities.isPresencePointVisible = function (point, margin) {
  if (!point || point.visible === false) {
    return false;
  }

  var edge = Number(margin) || 80;
  return point.x >= -edge &&
    point.y >= -edge &&
    point.x <= canvas.width + edge &&
    point.y <= canvas.height + edge;
};

PS.render.entities.drawPresenceSquare = function (point, sample, color) {
  var size = Math.max(1, Number(sample.size) || 1) * (point.scale || 1);

  ctx.fillStyle = PS.render.entities.getRgbaFromHex(color, clamp(sample.alpha, 0.02, 0.62));
  ctx.fillRect(
    Math.round(point.x + sample.offsetX * (point.scale || 1) - size / 2),
    Math.round(point.y + sample.offsetY * (point.scale || 1) - size / 2),
    Math.ceil(size),
    Math.ceil(size)
  );
};

PS.render.entities.drawEntityPresenceCluster = function (entity, family, color, count) {
  var point = PS.render.entities.getRenderPosition(entity, 1);

  if (!PS.render.entities.isPresencePointVisible(point, 96)) {
    return;
  }

  for (var i = 0; i < count; i++) {
    PS.render.entities.drawPresenceSquare(
      point,
      PS.render.entities.getPresenceDensitySample(entity, family, i),
      color
    );
  }
};

PS.render.entities.drawRouteTrafficMarks = function () {
  if (!Array.isArray(world.settlementRoutes)) {
    return;
  }

  for (var i = 0; i < world.settlementRoutes.length; i++) {
    var route = world.settlementRoutes[i];
    var parentSettlement = PS.render.entities.getSettlementById(route.parentSettlementId);
    var childSettlement = PS.render.entities.getSettlementById(route.childSettlementId);

    if (!parentSettlement || !childSettlement) {
      continue;
    }

    var parentPoint = PS.render.entities.getSettlementRenderPosition(parentSettlement);
    var childPoint = PS.render.entities.getSettlementRenderPosition(childSettlement);

    if (!parentPoint || !childPoint) {
      continue;
    }

    if (
      !PS.render.entities.isPresencePointVisible(parentPoint, 120) &&
      !PS.render.entities.isPresencePointVisible(childPoint, 120)
    ) {
      continue;
    }

    var lineageColor = PS.render.entities.getLineageColorById(route.lineageId || parentSettlement.lineageId);
    var scale = Math.max(parentPoint.scale || 1, childPoint.scale || 1, 1);
    var tickCount = route.isActive ? 7 : 4;
    var trafficAlpha = route.isActive ? 0.54 : 0.24;
    var corridorWidth = Math.max(3, Math.round((route.isActive ? 4 : 3) * scale));

    ctx.save();
    ctx.lineCap = "square";
    ctx.lineJoin = "round";
    ctx.strokeStyle = PS.render.entities.getRgbaFromHex("#050b10", route.isActive ? 0.64 : 0.40);
    ctx.lineWidth = corridorWidth + 3;
    ctx.beginPath();
    ctx.moveTo(parentPoint.x, parentPoint.y);
    ctx.lineTo(childPoint.x, childPoint.y);
    ctx.stroke();
    ctx.strokeStyle = PS.render.entities.getRgbaFromHex(lineageColor, route.isActive ? 0.42 : 0.22);
    ctx.lineWidth = corridorWidth;
    ctx.beginPath();
    ctx.moveTo(parentPoint.x, parentPoint.y);
    ctx.lineTo(childPoint.x, childPoint.y);
    ctx.stroke();

    for (var tick = 1; tick <= tickCount; tick++) {
      var amount = tick / (tickCount + 1);
      var x = parentPoint.x + (childPoint.x - parentPoint.x) * amount;
      var y = parentPoint.y + (childPoint.y - parentPoint.y) * amount;
      var size = Math.max(2, Math.round((route.isActive ? 4 : 2) * scale));

      ctx.fillStyle = PS.render.entities.getRgbaFromHex(tick % 2 === 0 ? "#d9b85f" : lineageColor, trafficAlpha);
      ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    }

    ctx.restore();
  }
};

PS.render.entities.getSettlementFootprintSamples = function (settlement) {
  var level = Math.max(1, Math.round(Number(settlement && settlement.level) || 1));
  var count = Math.min(14, 5 + level * 2 + (settlement && settlement.isColony ? 3 : 0));
  var samples = [];

  for (var i = 0; i < count; i++) {
    var spread = 9 + level * 3;
    var angle = PS.render.entities.getPresenceHash(settlement, i + 41) * Math.PI * 2;
    var distance = (0.20 + PS.render.entities.getPresenceHash(settlement, i + 67) * 0.80) * spread;
    var width = 3 + Math.round(PS.render.entities.getPresenceHash(settlement, i + 83) * (2 + level));
    var height = 3 + Math.round(PS.render.entities.getPresenceHash(settlement, i + 97) * (2 + level));

    samples.push({
      offsetX: Math.round(Math.cos(angle) * distance),
      offsetY: Math.round(Math.sin(angle) * distance),
      width: width,
      height: height,
      role: i % 5 === 0 ? "store" : (i % 3 === 0 ? "street" : "parcel")
    });
  }

  return samples;
};

PS.render.entities.drawSettlementFootprint = function (settlement) {
  var point = PS.render.entities.getSettlementRenderPosition(settlement);

  if (!PS.render.entities.isPresencePointVisible(point, 140)) {
    return;
  }

  var level = Math.max(1, Math.round(Number(settlement.level) || 1));
  var color = settlement.isActive
    ? PS.render.entities.getLineageColorById(settlement.lineageId)
    : "#d9d2c0";
  var samples = PS.render.entities.getSettlementFootprintSamples(settlement);
  var scale = point.scale || 1;
  var coreSize = Math.max(10, (12 + level * 4) * scale);
  var blockSize = Math.max(16, coreSize * (settlement.isColony ? 1.72 : 1.46));
  var streetWidth = Math.max(2, Math.round(2 * scale));

  ctx.save();
  ctx.fillStyle = PS.render.entities.getRgbaFromHex("#050b10", 0.44);
  ctx.fillRect(
    Math.round(point.x - blockSize * 0.56),
    Math.round(point.y - blockSize * 0.56),
    Math.round(blockSize * 1.12),
    Math.round(blockSize * 1.12)
  );
  ctx.fillStyle = PS.render.entities.getRgbaFromHex("#1b211d", 0.48);
  ctx.fillRect(
    Math.round(point.x - coreSize * 0.62),
    Math.round(point.y - coreSize * 0.62),
    Math.round(coreSize * 1.24),
    Math.round(coreSize * 1.24)
  );
  ctx.fillStyle = PS.render.entities.getRgbaFromHex("#b4ad98", settlement.isColony ? 0.34 : 0.24);
  ctx.fillRect(
    Math.round(point.x - blockSize * 0.48),
    Math.round(point.y - streetWidth / 2),
    Math.round(blockSize * 0.96),
    streetWidth
  );
  ctx.fillRect(
    Math.round(point.x - streetWidth / 2),
    Math.round(point.y - blockSize * 0.48),
    streetWidth,
    Math.round(blockSize * 0.96)
  );
  ctx.strokeStyle = PS.render.entities.getRgbaFromHex(color, settlement.isColony ? 0.74 : 0.54);
  ctx.lineWidth = Math.max(1, Math.round(scale));
  ctx.strokeRect(
    Math.round(point.x - blockSize * 0.58),
    Math.round(point.y - blockSize * 0.58),
    Math.round(blockSize * 1.16),
    Math.round(blockSize * 1.16)
  );

  for (var i = 0; i < samples.length; i++) {
    var sample = samples[i];
    var sampleWidth = Math.max(2, Math.round(sample.width * scale));
    var sampleHeight = Math.max(2, Math.round(sample.height * scale));
    var x = Math.round(point.x + sample.offsetX * scale - sampleWidth / 2);
    var y = Math.round(point.y + sample.offsetY * scale - sampleHeight / 2);

    ctx.fillStyle = sample.role === "store"
      ? PS.render.entities.getRgbaFromHex("#d9b85f", 0.62)
      : (sample.role === "street"
        ? PS.render.entities.getRgbaFromHex("#c8bea0", 0.52)
        : PS.render.entities.getRgbaFromHex(color, 0.48));
    ctx.fillRect(x, y, sampleWidth, sampleHeight);
  }

  ctx.fillStyle = PS.render.entities.getRgbaFromHex("#70f0d0", settlement.isColony ? 0.84 : 0.62);
  ctx.fillRect(
    Math.round(point.x - Math.max(2, scale * 2)),
    Math.round(point.y - Math.max(2, scale * 2)),
    Math.max(3, Math.round(scale * 4)),
    Math.max(3, Math.round(scale * 4))
  );

  ctx.restore();
};

PS.render.entities.drawSettlementFootprints = function () {
  if (!Array.isArray(world.settlements)) {
    return;
  }

  for (var i = 0; i < world.settlements.length; i++) {
    PS.render.entities.drawSettlementFootprint(world.settlements[i]);
  }
};

PS.render.entities.getProtoSettlementFootprints = function () {
  if (
    Array.isArray(world.settlements) &&
    world.settlements.length > 0
  ) {
    return [];
  }

  var summary = PS.sim &&
    PS.sim.settlements &&
    typeof PS.sim.settlements.earlyProgressionSummary === "function"
    ? PS.sim.settlements.earlyProgressionSummary()
    : null;
  var topLineage = summary && summary.topLineage ? summary.topLineage : null;
  var lineageId = topLineage ? Math.max(1, Math.round(Number(topLineage.id) || 1)) : 0;
  var organisms = lineageId > 0 && PS.sim && PS.sim.organisms && typeof PS.sim.organisms.byLineage === "function"
    ? PS.sim.organisms.byLineage(lineageId)
    : [];
  var activeCount = Math.max(0, Number(summary && summary.topActive) || organisms.length);
  var targetCount = Math.max(1, Number(summary && summary.populationTarget) || activeCount || 1);
  var progress = clamp(activeCount / targetCount, 0, 1);
  var footprints = [];

  if ((!organisms || organisms.length < 2 || activeCount <= 0) && Array.isArray(world.organisms)) {
    var activityCount = Math.min(4, world.organisms.length);

    for (var activityIndex = 0; activityIndex < activityCount; activityIndex++) {
      var organism = world.organisms[activityIndex];
      var organismLineageId = Math.max(1, Math.round(Number(organism.lineageId) || activityIndex + 1));

      footprints.push({
        id: "lineage-forage:" + organismLineageId + ":" + activityIndex,
        x: organism.x,
        y: organism.y,
        lineageId: organismLineageId,
        progress: clamp(0.18 + (Number(summary && summary.activeLineages) || activityCount) / Math.max(8, targetCount) * 0.18, 0.18, 0.42),
        activeCount: 1
      });
    }

    return footprints;
  }

  var centerX = 0;
  var centerY = 0;

  for (var i = 0; i < organisms.length; i++) {
    centerX += Number(organisms[i].x) || 0;
    centerY += Number(organisms[i].y) || 0;
  }

  centerX /= organisms.length;
  centerY /= organisms.length;

  var anchor = {
    id: "proto-settlement:" + lineageId,
    x: centerX,
    y: centerY,
    lineageId: lineageId,
    progress: progress,
    activeCount: activeCount
  };

  footprints.push(anchor);

  if (progress > 0.55 && organisms.length >= 5) {
    footprints.push({
      id: "proto-forage-ring:" + lineageId,
      x: clamp(centerX + (PS.render.entities.getPresenceHash(anchor, 7) - 0.5) * 7, 0, WORLD_WIDTH - 1),
      y: clamp(centerY + (PS.render.entities.getPresenceHash(anchor, 11) - 0.5) * 5, 0, WORLD_HEIGHT - 1),
      lineageId: lineageId,
      progress: progress * 0.72,
      activeCount: activeCount
    });
  }

  return footprints;
};

PS.render.entities.drawProtoSettlementFootprint = function (footprint) {
  var point = PS.render.entities.getRenderPosition(footprint, 1);

  if (!PS.render.entities.isPresencePointVisible(point, 120)) {
    return;
  }

  var progress = clamp(Number(footprint.progress) || 0, 0, 1);
  var color = PS.render.entities.getLineageColorById(footprint.lineageId);
  var size = Math.max(18, (24 + progress * 30) * (point.scale || 1));
  var cellSize = Math.max(4, Math.round(size * 0.16));

  ctx.save();
  ctx.strokeStyle = PS.render.entities.getRgbaFromHex(color, 0.32 + progress * 0.34);
  ctx.lineWidth = Math.max(1, Math.round(size * 0.05));
  ctx.setLineDash([Math.max(2, cellSize * 2), Math.max(2, cellSize)]);
  ctx.strokeRect(
    Math.round(point.x - size / 2),
    Math.round(point.y - size / 2),
    Math.round(size),
    Math.round(size)
  );
  ctx.setLineDash([]);
  ctx.fillStyle = PS.render.entities.getRgbaFromHex("#d9b85f", 0.54 + progress * 0.28);
  ctx.fillRect(
    Math.round(point.x - cellSize * 1.5),
    Math.round(point.y - cellSize * 1.5),
    cellSize * 3,
    cellSize * 3
  );
  ctx.fillStyle = PS.render.entities.getRgbaFromHex("#70f0d0", 0.34 + progress * 0.24);
  ctx.fillRect(
    Math.round(point.x + cellSize * 1.5),
    Math.round(point.y - cellSize * 2.5),
    Math.max(2, Math.round(cellSize * 1.25)),
    Math.max(2, Math.round(cellSize * 1.25))
  );

  for (var i = 0; i < 9; i++) {
    var sample = PS.render.entities.getPresenceDensitySample(footprint, "settlement", i);
    var x = point.x + sample.offsetX * (point.scale || 1);
    var y = point.y + sample.offsetY * (point.scale || 1);

    ctx.fillStyle = i % 3 === 0
      ? PS.render.entities.getRgbaFromHex("#d9b85f", 0.32 + progress * 0.28)
      : PS.render.entities.getRgbaFromHex(color, 0.24 + progress * 0.24);
    ctx.fillRect(
      Math.round(x - cellSize / 2),
      Math.round(y - cellSize / 2),
      cellSize,
      Math.max(1, Math.round(cellSize * (i % 2 === 0 ? 1.5 : 1)))
    );
  }

  ctx.restore();
};

PS.render.entities.drawProtoSettlementFootprints = function () {
  var footprints = PS.render.entities.getProtoSettlementFootprints();

  for (var i = 0; i < footprints.length; i++) {
    PS.render.entities.drawProtoSettlementFootprint(footprints[i]);
  }
};

PS.render.entities.drawLocalPresenceField = function () {
  if (!PS.render.entities.shouldDrawLocalPresenceField()) {
    return;
  }

  var zoomAmount = PS.render.entities.getPresenceZoomAmount();
  var resourceCount = 3 + Math.round(zoomAmount * 3);
  var organismCount = 2 + Math.round(zoomAmount * 2);

  for (var foodIndex = 0; Array.isArray(world.food) && foodIndex < world.food.length; foodIndex++) {
    PS.render.entities.drawResourcePresencePatch(world.food[foodIndex]);
    PS.render.entities.drawEntityPresenceCluster(world.food[foodIndex], "resource", "#58f06c", resourceCount);
  }

  for (var organismIndex = 0; Array.isArray(world.organisms) && organismIndex < world.organisms.length; organismIndex++) {
    PS.render.entities.drawOrganismActivityTrail(world.organisms[organismIndex]);
    PS.render.entities.drawEntityPresenceCluster(
      world.organisms[organismIndex],
      "organism",
      PS.render.entities.getOrganismColor(world.organisms[organismIndex]),
      organismCount
    );
  }

  PS.render.entities.drawSettlementFootprints();

  for (var settlementIndex = 0; Array.isArray(world.settlements) && settlementIndex < world.settlements.length; settlementIndex++) {
    var settlement = world.settlements[settlementIndex];
    var settlementColor = settlement.isActive ? PS.render.entities.getLineageColorById(settlement.lineageId) : "#d9d2c0";
    PS.render.entities.drawEntityPresenceCluster(settlement, "settlement", settlementColor, 7);
  }

  PS.render.entities.drawProtoSettlementFootprints();
  PS.render.entities.drawRouteTrafficMarks();
};
