var planetTouchState = {
  pointers: {},
  activePinch: false,
  lastDistance: 0
};

function isTouchPointer(event) {
  return event && String(event.pointerType || "") === "touch";
}

function getActiveTouchPointers() {
  var touches = [];

  for (var pointerId in planetTouchState.pointers) {
    if (Object.prototype.hasOwnProperty.call(planetTouchState.pointers, pointerId)) {
      touches.push(planetTouchState.pointers[pointerId]);
    }
  }

  return touches;
}

function getTouchDistance(first, second) {
  var deltaX = second.clientX - first.clientX;
  var deltaY = second.clientY - first.clientY;
  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

function getTouchMidpoint(first, second) {
  return getCanvasPointFromClient(
    (first.clientX + second.clientX) / 2,
    (first.clientY + second.clientY) / 2
  );
}

function stopPlanetDragForPinch() {
  if (planetDragState.inertiaHandle !== null && typeof window.cancelAnimationFrame === "function") {
    window.cancelAnimationFrame(planetDragState.inertiaHandle);
    planetDragState.inertiaHandle = null;
  }

  planetDragState.active = false;
  planetDragState.moved = true;
  planetDragState.skipNextClick = true;
  planetDragState.velocityX = 0;
  planetDragState.velocityY = 0;
  canvas.classList.remove("dragging");
}

function beginPlanetPinchIfReady() {
  var touches = getActiveTouchPointers();

  if (touches.length < 2) {
    return false;
  }

  planetTouchState.activePinch = true;
  planetTouchState.lastDistance = Math.max(1, getTouchDistance(touches[0], touches[1]));
  stopPlanetDragForPinch();
  markCameraInteracting();
  return true;
}

function trackTouchPointer(event) {
  if (!isTouchPointer(event) || typeof event.pointerId === "undefined") {
    return false;
  }

  planetTouchState.pointers[event.pointerId] = {
    clientX: Number(event.clientX) || 0,
    clientY: Number(event.clientY) || 0
  };
  return true;
}

function updatePlanetPinch(event) {
  if (!trackTouchPointer(event) || !planetTouchState.activePinch) {
    return false;
  }

  var touches = getActiveTouchPointers();

  if (touches.length < 2) {
    return false;
  }

  var distance = Math.max(1, getTouchDistance(touches[0], touches[1]));
  var previousDistance = Math.max(1, planetTouchState.lastDistance || distance);
  var ratio = distance / previousDistance;
  var delta = clamp(Math.log(ratio) * 1.4, -0.35, 0.35);

  planetTouchState.lastDistance = distance;
  planetDragState.skipNextClick = true;

  if (Math.abs(delta) > 0.001) {
    zoomPlanetView(delta, getTouchMidpoint(touches[0], touches[1]));
  }

  if (typeof event.preventDefault === "function") {
    event.preventDefault();
  }

  return true;
}

function endTouchPointer(event) {
  if (!isTouchPointer(event) || typeof event.pointerId === "undefined") {
    return false;
  }

  delete planetTouchState.pointers[event.pointerId];

  if (planetTouchState.activePinch) {
    planetDragState.skipNextClick = true;
  }

  if (getActiveTouchPointers().length < 2) {
    planetTouchState.activePinch = false;
    planetTouchState.lastDistance = 0;
  }

  return true;
}
