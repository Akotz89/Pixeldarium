const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const forbidden = /getContext\(["']2d|OffscreenCanvas|createImageData|putImageData|getImageData|Canvas2D|Canvas 2D|drawTargetTo2d|drawFramebufferTargetTo2d|drawChunksTo2d|compatibilityCanvas|presentCompatibilityCanvas|copyBack|targetCtx|\bctx\b/;
const violations = [];

function walk(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function(entry) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full);
      return;
    }

    if (!entry.name.endsWith(".js")) {
      return;
    }

    const rel = path.relative(root, full).replace(/\\/g, "/");
    const source = fs.readFileSync(full, "utf8");

    source.split(/\n/).forEach(function(line, index) {
      if (forbidden.test(line)) {
        violations.push(rel + ":" + (index + 1) + ": " + line.trim());
      }
    });
  });
}

walk(path.join(root, "js"));

assert.deepStrictEqual(violations, [], "js source must not contain Canvas2D runtime APIs or compatibility markers");

console.log("no Canvas2D source checks passed");
