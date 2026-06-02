PS.render = PS.render || {};
PS.render.overlays = PS.render.overlays || {};
PS.render.overlays.registry = PS.render.overlays.registry || {};
PS.render.overlays.order = PS.render.overlays.order || [];

PS.render.overlays.register = function (id, overlay) {
  var overlayId = String(id || "").trim();

  if (!overlayId) {
    throw new Error("Overlay id is required");
  }

  PS.render.overlays.registry[overlayId] = overlay || {};

  if (PS.render.overlays.order.indexOf(overlayId) < 0) {
    PS.render.overlays.order.push(overlayId);
  }

  PS.render.overlays.order.sort(function (a, b) {
    var left = Number(PS.render.overlays.registry[a] && PS.render.overlays.registry[a].order) || 0;
    var right = Number(PS.render.overlays.registry[b] && PS.render.overlays.registry[b].order) || 0;
    return left - right;
  });
  return PS.render.overlays.registry[overlayId];
};

PS.render.overlays.get = function (id) {
  return PS.render.overlays.registry[String(id || "")] || null;
};

PS.render.overlays.getManifest = function () {
  return PS.render.overlays.order.map(function (id) {
    var overlay = PS.render.overlays.registry[id] || {};
    return {
      id: id,
      family: overlay.family || "overlays",
      semantic: overlay.semantic || "overlay",
      order: overlay.order || 0,
      blendMode: overlay.blendMode || "source-over",
      shortcut: overlay.shortcut || ""
    };
  });
};

PS.render.overlays.drawRegistered = function () {
  for (var i = 0; i < PS.render.overlays.order.length; i++) {
    var overlayId = PS.render.overlays.order[i];
    var overlay = PS.render.overlays.registry[PS.render.overlays.order[i]];

    if (overlay && overlay.enabled !== false && typeof overlay.draw === "function") {
      var previousComposite = ctx.globalCompositeOperation;
      var previousAlpha = ctx.globalAlpha;
      var startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
      var stats = null;

      ctx.globalCompositeOperation = overlay.blendMode || "source-over";
      ctx.globalAlpha = Number.isFinite(Number(overlay.alpha)) ? Number(overlay.alpha) : 1;
      overlay.draw();
      ctx.globalCompositeOperation = previousComposite;
      ctx.globalAlpha = previousAlpha;

      if (
        world.activeObservationOverlay === overlayId &&
        !(
          PS.render.webglGlobe &&
          PS.render.webglGlobe.state &&
          PS.render.webglGlobe.state.lastUsedObservationOverlay === overlayId &&
          PS.render.webglGlobe.state.lastUsedFallback === false
        )
      ) {
        stats = world.overlayPerformance || {};
        stats.active = overlayId;
        stats.lastFrameMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt;
        stats.lastSampleCount = Number(overlay.lastSampleCount) || 0;
        stats.blendMode = overlay.blendMode || "source-over";
        stats.compositor = "canvas";
        world.overlayPerformance = stats;
      }
    }
  }
};

PS.render.overlays.drawReferenceGrid = function () {
  return PS.render.reference.draw();
};

PS.render.overlays.drawLocalReferenceGrid = function () {
  return PS.render.reference.drawLocalGrid();
};

PS.render.overlays.drawScaleBar = function () {
  return PS.render.reference.drawScaleBar();
};

PS.render.overlays.drawCurvature = function () {
  return PS.render.reference.drawLocalCurvature();
};

PS.render.overlays.drawInspectSelection = function () {
  if (!world.inspectedTile) {
    return;
  }

  var point = PS.render.entities.getTileRenderPosition(world.inspectedTile.x, world.inspectedTile.y);

  if (!point) {
    return;
  }

  var size = Math.max(5, CONFIG.TILE_SIZE * 2.4 * (point.scale || 1));

  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  ctx.beginPath();
  ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();
};

PS.render.overlays.drawScanlines = function () {
  if (!CONFIG.SHOW_SCANLINES && !CONFIG.PLANET_DEBUG_OVERLAY) {
    return;
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.025)";

  for (var y = 0; y < canvas.height; y += CONFIG.TILE_SIZE * 8) {
    ctx.fillRect(0, y, canvas.width, 1);
  }
};

PS.render.overlays.drawOrbitalAssets = function () {
  if (!Array.isArray(world.orbitalAssets) || world.orbitalAssets.length === 0) {
    return;
  }

  var centerX = canvas.width - 92;
  var centerY = 84;
  var platformReady = Boolean(world.orbitalPlatformReady);

  ctx.beginPath();
  ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
  ctx.strokeStyle = platformReady ? "rgba(255, 255, 255, 0.42)" : "rgba(114, 215, 255, 0.28)";
  ctx.lineWidth = platformReady ? 2 : 1;
  ctx.setLineDash([4, 6]);
  ctx.stroke();
  ctx.setLineDash([]);

  for (var i = 0; i < world.orbitalAssets.length; i++) {
    var asset = world.orbitalAssets[i];

    if (!asset.isActive) {
      continue;
    }

    var angle = ((asset.orbitAngle + world.tick * 0.08) % 360) * Math.PI / 180;
    var radius = 28 + Math.max(1, Math.round(Number(asset.orbitBand) || 1)) * 8;
    var assetX = centerX + Math.cos(angle) * radius;
    var assetY = centerY + Math.sin(angle) * radius;
    var assetSize = platformReady ? 5 : 4;

    ctx.fillStyle = platformReady ? "#ffffff" : "#72d7ff";
    ctx.fillRect(assetX - assetSize / 2, assetY - assetSize / 2, assetSize, assetSize);
  }
};

