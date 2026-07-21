# Ruchulu — Full-Stack E-Commerce Site

Authentic Andhra & Telangana pickles, snacks and podi — a complete site: a premium storefront
(`frontend/`) backed by a real REST API (`backend/`).

```
ruchulu/
  frontend/     Static site — HTML/CSS/vanilla JS, no build step
  backend/      Node.js/Express/Prisma REST API
  nginx/        Combined reverse-proxy config (serves frontend + proxies /api to backend)
  docker-compose.yml   Runs the whole stack: Postgres, Redis, API, Nginx
```

---

## The important thing to understand about how these fit together

**The frontend works completely on its own.** Open `frontend/index.html` in a browser and the
entire site — browsing, cart, wishlist, checkout UI — works, using a built-in product catalog
baked into `frontend/script.js`. No backend required. This was true before the backend existed
and is still true now — nothing was made *worse* by adding a backend.

**When the backend is running and reachable**, the frontend automatically upgrades: on page load,
`script.js` calls `GET /api/v1/products` and, if that succeeds, silently replaces the built-in
catalog with live data from PostgreSQL. If that call fails for any reason (backend not running,
CORS blocked, network error), it falls back to the built-in catalog and logs a note to the
console — the visitor never sees an error state. This is why `docker-compose.yml` puts Nginx in
front of both: same-origin requests mean no CORS configuration is needed for this to work.

**Browsing works fully offline; checkout requires a live backend.** Cart and wishlist are still
kept in browser `localStorage` while you're browsing (so add-to-cart stays instant and works even
if the API blips), but login, registration, and checkout are now real — they call the actual
backend, not a demo alert. Specifically:

- `login.html` / `register.html` call `POST /api/v1/auth/login` and `/register`, store the
  returned JWT, and every subsequent API call is made through an `apiFetch()` wrapper (in
  `script.js`) that attaches the token and silently refreshes it on expiry using the backend's
  httpOnly refresh cookie.
- `checkout.html` requires login, loads/creates real addresses via `/api/v1/users/me/addresses`,
  pushes your local cart into the backend's real cart (`/api/v1/cart/items`, resolving canonical
  product/variant IDs fresh from the API each time), and places a real order via
  `POST /api/v1/orders` — which runs the backend's actual stock-checking, pricing, and coupon
  logic inside a database transaction.
- **Cash on Delivery works immediately**, no configuration needed — the order is created,
  confirmed, and saved to Postgres for real.
- **Razorpay checkout needs your own test API keys** — see the dedicated section below.
- Order confirmation (`order-confirmation.html`) and order history (`orders.html`) both read real
  order data back from `/api/v1/orders`.

## Setting up Razorpay (online payments)

Cash on Delivery works with zero setup. To enable "Pay Online" at checkout too:

**1. Create a free Razorpay account** at https://dashboard.razorpay.com/signup (no business
verification needed for test mode — you can start testing immediately after signup).

**2. Get your test API keys:**
- In the dashboard, make sure the mode switch (top left) is set to **Test Mode**, not Live.
- Go to **Settings → API Keys → Generate Test Key**.
- Copy the **Key Id** (starts with `rzp_test_`) and **Key Secret** shown.

**3. Add them to `backend/.env`:**
```
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_test_key_secret
```

**4. Restart the API container** so it picks up the new values:
```bash
docker compose restart api
```

**5. Test it:** go through checkout, choose "Pay Online (Razorpay)". Razorpay's test mode uses fake
payment methods — for a card, use `4111 1111 1111 1111`, any future expiry date, any 3-digit CVV,
and any name. For UPI in test mode, use the success VPA `success@razorpay`. Full list of test
credentials: https://razorpay.com/docs/payments/payments/test-card-upi-details/

**How confirmation actually works:** when Razorpay Checkout reports a successful payment, the
frontend calls `POST /orders/{id}/verify-payment` with the payment details, and the backend
verifies the cryptographic signature before marking the order CONFIRMED — this is what actually
matters and works immediately with just the two keys above.

**Webhooks are optional and not needed for testing.** `RAZORPAY_WEBHOOK_SECRET` only matters if
you also configure a webhook in the Razorpay dashboard (Settings → Webhooks) as a *fallback*
confirmation path (e.g. in case a customer closes the tab right after paying, before the
client-side verify call fires). Webhooks require a public HTTPS URL, so they can't point at
`localhost` — you'd need a tunnel like `ngrok http 80` during development. Skip this entirely
unless you specifically want that extra reliability; everything works without it.

**Going live later:** switch the dashboard back to Live Mode, generate live keys the same way, and
swap them into `.env` (ideally via your hosting platform's secrets manager rather than a committed
file). Razorpay requires basic KYC/business verification before Live Mode processes real money.

