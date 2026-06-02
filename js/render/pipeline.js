PS.render = PS.render || {};
PS.render.pipeline = PS.render.pipeline || {};
PS.render.pipeline.layers = PS.render.pipeline.layers || [];

PS.render.pipeline.registerLayer = function (id, layer) {
  var layerId = String(id || "").trim();
  var nextLayer = layer || {};

  if (!layerId) {
    throw new Error("Render layer id is required");
  }

  nextLayer.id = layerId;

  for (var i = 0; i < PS.render.pipeline.layers.length; i++) {
    if (PS.render.pipeline.layers[i].id === layerId) {
      PS.render.pipeline.layers[i] = nextLayer;
      return nextLayer;
    }
  }

  PS.render.pipeline.layers.push(nextLayer);
  PS.render.pipeline.layers.sort(function (a, b) {
    return (Number(a.order) || 0) - (Number(b.order) || 0);
  });
  return nextLayer;
};

PS.render.pipeline.getZoomBand = function (zoomLevel) {
  var zoom = Number.isFinite(Number(zoomLevel)) ? Number(zoomLevel) : Number(world && world.planetView && world.planetView.zoomLevel) || 0;

  if (zoom < 1) {
    return "orbit";
  }

  if (zoom < 4) {
    return "planet";
  }

  if (zoom < 7) {
    return "continent";
  }

  if (zoom < 10) {
    return "region";
  }

  if (zoom < 13) {
    return "local";
  }

  return "settlement";
};

PS.render.pipeline.getLayerManifest = function () {
  return PS.render.pipeline.layers.map(function (layer) {
    return {
      id: layer.id,
      order: layer.order,
      family: layer.family,
      semantic: layer.semantic,
      minBand: layer.minBand || "orbit",
      maxBand: layer.maxBand || "settlement"
    };
  });
};

PS.render.pipeline.drawLayer = function (layer) {
  if (layer && typeof layer.draw === "function") {
    layer.draw();
  }
};

PS.render.pipeline.drawWorld = function () {
  for (var i = 0; i < PS.render.pipeline.layers.length; i++) {
    PS.render.pipeline.drawLayer(PS.render.pipeline.layers[i]);
  }
};

PS.render.pipeline.rebuildShaders = function () {};

PS.render.pipeline.rebuildTextures = function () {};

PS.render.rebuildShaders = function () {
  var subsystems = PS.render.getSubsystems();

  for (var i = 0; i < subsystems.length; i++) {
    if (typeof subsystems[i].rebuildShaders === "function") {
      subsystems[i].rebuildShaders();
    }
  }
};

PS.render.rebuildTextures = function () {
  var subsystems = PS.render.getSubsystems();

  for (var i = 0; i < subsystems.length; i++) {
    if (typeof subsystems[i].rebuildTextures === "function") {
      subsystems[i].rebuildTextures();
    }
  }
};

PS.render.getSubsystems = function () {
  return [
    PS.camera,
    PS.render.globe,
    PS.render.lod,
    PS.render.webglGlobe,
    PS.render.raster,
    PS.render.terrain,
    PS.render.surfaceRender,
    PS.render.surfaceStreaming,
    PS.render.entities,
    PS.render.reference,
    PS.render.overlays,
    PS.render.atmosphere,
    PS.render.pipeline
  ];
};

PS.render.pipeline.registerLayer("terrain.base", {
  order: 20,
  family: "terrain",
  semantic: "base terrain, biome, elevation, water, and local surface materials",
  draw: function () { PS.render.terrain.draw(); }
});

PS.render.pipeline.registerLayer("overlays.reference", {
  order: 40,
  family: "overlays",
  semantic: "scale, grid, and camera orientation",
  draw: function () { PS.render.overlays.drawReferenceGrid(); }
});

PS.render.pipeline.registerLayer("settlement.influence", {
  order: 50,
  family: "settlement",
  semantic: "claimed land and borders",
  draw: function () { PS.render.entities.drawSettlementInfluence(); }
});

PS.render.pipeline.registerLayer("settlement.routes", {
  order: 60,
  family: "settlement",
  semantic: "routes, paths, and supply links",
  draw: function () { PS.render.entities.drawSettlementRoutes(); }
});

PS.render.pipeline.registerLayer("resources.food", {
  order: 70,
  family: "resources",
  semantic: "food and resource objects",
  draw: function () { PS.render.entities.drawFood(); }
});

PS.render.pipeline.registerLayer("settlement.structures", {
  order: 80,
  family: "settlement",
  semantic: "settlement cores, outposts, and colonies",
  draw: function () { PS.render.entities.drawSettlements(); }
});

PS.render.pipeline.registerLayer("entities.organisms", {
  order: 90,
  family: "entities",
  semantic: "living organisms and later citizens",
  draw: function () { PS.render.entities.drawOrganisms(); }
});

PS.render.pipeline.registerLayer("world.space", {
  order: 100,
  family: "world",
  semantic: "orbital assets, bodies, probes, sectors, fleets, and star maps",
  draw: function () {
    PS.render.overlays.drawOrbitalAssets();
    PS.render.overlays.drawPlanetaryBodies();
    PS.render.overlays.drawProbeMissions();
    PS.render.overlays.drawEmpireSectors();
    PS.render.overlays.drawInterstellarFleets();
    PS.render.overlays.drawEmpireLegacy();
    PS.render.overlays.drawStarSystems();
  }
});

PS.render.pipeline.registerLayer("status.selection", {
  order: 120,
  family: "icons",
  semantic: "selection rings, status icons, warnings, and scanlines",
  draw: function () {
    PS.render.overlays.drawInspectSelection();
    PS.render.overlays.drawRegistered();
    PS.render.overlays.drawScanlines();
  }
});
