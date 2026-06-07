const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const namespaceSource = read("js/core/namespace.js");
const configSource = read("config.js");
const pipelineSource = read("js/render/pipeline.js");
const entitiesSource = read("js/render/entities.js");
const engineSource = read("js/render/webgl-engine.js");
const entityWebglSource = read("js/render/entity-webgl.js");
const readinessSource = read("js/render/entity-webgl-readiness.js");
const eventMarkerSource = read("js/render/entity-webgl-events.js");

assert.ok(namespaceSource.indexOf("js/render/entity-atlas.js") < namespaceSource.indexOf("js/render/entity-webgl.js"), "entity atlas should load before entity WebGL");
assert.ok(namespaceSource.indexOf("js/render/entity-webgl-readiness.js") > namespaceSource.indexOf("js/render/entity-webgl.js"), "settlement readiness sidecar should load after entity WebGL");
assert.ok(namespaceSource.indexOf("js/render/entity-webgl-readiness.js") < namespaceSource.indexOf("js/render/entities.js"), "settlement readiness sidecar should load before entity facade calls it");
assert.ok(namespaceSource.indexOf("js/render/entity-webgl-events.js") > namespaceSource.indexOf("js/render/entity-webgl.js"), "orbit event marker sidecar should load after entity WebGL");
assert.ok(namespaceSource.indexOf("js/render/entity-webgl-events.js") < namespaceSource.indexOf("js/render/entities.js"), "orbit event marker sidecar should load before entity facade calls it");
assert.ok(namespaceSource.indexOf("js/render/entity-webgl.js") >= 0, "entity WebGL compositor should load in the runtime");
assert.ok(/PLANET_ENTITY_WEBGL_INSTANCING:\s*true/.test(configSource), "entity WebGL instancing should be enabled by default");
assert.ok(/PLANET_ENTITY_WEBGL_MAX_INSTANCES:\s*8192/.test(configSource), "entity WebGL instancing should have a capped batch size");
assert.ok(/PLANET_ORBIT_EVENT_MARKER_MAX_MARKERS:\s*24/.test(configSource), "orbit event marker facades should have a capped batch size");
assert.ok(/PLANET_SETTLEMENT_READINESS_MAX_MARKERS:\s*6/.test(configSource), "settlement readiness facades should have a capped batch size");
assert.ok(pipelineSource.indexOf("PS.render.entityWebgl") >= 0, "render rebuilds should include the entity WebGL subsystem");

