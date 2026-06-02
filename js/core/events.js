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
