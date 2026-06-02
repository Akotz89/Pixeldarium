# Pixeldarium — Full Linear Story Specifications

> [!IMPORTANT]
> **Linear free workspace limit reached at AZR-279.** Stories marked ✅ were created in Linear. Stories marked ⏳ need to be created when the workspace is upgraded or issues are freed up.

## Epic/Issue Index

| Epic | AZR ID | Phase | Milestone | Stories Created |
|------|--------|-------|-----------|-----------------|
| [E0] Project Restructure | AZR-254 | 1 | Phase 1: Foundation | 5/5 ✅ |
| [E1] Planet Rendering | AZR-255 | 1 | Phase 1: Foundation | 5/5 ✅ |
| [E2] Performance Foundation | AZR-256 | 1 | Phase 1: Foundation | 2/6 (AZR-278, AZR-279 ✅; 4 ⏳) |
| [E3] Biological Simulation | AZR-257 | 2 | Phase 2: Biological Simulation | 0/6 ⏳ |
| [E4] Primordial + Microbial | AZR-258 | 2 | Phase 2: Biological Simulation | 0/5 ⏳ |
| [E9] Observation Tools | AZR-259 | 2 | Phase 2: Biological Simulation | 0/8 ⏳ |
| [E10] Time Scale System | AZR-260 | 2 | Phase 2: Biological Simulation | 0/4 ⏳ |
| [E5] Intelligence + Tribal | AZR-261 | 3 | Phase 3: Intelligence + Civilization | 0/4 ⏳ |
| [E6] Civilization Arc | AZR-262 | 3 | Phase 3: Intelligence + Civilization | 0/9 ⏳ |
| [E7] Cosmological Formation | AZR-263 | 4 | Phase 4: Cosmos + Space | 0/4 ⏳ |
| [E8] Space + Interstellar | AZR-264 | 4 | Phase 4: Cosmos + Space | 0/5 ⏳ |
| [E11] Transcendence | AZR-265 | 5 | Phase 5: Polish + Endgame | 0/4 ⏳ |
| [E12] Procedural Audio | AZR-266 | 5 | Phase 5: Polish + Endgame | 0/2 ⏳ |
| [E13] UI/UX Polish | AZR-267 | 5 | Phase 5: Polish + Endgame | 0/5 ⏳ |

**Total: 14 epics, 72 stories. 12 stories created in Linear, 60 remaining.**

---

## Phase 1: Foundation

### [E0] Project Restructure — AZR-254 (all stories created ✅)

| Story | AZR ID | Status |
|-------|--------|--------|
| E0-S1: Establish PS namespace + core infrastructure | AZR-268 | ✅ Created |
| E0-S2: Decompose render.js + planet.js into js/render/ | AZR-269 | ✅ Created |
| E0-S3: Decompose sim files into js/sim/ + js/systems/ | AZR-270 | ✅ Created |
| E0-S4: Decompose ui.js + create js/debug/ infrastructure | AZR-271 | ✅ Created |
| E0-S5: Wire up index.html script loading + verify no regressions | AZR-272 | ✅ Created |

### [E1] Planet Rendering — AZR-255 (all stories created ✅)

| Story | AZR ID | Status |
|-------|--------|--------|
| E1-S1: WebGL2 globe rendering migration | AZR-273 | ✅ Created |
| E1-S2: Smooth zoom transitions + LOD tier system | AZR-274 | ✅ Created |
| E1-S3: Chunk streaming + progressive loading | AZR-275 | ✅ Created |
| E1-S4: Procedural terrain imagery quality | AZR-276 | ✅ Created |
| E1-S5: Globe interaction polish | AZR-277 | ✅ Created |

### [E2] Performance Foundation — AZR-256 (2/6 created)

| Story | AZR ID | Status |
|-------|--------|--------|
| E2-S1: Spatial indexing overhaul | AZR-278 | ✅ Created |
| E2-S2: Memory management + object pooling | AZR-279 | ✅ Created |
| E2-S3: Decoupled accumulator sim loop | — | ⏳ Pending |
| E2-S4: WebWorker evaluation spike | — | ⏳ Pending |
| E2-S5: Render pipeline separation + interpolation | — | ⏳ Pending |
| E2-S6: Terrain cache optimization | — | ⏳ Pending |

---

## ⏳ Remaining Stories — Full Specifications

### E2-S3: Decoupled accumulator sim loop
**Parent:** AZR-256 | **Priority:** Urgent | **Labels:** pixeldarium, performance
**Milestone:** Phase 1: Foundation

#### Goal
Profile and optimize the simulation update loop. Implement the decoupled accumulator pattern from Architecture Decision D2.

#### Acceptance Criteria
- [ ] Implement decoupled accumulator in `js/systems/time.js`
- [ ] Fixed timestep: `PS.time.dt` (default 1000/30 = 33.3ms sim time)
- [ ] MAX_TICKS_PER_FRAME = 4 (prevents spiral of death)
- [ ] Profile tick breakdown: organisms, food, settlements, terrain, events
- [ ] Target: <16ms per tick at 1,000 organisms
- [ ] Target: <8ms per tick at 10,000 organisms (with spatial indexing)
- [ ] Hot path optimization: inline critical paths, avoid function call overhead

---

