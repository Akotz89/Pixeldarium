PS.render = PS.render || {};
PS.render.surfaceTileWebgl = PS.render.surfaceTileWebgl || {};

PS.render.surfaceTileWebgl.strideFloats = 10;

PS.render.surfaceTileWebgl.state = {
  canvas: null,
  gl: null,
  target: null,
  program: null,
  quadBuffer: null,
  instanceBuffer: null,
  textures: {},
  textureOrder: [],
  locations: null,
  instanceData: null,
  drawCount: 0,
  tileDrawCount: 0,
  pageDrawCount: 0,
  textureUploadCount: 0,
  fallbackCount: 0,
  culledCount: 0,
  materialCounts: {},
  lastFrameMs: 0,
  lastError: ""
};

PS.render.surfaceTileWebgl.shaderName = "terrain-tile";

PS.render.surfaceTileWebgl.ensureCanvas = function (width, height) {
  var target = PS.render.webglEngine && PS.render.webglEngine.ensureTarget
    ? PS.render.webglEngine.ensureTarget("surface-tiles", width, height, { alpha: true })
    : null;

  if (!target) {
    return false;
  }

  PS.render.surfaceTileWebgl.state.target = target;
  PS.render.surfaceTileWebgl.state.canvas = target.canvas;
  PS.render.surfaceTileWebgl.state.gl = target.gl;
  return true;
};

PS.render.surfaceTileWebgl.ensureAtlas = function () {
  if (PS.atlas && !PS.atlas.initialized && typeof PS.atlas.init === "function") {
    PS.atlas.init();
  }

  return Boolean(PS.atlas && PS.atlas.pages && PS.atlas.pages.length > 0);
};

PS.render.surfaceTileWebgl.initialize = function (width, height) {
  var state = PS.render.surfaceTileWebgl.state;

  if (
    CONFIG.PLANET_SURFACE_TILE_WEBGL_ATLAS === false ||
    !PS.render.surfaceTileWebgl.ensureCanvas(width, height) ||
    !PS.render.surfaceTileWebgl.ensureAtlas()
  ) {
    return false;
  }

  if (!state.gl) {
    return false;
  }

  if (!state.program) {
    var gl = state.gl;
    var stride = PS.render.surfaceTileWebgl.strideFloats * Float32Array.BYTES_PER_ELEMENT;

    state.program = PS.render.shaderManager.getProgram(gl, PS.render.surfaceTileWebgl.shaderName);
    state.quadBuffer = PS.render.webglEngine.ensureBuffer(state.target, "surface-tile-quad");
    state.instanceBuffer = PS.render.webglEngine.ensureBuffer(state.target, "surface-tile-instances");
    state.locations = {
      corner: gl.getAttribLocation(state.program, "a_corner"),
      rect: gl.getAttribLocation(state.program, "a_rect"),
      uvRect: gl.getAttribLocation(state.program, "a_uvRect"),
      alpha: gl.getAttribLocation(state.program, "a_alpha"),
      flipH: gl.getAttribLocation(state.program, "a_flipH"),
      canvasSize: gl.getUniformLocation(state.program, "u_canvasSize"),
      atlas: gl.getUniformLocation(state.program, "u_atlas"),
      stride: stride
    };

    PS.render.webglEngine.updateBuffer(state.target, "surface-tile-quad", new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      1, 1
    ]), gl.STATIC_DRAW);
  }

  var needed = Math.max(1, Math.floor(Number(CONFIG.PLANET_SURFACE_TILE_WEBGL_MAX_INSTANCES) || 4096));

  if (!state.instanceData || state.instanceData.length < needed * PS.render.surfaceTileWebgl.strideFloats) {
    state.instanceData = new Float32Array(needed * PS.render.surfaceTileWebgl.strideFloats);
  }

  return true;
};

PS.render.surfaceTileWebgl.getTexture = function (pageIndex) {
  var state = PS.render.surfaceTileWebgl.state;
  var gl = state.gl;
  var page = PS.atlas.pages[pageIndex];

  if (!page || !page.data || !PS.render.webglEngine || !PS.render.webglEngine.getRgbaTexture) {
    return null;
  }

  var texture = PS.render.webglEngine.getRgbaTexture(
    "surface-tile-atlas",
    gl,
    pageIndex + ":" + (page.version || 0),
    page.width,
    page.height,
    page.data,
    8
  );
  state.textures = texture.cache.textures;
  state.textureOrder = texture.cache.order;

  if (texture.uploaded) {
    state.textureUploadCount++;
  }

  return texture.texture;
};

PS.render.surfaceTileWebgl.makeBatches = function (address, cellCache, alpha) {
  var batches = { pages: {}, count: 0, culled: 0, materialCounts: {} };

  return PS.render.surfaceTileWebgl.appendBatches(batches, address, cellCache, alpha);
};

