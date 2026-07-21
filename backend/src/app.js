const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const hpp = require("hpp");
const xssClean = require("xss-clean");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");

const env = require("./config/env");
const logger = require("./utils/logger");
const swaggerSpec = require("./docs/swagger");
const routes = require("./routes");
const healthRoutes = require("./health.routes");
const webhookRoutes = require("./modules/orders/webhooks.routes");
const errorHandler = require("./middlewares/errorHandler");
const notFound = require("./middlewares/notFound");
const { apiLimiter } = require("./middlewares/rateLimiter");

const app = express();

app.set("trust proxy", 1); // needed for correct req.ip / rate-limiting behind Nginx

// --- Security headers ---
app.use(helmet());
app.use(hpp()); // guards against HTTP parameter pollution

// --- CORS ---
app.use(
  cors({
    origin: env.CORS_ORIGIN_LIST,
    credentials: true,
  })
);

// --- Webhooks need the RAW body for signature verification, so this is
//     mounted BEFORE express.json() and only for this specific path. ---
app.use(`${env.API_PREFIX}/webhooks`, express.raw({ type: "application/json" }), webhookRoutes);

// --- Standard body parsing (after the raw webhook route above) ---
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(xssClean()); // strips script-injection attempts from body/query/params
app.use(cookieParser(env.COOKIE_SECRET));
app.use(compression());

// --- Request logging ---
app.use(
  morgan(env.isProduction ? "combined" : "dev", {
    stream: { write: (msg) => logger.info(msg.trim()) },
  })
);

// --- Rate limiting (general API traffic; auth routes layer a stricter one on top) ---
app.use(env.API_PREFIX, apiLimiter);

// --- Health check (unauthenticated, no rate limit — used by load balancers) ---
app.use("/health", healthRoutes);

// --- API docs ---
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: "Ruchulu API Docs" }));
app.get("/docs.json", (req, res) => res.json(swaggerSpec));

// --- API routes ---
app.use(env.API_PREFIX, routes);

app.get("/", (req, res) => {
  res.json({
    name: "Ruchulu API",
    status: "running",
    docs: "/docs",
    health: "/health",
  });
});

// --- 404 + centralized error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

module.exports = app;
