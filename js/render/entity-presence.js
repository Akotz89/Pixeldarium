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

    if (
      !PS.render.entities.isPresencePointVisible(parentPoint, 120) &&
      !PS.render.entities.isPresencePointVisible(childPoint, 120)
    ) {
      continue;
    }

    var lineageColor = PS.render.entities.getLineageColorById(route.lineageId || parentSettlement.lineageId);
    var tickCount = route.isActive ? 5 : 3;

    for (var tick = 1; tick <= tickCount; tick++) {
      var amount = tick / (tickCount + 1);
      var x = parentPoint.x + (childPoint.x - parentPoint.x) * amount;
      var y = parentPoint.y + (childPoint.y - parentPoint.y) * amount;
      var size = route.isActive ? 3 : 2;

      ctx.fillStyle = PS.render.entities.getRgbaFromHex(lineageColor, route.isActive ? 0.46 : 0.22);
      ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    }
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
    PS.render.entities.drawEntityPresenceCluster(world.food[foodIndex], "resource", "#58f06c", resourceCount);
  }

  for (var organismIndex = 0; Array.isArray(world.organisms) && organismIndex < world.organisms.length; organismIndex++) {
    PS.render.entities.drawEntityPresenceCluster(
      world.organisms[organismIndex],
      "organism",
      PS.render.entities.getOrganismColor(world.organisms[organismIndex]),
      organismCount
    );
  }

  for (var settlementIndex = 0; Array.isArray(world.settlements) && settlementIndex < world.settlements.length; settlementIndex++) {
    var settlement = world.settlements[settlementIndex];
    var settlementColor = settlement.isActive ? PS.render.entities.getLineageColorById(settlement.lineageId) : "#d9d2c0";
    PS.render.entities.drawEntityPresenceCluster(settlement, "settlement", settlementColor, 7);
  }

  PS.render.entities.drawRouteTrafficMarks();
};
