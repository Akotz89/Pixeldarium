PS.render = PS.render || {};
PS.render.webglEngine = PS.render.webglEngine || {};

PS.render.webglEngine.state = {
  targets: {},
  textureCaches: {},
  sharedCanvas: null,
  sharedGl: null,
  contextCount: 0,
  bufferCount: 0,
  bufferUploadCount: 0,
  passCount: 0,
  textureUploadCount: 0,
  textureAllocationCount: 0,
  textureSubUpdateCount: 0,
  textureSubUpdateBytes: 0,
  textureCacheHitCount: 0,
  textureReleaseCount: 0,
  textureEvictionCount: 0,
  lastError: ""
};

PS.render.webglEngine.ensureTarget = function (id, width, height, options) {
  var key = String(id || "default");
  var state = PS.render.webglEngine.state;
  var target = state.targets[key];

  if (typeof document === "undefined") {
    return null;
  }

  if (!target) {
    target = {
      id: key,
      canvas: null,
      gl: null,
      buffers: {},
      width: 0,
      height: 0
    };
    state.targets[key] = target;
  }

  target.width = Math.max(1, Math.round(Number(width) || 1));
  target.height = Math.max(1, Math.round(Number(height) || 1));

  if (!state.sharedCanvas) {
    state.sharedCanvas = PS.render.webglPresenter && typeof PS.render.webglPresenter.getCanvas === "function"
      ? PS.render.webglPresenter.getCanvas()
      : null;
  }

  if (!state.sharedCanvas) {
    state.sharedCanvas = document.createElement("canvas");
  }

  if (!state.sharedGl) {
    state.sharedGl = state.sharedCanvas.getContext("webgl2", {
      alpha: options && options.alpha === false ? false : true,
      antialias: false,
      depth: options && options.depth === true,
      preserveDrawingBuffer: PS.render.webglPresenter &&
        typeof PS.render.webglPresenter.getCanvas === "function" &&
        PS.render.webglPresenter.getCanvas() === state.sharedCanvas
    });

    if (state.sharedGl) {
      state.contextCount++;
    }
  }

  target.canvas = state.sharedCanvas;
  target.gl = state.sharedGl;
  if (
    PS.render.webglPresenter &&
    typeof PS.render.webglPresenter.getCanvas === "function" &&
    PS.render.webglPresenter.getCanvas() === target.canvas &&
    typeof PS.render.webglPresenter.syncSize === "function"
  ) {
    PS.render.webglPresenter.syncSize();
  } else {
    target.canvas.width = target.width;
    target.canvas.height = target.height;
  }
  return target.gl ? target : null;
};

PS.render.webglEngine.ensureBuffer = function (target, id, initialData, usage) {
  var key = String(id || "buffer");

  if (!target || !target.gl) {
    return null;
  }

  if (!target.buffers[key]) {
    target.buffers[key] = {
      id: key,
      buffer: target.gl.createBuffer(),
      byteLength: 0,
      uploadCount: 0
    };
    PS.render.webglEngine.state.bufferCount++;

    if (initialData) {
      PS.render.webglEngine.updateBuffer(target, key, initialData, usage);
    }
  }

  return target.buffers[key].buffer;
};

PS.render.webglEngine.updateBuffer = function (target, id, data, usage) {
  var key = String(id || "buffer");
  var record = target && target.buffers ? target.buffers[key] : null;

  if (!target || !target.gl || !record || !data) {
    return null;
  }

  target.gl.bindBuffer(target.gl.ARRAY_BUFFER, record.buffer);
  target.gl.bufferData(target.gl.ARRAY_BUFFER, data, usage || target.gl.STREAM_DRAW);
  record.byteLength = Number(data.byteLength) || 0;
  record.uploadCount++;
  PS.render.webglEngine.state.bufferUploadCount++;
  return record.buffer;
};

PS.render.webglEngine.beginTransparentPass = function (target) {
  if (!target || !target.gl) {
    return false;
  }

  var gl = target.gl;
  gl.viewport(0, 0, target.width, target.height);
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  PS.render.webglEngine.state.passCount++;
  return true;
};

