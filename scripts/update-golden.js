#!/usr/bin/env node

process.env.PIXELDARIUM_UPDATE_GOLDEN = "1";
require("../tests/visual/screenshot.test.js");
