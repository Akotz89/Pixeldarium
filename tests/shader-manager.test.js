const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const namespaceSource = read("js/core/namespace.js");
const loaderSource = read("js/assets/loader.js");
const managerSource = read("js/render/shader-manager.js");
const mainLoopSource = read("js/main-loop.js");
const terrainSource = read("js/render/terrain.js");

assert.ok(namespaceSource.indexOf("js/render/shader-manager.js") < namespaceSource.indexOf("js/render/gl.js"), "shader manager should load before WebGL helpers");
assert.ok(mainLoopSource.indexOf("loadStartupShaders") >= 0, "startup should load shader files before first draw");
assert.ok(loaderSource.indexOf("loadText") >= 0, "asset loader should support shader text loading");
assert.ok(terrainSource.indexOf("getPlanetProjection") >= 0, "terrain draw should use the active globe projection helper");

const requiredShaders = [
  "sprite-batch",
  "terrain-tile",
  "gbuffer-compose",
  "gbuffer-terrain",
  "globe-sphere",
  "surface-chunk",
  "entity-atlas",
  "shadow",
  "particle"
];

requiredShaders.forEach((name) => {
  assert.ok(fs.existsSync(path.join(root, "shaders", name + ".vert")), "missing vertex shader " + name);
  assert.ok(fs.existsSync(path.join(root, "shaders", name + ".frag")), "missing fragment shader " + name);
  assert.ok(fs.existsSync(path.join(root, "shaders", name + ".vert.js")), "missing vertex shader sidecar " + name);
  assert.ok(fs.existsSync(path.join(root, "shaders", name + ".frag.js")), "missing fragment shader sidecar " + name);
});

[
  "js/render/sprite-shaders.js",
  "js/render/webgl-globe-shaders.js",
  "js/render/surface-tile-webgl.js",
  "js/render/entity-webgl.js",
  "js/render/webgl-gbuffer.js",
  "js/render/webgl-compositor.js"
].forEach((file) => {
  assert.strictEqual(read(file).indexOf("#version 300 es"), -1, file + " should not contain inline GLSL source");
});

assert.strictEqual(
  fs.existsSync(path.join(root, "js/render/surface-webgl.js")),
  false,
  "obsolete Canvas2D chunk compositor source should be removed"
);

function makeGl() {
  return {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    shaders: [],
    programs: [],
    createShader(type) {
      const shader = { type, source: "", compiled: false };
      this.shaders.push(shader);
      return shader;
    },
    shaderSource(shader, source) {
      shader.source = source;
    },
    compileShader(shader) {
      shader.compiled = shader.source.indexOf("BROKEN") === -1;
    },
    getShaderParameter(shader) {
      return shader.compiled;
    },
    getShaderInfoLog(shader) {
      return shader.compiled ? "" : "ERROR: 0:3: syntax error";
    },
    deleteShader(shader) {
      shader.deleted = true;
    },
    createProgram() {
      const program = { shaders: [], linked: true };
      this.programs.push(program);
      return program;
    },
    attachShader(program, shader) {
      program.shaders.push(shader);
    },
    linkProgram(program) {
      program.linked = program.shaders.every((shader) => shader.compiled);
    },
    getProgramParameter(program) {
      return program.linked;
    },
    getProgramInfoLog() {
      return "";
    },
    deleteProgram(program) {
      program.deleted = true;
    },
    getUniformLocation(program, name) {
      return { program, name };
    },
    uniform1i(location, value) {
      location.value = value;
    },
    uniform1f(location, value) {
      location.value = value;
    },
    uniform2f(location, a, b) {
      location.value = [a, b];
    },
    uniform3f(location, a, b, c) {
      location.value = [a, b, c];
    },
    uniform4f(location, a, b, c, d) {
      location.value = [a, b, c, d];
    }
  };
}