assert.ok(engineSource.indexOf('getContext("webgl2"') >= 0, "shared WebGL engine should create raw WebGL2 contexts");
assert.ok(engineSource.indexOf("gl.NEAREST") >= 0, "shared WebGL engine should preserve pixel-art nearest-neighbor sampling");
assert.ok(entityWebglSource.indexOf('ensureTarget("entities"') >= 0, "entity compositor should allocate through shared engine target");
assert.ok(entityWebglSource.indexOf("getTraitOrganismCell") >= 0, "entity compositor should use trait-coded organism atlas cells");
assert.ok(entityWebglSource.indexOf("getRgbaTexture") >= 0, "entity compositor should upload packed RGBA atlas pages");
assert.strictEqual(entityWebglSource.indexOf("PS.spriteSystem"), -1, "entity compositor should not depend on the removed sprite system");
assert.ok(entityWebglSource.indexOf('ensureBuffer(state.target, "entity-quad"') >= 0, "entity compositor should use shared quad buffer");
assert.ok(entityWebglSource.indexOf('ensureBuffer(state.target, "entity-instances"') >= 0, "entity compositor should use shared instance buffer");
assert.ok(entityWebglSource.indexOf("updateBuffer") >= 0, "entity compositor should upload instance data through shared engine");
assert.ok(entityWebglSource.indexOf("beginTransparentPass") >= 0, "entity compositor should use shared pass setup");
assert.ok(entityWebglSource.indexOf("presentTarget") >= 0, "entity compositor should present through WebGL");
assert.strictEqual(entityWebglSource.indexOf("drawTargetTo2d"), -1, "entity compositor should not copy back to Canvas2D");
assert.ok(entityWebglSource.indexOf("drawArraysInstanced") >= 0, "entity compositor should submit instanced draws");
assert.ok(entityWebglSource.indexOf("drawOrganisms") >= 0, "entity compositor should expose organism rendering");
assert.ok(entityWebglSource.indexOf("drawFood") >= 0, "entity compositor should expose food rendering");
assert.ok(entityWebglSource.indexOf("getSettlementCell") >= 0, "entity compositor should request settlement atlas cells");
assert.ok(entityWebglSource.indexOf("buildSettlementBatches") >= 0, "entity compositor should batch settlement markers");
assert.ok(entityWebglSource.indexOf("drawSettlements") >= 0, "entity compositor should expose settlement rendering");
assert.ok(entityWebglSource.indexOf("settlementDrawCount") >= 0, "entity compositor should report settlement draw counts");
assert.ok(entityWebglSource.indexOf("buildSettlementShadowBatches") >= 0, "entity compositor should batch settlement shadows");
assert.ok(entityWebglSource.indexOf("drawSettlementShadows") >= 0, "entity compositor should expose settlement shadow rendering");
assert.ok(entityWebglSource.indexOf("shadowDrawCount") >= 0, "entity compositor should report settlement shadow draw counts");
assert.ok(entityWebglSource.indexOf("buildSettlementVegetationBatches") >= 0, "entity compositor should batch settlement vegetation facades");
assert.ok(entityWebglSource.indexOf("drawSettlementVegetation") >= 0, "entity compositor should expose settlement vegetation rendering");
assert.ok(entityWebglSource.indexOf("vegetationDrawCount") >= 0, "entity compositor should report settlement vegetation draw counts");
assert.ok(entityWebglSource.indexOf("buildSettlementWorldUiBatches") >= 0, "entity compositor should batch settlement world UI facades");
assert.ok(entityWebglSource.indexOf("drawSettlementWorldUi") >= 0, "entity compositor should expose settlement world UI rendering");
assert.ok(entityWebglSource.indexOf("worldUiDrawCount") >= 0, "entity compositor should report settlement world UI draw counts");
assert.ok(entityWebglSource.indexOf("buildSettlementCitizenBatches") >= 0, "entity compositor should batch settlement citizen facades");
assert.ok(entityWebglSource.indexOf("drawSettlementCitizens") >= 0, "entity compositor should expose settlement citizen rendering");
assert.ok(entityWebglSource.indexOf("citizenDrawCount") >= 0, "entity compositor should report settlement citizen draw counts");
assert.ok(entityWebglSource.indexOf("getRouteCell") >= 0, "entity compositor should request route atlas cells");
assert.ok(entityWebglSource.indexOf("buildSettlementRouteBatches") >= 0, "entity compositor should batch settlement route markers");
assert.ok(entityWebglSource.indexOf("drawSettlementRoutes") >= 0, "entity compositor should expose route rendering");
assert.ok(entityWebglSource.indexOf("routeDrawCount") >= 0, "entity compositor should report route draw counts");
assert.ok(entityWebglSource.indexOf("getVisibleRouteSegment") >= 0, "entity compositor should clip route facades to the active viewport");
assert.ok(entityWebglSource.indexOf("getSettlementRouteCanvasPoint") >= 0, "entity compositor should recover local route endpoints outside visible settlement markers");
assert.ok(entityWebglSource.indexOf("getSettlementInfluenceCell") >= 0, "entity compositor should request influence atlas cells");
assert.ok(entityWebglSource.indexOf("buildSettlementInfluenceBatches") >= 0, "entity compositor should batch settlement influence markers");
assert.ok(entityWebglSource.indexOf("drawSettlementInfluence") >= 0, "entity compositor should expose influence rendering");
assert.ok(entityWebglSource.indexOf("influenceDrawCount") >= 0, "entity compositor should report influence draw counts");
assert.ok(entityWebglSource.indexOf("getRepresentativeIntentCell") >= 0, "entity compositor should request representative intent atlas cells");
assert.ok(entityWebglSource.indexOf("buildRepresentativeIntentBatches") >= 0, "entity compositor should batch watched representative intent markers");
assert.ok(entityWebglSource.indexOf("drawRepresentativeIntents") >= 0, "entity compositor should expose representative intent rendering");
assert.ok(entityWebglSource.indexOf("intentDrawCount") >= 0, "entity compositor should report representative intent draw counts");
assert.ok(eventMarkerSource.indexOf("getOrbitEventMarkerCell") >= 0, "orbit event sidecar should request event marker atlas cells");
assert.ok(eventMarkerSource.indexOf("buildOrbitEventMarkerBatches") >= 0, "orbit event sidecar should batch timeline event markers");
assert.ok(eventMarkerSource.indexOf("drawOrbitEventMarkers") >= 0, "orbit event sidecar should expose orbit event marker rendering");
assert.ok(entityWebglSource.indexOf("eventMarkerDrawCount") >= 0, "entity compositor should report orbit event marker draw counts");
assert.ok(entityWebglSource.indexOf("readinessDrawCount") >= 0, "entity compositor should report settlement readiness draw counts");
assert.ok(readinessSource.indexOf("getSettlementReadinessCandidates") >= 0, "settlement readiness sidecar should derive bounded lineage candidates");
assert.ok(readinessSource.indexOf("world.lineages") >= 0, "settlement readiness sidecar should consume aggregate lineage state");
assert.ok(readinessSource.indexOf("world.settlements.length > 0") >= 0, "settlement readiness sidecar should stop when real settlements exist");
assert.ok(readinessSource.indexOf("getSettlementReadinessMarkerCap") >= 0, "settlement readiness sidecar should use an explicit marker cap");
assert.ok(entityWebglSource.indexOf("resetFrameStats") >= 0, "entity compositor should reset frame aggregate counters");
assert.ok(entityWebglSource.indexOf("frameInstanceDrawCount") >= 0, "entity compositor should accumulate per-frame instance counts");

