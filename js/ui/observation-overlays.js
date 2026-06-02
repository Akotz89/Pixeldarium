PS.ui = PS.ui || {};

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
    var activeOverlay = PS.render.overlays.get(activeId);
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