### E2-S4: WebWorker evaluation spike
**Parent:** AZR-256 | **Priority:** Medium | **Labels:** pixeldarium, performance, native-browser
**Milestone:** Phase 1: Foundation

#### Goal
Prototype offloading simulation computation to a WebWorker. Measure improvement and decide.

#### Acceptance Criteria
- [ ] Create `js/workers/sim-worker.js` with self-contained simulation tick
- [ ] Implement SharedArrayBuffer or transferable Float32Array communication
- [ ] Measure frame rate improvement with worker vs main thread
- [ ] Measure latency of worker communication overhead
- [ ] Document findings: performance gain vs complexity tradeoff
- [ ] Decision: adopt WebWorker or stay single-threaded
- [ ] Note: file:// protocol may restrict WebWorker creation

---

### E2-S5: Render pipeline separation + interpolation
**Parent:** AZR-256 | **Priority:** High | **Labels:** pixeldarium, performance, rendering
**Milestone:** Phase 1: Foundation

#### Goal
Ensure simulation tick and render frame are fully decoupled with interpolation between ticks.

#### Acceptance Criteria
- [ ] Render runs at display FPS (requestAnimationFrame)
- [ ] Simulation runs at fixed rate (independent of display FPS)
- [ ] Entity positions interpolated between ticks for smooth motion
- [ ] Interpolation factor = accumulator / dt
- [ ] No visual stutter when sim tick takes longer than frame time
- [ ] FPS counter shows render FPS separately from sim TPS

---

### E2-S6: Terrain cache optimization
**Parent:** AZR-256 | **Priority:** High | **Labels:** pixeldarium, performance
**Milestone:** Phase 1: Foundation

#### Goal
Fix terrain cache canvas element churn. Reuse offscreen canvases. Limit rebuilds to dirty regions.

#### Acceptance Criteria
- [ ] Offscreen canvas pool: reuse canvases instead of creating/destroying
- [ ] Dirty region tracking: only rebuild chunks that have changed
- [ ] Cache invalidation: timestamp-based staleness detection
- [ ] Memory-bounded cache: LRU eviction when cache exceeds limit
- [ ] Target: zero DOM canvas creation during normal gameplay

---

## Phase 2: Biological Simulation

### [E3] Biological Simulation — AZR-257

#### E3-S1: Expanded trait system
**Parent:** AZR-257 | **Priority:** High | **Labels:** pixeldarium, simulation, mechanics
**Milestone:** Phase 2: Biological Simulation

##### Goal
Add body plan traits alongside current behavior traits. All traits heritable with mutation.

##### Acceptance Criteria
- [ ] Body plan traits: size (Float32), limb_count (Uint8), body_shape (Uint8), appendage_type (Uint8)
- [ ] Behavior traits extended: camouflage, thermal_tolerance, water_dependency
- [ ] All traits stored in typed arrays per D3 architecture
- [ ] Mutation rate configurable per trait via `PS.config.evolution.mutationRates`
- [ ] Trait inheritance: blended for continuous traits, dominant/recessive for discrete
- [ ] Trait bounds enforcement (no negative size, no 255+ limbs)
- [ ] Unit test: verify trait inheritance over 100 generations

---

#### E3-S2: Continuous morphological rendering
**Parent:** AZR-257 | **Priority:** High | **Labels:** pixeldarium, visuals, mechanics
**Milestone:** Phase 2: Biological Simulation

##### Goal
Organism appearance changes based on trait values. Procedural pixel sprites from trait state.

##### Acceptance Criteria
- [ ] Sprite generation function in `js/render/entities.js`: `generateSprite(traitArray, entityId)`
- [ ] Size trait → pixel dimensions
- [ ] Limb count → appendage pixels
- [ ] Body shape → outline silhouette
- [ ] Color derived from camouflage trait + terrain affinity
- [ ] Sprites cached and only regenerated on significant trait change
- [ ] No hard visual categories — continuous morphological variation
- [ ] 1000 unique organisms visually distinguishable at region zoom

---

#### E3-S3: Food web mechanics
**Parent:** AZR-257 | **Priority:** High | **Labels:** pixeldarium, simulation, mechanics
**Milestone:** Phase 2: Biological Simulation

##### Goal
Predator/prey relationships based on traits. Energy flows through trophic levels.

##### Acceptance Criteria
- [ ] Predation decision: speed vs camouflage, size vs agility comparison
- [ ] Energy transfer: predator gains fraction of prey's energy
- [ ] Trophic levels emerge naturally (producers → herbivores → predators)
- [ ] Population dynamics: Lotka-Volterra-style oscillations emerge
- [ ] Spatial indexing used for prey detection (`PS.spatial.queryRadius`)
- [ ] Starvation mechanics: energy depletion → death
- [ ] Food scarcity drives migration

---

#### E3-S4: Terrain-driven evolution
**Parent:** AZR-257 | **Priority:** Medium | **Labels:** pixeldarium, simulation, mechanics, geology
**Milestone:** Phase 2: Biological Simulation

##### Goal
Organisms develop traits based on their terrain environment. Terrain affinity drives speciation.

