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

function rgbDistance(from, to) {
  return Math.abs(from.red - to.red) + Math.abs(from.green - to.green) + Math.abs(from.blue - to.blue);
}

function assertRgbBounds(rgb, label) {
  assert.ok(rgb.red >= 0 && rgb.red <= 255, label + " red should be bounded");
  assert.ok(rgb.green >= 0 && rgb.green <= 255, label + " green should be bounded");
  assert.ok(rgb.blue >= 0 && rgb.blue <= 255, label + " blue should be bounded");
}

function summarizeGeneratedPlanet(seedText) {
  setWorldSeed(seedText);
  seedTerrain();

  var totalAreaKm2 = 0;
  var waterAreaKm2 = 0;
  var landAreaKm2 = 0;
  var coastalLandAreaKm2 = 0;
  var shallowOceanAreaKm2 = 0;
  var biomeCounts = {};
  var minElevation = Infinity;
  var maxElevation = -Infinity;
  var maxRidge = 0;
  var maxContinentShape = 0;
  var maxIslandArc = 0;
  var signature = [];
  var visitedLand = new Array(world.planetTiles.length).fill(false);
  var largestLandmassAreaKm2 = 0;
  var landmassCount = 0;

  for (var i = 0; i < world.planetTiles.length; i++) {
    var tile = world.planetTiles[i];
    var areaKm2 = Number(tile.areaKm2) || 0;

    totalAreaKm2 += areaKm2;
    biomeCounts[tile.biome] = (biomeCounts[tile.biome] || 0) + 1;
    minElevation = Math.min(minElevation, Number(tile.elevation) || 0);
    maxElevation = Math.max(maxElevation, Number(tile.elevation) || 0);
    maxRidge = Math.max(maxRidge, Number(tile.ridgeStrength) || 0);
    maxContinentShape = Math.max(maxContinentShape, Number(tile.continentShape) || 0);
    maxIslandArc = Math.max(maxIslandArc, Number(tile.islandArc) || 0);

    if (tile.biome === "ocean") {
      waterAreaKm2 += areaKm2;

      if ((Number(tile.shallowWater) || 0) > 0.24) {
        shallowOceanAreaKm2 += areaKm2;
      }
    } else {
      landAreaKm2 += areaKm2;

      if ((Number(tile.coastFactor) || 0) > 0.18) {
        coastalLandAreaKm2 += areaKm2;
      }
    }

    if (i % 233 === 0) {
      signature.push([
        tile.biome,
        Math.round((Number(tile.elevation) || 0) * 1000),
        Math.round((Number(tile.moisture) || 0) * 1000),
        Math.round((Number(tile.ridgeStrength) || 0) * 1000)
      ].join(":"));
    }
  }

  for (var landIndex = 0; landIndex < world.planetTiles.length; landIndex++) {
    var startTile = world.planetTiles[landIndex];
    var stack;
    var componentAreaKm2 = 0;

    if (!startTile || startTile.biome === "ocean" || visitedLand[landIndex]) {
      continue;
    }

    landmassCount++;
    stack = [startTile];
    visitedLand[landIndex] = true;

    while (stack.length > 0) {
      var componentTile = stack.pop();
      var componentNeighbors = [
        getPlanetTile(getWrappedWorldX(componentTile.x - 1), componentTile.y),
        getPlanetTile(getWrappedWorldX(componentTile.x + 1), componentTile.y),
        getPlanetTile(componentTile.x, getClampedWorldY(componentTile.y - 1)),
        getPlanetTile(componentTile.x, getClampedWorldY(componentTile.y + 1))
      ];

      componentAreaKm2 += Math.max(0, Number(componentTile.areaKm2) || 0);

      for (var neighborIndex = 0; neighborIndex < componentNeighbors.length; neighborIndex++) {
        var neighbor = componentNeighbors[neighborIndex];
        var neighborTileIndex;

        if (!neighbor || neighbor.biome === "ocean") {
          continue;
        }

        neighborTileIndex = getTileIndex(neighbor.x, neighbor.y);

        if (!visitedLand[neighborTileIndex]) {
          visitedLand[neighborTileIndex] = true;
          stack.push(neighbor);
        }
      }
    }

    largestLandmassAreaKm2 = Math.max(largestLandmassAreaKm2, componentAreaKm2);
  }

  return {
    waterAreaPercent: totalAreaKm2 > 0 ? waterAreaKm2 / totalAreaKm2 * 100 : 0,
    largestLandmassLandPercent: landAreaKm2 > 0 ? largestLandmassAreaKm2 / landAreaKm2 * 100 : 0,
    coastalLandPercent: landAreaKm2 > 0 ? coastalLandAreaKm2 / landAreaKm2 * 100 : 0,
    shallowOceanPercent: waterAreaKm2 > 0 ? shallowOceanAreaKm2 / waterAreaKm2 * 100 : 0,
    landmassCount: landmassCount,
    biomeCount: Object.keys(biomeCounts).length,
    biomeCounts: biomeCounts,
    elevationRange: maxElevation - minElevation,
    maxRidge: maxRidge,
    maxContinentShape: maxContinentShape,
    maxIslandArc: maxIslandArc,
    signature: signature
  };
}

CONFIG.PLANET_RENDER_MODE = "globe";

var zoomLevels = getPlanetZoomLevels();
var finalGroundZoomIndex = zoomLevels.length - 1;
var finalGroundZoom = getPlanetZoomLevel(finalGroundZoomIndex);
var detailZoom = zoomLevels.filter(function(level) {
  return level.name === "Detail" && level.metersPerSample === 25;
})[0];
var groundZoom = zoomLevels.filter(function(level) {
  return level.name === "Ground" && level.metersPerSample === 5;
})[0];
var detailZoomIndex = zoomLevels.indexOf(detailZoom);
var groundZoomIndex = zoomLevels.indexOf(groundZoom);
var developedPlaceLabels = zoomLevels.filter(function(level) {
  return ["Neighborhood", "Street", "Yard", "House"].indexOf(level.name) >= 0;
});

assert.ok(detailZoom, "zoom ladder should include detail scale");
assert.ok(groundZoom, "zoom ladder should include ground scale");
assert.ok(detailZoomIndex >= 0, "detail zoom should have an index");
assert.ok(groundZoomIndex >= 0, "ground zoom should have an index");
assert.strictEqual(finalGroundZoom.name, "Meter", "final ground zoom should remain Meter");
assert.strictEqual(finalGroundZoom.metersPerSample, 1, "final ground zoom should remain 1 m/sample");
assert.deepStrictEqual(developedPlaceLabels, [], "undeveloped planet zoom labels should not imply built infrastructure");
assert.strictEqual(CONFIG.PLANET_DEBUG_OVERLAY, false, "verbose planet debug overlay should be hidden by default");
assert.strictEqual(CONFIG.PLANET_REFERENCE_GRID, false, "planet reference grid should be hidden by default");
assert.strictEqual(CONFIG.PLANET_GLOBE_ENTITY_MARKERS, false, "globe-scale entity markers should be hidden by default");
assert.strictEqual(CONFIG.SHOW_SCANLINES, false, "scanline overlay should be hidden by default");
assert.strictEqual(CONFIG.PLANET_CLOUD_ALPHA, 0, "cloud overlay should be disabled while tuning surface readability");

var generatedPlanet = summarizeGeneratedPlanet("PIXEL-2026");
var repeatedGeneratedPlanet = summarizeGeneratedPlanet("PIXEL-2026");
var alternateGeneratedPlanet = summarizeGeneratedPlanet("PIXEL-2027");

assertNear(generatedPlanet.waterAreaPercent, CONFIG.PLANET_TARGET_WATER_PERCENT, 2, "generated planet water area");
assert.ok(generatedPlanet.biomeCount >= 4, "generated planet should include multiple biome classes");
assert.ok(generatedPlanet.elevationRange > 1.2, "generated planet should have meaningful elevation range");
assert.ok(generatedPlanet.maxRidge > 0.55, "generated planet should include mountain ridge signal");
assert.ok(generatedPlanet.maxContinentShape > 0.84, "generated planet should include strong continent plate signal");
assert.ok(generatedPlanet.maxIslandArc > 0.18, "generated planet should include island arc signal");
assert.ok(generatedPlanet.largestLandmassLandPercent > 18, "generated planet should include a major continent-scale landmass");
assert.ok(generatedPlanet.landmassCount >= 3, "generated planet should include multiple landmasses/islands");
assert.ok(generatedPlanet.coastalLandPercent > 8, "generated planet should expose meaningful coastal land");
assert.ok(generatedPlanet.shallowOceanPercent > 1.5, "generated planet should expose shallow shelf ocean");
assert.deepStrictEqual(repeatedGeneratedPlanet.signature, generatedPlanet.signature, "generated planet should be deterministic for a seed");
assert.notDeepStrictEqual(alternateGeneratedPlanet.signature, generatedPlanet.signature, "generated planet should vary by seed");

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

assert.strictEqual(getPlanetSurfaceLodZoomIndex(0.75), 0, "globe transition should keep globe surface LOD below local zoom");
assert.strictEqual(getPlanetSurfaceLodZoomIndex(detailZoomIndex - 0.46), detailZoomIndex - 1, "surface LOD should hold lower detail before threshold");
assert.strictEqual(getPlanetSurfaceLodZoomIndex(detailZoomIndex - 0.45), detailZoomIndex, "surface LOD should switch finer before the integer zoom");
assert.strictEqual(getPlanetSurfaceLodZoomIndex(finalGroundZoomIndex - 0.45), finalGroundZoomIndex, "surface LOD should preselect meter detail near final zoom");

world.planetView = {
  zoomLevel: finalGroundZoomIndex - 0.46,
  latitude: 34.2117,
  longitude: -77.7265
};

var coarseFractionalAddress = getPlanetSurfaceSampleAddress(34.2117, -77.7265);

world.planetView = {
  zoomLevel: finalGroundZoomIndex - 0.45,
  latitude: 34.2117,
  longitude: -77.7265
};

var fineFractionalAddress = getPlanetSurfaceSampleAddress(34.2117, -77.7265);
var fineFractionalScaleInfo = getPlanetCameraScaleInfo();

assert.strictEqual(coarseFractionalAddress.zoomLevel, groundZoomIndex, "pre-threshold fractional zoom should keep ground LOD");
assert.strictEqual(coarseFractionalAddress.sampleMeters, groundZoom.metersPerSample, "pre-threshold fractional zoom should keep ground sample size");
assert.strictEqual(fineFractionalAddress.zoomLevel, finalGroundZoomIndex, "near-final fractional zoom should use meter LOD");
assert.strictEqual(fineFractionalAddress.sampleMeters, finalGroundZoom.metersPerSample, "near-final fractional zoom should use meter samples");
assert.strictEqual(fineFractionalScaleInfo.surfaceLodLevel, finalGroundZoomIndex, "camera scale info should expose selected surface LOD");
assert.strictEqual(fineFractionalScaleInfo.surfaceSampleMeters, finalGroundZoom.metersPerSample, "camera scale info should expose selected surface sample size");

world.planetView = {
  zoomLevel: finalGroundZoomIndex,
  latitude: 34.2117,
  longitude: -77.7265
};

