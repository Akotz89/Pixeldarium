# PixelSim Save Format — Version 1

**Current version**: `PIXELSIM_SAVE_VERSION = 1` (persistence.js line 5)  
**Config reference**: `CONFIG.SAVE_FORMAT_VERSION = 1` (config.js)  
**Storage**: IndexedDB database `pixelsim`, object store `saves`, key `latest`  
**Export**: JSON file download via Export JSON button

## Save Envelope

```json
{
  "id": "latest",
  "version": 1,
  "savedAt": "ISO-8601 timestamp",
  "worldWidth": 320,
  "worldHeight": 170,
  "tileSize": 5
}
```

## Top-Level State Fields

| Field | Type | Description |
|-------|------|-------------|
| tick | int | Current simulation tick |
| speed | int | Sim speed multiplier (1-10) |
| era | string | Current era name |
| isExtinct | bool | Whether all organisms died |
| extinctionTick | int | Tick of extinction (0 if alive) |
| totalBirths/Deaths | int | Lifetime counters |
| totalFoodSpawned/Consumed/Harvested | int | Lifetime food counters |
| seedText | string | World seed string |
| rngState | uint32 | Current xorshift32 RNG state |
| nextLineageId | int | Auto-increment counter |
| nextSettlementId | int | Auto-increment counter |
| nextSettlementRouteId | int | Auto-increment counter |
| nextOrbitalAssetId | int | Auto-increment counter |
| nextPlanetaryBodyId | int | Auto-increment counter |
| nextProbeMissionId | int | Auto-increment counter |
| nextStarSystemId | int | Auto-increment counter |
| nextInterstellarFleetId | int | Auto-increment counter |
| nextEmpireSectorId | int | Auto-increment counter |

## Progression State Fields

Colony network, space program, orbital, planetary, probe, star map, galactic influence, interstellar fleet, empire sector, and empire legacy — all stored as top-level numeric/boolean fields (progress, readiness, last tick, counts).

## Entity Arrays

### organisms[]
```json
{
  "x": 0, "y": 0,
  "prevX": 0, "prevY": 0,
  "latitude": 0.0, "longitude": 0.0,
  "prevLatitude": 0.0, "prevLongitude": 0.0,
  "energy": 180, "age": 0,
  "directionX": 0, "directionY": 0,
  "travelKm": 0.0,
  "traits": { "vision": 20, "metabolism": 1, "reproductionEnergy": 260, "movementTendency": 0.06, "terrainAffinity": 0.5 },
  "lineageId": 1, "lineageParentId": 0, "generation": 0
}
```

### food[]
```json
{ "x": 0, "y": 0, "latitude": 0.0, "longitude": 0.0 }
```

### terrain[]
Flat array of `WORLD_WIDTH * WORLD_HEIGHT` integers. `0` = barren, `1` = fertile.

### lineages[]
```json
{
  "id": 1, "parentId": 0, "createdTick": 0, "founderGeneration": 0,
  "founderTraits": { ... }, "activeCount": 0, "lastSeenTick": 0,
  "peakPopulation": 0, "isExtinct": false
}
```

### settlements[]
24 fields including: id, lineageId, x, y, foundedTick, radius, population, foodStock, storedFood, development, level, lastGrowthTick, influenceRadius, claimedTiles, claimedFood, parentSettlementId, isOutpost, isColony, lastOutpostTick, lastSupplyGrowthTick, isActive, lastActiveTick.

### settlementRoutes[]
```json
{
  "id": 1, "parentSettlementId": 1, "childSettlementId": 2,
  "lineageId": 1, "foundedTick": 0, "distance": 5,
  "foodTransferred": 0, "lastTransferTick": 0, "isActive": true
}
```

### orbitalAssets[]
id, launchNumber, launchedTick, infrastructureScore, orbitAngle, orbitBand, isActive

### planetaryBodies[]
id, name, discoveredTick, surveyValue, orbitAngle, orbitRadius, isSurveyed

### probeMissions[]
id, targetBodyId, launchedTick, arrivalTick, progress, isComplete

### starSystems[]
id, name, discoveredTick, mapValue, mapX, mapY, isMapped, influenceValue, isClaimed, claimedTick

### interstellarFleets[]
id, sourceSystemId, targetSystemId, launchedTick, arrivalTick, progress, isComplete

### empireSectors[]
id, systemId, foundedTick, controlValue, controlRadius, isActive

### traitHistory[]
tick, population, vision, metabolism, reproductionEnergy, movementTendency, terrainAffinity

### ecosystemHistory[]
tick, population, food, averageEnergy, foodPerOrganism, populationBalance, resourceBalance, foodNetThisTick, foodRunwayTicks, pressure, stabilityScore

### eventLog[]
tick, type, label, detail

## config{} (Embedded Snapshot)

Full config snapshot embedded in save data (lines 451-589 of persistence.js). Contains all simulation parameters at time of save. Used for reference only — not restored on load.

## Migration Notes for E0 Restructure

1. **Save version stays at 1** until entity storage changes (typed arrays)
2. **Typed array migration** (D3) will require version bump to 2
3. **PS.* namespace** (D4) won't change save format — only function access patterns
4. **Event bus** (D5) won't change save format
5. **WebGL2** (D1) won't change save format — rendering only
6. **Migration function** should be added to persistence.js: `migrateSaveData(data)`
7. **Backward compat**: Version 1 saves should always loadable
