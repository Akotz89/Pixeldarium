PS.render = PS.render || {};

PS.render.ShaderManager = function () {
  this.registry = {};
  this.programs = [];
  this.errors = [];
  this.lastManifestStatus = null;
  this.hotReloadEnabled = false;
  this.hotReloadTimer = null;
  this.reloadVersion = 0;
};

PS.render.ShaderManager.prototype.register = function (name, vertexSrc, fragmentSrc, meta) {
  var shaderName = String(name || "").trim();

  if (!shaderName) {
    throw new Error("Shader name is required");
  }

  this.registry[shaderName] = {
    name: shaderName,
    vertexSrc: String(vertexSrc || ""),
    fragmentSrc: String(fragmentSrc || ""),
    vertexPath: meta && meta.vertexPath ? meta.vertexPath : "",
    fragmentPath: meta && meta.fragmentPath ? meta.fragmentPath : "",
    loaded: true,
    compileCount: 0,
    fallbackCount: 0,
    lastError: ""
  };

  this.invalidate(shaderName);
  return this.registry[shaderName];
};

PS.render.ShaderManager.prototype.loadFromFile = function (name, vertPath, fragPath, loader) {
  var self = this;
  var assetLoader = loader || (PS.assets && PS.assets.startupLoader) || (PS.assets && PS.assets.AssetLoader ? new PS.assets.AssetLoader() : null);

  if (!assetLoader || typeof assetLoader.loadText !== "function") {
    return Promise.reject(new Error("AssetLoader.loadText is required for shader loading"));
  }

  return Promise.all([
    assetLoader.loadText(vertPath),
    assetLoader.loadText(fragPath)
  ]).then(function (sources) {
    return self.register(name, sources[0], sources[1], {
      vertexPath: vertPath,
      fragmentPath: fragPath
    });
  });
};

PS.render.ShaderManager.prototype.loadManifest = function (manifest, loader) {
  var self = this;
  var entries = Array.isArray(manifest) ? manifest : [];

  return Promise.all(entries.map(function (entry) {
    return self.loadFromFile(entry.name, entry.vertex, entry.fragment, loader).then(function (shader) {
      return {
        status: "ready",
        name: entry.name,
        shader: shader
      };
    }).catch(function (error) {
      var message = error && error.message ? error.message : String(error);

      self.errors.push({
        name: entry && entry.name ? entry.name : "unknown",
        message: message,
        time: new Date().toISOString()
      });

      if (self.errors.length > 25) {
        self.errors.shift();
      }

      if (PS.runtime && typeof PS.runtime.recordError === "function") {
        PS.runtime.recordError("shader.load.error", {
          name: entry && entry.name ? entry.name : "unknown",
          message: message
        });
      }

      return {
        status: "failed",
        name: entry && entry.name ? entry.name : "unknown",
        error: message
      };
    });
  })).then(function (results) {
    var ready = [];
    var failed = [];

    results.forEach(function (result) {
      if (result.status === "ready") {
        ready.push(result.shader);
      } else {
        failed.push({
          name: result.name,
          error: result.error
        });
      }
    });

    self.lastManifestStatus = {
      total: entries.length,
      loaded: ready.length,
      failed: failed.length,
      ready: ready.length,
      failedShaders: failed
    };

    return ready;
  });
};

PS.render.ShaderManager.prototype.invalidate = function (name) {
  for (var i = 0; i < this.programs.length; i++) {
    if (!name || this.programs[i].name === name) {
      this.programs[i].program = null;
    }
  }
};

PS.render.ShaderManager.prototype.getSourceContext = function (source, lineNumber, radius) {
  var lines = String(source || "").split("\n");
  var line = Math.max(1, Math.round(Number(lineNumber) || 1));
  var start = Math.max(1, line - (radius || 2));
  var end = Math.min(lines.length, line + (radius || 2));
  var output = [];

  for (var i = start; i <= end; i++) {
    output.push((i === line ? "> " : "  ") + i + ": " + lines[i - 1]);
  }

  return output.join("\n");
};

PS.render.ShaderManager.prototype.parseErrorLine = function (info) {
  var match = String(info || "").match(/(?:ERROR:\s*)?\d+:(\d+):/);
  return match ? Number(match[1]) : 1;
};

PS.render.ShaderManager.prototype.createShader = function (gl, type, source, label) {
  var shader = gl.createShader(type);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    var info = gl.getShaderInfoLog(shader) || "unknown shader compile error";
    var line = this.parseErrorLine(info);
    var error = new Error(label + " compile failed at line " + line + ":\n" + info + "\n" + this.getSourceContext(source, line, 2));

    gl.deleteShader(shader);
    throw error;
  }

  return shader;
};

PS.render.ShaderManager.prototype.createProgram = function (gl, vertexSource, fragmentSource, label) {
  var program = gl.createProgram();
  var vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertexSource, label + " vertex");
  var fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fragmentSource, label + " fragment");

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    var info = gl.getProgramInfoLog(program) || "unknown program link error";
    gl.deleteProgram(program);
    throw new Error(label + " link failed: " + info);
  }

  return program;
};

PS.render.ShaderManager.prototype.findProgram = function (gl, name) {
  for (var i = 0; i < this.programs.length; i++) {
    if (this.programs[i].gl === gl && this.programs[i].name === name) {
      return this.programs[i];
    }
  }

  var entry = { gl: gl, name: name, program: null };
  this.programs.push(entry);
  return entry;
};

