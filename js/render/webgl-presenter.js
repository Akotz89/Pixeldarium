PS.render = PS.render || {};
PS.render.webglPresenter = PS.render.webglPresenter || {};

PS.render.webglPresenter.state = {
  canvas: null,
  active: true,
  width: 0,
  height: 0,
  frameOpen: false,
  clearPending: true,
  frameCount: 0,
  presentCount: 0,
  directPresentCount: 0,
  fallbackCount: 0,
  lastFramePresents: 0,
  singleVisibleCanvas: false,
  lastError: ""
};

PS.render.webglPresenter.getCanvas = function () {
  var state = PS.render.webglPresenter.state;

  if (typeof document === "undefined") {
    return null;
  }

  if (!state.canvas) {
    state.canvas = document.getElementById("game-webgl");
  }

  return state.canvas;
};

PS.render.webglPresenter.syncSize = function (width, height) {
  var state = PS.render.webglPresenter.state;
  var presenterCanvas = PS.render.webglPresenter.getCanvas();
  var sourceCanvas = typeof canvas !== "undefined" ? canvas : presenterCanvas;
  var nextWidth = Math.max(1, Math.round(Number(width) || (sourceCanvas ? sourceCanvas.width : 1) || 1));
  var nextHeight = Math.max(1, Math.round(Number(height) || (sourceCanvas ? sourceCanvas.height : 1) || 1));

  if (!presenterCanvas) {
    return null;
  }

  if (presenterCanvas.width !== nextWidth) {
    presenterCanvas.width = nextWidth;
  }
  if (presenterCanvas.height !== nextHeight) {
    presenterCanvas.height = nextHeight;
  }

  state.width = nextWidth;
  state.height = nextHeight;
  return presenterCanvas;
};

PS.render.webglPresenter.beginFrame = function (width, height) {
  var state = PS.render.webglPresenter.state;
  var wrap = typeof document !== "undefined" ? document.getElementById("game-wrap") : null;

  if (!state.active || !PS.render.webglPresenter.syncSize(width, height)) {
    state.fallbackCount++;
    return false;
  }

  state.frameOpen = true;
  state.clearPending = true;
  state.lastFramePresents = 0;
  state.singleVisibleCanvas = true;
  if (wrap && wrap.classList) {
    wrap.classList.add("webgl-presenter-active");
  }
  state.frameCount++;
  return true;
};

PS.render.webglPresenter.clearIfNeeded = function (gl) {
  var state = PS.render.webglPresenter.state;

  if (!state.clearPending || !gl) {
    return false;
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, state.width || gl.canvas.width, state.height || gl.canvas.height);
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  state.clearPending = false;
  return true;
};

PS.render.webglPresenter.presentTarget = function (target) {
  var state = PS.render.webglPresenter.state;

  if (
    !state.active ||
    !target ||
    !target.gl ||
    !target.renderTexture ||
    !PS.render.webglCompositor ||
    typeof PS.render.webglCompositor.drawTargetToPresenter !== "function"
  ) {
    state.fallbackCount++;
    return false;
  }

  try {
    if (!state.frameOpen) {
      PS.render.webglPresenter.beginFrame(target.width, target.height);
    }

    if (!PS.render.webglPresenter.clearIfNeeded(target.gl)) {
      target.gl.bindFramebuffer(target.gl.FRAMEBUFFER, null);
      target.gl.viewport(0, 0, target.width, target.height);
    }
    if (!PS.render.webglCompositor.drawTargetToPresenter(target)) {
      state.fallbackCount++;
      return false;
    }

    state.presentCount++;
    state.directPresentCount++;
    state.lastFramePresents++;
    state.lastError = "";
    return true;
  } catch (error) {
    state.fallbackCount++;
    state.lastError = String(error && error.message ? error.message : error);
    return false;
  }
};

PS.render.webglPresenter.endFrame = function () {
  PS.render.webglPresenter.state.frameOpen = false;
  return true;
};

PS.render.webglPresenter.getStats = function () {
  var state = PS.render.webglPresenter.state;

  return {
    active: !!state.active,
    hasCanvas: !!PS.render.webglPresenter.getCanvas(),
    width: state.width,
    height: state.height,
    frameCount: state.frameCount,
    presentCount: state.presentCount,
    directPresentCount: state.directPresentCount,
    lastFramePresents: state.lastFramePresents,
    singleVisibleCanvas: !!state.singleVisibleCanvas,
    fallbackCount: state.fallbackCount,
    lastError: state.lastError
  };
};
