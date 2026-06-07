const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const namespaceSource = read("js/core/namespace.js");
const rendererSource = read("js/render/renderer.js");
const webgl2RendererSource = read("js/render/webgl2-renderer.js");
const webglPresenterSource = read("js/render/webgl-presenter.js");
const pipelineSource = read("js/render/pipeline.js");
const styleSource = read("style.css");

assert.ok(namespaceSource.indexOf("js/render/renderer.js") >= 0, "script manifest should load renderer interface");
assert.ok(namespaceSource.indexOf("js/render/webgl2-renderer.js") >= 0, "script manifest should load WebGL2 renderer");
assert.ok(namespaceSource.indexOf("js/render/webgl-presenter.js") >= 0, "script manifest should load WebGL presenter before the engine");
assert.ok(rendererSource.indexOf("beginFrame") >= 0, "renderer interface should expose beginFrame");
assert.ok(rendererSource.indexOf("drawTilemap") >= 0, "renderer interface should expose drawTilemap");
assert.ok(rendererSource.indexOf("batchSprites") >= 0, "renderer interface should expose batchSprites");
assert.ok(rendererSource.indexOf("getStats") >= 0, "renderer interface should expose stats");
assert.ok(rendererSource.indexOf("lodTier") >= 0, "renderer stats should expose the active LOD tier");
assert.ok(rendererSource.indexOf("preloadSurfaceLodIndex") >= 0, "renderer stats should expose the preload LOD target");
assert.strictEqual(webgl2RendererSource.indexOf('ensureTarget("frame"'), -1, "WebGL2 renderer facade should not allocate an unused frame target");
assert.ok(webgl2RendererSource.indexOf("surfaceTileWebgl.drawTerrainAtlasBatch") >= 0, "WebGL2 renderer should route ready terrain chunk groups through one tilemap submission");
assert.ok(webgl2RendererSource.indexOf("surfaceTileWebgl.drawTerrainAtlas") >= 0, "WebGL2 renderer should route terrain tilemaps through WebGL2");
assert.strictEqual(webgl2RendererSource.indexOf("drawTerrainAtlasTo2d"), -1, "WebGL2 renderer should not route terrain through Canvas2D");
assert.strictEqual(webgl2RendererSource.indexOf("copyBack"), -1, "WebGL2 renderer stats should not include copy-back counters");
assert.ok(webglPresenterSource.indexOf("drawTargetToPresenter") >= 0, "WebGL presenter should present render textures directly");
assert.strictEqual(webglPresenterSource.indexOf("presentCompatibilityCanvas"), -1, "WebGL presenter should not upload a Canvas2D compatibility layer");
assert.ok(read("index.html").indexOf('id="game-webgl"') >= 0, "runtime should include the WebGL presentation canvas");
assert.strictEqual(read("index.html").indexOf('id="game"'), -1, "runtime should not include a separate Canvas2D game surface");
assert.ok(/#game-webgl\s*\{[^}]*pointer-events:\s*auto/s.test(styleSource), "single WebGL canvas should receive pointer and wheel input");
assert.strictEqual(/#game-webgl\s*\{[^}]*pointer-events:\s*none/s.test(styleSource), false, "single WebGL canvas should not discard interaction events");
assert.ok(pipelineSource.indexOf("PS.render.renderer.beginFrame") >= 0, "pipeline should begin renderer frames");
assert.ok(pipelineSource.indexOf("PS.render.renderer.endFrame") >= 0, "pipeline should end renderer frames");

const context = {
  PS: {
    render: {
      webglEngine: {
        getStats() {
          return { contextCount: 1, targetCount: 1 };
        }
      },
      surfaceTileWebgl: {
        state: { pageDrawCount: 2, tileDrawCount: 12, lastFrameMs: 4 },
        drawTerrainAtlasBatch() {
          return true;
        },
        drawTerrainAtlas() {
          return true;
        }
      },
      entityWebgl: {
        state: {
          frameInstanceDrawCount: 7,
          settlementDrawCount: 2,
          routeDrawCount: 3,
          influenceDrawCount: 4,
          shadowDrawCount: 10,
          vegetationDrawCount: 12,
          citizenDrawCount: 11,
          intentDrawCount: 8,
          readinessDrawCount: 9,
          foodDrawCount: 5,
          organismDrawCount: 6,
          lastFrameMs: 5
        },
        resetFrameStats() {
          return true;
        }
      },
      webglPresenter: {
        beginFrame() {
          return true;
        },
        endFrame() {
          return true;
        },
        getStats() {
          return {
            active: true,
            hasCanvas: true,
            directPresentCount: 2,
            lastFramePresents: 2,
            singleVisibleCanvas: true
          };
        }
      }
    },
    camera: {
      unified: {
        getState() {
          return { x: 0, y: 0, zoom: 1, rotation: 0, viewportW: 1600, viewportH: 850 };
        }
      }
    }
  },
  CONFIG: {},
  canvas: { width: 1600, height: 850 },
  performance: { now() { return 10; } },
  Object,
  String,
  Number,
  Boolean,
  Array,
  Math,
  Float32Array
};

vm.createContext(context);
vm.runInContext(rendererSource, context, { filename: "js/render/renderer.js" });
vm.runInContext(webgl2RendererSource, context, { filename: "js/render/webgl2-renderer.js" });

assert.ok(context.PS.render.renderer.getActive(), "WebGL2 renderer should be active by default");
assert.strictEqual(context.PS.render.renderer.beginFrame({ zoom: 2 }), true, "beginFrame should open the WebGL presenter");
assert.strictEqual(
  context.PS.render.renderer.drawTilemap({ chunks: [{ address: {}, cellCache: [{}] }], alpha: 1 }),
  true,
  "drawTilemap should route grouped terrain chunks to the batched WebGL2 path"
);
assert.strictEqual(
  context.PS.render.renderer.drawTilemap({ address: {}, cellCache: [{}], alpha: 1 }),
  true,
  "drawTilemap should route to the WebGL2 terrain path when data is provided"
);

const stats = context.PS.render.renderer.endFrame();
assert.strictEqual(stats.frameCount, 1, "renderer stats should count frames");
assert.strictEqual(stats.tilemapWebglDraws, 2, "renderer stats should count WebGL tilemap submissions");
assert.strictEqual(stats.entityDraws, 7, "renderer stats should include entity WebGL draws");
assert.strictEqual(stats.settlementEntityDraws, 2, "renderer stats should include settlement entity draws");
assert.strictEqual(stats.routeEntityDraws, 3, "renderer stats should include route entity draws");
assert.strictEqual(stats.influenceEntityDraws, 4, "renderer stats should include influence entity draws");
assert.strictEqual(stats.shadowEntityDraws, 10, "renderer stats should include settlement shadow entity draws");
assert.strictEqual(stats.vegetationEntityDraws, 12, "renderer stats should include settlement vegetation entity draws");
assert.strictEqual(stats.citizenEntityDraws, 11, "renderer stats should include settlement citizen entity draws");
assert.strictEqual(stats.intentEntityDraws, 8, "renderer stats should include representative intent entity draws");
assert.strictEqual(stats.settlementReadinessEntityDraws, 9, "renderer stats should include settlement readiness facade draws");
assert.strictEqual(stats.foodEntityDraws, 5, "renderer stats should include food entity draws");
assert.strictEqual(stats.organismEntityDraws, 6, "renderer stats should include organism entity draws");
assert.strictEqual(stats.terrainDraws, 12, "renderer stats should include terrain WebGL draws");
assert.strictEqual(stats.gpuFrameMs, 5, "renderer stats should report the slowest GPU pass time");
assert.strictEqual(stats.webglPresenterActive, true, "renderer stats should report active WebGL presenter state");
assert.strictEqual(stats.singleVisibleCanvas, true, "renderer stats should report single visible WebGL canvas state");
assert.strictEqual(stats.lodTier, "galaxy", "renderer stats should initialize active LOD tier");
assert.strictEqual(stats.lodTierIndex, 0, "renderer stats should initialize active LOD tier index");
assert.strictEqual(stats.lodTransitionAlpha, 0, "renderer stats should initialize LOD transition alpha");
assert.strictEqual(stats.preloadSurfaceLodIndex, 0, "renderer stats should initialize preload LOD target");
assert.strictEqual(Object.prototype.hasOwnProperty.call(stats, "copyBackFrameMs"), false, "renderer stats should not expose Canvas2D copy-back timing");
assert.strictEqual(Object.prototype.hasOwnProperty.call(stats, "compatibilityCanvasPresentsThisFrame"), false, "renderer stats should not expose Canvas2D compatibility presents");

console.log("renderer interface checks passed");
