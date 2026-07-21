const Redis = require("ioredis");
const env = require("./env");
const logger = require("../utils/logger");

let redis;

/**
 * In test environments we avoid opening a real Redis connection so the
 * test suite can run without infrastructure. A minimal in-memory stub
 * covers the handful of methods the app actually uses.
 */
if (env.isTest) {
  const store = new Map();
  redis = {
    get: async (k) => store.get(k) ?? null,
    set: async (k, v, ...args) => {
      store.set(k, v);
      return "OK";
    },
    setex: async (k, _ttl, v) => {
      store.set(k, v);
      return "OK";
    },
    del: async (k) => store.delete(k),
    incr: async (k) => {
      const val = (parseInt(store.get(k), 10) || 0) + 1;
      store.set(k, String(val));
      return val;
    },
    expire: async () => 1,
    quit: async () => "OK",
    on: () => {},
  };
} else {
  redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  });

  redis.on("connect", () => logger.info("✅ Connected to Redis"));
  redis.on("error", (err) => logger.error({ err }, "Redis connection error"));
}

module.exports = redis;
