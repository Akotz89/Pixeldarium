PS.render = PS.render || {};
PS.render.surfaceRender = PS.render.surfaceRender || {};
PS.render.surfaceRender.canvases = PS.render.surfaceRender.canvases || {};

PS.render.surfaceRender.canvases.pool = {};
PS.render.surfaceRender.canvases.stats = {
  created: 0,
  reused: 0,
  released: 0,
  domCreated: 0,
  offscreenCreated: 0,
  pooled: 0
};

PS.render.surfaceRender.canvases.getKey = function (width, height) {
  return Math.max(1, Math.round(Number(width) || 1)) + "x" + Math.max(1, Math.round(Number(height) || 1));
};

PS.render.surfaceRender.canvases.updatePooledCount = function () {
  var count = 0;

  for (var key in this.pool) {
    if (Object.prototype.hasOwnProperty.call(this.pool, key)) {
      count += this.pool[key].length;
    }
  }

  this.stats.pooled = count;
};

PS.render.surfaceRender.canvases.make = function (width, height) {
  var normalizedWidth = Math.max(1, Math.round(Number(width) || 1));
  var normalizedHeight = Math.max(1, Math.round(Number(height) || 1));
  var key = this.getKey(normalizedWidth, normalizedHeight);
  var bucket = this.pool[key];
  var canvas = bucket && bucket.length > 0 ? bucket.pop() : null;

  if (canvas) {
    this.stats.reused++;
  } else if (typeof OffscreenCanvas !== "undefined") {
    canvas = new OffscreenCanvas(normalizedWidth, normalizedHeight);
    this.stats.created++;
    this.stats.offscreenCreated++;
  } else if (typeof document !== "undefined" && document.createElement) {
    canvas = document.createElement("canvas");
    this.stats.created++;
    this.stats.domCreated++;
  }

  if (!canvas) {
    return null;
  }

  canvas.width = normalizedWidth;
  canvas.height = normalizedHeight;
  this.updatePooledCount();
  return canvas;
};

PS.render.surfaceRender.canvases.release = function (canvas) {
  if (!canvas || typeof canvas.getContext !== "function") {
    return false;
  }

  var width = Math.max(1, Math.round(Number(canvas.width) || 1));
  var height = Math.max(1, Math.round(Number(canvas.height) || 1));
  var key = this.getKey(width, height);

  if (!this.pool[key]) {
    this.pool[key] = [];
  }

  this.pool[key].push(canvas);
  this.stats.released++;
  this.updatePooledCount();
  return true;
};

PS.render.surfaceRender.canvases.reset = function () {
  this.pool = {};
  this.stats.pooled = 0;
};

PS.render.surfaceRender.canvases.getStats = function () {
  this.updatePooledCount();
  return {
    created: this.stats.created,
    reused: this.stats.reused,
    released: this.stats.released,
    domCreated: this.stats.domCreated,
    offscreenCreated: this.stats.offscreenCreated,
    pooled: this.stats.pooled
  };
};