PS.render.surfaceTileWebgl.appendBatches = function (batches, address, cellCache, alpha) {
  var target = batches || { pages: {}, count: 0, culled: 0, materialCounts: {} };
  var baseWorldX = address.sampleEast || 0;
  var baseWorldY = address.sampleNorth || 0;
  var screenOffsetX = Number(address.renderScreenX) || 0;
  var screenOffsetY = Number(address.renderScreenY) || 0;
  var samplePixelSize = Math.max(1, Number(address.renderSamplePixelSize) || CONFIG.TILE_SIZE);
  var tileAlpha = clamp(Number(alpha) || 1, 0, 1);

  for (var i = 0; i < cellCache.length; i++) {
    var cellData = cellCache[i];
    var rawSample = cellData && cellData.sample ? cellData.sample : null;
    var sample = PS.render.surface && typeof PS.render.surface.withEcology === "function"
      ? PS.render.surface.withEcology(rawSample)
      : rawSample;
    var biome = sample ? sample.biome : null;

    if (!biome) {
      target.culled++;
      continue;
    }

    var ax = i % address.chunkSamples;
    var ay = Math.floor(i / address.chunkSamples);
    var tileX = baseWorldX + ax;
    var tileY = baseWorldY + ay;
    var ecologyKey = sample && sample.ecology ? sample.ecology.key : "eco.0.0";
    var cell = cellData.terrainAtlasEcologyKey === ecologyKey ? cellData.terrainAtlasCell || null : null;

    if (!cell) {
      cell = PS.atlas.getTerrainCell(biome, tileX, tileY, sample);
      cellData.terrainAtlasCell = cell;
      cellData.terrainAtlasEcologyKey = ecologyKey;
    }

    if (!cell) {
      target.culled++;
      continue;
    }

    if (target.materialCounts) {
      target.materialCounts[cell.name] = (target.materialCounts[cell.name] || 0) + 1;
    }

    var flipH = PS.ranmap && PS.ranmap.data && PS.ranmap.flipH(tileX, tileY);
    var page = target.pages[cell.pageIndex];

    if (!page) {
      page = [];
      target.pages[cell.pageIndex] = page;
    }

    page.push(
      screenOffsetX + cellData.screenX * (samplePixelSize / CONFIG.TILE_SIZE),
      screenOffsetY + cellData.screenY * (samplePixelSize / CONFIG.TILE_SIZE),
      samplePixelSize,
      samplePixelSize,
      cell.u0,
      cell.v0,
      cell.u1,
      cell.v1,
      tileAlpha,
      flipH ? 1 : 0
    );
    target.count++;
  }

  return target;
};

PS.render.surfaceTileWebgl.configureAttributes = function () {
  var state = PS.render.surfaceTileWebgl.state;
  var gl = state.gl;
  var loc = state.locations;
  var floatSize = Float32Array.BYTES_PER_ELEMENT;

  gl.bindBuffer(gl.ARRAY_BUFFER, state.quadBuffer);
  gl.enableVertexAttribArray(loc.corner);
  gl.vertexAttribPointer(loc.corner, 2, gl.FLOAT, false, 2 * floatSize, 0);
  gl.vertexAttribDivisor(loc.corner, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, state.instanceBuffer);
  gl.enableVertexAttribArray(loc.rect);
  gl.vertexAttribPointer(loc.rect, 4, gl.FLOAT, false, loc.stride, 0);
  gl.vertexAttribDivisor(loc.rect, 1);
  gl.enableVertexAttribArray(loc.uvRect);
  gl.vertexAttribPointer(loc.uvRect, 4, gl.FLOAT, false, loc.stride, 4 * floatSize);
  gl.vertexAttribDivisor(loc.uvRect, 1);
  gl.enableVertexAttribArray(loc.alpha);
  gl.vertexAttribPointer(loc.alpha, 1, gl.FLOAT, false, loc.stride, 8 * floatSize);
  gl.vertexAttribDivisor(loc.alpha, 1);
  gl.enableVertexAttribArray(loc.flipH);
  gl.vertexAttribPointer(loc.flipH, 1, gl.FLOAT, false, loc.stride, 9 * floatSize);
  gl.vertexAttribDivisor(loc.flipH, 1);
};