assert.ok(entitiesSource.indexOf("entityWebgl.drawOrganisms(interpolation)") >= 0, "organism rendering should use the instanced path");
assert.ok(entitiesSource.indexOf("entityWebgl.drawFood()") >= 0, "food rendering should use the instanced path");
assert.ok(entitiesSource.indexOf("entityWebgl.drawSettlementShadows()") >= 0, "settlement shadow rendering should use the instanced path");
assert.ok(entitiesSource.indexOf("entityWebgl.drawSettlementVegetation()") >= 0, "settlement vegetation rendering should use the instanced path");
assert.ok(entitiesSource.indexOf("entityWebgl.drawSettlementWorldUi()") >= 0, "settlement world UI rendering should use the instanced path");
assert.ok(entitiesSource.indexOf("entityWebgl.drawSettlementCitizens()") >= 0, "settlement citizen rendering should use the instanced path");
assert.ok(entitiesSource.indexOf("entityWebgl.drawSettlements()") >= 0, "settlement rendering should use the instanced path");
assert.ok(entitiesSource.indexOf("entityWebgl.drawSettlementRoutes()") >= 0, "settlement route rendering should use the instanced path");
assert.ok(entitiesSource.indexOf("entityWebgl.drawSettlementInfluence()") >= 0, "settlement influence rendering should use the instanced path");
assert.ok(entitiesSource.indexOf("entityWebgl.drawRepresentativeIntents(world.interpolation)") >= 0, "representative intent rendering should use the instanced path");
assert.ok(entitiesSource.indexOf("entityWebgl.drawSettlementReadiness()") >= 0, "settlement readiness rendering should use the instanced path");
assert.ok(entitiesSource.indexOf("entityWebgl.drawOrbitEventMarkers()") >= 0, "orbit event marker rendering should use the instanced path");
assert.ok(entitiesSource.indexOf("String(world.settlements[i].id) === String(settlementId)") >= 0, "settlement route facades should fall back to current aggregate settlement arrays");
assert.strictEqual(entitiesSource.indexOf("ctx"), -1, "entity facade should not reference Canvas2D context");

const routeContext = {
  CONFIG: {
    PLANET_ENTITY_WEBGL_MAX_INSTANCES: 8192
  },
  PS: {
    render: {
      entities: {
        getSettlementById(id) {
          return routeContext.world.settlements.find((settlement) => settlement.id === id) || null;
        },
        getSettlementRenderPosition(settlement) {
          if (settlement.id === 1) {
            return { x: 50, y: 50, scale: 1, visibility: 1, visible: true };
          }
          return null;
        },
        getLineageColorById() {
          return "#ffffff";
        }
      },
      webglEngine: {},
      shaderManager: {}
    },
    atlas: {
      pages: [{ width: 256, height: 256, data: new Uint8Array(256 * 256 * 4), version: 1 }],
      getRouteCell() {
        return { pageIndex: 0, u0: 0, v0: 0, u1: 0.0625, v1: 0.0625 };
      }
    },
    ranmap: {
      variant() {
        return 1;
      }
    }
  },
  world: {
    settlements: [
      { id: 1, x: 10, y: 10, longitude: 0, latitude: 0, lineageId: 1 },
      { id: 2, x: 11, y: 10, longitude: 1, latitude: 0, lineageId: 1 }
    ],
    settlementRoutes: [
      { id: 1, parentSettlementId: 1, childSettlementId: 2, isActive: true, lineageId: 1 }
    ]
  },
  canvas: { width: 100, height: 100 },
  performance: { now() { return 0; } },
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },
  isPlanetLocalView() {
    return true;
  },
  getEntitySurfacePosition(settlement) {
    return { longitude: settlement.longitude, latitude: settlement.latitude };
  },
  getPlanetLocalCanvasPoint(longitude) {
    return { x: longitude > 0 ? 900 : 50, y: 50 };
  }
};

