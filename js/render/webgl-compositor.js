PS.render = PS.render || {};
PS.render.webglCompositor = PS.render.webglCompositor || {};

PS.render.webglCompositor.state = {
  program: null,
  quadBuffer: null,
  targetIds: {},
  compositeCount: 0,
  sampledTextureCount: 0,
  fallbackCount: 0,
  lastError: ""
};

PS.render.webglCompositor.shaderName = "gbuffer-compose";

PS.render.webglCompositor.ensureProgram = function (target) {
  var state = PS.render.webglCompositor.state;
  var gl = target && target.gl ? target.gl : null;

  if (!gl || !PS.gl || !PS.gl.createProgram || !PS.render.webglEngine || !PS.render.webglEngine.ensureBuffer) {
    return false;
  }

  if (!state.program) {
    state.program = PS.render.shaderManager.getProgram(gl, PS.render.webglCompositor.shaderName);
    state.quadBuffer = PS.render.webglEngine.ensureBuffer(target, "final-compositor-quad");
    PS.render.webglEngine.updateBuffer(target, "final-compositor-quad", new Float32Array([
      -1, -1, 0, 0,
      1, -1, 1, 0,
      -1, 1, 0, 1,
      1, 1, 1, 1
    ]), gl.STATIC_DRAW);
  }

  return !!state.program && !!state.quadBuffer;
};

PS.render.webglCompositor.drawTargetToPresenter = function (target) {
  var state = PS.render.webglCompositor.state;
  var gl = target && target.gl ? target.gl : null;
  var stride = 4 * Float32Array.BYTES_PER_ELEMENT;
  var outputWidth = gl && gl.canvas ? gl.canvas.width : target.width;
  var outputHeight = gl && gl.canvas ? gl.canvas.height : target.height;
  var positionLocation = 0;
  var uvLocation = 0;

  try {
    if (!target || !target.canvas || !gl || !target.renderTexture || !PS.render.webglCompositor.ensureProgram(target)) {
      state.fallbackCount++;
      return false;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, outputWidth, outputHeight);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(state.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, state.quadBuffer);

    positionLocation = gl.getAttribLocation(state.program, "a_position");
    uvLocation = gl.getAttribLocation(state.program, "a_uv");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(positionLocation, 0);
    gl.enableVertexAttribArray(uvLocation);
    gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
    gl.vertexAttribDivisor(uvLocation, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, target.renderTexture);
    gl.uniform1i(gl.getUniformLocation(state.program, "u_source"), 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    state.targetIds[target.id || "target"] = true;
    state.compositeCount++;
    state.sampledTextureCount++;
    state.lastError = "";
    return true;
  } catch (error) {
    state.fallbackCount++;
    state.lastError = String(error && error.message ? error.message : error);
    return false;
  }
};

PS.render.webglCompositor.drawTextureToPresenter = function (target, texture, sampleId) {
  var state = PS.render.webglCompositor.state;
  var gl = target && target.gl ? target.gl : null;
  var stride = 4 * Float32Array.BYTES_PER_ELEMENT;
  var positionLocation = 0;
  var uvLocation = 0;

  try {
    if (!target || !target.canvas || !gl || !texture || !PS.render.webglCompositor.ensureProgram(target)) {
      state.fallbackCount++;
      return false;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, target.width, target.height);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(state.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, state.quadBuffer);

    positionLocation = gl.getAttribLocation(state.program, "a_position");
    uvLocation = gl.getAttribLocation(state.program, "a_uv");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(positionLocation, 0);
    gl.enableVertexAttribArray(uvLocation);
    gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
    gl.vertexAttribDivisor(uvLocation, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(state.program, "u_source"), 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    state.targetIds[sampleId || "presenter-texture"] = true;
    state.compositeCount++;
    state.sampledTextureCount++;
    state.lastError = "";
    return true;
  } catch (error) {
    state.fallbackCount++;
    state.lastError = String(error && error.message ? error.message : error);
    return false;
  }
};

PS.render.webglCompositor.getStats = function () {
  var state = PS.render.webglCompositor.state;

  return {
    targetCount: Object.keys(state.targetIds).length,
    compositeCount: state.compositeCount,
    sampledTextureCount: state.sampledTextureCount,
    fallbackCount: state.fallbackCount,
    lastError: state.lastError
  };
};

PS.render.webglCompositor.rebuildShaders = function () {
  PS.render.webglCompositor.state.program = null;
  PS.render.webglCompositor.state.quadBuffer = null;
};

PS.render.webglCompositor.getEngineStats = PS.render.webglEngine && PS.render.webglEngine.getStats;

if (PS.render.webglEngine && PS.render.webglEngine.getStats) {
  PS.render.webglEngine.getStats = function () {
    var stats = PS.render.webglCompositor.getEngineStats ? PS.render.webglCompositor.getEngineStats() : {};
    var compositor = PS.render.webglCompositor.getStats();

    stats.finalCompositeTargetCount = compositor.targetCount;
    stats.finalCompositeCount = compositor.compositeCount;
    stats.finalCompositeSampledTextureCount = compositor.sampledTextureCount;
    stats.finalCompositeFallbackCount = compositor.fallbackCount;
    stats.finalCompositeLastError = compositor.lastError;
    return stats;
  };
}
