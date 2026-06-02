PS.layers.geology = PS.layers.register("geology", {
  family: "planet",
  alwaysOn: true,
  watcherOutputs: ["terrain", "overlays", "timeline", "inspect"],
  ensureState: function() {
    if (!world.geology) {
      world.geology = {
        ageTicks: 0,
        tectonicActivity: 0,
        volcanicActivity: 0,
        hydrothermalVents: 0,
        lastMilestoneTick: 0
      };
    }

    return world.geology;
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
