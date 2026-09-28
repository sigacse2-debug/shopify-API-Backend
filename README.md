# Shopify Product API

This repository contains the Shopify storefront theme and a small Express service for looking up product details through the Shopify Admin GraphQL API. The API service is separate from the storefront; the product page does not call it directly.

## Requirements

- Node.js 18 or later
- A Shopify store
- A Shopify custom app with the `read_products` access scope

## Start the server

Install the dependencies:

```powershell
npm install
```

The repository includes a local `.env` file with the required keys and an empty token value. Open it and add your store domain and Admin API access token. If `.env` is missing, create it from the example:

```powershell
Copy-Item .env.example .env
```

Set the values in `.env`:

```text
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=
SHOPIFY_API_VERSION=2026-07
PORT=3000
```

Use your `myshopify.com` domain without `https://`. Keep the token after the equals sign on the `SHOPIFY_ACCESS_TOKEN` line. Do not commit `.env`; it is ignored by Git.

Start the server:

```powershell
npm start
```

For automatic restarts while editing:

```powershell
npm run dev
```

The server listens on `http://localhost:3000` unless `PORT` is changed.

## Endpoints

Check that the server is running:

```text
GET http://localhost:3000/health
```

Expected response:

```json
{
  "success": true,
  "message": "Server is running"
}
```

Look up a product by its Shopify handle:

```text
GET http://localhost:3000/api/products/classic-t-shirt
```

The response includes the product ID, title, handle, description, vendor, product type, and the `custom.material` metafield. If that metafield has not been set on the product, its value is `null`; the product can still be returned.

Invalid handles return HTTP 400. A valid handle for a product that does not exist returns HTTP 404. If credentials are not configured, the server remains available for `/health`, while product lookups return a configuration error.

## Files

- `server/index.js` starts Express, loads `.env`, and mounts the API routes.
- `server/routes/products.js` validates product handles and formats API responses.
- `server/shopify.js` makes authenticated Admin GraphQL requests.
- `.env.example` documents the required environment variables without containing a token.
- `package.json` contains the server dependencies and commands.

## Credentials

The Shopify token is read by the server and sent only in the Admin API request header. It is never returned by the API or placed in storefront JavaScript. Use an app token with only the scopes the integration needs, and keep it out of screenshots, logs, commits, and browser code.
