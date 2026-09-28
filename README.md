# Task 1 – Product Detail Page (Shopify / Liquid)

Responsive PDP built from the Figma design using Shopify Liquid, theme sections/snippets and vanilla JavaScript.

## Links

- **PDP (test URL):** https://sps-store-g6njf2e1.myshopify.com/products/saunf-rusk
- **Store password:** `test`
- **Figma:** https://www.figma.com/design/UKz0XXkgzECXcjYd2j3K8E/Sunrise_Desktop_UI?node-id=89-6027

## Requirements Coverage

| Requirement | Status | How |
|-------------|--------|-----|
| Responsive desktop/mobile | Done | Mobile-first CSS, breakpoints per Figma desktop layout |
| Product images/gallery | Done | Liquid loops `product.media`; thumbnails + main image switch |
| Title, price, availability | Done | `product.title`, `money` filter, `variant.available` |
| Variant/option selection | Done | Options rendered from `product.options_with_values`, resolved to a variant |
| Quantity selection | Done | +/- and numeric input with min 1 validation |
| Add to Cart | Done | AJAX `POST /cart/add.js` with selected variant ID + quantity |
| Loading/disabled states | Done | Button disabled while pending / sold out / no valid variant |
| Cart state/count update | Done | Cart count refreshed from the `/cart/add.js` / `/cart.js` response |
| Real Shopify data | Done | All data comes from Liquid objects, no hardcoded product values |

## How It Works

### Rendering (Liquid)
- The product section renders title, price, compare-at price, description, gallery and option pickers directly from Liquid objects (`product`, `product.selected_or_first_available_variant`, `product.variants`).
- The full variants array is output as JSON (`{{ product.variants | json }}`) so JS can resolve the variant without extra network calls.
- Sold-out variants are marked disabled in the option selector; availability text is rendered server-side for the initial variant.

### Variant selection
1. User picks an option value (size, flavour, etc.).
2. JS reads all selected options and finds the matching variant in the JSON.
3. UI updates: price, compare-at price, availability, selected image (via `featured_media`), hidden `id` input.
4. URL is updated with `?variant=ID` using `history.replaceState` so it is shareable.
5. If no matching variant exists or it is unavailable, the Add to Cart button is disabled and the label changes to *Sold out* / *Unavailable*.

### Add to Cart
- `fetch('/cart/add.js', { method: 'POST', body: { id, quantity } })`
- While in flight: button disabled + loading label/spinner, prevents double submit.
- On success: cart count in the header is updated and a short success state is shown.
- On error (e.g. not enough stock): the error message from Shopify is displayed inline; the button is re-enabled.

### Quantity
- Minimum of 1, integer only, +/- buttons and typed input are both sanitised.

### Backend integration
- The PDP calls the Task 2 backend (`/api/products/:handle`) for product/metafield data and renders it in the relevant block.
- Because the free Render instance can sleep (~50 s cold start), the call uses a timeout and the section shows a skeleton/fallback. The rest of the PDP never depends on it, so the page is fully usable if the backend is slow.

## Loading / Disabled States

- Add to Cart: `Add to cart` → `Adding…` (disabled) → success → back to default
- Sold-out variant: disabled button labelled *Sold out*
- Invalid option combination: disabled button labelled *Unavailable*
- Backend metafield block: skeleton while loading; hidden/fallback text on failure

## Responsive Behaviour

- **Desktop:** two-column layout (gallery left, product info right) as in Figma.
- **Mobile:** stacked layout; gallery becomes a swipeable/scrollable strip; sticky-friendly full-width Add to Cart.
- Fluid typography and spacing, no fixed pixel widths that break under 375px.

## Assumptions

- Test product: `saunf-rusk`; the template works for products with or without multiple variants.
- Only the PDP is in scope; no cart page or checkout customisation.
- Theme: built on top of the store's theme with a dedicated product section/snippet(s).

## Local Development / Deployment

```bash
# install Shopify CLI
npm install -g @shopify/cli @shopify/theme

# run the theme locally against the store
shopify theme dev --store sps-store-g6njf2e1.myshopify.com

# lint the theme
shopify theme check
```

## Performance Improvements (Shopify, in detail)

### 1. Images (usually the biggest win)
1. Use `image_url` with explicit widths and `image_tag` (or a manual `<img>`) with `srcset` and `sizes` so each device downloads the right size.
   ```liquid
   {{ image | image_url: width: 800 | image_tag:
      widths: '360, 540, 720, 900, 1200',
      sizes: '(min-width: 990px) 50vw, 100vw',
      loading: 'eager', fetchpriority: 'high' }}
   ```
2. **Main (LCP) image:** `loading="eager"` and `fetchpriority="high"`, never lazy-loaded.
3. **Thumbnails and below-the-fold images:** `loading="lazy"` and `decoding="async"`.
4. Always set `width` and `height` (or `aspect-ratio`) to avoid layout shift (CLS).
5. Let Shopify's CDN serve modern formats (WebP/AVIF) automatically; upload source images at a sensible size (not 6000px originals).
6. Limit the number of gallery images loaded up front; load the rest on interaction.

