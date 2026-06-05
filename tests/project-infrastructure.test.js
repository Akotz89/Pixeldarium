const assert = require("assert");
const { spawn } = require("child_process");
const { chromium } = require("playwright");

const PORT = 3210;
const HOST = "127.0.0.1";
const BASE_URL = "http://" + HOST + ":" + PORT;

function wait(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

function startDevServer() {
  const child = spawn(
    "npm",
    ["run", "dev", "--", "--host", HOST, "--port", String(PORT), "--strictPort"],
    {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
      shell: process.platform === "win32"
    }
  );
  const output = [];

  child.stdout.on("data", function(chunk) {
    output.push(chunk.toString());
  });
  child.stderr.on("data", function(chunk) {
    output.push(chunk.toString());
  });

  return {
    child: child,
    output: output,
    stop: function() {
      return new Promise(function(resolve) {
        let resolved = false;

        function finish() {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        }

        if (child.exitCode !== null) {
          finish();
          return;
        }

        child.once("exit", finish);

        try {
          if (process.platform === "win32") {
            child.kill();
          } else {
            process.kill(-child.pid, "SIGTERM");
          }
        } catch (error) {
          child.kill();
        }

        setTimeout(function() {
          if (child.exitCode === null) {
            try {
              if (process.platform === "win32") {
                child.kill("SIGKILL");
              } else {
                process.kill(-child.pid, "SIGKILL");
              }
            } catch (error) {
              // The process may already have exited.
            }
          }
          finish();
        }, 2000);
      });
    }
  };
}

async function waitForServer(server) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 15000) {
    if (server.child.exitCode !== null) {
      throw new Error("Vite exited early:\n" + server.output.join(""));
    }

    try {
      const response = await fetch(BASE_URL + "/assets/test.json");

      if (response.ok) {
        return;
      }
    } catch (error) {
      // Server is still starting.
    }

    await wait(250);
  }

  throw new Error("Timed out waiting for Vite dev server:\n" + server.output.join(""));
}

