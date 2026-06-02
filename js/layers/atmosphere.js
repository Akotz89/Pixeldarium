PS.layers.atmosphere = PS.layers.register("atmosphere", {
  family: "planet",
  alwaysOn: true,
  watcherOutputs: ["overlays", "timeline", "inspect"],
  ensureState: function() {
    if (!world.atmosphere) {
      world.atmosphere = {
        ageTicks: 0,
        co2: 0.95,
        oxygen: 0,
        nitrogen: 0.05,
        methane: 0,
        waterVapor: 0,
        ozone: 0,
        temperatureBias: 0
      };
    }

    return world.atmosphere;
  },
  update: function(dt) {
    var state = this.ensureState();

    state.ageTicks += 1;
    state.lastDeltaMs = Math.max(0, Number(dt) || 0);
    return state;
  },
  getState: function() {
    return this.ensureState();
  }
});
