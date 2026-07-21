process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://ruchulu:ruchulu_password@localhost:5432/ruchulu_test?schema=public";
process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
process.env.JWT_ACCESS_SECRET = "test_access_secret_at_least_10_chars";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_at_least_10_chars";
process.env.CORS_ORIGINS = "http://localhost:3000";
