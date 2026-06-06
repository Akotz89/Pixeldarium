PS.render = PS.render || {};
PS.render.entityWebgl = PS.render.entityWebgl || {};

PS.render.entityWebgl.strideFloats = 13;

PS.render.entityWebgl.state = {
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
  animationFrames: null,
  drawCount: 0,
  instanceDrawCount: 0,
  frameInstanceDrawCount: 0,
  organismDrawCount: 0,
  foodDrawCount: 0,
  settlementDrawCount: 0,
  routeDrawCount: 0,
  influenceDrawCount: 0,
  pageDrawCount: 0,
  textureUploadCount: 0,
  traitSpriteCount: 0,
  fallbackCount: 0,
  culledCount: 0,
  cappedCount: 0,
  lastFrameMs: 0,
  lastError: ""
};

PS.render.entityWebgl.shaderName = "entity-atlas";

PS.render.entityWebgl.getMaxInstances = function () {
  return Math.max(1, Math.floor(Number(CONFIG.PLANET_ENTITY_WEBGL_MAX_INSTANCES) || 8192));
};

PS.render.entityWebgl.resetFrameStats = function () {
  var state = PS.render.entityWebgl.state;

  state.frameInstanceDrawCount = 0;
  state.instanceDrawCount = 0;
  state.organismDrawCount = 0;
  state.foodDrawCount = 0;
  state.settlementDrawCount = 0;
  state.routeDrawCount = 0;
  state.influenceDrawCount = 0;
  state.pageDrawCount = 0;
  state.culledCount = 0;
  state.cappedCount = 0;
};

PS.render.entityWebgl.ensureCanvas = function (width, height) {
  var target = PS.render.webglEngine && PS.render.webglEngine.ensureTarget
    ? PS.render.webglEngine.ensureTarget("entities", width, height, { alpha: true })
    : null;

  if (!target) {
    return false;
  }

  PS.render.entityWebgl.state.target = target;
  PS.render.entityWebgl.state.canvas = target.canvas;
  PS.render.entityWebgl.state.gl = target.gl;
  return true;
};

PS.render.entityWebgl.ensureAtlas = function () {
  if (PS.atlas && !PS.atlas.initialized && typeof PS.atlas.init === "function") {
    PS.atlas.init();
  }

  return Boolean(PS.atlas && PS.atlas.pages && PS.atlas.pages.length > 0);
};

PS.render.entityWebgl.initialize = function (width, height) {
  var state = PS.render.entityWebgl.state;

  if (
    CONFIG.PLANET_ENTITY_WEBGL_INSTANCING === false ||
    !PS.render.entityWebgl.ensureCanvas(width, height) ||
    !PS.render.entityWebgl.ensureAtlas()
  ) {
    return false;
  }

  if (!state.gl) {
    return false;
  }

  if (!state.program) {
    var gl = state.gl;
    var stride = PS.render.entityWebgl.strideFloats * Float32Array.BYTES_PER_ELEMENT;

    state.program = PS.render.shaderManager.getProgram(gl, PS.render.entityWebgl.shaderName);
    state.quadBuffer = PS.render.webglEngine.ensureBuffer(state.target, "entity-quad");
    state.instanceBuffer = PS.render.webglEngine.ensureBuffer(state.target, "entity-instances");
    state.locations = {
      corner: gl.getAttribLocation(state.program, "a_corner"),
      center: gl.getAttribLocation(state.program, "a_center"),
      size: gl.getAttribLocation(state.program, "a_size"),
      uvRect: gl.getAttribLocation(state.program, "a_uvRect"),
      tint: gl.getAttribLocation(state.program, "a_tint"),
      flipH: gl.getAttribLocation(state.program, "a_flipH"),
      canvasSize: gl.getUniformLocation(state.program, "u_canvasSize"),
      atlas: gl.getUniformLocation(state.program, "u_atlas"),
      stride: stride
    };
    PS.render.webglEngine.updateBuffer(state.target, "entity-quad", new Float32Array([
      -0.5, -0.5,
      0.5, -0.5,
      -0.5, 0.5,
      0.5, 0.5
    ]), gl.STATIC_DRAW);
  }

  if (!state.instanceData || state.instanceData.length < PS.render.entityWebgl.getMaxInstances() * PS.render.entityWebgl.strideFloats) {
    state.instanceData = new Float32Array(PS.render.entityWebgl.getMaxInstances() * PS.render.entityWebgl.strideFloats);
  }

  return true;
};

