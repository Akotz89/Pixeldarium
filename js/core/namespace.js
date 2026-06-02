var PS = window.PS || {};

PS.meta = PS.meta || {};
PS.meta.name = "Pixeldarium";
PS.meta.version = PS.meta.version || "0.1.0";

window.PS = PS;

PS.runtime = PS.runtime || {};
PS.runtime.errors = PS.runtime.errors || [];

PS.runtime.recordError = function (kind, payload) {
  var entry = {
    kind: kind,
    payload: payload,
    time: new Date().toISOString()
  };

  PS.runtime.errors.push(entry);

  if (PS.runtime.errors.length > 50) {
    PS.runtime.errors.shift();
  }

  if (typeof showDebugMessage === "function") {
    showDebugMessage(kind + ": " + String(payload && payload.message ? payload.message : payload));
  }

  return entry;
};

window.addEventListener("error", function (event) {
  if (event.target && event.target !== window && event.target.src) {
    PS.runtime.recordError("load.error", {
      message: "Could not load " + event.target.src,
      source: event.target.src
    });
    return;
  }

  PS.runtime.recordError("runtime.error", {
    message: event.message,
    file: event.filename,
    line: event.lineno,
    column: event.colno
  });
}, true);

window.addEventListener("unhandledrejection", function (event) {
  PS.runtime.recordError("promise.error", {
    message: event.reason && event.reason.message ? event.reason.message : String(event.reason),
    reason: event.reason
  });
});
