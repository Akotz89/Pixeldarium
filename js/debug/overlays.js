PS.debug = PS.debug || {};

PS.debug.overlays = {
  visible: false,
  element: null,
  setup: function() {
    this.element = document.getElementById("debug-overlays");
    this.render();
  },
  toggle: function() {
    this.visible = !this.visible;
    world.needsRender = true;
    this.render();
    return this.visible;
  },
  render: function() {
    if (!this.element) {
      this.element = document.getElementById("debug-overlays");
    }

    if (!this.element) {
      return;
    }

    this.element.hidden = !this.visible;
    this.element.textContent =
      "Overlays | food buckets " + Object.keys(world.foodBuckets || {}).length +
      " | organism buckets " + Object.keys(world.organismBuckets || {}).length +
      " | settlement buckets " + Object.keys(world.settlementBuckets || {}).length;
  }
};
