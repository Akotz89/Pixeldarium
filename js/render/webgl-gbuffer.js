PS.render = PS.render || {};
PS.render.webglGbuffer = PS.render.webglGbuffer || {};

PS.render.webglGbuffer.state = {
  target: null,
  framebuffer: null,
  albedoTexture: null,
  normalHeightTexture: null,
  depthStencilBuffer: null,
  terrainProgram: null,
  terrainBuffer: null,
  width: 0,
  height: 0,
  initCount: 0,
  frameCount: 0,
  fallbackCount: 0,
  terrainWriteCount: 0,
  structureWriteCount: 0,
  entityWriteCount: 0,
  materialWriteCount: 0,
  materialTextureUpdateCount: 0,
  complete: false,
  lastError: "",
  downstream: [
    "tilemap shader",
    "water displacement",
    "shadow direction and stencil masking",
    "deferred lighting and atmosphere"
  ]
};

PS.render.webglGbuffer.getRequiredAttachments = function () {
  return {
    albedo: "RGBA8 diffuse/albedo",
    normalHeight: "RGBA8 normal+height",
    depthStencil: "DEPTH24_STENCIL8"
  };
};

PS.render.webglGbuffer.release = function () {
  var state = PS.render.webglGbuffer.state;
  var gl = state.target && state.target.gl ? state.target.gl : null;

  if (gl && state.albedoTexture) {
    gl.deleteTexture(state.albedoTexture);
  }
  if (gl && state.normalHeightTexture) {
    gl.deleteTexture(state.normalHeightTexture);
  }
  if (gl && state.depthStencilBuffer) {
    gl.deleteRenderbuffer(state.depthStencilBuffer);
  }
  if (gl && state.framebuffer) {
    gl.deleteFramebuffer(state.framebuffer);
  }

  state.framebuffer = null;
  state.albedoTexture = null;
  state.normalHeightTexture = null;
  state.depthStencilBuffer = null;
  state.complete = false;
};

PS.render.webglGbuffer.terrainShaderName = "gbuffer-terrain";

PS.render.webglGbuffer.makeAttachmentTexture = function (gl, width, height) {
  var texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  return texture;
};

PS.render.webglGbuffer.initialize = function (width, height) {
  var state = PS.render.webglGbuffer.state;
  var targetWidth = Math.max(1, Math.round(Number(width) || 1));
  var targetHeight = Math.max(1, Math.round(Number(height) || 1));
  var target = null;
  var gl = null;
  var status = 0;

  if (CONFIG.PLANET_LOCAL_GBUFFER === false || !PS.render.webglEngine || !PS.render.webglEngine.ensureTarget) {
    state.fallbackCount++;
    state.lastError = "local g-buffer disabled or shared WebGL engine unavailable";
    return false;
  }

  target = PS.render.webglEngine.ensureTarget("local-gbuffer", targetWidth, targetHeight, { alpha: false, depth: true });

  if (!target || !target.gl) {
    state.fallbackCount++;
    state.lastError = "local g-buffer WebGL2 target unavailable";
    return false;
  }

  gl = target.gl;

  if (
    state.target !== target ||
    state.width !== targetWidth ||
    state.height !== targetHeight ||
    !state.framebuffer
  ) {
    PS.render.webglGbuffer.release();
    state.target = target;
    state.width = targetWidth;
    state.height = targetHeight;
    state.framebuffer = gl.createFramebuffer();
    state.albedoTexture = PS.render.webglGbuffer.makeAttachmentTexture(gl, targetWidth, targetHeight);
    state.normalHeightTexture = PS.render.webglGbuffer.makeAttachmentTexture(gl, targetWidth, targetHeight);
    state.depthStencilBuffer = gl.createRenderbuffer();

    gl.bindRenderbuffer(gl.RENDERBUFFER, state.depthStencilBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, targetWidth, targetHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, state.framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, state.albedoTexture, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, state.normalHeightTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, state.depthStencilBuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

    status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    state.complete = status === gl.FRAMEBUFFER_COMPLETE;
    state.initCount++;

    if (!state.complete) {
      state.fallbackCount++;
      state.lastError = "local g-buffer framebuffer incomplete: " + status;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return false;
    }
  }

  state.lastError = "";
  return true;
};

PS.render.webglGbuffer.beginLocalFrame = function (width, height) {
  var state = PS.render.webglGbuffer.state;
  var targetWidth = width || (typeof canvas !== "undefined" ? canvas.width : 1);
  var targetHeight = height || (typeof canvas !== "undefined" ? canvas.height : 1);
  var gl = null;

  if (!PS.render.webglGbuffer.initialize(targetWidth, targetHeight)) {
    return false;
  }

  gl = state.target.gl;
  gl.bindFramebuffer(gl.FRAMEBUFFER, state.framebuffer);
  gl.viewport(0, 0, state.width, state.height);
  gl.disable(gl.BLEND);
  gl.enable(gl.DEPTH_TEST);
  gl.clearBufferfv(gl.COLOR, 0, new Float32Array([0, 0, 0, 1]));
  gl.clearBufferfv(gl.COLOR, 1, new Float32Array([0.5, 0.5, 1, 0]));
  gl.clearBufferfi(gl.DEPTH_STENCIL, 0, 1, 0);
  state.frameCount++;

  if (PS.render.webglEngine && PS.render.webglEngine.state) {
    PS.render.webglEngine.state.passCount++;
  }

  return true;
};

PS.render.webglGbuffer.getQuadData = function (draw) {
  var state = PS.render.webglGbuffer.state;
  var x0 = ((Number(draw.x) || 0) / state.width) * 2 - 1;
  var y0 = 1 - ((Number(draw.y) || 0) / state.height) * 2;
  var x1 = (((Number(draw.x) || 0) + Math.max(1, Number(draw.width) || 1)) / state.width) * 2 - 1;
  var y1 = 1 - (((Number(draw.y) || 0) + Math.max(1, Number(draw.height) || 1)) / state.height) * 2;

  return new Float32Array([
    x0, y1, 0, 1,
    x1, y1, 1, 1,
    x0, y0, 0, 0,
    x1, y0, 1, 0
  ]);
};

PS.render.webglGbuffer.ensureTerrainProgram = function () {
  var state = PS.render.webglGbuffer.state;

  if (!state.target || !state.target.gl || !PS.gl || !PS.gl.createProgram) {
    return false;
  }

  if (!state.terrainProgram) {
    state.terrainProgram = PS.render.shaderManager.getProgram(state.target.gl, PS.render.webglGbuffer.terrainShaderName);
    state.terrainBuffer = PS.render.webglEngine.ensureBuffer(state.target, "gbuffer-terrain-quad");
  }

  return !!state.terrainProgram && !!state.terrainBuffer;
};

PS.render.webglGbuffer.writeTerrainMaterial = function (draw) {
  var state = PS.render.webglGbuffer.state;
  var material = draw && draw.baseMaterial ? draw.baseMaterial : null;
  var gl = state.target && state.target.gl ? state.target.gl : null;
  var texture = null;
  var stride = 4 * Float32Array.BYTES_PER_ELEMENT;
  var positionLocation = 0;
  var uvLocation = 0;

  if (!state.complete || !gl || !material || !material.buffer || !PS.render.webglEngine.getMutableRgbaTexture) {
    return false;
  }

  if (!PS.render.webglGbuffer.ensureTerrainProgram()) {
    return false;
  }

  texture = PS.render.webglEngine.getMutableRgbaTexture(
    "gbuffer-terrain-materials",
    gl,
    draw.key || draw.chunkKey,
    material.width || draw.width,
    material.height || draw.height,
    material.buffer,
    PS.render.surfaceRender && PS.render.surfaceRender.getChunkCacheLimit
      ? PS.render.surfaceRender.getChunkCacheLimit()
      : 256
  );

  if (!texture.texture) {
    return false;
  }

  if (texture.updated) {
    state.materialTextureUpdateCount++;
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, state.framebuffer);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
  gl.viewport(0, 0, state.width, state.height);
  gl.disable(gl.BLEND);
  gl.enable(gl.DEPTH_TEST);
  gl.useProgram(state.terrainProgram);
  gl.bindBuffer(gl.ARRAY_BUFFER, state.terrainBuffer);

  positionLocation = gl.getAttribLocation(state.terrainProgram, "a_position");
  uvLocation = gl.getAttribLocation(state.terrainProgram, "a_uv");
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(uvLocation);
  gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture.texture);
  gl.uniform1i(gl.getUniformLocation(state.terrainProgram, "u_material"), 0);
  PS.render.webglEngine.updateBuffer(state.target, "gbuffer-terrain-quad", PS.render.webglGbuffer.getQuadData(draw), gl.STREAM_DRAW);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  state.terrainWriteCount++;
  state.materialWriteCount++;
  return true;
};

