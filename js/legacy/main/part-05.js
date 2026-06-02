
function toggleSimulationPaused() {
  return setSimulationPaused(!world.isPaused);
}

function setSimulationSpeed(speed) {
  var nextSpeed = clamp(Math.round(Number(speed) || world.speed), 1, 10);

  if (world.speed === nextSpeed) {
    return false;
  }

  world.speed = nextSpeed;
  return true;
}

function adjustSimulationSpeed(delta) {
  return setSimulationSpeed(world.speed + Math.round(Number(delta) || 0));
}

function stepSimulationOnce() {
  if (!world.isPaused || world.isExtinct) {
    return false;
  }

  var updateStart = performance.now();
  updateWorld(PS.time.dt);
  world.updateMs = performance.now() - updateStart;
  world.maxUpdateMs = Math.max(world.maxUpdateMs, world.updateMs);
  world.interpolation = 1;

  var drawStart = performance.now();
  drawWorld();
  world.drawMs = performance.now() - drawStart;
  world.maxDrawMs = Math.max(world.maxDrawMs, world.drawMs);

  updateHud();
  return true;
}

var lastFrameTime = performance.now();
var statsTimer = performance.now();
var hudTimer = performance.now();
var framesSinceStatsUpdate = 0;
var simTicksSinceStatsUpdate = 0;
var updateMsSinceStatsUpdate = 0;
var drawMsSinceStatsUpdate = 0;
var measuredUpdateFrames = 0;
var measuredDrawFrames = 0;
var maxUpdateMsSinceStatsUpdate = 0;
var maxDrawMsSinceStatsUpdate = 0;

function gameLoop() {
  try {
    var now = performance.now();
    var frameElapsed = Math.min(250, Math.max(0, now - lastFrameTime));
    lastFrameTime = now;
    framesSinceStatsUpdate++;

    if (!world.isPaused) {
      var timeFrame = PS.time.runFrame(frameElapsed, updateWorld);

      if (timeFrame.ticks > 0) {
        updateMsSinceStatsUpdate += timeFrame.updateMs;
        measuredUpdateFrames++;

        if (timeFrame.updateMs > maxUpdateMsSinceStatsUpdate) {
          maxUpdateMsSinceStatsUpdate = timeFrame.updateMs;
        }

        simTicksSinceStatsUpdate += timeFrame.ticks;
      }

      world.interpolation = timeFrame.interpolation;
    } else {
      PS.time.accumulator = 0;
      world.interpolation = 0;
    }

    if (!world.isPaused || world.needsRender) {
      var drawStart = performance.now();
      drawWorld();
      world.needsRender = false;
      var drawElapsed = performance.now() - drawStart;
      drawMsSinceStatsUpdate += drawElapsed;
      measuredDrawFrames++;

      if (drawElapsed > maxDrawMsSinceStatsUpdate) {
        maxDrawMsSinceStatsUpdate = drawElapsed;
      }
    }

    var statsElapsed = now - statsTimer;

    if (statsElapsed >= 500) {
      world.fps = framesSinceStatsUpdate / (statsElapsed / 1000);
      world.tps = simTicksSinceStatsUpdate / (statsElapsed / 1000);
      world.updateMs = measuredUpdateFrames > 0 ? updateMsSinceStatsUpdate / measuredUpdateFrames : 0;
      world.drawMs = measuredDrawFrames > 0 ? drawMsSinceStatsUpdate / measuredDrawFrames : 0;
      world.maxUpdateMs = maxUpdateMsSinceStatsUpdate;
      world.maxDrawMs = maxDrawMsSinceStatsUpdate;

      framesSinceStatsUpdate = 0;
      simTicksSinceStatsUpdate = 0;
      updateMsSinceStatsUpdate = 0;
      drawMsSinceStatsUpdate = 0;
      measuredUpdateFrames = 0;
      measuredDrawFrames = 0;
      maxUpdateMsSinceStatsUpdate = 0;
      maxDrawMsSinceStatsUpdate = 0;
      statsTimer = now;
    }

    if (now - hudTimer >= CONFIG.HUD_UPDATE_INTERVAL_MS) {
      updateHud();
      hudTimer = now;
    }

    requestAnimationFrame(gameLoop);
  } catch (error) {
    reportRuntimeError(error);
  }
}

function startGame() {
  try {
    setupControls();
    seedWorld();
    PS.time.reset();
    drawWorld();
    updateHud();
    syncControlStates();
    requestAnimationFrame(gameLoop);
  } catch (error) {
    reportRuntimeError(error);
  }
}

window.startGame = startGame;
