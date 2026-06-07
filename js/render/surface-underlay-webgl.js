PS.render = PS.render || {};
PS.render.surfaceUnderlayWebgl = PS.render.surfaceUnderlayWebgl || {};

PS.render.surfaceUnderlayWebgl.state = {
  target: null,
  gl: null,
  program: null,
  buffer: null,
  terrainTexture: null,
  terrainSignature: "",
  drawCount: 0,
  textureUploadCount: 0,
  fallbackCount: 0,
  lastFrameMs: 0,
  lastTextureUploadMs: 0,
  lastError: ""
};

PS.render.surfaceUnderlayWebgl.shaderName = "surface-underlay";

PS.render.surfaceUnderlayWebgl.getTerrainSignature = function () {
  return [
    world && world.seedText ? world.seedText : "",
    WORLD_WIDTH,
    WORLD_HEIGHT,
    world && world.planetTiles ? world.planetTiles.length : 0,
    PS.assets && typeof PS.assets.getPaletteVersion === "function"
      ? PS.assets.getPaletteVersion("terrain")
      : 0
  ].join(":");
};

PS.render.surfaceUnderlayWebgl.ensureTarget = function () {
  var state = PS.render.surfaceUnderlayWebgl.state;
  var target = PS.render.webglEngine && typeof PS.render.webglEngine.ensureTarget === "function"
    ? PS.render.webglEngine.ensureTarget("surface-underlay", canvas.width, canvas.height, { alpha: true })
    : null;

  if (!target || !target.gl) {
    return false;
  }

  state.target = target;
  state.gl = target.gl;
  return true;
};

PS.render.surfaceUnderlayWebgl.initialize = function () {
  var state = PS.render.surfaceUnderlayWebgl.state;
  var gl;
  var stride;

  if (!PS.render.surfaceUnderlayWebgl.ensureTarget()) {
    return false;
  }

  gl = state.gl;

  if (!state.program) {
    state.program = PS.render.shaderManager.getProgram(gl, PS.render.surfaceUnderlayWebgl.shaderName);
    state.buffer = PS.render.webglEngine.ensureBuffer(state.target, "surface-underlay-quad");
    stride = 4 * Float32Array.BYTES_PER_ELEMENT;
    state.locations = {
      position: gl.getAttribLocation(state.program, "a_position"),
      uv: gl.getAttribLocation(state.program, "a_uv"),
      terrain: gl.getUniformLocation(state.program, "u_terrain"),
      viewLatLon: gl.getUniformLocation(state.program, "u_viewLatLon"),
      degreesPerPixel: gl.getUniformLocation(state.program, "u_degreesPerPixel"),
      canvasSize: gl.getUniformLocation(state.program, "u_canvasSize"),
      stride: stride
    };
    PS.render.webglEngine.updateBuffer(state.target, "surface-underlay-quad", new Float32Array([
      -1, -1, 0, 1,
      1, -1, 1, 1,
      -1, 1, 0, 0,
      1, 1, 1, 0
    ]), gl.STATIC_DRAW);
  }

  return true;
};

PS.render.surfaceUnderlayWebgl.uploadTerrainTexture = function () {
  var state = PS.render.surfaceUnderlayWebgl.state;
  var gl = state.gl;
  var signature = PS.render.surfaceUnderlayWebgl.getTerrainSignature();
  var startedAt;
  var data;
  var x;
  var y;
  var index;
  var rgb;

  if (state.terrainTexture && state.terrainSignature === signature) {
    return true;
  }

  startedAt = performance.now();
  data = new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT * 4);

  for (y = 0; y < WORLD_HEIGHT; y++) {
    for (x = 0; x < WORLD_WIDTH; x++) {
      index = (y * WORLD_WIDTH + x) * 4;
      rgb = PS.render.terrain.getRgbFromHex(getPlanetTileCompositedColor(getPlanetTile(x, y)));
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
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, WORLD_WIDTH, WORLD_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);

  state.terrainSignature = signature;
  state.textureUploadCount++;
  state.lastTextureUploadMs = performance.now() - startedAt;
  return true;
};

PS.render.surfaceUnderlayWebgl.getTerrainTexture = function () {
  var state = PS.render.surfaceUnderlayWebgl.state;
  var globeState = PS.render.webglGlobe ? PS.render.webglGlobe.state : null;

  if (
    PS.render.webglGlobe &&
    typeof PS.render.webglGlobe.initialize === "function" &&
    typeof PS.render.webglGlobe.uploadTerrainTexture === "function" &&
    PS.render.webglGlobe.initialize()
  ) {
    PS.render.webglGlobe.uploadTerrainTexture();
    globeState = PS.render.webglGlobe.state;
    if (globeState && globeState.gl === state.gl && globeState.terrainTexture) {
      return globeState.terrainTexture;
    }
  }

  return PS.render.surfaceUnderlayWebgl.uploadTerrainTexture() ? state.terrainTexture : null;
};

