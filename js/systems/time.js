PS.systems = PS.systems || {};

PS.time = {
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
  }
};

PS.systems.time = PS.time;
