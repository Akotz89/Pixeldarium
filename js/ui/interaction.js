
function getInspectSurfacePosition(tileX, tileY) {
  var surfacePosition = world.inspectedSurface;

  if (
    surfacePosition &&
    Number.isFinite(Number(surfacePosition.latitude)) &&
    Number.isFinite(Number(surfacePosition.longitude))
  ) {
    var surfaceTile = getTileFromLatLon(surfacePosition.latitude, surfacePosition.longitude);

    if (surfaceTile.x === tileX && surfaceTile.y === tileY) {
      return {
        latitude: clamp(Number(surfacePosition.latitude), -90, 90),
        longitude: normalizeLongitude(surfacePosition.longitude)
      };
    }
  }

  return null;
}

function getInspectSurfacePositionLabel(tileX, tileY) {
  var surfacePosition = getInspectSurfacePosition(tileX, tileY);

  if (!surfacePosition) {
    return "-";
  }

  return surfacePosition.latitude.toFixed(5) + " / " + surfacePosition.longitude.toFixed(5);
}

var planetDragState = {
  active: false,
  moved: false,
  skipNextClick: false,
  lastClientX: 0,
  lastClientY: 0,
  velocityX: 0,
  velocityY: 0,
  lastMoveTime: 0,
  inertiaHandle: null
};
var cameraInteractionTimer = null;

function markCameraInteracting() {
  world.isCameraInteracting = true;

  if (cameraInteractionTimer !== null && typeof window.clearTimeout === "function") {
    window.clearTimeout(cameraInteractionTimer);
  }

  if (typeof window.setTimeout === "function") {
    cameraInteractionTimer = window.setTimeout(function() {
      world.isCameraInteracting = false;
      cameraInteractionTimer = null;
      invalidateTerrainCache();
      world.needsRender = true;
    }, Math.max(40, Number(CONFIG.PLANET_CAMERA_INTERACTION_SETTLE_MS) || 140));
  }
}

function getCanvasPointFromEvent(event) {
  return getCanvasPointFromClient(event.clientX, event.clientY);
}

function getCanvasPointFromClient(clientX, clientY) {
  return PS.camera && PS.camera.unified
    ? PS.camera.unified.clientToScreen(clientX, clientY)
    : { canvasX: Number(clientX) || 0, canvasY: Number(clientY) || 0 };
}

function getTileFromCanvasEvent(event) {
  var point = getCanvasPointFromEvent(event);
  var planetTile = typeof getPlanetTileFromCanvasPoint === "function"
    ? getPlanetTileFromCanvasPoint(point.canvasX, point.canvasY)
    : null;

  if (planetTile) {
    return planetTile;
  }

  return {
    x: clamp(Math.floor(point.canvasX / CONFIG.TILE_SIZE), 0, WORLD_WIDTH - 1),
    y: clamp(Math.floor(point.canvasY / CONFIG.TILE_SIZE), 0, WORLD_HEIGHT - 1)
  };
}

function getSurfacePositionFromCanvasEvent(event) {
  if (typeof getPlanetLatLonFromCanvasPoint !== "function") {
    return null;
  }

  var point = getCanvasPointFromEvent(event);
  return getPlanetLatLonFromCanvasPoint(point.canvasX, point.canvasY);
}

function getInspectableEntityFromTile(tileX, tileY) {
  var settlement = getNearestSettlementToTile(tileX, tileY);
  var organism = getNearestOrganismToTile(tileX, tileY);

  if (settlement && Math.abs(settlement.x - tileX) + Math.abs(settlement.y - tileY) <= 1) {
    return {
      type: settlement.isColony ? "colony" : (settlement.isOutpost ? "outpost" : "settlement"),
      id: settlement.id,
      lineageId: settlement.lineageId,
      x: settlement.x,
      y: settlement.y
    };
  }

  if (organism && Math.abs(organism.x - tileX) + Math.abs(organism.y - tileY) <= 1) {
    var representative = PS.sim.representatives && PS.sim.representatives.syncOrganism
      ? PS.sim.representatives.syncOrganism(organism, { selected: true })
      : null;

    return {
      type: "organism",
      lineageId: ensureOrganismLineage(organism),
      speciesId: organism.speciesId,
      populationId: organism.populationId,
      representativeId: organism.representativeId,
      pinned: representative ? representative.pinned : false,
      bookmarkScore: representative ? representative.bookmarkScore : 0,
      generation: organism.generation,
      energy: organism.energy,
      x: organism.x,
      y: organism.y
    };
  }

  if (foodExistsAt(tileX, tileY)) {
    return {
      type: "food",
      x: tileX,
      y: tileY
    };
  }

  return null;
}

