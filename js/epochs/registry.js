PS.epochs = {
  entries: {},
  order: [],
  current: function() {
    return world.era;
  },
  register: function(id, definition) {
    var epochId = String(id || "").trim();

    if (!epochId) {
      throw new Error("Epoch id is required");
    }

    this.entries[epochId] = definition || {};

    if (this.order.indexOf(epochId) < 0) {
      this.order.push(epochId);
    }

    return this.entries[epochId];
  },
  get: function(id) {
    return this.entries[String(id || "")] || null;
  },
  detectTransition: function() {
    return world.era;
  },
  setEra: function(era) {
    world.era = String(era || world.era || "Organisms");
    return world.era;
  }
};
