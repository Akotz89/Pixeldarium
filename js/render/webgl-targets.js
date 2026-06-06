PS.render = PS.render || {};
PS.render.webglEngine = PS.render.webglEngine || {};

PS.render.webglEngine.framebufferState = PS.render.webglEngine.framebufferState || {
  allocationCount: 0,
  resizeCount: 0,
  blitCount: 0,
  releaseCount: 0,
  residentBytes: 0,
  lastError: ""
};

PS.render.webglEngine.releaseFramebufferTarget = function (target) {
  var state = PS.render.webglEngine.framebufferState;
  var gl = target && target.gl ? target.gl : null;

  if (!target || !gl || !target.renderFramebuffer) {
    return false;
  }

  if (target.renderTexture) {
    gl.deleteTexture(target.renderTexture);
  }
  if (target.renderDepthBuffer) {
    gl.deleteRenderbuffer(target.renderDepthBuffer);
  }
  gl.deleteFramebuffer(target.renderFramebuffer);

  state.residentBytes = Math.max(0, state.residentBytes - (Number(target.renderFramebufferBytes) || 0));
  state.releaseCount++;
  target.renderFramebuffer = null;
  target.renderTexture = null;
  target.renderDepthBuffer = null;
  target.renderFramebufferWidth = 0;
  target.renderFramebufferHeight = 0;
  target.renderFramebufferBytes = 0;
  return true;
};

PS.render.webglEngine.ensureFramebufferTarget = function (target, options) {
  var state = PS.render.webglEngine.framebufferState;
  var gl = target && target.gl ? target.gl : null;
  var width = target ? Math.max(1, Math.round(Number(target.width) || 1)) : 1;
  var height = target ? Math.max(1, Math.round(Number(target.height) || 1)) : 1;
  var needsDepth = options && options.depth === true;
  var status = 0;

  if (!target || !gl) {
    return false;
  }

  if (
    target.renderFramebuffer &&
    target.renderFramebufferWidth === width &&
    target.renderFramebufferHeight === height &&
    target.renderFramebufferDepth === needsDepth
  ) {
    return true;
  }

  PS.render.webglEngine.releaseFramebufferTarget(target);
  target.renderTexture = gl.createTexture();
  target.renderFramebuffer = gl.createFramebuffer();
  target.renderFramebufferWidth = width;
  target.renderFramebufferHeight = height;
  target.renderFramebufferDepth = needsDepth;
  target.renderFramebufferBytes = width * height * 4;

  gl.bindTexture(gl.TEXTURE_2D, target.renderTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  gl.bindFramebuffer(gl.FRAMEBUFFER, target.renderFramebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.renderTexture, 0);

  if (needsDepth) {
    target.renderDepthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, target.renderDepthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, width, height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, target.renderDepthBuffer);
  }

  status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    state.lastError = "engine framebuffer target incomplete: " + status;
    PS.render.webglEngine.releaseFramebufferTarget(target);
    return false;
  }

  state.allocationCount++;
  state.resizeCount++;
  state.residentBytes += target.renderFramebufferBytes;
  state.lastError = "";
  return true;
};

PS.render.webglEngine.beginCanvasTransparentPass = PS.render.webglEngine.beginCanvasTransparentPass ||
  PS.render.webglEngine.beginTransparentPass;

PS.render.webglEngine.beginTransparentPass = function (target) {
  var gl = target && target.gl ? target.gl : null;

  if (!target || !gl || !PS.render.webglEngine.ensureFramebufferTarget(target, { depth: false })) {
    return PS.render.webglEngine.beginCanvasTransparentPass
      ? PS.render.webglEngine.beginCanvasTransparentPass(target)
      : false;
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, target.renderFramebuffer);
  gl.viewport(0, 0, target.width, target.height);
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  PS.render.webglEngine.state.passCount++;
  return true;
};

PS.render.webglEngine.getFramebufferStats = function () {
  var state = PS.render.webglEngine.framebufferState;
  var targets = PS.render.webglEngine.state.targets;
  var targetCount = 0;
  var textureCount = 0;

  Object.keys(targets).forEach(function (key) {
    if (targets[key] && targets[key].renderFramebuffer) {
      targetCount++;
    }
    if (targets[key] && targets[key].renderTexture) {
      textureCount++;
    }
  });

  return {
    targetCount: targetCount,
    textureCount: textureCount,
    allocationCount: state.allocationCount,
    resizeCount: state.resizeCount,
    blitCount: state.blitCount,
    releaseCount: state.releaseCount,
    residentBytes: state.residentBytes,
    lastError: state.lastError
  };
};

PS.render.webglEngine.getBaseStats = PS.render.webglEngine.getBaseStats ||
  PS.render.webglEngine.getStats;

PS.render.webglEngine.getStats = function () {
  var stats = PS.render.webglEngine.getBaseStats ? PS.render.webglEngine.getBaseStats() : {};
  var framebuffer = PS.render.webglEngine.getFramebufferStats();

  stats.framebufferTargetCount = framebuffer.targetCount;
  stats.framebufferTextureCount = framebuffer.textureCount;
  stats.framebufferAllocationCount = framebuffer.allocationCount;
  stats.framebufferResizeCount = framebuffer.resizeCount;
  stats.framebufferBlitCount = framebuffer.blitCount;
  stats.framebufferReleaseCount = framebuffer.releaseCount;
  stats.framebufferResidentBytes = framebuffer.residentBytes;
  stats.framebufferLastError = framebuffer.lastError;
  return stats;
};

PS.render.webglEngine.rebuildFramebufferTargets = function () {
  Object.keys(PS.render.webglEngine.state.targets).forEach(function (targetId) {
    PS.render.webglEngine.releaseFramebufferTarget(PS.render.webglEngine.state.targets[targetId]);
  });
};

PS.render.webglEngine.rebuildBaseTextures = PS.render.webglEngine.rebuildBaseTextures ||
  PS.render.webglEngine.rebuildTextures;

PS.render.webglEngine.rebuildTextures = function () {
  PS.render.webglEngine.rebuildFramebufferTargets();

  if (PS.render.webglEngine.rebuildBaseTextures) {
    PS.render.webglEngine.rebuildBaseTextures();
  }
};