PS.render.entityWebgl.parseColor = function (hexColor, alpha) {
  var color = String(hexColor || "#ffffff").replace("#", "");

  if (color.length !== 6) {
    return [1, 1, 1, Number.isFinite(Number(alpha)) ? Number(alpha) : 1];
  }

  return [
    parseInt(color.slice(0, 2), 16) / 255,
    parseInt(color.slice(2, 4), 16) / 255,
    parseInt(color.slice(4, 6), 16) / 255,
    Number.isFinite(Number(alpha)) ? Number(alpha) : 1
  ];
};

PS.render.entityWebgl.getOrganismCell = function (organism) {
  var traits = organism && organism.traits ? organism.traits : {};
  var bodyType = Math.max(0, Math.min(3, Math.floor((Number(traits.bodySize) || 1) * 1.5)));
  var variant = PS.ranmap
    ? PS.ranmap.variant(Math.round(organism.x || 0), Math.round(organism.y || 0), 4)
    : 0;

  if (PS.atlas && typeof PS.atlas.getTraitOrganismCell === "function") {
    return PS.atlas.getTraitOrganismCell(organism, variant);
  }

  return PS.atlas.getOrganismCell(bodyType, variant);
};

PS.render.entityWebgl.getAnimatedOrganismCell = function (organism, dt, frameOverride) {
  var traits = organism && organism.traits ? organism.traits : {};
  var bodyType = Math.max(0, Math.min(3, Math.floor((Number(traits.bodySize) || 1) * 1.5)));
  var frame = frameOverride || (PS.animation && typeof PS.animation.getVisibleOrganismFrame === "function"
    ? PS.animation.getVisibleOrganismFrame(organism, dt)
    : null);
  var frameVariant = 0;
  var cell = frame && PS.atlas ? PS.atlas.getCell(frame) : null;
  var bodyFrame;

  if (frame) {
    frameVariant = Math.max(0, Math.min(3, Math.round(Number(String(frame).split(".").pop()) || 0)));
  }

  if (PS.atlas && typeof PS.atlas.getTraitOrganismCell === "function") {
    return PS.atlas.getTraitOrganismCell(organism, frameVariant);
  }

  if (cell) {
    return cell;
  }

  if (frame && frame.indexOf("entity.organism_") === 0) {
    bodyFrame = frame.replace(/entity\.organism_\d+\./, "entity.organism_" + bodyType + ".");
    cell = PS.atlas.getCell(bodyFrame);
    if (cell) {
      return cell;
    }
  }

  return PS.render.entityWebgl.getOrganismCell(organism);
};

PS.render.entityWebgl.getFoodCell = function (food) {
  var variant = PS.ranmap
    ? PS.ranmap.variant(Math.round(food.x || 0), Math.round(food.y || 0), 4)
    : 0;

  return PS.atlas.getFoodCell(variant, food);
};

PS.render.entityWebgl.getSettlementCell = function (settlement) {
  if (PS.atlas && typeof PS.atlas.getSettlementCell === "function") {
    return PS.atlas.getSettlementCell(settlement);
  }

  return null;
};

PS.render.entityWebgl.getRouteCell = function (route, shape) {
  if (PS.atlas && typeof PS.atlas.getRouteCell === "function") {
    return PS.atlas.getRouteCell(route, shape);
  }

  return null;
};

