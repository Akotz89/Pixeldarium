const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const eraText = document.getElementById("era");
const populationText = document.getElementById("population");
const foodText = document.getElementById("food");
const inspectSummaryText = document.getElementById("inspect-summary");
const inspectDetailsText = document.getElementById("inspect-details");
const traitSummaryText = document.getElementById("trait-summary");
const lineageSummaryText = document.getElementById("lineage-summary");
const settlementSummaryText = document.getElementById("settlement-summary");
const traitHistoryCanvas = document.getElementById("trait-history");
const traitHistoryCtx = traitHistoryCanvas.getContext("2d", { willReadFrequently: true });

const pauseButton = document.getElementById("pause-button");
const stepButton = document.getElementById("step-button");
const speedDownButton = document.getElementById("speed-down-button");
const speedUpButton = document.getElementById("speed-up-button");
const restartButton = document.getElementById("restart-button");
const saveButton = document.getElementById("save-button");
const loadButton = document.getElementById("load-button");
const exportJsonButton = document.getElementById("export-json-button");
const importJsonButton = document.getElementById("import-json-button");
const importJsonFile = document.getElementById("import-json-file");
const speedLabel = document.getElementById("speed-label");
const persistenceStatus = document.getElementById("persistence-status");
const speedSlider = document.getElementById("speed-slider");
const speedValue = document.getElementById("speed-value");
const organismSizeSlider = document.getElementById("organism-size-slider");
const organismSizeValue = document.getElementById("organism-size-value");
const foodSizeSlider = document.getElementById("food-size-slider");
const foodSizeValue = document.getElementById("food-size-value");
const startingFoodSlider = document.getElementById("starting-food-slider");
const startingFoodValue = document.getElementById("starting-food-value");
const foodGrowthSlider = document.getElementById("food-growth-slider");
const foodGrowthValue = document.getElementById("food-growth-value");

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
  speed: 1,
  interpolation: 0,
  fps: 0,
  tps: 0,
  updateMs: 0,
  drawMs: 0,
  maxUpdateMs: 0,
  maxDrawMs: 0,
  inspectedTile: null,
  traitHistory: [],
  nextLineageId: 1,
  lineages: {},
  nextSettlementId: 1,
  settlements: [],
  nextSettlementRouteId: 1,
  settlementRoutes: [],
  colonyNetworkScore: 0,
  colonyNetworkColonies: 0,
  colonyNetworkActiveRoutes: 0,
  colonyNetworkClaimedTiles: 0,
  spaceProgramProgress: 0,
  orbitalLaunches: 0,
  lastSpaceProgramTick: 0,
  spaceProgramReady: false,
  nextOrbitalAssetId: 1,
  orbitalAssets: [],
  orbitalInfrastructureScore: 0,
  orbitalPlatformReady: false,
  nextPlanetaryBodyId: 1,
  planetaryBodies: [],
  planetarySurveyProgress: 0,
  planetarySurveyReady: false,
  lastPlanetarySurveyTick: 0,
  nextProbeMissionId: 1,
  probeMissions: [],
  probeMissionProgress: 0,
  probeMissionReady: false,
  lastProbeMissionTick: 0,
  nextStarSystemId: 1,
  starSystems: [],
  starMapProgress: 0,
  starMapReady: false,
  lastStarMapTick: 0,
  galacticInfluenceProgress: 0,
  galacticInfluenceReady: false,
  galacticClaimedSystems: 0,
  lastGalacticInfluenceTick: 0,
  nextInterstellarFleetId: 1,
  interstellarFleets: [],
  interstellarFleetProgress: 0,
  interstellarFleetReady: false,
  interstellarFleetActive: 0,
  interstellarFleetCompleted: 0,
  lastInterstellarFleetTick: 0,
  nextEmpireSectorId: 1,
  empireSectors: [],
  empireSectorProgress: 0,
  empireSectorReady: false,
  empireSectorCount: 0,
  lastEmpireSectorTick: 0,
  empireLegacyProgress: 0,
  empireLegacyLevel: 0,
  empireLegacyReady: false,
  empireLegacyComplete: false,
  lastEmpireLegacyTick: 0
};