const runtimeErrors = [];
const context = {
  PS: {
    render: {},
    assets: {},
    runtime: {
      recordError(kind, payload) {
        runtimeErrors.push({ kind, payload });
      }
    }
  },
  fetch(url) {
    return Promise.resolve({
      ok: true,
      text() {
        return Promise.resolve(url.endsWith(".vert")
          ? "#version 300 es\nin vec2 a_position;\nvoid main() {\n  gl_Position = vec4(a_position, 0.0, 1.0);\n}"
          : "#version 300 es\nprecision mediump float;\nout vec4 outColor;\nvoid main() {\n  outColor = vec4(1.0);\n}");
      }
    });
  },
  window: {
    location: {
      protocol: "http:",
      hostname: "127.0.0.1"
    }
  },
  document: {
    createElement(tagName) {
      assert.strictEqual(tagName, "script", "text fallback should create script tags");
      return {};
    },
    head: {
      appendChild(script) {
        context.PS.assets.registerText(script.src.replace(/\.js$/, ""), "#version 300 es\nvoid main() {}\n");
        script.onload();
        return script;
      }
    }
  },
  Map,
  Promise,
  XMLHttpRequest: undefined,
  setInterval() {
    return 1;
  },
  Date,
  Object,
  String,
  Number,
  Boolean,
  Array,
  Math,
  Error
};

vm.createContext(context);
vm.runInContext(loaderSource, context, { filename: "js/assets/loader.js" });
vm.runInContext(managerSource, context, { filename: "js/render/shader-manager.js" });

(async function () {
  const manager = context.PS.render.shaderManager;
  const loader = new context.PS.assets.AssetLoader();
  await manager.loadFromFile("file-backed", "shaders/file-backed.vert", "shaders/file-backed.frag", loader);

  assert.strictEqual(manager.registry["file-backed"].loaded, true, "loadFromFile should register loaded shader source");

  const manifestResults = await manager.loadManifest([
    { name: "manifest-ready", vertex: "shaders/manifest-ready.vert", fragment: "shaders/manifest-ready.frag" },
    { name: "manifest-missing", vertex: "shaders/manifest-missing.vert", fragment: "shaders/manifest-missing.frag" }
  ], {
    loadText(url) {
      if (url.indexOf("manifest-missing") >= 0) {
        return Promise.reject(new Error("missing shader"));
      }

      return Promise.resolve(url.endsWith(".vert")
        ? "#version 300 es\nin vec2 a_position;\nvoid main() { gl_Position = vec4(a_position, 0.0, 1.0); }"
        : "#version 300 es\nprecision mediump float;\nout vec4 outColor;\nvoid main() { outColor = vec4(1.0); }");
    }
  });

  assert.strictEqual(manifestResults.length, 1, "shader manifest should promote ready shaders even when one entry fails");
  assert.strictEqual(manager.lastManifestStatus.loaded, 1, "manifest status should count ready shaders");
  assert.strictEqual(manager.lastManifestStatus.failed, 1, "manifest status should count failed shaders");
  assert.ok(manager.registry["manifest-ready"].loaded, "ready manifest shader should be registered");

  const gl = makeGl();
  const program = manager.getProgram(gl, "file-backed");
  assert.ok(program, "file-backed shader should compile to a program");
  assert.strictEqual(manager.registry["file-backed"].compileCount, 1, "compile count should be recorded");

  context.window.location.protocol = "file:";
  const fileLoader = new context.PS.assets.AssetLoader();
  const fileText = await fileLoader.loadText("shaders/file-fallback.vert");
  assert.ok(fileText.indexOf("#version 300 es") >= 0, "file protocol shader text should load from a sidecar");
  context.window.location.protocol = "http:";

  manager.register(
    "broken",
    "#version 300 es\nin vec2 a_position;\nBROKEN\nvoid main() { gl_Position = vec4(a_position, 0.0, 1.0); }",
    "#version 300 es\nprecision mediump float;\nout vec4 outColor;\nvoid main() { outColor = vec4(1.0); }"
  );

  const fallback = manager.getProgram(gl, "broken");
  assert.ok(fallback, "broken shader should return fallback program instead of crashing");
  assert.ok(manager.registry.broken.lastError.indexOf("line 3") >= 0, "compile errors should include a GLSL line number");
  assert.ok(manager.registry.broken.lastError.indexOf("> 3: BROKEN") >= 0, "compile errors should include source context");
  assert.ok(runtimeErrors.some((error) => error.kind === "shader.compile.fallback"), "fallback should record a runtime shader error");

  assert.strictEqual(manager.enableHotReload(250, loader), true, "hot reload should be activatable in dev mode");
  assert.strictEqual(manager.getStats().hotReloadEnabled, true, "stats should expose hot reload state");

  console.log("shader manager checks passed");
}()).catch((error) => {
  console.error(error);
  process.exit(1);
});