var viewSurfaceMeters = getSurfaceMeterCoordinate(world.planetView.latitude, world.planetView.longitude);
var centerSurfaceLatLon = getPlanetLatLonFromCanvasPoint(canvas.width / 2, canvas.height / 2);
var centerSurfacePoint = getPlanetLocalCanvasPoint(centerSurfaceLatLon.longitude, centerSurfaceLatLon.latitude);
var eastSurfaceLatLon = getPlanetLatLonFromCanvasPoint(canvas.width / 2 + CONFIG.TILE_SIZE * 10, canvas.height / 2);
var eastSurfaceMeters = getSurfaceMeterCoordinate(eastSurfaceLatLon.latitude, eastSurfaceLatLon.longitude);
var localCenterAddress = getPlanetLocalSurfaceAddress(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
var localCenterExpectedEastMeters = viewSurfaceMeters.eastMeters + finalGroundZoom.metersPerSample * 0.5;
var localCenterExpectedNorthMeters = viewSurfaceMeters.northMeters - finalGroundZoom.metersPerSample * 0.5;

assertNear(centerSurfaceLatLon.latitude, world.planetView.latitude, 1e-9, "meter projection center latitude");
assertNear(centerSurfaceLatLon.longitude, world.planetView.longitude, 1e-9, "meter projection center longitude");
assertNear(centerSurfacePoint.x, canvas.width / 2, 1e-6, "meter projection center x");
assertNear(centerSurfacePoint.y, canvas.height / 2, 1e-6, "meter projection center y");
assertNear(eastSurfaceMeters.eastMeters - viewSurfaceMeters.eastMeters, finalGroundZoom.metersPerSample * 10, 1e-6, "local canvas east offset should use surface meters");
assertNear(eastSurfaceMeters.northMeters, viewSurfaceMeters.northMeters, 1e-6, "local canvas east offset should preserve north meters");
assertNear(localCenterAddress.eastMeters, localCenterExpectedEastMeters, 1e-9, "local surface address east meters");
assertNear(localCenterAddress.northMeters, localCenterExpectedNorthMeters, 1e-9, "local surface address north meters");

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
var ridgeLandColor = getPlanetTileCompositedColor({
  biome: "grassland",
  latitude: 20,
  moisture: 1.2,
  elevation: 1.1,
  riverStrength: 0,
  ridgeStrength: 1,
  roughness: 1,
  terrainSlope: 0.8,
  terrainHillshade: 0.72
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
assert.ok(colorDistance(ridgeLandColor, plainLandColor) > 25, "ridge signals should alter land color");
assert.ok(colorLuminance(litSlopeColor) > colorLuminance(shadowSlopeColor), "tile hillshade should affect terrain luminance");
assert.ok(colorLuminance(shallowCoastColor) > colorLuminance(deepOceanColor), "coastal shallows should be lighter than deep ocean");

var lowLatitudeHighlandTile = {
  biome: "grassland",
  latitude: 18,
  moisture: 1,
  elevation: 1.8,
  ridgeStrength: 1,
  roughness: 1,
  highlandLift: 1.2,
  terrainHillshade: 0.72
};
var polarHighlandTile = {
  biome: "tundra",
  latitude: 76,
  moisture: 0.8,
  elevation: 1.2,
  ridgeStrength: 0.9,
  roughness: 0.7,
  highlandLift: 0.8,
  terrainHillshade: 0.72
};
var permanentIceTile = {
  biome: "ice",
  latitude: 82,
  moisture: 0.7,
  elevation: 0.8,
  ridgeStrength: 0.3,
  roughness: 0.2,
  highlandLift: 0.2,
  terrainHillshade: 0.72
};
var lowLatitudeSnowSignal = getPlanetSurfaceSnowSignal(lowLatitudeHighlandTile, lowLatitudeHighlandTile.latitude);
var polarSnowSignal = getPlanetSurfaceSnowSignal(polarHighlandTile, polarHighlandTile.latitude);
var iceSnowSignal = getPlanetSurfaceSnowSignal(permanentIceTile, permanentIceTile.latitude);
var lowLatitudeSnowVisual = getPlanetCloudlessSnowVisualAmount("grassland", lowLatitudeSnowSignal, 0, 1, 1);
var polarSnowVisual = getPlanetCloudlessSnowVisualAmount("tundra", polarSnowSignal, 1, 0.75, 0.9);
var oceanSnowVisual = getPlanetCloudlessSnowVisualAmount("ocean", polarSnowSignal, 1, 0, 0);
var iceSnowVisual = getPlanetCloudlessSnowVisualAmount("ice", iceSnowSignal, 1, 0.3, 0.3);
var lowLatitudeHighlandColor = getPlanetTileCompositedColor(lowLatitudeHighlandTile);
var permanentIceColor = getPlanetTileCompositedColor(permanentIceTile);
var materialPixelNoise = getPlanetMaterialPixelNoise(12.1, 20.1, 6200, 607);
var repeatedMaterialPixelNoise = getPlanetMaterialPixelNoise(12.1, 20.1, 6200, 607);
var shiftedMaterialPixelNoise = getPlanetMaterialPixelNoise(12.3, 20.3, 6200, 607);
var forestMaterialAccent = applyPlanetMaterialPixelAccents({ red: 60, green: 90, blue: 65 }, 12.1, 20.1, {
  biome: "forest",
  moisture: 1.4,
  elevation: 0.2,
  ridgeStrength: 0.1,
  roughness: 0.4
});
var desertMaterialAccent = applyPlanetMaterialPixelAccents({ red: 60, green: 90, blue: 65 }, 12.1, 20.1, {
  biome: "desert",
  moisture: 0.2,
  elevation: 0.2,
  ridgeStrength: 0.1,
  roughness: 0.4
});

assert.ok(lowLatitudeSnowSignal < 0.35, "low-latitude non-ice highlands should not become broad snow/cloud cover");
assert.ok(polarSnowSignal > lowLatitudeSnowSignal + 0.15, "polar highlands should carry more snow signal than low-latitude highlands");
assert.ok(iceSnowSignal > polarSnowSignal, "ice biome should remain the brightest permanent snow/ice signal");
assert.ok(lowLatitudeSnowVisual < 0.08, "cloudless globe material should not render low-latitude highlands as foggy snow");
assert.ok(polarSnowVisual > lowLatitudeSnowVisual + 0.08, "cloudless globe material should keep polar snow visually distinct");
assert.ok(oceanSnowVisual < polarSnowVisual, "cloudless globe material should not whiten oceans like clouds");
assert.ok(iceSnowVisual > polarSnowVisual, "permanent ice should remain visually brighter than tundra snow");
assert.ok(colorLuminance(permanentIceColor) > colorLuminance(lowLatitudeHighlandColor) + 15, "non-ice highlands should stay darker than permanent ice");
assertNear(repeatedMaterialPixelNoise, materialPixelNoise, 1e-12, "material pixel noise should be deterministic");
assert.ok(materialPixelNoise >= 0 && materialPixelNoise <= 1, "material pixel noise should be bounded");
assert.ok(Math.abs(shiftedMaterialPixelNoise - materialPixelNoise) > 0.001, "material pixel noise should vary across the surface");
assertRgbBounds(forestMaterialAccent, "forest material accent");
assertRgbBounds(desertMaterialAccent, "desert material accent");
assert.ok(rgbDistance(forestMaterialAccent, desertMaterialAccent) > 4, "material accents should vary by biome");

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
assert.ok(getPlanetGlobeRasterScale(1600, 1220) < 0.85, "oversized globe raster should downsample for responsiveness");
assert.strictEqual(getPlanetGlobeRasterScale(480, 360), 1, "small globe raster should keep native resolution");
assert.ok(getPlanetGlobeRasterScale(5000, 3000) >= 0.45, "large globe raster should not downsample into oversized square cells");
assert.ok(getPlanetSmoothMeterNoise(999, 999, 1000, 7) >= 0, "smooth imagery noise should stay bounded");
assert.ok(getPlanetSmoothMeterNoise(999, 999, 1000, 7) <= 1, "smooth imagery noise should stay bounded");

var globeSurfaceRgb = getPlanetSurfaceRgbAtLatLon(0, 0);
assert.ok(globeSurfaceRgb.red >= 0 && globeSurfaceRgb.red <= 255, "globe surface red should be bounded");
assert.ok(globeSurfaceRgb.green >= 0 && globeSurfaceRgb.green <= 255, "globe surface green should be bounded");
assert.ok(globeSurfaceRgb.blue >= 0 && globeSurfaceRgb.blue <= 255, "globe surface blue should be bounded");

fillPlanetTiles("grassland");
var subTileA = getPlanetImageryRgbAtLatLon(12.1, 20.1);
var repeatedSubTileA = getPlanetImageryRgbAtLatLon(12.1, 20.1);
var subTileB = getPlanetImageryRgbAtLatLon(12.2, 20.2);
var subTileTileA = getTileFromLatLon(12.1, 20.1);
var subTileTileB = getTileFromLatLon(12.2, 20.2);

assert.deepStrictEqual(subTileTileB, subTileTileA, "sub-tile imagery sample points should share a coarse tile");
assert.deepStrictEqual(repeatedSubTileA, subTileA, "sub-tile imagery should be deterministic");
assertRgbBounds(subTileA, "sub-tile imagery");
assertRgbBounds(getPlanetImageryRgbAtLatLon(0, 0), "equator imagery");
assert.ok(rgbDistance(subTileA, subTileB) > 1, "sub-tile imagery should vary within a coarse tile");

["ocean", "forest", "desert", "tundra", "ice"].forEach(function(biome) {
  fillPlanetTiles(biome);
  assertRgbBounds(getPlanetImageryRgbAtLatLon(20, 20), biome + " imagery");
});

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
var lowlandTerrainTintSample = {
  biome: "grassland",
  latitude: 20,
  surfaceSampleMeters: 1,
  tile: {
    biome: "grassland",
    latitude: 20,
    moisture: 1.2,
    elevation: 0.1,
    ridgeStrength: 0.1,
    roughness: 0.1,
    coastFactor: 0,
    riverStrength: 0
  },
  detail: {
    surface: "grass",
    shade: 0.55,
    elevation: 0.52,
    roughness: 0.12,
    hillshade: 0.58,
    heightMeters: 240,
    slope: 0.04,
    meterNoise: 0.42,
    microNoise: 0.51,
    sampleMeters: 1,
    materialSignals: {
      moisture: 0.54,
      river: 0,
      coast: 0,
      shallowWater: 0,
      ridge: 0.1,
      surfaceRoughness: 0.12
    }
  }
};
var highlandTerrainTintSample = {
  biome: "grassland",
  latitude: 20,
  surfaceSampleMeters: 1,
  tile: {
    biome: "grassland",
    latitude: 20,
    moisture: 1.0,
    elevation: 1.8,
    ridgeStrength: 0.9,
    roughness: 0.8,
    coastFactor: 0,
    riverStrength: 0
  },
  detail: {
    surface: "grass",
    shade: 0.55,
    elevation: 0.86,
    roughness: 0.74,
    hillshade: 0.28,
    heightMeters: 1680,
    slope: 0.62,
    meterNoise: 0.62,
    microNoise: 0.68,
    sampleMeters: 1,
    materialSignals: {
      moisture: 0.45,
      river: 0,
      coast: 0,
      shallowWater: 0,
      ridge: 0.9,
      surfaceRoughness: 0.74
    }
  }
};
var whitecapTerrainTintSample = {
  biome: "ocean",
  latitude: 0,
  surfaceSampleMeters: 1,
  tile: {
    biome: "ocean",
    latitude: 0,
    moisture: 1,
    elevation: -0.1,
    shallowWater: 0.8,
    shelfStrength: 0.8,
    coastFactor: 0.4
  },
  detail: {
    surface: "whitecap",
    shade: 0.7,
    elevation: 0.6,
    roughness: 0.4,
    hillshade: 0.8,
    heightMeters: -80,
    slope: 0.32,
    meterNoise: 0.64,
    microNoise: 0.82,
    sampleMeters: 1,
    materialSignals: {
      moisture: 1,
      shallowWater: 0.8,
      shelfStrength: 0.8,
      coast: 0.4,
      surfaceRoughness: 0.42
    }
  }
};
var lowlandTerrainTint = getPlanetLocalTerrainBandTint(lowlandTerrainTintSample);
var repeatedLowlandTerrainTint = getPlanetLocalTerrainBandTint(lowlandTerrainTintSample);
var highlandTerrainTint = getPlanetLocalTerrainBandTint(highlandTerrainTintSample);
var whitecapTerrainTint = getPlanetLocalTerrainBandTint(whitecapTerrainTintSample);
var lowlandTerrainTintColor = getPlanetSurfaceColor(lowlandTerrainTintSample);
var highlandTerrainTintColor = getPlanetSurfaceColor(highlandTerrainTintSample);

assert.ok(colorLuminance(shallowWaterSurfaceColor) > colorLuminance(deepWaterSurfaceColor), "local shallow water should be lighter than deep water");
assert.ok(colorDistance(snowySurfaceColor, dryLandColor) > 40, "high local terrain should receive snow tint");
assert.deepStrictEqual(repeatedLowlandTerrainTint, lowlandTerrainTint, "local terrain-band tint should be deterministic");
assert.ok(highlandTerrainTint.relief > lowlandTerrainTint.relief + 0.45, "local terrain-band tint should respond to relief");
assert.ok(highlandTerrainTint.amount > lowlandTerrainTint.amount, "local terrain-band tint should strengthen on rough highlands");
assert.ok(whitecapTerrainTint.amount < highlandTerrainTint.amount * 0.45, "strong local water surfaces should be protected from terrain-band over-blending");
assert.ok(colorDistance(lowlandTerrainTintColor, highlandTerrainTintColor) > 20, "local terrain-band color should vary with landform context");
[lowlandTerrainTint, highlandTerrainTint, whitecapTerrainTint].forEach(function(tint) {
  assert.ok(tint.amount >= 0 && tint.amount <= 0.18, "local terrain-band tint amount should stay bounded");
  assert.ok(tint.relief >= 0 && tint.relief <= 1, "local terrain-band relief should stay bounded");
  assert.ok(tint.bandNoise >= 0 && tint.bandNoise <= 1, "local terrain-band noise should stay bounded");
});

var materialLod = {
  sampleMeters: 1,
  northMeters: 0,
  eastMeters: 0,
  continental: 0.55,
  landform: 0.62,
  canopy: 0.72,
  ground: 0.42,
  meter: 0.46,
  micro: 0.44,
  elevation: 0.56,
  roughness: 0.18
};
var flatMaterialRelief = {
  heightMeters: 340,
  slope: 0.04,
  aspect: 0,
  hillshade: 0.72,
  dzdx: 0,
  dzdy: 0
};
var roughMaterialRelief = {
  heightMeters: 820,
  slope: 0.38,
  aspect: 0,
  hillshade: 0.60,
  dzdx: 0.2,
  dzdy: 0.2
};
var meadowMaterial = getPlanetLocalSurfaceMaterialClassification(20, "grassland", materialLod, flatMaterialRelief, {
  biome: "grassland",
  latitude: 20,
  moisture: 2.2,
  riverStrength: 0.45,
  coastFactor: 0,
  roughness: 0,
  ridgeStrength: 0,
  elevation: 0.2
});
var brushMaterial = getPlanetLocalSurfaceMaterialClassification(20, "grassland", materialLod, roughMaterialRelief, {
  biome: "grassland",
  latitude: 20,
  moisture: 0.25,
  riverStrength: 0,
  coastFactor: 0,
  roughness: 1,
  ridgeStrength: 0.8,
  elevation: 0.6
});
var deepOceanMaterial = getPlanetLocalSurfaceMaterialClassification(0, "ocean", materialLod, {
  heightMeters: -4200,
  slope: 0.02,
  aspect: 0,
  hillshade: 0.50,
  dzdx: 0,
  dzdy: 0
}, {
  biome: "ocean",
  latitude: 0,
  moisture: 1,
  shallowWater: 0,
  coastFactor: 0,
  elevation: -2
});
var whitecapMaterial = getPlanetLocalSurfaceMaterialClassification(0, "ocean", {
  sampleMeters: 1,
  northMeters: 0,
  eastMeters: 0,
  continental: 0.50,
  landform: 0.52,
  canopy: 0.50,
  ground: 0.96,
  meter: 0.50,
  micro: 0.98,
  elevation: 0.55,
  roughness: 0.45
}, {
  heightMeters: -220,
  slope: 0.42,
  aspect: 0,
  hillshade: 0.86,
  dzdx: 0.4,
  dzdy: 0.2
}, {
  biome: "ocean",
  latitude: 0,
  moisture: 1,
  shallowWater: 0.8,
  coastFactor: 0.4,
  elevation: -0.1
});
var rockyDesertMaterial = getPlanetLocalSurfaceMaterialClassification(24, "desert", materialLod, roughMaterialRelief, {
  biome: "desert",
  latitude: 24,
  moisture: 0.1,
  roughness: 1,
  ridgeStrength: 0.8,
  elevation: 0.8
});
var polarTundraMaterial = getPlanetLocalSurfaceMaterialClassification(78, "tundra", materialLod, flatMaterialRelief, {
  biome: "tundra",
  latitude: 78,
  moisture: 0.8,
  roughness: 0.2,
  ridgeStrength: 0.4,
  highlandLift: 0.5,
  elevation: 1.0
});
var roughIceMaterial = getPlanetLocalSurfaceMaterialClassification(82, "ice", materialLod, roughMaterialRelief, {
  biome: "ice",
  latitude: 82,
  moisture: 0.8,
  roughness: 1,
  ridgeStrength: 0.8,
  elevation: 1.0
});

var savedShorelinePlanetTiles = world.planetTiles.map(function(tile) {
  return tile ? Object.assign({}, tile) : tile;
});
var savedShorelineTerrain = world.terrain.slice();
var savedShorelineSeedText = world.seedText;
var savedShorelineRngState = world.rngState;

setWorldSeed("PIXEL-2026");
fillPlanetTiles("grassland");
var coastY = Math.floor(WORLD_HEIGHT / 2);
var coastLandX = Math.floor(WORLD_WIDTH / 2);
var coastOceanX = coastLandX + 1;
var coastLandTile = getPlanetTile(coastLandX, coastY);
var coastOceanTile = getPlanetTile(coastOceanX, coastY);
var coastLatitude = getPlanetLatitudeForTile(coastY);
var coastBoundaryLongitude = (coastOceanX / WORLD_WIDTH) * 360 - 180;

coastLandTile.biome = "grassland";
coastLandTile.moisture = 1.3;
coastLandTile.elevation = 0.1;
coastLandTile.coastFactor = 1;
coastLandTile.shallowWater = 0;
coastLandTile.roughness = 0.2;
coastLandTile.ridgeStrength = 0;
coastOceanTile.biome = "ocean";
coastOceanTile.moisture = 1;
coastOceanTile.elevation = -0.5;
coastOceanTile.coastFactor = 1;
coastOceanTile.shallowWater = 1;
coastOceanTile.roughness = 0.1;
coastOceanTile.ridgeStrength = 0;

var shorelineRefinement = getPlanetLocalShorelineRefinement(coastLatitude, coastBoundaryLongitude, coastLandTile, materialLod);
var coastalLandMaterial = getPlanetLocalSurfaceMaterialClassification(
  coastLatitude,
  "grassland",
  materialLod,
  flatMaterialRelief,
  coastLandTile,
  coastBoundaryLongitude
);
var coastalOceanMaterial = getPlanetLocalSurfaceMaterialClassification(
  coastLatitude,
  "ocean",
  materialLod,
  Object.assign({}, flatMaterialRelief, { heightMeters: -120 }),
  coastOceanTile,
  coastBoundaryLongitude
);
var interiorLandMaterial = getPlanetLocalSurfaceMaterialClassification(
  coastLatitude,
  "grassland",
  materialLod,
  flatMaterialRelief,
  {
    biome: "grassland",
    latitude: coastLatitude,
    moisture: 1.2,
    coastFactor: 0,
    shallowWater: 0,
    roughness: 0.1,
    ridgeStrength: 0
  },
  coastBoundaryLongitude + getPlanetTileLongitudeStepDeg() * 8
);
setWorldSeed("PIXEL-2027");
var alternateShorelineRefinement = getPlanetLocalShorelineRefinement(coastLatitude, coastBoundaryLongitude, coastLandTile, materialLod);
world.planetTiles = savedShorelinePlanetTiles;
world.terrain = savedShorelineTerrain;
world.seedText = savedShorelineSeedText;
world.rngState = savedShorelineRngState;

assert.strictEqual(meadowMaterial.surface, "meadow", "wet smooth grassland should classify as meadow");
assert.strictEqual(brushMaterial.surface, "brush", "dry rough grassland should classify as brush");
assert.strictEqual(deepOceanMaterial.surface, "deep water", "deep ocean should classify by water depth");
assert.strictEqual(whitecapMaterial.surface, "whitecap", "shallow rough ocean should classify as whitecap");
assert.strictEqual(rockyDesertMaterial.surface, "rock", "rough desert should classify as rock");
assert.strictEqual(polarTundraMaterial.surface, "snow", "polar high tundra should classify as snow");
assert.strictEqual(roughIceMaterial.surface, "ridge ice", "rough ice should classify as ridge ice");
assert.ok(shorelineRefinement.strength > 0.90, "shoreline refinement should activate at land/ocean tile blends");
assert.ok(shorelineRefinement.oceanWeight > 0.20 && shorelineRefinement.landWeight > 0.20, "shoreline refinement should expose mixed land/ocean weights");
assert.ok(shorelineRefinement.beach > 0.30, "shoreline refinement should expose a beach band");
assert.notStrictEqual(alternateShorelineRefinement.noise, shorelineRefinement.noise, "shoreline refinement should vary by seed");
assert.strictEqual(coastalLandMaterial.surface, "sand", "coastal land should refine into beach material near shoreline");
assert.strictEqual(coastalLandMaterial.feature, "beach", "coastal land should expose beach feature");
assert.strictEqual(coastalOceanMaterial.surface, "open water", "coastal ocean should remain shallow/open water");
assert.strictEqual(coastalOceanMaterial.feature, "shoal water", "coastal ocean should expose shoal feature");
assert.strictEqual(interiorLandMaterial.signals.shorelineStrength, 0, "interior land should not receive shoreline refinement");
assert.strictEqual(interiorLandMaterial.signals.shorelineWater, 0, "interior land should not receive shoreline water pockets");
[meadowMaterial, brushMaterial, deepOceanMaterial, whitecapMaterial, rockyDesertMaterial, polarTundraMaterial, roughIceMaterial, coastalLandMaterial, coastalOceanMaterial, interiorLandMaterial].forEach(function(material) {
  Object.keys(material.signals).forEach(function(key) {
    assert.ok(material.signals[key] >= 0 && material.signals[key] <= 1, "material signal " + key + " should be bounded");
  });
});

var baseGrassMaterial = {
  surface: "grass",
  feature: "field",
  signals: {
    moisture: 0.42,
    wetness: 0.34,
    snow: 0,
    canopyDensity: 0.25,
    surfaceRoughness: 0.22,
    waterDepth: 0,
    chop: 0,
    dryness: 0.40,
    river: 0,
    coast: 0,
    shallowWater: 0,
    ridge: 0
  }
};
var streamAdjustedMaterial = applyPlanetGroundFeatureInfluenceToMaterial(baseGrassMaterial, {
  id: "GF:test:stream",
  type: "stream",
  shape: "line",
  distanceMeters: 0,
  influenceRadiusMeters: 16,
  influence: 1
}, "grassland");
var ridgeAdjustedMaterial = applyPlanetGroundFeatureInfluenceToMaterial(baseGrassMaterial, {
  id: "GF:test:ridge",
  type: "ridge",
  shape: "line",
  distanceMeters: 0,
  influenceRadiusMeters: 16,
  influence: 1
}, "grassland");
var reefAdjustedMaterial = applyPlanetGroundFeatureInfluenceToMaterial(deepOceanMaterial, {
  id: "GF:test:reef",
  type: "reef",
  shape: "line",
  distanceMeters: 0,
  influenceRadiusMeters: 16,
  influence: 1
}, "ocean");

assert.strictEqual(streamAdjustedMaterial.surface, "open water", "stream influence should alter local sample material");
assert.ok(streamAdjustedMaterial.signals.wetness > baseGrassMaterial.signals.wetness, "stream influence should increase wetness");
assert.strictEqual(ridgeAdjustedMaterial.surface, "rock", "ridge influence should alter local sample material");
assert.ok(ridgeAdjustedMaterial.signals.surfaceRoughness > baseGrassMaterial.signals.surfaceRoughness, "ridge influence should increase roughness");
assert.strictEqual(reefAdjustedMaterial.surface, "open water", "reef influence should keep ocean sample shallow/open");
assert.ok(reefAdjustedMaterial.signals.shallowWater > deepOceanMaterial.signals.shallowWater, "reef influence should increase shallow-water signal");

var streamReliefDelta = getPlanetGroundFeatureReliefDeltaMeters({
  type: "stream",
  influence: 1
}, "grassland");
var ridgeReliefDelta = getPlanetGroundFeatureReliefDeltaMeters({
  type: "ridge",
  influence: 1
}, "grassland");
var wetlandReliefDelta = getPlanetGroundFeatureReliefDeltaMeters({
  type: "wetland",
  influence: 1
}, "grassland");
var reefReliefDelta = getPlanetGroundFeatureReliefDeltaMeters({
  type: "reef",
  influence: 1
}, "ocean");
var noReliefDelta = getPlanetGroundFeatureReliefDeltaMeters(null, "grassland");
var broadReliefAdjustment = getPlanetSurfaceFeatureReliefAdjustment(34.2117, -77.7265, 100, "grassland", {
  type: "stream",
  influence: 1
});
var nearReliefAdjustment = getPlanetSurfaceFeatureReliefAdjustment(34.2117, -77.7265, 1, "grassland", {
  type: "stream",
  influence: 1
});
var weakRidgeReliefDelta = getPlanetGroundFeatureReliefDeltaMeters({
  type: "ridge",
  influence: 0.25
}, "grassland");

assert.ok(streamReliefDelta.heightDeltaMeters < -2, "stream relief should carve local terrain down");
assert.ok(ridgeReliefDelta.heightDeltaMeters > 5, "ridge relief should lift local terrain");
assert.ok(ridgeReliefDelta.roughnessBoost > streamReliefDelta.roughnessBoost, "ridge relief should add more roughness than stream relief");
assert.ok(wetlandReliefDelta.flattenAmount > ridgeReliefDelta.flattenAmount, "wetlands should flatten local relief");
assert.ok(reefReliefDelta.heightDeltaMeters > 7, "reef relief should make ocean floor shallower");
assert.strictEqual(noReliefDelta.heightDeltaMeters, 0, "missing feature should not change relief");
assert.strictEqual(broadReliefAdjustment.heightDeltaMeters, 0, "feature relief should be gated off outside close zoom");
assert.ok(nearReliefAdjustment.heightDeltaMeters < 0, "feature relief should apply at meter scale");
assert.ok(weakRidgeReliefDelta.heightDeltaMeters < ridgeReliefDelta.heightDeltaMeters, "feature relief should scale with influence");

world.planetView = {
  zoomLevel: finalGroundZoomIndex,
  latitude: 34.2117,
  longitude: -77.7265
};
var detailTile = {
  biome: "grassland",
  latitude: 34.2117,
  moisture: 1.6,
  elevation: 0.7,
  riverStrength: 0.2,
  coastFactor: 0,
  continentShape: 0.8,
  plateInfluence: 0.65,
  islandArc: 0.2,
  shelfStrength: 0.1,
  seaLevelDelta: 0.4,
  roughness: 0.4,
  ridgeStrength: 0.2,
  highlandLift: 0.2
};
setWorldSeed("PIXEL-2026");
var classifiedDetail = getPlanetSurfaceDetail(34.2117, -77.7265, detailTile);
var repeatedClassifiedDetail = getPlanetSurfaceDetail(34.2117, -77.7265, detailTile);
setWorldSeed("PIXEL-2027");
var alternateClassifiedDetail = getPlanetSurfaceDetail(34.2117, -77.7265, detailTile);
setWorldSeed("PIXEL-2026");

assert.ok(classifiedDetail.materialSignals, "surface detail should expose material signals");
assert.ok(classifiedDetail.regionalContext, "surface detail should expose regional context");
assertNear(classifiedDetail.continentShape, detailTile.continentShape, 1e-12, "surface detail should preserve continent signal");
assertNear(classifiedDetail.plateInfluence, detailTile.plateInfluence, 1e-12, "surface detail should preserve plate signal");
assertNear(classifiedDetail.islandArc, detailTile.islandArc, 1e-12, "surface detail should preserve island arc signal");
assertNear(classifiedDetail.shelfStrength, detailTile.shelfStrength, 1e-12, "surface detail should preserve shelf signal");
assertNear(classifiedDetail.materialSignals.continentShape, detailTile.continentShape, 1e-12, "material signals should preserve continent signal");
assertNear(classifiedDetail.materialSignals.shelfStrength, detailTile.shelfStrength, 1e-12, "material signals should preserve shelf signal");
assert.deepStrictEqual(repeatedClassifiedDetail, classifiedDetail, "surface material detail should be deterministic");
assert.notStrictEqual(alternateClassifiedDetail.microNoise, classifiedDetail.microNoise, "surface material detail should vary by seed");
assert.ok(["meadow", "brush", "grass", "snow"].indexOf(classifiedDetail.surface) >= 0, "grassland detail should classify as a grassland material");

fillPlanetTiles("grassland");
var blendY = Math.floor(WORLD_HEIGHT / 2);
var blendWestX = Math.floor(WORLD_WIDTH / 2);
var blendEastX = blendWestX + 1;
var blendWestTile = getPlanetTile(blendWestX, blendY);
var blendEastTile = getPlanetTile(blendEastX, blendY);

blendWestTile.biome = "desert";
blendWestTile.moisture = 0.1;
blendWestTile.elevation = 0.5;
blendWestTile.roughness = 0.8;
blendWestTile.ridgeStrength = 0.7;
blendEastTile.biome = "forest";
blendEastTile.moisture = 1.8;
blendEastTile.elevation = 0.2;
blendEastTile.roughness = 0.3;
blendEastTile.ridgeStrength = 0.1;

var boundaryLatitude = getPlanetLatitudeForTile(blendY);
var boundaryLongitude = ((blendEastX) / WORLD_WIDTH) * 360 - 180;
var tileBlend = getPlanetSurfaceTileBlend(boundaryLatitude, boundaryLongitude);
var repeatedTileBlend = getPlanetSurfaceTileBlend(boundaryLatitude, boundaryLongitude);
var tileBlendWeightSum = tileBlend.tiles.reduce(function(total, item) {
  return total + item.weight;
}, 0);
var imageryBlendSignals = getPlanetImageryBlendSignals(boundaryLatitude, boundaryLongitude);
var imageryBlendWeightSum = Object.keys(imageryBlendSignals.biomeWeights).reduce(function(total, biome) {
  return total + imageryBlendSignals.biomeWeights[biome];
}, 0);
var nearBoundaryLongitudeOffset = getPlanetTileLongitudeStepDeg() * 0.02;
var nearBoundaryWestImagery = getPlanetImageryRgbAtLatLon(boundaryLatitude, boundaryLongitude - nearBoundaryLongitudeOffset);
var nearBoundaryEastImagery = getPlanetImageryRgbAtLatLon(boundaryLatitude, boundaryLongitude + nearBoundaryLongitudeOffset);
var rawBoundaryJump = rgbDistance(
  getRgbFromHex(getPlanetTileCompositedColor(blendWestTile)),
  getRgbFromHex(getPlanetTileCompositedColor(blendEastTile))
);
var blendedBoundaryJump = rgbDistance(nearBoundaryWestImagery, nearBoundaryEastImagery);

assert.deepStrictEqual(repeatedTileBlend, tileBlend, "surface tile blend should be deterministic");
assertNear(tileBlendWeightSum, 1, 1e-9, "surface tile blend weights");
assert.ok(tileBlend.transitionStrength > 0.45, "surface tile blend should detect tile-boundary transition");
assert.ok(tileBlend.biomeWeights.desert > 0.20, "surface tile blend should include west biome");
assert.ok(tileBlend.biomeWeights.forest > 0.20, "surface tile blend should include east biome");
assertNear(imageryBlendWeightSum, 1, 1e-9, "globe imagery blend weights");
assert.ok(imageryBlendSignals.transitionStrength > 0.45, "globe imagery should detect biome transition strength");
assert.ok(imageryBlendSignals.biomeWeights.desert > 0.20, "globe imagery blend should include west biome");
assert.ok(imageryBlendSignals.biomeWeights.forest > 0.20, "globe imagery blend should include east biome");
assert.ok(imageryBlendSignals.roughness > blendEastTile.roughness, "globe imagery signals should inherit neighboring roughness");
assert.ok(blendedBoundaryJump < rawBoundaryJump * 0.65, "globe imagery should smooth raw square biome jumps");
assertRgbBounds(nearBoundaryWestImagery, "near-boundary west imagery");
assertRgbBounds(nearBoundaryEastImagery, "near-boundary east imagery");
tileBlend.tiles.forEach(function(item) {
  assert.ok(item.weight >= 0 && item.weight <= 1, "surface tile blend item weight should be bounded");
});
["coastFactor", "coastlineNoise", "shallowWater", "shelfStrength", "riverStrength", "ridgeStrength", "roughness", "terrainSlope", "terrainHillshade", "snowSignal"].forEach(function(key) {
  assert.ok(imageryBlendSignals[key] >= 0 && imageryBlendSignals[key] <= 1, "globe imagery signal " + key + " should be bounded");
});
assert.strictEqual(CONFIG.PLANET_CLOUD_ALPHA, 0, "cloud layer should stay disabled while tuning planet surface");

var materialPixelNoise = getPlanetMaterialPixelNoise(12, 34, 18000, 503);
var nearbyMaterialPixelNoise = getPlanetMaterialPixelNoise(12, 34.02, 18000, 503);
var alternateSeedMaterialPixelNoise;

setWorldSeed("PIXEL-2027");
alternateSeedMaterialPixelNoise = getPlanetMaterialPixelNoise(12, 34, 18000, 503);
setWorldSeed("PIXEL-2026");

assertNear(materialPixelNoise * 10, Math.round(materialPixelNoise * 10), 1e-9, "globe material noise should stay quantized");
assert.ok(Math.abs(materialPixelNoise - nearbyMaterialPixelNoise) <= 0.20, "globe material noise should avoid hard square jumps");
assert.notStrictEqual(alternateSeedMaterialPixelNoise, materialPixelNoise, "globe material noise should vary by seed");

var lowlandTerrainBand = getPlanetLandformTerrainBand("grassland", {
  elevation: 0.1,
  moisture: 1.2,
  ridgeStrength: 0.1,
  roughness: 0.1,
  terrainSlope: 0.05,
  terrainHillshade: 0.55,
  coastFactor: 0,
  shallowWater: 0,
  shelfStrength: 0,
  riverStrength: 0
}, { regional: 0.45, fine: 0.55 }, 20);
var repeatedLowlandTerrainBand = getPlanetLandformTerrainBand("grassland", {
  elevation: 0.1,
  moisture: 1.2,
  ridgeStrength: 0.1,
  roughness: 0.1,
  terrainSlope: 0.05,
  terrainHillshade: 0.55,
  coastFactor: 0,
  shallowWater: 0,
  shelfStrength: 0,
  riverStrength: 0
}, { regional: 0.45, fine: 0.55 }, 20);
var highlandTerrainBand = getPlanetLandformTerrainBand("grassland", {
  elevation: 1.8,
  moisture: 1.0,
  ridgeStrength: 0.9,
  roughness: 0.8,
  terrainSlope: 0.7,
  terrainHillshade: 0.25,
  coastFactor: 0,
  shallowWater: 0,
  shelfStrength: 0,
  riverStrength: 0
}, { regional: 0.55, fine: 0.65 }, 20);
var desertTerrainBand = getPlanetLandformTerrainBand("desert", {
  elevation: 0.6,
  moisture: 0.1,
  ridgeStrength: 0.4,
  roughness: 0.6,
  terrainSlope: 0.3,
  terrainHillshade: 0.64,
  coastFactor: 0,
  shallowWater: 0,
  shelfStrength: 0,
  riverStrength: 0
}, { regional: 0.62, fine: 0.58 }, 24);
var shelfTerrainBand = getPlanetLandformTerrainBand("ocean", {
  elevation: -0.15,
  moisture: 1,
  ridgeStrength: 0,
  roughness: 0.1,
  terrainSlope: 0,
  terrainHillshade: 0.55,
  coastFactor: 0.8,
  shallowWater: 1,
  shelfStrength: 0.8,
  riverStrength: 0
}, { regional: 0.5, fine: 0.5 }, 0);

assert.deepStrictEqual(repeatedLowlandTerrainBand, lowlandTerrainBand, "landform terrain bands should be deterministic");
assert.ok(highlandTerrainBand.relief > lowlandTerrainBand.relief + 0.45, "landform terrain bands should respond to highland relief");
assert.ok(highlandTerrainBand.amount > lowlandTerrainBand.amount, "highland terrain bands should carry stronger tint");
assert.notStrictEqual(desertTerrainBand.color, lowlandTerrainBand.color, "terrain bands should keep biome-specific color targets");
assert.ok(shelfTerrainBand.color !== "#021631", "shelf terrain band should not use deep-ocean color");
[lowlandTerrainBand, highlandTerrainBand, desertTerrainBand, shelfTerrainBand].forEach(function(band) {
  assert.ok(band.amount >= 0 && band.amount <= 0.28, "terrain band tint amount should stay bounded");
  assert.ok(band.relief >= 0 && band.relief <= 1, "terrain band relief should stay bounded");
  assert.ok(band.bandNoise >= 0 && band.bandNoise <= 1, "terrain band noise should stay bounded");
});

fillPlanetTiles("ocean");
var oceanImageryTile = getPlanetTile(Math.floor(WORLD_WIDTH / 2), Math.floor(WORLD_HEIGHT / 2));
oceanImageryTile.elevation = -2.8;
oceanImageryTile.shallowWater = 0;
oceanImageryTile.coastFactor = 0;
var deepOceanImagery = getPlanetImageryRgbAtLatLon(oceanImageryTile.latitude, oceanImageryTile.longitude);
oceanImageryTile.elevation = -0.15;
oceanImageryTile.shallowWater = 1;
oceanImageryTile.coastFactor = 0.8;
var shelfOceanImagery = getPlanetImageryRgbAtLatLon(oceanImageryTile.latitude, oceanImageryTile.longitude);

fillPlanetTiles("forest");
var forestImageryTile = getPlanetTile(Math.floor(WORLD_WIDTH / 2), Math.floor(WORLD_HEIGHT / 2));
forestImageryTile.moisture = 1.8;
forestImageryTile.elevation = 0.2;
var forestImagery = getPlanetImageryRgbAtLatLon(forestImageryTile.latitude, forestImageryTile.longitude);

fillPlanetTiles("desert");
var desertImageryTile = getPlanetTile(Math.floor(WORLD_WIDTH / 2), Math.floor(WORLD_HEIGHT / 2));
desertImageryTile.moisture = 0.1;
desertImageryTile.elevation = 0.4;
desertImageryTile.roughness = 0.5;
var desertImagery = getPlanetImageryRgbAtLatLon(desertImageryTile.latitude, desertImageryTile.longitude);

assert.ok(deepOceanImagery.blue > deepOceanImagery.red * 1.8, "deep ocean imagery should read blue, not gray");
assert.ok(rgbDistance(shelfOceanImagery, deepOceanImagery) > 24, "shallow shelves should separate visually from deep ocean");
assert.ok(shelfOceanImagery.green > deepOceanImagery.green, "shallow shelves should brighten green channel");
assert.ok(forestImagery.green > forestImagery.red && forestImagery.green > forestImagery.blue, "forest imagery should read green");
assert.ok(desertImagery.red > desertImagery.blue * 1.35 && desertImagery.green > desertImagery.blue * 1.15, "desert imagery should read warm and dry");
[deepOceanImagery, shelfOceanImagery, forestImagery, desertImagery].forEach(function(rgb) {
  assertRgbBounds(rgb, "earthlike globe imagery");
});

fillPlanetTiles("grassland");

var boundarySample = {
  biome: "forest",
  tile: blendEastTile,
  tileBlend: tileBlend,
  detail: {
    surface: "woodland",
    shade: 0.55,
    elevation: 0.5,
    roughness: 0.2,
    hillshade: 0.72,
    heightMeters: 300,
    slope: 0.08,
    materialSignals: {
      snow: 0
    }
  }
};
var unblendedBoundarySample = {
  biome: boundarySample.biome,
  tile: boundarySample.tile,
  detail: boundarySample.detail
};
var blendedBoundaryColor = getPlanetSurfaceColor(boundarySample);
var unblendedBoundaryColor = getPlanetSurfaceColor(unblendedBoundarySample);
var blendTargetRgb = getPlanetSurfaceTileBlendRgb(tileBlend);

assert.ok(colorDistance(blendedBoundaryColor, unblendedBoundaryColor) > 2, "biome transition should alter local surface color");
assert.ok(
  rgbDistance(getRgbFromHex(blendedBoundaryColor), blendTargetRgb) < rgbDistance(getRgbFromHex(unblendedBoundaryColor), blendTargetRgb),
  "biome transition should move local color toward neighboring tile blend"
);

var whitecapBoundarySample = {
  biome: "ocean",
  tile: Object.assign({}, blendEastTile, { biome: "ocean", shallowWater: 1, coastFactor: 0.5 }),
  tileBlend: tileBlend,
  detail: Object.assign({}, boundarySample.detail, {
    surface: "whitecap",
    heightMeters: -80,
    materialSignals: {
      snow: 0
    }
  })
};
var whitecapUnblendedSample = {
  biome: whitecapBoundarySample.biome,
  tile: whitecapBoundarySample.tile,
  detail: whitecapBoundarySample.detail
};

assert.ok(
  colorDistance(getPlanetSurfaceColor(whitecapBoundarySample), getPlanetSurfaceColor(whitecapUnblendedSample)) <
    colorDistance(blendedBoundaryColor, unblendedBoundaryColor),
  "strong local surfaces should be protected from full biome blending"
);

var texturedGrassSample = {
  biome: "grassland",
  surfaceSampleX: 12045,
  surfaceSampleY: 8091,
  surfaceSampleMeters: 1,
  detail: {
    surface: "grass",
    roughness: 0.62,
    slope: 0.34,
    sampleMeters: 1
  }
};
var texturedWaterSample = {
  biome: "ocean",
  surfaceSampleX: 12045,
  surfaceSampleY: 8091,
  surfaceSampleMeters: 1,
  detail: {
    surface: "open water",
    roughness: 0.62,
    slope: 0.34,
    sampleMeters: 1
  }
};
var coarseTexturedGrassSample = Object.assign({}, texturedGrassSample, {
  surfaceSampleMeters: 100,
  detail: Object.assign({}, texturedGrassSample.detail, {
    sampleMeters: 100
  })
});
var featureTexturedGrassSample = Object.assign({}, texturedGrassSample, {
  detail: Object.assign({}, texturedGrassSample.detail, {
    groundFeature: {
      type: "ridge",
      influence: 1
    },
    featureRelief: {
      roughnessBoost: 0.7
    }
  })
});
var slopedRockSample = {
  biome: "desert",
  surfaceSampleX: 12045,
  surfaceSampleY: 8091,
  surfaceSampleMeters: 1,
  detail: {
    surface: "rock",
    roughness: 0.82,
    slope: 0.58,
    aspect: 12,
    hillshade: 0.34,
    heightMeters: 1420,
    sampleMeters: 1,
    featureRelief: {
      roughnessBoost: 0.28
    }
  }
};
var alternateAspectRockSample = Object.assign({}, slopedRockSample, {
  detail: Object.assign({}, slopedRockSample.detail, {
    aspect: 102
  })
});
var flatReliefSample = {
  biome: "grassland",
  surfaceSampleX: 12045,
  surfaceSampleY: 8091,
  surfaceSampleMeters: 1,
  detail: {
    surface: "grass",
    roughness: 0.04,
    slope: 0.02,
    aspect: 0,
    hillshade: 0.72,
    heightMeters: 120,
    sampleMeters: 1
  }
};
var coarseReliefSample = Object.assign({}, slopedRockSample, {
  surfaceSampleMeters: 25,
  detail: Object.assign({}, slopedRockSample.detail, {
    sampleMeters: 25
  })
});

setWorldSeed("PIXEL-2026");
var grassMicrotexture = getPlanetSurfaceMicrotextureSwatches(texturedGrassSample, "#2f6531");
var repeatedGrassMicrotexture = getPlanetSurfaceMicrotextureSwatches(texturedGrassSample, "#2f6531");
var waterMicrotexture = getPlanetSurfaceMicrotextureSwatches(texturedWaterSample, "#08365f");
var coarseGrassMicrotexture = getPlanetSurfaceMicrotextureSwatches(coarseTexturedGrassSample, "#2f6531");
var featureGrassMicrotexture = getPlanetSurfaceMicrotextureSwatches(featureTexturedGrassSample, "#2f6531");
var grassFinePixels = getPlanetSurfaceFinePixelSwatches(texturedGrassSample, "#2f6531");
var repeatedGrassFinePixels = getPlanetSurfaceFinePixelSwatches(texturedGrassSample, "#2f6531");
var waterFinePixels = getPlanetSurfaceFinePixelSwatches(texturedWaterSample, "#08365f");
var coarseGrassFinePixels = getPlanetSurfaceFinePixelSwatches(coarseTexturedGrassSample, "#2f6531");
var featureGrassFinePixels = getPlanetSurfaceFinePixelSwatches(featureTexturedGrassSample, "#2f6531");
var grassSilhouetteBreakup = getPlanetSurfaceSilhouetteBreakupSwatches(texturedGrassSample, "#2f6531");
var repeatedGrassSilhouetteBreakup = getPlanetSurfaceSilhouetteBreakupSwatches(texturedGrassSample, "#2f6531");
var waterSilhouetteBreakup = getPlanetSurfaceSilhouetteBreakupSwatches(texturedWaterSample, "#08365f");
var coarseGrassSilhouetteBreakup = getPlanetSurfaceSilhouetteBreakupSwatches(coarseTexturedGrassSample, "#2f6531");
var featureGrassSilhouetteBreakup = getPlanetSurfaceSilhouetteBreakupSwatches(featureTexturedGrassSample, "#2f6531");
var rockReliefAccents = getPlanetSurfaceReliefAccentSwatches(slopedRockSample, "#665226");
var repeatedRockReliefAccents = getPlanetSurfaceReliefAccentSwatches(slopedRockSample, "#665226");
var alternateAspectReliefAccents = getPlanetSurfaceReliefAccentSwatches(alternateAspectRockSample, "#665226");
var flatReliefAccents = getPlanetSurfaceReliefAccentSwatches(flatReliefSample, "#2f6531");
var coarseReliefAccents = getPlanetSurfaceReliefAccentSwatches(coarseReliefSample, "#665226");
setWorldSeed("PIXEL-2027");
var alternateSeedMicrotexture = getPlanetSurfaceMicrotextureSwatches(texturedGrassSample, "#2f6531");
var alternateSeedFinePixels = getPlanetSurfaceFinePixelSwatches(texturedGrassSample, "#2f6531");
var alternateSeedSilhouetteBreakup = getPlanetSurfaceSilhouetteBreakupSwatches(texturedGrassSample, "#2f6531");
var alternateSeedReliefAccents = getPlanetSurfaceReliefAccentSwatches(slopedRockSample, "#665226");
setWorldSeed("PIXEL-2026");

assert.ok(grassMicrotexture.length > 0, "local surface microtexture should add sub-sample swatches");
assert.deepStrictEqual(repeatedGrassMicrotexture, grassMicrotexture, "local surface microtexture should be deterministic");
assert.notDeepStrictEqual(alternateSeedMicrotexture, grassMicrotexture, "local surface microtexture should vary by seed");
assert.notStrictEqual(waterMicrotexture[0].color, grassMicrotexture[0].color, "microtexture color should vary by surface");
assert.deepStrictEqual(coarseGrassMicrotexture, [], "broad local samples should not spend render work on microtexture swatches");
assert.ok(featureGrassMicrotexture.length >= grassMicrotexture.length, "feature relief should strengthen close-ground microtexture");
grassMicrotexture.concat(waterMicrotexture).forEach(function(swatch) {
  assertRgbBounds(getRgbFromHex(swatch.color), "microtexture swatch");
  assert.ok(swatch.x >= 0 && swatch.x < CONFIG.TILE_SIZE, "microtexture x should fit inside cell");
  assert.ok(swatch.y >= 0 && swatch.y < CONFIG.TILE_SIZE, "microtexture y should fit inside cell");
  assert.ok(swatch.size >= 1 && swatch.size <= CONFIG.TILE_SIZE, "microtexture size should fit inside cell");
  assert.ok(swatch.width >= 1 && swatch.width <= CONFIG.TILE_SIZE, "microtexture width should fit inside cell");
  assert.ok(swatch.height >= 1 && swatch.height <= CONFIG.TILE_SIZE, "microtexture height should fit inside cell");
  assert.ok(swatch.x + swatch.width <= CONFIG.TILE_SIZE, "microtexture width should stay in cell");
  assert.ok(swatch.y + swatch.height <= CONFIG.TILE_SIZE, "microtexture height should stay in cell");
});
assert.ok(grassFinePixels.length > 0, "close surface fine pixels should break up flat meter cells");
assert.ok(grassFinePixels.length <= 11, "close surface fine pixel count should stay bounded");
assert.deepStrictEqual(repeatedGrassFinePixels, grassFinePixels, "close surface fine pixels should be deterministic");
assert.notDeepStrictEqual(alternateSeedFinePixels, grassFinePixels, "close surface fine pixels should vary by seed");
assert.notStrictEqual(waterFinePixels[0].color, grassFinePixels[0].color, "fine pixel color should vary by surface");
assert.deepStrictEqual(coarseGrassFinePixels, [], "broad local samples should skip fine pixel texture");
assert.ok(featureGrassFinePixels.length >= grassFinePixels.length, "feature relief should strengthen fine pixel texture");
grassFinePixels.concat(waterFinePixels).forEach(function(swatch) {
  assertRgbBounds(getRgbFromHex(swatch.color), "fine pixel swatch");
  assert.ok(swatch.alpha > 0 && swatch.alpha <= 0.46, "fine pixel alpha should stay subdued");
  assert.ok(swatch.x >= 0 && swatch.x < CONFIG.TILE_SIZE, "fine pixel x should fit inside cell");
  assert.ok(swatch.y >= 0 && swatch.y < CONFIG.TILE_SIZE, "fine pixel y should fit inside cell");
  assert.ok(swatch.width >= 1 && swatch.width <= 2, "fine pixel width should stay small");
  assert.ok(swatch.height >= 1 && swatch.height <= 2, "fine pixel height should stay small");
  assert.ok(swatch.x + swatch.width <= CONFIG.TILE_SIZE, "fine pixel width should stay in cell");
  assert.ok(swatch.y + swatch.height <= CONFIG.TILE_SIZE, "fine pixel height should stay in cell");
});
assert.ok(grassSilhouetteBreakup.length > 0, "close surface silhouette breakup should add edge swatches");
assert.ok(grassSilhouetteBreakup.length <= 6, "silhouette breakup count should stay bounded");
assert.deepStrictEqual(repeatedGrassSilhouetteBreakup, grassSilhouetteBreakup, "silhouette breakup should be deterministic");
assert.notDeepStrictEqual(alternateSeedSilhouetteBreakup, grassSilhouetteBreakup, "silhouette breakup should vary by seed");
assert.notStrictEqual(waterSilhouetteBreakup[0].color, grassSilhouetteBreakup[0].color, "silhouette breakup color should vary by surface");
assert.deepStrictEqual(coarseGrassSilhouetteBreakup, [], "broad local samples should skip silhouette breakup");
assert.ok(featureGrassSilhouetteBreakup.length >= grassSilhouetteBreakup.length, "feature relief should strengthen silhouette breakup");
assert.ok(
  grassSilhouetteBreakup.some(function(swatch) { return swatch.x === 0 || swatch.y === 0 || swatch.x + swatch.width === CONFIG.TILE_SIZE || swatch.y + swatch.height === CONFIG.TILE_SIZE; }),
  "silhouette breakup should hug meter-cell edges"
);
grassSilhouetteBreakup.concat(waterSilhouetteBreakup).forEach(function(swatch) {
  assertRgbBounds(getRgbFromHex(swatch.color), "silhouette breakup swatch");
  assert.ok(swatch.alpha > 0 && swatch.alpha <= 0.42, "silhouette breakup alpha should stay subdued");
  assert.ok(swatch.x >= 0 && swatch.x < CONFIG.TILE_SIZE, "silhouette breakup x should fit inside cell");
  assert.ok(swatch.y >= 0 && swatch.y < CONFIG.TILE_SIZE, "silhouette breakup y should fit inside cell");
  assert.ok(swatch.width >= 1 && swatch.width <= CONFIG.TILE_SIZE, "silhouette breakup width should fit inside cell");
  assert.ok(swatch.height >= 1 && swatch.height <= CONFIG.TILE_SIZE, "silhouette breakup height should fit inside cell");
  assert.ok(swatch.x + swatch.width <= CONFIG.TILE_SIZE, "silhouette breakup width should stay in cell");
  assert.ok(swatch.y + swatch.height <= CONFIG.TILE_SIZE, "silhouette breakup height should stay in cell");
  assert.ok(swatch.side >= 0 && swatch.side <= 3, "silhouette breakup should expose source side");
});
assert.ok(rockReliefAccents.length > 0, "sloped close terrain should receive relief accents");
assert.ok(rockReliefAccents.length <= 8, "relief accent count should stay bounded");
assert.deepStrictEqual(repeatedRockReliefAccents, rockReliefAccents, "relief accents should be deterministic");
assert.notDeepStrictEqual(alternateSeedReliefAccents, rockReliefAccents, "relief accents should vary by seed");
assert.notDeepStrictEqual(alternateAspectReliefAccents, rockReliefAccents, "relief accents should vary by terrain aspect");
assert.deepStrictEqual(flatReliefAccents, [], "flat close terrain should skip relief accents");
assert.deepStrictEqual(coarseReliefAccents, [], "coarse terrain should skip relief accents");
assert.ok(
  rockReliefAccents.some(function(swatch) { return swatch.width !== swatch.height; }),
  "relief accents should form directional strips"
);
rockReliefAccents.forEach(function(swatch) {
  assertRgbBounds(getRgbFromHex(swatch.color), "relief accent swatch");
  assert.ok(swatch.alpha > 0 && swatch.alpha <= 0.48, "relief accent alpha should stay subdued");
  assert.ok(swatch.x >= 0 && swatch.x < CONFIG.TILE_SIZE, "relief accent x should fit inside cell");
  assert.ok(swatch.y >= 0 && swatch.y < CONFIG.TILE_SIZE, "relief accent y should fit inside cell");
  assert.ok(swatch.width >= 1 && swatch.width <= CONFIG.TILE_SIZE, "relief accent width should fit inside cell");
  assert.ok(swatch.height >= 1 && swatch.height <= CONFIG.TILE_SIZE, "relief accent height should fit inside cell");
  assert.ok(swatch.x + swatch.width <= CONFIG.TILE_SIZE, "relief accent width should stay in cell");
  assert.ok(swatch.y + swatch.height <= CONFIG.TILE_SIZE, "relief accent height should stay in cell");
  assert.strictEqual(swatch.aspect, 12, "relief accent should expose source aspect");
});

var edgeAccentSample = Object.assign({}, boundarySample, {
  surfaceSampleMeters: 1,
  detail: Object.assign({}, boundarySample.detail, {
    sampleMeters: 1,
    groundFeature: {
      type: "stream",
      influence: 0.7
    },
    featureRelief: {
      roughnessBoost: 0.2
    }
  })
});
var edgeAccents = getPlanetSurfaceEdgeAccentSwatches(edgeAccentSample, blendedBoundaryColor);
var repeatedEdgeAccents = getPlanetSurfaceEdgeAccentSwatches(edgeAccentSample, blendedBoundaryColor);
var flatEdgeAccents = getPlanetSurfaceEdgeAccentSwatches({
  biome: "grassland",
  detail: {
    surface: "grass",
    sampleMeters: 1
  }
}, "#2f6531");

assert.ok(edgeAccents.length > 0, "local surface edge accents should soften material/feature seams");
assert.deepStrictEqual(repeatedEdgeAccents, edgeAccents, "local surface edge accents should be deterministic");
assert.deepStrictEqual(flatEdgeAccents, [], "flat samples without seams or features should skip edge accents");
edgeAccents.forEach(function(swatch) {
  assertRgbBounds(getRgbFromHex(swatch.color), "edge accent swatch");
  assert.ok(swatch.alpha > 0 && swatch.alpha <= 0.52, "edge accent alpha should stay subdued");
  assert.ok(swatch.x >= 0 && swatch.x < CONFIG.TILE_SIZE, "edge accent x should fit inside cell");
  assert.ok(swatch.y >= 0 && swatch.y < CONFIG.TILE_SIZE, "edge accent y should fit inside cell");
  assert.ok(swatch.width >= 1 && swatch.width <= CONFIG.TILE_SIZE, "edge accent width should fit inside cell");
  assert.ok(swatch.height >= 1 && swatch.height <= CONFIG.TILE_SIZE, "edge accent height should fit inside cell");
  assert.ok(swatch.x + swatch.width <= CONFIG.TILE_SIZE, "edge accent width should stay in cell");
  assert.ok(swatch.y + swatch.height <= CONFIG.TILE_SIZE, "edge accent height should stay in cell");
});

setWorldSeed("PIXEL-2026");
var smoothNoiseA = getSurfaceLayerNoise({ eastMeters: 12351.8, northMeters: 67891.2 }, 64, 11);
var smoothNoiseB = getSurfaceLayerNoise({ eastMeters: 12352.2, northMeters: 67891.2 }, 64, 11);
var smoothNoiseC = getSurfaceLayerNoise({ eastMeters: 12384.0, northMeters: 67891.2 }, 64, 11);
var repeatedSmoothNoiseA = getSurfaceLayerNoise({ eastMeters: 12351.8, northMeters: 67891.2 }, 64, 11);
setWorldSeed("PIXEL-2027");
var alternateSeedNoiseA = getSurfaceLayerNoise({ eastMeters: 12351.8, northMeters: 67891.2 }, 64, 11);
setWorldSeed("PIXEL-2026");
var localLowlandHeight = getPlanetSurfaceHeightMeters(34.2117, -77.7265, {
  biome: "grassland",
  elevation: 0.6,
  ridgeStrength: 0,
  roughness: 0,
  highlandLift: 0
});
var localHighlandHeight = getPlanetSurfaceHeightMeters(34.2117, -77.7265, {
  biome: "grassland",
  elevation: 0.6,
  ridgeStrength: 1,
  roughness: 1,
  highlandLift: 1.2
});
var regionalLowlandLod = getPlanetGroundLod(34.2117, -77.7265, 1, {
  biome: "grassland",
  elevation: 0.6,
  continentShape: 0.05,
  plateInfluence: 0.04,
  islandArc: 0,
  shelfStrength: 0,
  coastFactor: 0,
  highlandLift: 0
});
var regionalHighlandLod = getPlanetGroundLod(34.2117, -77.7265, 1, {
  biome: "grassland",
  elevation: 0.6,
  continentShape: 1,
  plateInfluence: 0.9,
  islandArc: 0.45,
  shelfStrength: 0,
  coastFactor: 0,
  highlandLift: 1.1
});
var regionalDeepOceanHeight = getPlanetSurfaceHeightMeters(34.2117, -77.7265, {
  biome: "ocean",
  elevation: -1.6,
  shallowWater: 0,
  shelfStrength: 0,
  coastFactor: 0,
  islandArc: 0
}, 1);
var regionalShelfOceanHeight = getPlanetSurfaceHeightMeters(34.2117, -77.7265, {
  biome: "ocean",
  elevation: -1.6,
  shallowWater: 0.9,
  shelfStrength: 0.9,
  coastFactor: 0.8,
  islandArc: 0.35
}, 1);
var regionalIslandHeight = getPlanetSurfaceHeightMeters(34.2117, -77.7265, {
  biome: "grassland",
  elevation: 0.15,
  continentShape: 0.25,
  plateInfluence: 0.12,
  islandArc: 0.9,
  shelfStrength: 0.35,
  coastFactor: 0.6,
  highlandLift: 0.15
}, 1);
var regionalPlainHeight = getPlanetSurfaceHeightMeters(34.2117, -77.7265, {
  biome: "grassland",
  elevation: 0.15,
  continentShape: 0.25,
  plateInfluence: 0.12,
  islandArc: 0,
  shelfStrength: 0.35,
  coastFactor: 0.6,
  highlandLift: 0.15
}, 1);

assertNear(repeatedSmoothNoiseA, smoothNoiseA, 1e-12, "local smooth noise should be deterministic");
assert.ok(Math.abs(smoothNoiseA - smoothNoiseB) < 0.04, "local smooth noise should avoid hard meter-cell discontinuities");
assert.ok(Math.abs(smoothNoiseA - smoothNoiseC) > 0.00001, "local smooth noise should still vary across a patch");
assert.ok(Math.abs(alternateSeedNoiseA - smoothNoiseA) > 0.00001, "local smooth noise should vary by seed");
assert.ok(localHighlandHeight > localLowlandHeight + 100, "local relief should inherit planet-scale highland lift");
assert.ok(regionalHighlandLod.elevation > regionalLowlandLod.elevation, "local LOD should preserve regional continent/highland elevation context");
assert.ok(regionalHighlandLod.roughness > regionalLowlandLod.roughness, "local LOD should preserve island/highland roughness context");
assert.ok(regionalHighlandLod.regional.continentShape > regionalLowlandLod.regional.continentShape, "local LOD should expose regional continent shape");
assert.ok(regionalShelfOceanHeight > regionalDeepOceanHeight + 1200, "local ocean relief should preserve shallow shelf context");
assert.ok(regionalIslandHeight > regionalPlainHeight + 80, "local land relief should preserve island arc context");

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
assert.ok(centerTile.shelfStrength > 0, "coastal land should expose shelf strength");
assert.ok(oceanTile.shelfStrength > 0, "shallow ocean should expose shelf strength");
assert.ok(Number.isFinite(centerTile.coastlineNoise), "coastline noise should be finite");
assert.ok(highTile.waterFlow > 0, "land tiles should accumulate rainfall flow");
assert.ok(highTile.flowDirectionX !== 0 || highTile.flowDirectionY !== 0, "high land should route downhill");
assert.ok(Number.isFinite(centerTile.terrainSlope), "terrain relief should include slope");
assert.ok(Number.isFinite(centerTile.terrainHillshade), "terrain relief should include hillshade");
assert.ok(centerTile.terrainSlope >= 0 && centerTile.terrainSlope <= 1, "terrain slope should be normalized");
assert.ok(centerTile.terrainHillshade >= 0 && centerTile.terrainHillshade <= 1, "terrain hillshade should be normalized");

var blockCenter = getLatLonFromSurfaceMeterCoordinate(
  getPlanetGroundFeatureBlockMeters() / 2,
  getPlanetGroundFeatureBlockMeters() / 2
);
var blockTilePosition = getTileFromLatLon(blockCenter.latitude, blockCenter.longitude);
var blockTile = getPlanetTile(blockTilePosition.x, blockTilePosition.y);

blockTile.biome = "grassland";
blockTile.riverStrength = 1;
blockTile.moisture = 2.2;
blockTile.ridgeStrength = 0;
blockTile.roughness = 0;
blockTile.highlandLift = 0;
blockTile.flowDirectionX = 1;
blockTile.flowDirectionY = 0;
blockTile.terrainAspect = 45;

resetPlanetGroundFeatureBlockCache();
var wetBlockFeatures = getPlanetGroundFeatureBlock(0, 0, getPlanetGroundFeatureBlockMeters());
var repeatedWetBlockFeatures = getPlanetGroundFeatureBlock(0, 0, getPlanetGroundFeatureBlockMeters());
var groundFeatureCacheStats = getPlanetGroundFeatureBlockCacheStats();
setWorldSeed("PIXEL-2027");
var alternateSeedWetBlockFeatures = getPlanetGroundFeatureBlock(0, 0, getPlanetGroundFeatureBlockMeters());
setWorldSeed("PIXEL-2026");

assert.ok(wetBlockFeatures.some(function(feature) { return feature.type === "stream"; }), "wet land blocks should generate stream detail");
assert.ok(wetBlockFeatures.some(function(feature) { return feature.type === "wetland"; }), "wet land blocks should generate wetland patches");
var wetStreamFeature = wetBlockFeatures.filter(function(feature) { return feature.type === "stream"; })[0];
var wetlandFeature = wetBlockFeatures.filter(function(feature) { return feature.type === "wetland"; })[0];
assert.strictEqual(wetStreamFeature.orientationSource, "flow", "stream detail should inherit parent tile flow direction");
assert.ok(
  getPlanetLineAngleDifferenceRadians(wetStreamFeature.angleRadians, getPlanetTileFlowAngleRadians(blockTile)) < 0.35,
  "stream detail should align with parent tile flow direction"
);
assert.strictEqual(wetlandFeature.orientationSource, "flow", "wetland patches should inherit parent tile flow direction");
assert.deepStrictEqual(repeatedWetBlockFeatures, wetBlockFeatures, "cached ground feature blocks should be deterministic");
assert.ok(groundFeatureCacheStats.hits >= 1, "ground feature block cache should record repeated hits");
assert.notDeepStrictEqual(alternateSeedWetBlockFeatures, wetBlockFeatures, "ground feature blocks should vary by seed");
assert.ok(wetBlockFeatures.filter(function(feature) { return feature.shape === "line"; }).every(function(feature) {
  return Array.isArray(feature.bends) && feature.bends.length >= 3;
}), "line features should include deterministic bend metadata");
assert.ok(wetBlockFeatures.filter(function(feature) { return feature.shape === "rect"; }).every(function(feature) {
  return Array.isArray(feature.patchPoints) && feature.patchPoints.length >= 6;
}), "patch features should include irregular render metadata");
assert.deepStrictEqual(
  getPlanetGroundFeatureBlock(0, 0, getPlanetGroundFeatureBlockMeters()),
  wetBlockFeatures,
  "organic feature geometry should be deterministic"
);

blockTile.riverStrength = 0;
blockTile.moisture = 0.4;
blockTile.ridgeStrength = 1;
blockTile.roughness = 1;
blockTile.highlandLift = 1.2;
blockTile.flowDirectionX = 0;
blockTile.flowDirectionY = 0;
blockTile.terrainAspect = 0;

resetPlanetGroundFeatureBlockCache();
var highlandBlockFeatures = getPlanetGroundFeatureBlock(0, 0, getPlanetGroundFeatureBlockMeters());
var highlandRidgeFeature = highlandBlockFeatures.filter(function(feature) { return feature.type === "ridge"; })[0];
var rockfieldFeature = highlandBlockFeatures.filter(function(feature) { return feature.type === "rockfield"; })[0];

assert.ok(highlandBlockFeatures.some(function(feature) { return feature.type === "ridge"; }), "highland blocks should generate ridge detail");
assert.ok(highlandBlockFeatures.some(function(feature) { return feature.type === "rockfield"; }), "rough highland blocks should generate rockfield patches");
assert.strictEqual(highlandRidgeFeature.orientationSource, "ridge", "ridge detail should inherit parent terrain aspect");
assert.ok(
  getPlanetLineAngleDifferenceRadians(highlandRidgeFeature.angleRadians, getPlanetTileRidgeAngleRadians(blockTile)) < 0.35,
  "ridge detail should align with parent terrain aspect"
);
assert.strictEqual(rockfieldFeature.orientationSource, "ridge", "rockfields should inherit parent terrain aspect");
assert.ok(
  getPlanetLineAngleDifferenceRadians(rockfieldFeature.rotation, getPlanetTileRidgeAngleRadians(blockTile)) < 0.35,
  "rockfield patches should align with parent terrain aspect"
);
assert.ok(highlandBlockFeatures.every(function(feature) { return feature.type !== "track" && feature.type !== "structure"; }), "highland detail should stay natural");
assert.ok(highlandBlockFeatures.filter(function(feature) { return feature.type === "rockfield"; }).every(function(feature) {
  return Array.isArray(feature.patchPoints) && feature.patchPoints.some(function(point) {
    return Math.abs(point.x) !== Math.abs(point.y);
  });
}), "rockfields should render as irregular patches");

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
assert.ok(groundFeatures.some(function(feature) { return feature.shape === "rect"; }), "ground features should include natural area patches");
assert.ok(groundFeatures.every(function(feature) { return /^GF:/.test(feature.id); }), "ground features should have stable ids");
assert.ok(groundFeatures.every(function(feature) { return feature.type !== "track" && feature.type !== "structure"; }), "undeveloped ground features should not imply built infrastructure");

var lineFeature = groundFeatures.filter(function(feature) { return feature.shape === "line"; })[0];
var lineMidpoint = getLatLonFromSurfaceMeterCoordinate(
  (lineFeature.east1 + lineFeature.east2) / 2,
  (lineFeature.north1 + lineFeature.north2) / 2
);
var nearestLineFeature = getNearestPlanetGroundFeature(lineMidpoint.latitude, lineMidpoint.longitude, 16);
var lineDx = lineFeature.east2 - lineFeature.east1;
var lineDy = lineFeature.north2 - lineFeature.north1;
var lineLength = Math.sqrt(lineDx * lineDx + lineDy * lineDy) || 1;
var lineNormalEast = -lineDy / lineLength;
var lineNormalNorth = lineDx / lineLength;
var centerFeatureInfluence = getPlanetSurfaceGroundFeatureInfluence(lineMidpoint.latitude, lineMidpoint.longitude, 1);
var outerFeatureInfluencePoint = getLatLonFromSurfaceMeterCoordinate(
  (lineFeature.east1 + lineFeature.east2) / 2 + lineNormalEast * 12,
  (lineFeature.north1 + lineFeature.north2) / 2 + lineNormalNorth * 12
);
var outerFeatureInfluence = getPlanetSurfaceGroundFeatureInfluence(outerFeatureInfluencePoint.latitude, outerFeatureInfluencePoint.longitude, 1);

assert.ok(nearestLineFeature, "nearest feature query should find a line feature");
assert.strictEqual(nearestLineFeature.id, lineFeature.id, "nearest line feature id should match");
assertNear(nearestLineFeature.distanceMeters, 0, 1e-9, "nearest line distance");
assert.ok(getPlanetGroundFeatureDimensionLabel(nearestLineFeature).indexOf("m") > 0, "nearest line should have dimensions");
assert.ok(centerFeatureInfluence, "local surface samples should receive nearest ground feature influence");
assert.strictEqual(centerFeatureInfluence.id, lineFeature.id, "feature influence should preserve nearest feature id");
assert.ok(centerFeatureInfluence.influence > 0.90, "feature influence should be strongest at feature center");
assert.ok(
  (outerFeatureInfluence ? outerFeatureInfluence.influence : 0) < centerFeatureInfluence.influence,
  "feature influence should fall off with distance"
);

world.planetView = {
  zoomLevel: finalGroundZoomIndex,
  latitude: lineMidpoint.latitude,
  longitude: lineMidpoint.longitude
};

var lineReliefTile = Object.assign({}, getPlanetTile(getTileFromLatLon(lineMidpoint.latitude, lineMidpoint.longitude).x, getTileFromLatLon(lineMidpoint.latitude, lineMidpoint.longitude).y), {
  biome: lineFeature.type === "reef" || lineFeature.type === "shoal" ? "ocean" : "grassland",
  elevation: 0.6,
  moisture: 1.5,
  riverStrength: lineFeature.type === "stream" ? 1 : 0,
  roughness: lineFeature.type === "ridge" || lineFeature.type === "rockfield" ? 1 : 0.3,
  ridgeStrength: lineFeature.type === "ridge" || lineFeature.type === "rockfield" ? 1 : 0.2,
  highlandLift: lineFeature.type === "ridge" || lineFeature.type === "rockfield" ? 1.1 : 0
});
var lineBaseHeight = getPlanetSurfaceHeightMeters(lineMidpoint.latitude, lineMidpoint.longitude, lineReliefTile, 100);
var lineFeatureHeight = getPlanetSurfaceHeightMeters(lineMidpoint.latitude, lineMidpoint.longitude, lineReliefTile, 1);
var lineFeatureRelief = getPlanetSurfaceRelief(lineMidpoint.latitude, lineMidpoint.longitude, lineReliefTile);

assert.ok(lineFeatureRelief.featureRelief, "surface relief should expose feature relief adjustment");
assert.strictEqual(lineFeatureRelief.featureRelief.groundFeature.id, lineFeature.id, "surface relief should use nearest feature");
assert.ok(Math.abs(lineFeatureHeight - lineBaseHeight) > 0.1, "feature relief should change local height");
assertNear(lineFeatureRelief.heightMeters, lineFeatureHeight, 1e-9, "surface relief center height should use feature-aware height");
assert.ok(Number.isFinite(lineFeatureRelief.hillshade), "feature-aware relief should keep hillshade finite");

var rectFeature = groundFeatures.filter(function(feature) { return feature.shape === "rect"; })[0];
var rectCenter = getLatLonFromSurfaceMeterCoordinate(rectFeature.east, rectFeature.north);
var nearestRectFeature = getNearestPlanetGroundFeature(rectCenter.latitude, rectCenter.longitude, 16);

assert.ok(nearestRectFeature, "nearest feature query should find an area patch");
assert.strictEqual(nearestRectFeature.id, rectFeature.id, "nearest area patch feature id should match");
assertNear(nearestRectFeature.distanceMeters, 0, 1e-9, "nearest area patch distance");
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

var meterAddress = getPlanetSurfaceSampleAddress(34.2117, -77.7265, finalGroundZoomIndex);
var meterChunkAddress = makePlanetSurfaceChunkAddress(finalGroundZoomIndex, meterAddress.chunkX, meterAddress.chunkY);
var chunkBounds = getLocalSurfaceChunkMeterBounds(meterChunkAddress);
var chunkPoint = getLocalSurfaceChunkPointForMeters(
  meterChunkAddress,
  chunkBounds.minEastMeters,
  chunkBounds.maxNorthMeters
);

assertNear(chunkBounds.sizeMeters, 32, 1e-9, "meter chunk size");
assertNear(chunkPoint.x, 0, 1e-9, "chunk meter origin x");
assertNear(chunkPoint.y, 0, 1e-9, "chunk meter origin y");

world.planetView = {
  zoomLevel: finalGroundZoomIndex,
  latitude: 34.2117,
  longitude: -77.7265
};

var detailAddress = getPlanetSurfaceSampleAddress(34.2117, -77.7265, detailZoomIndex);
var detailChunkAddress = makePlanetSurfaceChunkAddress(detailZoomIndex, detailAddress.chunkX, detailAddress.chunkY);
var detailChunkSample = getPlanetSurfaceChunkSampleAtAddress(
  detailChunkAddress,
  detailAddress.localSampleX,
  detailAddress.localSampleY
);
var meterChunkSample = getPlanetSurfaceChunkSampleAtAddress(
  meterChunkAddress,
  meterAddress.localSampleX,
  meterAddress.localSampleY
);
var explicitDetailSample = getPlanetSurfaceChunkSample(34.2117, -77.7265, null, detailZoomIndex);

assert.strictEqual(detailChunkSample.surfaceSampleMeters, detailZoom.metersPerSample, "parent chunk sample should keep addressed sample scale");
assert.strictEqual(detailChunkSample.detail.sampleMeters, detailZoom.metersPerSample, "parent chunk detail should use addressed sample scale");
assert.strictEqual(detailChunkSample.surfaceChunkKey, detailChunkAddress.chunkKey, "parent chunk sample should keep addressed chunk identity");
assert.strictEqual(meterChunkSample.surfaceSampleMeters, finalGroundZoom.metersPerSample, "meter chunk sample should keep meter scale");
assert.strictEqual(meterChunkSample.detail.sampleMeters, finalGroundZoom.metersPerSample, "meter chunk detail should use meter scale");
assert.strictEqual(meterChunkSample.surfaceChunkKey, meterChunkAddress.chunkKey, "meter chunk sample should keep addressed chunk identity");
assert.notStrictEqual(detailChunkSample.surfaceChunkKey, meterChunkSample.surfaceChunkKey, "parent and meter chunks should cache separately");
assert.notStrictEqual(detailChunkSample.surfaceSampleMeters, meterChunkSample.surfaceSampleMeters, "parent and meter chunk samples should keep separate scales");
assert.strictEqual(explicitDetailSample.surfaceSampleMeters, detailZoom.metersPerSample, "explicit LOD sample should not inherit current view scale");
assert.strictEqual(explicitDetailSample.detail.sampleMeters, detailZoom.metersPerSample, "explicit LOD detail should not inherit current view scale");

var chunkRect = getPlanetSurfaceChunkScreenRect(meterChunkAddress);
var meterChunkCenter = getPlanetSurfaceChunkCenterLatLon(meterChunkAddress);
var meterChunkCenterPoint = getPlanetLocalCanvasPoint(meterChunkCenter.longitude, meterChunkCenter.latitude);
var eastNeighborRect = getPlanetSurfaceChunkScreenRect(makePlanetSurfaceChunkAddress(
  finalGroundZoomIndex,
  meterChunkAddress.chunkX + 1,
  meterChunkAddress.chunkY
));
var northNeighborRect = getPlanetSurfaceChunkScreenRect(makePlanetSurfaceChunkAddress(
  finalGroundZoomIndex,
  meterChunkAddress.chunkX,
  meterChunkAddress.chunkY + 1
));

assertNear(meterChunkCenterPoint.x, chunkRect.x + chunkRect.width / 2, 1e-6, "meter chunk center x should align with chunk rect");
assertNear(meterChunkCenterPoint.y, chunkRect.y + chunkRect.height / 2, 1e-6, "meter chunk center y should align with chunk rect");
assertNear(chunkRect.x + chunkRect.width, eastNeighborRect.x, 1e-9, "adjacent chunk east edge continuity");
assertNear(northNeighborRect.y + northNeighborRect.height, chunkRect.y, 1e-9, "adjacent chunk north edge continuity");

world.planetView = {
  zoomLevel: finalGroundZoomIndex - 0.45,
  latitude: 34.2117,
  longitude: -77.7265
};

var fractionalMeterAddress = getPlanetSurfaceSampleAddress(34.2117, -77.7265);
var fractionalMeterChunkAddress = makePlanetSurfaceChunkAddress(
  fractionalMeterAddress.zoomLevel,
  fractionalMeterAddress.chunkX,
  fractionalMeterAddress.chunkY
);
var fractionalMeterRect = getPlanetSurfaceChunkScreenRect(fractionalMeterChunkAddress);
var fractionalMeterEastRect = getPlanetSurfaceChunkScreenRect(makePlanetSurfaceChunkAddress(
  fractionalMeterAddress.zoomLevel,
  fractionalMeterAddress.chunkX + 1,
  fractionalMeterAddress.chunkY
));
var placeholderDraw = getLocalSurfacePlaceholderDraw(fractionalMeterChunkAddress);
var repeatedPlaceholderDraw = getLocalSurfacePlaceholderDraw(fractionalMeterChunkAddress);
var placeholderRgb = getRgbFromHex(placeholderDraw.color);

assert.strictEqual(fractionalMeterAddress.sampleMeters, 1, "fractional near-final zoom should address meter chunks");
assertNear(fractionalMeterRect.x + fractionalMeterRect.width, fractionalMeterEastRect.x, 1e-9, "fractional meter chunks should stay edge-continuous");
assert.deepStrictEqual(repeatedPlaceholderDraw, placeholderDraw, "pending chunk placeholders should be deterministic");
assertNear(placeholderDraw.x, fractionalMeterRect.x, 1e-9, "placeholder x should match chunk rect");
assertNear(placeholderDraw.y, fractionalMeterRect.y, 1e-9, "placeholder y should match chunk rect");
assertNear(placeholderDraw.width, fractionalMeterRect.width, 1e-9, "placeholder width should match chunk rect");
assertNear(placeholderDraw.height, fractionalMeterRect.height, 1e-9, "placeholder height should match chunk rect");
assertRgbBounds(placeholderRgb, "placeholder draw color");
assert.ok(placeholderDraw.color !== "#01030a", "placeholder draw should not fall back to blank background color");
assert.strictEqual(placeholderDraw.chunkKey, fractionalMeterChunkAddress.chunkKey, "placeholder draw should preserve chunk identity");

world.planetView = {
  zoomLevel: finalGroundZoomIndex,
  latitude: 34.2117,
  longitude: -77.7265,
  panEastMeters: 0,
  panNorthMeters: 0
};

resetLocalSurfaceRenderChunkCache();
assert.strictEqual(getLocalSurfaceRenderCacheStats().lastPlaceholderChunks, 0, "render cache stats should expose placeholder fallback count");

var visibleChunks = getPlanetVisibleSurfaceChunks(getPlanetSurfaceChunkSampleCount());
assert.ok(visibleChunks.length > 1, "meter zoom should enumerate multiple visible chunks");
assert.ok(Number.isFinite(visibleChunks[0].priorityDistance), "visible chunks should include priority distance");
assert.ok(Number.isFinite(visibleChunks[0].priorityScore), "visible chunks should include priority score");
assert.ok(visibleChunks.totalCandidateChunks >= visibleChunks.length, "visible chunks should expose candidate working-set size");
assert.strictEqual(visibleChunks.workingSetLimit, getPlanetSurfaceVisibleChunkLimit(), "visible chunks should expose default working-set limit");
assert.ok(visibleChunks.culledChunks >= 0, "visible chunks should expose culled chunk count");

var limitedVisibleChunks = getPlanetVisibleSurfaceChunks(getPlanetSurfaceChunkSampleCount(), 4);
assert.strictEqual(limitedVisibleChunks.length, 4, "visible chunks should respect explicit working-set limit");
assert.strictEqual(limitedVisibleChunks.workingSetLimit, 4, "limited visible chunks should expose explicit working-set limit");
assert.ok(limitedVisibleChunks.totalCandidateChunks > limitedVisibleChunks.length, "limited visible chunks should retain total candidate count");
assert.strictEqual(limitedVisibleChunks.culledChunks, limitedVisibleChunks.totalCandidateChunks - limitedVisibleChunks.length, "limited visible chunks should expose culled count");

for (var chunkIndex = 1; chunkIndex < visibleChunks.length; chunkIndex++) {
  assert.ok(
    visibleChunks[chunkIndex - 1].priorityScore <= visibleChunks[chunkIndex].priorityScore,
    "visible chunks should be ordered by scheduling priority"
  );
}

var centerChunk = visibleChunks[0];
var centerX = centerChunk.screenX + centerChunk.width / 2;
var centerY = centerChunk.screenY + centerChunk.height / 2;
assert.ok(Math.abs(centerX - canvas.width / 2) <= centerChunk.width, "first visible chunk should be near viewport center");
assert.ok(Math.abs(centerY - canvas.height / 2) <= centerChunk.height, "first visible chunk should be near viewport center");

var limitedCenterChunk = limitedVisibleChunks[0];
var limitedCenterX = limitedCenterChunk.screenX + limitedCenterChunk.width / 2;
var limitedCenterY = limitedCenterChunk.screenY + limitedCenterChunk.height / 2;
assert.ok(Math.abs(limitedCenterX - canvas.width / 2) <= limitedCenterChunk.width, "limited visible chunks should keep center priority");
assert.ok(Math.abs(limitedCenterY - canvas.height / 2) <= limitedCenterChunk.height, "limited visible chunks should keep center priority");

var prePanView = getPlanetView();
prePanView.panEastMeters = 0;
prePanView.panNorthMeters = 0;
var eastCandidate = null;
var westCandidate = null;

visibleChunks.forEach(function(item) {
  var itemCenterX = item.screenX + item.width / 2;

  if (!eastCandidate && itemCenterX > canvas.width / 2 + item.width) {
    eastCandidate = item;
  }

  if (!westCandidate && itemCenterX < canvas.width / 2 - item.width) {
    westCandidate = item;
  }
});

assert.ok(eastCandidate && westCandidate, "visible chunks should include east and west pan candidates");

prePanView.panEastMeters = 100;
prePanView.panNorthMeters = 0;
var eastBoostedScore = getPlanetSurfaceChunkPriorityScore({
  x: eastCandidate.screenX,
  y: eastCandidate.screenY,
  width: eastCandidate.width,
  height: eastCandidate.height
});
var westBoostedScore = getPlanetSurfaceChunkPriorityScore({
  x: westCandidate.screenX,
  y: westCandidate.screenY,
  width: westCandidate.width,
  height: westCandidate.height
});

assert.ok(eastBoostedScore < eastCandidate.priorityDistance, "eastward pan should boost east chunk priority");
assert.strictEqual(westBoostedScore, westCandidate.priorityDistance, "eastward pan should not boost chunks behind the pan");

prePanView.panEastMeters = 0;
prePanView.panNorthMeters = 0;

var renderStatsAfterReset = getLocalSurfaceRenderCacheStats();
assert.strictEqual(renderStatsAfterReset.lastVisibleCandidateChunks, 0, "render cache stats should expose candidate chunk count");
assert.strictEqual(renderStatsAfterReset.lastWorkingSetLimit, 0, "render cache stats should expose working-set limit");
assert.strictEqual(renderStatsAfterReset.lastCulledChunks, 0, "render cache stats should expose culled chunk count");
`, context);

console.log("planet zoom anchor checks passed");
