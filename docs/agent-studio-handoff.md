# Pixeldarium Agent Studio Handoff

Pixeldarium Agent Studio is the private, dependency-capable production pipeline
for concept art, sprites, animation previews, modeling references, audio,
narrative/copy validation, evidence bundles, and asset QA.

The source of truth for studio tooling is outside this runtime repo:

- Local root: `/mnt/c/Users/Aaron/Azyrra/projects/pixeldarium-agent-studio`
- GitHub: `Akotz89/Pixeldarium-Agent-Studio`
- Linear project: `Pixeldarium Agent Studio`

## Runtime Boundary

Pixeldarium remains a zero-dependency game runtime:

- `index.html` must run from `file://`.
- Runtime code stays under `js/` using the `PS.*` namespace and script tags.
- No Node, Python, DCC, browser-automation, media-processing, AI-generation, or
  external API dependency can be required to play the game.
- Raw studio outputs, work orders, reports, provider jobs, generated evidence,
  and credentials stay out of this repo.

## Accepted Handoff Shape

Agent Studio outputs can enter this repo only through a reviewed runtime
integration change. That change should include:

- Accepted asset files placed under the runtime asset path chosen by the game
  integration issue.
- Any required runtime manifest, loader, or script-tag changes.
- A short provenance note naming the studio job, source asset, and acceptance
  evidence without copying raw reports or secrets.
- Focused runtime tests or visual evidence for the integration.

Do not integrate generated assets directly from raw studio exports.

## Required Checks

Run these from `/mnt/c/Users/Aaron/Azyrra/projects/pixeldarium` before accepting
studio output into runtime:

```bash
bash .codex/setup.sh
rg -n "agent-studio|tools/agent-studio" index.html js
```

The `rg` command must return no matches. Studio tooling may be mentioned in
documentation, Linear, GitHub PR text, or provenance notes, but runtime files
must not load or depend on it.

Run this from `/mnt/c/Users/Aaron/Azyrra/projects/pixeldarium-agent-studio`
before handing off a candidate:

```bash
npm run validate
```

## Cleanup Rule

The old in-game-repo `tools/agent-studio` copy is retained only as split-review
evidence until the cleanup is approved. New studio work should be created in
the private studio repo.
