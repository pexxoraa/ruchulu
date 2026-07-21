const app = require("./app");
const env = require("./config/env");
const logger = require("./utils/logger");
const { connectDatabase, disconnectDatabase } = require("./config/database");
const redis = require("./config/redis");

let server;

async function start() {
  try {
    await connectDatabase();

    server = app.listen(env.PORT, () => {
      logger.info(`🚀 Ruchulu API running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`📚 API docs available at ${env.APP_URL}/docs`);
    });
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);

  if (server) {
    server.close(async () => {
      await disconnectDatabase();
      try {
        await redis.quit();
      } catch (err) {
        // already closed / stub in test env
      }
      logger.info("Shutdown complete.");
      process.exit(0);
    });

    // Force-exit if connections don't close within 10s
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — shutting down");
  process.exit(1);
});

start();
