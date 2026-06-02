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
      "Render FPS " + world.fps.toFixed(1) +
      " | Sim TPS " + world.tps.toFixed(1) +
      " | Update " + world.updateMs.toFixed(2) + "ms" +
      " | Draw " + world.drawMs.toFixed(2) + "ms" +
      " | Entities " + world.organisms.length + "/" + world.food.length +
      " | Memory " + this.getMemoryLabel() +
      " | Pools " + this.getPoolLabel();
  },
  getMemoryLabel: function() {
    var budget = PS.config && PS.config.pools ? PS.config.pools.memoryBudgetMb : 0;

    if (performance.memory) {
      return Math.round(performance.memory.usedJSHeapSize / 1048576) + "/" + budget + " MB";
    }

    return this.getEstimatedMemoryMb() + "/" + budget + " MB est";
  },
  getEstimatedMemoryMb: function() {
    var poolStats = PS.pools && typeof PS.pools.getStats === "function" ? PS.pools.getStats() : null;
    var pooledBytes = poolStats ? (
      poolStats.organismCapacity * poolStats.organismArrayCount * 4 +
      poolStats.foodCapacity * 40
    ) : 0;

    return Math.max(1, Math.round(pooledBytes / 1048576));
  },
  getPoolLabel: function() {
    if (!PS.pools || typeof PS.pools.getStats !== "function") {
      return "-";
    }

    var stats = PS.pools.getStats();
    return "org " + stats.activeOrganisms + "/" + stats.organismCapacity +
      " food " + stats.activeFood + "/" + stats.foodCapacity;
  }
};
