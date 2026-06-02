PS.debug = PS.debug || {};

PS.debug.profiler = {
  visible: false,
  element: null,
  setup: function() {
    this.element = document.getElementById("debug-profiler");
    this.render();
  },
  toggle: function() {
    this.visible = !this.visible;
    this.render();
    return this.visible;
  },
  render: function() {
    if (!this.element) {
      this.element = document.getElementById("debug-profiler");
    }

    if (!this.element) {
      return;
    }

    this.element.hidden = !this.visible;
    this.element.textContent =
      "Profiler | sim " + world.updateMs.toFixed(2) + "ms" +
      " | render " + world.drawMs.toFixed(2) + "ms" +
      " | max " + world.maxUpdateMs.toFixed(2) + "/" + world.maxDrawMs.toFixed(2) + "ms";
  }
};