PS.render.webglEngine.getTextureCache = function (id) {
  var key = String(id || "default");
  var caches = PS.render.webglEngine.state.textureCaches;

  if (!caches[key]) {
    caches[key] = {
      textures: {},
      order: [],
      residentBytes: 0,
      uploadCount: 0,
      allocationCount: 0,
      subUpdateCount: 0,
      subUpdateBytes: 0,
      hitCount: 0,
      releaseCount: 0,
      evictionCount: 0
    };
  }

  return caches[key];
};

PS.render.webglEngine.getCanvasTexture = function (cacheId, gl, key, sourceCanvas, limit) {
  var cache = PS.render.webglEngine.getTextureCache(cacheId);
  var textureKey = String(key || "");
  var cached = cache.textures[textureKey];

  if (!gl || !sourceCanvas) {
    return { texture: null, uploaded: false, hit: false, cache: cache };
  }

  if (cached && cached.source === sourceCanvas && cached.width === sourceCanvas.width && cached.height === sourceCanvas.height) {
    cache.hitCount++;
    PS.render.webglEngine.state.textureCacheHitCount++;
    return { texture: cached.texture, uploaded: false, hit: true, cache: cache };
  }

  if (!cached) {
    cached = {
      texture: gl.createTexture(),
      source: null,
      width: 0,
      height: 0,
      byteLength: 0
    };
    cache.textures[textureKey] = cached;
    cache.order.push(textureKey);
  }

  cache.residentBytes -= Number(cached.byteLength) || 0;
  gl.bindTexture(gl.TEXTURE_2D, cached.texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);

  cached.source = sourceCanvas;
  cached.width = sourceCanvas.width;
  cached.height = sourceCanvas.height;
  cached.byteLength = Math.max(0, cached.width * cached.height * 4);
  cache.residentBytes += cached.byteLength;
  cache.uploadCount++;
  PS.render.webglEngine.state.textureUploadCount++;

  while (cache.order.length > Math.max(1, Number(limit) || 1)) {
    var evictedKey = cache.order.shift();
    PS.render.webglEngine.releaseCanvasTexture(cacheId, gl, evictedKey, true);
  }

  return { texture: cached.texture, uploaded: true, hit: false, cache: cache };
};

PS.render.webglEngine.getRgbaTexture = function (cacheId, gl, key, width, height, buffer, limit) {
  var cache = PS.render.webglEngine.getTextureCache(cacheId);
  var textureKey = String(key || "");
  var cached = cache.textures[textureKey];
  var textureWidth = Math.max(1, Math.round(Number(width) || 1));
  var textureHeight = Math.max(1, Math.round(Number(height) || 1));
  var byteLength = textureWidth * textureHeight * 4;
  var data = buffer instanceof Uint8ClampedArray || buffer instanceof Uint8Array
    ? buffer
    : new Uint8ClampedArray(buffer || byteLength);

  if (!gl || !data) {
    return { texture: null, uploaded: false, hit: false, cache: cache };
  }

  if (cached && cached.source === buffer && cached.width === textureWidth && cached.height === textureHeight) {
    cache.hitCount++;
    PS.render.webglEngine.state.textureCacheHitCount++;
    return { texture: cached.texture, uploaded: false, hit: true, cache: cache };
  }

  if (!cached) {
    cached = {
      texture: gl.createTexture(),
      source: null,
      width: 0,
      height: 0,
      byteLength: 0
    };
    cache.textures[textureKey] = cached;
    cache.order.push(textureKey);
  }

  cache.residentBytes -= Number(cached.byteLength) || 0;
  gl.bindTexture(gl.TEXTURE_2D, cached.texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureWidth, textureHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);

  cached.source = buffer;
  cached.width = textureWidth;
  cached.height = textureHeight;
  cached.byteLength = byteLength;
  cache.residentBytes += cached.byteLength;
  cache.uploadCount++;
  PS.render.webglEngine.state.textureUploadCount++;

  while (cache.order.length > Math.max(1, Number(limit) || 1)) {
    var evictedKey = cache.order.shift();
    PS.render.webglEngine.releaseCanvasTexture(cacheId, gl, evictedKey, true);
  }

  return { texture: cached.texture, uploaded: true, hit: false, cache: cache };
};

