import { buildApp } from "./build-app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();

const app = await buildApp(config);

app
  .listen({ port: config.PORT, host: "0.0.0.0" })
  .then(() => {
    app.log.info(`API listening on port ${config.PORT}`);
  })
  .catch((err: unknown) => {
    app.log.error(err, "Failed to start the API");
    process.exit(1);
  });