### 2. JavaScript
1. Vanilla JS only, no jQuery or heavy libraries.
2. Load scripts with `defer`; keep the PDP script small and scoped to the section.
3. Do not block rendering with inline heavy scripts.
4. Use event delegation instead of many listeners.
5. Avoid layout thrashing: batch DOM reads/writes.
6. Audit installed apps and remove unused ones; app scripts often dominate load time.
7. Only load a script when its block exists (e.g. conditional `{% if %}` in Liquid).

### 3. CSS and fonts
1. Inline only critical CSS for above-the-fold content; load the rest normally.
2. Scope section CSS with `{% stylesheet %}` so it is only shipped when the section is used.
3. Use `font-display: swap` and limit font families/weights; preload the primary font file.
4. Use system font fallbacks with similar metrics to reduce layout shift.
5. Remove unused CSS (Tailwind purge / manual cleanup).

### 4. Liquid efficiency
1. Use `{% render %}` instead of `{% include %}` (isolated scope, faster).
2. Avoid nested `for` loops over products/variants; precompute with `assign`.
3. Avoid `all_products['handle']` lookups in loops (limited and slow); use collections or metafield product references.
4. Use `limit`/`offset` on loops; never loop the full catalogue.
5. Output variant data once as JSON and reuse it in JS instead of re-rendering per option.

### 5. Network, cart and rendering
1. Use the AJAX Cart API (`/cart/add.js`, `/cart.js`) or the Section Rendering API to update only the cart count/drawer, no full page reload.
2. Preconnect to `cdn.shopify.com` and the backend origin; `dns-prefetch` for third parties.
3. Prefetch/prerender likely next pages (cart/collection) sparingly.
4. Rely on Shopify's CDN and edge caching; do not add cache-busting params to static assets unless the file changes.
5. Debounce/disable repeated clicks on Add to Cart to prevent duplicate requests.

### 6. Backend call from the PDP
1. Fire the backend request after first paint (non-blocking); never block LCP on it.
2. Set a client timeout (e.g. 8–10 s) and show a fallback; the free Render instance can take ~50 s to wake.
3. Cache the response in memory/`sessionStorage` per handle for the visit.
4. Keep the payload small (only fields the UI uses).

### 7. Measure and guard
1. Test with Lighthouse (mobile), PageSpeed Insights and Shopify's Web Performance dashboard (LCP, CLS, INP).
2. Run `shopify theme check` for Liquid performance and best-practice warnings.
3. Compare before/after per change; set budgets (e.g. LCP < 2.5 s, CLS < 0.1, INP < 200 ms).
4. Test on throttled 4G + mid-range mobile device settings.

## Accessibility Notes

- Semantic buttons and labels for options and quantity.
- Visible focus states; `aria-live` region for cart/add status messages.
- Alt text from `image.alt` with a product-title fallback.


# Task 2 – Backend: Shopify GraphQL Integration

A small server-side API that retrieves product data (including metafields) from Shopify using GraphQL, with secure credential handling, input validation and error handling.

## Live URL

- **Base URL:** https://shopify-api-backend-3zpf.onrender.com
- **Endpoint:** `GET /api/products/:handle`
- **Example:** https://shopify-api-backend-3zpf.onrender.com/api/products/saunf-rusk

> **Free-tier note:** This service is hosted on Render's free plan. If it has been inactive for some time it goes to sleep, and the next request takes about **50 seconds** to wake it up. Later requests are fast. If the first call times out, just retry.

## Endpoint

### `GET /api/products/:handle`

Returns product details for a Shopify product handle. **Metafields are returned inside the product details object.**

| Param | In | Description |
|-------|----|-------------|
| `handle` | path | Shopify product handle, e.g. `saunf-rusk` |

**Example request**

```bash
curl https://shopify-api-backend-3zpf.onrender.com/api/products/saunf-rusk
```

**Example success response (shape)**

```json
{
  "success": true,
  "data": {
    "id": "gid://shopify/Product/...",
    "handle": "saunf-rusk",
    "title": "...",
    "description": "...",
    "metafields": {
      "namespace.key": "value"
    }
  }
}
```

> Exact fields depend on the GraphQL query in the code; the metafields are nested inside the product object.

**Error responses**

| Status | When | Body |
|--------|------|------|
| `400` | Handle missing/invalid format | `{ "success": false, "error": "Invalid product handle" }` |
| `404` | No product with that handle | `{ "success": false, "error": "Product not found" }` |
| `429` | Shopify throttled / rate limited | `{ "success": false, "error": "Too many requests, retry shortly" }` |
| `502` | Shopify API error/unavailable | `{ "success": false, "error": "Upstream Shopify error" }` |
| `500` | Unexpected server error | `{ "success": false, "error": "Internal server error" }` |

Error bodies never include tokens, raw Shopify errors or stack traces.

## How It Works

