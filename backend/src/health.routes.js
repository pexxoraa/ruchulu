const router = require("express").Router();
const { prisma } = require("./config/database");
const redis = require("./config/redis");

router.get("/", async (req, res) => {
  const checks = { database: "unknown", redis: "unknown" };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch (err) {
    checks.database = "error";
  }

  try {
    await redis.set("healthcheck", "1");
    checks.redis = "ok";
  } catch (err) {
    checks.redis = "error";
  }

  const healthy = Object.values(checks).every((v) => v === "ok");
  res.status(healthy ? 200 : 503).json({
    status: healthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  });
});

module.exports = router;
