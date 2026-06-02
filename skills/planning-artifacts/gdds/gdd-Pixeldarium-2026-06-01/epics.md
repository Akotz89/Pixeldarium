# Pixeldarium — Development Epics

## Phase 1: Foundation (Planet Rendering + Performance)

### E1: Planet Rendering — Google Earth Smoothness
**Priority:** 🔴 Critical
**Pillars served:** Seamless Scale, Observable Complexity, Vanilla Browser Mastery

The planet view must be as smooth and interactive as Google Earth. This is the first thing anyone sees.

#### Stories

1. **Globe rendering optimization** — Profile and fix the 8 identified performance bottlenecks in render.js. Target: 60 FPS during continuous zoom. Key issues: O(n) per-pixel globe rasterization, canvas element churn in terrain cache, full-canvas redraw on every frame.
2. **Smooth zoom transitions** — Eliminate pop-in, stutter, and LOD boundary artifacts during zoom. Logarithmic zoom scaling. Chunk pre-loading based on zoom direction.
3. **Chunk streaming performance** — Progressive terrain chunk loading with priority queue. Pan-direction-aware prefetching. Background generation with no frame drops.
4. **Procedural imagery quality** — Terrain textures at every zoom level should be visually interesting. Biome-appropriate coloring, natural-looking coastlines, mountain relief, river systems.
5. **Globe interaction polish** — Mouse drag rotation, scroll zoom, click inspection. All inputs responsive with <16ms latency.

---

### E2: Performance Foundation
**Priority:** 🔴 Critical
**Pillars served:** Vanilla Browser Mastery, Seamless Scale

#### Stories

1. **Spatial indexing overhaul** — Replace O(n) organism/food/settlement lookups with grid-based spatial hash or quadtree. Target: O(1) average for proximity queries.
2. **Memory management** — Object pooling for organisms, food particles. Avoid GC pressure. Monitor memory with performance dashboard.
3. **Simulation tick optimization** — Profile update loop. Identify and fix hot paths. Target: <16ms per tick at 1,000 organisms.
4. **WebWorker evaluation** — Prototype offloading simulation computation to a WebWorker. Measure frame rate improvement. Decide whether to adopt.
5. **Render pipeline separation** — Ensure simulation tick and render frame are fully decoupled. Interpolation between ticks for smooth animation.
6. **Terrain cache optimization** — Fix canvas element churn in buildTerrainCache. Reuse offscreen canvases. Limit cache rebuilds to dirty regions.

---

## Phase 2: Biological Simulation + Core Tools

### E3: Biological Simulation (Epochs 3-4)
**Priority:** 🟡 High
**Pillars served:** Emergent Complexity, Deep Time, Observable Complexity, Living Planet

Deepen the organism system from simple colored dots to visually evolving creatures with meaningful traits.

#### Stories

1. **Expanded trait system** — Add body plan traits (size, limb count, body shape, appendage type) alongside current behavior traits. All traits heritable with mutation.
2. **Continuous morphological rendering** — Organism appearance changes based on trait values. Pixel sprites generated procedurally from trait state. No hard visual categories.
3. **Food web mechanics** — Predator/prey relationships based on traits (speed vs. camouflage, size vs. agility). Energy flows through trophic levels.
4. **Terrain-driven evolution** — Organisms near water develop aquatic traits. Mountain organisms develop cold resistance. Desert organisms develop water efficiency. Terrain affinity drives speciation.
5. **Speciation events** — When a lineage diverges sufficiently in trait space, it splits into distinct species. Reproductive isolation emerges from trait distance.
6. **Mass extinction modeling** — Random catastrophic events (volcanic, asteroid, climate shift) that kill organisms failing survival checks. Adaptive radiation follows extinction.

---

### E4: Primordial + Microbial (Epochs 1-2)
**Priority:** 🟡 High
**Pillars served:** Deep Time, Living Planet, Emergent Complexity

#### Stories

1. **Geological simulation** — Tectonic plate simulation. Continents drift over deep time. Volcanic activity, mountain formation, ocean basin creation.
2. **Atmospheric chemistry** — Model atmospheric composition changes over geological time. Oxygen accumulation, greenhouse effects, ozone layer formation.
3. **Abiogenesis mechanics** — Chemical complexity accumulates based on geological/chemical conditions. Lightning, hydrothermal vents, UV radiation drive molecular evolution.
4. **Microbial simulation** — [EXPERIMENTAL] Prototype multiple approaches: agent-based, field-based, population-based. Select the one that looks best and performs well.
5. **Deep time visualization** — Visual timeline showing geological eras. Color-coded terrain changes over millions of years.

---

### E10: Time Scale System
**Priority:** 🟢 Medium
**Pillars served:** Deep Time, Observable Complexity

#### Stories

1. **Adaptive time baseline** — Sim detects current epoch and sets appropriate time scale automatically.
2. **Event detection system** — Identify significant simulation events (first X, mass extinction, civilization milestone). Trigger spotlight behavior.
3. **Event spotlight UI** — Brief slowdown/pause at significant events. Notification overlay. Player can dismiss or investigate.
4. **Time compression UI** — Clear visual indicator of current time scale. "Watching 10 million years per second" vs "watching 1 day per second."

---

### E9: Observation Tools (Phase 2-4, incremental)
**Priority:** 🟢 Medium
**Pillars served:** Observable Complexity, Seamless Scale

#### Stories (delivered incrementally across phases)

