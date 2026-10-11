// Writes dist/package.json with "type": "module". Vercel's Fastify builder
// deploys apps/api/dist/* at the function root (/var/task/index.js) but
// keeps apps/api/package.json at /var/task/apps/api/, so without this
// marker Node finds no "type" for index.js and loads it as CommonJS
// ("Cannot use import statement outside a module", E3-03).
import { writeFileSync } from "node:fs";
import { join } from "node:path";

writeFileSync(join(import.meta.dirname, "../dist/package.json"), '{ "type": "module" }\n');
