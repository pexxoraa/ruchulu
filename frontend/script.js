/* =========================================================
   AMMAMMA'S KITCHEN — shared site logic
   Loaded on every page. Handles: icon rendering, product
   catalog, cart + wishlist state, mobile nav, cart drawer,
   filters (shop page), and product detail interactions.
   ========================================================= */
console.log("%cRuchulu script.js — build 2025-07-fix3 (listener-order fix)", "color:#7B1E1E;font-weight:bold;font-size:14px;");

/* ---------- ICON LIBRARY (hand-drawn line icons, no emoji, no external assets) ---------- */
const Icons = {
  jar: `<svg class="icon" viewBox="0 0 24 24"><path d="M9 3h6v2.4l1.6 1.8v12.3A1.5 1.5 0 0 1 15.1 21H8.9a1.5 1.5 0 0 1-1.5-1.5V7.2L9 5.4V3Z"/><path d="M7.5 10.5h9"/><path d="M9 3h6"/></svg>`,
  bowlSwirl: `<svg class="icon" viewBox="0 0 24 24"><path d="M3.5 11h17a8.5 5.5 0 0 1-17 0Z" transform="rotate(180 12 14)"/><path d="M4 11a8 8 0 0 1 16 0"/><path d="M12 7.5c-1 .8-1 1.7 0 2.5s1 1.7 0 2.5"/></svg>`,
  knot: `<svg class="icon" viewBox="0 0 24 24"><path d="M8 12c0-3 2-5 5-5s5 2 5 5-2 5-5 5-5-2-5-5Z"/><path d="M8 12c0 3-2 5-5 5"/><path d="M3 7c3 0 5 2 5 5"/></svg>`,
  laddu: `<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M7 9c1.5-1 3-1 5 0M7 12c1.5-1 3-1 5 0M8 15.5c1.5-1 3-1 4.5 0"/></svg>`,
  leaf: `<svg class="icon" viewBox="0 0 24 24"><path d="M5 19c8 0 14-6 14-14-8 0-14 6-14 14Z"/><path d="M5 19c2-4 5-7 9-9"/></svg>`,
  grain: `<svg class="icon" viewBox="0 0 24 24"><path d="M12 3c2 3 2 6 0 9-2-3-2-6 0-9Z"/><path d="M12 12v9"/><path d="M12 12c2 1.5 4 1.5 6 0M12 12c-2 1.5-4 1.5-6 0"/></svg>`,
  search: `<svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.5-4.5"/></svg>`,
  heart: `<svg class="icon" viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-9.7-9C.7 7.2 2.4 4 5.7 4c2 0 3.5 1.1 4.3 2.7C10.8 5.1 12.3 4 14.3 4c3.3 0 5 3.2 3.4 7-2.2 4.4-9.7 9-9.7 9Z"/></svg>`,
  cart: `<svg class="icon" viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none"/><path d="M2.5 3h2.4l2.1 12h11.3l1.7-8.5H6"/></svg>`,
  menu: `<svg class="icon" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
  close: `<svg class="icon" viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg>`,
  plus: `<svg class="icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,
  minus: `<svg class="icon" viewBox="0 0 24 24"><path d="M5 12h14"/></svg>`,
  check: `<svg class="icon" viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></svg>`,
  truck: `<svg class="icon" viewBox="0 0 24 24"><path d="M2 6h11v10H2z"/><path d="M13 10h4l4 3.5V16h-8z"/><circle cx="6" cy="18.5" r="1.6"/><circle cx="17" cy="18.5" r="1.6"/></svg>`,
  shield: `<svg class="icon" viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 7.8-8 9-4.5-1.2-8-4-8-9V6l8-3Z"/><path d="M8.5 12l2.3 2.3L15.5 9.5"/></svg>`,
  chef: `<svg class="icon" viewBox="0 0 24 24"><path d="M7 10c-1.7 0-3-1.3-3-3s1.3-3 3-3c.3-1.7 1.8-3 3.6-3 1 0 1.9.4 2.6 1 .5-.4 1.1-.6 1.8-.6 1.7 0 3 1.3 3 3s1.3 3 3 3c0 2-1.5 3.5-3.5 3.7L17 21H7l-.5-11Z"/></svg>`,
  farm: `<svg class="icon" viewBox="0 0 24 24"><path d="M3 21V10l9-6 9 6v11"/><path d="M9 21v-6h6v6"/></svg>`,
  phone: `<svg class="icon" viewBox="0 0 24 24"><path d="M5 4h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2C10 20 4 14 3 7.2A2 2 0 0 1 5 4Z"/></svg>`,
  mail: `<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>`,
  pin: `<svg class="icon" viewBox="0 0 24 24"><path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.3"/></svg>`,
  chat: `<svg class="icon" viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4V5Z"/></svg>`,
  instagram: `<svg class="icon" viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="0.8" fill="currentColor" stroke="none"/></svg>`,
  facebook: `<svg class="icon" viewBox="0 0 24 24"><path d="M14 21v-8h3l.5-4H14V6.5c0-1.2.4-2 2.2-2H17V1h-2.6C11.7 1 10 2.7 10 5.6V9H7v4h3v8h4Z"/></svg>`,
  whatsapp: `<svg class="icon" viewBox="0 0 24 24"><path d="M4 20l1.3-4A8 8 0 1 1 8.5 19L4 20Z"/><path d="M8.5 8.5c0 4 3 7 7 7"/></svg>`,
  arrow: `<svg class="icon" viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg>`,
  gift: `<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="11" rx="1"/><path d="M3 9h18v4H3z"/><path d="M12 9v11"/><path d="M12 9c-1.5-4-6-5-6-2 0 1.3 1.3 2 3 2M12 9c1.5-4 6-5 6-2 0 1.3-1.3 2-3 2"/></svg>`,
  user: `<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c1.5-4 4.5-6 7.5-6s6 2 7.5 6"/></svg>`,
  lock: `<svg class="icon" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
  logout: `<svg class="icon" viewBox="0 0 24 24"><path d="M15 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h9"/><path d="M10 12h11M17 8l4 4-4 4"/></svg>`,
  package: `<svg class="icon" viewBox="0 0 24 24"><path d="M3.5 7.5 12 3l8.5 4.5L12 12 3.5 7.5Z"/><path d="M3.5 7.5V16l8.5 4.5V12"/><path d="M20.5 7.5V16L12 20.5"/></svg>`,
  refresh: `<svg class="icon" viewBox="0 0 24 24"><path d="M4 11a8 8 0 0 1 14-5.2M20 13a8 8 0 0 1-14 5.2"/><path d="M18 3v5h-5M6 21v-5h5"/></svg>`,
};

function icon(name){ return Icons[name] || ""; }

/* ---------- PRODUCT CATALOG ----------
   This array ships with real Ruchulu photography baked in as a fallback
   so the site is fully browsable even with no backend running (e.g.
   opening index.html directly). When a backend API is reachable at
   API_BASE, syncCatalogWithBackend() below replaces its contents with
   live data from PostgreSQL — same shape, so nothing else has to change.

   IMPORTANT — why `id` is a slug string like "avakaya-mango-pickle"
   rather than the database's UUID or a short "p1" placeholder: a cart
   saved in localStorage has to keep resolving to the right product no
   matter which catalog source (this fallback list, or the live API) is
   active when a given page loads. UUIDs and "p1"-style IDs are each
   only meaningful to ONE of the two sources, so a cart line saved under
   one would silently fail to resolve under the other. Slugs are the one
   identifier both sources agree on (mapApiProduct() below sets `id` to
   the API product's slug for exactly this reason) — so this is the only
   ID scheme that keeps the cart correct regardless of backend
   availability, sync timing, or which page you're on. Don't change this
   back to a UUID or numeric ID without re-solving that problem. */
let PRODUCTS = [
  { id:"avakaya-mango-pickle", name:"Avakaya Mango Pickle", category:"Pickles", type:"Veg", img:"images/avakaya.jpg", tag:"Best Seller", spice:"High",
    price:329, oldPrice:379, rating:4.9, reviews:501,
    desc:"Raw mangoes cut by hand and pickled in mustard, fenugreek and red chilli — the true taste of tradition, and the pickle every Telugu household grows up on.",
    weights:[{w:"250g",p:189},{w:"500g",p:329},{w:"1kg",p:599}] },
  { id:"gongura-pickle", name:"Gongura Pickle", category:"Pickles", type:"Veg", img:"images/gongura.jpg", tag:"Today's Special", spice:"Medium",
    price:229, oldPrice:279, rating:4.9, reviews:340,
    desc:"Sorrel leaves pounded with garlic and red chilli into a tart, deeply savoury pickle, traditionally made with homemade goodness.",
    weights:[{w:"250g",p:229},{w:"500g",p:409}] },
  { id:"tomato-pickle", name:"Tomato Pickle", category:"Pickles", type:"Veg", img:"images/tomato.jpg", tag:null, spice:"Medium",
    price:219, oldPrice:null, rating:4.7, reviews:118,
    desc:"Ripe tomatoes slow-cooked with red chilli and mustard into a tangy, homemade-tasting pickle you'll want on everything.",
    weights:[{w:"250g",p:219},{w:"500g",p:389}] },
  { id:"lemon-pickle", name:"Lemon Pickle", category:"Pickles", type:"Veg", img:"images/lemon.jpg", tag:null, spice:"High",
    price:199, oldPrice:null, rating:4.6, reviews:94,
    desc:"Whole lemons pickled spicy, tangy and traditional — a bright, sour-forward pickle that cuts through any meal.",
    weights:[{w:"250g",p:199},{w:"500g",p:349}] },
  { id:"garlic-pickle", name:"Garlic Pickle", category:"Pickles", type:"Veg", img:"images/garlic.jpg", tag:null, spice:"High",
    price:249, oldPrice:null, rating:4.7, reviews:83,
    desc:"Whole garlic cloves pickled in a fiery red chilli base — pungent, bold, and a favourite alongside hot rice and ghee.",
    weights:[{w:"400g",p:249}] },
  { id:"chicken-pickle", name:"Chicken Pickle", category:"Pickles", type:"Non-Veg", img:"images/chicken.jpg", tag:"Best Seller", spice:"High",
    price:399, oldPrice:449, rating:4.8, reviews:212,
    desc:"Slow-cooked bone-in chicken pickled the traditional Andhra way in cold-pressed sesame oil with roasted red chillies — deep, tangy and unapologetically spicy.",
    weights:[{w:"400g",p:399}] },
  { id:"prawn-pickle", name:"Prawn Pickle", category:"Pickles", type:"Non-Veg", img:"images/prawn.jpg", tag:null, spice:"High",
    price:429, oldPrice:479, rating:4.7, reviews:66,
    desc:"Fresh coastal prawns simmered in a fiery Andhra-style pickle base — bold, briny, and built for rice.",
    weights:[{w:"400g",p:429}] },
  { id:"murukulu", name:"Murukulu", category:"Snacks", type:"Veg", img:"images/murukulu.jpg", tag:"Premium", spice:"Low",
    price:149, oldPrice:null, rating:4.7, reviews:120,
    desc:"Crispy, crunchy and irresistible — spiral rice-and-urad-dal crackers, hand-pressed and fried in small batches until golden.",
    weights:[{w:"200g",p:149},{w:"500g",p:329}] },
  { id:"chekkalu", name:"Chekkalu", category:"Snacks", type:"Veg", img:"images/chekkalu.jpg", tag:"Handmade", spice:"Low",
    price:139, oldPrice:null, rating:4.6, reviews:88,
    desc:"Thin, crisp, traditional rice crackers seasoned with sesame and curry leaf — light, crunchy, and completely handmade.",
    weights:[{w:"200g",p:139},{w:"500g",p:309}] },
  { id:"karam-podi", name:"Karam Podi", category:"Podis", type:"Veg", img:"images/karampodi.jpg", tag:"Best Seller", spice:"High",
    price:179, oldPrice:null, rating:4.8, reviews:154,
    desc:"Spicy and authentic Andhra-style gunpowder — a stone-ground blend of roasted lentils, dried red chilli and garlic. Mix with hot rice and sesame oil.",
    weights:[{w:"200g",p:179},{w:"500g",p:389}] },
  { id:"ruchulu-traditional-gift-box", name:"Ruchulu Traditional Gift Box", category:"Hampers", type:"Veg", img:"images/giftbox.jpg", tag:"Festive", spice:null,
    price:899, oldPrice:999, rating:5.0, reviews:47,
    desc:"A box full of tradition and love — a curated selection of our best-loved pickles, podi and snacks, packed for gifting.",
    weights:[{w:"Gift Box",p:899}] },
];

/* ---------- LIVE BACKEND SYNC ----------
   If the Ruchulu API is reachable (same-origin, e.g. behind the nginx
   in docker-compose.yml), the built-in catalog above is replaced with
   live data from PostgreSQL. If the API is unreachable — static
   hosting, backend not running, offline demo — the page silently keeps
   using the built-in catalog. Either way the site works. */
const API_BASE = "/api/v1";
const CATEGORY_SLUG_TO_LABEL = { pickles: "Pickles", snacks: "Snacks", podis: "Podis", hampers: "Hampers" };

function mapApiProduct(p) {
  const variants = (p.variants || []).map((v) => ({
    w: v.label,
    p: Number(v.offerPrice ?? v.price),
    variantId: v.id, // real backend variant UUID — required to place a real order
  }));
  const firstVariant = p.variants?.[0];
  return {
    // IMPORTANT: id is the product's slug, not its database UUID. The
    // built-in fallback catalog (above) also uses these exact slugs as
    // its ids. This is what keeps a cart item resolvable no matter which
    // catalog source (live API vs. offline fallback) happens to be
    // active on any given page load — see the note above PRODUCTS.
    id: p.slug,
    databaseId: p.id, // the real backend product UUID — required to place a real order
    name: p.name,
    category: CATEGORY_SLUG_TO_LABEL[p.category?.slug] || p.category?.name || "Pickles",
    type: p.type === "NON_VEG" ? "Non-Veg" : "Veg",
    img: p.images?.[0]?.url || "images/avakaya.jpg",
    tag: p.isBestSeller ? "Best Seller" : p.isFeatured ? "Featured" : null,
    spice: p.spiceLevel ? p.spiceLevel.charAt(0) + p.spiceLevel.slice(1).toLowerCase() : null,
    price: Number(firstVariant ? (firstVariant.offerPrice ?? firstVariant.price) : p.offerPrice ?? p.basePrice),
    oldPrice: null,
    rating: Number(p.avgRating) || 4.8,
    reviews: p.reviewCount || 0,
    desc: p.shortDescription || p.description || "",
    weights: variants.length ? variants : [{ w: "1 unit", p: Number(p.basePrice) }],
    slug: p.slug,
  };
}

// True once PRODUCTS has been successfully replaced with live backend
// data. Real checkout (which needs real product/variant UUIDs) checks
// this before attempting to place an order — the offline fallback
// catalog has no database records behind it, so there's nothing to
// check out against.
let catalogIsLive = false;

async function syncCatalogWithBackend() {
  try {
    const res = await fetch(`${API_BASE}/products?limit=100&status=ACTIVE`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`API responded ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json.data) || json.data.length === 0) throw new Error("Empty catalog from API");

    const mapped = json.data.map(mapApiProduct);
    PRODUCTS.length = 0;
    PRODUCTS.push(...mapped);
    catalogIsLive = true;
    document.dispatchEvent(new CustomEvent("ruchulu:catalog-ready", { detail: { source: "api" } }));
    return true;
  } catch (err) {
    catalogIsLive = false;
    console.info("Ruchulu: backend not reachable, using built-in catalog.", err.message);
    document.dispatchEvent(new CustomEvent("ruchulu:catalog-ready", { detail: { source: "fallback" } }));
    return false;
  }
}