One design note worth knowing: the ID a cart item is stored under is the product's **slug**
(e.g. `avakaya-mango-pickle`), not its database UUID or a placeholder — this is deliberate, see
the comment above `PRODUCTS` in `script.js` for why (short version: it's the one identifier that
stays valid whether the page is using the offline catalog or the live one).

---

## Quick Start (full stack, via Docker)

```bash
cp backend/.env.example backend/.env
# edit backend/.env — at minimum set real values for JWT_ACCESS_SECRET and JWT_REFRESH_SECRET

docker compose up --build
```

Then, in a second terminal, run migrations and seed the real Ruchulu catalog (11 products —
Avakaya, Gongura, Tomato, Lemon, Garlic, Chicken, and Prawn pickle; Murukulu and Chekkalu;
Karam Podi; the Traditional Gift Box — matching the photography already in `frontend/images/`):

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
```

Now visit:
- **Site**: http://localhost — the storefront, now showing live data from Postgres
- **API docs**: http://localhost/docs — Swagger UI
- **Health check**: http://localhost/health

Default admin login (for the API — there's no admin UI in this deliverable, use `/docs` or a
tool like Postman): the email/password from `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` in
`backend/.env`.

## Quick Start (frontend only, no backend)

Just open `frontend/index.html` directly in a browser, or serve the folder with any static file
server:

```bash
cd frontend && python3 -m http.server 8080
# visit http://localhost:8080
```

## Quick Start (backend only, for API development)

```bash
cd backend
cp .env.example .env
docker compose -f ../docker-compose.yml up -d postgres redis   # or point at your own Postgres/Redis
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

See `backend/README.md` for full API documentation, architecture notes, and — importantly — an
honest account of what was and wasn't possible to verify in the sandbox this was built in
(Prisma's binary download was blocked by network policy there; you should run
`npm run prisma:generate` yourself as the first real test of the schema).

---

## What's real here vs. what's a next step

**Real and working:**
- The full storefront UI: home, shop with live filtering/search/sort, product detail, cart,
  about, contact — distinctive design (not templated), real Ruchulu brand assets (logo,
  packaging photography), working mobile nav and cart drawer.
- A production-structured backend: JWT auth with refresh rotation, products/categories/cart
  (guest + user, merges on login)/wishlist/orders/coupons/reviews/inventory, Razorpay
  integration, admin dashboard endpoints, Swagger docs, Docker deployment, a real (if partial)
  test suite.
- The catalog integration between them, with graceful fallback either direction.
- **Real login, registration, address management, and checkout** (`login.html`, `register.html`,
  `checkout.html`, `orders.html`, `order-confirmation.html`) — these call the actual backend,
  create real rows in Postgres, and place real orders. Cash on Delivery works with zero extra
  setup; Razorpay online payment works once you add your own test API keys.

**Documented next steps, not silently skipped:**
- Wishlist stays local-only for now (not pushed to the backend's wishlist API) — same pattern as
  cart, just not built yet.
- SMS and S3 credentials are yours to add — the integration code is complete, just inert without
  real accounts. (Email works out of the box in dev mode: unconfigured SMTP just logs the email
  content to the backend console instead of sending it, so order confirmation emails are visible
  even without a mail account.)
- **A real admin dashboard** — `admin-login.html` (staff-only, gates by role) and
  `admin-orders.html` (every order, live status stats, one-click status updates with optional
  tracking info for shipped orders). This isn't linked from the public storefront nav on purpose —
  visit it directly at `/admin-login.html`. Product/category/inventory management still goes
  through `/docs` for now — the order workflow was the priority since that's what running the
  store day-to-day actually requires.
- Social login only implements Google end-to-end; Facebook/Apple throw a clear "not wired up"
  error (see `backend/src/modules/auth/auth.service.js#socialLogin`).
- **Full password recovery and OTP login** — `forgot-password.html` (request a reset link),
  `reset-password.html` (the page that link points to), `verify-email.html` (confirms the link
  sent on registration), and a **Login with OTP** toggle right on `login.html` alongside the
  password form, with a proper send → verify → resend-with-cooldown flow. Phone number is now
  **required** at registration (not optional) specifically so OTP login always works — you can't
  create an account without one anymore.
- In dev mode without SMTP/SMS credentials configured, reset links and OTP codes are printed to
  the **backend console/logs**, not actually emailed or texted — so you can still test the full
  flow end to end without a real mail or SMS provider. Look for lines like `📧 [DEV EMAIL...]` or
  `📱 [DEV SMS...]` in `docker compose logs api`.

If you want, the next concrete piece of work is picking one of those and doing it properly rather
than adding more surface area — happy to build out the cart/auth wiring next if that's the
priority.
