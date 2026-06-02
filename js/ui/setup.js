
window.setupControls = function() {
  var tabButtons = menuTabs.querySelectorAll("[data-menu-target]");

  prepareTouchInput();

  for (var tabIndex = 0; tabIndex < tabButtons.length; tabIndex++) {
    tabButtons[tabIndex].addEventListener("click", function(event) {
      setMenuPage(event.currentTarget.getAttribute("data-menu-target"));
    });
  }

  menuToggleButton.addEventListener("click", function() {
    toggleMenuOpen();
  });

  menuBackdrop.addEventListener("click", function() {
    setMenuOpen(false);
  });

  canvas.addEventListener("pointerdown", beginPlanetDrag);
  window.addEventListener("pointermove", updatePlanetDrag);
  window.addEventListener("pointerup", endPlanetDrag);
  window.addEventListener("pointercancel", endPlanetDrag);

  canvas.addEventListener("click", function(event) {
    if (planetDragState.skipNextClick) {
      planetDragState.skipNextClick = false;
      return;
    }

    var surfacePosition = getSurfacePositionFromCanvasEvent(event);
    var tile = getTileFromCanvasEvent(event);
    var inspectedEntity = getInspectableEntityFromTile(tile.x, tile.y);

    if (event.shiftKey && window.PS && PS.debug && PS.debug.inspector) {
      PS.debug.inspector.inspect(tile.x, tile.y, surfacePosition);
    }

    inspectTile(tile.x, tile.y, !isPlanetLocalView(), surfacePosition, inspectedEntity);
  });

  canvas.addEventListener("wheel", function(event) {
    if (typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    var point = getCanvasPointFromEvent(event);
    zoomPlanetView(event.deltaY < 0 ? 0.25 : -0.25, point);
  }, { passive: false });

  pauseButton.addEventListener("click", function() {
    toggleSimulationPaused();
  });

  stepButton.addEventListener("click", function() {
    stepSimulationOnce();
  });

  speedDownButton.addEventListener("click", function() {
    if (adjustSimulationSpeed(-1)) {
      updateHud();
    }
  });

  speedUpButton.addEventListener("click", function() {
    if (adjustSimulationSpeed(1)) {
      updateHud();
    }
  });

  speedSlider.addEventListener("input", function() {
    applyTuningFromControls(false);
  });

  timeScaleSlider.addEventListener("input", function() {
    if (PS.time && typeof PS.time.setManualTimeScale === "function") {
      PS.time.setManualTimeScale(timeScaleSlider.value);
    }

    updateHud();
  });

  organismSizeSlider.addEventListener("input", function() {
    applyTuningFromControls(true);
  });

  foodSizeSlider.addEventListener("input", function() {
    applyTuningFromControls(true);
  });

  startingFoodSlider.addEventListener("input", function() {
    applyTuningFromControls(false);
  });

  foodGrowthSlider.addEventListener("input", function() {
    applyTuningFromControls(false);
  });

  seedInput.addEventListener("input", function() {
    world.seedText = seedInput.value;
  });

  seedInput.addEventListener("change", function() {
    world.seedText = normalizeSeedText(seedInput.value);
    syncTuningControls();
  });

  seedRandomButton.addEventListener("click", function() {
    world.seedText = "PIXEL-" + String(Date.now()).slice(-8);
    syncTuningControls();
  });

  syncControlStates();
  syncMenuState();
  syncMenuPage();

  restartButton.addEventListener("click", function() {
    restartSimulationFromControls();
  });

  document.addEventListener("keydown", handleSimulationShortcut);

  saveButton.addEventListener("click", function() {
    setPersistenceStatus("SAVE: Saving...", false);
    saveWorldToIndexedDB()
      .then(function(saveData) {
        setPersistenceStatus("SAVE: Saved tick " + saveData.tick, false);
      })
      .catch(function(error) {
        setPersistenceStatus("SAVE ERROR: " + error.message, true);
      });
  });

  loadButton.addEventListener("click", function() {
    setPersistenceStatus("SAVE: Loading...", false);
    loadWorldFromIndexedDB()
      .then(function(saveData) {
        setPersistenceStatus("SAVE: Loaded tick " + saveData.tick, false);
      })
      .catch(function(error) {
        setPersistenceStatus("LOAD ERROR: " + error.message, true);
      });
  });

  exportJsonButton.addEventListener("click", function() {
    try {
      var saveData = exportWorldToJsonFile();
      setPersistenceStatus("EXPORT: Downloaded tick " + saveData.tick, false);
    } catch (error) {
      setPersistenceStatus("EXPORT ERROR: " + error.message, true);
    }
  });

  importJsonButton.addEventListener("click", function() {
    importJsonFile.click();
  });

  importJsonFile.addEventListener("change", function() {
    var file = importJsonFile.files[0];

    setPersistenceStatus("IMPORT: Loading...", false);
    importWorldFromJsonFile(file)
      .then(function(saveData) {
        setPersistenceStatus("IMPORT: Loaded tick " + saveData.tick, false);
      })
      .catch(function(error) {
        setPersistenceStatus("IMPORT ERROR: " + error.message, true);
      })
      .finally(function() {
        importJsonFile.value = "";
      });
  });

  if (window.PS && PS.ui) {
    if (PS.ui.hud) {
      PS.ui.hud.setup();
    }

    if (PS.ui.panels) {
      PS.ui.panels.setup();
    }

    if (PS.ui.controls) {
      PS.ui.controls.setup();
    }

    if (PS.ui.notifications) {
      PS.ui.notifications.setup();
    }

    if (PS.ui.spotlight) {
      PS.ui.spotlight.setup();
    }

    if (PS.ui.observationOverlays) {
      PS.ui.observationOverlays.setup();
    }

    if (PS.ui.timeline) {
      PS.ui.timeline.setup();
    }
  }

  if (window.PS && PS.debug) {
    if (PS.debug.performance) {
      PS.debug.performance.setup();
    }

    if (PS.debug.console) {
      PS.debug.console.setup();
    }

    if (PS.debug.profiler) {
      PS.debug.profiler.setup();
    }

    if (PS.debug.overlays) {
      PS.debug.overlays.setup();
    }

    if (PS.debug.inspector) {
      PS.debug.inspector.setup();
    }
  }
};