PS.render.ShaderManager.prototype.getFallbackSources = function () {
  return {
    vertex: [
      "#version 300 es",
      "in vec2 a_position;",
      "void main() {",
      "  gl_Position = vec4(a_position, 0.0, 1.0);",
      "}"
    ].join("\n"),
    fragment: [
      "#version 300 es",
      "precision mediump float;",
      "out vec4 outColor;",
      "void main() {",
      "  outColor = vec4(1.0, 0.0, 1.0, 1.0);",
      "}"
    ].join("\n")
  };
};

PS.render.ShaderManager.prototype.getFallback = function (gl) {
  var sources = this.getFallbackSources();
  return this.createProgram(gl, sources.vertex, sources.fragment, "fallback");
};

PS.render.ShaderManager.prototype.compile = function (gl, name) {
  var shaderName = String(name || "").trim();
  var shader = this.registry[shaderName];
  var record = this.findProgram(gl, shaderName);

  if (record.program) {
    return record.program;
  }

  try {
    if (!shader || !shader.loaded) {
      throw new Error("Shader source not loaded: " + shaderName);
    }

    record.program = this.createProgram(gl, shader.vertexSrc, shader.fragmentSrc, shaderName);
    shader.compileCount++;
    shader.lastError = "";
    return record.program;
  } catch (error) {
    return this.recordFallback(gl, shaderName, error);
  }
};

PS.render.ShaderManager.prototype.recordFallback = function (gl, name, error) {
  var shader = this.registry[name] || { name: name, fallbackCount: 0 };
  var record = this.findProgram(gl, name);
  var message = error && error.message ? error.message : String(error);

  shader.fallbackCount = (shader.fallbackCount || 0) + 1;
  shader.lastError = message;
  this.registry[name] = shader;
  this.errors.push({
    name: name,
    message: message,
    time: new Date().toISOString()
  });

  if (this.errors.length > 25) {
    this.errors.shift();
  }

  if (PS.runtime && typeof PS.runtime.recordError === "function") {
    PS.runtime.recordError("shader.compile.fallback", {
      name: name,
      message: message
    });
  }

  record.program = this.getFallback(gl);
  return record.program;
};

PS.render.ShaderManager.prototype.getProgram = function (gl, name) {
  if (!gl) {
    return null;
  }

  return this.compile(gl, name);
};

PS.render.ShaderManager.prototype.getUniformLocations = function (gl, program, names) {
  var locations = {};

  for (var i = 0; i < names.length; i++) {
    locations[names[i]] = gl.getUniformLocation(program, names[i]);
  }

  return locations;
};

PS.render.ShaderManager.prototype.setUniform = function (gl, program, name, type, value) {
  var location = gl.getUniformLocation(program, name);

  if (!location) {
    return false;
  }

  if (type === "1i") {
    gl.uniform1i(location, value);
  } else if (type === "1f") {
    gl.uniform1f(location, value);
  } else if (type === "2f") {
    gl.uniform2f(location, value[0], value[1]);
  } else if (type === "3f") {
    gl.uniform3f(location, value[0], value[1], value[2]);
  } else if (type === "4f") {
    gl.uniform4f(location, value[0], value[1], value[2], value[3]);
  } else {
    return false;
  }

  return true;
};

PS.render.ShaderManager.prototype.enableHotReload = function (intervalMs, loader) {
  var self = this;
  var delay = Math.max(250, Math.round(Number(intervalMs) || 1000));
  var assetLoader = loader || (PS.assets && PS.assets.startupLoader) || null;

  this.hotReloadEnabled = true;
  this.reloadVersion++;
  this.invalidate();

  if (this.hotReloadTimer || typeof setInterval !== "function") {
    return true;
  }

  this.hotReloadTimer = setInterval(function () {
    self.loadManifest(PS.render.shaderManifest, assetLoader).then(function () {
      self.reloadVersion++;
      self.invalidate();
    }).catch(function (error) {
      self.errors.push({
        name: "hot-reload",
        message: error && error.message ? error.message : String(error),
        time: new Date().toISOString()
      });
    });
  }, delay);

  return true;
};

PS.render.ShaderManager.prototype.getStats = function () {
  return {
    shaderCount: Object.keys(this.registry).length,
    programCount: this.programs.length,
    errorCount: this.errors.length,
    hotReloadEnabled: this.hotReloadEnabled,
    reloadVersion: this.reloadVersion
  };
};

PS.render.ShaderManager.prototype.shouldAutoHotReload = function () {
  if (typeof window === "undefined" || !window.location) {
    return false;
  }

  return window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "::1";
};

PS.render.shaderManager = PS.render.shaderManager || new PS.render.ShaderManager();

PS.render.shaderManifest = [
  { name: "sprite-batch", vertex: "shaders/sprite-batch.vert", fragment: "shaders/sprite-batch.frag" },
  { name: "terrain-tile", vertex: "shaders/terrain-tile.vert", fragment: "shaders/terrain-tile.frag" },
  { name: "gbuffer-compose", vertex: "shaders/gbuffer-compose.vert", fragment: "shaders/gbuffer-compose.frag" },
  { name: "gbuffer-terrain", vertex: "shaders/gbuffer-terrain.vert", fragment: "shaders/gbuffer-terrain.frag" },
  { name: "globe-sphere", vertex: "shaders/globe-sphere.vert", fragment: "shaders/globe-sphere.frag" },
  { name: "surface-chunk", vertex: "shaders/surface-chunk.vert", fragment: "shaders/surface-chunk.frag" },
  { name: "entity-atlas", vertex: "shaders/entity-atlas.vert", fragment: "shaders/entity-atlas.frag" },
  { name: "shadow", vertex: "shaders/shadow.vert", fragment: "shaders/shadow.frag" },
  { name: "particle", vertex: "shaders/particle.vert", fragment: "shaders/particle.frag" }
];
