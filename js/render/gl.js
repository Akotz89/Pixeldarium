PS.gl = PS.gl || {};

PS.gl.state = PS.gl.state || {
  canvas: null,
  context: null,
  isContextLost: false,
  contextLossCount: 0,
  contextRestoreCount: 0
};

PS.gl.init = function (targetCanvas) {
  var nextCanvas = targetCanvas || (typeof canvas !== "undefined" ? canvas : null);

  PS.assert(nextCanvas && typeof nextCanvas.getContext === "function", "PS.gl requires a canvas");

  if (PS.gl.state.canvas !== nextCanvas) {
    PS.gl.bindContextLossHandlers(nextCanvas);
  }

  PS.gl.state.canvas = nextCanvas;
  PS.gl.state.context = nextCanvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: true,
    preserveDrawingBuffer: false
  });

  return PS.gl.state.context;
};

PS.gl.getContext = function () {
  return PS.gl.state.context;
};

PS.gl.bindContextLossHandlers = function (targetCanvas) {
  targetCanvas.addEventListener("webglcontextlost", function (event) {
    event.preventDefault();
    PS.gl.state.isContextLost = true;
    PS.gl.state.contextLossCount++;

    if (PS.events) {
      PS.events.emit(PS.events.types.RENDER_GL_CONTEXT_LOST, { count: PS.gl.state.contextLossCount });
    }
  }, false);

  targetCanvas.addEventListener("webglcontextrestored", function () {
    PS.gl.state.isContextLost = false;
    PS.gl.state.contextRestoreCount++;
    PS.gl.state.context = null;
    PS.gl.init(targetCanvas);

    if (PS.render && typeof PS.render.rebuildShaders === "function") {
      PS.render.rebuildShaders();
    }

    if (PS.render && typeof PS.render.rebuildTextures === "function") {
      PS.render.rebuildTextures();
    }

    if (PS.events) {
      PS.events.emit(PS.events.types.RENDER_GL_CONTEXT_RESTORED, { count: PS.gl.state.contextRestoreCount });
    }
  }, false);
};

PS.gl.createShader = function (gl, type, source) {
  var shader = gl.createShader(type);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    var info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    PS.assert(false, "Shader compile failed: " + info);
  }

  return shader;
};

PS.gl.createProgram = function (gl, vertexSource, fragmentSource) {
  var program = gl.createProgram();
  var vertexShader = PS.gl.createShader(gl, gl.VERTEX_SHADER, vertexSource);
  var fragmentShader = PS.gl.createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    var info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    PS.assert(false, "Program link failed: " + info);
  }

  return program;
};
