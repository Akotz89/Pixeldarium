PS.render = PS.render || {};
PS.render.surface = PS.render.surface || {};
PS.render.surface.ecology = PS.render.surface.ecology || {
  cache: {},
  frameKey: "",
  stats: {
    sampledCells: 0,
    activeCells: 0,
    foodPressureCells: 0,
    organismPressureCells: 0
  }
};

PS.render.surface.getEcologyFrameKey = function () {
  var view = typeof getPlanetView === "function" ? getPlanetView() : null;
  var zoom = view ? Math.round((Number(view.zoomLevel) || 0) * 10) / 10 : 0;
  var tickBucket = Math.floor(Math.max(0, Math.round(Number(world && world.tick) || 0)) / 30);
  return [
    tickBucket,
    zoom,
    Array.isArray(world && world.food) ? world.food.length : 0,
    Array.isArray(world && world.organisms) ? world.organisms.length : 0
  ].join(":");
};

PS.render.surface.ensureEcologyFrame = function () {
  var state = PS.render.surface.ecology;
  var frameKey = PS.render.surface.getEcologyFrameKey();

  if (state.frameKey !== frameKey) {
    state.cache = {};
    state.frameKey = frameKey;
    state.stats.sampledCells = 0;
    state.stats.activeCells = 0;
    state.stats.foodPressureCells = 0;
    state.stats.organismPressureCells = 0;
  }

  return state;
};

PS.render.surface.shouldEncodeEcology = function () {
  var view = typeof getPlanetView === "function" ? getPlanetView() : null;
  var minZoom = Math.max(0, Number(CONFIG.PLANET_SURFACE_ECOLOGY_MIN_ZOOM) || 4);

  return CONFIG.PLANET_SURFACE_ECOLOGY_ENABLED !== false &&
    view &&
    Number(view.zoomLevel) >= minZoom &&
    typeof countFoodInRadius === "function" &&
    typeof countOrganismsInRadiusForLineage === "function";
};

PS.render.surface.getEcologyBucket = function (count) {
  var safeCount = Math.max(0, Math.round(Number(count) || 0));

  if (safeCount >= 6) { return 3; }
  if (safeCount >= 3) { return 2; }
  if (safeCount >= 1) { return 1; }
  return 0;
};

PS.render.surface.getSampleEcology = function (sample) {
  if (!sample || !PS.render.surface.shouldEncodeEcology()) {
    return null;
  }

  var state = PS.render.surface.ensureEcologyFrame();
  var radius = Math.max(1, Math.round(Number(CONFIG.PLANET_SURFACE_ECOLOGY_RADIUS_TILES) || 4));
  var tileX = getWrappedWorldX(sample.x);
  var tileY = getClampedWorldY(sample.y);
  var key = tileX + ":" + tileY + ":" + radius;
  var cached = state.cache[key];

  if (cached !== undefined) {
    return cached;
  }

  var foodCount = countFoodInRadius(tileX, tileY, radius);
  var organismCount = countOrganismsInRadiusForLineage(tileX, tileY, radius, 0);
  var foodBucket = PS.render.surface.getEcologyBucket(foodCount);
  var organismBucket = PS.render.surface.getEcologyBucket(organismCount);
  var pressure = Math.max(foodBucket, organismBucket) / 3;

  state.stats.sampledCells++;

  if (foodBucket <= 0 && organismBucket <= 0) {
    state.cache[key] = null;
    return null;
  }

  cached = {
    key: "eco." + foodBucket + "." + organismBucket,
    foodCount: foodCount,
    organismCount: organismCount,
    foodBucket: foodBucket,
    organismBucket: organismBucket,
    foodPressure: foodBucket / 3,
    organismPressure: organismBucket / 3,
    organicMatter: Math.max(organismBucket / 3, foodBucket / 3),
    resourceRichness: foodBucket / 3,
    pressure: pressure
  };

  state.activeCells++;
  if (foodBucket > 0) {
    state.foodPressureCells++;
  }
  if (organismBucket > 0) {
    state.organismPressureCells++;
  }

  state.cache[key] = cached;
  return cached;
};

PS.render.surface.withEcology = function (sample) {
  var ecology = PS.render.surface.getSampleEcology(sample);

  if (!ecology) {
    return sample;
  }

  var nextSample = Object.assign({}, sample);
  var detail = sample && sample.detail ? Object.assign({}, sample.detail) : {};
  var signals = detail.materialSignals ? Object.assign({}, detail.materialSignals) : {};

  signals.organicMatter = Math.max(Number(signals.organicMatter) || 0, ecology.organicMatter);
  signals.nutrientRichness = Math.max(Number(signals.nutrientRichness) || 0, ecology.resourceRichness);
  detail.materialSignals = signals;
  detail.organicMatter = Math.max(Number(detail.organicMatter) || 0, ecology.organicMatter);
  detail.resourceFertility = Math.max(Number(detail.resourceFertility) || 0, ecology.resourceRichness);

  nextSample.detail = detail;
  nextSample.ecology = ecology;
  nextSample.resourceRichness = Math.max(Number(sample.resourceRichness) || 0, ecology.resourceRichness);
  return nextSample;
};

PS.render.surface.getEcologyStats = function () {
  var state = PS.render.surface.ecology;
  var activeCells = 0;
  var foodPressureCells = 0;
  var organismPressureCells = 0;
  var keys = Object.keys(state.cache);

  for (var i = 0; i < keys.length; i++) {
    var item = state.cache[keys[i]];

    if (!item) {
      continue;
    }

    activeCells++;
    if (item.foodBucket > 0) {
      foodPressureCells++;
    }
    if (item.organismBucket > 0) {
      organismPressureCells++;
    }
  }

  return {
    frameKey: state.frameKey,
    cacheEntries: keys.length,
    sampledCells: state.stats.sampledCells,
    activeCells: activeCells,
    foodPressureCells: foodPressureCells,
    organismPressureCells: organismPressureCells
  };
};
