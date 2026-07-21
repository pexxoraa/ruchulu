# Ruchulu Backend

> This backend lives inside the `ruchulu/` monorepo alongside `frontend/`. For full-stack setup
> (site + API + database together via Docker), see the **root `README.md`** one level up. This
> file covers the backend in isolation — useful for API-only development.

A production-oriented REST API for **Ruchulu** — an Indian pickles, snacks & podi e-commerce
platform (Andhra & Telangana specialties). Built with Node.js, Express, PostgreSQL (via Prisma),
and Redis, following a modular, layered architecture (routes → controller → service → repository).

---

## ⚠️ Please read before treating this as "done"

This is a large spec (30+ modules, payments, SMS, S3, multi-role auth, admin analytics). What's
here is a **real, working core** — not a mockup — but two things are true and worth knowing:

1. **I could not run `prisma generate` / `prisma migrate` / boot the server in the sandbox I
   built this in.** Prisma downloads its query-engine binary from `binaries.prisma.sh`, which
   was not reachable from that environment. I validated everything else I could:
   - Every one of the 68 JS files passes a Node.js syntax check (`node --check`).
   - 29 unit tests (validators, error classes, helpers) actually run and pass — see `tests/`.
   - The Prisma schema was carefully hand-reviewed for relation consistency (compound unique
     key names used in code match what Prisma would generate, cascade rules, etc.), but it has
     **not been run through the real Prisma compiler**. Run `npm run prisma:generate` yourself
     as the very first step — if there's a typo in `schema.prisma`, that's where it'll surface.
2. **Payments (Razorpay/Stripe), SMS (MSG91/Twilio), S3 storage, and social login (Google is
   wired up; Facebook/Apple are not)** need your own API credentials to actually function. The
   integration code is real and complete, not a stub — but it can't be end-to-end tested without
   accounts I don't have. Each one fails with a clear, actionable error message if unconfigured
   rather than silently pretending to work.

Everything else — auth (JWT + refresh rotation, OTP, email verification), products, categories,
cart (guest + user, merges on login), wishlist, orders (checkout → payment → fulfillment →
returns), coupons, reviews, inventory, admin dashboard, CMS (banners/blog/settings) — is fully
implemented against the schema and ready to run once Prisma is generated against a real Postgres
database.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT (access + rotating refresh tokens, hashed at rest) |
| Password hashing | bcryptjs |
| Validation | Zod |
| Caching | Redis (ioredis) |
| Object storage | S3-compatible (AWS S3 / Cloudflare R2 / MinIO / DO Spaces) |
| Payments | Razorpay (Stripe left as a documented extension point) |
| Email | Nodemailer / SMTP |
| SMS/OTP | MSG91 or Twilio |
| Logging | Winston (file + console) |
| File uploads | Multer (memory storage → S3) |
| Docs | Swagger / OpenAPI 3 (`/docs`) |
| Testing | Jest + Supertest |
| Deployment | Docker, Docker Compose, Nginx |

---

## Project Structure

```
src/
  config/        env, database (Prisma client), redis
  middlewares/   auth, error handling, validation, rate limiting
  modules/       one folder per domain — auth, products, categories, cart,
                 wishlist, orders, coupons, reviews, inventory, admin, uploads, users
                 Each module follows routes → controller → service (→ repository
                 for the heavier modules: products, categories).
  jobs/          email + SMS senders (dev-mode console fallback if unconfigured)
  docs/          Swagger setup
  utils/         ApiError, ApiResponse, asyncHandler, logger, jwt, helpers
  app.js         Express app assembly
  server.js      entry point, graceful shutdown
prisma/
  schema.prisma  full data model (30 tables)
  seed.js        admin user, warehouse, sample categories/products/coupon
tests/           Jest unit tests (validators, error classes, helpers)
```

---

## Getting Started

### 1. Prerequisites
- Node.js 18+
- Docker (recommended — spins up Postgres + Redis for you), or your own Postgres 14+ and Redis 6+

### 2. Configure environment
```bash
cp .env.example .env
# then edit .env — at minimum set real values for JWT_ACCESS_SECRET and JWT_REFRESH_SECRET
```

### 3. Start Postgres + Redis (via Docker)
```bash
docker compose -f ../docker-compose.yml up -d postgres redis
```

### 4. Install dependencies, generate Prisma client, run migrations
```bash
npm install
npm run prisma:generate
npm run prisma:migrate      # creates the database schema
npm run prisma:seed         # optional: admin user + sample catalog
```

### 5. Run the API
```bash
npm run dev       # local dev with nodemon
# or, for the full stack (site + API + Postgres + Redis + Nginx):
#   cd .. && docker compose up --build
```

The API is now at `http://localhost:4000`, docs at `http://localhost:4000/docs`, health check at
`http://localhost:4000/health`.

Default admin (from seed): the email/password in `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD`
in your `.env` (defaults to `admin@ruchulu.com` / `ChangeMe123!` — **change this in production**).

### 6. Run tests
```bash
npm test
```
Runs the 29 tests that don't require a database (validators, ApiError, helpers). Adding
Supertest-based integration tests against a real test database is the natural next step — the
app is structured (`app.js` exports the Express app separately from `server.js`) specifically to
make that easy to wire up.

---

## What's genuinely production-grade here

- **Clean layering**: routes never touch Prisma directly in the core modules; validation happens
  at the edge (Zod) before controllers, controllers stay thin, business logic lives in services.
- **Security**: Helmet, CORS allowlist, rate limiting (general + stricter on auth), HPP, XSS
  sanitization, bcrypt password hashing, JWT access tokens + rotating refresh tokens stored
  hashed (never raw) in the database, role-based route guards, input validation on every mutating
  endpoint, centralized error handler that never leaks stack traces in production.
- **Checkout correctness**: order totals are always recomputed server-side inside a database
  transaction (never trusts client-sent prices), stock is checked and decremented atomically,
  coupon validity is re-checked at order time even if it was already validated in the cart.
- **Idempotent-ish payment flow**: Razorpay order creation, signature verification on both the
  client-callback route and the webhook route, so a payment is confirmed even if the client
  never calls back.
- **Guest cart → user cart merge** on login, so nothing is lost when someone adds to cart before
  signing in.

## Known simplifications (documented in code comments where they occur)

- Stock is decremented at order placement rather than reserved-then-confirmed with a TTL. Fine at
  moderate scale; a flash-sale-heavy store would want a reservation system.
- Single-warehouse routing by default (multi-warehouse fields exist in the schema and inventory
  module, but there's no automatic "nearest warehouse" picker).
- Facebook and Apple social login throw a clear "not wired up yet" error — Google is fully
  implemented as the reference pattern.
- Repository-pattern files (`*.repository.js`) are written explicitly for `products` and
  `categories` to demonstrate the pattern the spec asked for; simpler modules use Prisma directly
  in their service layer rather than adding a repository file that would just forward calls
  1:1 — a pragmatic reading of "use the repository pattern," not a shortcut taken silently.

## Extending this

- **Background jobs**: `src/jobs/` currently sends email/SMS inline (fire-and-forget). For real
  volume, push these onto a queue (BullMQ + the existing Redis connection is the natural choice)
  and run a separate worker process.
- **Stripe**: `payments.service.js` is Razorpay-specific by design (it was the primary gateway in
  the spec); add a sibling `stripe.service.js` with the same three functions
  (`createOrder`/`verifySignature`/`refund`) and branch on `paymentMethod` in `orders.service.js`.
- **Facebook/Apple login**: follow the Google pattern in `auth.service.js#socialLogin` — verify
  their token against the provider's endpoint, then find-or-create the user the same way.
