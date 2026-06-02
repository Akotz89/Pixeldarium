PS.events = PS.events || {};

PS.events.listeners = PS.events.listeners || {};
PS.events.history = PS.events.history || [];
PS.events.historyLimit = PS.events.historyLimit || 256;

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

PS.events.normalizeMilestonePayload = function (payload) {
  payload = payload || {};

  var normalized = {
    type: String(payload.type || "milestone"),
    label: String(payload.label || "Milestone"),
    detail: String(payload.detail || ""),
    tick: Math.max(0, Math.round(Number(payload.tick != null ? payload.tick : (typeof world !== "undefined" ? world.tick : 0)) || 0)),
    deepTime: payload.deepTime || null,
    location: payload.location || null,
    source: String(payload.source || "simulation"),
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

  return normalized;
};

PS.events.appendMilestoneToWorldLog = function (payload) {
  if (typeof world === "undefined" || !payload || !payload.watcher || payload.watcher.eventLog === false) {
    return null;
  }

  if (!Array.isArray(world.eventLog)) {
    world.eventLog = [];
  }

  var entry = {
    tick: payload.tick,
    type: payload.type,
    label: payload.label,
    detail: payload.detail,
    source: payload.source,
    severity: payload.severity,
    inspectTarget: payload.inspectTarget
  };

  world.eventLog.push(entry);

  if (typeof CONFIG !== "undefined" && world.eventLog.length > CONFIG.EVENT_LOG_MAX_ENTRIES) {
    world.eventLog.splice(0, world.eventLog.length - CONFIG.EVENT_LOG_MAX_ENTRIES);
  }

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
