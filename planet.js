// Pixel Sim Engine - planet.js
// Earth-scale projection helpers for the planet-sized simulation map.

function getPlanetRadiusKm() {
  return Math.max(1, Number(CONFIG.PLANET_RADIUS_KM) || 6371);
}

function getPlanetCircumferenceKm() {
  return 2 * Math.PI * getPlanetRadiusKm();
}

function getPlanetPoleToPoleKm() {
  return Math.PI * getPlanetRadiusKm();
}

function getPlanetEquatorKmPerTile() {
  return getPlanetCircumferenceKm() / Math.max(1, WORLD_WIDTH);
}

function getPlanetMeridianKmPerTile() {
  return getPlanetPoleToPoleKm() / Math.max(1, WORLD_HEIGHT);
}

function getPlanetLatitudeForTile(y) {
  return 90 - ((Math.max(0, Number(y) || 0) + 0.5) / Math.max(1, WORLD_HEIGHT)) * 180;
}

function getPlanetLongitudeForTile(x) {
  return ((Math.max(0, Number(x) || 0) + 0.5) / Math.max(1, WORLD_WIDTH)) * 360 - 180;
}

function getPlanetLatitudeScale(latitude) {
  return Math.max(0.08, Math.cos((Number(latitude) || 0) * Math.PI / 180));
}

function isGlobeRenderMode() {
  return CONFIG.PLANET_RENDER_MODE === "globe";
}

function getPlanetProjection() {
  var radius = Math.floor(Math.min(canvas.width, canvas.height) * 0.46);

  return {
    centerX: canvas.width / 2,
    centerY: canvas.height / 2,
    radius: radius,
    viewLongitudeDeg: Number(CONFIG.PLANET_VIEW_LONGITUDE_DEG) || 0,
    viewLatitudeDeg: Number(CONFIG.PLANET_VIEW_LATITUDE_DEG) || 0
  };
}

function wrapPlanetLongitudeDelta(degrees) {
  var delta = Number(degrees) || 0;

  while (delta < -180) {
    delta += 360;
  }

  while (delta > 180) {
    delta -= 360;
  }

  return delta;
}

function projectPlanetPoint(longitudeDeg, latitudeDeg) {
  var projection = getPlanetProjection();
  var latitude = (Number(latitudeDeg) || 0) * Math.PI / 180;
  var centerLatitude = projection.viewLatitudeDeg * Math.PI / 180;
  var longitudeDelta = wrapPlanetLongitudeDelta(
    (Number(longitudeDeg) || 0) - projection.viewLongitudeDeg
  ) * Math.PI / 180;
  var visibility =
    Math.sin(centerLatitude) * Math.sin(latitude) +
    Math.cos(centerLatitude) * Math.cos(latitude) * Math.cos(longitudeDelta);

  if (visibility <= 0) {
    return null;
  }

  return {
    x: projection.centerX + projection.radius * Math.cos(latitude) * Math.sin(longitudeDelta),
    y: projection.centerY - projection.radius * (
      Math.cos(centerLatitude) * Math.sin(latitude) -
      Math.sin(centerLatitude) * Math.cos(latitude) * Math.cos(longitudeDelta)
    ),
    scale: clamp(0.22 + visibility * 0.78, 0.22, 1),
    visibility: visibility,
    visible: true
  };
}

function getPlanetTileProjection(x, y) {
  var tile = getPlanetTile(
    clamp(Math.floor(Number(x) || 0), 0, WORLD_WIDTH - 1),
    clamp(Math.floor(Number(y) || 0), 0, WORLD_HEIGHT - 1)
  );

  if (!tile) {
    return null;
  }

  var projection = projectPlanetPoint(tile.longitude, tile.latitude);

  if (!projection) {
    return null;
  }

  projection.tile = tile;
  return projection;
}

function getPlanetInterpolatedProjection(x, y) {
  var tileX = clamp(Number(x) || 0, 0, WORLD_WIDTH - 1);
  var tileY = clamp(Number(y) || 0, 0, WORLD_HEIGHT - 1);
  var longitude = ((tileX + 0.5) / Math.max(1, WORLD_WIDTH)) * 360 - 180;
  var latitude = 90 - ((tileY + 0.5) / Math.max(1, WORLD_HEIGHT)) * 180;

  return projectPlanetPoint(longitude, latitude);
}