routeContext.PS.render.entityWebgl = {};
vm.createContext(routeContext);
vm.runInContext(entityWebglSource, routeContext, { filename: "js/render/entity-webgl.js" });
vm.runInContext(readinessSource, routeContext, { filename: "js/render/entity-webgl-readiness.js" });
routeContext.PS.render.entityWebgl.state.target = { width: 100, height: 100 };

const routeBatches = routeContext.PS.render.entityWebgl.buildSettlementRouteBatches();
assert.ok(routeBatches.routes > 0, "route compositor should keep visible clipped route markers when a settlement endpoint is offscreen");
assert.strictEqual(routeBatches.capped, 0, "clipped route markers should stay inside the configured batch cap");

const intentContext = {
  CONFIG: {
    PLANET_ENTITY_WEBGL_MAX_INSTANCES: 8192,
    PLANET_REPRESENTATIVE_INTENT_MAX_MARKERS: 1,
    ORGANISM_DRAW_SIZE: 5,
    LINEAGE_COLORS: ["#72d7ff"]
  },
  PS: {
    sim: {
      representatives: {
        getRepresentative(id) {
          return intentContext.world.biologyRepresentativeById[String(id)] || null;
        }
      }
    },
    render: {
      entities: {
        getInterpolationAmount(value) {
          return value;
        },
        getRenderPosition(organism) {
          return { x: organism.x, y: organism.y, scale: 1, visibility: 1, visible: true };
        },
        getLineageColorById() {
          return "#72d7ff";
        },
        shouldDrawGlobeScaleEntities() {
          return true;
        }
      },
      webglEngine: {},
      shaderManager: {}
    },
    atlas: {
      getRepresentativeIntentCell() {
        return { pageIndex: 0, u0: 0, v0: 0, u1: 0.0625, v1: 0.0625 };
      }
    }
  },
  world: {
    organisms: [
      { representativeId: 10, x: 20, y: 20, lineageId: 1 },
      { representativeId: 11, x: 25, y: 20, lineageId: 1 }
    ],
    biologyRepresentativeById: {
      "10": { id: 10, lineageId: 1, behavior: "feeding", target: { type: "food" }, selected: true },
      "11": { id: 11, lineageId: 1, behavior: "breeding", pinned: true }
    }
  },
  canvas: { width: 100, height: 100 },
  performance: { now() { return 0; } },
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
};

intentContext.PS.render.entityWebgl = {};
vm.createContext(intentContext);
vm.runInContext(entityWebglSource, intentContext, { filename: "js/render/entity-webgl.js" });
vm.runInContext(readinessSource, intentContext, { filename: "js/render/entity-webgl-readiness.js" });
intentContext.PS.render.entityWebgl.state.target = { width: 100, height: 100 };

const intentBatches = intentContext.PS.render.entityWebgl.buildRepresentativeIntentBatches(1);
assert.strictEqual(intentBatches.intents, 1, "representative intent batch should draw watched representatives through WebGL");
assert.strictEqual(intentBatches.capped, 1, "representative intent batch should enforce its marker cap");

const eventContext = {
  CONFIG: {
    PLANET_ENTITY_WEBGL_MAX_INSTANCES: 8192,
    PLANET_ORBIT_EVENT_MARKER_MAX_MARKERS: 1
  },
  PS: {
    render: {
      pipeline: {
        getZoomBand() {
          return "orbit";
        }
      },
      entities: {
        getRenderPosition(entity) {
          return { x: 48 + entity.longitude, y: 50 - entity.latitude, scale: 1, visibility: 1, visible: true };
        }
      },
      webglEngine: {},
      shaderManager: {}
    },
    atlas: {
      getOrbitEventMarkerCell() {
        return { pageIndex: 0, u0: 0, v0: 0, u1: 0.0625, v1: 0.0625 };
      },
      getOrbitEventSeverityBucket(event) {
        return event.severity === "critical" ? 2 : 0;
      }
    }
  },
  world: {
    tick: 120,
    planetView: { zoomLevel: 0 },
    planetTiles: [],
    timelineEvents: [
      { tick: 10, category: "biology", severity: "info", location: { latitude: 4, longitude: -8 } },
      { tick: 20, category: "geology", severity: "critical", location: { latitude: 8, longitude: 12 } }
    ]
  },
  canvas: { width: 100, height: 100 },
  performance: { now() { return 0; } },
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
};