##### Acceptance Criteria
- [ ] Water proximity → aquatic trait development
- [ ] Mountain altitude → cold resistance, lung capacity
- [ ] Desert → water efficiency, heat tolerance
- [ ] Forest → camouflage, climbing ability
- [ ] Trait selection pressure: organisms with terrain-mismatched traits have lower survival
- [ ] Geographic isolation enables speciation (mountain ranges, oceans as barriers)
- [ ] Environmental trait changes propagated through PS.events

---

#### E3-S5: Speciation events
**Parent:** AZR-257 | **Priority:** Medium | **Labels:** pixeldarium, simulation, mechanics
**Milestone:** Phase 2: Biological Simulation

##### Goal
When a lineage diverges sufficiently in trait space, it splits into distinct species.

##### Acceptance Criteria
- [ ] Species tracking: each organism has a `speciesId` (Uint16Array)
- [ ] Trait distance metric: Euclidean distance in normalized trait space
- [ ] Speciation threshold: configurable via `PS.config.evolution.speciationDistance`
- [ ] When trait distance between two mating candidates > threshold → reproductive isolation
- [ ] New speciesId assigned on speciation event
- [ ] PS.events.emit('species.new', { id, parentId, traits }) on speciation
- [ ] Species count tracked as key metric in HUD

---

#### E3-S6: Mass extinction modeling
**Parent:** AZR-257 | **Priority:** Medium | **Labels:** pixeldarium, simulation, mechanics
**Milestone:** Phase 2: Biological Simulation

##### Goal
Random catastrophic events that kill organisms failing survival checks. Adaptive radiation follows.

##### Acceptance Criteria
- [ ] Extinction event types: volcanic, asteroid, climate shift, disease
- [ ] Event frequency configurable: `PS.config.events.extinctionRate`
- [ ] Survival check: trait-dependent (cold resistance for ice age, etc.)
- [ ] Mass death: 50-90% organism loss during major events
- [ ] Adaptive radiation: empty niches filled rapidly by survivors
- [ ] PS.events.emit('extinction.event', { type, severity, survivors })
- [ ] Event spotlight notification with slowdown
- [ ] Visual: atmospheric effects during extinction events

---

### [E4] Primordial + Microbial — AZR-258

#### E4-S1: Geological simulation
**Parent:** AZR-258 | **Priority:** High | **Labels:** pixeldarium, simulation, geology, epoch
**Milestone:** Phase 2: Biological Simulation

##### Goal
Tectonic plate simulation. Continents drift over deep time.

##### Acceptance Criteria
- [ ] Implement `PS.layers.geology` in `js/layers/geology.js`
- [ ] Tectonic plates: 6-12 plates defined at world creation
- [ ] Plate drift: plates move at configurable rates
- [ ] Collision zones: mountain formation at convergent boundaries
- [ ] Subduction zones: oceanic plate diving under continental
- [ ] Volcanic activity at hotspots and plate boundaries
- [ ] Erosion: mountains slowly erode, sediment fills basins
- [ ] Continental formation over geological time
- [ ] Always-on: geology layer runs in ALL epochs (D6)

---

#### E4-S2: Atmospheric chemistry
**Parent:** AZR-258 | **Priority:** High | **Labels:** pixeldarium, simulation, epoch
**Milestone:** Phase 2: Biological Simulation

##### Goal
Model atmospheric composition changes over geological time.

##### Acceptance Criteria
- [ ] Implement `PS.layers.atmosphere` in `js/layers/atmosphere.js`
- [ ] Track gas composition: CO2, O2, N2, CH4, H2O vapor, O3
- [ ] Volcanic outgassing adds CO2 and sulfur
- [ ] O2 accumulation from photosynthetic organisms
- [ ] Greenhouse effect: temperature varies with CO2/CH4 concentration
- [ ] Ozone layer formation when O2 exceeds threshold
- [ ] Atmospheric state affects organism survival (O2 requirement)
- [ ] Always-on: atmosphere layer runs in ALL epochs (D6)

---

#### E4-S3: Abiogenesis mechanics
**Parent:** AZR-258 | **Priority:** High | **Labels:** pixeldarium, simulation, epoch, mechanics
**Milestone:** Phase 2: Biological Simulation

##### Goal
Chemical complexity accumulates based on geological/chemical conditions until life emerges.

##### Acceptance Criteria
- [ ] Chemical complexity counter per terrain chunk
- [ ] Complexity sources: lightning, hydrothermal vents, UV radiation, tidal pools
- [ ] Complexity threshold: when reached, first proto-organisms spawn
- [ ] Multiple independent abiogenesis sites possible
- [ ] Epoch transition: detect() in `js/epochs/primordial.js` checks complexity
- [ ] PS.events.emit('epoch.transition', { from: 'primordial', to: 'microbial' })
- [ ] Visual: chemical soup rendering in warm shallow water

---

#### E4-S4: Microbial simulation [EXPERIMENTAL]
**Parent:** AZR-258 | **Priority:** Medium | **Labels:** pixeldarium, simulation, epoch
**Milestone:** Phase 2: Biological Simulation

##### Goal
Prototype multiple approaches for microbial life simulation. Select the best.

##### Acceptance Criteria
- [ ] Prototype A: Agent-based (individual microbes with simple behavior)
- [ ] Prototype B: Field-based (density fields for microbial populations)
- [ ] Prototype C: Population-based (group statistics, no individuals)
- [ ] Evaluate each on: visual quality, performance at scale, emergent behavior
- [ ] Select winner based on evaluation
- [ ] Implement selected approach in `js/epochs/microbial.js`
- [ ] Microbial life should be VISIBLE at planet zoom (colony blooms, stromatolites)