1. Request hits `GET /api/products/:handle`.
2. **Validate** `handle` (lowercase letters, numbers and hyphens, max length) and reject anything else with `400`.
3. Build a GraphQL query with `productByHandle(handle: $handle)`; the handle is passed as a **GraphQL variable**, never string-concatenated.
4. Call Shopify with the access token read from environment variables.
5. Inspect both HTTP status **and** the GraphQL `errors` array (GraphQL can return `200` with errors).
6. Map/trim the response to only the fields the frontend needs and return JSON.

### Example GraphQL query

```graphql
query ProductByHandle($handle: String!) {
  productByHandle(handle: $handle) {
    id
    handle
    title
    description
    metafields(identifiers: [
      { namespace: "custom", key: "example_key" }
    ]) {
      namespace
      key
      value
      type
    }
  }
}
```

> Replace the namespace/key with the metafields defined in the store.

## Secure Credential Handling

- Shopify access token and shop domain are read from **environment variables**, never hard-coded and never committed.
- `.env` is git-ignored; `.env.example` documents the names only.
- On Render, secrets are set in the service's **Environment** settings.
- The token is used only server-side; it is never sent to the browser or logged.
- Custom app with **least-privilege scopes** (read-only product/metafield access).
- Responses are sanitised so Shopify internals and secrets can't leak.

```bash
# .env.example
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=change_me
SHOPIFY_API_VERSION=2025-01
ALLOWED_ORIGIN=https://sps-store-g6njf2e1.myshopify.com
PORT=3000
```

## Validation and Error Handling

- **Input validation:** handle must match `^[a-z0-9]+(?:-[a-z0-9]+)*$` and a max length; anything else returns `400`.
- **Upstream handling:** network failures, non-200 responses and GraphQL `errors` are caught and mapped to safe status codes.
- **Not found:** `productByHandle` returning `null` becomes a clean `404`.
- **Timeouts:** outbound Shopify request has a timeout so the API doesn't hang.
- **CORS:** restricted to the store domain.
- **Logging:** log request ID, handle, status and duration; never log tokens.

## Run Locally

```bash
git clone <repo-url>
cd task-2-backend
npm install
cp .env.example .env    # fill in real values
npm start
# http://localhost:3000/api/products/saunf-rusk
```

## Optimising Shopify API Usage

1. **Query only what you need.** Small GraphQL selections keep query cost low; avoid deep nested connections.
2. **Cache by handle.** In-memory (or Redis) cache with a short TTL (e.g. 60–300 s) and `Cache-Control` headers so browsers/CDNs can reuse responses. Use stale-while-revalidate for smooth UX.
3. **Invalidate with webhooks.** Subscribe to `products/update`, `products/delete` and inventory webhooks to purge the cached handle immediately, instead of polling or waiting on TTL.
4. **Respect rate limits.** Read `extensions.cost.throttleStatus`; on `THROTTLED` retry with exponential backoff + jitter.
5. **Batch where possible.** Fetch multiple products in one query (`nodes(ids: [...])` / search query) rather than many calls; use Bulk Operations for large exports.
6. **Coalesce duplicate requests.** If many users request the same handle at once, share one in-flight Shopify call.
7. **Keep the API pinned to a stable version** and review deprecations each quarter.
8. **Avoid the API when Liquid suffices.** Data already on the PDP (title, price, variants) comes from Liquid; the backend only supplies what Liquid can't.
9. **Reduce cold starts (free hosting).** Use a paid instance, or a lightweight scheduled health-check ping, so the first user doesn't wait ~50 s.
10. **Compress** responses (gzip/brotli) and keep payloads small.

## Debugging Stale Product Data

1. Compare Shopify Admin vs Liquid storefront vs this API response for the same handle to find which layer is stale.
2. Check response headers (`Cache-Control`, `Age`, `X-Cache`) and try a cache-bust param.
3. Purge/bypass the backend cache for the handle and re-request.
4. Verify webhook deliveries in Shopify Admin (status codes, HMAC failures, retries).
5. Confirm the API version, metafield namespace/key and the metafield's Storefront access setting.
6. Check that the product is active and published to the sales channel used by the token.
7. Add `X-Cache: HIT|MISS` and `fetchedAt` to responses so staleness is visible.

## Assumptions

- Read-only integration; no writes to Shopify.
- Metafields are returned within the product details response.
- Single store/environment; free-tier hosting is acceptable for the assessment.

## Performance Improvements (Backend)

1. **Query only the fields needed.** Use a small GraphQL selection and fetch specific metafields with `metafields(identifiers: [...])`, not all of them.
2. **Cache by product handle.** Keep responses in memory (or Redis at scale) with a short TTL (60–300 s) and send `Cache-Control` headers so browsers and CDNs can reuse them.
3. **Invalidate with webhooks.** Subscribe to `products/update` and `products/delete`, and purge only that handle's cache entry. This avoids polling Shopify.
4. **Handle rate limits.** Read `extensions.cost.throttleStatus`, and on `THROTTLED` retry with exponential backoff. Set a request timeout so calls never hang.
5. **Compress and slim responses.** Enable gzip/brotli and return only the fields the frontend uses.
6. **Avoid cold starts.** The free Render instance sleeps after inactivity (~50 s wake-up). Fix this by upgrading the instance or pinging a health endpoint on a schedule.