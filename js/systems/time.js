PS.systems = PS.systems || {};

PS.time = {
  accumulator: 0,
  dt: CONFIG.SIM_UPDATE_INTERVAL_MS || 1000 / 30,
  maxTicksPerFrame: CONFIG.MAX_SIM_UPDATES_PER_FRAME || 4,
  lastFrame: {
    elapsedMs: 0,
    scaledElapsedMs: 0,
    ticks: 0,
    interpolation: 0,
    updateMs: 0,
    droppedMs: 0
  },
  get tick() {
    return world.tick;
  },
  get speed() {
    return world.speed;
  },
  setPaused: function(isPaused) {
    if (typeof setSimulationPaused === "function") {
      return setSimulationPaused(isPaused);
    }

    world.isPaused = Boolean(isPaused);
    return world.isPaused;
  },
  togglePaused: function() {
    return typeof toggleSimulationPaused === "function" ? toggleSimulationPaused() : this.setPaused(!world.isPaused);
  },
  setSpeed: function(speed) {
    return typeof setSimulationSpeed === "function" ? setSimulationSpeed(speed) : null;
  },
  stepOnce: function() {
    return typeof stepSimulationOnce === "function" ? stepSimulationOnce() : null;
  },
  updateWorld: function() {
    return typeof updateWorld === "function" ? updateWorld() : null;
  },
  reset: function() {
    this.accumulator = 0;
    this.dt = Math.max(1, Number(PS.config.sim.fixedDeltaMs) || 1000 / 30);
    this.maxTicksPerFrame = Math.max(1, Math.round(Number(PS.config.sim.maxUpdatesPerFrame) || 4));
    this.lastFrame = {
      elapsedMs: 0,
      scaledElapsedMs: 0,
      ticks: 0,
      interpolation: 0,
      updateMs: 0,
      droppedMs: 0
    };
  },
  getSpeedScale: function() {
    return Math.max(0, Number(world.speed) || 0) * Math.max(0, Number(CONFIG.SIM_SPEED_MULTIPLIER) || 1);
  },
  runFrame: function(elapsedMs, simulateTick) {
    var frameElapsed = Math.min(250, Math.max(0, Number(elapsedMs) || 0));
    var scaledElapsed = frameElapsed * this.getSpeedScale();
    var updateStart = performance.now();
    var ticks = 0;
    var droppedMs = 0;

    this.dt = Math.max(1, Number(PS.config.sim.fixedDeltaMs) || this.dt || 1000 / 30);
    this.maxTicksPerFrame = Math.max(1, Math.round(Number(PS.config.sim.maxUpdatesPerFrame) || this.maxTicksPerFrame || 4));
    this.accumulator += scaledElapsed;

    while (this.accumulator >= this.dt && ticks < this.maxTicksPerFrame) {
      simulateTick(this.dt);
      this.accumulator -= this.dt;
      ticks++;
    }

    if (ticks >= this.maxTicksPerFrame && this.accumulator > this.dt) {
      droppedMs = this.accumulator - this.dt;
      this.accumulator = this.dt;
    }

    var interpolation = this.dt > 0 ? Math.min(this.accumulator / this.dt, 1) : 0;
    var updateMs = ticks > 0 ? performance.now() - updateStart : 0;

    this.lastFrame = {
      elapsedMs: frameElapsed,
      scaledElapsedMs: scaledElapsed,
      ticks: ticks,
      interpolation: interpolation,
      updateMs: updateMs,
      droppedMs: droppedMs
    };

    return this.lastFrame;
  }
};

PS.systems.time = PS.time;