---

#### E4-S5: Deep time visualization
**Parent:** AZR-258 | **Priority:** Medium | **Labels:** pixeldarium, visuals, epoch
**Milestone:** Phase 2: Biological Simulation

##### Goal
Visual timeline showing geological eras. Color-coded terrain changes over millions of years.

##### Acceptance Criteria
- [ ] Timeline bar at bottom of screen showing geological eras
- [ ] Color-coded era markers (Hadean, Archean, Proterozoic, etc.)
- [ ] Current position highlighted on timeline
- [ ] Terrain color shifts over geological time (barren → green → diverse)
- [ ] Click on timeline era to jump to that time period
- [ ] Era labels auto-generated from simulation events

---

### [E10] Time Scale System — AZR-260

#### E10-S1: Adaptive time baseline
**Parent:** AZR-260 | **Priority:** High | **Labels:** pixeldarium, simulation
**Milestone:** Phase 2: Biological Simulation

##### Acceptance Criteria
- [ ] PS.time detects current epoch from PS.epochs.current
- [ ] Time scale set automatically per epoch (see architecture time scale table)
- [ ] Smooth transition between time scales during epoch changes
- [ ] Player override: manual time scale slider

---

#### E10-S2: Event detection system
**Parent:** AZR-260 | **Priority:** High | **Labels:** pixeldarium, simulation
**Milestone:** Phase 2: Biological Simulation

##### Acceptance Criteria
- [ ] Event registry: significant events defined per epoch
- [ ] Detection: first life, first multicellular, first tool use, first city, etc.
- [ ] Each event fires PS.events.emit('milestone.reached', { type, details })
- [ ] Events logged to timeline for future playback

---

#### E10-S3: Event spotlight UI
**Parent:** AZR-260 | **Priority:** Medium | **Labels:** pixeldarium, visuals
**Milestone:** Phase 2: Biological Simulation

##### Acceptance Criteria
- [ ] Brief slowdown (4x→1x) at significant events
- [ ] Notification overlay with event name and description
- [ ] Camera pans to event location
- [ ] Player can dismiss or investigate
- [ ] Spotlight behavior configurable (auto-pan, slowdown duration)

---

#### E10-S4: Time compression UI
**Parent:** AZR-260 | **Priority:** Medium | **Labels:** pixeldarium, visuals
**Milestone:** Phase 2: Biological Simulation

##### Acceptance Criteria
- [ ] Clear indicator: "Watching 10 million years per second"
- [ ] Unit auto-adapts: years, millennia, millions of years, etc.
- [ ] Speed control: +/- buttons or slider
- [ ] Pause/play with space bar
- [ ] Visual clock/calendar metaphor for human-scale epochs

---

### [E9] Observation Tools — AZR-259

#### E9-S1: Observation overlays
**Parent:** AZR-259 | **Priority:** High | **Labels:** pixeldarium, visuals
**Milestone:** Phase 2: Biological Simulation

##### Acceptance Criteria
- [ ] Temperature overlay: heat map
- [ ] Population density overlay: organism count per chunk
- [ ] Resource distribution overlay: food availability
- [ ] Atmospheric composition overlay: O2/CO2 concentration
- [ ] Toggle per overlay via keyboard shortcut or panel button
- [ ] Overlays composited via WebGL2 blend modes
- [ ] Performance: overlays add <2ms to frame time

---

#### E9-S2: Lineage tracking
**Parent:** AZR-259 | **Priority:** High | **Labels:** pixeldarium, visuals, mechanics
**Milestone:** Phase 2: Biological Simulation

##### Acceptance Criteria
- [ ] Click organism to select its lineage/species
- [ ] Pin lineage to HUD
- [ ] Show trait evolution over generations (line charts)
- [ ] Highlight all members of selected species on globe
- [ ] Lineage history: parent species, speciation events, extinction
- [ ] Population trend for selected species

---

#### E9-S3: Statistics dashboard
**Parent:** AZR-259 | **Priority:** Medium | **Labels:** pixeldarium, visuals
**Milestone:** Phase 2: Biological Simulation

##### Acceptance Criteria
- [ ] Population charts: total organisms, by species, by biome
- [ ] Resource graphs: food availability, energy flow
- [ ] Trait distributions: histograms of key traits
- [ ] Biodiversity index: Shannon diversity index or similar
- [ ] Mini-charts in HUD (sparklines)
- [ ] Full dashboard in side panel

---

#### E9-S4: Timeline viewer
**Parent:** AZR-259 | **Priority:** Medium | **Labels:** pixeldarium, visuals
**Milestone:** Phase 2: Biological Simulation

##### Acceptance Criteria
- [ ] Key events listed chronologically
- [ ] Click event to jump camera to location and time
- [ ] Filter by event type (extinction, speciation, civilization)
- [ ] Events auto-recorded from PS.events

---

#### E9-S5: Bookmarks/annotations
**Parent:** AZR-259 | **Priority:** Low | **Labels:** pixeldarium, visuals, persistence
**Milestone:** Phase 2: Biological Simulation

