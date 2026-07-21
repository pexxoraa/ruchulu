const { PrismaClient } = require("@prisma/client");
const env = require("./env");
const logger = require("../utils/logger");

/**
 * Prisma is instantiated once and reused across the app (and across
 * hot-reloads in dev) to avoid exhausting Postgres connections.
 */
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__prisma ||
  new PrismaClient({
    log: env.isProduction
      ? [{ level: "error", emit: "event" }]
      : [{ level: "warn", emit: "event" }, { level: "error", emit: "event" }],
  });

prisma.$on("error", (e) => logger.error({ err: e }, "Prisma error"));
if (!env.isProduction) {
  prisma.$on("warn", (e) => logger.warn({ err: e }, "Prisma warning"));
  globalForPrisma.__prisma = prisma;
}

async function connectDatabase() {
  await prisma.$connect();
  logger.info("✅ Connected to PostgreSQL via Prisma");
}

async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info("Disconnected from PostgreSQL");
}

module.exports = { prisma, connectDatabase, disconnectDatabase };
