PS.render = PS.render || {};
PS.render.entities = PS.render.entities || {};

PS.render.entities.drawResourcePresencePatch = function (resource) {
  var point = PS.render.entities.getRenderPosition(resource, 1);

  if (!PS.render.entities.isPresencePointVisible(point, 96)) {
    return;
  }

  var scale = point.scale || 1;
  var richness = clamp((Number(resource && resource.energy) || Number(resource && resource.amount) || 120) / 240, 0.35, 1);
  var patchSize = Math.max(8, Math.round((10 + richness * 12) * scale));
  var cellSize = Math.max(2, Math.round(2 * scale));

  ctx.save();
  ctx.fillStyle = PS.render.entities.getRgbaFromHex("#071d0f", 0.36);
  ctx.fillRect(
    Math.round(point.x - patchSize * 0.50),
    Math.round(point.y - patchSize * 0.38),
    Math.round(patchSize),
    Math.round(patchSize * 0.76)
  );

  for (var i = 0; i < 10; i++) {
    var sample = PS.render.entities.getPresenceDensitySample(resource, "resource", i);
    var x = Math.round(point.x + sample.offsetX * scale - cellSize / 2);
    var y = Math.round(point.y + sample.offsetY * scale - cellSize / 2);
    var isSeed = i % 4 === 0;

    ctx.fillStyle = isSeed
      ? PS.render.entities.getRgbaFromHex("#d9f28a", 0.62)
      : PS.render.entities.getRgbaFromHex(i % 3 === 0 ? "#7fe06c" : "#3faf55", 0.48);
    ctx.fillRect(x, y, isSeed ? cellSize + 1 : cellSize, isSeed ? cellSize + 1 : Math.max(1, cellSize - 1));
  }

  ctx.restore();
};

PS.render.entities.drawOrganismActivityTrail = function (organism) {
  var point = PS.render.entities.getRenderPosition(organism, 1);

  if (!PS.render.entities.isPresencePointVisible(point, 96)) {
    return;
  }

  var scale = point.scale || 1;
  var color = PS.render.entities.getOrganismColor(organism);
  var energy = Number(organism && organism.energy) || 100;
  var isHungry = energy < 60;
  var trailCount = isHungry ? 5 : 4;

  ctx.save();

  for (var i = 0; i < trailCount; i++) {
    var sample = PS.render.entities.getPresenceDensitySample(organism, "organism", i + 9);
    var size = Math.max(2, Math.round((isHungry ? 2.6 : 2.2) * scale));
    var x = Math.round(point.x + sample.offsetX * scale - size / 2);
    var y = Math.round(point.y + sample.offsetY * scale - size / 2);

    ctx.fillStyle = PS.render.entities.getRgbaFromHex(isHungry ? "#ff9c69" : color, clamp(0.20 + i * 0.035, 0.20, 0.42));
    ctx.fillRect(x, y, size, Math.max(1, size - 1));
  }

  ctx.fillStyle = PS.render.entities.getRgbaFromHex(color, isHungry ? 0.58 : 0.48);
  ctx.fillRect(
    Math.round(point.x - Math.max(2, scale * 2)),
    Math.round(point.y - Math.max(2, scale * 2)),
    Math.max(3, Math.round(scale * 4)),
    Math.max(2, Math.round(scale * 3))
  );
  ctx.restore();
};