function getPlanetTileFromCanvasPoint(canvasX, canvasY) {
  if (!isGlobeRenderMode()) {
    return {
      x: clamp(Math.floor(canvasX / CONFIG.TILE_SIZE), 0, WORLD_WIDTH - 1),
      y: clamp(Math.floor(canvasY / CONFIG.TILE_SIZE), 0, WORLD_HEIGHT - 1)
    };
  }

  var projection = getPlanetProjection();
  var normalizedX = (canvasX - projection.centerX) / projection.radius;
  var normalizedYNorth = -(canvasY - projection.centerY) / projection.radius;
  var rho = Math.sqrt(normalizedX * normalizedX + normalizedYNorth * normalizedYNorth);

  if (rho > 1) {
    return null;
  }

  if (rho === 0) {
    return {
      x: clamp(Math.floor(((projection.viewLongitudeDeg + 180) / 360) * WORLD_WIDTH), 0, WORLD_WIDTH - 1),
      y: clamp(Math.floor(((90 - projection.viewLatitudeDeg) / 180) * WORLD_HEIGHT), 0, WORLD_HEIGHT - 1)
    };
  }

  var centerLatitude = projection.viewLatitudeDeg * Math.PI / 180;
  var centerLongitude = projection.viewLongitudeDeg * Math.PI / 180;
  var angularDistance = Math.asin(rho);
  var latitude = Math.asin(
    Math.cos(angularDistance) * Math.sin(centerLatitude) +
    (normalizedYNorth * Math.sin(angularDistance) * Math.cos(centerLatitude)) / rho
  );
  var longitude = centerLongitude + Math.atan2(
    normalizedX * Math.sin(angularDistance),
    rho * Math.cos(centerLatitude) * Math.cos(angularDistance) -
      normalizedYNorth * Math.sin(centerLatitude) * Math.sin(angularDistance)
  );
  var longitudeDeg = ((longitude * 180 / Math.PI + 540) % 360) - 180;
  var latitudeDeg = clamp(latitude * 180 / Math.PI, -90, 90);

  return {
    x: clamp(Math.floor(((longitudeDeg + 180) / 360) * WORLD_WIDTH), 0, WORLD_WIDTH - 1),
    y: clamp(Math.floor(((90 - latitudeDeg) / 180) * WORLD_HEIGHT), 0, WORLD_HEIGHT - 1)
  };
}

function getPlanetTileAreaKm2(latitude) {
  var latitudeCenter = clamp(Number(latitude) || 0, -90, 90);
  var latitudeStep = 180 / Math.max(1, WORLD_HEIGHT);
  var longitudeStep = (360 / Math.max(1, WORLD_WIDTH)) * Math.PI / 180;
  var northLatitude = clamp(latitudeCenter + latitudeStep / 2, -90, 90) * Math.PI / 180;
  var southLatitude = clamp(latitudeCenter - latitudeStep / 2, -90, 90) * Math.PI / 180;
  var radius = getPlanetRadiusKm();

  return radius * radius * longitudeStep * Math.abs(Math.sin(northLatitude) - Math.sin(southLatitude));
}

function getPlanetTile(x, y) {
  if (!Array.isArray(world.planetTiles)) {
    return null;
  }

  return world.planetTiles[getTileIndex(x, y)] || null;
}

function getPlanetTileBiome(x, y) {
  var tile = getPlanetTile(x, y);
  return tile ? tile.biome : "unknown";
}

function makePlanetTile(x, y, biome, fertilityScore, moisture, elevation) {
  var latitude = getPlanetLatitudeForTile(y);
  return {
    x: x,
    y: y,
    latitude: latitude,
    longitude: getPlanetLongitudeForTile(x),
    areaKm2: getPlanetTileAreaKm2(latitude),
    biome: biome,
    fertilityScore: fertilityScore,
    moisture: moisture,
    elevation: elevation
  };
}

function refreshPlanetSummary() {
  var landTiles = 0;
  var waterTiles = 0;
  var fertileTiles = 0;
  var totalAreaKm2 = 0;

  if (Array.isArray(world.planetTiles)) {
    for (var i = 0; i < world.planetTiles.length; i++) {
      var tile = world.planetTiles[i];

      if (!tile) {
        continue;
      }

      totalAreaKm2 += Math.max(0, Number(tile.areaKm2) || 0);

      if (tile.biome === "ocean") {
        waterTiles++;
      } else {
        landTiles++;
      }
    }
  }

  fertileTiles = Math.max(0, Number(world.fertileTiles) || 0);
  world.planetSummary = {
    name: CONFIG.PLANET_NAME || "Earth",
    radiusKm: getPlanetRadiusKm(),
    circumferenceKm: getPlanetCircumferenceKm(),
    poleToPoleKm: getPlanetPoleToPoleKm(),
    equatorKmPerTile: getPlanetEquatorKmPerTile(),
    meridianKmPerTile: getPlanetMeridianKmPerTile(),
    totalAreaKm2: totalAreaKm2,
    landTiles: landTiles,
    waterTiles: waterTiles,
    fertileTiles: fertileTiles,
    waterPercent: world.planetTiles && world.planetTiles.length > 0
      ? (waterTiles / world.planetTiles.length) * 100
      : 0,
    fertileLandPercent: landTiles > 0 ? (fertileTiles / landTiles) * 100 : 0
  };

  return world.planetSummary;
}
