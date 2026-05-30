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
  speed: 1
};