function inspectTile(tileX, tileY, shouldFocus, surfacePosition, inspectedEntity) {
  world.inspectedTile = {
    x: clamp(tileX, 0, WORLD_WIDTH - 1),
    y: clamp(tileY, 0, WORLD_HEIGHT - 1)
  };
  world.inspectedSurface = surfacePosition || null;
  world.inspectedEntity = inspectedEntity || getInspectableEntityFromTile(world.inspectedTile.x, world.inspectedTile.y);

  if (
    world.inspectedEntity &&
    world.inspectedEntity.representativeId &&
    PS.sim.representatives &&
    PS.sim.representatives.select
  ) {
    PS.sim.representatives.select(world.inspectedEntity.representativeId);
  }

  if (shouldFocus !== false && !isPlanetLocalView()) {
    focusPlanetViewOnTile(world.inspectedTile.x, world.inspectedTile.y);
  }

  world.needsRender = true;
  updateHud();
}

function zoomPlanetView(delta, anchorPoint) {
  markCameraInteracting();

  var didZoom = anchorPoint && typeof adjustPlanetZoomAtCanvasPoint === "function"
    ? adjustPlanetZoomAtCanvasPoint(delta, anchorPoint.canvasX, anchorPoint.canvasY)
    : adjustPlanetZoom(delta);

  if (!didZoom) {
    return false;
  }

  world.needsRender = true;
  return true;
}

function redrawPlanetView() {
  world.needsRender = true;
}

