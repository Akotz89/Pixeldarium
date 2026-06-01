const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function makeElement() {
  return {
    width: 1600,
    height: 850,
    classList: {
      add() {},
      remove() {},
      toggle() {}
    },
    addEventListener() {},
    getContext() {
      return {};
    },
    querySelector() {
      return makeElement();
    }
  };
}

const context = {
  assert,
  console,
  window: {},
  document: {
    getElementById() {
      return makeElement();
    }
  }
};

const source = [
  "config.js",
  "state.js",
  "utils.js",
  "planet.js",
  "terrain.js",
  "render.js"
].map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");

vm.runInNewContext(`${source}

function assertNear(actual, expected, tolerance, label) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    label + " expected " + expected + " got " + actual
  );
}

function fillPlanetTiles(biome) {
  world.planetTiles = [];

  for (var y = 0; y < WORLD_HEIGHT; y++) {
    for (var x = 0; x < WORLD_WIDTH; x++) {
      world.planetTiles[getTileIndex(x, y)] = {
        x: x,
        y: y,
        latitude: getPlanetLatitudeForTile(y),
        longitude: getPlanetLongitudeForTile(x),
        biome: biome,
        moisture: biome === "ocean" ? 1 : 1.2,
        elevation: 0,
        areaKm2: 1
      };
    }
  }
}

function colorDistance(fromHex, toHex) {
  var from = getRgbFromHex(fromHex);
  var to = getRgbFromHex(toHex);
  return Math.abs(from.red - to.red) + Math.abs(from.green - to.green) + Math.abs(from.blue - to.blue);
}

function colorLuminance(hexColor) {
  var rgb = getRgbFromHex(hexColor);
  return rgb.red * 0.2126 + rgb.green * 0.7152 + rgb.blue * 0.0722;
}

CONFIG.PLANET_RENDER_MODE = "globe";

var zoomLevels = getPlanetZoomLevels();
var finalGroundZoomIndex = zoomLevels.length - 1;
var finalGroundZoom = getPlanetZoomLevel(finalGroundZoomIndex);
var streetZoom = zoomLevels.filter(function(level) {
  return level.name === "Street" && level.metersPerSample === 25;
})[0];
var yardZoom = zoomLevels.filter(function(level) {
  return level.name === "Yard" && level.metersPerSample === 5;
})[0];

assert.ok(streetZoom, "zoom ladder should include street scale");
assert.ok(yardZoom, "zoom ladder should include yard scale");
assert.strictEqual(finalGroundZoom.name, "House", "final ground zoom should remain House");
assert.strictEqual(finalGroundZoom.metersPerSample, 1, "final ground zoom should remain 1 m/sample");

world.planetView = {
  zoomLevel: 4,
  latitude: 34.2117,
  longitude: -77.7265
};

var cursorX = 1225;
var cursorY = 410;
var localBefore = getPlanetLatLonFromCanvasPoint(cursorX, cursorY);

assert.ok(adjustPlanetZoomAtCanvasPoint(0.25, cursorX, cursorY));
assertNear(getPlanetView().zoomLevel, 4.25, 1e-12, "fractional zoom");

var localAfter = getPlanetLatLonFromCanvasPoint(cursorX, cursorY);
assertNear(localAfter.latitude, localBefore.latitude, 1e-9, "anchored local latitude");
assertNear(localAfter.longitude, localBefore.longitude, 1e-9, "anchored local longitude");

world.planetView = {
  zoomLevel: 0.75,
  latitude: 8,
  longitude: -20
};

var transitionBefore = getPlanetLatLonFromCanvasPoint(cursorX, cursorY);
assert.ok(adjustPlanetZoomAtCanvasPoint(0.25, cursorX, cursorY));
assert.ok(isPlanetLocalView(), "zoom 1 should enter local view");

var transitionAfter = getPlanetLatLonFromCanvasPoint(cursorX, cursorY);
assertNear(transitionAfter.latitude, transitionBefore.latitude, 1e-9, "anchored transition latitude");
assertNear(transitionAfter.longitude, transitionBefore.longitude, 1e-9, "anchored transition longitude");

world.planetView = {
  zoomLevel: 0,
  latitude: 8,
  longitude: -20
};

assert.ok(adjustPlanetZoom(0.25), "center zoom should still work");
assert.ok(!isPlanetLocalView(), "fractional globe zoom should remain globe-rendered below local threshold");

world.planetView = {
  zoomLevel: 2,
  latitude: 34.2117,
  longitude: -77.7265
};

var gridInfo = getPlanetLocalReferenceGridInfo(140);
assert.ok(gridInfo.distanceMeters > 0, "local grid should pick a real-world distance");
assert.ok(gridInfo.pixelSpacing >= 72 && gridInfo.pixelSpacing <= 230, "local grid should stay glanceable");
assert.ok(gridInfo.opacity > 0 && gridInfo.opacity <= 0.105, "local grid opacity should stay subdued");

world.planetView = {
  zoomLevel: 0,
  latitude: 8,
  longitude: -20
};

var projectedPoint = projectPlanetPoint(10, 20);
var recoveredPoint = getPlanetLatLonFromProjectedPoint(getPlanetProjection(), projectedPoint.x, projectedPoint.y);
assert.ok(recoveredPoint, "projected globe point should reverse to lat/lon");
assertNear(recoveredPoint.latitude, 20, 1e-9, "inverse projected latitude");
assertNear(recoveredPoint.longitude, 10, 1e-9, "inverse projected longitude");

var deepOceanColor = getPlanetTileCompositedColor({
  biome: "ocean",
  latitude: 0,
  moisture: 1,
  elevation: -3
});
var shallowOceanColor = getPlanetTileCompositedColor({
  biome: "ocean",
  latitude: 0,
  moisture: 1,
  elevation: -0.2
});
var lushLandColor = getPlanetTileCompositedColor({
  biome: "forest",
  latitude: 12,
  moisture: 1.8,
  elevation: 0.2
});
var dryLandColor = getPlanetTileCompositedColor({
  biome: "desert",
  latitude: 18,
  moisture: 0.1,
  elevation: 0.2
});
var highIceColor = getPlanetTileCompositedColor({
  biome: "ice",
  latitude: 78,
  moisture: 0.8,
  elevation: 2.4
});
var riverLandColor = getPlanetTileCompositedColor({
  biome: "grassland",
  latitude: 20,
  moisture: 1.2,
  elevation: 0.2,
  riverStrength: 1,
  terrainHillshade: 0.55
});
var plainLandColor = getPlanetTileCompositedColor({
  biome: "grassland",
  latitude: 20,
  moisture: 1.2,
  elevation: 0.2,
  riverStrength: 0,
  terrainHillshade: 0.55
});
var litSlopeColor = getPlanetTileCompositedColor({
  biome: "grassland",
  latitude: 20,
  moisture: 1.2,
  elevation: 0.7,
  terrainSlope: 0.8,
  terrainHillshade: 0.95
});
var shadowSlopeColor = getPlanetTileCompositedColor({
  biome: "grassland",
  latitude: 20,
  moisture: 1.2,
  elevation: 0.7,
  terrainSlope: 0.8,
  terrainHillshade: 0.20
});
var shallowCoastColor = getPlanetTileCompositedColor({
  biome: "ocean",
  latitude: 0,
  moisture: 1,
  elevation: -2,
  shallowWater: 1
});

assert.ok(colorLuminance(shallowOceanColor) > colorLuminance(deepOceanColor), "shallow ocean should be lighter than deep ocean");
assert.ok(colorDistance(lushLandColor, dryLandColor) > 50, "lush and dry land colors should diverge");
assert.ok(colorLuminance(highIceColor) > colorLuminance(lushLandColor), "ice/high latitude terrain should read brighter than forest");
assert.ok(colorDistance(riverLandColor, plainLandColor) > 20, "river corridors should alter land color");
assert.ok(colorLuminance(litSlopeColor) > colorLuminance(shadowSlopeColor), "tile hillshade should affect terrain luminance");
assert.ok(colorLuminance(shallowCoastColor) > colorLuminance(deepOceanColor), "coastal shallows should be lighter than deep ocean");

var cloudSample = getPlanetCloudOpacity(0, -30, 0);
var repeatedCloudSample = getPlanetCloudOpacity(0, -30, 0);
var shiftedCloudSample = getPlanetCloudOpacity(15, -120, 0);
var seededCloudSample = getPlanetCloudOpacity(0, -30, 8);
var polarCloudSample = getPlanetCloudOpacity(78, 10, 0);

assertNear(repeatedCloudSample, cloudSample, 1e-12, "cloud opacity should be deterministic");
assert.ok(cloudSample >= 0 && cloudSample <= 0.68, "cloud opacity should stay bounded");
assert.ok(seededCloudSample >= 0 && seededCloudSample <= 0.68, "seeded cloud opacity should stay bounded");
assert.ok(polarCloudSample >= 0 && polarCloudSample <= 0.68, "polar cloud opacity should stay bounded");
assert.ok(Math.abs(shiftedCloudSample - cloudSample) > 0.01, "cloud opacity should vary across the globe");
assert.ok(Math.abs(seededCloudSample - cloudSample) > 0.01, "cloud opacity should support slow deterministic drift");

var sampleProjection = { radius: 610 };
var globeSampleSize = getPlanetGlobeSampleSize(sampleProjection, 1);
assert.ok(globeSampleSize >= 10, "globe samples should overlap projected tile spacing");

var globeSurfaceRgb = getPlanetSurfaceRgbAtLatLon(0, 0);
assert.ok(globeSurfaceRgb.red >= 0 && globeSurfaceRgb.red <= 255, "globe surface red should be bounded");
assert.ok(globeSurfaceRgb.green >= 0 && globeSurfaceRgb.green <= 255, "globe surface green should be bounded");
assert.ok(globeSurfaceRgb.blue >= 0 && globeSurfaceRgb.blue <= 255, "globe surface blue should be bounded");

var deepWaterSurfaceColor = getPlanetSurfaceColor({
  biome: "ocean",
  detail: {
    surface: "deep water",
    shade: 0.4,
    elevation: 0.2,
    roughness: 0.1,
    hillshade: 0.5,
    heightMeters: -4200,
    slope: 0.02
  }
});
var shallowWaterSurfaceColor = getPlanetSurfaceColor({
  biome: "ocean",
  detail: {
    surface: "open water",
    shade: 0.55,
    elevation: 0.6,
    roughness: 0.12,
    hillshade: 0.65,
    heightMeters: -200,
    slope: 0.04
  }
});
var snowySurfaceColor = getPlanetSurfaceColor({
  biome: "tundra",
  detail: {
    surface: "stone",
    shade: 0.55,
    elevation: 0.8,
    roughness: 0.4,
    hillshade: 0.82,
    heightMeters: 3600,
    slope: 0.5
  }
});

assert.ok(colorLuminance(shallowWaterSurfaceColor) > colorLuminance(deepWaterSurfaceColor), "local shallow water should be lighter than deep water");
assert.ok(colorDistance(snowySurfaceColor, dryLandColor) > 40, "high local terrain should receive snow tint");

fillPlanetTiles("grassland");

var centerTile = getPlanetTile(Math.floor(WORLD_WIDTH / 2), Math.floor(WORLD_HEIGHT / 2));
var oceanTile = getPlanetTile(Math.floor(WORLD_WIDTH / 2) + 1, Math.floor(WORLD_HEIGHT / 2));
var highTile = getPlanetTile(Math.floor(WORLD_WIDTH / 2) - 1, Math.floor(WORLD_HEIGHT / 2));

centerTile.elevation = 1.0;
centerTile.moisture = 2;
centerTile.areaKm2 = 100;
oceanTile.biome = "ocean";
oceanTile.elevation = -1;
oceanTile.areaKm2 = 100;
highTile.elevation = 2.5;
highTile.moisture = 2;
highTile.areaKm2 = 100;
annotatePlanetHydrology();
annotatePlanetTerrainRelief();

assert.ok(centerTile.coastFactor > 0, "land next to ocean should have coast factor");
assert.ok(oceanTile.shallowWater > 0, "ocean next to land should be shallow");
assert.ok(highTile.waterFlow > 0, "land tiles should accumulate rainfall flow");
assert.ok(highTile.flowDirectionX !== 0 || highTile.flowDirectionY !== 0, "high land should route downhill");
assert.ok(Number.isFinite(centerTile.terrainSlope), "terrain relief should include slope");
assert.ok(Number.isFinite(centerTile.terrainHillshade), "terrain relief should include hillshade");
assert.ok(centerTile.terrainSlope >= 0 && centerTile.terrainSlope <= 1, "terrain slope should be normalized");
assert.ok(centerTile.terrainHillshade >= 0 && centerTile.terrainHillshade <= 1, "terrain hillshade should be normalized");

var featureCenter = getSurfaceMeterCoordinate(34.2117, -77.7265);
var groundFeatures = getPlanetGroundFeaturesForMeterBounds(
  featureCenter.eastMeters - 512,
  featureCenter.eastMeters + 512,
  featureCenter.northMeters - 512,
  featureCenter.northMeters + 512
);
var stableGroundFeatures = getPlanetGroundFeaturesForMeterBounds(
  featureCenter.eastMeters - 512,
  featureCenter.eastMeters + 512,
  featureCenter.northMeters - 512,
  featureCenter.northMeters + 512
);
var shiftedGroundFeatures = getPlanetGroundFeaturesForMeterBounds(
  featureCenter.eastMeters + 512,
  featureCenter.eastMeters + 1536,
  featureCenter.northMeters - 512,
  featureCenter.northMeters + 512
);

assert.ok(groundFeatures.length > 0, "ground feature layer should generate features over land");
assert.deepStrictEqual(stableGroundFeatures, groundFeatures, "ground features should be deterministic");
assert.notDeepStrictEqual(shiftedGroundFeatures, groundFeatures, "ground features should vary by meter-space bounds");
assert.ok(groundFeatures.some(function(feature) { return feature.shape === "line"; }), "ground features should include linear detail");
assert.ok(groundFeatures.some(function(feature) { return feature.shape === "rect"; }), "ground features should include footprint detail");
assert.ok(groundFeatures.every(function(feature) { return /^GF:/.test(feature.id); }), "ground features should have stable ids");

var lineFeature = groundFeatures.filter(function(feature) { return feature.shape === "line"; })[0];
var lineMidpoint = getLatLonFromSurfaceMeterCoordinate(
  (lineFeature.east1 + lineFeature.east2) / 2,
  (lineFeature.north1 + lineFeature.north2) / 2
);
var nearestLineFeature = getNearestPlanetGroundFeature(lineMidpoint.latitude, lineMidpoint.longitude, 16);

assert.ok(nearestLineFeature, "nearest feature query should find a line feature");
assert.strictEqual(nearestLineFeature.id, lineFeature.id, "nearest line feature id should match");
assertNear(nearestLineFeature.distanceMeters, 0, 1e-9, "nearest line distance");
assert.ok(getPlanetGroundFeatureDimensionLabel(nearestLineFeature).indexOf("m") > 0, "nearest line should have dimensions");

var rectFeature = groundFeatures.filter(function(feature) { return feature.shape === "rect"; })[0];
var rectCenter = getLatLonFromSurfaceMeterCoordinate(rectFeature.east, rectFeature.north);
var nearestRectFeature = getNearestPlanetGroundFeature(rectCenter.latitude, rectCenter.longitude, 16);

assert.ok(nearestRectFeature, "nearest feature query should find a footprint feature");
assert.strictEqual(nearestRectFeature.id, rectFeature.id, "nearest footprint feature id should match");
assertNear(nearestRectFeature.distanceMeters, 0, 1e-9, "nearest footprint distance");
assert.ok(getPlanetGroundFeatureSummary(rectCenter.latitude, rectCenter.longitude, 16).nearest.id, "feature summary should include nearest feature");

var broadSummary = getPlanetGroundFeatureSummary(34.2117, -77.7265, 500000);
assert.strictEqual(broadSummary.capped, true, "broad feature summary should be capped");
assert.strictEqual(broadSummary.count, 0, "capped feature summary should not enumerate features");
assert.strictEqual(broadSummary.nearest, null, "capped feature summary should not search nearest features");

var broadFeatures = getPlanetGroundFeaturesForMeterBounds(
  featureCenter.eastMeters - 500000,
  featureCenter.eastMeters + 500000,
  featureCenter.northMeters - 500000,
  featureCenter.northMeters + 500000
);
assert.deepStrictEqual(broadFeatures, [], "broad feature bounds query should return safely");

var houseAddress = getPlanetSurfaceSampleAddress(34.2117, -77.7265, finalGroundZoomIndex);
var houseChunkAddress = makePlanetSurfaceChunkAddress(finalGroundZoomIndex, houseAddress.chunkX, houseAddress.chunkY);
var chunkBounds = getLocalSurfaceChunkMeterBounds(houseChunkAddress);
var chunkPoint = getLocalSurfaceChunkPointForMeters(
  houseChunkAddress,
  chunkBounds.minEastMeters,
  chunkBounds.maxNorthMeters
);

assertNear(chunkBounds.sizeMeters, 32, 1e-9, "house chunk size");
assertNear(chunkPoint.x, 0, 1e-9, "chunk meter origin x");
assertNear(chunkPoint.y, 0, 1e-9, "chunk meter origin y");

world.planetView = {
  zoomLevel: finalGroundZoomIndex,
  latitude: 34.2117,
  longitude: -77.7265
};

var chunkRect = getPlanetSurfaceChunkScreenRect(houseChunkAddress);
var eastNeighborRect = getPlanetSurfaceChunkScreenRect(makePlanetSurfaceChunkAddress(
  finalGroundZoomIndex,
  houseChunkAddress.chunkX + 1,
  houseChunkAddress.chunkY
));
var northNeighborRect = getPlanetSurfaceChunkScreenRect(makePlanetSurfaceChunkAddress(
  finalGroundZoomIndex,
  houseChunkAddress.chunkX,
  houseChunkAddress.chunkY + 1
));

assertNear(chunkRect.x + chunkRect.width, eastNeighborRect.x, 1e-9, "adjacent chunk east edge continuity");
assertNear(northNeighborRect.y + northNeighborRect.height, chunkRect.y, 1e-9, "adjacent chunk north edge continuity");

var visibleChunks = getPlanetVisibleSurfaceChunks(getPlanetSurfaceChunkSampleCount());
assert.ok(visibleChunks.length > 1, "house zoom should enumerate multiple visible chunks");
assert.ok(Number.isFinite(visibleChunks[0].priorityDistance), "visible chunks should include priority distance");

for (var chunkIndex = 1; chunkIndex < visibleChunks.length; chunkIndex++) {
  assert.ok(
    visibleChunks[chunkIndex - 1].priorityDistance <= visibleChunks[chunkIndex].priorityDistance,
    "visible chunks should be ordered from viewport focus outward"
  );
}

var centerChunk = visibleChunks[0];
var centerX = centerChunk.screenX + centerChunk.width / 2;
var centerY = centerChunk.screenY + centerChunk.height / 2;
assert.ok(Math.abs(centerX - canvas.width / 2) <= centerChunk.width, "first visible chunk should be near viewport center");
assert.ok(Math.abs(centerY - canvas.height / 2) <= centerChunk.height, "first visible chunk should be near viewport center");
`, context);

console.log("planet zoom anchor checks passed");