##### Acceptance Criteria
- [ ] Player marks interesting moments with text notes
- [ ] Bookmarks include: timestamp, camera position, screenshot
- [ ] Bookmarks persisted to save file
- [ ] Bookmark list accessible from observation panel

---

#### E9-S6: History scrubbing [DEFERRED]
**Parent:** AZR-259 | **Priority:** Low | **Labels:** pixeldarium, simulation, persistence
**Milestone:** Phase 2: Biological Simulation

##### Acceptance Criteria
- [ ] Rewind to previous states via timeline
- [ ] Requires snapshot system (periodic world state checkpoints)
- [ ] DEFERRED: implement after core sim is stable

---

#### E9-S7: Evolutionary tree visualization
**Parent:** AZR-259 | **Priority:** Medium | **Labels:** pixeldarium, visuals, mechanics
**Milestone:** Phase 2: Biological Simulation

##### Acceptance Criteria
- [ ] Show lineage branching as a tree/graph
- [ ] Highlight active vs extinct lineages
- [ ] Zoom/pan within tree view
- [ ] Click species node to select and track

---

#### E9-S8: Screenshot/recording export
**Parent:** AZR-259 | **Priority:** Low | **Labels:** pixeldarium, native-browser
**Milestone:** Phase 2: Biological Simulation

##### Acceptance Criteria
- [ ] Canvas-to-image export (PNG) via button
- [ ] Include HUD overlay option
- [ ] Canvas-to-video for short clips (MediaRecorder API)
- [ ] File download via `<a download>`

---

## Phase 3: Intelligence + Civilization

### [E5] Intelligence + Tribal — AZR-261

#### E5-S1: Multi-axis intelligence traits
**Parent:** AZR-261 | **Priority:** High | **Labels:** pixeldarium, simulation, mechanics, epoch
**Milestone:** Phase 3: Intelligence + Civilization

##### Acceptance Criteria
- [ ] Independent trait axes: tool_use, language, social_behavior, planning, memory
- [ ] Each stored as Float32 in organism typed arrays
- [ ] Each evolves independently with separate mutation rates
- [ ] Intelligence is NOT a single score — it's a multi-dimensional space
- [ ] Some species may develop high tool use but low language
- [ ] PS.config.evolution.intelligenceThresholds for epoch transition

---

#### E5-S2: Social group formation
**Parent:** AZR-261 | **Priority:** High | **Labels:** pixeldarium, simulation, mechanics
**Milestone:** Phase 3: Intelligence + Civilization

##### Acceptance Criteria
- [ ] Organisms with social_behavior > threshold form groups
- [ ] Group data structure: member list, territory center, shared resources, cultural identity
- [ ] Groups managed as class instances (D3: <1000 entities)
- [ ] Territory: spatial area claimed by group
- [ ] Shared resources: food pooling within group
- [ ] Group splitting: when group exceeds size threshold, splits along trait lines

---

#### E5-S3: Cultural transmission
**Parent:** AZR-261 | **Priority:** Medium | **Labels:** pixeldarium, simulation, mechanics
**Milestone:** Phase 3: Intelligence + Civilization

##### Acceptance Criteria
- [ ] Cultural traits: tool_techniques, food_knowledge, migration_routes, social_norms
- [ ] Cultural traits pass to offspring alongside genetic traits
- [ ] Cultural transmission rate separate from genetic mutation rate
- [ ] Cultural evolution runs faster than biological evolution
- [ ] Cultural diversity emerges from geographic isolation
- [ ] PS.events.emit('culture.innovation', { groupId, type })

---

#### E5-S4: Inter-group dynamics
**Parent:** AZR-261 | **Priority:** Medium | **Labels:** pixeldarium, simulation, mechanics
**Milestone:** Phase 3: Intelligence + Civilization

##### Acceptance Criteria
- [ ] Encounter types: trade, conflict, merger, avoidance
- [ ] Outcome determined by: social traits, resource state, cultural similarity
- [ ] Trade: resource exchange, cultural diffusion
- [ ] Conflict: size, aggression, tool_use comparison
- [ ] Merger: similar cultures merge into larger group
- [ ] Avoidance: one group migrates away
- [ ] Inter-group dynamics logged as events

---

### [E6] Civilization Arc — AZR-262

#### E6-S1: Settlement evolution
**Parent:** AZR-262 | **Priority:** High | **Labels:** pixeldarium, simulation, epoch
**Milestone:** Phase 3: Intelligence + Civilization

##### Acceptance Criteria
- [ ] Deepen existing settlement mechanics in `js/sim/settlements.js`
- [ ] Agriculture emergence: food_knowledge + suitable terrain → farming
- [ ] Crafts: tool_use + resources → specialized production
- [ ] Trade: multiple settlements exchange goods
- [ ] Governance: social_behavior + population → political structure
- [ ] Settlement growth: population, infrastructure, technology level
- [ ] Visual: settlement appearance changes with tech level

---

#### E6-S2: Nation/territory system
**Parent:** AZR-262 | **Priority:** High | **Labels:** pixeldarium, simulation
**Milestone:** Phase 3: Intelligence + Civilization

##### Acceptance Criteria
- [ ] Political entities claim territory (nation concept)
- [ ] Borders rendered on globe (territory overlay)
- [ ] Border shifts based on: military, economic, diplomatic power
- [ ] Alliances, vassal relationships, trade agreements
- [ ] Nation state tracked as class instance

