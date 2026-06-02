PS.events = PS.events || {};

PS.events.listeners = PS.events.listeners || {};
PS.events.history = PS.events.history || [];
PS.events.historyLimit = PS.events.historyLimit || 256;
PS.events.categories = {
  biology: { label: "Biology", sources: ["biology", "life", "organisms", "species"] },
  geology: { label: "Geology", sources: ["geology", "tectonics"] },
  atmosphere: { label: "Atmosphere", sources: ["atmosphere", "climate"] },
  civilization: { label: "Civilization", sources: ["civilization", "settlement", "network", "space", "empire"] },
  extinction: { label: "Extinction", sources: ["extinction", "lifecycle"] }
};
PS.events.contract = {
  payloadFields: ["type", "label", "detail", "details", "tick", "deepTime", "location", "source", "category", "severity", "inspectTarget", "watcher"],
  watcherRoutes: ["eventLog", "timeline", "notification", "spotlight", "overlays"],
  timelineModel: "world.timelineEvents",
  eventLogModel: "world.eventLog"
};

PS.events.on = function (name, handler) {
  PS.assert(typeof name === "string" && name.length > 0, "Event name is required");
  PS.assert(typeof handler === "function", "Event handler must be a function");

  if (!PS.events.listeners[name]) {
    PS.events.listeners[name] = [];
  }

  PS.events.listeners[name].push(handler);

  return function () {
    PS.events.off(name, handler);
  };
};

PS.events.off = function (name, handler) {
  var handlers = PS.events.listeners[name];

  if (!handlers) {
    return false;
  }

  for (var i = handlers.length - 1; i >= 0; i--) {
    if (handlers[i] === handler) {
      handlers.splice(i, 1);
      return true;
    }
  }

  return false;
};

PS.events.emit = function (name, payload) {
  PS.assert(typeof name === "string" && name.length > 0, "Event name is required");

  var entry = {
    name: name,
    payload: payload,
    time: new Date().toISOString()
  };

  PS.events.history.push(entry);

  if (PS.events.history.length > PS.events.historyLimit) {
    PS.events.history.shift();
  }

  var handlers = PS.events.listeners[name] || [];

  for (var i = 0; i < handlers.length; i++) {
    handlers[i](payload, entry);
  }

  return entry;
};

PS.events.clearHistory = function () {
  PS.events.history.length = 0;
};

PS.events.getMilestoneContract = function() {
  return {
    payloadFields: this.contract.payloadFields.slice(),
    watcherRoutes: this.contract.watcherRoutes.slice(),
    timelineModel: this.contract.timelineModel,
    eventLogModel: this.contract.eventLogModel,
    categories: Object.assign({}, this.categories)
  };
};

PS.events.getEventCategories = function() {
  return Object.keys(this.categories);
};

PS.events.inferCategory = function(payload) {
  var explicit = String(payload.category || "").trim();

  if (explicit) {
    return explicit;
  }

  var source = String(payload.source || payload.type || "").toLowerCase();

  for (var category in this.categories) {
    if (Object.prototype.hasOwnProperty.call(this.categories, category)) {
      var sources = this.categories[category].sources || [];

      for (var i = 0; i < sources.length; i++) {
        if (source.indexOf(String(sources[i]).toLowerCase()) >= 0) {
          return category;
        }
      }
    }
  }

  return "biology";
};

PS.events.normalizeMilestonePayload = function (payload) {
  payload = payload || {};

  var normalized = {
    type: String(payload.type || "milestone"),
    label: String(payload.label || "Milestone"),
    detail: String(payload.detail || ""),
    details: payload.details || null,
    tick: Math.max(0, Math.round(Number(payload.tick != null ? payload.tick : (typeof world !== "undefined" ? world.tick : 0)) || 0)),
    deepTime: payload.deepTime || null,
    location: payload.location || null,
    source: String(payload.source || "simulation"),
    category: PS.events.inferCategory(payload),
    severity: String(payload.severity || "info"),
    inspectTarget: payload.inspectTarget || null,
    watcher: {
      eventLog: payload.watcher && payload.watcher.eventLog === false ? false : true,
      timeline: payload.watcher && payload.watcher.timeline === false ? false : true,
      notification: Boolean(payload.watcher && payload.watcher.notification),
      spotlight: Boolean(payload.watcher && payload.watcher.spotlight),
      overlays: payload.watcher && payload.watcher.overlays ? payload.watcher.overlays.slice ? payload.watcher.overlays.slice() : payload.watcher.overlays : []
    }
  };

  PS.assert(normalized.type.length > 0, "Milestone type is required");
  PS.assert(normalized.label.length > 0, "Milestone label is required");
  PS.assert(normalized.source.length > 0, "Milestone source is required");
  PS.assert(normalized.category.length > 0, "Milestone category is required");

  return normalized;
};

PS.events.makeMilestoneLogEntry = function(payload) {
  return {
    tick: payload.tick,
    type: payload.type,
    label: payload.label,
    detail: payload.detail,
    details: payload.details,
    deepTime: payload.deepTime,
    location: payload.location,
    source: payload.source,
    category: payload.category,
    severity: payload.severity,
    inspectTarget: payload.inspectTarget
  };
};

