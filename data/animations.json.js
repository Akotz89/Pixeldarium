PS.assets.registerJSON("data/animations.json", {
  "version": 1,
  "animations": {
    "organism": {
      "idle": {
        "frames": ["entity.organism_0.0", "entity.organism_0.1"],
        "fps": 4,
        "loop": true
      },
      "walk_right": {
        "frames": ["entity.organism_0.0", "entity.organism_0.1", "entity.organism_0.2", "entity.organism_0.3"],
        "fps": 8,
        "loop": true
      },
      "walk_left": {
        "frames": ["entity.organism_0.3", "entity.organism_0.2", "entity.organism_0.1", "entity.organism_0.0"],
        "fps": 8,
        "loop": true
      },
      "eat": {
        "frames": ["entity.organism_1.0", "entity.organism_1.1", "entity.organism_1.2"],
        "fps": 6,
        "loop": false
      },
      "die": {
        "frames": ["entity.organism_2.0", "entity.organism_2.1", "entity.organism_2.2", "entity.organism_2.3"],
        "fps": 4,
        "loop": false
      }
    },
    "settlement": {
      "idle": {
        "frames": ["settlement.hut.0", "settlement.hut.1"],
        "fps": 2,
        "loop": true
      },
      "construction": {
        "frames": ["settlement.hut.0", "settlement.hut.1", "settlement.hut.2"],
        "fps": 4,
        "loop": true
      }
    },
    "vegetation": {
      "sway": {
        "frames": ["terrain.forest.0", "terrain.forest.1", "terrain.forest.2", "terrain.forest.1"],
        "fps": 3,
        "loop": true
      }
    }
  }
});
