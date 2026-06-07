# AZR-441 Organism Atlas Identity Evidence

Date: 2026-06-06

## Optimization Gate

- Bottleneck targeted: organism visual identity previously depended on too few cached sprite identities, so evolved watcher-facing traits could collapse into same-looking representatives even when WebGL2 batching was active.
- Representation or lifecycle boundary changed: organism atlas identity now includes bounded body, appendage, camouflage, thermal, and water-dependency buckets before atlas cells are generated and uploaded.
- Chunk, batch, or aggregate boundary used: entity rendering still batches WebGL2 instances by atlas page; organism sprites remain watcher-facing representative facades, not authoritative population state.
- Readiness state required before generated data is consumed: only generated atlas cells with packed RGBA page data and incremented page version are consumed by `entityWebgl`; stale pages continue to render until new cells exist.
- Player-perception contract preserved: zoom, pan, single visible WebGL canvas, and direct `file://` launch behavior are unchanged while local zoom gains trait-readable organism silhouettes and marks.
- New constraint or encoding limit introduced: organism trait keys encode lineage `0..15`, body size `1..6`, body shape `0..7`, limb count `0..12`, appendage type `0..7`, camouflage `0..4`, thermal tolerance `0..4`, water dependency `0..4`, and animation/RANMAP variant `0..3`.
- Metric proving the bottleneck moved: cached 1400-organism atlas lookups measured `0.800ms` in direct `file://` Playwright smoke after cold generation measured `12.600ms`; generated trait cells reached `1403` without page errors or failed requests.

## Direct File Smoke

Target: `file:///C:/Users/Aaron/Azyrra/projects/pixeldarium/index.html`

- Page errors: `0`
- Failed requests: `0`
- Debug text: empty
- WebGL2 ready: `true`
- Presenter single visible canvas: `true`
- Visible canvas count: `1`
- Wheel zoom: `0 -> 0.25`
- Organism atlas trait cells: `1403`
- Baseline key: `entity.organism.trait.1.3.2.6.1.1.1.0.0`
- Aquatic key: `entity.organism.trait.1.3.4.6.5.1.1.4.0`
- Heat-spined key: `entity.organism.trait.1.3.2.12.6.1.4.0.0`
- Unique colors: baseline `14`, aquatic `17`, heat-spined `18`
- Cached 1400-organism lookup: `0.800ms`
- Cold 1400-organism generation: `12.600ms`
- Screenshot: `tmp/azr-441-file-smoke.png`

## Verification Commands

```bash
node tests/organism-atlas-identity.test.js
npm test
npm run build
git diff --check
rg -n "agent-studio|tools/agent-studio" index.html js
```

The final `rg` command returned no matches.
