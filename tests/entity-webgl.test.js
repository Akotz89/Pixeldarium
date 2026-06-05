const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const namespaceSource = read("js/core/namespace.js");
const configSource = read("config.js");
const pipelineSource = read("js/render/pipeline.js");
const entitiesSource = read("js/render/entities.js");
const engineSource = read("js/render/webgl-engine.js");
const entityWebglSource = read("js/render/entity-webgl.js");

assert.ok(namespaceSource.indexOf("js/render/entity-atlas.js") < namespaceSource.indexOf("js/render/entity-webgl.js"), "entity atlas should load before entity WebGL");
assert.ok(namespaceSource.indexOf("js/render/entity-webgl.js") >= 0, "entity WebGL compositor should load in the runtime");
assert.ok(/PLANET_ENTITY_WEBGL_INSTANCING:\s*true/.test(configSource), "entity WebGL instancing should be enabled by default");
assert.ok(/PLANET_ENTITY_WEBGL_MAX_INSTANCES:\s*8192/.test(configSource), "entity WebGL instancing should have a capped batch size");
assert.ok(pipelineSource.indexOf("PS.render.entityWebgl") >= 0, "render rebuilds should include the entity WebGL subsystem");

assert.ok(engineSource.indexOf('getContext("webgl2"') >= 0, "shared WebGL engine should create raw WebGL2 contexts");
assert.ok(engineSource.indexOf("gl.NEAREST") >= 0, "shared WebGL engine should preserve pixel-art nearest-neighbor sampling");
assert.ok(entityWebglSource.indexOf('ensureTarget("entities"') >= 0, "entity compositor should allocate through shared engine target");
assert.ok(entityWebglSource.indexOf("getTraitOrganismCell") >= 0, "entity compositor should use trait-coded organism atlas cells");
assert.ok(entityWebglSource.indexOf("getRgbaTexture") >= 0, "entity compositor should upload packed RGBA atlas pages");
assert.strictEqual(entityWebglSource.indexOf("PS.spriteSystem"), -1, "entity compositor should not depend on the removed sprite system");
assert.ok(entityWebglSource.indexOf('ensureBuffer(state.target, "entity-quad"') >= 0, "entity compositor should use shared quad buffer");
assert.ok(entityWebglSource.indexOf('ensureBuffer(state.target, "entity-instances"') >= 0, "entity compositor should use shared instance buffer");
assert.ok(entityWebglSource.indexOf("updateBuffer") >= 0, "entity compositor should upload instance data through shared engine");
assert.ok(entityWebglSource.indexOf("beginTransparentPass") >= 0, "entity compositor should use shared pass setup");
assert.ok(entityWebglSource.indexOf("presentTarget") >= 0, "entity compositor should present through WebGL");
assert.strictEqual(entityWebglSource.indexOf("drawTargetTo2d"), -1, "entity compositor should not copy back to Canvas2D");
assert.ok(entityWebglSource.indexOf("drawArraysInstanced") >= 0, "entity compositor should submit instanced draws");
assert.ok(entityWebglSource.indexOf("drawOrganisms") >= 0, "entity compositor should expose organism rendering");
assert.ok(entityWebglSource.indexOf("drawFood") >= 0, "entity compositor should expose food rendering");
assert.ok(entityWebglSource.indexOf("getSettlementCell") >= 0, "entity compositor should request settlement atlas cells");
assert.ok(entityWebglSource.indexOf("buildSettlementBatches") >= 0, "entity compositor should batch settlement markers");
assert.ok(entityWebglSource.indexOf("drawSettlements") >= 0, "entity compositor should expose settlement rendering");
assert.ok(entityWebglSource.indexOf("settlementDrawCount") >= 0, "entity compositor should report settlement draw counts");
assert.ok(entityWebglSource.indexOf("getRouteCell") >= 0, "entity compositor should request route atlas cells");
assert.ok(entityWebglSource.indexOf("buildSettlementRouteBatches") >= 0, "entity compositor should batch settlement route markers");
assert.ok(entityWebglSource.indexOf("drawSettlementRoutes") >= 0, "entity compositor should expose route rendering");
assert.ok(entityWebglSource.indexOf("routeDrawCount") >= 0, "entity compositor should report route draw counts");

assert.ok(entitiesSource.indexOf("entityWebgl.drawOrganisms(interpolation)") >= 0, "organism rendering should use the instanced path");
assert.ok(entitiesSource.indexOf("entityWebgl.drawFood()") >= 0, "food rendering should use the instanced path");
assert.ok(entitiesSource.indexOf("entityWebgl.drawSettlements()") >= 0, "settlement rendering should use the instanced path");
assert.ok(entitiesSource.indexOf("entityWebgl.drawSettlementRoutes()") >= 0, "settlement route rendering should use the instanced path");
assert.strictEqual(entitiesSource.indexOf("ctx"), -1, "entity facade should not reference Canvas2D context");

console.log("entity webgl checks passed");
