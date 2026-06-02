PS.debug = PS.debug || {};

PS.debug.performance = {
  visible: false,
  element: null,
  setup: function() {
    this.element = document.getElementById("debug-performance");
    this.render();
  },
  toggle: function() {
    this.visible = !this.visible;
    this.render();
    return this.visible;
  },
  render: function() {
    if (!this.element) {
      this.element = document.getElementById("debug-performance");
    }

    if (!this.element) {
      return;
    }

    this.element.hidden = !this.visible;
    this.element.textContent =
      "FPS " + world.fps.toFixed(1) +
      " | TPS " + world.tps.toFixed(1) +
      " | Update " + world.updateMs.toFixed(2) + "ms" +
      " | Draw " + world.drawMs.toFixed(2) + "ms" +
      " | Entities " + world.organisms.length + "/" + world.food.length +
      " | Memory " + this.getMemoryLabel();
  },
  getMemoryLabel: function() {
    if (!performance.memory) {
      return "-";
    }

    return Math.round(performance.memory.usedJSHeapSize / 1048576) + " MB";
  }
};