eventContext.PS.render.entityWebgl = {};
vm.createContext(eventContext);
vm.runInContext(entityWebglSource, eventContext, { filename: "js/render/entity-webgl.js" });
vm.runInContext(eventMarkerSource, eventContext, { filename: "js/render/entity-webgl-events.js" });
eventContext.PS.render.entityWebgl.state.target = { width: 100, height: 100 };

const eventBatches = eventContext.PS.render.entityWebgl.buildOrbitEventMarkerBatches();
assert.strictEqual(eventBatches.eventMarkers, 1, "orbit event marker batch should draw located timeline events through WebGL");
assert.strictEqual(eventBatches.capped, 0, "orbit event marker candidate selection should enforce its marker cap before submission");

const readinessContext = {
  CONFIG: {
    PLANET_ENTITY_WEBGL_MAX_INSTANCES: 8192,
    PLANET_SETTLEMENT_READINESS_MAX_MARKERS: 1,
    SETTLEMENT_MIN_LINEAGE_POPULATION: 10,
    SETTLEMENT_MIN_LINEAGE_PEAK_POPULATION: 16,
    LINEAGE_COLORS: ["#72d7ff", "#58f06c"]
  },
  PS: {
    sim: {
      organisms: {
        byLineage(id) {
          return readinessContext.world.organisms.filter((organism) => organism.lineageId === id);
        }
      }
    },
    render: {
      entities: {
        getRenderPosition(entity) {
          return { x: entity.x * 4, y: entity.y * 4, scale: 1, visibility: 1, visible: true };
        },
        getLineageColorById() {
          return "#72d7ff";
        },
        shouldDrawGlobeScaleEntities() {
          return true;
        }
      },
      webglEngine: {},
      shaderManager: {}
    },
    atlas: {
      getSettlementReadinessCell() {
        return { pageIndex: 0, u0: 0, v0: 0, u1: 0.0625, v1: 0.0625 };
      }
    }
  },
  world: {
    isExtinct: false,
    settlements: [],
    settlementByLineage: {},
    lineages: {
      "1": { id: 1, activeCount: 9, peakPopulation: 15, isExtinct: false },
      "2": { id: 2, activeCount: 6, peakPopulation: 8, isExtinct: false }
    },
    organisms: [
      { lineageId: 1, x: 10, y: 10 },
      { lineageId: 1, x: 12, y: 10 },
      { lineageId: 2, x: 80, y: 10 }
    ]
  },
  WORLD_WIDTH: 100,
  WORLD_HEIGHT: 100,
  canvas: { width: 400, height: 300 },
  performance: { now() { return 0; } },
  Float32Array,
  Object,
  String,
  Number,
  Boolean,
  Array,
  Math,
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
};

readinessContext.PS.render.entityWebgl = {};
vm.createContext(readinessContext);
vm.runInContext(entityWebglSource, readinessContext, { filename: "js/render/entity-webgl.js" });
vm.runInContext(readinessSource, readinessContext, { filename: "js/render/entity-webgl-readiness.js" });
readinessContext.PS.render.entityWebgl.state.target = { width: 400, height: 300 };

const readinessCandidates = readinessContext.PS.render.entityWebgl.getSettlementReadinessCandidates();
assert.strictEqual(readinessCandidates.length, 1, "settlement readiness should cap candidate lineage facades");
assert.strictEqual(readinessCandidates[0].lineageId, 1, "settlement readiness should pick the strongest aggregate lineage");
assert.strictEqual(readinessCandidates[0].progressBucket, 3, "near-founding lineage should use the highest readiness bucket");

const readinessBatches = readinessContext.PS.render.entityWebgl.buildSettlementReadinessBatches();
assert.strictEqual(readinessBatches.readiness, 1, "settlement readiness batch should draw capped lineage facades");
assert.strictEqual(readinessBatches.organisms, 0, "settlement readiness should not count as authoritative organisms");

readinessContext.world.settlements.push({ id: 1, lineageId: 1 });
assert.strictEqual(readinessContext.PS.render.entityWebgl.getSettlementReadinessCandidates().length, 0, "settlement readiness should stop once real settlement aggregates exist");

console.log("entity webgl checks passed");