PS.render.surfaceUnderlayWebgl.getDegreesPerPixel = function () {
  var info = PS.camera && typeof PS.camera.getInfo === "function" ? PS.camera.getInfo() : null;
  var view = PS.camera && typeof PS.camera.getView === "function" ? PS.camera.getView() : null;
  var metersPerPixel = info ? Math.max(0.1, Number(info.metersPerCanvasPixel) || 1) : 1;
  var latitude = view ? Number(view.latitude) || 0 : 0;
  var latMetersPerDegree = PS.camera && PS.camera.unified && typeof PS.camera.unified.getLatitudeDistanceKmPerDegree === "function"
    ? PS.camera.unified.getLatitudeDistanceKmPerDegree() * 1000
    : 111320;
  var lonMetersPerDegree = PS.camera && PS.camera.unified && typeof PS.camera.unified.getLongitudeDistanceKmPerDegree === "function"
    ? PS.camera.unified.getLongitudeDistanceKmPerDegree(latitude) * 1000
    : Math.max(1, 111320 * Math.cos(latitude * Math.PI / 180));

  return {
    longitude: metersPerPixel / Math.max(1, lonMetersPerDegree),
    latitude: metersPerPixel / Math.max(1, latMetersPerDegree)
  };
};

PS.render.surfaceUnderlayWebgl.draw = function (alpha) {
  var state = PS.render.surfaceUnderlayWebgl.state;
  var startedAt = performance.now();
  var gl;
  var loc;
  var view;
  var degreesPerPixel;
  var terrainTexture;

  try {
    if (
      CONFIG.PLANET_SURFACE_UNDERLAY_WEBGL === false ||
      !PS.render.surfaceUnderlayWebgl.initialize()
    ) {
      state.fallbackCount++;
      return false;
    }

    gl = state.gl;
    loc = state.locations;
    view = PS.camera.getView();
    degreesPerPixel = PS.render.surfaceUnderlayWebgl.getDegreesPerPixel();
    terrainTexture = PS.render.surfaceUnderlayWebgl.getTerrainTexture();

    if (!terrainTexture) {
      state.fallbackCount++;
      return false;
    }

    PS.render.webglEngine.beginTransparentPass(state.target);
    gl.useProgram(state.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, state.buffer);
    gl.enableVertexAttribArray(loc.position);
    gl.vertexAttribPointer(loc.position, 2, gl.FLOAT, false, loc.stride, 0);
    gl.enableVertexAttribArray(loc.uv);
    gl.vertexAttribPointer(loc.uv, 2, gl.FLOAT, false, loc.stride, 2 * Float32Array.BYTES_PER_ELEMENT);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, terrainTexture);
    gl.uniform1i(loc.terrain, 0);
    gl.uniform2f(loc.viewLatLon, Number(view.latitude) || 0, Number(view.longitude) || 0);
    gl.uniform2f(loc.degreesPerPixel, degreesPerPixel.longitude, degreesPerPixel.latitude);
    gl.uniform2f(loc.canvasSize, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (PS.render.webglPresenter && typeof PS.render.webglPresenter.presentTarget === "function") {
      PS.render.webglPresenter.presentTarget(state.target);
    }

    state.drawCount++;
    state.lastFrameMs = performance.now() - startedAt;
    state.lastError = "";
    return true;
  } catch (error) {
    state.fallbackCount++;
    state.lastError = String(error && error.message ? error.message : error);
    return false;
  }
};

PS.render.surfaceUnderlayWebgl.getStats = function () {
  var state = PS.render.surfaceUnderlayWebgl.state;

  return {
    drawCount: state.drawCount,
    textureUploadCount: state.textureUploadCount,
    fallbackCount: state.fallbackCount,
    lastFrameMs: state.lastFrameMs,
    lastTextureUploadMs: state.lastTextureUploadMs,
    lastError: state.lastError
  };
};

PS.render.surfaceUnderlayWebgl.rebuildShaders = function () {
  var state = PS.render.surfaceUnderlayWebgl.state;
  state.program = null;
  state.buffer = null;
  state.locations = null;
};

PS.render.surfaceUnderlayWebgl.rebuildTextures = function () {
  var state = PS.render.surfaceUnderlayWebgl.state;
  if (state.gl && state.terrainTexture) {
    state.gl.deleteTexture(state.terrainTexture);
  }
  state.terrainTexture = null;
  state.terrainSignature = "";
};
