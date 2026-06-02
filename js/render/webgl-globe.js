PS.render = PS.render || {};
PS.render.webglGlobe = PS.render.webglGlobe || {};

PS.render.webglGlobe.state = {
  canvas: null,
  gl: null,
  program: null,
  buffer: null,
  terrainTexture: null,
  overlayTexture: null,
  textureSignature: null,
  overlaySignature: null,
  drawCount: 0,
  fallbackCount: 0,
  textureUploadCount: 0,
  overlayUploadCount: 0,
  lastFrameMs: 0,
  lastTextureUploadMs: 0,
  lastOverlayUploadMs: 0,
  lastUsedObservationOverlay: "none",
  lastUsedFallback: false
};

PS.render.webglGlobe.getTextureSignature = function () {
  return [
    world && world.seedText ? world.seedText : "",
    WORLD_WIDTH,
    WORLD_HEIGHT,
    world && world.planetTiles ? world.planetTiles.length : 0,
    world && world.terrain ? world.terrain.length : 0
  ].join(":");
};

PS.render.webglGlobe.ensureCanvas = function () {
  if (typeof document === "undefined" || typeof canvas === "undefined") {
    return false;
  }

  if (!PS.render.webglGlobe.state.canvas) {
    PS.render.webglGlobe.state.canvas = document.createElement("canvas");
  }

  PS.render.webglGlobe.state.canvas.width = canvas.width;
  PS.render.webglGlobe.state.canvas.height = canvas.height;
  return true;
};

PS.render.webglGlobe.initialize = function () {
  var state = PS.render.webglGlobe.state;

  if (!PS.render.webglGlobe.ensureCanvas()) {
    return false;
  }

  if (!state.gl) {
    state.gl = PS.gl.init(state.canvas);
  }

  if (!state.gl) {
    return false;
  }

  if (!state.program) {
    state.program = PS.gl.createProgram(
      state.gl,
      PS.render.webglGlobeShaders.vertex,
      PS.render.webglGlobeShaders.fragment
    );
    state.buffer = state.gl.createBuffer();
  }

  return true;
};

PS.render.webglGlobe.uploadTerrainTexture = function () {
  var state = PS.render.webglGlobe.state;
  var gl = state.gl;
  var signature = PS.render.webglGlobe.getTextureSignature();

  if (state.terrainTexture && state.textureSignature === signature) {
    return;
  }

  var startedAt = performance.now();
  var data = new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT * 4);

  for (var y = 0; y < WORLD_HEIGHT; y++) {
    for (var x = 0; x < WORLD_WIDTH; x++) {
      var index = (y * WORLD_WIDTH + x) * 4;
      var rgb = PS.render.terrain.getRgbFromHex(
        getPlanetTileCompositedColor(getPlanetTile(x, y))
      );

      data[index] = rgb.red;
      data[index + 1] = rgb.green;
      data[index + 2] = rgb.blue;
      data[index + 3] = 255;
    }
  }

  if (!state.terrainTexture) {
    state.terrainTexture = gl.createTexture();
  }

  gl.bindTexture(gl.TEXTURE_2D, state.terrainTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    WORLD_WIDTH,
    WORLD_HEIGHT,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    data
  );

  state.textureSignature = signature;
  state.textureUploadCount++;
  state.lastTextureUploadMs = performance.now() - startedAt;
};

PS.render.webglGlobe.getOverlayMode = function (overlay) {
  var blendMode = overlay ? String(overlay.blendMode || "") : "";

  if (blendMode === "screen") {
    return 1;
  }

  if (blendMode === "lighter" || blendMode === "plus-lighter") {
    return 2;
  }

  return 0;
};

PS.render.webglGlobe.getObservationOverlaySignature = function () {
  var activeId = world && world.activeObservationOverlay ? world.activeObservationOverlay : "none";

  return [
    activeId,
    WORLD_WIDTH,
    WORLD_HEIGHT,
    world && world.tick ? world.tick : 0,
    world && world.organisms ? world.organisms.length : 0,
    world && world.food ? world.food.length : 0,
    world && world.atmosphere ? JSON.stringify(world.atmosphere.gases || {}) : "",
    world && world.microbial ? String(world.microbial.ageTicks || 0) + ":" + String(world.microbial.totalDensity || 0) : ""
  ].join(":");
};