(async function() {
  const server = startDevServer();
  const browser = await chromium.launch({ headless: true });

  try {
    await waitForServer(server);

    const assetResponse = await fetch(BASE_URL + "/assets/test.json");
    const assetPayload = await assetResponse.json();

    assert.strictEqual(assetResponse.ok, true, "dev server should serve /assets/test.json");
    assert.strictEqual(assetPayload.ok, true, "dev server should return the asset fixture JSON");

    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const consoleErrors = [];
    const pageErrors = [];

    page.on("console", function(message) {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", function(error) {
      pageErrors.push(error.message);
    });

    await page.goto(BASE_URL + "/", { waitUntil: "load" });
    await page.waitForFunction(function() {
      return window.PS &&
        PS.core &&
        PS.core.loaderState &&
        PS.core.loaderState.status === "complete";
    }, null, { timeout: 10000 });
    await page.waitForFunction(function() {
      return window.PS &&
        PS.assets &&
        PS.assets.startupStatus &&
        PS.assets.startupStatus.loaded === true &&
        PS.assets.startupDataStatus &&
        PS.assets.startupDataStatus.loaded === true &&
        PS.core.TileRegistry &&
        PS.core.TileRegistry.list().length > 0 &&
        typeof world !== "undefined" &&
        Array.isArray(world.planetTiles) &&
        world.planetTiles.length > 0 &&
        document.getElementById("loading-screen") &&
        document.getElementById("loading-screen").hidden === true;
    }, null, { timeout: 10000 });

    const bootEvidence = await page.evaluate(function() {
      const scripts = Array.from(document.querySelectorAll("script[src]")).map(function(script) {
        return script.getAttribute("src");
      });
      const loadingScreen = document.getElementById("loading-screen");
      const loadingFill = document.getElementById("loading-progress-fill");
      const loadingText = document.getElementById("loading-progress-text");
      const lushTile = PS.core.TileRegistry && typeof PS.core.TileRegistry.get === "function"
        ? PS.core.TileRegistry.get("grass_lush")
        : null;
      const webglCanvas = document.getElementById("game-webgl");

      return {
        loaderStatus: PS.core.loaderState.status,
        manifestCount: PS.core.manifest.length,
        loadedCount: PS.core.loaderState.loaded.length,
        bootstrapScripts: scripts.filter(function(script) {
          return script === "js/core/namespace.js" || script === "js/core/loader.js";
        }),
        startupAssets: PS.assets.startupStatus,
        startupData: PS.assets.startupDataStatus,
        tileRegistryCount: PS.core.TileRegistry ? PS.core.TileRegistry.list().length : 0,
        lushTile: lushTile ? {
          id: lushTile.id,
          biome: lushTile.biome,
          baseColor: lushTile.baseColor,
          spriteId: PS.core.TileRegistry.getSpriteId("grass_lush", 3)
        } : null,
        biomesLoaded: PS.assets.biomesData && Array.isArray(PS.assets.biomesData.biomes)
          ? PS.assets.biomesData.biomes.length
          : 0,
        transitionResolverReady: !!PS.render.terrainTransitions,
        spriteSystemLoaded: !!PS.spriteSystem,
        atlasLoaded: !!PS.atlas,
        atlasStats: PS.atlas && typeof PS.atlas.getStats === "function" ? PS.atlas.getStats() : null,
        atlasPageData: PS.atlas && PS.atlas.pages && PS.atlas.pages[0] && PS.atlas.pages[0].data
          ? {
            width: PS.atlas.pages[0].width,
            height: PS.atlas.pages[0].height,
            byteLength: PS.atlas.pages[0].data.byteLength,
            isUint8Array: PS.atlas.pages[0].data instanceof Uint8Array,
            hasCanvasPage: !!PS.atlas.pages[0].canvas
          }
          : null,
        webglCanvas: webglCanvas ? {
          id: webglCanvas.id,
          width: webglCanvas.width,
          height: webglCanvas.height
        } : null,
        canvas2dSurfaceLoaded: !!document.getElementById("game"),
        loadingScreenHidden: loadingScreen ? loadingScreen.hidden : null,
        loadingFillWidth: loadingFill ? loadingFill.style.width : "",
        loadingText: loadingText ? loadingText.textContent : ""
      };
    });

    assert.deepStrictEqual(consoleErrors, [], "dev-server page should not emit console errors");
    assert.deepStrictEqual(pageErrors, [], "dev-server page should not throw page errors");
    assert.strictEqual(bootEvidence.loaderStatus, "complete", "dynamic script loader should complete");
    assert.ok(bootEvidence.manifestCount > 100, "script manifest should include the game runtime scripts");
    assert.strictEqual(bootEvidence.loadedCount, bootEvidence.manifestCount, "loader should load every manifest script");
    assert.deepStrictEqual(
      bootEvidence.bootstrapScripts,
      ["js/core/namespace.js", "js/core/loader.js"],
      "dev-server page should include namespace and loader bootstrap scripts"
    );
    assert.strictEqual(bootEvidence.startupAssets.loaded, true, "startup should load the asset manifest before game start");
    assert.strictEqual(bootEvidence.startupAssets.fallback, false, "HTTP startup should not fall back from the asset manifest");
    assert.ok(
      bootEvidence.startupAssets.loadedSheets.indexOf("terrain_grass") >= 0,
      "startup should load the terrain grass sheet from assets"
    );
    assert.strictEqual(bootEvidence.startupData.loaded, true, "startup should load data before game start");
    assert.ok(bootEvidence.startupData.tiles >= 18, "startup should load tile definitions before game start");
    assert.ok(bootEvidence.startupData.biomes >= 8, "startup should load biome definitions before game start");
    assert.ok(bootEvidence.startupData.transitionPairs >= 5, "startup should load terrain transition definitions before game start");
    assert.strictEqual(bootEvidence.startupData.transitionResolverReady, false, "startup should not create a Canvas2D terrain transition resolver");
    assert.strictEqual(bootEvidence.tileRegistryCount, bootEvidence.startupData.tiles, "TileRegistry should contain startup tile definitions");
    assert.deepStrictEqual(
      bootEvidence.lushTile,
      {
        id: "grass_lush",
        biome: "temperate",
        baseColor: "#4a8c2a",
        spriteId: "terrain.grass.3"
      },
      "TileRegistry should expose loaded grass tile render data"
    );
    assert.strictEqual(bootEvidence.biomesLoaded, bootEvidence.startupData.biomes, "startup should retain loaded biome data");
    assert.strictEqual(bootEvidence.transitionResolverReady, false, "Canvas2D terrain transition resolver should not load in runtime");
    assert.strictEqual(bootEvidence.spriteSystemLoaded, false, "runtime should not load the Canvas2D sprite system");
    assert.strictEqual(bootEvidence.atlasLoaded, true, "runtime should load the packed WebGL entity atlas");
    assert.ok(bootEvidence.atlasStats.cellCount > 0, "packed WebGL atlas should generate runtime cells");
    assert.deepStrictEqual(
      bootEvidence.atlasPageData,
      {
        width: 256,
        height: 256,
        byteLength: 262144,
        isUint8Array: true,
        hasCanvasPage: false
      },
      "packed WebGL atlas should use a typed RGBA page, not a canvas page"
    );
    assert.deepStrictEqual(
      bootEvidence.webglCanvas,
      { id: "game-webgl", width: 1600, height: 850 },
      "runtime should expose the WebGL presentation canvas"
    );
    assert.strictEqual(bootEvidence.canvas2dSurfaceLoaded, false, "runtime should not expose a separate Canvas2D game surface");
    assert.strictEqual(bootEvidence.loadingScreenHidden, true, "loading screen should hide after startup completes");
    assert.strictEqual(bootEvidence.loadingFillWidth, "100%", "loading progress bar should fill after assets load");
    assert.ok(/Loading\.\.\. \d+\/\d+/.test(bootEvidence.loadingText), "loading text should show startup asset counts");
    assert.ok(bootEvidence.startupAssets.loadMs < 3000, "dev-server startup asset load should stay under 3 seconds");

    console.log("project infrastructure checks passed");
  } finally {
    await browser.close();
    await server.stop();
  }
}()).catch(function(error) {
  console.error(error);
  process.exit(1);
});