PS.render.surfaceTileWebgl.drawBatches = function (batches, options) {
  var state = PS.render.surfaceTileWebgl.state;
  var gl = state.gl;
  var startedAt = performance.now();
  var drawnInstances = 0;
  var pageDraws = 0;
  var drawOptions = options || {};

  if (!drawOptions.skipBeginPass) {
    PS.render.webglEngine.beginTransparentPass(state.target);
  }
  gl.useProgram(state.program);
  gl.uniform2f(state.locations.canvasSize, state.target.width, state.target.height);
  gl.uniform1i(state.locations.atlas, 0);
  PS.render.surfaceTileWebgl.configureAttributes();

  Object.keys(batches.pages).forEach(function (pageIndex) {
    var pageData = batches.pages[pageIndex];
    var texture = PS.render.surfaceTileWebgl.getTexture(pageIndex);
    var strideFloats = PS.render.surfaceTileWebgl.strideFloats;
    var maxUploadFloats = Math.max(strideFloats, Math.floor(state.instanceData.length / strideFloats) * strideFloats);
    var pageOffset = 0;

    if (!texture || pageData.length < strideFloats) {
      return;
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    while (pageOffset < pageData.length) {
      var uploadFloats = Math.min(maxUploadFloats, pageData.length - pageOffset);
      uploadFloats = Math.floor(uploadFloats / strideFloats) * strideFloats;

      if (uploadFloats <= 0) {
        break;
      }

      var instanceCount = Math.floor(uploadFloats / strideFloats);

      for (var copyIndex = 0; copyIndex < uploadFloats; copyIndex++) {
        state.instanceData[copyIndex] = pageData[pageOffset + copyIndex];
      }

      PS.render.webglEngine.updateBuffer(
        state.target,
        "surface-tile-instances",
        state.instanceData.subarray(0, uploadFloats),
        gl.STREAM_DRAW
      );
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, instanceCount);
      drawnInstances += instanceCount;
      pageDraws++;
      pageOffset += uploadFloats;
    }
  });

  if (drawnInstances <= 0) {
    return false;
  }

  if (!drawOptions.skipPresent && PS.render.webglPresenter && typeof PS.render.webglPresenter.presentTarget === "function") {
    PS.render.webglPresenter.presentTarget(state.target);
  }
  state.drawCount++;
  state.tileDrawCount = drawnInstances;
  state.pageDrawCount = pageDraws;
  state.culledCount = batches.culled;
  state.materialCounts = Object.assign({}, batches.materialCounts || {});
  state.lastFrameMs = performance.now() - startedAt;
  state.lastError = "";
  return true;
};

PS.render.surfaceTileWebgl.drawTerrainAtlasBatch = function (chunks, alpha, options) {
  var state = PS.render.surfaceTileWebgl.state;
  var list = Array.isArray(chunks) ? chunks : [];

  try {
    if (
      list.length <= 0 ||
      !PS.render.surfaceTileWebgl.initialize(canvas.width, canvas.height)
    ) {
      state.fallbackCount++;
      return false;
    }

    var batches = { pages: {}, count: 0, culled: 0, materialCounts: {} };

    for (var i = 0; i < list.length; i++) {
      var item = list[i];

      if (!item || !item.address || !Array.isArray(item.cellCache)) {
        batches.culled++;
        continue;
      }

      PS.render.surfaceTileWebgl.appendBatches(
        batches,
        item.address,
        item.cellCache,
        item.alpha === undefined ? alpha : item.alpha
      );
    }

    if (batches.count <= 0) {
      state.fallbackCount++;
      return false;
    }

    return PS.render.surfaceTileWebgl.drawBatches(batches, options);
  } catch (error) {
    state.fallbackCount++;
    state.lastError = String(error && error.message ? error.message : error);
    return false;
  }
};

PS.render.surfaceTileWebgl.drawTerrainAtlas = function (address, cellCache, alpha, options) {
  var state = PS.render.surfaceTileWebgl.state;

  try {
    if (
      !Array.isArray(cellCache) ||
      !PS.render.surfaceTileWebgl.initialize(canvas.width, canvas.height)
    ) {
      state.fallbackCount++;
      return false;
    }

    var batches = PS.render.surfaceTileWebgl.makeBatches(address, cellCache, alpha);

    if (batches.count <= 0) {
      state.fallbackCount++;
      return false;
    }

    return PS.render.surfaceTileWebgl.drawBatches(batches, options);
  } catch (error) {
    state.fallbackCount++;
    state.lastError = String(error && error.message ? error.message : error);
    return false;
  }
};

PS.render.surfaceTileWebgl.rebuildShaders = function () {
  var state = PS.render.surfaceTileWebgl.state;
  state.program = null;
  state.quadBuffer = null;
  state.instanceBuffer = null;
  state.locations = null;
};

PS.render.surfaceTileWebgl.rebuildTextures = function () {
  var state = PS.render.surfaceTileWebgl.state;
  var cache = PS.render.webglEngine && PS.render.webglEngine.deleteTextureCache
    ? PS.render.webglEngine.deleteTextureCache("surface-tile-atlas", state.gl)
    : { textures: {}, order: [] };

  state.textures = cache.textures;
  state.textureOrder = cache.order;
};