PS.render.webglGbuffer.endLocalFrame = function () {
  var state = PS.render.webglGbuffer.state;

  if (!state.target || !state.target.gl) {
    return false;
  }

  state.target.gl.bindFramebuffer(state.target.gl.FRAMEBUFFER, null);
  return true;
};

PS.render.webglGbuffer.recordTerrainChunkWrite = function () {
  PS.render.webglGbuffer.state.terrainWriteCount++;
  return PS.render.webglGbuffer.state.complete;
};

PS.render.webglGbuffer.recordStructureBatchWrite = function () {
  PS.render.webglGbuffer.state.structureWriteCount++;
  return PS.render.webglGbuffer.state.complete;
};

PS.render.webglGbuffer.recordEntityBatchWrite = function () {
  PS.render.webglGbuffer.state.entityWriteCount++;
  return PS.render.webglGbuffer.state.complete;
};

PS.render.webglGbuffer.getStats = function () {
  var state = PS.render.webglGbuffer.state;

  return {
    initialized: !!state.framebuffer,
    complete: state.complete,
    width: state.width,
    height: state.height,
    attachmentCount: state.albedoTexture && state.normalHeightTexture && state.depthStencilBuffer ? 3 : 0,
    hasAlbedo: !!state.albedoTexture,
    hasNormalHeight: !!state.normalHeightTexture,
    hasDepthStencil: !!state.depthStencilBuffer,
    initCount: state.initCount,
    frameCount: state.frameCount,
    fallbackCount: state.fallbackCount,
    terrainWriteCount: state.terrainWriteCount,
    structureWriteCount: state.structureWriteCount,
    entityWriteCount: state.entityWriteCount,
    materialWriteCount: state.materialWriteCount,
    materialTextureUpdateCount: state.materialTextureUpdateCount,
    downstream: state.downstream.slice(0),
    lastError: state.lastError
  };
};

PS.render.webglGbuffer.rebuildShaders = function () {
  PS.render.webglGbuffer.state.terrainProgram = null;
  PS.render.webglGbuffer.state.terrainBuffer = null;
};

PS.render.webglGbuffer.rebuildTextures = function () {
  PS.render.webglGbuffer.release();
};
