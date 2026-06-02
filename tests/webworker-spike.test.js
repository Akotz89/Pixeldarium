const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.addScriptTag({
    content: `window.__PIXELDARIUM_WORKER_SOURCE__ = ${JSON.stringify(fs.readFileSync(path.join(root, "js/workers/sim-worker.js"), "utf8"))};`
  });

  const evidence = await page.evaluate(async () => {
    function average(values) {
      return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
    }

    function makeBuffers(count) {
      const x = new Float32Array(count);
      const y = new Float32Array(count);
      const energy = new Float32Array(count);
      const directionX = new Float32Array(count);
      const directionY = new Float32Array(count);
      const age = new Float32Array(count);

      for (let index = 0; index < count; index++) {
        x[index] = index % 320;
        y[index] = Math.floor(index / 320) % 170;
        energy[index] = 180;
        directionX[index] = index % 2 === 0 ? 1 : -1;
        directionY[index] = index % 3 === 0 ? 1 : 0;
      }

      return { x, y, energy, directionX, directionY, age };
    }

    function runMainThreadTick(buffers, count) {
      const startedAt = performance.now();

      for (let index = 0; index < count; index++) {
        let nextX = buffers.x[index] + buffers.directionX[index];
        let nextY = buffers.y[index] + buffers.directionY[index];

        if (nextX < 0) nextX += 320;
        else if (nextX >= 320) nextX -= 320;

        if (nextY < 0) {
          nextY = 0;
          buffers.directionY[index] = 1;
        } else if (nextY >= 170) {
          nextY = 169;
          buffers.directionY[index] = -1;
        }

        buffers.x[index] = nextX;
        buffers.y[index] = nextY;
        buffers.age[index] += 1;
        buffers.energy[index] = Math.max(0, buffers.energy[index] - 0.01 * (1000 / 30));
      }

      return performance.now() - startedAt;
    }

    function createWorker() {
      const evidence = {
        directWorkerAvailable: true,
        usedBlobFallback: false,
        directWorkerError: ""
      };

      try {
        return {
          worker: new Worker("js/workers/sim-worker.js"),
          evidence
        };
      } catch (error) {
        const workerUrl = URL.createObjectURL(new Blob([window.__PIXELDARIUM_WORKER_SOURCE__], {
          type: "application/javascript"
        }));

        evidence.directWorkerAvailable = false;
        evidence.usedBlobFallback = true;
        evidence.directWorkerError = error && error.message ? error.message : String(error);
        evidence.blobUrl = workerUrl;

        return {
          worker: new Worker(workerUrl),
          evidence
        };
      }
    }

    function request(worker, payload, transfer) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("worker timeout")), 5000);

        worker.onmessage = (event) => {
          clearTimeout(timeout);
          resolve(event.data);
        };
        worker.onerror = (event) => {
          clearTimeout(timeout);
          reject(new Error(event.message || "worker error"));
        };
        worker.postMessage(payload, transfer || []);
      });
    }

    const workerSetup = createWorker();
    const worker = workerSetup.worker;
    const ping = await request(worker, { type: "ping", id: 1 });
    const count = 10000;
    const mainSamples = [];
    const workerSamples = [];
    const workerComputeSamples = [];

    for (let run = 0; run < 6; run++) {
      const mainBuffers = makeBuffers(count);
      mainSamples.push(runMainThreadTick(mainBuffers, count));

      const workerBuffers = makeBuffers(count);
      const sentAt = performance.now();
      const result = await request(worker, {
        type: "tick",
        id: run + 2,
        count,
        width: 320,
        height: 170,
        dt: 1000 / 30,
        x: workerBuffers.x.buffer,
        y: workerBuffers.y.buffer,
        energy: workerBuffers.energy.buffer,
        directionX: workerBuffers.directionX.buffer,
        directionY: workerBuffers.directionY.buffer,
        age: workerBuffers.age.buffer
      }, [
        workerBuffers.x.buffer,
        workerBuffers.y.buffer,
        workerBuffers.energy.buffer,
        workerBuffers.directionX.buffer,
        workerBuffers.directionY.buffer,
        workerBuffers.age.buffer
      ]);

      workerSamples.push(performance.now() - sentAt);
      workerComputeSamples.push(result.workerMs);
      if (result.type !== "tickComplete" || result.count !== count) {
        throw new Error("worker did not complete tick");
      }
    }

    worker.terminate();

    return {
      locationProtocol: location.protocol,
      crossOriginIsolated: Boolean(crossOriginIsolated),
      hasSharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
      workerSetup: workerSetup.evidence,
      workerPing: ping,
      mainThreadAverageMs: average(mainSamples.slice(1)),
      workerRoundTripAverageMs: average(workerSamples.slice(1)),
      workerComputeAverageMs: average(workerComputeSamples.slice(1)),
      transferOverheadAverageMs: average(workerSamples.slice(1)) - average(workerComputeSamples.slice(1)),
      mainSamples: mainSamples.map((value) => Number(value.toFixed(3))),
      workerRoundTripSamples: workerSamples.map((value) => Number(value.toFixed(3))),
      workerComputeSamples: workerComputeSamples.map((value) => Number(value.toFixed(3)))
    };
  });

  await browser.close();

  assert.deepStrictEqual(consoleErrors, [], "browser console should have no errors");
  assert.deepStrictEqual(pageErrors, [], "browser page should have no errors");
  assert.strictEqual(evidence.locationProtocol, "file:", "spike should run under file://");
  assert.strictEqual(evidence.workerPing.type, "pong", "worker or blob fallback should launch under file://");
  assert.ok(evidence.workerRoundTripAverageMs > evidence.workerComputeAverageMs, "round trip should include transfer overhead");

  console.log("webworker spike checks passed", JSON.stringify({
    protocol: evidence.locationProtocol,
    crossOriginIsolated: evidence.crossOriginIsolated,
    hasSharedArrayBuffer: evidence.hasSharedArrayBuffer,
    directWorkerAvailable: evidence.workerSetup.directWorkerAvailable,
    usedBlobFallback: evidence.workerSetup.usedBlobFallback,
    mainThreadAverageMs: Number(evidence.mainThreadAverageMs.toFixed(3)),
    workerRoundTripAverageMs: Number(evidence.workerRoundTripAverageMs.toFixed(3)),
    workerComputeAverageMs: Number(evidence.workerComputeAverageMs.toFixed(3)),
    transferOverheadAverageMs: Number(evidence.transferOverheadAverageMs.toFixed(3))
  }));
})().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
