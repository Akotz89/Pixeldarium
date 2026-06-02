
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
  var rect = canvas.getBoundingClientRect();

  return {
    canvasX: (event.clientX - rect.left) * (canvas.width / rect.width),
    canvasY: (event.clientY - rect.top) * (canvas.height / rect.height)
  };
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
    return {
      type: "organism",
      lineageId: ensureOrganismLineage(organism),
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
  if (canvas && canvas.style) {
    canvas.style.touchAction = "none";
  }
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
  var key = String(event.key || "");
  var code = String(event.code || "");
  var handled = false;

  if (code === "Escape" || key === "Escape") {
    handled = setMenuOpen(false);
  } else if (!shouldIgnoreSimulationShortcut(event.target) && code === "F3" && window.PS && PS.debug && PS.debug.performance) {
    handled = true;
    PS.debug.performance.toggle();
  } else if (!shouldIgnoreSimulationShortcut(event.target) && code === "F4" && window.PS && PS.debug && PS.debug.overlays) {
    handled = true;
    PS.debug.overlays.toggle();
  } else if (!shouldIgnoreSimulationShortcut(event.target) && code === "F5" && window.PS && PS.debug && PS.debug.profiler) {
    handled = true;
    PS.debug.profiler.toggle();
  } else if (!shouldIgnoreSimulationShortcut(event.target) && (code === "Backquote" || key === "`") && window.PS && PS.debug && PS.debug.console) {
    handled = true;
    PS.debug.console.toggle();
  } else if (!shouldIgnoreSimulationShortcut(event.target) && (code === "KeyM" || key.toLowerCase() === "m")) {
    handled = true;
    toggleMenuOpen();
  } else if (shouldIgnoreSimulationShortcut(event.target)) {
    return;
  } else if (code === "Space" || key === " ") {
    handled = true;
    toggleSimulationPaused();
  } else if (code === "KeyN" || key.toLowerCase() === "n") {
    handled = true;
    stepSimulationOnce();
  } else if (code === "BracketRight" || key === "]") {
    handled = true;
    zoomPlanetView(1);
  } else if (code === "BracketLeft" || key === "[") {
    handled = true;
    zoomPlanetView(-1);
  } else if (code === "ArrowUp") {
    handled = panPlanetViewFromKeyboard(0, 24);
  } else if (code === "ArrowDown") {
    handled = panPlanetViewFromKeyboard(0, -24);
  } else if (code === "ArrowLeft") {
    handled = panPlanetViewFromKeyboard(-24, 0);
  } else if (code === "ArrowRight") {
    handled = panPlanetViewFromKeyboard(24, 0);
  } else if (code === "Equal" || code === "NumpadAdd" || key === "+" || key === "=") {
    handled = true;
    zoomPlanetView(0.5);
  } else if (code === "Minus" || code === "NumpadSubtract" || key === "-" || key === "_") {
    handled = true;
    zoomPlanetView(-0.5);
  } else if (code === "KeyR" || key.toLowerCase() === "r") {
    handled = true;
    restartSimulationFromControls();
  } else if (world.isMenuOpen && code === "Digit1") {
    handled = true;
    setMenuPage("controls");
  } else if (world.isMenuOpen && code === "Digit2") {
    handled = true;
    setMenuPage("status");
  } else if (world.isMenuOpen && code === "Digit3") {
    handled = true;
    setMenuPage("ecosystem");
  } else if (world.isMenuOpen && code === "Digit4") {
    handled = true;
    setMenuPage("log");
  }

  if (handled && typeof event.preventDefault === "function") {
    event.preventDefault();
  }
}