PS.render.entityWebgl.getSettlementInfluenceCell = function (settlement) {
  if (PS.atlas && typeof PS.atlas.getSettlementInfluenceCell === "function") {
    return PS.atlas.getSettlementInfluenceCell(settlement);
  }

  return null;
};

PS.render.entityWebgl.getTexture = function (pageIndex) {
  var state = PS.render.entityWebgl.state;
  var gl = state.gl;
  var page = PS.atlas.pages[pageIndex];

  if (!page || !PS.render.webglEngine) {
    return null;
  }

  if (!page.data || !PS.render.webglEngine.getRgbaTexture) {
    return null;
  }

  var texture = PS.render.webglEngine.getRgbaTexture(
    "entity-atlas",
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

PS.render.entityWebgl.createBatches = function () {
  return {
    pages: {},
    count: 0,
    organisms: 0,
    food: 0,
    settlements: 0,
    routes: 0,
    influences: 0,
    capped: 0,
    culled: 0
  };
};

PS.render.entityWebgl.submit = function (batches, cell, point, size, tint, flipH, kind) {
  var maxInstances = PS.render.entityWebgl.getMaxInstances();
  var width = PS.render.entityWebgl.state.target.width;
  var height = PS.render.entityWebgl.state.target.height;
  var drawSize = Math.max(1, Number(size) || 1);
  var margin = drawSize + 2;
  var alpha = point && Number.isFinite(Number(point.visibility)) ? clamp(Number(point.visibility), 0, 1) : 1;

  if (!cell || !point || alpha <= 0) {
    batches.culled++;
    return;
  }

  if (point.visible === false || point.x < -margin || point.y < -margin || point.x > width + margin || point.y > height + margin) {
    batches.culled++;
    return;
  }

  if (batches.count >= maxInstances) {
    batches.capped++;
    return;
  }

  var pageIndex = cell.pageIndex || 0;
  var page = batches.pages[pageIndex];

  if (!page) {
    page = [];
    batches.pages[pageIndex] = page;
  }

  page.push(
    point.x,
    point.y,
    drawSize,
    drawSize,
    cell.u0,
    cell.v0,
    cell.u1,
    cell.v1,
    tint[0],
    tint[1],
    tint[2],
    tint[3] * alpha,
    flipH ? 1 : 0
  );
  batches.count++;

  if (kind === "food") {
    batches.food++;
  } else if (kind === "settlement") {
    batches.settlements++;
  } else if (kind === "route") {
    batches.routes++;
  } else if (kind === "influence") {
    batches.influences++;
  } else {
    batches.organisms++;
  }
};

PS.render.entityWebgl.buildOrganismBatches = function (interpolation) {
  var batches = PS.render.entityWebgl.createBatches();
  var amount = PS.render.entities.getInterpolationAmount(interpolation);
  var animationStart = performance.now();
  var animationLimit = PS.animation && PS.animation.stats
    ? Math.max(0, Math.floor(Number(PS.animation.stats.maxVisibleControllers) || 5000))
    : 0;
  var animationDt = PS.time && Number.isFinite(Number(PS.time.dt)) ? PS.time.dt : 1 / 60;
  var animationFrames = PS.render.entityWebgl.state.animationFrames;

  if (!PS.render.entityWebgl.state.target && typeof canvas !== "undefined") {
    PS.render.entityWebgl.initialize(canvas.width, canvas.height);
  }

  if (!PS.render.entityWebgl.state.target) {
    batches.culled = typeof world !== "undefined" && Array.isArray(world.organisms) ? world.organisms.length : 0;
    return batches;
  }

  if (PS.animation && typeof PS.animation.resetFrameStats === "function") {
    PS.animation.resetFrameStats();
  }

  if (!animationFrames || animationFrames.length < world.organisms.length) {
    animationFrames = new Array(world.organisms.length);
    PS.render.entityWebgl.state.animationFrames = animationFrames;
  }

  if (PS.animation && typeof PS.animation.updateVisibleOrganismFrames === "function" && !world.isPaused) {
    PS.animation.updateVisibleOrganismFrames(
      world.organisms,
      Math.min(world.organisms.length, animationLimit),
      animationDt,
      animationFrames
    );
  }

  for (var i = 0; i < world.organisms.length; i++) {
    var organism = world.organisms[i];
    var point = PS.render.entities.getRenderPosition(organism, amount);
    var size = Math.max(1, CONFIG.ORGANISM_DRAW_SIZE * ((point && point.scale) || 1));
    var tint = PS.render.entityWebgl.parseColor(PS.render.entities.getOrganismColor(organism), 1);
    var flipH = PS.ranmap && PS.ranmap.flipH(Math.round(organism.x || 0), Math.round(organism.y || 0));
    var cell = PS.render.entityWebgl.getOrganismCell(organism);

    if (
      PS.animation &&
      i < animationLimit &&
      point &&
      point.visible !== false &&
      !world.isPaused
    ) {
      cell = PS.render.entityWebgl.getAnimatedOrganismCell(organism, animationDt, animationFrames[i]);
    }

    PS.render.entityWebgl.submit(
      batches,
      cell,
      point,
      size,
      tint,
      flipH,
      "organism"
    );
  }

  if (PS.animation && PS.animation.stats && PS.animation.stats.lastUpdateMs <= 0) {
    PS.animation.stats.lastUpdateMs = performance.now() - animationStart;
  }

  return batches;
};

PS.render.entityWebgl.buildFoodBatches = function () {
  var batches = PS.render.entityWebgl.createBatches();
  var tint = PS.render.entityWebgl.parseColor("#58f06c", 1);

  for (var i = 0; i < world.food.length; i++) {
    var food = world.food[i];
    var point = PS.render.entities.getRenderPosition(food, 1);
    var size = Math.max(1, CONFIG.FOOD_DRAW_SIZE * ((point && point.scale) || 1));
    var flipH = PS.ranmap && PS.ranmap.flipH(Math.round(food.x || 0), Math.round(food.y || 0));

    PS.render.entityWebgl.submit(
      batches,
      PS.render.entityWebgl.getFoodCell(food),
      point,
      size,
      tint,
      flipH,
      "food"
    );
  }

  return batches;
};

PS.render.entityWebgl.buildSettlementBatches = function () {
  var batches = PS.render.entityWebgl.createBatches();

  if (!Array.isArray(world.settlements)) {
    return batches;
  }

  for (var i = 0; i < world.settlements.length; i++) {
    var settlement = world.settlements[i];
    var point = PS.render.entities.getSettlementRenderPosition(settlement);
    var size = Math.max(1, PS.render.entities.getSettlementDrawSize(settlement) * ((point && point.scale) || 1));
    var tint = PS.render.entityWebgl.parseColor(PS.render.entities.getLineageColorById(settlement.lineageId || 1), 1);
    var flipH = PS.ranmap && PS.ranmap.flipH(Math.round(settlement.x || 0), Math.round(settlement.y || 0));

    PS.render.entityWebgl.submit(
      batches,
      PS.render.entityWebgl.getSettlementCell(settlement),
      point,
      size,
      tint,
      flipH,
      "settlement"
    );
  }

  return batches;
};

PS.render.entityWebgl.getRouteShape = function (dx, dy) {
  var absX = Math.abs(Number(dx) || 0);
  var absY = Math.abs(Number(dy) || 0);

  if (absY > absX * 1.8) {
    return "vertical";
  }

  if (absX > absY * 1.8) {
    return "horizontal";
  }

  return "diag";
};

PS.render.entityWebgl.getSettlementRouteCanvasPoint = function (settlement) {
  var point = PS.render.entities.getSettlementRenderPosition(settlement);

  if (point || typeof isPlanetLocalView !== "function" || !isPlanetLocalView()) {
    return point;
  }

  if (typeof getEntitySurfacePosition !== "function" || typeof getPlanetLocalCanvasPoint !== "function") {
    return null;
  }

  var surfacePosition = getEntitySurfacePosition(settlement);
  var canvasPoint = surfacePosition
    ? getPlanetLocalCanvasPoint(surfacePosition.longitude, surfacePosition.latitude)
    : null;

  if (
    !canvasPoint &&
    surfacePosition &&
    typeof getSurfaceMeterCoordinate === "function" &&
    typeof getPlanetView === "function" &&
    typeof getPlanetViewScale === "function"
  ) {
    var state = PS.render.entityWebgl.state;
    var target = state.target || {};
    var width = Number(target.width) || (typeof canvas !== "undefined" ? canvas.width : 0);
    var height = Number(target.height) || (typeof canvas !== "undefined" ? canvas.height : 0);
    var scale = getPlanetViewScale();
    var view = getPlanetView();
    var viewMeters = getSurfaceMeterCoordinate(view.latitude, view.longitude);
    var targetMeters = getSurfaceMeterCoordinate(surfacePosition.latitude, surfacePosition.longitude);

    if (scale && Number(scale.metersPerSample) > 0 && width > 0 && height > 0) {
      canvasPoint = {
        x: width / 2 + ((targetMeters.eastMeters - viewMeters.eastMeters) / scale.metersPerSample) * CONFIG.TILE_SIZE,
        y: height / 2 - ((targetMeters.northMeters - viewMeters.northMeters) / scale.metersPerSample) * CONFIG.TILE_SIZE
      };
    }
  }

  return canvasPoint ? {
    x: canvasPoint.x,
    y: canvasPoint.y,
    scale: 1,
    visibility: 1,
    visible: true
  } : null;
};

PS.render.entityWebgl.getVisibleRouteSegment = function (fromPoint, toPoint, margin) {
  var state = PS.render.entityWebgl.state;
  var target = state.target || {};
  var width = Number(target.width) || (typeof canvas !== "undefined" ? canvas.width : 0);
  var height = Number(target.height) || (typeof canvas !== "undefined" ? canvas.height : 0);
  var x0 = Number(fromPoint && fromPoint.x);
  var y0 = Number(fromPoint && fromPoint.y);
  var x1 = Number(toPoint && toPoint.x);
  var y1 = Number(toPoint && toPoint.y);
  var left = -margin;
  var right = width + margin;
  var top = -margin;
  var bottom = height + margin;
  var t0 = 0;
  var t1 = 1;
  var dx = x1 - x0;
  var dy = y1 - y0;

  function clip(p, q) {
    var ratio;

    if (p === 0) {
      return q >= 0;
    }

    ratio = q / p;

    if (p < 0) {
      if (ratio > t1) {
        return false;
      }
      if (ratio > t0) {
        t0 = ratio;
      }
    } else if (p > 0) {
      if (ratio < t0) {
        return false;
      }
      if (ratio < t1) {
        t1 = ratio;
      }
    }

    return true;
  }

  if (
    !Number.isFinite(x0) ||
    !Number.isFinite(y0) ||
    !Number.isFinite(x1) ||
    !Number.isFinite(y1) ||
    width <= 0 ||
    height <= 0 ||
    !clip(-dx, x0 - left) ||
    !clip(dx, right - x0) ||
    !clip(-dy, y0 - top) ||
    !clip(dy, bottom - y0)
  ) {
    return null;
  }

  return {
    from: {
      x: x0 + dx * t0,
      y: y0 + dy * t0,
      scale: fromPoint.scale || 1,
      visibility: fromPoint.visibility || 1,
      visible: true
    },
    to: {
      x: x0 + dx * t1,
      y: y0 + dy * t1,
      scale: toPoint.scale || 1,
      visibility: toPoint.visibility || 1,
      visible: true
    }
  };
};

PS.render.entityWebgl.buildSettlementRouteBatches = function () {
  var batches = PS.render.entityWebgl.createBatches();

  if (!Array.isArray(world.settlementRoutes)) {
    return batches;
  }

  for (var i = 0; i < world.settlementRoutes.length; i++) {
    var route = world.settlementRoutes[i];
    var parentSettlement = PS.render.entities.getSettlementById(route.parentSettlementId);
    var childSettlement = PS.render.entities.getSettlementById(route.childSettlementId);

    if (!parentSettlement || !childSettlement) {
      batches.culled++;
      continue;
    }

    var parentPoint = PS.render.entityWebgl.getSettlementRouteCanvasPoint(parentSettlement);
    var childPoint = PS.render.entityWebgl.getSettlementRouteCanvasPoint(childSettlement);
    var routeSegment;

    if (!parentPoint || !childPoint || parentPoint.visible === false || childPoint.visible === false) {
      batches.culled++;
      continue;
    }

    routeSegment = PS.render.entityWebgl.getVisibleRouteSegment(parentPoint, childPoint, 32);

    if (!routeSegment) {
      batches.culled++;
      continue;
    }

    parentPoint = routeSegment.from;
    childPoint = routeSegment.to;

    var dx = childPoint.x - parentPoint.x;
    var dy = childPoint.y - parentPoint.y;
    var distance = Math.sqrt(dx * dx + dy * dy);
    var shape = PS.render.entityWebgl.getRouteShape(dx, dy);
    var cell = PS.render.entityWebgl.getRouteCell(route, shape);
    var tint = PS.render.entityWebgl.parseColor(PS.render.entities.getLineageColorById(route.lineageId || parentSettlement.lineageId || 1), route.isActive === false ? 0.42 : 0.78);
    var step = Math.max(8, Math.min(22, 12 + distance * 0.015));
    var markerCount = Math.max(1, Math.min(18, Math.floor(distance / step)));
    var scale = Math.max(0.65, Math.min(1.8, ((parentPoint.scale || 1) + (childPoint.scale || 1)) * 0.5));
    var size = Math.max(2, 4.5 * scale);

    for (var marker = 1; marker <= markerCount; marker++) {
      var amount = marker / (markerCount + 1);
      var pulse = PS.ranmap ? PS.ranmap.variant(Math.round(route.id || i), marker, 4) : marker % 4;
      var point = {
        x: parentPoint.x + dx * amount,
        y: parentPoint.y + dy * amount,
        scale: scale,
        visibility: route.isActive === false ? 0.42 : (0.62 + pulse * 0.08),
        visible: true
      };

      PS.render.entityWebgl.submit(
        batches,
        cell,
        point,
        size,
        tint,
        dx < 0,
        "route"
      );
    }
  }

  return batches;
};

PS.render.entityWebgl.buildSettlementInfluenceBatches = function () {
  var batches = PS.render.entityWebgl.createBatches();

  if (!Array.isArray(world.settlements)) {
    return batches;
  }

  for (var i = 0; i < world.settlements.length; i++) {
    var settlement = world.settlements[i];
    var radius = Math.max(2, Math.round(Number(settlement.influenceRadius) || Number(settlement.radius) || 2));
    var markerCount = Math.max(8, Math.min(24, Math.round(radius * 1.5)));
    var cell = PS.render.entityWebgl.getSettlementInfluenceCell(settlement);
    var tint = PS.render.entityWebgl.parseColor(PS.render.entities.getLineageColorById(settlement.lineageId || 1), 0.58);

    for (var marker = 0; marker < markerCount; marker++) {
      var angle = (marker / markerCount) * Math.PI * 2;
      var tileX = settlement.x + Math.cos(angle) * radius;
      var tileY = settlement.y + Math.sin(angle) * radius;
      var point = PS.render.entities.getRenderPosition({
        x: tileX,
        y: tileY,
        prevX: tileX,
        prevY: tileY
      }, 1);
      var size = Math.max(2, 3.5 * ((point && point.scale) || 1));

      PS.render.entityWebgl.submit(
        batches,
        cell,
        point,
        size,
        tint,
        marker % 2 === 1,
        "influence"
      );
    }
  }

  return batches;
};

PS.render.entityWebgl.configureAttributes = function () {
  var state = PS.render.entityWebgl.state;
  var gl = state.gl;
  var loc = state.locations;
  var floatSize = Float32Array.BYTES_PER_ELEMENT;

  gl.bindBuffer(gl.ARRAY_BUFFER, state.quadBuffer);
  gl.enableVertexAttribArray(loc.corner);
  gl.vertexAttribPointer(loc.corner, 2, gl.FLOAT, false, 2 * floatSize, 0);
  gl.vertexAttribDivisor(loc.corner, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, state.instanceBuffer);
  gl.enableVertexAttribArray(loc.center);
  gl.vertexAttribPointer(loc.center, 2, gl.FLOAT, false, loc.stride, 0);
  gl.vertexAttribDivisor(loc.center, 1);
  gl.enableVertexAttribArray(loc.size);
  gl.vertexAttribPointer(loc.size, 2, gl.FLOAT, false, loc.stride, 2 * floatSize);
  gl.vertexAttribDivisor(loc.size, 1);
  gl.enableVertexAttribArray(loc.uvRect);
  gl.vertexAttribPointer(loc.uvRect, 4, gl.FLOAT, false, loc.stride, 4 * floatSize);
  gl.vertexAttribDivisor(loc.uvRect, 1);
  gl.enableVertexAttribArray(loc.tint);
  gl.vertexAttribPointer(loc.tint, 4, gl.FLOAT, false, loc.stride, 8 * floatSize);
  gl.vertexAttribDivisor(loc.tint, 1);
  gl.enableVertexAttribArray(loc.flipH);
  gl.vertexAttribPointer(loc.flipH, 1, gl.FLOAT, false, loc.stride, 12 * floatSize);
  gl.vertexAttribDivisor(loc.flipH, 1);
};

PS.render.entityWebgl.drawBatches = function (batches) {
  var state = PS.render.entityWebgl.state;
  var startedAt = performance.now();

  try {
    if (!batches || batches.count <= 0 || !PS.render.entityWebgl.initialize(canvas.width, canvas.height)) {
      state.fallbackCount++;
      return false;
    }

    var gl = state.gl;
    var loc = state.locations;
    var drawnInstances = 0;
    var pageDraws = 0;

    PS.render.webglEngine.beginTransparentPass(state.target);
    gl.useProgram(state.program);
    gl.uniform2f(loc.canvasSize, state.target.width, state.target.height);
    gl.uniform1i(loc.atlas, 0);
    PS.render.entityWebgl.configureAttributes();

    Object.keys(batches.pages).forEach(function (pageIndex) {
      var pageData = batches.pages[pageIndex];
      var instanceCount = Math.floor(pageData.length / PS.render.entityWebgl.strideFloats);
      var texture = PS.render.entityWebgl.getTexture(pageIndex);

      if (!texture || instanceCount <= 0) {
        return;
      }

      state.instanceData.set(pageData, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      PS.render.webglEngine.updateBuffer(
        state.target,
        "entity-instances",
        state.instanceData.subarray(0, pageData.length),
        gl.STREAM_DRAW
      );
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, instanceCount);
      drawnInstances += instanceCount;
      pageDraws++;
    });

    if (drawnInstances <= 0) {
      state.fallbackCount++;
      return false;
    }

    if (PS.render.webglPresenter && typeof PS.render.webglPresenter.presentTarget === "function") {
      PS.render.webglPresenter.presentTarget(state.target);
    }
    state.drawCount++;
    state.instanceDrawCount = drawnInstances;
    state.frameInstanceDrawCount += drawnInstances;
    state.organismDrawCount += batches.organisms;
    state.foodDrawCount += batches.food;
    state.settlementDrawCount += batches.settlements;
    state.routeDrawCount += batches.routes;
    state.influenceDrawCount += batches.influences;
    state.pageDrawCount = pageDraws;
    state.culledCount = batches.culled;
    state.cappedCount = batches.capped;
    state.traitSpriteCount = PS.atlas && PS.atlas.stats ? PS.atlas.stats.traitCells : 0;
    state.lastFrameMs = performance.now() - startedAt;
    state.lastError = "";
    return true;
  } catch (error) {
    state.fallbackCount++;
    state.lastError = String(error && error.message ? error.message : error);
    return false;
  }
};

PS.render.entityWebgl.drawOrganisms = function (interpolation) {
  if (CONFIG.PLANET_ENTITY_WEBGL_INSTANCING === false || !PS.render.entities.shouldDrawGlobeScaleEntities()) {
    return false;
  }

  if (!PS.render.entityWebgl.initialize(canvas.width, canvas.height)) {
    PS.render.entityWebgl.state.fallbackCount++;
    return false;
  }

  return PS.render.entityWebgl.drawBatches(PS.render.entityWebgl.buildOrganismBatches(interpolation));
};

PS.render.entityWebgl.drawFood = function () {
  if (CONFIG.PLANET_ENTITY_WEBGL_INSTANCING === false || !PS.render.entities.shouldDrawGlobeScaleEntities()) {
    return false;
  }

  if (!PS.render.entityWebgl.initialize(canvas.width, canvas.height)) {
    PS.render.entityWebgl.state.fallbackCount++;
    return false;
  }

  return PS.render.entityWebgl.drawBatches(PS.render.entityWebgl.buildFoodBatches());
};

PS.render.entityWebgl.drawSettlements = function () {
  if (CONFIG.PLANET_ENTITY_WEBGL_INSTANCING === false || !PS.render.entities.shouldDrawGlobeScaleEntities()) {
    return false;
  }

  if (!PS.render.entityWebgl.initialize(canvas.width, canvas.height)) {
    PS.render.entityWebgl.state.fallbackCount++;
    return false;
  }

  return PS.render.entityWebgl.drawBatches(PS.render.entityWebgl.buildSettlementBatches());
};

PS.render.entityWebgl.drawSettlementRoutes = function () {
  if (CONFIG.PLANET_ENTITY_WEBGL_INSTANCING === false || !PS.render.entities.shouldDrawGlobeScaleEntities()) {
    return false;
  }

  if (!PS.render.entityWebgl.initialize(canvas.width, canvas.height)) {
    PS.render.entityWebgl.state.fallbackCount++;
    return false;
  }

  return PS.render.entityWebgl.drawBatches(PS.render.entityWebgl.buildSettlementRouteBatches());
};

PS.render.entityWebgl.drawSettlementInfluence = function () {
  if (CONFIG.PLANET_ENTITY_WEBGL_INSTANCING === false || !PS.render.entities.shouldDrawGlobeScaleEntities()) {
    return false;
  }

  if (!PS.render.entityWebgl.initialize(canvas.width, canvas.height)) {
    PS.render.entityWebgl.state.fallbackCount++;
    return false;
  }

  return PS.render.entityWebgl.drawBatches(PS.render.entityWebgl.buildSettlementInfluenceBatches());
};

PS.render.entityWebgl.rebuildShaders = function () {
  var state = PS.render.entityWebgl.state;
  state.program = null;
  state.quadBuffer = null;
  state.instanceBuffer = null;
  state.locations = null;
};

PS.render.entityWebgl.rebuildTextures = function () {
  var state = PS.render.entityWebgl.state;
  var cache = PS.render.webglEngine && PS.render.webglEngine.deleteTextureCache
    ? PS.render.webglEngine.deleteTextureCache("entity-atlas", state.gl)
    : { textures: {}, order: [] };

  state.textures = cache.textures;
  state.textureOrder = cache.order;
};
