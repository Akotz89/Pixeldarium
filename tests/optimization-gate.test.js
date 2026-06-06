const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const agents = read("AGENTS.md");
const model = read("docs/optimization-operating-model.md");
const biology = read("docs/biological-model-decision.md");
const gate = read("docs/optimization-implementation-gate.md");
const index = read("docs/index.md");

[
  "Bottleneck",
  "Representation or lifecycle boundary",
  "Chunk, batch, or aggregate boundary",
  "Readiness state",
  "Player-perception contract",
  "New constraint or encoding limit",
  "Proof metric"
].forEach((field) => {
  assert.ok(gate.indexOf(field) >= 0, "optimization gate should require field: " + field);
});

[
  "AZR-372",
  "AZR-383",
  "AZR-368",
  "AZR-607",
  "AZR-471",
  "AZR-585"
].forEach((issueId) => {
  assert.ok(gate.indexOf(issueId) >= 0, "optimization gate should name steering issue " + issueId);
});

assert.ok(
  agents.indexOf("docs/optimization-operating-model.md") >= 0 &&
    agents.indexOf("bottleneck") >= 0 &&
    agents.indexOf("verification metric") >= 0,
  "AGENTS.md should make the optimization model mandatory for scale-sensitive work"
);
assert.ok(
  model.indexOf("Pass/Fail Standard") >= 0 &&
    model.indexOf("the bottleneck it targets") >= 0 &&
    model.indexOf("the metric that proves success") >= 0,
  "operating model should define pass/fail fields"
);
assert.ok(
  gate.indexOf("Canvas2D is not a runtime requirement or fallback target") >= 0 &&
    model.indexOf("Canvas2D is not a runtime requirement") >= 0,
  "optimization gate should prohibit Canvas2D runtime requirements"
);
assert.ok(
  biology.indexOf("aggregate population state as the authoritative") >= 0 &&
    biology.indexOf("representative organisms as detailed, watchable facades") >= 0,
  "biology decision should preserve aggregate-authoritative ownership"
);
assert.ok(index.indexOf("Optimization Implementation Gate") >= 0, "docs index should expose AZR-637 gate doc");

console.log("optimization gate checks passed");
