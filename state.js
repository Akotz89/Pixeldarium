const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const eraText = document.getElementById("era");
const populationText = document.getElementById("population");
const foodText = document.getElementById("food");

const pauseButton = document.getElementById("pause-button");
const stepButton = document.getElementById("step-button");
const speedDownButton = document.getElementById("speed-down-button");
const speedUpButton = document.getElementById("speed-up-button");
const restartButton = document.getElementById("restart-button");
const speedLabel = document.getElementById("speed-label");
const tuningToggle = document.getElementById("tuning-toggle");
const tuningControls = document.getElementById("tuning-controls");
const speedTune = document.getElementById("speed-tune");
const speedTuneValue = document.getElementById("speed-tune-value");
const organismSizeTune = document.getElementById("organism-size-tune");
const organismSizeValue = document.getElementById("organism-size-value");
const foodSizeTune = document.getElementById("food-size-tune");
const foodSizeValue = document.getElementById("food-size-value");
const foodTargetTune = document.getElementById("food-target-tune");
const foodTargetValue = document.getElementById("food-target-value");

canvas.width = CONFIG.CANVAS_WIDTH;
canvas.height = CONFIG.CANVAS_HEIGHT;

const WORLD_WIDTH = Math.floor(canvas.width / CONFIG.TILE_SIZE);
const WORLD_HEIGHT = Math.floor(canvas.height / CONFIG.TILE_SIZE);

const world = {
  tick: 0,
  era: "Organisms",
  organisms: [],
  food: [],
  terrain: [],
  fertileTiles: 0,
  isPaused: false,
  speed: CONFIG.SPEED_MIN,
  interpolation: 0,
  fps: 0,
  tps: 0,
  updateMs: 0,
  drawMs: 0,
  maxUpdateMs: 0,
  maxDrawMs: 0
};
