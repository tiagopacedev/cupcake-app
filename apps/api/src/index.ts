import type { FastifyInstance } from "fastify";
import { buildApp } from "./build-app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();

// Explicit type (not just inference) so this file textually imports
// "fastify" — Vercel's Fastify builder picks its entrypoint by regex-
// scanning src/index.ts for that import (apps/api/vercel docs E3-03).
const app: FastifyInstance = await buildApp(config);

app
  .listen({ port: config.PORT, host: "0.0.0.0" })
  .then(() => {
    app.log.info(`API listening on port ${config.PORT}`);
  })
  .catch((err: unknown) => {
    app.log.error(err, "Failed to start the API");
    process.exit(1);
  });