1. **Observation overlays** — Temperature, population density, resource distribution, atmospheric composition maps. Toggle per overlay.
2. **Lineage tracking** — Select and follow a lineage/species across time. Pin to HUD. Show trait evolution over generations.
3. **Statistics dashboard** — Population charts, resource graphs, trait distributions, biodiversity index. Mini-charts in HUD.
4. **Timeline viewer** — Key events listed chronologically. Click to jump camera to event location and time.
5. **Bookmarks/annotations** — Player marks interesting moments with text notes. Persisted to save file.
6. **History scrubbing** — [DEFERRED] Rewind to previous states. Requires snapshot system.
7. **Evolutionary tree visualization** — Show lineage branching as a tree/graph. Highlight active vs. extinct lineages.
8. **Screenshot/recording** — Canvas-to-image export. Possibly canvas-to-video for short clips.

---

## Phase 3: Intelligence + Civilization

### E5: Intelligence + Tribal (Epochs 5-6)
**Priority:** 🟡 High
**Pillars served:** Emergent Complexity, Deep Time

#### Stories

1. **Multi-axis intelligence traits** — Tool use, language, social behavior, planning, memory as independent trait axes. Each evolves separately.
2. **Social group formation** — Organisms with sufficient social traits cluster into persistent groups. Groups have territory, shared resources, and cultural identity.
3. **Cultural transmission** — Learned behaviors (tool techniques, food sources, migration routes) pass to offspring alongside genetic traits. Cultural evolution runs in parallel with biological.
4. **Inter-group dynamics** — Groups encounter each other. Outcomes (trade, conflict, merger, avoidance) depend on social traits, resource state, and cultural similarity.

---

### E6: Civilization Arc (Epochs 7-9)
**Priority:** 🟡 High
**Pillars served:** Emergent Complexity, Living Planet, Observable Complexity

#### Stories

1. **Settlement evolution** — Deepen existing settlement mechanics. Agriculture, crafts, trade, governance emerge from population and technology.
2. **Nation/territory system** — Political entities claim territory. Borders shift based on military, economic, diplomatic power.
3. **Great Filter: Resource wars** — Finite resource modeling. Depletion drives conflict or innovation.
4. **Great Filter: Climate feedback** — Industrial activity modifies atmospheric chemistry. Runaway warming/cooling possible.
5. **Great Filter: Nuclear/WMD** — Advanced civilizations develop self-ending weapons. Game theory between competing nations.
6. **Great Filter: Pandemic** — Disease modeling for dense populations. Quarantine, medicine, spread dynamics.
7. **Great Filter: Political fragmentation** — Empires can fracture. Civil wars, dark ages. Non-linear progress.
8. **Great Filter: Cultural stagnation** — Social ossification. A civilization can plateau at a tech level.
9. **Technology emergence** — Technology is not a tree — it's an emergent consequence of civilization traits. Some civilizations invent the wheel early. Some never do.

---

## Phase 4: Cosmos + Space

### E7: Cosmological Formation (Epoch 0)
**Priority:** 🟢 Medium
**Pillars served:** Deep Time, Seamless Scale, Emergent Complexity

#### Stories

1. **Particle system** — N-body gravity simulation with Barnes-Hut optimization. Dust, gas, stellar formation.
2. **Solar system formation** — Accretion disk dynamics. Planet formation from debris. Orbital mechanics establish.
3. **Initial conditions UI** — Player configures element ratios, stellar mass. Presets for common scenarios.
4. **Formation visualization** — Beautiful visual of dust condensing into a solar system. Stars igniting. Planets coalescing.

---

### E8: Space + Interstellar (Epochs 10-11)
**Priority:** 🟢 Medium
**Pillars served:** Seamless Scale, Emergent Complexity

#### Stories

1. **Orbital mechanics engine** — Keplerian orbits, delta-v calculations, transfer windows. Vanilla JS orbital integrator.
2. **Space program progression** — Civilization develops launch capability. First satellite. First crewed flight. First station.
3. **Solar system view** — Seamless zoom from planet surface to solar system overview. Orbital paths visible.
4. **Interstellar expansion** — Generation ships, colony establishment, multi-system management.
5. **Great Filter: Space** — Getting to space is hard. Most civilizations with nuclear weapons destroy themselves first.

---

## Phase 5: Polish + Endgame

### E11: Transcendence (Epoch 12)
**Priority:** 🔵 Future
**Pillars served:** Deep Time, Emergent Complexity

#### Stories

1. **Kardashev milestones** — Detect when civilizations reach Type I, II, III energy utilization.
2. **Megastructure rendering** — Visual representation of Dyson swarms, stellar engines, etc.
3. **Post-biological mechanics** — Digital consciousness, substrate independence. Emergent from AI/technology traits.
4. **Galactic gardening** — [DEFERRED] Transcendent civilizations seeding new planets, closing the loop.

---

### E12: Audio
**Priority:** 🔵 Future

#### Stories

1. **Procedural ambient generation** — Epoch-aware soundscapes using Web Audio API.
2. **Scale-aware audio** — Sound changes with zoom level. Geological rumble → ocean ambient → city buzz → cosmic tones.

---

### E13: UI/UX Polish
**Priority:** 🟢 Medium (incremental across all phases)

#### Stories

1. **Dashboard redesign** — Clean, modern observation dashboard. Glanceable metrics.
2. **Menu system overhaul** — Better tab organization. Collapsible panels.
3. **Keyboard shortcut expansion** — Full keyboard navigation for power users.
4. **Accessibility pass** — ARIA attributes, screen reader support, color contrast.
5. **Mobile responsiveness** — [DEFERRED to post-v1.0] Touch controls, responsive layout.
