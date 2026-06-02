PS.layers = {
  entries: {},
  order: [],
  register: function(id, layer) {
    var layerId = String(id || "").trim();

    if (!layerId) {
      throw new Error("Layer id is required");
    }

    this.entries[layerId] = layer || {};

    if (this.order.indexOf(layerId) < 0) {
      this.order.push(layerId);
    }

    return this.entries[layerId];
  },
  get: function(id) {
    return this.entries[String(id || "")] || null;
  }
};