PS.render.overlays.drawPlanetaryBodies = function () {
  if (!Array.isArray(world.planetaryBodies) || world.planetaryBodies.length === 0) {
    return;
  }

  var centerX = canvas.width - 92;
  var centerY = 84;
  var interplanetary = world.era === "Interplanetary";

  for (var i = 0; i < world.planetaryBodies.length; i++) {
    var body = world.planetaryBodies[i];
    var angle = ((body.orbitAngle + world.tick * 0.02) % 360) * Math.PI / 180;
    var radius = Math.max(1, Math.round(Number(body.orbitRadius) || 64)) * 0.72;
    var bodyX = centerX + Math.cos(angle) * radius;
    var bodyY = centerY + Math.sin(angle) * radius;
    var size = interplanetary ? 7 : 5;

    ctx.beginPath();
    ctx.arc(bodyX, bodyY, size, 0, Math.PI * 2);
    ctx.fillStyle = interplanetary ? "rgba(112, 240, 208, 0.92)" : "rgba(242, 184, 91, 0.88)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.38)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
};

PS.render.overlays.drawProbeMissions = function () {
  if (!Array.isArray(world.probeMissions) || world.probeMissions.length === 0) {
    return;
  }

  var centerX = canvas.width - 92;
  var centerY = 84;

  for (var i = 0; i < world.probeMissions.length; i++) {
    var mission = world.probeMissions[i];
    var targetBody = typeof getPlanetaryBodyById === "function" ? getPlanetaryBodyById(mission.targetBodyId) : null;

    if (!targetBody) {
      continue;
    }

    var angle = ((targetBody.orbitAngle + world.tick * 0.02) % 360) * Math.PI / 180;
    var radius = Math.max(1, Math.round(Number(targetBody.orbitRadius) || 64)) * 0.72;
    var targetX = centerX + Math.cos(angle) * radius;
    var targetY = centerY + Math.sin(angle) * radius;
    var progress = Math.max(0, Math.min(1, Number(mission.progress) || 0));
    var probeX = centerX + (targetX - centerX) * progress;
    var probeY = centerY + (targetY - centerY) * progress;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(targetX, targetY);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = mission.isComplete ? "#70f0d0" : "#ffffff";
    ctx.fillRect(probeX - 2, probeY - 2, 4, 4);
  }
};

PS.render.overlays.drawStarSystems = function () {
  if (!Array.isArray(world.starSystems) || world.starSystems.length === 0) {
    return;
  }

  var centerX = canvas.width - 92;
  var centerY = 84;
  var mapRadius = 88;
  var galacticMap = world.era === "Galactic Map" || world.era === "Galactic Influence" || world.era === "Proto-Empire";
  var empireEra = world.era === "Galactic Influence" || world.era === "Proto-Empire";

  ctx.beginPath();
  ctx.arc(centerX, centerY, mapRadius, 0, Math.PI * 2);
  ctx.strokeStyle = empireEra ? "rgba(255, 242, 107, 0.42)" : (galacticMap ? "rgba(200, 132, 255, 0.34)" : "rgba(255, 255, 255, 0.16)");
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 10]);
  ctx.stroke();
  ctx.setLineDash([]);

  for (var i = 0; i < world.starSystems.length; i++) {
    var system = world.starSystems[i];

    if (!system.isMapped) {
      continue;
    }

    var starX = centerX + system.mapX * mapRadius;
    var starY = centerY + system.mapY * mapRadius;
    var claimed = Boolean(system.isClaimed);
    var size = claimed ? 8 : (galacticMap ? 5 : 4);

    if (claimed) {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(starX, starY);
      ctx.strokeStyle = world.era === "Proto-Empire" ? "rgba(255, 242, 107, 0.36)" : "rgba(112, 240, 208, 0.30)";
      ctx.lineWidth = world.era === "Proto-Empire" ? 2 : 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(starX, starY, 9, 0, Math.PI * 2);
      ctx.fillStyle = world.era === "Proto-Empire" ? "rgba(255, 242, 107, 0.18)" : "rgba(112, 240, 208, 0.16)";
      ctx.fill();
    }

    ctx.fillStyle = claimed ? (world.era === "Proto-Empire" ? "#fff26b" : "#70f0d0") : (galacticMap ? "#c884ff" : "#ffffff");
    ctx.fillRect(starX - size / 2, starY - size / 2, size, size);
  }
};

