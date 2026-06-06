const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const namespaceSource = read("js/core/namespace.js");
const pipelineSource = read("js/render/pipeline.js");
const engineSource = read("js/render/webgl-engine.js");
const targetsSource = read("js/render/webgl-targets.js");
const compositorSource = read("js/render/webgl-compositor.js");
const globeSource = read("js/render/webgl-globe.js");
const compositorShaderSource = read("shaders/gbuffer-compose.frag");

assert.ok(namespaceSource.indexOf("js/render/webgl-engine.js") >= 0, "shared WebGL engine should load in the runtime");
assert.ok(namespaceSource.indexOf("js/render/webgl-targets.js") > namespaceSource.indexOf("js/render/webgl-engine.js"), "FBO target extension should load after shared WebGL engine");
assert.ok(namespaceSource.indexOf("js/render/webgl-compositor.js") > namespaceSource.indexOf("js/render/webgl-targets.js"), "final compositor should load after FBO target extension");
assert.ok(pipelineSource.indexOf("PS.render.webglEngine") >= 0, "render rebuilds should include the shared WebGL engine");
assert.ok(pipelineSource.indexOf("PS.render.webglCompositor") >= 0, "render rebuilds should include the final WebGL compositor");
assert.ok(pipelineSource.indexOf("PS.render.webglGlobe") >= 0, "render rebuilds should include the WebGL globe");

assert.ok(engineSource.indexOf("ensureTarget") >= 0, "shared WebGL engine should own render target creation");
assert.ok(engineSource.indexOf('getContext("webgl2"') >= 0, "shared WebGL engine should create raw WebGL2 contexts");
assert.ok(engineSource.indexOf("sharedCanvas") >= 0, "shared WebGL engine should use one shared render canvas");
assert.ok(engineSource.indexOf("sharedGl") >= 0, "shared WebGL engine should use one shared WebGL2 context");
assert.ok(engineSource.indexOf("beginTransparentPass") >= 0, "shared WebGL engine should own transparent pass setup");
assert.ok(engineSource.indexOf("getRgbaTexture") >= 0, "shared WebGL engine should upload raw RGBA material textures");
assert.ok(engineSource.indexOf("getMutableRgbaTexture") >= 0, "shared WebGL engine should own mutable raw RGBA texture updates");
assert.ok(engineSource.indexOf("texStorage2D") >= 0, "mutable raw RGBA textures should use immutable WebGL2 storage when available");
assert.ok(engineSource.indexOf("texSubImage2D") >= 0, "mutable raw RGBA textures should update resident storage with sub-image uploads");
assert.strictEqual(engineSource.indexOf("drawTargetTo2d"), -1, "shared WebGL engine should not expose Canvas2D copy-back");
assert.strictEqual(engineSource.indexOf("drawTo2dCount"), -1, "shared WebGL engine should not track Canvas2D copy-back counts");

assert.ok(targetsSource.indexOf("ensureFramebufferTarget") >= 0, "shared WebGL engine should own FBO-backed render targets");
assert.ok(targetsSource.indexOf("createFramebuffer") >= 0, "FBO render targets should allocate framebuffers");
assert.ok(targetsSource.indexOf("framebufferTexture2D") >= 0, "FBO render targets should attach color textures");
assert.strictEqual(targetsSource.indexOf("drawFramebufferTargetTo2d"), -1, "FBO targets should not expose Canvas2D handoff");
assert.ok(targetsSource.indexOf("framebufferResidentBytes") >= 0, "runtime stats should expose FBO residency bytes");

assert.ok(compositorSource.indexOf("drawTargetToPresenter") >= 0, "final compositor should present render textures directly");
assert.strictEqual(compositorSource.indexOf("drawTargetTo2d"), -1, "final compositor should not copy to Canvas2D");
assert.ok(compositorSource.indexOf('shaderName = "gbuffer-compose"') >= 0, "final compositor should use the file-backed gbuffer-compose shader");
assert.ok(compositorShaderSource.indexOf("uniform sampler2D u_source") >= 0, "final compositor shader should sample FBO render textures");
assert.ok(globeSource.indexOf("targetCtx") < 0, "WebGL globe should render directly to the WebGL canvas");

console.log("webgl engine checks passed");
