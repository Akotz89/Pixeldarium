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
  { name: "orbit-view", zoom: 0, mode: "orbit" },
  { name: "surface-temperate", zoom: 5, biome: "forest", maxDarkPixels: 0.16 },
  { name: "surface-desert", zoom: 5, biome: "desert", maxDarkPixels: 0.16 },
  { name: "entities-visible", zoom: 6, entities: true, maxDarkPixels: 0.16 },
  { name: "hud-visible", zoom: 2, hud: true }
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

    if (config.biome || config.entities) {
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

      if (targetTile) {
        view.latitude = Number(targetTile.latitude);
        view.longitude = Number(targetTile.longitude);
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
    await prepareCase(page, testCase);
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
      results.push({ name: testCase.name, updated: true, diff: 0, darkPixels: Number(darkPixelRatio.toFixed(4)) });
      continue;
    }

    const diff = diffPng(currentImage, parsePng(fs.readFileSync(goldenPath)));
    assert.ok(diff <= threshold, testCase.name + " visual diff " + (diff * 100).toFixed(2) + "% exceeds 5%");
    results.push({ name: testCase.name, updated: false, diff: Number(diff.toFixed(4)), darkPixels: Number(darkPixelRatio.toFixed(4)) });
  }

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
    averageFrameMs: Number(perf.averageFrameMs.toFixed(3)),
    peakFrameMs: Number(perf.peakFrameMs.toFixed(3))
  }));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