PS.events.focusMilestoneSpotlight = function(payload, entry) {
  if (typeof world === "undefined" || !payload || !payload.watcher || !payload.watcher.spotlight) {
    return false;
  }

  world.spotlightEvent = Object.assign({}, entry);

  if (payload.location && Number.isFinite(Number(payload.location.latitude)) && Number.isFinite(Number(payload.location.longitude))) {
    if (typeof focusPlanetViewOnLatLon === "function") {
      focusPlanetViewOnLatLon(payload.location.latitude, payload.location.longitude);
    }
  } else if (payload.inspectTarget && Number.isFinite(Number(payload.inspectTarget.x)) && Number.isFinite(Number(payload.inspectTarget.y))) {
    if (typeof focusPlanetViewOnTile === "function") {
      focusPlanetViewOnTile(payload.inspectTarget.x, payload.inspectTarget.y);
    }
  }

  world.needsRender = true;
  return true;
};

PS.events.notifyMilestone = function(payload) {
  if (!payload || !payload.watcher || !payload.watcher.notification) {
    return null;
  }

  if (PS.ui && PS.ui.notifications && typeof PS.ui.notifications.show === "function") {
    return PS.ui.notifications.show(payload.label, payload.detail, payload.severity);
  }

  return null;
};

PS.events.appendMilestoneToWorldLog = function (payload) {
  if (typeof world === "undefined" || !payload || !payload.watcher) {
    return null;
  }

  var entry = this.makeMilestoneLogEntry(payload);

  if (payload.watcher.eventLog !== false) {
    if (!Array.isArray(world.eventLog)) {
      world.eventLog = [];
    }

    world.eventLog.push(entry);

    if (typeof CONFIG !== "undefined" && world.eventLog.length > CONFIG.EVENT_LOG_MAX_ENTRIES) {
      world.eventLog.splice(0, world.eventLog.length - CONFIG.EVENT_LOG_MAX_ENTRIES);
    }
  }

  if (payload.watcher.timeline !== false) {
    if (!Array.isArray(world.timelineEvents)) {
      world.timelineEvents = [];
    }

    world.timelineEvents.push(Object.assign({}, entry));
  }

  this.notifyMilestone(payload);
  this.focusMilestoneSpotlight(payload, entry);
  return entry;
};

PS.events.emitMilestone = function (payload) {
  var normalized = PS.events.normalizeMilestonePayload(payload);
  var logEntry = PS.events.appendMilestoneToWorldLog(normalized);
  var eventEntry = PS.events.emit("milestone.reached", normalized);

  return {
    payload: normalized,
    logEntry: logEntry,
    eventEntry: eventEntry
  };
};

PS.events.milestoneDetectors = {
  organismsAtLeast: function(definition) {
    var value = Array.isArray(world.organisms) ? world.organisms.length : 0;

    return {
      passed: value >= definition.threshold,
      value: value
    };
  },
  populationAtLeast: function(definition) {
    var value = Array.isArray(world.organisms) ? world.organisms.length : 0;

    return {
      passed: value >= definition.threshold,
      value: value
    };
  },
  settlementDevelopmentAtLeast: function(definition) {
    var value = 0;

    if (Array.isArray(world.settlements)) {
      for (var i = 0; i < world.settlements.length; i++) {
        value = Math.max(value, Number(world.settlements[i].development) || 0);
      }
    }

    return {
      passed: value >= definition.threshold,
      value: value
    };
  },
  settlementLevelAtLeast: function(definition) {
    var value = 0;

    if (Array.isArray(world.settlements)) {
      for (var i = 0; i < world.settlements.length; i++) {
        value = Math.max(value, Math.round(Number(world.settlements[i].level) || 0));
      }
    }

    return {
      passed: value >= definition.threshold,
      value: value
    };
  },
  orbitalLaunchesAtLeast: function(definition) {
    var value = Math.max(0, Math.round(Number(world.orbitalLaunches) || 0));

    return {
      passed: value >= definition.threshold,
      value: value
    };
  }
};

PS.events.getMilestoneDefinitions = function() {
  return Array.isArray(PS.config.milestones) ? PS.config.milestones : [];
};

PS.events.getMilestoneRegistry = function() {
  var definitions = this.getMilestoneDefinitions();
  var registry = {};

  for (var i = 0; i < definitions.length; i++) {
    var epoch = String(definitions[i].epoch || "simulation");

    if (!registry[epoch]) {
      registry[epoch] = [];
    }

    registry[epoch].push(definitions[i]);
  }

  return registry;
};

PS.events.formatMilestoneDetail = function(definition, value) {
  return String(definition.detail || "{value}").replace("{value}", String(value));
};

PS.events.detectMilestones = function() {
  if (typeof world === "undefined") {
    return [];
  }

  if (!world.milestonesReached) {
    world.milestonesReached = {};
  }

  var emitted = [];
  var definitions = this.getMilestoneDefinitions();

  for (var i = 0; i < definitions.length; i++) {
    var definition = definitions[i];
    var type = String(definition.type || "");
    var detector = this.milestoneDetectors[definition.condition];

    if (!type || world.milestonesReached[type] || typeof detector !== "function") {
      continue;
    }

    var result = detector(definition);

    if (!result || !result.passed) {
      continue;
    }

    world.milestonesReached[type] = {
      tick: Math.max(0, Math.round(Number(world.tick) || 0)),
      value: result.value
    };

    emitted.push(this.emitMilestone({
      type: type,
      label: definition.label,
      detail: this.formatMilestoneDetail(definition, result.value),
      details: {
        epoch: definition.epoch,
        condition: definition.condition,
        threshold: definition.threshold,
        value: result.value
      },
      deepTime: {
        years: Math.max(0, Number(world.deepTimeYears) || 0)
      },
      source: "milestone-detector",
      category: definition.category,
      severity: definition.severity || "major",
      watcher: {
        eventLog: true,
        timeline: true,
        notification: Boolean(definition.notification),
        spotlight: Boolean(definition.spotlight),
        overlays: definition.overlays || []
      }
    }));
  }

  return emitted;
};