---

#### E6-S3: Great Filter — Resource wars
**Parent:** AZR-262 | **Priority:** Medium | **Labels:** pixeldarium, simulation, mechanics
**Milestone:** Phase 3: Intelligence + Civilization

##### Acceptance Criteria
- [ ] Finite resource modeling per terrain chunk
- [ ] Resource depletion drives conflict between nations
- [ ] War mechanics: strength = population * technology * resources
- [ ] Resource wars can collapse civilizations
- [ ] Innovation alternative: technology can unlock new resources
- [ ] PS.events.emit('great-filter.triggered', { type: 'resource-wars' })

---

#### E6-S4: Great Filter — Climate feedback
**Parent:** AZR-262 | **Priority:** Medium | **Labels:** pixeldarium, simulation, mechanics, geology
**Milestone:** Phase 3: Intelligence + Civilization

##### Acceptance Criteria
- [ ] Industrial activity adds CO2 to atmosphere layer
- [ ] Greenhouse effect amplifies: temperature rises
- [ ] Runaway warming possible if emissions exceed absorption
- [ ] Climate change effects: crop failure, flooding, desertification
- [ ] Civilization response: emissions reduction technology (emergent)
- [ ] Feedback loop: worse climate → less food → less industry → partial recovery

---

#### E6-S5: Great Filter — Nuclear/WMD
**Parent:** AZR-262 | **Priority:** Medium | **Labels:** pixeldarium, simulation, mechanics
**Milestone:** Phase 3: Intelligence + Civilization

##### Acceptance Criteria
- [ ] Advanced civilizations develop WMD at technology threshold
- [ ] Game theory between competing nations: arms race dynamics
- [ ] Nuclear exchange: massive population loss, nuclear winter (atmosphere effects)
- [ ] Deterrence: mutual assured destruction can prevent use
- [ ] Probability of use increases with number of nuclear-armed nations
- [ ] Surviving nuclear exchange → technology regression

---

#### E6-S6: Great Filter — Pandemic
**Parent:** AZR-262 | **Priority:** Medium | **Labels:** pixeldarium, simulation, mechanics
**Milestone:** Phase 3: Intelligence + Civilization

##### Acceptance Criteria
- [ ] Disease modeling for dense populations
- [ ] Spread dynamics: population density, trade routes, travel
- [ ] Quarantine mechanics: social_behavior affects response
- [ ] Medicine development: technology level affects treatment
- [ ] Pandemic severity: mortality rate based on population density and medical tech
- [ ] Historical pandemics can set civilizations back centuries

---

#### E6-S7: Great Filter — Political fragmentation
**Parent:** AZR-262 | **Priority:** Low | **Labels:** pixeldarium, simulation
**Milestone:** Phase 3: Intelligence + Civilization

##### Acceptance Criteria
- [ ] Empires can fracture under internal pressure
- [ ] Civil wars trigger when internal cultural diversity exceeds governance capacity
- [ ] Dark ages: technology and population regression
- [ ] Non-linear progress: civilization can regress multiple tech levels
- [ ] Recovery possible: dark ages end when new governance emerges

---

#### E6-S8: Great Filter — Cultural stagnation
**Parent:** AZR-262 | **Priority:** Low | **Labels:** pixeldarium, simulation
**Milestone:** Phase 3: Intelligence + Civilization

##### Acceptance Criteria
- [ ] Social ossification: innovation rate drops when social_norms become rigid
- [ ] Civilization plateaus at a tech level for extended periods
- [ ] External pressure (contact with other civilizations) can break stagnation
- [ ] Some civilizations never advance past a tech level — that's valid

---

#### E6-S9: Technology emergence
**Parent:** AZR-262 | **Priority:** High | **Labels:** pixeldarium, simulation, mechanics
**Milestone:** Phase 3: Intelligence + Civilization

##### Acceptance Criteria
- [ ] Technology is NOT a tech tree — it's emergent from traits
- [ ] Tool use + resource access + population = technology probability
- [ ] Some civilizations invent the wheel early. Some never do.
- [ ] Technology categories: agriculture, metallurgy, medicine, energy, weapons, communication
- [ ] Each technology has prerequisites (trait thresholds + resource requirements)
- [ ] Technology diffusion: spreads between civilizations via trade/contact

---

## Phase 4: Cosmos + Space

### [E7] Cosmological Formation — AZR-263

#### E7-S1: N-body particle system
**Parent:** AZR-263 | **Priority:** High | **Labels:** pixeldarium, simulation, epoch
**Milestone:** Phase 4: Cosmos + Space

##### Acceptance Criteria
- [ ] Barnes-Hut octree for O(n log n) gravity calculation
- [ ] Particle types: dust, gas, rock, ice, metal
- [ ] Gravity simulation: particles attract based on mass
- [ ] Collision detection: particles merge on contact
- [ ] 10,000+ particles at 60 FPS
- [ ] WebGL2 instanced rendering for particles

---

#### E7-S2: Solar system formation
**Parent:** AZR-263 | **Priority:** High | **Labels:** pixeldarium, simulation, epoch
**Milestone:** Phase 4: Cosmos + Space

