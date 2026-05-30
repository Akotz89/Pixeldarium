function updateHud() {
  var fertilePercent = Math.round(
    (world.fertileTiles / (WORLD_WIDTH * WORLD_HEIGHT)) * 100
  );

  eraText.textContent = "ERA: " + world.era;
  populationText.textContent = "POPULATION: " + world.organisms.length;
  foodText.textContent =
    "TICK: " + world.tick +
    "   FOOD: " + world.food.length +
    "   FERTILE: " + fertilePercent + "%" +
    "   FPS: " + world.fps.toFixed(1) +
    "   TPS: " + world.tps.toFixed(1);

  speedLabel.textContent = "Speed: " + world.speed + "x";
}

window.setupControls = function() {
  pauseButton.addEventListener("click", function() {
    world.isPaused = !world.isPaused;
    pauseButton.textContent = world.isPaused ? "Resume" : "Pause";
  });

  stepButton.addEventListener("click", function() {
    if (world.isPaused) {
      updateWorld();
      world.interpolation = 1;
      drawWorld();
      updateHud();
    }
  });

  speedDownButton.addEventListener("click", function() {
    world.speed = Math.max(1, world.speed - 1);
    updateHud();
  });

  speedUpButton.addEventListener("click", function() {
    world.speed = Math.min(10, world.speed + 1);
    updateHud();
  });

  restartButton.addEventListener("click", function() {
    seedWorld();
    drawWorld();
    updateHud();
  });
};