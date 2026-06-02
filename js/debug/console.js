PS.debug = PS.debug || {};

PS.debug.console = {
  visible: false,
  element: null,
  input: null,
  setup: function() {
    this.element = document.getElementById("debug-console");
    this.input = document.getElementById("debug-console-input");
    this.bindInput();
  },
  bindInput: function() {
    if (!this.input || this.input.dataset.bound === "true") {
      return;
    }

    this.input.dataset.bound = "true";
    this.input.addEventListener("keydown", function(event) {
      if (event.key === "Enter") {
        PS.debug.console.run(event.currentTarget.value);
        event.currentTarget.value = "";
      }
    });
  },
  toggle: function() {
    this.visible = !this.visible;
    this.render();
    return this.visible;
  },
  render: function() {
    if (!this.element) {
      this.setup();
    }

    if (!this.element) {
      return;
    }

    this.element.hidden = !this.visible;

    if (this.visible && this.input) {
      this.input.focus();
    }
  },
  run: function(command) {
    var parts = String(command || "").trim().split(/\s+/);

    if (parts[0] === "set" && parts.length >= 3 && Object.prototype.hasOwnProperty.call(CONFIG, parts[1])) {
      CONFIG[parts[1]] = Number.isFinite(Number(parts[2])) ? Number(parts[2]) : parts.slice(2).join(" ");
      PS.ui.notifications && PS.ui.notifications.show("Config set", parts[1], "info");
      return CONFIG[parts[1]];
    }

    PS.ui.notifications && PS.ui.notifications.show("Debug console", "Use: set CONFIG_KEY value", "warn");
    return null;
  }
};
