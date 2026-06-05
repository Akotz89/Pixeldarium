// ── Sprite Batch Renderer ──────────────────────────────────────────
// WebGL2 instanced quad renderer for sprites.
// Batches all visible sprites into a single draw call per atlas page.
//
// Usage:
//   PS.spriteBatch.init(gl);
//   PS.spriteBatch.begin(cameraX, cameraY, zoom);
//   PS.spriteBatch.submit(cellId, worldX, worldY, scale, tintR, tintG, tintB, tintA, flipH);
//   PS.spriteBatch.flush();

PS.render = PS.render || {};

PS.spriteBatch = {
  gl: null,
  program: null,
  vao: null,
  quadBuffer: null,
  instanceBuffer: null,
  instanceData: null,
  instanceCount: 0,
  maxInstances: 16384,
  initialized: false,

  // Per-instance stride: position(2) + uvRect(4) + tint(4) + scaleFlip(2) = 12 floats
  FLOATS_PER_INSTANCE: 12,

  // Uniform locations
  uniforms: {},

  // ── Initialize WebGL resources ──

  init: function (gl) {
    if (!gl) { return false; }

    PS.spriteBatch.gl = gl;

    // Create shader program
    var program = PS.render.shaderManager.getProgram(gl, PS.spriteBatchShaders.name);
    PS.spriteBatch.program = program;

    // Get uniform locations
    PS.spriteBatch.uniforms = {
      resolution: gl.getUniformLocation(program, "u_resolution"),
      cameraOffset: gl.getUniformLocation(program, "u_cameraOffset"),
      zoom: gl.getUniformLocation(program, "u_zoom"),
      atlas: gl.getUniformLocation(program, "u_atlas")
    };

    // Create VAO
    PS.spriteBatch.vao = gl.createVertexArray();
    gl.bindVertexArray(PS.spriteBatch.vao);

    // Unit quad (two triangles, centered at origin)
    var halfSize = 16; // Half of cellSize=32
    var quadVerts = new Float32Array([
      -halfSize, -halfSize,
       halfSize, -halfSize,
      -halfSize,  halfSize,
       halfSize,  halfSize
    ]);

    PS.spriteBatch.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, PS.spriteBatch.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

    // a_quadPos (location 0)
    var quadPosLoc = gl.getAttribLocation(program, "a_quadPos");
    gl.enableVertexAttribArray(quadPosLoc);
    gl.vertexAttribPointer(quadPosLoc, 2, gl.FLOAT, false, 0, 0);

    // Instance buffer
    var stride = PS.spriteBatch.FLOATS_PER_INSTANCE;
    PS.spriteBatch.instanceData = new Float32Array(PS.spriteBatch.maxInstances * stride);
    PS.spriteBatch.instanceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, PS.spriteBatch.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, PS.spriteBatch.instanceData.byteLength, gl.DYNAMIC_DRAW);

    var bytesPerInstance = stride * 4;

    // a_position (location 1) — 2 floats
    var posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, bytesPerInstance, 0);
    gl.vertexAttribDivisor(posLoc, 1);

    // a_uvRect (location 2) — 4 floats
    var uvLoc = gl.getAttribLocation(program, "a_uvRect");
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 4, gl.FLOAT, false, bytesPerInstance, 8);
    gl.vertexAttribDivisor(uvLoc, 1);

    // a_tintColor (location 3) — 4 floats
    var tintLoc = gl.getAttribLocation(program, "a_tintColor");
    gl.enableVertexAttribArray(tintLoc);
    gl.vertexAttribPointer(tintLoc, 4, gl.FLOAT, false, bytesPerInstance, 24);
    gl.vertexAttribDivisor(tintLoc, 1);

    // a_scaleFlip (location 4) — 2 floats
    var sfLoc = gl.getAttribLocation(program, "a_scaleFlip");
    gl.enableVertexAttribArray(sfLoc);
    gl.vertexAttribPointer(sfLoc, 2, gl.FLOAT, false, bytesPerInstance, 40);
    gl.vertexAttribDivisor(sfLoc, 1);

    gl.bindVertexArray(null);

    PS.spriteBatch.initialized = true;
    return true;
  },

  // ── Begin a new batch frame ──

  begin: function (cameraX, cameraY, zoom) {
    PS.spriteBatch.instanceCount = 0;
    PS.spriteBatch._cameraX = cameraX || 0;
    PS.spriteBatch._cameraY = cameraY || 0;
    PS.spriteBatch._zoom = zoom || 1;
  },

  // ── Submit a sprite instance ──

  submit: function (cellId, worldX, worldY, scale, tintR, tintG, tintB, tintA, flipH) {
    if (PS.spriteBatch.instanceCount >= PS.spriteBatch.maxInstances) { return; }

    var cell = PS.atlas ? PS.atlas.getCell(cellId) : null;
    if (!cell) { return; }

    var idx = PS.spriteBatch.instanceCount * PS.spriteBatch.FLOATS_PER_INSTANCE;
    var data = PS.spriteBatch.instanceData;

    // Position
    data[idx] = worldX;
    data[idx + 1] = worldY;

    // UV rect (normalized)
    data[idx + 2] = cell.u0;
    data[idx + 3] = cell.v0;
    data[idx + 4] = cell.u1;
    data[idx + 5] = cell.v1;

    // Tint color
    data[idx + 6] = tintR !== undefined ? tintR : 1;
    data[idx + 7] = tintG !== undefined ? tintG : 1;
    data[idx + 8] = tintB !== undefined ? tintB : 1;
    data[idx + 9] = tintA !== undefined ? tintA : 1;

    // Scale and flip
    data[idx + 10] = scale || 1;
    data[idx + 11] = flipH ? -1 : 1;

    PS.spriteBatch.instanceCount++;
  },

  // ── Submit a sprite with RANMAP variety ──

  submitWithVariety: function (cellId, worldX, worldY, tileX, tileY, scale) {
    var jx = PS.ranmap ? PS.ranmap.jitterX(tileX, tileY) * 2 : 0;
    var jy = PS.ranmap ? PS.ranmap.jitterY(tileX, tileY) * 2 : 0;
    var flip = PS.ranmap ? PS.ranmap.flipH(tileX, tileY) : false;

    PS.spriteBatch.submit(cellId, worldX + jx, worldY + jy, scale || 1, 1, 1, 1, 1, flip);
  },

  // ── Flush the batch — draw all submitted instances ──

  flush: function () {
    if (!PS.spriteBatch.initialized || PS.spriteBatch.instanceCount === 0) { return 0; }

    var gl = PS.spriteBatch.gl;
    var count = PS.spriteBatch.instanceCount;

    gl.useProgram(PS.spriteBatch.program);

    // Set uniforms
    gl.uniform2f(PS.spriteBatch.uniforms.resolution,
      gl.canvas.width / 2, gl.canvas.height / 2);
    gl.uniform2f(PS.spriteBatch.uniforms.cameraOffset,
      PS.spriteBatch._cameraX, PS.spriteBatch._cameraY);
    gl.uniform1f(PS.spriteBatch.uniforms.zoom, PS.spriteBatch._zoom);
    gl.uniform1i(PS.spriteBatch.uniforms.atlas, 0);

    // Bind atlas texture
    if (PS.atlas && PS.atlas.pages.length > 0 && PS.atlas.pages[0].glTexture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, PS.atlas.pages[0].glTexture);
    }

    // Upload instance data
    gl.bindVertexArray(PS.spriteBatch.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, PS.spriteBatch.instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0,
      PS.spriteBatch.instanceData.subarray(0, count * PS.spriteBatch.FLOATS_PER_INSTANCE));

    // Enable blending for alpha
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Draw instanced quads (triangle strip)
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);

    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);

    var drawn = PS.spriteBatch.instanceCount;
    PS.spriteBatch.instanceCount = 0;
    return drawn;
  },

  // ── Get stats ──

  getStats: function () {
    return {
      initialized: PS.spriteBatch.initialized,
      maxInstances: PS.spriteBatch.maxInstances,
      instanceCount: PS.spriteBatch.instanceCount,
      drawCallsLastFrame: PS.spriteBatch._lastDrawCalls || 0
    };
  }
};

PS.render.spriteBatch = PS.spriteBatch;