function getProduct(id){ return PRODUCTS.find(p => p.id === id); }

/* ============================================================
   AUTH + API CLIENT
   Real login/register/session handling against the backend, plus a
   fetch wrapper that attaches the access token and transparently
   refreshes it on expiry using the httpOnly refresh-token cookie the
   backend already sets on login/register.
   ============================================================ */
const AuthStore = {
  getToken(){ try { return localStorage.getItem("ak_access_token"); } catch(e){ return null; } },
  setToken(token){ try { token ? localStorage.setItem("ak_access_token", token) : localStorage.removeItem("ak_access_token"); } catch(e){} },
  getUser(){ try { return JSON.parse(localStorage.getItem("ak_user") || "null"); } catch(e){ return null; } },
  setUser(user){ try { user ? localStorage.setItem("ak_user", JSON.stringify(user)) : localStorage.removeItem("ak_user"); } catch(e){} },
  isLoggedIn(){ return !!this.getToken() && !!this.getUser(); },
  clear(){ this.setToken(null); this.setUser(null); },
};

let refreshInFlight = null;

/**
 * refreshAccessToken — exchanges the httpOnly refresh cookie (sent
 * automatically by the browser) for a new access token. Deduplicated
 * with refreshInFlight so concurrent 401s don't trigger multiple
 * refresh calls at once.
 */