function beginPlanetDrag(event) {
  if (typeof event.button === "number" && event.button !== 0) {
    return;
  }

  if (PS.ui.touch.track(event) && PS.ui.touch.beginIfReady()) {
    if (typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    return;
  }

  planetDragState.active = true;
  planetDragState.moved = false;
  planetDragState.lastClientX = Number(event.clientX) || 0;
  planetDragState.lastClientY = Number(event.clientY) || 0;
  planetDragState.velocityX = 0;
  planetDragState.velocityY = 0;
  planetDragState.lastMoveTime = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  canvas.classList.add("dragging");

  if (planetDragState.inertiaHandle !== null && typeof window.cancelAnimationFrame === "function") {
    window.cancelAnimationFrame(planetDragState.inertiaHandle);
    planetDragState.inertiaHandle = null;
  }

  if (typeof canvas.setPointerCapture === "function" && typeof event.pointerId !== "undefined") {
    canvas.setPointerCapture(event.pointerId);
  }
}

function updatePlanetDrag(event) {
  if (PS.ui.touch.update(event)) {
    return;
  }

  if (!planetDragState.active) {
    return;
  }

  var clientX = Number(event.clientX) || 0;
  var clientY = Number(event.clientY) || 0;
  var now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  var deltaX = clientX - planetDragState.lastClientX;
  var deltaY = clientY - planetDragState.lastClientY;
  var elapsed = Math.max(1, now - planetDragState.lastMoveTime);

  if (deltaX === 0 && deltaY === 0) {
    return;
  }

  planetDragState.lastClientX = clientX;
  planetDragState.lastClientY = clientY;
  planetDragState.lastMoveTime = now;
  planetDragState.velocityX = deltaX / elapsed * 16;
  planetDragState.velocityY = deltaY / elapsed * 16;

  if (Math.abs(deltaX) + Math.abs(deltaY) > 2) {
    planetDragState.moved = true;
  }

  if (typeof panPlanetViewByScreenDelta === "function") {
    markCameraInteracting();
    panPlanetViewByScreenDelta(deltaX, deltaY);
    redrawPlanetView();
  }

  if (typeof event.preventDefault === "function") {
    event.preventDefault();
  }
}

function continuePlanetDragInertia() {
  var velocityX = planetDragState.velocityX * 0.86;
  var velocityY = planetDragState.velocityY * 0.86;

  planetDragState.velocityX = velocityX;
  planetDragState.velocityY = velocityY;

  if (Math.abs(velocityX) + Math.abs(velocityY) < 0.35 || planetDragState.active) {
    planetDragState.inertiaHandle = null;
    return;
  }

  if (typeof panPlanetViewByScreenDelta === "function") {
    markCameraInteracting();
    panPlanetViewByScreenDelta(velocityX, velocityY);
    redrawPlanetView();
  }

  if (typeof window.requestAnimationFrame === "function") {
    planetDragState.inertiaHandle = window.requestAnimationFrame(continuePlanetDragInertia);
  } else {
    planetDragState.inertiaHandle = null;
  }
}

function endPlanetDrag(event) {
  if (PS.ui.touch.end(event)) {
    if (!planetDragState.active) {
      return;
    }
  }

  if (!planetDragState.active) {
    return;
  }

  planetDragState.active = false;
  planetDragState.skipNextClick = planetDragState.moved;
  canvas.classList.remove("dragging");

  if (typeof canvas.releasePointerCapture === "function" && event && typeof event.pointerId !== "undefined") {
    canvas.releasePointerCapture(event.pointerId);
  }

  if (
    planetDragState.moved &&
    Math.abs(planetDragState.velocityX) + Math.abs(planetDragState.velocityY) >= 0.65 &&
    typeof window.requestAnimationFrame === "function"
  ) {
    planetDragState.inertiaHandle = window.requestAnimationFrame(continuePlanetDragInertia);
  }
}

function panPlanetViewFromKeyboard(eastSamples, northSamples) {
  if (typeof panPlanetViewBySamples !== "function") {
    return false;
  }

  panPlanetViewBySamples(eastSamples, northSamples);
  markCameraInteracting();
  redrawPlanetView();
  return true;
}

function prepareTouchInput() {
  PS.ui.touch.prepare();
}

function setPersistenceStatus(message, isError) {
  setElementText(persistenceStatus, message);
  persistenceStatus.classList.toggle("error", Boolean(isError));
}

function restartSimulationFromControls() {
  applyTuningFromControls(false);
  seedWorld();
  drawWorld();
  updateHud();
  setPersistenceStatus("SAVE: Ready", false);
}

function requestRestartSimulationFromControls() {
  if (PS.ui && PS.ui.modal && typeof PS.ui.modal.confirm === "function") {
    return PS.ui.modal.confirm({
      title: "Restart simulation",
      message: "Restart with the current tuning and seed settings?",
      confirmLabel: "Restart",
      cancelLabel: "Cancel"
    }).then(function(confirmed) {
      if (confirmed) {
        restartSimulationFromControls();
      }

      return confirmed;
    });
  }

  restartSimulationFromControls();
  return Promise.resolve(true);
}

function registerSimulationInputActions() {
  if (!PS.input) {
    return false;
  }

  if (typeof PS.input.clearHandlers === "function") {
    PS.input.clearHandlers();
  }

  PS.input.on("pointer_down", function(event) {
    beginPlanetDrag(event);
    return true;
  });
  PS.input.on("pointer_move", function(event) {
    updatePlanetDrag(event);
    return true;
  });
  PS.input.on("pointer_up", function(event) {
    endPlanetDrag(event);
    return true;
  });
  PS.input.on("pointer_cancel", function(event) {
    endPlanetDrag(event);
    return true;
  });
  PS.input.on("wheel_zoom", function(event) {
    if (typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    zoomPlanetView(event.deltaY < 0 ? 0.25 : -0.25, getCanvasPointFromEvent(event));
    return true;
  });
  PS.input.on("close_menu", function(event) {
    return setMenuOpen(false);
  });
  PS.input.on("toggle_performance", function(event) {
    if (shouldIgnoreSimulationShortcut(event.target) || !window.PS || !PS.debug || !PS.debug.performance) {
      return false;
    }

    PS.debug.performance.toggle();
    return true;
  });
  PS.input.on("toggle_overlays", function(event) {
    if (shouldIgnoreSimulationShortcut(event.target) || !window.PS || !PS.debug || !PS.debug.overlays) {
      return false;
    }

    PS.debug.overlays.toggle();
    return true;
  });
  PS.input.on("toggle_profiler", function(event) {
    if (shouldIgnoreSimulationShortcut(event.target) || !window.PS || !PS.debug || !PS.debug.profiler) {
      return false;
    }

    PS.debug.profiler.toggle();
    return true;
  });
  PS.input.on("toggle_console", function(event) {
    if (shouldIgnoreSimulationShortcut(event.target) || !window.PS || !PS.debug || !PS.debug.console) {
      return false;
    }

    PS.debug.console.toggle();
    return true;
  });
  PS.input.on("cycle_observation_overlay", function(event) {
    if (shouldIgnoreSimulationShortcut(event.target) || !window.PS || !PS.ui || !PS.ui.observationOverlays) {
      return false;
    }

    PS.ui.observationOverlays.cycle();
    return true;
  });
  PS.input.on("toggle_menu", function(event) {
    if (shouldIgnoreSimulationShortcut(event.target)) {
      return false;
    }

    toggleMenuOpen();
    return true;
  });
  PS.input.on("toggle_pause", function(event) {
    if (shouldIgnoreSimulationShortcut(event.target)) {
      return false;
    }

    toggleSimulationPaused();
    return true;
  });
  PS.input.on("step_once", function(event) {
    if (shouldIgnoreSimulationShortcut(event.target)) {
      return false;
    }

    stepSimulationOnce();
    return true;
  });
  PS.input.on("zoom_in_large", function(event) {
    if (shouldIgnoreSimulationShortcut(event.target)) {
      return false;
    }

    zoomPlanetView(1);
    return true;
  });
  PS.input.on("zoom_out_large", function(event) {
    if (shouldIgnoreSimulationShortcut(event.target)) {
      return false;
    }

    zoomPlanetView(-1);
    return true;
  });
  PS.input.on("zoom_in", function(event) {
    if (shouldIgnoreSimulationShortcut(event.target)) {
      return false;
    }

    zoomPlanetView(0.5);
    return true;
  });
  PS.input.on("zoom_out", function(event) {
    if (shouldIgnoreSimulationShortcut(event.target)) {
      return false;
    }

    zoomPlanetView(-0.5);
    return true;
  });
  PS.input.on("pan_up", function(event) {
    return shouldIgnoreSimulationShortcut(event.target) ? false : panPlanetViewFromKeyboard(0, 24);
  });
  PS.input.on("pan_down", function(event) {
    return shouldIgnoreSimulationShortcut(event.target) ? false : panPlanetViewFromKeyboard(0, -24);
  });
  PS.input.on("pan_left", function(event) {
    return shouldIgnoreSimulationShortcut(event.target) ? false : panPlanetViewFromKeyboard(-24, 0);
  });
  PS.input.on("pan_right", function(event) {
    return shouldIgnoreSimulationShortcut(event.target) ? false : panPlanetViewFromKeyboard(24, 0);
  });
  PS.input.on("restart", function(event) {
    if (shouldIgnoreSimulationShortcut(event.target)) {
      return false;
    }

    requestRestartSimulationFromControls();
    return true;
  });
  PS.input.on("menu_page_controls", function(event) {
    if (!world.isMenuOpen || shouldIgnoreSimulationShortcut(event.target)) {
      return false;
    }

    setMenuPage("controls");
    return true;
  });
  PS.input.on("menu_page_status", function(event) {
    if (!world.isMenuOpen || shouldIgnoreSimulationShortcut(event.target)) {
      return false;
    }

    setMenuPage("status");
    return true;
  });
  PS.input.on("menu_page_ecosystem", function(event) {
    if (!world.isMenuOpen || shouldIgnoreSimulationShortcut(event.target)) {
      return false;
    }

    setMenuPage("ecosystem");
    return true;
  });
  PS.input.on("menu_page_log", function(event) {
    if (!world.isMenuOpen || shouldIgnoreSimulationShortcut(event.target)) {
      return false;
    }

    setMenuPage("log");
    return true;
  });

  return true;
}

function shouldIgnoreSimulationShortcut(target) {
  if (!target) {
    return false;
  }

  var tagName = String(target.tagName || "").toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    tagName === "button" ||
    Boolean(target.isContentEditable)
  );
}

function handleSimulationShortcut(event) {
  var handled = PS.input && typeof PS.input.handleKeyDown === "function"
    ? PS.input.handleKeyDown(event)
    : false;

  if (handled && typeof event.preventDefault === "function") {
    event.preventDefault();
  }

  return handled;
}
