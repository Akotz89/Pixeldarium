PS.render = PS.render || {};
PS.render.lod = PS.render.lod || {};

PS.render.lod.tiers = [
  { name: "galaxy", min: 1, max: 3 },
  { name: "planet", min: 3, max: 6 },
  { name: "continent", min: 6, max: 10 },
  { name: "region", min: 10, max: 15 },
  { name: "local", min: 15, max: 20 }
];

PS.render.lod.getArchitectureZoom = function (zoomLevel) {
  var levels = PS.camera.getZoomLevels();
  var maxIndex = Math.max(1, levels.length - 1);
  var normalizedZoom = clamp(Number(zoomLevel) || 0, 0, maxIndex);

  return 1 + normalizedZoom / maxIndex * 19;
};

PS.render.lod.getTierIndexForArchitectureZoom = function (architectureZoom) {
  var zoom = clamp(Number(architectureZoom) || 1, 1, 20);

  for (var i = 0; i < PS.render.lod.tiers.length; i++) {
    var tier = PS.render.lod.tiers[i];

    if (zoom >= tier.min && (zoom < tier.max || i === PS.render.lod.tiers.length - 1)) {
      return i;
    }
  }

  return PS.render.lod.tiers.length - 1;
};

PS.render.lod.getTier = function (zoomLevel) {
  var architectureZoom = PS.render.lod.getArchitectureZoom(zoomLevel);
  var tierIndex = PS.render.lod.getTierIndexForArchitectureZoom(architectureZoom);
  var tier = PS.render.lod.tiers[tierIndex];
  var span = Math.max(0.0001, tier.max - tier.min);
  var amount = clamp((architectureZoom - tier.min) / span, 0, 1);
  var blendWindow = 0.18;
  var nextTier = PS.render.lod.tiers[Math.min(PS.render.lod.tiers.length - 1, tierIndex + 1)];
  var previousTier = PS.render.lod.tiers[Math.max(0, tierIndex - 1)];
  var blendToNext = tierIndex < PS.render.lod.tiers.length - 1
    ? clamp((amount - (1 - blendWindow)) / blendWindow, 0, 1)
    : 0;
  var blendFromPrevious = tierIndex > 0
    ? clamp((blendWindow - amount) / blendWindow, 0, 1)
    : 0;

  return {
    name: tier.name,
    index: tierIndex,
    architectureZoom: architectureZoom,
    min: tier.min,
    max: tier.max,
    amount: amount,
    previousName: previousTier.name,
    nextName: nextTier.name,
    blendFromPrevious: blendFromPrevious,
    blendToNext: blendToNext,
    transitionAlpha: Math.max(blendFromPrevious, blendToNext)
  };
};

PS.render.lod.getZoomDirection = function () {
  var view = PS.camera.getView();

  return Number(view.zoomDirection) || 0;
};

PS.render.lod.getPreloadSurfaceLodIndex = function () {
  var direction = PS.render.lod.getZoomDirection();
  var current = PS.camera.getSurfaceLodZoomIndex(PS.camera.getView().zoomLevel);
  var levels = PS.camera.getZoomLevels();

  if (direction > 0) {
    return clamp(current + 1, 1, levels.length - 1);
  }

  if (direction < 0) {
    return clamp(current - 1, 1, levels.length - 1);
  }

  return current;
};

PS.render.lod.rebuildShaders = function () {};
PS.render.lod.rebuildTextures = function () {};