async function refreshAccessToken(){
  if(refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" });
      if(!res.ok) throw new Error("refresh failed");
      const json = await res.json();
      AuthStore.setToken(json.data.accessToken);
      return json.data.accessToken;
    } catch(err) {
      AuthStore.clear();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/**
 * apiFetch — the single entry point for every authenticated call to the
 * backend. Attaches the Bearer token, sends cookies for refresh-token
 * support, and on a 401 tries exactly one silent token refresh before
 * retrying — so a page doesn't need to manually handle token expiry.
 */
async function apiFetch(path, options = {}){
  const doFetch = (token) => fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  let token = AuthStore.getToken();
  let res = await doFetch(token);

  if(res.status === 401 && token){
    token = await refreshAccessToken();
    if(token) res = await doFetch(token);
  }
  return res;
}

async function apiFetchJson(path, options = {}){
  const res = await apiFetch(path, options);
  let json = null;
  try { json = await res.json(); } catch(e){ /* no body */ }
  if(!res.ok){
    const message = json?.message || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.details = json?.details;
    throw err;
  }
  return json;
}

/**
 * renderAuthNav — every page has an #authNavSlot in its header. This
 * fills it with a Login link when signed out, or the user's name plus
 * a logout control when signed in.
 */
function renderAuthNav(){
  const loggedIn = AuthStore.isLoggedIn();

  document.querySelectorAll("[data-auth-slot]").forEach((slot, i) => {
    const user = AuthStore.getUser();
    if(user){
      slot.innerHTML = `
        <a href="orders.html" class="icon-btn" title="${user.fullName}" aria-label="My account">${icon("user")}</a>
        <button class="icon-btn" id="logoutBtn-${i}" aria-label="Log out" title="Log out">${icon("logout")}</button>
      `;
      slot.querySelector("button")?.addEventListener("click", async () => {
        try { await apiFetch("/auth/logout", { method: "POST" }); } catch(e){}
        AuthStore.clear();
        showToast("Logged out");
        setTimeout(()=> window.location.href = "index.html", 600);
      });
    } else {
      slot.innerHTML = `<a href="login.html" class="icon-btn" aria-label="Login" title="Login">${icon("user")}</a>`;
    }
  });

  // Elements only relevant when signed OUT (e.g. footer "Login" / "Create
  // Account" links) or signed IN — kept generic so any page can opt in.
  document.querySelectorAll("[data-guest-only]").forEach(el => { el.style.display = loggedIn ? "none" : ""; });
  document.querySelectorAll("[data-auth-only]").forEach(el => { el.style.display = loggedIn ? "" : "none"; });
}

/* ---------- STATE (cart + wishlist) ----------
   Uses localStorage so the cart survives across pages when this
   site is hosted or opened normally in a browser. If storage is
   unavailable (e.g. a sandboxed preview), it falls back to an
   in-memory store for the current page only. */
const Store = (() => {
  let memory = { cart: [], wishlist: [] };
  let hasStorage = true;
  try {
    const t = "__test__"; localStorage.setItem(t,"1"); localStorage.removeItem(t);
  } catch(e){ hasStorage = false; }

  function read(key){
    if(!hasStorage) return memory[key];
    try{ return JSON.parse(localStorage.getItem(key)) || []; }catch(e){ return memory[key]; }
  }
  function write(key, val){
    memory[key] = val;
    if(hasStorage){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }
  }
  return {
    getCart(){ return read("ak_cart"); },
    setCart(v){ write("ak_cart", v); },
    getWishlist(){ return read("ak_wishlist"); },
    setWishlist(v){ write("ak_wishlist", v); },
  };
})();

function addToCart(id, weight, qty=1){
  const product = getProduct(id); if(!product) return;
  const w = weight || product.weights[0].w;
  const cart = Store.getCart();
  const existing = cart.find(l => l.id === id && l.weight === w);
  if(existing){ existing.qty += qty; } else { cart.push({ id, weight:w, qty }); }
  Store.setCart(cart);
  refreshBadges();
  return cart;
}
function removeFromCart(id, weight){
  Store.setCart(Store.getCart().filter(l => !(l.id===id && l.weight===weight)));
  refreshBadges();
}
function updateCartQty(id, weight, delta){
  const cart = Store.getCart();
  const line = cart.find(l => l.id===id && l.weight===weight);
  if(!line) return;
  line.qty += delta;
  if(line.qty <= 0){ return removeFromCart(id, weight); }
  Store.setCart(cart);
  refreshBadges();
}
function cartLinePrice(line){
  const product = getProduct(line.id);
  if(!product) return 0;
  const wOpt = product.weights.find(w => w.w === line.weight) || product.weights[0];
  return wOpt.p * line.qty;
}
function cartSubtotal(){ return getValidCartLines().reduce((sum,l) => sum + cartLinePrice(l), 0); }
function cartCount(){ return getValidCartLines().reduce((sum,l) => sum + l.qty, 0); }

/**
 * getValidCartLines / getValidWishlistIds — non-destructive filtering
 * for rendering. Earlier this function deleted mismatched entries from
 * storage outright, on the assumption that a missing product meant a
 * genuinely stale line. That assumption was wrong: different pages can
 * legitimately have different catalog state momentarily (e.g. one page
 * synced with the live backend, another hasn't yet), which made this
 * silently delete real cart items. We now only ever filter what's
 * rendered — storage is left untouched, so an item that looks "missing"
 * on one page can still show up correctly once the catalog catches up.
 */
function getValidCartLines(){
  return Store.getCart().filter(line => !!getProduct(line.id));
}
function getValidWishlistIds(){
  return Store.getWishlist().filter(id => !!getProduct(id));
}

function toggleWishlist(id){
  let wl = Store.getWishlist();
  if(wl.includes(id)) wl = wl.filter(x => x !== id);
  else wl.push(id);
  Store.setWishlist(wl);
  refreshBadges();
  return wl.includes(id);
}
function isWishlisted(id){ return Store.getWishlist().includes(id); }

/* ---------- UI: badges, toast ---------- */
function refreshBadges(){
  try {
    document.querySelectorAll("[data-cart-count]").forEach(el => el.textContent = cartCount());
    document.querySelectorAll("[data-wishlist-count]").forEach(el => el.textContent = getValidWishlistIds().length);
    const drawer = document.getElementById("cartDrawer");
    if(drawer) renderCartDrawer();
    if(document.getElementById("cartPageBody")) renderCartPage();
    document.querySelectorAll(".p-wish[data-id]").forEach(btn=>{
      btn.classList.toggle("active", isWishlisted(btn.dataset.id));
    });
  } catch (err) {
    console.error("Ruchulu: non-fatal error while refreshing cart/wishlist UI:", err);
  }
}

let toastTimer;
function showToast(msg){
  let toast = document.getElementById("addToast");
  if(!toast){
    toast = document.createElement("div");
    toast.id = "addToast";
    toast.className = "add-toast";
    document.body.appendChild(toast);
  }
  toast.innerHTML = `${icon("check")} ${msg}`;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> toast.classList.remove("show"), 2200);
}

/* ---------- CART DRAWER ---------- */
function renderCartDrawer(){
  const body = document.getElementById("cartDrawerBody");
  const foot = document.getElementById("cartDrawerFoot");
  if(!body) return;
  const cart = getValidCartLines();
  if(cart.length === 0){
    body.innerHTML = `<div class="cart-drawer-empty">${icon("cart")}<div>Your cart is empty.</div></div>`;
    if(foot) foot.style.display = "none";
    return;
  }
  if(foot) foot.style.display = "block";
  body.innerHTML = cart.map(line=>{
    const p = getProduct(line.id);
    return `<div class="cart-line">
      <div class="cart-line-media"><img src="${p.img}" alt="${p.name}" loading="lazy"></div>
      <div class="cart-line-info">
        <div class="cart-line-name">${p.name}</div>
        <div class="cart-line-meta">${line.weight}</div>
        <div class="cart-line-qty">
          <button class="qty-btn" onclick="updateCartQty('${p.id}','${line.weight}',-1)">${icon("minus")}</button>
          <span>${line.qty}</span>
          <button class="qty-btn" onclick="updateCartQty('${p.id}','${line.weight}',1)">${icon("plus")}</button>
        </div>
      </div>
      <div class="cart-line-price">
        <div class="price">₹${cartLinePrice(line)}</div>
        <div class="cart-line-remove" onclick="removeFromCart('${p.id}','${line.weight}')" style="cursor:pointer">Remove</div>
      </div>
    </div>`;
  }).join("");
  const sub = document.getElementById("cartDrawerSubtotal");
  if(sub) sub.textContent = "₹" + cartSubtotal();
}

function categoryIcon(category){
  return { Pickles:"jar", Snacks:"knot", Sweets:"laddu", Podis:"bowlSwirl", "Dry Foods":"grain", Hampers:"gift" }[category] || "jar";
}

function openCartDrawer(){
  const drawer = document.getElementById("cartDrawer");
  console.log("Ruchulu: openCartDrawer() called, drawer element found:", !!drawer);
  drawer?.classList.add("open");
  document.getElementById("scrim")?.classList.add("open");
  renderCartDrawer();
}
function closeCartDrawer(){
  document.getElementById("cartDrawer")?.classList.remove("open");
  document.getElementById("scrim")?.classList.remove("open");
}

/* ---------- CART PAGE ---------- */
function renderCartPage(){
  const body = document.getElementById("cartPageBody");
  if(!body) return;
  const cart = getValidCartLines();
  const emptyEl = document.getElementById("cartEmptyState");
  const layoutEl = document.getElementById("cartLayout");
  if(cart.length === 0){
    if(emptyEl) emptyEl.style.display = "block";
    if(layoutEl) layoutEl.style.display = "none";
    return;
  }
  if(emptyEl) emptyEl.style.display = "none";
  if(layoutEl) layoutEl.style.display = "grid";
  body.innerHTML = cart.map(line=>{
    const p = getProduct(line.id);
    return `<div class="cart-row">
      <div class="cart-row-product">
        <div class="cart-row-media"><img src="${p.img}" alt="${p.name}" loading="lazy"></div>
        <div>
          <div class="cart-row-name">${p.name}</div>
          <div class="cart-row-meta">${line.weight} · ${p.category}</div>
        </div>
      </div>
      <div class="qty-selector">
        <button onclick="updateCartQty('${p.id}','${line.weight}',-1)">${icon("minus")}</button>
        <span>${line.qty}</span>
        <button onclick="updateCartQty('${p.id}','${line.weight}',1)">${icon("plus")}</button>
      </div>
      <div class="p-price">₹${cartLinePrice(line)}</div>
      <div class="cart-row-remove" style="cursor:pointer" onclick="removeFromCart('${p.id}','${line.weight}')">${icon("close")}</div>
    </div>`;
  }).join("");

  const subtotal = cartSubtotal();
  const shipping = subtotal >= 999 || subtotal === 0 ? 0 : 60;
  const total = subtotal + shipping;
  const sEl = document.getElementById("summarySubtotal");
  const shEl = document.getElementById("summaryShipping");
  const tEl = document.getElementById("summaryTotal");
  if(sEl) sEl.textContent = "₹" + subtotal;
  if(shEl) shEl.textContent = shipping === 0 ? "Free" : "₹" + shipping;
  if(tEl) tEl.textContent = "₹" + total;
}

/* ---------- PRODUCT CARD RENDERING (used on shop + home) ---------- */
function productCardHTML(p){
  const wished = isWishlisted(p.id) ? "active" : "";
  const priceHTML = p.oldPrice
    ? `₹${p.price} <del>₹${p.oldPrice}</del>`
    : `₹${p.price}`;
  return `<div class="p-card" data-category="${p.category}" data-type="${p.type}" data-price="${p.price}">
    <a href="product.html?id=${p.id}" style="display:contents">
    ${p.tag ? `<div class="p-tag ${p.tag==='Best Seller'||p.tag==='New'||p.tag==='Premium'||p.tag==='Handmade'||p.tag==='Festive' ? '' : 'spice'}">${p.tag}</div>` : ""}
    <div class="p-media">
      <img src="${p.img}" alt="${p.name}" loading="lazy">
    </div>
    </a>
    <button class="p-wish ${wished}" data-id="${p.id}" onclick="event.preventDefault(); handleWishClick('${p.id}', this)" aria-label="Add to wishlist">${icon("heart")}</button>
    <div class="p-body">
      <div class="p-cat">${p.category} ${p.type==='Non-Veg' ? '· Non-Veg' : ''}</div>
      <div class="p-name"><a href="product.html?id=${p.id}">${p.name}</a></div>
      <div class="p-meta">${p.weights[0].w}${p.spice ? " · Spice: " + p.spice : ""}</div>
      <div class="p-foot">
        <div class="p-price">${priceHTML}</div>
        <button class="p-add" aria-label="Add to cart" onclick="handleQuickAdd('${p.id}', this)">${icon("plus")}</button>
      </div>
    </div>
  </div>`;
}
function handleWishClick(id, btn){
  const active = toggleWishlist(id);
  btn.classList.toggle("active", active);
  showToast(active ? "Added to wishlist" : "Removed from wishlist");
}
function handleQuickAdd(id, btn){
  const p = getProduct(id);
  if(!p){ showToast("This item just updated — please refresh and try again"); return; }
  addToCart(id, null, 1);
  showToast(`${p.name} added to cart`);
  btn.classList.add("added");
  btn.innerHTML = icon("check");
  setTimeout(()=>{ btn.classList.remove("added"); btn.innerHTML = icon("plus"); }, 1200);
}

/* ---------- GLOBAL INIT (runs on every page) ---------- */
document.addEventListener("DOMContentLoaded", () => {
  // --- Wire up all UI interactivity FIRST, before any data rendering.
  // This guarantees buttons work even if a rendering step below throws
  // for some unrelated reason (bad cached script, corrupted storage,
  // etc.) — a rendering bug should never be able to silently disable
  // the cart button by aborting the rest of this function.
  const menuToggle = document.getElementById("menuToggle");
  const mobileNav = document.getElementById("mobileNav");
  const scrim = document.getElementById("scrim");
  const navClose = document.getElementById("mobileNavClose");
  if (!menuToggle) console.warn("Ruchulu: #menuToggle not found on this page — hamburger button won't work");
  if (!mobileNav) console.warn("Ruchulu: #mobileNav not found on this page — mobile menu won't work");
  function openMobileNav(){ mobileNav?.classList.add("open"); scrim?.classList.add("open"); }
  function closeMobileNav(){ mobileNav?.classList.remove("open"); scrim?.classList.remove("open"); }
  menuToggle?.addEventListener("click", openMobileNav);
  navClose?.addEventListener("click", closeMobileNav);
  scrim?.addEventListener("click", ()=>{ closeMobileNav(); closeCartDrawer(); });

  const cartTriggers = document.querySelectorAll("[data-open-cart]");
  if (cartTriggers.length === 0) console.warn("Ruchulu: no [data-open-cart] element found on this page — cart button won't work");
  cartTriggers.forEach(btn => btn.addEventListener("click", (e)=>{ e.preventDefault(); openCartDrawer(); }));
  document.getElementById("cartDrawerClose")?.addEventListener("click", closeCartDrawer);
  console.log(`Ruchulu: wired up ${cartTriggers.length} cart trigger(s), menuToggle found: ${!!menuToggle}, mobileNav found: ${!!mobileNav}`);

  const navSearchForm = document.getElementById("navSearchForm");
  navSearchForm?.addEventListener("submit", (e)=>{
    e.preventDefault();
    const q = document.getElementById("navSearchInput").value.trim();
    window.location.href = "shop.html" + (q ? "?q=" + encodeURIComponent(q) : "");
  });

  document.querySelectorAll(".newsletter-form").forEach(form=>{
    form.addEventListener("submit", (e)=>{
      e.preventDefault();
      const btn = form.querySelector("button");
      btn.textContent = "Subscribed ✓";
      btn.disabled = true;
    });
  });

  const contactForm = document.getElementById("contactForm");
  contactForm?.addEventListener("submit", (e)=>{
    e.preventDefault();
    document.getElementById("contactFormStatus").textContent = "Thanks — we'll get back to you within a day.";
    contactForm.reset();
  });

  // --- Now render data-dependent content. Wrapped defensively so that
  // if anything here throws, it's logged instead of taking the whole
  // page's interactivity down with it.
  try {
    document.querySelectorAll("[data-icon]").forEach(el => {
      el.innerHTML = icon(el.getAttribute("data-icon")) + (el.dataset.label ? ` ${el.dataset.label}` : "");
    });
    renderAuthNav();
    refreshBadges();
  } catch (err) {
    console.error("Ruchulu: non-fatal error while rendering cart/wishlist state:", err);
  }
});