PS.render.overlays.getStarSystemById = function (systemId) {
  if (typeof getStarSystemById === "function") {
    return getStarSystemById(systemId);
  }

  if (!Array.isArray(world.starSystems)) {
    return null;
  }

  for (var i = 0; i < world.starSystems.length; i++) {
    if (world.starSystems[i].id === systemId) {
      return world.starSystems[i];
    }
  }

  return null;
};

PS.render.overlays.drawEmpireSectors = function () {
  if (!Array.isArray(world.empireSectors) || world.empireSectors.length === 0) {
    return;
  }

  var centerX = canvas.width - 92;
  var centerY = 84;
  var mapRadius = 88;
  var galacticEmpire = world.era === "Galactic Empire" || world.era === "Ascendant Empire";

  for (var i = 0; i < world.empireSectors.length; i++) {
    var sector = world.empireSectors[i];
    var system = PS.render.overlays.getStarSystemById(sector.systemId);

    if (!system) {
      continue;
    }

    var sectorX = centerX + system.mapX * mapRadius;
    var sectorY = centerY + system.mapY * mapRadius;
    var sectorRadius = Math.max(8, Math.round((Number(sector.controlRadius) || 0.18) * mapRadius));

    ctx.beginPath();
    ctx.arc(sectorX, sectorY, sectorRadius, 0, Math.PI * 2);
    ctx.fillStyle = galacticEmpire ? "rgba(255, 242, 107, 0.14)" : "rgba(200, 132, 255, 0.12)";
    ctx.fill();
    ctx.strokeStyle = galacticEmpire ? "rgba(255, 242, 107, 0.44)" : "rgba(200, 132, 255, 0.34)";
    ctx.lineWidth = galacticEmpire ? 2 : 1;
    ctx.stroke();
  }
};

PS.render.overlays.drawEmpireLegacy = function () {
  if (Math.max(0, Math.round(Number(world.empireLegacyLevel) || 0)) <= 0) {
    return;
  }

  var centerX = canvas.width - 92;
  var centerY = 84;
  var legacyLevel = Math.max(0, Math.round(Number(world.empireLegacyLevel) || 0));
  var legacyComplete = Boolean(world.empireLegacyComplete) || world.era === "Ascendant Empire";
  var ringCount = Math.min(4, legacyLevel + 1);

  for (var i = 0; i < ringCount; i++) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20 + i * 14, 0, Math.PI * 2);
    ctx.strokeStyle = legacyComplete ? "rgba(255, 242, 107, 0.42)" : "rgba(112, 240, 208, 0.28)";
    ctx.lineWidth = legacyComplete ? 2 : 1;
    ctx.setLineDash(i % 2 === 0 ? [] : [3, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.fillStyle = legacyComplete ? "#fff26b" : "#70f0d0";
  ctx.fillRect(centerX - 4, centerY - 4, 8, 8);
};

PS.render.overlays.drawInterstellarFleets = function () {
  if (!Array.isArray(world.interstellarFleets) || world.interstellarFleets.length === 0) {
    return;
  }

  var centerX = canvas.width - 92;
  var centerY = 84;
  var mapRadius = 88;
  var empireNetwork = world.era === "Empire Network";

  for (var i = 0; i < world.interstellarFleets.length; i++) {
    var fleet = world.interstellarFleets[i];
    var sourceSystem = PS.render.overlays.getStarSystemById(fleet.sourceSystemId);
    var targetSystem = PS.render.overlays.getStarSystemById(fleet.targetSystemId);

    if (!sourceSystem || !targetSystem) {
      continue;
    }

    var sourceX = centerX + sourceSystem.mapX * mapRadius;
    var sourceY = centerY + sourceSystem.mapY * mapRadius;
    var targetX = centerX + targetSystem.mapX * mapRadius;
    var targetY = centerY + targetSystem.mapY * mapRadius;
    var progress = Math.max(0, Math.min(1, Number(fleet.progress) || 0));
    var fleetX = sourceX + (targetX - sourceX) * progress;
    var fleetY = sourceY + (targetY - sourceY) * progress;
    var fleetSize = fleet.isComplete ? 5 : 4;

    ctx.beginPath();
    ctx.moveTo(sourceX, sourceY);
    ctx.lineTo(targetX, targetY);
    ctx.strokeStyle = fleet.isComplete ? (empireNetwork ? "rgba(255, 242, 107, 0.34)" : "rgba(112, 240, 208, 0.26)") : "rgba(255, 255, 255, 0.20)";
    ctx.lineWidth = fleet.isComplete && empireNetwork ? 2 : 1;
    ctx.setLineDash(fleet.isComplete ? [] : [3, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = fleet.isComplete ? (empireNetwork ? "#fff26b" : "#70f0d0") : "#ffffff";
    ctx.fillRect(fleetX - fleetSize / 2, fleetY - fleetSize / 2, fleetSize, fleetSize);
  }
};

PS.render.overlays.rebuildShaders = function () {};
PS.render.overlays.rebuildTextures = function () {};
