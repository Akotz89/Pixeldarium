PS.ui = PS.ui || {};
PS.render = PS.render || {};
PS.render.observationOverlays = PS.render.observationOverlays || {
  ids: [
    "observation.temperature",
    "observation.population",
    "observation.resources",
    "observation.atmosphere",
    "observation.microbial"
  ],
  getActiveId: function () {
    return world.activeObservationOverlay || "none";
  },
  setActive: function (id) {
    var nextId = String(id || "none");

    if (nextId !== "none" && this.ids.indexOf(nextId) < 0) {
      nextId = "none";
    }

    world.activeObservationOverlay = nextId;
    world.needsRender = true;
    return nextId;
  },
  cycle: function () {
    var options = ["none"].concat(this.ids);
    var currentIndex = options.indexOf(this.getActiveId());
    var nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % options.length;

    return this.setActive(options[nextIndex]);
  }
};

PS.ui.observationOverlays = {
  setup: function() {
    for (var i = 0; i < observationOverlayButtons.length; i++) {
      observationOverlayButtons[i].addEventListener("click", function(event) {
        PS.render.observationOverlays.setActive(
          event.currentTarget.getAttribute("data-observation-overlay")
        );
        PS.ui.observationOverlays.sync();
      });
    }

    this.sync();
  },
  sync: function() {
    var activeId = PS.render.observationOverlays.getActiveId();
    var activeOverlay = PS.render.overlays && typeof PS.render.overlays.get === "function"
      ? PS.render.overlays.get(activeId)
      : null;
    var stats = world.overlayPerformance || {};
    var label = activeOverlay ? activeOverlay.semantic : "None";
    var detail = activeOverlay
      ? " / " + (stats.compositor || "canvas") +
        " / " + (stats.blendMode || activeOverlay.blendMode || "source-over") +
        " / " + (Number(stats.lastFrameMs) || 0).toFixed(2) + "ms" +
        " / " + Math.max(0, Number(stats.lastSampleCount) || 0) + " samples"
      : "";

    for (var i = 0; i < observationOverlayButtons.length; i++) {
      var button = observationOverlayButtons[i];
      var isActive = button.getAttribute("data-observation-overlay") === activeId;

      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.className = isActive ? "active" : "";
    }

    setElementText(observationOverlayStatus, "OVERLAY: " + label + detail);
  },
  cycle: function() {
    var activeId = PS.render.observationOverlays.cycle();

    this.sync();
    return activeId;
  }
};