##### Acceptance Criteria
- [ ] Accretion disk dynamics: initial dust cloud collapses
- [ ] Planetesimal formation: dust clumps into larger bodies
- [ ] Planet formation: planetesimals merge into planets
- [ ] Orbital mechanics established: stable orbits from chaotic formation
- [ ] Star ignition: central mass reaches fusion threshold
- [ ] Multiple planets per system (deterministic from initial conditions)

---

#### E7-S3: Initial conditions UI
**Parent:** AZR-263 | **Priority:** Medium | **Labels:** pixeldarium, visuals
**Milestone:** Phase 4: Cosmos + Space

##### Acceptance Criteria
- [ ] Configure element ratios (hydrogen, helium, metals)
- [ ] Configure stellar mass (red dwarf → blue giant)
- [ ] Presets: Sol-like, red dwarf, binary system
- [ ] Seed input for deterministic generation
- [ ] Preview before simulation starts

---

#### E7-S4: Formation visualization
**Parent:** AZR-263 | **Priority:** Medium | **Labels:** pixeldarium, visuals, rendering
**Milestone:** Phase 4: Cosmos + Space

##### Acceptance Criteria
- [ ] Beautiful visual of dust condensing into solar system
- [ ] Star ignition: bright flash when fusion begins
- [ ] Accretion disk: swirling particle effects
- [ ] Planet coalescing: visible mass accumulation
- [ ] Real-time 60 FPS during formation sequence

---

### [E8] Space + Interstellar — AZR-264

#### E8-S1: Orbital mechanics engine
**Parent:** AZR-264 | **Priority:** High | **Labels:** pixeldarium, simulation
**Milestone:** Phase 4: Cosmos + Space

##### Acceptance Criteria
- [ ] Keplerian orbit calculation (semi-major axis, eccentricity, inclination)
- [ ] Delta-v calculations for transfer orbits
- [ ] Transfer windows between planets (Hohmann transfers)
- [ ] Vanilla JS orbital integrator (no libraries)
- [ ] Orbit prediction: future position calculation

---

#### E8-S2: Space program progression
**Parent:** AZR-264 | **Priority:** High | **Labels:** pixeldarium, simulation, epoch
**Milestone:** Phase 4: Cosmos + Space

##### Acceptance Criteria
- [ ] Space capability emerges from civilization tech level
- [ ] Milestones: first satellite, first crewed flight, space station, moon landing
- [ ] Each milestone requires technology + resources + political will
- [ ] Not all civilizations achieve spaceflight
- [ ] PS.events.emit('space.milestone', { type, civilizationId })

---

#### E8-S3: Solar system view
**Parent:** AZR-264 | **Priority:** High | **Labels:** pixeldarium, rendering, visuals
**Milestone:** Phase 4: Cosmos + Space

##### Acceptance Criteria
- [ ] Seamless zoom from planet surface to solar system overview
- [ ] Orbital paths rendered as ellipses
- [ ] Planet positions calculated from orbital mechanics
- [ ] LOD tier: galaxy scale (zoom [1,3])
- [ ] Spacecraft visible as dots/icons at solar system scale

---

#### E8-S4: Interstellar expansion
**Parent:** AZR-264 | **Priority:** Medium | **Labels:** pixeldarium, simulation, epoch
**Milestone:** Phase 4: Cosmos + Space

##### Acceptance Criteria
- [ ] Generation ships: long-duration interstellar travel
- [ ] Colony establishment at destination
- [ ] Multi-system management
- [ ] Communication delay between systems
- [ ] Colony divergence: cultures evolve independently

---

#### E8-S5: Great Filter — Space
**Parent:** AZR-264 | **Priority:** Medium | **Labels:** pixeldarium, simulation, mechanics
**Milestone:** Phase 4: Cosmos + Space

##### Acceptance Criteria
- [ ] Getting to orbit is hard — high technology + resource cost
- [ ] Most civilizations with nuclear weapons destroy themselves before spaceflight
- [ ] Space achievement requires cooperation (social traits + governance)
- [ ] Failed space programs: rockets crash, funding cut
- [ ] Success probability based on civilization traits composite

---

## Phase 5: Polish + Endgame

### [E11] Transcendence — AZR-265

#### E11-S1: Kardashev milestones
**Parent:** AZR-265 | **Priority:** Low | **Labels:** pixeldarium, simulation, epoch
**Milestone:** Phase 5: Polish + Endgame

##### Acceptance Criteria
- [ ] Detect Type I: planetary energy utilization
- [ ] Detect Type II: stellar energy utilization (Dyson swarm)
- [ ] Detect Type III: galactic energy utilization
- [ ] Each milestone triggers PS.events.emit('kardashev.reached', { level })
- [ ] HUD indicator shows Kardashev level

---

#### E11-S2: Megastructure rendering
**Parent:** AZR-265 | **Priority:** Low | **Labels:** pixeldarium, rendering, visuals
**Milestone:** Phase 5: Polish + Endgame

##### Acceptance Criteria
- [ ] Dyson swarm: particles orbiting star
- [ ] Stellar engines: visible thrust effects
- [ ] Ringworld/habitat structures at appropriate scale
- [ ] WebGL2 instanced rendering for mega-scale objects

---

#### E11-S3: Post-biological mechanics
**Parent:** AZR-265 | **Priority:** Low | **Labels:** pixeldarium, simulation, mechanics
**Milestone:** Phase 5: Polish + Endgame