PS.render.webglGlobe.uploadObservationOverlayTexture = function () {
  var state = PS.render.webglGlobe.state;
  var gl = state.gl;
  var activeId = PS.render.observationOverlays ? PS.render.observationOverlays.getActiveId() : "none";
  var overlay = PS.render.overlays.get(activeId);
  var signature = PS.render.webglGlobe.getObservationOverlaySignature();
  var startedAt = performance.now();
  var data = new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT * 4);
  var sample = null;

  if (state.overlayTexture && state.overlaySignature === signature) {
    return;
  }

  if (overlay && activeId !== "none" && PS.render.observationOverlays) {
    for (var y = 0; y < WORLD_HEIGHT; y++) {
      for (var x = 0; x < WORLD_WIDTH; x++) {
        var index = (y * WORLD_WIDTH + x) * 4;

        sample = PS.render.observationOverlays.getOverlaySample(activeId, x, y, getPlanetTile(x, y));
        data[index] = sample.red;
        data[index + 1] = sample.green;
        data[index + 2] = sample.blue;
        data[index + 3] = sample.alpha;
      }
    }
  }

  if (!state.overlayTexture) {
    state.overlayTexture = gl.createTexture();
  }

  gl.bindTexture(gl.TEXTURE_2D, state.overlayTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    WORLD_WIDTH,
    WORLD_HEIGHT,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    data
  );

  state.overlaySignature = signature;
  state.overlayUploadCount++;
  state.lastOverlayUploadMs = performance.now() - startedAt;
};

PS.render.webglGlobe.draw = function (targetCtx, projection) {
  var state = PS.render.webglGlobe.state;
  var startedAt = performance.now();

  state.lastUsedFallback = true;

  try {
    if (!targetCtx || !projection || isPlanetLocalView() || !PS.render.webglGlobe.initialize()) {
      state.fallbackCount++;
      return false;
    }

    PS.render.webglGlobe.uploadTerrainTexture();
    PS.render.webglGlobe.uploadObservationOverlayTexture();

    var gl = state.gl;
    var program = state.program;
    var activeOverlay = PS.render.overlays.get(world.activeObservationOverlay);
    var vertexData = new Float32Array([
      -1, -1, 0, 1,
      1, -1, 1, 1,
      -1, 1, 0, 0,
      1, 1, 1, 0
    ]);
    var stride = 4 * Float32Array.BYTES_PER_ELEMENT;
    var positionLocation = gl.getAttribLocation(program, "a_position");
    var uvLocation = gl.getAttribLocation(program, "a_uv");

    gl.viewport(0, 0, state.canvas.width, state.canvas.height);
    gl.clearColor(1 / 255, 3 / 255, 10 / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, state.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(uvLocation);
    gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, state.terrainTexture);
    gl.uniform1i(gl.getUniformLocation(program, "u_terrain"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, state.overlayTexture);
    gl.uniform1i(gl.getUniformLocation(program, "u_overlay"), 1);
    gl.uniform1i(gl.getUniformLocation(program, "u_overlayMode"), PS.render.webglGlobe.getOverlayMode(activeOverlay));
    gl.uniform1f(gl.getUniformLocation(program, "u_overlayAlpha"), activeOverlay ? Math.max(0, Math.min(1, Number(activeOverlay.alpha) || 1)) : 0);
    gl.uniform2f(gl.getUniformLocation(program, "u_canvasSize"), canvas.width, canvas.height);
    gl.uniform3f(
      gl.getUniformLocation(program, "u_centerRadius"),
      projection.centerX,
      projection.centerY,
      projection.radius
    );
    gl.uniform2f(
      gl.getUniformLocation(program, "u_view"),
      projection.viewLatitudeDeg * Math.PI / 180,
      projection.viewLongitudeDeg * Math.PI / 180
    );
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    targetCtx.drawImage(state.canvas, 0, 0);

    state.drawCount++;
    state.lastUsedFallback = false;
    state.lastUsedObservationOverlay = world.activeObservationOverlay || "none";
    state.lastFrameMs = performance.now() - startedAt;

    if (activeOverlay && world.overlayPerformance) {
      world.overlayPerformance.active = state.lastUsedObservationOverlay;
      world.overlayPerformance.lastFrameMs = state.lastOverlayUploadMs;
      world.overlayPerformance.lastSampleCount = WORLD_WIDTH * WORLD_HEIGHT;
      world.overlayPerformance.blendMode = activeOverlay.blendMode || "source-over";
      world.overlayPerformance.compositor = "webgl2";
    }

    return true;
  } catch (error) {
    state.fallbackCount++;
    state.lastError = String(error && error.message ? error.message : error);
    return false;
  }
};

PS.render.webglGlobe.rebuildShaders = function () {
  var state = PS.render.webglGlobe.state;

  state.program = null;
  state.buffer = null;
};

PS.render.webglGlobe.rebuildTextures = function () {
  var state = PS.render.webglGlobe.state;

  state.terrainTexture = null;
  state.overlayTexture = null;
  state.textureSignature = null;
  state.overlaySignature = null;
};
