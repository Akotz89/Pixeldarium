const assert = require("assert");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "../..");
const goldenDir = path.join(__dirname, "golden");
const updateGolden = process.env.PIXELDARIUM_UPDATE_GOLDEN === "1";
const threshold = 0.05;
const viewport = { width: 960, height: 540 };

const cases = [
  { name: "orbit-view", zoom: 0, expectedBand: "orbit" },
  { name: "continent-view", zoom: 2, biome: "forest", expectedBand: "continent", maxDarkPixels: 0.16 },
  { name: "region-view", zoom: 4, biome: "forest", expectedBand: "region", maxDarkPixels: 0.16 },
  { name: "local-view", zoom: 6, biome: "forest", expectedBand: "local", maxDarkPixels: 0.16 },
  { name: "surface-temperate", zoom: 5, biome: "forest", expectedBand: "region", maxDarkPixels: 0.16 },
  { name: "surface-desert", zoom: 5, biome: "desert", expectedBand: "region", maxDarkPixels: 0.16 },
  { name: "entities-visible", zoom: 6, entities: true, expectedBand: "local", maxDarkPixels: 0.16 },
  { name: "settlement-ground", zoom: 7, settlement: true, expectedBand: "settlement", maxDarkPixels: 0.16 },
  { name: "hud-visible", zoom: 2, hud: true, expectedBand: "continent", maxDarkPixels: 0.16 }
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readUInt32(buffer, offset) {
  return buffer.readUInt32BE(offset);
}

function parsePng(buffer) {
  assert.strictEqual(buffer.toString("hex", 0, 8), "89504e470d0a1a0a", "PNG signature expected");

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const chunks = [];

  while (offset < buffer.length) {
    const length = readUInt32(buffer, offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const data = buffer.subarray(dataStart, dataEnd);

    if (type === "IHDR") {
      width = readUInt32(data, 0);
      height = readUInt32(data, 4);
      assert.strictEqual(data[8], 8, "visual PNG baselines must use 8-bit channels");
      colorType = data[9];
      assert.ok(colorType === 2 || colorType === 6, "visual PNG baselines must be RGB or RGBA");
      assert.strictEqual(data[12], 0, "interlaced PNG baselines are not supported");
    } else if (type === "IDAT") {
      chunks.push(data);
    } else if (type === "IEND") {
      break;
    }

    offset = dataEnd + 4;
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(chunks));
  const stride = width * bytesPerPixel;
  const pixels = Buffer.alloc(width * height * 4);
  let rawOffset = 0;
  let outOffset = 0;
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[rawOffset++];
    const scanline = Buffer.from(raw.subarray(rawOffset, rawOffset + stride));
    rawOffset += stride;

    for (let x = 0; x < stride; x++) {
      const left = x >= bytesPerPixel ? scanline[x - bytesPerPixel] : 0;
      const up = previous[x] || 0;
      const upperLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] || 0 : 0;
      let value = scanline[x];

      if (filter === 1) {
        value = (value + left) & 255;
      } else if (filter === 2) {
        value = (value + up) & 255;
      } else if (filter === 3) {
        value = (value + Math.floor((left + up) / 2)) & 255;
      } else if (filter === 4) {
        value = (value + paeth(left, up, upperLeft)) & 255;
      } else {
        assert.strictEqual(filter, 0, "unsupported PNG filter");
      }

      scanline[x] = value;
    }

    for (let x = 0; x < width; x++) {
      const source = x * bytesPerPixel;
      pixels[outOffset++] = scanline[source];
      pixels[outOffset++] = scanline[source + 1];
      pixels[outOffset++] = scanline[source + 2];
      pixels[outOffset++] = bytesPerPixel === 4 ? scanline[source + 3] : 255;
    }

    previous = scanline;
  }

  return { width, height, pixels };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function diffPng(current, golden) {
  assert.strictEqual(current.width, golden.width, "visual baseline width changed");
  assert.strictEqual(current.height, golden.height, "visual baseline height changed");

  const total = current.width * current.height;
  let changed = 0;

  for (let i = 0; i < total; i++) {
    const offset = i * 4;
    const delta =
      Math.abs(current.pixels[offset] - golden.pixels[offset]) +
      Math.abs(current.pixels[offset + 1] - golden.pixels[offset + 1]) +
      Math.abs(current.pixels[offset + 2] - golden.pixels[offset + 2]) +
      Math.abs(current.pixels[offset + 3] - golden.pixels[offset + 3]);

    if (delta > 18) {
      changed++;
    }
  }

  return changed / total;
}

function getDarkPixelRatio(image) {
  const total = image.width * image.height;
  let dark = 0;

  for (let i = 0; i < total; i++) {
    const offset = i * 4;
    const alpha = image.pixels[offset + 3];
    const luminance =
      image.pixels[offset] * 0.2126 +
      image.pixels[offset + 1] * 0.7152 +
      image.pixels[offset + 2] * 0.0722;

    if (alpha > 0 && luminance < 14) {
      dark++;
    }
  }

  return dark / total;
}

function fileUrl(filePath) {
  return pathToFileURL(filePath).href;
}

async function prepareCase(page, testCase) {
  await page.evaluate((config) => {
    if (typeof setWorldSeed === "function") {
      setWorldSeed("PIXEL-VIS-001");
    }
    if (typeof seedWorld === "function") {
      seedWorld();
    }

    const view = PS.camera.getView();
    view.zoomLevel = config.zoom;

    if (config.biome || config.entities || config.settlement) {
      const targetBiome = config.biome || null;
      let targetTile = null;

      for (let i = 0; i < world.planetTiles.length; i++) {
        const tile = world.planetTiles[i];
        if (!tile) {
          continue;
        }
        if (!targetBiome || tile.biome === targetBiome) {
          targetTile = tile;
          break;
        }
      }

      if (config.entities && world.organisms.length > 0) {
        const organism = world.organisms[0];
        targetTile = { x: organism.x, y: organism.y, latitude: organism.latitude, longitude: organism.longitude };
        organism.energy = 240;
        organism.selected = true;
        if (PS.sim && PS.sim.representatives) {
          PS.sim.representatives.select(organism);
        }
      }

      if (config.settlement) {
        if (!targetTile) {
          targetTile = world.planetTiles[Math.floor(world.planetTiles.length / 2)];
        }

        const centerX = Math.max(8, Math.min(WORLD_WIDTH - 9, Math.round(Number(targetTile.x) || WORLD_WIDTH / 2)));
        const centerY = Math.max(8, Math.min(WORLD_HEIGHT - 9, Math.round(Number(targetTile.y) || WORLD_HEIGHT / 2)));
        const parentTile = world.planetTiles[getTileIndex(centerX, centerY)] || targetTile;
        const childTile = world.planetTiles[getTileIndex(centerX + 1, centerY + 1)] || parentTile;
        const makeVisualSettlement = (id, tile, isOutpost) => ({
          id,
          lineageId: 3,
          x: tile.x,
          y: tile.y,
          prevX: tile.x,
          prevY: tile.y,
          latitude: tile.latitude,
          longitude: tile.longitude,
          prevLatitude: tile.latitude,
          prevLongitude: tile.longitude,
          foundedTick: world.tick,
          radius: isOutpost ? 3 : 6,
          population: isOutpost ? 44 : 180,
          foodStock: isOutpost ? 48 : 160,
          storedFood: isOutpost ? 52 : 190,
          development: isOutpost ? 0.38 : 0.82,
          level: isOutpost ? 2 : 5,
          influenceRadius: isOutpost ? 4 : 8,
          claimedTiles: isOutpost ? 72 : 260,
          claimedFood: isOutpost ? 16 : 58,
          parentSettlementId: isOutpost ? 9101 : 0,
          isOutpost: Boolean(isOutpost),
          isColony: !isOutpost,
          isActive: true,
          lastActiveTick: world.tick
        });

        world.settlements = [
          makeVisualSettlement(9101, parentTile, false),
          makeVisualSettlement(9102, childTile, true)
        ];
        world.settlementRoutes = [{
          id: 8101,
          parentSettlementId: 9101,
          childSettlementId: 9102,
          lineageId: 3,
          isActive: true,
          foodTransferred: 140,
          lastTransferTick: world.tick
        }];
        world.nextSettlementId = 9103;
        world.nextSettlementRouteId = 8102;
        if (PS.sim && PS.sim.settlements && typeof PS.sim.settlements.rebuildIndexes === "function") {
          PS.sim.settlements.rebuildIndexes();
        }
        targetTile = parentTile;
      }

      if (targetTile) {
        view.latitude = Number(targetTile.latitude);
        view.longitude = Number(targetTile.longitude);
        view.panEastMeters = 0;
        view.panNorthMeters = 0;
      }

      if (config.settlement && PS.render && PS.render.particles) {
        if (typeof PS.render.particles.reset === "function") {
          PS.render.particles.reset(world.rngState || 0x9E3779B9);
        }
        if (typeof PS.render.particles.loadDefinitions === "function") {
          PS.render.particles.loadDefinitions(PS.assets ? PS.assets.particlesData : null);
        }
        const settlementPoint = PS.render.entities && typeof PS.render.entities.getSettlementRenderPosition === "function"
          ? PS.render.entities.getSettlementRenderPosition(world.settlements[0])
          : null;
        const activityEmitter = typeof PS.render.particles.createEmitter === "function"
          ? PS.render.particles.createEmitter("settlement_activity", {
            id: "visual.settlement_activity",
            active: false,
            position: {
              x: settlementPoint ? settlementPoint.x : canvas.width * 0.5,
              y: settlementPoint ? settlementPoint.y : canvas.height * 0.5
            }
          })
          : null;
        if (activityEmitter && typeof activityEmitter.burst === "function") {
          activityEmitter.burst(24);
        }
      }
    }

    world.isPaused = true;
    world.needsRender = true;
    if (typeof drawWorld === "function") {
      drawWorld();
    }
    if (config.hud && typeof updateHud === "function") {
      updateHud();
    }
  }, testCase);

  await page.waitForTimeout(350);

  return page.evaluate(() => {
    const stats = PS.render.renderer && typeof PS.render.renderer.getStats === "function"
      ? PS.render.renderer.getStats()
      : {};
    const particleStats = PS.render.particles && typeof PS.render.particles.getStats === "function"
      ? PS.render.particles.getStats()
      : {};
    return {
      zoomBand: PS.render.pipeline.getZoomBand(world.planetView.zoomLevel),
      zoomLevel: world.planetView.zoomLevel,
      rendererStats: stats,
      particleStats,
      debugText: (document.getElementById("debug-output") || {}).textContent || ""
    };
  });
}

async function runInteractionSmoke(page) {
  const before = await page.evaluate(() => ({
    zoomLevel: world.planetView.zoomLevel,
    latitude: world.planetView.latitude,
    longitude: world.planetView.longitude,
    panEastMeters: world.planetView.panEastMeters,
    panNorthMeters: world.planetView.panNorthMeters
  }));

  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  await page.mouse.wheel(0, -420);
  await page.waitForTimeout(140);
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  await page.mouse.down();
  await page.mouse.move(viewport.width / 2 + 120, viewport.height / 2 + 44, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(140);

  const after = await page.evaluate(() => ({
    zoomLevel: world.planetView.zoomLevel,
    latitude: world.planetView.latitude,
    longitude: world.planetView.longitude,
    panEastMeters: world.planetView.panEastMeters,
    panNorthMeters: world.planetView.panNorthMeters,
    debugText: (document.getElementById("debug-output") || {}).textContent || ""
  }));

  assert.ok(after.zoomLevel > before.zoomLevel, "direct file wheel input should zoom in");
  assert.ok(
    after.latitude !== before.latitude ||
      after.longitude !== before.longitude ||
      after.panEastMeters !== before.panEastMeters ||
      after.panNorthMeters !== before.panNorthMeters,
    "direct file drag input should move the planet view"
  );
  assert.strictEqual(after.debugText.trim(), "", "direct file interaction smoke should not write debug errors");

  return {
    zoomBefore: Number(before.zoomLevel.toFixed(3)),
    zoomAfter: Number(after.zoomLevel.toFixed(3)),
    moved: true
  };
}

async function run() {
  ensureDir(goldenDir);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  const failures = [];

  page.on("pageerror", (error) => errors.push(String(error && error.message ? error.message : error)));
  page.on("requestfailed", (request) => failures.push(request.url()));
  await page.goto(fileUrl(path.join(root, "index.html")), { waitUntil: "load", timeout: 30000 });
  await page.waitForFunction(
    () => window.PS && PS.render && PS.render.webgl2Renderer && PS.render.webgl2Renderer.gl,
    null,
    { timeout: 30000 }
  );

  const results = [];

  for (const testCase of cases) {
    const caseStats = await prepareCase(page, testCase);
    if (testCase.expectedBand) {
      assert.strictEqual(
        caseStats.zoomBand,
        testCase.expectedBand,
        testCase.name + " should exercise the " + testCase.expectedBand + " zoom band"
      );
    }
    assert.strictEqual(caseStats.debugText.trim(), "", testCase.name + " should not write debug errors");
    if (testCase.settlement) {
      assert.ok(caseStats.rendererStats.shadowEntityDraws > 0, testCase.name + " should draw settlement shadows through WebGL");
      assert.ok(caseStats.rendererStats.vegetationEntityDraws > 0, testCase.name + " should draw settlement vegetation facades through WebGL");
      assert.ok(caseStats.rendererStats.citizenEntityDraws > 0, testCase.name + " should draw settlement citizen facades through WebGL");
      assert.ok(caseStats.rendererStats.worldUiEntityDraws > 0, testCase.name + " should draw settlement world UI facades through WebGL");
      assert.ok(caseStats.rendererStats.settlementEntityDraws > 0, testCase.name + " should draw settlement structures through WebGL");
      assert.ok(caseStats.rendererStats.routeEntityDraws > 0, testCase.name + " should draw settlement routes through WebGL");
      assert.ok(caseStats.particleStats.ready === true, testCase.name + " should have ready particle definitions");
      assert.ok(caseStats.particleStats.visible > 0, testCase.name + " should draw settlement activity particles through WebGL");
      assert.ok(caseStats.particleStats.drawCalls > 0, testCase.name + " should submit a WebGL particle draw");
    }
    const screenshot = await page.screenshot({ fullPage: false });
    const goldenPath = path.join(goldenDir, testCase.name + ".png");
    const currentImage = parsePng(screenshot);
    const darkPixelRatio = getDarkPixelRatio(currentImage);

    if (typeof testCase.maxDarkPixels === "number") {
      assert.ok(
        darkPixelRatio <= testCase.maxDarkPixels,
        testCase.name + " dark-pixel coverage " + (darkPixelRatio * 100).toFixed(2) + "% exceeds viewport underlay budget"
      );
    }

    if (updateGolden || !fs.existsSync(goldenPath)) {
      fs.writeFileSync(goldenPath, screenshot);
      results.push({ name: testCase.name, updated: true, diff: 0, darkPixels: Number(darkPixelRatio.toFixed(4)), band: caseStats.zoomBand });
      continue;
    }

    const diff = diffPng(currentImage, parsePng(fs.readFileSync(goldenPath)));
    assert.ok(diff <= threshold, testCase.name + " visual diff " + (diff * 100).toFixed(2) + "% exceeds 5%");
    results.push({ name: testCase.name, updated: false, diff: Number(diff.toFixed(4)), darkPixels: Number(darkPixelRatio.toFixed(4)), band: caseStats.zoomBand });
  }

  const interaction = await runInteractionSmoke(page);

  const perf = await page.evaluate(async () => {
    const frames = [];
    world.isPaused = false;
    for (let i = 0; i < 100; i++) {
      const startedAt = performance.now();
      if (typeof updateWorld === "function") {
        updateWorld(1 / 60);
      }
      if (typeof drawWorld === "function") {
        drawWorld();
      }
      frames.push(performance.now() - startedAt);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    const sum = frames.reduce((total, value) => total + value, 0);
    return {
      averageFrameMs: sum / frames.length,
      peakFrameMs: Math.max.apply(Math, frames),
      rendererStats: PS.render.renderer.getStats(),
      debugText: (document.getElementById("debug-output") || {}).textContent || ""
    };
  });

  await browser.close();

  assert.deepStrictEqual(errors, [], "visual smoke should not emit page errors");
  assert.deepStrictEqual(failures, [], "visual smoke should not have failed requests");
  assert.strictEqual(perf.debugText.trim(), "", "visual smoke should not write debug errors");
  assert.ok(perf.averageFrameMs < 20, "average visual frame time should stay under 20ms");
  assert.ok(perf.peakFrameMs < 50, "peak visual frame time should stay under 50ms");

  console.log("visual screenshot checks passed", JSON.stringify({
    results,
    interaction,
    averageFrameMs: Number(perf.averageFrameMs.toFixed(3)),
    peakFrameMs: Number(perf.peakFrameMs.toFixed(3))
  }));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