##### Acceptance Criteria
- [ ] Digital consciousness: emerges from AI technology trait
- [ ] Substrate independence: consciousness no longer tied to biological organisms
- [ ] Virtual populations: entity count can grow beyond physical limits
- [ ] Post-biological civilizations have different resource needs

---

#### E11-S4: Galactic gardening [DEFERRED]
**Parent:** AZR-265 | **Priority:** Low | **Labels:** pixeldarium, simulation
**Milestone:** Phase 5: Polish + Endgame

##### Acceptance Criteria
- [ ] Transcendent civilizations seed new planets
- [ ] Closes the cosmic loop: simulation can restart
- [ ] DEFERRED: implement only if core game is complete

---

### [E12] Procedural Audio — AZR-266

#### E12-S1: Procedural ambient generation
**Parent:** AZR-266 | **Priority:** Low | **Labels:** pixeldarium, native-browser
**Milestone:** Phase 5: Polish + Endgame

##### Acceptance Criteria
- [ ] Web Audio API oscillators and filters
- [ ] Epoch-aware: soundscape changes per current epoch
- [ ] Cosmological: deep bass drones, particle sparkle
- [ ] Primordial: volcanic rumble, ocean waves, rain
- [ ] Biological: insect buzz, wind, animal calls
- [ ] Civilization: distant city hum, machinery
- [ ] All procedurally generated — zero audio files

---

#### E12-S2: Scale-aware audio
**Parent:** AZR-266 | **Priority:** Low | **Labels:** pixeldarium, native-browser
**Milestone:** Phase 5: Polish + Endgame

##### Acceptance Criteria
- [ ] Zoom level affects audio mix
- [ ] Galaxy zoom: cosmic ambient tones
- [ ] Planet zoom: geological rumble, ocean
- [ ] Continent: wind, weather
- [ ] Region: biome-specific ambient
- [ ] Local: individual organism sounds
- [ ] Smooth audio transitions during zoom

---

### [E13] UI/UX Polish — AZR-267

#### E13-S1: Dashboard redesign
**Parent:** AZR-267 | **Priority:** Medium | **Labels:** pixeldarium, visuals
**Milestone:** Phase 5: Polish + Endgame

##### Acceptance Criteria
- [ ] Clean, modern observation dashboard
- [ ] Glanceable metrics: population, species count, epoch, time scale
- [ ] Consistent color scheme aligned with Pixeldarium visual identity
- [ ] Dark mode as default
- [ ] Panels don't obscure simulation view

---

#### E13-S2: Menu system overhaul
**Parent:** AZR-267 | **Priority:** Medium | **Labels:** pixeldarium, visuals
**Milestone:** Phase 5: Polish + Endgame

##### Acceptance Criteria
- [ ] Better tab organization
- [ ] Collapsible panels
- [ ] Panel state persisted to save file
- [ ] Consistent interaction patterns

---

#### E13-S3: Keyboard shortcut expansion
**Parent:** AZR-267 | **Priority:** Medium | **Labels:** pixeldarium, native-browser
**Milestone:** Phase 5: Polish + Endgame

##### Acceptance Criteria
- [ ] Full keyboard navigation for power users
- [ ] Keyboard shortcut help panel (? key)
- [ ] Customizable keybindings via PS.config
- [ ] No conflicts with browser defaults

---

#### E13-S4: Accessibility pass
**Parent:** AZR-267 | **Priority:** Medium | **Labels:** pixeldarium, visuals
**Milestone:** Phase 5: Polish + Endgame

##### Acceptance Criteria
- [ ] ARIA attributes on all interactive elements
- [ ] Screen reader support for key metrics
- [ ] Color contrast: WCAG AA minimum
- [ ] Focus indicators for keyboard navigation
- [ ] High contrast mode option

---

#### E13-S5: Mobile responsiveness [DEFERRED]
**Parent:** AZR-267 | **Priority:** Low | **Labels:** pixeldarium, visuals, native-browser
**Milestone:** Phase 5: Polish + Endgame

##### Acceptance Criteria
- [ ] Touch controls: pinch zoom, drag pan
- [ ] Responsive layout: panels stack on mobile
- [ ] Performance acceptable on mobile GPU
- [ ] DEFERRED to post-v1.0

---

## Dependency Graph

```
E0 ──→ E1 ──→ E3 ──→ E5 ──→ E6 ──→ E8 ──→ E11
  ├──→ E2    ├──→ E4         ├──→ E7
  │         ├──→ E9 (incremental)
  │         └──→ E10
  └──→ E13 (incremental)
  └──→ E12 (standalone after Phase 3)
```

## Blocking Relations

| Issue | Blocks |
|-------|--------|
| AZR-254 (E0) | AZR-255 (E1), AZR-256 (E2) |
| AZR-255 (E1) | AZR-257 (E3), AZR-258 (E4), AZR-263 (E7) |
| AZR-256 (E2) | AZR-257 (E3), AZR-258 (E4) |
| AZR-257 (E3) | AZR-261 (E5) |
| AZR-261 (E5) | AZR-262 (E6) |
| AZR-262 (E6) | AZR-264 (E8) |
| AZR-263 (E7) | AZR-264 (E8) |
| AZR-264 (E8) | AZR-265 (E11) |
