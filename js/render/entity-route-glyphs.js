PS.render = PS.render || {};
PS.render.entities = PS.render.entities || {};

PS.render.entities.routeTrafficGlyphScratch = PS.render.entities.routeTrafficGlyphScratch || {};

PS.render.entities.populateRouteTrafficGlyph = function (route, parentSettlement, childSettlement, glyph) {
  var parentLevel = Math.max(1, Math.round(Number(parentSettlement && parentSettlement.level) || 1));
  var childLevel = Math.max(1, Math.round(Number(childSettlement && childSettlement.level) || 1));
  var foodTransferred = Math.max(0, Number(route && route.foodTransferred) || 0);
  var isColonyRoute = Boolean(
    (parentSettlement && parentSettlement.isColony) ||
    (childSettlement && childSettlement.isColony)
  );
  var active = Boolean(route && route.isActive);
  var target = glyph || {};

  target.shape = isColonyRoute ? "colony-supply-braid" : (active ? "active-caravan" : "dormant-track");
  target.cargoGlyph = foodTransferred >= 20 ? "store-crate" : (foodTransferred > 0 ? "food-pip" : "scout-pip");
  target.tickCount = Math.max(3, Math.min(12, (active ? 5 : 3) + Math.round(foodTransferred / 16) + Math.floor((parentLevel + childLevel) / 3)));
  target.alpha = active ? 0.56 : 0.24;
  target.pulseEvery = isColonyRoute ? 2 : 3;

  return target;
};

PS.render.entities.getRouteTrafficGlyph = function (route, parentSettlement, childSettlement) {
  return PS.render.entities.populateRouteTrafficGlyph(route, parentSettlement, childSettlement, {});
};

PS.render.entities.getRouteTrafficGlyphScratch = function (route, parentSettlement, childSettlement) {
  return PS.render.entities.populateRouteTrafficGlyph(
    route,
    parentSettlement,
    childSettlement,
    PS.render.entities.routeTrafficGlyphScratch
  );
};

PS.render.entities.drawRouteTrafficGlyphMarks = function (route, parentPoint, childPoint, glyph, lineageColor, scale) {
  if (!glyph || !parentPoint || !childPoint) {
    return 0;
  }

  var drawn = 0;
  var drawScale = Math.max(1, Number(scale) || 1);
  var tickCount = Math.max(1, Math.round(Number(glyph.tickCount) || 1));
  var size = Math.max(2, Math.round((glyph.shape === "colony-supply-braid" ? 5 : 3) * drawScale));
  var normalX = childPoint.y - parentPoint.y;
  var normalY = parentPoint.x - childPoint.x;
  var normalLength = Math.sqrt(normalX * normalX + normalY * normalY) || 1;

  normalX /= normalLength;
  normalY /= normalLength;

  for (var tick = 1; tick <= tickCount; tick++) {
    var amount = tick / (tickCount + 1);
    var pulse = tick % Math.max(1, Math.round(Number(glyph.pulseEvery) || 1)) === 0;
    var braidOffset = glyph.shape === "colony-supply-braid" ? (pulse ? 1 : -1) * size * 0.65 : 0;
    var x = parentPoint.x + (childPoint.x - parentPoint.x) * amount + normalX * braidOffset;
    var y = parentPoint.y + (childPoint.y - parentPoint.y) * amount + normalY * braidOffset;
    var color = pulse || glyph.cargoGlyph === "store-crate" ? "#d9b85f" : lineageColor;

    ctx.fillStyle = PS.render.entities.getRgbaFromHex(color, glyph.alpha);
    ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    if (glyph.cargoGlyph === "store-crate" && pulse) {
      ctx.fillStyle = PS.render.entities.getRgbaFromHex("#fff26b", Math.min(0.72, glyph.alpha + 0.12));
      ctx.fillRect(Math.round(x - size / 4), Math.round(y - size / 4), Math.max(1, Math.round(size / 2)), Math.max(1, Math.round(size / 2)));
    }
    drawn++;
  }

  return drawn;
};
