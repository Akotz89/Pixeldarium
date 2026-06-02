const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });

  const evidence = await page.evaluate(() => {
    const pool = PS.render.surfaceRender.canvases;
    const before = pool.getStats();

    buildTerrainCache();
    const afterFirstBuild = pool.getStats();

    buildTerrainCache();
    const afterSecondBuild = pool.getStats();

    const firstCanvas = PS.render.surfaceRender.chunks.makeCanvas(32, 32);
    PS.render.surfaceRender.releaseRenderCanvas(firstCanvas);
    const reusedCanvas = PS.render.surfaceRender.chunks.makeCanvas(32, 32);
    const afterReuse = pool.getStats();

    return {
      hasOffscreenCanvas: typeof OffscreenCanvas !== "undefined",
      before,
      afterFirstBuild,
      afterSecondBuild,
      afterReuse,
      reusedSameCanvas: firstCanvas === reusedCanvas
    };
  });

  await browser.close();

  assert.deepStrictEqual(consoleErrors, [], "browser console should have no errors");
  assert.deepStrictEqual(pageErrors, [], "browser page should have no errors");
  assert.strictEqual(evidence.hasOffscreenCanvas, true, "Chromium benchmark should expose OffscreenCanvas");
  assert.strictEqual(evidence.afterSecondBuild.created, evidence.afterFirstBuild.created, "second terrain cache build should reuse the terrain cache canvas");
  assert.strictEqual(evidence.afterSecondBuild.domCreated, 0, "terrain cache pool should not create DOM canvases in Chromium");
  assert.strictEqual(evidence.reusedSameCanvas, true, "released surface chunk canvas should be reused");
  assert.ok(evidence.afterReuse.reused > evidence.afterSecondBuild.reused, "canvas reuse counter should increase");

  console.log("terrain cache canvas pool checks passed", JSON.stringify({
    createdBefore: evidence.before.created,
    createdAfterFirstBuild: evidence.afterFirstBuild.created,
    createdAfterSecondBuild: evidence.afterSecondBuild.created,
    domCreated: evidence.afterSecondBuild.domCreated,
    offscreenCreated: evidence.afterSecondBuild.offscreenCreated,
    reusedAfterProbe: evidence.afterReuse.reused
  }));
})().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
