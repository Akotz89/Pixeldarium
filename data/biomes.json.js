PS.assets.registerJSON("data/biomes.json", {
  "version": 1,
  "biomes": [
    { "id": "temperate", "name": "Temperate", "primaryTiles": ["grass_lush", "dirt"], "edgeTiles": ["forest_floor", "grass_dry"], "vegetationDensity": 0.72, "treeTypes": ["oak", "birch", "pine"], "temperature": { "min": 4, "max": 24 }, "moisture": { "min": 0.45, "max": 0.85 } },
    { "id": "arid", "name": "Arid", "primaryTiles": ["sand", "sand_dune"], "edgeTiles": ["rock", "grass_dead"], "vegetationDensity": 0.12, "treeTypes": ["scrub", "dry_bush"], "temperature": { "min": 18, "max": 44 }, "moisture": { "min": 0.0, "max": 0.28 } },
    { "id": "tropical", "name": "Tropical", "primaryTiles": ["grass_lush", "wetland"], "edgeTiles": ["mud", "forest_floor"], "vegetationDensity": 0.92, "treeTypes": ["palm", "broadleaf", "fern"], "temperature": { "min": 20, "max": 38 }, "moisture": { "min": 0.7, "max": 1.0 } },
    { "id": "tundra", "name": "Tundra", "primaryTiles": ["snow", "ice"], "edgeTiles": ["grass_dead", "rock"], "vegetationDensity": 0.18, "treeTypes": ["dwarf_pine", "lichen"], "temperature": { "min": -32, "max": 6 }, "moisture": { "min": 0.2, "max": 0.65 } },
    { "id": "highland", "name": "Highland", "primaryTiles": ["rock", "rock_cliff"], "edgeTiles": ["rock_mossy", "grass_dry"], "vegetationDensity": 0.34, "treeTypes": ["pine", "juniper"], "temperature": { "min": -4, "max": 18 }, "moisture": { "min": 0.25, "max": 0.7 } },
    { "id": "coastal", "name": "Coastal", "primaryTiles": ["sand", "water_shallow"], "edgeTiles": ["dirt", "wetland"], "vegetationDensity": 0.46, "treeTypes": ["palm", "coastal_grass"], "temperature": { "min": 8, "max": 32 }, "moisture": { "min": 0.55, "max": 1.0 } },
    { "id": "volcanic", "name": "Volcanic", "primaryTiles": ["volcanic", "rock"], "edgeTiles": ["rock_cliff", "grass_dead"], "vegetationDensity": 0.05, "treeTypes": ["ash_scrub"], "temperature": { "min": 8, "max": 48 }, "moisture": { "min": 0.0, "max": 0.35 } },
    { "id": "wetland", "name": "Wetland", "primaryTiles": ["marsh", "water_shallow"], "edgeTiles": ["mud", "wetland"], "vegetationDensity": 0.86, "treeTypes": ["willow", "reed", "cypress"], "temperature": { "min": 6, "max": 30 }, "moisture": { "min": 0.75, "max": 1.0 } },
    { "id": "ocean", "name": "Ocean", "primaryTiles": ["water_deep", "water_shallow"], "edgeTiles": ["sand", "ice"], "vegetationDensity": 0.02, "treeTypes": [], "temperature": { "min": -4, "max": 32 }, "moisture": { "min": 1.0, "max": 1.0 } },
    { "id": "forest", "name": "Forest", "primaryTiles": ["forest_floor", "rock_mossy"], "edgeTiles": ["grass_lush", "dirt"], "vegetationDensity": 0.95, "treeTypes": ["oak", "pine", "birch", "underbrush"], "temperature": { "min": 2, "max": 28 }, "moisture": { "min": 0.55, "max": 0.95 } }
  ]
});