PS.render.webglEngine.getMutableRgbaTexture = function (cacheId, gl, key, width, height, buffer, limit) {
  var cache = PS.render.webglEngine.getTextureCache(cacheId);
  var textureKey = String(key || "");
  var cached = cache.textures[textureKey];
  var textureWidth = Math.max(1, Math.round(Number(width) || 1));
  var textureHeight = Math.max(1, Math.round(Number(height) || 1));
  var byteLength = textureWidth * textureHeight * 4;
  var data = buffer instanceof Uint8ClampedArray || buffer instanceof Uint8Array
    ? buffer
    : new Uint8ClampedArray(buffer || byteLength);
  var allocated = false;

  if (!gl || !data) {
    return { texture: null, allocated: false, updated: false, uploaded: false, hit: false, cache: cache };
  }

  if (cached && cached.source === buffer && cached.width === textureWidth && cached.height === textureHeight) {
    cache.hitCount++;
    PS.render.webglEngine.state.textureCacheHitCount++;
    return { texture: cached.texture, allocated: false, updated: false, uploaded: false, hit: true, cache: cache };
  }

  if (cached && (cached.width !== textureWidth || cached.height !== textureHeight || cached.mutable !== true)) {
    PS.render.webglEngine.releaseCanvasTexture(cacheId, gl, textureKey, false);
    cached = null;
  }

  if (!cached) {
    cached = {
      texture: gl.createTexture(),
      source: null,
      width: textureWidth,
      height: textureHeight,
      byteLength: byteLength,
      mutable: true
    };
    cache.textures[textureKey] = cached;
    cache.order.push(textureKey);
    cache.residentBytes += cached.byteLength;
    cache.allocationCount++;
    PS.render.webglEngine.state.textureAllocationCount++;
    allocated = true;

    gl.bindTexture(gl.TEXTURE_2D, cached.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    if (typeof gl.texStorage2D === "function" && gl.RGBA8) {
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, textureWidth, textureHeight);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureWidth, textureHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
  } else {
    gl.bindTexture(gl.TEXTURE_2D, cached.texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  }

  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RGBA, gl.UNSIGNED_BYTE, data);

  cached.source = buffer;
  cached.width = textureWidth;
  cached.height = textureHeight;
  cached.byteLength = byteLength;
  cache.uploadCount++;
  cache.subUpdateCount++;
  cache.subUpdateBytes += byteLength;
  PS.render.webglEngine.state.textureUploadCount++;
  PS.render.webglEngine.state.textureSubUpdateCount++;
  PS.render.webglEngine.state.textureSubUpdateBytes += byteLength;

  while (cache.order.length > Math.max(1, Number(limit) || 1)) {
    var evictedKey = cache.order.shift();
    PS.render.webglEngine.releaseCanvasTexture(cacheId, gl, evictedKey, true);
  }

  return { texture: cached.texture, allocated: allocated, updated: true, uploaded: true, hit: false, cache: cache };
};

PS.render.webglEngine.releaseCanvasTexture = function (cacheId, gl, key, isEviction) {
  var cache = PS.render.webglEngine.getTextureCache(cacheId);
  var textureKey = String(key || "");
  var cached = cache.textures[textureKey];

  if (!cached) {
    return false;
  }

  if (gl && cached.texture) {
    gl.deleteTexture(cached.texture);
  }

  cache.residentBytes = Math.max(0, cache.residentBytes - (Number(cached.byteLength) || 0));
  cache.releaseCount++;
  PS.render.webglEngine.state.textureReleaseCount++;

  if (isEviction) {
    cache.evictionCount++;
    PS.render.webglEngine.state.textureEvictionCount++;
  }

  delete cache.textures[textureKey];

  var index = cache.order.indexOf(textureKey);
  if (index >= 0) {
    cache.order.splice(index, 1);
  }

  return true;
};

PS.render.webglEngine.deleteTextureCache = function (id, gl) {
  var cache = PS.render.webglEngine.getTextureCache(id);
  var context = gl || null;

  Object.keys(cache.textures).forEach(function (key) {
    PS.render.webglEngine.releaseCanvasTexture(id, context, key, false);
  });

  cache.textures = {};
  cache.order = [];
  cache.residentBytes = 0;
  return cache;
};

PS.render.webglEngine.getTextureStats = function () {
  var stats = {
    residentCount: 0,
    residentBytes: 0,
    uploadCount: PS.render.webglEngine.state.textureUploadCount,
    allocationCount: PS.render.webglEngine.state.textureAllocationCount,
    subUpdateCount: PS.render.webglEngine.state.textureSubUpdateCount,
    subUpdateBytes: PS.render.webglEngine.state.textureSubUpdateBytes,
    hitCount: PS.render.webglEngine.state.textureCacheHitCount,
    releaseCount: PS.render.webglEngine.state.textureReleaseCount,
    evictionCount: PS.render.webglEngine.state.textureEvictionCount,
    caches: {}
  };

  Object.keys(PS.render.webglEngine.state.textureCaches).forEach(function (cacheId) {
    var cache = PS.render.webglEngine.state.textureCaches[cacheId];
    var count = Object.keys(cache.textures).length;

    stats.caches[cacheId] = {
      residentCount: count,
      residentBytes: Number(cache.residentBytes) || 0,
      uploadCount: cache.uploadCount,
      allocationCount: cache.allocationCount,
      subUpdateCount: cache.subUpdateCount,
      subUpdateBytes: cache.subUpdateBytes,
      hitCount: cache.hitCount,
      releaseCount: cache.releaseCount,
      evictionCount: cache.evictionCount
    };
    stats.residentCount += count;
    stats.residentBytes += Number(cache.residentBytes) || 0;
  });

  return stats;
};

PS.render.webglEngine.getStats = function () {
  return {
    targetCount: Object.keys(PS.render.webglEngine.state.targets).length,
    textureCacheCount: Object.keys(PS.render.webglEngine.state.textureCaches).length,
    contextCount: PS.render.webglEngine.state.contextCount,
    bufferCount: PS.render.webglEngine.state.bufferCount,
    bufferUploadCount: PS.render.webglEngine.state.bufferUploadCount,
    passCount: PS.render.webglEngine.state.passCount,
    textureUploadCount: PS.render.webglEngine.state.textureUploadCount,
    textureAllocationCount: PS.render.webglEngine.state.textureAllocationCount,
    textureSubUpdateCount: PS.render.webglEngine.state.textureSubUpdateCount,
    textureSubUpdateBytes: PS.render.webglEngine.state.textureSubUpdateBytes,
    textureCacheHitCount: PS.render.webglEngine.state.textureCacheHitCount,
    textureResidentCount: PS.render.webglEngine.getTextureStats().residentCount,
    textureResidentBytes: PS.render.webglEngine.getTextureStats().residentBytes,
    textureReleaseCount: PS.render.webglEngine.state.textureReleaseCount,
    textureEvictionCount: PS.render.webglEngine.state.textureEvictionCount,
    lastError: PS.render.webglEngine.state.lastError
  };
};

PS.render.webglEngine.rebuildShaders = function () {};

PS.render.webglEngine.rebuildBuffers = function () {
  Object.keys(PS.render.webglEngine.state.targets).forEach(function (targetId) {
    var target = PS.render.webglEngine.state.targets[targetId];
    var gl = target && target.gl;

    if (!target || !target.buffers) {
      return;
    }

    Object.keys(target.buffers).forEach(function (key) {
      if (gl && target.buffers[key] && target.buffers[key].buffer) {
        gl.deleteBuffer(target.buffers[key].buffer);
      }
    });

    target.buffers = {};
  });

  PS.render.webglEngine.state.bufferCount = 0;
};

PS.render.webglEngine.rebuildTextures = function () {
  Object.keys(PS.render.webglEngine.state.targets).forEach(function (targetId) {
    var target = PS.render.webglEngine.state.targets[targetId];
    Object.keys(PS.render.webglEngine.state.textureCaches).forEach(function (cacheId) {
      PS.render.webglEngine.deleteTextureCache(cacheId, target && target.gl);
    });
  });
};
